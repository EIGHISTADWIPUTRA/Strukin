"""
Pydantic v2 schemas for request validation and response serialisation.
All models use `model_config = ConfigDict(from_attributes=True)` to allow
ORM-style construction from dicts returned by Supabase.
"""

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ─── Category ─────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    """Input for creating a custom user category."""
    name: str = Field(..., min_length=1, max_length=100)
    icon: str | None = Field(None, max_length=50, description="Emoji or icon identifier")
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$", description="Hex colour e.g. #A3E635")


class CategoryOut(BaseModel):
    """Response for a single category (global or user-specific)."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID | None = None     # None = global/shared category
    name: str
    icon: str | None = None
    color: str | None = None


# ─── Transaction ───────────────────────────────────────────────────────────

class TransactionOut(BaseModel):
    """Response for a single saved transaction."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    category_id: UUID | None = None
    merchant_name: str | None = None
    amount: float | None = None
    transaction_date: date | None = None
    image_path: str | None = None
    raw_ai_output: dict[str, Any] | None = None
    created_at: datetime | None = None


class PaginatedTransactions(BaseModel):
    """Paginated list of transactions."""
    page: int
    size: int
    total: int
    items: list[TransactionOut]


# ─── OCR ──────────────────────────────────────────────────────────────────

class AIExtractedData(BaseModel):
    """Structured output from the Qwen-VL model."""
    merchant: str | None = None
    total_amount: float | None = None
    date: str | None = None                      # Kept as string — AI may return various formats
    items: list[dict[str, Any]] = Field(default_factory=list)
    suggested_category: str | None = None


class OCRResponse(BaseModel):
    """Full response from the OCR endpoint."""
    transaction_id: UUID
    extracted: AIExtractedData
    category_matched: CategoryOut | None = None  # The category that was matched & saved
    message: str = "Receipt processed successfully"
