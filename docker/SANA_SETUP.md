# SANA-Sprint: setup and first-image test

**Current status: Desktop service controls, a private app image connection and a
standalone studio are implemented in source; packaged activation and real
GPU/container verification are still pending.** The server defaults
to SANA-Sprint. Its automated checks use synthetic responses/model calls. The
container has not been built or run for this change, no model has been downloaded,
and GPU memory use, output quality and the released app have not been verified.

After an operator completes steps 1–3, a user can open the browser studio,
enter the server token, generate or edit an image, and save a PNG using step 4.
There is no command-line image request to learn. This standalone page does not
replace your existing AlloFlow text/AI connection or activate the main-app
integration described in step 5.

## Desktop service controls

In the native AlloFlow Desktop command center, open **AI**, then
**Local Images (SANA-Sprint)**:

1. Choose SANA-Sprint 0.6B or 1.6B and review the linked model and text-encoder terms.
2. Accept the terms and select **Prepare**. Desktop saves a private image-service
   connection in its own data folder; existing text-provider settings stay intact.
3. Resolve the displayed Docker, NVIDIA and disk checks, then select **Install**.
   This explicitly downloads the runtime and verifies the pinned model files.
4. Select **Start**, then **Refresh** to check loading. Normal starts use installed
   files only. **Stop** keeps them; **Repair** explicitly repairs the installation.
5. With the updated app open and SANA ready, enable **Use SANA in this app session**.
   This switch starts off and resets when the app reloads. Older app builds show
   an update-needed message and keep it unavailable.
6. Use AlloFlow's existing image-generation or image-editing controls. The private
   service token stays in Desktop; there is no token to copy into app settings.
   Start with a simple 512-pixel test image and inspect the result.

The buttons require the native Desktop launch and its protected command-center
session. A development browser with no launch token cannot install or start models.
Opening the panel performs checks only. Neither model downloads nor Docker/NVIDIA
setup happens automatically. The controls use local Linux x86_64 Docker containers
and the loopback image port 7860; they refuse to take over another installation.

These controls and the app connection are new source code, not a newly released
installer. Both sides of the updated app bridge must be included together before
the session switch can be used. Source/mock tests do not activate older bundles.
The private managed token is not exposed to the browser, so the standalone studio
instructions below describe a separately operator-configured installation. Do not
start both installations on the same port. A successful status check is not a real
image-generation test or a supported GPU-memory guarantee.

Turning the session switch off prevents new requests and discards pending results.
The GPU may still finish a cancelled request. Wait for it to finish, or select
**Stop** to stop the owned image service. If Desktop reports that completion could
not be confirmed, Stop is required before retrying. The app does not retry or fall
back to cloud images.
Student restrictions and image-disable settings remain effective.

## 1. Check the computer

Use a computer with an NVIDIA GPU and a working Docker Compose installation.
The current package targets Linux x86_64 containers, CPython 3.12 and CUDA 12.6.
For Windows, Docker Desktop must use its WSL 2 backend, with a current WSL kernel
and NVIDIA driver that supports WSL GPU access. On Linux, configure Docker GPU
access with NVIDIA Container Toolkit. This CUDA Docker profile does not provide
an Apple GPU or Windows NPU installation path.

See [Docker's Windows GPU prerequisites](https://docs.docker.com/desktop/features/gpu/)
and [Compose GPU configuration](https://docs.docker.com/compose/how-tos/gpu-support/).
Memory requirements depend on model size, precision and resolution; the offline
checks do not establish a minimum VRAM/RAM requirement for this installation.

The first build downloads Python dependencies; the explicit install command below
downloads and verifies model weights in the existing `flux_models` Docker volume.
Normal startup uses the cache only. Allow time, disk space
and an internet connection. Review the [checkpoint's license and Gemma text-encoder terms](https://huggingface.co/Efficient-Large-Model/Sana_Sprint_1.6B_1024px_diffusers)
before provisioning. None of these downloads has happened automatically as part
of the source change.

## 2. Configure the image server

The examples below use **PowerShell**, starting in the repository root. Keep an
existing `.env`; create it from the example only if it does not already exist:

```powershell
Set-Location .\docker
if (-not (Test-Path -LiteralPath .env)) { Copy-Item .env.example .env }
notepad .env
```

Set these values in `docker/.env`. Replace the token placeholder with a distinct,
random password-manager-generated token of at least 32 ASCII characters:

```dotenv
IMAGE_BACKEND=sana-sprint
IMAGE_MODEL=
IMAGE_MODEL_REVISION=
ALLOFLOW_IMAGE_OFFLINE=1
ALLOFLOW_BIND_ADDRESS=127.0.0.1
FLUX_PORT=7860
ALLOFLOW_FLUX_API_TOKEN=REPLACE_WITH_YOUR_PRIVATE_RANDOM_TOKEN
ALLOFLOW_FLUX_ALLOWED_ORIGINS=http://localhost:7860,http://localhost:3000
```

Leaving `IMAGE_MODEL` empty selects SANA-Sprint 1.6B. For the smaller checkpoint,
set `IMAGE_MODEL=Efficient-Large-Model/Sana_Sprint_0.6B_1024px_diffusers` instead.
The `FLUX` names in the token, port, service and cache are retained for compatibility;
they do not mean the selected model is Flux.

Both SANA choices use the exact reviewed revision in `flux-server/model-manifest.json`.
Leave `IMAGE_MODEL_REVISION` empty for those pins. A custom checkpoint needs its
full 40-character commit ID and separate operator provisioning. The SANA 1.6B
files total about 9.1 GiB and the 0.6B files about 7.2 GiB; reserve additional
Docker/dependency space and at least 2 GiB of model-cache working space. These
numbers do not establish a supported RAM/VRAM minimum.

The origin value must match the browser application's origin exactly, including
scheme and port, with no trailing slash. The command-line test below does not
send an Origin header, so it can run without a browser origin configured. Origin
configuration alone does not connect AlloFlow's main app to SANA. If you change
`FLUX_PORT`, use that port in the studio URL and allowlist too. Opening
`http://127.0.0.1:7860` instead of `http://localhost:7860` also requires its own
exact allowlist entry. Keep the private token out
of website build variables and do not reuse a cloud-provider API key.

## 3. Install the model, then start only the image service

From the same `docker` directory:

```powershell
docker compose --profile gpu build flux
docker compose --profile gpu run --pull never --rm --no-deps --entrypoint python3 flux model_manifest.py --download
docker compose --profile gpu up -d --no-deps --no-build --pull never flux
docker compose logs --tail 100 flux
Invoke-RestMethod -Uri http://localhost:7860/health
```

These commands build the image runtime, explicitly download/verify the pinned
model, and start only the image service. They do not start or rebuild the frontend,
database, text AI, speech or search services. Stop if installation or verification
fails; do not continue to Start. Wait for model loading to finish, then repeat
the health check. A healthy
response should report:

```json
{
  "status": "ok",
  "model": "Efficient-Large-Model/Sana_Sprint_1.6B_1024px_diffusers",
  "backend": "sana-sprint",
  "device": "cuda",
  "txt2img": true,
  "img2img": true
}
```

The model name differs if you selected 0.6B. `device: "cpu"` means the expected
GPU route is unavailable; investigate passthrough before relying on performance.
A successful health check confirms startup only: it does not verify the token
or demonstrate that generation fits in GPU memory.

The health response also includes the exact `revision` and `offline` setting.
For later starts, require the installed runtime and verify cached files without
network access. This avoids Compose rebuilding a missing runtime during a `run`:

```powershell
$sanaConfig = docker compose --profile gpu config --format json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $sanaConfig.name) { throw 'Cannot read image stack configuration.' }
$sanaProject = $sanaConfig.name
$sanaImage = docker image inspect ($sanaProject + '-flux') --format '{{.Id}}'
if ($LASTEXITCODE -ne 0 -or $sanaImage -notmatch '^sha256:[a-f0-9]{64}$') { throw 'Image runtime is missing. Complete Install first.' }
docker run --pull never --rm --network none --env-file .env --env HF_HOME=/models --volume ($sanaProject + '_flux_models:/models:ro') --entrypoint python3 $sanaImage model_manifest.py
if ($LASTEXITCODE -ne 0) { throw 'Model verification failed. Complete Repair before starting.' }
docker compose --profile gpu up -d --no-deps --no-build --pull never flux
```

If verification fails, explicitly rerun the install command with `--download` to
repair that pinned snapshot. A normal start will not fetch missing model files.
Keep previous revisions until the new version passes a real image test; changes
to environment selections can then return to a separately verified earlier pin.

## 4. Generate and open a test image

Open **http://localhost:7860** in a browser on the computer running the server.

1. Paste the private **Local image token** supplied during setup.
2. Choose an example prompt, or describe your image in your own words.
3. Keep **512 × 512** and **Balanced · 2 steps** for your first attempt.
4. Select **Generate image**, then review the preview and choose **Save PNG**.
5. To edit a picture, select a PNG, JPEG or WebP under **Start from a picture**,
   describe the changes, and select **Edit image**. Use **Remove** to return to
   making a new image.

The token is not saved to browser storage or placed in the URL. **Forget** clears
it; leaving or reloading the page clears it too. **Cancel** stops the browser
request, but the server may still need to finish its current GPU operation.
The page explains authentication, origin, busy-server and input errors. Its
setup help displays the exact browser origin to allow if a 403 occurs.

Saving produces a normal PNG file. Images are not automatically inserted into
AlloFlow's main app. A successful image here is an actual test on that computer;
the source-level automated checks alone are not proof of GPU compatibility.

### Optional command-line test

For diagnostics, run this PowerShell example on the same computer. When
prompted, enter the token from `.env`; it is entered as a hidden password rather
than written into the command history. Use a fictional test prompt first.

```powershell
$sanaCredential = [pscredential]::new('local-image', (Read-Host 'Local image token' -AsSecureString))
$sanaHeaders = @{ Authorization = 'Bearer ' + $sanaCredential.GetNetworkCredential().Password }
$sanaBody = @{
    model = 'sana-sprint'
    prompt = 'A watercolor illustration of a red kite flying over green hills'
    size = '512x512'
    n = 1
    num_inference_steps = 2
    response_format = 'b64_json'
} | ConvertTo-Json

try {
    $sanaResult = Invoke-RestMethod -Method Post -Uri http://localhost:7860/v1/images/generations -Headers $sanaHeaders -ContentType 'application/json' -Body $sanaBody -TimeoutSec 300
    $sanaOutput = Join-Path (Get-Location) ('sana-test-' + [guid]::NewGuid().ToString('N') + '.png')
    [System.IO.File]::WriteAllBytes($sanaOutput, [Convert]::FromBase64String($sanaResult.data[0].b64_json))
    Write-Output "Saved image: $sanaOutput"
} finally {
    $sanaHeaders.Clear()
    $sanaCredential.Password.Dispose()
    Remove-Variable sanaCredential, sanaHeaders
}
```

Open the printed PNG path and inspect the result. A successful request plus a
usable image establishes a first generation test on that computer; editing,
sustained use and integration still need their own checks. The API accepts
1–4 inference steps for SANA-Sprint and rounds dimensions down to multiples of
32, within 64–1024 pixels. Start with 512×512 and two steps.

## 5. Understand the current AlloFlow integration limit

**Desktop's managed connection uses the session switch above.** Requests travel
through the exact current app frame to the protected native process. Only bounded
image generation/editing is allowed; app content receives neither the image token
nor the administrator launch credential. An old app build cannot enable this path.

The separately operator-configured studio remains useful outside Desktop. Earlier
dedicated manual-image settings are prepared as source candidates, but their
activation is separate from the native connection. The legacy **FLUX (Local —
port 7860)** option does not supply the secured server's independent credentials.

Do not point the main **Custom Endpoint** at port 7860 to work around this:
SANA serves images, not chat, speech or `/v1/models`. It would redirect other
AI operations to an endpoint that does not support them. A separate client that
supports an independent image URL and bearer token may use this API, but that
does not establish AlloFlow integration.

Before calling this ready for ordinary app users, complete a real container build
and GPU generation/editing test, then the appropriate reviewed app activation and
release process. The earlier excluded packaged/host activation remains untouched;
these changes have not been included in a newly built or published app.

## Common problems

| Symptom | What to check |
| --- | --- |
| Service fails to build or import | Inspect `docker compose logs --tail 100 flux` and the build output. The declared dependency versions still need a real container build test. |
| GPU/device-driver error | Check NVIDIA drivers and Docker GPU passthrough using the official instructions in step 1. |
| Connection refused while starting | The model may still be downloading/loading, or startup failed. Read the service logs and retry health after startup. |
| Download access/terms error | Check the checkpoint's access requirements and network connectivity. Do not substitute an unrelated API key. |
| `401` on generation | Enter the same private token configured in the running service. |
| `503` despite healthy startup | Check that the server token is at least 32 bytes and was loaded when the container started. |
| `403` from a browser | Check the exact origin allowlist. The direct PowerShell test and browser access are separate checks. |
| `422` | Check the request size, 1–4 step count and other fields; use the example unchanged first. |
| `429` | A generation is busy or the rate/intake limit was reached; wait before retrying. |
| `500`, out-of-memory, or unusable image | Read the local logs. Try the 0.6B model and a smaller request such as 256×256; restart after changing model settings. BF16-unavailable hardware uses FP32, which needs more memory. |
| Health and the test image work, but AlloFlow does not | See step 5; server readiness does not imply completed app integration. |

After editing `.env`, rerun `docker compose --profile gpu up -d --no-deps --no-build --pull never flux` to apply
the environment change. To stop only the image service, run
`docker compose --profile gpu stop flux`. Keep its model volume to avoid repeating
the download. The loopback setup above is for one computer; using it from other
classroom devices requires a separately configured, protected network route.
