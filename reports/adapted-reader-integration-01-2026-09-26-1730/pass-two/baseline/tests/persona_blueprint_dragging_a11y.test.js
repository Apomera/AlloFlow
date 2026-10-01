import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('persona_ui_source.jsx', 'utf8');

describe('blueprint dragging alternative', () => {
  it('provides labeled move controls beside every draggable step', () => {
    expect(source).toContain('handleMoveItem(idx, -1)');
    expect(source).toContain('handleMoveItem(idx, 1)');
    expect(source).toContain('Move plan step');
    expect(source.match(/className="w-7 h-7/g)?.length).toBe(2);
  });
  it('announces the resulting position', () => {
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('Moved plan step to position');
  });
  it('labels the sortable group and exposes non-drag instructions', () => {
    expect(source).toContain('blueprint.keyboard_reorder_instruction');
    expect(source).toContain('blueprint.step_position_aria');
  });
});
