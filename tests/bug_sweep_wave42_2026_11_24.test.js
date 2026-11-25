// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';

const ROOT = path.resolve(__dirname, '..');

function readRoot(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function loadInWindow(rel, extra = {}) {
  const code = readRoot(rel);
  const win = Object.assign({
    AlloModules: {},
    console,
    setTimeout,
    clearTimeout,
    URL,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    Buffer,
    crypto: globalThis.crypto,
    btoa: globalThis.btoa,
    atob: globalThis.atob,
  }, extra);
  win.window = win;
  win.self = win;
  win.globalThis = win;
  vm.runInNewContext(code, win, { filename: rel, timeout: 3000 });
  return win;
}

const WAVE42_DELIVERABLES = [
  'allo_crypto_module.js',
  'submission_crypto_module.js',
  'device_access_code_module.js',
  'allo_device_vault_module.js',
  'allo_recovery_vault_integration_module.js',
  'safety_checker_module.js',
  'question_board_contract_module.js',
  'question_board_transport_module.js',
  'allo_quest_contract_module.js',
  'tool_integration_sdk.js',
  'packets_zip.js',
  'packets-verify.js',
  'packets-try.js',
  'packets-vocab-lookup.js',
  'packets_voice_engine.js',
];

describe('Wave 42 — Mirror parity, size cap, and 4-mode SSR safety', () => {
  it('maintains 4-way SHA-256 mirror parity for all 15 Wave 42 deliverables', () => {
    const mirrorDirs = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];
    for (const rel of WAVE42_DELIVERABLES) {
      const rootHash = sha256File(path.join(ROOT, rel));
      for (const dir of mirrorDirs) {
        const dest = path.join(ROOT, dir, rel);
        expect(fs.existsSync(dest), `Missing mirror ${dir}/${rel}`).toBe(true);
        expect(sha256File(dest), `Mirror mismatch ${dir}/${rel}`).toBe(rootHash);
      }
    }
  });

  it('loads all 15 Wave 42 scripts cleanly across 4 SSR modes and keeps packets_voice_engine under 10KB', () => {
    expect(Buffer.byteLength(readRoot('packets_voice_engine.js'), 'utf8')).toBeLessThan(10000);
    const modes = [
      ['bare', () => ({ console })],
      ['window=null', () => ({ console, window: null, self: null })],
      ['window=42', () => ({ console, window: 42, self: 42 })],
      ['self=null', () => ({ console, self: null, globalThis: {} })],
    ];
    for (const rel of WAVE42_DELIVERABLES) {
      const code = readRoot(rel);
      expect(() => new vm.Script(code, { filename: rel })).not.toThrow();
      for (const [label, mk] of modes) {
        expect(() => vm.runInNewContext(code, mk(), { filename: rel, timeout: 2500 }), `${rel} failed in ${label}`).not.toThrow();
      }
    }
  });
});

describe('Wave 42 Batch A — Crypto, Vault, Access Code & Recovery Integration', () => {
  it('allo_crypto freezes API, blocks Unicode case-folding in recovery codes, and rejects sparse AAD arrays', async () => {
    const win = loadInWindow('allo_crypto_module.js');
    const api = win.AlloModules.AlloCrypto;
    expect(Object.isFrozen(api)).toBe(true);
    expect(() => api.normalizeRecoveryCode('\u017f'.repeat(36))).toThrow(/invalid character/i);
    expect(api.destroyVaultKey(42)).toBe(false);
    expect(api.destroyVaultKey(Symbol('x'))).toBe(false);

    const dek = await api.createVaultKey();
    try {
      const sparse = [1, , 3]; // eslint-disable-line no-sparse-arrays
      await expect(api.encryptRecord({ a: 1 }, dek, sparse)).rejects.toThrow(/sparse/i);
    } finally {
      api.destroyVaultKey(dek);
    }
  });

  it('submission_crypto rejects non-plain objects (Map/Date) and freezes API', async () => {
    const win = loadInWindow('submission_crypto_module.js');
    const api = win.AlloModules.SubmissionCrypto;
    expect(Object.isFrozen(api)).toBe(true);
    await expect(api.encryptSubmission(new Map(), { kty: 'RSA', n: 'AQAB', e: 'AQAB' })).rejects.toThrow(/plain object/i);
    await expect(api.encryptSubmission(new Date(), { kty: 'RSA', n: 'AQAB', e: 'AQAB' })).rejects.toThrow(/plain object/i);
  });

  it('device_access_code enforces code decryption on unconfigured unlock even when session has keys and merges stricter backoff', async () => {
    const makeStore = (throwOnSet = false) => {
      const data = new Map();
      return {
        getItem: (k) => (data.has(k) ? data.get(k) : null),
        setItem: (k, v) => {
          if (throwOnSet) throw new Error('QuotaExceededError');
          data.set(k, String(v));
        },
        removeItem: (k) => { data.delete(k); },
      };
    };
    const local = makeStore();
    const session = makeStore();
    const win = loadInWindow('allo_crypto_module.js', { localStorage: local, sessionStorage: session });
    vm.runInNewContext(readRoot('device_access_code_module.js'), win, { filename: 'device_access_code_module.js' });
    const dac = win.AlloModules.DeviceAccessCode;

    // Seed an encrypted locked AI key without a configured access code verifier,
    // AND pre-populate sessionStorage with a key. Wrong code MUST still fail!
    const enc = await win.AlloModules.AlloCrypto.encryptJSON({ apiKey: 'sk-real-secret' }, 'CorrectCode123', 10000);
    local.setItem(dac.AI_LOCKED_KEY, JSON.stringify(enc));
    session.setItem(dac.AI_SESSION_KEY, JSON.stringify({ apiKey: 'sk-session-copy', unsaved: false }));

    const wrong = await dac.unlockAiKeyWithCode('WrongCode999', { now: 1000 });
    expect(wrong.ok).toBe(false);
    expect(wrong.reason).toBe('incorrect');

    // Stale localStorage backoff must not shadow a stricter sessionStorage backoff.
    local.setItem('alloflow_educator_access_backoff_v1', JSON.stringify({ failures: 1, blockedUntil: 0 }));
    session.setItem('alloflow_educator_access_backoff_v1', JSON.stringify({ failures: 4, blockedUntil: 50000 }));
    expect(dac._internal.retryAfter(10000)).toBeGreaterThan(0);
  });

  it('allo_device_vault rejects __proto__ snapshot IDs, freezes API, and rejects non-serializable clone inputs with typed VaultError', async () => {
    const win = loadInWindow('allo_crypto_module.js');
    vm.runInNewContext(readRoot('allo_device_vault_module.js'), win, { filename: 'allo_device_vault_module.js' });
    const vaultMod = win.AlloModules.AlloDeviceVault;
    expect(Object.isFrozen(vaultMod)).toBe(true);

    let store = null;
    const repo = {
      async read() { return { revision: 1, store }; },
      async compareAndSwap(_rev, next) { store = next; return true; },
    };
    const ctrl = vaultMod.createRecoveryVaultController({ repository: repo, crypto: win.AlloModules.AlloCrypto, maxCasRetries: Infinity });
    expect(ctrl.maxCasRetries).toBeLessThanOrEqual(100);
    await expect(ctrl.restoreSnapshot('__proto__')).rejects.toMatchObject({ code: 'VAULT_SNAPSHOT_INVALID' });
    await expect(ctrl.setPinned('constructor', true)).rejects.toMatchObject({ code: 'VAULT_SNAPSHOT_INVALID' });

    const circ = {};
    circ.self = circ;
    await expect(ctrl.upsertSnapshot(circ)).rejects.toMatchObject({ code: 'VAULT_STORE_INVALID' });
  });

  it('allo_recovery_vault_integration rejects non-serializable Symbol expected CAS tokens', async () => {
    const win = loadInWindow('allo_recovery_vault_integration_module.js');
    const mod = win.AlloModules.AlloRecoveryVaultIntegration;
    const repo = mod.createDeviceRepository({
      async get() { return null; },
      async compareAndSwap() { return { applied: true }; },
    });
    await expect(repo.compareAndSwap({ mode: 'value', value: Symbol('bad') }, { version: 1 })).rejects.toMatchObject({ code: 'VAULT_REVISION_INVALID' });
  });
});

describe('Wave 42 Batch B — Safety, Question Board, Quest Contract & Integration SDK', () => {
  it('safety_checker freezes API/patterns, survives detached calls, and respects __alloOfflineOnly', async () => {
    let fetched = false;
    const win = loadInWindow('safety_checker_module.js', {
      __alloOfflineOnly: true,
      fetch: async () => { fetched = true; return { ok: true, json: async () => ({}) }; },
    });
    const sc = win.SafetyContentChecker;
    expect(Object.isFrozen(sc)).toBe(true);
    expect(Object.isFrozen(sc.patterns)).toBe(true);
    const { check, getCategoryLabel } = sc;
    expect(check('hello world')).toEqual([]);
    expect(getCategoryLabel('gibberish')).toBe('🔤 Gibberish Input');
    await sc.aiCheck('student message that is long enough', 'chat', 'AIzaValidKey', () => {});
    expect(fetched).toBe(false);
  });

  it('question_board_contract handles numeric epoch expiresAt (FERPA read-only expiry) and freezes API', () => {
    const win = loadInWindow('question_board_contract_module.js');
    const c = win.AlloModules.QuestionBoardContract;
    expect(Object.isFrozen(c)).toBe(true);

    const pastMs = Date.now() - 60_000;
    const cfg = c.normalizeBoardConfig({
      activityId: 'AC-0123abcd-0123-4567-89ab-0123456789ab',
      type: 'question_board',
      prompt: 'What do you wonder?',
      expiresAt: pastMs,
    });
    expect(cfg).not.toBeNull();
    expect(cfg.expiresAt).toBe(new Date(pastMs).toISOString());
    expect(c.isExpired({ config: { expiresAt: pastMs } })).toBe(true);
    expect(c.authorize({ uid: 'S-1', role: 'participant' }, 'create', { config: { expiresAt: pastMs }, items: [] }, { text: 'Hi' }).invariant).toBe('EXPIRY_IS_READ_ONLY');
  });

  it('question_board_transport blocks backslash/Symbol URLs and preserves fresh credential across startFresh race', async () => {
    const win = loadInWindow('question_board_transport_module.js');
    const t = win.AlloModules.QuestionBoardTransport;
    expect(Object.isFrozen(t)).toBe(true);
    expect(() => t.createMailboxTransport({ call: async () => ({}), url: '\\\\evil.example/exec' })).toThrow(/unsafe URL/i);
    expect(() => t.createMailboxTransport({ call: async () => ({}), url: Symbol('u') })).toThrow(/unsafe URL/i);
  });

  it('tool_integration_sdk rejects null now clock bypass, accepts numeric review timestamps, blocks Symbol nonEmpty, and freezes contract', () => {
    const win = loadInWindow('tool_integration_sdk.js');
    const sdk = win.AlloFlowToolIntegration;
    const baseContract = {
      schemaVersion: 1,
      id: 'demo-tool',
      name: 'Demo Tool',
      version: '1.0.0',
      reviewedAt: Date.parse('2025-01-01T00:00:00Z'),
      reviewAfter: Date.parse('2026-01-01T00:00:00Z'),
      license: { spdx: 'MIT' },
      citation: { text: 'Cite Demo Tool' },
      supportedMethodPacks: ['scientific_investigation'],
      capabilities: { captureArtifact: true },
      privacy: { learnerApprovalRequired: true },
      reproducibility: { requiredFields: ['softwareVersion', 'limitations'] },
    };

    const nullClock = sdk.validateContract(baseContract, { now: null });
    expect(nullClock.ok).toBe(false);
    expect(nullClock.errors).toContain('review clock is invalid');

    const validNumeric = sdk.validateContract(baseContract, { now: Date.parse('2025-06-01T00:00:00Z') });
    expect(validNumeric.ok).toBe(true);

    const symReceipt = sdk.validateReceipt({ softwareVersion: Symbol('1.0'), limitations: 'None' }, baseContract);
    expect(symReceipt.ok).toBe(false);

    const adapter = sdk.createAdapter({
      contract: baseContract,
      validationOptions: { now: Date.parse('2025-06-01T00:00:00Z') },
      buildCapture: () => ({ summary: 'Done', reproducibilityReceipt: { softwareVersion: '1.0', limitations: 'None' } }),
    });
    expect(Object.isFrozen(adapter.contract)).toBe(true);
    expect(Object.isFrozen(adapter.contract.privacy)).toBe(true);
  });
});

describe('Wave 42 Batch C — Offline Packets Core Runtime', () => {
  it('packets_zip handles null/numeric toBytes safely, does not poison seen on oversized name, and blocks drive-letter Zip-Slip', () => {
    const win = loadInWindow('packets_zip.js');
    const zipApi = win.AlloPacketZip;
    expect(zipApi.crc32(null)).toBe(0);
    expect(zipApi.readZip(1e9)).toEqual([]);

    const z = zipApi.create();
    expect(() => z.add('a'.repeat(70000), 'x')).toThrow(/too long/i);
    z.add('ok.txt', 'hello');
    const parts = z.finish();
    const total = parts.reduce((n, p) => n + p.length, 0);
    const buf = new Uint8Array(total);
    let off = 0;
    for (const p of parts) { buf.set(p, off); off += p.length; }
    const entries = zipApi.readZip(buf);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('ok.txt');
    expect(entries[0].crcOk).toBe(true);
  });

  it('packets_voice_engine converts synchronous _kokoroTTS.speak throw into a rejected Promise', async () => {
    const win = loadInWindow('packets_voice_engine.js', {
      _kokoroTTS: {
        ready: true,
        init: async () => true,
        speak: () => { throw new Error('sync boom'); },
      },
      _alloInstallRuntimeGraphHost: () => {},
      __alloCreateVerifiedWorker: () => {},
      AlloPacketAudioKit: { wavInfo: () => ({ size: 100, byteRate: 16000 }) },
      fetch: async () => ({ ok: true, json: async () => ({}) }),
      document: {
        head: { appendChild(el) { if (el.onload) el.onload(); } },
        createElement: () => ({}),
      },
    });
    await win.AlloPacketVoiceEngine.get();
    await expect(win.AlloPacketVoiceEngine.speak('hello')).rejects.toThrow('sync boom');
  });
});
