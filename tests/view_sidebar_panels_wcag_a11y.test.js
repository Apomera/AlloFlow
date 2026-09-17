import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
const built = readFileSync('view_sidebar_panels_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/view_sidebar_panels_module.js', 'utf8');

describe('Sidebar Panels WCAG 2.2 controls', () => {
  it('retains visible focus and explicit non-submit button behavior', () => {
    const outlineSuppressions = source
      .split(/\r?\n/)
      .filter((line) => /(?:focus(?:-visible)?:)?outline-none/.test(line));

    expect(outlineSuppressions.length).toBeGreaterThan(0);
    expect(outlineSuppressions.every((line) => /focus(?:-visible)?:ring(?:-|\b)/.test(line))).toBe(true);
    expect(source).not.toMatch(/<button\b(?![^>]*\btype=)/gs);
  });

  it('exposes the selected state of visual mode controls', () => {
    expect(source).toContain("aria-pressed={standardMode === 'ai'}");
    expect(source).toContain("aria-pressed={standardMode === 'manual'}");
    expect(source).toContain("aria-pressed={(window._dbqMode || 'standard') === mode}");
    expect(source).toContain('aria-pressed={!isUrlSearchMode}');
    expect(source).toContain('aria-pressed={isUrlSearchMode}');
  });

  it('groups related choices with programmatic labels', () => {
    expect(source).toContain('role="group" aria-labelledby="simplified-standard-mode-label"');
    expect(source).toContain('role="group" aria-labelledby="dbq-analysis-mode-label"');
  });

  // The adventure resource-mode control used to be a pair of aria-pressed
  // buttons in this file, pinned by the two tests above. It moved to
  // view_adventure_settings_source.jsx and was rebuilt as a <select>, so the old
  // string pins failed against markup that no longer exists here. Follow the
  // control rather than dropping the coverage: a <select> carries its own
  // selected state, so what needs pinning now is that it is still LABELLED and
  // still disables rather than silently ignoring a locked student.
  it('keeps the relocated adventure resource-mode control accessible', () => {
    const adventureSettings = readFileSync('view_adventure_settings_source.jsx', 'utf8');
    const line = adventureSettings
      .split(/\r?\n/)
      .find((text) => text.includes("id={id + '-resource-mode'}"));

    expect(line, 'the resource-mode control should still exist').toBeTruthy();
    expect(line).toMatch(/aria-label=\{label\('resource_setup'/);
    expect(line).toMatch(/value=\{resourceMode\}/);
    expect(line).toMatch(/disabled=\{locked\(\)/);
  });

  it('associates the upload and disclosure relationships', () => {
    expect(source).toContain('htmlFor="dbq-import-image"');
    expect(source).toContain('aria-controls="quiz-item-mix-panel"');
    expect(source).toContain('id="quiz-item-mix-panel"');
    expect(source).toContain("aria-current={activeView === 'persona' ? 'page' : undefined}");
  });

  it('honors reduced-motion preferences for animations and transitions', () => {
    const lines = source.split(/\r?\n/);
    const unguardedAnimations = lines
      .filter((line) => line.includes('animate-'))
      .filter((line) => !/motion-reduce:animate-none|motion-safe:|reducedMotion|prefers-reduced-motion/.test(line));
    const unguardedTransitions = lines
      .filter((line) => /transition-(?:all|colors|shadow|transform)/.test(line))
      .filter((line) => !line.includes('motion-reduce:transition-none'));

    expect(unguardedAnimations).toEqual([]);
    expect(unguardedTransitions).toEqual([]);
  });

  it('keeps root and deployed generated modules synchronized', () => {
    expect(deployed).toBe(built);
  });
});
