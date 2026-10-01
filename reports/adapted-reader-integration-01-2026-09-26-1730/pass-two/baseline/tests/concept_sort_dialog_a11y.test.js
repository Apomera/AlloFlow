import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Concept Sort full-screen dialog accessibility', () => {
  it.each(files)('%s exposes a named modal using shared focus management', (_path, source) => {
    expect(source).toContain('concept-sort-game-title');
    expect(source).toContain('conceptSortDialogRef');
    expect(source).toContain('useGameDialogFocus');
  });

  it.each(files)('%s retains keyboard select-and-place drag alternatives', (_path, source) => {
    expect(source).toContain('keyboardSelectedItemId');
    expect(source).toContain('handleCardKeyDown');
    expect(source).toContain('handleKeyboardMove');
    expect(source).toContain('data-move-here');
  });

  it('focuses a named 44 CSS-pixel Close action and hides its icon', () => {
    const source = files[0][1];
    expect(source).toContain('ref={conceptSortCloseRef}');
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain('<X size={24} aria-hidden="true"/>');
  });

  it('suppresses full-screen entry motion when requested', () => {
    expect(files[0][1]).toContain("useReducedMotion() ? '' : ' animate-in fade-in duration-300'");
  });
});