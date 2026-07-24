/*
 * AlloFlow Tool Integration SDK v1.0.0
 * Framework-neutral adapter helpers for sending bounded, learner-approved
 * artifacts from companion tools into the Research Hub.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AlloFlowToolIntegration = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SDK_VERSION = '1.0.0';
  var METHOD_PACKS = ['scientific_investigation', 'engineering_design', 'humanistic_interpretation', 'community_qualitative', 'civic_policy', 'creative_cultural'];
  var RECEIPT_FIELDS = ['softwareVersion', 'sourceRecordId', 'parameters', 'randomSeed', 'limitations', 'datasetVersion', 'transformations'];

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
  }

  function nonEmpty(value) {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  function validateContract(contract, options) {
    var c = contract || {};
    var errors = [];
    var now = options && options.now ? new Date(options.now).getTime() : Date.now();
    if (c.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(String(c.id || ''))) errors.push('id must be a stable lowercase identifier');
    ['name', 'version', 'reviewedAt', 'reviewAfter'].forEach(function (field) { if (!nonEmpty(c[field])) errors.push(field + ' is required'); });
    var reviewedAt = Date.parse(String(c.reviewedAt || ''));
    var reviewAfter = Date.parse(String(c.reviewAfter || ''));
    if (!isFinite(reviewedAt) || !isFinite(reviewAfter) || reviewAfter <= reviewedAt) errors.push('review window is invalid');
    if (isFinite(reviewAfter) && isFinite(now) && reviewAfter < now) errors.push('integration review is overdue');
    if (!c.license || !nonEmpty(c.license.spdx || c.license.name)) errors.push('license metadata is required');
    if (!c.citation || !nonEmpty(c.citation.text)) errors.push('citation guidance is required');
    if (!Array.isArray(c.supportedMethodPacks) || !c.supportedMethodPacks.length || c.supportedMethodPacks.some(function (pack) { return METHOD_PACKS.indexOf(pack) === -1; })) errors.push('supportedMethodPacks is invalid');
    if (!c.capabilities || c.capabilities.captureArtifact !== true) errors.push('captureArtifact capability must be true');
    if (!c.privacy || c.privacy.learnerApprovalRequired !== true) errors.push('learner approval must be required');
    if (c.privacy && c.privacy.sanitizerRequired === true && !nonEmpty(c.privacy.sanitizerId)) errors.push('sanitizerId is required when sanitizerRequired is true');
    var required = c.reproducibility && c.reproducibility.requiredFields;
    if (!Array.isArray(required) || required.indexOf('softwareVersion') === -1 || required.indexOf('limitations') === -1 || required.some(function (field) { return RECEIPT_FIELDS.indexOf(field) === -1; })) errors.push('reproducibility.requiredFields is invalid');
    return { ok: errors.length === 0, errors: errors };
  }

  function validateReceipt(receipt, contract) {
    var errors = [];
    var required = contract && contract.reproducibility && contract.reproducibility.requiredFields || [];
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return { ok: false, errors: ['reproducibilityReceipt is required'] };
    required.forEach(function (field) { if (!Object.prototype.hasOwnProperty.call(receipt, field) || !nonEmpty(receipt[field])) errors.push('reproducibilityReceipt.' + field + ' is required'); });
    return { ok: errors.length === 0, errors: errors };
  }

  function findResearchHub() {
    var candidates = [root];
    try { if (root && root.opener) candidates.push(root.opener); } catch (_) {}
    try { if (root && root.parent && root.parent !== root) candidates.push(root.parent); } catch (_) {}
    try { if (root && root.top && root.top !== root) candidates.push(root.top); } catch (_) {}
    for (var i = 0; i < candidates.length; i++) {
      try {
        if (candidates[i] && candidates[i].ResearchHub && typeof candidates[i].ResearchHub.captureArtifact === 'function') return candidates[i].ResearchHub;
      } catch (_) {}
    }
    return null;
  }

  function createAdapter(options) {
    options = options || {};
    var contract = clone(options.contract);
    var contractCheck = validateContract(contract, options.validationOptions);
    if (!contractCheck.ok) throw new Error('Invalid integration contract: ' + contractCheck.errors.join('; '));
    if (typeof options.buildCapture !== 'function') throw new Error('buildCapture(payload) is required');
    if (contract.privacy && contract.privacy.sanitizerRequired === true && typeof options.sanitizeCapture !== 'function') throw new Error('sanitizeCapture(capture) is required by this contract');

    function prepare(payload) {
      var built;
      try { built = options.buildCapture(clone(payload)); } catch (error) { return { ok: false, reason: 'Capture builder failed: ' + String(error && error.message || error) }; }
      var capture = clone(built);
      if (!capture || typeof capture !== 'object' || Array.isArray(capture)) return { ok: false, reason: 'Capture builder must return a JSON-serializable object.' };
      if (typeof options.sanitizeCapture === 'function') {
        try { capture = clone(options.sanitizeCapture(capture)); } catch (error) { return { ok: false, reason: 'Capture sanitizer failed: ' + String(error && error.message || error) }; }
        if (!capture) return { ok: false, reason: 'Capture sanitizer must return a JSON-serializable object.' };
      }
      capture.sourceToolId = contract.id;
      capture.sourceToolName = contract.name;
      capture.sourceToolVersion = contract.version;
      capture.integrationContract = clone(contract);
      capture.title = String(capture.title || contract.name + ' artifact').trim().slice(0, 180);
      capture.summary = String(capture.summary || '').trim().slice(0, 1200);
      if (!capture.summary) return { ok: false, reason: 'A bounded artifact summary is required.' };
      var receiptCheck = validateReceipt(capture.reproducibilityReceipt, contract);
      if (!receiptCheck.ok) return { ok: false, reason: receiptCheck.errors.join('; ') };
      return { ok: true, capture: capture };
    }

    function capture(payload) {
      var prepared = prepare(payload);
      if (!prepared.ok) return prepared;
      var hub = typeof options.resolveResearchHub === 'function' ? options.resolveResearchHub() : findResearchHub();
      if (!hub) return { ok: false, unavailable: true, reason: 'Research Hub is unavailable in this window. Download the prepared artifact instead.', preparedCapture: prepared.capture };
      try {
        if (contract.privacy && contract.privacy.sanitizerRequired === true && typeof hub.registerCaptureSanitizer === 'function') {
          hub.registerCaptureSanitizer(contract.id, contract.privacy.sanitizerId, options.sanitizeCapture);
        }
        var result = hub.captureArtifact(prepared.capture);
        return result && typeof result === 'object' ? result : { ok: !!result };
      } catch (error) {
        return { ok: false, reason: 'Research Hub capture failed: ' + String(error && error.message || error), preparedCapture: prepared.capture };
      }
    }

    function download(payload, filename) {
      var prepared = payload && payload.sourceToolId === contract.id ? { ok: true, capture: clone(payload) } : prepare(payload);
      if (!prepared.ok) return prepared;
      if (!root || !root.document || typeof root.Blob !== 'function' || !root.URL || typeof root.URL.createObjectURL !== 'function') return { ok: false, reason: 'Download is unavailable in this environment.', preparedCapture: prepared.capture };
      var blob = new root.Blob([JSON.stringify(prepared.capture, null, 2)], { type: 'application/json' });
      var url = root.URL.createObjectURL(blob);
      var anchor = root.document.createElement('a');
      anchor.href = url;
      anchor.download = filename || contract.id + '-artifact.json';
      anchor.style.display = 'none';
      root.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      root.setTimeout(function () { root.URL.revokeObjectURL(url); }, 0);
      return { ok: true, capture: prepared.capture };
    }

    return { contract: clone(contract), prepare: prepare, capture: capture, download: download };
  }

  return {
    version: SDK_VERSION,
    validateContract: validateContract,
    validateReceipt: validateReceipt,
    findResearchHub: findResearchHub,
    createAdapter: createAdapter
  };
});
