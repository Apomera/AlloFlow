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
  if (ai !== null && !aiDegraded(v) && axeAvailable) return { score: Math.round((ai + det) / 2), incomplete: false };
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
  it('a normal complete audit → real 50/50 blend, not flagged incomplete', () => {
    expect(finalScore({ score: 80 }, 90, true)).toEqual({ score: 85, incomplete: false });
  });
  it('a partial-but-scored audit keeps the blend (the adversarial guard)', () => {
    expect(finalScore({ score: 70, _partialAudit: true }, 90, true)).toEqual({ score: 80, incomplete: false });
  });
});

describe('anti-drift: pipeline ships the degraded flag + deterministic fallback', () => {
  it('degraded keyed off null/_scoreDegraded/synthesized, NOT _partialAudit', () => {
    expect(pipeSrc).toMatch(/_aiDegraded = !verification \|\| verification\.score === null \|\| verification\._scoreDegraded \|\| verification\.synthesized/);
    expect(pipeSrc).not.toMatch(/_aiDegraded =[^\n]*_partialAudit/);
  });
  it('the deterministic-fallback branch sets finalAfterScore + the incomplete flag', () => {
    expect(pipeSrc).toMatch(/\} else if \(_aiDegraded && axeScoreAvailable\) \{/);
    expect(pipeSrc).toMatch(/finalAfterScore = deterministicScore;\s*\n\s*_aiVerificationIncomplete = true;/);
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
  it('a section with no score renders neutral "not scored", not red 0; and the loop bails when AI-throttled + axe-clean', () => {
    expect(viewSrc).toMatch(/const _hasScore = typeof chunk\.score === 'number'/);
    expect(viewSrc).toMatch(/_hasScore \? chunk\.score \+ '\/100' : \(t\('pdf_audit\.live_chunk\.not_scored'\)/);
    expect(viewSrc).toMatch(/const _aiThrottledClean = !!\(r && r\._aiVerificationIncomplete && r\.axeAudit && r\.axeAudit\.totalViolations === 0\)/);
  });
});
