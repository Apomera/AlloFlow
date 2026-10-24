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
    // 09-25: the touch controls are built by touchActionButton(), which takes the label.
    const placeBlock = "touchActionButton('place', 'place', 'Place', __alloT('stem.geometryworld.a11y_place_block', 'Place block'), placeMobileBlock)";
    expect(text.includes(placeBlock), 'labelled Place block touch control').toBe(true);
    expect(text.indexOf("id: 'geoworld-fs-workspace'")).toBeLessThan(text.indexOf(placeBlock));
  });

  it('offers fullscreen Particle Lab condition sliders with accessible state', () => {
    const text = source('stem_tool_particlelab3d.js');
    expect(text).toContain('showFullscreenConditions');
    expect(text).toContain("id: 'particle-fullscreen-conditions'");
    expect(text).toContain("'aria-controls': 'particle-fullscreen-conditions'");
    // 09-21: the slider names now reach the translator.
    expect(text.includes("'aria-label': __alloT('stem.particlelab3d.fullscreen_temperature_in_kelvin','Fullscreen temperature in kelvin')"), 'temperature slider name').toBe(true);
    expect(text.includes("'aria-label': __alloT('stem.particlelab3d.fullscreen_membrane_permeability','Fullscreen membrane permeability')"), 'permeability slider name').toBe(true);
  });

  it('fullscreens Symmetry Studio with its drawing controls and canvas', () => {
    const text = source('stem_tool_artstudio.js');
    expect(text).toContain("id: 'symmetryFullscreenWorkspace'");
    expect(text).toContain("toggleFullscreen('symmetryFullscreenWorkspace')");
    // 10-01: the canvas container also carries the paper ref that sizes the drawing.
    expect(text.includes("React.createElement(\"div\", {id:'symmetryCanvasContainer',ref:symmetryPaperRef}"), 'canvas container inside the workspace').toBe(true);
    expect(text.indexOf("id: 'symmetryFullscreenWorkspace'")).toBeLessThan(text.indexOf("{id:'symmetryCanvasContainer',ref:symmetryPaperRef}"));
  });

  it('fullscreens the Galaxy Explorer canvas-and-controls grid', () => {
    const text = source('stem_tool_galaxy.js');
    expect(text).toContain('var canvasFrame = canvasEl.parentElement;');
    expect(text).toContain('canvasFrame.parentElement');
    // 09-21 (ede07b89d): the frame takes the viewport and the stage fills its grid row
    // from the stylesheet, instead of an inline calc(100vh - 24px) that left it inset.
    expect(text.includes("frame.style.height = '100dvh';"), 'frame fills the viewport').toBe(true);
    expect(text.includes('[data-galaxy-workspace][data-galaxy-fullscreen=true] > [data-galaxy-stage] { height: 100% !important;'), 'stage fills the fullscreen grid').toBe(true);
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
