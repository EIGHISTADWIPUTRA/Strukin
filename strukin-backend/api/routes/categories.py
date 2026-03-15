"""
Categories router — CRUD /api/v1/categories
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


@router.put("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: str,
    body: CategoryCreate,
    user_id: str = Depends(get_current_user),
):
    """Update a custom category owned by the authenticated user."""
    updates = body.model_dump(mode="json", exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")
    try:
        row = await db_service.update_category(user_id, category_id, updates)
    except Exception as exc:
        logger.error("Failed to update category %s: %s", category_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to update category.",
        )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or is a global category (cannot be edited).",
        )
    return row


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    user_id: str = Depends(get_current_user),
):
    """Delete a custom category owned by the authenticated user."""
    try:
        deleted = await db_service.delete_category(user_id, category_id)
    except Exception as exc:
        logger.error("Failed to delete category %s: %s", category_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to delete category.",
        )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or is a global category (cannot be deleted).",
        )
