// allo_crypto.test.js — verifies the Web Crypto helpers behave correctly and honestly:
// the password is never stored in the clear, wrong passwords fail, and tampering is detected.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AlloCrypto = require('../allo_crypto_module.js');

const FAST = 50000; // fewer iterations so tests stay quick; production default is 150000

describe('AlloCrypto — password hashing (gate)', () => {
  it('verifies the correct password and rejects wrong ones', async () => {
    const env = await AlloCrypto.hashPassword('correct horse battery', FAST);
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

  it('uses a fresh salt each time (same password -> different envelope)', async () => {
    const a = await AlloCrypto.hashPassword('same', FAST);
    const b = await AlloCrypto.hashPassword('same', FAST);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('rejects an empty password at hash time', async () => {
    await expect(AlloCrypto.hashPassword('', FAST)).rejects.toThrow();
  });
});

describe('AlloCrypto — authenticated encryption (data at rest)', () => {
  const data = { mode: 'teacher', students: [{ id: 1, note: 'confidential behavior note' }], score: 42 };

  it('round-trips encrypt -> decrypt with the right password', async () => {
    const env = await AlloCrypto.encryptJSON(data, 'pw', FAST);
    expect(AlloCrypto.isEncryptedEnvelope(env)).toBe(true);
    expect(await AlloCrypto.decryptJSON(env, 'pw')).toEqual(data);
  });

  it('never stores plaintext content in the envelope', async () => {
    const env = await AlloCrypto.encryptJSON(data, 'pw', FAST);
    const blob = JSON.stringify(env);
    expect(blob).not.toContain('confidential behavior note');
    expect(blob).not.toContain('teacher');
  });

  it('fails to decrypt with the wrong password', async () => {
    const env = await AlloCrypto.encryptJSON(data, 'pw', FAST);
    await expect(AlloCrypto.decryptJSON(env, 'nope')).rejects.toThrow(/WRONG_PASSWORD_OR_CORRUPT/);
  });

  it('detects tampering (authenticated GCM)', async () => {
    const env = await AlloCrypto.encryptJSON(data, 'pw', FAST);
    const ct = Buffer.from(env.ct, 'base64');
    ct[0] ^= 0xff; // flip a byte in the ciphertext
    env.ct = ct.toString('base64');
    await expect(AlloCrypto.decryptJSON(env, 'pw')).rejects.toThrow(/WRONG_PASSWORD_OR_CORRUPT/);
  });

  it('envelope survives JSON round-trip (can ride a save file)', async () => {
    const env = await AlloCrypto.encryptJSON(data, 'pw', FAST);
    const reparsed = JSON.parse(JSON.stringify(env));
    expect(await AlloCrypto.decryptJSON(reparsed, 'pw')).toEqual(data);
  });

  it('rejects non-envelope input on decrypt', async () => {
    await expect(AlloCrypto.decryptJSON({ not: 'an envelope' }, 'pw')).rejects.toThrow();
  });
});
