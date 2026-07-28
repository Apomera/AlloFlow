// @vitest-environment jsdom
// Phase 0 + 1 of the storm-robustness plan (2026-07-27), from a 6-agent read-only investigation of
// a field log in which an 8-page scan ran 3033s under a throttle and was then followed by a SECOND
// full pipeline three seconds later.
//
// The investigation's two load-bearing findings:
//   1. Vision is ~90% of a run's bytes and ~15% of its wall clock; Step 4 text is ~10% of the bytes
//      and 75% of the clock. The storm is PAID FOR in Steps 0-2 and merely SERVED in Step 4 — so
//      the lever is payload volume, and nothing measured it.
//   2. The product TOLD the teacher to re-run. The hands-off wrapper provably did nothing after
//      shipping, so the second pipeline was a human following the completion toast, which ends
//      "Re-run for a full verified score" — while the audit-only control sat two panels away and
//      had, by then, deleted itself.
//
// Pins here drive decisions, not spellings. The M15 breaker regression taught this codebase that a
// pin asserting a construct EXISTS stays green through a total failure of what it DECIDES.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// Phase 0 — the payload ledger. Measure before cutting.
// ─────────────────────────────────────────────────────────────────────────────
describe('the run counts what Canvas actually meters', () => {
  it('every call is ledgered once, at intent — not per retry', () => {
    // A retry re-sends the same bytes; the question the ledger answers is "what does ONE run ask
    // Canvas to carry", which is what gets metered against the session.
    expect(dp).toContain('_alloNotePayload(_callStats, requestProfile);');
    const call = dp.slice(dp.indexOf('var _geminiCall = function('));
    const preAttempt = call.slice(0, call.indexOf('var _attempt = function(n) {'));
    expect(preAttempt, 'ledgering inside _attempt would multiply a retried call').toContain('_alloNotePayload');
  });

  it('the phases that share a step but differ enormously in cost are tagged separately', () => {
    // Style, transform and image-inventory are all "Step 2" but each uploads the whole document.
    for (const phase of ['style', 'transform', 'image-inventory']) {
      expect(dp, `phase '${phase}' must be attributable`).toContain(`_alloWithPayloadPhase('${phase}'`);
    }
  });

  it('the phase tag is restored even when the wrapped call throws', () => {
    const fn = dp.slice(dp.indexOf('var _alloWithPayloadPhase = function'));
    const body = fn.slice(0, fn.indexOf('var _alloNotePayload'));
    // A leaked phase would misattribute every later call in the run.
    expect(body).toContain('catch (e) { restore(); throw e; }');
    expect(body).toContain('function (e) { restore(); throw e; }');
  });

  it('the ledger reaches the log a teacher can copy, sorted so the biggest sender reads first', () => {
    expect(dp).toContain("_pipeLog('Payload', _ledger, null, _runTelemetry);");
    const fmt = dp.slice(dp.indexOf('var _alloFormatPayloadLedger'));
    expect(fmt.slice(0, 900)).toContain('sort(function (a, b) { return b.bytes - a.bytes; })');
  });

  it('FERPA: the ledger records counts only, never prompt or document text', () => {
    const note = dp.slice(dp.indexOf('var _alloNotePayload = function'), dp.indexOf('var _alloFormatPayloadLedger'));
    expect(note).toContain('promptChars');
    expect(note).toContain('attachmentChars');
    // no capture of the prompt or attachment themselves
    expect(note).not.toMatch(/profile\.(prompt|attachment)\b/);
    expect(note).not.toContain('slice(0,');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — stop the product from causing a second full pipeline.
// ─────────────────────────────────────────────────────────────────────────────
describe('the audit-only control survives the storm it exists for', () => {
  it('the verification block no longer requires a non-null audit', () => {
    // A FAILED audit-only retry sets verificationAudit: null together with
    // _aiVerificationIncomplete: true — so gating the block on the audit alone made the recovery
    // control delete itself on first failure, leaving a full re-run as the only visible option.
    expect(view).toContain('{(pdfFixResult.verificationAudit || pdfFixResult._aiVerificationIncomplete) && (');
    expect(view).not.toContain('{pdfFixResult.verificationAudit && (\n');
  });

  it('the inner reads are null-safe, or the block would throw instead of rendering', () => {
    expect(view).toContain('pdfFixResult.verificationAudit?.chunksAudited != null');
    expect(view).toContain(': pdfFixResult.verificationAudit?.summary}</div>');
    expect(view).toContain('{(pdfFixResult.verificationAudit?.issues || []).length > 0 && (');
  });

  it('both audit-only controls wait for calm — they used to behave oppositely', () => {
    // One paced politely; the other fired into the storm and returned "could not complete" in
    // seconds. Two controls for one operation where the wrong choice silently fails is worse than
    // one control.
    const handler = view.slice(view.indexOf("setPdfFixStep('Re-running verification without changing the document...');"));
    expect(handler.slice(0, 1400)).toContain('waitForGeminiCalm({ maxWaitMs: 240000 })');
  });
});

describe('the teacher is pointed at the cheap action, not the expensive one', () => {
  it('no surface still instructs a full re-run for a throttled audit', () => {
    expect(dp).not.toContain('Re-run for a full verified score.');
    expect(dp).not.toContain('Re-run for a full score.');
    expect(view).not.toContain('re-run for a full AI-verified score.');
  });

  it('every one of those surfaces now names the audit-only action', () => {
    // Toast + exported report (pipeline), verification summary (view).
    expect((dp.match(/Complete final audit/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((view.match(/Complete final audit/g) || []).length).toBeGreaterThanOrEqual(1);
  });

  it('and says it keeps the work already done', () => {
    expect(dp).toMatch(/re-audits only|re-checks only the audit/);
  });
});

describe('a clean document is not headlined like a broken one', () => {
  let verdict;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    verdict = window.AlloModules.createDocPipeline({
      callGemini: async () => 'OK', callGeminiVision: async () => '', callImagen: async () => null,
      addToast: () => {}, t: (k) => k, isRtlLang: () => false,
      updateExportPreview: () => {}, getDefaultTitle: () => 'D', state: {},
    }).distributionVerdict;
  });

  // The field-log document, exactly: axe clean, Equal Access clean, 99% coverage, AI audit partial
  // because the service was throttling.
  const fieldLog = (over) => Object.assign({
    afterScore: 90,
    axeAudit: { totalViolations: 0, score: 100 },
    secondEngineAudit: { failViolations: 0, score: 100 },
    verificationState: 'partial',
    _aiVerificationIncomplete: true,
    integrityCoverage: 99,
    fidelityNotes: [],
    needsExpertReview: false,
  }, over || {});

  it('a throttled AI audit over clean engines is a CAUTION, not a review case', () => {
    const v = verdict(fieldLog(), { targetScore: 95 });
    expect(v, 'distributionVerdict should be exported and callable').toBeTruthy();
    const blob = JSON.stringify(v);
    expect(blob, 'the throttle must still be disclosed somewhere').toMatch(/AI verification could not fully complete|throttl/i);
    expect(v.level, 'a clean document must not carry the same verdict as one with real barriers').not.toBe('review');
  });

  it('an UNKNOWN checker state still goes to review — absence of evidence is not clean', () => {
    // axe never ran: coverage is unknown, so the carve-out must not apply.
    const v = verdict(fieldLog({ axeAudit: null }), { targetScore: 95 });
    expect(v.level).toBe('review');
  });

  it('real residual violations still go to review', () => {
    const v = verdict(fieldLog({ axeAudit: { totalViolations: 4, score: 60 } }), { targetScore: 95 });
    expect(v.level).toBe('review');
  });

  it('an Equal Access failure still goes to review', () => {
    const v = verdict(fieldLog({ secondEngineAudit: { failViolations: 2, score: 70 } }), { targetScore: 95 });
    expect(v.level).toBe('review');
  });

  it('the carve-out is narrow: it requires axe to have RUN and reported zero', () => {
    expect(dp).toContain('var _aiOnlyIncomplete = !!(r._aiVerificationIncomplete && vio === 0 && (eaFails === 0 || eaFails == null));');
  });
});

describe('the deferred-score disclosure stops contradicting itself', () => {
  it('the view writes the same BASIS SHAPE the UI reads', () => {
    // It wrote a string while the pipeline writes an object and the UI reads .lastSuccessfulAiScore
    // / .automatedScore — so after using the deferred-audit path, the very workflow the disclosure
    // exists for, it rendered "Basis: AI ? / automated ?".
    expect(view).toContain("kind: 'deterministic-only-reaudit',");
    expect(view).toContain('automatedScore: _wdet,');
    expect(view).not.toContain("_estimatedScoreBasis: (!_wvOk && Number.isFinite(_wscore)) ? 'deterministic-only re-audit");
  });

  it('it no longer reports the headline back as its own estimate', () => {
    // _estimatedMinimumScore was set to the deterministic headline itself, so the panel showed the
    // same number twice under two labels, one claiming to incorporate a prior AI audit.
    expect(view).not.toContain('_estimatedMinimumScore: (!_wvOk && Number.isFinite(_wscore)) ? _wscore : null,');
    expect(view).toContain('_estimatedMinimumScore: null,');
  });
});

describe('completing a deferred audit does not cost the PDF/UA verdict', () => {
  it('evidence is discarded only when the HTML actually changed', () => {
    // The binding proof is non-enumerable and does not survive serialization, so on a RESTORED
    // project this cleared a veraPDF verdict that nothing had invalidated — exactly the
    // ship-early / save / come-back-later workflow.
    expect(view).toContain('const _htmlUnchangedByBytes = !!(pdfFixResultRef.current && pdfFixResultRef.current.accessibleHtml === newHtml);');
    expect(view).toContain('if (_applied && !_sameBoundHtml && !_htmlUnchangedByBytes) {');
  });
});
