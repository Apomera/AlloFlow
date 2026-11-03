"""
AlloFlow Local Image Generation Server (SANA-Sprint or Flux)
OpenAI-compatible API for local image generation and editing.

Endpoints:
  POST /v1/images/generations  — text-to-image
  POST /v1/images/edits        — image-to-image editing
  GET  /health                 — health check

Designed to run in Docker with GPU support.
CPU fallback is available for compatibility; GPU use is recommended.
"""

import base64
import io
import logging
import os
import time
from contextlib import asynccontextmanager

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from studio import STUDIO_HTML, studio_headers
from image_backends import ImageBackend, SharedImagePipeline
from security import (FluxSecurity, GenerationGate, MAX_BODY_BYTES, MAX_IMAGE_BYTES,
                      MAX_IMAGE_PIXELS, MAX_STEPS, MAX_PROMPT_CHARS)
from pydantic import BaseModel, Field, conint
from typing import Optional, Literal
import re
from PIL import Image

# ── Configuration ──────────────────────────────────────────────
BACKEND = ImageBackend.from_env()
MODEL_ID = BACKEND.model_id
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
PORT = int(os.getenv("PORT", "7860"))
MAX_SIZE = max(64, min(1024, int(os.getenv("MAX_IMAGE_SIZE", "1024"))))
generation_gate = GenerationGate()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("flux-server")

# ── Models (loaded at startup) ─────────────────────────────────
pipe_txt2img = None
pipe_img2img = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models at startup, clean up at shutdown."""
    global pipe_txt2img, pipe_img2img

    log.info("Loading %s model: %s on %s", BACKEND.name, MODEL_ID, DEVICE)
    import diffusers

    runtime = SharedImagePipeline(BACKEND, DEVICE, torch, diffusers)
    pipe_txt2img, pipe_img2img = runtime.generate, runtime.edit
    log.info("Text-to-image and image-to-image pipelines ready")
    try:
        yield
    finally:
        pipe_txt2img = pipe_img2img = None
        runtime.close()
        if DEVICE == "cuda":
            torch.cuda.empty_cache()


app = FastAPI(title="AlloFlow Local Image Server", lifespan=lifespan)

app.add_middleware(
    FluxSecurity,
    token=os.getenv("ALLOFLOW_FLUX_API_TOKEN", ""),
    origins=os.getenv("ALLOFLOW_FLUX_ALLOWED_ORIGINS", ""),
)


class ImageGenerationRequest(BaseModel):
    model: str = Field(default=BACKEND.name, max_length=128)
    prompt: str = Field(min_length=1, max_length=MAX_PROMPT_CHARS)
    n: Literal[1] = 1
    size: str = Field(default="512x512", max_length=16)
    response_format: Literal["b64_json"] = "b64_json"
    negative_prompt: Optional[str] = Field(default=None, max_length=MAX_PROMPT_CHARS)
    num_inference_steps: Optional[conint(strict=True, ge=1, le=min(MAX_STEPS, BACKEND.max_steps))] = None
    guidance_scale: Optional[float] = Field(default=None, ge=0, le=20, allow_inf_nan=False)


class ImageEditRequest(ImageGenerationRequest):
    image: str = Field(min_length=1, max_length=MAX_BODY_BYTES)
    strength: float = Field(default=0.75, gt=0, le=1, allow_inf_nan=False)


class OllamaImageRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=MAX_PROMPT_CHARS)


class ImageResponse(BaseModel):
    created: int
    data: list


# ── Helpers ────────────────────────────────────────────────────

def parse_size(size_str: str) -> tuple:
    if not re.fullmatch(r"[0-9]{2,4}x[0-9]{2,4}", size_str):
        raise HTTPException(422, "Invalid image size")
    width, height = map(int, size_str.split("x"))
    if not (64 <= width <= MAX_SIZE and 64 <= height <= MAX_SIZE):
        raise HTTPException(422, "Image size is outside the supported limits")
    multiple = BACKEND.size_multiple
    return (width // multiple) * multiple, (height // multiple) * multiple


def image_to_base64(img: Image.Image, format: str = "PNG") -> str:
    """Convert PIL Image to base64 string."""
    buf = io.BytesIO()
    img.save(buf, format=format)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def base64_to_image(b64: str) -> Image.Image:
    try:
        if b64.startswith("data:"):
            prefix, b64 = b64.split(",", 1)
            if prefix.lower() not in ("data:image/png;base64", "data:image/jpeg;base64", "data:image/webp;base64"):
                raise ValueError("unsupported image")
        if len(b64) > ((MAX_IMAGE_BYTES + 2) // 3) * 4:
            raise ValueError("encoded image too large")
        data = base64.b64decode(b64, validate=True)
        if len(data) > MAX_IMAGE_BYTES:
            raise ValueError("image too large")
        with Image.open(io.BytesIO(data)) as image:
            if image.format not in ("PNG", "JPEG", "WEBP") or image.width * image.height > MAX_IMAGE_PIXELS:
                raise ValueError("unsupported image dimensions or format")
            return image.convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid or oversized image") from None


# ── Endpoints ──────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def image_studio():
    return HTMLResponse(content=STUDIO_HTML, headers=studio_headers())


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL_ID,
        "revision": BACKEND.revision,
        "offline": BACKEND.offline,
        "backend": BACKEND.name,
        "device": DEVICE,
        "txt2img": pipe_txt2img is not None,
        "img2img": pipe_img2img is not None,
    }


@app.post("/v1/images/generations", response_model=ImageResponse)
def generate_image(req: ImageGenerationRequest):
    """Blocking GPU work runs in FastAPI's thread pool, with no waiting queue."""
    if pipe_txt2img is None:
        raise HTTPException(503, "Model not loaded yet")
    width, height = parse_size(req.size)
    options = BACKEND.options(steps=req.num_inference_steps, guidance=req.guidance_scale,
                              width=width, height=height)
    with generation_gate.acquire():
        try:
            result = pipe_txt2img(prompt=req.prompt, **options)
            return ImageResponse(created=int(time.time()), data=[{"b64_json": image_to_base64(result.images[0])}])
        except Exception as error:
            log.error("Image generation failed (%s)", type(error).__name__)
            raise HTTPException(500, "Image generation failed") from None


@app.post("/v1/images/edits", response_model=ImageResponse)
def edit_image(req: ImageEditRequest):
    if pipe_img2img is None:
        raise HTTPException(503, "Image-to-image model not available")
    width, height = parse_size(req.size)
    options = BACKEND.options(steps=req.num_inference_steps, guidance=req.guidance_scale,
                              width=width, height=height)
    if BACKEND.name == "flux" and int(options["num_inference_steps"] * req.strength) < 1:
        raise HTTPException(422, "Increase edit strength or inference steps to allow at least one step")
    with generation_gate.acquire():
        with base64_to_image(req.image) as original:
            source_image = original.resize((width, height), Image.Resampling.LANCZOS)
        try:
            result = pipe_img2img(prompt=req.prompt, image=source_image, strength=req.strength,
                                 **options)
            return ImageResponse(created=int(time.time()), data=[{"b64_json": image_to_base64(result.images[0])}])
        except Exception as error:
            log.error("Image edit failed (%s)", type(error).__name__)
            raise HTTPException(500, "Image edit failed") from None
        finally:
            source_image.close()


@app.post("/api/generate")
def ollama_generate(body: OllamaImageRequest):
    result = generate_image(ImageGenerationRequest(prompt=body.prompt))
    return {"images": [result.data[0]["b64_json"]]}


if __name__ == "__main__":
    log.info(f"Starting AlloFlow Local Image Server on port {PORT}")
    log.info(f"   Model: {MODEL_ID}")
    log.info(f"   Endpoints:")
    log.info(f"     POST /v1/images/generations (OpenAI-compatible)")
    log.info(f"     POST /v1/images/edits (Image editing)")
    log.info(f"     POST /api/generate (Ollama-compatible)")
    log.info(f"     GET  /health")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
