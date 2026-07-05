#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const DESKTOP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DESKTOP_ROOT, '..');
const COMMAND_CENTER_DIR = path.join(DESKTOP_ROOT, 'command-center');
const STATIC_APP_DIR = path.join(DESKTOP_ROOT, 'app-build');
const VERSION = '0.1.0-foundation';
const MAX_REQUEST_BODY_BYTES = 8 * 1024 * 1024;
const SCHOOLBOX_PROJECT_NAME = 'alloflow-schoolbox';
const SCHOOLBOX_CORE_SERVICES = ['frontend', 'pocketbase', 'ollama', 'piper', 'searxng'];
const SCHOOLBOX_GPU_SERVICES = ['flux'];
const SCHOOLBOX_DEFAULT_PORTS = {
  WEB_PORT: 32174,
  PB_PORT: 8090,
  OLLAMA_PORT: 11434,
  FLUX_PORT: 7860,
  TTS_PORT: 5001,
  PIPER_PORT: 10200,
  SEARCH_PORT: 8888,
};
const SCHOOLBOX_SERVICE_DEFS = [
  { id: 'frontend', label: 'School Box App', envKey: 'WEB_PORT', kind: 'http', path: '/' },
  { id: 'pocketbase', label: 'Classroom Database', envKey: 'PB_PORT', kind: 'http', path: '/api/health' },
  { id: 'ollama', label: 'Local Text AI', envKey: 'OLLAMA_PORT', kind: 'http', path: '/api/tags' },
  { id: 'edge-tts', label: 'Online Voice', envKey: 'TTS_PORT', kind: 'http', path: '/health', optional: true },
  { id: 'piper', label: 'Offline Voice', envKey: 'PIPER_PORT', kind: 'tcp' },
  { id: 'searxng', label: 'Search', envKey: 'SEARCH_PORT', kind: 'http', path: '/' },
  { id: 'flux', label: 'Image AI', envKey: 'FLUX_PORT', kind: 'http', path: '/health', optional: true },
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const PROVIDER_PRESETS = [
  {
    id: 'alloflow-local',
    label: 'AlloFlow Built-in Engine',
    group: 'recommended',
    protocol: 'openai-compatible',
    baseUrl: 'http://localhost:32173',
    modelsPath: '/v1/models',
    managedByDesktop: true,
    availableToday: false,
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    group: 'local',
    protocol: 'openai-compatible',
    baseUrl: 'http://localhost:1234',
    modelsPath: '/v1/models',
    managedByDesktop: false,
    availableToday: true,
  },
  {
    id: 'ollama',
    label: 'Ollama',
    group: 'local',
    protocol: 'ollama-native',
    baseUrl: 'http://localhost:11434',
    modelsPath: '/api/tags',
    managedByDesktop: false,
    availableToday: true,
  },
  {
    id: 'localai',
    label: 'LocalAI',
    group: 'local',
    protocol: 'openai-compatible',
    baseUrl: 'http://localhost:8080',
    modelsPath: '/v1/models',
    managedByDesktop: false,
    availableToday: true,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    group: 'cloud',
    protocol: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    modelsPath: '/models',
    managedByDesktop: false,
    availableToday: true,
  },
  {
    id: 'custom',
    label: 'Custom Endpoint',
    group: 'admin',
    protocol: 'openai-compatible',
    baseUrl: 'http://localhost:8080',
    modelsPath: '/v1/models',
    managedByDesktop: false,
    availableToday: true,
  },
];

const LIVE_SESSION_MODES = {
  'schoolbox-lan': {
    label: 'School Box / Local Network',
    dataLocation: 'Local School Box host on the school network',
    cloudSession: false,
    recommended: true,
  },
  'local-preview': {
    label: 'Local Preview Only',
    dataLocation: 'This desktop device only',
    cloudSession: false,
    recommended: false,
  },
  'district-server': {
    label: 'District Server',
    dataLocation: 'District-controlled server',
    cloudSession: false,
    recommended: false,
    future: true,
  },
  'byo-firebase': {
    label: 'Bring Your Own Firebase',
    dataLocation: 'School or district-owned Firebase project',
    cloudSession: true,
    recommended: false,
  },
  'alloflow-demo-cloud': {
    label: 'AlloFlow Demo Cloud',
    dataLocation: 'AlloFlow demo cloud project',
    cloudSession: true,
    recommended: false,
    demoOnly: true,
  },
};

const DEFAULT_CONFIG = {
  version: 1,
  appUrl: process.env.ALLOFLOW_APP_URL || 'http://localhost:3000',
  app: {
    mode: process.env.ALLOFLOW_DESKTOP_APP_MODE || 'auto',
    autoStart: true,
    managed: true,
    cwd: 'prismflow-deploy',
    command: 'npm',
    args: ['run', 'start'],
    port: 3000,
    startupTimeoutMs: 30000,
  },
  selectedProvider: 'gemini',
  providers: Object.fromEntries(PROVIDER_PRESETS.map((provider) => [
    provider.id,
    { baseUrl: provider.baseUrl, enabled: true },
  ])),
  localEngine: {
    enabled: false,
    managed: false,
    port: 32173,
    modelDirectory: '',
  },
  updates: {
    channel: process.env.ALLOFLOW_UPDATE_CHANNEL || 'latest',
  },
  liveSession: {
    mode: process.env.ALLOFLOW_LIVE_SESSION_MODE || 'schoolbox-lan',
    requireExplicitCloud: true,
    lan: {
      enabled: true,
      ttlMinutes: 480,
      shareHost: process.env.ALLOFLOW_LAN_SHARE_HOST || '0.0.0.0',
      sharePort: Number(process.env.ALLOFLOW_LAN_SHARE_PORT || 32175),
      // Optional classroom join PIN. Empty = no PIN. Latched when LAN sharing
      // starts (change the PIN, then restart sharing to apply). Gates the
      // public join page and the student-safe session read/patch endpoints.
      pin: '',
    },
    firebase: {
      projectId: '',
      appId: '',
      owner: '',
    },
  },
  schoolBox: {
    mode: 'desktop-host',
    embedded: true,
    host: '127.0.0.1',
    port: SCHOOLBOX_DEFAULT_PORTS.WEB_PORT,
    includeGpu: false,
    autoPrepare: true,
    projectName: SCHOOLBOX_PROJECT_NAME,
  },
  secrets: {},
};

const managedApp = {
  child: null,
  logs: [],
  startedAt: null,
  stoppedAt: null,
  lastExit: null,
  lastError: null,
  startPromise: null,
};

const managedSchoolBox = {
  logs: [],
  lastCommand: null,
  lastExit: null,
  lastError: null,
};

const managedLanShare = {
  server: null,
  host: null,
  port: null,
  startedAt: null,
  stoppedAt: null,
  lastError: null,
};

const lanSessions = new Map();
const lanSessionSubscribers = new Map();

let secretStorage = {
  id: 'local-config',
  label: 'Local config fallback',
  isAvailable: () => false,
  encrypt: null,
  decrypt: null,
};

function configureSecretStorage(adapter = {}) {
  secretStorage = {
    id: adapter.id || 'custom',
    label: adapter.label || adapter.id || 'Custom secret storage',
    isAvailable: typeof adapter.isAvailable === 'function' ? adapter.isAvailable : () => false,
    encrypt: typeof adapter.encrypt === 'function' ? adapter.encrypt : null,
    decrypt: typeof adapter.decrypt === 'function' ? adapter.decrypt : null,
  };
}

function getSecretStorageStatus() {
  let available = false;
  try {
    available = Boolean(secretStorage.isAvailable && secretStorage.isAvailable());
  } catch (_) {
    available = false;
  }
  return {
    id: secretStorage.id,
    label: secretStorage.label,
    available,
    encryptedAtRest: Boolean(available && secretStorage.encrypt && secretStorage.decrypt),
  };
}

function canEncryptSecrets() {
  const status = getSecretStorageStatus();
  return Boolean(status.encryptedAtRest);
}

function encryptSecretValue(value) {
  const text = String(value || '');
  if (!text) return null;
  if (canEncryptSecrets()) {
    return {
      encrypted: secretStorage.encrypt(text),
      storage: secretStorage.id,
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    value: text,
    storage: 'local-config-plaintext',
    updatedAt: new Date().toISOString(),
  };
}

function decryptSecretValue(record) {
  if (!record || typeof record !== 'object') return '';
  if (typeof record.value === 'string') return record.value;
  if (record.encrypted && record.storage === secretStorage.id && canEncryptSecrets()) {
    return secretStorage.decrypt(record.encrypted);
  }
  return '';
}

function hasStoredSecret(record) {
  return Boolean(record && typeof record === 'object' && (record.value || record.encrypted));
}

function normalizeSecretsForStorage(config) {
  const next = {
    ...config,
    secrets: { ...(config.secrets || {}) },
  };
  let changed = false;

  for (const [providerId, record] of Object.entries(next.secrets)) {
    if (!record || typeof record !== 'object') {
      delete next.secrets[providerId];
      changed = true;
      continue;
    }
    if (typeof record.value === 'string' && record.value && canEncryptSecrets()) {
      next.secrets[providerId] = {
        encrypted: secretStorage.encrypt(record.value),
        storage: secretStorage.id,
        updatedAt: record.updatedAt || new Date().toISOString(),
        migratedAt: new Date().toISOString(),
      };
      changed = true;
    } else if (record.value === '') {
      delete next.secrets[providerId];
      changed = true;
    }
  }

  return { config: next, changed };
}

function parseArgs(argv) {
  const args = {
    host: process.env.ALLOFLOW_DESKTOP_HOST || '127.0.0.1',
    port: Number(process.env.ALLOFLOW_DESKTOP_PORT || 32170),
    check: false,
    smoke: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') args.check = true;
    else if (arg === '--smoke') args.smoke = true;
    else if (arg === '--host') args.host = argv[++i] || args.host;
    else if (arg === '--port') args.port = Number(argv[++i] || args.port);
    else if (arg === '--app-url') process.env.ALLOFLOW_APP_URL = argv[++i] || process.env.ALLOFLOW_APP_URL;
  }

  if (!Number.isFinite(args.port) || args.port < 0 || args.port > 65535) {
    throw new Error('Invalid desktop runtime port.');
  }

  return args;
}

function getDataDir() {
  if (process.env.ALLOFLOW_DESKTOP_HOME) {
    return path.resolve(process.env.ALLOFLOW_DESKTOP_HOME);
  }
  return path.join(DESKTOP_ROOT, '.local');
}

function getConfigPath() {
  return process.env.ALLOFLOW_DESKTOP_CONFIG
    ? path.resolve(process.env.ALLOFLOW_DESKTOP_CONFIG)
    : path.join(getDataDir(), 'alloflow-desktop.config.json');
}

function deepMerge(base, incoming) {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return { ...base };
  const out = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      out[key] = deepMerge(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function readConfig() {
  const configPath = getConfigPath();
  try {
    const text = fs.readFileSync(configPath, 'utf8');
    const merged = deepMerge(DEFAULT_CONFIG, JSON.parse(text));
    const normalized = normalizeSecretsForStorage(merged);
    if (normalized.changed) {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(normalized.config, null, 2) + '\n', 'utf8');
    }
    return normalized.config;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[AlloFlow Desktop] Config read failed:', error.message);
    }
    return normalizeSecretsForStorage(deepMerge(DEFAULT_CONFIG, {})).config;
  }
}

function writeConfig(nextConfig) {
  const configPath = getConfigPath();
  const merged = normalizeSecretsForStorage(deepMerge(DEFAULT_CONFIG, nextConfig)).config;
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  return merged;
}

function appendManagedAppLog(line) {
  const text = String(line || '').replace(/\r/g, '').trimEnd();
  if (!text) return;
  text.split('\n').forEach((entry) => {
    managedApp.logs.push({
      at: new Date().toISOString(),
      line: entry.slice(0, 2000),
    });
  });
  if (managedApp.logs.length > 250) {
    managedApp.logs.splice(0, managedApp.logs.length - 250);
  }
}

function isManagedAppRunning() {
  return Boolean(managedApp.child && !managedApp.child.killed && managedApp.child.exitCode === null);
}

function getDefaultRuntimeOrigin() {
  const host = process.env.ALLOFLOW_DESKTOP_HOST || '127.0.0.1';
  const port = process.env.ALLOFLOW_DESKTOP_PORT || 32170;
  return `http://${host}:${port}`;
}

function getRequestOrigin(req) {
  const host = req.headers.host || '127.0.0.1';
  return `http://${host}`;
}

function hasStaticAppBuild() {
  return fs.existsSync(path.join(STATIC_APP_DIR, 'index.html'));
}

function getAppMode(config) {
  return config.app?.mode || DEFAULT_CONFIG.app.mode;
}

function shouldUseStaticApp(config) {
  const mode = getAppMode(config);
  return hasStaticAppBuild() && (mode === 'auto' || mode === 'static');
}

function getConfiguredAppUrl(config) {
  return config.appUrl || `http://localhost:${config.app?.port || 3000}`;
}

function getAppUrl(config, origin = getDefaultRuntimeOrigin()) {
  if (shouldUseStaticApp(config)) {
    return origin.replace(/\/+$/, '') + '/app/';
  }
  return getConfiguredAppUrl(config);
}

function getAppPort(config) {
  try {
    const parsed = new URL(getConfiguredAppUrl(config));
    return Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80));
  } catch (_) {
    return Number(config.app?.port || 3000);
  }
}

function isLoopbackAppUrl(config) {
  try {
    const parsed = new URL(getConfiguredAppUrl(config));
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === 'http:' && (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '[::1]'
    );
  } catch (_) {
    return false;
  }
}

function getManagedAppLaunch(config) {
  const appConfig = deepMerge(DEFAULT_CONFIG.app, config.app || {});
  const cwd = path.resolve(REPO_ROOT, appConfig.cwd || DEFAULT_CONFIG.app.cwd);
  const command = appConfig.command || DEFAULT_CONFIG.app.command;
  const resolvedCommand = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  const port = getAppPort(config);
  return {
    ...appConfig,
    command: resolvedCommand,
    args: Array.isArray(appConfig.args) ? appConfig.args : DEFAULT_CONFIG.app.args,
    cwd,
    port,
    startupTimeoutMs: Number(appConfig.startupTimeoutMs || DEFAULT_CONFIG.app.startupTimeoutMs),
  };
}

async function waitForAppReachable(config, timeoutMs, origin) {
  const startedAt = Date.now();
  let probe = await probeUrl(getAppUrl(config, origin), 900);
  while (!probe.reachable && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    probe = await probeUrl(getAppUrl(config, origin), 900);
  }
  return probe;
}

function buildManagedAppStatus(config, probe, origin) {
  if (shouldUseStaticApp(config)) {
    return {
      url: getAppUrl(config, origin),
      reachable: Boolean(probe && probe.reachable),
      httpStatus: probe ? probe.status : null,
      status: 'bundled-static',
      managed: true,
      autoStart: false,
      pid: null,
      startedAt: null,
      stoppedAt: null,
      lastExit: managedApp.lastExit,
      lastError: managedApp.lastError,
      mode: getAppMode(config),
      staticAppAvailable: true,
      launch: null,
    };
  }

  const launch = getManagedAppLaunch(config);
  const running = isManagedAppRunning();
  const reachable = Boolean(probe && probe.reachable);
  return {
    url: getAppUrl(config, origin),
    reachable,
    httpStatus: probe ? probe.status : null,
    status: running ? (reachable ? 'managed-running' : 'managed-starting') : (reachable ? 'external-running' : 'offline'),
    managed: config.app?.managed !== false,
    autoStart: config.app?.autoStart !== false,
    pid: running ? managedApp.child.pid : null,
    startedAt: managedApp.startedAt,
    stoppedAt: managedApp.stoppedAt,
    lastExit: managedApp.lastExit,
    lastError: managedApp.lastError,
    mode: getAppMode(config),
    staticAppAvailable: hasStaticAppBuild(),
    launch: {
      cwd: launch.cwd,
      command: launch.command,
      args: launch.args,
      port: launch.port,
    },
  };
}

async function getManagedAppStatus(config = readConfig(), origin) {
  const probe = await probeUrl(getAppUrl(config, origin), 900);
  return buildManagedAppStatus(config, probe, origin);
}

async function startManagedApp(config = readConfig(), origin) {
  if (managedApp.startPromise) return managedApp.startPromise;

  managedApp.startPromise = (async () => {
    const appConfig = deepMerge(DEFAULT_CONFIG.app, config.app || {});
    const existingProbe = await probeUrl(getAppUrl(config, origin), 900);
    if (shouldUseStaticApp(config)) {
      return buildManagedAppStatus(config, existingProbe, origin);
    }
    if (existingProbe.reachable || isManagedAppRunning()) {
      return buildManagedAppStatus(config, existingProbe, origin);
    }

    if (appConfig.managed === false) {
      return {
        ...buildManagedAppStatus(config, existingProbe, origin),
        status: 'not-managed',
        message: 'Desktop app management is disabled.',
      };
    }

    if (!isLoopbackAppUrl(config)) {
      return {
        ...buildManagedAppStatus(config, existingProbe, origin),
        status: 'not-managed',
        message: 'Only loopback http app URLs can be started by Desktop.',
      };
    }

    const launch = getManagedAppLaunch(config);
    if (!launch.cwd.startsWith(REPO_ROOT) || !fs.existsSync(launch.cwd)) {
      return {
        ...buildManagedAppStatus(config, existingProbe, origin),
        status: 'launch-error',
        message: 'AlloFlow app directory is missing or outside the workspace.',
      };
    }

    appendManagedAppLog(`Starting AlloFlow app: ${launch.command} ${launch.args.join(' ')}`);
    managedApp.startedAt = new Date().toISOString();
    managedApp.stoppedAt = null;
    managedApp.lastExit = null;
    managedApp.lastError = null;

    const child = spawn(launch.command, launch.args, {
      cwd: launch.cwd,
      env: {
        ...process.env,
        BROWSER: 'none',
        HOST: '127.0.0.1',
        PORT: String(launch.port),
      },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    managedApp.child = child;
    child.stdout.on('data', (chunk) => appendManagedAppLog(chunk.toString('utf8')));
    child.stderr.on('data', (chunk) => appendManagedAppLog(chunk.toString('utf8')));
    child.on('error', (error) => {
      managedApp.lastError = error.message;
      appendManagedAppLog('Process error: ' + error.message);
    });
    child.on('exit', (code, signal) => {
      managedApp.lastExit = { code, signal, at: new Date().toISOString() };
      managedApp.stoppedAt = managedApp.lastExit.at;
      appendManagedAppLog(`AlloFlow app exited: code=${code} signal=${signal || 'none'}`);
      if (managedApp.child === child) managedApp.child = null;
    });

    const probe = await waitForAppReachable(config, launch.startupTimeoutMs, origin);
    return buildManagedAppStatus(config, probe, origin);
  })();

  try {
    return await managedApp.startPromise;
  } finally {
    managedApp.startPromise = null;
  }
}

async function stopManagedApp(config = readConfig(), origin) {
  if (shouldUseStaticApp(config)) {
    return {
      ...await getManagedAppStatus(config, origin),
      message: 'Bundled app mode does not use a separate app process.',
    };
  }

  if (!isManagedAppRunning()) {
    return {
      ...await getManagedAppStatus(config, origin),
      message: 'No Desktop-managed AlloFlow app process is running.',
    };
  }

  const child = managedApp.child;
  appendManagedAppLog('Stopping Desktop-managed AlloFlow app process.');
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
      killer.on('exit', resolve);
      killer.on('error', resolve);
    });
  } else {
    child.kill('SIGTERM');
  }

  managedApp.stoppedAt = new Date().toISOString();
  managedApp.child = null;
  return getManagedAppStatus(config, origin);
}

function getManagedAppLogs() {
  return { logs: managedApp.logs.slice(-250) };
}

function appendSchoolBoxLog(line) {
  const text = String(line || '').replace(/\r/g, '').trimEnd();
  if (!text) return;
  text.split('\n').forEach((entry) => {
    managedSchoolBox.logs.push({
      at: new Date().toISOString(),
      line: entry.slice(0, 2000),
    });
  });
  if (managedSchoolBox.logs.length > 300) {
    managedSchoolBox.logs.splice(0, managedSchoolBox.logs.length - 300);
  }
}

function sanitizePort(value, fallback) {
  const port = Number(value);
  return Number.isFinite(port) && port >= 1 && port <= 65535 ? port : fallback;
}

function sanitizeProjectName(value) {
  const name = String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return name || SCHOOLBOX_PROJECT_NAME;
}

function getSchoolBoxConfig(config) {
  const box = deepMerge(DEFAULT_CONFIG.schoolBox, config.schoolBox || {});
  return {
    ...box,
    host: String(box.host || '127.0.0.1'),
    port: sanitizePort(box.port, SCHOOLBOX_DEFAULT_PORTS.WEB_PORT),
    includeGpu: Boolean(box.includeGpu),
    autoPrepare: box.autoPrepare !== false,
    projectName: sanitizeProjectName(box.projectName),
  };
}

function getLiveSessionConfig(config) {
  const live = deepMerge(DEFAULT_CONFIG.liveSession, config.liveSession || {});
  const mode = LIVE_SESSION_MODES[live.mode] ? live.mode : DEFAULT_CONFIG.liveSession.mode;
  return {
    ...live,
    mode,
    requireExplicitCloud: live.requireExplicitCloud !== false,
    firebase: {
      ...(DEFAULT_CONFIG.liveSession.firebase || {}),
      ...(live.firebase || {}),
    },
    lan: {
      ...(DEFAULT_CONFIG.liveSession.lan || {}),
      ...(live.lan || {}),
    },
  };
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function sanitizeLanSessionCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

function isDeleteFieldSentinel(value) {
  return value && typeof value === 'object' && value.__op === 'deleteField';
}

function setDottedValue(target, dottedPath, value) {
  const parts = String(dottedPath || '').split('.').filter(Boolean);
  if (!parts.length) return;
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  const leaf = parts[parts.length - 1];
  if (isDeleteFieldSentinel(value)) {
    delete cursor[leaf];
  } else {
    cursor[leaf] = cloneJson(value);
  }
}

function applyLanSessionUpdates(target, updates = {}) {
  for (const [key, value] of Object.entries(updates || {})) {
    setDottedValue(target, key, value);
  }
  return target;
}

function compactLanSessions() {
  const now = Date.now();
  for (const [code, entry] of lanSessions.entries()) {
    if (entry.expiresAtMs && entry.expiresAtMs < now) {
      lanSessions.delete(code);
      notifyLanSessionSubscribers(code);
    }
  }
}

function getLanIpAddresses() {
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const item of entries || []) {
      if (item && item.family === 'IPv4' && !item.internal) {
        addresses.push(item.address);
      }
    }
  }
  return Array.from(new Set(addresses));
}

function getRuntimeBindHost() {
  return process.env.ALLOFLOW_DESKTOP_HOST || '127.0.0.1';
}

function isLanReachableBindHost(host) {
  const value = String(host || '').toLowerCase();
  return value === '0.0.0.0' || value === '::' || getLanIpAddresses().includes(value);
}

function getLanShareConfig(config) {
  const live = getLiveSessionConfig(config);
  const lan = live.lan || {};
  const requestedPort = Number(lan.sharePort);
  return {
    host: String(lan.shareHost || DEFAULT_CONFIG.liveSession.lan.shareHost),
    port: requestedPort === 0 ? 0 : sanitizePort(lan.sharePort, DEFAULT_CONFIG.liveSession.lan.sharePort),
  };
}

function getLanShareUrls(port, protocol = 'http:') {
  const addresses = getLanIpAddresses();
  return addresses.map((host) => `${protocol}//${host}:${port}`);
}

// ── Classroom join PIN ──────────────────────────────────────────────
// The PIN is configured at liveSession.lan.pin and LATCHED onto
// managedLanShare when sharing starts, so every public-listener request
// checks one in-memory value (no per-request config-file reads, and the
// smoke test can exercise the gate without touching the real config file).
function getLanSharePin(config = readConfig()) {
  const live = getLiveSessionConfig(config);
  const raw = live.lan && live.lan.pin != null ? String(live.lan.pin) : '';
  return raw.trim().slice(0, 32);
}

function getActiveLanPin() {
  return managedLanShare.server ? (managedLanShare.pin || '') : '';
}

function lanPinMatches(givenPin) {
  const required = getActiveLanPin();
  if (!required) return true;
  const given = String(givenPin || '');
  try {
    const a = crypto.createHash('sha256').update(given).digest();
    const b = crypto.createHash('sha256').update(required).digest();
    return crypto.timingSafeEqual(a, b);
  } catch (_) {
    return given === required;
  }
}

function getLanShareStatus(config = readConfig(), origin = getDefaultRuntimeOrigin()) {
  const shareConfig = getLanShareConfig(config);
  const active = Boolean(managedLanShare.server && managedLanShare.port);
  const port = active ? managedLanShare.port : shareConfig.port;
  const baseUrls = active ? getLanShareUrls(port) : [];
  return {
    active,
    host: active ? managedLanShare.host : shareConfig.host,
    port,
    startedAt: managedLanShare.startedAt,
    stoppedAt: managedLanShare.stoppedAt,
    lastError: managedLanShare.lastError,
    baseUrls,
    appUrls: baseUrls.map((baseUrl) => `${baseUrl}/app/`),
    joinBaseUrls: baseUrls.map((baseUrl) => `${baseUrl}/join/`),
    privateOrigin: origin,
  };
}

async function startLanShare(config = readConfig()) {
  const live = getLiveSessionConfig(config);
  if (live.mode !== 'schoolbox-lan') {
    throw new Error('LAN sharing is only available in School Box / Local Network mode.');
  }
  if (managedLanShare.server) {
    return getLanShareStatus(config);
  }
  const shareConfig = getLanShareConfig(config);
  const server = createLanShareServer();
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
    server.listen(shareConfig.port, shareConfig.host);
  });
  const address = server.address();
  managedLanShare.server = server;
  managedLanShare.host = shareConfig.host;
  managedLanShare.port = typeof address === 'object' && address ? address.port : shareConfig.port;
  managedLanShare.pin = getLanSharePin(config); // latch the classroom PIN for this share session
  managedLanShare.startedAt = new Date().toISOString();
  managedLanShare.stoppedAt = null;
  managedLanShare.lastError = null;
  server.on('error', (error) => {
    managedLanShare.lastError = error.message;
  });
  server.on('close', () => {
    managedLanShare.server = null;
    managedLanShare.stoppedAt = new Date().toISOString();
  });
  return getLanShareStatus(config);
}

async function stopLanShare(config = readConfig()) {
  if (!managedLanShare.server) {
    return getLanShareStatus(config);
  }
  const server = managedLanShare.server;
  await new Promise((resolve) => server.close(resolve));
  managedLanShare.server = null;
  managedLanShare.host = null;
  managedLanShare.port = null;
  managedLanShare.pin = null;
  managedLanShare.stoppedAt = new Date().toISOString();
  return getLanShareStatus(config);
}

function getLanBridgeStatus(config, origin = getDefaultRuntimeOrigin()) {
  compactLanSessions();
  const live = getLiveSessionConfig(config);
  const lan = live.lan || {};
  const originUrl = new URL(origin);
  const port = originUrl.port || (originUrl.protocol === 'https:' ? '443' : '80');
  const runtimeBindHost = getRuntimeBindHost();
  const share = getLanShareStatus(config, origin);
  const reachableFromOtherDevices = share.active || isLanReachableBindHost(runtimeBindHost);
  const baseUrls = share.active
    ? share.baseUrls
    : (reachableFromOtherDevices ? getLanIpAddresses().map((host) => `${originUrl.protocol}//${host}:${port}`) : []);
  const localBaseUrl = `${originUrl.protocol}//${originUrl.host}`;
  return {
    enabled: live.mode === 'schoolbox-lan' && lan.enabled !== false,
    ttlMinutes: sanitizePort(lan.ttlMinutes, DEFAULT_CONFIG.liveSession.lan.ttlMinutes),
    activeSessions: lanSessions.size,
    runtimeBindHost,
    reachableFromOtherDevices,
    share,
    localBaseUrl,
    lanBaseUrls: baseUrls,
    appUrls: [localBaseUrl, ...baseUrls].map((baseUrl) => `${baseUrl}/app/`),
    joinBaseUrls: [localBaseUrl, ...baseUrls].map((baseUrl) => `${baseUrl}/join/`),
  };
}

function serializeLanSession(code) {
  compactLanSessions();
  const entry = lanSessions.get(code);
  if (!entry) return null;
  return {
    id: code,
    data: cloneJson(entry.data || {}),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    expiresAt: entry.expiresAt,
  };
}

function upsertLanSession(code, data, options = {}, config = readConfig()) {
  const cleanCode = sanitizeLanSessionCode(code);
  if (!cleanCode) throw new Error('A class session code is required.');
  const existing = lanSessions.get(cleanCode);
  const now = new Date();
  const live = getLiveSessionConfig(config);
  const ttlMinutes = sanitizePort(live.lan?.ttlMinutes, DEFAULT_CONFIG.liveSession.lan.ttlMinutes);
  const nextData = options.merge && existing
    ? deepMerge(existing.data || {}, data || {})
    : cloneJson(data || {});
  const entry = {
    data: nextData,
    createdAt: existing?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString(),
    expiresAtMs: now.getTime() + ttlMinutes * 60 * 1000,
  };
  lanSessions.set(cleanCode, entry);
  notifyLanSessionSubscribers(cleanCode);
  return serializeLanSession(cleanCode);
}

function updateLanSession(code, updates) {
  const cleanCode = sanitizeLanSessionCode(code);
  const existing = lanSessions.get(cleanCode);
  if (!cleanCode || !existing) return null;
  existing.data = applyLanSessionUpdates(cloneJson(existing.data || {}), updates || {});
  existing.updatedAt = new Date().toISOString();
  lanSessions.set(cleanCode, existing);
  notifyLanSessionSubscribers(cleanCode);
  return serializeLanSession(cleanCode);
}

function deleteLanSession(code) {
  const cleanCode = sanitizeLanSessionCode(code);
  const existed = lanSessions.delete(cleanCode);
  notifyLanSessionSubscribers(cleanCode);
  return existed;
}

function notifyLanSessionSubscribers(code) {
  const subscribers = lanSessionSubscribers.get(code);
  if (!subscribers || subscribers.size === 0) return;
  const payload = serializeLanSession(code);
  const text = `event: session\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(text);
    } catch (_) {
      subscribers.delete(res);
    }
  }
}

function serveLanSessionEvents(req, res, code) {
  const cleanCode = sanitizeLanSessionCode(code);
  if (!cleanCode) {
    jsonResponse(res, 400, { error: 'A class session code is required.' });
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
  });
  let subscribers = lanSessionSubscribers.get(cleanCode);
  if (!subscribers) {
    subscribers = new Set();
    lanSessionSubscribers.set(cleanCode, subscribers);
  }
  subscribers.add(res);
  res.write(`event: session\ndata: ${JSON.stringify(serializeLanSession(cleanCode))}\n\n`);
  req.on('close', () => {
    subscribers.delete(res);
    if (subscribers.size === 0) lanSessionSubscribers.delete(cleanCode);
  });
}

const LAN_PAGE_STYLE = `
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #172044; color: #fff; }
    main { width: min(28rem, calc(100vw - 2rem)); background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.22); border-radius: 8px; padding: 2rem; box-shadow: 0 20px 80px rgba(0,0,0,.28); }
    h1 { margin: 0 0 .75rem; font-size: 1.6rem; }
    code { display: inline-block; padding: .3rem .55rem; border-radius: 6px; background: rgba(255,255,255,.14); font-size: 1.2rem; letter-spacing: .08em; }
    a.go, button.go { display: inline-block; margin-top: 1.25rem; padding: .75rem 1rem; border: 0; border-radius: 7px; color: #172044; background: #ffce6a; font-weight: 700; text-decoration: none; font-size: 1rem; cursor: pointer; }
    p { color: rgba(255,255,255,.82); line-height: 1.45; }
    p.small { font-size: .85rem; color: rgba(255,255,255,.64); }
    input[type=text] { width: 100%; box-sizing: border-box; padding: .65rem .7rem; border-radius: 7px; border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.12); color: #fff; font-size: 1.1rem; letter-spacing: .12em; }
    .err { color: #ffb0b0; font-weight: 600; }
`;

function serveLanJoinPage(res, code, origin, requestUrl) {
  const cleanCode = sanitizeLanSessionCode(code);
  if (!cleanCode) {
    textResponse(res, 404, 'Class session not found.');
    return;
  }
  const givenPin = requestUrl && requestUrl.searchParams ? String(requestUrl.searchParams.get('pin') || '') : '';
  const pinRequired = Boolean(getActiveLanPin());
  // PIN gate: with a PIN latched on the running share, the join page itself
  // asks for it before handing out the app link + session config.
  if (pinRequired && !lanPinMatches(givenPin)) {
    const wrongPin = givenPin.length > 0;
    const pinHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Join AlloFlow Class ${cleanCode}</title>
  <style>${LAN_PAGE_STYLE}</style>
</head>
<body>
  <main>
    <h1>Join AlloFlow Class</h1>
    <p>Class code: <code>${cleanCode}</code></p>
    ${wrongPin ? '<p class="err">That PIN didn’t match. Try again.</p>' : '<p>This class needs a join PIN.</p>'}
    <form method="get">
      <label for="pin">Ask your teacher for the PIN:</label>
      <input id="pin" name="pin" type="text" inputmode="numeric" autocomplete="off" autofocus>
      <button class="go" type="submit">Continue</button>
    </form>
    <p class="small">You must be on the same school network (Wi-Fi) as your teacher’s computer. Nothing here leaves your school network.</p>
  </main>
</body>
</html>`;
    res.writeHead(pinRequired && wrongPin ? 401 : 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(pinHtml);
    return;
  }
  const config = {
    mode: 'schoolbox-lan',
    label: 'School Box / Local Network',
    firestoreAllowed: false,
    cloudSessionAllowed: false,
    lanApiBase: origin,
    joinCode: cleanCode,
    // Forward the validated PIN so the in-app LAN adapter (when it lands) can
    // authenticate its session reads/patches against the public listener.
    lanPin: pinRequired ? givenPin : '',
    source: 'alloflow-desktop',
    updatedAt: new Date().toISOString(),
  };
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Join AlloFlow Class ${cleanCode}</title>
  <style>${LAN_PAGE_STYLE}</style>
</head>
<body>
  <main>
    <h1>Join AlloFlow Class</h1>
    <p>This class runs on your school’s own network. No cloud account is used and nothing you do here leaves the school network.</p>
    <p>Class code: <code>${cleanCode}</code></p>
    <a class="go" href="/app/?allo_lan_join=${encodeURIComponent(cleanCode)}">Open AlloFlow</a>
    <p class="small">Not loading? Make sure this device is on the same Wi-Fi / network as your teacher’s computer. Some school networks block device-to-device connections (“client isolation”) — if joining never works, ask IT or your teacher.</p>
  </main>
  <script>
    localStorage.setItem('alloflow_live_session_config', ${JSON.stringify(JSON.stringify(config))});
  </script>
</body>
</html>`;
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(html);
}

// ── Teacher presenter view (PRIVATE runtime only) ───────────────────
// A projector-friendly page: giant class code, QR of the join link, the PIN
// if one is set, and plain-language same-network guidance. Never served by
// the public LAN Share listener.
let _qrLibCache = null;
function readQrLib() {
  if (_qrLibCache == null) {
    try {
      _qrLibCache = fs.readFileSync(path.join(COMMAND_CENTER_DIR, 'vendor', 'qrcode.js'), 'utf8');
    } catch (_) {
      _qrLibCache = '';
    }
  }
  return _qrLibCache;
}

function servePresenterPage(res, code) {
  const cleanCode = sanitizeLanSessionCode(code);
  if (!cleanCode) {
    textResponse(res, 404, 'Class session not found.');
    return;
  }
  const config = readConfig();
  const bridge = getLanBridgeStatus(config);
  const shareActive = Boolean(bridge.share && bridge.share.active);
  const joinBases = (bridge.joinBaseUrls || []).filter((u) => !u.includes('127.0.0.1'));
  const joinUrl = shareActive && joinBases.length ? joinBases[0] + cleanCode : '';
  const pin = getActiveLanPin() || getLanSharePin(config);
  const qrLib = readQrLib();
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AlloFlow Class ${cleanCode}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #101736; color: #fff; text-align: center; }
    main { padding: 2rem; }
    .code { font-size: clamp(3rem, 12vw, 7rem); font-weight: 900; letter-spacing: .18em; font-family: ui-monospace, Consolas, monospace; margin: .5rem 0 1rem; }
    .pin { font-size: clamp(1.4rem, 4vw, 2.2rem); font-weight: 800; color: #ffce6a; margin: .25rem 0 1rem; }
    #qr { background: #fff; display: inline-block; padding: 14px; border-radius: 12px; }
    #qr svg { display: block; width: min(42vh, 60vw); height: auto; }
    .url { font-family: ui-monospace, Consolas, monospace; font-size: clamp(1rem, 2.4vw, 1.5rem); color: #cdd7f5; word-break: break-all; margin-top: 1rem; }
    p.hint { color: rgba(255,255,255,.65); max-width: 46rem; margin: 1.25rem auto 0; line-height: 1.5; }
    .warn { color: #ffb0b0; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <div>Join today’s AlloFlow class — class code:</div>
    <div class="code">${cleanCode}</div>
    ${pin ? `<div class="pin">Join PIN: ${pin}</div>` : ''}
    ${shareActive && joinUrl ? `
    <div id="qr" role="img" aria-label="QR code for the class join link"></div>
    <div class="url">${joinUrl}</div>
    <p class="hint">Scan the QR code or type the link on a device that is on the SAME school network / Wi-Fi as this computer.</p>
    ` : `
    <p class="warn">LAN sharing is not running${joinBases.length ? '' : ' (or no shareable network address was found)'}.</p>
    <p class="hint">Open the AlloFlow Desktop command center and press “Start LAN Share”, then refresh this page.</p>
    `}
  </main>
  ${shareActive && joinUrl && qrLib ? `
  <script>${qrLib}</script>
  <script>
    (function () {
      try {
        var qr = qrcode(0, 'M');
        qr.addData(${JSON.stringify(joinUrl)});
        qr.make();
        document.getElementById('qr').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
      } catch (e) {
        document.getElementById('qr').textContent = 'QR unavailable: ' + e.message;
      }
    })();
  </script>
  ` : ''}
</body>
</html>`;
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(html);
}

async function getLiveSessionStatus(config = readConfig(), origin = getDefaultRuntimeOrigin()) {
  const live = getLiveSessionConfig(config);
  const modeInfo = LIVE_SESSION_MODES[live.mode] || LIVE_SESSION_MODES[DEFAULT_CONFIG.liveSession.mode];
  const hasByoFirebaseMetadata = Boolean(live.firebase.projectId || live.firebase.appId);
  const cloudSessionAllowed = Boolean(modeInfo.cloudSession && (
    live.mode !== 'byo-firebase' || hasByoFirebaseMetadata
  ));
  const schoolBoxStatus = await getSchoolBoxStatus(config);
  const lanBridge = getLanBridgeStatus(config, origin);
  const warnings = [];
  const nextActions = [];

  if (live.mode === 'alloflow-demo-cloud') {
    warnings.push('Demo cloud mode is not intended for real student data.');
    nextActions.push('Use this only for demos, or switch to School Box / Local Network for classrooms.');
  } else if (live.mode === 'byo-firebase') {
    if (!hasByoFirebaseMetadata) {
      warnings.push('BYO Firebase is selected, but no school-owned project metadata is recorded in Desktop settings.');
      nextActions.push('Record and wire a school or district-owned Firebase project before enabling cloud classroom sessions.');
    } else {
      nextActions.push('Use a school or district-owned Firebase project and retention rules before real classroom use.');
    }
  } else if (live.mode === 'district-server') {
    warnings.push('District Server mode is planned but not connected yet.');
    nextActions.push('Use School Box / Local Network until a district server URL is configured.');
  } else if (live.mode === 'schoolbox-lan') {
    if (lanBridge.enabled) {
      nextActions.push('Class sessions will use the Desktop local session bridge instead of Firestore.');
    }
    if (!lanBridge.reachableFromOtherDevices) {
      nextActions.push('The bridge is local-only right now; student-device LAN sharing needs a public LAN listener or explicit network sharing toggle next.');
    }
    if (schoolBoxStatus.status === 'running') {
      nextActions.push('School Box is running for local classroom services.');
    } else {
      nextActions.push('Prepare and start School Box before using cross-device local classroom sessions.');
    }
  } else {
    nextActions.push('Desktop will create local preview sessions only. Students on other devices cannot join.');
  }

  if (!cloudSessionAllowed) {
    warnings.push('Desktop will block Firestore live-session creation in this mode.');
  }

  return {
    ...live,
    label: modeInfo.label,
    dataLocation: modeInfo.dataLocation,
    recommended: Boolean(modeInfo.recommended),
    demoOnly: Boolean(modeInfo.demoOnly),
    future: Boolean(modeInfo.future),
    cloudSessionAllowed,
    firestoreAllowed: cloudSessionAllowed,
    schoolBox: {
      status: schoolBoxStatus.status,
      url: schoolBoxStatus.url,
    },
    lanBridge,
    warnings,
    nextActions,
  };
}

function isAsarPath(filePath) {
  return String(filePath || '').split(path.sep).includes('app.asar');
}

function getSchoolBoxStackPaths() {
  const candidates = [];
  if (process.env.ALLOFLOW_SCHOOLBOX_ROOT) {
    candidates.push({ root: path.resolve(process.env.ALLOFLOW_SCHOOLBOX_ROOT), source: 'configured-root' });
  }
  if (process.resourcesPath) {
    candidates.push({ root: path.join(process.resourcesPath, 'schoolbox'), source: 'packaged-resource' });
  }
  candidates.push({ root: REPO_ROOT, source: 'project-root' });

  for (const candidate of candidates) {
    const rootCompose = path.join(candidate.root, 'docker-compose.yml');
    if (!isAsarPath(rootCompose) && fs.existsSync(rootCompose)) {
      const dockerEnvExample = path.join(candidate.root, 'docker', '.env.example');
      const localEnvExample = path.join(candidate.root, '.env.example');
      const usesDockerEnv = fs.existsSync(dockerEnvExample);
      return {
        cwd: candidate.root,
        composeFile: rootCompose,
        envFile: candidate.source === 'packaged-resource'
          ? path.join(getDataDir(), 'schoolbox.env')
          : path.join(candidate.root, usesDockerEnv ? 'docker' : '', '.env'),
        envExampleFile: usesDockerEnv ? dockerEnvExample : localEnvExample,
        stackAvailable: true,
        source: candidate.source,
      };
    }

    const dockerCompose = path.join(candidate.root, 'docker', 'docker-compose.yml');
    if (!isAsarPath(dockerCompose) && fs.existsSync(dockerCompose)) {
      return {
        cwd: path.join(candidate.root, 'docker'),
        composeFile: dockerCompose,
        envFile: candidate.source === 'packaged-resource'
          ? path.join(getDataDir(), 'schoolbox.env')
          : path.join(candidate.root, 'docker', '.env'),
        envExampleFile: path.join(candidate.root, 'docker', '.env.example'),
        stackAvailable: true,
        source: candidate.source + '-docker-folder',
      };
    }
  }

  const fallbackRoot = candidates[0]?.root || REPO_ROOT;
  return {
    cwd: fallbackRoot,
    composeFile: path.join(fallbackRoot, 'docker-compose.yml'),
    envFile: path.join(getDataDir(), 'schoolbox.env'),
    envExampleFile: path.join(fallbackRoot, '.env.example'),
    stackAvailable: false,
    source: 'missing',
  };
}

function readEnvValues(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function setEnvLine(lines, key, value, options = {}) {
  let found = false;
  let changed = false;
  const overwrite = options.overwrite !== false;
  const nextLine = `${key}=${value}`;
  const nextLines = lines.map((line) => {
    if (!line.match(new RegExp(`^\\s*${key}\\s*=`))) return line;
    found = true;
    if (!overwrite || line.trim() === nextLine) return line;
    changed = true;
    return nextLine;
  });
  if (!found) {
    nextLines.push(nextLine);
    changed = true;
  }
  return { lines: nextLines, changed };
}

function getSchoolBoxEnvInfo(config) {
  const box = getSchoolBoxConfig(config);
  const paths = getSchoolBoxStackPaths();
  const values = readEnvValues(paths.envFile);
  const ports = Object.fromEntries(Object.entries(SCHOOLBOX_DEFAULT_PORTS).map(([key, fallback]) => [
    key,
    sanitizePort(values[key], key === 'WEB_PORT' ? box.port : fallback),
  ]));
  return {
    paths,
    envExists: fs.existsSync(paths.envFile),
    envExampleExists: fs.existsSync(paths.envExampleFile),
    ports,
  };
}

function schoolBoxRequiresStaticApp(paths) {
  try {
    return fs.readFileSync(paths.composeFile, 'utf8').includes('../app-build');
  } catch (_) {
    return false;
  }
}

function getSchoolBoxStaticAppStatus(paths) {
  if (!schoolBoxRequiresStaticApp(paths)) {
    return { required: false, available: true, path: null };
  }
  const indexPath = path.resolve(paths.cwd, '..', 'app-build', 'index.html');
  return {
    required: true,
    available: fs.existsSync(indexPath),
    path: indexPath,
  };
}

function prepareSchoolBoxEnv(config) {
  const box = getSchoolBoxConfig(config);
  const info = getSchoolBoxEnvInfo(config);
  const { paths } = info;
  if (!paths.stackAvailable) {
    throw new Error('School Box stack files were not found.');
  }

  let created = false;
  if (!fs.existsSync(paths.envFile)) {
    fs.mkdirSync(path.dirname(paths.envFile), { recursive: true });
    if (fs.existsSync(paths.envExampleFile)) {
      fs.copyFileSync(paths.envExampleFile, paths.envFile);
    } else {
      fs.writeFileSync(paths.envFile, '# AlloFlow School Box local settings\n', 'utf8');
    }
    created = true;
  }

  let lines = fs.readFileSync(paths.envFile, 'utf8').split(/\r?\n/);
  const values = readEnvValues(paths.envFile);
  const pbPort = sanitizePort(values.PB_PORT, SCHOOLBOX_DEFAULT_PORTS.PB_PORT);
  const required = {
    WEB_PORT: String(box.port),
    PB_PORT: String(pbPort),
    OLLAMA_PORT: String(sanitizePort(values.OLLAMA_PORT, SCHOOLBOX_DEFAULT_PORTS.OLLAMA_PORT)),
    FLUX_PORT: String(sanitizePort(values.FLUX_PORT, SCHOOLBOX_DEFAULT_PORTS.FLUX_PORT)),
    TTS_PORT: String(sanitizePort(values.TTS_PORT, SCHOOLBOX_DEFAULT_PORTS.TTS_PORT)),
    PIPER_PORT: String(sanitizePort(values.PIPER_PORT, SCHOOLBOX_DEFAULT_PORTS.PIPER_PORT)),
    SEARCH_PORT: String(sanitizePort(values.SEARCH_PORT, SCHOOLBOX_DEFAULT_PORTS.SEARCH_PORT)),
    REACT_APP_DATA_BACKEND: values.REACT_APP_DATA_BACKEND || 'auto',
    REACT_APP_POCKETBASE_URL: `http://localhost:${pbPort}`,
  };

  let changed = false;
  for (const [key, value] of Object.entries(required)) {
    const result = setEnvLine(lines, key, value, { overwrite: key === 'WEB_PORT' || key === 'REACT_APP_POCKETBASE_URL' });
    lines = result.lines;
    changed = changed || result.changed;
  }

  if (changed) {
    fs.writeFileSync(paths.envFile, lines.join('\n').replace(/\n*$/, '\n'), 'utf8');
  }

  appendSchoolBoxLog(`${created ? 'Created' : 'Prepared'} School Box environment at ${paths.envFile}`);
  return {
    created,
    updated: changed,
    envFile: paths.envFile,
    composeFile: paths.composeFile,
  };
}

function getToolVersion(command, args) {
  try {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
    });
    if (result.error) {
      return { available: false, error: result.error.message };
    }
    if (result.status !== 0) {
      return {
        available: false,
        error: (result.stderr || result.stdout || `${command} exited with ${result.status}`).trim(),
      };
    }
    return { available: true, version: (result.stdout || result.stderr || '').trim() };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

function getDockerStatus() {
  const docker = getToolVersion('docker', ['--version']);
  const compose = docker.available ? getToolVersion('docker', ['compose', 'version']) : { available: false, error: docker.error };
  return {
    available: Boolean(docker.available && compose.available),
    dockerAvailable: Boolean(docker.available),
    composeAvailable: Boolean(compose.available),
    dockerVersion: docker.version || null,
    composeVersion: compose.version || null,
    error: docker.error || compose.error || null,
  };
}

function probeTcp(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (reachable, error = null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ reachable, status: reachable ? 'open' : 'offline', error });
    };
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => finish(true));
    socket.on('timeout', () => finish(false, 'timeout'));
    socket.on('error', (error) => finish(false, error.message));
  });
}

async function probeSchoolBoxService(service, host, ports) {
  const port = ports[service.envKey];
  if (service.kind === 'tcp') {
    const probe = await probeTcp(host, port);
    return {
      ...service,
      port,
      status: probe.reachable ? 'running' : 'offline',
      reachable: probe.reachable,
      error: probe.error || null,
    };
  }

  const url = `http://${host}:${port}${service.path || '/'}`;
  const probe = await probeUrl(url, 1000);
  return {
    ...service,
    port,
    url,
    status: probe.reachable ? 'running' : 'offline',
    reachable: probe.reachable,
    httpStatus: probe.status,
    error: probe.error || null,
  };
}

async function getSchoolBoxStatus(config = readConfig()) {
  const box = getSchoolBoxConfig(config);
  const envInfo = getSchoolBoxEnvInfo(config);
  const staticApp = getSchoolBoxStaticAppStatus(envInfo.paths);
  const isDistrictMode = box.mode === 'district-server';
  const docker = isDistrictMode
    ? {
        available: false,
        dockerAvailable: false,
        composeAvailable: false,
        dockerVersion: null,
        composeVersion: null,
        error: 'District Server mode does not start local Docker services yet.',
      }
    : getDockerStatus();
  const services = isDistrictMode
    ? []
    : await Promise.all(SCHOOLBOX_SERVICE_DEFS.map((service) => (
        probeSchoolBoxService(service, box.host, envInfo.ports)
      )));
  const requiredServices = services.filter((service) => !service.optional);
  const runningRequired = requiredServices.filter((service) => service.reachable).length;
  let status = 'ready';

  if (box.mode === 'disabled') {
    status = 'disabled';
  } else if (isDistrictMode) {
    status = 'district-planned';
  } else if (!envInfo.paths.stackAvailable) {
    status = 'missing-stack';
  } else if (!staticApp.available) {
    status = 'missing-app-build';
  } else if (!envInfo.envExists) {
    status = 'needs-setup';
  } else if (!docker.available) {
    status = 'needs-docker';
  } else if (runningRequired === requiredServices.length) {
    status = 'running';
  } else if (runningRequired > 0) {
    status = 'partial';
  }

  return {
    schoolBox: box,
    status,
    implemented: true,
    url: `http://${box.host}:${envInfo.ports.WEB_PORT}`,
    stack: {
      cwd: envInfo.paths.cwd,
      composeFile: envInfo.paths.composeFile,
      envFile: envInfo.paths.envFile,
      envExists: envInfo.envExists,
      envExampleExists: envInfo.envExampleExists,
      stackAvailable: envInfo.paths.stackAvailable,
      source: envInfo.paths.source,
      staticApp,
    },
    docker,
    ports: envInfo.ports,
    services,
    nextActions: getSchoolBoxNextActions(status, {
      docker,
      envInfo,
      staticApp,
      services,
    }),
    lastCommand: managedSchoolBox.lastCommand,
    lastExit: managedSchoolBox.lastExit,
    lastError: managedSchoolBox.lastError,
  };
}

function getSchoolBoxNextActions(status, context = {}) {
  const docker = context.docker || {};
  const envInfo = context.envInfo || {};
  const staticApp = context.staticApp || {};

  if (status === 'disabled') {
    return ['Choose Desktop Host when you want this computer to host a local School Box.'];
  }
  if (status === 'district-planned') {
    return [
      'District Server mode is reserved for the future shared/server command center.',
      'Choose Desktop Host to run the current local School Box stack from this desktop app.',
    ];
  }
  if (status === 'missing-stack') {
    return ['The School Box stack files are not available in this build. Rebuild the desktop package with desktop/schoolbox included.'];
  }
  if (status === 'missing-app-build') {
    return ['Build the bundled desktop web app so School Box can serve it locally.'];
  }
  if (status === 'needs-setup') {
    return ['Press Prepare to create the local School Box settings file.'];
  }
  if (status === 'needs-docker') {
    const detail = docker.error ? ` Docker detail: ${docker.error}` : '';
    return [`Install and start Docker Desktop, then press Refresh.${detail}`];
  }
  if (status === 'partial') {
    return ['Some School Box services are running. Press Start Host again or check the logs for the service that did not come up.'];
  }
  if (status === 'running') {
    return ['School Box is running. Press Open to view it in your browser.'];
  }
  if (!envInfo.envExists) {
    return ['Press Prepare to create the local School Box settings file.'];
  }
  if (staticApp.required && !staticApp.available) {
    return ['Build the bundled app before starting School Box.'];
  }
  return ['Press Start Host to run the local School Box services.'];
}

function schoolBoxComposeArgs(action, config) {
  const box = getSchoolBoxConfig(config);
  const envInfo = getSchoolBoxEnvInfo(config);
  const paths = envInfo.paths;
  const services = box.includeGpu
    ? [...SCHOOLBOX_CORE_SERVICES, ...SCHOOLBOX_GPU_SERVICES]
    : SCHOOLBOX_CORE_SERVICES;
  const args = [
    'compose',
    '--env-file',
    paths.envFile,
    '-f',
    paths.composeFile,
    '-p',
    box.projectName,
  ];

  if (box.includeGpu) args.push('--profile', 'gpu');
  if (action === 'up') return { paths, args: [...args, 'up', '-d', ...services] };
  if (action === 'stop') return { paths, args: [...args, 'stop', ...Array.from(new Set([...services, ...SCHOOLBOX_GPU_SERVICES]))] };
  throw new Error('Unknown School Box command.');
}

async function runSchoolBoxCompose(action, config) {
  const docker = getDockerStatus();
  if (!docker.available) {
    throw new Error(docker.error || 'Docker with Compose is not available.');
  }

  const envInfo = getSchoolBoxEnvInfo(config);
  if (!envInfo.paths.stackAvailable) {
    throw new Error('School Box stack files were not found.');
  }
  const staticApp = getSchoolBoxStaticAppStatus(envInfo.paths);
  if (action === 'up' && !staticApp.available) {
    throw new Error('The packaged School Box web app build is missing. Build the desktop web app before starting School Box.');
  }
  if (!envInfo.envExists) {
    throw new Error('School Box is not prepared yet.');
  }

  const { paths, args } = schoolBoxComposeArgs(action, config);
  const commandText = `docker ${args.join(' ')}`;
  managedSchoolBox.lastCommand = commandText;
  managedSchoolBox.lastExit = null;
  managedSchoolBox.lastError = null;
  appendSchoolBoxLog(commandText);

  return new Promise((resolve) => {
    const child = spawn('docker', args, {
      cwd: paths.cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      stdout += text;
      appendSchoolBoxLog(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      stderr += text;
      appendSchoolBoxLog(text);
    });
    child.on('error', (error) => {
      managedSchoolBox.lastError = error.message;
      appendSchoolBoxLog('Command error: ' + error.message);
      resolve({ exitCode: 1, stdout, stderr, error: error.message });
    });
    child.on('exit', (code, signal) => {
      managedSchoolBox.lastExit = { code, signal, at: new Date().toISOString() };
      appendSchoolBoxLog(`School Box command exited: code=${code} signal=${signal || 'none'}`);
      resolve({ exitCode: code, signal, stdout, stderr });
    });
  });
}

function summarizeCommandResult(result) {
  return {
    exitCode: result.exitCode,
    signal: result.signal || null,
    stdout: String(result.stdout || '').slice(-4000),
    stderr: String(result.stderr || result.error || '').slice(-4000),
  };
}

function getSchoolBoxLogs() {
  return { logs: managedSchoolBox.logs.slice(-300) };
}

function redactConfig(config) {
  const redacted = deepMerge(DEFAULT_CONFIG, config);
  redacted.secrets = Object.fromEntries(Object.entries(config.secrets || {}).map(([id, secret]) => [
    id,
    {
      hasKey: hasStoredSecret(secret),
      storage: secret && secret.storage ? secret.storage : (secret && secret.value ? 'local-config-plaintext' : null),
      updatedAt: secret && secret.updatedAt ? secret.updatedAt : null,
    },
  ]));
  redacted.secretStorage = getSecretStorageStatus();
  return redacted;
}

function jsonResponse(res, statusCode, body) {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

function textResponse(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readRequestJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_REQUEST_BODY_BYTES) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function providerFromConfig(provider, config) {
  const override = (config.providers && config.providers[provider.id]) || {};
  return {
    ...provider,
    baseUrl: override.baseUrl || provider.baseUrl,
    enabled: override.enabled !== false,
    selected: config.selectedProvider === provider.id,
    hasKey: hasStoredSecret(config.secrets && config.secrets[provider.id]),
  };
}

async function probeUrl(url, timeoutMs = 1200) {
  if (typeof fetch !== 'function') {
    return { reachable: false, status: 'unsupported', error: 'This Node runtime does not expose fetch().' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json,text/html;q=0.8,*/*;q=0.1' },
    });
    return {
      reachable: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      reachable: false,
      status: error.name === 'AbortError' ? 'timeout' : 'offline',
      error: error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeProvider(provider) {
  if (!provider.enabled) {
    return { ...provider, status: 'disabled', reachable: false, modelCount: null, models: [] };
  }

  if (provider.group === 'cloud') {
    return {
      ...provider,
      status: provider.hasKey ? 'configured' : 'needs-key',
      reachable: null,
      modelCount: null,
      models: [],
    };
  }

  const probe = await probeUrl(provider.baseUrl + provider.modelsPath);
  let models = [];
  if (probe.reachable && typeof fetch === 'function') {
    try {
      const response = await fetch(provider.baseUrl + provider.modelsPath, { headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (provider.protocol === 'ollama-native') {
        models = (data.models || []).map((model) => model.name).filter(Boolean);
      } else {
        models = (data.data || []).map((model) => model.id).filter(Boolean);
      }
    } catch (_) {
      models = [];
    }
  }

  return {
    ...provider,
    status: probe.reachable ? 'available' : 'offline',
    reachable: probe.reachable,
    httpStatus: probe.status,
    error: probe.error || null,
    modelCount: models.length,
    models,
  };
}

async function getProviderStatuses(config) {
  const providers = PROVIDER_PRESETS.map((provider) => providerFromConfig(provider, config));
  return Promise.all(providers.map(probeProvider));
}

async function buildDiagnostics(config = readConfig(), origin = getDefaultRuntimeOrigin()) {
  const [providers, app, schoolBox, liveSession] = await Promise.all([
    getProviderStatuses(config),
    getManagedAppStatus(config, origin),
    getSchoolBoxStatus(config),
    getLiveSessionStatus(config, origin),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    runtime: {
      name: 'AlloFlow Desktop Runtime',
      version: VERSION,
      dataDir: getDataDir(),
      configPath: getConfigPath(),
      commandCenterDir: COMMAND_CENTER_DIR,
      staticAppAvailable: hasStaticAppBuild(),
      secretStorage: getSecretStorageStatus(),
    },
    app,
    providers: providers.map((provider) => ({
      id: provider.id,
      label: provider.label,
      group: provider.group,
      status: provider.status,
      selected: provider.selected,
      reachable: provider.reachable,
      baseUrl: provider.baseUrl,
      hasKey: provider.hasKey,
      modelCount: provider.modelCount,
      models: provider.models,
      error: provider.error || null,
    })),
    config: redactConfig(config),
    liveSession,
    schoolBox,
    logs: {
      app: getManagedAppLogs().logs,
      schoolBox: getSchoolBoxLogs().logs,
    },
    environment: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      cwd: process.cwd(),
    },
  };
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      textResponse(res, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not found' : 'Static file error');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

function serveFromDir(res, rootDir, pathname, options = {}) {
  const routePrefix = options.routePrefix || '/';
  const fallbackToIndex = Boolean(options.fallbackToIndex);

  if (!fs.existsSync(rootDir)) {
    textResponse(res, 404, 'Static app has not been built yet.');
    return;
  }

  let relativePath = pathname;
  if (routePrefix !== '/') {
    if (relativePath === routePrefix.replace(/\/+$/, '')) relativePath = '/';
    else if (relativePath.startsWith(routePrefix)) relativePath = relativePath.slice(routePrefix.length);
  }

  relativePath = relativePath === '/' || relativePath === '' ? 'index.html' : decodeURIComponent(relativePath).replace(/^\/+/, '');
  const filePath = path.resolve(rootDir, relativePath);
  const rootRelative = path.relative(rootDir, filePath);
  if (rootRelative.startsWith('..') || path.isAbsolute(rootRelative)) {
    textResponse(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (fallbackToIndex && error.code === 'ENOENT' && !path.extname(relativePath)) {
        sendFile(res, path.join(rootDir, 'index.html'));
        return;
      }
      textResponse(res, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not found' : 'Static file error');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

function serveStatic(res, pathname) {
  serveFromDir(res, COMMAND_CENTER_DIR, pathname);
}

function serveBundledApp(res, pathname) {
  serveFromDir(res, STATIC_APP_DIR, pathname, {
    routePrefix: '/app/',
    fallbackToIndex: true,
  });
}

async function handleApi(req, res, url) {
  const config = readConfig();
  const origin = getRequestOrigin(req);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    const appProbe = await probeUrl(getAppUrl(config, origin), 900);
    const appStatus = buildManagedAppStatus(config, appProbe, origin);
    const liveSession = await getLiveSessionStatus(config, origin);
    jsonResponse(res, 200, {
      name: 'AlloFlow Desktop Runtime',
      version: VERSION,
      status: 'ok',
      appUrl: getAppUrl(config, origin),
      appReachable: appProbe.reachable,
      appStatus: appProbe.status,
      appManager: appStatus,
      appMode: getAppMode(config),
      staticAppAvailable: hasStaticAppBuild(),
      dataDir: getDataDir(),
      configPath: getConfigPath(),
      commandCenterDir: COMMAND_CENTER_DIR,
      schoolBox: config.schoolBox,
      liveSession,
      localEngine: config.localEngine,
      updates: config.updates,
      secretStorage: getSecretStorageStatus(),
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/app/status') {
    jsonResponse(res, 200, { app: await getManagedAppStatus(config, origin) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/app/start') {
    jsonResponse(res, 200, { app: await startManagedApp(config, origin) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/app/stop') {
    jsonResponse(res, 200, { app: await stopManagedApp(config, origin) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/app/logs') {
    jsonResponse(res, 200, getManagedAppLogs());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/diagnostics') {
    jsonResponse(res, 200, await buildDiagnostics(config, origin));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/config') {
    jsonResponse(res, 200, redactConfig(config));
    return;
  }

  if ((req.method === 'POST' || req.method === 'PUT') && url.pathname === '/api/config') {
    const body = await readRequestJson(req);
    const saved = writeConfig(deepMerge(config, body));
    jsonResponse(res, 200, redactConfig(saved));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/providers') {
    jsonResponse(res, 200, { providers: await getProviderStatuses(config) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/providers/test') {
    const body = await readRequestJson(req);
    const preset = PROVIDER_PRESETS.find((provider) => provider.id === body.id);
    if (!preset) {
      jsonResponse(res, 404, { error: 'Unknown provider.' });
      return;
    }
    const provider = providerFromConfig(preset, deepMerge(config, {
      providers: { [preset.id]: { baseUrl: body.baseUrl || preset.baseUrl } },
    }));
    jsonResponse(res, 200, { provider: await probeProvider(provider) });
    return;
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/secrets/')) {
    const providerId = decodeURIComponent(url.pathname.replace('/api/secrets/', ''));
    if (!PROVIDER_PRESETS.some((provider) => provider.id === providerId)) {
      jsonResponse(res, 404, { error: 'Unknown provider.' });
      return;
    }
    const body = await readRequestJson(req);
    const next = deepMerge(config, {});
    next.secrets = { ...(next.secrets || {}) };
    if (body.apiKey) {
      next.secrets[providerId] = encryptSecretValue(body.apiKey);
    } else {
      delete next.secrets[providerId];
    }
    const saved = writeConfig(next);
    jsonResponse(res, 200, redactConfig(saved));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/engine/status') {
    const provider = providerFromConfig(PROVIDER_PRESETS.find((item) => item.id === 'alloflow-local'), config);
    jsonResponse(res, 200, {
      engine: config.localEngine,
      provider: await probeProvider(provider),
      implemented: false,
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/engine/start') {
    jsonResponse(res, 501, {
      error: 'AlloFlow Built-in Engine launcher is not implemented yet.',
      nextStep: 'Add the managed model runner process behind this endpoint.',
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/schoolbox/status') {
    jsonResponse(res, 200, await getSchoolBoxStatus(config));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/live-session/status') {
    jsonResponse(res, 200, await getLiveSessionStatus(config, origin));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/lan-share/diagnostics') {
    // Plain-language network readout for the command center: what addresses
    // exist, whether sharing is up, and the two classic classroom failure
    // modes (firewall prompt declined, AP/client isolation) spelled out.
    const bridge = getLanBridgeStatus(config, origin);
    const addresses = getLanIpAddresses();
    const warnings = [];
    const notes = [];
    if (!addresses.length) {
      warnings.push('No LAN network address was found on this computer. Connect to the school network (Wi-Fi or ethernet) before starting a class.');
    }
    if (!bridge.share || !bridge.share.active) {
      notes.push('LAN sharing is off. Students can only join from this computer until you press Start LAN Share.');
    } else {
      notes.push('If a student device cannot load the join link: (1) confirm it is on the SAME network as this computer, (2) check that Windows Firewall allowed "AlloFlow Desktop" on private networks — if the prompt was dismissed, re-allow it in Windows Security > Firewall > Allowed apps, (3) some school Wi-Fi blocks device-to-device traffic ("client isolation" / "AP isolation") — that requires IT to allow it or a different network segment.');
      if (getActiveLanPin()) notes.push('A join PIN is active for this share session.');
      else notes.push('No join PIN is set. Anyone on the school network with the link can open the join page. Set a PIN below for busy or shared networks.');
    }
    jsonResponse(res, 200, {
      addresses,
      runtimeBindHost: bridge.runtimeBindHost,
      reachableFromOtherDevices: bridge.reachableFromOtherDevices,
      share: bridge.share,
      joinBaseUrls: bridge.joinBaseUrls,
      pinActive: Boolean(getActiveLanPin()),
      pinConfigured: Boolean(getLanSharePin(config)),
      warnings,
      notes,
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/lan-share/status') {
    jsonResponse(res, 200, getLanShareStatus(config, origin));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/lan-share/start') {
    try {
      jsonResponse(res, 200, { share: await startLanShare(config) });
    } catch (error) {
      managedLanShare.lastError = error.message;
      jsonResponse(res, 500, { error: error.message, share: getLanShareStatus(config, origin) });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/lan-share/stop') {
    jsonResponse(res, 200, { share: await stopLanShare(config) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/lan-session/status') {
    jsonResponse(res, 200, getLanBridgeStatus(config, origin));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/lan-sessions') {
    const body = await readRequestJson(req);
    const session = upsertLanSession(body.code, body.session || body.data || {}, body.options || {}, config);
    jsonResponse(res, 200, {
      session,
      joinUrls: getLanBridgeStatus(config, origin).joinBaseUrls.map((baseUrl) => baseUrl + session.id),
    });
    return;
  }

  const lanSessionMatch = url.pathname.match(/^\/api\/lan-sessions\/([A-Za-z0-9_-]+)(\/events)?$/);
  if (lanSessionMatch) {
    const code = lanSessionMatch[1];
    if (req.method === 'GET' && lanSessionMatch[2] === '/events') {
      serveLanSessionEvents(req, res, code);
      return;
    }
    if (req.method === 'GET') {
      const session = serializeLanSession(sanitizeLanSessionCode(code));
      if (!session) {
        jsonResponse(res, 404, { error: 'Class session not found.' });
        return;
      }
      jsonResponse(res, 200, { session });
      return;
    }
    if (req.method === 'PATCH') {
      const body = await readRequestJson(req);
      const session = updateLanSession(code, body.updates || body.data || {});
      if (!session) {
        jsonResponse(res, 404, { error: 'Class session not found.' });
        return;
      }
      jsonResponse(res, 200, { session });
      return;
    }
    if (req.method === 'DELETE') {
      jsonResponse(res, 200, { deleted: deleteLanSession(code) });
      return;
    }
    jsonResponse(res, 405, { error: 'Unsupported LAN session method.' });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/schoolbox/setup') {
    const box = getSchoolBoxConfig(config);
    if (box.mode === 'district-server') {
      jsonResponse(res, 409, { error: 'District Server mode is a future command-center target. Choose Desktop Host to prepare a local School Box.' });
      return;
    }
    const prepared = prepareSchoolBoxEnv(config);
    jsonResponse(res, 200, {
      prepared,
      status: await getSchoolBoxStatus(config),
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/schoolbox/start') {
    const box = getSchoolBoxConfig(config);
    if (box.mode === 'disabled') {
      jsonResponse(res, 409, { error: 'School Box is disabled. Choose Desktop Host, then start again.' });
      return;
    }
    if (box.mode === 'district-server') {
      jsonResponse(res, 409, { error: 'District Server mode is a future command-center target. Choose Desktop Host to start the local School Box stack.' });
      return;
    }
    const prepared = box.autoPrepare ? prepareSchoolBoxEnv(config) : null;
    const command = await runSchoolBoxCompose('up', config);
    const statusCode = command.exitCode === 0 ? 200 : 500;
    jsonResponse(res, statusCode, {
      prepared,
      command: summarizeCommandResult(command),
      status: await getSchoolBoxStatus(config),
      ...(command.exitCode === 0 ? {} : { error: 'School Box did not start cleanly. Check the logs below.' }),
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/schoolbox/stop') {
    const command = await runSchoolBoxCompose('stop', config);
    const statusCode = command.exitCode === 0 ? 200 : 500;
    jsonResponse(res, statusCode, {
      command: summarizeCommandResult(command),
      status: await getSchoolBoxStatus(config),
      ...(command.exitCode === 0 ? {} : { error: 'School Box did not stop cleanly. Check the logs below.' }),
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/schoolbox/logs') {
    jsonResponse(res, 200, getSchoolBoxLogs());
    return;
  }

  jsonResponse(res, 404, { error: 'Unknown desktop runtime endpoint.' });
}

async function handlePublicLanApi(req, res, url) {
  const config = readConfig();
  const origin = getRequestOrigin(req);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    jsonResponse(res, 200, {
      name: 'AlloFlow LAN Share',
      version: VERSION,
      status: 'ok',
      liveSession: await getLiveSessionStatus(config, origin),
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/live-session/status') {
    jsonResponse(res, 200, await getLiveSessionStatus(config, origin));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/lan-session/status') {
    jsonResponse(res, 200, getLanBridgeStatus(config, origin));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/lan-sessions') {
    jsonResponse(res, 403, { error: 'Only the teacher desktop can create LAN class sessions.' });
    return;
  }

  const lanSessionMatch = url.pathname.match(/^\/api\/lan-sessions\/([A-Za-z0-9_-]+)(\/events)?$/);
  // Classroom PIN gate (latched at share start): when a PIN is set, session
  // reads/patches/events from the public listener require it via ?pin= or the
  // x-allo-lan-pin header. Health/status endpoints above stay open — they
  // carry no session content.
  if (lanSessionMatch && !lanPinMatches(url.searchParams.get('pin') || req.headers['x-allo-lan-pin'])) {
    jsonResponse(res, 401, { error: 'This class needs a join PIN. Ask your teacher for it.', pinRequired: true });
    return;
  }
  if (lanSessionMatch) {
    const code = lanSessionMatch[1];
    if (req.method === 'GET' && lanSessionMatch[2] === '/events') {
      serveLanSessionEvents(req, res, code);
      return;
    }
    if (req.method === 'GET') {
      const session = serializeLanSession(sanitizeLanSessionCode(code));
      if (!session) {
        jsonResponse(res, 404, { error: 'Class session not found.' });
        return;
      }
      jsonResponse(res, 200, { session });
      return;
    }
    if (req.method === 'PATCH') {
      const body = await readRequestJson(req);
      const session = updateLanSession(code, body.updates || body.data || {});
      if (!session) {
        jsonResponse(res, 404, { error: 'Class session not found.' });
        return;
      }
      jsonResponse(res, 200, { session });
      return;
    }
    if (req.method === 'DELETE') {
      jsonResponse(res, 403, { error: 'Only the teacher desktop can end LAN class sessions.' });
      return;
    }
  }

  jsonResponse(res, 404, { error: 'Unknown LAN share endpoint.' });
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', getRequestOrigin(req));
      if (url.pathname.startsWith('/api/')) {
        await handleApi(req, res, url);
        return;
      }
      if (url.pathname === '/app') {
        res.writeHead(302, { Location: '/app/' });
        res.end();
        return;
      }
      if (url.pathname.startsWith('/app/')) {
        serveBundledApp(res, url.pathname);
        return;
      }
      const joinMatch = url.pathname.match(/^\/join\/([A-Za-z0-9_-]+)\/?$/);
      if (joinMatch) {
        serveLanJoinPage(res, joinMatch[1], getRequestOrigin(req), url);
        return;
      }
      // Teacher presenter view (projector page) — private runtime only.
      const presentMatch = url.pathname.match(/^\/present\/([A-Za-z0-9_-]+)\/?$/);
      if (presentMatch) {
        servePresenterPage(res, presentMatch[1]);
        return;
      }
      serveStatic(res, url.pathname);
    } catch (error) {
      jsonResponse(res, 500, { error: error.message });
    }
  });
}

function createLanShareServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', getRequestOrigin(req));
      if (url.pathname.startsWith('/api/')) {
        await handlePublicLanApi(req, res, url);
        return;
      }
      if (url.pathname === '/' || url.pathname === '/app') {
        res.writeHead(302, { Location: '/app/' });
        res.end();
        return;
      }
      if (url.pathname.startsWith('/app/')) {
        serveBundledApp(res, url.pathname);
        return;
      }
      const joinMatch = url.pathname.match(/^\/join\/([A-Za-z0-9_-]+)\/?$/);
      if (joinMatch) {
        serveLanJoinPage(res, joinMatch[1], getRequestOrigin(req), url);
        return;
      }
      textResponse(res, 404, 'This AlloFlow LAN share only serves class join links.');
    } catch (error) {
      jsonResponse(res, 500, { error: error.message });
    }
  });
}

function runCheck() {
  const required = [
    path.join(COMMAND_CENTER_DIR, 'index.html'),
    path.join(COMMAND_CENTER_DIR, 'styles.css'),
    path.join(COMMAND_CENTER_DIR, 'command-center.js'),
    path.join(COMMAND_CENTER_DIR, 'vendor', 'qrcode.js'),
    path.join(DESKTOP_ROOT, 'contracts', 'runtime-contract.json'),
  ];
  const missing = required.filter((file) => !fs.existsSync(file));
  if (missing.length) {
    console.error('[AlloFlow Desktop] Missing files:');
    missing.forEach((file) => console.error(' - ' + path.relative(REPO_ROOT, file)));
    process.exitCode = 1;
    return;
  }
  console.log('[AlloFlow Desktop] Check passed');
  console.log('Runtime version: ' + VERSION);
  console.log('Data dir: ' + getDataDir());
  console.log('Config path: ' + getConfigPath());
  console.log('Bundled app build: ' + (hasStaticAppBuild() ? 'found' : 'not built'));
}

async function runSmoke(args) {
  const server = createServer();
  await new Promise((resolve) => server.listen(args.port, args.host, resolve));
  const address = server.address();
  const baseUrl = `http://${args.host}:${address.port}`;
  try {
    const health = await fetch(baseUrl + '/api/health').then((response) => response.json());
    const providers = await fetch(baseUrl + '/api/providers').then((response) => response.json());
    const liveSession = await fetch(baseUrl + '/api/live-session/status').then((response) => response.json());
    const lanCreate = await fetch(baseUrl + '/api/lan-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'SMOKE1', session: { mode: 'sync', roster: {} } }),
    }).then((response) => response.json());
    const lanUpdate = await fetch(baseUrl + '/api/lan-sessions/SMOKE1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: { 'roster.test.status': 'active' } }),
    }).then((response) => response.json());
    const smokeConfig = deepMerge(readConfig(), { liveSession: { lan: { sharePort: 0 } } });
    const share = await startLanShare(smokeConfig);
    const shareUrl = `http://127.0.0.1:${share.port}`;
    const publicSession = await fetch(shareUrl + '/api/lan-sessions/SMOKE1').then((response) => response.json());
    const publicCreateStatus = await fetch(shareUrl + '/api/lan-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'NOPE1', session: {} }),
    }).then((response) => response.status);
    const publicPatch = await fetch(shareUrl + '/api/lan-sessions/SMOKE1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: { 'roster.student.name': 'Learner' } }),
    }).then((response) => response.json());
    const schoolBox = await fetch(baseUrl + '/api/schoolbox/status').then((response) => response.json());
    if (health.status !== 'ok') throw new Error('Health endpoint did not return ok.');
    if (!Array.isArray(providers.providers)) throw new Error('Providers endpoint did not return a provider list.');
    if (!liveSession || !liveSession.mode) throw new Error('Live session endpoint did not return a mode.');
    if (!lanCreate.session || lanCreate.session.id !== 'SMOKE1') throw new Error('LAN session create failed.');
    if (lanUpdate.session?.data?.roster?.test?.status !== 'active') throw new Error('LAN session update failed.');
    if (publicSession.session?.id !== 'SMOKE1') throw new Error('Public LAN share could not read a session.');
    if (publicCreateStatus !== 403) throw new Error('Public LAN share allowed session creation.');
    if (publicPatch.session?.data?.roster?.student?.name !== 'Learner') throw new Error('Public LAN share could not patch a session.');
    if (!schoolBox || !schoolBox.implemented) throw new Error('School Box endpoint did not return implemented status.');
    // ── Classroom PIN gate (latched at share start) ──
    await stopLanShare();
    const pinnedConfig = deepMerge(readConfig(), { liveSession: { lan: { sharePort: 0, pin: 'SMOKE-PIN' } } });
    const pinnedShare = await startLanShare(pinnedConfig);
    const pinnedUrl = `http://127.0.0.1:${pinnedShare.port}`;
    const noPinStatus = await fetch(pinnedUrl + '/api/lan-sessions/SMOKE1').then((response) => response.status);
    const wrongPinStatus = await fetch(pinnedUrl + '/api/lan-sessions/SMOKE1?pin=WRONG').then((response) => response.status);
    const goodPin = await fetch(pinnedUrl + '/api/lan-sessions/SMOKE1?pin=SMOKE-PIN').then((response) => response.json());
    const joinNoPin = await fetch(pinnedUrl + '/join/SMOKE1').then((response) => response.text());
    const joinGoodPin = await fetch(pinnedUrl + '/join/SMOKE1?pin=SMOKE-PIN').then((response) => response.text());
    if (noPinStatus !== 401) throw new Error('PIN gate did not reject a missing pin (got ' + noPinStatus + ').');
    if (wrongPinStatus !== 401) throw new Error('PIN gate did not reject a wrong pin (got ' + wrongPinStatus + ').');
    if (goodPin.session?.id !== 'SMOKE1') throw new Error('PIN gate rejected the correct pin.');
    if (!/name="pin"/.test(joinNoPin)) throw new Error('Join page did not ask for the PIN.');
    if (!/allo_lan_join/.test(joinGoodPin)) throw new Error('Join page with a correct PIN did not serve the app link.');
    console.log('[AlloFlow Desktop] Smoke passed at ' + baseUrl + ' (incl. LAN share isolation + PIN gate)');
  } finally {
    await stopLanShare().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.check) {
    runCheck();
    return;
  }

  if (args.smoke) {
    await runSmoke(args);
    return;
  }

  const server = createServer();
  server.listen(args.port, args.host, () => {
    const address = server.address();
    console.log('[AlloFlow Desktop] Runtime listening on http://' + args.host + ':' + address.port);
    console.log('[AlloFlow Desktop] AlloFlow app URL: ' + getAppUrl(readConfig(), `http://${args.host}:${address.port}`));
  });
}

module.exports = {
  VERSION,
  PROVIDER_PRESETS,
  DEFAULT_CONFIG,
  createLanShareServer,
  createServer,
  getConfigPath,
  getDataDir,
  getAppUrl,
  getLanShareStatus,
  buildDiagnostics,
  configureSecretStorage,
  getManagedAppLogs,
  getManagedAppStatus,
  getLiveSessionStatus,
  getSecretStorageStatus,
  getSchoolBoxLogs,
  getSchoolBoxStatus,
  hasStaticAppBuild,
  parseArgs,
  prepareSchoolBoxEnv,
  readConfig,
  runSchoolBoxCompose,
  runCheck,
  runSmoke,
  startLanShare,
  startManagedApp,
  stopLanShare,
  stopManagedApp,
  writeConfig,
};

if (require.main === module) {
  main().catch((error) => {
    console.error('[AlloFlow Desktop] ' + error.message);
    process.exitCode = 1;
  });
}
