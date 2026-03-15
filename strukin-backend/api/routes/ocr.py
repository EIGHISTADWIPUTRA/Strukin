"""
OCR router — POST /api/v1/ocr/process

Accepts a receipt image, runs it through Qwen-VL for data extraction,
matches the suggested category, saves a transaction, and returns the result.
"""

import logging
import uuid
from datetime import datetime
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from api.deps import get_current_user
from models.schemas import AIExtractedData, CategoryOut, OCRResponse
from services import ai_service, db_service

UPLOAD_DIR = Path("uploads/receipts")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ocr", tags=["OCR"])

# Accepted MIME types
_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
# Max file size: 10 MB
_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


@router.post("/process", response_model=OCRResponse, status_code=status.HTTP_201_CREATED)
async def process_receipt(
    file: UploadFile = File(..., description="Receipt image (JPEG, PNG, WebP, HEIC)"),
    user_id: str = Depends(get_current_user),
):
    """
    Process a receipt image with Qwen-VL:
    1. Validate file type and size
    2. Fetch user's categories for AI context
    3. Resize image and call the AI model
    4. Match suggested category from the AI output
    5. Save transaction to Supabase
    6. Return structured OCRResponse
    """

    # ── 1. Validate file ────────────────────────────────────────────────────
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{content_type}'. Accepted: JPEG, PNG, WebP, HEIC.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 10 MB limit.",
        )

    # ── 2. Save receipt image to disk ───────────────────────────────────────
    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic", "image/heif": ".heif"}
    ext = ext_map.get(content_type, ".jpg")
    filename = f"{user_id}_{uuid.uuid4().hex[:12]}{ext}"
    receipt_path = UPLOAD_DIR / filename
    receipt_path.write_bytes(file_bytes)
    image_url = f"/api/v1/ocr/receipts/{filename}"

    # ── 3. Fetch categories for AI context ─────────────────────────────────
    try:
        categories = await db_service.get_categories(user_id)
        category_names = [c["name"] for c in categories]
    except Exception as exc:
        logger.warning("Could not fetch categories for user %s, proceeding without: %s", user_id, exc)
        categories = []
        category_names = []

    # ── 4. Run AI OCR pipeline ──────────────────────────────────────────────
    try:
        ai_data = await ai_service.process_receipt(file_bytes, category_names)
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The AI service timed out. Please try again.",
        )
    except httpx.HTTPStatusError as exc:
        logger.error("DashScope API error: %s — %s", exc.response.status_code, exc.response.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI service returned an error. Please try again later.",
        )
    finally:
        # Ensure file_bytes is freed even if an error occurs
        del file_bytes

    # ── 5. Parse extracted fields ────────────────────────────────────────────
    merchant = (ai_data.get("merchant") or "").strip() or None
    amount = ai_data.get("total_amount")

    tx_date_raw = ai_data.get("date")
    tx_date = None
    if tx_date_raw:
        if hasattr(tx_date_raw, "isoformat"):
            tx_date = tx_date_raw
        elif isinstance(tx_date_raw, str):
            raw = tx_date_raw.strip()
            for fmt in (
                "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y",
                "%m/%d/%Y", "%Y/%m/%d", "%d %B %Y",
                "%d %b %Y", "%B %d, %Y", "%b %d, %Y",
            ):
                try:
                    tx_date = datetime.strptime(raw, fmt).date()
                    break
                except ValueError:
                    continue

    missing: list[str] = []
    if not merchant:
        missing.append("merchant_name")
    if amount is None or amount <= 0:
        missing.append("amount")
    if tx_date is None:
        missing.append("transaction_date")

    if missing:
        logger.info("Incomplete OCR for user %s — missing: %s", user_id, missing)

    # ── 6. Match category (fallback to 'Lainnya') ─────────────────────────
    matched_category: dict | None = None
    if ai_data.get("suggested_category"):
        matched_category = await db_service.find_category_by_name(
            user_id, ai_data["suggested_category"]
        )
    if not matched_category:
        matched_category = await db_service.find_category_by_name(user_id, "Lainnya")

    # ── 7. Save transaction (even if incomplete) ────────────────────────────
    try:
        tx_type = ai_data.get("transaction_type", "expense")
        if tx_type not in ("income", "expense"):
            tx_type = "expense"

        transaction_payload: dict = {"raw_ai_output": ai_data, "image_path": image_url, "type": tx_type}
        if merchant:
            transaction_payload["merchant_name"] = merchant
        if amount is not None and amount > 0:
            transaction_payload["amount"] = amount
        if tx_date:
            transaction_payload["transaction_date"] = tx_date.isoformat()
        if matched_category:
            transaction_payload["category_id"] = matched_category["id"]

        saved = await db_service.save_transaction(user_id, transaction_payload)
    except Exception as exc:
        logger.error("Failed to save transaction for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Receipt was processed but could not be saved. Please try again.",
        )

    needs_review = len(missing) > 0
    msg = (
        "Data struk tidak lengkap, silakan lengkapi manual."
        if needs_review
        else "Receipt processed successfully"
    )

    # ── 8. Return response ──────────────────────────────────────────────────
    return OCRResponse(
        transaction_id=saved["id"],
        extracted=AIExtractedData(**ai_data),
        category_matched=CategoryOut.model_validate(matched_category) if matched_category else None,
        missing_fields=missing,
        needs_review=needs_review,
        message=msg,
    )


@router.get("/receipts/{filename}", tags=["OCR"])
async def get_receipt_image(
    filename: str,
    user_id: str = Depends(get_current_user),
):
    """Serve a previously uploaded receipt image (auth required)."""
    if not filename.startswith(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    filepath = UPLOAD_DIR / filename
    if not filepath.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt image not found.")
    return FileResponse(filepath)
