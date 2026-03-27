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
      // Piper: run as a Wyoming protocol server
      // Piper doesn't have a built-in HTTP server — we need the Wyoming wrapper
      // or just keep it available for on-demand invocation.
      // For now, we note that Piper is CLI-based: echo "text" | piper --model ... --output_file ...
      // We'll start a thin wrapper that accepts HTTP requests.
      // For simplicity, mark Piper as "available" without a persistent process.
      // The flux_server.py pattern could work here too, but Piper is fast enough for on-demand.
      console.log(`[native-pm] Piper is CLI-based, no persistent process needed`);
      console.log(`[native-pm] Binary at: ${binaryPath}`);
      return -1; // Sentinel: no persistent process
    }

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
  if (!proc) return;

  console.log(`[native-pm] Stopping ${serviceId} (PID ${proc.pid})`);
  if (process.platform === 'win32') {
    // On Windows, spawn taskkill to kill the process tree
    spawn('taskkill', ['/PID', proc.pid.toString(), '/T', '/F'], { windowsHide: true });
  } else {
    proc.kill('SIGTERM');
  }
  delete processes[serviceId];
}

/**
 * Stop all running services.
 */
function stopAllServices() {
  console.log('[native-pm] Stopping all services...');
  for (const serviceId of Object.keys(processes)) {
    stopService(serviceId);
  }
}

/**
 * Check if a service is running and healthy.
 */
async function checkServiceHealth(serviceId) {
  const healthEndpoints = {
    ollama: 'http://127.0.0.1:11434/api/tags',
    pocketbase: 'http://127.0.0.1:8090/api/health'
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
  BINARIES_DIR,
  DATA_DIR,
  ALLOFLOW_DIR
};
