const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const nativePM = require('./nativeProcessManager');
// Ollama manager removed — now using universal llm-engine (llama.cpp)
const serviceUpdatesManager = require('./serviceUpdatesManager');
const { startSearchServer, stopSearchServer } = require('./searchModule');
const { startLocalAppServer, stopLocalAppServer, getLocalAppPort } = require('./localAppServer');
const localBackend = require('./localBackendManager');

const isDev = !app.isPackaged;
let mainWindow;
let updateDetectorInterval = null;

// ── Single Instance Lock ────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // Another instance is already running — exit immediately
  // Use app.exit() not app.quit() to prevent ready event from firing
  app.exit(0);
} else {
  app.on('second-instance', () => {
    // Someone tried to open a second instance — focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ── Log streaming infrastructure ────────────────────────────────────────────
const LOG_DIR = path.join(os.homedir(), '.alloflow', 'logs');
const logBuffers = {
  main: [],
  'llm-engine': [],
  piper: [],
  flux: []
};
const MAX_BUFFER_SIZE = 1000; // Keep last 1000 lines in memory

// Ensure log directory exists
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Append to log and stream to UI
function logToService(service, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  
  // Keep in buffer
  if (logBuffers[service]) {
    logBuffers[service].push(logEntry);
    if (logBuffers[service].length > MAX_BUFFER_SIZE) {
      logBuffers[service].shift();
    }
  }
  
  // Write to file
  try {
    ensureLogDir();
    const logFile = path.join(LOG_DIR, `${service}.log`);
    fs.appendFileSync(logFile, logEntry + '\n');
  } catch (err) {
    console.error(`[logs] Failed to write to ${service}.log:`, err.message);
  }
  
  // Stream to UI
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(`logs:${service}`, {
      line: logEntry,
      timestamp
    });
  }
}

// Override console.log to capture main process logs
const originalLog = console.log;
console.log = (...args) => {
  originalLog(...args);
  const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
  logToService('main', message);
};

const originalError = console.error;
console.error = (...args) => {
  originalError(...args);
  const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
  logToService('main', `ERROR: ${message}`);
};

const originalWarn = console.warn;
console.warn = (...args) => {
  originalWarn(...args);
  const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
  logToService('main', `WARN: ${message}`);
};

// Start unified service update detector (checks LM Studio, Piper, Flux every 24 hours)
function startServiceUpdateDetector() {
  if (updateDetectorInterval) return; // Already running
  
  const checkForUpdates = async () => {
    try {
      const updates = await serviceUpdatesManager.checkAllUpdates();
      console.log('[updates] Update check completed:',
        'llm-engine=' + (updates['llm-engine']?.available ? '✓' : '✗'),
        'piper=' + (updates.piper?.available ? '✓' : '✗'),
        'flux=' + (updates.flux?.available ? '✓' : '✗')
      );
    } catch (err) {
      // Silently fail — update checks are non-critical
      console.warn('[updates] Update check error:', err.message);
    }
  };
  
  // Check immediately (with a small delay to not block startup), then every 24 hours
  setTimeout(checkForUpdates, 5000); // Wait 5 seconds after startup to check
  updateDetectorInterval = setInterval(checkForUpdates, 24 * 60 * 60 * 1000);
  console.log('[updates] Service update detector started');
}

// Stop update detector on app quit
function stopServiceUpdateDetector() {
  if (updateDetectorInterval) {
    clearInterval(updateDetectorInterval);
    updateDetectorInterval = null;
    console.log('[updates] Service update detector stopped');
  }
}



// AlloFlow config directory and files
const ALLOFLOW_DIR = path.join(os.homedir(), '.alloflow');
const CONFIG_FILE = path.join(ALLOFLOW_DIR, 'config.json');
const AI_CONFIG_FILE = path.join(ALLOFLOW_DIR, 'ai_config.json');
const VERSION_FILE = path.join(ALLOFLOW_DIR, 'version.json');
const DEPLOYMENT_MANIFEST  = path.join(ALLOFLOW_DIR, 'deployment.json');
const LOCAL_CONFIG_FILE    = path.join(ALLOFLOW_DIR, 'local_config.json');

// ── Local config helpers (C3.1) ──────────────────────────────────────────────
const LOCAL_CONFIG_DEFAULTS = {
  llmEngineUrl: 'http://localhost:1234',
  sqliteUrl:    'http://localhost:3747',
  piperEnabled: true,
  defaultModel: 'llama3.2:3b',
};

function readLocalConfig() {
  try {
    if (fs.existsSync(LOCAL_CONFIG_FILE)) {
      return { ...LOCAL_CONFIG_DEFAULTS, ...JSON.parse(fs.readFileSync(LOCAL_CONFIG_FILE, 'utf-8')) };
    }
  } catch (err) {
    console.warn('[local-config] Read error:', err.message);
  }
  return { ...LOCAL_CONFIG_DEFAULTS };
}

function writeLocalConfig(cfg) {
  try {
    ensureAlloFlowDir();
    const merged = { ...LOCAL_CONFIG_DEFAULTS, ...cfg };
    fs.writeFileSync(LOCAL_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    console.log('[local-config] Saved:', LOCAL_CONFIG_FILE);
    return true;
  } catch (err) {
    console.error('[local-config] Write error:', err.message);
    return false;
  }
}

// Get installer version from package.json
function getInstallerVersion() {
  try {
    const pkg = require('../package.json');
    return pkg.version;
  } catch { return '0.0.0'; }
}

const INSTALLER_VERSION = getInstallerVersion();

// Ensure AlloFlow directory exists
function ensureAlloFlowDir() {
  if (!fs.existsSync(ALLOFLOW_DIR)) {
    fs.mkdirSync(ALLOFLOW_DIR, { recursive: true });
    console.log('[setup:init] Created AlloFlow config directory at', ALLOFLOW_DIR);
  }
}

// Check if AlloFlow is already installed
function isInstalled() {
  const exists = fs.existsSync(CONFIG_FILE);
  console.log('[setup:check] Config file exists:', exists, 'at', CONFIG_FILE);
  return exists;
}

// Get current config
function getConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      console.log('[setup:config] Loaded config:', config.deploymentType);
      return config;
    }
  } catch (err) {
    console.error('[setup:config] Error reading config:', err.message);
  }
  return null;
}

// Save config
function saveConfig(config) {
  try {
    ensureAlloFlowDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    // Also save installer version when config is saved
    fs.writeFileSync(VERSION_FILE, JSON.stringify({
      installerVersion: INSTALLER_VERSION,
      savedAt: new Date().toISOString()
    }, null, 2));
    console.log('[setup:config] Saved config for deployment type:', config.deploymentType);
    return true;
  } catch (err) {
    console.error('[setup:config] Error saving config:', err.message);
    return false;
  }
}

// Check if installed version differs from installer version
function isVersionMismatch() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      const versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
      const mismatch = versionData.installerVersion !== INSTALLER_VERSION;
      if (mismatch) {
        console.log('[version:check] Version mismatch: installed', versionData.installerVersion, 'vs installer', INSTALLER_VERSION);
      }
      return mismatch;
    }
  } catch (err) {
    console.warn('[version:check] Could not check version:', err.message);
  }
  return false;
}

// Get deployment manifest (tracks which services are installed)
function getDeploymentManifest() {
  try {
    if (fs.existsSync(DEPLOYMENT_MANIFEST)) {
      return JSON.parse(fs.readFileSync(DEPLOYMENT_MANIFEST, 'utf-8'));
    }
  } catch (err) {
    console.warn('[manifest] Could not read manifest:', err.message);
  }
  return null;
}

// Save deployment manifest
function saveDeploymentManifest(manifest) {
  try {
    ensureAlloFlowDir();
    fs.writeFileSync(DEPLOYMENT_MANIFEST, JSON.stringify(manifest, null, 2));
    console.log('[manifest] Saved deployment manifest');
  } catch (err) {
    console.error('[manifest] Error saving manifest:', err.message);
  }
}

// Docker functions removed — services now run natively via nativeProcessManager.js

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);

  // Prevent renderer from opening new BrowserWindows (e.g. window.open)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external URLs in the system browser instead
    if (url.startsWith('http://') || url.startsWith('https://')) {
      require('electron').shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Register main window with update manager
  serviceUpdatesManager.setMainWindow(mainWindow);

  // DevTools disabled for production
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', async () => {
  // Guard: if we didn't get the single-instance lock, do nothing
  if (!gotTheLock) return;
  
  console.log('[app:ready] AlloFlow Admin starting...');
  
  // Show the window IMMEDIATELY so the user sees something
  createWindow();

  // Initialize services in the background (non-blocking)
  initServices().catch(err => {
    console.error('[app:ready] Service init error (non-fatal):', err.message);
  });
});

async function initServices() {
  // Start the built-in search server
  try {
    const searchPort = await startSearchServer(8888);
    console.log('[app:ready] Search server started on port', searchPort);
  } catch (err) {
    console.error('[app:ready] Failed to start search server:', err.message);
  }

  // Start the local app server + SQLite backend (B4.4)
  try {
    const localConfig = readLocalConfig();
    const sqlitePort  = parseInt((localConfig.sqliteUrl || '').split(':').pop(), 10) || 3747;
    await localBackend.start(sqlitePort, app.isPackaged);
    console.log('[app:ready] Local SQLite backend started on port', localBackend.getPort());
  } catch (err) {
    console.warn('[app:ready] Local SQLite backend failed to start:', err.message);
  }

  try {
    const localPort = await startLocalAppServer(3730, app.isPackaged);
    console.log('[app:ready] Local app server started on port', localPort);
  } catch (err) {
    console.warn('[app:ready] Local app server failed to start:', err.message);
  }

  // If already configured, start native services
  const config = getConfig();
  if (config && config.deploymentType === 'local') {
    console.log('[app:ready] Existing local config found, auto-starting services...');
    const selectedServices = config.selectedServices || [];
    
    for (const serviceId of selectedServices) {
      const svcDef = SERVICE_DEFINITIONS[serviceId];
      if (!svcDef) {
        console.warn(`[app:ready] Service definition not found: ${serviceId}`);
        continue;
      }
      
      if (svcDef.builtin) {
        console.log(`[app:ready] Skipping builtin service: ${serviceId}`);
        continue;
      }
      
      if (!nativePM.isServiceInstalled(serviceId)) {
        console.warn(`[app:ready] Service not installed (will skip): ${serviceId}`);
        continue;
      }
      
      try {
        console.log(`[app:ready] Starting service: ${serviceId}`);
        nativePM.startService(serviceId);
        console.log(`[app:ready] ✓ ${serviceId} started`);
      } catch (err) {
        console.error(`[app:ready] Failed to start ${serviceId}:`, err.message);
      }
    }
    
    // Wait for LM Studio (llm-engine) in background — no longer blocks window
    if (selectedServices.includes('llm-engine')) {
      try {
        // Give LM Studio time to start and become healthy
        const maxAttempts = 30;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const response = await fetch('http://127.0.0.1:1234/v1/models', { timeout: 1000 });
            if (response.ok) {
              console.log('[app:ready] ✓ LM Studio is healthy');
              break;
            }
          } catch (e) {
            if (attempt === maxAttempts - 1) throw e;
          }
          await new Promise(r => setTimeout(r, 1000)); // Wait 1 second before retry
        }
      } catch (err) {
        console.warn('[app:ready] LM Studio did not become healthy quickly:', err.message);
      }
    }
  } else if (config) {
    console.log('[app:ready] Non-local deployment detected:', config.deploymentType);
  } else {
    console.log('[app:ready] No configuration found - will show setup wizard');
  }

  // Start service update detector
  startServiceUpdateDetector();
}

app.on('window-all-closed', () => {
  nativePM.stopAllServices();
  stopSearchServer();
  stopLocalAppServer();
  localBackend.stop();
  stopServiceUpdateDetector();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  nativePM.stopAllServices();
  stopSearchServer();
  stopLocalAppServer();
  localBackend.stop();
  stopServiceUpdateDetector();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers

// Check if setup has been completed
ipcMain.handle('setup:check', async (event) => {
  try {
    console.log('[setup:check] Checking installation state...');
    const installed = isInstalled();
    const config = getConfig();
    
    console.log('[setup:check] Result - installed:', installed, 'deploymentType:', config?.deploymentType);
    
    return {
      installed,
      config: config || null
    };
  } catch (err) {
    console.error('[setup:check] Error:', err.message);
    return {
      installed: false,
      error: err.message
    };
  }
});

// Save setup configuration
ipcMain.handle('setup:save-config', async (event, setupData) => {
  try {
    console.log('[setup:save] Saving setup configuration for:', setupData.deploymentType);
    
    const config = {
      deploymentType: setupData.deploymentType,
      setupDate: new Date().toISOString(),
      ...setupData
    };
    
    const success = saveConfig(config);

    // C3.2 — Write local_config.json when saving a local deployment
    if (success && (setupData.deploymentType === 'local' || setupData.deploymentType === 'hybrid')) {
      const localCfg = {
        llmEngineUrl: setupData.llmEngineUrl || LOCAL_CONFIG_DEFAULTS.llmEngineUrl,
        sqliteUrl:    setupData.sqliteUrl    || LOCAL_CONFIG_DEFAULTS.sqliteUrl,
        piperEnabled: setupData.piperEnabled !== false,
        defaultModel: setupData.defaultModel || LOCAL_CONFIG_DEFAULTS.defaultModel,
      };
      writeLocalConfig(localCfg);
      console.log('[setup:save] local_config.json written for local deployment');
    }
    
    if (success) {
      console.log('[setup:save] Configuration saved successfully');
      return { success: true };
    } else {
      return { success: false, error: 'Failed to save configuration' };
    }
  } catch (err) {
    console.error('[setup:save] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// Get config for updates
ipcMain.handle('setup:get-config', async (event) => {
  try {
    const config = getConfig();
    if (config) {
      console.log('[setup:get-config] Returning config for deployment type:', config.deploymentType);
      return { success: true, config };
    } else {
      return { success: false, error: 'No configuration found' };
    }
  } catch (err) {
    console.error('[setup:get-config] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// Check system requirements (replaces Docker check)
ipcMain.handle('setup:check-docker', async (event, deploymentType) => {
  // No longer requires Docker — services run natively
  console.log('[setup:check-requirements] Deployment type:', deploymentType);
  return { required: false, installed: true };
});

// Browse for folder
ipcMain.handle('setup:browse-folder', async (event, defaultPath) => {
  try {
    console.log('[setup:browse-folder] Opening folder browser, default:', defaultPath);
    
    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath: defaultPath || os.homedir(),
      properties: ['openDirectory', 'createDirectory']
    });
    
    if (result.canceled) {
      console.log('[setup:browse-folder] User canceled');
      return { canceled: true };
    }
    
    const folderPath = result.filePaths[0];
    console.log('[setup:browse-folder] Selected:', folderPath);
    
    return { canceled: false, path: folderPath };
  } catch (err) {
    console.error('[setup:browse-folder] Error:', err.message);
    return { canceled: true, error: err.message };
  }
});

// ============================================================================
// HARDWARE DETECTION & SERVICE MANAGEMENT
// ============================================================================

const { SERVICE_DEFINITIONS, HARDWARE_PROFILES } = require('./serviceDefinitions');

// Detect hardware capabilities
function detectHardware() {
  try {
    console.log('[hardware:detect] Starting hardware detection...');
    const { execSync } = require('child_process');
    
    const cpuCores = os.cpus().length;
    const totalRAM = os.totalmem();
    const ramGB = Math.round(totalRAM / (1024 * 1024 * 1024));
    
    let diskSpaceGB = 0;
    try {
      if (process.platform === 'win32') {
        const driveLetter = ALLOFLOW_DIR.split(':')[0];
        const result = execSync(`fsutil volume diskfree ${driveLetter}:`, { encoding: 'utf-8' });
        const freeBytes = parseInt(result.split('\n')[1].split(' ')[0]);
        diskSpaceGB = Math.round(freeBytes / (1024 * 1024 * 1024));
      } else {
        const result = execSync(`df -B1 ${ALLOFLOW_DIR} | tail -1`, { encoding: 'utf-8' });
        const freeBytes = parseInt(result.trim().split(/\s+/)[3]);
        diskSpaceGB = Math.round(freeBytes / (1024 * 1024 * 1024));
      }
    } catch (err) {
      console.warn('[hardware:detect] Could not get disk space:', err.message);
      diskSpaceGB = 100;
    }
    
    let gpu = null;
    try {
      if (process.platform === 'win32') {
        try {
          const wmicResult = execSync('wmic path win32_VideoController get name,adapterram /format:csv', {
            stdio: 'pipe', encoding: 'utf-8'
          });
          const lines = wmicResult.trim().split('\n').filter(l => l.trim() && !l.startsWith('Node'));
          for (const line of lines) {
            const parts = line.split(',').map(s => s.trim());
            const adapterRAM = parts.length >= 2 ? parseInt(parts[1]) : 0;
            const gpuName = parts.length >= 3 ? parts[2] : '';
            if (!gpuName || gpuName.includes('Virtual') || gpuName.includes('Basic') || gpuName.includes('Microsoft')) continue;
            
            let vramGB = Math.round(adapterRAM / (1024 * 1024 * 1024));
            if (gpuName.includes('9070 XT')) vramGB = 16;
            else if (gpuName.includes('9070') && !gpuName.includes('XT')) vramGB = 12;
            else if (gpuName.includes('7900 XTX')) vramGB = 24;
            else if (gpuName.includes('7900 XT')) vramGB = 20;
            else if (gpuName.includes('4090')) vramGB = 24;
            else if (gpuName.includes('4080')) vramGB = 16;
            else if (gpuName.includes('4070 Ti Super')) vramGB = 16;
            else if (gpuName.includes('4070 Ti')) vramGB = 12;
            else if (gpuName.includes('4070')) vramGB = 12;
            else if (gpuName.includes('3090')) vramGB = 24;
            else if (gpuName.includes('3080')) vramGB = 10;
            else if (vramGB <= 0 || vramGB > 48) vramGB = 'unknown';
            
            const gpuType = gpuName.includes('AMD') || gpuName.includes('Radeon') ? 'AMD' :
                            gpuName.includes('NVIDIA') || gpuName.includes('GeForce') || gpuName.includes('RTX') || gpuName.includes('GTX') ? 'NVIDIA' :
                            gpuName.includes('Intel') || gpuName.includes('Arc') ? 'Intel' : 'Unknown';
            
            gpu = { type: gpuType, name: gpuName, vramGB };
            console.log('[hardware:detect] Detected GPU:', gpuName, '-', vramGB, 'GB VRAM (' + gpuType + ')');
            break;
          }
        } catch (wmicErr) {
          console.warn('[hardware:detect] WMI GPU detection failed:', wmicErr.message);
        }
      } else {
        try {
          const nvidiaResult = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', {
            stdio: 'pipe', encoding: 'utf-8'
          });
          const [gpuName, vramStr] = nvidiaResult.trim().split(',').map(s => s.trim());
          gpu = { type: 'NVIDIA', name: gpuName, vramGB: parseInt(vramStr) };
        } catch (nvidiaErr) {
          try {
            const lspciResult = execSync('lspci | grep -i vga', { stdio: 'pipe', encoding: 'utf-8' });
            if (lspciResult.includes('AMD') || lspciResult.includes('ATI')) {
              gpu = { type: 'AMD', name: lspciResult.trim().split(':').pop().trim(), vramGB: 'detected' };
            } else if (lspciResult.includes('NVIDIA')) {
              gpu = { type: 'NVIDIA', name: lspciResult.trim().split(':').pop().trim(), vramGB: 'detected' };
            }
          } catch (e) { /* no GPU */ }
        }
      }
    } catch (err) {
      console.log('[hardware:detect] GPU detection error:', err.message);
    }
    
    let tier = 'entryLevel';
    if (ramGB >= 16 && cpuCores >= 8 && diskSpaceGB >= 100) tier = 'workstation';
    else if (ramGB >= 8 && cpuCores >= 4 && diskSpaceGB >= 50) tier = 'midRange';
    
    console.log('[hardware:detect] Classified as:', tier);
    
    return { cpuCores, ramGB, diskSpaceGB, gpu, tier, tierProfile: HARDWARE_PROFILES[tier] };
  } catch (err) {
    console.error('[hardware:detect] Error:', err.message);
    return {
      cpuCores: os.cpus().length,
      ramGB: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
      diskSpaceGB: 100, gpu: null, tier: 'entryLevel',
      tierProfile: HARDWARE_PROFILES.entryLevel, error: err.message
    };
  }
}

// ── Native Deployment ─────────────────────────────────────────────────────────
// Downloads binaries, starts native processes — no Docker required.

async function startDeployment(setupData, onProgress) {
  try {
    console.log('[deploy:start] Starting native deployment for:', setupData.deploymentType);
    console.log('[deploy:start] Installer version:', INSTALLER_VERSION);
    
    // Check if version has changed
    const versionChanged = isVersionMismatch();
    if (versionChanged) {
      console.log('[deploy:start] Version mismatch detected, will update services');
    } else {
      console.log('[deploy:start] Version unchanged, checking if redeploy needed...');
    }
    
    const selectedServices = setupData.selectedServices || [];
    const servicesToInstall = selectedServices.filter(
      id => SERVICE_DEFINITIONS[id] && !SERVICE_DEFINITIONS[id].builtin
    );

    // Detect GPU info to configure Flux and LM Studio with appropriate backend
    const hardware = detectHardware();
    const gpuInfo = hardware.gpu || null;
    
    // ─ SERVICE SELECTION ───────────────────────────────────────────────────────
    // For all systems: Use llm-engine (LM Studio with llama.cpp)
    // LM Studio automatically selects the right backend:
    // - NVIDIA → CUDA backend
    // - AMD → ROCm backend  
    // - Apple Silicon → Metal backend
    // - CPU → CPU inference fallback
    
    let finalServiceList = [...servicesToInstall];
    
    // Ensure llm-engine is always included for LLM functionality
    if (!finalServiceList.includes('llm-engine')) {
      finalServiceList.push('llm-engine');
      console.log('[deploy:start] Added llm-engine (LM Studio with llama.cpp) for universal GPU support');
    }
    
    // Remove deprecated Ollama or llama-studio references if they exist
    finalServiceList = finalServiceList.filter(s => s !== 'ollama' && s !== 'llama-studio');
    
    // Use the universal service list
    const servicesToInstallFinal = finalServiceList;
    
    // PHASE 0: Check if deployment is needed (skip if version unchanged and no new services)
    let needsInstallation = true;
    if (!versionChanged) {
      const manifest = getDeploymentManifest();
      if (manifest && manifest.services) {
        const newServices = servicesToInstallFinal.filter(s => !manifest.services.includes(s));
        if (newServices.length === 0 && servicesToInstallFinal.every(s => manifest.services.includes(s))) {
          // All services already deployed — skip download/install but still start and health-check
          console.log('[deploy:start] All services already deployed at current version, skipping installation...');
          onProgress({ phase: 'preflight', status: 'Services already installed, starting them up...', progress: 10 });
          needsInstallation = false;
        }
      }
    }
    
    // PHASE 2: Install services (download binaries) - only if needed
    const totalToInstall = servicesToInstallFinal.length;
    let installed = 0;
    
    if (needsInstallation) {
    
    for (const serviceId of servicesToInstallFinal) {
      const svcDef = SERVICE_DEFINITIONS[serviceId];
      if (!svcDef) continue;
      
      const baseProgress = 10 + (installed / totalToInstall) * 60;
      
      if (nativePM.isServiceInstalled(serviceId)) {
        console.log(`[deploy:start] ${serviceId} already installed, skipping download`);
        onProgress({
          phase: 'install',
          status: `${svcDef.name} already installed`,
          progress: baseProgress + 60 / totalToInstall
        });
        // Always re-copy flux_server.py to ensure latest version is deployed
        if (serviceId === 'flux') {
          try {
            const updated = nativePM.updateFluxServerScript();
            if (updated) {
              // Stop the running flux process so Phase 3 restarts it with the updated script
              try { nativePM.stopService('flux'); } catch {}
            }
          } catch (e) {
            console.warn('[deploy] Failed to update flux_server.py:', e.message);
          }
        }
        // Always ensure piper voice model is present (may be missing on update from older install)
        if (serviceId === 'piper') {
          nativePM.ensurePiperVoiceModel().catch((e) => {
            console.warn('[deploy] Piper voice model check failed (non-fatal):', e.message);
          });
        }
      } else {
        onProgress({
          phase: 'install',
          status: `Installing ${svcDef.name}...`,
          progress: baseProgress
        });
        
        await nativePM.installService(serviceId, (p) => {
          onProgress({
            phase: 'install',
            status: p.status,
            progress: baseProgress + (p.progress / 100) * (60 / totalToInstall),
            gpuStrategy: p.gpuStrategy || undefined
          });
        }, gpuInfo);
      }
      
      installed++;
    }
    
    } // End of needsInstallation block (only skips download/install)
    
    // PHASE 3: Start services (always runs — ensures services are up)
    onProgress({ phase: 'starting', status: 'Starting services...', progress: 70 });
    
    for (const serviceId of servicesToInstallFinal) {
      const svcDef = SERVICE_DEFINITIONS[serviceId];
      if (!svcDef) continue;
      
      onProgress({
        phase: 'starting',
        status: `Starting ${svcDef.name}...`,
        progress: 70 + (servicesToInstallFinal.indexOf(serviceId) / servicesToInstallFinal.length) * 15
      });
      
      try {
        nativePM.startService(serviceId);
      } catch (err) {
        console.error(`[deploy:start] Failed to start ${serviceId}:`, err.message);
        // Non-fatal: continue with other services
      }
    }
    
    // PHASE 4: Health checks (always runs)
    onProgress({ phase: 'healthcheck', status: 'Waiting for services to become healthy...', progress: 85 });
    
    for (const serviceId of servicesToInstall) {
      const svcDef = SERVICE_DEFINITIONS[serviceId];
      if (!svcDef || !svcDef.healthCheck) continue;
      
      onProgress({
        phase: 'healthcheck',
        status: `Waiting for ${svcDef.name}...`,
        progress: 85 + (servicesToInstall.indexOf(serviceId) / servicesToInstall.length) * 10
      });
      
      let isHealthy = false;
      for (let i = 0; i < svcDef.healthCheck.maxRetries; i++) {
        try {
          const http = require('http');
          await new Promise((resolve, reject) => {
            const req = http.get(svcDef.healthCheck.endpoint, (res) => {
              if (res.statusCode >= 200 && res.statusCode < 300) resolve();
              else reject(new Error(`Status ${res.statusCode}`));
            });
            req.on('error', reject);
            req.setTimeout(svcDef.healthCheck.timeout, () => { req.destroy(); reject(new Error('Timeout')); });
          });
          isHealthy = true;
          console.log(`[deploy:start] ${serviceId} is healthy`);
          break;
        } catch {
          if (i < svcDef.healthCheck.maxRetries - 1) {
            await new Promise(r => setTimeout(r, svcDef.healthCheck.retryInterval));
          }
        }
      }
      
      if (!isHealthy) {
        console.warn(`[deploy:start] ${serviceId} may not be fully healthy yet`);
      }
    }

    // PHASE 5: Configure LM Studio (llama.cpp) for web app
    // LM Studio provides OpenAI-compatible API on port 1234 for all GPU types
    if (servicesToInstallFinal.includes('llm-engine')) {
      console.log('[deploy:start] PHASE 5: LM Studio configuration (llama.cpp)');
      
      onProgress({ 
        phase: 'config', 
        status: 'Configuring LM Studio with llama.cpp...\n(GPU backend automatically selected)', 
        progress: 86 
      });

      // Determine GPU backend that LM Studio will use
      let gpuBackend = 'cpu'; // Default to CPU
      if (gpuInfo) {
        if (gpuInfo.type === 'NVIDIA') {
          gpuBackend = 'cuda';
          console.log('[deploy:start] NVIDIA GPU detected — LM Studio configured for CUDA');
        } else if (gpuInfo.type === 'AMD') {
          gpuBackend = 'rocm';
          console.log('[deploy:start] AMD GPU detected — LM Studio configured for ROCm');
        } else if (gpuInfo.type === 'Intel') {
          gpuBackend = 'igc';
          console.log('[deploy:start] Intel GPU detected — LM Studio configured for Intel GPU');
        } else if (gpuInfo.type === 'Apple') {
          gpuBackend = 'metal';
          console.log('[deploy:start] Apple Silicon detected — LM Studio configured for Metal');
        }
      }
      
      // Write ai_config.json for the web app to use LM Studio
      const aiConfig = {
        backend: 'lmstudio',
        apiKey: '',
        baseUrl: 'http://localhost:1234',
        models: {
          default: 'neural-chat',
          fallback: 'neural-chat',
          LM_STUDIO_GPU_BACKEND: gpuBackend
        },
        ttsProvider: 'browser', // Edge TTS fallback
        imageProvider: servicesToInstallFinal.includes('flux') ? 'flux' : 'none',
        gpuBackend: gpuBackend,
        configuredBy: 'alloflow-admin',
        configuredAt: new Date().toISOString(),
        llmEngine: {
          name: 'LM Studio (llama.cpp)',
          port: 1234,
          type: 'openAI-compatible',
          gpuBackend: gpuBackend,
          gpuInfo: gpuInfo
        }
      };
      
      fs.writeFileSync(
        path.join(ALLOFLOW_DIR, 'ai_config.json'),
        JSON.stringify(aiConfig, null, 2)
      );
      console.log('[deploy:start] Wrote ai_config.json with LM Studio (llama.cpp) configuration');
      console.log('[deploy:start] GPU Backend:', gpuBackend);
      
      // Start update detector in background
      startServiceUpdateDetector();
    }


    // PHASE 5c: Check Flux GPU status if Flux was deployed
    let fluxGpuStatus = null;
    if (servicesToInstallFinal.includes('flux')) {
      try {
        const httpMod = require('http');
        const fluxHealth = await new Promise((resolve, reject) => {
          const req = httpMod.get('http://127.0.0.1:7860/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try { resolve(JSON.parse(data)); }
              catch { resolve(null); }
            });
          });
          req.on('error', () => resolve(null));
          req.setTimeout(5000, () => { req.destroy(); resolve(null); });
        });

        if (fluxHealth) {
          fluxGpuStatus = {
            gpu_accelerated: fluxHealth.gpu_accelerated,
            device: fluxHealth.device,
            gpu_type: fluxHealth.gpu_type,
            gpu_name: fluxHealth.gpu_name,
            fallback_reason: fluxHealth.fallback_reason
          };
          console.log('[deploy:start] Flux GPU status:', JSON.stringify(fluxGpuStatus));
        }
      } catch (err) {
        console.warn('[deploy:start] Could not query Flux GPU status:', err.message);
      }
    }
    
    // PHASE 6: Save config
    onProgress({ phase: 'config', status: 'Saving configuration...', progress: 95 });
    saveConfig({
      deploymentType: setupData.deploymentType,
      selectedServices,
      setupDate: new Date().toISOString(),
      ...setupData
    });
    
    // Save deployment manifest for smart version checking
    saveDeploymentManifest({
      version: INSTALLER_VERSION,
      services: servicesToInstallFinal,
      timestamp: new Date().toISOString()
    });
    console.log('[deploy:start] Deployment manifest saved with services:', servicesToInstallFinal);
    
    // PHASE 7: Open AlloFlow local app in user's browser
    const localAppPort = getLocalAppPort();
    const localAppUrl = `http://localhost:${localAppPort}`;
    onProgress({ phase: 'launching', status: `Launching AlloFlow at ${localAppUrl}...`, progress: 98 });
    try {
      const { shell } = require('electron');
      await shell.openExternal(localAppUrl);
      console.log('[deploy:start] Opened AlloFlow local app in browser at', localAppUrl);
    } catch (err) {
      console.warn('[deploy:start] Could not open browser:', err.message);
    }

    onProgress({
      phase: 'complete',
      status: `Setup complete! AlloFlow is running at ${localAppUrl}`,
      progress: 100,
      fluxGpuStatus,
      localAppUrl
    });
    
    console.log('[deploy:start] Native deployment completed successfully');
    return { success: true, fluxGpuStatus, localAppUrl };
  } catch (err) {
    console.error('[deploy:start] Deployment failed:', err.message);
    return { success: false, error: err.message };
  }
}

// IPC Handler: Detect hardware
ipcMain.handle('setup:detect-hardware', async (event) => {
  try {
    console.log('[ipc:detect-hardware] Called');
    const hardware = detectHardware();
    return {
      success: true,
      hardware
    };
  } catch (err) {
    console.error('[ipc:detect-hardware] Error:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
});

// IPC Handler: Get service definitions
ipcMain.handle('setup:get-services', async (event, hardwareTier) => {
  try {
    console.log('[ipc:get-services] Called for tier:', hardwareTier);
    
    const tier = HARDWARE_PROFILES[hardwareTier || 'entryLevel'];
    if (!tier) {
      throw new Error('Invalid hardware tier: ' + hardwareTier);
    }
    
    // Get services for this tier (exclude unavailable ones)
    const services = tier.servicesToInclude
      .filter(serviceId => SERVICE_DEFINITIONS[serviceId] && SERVICE_DEFINITIONS[serviceId].available !== false)
      .map(serviceId => ({
        ...SERVICE_DEFINITIONS[serviceId],
        enabled: !SERVICE_DEFINITIONS[serviceId].optional || SERVICE_DEFINITIONS[serviceId].defaultEnabled
      }));
    
    return {
      success: true,
      tier: hardwareTier,
      tierProfile: tier,
      services
    };
  } catch (err) {
    console.error('[ipc:get-services] Error:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
});

// IPC Handler: Start deployment with progress streaming
ipcMain.handle('setup:start-deployment', async (event, setupData) => {
  try {
    console.log('[ipc:start-deployment] Called');
    
    // Return a channel ID for progress updates
    const channelId = 'deployment-' + Date.now();
    
    // Start deployment in background
    startDeployment(setupData, (progress) => {
      // Send progress back to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deployment:progress', {
          channelId,
          ...progress
        });
      }
    }).then(result => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (result && result.success) {
          mainWindow.webContents.send('deployment:complete', {
            channelId,
            ...result
          });
        } else {
          mainWindow.webContents.send('deployment:error', {
            channelId,
            error: (result && result.error) || 'Deployment failed'
          });
        }
      }
    }).catch(err => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deployment:error', {
          channelId,
          error: err.message
        });
      }
    });
    
    return { success: true, channelId };
  } catch (err) {
    console.error('[ipc:start-deployment] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// IPC Handler: Uninstall all services
ipcMain.handle('setup:uninstall', async (event) => {
  try {
    console.log('[ipc:uninstall] Starting full uninstall...');
    nativePM.stopAllServices();
    stopSearchServer();
    
    // Uninstall all services (removes ~/.alloflow directory)
    await nativePM.uninstallAll((progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('uninstall:progress', progress);
      }
    });
    
    // Double-check: remove config files explicitly in case rmDirSafe failed
    try {
      if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
      if (fs.existsSync(VERSION_FILE)) fs.unlinkSync(VERSION_FILE);
      if (fs.existsSync(DEPLOYMENT_MANIFEST)) fs.unlinkSync(DEPLOYMENT_MANIFEST);
    } catch (e) {
      console.warn('[ipc:uninstall] Could not remove some config files:', e.message);
    }
    
    // Explicitly reload the app to re-check for installation
    console.log('[ipc:uninstall] Reloading app to reset state...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Add a small delay to ensure files are deleted
      setTimeout(() => mainWindow.reload(), 500);
    }
    
    return { success: true };
  } catch (err) {
    console.error('[ipc:uninstall] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// IPC Handler: Selective uninstall — user picks which services to remove
ipcMain.handle('setup:uninstall-services', async (event, { serviceIds, removeConfig }) => {
  try {
    console.log('[ipc:uninstall-services] Removing services:', serviceIds, 'removeConfig:', removeConfig);
    
    // Stop and uninstall selected services
    for (let i = 0; i < serviceIds.length; i++) {
      const serviceId = serviceIds[i];
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('uninstall:progress', {
          status: `Uninstalling ${serviceId}...`,
          progress: Math.round((i / serviceIds.length) * 80)
        });
      }
      try {
        await nativePM.uninstallService(serviceId);
      } catch (err) {
        console.error(`[ipc:uninstall-services] Error uninstalling ${serviceId}:`, err.message);
      }
    }
    
    // Update the deployment manifest to remove uninstalled services
    const manifest = getDeploymentManifest();
    if (manifest && manifest.services) {
      manifest.services = manifest.services.filter(s => !serviceIds.includes(s));
      saveDeploymentManifest(manifest);
    }
    
    // Update config to remove uninstalled services from selectedServices
    const config = getConfig();
    if (config && config.selectedServices) {
      config.selectedServices = config.selectedServices.filter(s => !serviceIds.includes(s));
      saveConfig(config);
    }
    
    if (removeConfig) {
      // Full reset: remove all config files to trigger setup wizard
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('uninstall:progress', {
          status: 'Removing configuration...',
          progress: 90
        });
      }
      try {
        if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
        if (fs.existsSync(VERSION_FILE)) fs.unlinkSync(VERSION_FILE);
        if (fs.existsSync(DEPLOYMENT_MANIFEST)) fs.unlinkSync(DEPLOYMENT_MANIFEST);
      } catch (e) {
        console.warn('[ipc:uninstall-services] Config removal error:', e.message);
      }
    }
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('uninstall:progress', {
        status: 'Uninstall complete',
        progress: 100
      });
    }
    
    // Reload app if config was removed
    if (removeConfig && mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => mainWindow.reload(), 500);
    }
    
    return { success: true };
  } catch (err) {
    console.error('[ipc:uninstall-services] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// IPC Handler: Get list of currently installed services
ipcMain.handle('setup:get-installed-services', async (event) => {
  try {
    const allServices = ['llm-engine', 'piper', 'flux'];
    const installed = {};
    for (const serviceId of allServices) {
      installed[serviceId] = nativePM.isServiceInstalled(serviceId);
    }
    return { success: true, services: installed };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================================
// LLM ENGINE MODEL MANAGEMENT (LM Studio / llama.cpp)
// ============================================================================

// IPC Handler: Get available models from LM Studio
ipcMain.handle('llm:get-models', async (event) => {
  try {
    const response = await fetch('http://127.0.0.1:1234/v1/models', {
      method: 'GET',
      timeout: 5000
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, models: data.data || [] };
    } else {
      return { success: false, error: 'LM Studio not responding' };
    }
  } catch (err) {
    console.error('[ipc:llm:get-models] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// IPC Handler: Pull/Download a model via LM Studio UI
// Note: LM Studio handle model downloads via UI; this handler triggers the download request
ipcMain.handle('llm:pull-model', async (event, { modelId }) => {
  try {
    console.log('[ipc:llm:pull-model] Model download request for:', modelId);
    
    // Attempt to load a model via LM Studio's completion API
    // The actual download happens through LM Studio UI, we just notify completion
    const response = await fetch('http://127.0.0.1:1234/v1/models', {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('[ipc:llm:pull-model] LM Studio is available - model can be downloaded via LM Studio UI');
      return { success: true, message: 'Download model via LM Studio UI' };
    } else {
      return { success: false, error: 'LM Studio not responding' };
    }
  } catch (err) {
    console.error('[ipc:llm:pull-model] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// IPC Handler: Check LM Studio status
ipcMain.handle('llm:check-status', async (event) => {
  try {
    const response = await fetch('http://127.0.0.1:1234/v1/models', {
      method: 'GET',
      timeout: 5000
    });
    const isRunning = response.ok;
    return { 
      success: true, 
      isRunning,
      port: 1234,
      status: isRunning ? 'running' : 'not responding'
    };
  } catch (err) {
    console.error('[ipc:llm:check-status] Error:', err.message);
    return { success: false, isRunning: false, error: err.message };
  }
});

// ============================================================================
// SERVICE UPDATE CHECKING (LM Studio, Piper, Flux)
// ============================================================================

// IPC Handler: Check for updates for all services
ipcMain.handle('services:check-updates', async (event) => {
  try {
    console.log('[ipc:services:check-updates] Checking all services for updates...');
    const updates = await serviceUpdatesManager.checkAllUpdates();
    return {
      success: true,
      updates: {
        'llm-engine': updates['llm-engine'],
        piper: updates.piper,
        flux: updates.flux
      }
    };
  } catch (err) {
    console.error('[ipc:services:check-updates] Error:', err.message);
    return { success: false, error: err.message, updates: null };
  }
});

// IPC Handler: Check for update for a specific service
ipcMain.handle('services:check-service-update', async (event, serviceId) => {
  try {
    console.log(`[ipc:services:check-service-update] Checking ${serviceId} for updates...`);
    const update = await serviceUpdatesManager.checkServiceUpdate(serviceId);
    return {
      success: true,
      serviceId,
      update
    };
  } catch (err) {
    console.error(`[ipc:services:check-service-update] Error for ${serviceId}:`, err.message);
    return { success: false, serviceId, error: err.message, update: null };
  }
});

// IPC Handler: Get cached update status for all services (no network call)
ipcMain.handle('services:get-update-status', async (event) => {
  try {
    const statuses = serviceUpdatesManager.getAllUpdateStatuses();
    return {
      success: true,
      statuses
    };
  } catch (err) {
    console.error('[ipc:services:get-update-status] Error:', err.message);
    return { success: false, error: err.message, statuses: null };
  }
});

// ============================================================================
// LOCAL APP CONFIG READ / WRITE + STATUS  (C3.1 — local_config.json)
// ============================================================================

ipcMain.handle('local:read-config', async () => {
  return readLocalConfig();
});

ipcMain.handle('local:write-config', async (_event, cfg) => {
  try {
    const ok = writeLocalConfig(cfg);
    return { success: ok };
  } catch (err) {
    console.error('[ipc:local:write-config] Error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('local:get-url', async () => {
  return {
    localAppUrl:  `http://localhost:${getLocalAppPort()}`,
    sqliteUrl:    `http://localhost:${localBackend.getPort()}`,
    localAppPort: getLocalAppPort(),
    sqlitePort:   localBackend.getPort(),
    backendRunning: localBackend.isRunning(),
  };
});

ipcMain.handle('local:backend-status', async () => {
  return {
    running: localBackend.isRunning(),
    port:    localBackend.getPort(),
  };
});

// ============================================================================
// AI CONFIG READ / WRITE  (used by AIConfig.jsx)
// ============================================================================

ipcMain.handle('config:read-ai', async (event) => {
  try {
    if (!fs.existsSync(AI_CONFIG_FILE)) return null;
    const raw = fs.readFileSync(AI_CONFIG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[ipc:config:read-ai] Error:', err.message);
    return null;
  }
});

ipcMain.handle('config:write-ai', async (event, config) => {
  try {
    if (!fs.existsSync(ALLOFLOW_DIR)) fs.mkdirSync(ALLOFLOW_DIR, { recursive: true });
    fs.writeFileSync(AI_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    console.log('[ipc:config:write-ai] AI config saved');
    return { success: true };
  } catch (err) {
    console.error('[ipc:config:write-ai] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// ============================================================================
// SERVICES HEALTH & STATUS  (used by Dashboard.jsx, Services.jsx)
// ============================================================================

// Overall health — checks LM Studio (llm-engine) reachability
ipcMain.handle('services:health', async (event) => {
  try {
    const response = await fetch('http://127.0.0.1:1234/v1/models', {
      method: 'GET',
      timeout: 5000
    });
    return response.ok ? 'healthy' : 'offline';
  } catch (err) {
    return 'offline';
  }
});

// Service list — returns LM Studio + Piper status
ipcMain.handle('services:list', async (event) => {
  try {
    // Check LM Studio health
    let llmStatus = { running: false };
    try {
      const response = await fetch('http://127.0.0.1:1234/v1/models', {
        method: 'GET',
        timeout: 5000
      });
      if (response.ok) {
        const data = await response.json();
        llmStatus = {
          running: true,
          modelCount: (data.data || []).length
        };
      }
    } catch (e) {
      // LM Studio not responding
    }

    const services = [
      {
        name: 'LM Studio (llama.cpp)',
        id: 'llm-engine',
        status: llmStatus.running ? 'running' : 'stopped',
        details: llmStatus.running ? `LM Studio on port 1234` : 'Not running',
        port: 1234
      }
    ];

    // Check Piper (native process)
    try {
      const allStatuses = nativePM.getServiceStatuses();
      const piperStatus = allStatuses['piper'];
      if (piperStatus) {
        services.push({
          name: 'Piper TTS',
          id: 'piper',
          status: piperStatus.installed ? 'running' : 'stopped',
          details: piperStatus.installed ? 'TTS ready (on-demand)' : 'Not installed',
          port: null
        });
      }
    } catch (_) { /* Piper not configured */ }

    // Check Flux (image generation)
    try {
      const fluxHealth = await nativePM.checkServiceHealth('flux');
      const fluxInstalled = nativePM.isServiceInstalled('flux');
      if (fluxInstalled) {
        const fluxStatuses = nativePM.getServiceStatuses();
        const fluxProcessRunning = fluxStatuses['flux']?.running || false;
        const isRunningAndHealthy = fluxHealth.running && fluxHealth.healthy;
        const isStarting = fluxProcessRunning && !isRunningAndHealthy;
        services.push({
          name: 'Flux Image Generation',
          id: 'flux',
          status: isRunningAndHealthy ? 'running' : isStarting ? 'running' : 'stopped',
          details: isRunningAndHealthy ? 'Image generation on port 7860' : isStarting ? 'Loading model (first run may take 5-10 min)' : 'Installed but not responding',
          port: 7860
        });
      }
    } catch (_) { /* Flux not configured */ }

    return { success: true, containers: services };
  } catch (err) {
    console.error('[ipc:services:list] Error:', err.message);
    return { success: false, containers: [] };
  }
});

// System metrics — uptime, memory, CPU load
ipcMain.handle('services:metrics', async (event) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePct = Math.round((usedMem / totalMem) * 100);

    const cpuLoad = os.loadavg()[0]; // 1-min avg
    const cpuCount = os.cpus().length;
    const cpuUsage = Math.min(100, Math.round((cpuLoad / cpuCount) * 100));

    const uptimeSec = os.uptime();
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const uptime = `${h}h ${m}m`;

    // Get model count from LM Studio
    let modelCount = 0;
    try {
      const response = await fetch('http://127.0.0.1:1234/v1/models', {
        method: 'GET',
        timeout: 5000
      });
      if (response.ok) {
        const data = await response.json();
        modelCount = (data.data || []).length;
      }
    } catch (e) {
      // LM Studio not responding, default to 0
    }

    return {
      success: true,
      uptime,
      cpuUsage,
      memUsage: memUsagePct,
      diskUsage: 0, // not critical, skip for now
      modelCount
    };
  } catch (err) {
    console.error('[ipc:services:metrics] Error:', err.message);
    return { success: false };
  }
});

// Restart — restarts LM Studio via native process manager
ipcMain.handle('services:restart', async (event) => {
  try {
    nativePM.stopService('llm-engine');
    // Give it a moment to fully stop
    await new Promise(r => setTimeout(r, 1000));
    nativePM.startService('llm-engine');
    
    // Wait for LM Studio to be healthy
    const maxAttempts = 15;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch('http://127.0.0.1:1234/v1/models', {
          method: 'GET',
          timeout: 1000
        });
        if (response.ok) {
          return { success: true, message: 'LM Studio restarted successfully' };
        }
      } catch (e) {
        if (attempt === maxAttempts - 1) break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    
    return { success: false, error: 'LM Studio did not restart properly' };
  } catch (err) {
    console.error('[ipc:services:restart] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// Start all services — starts all configured services
ipcMain.handle('services:start-all', async (event) => {
  try {
    const config = getConfig();
    const selectedServices = config?.selectedServices || ['llm-engine'];
    const started = [];
    const failed = [];

    for (const serviceId of selectedServices) {
      const svcDef = SERVICE_DEFINITIONS[serviceId];
      if (!svcDef || svcDef.builtin) continue;
      if (!nativePM.isServiceInstalled(serviceId)) {
        failed.push(`${serviceId} (not installed)`);
        continue;
      }
      try {
        nativePM.startService(serviceId);
        started.push(serviceId);
      } catch (err) {
        console.error(`[ipc:services:start-all] Failed to start ${serviceId}:`, err.message);
        failed.push(`${serviceId} (${err.message})`);
      }
    }

    // Wait for LM Studio to be healthy if it was started
    if (started.includes('llm-engine')) {
      try {
        // Check LM Studio health
        const maxAttempts = 15;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const response = await fetch('http://127.0.0.1:1234/v1/models', { timeout: 1000 });
            if (response.ok) {
              console.log('[ipc:services:start-all] LM Studio is now healthy');
              break;
            }
          } catch (e) {
            if (attempt === maxAttempts - 1) {
              throw new Error('LM Studio health check failed after max attempts');
            }
          }
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err) {
        console.warn('[ipc:services:start-all] LM Studio started but not yet healthy:', err.message);
      }
    }

    const message = `Started: ${started.join(', ') || 'none'}` + (failed.length ? `. Failed: ${failed.join(', ')}` : '');
    return { success: true, message, started, failed };
  } catch (err) {
    console.error('[ipc:services:start-all] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// Stop all services
ipcMain.handle('services:stop-all', async (event) => {
  try {
    const config = getConfig();
    const selectedServices = config?.selectedServices || ['llm-engine'];
    const stopped = [];

    for (const serviceId of selectedServices) {
      const svcDef = SERVICE_DEFINITIONS[serviceId];
      if (!svcDef || svcDef.builtin) continue;
      try {
        nativePM.stopService(serviceId);
        stopped.push(serviceId);
      } catch (err) {
        console.error(`[ipc:services:stop-all] Failed to stop ${serviceId}:`, err.message);
      }
    }

    return { success: true, message: `Stopped: ${stopped.join(', ') || 'none'}` };
  } catch (err) {
    console.error('[ipc:services:stop-all] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// Restart individual service
ipcMain.handle('services:restart-one', async (event, serviceName) => {
  try {
    // Map display name to service ID
    const serviceId = serviceName.toLowerCase().replace(/\s+/g, '').replace('tts', '');
    const actualId = Object.keys(SERVICE_DEFINITIONS).find(id => {
      const def = SERVICE_DEFINITIONS[id];
      return id === serviceId || def.name?.toLowerCase() === serviceName.toLowerCase();
    }) || serviceId;

    console.log(`[ipc:services:restart-one] Restarting service: ${actualId} (from name: ${serviceName})`);
    nativePM.stopService(actualId);
    await new Promise(r => setTimeout(r, 1000));
    nativePM.startService(actualId);

    // Wait for LM Studio to be healthy if restarting LM Engine
    if (actualId === 'llm-engine') {
      const maxAttempts = 15;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const response = await fetch('http://127.0.0.1:1234/v1/models', {
            method: 'GET',
            timeout: 1000
          });
          if (response.ok) break;
        } catch (e) {
          if (attempt === maxAttempts - 1) throw new Error('LM Studio health check failed');
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return { success: true, message: `${serviceName} restarted` };
  } catch (err) {
    console.error('[ipc:services:restart-one] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// Logs — returns recent log lines for a service
ipcMain.handle('services:logs', async (event, service) => {
  try {
    // nativeProcessManager tracks running processes but doesn't buffer logs.
    // Return a message directing user to check system logs.
    return { success: true, logs: `Live log streaming not yet implemented for "${service}". Check system event logs or run the service manually to view output.` };
  } catch (err) {
    return { success: true, logs: 'Logs not available for this service' };
  }
});

// ============================================================================
// LOG STREAMING (NEW — C.4: Debug Support)
// ============================================================================

// Get recent logs from buffer or file
ipcMain.handle('logs:get-recent', async (event, { service = 'main', lines = 100 }) => {
  try {
    const buffer = logBuffers[service] || [];
    const recentLines = buffer.slice(Math.max(0, buffer.length - lines));
    return { success: true, logs: recentLines };
  } catch (err) {
    console.error('[ipc:logs:get-recent] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// Clear logs for a service
ipcMain.handle('logs:clear', async (event, { service = 'main' }) => {
  try {
    if (logBuffers[service]) {
      logBuffers[service] = [];
    }
    // Also clear the log file
    try {
      ensureLogDir();
      const logFile = path.join(LOG_DIR, `${service}.log`);
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }
    } catch (e) {
      console.warn('[logs:clear] Could not delete log file:', e.message);
    }
    return { success: true };
  } catch (err) {
    console.error('[ipc:logs:clear] Error:', err.message);
    return { success: false, error: err.message };
  }
});
