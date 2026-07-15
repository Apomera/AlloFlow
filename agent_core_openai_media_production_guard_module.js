/**
 * AlloFlow Agent Core - production guard for the disabled OpenAI media adapter.
 *
 * This outermost boundary adds intentionally conservative controls that do not
 * belong in the provider transport itself: explicit enablement, dated pricing,
 * aggregate retry/alt-text budgets, response-size limits, and serialized runs.
 */
(function () {
  'use strict';

  var DEFAULT_MAX_DECODED_BYTES = 25 * 1024 * 1024;
  var RETRYABLE_STATUS = { 429: true, 500: true, 502: true, 503: true, 504: true };

  function guardError(code, message, details) {
    var error = new Error(message);
    error.code = code;
    if (details) error.details = details;
    return error;
  }

  function getRuntimeModule(injected) {
    if (injected) return injected;
    return typeof window !== 'undefined' && window.AlloModules
      ? window.AlloModules.AgentCoreOpenAIMediaRuntime : null;
  }

  function finiteNonNegative(value) {
    return Number.isFinite(value) && value >= 0;
  }

  function dateValue(value) {
    var parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function validateDatedPolicy(policy, expectedProvider, expectedModel, nowMs) {
    if (!policy || typeof policy !== 'object') return 'pricing-policy-required';
    if (policy.schemaVersion !== '1.0') return 'pricing-policy-schema-unsupported';
    if (policy.provider !== expectedProvider || policy.model !== expectedModel) return 'pricing-policy-provider-model-mismatch';
    if (typeof policy.sourceUrl !== 'string' || !/^https:\/\/(developers|platform)\.openai\.com\//.test(policy.sourceUrl)) {
      return 'pricing-policy-source-invalid';
    }
    var effective = dateValue(policy.effectiveAt);
    var expires = dateValue(policy.expiresAt);
    if (!Number.isFinite(effective) || !Number.isFinite(expires) || effective >= expires) return 'pricing-policy-dates-invalid';
    if (nowMs < effective) return 'pricing-policy-not-effective';
    if (nowMs >= expires) return 'pricing-policy-stale';
    if (typeof policy.estimateImageCost !== 'function' || typeof policy.calculateImageCost !== 'function') {
      return 'pricing-policy-calculators-required';
    }
    return '';
  }

  function decodedBase64Length(value) {
    var clean = String(value || '').replace(/\s/g, '');
    if (!clean) return 0;
    var padding = clean.endsWith('==') ? 2 : (clean.endsWith('=') ? 1 : 0);
    return Math.max(0, Math.floor(clean.length * 3 / 4) - padding);
  }

  function createProductionOpenAIMediaAdapter(options, injectedRuntimeModule) {
    var opts = options || {};
    var runtimeModule = getRuntimeModule(injectedRuntimeModule);
    if (!runtimeModule || typeof runtimeModule.createGuardedOpenAIMediaAdapter !== 'function') {
      throw new Error('AgentCoreOpenAIMediaRuntime is required');
    }
    if (typeof opts.fetchAuthorized !== 'function') throw new Error('Runtime fetchAuthorized is required');
    if (typeof opts.authorizeProductionExecution !== 'function') throw new Error('Production authorization callback is required');

    var model = opts.model || 'gpt-image-2';
    var pricingPolicy = opts.pricingPolicy;
    var altTextPolicy = opts.altTextPolicy || null;
    var originalFetch = opts.fetchAuthorized;
    var originalAltText = altTextPolicy && altTextPolicy.createAltText;
    var now = typeof opts.now === 'function' ? opts.now : function () { return new Date(); };
    var sleep = typeof opts.sleep === 'function' ? opts.sleep : function (ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); });
    };
    var retryDelaysMs = Array.isArray(opts.retryDelaysMs) ? opts.retryDelaysMs.slice(0, 2) : [250];
    var maxImageAttempts = Number.isInteger(opts.maxImageAttempts) ? opts.maxImageAttempts : 1;
    var maxDecodedBytes = Number.isInteger(opts.maxDecodedBytes) ? opts.maxDecodedBytes : DEFAULT_MAX_DECODED_BYTES;
    if (maxImageAttempts < 1 || maxImageAttempts > 3) throw new Error('maxImageAttempts must be between 1 and 3');
    if (maxDecodedBytes < 1) throw new Error('maxDecodedBytes must be positive');

    var inFlight = false;
    var executionState = null;

    function policyStatus() {
      var current = now();
      var nowMs = current instanceof Date ? current.getTime() : dateValue(current);
      if (!Number.isFinite(nowMs)) return 'runtime-clock-invalid';
      return validateDatedPolicy(pricingPolicy, 'openai-api', model, nowMs);
    }

    function altTextBudget(request) {
      if (!request.accessibility.altTextRequired) return { ok: true, upperBoundUsd: 0, operations: 0 };
      if (!altTextPolicy || typeof originalAltText !== 'function') return { ok: false, code: 'alt-text-policy-required' };
      if (['included', 'local-resource', 'metered'].indexOf(altTextPolicy.billing) === -1) {
        return { ok: false, code: 'alt-text-billing-invalid' };
      }
      if (!finiteNonNegative(altTextPolicy.upperBoundUsd) || !Number.isInteger(altTextPolicy.operations) || altTextPolicy.operations < 0) {
        return { ok: false, code: 'alt-text-budget-invalid' };
      }
      if (altTextPolicy.billing === 'metered' && altTextPolicy.operations < 1) {
        return { ok: false, code: 'alt-text-budget-invalid' };
      }
      return { ok: true, upperBoundUsd: altTextPolicy.upperBoundUsd, operations: altTextPolicy.operations };
    }

    async function boundedSuccessfulResponse(response) {
      var body;
      try { body = await response.json(); }
      catch (_) { throw guardError('openai-invalid-response', 'OpenAI returned an unreadable image response.'); }
      var encoded = body && body.data && body.data[0] && body.data[0].b64_json;
      if (typeof encoded === 'string' && decodedBase64Length(encoded) > maxDecodedBytes) {
        throw guardError('openai-image-response-too-large', 'OpenAI returned image data larger than the configured managed-asset limit.');
      }
      return {
        ok: true,
        status: Number.isInteger(response.status) ? response.status : 200,
        json: async function () { return body; }
      };
    }

    async function guardedFetch(url, request, authorizationContext) {
      if (!executionState) throw guardError('production-context-missing', 'OpenAI media transport was called outside an authorized production execution.');
      var lastNetworkError = null;
      for (var attempt = 1; attempt <= maxImageAttempts; attempt++) {
        executionState.imageAttempts += 1;
        var response;
        try {
          response = await originalFetch(url, request, authorizationContext);
        } catch (error) {
          lastNetworkError = error;
          if (attempt >= maxImageAttempts) throw guardError('openai-network-error', 'OpenAI image request failed after the approved attempts.');
          await sleep(retryDelaysMs[Math.min(attempt - 1, retryDelaysMs.length - 1)] || 0);
          continue;
        }
        if (response && response.ok === true) return boundedSuccessfulResponse(response);
        if (!response || !RETRYABLE_STATUS[response.status] || attempt >= maxImageAttempts) return response;
        await sleep(retryDelaysMs[Math.min(attempt - 1, retryDelaysMs.length - 1)] || 0);
      }
      throw lastNetworkError || guardError('openai-network-error', 'OpenAI image request failed.');
    }

    async function guardedCreateAltText(input) {
      if (!executionState) throw guardError('production-context-missing', 'Alt text was requested outside an authorized production execution.');
      var value = await originalAltText(input);
      var text;
      var actualCostUsd;
      var operations;
      if (typeof value === 'string') {
        text = value;
        actualCostUsd = altTextPolicy.billing === 'metered' ? NaN : 0;
        operations = altTextPolicy.operations;
      } else {
        text = value && value.text;
        actualCostUsd = value && value.actualCostUsd;
        operations = value && value.operations;
      }
      if (typeof text !== 'string' || !text.trim()) throw guardError('alt-text-generation-failed', 'The approved alt-text provider did not return alt text.');
      if (!finiteNonNegative(actualCostUsd) || !Number.isInteger(operations) || operations < 0) {
        throw guardError('alt-text-accounting-failed', 'The alt-text provider did not return complete cost accounting.');
      }
      if (actualCostUsd > altTextPolicy.upperBoundUsd || operations > altTextPolicy.operations) {
        throw guardError('alt-text-budget-exceeded', 'Alt-text usage exceeded its approved bound.');
      }
      executionState.altActualCostUsd = actualCostUsd;
      executionState.altOperations = operations;
      return text.trim();
    }

    var innerOptions = Object.assign({}, opts, {
      fetchAuthorized: guardedFetch,
      estimateCost: function (input) {
        var amount = pricingPolicy.estimateImageCost(input);
        return { upperBoundUsd: amount };
      },
      calculateActualCost: function (input) { return pricingPolicy.calculateImageCost(input); },
      createAltText: guardedCreateAltText
    });
    var inner = runtimeModule.createGuardedOpenAIMediaAdapter(innerOptions, opts.adapterModule);

    function prepare(requestInput) {
      if (opts.executionEnabled !== true) return { ready: false, code: 'production-execution-disabled' };
      var policyCode = policyStatus();
      if (policyCode) return { ready: false, code: policyCode };
      var basePlan;
      try { basePlan = inner.prepare(requestInput); }
      catch (error) { throw error; }
      if (!basePlan.ready) return basePlan;
      var alt = altTextBudget(basePlan.request);
      if (!alt.ok) return { ready: false, code: alt.code, request: basePlan.request, provider: basePlan.provider };
      var operations = maxImageAttempts + alt.operations;
      var upperBoundUsd = (basePlan.estimate.upperBoundUsd * maxImageAttempts) + alt.upperBoundUsd;
      if (operations > basePlan.request.providerPolicy.maxOperations) {
        return { ready: false, code: 'aggregate-operation-limit-exceeded', request: basePlan.request, provider: basePlan.provider };
      }
      if (upperBoundUsd > basePlan.request.providerPolicy.maxCostUsd) {
        return {
          ready: false, code: 'aggregate-cost-limit-exceeded', request: basePlan.request,
          provider: basePlan.provider, estimate: { upperBoundUsd: upperBoundUsd, currency: 'USD' }
        };
      }
      return Object.assign({}, basePlan, {
        estimate: { upperBoundUsd: upperBoundUsd, currency: 'USD' },
        operationUpperBound: operations,
        safety: { maxImageAttempts: maxImageAttempts, maxDecodedBytes: maxDecodedBytes, altTextOperations: alt.operations }
      });
    }

    async function execute(requestInput) {
      if (inFlight) throw guardError('production-adapter-busy', 'This production media adapter permits only one execution at a time.');
      var plan = prepare(requestInput);
      if (!plan.ready) throw guardError(plan.code, 'Production OpenAI media preflight did not authorize execution.');
      if (opts.authorizeProductionExecution({
        request: plan.request, provider: plan.provider, estimate: plan.estimate,
        operationUpperBound: plan.operationUpperBound, pricingPolicy: {
          effectiveAt: pricingPolicy.effectiveAt, expiresAt: pricingPolicy.expiresAt, sourceUrl: pricingPolicy.sourceUrl
        }
      }) !== true) {
        throw guardError('production-execution-not-authorized', 'The runtime did not authorize the aggregate production media budget.');
      }
      inFlight = true;
      executionState = { imageAttempts: 0, altActualCostUsd: 0, altOperations: 0 };
      try {
        var result = await inner.execute(requestInput);
        var totalCost = result.usage.actualCostUsd + executionState.altActualCostUsd;
        var totalOperations = executionState.imageAttempts + executionState.altOperations;
        var usage = { operations: totalOperations, actualCostUsd: totalCost, currency: 'USD' };
        if (totalCost > plan.request.providerPolicy.maxCostUsd || totalOperations > plan.request.providerPolicy.maxOperations) {
          throw guardError('aggregate-actual-budget-exceeded', 'Aggregate media usage exceeded the approved request budget.', usage);
        }
        result.usage = usage;
        return result;
      } finally {
        executionState = null;
        inFlight = false;
      }
    }

    return { prepare: prepare, execute: execute, providerId: inner.providerId, model: inner.model };
  }

  var API = {
    DEFAULT_MAX_DECODED_BYTES: DEFAULT_MAX_DECODED_BYTES,
    createProductionOpenAIMediaAdapter: createProductionOpenAIMediaAdapter,
    decodedBase64Length: decodedBase64Length,
    validateDatedPolicy: validateDatedPolicy
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreOpenAIMediaProductionGuard = API;
  }
})();
