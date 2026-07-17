// Individual-remediation polish wave (2026-07-10, Aaron: "I just want individual remediation to
// work extremely well"). Goldens + pins for:
//
// R1  — the "Can I hand this out?" verdict strip: ONE line computed from the honesty signals the
//   result already carries (score/target, verifier completeness, coverage, fidelity notes), so a
//   teacher doesn't synthesize seven flags from four panels. Pipeline-computed (pure), view-rendered.
// #6-ext — the per-round fidelity recompute now also re-runs the NUMERIC and STRUCTURAL nets (a
//   round that swaps a number or drops a table refreshes its warning); run-scoped note kinds carry
//   forward, recomputable kinds are replaced.
// M24 — load-bearing score qualifiers were title-tooltips on non-focusable spans; keyboard/SR/touch
//   users got the number without the caveat. Now real buttons (focus ring, aria-label, toast on tap).
// M23 — nested dialogs had aria-modal but no Tab trap, and Escape fell through to the outer
//   close-audit confirm. Each now has the shared trap hook + its own Escape-with-stopPropagation.
// M15 — the per-leaf positioned draw's "last run soaks the remainder" dumped surplus OCR boxes
//   under the page's LAST semantic leaf (worst case a TH/H1); >20% leaf/box divergence count-mapped
//   words to the wrong leaves wholesale. Surplus → /Artifact; divergence → semantic block layout.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

// ── R1: extract the real verdict fn ──
const _vs = dp.indexOf('function _alloDistributionVerdict(r, opts) {');
const _ve = dp.indexOf('\n}', dp.indexOf('headline: level ===', _vs)) + 2;
const verdict = new Function(dp.slice(_vs, _ve) + '\nreturn _alloDistributionVerdict;')();
const _os = dp.indexOf('function _alloRemediationOutcome(r, opts) {');
const _oe = dp.indexOf('function _alloDistributionVerdict(r, opts) {', _os);
const remediationOutcome = new Function(dp.slice(_os, _oe) + '\nreturn _alloRemediationOutcome;')();

describe('remediation outcome is separate from verification completeness', () => {
  it('calls a target-reaching, axe-clean, AI-complete run successful even when verification needs review', () => {
    expect(remediationOutcome({
      afterScore: 96,
      axeAudit: { totalViolations: 0 },
      _aiVerificationIncomplete: false,
      verificationState: 'review-required',
    }, { targetScore: 95 }).state).toBe('success');
  });

  it('keeps unknown residuals, a missed target, and incomplete AI out of the success numerator', () => {
    expect(remediationOutcome({ afterScore: 96 }, { targetScore: 95 }).state).toBe('incomplete');
    expect(remediationOutcome({ afterScore: 94, axeAudit: { totalViolations: 0 } }, { targetScore: 95 }).state).toBe('incomplete');
    expect(remediationOutcome({ afterScore: 96, axeAudit: { totalViolations: 0 }, _aiVerificationIncomplete: true }, { targetScore: 95 }).state).toBe('incomplete');
  });

  it('exports one shared classifier for host and pipeline telemetry', () => {
    expect(dp).toContain('remediationOutcome: _alloRemediationOutcome,');
    expect(anti).toContain("_docPipeline.remediationOutcome(cur, { targetScore: pdfTargetScore })");
    expect(anti).toContain("verificationState: cur.verificationState || 'unavailable'");
  });
});


describe('R1 — distribution verdict (BEHAVIORAL, the real fn)', () => {
  it('clean at-target run → ready', () => {
    const v = verdict({ afterScore: 96, axeAudit: { totalViolations: 0 }, secondEngineAudit: { failViolations: 0 }, integrityCoverage: 100, fidelityNotes: [] }, { targetScore: 95 });
    expect(v.level).toBe('ready');
    expect(v.review).toEqual([]);
    expect(v.cautions).toEqual([]);
  });
  it('below target with clean checkers → caution naming the rubric gap', () => {
    const v = verdict({ afterScore: 88, axeAudit: { totalViolations: 0 }, secondEngineAudit: { failViolations: 0 }, integrityCoverage: 99, fidelityNotes: [] }, { targetScore: 95 });
    expect(v.level).toBe('caution');
    expect(v.cautions.join(' ')).toMatch(/below your target.*AI-rubric judgment/);
  });
  it('a numeric-fidelity note is REVIEW, never a mere caution (worst case for an assessment)', () => {
    const v = verdict({ afterScore: 97, axeAudit: { totalViolations: 0 }, integrityCoverage: 99, fidelityNotes: [{ kind: 'numeric', msg: 'x' }] }, { targetScore: 95 });
    expect(v.level).toBe('review');
    expect(v.review.join(' ')).toMatch(/numbers may have changed/);
  });
  it('coverage under 90 / lost tables / refusal text / expert flag → review', () => {
    expect(verdict({ afterScore: 97, integrityCoverage: 84, fidelityNotes: [] }, {}).level).toBe('review');
    expect(verdict({ afterScore: 97, integrityCoverage: 99, fidelityNotes: [{ kind: 'tables', msg: 'x' }] }, {}).level).toBe('review');
    expect(verdict({ afterScore: 97, integrityCoverage: 99, fidelityNotes: [{ kind: 'refusal', msg: 'x' }] }, {}).level).toBe('review');
    expect(verdict({ afterScore: 97, integrityCoverage: 99, needsExpertReview: true, expertReviewReason: 'why', fidelityNotes: [] }, {}).level).toBe('review');
  });
  it('incomplete AI verification / EA fails / remaining axe violations → cautions with counts', () => {
    const v = verdict({ afterScore: 97, _aiVerificationIncomplete: true, axeAudit: { totalViolations: 2 }, secondEngineAudit: { failViolations: 1 }, integrityCoverage: 99, fidelityNotes: [] }, { targetScore: 95 });
    expect(v.level).toBe('caution');
    expect(v.cautions.join(' ')).toMatch(/could not fully complete/);
    expect(v.cautions.join(' ')).toMatch(/2 automated \(axe\) violations remain/);
    expect(v.cautions.join(' ')).toMatch(/Equal Access.*1 rule failure/);
  });
  it('null result → null; missing score → caution not ready', () => {
    expect(verdict(null)).toBeNull();
    const v = verdict({ integrityCoverage: 99, fidelityNotes: [] }, {});
    expect(v.level).toBe('caution');
    expect(v.cautions.join(' ')).toMatch(/no final verified score/);
  });
  it('wiring: exported, and the view renders it as a visible role=status strip (never tooltip-only)', () => {
    expect(dp).toContain('distributionVerdict: _alloDistributionVerdict,');
    expect(view).toContain("_docPipeline.distributionVerdict(pdfFixResult, { targetScore: pdfTargetScore })");
    expect(view).toContain('role="status" data-help-key="pdf_audit_verdict_strip"');
  });
});

// ── #6-ext: the recompute helper now carries numeric + structural nets ──
const _fs = dp.indexOf('const htmlToPlainText = (html) => {');
const _fe = dp.indexOf('// acceptFixedHtmlDetailed: strict guard', _fs);
const { _recomputeContentFidelity } = new Function(
  '_numericFidelityLosses', '_computeStructuralFidelityNotes',
  dp.slice(_fs, _fe) + '\nreturn { _recomputeContentFidelity };'
)(
  // real-shaped stubs: the REAL fns are module-scope; here we verify the PLUMBING (kind mapping,
  // note assembly) — the nets themselves have their own suites.
  (src, out) => (src.includes('42') && !out.includes('42')) ? ['42'] : [],
  (src, html) => /table/i.test(src) && !/<table/i.test(html) ? [{ kind: 'tables', msg: 'Tables: lost' }] : []
);

describe('#6-ext — per-round recompute carries numeric + structural warnings (BEHAVIORAL)', () => {
  const SRC = 'The score was 42 out of 50 on the table test. '.repeat(12).trim();
  it('a mutation that drops the number 42 produces a numeric warning + numeric fidelity note', () => {
    const r = _recomputeContentFidelity(SRC, '<p>' + SRC.replace(/42/g, 'forty-two') + '</p>');
    expect(r.numericWarn).toMatch(/numeric value/);
    expect(r.fidelityNotes.some((n) => n.kind === 'numeric')).toBe(true);
  });
  it('a mutation that keeps everything produces no notes', () => {
    const r = _recomputeContentFidelity(SRC, '<table><tr><td>' + SRC + '</td></tr></table>');
    expect(r.numericWarn == null).toBe(true);
    expect(r.fidelityNotes.length).toBe(0);
  });
  it('structural-net notes ride out through fidelityNotes', () => {
    const r = _recomputeContentFidelity(SRC, '<p>' + SRC + '</p>'); // src mentions "table", html has none → stub fires
    expect(r.fidelityNotes.some((n) => n.kind === 'tables')).toBe(true);
  });
  it('wiring: the host REPLACES recomputable kinds and carries run-scoped kinds forward', () => {
    expect(dp).toContain('const _RECOMPUTABLE_FIDELITY_KINDS = { links: 1, tables: 1, refusal: 1, placement: 1, numeric: 1 };');
    expect(dp).toContain('recomputableFidelityKinds: _RECOMPUTABLE_FIDELITY_KINDS,');
    // #6-full (2026-07-16): the replace-recomputable/carry-run-scoped merge moved VERBATIM into
    // the canonical reducer (which uses the module constant directly); the host delegates.
    expect(dp).toContain('(cur.fidelityNotes || []).filter((n) => !(n && _RECOMPUTABLE_FIDELITY_KINDS[n.kind])).concat(_roundFid.fidelityNotes || [])');
    expect(dp).toContain('fidelityNotes: _roundNotes,');
    expect(dp).toContain('_roundFid.numericWarn].filter(Boolean)');
    expect(anti).toContain('_mergedRound = await _finalizeRound(cur, {');
    expect(anti).toContain('if (cur.verificationHtmlBinding && !attachVerificationHtmlProof(cur, result.html)) {');
    expect(anti).toContain('const snapshot = cur;');
    expect(anti).toContain('setPdfFixResult(snapshot);');
  });
});

// ── M15: the real distributor, driven directly ──
const _ds = dp.indexOf('const _distributeCallsToRuns = (runs, calls) => {');
const _de = dp.indexOf('\n  };', _ds) + 5;
const distribute = new Function(dp.slice(_ds, _de) + '\nreturn _distributeCallsToRuns;')();
const _mkCalls = (n) => Array.from({ length: n }, (_, i) => ({ text: 'w' + i, x: i, y: 0, size: 10 }));

describe('M15 — per-leaf word distribution (BEHAVIORAL, the real fn)', () => {
  it('exact correspondence: each leaf takes its own words, no overflow', () => {
    const runs = [{ text: 'one two three', mcid: 0 }, { text: 'four five', mcid: 1 }];
    const d = distribute(runs, _mkCalls(5));
    expect(d[0].calls.length).toBe(3);
    expect(d[1].calls.length).toBe(2);
    expect(d.overflow).toBeUndefined();
    expect(d.mismatch).toBeUndefined();
  });
  it('surplus boxes no longer soak into the LAST leaf — they land in overflow (→ /Artifact)', () => {
    const runs = [{ text: 'a b c d e f g h i j', mcid: 0 }, { text: 'k l', mcid: 1 }]; // 12 leaf words
    const d = distribute(runs, _mkCalls(13)); // 13 boxes: within 20%, one surplus
    expect(d[1].calls.length).toBe(2);        // the TH/H1 worst case: last leaf takes ONLY its own
    expect(d.overflow.length).toBe(1);
  });
  it('>20% divergence refuses count-mapping (caller falls back to the semantic block layout)', () => {
    const runs = [{ text: 'a b c d e f g h i j', mcid: 0 }]; // 10 leaf words
    const d = distribute(runs, _mkCalls(15)); // 50% more boxes
    expect(d.mismatch).toBeTruthy();
    expect(d[0].calls.length).toBe(0); // nothing was mapped
  });
  it('every leaf still gets an entry (BDC/EMC emitted, MCR stays backed) even with too few boxes', () => {
    const runs = [{ text: 'a b c', mcid: 0 }, { text: 'd e', mcid: 1 }];
    const d = distribute(runs, _mkCalls(3));
    expect(d.length).toBe(2);
    expect(d[1].calls.length).toBe(0);
  });
  it('wiring: overflow draws inside balanced /Artifact BMC..EMC; divergence routes to block layout', () => {
    expect(dp).toContain("_PLx.PDFOperatorNames.BeginMarkedContent || 'BMC', [PDFName.of('Artifact')]");
    expect(dp).toContain('_m15Fallback: true');
    expect(dp).toContain('surplus positioned word(s) beyond the leaf counts drawn as /Artifact');
  });
});

describe('UA-gate regression (bisected to @4d93bf5eb): scanned run without a per-page OCR map', () => {
  it('synthesizes a single-page text map so semantic leaves keep content linkage (declaration earned again)', () => {
    // Before: zero ocrPages → NO BDC runs emitted anywhere → every text leaf unlinked → the
    // honest gate withheld pdfuaid:part=1 on inputs the pre-per-leaf path used to declare.
    // e2e: pdf_tag_tree_golden "pdfuaid:part=1 withheld on the text path, declared on the scanned
    // path" (26/26 again); Node: dev-tools/debug/ua_gate_probe.cjs (orphans 2 → 0).
    expect(dp).toContain("ocrPages = [{ pageNum: 1, text: _fullTxt, _synthesizedNoPageMap: true }];");
    expect(dp).toContain('if (isScanned && (!ocrPages || !ocrPages.length)) {');
  });
});

describe('M24 — load-bearing qualifiers are focusable buttons, not tooltip-only spans', () => {
  it('the shared qualifier component exists (focus ring + aria-label + toast on activation)', () => {
    expect(view).toContain('const _AlloQualifier = ({ text, className, children }) => (');
    expect(view).toContain("onClick={() => { try { addToast(text, 'info'); } catch (_) {} }}");
    expect(view).toContain('focus-visible:ring-2 focus-visible:ring-indigo-500');
  });
  it('the named load-bearing sites all use it (est-min, governing tag, fidelity asterisk, foundations, advisory, PDF/UA chip+badge, reading order, OCR quality, content/automated labels)', () => {
    expect((view.match(/<_AlloQualifier/g) || []).length).toBeGreaterThanOrEqual(11);
    // the fidelity asterisk is no longer aria-hidden decoration
    expect(view).not.toContain('<span className="text-amber-600 font-bold" aria-hidden="true">*</span>');
    expect(view).toMatch(/_AlloQualifier className="text-amber-600 font-bold" text=\{t\('pdf_audit\.dashboard\.fidelity_limited_title'\)/);
  });
});

describe('M23 — nested dialogs trap Tab and peel Escape one layer at a time', () => {
  it('all six nested surfaces have trap refs wired through the shared hook', () => {
    for (const ref of ['pdfPreviewTrapRef', 'pdfFieldsTrapRef', 'fillableTrapRef', 'plainCompareTrapRef', 'translateCompareTrapRef', 'closeConfirmTrapRef']) {
      expect(view).toContain('_alloUseFocusTrap(' + ref + ',');
      expect(view).toContain('ref={' + ref + '}');
    }
  });
  it('each dialog owns its Escape with stopPropagation (no fall-through to the close-audit confirm)', () => {
    expect(view).toContain("if (e.key === 'Escape') { e.stopPropagation(); setPdfPreviewOpen(false); }");
    expect(view).toContain("if (e.key === 'Escape') { e.stopPropagation(); setPdfFieldCandidates(null); }");
    expect(view).toContain("if (e.key === 'Escape') { e.stopPropagation(); setFillableCandidates(null); }");
    expect(view).toContain("if (e.key === 'Escape') { e.stopPropagation(); setShowPlainCompare(false); }");
    expect(view).toContain("if (e.key === 'Escape') { e.stopPropagation(); setShowTranslationCompare(false); }");
  });
});
