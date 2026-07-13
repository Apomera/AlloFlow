import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'prismflow-deploy/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Crossword dialog accessibility', () => {
  it.each(files)('%s exposes a named focus-managed modal dialog and visible grid target', (_path, source) => {
    expect(source).toContain('crossword-game-title');
    expect(source).toContain('crosswordDialogRef');
    expect(source).toContain('useGameDialogFocus');
    expect(source).toContain('crosswordGridRef');
  });

  it('uses the visible grid for keyboard input without trapping Tab', () => {
    const source = files[0][1];
    expect(source).toContain('role="grid"');
    expect(source).toContain('onKeyDown={handleKeyDown}');
    expect(source).not.toContain("e.key === 'Tab' || e.key === 'Enter'");
    expect(source).not.toContain("t('common.hidden_input')");
    expect(source).not.toContain('onBlur={(e) => e.target.focus()');
    expect(source).not.toContain('pointer-events-none focus:outline-none');
  });

  it('makes both clue lists keyboard operable and returns focus to the grid', () => {
    const source = files[0][1];
    expect(source.match(/role="button"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source.match(/onKeyDown=\{\(event\) => \{/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source.match(/crosswordGridRef\.current\?\.focus\(\)/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('provides a 44 CSS-pixel close target, decorative icon hiding, and reduced-motion entry', () => {
    const source = files[0][1];
    expect(source).toContain('ref={crosswordCloseRef}');
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain('<X size={24} aria-hidden="true" />');
    expect(source).toContain('motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300');
  });
});