import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('allobot_source.jsx', 'utf8');

describe('AlloBot keyboard movement alternative', () => {
  it('maps all arrow keys to bounded position changes', () => {
    expect(source).toContain("ArrowLeft: { x: 1, y: 0");
    expect(source).toContain("ArrowRight: { x: -1, y: 0");
    expect(source).toContain("ArrowUp: { x: 0, y: -1");
    expect(source).toContain("ArrowDown: { x: 0, y: 1");
    expect(source).toContain('const clampAlloBotPosition =');
    expect(source).toContain('Math.min(maxRight, Math.max(ALLOBOT_VIEWPORT_GUTTER, rawX))');
    expect(source).toContain('Math.min(maxTop, Math.max(ALLOBOT_VIEWPORT_GUTTER, rawY))');
    expect(source).toContain('setPosition((current) => {\n      return clampAlloBotPosition({');
  });

  it('exposes instructions and announces keyboard moves', () => {
    expect(source).toContain('const moveInstructionsId = React.useId();');
    expect(source).toContain('<p id={moveInstructionsId} className="sr-only">');
    expect(source).toContain('aria-describedby={isSleeping ? undefined : moveInstructionsId}');
    expect(source).toContain('Use the arrow keys to move AlloBot');
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('setKeyboardMoveStatus(`AlloBot moved');
  });

  it('uses native action buttons without stealing child-control keys', () => {
    expect(source).toContain('role="group"');
    expect(source).toContain('data-allobot-avatar-action="open"');
    expect(source).toContain('data-allobot-avatar-action="wake"');
    expect(source).toMatch(/<button\s+type="button"\s+data-allobot-avatar-action="open"/);
    expect(source).toMatch(/<button\s+type="button"\s+data-allobot-avatar-action="wake"/);
    expect(source).toContain('if (e.target !== e.currentTarget) return;');
  });

  it('supports a larger Shift plus arrow step', () => {
    expect(source).toContain('const step = e.shiftKey ? 40 : 10;');
  });
});
