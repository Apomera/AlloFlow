(function() {
'use strict';
if (window.AlloModules && window.AlloModules.SubmissionCrypto) {
  console.log('[CDN] SubmissionCrypto already loaded, skipping');
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
  // Uint8Array -> base64 string (no padding stripping; round-trips cleanly)
  var bin = '';
  for (var i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function _b64decode(s) {
  // base64 string -> Uint8Array
  var bin = atob(s);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function _getSubtle() {
  // Lazy lookup so this module is safe to load before the page's other
  // crypto consumers (per feedback_iife_lazy_lookup.md). crypto.subtle
  // requires a secure context (HTTPS or localhost) which AlloFlow's
  // Firebase hosting + Canvas both satisfy.
  var c = (typeof window !== 'undefined') ? window.crypto : null;
  if (!c || !c.subtle) {
    throw new Error('Web Crypto API not available (crypto.subtle missing). Submissions require a secure context (HTTPS or localhost).');
  }
  return c.subtle;
}
var _enc = new TextEncoder();
var _dec = new TextDecoder();

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
  var subtle = _getSubtle();
  var payloadBytes = _enc.encode(JSON.stringify(payloadObj));

  // Fresh per-submission AES-GCM 256 key
  var aesKey = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  var iv = window.crypto.getRandomValues(new Uint8Array(12));  // GCM standard IV size
  var ciphertextBuf = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, payloadBytes);

  // Wrap the AES key with the class RSA public key
  var publicKey = await subtle.importKey('jwk', publicJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  var aesKeyRaw = await subtle.exportKey('raw', aesKey);
  var wrappedKeyBuf = await subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, aesKeyRaw);

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
  if (!blob || !blob.wrappedKey || !blob.iv || !blob.ciphertext) {
    throw new Error('Malformed submission blob: missing wrappedKey, iv, or ciphertext.');
  }

  var privateKey = await subtle.importKey('jwk', privateJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
  var wrappedKeyBytes = _b64decode(blob.wrappedKey);
  var aesKeyRaw;
  try {
    aesKeyRaw = await subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, wrappedKeyBytes);
  } catch (e) {
    // Decryption failure here almost always means "wrong class key"
    throw new Error('Could not unwrap the AES key. This usually means the submission was encrypted with a different class key than the one you provided.');
  }

  var aesKey = await subtle.importKey('raw', aesKeyRaw, { name: 'AES-GCM' }, false, ['decrypt']);
  var iv = _b64decode(blob.iv);
  var ciphertext = _b64decode(blob.ciphertext);
  var payloadBuf = await subtle.decrypt({ name: 'AES-GCM', iv: iv }, aesKey, ciphertext);
  var payloadJson = _dec.decode(payloadBuf);
  return JSON.parse(payloadJson);
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
  '  if (!subtle) throw new Error("Web Crypto not available. This worksheet needs a modern browser to save.");',
  '  var enc = new TextEncoder();',
  '  function b64(bytes) { var bin=""; for (var i=0;i<bytes.byteLength;i++) bin+=String.fromCharCode(bytes[i]); return btoa(bin); }',
  '  var payloadBytes = enc.encode(JSON.stringify(payloadObj));',
  '  var aesKey = await subtle.generateKey({name:"AES-GCM",length:256}, true, ["encrypt"]);',
  '  var iv = window.crypto.getRandomValues(new Uint8Array(12));',
  '  var ctBuf = await subtle.encrypt({name:"AES-GCM",iv:iv}, aesKey, payloadBytes);',
  '  var pub = await subtle.importKey("jwk", publicJwk, {name:"RSA-OAEP",hash:"SHA-256"}, false, ["encrypt"]);',
  '  var aesRaw = await subtle.exportKey("raw", aesKey);',
  '  var wrappedBuf = await subtle.encrypt({name:"RSA-OAEP"}, pub, aesRaw);',
  '  return { wrappedKey: b64(new Uint8Array(wrappedBuf)), iv: b64(iv), ciphertext: b64(new Uint8Array(ctBuf)) };',
  '};',
].join('\n');

if (!window.AlloModules) window.AlloModules = {};
window.AlloModules.SubmissionCrypto = {
  generateClassKeypair: generateClassKeypair,
  encryptSubmission: encryptSubmission,
  decryptSubmission: decryptSubmission,
  INLINE_ENCRYPT_SCRIPT: INLINE_ENCRYPT_SCRIPT,
};

console.log('[SubmissionCrypto] Loaded: RSA-OAEP 2048 + AES-GCM 256 hybrid');
})();
