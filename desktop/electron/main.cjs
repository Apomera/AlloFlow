'use strict';

const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require('electron');
const runtime = require('../runtime/alloflow-desktop-runtime.cjs');
const { assertTrustedIpcSender, isSameOrigin } = require('./security.cjs');

// ── Build edition ('desktop' | 'admin' | '' = unflavored upstream) ──────────
// Baked at package time by scripts/build-edition.cjs via electron-builder
// extraMetadata.alloEdition; ALLOFLOW_DESKTOP_EDITION env overrides for dev.
//   desktop — boots straight into the web app full-bleed (single teacher).
//   admin   — school-server posture: boots into the command center and
//             auto-starts LAN Share with a required join PIN, so teachers
//             reach the app from browsers at http://<server-ip>:32175/app/.
// Unflavored builds keep pure upstream behavior.
function getEdition() {
  const fromEnv = String(process.env.ALLOFLOW_DESKTOP_EDITION || '').toLowerCase();
  if (fromEnv === 'desktop' || fromEnv === 'admin') return fromEnv;
  try {
    const fromPkg = String(require('../package.json').alloEdition || '').toLowerCase();
    if (fromPkg === 'desktop' || fromPkg === 'admin') return fromPkg;
  } catch (_) {}
  return '';
}
const DESKTOP_EDITION = getEdition();
// Expose to the runtime (it reports the edition in /api/health so the command
// center can adapt its boot view without a new IPC surface).
if (DESKTOP_EDITION) process.env.ALLOFLOW_DESKTOP_EDITION = DESKTOP_EDITION;

let autoUpdater = null;
let electronLog = null;
let updaterLoadError = null;
try {
  electronLog = require('electron-log');
  ({ autoUpdater } = require('electron-updater'));
} catch (error) {
  updaterLoadError = error;
}

// ── Renderer capability switches (probe-verified 2026-07-06, Electron 39) ──
// The desktop shell is a local, trusted surface, and two Chromium defaults
// silently break shipped features inside it:
// 1. Gesture-gated autoplay: read-aloud audio starts AFTER multi-second
//    on-device Kokoro synthesis, so the click's transient activation (~5s)
//    expires and Audio.play() rejects — every caller then falls back to the
//    robotic browser voice even though the Kokoro engine is ready. (A/B on
//    this machine: rejected without the switch, plays with it.)
// 2. WebGPU adapter: navigator.gpu exists but requestAdapter() returns null
//    without the enable switch, so local SD-Turbo image generation can never
//    run. (A/B: adapter null → real adapter.)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-unsafe-webgpu');

const DEFAULT_HOST = process.env.ALLOFLOW_DESKTOP_HOST || '127.0.0.1';
const DEFAULT_PORT = Number(process.env.ALLOFLOW_DESKTOP_PORT || 32170);
const MAX_PORT_ATTEMPTS = 20;
const PRIVATE_API_TOKEN = crypto.randomBytes(32).toString('base64url');

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

function getBundledAppOrigin() {
  return 'http://localhost:' + runtimePort;
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
  return fetch(url, {
    headers: { 'X-Allo-Desktop-Token': PRIVATE_API_TOKEN },
    signal: controller.signal,
  })
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
    headers: { 'Content-Type': 'application/json', 'X-Allo-Desktop-Token': PRIVATE_API_TOKEN },
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
      if (isExpectedRuntime(existingHealth) && existingHealth.privateApiAuth === 'launch-token') {
        await fetchJson(url + '/api/config', 700);
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
      // Honor localEngine.enabled here too: main() (which also autostarts) is
      // unreachable in the packaged app — we require the runtime as a module.
      if (typeof runtime.maybeAutostartEngine === 'function') {
        runtime.maybeAutostartEngine().catch(() => {});
      }
      // Same for the offline ASR server (oral-reading-fluency practice).
      if (typeof runtime.maybeAutostartAsr === 'function') {
        runtime.maybeAutostartAsr().catch(() => {});
      }
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

// The command center renders untrusted content (student/LAN session data, model
// output). A link in that content is handed to the OS via shell.openExternal,
// which will launch non-web schemes (file:, and OS-registered protocol handlers)
// — a foothold for opening local files or other apps. Restrict handoff to the
// web/mail schemes a "click a link" gesture legitimately needs.
function openExternalIfSafe(url) {
  try {
    const scheme = new URL(url).protocol;
    if (scheme === 'http:' || scheme === 'https:' || scheme === 'mailto:') {
      shell.openExternal(url);
      return true;
    }
  } catch (_) {
    // Not a parseable absolute URL — fall through to the block path.
  }
  logLine('Blocked external open for non-web URL: ' + String(url).slice(0, 200));
  return false;
}

function configurePrivateApiRequestHeaders(targetWindow) {
  const filter = {
    urls: [getCommandCenterUrl() + '/api/*', getBundledAppOrigin() + '/api/*'],
  };
  targetWindow.webContents.session.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const requestHeaders = { ...(details.requestHeaders || {}) };
    for (const key of Object.keys(requestHeaders)) {
      if (key.toLowerCase() === 'x-allo-desktop-token') delete requestHeaders[key];
    }
    let fromCommandCenterMainFrame = false;
    try {
      fromCommandCenterMainFrame = Boolean(
        details.webContentsId === targetWindow.webContents.id &&
        details.frame &&
        details.frame.parent === null &&
        isSameOrigin(details.frame.url, getCommandCenterUrl())
      );
    } catch (_) {
      fromCommandCenterMainFrame = false;
    }
    if (fromCommandCenterMainFrame) requestHeaders['X-Allo-Desktop-Token'] = PRIVATE_API_TOKEN;
    callback({ requestHeaders });
  });
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
      // Run the preload in the same-origin #app-frame iframe too, so the web
      // app sees window.alloAPI (save-to-folder bridge). IPC handlers still
      // verify the sender frame's origin via assertTrustedIpcSender.
      nodeIntegrationInSubFrames: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    publishUpdateState();
  });

  mainWindow.on('enter-full-screen', () => notifyFullScreenChange(true));
  mainWindow.on('leave-full-screen', () => notifyFullScreenChange(false));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // In-app popup views (accessibility reports, print previews, export
    // windows) open via window.open with about:blank/blob:/data: URLs —
    // allow those as child windows; real external links open in the browser.
    if (url === 'about:blank' || url.startsWith('blob:') || url.startsWith('data:')) {
      return { action: 'allow' };
    }
    openExternalIfSafe(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isSameOrigin(url, getCommandCenterUrl())) {
      event.preventDefault();
      openExternalIfSafe(url);
    }
  });

  configurePrivateApiRequestHeaders(mainWindow);
  mainWindow.loadURL(getCommandCenterUrl());
}

function handleTrustedIpc(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedIpcSender(event, getCommandCenterUrl());
    return handler(event, ...args);
  });
}

handleTrustedIpc('alloflow-desktop:runtime-info', async () => ({
  commandCenterUrl: getCommandCenterUrl(),
  version: runtime.VERSION,
  configPath: runtime.getConfigPath(),
  dataDir: runtime.getDataDir(),
  logPath: getLogPath(),
}));

handleTrustedIpc('alloflow-desktop:update-status', async () => configureUpdates());

handleTrustedIpc('alloflow-desktop:set-update-channel', async (_event, channel) => {
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

handleTrustedIpc('alloflow-desktop:check-for-updates', async () => {
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

handleTrustedIpc('alloflow-desktop:download-update', async () => {
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

handleTrustedIpc('alloflow-desktop:install-update', async () => {
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

handleTrustedIpc('alloflow-desktop:set-full-screen', async (_event, enabled) => {
  if (!mainWindow) return false;
  mainWindow.setFullScreen(Boolean(enabled));
  return mainWindow.isFullScreen();
});

handleTrustedIpc('alloflow-desktop:is-full-screen', async () => (
  mainWindow ? mainWindow.isFullScreen() : false
));

// ── Save remediated documents to a local folder ─────────────────────────────
// Ported from the AlloFlow Admin app (the doc pipeline's batch export checks
// window.alloAPI.remediation.saveFiles and prefers a folder of files over a
// browser ZIP download when the bridge exists — see doc_pipeline_source.jsx).
// payload = { folderName?: string, files: [{ name, data, encoding: 'base64'|'utf8' }] }
// Returns { canceled } | { folder, saved } | { error }.
handleTrustedIpc('remediation:save-files', async (_event, payload) => {
  try {
    const files = (payload && Array.isArray(payload.files)) ? payload.files : [];
    if (files.length === 0) return { error: 'No files to save' };

    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath: os.homedir(),
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose where to save the files',
      buttonLabel: 'Save Here',
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };

    const rawName = (payload && payload.folderName) || 'AlloFlow_Export';
    const folderName = String(rawName).replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || 'AlloFlow_Export';
    const baseDir = path.join(result.filePaths[0], folderName);
    fs.mkdirSync(baseDir, { recursive: true });

    let saved = 0;
    for (const f of files) {
      if (!f || !f.name || typeof f.data !== 'string') continue;
      const safe = String(f.name).replace(/[\\/:*?"<>|]/g, '_');
      const buf = f.encoding === 'utf8' ? Buffer.from(f.data, 'utf8') : Buffer.from(f.data, 'base64');
      fs.writeFileSync(path.join(baseDir, safe), buf);
      saved++;
    }

    logLine(`Saved ${saved} file(s) to ${baseDir}`);
    return { canceled: false, folder: baseDir, saved };
  } catch (error) {
    return { error: String((error && error.message) || error) };
  }
});

// Reveal a saved folder/file in the OS file manager.
handleTrustedIpc('remediation:reveal-path', async (_event, targetPath) => {
  try {
    if (typeof targetPath !== 'string' || !fs.existsSync(targetPath)) {
      return { error: 'Path not found' };
    }
    await shell.openPath(targetPath);
    return { success: true };
  } catch (error) {
    return { error: String((error && error.message) || error) };
  }
});

// Admin edition: the server is only useful when teachers can reach it, so LAN
// Share auto-starts at boot — and never without a join PIN. If no PIN is set,
// generate a 6-digit one and persist it (shown in the command center banner).
async function ensureAdminServerPosture() {
  if (DESKTOP_EDITION !== 'admin') return;
  try {
    let config = runtime.readConfig();
    const lan = (config.liveSession && config.liveSession.lan) || {};
    if (!String(lan.pin || '').trim()) {
      const pin = String(Math.floor(100000 + Math.random() * 900000));
      config = runtime.writeConfig({
        ...config,
        liveSession: { ...config.liveSession, lan: { ...lan, pin } },
      });
      logLine('Admin edition: generated LAN join PIN (shown in the command center).');
    }
    const status = await runtime.startLanShare(config);
    const urls = (status && status.appUrls) || [];
    logLine('Admin edition: LAN Share started — teachers connect at ' + (urls.join(' | ') || '(no LAN address detected)'));
  } catch (error) {
    // Non-fatal: the command center still shows LAN Share controls for manual start.
    logLine('Admin edition: LAN Share autostart failed: ' + (error && error.message ? error.message : error));
  }
}

app.whenReady().then(async () => {
  configureDesktopSecretStorage();
  runtime.configurePrivateApiToken(PRIVATE_API_TOKEN);
  prepareDesktopRuntimeHome();
  logLine('Launching AlloFlow Desktop' + (DESKTOP_EDITION ? ` (${DESKTOP_EDITION} edition)` : ''));
  logLine('Runtime data dir: ' + runtime.getDataDir());
  await ensureRuntime();
  await autoStartAlloFlowApp();
  await ensureAdminServerPosture();
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

let engineTorndown = false;
app.on('before-quit', (event) => {
  // Never orphan the child servers: llama-server holds ~2GB RAM + the engine
  // port, whisper-server holds the ASR port, and a leftover of either would
  // poison the next launch's health checks / port preflight.
  const canTeardown = typeof runtime.stopLocalEngine === 'function' || typeof runtime.stopLocalAsr === 'function';
  if (!engineTorndown && canTeardown) {
    engineTorndown = true;
    event.preventDefault();
    const teardowns = [];
    if (typeof runtime.stopLocalEngine === 'function') teardowns.push(Promise.resolve(runtime.stopLocalEngine()).catch(() => {}));
    if (typeof runtime.stopLocalAsr === 'function') teardowns.push(Promise.resolve(runtime.stopLocalAsr()).catch(() => {}));
    Promise.allSettled(teardowns).finally(() => {
      if (runtimeServer) {
        runtimeServer.close();
        runtimeServer = null;
      }
      app.quit();
    });
    return;
  }
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
