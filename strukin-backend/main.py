"""
Strukin Backend — FastAPI application entry point.

Run with:
    python main.py
    # or directly with uvicorn:
    uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
"""

import logging

import httpx
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes import categories, ocr, transactions
from core.config import settings
from core.security import JWTMiddleware

# ─── Logging ───────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("strukin")

# ─── App ───────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Strukin API",
    description="AI-powered financial assistant backend — OCR, transactions, and category management.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── Middleware ─────────────────────────────────────────────────────────────

# JWT authentication — ditambah PERTAMA (innermost), agar CORSMiddleware bisa
# membungkus semua response termasuk 401 dari JWTMiddleware.
app.add_middleware(JWTMiddleware)

# CORS — ditambah TERAKHIR (outermost) sehingga header CORS selalu ada di setiap
# response, termasuk yang di-short-circuit oleh JWTMiddleware (401, 403).
# Catatan: allow_origins tidak boleh "*" jika allow_credentials=True.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.strukin.eighista.me",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global Exception Handlers ─────────────────────────────────────────────

@app.exception_handler(httpx.TimeoutException)
async def ai_timeout_handler(request: Request, exc: httpx.TimeoutException):
    logger.error("AI service timeout on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=504,
        content={"detail": "The AI service timed out. Please retry your request."},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal error occurred. Please try again."},
    )

# ─── Routers ──────────────────────────────────────────────────────────────

app.include_router(ocr.router, prefix=settings.API_PREFIX)
app.include_router(categories.router, prefix=settings.API_PREFIX)
app.include_router(transactions.router, prefix=settings.API_PREFIX)

# ─── Health Check ──────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"], summary="Health check (no auth required)")
async def health_check():
    """Returns 200 OK — used by load balancers and uptime monitors."""
    return {"status": "ok", "version": "1.0.0"}


# ─── Entrypoint ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        workers=2,           # 2 workers to stay within 2GB RAM budget
        access_log=True,
    )
