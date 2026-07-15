/**
 * AlloFlow Agent Core - strict media security facade.
 *
 * Additive hardening around AgentCoreMediaContracts and the in-memory managed
 * asset store. Future adapters should consume this facade, not the lower-level
 * reference modules directly. It remains inert and registers no MCP tools.
 */
(function () {
  'use strict';

  var SECRET_FIELD_RE = /(?:^|[_-])(?:api)?key$|token|secret|password|credential|authorization|bearer|privatekey/i;
  var IDENTIFIER_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
  var MAX_DEPTH = 8;

  function getDependencies(injected) {
    var deps = injected || {};
    var modules = typeof window !== 'undefined' && window.AlloModules ? window.AlloModules : {};
    return {
      contracts: deps.contracts || modules.AgentCoreMediaContracts,
      assetStore: deps.assetStore || modules.AgentCoreManagedAssetStore
    };
  }

  function issue(code, path, message) {
    return { code: code, path: path, message: message };
  }

  function scanSecrets(value, path, errors, depth) {
    if (!value || typeof value !== 'object') return;
    if (depth > MAX_DEPTH) {
      errors.push(issue('payload-too-deep', path, 'Media payload exceeds the security scan depth.'));
      return;
    }
    Object.keys(value).forEach(function (key) {
      var nextPath = path ? path + '.' + key : key;
      if (SECRET_FIELD_RE.test(key)) {
        errors.push(issue('secret-like-field', nextPath, 'Runtime credentials may not appear in agent-visible media payloads.'));
        return;
      }
      scanSecrets(value[key], nextPath, errors, depth + 1);
    });
  }

  function validateProviderInventory(input, injected) {
    var dependencies = getDependencies(injected);
    if (!dependencies.contracts) throw new Error('AgentCoreMediaContracts is required');
    var report = dependencies.contracts.validateProviderInventory(input);
    var errors = report.errors ? report.errors.slice() : [];
    scanSecrets(input, '', errors, 0);
    if (errors.length) return { ok: false, errors: errors, warnings: report.warnings || [], value: null };
    return report;
  }

  function validateMediaResult(input, options, injected) {
    var dependencies = getDependencies(injected);
    if (!dependencies.contracts) throw new Error('AgentCoreMediaContracts is required');
    var report = dependencies.contracts.validateMediaResult(input, options);
    var errors = report.errors ? report.errors.slice() : [];
    var warnings = report.warnings ? report.warnings.slice() : [];
    scanSecrets(input, '', errors, 0);
    if (input && (input.prompt !== undefined || input.chainOfThought !== undefined || input.reasoning !== undefined)) {
      errors.push(issue('forbidden-result-field', 'prompt', 'Media results must not store prompts or model reasoning.'));
    }
    var provider = input && input.provider;
    if (provider && provider.id !== undefined && (typeof provider.id !== 'string' || !IDENTIFIER_RE.test(provider.id))) {
      errors.push(issue('bad-result-provider', 'provider.id', 'Result provider id is invalid.'));
    }
    if (provider && provider.model !== undefined && (typeof provider.model !== 'string' || !IDENTIFIER_RE.test(provider.model))) {
      errors.push(issue('bad-result-model', 'provider.model', 'Result model id is invalid.'));
    }
    if (errors.length) return { ok: false, errors: errors, warnings: warnings, value: null };
    return report;
  }

  function createManagedAssetStore(options, injected) {
    var dependencies = getDependencies(injected);
    if (!dependencies.assetStore) throw new Error('AgentCoreManagedAssetStore is required');
    var opts = options || {};
    if (typeof opts.authorizeByteRead !== 'function') throw new Error('authorizeByteRead callback is required');
    var base = dependencies.assetStore.createManagedAssetStore(opts);
    return {
      importAsset: base.importAsset,
      getMetadata: base.getMetadata,
      attach: base.attach,
      remove: base.remove,
      getStats: base.getStats,
      readBytesForAdapter: function (handle, request) {
        var purpose = request && typeof request.purpose === 'string' ? request.purpose : '';
        if (!purpose || opts.authorizeByteRead({ handle: handle, purpose: purpose }) !== true) {
          throw new Error('Managed asset byte read was not authorized by the runtime');
        }
        return base.readBytesForAdapter(handle, { approved: true, purpose: purpose });
      }
    };
  }

  var API = {
    validateProviderInventory: validateProviderInventory,
    validateMediaResult: validateMediaResult,
    createManagedAssetStore: createManagedAssetStore
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreMediaSecurity = API;
  }
})();
