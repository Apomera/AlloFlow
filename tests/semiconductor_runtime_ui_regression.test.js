import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_FILE = 'stem_lab/stem_tool_semiconductor.js';
const MIRROR_FILE = 'desktop/web-app/public/stem_lab/stem_tool_semiconductor.js';
const sourcePath = path.join(process.cwd(), SOURCE_FILE);
const mirrorPath = path.join(process.cwd(), MIRROR_FILE);

function readSource() {
  return fs.readFileSync(sourcePath, 'utf8');
}

describe('Semiconductor Lab runtime UI regressions', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE_FILE, 'semiconductor');
  });

  it('keeps the source and desktop runtime copies identical', () => {
    expect(readSource()).toBe(fs.readFileSync(mirrorPath, 'utf8'));
  });

  it('keeps its four learning modes local to the tool', () => {
    const source = readSource();
    expect(source).not.toContain('setStemLabTab');
    expect(source).not.toContain("document.addEventListener('keydown', handleKey)");

    const html = renderTool('semiconductor', {
      semiconductor: { mode: 'challenge' }
    });
    expect(html).toContain('id="semiconductor-tab-challenge"');
    expect(html).toContain('id="semiconductor-panel-challenge"');
    expect(html).toContain('aria-labelledby="semiconductor-tab-challenge"');
    expect(html).toContain('Start Challenge');
  });

  it('renders a clear first action before the primary visualization', () => {
    const html = renderTool('semiconductor', {
      semiconductor: { mode: 'explore', subtool: 'bandgap' }
    });
    const selectorIndex = html.indexOf('semiconductor-simulation-select');
    const guidedIndex = html.indexOf('Guided experiment');
    const materialIndex = html.indexOf('semiconductor-material-select');
    const canvasIndex = html.indexOf('<canvas');
    const labMapIndex = html.indexOf('Explore more chip-lab activities');

    expect(selectorIndex).toBeGreaterThan(-1);
    expect(guidedIndex).toBeGreaterThan(selectorIndex);
    expect(materialIndex).toBeGreaterThan(guidedIndex);
    expect(canvasIndex).toBeGreaterThan(materialIndex);
    expect(labMapIndex).toBeGreaterThan(canvasIndex);
    expect(html).toContain('1. Set up');
    expect(html).toContain('2. Change');
    expect(html).toContain('3. Explain');
    expect(html).toContain('Load guided setup');
  });

  it('provides a guided baseline for every simulation workspace', () => {
    const source = readSource();
    const start = source.indexOf('var GUIDED_SETUPS = {');
    const end = source.indexOf('var quick = QUICK_STARTS', start);
    const setupBlock = source.slice(start, end);
    const ids = ['bandgap', 'doping', 'pnjunction', 'transistor', 'gates', 'ivcurve', 'sandbox', 'waferfab', 'ledspec', 'solarcell', 'moorelaw', 'qwell', 'memory', 'amplifier', 'dopeHunt'];
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    ids.forEach((id) => expect(setupBlock).toContain(id + ': {'));
    expect(source).toContain('function applyGuidedSetup()');
    expect(source).toContain('guidedSetupSubtool: subtool');
  });

  it('uses device-pixel-ratio aware, resize-safe canvases for all simulations', () => {
    const source = readSource();
    expect(source).toContain('window.devicePixelRatio');
    expect(source).toContain('cx.setTransform(pixelWidth / logicalWidth');
    expect(source).toContain('new ResizeObserver(function()');
    expect(source).toContain("canvasEl.style.maxWidth = '1024px'");
    expect(source).toContain("canvasEl.style.minWidth = '0'");
    expect(source).toContain('Math.min(3, window.devicePixelRatio || 1)');
    expect(source.match(/prepareCanvas\(canvasEl, 440,/g)).toHaveLength(13);
    expect(source.match(/max-w-5xl mx-auto rounded-lg bg-slate-950/g)).toHaveLength(13);
    expect(source).not.toContain('var W = canvasEl.width, H = canvasEl.height');
  });

  it('pins the corrected notation and higher-contrast muted text', () => {
    const source = readSource();
    expect(source).not.toContain('text-slate-600');
    expect(source).not.toContain('text-slate-500');
    expect(source).not.toMatch(/cx\.font = '(?:bold )?[6-9]px/);
    expect(source).not.toContain('Math.max(7, radius * 0.65)');
    expect(source).toContain('Math.max(10, radius * 0.65)');
    expect(source).not.toContain('E\\u2097');
    expect(source).toContain('E_g');
    expect(source).toContain('function canvasInkFor(background)');
  });
});
