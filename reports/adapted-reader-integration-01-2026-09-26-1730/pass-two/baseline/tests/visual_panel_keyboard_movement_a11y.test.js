import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('visual_panel_source.jsx', 'utf8');

describe('visual label keyboard movement alternatives', () => {
  it('moves AI and teacher labels with bounded arrow-key controls', () => {
    expect(source).toContain('handleAiLabelKeyDown(panelIdx, labelIdx, e)');
    expect(source).toContain('handleUserLabelKeyDown(panelIdx, uLabel.id, e)');
    expect(source).toContain('Math.max(0, Math.min(90');
    expect(source).toContain('const step = e.shiftKey ? 5 : 1;');
  });

  it('moves leader-line anchors without dragging', () => {
    expect(source).toContain('handleAnchorKeyDown(panelIdx, pt.key, pt.type, tx, ty, e)');
    expect(source).toContain('Math.max(0, Math.min(100');
    expect(source).toContain('Move leader-line anchor with arrow keys');
  });

  it('provides instructions and live movement feedback', () => {
    expect(source.match(/aria-describedby="visual-label-move-instructions"/g)?.length).toBe(2);
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain("setLabelMoveStatus(target + ' moved '");
  });
});
