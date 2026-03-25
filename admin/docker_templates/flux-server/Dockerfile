# ── AlloFlow Flux Image Server ──
# GPU-accelerated image generation with Flux.1-schnell
# OpenAI-compatible API for plug-and-play with AIProvider
#
# Build args:
#   BASE_IMAGE - pytorch/pytorch:latest (NVIDIA/CPU) or rocm/pytorch:latest (AMD)

ARG BASE_IMAGE=pytorch/pytorch:latest
FROM ${BASE_IMAGE}

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-dev git curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install remaining deps (torch already in base image)
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy server code
COPY flux_server.py .

# Pre-download model at build time (optional — makes first start faster)
# Uncomment the next line to bake the model into the image (~12GB larger)
# RUN python3 -c "from diffusers import FluxPipeline; FluxPipeline.from_pretrained('black-forest-labs/FLUX.1-schnell', torch_dtype='float16')"

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

# Run as non-root user
RUN useradd -m -u 1000 flux && chown -R flux:flux /app
USER 1000

CMD ["python3", "flux_server.py"]
