import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';

// Round 10 lead: the picture under a Field survey point must not name what is
// under it in the page source. The reef key stays hidden until 40 of 40, and the
// students are the ones meant to decide.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let renderTool;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  renderTool = mod.renderTool;
  mod.resetStemLab(); mod.loadTool(TOOL, 'coralReef');
});

const SHARED = ['plumb', 'plumb-tip', 'tape'];
function pointPicture(pointIndex) {
  const box = document.createElement('div');
  box.innerHTML = renderTool('coralReef', { coralReef: { section: 'survey', surveySiteId: 'reserve', surveySeed: 4127, surveyStep: 'points', pointIndex } });
  return box.querySelector('svg[aria-label^="Close-up under the point"]');
}

describe('Field survey point picture', () => {
  it('names only the parts every picture shares, at all 40 points', () => {
    for (let i = 0; i < 40; i++) {
      const svg = pointPicture(i);
      expect(svg, 'picture at point ' + i).toBeTruthy();
      const parts = [...new Set([...svg.querySelectorAll('[data-part]')].map((e) => e.getAttribute('data-part')))].sort();
      expect(parts, 'point ' + i).toEqual(SHARED);
    }
  });
  it('still draws the scene and keeps its description', () => {
    const svg = pointPicture(0);
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(5);
    expect(svg.getAttribute('aria-label')).toMatch(/^Close-up under the point: ./);
  });
});
