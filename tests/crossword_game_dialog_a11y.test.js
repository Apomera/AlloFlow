import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

const component = files[0][1].slice(files[0][1].indexOf('const CrosswordGame ='), files[0][1].indexOf('const SyntaxScramble ='));

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

  it('exposes a complete active-descendant grid structure', () => {
    expect(component).toContain('aria-rowcount={grid.length}');
    expect(component).toContain('aria-colcount={grid.length}');
    expect(component).toContain('aria-activedescendant={selectedCell ?');
    expect(component).toContain('role="row" className="contents"');
    expect(component).toContain('id={`crossword-cell-${r}-${c}`}');
    expect(component).toContain('aria-rowindex={r + 1}');
    expect(component).toContain('aria-colindex={c + 1}');
    expect(component).toContain('aria-disabled="true"');
  });

  it('uses native clue buttons with separate speech controls and returns focus to the grid', () => {
    expect(component).toContain('selectCrosswordClue');
    expect(component).toContain("onClick={() => selectCrosswordClue(c, 'across')}");
    expect(component).toContain("onClick={() => selectCrosswordClue(c, 'down')}");
    expect(component).toContain('</button>\n                               <SpeakButton');
    expect(component).not.toContain('role="button"');
    expect(component).not.toContain('onKeyDown={(event) =>');
    expect(component).toContain('crosswordGridRef.current?.focus()');
  });

  it('provides 44 CSS-pixel actions, strong focus, reflow, and decorative icon hiding', () => {
    expect(component).toContain('ref={crosswordCloseRef}');
    expect(component.split('min-h-11').length - 1).toBeGreaterThanOrEqual(7);
    expect(component).toContain('focus:ring-offset-2');
    expect(component).toContain('flex flex-wrap justify-between');
    expect(component).toContain('<X size={24} aria-hidden="true" />');
    expect(component).toContain('<HelpCircle size={12} aria-hidden="true"/>');
  });

  it('announces incorrect checks and reveal actions and suppresses reduced-motion confetti', () => {
    expect(component).toContain('incorrectCount');
    expect(component).toContain('announce_incorrect_count');
    expect(component).toContain('announce_revealed');
    expect(component).toContain('isWon && !reducedMotion && <ConfettiExplosion />');
    expect(component).toContain('motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300');
  });
});