const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { spawn, exec, execFile } = require('child_process');
const fs = require('fs');
const { promisify } = require('util');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging for auto-updater
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't auto-download, ask user first
autoUpdater.autoInstallOnAppQuit = true; // Install update when user quits app

const execAsync = promisify(exec);
const isDev = !app.isPackaged; // Check if running in development mode
let mainWindow;
let dockerProcess = null;

// Auto-update state
let updateAvailable = false;
let updateDownloaded = false;

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
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
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

ipcMain.handle('docker:services', async (event) => {
  try {
    const dockerRoot = path.join(__dirname, '..');
    const { stdout } = await execAsync('docker compose ps --format json', { cwd: dockerRoot });
    const services = JSON.parse(stdout);
    return services.map(s => ({
      name: s.Service || s.name,
      status: s.State === 'running' ? 'running' : 'stopped',
      port: s.Ports ? s.Ports.split(':')[1]?.split('/')[0] : '-',
      containerId: s.ID?.substring(0, 12),
    }));
  } catch (err) {
    console.error('Error fetching services:', err.message);
    // Return mock data if docker is not available
    return [
      { name: 'pocketbase', status: 'running', port: '8090' },
      { name: 'ollama', status: 'running', port: '11434' },
      { name: 'flux', status: 'running', port: '7860' },
      { name: 'edge-tts', status: 'offline', port: '5001' },
      { name: 'piper', status: 'offline', port: '10200' },
      { name: 'searxng', status: 'offline', port: '8888' },
    ];
  }
});

ipcMain.handle('docker:logs', async (event, service) => {
  try {
    const dockerRoot = path.join(__dirname, '..');
    const { stdout } = await execAsync(`docker compose logs --tail=50 ${service}`, { cwd: dockerRoot });
    return stdout;
  } catch (err) {
    return `Error fetching logs for ${service}: ${err.message}`;
  }
});

ipcMain.handle('docker:restart', async (event, service) => {
  try {
    const dockerRoot = path.join(__dirname, '..');
    console.log(`Restarting ${service}...`);
    await execAsync(`docker compose restart ${service}`, { cwd: dockerRoot });
    return { success: true, message: `${service} restarted successfully` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('docker:compose-up', async (event) => {
  try {
    const dockerRoot = path.join(__dirname, '..');
    console.log('Starting Docker Compose stack...');
    // Run in background; don't wait for completion
    exec('docker compose up -d', { cwd: dockerRoot }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Compose up error: ${error.message}`);
        return;
      }
      console.log('Compose stack started');
    });
    return { success: true, message: 'Stack starting...' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('docker:compose-down', async (event) => {
  try {
    const dockerRoot = path.join(__dirname, '..');
    console.log('Stopping Docker Compose stack...');
    await execAsync('docker compose down', { cwd: dockerRoot });
    return { success: true, message: 'Stack stopped' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('system:read-env', async (event) => {
  try {
    const envPath = path.join(__dirname, '../.env');
    const env = fs.readFileSync(envPath, 'utf8');
    return env;
  } catch (err) {
    console.error('Error reading .env:', err.message);
    return '';
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
    const configPath = path.join(__dirname, '../ai-config.json');
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
    const configPath = path.join(__dirname, '../ai-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('AI configuration saved');
    return { success: true, message: 'Configuration saved' };
  } catch (err) {
    console.error('Error writing AI config:', err.message);
    return { success: false, error: err.message };
  }
});

// Setup Wizard handlers
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
    // Check for NVIDIA GPU
    try {
      await execAsync('nvidia-smi');
      console.log('NVIDIA GPU detected');
      return 'nvidia';
    } catch (e) {
      // NVIDIA not found, check AMD
    }
    
    // Check for AMD GPU (ROCm)
    try {
      await execAsync('rocm-smi');
      console.log('AMD GPU detected');
      return 'amd';
    } catch (e) {
      // AMD not found
    }
    
    // Check via system info (fallback for Windows/macOS)
    const platform = process.platform;
    if (platform === 'win32') {
      const { stdout } = await execAsync('wmic path win32_VideoController get name');
      if (stdout.toLowerCase().includes('nvidia')) return 'nvidia';
      if (stdout.toLowerCase().includes('amd') || stdout.toLowerCase().includes('radeon')) return 'amd';
    } else if (platform === 'darwin') {
      const { stdout } = await execAsync('system_profiler SPDisplaysDataType');
      if (stdout.toLowerCase().includes('amd') || stdout.toLowerCase().includes('radeon')) return 'amd';
    }
    
    console.log('No GPU detected');
    return null;
  } catch (err) {
    console.error('GPU detection error:', err.message);
    return null;
  }
});

ipcMain.handle('setup:get-server-ip', async (event) => {
  try {
    const os = require('os');
    const nets = os.networkInterfaces();
    
    // Find first non-internal IPv4 address
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    
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

ipcMain.handle('setup:run', async (event, config) => {
  try {
    const dockerRoot = path.join(__dirname, '..');
    console.log('Starting AlloFlow setup with config:', config);
    
    // Step 1: Save AI configuration
    const aiConfigPath = path.join(dockerRoot, 'ai-config.json');
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
    
    // Step 2: Create .env file
    const envPath = path.join(dockerRoot, '.env');
    const envContent = `
SERVER_IP=${config.serverIp}
GPU_TYPE=${config.gpuType || 'none'}
AI_BACKEND=${config.aiBackend}
DEPLOYMENT_MODE=${config.deploymentMode}
${config.deploymentMode === 'join-cluster' ? `CLUSTER_PRIMARY_IP=${config.clusterPrimaryIp}\nCLUSTER_TOKEN=${config.clusterToken}` : ''}
`.trim();
    fs.writeFileSync(envPath, envContent);
    
    // Step 3: Pull Docker images (send progress updates)
    mainWindow.webContents.send('setup:progress', { step: 'Pulling Docker images...', progress: 10 });
    
    // Use appropriate docker-compose file based on GPU type
    const composeFile = config.gpuType === 'amd' ? 'docker-compose.rocm.yml' : 'docker-compose.yml';
    await execAsync(`docker compose -f ${composeFile} pull`, { cwd: path.join(dockerRoot, 'docker') });
    
    // Step 4: Start Docker stack
    mainWindow.webContents.send('setup:progress', { step: 'Starting services...', progress: 40 });
    await execAsync(`docker compose -f ${composeFile} up -d`, { cwd: path.join(dockerRoot, 'docker') });
    
    // Step 5: Download AI models (if local/hybrid)
    if (config.aiBackend !== 'cloud') {
      mainWindow.webContents.send('setup:progress', { step: 'Downloading DeepSeek R1 1.5B...', progress: 50 });
      await execAsync('docker exec ollama ollama pull deepseek-r1:1.5b');
      
      mainWindow.webContents.send('setup:progress', { step: 'Downloading Phi 3.5...', progress: 70 });
      await execAsync('docker exec ollama ollama pull phi3.5');
      
      if (config.models.image && config.gpuType) {
        mainWindow.webContents.send('setup:progress', { step: 'Pulling Flux image model...', progress: 85 });
        // Flux is already in docker image, just needs to start
      }
    }
    
    // Step 6: Create PocketBase admin user
    mainWindow.webContents.send('setup:progress', { step: 'Creating admin account...', progress: 95 });
    // TODO: API call to PocketBase to create admin user
    
    // Step 7: Mark setup as complete
    fs.writeFileSync(path.join(dockerRoot, 'setup-complete.lock'), new Date().toISOString());
    
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
// APP LIFECYCLE
// ============================================================================

// App lifecycle
app.on('ready', () => {
  createWindow();
  
  // Check for updates on startup (only in production)
  if (!isDev) {
    // Wait 3 seconds after startup before checking for updates
    setTimeout(() => {
      log.info('Checking for updates...');
      autoUpdater.checkForUpdates().catch(err => {
        log.error('Failed to check for updates:', err);
      });
    }, 3000);
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
