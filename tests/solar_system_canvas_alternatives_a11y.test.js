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
  it('gives each Orrery teaching canvas a specific accessible description and pauses animated laws for reduced motion', () => {
    const source = readFileSync(SOURCE, 'utf8');

    expect(source).toContain('ariaLabel: "Kepler I orbit visualization.');
    expect(source).toContain('ariaLabel: "Kepler II equal-area visualization.');
    expect(source).toContain('ariaLabel: "Kepler III plot of solar-system bodies');
    expect(source).toContain('ariaLabel: "Orbit Workshop preview for " + body.name');
    expect(source).toContain('ariaLabel: "Orbit Workshop energy diagram for " + body.name');
    expect(source).toContain('ariaLabel: "Hohmann transfer visualization from " + fromBody.name');
    expect(source).toContain('ariaDescribedBy: "orrery-transfer-evidence"');
    expect(source).toContain('var transferBurnInsight = sameTransferOrbit ?');
    expect(source).toContain('var transferCenterX = cx + (outward ? -c_t : c_t) * scale;');
    expect(source).toContain('ctx.ellipse(transferCenterX, cy, a_t * scale, b_t * scale, 0, 0, PI);');
    expect(source).toContain('var dep_x = cx + fromBody.a * scale;');
    expect(source).toContain('var arr_x = cx - toBody.a * scale;');
    expect(source).toContain('id: "orrery-transfer-evidence"');
    expect(source).toContain('reduceMotion: reduceMotion,');
    expect(source).toContain('if (!reduceMotion) animRef.current = (animRef.current + 0.01) % TAU;');
    expect(source).toContain('if (!reduceMotion) animRef.current = (animRef.current + 0.008) % TAU;');
    expect(source).toContain('var k1PeriRatio = 1 - ecc;');
    expect(source).toContain('id: "orrery-k1-evidence"');
    expect(source).toContain('var k2PeriSpeed = Math.sqrt(2 / k2PeriRatio - 1);');
    expect(source).toContain('id: "orrery-k2-evidence"');
    expect(source).toContain('all " + nSectors + " sectors represent the same time interval.');
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
    expect(document.getElementById('orrery-stage-key')?.getAttribute('aria-label')).toBe('Orrery visual key');
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
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain('var keyboardInteractive = !!props.panZoom || !!props.onKeyboardInteract;');
    expect(source).toContain('tabIndex: keyboardInteractive ? 0 : undefined');
    expect(source).toContain('ariaDescribedBy: "orrery-k3-canvas-help orrery-k3-axis-note"');
    expect(source).toContain('ariaDescribedBy: "orrery-k1-evidence"');
    expect(source).toContain('ariaDescribedBy: "orrery-k2-evidence"');
    expect(source).toContain('function logTickLabel(power) { return power === 0 ? "1" : "10^" + power; }');
    expect(source).toContain('id: "orrery-k3-axis-note"');
    expect(source).toContain('Keyboard: press Enter or Space to cycle through plotted worlds');
    expect(source).toContain('id: "orrery-k3-selected"');
    expect(source).toContain('T²/a³ = " + fmt(k3HoverRatio, 4)');
expect(source).toContain('onEscape: function() { upd("orr_k3hover", null); }');
  });
  it('names the dynamic vehicle radar and excludes detached texture buffers', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain("miniMap.setAttribute('aria-label', 'Radar map showing the vehicle position and nearby points of interest')");
    expect(source).toContain("var coronaCv = document.createElement('canvas'); coronaCv.setAttribute('aria-hidden', 'true');");
    expect(source).toContain("var labelCv = document.createElement('canvas'); labelCv.setAttribute('aria-hidden', 'true');");
  });
});
