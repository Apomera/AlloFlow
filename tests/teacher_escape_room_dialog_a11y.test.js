import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['teacher_source.jsx', 'teacher_module.js', 'desktop/web-app/public/teacher_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Escape Room teacher end-game dialog accessibility', () => {
  it.each(files)('%s exposes a named and described alert dialog', (_path, source) => {
    expect(source).toMatch(/(?:role="alertdialog"|role:\s*"alertdialog")/);
    expect(source).toContain('escape-room-end-game-title');
    expect(source).toContain('escape-room-end-game-description');
  });

  it.each(files)('%s uses safe initial focus, traps Tab, and restores focus', (_path, source) => {
    expect(source).toContain('data-safe-default');
    expect(source).toMatch(/event\.key === ["']Escape["']/);
    expect(source).toMatch(/event\.key !== ["']Tab["']/);
    expect(source).toContain('endGameTriggerRef.current?.focus()');
  });

  it('routes opening and cancellation through focus-aware handlers', () => {
    const source = files[0][1];
    expect(source).toContain('onClick={requestEndGame}');
    expect(source).toContain('onClick={closeEndGameDialog}');
    expect(source).not.toContain('onClick={() => setShowEndConfirm(true)}');
    expect(source).not.toContain('onClick={() => setShowEndConfirm(false)}');
  });
});