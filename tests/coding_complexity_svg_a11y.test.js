import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_coding.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_coding.js');

beforeEach(() => resetStemLab());

describe('Coding Lab complexity chart accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('renders the Big-O chart as a named image with its current estimate', () => {
    loadTool('stem_lab/stem_tool_coding.js', 'codingPlayground');
    const html = renderTool('codingPlayground', {
      _codingPlayground: {
        tutorialDismissed: true,
        workspaceTab: 'inquiry',
        complexityIQ: { n: 100, loopDepth: 2, dataStruct: 'array', recursion: 0, hypothesis: '', understood: false, log: [] },
      },
    });
    expect(html).toContain('role="img"');
    expect(html).toMatch(/aria-label="Big-O growth comparison chart\. Current estimate: [^"]+, approximately [^"]+ operations\."/);
  });
});
