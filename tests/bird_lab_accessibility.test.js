import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_birdlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_birdlab.js');

beforeEach(() => resetStemLab());

describe('Bird Lab accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('registers in the specific science category', () => {
    const config = loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    expect(config.category).toBe('science');
  });

  it('names or hides every SVG in the initial menu', () => {
    loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    const host = document.createElement('div');
    host.innerHTML = renderTool('birdLab', { birdLab: { view: 'menu' } });
    const svgs = Array.from(host.querySelectorAll('svg'));
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      const hidden = svg.getAttribute('aria-hidden') === 'true';
      const named = svg.hasAttribute('aria-label') || svg.hasAttribute('aria-labelledby') || !!svg.querySelector('title');
      expect(hidden || named).toBe(true);
    }
    const avatar = host.querySelector('button[aria-label^="Today"] svg');
    expect(avatar?.getAttribute('aria-hidden')).toBe('true');
    expect(avatar?.getAttribute('focusable')).toBe('false');
  });

  it('uses responsive hero background rectangles instead of fixed 800px attributes', () => {
    loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    const host = document.createElement('div');
    host.innerHTML = renderTool('birdLab', { birdLab: { view: 'menu' } });
    const hero = host.querySelector('svg[aria-label*="hero illustration"]');
    expect(hero).toBeTruthy();
    expect(hero.querySelectorAll('rect[width="800"]')).toHaveLength(0);
    expect(hero.querySelectorAll('rect[width="100%"]')).toHaveLength(2);
  });
});
