(function(){"use strict";
if(window.AlloModules&&window.AlloModules.ReviewDocumentSessionModule){console.log("[CDN] ReviewDocumentSessionModule already loaded, skipping"); return;}
// review_document_session_source.jsx - immutable state and evidence-coherence
// primitives shared by Document Builder's Author and Advanced Review workspaces.

var _alloReviewSessionCounter = 0;
var _alloReviewSessionKind = 'review-document-session';
var _alloReviewTransactionKind = 'review-document-transaction';
var _alloReviewInvalidationReason = 'content-modified-pending-reverification';
var _alloReviewWorkspaceModes = Object.freeze(['author', 'advanced-review']);
var _alloReviewMaxLedger = 500;
var _alloReviewMaxCommands = 100;
var _alloReviewMaxJsonChars = 10 * 1024 * 1024;

function _alloReviewOwn(value, key) {
  return !!value && Object.prototype.hasOwnProperty.call(value, key);
}

function _alloReviewStripCtl(value) {
  return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function _alloReviewSafeAssign(target) {
  var out = target || {};
  for (var i = 1; i < arguments.length; i++) {
    var src = arguments[i];
    if (!src || typeof src !== 'object') continue;
    var keys = Object.keys(src);
    for (var j = 0; j < keys.length; j++) {
      var k = keys[j];
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = src[k];
    }
  }
  return out;
}

function _alloReviewNow(value) {
  if (typeof value === 'string' && value.trim()) return _alloReviewStripCtl(value).trim().slice(0, 80);
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  return new Date().toISOString();
}

function _alloReviewId(prefix, explicit) {
  if (typeof explicit === 'string' && explicit.trim()) return _alloReviewStripCtl(explicit).trim().slice(0, 120);
  _alloReviewSessionCounter += 1;
  return _alloReviewStripCtl(prefix || 'review').slice(0, 40) + '-' + Date.now().toString(36) + '-' + _alloReviewSessionCounter.toString(36);
}

function _alloReviewMode(value, fallback) {
  var mode = String(value || '').trim().toLowerCase();
  if (_alloReviewWorkspaceModes.indexOf(mode) !== -1) return mode;
  return _alloReviewWorkspaceModes.indexOf(fallback) !== -1 ? fallback : 'author';
}

function _alloReviewFreezeRecord(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  return Object.freeze(value);
}

function _alloReviewFreezeList(values) {
  return Object.freeze((Array.isArray(values) ? values : []).map(function (value) {
    return value && typeof value === 'object' ? _alloReviewFreezeRecord(_alloReviewSafeAssign({}, value)) : value;
  }));
}

function _alloReviewReason(value) {
  var reason = typeof value === 'string' ? _alloReviewStripCtl(value).trim().slice(0, 240) : '';
  return reason || _alloReviewInvalidationReason;
}

function _alloReviewAppendReason(values, reason) {
  var result = [];
  (Array.isArray(values) ? values.slice(0, 50) : []).forEach(function (value) {
    var normalized = typeof value === 'string' ? _alloReviewStripCtl(value).trim().slice(0, 240) : '';
    if (normalized && result.indexOf(normalized) === -1) result.push(normalized);
  });
  if (result.indexOf(reason) === -1) result.push(reason);
  return Object.freeze(result);
}

function _alloReviewCoverage() {
  return Object.freeze({
    standard: 'WCAG 2.2 AA',
    ai: 'unavailable',
    axe: 'unavailable',
    equalAccess: 'unavailable',
    pdfUaSelfCheck: 'not-run',
  });
}

function _alloReviewIsSession(value) {
  return !!value && typeof value === 'object'
    && value.kind === _alloReviewSessionKind
    && value.document && typeof value.document === 'object';
}

function _alloReviewIsTransaction(value) {
  return !!value && typeof value === 'object'
    && value.kind === _alloReviewTransactionKind
    && Number.isFinite(value.baseRevision);
}

// A verification result is an exact-artifact claim. Preserve the artifact and
// unrelated caller metadata, but remove every reusable proof/score binding when
// its content changes. Object.assign intentionally excludes non-enumerable
// runtime proof slots; the explicit deletes cover enumerable legacy variants.
function _alloReviewInvalidateRemediation(value, reason) {
  if (!value || typeof value !== 'object') return value;
  var next = _alloReviewSafeAssign({}, value);
  var coverage = _alloReviewCoverage();
  var reasons = _alloReviewAppendReason(value.verificationReasons, reason);

  next.verificationHtmlBinding = null;
  next.verificationAudit = null;
  next.axeAudit = null;
  next.axeViolations = null;
  next.secondEngineAudit = null;
  next.afterScore = null;
  next.afterScoreVerified = false;
  next._scoreIsBlended = false;
  next._aiVerificationIncomplete = true;
  next._estimatedMinimumScore = null;
  next._estimatedScoreBasis = null;
  next._finalAuditRetryAvailable = true;
  next._scoreSource = 'unavailable';
  next.verificationCoverage = coverage;
  if (_alloReviewOwn(value, 'coverage')) next.coverage = coverage;
  next.verificationState = 'unavailable';
  next.executionState = 'unavailable';
  next.outcomeState = 'unknown';
  next.verificationScope = value.verificationScope || 'full-output';
  next.testedScopeComplete = false;
  next.engineExecutionComplete = false;
  next.fullyVerifiedSuccess = false;
  next.success = false;
  next.knownFindingCount = null;
  next.knownFindings = null;
  next.scoreEvidence = null;
  next.verificationReasons = reasons;
  if (_alloReviewOwn(value, 'reasons')) next.reasons = reasons;
  next.verificationReviewCount = 0;
  if (_alloReviewOwn(value, 'reviewCount')) next.reviewCount = 0;
  next.requiresManualReview = true;
  next.issueResolution = null;
  next.remainingIssues = null;

  // Optional evidence/provenance aliases have existed in portable and desktop
  // builds. Keep their keys when enumerable (shape preservation), but make them
  // unusable as current-artifact proof.
  [
    'verificationEvidence', 'evidenceProvenance', 'verificationProvenance',
    'evidenceManifest', 'evidenceManifestDigest', 'evidenceManifestId',
    'evidenceDigest', 'evidenceId', 'artifactBinding', 'provenance',
    'auditProvenance', 'scoreProvenance', 'verificationRunId', 'verifiedAt',
    'lastVerifiedAt', 'verificationHtmlDigest', 'verificationArtifactHash',
    'verificationFingerprint',
  ].forEach(function (key) {
    if (_alloReviewOwn(value, key)) next[key] = null;
  });

  [
    '_verificationHtmlSnapshot', '_verificationHtmlBindingDigest',
    '_verificationArtifactHash', '_verificationProof', '_verificationProvenance',
  ].forEach(function (key) { delete next[key]; });

  return Object.freeze(next);
}

function _alloReviewLedgerEntry(entry, defaults) {
  var source = entry && typeof entry === 'object' ? entry : {};
  var fallback = defaults || {};
  return Object.freeze(_alloReviewSafeAssign({}, source, {
    id: _alloReviewId('entry', source.id || fallback.id),
    type: _alloReviewStripCtl(source.type || fallback.type || 'note').slice(0, 80),
    at: _alloReviewNow(source.at || fallback.at),
    revision: Number.isFinite(source.revision) ? source.revision : (Number.isFinite(fallback.revision) ? fallback.revision : 0),
    transactionId: source.transactionId || fallback.transactionId || null,
  }));
}

function _alloReviewCreateSession(input) {
  var source = input && typeof input === 'object' ? input : {};
  var sourceDocument = source.document && typeof source.document === 'object' ? source.document : {};
  var remediationResult = sourceDocument.remediationResult || source.remediationResult || null;
  var remediationHtml = remediationResult && typeof remediationResult.accessibleHtml === 'string'
    ? remediationResult.accessibleHtml
    : '';
  var currentHtml = typeof source.currentHtml === 'string'
    ? source.currentHtml
    : (typeof sourceDocument.currentHtml === 'string' ? sourceDocument.currentHtml : remediationHtml);
  var baselineHtml = typeof source.baselineHtml === 'string'
    ? source.baselineHtml
    : (typeof sourceDocument.baselineHtml === 'string' ? sourceDocument.baselineHtml : currentHtml);
  var createdAt = _alloReviewNow(source.createdAt);
  var updatedAt = _alloReviewNow(source.updatedAt || createdAt);
  var revision = Number.isFinite(source.revision) ? Math.max(0, Math.floor(source.revision)) : 0;
  var ledger = Array.isArray(source.ledger)
    ? source.ledger.slice(-_alloReviewMaxLedger).map(function (entry) { return _alloReviewLedgerEntry(entry, { revision: revision }); })
    : [];
  var evidenceSource = source.evidence && typeof source.evidence === 'object' ? source.evidence : {};
  var workflowSource = source.workflow && typeof source.workflow === 'object' ? source.workflow : {};
  var hasCurrentEvidence = !!(remediationResult && remediationResult.verificationHtmlBinding)
    && remediationResult.verificationState !== 'unavailable';
  var documentValue = Object.freeze(_alloReviewSafeAssign({}, sourceDocument, {
    id: sourceDocument.id || source.documentId || null,
    baselineHtml: baselineHtml,
    currentHtml: currentHtml,
    remediationResult: remediationResult ? Object.freeze(_alloReviewSafeAssign({}, remediationResult)) : null,
  }));
  var evidenceValue = Object.freeze(_alloReviewSafeAssign({}, evidenceSource, {
    state: evidenceSource.state || (hasCurrentEvidence ? 'current' : 'unavailable'),
    stale: evidenceSource.stale === true,
    reason: evidenceSource.reason || null,
  }));
  var workflowValue = Object.freeze(_alloReviewSafeAssign({}, workflowSource, {
    state: workflowSource.state || 'ready',
    dirty: workflowSource.dirty === true,
    needsReview: workflowSource.needsReview === true,
  }));
  return Object.freeze(_alloReviewSafeAssign({}, source, {
    kind: _alloReviewSessionKind,
    schemaVersion: 1,
    id: _alloReviewId('session', source.id),
    workspaceMode: _alloReviewMode(source.workspaceMode, 'author'),
    revision: revision,
    document: documentValue,
    evidence: evidenceValue,
    workflow: workflowValue,
    ledger: Object.freeze(ledger),
    createdAt: createdAt,
    updatedAt: updatedAt,
  }));
}

function _alloReviewHydrateSession(value, options) {
  var source = value;
  if (typeof source === 'string') {
    if (source.length > _alloReviewMaxJsonChars) source = {};
    else {
      try {
        source = JSON.parse(source, function (k, v) {
          return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
        });
      } catch (_) { source = {}; }
    }
  }
  if (_alloReviewIsSession(source) && (!options || !Object.keys(options).length)) return source;
  if (_alloReviewIsSession(source)) return _alloReviewCreateSession(_alloReviewSafeAssign({}, source, options || {}));
  return _alloReviewCreateSession(_alloReviewSafeAssign({}, options || {}, { remediationResult: source || null }));
}

function _alloReviewInvalidateSession(session, reason, options) {
  var current = _alloReviewHydrateSession(session);
  var metadata = options && typeof options === 'object' ? options : {};
  var revision = current.revision + 1;
  var at = _alloReviewNow(metadata.at);
  var transactionId = metadata.transactionId || _alloReviewId('transaction');
  var invalidated = current.document.remediationResult
    ? _alloReviewInvalidateRemediation(current.document.remediationResult, reason)
    : null;
  var documentValue = Object.freeze(_alloReviewSafeAssign({}, current.document, {
    remediationResult: invalidated,
  }));
  var evidenceValue = Object.freeze(_alloReviewSafeAssign({}, current.evidence, {
    state: 'stale',
    stale: true,
    reason: reason,
    invalidatedAt: at,
  }));
  var workflowValue = Object.freeze(_alloReviewSafeAssign({}, current.workflow, {
    state: 'needs-review',
    dirty: true,
    needsReview: true,
  }));
  var extraEntries = Array.isArray(metadata.entries) ? metadata.entries.slice(0, _alloReviewMaxCommands) : [];
  var ledger = current.ledger.concat(extraEntries.map(function (entry) {
    return _alloReviewLedgerEntry(entry, { revision: revision, at: at, transactionId: transactionId });
  }));
  ledger.push(_alloReviewLedgerEntry({
    type: 'evidence.invalidate',
    reason: reason,
    summary: _alloReviewStripCtl(metadata.summary || 'Content changed; prior verification evidence is no longer bound to the current artifact.').slice(0, 600),
  }, { revision: revision, at: at, transactionId: transactionId }));
  if (ledger.length > _alloReviewMaxLedger) ledger = ledger.slice(-_alloReviewMaxLedger);

  return Object.freeze(_alloReviewSafeAssign({}, current, {
    revision: revision,
    document: documentValue,
    evidence: evidenceValue,
    workflow: workflowValue,
    ledger: Object.freeze(ledger),
    updatedAt: at,
  }));
}

function _alloReviewInvalidateVerification(value, reason, options) {
  var normalizedReason = _alloReviewReason(reason);
  if (_alloReviewIsSession(value)) return _alloReviewInvalidateSession(value, normalizedReason, options);
  return _alloReviewInvalidateRemediation(value, normalizedReason);
}

function _alloReviewSetWorkspaceMode(session, workspaceMode, options) {
  var current = _alloReviewHydrateSession(session);
  var nextMode = _alloReviewMode(workspaceMode, current.workspaceMode);
  if (nextMode === current.workspaceMode) return current;
  var metadata = options && typeof options === 'object' ? options : {};
  var revision = current.revision + 1;
  var at = _alloReviewNow(metadata.at);
  var entry = _alloReviewLedgerEntry({
    type: 'workspace.mode',
    from: current.workspaceMode,
    to: nextMode,
    summary: 'Switched workspace from ' + current.workspaceMode + ' to ' + nextMode + '.',
  }, { revision: revision, at: at, transactionId: metadata.transactionId });
  var nextLedger = current.ledger.concat([entry]);
  if (nextLedger.length > _alloReviewMaxLedger) nextLedger = nextLedger.slice(-_alloReviewMaxLedger);
  return Object.freeze(_alloReviewSafeAssign({}, current, {
    workspaceMode: nextMode,
    revision: revision,
    ledger: Object.freeze(nextLedger),
    updatedAt: at,
  }));
}

function _alloReviewBeginTransaction(session, options) {
  var current = _alloReviewHydrateSession(session);
  var metadata = options && typeof options === 'object' ? options : {};
  return Object.freeze({
    kind: _alloReviewTransactionKind,
    id: _alloReviewId('transaction', metadata.id),
    sessionId: current.id,
    baseRevision: current.revision,
    label: _alloReviewStripCtl(metadata.label || 'Review edit').slice(0, 240),
    commands: Object.freeze([]),
    metadata: Object.freeze(_alloReviewSafeAssign({}, metadata.metadata || {})),
    createdAt: _alloReviewNow(metadata.at),
  });
}

function _alloReviewAddCommand(transaction, command) {
  if (!_alloReviewIsTransaction(transaction)) throw new TypeError('A ReviewDocumentSession transaction is required.');
  if (!command || typeof command !== 'object' || !String(command.type || '').trim()) {
    throw new TypeError('A typed review command is required.');
  }
  if (transaction.commands.length >= _alloReviewMaxCommands) {
    throw new RangeError('review-transaction-command-limit');
  }
  var typed = Object.freeze(_alloReviewSafeAssign({}, command, { type: _alloReviewStripCtl(command.type).trim().slice(0, 80) }));
  return Object.freeze(_alloReviewSafeAssign({}, transaction, {
    commands: Object.freeze(transaction.commands.concat([typed])),
  }));
}

function _alloReviewCommitTransaction(session, transaction, output) {
  var current = _alloReviewHydrateSession(session);
  if (!_alloReviewIsTransaction(transaction)) throw new TypeError('A ReviewDocumentSession transaction is required.');
  if (transaction.sessionId !== current.id || transaction.baseRevision !== current.revision) {
    throw new Error('stale-review-transaction');
  }
  var result = output && typeof output === 'object' ? output : {};
  if (result.ok === false) return current;
  var nextHtml = typeof result.html === 'string' ? result.html : current.document.currentHtml;
  var changed = result.changed === true || nextHtml !== current.document.currentHtml;
  if (!changed) return current;
  var at = _alloReviewNow(result.at);
  var remediationResult = current.document.remediationResult
    ? _alloReviewSafeAssign({}, current.document.remediationResult, { accessibleHtml: nextHtml, htmlChars: nextHtml.length })
    : null;
  var staged = Object.freeze(_alloReviewSafeAssign({}, current, {
    document: Object.freeze(_alloReviewSafeAssign({}, current.document, {
      currentHtml: nextHtml,
      remediationResult: remediationResult,
    })),
  }));
  var commandEntries = transaction.commands.map(function (command, index) {
    return {
      type: 'command.' + command.type,
      command: command,
      commandIndex: index,
      summary: result.summary || transaction.label,
    };
  });
  if (!commandEntries.length) {
    commandEntries.push({ type: 'document.edit', summary: result.summary || transaction.label });
  }
  return _alloReviewInvalidateSession(staged, _alloReviewReason(result.reason), {
    at: at,
    transactionId: transaction.id,
    entries: commandEntries,
  });
}

function _alloReviewApplyCommand(session, command, output) {
  var transaction = _alloReviewAddCommand(
    _alloReviewBeginTransaction(session, { label: command && (command.summary || command.type) }),
    command,
  );
  return _alloReviewCommitTransaction(session, transaction, output);
}

function _alloReviewSummarize(value) {
  var session = _alloReviewIsSession(value) ? value : _alloReviewHydrateSession(value);
  var result = session.document.remediationResult || {};
  return Object.freeze({
    id: session.id,
    workspaceMode: session.workspaceMode,
    revision: session.revision,
    evidenceState: session.evidence.state,
    workflowState: session.workflow.state,
    dirty: session.workflow.dirty === true,
    needsReview: session.workflow.needsReview === true,
    ledgerCount: session.ledger.length,
    currentHtmlChars: String(session.document.currentHtml || '').length,
    baselineHtmlChars: String(session.document.baselineHtml || '').length,
    verificationState: result.verificationState || 'unavailable',
    reason: session.evidence.reason || null,
  });
}

window.AlloModules = window.AlloModules || {};
window.AlloModules.ReviewDocumentSession = Object.freeze({
  SESSION_KIND: _alloReviewSessionKind,
  TRANSACTION_KIND: _alloReviewTransactionKind,
  SCHEMA_VERSION: 1,
  WORKSPACE_MODES: _alloReviewWorkspaceModes,
  EVIDENCE_INVALIDATION_REASON: _alloReviewInvalidationReason,
  isSession: _alloReviewIsSession,
  isTransaction: _alloReviewIsTransaction,
  createSession: _alloReviewCreateSession,
  hydrateSession: _alloReviewHydrateSession,
  setWorkspaceMode: _alloReviewSetWorkspaceMode,
  beginTransaction: _alloReviewBeginTransaction,
  addCommand: _alloReviewAddCommand,
  commitTransaction: _alloReviewCommitTransaction,
  applyCommand: _alloReviewApplyCommand,
  invalidateVerification: _alloReviewInvalidateVerification,
  summarize: _alloReviewSummarize,
});
window.AlloModules.ReviewDocumentSessionModule = true;
})();
