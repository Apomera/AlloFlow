const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const nativePM = require('./nativeProcessManager');
const ollamaManager = require('./ollamaManager');
const { startSearchServer, stopSearchServer } = require('./searchModule');
const { startWebAppServer, stopWebAppServer, getWebAppPort } = require('./webAppServer');
const { startLocalAppServer, stopLocalAppServer, getLocalAppPort } = require('./localAppServer');
const localBackend = require('./localBackendManager');

const isDev = !app.isPackaged;
let mainWindow;
let updateDetectorInterval = null;

// Start Ollama update detector (runs every 24 hours)
function startOllamaUpdateDetector() {
  if (updateDetectorInterval) return; // Already running
  
  const checkForUpdates = async () => {
    try {
      const updates = await ollamaManager.checkForUpdates();
      if (updates && mainWindow) {
        mainWindow.webContents.send('ollama:update-available', updates);
        console.log('[ollama:updates] New version available:', updates.latestVersion);
      }
    } catch (err) {
      // Silently fail — update checks are non-critical
    }
  };
  
  // Check immediately, then every 24 hours
  checkForUpdates();
  updateDetectorInterval = setInterval(checkForUpdates, 24 * 60 * 60 * 1000);
  console.log('[ollama:updates] Update detector started');
}

// Stop update detector on app quit
function stopOllamaUpdateDetector() {
  if (updateDetectorInterval) {
    clearInterval(updateDetectorInterval);
    updateDetectorInterval = null;
    console.log('[ollama:updates] Update detector stopped');
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
  ollamaUrl:    'http://localhost:11434',
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);

  // DevTools disabled for production
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', async () => {
  console.log('[app:ready] AlloFlow Admin starting...');
  
  // Start the built-in search server
  try {
    const searchPort = await startSearchServer(8888);
    console.log('[app:ready] Search server started on port', searchPort);
  } catch (err) {
    console.error('[app:ready] Failed to start search server:', err.message);
  }

  // Start the web app server (serves AlloFlow locally)
  try {
    const webPort = await startWebAppServer(3000, app.isPackaged);
    console.log('[app:ready] Web app server started on port', webPort);
  } catch (err) {
    console.error('[app:ready] Failed to start web app server:', err.message);
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
    
    // **IMPROVED**: Try to start each service, with better error handling
    for (const serviceId of selectedServices) {
      const svcDef = SERVICE_DEFINITIONS[serviceId];
      if (!svcDef) {
        console.warn(`[app:ready] Service definition not found: ${serviceId}`);
        continue;
      }
      
      // Skip builtin services (they're already running in-process)
      if (svcDef.builtin) {
        console.log(`[app:ready] Skipping builtin service: ${serviceId}`);
        continue;
      }
      
      // Check if service is installed before trying to start
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
        // Non-fatal: continue with other services
      }
    }
    
    // **NEW**: After starting services, wait a bit for them to become healthy
    // This ensures they're ready when the admin app UI loads
    console.log('[app:ready] Waiting for services to become healthy...');
    if (selectedServices.includes('ollama')) {
      try {
        await ollamaManager.waitForHealthy(30000, 1000);
        console.log('[app:ready] ✓ Ollama is healthy');
      } catch (err) {
        console.warn('[app:ready] Ollama did not become healthy quickly:', err.message);
        // Non-fatal: Ollama may still start in the background
      }
    }
  } else if (config) {
    console.log('[app:ready] Non-local deployment detected:', config.deploymentType);
  } else {
    console.log('[app:ready] No configuration found - will show setup wizard');
  }

  createWindow();
});

app.on('window-all-closed', () => {
  nativePM.stopAllServices();
  stopSearchServer();
  stopWebAppServer();
  stopLocalAppServer();
  localBackend.stop();
  stopOllamaUpdateDetector();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  nativePM.stopAllServices();
  stopSearchServer();
  stopWebAppServer();
  stopLocalAppServer();
  localBackend.stop();
  stopOllamaUpdateDetector();
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
        ollamaUrl:    setupData.ollamaUrl    || LOCAL_CONFIG_DEFAULTS.ollamaUrl,
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

    // Detect GPU info to pass to Flux installer
    const hardware = detectHardware();
    const gpuInfo = hardware.gpu || null;
    
    // PHASE 0: Check if deployment is needed (skip if version unchanged and no new services)
    let needsInstallation = true;
    if (!versionChanged) {
      const manifest = getDeploymentManifest();
      if (manifest && manifest.services) {
        const newServices = servicesToInstall.filter(s => !manifest.services.includes(s));
        if (newServices.length === 0 && servicesToInstall.every(s => manifest.services.includes(s))) {
          // All services already deployed — skip download/install but still start and health-check
          console.log('[deploy:start] All services already deployed at current version, skipping installation...');
          onProgress({ phase: 'preflight', status: 'Services already installed, starting them up...', progress: 10 });
          needsInstallation = false;
        }
      }
    }
    
    // PHASE 2: Install services (download binaries) - only if needed
    const totalToInstall = servicesToInstall.length;
    let installed = 0;
    
    if (needsInstallation) {
    
    for (const serviceId of servicesToInstall) {
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
    
    for (const serviceId of servicesToInstall) {
      const svcDef = SERVICE_DEFINITIONS[serviceId];
      if (!svcDef) continue;
      
      onProgress({
        phase: 'starting',
        status: `Starting ${svcDef.name}...`,
        progress: 70 + (servicesToInstall.indexOf(serviceId) / servicesToInstall.length) * 15
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

    // PHASE 5: Set up Ollama models (pull models selected in wizard)
    if (servicesToInstall.includes('ollama')) {
      const modelsToPull = setupData.selectedModels && setupData.selectedModels.length > 0
        ? setupData.selectedModels
        : ['neural-chat:7b']; // Fallback if somehow no models were selected

      console.log('[deploy:start] PHASE 5: Ollama model setup');
      console.log('[deploy:start] setupData.selectedModels:', setupData.selectedModels);
      console.log('[deploy:start] Models to pull:', modelsToPull);

      // **CRITICAL FIX**: Wait for Ollama to be healthy before attempting to pull models
      onProgress({ phase: 'models', status: 'Waiting for Ollama to be ready (this may take 10-30 seconds)...', progress: 86 });
      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount < maxRetries) {
        try {
          console.log(`[deploy:start] Waiting for Ollama to become healthy (attempt ${retryCount + 1}/${maxRetries})...`);
          await ollamaManager.waitForHealthy(30000, 2000); // Wait up to 30s, retry every 2s
          console.log('[deploy:start] Ollama is now healthy and ready for model pulls');
          break;
        } catch (err) {
          retryCount++;
          console.warn(`[deploy:start] Ollama health check failed (attempt ${retryCount}/${maxRetries}):`, err.message);
          if (retryCount >= maxRetries) {
            console.error('[deploy:start] CRITICAL: Ollama failed to start after 3 attempts. Continuing without models...');
            onProgress({ 
              phase: 'models', 
              status: `Ollama did not start properly. You can pull models manually later from the admin panel. Error: ${err.message}`, 
              progress: 87 
            });
            // Continue deployment without pulling models
            break;
          }
          // Wait before retry
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // Check if models are already installed (only if Ollama became healthy)
      let installedModels = [];
      try {
        installedModels = await ollamaManager.getInstalledModels();
        console.log('[deploy:start] Currently installed Ollama models:', installedModels.map(m => m.name || m.model));
      } catch (err) {
        console.error('[deploy:start] CRITICAL: Could not connect to Ollama at http://127.0.0.1:11434:', err.message);
        console.error('[deploy:start] This usually means:');
        console.error('[deploy:start]   1. ollama.exe is not running');
        console.error('[deploy:start]   2. Ollama is not installed or not in PATH');
        console.error('[deploy:start]   3. OLLAMA_HOST environment variable is set differently');
        console.warn('[deploy:start] Continuing without model pull - you can manually pull models later');
        onProgress({ phase: 'models', status: `Could not connect to Ollama: ${err.message}. Models can be pulled manually later.`, progress: 88 });
      }

      const installedIds = installedModels.map(m => m.name || m.model);
      const modelsNeeded = modelsToPull.filter(m => !installedIds.includes(m));

      if (modelsNeeded.length > 0) {
        console.log(`[deploy:start] Pulling ${modelsNeeded.length} model(s):`, modelsNeeded);

        for (let i = 0; i < modelsNeeded.length; i++) {
          const modelId = modelsNeeded[i];
          onProgress({
            phase: 'models',
            status: `Downloading AI model ${i + 1}/${modelsNeeded.length}: ${modelId}\n(This may take several minutes on first run)`,
            progress: 88 + (i / modelsNeeded.length) * 4
          });

          try {
            await ollamaManager.pullModel(modelId, (progress) => {
              const percent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ollama:pull-progress', {
                  modelId,
                  ...progress
                });
              }
              onProgress({
                phase: 'models',
                status: `${modelId}: ${progress.status}\n${Math.round(percent)}%`,
                progress: 88 + ((i + percent / 100) / modelsNeeded.length) * 4
              });
            });
            console.log(`[deploy:start] Model ${modelId} ready`);
          } catch (err) {
            console.warn(`[deploy:start] Model pull failed for ${modelId} (non-fatal):`, err.message);
            onProgress({ phase: 'models', status: `Model download failed for ${modelId} — you can pull it later via the admin panel.`, progress: 92 });
          }
        }
      } else {
        console.log('[deploy:start] All selected models already installed — skipping pull');
      }

      // Write ai_config.json for the web app to auto-configure itself
      const defaultModel = modelsToPull[0] || 'neural-chat:7b';
      
      // Determine TTS provider based on what's installed
      let ttsProvider = 'browser'; // Fallback
      let piperPath = null;
      
      if (servicesToInstall.includes('piper')) {
        try {
          const piperBinPath = nativePM.getServiceBinaryPath('piper');
          if (piperBinPath) {
            ttsProvider = 'piper';
            piperPath = piperBinPath;
            console.log('[deploy:start] Piper installed at:', piperBinPath, '— configuring as TTS provider');
          }
        } catch (err) {
          console.warn('[deploy:start] Piper is in servicesToInstall but binary path not found:', err.message);
        }
      }
      
      const aiConfig = {
        backend: 'ollama',
        apiKey: '',
        baseUrl: 'http://localhost:11434',
        models: {
          default: defaultModel,
          flash: defaultModel,
          fallback: defaultModel,
          vision: defaultModel,
          image: 'flux',
          tts: defaultModel
        },
        ttsProvider: ttsProvider,
        piperPath: piperPath || undefined,
        imageProvider: servicesToInstall.includes('flux') ? 'flux' : 'auto',
        configuredBy: 'alloflow-admin',
        configuredAt: new Date().toISOString()
      };
      fs.writeFileSync(
        path.join(ALLOFLOW_DIR, 'ai_config.json'),
        JSON.stringify(aiConfig, null, 2)
      );
      console.log('[deploy:start] Wrote ai_config.json for web app auto-configuration');
      
      // Start update detector in background
      startOllamaUpdateDetector();
    }


    // PHASE 5c: Check Flux GPU status if Flux was deployed
    let fluxGpuStatus = null;
    if (servicesToInstall.includes('flux')) {
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
      services: servicesToInstall,
      timestamp: new Date().toISOString()
    });
    console.log('[deploy:start] Deployment manifest saved with services:', servicesToInstall);
    
    // PHASE 7: Open AlloFlow web app in user's browser
    const webAppPort = getWebAppPort();
    const webAppUrl = `http://localhost:${webAppPort}`;
    onProgress({ phase: 'launching', status: `Launching AlloFlow at ${webAppUrl}...`, progress: 98 });
    try {
      const { shell } = require('electron');
      await shell.openExternal(webAppUrl);
      console.log('[deploy:start] Opened AlloFlow web app in browser at', webAppUrl);
    } catch (err) {
      console.warn('[deploy:start] Could not open browser:', err.message);
    }

    onProgress({
      phase: 'complete',
      status: `Setup complete! AlloFlow is running at ${webAppUrl}`,
      progress: 100,
      fluxGpuStatus,
      webAppUrl
    });
    
    console.log('[deploy:start] Native deployment completed successfully');
    return { success: true, fluxGpuStatus, webAppUrl };
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
    const allServices = ['ollama', 'piper', 'flux'];
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
// OLLAMA MODEL MANAGEMENT
// ============================================================================

// IPC Handler: Get installed Ollama models
ipcMain.handle('ollama:get-installed-models', async (event) => {
  try {
    const models = await ollamaManager.getInstalledModels();
    return { success: true, models };
  } catch (err) {
    console.error('[ipc:ollama:get-installed-models] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// IPC Handler: Get available models to pull
ipcMain.handle('ollama:get-available-models', async (event) => {
  try {
    const models = ollamaManager.getAvailableModels();
    return { success: true, models };
  } catch (err) {
    console.error('[ipc:ollama:get-available-models] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// IPC Handler: Pull an Ollama model
ipcMain.handle('ollama:pull-model', async (event, { modelId }) => {
  try {
    console.log('[ipc:ollama:pull-model] Starting pull of:', modelId);
    
    // Start the pull and send progress updates to renderer
    await ollamaManager.pullModel(modelId, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ollama:pull-progress', {
          modelId,
          ...progress
        });
      }
    });
    
    console.log('[ipc:ollama:pull-model] Model pull completed:', modelId);
    return { success: true };
  } catch (err) {
    console.error('[ipc:ollama:pull-model] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// IPC Handler: Check Ollama status and update detector
ipcMain.handle('ollama:check-status', async (event) => {
  try {
    const status = await ollamaManager.checkOllamaStatus();
    return { success: true, ...status };
  } catch (err) {
    console.error('[ipc:ollama:check-status] Error:', err.message);
    return { success: false, isRunning: false, error: err.message };
  }
});

// IPC Handler: Check for Ollama updates
ipcMain.handle('ollama:check-updates', async (event) => {
  try {
    const updates = await ollamaManager.checkForUpdates();
    return { success: true, updates };
  } catch (err) {
    console.error('[ipc:ollama:check-updates] Error:', err.message);
    return { success: false, updates: null };
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

// Overall health — checks Ollama reachability
ipcMain.handle('services:health', async (event) => {
  try {
    const status = await ollamaManager.checkOllamaStatus();
    return status.running ? 'healthy' : 'offline';
  } catch (err) {
    return 'offline';
  }
});

// Service list — returns Ollama + Piper status with installed model count
ipcMain.handle('services:list', async (event) => {
  try {
    const [ollamaStatus, models] = await Promise.all([
      ollamaManager.checkOllamaStatus().catch(() => ({ running: false })),
      ollamaManager.getInstalledModels().catch(() => [])
    ]);

    const services = [
      {
        name: 'Ollama',
        id: 'ollama',
        status: ollamaStatus.running ? 'running' : 'stopped',
        details: ollamaStatus.running ? `${models.length} model(s) installed` : 'Not running',
        port: 11434
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
          status: piperStatus.running ? 'running' : 'stopped',
          details: piperStatus.running ? 'TTS ready' : 'Not running',
          port: null
        });
      }
    } catch (_) { /* Piper not configured */ }

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

    const models = await ollamaManager.getInstalledModels().catch(() => []);

    return {
      success: true,
      uptime,
      cpuUsage,
      memUsage: memUsagePct,
      diskUsage: 0, // not critical, skip for now
      modelCount: models.length
    };
  } catch (err) {
    console.error('[ipc:services:metrics] Error:', err.message);
    return { success: false };
  }
});

// Restart — restarts Ollama via native process manager
ipcMain.handle('services:restart', async (event) => {
  try {
    nativePM.stopService('ollama');
    // Give it a moment to fully stop
    await new Promise(r => setTimeout(r, 1000));
    nativePM.startService('ollama');
    await ollamaManager.waitForHealthy(15000, 1000);
    return { success: true, message: 'Ollama restarted successfully' };
  } catch (err) {
    console.error('[ipc:services:restart] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// Start all services — starts all configured services
ipcMain.handle('services:start-all', async (event) => {
  try {
    const config = getConfig();
    const selectedServices = config?.selectedServices || ['ollama'];
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

    // Wait for Ollama to be healthy if it was started
    if (started.includes('ollama')) {
      try {
        await ollamaManager.waitForHealthy(15000, 1000);
      } catch (err) {
        console.warn('[ipc:services:start-all] Ollama started but not yet healthy:', err.message);
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
    const selectedServices = config?.selectedServices || ['ollama'];
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

    if (actualId === 'ollama') {
      await ollamaManager.waitForHealthy(15000, 1000);
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
