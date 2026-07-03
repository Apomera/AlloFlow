#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const DESKTOP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DESKTOP_ROOT, '..');
const COMMAND_CENTER_DIR = path.join(DESKTOP_ROOT, 'command-center');
const VERSION = '0.1.0-foundation';

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

const DEFAULT_CONFIG = {
  version: 1,
  appUrl: process.env.ALLOFLOW_APP_URL || 'http://localhost:3000',
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
  schoolBox: {
    mode: 'disabled',
    embedded: false,
    host: '127.0.0.1',
    port: 32174,
  },
  secrets: {},
};

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
    return deepMerge(DEFAULT_CONFIG, JSON.parse(text));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[AlloFlow Desktop] Config read failed:', error.message);
    }
    return deepMerge(DEFAULT_CONFIG, {});
  }
}

function writeConfig(nextConfig) {
  const configPath = getConfigPath();
  const merged = deepMerge(DEFAULT_CONFIG, nextConfig);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  return merged;
}

function redactConfig(config) {
  const redacted = deepMerge(DEFAULT_CONFIG, config);
  redacted.secrets = Object.fromEntries(Object.entries(config.secrets || {}).map(([id, secret]) => [
    id,
    {
      hasKey: Boolean(secret && secret.value),
      updatedAt: secret && secret.updatedAt ? secret.updatedAt : null,
    },
  ]));
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
    if (size > 1024 * 1024) throw new Error('Request body is too large.');
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
    hasKey: Boolean(config.secrets && config.secrets[provider.id] && config.secrets[provider.id].value),
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

function serveStatic(res, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(COMMAND_CENTER_DIR, relativePath);
  if (!filePath.startsWith(COMMAND_CENTER_DIR)) {
    textResponse(res, 403, 'Forbidden');
    return;
  }
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

async function handleApi(req, res, url) {
  const config = readConfig();

  if (req.method === 'GET' && url.pathname === '/api/health') {
    const appProbe = await probeUrl(config.appUrl, 900);
    jsonResponse(res, 200, {
      name: 'AlloFlow Desktop Runtime',
      version: VERSION,
      status: 'ok',
      appUrl: config.appUrl,
      appReachable: appProbe.reachable,
      appStatus: appProbe.status,
      dataDir: getDataDir(),
      configPath: getConfigPath(),
      commandCenterDir: COMMAND_CENTER_DIR,
      schoolBox: config.schoolBox,
      localEngine: config.localEngine,
    });
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
    const next = deepMerge(config, {
      secrets: {
        [providerId]: {
          value: body.apiKey || '',
          updatedAt: body.apiKey ? new Date().toISOString() : null,
        },
      },
    });
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
    jsonResponse(res, 200, {
      schoolBox: config.schoolBox,
      status: config.schoolBox.mode === 'disabled' ? 'disabled' : 'not-started',
      implemented: false,
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/schoolbox/start') {
    jsonResponse(res, 501, {
      error: 'Embedded School Box host is not implemented yet.',
      nextStep: 'Add the classroom/server process behind this endpoint.',
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/schoolbox/stop') {
    jsonResponse(res, 501, {
      error: 'Embedded School Box host is not implemented yet.',
    });
    return;
  }

  jsonResponse(res, 404, { error: 'Unknown desktop runtime endpoint.' });
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      if (url.pathname.startsWith('/api/')) {
        await handleApi(req, res, url);
        return;
      }
      serveStatic(res, url.pathname);
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
}

async function runSmoke(args) {
  const server = createServer();
  await new Promise((resolve) => server.listen(args.port, args.host, resolve));
  const address = server.address();
  const baseUrl = `http://${args.host}:${address.port}`;
  try {
    const health = await fetch(baseUrl + '/api/health').then((response) => response.json());
    const providers = await fetch(baseUrl + '/api/providers').then((response) => response.json());
    if (health.status !== 'ok') throw new Error('Health endpoint did not return ok.');
    if (!Array.isArray(providers.providers)) throw new Error('Providers endpoint did not return a provider list.');
    console.log('[AlloFlow Desktop] Smoke passed at ' + baseUrl);
  } finally {
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
    console.log('[AlloFlow Desktop] AlloFlow app URL: ' + readConfig().appUrl);
  });
}

main().catch((error) => {
  console.error('[AlloFlow Desktop] ' + error.message);
  process.exitCode = 1;
});

