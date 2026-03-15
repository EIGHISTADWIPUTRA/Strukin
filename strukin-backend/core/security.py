"""
JWT verification and middleware for Supabase-issued access tokens.

Flow:
  1. Client authenticates with Supabase (email/password, OAuth, etc.)
  2. Supabase returns a signed JWT (HS256) using the project JWT secret.
  3. Every request to this API must include: Authorization: Bearer <jwt>
  4. JWTMiddleware verifies the token locally (no network call) and injects
     the user_id into request.state for downstream route handlers.
"""

import jwt
from fastapi import HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from core.config import settings

# Supabase JWTs are signed with HS256
_ALGORITHM = "HS256"

# Routes that skip authentication
_PUBLIC_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


def verify_supabase_jwt(token: str) -> dict:
    """
    Decode and verify a Supabase JWT.

    Returns the decoded payload (which contains 'sub' = user UUID).
    Raises HTTPException 401 if the token is invalid or expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[_ALGORITHM],
            options={"verify_aud": False},  # Supabase tokens may have a custom audience
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


class JWTMiddleware(BaseHTTPMiddleware):
    """
    Starlette middleware that enforces authentication on every route
    except those listed in _PUBLIC_PATHS.

    On success: injects `request.state.user_id` (UUID string).
    On failure: returns a 401 JSON response immediately.
    """

    async def dispatch(self, request: Request, call_next):
        # Allow public paths without auth
        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Authorization header missing or malformed. Expected: Bearer <token>"},
            )

        token = auth_header.removeprefix("Bearer ").strip()
        try:
            payload = verify_supabase_jwt(token)
            # Supabase stores the user UUID in the 'sub' claim
            request.state.user_id = payload["sub"]
            request.state.jwt_payload = payload
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
            )

        return await call_next(request)
