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

  function fail(code, message) {
    var error = new Error(message || code);
    error.code = code;
    throw error;
  }
  function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }
  function isSafeRevision(value) {
    return Number.isSafeInteger(value) && value >= 1;
  }
  function requireStorage(storage) {
    if (!storage || typeof storage.get !== 'function' || typeof storage.compareAndSwap !== 'function') {
      fail('VAULT_STORAGE_UNAVAILABLE', 'Device storage with atomic compare-and-swap is required.');
    }
    return storage;
  }

  function createDeviceRepository(storage, options) {
    storage = requireStorage(storage);
    options = options || {};
    var namespace = options.namespace || DEFAULT_NAMESPACE;
    var key = options.key || DEFAULT_KEY;
    var queue = options.queue === true;
    return {
      async read() {
        var current = await storage.get(namespace, key);
        if (current == null) {
          return { revision: { mode: 'absent' }, store: null };
        }
        if (isSafeRevision(current.revision)) {
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
        if (!nextStore || typeof nextStore !== 'object' || Array.isArray(nextStore)) {
          fail('VAULT_STORE_INVALID', 'The next recovery-vault store must be an object.');
        }
        var result = await storage.compareAndSwap(
          namespace,
          key,
          clone(expected),
          clone(nextStore),
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
    options = options || {};
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

  var api = {
    createDeviceRepository: createDeviceRepository,
    createController: createController,
    DEFAULT_NAMESPACE: DEFAULT_NAMESPACE,
    DEFAULT_KEY: DEFAULT_KEY
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AlloRecoveryVaultIntegration = api;
  }
})();
