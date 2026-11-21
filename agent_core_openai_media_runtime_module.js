/**
 * AlloFlow Agent Core - guarded OpenAI media runtime facade.
 * Required construction boundary for the lower-level disabled adapter.
 */
(function () {
  'use strict';

  function getAdapterModule(injected) {
    if (injected) return injected;
    return typeof window !== 'undefined' && window.AlloModules
      ? window.AlloModules.AgentCoreOpenAIMediaAdapter : null;
  }

  function runtimeError(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function isBrowserMediaAiBlocked() {
    if (typeof window === 'undefined' || !window) return false;
    if (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true || window._alloQrBlocked === true) return true;
    if (window.ALLOFLOW_MANAGED_AI_POLICY && window.ALLOFLOW_MANAGED_AI_POLICY.enabled === false) return true;
    if (window.__alloQrStudentMode) {
      if (typeof window.__alloAiUsable === 'function') {
        try { return !window.__alloAiUsable('imageGeneration'); } catch (_) { return true; }
      }
      return true;
    }
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
      var plan = base.prepare(requestInput);
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
      var snapshot = requestInput;
      if (requestInput && typeof requestInput === 'object') {
        try { snapshot = JSON.parse(JSON.stringify(requestInput)); } catch (_) { snapshot = requestInput; }
      }
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

    return { prepare: prepare, execute: execute, providerId: base.providerId, model: base.model };
  }

  var API = { createGuardedOpenAIMediaAdapter: createGuardedOpenAIMediaAdapter };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreOpenAIMediaRuntime = API;
  }
})();
