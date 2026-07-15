/**
 * AlloFlow Agent Core - capability-aware media batch planner.
 *
 * Pure dry-run logic only: validates requests and provider inventory, selects
 * capabilities, estimates aggregate limits, and reports explicit fallbacks.
 * It never reads credentials, invokes a provider, writes assets, or registers
 * an MCP tool.
 */
(function () {
  'use strict';

  var SCHEMA_VERSION = '1.0';
  var ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
  var SECRET_FIELD_RE = /(?:^|[_-])(?:api)?key$|token|secret|password|credential/i;
  var ABSOLUTE_PATH_RE = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/;
  var MAX_ITEMS = 500;

  function plannerError(code, path, message) {
    return { code: code, path: path, message: message };
  }

  function getContracts(injected) {
    if (injected) return injected;
    return typeof window !== 'undefined' && window.AlloModules
      ? window.AlloModules.AgentCoreMediaContracts : null;
  }

  function scanUnsafe(value, path, errors, depth) {
    if (!value || typeof value !== 'object') return;
    if (depth > 8) {
      errors.push(plannerError('payload-too-deep', path, 'Media plans may not exceed eight levels of nesting.'));
      return;
    }
    var keys = Array.isArray(value) ? value.map(function (_, i) { return i; }) : Object.keys(value);
    keys.forEach(function (key) {
      var childPath = path ? path + '.' + key : String(key);
      if (typeof key === 'string' && SECRET_FIELD_RE.test(key)) {
        errors.push(plannerError('secret-like-field', childPath, 'Credentials are runtime-only and may not appear in a media plan.'));
        return;
      }
      var child = value[key];
      if (typeof child === 'string' && ABSOLUTE_PATH_RE.test(child)) {
        errors.push(plannerError('unsafe-path-value', childPath, 'Use an opaque managed asset handle, not a filesystem path.'));
      } else if (child && typeof child === 'object') {
        scanUnsafe(child, childPath, errors, depth + 1);
      }
    });
  }

  function validateBatch(input, contracts) {
    var errors = [];
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return { ok: false, errors: [plannerError('not-an-object', '', 'MediaBatchPlan must be an object.')], value: null };
    }
    scanUnsafe(input, '', errors, 0);
    if (input.schemaVersion !== SCHEMA_VERSION) errors.push(plannerError('unsupported-version', 'schemaVersion', 'Expected schemaVersion "1.0".'));
    if (typeof input.planId !== 'string' || !ID_RE.test(input.planId)) errors.push(plannerError('bad-plan-id', 'planId', 'planId is invalid.'));
    if (!Array.isArray(input.requests) || !input.requests.length || input.requests.length > MAX_ITEMS) {
      errors.push(plannerError('bad-requests', 'requests', 'requests must contain 1 to ' + MAX_ITEMS + ' MediaRequests.'));
    }
    var policy = input.batchPolicy && typeof input.batchPolicy === 'object' ? input.batchPolicy : {};
    var maxCostUsd = policy.maxCostUsd;
    var maxOperations = policy.maxOperations;
    if (!Number.isFinite(maxCostUsd) || maxCostUsd < 0 || maxCostUsd > 100000) {
      errors.push(plannerError('bad-batch-cost-limit', 'batchPolicy.maxCostUsd', 'maxCostUsd must be between 0 and 100000.'));
    }
    if (!Number.isInteger(maxOperations) || maxOperations < 1 || maxOperations > 10000) {
      errors.push(plannerError('bad-batch-operation-limit', 'batchPolicy.maxOperations', 'maxOperations must be from 1 to 10000.'));
    }
    var requests = [];
    var seen = {};
    (Array.isArray(input.requests) ? input.requests : []).forEach(function (request, index) {
      var report = contracts.validateMediaRequest(request);
      if (!report.ok) {
        report.errors.forEach(function (item) {
          errors.push(plannerError(item.code, 'requests[' + index + '].' + item.path, item.message));
        });
        return;
      }
      if (seen[report.value.requestId]) {
        errors.push(plannerError('duplicate-request-id', 'requests[' + index + '].requestId', 'Request ids must be unique within a batch.'));
      }
      seen[report.value.requestId] = true;
      requests.push(report.value);
    });
    if (errors.length) return { ok: false, errors: errors, value: null };
    return {
      ok: true,
      errors: [],
      value: {
        schemaVersion: SCHEMA_VERSION,
        planId: input.planId,
        requests: requests,
        batchPolicy: { maxCostUsd: maxCostUsd, maxOperations: maxOperations }
      }
    };
  }

  function policyAllows(provider, model, policy) {
    if (policy.mode === 'allow-listed' && policy.allowedProviders.indexOf(provider.id) === -1) return false;
    if (provider.billing === 'metered' && !policy.allowMeteredUsage) return false;
    if (policy.allowedModels.length && policy.allowedModels.indexOf(model.id) === -1) return false;
    return model.enabled !== false;
  }

  function candidatesFor(modality, inventory, policy) {
    var candidates = [];
    inventory.providers.forEach(function (provider) {
      provider.models.forEach(function (model) {
        if (model.modalities.indexOf(modality) === -1 || !policyAllows(provider, model, policy)) return;
        candidates.push({
          provider: provider.id,
          model: model.id,
          transport: provider.transport,
          billing: provider.billing,
          modality: modality
        });
      });
    });
    candidates.sort(function (a, b) {
      var aProvider = a.provider === policy.preferredProvider ? 1 : 0;
      var bProvider = b.provider === policy.preferredProvider ? 1 : 0;
      if (aProvider !== bProvider) return bProvider - aProvider;
      var aModel = a.model === policy.preferredModel ? 1 : 0;
      var bModel = b.model === policy.preferredModel ? 1 : 0;
      if (aModel !== bModel) return bModel - aModel;
      var rank = { included: 0, 'local-resource': 1, metered: 2, unknown: 3 };
      return (rank[a.billing] || 0) - (rank[b.billing] || 0);
    });
    return candidates;
  }

  function estimateSelection(selection, role, request, estimateOperation) {
    if (selection.billing === 'unknown') {
      return { ok: false, code: 'billing-status-required', message: 'Provider billing must be known before execution can be planned.' };
    }
    if (selection.billing === 'included' || selection.billing === 'local-resource') {
      return { ok: true, upperBoundUsd: 0, operations: 1, currency: 'USD' };
    }
    if (typeof estimateOperation !== 'function') {
      return { ok: false, code: 'pricing-estimate-required', message: 'A current runtime pricing estimator is required for metered capability.' };
    }
    var estimate = estimateOperation({ role: role, selection: selection, request: request });
    if (!estimate || !Number.isFinite(estimate.upperBoundUsd) || estimate.upperBoundUsd < 0 ||
        !Number.isInteger(estimate.operations) || estimate.operations < 1) {
      return { ok: false, code: 'pricing-estimate-invalid', message: 'Runtime estimator returned an invalid cost or operation bound.' };
    }
    return { ok: true, upperBoundUsd: estimate.upperBoundUsd, operations: estimate.operations, currency: 'USD' };
  }

  function fallbackSuggestions(request, inventory) {
    var suggestions = [];
    var policy = request.providerPolicy;
    if (request.operation === 'edit' && candidatesFor('imageGeneration', inventory, policy).length) {
      suggestions.push({
        code: 'generation-fallback-available',
        requiresApproval: true,
        message: 'Image generation is available, but substituting it for source-preserving editing requires user approval.'
      });
    }
    if (candidatesFor('text', inventory, policy).length) {
      suggestions.push({
        code: 'text-only-fallback-available',
        requiresApproval: true,
        message: 'A text-only artifact can be produced, but required images must not be silently omitted.'
      });
    }
    return suggestions;
  }

  function planMediaBatch(input, inventoryInput, options, injectedContracts) {
    var contracts = getContracts(injectedContracts);
    if (!contracts || typeof contracts.validateMediaRequest !== 'function' || typeof contracts.validateProviderInventory !== 'function') {
      throw new Error('AgentCoreMediaContracts is required');
    }
    var batchReport = validateBatch(input, contracts);
    var inventoryReport = contracts.validateProviderInventory(inventoryInput);
    var errors = batchReport.ok ? [] : batchReport.errors.slice();
    if (!inventoryReport.ok) errors = errors.concat(inventoryReport.errors.map(function (item) {
      return plannerError(item.code, 'inventory.' + item.path, item.message);
    }));
    if (errors.length) {
      return { schemaVersion: SCHEMA_VERSION, planId: input && input.planId || '', status: 'invalid', ready: false, errors: errors, items: [] };
    }

    var estimateOperation = options && options.estimateOperation;
    var inventory = inventoryReport.value;
    var items = [];
    var totalCost = 0;
    var totalOperations = 0;
    var hasBlocked = false;
    var needsInput = false;

    batchReport.value.requests.forEach(function (request) {
      var modality = request.operation === 'edit' ? 'imageEditing' : 'imageGeneration';
      var imageCandidates = candidatesFor(modality, inventory, request.providerPolicy);
      if (!imageCandidates.length) {
        hasBlocked = true;
        items.push({
          requestId: request.requestId,
          status: 'blocked',
          requiredCapabilities: [modality].concat(request.accessibility.altTextRequired ? ['vision'] : []),
          selections: {},
          estimate: null,
          issues: [plannerError('missing-approved-capability', 'providerPolicy', 'No approved provider/model can satisfy ' + modality + '.')],
          suggestions: fallbackSuggestions(request, inventory)
        });
        return;
      }

      var image = imageCandidates[0];
      var alt = null;
      if (request.accessibility.altTextRequired) {
        var altCandidates = candidatesFor('vision', inventory, request.providerPolicy);
        if (!altCandidates.length) {
          hasBlocked = true;
          items.push({
            requestId: request.requestId,
            status: 'blocked',
            requiredCapabilities: [modality, 'vision'],
            selections: { image: image },
            estimate: null,
            issues: [plannerError('missing-alt-text-capability', 'accessibility.altTextRequired', 'Accessible delivery requires an approved vision capability for alt text.')],
            suggestions: fallbackSuggestions(request, inventory)
          });
          return;
        }
        alt = altCandidates[0];
      }

      var imageEstimate = estimateSelection(image, 'image', request, estimateOperation);
      var altEstimate = alt ? estimateSelection(alt, 'altText', request, estimateOperation) : { ok: true, upperBoundUsd: 0, operations: 0 };
      var issues = [];
      if (!imageEstimate.ok) issues.push(plannerError(imageEstimate.code, 'estimate.image', imageEstimate.message));
      if (!altEstimate.ok) issues.push(plannerError(altEstimate.code, 'estimate.altText', altEstimate.message));
      if (issues.length) {
        needsInput = true;
        items.push({
          requestId: request.requestId,
          status: 'input_required',
          requiredCapabilities: [modality].concat(alt ? ['vision'] : []),
          selections: { image: image, altText: alt },
          estimate: null,
          issues: issues,
          suggestions: []
        });
        return;
      }

      var itemCost = imageEstimate.upperBoundUsd + altEstimate.upperBoundUsd;
      var itemOperations = imageEstimate.operations + altEstimate.operations;
      if (itemCost > request.providerPolicy.maxCostUsd) {
        issues.push(plannerError('request-cost-limit-exceeded', 'providerPolicy.maxCostUsd', 'Planned operations exceed this request cost limit.'));
      }
      if (itemOperations > request.providerPolicy.maxOperations) {
        issues.push(plannerError('request-operation-limit-exceeded', 'providerPolicy.maxOperations', 'Planned operations exceed this request operation limit.'));
      }
      if (issues.length) hasBlocked = true;
      totalCost += itemCost;
      totalOperations += itemOperations;
      items.push({
        requestId: request.requestId,
        status: issues.length ? 'blocked' : 'ready',
        requiredCapabilities: [modality].concat(alt ? ['vision'] : []),
        selections: { image: image, altText: alt },
        estimate: { upperBoundUsd: itemCost, operations: itemOperations, currency: 'USD' },
        issues: issues,
        suggestions: []
      });
    });

    var batchIssues = [];
    if (totalCost > batchReport.value.batchPolicy.maxCostUsd) {
      batchIssues.push(plannerError('batch-cost-limit-exceeded', 'batchPolicy.maxCostUsd', 'Aggregate plan cost exceeds the batch limit.'));
      hasBlocked = true;
    }
    if (totalOperations > batchReport.value.batchPolicy.maxOperations) {
      batchIssues.push(plannerError('batch-operation-limit-exceeded', 'batchPolicy.maxOperations', 'Aggregate plan operations exceed the batch limit.'));
      hasBlocked = true;
    }
    var status = hasBlocked ? 'blocked' : (needsInput ? 'input_required' : 'ready');
    return {
      schemaVersion: SCHEMA_VERSION,
      planId: batchReport.value.planId,
      status: status,
      ready: status === 'ready',
      estimate: { upperBoundUsd: totalCost, operations: totalOperations, currency: 'USD' },
      batchPolicy: batchReport.value.batchPolicy,
      issues: batchIssues,
      items: items,
      executionAuthorized: false
    };
  }

  function slug(value, fallback) {
    var result = String(value || '').trim().replace(/[^A-Za-z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    return result || fallback;
  }

  function createGlossaryMediaBatch(input) {
    var source = input || {};
    var planId = slug(source.planId, 'glossary-media-plan');
    var entries = Array.isArray(source.entries) ? source.entries : [];
    var providerPolicy = source.providerPolicy || {};
    var output = source.output || { width: 1024, height: 1024, mimeType: 'image/png', quality: 'standard' };
    return {
      schemaVersion: SCHEMA_VERSION,
      planId: planId,
      batchPolicy: source.batchPolicy || { maxCostUsd: 0, maxOperations: Math.max(1, entries.length * 2) },
      requests: entries.map(function (entry, index) {
        var itemId = slug(entry && (entry.id || entry.term), 'item-' + (index + 1));
        var term = String(entry && entry.term || '').trim();
        var definition = String(entry && entry.definition || '').trim();
        var suppliedPrompt = String(entry && entry.prompt || '').trim();
        var prompt = suppliedPrompt || ('Create a clear, age-appropriate instructional illustration for the glossary term "' + term + '". Definition: ' + definition + '. Avoid decorative text and make the central concept visually unambiguous.');
        var request = {
          schemaVersion: SCHEMA_VERSION,
          requestId: slug(planId + ':' + itemId, 'glossary-item-' + (index + 1)),
          operation: entry && entry.sourceAsset ? 'edit' : 'generate',
          prompt: prompt.slice(0, 8000),
          purpose: 'glossary-illustration:' + term.slice(0, 150),
          output: output,
          accessibility: { altTextRequired: true },
          providerPolicy: providerPolicy
        };
        if (entry && entry.sourceAsset) request.sourceAsset = entry.sourceAsset;
        if (entry && Array.isArray(entry.referenceAssets)) request.referenceAssets = entry.referenceAssets;
        return request;
      })
    };
  }

  var API = {
    MAX_ITEMS: MAX_ITEMS,
    validateBatch: function (input, injectedContracts) {
      var contracts = getContracts(injectedContracts);
      if (!contracts) throw new Error('AgentCoreMediaContracts is required');
      return validateBatch(input, contracts);
    },
    planMediaBatch: planMediaBatch,
    createGlossaryMediaBatch: createGlossaryMediaBatch
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreMediaPlanner = API;
  }
})();
