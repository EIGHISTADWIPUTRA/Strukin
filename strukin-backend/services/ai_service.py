"""
AI Service — Image preprocessing + Qwen3-VL OCR via DashScope.

Target model: qwen3-vl-30b-a3b-instruct (OpenAI-compatible chat completions).
- Request: messages dengan content array [ image_url (base64), text ].
- Response: choices[0].message.content (string atau array of parts).

Memory strategy:
  1. Receive raw image bytes
  2. Resize in-memory with Pillow (max 1024px, JPEG quality 80)
  3. Base64-encode and send to DashScope
  4. Explicitly close BytesIO buffers after use to free RAM immediately
"""

import base64
import io
import json
import logging
import re
from typing import Any

import httpx
from PIL import Image

from core.config import settings

logger = logging.getLogger(__name__)

# DashScope chat completions endpoint
_DASHSCOPE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
_MAX_IMAGE_PX = 1024
_JPEG_QUALITY = 80
_AI_TIMEOUT_SECONDS = 30.0

# System prompt — instructs Qwen-VL to return structured JSON only
_SYSTEM_PROMPT = """You are a receipt OCR specialist. Analyze the provided receipt image and extract information.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "merchant": "store name or null",
  "total_amount": 12345.67 or null,
  "date": "YYYY-MM-DD or original string or null",
  "items": [
    {"name": "item name", "quantity": 1, "price": 9.99}
  ],
  "suggested_category": "one of the provided categories or a sensible default"
}

Rules:
- total_amount must be a number (float), not a string
- If a field cannot be determined, use null
- items may be an empty array []
- suggested_category must match one of the provided category names when possible"""


def _resize_image(raw_bytes: bytes) -> bytes:
    """
    Resize image so the longest edge is ≤ MAX_IMAGE_PX,
    re-encode as JPEG at JPEG_QUALITY, and return compressed bytes.
    BytesIO buffers are explicitly closed to free memory.
    """
    input_buf = io.BytesIO(raw_bytes)
    try:
        img = Image.open(input_buf)
        img = img.convert("RGB")  # Ensure no alpha channel (JPEG doesn't support it)

        # Resize preserving aspect ratio
        img.thumbnail((_MAX_IMAGE_PX, _MAX_IMAGE_PX), Image.LANCZOS)

        output_buf = io.BytesIO()
        try:
            img.save(output_buf, format="JPEG", quality=_JPEG_QUALITY, optimize=True)
            compressed = output_buf.getvalue()
        finally:
            output_buf.close()

        logger.debug(
            "Image resized: original=%d bytes → compressed=%d bytes (%dx%d)",
            len(raw_bytes), len(compressed), img.width, img.height,
        )
        return compressed
    finally:
        input_buf.close()
        img.close()  # type: ignore[possibly-undefined]


def _build_user_prompt(category_names: list[str]) -> str:
    if category_names:
        cat_list = ", ".join(category_names)
        return f"Extract all receipt information. Available categories: {cat_list}"
    return "Extract all receipt information."


def _parse_ai_response(raw_content: str) -> dict[str, Any]:
    """
    Parse the AI's text output into a Python dict.
    Handles cases where the model wraps JSON in markdown code fences.
    """
    content = raw_content.strip()

    # Strip markdown code fences if present
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
        content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse AI JSON output: %s\nRaw: %s", exc, raw_content[:500])
        return {}


async def call_qwen_vl(image_bytes: bytes, category_names: list[str]) -> dict[str, Any]:
    """
    Send the (already-compressed) image to DashScope's Qwen-VL endpoint.
    Returns the parsed structured dict from the AI.
    """
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    # Clear the reference immediately — we no longer need the raw bytes here
    del image_bytes

    payload = {
        "model": settings.DASHSCOPE_MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"},
                    },
                    {
                        "type": "text",
                        "text": _build_user_prompt(category_names),
                    },
                ],
            },
        ],
        "max_tokens": 1024,
        "temperature": 0.1,  # Low temperature for deterministic structured output
    }

    headers = {
        "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=_AI_TIMEOUT_SECONDS) as client:
        response = await client.post(_DASHSCOPE_URL, json=payload, headers=headers)
        response.raise_for_status()

    result = response.json()
    message = result.get("choices", [{}])[0].get("message", {})
    raw_content = _extract_text_from_message(message)
    if not raw_content:
        logger.error("Empty or unsupported message content from model; keys=%s", list(message.keys()))
        return {}
    return _parse_ai_response(raw_content)


def _extract_text_from_message(message: dict) -> str:
    """
    Extract plain text from DashScope/Qwen3-VL response message.
    Compatible with: string content (OpenAI-style) or content as list of parts
    (e.g. [{"type": "text", "text": "..."}]).
    """
    content = message.get("content")
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                parts.append(part.get("text") or "")
            elif isinstance(part, str):
                parts.append(part)
        return "\n".join(parts)
    return ""


async def process_receipt(
    file_bytes: bytes,
    category_names: list[str],
) -> dict[str, Any]:
    """
    Full OCR pipeline:
      1. Resize and compress image
      2. Call Qwen-VL
      3. Return structured dict

    The raw file_bytes are freed as soon as compression is done.
    """
    compressed = _resize_image(file_bytes)
    del file_bytes  # Free original — only keep compressed copy

    result = await call_qwen_vl(compressed, category_names)
    del compressed  # Free after AI call

    return result
