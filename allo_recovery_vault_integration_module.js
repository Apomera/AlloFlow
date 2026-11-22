/**
 * AlloFlow recovery-vault/device-storage integration.
 *
 * Keeps the security-sensitive persistence seam out of the React monolith.
 * The repository maps the vault controller's optimistic-concurrency contract
 * onto DeviceStorage.compareAndSwap(), including a one-time exact-value token
 * for atomically migrating the legacy revisionless plaintext recovery store.
 */
(function () {
  'use strict';

  var DEFAULT_NAMESPACE = 'workspace_recovery';
  var DEFAULT_KEY = 'store_v1';
  var SCOPE_RE = /^[A-Za-z0-9_.-]{1,64}$/;

  function fail(code, message) {
    var error = new Error(message || code);
    error.code = code;
    throw error;
  }
  function clone(value) {
    if (value == null) return value;
    var serialized;
    try { serialized = JSON.stringify(value); }
    catch (_) { fail('VAULT_STORE_INVALID', 'Recovery-vault values must be JSON-serializable.'); }
    if (typeof serialized !== 'string') fail('VAULT_STORE_INVALID', 'Recovery-vault values must be JSON-serializable.');
    return JSON.parse(serialized, function (k, v) {
      return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
    });
  }
  var hasOwn = Object.prototype.hasOwnProperty;

  function isPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  function isSafeReadRevision(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }
  function isValidExpectedRevision(expected) {
    if (Number.isSafeInteger(expected) && expected >= 1 && expected < Number.MAX_SAFE_INTEGER) return true;
    if (!isPlainObject(expected)) return false;
    var mode = hasOwn.call(expected, 'mode') ? expected.mode : undefined;
    if (mode === 'absent') return true;
    if (mode === 'value' && hasOwn.call(expected, 'value') && expected.value !== undefined) return true;
    return false;
  }
  function normalizeScope(value, fallback, label) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value !== 'string' || !SCOPE_RE.test(value) || value === '.' || value.indexOf('__') === 0 || value === '__proto__' || value === 'constructor' || value === 'prototype' || value.indexOf('..') !== -1) {
      fail('VAULT_STORAGE_INVALID_SCOPE', 'Invalid recovery-vault ' + label + '.');
    }
    return value;
  }
  function requireStorage(storage) {
    if (!storage || typeof storage.get !== 'function' || typeof storage.compareAndSwap !== 'function') {
      fail('VAULT_STORAGE_UNAVAILABLE', 'Device storage with atomic compare-and-swap is required.');
    }
    return storage;
  }

  function createDeviceRepository(storage, options) {
    storage = requireStorage(storage);
    options = (options && typeof options === 'object' && !Array.isArray(options)) ? options : {};
    var namespace = normalizeScope(options.namespace, DEFAULT_NAMESPACE, 'namespace');
    var key = normalizeScope(options.key, DEFAULT_KEY, 'key');
    var queue = options.queue === true;
    return {
      async read() {
        var current = await storage.get(namespace, key);
        if (current == null) {
          return { revision: { mode: 'absent' }, store: null };
        }
        if (typeof current === 'object' && !Array.isArray(current) && hasOwn.call(current, 'revision') && isSafeReadRevision(current.revision)) {
          return { revision: current.revision, store: clone(current) };
        }
        // Only the legacy plaintext store is revisionless. Passing its exact
        // value back to the adapter makes migration atomic with concurrent tabs.
        return {
          revision: { mode: 'value', value: clone(current) },
          store: clone(current)
        };
      },
      async compareAndSwap(expected, nextStore) {
        if (!isValidExpectedRevision(expected)) {
          fail('VAULT_REVISION_INVALID', 'A valid optimistic-concurrency revision token is required.');
        }
        if (!isPlainObject(nextStore)) {
          fail('VAULT_STORE_INVALID', 'The next recovery-vault store must be an object.');
        }
        var clonedNext = clone(nextStore);
        if (!clonedNext || typeof clonedNext !== 'object' || Array.isArray(clonedNext)) {
          fail('VAULT_STORE_INVALID', 'The next recovery-vault store must be an object.');
        }
        var result = await storage.compareAndSwap(
          namespace,
          key,
          clone(expected),
          clonedNext,
          { queue: queue }
        );
        return !!(result && result.applied === true);
      }
    };
  }

  function resolveVaultModule(explicit) {
    if (explicit) return explicit;
    if (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AlloDeviceVault) {
      return window.AlloModules.AlloDeviceVault;
    }
    try { return require('./allo_device_vault_module.js'); } catch (_) { return null; }
  }

  function createController(storage, options) {
    options = (options && typeof options === 'object' && !Array.isArray(options)) ? options : {};
    var vault = resolveVaultModule(options.vaultModule);
    if (!vault || typeof vault.createRecoveryVaultController !== 'function') {
      fail('VAULT_MODULE_UNAVAILABLE', 'The recovery-vault security module has not loaded.');
    }
    var repository = createDeviceRepository(storage, options);
    return vault.createRecoveryVaultController({
      repository: repository,
      crypto: options.crypto,
      cryptoOptions: options.cryptoOptions,
      maxCasRetries: options.maxCasRetries,
      now: options.now
    });
  }

  var api = Object.freeze({
    createDeviceRepository: createDeviceRepository,
    createController: createController,
    DEFAULT_NAMESPACE: DEFAULT_NAMESPACE,
    DEFAULT_KEY: DEFAULT_KEY
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AlloRecoveryVaultIntegration = api;
  }
})();
