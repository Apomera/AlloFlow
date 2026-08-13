/**
 * AlloFlow - client-side crypto helpers (Web Crypto, no server, no deps).
 *
 * Password verifiers hide a configured password value, but do not turn a client-side
 * UI gate into an authorization boundary. Authenticated encryption protects at-rest
 * data until the password-derived key or an unlocked vault key is available. There is
 * intentionally no password recovery.
 *
 * New password envelopes use PBKDF2-SHA256 with 600,000 iterations and envelope v2.
 * Existing v1 envelopes remain readable using their stored iteration count. Imported
 * envelopes are bounded before decoding or running a KDF.
 *
 * Style mirrors submission_crypto_module.js: lazy crypto.subtle lookup + secure-context
 * guard, browser-native only. Dual-mode export: window.AlloModules.AlloCrypto in the
 * app, module.exports for the vitest suite.
 */
(function () {
  'use strict';

  var PBKDF2_ITERATIONS = 600000;
  var MIN_PBKDF2_ITERATIONS = 10000;
  var MAX_PBKDF2_ITERATIONS = 2000000;
  var ENVELOPE_VERSION = 2;
  var LEGACY_ENVELOPE_VERSION = 1;
  var MAX_PASSWORD_BYTES = 4096;
  var MAX_AAD_BYTES = 65536;
  var MAX_CIPHERTEXT_BYTES = 192 * 1024 * 1024;
  var _vaultKeyMaterial = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

  // Lazy lookup: resolve crypto at call time, not load time.
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
    if (typeof btoa === 'function') {
      var chunks = [];
      var chunkSize = 0x8000;
      for (var offset = 0; offset < u8.length; offset += chunkSize) {
        var chunk = u8.subarray(offset, Math.min(offset + chunkSize, u8.length));
        var s = '';
        for (var i = 0; i < chunk.length; i++) s += String.fromCharCode(chunk[i]);
        chunks.push(s);
      }
      return btoa(chunks.join(''));
    }
    return Buffer.from(u8).toString('base64');
  }
  function _unb64(b64) {
    if (typeof atob === 'function') {
      var s = atob(b64);
      var u8 = new Uint8Array(s.length);
      for (var i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
      return u8;
    }
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  var _enc = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : { encode: function (s) { return new Uint8Array(Buffer.from(s, 'utf8')); } };
  var _dec = (typeof TextDecoder !== 'undefined') ? new TextDecoder('utf-8', { fatal: true }) : { decode: function (b) { return Buffer.from(b).toString('utf8'); } };

  function _concatBytes(a, b) {
    var out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }
  function _validatedIterations(value, label) {
    if (!Number.isInteger(value) || value < MIN_PBKDF2_ITERATIONS || value > MAX_PBKDF2_ITERATIONS) {
      throw new Error((label || 'PBKDF2 iterations') + ' must be an integer between ' + MIN_PBKDF2_ITERATIONS + ' and ' + MAX_PBKDF2_ITERATIONS + '.');
    }
    return value;
  }
  function _requestedIterations(value) {
    return _validatedIterations(value === undefined ? PBKDF2_ITERATIONS : value, 'PBKDF2 iterations');
  }
  function _optionIterations(options) {
    if (options === undefined || options === null) return PBKDF2_ITERATIONS;
    if (typeof options === 'number') return _requestedIterations(options);
    if (typeof options !== 'object') throw new Error('Vault wrap options must be an object or iteration count.');
    return _requestedIterations(options.iterations === undefined ? options.iter : options.iterations);
  }
  function _passwordBytes(password, label) {
    if (typeof password !== 'string' || !password) throw new Error((label || 'Password') + ': empty password');
    var bytes = _enc.encode(password);
    if (bytes.length > MAX_PASSWORD_BYTES) throw new Error((label || 'Password') + ' is too long.');
    return bytes;
  }
  function _assertVersion(env, label, allowLegacy) {
    var ok = env && (env.v === ENVELOPE_VERSION || (allowLegacy && env.v === LEGACY_ENVELOPE_VERSION));
    if (!ok) throw new Error('Unsupported ' + label + ' envelope version.');
  }
  function _decodeField(env, name, minBytes, maxBytes, exactBytes) {
    var value = env && env[name];
    var maxEncodedLength = Math.ceil(maxBytes / 3) * 4;
    if (typeof value !== 'string' || !value || value.length > maxEncodedLength || value.length % 4 !== 0
      || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
      throw new Error('Invalid base64 field: ' + name + '.');
    }
    var padding = value.endsWith('==') ? 2 : (value.endsWith('=') ? 1 : 0);
    var decodedLength = (value.length / 4) * 3 - padding;
    if ((exactBytes !== undefined && decodedLength !== exactBytes) || decodedLength < minBytes || decodedLength > maxBytes) {
      throw new Error('Invalid decoded size for field: ' + name + '.');
    }
    var decoded = _unb64(value);
    if (decoded.length !== decodedLength || _b64(decoded) !== value) throw new Error('Invalid base64 field: ' + name + '.');
    return decoded;
  }
  function _serializeJSON(value, label) {
    var json;
    try { json = JSON.stringify(value); } catch (e) { throw new Error((label || 'Value') + ' is not JSON-serializable.'); }
    if (json === undefined) throw new Error((label || 'Value') + ' is not JSON-serializable.');
    var bytes = _enc.encode(json);
    if (bytes.length + 16 > MAX_CIPHERTEXT_BYTES) throw new Error((label || 'Value') + ' is too large to encrypt.');
    return bytes;
  }
  function _parseJSON(bytes, failureCode) {
    try { return JSON.parse(_dec.decode(bytes)); } catch (e) { throw new Error(failureCode || 'INVALID_ENCRYPTED_JSON'); }
  }

  async function _deriveBits(password, salt, iterations, bits) {
    var subtle = _subtle();
    var baseKey = await subtle.importKey('raw', _passwordBytes(password, 'Password'), { name: 'PBKDF2' }, false, ['deriveBits']);
    return new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' }, baseKey, bits));
  }
  async function _deriveAesKey(password, salt, iterations) {
    var subtle = _subtle();
    var baseKey = await subtle.importKey('raw', _passwordBytes(password, 'Password'), { name: 'PBKDF2' }, false, ['deriveKey']);
    return subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  function _timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  function _validatePasswordHashEnvelope(env) {
    if (!env || env.kind !== 'pwhash' || env.alg !== 'PBKDF2-SHA256') throw new Error('Not an AlloFlow password verifier.');
    _assertVersion(env, 'password verifier', true);
    var iter = _validatedIterations(env.iter, 'Stored PBKDF2 iterations');
    return { iter: iter, salt: _decodeField(env, 'salt', 16, 16, 16), hash: _decodeField(env, 'hash', 32, 32, 32) };
  }
  function _validateEncryptedEnvelope(env) {
    if (!env || env.kind !== 'alloenc' || env.alg !== 'AES-256-GCM' || env.kdf !== 'PBKDF2-SHA256') throw new Error('Not an AlloFlow encrypted envelope.');
    _assertVersion(env, 'encrypted data', true);
    var iter = _validatedIterations(env.iter, 'Stored PBKDF2 iterations');
    return {
      iter: iter,
      salt: _decodeField(env, 'salt', 16, 16, 16),
      iv: _decodeField(env, 'iv', 12, 12, 12),
      ct: _decodeField(env, 'ct', 16, MAX_CIPHERTEXT_BYTES)
    };
  }

  // Password hashing (gate): hides the password value, does not enforce access.
  async function hashPassword(password, iterations) {
    _passwordBytes(password, 'hashPassword');
    var iter = _requestedIterations(iterations);
    var salt = _randomBytes(16);
    var hash = await _deriveBits(password, salt, iter, 256);
    return { v: ENVELOPE_VERSION, kind: 'pwhash', alg: 'PBKDF2-SHA256', iter: iter, salt: _b64(salt), hash: _b64(hash) };
  }
  async function verifyPassword(password, env) {
    if (typeof password !== 'string' || !password) return false;
    var parsed;
    try { parsed = _validatePasswordHashEnvelope(env); } catch (e) { return false; }
    var hash = await _deriveBits(password, parsed.salt, parsed.iter, parsed.hash.length * 8);
    return _timingSafeEqual(hash, parsed.hash);
  }

  function _passwordEnvelopeAad(env) {
    return _enc.encode('AlloFlow|alloenc|v' + env.v + '|AES-256-GCM|PBKDF2-SHA256|' + env.iter);
  }

  // Authenticated encryption of JSON (data-at-rest): real, no gate to bypass.
  async function encryptJSON(obj, password, iterations) {
    _passwordBytes(password, 'encryptJSON');
    var iter = _requestedIterations(iterations);
    var salt = _randomBytes(16);
    var iv = _randomBytes(12); // GCM standard IV size
    var key = await _deriveAesKey(password, salt, iter);
    var env = { v: ENVELOPE_VERSION, kind: 'alloenc', alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iter: iter, salt: _b64(salt), iv: _b64(iv) };
    var ct = new Uint8Array(await _subtle().encrypt({ name: 'AES-GCM', iv: iv, additionalData: _passwordEnvelopeAad(env) }, key, _serializeJSON(obj, 'encryptJSON value')));
    env.ct = _b64(ct);
    return env;
  }
  function isEncryptedEnvelope(x) {
    try { _validateEncryptedEnvelope(x); return true; } catch (e) { return false; }
  }
  async function decryptJSON(env, password) {
    _passwordBytes(password, 'decryptJSON');
    var parsed = _validateEncryptedEnvelope(env);
    var key = await _deriveAesKey(password, parsed.salt, parsed.iter);
    var algorithm = { name: 'AES-GCM', iv: parsed.iv };
    if (env.v === ENVELOPE_VERSION) algorithm.additionalData = _passwordEnvelopeAad(env);
    var pt;
    try {
      pt = await _subtle().decrypt(algorithm, key, parsed.ct);
    } catch (e) {
      // GCM authentication failure = wrong password OR tampered ciphertext.
      throw new Error('WRONG_PASSWORD_OR_CORRUPT');
    }
    return _parseJSON(new Uint8Array(pt), 'INVALID_ENCRYPTED_JSON');
  }

  function needsPasswordUpgrade(env) {
    if (!env || (env.kind !== 'pwhash' && env.kind !== 'alloenc' && env.kind !== 'allovault-key')) return false;
    return env.v !== ENVELOPE_VERSION || !Number.isInteger(env.iter) || env.iter < PBKDF2_ITERATIONS;
  }

  function _assertVaultKey(key) {
    if (!key || key.type !== 'secret' || !key.algorithm || key.algorithm.name !== 'AES-GCM' || key.algorithm.length !== 256 || key.extractable !== false) {
      throw new Error('Expected a non-extractable AES-256-GCM vault key.');
    }
    return key;
  }
  function _rememberVaultKey(key, material) {
    if (!_vaultKeyMaterial) throw new Error('WeakMap support is required for vault keys.');
    _vaultKeyMaterial.set(key, new Uint8Array(material));
    return key;
  }
  async function _importVaultKey(material) {
    if (!(material instanceof Uint8Array) || material.length !== 32) throw new Error('Invalid vault key material.');
    var key = await _subtle().importKey('raw', material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    return _rememberVaultKey(key, material);
  }
  async function createVaultKey() {
    var material = _randomBytes(32);
    try { return await _importVaultKey(material); } finally { material.fill(0); }
  }

  function _vaultWrapAad(env) {
    return _enc.encode('AlloFlow|allovault-key|v' + env.v + '|AES-256-GCM|PBKDF2-SHA256|' + env.iter);
  }
  function _validateWrappedVaultKey(env) {
    if (!env || env.kind !== 'allovault-key' || env.alg !== 'AES-256-GCM' || env.kdf !== 'PBKDF2-SHA256') throw new Error('Not an AlloFlow wrapped vault key.');
    _assertVersion(env, 'wrapped vault key', false);
    var iter = _validatedIterations(env.iter, 'Stored PBKDF2 iterations');
    return {
      iter: iter,
      salt: _decodeField(env, 'salt', 16, 16, 16),
      iv: _decodeField(env, 'iv', 12, 12, 12),
      ct: _decodeField(env, 'ct', 48, 48, 48)
    };
  }
  async function wrapVaultKey(dek, password, options) {
    _assertVaultKey(dek);
    _passwordBytes(password, 'wrapVaultKey');
    var material = _vaultKeyMaterial && _vaultKeyMaterial.get(dek);
    if (!material) throw new Error('Vault key was not created or unlocked by this AlloCrypto instance.');
    var iter = _optionIterations(options);
    var salt = _randomBytes(16);
    var iv = _randomBytes(12);
    var env = { v: ENVELOPE_VERSION, kind: 'allovault-key', alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iter: iter, salt: _b64(salt), iv: _b64(iv) };
    var kek = await _deriveAesKey(password, salt, iter);
    var ct = await _subtle().encrypt({ name: 'AES-GCM', iv: iv, additionalData: _vaultWrapAad(env) }, kek, material);
    env.ct = _b64(new Uint8Array(ct));
    return env;
  }
  async function unwrapVaultKey(env, password) {
    _passwordBytes(password, 'unwrapVaultKey');
    var parsed = _validateWrappedVaultKey(env);
    var kek = await _deriveAesKey(password, parsed.salt, parsed.iter);
    var material;
    try {
      material = new Uint8Array(await _subtle().decrypt({ name: 'AES-GCM', iv: parsed.iv, additionalData: _vaultWrapAad(env) }, kek, parsed.ct));
    } catch (e) {
      throw new Error('WRONG_PASSWORD_OR_CORRUPT');
    }
    try {
      if (material.length !== 32) throw new Error('WRONG_PASSWORD_OR_CORRUPT');
      return await _importVaultKey(material);
    } finally {
      material.fill(0);
    }
  }
  async function rewrapVaultKey(env, oldPassword, newPassword, options) {
    _passwordBytes(newPassword, 'rewrapVaultKey');
    var key = await unwrapVaultKey(env, oldPassword);
    return wrapVaultKey(key, newPassword, options);
  }

  function _canonicalize(value, seen) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new Error('AAD contains a non-finite number.');
      return value;
    }
    if (Array.isArray(value)) {
      if (seen.indexOf(value) !== -1) throw new Error('AAD must not contain cycles.');
      seen.push(value);
      var array = value.map(function (item) { return _canonicalize(item, seen); });
      seen.pop();
      return array;
    }
    if (value && typeof value === 'object') {
      if (Object.prototype.toString.call(value) !== '[object Object]') throw new Error('AAD must be a plain JSON value.');
      if (seen.indexOf(value) !== -1) throw new Error('AAD must not contain cycles.');
      seen.push(value);
      var object = {};
      Object.keys(value).sort().forEach(function (key) {
        var child = value[key];
        if (child === undefined || typeof child === 'function' || typeof child === 'symbol') throw new Error('AAD must be JSON-serializable.');
        object[key] = _canonicalize(child, seen);
      });
      seen.pop();
      return object;
    }
    throw new Error('AAD must be a string, bytes, or JSON-serializable value.');
  }
  function _aadBytes(aad) {
    var bytes;
    if (typeof aad === 'string') bytes = _enc.encode(aad);
    else if (aad instanceof Uint8Array) bytes = new Uint8Array(aad);
    else if (typeof ArrayBuffer !== 'undefined' && aad instanceof ArrayBuffer) bytes = new Uint8Array(aad.slice(0));
    else if (aad !== undefined && aad !== null) bytes = _enc.encode(JSON.stringify(_canonicalize(aad, [])));
    else throw new Error('Record AAD is required.');
    if (!bytes.length) throw new Error('Record AAD is required.');
    if (bytes.length > MAX_AAD_BYTES) throw new Error('Record AAD is too large.');
    return bytes;
  }
  function _recordAad(aad) {
    return _concatBytes(_enc.encode('AlloFlow|allovault-record|v2|AES-256-GCM|json-utf8|'), _aadBytes(aad));
  }
  function _validateRecordEnvelope(env) {
    if (!env || env.kind !== 'allovault-record' || env.alg !== 'AES-256-GCM' || env.codec !== 'json-utf8') throw new Error('Not an AlloFlow encrypted vault record.');
    _assertVersion(env, 'vault record', false);
    return {
      iv: _decodeField(env, 'iv', 12, 12, 12),
      ct: _decodeField(env, 'ct', 16, MAX_CIPHERTEXT_BYTES)
    };
  }
  async function encryptRecord(value, dek, aad) {
    _assertVaultKey(dek);
    var additionalData = _recordAad(aad);
    var iv = _randomBytes(12);
    var ct = await _subtle().encrypt({ name: 'AES-GCM', iv: iv, additionalData: additionalData }, dek, _serializeJSON(value, 'encryptRecord value'));
    return { v: ENVELOPE_VERSION, kind: 'allovault-record', alg: 'AES-256-GCM', codec: 'json-utf8', iv: _b64(iv), ct: _b64(new Uint8Array(ct)) };
  }
  async function decryptRecord(env, dek, aad) {
    _assertVaultKey(dek);
    var parsed = _validateRecordEnvelope(env);
    var pt;
    try {
      pt = await _subtle().decrypt({ name: 'AES-GCM', iv: parsed.iv, additionalData: _recordAad(aad) }, dek, parsed.ct);
    } catch (e) {
      throw new Error('WRONG_KEY_OR_CORRUPT');
    }
    return _parseJSON(new Uint8Array(pt), 'INVALID_ENCRYPTED_JSON');
  }

  // ── Offline recovery codes ─────────────────────────────────────────────
  // 160 random bits plus a 20-bit checksum, encoded with an unambiguous
  // Crockford-style alphabet. The code is returned to the caller once and is
  // never persisted by this module; vaults store only a password-wrapped DEK.
  var RECOVERY_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  var RECOVERY_CODE_BYTES = 20;
  var RECOVERY_CODE_PAYLOAD_CHARS = 32;
  var RECOVERY_CODE_CHECK_CHARS = 4;

  function _recoveryCrc32(bytes) {
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (var bit = 0; bit < 8; bit++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function _recoveryEncodeBytes(bytes) {
    var output = '';
    var buffer = 0;
    var bits = 0;
    for (var i = 0; i < bytes.length; i++) {
      buffer = (buffer << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        output += RECOVERY_CODE_ALPHABET[(buffer >>> bits) & 31];
      }
      buffer &= bits ? ((1 << bits) - 1) : 0;
    }
    if (bits) output += RECOVERY_CODE_ALPHABET[(buffer << (5 - bits)) & 31];
    return output;
  }
  function _recoveryDecodePayload(payload) {
    var output = new Uint8Array(RECOVERY_CODE_BYTES);
    var buffer = 0;
    var bits = 0;
    var offset = 0;
    for (var i = 0; i < payload.length; i++) {
      var value = RECOVERY_CODE_ALPHABET.indexOf(payload[i]);
      if (value < 0) throw new Error('Recovery code contains an invalid character.');
      buffer = (buffer << 5) | value;
      bits += 5;
      while (bits >= 8) {
        bits -= 8;
        if (offset >= output.length) throw new Error('Recovery code has an invalid length.');
        output[offset++] = (buffer >>> bits) & 255;
      }
      buffer &= bits ? ((1 << bits) - 1) : 0;
    }
    if (offset !== RECOVERY_CODE_BYTES || bits !== 0) throw new Error('Recovery code has an invalid length.');
    return output;
  }
  function _recoveryEncodeChecksum(bytes) {
    var value = _recoveryCrc32(bytes) & 0xfffff;
    var output = '';
    for (var shift = 15; shift >= 0; shift -= 5) output += RECOVERY_CODE_ALPHABET[(value >>> shift) & 31];
    return output;
  }
  function _formatRecoveryCode(compact) {
    return compact.match(/.{1,4}/g).join('-');
  }
  function normalizeRecoveryCode(input) {
    if (typeof input !== 'string') throw new Error('Recovery code is required.');
    var compact = input.toUpperCase().replace(/[\s-]+/g, '');
    if (compact.length !== RECOVERY_CODE_PAYLOAD_CHARS + RECOVERY_CODE_CHECK_CHARS) {
      throw new Error('Recovery code has an invalid length.');
    }
    for (var i = 0; i < compact.length; i++) {
      if (RECOVERY_CODE_ALPHABET.indexOf(compact[i]) < 0) throw new Error('Recovery code contains an invalid character.');
    }
    var payload = compact.slice(0, RECOVERY_CODE_PAYLOAD_CHARS);
    var suppliedCheck = compact.slice(RECOVERY_CODE_PAYLOAD_CHARS);
    var bytes = _recoveryDecodePayload(payload);
    var expectedCheck = _recoveryEncodeChecksum(bytes);
    var diff = 0;
    for (var j = 0; j < RECOVERY_CODE_CHECK_CHARS; j++) diff |= suppliedCheck.charCodeAt(j) ^ expectedCheck.charCodeAt(j);
    if (diff !== 0) throw new Error('Recovery code checksum is not valid.');
    return _formatRecoveryCode(payload + expectedCheck);
  }
  function validateRecoveryCode(input) {
    try { normalizeRecoveryCode(input); return true; } catch (_) { return false; }
  }
  function generateRecoveryCode() {
    var bytes = _randomBytes(RECOVERY_CODE_BYTES);
    var compact = _recoveryEncodeBytes(bytes) + _recoveryEncodeChecksum(bytes);
    return _formatRecoveryCode(compact);
  }
  var AlloCrypto = {
    hashPassword: hashPassword,
    verifyPassword: verifyPassword,
    encryptJSON: encryptJSON,
    decryptJSON: decryptJSON,
    isEncryptedEnvelope: isEncryptedEnvelope,
    needsPasswordUpgrade: needsPasswordUpgrade,
    createVaultKey: createVaultKey,
    wrapVaultKey: wrapVaultKey,
    unwrapVaultKey: unwrapVaultKey,
    rewrapVaultKey: rewrapVaultKey,
    encryptRecord: encryptRecord,
    decryptRecord: decryptRecord,
    generateRecoveryCode: generateRecoveryCode,
    normalizeRecoveryCode: normalizeRecoveryCode,
    validateRecoveryCode: validateRecoveryCode,
    PBKDF2_ITERATIONS: PBKDF2_ITERATIONS,
    MIN_PBKDF2_ITERATIONS: MIN_PBKDF2_ITERATIONS,
    MAX_PBKDF2_ITERATIONS: MAX_PBKDF2_ITERATIONS,
    ENVELOPE_VERSION: ENVELOPE_VERSION,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AlloCrypto;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AlloCrypto = AlloCrypto;
    if (typeof console !== 'undefined') console.log('[CDN] AlloCrypto loaded');
  }
})();
