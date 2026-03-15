"""
Transactions router — GET /api/v1/transactions
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.deps import get_current_user
from models.schemas import PaginatedTransactions, TransactionOut
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
