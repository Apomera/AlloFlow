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

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8') /* extracted-sources appended 2026-07-20 */ + ['misc_handlers_source.jsx','view_export_preview_source.jsx','udl_chat_source.jsx'].map(f => readFileSync(resolve(process.cwd(), f), 'utf8')).join('\n');
const pipelineSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── Mirrors of the shipped loop decisions ──
const shouldRevert = (detNew, detPrev, issuesNew, issuesPrev, vio) => {
  const detRegressed = (detNew !== null) && (typeof detPrev === 'number') && detNew < (detPrev - 1);
  const moreIssues = (vio === 0) && (issuesNew > issuesPrev); // AI-fix branch only
  return detRegressed || moreIssues;
};
// progress takes NO score arg (the noisy blend is not a signal); det term is null-safe; the
// AI-issue term is gated to the axe-CLEAN branch (vio===0).
const progressed = (vio, lastVio, det, lastDet, issues, lastIssues) =>
  vio < lastVio || (typeof det === 'number' && det > (lastDet + 1)) || (vio === 0 && issues < lastIssues);

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
  it('progress excludes the noisy blend, is null-safe, and gates the issue term to the axe-clean branch', () => {
    expect(src).toContain("const _progressed = _vio < lastViolations || (typeof _curDet === 'number' && _curDet > (lastDet + 1)) || (_vio === 0 && _aiIssues.length < lastIssues);");
  });
  it('revert keys on deterministic regression (baseline-guarded) / more issues (AI-branch-gated), not the blend', () => {
    expect(src).toContain("const _detRegressed = (_det !== null) && (typeof _curDet === 'number') && _det < (_curDet - 1);");
    expect(src).toContain("const _moreIssues = (_vio === 0) && ((reVerify.issues ? reVerify.issues.length : 0) > _aiIssues.length);");
    expect(src).toContain('if (!result._auditOnly && (_detRegressed || _moreIssues)) {');
    expect(src).not.toContain('if (newScore < (cur.afterScore || 0)) {');
  });
  it('AI-flagged contrast is routed to the deterministic fixer in the axe-clean branch', () => {
    expect(src).toContain('const _sr = sanitizeStyleForWCAG(_fixedHtml);');
    expect(src).toMatch(/_hasContrast = _aiIssues\.some[\s\S]*?1\\\.4\\\.3\|contrast/);
  });
});
