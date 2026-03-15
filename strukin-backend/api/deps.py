"""
FastAPI dependencies — shared across route handlers.

`get_current_user` reads request.state.user_id that was injected by
JWTMiddleware in core/security.py. Using it as a Depends() ensures every
protected route automatically fails with 401 if the middleware was bypassed
(should not happen in normal operation, but is a good safety net).
"""

from fastapi import HTTPException, Request, status


async def get_current_user(request: Request) -> str:
    """
    Return the authenticated user's UUID string.
    The value is injected into request.state by JWTMiddleware.
    Raises 401 if not found (defensive guard).
    """
    user_id: str | None = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not determine authenticated user.",
        )
    return user_id
