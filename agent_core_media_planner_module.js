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
  var SECRET_FIELD_RE = /(?:^|[_-])(?:api|private)?key$|token|secret|password|passwd|credential|passphrase|privatekey|bearer|(?:^|[_-])(?:authorization|authorizationheader|cookie|sessioncookie)$/i;
  var CAMEL_SECRET_FIELD_RE = /(?:^|[a-z])(?:Access|Refresh|Session|Auth|Bearer|Id|Api|Client|Private|Signing|Encryption)Key$|^(?:access|refresh|session|auth|bearer|id|api|client|private|signing|encryption)Key$|(?:^|[a-z])(?:Client|Api|App|Jwt|Webhook|Signing)Secret$|^(?:client|api|app|jwt|webhook|signing)Secret$|^privateKey$|^authorizationHeader$|^sessionCookie$/;
  var ABSOLUTE_PATH_RE = /^(?:[A-Za-z]:[\\/]|\\\\|\/|file:\/\/)/i;
  var MAX_ITEMS = 500;
  var MAX_SCAN_NODES = 10000;
  var MAX_SCAN_ERRORS = 100;

  function roundUsd(value) {
    return Math.round(value * 1e6) / 1e6;
  }

  function isPrototypeKey(key) {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
  }

  function hasStructuralScanError(errors) {
    return errors.some(function (e) {
      return e && (e.code === 'cyclic-payload' || e.code === 'payload-too-deep' || e.code === 'payload-too-large');
    });
  }

  function plannerError(code, path, message) {
    return { code: code, path: path, message: message };
  }

  function getContracts(injected) {
    if (injected) return injected;
    return typeof window === 'object' && window && window.AlloModules
      ? window.AlloModules.AgentCoreMediaContracts : null;
  }

  function scanUnsafe(value, path, errors, depth, state) {
    if (!value || typeof value !== 'object') return;
    var ctx = state || { visited: new Set(), nodes: 0, limitReported: false };
    if (errors.length >= MAX_SCAN_ERRORS) return;
    if (depth > 8) {
      errors.push(plannerError('payload-too-deep', path, 'Media plans may not exceed eight levels of nesting.'));
      return;
    }
    if (ctx.visited.has(value)) {
      errors.push(plannerError('cyclic-payload', path, 'Media plans must be acyclic JSON data.'));
      return;
    }
    if (++ctx.nodes > MAX_SCAN_NODES) {
      if (!ctx.limitReported) {
        ctx.limitReported = true;
        errors.push(plannerError('payload-too-large', path, 'Media plan exceeds the node traversal budget.'));
      }
      return;
    }
    ctx.visited.add(value);
    var keys = Object.keys(value);
    for (var i = 0; i < keys.length && errors.length < MAX_SCAN_ERRORS; i++) {
      var key = keys[i];
      var childPath = path ? path + '.' + key : String(key);
      if (typeof key === 'string' && isPrototypeKey(key)) {
        errors.push(plannerError('unsafe-key', childPath, 'Prototype-polluting key "' + key + '" is not allowed in media plans.'));
        continue;
      }
      if (typeof key === 'string' && (SECRET_FIELD_RE.test(key) || CAMEL_SECRET_FIELD_RE.test(key))) {
        errors.push(plannerError('secret-like-field', childPath, 'Credentials are runtime-only and may not appear in a media plan.'));
        continue;
      }
      var child = value[key];
      if (typeof child === 'string' && ABSOLUTE_PATH_RE.test(child)) {
        errors.push(plannerError('unsafe-path-value', childPath, 'Use an opaque managed asset handle, not a filesystem path.'));
      } else if (child && typeof child === 'object') {
        scanUnsafe(child, childPath, errors, depth + 1, ctx);
      }
    }
    ctx.visited.delete(value);
  }

  function validateBatch(input, contracts) {
    var errors = [];
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return { ok: false, errors: [plannerError('not-an-object', '', 'MediaBatchPlan must be an object.')], value: null };
    }
    scanUnsafe(input, '', errors, 0);
    if (hasStructuralScanError(errors)) {
      return { ok: false, errors: errors, value: null };
    }
    if (input.schemaVersion !== SCHEMA_VERSION) errors.push(plannerError('unsupported-version', 'schemaVersion', 'Expected schemaVersion "1.0".'));
    if (typeof input.planId !== 'string' || !ID_RE.test(input.planId) || isPrototypeKey(input.planId)) errors.push(plannerError('bad-plan-id', 'planId', 'planId is invalid.'));
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
    var seen = Object.create(null);
    var boundedRequests = Array.isArray(input.requests) ? input.requests.slice(0, MAX_ITEMS) : [];
    boundedRequests.forEach(function (request, index) {
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
      var aRank = Object.prototype.hasOwnProperty.call(rank, a.billing) ? rank[a.billing] : 3;
      var bRank = Object.prototype.hasOwnProperty.call(rank, b.billing) ? rank[b.billing] : 3;
      return aRank - bRank;
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
    var estimate;
    try {
      var selClone = Object.assign({}, selection);
      var reqClone = JSON.parse(JSON.stringify(request));
      estimate = estimateOperation({ role: role, selection: selClone, request: reqClone });
    } catch (_) {
      return { ok: false, code: 'pricing-estimate-invalid', message: 'Runtime estimator threw an error while calculating bounds.' };
    }
    if (!estimate || !Number.isFinite(estimate.upperBoundUsd) || estimate.upperBoundUsd < 0 || estimate.upperBoundUsd > 1e9 ||
        !Number.isInteger(estimate.operations) || estimate.operations < 1 || estimate.operations > 1000000) {
      return { ok: false, code: 'pricing-estimate-invalid', message: 'Runtime estimator returned an invalid cost or operation bound.' };
    }
    return { ok: true, upperBoundUsd: roundUsd(estimate.upperBoundUsd), operations: estimate.operations, currency: 'USD' };
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
    var invScanErrors = [];
    if (inventoryInput && typeof inventoryInput === 'object') {
      scanUnsafe(inventoryInput, 'inventory', invScanErrors, 0);
    }
    var inventoryReport = hasStructuralScanError(invScanErrors)
      ? { ok: false, errors: [], value: null }
      : contracts.validateProviderInventory(inventoryInput);
    var errors = batchReport.ok ? [] : batchReport.errors.slice();
    if (invScanErrors.length) errors = errors.concat(invScanErrors);
    if (!inventoryReport.ok) errors = errors.concat((inventoryReport.errors || []).map(function (item) {
      return plannerError(item.code, 'inventory.' + item.path, item.message);
    }));
    if (errors.length) {
      var safePlanId = (input && typeof input.planId === 'string') ? stripControlAndBidi(input.planId).slice(0, 128) : '';
      return { schemaVersion: SCHEMA_VERSION, planId: safePlanId, status: 'invalid', ready: false, errors: errors, items: [] };
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

      var itemCost = roundUsd(imageEstimate.upperBoundUsd + altEstimate.upperBoundUsd);
      var itemOperations = imageEstimate.operations + altEstimate.operations;
      if (itemCost > roundUsd(request.providerPolicy.maxCostUsd)) {
        issues.push(plannerError('request-cost-limit-exceeded', 'providerPolicy.maxCostUsd', 'Planned operations exceed this request cost limit.'));
      }
      if (itemOperations > request.providerPolicy.maxOperations) {
        issues.push(plannerError('request-operation-limit-exceeded', 'providerPolicy.maxOperations', 'Planned operations exceed this request operation limit.'));
      }
      if (issues.length) hasBlocked = true;
      totalCost = roundUsd(totalCost + itemCost);
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
    if (totalCost > roundUsd(batchReport.value.batchPolicy.maxCostUsd)) {
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

  function stripControlAndBidi(value) {
    return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, '');
  }

  function slug(value, fallback) {
    var trimmed = stripControlAndBidi(value).trim();
    if (!trimmed || trimmed === '__proto__' || trimmed === 'constructor' || trimmed === 'prototype') return fallback;
    var result = trimmed.replace(/[^A-Za-z0-9._:-]+/g, '-').replace(/^[^A-Za-z0-9]+|-+$/g, '').slice(0, 80);
    if (!result || result === '__proto__' || result === 'constructor' || result === 'prototype') return fallback;
    return result;
  }

  function createGlossaryMediaBatch(input) {
    var source = input || {};
    var planId = slug(source.planId, 'glossary-media-plan');
    var entries = Array.isArray(source.entries) ? source.entries.slice(0, MAX_ITEMS) : [];
    var providerPolicy = source.providerPolicy || {};
    var output = source.output || { width: 1024, height: 1024, mimeType: 'image/png', quality: 'standard' };
    var usedRequestIds = Object.create(null);
    return {
      schemaVersion: SCHEMA_VERSION,
      planId: planId,
      batchPolicy: source.batchPolicy || { maxCostUsd: 0, maxOperations: Math.max(1, entries.length * 2) },
      requests: entries.map(function (entry, index) {
        var itemId = slug(entry && (entry.id || entry.term), 'item-' + (index + 1));
        var baseReqId = slug(planId + ':' + itemId, 'glossary-item-' + (index + 1));
        var reqId = baseReqId;
        if (usedRequestIds[reqId]) {
          var suffix = '-' + (index + 1);
          reqId = baseReqId.slice(0, Math.max(1, 80 - suffix.length)) + suffix;
          var n = 2;
          while (usedRequestIds[reqId]) {
            var extra = '-' + (index + 1) + '-' + (n++);
            reqId = baseReqId.slice(0, Math.max(1, 80 - extra.length)) + extra;
          }
        }
        usedRequestIds[reqId] = true;
        var term = stripControlAndBidi(entry && entry.term || '').trim();
        var definition = stripControlAndBidi(entry && entry.definition || '').trim();
        var suppliedPrompt = stripControlAndBidi(entry && entry.prompt || '').trim();
        var prompt = suppliedPrompt || ('Create a clear, age-appropriate instructional illustration for the glossary term "' + term + '". Definition: ' + definition + '. Avoid decorative text and make the central concept visually unambiguous.');
        var request = {
          schemaVersion: SCHEMA_VERSION,
          requestId: reqId,
          operation: entry && entry.sourceAsset ? 'edit' : 'generate',
          prompt: prompt.slice(0, 8000),
          purpose: 'glossary-illustration:' + term.slice(0, 150),
          output: Object.assign({}, output),
          accessibility: { altTextRequired: true },
          providerPolicy: Object.assign({}, providerPolicy)
        };
        if (entry && entry.sourceAsset) request.sourceAsset = entry.sourceAsset;
        if (entry && Array.isArray(entry.referenceAssets)) request.referenceAssets = entry.referenceAssets.slice();
        return request;
      })
    };
  }

  var API = Object.freeze({
    MAX_ITEMS: MAX_ITEMS,
    validateBatch: function (input, injectedContracts) {
      var contracts = getContracts(injectedContracts);
      if (!contracts || typeof contracts.validateMediaRequest !== 'function') throw new Error('AgentCoreMediaContracts is required');
      return validateBatch(input, contracts);
    },
    planMediaBatch: planMediaBatch,
    createGlossaryMediaBatch: createGlossaryMediaBatch
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window === 'object' && window) {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreMediaPlanner = API;
  }
})();
