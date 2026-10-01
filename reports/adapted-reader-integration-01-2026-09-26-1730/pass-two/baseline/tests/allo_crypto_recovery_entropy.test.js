import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AlloCrypto = require('../allo_crypto_module.js');

describe('AlloCrypto recovery-code entropy failure', () => {
  it('fails closed when cryptographically secure randomness is unavailable', () => {
    const cryptoObject = window.crypto;
    const random = vi.spyOn(cryptoObject, 'getRandomValues').mockImplementation(() => {
      throw new Error('entropy source failed');
    });
    try {
      expect(() => AlloCrypto.generateRecoveryCode()).toThrow(/entropy source failed/);
    } finally {
      random.mockRestore();
    }
  });
});
