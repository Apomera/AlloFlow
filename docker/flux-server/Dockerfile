# ── AlloFlow Local Image Server ──
# GPU-accelerated SANA-Sprint (default) or Flux image generation
# OpenAI-compatible API for plug-and-play with AIProvider

FROM nvidia/cuda:13.4.3-runtime-ubuntu24.04@sha256:f58bd7a0701fae3a2160f22e1d451b77b349bd9ef83dad76f5529aa413c149a8

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# The lock targets CPython 3.12 / Linux x86_64, including the CUDA 12.6 Torch wheel.
# A venv avoids modifying Ubuntu's externally managed Python installation.
RUN python3 -m venv /opt/image-env
ENV PATH="/opt/image-env/bin:${PATH}"

# Install remaining deps
COPY requirements.txt .
RUN python3 -m pip install --require-hashes --only-binary=:all: -r requirements.txt \
    && python3 -m pip check \
    && python3 -c "from diffusers import SanaSprintPipeline, SanaSprintImg2ImgPipeline, FluxPipeline, FluxImg2ImgPipeline; import fastapi"

# Copy server code
COPY flux_server.py security.py image_backends.py model_manifest.py model-manifest.json studio.py studio.html ./

# Model weights are provisioned at runtime into /models; none are baked in.

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/health', timeout=5).close()"

CMD ["python3", "flux_server.py"]
