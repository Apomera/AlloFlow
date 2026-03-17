# GPU Auto-Detection System

**Unified GPU support for all AlloFlow applications (Admin, Client, Homeschool)**

Automatically detects and configures Docker for:
- ✅ NVIDIA GPUs (CUDA)
- ✅ AMD GPUs (ROCm)
- ✅ Apple Silicon (Metal Performance Shaders)
- ✅ CPU-only fallback (automatic)

---

## Overview

The GPU auto-detection system allows users to run AlloFlow with automatic GPU configuration, eliminating manual Docker setup or GPU-specific documentation.

**User experience:**
1. User launches AlloFlow app
2. App detects GPU automatically (runs at startup)
3. If Docker is available, generates `docker-compose.override.yml` automatically
4. Settings UI shows detected GPU type and capabilities
5. One-click Docker setup button (no manual commands needed)

---

## Files

### Core Detection

**`gpu-detection.js`** (450 lines)
- `GPUDetector` class: Detects GPU type and capabilities
- Methods:
  - `detectGPU()` — Returns GPU type, driver, capabilities
  - `detectNVIDIA()` — NVIDIA-specific detection (all platforms)
  - `detectAMD()` — AMD-specific detection (Linux + Windows)
  - `detectAppleSilicon()` — Apple Silicon detection (macOS arm64)
  - `checkDocker()` — Verifies Docker installation
  - `generateEnvFile()` — Creates `.env.gpu` for Docker
  - `getSetupScript()` — Returns shell script with verification commands

**`docker/docker-gpu-setup.js`** (280 lines)
- `DockerGPUSetup` class: Generates Docker configuration files
- Methods:
  - `generateOverride()` — Creates `docker-compose.override.yml`
  - `addNVIDIAConfig()` — NVIDIA-specific Compose config
  - `addAMDConfig()` — AMD-specific Compose config
  - `addAppleSiliconConfig()` — Metal-specific Compose config
  - `generateEnvFile()` — Creates `.env.gpu`
  - `printSummary()` — Prints setup status and next steps

### Docker Compose

**`docker/docker-compose.universal.yml`** (220 lines)
- Base configuration for all GPUs
- Services: PocketBase, Ollama, Flux, Piper, SearXNG
- Uses environment variables for GPU-specific config
- Deploy sections left empty (populated by override)

**`docker/docker-compose-hybrid.yml`** (160 lines)
- Pre-configured for Hybrid tier (local data + cloud AI fallback)
- PocketBase + Ollama (CPU) + SearXNG + Piper
- No Flux (uses cloud fallback)
- References universal base

**`docker/docker-compose-full.yml`** (180 lines)
- Pre-configured for Full Local tier
- All services including Flux (GPU-accelerated)
- GPU-required services explicitly configured

---

## Usage

### For Users (Homeschool Parent or Admin)

**Automatic (Recommended):**
1. Launch AlloFlow app
2. Go to Settings → Server & Sync
3. Click [Docker Setup]
4. App auto-detects GPU and generates files
5. Click [Start Services]
6. Done (Ollama model auto-downloads on first use)

**Manual:**
```bash
# Download and run setup script
cd ~/alloflow
node docker-gpu-setup.js

# This generates:
#   docker-compose.override.yml
#   .env.gpu

# Start services
docker compose -f docker-compose.universal.yml up -d
```

### For Developers (Integration into Apps)

**In Electron main process (admin/main.js, client/main.js, etc.):**

```javascript
const { detectGPU, generateEnvFile } = require('../gpu-detection');

// Detect GPU at app startup
app.on('ready', async () => {
  const gpu = detectGPU();
  
  console.log('GPU Type:', gpu.type);
  console.log('Driver:', gpu.driver);
  console.log('Supported:', gpu.supported);
  
  // Store in app state for UI
  mainWindow.webContents.send('gpu-detected', gpu);
  
  // Generate .env file for Docker
  generateEnvFile('./docker/.env.gpu');
});
```

**In React UI (Settings tab):**

```javascript
import { ipcRenderer } from 'electron';

function DeploymentSettings() {
  const [gpu, setGpu] = useState(null);

  useEffect(() => {
    ipcRenderer.on('gpu-detected', (event, gpuInfo) => {
      setGpu(gpuInfo);
    });
  }, []);

  const handleStartDocker = async () => {
    // Run docker-gpu-setup.js
    ipcRenderer.invoke('docker-setup:start').then(() => {
      // Start docker compose
      ipcRenderer.invoke('docker:start-services');
    });
  };

  return (
    <div className="deployment-settings">
      <h2>Docker Deployment</h2>
      
      {gpu && (
        <>
          <div className="gpu-info">
            <p>Detected GPU: <strong>{gpu.type}</strong></p>
            <p>Driver: <strong>{gpu.driver}</strong></p>
            <p>{gpu.details}</p>
          </div>
          
          <button onClick={handleStartDocker}>
            🚀 Setup Docker ({gpu.type})
          </button>
        </>
      )}
    </div>
  );
}
```

**In IPC handlers (preload.js or main.js):**

```javascript
ipcMain.handle('docker-setup:start', async () => {
  const { DockerGPUSetup } = require('./docker/docker-gpu-setup');
  const setup = new DockerGPUSetup();
  setup.run();  // Generates docker-compose.override.yml + .env.gpu
});

ipcMain.handle('docker:start-services', async () => {
  // Run: docker compose -f docker-compose.universal.yml up -d
  const { execFile } = require('child_process');
  return new Promise((resolve, reject) => {
    execFile('docker', ['compose', '-f', 'docker-compose.universal.yml', 'up', '-d'], {
      cwd: './docker',
    }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
});

ipcMain.handle('docker:status', async () => {
  // Check if services are running
  const { execFile } = require('child_process');
  return new Promise((resolve) => {
    execFile('docker', ['compose', '-f', 'docker-compose.universal.yml', 'ps'], {
      cwd: './docker',
    }, (error, stdout) => {
      if (error) resolve({ running: false });
      else resolve({ running: true, output: stdout });
    });
  });
});
```

---

## CPU vs GPU Auto-Detection Logic

### NVIDIA (Windows, macOS, Linux)
1. Runs `nvidia-smi` command
2. If succeeds → Type: NVIDIA, Driver: cuda
3. Requires: NVIDIA Container Toolkit installed

### AMD (Linux + Windows)
1. **Linux**: Runs `rocm-smi` command
2. **Windows**: Checks WMIC for AMD/Radeon GPUs
3. If succeeds → Type: AMD, Driver: rocm
4. Requires: ROCm Docker support

### Apple Silicon (macOS only)
1. **Condition**: Must be macOS + arm64 architecture
2. **Output**: Type: Apple Silicon, Driver: metal
3. **Ollama**: Auto-uses Metal Performance Shaders (no toolkit needed)
4. **Flux**: Special Metal-optimized Docker image

### CPU Fallback
1. If no GPU detected → Type: CPU, Driver: none
2. Ollama runs on CPU (slower)
3. Flux disabled (too slow on CPU, cloud fallback)
4. All other services work normally

---

## Docker Configuration Generation

### NVIDIA Override
```yaml
services:
  ollama:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all  # Use all GPUs
              capabilities: [gpu]
  flux:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1  # Flux gets 1 GPU
              capabilities: [gpu]
```

### AMD Override
```yaml
services:
  ollama:
    environment:
      - ROCM_VISIBLE_DEVICES=0
    deploy:
      resources:
        reservations:
          devices:
            - driver: rocm
              count: all
              capabilities: [gpu]
  flux:
    environment:
      - ROCM_VISIBLE_DEVICES=0
    deploy:
      resources:
        reservations:
          devices:
            - driver: rocm
              count: 1
              capabilities: [gpu]
```

### Apple Silicon Override
```yaml
services:
  ollama:
    environment:
      - OLLAMA_GPU=1  # Enable Metal
  flux:
    environment:
      - TORCH_DEVICE=mps  # Use Metal Performance Shaders
```

### CPU-Only Override
```yaml
services:
  ollama:
    environment:
      - OLLAMA_GPU=0  # Disable GPU, use CPU
  # Flux service removed (too slow)
```

---

## Environment Variables

### Generated in `.env.gpu`

```bash
# GPU Detection
DOCKER_GPU_SUPPORT=true|false
GPU_DRIVER=nvidia|amd|metal|none
GPU_TYPE=NVIDIA|AMD|Apple Silicon|CPU
GPU_MODEL=RTX 4090|Radeon RX 7900|M3 Pro|etc
GPU_VRAM=24GB|16GB|Unified Memory|etc

# GPU-Specific Variables
CUDA_VISIBLE_DEVICES=            # For NVIDIA
ROCM_VISIBLE_DEVICES=0           # For AMD
OLLAMA_GPU=1|0                   # Enable/disable GPU
TORCH_DEVICE=cuda|rocm|mps|cpu   # PyTorch device

# Ollama Configuration
OLLAMA_ROCM_SUPPORTED=true       # For AMD

# Flux Configuration
FLUX_MODEL=black-forest-labs/FLUX.1-schnell
MAX_IMAGE_SIZE=1024

# SearXNG Configuration
SEARXNG_SECRET_KEY=...           # Auto-generated

# Detection Metadata
DETECTION_TIME=2025-03-17T...
DOCKER_INSTALLED=true|false
DOCKER_VERSION=...
```

---

## Platform-Specific Notes

### Windows
- NVIDIA: Fully supported (nvidia-smi available)
- AMD: Partially supported (WMIC detection, test ROCm)
- Apple Silicon: N/A (Windows doesn't run on M-series)
- PowerShell required for scripts (or WSL alternative)

### macOS
- NVIDIA: Supported (eGPU or rare internal)
- AMD: Not standard (AMD has no native support for Mac)
- Apple Silicon: **Primary** (M1, M2, M3, M4 auto-detected)
- Both Intel and arm64 supported

### Linux
- NVIDIA: Fully supported (most reliable)
- AMD: Fully supported (rocm-smi detection)
- Apple Silicon: N/A (Linux doesn't run natively on M-series)
- Desktop/server GPUs recommended

---

## Fallback Strategy

If GPU service fails or becomes unavailable:

```javascript
// Ollama: Try local, fallback to cloud
async function generateText(prompt) {
  try {
    return await localOllama.generate(prompt);
  } catch {
    console.warn('Local Ollama unavailable, using CloudGPT');
    return await cloudGPT.generate(prompt);
  }
}

// Flux: Try local, fallback to cloud
async function generateImage(prompt) {
  try {
    return await localFlux.generate(prompt);
  } catch {
    console.warn('Local Flux unavailable, using Gemini');
    return await gemini.generate(prompt);
  }
}
```

This ensures app never breaks due to Docker/GPU failures.

---

## Testing GPU Detection

### Command Line
```bash
node gpu-detection.js
# Output: JSON with detected GPU info
```

### In App
```javascript
const detector = new GPUDetector();
const gpu = detector.detectGPU();
console.log(gpu);

// Expected output (example):
{
  type: 'NVIDIA',
  driver: 'cuda',
  model: 'NVIDIA RTX 4090',
  vram: '24GB',
  supported: true,
  details: 'NVIDIA GPU detected: NVIDIA RTX 4090 (24GB VRAM)...',
  dockerConfig: { ... }
}
```

---

## Troubleshooting

### GPU Not Detected on NVIDIA System
```bash
# Check if nvidia-smi works
nvidia-smi

# Verify NVIDIA Container Toolkit
docker run --rm --gpus all ubuntu nvidia-smi
```

### GPU Not Detected on AMD System (Linux)
```bash
# Check if rocm-smi works
rocm-smi

# Check Docker support
docker run --rm --device=/dev/kfd rocm/rocm rocm-smi
```

### Apple Silicon Not Using Metal
```bash
# Check if Ollama is using Metal
docker logs alloflow-ollama | grep -i metal

# Should see: "Metal is available..."
```

### Docker Services Not Starting
```bash
# Check if docker compose works
docker compose ps

# View errors
docker logs alloflow-ollama
docker logs alloflow-flux

# Rebuild overrides
node docker-gpu-setup.js
```

---

## Future Enhancements

- [ ] Intel Arc GPU support (Xe-HPG detection)
- [ ] Gaudi accelerator support
- [ ] Multi-GPU load balancing (split Flux and Ollama across GPUs)
- [ ] GPU memory monitoring and adaptive model selection
- [ ] VRAM-aware model auto-selection (use FLUX.1-dev on 24GB, schnell on 8GB)
- [ ] WASM fallback for unsupported GPU architectures

---

## Files Reference

| File | Purpose | Size | Used By |
|------|---------|------|---------|
| `gpu-detection.js` | Core GPU detection | 450L | All apps |
| `docker/docker-gpu-setup.js` | Docker config generation | 280L | Setup script |
| `docker/docker-compose.universal.yml` | Base Docker config | 220L | docker-gpu-setup.js |
| `docker/docker-compose-hybrid.yml` | Hybrid tier reference | 160L | Users (alternative) |
| `docker/docker-compose-full.yml` | Full Local tier reference | 180L | Users (alternative) |

---

**Status**: Production-ready for Phase 3d (Production Build & Deployment)
