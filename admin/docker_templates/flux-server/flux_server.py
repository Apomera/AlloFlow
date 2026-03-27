"""
AlloFlow Flux Image Generation Server
OpenAI-compatible API for local image generation and editing.

Endpoints:
  POST /v1/images/generations  — text-to-image (Flux.1-schnell)
  POST /v1/images/edits        — image-to-image editing
  GET  /health                 — health check (includes GPU status + fallback reason)

Uses ONNX Runtime + DirectML for GPU acceleration on AMD/Intel/NVIDIA.
Falls back to CPU with clear reporting if GPU is unavailable.
"""

import asyncio
import base64
import io
import json
import logging
import os
import sys
import time
from contextlib import asynccontextmanager

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from PIL import Image

# ── Configuration ──────────────────────────────────────────────
MODEL_ID = os.getenv("FLUX_MODEL", "black-forest-labs/FLUX.1-schnell")
PORT = int(os.getenv("PORT", "7860"))
MAX_SIZE = int(os.getenv("MAX_IMAGE_SIZE", "1024"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("flux-server")

# ── GPU Strategy (written by the installer) ────────────────────
GPU_STRATEGY = None
STRATEGY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gpu_strategy.json")
if os.path.exists(STRATEGY_FILE):
    try:
        with open(STRATEGY_FILE, "r") as f:
            GPU_STRATEGY = json.load(f)
        log.info(f"📋 Loaded GPU strategy from installer: {GPU_STRATEGY.get('strategy')}")
    except Exception as e:
        log.warning(f"⚠️  Could not read gpu_strategy.json: {e}")

# Device detection: CUDA → DirectML (ONNX Runtime) → CPU
USE_DIRECTML = False
USE_CUDA = False
FALLBACK_REASON = None

if torch.cuda.is_available():
    USE_CUDA = True
    DEVICE = "cuda"
    DTYPE = torch.float16
    log.info("=" * 60)
    log.info("🟢 GPU DETECTED: NVIDIA CUDA")
    log.info(f"   GPU: {torch.cuda.get_device_name(0)}")
    log.info(f"   VRAM: {torch.cuda.get_device_properties(0).total_mem / 1024**3:.1f} GB")
    log.info("   Flux will run with full GPU acceleration.")
    log.info("=" * 60)
else:
    try:
        import onnxruntime as ort
        providers = ort.get_available_providers()
        if "DmlExecutionProvider" in providers:
            USE_DIRECTML = True
            DEVICE = "directml"
            DTYPE = torch.float16
            log.info("=" * 60)
            log.info("🟢 GPU DETECTED: DirectML (ONNX Runtime)")
            log.info(f"   Available providers: {providers}")
            if GPU_STRATEGY and GPU_STRATEGY.get("gpuName"):
                log.info(f"   GPU: {GPU_STRATEGY['gpuName']}")
            log.info("   Flux will run with DirectML GPU acceleration.")
            log.info("=" * 60)
        else:
            DEVICE = "cpu"
            DTYPE = torch.float32
            FALLBACK_REASON = (
                f"ONNX Runtime is installed but DmlExecutionProvider is not available. "
                f"Available providers: {providers}. "
                "This usually means no compatible GPU driver is installed."
            )
    except ImportError:
        DEVICE = "cpu"
        DTYPE = torch.float32
        FALLBACK_REASON = (
            "onnxruntime-directml is not installed. "
            "GPU acceleration requires the onnxruntime-directml package."
        )

    if not USE_DIRECTML:
        # Check if CUDA was expected but failed
        cuda_reason = ""
        try:
            cuda_reason = f" torch.cuda.is_available() = False."
            if hasattr(torch.version, 'cuda') and torch.version.cuda:
                cuda_reason += f" CUDA toolkit version: {torch.version.cuda}."
            else:
                cuda_reason += " PyTorch was built WITHOUT CUDA support."
        except Exception:
            pass

        if not FALLBACK_REASON:
            FALLBACK_REASON = f"No GPU acceleration available.{cuda_reason}"

        log.warning("=" * 60)
        log.warning("🔴 WARNING: RUNNING ON CPU — NO GPU ACCELERATION")
        log.warning("")
        log.warning("   Image generation will be EXTREMELY SLOW on CPU.")
        log.warning("   A single image may take 5-15+ minutes instead of seconds.")
        log.warning("")
        log.warning(f"   Reason: {FALLBACK_REASON}")
        log.warning("")
        if GPU_STRATEGY and GPU_STRATEGY.get("warning"):
            log.warning(f"   Installer note: {GPU_STRATEGY['warning']}")
            log.warning("")
        log.warning("   To fix this:")
        log.warning("   • NVIDIA: Install CUDA toolkit + reinstall with Python 3.11/3.12")
        log.warning("   • AMD/Intel (Windows): Ensure latest GPU drivers are installed")
        log.warning("   • AMD (Linux): Install ROCm + reinstall with Python 3.11/3.12")
        log.warning("=" * 60)

# ── Models (loaded at startup) ─────────────────────────────────
pipe_txt2img = None
pipe_img2img = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models at startup, clean up at shutdown."""
    global pipe_txt2img, pipe_img2img

    log.info(f"🎨 Loading Flux model: {MODEL_ID}")
    log.info(f"   Device: {DEVICE} | Dtype: {DTYPE}")

    if USE_DIRECTML:
        # Use ONNX Runtime with DirectML — GPU-accelerated on AMD/Intel/NVIDIA
        try:
            from optimum.onnxruntime import ORTFluxPipeline
            pipe_txt2img = ORTFluxPipeline.from_pretrained(
                MODEL_ID,
                export=True,
                provider="DmlExecutionProvider",
            )
            log.info("✅ ONNX+DirectML text-to-image pipeline ready (GPU accelerated)")
        except Exception as e:
            log.error(f"❌ Failed to load ONNX+DirectML pipeline: {e}")
            log.warning("=" * 60)
            log.warning("🔴 DirectML FAILED — FALLING BACK TO CPU")
            log.warning(f"   Error: {e}")
            log.warning("   Image generation will be EXTREMELY SLOW.")
            log.warning("   Check your GPU drivers are up to date.")
            log.warning("=" * 60)
            global FALLBACK_REASON, DEVICE
            FALLBACK_REASON = f"DirectML pipeline failed to load: {e}. Fell back to CPU."
            DEVICE = "cpu"
            from diffusers import FluxPipeline
            pipe_txt2img = FluxPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.float32)
            log.info("✅ CPU text-to-image pipeline ready (slow)")
    elif USE_CUDA:
        from diffusers import FluxPipeline, FluxImg2ImgPipeline
        pipe_txt2img = FluxPipeline.from_pretrained(MODEL_ID, torch_dtype=DTYPE)
        pipe_txt2img = pipe_txt2img.to("cuda")
        pipe_txt2img.enable_model_cpu_offload()
        log.info("✅ CUDA text-to-image pipeline ready")

        try:
            pipe_img2img = FluxImg2ImgPipeline.from_pretrained(MODEL_ID, torch_dtype=DTYPE)
            pipe_img2img = pipe_img2img.to("cuda")
            pipe_img2img.enable_model_cpu_offload()
            log.info("✅ CUDA image-to-image pipeline ready")
        except Exception as e:
            log.warning(f"⚠️ Img2Img pipeline not available: {e}")
    else:
        from diffusers import FluxPipeline
        pipe_txt2img = FluxPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.float32)
        log.info("✅ CPU text-to-image pipeline ready (slow)")

    yield

    # Cleanup
    del pipe_txt2img, pipe_img2img
    if USE_CUDA:
        torch.cuda.empty_cache()


app = FastAPI(title="AlloFlow Flux Image Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:",
        "http://localhost",
        "https://localhost",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ── Request/Response Models ────────────────────────────────────

class ImageGenerationRequest(BaseModel):
    model: str = "flux"
    prompt: str = Field(..., max_length=1000)
    n: int = 1
    size: str = "512x512"
    response_format: str = "b64_json"
    negative_prompt: Optional[str] = Field(None, max_length=1000)
    num_inference_steps: Optional[int] = None
    guidance_scale: Optional[float] = None

class ImageEditRequest(BaseModel):
    model: str = "flux"
    prompt: str = Field(..., max_length=1000)
    image: str  # base64 encoded image
    n: int = 1
    size: str = "512x512"
    response_format: str = "b64_json"
    strength: float = 0.75

class ImageResponse(BaseModel):
    created: int
    data: list


# ── Helpers ────────────────────────────────────────────────────

def parse_size(size_str: str) -> tuple:
    """Parse '512x512' into (width, height), clamped to MAX_SIZE."""
    try:
        parts = size_str.lower().split("x")
        w = min(int(parts[0]), MAX_SIZE)
        h = min(int(parts[1]) if len(parts) > 1 else w, MAX_SIZE)
        # Round to nearest 8 (required by most diffusion models)
        w = (w // 8) * 8
        h = (h // 8) * 8
        return max(w, 64), max(h, 64)
    except:
        return 512, 512


def image_to_base64(img: Image.Image, format: str = "PNG") -> str:
    """Convert PIL Image to base64 string."""
    buf = io.BytesIO()
    img.save(buf, format=format)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def base64_to_image(b64: str) -> Image.Image:
    """Convert base64 string to PIL Image."""
    # Strip data URI prefix if present
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")


# ── Endpoints ──────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL_ID,
        "device": DEVICE,
        "gpu_accelerated": USE_DIRECTML or USE_CUDA,
        "gpu_type": "cuda" if USE_CUDA else ("directml" if USE_DIRECTML else "cpu"),
        "gpu_name": GPU_STRATEGY.get("gpuName") if GPU_STRATEGY else None,
        "fallback_reason": FALLBACK_REASON,
        "txt2img": pipe_txt2img is not None,
        "img2img": pipe_img2img is not None,
    }


@app.post("/v1/images/generations", response_model=ImageResponse)
async def generate_image(req: ImageGenerationRequest):
    """OpenAI-compatible text-to-image generation."""
    if pipe_txt2img is None:
        raise HTTPException(503, "Model not loaded yet")

    width, height = parse_size(req.size)
    steps = req.num_inference_steps or (4 if "schnell" in MODEL_ID else 20)
    guidance = req.guidance_scale or (0.0 if "schnell" in MODEL_ID else 7.5)

    log.info(f"🖼️ Generating: '{req.prompt[:60]}...' @ {width}x{height}, steps={steps}")
    start = time.time()

    try:
        result = pipe_txt2img(
            prompt=req.prompt,
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=guidance,
            max_sequence_length=256,
        )
        image = result.images[0]
        elapsed = time.time() - start
        log.info(f"✅ Generated in {elapsed:.1f}s")

        b64 = image_to_base64(image)
        return ImageResponse(
            created=int(time.time()),
            data=[{"b64_json": b64}],
        )
    except Exception as e:
        log.error(f"❌ Generation failed: {e}")
        raise HTTPException(500, f"Image generation failed: {str(e)}")


@app.post("/v1/images/edits", response_model=ImageResponse)
async def edit_image(req: ImageEditRequest):
    """OpenAI-compatible image editing."""
    if pipe_img2img is None:
        raise HTTPException(503, "Image-to-image model not available")

    width, height = parse_size(req.size)

    log.info(f"✏️ Editing image: '{req.prompt[:60]}...' strength={req.strength}")
    start = time.time()

    try:
        source_image = base64_to_image(req.image)
        source_image = source_image.resize((width, height), Image.Resampling.LANCZOS)

        result = pipe_img2img(
            prompt=req.prompt,
            image=source_image,
            strength=req.strength,
            num_inference_steps=4 if "schnell" in MODEL_ID else 20,
            guidance_scale=0.0 if "schnell" in MODEL_ID else 7.5,
        )
        image = result.images[0]
        elapsed = time.time() - start
        log.info(f"✅ Edited in {elapsed:.1f}s")

        b64 = image_to_base64(image)
        return ImageResponse(
            created=int(time.time()),
            data=[{"b64_json": b64}],
        )
    except Exception as e:
        log.error(f"❌ Edit failed: {e}")
        raise HTTPException(500, f"Image edit failed: {str(e)}")


# ── Ollama-compatible endpoint (for direct Ollama backend) ─────

@app.post("/api/generate")
async def ollama_generate(body: dict):
    """Ollama-compatible generate endpoint for image models."""
    prompt = body.get("prompt", "")
    if not prompt:
        raise HTTPException(400, "prompt required")

    if pipe_txt2img is None:
        raise HTTPException(503, "Model not loaded yet")

    width, height = 512, 512
    steps = 4 if "schnell" in MODEL_ID else 20

    log.info(f"🖼️ [Ollama compat] Generating: '{prompt[:60]}...'")
    start = time.time()

    try:
        result = pipe_txt2img(
            prompt=prompt,
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=0.0 if "schnell" in MODEL_ID else 7.5,
            max_sequence_length=256,
        )
        image = result.images[0]
        elapsed = time.time() - start
        log.info(f"✅ Generated in {elapsed:.1f}s")

        b64 = image_to_base64(image)
        return {"images": [b64]}
    except Exception as e:
        log.error(f"❌ Generation failed: {e}")
        raise HTTPException(500, str(e))


if __name__ == "__main__":
    log.info(f"🎨 Starting AlloFlow Flux Image Server on port {PORT}")
    log.info(f"   Model: {MODEL_ID}")
    log.info(f"   Endpoints:")
    log.info(f"     POST /v1/images/generations (OpenAI-compatible)")
    log.info(f"     POST /v1/images/edits (Image editing)")
    log.info(f"     POST /api/generate (Ollama-compatible)")
    log.info(f"     GET  /health")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
