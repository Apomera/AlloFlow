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

  var root = (typeof window !== 'undefined' && window && (typeof window === 'object' || typeof window === 'function'))
    ? window
    : ((typeof globalThis !== 'undefined' && globalThis && typeof globalThis === 'object') ? globalThis : null);
  var hasOwn = Object.prototype.hasOwnProperty;
  var STORAGE_KEY = 'alloflow_educator_access_code_v1';
  var BACKOFF_KEY = 'alloflow_educator_access_backoff_v1';
  var MIN_CODE_LENGTH = 6;
  var MAX_CODE_LENGTH = 512;
  var MAX_VERIFIER_JSON_CHARS = 8192;
  var MAX_STORED_JSON_CHARS = 65536;
  var BACKOFF_AFTER_FAILURES = 3;
  var MAX_BACKOFF_MS = 30000;

  function isUnsafeKey(key) {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
  }
  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
  function safeAssign(target, source) {
    if (!isPlainObject(source)) return target;
    Object.keys(source).forEach(function (key) {
      if (!isUnsafeKey(key)) target[key] = source[key];
    });
    return target;
  }
  function safeJsonParse(raw, maxChars) {
    if (typeof raw !== 'string' || !raw) return null;
    if (maxChars && raw.length > maxChars) return null;
    try {
      return JSON.parse(raw, function (key, val) {
        return isUnsafeKey(key) ? undefined : val;
      });
    } catch (_) { return null; }
  }

  function cryptoApi() {
    if (root && root.AlloModules && root.AlloModules.AlloCrypto) return root.AlloModules.AlloCrypto;
    try { return require('./allo_crypto_module.js'); } catch (_) { return null; }
  }
  function localStore() {
    try { return (root && root.localStorage) || null; } catch (_) { return null; }
  }
  function sessionStore() {
    try { return (root && root.sessionStorage) || null; } catch (_) { return null; }
  }
  function parseVerifier(raw) {
    if (!raw) return null;
    var value = raw;
    if (typeof raw === 'string') {
      value = safeJsonParse(raw, MAX_VERIFIER_JSON_CHARS);
    }
    if (!isPlainObject(value) || value.kind !== 'pwhash') return null;
    if (typeof value.salt !== 'string' || !value.salt || value.salt.length > 512) return null;
    if (typeof value.hash !== 'string' || !value.hash || value.hash.length > 512) return null;
    if (value.iter !== undefined && (!Number.isSafeInteger(value.iter) || value.iter <= 0)) return null;
    if (value.iterations !== undefined && (!Number.isSafeInteger(value.iterations) || value.iterations <= 0)) return null;
    return value;
  }
  function configuredValue() {
    var store = localStore();
    var persisted = null;
    try { persisted = parseVerifier(store && store.getItem(STORAGE_KEY)); } catch (_) {}
    if (persisted) return persisted;
    var config = (root && isPlainObject(root.APP_CONFIG)) ? root.APP_CONFIG : null;
    return config ? config._cfg_validation_key : null;
  }
  function publishVerifier(verifier) {
    if (root && isPlainObject(root.APP_CONFIG)) root.APP_CONFIG._cfg_validation_key = verifier || '';
    try {
      if (root && typeof root.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') {
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
  function parseBackoffRecord(raw) {
    try {
      var value = safeJsonParse(raw, 1024);
      return isPlainObject(value) && Number.isInteger(value.failures) && value.failures >= 0 && value.failures <= 1000000
        && Number.isFinite(value.blockedUntil) && value.blockedUntil >= 0
        ? value : null;
    } catch (_) { return null; }
  }
  var _memBackoff = null;
  function stricterBackoff(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (b.failures > a.failures) return b;
    if (a.failures > b.failures) return a;
    return b.blockedUntil > a.blockedUntil ? b : a;
  }
  function readBackoff() {
    var primary = localStore();
    var fallback = sessionStore();
    var pRec = null;
    var fRec = null;
    try { pRec = primary && parseBackoffRecord(primary.getItem(BACKOFF_KEY)); } catch (_) {}
    try { fRec = fallback && parseBackoffRecord(fallback.getItem(BACKOFF_KEY)); } catch (_) {}
    var parsed = stricterBackoff(pRec, fRec);
    if (parsed) return parsed;
    if (_memBackoff) return _memBackoff;
    return { failures: 0, blockedUntil: 0 };
  }
  function writeBackoff(value) {
    var primary = localStore();
    var fallback = sessionStore();
    if (!value || !value.failures) {
      _memBackoff = null;
      try { if (primary) primary.removeItem(BACKOFF_KEY); } catch (_) {}
      try { if (fallback) fallback.removeItem(BACKOFF_KEY); } catch (_) {}
      return;
    }
    var serialized = JSON.stringify(value);
    var wrote = false;
    try {
      if (primary) {
        primary.setItem(BACKOFF_KEY, serialized);
        wrote = true;
      }
    } catch (_) {}
    if (!wrote) {
      try {
        if (fallback) {
          fallback.setItem(BACKOFF_KEY, serialized);
          wrote = true;
        }
      } catch (_) {}
    }
    _memBackoff = wrote ? null : value;
  }
  function retryAfter(now) {
    var remaining = readBackoff().blockedUntil - now;
    if (!Number.isFinite(remaining) || remaining <= 0) return 0;
    return Math.min(MAX_BACKOFF_MS, remaining);
  }
  function recordFailure(now) {
    var state = readBackoff();
    var failures = Math.min(1000000, state.failures + 1);
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
    if (value.length > MAX_CODE_LENGTH) {
      var longErr = new Error('Use at most ' + MAX_CODE_LENGTH + ' characters.');
      longErr.code = 'allo/access-code-too-long';
      throw longErr;
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
      var value = safeJsonParse(store.getItem(key), MAX_STORED_JSON_CHARS);
      return isPlainObject(value) ? value : null;
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
  var _lockGen = 0;
  var _forgetGen = 0;
  function safeClock(options) {
    var v = options && options.now;
    return (typeof v === 'number' && Number.isFinite(v) && v >= 0) ? v : Date.now();
  }
  function notifyAiKeyLockListeners() {
    try {
      if (!root || typeof root.dispatchEvent !== 'function' || typeof root.CustomEvent !== 'function') return;
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
  var AI_BACKEND_DEFAULTS = {
    gemini: '',
    'alloflow-local': 'http://localhost:32173',
    lmstudio: 'http://localhost:1234',
    localai: 'http://localhost:8080',
    ollama: 'http://localhost:11434',
    openai: 'https://api.openai.com',
    claude: 'https://api.anthropic.com',
    'onnx-npu': 'http://localhost:11435',
    custom: 'http://localhost:8080'
  };
  function aiCredentialDestination(config) {
    try {
      var cfg = config && typeof config === 'object' ? config : {};
      var backend = (typeof cfg.backend === 'string' && cfg.backend) ? cfg.backend.trim() : 'gemini';
      if (!backend || /[|\u0000-\u001f\u007f]/.test(backend)) return '';
      var defaultUrl = hasOwn.call(AI_BACKEND_DEFAULTS, backend) ? AI_BACKEND_DEFAULTS[backend] : '';
      var raw = cfg.baseUrl || defaultUrl || (backend === 'gemini' ? 'https://generativelanguage.googleapis.com' : '');
      if (typeof raw !== 'string') return '';
      var url = new URL(raw);
      if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) return '';
      return backend + '|' + url.origin;
    } catch (_) {
      return '';
    }
  }
  function storedAiConfigObject() {
    return readStoredObject(localStore(), AI_CONFIG_KEY);
  }
  function sessionAiDestination() {
    var parsed = readStoredObject(sessionStore(), AI_SESSION_KEY);
    return parsed && typeof parsed.apiKeyDestination === 'string' ? parsed.apiKeyDestination : '';
  }
  function writeAiSession(secrets, unsaved) {
    var store = sessionStore();
    if (!store) return;
    try {
      if (hasAiSecrets(secrets)) {
        var payload = safeAssign({}, secrets);
        payload.unsaved = !!unsaved;
        if (!payload.apiKeyDestination && payload.apiKey) {
          var existingDest = sessionAiDestination();
          if (existingDest) payload.apiKeyDestination = existingDest;
        }
        store.setItem(AI_SESSION_KEY, JSON.stringify(payload));
      } else store.removeItem(AI_SESSION_KEY);
    } catch (_) {}
  }
  function plaintextAiSecrets() {
    return pickAiSecrets(readStoredObject(localStore(), AI_CONFIG_KEY));
  }
  function removePlaintextAiSecrets() {
    var store = localStore();
    var config = readStoredObject(store, AI_CONFIG_KEY);
    if (!config || !hasAiSecrets(pickAiSecrets(config))) return;
    AI_SECRET_FIELDS.forEach(function (field) { delete config[field]; });
    try { store.setItem(AI_CONFIG_KEY, JSON.stringify(config)); } catch (_) {}
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
    var startLockGen = _lockGen;
    var startForgetGen = _forgetGen;
    var cfg = storedAiConfigObject();
    var cfgDest = cfg ? aiCredentialDestination(cfg) : '';
    var cfgMismatch = !!(cfg && cfg.apiKeyDestination && cfgDest && cfg.apiKeyDestination !== cfgDest);
    var pt = plaintextAiSecrets();
    if (cfgMismatch) delete pt.apiKey;
    var sess = aiSessionSecrets();
    var sessDest = sessionAiDestination();
    if (sess.apiKey && sessDest && cfgDest && sessDest !== cfgDest) { delete sess.apiKey; sessDest = ''; }
    var secrets = Object.assign({}, pt, sess);
    if (!hasAiSecrets(secrets)) return false;
    var dest = (sess.apiKey ? sessDest : '') || (!cfgMismatch && cfg && typeof cfg.apiKeyDestination === 'string' ? cfg.apiKeyDestination : '') || cfgDest;
    var payload = Object.assign({}, secrets);
    if (payload.apiKey && dest) payload.apiKeyDestination = dest;
    var crypto = cryptoApi();
    if (!crypto || typeof crypto.encryptJSON !== 'function') throw new Error('Encryption is unavailable.');
    var record = await crypto.encryptJSON(payload, normalizeCode(code), options && options.iterations);
    if (_forgetGen !== startForgetGen) return false;
    var store = localStore();
    if (!store) throw new Error('Device storage is unavailable.');
    // Ciphertext lands first: a failed write must not lose the only copy.
    store.setItem(AI_LOCKED_KEY, JSON.stringify(record));
    if (_lockGen === startLockGen) writeAiSession(payload, false);
    removePlaintextAiSecrets();
    notifyAiKeyLockListeners();
    return true;
  }
  async function unlockAiKey(code, forceDecrypt) {
    var startLockGen = _lockGen;
    var startForgetGen = _forgetGen;
    var record = lockedAiRecord();
    if (!record || (!forceDecrypt && hasAiSecrets(aiSessionSecrets()))) return false;
    var crypto = cryptoApi();
    if (!crypto || typeof crypto.decryptJSON !== 'function') throw new Error('Encryption is unavailable.');
    var decrypted = await crypto.decryptJSON(record, normalizeCode(code));
    if (_lockGen !== startLockGen || _forgetGen !== startForgetGen) return false;
    var nextSession = pickAiSecrets(decrypted);
    if (nextSession.apiKey && decrypted && typeof decrypted.apiKeyDestination === 'string' && decrypted.apiKeyDestination) {
      nextSession.apiKeyDestination = decrypted.apiKeyDestination;
    }
    writeAiSession(nextSession, false);
    notifyAiKeyLockListeners();
    return true;
  }
  // A failure here must never fail the access check that called it.
  async function syncAiKeyAfterVerifiedCode(code, options) {
    try { await unlockAiKey(code, false); } catch (_) {}
    try { if (hasAiSecrets(plaintextAiSecrets())) await writeLockedAiSecrets(code, options); } catch (_) {}
  }
  // Wipes the tab's copy when a key is saved under a code (entering a learner
  // role). A tab-only or unsaved edited key has no matching saved copy, so it stays.
  function lockAiKey() {
    _lockGen += 1;
    if (!lockedAiRecord() || !hasAiSecrets(aiSessionSecrets()) || aiSessionUnsaved()) return false;
    writeAiSession({}, false);
    notifyAiKeyLockListeners();
    return true;
  }
  function forgetAiKey() {
    _lockGen += 1;
    _forgetGen += 1;
    var store = localStore();
    try { if (store) store.removeItem(AI_LOCKED_KEY); } catch (_) {}
    writeAiSession({}, false);
    removePlaintextAiSecrets();
    notifyAiKeyLockListeners();
  }
  // Called for every settings write. Returns the config for localStorage; keys
  // move to this tab, except an unchanged older plaintext key, which stays
  // where it is until the teacher protects it (or it would vanish on tab close).
  function splitAiSecretsForSave(config) {
    var next = safeAssign({}, config);
    var plaintext = plaintextAiSecrets();
    var prior = aiSessionSecrets();
    var priorDest = sessionAiDestination();
    var computedDest = aiCredentialDestination(next);
    var declaredDest = typeof next.apiKeyDestination === 'string' ? next.apiKeyDestination : '';
    var destMismatch = !!(declaredDest && computedDest && declaredDest !== computedDest);
    var dest = (!destMismatch && declaredDest) || computedDest;
    var secrets = {};
    AI_SECRET_FIELDS.forEach(function (field) {
      if (hasOwn.call(next, field) && typeof next[field] !== 'string') { delete next[field]; return; }
      var value = typeof next[field] === 'string' ? next[field] : '';
      if (field === 'apiKey' && destMismatch) { delete next[field]; return; }
      if (!value || (plaintext[field] === value && !prior[field])) return;
      secrets[field] = value;
      delete next[field];
    });
    if (secrets.apiKey && dest && !destMismatch) {
      next.apiKeyDestination = dest;
      secrets.apiKeyDestination = dest;
    } else if (destMismatch || (!secrets.apiKey && !next.apiKey)) {
      delete next.apiKeyDestination;
    }
    var changed = JSON.stringify(pickAiSecrets(secrets)) !== JSON.stringify(prior)
      || (!!secrets.apiKey && secrets.apiKeyDestination !== priorDest);
    if (hasAiSecrets(secrets)) {
      writeAiSession(secrets, changed || aiSessionUnsaved());
    } else if (hasAiSecrets(prior)) {
      writeAiSession({}, false);
      var store = localStore();
      try { if (store) store.removeItem(AI_LOCKED_KEY); } catch (_) {}
    }
    return next;
  }
  function _enqueueSerialized(fn) {
    var run = _verifyQueue.then(fn);
    _verifyQueue = run.catch(function () {});
    return run;
  }
  async function _protectAiKeySerialized(code, options) {
    if (!status().configured) {
      await _setCodeSerialized(code, options);
      return { ok: true, reason: 'created', retryAfterMs: 0 };
    }
    var result = await _verifySerialized(code, options);
    if (!result.ok) return result;
    await writeLockedAiSecrets(code, options);
    return { ok: true, reason: 'saved', retryAfterMs: 0 };
  }
  function protectAiKey(code, options) {
    return _enqueueSerialized(function () { return _protectAiKeySerialized(code, options); });
  }
  async function _unlockAiKeyUnconfiguredSerialized(code, options) {
    var now = safeClock(options);
    var wait = retryAfter(now);
    if (wait > 0) return { ok: false, reason: 'backoff', retryAfterMs: wait };
    if (!lockedAiRecord()) return { ok: false, reason: 'not-configured', retryAfterMs: 0 };
    if (normalizeCode(code).length > MAX_CODE_LENGTH) {
      var longFailNow = safeClock(options);
      return { ok: false, reason: 'incorrect', retryAfterMs: recordFailure(longFailNow) };
    }
    try {
      await unlockAiKey(code, true);
      writeBackoff(null);
      return { ok: true, reason: 'unlocked', retryAfterMs: 0 };
    } catch (_) {
      var failNow = safeClock(options);
      return { ok: false, reason: 'incorrect', retryAfterMs: recordFailure(failNow) };
    }
  }
  async function _unlockAiKeyWithCodeSerialized(code, options) {
    if (status().configured) {
      var hadLocked = !!lockedAiRecord();
      var result = await _verifySerialized(code, options);
      if (!result.ok) return result;
      if (!hadLocked && !lockedAiRecord()) {
        return { ok: false, reason: 'not-configured', retryAfterMs: 0 };
      }
      return aiKeyStatus().locked
        ? { ok: false, reason: 'undecryptable', retryAfterMs: 0 }
        : { ok: true, reason: 'unlocked', retryAfterMs: 0 };
    }
    return _unlockAiKeyUnconfiguredSerialized(code, options);
  }
  function unlockAiKeyWithCode(code, options) {
    return _enqueueSerialized(function () { return _unlockAiKeyWithCodeSerialized(code, options); });
  }

  async function _initializeCore(options) {
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
  function initialize(options) {
    return _enqueueSerialized(function () { return _initializeCore(options); });
  }

  function status(now) {
    var value = configuredValue();
    return {
      configured: !!(parseVerifier(value) || (typeof value === 'string' && value)),
      legacyPlaintextConfigured: typeof value === 'string' && !!value,
      retryAfterMs: retryAfter((typeof now === 'number' && Number.isFinite(now) && now >= 0) ? now : Date.now())
    };
  }

  var _verifyQueue = Promise.resolve();
  async function _verifySerialized(code, options) {
    var now = safeClock(options);
    var wait = retryAfter(now);
    if (wait > 0) return { ok: false, reason: 'backoff', retryAfterMs: wait };
    await _initializeCore(options);
    var verifier = parseVerifier(configuredValue());
    var crypto = cryptoApi();
    if (!verifier || !crypto || typeof crypto.verifyPassword !== 'function') {
      return { ok: false, reason: verifier ? 'crypto-unavailable' : 'not-configured', retryAfterMs: 0 };
    }
    var normalized = normalizeCode(code);
    if (normalized.length > MAX_CODE_LENGTH) {
      var longNow = safeClock(options);
      return { ok: false, reason: 'incorrect', retryAfterMs: recordFailure(longNow) };
    }
    var ok = false;
    try { ok = await crypto.verifyPassword(normalized, verifier); } catch (_) { ok = false; }
    if (!ok) {
      var failNow = safeClock(options);
      return { ok: false, reason: 'incorrect', retryAfterMs: recordFailure(failNow) };
    }
    writeBackoff(null);
    if (typeof crypto.needsPasswordUpgrade === 'function' && crypto.needsPasswordUpgrade(verifier)) {
      try { writeVerifier(await crypto.hashPassword(normalized)); } catch (_) {}
    }
    await syncAiKeyAfterVerifiedCode(code, options);
    return { ok: true, reason: 'verified', retryAfterMs: 0 };
  }
  function verify(code, options) {
    var run = _verifyQueue.then(function () { return _verifySerialized(code, options); });
    _verifyQueue = run.catch(function () {});
    return run;
  }

  async function _setCodeSerialized(newCode, options, internal) {
    var startLockGen = _lockGen;
    var startForgetGen = _forgetGen;
    var allowReplace = !!(internal && internal.replace === true) || !!(options && options.replace === true);
    if (status().configured && !allowReplace) {
      var exists = new Error('An educator access code is already set.');
      exists.code = 'allo/access-code-already-set';
      throw exists;
    }
    var crypto = cryptoApi();
    if (!crypto || typeof crypto.hashPassword !== 'function') throw new Error('Password hashing is unavailable.');
    var normalizedNew = requireNewCode(newCode);
    var verifier = await crypto.hashPassword(normalizedNew, options && options.iterations);
    var existingLocked = lockedAiRecord();
    var reencryptedRecord = null;
    var reencryptedPayload = null;
    if (existingLocked && internal && typeof internal.currentCode === 'string') {
      if (typeof crypto.decryptJSON !== 'function' || typeof crypto.encryptJSON !== 'function') {
        throw new Error('Encryption is unavailable to re-encrypt saved AI credentials.');
      }
      var decrypted = await crypto.decryptJSON(existingLocked, normalizeCode(internal.currentCode));
      var preserved = pickAiSecrets(decrypted);
      if (preserved.apiKey && decrypted && typeof decrypted.apiKeyDestination === 'string' && decrypted.apiKeyDestination) {
        preserved.apiKeyDestination = decrypted.apiKeyDestination;
      }
      var cfgObj = storedAiConfigObject();
      var cfgDest = cfgObj ? aiCredentialDestination(cfgObj) : '';
      var liveSession = aiSessionSecrets();
      var liveSessDest = sessionAiDestination();
      if (liveSession.apiKey && liveSessDest && cfgDest && liveSessDest !== cfgDest) {
        delete liveSession.apiKey;
        liveSessDest = '';
      }
      var mergedSecrets = Object.assign({}, preserved, liveSession);
      if (mergedSecrets.apiKey) {
        var liveDest = (liveSession.apiKey ? liveSessDest : '') || preserved.apiKeyDestination || cfgDest;
        if (liveDest) mergedSecrets.apiKeyDestination = liveDest;
      }
      if (hasAiSecrets(mergedSecrets)) {
        reencryptedPayload = mergedSecrets;
        reencryptedRecord = await crypto.encryptJSON(mergedSecrets, normalizedNew, options && options.iterations);
      }
    }
    if (reencryptedRecord && _forgetGen === startForgetGen) {
      var store = localStore();
      if (!store) throw new Error('Device storage is unavailable.');
      var prevLockedRaw = null;
      try { prevLockedRaw = store.getItem(AI_LOCKED_KEY); } catch (_) {}
      store.setItem(AI_LOCKED_KEY, JSON.stringify(reencryptedRecord));
      try {
        writeVerifier(verifier);
      } catch (err) {
        try {
          if (prevLockedRaw !== null) store.setItem(AI_LOCKED_KEY, prevLockedRaw);
          else store.removeItem(AI_LOCKED_KEY);
        } catch (_) {}
        throw err;
      }
      if (_lockGen === startLockGen) writeAiSession(reencryptedPayload, false);
      removePlaintextAiSecrets();
      writeBackoff(null);
      notifyAiKeyLockListeners();
      return { configured: true };
    }
    writeVerifier(verifier);
    writeBackoff(null);
    if (_forgetGen === startForgetGen) {
      try { await writeLockedAiSecrets(normalizedNew, options); } catch (_) {}
    }
    return { configured: true };
  }
  function setCode(newCode, options) {
    return _enqueueSerialized(function () { return _setCodeSerialized(newCode, options, null); });
  }

  async function _changeCodeSerialized(currentCode, newCode, options) {
    var result = await _verifySerialized(currentCode, options);
    if (!result.ok) return result;
    await _setCodeSerialized(newCode, options, { replace: true, currentCode: currentCode });
    return { ok: true, reason: 'changed', retryAfterMs: 0 };
  }
  function changeCode(currentCode, newCode, options) {
    return _enqueueSerialized(function () { return _changeCodeSerialized(currentCode, newCode, options); });
  }

  async function _removeCodeSerialized(currentCode, options) {
    var result = await _verifySerialized(currentCode, options);
    if (!result.ok) return result;
    var store = localStore();
    var hadLocked = !!(store && lockedAiRecord());
    if (hadLocked && !hasAiSecrets(aiSessionSecrets())) {
      try { await unlockAiKey(currentCode); } catch (_) {}
    }
    if (hadLocked && !hasAiSecrets(aiSessionSecrets())) {
      return { ok: false, reason: 'ai-key-unlock-failed', retryAfterMs: 0 };
    }
    writeVerifier(null);
    writeBackoff(null);
    // No code means nothing to encrypt under: the key stays for this tab only,
    // and never goes back to plaintext on the device.
    if (hadLocked) {
      store.removeItem(AI_LOCKED_KEY);
      writeAiSession(aiSessionSecrets(), true);
      notifyAiKeyLockListeners();
    }
    return { ok: true, reason: 'removed', retryAfterMs: 0 };
  }
  function removeCode(currentCode, options) {
    return _enqueueSerialized(function () { return _removeCodeSerialized(currentCode, options); });
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

  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window && (typeof window === 'object' || typeof window === 'function')) {
    if (!window.AlloModules || typeof window.AlloModules !== 'object') window.AlloModules = {};
    window.AlloModules.DeviceAccessCode = api;
    var cleanupKey = '__alloDeviceAccessCodeCleanup';
    if (typeof window[cleanupKey] === 'function') {
      try { window[cleanupKey](); } catch (_) {}
    }
    var finishInitialization = function () {
      initialize().then(function () {
        if (typeof window.removeEventListener === 'function') {
          window.removeEventListener('alloflow:module-registry-changed', finishInitialization);
        }
      }).catch(function () {});
    };
    var onStorage = function (event) {
      if (!event) return;
      var primary = localStore();
      if (event.storageArea && primary && event.storageArea !== primary) return;
      if (event.key === STORAGE_KEY || event.key === null) publishVerifier(parseVerifier(event.newValue));
      if (event.key === AI_LOCKED_KEY || event.key === null) notifyAiKeyLockListeners();
    };
    var onHydrated = function () {
      initialize().catch(function () {});
    };
    var initialVerifier = parseVerifier(configuredValue());
    if (initialVerifier) publishVerifier(initialVerifier);
    finishInitialization();
    if (typeof window.addEventListener === 'function') {
      if (!cryptoApi()) window.addEventListener('alloflow:module-registry-changed', finishInitialization);
      window.addEventListener('storage', onStorage);
      window.addEventListener('allo-prefs-hydrated', onHydrated);
      try {
        Object.defineProperty(window, cleanupKey, {
          configurable: true,
          writable: true,
          enumerable: false,
          value: function () {
            if (typeof window.removeEventListener === 'function') {
              window.removeEventListener('alloflow:module-registry-changed', finishInitialization);
              window.removeEventListener('storage', onStorage);
              window.removeEventListener('allo-prefs-hydrated', onHydrated);
            }
          }
        });
      } catch (_) {}
    }
  }
})();
