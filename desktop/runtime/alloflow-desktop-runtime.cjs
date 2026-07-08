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
    // Pinned llama.cpp CPU build per-arch when empty (see ENGINE_BINARY_URLS).
    binaryUrl: '',
    // Default model: small enough for a 16GB classroom laptop, good enough for
    // glossaries/leveling/simple generation. Swap via config for bigger boxes
    // (a CUDA/Vulkan llama.cpp binaryUrl + a larger GGUF = the "better
    // computer" path with zero code changes).
    modelUrl: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
    // 0 = auto. The launcher resolves this from the selected model/profile and
    // falls back to 4096 for unknown GGUFs instead of assuming every model is
    // the bundled starter model.
    contextSize: 0,
    threads: 0,
    extraArgs: [],
    cloudFallbackEnabled: false,
  },
  localAsr: {
    // Offline speech-to-text (whisper.cpp whisper-server) for oral-reading
    // fluency PRACTICE — so a student's voice is transcribed ON DEVICE and
    // never leaves the machine (the cloud fluency path sends audio to Gemini).
    // INTEGRITY: this is a practice signal, not a norm-referenced score, and
    // whisper has no child-speech/dialect tuning — the app frames results as
    // teacher-reviewable suggestions, never an automatic reading level.
    enabled: false,
    port: 32176,
    modelDirectory: '',
    // Pinned whisper.cpp CPU build per-arch when empty (see ASR_BINARY_URLS).
    // NOTE: whisper.cpp publishes NO Windows arm64 build — arm64 machines run
    // the x64 binary under Windows emulation (slower but works).
    binaryUrl: '',
    // Default: multilingual base (~148 MB) — small enough for a classroom
    // laptop, covers the 60+ reading languages. Swap for ggml-small.bin /
    // ggml-medium.bin (bigger, more accurate) or a local .bin path via config.
    modelUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    // Spoken language for decoding: 'auto' detects; the app overrides per call.
    language: 'auto',
    threads: 0,
    extraArgs: [],
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
// LAN doc store: chunked session assets (resources manifests, ref:: images)
// written by the teacher app's uploadSessionAssets and read back by student
// hydration. Same in-memory + TTL model as lanSessions; no SSE (read-once).
const lanDocs = new Map();
const MAX_LAN_DOCS = 4000;

// ─── AlloFlow Built-in Engine (managed llama.cpp server) ────────────────────
// "alloflow-local" = a llama-server child process this runtime downloads and
// manages, so classrooms get local text AI without installing Ollama or
// LM Studio. It speaks the OpenAI-compatible API on 127.0.0.1:{port} — the
// app's AIProvider preset for alloflow-local already points there.
const ENGINE_BINARY_URLS = {
  arm64: 'https://github.com/ggml-org/llama.cpp/releases/download/b9878/llama-b9878-bin-win-cpu-arm64.zip',
  x64: 'https://github.com/ggml-org/llama.cpp/releases/download/b9878/llama-b9878-bin-win-cpu-x64.zip',
};
const LOCAL_ENGINE_CONTEXT_FALLBACK = 4096;
const LOCAL_ENGINE_CONTEXT_MIN = 2048;
const LOCAL_ENGINE_CONTEXT_MAX = 131072;
const LOCAL_ENGINE_MODEL_PROFILES = [
  { id: 'alloflow-qwen2.5-3b', match: /qwen2?\.?5.*3b|qwen.*3b/i, contextSize: 4096, safeOutputTokens: 1400, safeJsonOutputTokens: 1100 },
  { id: 'gemma-local', match: /gemma/i, contextSize: 8192, safeOutputTokens: 1800, safeJsonOutputTokens: 1400 },
  { id: 'llama-local', match: /llama|mistral|mixtral/i, contextSize: 8192, safeOutputTokens: 1800, safeJsonOutputTokens: 1400 },
  { id: 'qwen-local', match: /qwen/i, contextSize: 8192, safeOutputTokens: 1800, safeJsonOutputTokens: 1400 },
];
const managedEngine = {
  child: null,
  logs: [],
  phase: 'stopped', // stopped | downloading-binary | downloading-model | starting | running | error
  download: null,   // { file, receivedBytes, totalBytes }
  startPromise: null,
  startedAt: null,
  stoppedAt: null,
  lastError: null,
  binaryPath: null,
  modelPath: null,
  arch: null,
  advisory: null,
  lastProbe: null,
  // Stop-during-start support: a user Stop must cancel in-flight downloads
  // and pre-spawn work, not just kill a live child.
  stopRequested: false,
  abortController: null,
  // Cheap /api/engine/status: binary presence + disk-free are memoized so the
  // 2s UI polls don't run a synchronous directory walk + statfs on the event
  // loop that is simultaneously serving classroom SSE.
  binaryCheckCache: null,
  diskFreeCache: null,
};

function engineUserStopError() {
  const error = new Error('Engine start cancelled by Stop.');
  error.isUserStop = true;
  return error;
}

function throwIfEngineStopRequested() {
  if (managedEngine.stopRequested) throw engineUserStopError();
}

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

// Asset keys come from the app's makeSessionAssetId (sanitized parts joined
// with "_", ≤420 chars, plus "_chunk_N" suffixes). Reject instead of mangle:
// silently rewriting a key would orphan the chunk pointers stored inside
// parent docs.
function sanitizeLanDocKey(value) {
  const key = String(value || '');
  return /^[A-Za-z0-9_-]{1,512}$/.test(key) ? key : '';
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

function compactLanDocs() {
  const now = Date.now();
  for (const [key, entry] of lanDocs.entries()) {
    if (entry.expiresAtMs && entry.expiresAtMs < now) lanDocs.delete(key);
  }
}

function serializeLanDoc(key) {
  compactLanDocs();
  const entry = lanDocs.get(key);
  if (!entry) return null;
  return {
    id: key,
    data: cloneJson(entry.data || {}),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    expiresAt: entry.expiresAt,
  };
}

function upsertLanDoc(key, data, options = {}, config = readConfig()) {
  const cleanKey = sanitizeLanDocKey(key);
  if (!cleanKey) throw new Error('That asset key is not usable (letters, digits, _ and - only).');
  compactLanDocs();
  const existing = lanDocs.get(cleanKey);
  if (!existing && lanDocs.size >= MAX_LAN_DOCS) {
    throw new Error('The LAN asset store is full. End old class sessions or restart sharing to clear it.');
  }
  const now = new Date();
  const live = getLiveSessionConfig(config);
  const ttlMinutes = sanitizePort(live.lan?.ttlMinutes, DEFAULT_CONFIG.liveSession.lan.ttlMinutes);
  const nextData = options.merge && existing
    ? deepMerge(existing.data || {}, data || {})
    : cloneJson(data || {});
  lanDocs.set(cleanKey, {
    data: nextData,
    createdAt: existing?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString(),
    expiresAtMs: now.getTime() + ttlMinutes * 60 * 1000,
  });
  return serializeLanDoc(cleanKey);
}

function deleteLanDoc(key) {
  return lanDocs.delete(sanitizeLanDocKey(key));
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

function appendEngineLog(line) {
  const text = String(line || '').replace(/\r/g, '').trimEnd();
  if (!text) return;
  text.split('\n').forEach((entry) => {
    managedEngine.logs.push({ at: new Date().toISOString(), line: entry.slice(0, 2000) });
  });
  if (managedEngine.logs.length > 250) managedEngine.logs.splice(0, managedEngine.logs.length - 250);
}

function isEngineRunning() {
  return Boolean(managedEngine.child && !managedEngine.child.killed && managedEngine.child.exitCode === null);
}

function getEngineConfig(config = readConfig()) {
  return deepMerge(DEFAULT_CONFIG.localEngine, (config && config.localEngine) || {});
}

function getEngineDir(config) {
  const engine = getEngineConfig(config);
  return engine.modelDirectory || path.join(getDataDir(), 'engine');
}

function engineModelFilePath(config) {
  const engine = getEngineConfig(config);
  if (!engine.modelUrl) return '';
  // A local file path (USB stick, network share, already-downloaded GGUF) is
  // used in place — no download, no copy. Anything that isn't http(s) counts.
  if (!/^https?:\/\//i.test(String(engine.modelUrl))) {
    return path.resolve(String(engine.modelUrl));
  }
  const name = decodeURIComponent(String(engine.modelUrl).split('/').pop().split('?')[0] || '');
  return name ? path.join(getEngineDir(config), 'models', name) : '';
}

function clampEngineNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function engineModelId(engine, modelFile = '') {
  const source = modelFile || engine.modelUrl || '';
  return String(source || '').split(/[\\/]/).pop().replace(/\.gguf(\?.*)?$/i, '').trim();
}

function inferEngineContextFromModelId(modelId) {
  const text = String(modelId || '').toLowerCase();
  const explicit = text.match(/(?:ctx|context|window)[-_ ]?(\d{1,3})k\b/i) || text.match(/\b(\d{1,3})k[-_ ]?(?:ctx|context|window)\b/i);
  if (explicit) return clampEngineNumber(Number(explicit[1]) * 1024, LOCAL_ENGINE_CONTEXT_MIN, LOCAL_ENGINE_CONTEXT_MAX, LOCAL_ENGINE_CONTEXT_FALLBACK);
  const plain = text.match(/\b(16|32|64|128)k\b/i);
  if (plain) return clampEngineNumber(Number(plain[1]) * 1024, LOCAL_ENGINE_CONTEXT_MIN, LOCAL_ENGINE_CONTEXT_MAX, LOCAL_ENGINE_CONTEXT_FALLBACK);
  return null;
}

function getEngineCapability(engine, modelFile = '') {
  const modelId = engineModelId(engine, modelFile);
  const configuredContext = Number(engine.contextSize);
  const rule = LOCAL_ENGINE_MODEL_PROFILES.find((profile) => profile.match.test(modelId)) || null;
  const inferred = inferEngineContextFromModelId(modelId);
  const contextSize = clampEngineNumber(
    configuredContext > 0 ? configuredContext : (inferred || (rule && rule.contextSize)),
    LOCAL_ENGINE_CONTEXT_MIN,
    LOCAL_ENGINE_CONTEXT_MAX,
    LOCAL_ENGINE_CONTEXT_FALLBACK
  );
  const contextSource = configuredContext > 0 ? 'configured' : (inferred ? 'model-name' : (rule ? 'profile' : 'fallback'));
  const safeOutputTokens = clampEngineNumber(rule && rule.safeOutputTokens, 256, Math.min(8192, contextSize), Math.min(1600, Math.max(768, Math.floor(contextSize * 0.28))));
  const safeJsonOutputTokens = clampEngineNumber(rule && rule.safeJsonOutputTokens, 256, safeOutputTokens, Math.min(safeOutputTokens, 1200));
  return {
    profileId: (rule && rule.id) || 'local-default',
    modelId,
    contextSize,
    contextSource,
    safeInputTokens: Math.max(512, Math.floor(contextSize * 0.55)),
    safeOutputTokens,
    safeJsonOutputTokens,
  };
}

async function getFreeDiskBytes(dir) {
  try {
    const stats = await fs.promises.statfs(dir);
    return stats.bavail * stats.bsize;
  } catch (_) {
    return null;
  }
}

function findFileRecursive(dir, name) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return null; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === name.toLowerCase()) return full;
    if (entry.isDirectory()) {
      const found = findFileRecursive(full, name);
      if (found) return found;
    }
  }
  return null;
}

async function downloadEngineFile(url, destination, label) {
  const signal = managedEngine.abortController ? managedEngine.abortController.signal : undefined;
  const response = await fetch(url, { redirect: 'follow', signal });
  if (!response.ok || !response.body) throw new Error(label + ' download failed (HTTP ' + response.status + ').');
  const totalBytes = Number(response.headers.get('content-length')) || 0;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const freeBytes = await getFreeDiskBytes(path.dirname(destination));
  // Teacher laptops run close to full; a 2GB model landing on a 98%-full disk
  // is worse than no model. Require the download size plus real headroom.
  if (freeBytes !== null && totalBytes && freeBytes < totalBytes + 1.5 * 1024 * 1024 * 1024) {
    throw new Error('Not enough disk space for the ' + label + ': it needs ' + Math.round(totalBytes / 1048576) +
      ' MB plus working headroom, but only ' + Math.round(freeBytes / 1048576) + ' MB is free. Free up space, then try again.');
  }
  managedEngine.download = { file: label, receivedBytes: 0, totalBytes };
  const temp = destination + '.download';
  await new Promise((resolveDone, rejectDone) => {
    const output = fs.createWriteStream(temp);
    const reader = require('stream').Readable.fromWeb(response.body);
    reader.on('data', (chunk) => { managedEngine.download.receivedBytes += chunk.length; });
    reader.on('error', rejectDone);
    output.on('error', rejectDone);
    output.on('finish', resolveDone);
    reader.pipe(output);
  });
  fs.renameSync(temp, destination);
  managedEngine.download = null;
}

async function expandEngineZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  await new Promise((resolveDone, rejectDone) => {
    const child = process.platform === 'win32'
      ? spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
          "Expand-Archive -LiteralPath '" + zipPath.replace(/'/g, "''") + "' -DestinationPath '" + destDir.replace(/'/g, "''") + "' -Force"],
          { windowsHide: true })
      : spawn('unzip', ['-o', zipPath, '-d', destDir]);
    child.on('exit', (code) => (code === 0 ? resolveDone() : rejectDone(new Error('Engine archive extraction failed (exit ' + code + ').'))));
    child.on('error', rejectDone);
  });
}

// Windows loader failures for a child that never ran: wrong-format image /
// missing DLL. Seen in practice on ARM64 machines WITHOUT the Microsoft
// Visual C++ ARM64 runtime installed (llama.cpp builds do not bundle it) —
// verified on the Surface Snapdragon 2026-07-05. The x64 build then runs fine
// under Windows ARM emulation, so we fall back to it automatically.
const ENGINE_LOADER_EXIT_CODES = new Set([3221225595 /* 0xC000007B */, 3221225781 /* 0xC0000135 */]);
const ENGINE_ARM64_ADVISORY = 'The native ARM64 engine could not start (this usually means the Microsoft Visual C++ ' +
  'ARM64 runtime is not installed). Using the compatible x64 engine instead — it works but is slower. For full speed, ' +
  'install https://aka.ms/vs/17/release/vc_redist.arm64.exe once, then restart the engine.';

const PRIMARY_ENGINE_ARCH = process.arch === 'arm64' ? 'arm64' : 'x64';

function engineBinarySourceMarker(archDir) {
  return path.join(archDir, 'binary-source.txt');
}

async function ensureEngineBinary(config, arch) {
  const engine = getEngineConfig(config);
  const dir = getEngineDir(config);
  const binaryName = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';
  const archDir = path.join(dir, 'bin', arch);
  // A custom binaryUrl (the documented CUDA/Vulkan "better computer" swap)
  // applies only to the machine's native arch, never the x64 fallback build.
  const url = (arch === PRIMARY_ENGINE_ARCH && engine.binaryUrl) || ENGINE_BINARY_URLS[arch];
  let binary = findFileRecursive(archDir, binaryName);
  if (binary) {
    // The swap must actually take effect: a binary extracted from a different
    // URL than the one now configured gets refreshed instead of reused.
    let extractedFrom = '';
    try { extractedFrom = fs.readFileSync(engineBinarySourceMarker(archDir), 'utf8').trim(); } catch (_) {}
    if (extractedFrom && url && extractedFrom !== url) {
      appendEngineLog('Engine binary URL changed — refreshing the ' + arch + ' binary from ' + url);
      try { fs.rmSync(archDir, { recursive: true, force: true }); } catch (_) {}
      managedEngine.binaryCheckCache = null;
      binary = null;
    }
  }
  if (!binary) {
    if (!url) throw new Error('No engine binary is published for this platform (' + process.platform + '/' + arch + ').');
    throwIfEngineStopRequested();
    managedEngine.phase = 'downloading-binary';
    appendEngineLog('Downloading engine binary (' + arch + '): ' + url);
    const zipPath = path.join(archDir, 'llama-server-download.zip');
    await downloadEngineFile(url, zipPath, 'engine program');
    throwIfEngineStopRequested();
    await expandEngineZip(zipPath, archDir);
    try { fs.unlinkSync(zipPath); } catch (_) {}
    try { fs.writeFileSync(engineBinarySourceMarker(archDir), url + '\n', 'utf8'); } catch (_) {}
    managedEngine.binaryCheckCache = null;
    binary = findFileRecursive(archDir, binaryName);
    if (!binary) throw new Error('llama-server was not found inside the downloaded engine archive.');
  }
  return binary;
}

async function ensureEngineAssets(config, arch) {
  const engine = getEngineConfig(config);
  // Validate the model BEFORE any downloads: an unplugged USB model or a
  // missing URL should fail instantly, not after fetching the binary.
  if (!engine.modelUrl) throw new Error('No AI model URL is configured (localEngine.modelUrl).');
  const modelFile = engineModelFilePath(config);
  const modelIsLocal = !/^https?:\/\//i.test(String(engine.modelUrl));
  if (modelIsLocal && !fs.existsSync(modelFile)) {
    throw new Error('The model file was not found at ' + modelFile +
      '. If it lives on a USB drive or network share, make sure it is connected — or pick a downloadable model instead.');
  }
  const binary = await ensureEngineBinary(config, arch);
  if (!fs.existsSync(modelFile)) {
    throwIfEngineStopRequested();
    managedEngine.phase = 'downloading-model';
    appendEngineLog('Downloading AI model: ' + engine.modelUrl);
    await downloadEngineFile(engine.modelUrl, modelFile, 'AI model');
  }
  throwIfEngineStopRequested();
  managedEngine.binaryPath = binary;
  managedEngine.modelPath = modelFile;
  return { binary, modelFile };
}

async function getLocalEngineStatus(config = readConfig()) {
  const engine = getEngineConfig(config);
  const dir = getEngineDir(config);
  const binaryName = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';
  const now = Date.now();
  let binaryPresent;
  if (managedEngine.binaryPath) {
    binaryPresent = true;
  } else if (managedEngine.binaryCheckCache && now - managedEngine.binaryCheckCache.at < 15000) {
    binaryPresent = managedEngine.binaryCheckCache.present;
  } else {
    binaryPresent = Boolean(findFileRecursive(path.join(dir, 'bin'), binaryName));
    managedEngine.binaryCheckCache = { present: binaryPresent, at: now };
  }
  const modelFile = engineModelFilePath(config);
  let modelBytes = null;
  try { modelBytes = fs.statSync(modelFile).size; } catch (_) {}
  const capability = getEngineCapability(engine, modelFile);
  const running = isEngineRunning();
  // Normalize once: the child's exit handler is the phase's single writer,
  // but a crash between polls can leave 'running' with no child.
  const phase = (!running && managedEngine.phase === 'running') ? 'stopped' : managedEngine.phase;
  return {
    implemented: true,
    phase,
    running: phase === 'running',
    pid: running ? managedEngine.child.pid : null,
    port: engine.port,
    baseUrl: 'http://127.0.0.1:' + engine.port,
    engineDir: dir,
    binaryPresent,
    model: {
      url: engine.modelUrl,
      name: modelFile ? path.basename(modelFile) : '',
      present: Boolean(modelBytes),
      bytes: modelBytes,
    },
    capability,
    download: managedEngine.download,
    diskFreeBytes: await (async () => {
      if (managedEngine.diskFreeCache && now - managedEngine.diskFreeCache.at < 15000) return managedEngine.diskFreeCache.bytes;
      const bytes = await getFreeDiskBytes(getDataDir());
      managedEngine.diskFreeCache = { bytes, at: now };
      return bytes;
    })(),
    startedAt: managedEngine.startedAt,
    stoppedAt: managedEngine.stoppedAt,
    lastError: managedEngine.lastError,
    arch: managedEngine.arch,
    advisory: managedEngine.advisory,
    lastProbe: managedEngine.lastProbe,
    taskSupport: buildEngineProbeTaskSupport(managedEngine.lastProbe || {}),
    cloudFallbackEnabled: Boolean(engine.cloudFallbackEnabled),
  };
}

function cleanEngineProbeJson(text) {
  return String(text || '')
    .replace(/```(?:json|javascript|js)?/gi, '')
    .replace(/```/g, '')
    .trim();
}

function parseEngineProbeJson(text) {
  const cleaned = cleanEngineProbeJson(text);
  try { return JSON.parse(cleaned); } catch (_) {}
  const firstObj = cleaned.indexOf('{');
  const lastObj = cleaned.lastIndexOf('}');
  if (firstObj >= 0 && lastObj > firstObj) {
    try { return JSON.parse(cleaned.slice(firstObj, lastObj + 1)); } catch (_) {}
  }
  const firstArr = cleaned.indexOf('[');
  const lastArr = cleaned.lastIndexOf(']');
  if (firstArr >= 0 && lastArr > firstArr) {
    try { return JSON.parse(cleaned.slice(firstArr, lastArr + 1)); } catch (_) {}
  }
  return null;
}

async function fetchEngineJson(url, body, timeoutMs = 25000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch (_) {}
    if (!response.ok) {
      const message = data && data.error
        ? (typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error))
        : text.slice(0, 240);
      throw new Error('HTTP ' + response.status + ': ' + message);
    }
    return data || {};
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveEngineApiModel(status) {
  try {
    const response = await fetch(status.baseUrl + '/v1/models', { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const data = await response.json();
      const first = Array.isArray(data.data) && data.data[0] ? data.data[0] : null;
      if (first && first.id) return String(first.id);
    }
  } catch (_) {}
  return status.capability?.modelId || status.model?.name || 'local-model';
}

function engineProbeResult(id, label, startedAt, ok, detail, rawContent = '', parsed = null) {
  return {
    id,
    label,
    ok: Boolean(ok),
    latencyMs: Date.now() - startedAt,
    detail: detail || '',
    preview: String(rawContent || '').replace(/\s+/g, ' ').trim().slice(0, 220),
    parsedShape: parsed && typeof parsed === 'object'
      ? (Array.isArray(parsed) ? 'array[' + parsed.length + ']' : 'object{' + Object.keys(parsed).slice(0, 8).join(',') + '}')
      : '',
  };
}

function engineProbeTestState(probe, id) {
  if (!probe || !Array.isArray(probe.tests) || probe.tests.length === 0) return 'unknown';
  const test = probe.tests.find((item) => item && item.id === id);
  if (!test) return 'unknown';
  return test.ok ? 'pass' : 'fail';
}

function buildEngineProbeTaskSupport(probe = {}) {
  const tests = Array.isArray(probe.tests) ? probe.tests : [];
  return {
    status: probe.status === 'not-running' ? 'unavailable' : (probe.status || 'unknown'),
    generatedAt: probe.generatedAt || '',
    passed: tests.filter((test) => test && test.ok).length,
    total: tests.length,
    simpleText: engineProbeTestState(probe, 'plain-text'),
    strictJson: engineProbeTestState(probe, 'strict-json'),
    remediationJson: engineProbeTestState(probe, 'remediation-shape'),
  };
}

function attachEngineProbeTaskSupport(probe) {
  if (!probe || typeof probe !== 'object') return probe;
  probe.taskSupport = buildEngineProbeTaskSupport(probe);
  return probe;
}

async function runEngineCompletionProbe(status, model, test) {
  const startedAt = Date.now();
  try {
    const data = await fetchEngineJson(status.baseUrl + '/v1/chat/completions', {
      model,
      messages: [
        { role: 'system', content: test.system || 'You are a concise local model diagnostic.' },
        { role: 'user', content: test.prompt },
      ],
      temperature: 0,
      max_tokens: test.maxTokens || 128,
      ...(test.json ? { response_format: { type: 'json_object' } } : {}),
    }, test.timeoutMs || 25000);
    const content = data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || '')
      : '';
    const parsed = test.json ? parseEngineProbeJson(content) : null;
    const ok = test.expect(content, parsed);
    return engineProbeResult(test.id, test.label, startedAt, ok, ok ? 'passed' : test.failure, content, parsed);
  } catch (error) {
    return engineProbeResult(test.id, test.label, startedAt, false, error.name === 'AbortError' ? 'timed out' : error.message);
  }
}

async function runLocalEngineProbe(config = readConfig()) {
  const status = await getLocalEngineStatus(config);
  if (!status.running) {
    const result = {
      implemented: true,
      running: false,
      status: 'not-running',
      summary: 'Start the built-in engine before running the local model check.',
      engine: {
        phase: status.phase,
        baseUrl: status.baseUrl,
        model: status.model,
        capability: status.capability,
      },
      tests: [],
      generatedAt: new Date().toISOString(),
    };
    attachEngineProbeTaskSupport(result);
    managedEngine.lastProbe = result;
    return result;
  }
  const model = await resolveEngineApiModel(status);
  const tests = [
    {
      id: 'plain-text',
      label: 'Plain text response',
      prompt: 'Reply with exactly this lowercase word and nothing else: ready',
      maxTokens: 16,
      failure: 'Expected the word "ready".',
      expect: (content) => /^ready[.!]?\s*$/i.test(String(content || '').trim()),
    },
    {
      id: 'strict-json',
      label: 'Strict JSON response',
      json: true,
      prompt: 'Return ONLY valid JSON with this exact shape: {"ok":true,"steps":["read","plan","write"],"score":3}',
      maxTokens: 120,
      failure: 'Expected parseable JSON with ok=true and 3 steps.',
      expect: (_content, parsed) => Boolean(parsed && parsed.ok === true && Array.isArray(parsed.steps) && parsed.steps.length === 3),
    },
    {
      id: 'remediation-shape',
      label: 'Remediation JSON shape',
      json: true,
      prompt: 'You are checking a short accessibility remediation task. Return ONLY valid JSON with this shape: {"issues":[{"id":"contrast","severity":"medium","fix":"Increase text contrast"}],"summary":"ready"}. Use exactly one issue.',
      maxTokens: 512,
      failure: 'Expected a remediation-style JSON object with one issue and a summary.',
      expect: (_content, parsed) => Boolean(parsed && Array.isArray(parsed.issues) && parsed.issues.length === 1 && parsed.issues[0].id && parsed.issues[0].fix && parsed.summary),
    },
  ];
  const results = [];
  for (const test of tests) {
    results.push(await runEngineCompletionProbe(status, model, test));
  }
  const passed = results.filter((test) => test.ok).length;
  const result = {
    implemented: true,
    running: true,
    status: passed === results.length ? 'pass' : (passed > 0 ? 'partial' : 'fail'),
    summary: passed + '/' + results.length + ' local model checks passed.',
    model,
    engine: {
      phase: status.phase,
      baseUrl: status.baseUrl,
      model: status.model,
      capability: status.capability,
      arch: status.arch,
    },
    tests: results,
    generatedAt: new Date().toISOString(),
  };
  attachEngineProbeTaskSupport(result);
  managedEngine.lastProbe = result;
  return result;
}

async function launchEngineProcess(config, arch) {
  const engine = getEngineConfig(config);
  const { binary, modelFile } = await ensureEngineAssets(config, arch);
  // Port preflight: if something already answers /health here (an orphaned
  // llama-server from a crash, or another app), our child would die on bind
  // while the health poll below happily got 200 from the impostor — the
  // status would claim success for a process that is not ours.
  try {
    const squatter = await fetch('http://127.0.0.1:' + engine.port + '/health');
    if (squatter.ok) {
      throw Object.assign(new Error('Port ' + engine.port + ' is already in use — probably an engine left over from an earlier session. ' +
        'Close it (Task Manager: llama-server.exe) or change localEngine.port, then start again.'), { isPortSquatter: true });
    }
  } catch (error) {
    if (error.isPortSquatter) throw error;
    /* nothing listening — good */
  }
  managedEngine.phase = 'starting';
  managedEngine.arch = arch;
  const capability = getEngineCapability(engine, modelFile);
  appendEngineLog('Starting llama-server (' + arch + ') on 127.0.0.1:' + engine.port + ' with ' + path.basename(modelFile) +
    ' (ctx ' + capability.contextSize + ', ' + capability.contextSource + ')');
  const args = ['-m', modelFile, '--host', '127.0.0.1', '--port', String(engine.port),
    '-c', String(capability.contextSize), '--no-webui'];
  if (engine.threads) args.push('-t', String(engine.threads));
  (Array.isArray(engine.extraArgs) ? engine.extraArgs : []).forEach((arg) => args.push(String(arg)));
  let exitCode = null;
  const child = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  managedEngine.child = child;
  managedEngine.startedAt = new Date().toISOString();
  child.stdout.on('data', (data) => appendEngineLog(data));
  child.stderr.on('data', (data) => appendEngineLog(data));
  child.on('exit', (code) => {
    exitCode = code;
    appendEngineLog('llama-server exited with code ' + code);
    managedEngine.child = null;
    managedEngine.stoppedAt = new Date().toISOString();
    if (managedEngine.phase !== 'stopped') managedEngine.phase = code === 0 ? 'stopped' : 'error';
  });
  child.on('error', (error) => {
    managedEngine.lastError = error.message;
    appendEngineLog('spawn error: ' + error.message);
  });
  // Model load is mmap-backed but can still take a while on first touch.
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (managedEngine.stopRequested) {
      try { child.kill(); } catch (_) {}
      throw engineUserStopError();
    }
    if (!isEngineRunning()) {
      if (exitCode !== null && ENGINE_LOADER_EXIT_CODES.has(exitCode >>> 0)) return { loaderFailure: true, exitCode };
      throw new Error(managedEngine.lastError || 'The engine process exited during startup — see /api/engine/logs.');
    }
    try {
      const health = await fetch('http://127.0.0.1:' + engine.port + '/health');
      if (health.ok) {
        managedEngine.phase = 'running';
        appendEngineLog('Engine is healthy and serving the OpenAI-compatible API (' + arch + ').');
        return { loaderFailure: false };
      }
    } catch (_) { /* not up yet */ }
    await new Promise((resolveDone) => setTimeout(resolveDone, 1000));
  }
  throw new Error('The engine did not become healthy within 120 seconds — see /api/engine/logs.');
}

async function startLocalEngine(config = readConfig()) {
  if (isEngineRunning() || managedEngine.startPromise) return managedEngine.startPromise || Promise.resolve();
  managedEngine.lastError = null;
  managedEngine.advisory = null;
  managedEngine.stopRequested = false;
  managedEngine.abortController = new AbortController();
  managedEngine.startPromise = (async () => {
    try {
      const primaryArch = process.arch === 'arm64' ? 'arm64' : 'x64';
      const attempt = await launchEngineProcess(config, primaryArch);
      if (attempt.loaderFailure && primaryArch === 'arm64') {
        managedEngine.advisory = ENGINE_ARM64_ADVISORY;
        appendEngineLog(ENGINE_ARM64_ADVISORY);
        const fallback = await launchEngineProcess(config, 'x64');
        if (fallback.loaderFailure) {
          throw new Error('Neither the ARM64 nor the x64 engine could start on this machine — see /api/engine/logs.');
        }
      } else if (attempt.loaderFailure) {
        throw new Error('The engine binary could not be loaded by Windows (exit ' + attempt.exitCode + ') — see /api/engine/logs.');
      }
    } catch (error) {
      managedEngine.download = null;
      const userStop = error.isUserStop || managedEngine.stopRequested || error.name === 'AbortError';
      if (userStop) {
        // A user-requested Stop is a clean outcome, never an error state.
        managedEngine.phase = 'stopped';
        managedEngine.lastError = null;
        appendEngineLog('Start cancelled by Stop.');
        if (isEngineRunning()) { try { managedEngine.child.kill(); } catch (_) {} }
        return;
      }
      managedEngine.lastError = error.message;
      managedEngine.phase = 'error';
      appendEngineLog('ERROR: ' + error.message);
      if (isEngineRunning()) { try { managedEngine.child.kill(); } catch (_) {} }
      throw error;
    } finally {
      managedEngine.startPromise = null;
      managedEngine.abortController = null;
    }
  })();
  return managedEngine.startPromise;
}

async function stopLocalEngine(config = readConfig()) {
  // Cancel any in-flight start first: abort active downloads and flag the
  // pre-spawn steps + health wait to bail out quietly.
  managedEngine.stopRequested = true;
  if (managedEngine.abortController) { try { managedEngine.abortController.abort(); } catch (_) {} }
  if (!isEngineRunning()) {
    if (!managedEngine.startPromise) managedEngine.phase = 'stopped';
    managedEngine.download = null;
    return getLocalEngineStatus(config);
  }
  const child = managedEngine.child;
  managedEngine.phase = 'stopped';
  appendEngineLog('Stopping the built-in engine.');
  if (process.platform === 'win32') {
    await new Promise((resolveDone) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
      killer.on('exit', resolveDone);
      killer.on('error', resolveDone);
    });
  } else {
    try { child.kill('SIGTERM'); } catch (_) {}
  }
  managedEngine.child = null;
  managedEngine.stoppedAt = new Date().toISOString();
  return getLocalEngineStatus(config);
}

// ─── AlloFlow Offline ASR (managed whisper.cpp whisper-server) ──────────────
// "localAsr" = a whisper-server child this runtime downloads and manages, so
// oral-reading-fluency practice can transcribe a student's recording ON THE
// DEVICE instead of sending the audio to Gemini. Speaks whisper.cpp's HTTP API
// (POST /inference, multipart) on 127.0.0.1:{port}. Cloned from the llama.cpp
// engine subsystem above; the one real difference is that whisper.cpp ships NO
// Windows arm64 build, so on arm64 we run the x64 binary under emulation.
const ASR_BINARY_URLS = {
  // whisper.cpp v1.9.1 Windows x64 CPU zip (contains whisper-server.exe + DLLs).
  x64: 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.1/whisper-bin-x64.zip',
};
const managedAsr = {
  child: null,
  logs: [],
  phase: 'stopped', // stopped | downloading-binary | downloading-model | starting | running | error
  download: null,
  startPromise: null,
  startedAt: null,
  stoppedAt: null,
  lastError: null,
  binaryPath: null,
  modelPath: null,
  arch: null,
  stopRequested: false,
  abortController: null,
  binaryCheckCache: null,
};

function asrUserStopError() {
  const error = new Error('ASR start cancelled by Stop.');
  error.isUserStop = true;
  return error;
}
function throwIfAsrStopRequested() {
  if (managedAsr.stopRequested) throw asrUserStopError();
}
function appendAsrLog(line) {
  const text = String(line || '').replace(/\r/g, '').trimEnd();
  if (!text) return;
  text.split('\n').forEach((entry) => {
    managedAsr.logs.push({ at: new Date().toISOString(), line: entry.slice(0, 2000) });
  });
  if (managedAsr.logs.length > 250) managedAsr.logs.splice(0, managedAsr.logs.length - 250);
}
function isAsrRunning() {
  return Boolean(managedAsr.child && !managedAsr.child.killed && managedAsr.child.exitCode === null);
}
function getAsrConfig(config = readConfig()) {
  return deepMerge(DEFAULT_CONFIG.localAsr, (config && config.localAsr) || {});
}
function getAsrDir(config) {
  const asr = getAsrConfig(config);
  return asr.modelDirectory || path.join(getDataDir(), 'asr');
}
function asrModelFilePath(config) {
  const asr = getAsrConfig(config);
  if (!asr.modelUrl) return '';
  if (!/^https?:\/\//i.test(String(asr.modelUrl))) return path.resolve(String(asr.modelUrl));
  const name = decodeURIComponent(String(asr.modelUrl).split('/').pop().split('?')[0] || '');
  return name ? path.join(getAsrDir(config), 'models', name) : '';
}
function asrBinarySourceMarker(archDir) {
  return path.join(archDir, 'binary-source.txt');
}

// whisper.cpp has only an x64 Windows build; arm64 runs it under emulation.
const PRIMARY_ASR_ARCH = 'x64';

// Reuses the generic download primitive shape but writes progress into
// managedAsr.download (downloadEngineFile is coupled to managedEngine state).
async function downloadAsrFile(url, destination, label) {
  const signal = managedAsr.abortController ? managedAsr.abortController.signal : undefined;
  const response = await fetch(url, { redirect: 'follow', signal });
  if (!response.ok || !response.body) throw new Error(label + ' download failed (HTTP ' + response.status + ').');
  const totalBytes = Number(response.headers.get('content-length')) || 0;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const freeBytes = await getFreeDiskBytes(path.dirname(destination));
  if (freeBytes !== null && totalBytes && freeBytes < totalBytes + 1.5 * 1024 * 1024 * 1024) {
    throw new Error('Not enough disk space for the ' + label + ': it needs ' + Math.round(totalBytes / 1048576) +
      ' MB plus working headroom, but only ' + Math.round(freeBytes / 1048576) + ' MB is free. Free up space, then try again.');
  }
  managedAsr.download = { file: label, receivedBytes: 0, totalBytes };
  const temp = destination + '.download';
  await new Promise((resolveDone, rejectDone) => {
    const output = fs.createWriteStream(temp);
    const reader = require('stream').Readable.fromWeb(response.body);
    reader.on('data', (chunk) => { managedAsr.download.receivedBytes += chunk.length; });
    reader.on('error', rejectDone);
    output.on('error', rejectDone);
    output.on('finish', resolveDone);
    reader.pipe(output);
  });
  fs.renameSync(temp, destination);
  managedAsr.download = null;
}

async function ensureAsrBinary(config, arch) {
  const asr = getAsrConfig(config);
  const dir = getAsrDir(config);
  const binaryName = process.platform === 'win32' ? 'whisper-server.exe' : 'whisper-server';
  const archDir = path.join(dir, 'bin', arch);
  const url = (arch === PRIMARY_ASR_ARCH && asr.binaryUrl) || ASR_BINARY_URLS[arch];
  let binary = findFileRecursive(archDir, binaryName);
  if (binary) {
    let extractedFrom = '';
    try { extractedFrom = fs.readFileSync(asrBinarySourceMarker(archDir), 'utf8').trim(); } catch (_) {}
    if (extractedFrom && url && extractedFrom !== url) {
      appendAsrLog('ASR binary URL changed — refreshing the ' + arch + ' binary from ' + url);
      try { fs.rmSync(archDir, { recursive: true, force: true }); } catch (_) {}
      managedAsr.binaryCheckCache = null;
      binary = null;
    }
  }
  if (!binary) {
    if (!url) throw new Error('No ASR binary is published for this platform (' + process.platform + '/' + arch + ').');
    throwIfAsrStopRequested();
    managedAsr.phase = 'downloading-binary';
    appendAsrLog('Downloading ASR binary (' + arch + '): ' + url);
    const zipPath = path.join(archDir, 'whisper-server-download.zip');
    await downloadAsrFile(url, zipPath, 'speech-to-text program');
    throwIfAsrStopRequested();
    await expandEngineZip(zipPath, archDir);
    try { fs.unlinkSync(zipPath); } catch (_) {}
    try { fs.writeFileSync(asrBinarySourceMarker(archDir), url + '\n', 'utf8'); } catch (_) {}
    managedAsr.binaryCheckCache = null;
    binary = findFileRecursive(archDir, binaryName);
    if (!binary) throw new Error('whisper-server was not found inside the downloaded ASR archive.');
  }
  return binary;
}

async function ensureAsrAssets(config, arch) {
  const asr = getAsrConfig(config);
  if (!asr.modelUrl) throw new Error('No speech model URL is configured (localAsr.modelUrl).');
  const modelFile = asrModelFilePath(config);
  const modelIsLocal = !/^https?:\/\//i.test(String(asr.modelUrl));
  if (modelIsLocal && !fs.existsSync(modelFile)) {
    throw new Error('The speech model file was not found at ' + modelFile +
      '. If it lives on a USB drive or network share, make sure it is connected — or pick a downloadable model instead.');
  }
  const binary = await ensureAsrBinary(config, arch);
  if (!fs.existsSync(modelFile)) {
    throwIfAsrStopRequested();
    managedAsr.phase = 'downloading-model';
    appendAsrLog('Downloading speech model: ' + asr.modelUrl);
    await downloadAsrFile(asr.modelUrl, modelFile, 'speech model');
  }
  throwIfAsrStopRequested();
  managedAsr.binaryPath = binary;
  managedAsr.modelPath = modelFile;
  return { binary, modelFile };
}

async function getLocalAsrStatus(config = readConfig()) {
  const asr = getAsrConfig(config);
  const dir = getAsrDir(config);
  const binaryName = process.platform === 'win32' ? 'whisper-server.exe' : 'whisper-server';
  const now = Date.now();
  let binaryPresent;
  if (managedAsr.binaryPath) {
    binaryPresent = true;
  } else if (managedAsr.binaryCheckCache && now - managedAsr.binaryCheckCache.at < 15000) {
    binaryPresent = managedAsr.binaryCheckCache.present;
  } else {
    binaryPresent = Boolean(findFileRecursive(path.join(dir, 'bin'), binaryName));
    managedAsr.binaryCheckCache = { present: binaryPresent, at: now };
  }
  const modelFile = asrModelFilePath(config);
  let modelBytes = null;
  try { modelBytes = fs.statSync(modelFile).size; } catch (_) {}
  const running = isAsrRunning();
  const phase = (!running && managedAsr.phase === 'running') ? 'stopped' : managedAsr.phase;
  return {
    implemented: true,
    phase,
    running: phase === 'running',
    pid: running ? managedAsr.child.pid : null,
    port: asr.port,
    baseUrl: 'http://127.0.0.1:' + asr.port,
    inferenceUrl: 'http://127.0.0.1:' + asr.port + '/inference',
    // Same-origin transcription proxy (POST /api/asr/transcribe). Clients
    // prefer this over inferenceUrl so cross-port CORS never enters the
    // picture; its presence in status is the capability signal.
    proxyUrl: '/api/asr/transcribe',
    asrDir: dir,
    binaryPresent,
    model: { url: asr.modelUrl, name: modelFile ? path.basename(modelFile) : '', present: Boolean(modelBytes), bytes: modelBytes },
    download: managedAsr.download,
    startedAt: managedAsr.startedAt,
    stoppedAt: managedAsr.stoppedAt,
    lastError: managedAsr.lastError,
    arch: managedAsr.arch,
  };
}

async function launchAsrProcess(config, arch) {
  const asr = getAsrConfig(config);
  const { binary, modelFile } = await ensureAsrAssets(config, arch);
  // Port preflight: whisper-server has no /health, so probe the root page —
  // if anything already answers here, don't let a poll mistake it for ours.
  try {
    const squatter = await fetch('http://127.0.0.1:' + asr.port + '/');
    if (squatter.ok) {
      throw Object.assign(new Error('Port ' + asr.port + ' is already in use — probably a whisper-server left over from an earlier session. ' +
        'Close it (Task Manager: whisper-server.exe) or change localAsr.port, then start again.'), { isPortSquatter: true });
    }
  } catch (error) {
    if (error.isPortSquatter) throw error;
    /* nothing listening — good */
  }
  managedAsr.phase = 'starting';
  managedAsr.arch = arch;
  appendAsrLog('Starting whisper-server (' + arch + ') on 127.0.0.1:' + asr.port + ' with ' + path.basename(modelFile));
  const args = ['-m', modelFile, '--host', '127.0.0.1', '--port', String(asr.port), '--inference-path', '/inference', '--convert'];
  if (asr.language && String(asr.language).trim()) args.push('-l', String(asr.language).trim());
  if (asr.threads) args.push('-t', String(asr.threads));
  (Array.isArray(asr.extraArgs) ? asr.extraArgs : []).forEach((arg) => args.push(String(arg)));
  let exitCode = null;
  const child = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  managedAsr.child = child;
  managedAsr.startedAt = new Date().toISOString();
  child.stdout.on('data', (data) => appendAsrLog(data));
  child.stderr.on('data', (data) => appendAsrLog(data));
  child.on('exit', (code) => {
    exitCode = code;
    appendAsrLog('whisper-server exited with code ' + code);
    managedAsr.child = null;
    managedAsr.stoppedAt = new Date().toISOString();
    if (managedAsr.phase !== 'stopped') managedAsr.phase = code === 0 ? 'stopped' : 'error';
  });
  child.on('error', (error) => {
    managedAsr.lastError = error.message;
    appendAsrLog('spawn error: ' + error.message);
  });
  // whisper-server loads the model then serves; the root page answers when up.
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (managedAsr.stopRequested) { try { child.kill(); } catch (_) {} throw asrUserStopError(); }
    if (!isAsrRunning()) {
      if (exitCode !== null && ENGINE_LOADER_EXIT_CODES.has(exitCode >>> 0)) return { loaderFailure: true, exitCode };
      throw new Error(managedAsr.lastError || 'The whisper-server process exited during startup — see /api/asr/logs.');
    }
    try {
      const probe = await fetch('http://127.0.0.1:' + asr.port + '/');
      if (probe.ok) {
        managedAsr.phase = 'running';
        appendAsrLog('ASR is healthy and serving /inference (' + arch + ').');
        return { loaderFailure: false };
      }
    } catch (_) { /* not up yet */ }
    await new Promise((resolveDone) => setTimeout(resolveDone, 1000));
  }
  throw new Error('The ASR server did not become healthy within 120 seconds — see /api/asr/logs.');
}

async function startLocalAsr(config = readConfig()) {
  if (isAsrRunning() || managedAsr.startPromise) return managedAsr.startPromise || Promise.resolve();
  managedAsr.lastError = null;
  managedAsr.stopRequested = false;
  managedAsr.abortController = new AbortController();
  managedAsr.startPromise = (async () => {
    try {
      // whisper.cpp ships only x64 on Windows; arm64 runs it under emulation.
      const attempt = await launchAsrProcess(config, PRIMARY_ASR_ARCH);
      if (attempt.loaderFailure) {
        // 0xC0000135 = STATUS_DLL_NOT_FOUND. whisper.cpp release builds link
        // the VC++ CRT DYNAMICALLY (unlike llama.cpp's static builds), so a
        // machine without the x64 VC++ redistributable — common on clean
        // installs and on ARM64 Windows, where x64 System32 copies only
        // arrive via the x64 redist — fails exactly here. Diagnosed by PE
        // import parse on 2026-07-06 (imports MSVCP140/VCRUNTIME140/_1).
        // Policy: never silent-install the redist; say precisely what to do.
        if (attempt.exitCode === 3221225781) {
          throw new Error('Windows is missing the free Microsoft VC++ x64 runtime the speech engine needs. '
            + 'Install it once from https://aka.ms/vs/17/release/vc_redist.x64.exe (about 25 MB), then press Retry.');
        }
        throw new Error('The whisper-server binary could not be loaded by Windows (exit ' + attempt.exitCode + ') — see /api/asr/logs.');
      }
    } catch (error) {
      managedAsr.download = null;
      const userStop = error.isUserStop || managedAsr.stopRequested || error.name === 'AbortError';
      if (userStop) {
        managedAsr.phase = 'stopped';
        managedAsr.lastError = null;
        appendAsrLog('Start cancelled by Stop.');
        if (isAsrRunning()) { try { managedAsr.child.kill(); } catch (_) {} }
        return;
      }
      managedAsr.lastError = error.message;
      managedAsr.phase = 'error';
      appendAsrLog('ERROR: ' + error.message);
      if (isAsrRunning()) { try { managedAsr.child.kill(); } catch (_) {} }
      throw error;
    } finally {
      managedAsr.startPromise = null;
      managedAsr.abortController = null;
    }
  })();
  return managedAsr.startPromise;
}

async function stopLocalAsr(config = readConfig()) {
  managedAsr.stopRequested = true;
  if (managedAsr.abortController) { try { managedAsr.abortController.abort(); } catch (_) {} }
  if (!isAsrRunning()) {
    if (!managedAsr.startPromise) managedAsr.phase = 'stopped';
    managedAsr.download = null;
    return getLocalAsrStatus(config);
  }
  const child = managedAsr.child;
  managedAsr.phase = 'stopped';
  appendAsrLog('Stopping the offline speech-to-text server.');
  if (process.platform === 'win32') {
    await new Promise((resolveDone) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
      killer.on('exit', resolveDone);
      killer.on('error', resolveDone);
    });
  } else {
    try { child.kill('SIGTERM'); } catch (_) {}
  }
  managedAsr.child = null;
  managedAsr.stoppedAt = new Date().toISOString();
  return getLocalAsrStatus(config);
}

// Autostart mirror: warm the ASR server with the desktop once a teacher has
// chosen it (localAsr.enabled, persisted by POST /api/asr/start) AND the model
// is already on disk. Never on a fresh config, never mid-download.
function maybeAutostartAsr(config = readConfig()) {
  if (getAsrConfig(config).enabled && fs.existsSync(asrModelFilePath(config))) {
    console.log('[AlloFlow Desktop] Offline ASR enabled and model present — starting it.');
    return startLocalAsr(config).catch((error) => console.warn('[AlloFlow Desktop] ASR autostart failed:', error.message));
  }
  return Promise.resolve();
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
  // Node's fetch resolves `localhost` IPv6-first (::1); our managed servers
  // (llama-server, whisper-server) bind IPv4 127.0.0.1 only — so probing the
  // preset URLs reported a RUNNING engine as "offline" in the provider list
  // while the engine panel (managed status) said running. Field-caught
  // 2026-07-06. Normalize for the probe only; the stored config is untouched.
  url = String(url).replace(/^(https?:\/\/)localhost([:/])/i, '$1127.0.0.1$2');

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

  // Same localhost→127.0.0.1 normalization as probeUrl (IPv6-first fetch vs
  // IPv4-bound local servers) — the models list request must match the probe.
  const modelsUrl = String(provider.baseUrl + provider.modelsPath).replace(/^(https?:\/\/)localhost([:/])/i, '$1127.0.0.1$2');
  const probe = await probeUrl(modelsUrl);
  let models = [];
  if (probe.reachable && typeof fetch === 'function') {
    try {
      const response = await fetch(modelsUrl, { headers: { Accept: 'application/json' } });
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

function readinessStateRank(state) {
  return ({ ok: 0, busy: 1, warn: 2, err: 3 })[state] ?? 2;
}

function readinessItem(id, label, state, summary, nextAction, details = {}) {
  return {
    id,
    label,
    state,
    summary,
    nextAction: nextAction || '',
    details,
  };
}

async function buildReadinessReport(config = readConfig(), origin = getDefaultRuntimeOrigin()) {
  const [providers, schoolBox, liveSession, engine, asr] = await Promise.all([
    getProviderStatuses(config),
    getSchoolBoxStatus(config),
    getLiveSessionStatus(config, origin),
    getLocalEngineStatus(config),
    getLocalAsrStatus(config),
  ]);
  const appProbe = await probeUrl(getAppUrl(config, origin), 900);
  const app = buildManagedAppStatus(config, appProbe, origin);
  const selectedProvider = providers.find((provider) => provider.selected) || providers.find((provider) => provider.id === config.selectedProvider);
  const sections = [];

  sections.push(readinessItem(
    'app',
    'AlloFlow app',
    app.reachable ? 'ok' : 'warn',
    app.reachable ? 'The app is reachable from Desktop.' : 'The app is not reachable yet.',
    app.reachable ? '' : (app.managed ? 'Start the Desktop-managed app.' : 'Check the app URL or start the web app.'),
    { appUrl: getAppUrl(config, origin), status: app.status, pid: app.pid || null }
  ));

  const providerReady = selectedProvider && (selectedProvider.status === 'configured' || selectedProvider.status === 'available');
  sections.push(readinessItem(
    'provider',
    'Selected AI provider',
    providerReady ? 'ok' : 'warn',
    selectedProvider
      ? selectedProvider.label + ' is ' + (selectedProvider.status || 'unknown') + '.'
      : 'No selected provider was found.',
    providerReady ? '' : 'Choose a reachable local provider, start the built-in engine, or add a cloud API key.',
    selectedProvider ? {
      id: selectedProvider.id,
      status: selectedProvider.status,
      reachable: selectedProvider.reachable,
      hasKey: selectedProvider.hasKey,
      modelCount: selectedProvider.modelCount,
    } : {}
  ));

  let engineState = 'warn';
  let engineSummary = 'Built-in local text AI is not running.';
  let engineAction = 'Start the built-in engine if you want local text generation.';
  if (engine.running) {
    engineState = 'ok';
    engineSummary = 'Built-in local text AI is running.';
    engineAction = '';
  } else if (engine.lastError) {
    engineState = 'err';
    engineSummary = engine.lastError;
    engineAction = 'Open the AI tab and retry after resolving the error.';
  } else if (engine.download) {
    engineState = 'busy';
    engineSummary = 'Built-in local text AI is downloading ' + engine.download.file + '.';
    engineAction = 'Keep Desktop open until the download finishes.';
  } else if (engine.model && engine.model.present) {
    engineSummary = 'Built-in local text AI model is downloaded but stopped.';
    engineAction = 'Start the engine when local generation is needed.';
  }
  sections.push(readinessItem('local-engine', 'Built-in AI engine', engineState, engineSummary, engineAction, {
    phase: engine.phase,
    running: engine.running,
    model: engine.model,
    capability: engine.capability,
    arch: engine.arch,
    lastProbe: engine.lastProbe,
    taskSupport: engine.taskSupport,
    cloudFallbackEnabled: engine.cloudFallbackEnabled,
  }));

  if (engine.lastProbe) {
    const probe = engine.lastProbe;
    const probeState = probe.status === 'pass'
      ? 'ok'
      : (probe.status === 'fail' ? 'err' : 'warn');
    sections.push(readinessItem(
      'local-model-probe',
      'Local model check',
      probeState,
      probe.summary || 'Local model check has run.',
      probe.status === 'pass'
        ? ''
        : (probe.status === 'not-running' ? 'Start the built-in engine, then run Check local model.' : 'Use the probe details to decide whether this model should handle JSON-heavy local tasks.'),
      {
        status: probe.status,
        generatedAt: probe.generatedAt,
        model: probe.model || '',
        taskSupport: probe.taskSupport || buildEngineProbeTaskSupport(probe),
        tests: Array.isArray(probe.tests) ? probe.tests.map((test) => ({
          id: test.id,
          label: test.label,
          ok: test.ok,
          latencyMs: test.latencyMs,
          detail: test.detail,
          parsedShape: test.parsedShape,
        })) : [],
      }
    ));
  }

  let asrState = 'warn';
  let asrSummary = 'Offline speech-to-text is off.';
  let asrAction = 'Enable speech-to-text if reading practice should stay fully on device.';
  if (asr.running) {
    asrState = 'ok';
    asrSummary = 'Offline speech-to-text is running.';
    asrAction = '';
  } else if (asr.lastError) {
    asrState = 'err';
    asrSummary = asr.lastError;
    asrAction = 'Retry from the Setup Health card after resolving the error.';
  } else if (asr.download) {
    asrState = 'busy';
    asrSummary = 'Offline speech-to-text is downloading ' + asr.download.file + '.';
    asrAction = 'Keep Desktop open until the download finishes.';
  } else if (asr.model && asr.model.present) {
    asrSummary = 'Offline speech-to-text model is downloaded but stopped.';
    asrAction = 'Start it before local reading practice.';
  }
  sections.push(readinessItem('asr', 'Offline speech-to-text', asrState, asrSummary, asrAction, {
    phase: asr.phase,
    running: asr.running,
    model: asr.model,
    arch: asr.arch,
  }));

  const liveState = liveSession.firestoreAllowed
    ? (liveSession.demoOnly ? 'err' : 'warn')
    : (liveSession.lanBridge?.share?.active ? 'ok' : 'warn');
  sections.push(readinessItem(
    'live-session',
    'Classroom live sessions',
    liveState,
    liveSession.firestoreAllowed
      ? 'This mode allows cloud classroom session docs.'
      : (liveSession.lanBridge?.share?.active ? 'LAN sharing is active.' : 'Cloud session docs are blocked; LAN sharing is not active.'),
    liveSession.lanBridge?.share?.active
      ? ''
      : (liveSession.mode === 'schoolbox-lan' ? 'Start LAN Share before students join from other devices.' : 'Use School Box / Local Network for local classroom sessions.'),
    {
      mode: liveSession.mode,
      dataLocation: liveSession.dataLocation,
      firestoreAllowed: liveSession.firestoreAllowed,
      lanBridge: liveSession.lanBridge,
      warnings: liveSession.warnings,
    }
  ));

  const schoolBoxOk = schoolBox.status === 'running' || schoolBox.status === 'ready';
  const schoolBoxWarn = ['needs-setup', 'needs-docker', 'partial', 'missing-app-build'].includes(schoolBox.status);
  sections.push(readinessItem(
    'schoolbox',
    'School Box',
    schoolBoxOk ? 'ok' : (schoolBoxWarn ? 'warn' : 'err'),
    'School Box status: ' + (schoolBox.status || 'unknown') + '.',
    schoolBoxOk ? '' : ((schoolBox.nextActions && schoolBox.nextActions[0]) || 'Prepare and start School Box when local classroom services are needed.'),
    {
      status: schoolBox.status,
      url: schoolBox.url,
      services: schoolBox.services,
      nextActions: schoolBox.nextActions,
    }
  ));

  const diskFree = engine.diskFreeBytes;
  if (diskFree != null) {
    sections.push(readinessItem(
      'disk',
      'Local model storage',
      diskFree < 2 * 1073741824 ? 'err' : (diskFree < 5 * 1073741824 ? 'warn' : 'ok'),
      'Free space for Desktop data: ' + (diskFree / 1073741824).toFixed(1) + ' GB.',
      diskFree < 5 * 1073741824 ? 'Free disk space before downloading large local models.' : '',
      { diskFreeBytes: diskFree, dataDir: getDataDir() }
    ));
  }

  const worst = sections.reduce((state, section) => (
    readinessStateRank(section.state) > readinessStateRank(state) ? section.state : state
  ), 'ok');

  return {
    generatedAt: new Date().toISOString(),
    overall: worst,
    summary: worst === 'ok'
      ? 'Desktop is ready for local-first use.'
      : 'Desktop has readiness items to review before a local-first class.',
    sections,
    environment: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
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

  if (req.method === 'GET' && url.pathname === '/api/readiness') {
    jsonResponse(res, 200, await buildReadinessReport(config, origin));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/config') {
    jsonResponse(res, 200, redactConfig(config));
    return;
  }

  if ((req.method === 'POST' || req.method === 'PUT') && url.pathname === '/api/config') {
    const body = await readRequestJson(req);
    if (body && body.localEngine && typeof body.localEngine === 'object') {
      const resetKeys = ['modelUrl', 'modelDirectory', 'contextSize', 'threads', 'extraArgs', 'binaryUrl'];
      if (resetKeys.some((key) => Object.prototype.hasOwnProperty.call(body.localEngine, key))) {
        managedEngine.lastProbe = null;
      }
    }
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
      ...await getLocalEngineStatus(config),
      engine: getEngineConfig(config),
      provider: await probeProvider(provider),
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/engine/start') {
    // Downloads + model load can take minutes: kick the work off and return a
    // snapshot immediately — the command center polls /api/engine/status.
    if (!isEngineRunning() && !managedEngine.startPromise) {
      startLocalEngine(config).catch(() => { /* surfaced via status.lastError */ });
      // Starting IS the opt-in: remember it so the engine autostarts with the
      // desktop from now on (single writer — the UIs no longer need to).
      try { writeConfig(deepMerge(config, { localEngine: { enabled: true } })); } catch (_) {}
    }
    jsonResponse(res, 200, await getLocalEngineStatus(config));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/engine/stop') {
    const stopped = await stopLocalEngine(config);
    // An explicit Stop is the opt-out: without this, enabled:true was a
    // one-way door and autostart resurrected the engine every boot forever.
    try { writeConfig(deepMerge(readConfig(), { localEngine: { enabled: false } })); } catch (_) {}
    jsonResponse(res, 200, stopped);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/engine/logs') {
    jsonResponse(res, 200, { logs: managedEngine.logs.slice(-100) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/engine/probe') {
    jsonResponse(res, 200, await runLocalEngineProbe(config));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/asr/status') {
    jsonResponse(res, 200, { ...await getLocalAsrStatus(config), asr: getAsrConfig(config) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/asr/start') {
    if (!isAsrRunning() && !managedAsr.startPromise) {
      startLocalAsr(config).catch(() => { /* surfaced via status.lastError */ });
      // Starting IS the opt-in: autostart the ASR server from now on.
      try { writeConfig(deepMerge(config, { localAsr: { enabled: true } })); } catch (_) {}
    }
    jsonResponse(res, 200, await getLocalAsrStatus(config));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/asr/stop') {
    const stopped = await stopLocalAsr(config);
    try { writeConfig(deepMerge(readConfig(), { localAsr: { enabled: false } })); } catch (_) {}
    jsonResponse(res, 200, stopped);
    return;
  }

  // Same-origin transcription proxy: the app page (this origin) streams the
  // recorded WAV here; we forward it verbatim to the managed whisper-server's
  // /inference on its private port. Keeps the browser out of cross-port CORS
  // territory entirely — whisper-server's own header behavior stops mattering.
  if (req.method === 'POST' && url.pathname === '/api/asr/transcribe') {
    const status = await getLocalAsrStatus(config);
    if (!status.running) {
      jsonResponse(res, 409, { error: 'The speech engine is not running. Start it from the Setup Health card.' });
      return;
    }
    const asr = getAsrConfig(config);
    const upstream = http.request({
      host: '127.0.0.1',
      port: asr.port,
      path: '/inference',
      method: 'POST',
      headers: { 'content-type': req.headers['content-type'] || 'application/octet-stream' },
    }, (up) => {
      res.writeHead(up.statusCode || 502, { 'Content-Type': up.headers['content-type'] || 'application/json' });
      up.pipe(res);
    });
    upstream.on('error', (error) => {
      if (!res.headersSent) jsonResponse(res, 502, { error: 'whisper-server did not answer: ' + error.message });
      else { try { res.end(); } catch (_) {} }
    });
    req.pipe(upstream);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/asr/logs') {
    jsonResponse(res, 200, { logs: managedAsr.logs.slice(-100) });
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

  // LAN doc store (chunked session assets). Private runtime = the teacher's
  // app, so create/replace/delete are allowed here and only here.
  const lanDocMatch = url.pathname.match(/^\/api\/lan-docs\/([A-Za-z0-9_-]{1,512})$/);
  if (lanDocMatch) {
    const key = lanDocMatch[1];
    if (req.method === 'GET') {
      const docEntry = serializeLanDoc(sanitizeLanDocKey(key));
      if (!docEntry) {
        jsonResponse(res, 404, { error: 'Class asset not found.' });
        return;
      }
      jsonResponse(res, 200, { doc: docEntry });
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const body = await readRequestJson(req);
      jsonResponse(res, 200, { doc: upsertLanDoc(key, body.doc || body.data || {}, body.options || {}, config) });
      return;
    }
    if (req.method === 'DELETE') {
      jsonResponse(res, 200, { deleted: deleteLanDoc(key) });
      return;
    }
    jsonResponse(res, 405, { error: 'Unsupported LAN doc method.' });
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

  // LAN doc store, student side: hydration reads only. Same PIN gate as the
  // session endpoints — assets carry teacher resources, which is exactly the
  // content the PIN protects.
  const lanDocMatch = url.pathname.match(/^\/api\/lan-docs\/([A-Za-z0-9_-]{1,512})$/);
  if (lanDocMatch && !lanPinMatches(url.searchParams.get('pin') || req.headers['x-allo-lan-pin'])) {
    jsonResponse(res, 401, { error: 'This class needs a join PIN. Ask your teacher for it.', pinRequired: true });
    return;
  }
  if (lanDocMatch) {
    if (req.method === 'GET') {
      const docEntry = serializeLanDoc(sanitizeLanDocKey(lanDocMatch[1]));
      if (!docEntry) {
        jsonResponse(res, 404, { error: 'Class asset not found.' });
        return;
      }
      jsonResponse(res, 200, { doc: docEntry });
      return;
    }
    jsonResponse(res, 403, { error: 'Only the teacher desktop can write class assets.' });
    return;
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
    // LAN doc store (chunked session assets): teacher writes privately,
    // students read through the share listener, never write.
    const docPut = await fetch(baseUrl + '/api/lan-docs/asset_smoke_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc: { kind: 'sessionResource', resource: { id: 'r1' } } }),
    }).then((response) => response.json());
    const docGet = await fetch(baseUrl + '/api/lan-docs/asset_smoke_1').then((response) => response.json());
    const publicDocGet = await fetch(shareUrl + '/api/lan-docs/asset_smoke_1').then((response) => response.json());
    const publicDocPutStatus = await fetch(shareUrl + '/api/lan-docs/asset_smoke_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc: { kind: 'tampered' } }),
    }).then((response) => response.status);
    const schoolBox = await fetch(baseUrl + '/api/schoolbox/status').then((response) => response.json());
    const readiness = await fetch(baseUrl + '/api/readiness').then((response) => response.json());
    if (health.status !== 'ok') throw new Error('Health endpoint did not return ok.');
    if (!Array.isArray(providers.providers)) throw new Error('Providers endpoint did not return a provider list.');
    if (!liveSession || !liveSession.mode) throw new Error('Live session endpoint did not return a mode.');
    if (!lanCreate.session || lanCreate.session.id !== 'SMOKE1') throw new Error('LAN session create failed.');
    if (lanUpdate.session?.data?.roster?.test?.status !== 'active') throw new Error('LAN session update failed.');
    if (publicSession.session?.id !== 'SMOKE1') throw new Error('Public LAN share could not read a session.');
    if (publicCreateStatus !== 403) throw new Error('Public LAN share allowed session creation.');
    if (publicPatch.session?.data?.roster?.student?.name !== 'Learner') throw new Error('Public LAN share could not patch a session.');
    if (!schoolBox || !schoolBox.implemented) throw new Error('School Box endpoint did not return implemented status.');
    if (!readiness || !Array.isArray(readiness.sections) || !readiness.sections.some((section) => section.id === 'local-engine')) {
      throw new Error('Readiness endpoint did not return local-engine status.');
    }
    const engineStatus = await fetch(baseUrl + '/api/engine/status').then((response) => response.json());
    const engineStop = await fetch(baseUrl + '/api/engine/stop', { method: 'POST' }).then((response) => response.json());
    const engineProbe = await fetch(baseUrl + '/api/engine/probe', { method: 'POST' }).then((response) => response.json());
    if (engineStatus.implemented !== true) throw new Error('Engine status no longer reports implemented.');
    if (engineStatus.running !== false) throw new Error('Engine unexpectedly reports running in smoke.');
    if (typeof engineStatus.binaryPresent !== 'boolean' || !engineStatus.model) throw new Error('Engine status shape regressed.');
    if (engineStop.phase !== 'stopped') throw new Error('Engine stop was not idempotent.');
    if (engineProbe.status !== 'not-running' || !Array.isArray(engineProbe.tests)) throw new Error('Engine probe did not safely no-op while stopped.');
    if (docPut.doc?.id !== 'asset_smoke_1') throw new Error('LAN doc create failed.');
    if (docGet.doc?.data?.resource?.id !== 'r1') throw new Error('LAN doc read failed.');
    if (publicDocGet.doc?.data?.kind !== 'sessionResource') throw new Error('Public LAN share could not read a class asset.');
    if (publicDocPutStatus !== 403) throw new Error('Public LAN share allowed asset writes.');
    // ── Classroom PIN gate (latched at share start) ──
    await stopLanShare();
    const pinnedConfig = deepMerge(readConfig(), { liveSession: { lan: { sharePort: 0, pin: 'SMOKE-PIN' } } });
    const pinnedShare = await startLanShare(pinnedConfig);
    const pinnedUrl = `http://127.0.0.1:${pinnedShare.port}`;
    const noPinStatus = await fetch(pinnedUrl + '/api/lan-sessions/SMOKE1').then((response) => response.status);
    const wrongPinStatus = await fetch(pinnedUrl + '/api/lan-sessions/SMOKE1?pin=WRONG').then((response) => response.status);
    const goodPin = await fetch(pinnedUrl + '/api/lan-sessions/SMOKE1?pin=SMOKE-PIN').then((response) => response.json());
    const docNoPinStatus = await fetch(pinnedUrl + '/api/lan-docs/asset_smoke_1').then((response) => response.status);
    const docGoodPin = await fetch(pinnedUrl + '/api/lan-docs/asset_smoke_1', {
      headers: { 'x-allo-lan-pin': 'SMOKE-PIN' },
    }).then((response) => response.json());
    const joinNoPin = await fetch(pinnedUrl + '/join/SMOKE1').then((response) => response.text());
    const joinGoodPin = await fetch(pinnedUrl + '/join/SMOKE1?pin=SMOKE-PIN').then((response) => response.text());
    if (noPinStatus !== 401) throw new Error('PIN gate did not reject a missing pin (got ' + noPinStatus + ').');
    if (wrongPinStatus !== 401) throw new Error('PIN gate did not reject a wrong pin (got ' + wrongPinStatus + ').');
    if (goodPin.session?.id !== 'SMOKE1') throw new Error('PIN gate rejected the correct pin.');
    if (!/name="pin"/.test(joinNoPin)) throw new Error('Join page did not ask for the PIN.');
    if (!/allo_lan_join/.test(joinGoodPin)) throw new Error('Join page with a correct PIN did not serve the app link.');
    if (docNoPinStatus !== 401) throw new Error('Doc PIN gate did not reject a missing pin (got ' + docNoPinStatus + ').');
    if (docGoodPin.doc?.id !== 'asset_smoke_1') throw new Error('Doc PIN gate rejected the correct pin (header form).');
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
    maybeAutostartEngine();
    maybeAutostartAsr();
  });
  // CLI runs own their child processes: never orphan a llama-server or a
  // whisper-server on Ctrl+C. The packaged Electron shell has its own
  // before-quit teardown.
  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      Promise.allSettled([stopLocalEngine(), stopLocalAsr()]).finally(() => process.exit(0));
    });
  });
}

// Built-in engine autostart: once a teacher has chosen the engine
// (localEngine.enabled — persisted by POST /api/engine/start) AND its model
// is already on disk, warm it with the desktop so local AI is simply "on" —
// never on a fresh config, never mid-download. Called by BOTH entrypoints:
// main() for CLI runs and desktop/electron/main.cjs after its own listen —
// main() is unreachable there (require.main !== module).
function maybeAutostartEngine(config = readConfig()) {
  if (getEngineConfig(config).enabled && fs.existsSync(engineModelFilePath(config))) {
    console.log('[AlloFlow Desktop] Built-in engine enabled and model present — starting it.');
    return startLocalEngine(config).catch((error) => console.warn('[AlloFlow Desktop] Engine autostart failed:', error.message));
  }
  return Promise.resolve();
}

module.exports = {
  VERSION,
  PROVIDER_PRESETS,
  DEFAULT_CONFIG,
  createLanShareServer,
  createServer,
  maybeAutostartEngine,
  stopLocalEngine,
  getLocalEngineStatus,
  getEngineCapability,
  maybeAutostartAsr,
  startLocalAsr,
  stopLocalAsr,
  getLocalAsrStatus,
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
  buildReadinessReport,
  runLocalEngineProbe,
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
