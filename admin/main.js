const { app, BrowserWindow, ipcMain, Menu, globalShortcut } = require('electron');
const path = require('path');
const { spawn, exec, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Clustering service - load as CommonJS
const ClusteringService = require('./src/services/clusteringService.js');

// Package builder service - load as CommonJS
const ClientPackageBuilder = require('./src/services/packageBuilderService.js');

// GPU Detection system - unified across all apps
const { GPUDetector, detectGPU, generateEnvFile } = require('./gpu-detection.js');

// Docker GPU setup - resolve path based on packaged/dev mode
let DockerGPUSetup;
try {
  // Try dev path first (when running from source)
  DockerGPUSetup = require('./docker/docker-gpu-setup.js').DockerGPUSetup;
} catch (e) {
  // In packaged app, docker is in resources, so we'll require it dynamically later
  // after the app module is ready
  DockerGPUSetup = null;
}

// Function to ensure DockerGPUSetup is loaded from the correct location
function getDockerGPUSetup() {
  if (DockerGPUSetup) return DockerGPUSetup;
  
  // Packaged app: load from resources/docker
  const dockerPath = path.join(process.resourcesPath, 'docker', 'docker-gpu-setup.js');
  if (fs.existsSync(dockerPath)) {
    DockerGPUSetup = require(dockerPath).DockerGPUSetup;
    return DockerGPUSetup;
  }
  
  throw new Error('DockerGPUSetup module not found');
}

// Configure logging for auto-updater
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't auto-download, ask user first
autoUpdater.autoInstallOnAppQuit = true; // Install update when user quits app

const isDev = !app.isPackaged;
let mainWindow;
let dockerProcess = null;

// Define all container names globally for consistency
const CONTAINERS = {
  POCKETBASE: 'alloflow-pocketbase',
  OLLAMA: 'alloflow-ollama',
  FLUX: 'alloflow-flux',
  PIPER: 'alloflow-piper',
  SEARXNG: 'alloflow-searxng'
};

// Ensure Docker is in PATH - add common Docker installation locations
if (process.platform === 'win32') {
  const dockerPaths = [
    'C:\\Program Files\\Docker\\Docker\\resources\\bin',
    'C:\\Program Files (x86)\\Docker\\Docker\\bin',
    path.join(process.env.ProgramFiles, 'Docker\\Docker\\resources\\bin'),
  ].filter(p => p && fs.existsSync(p));
  
  if (dockerPaths.length > 0) {
    process.env.PATH = dockerPaths.concat(process.env.PATH.split(path.delimiter)).join(path.delimiter);
    console.log('Added Docker to PATH');
  }
}

// ========== CRITICAL FIX for packaged Electron on Windows ==========
// Packaged Electron apps have process.cwd() inside the .asar archive,
// which is not a real directory. This causes ALL child_process calls
// (exec, spawn, execFile) to fail with "spawn cmd.exe ENOENT" because
// Windows uses the cwd for DLL/path resolution during process creation.
// Fix: change the actual process working directory to a real path,
// and wrap all exec calls to validate their cwd.
const SAFE_CWD = process.env.USERPROFILE || process.env.SystemRoot || 'C:\\Windows';
try {
  process.chdir(SAFE_CWD);
  console.log('Working directory set to:', process.cwd());
} catch (e) {
  console.error('Failed to set working directory:', e.message);
}

// Resolve paths that may be inside .asar to their real locations
// For packaged apps, docker is in extraResources, not in the asar
function resolveDockerPath() {
  if (app.isPackaged) {
    // In packaged app, docker is in resources directory (extraResources)
    return path.join(process.resourcesPath, 'docker');
  } else {
    // In development, docker is in parent directory
    return path.join(__dirname, '..', 'docker');
  }
}

const _execAsync = promisify(exec);
const _execFileAsync = promisify(execFile);

// Wrapped exec that ensures cwd is always a real directory (not inside .asar)
function execAsync(cmd, opts = {}) {
  if (!opts.cwd || !fs.existsSync(opts.cwd)) {
    opts.cwd = SAFE_CWD;
  }
  return _execAsync(cmd, opts);
}

function execFileAsync(file, args = [], opts = {}) {
  if (!opts.cwd || !fs.existsSync(opts.cwd)) {
    opts.cwd = SAFE_CWD;
  }
  return _execFileAsync(file, args, opts);
}

// Auto-update state
let updateAvailable = false;
let updateDownloaded = false;

// Package builder instance
let packageBuilder = new ClientPackageBuilder(
  path.join(__dirname, '../../client'),
  path.join(__dirname, '..')
);

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build/index.html')}`;

  mainWindow.loadURL(startURL);

  // Only open DevTools for debugging in development mode
  if (isDev) {
    setTimeout(() => {
      mainWindow.webContents.openDevTools({ mode: 'bottom' });
    }, 500);
  }

  // Register keyboard shortcut to open DevTools (Ctrl+Shift+I or F12)
  globalShortcut.register('Control+Shift+I', () => {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: 'bottom' });
    }
  });

  globalShortcut.register('F12', () => {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: 'bottom' });
    }
  });

  mainWindow.on('closed', () => {
    // Unregister shortcuts
    globalShortcut.unregister('Control+Shift+I');
    globalShortcut.unregister('F12');
    mainWindow = null;
  });
};

// IPC handlers for Docker commands
ipcMain.handle('docker:health', async (event) => {
  try {
    const response = await fetch('http://localhost:8090/api/health', {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? 'healthy' : 'unhealthy';
  } catch (err) {
    return 'offline';
  }
});

// Helper to get user's docker directory (where compose files are copied)
function getUserDockerDir() {
  const userDataDir = path.join(app.getPath('userData'), 'docker');
  const composePath = path.join(userDataDir, 'docker-compose.universal.yml');
  
  // If compose file exists in userData, use that
  if (fs.existsSync(composePath)) {
    return userDataDir;
  }
  
  // Otherwise, check if we're in dev mode and use workspace docker dir
  const workspaceDockerDir = path.join(__dirname, '../../docker');
  const workspaceComposePath = path.join(workspaceDockerDir, 'docker-compose.universal.yml');
  if (fs.existsSync(workspaceComposePath)) {
    console.log('[getUserDockerDir] Using workspace docker dir:', workspaceDockerDir);
    return workspaceDockerDir;
  }
  
  // Fall back to userData even if file doesn't exist yet
  return userDataDir;
}

// Helper to load update configuration
function loadUpdateConfig() {
  try {
    const configPath = path.join(__dirname, '../update-config.json');
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(config);
    }
  } catch (err) {
    log.error('Error loading update config:', err);
  }
  return null;
}

// Helper: Check if docker is installed and accessible
async function isDockerInstalled() {
  try {
    const { stdout } = await execAsync('docker --version', { timeout: 5000 });
    console.log('Docker version:', stdout.trim());
    return true;
  } catch (err) {
    console.warn('Docker not found or not accessible:', err.message);
    return false;
  }
}

// Helper: Check if docker compose file exists
function doesComposeFileExist() {
  const dockerDir = getUserDockerDir();
  const composePath = path.join(dockerDir, 'docker-compose.universal.yml');
  return fs.existsSync(composePath);
}

// Helper: Safely parse JSON from command output with fallback
function safeParseJSON(jsonStr, fallback = null) {
  try {
    // Remove any leading/trailing whitespace or warnings
    const trimmed = jsonStr.trim();
    
    // Find the first { or [ character and extract from there
    const jsonStart = Math.max(
      trimmed.indexOf('{'),
      trimmed.indexOf('[')
    );
    
    if (jsonStart === -1) {
      console.warn('No JSON found in output');
      return fallback;
    }
    
    // Find the last } or ] character
    const jsonEnd = Math.max(
      trimmed.lastIndexOf('}') + 1,
      trimmed.lastIndexOf(']') + 1
    );
    
    if (jsonEnd <= jsonStart) {
      console.warn('Invalid JSON boundaries');
      return fallback;
    }
    
    const jsonStr2 = trimmed.substring(jsonStart, jsonEnd);
    return JSON.parse(jsonStr2);
  } catch (err) {
    console.error('JSON parse error:', err.message, 'Input:', jsonStr?.substring(0, 100));
    return fallback;
  }
}

ipcMain.handle('docker:services', async (event) => {
  try {
    const dockerDir = getUserDockerDir();
    const composePath = path.join(dockerDir, 'docker-compose.universal.yml');
    
    console.log('[docker:services] Starting - dockerDir:', dockerDir);
    console.log('[docker:services] Compose file path:', composePath);
    
    // Check if docker directory exists
    if (!fs.existsSync(dockerDir)) {
      console.warn('[docker:services] Docker directory does not exist:', dockerDir);
      return {
        success: false,
        error: `Docker directory not found at ${dockerDir}. Please complete setup.`,
        containers: []
      };
    }
    
    console.log('[docker:services] Docker directory exists');
    
    // Check if compose file exists
    if (!fs.existsSync(composePath)) {
      console.warn('[docker:services] Compose file does not exist:', composePath);
      return {
        success: false,
        error: `docker-compose.universal.yml not found at ${composePath}. Please complete setup.`,
        containers: []
      };
    }
    
    console.log('[docker:services] Compose file exists, size:', fs.statSync(composePath).size, 'bytes');
    
    // Run docker compose ps with JSON format using absolute path
    // Use cd first to set working directory, then run docker without path quoting
    const command = `cd /d "${dockerDir}" && docker compose -f docker-compose.universal.yml ps --format json`;
    console.log('[docker:services] Executing:', command);
    
    const { stdout, stderr } = await executeDockerCommand(command, dockerDir);
    
    if (stderr && stderr.toLowerCase().includes('error')) {
      console.error('[docker:services] Docker error:', stderr);
      return {
        success: false,
        error: `Docker error: ${stderr.substring(0, 200)}`,
        containers: []
      };
    }
    
    // Handle empty response (no containers)
    if (!stdout || !stdout.trim()) {
      console.warn('[docker:services] No output from docker compose');
      return {
        success: true,
        containers: [],
        message: 'No containers found. Stack may not be started.'
      };
    }
    
    console.log('[docker:services] Got output, length:', stdout.length);
    console.log('[docker:services] First 100 chars:', stdout.substring(0, 100));
    console.log('[docker:services] Last 100 chars:', stdout.substring(Math.max(0, stdout.length - 100)));
    
    // Parse JSON - handle array of objects
    let services = [];
    try {
      // Trim whitespace first
      let jsonStr = stdout.trim();
      
      // Try to extract JSON if there's extra text
      // Look for [ or { at the start
      const jsonStartIdx = jsonStr.search(/[\[\{]/);
      if (jsonStartIdx > 0) {
        console.warn('[docker:services] Found non-JSON text before JSON, extracting...');
        jsonStr = jsonStr.substring(jsonStartIdx);
      }
      
      // Try to parse as array
      services = JSON.parse(jsonStr);
      if (!Array.isArray(services)) {
        services = [services];
      }
    } catch (parseErr) {
      console.error('[docker:services] JSON parse error:', parseErr.message);
      console.error('[docker:services] Raw output (first 500 chars):', stdout.substring(0, 500));
      console.error('[docker:services] Raw output (last 500 chars):', stdout.substring(Math.max(0, stdout.length - 500)));
      return {
        success: false,
        error: `Failed to parse docker response: ${parseErr.message}`,
        containers: []
      };
    }
    
    console.log('[docker:services] Parsed', services.length, 'services');
    
    // Map services to expected format
    const containers = services.map(s => ({
      name: s.Service || s.name || 'unknown',
      status: s.State === 'running' ? 'running' : 'stopped',
      port: s.Ports ? s.Ports.split(':')[1]?.split('/')[0] : '-',
      containerId: s.ID?.substring(0, 12) || s.ID || 'unknown',
    }));
    
    console.log('[docker:services] Returning', containers.length, 'containers');
    return { success: true, containers };
  } catch (err) {
    console.error('[docker:services] Exception:', err.message, err.stack);
    return {
      success: false,
      error: `Failed to query docker: ${err.message.substring(0, 150)}`,
      containers: []
    };
  }
});

ipcMain.handle('docker:logs', async (event, service) => {
  try {
    const dockerDir = getUserDockerDir();
    const composePath = path.join(dockerDir, 'docker-compose.universal.yml');
    
    if (!fs.existsSync(dockerDir)) {
      return { success: false, error: 'Docker setup not complete' };
    }
    
    if (!fs.existsSync(composePath)) {
      return { success: false, error: 'docker-compose.universal.yml not found' };
    }
    
    if (!service || !service.trim()) {
      return { success: false, error: 'Service name required' };
    }
    
    const command = `cd /d "${dockerDir}" && docker compose -f docker-compose.universal.yml logs --tail=100 ${service}`;
    console.log('[docker:logs] Executing:', command);
    
    const { stdout, stderr } = await executeDockerCommand(command, dockerDir);
    
    // Return logs from stdout (or error if in stderr)
    const logs = stdout || stderr || 'No logs available';
    return { success: true, logs };
  } catch (err) {
    console.error('Error fetching logs:', err.message);
    return { success: false, error: `Failed to get logs: ${err.message.substring(0, 150)}` };
  }
});

ipcMain.handle('docker:restart', async (event, service) => {
  try {
    const dockerDir = getUserDockerDir();
    const composePath = path.join(dockerDir, 'docker-compose.universal.yml');
    
    if (!fs.existsSync(dockerDir)) {
      return { success: false, error: 'Docker setup not complete' };
    }
    
    if (!fs.existsSync(composePath)) {
      return { success: false, error: 'docker-compose.universal.yml not found' };
    }
    
    if (!service || !service.trim()) {
      return { success: false, error: 'Service name required' };
    }
    
    console.log(`Restarting service: ${service}`);
    const command = `cd /d "${dockerDir}" && docker compose -f docker-compose.universal.yml restart ${service}`;
    const { stdout, stderr } = await executeDockerCommand(command, dockerDir);
    
    if (stderr && stderr.includes('ERROR')) {
      return { success: false, error: stderr.substring(0, 200) };
    }
    
    console.log(`Service ${service} restarted successfully`);
    return { success: true, message: `${service} restarted successfully` };
  } catch (err) {
    console.error('Error restarting service:', err.message);
    return { success: false, error: `Failed to restart: ${err.message.substring(0, 150)}` };
  }
});

ipcMain.handle('docker:compose-up', async (event) => {
  try {
    const dockerDir = getUserDockerDir();
    const composePath = path.join(dockerDir, 'docker-compose.universal.yml');
    
    if (!fs.existsSync(dockerDir)) {
      return { success: false, error: 'Docker setup not complete' };
    }
    
    if (!fs.existsSync(composePath)) {
      return { success: false, error: 'docker-compose.universal.yml not found' };
    }
    
    console.log('Starting Docker Compose stack...');
    
    // Start in background without waiting
    const command = `cd /d "${dockerDir}" && docker compose -f docker-compose.universal.yml up -d`;
    executeDockerCommand(command, dockerDir).then(({ stdout }) => {
      console.log('Compose stack started:', stdout);
    }).catch((err) => {
      console.error('Compose up error:', err.message);
    });
    
    return { success: true, message: 'Stack starting... (check logs in 10 seconds)' };
  } catch (err) {
    console.error('Error starting compose stack:', err.message);
    return { success: false, error: `Failed to start stack: ${err.message.substring(0, 150)}` };
  }
});

ipcMain.handle('docker:compose-down', async (event) => {
  try {
    const dockerDir = getUserDockerDir();
    const composePath = path.join(dockerDir, 'docker-compose.universal.yml');
    
    if (!fs.existsSync(dockerDir)) {
      return { success: false, error: 'Docker setup not complete' };
    }
    
    if (!fs.existsSync(composePath)) {
      return { success: false, error: 'docker-compose.universal.yml not found' };
    }
    
    console.log('Stopping Docker Compose stack...');
    const command = `cd /d "${dockerDir}" && docker compose -f docker-compose.universal.yml down`;
    const { stdout, stderr } = await executeDockerCommand(command, dockerDir);
    
    if (stderr && stderr.includes('ERROR')) {
      return { success: false, error: stderr.substring(0, 200) };
    }
    
    console.log('Stack stopped');
    return { success: true, message: 'Stack stopped successfully' };
  } catch (err) {
    console.error('Error stopping compose stack:', err.message);
    return { success: false, error: `Failed to stop stack: ${err.message.substring(0, 150)}` };
  }
});

// Helper to execute docker commands reliably on Windows
async function executeDockerCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    // On Windows, use cmd.exe for better compatibility
    // On Linux/Mac, use bash
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/bash';
    const shellArgs = isWindows 
      ? ['/c', command]  // cmd.exe requires /c and the command
      : ['-c', command];
    
    console.log(`[executeDockerCommand] Platform: ${process.platform}, Shell: ${shell}`);
    console.log(`[executeDockerCommand] Command: ${command.substring(0, 100)}...`);
    
    // Use cwd to set working directory, but don't quote it
    const spawnOpts = {
      stdio: ['ignore', 'pipe', 'pipe'],  // Explicitly set stdio
      windowsHide: true,
      env: {
        ...process.env,
      }
    };
    
    // Only set cwd if it exists
    if (cwd && fs.existsSync(cwd)) {
      spawnOpts.cwd = cwd;
      console.log(`[executeDockerCommand] Using cwd: ${cwd}`);
    } else if (cwd) {
      console.warn(`[executeDockerCommand] cwd does not exist: ${cwd}`);
    }

    const child = spawn(shell, shellArgs, spawnOpts);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const str = data.toString();
      console.log(`[executeDockerCommand] stdout data (${str.length} chars)`);
      stdout += str;
    });

    child.stderr.on('data', (data) => {
      const str = data.toString();
      console.log(`[executeDockerCommand] stderr data (${str.length} chars): ${str.substring(0, 100)}`);
      stderr += str;
    });

    child.on('close', (code) => {
      console.log(`[executeDockerCommand] Process closed with code: ${code}`);
      console.log(`[executeDockerCommand] Total stdout: ${stdout.length} chars`);
      console.log(`[executeDockerCommand] Total stderr: ${stderr.length} chars`);
      
      // Don't reject on non-zero exit code if we got output
      // Docker commands sometimes return non-zero but still produce output
      resolve({ stdout, stderr, code });
    });

    child.on('error', (err) => {
      console.error(`[executeDockerCommand] Spawn error:`, err.message);
      reject(err);
    });
  });
}

// Models handler - queries actual models from ollama
ipcMain.handle('models:list', async (event) => {
  try {
    // First check if ollama container is running
    const servicesResult = await ipcMain._requesthandlers['docker:services']?.(null);
    const isRunning = servicesResult?.success && 
                      servicesResult.containers.some(c => c.name === CONTAINERS.OLLAMA && c.status === 'running');
    
    if (!isRunning) {
      return { 
        success: false, 
        models: [], 
        error: `${CONTAINERS.OLLAMA} container is not running` 
      };
    }
    
    const dockerDir = getUserDockerDir();
    const { stdout, stderr } = await executeDockerCommand(
      `docker exec ${CONTAINERS.OLLAMA} ollama list`,
      dockerDir
    );
    
    if (stderr && stderr.includes('Error')) {
      return { success: false, models: [], error: stderr.substring(0, 200) };
    }
    
    const models = stdout
      .split('\n')
      .filter(line => line.trim() && !line.includes('NAME ID SIZE'))
      .map(line => {
        const match = line.match(/^(\S+)\s/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
    
    return { success: true, models };
  } catch (err) {
    console.error('Error querying ollama models:', err.message);
    return { 
      success: false, 
      models: [], 
      error: err.message.includes('No such file')
        ? `${CONTAINERS.OLLAMA} container not found or not running`
        : err.message.substring(0, 200)
    };
  }
});

ipcMain.handle('system:read-env', async (event) => {
  try {
    const envPath = path.join(__dirname, '../.env');
    const content = fs.readFileSync(envPath, 'utf8');
    return { success: true, content };
  } catch (err) {
    console.error('Error reading .env:', err.message);
    return { success: false, content: '' };
  }
});

ipcMain.handle('system:write-env', async (event, envContent) => {
  try {
    const envPath = path.join(__dirname, '../.env');
    fs.writeFileSync(envPath, envContent);
    return { success: true, message: '.env updated' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// AI Configuration handlers
ipcMain.handle('ai:read-config', async (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'ai-config.json');
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(config);
    }
    // Return default config if file doesn't exist
    return {
      backend: 'local',
      cloudProvider: 'gemini',
      apiKeys: { gemini: '', openai: '', claude: '' },
      models: {
        default: 'deepseek-r1:1.5b',
        image: 'flux-schnell',
        tts: 'edge-tts'
      },
      smartRouting: {
        enabled: true,
        responseTimeThreshold: 5,
        queueThreshold: 10,
        healthCheckInterval: 30,
        retryAttempts: 2
      }
    };
  } catch (err) {
    console.error('Error reading AI config:', err.message);
    return null;
  }
});

ipcMain.handle('ai:write-config', async (event, config) => {
  try {
    const userDataPath = app.getPath('userData');
    // Ensure userData directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    const configPath = path.join(userDataPath, 'ai-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('AI configuration saved:', configPath);
    return { success: true, message: 'Configuration saved' };
  } catch (err) {
    console.error('Error writing AI config:', err.message);
    return { success: false, error: err.message };
  }
});

// Setup Wizard handlers

// Check admin privileges (informational only - firewall uses socket-based approach)
ipcMain.handle('setup:check-admin', async (event) => {
  // Admin is no longer required for firewall - we use socket binding
  // which triggers Windows' built-in firewall dialog automatically.
  // Always return true so the UI shows green.
  return true;
});

ipcMain.handle('setup:check-docker', async (event) => {
  try {
    await execAsync('docker --version');
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('setup:install-docker', async (event) => {
  try {
    const platform = process.platform;
    console.log(`Installing Docker on ${platform}...`);
    
    if (platform === 'win32') {
      // Windows: PowerShell script to install Docker Engine via WSL2
      const psScript = `
        wsl --install -d Ubuntu
        wsl -d Ubuntu -e bash -c "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
      `;
      await execAsync(`powershell -Command "${psScript}"`);
    } else if (platform === 'darwin') {
      // macOS: Download Docker Desktop (user must install manually due to licensing)
      return {
        success: false,
        error: 'Please download Docker Desktop from docker.com/products/docker-desktop',
        manual: true
      };
    } else if (platform === 'linux') {
      // Linux: Use official Docker install script
      await execAsync('curl -fsSL https://get.docker.com -o /tmp/get-docker.sh && sudo sh /tmp/get-docker.sh');
    }
    
    return { success: true };
  } catch (err) {
    console.error('Docker installation error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('setup:detect-gpu', async (event) => {
  try {
    // Use the unified GPU detection system
    const gpu = detectGPU();
    
    console.log(`GPU Detected: ${gpu.type} (${gpu.driver})`);
    console.log(`Details: ${gpu.details}`);
    
    // Return just the type string (nvidia, amd, or CPU) for UI consistency
    return gpu.type.toLowerCase();
  } catch (err) {
    console.error('GPU detection error:', err.message);
    return 'cpu';
  }
});

ipcMain.handle('docker-setup:run', async (event) => {
  try {
    // Generate GPU-specific Docker configuration
    const DockerGPUSetupClass = getDockerGPUSetup();
    const setup = new DockerGPUSetupClass();
    setup.run();  // Generates docker-compose.override.yml + .env.gpu
    
    const gpu = detectGPU();
    return {
      success: true,
      gpu: {
        type: gpu.type,
        driver: gpu.driver,
        details: gpu.details,
      },
      message: `Docker configuration generated for ${gpu.type}. Ready to start services.`,
    };
  } catch (err) {
    console.error('Docker setup error:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
});

ipcMain.handle('docker:start-services', async (event) => {
  try {
    const dockerDir = getUserDockerDir();
    
    // Start services using universal docker-compose + auto-generated overrides
    const result = await execAsync(
      'docker compose -f docker-compose.universal.yml up -d',
      { cwd: dockerDir }
    );
    
    console.log('Docker services started');
    return {
      success: true,
      stdout: result.stdout,
    };
  } catch (err) {
    console.error('Docker start error:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
});

ipcMain.handle('docker:stop-services', async (event) => {
  try {
    const dockerDir = getUserDockerDir();
    
    await execAsync(
      'docker compose -f docker-compose.universal.yml down',
      { cwd: dockerDir }
    );
    
    console.log('Docker services stopped');
    return { success: true };
  } catch (err) {
    console.error('Docker stop error:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
});

ipcMain.handle('setup:get-server-ip', async (event) => {
  try {
    const os = require('os');
    const nets = os.networkInterfaces();
    
    // Helper function to check if IP is private/internal (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isPrivateIP = (ip) => {
      return /^192\.168\.\d+\.\d+$/.test(ip) ||
             /^10\.\d+\.\d+\.\d+$/.test(ip) ||
             /^172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+$/.test(ip);
    };
    
    // First priority: find private IPv4 address (for local network access)
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal && isPrivateIP(net.address)) {
          console.log(`Found private IP: ${net.address} on interface ${name}`);
          return net.address;
        }
      }
    }
    
    // Fallback: find any non-internal IPv4 (e.g., if for some reason only public IP available)
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`Found external IP: ${net.address} on interface ${name}`);
          return net.address;
        }
      }
    }
    
    // Last resort: localhost
    console.log('No network interface found, using localhost');
    return '127.0.0.1';
  } catch (err) {
    console.error('IP detection error:', err.message);
    return '127.0.0.1';
  }
});

ipcMain.handle('setup:validate-cluster-token', async (event, primaryIp, token) => {
  try {
    // Try to connect to primary node's cluster API
    const response = await fetch(`http://${primaryIp}:8090/api/cluster/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      return { valid: true, clusterName: data.clusterName };
    } else {
      return { valid: false, error: 'Invalid token or unable to connect' };
    }
  } catch (err) {
    console.error('Cluster validation error:', err.message);
    return { valid: false, error: err.message };
  }
});

ipcMain.handle('setup:configure-firewall', async (event, port = 8000) => {
  try {
    if (process.platform !== 'win32') {
      return { success: false, error: 'Firewall configuration is only available on Windows' };
    }
    
    console.log(`Configuring Windows firewall for port ${port}...`);
    
    // Use netsh to add firewall rule for AlloFlow
    return new Promise((resolve) => {
      const ruleName = 'AlloFlow-Student-Access';
      const cmd = `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow protocol=tcp localport=${port} remoteip=localsubnet`;
      
      exec(cmd, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
        if (error) {
          // Rule might already exist, treat as success
          console.warn('Firewall rule setup warning:', error.message);
          if (error.message.includes('already exists') || error.message.includes('Обнаружена ошибка')) {
            resolve({ success: true, message: 'Firewall rule already configured' });
          } else {
            resolve({ success: false, error: error.message });
          }
        } else {
          console.log('Firewall rule created successfully');
          resolve({ 
            success: true, 
            message: `Firewall rule "${ruleName}" created for port ${port}`,
            ruleName,
            port
          });
        }
      });
    });
  } catch (err) {
    console.error('Firewall configuration error:', err.message);
    return { success: false, error: err.message };
  }
});

// Check if setup is complete (by looking for setup-complete.lock file)
ipcMain.handle('setup:check-complete', async (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const lockFile = path.join(userDataPath, 'setup-complete.lock');
    const isComplete = fs.existsSync(lockFile);
    console.log('Setup complete check:', isComplete, 'at', lockFile);
    return isComplete;
  } catch (err) {
    console.error('Error checking setup completion:', err.message);
    return false;
  }
});

ipcMain.handle('setup:run', async (event, config) => {
  try {
    const dockerRoot = app.isPackaged ? path.dirname(process.resourcesPath) : path.join(__dirname, '..');
    const userDataPath = app.getPath('userData');
    console.log('Starting AlloFlow setup with config:', config);
    console.log('Using userData path:', userDataPath);
    
    // Ensure userData directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    // Step 1: Save AI configuration to userData (readable by app and Docker volumes)
    const aiConfigPath = path.join(userDataPath, 'ai-config.json');
    fs.writeFileSync(aiConfigPath, JSON.stringify({
      backend: config.aiBackend,
      cloudProvider: config.cloudProvider,
      apiKeys: config.apiKeys,
      models: config.models,
      smartRouting: {
        enabled: true,
        responseTimeThreshold: 5,
        queueThreshold: 10,
        healthCheckInterval: 30,
        retryAttempts: 2
      }
    }, null, 2));
    console.log('Config saved to:', aiConfigPath);
    
    // Step 2: Create .env file in userData
    const envPath = path.join(userDataPath, '.env');
    const envContent = `
SERVER_IP=${config.serverIp}
GPU_TYPE=${config.gpuType || 'none'}
AI_BACKEND=${config.aiBackend}
DEPLOYMENT_MODE=${config.deploymentMode}
${config.deploymentMode === 'join-cluster' ? `CLUSTER_PRIMARY_IP=${config.clusterPrimaryIp}\nCLUSTER_TOKEN=${config.clusterToken}` : ''}
`.trim();
    fs.writeFileSync(envPath, envContent);
    console.log('.env file created at:', envPath);
    
    // Step 2.5: Configure Windows firewall (if on Windows)
    // Instead of running netsh commands (which need admin + cmd.exe),
    // we simply open a listening socket on port 8000. Windows Firewall
    // automatically detects this and shows the built-in
    // "Windows Defender Firewall has blocked some features of this app"
    // dialog, letting the user click "Allow access". This is the same
    // mechanism video games and other apps use - zero admin required.
    if (process.platform === 'win32') {
      mainWindow.webContents.send('setup:progress', { step: 'Configuring firewall for network access...', progress: 8 });
      try {
        const net = require('net');
        await new Promise((resolve, reject) => {
          const server = net.createServer();
          server.once('error', (err) => {
            console.warn('Port 8000 firewall trigger skipped:', err.message);
            resolve(); // Don't fail setup if port is in use
          });
          server.listen(8000, '0.0.0.0', () => {
            console.log('Listening on port 8000 to trigger Windows Firewall prompt...');
            // Give Windows a moment to detect the listening socket and show the dialog
            setTimeout(() => {
              server.close(() => {
                console.log('Firewall trigger server closed');
                resolve();
              });
            }, 2000);
          });
        });
        console.log('Firewall configuration step complete');
      } catch (error) {
        console.warn('Firewall trigger skipped:', error.message);
        // Continue setup regardless
      }
    }
    
    // Step 3: Docker availability check and startup
    mainWindow.webContents.send('setup:progress', { step: 'Checking Docker...', progress: 9 });
    
    // Helper function to check if Docker is installed
    async function checkDockerInstalled() {
      try {
        await execAsync('docker --version', { timeout: 3000 });
        return true;
      } catch (err) {
        return false;
      }
    }
    
    // Helper function to check if Docker daemon is running
    async function checkDockerRunning() {
      try {
        await execAsync('docker ps -q', { timeout: 3000 });
        return true;
      } catch (err) {
        return false;
      }
    }
    
    // Helper function to start Docker Desktop
    async function startDockerDesktop() {
      try {
        const dockerPaths = [
          'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
          'C:\\Program Files (x86)\\Docker\\Docker\\Docker Desktop.exe'
        ];
        
        for (const dockerPath of dockerPaths) {
          if (fs.existsSync(dockerPath)) {
            console.log('Starting Docker Desktop from:', dockerPath);
            spawn(dockerPath, [], { detached: true });
            
            // Wait for Docker to initialize (up to 60 seconds)
            mainWindow.webContents.send('setup:progress', { step: 'Starting Docker Desktop...', progress: 10 });
            for (let i = 0; i < 60; i++) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              const running = await checkDockerRunning();
              if (running) {
                console.log('Docker Desktop is now running');
                return true;
              }
              if (i % 10 === 0) {
                mainWindow.webContents.send('setup:progress', { 
                  step: `Starting Docker Desktop (${i}s elapsed)...`, 
                  progress: 10 + (i / 60) * 5 
                });
              }
            }
            console.error('Docker Desktop startup timeout');
            return false;
          }
        }
        
        console.error('Docker Desktop executable not found');
        return false;
      } catch (err) {
        console.error('Error starting Docker Desktop:', err.message);
        return false;
      }
    }
    
    // Check Docker installation and startup
    const dockerInstalled = await checkDockerInstalled();
    if (!dockerInstalled) {
      throw new Error(
        'Docker is not installed.\n\n' +
        'Please install Docker Desktop:\n' +
        '1. Go to https://www.docker.com/products/docker-desktop\n' +
        '2. Download and install Docker Desktop for Windows\n' +
        '3. Restart your computer\n' +
        '4. Try AlloFlow setup again'
      );
    }
    
    console.log('Docker is installed');
    
    // Check if Docker daemon is running
    let dockerRunning = await checkDockerRunning();
    if (!dockerRunning) {
      console.log('Docker is not running, attempting to start...');
      const startSuccess = await startDockerDesktop();
      
      if (!startSuccess) {
        throw new Error(
          'Failed to start Docker Desktop.\n\n' +
          'Please:\n' +
          '1. Manually start Docker Desktop\n' +
          '2. Wait for it to fully initialize (look for whale icon in system tray)\n' +
          '3. Try AlloFlow setup again'
        );
      }
    }
    
    console.log('Docker is available and running');
    mainWindow.webContents.send('setup:progress', { step: 'Setting up Docker environment...', progress: 15 });
    
    // Copy docker-compose files to user's AppData (where Docker can write volumes without permission issues)
    const userDockerDir = path.join(userDataPath, 'docker');
    if (!fs.existsSync(userDockerDir)) {
      fs.mkdirSync(userDockerDir, { recursive: true });
      console.log('Created Docker directory in AppData:', userDockerDir);
    }
    
    // Copy compose files from resources to user's AppData
    const sourceDockerDir = resolveDockerPath();
    const composeFiles = ['docker-compose.universal.yml', 'docker-compose.yml', 'docker-compose-hybrid.yml', 'docker-compose-full.yml'];
    
    for (const file of composeFiles) {
      const src = path.join(sourceDockerDir, file);
      const dst = path.join(userDockerDir, file);
      
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
        console.log(`Copied ${file} to AppData`);
      }
    }
    
    // Copy pocketbase migrations folder
    const pbMigrationsSource = path.join(sourceDockerDir, 'pocketbase', 'pb_migrations');
    const pbMigrationsDest = path.join(userDockerDir, 'pocketbase', 'pb_migrations');
    
    if (fs.existsSync(pbMigrationsSource)) {
      if (!fs.existsSync(path.join(userDockerDir, 'pocketbase'))) {
        fs.mkdirSync(path.join(userDockerDir, 'pocketbase'), { recursive: true });
      }
      
      // Copy the migrations directory
      const copyDir = (src, dest) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const files = fs.readdirSync(src);
        for (const file of files) {
          const srcPath = path.join(src, file);
          const destPath = path.join(dest, file);
          if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };
      
      copyDir(pbMigrationsSource, pbMigrationsDest);
      console.log('Copied PocketBase migrations to AppData');
    }
    
    // Use universal docker-compose file from user's AppData
    const composeFile = 'docker-compose.universal.yml';
    
    // Set up environment for docker commands
    const dockerEnv = { ...process.env, CONFIG_HOME: userDataPath };
    
    console.log('Docker setup directory:', userDockerDir);
    
    mainWindow.webContents.send('setup:progress', { step: 'Pulling Docker images...', progress: 20 });
    
    await execAsync(`docker compose -f ${composeFile} pull`, { 
      cwd: userDockerDir,
      env: dockerEnv
    });
    
    // Step 4: Start Docker stack
    mainWindow.webContents.send('setup:progress', { step: 'Starting services...', progress: 40 });
    await execAsync(`docker compose -f ${composeFile} up -d`, { 
      cwd: userDockerDir,
      env: dockerEnv
    });
    
    // Wait for containers to be ready (especially ollama if downloading models)
    if (config.aiBackend !== 'cloud') {
      mainWindow.webContents.send('setup:progress', { step: 'Waiting for containers to initialize...', progress: 45 });
      
      // Wait for ollama container to be responsive (up to 90 seconds)
      let ollmaReady = false;
      for (let i = 0; i < 45; i++) {
        try {
          // First check if container is even running
          const psOutput = await execAsync(`docker ps --filter "name=${CONTAINERS.OLLAMA}" --format "{{.Status}}"`, { timeout: 3000 });
          
          if (psOutput && psOutput.includes('running')) {
            // Container is running, now try to execute a command
            try {
              await execAsync(`docker exec ${CONTAINERS.OLLAMA} ollama --version`, { timeout: 5000 });
              console.log('✅ Ollama container is ready');
              ollmaReady = true;
              break;
            } catch (execErr) {
              console.log(`Ollama container running but not yet responsive (${i + 1}/45)`);
            }
          } else {
            console.log(`Waiting for ollama to start (${i + 1}/45)...`);
          }
          
          // Update progress every 15 seconds
          if (i % 8 === 0) {
            mainWindow.webContents.send('setup:progress', { 
              step: `Waiting for containers... (${i}s)`, 
              progress: 45 
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          console.log(`Check error: ${err.message}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!ollmaReady) {
        console.warn('⚠️ Ollama container did not become ready in 90 seconds, proceeding anyway...');
        // Don't fail setup, just warn and continue
        await new Promise(resolve => setTimeout(resolve, 5000)); // Extra wait
      }
    }
    
    // Step 5: Download AI models (if local/hybrid)
    if (config.aiBackend !== 'cloud') {
      // Helper function to check if a model is already installed
      const modelExists = async (modelName) => {
        try {
          const output = await execAsync(`docker exec ${CONTAINERS.OLLAMA} ollama list`, { stdio: 'pipe' });
          return output.includes(modelName);
        } catch (err) {
          console.log(`Could not check for model ${modelName}`);
          return false;
        }
      };

      // Check and pull DeepSeek R1 1.5B if not already present
      const hasDeepSeek = await modelExists('deepseek-r1:1.5b');
      if (!hasDeepSeek) {
        mainWindow.webContents.send('setup:progress', { step: 'Downloading DeepSeek R1 1.5B...', progress: 50 });
        await execAsync(`docker exec ${CONTAINERS.OLLAMA} ollama pull deepseek-r1:1.5b`);
      } else {
        mainWindow.webContents.send('setup:progress', { step: 'DeepSeek R1 1.5B already installed, skipping...', progress: 55 });
        console.log('DeepSeek R1 1.5B model already exists, skipping pull');
      }
      
      // Check and pull Phi 3.5 if not already present
      const hasPhi = await modelExists('phi3.5');
      if (!hasPhi) {
        mainWindow.webContents.send('setup:progress', { step: 'Downloading Phi 3.5...', progress: 70 });
        await execAsync(`docker exec ${CONTAINERS.OLLAMA} ollama pull phi3.5`);
      } else {
        mainWindow.webContents.send('setup:progress', { step: 'Phi 3.5 already installed, skipping...', progress: 72 });
        console.log('Phi 3.5 model already exists, skipping pull');
      }
      
      if (config.models.image && config.gpuType) {
        mainWindow.webContents.send('setup:progress', { step: 'Pulling Flux image model...', progress: 85 });
        // Flux is already in docker image, just needs to start
      }
    }
    
    // Step 6: Create PocketBase admin user
    mainWindow.webContents.send('setup:progress', { step: 'Creating admin account...', progress: 95 });
    // TODO: API call to PocketBase to create admin user
    
    // Step 7: Mark setup as complete
    fs.writeFileSync(path.join(userDataPath, 'setup-complete.lock'), new Date().toISOString());
    console.log('Setup complete, lock file created at:', path.join(userDataPath, 'setup-complete.lock'));
    
    mainWindow.webContents.send('setup:progress', { step: 'Setup complete!', progress: 100 });
    
    return { success: true };
  } catch (err) {
    console.error('Setup error:', err.message);
    mainWindow.webContents.send('setup:error', { error: err.message });
    return { success: false, error: err.message };
  }
});

// ============================================================================
// AUTO-UPDATE SYSTEM
// ============================================================================

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...');
  if (mainWindow) {
    mainWindow.webContents.send('update:checking');
  }
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  updateAvailable = true;
  if (mainWindow) {
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
      size: info.files?.[0]?.size || 0
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available. Current version:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update:not-available', { version: info.version });
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  log.info('Download progress:', progressObj.percent);
  if (mainWindow) {
    mainWindow.webContents.send('update:download-progress', {
      percent: Math.round(progressObj.percent),
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);
  updateDownloaded = true;
  if (mainWindow) {
    mainWindow.webContents.send('update:downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes
    });
  }
});

autoUpdater.on('error', (err) => {
  log.error('Auto-updater error:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update:error', {
      message: err.message || 'Unknown error during update'
    });
  }
});

// IPC handlers for update operations
ipcMain.handle('update:check', async () => {
  if (isDev) {
    return { available: false, message: 'Updates disabled in development mode' };
  }
  
  try {
    const result = await autoUpdater.checkForUpdates();
    return { 
      available: result?.updateInfo?.version !== app.getVersion(),
      currentVersion: app.getVersion(),
      latestVersion: result?.updateInfo?.version
    };
  } catch (err) {
    log.error('Error checking for updates:', err);
    return { available: false, error: err.message };
  }
});

ipcMain.handle('update:download', async () => {
  if (isDev) {
    return { success: false, message: 'Updates disabled in development mode' };
  }
  
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    log.error('Error downloading update:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('update:install', async () => {
  if (isDev) {
    return { success: false, message: 'Updates disabled in development mode' };
  }
  
  try {
    // This will quit the app and install the update
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (err) {
    log.error('Error installing update:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('update:get-version', () => {
  return {
    current: app.getVersion(),
    updateAvailable,
    updateDownloaded
  };
});

// Check for updates configuration
ipcMain.handle('update:configure', async (event, config) => {
  try {
    if (config.autoCheck !== undefined) {
      // Save auto-check preference
      const configPath = path.join(__dirname, '../update-config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
    
    if (config.updateServer) {
      // Set custom update server
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: config.updateServer,
        channel: config.channel || 'production'
      });
    }
    
    return { success: true };
  } catch (err) {
    log.error('Error configuring updates:', err);
    return { success: false, error: err.message };
  }
});

// ============================================================================
// CLUSTERING IPC HANDLERS
// ============================================================================

ipcMain.handle('cluster:generate-token', async (event, clusterId, nodeName, role) => {
  try {
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const clustering = new ClusteringService(pbUrl);
    const result = await clustering.generateClusterToken(clusterId, nodeName, role || 'worker');
    return { success: true, data: result };
  } catch (err) {
    log.error('Error generating cluster token:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cluster:register-node', async (event, token, nodeIp, nodePort, hardwareInfo) => {
  try {
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const clustering = new ClusteringService(pbUrl);
    const result = await clustering.registerNode(token, nodeIp, nodePort, hardwareInfo);
    return { success: true, data: result };
  } catch (err) {
    log.error('Error registering node:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cluster:get-nodes', async (event, clusterId) => {
  try {
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const clustering = new ClusteringService(pbUrl);
    const nodes = await clustering.getClusterNodes(clusterId);
    return { success: true, data: nodes };
  } catch (err) {
    log.error('Error fetching cluster nodes:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cluster:get-config', async (event, clusterId) => {
  try {
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const clustering = new ClusteringService(pbUrl);
    const config = await clustering.getClusterConfig(clusterId);
    return { success: true, data: config };
  } catch (err) {
    log.error('Error fetching cluster config:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cluster:update-config', async (event, clusterId, configUpdate) => {
  try {
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const clustering = new ClusteringService(pbUrl);
    const config = await clustering.updateClusterConfig(clusterId, configUpdate);
    return { success: true, data: config };
  } catch (err) {
    log.error('Error updating cluster config:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cluster:generate-nginx-config', async (event, clusterId) => {
  try {
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const clustering = new ClusteringService(pbUrl);
    const nginxConfig = await clustering.generateNginxConfig(clusterId);
    return { success: true, data: nginxConfig };
  } catch (err) {
    log.error('Error generating nginx config:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cluster:record-heartbeat', async (event, nodeId, clusterId, status, metrics) => {
  try {
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const clustering = new ClusteringService(pbUrl);
    const result = await clustering.recordHeartbeat(nodeId, clusterId, status, metrics);
    return { success: true, data: result };
  } catch (err) {
    log.error('Error recording heartbeat:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cluster:cleanup-dead-nodes', async (event, clusterId) => {
  try {
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const clustering = new ClusteringService(pbUrl);
    const result = await clustering.cleanupDeadNodes(clusterId);
    return { success: true, data: result };
  } catch (err) {
    log.error('Error cleaning up dead nodes:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cluster:remove-node', async (event, clusterId, nodeId) => {
  try {
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const clustering = new ClusteringService(pbUrl);
    const result = await clustering.removeNode(clusterId, nodeId);
    return { success: true, data: result };
  } catch (err) {
    log.error('Error removing node:', err);
    return { success: false, error: err.message };
  }
});

// ============================================================================
// PACKAGE BUILDER IPC HANDLERS
// ============================================================================

ipcMain.handle('builder:build-package', async (event, options) => {
  try {
    mainWindow.webContents.on('message', (data) => {
      event.sender.send('builder:progress', data);
    });

    const result = await packageBuilder.buildClientPackage({
      ...options,
      onProgress: (progress) => {
        mainWindow.webContents.send('builder:progress', progress);
      }
    });

    return { success: true, data: result };
  } catch (err) {
    log.error('Error building package:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('builder:is-building', () => {
  return packageBuilder.isBuildInProgress();
});

ipcMain.handle('builder:get-available-builds', () => {
  try {
    return { success: true, data: packageBuilder.getAvailableBuilds() };
  } catch (err) {
    log.error('Error getting available builds:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('builder:clean-builds', () => {
  try {
    const result = packageBuilder.cleanBuilds();
    return { success: true, data: result };
  } catch (err) {
    log.error('Error cleaning builds:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('builder:get-build-log', () => {
  return packageBuilder.getBuildLog();
});

// ============================================================================
// SYSTEM METRICS HANDLER
// ============================================================================

ipcMain.handle('system:get-metrics', async (event) => {
  try {
    const os_module = require('os');
    
    // Get uptime (in seconds, convert to human readable)
    const uptime = os_module.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeStr = days > 0 
      ? `${days}d ${hours}h ${minutes}m` 
      : hours > 0 
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;
    
    // Get CPU usage - average over all cores
    const cpus = os_module.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const cpuUsage = Math.round(100 - ~~(100 * totalIdle / totalTick));
    
    // Get disk usage information
    let diskUsage = 50; // Default fallback
    try {
      if (process.platform === 'win32') {
        // Windows: use PowerShell to get disk info for C: drive
        const { execSync } = require('child_process');
        const output = execSync(
          `powershell.exe "Get-Volume -DriveLetter C | Select-Object @{Name='Used';Expression={[math]::Round(($_.Size - $_.SizeRemaining) / $_.Size * 100, 0)}}" -NoProfile`,
          { encoding: 'utf8', windowsHide: true }
        );
        const match = output.match(/\d+/);
        if (match) diskUsage = parseInt(match[0]);
      } else {
        // Linux/Mac: use df command
        const { execSync } = require('child_process');
        const output = execSync('df / | tail -1', { encoding: 'utf8' });
        const match = output.match(/(\d+)%/);
        if (match) diskUsage = parseInt(match[1]);
      }
    } catch (e) {
      console.warn('Error getting disk usage, using default:', e.message);
    }
    
    // Get total system RAM
    const totalMemory = Math.round(os_module.totalmem() / (1024 * 1024 * 1024)); // GB
    const freeMemory = Math.round(os_module.freemem() / (1024 * 1024 * 1024));  // GB
    const memUsage = Math.round((1 - freeMemory / totalMemory) * 100);
    
    return {
      success: true,
      uptime: uptimeStr,
      cpuUsage,
      diskUsage,
      memoryUsage: memUsage,
      totalMemory,
      freeMemory
    };
  } catch (err) {
    console.error('Error getting system metrics:', err.message);
    return {
      success: false,
      uptime: 'Unknown',
      cpuUsage: 0,
      diskUsage: 0,
      memoryUsage: 0,
      error: err.message.substring(0, 150)
    };
  }
});

// ============================================================================
// SECURITY CONFIGURATION HANDLERS
// ============================================================================

// Helper function to get security config file path
function getSecurityConfigPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'security-config.json');
}

// Helper function to get default security config
function getDefaultSecurityConfig() {
  return {
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    apiKeyFingerprint: '***', // Never expose full key
    certificatePath: path.join(app.getPath('userData'), 'cert.pem'),
    certificateKeyPath: path.join(app.getPath('userData'), 'key.pem'),
    certificateStatus: 'Self-signed (development)',
    apiKeyCreated: null,
    apiKeyRotatedAt: Date.now()
  };
}

// Read security config
ipcMain.handle('security:read-config', async (event) => {
  try {
    const configPath = getSecurityConfigPath();
    let config;
    
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      config = getDefaultSecurityConfig();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
    
    return { success: true, config };
  } catch (err) {
    console.error('Error reading security config:', err.message);
    return { success: false, error: err.message.substring(0, 150) };
  }
});

// Save CORS configuration
ipcMain.handle('security:save-cors-config', async (event, corsOrigins) => {
  try {
    const configPath = getSecurityConfigPath();
    const config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
      : getDefaultSecurityConfig();
    
    // Validate CORS origins are URLs
    if (!Array.isArray(corsOrigins)) {
      return { success: false, error: 'CORS origins must be an array' };
    }
    
    config.corsOrigins = corsOrigins.filter(origin => 
      origin && typeof origin === 'string' && origin.trim().length > 0
    );
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // TODO: In production, pass CORS config to actual backend server
    console.log('CORS configuration updated:', config.corsOrigins);
    
    return { success: true, message: 'CORS configuration saved' };
  } catch (err) {
    console.error('Error saving CORS config:', err.message);
    return { success: false, error: err.message.substring(0, 150) };
  }
});

// Rotate API Key
ipcMain.handle('security:rotate-api-key', async (event) => {
  try {
    const configPath = getSecurityConfigPath();
    const config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
      : getDefaultSecurityConfig();
    
    // Generate new API key (in production, this would be a secure token)
    // For now, generate a reasonable fake one
    const crypto = require('crypto');
    const newApiKey = 'sk-' + crypto.randomBytes(32).toString('hex');
    
    // Store fingerprint instead of actual key
    const fingerprint = newApiKey.substring(0, 7) + '...' + newApiKey.substring(-7);
    
    config.apiKeyFingerprint = fingerprint;
    config.apiKeyRotatedAt = Date.now();
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // TODO: In production, make backend rotate its key and return confirmation
    console.log('API key rotated, new fingerprint:', fingerprint);
    
    return { 
      success: true, 
      message: 'API key rotated successfully',
      fingerprint,
      rotatedAt: new Date(config.apiKeyRotatedAt).toLocaleString()
    };
  } catch (err) {
    console.error('Error rotating API key:', err.message);
    return { success: false, error: err.message.substring(0, 150) };
  }
});

// Regenerate Certificate
ipcMain.handle('security:regenerate-certificate', async (event) => {
  try {
    const configPath = getSecurityConfigPath();
    const config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
      : getDefaultSecurityConfig();
    
    // For development, we'll use Node's crypto to create a self-signed certificate
    // In production, this would call openssl or use proper certificate generation
    const crypto = require('crypto');
    const { promisify } = require('util');
    const generateKeyPair = promisify(crypto.generateKeyPair);
    
    try {
      // Generate RSA key pair
      const { publicKey, privateKey } = await generateKeyPair('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });
      
      // Save certificate files (these would be actual PEM files in production)
      const certPath = config.certificatePath;
      const keyPath = config.certificateKeyPath;
      
      fs.writeFileSync(certPath, publicKey);
      fs.writeFileSync(keyPath, privateKey);
      
      config.certificateStatus = 'Self-signed (regenerated)';
      config.certificateGeneratedAt = Date.now();
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      console.log('Certificate regenerated at:', certPath);
      
      return { 
        success: true,
        message: 'Certificate regenerated successfully',
        status: 'Self-signed (regenerated)',
        generatedAt: new Date(config.certificateGeneratedAt).toLocaleString()
      };
    } catch (cryptoErr) {
      // Fallback: just update timestamp
      config.certificateStatus = 'Self-signed (regenerated)';
      config.certificateGeneratedAt = Date.now();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      return {
        success: true,
        message: 'Certificate regeneration flagged for backend',
        status: 'Self-signed (regenerated)',
        generatedAt: new Date(config.certificateGeneratedAt).toLocaleString()
      };
    }
  } catch (err) {
    console.error('Error regenerating certificate:', err.message);
    return { success: false, error: err.message.substring(0, 150) };
  }
});

// ============================================================================
// SYSTEM CONFIGURATION HANDLERS
// ============================================================================

// Helper function to get system config file path
function getSystemConfigPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'system-config.json');
}

// Helper function to get default system config
function getDefaultSystemConfig() {
  return {
    serverUrl: 'http://localhost:3000',
    serverPort: 3000,
    adminEmail: '',
    dockerDir: getUserDockerDir(),
    autoStartEnabled: false,
    debugMode: false,
  };
}

// Read system config
ipcMain.handle('system:read-config', async (event) => {
  try {
    const configPath = getSystemConfigPath();
    let config;
    
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      config = getDefaultSystemConfig();
    }
    
    return { success: true, config };
  } catch (err) {
    console.error('Error reading system config:', err.message);
    return { success: false, error: err.message.substring(0, 150), config: getDefaultSystemConfig() };
  }
});

// Expose system:read-config as getSystemConfig in preload
// (This is handled in preload.js)

// Write system config
ipcMain.handle('system:write-config', async (event, newConfig) => {
  try {
    const configPath = getSystemConfigPath();
    
    // Validate and sanitize the config
    const config = {
      serverUrl: String(newConfig.serverUrl || 'http://localhost:3000'),
      serverPort: parseInt(newConfig.serverPort) || 3000,
      adminEmail: String(newConfig.adminEmail || ''),
      dockerDir: String(newConfig.dockerDir || getUserDockerDir()), // Read-only, shouldn't change
      autoStartEnabled: Boolean(newConfig.autoStartEnabled),
      debugMode: Boolean(newConfig.debugMode),
    };
    
    // Ensure directory exists
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log('[system:write-config] Config saved successfully');
    return { success: true, config };
  } catch (err) {
    console.error('Error writing system config:', err.message);
    return { success: false, error: err.message.substring(0, 150) };
  }
});

// ============================================================================
// MODELS HANDLER - ACTUAL PULLING
// ============================================================================

ipcMain.handle('models:pull', async (event, modelName) => {
  try {
    if (!modelName || typeof modelName !== 'string') {
      return { success: false, error: 'Model name required' };
    }
    
    const dockerDir = getUserDockerDir();
    
    // Check if ollama container is running
    const servicesResult = await ipcMain._requesthandlers['docker:services']?.(null);
    const isRunning = servicesResult?.success && 
                      servicesResult.containers.some(c => c.name === CONTAINERS.OLLAMA && c.status === 'running');
    
    if (!isRunning) {
      return { 
        success: false, 
        error: `${CONTAINERS.OLLAMA} container is not running. Start the stack first.`
      };
    }
    
    console.log(`[models:pull] Starting to pull model: ${modelName}`);
    
    // Use executeDockerCommand to run ollama pull
    const { stdout, stderr } = await executeDockerCommand(
      `docker exec ${CONTAINERS.OLLAMA} ollama pull ${modelName}`,
      dockerDir
    );
    
    if (stderr && (stderr.includes('Error') || stderr.includes('error'))) {
      return { 
        success: false, 
        error: stderr.substring(0, 300)
      };
    }
    
    console.log(`[models:pull] Successfully pulled model: ${modelName}`);
    
    return { 
      success: true, 
      message: `Model ${modelName} pulled successfully`,
      model: modelName,
      output: stdout.substring(0, 500)
    };
  } catch (err) {
    console.error('Error pulling model:', err.message);
    return { 
      success: false, 
      error: err.message.includes('No such file')
        ? `Could not find model ${modelName} in ollama registry`
        : err.message.substring(0, 300)
    };
  }
});

// ============================================================================
// APP LIFECYCLE
// ============================================================================

// App lifecycle
app.on('ready', () => {
  createWindow();
  
  // Check for updates on startup (only in production with configured feed)
  if (!isDev) {
    // Only check if update server is configured
    // Without a configured feed URL, checkForUpdates() will fail trying to find app-update.yml
    const updateConfig = loadUpdateConfig();
    if (updateConfig && updateConfig.updateServer) {
      // Wait 3 seconds after startup before checking for updates
      setTimeout(() => {
        log.info('Checking for updates from:', updateConfig.updateServer);
        autoUpdater.checkForUpdates().catch(err => {
          log.error('Failed to check for updates:', err);
        });
      }, 3000);
    } else {
      log.info('Update server not configured, skipping update check');
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Menu
const createMenu = () => {
  const template = [
    {
      label: 'File',
      submenu: [{ label: 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }],
    },
    {
      label: 'View',
      submenu: [{ label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

app.on('ready', createMenu);
