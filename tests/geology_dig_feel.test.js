// Geology Explorer first-person "dig feel": the drop-in view, solid walkable props, and
// the particle-size cap. The WebGL itself is verified by the real-browser harness; these
// pin the pure pieces the engine is built on.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');

let P;
beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(sourcePath, 'utf8'))();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});
beforeEach(() => { P.setScene('crust'); P.setGrid('standard'); });

describe('drop-in view', () => {
  it('the crust explorer looks across open ground, not into the volcano', () => {
    const seed = P.fpSeedPose('crust');
    const f = P.fpForward(seed.yaw, seed.pitch);
    const len = Math.hypot(f.x, f.z), dx = f.x / len, dz = f.z / len;
    // closest approach of the horizontal line of sight to the volcano axis (x=0, z=0, radius 2.3)
    const t = -(seed.pos.x * dx + seed.pos.z * dz);
    const cx = seed.pos.x + dx * Math.max(0, t), cz = seed.pos.z + dz * Math.max(0, t);
    expect(Math.hypot(cx, cz)).toBeGreaterThan(2.3);
  });

  it('the first reticle still lands on ground within reach', () => {
    const seed = P.fpSeedPose('crust'), g = P.grid();
    const eyeAboveGround = 1.55 * g.VOXEL;               // FP_EYE_HEIGHT once gravity settles the walker
    const groundDistance = eyeAboveGround / Math.tan(-seed.pitch);
    expect(seed.pitch).toBeLessThan(0);
    expect(groundDistance).toBeLessThan(6 * g.VOXEL);    // FP_REACH
  });

  it('only the crust seed changed; other surface scenes keep their pose', () => {
    ['subduction', 'ridge', 'hotspot', 'collision'].forEach((id) => {
      expect(P.fpSeedPose(id)).toMatchObject({ yaw: 0, pitch: -0.42 });
    });
  });
});

describe('walkable props', () => {
  const cone = { kind: 'cone', x: 0, z: 0, r: 2.3, rTop: 0.276, h: 2.4, base: 6, crater: 0.252 };
  it('is empty outside the footprint', () => {
    expect(P.fpPropSurfaceY(cone, 2.31, 0)).toBeNull();
    expect(P.fpPropSurfaceY(cone, 5, 5)).toBeNull();
  });
  it('rises from the base ring to the summit ring along a straight flank', () => {
    expect(P.fpPropSurfaceY(cone, 2.3, 0)).toBeCloseTo(6, 6);
    const mid = P.fpPropSurfaceY(cone, (2.3 + 0.276) / 2, 0);
    expect(mid).toBeCloseTo(6 + 1.2, 6);
    expect(P.fpPropSurfaceY(cone, 0.276, 0)).toBeCloseTo(8.4, 6);
    // monotone up the flank
    let last = -Infinity;
    for (let d = 2.3; d >= 0.3; d -= 0.1) { const y = P.fpPropSurfaceY(cone, d, 0); expect(y).toBeGreaterThanOrEqual(last); last = y; }
  });
  it('dips into a caldera inside the summit ring', () => {
    expect(P.fpPropSurfaceY(cone, 0, 0)).toBeCloseTo(8.4 - 0.252, 6);
    expect(P.fpPropSurfaceY(cone, 0, 0)).toBeLessThan(P.fpPropSurfaceY(cone, 0.27, 0));
  });
  it('a cylinder prop is a flat top over its footprint', () => {
    const boulder = { kind: 'cyl', x: 1, z: 1, r: 0.3, h: 0.25, base: 6 };
    expect(P.fpPropSurfaceY(boulder, 1.2, 1)).toBeCloseTo(6.25, 6);
    expect(P.fpPropSurfaceY(boulder, 1.31, 1)).toBeNull();
  });
  it('the volcano flank is climbable in one frame step at walking speed', () => {
    // walk speed WORLD.h*0.5 per second, dt capped at 0.05 s → the rise per frame must stay under FP_STEP (0.55 voxel)
    const step = P.WORLD.h * 0.5 * 0.05, rise = step * cone.h / (cone.r - cone.rTop);
    expect(rise).toBeLessThan(0.55 * P.grid().VOXEL);
  });
});

describe('particle size cap', () => {
  it('injects the cap after the size-attenuation line of the real r128 points shader', () => {
    const material = P.capPointSize3d(new THREE.PointsMaterial({ size: 0.42 }), 44);
    const shader = { vertexShader: THREE.ShaderLib.points.vertexShader };
    material.onBeforeCompile(shader);
    const text = shader.vertexShader;
    expect(text).toContain('gl_PointSize = min( gl_PointSize, 44.0 );');
    expect(text.indexOf('gl_PointSize = min(')).toBeGreaterThan(text.indexOf('gl_PointSize *= ( scale / - mvPosition.z )'));
  });
  it('the engine caps dust, chips and atmosphere motes', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    ['excavationDustMaterial3d', 'excavationChipMaterial3d', 'atmosphereMoteMaterial3d'].forEach((name) => {
      expect(src).toMatch(new RegExp('capPointSize3d\\(' + name + ', \\d+\\)'));
    });
  });
});

describe('mirror', () => {
  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
