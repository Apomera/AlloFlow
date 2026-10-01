import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const view = fs.readFileSync('view_timeline_source.jsx', 'utf8');
const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');

describe('timeline dragging alternative', () => {
  it('provides single-click move controls for every draggable row', () => {
    expect(view).toContain('draggable={true} data-keyboard-alternative="move-buttons" role="group"');
    expect(view).toContain('aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"');
    expect(view).toContain("e.key === 'ArrowUp'");
    expect(view).toContain("e.key === 'ArrowDown'");
    expect(view).toContain('handleTimelineMove(idx, idx - 1)');
    expect(view).toContain('handleTimelineMove(idx, idx + 1)');
    expect(view).toContain('Move timeline item');
    expect(view).toContain('keyboard_reorder_instruction');
  });
  it('uses targets at least 24 by 24 CSS pixels', () => {
    expect(view.match(/className="w-7 h-7/g)?.length).toBe(2);
  });
  it('announces the resulting position through the shared live toast', () => {
    expect(app).toContain('const handleTimelineMove = (fromIndex, toIndex) =>');
    expect(app).toContain('Moved timeline item to position');
    expect(app).toContain("addToast(t('timeline.moved_position'");
  });
});
