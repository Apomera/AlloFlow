/**
 * AlloFlow Agent Core - guarded OpenAI media runtime facade.
 * Required construction boundary for the lower-level disabled adapter.
 */
(function () {
  'use strict';

  var MAX_SNAPSHOT_BYTES = 512 * 1024;

  function getAdapterModule(injected) {
    if (injected) return injected;
    return typeof window === 'object' && window && window.AlloModules
      ? window.AlloModules.AgentCoreOpenAIMediaAdapter : null;
  }

  function runtimeError(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function cloneSnapshot(requestInput) {
    if (!requestInput || typeof requestInput !== 'object') return requestInput;
    var serialized;
    try { serialized = JSON.stringify(requestInput); }
    catch (_) { throw runtimeError('invalid-media-request', 'Media request must be acyclic JSON-serializable data.'); }
    if (typeof serialized !== 'string' || serialized.length > MAX_SNAPSHOT_BYTES) {
      throw runtimeError('invalid-media-request', 'Media request exceeds the maximum snapshot size limit.');
    }
    return JSON.parse(serialized, function (key, val) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
      return val;
    });
  }

  function isBrowserMediaAiBlocked() {
    if (typeof window !== 'object' || !window) return false;
    if (
      window._isDesktopBundledApp === true ||
      window.__alloOfflineOnly === true ||
      window.__alloStudentAiDisabled === true ||
      window.__alloStudentView === true ||
      window.__alloAiSecretsLocked === true ||
      window._alloQrBlocked === true ||
      Boolean(window.__alloQrStudentMode)
    ) return true;
    if (window.ALLOFLOW_MANAGED_AI_POLICY && window.ALLOFLOW_MANAGED_AI_POLICY.enabled === false) return true;
    if (typeof window.__alloAiUsable === 'function') {
      try { return !window.__alloAiUsable('imageGeneration'); } catch (_) { return true; }
    }
    return false;
  }

  function createGuardedOpenAIMediaAdapter(options, injectedAdapterModule) {
    var opts = options || {};
    var hasCreateAltText = typeof opts.createAltText === 'function';
    var adapterModule = getAdapterModule(injectedAdapterModule);
    if (!adapterModule || typeof adapterModule.createOpenAIMediaAdapter !== 'function') {
      throw new Error('AgentCoreOpenAIMediaAdapter is required');
    }
    var base = adapterModule.createOpenAIMediaAdapter(opts);

    function prepare(requestInput) {
      if (isBrowserMediaAiBlocked()) {
        return {
          ready: false,
          code: 'ai-disabled-in-session',
          request: null,
          estimate: null,
          provider: base.providerId
        };
      }
      var safeInput = cloneSnapshot(requestInput);
      var plan = base.prepare(safeInput);
      var needsAltText = !!(plan && plan.request && plan.request.accessibility && plan.request.accessibility.altTextRequired);
      if (plan && plan.ready && needsAltText && !hasCreateAltText) {
        return {
          ready: false,
          code: 'alt-text-provider-required',
          request: plan.request,
          estimate: plan.estimate,
          provider: plan.provider
        };
      }
      return plan;
    }

    async function execute(requestInput) {
      var snapshot = cloneSnapshot(requestInput);
      var plan = prepare(snapshot);
      if (!plan || !plan.ready) throw runtimeError((plan && plan.code) || 'preflight-failed', 'Guarded OpenAI media preflight did not authorize execution.');
      var result = await base.execute(snapshot);
      if (!result || typeof result !== 'object') {
        throw runtimeError('invalid-media-result', 'Guarded OpenAI media adapter returned an invalid result.');
      }
      return {
        schemaVersion: result.schemaVersion,
        requestId: result.requestId,
        status: result.status,
        asset: result.asset,
        provider: result.provider,
        usage: result.usage,
        error: result.error || null
      };
    }

    return Object.freeze({ prepare: prepare, execute: execute, providerId: base.providerId, model: base.model });
  }

  var API = Object.freeze({ createGuardedOpenAIMediaAdapter: createGuardedOpenAIMediaAdapter });
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window === 'object' && window) {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreOpenAIMediaRuntime = API;
  }
})();
