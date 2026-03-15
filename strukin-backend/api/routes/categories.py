"""
Categories router — GET & POST /api/v1/categories
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from api.deps import get_current_user
from models.schemas import CategoryCreate, CategoryOut
from services import db_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryOut])
async def list_categories(user_id: str = Depends(get_current_user)):
    """
    Return all categories visible to the user:
    - Global categories (user_id IS NULL)
    - User's own custom categories
    """
    try:
        rows = await db_service.get_categories(user_id)
        return rows
    except Exception as exc:
        logger.error("Failed to fetch categories for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve categories from the database.",
        )


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    user_id: str = Depends(get_current_user),
):
    """Create a new custom category for the authenticated user."""
    try:
        row = await db_service.create_category(user_id, body.model_dump(exclude_none=True))
        return row
    except Exception as exc:
        logger.error("Failed to create category for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create category.",
        )
