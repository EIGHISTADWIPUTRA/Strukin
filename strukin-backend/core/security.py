"""
JWT verification and middleware for Supabase-issued access tokens.

Flow:
  1. Client authenticates with Supabase (email/password, OAuth, etc.)
  2. Supabase returns a signed JWT (ES256) using the project's EC private key.
  3. Every request to this API must include: Authorization: Bearer <jwt>
  4. JWTMiddleware verifies the token using the public key fetched dynamically
     from Supabase's JWKS endpoint — no static secret needed.
"""

import logging

import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from core.config import settings

logger = logging.getLogger(__name__)

_ALGORITHMS = ["ES256"]
_AUDIENCE = "authenticated"
_JWKS_URL = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"

_jwks_client = PyJWKClient(
    _JWKS_URL,
    headers={"apikey": settings.SUPABASE_ANON_KEY},
    cache_keys=True,
    lifespan=600,
)

logger.info("JWKS client configured: %s", _JWKS_URL)

_PUBLIC_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


def verify_supabase_jwt(token: str) -> dict:
    """
    Decode and verify a Supabase JWT using the JWKS public key (ES256).

    Returns the decoded payload (which contains 'sub' = user UUID).
    Raises HTTPException 401 if the token is invalid or expired.
    """
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=_ALGORITHMS,
            audience=_AUDIENCE,
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as exc:
        logger.warning("JWT verification failed: %s", exc)
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
            request.state.user_id = payload["sub"]
            request.state.jwt_payload = payload
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
            )

        return await call_next(request)
