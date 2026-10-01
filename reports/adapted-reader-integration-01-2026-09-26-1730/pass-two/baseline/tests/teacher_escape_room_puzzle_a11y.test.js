import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['teacher_source.jsx', 'teacher_module.js', 'desktop/web-app/public/teacher_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('student Escape Room puzzle dialog accessibility', () => {
  it.each(files)('%s exposes the puzzle as a named modal dialog', (_path, source) => {
    expect(source).toContain('escape-room-puzzle-question');
    expect(source).toMatch(/(?:role="dialog"|role:\s*"dialog")/);
    expect(source).toMatch(/(?:aria-modal="true"|"aria-modal":\s*"true")/);
  });

  it.each(files)('%s manages initial focus, Tab, Escape, and focus return', (_path, source) => {
    expect(source).toContain('data-initial-focus');
    expect(source).toMatch(/event\.key === ["']Escape["']/);
    expect(source).toMatch(/event\.key !== ["']Tab["']/);
    expect(source).toContain('puzzleTriggerRef.current?.focus()');
  });

  it('routes activation, close, and successful completion through focus-aware handlers', () => {
    const source = files[0][1];
    expect(source).toContain('openPuzzleDialog(event, obj.id)');
    expect(source).toContain('onClick={closePuzzleDialog}');
    expect(source).toContain("closePuzzleDialog();\n        setUserInput('');");
    expect(source).not.toContain('onClick={() => setSelectedPuzzle(null)}');
  });

  it('provides a 44 CSS-pixel named close target with a hidden icon', () => {
    const source = files[0][1];
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain('<X size={24} aria-hidden="true" />');
  });
});