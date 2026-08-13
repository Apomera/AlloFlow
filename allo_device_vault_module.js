/**
 * AlloFlow device recovery vault.
 *
 * This module owns only the optional encrypted-at-rest representation of the
 * workspace recovery store. Persistence is injected through a tiny optimistic
 * concurrency interface:
 *
 *   repository.read() -> { revision, store }
 *   repository.compareAndSwap(expectedRevision, nextStore) -> boolean | { ok }
 *
 * Passwords and plaintext data never reach the repository. All cryptographic
 * work is delegated to AlloCrypto; this module intentionally contains no crypto
 * fallback. In a browser AlloCrypto is resolved lazily from
 * window.AlloModules.AlloCrypto. CommonJS uses ./allo_crypto_module.js.
 */
(function () {
  'use strict';

  var VAULT_VERSION = 2;
  var VAULT_KIND = 'alloflow-recovery-vault';
  var BACKUP_KIND = 'alloflow-recovery-vault-backup';
  var BACKUP_VERSION = 1;
  var DEFAULT_MAX_CAS_RETRIES = 5;
  var STANDARD_MAX_RECORDS = 20;
  var STANDARD_MAX_BYTES = 150 * 1024 * 1024;
  var COMPACT_MAX_RECORDS = 4;
  var COMPACT_MAX_BYTES = 50 * 1024 * 1024;
  var COMPACT_DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
  var SNAPSHOT_AAD_PREFIX = 'alloflow:workspace-recovery:store_v1:snapshot:';
  var KEY_CHECK_AAD = 'alloflow:workspace-recovery:store_v1:key-check';
  var KEY_CHECK_VALUE = Object.freeze({ kind: 'alloflow-vault-key-check', v: 1 });

  function VaultError(code, message, cause) {
    this.name = 'AlloDeviceVaultError';
    this.code = code;
    this.message = message || code;
    if (cause) this.cause = cause;
    if (Error.captureStackTrace) Error.captureStackTrace(this, VaultError);
  }
  VaultError.prototype = Object.create(Error.prototype);
  VaultError.prototype.constructor = VaultError;

  function fail(code, message, cause) {
    throw new VaultError(code, message, cause);
  }

  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function jsonEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function safeId(value) {
    return typeof value === 'string' ? value.slice(0, 120) : '';
  }

  function safeDate(value) {
    var ms = Date.parse(typeof value === 'string' ? value : '');
    return Number.isFinite(ms) ? new Date(ms).toISOString() : new Date(0).toISOString();
  }

  function safeCount(value) {
    var number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function sanitizeRemovedIds(value) {
    var output = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return output;
    Object.keys(value).forEach(function (id) {
      var normalizedId = safeId(id);
      if (!normalizedId) return;
      var removedAt = value[id];
      output[normalizedId] = typeof removedAt === 'string' && removedAt
        ? removedAt.slice(0, 80)
        : true;
    });
    return output;
  }

  function emptyPlainStore() {
    return {
      version: 1,
      retentionPolicy: 'standard',
      effectiveRetentionPolicy: 'standard',
      legacyMigrationComplete: true,
      removedSnapshotIds: {},
      snapshots: []
    };
  }

  function normalizePlainStore(value) {
    if (value == null) return emptyPlainStore();
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail('VAULT_STORE_INVALID', 'The recovery store is not an object.');
    }
    if (isVaultStore(value)) return clone(value);
    if (value.version != null && value.version !== 1) {
      fail('VAULT_STORE_VERSION_UNSUPPORTED', 'This recovery store version is not supported.');
    }
    if (value.snapshots != null && !Array.isArray(value.snapshots)) {
      fail('VAULT_STORE_INVALID', 'The recovery snapshot list is invalid.');
    }
    return {
      version: 1,
      retentionPolicy: typeof value.retentionPolicy === 'string' ? value.retentionPolicy : 'standard',
      effectiveRetentionPolicy: typeof value.effectiveRetentionPolicy === 'string'
        ? value.effectiveRetentionPolicy
        : (typeof value.retentionPolicy === 'string' ? value.retentionPolicy : 'standard'),
      legacyMigrationComplete: value.legacyMigrationComplete === true,
      removedSnapshotIds: sanitizeRemovedIds(value.removedSnapshotIds),
      snapshots: clone(value.snapshots || [])
    };
  }

  function isVaultStore(value) {
    return !!(value && value.version === VAULT_VERSION && value.kind === VAULT_KIND && value.protection === 'password');
  }

  function validateRecord(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      fail('VAULT_STORE_INVALID', 'An encrypted recovery record is invalid.');
    }
    if (!safeId(record.id) || record.id !== safeId(record.id)) {
      fail('VAULT_STORE_INVALID', 'An encrypted recovery record has an invalid identifier.');
    }
    if (!record.payload || typeof record.payload !== 'object' || Array.isArray(record.payload)) {
      fail('VAULT_STORE_INVALID', 'An encrypted recovery record has no ciphertext payload.');
    }
  }

  function validateVaultStore(value) {
    if (!isVaultStore(value)) fail('VAULT_STORE_INVALID', 'This is not an AlloFlow recovery vault.');
    if (!value.wrappedKey || typeof value.wrappedKey !== 'object' || Array.isArray(value.wrappedKey)) {
      fail('VAULT_STORE_INVALID', 'The recovery vault has no wrapped data key.');
    }
    if (value.recoveryWrappedKey != null
      && (typeof value.recoveryWrappedKey !== 'object' || Array.isArray(value.recoveryWrappedKey))) {
      fail('VAULT_STORE_INVALID', 'The recovery vault has an invalid recovery-key wrapper.');
    }
    if (own(value, 'recoveryCode') || own(value, 'recoveryKey') || own(value, 'recoverySecret')) {
      fail('VAULT_PLAINTEXT_MIXED', 'A recovery code must never be persisted in the recovery vault.');
    }
    if (!value.keyCheck || typeof value.keyCheck !== 'object' || Array.isArray(value.keyCheck)) {
      fail('VAULT_STORE_INVALID', 'The recovery vault has no key verification record.');
    }
    if (!Array.isArray(value.records)) fail('VAULT_STORE_INVALID', 'The encrypted recovery record list is invalid.');
    if (Array.isArray(value.snapshots) && value.snapshots.length) {
      fail('VAULT_PLAINTEXT_MIXED', 'A protected recovery vault must not contain plaintext snapshots.');
    }
    var seen = Object.create(null);
    value.records.forEach(function (record) {
      validateRecord(record);
      if (seen[record.id]) fail('VAULT_STORE_INVALID', 'The recovery vault contains duplicate record identifiers.');
      seen[record.id] = true;
    });
    return value;
  }

  function snapshotMetadata(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      fail('VAULT_SNAPSHOT_INVALID', 'A workspace snapshot must be an object.');
    }
    var id = safeId(snapshot.id);
    if (!id) fail('VAULT_SNAPSHOT_INVALID', 'A workspace snapshot needs an identifier.');
    return {
      id: id,
      savedAt: safeDate(snapshot.savedAt),
      resourceCount: safeCount(snapshot.resourceCount),
      pinned: snapshot.pinned === true,
      approximateBytes: safeCount(snapshot.approximateBytes)
    };
  }

  function encryptedPayloadBytes(payload) {
    try { return JSON.stringify(payload).length; } catch (_) { return 0; }
  }

  function applyVaultRetention(store, nowMs) {
    var compact = store.effectiveRetentionPolicy === 'compact';
    var maxRecords = compact ? COMPACT_MAX_RECORDS : STANDARD_MAX_RECORDS;
    var maxBytes = compact ? COMPACT_MAX_BYTES : STANDARD_MAX_BYTES;
    var clock = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
    var ordered = store.records.map(function (record, index) {
      return { record: record, index: index };
    }).sort(function (left, right) {
      var delta = Date.parse(right.record.savedAt) - Date.parse(left.record.savedAt);
      return delta || left.index - right.index;
    }).map(function (entry) { return entry.record; });

    if (compact && ordered.length > 1) {
      var newestId = ordered[0] && ordered[0].id;
      ordered = ordered.filter(function (record) {
        var ageMs = Math.max(0, clock - Date.parse(record.savedAt));
        return record.resourceCount !== 0 || record.pinned || record.id === newestId
          || ageMs <= COMPACT_DRAFT_MAX_AGE_MS;
      });
    }

    var protectedIds = Object.create(null);
    ordered.forEach(function (record, index) {
      if (record.pinned || index === 0) protectedIds[record.id] = true;
    });
    var kept = ordered.filter(function (record) { return protectedIds[record.id]; });
    var keptBytes = kept.reduce(function (sum, record) {
      return sum + safeCount(record.approximateBytes);
    }, 0);
    for (var i = 0; i < ordered.length; i += 1) {
      var record = ordered[i];
      if (protectedIds[record.id]) continue;
      if (kept.length >= maxRecords) break;
      var size = safeCount(record.approximateBytes);
      if (keptBytes + size > maxBytes) break;
      kept.push(record);
      keptBytes += size;
    }
    kept.sort(function (left, right) { return Date.parse(right.savedAt) - Date.parse(left.savedAt); });
    return Object.assign({}, store, { records: kept });
  }

  function recordAad(id) {
    return SNAPSHOT_AAD_PREFIX + safeId(id);
  }

  function resolveCrypto(explicitCrypto) {
    if (explicitCrypto) return explicitCrypto;
    if (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AlloCrypto) {
      return window.AlloModules.AlloCrypto;
    }
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try { return require('./allo_crypto_module.js'); } catch (_) {}
    }
    fail('VAULT_CRYPTO_UNAVAILABLE', 'AlloCrypto is unavailable. Reload after the security module has loaded.');
  }

  function requireCryptoApi(cryptoApi) {
    var required = [
      'createVaultKey',
      'wrapVaultKey',
      'unwrapVaultKey',
      'rewrapVaultKey',
      'encryptRecord',
      'decryptRecord'
    ];
    required.forEach(function (name) {
      if (!cryptoApi || typeof cryptoApi[name] !== 'function') {
        fail('VAULT_CRYPTO_UNAVAILABLE', 'AlloCrypto.' + name + ' is unavailable.');
      }
    });
    return cryptoApi;
  }

  function requireRecoveryCryptoApi(cryptoApi) {
    requireCryptoApi(cryptoApi);
    ['generateRecoveryCode', 'normalizeRecoveryCode', 'validateRecoveryCode'].forEach(function (name) {
      if (typeof cryptoApi[name] !== 'function') {
        fail('VAULT_CRYPTO_UNAVAILABLE', 'AlloCrypto.' + name + ' is unavailable.');
      }
    });
    return cryptoApi;
  }

  function casSucceeded(result) {
    if (result === true) return true;
    if (!result || typeof result !== 'object') return false;
    if (result.ok === true || result.swapped === true || result.success === true) return true;
    return false;
  }

  function readResult(value) {
    if (!value || typeof value !== 'object' || !own(value, 'revision')) {
      fail('VAULT_REPOSITORY_INVALID', 'repository.read() must return { revision, store }.');
    }
    return {
      revision: value.revision,
      store: own(value, 'store') ? clone(value.store) : clone(value.value)
    };
  }

  function RecoveryVaultController(options) {
    options = options || {};
    if (!options.repository || typeof options.repository.read !== 'function'
      || typeof options.repository.compareAndSwap !== 'function') {
      fail('VAULT_REPOSITORY_INVALID', 'A repository with read() and compareAndSwap() is required.');
    }
    this.repository = options.repository;
    this.explicitCrypto = options.crypto || null;
    this.cryptoOptions = options.cryptoOptions || undefined;
    this.maxCasRetries = Math.max(1, Math.floor(Number(options.maxCasRetries) || DEFAULT_MAX_CAS_RETRIES));
    this.now = typeof options.now === 'function' ? options.now : function () { return new Date(); };
    this._dek = null;
  }

  RecoveryVaultController.prototype._crypto = function () {
    return requireCryptoApi(resolveCrypto(this.explicitCrypto));
  };

  RecoveryVaultController.prototype._read = async function () {
    return readResult(await this.repository.read());
  };

  RecoveryVaultController.prototype._cas = async function (revision, nextStore) {
    return casSucceeded(await this.repository.compareAndSwap(revision, clone(nextStore)));
  };

  RecoveryVaultController.prototype._verifyKey = async function (store, dek) {
    validateVaultStore(store);
    try {
      var check = await this._crypto().decryptRecord(store.keyCheck, dek, KEY_CHECK_AAD);
      if (!jsonEqual(check, KEY_CHECK_VALUE)) fail('VAULT_KEY_INVALID', 'The recovery vault key check failed.');
      return true;
    } catch (error) {
      if (error && error.code === 'VAULT_KEY_INVALID') throw error;
      fail('VAULT_PASSWORD_OR_CORRUPT', 'The password is incorrect or the recovery vault is damaged.', error);
    }
  };

  RecoveryVaultController.prototype._requireUnlockedKey = async function (store) {
    if (!this._dek) fail('VAULT_LOCKED', 'Unlock the recovery vault before reading or saving workspace contents.');
    try {
      await this._verifyKey(store, this._dek);
      return this._dek;
    } catch (error) {
      this._dek = null;
      throw error;
    }
  };

  RecoveryVaultController.prototype._decryptRecord = async function (store, record, dek) {
    var snapshot;
    try {
      snapshot = await this._crypto().decryptRecord(record.payload, dek, recordAad(record.id));
    } catch (error) {
      fail('VAULT_RECORD_CORRUPT', 'An encrypted workspace could not be authenticated.', error);
    }
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) || safeId(snapshot.id) !== record.id) {
      fail('VAULT_RECORD_CORRUPT', 'An encrypted workspace does not match its record identifier.');
    }
    return Object.assign({}, snapshot, {
      pinned: record.pinned === true,
      approximateBytes: safeCount(record.approximateBytes)
    });
  };

  RecoveryVaultController.prototype._buildVault = async function (plainStore, password, options) {
    if (!password) fail('VAULT_PASSWORD_REQUIRED', 'A non-empty password is required.');
    options = options || {};
    var cryptoApi = this._crypto();
    var plain = normalizePlainStore(plainStore);
    var dek = await cryptoApi.createVaultKey();
    var wrappedKey = await cryptoApi.wrapVaultKey(dek, password, this.cryptoOptions);
    var recoveryCode = null;
    var recoveryWrappedKey = null;
    if (options.createRecoveryKey === true) {
      requireRecoveryCryptoApi(cryptoApi);
      recoveryCode = options.recoveryCode
        ? cryptoApi.normalizeRecoveryCode(options.recoveryCode)
        : cryptoApi.generateRecoveryCode();
      recoveryWrappedKey = await cryptoApi.wrapVaultKey(dek, recoveryCode, this.cryptoOptions);
    }
    var keyCheck = await cryptoApi.encryptRecord(KEY_CHECK_VALUE, dek, KEY_CHECK_AAD);
    var records = [];

    for (var i = 0; i < plain.snapshots.length; i += 1) {
      var source = clone(plain.snapshots[i]);
      var metadata = snapshotMetadata(source);
      source.id = metadata.id;
      source.savedAt = metadata.savedAt;
      source.pinned = metadata.pinned;
      var payload = await cryptoApi.encryptRecord(source, dek, recordAad(metadata.id));
      metadata.approximateBytes = encryptedPayloadBytes(payload);
      var verified = await cryptoApi.decryptRecord(payload, dek, recordAad(metadata.id));
      if (!jsonEqual(verified, source)) {
        fail('VAULT_MIGRATION_VERIFY_FAILED', 'An encrypted workspace failed verification before migration.');
      }
      records.push(Object.assign({}, metadata, { payload: payload }));
    }

    var vault = {
      version: VAULT_VERSION,
      kind: VAULT_KIND,
      protection: 'password',
      wrappedKey: wrappedKey,
      keyCheck: keyCheck,
      retentionPolicy: plain.retentionPolicy,
      effectiveRetentionPolicy: plain.effectiveRetentionPolicy,
      legacyMigrationComplete: plain.legacyMigrationComplete,
      removedSnapshotIds: sanitizeRemovedIds(plain.removedSnapshotIds),
      records: records
    };
    if (recoveryWrappedKey) vault.recoveryWrappedKey = recoveryWrappedKey;
    vault = applyVaultRetention(vault, this.now().getTime());
    validateVaultStore(vault);
    await this._verifyKey(vault, dek);
    return { vault: vault, dek: dek, recoveryCode: recoveryCode };
  };

  RecoveryVaultController.prototype.getStatus = async function () {
    var head = await this._read();
    var store = head.store;
    if (isVaultStore(store)) {
      validateVaultStore(store);
      return {
        enabled: true,
        locked: !this._dek,
        snapshotCount: store.records.length,
        recoveryEnabled: Boolean(store.recoveryWrappedKey),
        retentionPolicy: store.retentionPolicy,
        effectiveRetentionPolicy: store.effectiveRetentionPolicy
      };
    }
    var plain = normalizePlainStore(store);
    return {
      enabled: false,
      locked: false,
      snapshotCount: plain.snapshots.length,
      recoveryEnabled: false,
      retentionPolicy: plain.retentionPolicy,
      effectiveRetentionPolicy: plain.effectiveRetentionPolicy
    };
  };

  RecoveryVaultController.prototype.enableProtection = async function (password, options) {
    if (!password) fail('VAULT_PASSWORD_REQUIRED', 'A non-empty password is required.');
    options = options || {};
    for (var attempt = 0; attempt < this.maxCasRetries; attempt += 1) {
      var head = await this._read();
      if (isVaultStore(head.store)) {
        await this.unlock(password);
        return { enabled: true, alreadyEnabled: true };
      }
      var built = await this._buildVault(normalizePlainStore(head.store), password, options);
      if (await this._cas(head.revision, built.vault)) {
        this._dek = built.dek;
        return {
          enabled: true,
          migratedSnapshots: built.vault.records.length,
          recoveryEnabled: Boolean(built.vault.recoveryWrappedKey),
          recoveryCode: built.recoveryCode
        };
      }
    }
    fail('VAULT_CONFLICT', 'The recovery store changed repeatedly while protection was being enabled.');
  };

  RecoveryVaultController.prototype.unlock = async function (password) {
    if (!password) fail('VAULT_PASSWORD_REQUIRED', 'A non-empty password is required.');
    var head = await this._read();
    if (!isVaultStore(head.store)) fail('VAULT_NOT_ENABLED', 'Password protection is not enabled for saved work.');
    var store = validateVaultStore(head.store);
    var dek;
    try {
      dek = await this._crypto().unwrapVaultKey(store.wrappedKey, password);
      await this._verifyKey(store, dek);
    } catch (error) {
      this._dek = null;
      if (error && error.code === 'VAULT_PASSWORD_OR_CORRUPT') throw error;
      fail('VAULT_PASSWORD_OR_CORRUPT', 'The password is incorrect or the recovery vault is damaged.', error);
    }
    this._dek = dek;
    return { unlocked: true, snapshotCount: store.records.length };
  };

  RecoveryVaultController.prototype.lock = function () {
    this._dek = null;
    return { locked: true };
  };

  RecoveryVaultController.prototype.confirmRecoveryCode = function (expectedCode, enteredCode) {
    var cryptoApi = requireRecoveryCryptoApi(this._crypto());
    try {
      return cryptoApi.normalizeRecoveryCode(expectedCode) === cryptoApi.normalizeRecoveryCode(enteredCode);
    } catch (_) {
      return false;
    }
  };

  RecoveryVaultController.prototype.recoverWithKey = async function (recoveryCode, newPassword) {
    if (!recoveryCode) fail('VAULT_RECOVERY_KEY_REQUIRED', 'A recovery key is required.');
    if (!newPassword) fail('VAULT_PASSWORD_REQUIRED', 'A non-empty new password is required.');
    var cryptoApi = requireRecoveryCryptoApi(this._crypto());
    var normalizedCode;
    try {
      normalizedCode = cryptoApi.normalizeRecoveryCode(recoveryCode);
      if (!cryptoApi.validateRecoveryCode(normalizedCode)) throw new Error('INVALID_RECOVERY_CODE');
    } catch (error) {
      fail('VAULT_RECOVERY_KEY_OR_CORRUPT', 'The recovery key is incorrect or the recovery vault is damaged.', error);
    }
    for (var attempt = 0; attempt < this.maxCasRetries; attempt += 1) {
      var head = await this._read();
      if (!isVaultStore(head.store)) fail('VAULT_NOT_ENABLED', 'Password protection is not enabled for saved work.');
      var store = validateVaultStore(head.store);
      if (!store.recoveryWrappedKey) {
        fail('VAULT_RECOVERY_NOT_ENABLED', 'No recovery key was created for this recovery vault.');
      }
      var dek;
      try {
        dek = await cryptoApi.unwrapVaultKey(store.recoveryWrappedKey, normalizedCode);
        await this._verifyKey(store, dek);
      } catch (error) {
        this._dek = null;
        fail('VAULT_RECOVERY_KEY_OR_CORRUPT', 'The recovery key is incorrect or the recovery vault is damaged.', error);
      }
      var wrappedKey = await cryptoApi.wrapVaultKey(dek, newPassword, this.cryptoOptions);
      var verifiedDek;
      try {
        verifiedDek = await cryptoApi.unwrapVaultKey(wrappedKey, newPassword);
        await this._verifyKey(store, verifiedDek);
      } catch (error) {
        fail('VAULT_REKEY_VERIFY_FAILED', 'The recovered password wrapper failed verification; no change was saved.', error);
      }
      var next = Object.assign({}, store, { wrappedKey: wrappedKey });
      if (await this._cas(head.revision, next)) {
        this._dek = verifiedDek;
        return { recovered: true, recoveryKeyRotated: false };
      }
    }
    this._dek = null;
    fail('VAULT_CONFLICT', 'The recovery store changed repeatedly while the password was being recovered.');
  };

  RecoveryVaultController.prototype.rotateRecoveryKey = async function (confirmedRecoveryCode) {
    var cryptoApi = requireRecoveryCryptoApi(this._crypto());
    for (var attempt = 0; attempt < this.maxCasRetries; attempt += 1) {
      var head = await this._read();
      if (!isVaultStore(head.store)) fail('VAULT_NOT_ENABLED', 'Password protection is not enabled for saved work.');
      var store = validateVaultStore(head.store);
      var dek = await this._requireUnlockedKey(store);
      var recoveryCode = confirmedRecoveryCode
        ? cryptoApi.normalizeRecoveryCode(confirmedRecoveryCode)
        : cryptoApi.generateRecoveryCode();
      var recoveryWrappedKey = await cryptoApi.wrapVaultKey(dek, recoveryCode, this.cryptoOptions);
      try {
        var verifiedDek = await cryptoApi.unwrapVaultKey(recoveryWrappedKey, recoveryCode);
        await this._verifyKey(store, verifiedDek);
      } catch (error) {
        fail('VAULT_RECOVERY_ROTATE_VERIFY_FAILED', 'The new recovery key failed verification; no change was saved.', error);
      }
      var next = Object.assign({}, store, { recoveryWrappedKey: recoveryWrappedKey });
      if (await this._cas(head.revision, next)) {
        this._dek = dek;
        return { rotated: true, recoveryCode: recoveryCode };
      }
    }
    fail('VAULT_CONFLICT', 'The recovery store changed repeatedly while the recovery key was being rotated.');
  };

  RecoveryVaultController.prototype.removeRecoveryKey = async function (password) {
    if (!password) fail('VAULT_PASSWORD_REQUIRED', 'Enter the saved-work password before removing the recovery key.');
    for (var attempt = 0; attempt < this.maxCasRetries; attempt += 1) {
      var head = await this._read();
      if (!isVaultStore(head.store)) fail('VAULT_NOT_ENABLED', 'Password protection is not enabled for saved work.');
      var store = validateVaultStore(head.store);
      var dek;
      try {
        dek = await this._crypto().unwrapVaultKey(store.wrappedKey, password);
        await this._verifyKey(store, dek);
      } catch (error) {
        fail('VAULT_PASSWORD_OR_CORRUPT', 'The password is incorrect or the recovery vault is damaged.', error);
      }
      if (!store.recoveryWrappedKey) {
        this._dek = dek;
        return { removed: false, alreadyDisabled: true };
      }
      var next = Object.assign({}, store);
      delete next.recoveryWrappedKey;
      if (await this._cas(head.revision, next)) {
        this._dek = dek;
        return { removed: true };
      }
    }
    fail('VAULT_CONFLICT', 'The recovery store changed repeatedly while the recovery key was being removed.');
  };

  RecoveryVaultController.prototype.listSnapshots = async function (options) {
    options = options || {};
    var head = await this._read();
    if (!isVaultStore(head.store)) {
      return normalizePlainStore(head.store).snapshots.map(function (snapshot) {
        return Object.assign({}, snapshotMetadata(snapshot), {
          title: typeof snapshot.title === 'string' ? snapshot.title : 'Untitled workspace',
          locked: false
        });
      });
    }
    var store = validateVaultStore(head.store);
    var base = store.records.map(function (record) {
      return {
        id: record.id,
        savedAt: record.savedAt,
        resourceCount: record.resourceCount,
        pinned: record.pinned === true,
        approximateBytes: record.approximateBytes,
        title: 'Encrypted workspace',
        locked: !this._dek
      };
    }, this);
    if (!this._dek || options.decryptTitles !== true) return base;
    var dek = await this._requireUnlockedKey(store);
    for (var i = 0; i < store.records.length; i += 1) {
      var snapshot = await this._decryptRecord(store, store.records[i], dek);
      base[i].title = typeof snapshot.title === 'string' && snapshot.title ? snapshot.title : 'Untitled workspace';
      base[i].locked = false;
    }
    return base;
  };

  RecoveryVaultController.prototype.readPlainStore = async function () {
    var head = await this._read();
    if (!isVaultStore(head.store)) return normalizePlainStore(head.store);
    var store = validateVaultStore(head.store);
    var dek = await this._requireUnlockedKey(store);
    var snapshots = [];
    for (var i = 0; i < store.records.length; i += 1) {
      snapshots.push(await this._decryptRecord(store, store.records[i], dek));
    }
    return {
      version: 1,
      retentionPolicy: store.retentionPolicy,
      effectiveRetentionPolicy: store.effectiveRetentionPolicy,
      legacyMigrationComplete: store.legacyMigrationComplete === true,
      removedSnapshotIds: sanitizeRemovedIds(store.removedSnapshotIds),
      snapshots: snapshots
    };
  };

  RecoveryVaultController.prototype.restoreSnapshot = async function (id) {
    var normalizedId = safeId(id);
    if (!normalizedId) fail('VAULT_SNAPSHOT_INVALID', 'A workspace identifier is required.');
    var head = await this._read();
    if (!isVaultStore(head.store)) {
      var plain = normalizePlainStore(head.store);
      var foundPlain = plain.snapshots.find(function (snapshot) { return safeId(snapshot && snapshot.id) === normalizedId; });
      if (!foundPlain) fail('VAULT_SNAPSHOT_NOT_FOUND', 'The saved workspace no longer exists.');
      return clone(foundPlain);
    }
    var store = validateVaultStore(head.store);
    var dek = await this._requireUnlockedKey(store);
    var record = store.records.find(function (item) { return item.id === normalizedId; });
    if (!record) fail('VAULT_SNAPSHOT_NOT_FOUND', 'The saved workspace no longer exists.');
    return this._decryptRecord(store, record, dek);
  };

  RecoveryVaultController.prototype.upsertSnapshot = async function (snapshot) {
    var initial = clone(snapshot);
    var metadata = snapshotMetadata(initial);
    for (var attempt = 0; attempt < this.maxCasRetries; attempt += 1) {
      var head = await this._read();
      if (!isVaultStore(head.store)) {
        fail('VAULT_NOT_ENABLED', 'Encrypted workspace saving requires an enabled recovery vault.');
      }
      var store = validateVaultStore(head.store);
      var dek = await this._requireUnlockedKey(store);
      if (own(store.removedSnapshotIds || {}, metadata.id)) {
        return { saved: false, reason: 'removed', store: clone(store) };
      }
      var existing = store.records.find(function (record) { return record.id === metadata.id; });
      if (existing && Date.parse(existing.savedAt) >= Date.parse(metadata.savedAt)) {
        return { saved: false, reason: 'stale', store: clone(store) };
      }
      var source = clone(initial);
      source.id = metadata.id;
      source.savedAt = metadata.savedAt;
      if (existing) source.pinned = existing.pinned === true;
      var nextMetadata = snapshotMetadata(source);
      var payload = await this._crypto().encryptRecord(source, dek, recordAad(nextMetadata.id));
      nextMetadata.approximateBytes = encryptedPayloadBytes(payload);
      var verified = await this._crypto().decryptRecord(payload, dek, recordAad(nextMetadata.id));
      if (!jsonEqual(verified, source)) fail('VAULT_SAVE_VERIFY_FAILED', 'The encrypted workspace failed verification before saving.');
      var nextRecord = Object.assign({}, nextMetadata, { payload: payload });
      var next = Object.assign({}, store, {
        records: [nextRecord].concat(store.records.filter(function (record) { return record.id !== nextMetadata.id; }))
      });
      next = applyVaultRetention(next, this.now().getTime());
      if (await this._cas(head.revision, next)) return { saved: true, store: clone(next) };
    }
    fail('VAULT_CONFLICT', 'The recovery store changed repeatedly while the workspace was being saved.');
  };

  RecoveryVaultController.prototype.setPinned = async function (id, pinned) {
    var normalizedId = safeId(id);
    if (!normalizedId) fail('VAULT_SNAPSHOT_INVALID', 'A workspace identifier is required.');
    for (var attempt = 0; attempt < this.maxCasRetries; attempt += 1) {
      var head = await this._read();
      var next;
      if (isVaultStore(head.store)) {
        var vault = validateVaultStore(head.store);
        if (!vault.records.some(function (record) { return record.id === normalizedId; })) {
          return { changed: false, reason: 'missing', store: clone(vault) };
        }
        next = Object.assign({}, vault, {
          records: vault.records.map(function (record) {
            return record.id === normalizedId ? Object.assign({}, record, { pinned: pinned === true }) : record;
          })
        });
        if (pinned !== true) next = applyVaultRetention(next, this.now().getTime());
      } else {
        var plain = normalizePlainStore(head.store);
        if (!plain.snapshots.some(function (item) { return safeId(item && item.id) === normalizedId; })) {
          return { changed: false, reason: 'missing', store: clone(plain) };
        }
        next = Object.assign({}, plain, {
          snapshots: plain.snapshots.map(function (item) {
            return safeId(item && item.id) === normalizedId ? Object.assign({}, item, { pinned: pinned === true }) : item;
          })
        });
      }
      if (await this._cas(head.revision, next)) return { changed: true, store: clone(next) };
    }
    fail('VAULT_CONFLICT', 'The recovery store changed repeatedly while the pin was being updated.');
  };

  RecoveryVaultController.prototype.deleteSnapshot = async function (id) {
    var normalizedId = safeId(id);
    if (!normalizedId) fail('VAULT_SNAPSHOT_INVALID', 'A workspace identifier is required.');
    for (var attempt = 0; attempt < this.maxCasRetries; attempt += 1) {
      var head = await this._read();
      var removedAt = this.now().toISOString();
      var next;
      if (isVaultStore(head.store)) {
        var vault = validateVaultStore(head.store);
        next = Object.assign({}, vault, {
          legacyMigrationComplete: true,
          removedSnapshotIds: Object.assign({}, vault.removedSnapshotIds || {}, (function () {
            var value = {}; value[normalizedId] = removedAt; return value;
          })()),
          records: vault.records.filter(function (record) { return record.id !== normalizedId; })
        });
      } else {
        var plain = normalizePlainStore(head.store);
        next = Object.assign({}, plain, {
          legacyMigrationComplete: true,
          removedSnapshotIds: Object.assign({}, plain.removedSnapshotIds || {}, (function () {
            var value = {}; value[normalizedId] = removedAt; return value;
          })()),
          snapshots: plain.snapshots.filter(function (item) { return safeId(item && item.id) !== normalizedId; })
        });
      }
      if (await this._cas(head.revision, next)) return { deleted: true, store: clone(next) };
    }
    fail('VAULT_CONFLICT', 'The recovery store changed repeatedly while the workspace was being deleted.');
  };

  RecoveryVaultController.prototype.setPolicy = async function (policyId, effectivePolicyId) {
    if (typeof policyId !== 'string' || !policyId) fail('VAULT_POLICY_INVALID', 'A retention policy identifier is required.');
    for (var attempt = 0; attempt < this.maxCasRetries; attempt += 1) {
      var head = await this._read();
      var current = isVaultStore(head.store) ? validateVaultStore(head.store) : normalizePlainStore(head.store);
      var next = Object.assign({}, current, {
        retentionPolicy: policyId,
        effectiveRetentionPolicy: typeof effectivePolicyId === 'string' && effectivePolicyId
          ? effectivePolicyId
          : policyId
      });
      if (isVaultStore(next)) next = applyVaultRetention(next, this.now().getTime());
      if (await this._cas(head.revision, next)) return { changed: true, store: clone(next) };
    }
    fail('VAULT_CONFLICT', 'The recovery store changed repeatedly while the retention policy was being updated.');
  };

  RecoveryVaultController.prototype.changePassword = async function (oldPassword, newPassword) {
    if (!oldPassword || !newPassword) fail('VAULT_PASSWORD_REQUIRED', 'Both the current and new passwords are required.');
    for (var attempt = 0; attempt < this.maxCasRetries; attempt += 1) {
      var head = await this._read();
      if (!isVaultStore(head.store)) fail('VAULT_NOT_ENABLED', 'Password protection is not enabled for saved work.');
      var store = validateVaultStore(head.store);
      var cryptoApi = this._crypto();
      var wrapped;
      try {
        wrapped = await cryptoApi.rewrapVaultKey(store.wrappedKey, oldPassword, newPassword, this.cryptoOptions);
      } catch (error) {
        fail('VAULT_PASSWORD_OR_CORRUPT', 'The current password is incorrect or the recovery vault is damaged.', error);
      }
      var next = Object.assign({}, store, { wrappedKey: wrapped });
      var nextDek;
      try {
        nextDek = await cryptoApi.unwrapVaultKey(wrapped, newPassword);
        await this._verifyKey(next, nextDek);
      } catch (error) {
        fail('VAULT_REKEY_VERIFY_FAILED', 'The new password wrapper failed verification; no change was saved.', error);
      }
      if (await this._cas(head.revision, next)) {
        this._dek = nextDek;
        return { changed: true };
      }
    }
    fail('VAULT_CONFLICT', 'The recovery store changed repeatedly while the password was being changed.');
  };

  RecoveryVaultController.prototype.disableProtection = async function (password) {
    for (var attempt = 0; attempt < this.maxCasRetries; attempt += 1) {
      var head = await this._read();
      if (!isVaultStore(head.store)) {
        this._dek = null;
        return { disabled: true, alreadyDisabled: true };
      }
      var store = validateVaultStore(head.store);
      var dek = null;
      if (password) {
        try { dek = await this._crypto().unwrapVaultKey(store.wrappedKey, password); }
        catch (error) { fail('VAULT_PASSWORD_OR_CORRUPT', 'The password is incorrect or the recovery vault is damaged.', error); }
      } else {
        dek = this._dek;
      }
      if (!dek) fail('VAULT_PASSWORD_REQUIRED', 'Unlock the vault or enter its password before disabling protection.');
      await this._verifyKey(store, dek);
      var snapshots = [];
      for (var i = 0; i < store.records.length; i += 1) {
        snapshots.push(await this._decryptRecord(store, store.records[i], dek));
      }
      var plain = {
        version: 1,
        retentionPolicy: store.retentionPolicy,
        effectiveRetentionPolicy: store.effectiveRetentionPolicy,
        legacyMigrationComplete: store.legacyMigrationComplete === true,
        removedSnapshotIds: sanitizeRemovedIds(store.removedSnapshotIds),
        snapshots: snapshots
      };
      if (await this._cas(head.revision, plain)) {
        this._dek = null;
        return { disabled: true, restoredSnapshots: snapshots.length };
      }
    }
    fail('VAULT_CONFLICT', 'The recovery store changed repeatedly while protection was being disabled.');
  };

  RecoveryVaultController.prototype.exportEncryptedBackup = async function () {
    var head = await this._read();
    if (!isVaultStore(head.store)) {
      fail('VAULT_NOT_ENABLED', 'Enable saved-work protection before creating an encrypted backup.');
    }
    var store = validateVaultStore(head.store);
    return {
      kind: BACKUP_KIND,
      version: BACKUP_VERSION,
      exportedAt: this.now().toISOString(),
      vault: clone(store)
    };
  };

  RecoveryVaultController.prototype.importEncryptedBackup = async function (backup, password, options) {
    options = options || {};
    if (!backup || backup.kind !== BACKUP_KIND || backup.version !== BACKUP_VERSION || !backup.vault) {
      fail('VAULT_BACKUP_INVALID', 'This is not a supported AlloFlow encrypted recovery backup.');
    }
    if (!password) fail('VAULT_PASSWORD_REQUIRED', 'The backup password is required before import.');
    var imported = clone(backup.vault);
    validateVaultStore(imported);
    var dek;
    var importedWrapper = options.useRecoveryKey === true ? imported.recoveryWrappedKey : imported.wrappedKey;
    if (!importedWrapper) {
      fail('VAULT_RECOVERY_NOT_CONFIGURED', 'This backup does not contain a recovery-key wrapper.');
    }
    try {
      dek = await this._crypto().unwrapVaultKey(importedWrapper, password);
      await this._verifyKey(imported, dek);
      if (options.useRecoveryKey === true) {
        if (!options.newPassword) fail('VAULT_PASSWORD_REQUIRED', 'Choose a new password when restoring a backup with its recovery key.');
        imported.wrappedKey = await this._crypto().wrapVaultKey(dek, options.newPassword, this.cryptoOptions);
        var verifiedDek = await this._crypto().unwrapVaultKey(imported.wrappedKey, options.newPassword);
        await this._verifyKey(imported, verifiedDek);
        dek = verifiedDek;
      }
      for (var i = 0; i < imported.records.length; i += 1) {
        await this._decryptRecord(imported, imported.records[i], dek);
      }
    } catch (error) {
      if (error && error.code && /^VAULT_/.test(error.code)) throw error;
      fail(options.useRecoveryKey === true ? 'VAULT_RECOVERY_KEY_OR_CORRUPT' : 'VAULT_PASSWORD_OR_CORRUPT',
        options.useRecoveryKey === true
          ? 'The backup recovery key is incorrect or the backup is damaged.'
          : 'The backup password is incorrect or the backup is damaged.', error);
    }
    var head = await this._read();
    var currentCount = isVaultStore(head.store)
      ? validateVaultStore(head.store).records.length
      : normalizePlainStore(head.store).snapshots.length;
    if (currentCount > 0 && options.replace !== true) {
      fail('VAULT_IMPORT_REPLACE_REQUIRED', 'Import would replace saved work; explicit replace confirmation is required.');
    }
    if (!(await this._cas(head.revision, imported))) {
      fail('VAULT_CONFLICT', 'Saved work changed before the encrypted backup could be imported.');
    }
    this._dek = dek;
    return { imported: true, snapshotCount: imported.records.length };
  };

  RecoveryVaultController.prototype.eraseAll = async function () {
    for (var attempt = 0; attempt < this.maxCasRetries; attempt += 1) {
      var head = await this._read();
      if (await this._cas(head.revision, emptyPlainStore())) {
        this._dek = null;
        return { erased: true };
      }
    }
    fail('VAULT_CONFLICT', 'The recovery store changed repeatedly while saved work was being erased.');
  };

  function createRecoveryVaultController(options) {
    return new RecoveryVaultController(options);
  }

  var AlloDeviceVault = {
    createRecoveryVaultController: createRecoveryVaultController,
    RecoveryVaultController: RecoveryVaultController,
    VaultError: VaultError,
    isVaultStore: isVaultStore,
    validateVaultStore: validateVaultStore,
    emptyPlainStore: emptyPlainStore,
    VAULT_VERSION: VAULT_VERSION,
    VAULT_KIND: VAULT_KIND,
    BACKUP_KIND: BACKUP_KIND,
    BACKUP_VERSION: BACKUP_VERSION
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AlloDeviceVault;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AlloDeviceVault = AlloDeviceVault;
  }
})();
