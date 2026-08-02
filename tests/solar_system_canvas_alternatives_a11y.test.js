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
    expect(source).toContain('reduceMotion: reduceMotion,');
    expect(source).toContain('if (!reduceMotion) animRef.current = (animRef.current + 0.01) % TAU;');
    expect(source).toContain('if (!reduceMotion) animRef.current = (animRef.current + 0.008) % TAU;');
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
    const markup = renderTool('solarSystem', { solarSystem: { tutorialDismissed: true, orreryMode: true } });
    document.body.innerHTML = markup;
    const canvas = document.querySelector('canvas[role="application"]');
    expect(canvas).not.toBeNull();
    expect(canvas.getAttribute('aria-keyshortcuts')).toContain('ArrowLeft');
    expect(canvas.getAttribute('aria-keyshortcuts')).toContain('Home');
    expect(canvas.getAttribute('aria-describedby')).toBe('orrery-canvas-help');
    expect(document.getElementById('orrery-canvas-help')?.textContent).toContain('Keyboard: arrows pan');
  });
it('keeps static canvases out of the tab order and gives Kepler III a keyboard fallback', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain('var keyboardInteractive = !!props.panZoom || !!props.onKeyboardInteract;');
    expect(source).toContain('tabIndex: keyboardInteractive ? 0 : undefined');
    expect(source).toContain('ariaDescribedBy: "orrery-k3-canvas-help"');
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
