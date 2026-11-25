// The AlloFlow Demo Cloud live-session mode was removed on 2026-11-23: Desktop
// is offline-first and any cloud classroom backend must be school or district
// owned (byo-firebase). This pins that the mode is no longer offered anywhere
// and that a stale saved config holding it falls back to the fresh-install
// default instead of crashing or unlocking Firestore.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const RUNTIME_PATH = path.join(ROOT, 'desktop/runtime/alloflow-desktop-runtime.cjs');
const ENV_KEYS = ['ALLOFLOW_DESKTOP_HOME', 'ALLOFLOW_DESKTOP_CONFIG', 'ALLOFLOW_LIVE_SESSION_MODE'];
const REMOVED = 'alloflow-demo-cloud';

let savedEnv;
let home;

function loadRuntimeFresh() {
  delete require.cache[require.resolve(RUNTIME_PATH)];
  return require(RUNTIME_PATH);
}

beforeAll(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-demo-cloud-removed-'));
  process.env.ALLOFLOW_DESKTOP_HOME = home;
  delete process.env.ALLOFLOW_DESKTOP_CONFIG;
  delete process.env.ALLOFLOW_LIVE_SESSION_MODE;
});

afterAll(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  delete require.cache[require.resolve(RUNTIME_PATH)];
  try { fs.rmSync(home, { recursive: true, force: true }); } catch (_) {}
});

describe('demo cloud mode is no longer offered', () => {
  it('is absent from the runtime, command center, picker and contract', () => {
    for (const rel of [
      'desktop/command-center/command-center.js',
      'desktop/command-center/index.html',
      'desktop/contracts/runtime-contract.json',
    ]) {
      expect(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel).not.toContain(REMOVED);
    }
    const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop/contracts/runtime-contract.json'), 'utf8'));
    expect(Object.keys(contract.liveSession.modes).sort()).toEqual(['byo-firebase', 'district-server', 'local-preview', 'schoolbox-lan']);
    const runtimeSrc = fs.readFileSync(RUNTIME_PATH, 'utf8');
    expect(runtimeSrc).not.toMatch(/'alloflow-demo-cloud'\s*:/);
    expect(runtimeSrc).not.toContain('demoOnly');
  });

  it('rejects the mode in a config patch', () => {
    const runtime = loadRuntimeFresh();
    expect(() => runtime.sanitizeConfigPatch({ liveSession: { mode: REMOVED } })).toThrow('Unknown live session mode.');
    expect(runtime.sanitizeConfigPatch({ liveSession: { mode: 'byo-firebase' } }).liveSession.mode).toBe('byo-firebase');
  });
});

describe('a stale saved config is migrated to the default', () => {
  it('readConfig rewrites the saved mode to the fresh-install default and keeps the rest', async () => {
    const configPath = path.join(home, 'stale.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      version: 1,
      liveSession: { mode: REMOVED, lan: { pin: '4321' } },
    }));
    process.env.ALLOFLOW_DESKTOP_CONFIG = configPath;
    try {
      const runtime = loadRuntimeFresh();
      const fresh = runtime.DEFAULT_CONFIG.liveSession.mode;
      expect(fresh).toBe('schoolbox-lan');

      const config = runtime.readConfig();
      expect(config.liveSession.mode).toBe(fresh);
      expect(config.liveSession.lan.pin).toBe('4321');
      const persisted = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(persisted.liveSession.mode).toBe(fresh);
      expect(persisted.liveSession.lan.pin).toBe('4321');

      const status = await runtime.getLiveSessionStatus(config, 'http://127.0.0.1:32170', { publicLan: true });
      expect(status.mode).toBe(fresh);
      expect(status.firestoreAllowed).toBe(false);
      expect(status.cloudSessionAllowed).toBe(false);
      expect(status.demoOnly).toBeUndefined();
    } finally {
      delete process.env.ALLOFLOW_DESKTOP_CONFIG;
    }
  });

  it('getLiveSessionStatus on an un-migrated in-memory config also falls back without cloud', async () => {
    const runtime = loadRuntimeFresh();
    const status = await runtime.getLiveSessionStatus({ liveSession: { mode: REMOVED } }, 'http://127.0.0.1:32170', { publicLan: true });
    expect(status.mode).toBe('schoolbox-lan');
    expect(status.firestoreAllowed).toBe(false);
  });

  it('an ALLOFLOW_LIVE_SESSION_MODE env of the removed mode does not become the default', async () => {
    process.env.ALLOFLOW_LIVE_SESSION_MODE = REMOVED;
    try {
      const runtime = loadRuntimeFresh();
      expect(runtime.DEFAULT_CONFIG.liveSession.mode).toBe('schoolbox-lan');
      const status = await runtime.getLiveSessionStatus({}, 'http://127.0.0.1:32170', { publicLan: true });
      expect(status.mode).toBe('schoolbox-lan');
      expect(status.firestoreAllowed).toBe(false);
    } finally {
      delete process.env.ALLOFLOW_LIVE_SESSION_MODE;
    }
  });
});
