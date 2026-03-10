# AlloFlow Local AI Stack (Docker)

The complete "School Box" AI backend — everything you need for local, private AI.

## Services

| Service | Port | Purpose | GPU Needed? |
|---------|------|---------|-------------|
| **Ollama** | 11434 | LLM (text generation) | Recommended |
| **Flux** | 7860 | Image gen/editing (Flux.1-schnell) | **Yes** (8GB+ VRAM) |
| **Piper** | 10200 | Text-to-speech (offline, 40+ languages) | No |
| **SearXNG** | 8888 | Web search (privacy-first, no tracking) | No |

## Quick Start

```bash
# Start everything
docker compose up -d

# Start just specific services
docker compose up -d ollama searxng    # LLM + Search only
docker compose up -d flux             # Image gen only

# Check status
docker compose ps
docker compose logs -f flux           # Watch Flux logs
```

## GPU Requirements

- **Flux.1-schnell**: NVIDIA GPU with 8GB+ VRAM (RTX 3060 or better)
- **Ollama**: Works on CPU, but GPU recommended for speed
- Requires [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

## How It Integrates with AlloFlow

When you configure AlloFlow to use **Ollama** as the AI backend:

1. **Text generation** → Ollama (port 11434)
2. **Image generation** → Flux server (port 7860) auto-detected
3. **Image editing** → Flux server (port 7860) auto-detected
4. **Text-to-speech** → Edge TTS (no Docker needed) or Piper (port 10200)
5. **Web search** → SearXNG (port 8888) auto-detected

The AIProvider automatically tries the Flux server first. If it's not running, it falls back gracefully.

## Testing

```bash
# Test Flux image generation
curl -X POST http://localhost:7860/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A friendly robot teacher in a classroom","size":"512x512"}'

# Test health
curl http://localhost:7860/health
```

## Without GPU

If you don't have an NVIDIA GPU, you can still run Ollama, Piper, and SearXNG.
Skip the Flux service — image generation will fall back to Gemini's Imagen API.

```bash
docker compose up -d ollama piper searxng
```
