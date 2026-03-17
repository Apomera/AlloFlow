const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const fs = require('fs');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// GPU Detection system - unified across all apps
const { GPUDetector, detectGPU, generateEnvFile } = require('./gpu-detection.js');
const { DockerGPUSetup } = require('./docker/docker-gpu-setup.js');

const execAsync = promisify(exec);

const isDev = !app.isPackaged;
const role = process.env.ALLOFLOW_ROLE || 'student'; // 'student' or 'teacher'
const serverUrl = process.env.ALLOFLOW_SERVER_URL || 'http://localhost:8090';
const kioskMode = process.env.ALLOFLOW_KIOSK_MODE === 'true';

let mainWindow;

const createWindow = () => {
  const preloadPath = path.join(__dirname, 'preload.js');
  
  const windowConfig = {
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  };

  if (kioskMode) {
    // Kiosk mode: full screen, no chrome
    windowConfig.fullscreen = true;
    windowConfig.show = false;
  } else {
    // Normal mode
    windowConfig.width = 1200;
    windowConfig.height = 800;
    windowConfig.minWidth = 800;
    windowConfig.minHeight = 600;
  }

  mainWindow = new BrowserWindow(windowConfig);

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  if (kioskMode) {
    setTimeout(() => mainWindow.show(), 500);
    
    // Prevent escape from exiting kiosk
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key.toLowerCase() === 'escape') {
        event.preventDefault();
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// App lifecycle
app.on('ready', () => {
  createWindow();
  createMenu();
  
  // Check for updates on startup
  if (!isDev) {
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
      submenu: [
        { label: 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ],
    },
  ];

  if (!kioskMode) {
    template.push({
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { label: 'DevTools', accelerator: 'CmdOrCtrl+I', click: () => mainWindow.webContents.openDevTools() }
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

// IPC Handlers
ipcMain.handle('app:get-config', () => {
  return {
    role,
    serverUrl,
    kioskMode,
    version: app.getVersion(),
    isDev
  };
});

ipcMain.handle('app:get-server-url', () => {
  return serverUrl;
});

ipcMain.handle('app:get-role', () => {
  return role;
});

// Auto-updater events
autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update:available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow.webContents.send('update:downloaded', info);
});

autoUpdater.on('error', (error) => {
  log.error('Auto-updater error:', error);
  mainWindow.webContents.send('update:error', error.message);
});

// Quit after update installation
ipcMain.handle('app:install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// Configure update server
ipcMain.handle('app:configure-updates', async (event, config) => {
  try {
    if (config.updateServer) {
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

// GPU Detection & Docker Setup handlers
ipcMain.handle('setup:detect-gpu', async (event) => {
  try {
    const gpu = detectGPU();
    return {
      success: true,
      type: gpu.type,
      driver: gpu.driver,
      model: gpu.model,
      vram: gpu.vram,
      supported: gpu.supported,
      details: gpu.details
    };
  } catch (err) {
    log.error('GPU detection error:', err);
    return {
      success: false,
      type: 'cpu',
      error: err.message
    };
  }
});

ipcMain.handle('docker-setup:run', async (event) => {
  try {
    const setup = new DockerGPUSetup();
    setup.run();
    const gpu = detectGPU();
    return {
      success: true,
      gpu: { type: gpu.type, driver: gpu.driver, details: gpu.details },
      message: `Docker configuration generated for ${gpu.type}`
    };
  } catch (err) {
    log.error('Docker setup error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('docker:start-services', async (event) => {
  try {
    const dockerDir = path.join(__dirname, './docker');
    const result = await execAsync(
      'docker compose -f docker-compose.universal.yml up -d',
      { cwd: dockerDir }
    );
    return { success: true, stdout: result.stdout };
  } catch (err) {
    log.error('Error starting services:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('docker:stop-services', async (event) => {
  try {
    const dockerDir = path.join(__dirname, './docker');
    const result = await execAsync(
      'docker compose -f docker-compose.universal.yml down',
      { cwd: dockerDir }
    );
    return { success: true, stdout: result.stdout };
  } catch (err) {
    log.error('Error stopping services:', err);
    return { success: false, error: err.message };
  }
});

// Exit with alt+F4 handler for non-kiosk mode
if (!kioskMode) {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
