import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Memory Match mode-switch accessibility', () => {
  it.each(files)('%s uses a named and described alert dialog', (_path, source) => {
    expect(source).toContain('memory-mode-dialog-title');
    expect(source).toContain('memory-mode-dialog-description');
    expect(source).toMatch(/(?:role="alertdialog"|role:\s*"alertdialog")/);
  });

  it.each(files)('%s provides safe focus, Tab containment, Escape, and focus return', (_path, source) => {
    expect(source).toContain('data-safe-default');
    expect(source).toMatch(/event\.key === ["']Escape["']/);
    expect(source).toMatch(/event\.key !== ["']Tab["']/);
    expect(source).toContain('modeSelectRef.current?.focus()');
  });

  it('keeps the current mode until restart is confirmed', () => {
    const source = files[0][1];
    expect(source).toContain('if (inProgress) setPendingMode(nextMode)');
    expect(source).toContain('if (nextMode) setGameMode(nextMode)');
    expect(source).toContain('value={gameMode}');
    expect(source).not.toContain('window.confirm');
  });

  it('provides 44 CSS-pixel dialog actions', () => {
    const dialog = files[0][1].slice(files[0][1].indexOf('memory-mode-dialog-title'), files[0][1].indexOf('memory-mode-dialog-title') + 2200);
    expect(dialog.match(/min-h-11 rounded-lg/g)).toHaveLength(2);
  });
});