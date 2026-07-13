import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'prismflow-deploy/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('T-Chart Sort dialog accessibility', () => {
  it.each(files)('%s exposes named workspace and completion dialogs', (_path, source) => {
    expect(source).toContain('tchart-game-title');
    expect(source).toContain('tchart-victory-title');
    expect(source).toContain('tchart-victory-description');
    expect(source).toContain('useGameDialogFocus');
  });

  it.each(files)('%s contains completion focus and keyboard navigation', (_path, source) => {
    expect(source).toContain('playAgainRef');
    expect(source).toMatch(/event\.key === ["']Escape["']/);
    expect(source).toMatch(/event\.key !== ["']Tab["']/);
  });

  it('retains keyboard placement and returns focus after replay', () => {
    const source = files[0][1];
    expect(source).toContain('handleItemKeyDown');
    expect(source).toContain('handleKeyboardMove');
    expect(source).toContain('gameContainerRef.current?.focus()');
  });

  it('uses unique refs and 44 CSS-pixel actions', () => {
    const source = files[0][1];
    expect(source.match(/const tChartCloseRef/g)).toHaveLength(1);
    expect(source).toContain('ref={tChartCloseRef}');
    expect(source.match(/min-h-11/g).length).toBeGreaterThanOrEqual(3);
  });
});