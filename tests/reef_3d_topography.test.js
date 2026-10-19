import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Exercise the exact height field used for placement and collision without
// creating a WebGL scene. The public controller remains unchanged.
const source = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
const scope = {};
new Function('window', source.replace('global.Reef3DExplore = { version:',
  'global.terrainTest = { createTerrain, makeBommie }; global.Reef3DExplore = { version:'))(scope);
const { createTerrain, makeBommie } = scope.terrainTest;

describe('reef elevation and swimming clearance', () => {
  it('keeps shallow crests submerged while retaining distinct reef flats and a deep slope', () => {
    for (const seed of [1, 7, 37, 1234]) for (const depth of [5, 9, 16]) {
      const terrain = createTerrain(seed, depth, 4.5), heights = [];
      for (let z = -26; z <= 26; z += 1) for (let x = -26; x <= 26; x += 1) heights.push(terrain.floorY(x, z));
      expect(heights.every(Number.isFinite)).toBe(true);
      expect(Math.max(...heights), `seed ${seed}, depth ${depth}`).toBeLessThan(-3.15);
      expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(12);
    }
  });

  it('keeps the winding sand route continuous with a gentle grade', () => {
    for (const seed of [1, 7, 37, 1234]) for (const depth of [5, 9, 16]) {
      const terrain = createTerrain(seed, depth, 4.5);
      for (let z = -15; z < 14; z += 0.25) {
        const x = terrain.channelX(z), nextX = terrain.channelX(z + 0.25);
        const rise = Math.abs(terrain.floorY(nextX, z + 0.25) - terrain.floorY(x, z));
        expect(terrain.channelMask(x, z)).toBe(1);
        expect(rise / Math.hypot(nextX - x, 0.25)).toBeLessThan(1.1);
      }
    }
  });

  it('exposes bommie crowns on a sloping floor and leaves water above shallow crowns', () => {
    const sloped = makeBommie(0, 0, 3, 2.2, 0.3, 0.5, 0.4, { floorY: (x) => -10 + x * 0.5 });
    expect(sloped.heightAt(0, 0) + 10).toBeGreaterThan(1.6);
    const shallow = makeBommie(0, 0, 3, 4, 0.3, 0.5, 0.4, { floorY: () => -3.3 });
    for (let a = 0; a < Math.PI * 2; a += 0.2) for (let r = 0; r < 1; r += 0.1) {
      const e = shallow.edge(a) * r;
      expect(shallow.heightLocal(Math.cos(a) * e, Math.sin(a) * e)).toBeLessThan(-2.5);
    }
  });

  it('buries rotated limestone skirts below their actual downhill footprint', () => {
    const terrain = { floorY: (x, z) => -10 + 0.65 * x - 0.4 * z };
    // These orientations put an elongated shoulder downhill. Sampling the
    // unrotated footprint leaves a visible gap beneath that shoulder.
    for (const [yaw, shape] of [[0.17, 0.12], [0.3, 0.5], [0.42, 0.5]]) {
      const rock = makeBommie(1, -2, 3, 2.2, yaw, shape, 0.4, terrain);
      for (let step = 0; step < 128; step++) {
        const angle = step / 128 * Math.PI * 2, radius = rock.edge(angle);
        const localX = Math.cos(angle) * radius, localZ = Math.sin(angle) * radius;
        const rim = rock.toWorld(localX, localZ);
        expect(rock.base, `yaw ${yaw}, rim ${step}`).toBeLessThan(terrain.floorY(rim.x, rim.z) - 0.1);
        const shoulder = rock.toWorld(localX * 0.7, localZ * 0.7);
        expect(rock.heightAt(shoulder.x, shoulder.z)).toBeCloseTo(rock.heightLocal(localX * 0.7, localZ * 0.7), 10);
      }
    }
  });
});
