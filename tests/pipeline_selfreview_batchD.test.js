// Batch D — self-review refinements of this session's own fixes (2026-06-15 fresh review):
//   #10 lang-text-floor: CJK translation targets get a 0.25 floor (0.5 wrongly rejected valid
//       Chinese/Japanese/Korean translations → silent fallback to untranslated English)
//   #11 recov-score-order: the post-recovery re-audit must base success on the FRESH axe result,
//       not the stale pre-recovery one, and fall back to AI-only on a transient axe failure.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('#10 lang-text-floor — target-aware CJK floor', () => {
  // mirror of the shipped floor selection
  const floorFor = (langCode, targetLang) =>
    (/\b(zh|ja|ko)\b/i.test(String(langCode || '')) || /chinese|japanese|korean/i.test(String(targetLang || ''))) ? 0.25 : 0.5;

  it('selects 0.25 for CJK targets, 0.5 otherwise', () => {
    expect(floorFor('zh', 'Chinese')).toBe(0.25);
    expect(floorFor('ja', 'Japanese')).toBe(0.25);
    expect(floorFor('', 'Korean')).toBe(0.25);
    expect(floorFor('es', 'Spanish')).toBe(0.5);
    expect(floorFor('', '')).toBe(0.5);
  });
  it('a correct ~0.3-ratio CJK translation passes at 0.25 but would FAIL the old flat 0.5', () => {
    // 100-char English chunk → ~30-char Chinese translation (CJK encodes denser)
    expect(30 >= 100 * floorFor('zh', 'Chinese')).toBe(true);  // fixed: accepted
    expect(30 >= 100 * 0.5).toBe(false);                       // old flat floor wrongly rejected it
  });
  it('an empty/gutted chunk still fails at the CJK floor (the protection holds)', () => {
    expect(0 >= 100 * floorFor('zh', 'Chinese')).toBe(false);
  });
  it('anti-drift: the shipped gate uses the target-aware _floor', () => {
    expect(src).toContain('textCharCount(resp) >= textCharCount(chunk) * _floor');
    expect(src).toContain("? 0.25 : 0.5;");
  });
});

describe('#11 recov-score-order — re-audit success keys off the FRESH axe result', () => {
  it('anti-drift: _reAxeOk is computed from _reAxe (fresh), not the stale axeResults', () => {
    // The inline check became the shared _alloUsableAxeAudit guard, which is
    // strictly stronger: it also requires totalViolations to be a finite,
    // non-negative number, so an axe result carrying a score but no usable
    // violation count no longer reads as OK. Pin the call and the guard body.
    expect(src).toContain('const _reAxeOk = _alloUsableAxeAudit(_reAxe);');
    expect(src).toMatch(/function _alloUsableAxeAudit\(audit\) \{[\s\S]{0,200}Number\.isFinite\(audit\.score\)[\s\S]{0,120}Number\.isFinite\(audit\.totalViolations\)[\s\S]{0,80}audit\.totalViolations >= 0/);
    // det is computed from the fresh values, not the possibly-stale prior results
    expect(src).toMatch(/const _reDet = _reAxeOk\s*\n\s*\? \(_reEaOk \? Math\.min\(_reAxe\.score, _reEa\.score\) : _reAxe\.score\)\s*\n\s*: \(_reEaOk \? _reEa\.score : null\);/);
    expect(src).toContain('axeResults = _reAxeOk ? _reAxe : null;');
  });
  it('anti-drift: a failed re-audit falls back to AI-only and reports axe as failed (consistent triage)', () => {
    // What was one unconditional assignment is now a three-way ladder, because
    // `if (_reAi !== null) finalAfterScore = _reAi` took the AI number even when
    // that audit was DEGRADED and even when fresh deterministic evidence existed
    // and was lower — i.e. it silently abandoned weakest-layer on exactly the
    // path where the score had just been invalidated by recovery mutations.
    //   AI usable + det usable  -> weakest-layer min, verification complete
    //   AI degraded + det usable -> deterministic headline, marked incomplete
    //   no det evidence          -> AI-only, axe reported failed (no stale blend)
    expect(src).toContain('if (_reAi !== null && !_reAiDegraded && _reDet !== null) {');
    expect(src).toContain('} else if (_reAiDegraded && _reDet !== null) {');
    expect(src).toContain('} else if (_reDet === null) {');
    expect(src).toContain('finalAfterScore = _reAi;');
    expect(src).toContain('axeCoreFailed = !_reAxeOk;');
  });
});
