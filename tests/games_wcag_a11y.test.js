import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const source = read('games_source.jsx');
const built = read('games_module.js');
const deployed = read('desktop/web-app/public/games_module.js');

describe('Games systemic WCAG safeguards', () => {
  it('keeps generated artifacts synchronized', () => {
    expect(deployed).toBe(built);
  });

  it('preserves native focus indicators throughout game controls', () => {
    expect(source).not.toContain('outline-none');
    expect(source).toContain('focus:ring-2');
  });

  it('uses one visible-control query across main and nested game dialogs', () => {
    expect(source).toContain('const getGameDialogFocusable = (dialog)');
    expect(source).toContain('element.getClientRects().length > 0');
    expect(source).toContain("element.getAttribute('aria-hidden') !== 'true'");
    expect(source.match(/getGameDialogFocusable\(event\.currentTarget\)/g) || []).toHaveLength(12);
    expect(source).not.toContain('Array.from(event.currentTarget.querySelectorAll');
  });

  it('contains focus when a full-screen dialog container itself has focus', () => {
    expect(source).toContain('document.activeElement === dialog');
    expect(source).toContain('(event.shiftKey ? last : first).focus()');
    expect(source).toContain('previousFocus?.isConnected');
  });

  it('guards every game animation for reduced-motion users', () => {
    const unguarded = source.split(/\r?\n/).filter((line) =>
      line.includes('animate-') &&
      !line.includes('motion-safe:') &&
      !line.includes('motion-reduce:') &&
      !line.includes('reducedMotion') &&
      !line.includes('useReducedMotion') &&
      !line.includes("classList.remove('animate-shake')"),
    );
    expect(unguarded).toEqual([]);
    expect(source).toContain("if (!useReducedMotion()) btn.classList.add('animate-shake')");
  });
});
