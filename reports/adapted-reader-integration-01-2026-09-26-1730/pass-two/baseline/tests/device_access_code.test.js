import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

const FAST_ITERATIONS = 50000;
let access;

beforeAll(() => {
  loadAlloModule('allo_crypto_module.js');
  loadAlloModule('device_access_code_module.js');
  access = window.AlloModules.DeviceAccessCode;
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.APP_CONFIG = { _cfg_validation_key: '' };
});

describe('optional educator access code', () => {
  it('is disabled by default and stores only a salted verifier', async () => {
    expect(access.status()).toMatchObject({ configured: false, legacyPlaintextConfigured: false });
    await access.setCode('River-Otter-42', { iterations: FAST_ITERATIONS });
    const raw = localStorage.getItem(access.STORAGE_KEY);
    const verifier = JSON.parse(raw);
    expect(verifier).toMatchObject({ kind: 'pwhash', iter: FAST_ITERATIONS });
    expect(verifier.salt).toBeTruthy();
    expect(verifier.hash).toBeTruthy();
    expect(raw).not.toContain('River-Otter-42');
    expect(window.APP_CONFIG._cfg_validation_key).toEqual(verifier);
  });

  it('verifies correct codes and applies deterministic retry backoff', async () => {
    await access.setCode('Correct-Horse', { iterations: FAST_ITERATIONS });
    expect(await access.verify('wrong-1', { now: 1000 })).toMatchObject({ ok: false, retryAfterMs: 0 });
    expect(await access.verify('wrong-2', { now: 1000 })).toMatchObject({ ok: false, retryAfterMs: 0 });
    expect(await access.verify('wrong-3', { now: 1000 })).toMatchObject({ ok: false, retryAfterMs: 1000 });
    expect(await access.verify('Correct-Horse', { now: 1500 })).toMatchObject({ ok: false, reason: 'backoff', retryAfterMs: 500 });
    expect(await access.verify('Correct-Horse', { now: 2000 })).toMatchObject({ ok: true, reason: 'verified' });
  });

  it('requires the current code to change or remove the verifier', async () => {
    await access.setCode('First-Code', { iterations: FAST_ITERATIONS });
    expect(await access.changeCode('incorrect', 'Second-Code', { now: 1000, iterations: FAST_ITERATIONS })).toMatchObject({ ok: false });
    expect(await access.changeCode('First-Code', 'Second-Code', { now: 1001, iterations: FAST_ITERATIONS })).toMatchObject({ ok: true, reason: 'changed' });
    expect(await access.removeCode('First-Code', { now: 1002 })).toMatchObject({ ok: false });
    expect(await access.removeCode('Second-Code', { now: 1003 })).toMatchObject({ ok: true, reason: 'removed' });
    expect(access.status().configured).toBe(false);
  });

  it('migrates a legacy runtime plaintext value before checking it', async () => {
    window.APP_CONFIG._cfg_validation_key = 'Legacy-Code';
    expect(await access.initialize({ iterations: FAST_ITERATIONS })).toEqual({ configured: true, migratedLegacy: true });
    const raw = localStorage.getItem(access.STORAGE_KEY);
    expect(raw).not.toContain('Legacy-Code');
    expect(typeof window.APP_CONFIG._cfg_validation_key).toBe('object');
    expect(await access.verify('Legacy-Code', { now: 1000 })).toMatchObject({ ok: true });
  });

  it('never exposes a vault key when the gate succeeds', async () => {
    await access.setCode('Gate-Only-Code', { iterations: FAST_ITERATIONS });
    const result = await access.verify('Gate-Only-Code', { now: 1000 });
    expect(result).toEqual({ ok: true, reason: 'verified', retryAfterMs: 0 });
    expect(result).not.toHaveProperty('key');
    expect(result).not.toHaveProperty('vault');
  });
});
