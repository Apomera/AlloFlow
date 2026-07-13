import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'prismflow-deploy/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Cause and Effect Sort dialog accessibility', () => {
  it.each(files)('%s exposes named workspace and completion dialogs', (_path, source) => {
    expect(source).toContain('cause-effect-game-title');
    expect(source).toContain('cause-effect-win-title');
    expect(source).toContain('cause-effect-win-description');
    expect(source).toContain('useGameDialogFocus');
  });

  it.each(files)('%s provides initial completion focus and keyboard containment', (_path, source) => {
    expect(source).toContain('playAgainRef');
    expect(source).toMatch(/event\.key === ["']Escape["']/);
    expect(source).toMatch(/event\.key !== ["']Tab["']/);
  });

  it('retains keyboard placement alternatives and focus return after replay', () => {
    const source = files[0][1];
    expect(source).toContain('handleItemKeyDown');
    expect(source).toContain('handleKeyboardMove');
    expect(source).toContain('gameContainerRef.current?.focus()');
  });

  it('uses unique refs and 44 CSS-pixel actions', () => {
    const source = files[0][1];
    expect(source.match(/const causeEffectCloseRef/g)).toHaveLength(1);
    expect(source).toContain('ref={causeEffectCloseRef}');
    expect(source.match(/min-h-11/g).length).toBeGreaterThanOrEqual(3);
  });
});