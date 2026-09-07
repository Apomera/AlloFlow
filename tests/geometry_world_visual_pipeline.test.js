// Geometry World — colour pipeline and ground tint.
//
// The renderer encodes its output as sRGB. Hex colours fed to materials raw are
// therefore gamma-encoded twice and reach the display lighter and greyer than
// the palette swatch the student picked; the world now converts them once
// (geometryWorldSrgbColor) and tags painted textures as sRGB. The grass floor
// also carries a deterministic per-cell tint so it reads as turf instead of one
// flat sheet. Both are pure and pinned here without WebGL; the look itself was
// checked by screenshot (scratch/geometry-world-visuals-2026-09-07/captures).

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { readFileSync } from 'node:fs';

let tint;
beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld');
  tint = window.StemLab && window.StemLab.GeometryWorldGroundTint;
  if (typeof tint !== 'function') throw new Error('GeometryWorldGroundTint not exposed on StemLab');
});

describe('geometryWorldGroundTint', () => {
  it('is deterministic: the same cell tints the same on every load', () => {
    for (const [x, z] of [[0, 0], [3, 7], [-4, 24], [50, -10], [12, 12]]) {
      expect(tint(x, z)).toBe(tint(x, z));
    }
  });

  it('stays inside a band narrow enough for the 8% measurement checkerboard to read on top', () => {
    let min = Infinity, max = -Infinity;
    for (let x = -10; x <= 60; x++) for (let z = -10; z <= 30; z++) {
      const v = tint(x, z);
      expect(Number.isFinite(v)).toBe(true);
      min = Math.min(min, v); max = Math.max(max, v);
    }
    expect(min).toBeGreaterThanOrEqual(0.965);
    expect(max).toBeLessThanOrEqual(1.035);
    // and it actually varies (a constant would satisfy the bounds trivially)
    expect(max - min).toBeGreaterThan(0.04);
  });

  it('does not stripe: neighbouring cells are not simply ascending or equal', () => {
    const row = [];
    for (let x = 0; x < 16; x++) row.push(tint(x, 5));
    const distinct = new Set(row.map((v) => v.toFixed(4)));
    expect(distinct.size).toBeGreaterThan(8);
    const ascending = row.every((v, i) => i === 0 || v >= row[i - 1]);
    expect(ascending).toBe(false);
  });
});

describe('geometryWorldVertexAo', () => {
  let ao;
  beforeAll(() => { ao = window.StemLab.GeometryWorldVertexAo; if (typeof ao !== 'function') throw new Error('GeometryWorldVertexAo not exposed'); });
  const cell = { x: 5, y: 0, z: 5 };
  const world = (filled) => (x, y, z) => filled.has(x + ',' + y + ',' + z);

  it('leaves an open corner at full brightness', () => {
    expect(ao(1, 1, 1, 0, 1, 0, cell, world(new Set()))).toBe(1);
  });

  it('darkens the top-face corner next to one neighbouring block', () => {
    // top face (+y) corner at +x,+z; a block standing on the floor at (6,1,5)
    expect(ao(1, 1, 1, 0, 1, 0, cell, world(new Set(['6,1,5'])))).toBe(0.82);
  });

  it('counts the diagonal neighbour on its own as one step', () => {
    expect(ao(1, 1, 1, 0, 1, 0, cell, world(new Set(['6,1,6'])))).toBe(0.82);
  });

  it('treats two edge neighbours as a fully occluded corner regardless of the diagonal', () => {
    expect(ao(1, 1, 1, 0, 1, 0, cell, world(new Set(['6,1,5', '5,1,6'])))).toBe(0.55);
    expect(ao(1, 1, 1, 0, 1, 0, cell, world(new Set(['6,1,5', '5,1,6', '6,1,6'])))).toBe(0.55);
  });

  it('reads the opposite corner from the opposite neighbours', () => {
    const filled = world(new Set(['6,1,5']));
    expect(ao(0, 1, 0, 0, 1, 0, cell, filled)).toBe(1);
    expect(ao(1, 1, 0, 0, 1, 0, cell, filled)).toBe(0.82);
  });

  it('follows the face normal: a side face looks sideways, not up', () => {
    // +x face, top-front corner. The across cell is (6,0,5); its edge neighbours
    // for this corner are (6,1,5) above and (6,0,6) in front, the diagonal (6,1,6).
    // A block at (5,1,5), on top of this cell, is not on the far side of the face.
    expect(ao(1, 1, 1, 1, 0, 0, cell, world(new Set(['5,1,5'])))).toBe(1);
    expect(ao(1, 1, 1, 1, 0, 0, cell, world(new Set(['6,1,5'])))).toBe(0.82);
    expect(ao(1, 1, 1, 1, 0, 0, cell, world(new Set(['6,1,5', '6,1,6'])))).toBe(0.68);
    expect(ao(1, 1, 1, 1, 0, 0, cell, world(new Set(['6,1,5', '6,0,6'])))).toBe(0.55);
  });

  it('gives mid-edge vertices (slab tops, wedge apexes) only the neighbours they actually touch', () => {
    // a vertex at cy = 0.5 on a +x face has no vertical tangent, so only z counts
    expect(ao(1, 0.5, 1, 1, 0, 0, cell, world(new Set(['6,1,5'])))).toBe(1);
    expect(ao(1, 0.5, 1, 1, 0, 0, cell, world(new Set(['6,0,6'])))).toBe(0.82);
  });
});

describe('colour pipeline source contract', () => {
  const src = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
  const pub = readFileSync('desktop/web-app/public/stem_lab/stem_tool_geometryworld.js', 'utf8');

  it('keeps the desktop mirror byte-identical', () => {
    expect(pub).toBe(src);
  });

  it('routes block and character colours through the sRGB-to-linear conversion', () => {
    expect(src).toContain('var color = geometryWorldSrgbColor(THREE, getBlockColor(type));');
    expect(src).toContain('color: geometryWorldSrgbColor(THREE, npcColor)');
    expect(src).toContain('color: geometryWorldSrgbColor(THREE, 0xFFDBB4)');
  });

  it('tags every painted block texture as sRGB', () => {
    // one finishBlockTexture per generator: grass, brick, wood, sand, stone
    expect(src.split('finishBlockTexture(tex);').length - 1).toBe(5);
    expect(src).toContain('tex.encoding = THREE.sRGBEncoding');
  });

  it('gives the reflection map only to reflective block types, never the whole scene', () => {
    expect(src).toContain("if (type === 'glass' || type === 'diamond' || type === 'gold' || type === 'water' || type === 'ice') {");
    expect(src).toContain('mat.userData.gwReflective = true;');
    expect(src).not.toContain('engine.scene.environment = rt.texture');
  });

  it('keeps bloom above what a lit surface or a white label can reach', () => {
    const m = src.match(/UnrealBloomPass\([^;]*?,\s*([\d.]+)\)\);/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeGreaterThanOrEqual(0.95);
  });
});
