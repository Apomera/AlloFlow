// Weakest-layer-governs scoring redesign (2026-06-21). The headline is the LOWER (governing) of the
// content score and the automated-WCAG score — min, NOT a mean. Averaging two scores that measure
// different things (the AI reads content/semantics; axe runs on the HTML reconstruction and passes "by
// construction") produced a midpoint that described neither and let an inflated automated half mask a
// failing content half (the "46" from a 13-vs-78 split). Additionally: the content score is now ALWAYS
// the deterministic deduction computed from the CONSOLIDATED issue list the UI displays (no model
// self-score, no ±12 override) so the number is reconstructable from what's shown.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── Mirror of the headline rule: the governing (lower) layer ──
const headline = (content, automated) => Math.min(content, automated);

describe('headline = min(content, automated) — weakest layer governs', () => {
  it("the screenshot case: content 13 vs automated 78 → 13, NOT the 46 the mean produced", () => {
    expect(headline(13, 78)).toBe(13);
    expect(Math.round((13 + 78) / 2)).toBe(46); // the old, misleading mean — for contrast
  });
  it('a clean doc governed by content: content 88, automated 95 → 88', () => {
    expect(headline(88, 95)).toBe(88);
  });
  it('governed by automated when IT is the weaker layer: content 92, automated 70 → 70', () => {
    expect(headline(92, 70)).toBe(70);
  });
  it('min can never exceed either layer (no inflation)', () => {
    for (const [a, b] of [[13, 78], [50, 50], [99, 12], [0, 100]]) {
      expect(headline(a, b)).toBeLessThanOrEqual(a);
      expect(headline(a, b)).toBeLessThanOrEqual(b);
    }
  });
});

// ── Mirror of the reproducible content score: deterministic deduction on the displayed list, floored ──
const issueWeight = (count) => Math.min(3, 1 + Math.log2(Math.max(1, Math.floor(Number(count) || 1))));
const binDed = (arr, base) => (arr || []).reduce((s, iss) => s + base * issueWeight(iss && iss.count), 0);
const contentScore = (lists) => {
  const ded = binDed(lists.critical, 15) + binDed(lists.serious, 10) + binDed(lists.moderate, 5) + binDed(lists.minor, 2);
  return Math.max(0, 100 - Math.round(ded));
};

describe('content score is reproducible from the displayed issue list (floored at 0)', () => {
  it('one critical issue (×1) → 100 − 15 = 85', () => {
    expect(contentScore({ critical: [{ count: 1 }] })).toBe(85);
  });
  it('count-weighting: a critical seen in 4 places → ×min(3,1+log2(4))=×3 → 100 − 45 = 55', () => {
    expect(contentScore({ critical: [{ count: 4 }] })).toBe(55);
  });
  it('weighting is capped at ×3 (a critical in 50 places still deducts 45, not 750)', () => {
    expect(contentScore({ critical: [{ count: 50 }] })).toBe(55);
  });
  it('saturation is honest: 17 critical issue-types → 0 (floored), and it SAYS floored in the UI', () => {
    const lists = { critical: Array.from({ length: 17 }, () => ({ count: 1 })) };
    expect(contentScore(lists)).toBe(0); // 17×15 = 255 → floored
  });
  it('mixed severities reconcile exactly: 1 crit + 2 serious + 1 minor = 100 − (15+20+2) = 63', () => {
    expect(contentScore({ critical: [{ count: 1 }], serious: [{ count: 1 }, { count: 1 }], minor: [{ count: 1 }] })).toBe(63);
  });
});

describe('anti-drift: the engine ships min (not mean) + a reproducible content score', () => {
  it('every governing site routes through the SINGLE shared computeHeadline (no per-site min to re-drift)', () => {
    expect(pipeSrc).toMatch(/const governingFinal = _alloComputeHeadline\(finalAfterScore, deterministicScore\)/);
    expect(pipeSrc).not.toMatch(/Math\.round\(\(finalAfterScore \+ deterministicScore\) \/ 2\)/);
  });
  it('the initial/before headline routes through the shared fn too', () => {
    // Repointed 2026-07-10 (ChatGPT finding 5): null-guarded - a WITHHELD (null) sliced-audit
    // score passes through instead of being resurrected by the blend.
    expect(pipeSrc).toMatch(/const governingInitial = \(aiOnlyScore === null\)\s*\n?\s*\? null\s*\n?\s*: \(_noTextLayer \? aiOnlyScore : _alloComputeHeadline\(aiOnlyScore, deterministicBaseline\)\)/);
    expect(pipeSrc).not.toMatch(/Math\.round\(\(aiOnlyScore \+ deterministicBaseline\) \/ 2\)/);
  });
  it('the re-blend after recovery routes through the shared fn', () => {
    expect(pipeSrc).toMatch(/const _reGoverning = _alloComputeHeadline\(_reAi, _reDet\)/);
  });
  it('the content score is the deduction on the CONSOLIDATED displayed list, not the per-auditor mean', () => {
    expect(pipeSrc).toMatch(/_consolidatedContentScore = Math\.max\(0, 100 - Math\.round\(_consolidatedDed\)\)/);
    // Repointed 2026-07-10 (ChatGPT finding 5): WITHHELD (null) on incomplete slice coverage.
    expect(pipeSrc).toMatch(/score: _sliceIncomplete \? null : _consolidatedContentScore/);
    expect(pipeSrc).toMatch(/_aiPanelMeanScore: avgScore/); // the mean is demoted to the agreement band
  });
  it('the auditor self-score is never kept — always deduction-grounded (the ±12 override is gone)', () => {
    expect(pipeSrc).toMatch(/a\.score = calculatedScore;/);
    expect(pipeSrc).not.toMatch(/Math\.abs\(a\.score - calculatedScore\) > 12\) \{\s*\n\s*warnLog/);
  });
  it('_scoreSource reports "min", not "blended"', () => {
    expect(pipeSrc).toMatch(/axeCoreFailed \? 'content-only' : 'min'/);
  });
});

describe('single source of truth: one computeHeadline, consumed everywhere (2026-06-21 extraction)', () => {
  const antiSrc = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8') /* extracted-sources appended 2026-07-20 */ + ['misc_handlers_source.jsx','view_export_preview_source.jsx','udl_chat_source.jsx'].map(f => readFileSync(resolve(process.cwd(), f), 'utf8')).join('\n');
  it('the engine defines ONE pure null-safe-min computeHeadline as a top-level fn', () => {
    expect(pipeSrc).toMatch(/var _alloComputeHeadline = function \(content, automated\) \{/);
    expect(pipeSrc).toMatch(/if \(typeof automated !== 'number'\) return content;\s*\n\s*return Math\.min\(content, automated\);/);
  });
  it('it is exposed both as a factory instance member (view prop) and a window static (monolith)', () => {
    expect(pipeSrc).toMatch(/computeHeadline: _alloComputeHeadline,/);
    expect(pipeSrc).toMatch(/window\.AlloModules\.createDocPipeline\.computeHeadline = _alloComputeHeadline;/);
  });
  it('the view helper delegates to the shared static, with an identical inline fallback', () => {
    expect(viewSrc).toMatch(/const _computeHeadline = \(content, automated\) => \{/);
    expect(viewSrc).toMatch(/window\.AlloModules\.createDocPipeline\.computeHeadline;/);
  });
  it('the monolith blendAiAxe delegates to the shared static (so it can never re-drift to a mean)', () => {
    expect(antiSrc).toMatch(/const _ch = window\.AlloModules && window\.AlloModules\.createDocPipeline && window\.AlloModules\.createDocPipeline\.computeHeadline;/);
    expect(antiSrc).toMatch(/if \(typeof _ch === 'function'\) return _ch\(aiScore, axeScore\);/);
    // the monolith's auto-continue round routes its headline through the delegating helper, not a raw min
    // #6-full (2026-07-16): the round headline moved into the canonical reducer, which consumes
    // _alloComputeHeadline DIRECTLY (one hop closer to the single source than blendAiAxe was);
    // the host loop commits the reducer's afterScore verbatim.
    expect(pipeSrc).toContain('const afterScore = (_det !== null) ? _alloComputeHeadline(aiAudit.score, _det) : aiAudit.score;');
    expect(antiSrc).toContain('const newScore = _mergedRound.afterScore;');
    expect(antiSrc).not.toMatch(/const newScore = \(_det !== null\) \? Math\.min\(reVerify\.score, _det\)/);
  });
});

describe('anti-drift: the degraded success toast is gated (score-blend-degraded-1)', () => {
  it('a throttle-degraded run no longer claims "PDF remediated!" — it warns instead', () => {
    expect(pipeSrc).toMatch(/else if \(_aiVerificationIncomplete && finalAfterScore !== null\)/);
    expect(pipeSrc).toMatch(/the AI semantic audit was throttled and didn't finish/);
  });
});

describe('anti-drift: the view shows two layers + the governing one, never an average', () => {
  it('the breakdown is "lower of … = …", with the /2 mean formula removed', () => {
    expect(viewSrc).toMatch(/pdf_audit\.score\.lower_of/);
    expect(viewSrc).toMatch(/governed_by_content|governing_lead/);
    expect(viewSrc).not.toMatch(/<span className="text-slate-600 font-bold">2<\/span>/); // the old "/ 2" literal
    expect(viewSrc).not.toMatch(/Average of both engines/);
  });
  it('the AI card shows THIS doc\'s arithmetic (100 − deductions) and a floor note, not a false "−15 each"', () => {
    expect(viewSrc).toMatch(/100 \{'−'\} \{_ded\} = \{aiScore\}/);
    expect(viewSrc).toMatch(/floored_note/);
    expect(viewSrc).not.toMatch(/Minor: -5 each \(skip-nav/);
  });
  it('the dead "Passed (36%)" number is demoted to informational, not green/bold', () => {
    expect(viewSrc).toMatch(/Checks passed \(informational\)/);
    expect(viewSrc).not.toMatch(/text-green-700 font-bold"><span>Passed<\/span>/);
  });
  it('the Workbench recompute routes through the shared headline fn and derives completeness from fresh evidence (VDH-1)', () => {
    expect(viewSrc).toContain('const _wscore = _computeHeadline(_wvOk ? _wv.score : null, _wdet);');
    expect(viewSrc).toContain('_aiVerificationIncomplete: !_wvOk,');
    expect(viewSrc).toContain('const _freshBinding = await _viewCreateVerificationHtmlBinding(newHtml, _docPipeline);');
    expect(viewSrc).toContain("pdfUaSelfCheck: _sameBoundHtml ? ((_curFix.verificationCoverage && _curFix.verificationCoverage.pdfUaSelfCheck) || 'not-run') : 'not-run',");
  });
  it('the sticky dashboard bar neutralizes when the AI audit was incomplete (VDH-2)', () => {
    expect(viewSrc).toMatch(/pdfFixResult\._aiVerificationIncomplete \? 'text-slate-500' : 'text-emerald-800'/);
  });
});
