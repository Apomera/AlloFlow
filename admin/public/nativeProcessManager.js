/**
 * AlloFlow Native Process Manager
 * Downloads, spawns, monitors, and stops native service binaries.
 * Replaces Docker-based deployment for Ollama, PocketBase, and Piper.
 */

const { spawn } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

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
    ollama: getOllamaDownload(platform, arch),
    pocketbase: getPocketBaseDownload(platform, arch),
    piper: getPiperDownload(platform, arch)
  };
}

function getOllamaDownload(platform, arch) {
  if (platform === 'win32') {
    return {
      url: 'https://ollama.com/download/OllamaSetup.exe',
      // Ollama on Windows installs system-wide; we'll use the CLI after install
      type: 'installer',
      binary: 'ollama.exe',
      // After installation, ollama.exe is on PATH (AppData/Local/Programs/Ollama)
      systemBinary: path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Ollama', 'ollama.exe')
    };
  }
  // Linux/macOS: use the install script approach
  return {
    url: 'https://ollama.com/install.sh',
    type: 'script',
    binary: 'ollama'
  };
}

function getPocketBaseDownload(platform, arch) {
  const version = '0.25.9';
  let fname;
  if (platform === 'win32') fname = `pocketbase_${version}_windows_amd64.zip`;
  else if (platform === 'darwin') fname = `pocketbase_${version}_darwin_${arch === 'arm64' ? 'arm64' : 'amd64'}.zip`;
  else fname = `pocketbase_${version}_linux_${arch === 'arm64' ? 'arm64' : 'amd64'}.zip`;

  return {
    url: `https://github.com/pocketbase/pocketbase/releases/download/v${version}/${fname}`,
    type: 'zip',
    binary: platform === 'win32' ? 'pocketbase.exe' : 'pocketbase'
  };
}

function getPiperDownload(platform, arch) {
  // Piper releases: https://github.com/rhasspy/piper/releases
  const version = '2023.11.14-2';
  let fname;
  if (platform === 'win32') fname = `piper_windows_amd64.zip`;
  else if (platform === 'darwin') fname = `piper_macos_${arch === 'arm64' ? 'aarch64' : 'x64'}.tar.gz`;
  else fname = `piper_linux_${arch === 'arm64' ? 'aarch64' : 'x86_64'}.tar.gz`;

  return {
    url: `https://github.com/rhasspy/piper/releases/download/${version}/${fname}`,
    type: platform === 'win32' ? 'zip' : 'tar',
    binary: platform === 'win32' ? 'piper.exe' : 'piper',
    // Default voice model
    voiceUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx',
    voiceConfigUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json'
  };
}

// ── Python / Flux helpers ──────────────────────────────────────────────────────

/**
 * Detect a usable Python 3 interpreter.
 * Returns the absolute path or null.
 */
function findPython() {
  const { execSync } = require('child_process');
  const candidates = process.platform === 'win32'
    ? ['python', 'python3', 'py -3']
    : ['python3', 'python'];

  for (const cmd of candidates) {
    try {
      const ver = execSync(`${cmd} --version`, { stdio: 'pipe', encoding: 'utf-8' }).trim();
      if (ver.startsWith('Python 3')) {
        // Resolve full path
        const which = process.platform === 'win32' ? 'where' : 'which';
        const full = execSync(`${which} ${cmd.split(' ')[0]}`, { stdio: 'pipe', encoding: 'utf-8' }).trim().split('\n')[0].trim();
        console.log(`[native-pm] Found Python: ${full} (${ver})`);
        return full;
      }
    } catch { /* next */ }
  }
  return null;
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
 * Install Flux: create venv, pip-install deps, copy server script.
 */
async function installFlux(onProgress) {
  const pythonPath = findPython();
  if (!pythonPath) {
    throw new Error(
      'Python 3 is required for Flux image generation but was not found.\n' +
      'Please install Python 3.10+ from https://www.python.org/downloads/ and try again.'
    );
  }

  const fluxDir = path.join(BINARIES_DIR, 'flux');
  const venvDir = path.join(fluxDir, 'venv');
  if (!fs.existsSync(fluxDir)) fs.mkdirSync(fluxDir, { recursive: true });

  // 1. Create venv
  if (!fs.existsSync(venvDir)) {
    onProgress({ status: 'Creating Python environment...', progress: 5 });
    await runCommand(pythonPath, ['-m', 'venv', venvDir]);
  }

  const pipBin = process.platform === 'win32'
    ? path.join(venvDir, 'Scripts', 'pip.exe')
    : path.join(venvDir, 'bin', 'pip');
  const pythonBin = process.platform === 'win32'
    ? path.join(venvDir, 'Scripts', 'python.exe')
    : path.join(venvDir, 'bin', 'python');

  // 2. Upgrade pip
  onProgress({ status: 'Upgrading pip...', progress: 10 });
  await runCommand(pythonBin, ['-m', 'pip', 'install', '--upgrade', 'pip']);

  // 3. Install PyTorch
  onProgress({ status: 'Installing PyTorch (this may take a while)...', progress: 15 });
  await runCommand(pipBin, ['install', 'torch'], { timeout: 600000 });

  // 4. Try torch-directml for AMD GPU support (optional — CPU fallback works fine)
  if (process.platform === 'win32') {
    onProgress({ status: 'Checking DirectML support...', progress: 40 });
    try {
      await runCommand(pipBin, ['install', 'torch-directml'], { timeout: 120000 });
      console.log('[native-pm] torch-directml installed — AMD GPU acceleration available');
    } catch (err) {
      console.warn('[native-pm] torch-directml not available, falling back to CPU:', err.message);
    }
  }

  // 6. Install remaining requirements
  onProgress({ status: 'Installing Flux dependencies...', progress: 50 });
  const reqs = ['diffusers>=0.30.0', 'transformers', 'accelerate', 'safetensors',
                'sentencepiece', 'protobuf', 'fastapi', 'uvicorn[standard]', 'Pillow'];
  await runCommand(pipBin, ['install', ...reqs], { timeout: 600000 });

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

  onProgress({ status: 'Flux installed', progress: 100 });
}

/**
 * Run a command and return a promise. Logs output.
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
    proc.stdout.on('data', d => console.log(`[pip] ${d.toString().trim()}`));
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code !== 0) reject(new Error(`Command failed (exit ${code}): ${stderr.slice(-500)}`));
      else resolve();
    });
    proc.on('error', reject);
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
 * Check if a service binary is already installed.
 */
function isServiceInstalled(serviceId) {
  if (serviceId === 'flux') return isFluxInstalled();
  if (serviceId === 'search') return true; // built-in

  const downloads = getDownloadInfo();
  const info = downloads[serviceId];
  if (!info) return false;

  if (serviceId === 'ollama') {
    // Ollama: check if ollama.exe exists on system or in our bin dir
    if (info.systemBinary && fs.existsSync(info.systemBinary)) return true;
    // Also check PATH
    try {
      const { execSync } = require('child_process');
      execSync('ollama --version', { stdio: 'pipe' });
      return true;
    } catch { return false; }
  }

  const binaryPath = path.join(BINARIES_DIR, serviceId, info.binary);
  return fs.existsSync(binaryPath);
}

/**
 * Install a service (download + extract).
 */
async function installService(serviceId, onProgress) {
  ensureDirectories();
  if (serviceId === 'search') return; // built-in, nothing to install
  if (serviceId === 'flux') return installFlux(onProgress);

  const downloads = getDownloadInfo();
  const info = downloads[serviceId];

  if (!info) throw new Error(`Unknown service: ${serviceId}`);

  const serviceDir = path.join(BINARIES_DIR, serviceId);
  if (!fs.existsSync(serviceDir)) {
    fs.mkdirSync(serviceDir, { recursive: true });
  }

  onProgress({ status: `Downloading ${serviceId}...`, progress: 0 });

  if (serviceId === 'ollama' && info.type === 'installer') {
    // Ollama on Windows: download the installer and run it silently
    const installerPath = path.join(serviceDir, 'OllamaSetup.exe');
    await downloadFile(info.url, installerPath, (pct) => {
      onProgress({ status: `Downloading Ollama... ${pct}%`, progress: pct * 0.8 });
    });

    onProgress({ status: 'Installing Ollama...', progress: 80 });
    await new Promise((resolve, reject) => {
      const proc = spawn(installerPath, ['/VERYSILENT', '/NORESTART'], { windowsHide: true });
      proc.on('close', (code) => {
        if (code !== 0) reject(new Error(`Ollama installer exited with code ${code}`));
        else resolve();
      });
      proc.on('error', reject);
    });

    onProgress({ status: 'Ollama installed', progress: 100 });
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

  // Download voice model for Piper
  if (serviceId === 'piper' && info.voiceUrl) {
    onProgress({ status: 'Downloading voice model...', progress: 85 });
    const voiceDir = path.join(serviceDir, 'voices');
    if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });

    await downloadFile(info.voiceUrl, path.join(voiceDir, 'en_US-lessac-medium.onnx'), (pct) => {
      onProgress({ status: `Downloading voice model... ${pct}%`, progress: 85 + pct * 0.1 });
    });
    await downloadFile(info.voiceConfigUrl, path.join(voiceDir, 'en_US-lessac-medium.onnx.json'), () => {});
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
  const downloads = getDownloadInfo();
  const info = downloads[serviceId];
  if (!info) return null;

  if (serviceId === 'ollama') {
    // Check system install first
    if (info.systemBinary && fs.existsSync(info.systemBinary)) {
      return info.systemBinary;
    }
    // Check PATH
    try {
      const { execSync } = require('child_process');
      const result = execSync('where ollama', { stdio: 'pipe', encoding: 'utf-8' });
      return result.trim().split('\n')[0].trim();
    } catch { return null; }
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
    case 'ollama':
      // Ollama: start serve mode
      proc = spawn(binaryPath, ['serve'], {
        env: {
          ...process.env,
          OLLAMA_HOST: '127.0.0.1:11434',
          OLLAMA_MODELS: path.join(dataDir, 'models')
        },
        cwd: dataDir,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      break;

    case 'pocketbase':
      // PocketBase: serve with data directory
      proc = spawn(binaryPath, ['serve', '--http=127.0.0.1:8090', `--dir=${path.join(dataDir, 'pb_data')}`], {
        cwd: dataDir,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      break;

    case 'piper': {
      console.log(`[native-pm] Piper is CLI-based, no persistent process needed`);
      console.log(`[native-pm] Binary at: ${binaryPath}`);
      return -1; // Sentinel: no persistent process
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
          FLUX_MODEL: 'black-forest-labs/FLUX.1-schnell',
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
  
  if (process.platform === 'win32') {
    // Windows: kill by process tree first, then by name as fallback
    if (proc) {
      console.log(`[native-pm] Stopping ${serviceId} (PID ${proc.pid})`);
      try {
        spawn('taskkill', ['/PID', proc.pid.toString(), '/T', '/F'], { windowsHide: true });
      } catch {}
    }
    
    // Ollama installs a tray app + background runner — kill those too
    if (serviceId === 'ollama') {
      console.log('[native-pm] Killing Ollama system processes...');
      for (const name of ['ollama.exe', 'ollama app.exe', 'ollama_runners.exe']) {
        try {
          spawn('taskkill', ['/IM', name, '/F'], { windowsHide: true });
        } catch {}
      }
    }
  } else {
    if (proc) {
      console.log(`[native-pm] Stopping ${serviceId} (PID ${proc.pid})`);
      proc.kill('SIGTERM');
    }
    if (serviceId === 'ollama') {
      try { spawn('pkill', ['-f', 'ollama']); } catch {}
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
  
  // Also force-kill Ollama even if we don't have a process handle 
  // (it may have been started by the system installer tray app)
  if (!processes['ollama']) {
    stopService('ollama');
  }
}

/**
 * Check if a service is running and healthy.
 */
async function checkServiceHealth(serviceId) {
  const healthEndpoints = {
    ollama: 'http://127.0.0.1:11434/api/tags',
    pocketbase: 'http://127.0.0.1:8090/api/health',
    flux: 'http://127.0.0.1:7860/health'
  };

  const endpoint = healthEndpoints[serviceId];
  if (!endpoint) return { running: !!processes[serviceId], healthy: true };

  return new Promise((resolve) => {
    const req = http.get(endpoint, (res) => {
      resolve({ running: true, healthy: res.statusCode >= 200 && res.statusCode < 300 });
    });
    req.on('error', () => resolve({ running: !!processes[serviceId], healthy: false }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ running: !!processes[serviceId], healthy: false }); });
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
  
  if (serviceId === 'ollama') {
    // Ollama on Windows was installed via its own installer — run silent uninstall
    if (process.platform === 'win32') {
      const uninstaller = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Ollama', 'unins000.exe');
      if (fs.existsSync(uninstaller)) {
        console.log('[native-pm] Running Ollama uninstaller...');
        await new Promise((resolve) => {
          const proc = spawn(uninstaller, ['/VERYSILENT', '/NORESTART'], { windowsHide: true });
          proc.on('close', resolve);
          proc.on('error', () => resolve());
        });
        // Wait for uninstaller to finish
        await new Promise(r => setTimeout(r, 3000));
      }
      // Clean up the Ollama AppData directory
      const ollamaAppData = path.join(os.homedir(), '.ollama');
      rmDirSafe(ollamaAppData);
    } else {
      // Linux/macOS: remove the binary
      try {
        const { execSync } = require('child_process');
        const binPath = execSync('which ollama', { stdio: 'pipe', encoding: 'utf-8' }).trim();
        if (binPath) fs.unlinkSync(binPath);
      } catch {}
    }
  }
  
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
  const allServices = ['ollama', 'pocketbase', 'piper', 'flux'];
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
  BINARIES_DIR,
  DATA_DIR,
  ALLOFLOW_DIR
};
