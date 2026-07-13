import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'prismflow-deploy/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Venn Sort dialog accessibility', () => {
  it.each(files)('%s exposes the workspace as a named focus-managed dialog', (_path, source) => {
    expect(source).toContain('venn-game-title');
    expect(source).toContain('vennDialogRef');
    expect(source).toContain('useGameDialogFocus');
  });

  it.each(files)('%s makes victory actionable and focus-contained', (_path, source) => {
    expect(source).toContain('venn-victory-description');
    expect(source).toContain('vennPlayAgainRef');
    expect(source).toContain('resetVennGame');
    expect(source).toMatch(/event\.key !== ["']Tab["']/);
  });

  it('retains keyboard select-and-place alternatives to dragging', () => {
    const source = files[0][1];
    expect(source).toContain('handleItemKeyDown');
    expect(source).toContain('handleKeyboardMove');
    expect(source).toContain('keyboardSelectedItemId');
  });

  it('uses unique Venn refs and 44 CSS-pixel actions', () => {
    const source = files[0][1];
    expect(source.match(/const vennDialogRef/g)).toHaveLength(1);
    expect(source).toContain('ref={vennCloseRef}');
    expect(source.match(/min-h-11/g).length).toBeGreaterThanOrEqual(3);
  });
});