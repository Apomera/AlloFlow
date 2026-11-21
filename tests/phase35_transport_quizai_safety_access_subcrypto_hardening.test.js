import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readBuf = (rel) => fs.readFileSync(path.join(ROOT, rel));

const PHASE35_FILES = [
  'question_board_transport_module.js',
  'quiz_ai_helpers.js',
  'safety_checker_module.js',
  'device_access_code_module.js',
  'submission_crypto_module.js',
];

const MIRRORS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

describe('Phase 35 — Mirror Parity & 3-Host SRI Delivery Sync', () => {
  it('keeps all 5 Phase 35 modules byte-identical across 4-way mirrors and synced across all 3 host manifests', () => {
    const manifestHelper = require('../dev-tools/build_browser_delivery_manifest.cjs');
    const releaseIds = [];

    for (const rel of PHASE35_FILES) {
      const rootBuf = readBuf(rel);
      for (const mirror of MIRRORS) {
        const mirrorDir = path.join(ROOT, mirror);
        if (!fs.existsSync(mirrorDir)) continue;
        const mirrorBuf = fs.readFileSync(path.join(mirrorDir, rel));
        expect(mirrorBuf.equals(rootBuf), `${mirror}/${rel} must match root`).toBe(true);
      }
    }

    for (const host of HOSTS) {
      const embedded = manifestHelper.readEmbeddedManifest(read(host));
      expect(embedded && embedded.assets, host).toBeTruthy();
      const { releaseId, ...body } = embedded;
      const expectedReleaseId = crypto.createHash('sha256').update(manifestHelper.canonical(body)).digest('hex');
      expect(releaseId, `${host} canonical releaseId`).toBe(expectedReleaseId);
      releaseIds.push(releaseId);

      for (const rel of PHASE35_FILES) {
        const rootBuf = readBuf(rel);
        const expectedSri = 'sha384-' + crypto.createHash('sha384').update(rootBuf).digest('base64');
        expect(embedded.assets[rel], `${host} missing ${rel}`).toBeTruthy();
        expect(embedded.assets[rel].bytes, `${host} bytes for ${rel}`).toBe(rootBuf.length);
        expect(embedded.assets[rel].integrity, `${host} SRI for ${rel}`).toBe(expectedSri);
      }
    }

    expect(new Set(releaseIds).size).toBe(1);
  });
});

describe('Phase 35 — question_board_transport_module.js hardening', () => {
  const T = require('../question_board_transport_module.js');

  afterEach(() => {
    delete globalThis.__alloQrStudentMode;
    delete globalThis.__alloActiveLearnerKey;
    localStorage.clear();
    sessionStorage.clear();
  });

  it('guards REASONS against prototype keys, rejects dangerous URLs, and sanitizes malformed summaries', () => {
    expect(T.reasonFor('toString')).toBe('error');
    expect(T.reasonFor('constructor')).toBe('error');
    expect(T.reasonFor('__proto__')).toBe('error');

    expect(() => T.createMailboxTransport({
      call: async () => ({ ok: true }),
      url: 'javascript:alert(1)',
    })).toThrow(/unsafe URL/i);

    const board = T.boardFromSummary({
      ok: true,
      activityId: 'AC-1',
      items: [null, 'bad', { id: 'i1', uid: 'u1', text: 'Hello\u0000', status: 'evil-status', createdAt: NaN }],
      version: Infinity,
    });
    expect(board.items).toHaveLength(1);
    expect(board.items[0]).toMatchObject({ id: 'i1', text: 'Hello', status: 'held', createdAt: 0 });
    expect(board.version).toBe(0);
  });

  it('deduplicates concurrent joinactivity calls and isolates QR student credentials to sessionStorage', async () => {
    let joinCalls = 0;
    const transport = T.createMailboxTransport({
      call: async (_url, payload) => {
        if (payload.a === 'joinactivity') {
          joinCalls++;
          await new Promise((r) => setTimeout(r, 15));
          return { ok: true, uid: 'u-dedup', pt: 'tok-dedup' };
        }
        return { ok: true, activityId: 'AC-1', items: [] };
      },
      url: 'https://script.google.com/macros/s/test/exec',
      packId: 'PK-1',
      activityId: 'AC-1',
      packSecret: 'sec',
      isTeacher: false,
      storage: null,
    });

    await Promise.all([transport.load(), transport.addItem('First question')]);
    expect(joinCalls).toBe(1);

    globalThis.__alloQrStudentMode = true;
    const qrTransport = T.createMailboxTransport({
      call: async (_url, payload) => {
        if (payload.a === 'joinactivity') return { ok: true, uid: 'u-qr', pt: 'tok-qr' };
        return { ok: true, activityId: 'AC-qr', items: [] };
      },
      url: 'https://script.google.com/macros/s/test/exec',
      packId: 'PK-qr',
      activityId: 'AC-qr',
      packSecret: 'sec',
      isTeacher: false,
      storage: window.localStorage,
    });
    await qrTransport.load();
    expect(window.localStorage.getItem('allo_question_board_v1:PK-qr:AC-qr')).toBeNull();
    expect(window.sessionStorage.getItem('allo_question_board_v1:PK-qr:AC-qr')).toContain('u-qr');
  });
});

describe('Phase 35 — quiz_ai_helpers.js hardening', () => {
  let Q;

  beforeAll(() => {
    delete window.AlloModules?.QuizAIHelpers;
    loadAlloModule('quiz_ai_helpers.js');
    Q = window.AlloModules.QuizAIHelpers;
  });

  afterEach(() => {
    delete window.__alloQrStudentMode;
    delete window._alloQrBlocked;
    delete window.ALLOFLOW_MANAGED_AI_POLICY;
    delete window.__alloAiUsable;
  });

  it('enforces fail-closed AI gating in QR mode, scrubs secrets in errors, and fixes null acceptableAlternatives', async () => {
    window.__alloQrStudentMode = true;
    let called = false;
    const qrBlocked = await Q.gradeFreeformAnswer({
      question: 'Q', expectedAnswer: 'A', studentResponse: 'answer',
      callGemini: async () => { called = true; return '{"status":"correct","feedback":"ok"}'; },
    });
    expect(qrBlocked.status).toBe('error');
    expect(called).toBe(false);
    delete window.__alloQrStudentMode;

    // Null element in acceptableAlternatives must NOT match literal string "null"
    const nullAlt = await Q.gradeFillBlank({
      contextSentence: 'The answer is ___.',
      expectedFill: 'oxygen',
      acceptableAlternatives: [null, undefined],
      studentFill: 'null',
      callGemini: undefined,
    });
    expect(nullAlt.status).toBe('incorrect');

    // Secret scrubbing in thrown errors
    const errRes = await Q.gradeFreeformAnswer({
      question: 'Q', expectedAnswer: 'A', studentResponse: 'my answer',
      callGemini: async () => { throw new Error('HTTP 401 failed with key AIzaSySecret1234567890 and Bearer tok_abcdefghij'); },
    });
    expect(errRes.status).toBe('error');
    expect(errRes.feedback).not.toContain('AIzaSySecret');
    expect(errRes.feedback).not.toContain('tok_abcdefghij');
    expect(errRes.feedback).toContain('[redacted]');

    // Prototype pollution safety + null calibration sample safety
    const calRes = await Q.gradeFreeformAnswerWithCalibration({
      rubric: 'Explain.',
      studentResponse: 'Because gravity pulls objects.',
      calibrationSamples: [null, { studentResponse: 'Gravity', teacherScore: NaN }],
      callGemini: async () => '{"status":"correct","score":85,"feedback":"Good","__proto__":{"polluted":true}}',
    });
    expect(calRes.status).toBe('correct');
    expect(calRes.score).toBe(85);
    expect(({}).polluted).toBeUndefined();
  });
});

describe('Phase 35 — safety_checker_module.js hardening', () => {
  let SC;

  beforeAll(() => {
    delete window.AlloModules?.SafetyChecker;
    loadAlloModule('safety_checker_module.js');
    SC = window.AlloModules.SafetyChecker;
  });

  afterEach(() => {
    delete window.__alloQrStudentMode;
    delete window.__alloAiUsable;
    delete window._isCanvasEnv;
    vi.restoreAllMocks();
  });

  it('guards prototype keys in severity/label lookups, fails closed on throwing __alloAiUsable, and allowlists AI categories', async () => {
    expect(SC.getSeverity('toString')).toBe('medium');
    expect(SC.getCategoryLabel('toString')).toBe('toString');

    // Throwing __alloAiUsable must fail closed (never call fetch)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });
    window._isCanvasEnv = true;
    window.__alloAiUsable = () => { throw new Error('gate crashed'); };
    await SC.aiCheck('student message here', 'chat', 'test-key', () => {});
    expect(fetchSpy).not.toHaveBeenCalled();

    // Unallowlisted AI category must be ignored
    window.__alloAiUsable = () => true;
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"safe":false,"category":"<img onerror=1>","confidence":0.99,"reason":"injected"}' }] } }],
      }),
    });
    const flags = [];
    await SC.aiCheck('student message here', 'chat', 'test-key', (f) => flags.push(f));
    expect(flags).toEqual([]);
  });
});

describe('Phase 35 — device_access_code_module.js hardening', () => {
  let access;

  beforeAll(() => {
    loadAlloModule('allo_crypto_module.js');
    delete window.AlloModules?.DeviceAccessCode;
    loadAlloModule('device_access_code_module.js');
    access = window.AlloModules.DeviceAccessCode;
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.APP_CONFIG = { _cfg_validation_key: '' };
  });

  it('caps max access code length, clamps tampered backoff timestamps, and strips prototype keys on settings save', async () => {
    await expect(access.setCode('x'.repeat(600), { iterations: 50000 }))
      .rejects.toMatchObject({ code: 'allo/access-code-too-long' });

    // Tampered far-future blockedUntil must clamp to MAX_BACKOFF_MS (30000)
    localStorage.setItem('alloflow_educator_access_backoff_v1', JSON.stringify({
      failures: 9,
      blockedUntil: Date.now() + 999999999,
    }));
    const wait = access._internal.retryAfter(Date.now());
    expect(wait).toBeLessThanOrEqual(30000);
    expect(wait).toBeGreaterThan(0);

    // Prototype pollution & prototype backend lookup safety
    const rawCfg = JSON.parse('{"backend":"toString","apiKey":"AIzaTest123","__proto__":{"polluted":true}}');
    const saved = access.splitAiSecretsForSave(rawCfg);
    expect(Object.prototype.hasOwnProperty.call(saved, '__proto__')).toBe(false);
    expect(({}).polluted).toBeUndefined();
  });
});

describe('Phase 35 — submission_crypto_module.js hardening', () => {
  let SC;

  beforeAll(() => {
    if (!window.crypto || !window.crypto.subtle) {
      Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true, writable: true });
    }
    delete window.AlloModules?.SubmissionCrypto;
    loadAlloModule('submission_crypto_module.js');
    SC = window.AlloModules.SubmissionCrypto;
  });

  it('rejects private keys on encrypt, public keys on decrypt, non-object payloads, and AES-128 downgrade attempts', async () => {
    const { publicJwk, privateJwk } = await SC.generateClassKeypair();

    await expect(SC.encryptSubmission({ a: 1 }, privateJwk)).rejects.toThrow(/private key/i);
    await expect(SC.encryptSubmission(null, publicJwk)).rejects.toThrow(/plain object/i);
    await expect(SC.encryptSubmission([1, 2], publicJwk)).rejects.toThrow(/plain object/i);

    const blob = await SC.encryptSubmission({ ans: 'ok' }, publicJwk);
    await expect(SC.decryptSubmission(blob, publicJwk)).rejects.toThrow(/private JWK/i);

    // Craft a blob with a wrapped 16-byte (AES-128) key — decryptSubmission must reject!
    const subtle = window.crypto.subtle;
    const pubKey = await subtle.importKey('jwk', publicJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    const aes128 = await subtle.generateKey({ name: 'AES-GCM', length: 128 }, true, ['encrypt']);
    const aes128Raw = await subtle.exportKey('raw', aes128);
    const wrapped128 = new Uint8Array(await subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, aes128Raw));
    const b64 = (u8) => Buffer.from(u8).toString('base64');
    await expect(SC.decryptSubmission({
      wrappedKey: b64(wrapped128),
      iv: b64(new Uint8Array(12)),
      ciphertext: b64(new Uint8Array(32)),
    }, privateJwk)).rejects.toThrow(/256 bits/i);
  });
});
