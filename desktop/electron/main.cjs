'use strict';

const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, safeStorage, shell } = require('electron');
const runtime = require('../runtime/alloflow-desktop-runtime.cjs');

let autoUpdater = null;
let electronLog = null;
let updaterLoadError = null;
try {
  electronLog = require('electron-log');
  ({ autoUpdater } = require('electron-updater'));
} catch (error) {
  updaterLoadError = error;
}

const DEFAULT_HOST = process.env.ALLOFLOW_DESKTOP_HOST || '127.0.0.1';
const DEFAULT_PORT = Number(process.env.ALLOFLOW_DESKTOP_PORT || 32170);
const MAX_PORT_ATTEMPTS = 20;

let mainWindow = null;
let runtimeServer = null;
let runtimePort = DEFAULT_PORT;
let commandCenterUrl = `http://${DEFAULT_HOST}:${runtimePort}`;
let updateConfigured = false;
let updateListenersRegistered = false;
const updateState = {
  configured: false,
  checking: false,
  downloading: false,
  downloaded: false,
  available: false,
  currentVersion: app.getVersion(),
  availableVersion: '',
  progress: null,
  platform: process.platform,
  arch: process.arch,
  channel: process.env.ALLOFLOW_UPDATE_CHANNEL || 'latest',
  provider: '',
  feed: '',
  lastError: updaterLoadError ? updaterLoadError.message : '',
  message: updaterLoadError ? 'Desktop updater is not available in this build.' : 'Update status has not been checked yet.',
};

function notifyFullScreenChange(enabled) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('alloflow-desktop:full-screen-changed', Boolean(enabled));
  }
}

function getCommandCenterUrl() {
  return commandCenterUrl;
}

function setRuntimePort(port) {
  runtimePort = port;
  commandCenterUrl = `http://${DEFAULT_HOST}:${runtimePort}`;
  process.env.ALLOFLOW_DESKTOP_PORT = String(runtimePort);
}

function getLogPath() {
  return path.join(app.getPath('userData'), 'desktop-main.log');
}

function logLine(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.appendFileSync(getLogPath(), line, 'utf8');
  } catch (_) {
    // Logging should never block app launch.
  }
  console.log('[AlloFlow Desktop]', message);
}

function publishUpdateState(patch = {}) {
  Object.assign(updateState, patch, {
    currentVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    channel: getConfiguredUpdateChannel(),
  });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('alloflow-desktop:update-status', { ...updateState });
  }
  return { ...updateState };
}

function getConfiguredUpdateChannel() {
  try {
    const config = runtime.readConfig();
    return process.env.ALLOFLOW_UPDATE_CHANNEL || config.updates?.channel || 'latest';
  } catch (_) {
    return process.env.ALLOFLOW_UPDATE_CHANNEL || updateState.channel || 'latest';
  }
}

function configureDesktopSecretStorage() {
  runtime.configureSecretStorage({
    id: 'electron-safe-storage',
    label: process.platform === 'darwin' ? 'macOS Keychain' : (process.platform === 'win32' ? 'Windows protected storage' : 'OS protected storage'),
    isAvailable: () => Boolean(safeStorage && safeStorage.isEncryptionAvailable()),
    encrypt: (value) => safeStorage.encryptString(String(value || '')).toString('base64'),
    decrypt: (encrypted) => safeStorage.decryptString(Buffer.from(String(encrypted || ''), 'base64')),
  });
}

function registerUpdateListeners() {
  if (!autoUpdater || updateListenersRegistered) return;
  updateListenersRegistered = true;

  autoUpdater.on('checking-for-update', () => {
    publishUpdateState({
      checking: true,
      message: 'Checking for updates...',
      lastError: '',
    });
  });

  autoUpdater.on('update-available', (info) => {
    publishUpdateState({
      checking: false,
      available: true,
      downloaded: false,
      availableVersion: info && info.version ? info.version : '',
      message: 'Update available.',
    });
  });

  autoUpdater.on('update-not-available', () => {
    publishUpdateState({
      checking: false,
      available: false,
      downloaded: false,
      availableVersion: '',
      message: 'AlloFlow Desktop is up to date.',
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    publishUpdateState({
      checking: false,
      downloading: true,
      progress,
      message: `Downloading update (${Math.round(progress.percent || 0)}%).`,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    publishUpdateState({
      checking: false,
      downloading: false,
      downloaded: true,
      available: true,
      availableVersion: info && info.version ? info.version : updateState.availableVersion,
      progress: null,
      message: 'Update downloaded. Restart AlloFlow Desktop to install it.',
    });
  });

  autoUpdater.on('error', (error) => {
    publishUpdateState({
      checking: false,
      downloading: false,
      lastError: error && error.message ? error.message : String(error || 'Unknown update error'),
      message: 'Update check failed.',
    });
    logLine('Updater error: ' + (error && error.stack ? error.stack : error.message));
  });
}

function configureUpdates(force = false) {
  const channel = getConfiguredUpdateChannel();
  if (updateConfigured && !force && updateState.channel === channel) return publishUpdateState();
  updateConfigured = true;

  if (!autoUpdater) {
    return publishUpdateState({
      configured: false,
      message: 'Desktop updater is not available in this build.',
      lastError: updaterLoadError ? updaterLoadError.message : 'electron-updater could not be loaded.',
    });
  }

  const genericFeed = process.env.ALLOFLOW_UPDATE_FEED_URL || '';
  if (!app.isPackaged && !genericFeed) {
    return publishUpdateState({
      configured: false,
      provider: 'development',
      feed: 'development build',
      channel,
      message: 'Updates are enabled in packaged release builds.',
      lastError: '',
    });
  }

  if (electronLog) {
    autoUpdater.logger = electronLog;
    electronLog.transports.file.level = 'info';
  }
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = channel !== 'latest';
  autoUpdater.channel = channel;

  if (genericFeed) {
    autoUpdater.setFeedURL({ provider: 'generic', url: genericFeed, channel });
  }

  const provider = genericFeed ? 'generic' : 'github';
  publishUpdateState({
    configured: true,
    provider,
    channel,
    feed: `${genericFeed || 'GitHub Releases'} (${process.platform}/${process.arch})`,
    message: 'Ready to check for updates.',
    lastError: '',
  });

  registerUpdateListeners();
  return publishUpdateState();
}

function prepareDesktopRuntimeHome() {
  if (!process.env.ALLOFLOW_DESKTOP_HOME) {
    process.env.ALLOFLOW_DESKTOP_HOME = path.join(app.getPath('userData'), 'runtime');
  }
}

function getWindowIcon() {
  const candidates = [
    path.join(process.resourcesPath || '', 'icon.ico'),
    path.join(__dirname, '..', 'build-resources', 'icon.ico'),
  ];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function samePath(a, b) {
  if (!a || !b) return false;
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
}

function isExpectedRuntime(health) {
  return Boolean(
    health &&
    health.name === 'AlloFlow Desktop Runtime' &&
    samePath(health.dataDir, runtime.getDataDir()) &&
    health.appManager
  );
}

function fetchJson(url, timeoutMs = 900) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .finally(() => clearTimeout(timeout));
}

function postJson(url, timeoutMs = 35000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .finally(() => clearTimeout(timeout));
}

async function waitForRuntime(url, timeoutMs = 6000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await fetchJson(url + '/api/health', 700);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
  }
  throw lastError || new Error('Desktop runtime did not start.');
}

async function ensureRuntime() {
  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    const port = DEFAULT_PORT + attempt;
    const url = `http://${DEFAULT_HOST}:${port}`;

    try {
      const existingHealth = await fetchJson(url + '/api/health', 700);
      if (isExpectedRuntime(existingHealth)) {
        setRuntimePort(port);
        logLine(`Using existing packaged runtime at ${url}`);
        return existingHealth;
      }
      logLine(`Skipping runtime at ${url}; it belongs to ${existingHealth.dataDir || 'another process'}.`);
    } catch (_) {
      // No compatible runtime answered on this port, so try to bind it.
    }

    const server = runtime.createServer();
    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => {
          server.off('listening', onListening);
          reject(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, DEFAULT_HOST);
      });
      runtimeServer = server;
      setRuntimePort(port);
      logLine(`Started packaged runtime at ${getCommandCenterUrl()}`);
      return waitForRuntime(getCommandCenterUrl());
    } catch (error) {
      server.close();
      if (error && error.code === 'EADDRINUSE') {
        logLine(`Port ${port} is already in use; trying next port.`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`No available AlloFlow Desktop runtime port found starting at ${DEFAULT_PORT}.`);
}

async function autoStartAlloFlowApp() {
  const config = runtime.readConfig();
  if (config.app?.autoStart === false) return null;
  try {
    return await postJson(getCommandCenterUrl() + '/api/app/start');
  } catch (error) {
    logLine('App auto-start skipped: ' + error.message);
    return null;
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'AlloFlow Desktop',
    backgroundColor: '#f5f7f5',
    icon: getWindowIcon(),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    publishUpdateState();
  });

  mainWindow.on('enter-full-screen', () => notifyFullScreenChange(true));
  mainWindow.on('leave-full-screen', () => notifyFullScreenChange(false));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(getCommandCenterUrl())) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(getCommandCenterUrl());
}

ipcMain.handle('alloflow-desktop:runtime-info', async () => ({
  commandCenterUrl: getCommandCenterUrl(),
  version: runtime.VERSION,
  configPath: runtime.getConfigPath(),
  dataDir: runtime.getDataDir(),
  logPath: getLogPath(),
}));

ipcMain.handle('alloflow-desktop:update-status', async () => configureUpdates());

ipcMain.handle('alloflow-desktop:set-update-channel', async (_event, channel) => {
  const normalized = String(channel || 'latest').toLowerCase() === 'beta' ? 'beta' : 'latest';
  const config = runtime.readConfig();
  runtime.writeConfig({
    ...config,
    updates: {
      ...(config.updates || {}),
      channel: normalized,
    },
  });
  return configureUpdates(true);
});

ipcMain.handle('alloflow-desktop:check-for-updates', async () => {
  configureUpdates();
  if (!autoUpdater || !updateState.configured) {
    return publishUpdateState({
      checking: false,
      message: updateState.message || 'Updates are not configured for this build.',
    });
  }
  try {
    publishUpdateState({ checking: true, lastError: '', message: 'Checking for updates...' });
    await autoUpdater.checkForUpdates();
  } catch (error) {
    publishUpdateState({
      checking: false,
      lastError: error.message,
      message: 'Update check failed.',
    });
  }
  return publishUpdateState();
});

ipcMain.handle('alloflow-desktop:download-update', async () => {
  configureUpdates();
  if (!autoUpdater || !updateState.configured) {
    return publishUpdateState({ message: 'Updates are not configured for this build.' });
  }
  if (!updateState.available) {
    return publishUpdateState({ message: 'No update is available to download.' });
  }
  try {
    publishUpdateState({ downloading: true, lastError: '', message: 'Downloading update...' });
    await autoUpdater.downloadUpdate();
  } catch (error) {
    publishUpdateState({
      downloading: false,
      lastError: error.message,
      message: 'Update download failed.',
    });
  }
  return publishUpdateState();
});

ipcMain.handle('alloflow-desktop:install-update', async () => {
  configureUpdates();
  if (!autoUpdater || !updateState.downloaded) {
    return publishUpdateState({ message: 'No downloaded update is ready to install.' });
  }
  publishUpdateState({ message: 'Installing update and restarting...' });
  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });
  return publishUpdateState();
});

ipcMain.handle('alloflow-desktop:set-full-screen', async (_event, enabled) => {
  if (!mainWindow) return false;
  mainWindow.setFullScreen(Boolean(enabled));
  return mainWindow.isFullScreen();
});

ipcMain.handle('alloflow-desktop:is-full-screen', async () => (
  mainWindow ? mainWindow.isFullScreen() : false
));

app.whenReady().then(async () => {
  configureDesktopSecretStorage();
  prepareDesktopRuntimeHome();
  logLine('Launching AlloFlow Desktop');
  logLine('Runtime data dir: ' + runtime.getDataDir());
  await ensureRuntime();
  await autoStartAlloFlowApp();
  configureUpdates();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}).catch((error) => {
  logLine('Launch failed: ' + (error && error.stack ? error.stack : error.message));
  app.quit();
});

app.on('before-quit', () => {
  if (runtimeServer) {
    runtimeServer.close();
    runtimeServer = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
