import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { sliceBetween } from './helpers/anchored_slice.js';

// Class session codes (5 characters) and the desktop LAN live-session PIN gate who can join a
// class, but both came from Math.random(), which is not a cryptographic generator. Codes now
// come from crypto.getRandomValues with rejection sampling (no modulo bias over the 31-symbol
// alphabet), and the PIN from Node's crypto.randomInt. Left over from PR #4.
const ANTI = readFileSync(resolve(process.cwd(), process.env.SESSION_CODE_ANTI || 'AlloFlowANTI.txt'), 'utf8');
const MAIN = readFileSync(resolve(process.cwd(), process.env.SESSION_CODE_MAIN || 'desktop/electron/main.cjs'), 'utf8');
const SOURCE = sliceBetween(ANTI, 'const generateSessionCode = () => {', 'const escapeXml = ', { file: 'AlloFlowANTI.txt' });
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
// eslint-disable-next-line no-new-func
const make = (cryptoImpl) => new Function('crypto', 'window', SOURCE + '\nreturn generateSessionCode;')(cryptoImpl, {});

describe('class session codes', () => {
  it('come from crypto.getRandomValues, never Math.random, when crypto exists', () => {
    const spy = vi.spyOn(Math, 'random');
    const generate = make(webcrypto);
    for (let i = 0; i < 200; i++) generate();
    expect(spy, 'a session code was drawn from Math.random').not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('are 5 symbols from the confusable-free alphabet', () => {
    const generate = make(webcrypto);
    for (let i = 0; i < 2000; i++) expect(generate()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
  });

  it('reject bytes at or above 248 so every symbol is equally likely', () => {
    const queue = [[255, 248, 0, 1, 2, 3, 4, 30]];
    const fake = { getRandomValues: (arr) => { arr.set(queue.shift() || [5, 5, 5, 5, 5, 5, 5, 5]); return arr; } };
    expect(make(fake)()).toBe(ALPHABET[0] + ALPHABET[1] + ALPHABET[2] + ALPHABET[3] + ALPHABET[4]);
    const high = { getRandomValues: (arr) => { arr.set(queue.length ? queue.shift() : [247, 247, 247, 247, 247, 247, 247, 247]); return arr; } };
    expect(make(high)(), '247 is the last accepted byte (247 % 31 = 30)').toBe(ALPHABET[30].repeat(5));
  });

  it('cover the whole alphabet roughly evenly', () => {
    const generate = make(webcrypto);
    const counts = Object.fromEntries([...ALPHABET].map((c) => [c, 0]));
    for (let i = 0; i < 6200; i++) for (const c of generate()) counts[c]++;
    const values = Object.values(counts); // 31,000 symbols, expected 1,000 each
    expect(Math.min(...values)).toBeGreaterThan(820);
    expect(Math.max(...values)).toBeLessThan(1180);
  });

  it('still work where no crypto exists (very old browsers)', () => {
    expect(make(undefined)()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
  });
});

describe('self-hosted (Docker) data provider', () => {
  // src/dataProvider.js ships in the Docker image (docker/Dockerfile copies it to public/).
  const load = () => {
    const require = createRequire(import.meta.url);
    const file = resolve(process.cwd(), process.env.DATA_PROVIDER_PATH || 'src/dataProvider.js');
    delete require.cache[file];
    return require(file).DataProvider;
  };

  it('creates anonymous PocketBase accounts with crypto-random usernames and passwords', async () => {
    const DataProvider = load();
    const dp = new DataProvider({ backend: 'pocketbase', debugLog() {}, warnLog() {} });
    const bodies = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => { bodies.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ token: 't', record: { id: 'u1' } }) }; };
    const spy = vi.spyOn(Math, 'random');
    try {
      await dp._adapter.signInAnonymously();
    } finally {
      globalThis.fetch = realFetch;
    }
    expect(spy, 'an account credential came from Math.random').not.toHaveBeenCalled();
    spy.mockRestore();
    expect(bodies[0].username).toMatch(/^anon_[a-z0-9]{10}$/);
    expect(bodies[0].password).toMatch(/^[a-z0-9]{24}$/);
    expect(bodies[0].passwordConfirm).toBe(bodies[0].password);
  });

  it('makes 4-digit session codes from crypto', () => {
    const DataProvider = load();
    const dp = new DataProvider({ backend: 'local', debugLog() {}, warnLog() {} });
    const spy = vi.spyOn(Math, 'random');
    const codes = Array.from({ length: 500 }, () => dp.generateSessionCode());
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    for (const code of codes) expect(code).toMatch(/^[1-9]\d{3}$/);
    expect(new Set(codes).size).toBeGreaterThan(400);
  });
});

describe('desktop LAN live-session PIN', () => {
  it('is drawn from crypto.randomInt across all six-digit values', () => {
    const block = sliceBetween(MAIN, "if (!String(lan.pin || '').trim()) {", 'config = runtime.writeConfig(', { file: 'main.cjs' });
    expect(block).toContain('const pin = String(crypto.randomInt(100000, 1000000));');
    expect(block, 'the PIN still uses Math.random').not.toContain('Math.random');
    expect(MAIN).toMatch(/const crypto = require\('(node:)?crypto'\);/);
  });
});
