import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_glossary_source.jsx', 'utf8');
const built = readFileSync('view_glossary_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/view_glossary_module.js', 'utf8');

describe('Glossary WCAG 2.2 interaction safeguards', () => {
  it('preserves visible keyboard focus throughout the view', () => {
    expect(source).not.toMatch(/(?:focus(?:-visible)?:)?outline-none/);
  });

  it('restricts modal focus to rendered, exposed controls', () => {
    expect(source).toContain("el.getAttribute('aria-hidden') !== 'true' && el.getClientRects().length > 0");
    expect(source).toContain('document.activeElement === container');
    expect(source).toContain('(e.shiftKey ? last : first).focus()');
    expect(source).toContain('document.activeElement === drawer');
  });

  it('restores focus only when the previous control remains connected', () => {
    expect(source.match(/previouslyFocused\?\.isConnected/g)).toHaveLength(3);
  });

  it('provides reduced-motion handling for every animation utility', () => {
    const unguardedAnimationLines = source
      .split(/\r?\n/)
      .filter((line) => line.includes('animate-'))
      .filter((line) => !/motion-safe:|motion-reduce:|reducedMotion|prefers-reduced-motion/.test(line));

    expect(unguardedAnimationLines).toEqual([]);
  });

  it('keeps root and deployed generated modules synchronized', () => {
    expect(deployed).toBe(built);
  });
});
