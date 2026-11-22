
  // Wrap each function to bind fresh state before execution
  var _wrap = function(fn) { return function() { _bindState(); return fn.apply(this, arguments); }; };
  var _wrapAsync = function(fn) { return async function() { _bindState(); return fn.apply(this, arguments); }; };
  // Authoritative single-file re-entry guard. UI disabling is necessary feedback, but it cannot
  // protect programmatic callers or a rapid second event before React renders. A watchdog/new-file
  // invalidation changes the generation token, which deliberately releases a stale lock so recovery
  // remains possible. Managed batches and direct calls share this same serialized lock.
  var _activeSingleFixPromise = null;
  var _activeSingleFixGeneration = 0;
  var _activeRemediationManaged = false;
  var _activeSingleFixStarting = false;
  // Authoritative "is a single-file remediation live?" probe (2026-07-26, field report).
  // The host modal used to derive its busy state ONLY from pdfFixLoading — a React boolean
  // the pipeline writes exactly ONCE, at run entry (~L20813). When that single write was lost
  // or cleared by another surface, the audit-results panel rendered fully interactive over a
  // live run: the Fix & Verify button was armed, and pressing it produced nothing but the
  // duplicate-start toast below, because THIS lock (not the flag) is what actually gates a
  // second start. Two readers, one fact — so expose the fact.
  //
  // Managed batches report false on purpose: the batch runner owns its own progress UI and
  // must not disable the single-file controls.
  //
  // Generation invalidation releases the probe the same way _wrapFixAndVerify releases a stale
  // lock. Without that, an 8-min watchdog fire (which bumps __alloPdfRunGen but cannot settle
  // the hung promise) would pin the UI busy forever — trading one stuck state for a worse one.
  var _getActiveRemediationRun = function() {
    if (!_activeSingleFixPromise || _activeRemediationManaged) return null;
    var liveGeneration = (typeof window !== 'undefined') ? (window.__alloPdfRunGen || 0) : 0;
    if (!_activeSingleFixStarting && liveGeneration !== _activeSingleFixGeneration) return null;
    var slot = (typeof window !== 'undefined' && window.__alloActivePdfRemediation) || null;
    return {
      runId: slot ? slot.runId : null,
      // null until the run clears its digest await and publishes the live slot; callers that
      // scope by document must treat null as "not yet attributable", never as "another doc".
      documentEpoch: slot ? slot.documentEpoch : null,
      startedAt: slot ? slot.startedAt : null,
      generation: _activeSingleFixGeneration,
      starting: !!_activeSingleFixStarting,
      progress: _activeRemediationProgress || null,
    };
  };
  var _isRemediationRunning = function(documentEpoch) {
    var run = _getActiveRemediationRun();
    if (!run) return false;
    if (documentEpoch === undefined || documentEpoch === null) return true;
    return run.documentEpoch === null || run.documentEpoch === documentEpoch;
  };
  // ── H16 (audit 2026-07-26): a batch must hold the single-file lock too ─────────────────────
  // The batch runner resolves the closure-local `fixAndVerifyPdf` directly, so it never took
  // _activeSingleFixPromise — only the EXPORT is wrapped. A teacher could therefore start a
  // single-file "Fix & Verify" over a live batch (the button stays armed, correctly, because a
  // managed batch owns its own progress UI), and the two runs then shared mutable state:
  // _pipelineStats is a module-level global re-pointed at run entry and read at CALL time, so the
  // single-file run's API calls, retries and every _pipeLog/watchdog heartbeat got stamped with
  // the batch file's runId and documentEpoch — and the single-file watchdog drops heartbeats
  // whose runId does not match, so it can fire on a run that is demonstrably alive. Worse, the
  // second run overwrites window.__alloPdfAbortSignal and its finally aborts that controller, so
  // a batch file's in-flight Gemini calls can be cancelled by an unrelated run.
  //
  // The claim is MANAGED: _getActiveRemediationRun keeps returning null for it, so the probe and
  // the single-file controls behave exactly as before — the lock's only job here is to reject a
  // concurrent start. (The deeper fix, a per-run stats object instead of the shared global,
  // remains open; this closes the reachable path to it.)
  var _claimRemediationLockForBatch = function() {
    var liveGeneration = (typeof window !== 'undefined') ? (window.__alloPdfRunGen || 0) : 0;
    // Same stale-lock release _wrapFixAndVerify performs: a single-file run whose generation was
    // invalidated is not a live owner.
    if (_activeSingleFixPromise && !_activeRemediationManaged && !_activeSingleFixStarting && liveGeneration !== _activeSingleFixGeneration) {
      warnLog('[Batch] Releasing stale single-file run lock after generation invalidation.');
      _activeSingleFixPromise = null;
      _activeSingleFixGeneration = 0;
      _activeRemediationManaged = false;
      _activeSingleFixStarting = false;
    }
    if (_activeSingleFixPromise) return null;
    var token = { batch: true };
    _activeSingleFixPromise = token;
    _activeSingleFixGeneration = liveGeneration;
    _activeRemediationManaged = true;
    _activeSingleFixStarting = false;
    return token;
  };
  var _releaseRemediationLockForBatch = function(token) {
    if (token && _activeSingleFixPromise === token) {
      _activeSingleFixPromise = null;
      _activeSingleFixGeneration = 0;
      _activeRemediationManaged = false;
      _activeSingleFixStarting = false;
    }
  };
  var _wrapFixAndVerify = function(fn) { return function() {
    _bindState();
    var self = this;
    var args = arguments;
    var options = args[0] || null;
    var managedBatch = !!(options && (options.onProgress || options.batchMode === true));
    var liveGeneration = (typeof window !== 'undefined') ? (window.__alloPdfRunGen || 0) : 0;
    if (_activeSingleFixPromise && !_activeRemediationManaged && !_activeSingleFixStarting && liveGeneration !== _activeSingleFixGeneration) {
      warnLog('[fixAndVerifyPdf] Releasing stale single-file run lock after generation invalidation.');
      _activeSingleFixPromise = null;
      _activeSingleFixGeneration = 0;
      _activeRemediationManaged = false;
      _activeSingleFixStarting = false;
    }
    if (_activeSingleFixPromise) {
      var duplicateError = new Error('A remediation run is already in progress.');
      duplicateError.name = 'RemediationAlreadyRunningError';
      duplicateError.isAlreadyRunning = true;
      warnLog('[fixAndVerifyPdf] Concurrent remediation start ignored; the active run still owns the pipeline.');
      try { if (!managedBatch && addToast) addToast('Remediation is already running. The duplicate start was ignored.', 'info'); } catch (_) {}
      return Promise.reject(duplicateError);
    }
    // Pre-claim with a sentinel BEFORE invoking the async worker. An async function runs
    // synchronously until its first await; progress listeners can re-enter during that prefix.
    // _activeSingleFixStarting prevents the worker's own generation claim from looking stale
    // until fn.apply returns its Promise and we can snapshot the claimed generation.
    _activeSingleFixPromise = {};
    _activeSingleFixStarting = true;
    _activeRemediationManaged = managedBatch;
    var runPromise;
    try { runPromise = Promise.resolve(fn.apply(self, args)); }
    catch (error) { runPromise = Promise.reject(error); }
    _activeSingleFixGeneration = (typeof window !== 'undefined') ? (window.__alloPdfRunGen || 0) : 0;
    _activeSingleFixStarting = false;
    _activeSingleFixPromise = runPromise;
    return runPromise.finally(function() {
      if (_activeSingleFixPromise === runPromise) {
        _activeSingleFixPromise = null;
        _activeSingleFixGeneration = 0;
        _activeRemediationManaged = false;
        _activeSingleFixStarting = false;
      }
    });
  }; };
  return {
    // Read these instead of mirroring the host's pdfFixLoading flag — see _getActiveRemediationRun.
    isRemediationRunning: _isRemediationRunning,
    getActiveRemediationRun: _getActiveRemediationRun,
    logHostDiagnostic: _logHostDiagnostic,
    deriveVerificationState: _alloDeriveVerificationState,
    createVerificationHtmlBinding: _alloCreateVerificationHtmlBinding,
    verifyVerificationHtmlBinding: _alloVerifyVerificationHtmlBinding,
    isLiveVerificationHtmlBound: _alloIsLiveVerificationHtmlBound,
    applyVerificationHtmlBinding: _alloApplyVerificationHtmlBinding,
    enforceVerificationHtmlBinding: _alloEnforceVerificationHtmlBinding,
    rehydrateVerificationHtmlBinding: _alloRehydrateVerificationHtmlBinding,
    getPipelineStats: _getPipelineStats,
    getDiagnosticSnapshot: _getDiagnosticSnapshot,
    // Storm visibility + wait-not-stop (2026-07-05, maintainer): host follow-up loops (auto-continue)
    // gate each round on these instead of firing into an active Canvas rate-limit storm — the run
    // waits (bounded) and then proceeds at full strength; nothing is ever skipped or stopped.
    geminiThrottleInfo: _geminiThrottleInfo,
    getPdfAuditWait,
    stopPdfAccessibilityAudit,
    resetGeminiBreaker: _resetGeminiBreaker, // deep dive 2026-07-27: so a test can prove a storm signal is not inherited across runs
    waitForGeminiCalm: waitForGeminiCalm,
    geminiStormBudget: _geminiStormBudget,
    resetGeminiStormBudget: _resetGeminiStormBudget,
    clampPaletteContrast: clampPaletteContrast,
    buildPaletteCss: buildPaletteCss,
    applyPaletteToHtml: applyPaletteToHtml,
    proposePaletteFromIntent: proposePaletteFromIntent,
    proposeRestyles: proposeRestyles,
    palettePresets: PALETTE_PRESETS,
    checkReadingOrderPreserved: checkReadingOrderPreserved,
    collectTaggedTreeReferenceOrder: collectTaggedTreeReferenceOrder,
    readingOrderSequenceRatio: readingOrderSequenceRatio,
    // aiFixChunked is already exported below via _wrapAsync (state-binding) — Item C
    // mistakenly added a raw duplicate here (last-wins made it harmless, but esbuild
    // flagged the duplicate key). Kept the _wrapAsync export; removed the raw one.
    surgicalToolRegistry: SURGICAL_TOOL_REGISTRY,
    // Pure content-fidelity nets — exposed so the re-fix lanes (Fix Remaining) can run the SAME WARN-only
    // integrity sweep the main path runs (~17270/17290) over THIS run's output, instead of carrying the
    // prior run's fidelity state onto the panel/amber-asterisk. Pure functions, no state binding.
    computeStructuralFidelityNotes: _computeStructuralFidelityNotes,
    calmBudgetMs: _alloCalmBudgetMs, // H15 (2026-07-26): throttle waits clamped to the batch per-file wall
    numericFidelityLosses: _numericFidelityLosses,
    // C1: re-fix lanes MUST merge through this instead of assigning their fresh notes over the
    // whole array — durable extraction-time disclosures are not theirs to drop.
    mergeFidelityNotes: _mergeFidelityNotes,
    refixRecomputedFidelityKinds: _REFIX_RECOMPUTED_FIDELITY_KINDS,
    refixLaneRecomputedFidelityKinds: _REFIX_LANE_RECOMPUTED_FIDELITY_KINDS, // deep dive 2026-07-27: the view lane's SMALLER set — it has no placement scan
    sourceTableBaseline: () => { try { return (typeof window !== 'undefined' && window.__alloSourceTables) || null; } catch (_) { return null; } },
    _alloRuledTablesOnPage: _alloRuledTablesOnPage,
    _alloTaggedTablesOnPage: _alloTaggedTablesOnPage,
    _alloTextByMarkedId: _alloTextByMarkedId,
    _alloDataTableGrid: _alloDataTableGrid,
    _alloRebuildFlattenedTables: _alloRebuildFlattenedTables,
    sourceLinkCount: () => { try { const n = (typeof window !== 'undefined') ? window.__alloSourceLinkCount : null; return (Number.isFinite(n) && n > 0) ? n : null; } catch (_) { return null; } }, // M12 baseline, so every recompute lane reads it the same way
    htmlToPlainText: htmlToPlainText,
    restyleBlock: restyleBlock,
    listifyTableCellBullets: listifyTableCellBullets,
    precedingHeadingLevel: precedingHeadingLevel,
    headingOutlineIssue: _headingOutlineIssue,
    runPdfAccessibilityAudit: _wrapAsync(runPdfAccessibilityAudit),
    clearPdfDocumentCaches: _wrapAsync(clearPdfDocumentCaches), // user-facing: force-forget cached audit/remediation results (2026-08-10)
    auditOutputAccessibility: _wrapAsync(auditOutputAccessibility),
    runAxeAudit: _wrapAsync(runAxeAudit),
    runEqualAccessAudit: _wrapAsync(runEqualAccessAudit),
    equalAccessUnavailable: _equalAccessUnavailable,
    visionAltSpotCheck: _visionAltSpotCheck, // sampled alt-vs-image ground truth (fail-soft; 2026-07-13)
    describeAndClassifyImages: _wrapAsync(describeAndClassifyImages),
    executableActiveContentFindings: _alloExecutableActiveContentFindings,
    // (2026-11-08) For a tagged PDF built from a person-edited accessible version (pdf_finalize_edited_html), which has no
    // audit run to carry these: the Document Safety scan of the source PDF (same scan the audit makes), and the words the
    // source prints inside the HTML's described figures. Neither calls a model.
    scanSourceActiveContent: _wrapAsync(async (base64) => {
      await ensurePdfLibLoaded();
      const NS = (typeof window !== 'undefined' && window.PDFLib) || null;
      if (!NS || !NS.PDFDocument) return null;
      const doc = await NS.PDFDocument.load(_auditB64ToBytes(base64), { ignoreEncryption: true, updateMetadata: false });
      return _alloScanActiveContent(doc, NS);
    }),
    figureRegionText: _wrapAsync(async (base64, html) => {
      await ensurePdfJsLoaded();
      return window.pdfjsLib ? await _alloFigureRegionText(window.pdfjsLib, _b64ToBytes(base64), html, _withTimeout) : [];
    }),
    // (2026-11-09) The comments a person left on the original PDF (pdf_read_annotations): plain data, no model.
    readPdfAnnotations: _wrapAsync(async (base64) => {
      await ensurePdfJsLoaded();
      return window.pdfjsLib ? await _alloReadPdfAnnotations(window.pdfjsLib, _b64ToBytes(base64), _withTimeout) : null;
    }),
    // (2026-11-08) A person's corrections onto a scan's word boxes (pdf_finalize_edited_html), under the same guards that
    // put a second reading onto OCR boxes, so search and copy find the corrected spelling.
    alignReadingOntoOcrWords: (words, ocrText, text) => _alloAlignVisionOntoOcrWords(words, ocrText, text),
    taggedPdfDeliveryVerdict: _alloTaggedPdfDeliveryVerdict,
    _applyImageIntel,
    createTypesetTaggedPdf: _wrapAsync(createTypesetTaggedPdf),
    encodeTranscriptPayload,
    decodeTranscriptPayload,
    transcribeMediaToPayload: _wrapAsync(transcribeMediaToPayload),
    convertXlsxToMarkdownTables: _wrapAsync(convertXlsxToMarkdownTables),
    extractPdfTextDeterministic: _wrapAsync(extractPdfTextDeterministic),
    fixContrastViolations: _wrap(fixContrastViolations),
    fixAxeContrastViolationsTargeted: _wrap(fixAxeContrastViolationsTargeted),
    sanitizeStyleForWCAG: _wrap(sanitizeStyleForWCAG),
    sanitizeRemediationHtml: _alloSanitizeRemediationHtml,
    sanitizeRemediationProject: _alloSanitizeRemediationProject,
    autoFixAxeViolations: _wrapAsync(autoFixAxeViolations),
    aiFixChunked: _wrapAsync(aiFixChunked),
    translateAccessibleHtml: _wrapAsync(translateAccessibleHtml),
    simplifyAccessibleHtml: _wrapAsync(simplifyAccessibleHtml),
    detectFormBlanks: _wrap(detectFormBlanks),
    detectPdfBlankFields: _wrapAsync(detectPdfBlankFields),
    overlayPdfFormFields: _wrapAsync(overlayPdfFormFields),
    applyFormBlanks: _wrap(applyFormBlanks),
    refixChunk: _wrapAsync(refixChunk),
    getChunkState: _wrap(getChunkState),
    selectChunkVersion: _wrap(selectChunkVersion),
    retireChunkState: _wrap(retireChunkState),
    fixAndVerifyPdf: _wrapFixAndVerify(fixAndVerifyPdf),
    // Recompute the Resolved/Persisted/Newly-Introduced lists against a fresh audit after a follow-up
    // pass, so they reflect the CURRENT doc instead of going stale (recompute-on-incremental-commit).
    recomputeIssueResolution: _recomputeIssueResolution,
    // #6-incremental: recompute integrityCoverage/placement/numeric/structural against a mutated
    // html (auto-continue rounds change accessibleHtml after the primary pass measured fidelity).
    recomputeContentFidelity: _wrap(_recomputeContentFidelity),
    recomputableFidelityKinds: _RECOMPUTABLE_FIDELITY_KINDS, // which note kinds the recompute replaces; the host carries the rest forward
    // #6-full: THE canonical round-merge — every consumer (host auto-continue, headless/MCP
    // loops) assembles an accepted round's result through this one reducer.
    finalizeRemediationRound: _wrap(_finalizeRemediationRound),
    // R1: the one-line "Can I hand this out?" answer — pure fn over the result's honesty signals.
    distributionVerdict: _alloDistributionVerdict,
    taggedPdfReleaseGate: _alloTaggedPdfReleaseGate,
    remediationOutcome: _alloRemediationOutcome,
    generateAuditReportHtml: _wrap(generateAuditReportHtml),
    // Redaction infra (true removal + safety verify). Pure module-scope helpers; the UI flow
    // (select → confirm → redactDocument → block-if-not-clean) is wired separately. (redaction)
    redactDocument: _redactDocument,
    redactDocHtml: _redactDocHtml,
    redactionLeaks: _redactionLeaks,
    downloadAccessiblePdf: _wrap(downloadAccessiblePdf),
    createTaggedPdf: _wrapAsync(createTaggedPdf),
    // Office extractors exposed for the e2e media-preservation sentinel
    // (and any future caller needing deterministic Office text+media).
    extractDocxTextDeterministic: _wrapAsync(extractDocxTextDeterministic),
    extractPptxTextDeterministic: _wrapAsync(extractPptxTextDeterministic),
    getPdfPreviewHtml: _wrap(getPdfPreviewHtml),
    updatePdfPreview: _wrap(updatePdfPreview),
    applyWordRestoration: applyWordRestoration, // pure helper (no state binding needed)
    // AcroForm value extraction (DARK in slice 1 2026-06-07). DO NOT wire into
    // any audit/transform call site without first shipping the FERPA consent UI
    // flow + per-profile studentProjectSettings.allowFormValueExtraction toggle.
    // Default consent:false returns structured fields[] without values.
    extractPdfFormFieldsDeterministic: _wrapAsync(extractPdfFormFieldsDeterministic),
    applyWordRestorationInPlace: _wrap(applyWordRestorationInPlace),
    retargetMissingWordsViaGemini: _wrapAsync(retargetMissingWordsViaGemini),
    restoreSentencesDeterministic: restoreSentencesDeterministic, // pure DOM work
    detectAndHandleDuplicates: detectAndHandleDuplicates, // pure DOM work
    runAutonomousRemediation: _wrapAsync(runAutonomousRemediation), // Expert Workbench — autonomous agent loop
    processExpertCommand: _wrapAsync(processExpertCommand),        // Expert Workbench — command bar interpreter
    // Multi-session + Tier 2/2.5/3 — restored after 1ce8054 regression (see comment on
    // _MULTI_SESSION_EXPIRY_MS). UI at AlloFlowANTI.txt references all of these.
    multiSessionId: _multiSessionId,
    documentDigest: _wrapAsync(_documentDigest),
    loadMultiSession: function(sid, digest) { return loadMultiSession(sid, digest); },
    clearMultiSession: function(sid) { return clearMultiSession(sid); },
    mergeRangesToFullHtml: _wrap(mergeRangesToFullHtml),
    runTier2SurgicalFixes: _wrapAsync(runTier2SurgicalFixes),
    runTier2_5SectionScopedFixes: _wrapAsync(runTier2_5SectionScopedFixes),
    runTier3StructuralFix: _wrapAsync(runTier3StructuralFix),
    generateCustomExportStyle: _wrapAsync(generateCustomExportStyle),
    parseMarkdownToHTML: _wrap(parseMarkdownToHTML),
    generateResourceHTML: _wrap(generateResourceHTML),
    interactiveObjectProfileFor: _wrap(_alloInteractiveObjectProfileFor),
    interactiveObjectManifestItem: _wrap(_alloInteractiveObjectManifestItem),
    interactiveObjectProfileSummary: _wrap(_alloInteractiveObjectProfileSummary),
    INTERACTIVE_OBJECT_PROFILE_VERSION: ALLO_INTERACTIVE_OBJECT_PROFILE_VERSION,
    EXPORT_THEMES,
    STYLE_SEEDS,
    computeHeadline: _alloComputeHeadline, // single source of truth for the weakest-layer headline (the view reaches it via this instance prop)
    ocrBlockLayout: _alloOcrBlockLayout, // exposed for tests: the scanned-OCR block-fallback line distribution
    structuralFoundations: _alloStructuralFoundations, // the view's foundations scorecard calls this (single source for the regex set)
    fixStructuralFoundations: _alloFixStructuralFoundations, // individual + guarded batch foundation repairs (pure, evidence-gated)
    resolveReviewFindings, // (2026-09-13) model triage of review-tier findings under a structure-only gate; callers re-verify
    collectReviewFindings: _alloCollectReviewFindings,
    tableCellDrift: _alloTableCellDrift, // phase-2 cell-position gate (pure; blocking in acceptFixedHtmlDetailed)
    weightedDeductions: _alloWeightedDeductions, // #5: single source for the output-audit deduction (single-chunk + chunked-merge)
    contrastFixPair: _alloContrastFixPair, // deterministic which-colour-to-move contrast fixer (auto | preserve fg/bg/both)
    applyStyleSeedToHtml: _wrap(applyStyleSeedToHtml),
    generateFullPackHTML: _wrap(generateFullPackHTML),
    runPdfBatchRemediation: _wrapAsync(runPdfBatchRemediation),
    proceedWithPdfTransform: _wrapAsync(proceedWithPdfTransform),
    parseAuditJson: _wrap(parseAuditJson),
    remediateSurgicallyThenAI: _wrapAsync(remediateSurgicallyThenAI),
    downloadBatchResults: _wrapAsync(downloadBatchResults),
    // Tier 4: mid-batch resume — host inspects/clears persisted batch state
    loadResumableBatch: _loadActiveBatch,
    getBatchRecoveryState: () => _lastBatchRecoveryState,
    classifyBatchRetry: _batchRetryDecision,
    discardResumableBatch: _clearActiveBatch,
    // Tier A #2: Adobe-style accessibility report generator
    generateAccessibilityReportHtml: _wrap(generateAccessibilityReportHtml),
  };
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.createDocPipeline = createDocPipeline;
// Standalone local imports can avoid publishing another workspace’s source baseline.
window.AlloModules.createDocPipeline.supportsSourceTelemetryIsolation = true;
window.AlloModules.createDocPipeline.deriveVerificationState = _alloDeriveVerificationState;
window.AlloModules.createDocPipeline.createVerificationHtmlBinding = _alloCreateVerificationHtmlBinding;
window.AlloModules.createDocPipeline.verifyVerificationHtmlBinding = _alloVerifyVerificationHtmlBinding;
window.AlloModules.createDocPipeline.isLiveVerificationHtmlBound = _alloIsLiveVerificationHtmlBound;
window.AlloModules.createDocPipeline.applyVerificationHtmlBinding = _alloApplyVerificationHtmlBinding;
window.AlloModules.createDocPipeline.enforceVerificationHtmlBinding = _alloEnforceVerificationHtmlBinding;
window.AlloModules.createDocPipeline.rehydrateVerificationHtmlBinding = _alloRehydrateVerificationHtmlBinding;
window.AlloModules.createDocPipeline.sanitizeRemediationHtml = _alloSanitizeRemediationHtml;
window.AlloModules.createDocPipeline.sanitizeRemediationProject = _alloSanitizeRemediationProject;
window.AlloModules.createDocPipeline.interactiveObjectProfileFor = _alloInteractiveObjectProfileFor;
// Shared alt-text rules (the AltText service delegates here so the app and the
// remediation pipeline can never disagree about what a weak description is).
window.AlloModules.createDocPipeline.altQuality = _alloAltQuality;
window.AlloModules.createDocPipeline.scanAltQuality = _alloScanAltQuality;
window.AlloModules.createDocPipeline.interactiveObjectManifestItem = _alloInteractiveObjectManifestItem;
window.AlloModules.createDocPipeline.interactiveObjectProfileSummary = _alloInteractiveObjectProfileSummary;
window.AlloModules.createDocPipeline.INTERACTIVE_OBJECT_PROFILE_VERSION = ALLO_INTERACTIVE_OBJECT_PROFILE_VERSION;
window.AlloModules.createDocPipeline.computeHeadline = _alloComputeHeadline; // static: the AlloFlowANTI monolith delegates blendAiAxe here so its copy can never re-drift to a mean
window.AlloModules.createDocPipeline.ocrBlockLayout = _alloOcrBlockLayout; // static: exposed for tests (scanned-OCR block-fallback layout)
window.AlloModules.createDocPipeline.structuralFoundations = _alloStructuralFoundations; // static: exposed for tests
window.AlloModules.createDocPipeline.fixStructuralFoundations = _alloFixStructuralFoundations; // static: safe foundation action/batch helper
window.AlloModules.createDocPipeline.tableCellDrift = _alloTableCellDrift; // static: exposed for tests
window.AlloModules.createDocPipeline.weightedDeductions = _alloWeightedDeductions; // static: exposed for tests (#5)
window.AlloModules.createDocPipeline.contrastFixPair = _alloContrastFixPair; // static: exposed for tests (contrast pair-fixer)
window.AlloModules.createDocPipeline.salvageFixCandidate = _alloSalvageFixCandidate; // static: exposed for tests (partial fix acceptance)
window.AlloModules.createDocPipeline.rejectionFeedback = _alloRejectionFeedback; // static: exposed for tests (refused-edit feedback)
window.AlloModules.createDocPipeline.docFingerprint = _alloDocFingerprint; // static: H2 (2026-07-02) — the ANTI host stamps v2 resume projects with it so resume can refuse a different file wearing the same name
window.AlloModules.createDocPipeline.normTokenForDiff = _alloNormTokenForDiff; // static: S7 (2026-07-02) — the view's missing-word/restoration UI folds tokens with the SAME function the pipeline's residual count uses
window.AlloModules.createDocPipeline.loopPolicy = _alloLoopPolicy; // static: S3 (2026-07-02) — canonical fix-loop revert/keep-best/plateau policy, golden-tested
window.AlloModules.createDocPipeline.taggedPdfDeliveryVerdict = _alloTaggedPdfDeliveryVerdict;
window.AlloModules.createDocPipeline.altQuality = _alloAltQuality; // static: alt-text quality heuristics (2026-07-02), unit-tested
window.AlloModules.createDocPipeline.scanAltQuality = _alloScanAltQuality; // static: whole-document alt scan (DOMParser envs only)
window.AlloModules.createDocPipeline.scanNameQuality = _alloScanNameQuality; // static: placeholder-name scan (2026-10-16, DOMParser envs only)
window.AlloModules.createDocPipeline.mergeNameQualityIssues = _alloMergeNameQualityIssues; // static: name scan -> audit issues (2026-10-16)
window.AlloModules.createDocPipeline.scriptsForLang = _alloScriptsForLang; // static: language tag -> scripts, for fixLangSpans (2026-10-16)
window.AlloModules.createDocPipeline.langForScriptRun = _alloLangForScriptRun; // static: run label from its letters (2026-10-16)
window.AlloModules.createDocPipeline.restoreEscapedLangSpans = _alloRestoreEscapedLangSpans; // static: AI-escaped lang spans back to markup (2026-10-17)
window.AlloModules.createDocPipeline.STYLESHEET_REVIEW_RULES = _ALLO_STYLESHEET_REVIEW_RULES; // static: EA prompts raised on any stylesheet (2026-10-16)
window.AlloModules.createDocPipeline.highContrastCssCheck = _alloHighContrastCssCheck; // static: deterministic answer to style_highcontrast_visible
window.AlloModules.createDocPipeline.applyStylesheetReview = _alloApplyStylesheetReview; // static: move answered/confirmed stylesheet prompts out of review
window.AlloModules.createDocPipeline.confirmStylesheetReview = _alloConfirmStylesheetReview; // static: a person's sign-off for ONE exact document
window.AlloModules.createDocPipeline.registerStylesheetSignoffs = _alloRegisterStylesheetSignoffs; // static: restore saved sign-offs after a reload
window.AlloModules.createDocPipeline.helpDirectory = ALLO_HELP_DIRECTORY; // static: neutral "where to get expert help" directory (2026-10-16)
window.AlloModules.createDocPipeline.helpDirectorySorted = _alloHelpDirectorySorted; // static: name order within a group (no ranking)
window.AlloModules.createDocPipeline.helpDirectoryHtml = _alloHelpDirectoryHtml; // static: English block for exported reports
window.AlloModules.createDocPipeline.scanActiveContent = _alloScanActiveContent; // static: A1 Document Safety walk (needs a pdf-lib doc — exercised by the Playwright corpus)
window.AlloModules.createDocPipeline.latexToSpeakable = _alloLatexToSpeakable; // static: LaTeX→spoken English (2026-07-02, Item E), unit-tested
window.AlloModules.createDocPipeline.detectRtlText = _alloDetectRtlText; // static: G1 (2026-09-28) RTL review notice, unit-tested
window.AlloModules.createDocPipeline.rtlReviewNotice = _alloRtlReviewNotice;
window.AlloModules.createDocPipeline.outputProvenanceFooterHtml = _alloOutputProvenanceFooterHtml; // static: G1 honest output footer, unit-tested
window.AlloModules.createDocPipeline.orderTextItems = _alloOrderTextItems; // static: H12 (2026-07-26) — column + RTL reading-order repair; pure, so the direction fix is unit-testable without pdf.js
window.AlloModules.createDocPipeline.resolveExtractionPageCount = _alloResolveExtractionPageCount; // static: M13 (2026-07-26) — guessed-page-count precedence + cap for the Vision fan-out
window.AlloModules.createDocPipeline.selectCompletionToast = _alloSelectCompletionToast; // static: H3 (2026-07-26) — the completion-toast ladder, testable against the real decision
window.AlloModules.createDocPipeline.logSafeFidelityMsg = _alloLogSafeFidelityMsg;
window.AlloModules.createDocPipeline.waitForVisibleTab = _alloWaitForVisibleTab; // static: background-tab guard for canvas work (field log 2026-07-27) // static: FERPA redactor for the copyable diagnostics log (deep dive 2026-07-27) — every lane must use the SAME one
window.AlloModules.createDocPipeline.cleanScannedOcrText = _cleanScannedOcrText; // static: P2-a folio-strip + hyphen-rejoin (2026-07-03), unit-tested
window.AlloModules.createDocPipeline.stripRestoreMarkdown = _stripRestoreMarkdown; // static: P2-b restore markdown-strip (2026-07-03), unit-tested
window.AlloModules.createDocPipeline.stripPageEdgeArtifacts = _stripPageEdgeArtifacts; // static: #F page-edge running-head/folio strip (2026-07-05), unit-tested
window.AlloModules.createDocPipeline.collapseAdjacentDupes = _collapseAdjacentDupes; // static: #G cross-engine line-wrap echo collapse (2026-07-05), unit-tested
window.AlloModules.createDocPipeline.cellRichText = _alloCellRichText; // static: #G in-cell list markup net (2026-07-05), unit-tested
window.AlloModules.createDocPipeline.routeViolationsToChunks = _routeViolationsToChunks; // static: $4 violation→chunk router (2026-07-02), unit-tested
window.AlloModules.createDocPipeline.applyToAxeTargetDoc = _applyToAxeTargetDoc; // static: P5 shared-doc applier (2026-07-02), unit-tested
window.AlloModules.createDocPipeline.applyToAxeTarget = _applyToAxeTarget; // static: string-path applier (P5 equivalence tests)
window.AlloModules.createDocPipeline.serializeDomEdit = _serializeDomEdit; // static: shape-matched serializer (P5 head-hoist pin)
window.AlloModules.createDocPipeline.relatedClozeGlossary = _alloRelatedClozeGlossary;
window.AlloModules.createDocPipeline.RUN_CONTEXT_KEYS = ALLO_RUN_CONTEXT_KEYS;
window.AlloModules.createDocPipeline.createRemediationRunContext = _alloCreateRemediationRunContext;
window.AlloModules.createDocPipeline.resetRemediationRunContext = _alloResetRemediationRunContext;
window.AlloModules.createDocPipeline.snapshotRemediationRunContext = _alloSnapshotRemediationRunContext;
window.AlloModules.DocPipelineModule = true;
console.log('[DocPipelineModule] Pipeline factory registered');
