/*
 * AlloFlow Tool Integration SDK v1.0.0
 * Framework-neutral adapter helpers for sending bounded, learner-approved
 * artifacts from companion tools into the Research Hub.
 */
(function (root, factory) {
  var safeRoot = (root && (typeof root === 'object' || typeof root === 'function')) ? root : null;
  var api = factory(safeRoot);
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (safeRoot) safeRoot.AlloFlowToolIntegration = api;
})((typeof window !== 'undefined' && window && (typeof window === 'object' || typeof window === 'function')) ? window
  : ((typeof globalThis !== 'undefined' && globalThis && typeof globalThis === 'object') ? globalThis
    : ((typeof self !== 'undefined' && self && (typeof self === 'object' || typeof self === 'function')) ? self : null)), function (root) {
  'use strict';

  var SDK_VERSION = '1.0.0';
  var MAX_CAPTURE_CHARS = 2 * 1024 * 1024;
  var hasOwn = Object.prototype.hasOwnProperty;
  var METHOD_PACKS = Object.freeze(['scientific_investigation', 'engineering_design', 'humanistic_interpretation', 'community_qualitative', 'civic_policy', 'creative_cultural']);
  var RECEIPT_FIELDS = Object.freeze(['softwareVersion', 'sourceRecordId', 'parameters', 'randomSeed', 'limitations', 'datasetVersion', 'transformations']);

  function isPlainRecord(value) {
    return !!(value && typeof value === 'object' && !Array.isArray(value));
  }

  function safeStr(value) {
    if (value == null || typeof value === 'symbol' || typeof value === 'function') return '';
    try { return String(value); } catch (_) { return ''; }
  }

  function stripCtl(value) {
    return safeStr(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, '');
  }

  function formatErr(error) {
    var msg = (error && typeof error === 'object' && hasOwn.call(error, 'message') && typeof error.message === 'string') ? error.message : safeStr(error);
    return stripCtl(msg).trim().slice(0, 300) || 'Unknown error';
  }

  function parseTimestamp(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (value instanceof Date) {
      var ms = value.getTime();
      return Number.isFinite(ms) ? ms : NaN;
    }
    if (typeof value === 'string') {
      var trimmed = value.trim();
      if (!trimmed) return NaN;
      var parsed = Date.parse(trimmed);
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    return NaN;
  }

  function deepFreeze(value) {
    if (!value || (typeof value !== 'object' && typeof value !== 'function') || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach(function (k) { deepFreeze(value[k]); });
    return value;
  }

  function clone(value, maxChars) {
    try {
      var serialized = JSON.stringify(value);
      if (typeof serialized !== 'string') return null;
      if (maxChars && serialized.length > maxChars) return null;
      return JSON.parse(serialized, function (k, v) {
        return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
      });
    } catch (_) { return null; }
  }

  function safeFilename(raw, fallback) {
    var cleaned = (typeof raw === 'string' ? raw : '').replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '').slice(0, 120);
    return cleaned || fallback;
  }

  function nonEmpty(value) {
    if (value === undefined || value === null || typeof value === 'symbol' || typeof value === 'function') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return safeStr(value).trim() !== '';
  }

  function validateContract(contract, options) {
    var c = isPlainRecord(contract) ? contract : {};
    var opts = isPlainRecord(options) ? options : {};
    var errors = [];
    var warnings = [];
    var hasNow = hasOwn.call(opts, 'now') && opts.now !== undefined;
    var now = hasNow ? parseTimestamp(opts.now) : Date.now();
    if (hasNow && !isFinite(now)) errors.push('review clock is invalid');
    if (!hasOwn.call(c, 'schemaVersion') || c.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    if (!hasOwn.call(c, 'id') || typeof c.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{1,79}$/.test(c.id)) errors.push('id must be a stable lowercase identifier');
    ['name', 'version', 'reviewedAt', 'reviewAfter'].forEach(function (field) {
      if (!hasOwn.call(c, field) || !nonEmpty(c[field])) errors.push(field + ' is required');
    });
    var reviewedAt = hasOwn.call(c, 'reviewedAt') ? parseTimestamp(c.reviewedAt) : NaN;
    var reviewAfter = hasOwn.call(c, 'reviewAfter') ? parseTimestamp(c.reviewAfter) : NaN;
    if (!isFinite(reviewedAt) || !isFinite(reviewAfter) || reviewAfter <= reviewedAt) errors.push('review window is invalid');
    if (isFinite(reviewAfter) && isFinite(now) && reviewAfter < now) {
      if (opts.allowOverdue === true) warnings.push('integration review is overdue');
      else errors.push('integration review is overdue');
    }
    var lic = hasOwn.call(c, 'license') && isPlainRecord(c.license) ? c.license : null;
    var licVal = lic ? ((hasOwn.call(lic, 'spdx') && lic.spdx) || (hasOwn.call(lic, 'name') && lic.name)) : null;
    if (!lic || !nonEmpty(licVal)) errors.push('license metadata is required');
    var cit = hasOwn.call(c, 'citation') && isPlainRecord(c.citation) ? c.citation : null;
    if (!cit || !hasOwn.call(cit, 'text') || !nonEmpty(cit.text)) errors.push('citation guidance is required');
    var packs = hasOwn.call(c, 'supportedMethodPacks') ? c.supportedMethodPacks : null;
    if (!Array.isArray(packs) || !packs.length || packs.length > 16 || packs.some(function (pack) { return typeof pack !== 'string' || METHOD_PACKS.indexOf(pack) === -1; })) errors.push('supportedMethodPacks is invalid');
    var caps = hasOwn.call(c, 'capabilities') && isPlainRecord(c.capabilities) ? c.capabilities : null;
    if (!caps || !hasOwn.call(caps, 'captureArtifact') || caps.captureArtifact !== true) errors.push('captureArtifact capability must be true');
    var priv = hasOwn.call(c, 'privacy') && isPlainRecord(c.privacy) ? c.privacy : null;
    if (!priv || !hasOwn.call(priv, 'learnerApprovalRequired') || priv.learnerApprovalRequired !== true) errors.push('learner approval must be required');
    if (priv && hasOwn.call(priv, 'sanitizerRequired') && priv.sanitizerRequired === true && (!hasOwn.call(priv, 'sanitizerId') || !nonEmpty(priv.sanitizerId))) errors.push('sanitizerId is required when sanitizerRequired is true');
    var repro = hasOwn.call(c, 'reproducibility') && isPlainRecord(c.reproducibility) ? c.reproducibility : null;
    var required = repro && hasOwn.call(repro, 'requiredFields') ? repro.requiredFields : null;
    if (!Array.isArray(required) || required.length > 16 || required.indexOf('softwareVersion') === -1 || required.indexOf('limitations') === -1 || required.some(function (field) { return typeof field !== 'string' || RECEIPT_FIELDS.indexOf(field) === -1; })) errors.push('reproducibility.requiredFields is invalid');
    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  function validateReceipt(receipt, contract) {
    var errors = [];
    var required = contract && isPlainRecord(contract.reproducibility) && Array.isArray(contract.reproducibility.requiredFields) ? contract.reproducibility.requiredFields : [];
    if (!isPlainRecord(receipt)) return { ok: false, errors: ['reproducibilityReceipt is required'] };
    required.forEach(function (field) {
      if (typeof field !== 'string') return;
      if (!hasOwn.call(receipt, field) || !nonEmpty(receipt[field])) errors.push('reproducibilityReceipt.' + field + ' is required');
    });
    return { ok: errors.length === 0, errors: errors };
  }

  function findResearchHub() {
    var candidates = [];
    var pushUnique = function (cand) {
      if (cand && candidates.indexOf(cand) === -1) candidates.push(cand);
    };
    pushUnique(root);
    try { if (root && root.opener) pushUnique(root.opener); } catch (_) {}
    try { if (root && root.parent && root.parent !== root) pushUnique(root.parent); } catch (_) {}
    try { if (root && root.top && root.top !== root) pushUnique(root.top); } catch (_) {}
    var rootOrigin = '';
    try { rootOrigin = (root && root.location && typeof root.location.origin === 'string') ? root.location.origin : ''; } catch (_) {}
    for (var i = 0; i < candidates.length; i++) {
      try {
        var cand = candidates[i];
        if (cand !== root && rootOrigin && rootOrigin !== 'null') {
          var candOrigin = (cand && cand.location && typeof cand.location.origin === 'string') ? cand.location.origin : '';
          if (candOrigin && candOrigin !== rootOrigin) continue;
        }
        if (cand && cand.ResearchHub && typeof cand.ResearchHub.captureArtifact === 'function') return cand.ResearchHub;
      } catch (_) {}
    }
    return null;
  }

  function createAdapter(options) {
    options = isPlainRecord(options) ? options : {};
    var contract = clone(options.contract);
    var vOpts = {};
    if (isPlainRecord(options.validationOptions)) {
      Object.keys(options.validationOptions).forEach(function (k) {
        if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') vOpts[k] = options.validationOptions[k];
      });
    }
    if (vOpts.strictReviewWindow !== true && vOpts.allowOverdue === undefined) vOpts.allowOverdue = true;
    var contractCheck = validateContract(contract, vOpts);
    if (!contractCheck.ok) throw new Error('Invalid integration contract: ' + contractCheck.errors.join('; '));
    if (contractCheck.warnings && contractCheck.warnings.length && root && root.console && typeof root.console.warn === 'function') {
      root.console.warn('[AlloFlowToolIntegration] ' + contract.id + ': ' + contractCheck.warnings.join('; '));
    }
    if (typeof options.buildCapture !== 'function') throw new Error('buildCapture(payload) is required');
    if (contract.privacy && contract.privacy.sanitizerRequired === true && typeof options.sanitizeCapture !== 'function') throw new Error('sanitizeCapture(capture) is required by this contract');

    var preparedCaptures = typeof WeakMap === 'function' ? new WeakMap() : null;

    function finalizeCapture(rawCapture) {
      var capture = clone(rawCapture, MAX_CAPTURE_CHARS);
      if (!isPlainRecord(capture)) return { ok: false, reason: 'Capture builder must return a bounded JSON-serializable object.' };
      if (typeof options.sanitizeCapture === 'function') {
        try { capture = clone(options.sanitizeCapture(capture), MAX_CAPTURE_CHARS); } catch (error) { return { ok: false, reason: 'Capture sanitizer failed: ' + formatErr(error) }; }
        if (!isPlainRecord(capture)) return { ok: false, reason: 'Capture sanitizer must return a bounded JSON-serializable object.' };
      }
      capture.sourceToolId = contract.id;
      capture.sourceToolName = contract.name;
      capture.sourceToolVersion = contract.version;
      capture.integrationContract = clone(contract);
      capture.title = stripCtl(capture.title || contract.name + ' artifact').trim().slice(0, 180) || (contract.name + ' artifact');
      capture.summary = stripCtl(capture.summary || '').trim().slice(0, 1200);
      if (!capture.summary) return { ok: false, reason: 'A bounded artifact summary is required.' };
      var receiptCheck = validateReceipt(capture.reproducibilityReceipt, contract);
      if (!receiptCheck.ok) return { ok: false, reason: receiptCheck.errors.join('; ') };
      if (preparedCaptures) {
        try { preparedCaptures.set(capture, JSON.stringify(capture)); } catch (_) {}
      }
      return { ok: true, capture: capture };
    }

    function prepare(payload) {
      var built;
      try { built = options.buildCapture(clone(payload)); } catch (error) { return { ok: false, reason: 'Capture builder failed: ' + formatErr(error) }; }
      return finalizeCapture(built);
    }

    function capture(payload) {
      var prepared = prepare(payload);
      if (!prepared.ok) return prepared;
      var hub = null;
      try {
        hub = typeof options.resolveResearchHub === 'function' ? options.resolveResearchHub() : findResearchHub();
      } catch (error) {
        return { ok: false, reason: 'Research Hub lookup failed: ' + formatErr(error), preparedCapture: prepared.capture };
      }
      if (!hub || typeof hub.captureArtifact !== 'function') return { ok: false, unavailable: true, reason: 'Research Hub is unavailable in this window. Download the prepared artifact instead.', preparedCapture: prepared.capture };
      try {
        if (contract.privacy && contract.privacy.sanitizerRequired === true && typeof hub.registerCaptureSanitizer === 'function') {
          hub.registerCaptureSanitizer(contract.id, contract.privacy.sanitizerId, options.sanitizeCapture);
        }
        var result = hub.captureArtifact(prepared.capture);
        return result && typeof result === 'object' ? result : { ok: !!result };
      } catch (error) {
        return { ok: false, reason: 'Research Hub capture failed: ' + formatErr(error), preparedCapture: prepared.capture };
      }
    }

    function download(payload, filename) {
      var prepared;
      var unchangedPrepared = false;
      if (isPlainRecord(payload) && preparedCaptures && preparedCaptures.has(payload)) {
        try { unchangedPrepared = JSON.stringify(payload) === preparedCaptures.get(payload); } catch (_) { unchangedPrepared = false; }
      }
      if (unchangedPrepared) {
        prepared = { ok: true, capture: clone(payload, MAX_CAPTURE_CHARS) };
        if (!prepared.capture) return { ok: false, reason: 'Prepared artifact could not be serialized.' };
      } else if (isPlainRecord(payload) && payload.sourceToolId === contract.id) {
        prepared = finalizeCapture(payload);
      } else {
        prepared = prepare(payload);
      }
      if (!prepared.ok) return prepared;
      if (!root || !root.document || !root.document.body || typeof root.Blob !== 'function' || !root.URL || typeof root.URL.createObjectURL !== 'function') return { ok: false, reason: 'Download is unavailable in this environment.', preparedCapture: prepared.capture };
      var blob = new root.Blob([JSON.stringify(prepared.capture, null, 2)], { type: 'application/json' });
      var url = null;
      var anchor = null;
      try {
        url = root.URL.createObjectURL(blob);
        anchor = root.document.createElement('a');
        anchor.href = url;
        anchor.download = safeFilename(filename, contract.id + '-artifact.json');
        anchor.style.display = 'none';
        root.document.body.appendChild(anchor);
        anchor.click();
      } finally {
        if (anchor && anchor.parentNode) {
          if (typeof anchor.remove === 'function') anchor.remove();
          else anchor.parentNode.removeChild(anchor);
        }
        if (url) {
          if (typeof root.setTimeout === 'function') {
            root.setTimeout(function () { try { root.URL.revokeObjectURL(url); } catch (_) {} }, 1000);
          } else {
            try { root.URL.revokeObjectURL(url); } catch (_) {}
          }
        }
      }
      return { ok: true, capture: prepared.capture };
    }

    return Object.freeze({ contract: deepFreeze(clone(contract)), prepare: prepare, capture: capture, download: download });
  }

  return Object.freeze({
    version: SDK_VERSION,
    validateContract: validateContract,
    validateReceipt: validateReceipt,
    findResearchHub: findResearchHub,
    createAdapter: createAdapter
  });
});
