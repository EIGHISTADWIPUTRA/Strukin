"""
Transactions router — GET, PUT, DELETE /api/v1/transactions
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.deps import get_current_user
from models.schemas import PaginatedTransactions, TransactionOut, TransactionUpdate
from services import db_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/transactions", tags=["Transactions"])


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


@router.put("/{transaction_id}", response_model=TransactionOut)
async def update_transaction(
    transaction_id: str,
    body: TransactionUpdate,
    user_id: str = Depends(get_current_user),
):
    """Update a transaction owned by the authenticated user."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )
    if "transaction_date" in updates:
        updates["transaction_date"] = updates["transaction_date"].isoformat()
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
