import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_coding.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_coding.js');

beforeEach(() => resetStemLab());

describe('Coding Lab block reordering accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('renders program blocks as named, keyboard-reorderable list items', () => {
    loadTool('stem_lab/stem_tool_coding.js', 'codingPlayground');
    const html = renderTool('codingPlayground', {
      _codingPlayground: {
        tutorialDismissed: true,
        blocks: [{ type: 'forward', distance: 10 }, { type: 'right', degrees: 90 }],
      },
    });
    expect(html).toContain('role="list" aria-label="Program blocks"');
    expect(html).toContain('role="listitem"');
    expect(html).toContain('aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"');
    expect(html).toContain('Alt+Up or Alt+Down');
  });

  it('provides named 44-pixel Move up, Move down, and Remove controls', () => {
    loadTool('stem_lab/stem_tool_coding.js', 'codingPlayground');
    const html = renderTool('codingPlayground', {
      _codingPlayground: {
        tutorialDismissed: true,
        blocks: [{ type: 'forward', distance: 10 }, { type: 'right', degrees: 90 }],
      },
    });
    expect(html).toMatch(/aria-label="Move [^"]*Move Forward up"/);
    expect(html).toMatch(/aria-label="Move [^"]*Move Forward down"/);
    expect(html).toContain('aria-label="Remove block"');
    expect(html).toContain('min-h-11 min-w-11');
  });

  it('implements Alt+Arrow movement and announces the result', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('e.key === "ArrowUp"');
    expect(source).toContain('e.key === "ArrowDown"');
    expect(source).toContain('announceToSR("Block moved up.")');
    expect(source).toContain('announceToSR("Block moved down.")');
  });
});
