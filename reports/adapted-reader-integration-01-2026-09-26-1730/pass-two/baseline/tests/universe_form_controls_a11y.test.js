import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_universe.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_universe.js');

beforeEach(() => resetStemLab());

describe('Universe form-control accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('associates the visible cosmic timeline label with its range control', () => {
    loadTool('stem_lab/stem_tool_universe.js', 'universe');
    const html = renderTool('universe', { universe: { tutorialDismissed: true } });
    expect(html).toContain('id="universe-cosmic-timeline-label" for="universe-cosmic-time"');
    expect(html).toContain('id="universe-cosmic-time" type="range"');
    expect(html).toContain('aria-labelledby="universe-cosmic-timeline-label"');
  });

  it('gives the conditional cosmology explanation a visible label and instructions', () => {
    loadTool('stem_lab/stem_tool_universe.js', 'universe');
    const html = renderTool('universe', {
      universe: {
        tutorialDismissed: true,
        showHubbleInquiry: true,
        hubbleInquiry: { understood: true, explanation: '' }
      }
    });
    expect(html).toContain('for="universe-cosmology-explanation"');
    expect(html).toContain('Your explanation');
    expect(html).toContain('id="universe-cosmology-explanation"');
    expect(html).toContain('aria-describedby="universe-cosmology-explanation-hint"');
    expect(html).toContain('Explain how the selected distance and density mix leads to this redshift and fate.');
  });
});
