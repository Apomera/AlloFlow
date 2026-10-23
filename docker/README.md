# AlloFlow "School Box" — Local AI Stack

This is the optional Docker-based School Box server stack. It is useful for school-owned boxes, district/server experiments, air-gapped deployments, and heavier local infrastructure tests.

For the normal AlloFlow Desktop package, use `desktop/README.md` instead. Desktop already serves the bundled app, manages local keys, can run the built-in AI engine, and supports Desktop LAN classroom sessions without Docker. Docker Desktop is needed only when you intentionally want this separate server stack.

Ollama and the local database run on your hardware. Edge TTS sends speech text to Microsoft's online service; SearXNG searches online. Use the offline services below when network access is unavailable or text must stay on the box.

## Quick Start

```bash
# From the project root, enter the stack directory first:
cd docker
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
| **Piper** | 10200 | Offline TTS fallback (35 languages upstream; only en_US-amy-medium ships in docker-compose) | Optional |
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
- `ALLOFLOW_BIND_ADDRESS=127.0.0.1` — publish ports only on this computer (the default even without `.env`). Container-to-container communication is unchanged.

### Explicit classroom/LAN access

For this optional Docker stack, set these values in `docker/.env`, replacing the sample address with the box's actual LAN IPv4 address:

```dotenv
ALLOFLOW_BIND_ADDRESS=192.168.1.50
ALLOFLOW_TTS_ALLOWED_ORIGINS=http://192.168.1.50:3000
REACT_APP_POCKETBASE_URL=http://192.168.1.50:8090
```

From `docker/`, run `docker compose up -d --build` to recreate containers and rebuild the frontend if its database URL changed. Open `http://192.168.1.50:3000` on classroom devices. Use your configured `WEB_PORT` in the allowed origin if it differs from 3000. Additional approved browser origins can be comma-separated; wildcards are not accepted.

This explicitly publishes all listed service ports on that LAN interface. `0.0.0.0` can instead share all IPv4 interfaces. Restrict access with the host firewall to the trusted classroom network; these optional AI/speech APIs do not provide user authentication. Browser origin checks are an additional restriction, not authentication. Do not port-forward this stack onto the public internet. Use Docker Engine 28 or newer for localhost publishing isolation ([Docker port publishing guidance](https://docs.docker.com/engine/network/port-publishing/)).

Existing Docker installations that relied on implicit LAN publishing must set `ALLOFLOW_BIND_ADDRESS` before their next recreation. AlloFlow Desktop's separate built-in LAN classroom mode is unchanged. Desktop's School Box preparation manages its own frontend/database URL for local use; use the commands above for a separately managed LAN Docker stack.

### Optional NPU server

`python docker/npu_server.py` now listens on `127.0.0.1:11435` by default. To share it intentionally, use `--host <box-LAN-address>` and set `ALLOFLOW_NPU_ALLOWED_ORIGINS` to the exact classroom app origin(s) for browser clients. Native local clients, loopback browser apps, and the shipped AlloFlow web origin remain supported. Apply the same trusted-network firewall restrictions as above.

### Request limits and errors

Both optional Python APIs cap request bodies at 256 KiB. Docker speech accepts up to 20,000 text characters, speeds from 0.25 to 4 (including existing numeric-string speeds), and four concurrent jobs. Audio output is capped at 32 MiB and each synthesis at five minutes. Existing voice aliases and the unknown-voice fallback are preserved.

NPU requests accept 1–128 text messages with at most 64,000 combined characters, integer `max_tokens` from 1 to 65536, and finite temperatures from 0 to 2. The requested output is a ceiling: actual generation is capped to the selected model's remaining context, preserving AlloFlow's normal 8192-token request even on these 4096-context models. A prompt that leaves no room for output is rejected. One inference/model swap runs at a time. Busy requests return 429 with `Retry-After: 1`; invalid requests return 400 and oversized bodies 413. Provider failures return a generic 500 message; diagnostics stay in the local server log. Split long passages or shorten chat history rather than bypassing the limits.

### Reviewed downloads and security checks

The main School Box Compose images and all three Dockerfiles use immutable SHA256 manifest digests, including their existing x64/ARM64 manifests. Tags remain as readable labels, but the digest determines the actual download. Digest pins provide reproducibility; they do not certify an image as vulnerability-free. Dependabot checks Dockerfiles, Compose references, and the optional services' Python requirements weekly, with updates delivered as pull requests.

Docker speech installs the complete `edge-tts` and Flask dependency tree from `edge-tts-server/requirements.txt` with wheel hashes enforced and source builds disabled. The security tooling has its own hashed lock in `dev-tools/security/requirements.txt`. CI audits both using `pip-audit` without running dependency build scripts. The unused `flask-cors` dependency was removed; the server retains its explicit origin checks. The speech health check uses Python's standard library so it works in the slim image without curl.

The required security workflow discovers new non-MCP workflows automatically. Its scheduled Tuesday run and manual runs audit all four maintained npm scopes (desktop runtime, web app, trailer, security parser), even when their lockfiles have not changed. Normal PR/push dependency checks stay scoped to changed manifests. All four scopes block high and critical findings. Registry failures are errors, not clean audit results. MCP workflows and dependencies remain independently maintained.

The NPU model catalog pins full Hugging Face commit IDs, refuses custom tokenizer code, and loads tokenizer files locally after the pinned download. Tokenizers for all three catalog entries were checked with Transformers 5.3.0. Cached files are separated by revision, so stale files from another revision cannot be selected. Existing caches are preserved, but the first run of this update may download a fresh pinned model copy; provision it while online before an offline deployment. The NPU Python environment and GPU Flux dependency stack still require hardware-specific compatibility testing; the hashed speech lock does not cover those environments. No GPU/NPU inference or container vulnerability scan is implied by the pin checks.

To update a Python lock, change its sibling `requirements.in`, then use `pip-compile --generate-hashes --allow-unsafe --output-file <requirements.txt> <requirements.in>` in an isolated environment. Resolve conditional dependencies for all supported Python/platform targets; a lock generated on Python 3.14 can omit packages required on 3.11/3.12. After installing the lock with hash verification, run `python dev-tools/security/check_python_lock_compatibility.py <requirements.txt>` to check installed dependency metadata for Python 3.11–3.14 on Linux/Windows, including transitive extras. This metadata check supplements actual wheel-only installation tests on the supported targets. Audit the resulting lock and run the optional-service tests before merging. Review image digest changes and model commit changes in the same way; never replace a pin with an unreviewed moving reference just to make a check pass.

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
