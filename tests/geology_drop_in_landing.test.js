// Drop-in landing + layer-profile seams for the Geology Explorer.
//
// The bug: "Drop in & dig" seeded the walker on a FIXED column, and a learner can hide that
// column (cutaway past ~22 %, focus lens, play-history stage, or digging it out). Hidden
// voxels are not solid ground, so the walker fell out of the block, respawned on the same
// hidden column, and fell again for ever. The physics needs WebGL, so the real-browser
// matrix lives in the Playwright harness; this file pins the pure seams the engine composes.
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeAll(() => {
  window.StemLab = { registerTool: function () {}, isRegistered: function () { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_geologyexplorer.js'), 'utf8'))();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed (window.__alloGeologyPure)');
});
beforeEach(() => { P.setScene('crust'); P.setGrid('standard'); });

describe('fpLandingSearch — nearest standable column, ring by ring', () => {
  const grid = (ok) => (x, z) => (ok(x, z) ? { x, z } : null);

  it('returns the seed column itself when it is standable (ring 0, no relocation)', () => {
    const r = P.fpLandingSearch(7, 10, 14, 14, grid(() => true));
    expect(r).toMatchObject({ x: 7, z: 10, ring: 0 });
  });

  it('walks outward and takes the nearest column when the seed is hidden', () => {
    // Everything at z >= 8 is cut away (a 6-section cutaway on a 14-deep block).
    const r = P.fpLandingSearch(7, 10, 14, 14, grid((x, z) => z < 8));
    expect(r).toMatchObject({ x: 7, z: 7, ring: 3 });
  });

  it('prefers the Euclidean-nearest column inside a ring (straight beats diagonal)', () => {
    // Ring 1 has 8 cells; only the diagonal (6,9) and the straight (8,10) are standable.
    const r = P.fpLandingSearch(7, 10, 14, 14, grid((x, z) => (x === 8 && z === 10) || (x === 6 && z === 9)));
    expect(r).toMatchObject({ x: 8, z: 10, ring: 1, d2: 1 });
  });

  it('never probes outside the grid and returns null when nothing is standable', () => {
    const seen = [];
    const r = P.fpLandingSearch(0, 13, 14, 14, (x, z) => { seen.push([x, z]); return null; });
    expect(r).toBeNull();
    expect(seen.length).toBe(14 * 14);                       // every column exactly once
    expect(seen.every(([x, z]) => x >= 0 && x < 14 && z >= 0 && z < 14)).toBe(true);
  });

  it('reaches a lone standable column in the far corner', () => {
    const r = P.fpLandingSearch(7, 10, 14, 14, grid((x, z) => x === 0 && z === 0));
    expect(r).toMatchObject({ x: 0, z: 0, ring: 10 });
  });
});

describe('layerCauseText — one honest sentence per reason the pad moved', () => {
  it('distinguishes every cause and never returns an empty string', () => {
    const causes = ['cutaway', 'lens', 'history', 'hazard', 'excavation'];
    const texts = causes.map((c) => P.layerCauseText(c));
    texts.forEach((t) => expect(t.length).toBeGreaterThan(10));
    expect(new Set(texts).size).toBe(causes.length);
    expect(P.layerCauseText('cutaway')).toMatch(/cutaway/i);
    expect(P.layerCauseText('lens')).toMatch(/focus lens/i);
    expect(P.layerCauseText('hazard')).toMatch(/molten/i);
  });
});

describe('layerExtent — where a highlighted layer sits, from the scene generator', () => {
  it('reads the crust shale band: 2.7-4.5 km, under sandstone and over limestone', () => {
    const e = P.layerExtent('shale');
    expect(e.count).toBeGreaterThan(0);
    expect(e.radial).toBe(false);
    expect(e.topKm).toBeCloseTo(2.7, 5);
    expect(e.bottomKm).toBeCloseTo(4.5, 5);
    expect(e.thicknessKm).toBeCloseTo(1.8, 5);
    expect(e.above).toBe('sandstone');
    expect(e.below).toBe('limestone');
    expect(e.share).toBeGreaterThan(0.05);
    expect(e.share).toBeLessThan(0.3);
  });

  it('reads soil as the surface layer (nothing above it)', () => {
    const e = P.layerExtent('soil');
    expect(e.topKm).toBe(0);
    expect(e.above).toBeNull();
    expect(e.below).toBe('sandstone');
  });

  it('caps the pluton with its baked rim, not the layers it cut', () => {
    const e = P.layerExtent('intrusion');
    expect(e.count).toBeGreaterThan(0);
    expect(e.above).toBe('hornfels');
  });

  it('flags radial scenes so the caller uses the palette depth instead of rows', () => {
    P.setScene('deepEarth');
    const e = P.layerExtent('outerCore');
    expect(e.radial).toBe(true);
    expect(e.count).toBeGreaterThan(0);
    expect(e.above).toBe('lowerMantle');
    expect(e.below).toBe('innerCore');
  });

  it('is depth-invariant across detail levels (km numbers do not change with voxel count)', () => {
    const std = P.layerExtent('limestone');
    P.setGrid('high');
    const high = P.layerExtent('limestone');
    // The generator maps rows to normalised depth, so a band edge may shift by up to one
    // HIGH-detail row; anything larger would mean the km scale itself moved.
    const oneRowKm = P.grid().KM_PER_VOXEL;
    expect(Math.abs(high.topKm - std.topKm)).toBeLessThanOrEqual(oneRowKm + 1e-9);
    expect(Math.abs(high.bottomKm - std.bottomKm)).toBeLessThanOrEqual(oneRowKm + 1e-9);
    expect(high.count).toBeGreaterThan(std.count);
  });
});

describe('fpBust — the crust now carries misconception lines for the orbit-mode profile', () => {
  it('adds accurate busts for the pluton, aureole, magma and limestone; leaves the existing pins alone', () => {
    expect(P.fpBust('intrusion')).toMatch(/never erupted|underground/i);
    expect(P.fpBust('marble')).toMatch(/limestone/i);
    expect(P.fpBust('hornfels')).toMatch(/shale/i);
    expect(P.fpBust('magma')).toMatch(/lava/i);
    expect(P.fpBust('limestone')).toMatch(/sea/i);
    expect(P.fpBust('crust')).toBeNull();
    expect(P.fpBust('sandstone')).toBeNull();
    expect(P.fpBust('quartz')).toBeNull();
  });
});

describe('selected-material profile (mounted, no WebGL)', () => {
  const act = React.act;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let cfg, container, root;
  beforeAll(() => { resetStemLab(); cfg = loadTool('stem_lab/stem_tool_geologyexplorer.js', 'geologyExplorer'); });
  afterEach(() => { if (root) act(() => root.unmount()); if (container) container.remove(); root = null; container = null; });

  function mount(scene) {
    container = document.createElement('div');
    document.body.appendChild(container);
    const store = newStore({ geologyExplorer: { mode: 'explore', scene } });
    const ctx = makeCtx({ toolData: store.toolData }, store);
    const Comp = () => cfg.render(ctx);
    root = ReactDOMClient.createRoot(container);
    act(() => root.render(React.createElement(Comp)));
    return container;
  }
  const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  const materialButton = (key) => container.querySelector('[data-geology-target="materials"] button[data-geology-material="' + key + '"]');

  it('shows "Where it sits" with span, share and neighbours, plus the misconception line', () => {
    mount('crust');
    const btn = materialButton('limestone');
    expect(btn, 'limestone material button').toBeTruthy();
    click(btn);
    const sits = container.querySelector('[data-geology-layer-sits="limestone"]');
    expect(sits, 'where-it-sits block').toBeTruthy();
    const text = sits.textContent;
    expect(text).toMatch(/Spans 4\.5 km to 6\.3 km deep/);
    expect(text).toMatch(/% of this block/);
    expect(text).toMatch(/Sits under Shale and over/);
    const bust = container.querySelector('[data-geology-layer-bust="limestone"]');
    expect(bust && bust.textContent).toMatch(/under the sea/);
  });

  it('uses shell wording for Deep Earth instead of row-derived depths', () => {
    mount('deepEarth');
    const btn = materialButton('outerCore');
    expect(btn, 'outer core material button').toBeTruthy();
    click(btn);
    const sits = container.querySelector('[data-geology-layer-sits="outerCore"]');
    expect(sits, 'where-it-sits block').toBeTruthy();
    expect(sits.textContent).toMatch(/Shell 4 of 5 from the surface/);
    expect(sits.textContent).not.toMatch(/Spans/);
    expect(sits.textContent).toMatch(/Just inside Lower mantle · wraps around Inner core/i);
  });
});
