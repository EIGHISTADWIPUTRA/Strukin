"""
Transactions router — CRUD /api/v1/transactions
"""

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from api.deps import get_current_user
from models.schemas import PaginatedTransactions, TransactionOut, TransactionUpdate
from services import db_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/transactions", tags=["Transactions"])

UPLOAD_DIR = Path("uploads/receipts")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
_MAX_FILE_SIZE = 10 * 1024 * 1024


@router.get("", response_model=PaginatedTransactions)
async def list_transactions(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(default=10, ge=1, le=100, description="Items per page"),
    user_id: str = Depends(get_current_user),
):
    """
    Return paginated transaction history for the authenticated user,
    ordered by transaction_date descending (newest first).
    """
    try:
        rows, total = await db_service.get_transactions(user_id, page=page, size=size)
        return PaginatedTransactions(
            page=page,
            size=size,
            total=total,
            items=[TransactionOut.model_validate(r) for r in rows],
        )
    except Exception as exc:
        logger.error("Failed to fetch transactions for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve transactions from the database.",
        )


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    merchant_name: str = Form(..., description="Nama merchant/toko"),
    amount: float = Form(..., gt=0, description="Nominal transaksi"),
    transaction_date: str = Form(..., description="Tanggal (YYYY-MM-DD)"),
    type: str = Form("expense", description="income atau expense"),
    category_id: str | None = Form(None, description="UUID kategori"),
    file: UploadFile | None = File(None, description="Foto struk (opsional)"),
    user_id: str = Depends(get_current_user),
):
    """Create a transaction manually, with an optional receipt image."""
    if type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="type harus 'income' atau 'expense'.")
    image_path = None
    if file and file.filename:
        content_type = file.content_type or ""
        if content_type not in _ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Tipe file '{content_type}' tidak didukung. Gunakan JPEG, PNG, atau WebP.",
            )
        # Baca dulu lalu cek panjang -- jangan andalkan file.size karena bisa None
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            file_bytes = None  # type: ignore[assignment]
        if file_bytes and len(file_bytes) > _MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Ukuran file melebihi batas 10 MB.",
            )
        if file_bytes:
            ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic", "image/heif": ".heif"}
            ext = ext_map.get(content_type, ".jpg")
            filename = f"{user_id}_{uuid.uuid4().hex[:12]}{ext}"
            (UPLOAD_DIR / filename).write_bytes(file_bytes)
            image_path = f"/api/v1/ocr/receipts/{filename}"

    payload: dict = {
        "merchant_name": merchant_name.strip(),
        "amount": amount,
        "transaction_date": transaction_date,
        "type": type,
    }
    if category_id:
        payload["category_id"] = category_id
    if image_path:
        payload["image_path"] = image_path

    try:
        saved = await db_service.save_transaction(user_id, payload)
    except Exception as exc:
        logger.error("Failed to create manual transaction for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gagal menyimpan transaksi.",
        )
    return TransactionOut.model_validate(saved)


@router.put("/{transaction_id}", response_model=TransactionOut)
async def update_transaction(
    transaction_id: str,
    body: TransactionUpdate,
    user_id: str = Depends(get_current_user),
):
    """Update a transaction owned by the authenticated user."""
    updates = body.model_dump(mode="json", exclude_none=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )
    if "transaction_date" in updates:
        updates["transaction_date"] = updates["transaction_date"].isoformat()
    if "category_id" in updates:
        updates["category_id"] = str(updates["category_id"])
    try:
        row = await db_service.update_transaction(user_id, transaction_id, updates)
    except Exception as exc:
        logger.error("Failed to update transaction %s: %s", transaction_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to update transaction.",
        )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found or not owned by you.",
        )
    return TransactionOut.model_validate(row)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: str,
    user_id: str = Depends(get_current_user),
):
    """Delete a transaction owned by the authenticated user."""
    try:
        deleted = await db_service.delete_transaction(user_id, transaction_id)
    except Exception as exc:
        logger.error("Failed to delete transaction %s: %s", transaction_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to delete transaction.",
        )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found or not owned by you.",
        )
