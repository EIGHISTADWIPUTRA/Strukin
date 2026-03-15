"""
OCR router — POST /api/v1/ocr/process

Accepts a receipt image, runs it through Qwen-VL for data extraction,
matches the suggested category, saves a transaction, and returns the result.
"""

import logging
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from api.deps import get_current_user
from models.schemas import AIExtractedData, CategoryOut, OCRResponse
from services import ai_service, db_service

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

    # ── 2. Fetch categories for AI context ──────────────────────────────────
    try:
        categories = await db_service.get_categories(user_id)
        category_names = [c["name"] for c in categories]
    except Exception as exc:
        logger.warning("Could not fetch categories for user %s, proceeding without: %s", user_id, exc)
        categories = []
        category_names = []

    # ── 3. Run AI OCR pipeline ──────────────────────────────────────────────
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

    # ── 4. Match category ───────────────────────────────────────────────────
    matched_category: dict | None = None
    if ai_data.get("suggested_category"):
        matched_category = await db_service.find_category_by_name(
            user_id, ai_data["suggested_category"]
        )

    # ── 5. Save transaction ─────────────────────────────────────────────────
    try:
        # Parse date: AI may return "YYYY-MM-DD" or other string; normalize for DB
        tx_date_raw = ai_data.get("date")
        tx_date = None
        if tx_date_raw:
            if isinstance(tx_date_raw, str):
                try:
                    tx_date = datetime.strptime(tx_date_raw.strip()[:10], "%Y-%m-%d").date()
                except ValueError:
                    pass
            elif hasattr(tx_date_raw, "isoformat"):
                tx_date = tx_date_raw

        transaction_payload = {
            "merchant_name": ai_data.get("merchant"),
            "amount": ai_data.get("total_amount"),
            "transaction_date": tx_date.isoformat() if tx_date else None,
            "category_id": matched_category["id"] if matched_category else None,
            "image_path": None,
            "raw_ai_output": ai_data,
        }
        # Remove None values to avoid overwriting DB defaults
        transaction_payload = {k: v for k, v in transaction_payload.items() if v is not None}

        saved = await db_service.save_transaction(user_id, transaction_payload)
    except Exception as exc:
        logger.error("Failed to save transaction for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Receipt was processed but could not be saved. Please try again.",
        )

    # ── 6. Return response ──────────────────────────────────────────────────
    return OCRResponse(
        transaction_id=saved["id"],
        extracted=AIExtractedData(**ai_data),
        category_matched=CategoryOut.model_validate(matched_category) if matched_category else None,
    )
