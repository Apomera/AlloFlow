// Golden master for submission_crypto_module.js (window.AlloModules.SubmissionCrypto)
// — the FERPA-confidentiality backbone for the offline-HTML student-submission
// feature. Students encrypt their work with the class PUBLIC key inside the
// exported worksheet; the teacher batch-decrypts with the class PRIVATE key.
// This is security-critical, deterministic crypto with ZERO prior tests — a
// silent regression in the wire format (b64/JWK/algorithm) would corrupt or
// expose student work. This pins the contract:
//   • encrypt -> decrypt round-trips to the identical payload
//   • a DIFFERENT class private key cannot decrypt (cross-class isolation)
//   • malformed / tampered blobs are rejected, not silently mis-decrypted
//   • the inline offline encryptor (INLINE_ENCRYPT_SCRIPT, injected verbatim
//     into exported worksheets) produces blobs the teacher path decrypts —
//     i.e. the two copies of the wire format cannot drift apart undetected.

import { describe, it, beforeAll, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { loadAlloModule } from './setup.js';

let SC;

beforeAll(() => {
  // submission_crypto reads window.crypto.subtle lazily (secure-context
  // requirement). jsdom does not reliably provide SubtleCrypto, so back it
  // with Node's WebCrypto when absent.
  if (!window.crypto || !window.crypto.subtle) {
    Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true, writable: true });
  }
  loadAlloModule('submission_crypto_module.js');
  SC = window.AlloModules.SubmissionCrypto;
});

const SAMPLE = {
  studentNickname: 'Bluejay',
  answers: { q1: 'photosynthesis', q2: 42, q3: ['a', 'b'] },
  freeText: 'A unicode check: café — résumé — 日本語 — 🌱',
  submittedAt: '2026-06-08T12:00:00.000Z',
};

describe('submission_crypto — public API surface', () => {
  it('registers the expected functions', () => {
    expect(SC, 'SubmissionCrypto should be registered').toBeTruthy();
    expect(typeof SC.generateClassKeypair).toBe('function');
    expect(typeof SC.encryptSubmission).toBe('function');
    expect(typeof SC.decryptSubmission).toBe('function');
    expect(typeof SC.INLINE_ENCRYPT_SCRIPT).toBe('string');
  });

  it('generateClassKeypair returns RSA-OAEP JWK halves', async () => {
    const { publicJwk, privateJwk } = await SC.generateClassKeypair();
    expect(publicJwk.kty).toBe('RSA');
    expect(privateJwk.kty).toBe('RSA');
    // public key has no private-only params; private key does (d = private exponent)
    expect(publicJwk.d).toBeUndefined();
    expect(privateJwk.d).toBeTruthy();
  });
});

describe('submission_crypto — round-trip + key isolation', () => {
  it('encrypt -> decrypt restores the exact payload', async () => {
    const { publicJwk, privateJwk } = await SC.generateClassKeypair();
    const blob = await SC.encryptSubmission(SAMPLE, publicJwk);
    // blob is the on-disk wire format: three base64 fields
    expect(typeof blob.wrappedKey).toBe('string');
    expect(typeof blob.iv).toBe('string');
    expect(typeof blob.ciphertext).toBe('string');
    const out = await SC.decryptSubmission(blob, privateJwk);
    expect(out).toEqual(SAMPLE);
  });

  it('does not leak the plaintext into the ciphertext blob', async () => {
    const { publicJwk } = await SC.generateClassKeypair();
    const blob = await SC.encryptSubmission(SAMPLE, publicJwk);
    const serialized = JSON.stringify(blob);
    expect(serialized).not.toContain('photosynthesis');
    expect(serialized).not.toContain('Bluejay');
  });

  it('a DIFFERENT class private key cannot decrypt (cross-class isolation)', async () => {
    const classA = await SC.generateClassKeypair();
    const classB = await SC.generateClassKeypair();
    const blob = await SC.encryptSubmission(SAMPLE, classA.publicJwk);
    await expect(SC.decryptSubmission(blob, classB.privateJwk)).rejects.toThrow(/unwrap|different class key/i);
  });

  it('rejects a malformed blob (missing fields)', async () => {
    const { privateJwk } = await SC.generateClassKeypair();
    await expect(SC.decryptSubmission({}, privateJwk)).rejects.toThrow(/malformed/i);
    await expect(SC.decryptSubmission({ wrappedKey: 'x', iv: 'y' }, privateJwk)).rejects.toThrow(/malformed/i);
    await expect(SC.decryptSubmission(null, privateJwk)).rejects.toThrow(/malformed/i);
  });

  it('rejects a tampered ciphertext (AES-GCM authentication)', async () => {
    const { publicJwk, privateJwk } = await SC.generateClassKeypair();
    const blob = await SC.encryptSubmission(SAMPLE, publicJwk);
    // Flip the first base64 char of the ciphertext to a different valid b64
    // char — keeps it decodable but corrupts the authenticated bytes.
    const first = blob.ciphertext[0];
    const tampered = { ...blob, ciphertext: (first === 'A' ? 'B' : 'A') + blob.ciphertext.slice(1) };
    await expect(SC.decryptSubmission(tampered, privateJwk)).rejects.toThrow();
  });
});

describe('submission_crypto — offline inline encryptor parity (no wire-format drift)', () => {
  it('INLINE_ENCRYPT_SCRIPT advertises the same hybrid wire format', () => {
    const s = SC.INLINE_ENCRYPT_SCRIPT;
    expect(s).toContain('window.__alloflowEncryptSubmission');
    expect(s).toContain('RSA-OAEP');
    expect(s).toContain('AES-GCM');
    expect(s).toContain('wrappedKey');
    expect(s).toContain('iv');
    expect(s).toContain('ciphertext');
  });

  it('student-offline encrypt (inline script) -> teacher decrypt restores the payload', async () => {
    const { publicJwk, privateJwk } = await SC.generateClassKeypair();
    // Evaluate the inline encryptor exactly as an exported worksheet would,
    // defining window.__alloflowEncryptSubmission.
    // eslint-disable-next-line no-eval
    (0, eval)(SC.INLINE_ENCRYPT_SCRIPT);
    expect(typeof window.__alloflowEncryptSubmission).toBe('function');
    const blob = await window.__alloflowEncryptSubmission(SAMPLE, publicJwk);
    const out = await SC.decryptSubmission(blob, privateJwk);
    expect(out).toEqual(SAMPLE);
  });
});
