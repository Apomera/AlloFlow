import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { canvasCreationFailures } from './helpers/canvas_accessibility_source.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js';

function renderedCanvasFailures(markup) {
  document.body.innerHTML = markup;
  return [...document.querySelectorAll('canvas')].filter((canvas) => {
    if (canvas.getAttribute('aria-hidden') === 'true') return false;
    return !['img', 'application'].includes(canvas.getAttribute('role')) || !(canvas.getAttribute('aria-label') || '').trim();
  }).map((canvas) => canvas.outerHTML);
}

describe('Canvas creation scanner boundaries', () => {
  it('follows a delayed dynamic label on the same canvas through its update callback', () => {
    const source = [
      "const specimenCanvas = document.createElement('canvas');",
      "specimenCanvas.setAttribute('role', 'img');",
      ...Array.from({ length: 36 }, () => '// Other specimen setup and controls.'),
      'function selectSpecimen(specimen) {',
      "  specimenCanvas.setAttribute('aria-label', 'Sealed ' + specimen.title + ' specimen illustration.');",
      '}'
    ].join('\n');
    expect(canvasCreationFailures(source)).toEqual([]);
  });

  it('checks the complete declarative props object without a line-count limit', () => {
    const source = [
      "h('canvas', { role: 'img',",
      ...Array.from({ length: 20 }, () => '// Other canvas props.'),
      "'aria-label': 'Orbit visualization' });"
    ].join('\n');
    expect(canvasCreationFailures(source)).toEqual([]);
  });

  it.each([
    ['nearby canvas', "const unnamed = document.createElement('canvas'); const named = document.createElement('canvas'); named.setAttribute('role', 'img'); named.setAttribute('aria-label', 'Orbit visualization');"],
    ['shadowed variable', "const canvas = document.createElement('canvas'); canvas.setAttribute('role', 'img'); function otherView() { const canvas = document.createElement('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Other orbit visualization'); }"],
    ['redeclared variable', "var canvas = document.createElement('canvas'); canvas.setAttribute('role', 'img'); var canvas = document.createElement('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Other orbit visualization');"],
    ['adjacent declarative canvas', "h('canvas', { role: 'img' }); h('canvas', { role: 'img', 'aria-label': 'Orbit visualization' });"],
    ['blank label', "h('canvas', { role: 'img', 'aria-label': '   ' });"],
    ['explicitly visible canvas', "const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'false');"],
    ['wrong role', "h('canvas', { role: 'status', 'aria-label': 'Orbit visualization' });"]
  ])('still reports an unnamed or unclassified canvas despite a %s', (_case, source) => {
    expect(canvasCreationFailures(source)).toHaveLength(1);
  });

  it('accepts explicitly decorative canvases without a label or image role', () => {
    expect(canvasCreationFailures("const texture = document.createElement('canvas'); texture.setAttribute('aria-hidden', 'true'); h('canvas', { 'aria-hidden': true });")).toEqual([]);
  });
});

describe('Solar System canvas alternatives', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
  });

  it('keeps the canonical source and deployed mirror byte-identical', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('classifies every canvas creation site as named or explicitly decorative', () => {
    expect(canvasCreationFailures(readFileSync(SOURCE, 'utf8'))).toEqual([]);
  });
  it('gives each Orrery teaching canvas a specific accessible description and pauses animated laws for reduced motion', () => {
    const source = readFileSync(SOURCE, 'utf8');

    expect(source).toContain('ariaLabel: "Kepler I orbit visualization.');
    expect(source).toContain('ariaLabel: "Kepler II equal-area visualization.');
    expect(source).toContain('ariaLabel: "Kepler III plot of solar-system bodies');
    expect(source).toContain('ariaLabel: "Orbit Workshop preview for " + body.name');
    expect(source).toContain('ariaLabel: "Orbit Workshop energy diagram for " + body.name');
    expect(source).toContain('ariaLabel: "Hohmann transfer visualization from " + from.name');
    expect(source).toContain('ariaDescribedBy: "orrery-transfer-evidence"');
    expect(source).toContain('var transferBurnInsight = sameTransferOrbit ?');
    expect(source).toContain('id: "orrery-transfer-evidence"');
    expect(source).toContain('reduceMotion: reduceMotion,');
    const previousMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    try {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true, writable: true, value: () => ({ matches: true }),
      });
      document.body.innerHTML = renderTool('solarSystem', { solarSystem: {
        tutorialDismissed: true, orreryMode: true, orr_tab: 1,
        orr_k1playing: true, orr_k1phase: 0.25, orr_k1e: 0.5,
      } });
      const k1Play = [...document.querySelectorAll('#orrery-k1-inspection button')]
        .find((button) => (button.getAttribute('aria-label') || button.textContent).trim() === 'Play orbit');
      expect(k1Play?.disabled).toBe(true);
      const k1Phase = document.getElementById('orrery-k1-phase');
      expect(k1Phase?.disabled).toBe(false);
      expect(Number(k1Phase?.value)).toBe(25);
      const k1Evidence = document.getElementById('orrery-k1-evidence');
      expect(k1Evidence?.getAttribute('role')).toBe('status');
      expect(k1Evidence?.getAttribute('aria-live')).toBe('polite');
      expect(k1Evidence?.getAttribute('aria-atomic')).toBe('true');
      expect(k1Evidence?.textContent).toContain('Perihelion = 0.500a');
      expect(k1Evidence?.textContent).toContain('aphelion = 1.500a');
      const k1Canvas = document.querySelector('#orrery-k1-inspection canvas');
      expect(k1Canvas?.getAttribute('aria-describedby')).toBe('orrery-k1-evidence');
      document.body.innerHTML = renderTool('solarSystem', { solarSystem: {
        tutorialDismissed: true, orreryMode: true, orr_tab: 2,
        orr_k2playing: true, orr_k2phase: 0.25,
      } });
      const play = [...document.querySelectorAll('#orrery-k2-inspection button')]
        .find((button) => (button.getAttribute('aria-label') || button.textContent).trim() === 'Play orbit');
      expect(play?.disabled).toBe(true);
      const phase = document.getElementById('orrery-k2-phase');
      expect(phase?.disabled).toBe(false);
      expect(Number(phase?.value)).toBe(25);
    } finally {
      if (previousMatchMedia) Object.defineProperty(window, 'matchMedia', previousMatchMedia);
      else delete window.matchMedia;
    }
    expect(source).toContain('var k2PeriSpeed = Math.sqrt(2 / k2PeriRatio - 1);');
    const evidence = document.getElementById('orrery-k2-evidence');
    expect(evidence?.getAttribute('role')).toBe('status');
    expect(evidence?.getAttribute('aria-live')).toBe('polite');
    expect(evidence?.textContent).toContain('all 6 sectors represent the same time interval.');
    const keplerTwoCanvas = document.querySelector('#orrery-k2-inspection canvas');
    expect(keplerTwoCanvas?.getAttribute('aria-describedby')).toBe('orrery-k2-evidence');
    expect(source).toContain('all " + nSectors + " sectors represent the same time interval.');
  });

  it('renders only named or explicitly decorative canvases in representative views', () => {
    const views = [
      { tutorialDismissed: true },
      { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.earth', viewTab: 'interior', showSky: true, showDescent: true, showOrbital: true, showHohmann: true },
      { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.mars', viewTab: 'drone' },
      { tutorialDismissed: true, orreryMode: true },
      { tutorialDismissed: true, orreryMode: true, orr_tab: 5 },
    ];
    for (const state of views) {
      expect(renderedCanvasFailures(renderTool('solarSystem', { solarSystem: state }))).toEqual([]);
    }
  });

  it('exposes keyboard shortcuts on the interactive Orrery canvas', () => {
    const markup = renderTool('solarSystem', { solarSystem: { tutorialDismissed: true, orreryMode: true, orr_sel: 'earth', orr_paused: true, orr_scale_mode: 'relative' } });
    document.body.innerHTML = markup;
    const canvas = document.querySelector('canvas[role="application"]');
    expect(canvas).not.toBeNull();
    expect(canvas.getAttribute('aria-keyshortcuts')).toContain('ArrowLeft');
    expect(canvas.getAttribute('aria-keyshortcuts')).toContain('Home');
    expect(canvas.getAttribute('aria-describedby')).toBe('orrery-canvas-help orrery-model-scale-note orrery-hover-summary orrery-stage-key orrery-stage-tip orrery-stage-readout');
    expect(document.getElementById('orrery-canvas-help')?.textContent).toContain('Keyboard: arrows pan');
    expect(document.getElementById('orrery-model-scale-note')?.textContent).toContain('not one literal scale');
    expect(document.getElementById('orrery-model-scale-note')?.textContent).toContain('compressed and clamped for visibility');
    expect(document.getElementById('orrery-stage-key')?.getAttribute('aria-label')).toBe('Scrollable Orrery visual key');
    expect(document.getElementById('orrery-stage-key')?.textContent).toContain('Velocity vector');
    expect(document.getElementById('orrery-stage-tip')?.textContent).toContain('Arrow = direction/relative speed');
    expect(document.getElementById('orrery-hover-summary')?.getAttribute('role')).toBe('status');
    const orbitalPositionMeter = document.getElementById('orrery-live-orbit-position-meter');
    expect(orbitalPositionMeter?.getAttribute('role')).toBe('img');
    expect(orbitalPositionMeter?.getAttribute('aria-label')).toContain('from perihelion');
    expect(orbitalPositionMeter?.getAttribute('aria-describedby')).toBe('orrery-live-orbit-position');
    expect(document.getElementById('orrery-live-orbit-position')?.textContent).toContain('Earth');
  });
  it('keeps static canvases out of the tab order and gives Kepler III a keyboard fallback', () => {
    document.body.innerHTML = renderTool('solarSystem', { solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 1 } });
    const staticChart = document.querySelector('canvas');
    expect(staticChart.getAttribute('role')).toBe('img');
    expect(staticChart.hasAttribute('tabindex')).toBe(false);
    document.body.innerHTML = renderTool('solarSystem', { solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 3 } });
    const chart = document.querySelector('#orrery-k3-inspection canvas');
    expect(chart.getAttribute('role')).toBe('application');
    expect(chart.getAttribute('tabindex')).toBe('0');
    expect(chart.getAttribute('aria-keyshortcuts')).toBe('Enter Space Escape');
    expect(chart.getAttribute('aria-describedby')).toBe('orrery-k3-canvas-help orrery-k3-axis-note');
    expect(document.getElementById('orrery-k3-axis-note').textContent).toContain('tick labels are powers of ten');
    expect(document.getElementById('orrery-k3-canvas-help').textContent).toMatch(/Enter or Space.*Escape/);
    expect(document.getElementById('orrery-k3-selected').getAttribute('role')).toBe('status');
  });
  it('names the dynamic vehicle radar and excludes detached texture buffers', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain("miniMap.setAttribute('aria-label', 'North-up local map. Vehicle at center; ");
    expect(source).toContain("var coronaCv = document.createElement('canvas'); coronaCv.setAttribute('aria-hidden', 'true');");
    expect(source).toContain("var labelCv = document.createElement('canvas'); labelCv.setAttribute('aria-hidden', 'true');");
  });
});
