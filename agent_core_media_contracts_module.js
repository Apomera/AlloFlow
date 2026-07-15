/**
 * AlloFlow Agent Core - provider-neutral media contracts.
 *
 * This module is intentionally inert: it registers validators and preflight
 * helpers, but it does not register MCP tools, read credentials, make network
 * requests, or alter the existing Gemini/Canvas path. Execution remains
 * disabled by default until a separately approved adapter is injected.
 */
(function () {
  'use strict';

  var SCHEMA_VERSION = '1.0';
  var MEDIA_EXECUTION_DEFAULT_ENABLED = false;
  var MODALITIES = ['text', 'vision', 'imageGeneration', 'imageEditing'];
  var TRANSPORTS = ['host-subscription', 'api', 'local', 'district-managed'];
  var BILLING_MODES = ['included', 'metered', 'local-resource', 'unknown'];
  var OPERATIONS = ['generate', 'edit'];
  var RESULT_STATUSES = ['completed', 'incomplete', 'failed', 'cancelled'];
  var QUALITY_LEVELS = ['draft', 'standard', 'high'];
  var MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  var IDENTIFIER_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
  var ASSET_HANDLE_RE = /^asset_[A-Za-z0-9_-]{8,128}$/;
  var SECRET_FIELD_RE = /(?:^|[_-])(?:api)?key$|token|secret|password|credential/i;
  var ABSOLUTE_PATH_RE = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/;
  var MAX_SCAN_DEPTH = 8;

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function error(code, path, message) {
    return { code: code, path: path, message: message };
  }

  function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function scanUnsafe(value, path, errors, depth) {
    if (!value || typeof value !== 'object') return;
    if (depth > MAX_SCAN_DEPTH) {
      errors.push(error('payload-too-deep', path, 'Media contract payloads may not exceed ' + MAX_SCAN_DEPTH + ' levels.'));
      return;
    }
    var keys = Array.isArray(value) ? value.map(function (_, index) { return index; }) : Object.keys(value);
    keys.forEach(function (key) {
      var childPath = path ? path + '.' + key : String(key);
      if (typeof key === 'string' && SECRET_FIELD_RE.test(key)) {
        errors.push(error('secret-like-field', childPath, 'Credentials are runtime-only and may not appear in agent contracts.'));
        return;
      }
      var child = value[key];
      if (typeof child === 'string') {
        if (ABSOLUTE_PATH_RE.test(child)) {
          errors.push(error('unsafe-path-value', childPath, 'Use an opaque managed asset handle, not a filesystem path.'));
        }
        if (/^data:/i.test(child) || child.length > 20000) {
          errors.push(error('embedded-asset-data', childPath, 'Image bytes must not be embedded in the model contract.'));
        }
      } else if (child && typeof child === 'object') {
        scanUnsafe(child, childPath, errors, depth + 1);
      }
    });
  }

  function checkKnownFields(input, known, warnings) {
    Object.keys(input).forEach(function (key) {
      if (known.indexOf(key) === -1) {
        warnings.push(error('unknown-field-dropped', key, 'Unknown field "' + key + '" was dropped.'));
      }
    });
  }

  function normalizeStringList(value, path, errors, allowed) {
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
      errors.push(error('bad-list', path, path + ' must be an array.'));
      return [];
    }
    var out = [];
    value.forEach(function (item, index) {
      if (typeof item !== 'string' || !item || (allowed && allowed.indexOf(item) === -1) || (!allowed && !IDENTIFIER_RE.test(item))) {
        errors.push(error('bad-list-item', path + '[' + index + ']', 'Invalid value in ' + path + '.'));
      } else if (out.indexOf(item) === -1) {
        out.push(item);
      }
    });
    return out;
  }

  function validateProviderInventory(input) {
    var errors = [];
    var warnings = [];
    if (!isPlainObject(input)) {
      return { ok: false, errors: [error('not-an-object', '', 'ProviderInventory must be an object.')], warnings: [], value: null };
    }
    scanUnsafe(input, '', errors, 0);
    if (input.schemaVersion !== SCHEMA_VERSION) errors.push(error('unsupported-version', 'schemaVersion', 'Expected schemaVersion "' + SCHEMA_VERSION + '".'));
    if (!Array.isArray(input.providers)) errors.push(error('bad-providers', 'providers', 'providers must be an array.'));
    var providers = [];
    var providerIds = [];
    (Array.isArray(input.providers) ? input.providers : []).forEach(function (provider, providerIndex) {
      var base = 'providers[' + providerIndex + ']';
      if (!isPlainObject(provider)) {
        errors.push(error('bad-provider', base, 'Each provider must be an object.'));
        return;
      }
      if (typeof provider.id !== 'string' || !IDENTIFIER_RE.test(provider.id)) errors.push(error('bad-provider-id', base + '.id', 'Provider id is invalid.'));
      if (providerIds.indexOf(provider.id) !== -1) errors.push(error('duplicate-provider', base + '.id', 'Provider ids must be unique.'));
      providerIds.push(provider.id);
      if (TRANSPORTS.indexOf(provider.transport) === -1) errors.push(error('bad-transport', base + '.transport', 'Unknown provider transport.'));
      if (BILLING_MODES.indexOf(provider.billing) === -1) errors.push(error('bad-billing', base + '.billing', 'Unknown provider billing mode.'));
      if (!Array.isArray(provider.models) || !provider.models.length) errors.push(error('bad-models', base + '.models', 'At least one model must be advertised.'));
      var models = [];
      var modelIds = [];
      (Array.isArray(provider.models) ? provider.models : []).forEach(function (model, modelIndex) {
        var modelBase = base + '.models[' + modelIndex + ']';
        if (!isPlainObject(model)) {
          errors.push(error('bad-model', modelBase, 'Each model must be an object.'));
          return;
        }
        if (typeof model.id !== 'string' || !IDENTIFIER_RE.test(model.id)) errors.push(error('bad-model-id', modelBase + '.id', 'Model id is invalid.'));
        if (modelIds.indexOf(model.id) !== -1) errors.push(error('duplicate-model', modelBase + '.id', 'Model ids must be unique within a provider.'));
        modelIds.push(model.id);
        var modalities = normalizeStringList(model.modalities, modelBase + '.modalities', errors, MODALITIES);
        if (!modalities.length) errors.push(error('missing-modalities', modelBase + '.modalities', 'At least one modality is required.'));
        models.push({ id: model.id || '', modalities: modalities, enabled: model.enabled !== false });
      });
      providers.push({
        id: provider.id || '',
        displayName: typeof provider.displayName === 'string' ? provider.displayName.slice(0, 120) : '',
        transport: provider.transport || '',
        billing: provider.billing || '',
        models: models
      });
    });
    checkKnownFields(input, ['schemaVersion', 'providers'], warnings);
    if (errors.length) return { ok: false, errors: errors, warnings: warnings, value: null };
    return { ok: true, errors: [], warnings: warnings, value: { schemaVersion: SCHEMA_VERSION, providers: providers } };
  }

  function validateAssetRef(input, path) {
    var errors = [];
    if (!isPlainObject(input)) return { ok: false, errors: [error('bad-asset-ref', path, 'Asset reference must be an object.')], value: null };
    scanUnsafe(input, path, errors, 0);
    if (typeof input.handle !== 'string' || !ASSET_HANDLE_RE.test(input.handle)) errors.push(error('bad-asset-handle', path + '.handle', 'Use an opaque managed asset handle.'));
    if (input.mimeType !== undefined && MIME_TYPES.indexOf(input.mimeType) === -1) errors.push(error('bad-mime-type', path + '.mimeType', 'Unsupported image MIME type.'));
    if (errors.length) return { ok: false, errors: errors, value: null };
    return { ok: true, errors: [], value: { handle: input.handle, mimeType: input.mimeType || '' } };
  }

  function validateProviderPolicy(input) {
    var policy = input === undefined ? {} : input;
    var errors = [];
    if (!isPlainObject(policy)) return { ok: false, errors: [error('bad-provider-policy', 'providerPolicy', 'providerPolicy must be an object.')], value: null };
    scanUnsafe(policy, 'providerPolicy', errors, 0);
    var mode = policy.mode || 'deployment-default';
    if (['deployment-default', 'allow-listed'].indexOf(mode) === -1) errors.push(error('bad-policy-mode', 'providerPolicy.mode', 'Unknown provider selection mode.'));
    var allowedProviders = normalizeStringList(policy.allowedProviders, 'providerPolicy.allowedProviders', errors);
    var allowedModels = normalizeStringList(policy.allowedModels, 'providerPolicy.allowedModels', errors);
    if (mode === 'allow-listed' && !allowedProviders.length) errors.push(error('empty-provider-allow-list', 'providerPolicy.allowedProviders', 'allow-listed mode requires at least one provider.'));
    if (policy.preferredProvider !== undefined && (typeof policy.preferredProvider !== 'string' || !IDENTIFIER_RE.test(policy.preferredProvider))) errors.push(error('bad-preferred-provider', 'providerPolicy.preferredProvider', 'preferredProvider is invalid.'));
    if (policy.preferredModel !== undefined && (typeof policy.preferredModel !== 'string' || !IDENTIFIER_RE.test(policy.preferredModel))) errors.push(error('bad-preferred-model', 'providerPolicy.preferredModel', 'preferredModel is invalid.'));
    var maxCostUsd = policy.maxCostUsd === undefined ? 0 : policy.maxCostUsd;
    var maxOperations = policy.maxOperations === undefined ? 1 : policy.maxOperations;
    if (!finiteNumber(maxCostUsd) || maxCostUsd < 0 || maxCostUsd > 100000) errors.push(error('bad-cost-limit', 'providerPolicy.maxCostUsd', 'maxCostUsd must be between 0 and 100000.'));
    if (!Number.isInteger(maxOperations) || maxOperations < 1 || maxOperations > 10000) errors.push(error('bad-operation-limit', 'providerPolicy.maxOperations', 'maxOperations must be an integer from 1 to 10000.'));
    if (errors.length) return { ok: false, errors: errors, value: null };
    return { ok: true, errors: [], value: {
      mode: mode,
      allowedProviders: allowedProviders,
      allowedModels: allowedModels,
      preferredProvider: policy.preferredProvider || '',
      preferredModel: policy.preferredModel || '',
      allowMeteredUsage: policy.allowMeteredUsage === true,
      maxCostUsd: maxCostUsd,
      maxOperations: maxOperations
    } };
  }

  function validateMediaRequest(input) {
    var errors = [];
    var warnings = [];
    if (!isPlainObject(input)) return { ok: false, errors: [error('not-an-object', '', 'MediaRequest must be an object.')], warnings: [], value: null };
    scanUnsafe(input, '', errors, 0);
    if (input.schemaVersion !== SCHEMA_VERSION) errors.push(error('unsupported-version', 'schemaVersion', 'Expected schemaVersion "' + SCHEMA_VERSION + '".'));
    if (typeof input.requestId !== 'string' || !IDENTIFIER_RE.test(input.requestId)) errors.push(error('bad-request-id', 'requestId', 'requestId is invalid.'));
    if (OPERATIONS.indexOf(input.operation) === -1) errors.push(error('bad-operation', 'operation', 'operation must be generate or edit.'));
    if (typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 8000) errors.push(error('bad-prompt', 'prompt', 'prompt must contain 1 to 8000 characters.'));

    var sourceAsset = null;
    if (input.sourceAsset !== undefined) {
      var sourceReport = validateAssetRef(input.sourceAsset, 'sourceAsset');
      if (!sourceReport.ok) errors = errors.concat(sourceReport.errors); else sourceAsset = sourceReport.value;
    }
    if (input.operation === 'edit' && !sourceAsset) errors.push(error('source-required', 'sourceAsset', 'Image editing requires a managed source asset.'));
    if (input.operation === 'generate' && sourceAsset) errors.push(error('source-not-allowed', 'sourceAsset', 'Image generation does not accept a source asset; use edit.'));

    var referenceAssets = [];
    if (input.referenceAssets !== undefined && !Array.isArray(input.referenceAssets)) errors.push(error('bad-reference-assets', 'referenceAssets', 'referenceAssets must be an array.'));
    (Array.isArray(input.referenceAssets) ? input.referenceAssets : []).slice(0, 4).forEach(function (asset, index) {
      var report = validateAssetRef(asset, 'referenceAssets[' + index + ']');
      if (!report.ok) errors = errors.concat(report.errors); else referenceAssets.push(report.value);
    });
    if (Array.isArray(input.referenceAssets) && input.referenceAssets.length > 4) errors.push(error('too-many-reference-assets', 'referenceAssets', 'At most four reference assets are allowed.'));

    var output = isPlainObject(input.output) ? input.output : {};
    var width = output.width === undefined ? 1024 : output.width;
    var height = output.height === undefined ? 1024 : output.height;
    var mimeType = output.mimeType || 'image/png';
    var quality = output.quality || 'standard';
    if (!Number.isInteger(width) || width < 256 || width > 4096) errors.push(error('bad-width', 'output.width', 'width must be an integer from 256 to 4096.'));
    if (!Number.isInteger(height) || height < 256 || height > 4096) errors.push(error('bad-height', 'output.height', 'height must be an integer from 256 to 4096.'));
    if (MIME_TYPES.indexOf(mimeType) === -1) errors.push(error('bad-mime-type', 'output.mimeType', 'Unsupported image MIME type.'));
    if (QUALITY_LEVELS.indexOf(quality) === -1) errors.push(error('bad-quality', 'output.quality', 'Unknown quality level.'));

    var policyReport = validateProviderPolicy(input.providerPolicy);
    if (!policyReport.ok) errors = errors.concat(policyReport.errors);
    checkKnownFields(input, ['schemaVersion', 'requestId', 'operation', 'prompt', 'purpose', 'sourceAsset', 'referenceAssets', 'output', 'accessibility', 'providerPolicy'], warnings);
    if (errors.length) return { ok: false, errors: errors, warnings: warnings, value: null };
    return { ok: true, errors: [], warnings: warnings, value: {
      schemaVersion: SCHEMA_VERSION,
      requestId: input.requestId,
      operation: input.operation,
      prompt: input.prompt,
      purpose: typeof input.purpose === 'string' ? input.purpose.slice(0, 200) : '',
      sourceAsset: sourceAsset,
      referenceAssets: referenceAssets,
      output: { width: width, height: height, mimeType: mimeType, quality: quality },
      accessibility: { altTextRequired: !isPlainObject(input.accessibility) || input.accessibility.altTextRequired !== false },
      providerPolicy: policyReport.value
    } };
  }

  function preflightMediaRequest(requestInput, inventoryInput) {
    var requestReport = validateMediaRequest(requestInput);
    var inventoryReport = validateProviderInventory(inventoryInput);
    var errors = [];
    if (!requestReport.ok) errors = errors.concat(requestReport.errors);
    if (!inventoryReport.ok) errors = errors.concat(inventoryReport.errors);
    if (errors.length) return { ok: false, ready: false, errors: errors, selection: null };

    var request = requestReport.value;
    var policy = request.providerPolicy;
    var requiredModality = request.operation === 'edit' ? 'imageEditing' : 'imageGeneration';
    var candidates = [];
    inventoryReport.value.providers.forEach(function (provider) {
      if (policy.mode === 'allow-listed' && policy.allowedProviders.indexOf(provider.id) === -1) return;
      if (provider.billing === 'metered' && !policy.allowMeteredUsage) return;
      provider.models.forEach(function (model) {
        if (!model.enabled || model.modalities.indexOf(requiredModality) === -1) return;
        if (policy.allowedModels.length && policy.allowedModels.indexOf(model.id) === -1) return;
        candidates.push({ provider: provider.id, model: model.id, transport: provider.transport, billing: provider.billing });
      });
    });
    if (policy.preferredProvider) candidates.sort(function (a, b) { return (b.provider === policy.preferredProvider) - (a.provider === policy.preferredProvider); });
    if (policy.preferredModel) candidates.sort(function (a, b) { return (b.model === policy.preferredModel) - (a.model === policy.preferredModel); });
    if (!candidates.length) {
      return { ok: true, ready: false, errors: [error('missing-approved-capability', 'providerPolicy', 'No approved provider/model can satisfy ' + requiredModality + '.')], selection: null };
    }
    return { ok: true, ready: true, errors: [], selection: candidates[0], requiredModality: requiredModality };
  }

  function validateMediaResult(input, options) {
    var errors = [];
    if (!isPlainObject(input)) return { ok: false, errors: [error('not-an-object', '', 'MediaResult must be an object.')], value: null };
    scanUnsafe(input, '', errors, 0);
    if (input.schemaVersion !== SCHEMA_VERSION) errors.push(error('unsupported-version', 'schemaVersion', 'Expected schemaVersion "' + SCHEMA_VERSION + '".'));
    if (typeof input.requestId !== 'string' || !IDENTIFIER_RE.test(input.requestId)) errors.push(error('bad-request-id', 'requestId', 'requestId is invalid.'));
    if (RESULT_STATUSES.indexOf(input.status) === -1) errors.push(error('bad-result-status', 'status', 'Unknown media result status.'));
    var requestReport = options && options.request ? validateMediaRequest(options.request) : null;
    if (requestReport && !requestReport.ok) errors = errors.concat(requestReport.errors.map(function (item) { return error(item.code, 'request.' + item.path, item.message); }));

    var asset = null;
    if (input.asset !== undefined) {
      var assetReport = validateAssetRef(input.asset, 'asset');
      if (!assetReport.ok) errors = errors.concat(assetReport.errors);
      else {
        asset = {
          handle: assetReport.value.handle,
          mimeType: assetReport.value.mimeType,
          width: input.asset.width,
          height: input.asset.height,
          altText: typeof input.asset.altText === 'string' ? input.asset.altText.slice(0, 2000) : '',
          sourceDeclaration: typeof input.asset.sourceDeclaration === 'string' ? input.asset.sourceDeclaration.slice(0, 500) : '',
          licenseDeclaration: typeof input.asset.licenseDeclaration === 'string' ? input.asset.licenseDeclaration.slice(0, 500) : ''
        };
      }
    }
    if (input.status === 'completed' && !asset) errors.push(error('completed-without-asset', 'asset', 'A completed result must contain a managed asset.'));
    if (asset && requestReport && requestReport.ok && requestReport.value.accessibility.altTextRequired && !asset.altText.trim()) errors.push(error('missing-alt-text', 'asset.altText', 'Alt text is required for this request.'));

    var usage = isPlainObject(input.usage) ? input.usage : {};
    var operations = usage.operations === undefined ? 0 : usage.operations;
    var actualCostUsd = usage.actualCostUsd === undefined ? 0 : usage.actualCostUsd;
    if (!Number.isInteger(operations) || operations < 0) errors.push(error('bad-operation-count', 'usage.operations', 'operations must be a non-negative integer.'));
    if (!finiteNumber(actualCostUsd) || actualCostUsd < 0) errors.push(error('bad-actual-cost', 'usage.actualCostUsd', 'actualCostUsd must be a non-negative number.'));
    if (requestReport && requestReport.ok) {
      if (operations > requestReport.value.providerPolicy.maxOperations) errors.push(error('operation-limit-exceeded', 'usage.operations', 'Result exceeded the approved operation limit.'));
      if (actualCostUsd > requestReport.value.providerPolicy.maxCostUsd) errors.push(error('cost-limit-exceeded', 'usage.actualCostUsd', 'Result exceeded the approved cost limit.'));
    }
    if (errors.length) return { ok: false, errors: errors, value: null };
    return { ok: true, errors: [], value: {
      schemaVersion: SCHEMA_VERSION,
      requestId: input.requestId,
      status: input.status,
      asset: asset,
      provider: isPlainObject(input.provider) ? { id: String(input.provider.id || ''), model: String(input.provider.model || '') } : { id: '', model: '' },
      usage: { operations: operations, actualCostUsd: actualCostUsd, currency: 'USD' },
      error: isPlainObject(input.error) ? { code: String(input.error.code || '').slice(0, 100), message: String(input.error.message || '').slice(0, 500) } : null
    } };
  }

  var API = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    MEDIA_EXECUTION_DEFAULT_ENABLED: MEDIA_EXECUTION_DEFAULT_ENABLED,
    MODALITIES: MODALITIES,
    validateProviderInventory: validateProviderInventory,
    validateProviderPolicy: validateProviderPolicy,
    validateAssetRef: validateAssetRef,
    validateMediaRequest: validateMediaRequest,
    preflightMediaRequest: preflightMediaRequest,
    validateMediaResult: validateMediaResult
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreMediaContracts = API;
  }
})();
