import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('allobot_source.jsx', 'utf8');

describe('AlloBot keyboard movement alternative', () => {
  it('maps all arrow keys to bounded position changes', () => {
    expect(source).toContain("ArrowLeft: { x: 1, y: 0");
    expect(source).toContain("ArrowRight: { x: -1, y: 0");
    expect(source).toContain("ArrowUp: { x: 0, y: -1");
    expect(source).toContain("ArrowDown: { x: 0, y: 1");
    expect(source).toContain('Math.min(maxRight, Math.max(10');
    expect(source).toContain('Math.min(maxTop, Math.max(10');
  });

  it('exposes instructions and announces keyboard moves', () => {
    expect(source).toContain('aria-describedby="allobot-move-instructions"');
    expect(source).toContain('Use the arrow keys to move AlloBot');
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('setKeyboardMoveStatus(`AlloBot moved');
  });

  it('supports a larger Shift plus arrow step', () => {
    expect(source).toContain('const step = e.shiftKey ? 40 : 10;');
  });
});
