import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('annotation_suite_source.jsx', 'utf8');

describe('annotation keyboard movement alternatives', () => {
  it('provides a shared bounded four-direction movement handler', () => {
    expect(source).toContain('function makeKeyboardMoveHandler');
    expect(source).toContain("ArrowLeft: { x: -1, y: 0");
    expect(source).toContain("ArrowDown: { x: 0, y: 1");
    expect(source).toContain('Math.min(host.clientWidth - 14');
    expect(source).toContain('Math.min(host.clientHeight - 14');
  });

  it('wires keyboard movement to stickers, notes, and voice notes', () => {
    expect(source).toContain('makeKeyboardMoveHandler(s, findAnnoHost, onMove)');
    expect(source.match(/makeKeyboardMoveHandler\(a, findAnnoHost, isDraggable \? onMove : null/g)?.length).toBe(2);
    expect(source).toContain("tabIndex={isDraggable ? 0 : undefined}");
  });

  it('announces movement and exposes arrow-key instructions', () => {
    expect(source).toContain("live.setAttribute('role', 'status')");
    expect(source).toContain('announceAnnotationMove(`Annotation moved');
    expect(source.match(/Use arrow keys to move; hold Shift for a larger step/g)?.length).toBe(3);
    expect(source).toContain('const step = e.shiftKey ? 40 : 10;');
  });
});
