"""
Database service — all async CRUD operations via Supabase Python SDK.

The Supabase client is initialized once using the service_role_key.
We manually filter all queries by user_id to respect data ownership,
complementing any RLS policies configured in the Supabase dashboard.
"""

from typing import Any
from uuid import UUID

from supabase import AsyncClient, acreate_client  # type: ignore

from core.config import settings


async def _get_client() -> AsyncClient:
    """Create and return an async Supabase client."""
    return await acreate_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )


# ─── Categories ────────────────────────────────────────────────────────────

async def get_categories(user_id: str) -> list[dict]:
    """
    Fetch all categories visible to the user:
      - Global categories  : user_id IS NULL
      - User categories    : user_id = <user_id>
    Supabase OR filter syntax: `or=user_id.is.null,user_id.eq.<uuid>`
    """
    client = await _get_client()
    response = (
        await client.table("categories")
        .select("*")
        .or_(f"user_id.is.null,user_id.eq.{user_id}")
        .order("name")
        .execute()
    )
    return response.data or []


async def create_category(user_id: str, data: dict) -> dict:
    """Insert a new custom category for the authenticated user."""
    client = await _get_client()
    payload = {**data, "user_id": user_id}
    response = (
        await client.table("categories")
        .insert(payload)
        .execute()
    )
    return response.data[0]


# ─── Transactions ──────────────────────────────────────────────────────────

async def get_transactions(
    user_id: str,
    page: int = 1,
    size: int = 10,
) -> tuple[list[dict], int]:
    """
    Paginated transaction history for a user.
    Returns (items, total_count).
    """
    client = await _get_client()
    offset = (page - 1) * size

    # Fetch page
    response = (
        await client.table("transactions")
        .select("*", count="exact")
        .eq("user_id", user_id)
        .order("transaction_date", desc=True)
        .range(offset, offset + size - 1)
        .execute()
    )
    total = response.count or 0
    return response.data or [], total


async def save_transaction(user_id: str, data: dict) -> dict:
    """
    Persist a new transaction row.
    `data` should include: merchant_name, amount, transaction_date,
    category_id (optional), image_path (optional), raw_ai_output (optional).
    """
    client = await _get_client()
    payload = {**data, "user_id": user_id}
    response = (
        await client.table("transactions")
        .insert(payload)
        .execute()
    )
    return response.data[0]


async def update_transaction(user_id: str, transaction_id: str, data: dict) -> dict | None:
    """Update a transaction owned by user_id. Returns updated row or None."""
    client = await _get_client()
    response = (
        await client.table("transactions")
        .update(data)
        .eq("id", transaction_id)
        .eq("user_id", user_id)
        .execute()
    )
    return response.data[0] if response.data else None


async def delete_transaction(user_id: str, transaction_id: str) -> bool:
    """Delete a transaction owned by user_id. Returns True if deleted."""
    client = await _get_client()
    response = (
        await client.table("transactions")
        .delete()
        .eq("id", transaction_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(response.data)


# ─── Categories — helper for OCR matching ──────────────────────────────────

async def find_category_by_name(user_id: str, name: str) -> dict | None:
    """
    Case-insensitive search for a category matching `name`.
    Used to map the AI's suggested_category to an actual category row.
    """
    categories = await get_categories(user_id)
    name_lower = name.lower()
    for cat in categories:
        if cat.get("name", "").lower() == name_lower:
            return cat
    return None
