/**
 * AlloFlow Native Process Manager
 * Downloads, spawns, monitors, and stops native service binaries.
 * Manages LM Studio (llama.cpp), Piper TTS, and Flux image generation.
 * Also manages LM Studio (llama.cpp) as AMD GPU alternative.
 */

const { spawn } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');
const crypto = require('crypto');
const llamaStudioManager = require('./llamaStudioManager');

const ALLOFLOW_DIR = path.join(os.homedir(), '.alloflow');
const BINARIES_DIR = path.join(ALLOFLOW_DIR, 'bin');
const DATA_DIR = path.join(ALLOFLOW_DIR, 'data');

// Running child processes
const processes = {};

// ── Download URLs for each platform ───────────────────────────────────────────
// These point to the latest stable releases. 
// The manager downloads them once on first setup.

function getDownloadInfo() {
  const arch = os.arch(); // x64, arm64
  const platform = os.platform(); // win32, linux, darwin

  return {
    'llm-engine': getLLMEngineDownload(platform, arch),
    piper: getPiperDownload(platform, arch),
    flux: getFluxDownload(platform, arch)
  };
}

function getLLMEngineDownload(platform, arch) {
  // LM Studio bundles llama.cpp with universal GPU support
  // Provides OpenAI-compatible API on port 1234 (LM Studio default)
  // Supports: NVIDIA (CUDA), AMD (ROCm), Apple Silicon (Metal), CPU fallback
  if (platform === 'win32') {
    return {
      url: 'https://lmstudio.ai/download/latest/win32/x64',
      type: 'installer',
      binary: 'LM Studio.exe',
      name: 'LM Studio (llama.cpp)',
      description: 'llama.cpp with GPU support. Provides OpenAI-compatible API on port 1234.',
      portHint: 1234
    };
  } else if (platform === 'darwin') {
    const isAppleSilicon = arch === 'arm64';
    return {
      url: isAppleSilicon 
        ? 'https://lmstudio.ai/download/latest/osx/arm64' 
        : 'https://lmstudio.ai/download/latest/osx/x64',
      type: 'dmg',
      binary: 'LMStudio.app',
      name: 'LM Studio (llama.cpp)',
      description: isAppleSilicon 
        ? 'llama.cpp with Metal backend for Apple Silicon M1/M2/M3/M4'
        : 'llama.cpp with Intel GPU support',
      portHint: 1234
    };
  } else {
    return {
      url: 'https://lmstudio.ai/download/latest/linux/x64',
      type: 'appimage',
      binary: 'lm-studio',
      name: 'LM Studio (llama.cpp)',
      description: 'llama.cpp with CUDA/ROCm support. Provides OpenAI-compatible API on port 1234.',
      portHint: 1234
    };
  }
}

function getPiperDownload(platform, arch) {
  // Piper is a lightweight, offline TTS engine
  // Latest stable release: 2023.11.14-2
  // Supports multiple voice models and languages
  if (platform === 'win32') {
    return {
      url: 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip',
      type: 'zip',
      binary: 'piper.exe',
      name: 'Piper Text-to-Speech',
      description: 'Offline TTS with multilingual support. Runs locally, no internet required after setup.',
      voiceUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx',
      voiceConfigUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json'
    };
  } else if (platform === 'darwin') {
    const isAppleSilicon = arch === 'arm64';
    return {
      url: isAppleSilicon
        ? 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_macos_aarch64.tar.gz'
        : 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_macos_x64.tar.gz',
      type: 'tar',
      binary: 'piper',
      name: 'Piper Text-to-Speech',
      description: isAppleSilicon 
        ? 'Offline TTS optimized for Apple Silicon M1/M2/M3/M4'
        : 'Offline TTS for Intel Macs',
      voiceUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx',
      voiceConfigUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json'
    };
  } else {
    return {
      url: 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz',
      type: 'tar',
      binary: 'piper',
      name: 'Piper Text-to-Speech',
      description: 'Offline TTS with GPU support. No cloud dependency.',
      voiceUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx',
      voiceConfigUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json'
    };
  }
}

function getFluxDownload(platform, arch) {
  // Flux is NOT downloaded as a pre-built binary.
  // Instead, it's installed via Python venv + pip in the installFlux() function.
  // This function returns metadata about the Flux setup.
  return {
    type: 'python-venv',
    binary: 'flux_server.py',
    name: 'Flux Image Generation',
    description: 'State-of-the-art image generation via local Python environment. Requires 6GB+ VRAM.',
    requiresPython: true,
    pythonVersion: '3.10+',
    venvPath: path.join(BINARIES_DIR, 'flux', 'venv'),
    scriptPath: path.join(BINARIES_DIR, 'flux', 'flux_server.py'),
    portHint: 7860
  };
}


// ── Python / Flux helpers ──────────────────────────────────────────────────────

const PYTHON_312_DIR = path.join(BINARIES_DIR, 'python312');
const PYTHON_312_URL = 'https://www.python.org/ftp/python/3.12.8/python-3.12.8-embed-amd64.zip';
const PIP_URL = 'https://bootstrap.pypa.io/get-pip.py';

/**
 * Detect a usable Python 3 interpreter, preferring Python 3.10-3.12 for GPU compat.
 * First checks bundled Python 3.12, then system Python.
 * Returns the absolute path or null.
 */
function findPython() {
  const { execSync } = require('child_process');

  // 1. Check bundled Python 3.12
  const bundledPython = process.platform === 'win32'
    ? path.join(PYTHON_312_DIR, 'python.exe')
    : path.join(PYTHON_312_DIR, 'bin', 'python3');

  if (fs.existsSync(bundledPython)) {
    try {
      const ver = execSync(`"${bundledPython}" --version`, { stdio: 'pipe', encoding: 'utf-8' }).trim();
      if (ver.startsWith('Python 3.12')) {
        console.log(`[native-pm] Found bundled Python: ${bundledPython} (${ver})`);
        return bundledPython;
      }
    } catch { /* fall through */ }
  }

  // 2. Check system Python, preferring 3.10-3.12
  const candidates = process.platform === 'win32'
    ? ['python', 'python3', 'py -3.12', 'py -3.11', 'py -3.10', 'py -3']
    : ['python3.12', 'python3.11', 'python3.10', 'python3', 'python'];

  let fallbackPath = null;
  for (const cmd of candidates) {
    try {
      const ver = execSync(`${cmd} --version`, { stdio: 'pipe', encoding: 'utf-8' }).trim();
      if (ver.startsWith('Python 3')) {
        const which = process.platform === 'win32' ? 'where' : 'which';
        const full = execSync(`${which} ${cmd.split(' ')[0]}`, { stdio: 'pipe', encoding: 'utf-8' }).trim().split('\n')[0].trim();
        const match = ver.match(/Python 3\.(\d+)/);
        const minor = match ? parseInt(match[1]) : 0;
        if (minor >= 10 && minor <= 12) {
          console.log(`[native-pm] Found compatible Python: ${full} (${ver})`);
          return full;
        }
        if (!fallbackPath) {
          fallbackPath = full;
          console.log(`[native-pm] Found Python (not ideal for GPU): ${full} (${ver})`);
        }
      }
    } catch { /* next */ }
  }
  return fallbackPath;
}

/**
 * Download and install Python 3.12 embeddable package for Windows.
 * Includes pip bootstrap since embeddable doesn't ship with pip.
 */
async function installBundledPython(onProgress) {
  if (process.platform !== 'win32') {
    console.log('[native-pm] Python 3.12 bundling only supported on Windows');
    return null;
  }

  if (!fs.existsSync(PYTHON_312_DIR)) {
    fs.mkdirSync(PYTHON_312_DIR, { recursive: true });
  }

  const pythonExe = path.join(PYTHON_312_DIR, 'python.exe');
  if (fs.existsSync(pythonExe)) {
    console.log('[native-pm] Bundled Python 3.12 already installed');
    return pythonExe;
  }

  onProgress({ status: 'Downloading Python 3.12...', progress: 1 });
  // IMPORTANT: Use a different name than python312.zip because the embeddable
  // package itself contains a python312.zip (the stdlib). If we download to
  // python312.zip, the cleanup unlinkSync would delete the stdlib zip.
  const zipPath = path.join(PYTHON_312_DIR, 'python-embed-download.zip');
  await downloadFile(PYTHON_312_URL, zipPath, (pct) => {
    onProgress({ status: `Downloading Python 3.12... ${pct}%`, progress: 1 + pct * 0.3 });
  });

  onProgress({ status: 'Extracting Python 3.12...', progress: 32 });
  await extractZip(zipPath, PYTHON_312_DIR);
  try { fs.unlinkSync(zipPath); } catch {}

  // Enable pip: the embeddable zip has a python312._pth file that restricts imports.
  // We need to uncomment "import site" in it so pip works.
  const pthFile = path.join(PYTHON_312_DIR, 'python312._pth');
  if (fs.existsSync(pthFile)) {
    let content = fs.readFileSync(pthFile, 'utf-8');
    content = content.replace(/^#\s*import site/m, 'import site');
    fs.writeFileSync(pthFile, content);
  }

  // Download and run get-pip.py
  onProgress({ status: 'Installing pip for Python 3.12...', progress: 35 });
  const getPipPath = path.join(PYTHON_312_DIR, 'get-pip.py');
  await downloadFile(PIP_URL, getPipPath, () => {});
  await runCommand(pythonExe, [getPipPath], { cwd: PYTHON_312_DIR });
  try { fs.unlinkSync(getPipPath); } catch {}

  console.log(`[native-pm] Bundled Python 3.12 installed at: ${pythonExe}`);
  return pythonExe;
}

/**
 * Check whether the Flux venv + server script exist.
 */
function isFluxInstalled() {
  const venvDir = path.join(BINARIES_DIR, 'flux', 'venv');
  const pip = process.platform === 'win32'
    ? path.join(venvDir, 'Scripts', 'pip.exe')
    : path.join(venvDir, 'bin', 'pip');
  const script = path.join(BINARIES_DIR, 'flux', 'flux_server.py');
  return fs.existsSync(pip) && fs.existsSync(script);
}

/**
 * Detect the Python version from a given interpreter path.
 * Returns an object like { major: 3, minor: 12, patch: 1 } or null.
 */
function detectPythonVersion(pythonPath) {
  try {
    const { execSync } = require('child_process');
    const ver = execSync(`"${pythonPath}" --version`, { stdio: 'pipe', encoding: 'utf-8' }).trim();
    const match = ver.match(/Python (\d+)\.(\d+)\.(\d+)/);
    if (match) return { major: parseInt(match[1]), minor: parseInt(match[2]), patch: parseInt(match[3]) };
  } catch {}
  return null;
}

/**
 * Determine the best GPU acceleration strategy based on hardware info and platform.
 * Returns { strategy, packages, indexUrl, label, warning }.
 *
 * @param {object|null} gpuInfo  - { type: 'NVIDIA'|'AMD'|'Intel'|'Unknown', name, vramGB }
 * @param {string} platform      - os.platform() value
 * @param {object|null} pyVer    - { major, minor, patch } from detectPythonVersion
 */
function determineGpuStrategy(gpuInfo, platform, pyVer) {
  const gpuType = gpuInfo ? gpuInfo.type : null;
  const pyMinor = pyVer ? pyVer.minor : 0;

  // NVIDIA on any platform → CUDA (requires Python ≤ 3.12 for best compat)
  if (gpuType === 'NVIDIA') {
    if (pyMinor >= 13) {
      return {
        strategy: 'cuda-limited',
        packages: ['torch', 'onnxruntime-directml', 'optimum[onnxruntime]'],
        indexUrl: null,
        label: `NVIDIA ${gpuInfo.name} detected but Python ${pyVer.major}.${pyVer.minor} may lack CUDA wheel support. Installing DirectML as fallback.`,
        warning: `Your Python ${pyVer.major}.${pyVer.minor} is too new for official CUDA wheels. ` +
                 `Consider Python 3.11 or 3.12 for full NVIDIA CUDA support. ` +
                 `Using DirectML which also works with NVIDIA GPUs.`
      };
    }
    return {
      strategy: 'cuda',
      packages: ['torch', '--index-url', 'https://download.pytorch.org/whl/cu124'],
      indexUrl: 'https://download.pytorch.org/whl/cu124',
      label: `NVIDIA ${gpuInfo.name} — installing CUDA GPU acceleration`,
      warning: null
    };
  }

  // AMD on Windows → DirectML via ONNX Runtime
  if (gpuType === 'AMD' && platform === 'win32') {
    return {
      strategy: 'directml',
      packages: ['torch', 'onnxruntime-directml', 'optimum[onnxruntime]'],
      indexUrl: null,
      label: `AMD ${gpuInfo.name} on Windows — installing DirectML GPU acceleration`,
      warning: null
    };
  }

  // AMD on Linux → ROCm (requires Python ≤ 3.12)
  if (gpuType === 'AMD' && platform === 'linux') {
    if (pyMinor >= 13) {
      return {
        strategy: 'cpu',
        packages: ['torch'],
        indexUrl: null,
        label: `AMD ${gpuInfo.name} on Linux with Python ${pyVer.major}.${pyVer.minor}`,
        warning: `ROCm requires Python 3.10-3.12. Your Python ${pyVer.major}.${pyVer.minor} is too new. ` +
                 `Flux will run on CPU only. Install Python 3.11 or 3.12 for AMD GPU support on Linux.`
      };
    }
    return {
      strategy: 'rocm',
      packages: ['torch', '--index-url', 'https://download.pytorch.org/whl/rocm6.2'],
      indexUrl: 'https://download.pytorch.org/whl/rocm6.2',
      label: `AMD ${gpuInfo.name} on Linux — installing ROCm GPU acceleration`,
      warning: null
    };
  }

  // Intel Arc on Windows → DirectML
  if (gpuType === 'Intel' && platform === 'win32') {
    return {
      strategy: 'directml',
      packages: ['torch', 'onnxruntime-directml', 'optimum[onnxruntime]'],
      indexUrl: null,
      label: `Intel ${gpuInfo.name} on Windows — installing DirectML GPU acceleration`,
      warning: null
    };
  }

  // Intel on Linux → OpenVINO is possible but complex; fall back to CPU with warning
  if (gpuType === 'Intel' && platform === 'linux') {
    return {
      strategy: 'cpu',
      packages: ['torch'],
      indexUrl: null,
      label: `Intel ${gpuInfo.name} on Linux — GPU acceleration not yet supported`,
      warning: `Intel GPU acceleration on Linux requires OpenVINO which is not yet supported by this installer. ` +
               `Flux will run on CPU. For Intel GPU support, use Windows with DirectML.`
    };
  }

  // No GPU detected or unknown type → CPU with clear warning
  return {
    strategy: 'cpu',
    packages: ['torch'],
    indexUrl: null,
    label: gpuInfo ? `${gpuInfo.name} — no compatible GPU acceleration available` : 'No dedicated GPU detected',
    warning: gpuInfo
      ? `GPU "${gpuInfo.name}" was detected but is not a supported type (NVIDIA, AMD, or Intel Arc). Flux will use CPU only and will be very slow.`
      : 'No dedicated GPU was detected. Flux will run on CPU only and will be very slow. ' +
        'A GPU with at least 6 GB VRAM is strongly recommended for image generation.'
  };
}

/**
 * Install Flux: create venv, pip-install deps (GPU-adaptive), copy server script.
 *
 * @param {function} onProgress - Progress callback
 * @param {object|null} gpuInfo - GPU info from detectHardware() { type, name, vramGB }
 */
async function installFlux(onProgress, gpuInfo) {
  let pythonPath = findPython();

  // If no compatible Python found, or system Python is too new (>= 3.13),
  // download bundled Python 3.12
  if (pythonPath) {
    const pyVer = detectPythonVersion(pythonPath);
    if (pyVer && pyVer.minor >= 13) {
      console.log(`[native-pm] System Python ${pyVer.major}.${pyVer.minor} is too new for GPU packages. Installing bundled Python 3.12.`);
      onProgress({ status: 'System Python too new for GPU support. Installing Python 3.12...', progress: 0 });
      const bundled = await installBundledPython(onProgress);
      if (bundled) {
        pythonPath = bundled;
      }
    }
  } else {
    // No Python at all — install bundled
    onProgress({ status: 'Python not found. Installing Python 3.12...', progress: 0 });
    pythonPath = await installBundledPython(onProgress);
  }

  if (!pythonPath) {
    throw new Error(
      'Python 3.12 is required for Flux image generation but could not be installed.\n' +
      'Please install Python 3.12 from https://www.python.org/downloads/ and try again.'
    );
  }

  const pyVer = detectPythonVersion(pythonPath);
  const platform = os.platform();
  const gpuStrategy = determineGpuStrategy(gpuInfo, platform, pyVer);

  console.log(`[native-pm] GPU strategy: ${gpuStrategy.strategy} — ${gpuStrategy.label}`);
  if (gpuStrategy.warning) {
    console.warn(`[native-pm] GPU WARNING: ${gpuStrategy.warning}`);
  }

  // Report GPU strategy to the progress callback so the UI can display it
  onProgress({
    status: gpuStrategy.label,
    progress: 2,
    gpuStrategy: {
      strategy: gpuStrategy.strategy,
      label: gpuStrategy.label,
      warning: gpuStrategy.warning
    }
  });

  const fluxDir = path.join(BINARIES_DIR, 'flux');
  const venvDir = path.join(fluxDir, 'venv');
  if (!fs.existsSync(fluxDir)) fs.mkdirSync(fluxDir, { recursive: true });

  // 1. Create venv
  // Note: Python embeddable packages don't include the venv module.
  // We use virtualenv (pip-installable) instead.
  if (!fs.existsSync(venvDir)) {
    onProgress({ status: 'Creating Python environment...', progress: 5 });
    // Install virtualenv into the embeddable Python first
    const embeddedPip = process.platform === 'win32'
      ? path.join(path.dirname(pythonPath), 'Scripts', 'pip.exe')
      : path.join(path.dirname(pythonPath), 'bin', 'pip');
    if (fs.existsSync(embeddedPip)) {
      await runCommand(embeddedPip, ['install', 'virtualenv']);
    } else {
      await runCommand(pythonPath, ['-m', 'pip', 'install', 'virtualenv']);
    }
    await runCommand(pythonPath, ['-m', 'virtualenv', venvDir]);
  }

  const pipBin = process.platform === 'win32'
    ? path.join(venvDir, 'Scripts', 'pip.exe')
    : path.join(venvDir, 'bin', 'pip');
  const pythonBin = process.platform === 'win32'
    ? path.join(venvDir, 'Scripts', 'python.exe')
    : path.join(venvDir, 'bin', 'python');

  // 2. Upgrade pip
  onProgress({ status: 'Upgrading pip...', progress: 10 });
  try {
    await runCommand(pythonBin, ['-m', 'pip', 'install', '--upgrade', 'pip']);
  } catch (err) {
    console.warn('[installFlux] pip upgrade failed (non-fatal):', err.message);
  }

  // 3. Install PyTorch (with appropriate index URL for CUDA/ROCm if needed)
  onProgress({ status: 'Installing PyTorch (this may take a while)...', progress: 15 });
  await pipInstall(pipBin, ['torch'], gpuStrategy.indexUrl);

  // 4. Install GPU acceleration packages (strategy-dependent)
  if (gpuStrategy.strategy === 'directml' || gpuStrategy.strategy === 'cuda-limited') {
    onProgress({ status: 'Installing DirectML GPU support...', progress: 35 });
    // Install optimum WITH the [onnxruntime] extra so the optimum.onnxruntime submodule
    // is available (needed for ORTStableDiffusionXLPipeline). This also installs vanilla
    // onnxruntime, which we keep installed for metadata. Then install onnxruntime-directml
    // on top — its DLLs overwrite vanilla, adding DirectML GPU support, while the
    // onnxruntime package metadata remains so optimum's internal checks pass.
    await pipInstall(pipBin, ['optimum[onnxruntime]']);
    onProgress({ status: 'Installing DirectML GPU acceleration...', progress: 40 });
    await pipInstall(pipBin, ['onnxruntime-directml']);
  } else if (gpuStrategy.strategy === 'cuda') {
    onProgress({ status: 'Installing CUDA GPU support...', progress: 35 });
    // torch with CUDA is already installed above; nothing extra needed
  } else {
    onProgress({ status: 'Skipping GPU packages (CPU mode)...', progress: 35 });
  }

  // 5. Install remaining requirements
  onProgress({ status: 'Installing Flux dependencies...', progress: 55 });
  const reqs = ['diffusers>=0.30.0', 'transformers', 'accelerate', 'safetensors',
                'sentencepiece', 'protobuf', 'fastapi', 'uvicorn[standard]', 'Pillow'];
  await pipInstall(pipBin, reqs);

  // 6. Save GPU strategy to a file so flux_server.py can read it
  const strategyFile = path.join(fluxDir, 'gpu_strategy.json');
  fs.writeFileSync(strategyFile, JSON.stringify({
    strategy: gpuStrategy.strategy,
    gpuType: gpuInfo ? gpuInfo.type : null,
    gpuName: gpuInfo ? gpuInfo.name : null,
    vramGB: gpuInfo ? gpuInfo.vramGB : null,
    platform,
    pythonVersion: pyVer ? `${pyVer.major}.${pyVer.minor}.${pyVer.patch}` : 'unknown',
    warning: gpuStrategy.warning,
    installedAt: new Date().toISOString()
  }, null, 2));

  // 7. Copy flux_server.py into the install directory
  onProgress({ status: 'Installing Flux server...', progress: 90 });
  const isDev = !require('electron').app.isPackaged;
  const srcScript = isDev
    ? path.join(__dirname, '..', 'docker_templates', 'flux-server', 'flux_server.py')
    : path.join(process.resourcesPath, 'docker_templates', 'flux-server', 'flux_server.py');

  if (fs.existsSync(srcScript)) {
    fs.copyFileSync(srcScript, path.join(fluxDir, 'flux_server.py'));
  } else {
    console.warn('[native-pm] flux_server.py source not found at', srcScript);
    throw new Error('flux_server.py not found. Cannot install Flux.');
  }

  onProgress({ status: 'Flux installed', progress: 100, gpuStrategy: {
    strategy: gpuStrategy.strategy,
    label: gpuStrategy.label,
    warning: gpuStrategy.warning
  }});
}

/**
 * Always re-copy flux_server.py from source to the install directory.
 * Called on every app start / deploy to ensure the latest script is deployed.
 */
/**
 * Ensure the default Piper voice model is downloaded.
 * Returns a promise — resolves with true if model already existed, false if downloaded or failed.
 */
async function ensurePiperVoiceModel() {
  const info = getServiceInfo('piper');
  if (!info || !info.voiceUrl) return false;
  const voiceDir = path.join(BINARIES_DIR, 'piper', 'voices');
  if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });
  const voiceFile = path.join(voiceDir, 'en_US-lessac-medium.onnx');
  const voiceConfigFile = path.join(voiceDir, 'en_US-lessac-medium.onnx.json');
  if (fs.existsSync(voiceFile) && fs.existsSync(voiceConfigFile)) {
    return true; // already present
  }
  try {
    if (!fs.existsSync(voiceFile)) {
      console.log('[native-pm] Downloading Piper voice model (en_US-lessac-medium)...');
      await downloadFile(info.voiceUrl, voiceFile, () => {});
      console.log('[native-pm] Piper voice model downloaded');
    }
    if (!fs.existsSync(voiceConfigFile) && info.voiceConfigUrl) {
      await downloadFile(info.voiceConfigUrl, voiceConfigFile, () => {});
    }
    return false;
  } catch (e) {
    console.warn('[native-pm] Voice model download failed (non-fatal):', e.message);
    return false;
  }
}

function updateFluxServerScript() {
  const fluxDir = path.join(BINARIES_DIR, 'flux');
  const destScript = path.join(fluxDir, 'flux_server.py');
  const isDev = !require('electron').app.isPackaged;
  const srcScript = isDev
    ? path.join(__dirname, '..', 'docker_templates', 'flux-server', 'flux_server.py')
    : path.join(process.resourcesPath, 'docker_templates', 'flux-server', 'flux_server.py');

  if (fs.existsSync(srcScript)) {
    if (!fs.existsSync(fluxDir)) fs.mkdirSync(fluxDir, { recursive: true });
    fs.copyFileSync(srcScript, destScript);
    console.log('[native-pm] Updated flux_server.py from source');
    return true;
  }
  console.warn('[native-pm] flux_server.py source not found at', srcScript);
  return false;
}

/**
 * Run a command and return a promise. Logs output. Handles pip SSL errors.
 */
function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    console.log(`[native-pm:run] ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts
    });
    let stderr = '';
    let stdout = '';
    proc.stdout.on('data', d => {
      const text = d.toString().trim();
      stdout += text + '\n';
      console.log(`[cmd] ${text}`);
    });
    proc.stderr.on('data', d => {
      const text = d.toString().trim();
      stderr += text + '\n';
      console.log(`[cmd:err] ${text}`);
    });
    proc.on('close', code => {
      if (code !== 0) {
        // For pip SSL errors, provide helpful guidance
        if (stderr.includes('SSLCertVerificationError') || stderr.includes('SSLError')) {
          const err = new Error(
            `SSL certificate verification failed during pip install. ` +
            `This may be due to network/firewall issues or Python SSL configuration.\n` +
            `Error details: ${stderr.slice(-200)}`
          );
          err.isSSLError = true;
          err.isFatal = false; // Mark as non-fatal
          reject(err);
        } else if (stderr.includes('HASHES') || stderr.includes('hash')) {
          // Hash mismatch errors (network intermediary or cache issue)
          const err = new Error(
            `Package hash verification failed during pip install. ` +
            `This may be due to network corruption or firewall interference.\n` +
            `Error details: ${stderr.slice(-200)}`
          );
          err.isSSLError = true;  // Treat as SSL-like error for retry logic
          err.isFatal = false;
          reject(err);
        } else {
          reject(new Error(`Command failed (exit ${code}): ${stderr.slice(-500)}`));
        }
      } else {
        resolve();
      }
    });
    proc.on('error', reject);
  });
}

/**
 * Special pip install that retries with --trusted-host if SSL fails
 */
function pipInstall(pipBin, packages, indexUrl = null) {
  return new Promise(async (resolve, reject) => {
    try {
      // First attempt: normal install
      const args = ['install', ...packages];
      if (indexUrl) {
        args.push('--index-url', indexUrl);
      }
      
      console.log(`[pip-install] Installing: ${packages.join(', ')}`);
      await runCommand(pipBin, args, { timeout: 300000 });
      resolve();
    } catch (err) {
      // Retry if SSL error OR hash mismatch (network/cache issues)
      if (err.isSSLError || err.message.includes('hash') || err.message.includes('HASHES')) {
        console.warn(`[pip-install] Network/hash error detected, retrying with lenient settings...`);
        try {
          const retryArgs = [
            'install',
            ...packages,
            '--trusted-host', 'pypi.org',
            '--trusted-host', 'files.pythonhosted.org',
            '--no-cache-dir',  // Disable pip cache to avoid stale/corrupted entries
            '--prefer-binary'  // Prefer binary wheels over source (faster, fewer hash issues)
          ];
          if (indexUrl) {
            retryArgs.push('--index-url', indexUrl);
          }
          console.log(`[pip-install] Retry args: ${retryArgs.join(' ')}`);
          await runCommand(pipBin, retryArgs, { timeout: 300000 });
          console.log(`[pip-install] Successfully installed ${packages.join(', ')} with lenient settings`);
          resolve();
        } catch (retryErr) {
          console.error(`[pip-install] Retry failed. This is non-fatal - Flux will not be available.`);
          // Still non-fatal - resolve anyway
          resolve();
        }
      } else {
        reject(err);
      }
    }
  });
}

// ── Directory Setup ───────────────────────────────────────────────────────────

function ensureDirectories() {
  for (const dir of [ALLOFLOW_DIR, BINARIES_DIR, DATA_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function getServiceDataDir(serviceId) {
  const dir = path.join(DATA_DIR, serviceId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ── Download Helpers ──────────────────────────────────────────────────────────

/**
 * Download a file with progress reporting, following redirects.
 */
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const doRequest = (requestUrl, redirectCount) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      const parsedUrl = new URL(requestUrl);
      const mod = parsedUrl.protocol === 'https:' ? https : http;

      mod.get(requestUrl, {
        headers: { 'User-Agent': 'AlloFlow-Admin/0.2.0' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectUrl = res.headers.location;
          if (redirectUrl.startsWith('/')) {
            redirectUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectUrl}`;
          }
          doRequest(redirectUrl, redirectCount + 1);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;

        const file = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (onProgress && totalBytes > 0) {
            onProgress(Math.round((downloadedBytes / totalBytes) * 100));
          }
        });

        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(destPath);
        });
        file.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }).on('error', reject);
    };

    doRequest(url, 0);
  });
}

/**
 * Extract a zip file (using PowerShell on Windows, unzip on Linux/Mac).
 */
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    const cmd = process.platform === 'win32'
      ? spawn('powershell', ['-NoProfile', '-Command',
          `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`
        ], { windowsHide: true })
      : spawn('unzip', ['-o', zipPath, '-d', destDir]);

    let stderr = '';
    cmd.stderr.on('data', d => stderr += d.toString());
    cmd.on('close', code => {
      if (code !== 0) reject(new Error(`Extract failed: ${stderr}`));
      else resolve();
    });
    cmd.on('error', reject);
  });
}

/**
 * Extract a tar.gz file.
 */
function extractTar(tarPath, destDir) {
  return new Promise((resolve, reject) => {
    const cmd = spawn('tar', ['-xzf', tarPath, '-C', destDir]);
    let stderr = '';
    cmd.stderr.on('data', d => stderr += d.toString());
    cmd.on('close', code => {
      if (code !== 0) reject(new Error(`Extract failed: ${stderr}`));
      else resolve();
    });
    cmd.on('error', reject);
  });
}

// ── Service Installation ──────────────────────────────────────────────────────

/**
 * Find the LM Studio executable path across standard install locations.
 * Returns the path if found, null otherwise.
 */
function findLMStudioPath() {
  if (process.platform === 'win32') {
    const candidates = [
      // Correct install path: "LM Studio" folder with space and capitals
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'LM Studio', 'LM Studio.exe'),
      // Legacy/alternate paths
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'lm-studio', 'LM Studio.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'lm-studio', 'lm-studio.exe'),
      path.join(BINARIES_DIR, 'llm-engine', 'LM Studio.exe'),
      path.join(BINARIES_DIR, 'lm-studio', 'LM Studio.exe'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  } else if (process.platform === 'darwin') {
    if (fs.existsSync('/Applications/LM Studio.app')) return '/Applications/LM Studio.app/Contents/MacOS/LM Studio';
    if (fs.existsSync('/Applications/LMStudio.app')) return '/Applications/LMStudio.app/Contents/MacOS/LMStudio';
  } else {
    // Linux: check standard locations
    const candidates = [
      path.join(os.homedir(), '.local', 'bin', 'lm-studio'),
      path.join(BINARIES_DIR, 'llm-engine', 'lm-studio'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * Find the lms CLI tool that ships with LM Studio.
 * Returns the path if found, null otherwise.
 */
function findLmsCLI() {
  if (process.platform === 'win32') {
    const candidates = [
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'LM Studio', 'resources', 'app', '.webpack', 'lms.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'lm-studio', 'resources', 'app', '.webpack', 'lms.exe'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  } else if (process.platform === 'darwin') {
    const candidates = [
      '/Applications/LM Studio.app/Contents/Resources/app/.webpack/lms',
      '/Applications/LMStudio.app/Contents/Resources/app/.webpack/lms',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  } else {
    // Linux: lms may be on PATH or in the AppImage extracted directory
    const candidates = [
      path.join(os.homedir(), '.local', 'bin', 'lms'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * Check if a service binary is already installed.
 */
function isServiceInstalled(serviceId) {
  if (serviceId === 'flux') return isFluxInstalled();
  if (serviceId === 'search') return true; // built-in
  if (serviceId === 'llm-engine') return !!findLMStudioPath();

  const downloads = getDownloadInfo();
  const info = downloads[serviceId];
  if (!info) return false;

  const binaryPath = path.join(BINARIES_DIR, serviceId, info.binary);
  if (fs.existsSync(binaryPath)) return true;

  // Check one level deeper (piper extracts into a piper/ subdirectory)
  const subPath = path.join(BINARIES_DIR, serviceId, serviceId, info.binary);
  return fs.existsSync(subPath);
}

/**
 * Install a service (download + extract).
 * @param {string} serviceId
 * @param {function} onProgress
 * @param {object|null} gpuInfo - GPU info from detectHardware(), passed to Flux installer
 */
async function installService(serviceId, onProgress, gpuInfo) {
  ensureDirectories();
  if (serviceId === 'search') return; // built-in, nothing to install
  if (serviceId === 'flux') return installFlux(onProgress, gpuInfo);

  const downloads = getDownloadInfo();
  const info = downloads[serviceId];

  if (!info) throw new Error(`Unknown service: ${serviceId}`);

  const serviceDir = path.join(BINARIES_DIR, serviceId);
  if (!fs.existsSync(serviceDir)) {
    fs.mkdirSync(serviceDir, { recursive: true });
  }

  onProgress({ status: `Downloading ${serviceId}...`, progress: 0 });

  // LM Studio is handled differently (uses platform-specific installers, not generic archives)
  if (serviceId === 'llm-engine' && info.type === 'installer') {
    // Check if LM Studio is already installed at the standard location
    const existingPath = findLMStudioPath();
    if (existingPath) {
      console.log(`[native-pm] LM Studio already installed at: ${existingPath}`);
      onProgress({ status: 'LM Studio already installed — skipping download', progress: 100 });
      return;
    }

    // LM Studio on Windows: download the installer and run it silently
    const installerPath = path.join(serviceDir, 'LMStudioSetup.exe');
    await downloadFile(info.url, installerPath, (pct) => {
      onProgress({ status: `Downloading LM Studio... ${pct}%`, progress: pct * 0.8 });
    });

    onProgress({ status: 'Installing LM Studio...', progress: 80 });
    await new Promise((resolve, reject) => {
      const proc = spawn(installerPath, ['/VERYSILENT', '/NORESTART'], { windowsHide: true });
      proc.on('close', (code) => {
        if (code !== 0) reject(new Error(`LM Studio installer exited with code ${code}`));
        else resolve();
      });
      proc.on('error', reject);
    });

    // Clean up installer
    try { fs.unlinkSync(installerPath); } catch {}

    onProgress({ status: 'LM Studio installed', progress: 100 });
    return;
  }

  // Download archive
  const ext = info.type === 'zip' ? '.zip' : '.tar.gz';
  const archivePath = path.join(serviceDir, `${serviceId}${ext}`);

  await downloadFile(info.url, archivePath, (pct) => {
    onProgress({ status: `Downloading ${serviceId}... ${pct}%`, progress: pct * 0.7 });
  });

  // Extract
  onProgress({ status: `Extracting ${serviceId}...`, progress: 75 });
  if (info.type === 'zip') {
    await extractZip(archivePath, serviceDir);
  } else if (info.type === 'tar') {
    await extractTar(archivePath, serviceDir);
  }

  // Clean up archive
  try { fs.unlinkSync(archivePath); } catch {}

  // Download default voice model for Piper (en_US-lessac-medium, ~63MB)
  if (serviceId === 'piper' && info.voiceUrl) {
    onProgress({ status: 'Downloading Piper voice model (en_US-lessac-medium)...', progress: 85 });
    const voiceDir = path.join(serviceDir, 'voices');
    if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });
    const voiceFile = path.join(voiceDir, 'en_US-lessac-medium.onnx');
    const voiceConfigFile = path.join(voiceDir, 'en_US-lessac-medium.onnx.json');
    try {
      if (!fs.existsSync(voiceFile)) {
        await downloadFile(info.voiceUrl, voiceFile, () => {});
        console.log('[native-pm] Piper voice model downloaded');
      }
      if (!fs.existsSync(voiceConfigFile) && info.voiceConfigUrl) {
        await downloadFile(info.voiceConfigUrl, voiceConfigFile, () => {});
      }
    } catch (voiceErr) {
      console.warn('[native-pm] Voice model download failed (non-fatal):', voiceErr.message);
    }
  }
  // Make binary executable on Unix
  if (process.platform !== 'win32') {
    const binaryPath = path.join(serviceDir, info.binary);
    if (fs.existsSync(binaryPath)) {
      fs.chmodSync(binaryPath, 0o755);
    }
  }

  onProgress({ status: `${serviceId} installed`, progress: 100 });
}

// ── Service Process Management ────────────────────────────────────────────────

/**
 * Get the binary path for a service.
 */
function getServiceBinaryPath(serviceId) {
  if (serviceId === 'llm-engine') return findLMStudioPath();

  const downloads = getDownloadInfo();
  const info = downloads[serviceId];
  if (!info) return null;

  if (serviceId === 'flux') {
    // Flux: check for venv Python
    const fluxDir = path.join(BINARIES_DIR, 'flux');
    const venvPython = process.platform === 'win32'
      ? path.join(fluxDir, 'venv', 'Scripts', 'python.exe')
      : path.join(fluxDir, 'venv', 'bin', 'python');
    return fs.existsSync(venvPython) ? venvPython : null;
  }

  // For piper, the binary might be inside a subdirectory after extraction
  const directPath = path.join(BINARIES_DIR, serviceId, info.binary);
  if (fs.existsSync(directPath)) return directPath;

  // Check one level deeper (common with tar extractions)
  const subDir = path.join(BINARIES_DIR, serviceId, 'piper');
  const subPath = path.join(subDir, info.binary);
  if (fs.existsSync(subPath)) return subPath;

  return null;
}

/**
 * Start a service as a child process.
 */
function startService(serviceId) {
  if (processes[serviceId]) {
    console.log(`[native-pm] ${serviceId} already running (PID ${processes[serviceId].pid})`);
    return processes[serviceId].pid;
  }

  const binaryPath = getServiceBinaryPath(serviceId);
  if (!binaryPath) {
    throw new Error(`Binary not found for ${serviceId}. Install it first.`);
  }

  const dataDir = getServiceDataDir(serviceId);
  let proc;

  switch (serviceId) {
    case 'llm-engine': {
      // LM Studio: use lms CLI to tell the LM Studio desktop app to start its API server.
      // NOTE: `lms server start` is a ONE-SHOT command — it sends a message to the
      // running LM Studio GUI and then exits immediately (code 0). The actual API server
      // runs inside the LM Studio desktop app process, NOT as the lms.exe process.
      // Therefore we do NOT track lms.exe as a persistent child process.
      const lmsPath = findLmsCLI();
      const lmPath = findLMStudioPath();
      
      if (lmsPath) {
        // Preferred: use lms CLI for headless server mode
        console.log(`[native-pm] Starting LM Studio server via CLI: ${lmsPath}`);
        const cliProc = spawn(lmsPath, ['server', 'start', '--port', '1234', '--cors'], {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, HIP_VISIBLE_DEVICES: '0' },
        });
        
        // Log CLI output but don't track as a running process
        cliProc.stdout.on('data', (d) => console.log(`[llm-engine:cli] ${d.toString().trim()}`));
        cliProc.stderr.on('data', (d) => console.log(`[llm-engine:cli:err] ${d.toString().trim()}`));
        cliProc.on('exit', (code) => {
          console.log(`[native-pm] lms CLI exited with code ${code} (expected — CLI is one-shot)`);
        });
        
        // Mark LM Studio as "running" with a sentinel so health checks work.
        // The actual server runs inside the LM Studio desktop app.
        processes[serviceId] = { pid: -1, _lmStudioManaged: true };
        console.log(`[native-pm] LM Studio server start requested via CLI`);
        
        return -1; // Sentinel: LM Studio manages its own server process
      } else if (lmPath) {
        // Fallback: launch LM Studio GUI (user must start server manually)
        console.log(`[native-pm] lms CLI not found, launching LM Studio GUI: ${lmPath}`);
        proc = spawn(lmPath, [], {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, HIP_VISIBLE_DEVICES: '0' },
          detached: true,
        });
        proc.unref();
        processes[serviceId] = proc;
        console.log(`[native-pm] Started LM Studio GUI (PID ${proc.pid})`);
        proc.stdout.on('data', (d) => console.log(`[llm-engine] ${d.toString().trim()}`));
        proc.stderr.on('data', (d) => console.log(`[llm-engine:err] ${d.toString().trim()}`));
        proc.on('exit', (code) => {
          console.log(`[native-pm] llm-engine exited with code ${code}`);
          delete processes[serviceId];
        });
        return proc.pid;
      } else {
        throw new Error('LM Studio not found. Install it first.');
      }
    }

    case 'piper': {
      const piperDir = path.dirname(binaryPath);
      const pathEnv = process.env.PATH || '';
      process.env.PATH = `${piperDir}${path.delimiter}${pathEnv}`;

      // Start piper_server.py (OpenAI-compatible HTTP TTS on port 5500)
      const isDev = !require('electron').app.isPackaged;
      const piperServerScript = isDev
        ? path.join(__dirname, '..', '..', 'tts-server', 'piper_server.py')
        : path.join(process.resourcesPath, 'tts-server', 'piper_server.py');

      const pythonCandidates = ['python3', 'python', 'python3.exe', 'python.exe'];
      let pythonBin = null;
      for (const p of pythonCandidates) {
        try {
          require('child_process').execFileSync(p, ['--version'], { windowsHide: true, stdio: 'ignore' });
          pythonBin = p;
          break;
        } catch {}
      }

      if (pythonBin && fs.existsSync(piperServerScript)) {
        const voicesDir = path.join(piperDir, 'voices');
        const piperProc = spawn(pythonBin, [piperServerScript], {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, PIPER_BIN: binaryPath, PIPER_VOICES_DIR: voicesDir },
        });
        piperProc.stdout.on('data', (d) => console.log(`[piper-server] ${d.toString().trim()}`));
        piperProc.stderr.on('data', (d) => console.log(`[piper-server:err] ${d.toString().trim()}`));
        piperProc.on('exit', (code) => console.log(`[piper-server] exited with code ${code}`));
        processes[serviceId] = piperProc;
        console.log(`[native-pm] Piper HTTP server started (PID ${piperProc.pid}) on port 5500`);
        return piperProc.pid;
      } else {
        console.log(`[native-pm] Piper binary available at ${binaryPath} (no Python for HTTP server)`);
        processes[serviceId] = { pid: -1, _piperOnDemand: true };
        return -1;
      }
    }

    case 'flux': {
      // Flux: run flux_server.py with the venv Python
      const fluxDir = path.join(BINARIES_DIR, 'flux');
      const venvPython = process.platform === 'win32'
        ? path.join(fluxDir, 'venv', 'Scripts', 'python.exe')
        : path.join(fluxDir, 'venv', 'bin', 'python');
      const script = path.join(fluxDir, 'flux_server.py');

      if (!fs.existsSync(venvPython) || !fs.existsSync(script)) {
        throw new Error('Flux is not installed. Run install first.');
      }

      proc = spawn(venvPython, [script], {
        env: {
          ...process.env,
          PORT: '7860',
          FLUX_MODEL: 'segmind/SSD-1B',
          MAX_IMAGE_SIZE: '1024',
          HF_HOME: path.join(getServiceDataDir('flux'), 'models')
        },
        cwd: fluxDir,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      break;
    }

    case 'search':
      // Built-in module — nothing to spawn
      return -1;

    default:
      throw new Error(`Unknown service: ${serviceId}`);
  }

  // Log output
  proc.stdout.on('data', (d) => console.log(`[${serviceId}] ${d.toString().trim()}`));
  proc.stderr.on('data', (d) => console.log(`[${serviceId}:err] ${d.toString().trim()}`));
  proc.on('exit', (code) => {
    console.log(`[native-pm] ${serviceId} exited with code ${code}`);
    delete processes[serviceId];
  });

  processes[serviceId] = proc;
  console.log(`[native-pm] Started ${serviceId} (PID ${proc.pid})`);
  return proc.pid;
}

/**
 * Stop a service.
 */
function stopService(serviceId) {
  const proc = processes[serviceId];
  
  // LM Studio: use lms CLI to stop the server (it's managed by the LM Studio desktop app)
  if (serviceId === 'llm-engine' && proc && proc._lmStudioManaged) {
    const lmsPath = findLmsCLI();
    if (lmsPath) {
      console.log(`[native-pm] Stopping LM Studio server via CLI: lms server stop`);
      try {
        const stopProc = spawn(lmsPath, ['server', 'stop'], { windowsHide: true, stdio: 'ignore' });
        stopProc.on('exit', (code) => console.log(`[native-pm] lms server stop exited with code ${code}`));
      } catch (err) {
        console.warn(`[native-pm] Failed to stop LM Studio via CLI:`, err.message);
      }
    }
    delete processes[serviceId];
    return;
  }
  
  if (process.platform === 'win32') {
    // Windows: kill by process tree first
    if (proc) {
      console.log(`[native-pm] Stopping ${serviceId} (PID ${proc.pid})`);
      try {
        spawn('taskkill', ['/PID', proc.pid.toString(), '/T', '/F'], { windowsHide: true });
      } catch {}
    }
  } else {
    if (proc) {
      console.log(`[native-pm] Stopping ${serviceId} (PID ${proc.pid})`);
      proc.kill('SIGTERM');
    }
  }
  
  delete processes[serviceId];
}

/**
 * Stop all running services.
 */
function stopAllServices() {
  console.log('[native-pm] Stopping all services...');
  
  // Stop any services we have a handle on
  for (const serviceId of Object.keys(processes)) {
    stopService(serviceId);
  }
}

/**
 * Check if a service is running and healthy.
 */
async function checkServiceHealth(serviceId) {
  const healthEndpoints = {
    'llm-engine': 'http://127.0.0.1:1234/v1/models',
    flux: 'http://127.0.0.1:7860/health'
  };

  const endpoint = healthEndpoints[serviceId];
  if (!endpoint) return { running: !!processes[serviceId], healthy: true };

  return new Promise((resolve) => {
    const req = http.get(endpoint, (res) => {
      // For LM Studio, the API server is managed externally — if it responds, it's running
      resolve({ running: true, healthy: res.statusCode >= 200 && res.statusCode < 300 });
    });
    req.on('error', () => resolve({ running: false, healthy: false }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ running: false, healthy: false }); });
  });
}

/**
 * Get status of all managed services.
 */
function getServiceStatuses() {
  const statuses = {};
  const downloads = getDownloadInfo();

  for (const serviceId of Object.keys(downloads)) {
    statuses[serviceId] = {
      installed: isServiceInstalled(serviceId),
      running: !!processes[serviceId],
      pid: processes[serviceId] ? processes[serviceId].pid : null
    };
  }
  return statuses;
}

/**
 * Uninstall a single service — stop it, remove binaries, remove data.
 */
async function uninstallService(serviceId) {
  console.log(`[native-pm] Uninstalling ${serviceId}...`);
  
  // Stop it first
  stopService(serviceId);
  // Small delay to let processes die
  await new Promise(r => setTimeout(r, 1000));
  
  // Remove our binary directory
  const serviceDir = path.join(BINARIES_DIR, serviceId);
  rmDirSafe(serviceDir);
  
  // Remove our data directory
  const dataDir = path.join(DATA_DIR, serviceId);
  rmDirSafe(dataDir);
  
  console.log(`[native-pm] ${serviceId} uninstalled`);
}

/**
 * Uninstall ALL services and remove the ~/.alloflow directory entirely.
 */
async function uninstallAll(onProgress) {
  const allServices = ['llm-engine', 'piper', 'flux'];
  const total = allServices.length;
  
  for (let i = 0; i < total; i++) {
    const serviceId = allServices[i];
    if (onProgress) {
      onProgress({
        status: `Uninstalling ${serviceId}...`,
        progress: Math.round((i / total) * 80)
      });
    }
    try {
      await uninstallService(serviceId);
    } catch (err) {
      console.error(`[native-pm] Error uninstalling ${serviceId}:`, err.message);
    }
  }
  
  // Remove the entire .alloflow directory
  if (onProgress) {
    onProgress({ status: 'Removing AlloFlow data...', progress: 90 });
  }
  rmDirSafe(ALLOFLOW_DIR);
  
  if (onProgress) {
    onProgress({ status: 'Uninstall complete', progress: 100 });
  }
  console.log('[native-pm] Full uninstall complete');
}

/**
 * Recursively remove a directory — tolerates files in use.
 */
function rmDirSafe(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`[native-pm] Removed: ${dirPath}`);
    }
  } catch (err) {
    console.warn(`[native-pm] Could not fully remove ${dirPath}: ${err.message}`);
  }
}

/**
 * Derive a machine-specific encryption key from hostname and fixed salt.
 * Uses SHA-256 to create a consistent 32-byte key.
 */
function getMachineKey() {
  const hostname = os.hostname();
  const salt = 'alloflow-credential-encryption-v1';
  return crypto.createHash('sha256').update(hostname + salt).digest();
}

/**
 * Encrypt a JSON object using AES-256-GCM.
 * Returns { iv, encryptedData, authTag } in hex format.
 */
function encryptData(data) {
  const key = getMachineKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const jsonStr = JSON.stringify(data);
  let encrypted = cipher.update(jsonStr, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt data encrypted with encryptData().
 * Input: { iv, encryptedData, authTag } in hex format.
 * Returns: Parsed JSON object.
 */
function decryptData(encrypted) {
  const key = getMachineKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'hex'));
  
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  
  return JSON.parse(decrypted);
}

module.exports = {
  ensureDirectories,
  getDownloadInfo,
  isServiceInstalled,
  installService,
  startService,
  stopService,
  stopAllServices,
  checkServiceHealth,
  getServiceStatuses,
  getServiceBinaryPath,
  uninstallService,
  uninstallAll,
  updateFluxServerScript,
  ensurePiperVoiceModel,
  BINARIES_DIR,
  DATA_DIR,
  ALLOFLOW_DIR
};
