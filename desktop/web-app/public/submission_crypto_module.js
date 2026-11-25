(function() {
'use strict';
var _win = (typeof window !== 'undefined' && window && (typeof window === 'object' || typeof window === 'function')) ? window : null;
var _log = function (msg) {
  try { if (typeof console === 'object' && console && typeof console.log === 'function') console.log(msg); } catch (_) {}
};
if (_win && _win.AlloModules && typeof _win.AlloModules === 'object' && _win.AlloModules.SubmissionCrypto) {
  _log('[CDN] SubmissionCrypto already loaded, skipping');
  return;
}

// submission_crypto_module.js — Web Crypto wrapper for the offline-HTML
// student-submission feature. Created 2026-05-11.
//
// Threat model:
//   AlloFlow's HTML worksheet exports can be completed offline. Students
//   click "Save my work" in the exported HTML, which encrypts their
//   responses with the class public key before download. The teacher
//   batch-uploads the encrypted submissions, decrypting with the class
//   private key they hold (typically stored in their class Drive folder
//   as `class-key.alloflow`). Students never have the private key.
//
//   This means a kid who knows the class code can't read their classmates'
//   files; even with the (public) class key leaked, encrypted submissions
//   stay encrypted to anyone but the teacher with the private key.
//
// Crypto choice: hybrid RSA-OAEP + AES-GCM.
//   - RSA-OAEP 2048 wraps a fresh per-submission AES-GCM 256 key
//   - AES-GCM encrypts the response payload (fast, authenticated)
//   - RSA-only would be slow + size-limited; this is standard hybrid PKI
//
// All routines use crypto.subtle (browser native, no external deps).

// ── Helpers ───────────────────────────────────────────────────────────
function _b64encode(bytes) {
  // Uint8Array -> base64 string (chunked to avoid O(n^2) concatenation)
  if (typeof btoa === 'function') {
    var parts = [];
    var CHUNK = 8192;
    for (var i = 0; i < bytes.byteLength; i += CHUNK) {
      var slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.byteLength));
      parts.push(String.fromCharCode.apply(null, slice));
    }
    return btoa(parts.join(''));
  }
  if (typeof Buffer === 'function') return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
  throw new Error('Base64 encoder unavailable.');
}
function _b64decode(s) {
  // base64 string -> Uint8Array
  if (typeof s !== 'string' || !s || s.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s)) {
    throw new Error('Malformed submission blob: invalid base64.');
  }
  if (typeof atob === 'function') {
    var bin;
    try { bin = atob(s); } catch (_) { throw new Error('Malformed submission blob: invalid base64.'); }
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  if (typeof Buffer === 'function') return new Uint8Array(Buffer.from(s, 'base64'));
  throw new Error('Base64 decoder unavailable.');
}
var MAX_WRAPPED_KEY_B64 = 4096;
var MAX_IV_B64 = 64;
var MAX_JWK_FIELD_CHARS = 8192;
var MAX_PLAINTEXT_BYTES = 24 * 1024 * 1024;
var MAX_CIPHERTEXT_B64 = Math.ceil((MAX_PLAINTEXT_BYTES + 16) / 3) * 4;
function _isPlainObject(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  var proto = Object.getPrototypeOf(v);
  if (proto === Object.prototype || proto === null) return true;
  return Object.prototype.toString.call(v) === '[object Object]' && Object.getPrototypeOf(proto) === null;
}
function _validJwkStr(v) {
  return typeof v === 'string' && v.length > 0 && v.length <= MAX_JWK_FIELD_CHARS;
}
function _validatePublicJwk(jwk) {
  if (!_isPlainObject(jwk) || jwk.kty !== 'RSA' || !_validJwkStr(jwk.n) || !_validJwkStr(jwk.e)) {
    throw new Error('Invalid class public key: expected an RSA JWK.');
  }
  if (jwk.d !== undefined || jwk.p !== undefined || jwk.q !== undefined || jwk.dp !== undefined || jwk.dq !== undefined || jwk.qi !== undefined || jwk.oth !== undefined) {
    throw new Error('Invalid class public key: private key parameters must not be supplied for encryption.');
  }
}
function _cleanPublicJwk(jwk) {
  return { kty: 'RSA', n: jwk.n, e: jwk.e };
}
function _validatePrivateJwk(jwk) {
  if (!_isPlainObject(jwk) || jwk.kty !== 'RSA' || !_validJwkStr(jwk.n) || !_validJwkStr(jwk.e) || !_validJwkStr(jwk.d)) {
    throw new Error('Invalid class private key: expected an RSA private JWK.');
  }
}
function _cleanPrivateJwk(jwk) {
  var out = { kty: 'RSA', n: jwk.n, e: jwk.e, d: jwk.d };
  var optStrKeys = ['p', 'q', 'dp', 'dq', 'qi'];
  for (var i = 0; i < optStrKeys.length; i++) {
    var k = optStrKeys[i];
    if (Object.prototype.hasOwnProperty.call(jwk, k) && jwk[k] !== undefined) {
      if (!_validJwkStr(jwk[k])) throw new Error('Invalid class private key: malformed RSA CRT parameter.');
      out[k] = jwk[k];
    }
  }
  if (Object.prototype.hasOwnProperty.call(jwk, 'oth') && jwk.oth !== undefined) {
    if (!Array.isArray(jwk.oth) || jwk.oth.length > 16) throw new Error('Invalid class private key: malformed RSA oth parameter.');
    out.oth = jwk.oth;
  }
  return out;
}
function _getCrypto() {
  var w = (typeof window !== 'undefined' && window && (typeof window === 'object' || typeof window === 'function')) ? window : null;
  var g = (typeof globalThis !== 'undefined' && globalThis && typeof globalThis === 'object') ? globalThis : null;
  var c = (w && w.crypto) ? w.crypto : (g && g.crypto ? g.crypto : null);
  if (!c || !c.subtle || typeof c.getRandomValues !== 'function') {
    throw new Error('Web Crypto API not available (crypto.subtle missing). Submissions require a secure context (HTTPS or localhost).');
  }
  return c;
}
function _getSubtle() {
  return _getCrypto().subtle;
}
var _encInst = null;
var _decInst = null;
function _encodeUtf8(str) {
  if (typeof TextEncoder === 'function') {
    if (!_encInst) _encInst = new TextEncoder();
    return _encInst.encode(str);
  }
  if (typeof Buffer === 'function') return new Uint8Array(Buffer.from(str, 'utf8'));
  throw new Error('UTF-8 encoder unavailable.');
}
function _decodeUtf8(buf) {
  if (typeof TextDecoder === 'function') {
    if (!_decInst) _decInst = new TextDecoder('utf-8', { fatal: true });
    return _decInst.decode(buf);
  }
  if (typeof Buffer === 'function') return Buffer.from(buf).toString('utf8');
  throw new Error('UTF-8 decoder unavailable.');
}

// ── Public API ────────────────────────────────────────────────────────

// Generate a new class keypair. Returns JWK form for easy JSON storage.
// Public key is embedded in every student HTML; private key downloaded
// once and stored by the teacher in their class Drive folder.
async function generateClassKeypair() {
  var subtle = _getSubtle();
  var pair = await subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,  // extractable — we need both halves as JWK
    ['encrypt', 'decrypt']
  );
  var publicJwk = await subtle.exportKey('jwk', pair.publicKey);
  var privateJwk = await subtle.exportKey('jwk', pair.privateKey);
  return { publicJwk: publicJwk, privateJwk: privateJwk };
}

// Encrypt a payload object with a class public key.
// Returns { wrappedKey, iv, ciphertext } all as base64 strings.
async function encryptSubmission(payloadObj, publicJwk) {
  if (!_isPlainObject(payloadObj)) {
    throw new Error('Invalid submission payload: expected a plain object.');
  }
  _validatePublicJwk(publicJwk);
  var cryptoObj = _getCrypto();
  var subtle = cryptoObj.subtle;
  var jsonStr;
  try { jsonStr = JSON.stringify(payloadObj); } catch (_) {
    throw new Error('Invalid submission payload: expected a serializable plain object.');
  }
  if (typeof jsonStr !== 'string') {
    throw new Error('Invalid submission payload: expected a plain object.');
  }
  var payloadBytes = _encodeUtf8(jsonStr);
  if (payloadBytes.byteLength > MAX_PLAINTEXT_BYTES) {
    throw new Error('Submission payload exceeds maximum supported size.');
  }

  // Fresh per-submission AES-GCM 256 key
  var aesKey = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  var iv = cryptoObj.getRandomValues(new Uint8Array(12));  // GCM standard IV size
  var ciphertextBuf = await subtle.encrypt({ name: 'AES-GCM', iv: iv, tagLength: 128 }, aesKey, payloadBytes);

  // Wrap the AES key with the class RSA public key
  var publicKey = await subtle.importKey('jwk', _cleanPublicJwk(publicJwk), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  var aesKeyRaw = await subtle.exportKey('raw', aesKey);
  var wrappedKeyBuf;
  try {
    wrappedKeyBuf = await subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, aesKeyRaw);
  } finally {
    try { new Uint8Array(aesKeyRaw).fill(0); } catch (_) {}
  }

  return {
    wrappedKey: _b64encode(new Uint8Array(wrappedKeyBuf)),
    iv: _b64encode(iv),
    ciphertext: _b64encode(new Uint8Array(ciphertextBuf)),
  };
}

// Decrypt a submission blob with the class private key.
// Returns the original payload object.
async function decryptSubmission(blob, privateJwk) {
  var subtle = _getSubtle();
  if (!_isPlainObject(blob) ||
      !Object.prototype.hasOwnProperty.call(blob, 'wrappedKey') ||
      !Object.prototype.hasOwnProperty.call(blob, 'iv') ||
      !Object.prototype.hasOwnProperty.call(blob, 'ciphertext') ||
      typeof blob.wrappedKey !== 'string' || typeof blob.iv !== 'string' || typeof blob.ciphertext !== 'string' ||
      !blob.wrappedKey || !blob.iv || !blob.ciphertext) {
    throw new Error('Malformed submission blob: missing wrappedKey, iv, or ciphertext.');
  }
  if (blob.wrappedKey.length > MAX_WRAPPED_KEY_B64 || blob.iv.length > MAX_IV_B64 || blob.ciphertext.length > MAX_CIPHERTEXT_B64) {
    throw new Error('Malformed submission blob: encrypted field exceeds maximum size.');
  }
  _validatePrivateJwk(privateJwk);

  // Validate IV, ciphertext, and wrappedKey framing before incurring RSA private-key work.
  var iv = _b64decode(blob.iv);
  if (iv.byteLength !== 12) {
    throw new Error('Malformed submission blob: AES-GCM IV must be 12 bytes.');
  }
  var ciphertext = _b64decode(blob.ciphertext);
  if (ciphertext.byteLength < 16) {
    throw new Error('Malformed submission blob: ciphertext too short for AES-GCM tag.');
  }
  var wrappedKeyBytes = _b64decode(blob.wrappedKey);

  var privateKey = await subtle.importKey('jwk', _cleanPrivateJwk(privateJwk), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
  var aesKeyRaw;
  try {
    aesKeyRaw = await subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, wrappedKeyBytes);
  } catch (e) {
    // Decryption failure here almost always means "wrong class key"
    throw new Error('Could not unwrap the AES key. This usually means the submission was encrypted with a different class key than the one you provided.');
  }
  var aesKey;
  try {
    if (!aesKeyRaw || aesKeyRaw.byteLength !== 32) {
      throw new Error('Malformed submission blob: unwrapped AES key must be 256 bits.');
    }
    aesKey = await subtle.importKey('raw', aesKeyRaw, { name: 'AES-GCM' }, false, ['decrypt']);
  } finally {
    try { if (aesKeyRaw) new Uint8Array(aesKeyRaw).fill(0); } catch (_) {}
  }
  var payloadBuf;
  try {
    payloadBuf = await subtle.decrypt({ name: 'AES-GCM', iv: iv, tagLength: 128 }, aesKey, ciphertext);
  } catch (_) {
    throw new Error('Could not decrypt the submission payload. The file may be corrupted or tampered with.');
  }
  var parsed;
  try {
    var payloadJson = _decodeUtf8(payloadBuf);
    parsed = JSON.parse(payloadJson, function (key, value) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
      return value;
    });
  } catch (_) {
    throw new Error('Malformed submission payload: invalid UTF-8 or JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Malformed submission payload: expected JSON object.');
  }
  return parsed;
}

// ── Inline encryption script for exported worksheets ──────────────────
//
// The student's offline HTML can't load this module (no network). It
// needs its OWN copy of the encrypt function as inline JS. To keep
// drift from this module to zero, we expose the function body as a
// string that doc_pipeline_source.jsx injects verbatim into the
// exported HTML's <script> block. If we ever change the crypto wire
// format, both sides update from the same source.
//
// The inline copy uses the SAME wire format (JWK public key, RSA-OAEP +
// AES-GCM hybrid, base64 fields), so a submission encrypted offline by
// the student is decryptable by `decryptSubmission` above.

var INLINE_ENCRYPT_SCRIPT = [
  '// AlloFlow inline submission encryptor (generated from submission_crypto_module.js)',
  'window.__alloflowEncryptSubmission = async function(payloadObj, publicJwk) {',
  '  var subtle = window.crypto && window.crypto.subtle;',
  '  if (!subtle || typeof window.crypto.getRandomValues !== "function") throw new Error("Web Crypto not available. This worksheet needs a modern browser to save.");',
  '  if (!payloadObj || typeof payloadObj !== "object" || Array.isArray(payloadObj)) throw new Error("Invalid submission payload.");',
  '  if (!publicJwk || typeof publicJwk !== "object" || Array.isArray(publicJwk) || publicJwk.kty !== "RSA" || typeof publicJwk.n !== "string" || !publicJwk.n || typeof publicJwk.e !== "string" || !publicJwk.e || publicJwk.d !== undefined || publicJwk.p !== undefined || publicJwk.q !== undefined || publicJwk.dp !== undefined || publicJwk.dq !== undefined || publicJwk.qi !== undefined || publicJwk.oth !== undefined) throw new Error("Invalid class public key.");',
  '  var enc = new TextEncoder();',
  '  function b64(bytes) { var parts=[]; for (var i=0;i<bytes.byteLength;i+=8192) parts.push(String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i+8192, bytes.byteLength)))); return btoa(parts.join("")); }',
  '  var jsonStr; try { jsonStr = JSON.stringify(payloadObj); } catch (_) { throw new Error("Invalid submission payload."); }',
  '  if (typeof jsonStr !== "string") throw new Error("Invalid submission payload.");',
  '  var payloadBytes = enc.encode(jsonStr);',
  '  if (payloadBytes.byteLength > ' + MAX_PLAINTEXT_BYTES + ') throw new Error("Submission payload exceeds maximum supported size.");',
  '  var aesKey = await subtle.generateKey({name:"AES-GCM",length:256}, true, ["encrypt"]);',
  '  var iv = window.crypto.getRandomValues(new Uint8Array(12));',
  '  var ctBuf = await subtle.encrypt({name:"AES-GCM",iv:iv,tagLength:128}, aesKey, payloadBytes);',
  '  var pub = await subtle.importKey("jwk", {kty:"RSA",n:publicJwk.n,e:publicJwk.e}, {name:"RSA-OAEP",hash:"SHA-256"}, false, ["encrypt"]);',
  '  var aesRaw = await subtle.exportKey("raw", aesKey);',
  '  var wrappedBuf;',
  '  try { wrappedBuf = await subtle.encrypt({name:"RSA-OAEP"}, pub, aesRaw); } finally { try { new Uint8Array(aesRaw).fill(0); } catch (_) {} }',
  '  return { wrappedKey: b64(new Uint8Array(wrappedBuf)), iv: b64(iv), ciphertext: b64(new Uint8Array(ctBuf)) };',
  '};',
].join('\n');

var api = Object.freeze({
  generateClassKeypair: generateClassKeypair,
  encryptSubmission: encryptSubmission,
  decryptSubmission: decryptSubmission,
  INLINE_ENCRYPT_SCRIPT: INLINE_ENCRYPT_SCRIPT,
});
if (typeof module === 'object' && module && module.exports) module.exports = api;
if (_win) {
  if (!_win.AlloModules || typeof _win.AlloModules !== 'object') _win.AlloModules = {};
  _win.AlloModules.SubmissionCrypto = api;
}

_log('[SubmissionCrypto] Loaded: RSA-OAEP 2048 + AES-GCM 256 hybrid');
})();
