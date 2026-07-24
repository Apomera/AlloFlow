import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const source = read('view_renderers_source.jsx');
const built = read('view_renderers_module.js');
const deployed = read('desktop/web-app/public/view_renderers_module.js');

describe('View Renderers WCAG safeguards', () => {
  it('keeps generated artifacts synchronized', () => {
    expect(deployed).toBe(built);
  });

  it('preserves visible native focus indicators', () => {
    expect(source).not.toContain('outline-none');
  });

  it('contains and restores focus for the programmatic 3D dialog', () => {
    expect(source).toContain("overlay.setAttribute('role', 'dialog')");
    expect(source).toContain("overlay.setAttribute('aria-modal', 'true')");
    expect(source).toContain("overlay.setAttribute('aria-labelledby', 'vo-cg3d-title')");
    expect(source).toContain("overlay.setAttribute('aria-describedby', 'vo-cg3d-hint')");
    expect(source).toContain('var previouslyFocused = document.activeElement');
    expect(source).toContain('closeBtn.focus()');
    expect(source).toContain("if (e.key !== 'Tab') return");
    expect(source).toContain("if (e.key === 'Escape')");
    expect(source).toContain('previouslyFocused.focus()');
    expect(source).toContain('min-width:44px;min-height:44px');
  });

  it('respects reduced motion for all activity animations', () => {
    const animations = source.match(/(?<![-\w:])animate-(?:spin|pulse|bounce|ping)/g) || [];
    const protectedAnimations = source.match(/(?<![-\w:])animate-(?:spin|pulse|bounce|ping) motion-reduce:animate-none/g) || [];
    expect(animations).toHaveLength(6);
    expect(protectedAnimations).toHaveLength(animations.length);
    expect(source).toContain('motion-safe:animate-spin');
  });

  it('keeps count-up stopwatches passive for assistive technology', () => {
    expect(source.match(/tabular-nums" role="status"/g) || []).toHaveLength(0);
    expect(source).toContain('// Stopwatch: ticks while a run is live, freezes on a win.');
    expect(source).toContain('// Stopwatch (count-up; freezes when the walk is scored).');
  });

  it('names the generated canvas fallback', () => {
    expect(source).toContain("c.setAttribute('role', 'img')");
    expect(source).toContain("c.setAttribute('aria-label', 'Generated memory palace illustration stamp')");
  });
});
