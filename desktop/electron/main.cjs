'use strict';

const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { app, BrowserWindow, desktopCapturer, dialog, ipcMain, Menu, safeStorage, screen, session, shell } = require('electron');
const runtime = require('../runtime/alloflow-desktop-runtime.cjs');
const {
  applyAlloSheetRequestAuth,
  isAllowedPrivateApiRequest,
  isTrustedAlloSheetGristFrameRequest,
} = require('./allosheet-request-auth.cjs');
const { assertTrustedIpcSender, getIpcSenderUrl, isSameOrigin } = require('./security.cjs');
const { selectUniqueWindowSource } = require('./coach-window-tracker.cjs');

// ── Build edition ('desktop' | 'admin' | 'remediation' | '' = unflavored) ───
// Baked at package time by scripts/build-edition.cjs via electron-builder
// extraMetadata.alloEdition; ALLOFLOW_DESKTOP_EDITION env overrides for dev.
//   desktop     — boots straight into the web app full-bleed (single teacher).
//   admin       — school-server posture: boots into the command center and
//                 auto-starts LAN Share with a required join PIN, so teachers
//                 reach the app from browsers at http://<server-ip>:32175/app/.
//   remediation — desktop posture, but the app frame boots into the focused
//                 document-remediation screen (?mode=remediation) and never
//                 exposes the full app. Selected during the Windows install
//                 step (see readInstallEditionChoice below), not a separate
//                 build.
// Unflavored builds keep pure upstream behavior.
const KNOWN_EDITIONS = ['desktop', 'admin', 'remediation'];

// The Windows installer's "Choose your experience" page (build-resources/
// installer.nsh) writes { "edition": "remediation" | "desktop", "installedAt":
// "<stamp>" } here on every interactive install. It lives in userData, not
// $INSTDIR, so auto-updates (which replace the install dir) never reset the
// choice; a later interactive reinstall rewrites it.
function readInstallMarker() {
  try {
    const markerPath = path.join(app.getPath('userData'), 'desktop-edition.json');
    return JSON.parse(fs.readFileSync(markerPath, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function readInstallEditionChoice() {
  const choice = String(readInstallMarker().edition || '').toLowerCase();
  return KNOWN_EDITIONS.includes(choice) ? choice : '';
}

// Reinstalling must bring the guided AI setup back (user requirement,
// 2026-07-16): the installer stamps each interactive install with
// installedAt, and when that stamp differs from the one recorded in the
// runtime config we clear setup.completed so the wizard greets again.
// Silent auto-updates never restamp, so updates stay quiet.
function ensureFreshInstallSetupReset() {
  try {
    const installId = String(readInstallMarker().installedAt || '');
    if (!installId) return;
    const config = runtime.readConfig();
    const setup = config.setup || {};
    if (String(setup.installId || '') === installId) return;
    runtime.writeConfig({
      ...config,
      setup: { ...setup, completed: false, installId },
    });
    logLine('Fresh interactive install detected (' + installId + '): AI setup wizard re-armed.');
  } catch (error) {
    logLine('Install-stamp check skipped: ' + (error && error.message ? error.message : error));
  }
}

function getEdition() {
  const fromEnv = String(process.env.ALLOFLOW_DESKTOP_EDITION || '').toLowerCase();
  if (KNOWN_EDITIONS.includes(fromEnv)) return fromEnv;
  // The install-step choice outranks the baked flavor: the desktop installer
  // bakes alloEdition 'desktop', and the marker is how a user turns that
  // install into the remediation experience (or back).
  const fromInstaller = readInstallEditionChoice();
  if (fromInstaller) return fromInstaller;
  try {
    const fromPkg = String(require('../package.json').alloEdition || '').toLowerCase();
    if (KNOWN_EDITIONS.includes(fromPkg)) return fromPkg;
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

// The managed AlloSheet engine owns a per-user Grist data directory. Running
// two Electron processes against it can corrupt SQLite state, so secondary
// launches hand focus back to the already-running app instead of starting a
// second runtime and spreadsheet engine.
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

const DEFAULT_HOST = app.isPackaged ? '127.0.0.1' : (process.env.ALLOFLOW_DESKTOP_HOST || '127.0.0.1');
const DEFAULT_PORT = Number(process.env.ALLOFLOW_DESKTOP_PORT || 32170);
const MAX_PORT_ATTEMPTS = 20;
const PRIVATE_API_TOKEN = crypto.randomBytes(32).toString('base64url');

let mainWindow = null;
let coachOverlayWindow = null;
let coachWindowTracker = null;
let coachTrackedHandle = '';
let coachTrackedBounds = null;
let coachTrackedSourceLabel = '';
let coachTrackedActive = false;
let coachTrackerInitPromise = null;
let coachTrackerLastStartAt = 0;
let coachOverlayEpoch = 0;
let focusRequestedBySecondInstance = false;
const trustedAlloSheetWebContents = new Map();
const knownAlloSheetSessionCookies = new Set();
let cachedAlloSheetPrivateAuth = null;
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

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    focusRequestedBySecondInstance = true;
    return;
  }
  focusRequestedBySecondInstance = false;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

if (hasSingleInstanceLock) {
  app.on('second-instance', focusMainWindow);
}

function getCommandCenterUrl() {
  return commandCenterUrl;
}

function getBundledAppOrigin() {
  const host = String(DEFAULT_HOST || '').toLowerCase() === 'localhost' ? '127.0.0.1' : 'localhost';
  return 'http://' + host + ':' + runtimePort;
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

  const genericFeed = app.isPackaged ? '' : (process.env.ALLOFLOW_UPDATE_FEED_URL || '');
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
    let parsedFeed;
    try { parsedFeed = new URL(genericFeed); } catch (_) { parsedFeed = null; }
    const feedHost = parsedFeed ? String(parsedFeed.hostname || '').replace(/^\[|\]$/g, '').toLowerCase() : '';
    const isDevLoopback = !app.isPackaged && parsedFeed && parsedFeed.protocol === 'http:' && (feedHost === '127.0.0.1' || feedHost === 'localhost' || feedHost === '::1');
    if (!parsedFeed || (parsedFeed.protocol !== 'https:' && !isDevLoopback) || parsedFeed.username || parsedFeed.password) {
      return publishUpdateState({
        configured: false,
        provider: 'generic',
        channel,
        feed: 'rejected update feed',
        message: 'Custom update feed URL must use HTTPS.',
        lastError: 'Invalid ALLOFLOW_UPDATE_FEED_URL protocol.',
      });
    }
    autoUpdater.setFeedURL({ provider: 'generic', url: parsedFeed.toString(), channel });
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

async function waitForRuntime(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      // Health includes optional School Box probes: two Docker commands may
      // each take up to 5 seconds, followed by service probes. A 700 ms
      // deadline aborts healthy cold starts on Windows before a window opens.
      const remainingMs = timeoutMs - (Date.now() - startedAt);
      return await fetchJson(url + '/api/health', Math.min(15000, remainingMs));
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
  }
  throw lastError || new Error('Desktop runtime did not start.');
}

async function ensureRuntime() {
  if (runtimeServer && runtimeServer.listening) {
    return waitForRuntime(getCommandCenterUrl());
  }
  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    const port = DEFAULT_PORT + attempt;
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
    const raw = String(url == null ? '' : url);
    if (!raw || raw.length > 4096 || /[\u0000-\u001f\u007f]/.test(raw)) throw new Error('Invalid external URL');
    const parsed = new URL(raw);
    const scheme = parsed.protocol;
    if ((scheme === 'http:' || scheme === 'https:') && (parsed.username || parsed.password)) {
      throw new Error('Credentials not allowed in external URL');
    }
    if (scheme === 'http:' || scheme === 'https:' || scheme === 'mailto:') {
      Promise.resolve(shell.openExternal(parsed.href)).catch((err) => {
        logLine('External open failed: ' + String((err && err.message) || err).replace(/[\r\n]+/g, ' '));
      });
      return true;
    }
  } catch (_) {
    // Not a parseable absolute URL — fall through to the block path.
  }
  logLine('Blocked external open for non-web URL: ' + String(url == null ? '' : url).replace(/[\r\n]+/g, ' ').slice(0, 200));
  return false;
}

// Electron exposes Chromium's spelling results through the WebContents
// `context-menu` event, but does not provide a default menu for them. Keep the
// handler at the shell boundary so editable content in the app frame, nested
// document-preview iframes, and child BrowserWindows all receive the same
// native correction and editing behavior.
const editableContextMenuWebContents = new WeakSet();

function canUseContextFrame(frame) {
  if (!frame) return false;
  try {
    return typeof frame.isDestroyed !== 'function' || !frame.isDestroyed();
  } catch (_) {
    return false;
  }
}

function editFlag(params, name, fallback = false) {
  const flags = params && params.editFlags;
  return flags && Object.prototype.hasOwnProperty.call(flags, name)
    ? Boolean(flags[name])
    : Boolean(fallback);
}

function buildNativeEditableMenuTemplate(contents, params) {
  const isEditable = Boolean(params && params.isEditable);
  const hasSelection = Boolean(String(params && params.selectionText || ''));
  if (!isEditable && !hasSelection) return [];

  const template = [];
  const misspelledWord = String(params && params.misspelledWord || '').trim();
  const suggestions = Array.from(new Set(
    (Array.isArray(params && params.dictionarySuggestions)
      ? params.dictionarySuggestions
      : [])
      .map((suggestion) => String(suggestion || '').trim())
      .filter(Boolean)
  )).slice(0, 8);

  if (isEditable && params.spellcheckEnabled !== false && misspelledWord) {
    if (suggestions.length) {
      for (const suggestion of suggestions) {
        template.push({
          label: suggestion.replace(/&/g, '&&'),
          click: () => {
            if (!contents.isDestroyed()) contents.replaceMisspelling(suggestion);
          },
        });
      }
    } else {
      template.push({ label: 'No spelling suggestions', enabled: false });
    }
    template.push({
      label: 'Add to dictionary',
      click: () => {
        if (!contents.isDestroyed()) {
          contents.session.addWordToSpellCheckerDictionary(misspelledWord);
        }
      },
    });
    template.push({ type: 'separator' });
  }

  if (isEditable) {
    template.push(
      { role: 'undo', enabled: editFlag(params, 'canUndo') },
      { role: 'redo', enabled: editFlag(params, 'canRedo') },
      { type: 'separator' },
      { role: 'cut', enabled: editFlag(params, 'canCut') },
      { role: 'copy', enabled: editFlag(params, 'canCopy', hasSelection) },
      { role: 'paste', enabled: editFlag(params, 'canPaste') },
      { role: 'delete', enabled: editFlag(params, 'canDelete') },
      { type: 'separator' },
      { role: 'selectAll', enabled: editFlag(params, 'canSelectAll', true) }
    );
  } else {
    template.push(
      { role: 'copy', enabled: editFlag(params, 'canCopy', hasSelection) },
      { type: 'separator' },
      { role: 'selectAll', enabled: editFlag(params, 'canSelectAll', true) }
    );
  }

  return template;
}

function installNativeEditableContextMenu(targetWindow, contents = targetWindow && targetWindow.webContents) {
  if (
    !targetWindow
    || targetWindow.isDestroyed()
    || !contents
    || contents.isDestroyed()
    || editableContextMenuWebContents.has(contents)
  ) return;

  editableContextMenuWebContents.add(contents);
  contents.on('context-menu', (event, params = {}) => {
    const template = buildNativeEditableMenuTemplate(contents, params);
    if (!template.length || targetWindow.isDestroyed() || contents.isDestroyed()) return;

    event.preventDefault();
    const menu = Menu.buildFromTemplate(template);
    const contextFrame = canUseContextFrame(params.frame)
      ? params.frame
      : (canUseContextFrame(contents.focusedFrame) ? contents.focusedFrame : undefined);
    menu.popup({
      window: targetWindow,
      frame: contextFrame,
      sourceType: params.menuSourceType,
    });
  });

  // A <webview> owns separate WebContents, unlike an iframe. The app does not
  // currently depend on webviews, but covering attached guests here prevents a
  // future embedded editor from silently losing the native menu.
  contents.on('did-attach-webview', (_event, guestContents) => {
    installNativeEditableContextMenu(targetWindow, guestContents);
  });
}

app.on('browser-window-created', (_event, targetWindow) => {
  installNativeEditableContextMenu(targetWindow);
});

function isAllowedAlloSheetPopup(url) {
  try {
    const parsed = new URL(url);
    const commandOrigin = new URL(getCommandCenterUrl()).origin;
    const bundledOrigin = new URL(getBundledAppOrigin()).origin;
    if (!commandOrigin || commandOrigin === bundledOrigin) return false;
    // AlloSheet must stay strictly on the Command Center origin so untrusted
    // #app-frame content (bundledOrigin) can never open a same-origin popup.
    if (parsed.origin !== commandOrigin) return false;
    if (parsed.pathname !== '/app/allo_sheet/allo_sheet.html') return false;
    if (parsed.username || parsed.password) return false;

    for (const key of parsed.searchParams.keys()) {
      if (key !== 'v' && key !== 'theme') return false;
    }
    if (parsed.searchParams.get('v') !== '7') return false;
    const theme = parsed.searchParams.get('theme');
    if (theme && theme !== 'light' && theme !== 'dark' && theme !== 'contrast') return false;

    const allowedHostOrigins = new Set([commandOrigin, bundledOrigin]);
    const bootstrap = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    for (const key of bootstrap.keys()) {
      if (key !== 'bridgeToken' && key !== 'hostOrigin') return false;
    }
    const token = bootstrap.get('bridgeToken') || '';
    const hostOrigin = bootstrap.get('hostOrigin') || '';
    if (!/^[a-f0-9]{32}$/i.test(token)) return false;
    const parsedHost = new URL(hostOrigin);
    if (parsedHost.username || parsedHost.password || parsedHost.origin !== hostOrigin) return false;
    if (!allowedHostOrigins.has(parsedHost.origin)) return false;
    return true;
  } catch (_) {
    return false;
  }
}

// The Whiteboard (Excalidraw) reports drawings back to its opener, and a window
// handed to the OS browser has none, so it must open as a child window. Two exact
// pages only: the bundled copy beside the app (Resource images "Draw") and the CDN
// copy the Educator Hub opens. Neither is a trusted AlloSheet window, so the
// private-API header hook never adds the launch token to its requests.
const WHITEBOARD_CDN_ORIGIN = 'https://alloflow-cdn.pages.dev';
function isAllowedWhiteboardPage(url) {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password || parsed.hash) return false;
    const localOrigins = new Set([
      new URL(getCommandCenterUrl()).origin,
      new URL(getBundledAppOrigin()).origin,
    ]);
    const local = localOrigins.has(parsed.origin) && parsed.pathname === '/app/whiteboard/whiteboard.html';
    // Cloudflare Pages redirects *.html to the extensionless path.
    const cdn = parsed.origin === WHITEBOARD_CDN_ORIGIN
      && (parsed.pathname === '/whiteboard/whiteboard.html' || parsed.pathname === '/whiteboard/whiteboard');
    if (!local && !cdn) return false;
    for (const key of parsed.searchParams.keys()) {
      if (key !== 'v' && key !== 'imageSlot' && key !== 'host') return false;
    }
    return true;
  } catch (_) {
    return false;
  }
}

function configurePrivateApiRequestHeaders(targetWindow) {
  const privateApiOrigins = [
    new URL(getCommandCenterUrl()).origin,
    new URL(getBundledAppOrigin()).origin,
  ];
  const filter = {
    urls: [
      getCommandCenterUrl() + '/api/*',
      getBundledAppOrigin() + '/api/*',
      'http://127.0.0.1/*',
      'https://127.0.0.1/*',
      'ws://127.0.0.1/*',
      'wss://127.0.0.1/*',
    ],
  };
  const mainWebContentsId = targetWindow.webContents.id;
  targetWindow.webContents.session.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    let requestHeaders = { ...(details.requestHeaders || {}) };
    for (const key of Object.keys(requestHeaders)) {
      if (key.toLowerCase() === 'x-allo-desktop-token') delete requestHeaders[key];
    }
    const trustedCompanionOrigin = trustedAlloSheetWebContents.get(details.webContentsId) || '';
    let fromCommandCenterMainFrame = false;
    let fromAlloSheetMainFrame = false;
    try {
      fromCommandCenterMainFrame = Boolean(
        details.webContentsId === mainWebContentsId &&
        details.frame &&
        details.frame.parent === null &&
        isSameOrigin(details.frame.url, getCommandCenterUrl())
      );
      const frameUrl = String(
        (details.frame && details.frame.url)
        || ''
      );
      const isMainFrame = Boolean(details.frame && details.frame.parent === null);
      let isExactAlloSheetPage = false;
      if (trustedCompanionOrigin && isMainFrame && isSameOrigin(frameUrl, trustedCompanionOrigin)) {
        try {
          isExactAlloSheetPage = new URL(frameUrl).pathname === '/app/allo_sheet/allo_sheet.html';
        } catch (_) {
          isExactAlloSheetPage = false;
        }
      }
      fromAlloSheetMainFrame = isExactAlloSheetPage;
    } catch (_) {
      fromCommandCenterMainFrame = false;
      fromAlloSheetMainFrame = false;
    }
    let isAlloSheetApi = false;
    if (fromAlloSheetMainFrame) {
      try {
        const target = new URL(details.url);
        isAlloSheetApi = target.origin === trustedCompanionOrigin
          && !target.username && !target.password
          && target.pathname.startsWith('/api/allosheet/');
      } catch (_) {
        isAlloSheetApi = false;
      }
    }
    if (
      (fromCommandCenterMainFrame && isAllowedPrivateApiRequest(details.url, privateApiOrigins))
      || (fromAlloSheetMainFrame && isAlloSheetApi && isAllowedPrivateApiRequest(details.url, [trustedCompanionOrigin]))
    ) {
      requestHeaders['X-Allo-Desktop-Token'] = PRIVATE_API_TOKEN;
    }
    knownAlloSheetSessionCookies.add('electron_key');
    if (trustedCompanionOrigin) {
      cachedAlloSheetPrivateAuth = typeof runtime.getAlloSheetPrivateBrowserAuth === 'function'
        ? runtime.getAlloSheetPrivateBrowserAuth()
        : null;
    }
    const privateAuth = cachedAlloSheetPrivateAuth;
    if (privateAuth && privateAuth.sessionCookieName) {
      knownAlloSheetSessionCookies.add(privateAuth.sessionCookieName);
    }
    let trustedGristFrame = false;
    try {
      trustedGristFrame = Boolean(
        trustedCompanionOrigin
        && privateAuth
        && isTrustedAlloSheetGristFrameRequest(
          details, trustedCompanionOrigin, privateAuth.origin
        )
      );
    } catch (_) {
      trustedGristFrame = false;
    }
    requestHeaders = applyAlloSheetRequestAuth(
      requestHeaders,
      details.url,
      privateAuth,
      trustedGristFrame ? details.webContentsId : 0,
      knownAlloSheetSessionCookies
    );
    callback({ requestHeaders });
  });
}

function clampOverlayNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
}

function escapeOverlayHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
}

function validCoachWindowBounds(value) {
  if (!value || typeof value !== 'object' || value.visible !== true) return null;
  const bounds = {
    x: Math.round(Number(value.x)), y: Math.round(Number(value.y)),
    width: Math.round(Number(value.width)), height: Math.round(Number(value.height)),
  };
  if (!Object.values(bounds).every(Number.isFinite)) return null;
  if (bounds.width < 40 || bounds.height < 40 || bounds.width > 20000 || bounds.height > 20000) return null;
  if (Math.abs(bounds.x) > 100000 || Math.abs(bounds.y) > 100000) return null;
  return bounds;
}

function stopCoachWindowTracker() {
  const child = coachWindowTracker;
  coachWindowTracker = null;
  coachTrackedHandle = '';
  coachTrackedBounds = null;
  coachTrackedSourceLabel = '';
  coachTrackedActive = false;
  coachTrackerInitPromise = null;
  if (child && !child.killed) {
    try { child.kill(); } catch (_) {}
  }
}

function closeCoachOverlay() {
  coachOverlayEpoch += 1;
  stopCoachWindowTracker();
  const win = coachOverlayWindow;
  coachOverlayWindow = null;
  if (win && !win.isDestroyed()) {
    try { win.close(); } catch (_) {}
  }
}

function startCoachWindowTracker(handle, requestEpoch) {
  if (process.platform !== 'win32' || !/^[0-9]+$/.test(String(handle || ''))) return Promise.resolve(null);
  if (requestEpoch != null && requestEpoch !== coachOverlayEpoch) return Promise.resolve(null);
  if (coachWindowTracker && coachTrackedHandle === handle) {
    return coachTrackedBounds ? Promise.resolve(coachTrackedBounds) : (coachTrackerInitPromise || Promise.resolve(null));
  }
  const now = Date.now();
  if (now - coachTrackerLastStartAt < 350) return Promise.resolve(null);
  coachTrackerLastStartAt = now;
  stopCoachWindowTracker();
  const powershell = path.join(String(process.env.SystemRoot || 'C:\\Windows'),
    'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const packedScript = path.join(__dirname, 'coach-window-bounds-windows.ps1');
  const script = app.isPackaged
    ? packedScript.replace(
      path.sep + 'app.asar' + path.sep,
      path.sep + 'app.asar.unpacked' + path.sep
    )
    : packedScript;
  let child;
  try {
    child = spawn(powershell, [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', script, '-Handle', handle,
    ], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (_) {
    return Promise.resolve(null);
  }
  coachWindowTracker = child;
  coachTrackedHandle = handle;
  let buffer = '', settled = false, settleFirst;
  const firstBounds = new Promise((resolve) => { settleFirst = resolve; });
  coachTrackerInitPromise = firstBounds;
  const settle = (bounds) => {
    if (settled) return;
    settled = true;
    settleFirst(bounds || null);
  };
  const timeout = setTimeout(() => settle(null), 1600);
  const acceptLine = (line) => {
    if (coachWindowTracker !== child) return;
    let event;
    try { event = JSON.parse(String(line || '').trim()); } catch (_) { return; }
    if (event.closed) {
      settle(null);
      if (coachWindowTracker === child) closeCoachOverlay();
      return;
    }
    if (event.visible === false) {
      if (coachOverlayWindow && !coachOverlayWindow.isDestroyed()) coachOverlayWindow.hide();
      return;
    }
    const bounds = validCoachWindowBounds(event);
    if (!bounds) return;
    coachTrackedBounds = bounds;
    coachTrackedActive = event.active !== false;
    settle(bounds);
    if (coachOverlayWindow && !coachOverlayWindow.isDestroyed()) {
      coachOverlayWindow.setBounds(bounds, false);
      if (event.active === false) coachOverlayWindow.hide();
      else coachOverlayWindow.showInactive();
    }
  };
  child.stdout.on('data', (chunk) => {
    buffer += String(chunk || '');
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    lines.forEach(acceptLine);
  });
  child.once('error', () => settle(null));
  child.once('close', () => {
    clearTimeout(timeout);
    settle(null);
    if (coachWindowTracker === child) {
      coachWindowTracker = null;
      coachTrackedHandle = '';
      coachTrackedBounds = null;
      coachTrackedSourceLabel = '';
      coachTrackedActive = false;
      coachTrackerInitPromise = null;
      if (coachOverlayWindow && !coachOverlayWindow.isDestroyed()) coachOverlayWindow.hide();
    }
  });
  return firstBounds.finally(() => clearTimeout(timeout));
}

async function resolveTrackedCoachWindow(sourceLabel, requestEpoch) {
  if (process.platform !== 'win32') return null;
  const isStale = () => requestEpoch != null && requestEpoch !== coachOverlayEpoch;
  const label = String(sourceLabel || '').slice(0, 260);
  if (!label) { if (!isStale()) stopCoachWindowTracker(); return null; }
  if (coachWindowTracker && coachTrackedSourceLabel === label && coachTrackedBounds) {
    return { bounds: coachTrackedBounds, sourceId: '', handle: coachTrackedHandle, active: coachTrackedActive };
  }
  let sources;
  try {
    sources = await desktopCapturer.getSources({
      types: ['window'], thumbnailSize: { width: 0, height: 0 }, fetchWindowIcons: false,
    });
  } catch (_) {
    if (!isStale()) stopCoachWindowTracker();
    return null;
  }
  if (isStale()) return null;
  const selected = selectUniqueWindowSource(sources, label);
  if (!selected || !selected.handle) { if (!isStale()) stopCoachWindowTracker(); return null; }
  const bounds = await startCoachWindowTracker(selected.handle, requestEpoch);
  if (isStale()) return null;
  if (!bounds) { stopCoachWindowTracker(); return null; }
  coachTrackedSourceLabel = label;
  return { bounds, sourceId: selected.id, handle: selected.handle, active: coachTrackedActive };
}

async function updateCoachOverlay(rawPayload) {
  const requestEpoch = ++coachOverlayEpoch;
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const guidance = String(payload.guidance || '').replace(/[\u0000-\u001F\u007F]+/g, ' ').trim().slice(0, 400);
  if (!guidance) { closeCoachOverlay(); return { visible: false }; }
  const displaySurface = ['monitor', 'window', 'browser'].includes(payload.displaySurface)
    ? payload.displaySurface : '';
  let trackedWindow = null;
  if (displaySurface === 'window') {
    trackedWindow = await resolveTrackedCoachWindow(payload.sourceLabel, requestEpoch);
    if (requestEpoch !== coachOverlayEpoch) {
      return { visible: false, stale: true };
    }
  } else {
    stopCoachWindowTracker();
  }
  const rawTarget = payload.target && typeof payload.target === 'object' ? payload.target : null;
  const target = (displaySurface === 'monitor' || trackedWindow) && rawTarget ? {
    x: clampOverlayNumber(rawTarget.x, 0),
    y: clampOverlayNumber(rawTarget.y, 0),
    w: clampOverlayNumber(rawTarget.w, 0),
    h: clampOverlayNumber(rawTarget.h, 0),
  } : null;
  if (target) {
    target.w = Math.min(target.w, 1 - target.x);
    target.h = Math.min(target.h, 1 - target.y);
    if (target.w <= 0 || target.h <= 0) target.w = target.h = 0;
  }
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  if (!display || !display.bounds) return { visible: false };
  const bounds = trackedWindow ? trackedWindow.bounds : display.bounds;
  if (!coachOverlayWindow || coachOverlayWindow.isDestroyed()) {
    coachOverlayWindow = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      focusable: false,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      hasShadow: false,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        devTools: false,
      },
    });
    coachOverlayWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    coachOverlayWindow.webContents.on('will-navigate', (event) => { event.preventDefault(); });
    coachOverlayWindow.webContents.on('will-redirect', (event) => { event.preventDefault(); });
    coachOverlayWindow.webContents.on('will-attach-webview', (event) => { event.preventDefault(); });
    coachOverlayWindow.setIgnoreMouseEvents(true, { forward: true });
    coachOverlayWindow.setAlwaysOnTop(true, 'floating');
    coachOverlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    coachOverlayWindow.on('closed', () => { coachOverlayWindow = null; });
  } else {
    coachOverlayWindow.setBounds(bounds, false);
  }
  const box = target && target.w > 0 && target.h > 0
    ? '<div class="target" style="left:' + (target.x * 100) + '%;top:' + (target.y * 100) +
      '%;width:' + (target.w * 100) + '%;height:' + (target.h * 100) + '%"></div>'
    : '';
  const surfaceNote = target
    ? (trackedWindow ? 'Highlighted on the uniquely matched shared window' : 'Highlighted on the shared monitor')
    : (displaySurface === 'window'
      ? 'Guidance HUD — the shared window could not be matched uniquely'
      : 'Guidance HUD — exact overlay requires a shared monitor or matched native window');
  const html = '<!doctype html><html><head><meta charset="utf-8"><style>' +
    'html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;font-family:system-ui,-apple-system,Segoe UI,sans-serif}' +
    '.target{position:absolute;box-sizing:border-box;border:5px solid #f59e0b;outline:3px solid #fff;box-shadow:0 0 0 8px #000,0 0 28px 12px rgba(245,158,11,.55);border-radius:10px}' +
    '.hud{position:absolute;right:24px;top:24px;width:min(430px,calc(100% - 48px));box-sizing:border-box;padding:14px 16px;border:2px solid #93c5fd;border-radius:14px;background:rgba(10,18,34,.94);color:#f8fafc;box-shadow:0 10px 34px rgba(0,0,0,.45)}' +
    '.label{font-size:12px;font-weight:800;letter-spacing:.04em;color:#93c5fd;text-transform:uppercase}.text{font-size:18px;font-weight:700;line-height:1.35;margin-top:5px}.note{font-size:11px;color:#cbd5e1;margin-top:6px}' +
    '</style></head><body>' + box + '<aside class="hud" role="status"><div class="label">' +
    (payload.done ? 'Screen Coach — complete' : 'Screen Coach — next step') + '</div><div class="text">' +
    escapeOverlayHtml(guidance) + '</div><div class="note">' + escapeOverlayHtml(surfaceNote) +
    '</div></aside></body></html>';
  const win = coachOverlayWindow;
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html)).then(() => {
    if (requestEpoch !== coachOverlayEpoch || coachOverlayWindow !== win || win.isDestroyed()) return;
    if (trackedWindow && trackedWindow.active === false) win.hide();
    else win.showInactive();
  }).catch(() => {});
  return { visible: true, exactTarget: !!target, trackedWindow: !!trackedWindow, displayId: display.id };
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
  mainWindow.on('closed', () => {
    mainWindow = null;
    closeCoachOverlay();
  });

  mainWindow.on('enter-full-screen', () => notifyFullScreenChange(true));
  mainWindow.on('leave-full-screen', () => notifyFullScreenChange(false));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedAlloSheetPopup(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1500,
          height: 920,
          minWidth: 820,
          minHeight: 640,
          backgroundColor: '#101827',
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            nodeIntegrationInSubFrames: false,
            webSecurity: true,
            devTools: false,
          },
        },
      };
    }
    if (isAllowedWhiteboardPage(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          minWidth: 720,
          minHeight: 520,
          backgroundColor: '#ffffff',
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            nodeIntegrationInSubFrames: false,
            webSecurity: true,
            devTools: false,
          },
        },
      };
    }
    // In-app popup views (accessibility reports, print previews, export
    // windows) open via window.open with about:blank or same-origin blob: URLs —
    // allow those as child windows without preload or subframe Node privileges.
    let commandOrigin = '';
    let bundledOrigin = '';
    try { commandOrigin = getCommandCenterUrl() ? new URL(getCommandCenterUrl()).origin : ''; } catch (_) {}
    try { bundledOrigin = getBundledAppOrigin() ? new URL(getBundledAppOrigin()).origin : ''; } catch (_) {}
    const isSameOriginBlob = (u) => Boolean(
      (commandOrigin && u.startsWith('blob:' + commandOrigin + '/'))
      || (bundledOrigin && u.startsWith('blob:' + bundledOrigin + '/'))
    );
    const isSafeInlineData = (u) => /^data:(?:image\/(?:png|jpeg|webp|gif)|application\/pdf|text\/plain)(?:[;,])/i.test(u);
    if (url === 'about:blank' || isSameOriginBlob(url) || isSafeInlineData(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            nodeIntegrationInSubFrames: false,
            webSecurity: true,
            devTools: false,
          },
        },
      };
    }
    openExternalIfSafe(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-create-window', (childWindow, details) => {
    childWindow.webContents.on('will-attach-webview', (event) => {
      event.preventDefault();
    });
    if (isAllowedWhiteboardPage(details && details.url)) {
      // Excalidraw's help/library links leave for the OS browser; the window
      // itself may only move between the allowed Whiteboard pages.
      childWindow.webContents.setWindowOpenHandler(({ url }) => {
        openExternalIfSafe(url);
        return { action: 'deny' };
      });
      const guardWhiteboardUrl = (event, url, _isInPlace, isMainFrame) => {
        if (isMainFrame === false) {
          event.preventDefault();
          return;
        }
        if (isAllowedWhiteboardPage(url)) return;
        event.preventDefault();
        openExternalIfSafe(url);
      };
      childWindow.webContents.on('will-navigate', guardWhiteboardUrl);
      childWindow.webContents.on('will-redirect', guardWhiteboardUrl);
      return;
    }
    if (isAllowedAlloSheetPopup(details && details.url)) {
      const companionOrigin = new URL(details.url).origin;
      const childId = childWindow.webContents.id;
      trustedAlloSheetWebContents.set(childId, companionOrigin);
      childWindow.once('closed', () => {
        trustedAlloSheetWebContents.delete(childId);
        if (trustedAlloSheetWebContents.size === 0) cachedAlloSheetPrivateAuth = null;
      });
      childWindow.webContents.setWindowOpenHandler(({ url }) => {
        openExternalIfSafe(url);
        return { action: 'deny' };
      });
      const guardAlloSheetUrl = (event, url, _isInPlace, isMainFrame) => {
        if (isMainFrame === false) {
          const managedOrigin = cachedAlloSheetPrivateAuth && cachedAlloSheetPrivateAuth.origin;
          if (managedOrigin && isSameOrigin(url, managedOrigin)) return;
          event.preventDefault();
          return;
        }
        try {
          const parsed = new URL(url);
          if (parsed.origin === companionOrigin && parsed.pathname === '/app/allo_sheet/allo_sheet.html') return;
        } catch (_) {}
        event.preventDefault();
        openExternalIfSafe(url);
      };
      childWindow.webContents.on('will-navigate', guardAlloSheetUrl);
      childWindow.webContents.on('will-redirect', guardAlloSheetUrl);
      return;
    }
    childWindow.webContents.setWindowOpenHandler(({ url: nextUrl }) => {
      openExternalIfSafe(nextUrl);
      return { action: 'deny' };
    });
    const guardChildUrl = (event, nextUrl, _isInPlace, isMainFrame) => {
      if (isMainFrame === false) {
        event.preventDefault();
        return;
      }
      let commandOrigin = '';
      let bundledOrigin = '';
      try {
        commandOrigin = getCommandCenterUrl() ? new URL(getCommandCenterUrl()).origin : '';
      } catch (_) {}
      try {
        bundledOrigin = getBundledAppOrigin() ? new URL(getBundledAppOrigin()).origin : '';
      } catch (_) {}
      if (
        nextUrl === 'about:blank'
        || (commandOrigin && nextUrl.startsWith('blob:' + commandOrigin + '/'))
        || (bundledOrigin && nextUrl.startsWith('blob:' + bundledOrigin + '/'))
      ) return;
      event.preventDefault();
      openExternalIfSafe(nextUrl);
    };
    childWindow.webContents.on('will-navigate', guardChildUrl);
    childWindow.webContents.on('will-redirect', guardChildUrl);
  });

  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });

  const guardMainWindowUrl = (event, url, _isInPlace, isMainFrame) => {
    if (isMainFrame === false) {
      if (isSameOrigin(url, getBundledAppOrigin()) || isSameOrigin(url, getCommandCenterUrl())) return;
      event.preventDefault();
      return;
    }
    if (!isSameOrigin(url, getCommandCenterUrl())) {
      event.preventDefault();
      openExternalIfSafe(url);
    }
  };
  mainWindow.webContents.on('will-navigate', guardMainWindowUrl);
  mainWindow.webContents.on('will-redirect', guardMainWindowUrl);

  configurePrivateApiRequestHeaders(mainWindow);
  mainWindow.loadURL(getCommandCenterUrl());
}

function assertMainWindowSender(event, requireMainFrame = false) {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
    throw new Error('Blocked desktop IPC request outside the main application window.');
  }
  if (requireMainFrame) {
    assertTrustedIpcSender(event, getCommandCenterUrl());
    if (!event.senderFrame || event.senderFrame.parent !== null) {
      throw new Error('Blocked privileged desktop IPC request from an embedded subframe.');
    }
    return;
  }
  const senderUrl = getIpcSenderUrl(event);
  if (!isSameOrigin(senderUrl, getCommandCenterUrl()) && !isSameOrigin(senderUrl, getBundledAppOrigin())) {
    throw new Error('Blocked desktop IPC request from an untrusted renderer origin.');
  }
  const frame = event.senderFrame;
  if (!frame || (frame.parent !== null && frame.parent !== mainWindow.webContents.mainFrame)) {
    throw new Error('Blocked desktop IPC request from a nested subframe.');
  }
}

function handleMainFrameIpc(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    assertMainWindowSender(event, true);
    return handler(event, ...args);
  });
}

function handleTrustedIpc(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    assertMainWindowSender(event, false);
    return handler(event, ...args);
  });
}

handleMainFrameIpc('alloflow-desktop:runtime-info', async () => ({
  commandCenterUrl: getCommandCenterUrl(),
  version: runtime.VERSION,
  configPath: runtime.getConfigPath(),
  dataDir: runtime.getDataDir(),
  logPath: getLogPath(),
}));

handleMainFrameIpc('alloflow-desktop:update-status', async () => configureUpdates());

handleMainFrameIpc('alloflow-desktop:set-update-channel', async (_event, channel) => {
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

handleMainFrameIpc('alloflow-desktop:check-for-updates', async () => {
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

handleMainFrameIpc('alloflow-desktop:download-update', async () => {
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

handleMainFrameIpc('alloflow-desktop:install-update', async () => {
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

handleMainFrameIpc('alloflow-desktop:set-full-screen', async (_event, enabled) => {
  if (!mainWindow) return false;
  mainWindow.setFullScreen(Boolean(enabled));
  return mainWindow.isFullScreen();
});

handleMainFrameIpc('alloflow-desktop:is-full-screen', async () => (
  mainWindow ? mainWindow.isFullScreen() : false
));

handleTrustedIpc('alloflow-desktop:coach-overlay-update', async (_event, payload) => (
  updateCoachOverlay(payload)
));

handleTrustedIpc('alloflow-desktop:coach-overlay-hide', async () => {
  closeCoachOverlay();
  return { visible: false };
});

// ── Save remediated documents to a local folder ─────────────────────────────
// Ported from the AlloFlow Admin app (the doc pipeline's batch export checks
// window.alloAPI.remediation.saveFiles and prefers a folder of files over a
// browser ZIP download when the bridge exists — see doc_pipeline_source.jsx).
// payload = { folderName?: string, files: [{ name, data, encoding: 'base64'|'utf8' }] }
// Returns { canceled } | { folder, saved, skipped } | { error }.
// __ALLO_EXPORT_GUARD_BEGIN__
// The renderer names these files, so only document and image types are written: a compromised
// page must not be able to drop an executable that reveal-path would then launch.
const EXPORT_FILE_EXTS = new Set(['.pdf', '.html', '.htm', '.csv', '.json', '.txt', '.md', '.docx', '.pptx', '.xlsx', '.epub', '.brf', '.xml', '.png', '.jpg', '.jpeg', '.webp']);
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
function safeExportName(name, maxLength) {
  const cleaned = String(name == null ? '' : name)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, maxLength || 180)
    .replace(/[. ]+$/, '');
  // Trailing dots and spaces are stripped AFTER slicing, so "." and ".." arrive here empty.
  if (!cleaned || WINDOWS_RESERVED_NAME.test(cleaned)) return null;
  return cleaned;
}
function safeExportFileName(name) {
  const cleaned = safeExportName(name);
  return cleaned && EXPORT_FILE_EXTS.has(path.extname(cleaned).toLowerCase()) ? cleaned : null;
}
// Only folders this run saved exports into can be revealed, and only as folders:
// shell.openPath on a file opens (or runs) it.
const revealableExportDirs = new Set();
function isRevealableExportDir(targetPath) {
  if (typeof targetPath !== 'string' || !targetPath) return false;
  try {
    const real = fs.realpathSync(targetPath);
    return fs.statSync(real).isDirectory() && revealableExportDirs.has(real);
  } catch (_) { return false; }
}
// __ALLO_EXPORT_GUARD_END__
handleTrustedIpc('remediation:save-files', async (_event, payload) => {
  try {
    const MAX_EXPORT_FILES = 1000;
    const MAX_EXPORT_TOTAL_BYTES = 512 * 1024 * 1024;
    const files = (payload && Array.isArray(payload.files)) ? payload.files : [];
    if (files.length === 0) return { error: 'No files to save' };
    if (files.length > MAX_EXPORT_FILES) return { error: `Too many files to save (limit ${MAX_EXPORT_FILES})` };

    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath: os.homedir(),
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose where to save the files',
      buttonLabel: 'Save Here',
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };

    const isSymlinkPath = (p) => {
      try { return fs.lstatSync(p).isSymbolicLink(); } catch (_) { return false; }
    };
    const selectedRoot = fs.realpathSync(result.filePaths[0]);
    const folderName = safeExportName((payload && payload.folderName) || '', 120) || 'AlloFlow_Export';
    const baseDir = path.join(selectedRoot, folderName);
    if (isSymlinkPath(baseDir)) {
      return { error: 'Refusing to save into a symbolic link directory' };
    }
    fs.mkdirSync(baseDir, { recursive: true });
    const realBaseDir = fs.realpathSync(baseDir);
    const relBase = path.relative(selectedRoot, realBaseDir);
    if (!relBase || relBase === '..' || relBase.startsWith('..' + path.sep) || path.isAbsolute(relBase)) {
      return { error: 'Export folder escaped selected directory' };
    }

    let saved = 0;
    let skipped = 0;
    let totalBytes = 0;
    const writeFlags = fs.constants.O_WRONLY | fs.constants.O_CREAT | (fs.constants.O_NOFOLLOW || 0);
    for (const f of files) {
      if (!f || !f.name || typeof f.data !== 'string') continue;
      const safe = safeExportFileName(f.name);
      if (!safe) { skipped++; continue; }
      const buf = f.encoding === 'utf8' ? Buffer.from(f.data, 'utf8') : Buffer.from(f.data, 'base64');
      totalBytes += buf.length;
      if (totalBytes > MAX_EXPORT_TOTAL_BYTES) {
        return { error: 'Total export size exceeded safety limit' };
      }
      const targetPath = path.join(realBaseDir, safe);
      if (isSymlinkPath(targetPath)) {
        skipped++;
        continue;
      }
      const fd = fs.openSync(targetPath, writeFlags, 0o600);
      try {
        if (!fs.fstatSync(fd).isFile()) { skipped++; continue; }
        fs.ftruncateSync(fd, 0);
        fs.writeFileSync(fd, buf);
      } finally {
        fs.closeSync(fd);
      }
      saved++;
    }
    revealableExportDirs.add(fs.realpathSync(baseDir));

    logLine(`Saved ${saved} file(s) to ${realBaseDir}` + (skipped ? `; skipped ${skipped} of a type AlloFlow does not export` : ''));
    return { canceled: false, folder: realBaseDir, saved, skipped };
  } catch (error) {
    return { error: String((error && error.message) || error) };
  }
});

// Reveal a saved folder/file in the OS file manager.
handleTrustedIpc('remediation:reveal-path', async (_event, targetPath) => {
  try {
    if (!isRevealableExportDir(targetPath)) {
      return { error: 'Only a folder AlloFlow saved can be opened' };
    }
    const openError = await shell.openPath(fs.realpathSync(targetPath));
    if (openError) return { error: String(openError) };
    return { success: true };
  } catch (error) {
    return { error: String((error && error.message) || error) };
  }
});

// ── Remediation folder ingestion (ported from the AlloFlow Admin app) ──────
// Powers the batch screen's "Scan Folder" button (view_pdf_audit_source.jsx
// gates it on window.alloAPI.remediation.selectFolder). Returns file metadata
// only — contents are fetched on demand via remediation:read-file-base64 to
// keep the IPC payload small.
const REMEDIATION_MIME_BY_EXT = Object.freeze({
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
});
const REMEDIATION_EXTS = new Set(Object.keys(REMEDIATION_MIME_BY_EXT));
const MAX_REMEDIATION_READ_BYTES = 64 * 1024 * 1024;
const approvedRemediationRoots = new Set();
const approvedRemediationFiles = new Set();

function resolveApprovedRemediationFile(filePath) {
  if (typeof filePath !== 'string' || !filePath || approvedRemediationRoots.size === 0 || approvedRemediationFiles.size === 0) return '';
  try {
    const lstat = fs.lstatSync(filePath);
    if (lstat.isSymbolicLink() || !lstat.isFile()) return '';
    if (lstat.size > MAX_REMEDIATION_READ_BYTES) return '';
    const realTarget = fs.realpathSync(filePath);
    if (!approvedRemediationFiles.has(realTarget)) return '';
    for (const root of approvedRemediationRoots) {
      const rel = path.relative(root, realTarget);
      if (rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel)) return realTarget;
    }
    return '';
  } catch (_) {
    return '';
  }
}

function isApprovedRemediationFile(filePath) {
  return Boolean(resolveApprovedRemediationFile(filePath));
}

handleTrustedIpc('remediation:select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath: os.homedir(),
      properties: ['openDirectory'],
      title: 'Choose a folder of documents to remediate',
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };

    const root = fs.realpathSync(result.filePaths[0]);
    approvedRemediationRoots.clear();
    approvedRemediationFiles.clear();
    approvedRemediationRoots.add(root);
    const files = [];
    const MAX_FILES = 1000; // safety cap

    const walk = (dir) => {
      if (files.length >= MAX_FILES) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
      catch { return; }
      for (const entry of entries) {
        if (files.length >= MAX_FILES) break;
        if (entry.name.startsWith('.')) continue; // skip hidden / dotfiles
        if (typeof entry.isSymbolicLink === 'function' && entry.isSymbolicLink()) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules') continue;
          walk(full);
        } else if (entry.isFile() && REMEDIATION_EXTS.has(path.extname(entry.name).toLowerCase())) {
          const ext = path.extname(entry.name).toLowerCase();
          let sizeBytes = 0;
          try { sizeBytes = fs.statSync(full).size; } catch (_) {}
          if (sizeBytes > MAX_REMEDIATION_READ_BYTES) continue;
          try {
            const realFile = fs.realpathSync(full);
            approvedRemediationFiles.add(realFile);
          } catch (_) {
            continue;
          }
          files.push({ name: entry.name, path: full, relPath: path.relative(root, full), sizeBytes, mimeType: REMEDIATION_MIME_BY_EXT[ext] });
        }
      }
    };
    walk(root);

    logLine(`remediation:select-folder ${root} -> ${files.length} supported input(s)`);
    return { canceled: false, root, files };
  } catch (error) {
    return { canceled: true, error: String((error && error.message) || error) };
  }
});

// Read one document (by absolute path) and return its base64 contents on
// demand. Only paths inside user-selected folders with remediation-supported
// extensions are served — the renderer never gets an arbitrary read primitive.
handleTrustedIpc('remediation:read-file-base64', async (_event, filePath) => {
  try {
    const realTarget = resolveApprovedRemediationFile(filePath);
    if (!realTarget || !REMEDIATION_EXTS.has(path.extname(realTarget).toLowerCase())) {
      return { error: 'File not found' };
    }
    const fd = fs.openSync(realTarget, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    let buf;
    try {
      const st = fs.fstatSync(fd);
      if (!st.isFile()) return { error: 'File not found' };
      if (st.size > MAX_REMEDIATION_READ_BYTES) return { error: 'File too large' };
      buf = Buffer.alloc(st.size);
      let offset = 0;
      while (offset < st.size) {
        const n = fs.readSync(fd, buf, offset, st.size - offset, offset);
        if (n <= 0) break;
        offset += n;
      }
      if (offset < st.size) buf = buf.subarray(0, offset);
    } finally {
      fs.closeSync(fd);
    }
    const mimeType = REMEDIATION_MIME_BY_EXT[path.extname(realTarget).toLowerCase()];
    return { base64: buf.toString('base64'), sizeBytes: buf.length, mimeType };
  } catch (error) {
    return { error: 'Could not read selected file' };
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
      // This PIN gates LAN access to the live session, so it comes from a CSPRNG.
      const pin = String(crypto.randomInt(100000, 1000000));
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
  if (!hasSingleInstanceLock) return;
  configureDesktopSecretStorage();
  runtime.configurePrivateApiToken(PRIVATE_API_TOKEN);
  const allowedPermissions = new Set(['media', 'clipboard-sanitized-write', 'fullscreen']);
  const isMainWindowContents = (wc) => Boolean(wc && mainWindow && !mainWindow.isDestroyed() && wc === mainWindow.webContents);
  const isAllowedPermissionOrigin = (requestingUrl) => {
    try {
      const targetUrl = String(requestingUrl || '');
      if (!targetUrl) return false;
      const commandUrl = getCommandCenterUrl();
      if (commandUrl && isSameOrigin(targetUrl, commandUrl)) return true;
      const appOrigin = getBundledAppOrigin();
      if (appOrigin && isSameOrigin(targetUrl, appOrigin)) return true;
    } catch (_) {}
    return false;
  };
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (!allowedPermissions.has(permission) || !isMainWindowContents(webContents)) return false;
    return isAllowedPermissionOrigin(requestingOrigin);
  });
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (!allowedPermissions.has(permission) || !isMainWindowContents(webContents)) {
      callback(false);
      return;
    }
    const candidate = (details && details.requestingUrl) || '';
    callback(isAllowedPermissionOrigin(candidate));
  });
  prepareDesktopRuntimeHome();
  ensureFreshInstallSetupReset();
  logLine('Launching AlloFlow Desktop' + (DESKTOP_EDITION ? ` (${DESKTOP_EDITION} edition)` : ''));
  logLine('Runtime data dir: ' + runtime.getDataDir());
  await ensureRuntime();
  await autoStartAlloFlowApp();
  await ensureAdminServerPosture();
  configureUpdates();
  createMainWindow();
  if (focusRequestedBySecondInstance) focusMainWindow();

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
  closeCoachOverlay();
  // Never orphan child servers: the AI, speech, and spreadsheet companions
  // each own local resources and randomized loopback listeners.
  const canTeardown = typeof runtime.stopLocalEngine === 'function'
    || typeof runtime.stopLocalAsr === 'function'
    || typeof runtime.stopAlloSheetEngine === 'function';
  if (!engineTorndown && canTeardown) {
    engineTorndown = true;
    event.preventDefault();
    const teardowns = [];
    if (typeof runtime.stopLocalEngine === 'function') teardowns.push(Promise.resolve(runtime.stopLocalEngine()).catch(() => {}));
    if (typeof runtime.stopLocalAsr === 'function') teardowns.push(Promise.resolve(runtime.stopLocalAsr()).catch(() => {}));
    if (typeof runtime.stopAlloSheetEngine === 'function') teardowns.push(Promise.resolve(runtime.stopAlloSheetEngine()).catch(() => {}));
    Promise.race([
      Promise.allSettled(teardowns),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]).finally(() => {
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
