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

describe('geometryWorldSunVector', () => {
  let sunVec;
  beforeAll(() => { sunVec = window.StemLab.GeometryWorldSunVector; if (typeof sunVec !== 'function') throw new Error('GeometryWorldSunVector not exposed'); });

  it('always returns a unit vector', () => {
    for (const el of [-20, 0, 9, 45, 58, 90]) for (const az of [-180, -105, 0, 45, 100, 210, 359]) {
      const v = sunVec(el, az);
      expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 12);
    }
  });

  it('puts the sun overhead at 90 degrees and on the horizon at 0', () => {
    const up = sunVec(90, 137);
    expect(up.y).toBeCloseTo(1, 12);
    expect(Math.hypot(up.x, up.z)).toBeCloseTo(0, 12);
    expect(sunVec(0, 0).y).toBeCloseTo(0, 12);
  });

  it('measures azimuth clockwise from +z, so 0 looks along +z and 90 along +x', () => {
    const north = sunVec(0, 0), east = sunVec(0, 90);
    expect(north.z).toBeCloseTo(1, 12);
    expect(north.x).toBeCloseTo(0, 12);
    expect(east.x).toBeCloseTo(1, 12);
    expect(east.z).toBeCloseTo(0, 12);
  });

  it('keeps the day preset on the same bearing as the sun this world always had', () => {
    // The old fixed light sat at (20, 40, 20): due south-east, x === z.
    const day = sunVec(58, 45);
    expect(day.x).toBeCloseTo(day.z, 12);
    expect(day.x).toBeGreaterThan(0);
    expect(day.y).toBeGreaterThan(0.8); // high sun, short shadows
  });

  it('drops the sun toward the horizon for the raking presets', () => {
    // shadow length scales with 1/tan(elevation): sunset must rake far longer than noon
    const noon = sunVec(58, 45).y, dusk = sunVec(9, -105).y;
    expect(dusk).toBeLessThan(noon);
    expect(dusk).toBeGreaterThan(0); // still above the horizon, so shadows have a direction
    expect(dusk).toBeLessThan(0.2);
  });
});

describe('geometryWorldLerpAngle', () => {
  let lerpAngle;
  beforeAll(() => { lerpAngle = window.StemLab.GeometryWorldLerpAngle; if (typeof lerpAngle !== 'function') throw new Error('GeometryWorldLerpAngle not exposed'); });

  const wrap = (a) => ((a % 360) + 360) % 360;

  it('returns the endpoints unchanged', () => {
    expect(lerpAngle(100, -105, 0)).toBe(100);
    expect(wrap(lerpAngle(100, -105, 1))).toBeCloseTo(wrap(-105), 9);
  });

  it('crosses the 0/360 seam the short way', () => {
    expect(wrap(lerpAngle(350, 10, 0.5))).toBeCloseTo(0, 9);
    expect(wrap(lerpAngle(10, 350, 0.5))).toBeCloseTo(0, 9);
  });

  it('never travels more than 180 degrees', () => {
    for (const [a, b] of [[100, -105], [-150, 45], [0, 179], [0, 181], [45, 62]]) {
      const travelled = Math.abs(lerpAngle(a, b, 1) - a);
      expect(travelled).toBeLessThanOrEqual(180 + 1e-9);
    }
  });

  it('swings sunrise to sunset through the far side rather than back across noon', () => {
    // sunrise az 100 -> sunset az -105 is +155 the short way, not -205
    expect(lerpAngle(100, -105, 1)).toBeCloseTo(255, 9);
    expect(lerpAngle(100, -105, 0.5)).toBeCloseTo(177.5, 9);
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
    // one finishBlockTexture per painted generator: grass, grass atlas, brick,
    // wood, sand, stone. Normal maps are linear data and must NOT be tagged.
    expect(src.split('finishBlockTexture(tex);').length - 1).toBe(6);
    expect(src).toContain("_procTexCache[key] = tex;");
    expect(src).not.toMatch(/makeBumpNormalTexture[\s\S]{0,2400}finishBlockTexture\(tex\);[\s\S]{0,200}_procTexCache\[key\]/);
    expect(src).toContain('tex.encoding = THREE.sRGBEncoding');
  });

  it('gives the reflection map only to reflective block types, never the whole scene', () => {
    expect(src).toContain("if (type === 'glass' || type === 'diamond' || type === 'gold' || type === 'water' || type === 'ice') {");
    expect(src).toContain('mat.userData.gwReflective = true;');
    expect(src).not.toContain('engine.scene.environment = rt.texture');
  });

  it('gives every time-of-day preset its own sun position', () => {
    // A preset without sunEl/sunAz would silently fall back to noon, so the sky
    // would recolour while the shadows stayed put — the defect this pass fixed.
    const presets = src.slice(src.indexOf('var ENV_PRESETS = {'), src.indexOf('// Centralized display profiles'));
    for (const key of ['day', 'sunrise', 'sunset', 'night', 'golden']) {
      const line = presets.split('\n').find((l) => l.trim().startsWith(key + ':'));
      expect(line, key).toBeTruthy();
      expect(line, key).toMatch(/sunEl: -?[\d.]+/);
      expect(line, key).toMatch(/sunAz: -?[\d.]+/);
    }
  });

  it('lets the shadow volume travel with the player instead of sitting on the origin', () => {
    // The box is 60 wide but lessons lay ground out to x = 50, so a fixed box left
    // everything past x = 30 with no shadow at all.
    expect(src).toContain('sun.target = engine._sunTarget;');
    expect(src).toContain('engine.scene.add(engine._sunTarget);');
    expect(src).toContain('engine._sunTarget.position.set(stx, 0, stz)');
    // snapped to whole shadow-map texels, or the shadows crawl as the player walks
    expect(src).toContain('Math.round(engine.camera.position.x / texel) * texel');
    // and far enough that a 9-degree sun still clears the world
    expect(src).toMatch(/sun\.shadow\.camera\.near = 0\.5; sun\.shadow\.camera\.far = 2[0-9]{2};/);
  });

  it('keeps bloom above what a lit surface or a white label can reach', () => {
    const m = src.match(/UnrealBloomPass\([^;]*?,\s*([\d.]+)\)\);/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeGreaterThanOrEqual(0.95);
  });
});
