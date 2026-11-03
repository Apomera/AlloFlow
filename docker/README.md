# AlloFlow "School Box" — Local AI Stack

This is the optional Docker-based School Box server stack. It is useful for school-owned boxes, district/server experiments, air-gapped deployments, and heavier local infrastructure tests.

For the normal AlloFlow Desktop package, use `desktop/README.md` instead. Desktop already serves the bundled app, manages local keys, can run the built-in AI engine, and supports Desktop LAN classroom sessions without Docker. Docker Desktop is needed only when you intentionally want this separate server stack.

Ollama and the local database run on your hardware. Edge TTS sends speech text to Microsoft's online service; SearXNG searches online. Use the offline services below when network access is unavailable or text must stay on the box.

For SANA-Sprint, follow the [Desktop controls, operator setup and first-image test](SANA_SETUP.md).
Desktop source now includes protected Prepare, Install, Repair, Start and Stop
controls with setup checks, plus an explicit app-session connection that keeps
the service token in the native process. Its source tests use synthetic images;
coherent app activation and a real GPU test remain required.
The source includes a standalone browser studio at `http://localhost:7860` for
token entry, generation, editing, preview and PNG download. GPU/container
execution and packaged AlloFlow activation are still pending. The guide
separates operator installation from the browser user's steps.

## Quick Start

```bash
# From the project root, enter the stack directory first:
cd docker
docker compose up -d

# Optional GPU images: first complete SANA_SETUP.md (token, GPU, first-image test).
# Its image-only start command avoids rebuilding the frontend or starting other services.

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
| **Local images** (`flux` service) | 7860 | SANA-Sprint generation and editing (NVIDIA GPU) | Optional |

Local image generation requires a private `ALLOFLOW_FLUX_API_TOKEN` of at least 32 bytes in the
operator's `.env`. Generate a distinct random token using your approved secret
management process; never reuse a cloud-provider key or compile this token into
the website. Generation returns 503 until configured and 401 without a matching
`Authorization: Bearer <token>` header. Only `GET /` (the read-only studio page)
and `GET /health` are public; image operations remain authenticated.
No token is created automatically.

For browser access, set `ALLOFLOW_FLUX_ALLOWED_ORIGINS` to the exact application
origins (for example `http://localhost:7860,http://localhost:3000`), separated by commas. Include the studio's exact origin to use its browser form. Wildcards are
rejected. Origin checks supplement authentication; command-line clients still
need the token. The Nginx `/api/flux/` proxy forwards the caller's Authorization
header and does not grant anonymous access. Retain the default loopback binding
unless a deliberate network configuration protects the service.

The local image API is at `http://localhost:7860` and requires its own token.
AlloFlow's current image settings do not have a separate authenticated SANA
endpoint/token field. The existing **FLUX (Local — port 7860)** option first
uses an anonymous probe, which this server rejects. Its fallback reuses the
main AI connection. Do not replace that main connection with the SANA URL:
this image-only server does not serve chat or model discovery. Use the
[authenticated first-image test](SANA_SETUP.md#4-generate-and-open-a-test-image)
to validate the server independently. A dedicated app image connection and
end-to-end verification remain outstanding. Remote clients require a separately
configured protected route; `localhost` always means the client's own device.

The server accepts at most four authenticated POST requests at once, including
uploads still arriving and requests waiting for processing or response delivery.
Excess requests return 429 with `Retry-After: 1` before their bodies are read.
The unauthenticated health check remains available while these slots are full.
Body intake times out after 15 seconds; disconnects, cancellations and errors
release their intake slots. Chunked uploads use a contiguous bounded buffer to
avoid retaining thousands of small chunks. These limits apply per server process.

The server permits one active generation job and ten admitted jobs per minute
per process, rejects queued work with 429, caps SANA-Sprint at 4 steps (Flux at 50) and output
at 1024 by 1024 pixels, limits JSON to 8 MiB, and accepts only bounded PNG/JPEG/WebP
edit images (6 MiB decoded bytes; 4 megapixels). Run exactly one server worker per
GPU; multiple Uvicorn workers would each have a separate admission limit. A
disconnect does not release the GPU slot while its synchronous model call still
runs. No GPU/model installation is needed to run the offline security tests.

### SANA-Sprint configuration

`IMAGE_BACKEND=sana-sprint` selects
`Efficient-Large-Model/Sana_Sprint_1.6B_1024px_diffusers`, with two inference
steps and guidance 4.5 by default. Generation and image edits share one set of
weights. On CUDA, model CPU offloading avoids moving all weights onto the GPU
at once. BF16 is used when supported; the FP32 fallback uses more memory and
is slower. This Docker profile requires NVIDIA GPU support; it does not set up
Apple, Windows NPU, or CPU acceleration.

To choose the smaller variant, set
`IMAGE_MODEL=Efficient-Large-Model/Sana_Sprint_0.6B_1024px_diffusers`.
To retain Flux, set `IMAGE_BACKEND=flux` and leave `IMAGE_MODEL` empty;
`FLUX_MODEL` still selects the Flux checkpoint. Invalid backend names stop
startup instead of silently loading another model. The request's `model`
field is a compatibility label; only operator environment settings select the
checkpoint. The `flux` service name, cache volume, `/api/flux/` proxy, port and
`ALLOFLOW_FLUX_*` security settings are retained for existing integrations.

Requests use 1–4 steps for SANA-Sprint. Dimensions are rounded down to a multiple
of 32 (Flux: 8), within the existing 64–1024 bounds. Resolution binning is
disabled so a small request does not secretly render at a larger resolution.
`/health` reports the selected backend, checkpoint and available operations.

Starting the optional image service can download model weights into its
existing cache. Review the checkpoint's terms before provisioning: the SANA
model card lists Apache-2.0 for SANA and separate Gemma terms for its text
encoder. This source change does not provision models, install dependencies,
or activate a running service. Hardware memory use, image quality and actual
GPU inference still need verification on the target machine.
See the [SANA-Sprint model card](https://huggingface.co/Efficient-Large-Model/Sana_Sprint_1.6B_1024px_diffusers)
and [Diffusers pipeline documentation](https://huggingface.co/docs/diffusers/api/pipelines/sana_sprint).

The reviewed SANA 1.6B model files total about 9.1 GiB; the 0.6B files total about
7.2 GiB. Allow additional space for Docker, Python/CUDA dependencies, and working
memory. These are download sizes, not minimum GPU-memory requirements. The
installer checks file sizes and SHA256 (large weights) or Git blob hashes (small
configuration files) against `flux-server/model-manifest.json` before reporting
success. Managed download covers these two SANA models. Flux retains a pinned
revision but needs separate operator provisioning because its public gated-file
metadata does not expose all integrity hashes.

Compose defaults `ALLOFLOW_IMAGE_OFFLINE=1`: starting the service uses cached
files only. Follow SANA_SETUP.md to explicitly install and verify the model first.
Custom checkpoints require `IMAGE_MODEL_REVISION` with a full 40-character commit
ID; moving branch names are rejected. Changing revisions keeps the older cache.

## Minimal Setup (No GPU)

If you don't have an NVIDIA GPU, skip the optional image service. Image generation can use a separately configured cloud provider, or remain disabled for offline use:

```bash
docker compose up -d frontend pocketbase ollama piper searxng
```

The base Ollama service has no NVIDIA device requirement. To opt in to GPU text
generation, add the explicit override:

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d ollama
```

Add `--profile gpu` before `up` to include the optional image service after its
separate setup. The image-only command in SANA_SETUP.md does not start Ollama or
other services. GPU allocation does not coordinate memory between text and images;
keep both models' combined memory use within the hardware budget.

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

The main School Box Compose images and all three Dockerfiles use immutable SHA256 manifest digests. Tags remain as readable labels, but the digest determines the actual download. The local image Python lock specifically targets Linux x86_64, CPython 3.12 and CUDA 12.6; it does not support ARM64 images. Digest pins provide reproducibility; they do not certify an image as vulnerability-free. Dependabot checks Dockerfiles, Compose references, and the optional services' Python requirements weekly, with updates delivered as pull requests.

The image lock includes the full dependency closure with wheel hashes and a
specific CUDA Torch wheel. Its Docker build enforces hashes, disables source
builds, checks dependency compatibility and imports the four image pipeline
classes. Diffusers 0.42.1 and Transformers 5.22.1 replace the older vulnerable
version ranges. The 78 locked packages had no matches in the OSV query on
2026-11-02; this is a point-in-time dependency check, not a container or GPU test.
Ubuntu system packages still come from its package repositories during build.
The pinned base and Python/model locks do not make the whole image bit-for-bit
reproducible. Real container builds and GPU smoke tests remain required.

Update the image lock in an isolated Linux x86_64 / CPython 3.12 environment from
its `requirements.in`, retaining the explicit CUDA wheel URL and hash. The generic
multi-platform speech/security lock procedure below is not the image target.
Review transitive version changes, rerun the advisory audit, build the container,
and test generation plus editing before promoting a new image/model revision.

Docker speech installs the complete `edge-tts` and Flask dependency tree from `edge-tts-server/requirements.txt` with wheel hashes enforced and source builds disabled. The security tooling has its own hashed lock in `dev-tools/security/requirements.txt`. CI audits both using `pip-audit` without running dependency build scripts. The unused `flask-cors` dependency was removed; the server retains its explicit origin checks. The speech health check uses Python's standard library so it works in the slim image without curl.

The required security workflow discovers new non-MCP workflows automatically. Its scheduled Tuesday run and manual runs audit all four maintained npm scopes (desktop runtime, web app, trailer, security parser), even when their lockfiles have not changed. Normal PR/push dependency checks stay scoped to changed manifests. All four scopes block high and critical findings. Registry failures are errors, not clean audit results. MCP workflows and dependencies remain independently maintained.

The NPU model catalog pins full Hugging Face commit IDs, refuses custom tokenizer code, and loads tokenizer files locally after the pinned download. Tokenizers for all three catalog entries were checked with Transformers 5.3.0. Cached files are separated by revision, so stale files from another revision cannot be selected. Existing caches are preserved, but the first run of this update may download a fresh pinned model copy; provision it while online before an offline deployment. The NPU Python environment and local image dependency stack still require hardware-specific compatibility testing; the hashed speech lock does not cover those environments. No GPU/NPU inference or container vulnerability scan is implied by the pin checks.

For the other Python service locks, change the sibling `requirements.in`, then use `pip-compile --generate-hashes --allow-unsafe --output-file <requirements.txt> <requirements.in>` in an isolated environment. Resolve conditional dependencies for all supported Python/platform targets; a lock generated on Python 3.14 can omit packages required on 3.11/3.12. After installing the lock with hash verification, run `python dev-tools/security/check_python_lock_compatibility.py <requirements.txt>` to check installed dependency metadata for Python 3.11–3.14 on Linux/Windows, including transitive extras. This metadata check supplements actual wheel-only installation tests on the supported targets. Audit the resulting lock and run the optional-service tests before merging. Review image digest changes and model commit changes in the same way; never replace a pin with an unreviewed moving reference just to make a check pass. The image service uses the narrower target and CUDA wheel procedure above.

## How It Works

1. **Nginx** serves the React SPA and reverse-proxies API calls:
   - `/api/ollama/*` → Ollama (LLM)
   - `/api/pocketbase/*` → PocketBase (database)
   - `/api/flux/*` → Local image server (SANA-Sprint or Flux)
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

- **SANA-Sprint / Flux**: NVIDIA GPU for this Docker profile. Required VRAM and system RAM depend on the checkpoint, precision, resolution and CPU offload; verify on the target hardware.
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

# Test the local image service (reports the configured backend)
curl http://localhost:7860/health
```

Offline image adapter and security checks (from the repository root, with the
existing Pydantic/Pillow test dependencies; no model or GPU required):

```bash
python -B tests/test_local_image_backends_20261102.py
python -B tests/test_flux_security_20261102.py
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
- **No images**: Check the image service's `/health`, GPU passthrough, configured endpoint/token and exact allowed origin. A 401 indicates a missing/wrong token; 503 can indicate missing server token configuration. Use a separately configured provider if local GPU inference is unavailable.
- **PocketBase auth errors**: Check that `pb_schema.json` migrations are applied
