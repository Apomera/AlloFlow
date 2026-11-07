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

describe('saved AI provider key lock', () => {
  const opts = { iterations: FAST_ITERATIONS, now: 1000 };
  const KEY = 'AIza-teacher-secret-key';
  const CODE = 'River-Otter-42';
  const config = () => JSON.parse(localStorage.getItem('alloflow_ai_config') || 'null');
  const session = () => sessionStorage.getItem(access.AI_SESSION_KEY);
  const locked = () => localStorage.getItem(access.AI_LOCKED_KEY);
  const typeKey = (value = KEY) => {
    const next = access.splitAiSecretsForSave({ backend: 'gemini', apiKey: value, geminiApiKey: value, ttsProvider: 'auto' });
    localStorage.setItem('alloflow_ai_config', JSON.stringify(next));
    return next;
  };
  const allDeviceStorage = () => Object.keys(localStorage).map((k) => localStorage.getItem(k)).join('|');

  it('a newly typed key never reaches localStorage and lasts only for this tab', () => {
    const saved = typeKey();
    expect(saved.apiKey).toBeUndefined();
    expect(saved.ttsProvider).toBe('auto');
    expect(allDeviceStorage().includes(KEY)).toBe(false);
    expect(session().includes(KEY)).toBe(true);
    expect(access.aiKeyStatus()).toMatchObject({ saved: false, locked: false, unlocked: true, unsaved: true });
  });

  it('creating a code encrypts the key; nothing readable remains on the device', async () => {
    typeKey();
    expect(await access.protectAiKey(CODE, opts)).toMatchObject({ ok: true, reason: 'created' });
    expect(allDeviceStorage().includes(KEY)).toBe(false);
    expect(allDeviceStorage().includes(CODE)).toBe(false);
    expect(JSON.parse(locked()).kind).toBe('alloenc');
    expect(access.aiKeyStatus()).toMatchObject({ saved: true, locked: false, unsaved: false });
  });

  it('a new tab is locked until the right code is entered, and the wrong code opens nothing', async () => {
    typeKey();
    await access.protectAiKey(CODE, opts);
    sessionStorage.clear();
    expect(access.aiKeyStatus()).toMatchObject({ saved: true, locked: true, unlocked: false });
    expect(await access.verify('Wrong-Guess-99', opts)).toMatchObject({ ok: false });
    expect(session()).toBeNull();
    expect(await access.verify(CODE, opts)).toMatchObject({ ok: true });
    expect(JSON.parse(session()).apiKey).toBe(KEY);
    expect(access.aiKeyStatus()).toMatchObject({ locked: false, unlocked: true, unsaved: false });
  });

  it('entering a learner role wipes the tab copy of a saved key', async () => {
    typeKey();
    await access.protectAiKey(CODE, opts);
    expect(access.lockAiKey()).toBe(true);
    expect(session()).toBeNull();
    expect(allDeviceStorage().includes(KEY)).toBe(false);
    expect(access.aiKeyStatus().locked).toBe(true);
  });

  it('lockAiKey keeps a tab-only key, which has no other copy', () => {
    typeKey();
    expect(access.lockAiKey()).toBe(false);
    expect(session().includes(KEY)).toBe(true);
  });

  it('an older plaintext key stays usable, then is encrypted by the next verified code', async () => {
    await access.setCode(CODE, opts);
    localStorage.setItem('alloflow_ai_config', JSON.stringify({ backend: 'gemini', apiKey: KEY, models: { default: 'm' } }));
    expect(access.aiKeyStatus().plaintextOnDevice).toBe(true);
    // Saving an unrelated setting must not silently turn it into a tab-only key.
    const kept = access.splitAiSecretsForSave({ backend: 'gemini', apiKey: KEY, models: { default: 'other' } });
    expect(kept.apiKey).toBe(KEY);
    expect(await access.verify(CODE, opts)).toMatchObject({ ok: true });
    expect(allDeviceStorage().includes(KEY)).toBe(false);
    expect(config().models).toEqual({ default: 'm' });
    expect(access.aiKeyStatus()).toMatchObject({ saved: true, plaintextOnDevice: false, unlocked: true });
  });

  it('setting a code from educator settings also locks a tab-only key', async () => {
    typeKey();
    await access.setCode(CODE, opts);
    expect(access.aiKeyStatus()).toMatchObject({ saved: true, unsaved: false });
  });

  it('changing the code re-encrypts: only the new code opens the key', async () => {
    typeKey();
    await access.protectAiKey(CODE, opts);
    sessionStorage.clear();
    expect(await access.changeCode(CODE, 'New-Code-77', opts)).toMatchObject({ ok: true });
    sessionStorage.clear();
    expect(await access.unlockAiKeyWithCode(CODE, { ...opts, now: 2000 })).toMatchObject({ ok: false });
    expect(session()).toBeNull();
    expect(await access.unlockAiKeyWithCode('New-Code-77', { ...opts, now: 2001 })).toMatchObject({ ok: true });
    expect(JSON.parse(session()).apiKey).toBe(KEY);
  });

  it('removing the code leaves the key tab-only, never back in plaintext', async () => {
    typeKey();
    await access.protectAiKey(CODE, opts);
    expect(await access.removeCode(CODE, opts)).toMatchObject({ ok: true });
    expect(locked()).toBeNull();
    expect(allDeviceStorage().includes(KEY)).toBe(false);
    expect(access.aiKeyStatus()).toMatchObject({ saved: false, unlocked: true, unsaved: true });
  });

  it('a key edited after unlocking is flagged until re-saved, and the old copy stays decryptable', async () => {
    typeKey();
    await access.protectAiKey(CODE, opts);
    typeKey('AIza-replacement-key');
    expect(access.aiKeyStatus()).toMatchObject({ saved: true, unsaved: true });
    expect(await access.protectAiKey(CODE, opts)).toMatchObject({ ok: true, reason: 'saved' });
    expect(access.aiKeyStatus().unsaved).toBe(false);
    sessionStorage.clear();
    await access.verify(CODE, opts);
    expect(JSON.parse(session()).apiKey).toBe('AIza-replacement-key');
  });

  it('clearing the key field removes the saved copy too', async () => {
    typeKey();
    await access.protectAiKey(CODE, opts);
    access.splitAiSecretsForSave({ backend: 'gemini', apiKey: '', geminiApiKey: '' });
    expect(locked()).toBeNull();
    expect(session()).toBeNull();
  });

  it('forgetAiKey removes every copy, so a forgotten code is recoverable by re-entering the key', async () => {
    typeKey();
    await access.protectAiKey(CODE, opts);
    localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...config(), apiKey: 'stray' }));
    access.forgetAiKey();
    expect(locked()).toBeNull();
    expect(session()).toBeNull();
    expect(config().apiKey).toBeUndefined();
    expect(config().ttsProvider).toBe('auto');
  });

  it('a corrupt saved record never blocks the access check', async () => {
    await access.setCode(CODE, opts);
    localStorage.setItem(access.AI_LOCKED_KEY, JSON.stringify({ kind: 'alloenc', v: 1, junk: true }));
    expect(await access.verify(CODE, opts)).toMatchObject({ ok: true });
    expect(await access.unlockAiKeyWithCode(CODE, opts)).toMatchObject({ ok: false, reason: 'undecryptable' });
  });

  it('tells the host to rebuild its AI clients when the lock state changes', async () => {
    let fired = 0;
    const listener = () => { fired += 1; };
    window.addEventListener('alloflow:ai-key-lock-changed', listener);
    typeKey();
    await access.protectAiKey(CODE, opts);
    window.removeEventListener('alloflow:ai-key-lock-changed', listener);
    expect(fired).toBeGreaterThan(0);
  });
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
