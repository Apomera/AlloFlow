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
