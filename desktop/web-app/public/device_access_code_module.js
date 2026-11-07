/**
 * AlloFlow optional educator access-code service.
 *
 * This is deliberately separate from saved-work encryption. An access code is
 * shared-device friction around educator UI; it is not an authorization
 * boundary and does not decrypt saved work. Only a salted PBKDF2 verifier is
 * persisted. The entered code stays in the caller's transient input state.
 *
 * The one thing it does encrypt is the teacher's saved AI provider key, so a
 * student on a shared device cannot read or use it. See "Saved AI provider
 * keys" below.
 */
(function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : globalThis;
  var STORAGE_KEY = 'alloflow_educator_access_code_v1';
  var BACKOFF_KEY = 'alloflow_educator_access_backoff_v1';
  var MIN_CODE_LENGTH = 6;
  var BACKOFF_AFTER_FAILURES = 3;
  var MAX_BACKOFF_MS = 30000;

  function cryptoApi() {
    if (root.AlloModules && root.AlloModules.AlloCrypto) return root.AlloModules.AlloCrypto;
    try { return require('./allo_crypto_module.js'); } catch (_) { return null; }
  }
  function localStore() {
    try { return root.localStorage || null; } catch (_) { return null; }
  }
  function sessionStore() {
    try { return root.sessionStorage || null; } catch (_) { return null; }
  }
  function parseVerifier(raw) {
    if (!raw) return null;
    var value = raw;
    if (typeof raw === 'string') {
      try { value = JSON.parse(raw); } catch (_) { return null; }
    }
    return value && typeof value === 'object' && value.kind === 'pwhash'
      && typeof value.salt === 'string' && typeof value.hash === 'string'
      ? value : null;
  }
  function configuredValue() {
    var store = localStore();
    var persisted = null;
    try { persisted = parseVerifier(store && store.getItem(STORAGE_KEY)); } catch (_) {}
    if (persisted) return persisted;
    var config = root.APP_CONFIG;
    return config ? config._cfg_validation_key : null;
  }
  function publishVerifier(verifier) {
    if (root.APP_CONFIG) root.APP_CONFIG._cfg_validation_key = verifier || '';
    try {
      if (typeof root.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') {
        root.dispatchEvent(new root.CustomEvent('alloflow:educator-access-code-changed', {
          detail: { configured: !!verifier }
        }));
      }
    } catch (_) {}
  }
  function writeVerifier(verifier) {
    var store = localStore();
    if (!store) throw new Error('Device storage is unavailable.');
    if (verifier) store.setItem(STORAGE_KEY, JSON.stringify(verifier));
    else store.removeItem(STORAGE_KEY);
    publishVerifier(verifier);
  }
  function readBackoff() {
    var store = sessionStore();
    if (!store) return { failures: 0, blockedUntil: 0 };
    try {
      var value = JSON.parse(store.getItem(BACKOFF_KEY) || 'null');
      return value && Number.isInteger(value.failures) && value.failures >= 0
        && Number.isFinite(value.blockedUntil) && value.blockedUntil >= 0
        ? value : { failures: 0, blockedUntil: 0 };
    } catch (_) { return { failures: 0, blockedUntil: 0 }; }
  }
  function writeBackoff(value) {
    try {
      var store = sessionStore();
      if (!store) return;
      if (!value || !value.failures) store.removeItem(BACKOFF_KEY);
      else store.setItem(BACKOFF_KEY, JSON.stringify(value));
    } catch (_) {}
  }
  function retryAfter(now) {
    return Math.max(0, readBackoff().blockedUntil - now);
  }
  function recordFailure(now) {
    var state = readBackoff();
    var failures = state.failures + 1;
    var exponent = Math.max(0, failures - BACKOFF_AFTER_FAILURES);
    var delay = failures >= BACKOFF_AFTER_FAILURES
      ? Math.min(MAX_BACKOFF_MS, Math.pow(2, exponent) * 1000)
      : 0;
    var next = { failures: failures, blockedUntil: now + delay };
    writeBackoff(next);
    return delay;
  }
  function normalizeCode(code) {
    return typeof code === 'string' ? code : '';
  }
  function requireNewCode(code) {
    var value = normalizeCode(code);
    if (value.length < MIN_CODE_LENGTH) {
      var error = new Error('Use at least ' + MIN_CODE_LENGTH + ' characters.');
      error.code = 'allo/access-code-too-short';
      throw error;
    }
    return value;
  }

  // Saved AI provider keys. They rest encrypted under the access code; a
  // verified code decrypts them into this tab's sessionStorage, where the host
  // reads them (_alloStoredAiConfig). The code is never kept, so a key edited
  // after unlocking stays tab-only until the teacher saves it with the code.
  var AI_CONFIG_KEY = 'alloflow_ai_config';
  var AI_LOCKED_KEY = 'alloflow_ai_secrets_locked_v1';
  var AI_SESSION_KEY = 'alloflow_ai_secrets_session_v1';
  var AI_SECRET_FIELDS = ['apiKey', 'geminiApiKey'];

  function readStoredObject(store, key) {
    if (!store) return null;
    try {
      var value = JSON.parse(store.getItem(key) || 'null');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch (_) { return null; }
  }
  function pickAiSecrets(source) {
    var out = {};
    AI_SECRET_FIELDS.forEach(function (field) {
      if (source && typeof source[field] === 'string' && source[field]) out[field] = source[field];
    });
    return out;
  }
  function hasAiSecrets(secrets) {
    return Object.keys(secrets).length > 0;
  }
  function announceAiKeyChange() {
    try {
      if (typeof root.dispatchEvent !== 'function' || typeof root.CustomEvent !== 'function') return;
      root.dispatchEvent(new root.CustomEvent('alloflow:ai-key-lock-changed'));
      root.dispatchEvent(new root.CustomEvent('alloflow:ai-config-changed'));
    } catch (_) {}
  }
  function aiSessionSecrets() {
    return pickAiSecrets(readStoredObject(sessionStore(), AI_SESSION_KEY));
  }
  function aiSessionUnsaved() {
    var value = readStoredObject(sessionStore(), AI_SESSION_KEY);
    return !!(value && value.unsaved === true);
  }
  function writeAiSession(secrets, unsaved) {
    var store = sessionStore();
    if (!store) return;
    if (hasAiSecrets(secrets)) store.setItem(AI_SESSION_KEY, JSON.stringify(Object.assign({}, secrets, { unsaved: !!unsaved })));
    else store.removeItem(AI_SESSION_KEY);
  }
  function plaintextAiSecrets() {
    return pickAiSecrets(readStoredObject(localStore(), AI_CONFIG_KEY));
  }
  function removePlaintextAiSecrets() {
    var store = localStore();
    var config = readStoredObject(store, AI_CONFIG_KEY);
    if (!config || !hasAiSecrets(pickAiSecrets(config))) return;
    AI_SECRET_FIELDS.forEach(function (field) { delete config[field]; });
    store.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  }
  function lockedAiRecord() {
    var value = readStoredObject(localStore(), AI_LOCKED_KEY);
    return value && value.kind === 'alloenc' ? value : null;
  }
  function aiKeyStatus() {
    var session = hasAiSecrets(aiSessionSecrets());
    var saved = !!lockedAiRecord();
    return {
      saved: saved,
      locked: saved && !session,
      unlocked: session,
      unsaved: session && (!saved || aiSessionUnsaved()),
      plaintextOnDevice: hasAiSecrets(plaintextAiSecrets())
    };
  }
  async function writeLockedAiSecrets(code, options) {
    var secrets = Object.assign({}, plaintextAiSecrets(), aiSessionSecrets());
    if (!hasAiSecrets(secrets)) return false;
    var crypto = cryptoApi();
    if (!crypto || typeof crypto.encryptJSON !== 'function') throw new Error('Encryption is unavailable.');
    var record = await crypto.encryptJSON(secrets, normalizeCode(code), options && options.iterations);
    var store = localStore();
    if (!store) throw new Error('Device storage is unavailable.');
    // Ciphertext lands first: a failed write must not lose the only copy.
    store.setItem(AI_LOCKED_KEY, JSON.stringify(record));
    writeAiSession(secrets, false);
    removePlaintextAiSecrets();
    announceAiKeyChange();
    return true;
  }
  async function unlockAiKey(code) {
    var record = lockedAiRecord();
    if (!record || hasAiSecrets(aiSessionSecrets())) return false;
    var crypto = cryptoApi();
    if (!crypto || typeof crypto.decryptJSON !== 'function') throw new Error('Encryption is unavailable.');
    writeAiSession(pickAiSecrets(await crypto.decryptJSON(record, normalizeCode(code))), false);
    announceAiKeyChange();
    return true;
  }
  // A failure here must never fail the access check that called it.
  async function syncAiKeyAfterVerifiedCode(code, options) {
    try { await unlockAiKey(code); } catch (_) {}
    try { if (hasAiSecrets(plaintextAiSecrets())) await writeLockedAiSecrets(code, options); } catch (_) {}
  }
  // Wipes the tab's copy when a key is saved under a code (entering a learner
  // role). A tab-only key has no other copy, so it stays for the teacher.
  function lockAiKey() {
    if (!lockedAiRecord() || !hasAiSecrets(aiSessionSecrets())) return false;
    writeAiSession({}, false);
    announceAiKeyChange();
    return true;
  }
  function forgetAiKey() {
    var store = localStore();
    if (store) store.removeItem(AI_LOCKED_KEY);
    writeAiSession({}, false);
    removePlaintextAiSecrets();
    announceAiKeyChange();
  }
  // Called for every settings write. Returns the config for localStorage; keys
  // move to this tab, except an unchanged older plaintext key, which stays
  // where it is until the teacher protects it (or it would vanish on tab close).
  function splitAiSecretsForSave(config) {
    var next = Object.assign({}, config);
    var plaintext = plaintextAiSecrets();
    var prior = aiSessionSecrets();
    var secrets = {};
    AI_SECRET_FIELDS.forEach(function (field) {
      var value = typeof next[field] === 'string' ? next[field] : '';
      if (!value || (plaintext[field] === value && !prior[field])) return;
      secrets[field] = value;
      delete next[field];
    });
    var changed = JSON.stringify(secrets) !== JSON.stringify(prior);
    if (hasAiSecrets(secrets)) {
      writeAiSession(secrets, changed || aiSessionUnsaved());
    } else if (hasAiSecrets(prior)) {
      writeAiSession({}, false);
      var store = localStore();
      if (store) store.removeItem(AI_LOCKED_KEY);
    }
    return next;
  }
  async function protectAiKey(code, options) {
    if (!status().configured) {
      await setCode(code, options);
      return { ok: true, reason: 'created', retryAfterMs: 0 };
    }
    var result = await verify(code, options);
    if (!result.ok) return result;
    await writeLockedAiSecrets(code, options);
    return { ok: true, reason: 'saved', retryAfterMs: 0 };
  }
  async function unlockAiKeyWithCode(code, options) {
    if (status().configured) {
      var result = await verify(code, options);
      if (!result.ok) return result;
      return aiKeyStatus().locked
        ? { ok: false, reason: 'undecryptable', retryAfterMs: 0 }
        : { ok: true, reason: 'unlocked', retryAfterMs: 0 };
    }
    try {
      await unlockAiKey(code);
      return { ok: true, reason: 'unlocked', retryAfterMs: 0 };
    } catch (_) {
      return { ok: false, reason: 'incorrect', retryAfterMs: 0 };
    }
  }

  async function initialize(options) {
    var value = configuredValue();
    if (parseVerifier(value)) {
      publishVerifier(parseVerifier(value));
      return { configured: true, migratedLegacy: false };
    }
    // One-time compatibility migration for older manually configured builds.
    // It prevents the live runtime config from continuing to expose plaintext;
    // maintainers must still remove the old literal from their source file.
    if (typeof value === 'string' && value) {
      var crypto = cryptoApi();
      if (!crypto || typeof crypto.hashPassword !== 'function') {
        var unavailable = new Error('Password hashing is not available yet.');
        unavailable.code = 'allo/access-code-crypto-unavailable';
        throw unavailable;
      }
      var verifier = await crypto.hashPassword(value, options && options.iterations);
      writeVerifier(verifier);
      return { configured: true, migratedLegacy: true };
    }
    publishVerifier(null);
    return { configured: false, migratedLegacy: false };
  }

  function status(now) {
    var value = configuredValue();
    return {
      configured: !!(parseVerifier(value) || (typeof value === 'string' && value)),
      legacyPlaintextConfigured: typeof value === 'string' && !!value,
      retryAfterMs: retryAfter(Number.isFinite(now) ? now : Date.now())
    };
  }

  async function verify(code, options) {
    var now = options && Number.isFinite(options.now) ? options.now : Date.now();
    var wait = retryAfter(now);
    if (wait > 0) return { ok: false, reason: 'backoff', retryAfterMs: wait };
    await initialize(options);
    var verifier = parseVerifier(configuredValue());
    var crypto = cryptoApi();
    if (!verifier || !crypto || typeof crypto.verifyPassword !== 'function') {
      return { ok: false, reason: verifier ? 'crypto-unavailable' : 'not-configured', retryAfterMs: 0 };
    }
    var ok = false;
    try { ok = await crypto.verifyPassword(normalizeCode(code), verifier); } catch (_) { ok = false; }
    if (!ok) return { ok: false, reason: 'incorrect', retryAfterMs: recordFailure(now) };
    writeBackoff(null);
    if (typeof crypto.needsPasswordUpgrade === 'function' && crypto.needsPasswordUpgrade(verifier)) {
      try { writeVerifier(await crypto.hashPassword(normalizeCode(code))); } catch (_) {}
    }
    await syncAiKeyAfterVerifiedCode(code, options);
    return { ok: true, reason: 'verified', retryAfterMs: 0 };
  }

  async function setCode(newCode, options) {
    if (status().configured && !(options && options.replace === true)) {
      var exists = new Error('An educator access code is already set.');
      exists.code = 'allo/access-code-already-set';
      throw exists;
    }
    var crypto = cryptoApi();
    if (!crypto || typeof crypto.hashPassword !== 'function') throw new Error('Password hashing is unavailable.');
    var verifier = await crypto.hashPassword(requireNewCode(newCode), options && options.iterations);
    writeVerifier(verifier);
    writeBackoff(null);
    try { await writeLockedAiSecrets(newCode, options); } catch (_) {}
    return { configured: true };
  }

  async function changeCode(currentCode, newCode, options) {
    var result = await verify(currentCode, options);
    if (!result.ok) return result;
    await setCode(newCode, Object.assign({}, options, { replace: true }));
    return { ok: true, reason: 'changed', retryAfterMs: 0 };
  }

  async function removeCode(currentCode, options) {
    var result = await verify(currentCode, options);
    if (!result.ok) return result;
    writeVerifier(null);
    writeBackoff(null);
    // No code means nothing to encrypt under: the key stays for this tab only,
    // and never goes back to plaintext on the device.
    var store = localStore();
    if (store && lockedAiRecord()) {
      store.removeItem(AI_LOCKED_KEY);
      writeAiSession(aiSessionSecrets(), true);
      announceAiKeyChange();
    }
    return { ok: true, reason: 'removed', retryAfterMs: 0 };
  }

  var api = {
    initialize: initialize,
    status: status,
    isConfigured: function () { return status().configured; },
    verify: verify,
    setCode: setCode,
    changeCode: changeCode,
    removeCode: removeCode,
    aiKeyStatus: aiKeyStatus,
    protectAiKey: protectAiKey,
    unlockAiKeyWithCode: unlockAiKeyWithCode,
    lockAiKey: lockAiKey,
    forgetAiKey: forgetAiKey,
    splitAiSecretsForSave: splitAiSecretsForSave,
    AI_LOCKED_KEY: AI_LOCKED_KEY,
    AI_SESSION_KEY: AI_SESSION_KEY,
    STORAGE_KEY: STORAGE_KEY,
    MIN_CODE_LENGTH: MIN_CODE_LENGTH,
    _internal: { parseVerifier: parseVerifier, recordFailure: recordFailure, retryAfter: retryAfter }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.DeviceAccessCode = api;
    var finishInitialization = function () {
      initialize().then(function () {
        if (typeof window.removeEventListener === 'function') {
          window.removeEventListener('alloflow:module-registry-changed', finishInitialization);
        }
      }).catch(function () {});
    };
    var initialVerifier = parseVerifier(configuredValue());
    if (initialVerifier) publishVerifier(initialVerifier);
    finishInitialization();
    if (!cryptoApi() && typeof window.addEventListener === 'function') {
      window.addEventListener('alloflow:module-registry-changed', finishInitialization);
    }
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('storage', function (event) {
        if (event && event.key === STORAGE_KEY) publishVerifier(parseVerifier(event.newValue));
      });
      window.addEventListener('allo-prefs-hydrated', function () {
        initialize().catch(function () {});
      });
    }
  }
})();
