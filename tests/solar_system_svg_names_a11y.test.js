import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const MIRROR = 'prismflow-deploy/public/stem_lab/stem_tool_solarsystem.js';

describe('Solar System SVG accessible names', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
  });

  it('keeps the canonical source and deployed mirror byte-identical', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('gives every SVG declaration an accessible name', () => {
    const lines = readFileSync(SOURCE, 'utf8').split(/\r?\n/);
    const svgLines = lines.filter((line) => /h\(\s*['"]svg['"]|createElement\(\s*['"]svg['"]/.test(line));
    expect(svgLines).toHaveLength(69);
    expect(svgLines.filter((line) => line.includes('aria-label'))).toHaveLength(69);
    expect(svgLines.filter((line) => line.includes("role: 'group'"))).toHaveLength(65);
  });

  it('reuses visible localized mini-tool titles instead of generic names', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain("'aria-label': __alloT('stem.solarsystem.moon_phase_dial'");
    expect(source).toContain("'aria-label': __alloT('stem.solarsystem.crater_counter'");
    expect(source).toContain("'aria-label': __alloT('stem.solarsystem.famous_nebulae'");
    expect(source).toContain("'aria-label': __alloT('stem.solarsystem.kepler_inquiry_orbit_visualization'");
  });

  it('renders only named SVGs in representative planet and Orrery views', () => {
    const views = [
      { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.earth', showStellarEvo: true },
      { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.earth', showOrbital: true },
      { tutorialDismissed: true, orreryMode: true, orr_stab: 8 },
    ];
    let renderedSvgCount = 0;
    for (const state of views) {
      document.body.innerHTML = renderTool('solarSystem', { solarSystem: state });
      const svgs = [...document.querySelectorAll('svg')];
      renderedSvgCount += svgs.length;
      expect(svgs.filter((svg) => !(svg.getAttribute('aria-label') || '').trim()).map((svg) => svg.outerHTML)).toEqual([]);
    }
    expect(renderedSvgCount).toBeGreaterThan(0);
  });
});
