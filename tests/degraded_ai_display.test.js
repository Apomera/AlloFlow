// Honest degraded-AI score display (2026-06-20). Under a Gemini throttle the AI semantic audit can
// come back null/degraded/synthesized. When that happens the headline must show the RELIABLE
// deterministic structural score (clearly labeled "AI semantic audit incomplete"), NOT a misleading
// partial-AI number or a null-coerced 0. CRITICAL (adversarial correction): the degraded flag keys off
// score===null / _scoreDegraded / synthesized — NEVER _partialAudit, so a 29/30 audit that still
// produced a real number keeps its honest blend.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── Mirror of the pipeline degraded flag + score selection ──
const aiDegraded = (v) => !!(!v || v.score === null || v._scoreDegraded || v.synthesized);
const finalScore = (v, det, axeAvailable) => {
  const ai = v ? v.score : null;
  // weakest-layer-governs (2026-06-21): headline = min(content, automated), NOT a mean.
  if (ai !== null && !aiDegraded(v) && axeAvailable) return { score: Math.min(ai, det), incomplete: false };
  if (aiDegraded(v) && axeAvailable) return { score: det, incomplete: true };
  return { score: ai, incomplete: false }; // axe unavailable → AI-only
};

describe('degraded flag — what counts as "AI did not produce a trustworthy score"', () => {
  it('no audit / null score / explicit degrade / synthesized stand-in → degraded', () => {
    expect(aiDegraded(null)).toBe(true);
    expect(aiDegraded({ score: null })).toBe(true);
    expect(aiDegraded({ score: 45, _scoreDegraded: true })).toBe(true);
    expect(aiDegraded({ score: 90, synthesized: true })).toBe(true);
  });
  it('a real score with no degrade flags is TRUSTWORTHY (not degraded)', () => {
    expect(aiDegraded({ score: 90 })).toBe(false);
  });
  it('KEY: a partial-but-scored audit (_partialAudit) is NOT degraded — keeps its blend', () => {
    expect(aiDegraded({ score: 70, _partialAudit: true })).toBe(false);
  });
});

describe('score selection — show the reliable structural number when AI is degraded', () => {
  it("tonight's case: AI nulled by the floor, axe clean (det 90) → headline 90 + incomplete (not null/45)", () => {
    expect(finalScore({ score: null, _scoreDegraded: true }, 90, true)).toEqual({ score: 90, incomplete: true });
  });
  it('a synthesized axe-only stand-in → deterministic headline + incomplete (no fake AI verify)', () => {
    expect(finalScore({ score: 88, synthesized: true }, 88, true)).toEqual({ score: 88, incomplete: true });
  });
  it('a normal complete audit → min(content, automated), not flagged incomplete', () => {
    expect(finalScore({ score: 80 }, 90, true)).toEqual({ score: 80, incomplete: false }); // min(80,90)=80
  });
  it('a partial-but-scored audit keeps the governing-layer score (the adversarial guard)', () => {
    expect(finalScore({ score: 70, _partialAudit: true }, 90, true)).toEqual({ score: 70, incomplete: false }); // min(70,90)=70
  });
});

describe('anti-drift: pipeline ships the degraded flag + deterministic fallback', () => {
  it('degraded keyed off null/_scoreDegraded/synthesized, NOT _partialAudit', () => {
    expect(pipeSrc).toMatch(/_aiDegraded = !verification \|\| verification\.score === null \|\| verification\._scoreDegraded \|\| verification\.synthesized/);
    expect(pipeSrc).not.toMatch(/_aiDegraded =[^\n]*_partialAudit/);
  });
  it('the deterministic-fallback branch sets finalAfterScore + the incomplete flag', () => {
    expect(pipeSrc).toMatch(/\} else if \(_aiDegraded && deterministicScore !== null\) \{/);
    expect(pipeSrc).toMatch(/finalAfterScore = deterministicScore;\s*\n\s*_aiVerificationIncomplete = true;/);
  });
  it('(2026-06-22) the headline governs off ANY deterministic engine (axe OR Equal Access), not axe-only', () => {
    // The bug: deterministicScore was computed axe-ONLY, so when axe failed but EA succeeded it went null,
    // the blend gate (which required axeScoreAvailable) was skipped, and the big AFTER number showed the
    // raw AI score (e.g. 100) while the caption correctly said the governing layer was automated (90).
    expect(pipeSrc).toMatch(/const deterministicScore = \(axeScoreAvailable && eaScoreAvailable\)/);
    expect(pipeSrc).toMatch(/axeScoreAvailable \? axeResults\.score : \(eaScoreAvailable \? eaResults\.score : null\)/);
    // both the blend gate and the AI-only fallback now key off deterministicScore, not axeScoreAvailable
    expect(pipeSrc).toMatch(/if \(finalAfterScore !== null && !_aiDegraded && deterministicScore !== null\) \{/);
    expect(pipeSrc).toMatch(/\} else if \(deterministicScore === null\) \{/);
    expect(pipeSrc).not.toMatch(/!_aiDegraded && axeScoreAvailable\) \{/); // old axe-only gate is gone
  });
  it('the result object carries the flags + de-blends when incomplete', () => {
    expect(pipeSrc).toMatch(/_scoreIsBlended: !axeCoreFailed && !_aiVerificationIncomplete/);
    expect(pipeSrc).toMatch(/_aiVerificationIncomplete,/);
    expect(pipeSrc).toMatch(/_scoreSource: _aiVerificationIncomplete \? 'deterministic-only'/);
  });
});

describe('anti-drift: the view renders it honestly', () => {
  it('reads the incomplete flag + neutralises the headline + suppresses +gain', () => {
    expect(viewSrc).toMatch(/const _aiIncomplete = !!pdfFixResult\._aiVerificationIncomplete/);
    expect(viewSrc).toMatch(/_aiIncomplete \? 'text-slate-500'/);
    expect(viewSrc).toMatch(/\{gain > 0 && !_aiIncomplete &&/);
  });
  it('the breakdown shows a structural-only label, and the summary line is reconciled (no "Score unavailable" contradiction)', () => {
    expect(viewSrc).toMatch(/structural\/automated checks only; AI semantic audit incomplete/);
    expect(viewSrc).toMatch(/pdfFixResult\._aiVerificationIncomplete[\s\S]{0,200}AI semantic verification incomplete/);
  });
  it('(2026-06-22) the "ready" headline is qualified while still-working / fidelity-limited (not an unconditional "ready")', () => {
    expect(viewSrc).toMatch(/const _stillWorking = pdfAutoContinueRunning \|\| pdfFixLoading;/);
    expect(viewSrc).toMatch(/pdf_audit\.results\.ready_heading_working/);
    expect(viewSrc).toMatch(/pdf_audit\.results\.ready_heading_verify/);
    // the still-working / fidelity branches must be chosen BEFORE the plain 'ready' fallback
    expect(viewSrc).toMatch(/_stillWorking[\s\S]{0,160}ready_heading_working[\s\S]{0,200}_fidelity[\s\S]{0,160}ready_heading_verify[\s\S]{0,200}ready_heading'\)/);
  });
  it('a section with no score renders neutral "not scored", not red 0; and the loop bails when AI-throttled + axe-clean', () => {
    expect(viewSrc).toMatch(/const _hasScore = typeof chunk\.score === 'number'/);
    expect(viewSrc).toMatch(/_hasScore \? chunk\.score \+ '\/100' : \(t\('pdf_audit\.live_chunk\.not_scored'\)/);
    expect(viewSrc).toMatch(/const _aiThrottledClean = !!\(r && r\._aiVerificationIncomplete && r\.axeAudit && r\.axeAudit\.totalViolations === 0\)/);
  });
  it('(2026-06-22) the review-card render site ALSO guards the score (no blank red /100) and flags 0-change sections', () => {
    // neutral slate branch added to the card's scoreColor ladder when the chunk has no numeric score
    expect(viewSrc).toMatch(/scoreColor = !_hasScore \? 'slate' :/);
    expect(viewSrc).toMatch(/scoreColor === 'slate' \? 'bg-slate-50 border-slate-200'/);
    // the card renders the honest "not scored" label instead of an empty {chunk.score} + red /100
    expect(viewSrc).toMatch(/_hasScore[\s\S]{0,40}\? <>\{chunk\.score\}<span className="text-\[11px\] opacity-60">\/100/);
    expect((viewSrc.match(/t\('pdf_audit\.live_chunk\.not_scored'\)/g) || []).length).toBeGreaterThanOrEqual(2); // sister list + card both guard
    // a section that passed integrity but had 0 fixes gets a "no changes" pill so green badges don't read as "edited"
    expect(viewSrc).toMatch(/const _noChanges = !isWorking && !chunk\.usedOriginal && \(\(chunk\.deterministicFixCount \|\| 0\) \+ \(chunk\.surgicalFixCount \|\| 0\)\) === 0/);
    expect(viewSrc).toMatch(/pdf_audit\.live_chunk\.no_changes_card/);
  });
});
