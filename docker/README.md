# AlloFlow "School Box" — Local AI Stack

Run AlloFlow entirely on local hardware with no cloud dependencies. All student data stays on-premise. All AI runs locally via Ollama.

## Quick Start

```bash
# From the project root:
docker compose up -d

# Or with GPU image generation (Flux):
docker compose --profile gpu up -d

# Access AlloFlow at:
open http://localhost:3000
```

## Services

| Service | Port | Purpose | Required? |
|---------|------|---------|-----------|
| **Frontend** | 3000 | AlloFlow React app (Nginx) | Yes |
| **PocketBase** | 8090 | Local database (replaces Firebase) | Yes |
| **Ollama** | 11434 | LLM text generation | Yes |
| **Edge TTS** | 5001 | Neural text-to-speech (28 voices) | Recommended |
| **Piper** | 10200 | Offline TTS fallback (40+ languages) | Optional |
| **SearXNG** | 8888 | Web search for fact-checking | Optional |
| **Flux** | 7860 | Image generation (GPU required) | Optional |

## Minimal Setup (No GPU)

If you don't have an NVIDIA GPU, skip Flux — image generation falls back to Gemini's API (or is disabled in true air-gap mode):

```bash
docker compose up -d frontend pocketbase ollama piper searxng
```

## Configuration

Copy the example env file and customize:

```bash
cp docker/.env.example docker/.env
```

Key settings:
- `REACT_APP_DATA_BACKEND=auto` — auto-detects PocketBase → Firebase → localStorage
- `REACT_APP_POCKETBASE_URL=http://localhost:8090` — PocketBase endpoint
- Ports are configurable via `WEB_PORT`, `OLLAMA_PORT`, etc.

## How It Works

1. **Nginx** serves the React SPA and reverse-proxies API calls:
   - `/api/ollama/*` → Ollama (LLM)
   - `/api/pocketbase/*` → PocketBase (database)
   - `/api/flux/*` → Flux (images)
   - `/api/tts/*` → Edge TTS (speech)
   - `/api/search/*` → SearXNG (web search)

2. **Auto-detection** on startup:
   - App checks PocketBase health at `/api/health`
   - If PocketBase responds → uses it for all data
   - If not → falls back to Firebase (if configured) → localStorage

3. **All AI inference** runs through Ollama:
   - Text generation: Ollama API at port 11434
   - Models auto-download on first use (e.g., `llama3.1`, `gemma2`)

## GPU Requirements

- **Flux.1-schnell**: NVIDIA GPU with 8GB+ VRAM (RTX 3060+)
- **Ollama**: Works on CPU, but GPU recommended for speed
- Requires [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

## Testing

```bash
# Check all services are running
docker compose ps

# Test PocketBase health
curl http://localhost:8090/api/health

# Test Ollama
curl http://localhost:11434/api/tags

# Test Edge TTS
curl http://localhost:5001/health

# Test Flux (GPU only)
curl http://localhost:7860/health
```

## Air-Gap (Fully Offline)

For true air-gap deployment (no internet at all):

1. Pre-pull all Docker images on a connected machine
2. Pre-download Ollama models: `docker exec alloflow-ollama ollama pull llama3.1`
3. Pre-download Piper voices (auto-downloaded on first use)
4. Set `REACT_APP_DATA_BACKEND=pocketbase` (skip Firebase auto-detection)
5. Transfer the entire Docker volume set to the air-gapped machine

## Troubleshooting

- **Frontend won't start**: Check PocketBase health — frontend depends on it
- **Ollama slow**: Ensure GPU passthrough is working (`nvidia-smi` in container)
- **No images**: Flux requires GPU; without it, set up Gemini API key as fallback
- **PocketBase auth errors**: Check that `pb_schema.json` migrations are applied
