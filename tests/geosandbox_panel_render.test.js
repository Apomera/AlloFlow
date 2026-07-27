// Geometry Sandbox PANEL render tests — what a student actually sees.
//
// Deliberately NOT a sha-digest golden. Rendered with empty toolData this tool
// returns 347 bytes of "Loading 3D engine…" (the whole UI is gated behind
// _threeLoaded), so a default-state digest would pin the spinner and nothing
// else — which is why geosandbox was never in stem_tool_golden's list. Passing
// real state renders ~30KB of panel, and these assert on MEANING rather than a
// hash, so an intentional copy tweak does not force a rebaseline.
//
// What this layer covers that nothing else does: geoEffectiveAxis / geoVerbApplies
// are unit-tested as pure functions, but only the render decides whether the
// student is ever shown what they say.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const POINT = { id: 1, type: 'point', position: [0, 0, 0] };
const SEG_X = { id: 2, type: 'segment', position: [0, 0, 0], vector: [3, 0, 0] };
const RECT = { id: 3, type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 2, 0] };
const PRISM = { id: 4, type: 'prism', position: [0, 0, 0], u: [3, 0, 0], v: [0, 2, 0], w: [0, 0, 4] };

function panel(geo) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_geosandbox.js', 'geoSandbox');
  return renderTool('geoSandbox', {
    _threeLoaded: true,
    geoSandbox: Object.assign({ mode: 'stretch', buildVerb: 'stretch', stretchAxis: 'x' }, geo),
  });
}
const withScene = (objects, selection, extra) =>
  panel(Object.assign({ construction: { objects, selection } }, extra || {}));

beforeEach(() => resetStemLab());

describe('the panel renders at all', () => {
  it('shows only the loader until the 3D engine is ready', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_geosandbox.js', 'geoSandbox');
    const html = renderTool('geoSandbox', {});
    expect(html.length).toBeLessThan(1000);
    expect(html).toContain('Loading 3D engine');
  });

  it('renders the full stretch builder once it is', () => {
    const html = withScene([POINT], 1);
    expect(html.length).toBeGreaterThan(10000);
    expect(html).toContain('Dimensional Stretch Builder');
  });
});

describe('the next move is always named', () => {
  it('says to start with a point when the scene is empty', () => {
    const html = withScene([], null);
    expect(html).toContain('Start with a point');
    // "Select an object first" is advice you cannot act on with nothing to select.
    expect(html).not.toContain('Select an object first');
  });

  it('asks for a selection once objects exist', () => {
    const html = withScene([POINT], null);
    expect(html).toContain('Select an object first');
    expect(html).not.toContain('Start with a point');
  });

  it('names the dimension each stretch produces', () => {
    expect(withScene([POINT], 1)).toContain('segment (1D)');
    expect(withScene([POINT, SEG_X], 2)).toContain('rectangle (2D)');
    expect(withScene([POINT, SEG_X, RECT], 3)).toContain('prism (3D)');
  });

  it('stops at 3D rather than offering a move that cannot happen', () => {
    const html = withScene([PRISM], 4);
    expect(html).toContain('Already a solid (3D)');
  });

  it('explains what taper and revolve need instead of just greying out', () => {
    ['taper', 'revolve'].forEach((buildVerb) => {
      expect(withScene([POINT], 1, { buildVerb })).toContain('needs a rectangle');
    });
  });
});

describe('the axis control tells the truth about itself', () => {
  it('replaces the picker with a fixed readout where it cannot apply', () => {
    const html = withScene([RECT], 3);
    expect(html).toContain('Stretch direction:');
    expect(html).toContain('Straight out of the face');
    expect(html).toContain('the only direction that adds a third dimension');
    // Replaced, not dimmed — the radiogroup is gone from the tree entirely, so
    // there is no inert control left to click or tab into.
    expect(html).not.toContain('aria-label="Stretch axis"');
    expect(html).not.toContain('Stretch axis:');
  });

  it('shows the live picker for a point, which can stretch any way', () => {
    const html = withScene([POINT], 1);
    expect(html).toContain('Stretch axis:');
    expect(html).toContain('aria-label="Stretch axis"');
    expect(html).not.toContain('Straight out of the face');
  });

  it('names the substitute when the picked axis runs along the segment', () => {
    const along = withScene([SEG_X], 2, { stretchAxis: 'x' });
    expect(along).toContain('would only make it longer');
    expect(along).toContain('It will use');

    // A genuinely perpendicular pick is left alone and says nothing.
    const across = withScene([SEG_X], 2, { stretchAxis: 'y' });
    expect(across).not.toContain('would only make it longer');
  });

  it('calls the axis a spin axis when revolving', () => {
    const html = withScene([RECT], 3, { buildVerb: 'revolve' });
    expect(html).toContain('Spin axis:');
    expect(html).toContain('spins around');
    // Revolve is the one verb where the picker really is live on a rectangle.
    expect(html).not.toContain('Straight out of the face');
  });
});

describe('the canvas description carries what only the 3D view shows', () => {
  // The placement ghost is drawn in WebGL. A screen-reader user never sees it, so
  // the canvas description is their only route to the same information — and it is
  // wired through the render, which the pure geoDescribePlacement tests cannot check.
  it('describes a raised drop target', () => {
    const html = withScene([POINT], 1, { placeY: 4 });
    expect(html).toContain('geo-sandbox-canvas-description');
    expect(html).toContain('height 4');
  });

  it('describes click-to-place being armed', () => {
    expect(withScene([POINT], 1, { placeArmed: true })).toContain('Click-to-place is on');
  });

  it('stays silent about placement in the default state', () => {
    const html = withScene([POINT], 1);
    expect(html).not.toContain('Click-to-place is on');
    expect(html).not.toContain('Place button will drop');
  });
});

describe('placing a point at a height', () => {
  it('offers X, Z and a height field', () => {
    const html = withScene([], null);
    expect(html).toContain('Point X position');
    expect(html).toContain('Point Z position');
    expect(html).toContain('Point height above the grid');
  });

  it('warns that taps will land off the floor only when they will', () => {
    const raised = withScene([], null, { placeArmed: true, placeY: 3 });
    expect(raised).toContain('Taps land at height');

    const onFloor = withScene([], null, { placeArmed: true, placeY: 0 });
    expect(onFloor).not.toContain('Taps land at height');
  });
});
