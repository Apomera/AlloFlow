// Auto-fix loop noise-robustness (loop fixes + review F1–F9 & re-review #2/#3, 2026-06-15).
// runAutoFixLoop bugs fixed:
//   (1) commit-or-revert gated on the BLENDED score (half AI-rubric, SD ~5) → reverted genuine
//       improvements on AI noise → stagnation → stopped far short of target.
//   (2) progress measured by the noisy score → noise faked a stall in the axe-clean phase.
// Fix: revert ONLY on a real regression — deterministic component dropped (when known), or MORE AI
// issues (AI-fix branch only). Progress from reliable signals only: fewer violations, a MEANINGFULLY
// higher deterministic score (±1, null-safe), or fewer issues (AI branch only). The deterministic
// baseline reads the audit OBJECTS that exist on a fresh fix (cur.axeAudit.score, not a pre-loop
// undefined cur.axeScore), is stamped exactly each round (_detScore), and is null (never a fabricated
// 100) when no engine scored. Contrast (1.4.3) routes to sanitizeStyleForWCAG.

// @vitest-environment jsdom
//
// L12 (audit 2026-07-26): these two decisions used to be tested through hand-written MIRRORS of
// the loop's inline logic. A mirror proves the mirror self-consistent and nothing else — and these
// are the decisions that keep or throw away a round of a teacher's work. They now live in the
// pipeline's golden-tested _alloLoopPolicy, and these tests call the REAL exported functions; the
// loop delegates to the same ones, with a byte-identical inline fallback only for the
// module-older-than-host case (pinned below).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const src = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8') /* extracted-sources appended 2026-07-20 */ + ['misc_handlers_source.jsx','view_export_preview_source.jsx','udl_chat_source.jsx'].map(f => readFileSync(resolve(process.cwd(), f), 'utf8')).join('\n');
const pipelineSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

let policy;
beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  policy = window.AlloModules.createDocPipeline.loopPolicy;
});

// Thin argument adapters over the REAL policy — same call shapes the old mirrors had, so the cases
// below read unchanged, but every one now exercises shipped code.
const shouldRevert = (detNew, detPrev, issuesNew, issuesPrev, vio) =>
  policy.roundRegressed({ newDet: detNew, prevDet: detPrev, newIssues: issuesNew, prevIssues: issuesPrev, violations: vio });
// progress takes NO score arg (the noisy blend is not a signal); det term is null-safe; the
// AI-issue term is gated to the axe-CLEAN branch (vio===0).
const progressed = (vio, lastVio, det, lastDet, issues, lastIssues) =>
  policy.roundProgressed({ violations: vio, prevViolations: lastVio, newDet: det, prevDet: lastDet, newIssues: issues, prevIssues: lastIssues });

describe('noise-aware commit-or-revert', () => {
  it('KEEPS a round when the blend dipped on AI noise but deterministic held + no new issues', () => {
    expect(shouldRevert(90, 90, 10, 10, 0)).toBe(false);
  });
  it('REVERTS a real deterministic regression (axe/EqualAccess got worse)', () => {
    expect(shouldRevert(84, 90, 10, 10, 0)).toBe(true);
  });
  it('REVERTS more AI issues in the AI-fix branch', () => {
    expect(shouldRevert(90, 90, 13, 10, 0)).toBe(true);
  });
  it('does NOT revert a deterministic axe fix just because the noisy AI flagged more issues (F5)', () => {
    expect(shouldRevert(90, 90, 13, 10, 5)).toBe(false);
  });
  it('does NOT claim a regression when the deterministic baseline is unknown/null (degenerate pipeline, #3)', () => {
    expect(shouldRevert(85, null, 10, 10, 0)).toBe(false);
  });
  it('KEEPS a genuine improvement (deterministic up, fewer issues)', () => {
    expect(shouldRevert(93, 90, 7, 10, 0)).toBe(false);
  });
  it('tolerates a 1-point deterministic flutter (not a regression)', () => {
    expect(shouldRevert(89, 90, 10, 10, 0)).toBe(false);
  });
});

describe('noise-aware progress detection', () => {
  it('counts progress when AI issues drop in the axe-clean branch (the key fix)', () => {
    expect(progressed(0, 0, 90, 90, 8, 10)).toBe(true);
  });
  it('counts progress on a meaningfully higher deterministic score', () => {
    expect(progressed(0, 0, 92, 90, 10, 10)).toBe(true);
  });
  it('a deterministic flutter within ±1 is NOT progress (no stall-counter oscillation, F6)', () => {
    expect(progressed(0, 0, 91, 90, 10, 10)).toBe(false);
  });
  it('an AI-issue drop in the axe-VIOLATION branch is NOT progress (no oscillation reset, #2)', () => {
    expect(progressed(3, 3, 70, 70, 8, 10)).toBe(false);
  });
  it('a genuine stall (nothing reliable improved) is NOT progress', () => {
    expect(progressed(0, 0, 90, 90, 10, 10)).toBe(false);
  });
  it('fewer violations is progress', () => {
    expect(progressed(2, 5, 90, 90, 10, 10)).toBe(true);
  });
});

describe('anti-drift: the loop carries the corrected logic', () => {
  it('deterministic baseline reads the audit OBJECT (cur.axeAudit.score); no fabricated baseline anywhere', () => {
    expect(src).toContain('const _curAxe = (cur.axeAudit && typeof cur.axeAudit.score === \'number\') ? cur.axeAudit.score : null;');
    expect(src).toContain('const _curDet = (typeof cur._detScore === \'number\') ? cur._detScore');
    expect(src).not.toContain('typeof cur.axeScore === \'number\' ? cur.axeScore : 100'); // original HIGH bug gone
    expect(src).not.toContain(': (_curEa !== null ? _curEa : 100));'); // residual fabricated-100 terminal gone (#3)
  });
  it('the exact deterministic component is stamped each committed round (_detScore)', () => {
    expect(pipelineSrc).toContain('_detScore: _det,');
    expect(src).toContain('const _det = _mergedRound._detScore;');
  });
  // L12: both decisions are now the pipeline's, so the anti-drift job is to prove the LOOP
  // delegates rather than to re-assert an inline expression the cases above already exercise.
  it('the loop delegates BOTH round decisions to the golden-tested policy', () => {
    expect(src).toContain('const _progressed = _loopPolicy.roundProgressed({');
    expect(src).toContain('const _roundRegressed = _loopPolicy.roundRegressed({');
    expect(src).toContain('if (!result._auditOnly && _roundRegressed) {');
    expect(src).not.toContain('if (newScore < (cur.afterScore || 0)) {'); // the original blend-gated bug
  });

  it('the policy is resolved from the pipeline, with an inline fallback for an older module', () => {
    expect(src).toContain('window.AlloModules.createDocPipeline.loopPolicy) || {');
    // The fallback must stay byte-equivalent to the policy, never independently "improved" —
    // that is exactly the drift this extraction removes.
    expect(src).toContain('must never be "improved" independently');
  });

  it('the shipped policy is what these tests call', () => {
    expect(pipelineSrc).toContain('roundRegressed: function (p) {');
    expect(pipelineSrc).toContain('roundProgressed: function (p) {');
    expect(typeof policy.roundRegressed).toBe('function');
    expect(typeof policy.roundProgressed).toBe('function');
  });
  it('AI-flagged contrast is routed to the deterministic fixer in the axe-clean branch', () => {
    expect(src).toContain('const _sr = sanitizeStyleForWCAG(_fixedHtml);');
    expect(src).toMatch(/_hasContrast = _aiIssues\.some[\s\S]*?1\\\.4\\\.3\|contrast/);
  });
});
