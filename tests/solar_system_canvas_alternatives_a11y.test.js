import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js';

function renderedCanvasFailures(markup) {
  document.body.innerHTML = markup;
  return [...document.querySelectorAll('canvas')].filter((canvas) => {
    if (canvas.getAttribute('aria-hidden') === 'true') return false;
    return !['img', 'application'].includes(canvas.getAttribute('role')) || !(canvas.getAttribute('aria-label') || '').trim();
  }).map((canvas) => canvas.outerHTML);
}

describe('Solar System canvas alternatives', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
  });

  it('keeps the canonical source and deployed mirror byte-identical', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('classifies every canvas creation site as named or explicitly decorative', () => {
    const lines = readFileSync(SOURCE, 'utf8').split(/\r?\n/);
    const failures = [];
    lines.forEach((line, index) => {
      if (!/h\(\s*['"]canvas['"]|createElement\(\s*['"]canvas['"]/.test(line)) return;
      const context = lines.slice(index, index + 12).join(' ');
      const hidden = /aria-hidden['"]?\s*[:=,)]/.test(context);
      const named = /aria-label/.test(context) && (/role\s*[:=,]/.test(context) || /setAttribute\(['"]role['"]/.test(context));
      if (!hidden && !named) failures.push(`${index + 1}: ${line.trim()}`);
    });
    expect(failures).toEqual([]);
  });

  it('renders only named or explicitly decorative canvases in representative views', () => {
    const views = [
      { tutorialDismissed: true },
      { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.earth', viewTab: 'interior', showSky: true, showDescent: true, showOrbital: true, showHohmann: true },
      { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.mars', viewTab: 'drone' },
      { tutorialDismissed: true, orreryMode: true },
    ];
    for (const state of views) {
      expect(renderedCanvasFailures(renderTool('solarSystem', { solarSystem: state }))).toEqual([]);
    }
  });

  it('names the dynamic vehicle radar and excludes detached texture buffers', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain("miniMap.setAttribute('aria-label', 'Radar map showing the vehicle position and nearby points of interest')");
    expect(source).toContain("var coronaCv = document.createElement('canvas'); coronaCv.setAttribute('aria-hidden', 'true');");
    expect(source).toContain("var labelCv = document.createElement('canvas'); labelCv.setAttribute('aria-hidden', 'true');");
  });
});
