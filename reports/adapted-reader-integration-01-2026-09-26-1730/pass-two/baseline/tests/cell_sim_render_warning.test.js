import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CELL_RENDER_PATHS = [
  'stem_lab/stem_tool_cell.js',
  'desktop/web-app/public/stem_lab/stem_tool_cell.js',
];

describe('cell simulator render warnings', () => {
  beforeEach(() => {
    resetStemLab();
  });

  it('does not pass the sr-only style object as a div className', () => {
    CELL_RENDER_PATHS.forEach((filePath) => {
      resetStemLab();
      loadTool(filePath, 'cell');
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        const html = renderTool('cell', { cell: {} });
        expect(html).toContain('id="cell-sim-status"');
        const invalidClassNameWarning = errSpy.mock.calls.some((args) => {
          const text = args.map((arg) => String(arg)).join(' ');
          return text.includes('Invalid value for prop') && text.includes('className');
        });
        expect(invalidClassNameWarning).toBe(false);
      } finally {
        errSpy.mockRestore();
      }
    });
  });
});
