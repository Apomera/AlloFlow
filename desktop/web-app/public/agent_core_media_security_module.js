/**
 * AlloFlow Agent Core - strict media security facade.
 *
 * Additive hardening around AgentCoreMediaContracts and the in-memory managed
 * asset store. Future adapters should consume this facade, not the lower-level
 * reference modules directly. It remains inert and registers no MCP tools.
 */
(function () {
  'use strict';

  var SECRET_FIELD_RE = /(?:^|[_-]|(?=[A-Z]))(?:api|access|private|auth|signing|client)?[_-]?keys?$|token|secret|password|passwd|credential|authorization|bearer|privatekey|cookie/i;
  var FORBIDDEN_RESULT_KEYS = Object.assign(Object.create(null), { prompt: true, chainOfThought: true, reasoning: true });
  var IDENTIFIER_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
  var MAX_DEPTH = 8;
  var MAX_SCAN_NODES = 10000;
  var MAX_SCAN_ERRORS = 100;

  function isPrototypeKey(key) {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
  }

  function scanForbiddenResultFields(value, path, errors, depth, state) {
    if (!value || typeof value !== 'object') return;
    var ctx = state || { visited: new Set(), nodes: 0 };
    if (errors.length >= MAX_SCAN_ERRORS) return;
    if (depth > MAX_DEPTH) return;
    if (ctx.visited.has(value) || ++ctx.nodes > MAX_SCAN_NODES) return;
    ctx.visited.add(value);
    var keys = Object.keys(value);
    for (var i = 0; i < keys.length && errors.length < MAX_SCAN_ERRORS; i++) {
      var key = keys[i];
      var nextPath = path ? path + '.' + key : key;
      if (Object.prototype.hasOwnProperty.call(FORBIDDEN_RESULT_KEYS, key) && value[key] !== undefined) {
        errors.push(issue('forbidden-result-field', nextPath, 'Media results must not store prompts or model reasoning.'));
        continue;
      }
      scanForbiddenResultFields(value[key], nextPath, errors, depth + 1, ctx);
    }
    ctx.visited.delete(value);
  }

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

  function scanSecrets(value, path, errors, depth, state) {
    if (!value || typeof value !== 'object') return;
    var ctx = state || { visited: new Set(), nodes: 0, limitReported: false };
    if (errors.length >= MAX_SCAN_ERRORS) return;
    if (depth > MAX_DEPTH) {
      errors.push(issue('payload-too-deep', path, 'Media payload exceeds the security scan depth.'));
      return;
    }
    if (ctx.visited.has(value)) {
      errors.push(issue('cyclic-payload', path, 'Media payload must be acyclic JSON data.'));
      return;
    }
    if (++ctx.nodes > MAX_SCAN_NODES) {
      if (!ctx.limitReported) {
        ctx.limitReported = true;
        errors.push(issue('payload-too-large', path, 'Media payload exceeds the security scan node budget.'));
      }
      return;
    }
    ctx.visited.add(value);
    var keys = Object.keys(value);
    for (var i = 0; i < keys.length && errors.length < MAX_SCAN_ERRORS; i++) {
      var key = keys[i];
      var nextPath = path ? path + '.' + key : key;
      if (isPrototypeKey(key)) {
        errors.push(issue('unsafe-key', nextPath, 'Prototype-polluting key "' + key + '" is not allowed in media payloads.'));
        continue;
      }
      if (SECRET_FIELD_RE.test(key)) {
        errors.push(issue('secret-like-field', nextPath, 'Runtime credentials may not appear in agent-visible media payloads.'));
        continue;
      }
      scanSecrets(value[key], nextPath, errors, depth + 1, ctx);
    }
    ctx.visited.delete(value);
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
    scanForbiddenResultFields(input, '', errors, 0);
    var provider = input && input.provider;
    if (input && input.provider !== undefined && (!provider || typeof provider !== 'object' || Array.isArray(provider))) {
      errors.push(issue('bad-result-provider', 'provider', 'Result provider metadata must be an object.'));
    } else if (provider) {
      if (provider.id !== undefined && (typeof provider.id !== 'string' || !IDENTIFIER_RE.test(provider.id))) {
        errors.push(issue('bad-result-provider', 'provider.id', 'Result provider id is invalid.'));
      }
      if (provider.model !== undefined && (typeof provider.model !== 'string' || !IDENTIFIER_RE.test(provider.model))) {
        errors.push(issue('bad-result-model', 'provider.model', 'Result model id is invalid.'));
      }
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
    return Object.freeze({
      importAsset: base.importAsset,
      getMetadata: base.getMetadata,
      attach: base.attach,
      detach: base.detach,
      detachAllForArtifact: base.detachAllForArtifact,
      remove: base.remove,
      getStats: base.getStats,
      readBytesForAdapter: function (handle, request) {
        var rawPurpose = request && typeof request.purpose === 'string'
          ? request.purpose.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 200)
          : '';
        var authorized = false;
        if (rawPurpose) {
          try {
            authorized = opts.authorizeByteRead({ handle: handle, purpose: rawPurpose }) === true;
          } catch (_) {
            authorized = false;
          }
        }
        if (!authorized) {
          throw new Error('Managed asset byte read was not authorized by the runtime');
        }
        return base.readBytesForAdapter(handle, { approved: true, purpose: rawPurpose });
      }
    });
  }

  var API = Object.freeze({
    validateProviderInventory: validateProviderInventory,
    validateMediaResult: validateMediaResult,
    createManagedAssetStore: createManagedAssetStore
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreMediaSecurity = API;
  }
})();
