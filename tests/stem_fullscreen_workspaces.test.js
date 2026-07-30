import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const ROOT = 'stem_lab/';
const MIRROR = 'desktop/web-app/public/stem_lab/';

function source(file) {
  return readFileSync(ROOT + file, 'utf8');
}

describe('STEM fullscreen workspaces', () => {
  it('keeps Throw Lab launch controls in the fullscreen target', () => {
    const text = source('stem_tool_throwlab.js');
    expect(text).toContain("id: 'throwlab-fs-workspace'");
    expect(text).toContain("document.getElementById('throwlab-fs-workspace')");
    expect(text).toContain("'data-throwlab-fullscreen-workspace': 'true'");
    expect(text.indexOf("id: 'throwlab-fs-workspace'")).toBeLessThan(text.lastIndexOf('onClick: throwPitch'));
  });

  it('keeps Geometry World lesson and touch controls around the focused viewport', () => {
    const text = source('stem_tool_geometryworld.js');
    expect(text).toContain("id: 'geoworld-fs-workspace'");
    expect(text).toContain("document.getElementById('geoworld-fs-workspace')");
    expect(text).toContain("id: 'geoworld-fs-wrap'");
    expect(text).toContain("'aria-label': 'Place block'");
    expect(text.indexOf("id: 'geoworld-fs-workspace'")).toBeLessThan(text.indexOf("'aria-label': 'Place block'"));
  });

  it('offers fullscreen Particle Lab condition sliders with accessible state', () => {
    const text = source('stem_tool_particlelab3d.js');
    expect(text).toContain('showFullscreenConditions');
    expect(text).toContain("id: 'particle-fullscreen-conditions'");
    expect(text).toContain("'aria-controls': 'particle-fullscreen-conditions'");
    expect(text).toContain("'aria-label': 'Fullscreen temperature in kelvin'");
    expect(text).toContain("'aria-label': 'Fullscreen membrane permeability'");
  });

  it('fullscreens Symmetry Studio with its drawing controls and canvas', () => {
    const text = source('stem_tool_artstudio.js');
    expect(text).toContain("id: 'symmetryFullscreenWorkspace'");
    expect(text).toContain("toggleFullscreen('symmetryFullscreenWorkspace')");
    expect(text).toContain("id: 'symmetryCanvasContainer'");
  });

  it('fullscreens the Galaxy Explorer canvas-and-controls grid', () => {
    const text = source('stem_tool_galaxy.js');
    expect(text).toContain('var canvasFrame = canvasEl.parentElement;');
    expect(text).toContain('canvasFrame.parentElement');
    expect(text).toContain("canvasFrame.style.height = 'calc(100vh - 24px)'");
    expect(text).toContain('Observatory Filters');
  });

  it('keeps Space Colony navigation controls in its map workspace', () => {
    const text = source('stem_tool_spacecolony.js');
    expect(text).toContain("id: 'spacecolony-fs-workspace'");
    expect(text).toContain("document.getElementById('spacecolony-fs-workspace')");
    expect(text).toContain("'data-spacecolony-fullscreen-workspace': 'true'");
    expect(text).toContain('Map navigation controls');
  });

  it('keeps Echolocation scene, flight, and pulse controls in fullscreen', () => {
    const text = source('stem_tool_echolocation.js');
    expect(text).toContain("id: 'echo-sonar-fs-workspace'");
    expect(text).toContain("document.getElementById('echo-sonar-fs-workspace')");
    expect(text).toContain("'data-echolocation-controls': 'true'");
    expect(text).toContain('Emit sonar pulse');
  });

  it('keeps every enhanced desktop mirror byte-identical to its canonical source', () => {
    const files = [
      'stem_tool_throwlab.js', 'stem_tool_geometryworld.js',
      'stem_tool_particlelab3d.js', 'stem_tool_artstudio.js',
      'stem_tool_galaxy.js', 'stem_tool_spacecolony.js',
      'stem_tool_echolocation.js',
    ];
    files.forEach((file) => {
      expect(readFileSync(MIRROR + file, 'utf8')).toBe(source(file));
    });
  });
});
