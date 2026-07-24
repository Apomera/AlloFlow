/**
 * AlloFlow — Client-side crypto helpers (Web Crypto, no server, no deps).
 *
 * Two HONEST capabilities, both 100% browser-side and Canvas-compatible. The
 * distinction between them is the whole point, so the doc states it plainly:
 *
 *   1. Password HASHING (PBKDF2-SHA256, random per-password salt, high iterations).
 *      Lets an educator password be CHECKED without ever storing or exposing the
 *      plaintext. This hides the password VALUE. It does NOT make a client-side
 *      UI gate unbypassable — the comparison still runs in the browser, so a
 *      determined user with DevTools can still skip the gate. Hiding a secret and
 *      enforcing access are different problems; this solves the first only.
 *
 *   2. Authenticated ENCRYPTION (AES-256-GCM, key derived from the password via
 *      PBKDF2). Makes sensitive data (e.g. an educator save file) mathematically
 *      unreadable without the password — there is no gate to bypass, the data is
 *      just ciphertext. This is the genuinely solid, server-free protection.
 *      Honest limits: it protects data AT REST only (once decrypted and on screen
 *      it is visible); there is NO password recovery (a forgotten password means
 *      the data is unrecoverable); and strength tracks the password's strength.
 *
 * Style mirrors submission_crypto_module.js: lazy crypto.subtle lookup + secure-context
 * guard, browser-native only. Dual-mode export: window.AlloModules.AlloCrypto in the
 * app, module.exports for the vitest suite.
 */
(function () {
  'use strict';

  var PBKDF2_ITERATIONS = 150000; // OWASP-range for PBKDF2-SHA256 (2023+); tests override with a smaller value
  var ENVELOPE_VERSION = 1;

  // Lazy lookup (per feedback_iife_lazy_lookup): resolve crypto at call time, not load time.
  function _cryptoObj() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) return window.crypto;
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) return globalThis.crypto;
    try { return require('crypto').webcrypto; } catch (e) { return null; } // Node / test env
  }
  function _subtle() {
    var c = _cryptoObj();
    if (!c || !c.subtle) throw new Error('Web Crypto API unavailable (crypto.subtle missing). A secure context is required (HTTPS, localhost, or the Canvas sandbox).');
    return c.subtle;
  }
  function _randomBytes(n) {
    var c = _cryptoObj();
    if (!c || !c.getRandomValues) throw new Error('Web Crypto getRandomValues unavailable.');
    var b = new Uint8Array(n); c.getRandomValues(b); return b;
  }

  // base64 <-> bytes, working in both browser (atob/btoa) and Node (Buffer).
  function _b64(bytes) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (typeof btoa === 'function') { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); }
    return Buffer.from(u8).toString('base64');
  }
  function _unb64(b64) {
    if (typeof atob === 'function') { var s = atob(b64); var u8 = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i); return u8; }
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  var _enc = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : { encode: function (s) { return new Uint8Array(Buffer.from(s, 'utf8')); } };
  var _dec = (typeof TextDecoder !== 'undefined') ? new TextDecoder() : { decode: function (b) { return Buffer.from(b).toString('utf8'); } };

  async function _deriveBits(password, salt, iterations, bits) {
    var subtle = _subtle();
    var baseKey = await subtle.importKey('raw', _enc.encode(String(password)), { name: 'PBKDF2' }, false, ['deriveBits']);
    return new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' }, baseKey, bits));
  }
  async function _deriveAesKey(password, salt, iterations) {
    var subtle = _subtle();
    var baseKey = await subtle.importKey('raw', _enc.encode(String(password)), { name: 'PBKDF2' }, false, ['deriveKey']);
    return subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  function _timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  // ── Password hashing (gate): hides the password value, does not enforce access ──
  async function hashPassword(password, iterations) {
    if (!password) throw new Error('hashPassword: empty password');
    var iter = iterations || PBKDF2_ITERATIONS;
    var salt = _randomBytes(16);
    var hash = await _deriveBits(password, salt, iter, 256);
    return { v: ENVELOPE_VERSION, kind: 'pwhash', alg: 'PBKDF2-SHA256', iter: iter, salt: _b64(salt), hash: _b64(hash) };
  }
  async function verifyPassword(password, env) {
    if (!password || !env || env.kind !== 'pwhash' || !env.salt || !env.hash) return false;
    var stored = _unb64(env.hash);
    var hash = await _deriveBits(password, _unb64(env.salt), env.iter || PBKDF2_ITERATIONS, stored.length * 8);
    return _timingSafeEqual(hash, stored);
  }

  // ── Authenticated encryption of JSON (data-at-rest): real, no gate to bypass ──
  async function encryptJSON(obj, password, iterations) {
    if (!password) throw new Error('encryptJSON: empty password');
    var iter = iterations || PBKDF2_ITERATIONS;
    var salt = _randomBytes(16);
    var iv = _randomBytes(12); // GCM standard IV size
    var key = await _deriveAesKey(password, salt, iter);
    var ct = new Uint8Array(await _subtle().encrypt({ name: 'AES-GCM', iv: iv }, key, _enc.encode(JSON.stringify(obj))));
    return { v: ENVELOPE_VERSION, kind: 'alloenc', alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iter: iter, salt: _b64(salt), iv: _b64(iv), ct: _b64(ct) };
  }
  function isEncryptedEnvelope(x) { return !!(x && x.kind === 'alloenc' && x.salt && x.iv && x.ct); }
  async function decryptJSON(env, password) {
    if (!isEncryptedEnvelope(env)) throw new Error('Not an AlloFlow encrypted envelope.');
    var key = await _deriveAesKey(password, _unb64(env.salt), env.iter || PBKDF2_ITERATIONS);
    var pt;
    try {
      pt = await _subtle().decrypt({ name: 'AES-GCM', iv: _unb64(env.iv) }, key, _unb64(env.ct));
    } catch (e) {
      // GCM authentication failure = wrong password OR tampered ciphertext (indistinguishable by design).
      throw new Error('WRONG_PASSWORD_OR_CORRUPT');
    }
    return JSON.parse(_dec.decode(new Uint8Array(pt)));
  }

  var AlloCrypto = {
    hashPassword: hashPassword,
    verifyPassword: verifyPassword,
    encryptJSON: encryptJSON,
    decryptJSON: decryptJSON,
    isEncryptedEnvelope: isEncryptedEnvelope,
    PBKDF2_ITERATIONS: PBKDF2_ITERATIONS,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AlloCrypto;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AlloCrypto = AlloCrypto;
    if (typeof console !== 'undefined') console.log('[CDN] AlloCrypto loaded');
  }
})();
