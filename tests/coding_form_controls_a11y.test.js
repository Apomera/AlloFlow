import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_coding.js');
const publicPath = path.join(process.cwd(), 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_coding.js');

beforeEach(() => resetStemLab());

describe('Coding Lab form-control accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('associates visible labels and instructions with both inquiry textareas', () => {
    loadTool('stem_lab/stem_tool_coding.js', 'codingPlayground');
    const html = renderTool('codingPlayground', {
      _codingPlayground: {
        tutorialDismissed: true,
        workspaceTab: 'inquiry',
        complexityIQ: { n: 100, loopDepth: 1, dataStruct: 'array', recursion: 0, hypothesis: '', understood: true, explanation: '', log: [] },
      },
    });
    expect(html).toContain('for="coding-complexity-hypothesis"');
    expect(html).toContain('id="coding-complexity-hypothesis"');
    expect(html).toContain('for="coding-complexity-explanation"');
    expect(html).toContain('id="coding-complexity-explanation"');
    expect(html).toContain('aria-describedby="coding-complexity-explanation-hint"');
  });

  it('names inline variable editors and the timeline slider', () => {
    loadTool('stem_lab/stem_tool_coding.js', 'codingPlayground');
    const html = renderTool('codingPlayground', {
      _codingPlayground: {
        tutorialDismissed: true,
        blocks: [{ type: 'changeVar', varName: 'score', varDelta: 5 }],
        timelineFrames: [{ turtle: { x: 0, y: 0, angle: 0 }, lines: [], stepIdx: 0 }],
      },
    });
    expect(html).toContain('aria-label="Amount to add to variable"');
    expect(html).toContain('aria-label="Animation timeline position"');
    expect(html).toContain('w-full h-6');
    expect(html).toContain('min-h-6');
  });

  it('names and enlarges the turtle-skin selector and import picker', () => {
    loadTool('stem_lab/stem_tool_coding.js', 'codingPlayground');
    const html = renderTool('codingPlayground', {
      _codingPlayground: { tutorialDismissed: true },
    });
    expect(html).toContain('aria-label="Turtle skin"');
    expect(html).toContain('min-h-11');

    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("input.setAttribute('aria-label', 'Choose a coding program JSON file to import')");
  });
});
