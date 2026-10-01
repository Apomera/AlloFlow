import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AlloCrypto = require('../allo_crypto_module.js');
const FAST = AlloCrypto.MIN_PBKDF2_ITERATIONS;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function makeNonCanonicalPaddedBase64(value) {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  if (!padding) throw new Error('fixture needs padded base64');
  const index = value.length - padding - 1;
  const current = ALPHABET.indexOf(value[index]);
  const meaningfulMask = padding === 2 ? 0b110000 : 0b111100;
  const unusedMask = padding === 2 ? 0b001111 : 0b000011;
  const changed = (current & meaningfulMask) | (((current & unusedMask) + 1) & unusedMask);
  return value.slice(0, index) + ALPHABET[changed] + value.slice(index + 1);
}

describe('AlloCrypto imported envelope canonical base64', () => {
  it('rejects non-canonical encodings that decode to the same bytes', async () => {
    const env = await AlloCrypto.encryptJSON({ private: 'value' }, 'password', FAST);
    const nonCanonicalSalt = makeNonCanonicalPaddedBase64(env.salt);
    expect(Buffer.from(nonCanonicalSalt, 'base64')).toEqual(Buffer.from(env.salt, 'base64'));
    await expect(AlloCrypto.decryptJSON({ ...env, salt: nonCanonicalSalt }, 'password'))
      .rejects.toThrow(/Invalid base64 field/);
  });
});
