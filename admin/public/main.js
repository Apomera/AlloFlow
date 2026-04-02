const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const nativePM = require('./nativeProcessManager');
const ollamaManager = require('./ollamaManager');
const { startSearchServer, stopSearchServer } = require('./searchModule');
const { startWebAppServer, stopWebAppServer, getWebAppPort } = require('./webAppServer');

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
const VERSION_FILE = path.join(ALLOFLOW_DIR, 'version.json');
const DEPLOYMENT_MANIFEST = path.join(ALLOFLOW_DIR, 'deployment.json');

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

  // If already configured, start native services
  const config = getConfig();
  if (config && config.deploymentType === 'local') {
    console.log('[app:ready] Existing local config found, starting services...');
    const selectedServices = config.selectedServices || [];
    for (const serviceId of selectedServices) {
      const svcDef = SERVICE_DEFINITIONS[serviceId];
      if (svcDef && !svcDef.builtin && nativePM.isServiceInstalled(serviceId)) {
        try {
          nativePM.startService(serviceId);
        } catch (err) {
          console.error(`[app:ready] Failed to start ${serviceId}:`, err.message);
        }
      }
    }
  }

  createWindow();
});

app.on('window-all-closed', () => {
  nativePM.stopAllServices();
  stopSearchServer();
  stopWebAppServer();
  stopOllamaUpdateDetector();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  nativePM.stopAllServices();
  stopSearchServer();
  stopWebAppServer();
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
    
    // PHASE 2.5: Create PocketBase admin BEFORE starting serve
    // PocketBase auto-opens browser on first serve if no admin exists.
    // By creating admin first via CLI, the browser auto-open is suppressed.
    if (servicesToInstall.includes('pocketbase')) {
      onProgress({ phase: 'pocketbase_admin', status: 'Configuring PocketBase admin account...', progress: 68 });
      try {
        const adminCreds = await nativePM.createPocketBaseAdmin();
        console.log('[deploy:start] PocketBase admin ready:', adminCreds.email);
        fs.writeFileSync(
          path.join(ALLOFLOW_DIR, 'pb_admin_info.txt'),
          `PocketBase Admin Credentials\n` +
          `=============================\n` +
          `Email: ${adminCreds.email}\n` +
          `Password: ${adminCreds.password}\n` +
          `Created: ${adminCreds.createdAt}\n` +
          `\nAccess at: http://localhost:8090/_/\n`
        );
      } catch (err) {
        console.warn('[deploy:start] PocketBase admin creation failed:', err.message);
        onProgress({ phase: 'pocketbase_admin', status: `PocketBase admin setup warning: ${err.message}`, progress: 68 });
      }
    }

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

    // PHASE 4.5: REST API fallback for PocketBase admin creation
    // If CLI admin creation in Phase 2.5 didn't work (e.g. wrong PB version),
    // try the REST API now that PocketBase is running and healthy
    if (servicesToInstall.includes('pocketbase')) {
      const credFile = path.join(ALLOFLOW_DIR, 'pb_admin.json');
      let adminReady = false;
      if (fs.existsSync(credFile)) {
        try {
          const encrypted = JSON.parse(fs.readFileSync(credFile, 'utf-8'));
          // If we can decrypt it, CLI probably worked
          nativePM.getPocketBaseAdmin().then(() => { adminReady = true; }).catch(() => {});
          adminReady = true;
        } catch { /* will try API */ }
      }
      if (!adminReady) {
        console.log('[deploy:start] PocketBase admin not yet confirmed — trying REST API fallback...');
        try {
          const apiCreds = await nativePM.createPocketBaseAdminViaAPI();
          console.log('[deploy:start] PocketBase admin created via API:', apiCreds.email);
          fs.writeFileSync(
            path.join(ALLOFLOW_DIR, 'pb_admin_info.txt'),
            `PocketBase Admin Credentials\n` +
            `=============================\n` +
            `Email: ${apiCreds.email}\n` +
            `Password: ${apiCreds.password}\n` +
            `Created: ${apiCreds.createdAt}\n` +
            `\nAccess at: http://localhost:8090/_/\n`
          );
        } catch (apiErr) {
          console.warn('[deploy:start] PocketBase API admin fallback also failed:', apiErr.message);
        }
      }
    }

    // PHASE 5: Set up Ollama models (pull models selected in wizard)
    if (servicesToInstall.includes('ollama')) {
      const modelsToPull = setupData.selectedModels && setupData.selectedModels.length > 0
        ? setupData.selectedModels
        : ['neural-chat:7b']; // Fallback if somehow no models were selected

      // Check if models are already installed
      let installedModels = [];
      try {
        installedModels = await ollamaManager.getInstalledModels();
      } catch (err) {
        console.warn('[deploy:start] Could not check installed models:', err.message);
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
        ttsProvider: 'browser',
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
    const allServices = ['ollama', 'pocketbase', 'piper', 'flux'];
    const installed = {};
    for (const serviceId of allServices) {
      installed[serviceId] = nativePM.isServiceInstalled(serviceId);
    }
    return { success: true, services: installed };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Check if PocketBase admin is configured
ipcMain.handle('pocketbase:check-admin', async (event) => {
  try {
    const creds = await nativePM.getPocketBaseAdmin();
    return {
      configured: creds !== null,
      email: creds ? creds.email : null
    };
  } catch (err) {
    console.error('[ipc:pocketbase:check-admin] Error:', err.message);
    return { configured: false, email: null };
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
    return { success: false, error: err.message };
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
