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

  function createGuardedOpenAIMediaAdapter(options, injectedAdapterModule) {
    var opts = options || {};
    var adapterModule = getAdapterModule(injectedAdapterModule);
    if (!adapterModule || typeof adapterModule.createOpenAIMediaAdapter !== 'function') {
      throw new Error('AgentCoreOpenAIMediaAdapter is required');
    }
    var base = adapterModule.createOpenAIMediaAdapter(opts);

    function prepare(requestInput) {
      var plan = base.prepare(requestInput);
      if (plan.ready && plan.request.accessibility.altTextRequired && typeof opts.createAltText !== 'function') {
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
      var plan = prepare(requestInput);
      if (!plan.ready) throw runtimeError(plan.code, 'Guarded OpenAI media preflight did not authorize execution.');
      var result = await base.execute(requestInput);
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
