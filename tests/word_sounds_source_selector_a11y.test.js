import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('word_sounds_setup_source.jsx', 'utf8');

describe('Word Sounds source selector keyboard behavior', () => {
  it('provides Enter and Space behavior for all active source toggles', () => {
    expect(source.match(/aria-pressed=\{include(?:Glossary|Family|Custom|SightWords|AI)\} onKeyDown=/g)?.length).toBe(5);
    expect(source.match(/e\.key === 'Enter' \|\| e\.key === ' '/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('removes the disabled lesson-plan selector from sequential focus', () => {
    expect(source).toContain("tabIndex={sessionType === 'assessment' ? -1 : 0}");
    expect(source).toContain('aria-disabled={sessionType === \'assessment\'} aria-pressed={includeLessonPlan}');
    expect(source).toContain("sessionType !== 'assessment' && (e.key === 'Enter' || e.key === ' ')");
  });

  it('synchronizes both generated module copies', () => {
    expect(fs.readFileSync('prismflow-deploy/public/word_sounds_setup_module.js', 'utf8')).toBe(fs.readFileSync('word_sounds_setup_module.js', 'utf8'));
    expect(fs.readFileSync('_build_word_sounds_setup_module.js', 'utf8')).toContain('// WCAG 2.2 AA: Accessibility CSS');
  });
});
