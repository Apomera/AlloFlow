'use strict';
// Calibration evaluates repository policy; it never converts validator counts into expert scores.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const { auditChecks, normalizePdfUaValidation, pdfDeliveryState } = require('../../desktop/mcp/remediation_verification.cjs');
const LAYERS = ['ai', 'axe', 'equalAccess', 'fidelity', 'export'];
const READINESS = ['ready', 'caution', 'review-required', 'unavailable'];
const STATUSES = ['passed', 'failed', 'review-required', 'partial', 'unavailable', 'not-applicable'];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
const finiteScore = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
let policy;
function loadPolicy() {
  if (policy) return policy;
  const evidence = fs.readFileSync(path.join(ROOT, 'accessibility_evidence_source.jsx'), 'utf8');
  const pipeline = fs.readFileSync(path.join(ROOT, 'doc_pipeline_source.jsx'), 'utf8').replace(/\r\n/g, '\n');
  function region(begin, end) {
    const a = pipeline.indexOf(begin), b = pipeline.indexOf(end, a + begin.length);
    if (a < 0 || b < 0) throw new Error('Current calibration policy anchor missing: ' + begin);
    return pipeline.slice(a, b);
  }
  const auditHelpers = ['_alloAiAuditHasFullCoverage', '_alloUsableCompleteAiAudit', '_alloUsableAxeAudit'].map(name => {
    const at = pipeline.indexOf('function ' + name + '(');
    const end = pipeline.indexOf('\n}\n', at);
    if (at < 0 || end < 0) throw new Error('Current calibration audit helper missing: ' + name);
    return pipeline.slice(at, end + 3);
  }).join('\n');
  const helpers = auditHelpers + region('var _alloComputeHeadline = function ', '// ── Scanned-OCR block-fallback layout:')
    + region('function _alloDistributionVerdict(', '\n// Sanitize an AI-parsed doc-style object');
  const context = vm.createContext({ window: { AlloModules: {} } });
  vm.runInContext(evidence + '\n' + helpers, context, { timeout: 15000, filename: 'calibration-current-policy.js' });
  policy = { evidence: context.window.AlloModules.AccessibilityEvidence,
    headline: context._alloComputeHeadline, distribution: context._alloDistributionVerdict,
    usableAi: context._alloUsableCompleteAiAudit, usableAxe: context._alloUsableAxeAudit,
    fingerprint: hash(evidence + helpers + fs.readFileSync(path.join(ROOT, 'desktop/mcp/remediation_verification.cjs'), 'utf8')) };
  return policy;
}
function evaluateObservation(entry) {
  const observed = entry && entry.observed;
  if (!object(observed) || !object(observed.verification) || !finiteScore(observed.targetScore)) {
    throw new Error('observed.verification and an explicit targetScore from 0 through 100 are required.');
  }
  if (!object(observed.pdf) || typeof observed.pdf.produced !== 'boolean') throw new Error('observed.pdf.produced must explicitly identify whether a PDF was emitted.');
  const p = loadPolicy();
  const verification = p.evidence.deriveVerificationState(observed.verification);
  const score = verification.scoreEvidence;
  const aiScore = p.usableAi(observed.verification.ai || observed.verification.verificationAudit) && finiteScore(score.ai) ? score.ai : null;
  const axeScore = p.usableAxe(observed.verification.axe || observed.verification.axeAudit) && finiteScore(score.axe) ? score.axe : null;
  const eaScore = finiteScore(score.equalAccess) ? score.equalAccess : null;
  const governingLayerScore = p.headline(aiScore, p.headline(axeScore, eaScore));
  const result = { ...(observed.result || {}),
    afterScore: finiteScore(observed.result && observed.result.afterScore) ? observed.result.afterScore : governingLayerScore,
    axeAudit: observed.verification.axe || observed.verification.axeAudit || null,
    secondEngineAudit: observed.verification.equalAccess || observed.verification.secondEngineAudit || null,
    verificationState: verification.verificationState,
    _aiVerificationIncomplete: observed.verification.aiIncomplete === true || observed.verification.aiVerificationIncomplete === true
      || (observed.result && observed.result._aiVerificationIncomplete === true),
  };
  const verdict = p.distribution(result, { targetScore: observed.targetScore, inProgress: observed.inProgress === true });
  const checks = auditChecks(observed.verification);
  const fidelityNotes = Array.isArray(result.fidelityNotes) ? result.fidelityNotes.filter(Boolean) : [];
  const fidelityConcern = result.fidelityLimited === true || result.expertReviewReason === 'content-fidelity'
    || result.expertReviewReason === 'both' || fidelityNotes.length > 0
    || (Number.isFinite(result.integrityCoverage) && result.integrityCoverage < 90);
  checks.fidelity = { status: fidelityConcern ? 'review-required'
    : Number.isFinite(result.integrityCoverage) ? 'passed' : 'unavailable',
    coverage: Number.isFinite(result.integrityCoverage) ? result.integrityCoverage : null,
    noteKinds: [...new Set(fidelityNotes.map(note => note.kind).filter(Boolean))] };
  const pdf = object(observed.pdf) ? observed.pdf : {};
  let normalizedPdf = null, pdfStatus = 'not-applicable';
  if (pdf.produced === true) {
    try { normalizedPdf = normalizePdfUaValidation(pdf.validation, entry.artifact, { allowLegacyUnbound: true }); }
    catch (_) { normalizedPdf = { status: 'unavailable', reason: 'invalid-or-unbound-validator-evidence' }; }
    pdfStatus = normalizedPdf.status === 'compliant' ? 'passed' : normalizedPdf.status === 'noncompliant' ? 'failed' : 'unavailable';
  }
  checks.export = { status: pdfStatus, evidence: normalizedPdf };
  const delivery = pdfDeliveryState({ hasPdf: pdf.produced === true, pdfStatus,
    verificationState: verification.verificationState, level: verdict.level, taggedPdfVerified: pdf.taggedPdfVerified === true });
  const readiness = verification.verificationState === 'unavailable' ? 'unavailable'
    : delivery.reviewRequired ? 'review-required' : verdict.level === 'caution' ? 'caution' : 'ready';
  return { readiness, governingLayerScore, reportedScore: result.afterScore,
    verificationState: verification.verificationState, verificationReasons: verification.reasons,
    distributionLevel: verdict.level, distributionReasons: [...verdict.review, ...verdict.cautions],
    delivery, layers: checks, scores: { ai: aiScore, axe: axeScore, equalAccess: eaScore },
    policyFingerprint: p.fingerprint };
}
function reviewProblems(entry) {
  const r = entry && entry.review;
  const problems = [];
  if (!r || r.status !== 'completed' || r.method !== 'human' || r.independent !== true) problems.push('independent human review is not declared complete');
  if (!r || typeof r.reviewer !== 'string' || !r.reviewer.trim()) problems.push('reviewer is required');
  if (!r || typeof r.reviewedAt !== 'string' || !Number.isFinite(Date.parse(r.reviewedAt))) problems.push('reviewedAt must be an ISO date/time');
  if (!r || typeof r.evidenceRef !== 'string' || !r.evidenceRef.trim()) problems.push('review evidence reference is required');
  if (!entry || !entry.artifact || !/^[a-f0-9]{64}$/i.test(entry.artifact.sha256 || '') || !r || String(r.artifactSha256).toLowerCase() !== entry.artifact.sha256.toLowerCase()) problems.push('review must identify the same artifact SHA-256');
  if (!r || !READINESS.includes(r.readiness)) problems.push('review readiness is required');
  if (!r || !object(r.layers) || !Object.keys(r.layers).length || Object.entries(r.layers).some(([key, value]) => !LAYERS.includes(key) || !STATUSES.includes(value))) problems.push('review layers must contain valid assessed layer outcomes');
  if (!r || !Array.isArray(r.findings) || r.findings.some(f => !object(f) || !f.id || !LAYERS.includes(f.layer) || typeof f.summary !== 'string' || typeof f.detectedByAutomation !== 'boolean')) problems.push('findings require id, layer, summary, and detectedByAutomation');
  return problems;
}
function classifyEvidence(entry) {
  if (entry && entry.evidenceKind === 'synthetic') return 'synthetic';
  if (entry && entry.evidenceKind === 'independent-human-review' && reviewProblems(entry).length === 0) return 'independently-reviewed';
  return 'unreviewed';
}
function summarizeCorpus(manifest) {
  if (!object(manifest) || !Array.isArray(manifest.entries)) throw new Error('Corpus must contain an entries array.');
  const coverage = { total: manifest.entries.length, synthetic: 0, independentlyReviewed: 0, unreviewed: 0, invalidObservations: 0 };
  const rows = [], humanRows = [];
  for (const entry of manifest.entries) {
    const evidenceClass = classifyEvidence(entry);
    coverage[evidenceClass === 'independently-reviewed' ? 'independentlyReviewed' : evidenceClass]++;
    let prediction = null, error = null;
    try { prediction = evaluateObservation(entry); } catch (e) { coverage.invalidObservations++; error = e.message; }
    const mismatches = [];
    if (evidenceClass === 'synthetic') {
      const expected = entry.expected;
      if (!object(expected) || !prediction) mismatches.push('expected outcome or prediction unavailable');
      else {
        for (const key of ['readiness', 'governingLayerScore']) if (prediction[key] !== expected[key]) mismatches.push(key);
        for (const layer of LAYERS) if (prediction.layers[layer].status !== expected.layerStatuses?.[layer]) mismatches.push('layers.' + layer);
      }
    }
    const row = { id: entry && entry.id || null, documentKind: entry && entry.documentKind || null, evidenceClass, prediction, error,
      expectationMismatches: mismatches,
      reviewProblems: evidenceClass === 'unreviewed' ? reviewProblems(entry) : [] };
    rows.push(row);
    if (evidenceClass === 'independently-reviewed' && prediction) humanRows.push({ entry, prediction });
  }
  let humanMetrics = null;
  if (humanRows.length) {
    const matrix = { correctlyDistributable: 0, falseReady: 0, unnecessaryReview: 0, correctlyRequiresReview: 0 };
    const layers = Object.fromEntries(LAYERS.map(layer => [layer, { reviewed: 0, outcomeDisagreements: 0, reviewedFindings: 0, missedFindings: 0 }]));
    for (const { entry, prediction } of humanRows) {
      const humanReady = ['ready', 'caution'].includes(entry.review.readiness);
      const predictedReady = ['ready', 'caution'].includes(prediction.readiness);
      matrix[humanReady ? (predictedReady ? 'correctlyDistributable' : 'unnecessaryReview') : (predictedReady ? 'falseReady' : 'correctlyRequiresReview')]++;
      for (const [layer, status] of Object.entries(entry.review.layers)) {
        layers[layer].reviewed++;
        if (prediction.layers[layer].status !== status) layers[layer].outcomeDisagreements++;
      }
      for (const finding of entry.review.findings) {
        layers[finding.layer].reviewedFindings++;
        if (!finding.detectedByAutomation) layers[finding.layer].missedFindings++;
      }
    }
    const predictedReady = matrix.correctlyDistributable + matrix.falseReady;
    humanMetrics = { reviewedDocuments: humanRows.length, matrix,
      falseReadyRateAmongDistributable: predictedReady ? matrix.falseReady / predictedReady : null, layers };
  }
  return { schemaVersion: 2, corpusStatus: !coverage.total ? 'empty'
    : !coverage.independentlyReviewed ? (coverage.synthetic === coverage.total ? 'synthetic-only' : 'unreviewed')
      : 'contains-declared-independent-reviews', coverage, syntheticMetrics: { evaluated: rows.filter(r => r.evidenceClass === 'synthetic').length,
      mismatched: rows.filter(r => r.evidenceClass === 'synthetic' && r.expectationMismatches.length).length }, humanMetrics, rows,
    limitations: ['Synthetic cases measure policy behavior, not remediation quality or human usability.',
      'Human review provenance is declared by the importer; reviewer identity and judgments are not authenticated.',
      'Missing layers and findings are not inferred to pass. Counts describe reviewed findings, not all possible issues.'] };
}
function createEntry(observation, review, artifactBytes, options = {}) {
  if (!object(observation)) throw new Error('Observation must be an object.');
  const entry = { id: options.id || observation.id, documentKind: observation.documentKind || 'unspecified',
    sourcePath: options.sourcePath || observation.sourcePath || null,
    evidenceKind: review ? 'independent-human-review' : 'unreviewed',
    artifact: { sha256: hash(artifactBytes), size: artifactBytes.length }, observed: observation.observed || observation };
  if (typeof entry.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,99}$/i.test(entry.id)) throw new Error('A stable id of up to 100 letters, digits, dots, hyphens, or underscores is required.');
  if (observation.evidenceKind === 'synthetic') throw new Error('Synthetic cases cannot be imported into the human observation corpus.');
  if (!observation.artifact || String(observation.artifact.sha256).toLowerCase() !== entry.artifact.sha256) throw new Error('Observation artifact SHA-256 must match the supplied artifact bytes.');
  if (review) {
    entry.review = review;
    const problems = reviewProblems(entry);
    if (problems.length) throw new Error(problems.join('; '));
  }
  evaluateObservation(entry);
  return entry;
}
module.exports = { LAYERS, hash, evaluateObservation, reviewProblems, classifyEvidence, summarizeCorpus, createEntry };
