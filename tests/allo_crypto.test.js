// allo_crypto.test.js - verifies password-envelope compatibility, input bounds,
// authenticated encryption, and the optional local-vault primitives.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { webcrypto } from 'node:crypto';

const require = createRequire(import.meta.url);
const AlloCrypto = require('../allo_crypto_module.js');
const FAST = AlloCrypto.MIN_PBKDF2_ITERATIONS;

const b64 = (bytes) => Buffer.from(bytes).toString('base64');

async function makeLegacyV1Envelope(value, password, iterations = FAST) {
  const enc = new TextEncoder();
  const salt = Uint8Array.from({ length: 16 }, (_, index) => index + 1);
  const iv = Uint8Array.from({ length: 12 }, (_, index) => index + 21);
  const baseKey = await webcrypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await webcrypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const ct = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)));
  return {
    v: 1,
    kind: 'alloenc',
    alg: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iter: iterations,
    salt: b64(salt),
    iv: b64(iv),
    ct: b64(ct),
  };
}

describe('AlloCrypto - password hashing (gate)', () => {
  it('publishes hardened v2 production defaults', () => {
    expect(AlloCrypto.PBKDF2_ITERATIONS).toBe(600000);
    expect(AlloCrypto.ENVELOPE_VERSION).toBe(2);
  });

  it('verifies the correct password and rejects wrong ones', async () => {
    const env = await AlloCrypto.hashPassword('correct horse battery', FAST);
    expect(env.v).toBe(2);
    expect(env.iter).toBe(FAST);
    expect(await AlloCrypto.verifyPassword('correct horse battery', env)).toBe(true);
    expect(await AlloCrypto.verifyPassword('wrong guess', env)).toBe(false);
  });

  it('never stores the plaintext password in the envelope', async () => {
    const env = await AlloCrypto.hashPassword('s3cr3t-pass-99', FAST);
    expect(JSON.stringify(env)).not.toContain('s3cr3t-pass-99');
    expect(env.hash).toBeTruthy();
    expect(env.salt).toBeTruthy();
    expect(env.kind).toBe('pwhash');
  });

  it('uses a fresh salt each time', async () => {
    const a = await AlloCrypto.hashPassword('same', FAST);
    const b = await AlloCrypto.hashPassword('same', FAST);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('reads a legacy v1 verifier and marks it for upgrade', async () => {
    const legacy = await AlloCrypto.hashPassword('legacy', FAST);
    legacy.v = 1;
    expect(await AlloCrypto.verifyPassword('legacy', legacy)).toBe(true);
    expect(AlloCrypto.needsPasswordUpgrade(legacy)).toBe(true);
  });

  it('rejects empty passwords and invalid requested iteration counts', async () => {
    await expect(AlloCrypto.hashPassword('', FAST)).rejects.toThrow();
    await expect(AlloCrypto.hashPassword('pw', AlloCrypto.MIN_PBKDF2_ITERATIONS - 1)).rejects.toThrow(/integer between/);
    await expect(AlloCrypto.hashPassword('pw', 10000.5)).rejects.toThrow(/integer between/);
    await expect(AlloCrypto.hashPassword('pw', AlloCrypto.MAX_PBKDF2_ITERATIONS + 1)).rejects.toThrow(/integer between/);
  });

  it('rejects imported verifier iteration and binary-field abuse before deriving', async () => {
    const env = await AlloCrypto.hashPassword('pw', FAST);
    expect(await AlloCrypto.verifyPassword('pw', { ...env, iter: AlloCrypto.MAX_PBKDF2_ITERATIONS + 1 })).toBe(false);
    expect(await AlloCrypto.verifyPassword('pw', { ...env, salt: b64(Buffer.alloc(15)) })).toBe(false);
    expect(await AlloCrypto.verifyPassword('pw', { ...env, hash: b64(Buffer.alloc(31)) })).toBe(false);
  });
});

describe('AlloCrypto - password-based authenticated encryption', () => {
  const data = { mode: 'teacher', students: [{ id: 1, note: 'confidential behavior note' }], score: 42 };

  it('round-trips v2 data with the right password', async () => {
    const env = await AlloCrypto.encryptJSON(data, 'pw', FAST);
    expect(env.v).toBe(2);
    expect(AlloCrypto.isEncryptedEnvelope(env)).toBe(true);
    expect(await AlloCrypto.decryptJSON(env, 'pw')).toEqual(data);
  });

  it('never stores plaintext content', async () => {
    const env = await AlloCrypto.encryptJSON(data, 'pw', FAST);
    const blob = JSON.stringify(env);
    expect(blob).not.toContain('confidential behavior note');
    expect(blob).not.toContain('teacher');
  });

  it('fails for a wrong password or authenticated-field/ciphertext tampering', async () => {
    const env = await AlloCrypto.encryptJSON(data, 'pw', FAST);
    await expect(AlloCrypto.decryptJSON(env, 'nope')).rejects.toThrow(/WRONG_PASSWORD_OR_CORRUPT/);
    await expect(AlloCrypto.decryptJSON({ ...env, iter: FAST + 1 }, 'pw')).rejects.toThrow(/WRONG_PASSWORD_OR_CORRUPT/);
    const ct = Buffer.from(env.ct, 'base64');
    ct[0] ^= 0xff;
    await expect(AlloCrypto.decryptJSON({ ...env, ct: ct.toString('base64') }, 'pw')).rejects.toThrow(/WRONG_PASSWORD_OR_CORRUPT/);
  });

  it('decrypts deterministic legacy v1 AES-GCM data without v2 AAD', async () => {
    const legacy = await makeLegacyV1Envelope(data, 'legacy-password');
    expect(AlloCrypto.isEncryptedEnvelope(legacy)).toBe(true);
    expect(await AlloCrypto.decryptJSON(legacy, 'legacy-password')).toEqual(data);
    expect(AlloCrypto.needsPasswordUpgrade(legacy)).toBe(true);
  });

  it('survives a JSON round-trip', async () => {
    const env = await AlloCrypto.encryptJSON(data, 'pw', FAST);
    expect(await AlloCrypto.decryptJSON(JSON.parse(JSON.stringify(env)), 'pw')).toEqual(data);
  });

  it('strictly rejects malformed imported envelopes', async () => {
    const env = await AlloCrypto.encryptJSON(data, 'pw', FAST);
    await expect(AlloCrypto.decryptJSON({ not: 'an envelope' }, 'pw')).rejects.toThrow();
    await expect(AlloCrypto.decryptJSON({ ...env, v: 99 }, 'pw')).rejects.toThrow(/version/);
    await expect(AlloCrypto.decryptJSON({ ...env, iter: AlloCrypto.MAX_PBKDF2_ITERATIONS + 1 }, 'pw')).rejects.toThrow(/integer between/);
    await expect(AlloCrypto.decryptJSON({ ...env, iv: b64(Buffer.alloc(13)) }, 'pw')).rejects.toThrow(/base64|decoded size/);
    await expect(AlloCrypto.decryptJSON({ ...env, salt: b64(Buffer.alloc(15)) }, 'pw')).rejects.toThrow(/decoded size/);
    await expect(AlloCrypto.decryptJSON({ ...env, ct: b64(Buffer.alloc(15)) }, 'pw')).rejects.toThrow(/decoded size/);
  });
});

describe('AlloCrypto - optional local vault primitives', () => {
  const record = { workspace: { title: 'Private plan', history: ['one', 'two'] } };
  const aad = { namespace: 'workspace_recovery', key: 'store_v1' };

  it('creates a non-extractable DEK and wraps/unlocks it with a password', async () => {
    const dek = await AlloCrypto.createVaultKey();
    expect(dek.type).toBe('secret');
    expect(dek.extractable).toBe(false);
    expect(dek.algorithm.name).toBe('AES-GCM');
    expect(dek.algorithm.length).toBe(256);

    const wrapped = await AlloCrypto.wrapVaultKey(dek, 'vault password', { iterations: FAST });
    expect(wrapped).toMatchObject({ v: 2, kind: 'allovault-key', iter: FAST, alg: 'AES-256-GCM' });
    expect(JSON.stringify(wrapped)).not.toContain('vault password');
    const unlocked = await AlloCrypto.unwrapVaultKey(JSON.parse(JSON.stringify(wrapped)), 'vault password');
    expect(unlocked.extractable).toBe(false);

    const encrypted = await AlloCrypto.encryptRecord(record, unlocked, aad);
    expect(await AlloCrypto.decryptRecord(encrypted, dek, { key: 'store_v1', namespace: 'workspace_recovery' })).toEqual(record);
  });

  it('rejects a wrong wrap password and tampered wrapped key', async () => {
    const dek = await AlloCrypto.createVaultKey();
    const wrapped = await AlloCrypto.wrapVaultKey(dek, 'right', FAST);
    await expect(AlloCrypto.unwrapVaultKey(wrapped, 'wrong')).rejects.toThrow(/WRONG_PASSWORD_OR_CORRUPT/);
    const ct = Buffer.from(wrapped.ct, 'base64');
    ct[0] ^= 1;
    await expect(AlloCrypto.unwrapVaultKey({ ...wrapped, ct: b64(ct) }, 'right')).rejects.toThrow(/WRONG_PASSWORD_OR_CORRUPT/);
  });

  it('re-wraps the same DEK under a new password', async () => {
    const dek = await AlloCrypto.createVaultKey();
    const original = await AlloCrypto.wrapVaultKey(dek, 'old password', FAST);
    const changed = await AlloCrypto.rewrapVaultKey(original, 'old password', 'new password', { iterations: FAST });
    await expect(AlloCrypto.unwrapVaultKey(changed, 'old password')).rejects.toThrow(/WRONG_PASSWORD_OR_CORRUPT/);
    const unlocked = await AlloCrypto.unwrapVaultKey(changed, 'new password');
    const encrypted = await AlloCrypto.encryptRecord(record, dek, aad);
    expect(await AlloCrypto.decryptRecord(encrypted, unlocked, aad)).toEqual(record);
  });

  it('binds record ciphertext to AAD and detects record tampering', async () => {
    const dek = await AlloCrypto.createVaultKey();
    const encrypted = await AlloCrypto.encryptRecord(record, dek, aad);
    expect(JSON.stringify(encrypted)).not.toContain('Private plan');
    await expect(AlloCrypto.decryptRecord(encrypted, dek, { namespace: 'workspace_recovery', key: 'another' })).rejects.toThrow(/WRONG_KEY_OR_CORRUPT/);
    const ct = Buffer.from(encrypted.ct, 'base64');
    ct[ct.length - 1] ^= 1;
    await expect(AlloCrypto.decryptRecord({ ...encrypted, ct: b64(ct) }, dek, aad)).rejects.toThrow(/WRONG_KEY_OR_CORRUPT/);
  });

  it('requires non-empty AAD and validates serialized fields', async () => {
    const dek = await AlloCrypto.createVaultKey();
    await expect(AlloCrypto.encryptRecord(record, dek, '')).rejects.toThrow(/AAD is required/);
    const encrypted = await AlloCrypto.encryptRecord(record, dek, aad);
    await expect(AlloCrypto.decryptRecord({ ...encrypted, iv: b64(Buffer.alloc(11)) }, dek, aad)).rejects.toThrow(/decoded size/);
    await expect(AlloCrypto.wrapVaultKey(dek, 'pw', { iterations: AlloCrypto.MAX_PBKDF2_ITERATIONS + 1 })).rejects.toThrow(/integer between/);
  });
});

describe('AlloCrypto - offline recovery codes', () => {
  it('generates a 160-bit, checksummed, unambiguous grouped code', () => {
    const code = AlloCrypto.generateRecoveryCode();
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){8}$/);
    expect(AlloCrypto.validateRecoveryCode(code)).toBe(true);
    expect(AlloCrypto.normalizeRecoveryCode(code.toLowerCase().replace(/-/g, ' '))).toBe(code);
  });

  it('uses fresh secure randomness and detects transcription changes', () => {
    const codes = new Set(Array.from({ length: 128 }, () => AlloCrypto.generateRecoveryCode()));
    expect(codes.size).toBe(128);
    const code = [...codes][0];
    const compact = code.replace(/-/g, '');
    const changed = (compact[0] === '0' ? '1' : '0') + compact.slice(1);
    expect(AlloCrypto.validateRecoveryCode(changed)).toBe(false);
    expect(AlloCrypto.validateRecoveryCode(code.slice(0, -1) + (code.endsWith('0') ? '1' : '0'))).toBe(false);
  });

  it('rejects ambiguous characters and malformed input', () => {
    const code = AlloCrypto.generateRecoveryCode();
    expect(AlloCrypto.validateRecoveryCode(code.replace(/[0-9A-HJKMNP-TV-Z]/, 'O'))).toBe(false);
    expect(AlloCrypto.validateRecoveryCode('not a recovery code')).toBe(false);
    expect(() => AlloCrypto.normalizeRecoveryCode('')).toThrow(/invalid length|required/i);
  });

  it('returns the recovery secret without exposing persistence helpers', () => {
    expect(AlloCrypto.generateRecoveryCode()).toBeTruthy();
    expect(Object.keys(AlloCrypto).some(key => /store|persist|save/i.test(key))).toBe(false);
  });
});