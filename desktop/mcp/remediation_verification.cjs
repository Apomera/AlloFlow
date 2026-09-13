'use strict';
const PDF_UA_UNAVAILABLE_REASONS = ['validator_not_available', 'validator_timeout', 'validator_error', 'attempt_finalization_reserve', 'validator_evidence_unbound'];
const PDF_UA_NOT_RUN_REASONS = ['disabled_for_institution_pilot', 'independent_validator_not_packaged'];
function invalidPdfEvidence() { throw new Error('Incomplete or contradictory PDF/UA validation evidence.'); }
function pdfCount(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1000000) invalidPdfEvidence();
  return value;
}
function pdfCounts(value, compliant) {
  const counts = Object.fromEntries(['failedRules', 'failedChecks', 'passedRules', 'passedChecks'].map(key => [key, pdfCount(value[key])]));
  if (counts.failedRules + counts.passedRules === 0 || counts.failedChecks + counts.passedChecks === 0
    || (counts.failedRules === 0) !== (counts.failedChecks === 0)
    || compliant !== (counts.failedRules === 0 && counts.failedChecks === 0)) invalidPdfEvidence();
  return counts;
}
// The CLI is invoked on exactly one immutable PDF with --flavour ua1. Missing
// counts, extra jobs, and unsuccessful exits cannot constitute passing evidence.
// veraPDF 1.30.2 exits 1 for a completed noncompliant report; retain that failure.
function parsePdfUaCliReport(parsed, exitCode) {
  const report = parsed && parsed.report;
  const jobs = report && report.jobs;
  const validations = Array.isArray(jobs) && jobs.length === 1 && jobs[0].validationResult;
  const validation = Array.isArray(validations) && validations.length === 1 && validations[0];
  if (!validation || typeof validation.compliant !== 'boolean' || !validation.details
    || (exitCode !== 0 && !(exitCode === 1 && validation.compliant === false))
    || (validation.jobEndStatus !== undefined && validation.jobEndStatus !== 'normal')
    || (validation.profileName !== undefined && validation.profileName !== 'PDF/UA-1 validation profile')) invalidPdfEvidence();
  const counts = pdfCounts(validation.details, validation.compliant);
  const summaries = validation.details.ruleSummaries;
  if (summaries !== undefined && !Array.isArray(summaries)) invalidPdfEvidence();
  if (validation.compliant && (summaries || []).some(rule => rule && rule.ruleStatus === 'FAILED')) invalidPdfEvidence();
  return { report, validation, counts };
}
// Shared by the remote producer and public sanitizer. Every executed result is
// bound to emitted bytes; unavailable/not-run outcomes remain explicit.
function normalizePdfUaValidation(value, artifact, options) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidPdfEvidence();
  if (value.status === 'not_run' && PDF_UA_NOT_RUN_REASONS.includes(value.reason)) return { status: value.status, reason: value.reason };
  if (value.status === 'unavailable' && PDF_UA_UNAVAILABLE_REASONS.includes(value.reason)) return { status: value.status, reason: value.reason };
  if (!['compliant', 'noncompliant'].includes(value.status) || value.validator !== 'veraPDF' || value.profile !== 'ua1') invalidPdfEvidence();
  const counts = pdfCounts(value, value.status === 'compliant');
  // Old public reports omitted all validator identity/time fields. Keep those
  // reports readable, but never reconstruct a passing binding from the artifact.
  if (options?.allowLegacyUnbound === true
    && ['inputSha256', 'inputBytes', 'validatedAt', 'validationDurationMs'].every(key => value[key] === undefined)) {
    return { status: 'unavailable', reason: 'validator_evidence_unbound' };
  }
  if (!artifact || !/^[a-f0-9]{64}$/i.test(value.inputSha256 || '')
    || String(value.inputSha256).toLowerCase() !== String(artifact.sha256).toLowerCase()
    || !Number.isSafeInteger(value.inputBytes) || value.inputBytes < 5 || value.inputBytes !== artifact.size
    || (value.validatorVersion !== null && (typeof value.validatorVersion !== 'string' || value.validatorVersion.length > 32))
    || typeof value.validatedAt !== 'string' || !Number.isFinite(Date.parse(value.validatedAt))
    || !Number.isSafeInteger(value.validationDurationMs) || value.validationDurationMs < 0) invalidPdfEvidence();
  return { status: value.status, validator: 'veraPDF', profile: 'ua1', validatorVersion: value.validatorVersion,
    ...counts, inputSha256: value.inputSha256.toLowerCase(), inputBytes: value.inputBytes,
    validatedAt: new Date(value.validatedAt).toISOString(), validationDurationMs: value.validationDurationMs };
}
function pdfDeliveryState(input) {
  const pdfReview = input.hasPdf && input.pdfStatus !== 'passed';
  const verificationState = pdfReview ? 'review-required' : input.verificationState;
  const reviewRequired = !!pdfReview || !input.level || input.level === 'review'
    || !['complete', 'complete-for-tested-scope'].includes(verificationState)
    || (input.hasPdf && input.taggedPdfVerified !== true);
  return { verificationState, reviewRequired, distributionLevel: reviewRequired ? 'review' : input.level,
    taggedPdfDelivery: input.hasPdf && !pdfReview && input.taggedPdfVerified === true ? 'verified' : 'review-required',
    deliveryStatus: reviewRequired ? 'review-required' : 'complete-for-tested-scope' };
}
// Independent PDF evidence must govern the final artifact status, never upgrade HTML evidence.
function pdfUaEvidence(raw, options) {
  const o=options||{}, base={standard:'PDF/UA-1 (ISO 14289-1)',profile:'ua1',scope:'machine-verifiable PDF/UA checks'};
  if(!o.hasPdf)return {...base,status:'not-applicable',reason:'No tagged PDF was produced.'};
  if(!o.requested)return {...base,status:'not-run',reason:'Independent PDF validation was not requested.'};
  if(!raw||raw.error)return {...base,status:'unavailable',error:String(raw?.error||'Validator returned no evidence.').slice(0,1000)};
  const bound=raw.inputSha256===o.sha256&&raw.inputBytes===o.bytes&&raw.profile==='ua1'&&/^veraPDF(?: CLI)?$/.test(raw.validator||'');
  const counts=['failedChecks','failedRuleCount'];
  if(!bound||typeof raw.compliant!=='boolean'||counts.some(k=>!Number.isSafeInteger(raw[k])||raw[k]<0))
    return {...base,status:'unavailable',reason:bound?'Incomplete validator result.':'Validator evidence does not match the emitted PDF bytes and profile.'};
  const passed=raw.compliant===true&&raw.failedChecks===0&&raw.failedRuleCount===0;
  return {...base,status:passed?'passed':'failed',compliant:passed,validator:raw.validator,validatorVersion:raw.validatorVersion||null,
    inputSha256:raw.inputSha256,inputBytes:raw.inputBytes,validatedAt:raw.validatedAt||null,validationDurationMs:raw.validationDurationMs??null,
    failedChecks:raw.failedChecks,failedRuleCount:raw.failedRuleCount,failedRules:Array.isArray(raw.failedRules)?raw.failedRules.slice(0,100):[]};
}
function applyPdfDeliveryEvidence(summary,evidence) {
  summary.pdfUa=evidence;
  summary.htmlVerificationState=summary.verificationState;
  summary.verificationChecks={...(summary.verificationChecks||{}),pdfUa:evidence};
  const needsReview=Boolean(summary.files?.taggedPdf)&&evidence.status!=='passed';
  summary.deliveryReviewReasons=needsReview?['pdf-ua-'+evidence.status]:[];
  if(needsReview){
    summary.verdict={level:'review',reviewCount:(summary.verdict?.reviewCount||0)+1,cautionCount:summary.verdict?.cautionCount||0};
    summary.verificationState='review-required';
    summary.taggedPdfDelivery={ok:false,code:evidence.status==='failed'?'validator-failed':evidence.error?'validator-error':'validator-unavailable'};
  }
  const delivery=pdfDeliveryState({hasPdf:Boolean(summary.files?.taggedPdf),pdfStatus:evidence.status,
    verificationState:summary.verificationState,level:summary.verdict?.level,taggedPdfVerified:summary.taggedPdfDelivery?.ok===true});
  summary.reviewRequired=delivery.reviewRequired;
  summary.deliveryStatus=delivery.deliveryStatus;
  return summary;
}
// Self-contained so the browser uses exactly the same per-engine report contract.
function auditChecks(input) {
  const o=input||{}, count=v=>Number.isSafeInteger(v)&&v>=0?v:null;
  const state=(value,failures,review,partial)=>!value||!Number.isFinite(value.score)?'unavailable':failures>0?'failed':partial||failures===null||review===null?'partial':review>0?'review-required':'passed';
  const ai=o.ai,axe=o.axe,ea=o.equalAccess;
  // Compact evidence (compactVerificationEvidence) carries the full counts beside a capped issue
  // list; prefer the counts so a long list is not undercounted. Raw audits have no counts.
  const aiFailures=count(ai?.issueCount)??(Array.isArray(ai?.issues)?ai.issues.length:null);
  const aiReview=count(ai?.reviewIssueCount)??(Array.isArray(ai?.issues)?ai.issues.filter(i=>i?.requiresManualReview).length:null);
  const axeFailures=count(axe?.totalViolations),axeReview=count(axe?.totalIncomplete);
  const eaFailures=count(ea?.failViolations),potential=count(ea?.potentialViolations),manual=count(ea?.manualViolations);
  const eaReview=count(ea?.reviewFindingCount)??(potential!==null&&manual!==null?potential+manual:null);
  return {ai:{status:o.includeAi===false?'not-run':state(ai,aiFailures,aiReview,ai?._partialAudit||ai?.partial||ai?._scoreDegraded||ai?.scoreDegraded||ai?.synthesized),findings:aiFailures,reviewFindings:aiReview},
    axe:{status:state(axe,axeFailures,axeReview),findings:axeFailures,reviewFindings:axeReview},
    equalAccess:{status:state(ea,eaFailures,eaReview),findings:eaFailures,reviewFindings:eaReview}};
}
// Rejection telemetry never carries candidate/source text. The same contract is
// used for checkpoint storage, browser publication, and public tool output.
const CANDIDATE_REJECTION_SCHEMA = {
  candidateRejectionCount: { type: 'integer', minimum: 0, maximum: 1000000 },
  candidateRejections: { type: 'array', maxItems: 100, items: {
    type: 'object', additionalProperties: false, required: ['chunkId', 'phase', 'reason'],
    properties: {
      sourceLocation: { type: 'string', maxLength: 100, pattern: "^(?:document|(?:table|row|cell|link|figure|control|math):[1-9][0-9]{0,7}(?:/(?:row|cell):[1-9][0-9]{0,7}){0,2})$" },
      pass: { type: 'integer', minimum: 1, maximum: 1000000 },
      chunkId: { type: 'string', maxLength: 32, pattern: '^(?:all|[0-9]{1,8}(?:\\.[0-9]{1,8})?)$' },
      phase: { type: 'string', enum: ['single', 'chunk', 'image-retry', 'half', 'half-assembly', 'assembly'] },
      reason: { type: 'string', enum: ['empty-output', 'no-original', 'size-shrink', 'size-growth-unexpected',
        'text-shrink', 'text-growth-unexpected', 'no-doc-markers', 'image-reference-changed',
        'image-reference-uncheckable', 'table-cell-transposition', 'invalid-json-wrapper', "table-content-changed", "source-value-changed", "link-destination-changed", "image-association-changed", "source-reading-order-changed", "source-content-added", "source-contract-uncheckable", "source-visibility-changed", "table-semantics-changed", "form-state-changed", "math-content-changed", 'content-not-preserved'] },
    },
  } },
};
// Serializable for browser execution when the same schema is passed explicitly.
function normalizeCandidateRejectionEvidence(value, schema = CANDIDATE_REJECTION_SCHEMA) {
  const input = value && typeof value === 'object' ? value : {};
  const fields = schema.candidateRejections.items.properties;
  const chunkIdPattern = new RegExp(fields.chunkId.pattern);
  const records = [];
  if (Array.isArray(input.candidateRejections)) {
    for (const entry of input.candidateRejections.slice(0, schema.candidateRejections.maxItems)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)
        || typeof entry.chunkId !== 'string' || entry.chunkId.length > fields.chunkId.maxLength
        || !chunkIdPattern.test(entry.chunkId) || !fields.phase.enum.includes(entry.phase)
        || !fields.reason.enum.includes(entry.reason)) continue;
      const record = { chunkId: entry.chunkId, phase: entry.phase, reason: entry.reason };
      if (Number.isSafeInteger(entry.pass) && entry.pass >= fields.pass.minimum && entry.pass <= fields.pass.maximum) record.pass = entry.pass;
      if (typeof entry.sourceLocation === 'string' && fields.sourceLocation && entry.sourceLocation.length <= fields.sourceLocation.maxLength && new RegExp(fields.sourceLocation.pattern).test(entry.sourceLocation)) record.sourceLocation = entry.sourceLocation;
      records.push(record);
    }
  }
  const count = Number.isSafeInteger(input.candidateRejectionCount) && input.candidateRejectionCount >= 0
    ? Math.min(schema.candidateRejectionCount.maximum, input.candidateRejectionCount) : 0;
  return { candidateRejectionCount: Math.max(count, records.length), candidateRejections: records };
}
// Compact, bounded per-engine verification evidence for reports and calibration (2026-09-13).
// Accepts a pipeline result (verificationAudit / axeAudit / secondEngineAudit) or an already
// compact object (ai / axe / equalAccess) and is idempotent, so the driver can build it inside the
// page and the server can re-normalise what the page returned. Field names match auditChecks()
// and tests/fixtures/pdf_calibration/README.md. Self-contained on purpose: the driver stringifies
// it into Chromium, where nothing from this module's scope exists.
function compactVerificationEvidence(source) {
  const o = source && typeof source === 'object' ? source : null;
  if (!o) return null;
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const count = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : null);
  const str = (v, n) => (v == null ? null : String(v).slice(0, n));
  const list = (v, n) => (Array.isArray(v) ? v.slice(0, n).filter((x) => x && typeof x === 'object') : []);
  const ai = o.ai !== undefined ? o.ai : o.verificationAudit;
  const axe = o.axe !== undefined ? o.axe : o.axeAudit;
  const ea = o.equalAccess !== undefined ? o.equalAccess : o.secondEngineAudit;
  const out = { ai: null, axe: null, equalAccess: null };
  if (ai && typeof ai === 'object' && !Array.isArray(ai)) {
    const issues = Array.isArray(ai.issues) ? ai.issues : null;
    out.ai = {
      score: num(ai.score),
      issueCount: issues ? issues.length : count(ai.issueCount),
      reviewIssueCount: issues ? issues.filter((i) => i && i.requiresManualReview === true).length : count(ai.reviewIssueCount),
      passCount: Array.isArray(ai.passes) ? ai.passes.length : count(ai.passCount),
      chunksAudited: count(ai.chunksAudited),
      chunksRequested: count(ai.chunksRequested),
      partial: ai._partialAudit === true || ai.partial === true,
      scoreDegraded: ai._scoreDegraded === true || ai.scoreDegraded === true,
      issues: list(issues, 50).map((i) => ({
        ruleId: str(i.ruleId, 60), severity: str(i.severity, 20), wcag: str(i.wcag, 24),
        issue: str(i.issue != null ? i.issue : i.description, 300), location: str(i.location, 120),
        requiresManualReview: i.requiresManualReview === true,
      })),
    };
  }
  if (axe && typeof axe === 'object' && !Array.isArray(axe)) {
    let violations = [];
    if (Array.isArray(axe.violations)) violations = list(axe.violations, 50);
    else for (const sev of ['critical', 'serious', 'moderate', 'minor']) for (const v of list(axe[sev], 50)) violations.push(Object.assign({ impact: sev }, v));
    out.axe = {
      score: num(axe.score),
      totalViolations: count(axe.totalViolations),
      totalIncomplete: count(axe.totalIncomplete),
      violations: violations.slice(0, 50).map((v) => ({
        id: str(v.id, 80), impact: str(v.impact, 20),
        nodes: count(typeof v.nodes === 'number' ? v.nodes : (Array.isArray(v.nodes) ? v.nodes.length : null)),
        description: str(v.description != null ? v.description : v.help, 300), wcag: str(v.wcag, 80),
      })),
    };
  }
  if (ea && typeof ea === 'object' && !Array.isArray(ea)) {
    const rule = (f) => ({ id: str(f.id != null ? f.id : f.ruleId, 80), nodes: count(f.nodes), description: str(f.description != null ? f.description : f.message, 300) });
    const review = Array.isArray(ea.reviewFindings) ? ea.reviewFindings : [].concat(list(ea.potentialFindings, 50), list(ea.manualFindings, 50));
    out.equalAccess = {
      score: num(ea.score),
      failViolations: count(ea.failViolations),
      potentialViolations: count(ea.potentialViolations),
      manualViolations: count(ea.manualViolations),
      reviewFindingCount: count(ea.reviewFindingCount),
      fails: list(ea.fails, 50).map(rule),
      reviewFindings: list(review, 50).map(rule),
    };
  }
  if (!out.ai && !out.axe && !out.equalAccess) return null;
  return out;
}
module.exports={compactVerificationEvidence,pdfUaEvidence,applyPdfDeliveryEvidence,auditChecks,parsePdfUaCliReport,normalizePdfUaValidation,pdfDeliveryState,normalizeCandidateRejectionEvidence,CANDIDATE_REJECTION_SCHEMA};
