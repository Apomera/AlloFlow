import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('student_interaction_source.jsx', 'utf8');
const builder = readFileSync('_build_student_interaction_module.js', 'utf8');

describe('Student Interaction status and motion accessibility', () => {
  it('announces grading as one atomic busy status without exposing spinner graphics', () => {
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true" aria-busy="true"');
    expect(source).toContain('<div className="relative" aria-hidden="true">');
    expect(source).toContain("{t('mastery.analyzing')}");
    expect(source).toContain("{t('mastery.criteria_check')}");
  });

  it('announces revision and mastery state changes through their visible headings', () => {
    expect(source).toContain('role="status" aria-live="polite">{t(\'mastery.revision_required\')}');
    expect(source).toContain('role="status" aria-live="polite">{t(\'mastery.excellent_work\')}');
  });

  it('provides reduced-motion fallbacks for all animated states and transforms', () => {
    expect(source.match(/animate-in motion-reduce:animate-none/g)).toHaveLength(4);
    expect(source.match(/animate-spin motion-reduce:animate-none/g)).toHaveLength(2);
    expect(source.match(/animate-pulse motion-reduce:animate-none/g)).toHaveLength(2);
    expect(source.match(/transition-all motion-reduce:transition-none/g)).toHaveLength(5);
    expect(source.match(/transition-transform motion-reduce:transition-none motion-reduce:transform-none/g)).toHaveLength(2);
  });

  it('uses explicit button types and targets WCAG 2.2 AA in the canonical builder', () => {
    expect(source.match(/<button\b(?![^>]*\btype=)[^>]*>/gs) || []).toEqual([]);
    expect(builder).toContain('// WCAG 2.2 AA: Accessibility CSS');
    expect(builder).not.toContain('// WCAG 2.1 AA: Accessibility CSS');
  });
});
