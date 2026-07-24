import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
const built = readFileSync('view_sidebar_panels_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/view_sidebar_panels_module.js', 'utf8');

describe('Sidebar Panels WCAG 2.2 controls', () => {
  it('retains visible focus and explicit non-submit button behavior', () => {
    expect(source).not.toMatch(/(?:focus(?:-visible)?:)?outline-none/);
    expect(source).not.toMatch(/<button\b(?![^>]*\btype=)/gs);
  });

  it('exposes the selected state of visual mode controls', () => {
    expect(source).toContain("aria-pressed={factionResourceMode === 'ai'}");
    expect(source).toContain("aria-pressed={factionResourceMode === 'manual'}");
    expect(source).toContain("aria-pressed={standardMode === 'ai'}");
    expect(source).toContain("aria-pressed={standardMode === 'manual'}");
    expect(source).toContain("aria-pressed={(window._dbqMode || 'standard') === mode}");
    expect(source).toContain('aria-pressed={!isUrlSearchMode}');
    expect(source).toContain('aria-pressed={isUrlSearchMode}');
  });

  it('groups related choices with programmatic labels', () => {
    expect(source).toContain('role="group" aria-labelledby="adventure-system-state-mode-label"');
    expect(source).toContain('role="group" aria-labelledby="simplified-standard-mode-label"');
    expect(source).toContain('role="group" aria-labelledby="dbq-analysis-mode-label"');
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
