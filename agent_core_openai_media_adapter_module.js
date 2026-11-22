/**
 * AlloFlow Agent Core - OpenAI media adapter (disabled foundation).
 *
 * Implements the provider side of MediaRequest 1.0 for GPT Image 2 without
 * modifying AIProvider or Gemini routing. Credentials are never accepted here;
 * an injected fetchAuthorized function owned by the runtime adds them.
 * Nothing in this module is registered with MCP and execution is disabled by
 * default until a trusted runtime explicitly constructs the adapter.
 */
(function () {
  'use strict';

  var OPENAI_MEDIA_EXECUTION_DEFAULT_ENABLED = false;
  var OPENAI_BASE_URL = 'https://api.openai.com/v1';
  var MODEL_RE = /^gpt-image-2(?:-\d{4}-\d{2}-\d{2})?$/;
  var MIME_TO_FORMAT = Object.freeze({ 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp' });
  var FORMAT_TO_MIME = Object.freeze({ png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' });
  var QUALITY_MAP = Object.freeze({ draft: 'low', standard: 'medium', high: 'high' });
  var MAX_BASE64_CHARS = 40 * 1024 * 1024;

  function own(obj, key) {
    return !!(obj && typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key));
  }

  function adapterError(code, message) {
    var err = new Error(message);
    err.code = code;
    return err;
  }

  function selectOpenAIImageSize(width, height) {
    var ratio = Number(width) / Number(height);
    if (!Number.isFinite(ratio) || ratio <= 0) return '1024x1024';
    if (ratio > 1.2) return '1536x1024';
    if (ratio < (1 / 1.2)) return '1024x1536';
    return '1024x1024';
  }

  function dimensionsForSize(size) {
    if (size === '1536x1024') return { width: 1536, height: 1024 };
    if (size === '1024x1536') return { width: 1024, height: 1536 };
    return { width: 1024, height: 1024 };
  }

  function defaultBase64ToBytes(base64) {
    if (typeof base64 !== 'string') {
      throw adapterError('openai-invalid-image', 'OpenAI returned malformed base64 image data.');
    }
    var cleaned = base64.replace(/\s+/g, '');
    if (!cleaned || cleaned.length > MAX_BASE64_CHARS || cleaned.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
      throw adapterError('openai-invalid-image', 'OpenAI returned malformed base64 image data.');
    }
    if (typeof atob === 'function') {
      var binary;
      try { binary = atob(cleaned); }
      catch (_) { throw adapterError('openai-invalid-image', 'OpenAI returned malformed base64 image data.'); }
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(cleaned, 'base64'));
    throw adapterError('base64-decoder-unavailable', 'No base64 decoder is available in this runtime.');
  }

  function sanitizeUsage(usage) {
    var input = usage && typeof usage === 'object' ? usage : {};
    var details = input.input_tokens_details && typeof input.input_tokens_details === 'object'
      ? input.input_tokens_details : {};
    return {
      inputTokens: Number.isFinite(input.input_tokens) && input.input_tokens >= 0 ? input.input_tokens : 0,
      inputTextTokens: Number.isFinite(details.text_tokens) && details.text_tokens >= 0 ? details.text_tokens : 0,
      inputImageTokens: Number.isFinite(details.image_tokens) && details.image_tokens >= 0 ? details.image_tokens : 0,
      outputTokens: Number.isFinite(input.output_tokens) && input.output_tokens >= 0 ? input.output_tokens : 0,
      totalTokens: Number.isFinite(input.total_tokens) && input.total_tokens >= 0 ? input.total_tokens : 0
    };
  }

  function createOpenAIMediaAdapter(options) {
    var opts = options || {};
    var contracts = opts.contracts;
    var assetStore = opts.assetStore;
    var fetchAuthorized = opts.fetchAuthorized;
    var authorizeExecution = opts.authorizeExecution;
    var estimateCost = opts.estimateCost;
    var calculateActualCost = opts.calculateActualCost;
    var createAltText = opts.createAltText;
    var FormDataCtor = opts.FormData || (typeof FormData !== 'undefined' ? FormData : null);
    var BlobCtor = opts.Blob || (typeof Blob !== 'undefined' ? Blob : null);
    var base64ToBytes = typeof opts.base64ToBytes === 'function' ? opts.base64ToBytes : defaultBase64ToBytes;
    var model = opts.model || 'gpt-image-2';

    if (!contracts || typeof contracts.validateMediaRequest !== 'function') throw new Error('Media contracts are required');
    if (!assetStore || typeof assetStore.importAsset !== 'function' || typeof assetStore.readBytesForAdapter !== 'function') throw new Error('Managed asset store is required');
    if (typeof fetchAuthorized !== 'function') throw new Error('Runtime fetchAuthorized is required');
    if (typeof authorizeExecution !== 'function') throw new Error('Runtime authorizeExecution is required');
    if (typeof estimateCost !== 'function' || typeof calculateActualCost !== 'function') throw new Error('Cost estimation and accounting functions are required');
    if (!MODEL_RE.test(model)) throw new Error('Only GPT Image 2 or a pinned GPT Image 2 snapshot is allowed');

    function normalizeRequest(requestInput) {
      var report = contracts.validateMediaRequest(requestInput);
      if (!report.ok) {
        var error = adapterError('invalid-media-request', 'Media request failed contract validation.');
        error.report = report;
        throw error;
      }
      return report.value;
    }

    function buildPlan(requestInput) {
      var request = normalizeRequest(requestInput);
      if (!request.providerPolicy.allowMeteredUsage) {
        return { ready: false, code: 'metered-usage-not-approved', request: request, estimate: null, provider: null };
      }
      if (request.providerPolicy.mode === 'allow-listed' && request.providerPolicy.allowedProviders.indexOf('openai-api') === -1) {
        return { ready: false, code: 'provider-not-approved', request: request, estimate: null, provider: null };
      }
      if (request.providerPolicy.allowedModels.length && request.providerPolicy.allowedModels.indexOf(model) === -1) {
        return { ready: false, code: 'model-not-approved', request: request, estimate: null, provider: null };
      }
      if (request.providerPolicy.maxOperations < 1) {
        return { ready: false, code: 'operation-limit-too-low', request: request, estimate: null, provider: null };
      }
      if (request.operation === 'generate' && Array.isArray(request.referenceAssets) && request.referenceAssets.length > 0) {
        return { ready: false, code: 'reference-assets-require-edit', request: request, estimate: null, provider: null };
      }
      var size = selectOpenAIImageSize(request.output.width, request.output.height);
      var quality = own(QUALITY_MAP, request.output.quality) ? QUALITY_MAP[request.output.quality] : 'medium';
      var outputFormat = own(MIME_TO_FORMAT, request.output.mimeType) ? MIME_TO_FORMAT[request.output.mimeType] : 'png';
      var inputImageCount = request.operation === 'edit' ? 1 + (Array.isArray(request.referenceAssets) ? request.referenceAssets.length : 0) : 0;
      var estimate = estimateCost({
        provider: 'openai-api', model: model, operation: request.operation,
        size: size, quality: quality, outputFormat: outputFormat,
        inputImageCount: inputImageCount, operations: 1
      });
      if (!estimate || !Number.isFinite(estimate.upperBoundUsd) || estimate.upperBoundUsd < 0) {
        return { ready: false, code: 'cost-estimate-required', request: request, estimate: null, provider: null };
      }
      if (estimate.upperBoundUsd > request.providerPolicy.maxCostUsd) {
        return { ready: false, code: 'cost-limit-exceeded', request: request, estimate: estimate, provider: null };
      }
      return {
        ready: true,
        code: '',
        request: request,
        estimate: { upperBoundUsd: estimate.upperBoundUsd, currency: 'USD' },
        provider: { id: 'openai-api', model: model, billing: 'metered' },
        api: { size: size, quality: quality, outputFormat: outputFormat, inputImageCount: inputImageCount }
      };
    }

    async function parseResponse(response) {
      if (!response || response.ok !== true) {
        var status = response && Number.isInteger(response.status) ? response.status : 0;
        throw adapterError('openai-http-error', 'OpenAI image request failed with HTTP status ' + status + '.');
      }
      var data;
      try { data = await response.json(); }
      catch (_) { throw adapterError('openai-invalid-response', 'OpenAI returned an unreadable image response.'); }
      var base64 = data && data.data && data.data[0] && data.data[0].b64_json;
      if (typeof base64 !== 'string' || !base64) throw adapterError('openai-missing-image', 'OpenAI did not return image data.');
      return { bytes: base64ToBytes(base64), usage: sanitizeUsage(data.usage), rawUsage: data.usage || {} };
    }

    function formAppendImage(form, field, bytes, mimeType, filename) {
      if (!FormDataCtor || !BlobCtor) throw adapterError('multipart-unavailable', 'This runtime cannot construct multipart image edits.');
      form.append(field, new BlobCtor([bytes], { type: mimeType || 'image/png' }), filename);
    }

    async function callGeneration(plan) {
      var body = {
        model: model,
        prompt: plan.request.prompt,
        n: 1,
        size: plan.api.size,
        quality: plan.api.quality,
        output_format: plan.api.outputFormat,
        moderation: 'auto'
      };
      return fetchAuthorized(OPENAI_BASE_URL + '/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }, { provider: 'openai-api', operation: 'image-generation' });
    }

    async function callEdit(plan) {
      if (!FormDataCtor || !BlobCtor) throw adapterError('multipart-unavailable', 'This runtime cannot construct multipart image edits.');
      var form = new FormDataCtor();
      form.append('model', model);
      form.append('prompt', plan.request.prompt);
      form.append('n', '1');
      form.append('size', plan.api.size);
      form.append('quality', plan.api.quality);
      form.append('output_format', plan.api.outputFormat);
      form.append('moderation', 'auto');
      var resolveAssetMime = function (ref) {
        if (ref && ref.mimeType) return ref.mimeType;
        try {
          var meta = ref && typeof assetStore.getMetadata === 'function' ? assetStore.getMetadata(ref.handle) : null;
          if (meta && meta.mimeType) return meta.mimeType;
        } catch (_) {}
        return 'image/png';
      };
      var sourceBytes = assetStore.readBytesForAdapter(plan.request.sourceAsset.handle, { purpose: 'openai-image-edit-source' });
      formAppendImage(form, 'image[]', sourceBytes, resolveAssetMime(plan.request.sourceAsset), 'source.png');
      plan.request.referenceAssets.forEach(function (reference, index) {
        var bytes = assetStore.readBytesForAdapter(reference.handle, { purpose: 'openai-image-edit-reference' });
        formAppendImage(form, 'image[]', bytes, resolveAssetMime(reference), 'reference-' + (index + 1) + '.png');
      });
      // Do not set Content-Type: fetch/FormData must add the multipart boundary.
      // GPT Image 2 always uses high-fidelity inputs, so input_fidelity is omitted.
      return fetchAuthorized(OPENAI_BASE_URL + '/images/edits', {
        method: 'POST',
        body: form
      }, { provider: 'openai-api', operation: 'image-edit' });
    }

    async function execute(requestInput) {
      if (typeof window !== 'undefined' && (
        window.__alloOfflineOnly === true ||
        window.__alloQrStudentMode === true ||
        window._alloQrBlocked === true ||
        window.__alloStudentAiDisabled === true ||
        window.__alloAiSecretsLocked === true
      )) {
        throw adapterError('execution-not-authorized', 'The runtime did not authorize this metered media operation.');
      }
      var plan = buildPlan(requestInput);
      if (!plan.ready) throw adapterError(plan.code, 'OpenAI media preflight did not authorize execution.');
      var authorized = false;
      try {
        authorized = authorizeExecution({ request: plan.request, estimate: plan.estimate, provider: plan.provider }) === true;
      } catch (_) {
        authorized = false;
      }
      if (!authorized) {
        throw adapterError('execution-not-authorized', 'The runtime did not authorize this metered media operation.');
      }
      var response = plan.request.operation === 'edit' ? await callEdit(plan) : await callGeneration(plan);
      var parsed = await parseResponse(response);
      var actualCostUsd = calculateActualCost({
        provider: 'openai-api', model: model, operation: plan.request.operation,
        size: plan.api.size, quality: plan.api.quality,
        inputImageCount: plan.api.inputImageCount, usage: parsed.rawUsage
      });
      if (!Number.isFinite(actualCostUsd) || actualCostUsd < 0) {
        throw adapterError('cost-accounting-failed', 'Actual OpenAI media cost could not be calculated.');
      }
      if (actualCostUsd > plan.request.providerPolicy.maxCostUsd) {
        var costErr = adapterError('actual-cost-limit-exceeded', 'Actual OpenAI media cost exceeded the approved limit.');
        costErr.actualCostUsd = actualCostUsd;
        throw costErr;
      }
      var mimeType = own(FORMAT_TO_MIME, plan.api.outputFormat) ? FORMAT_TO_MIME[plan.api.outputFormat] : 'image/png';
      var altText = '';
      if (plan.request.accessibility.altTextRequired) {
        if (typeof createAltText !== 'function') throw adapterError('alt-text-provider-required', 'An approved alt-text provider is required.');
        altText = String(await createAltText({
          bytes: new Uint8Array(parsed.bytes), mimeType: mimeType,
          purpose: plan.request.purpose, prompt: plan.request.prompt
        }) || '').trim();
        if (!altText) throw adapterError('alt-text-generation-failed', 'The approved alt-text provider did not return alt text.');
      }
      var dimensions = dimensionsForSize(plan.api.size);
      var asset = assetStore.importAsset({
        bytes: parsed.bytes,
        mimeType: mimeType,
        width: dimensions.width,
        height: dimensions.height,
        altText: altText,
        sourceDeclaration: 'Generated or edited with OpenAI ' + model,
        licenseDeclaration: typeof opts.licenseDeclaration === 'string' ? opts.licenseDeclaration : ''
      });
      return {
        schemaVersion: '1.0',
        requestId: plan.request.requestId,
        status: 'completed',
        asset: asset,
        provider: { id: 'openai-api', model: model },
        usage: { operations: 1, actualCostUsd: actualCostUsd, currency: 'USD' },
        providerUsage: parsed.usage
      };
    }

    return Object.freeze({ prepare: buildPlan, execute: execute, providerId: 'openai-api', model: model });
  }

  var API = Object.freeze({
    OPENAI_MEDIA_EXECUTION_DEFAULT_ENABLED: OPENAI_MEDIA_EXECUTION_DEFAULT_ENABLED,
    OPENAI_BASE_URL: OPENAI_BASE_URL,
    createOpenAIMediaAdapter: createOpenAIMediaAdapter,
    selectOpenAIImageSize: selectOpenAIImageSize
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreOpenAIMediaAdapter = API;
  }
})();
