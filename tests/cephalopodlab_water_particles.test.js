import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const start = source.indexOf('function createCLHuntMarineSnowGeometry(');
const end = source.indexOf('function clHuntPropulsionText(', start);
if (start < 0 || end <= start) throw new Error('Could not locate the integrated water-presentation helpers');
const visualMath = Object.create(Math);
visualMath.random = () => { throw new Error('Visual water helpers must not consume simulation RNG'); };
const helpers = new Function('Math', source.slice(start, end) + ';return {floc:createCLHuntMarineSnowGeometry,update:updateCLHuntWaterParticles,shade:shadeCLHuntWaterParticles};')(visualMath);

function field(count = 200) {
  const positions = new Float32Array(count * 3), legacy = new Float32Array(count * 3), velocities = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    legacy[i * 3] = ((i * 37) % 101) / 100 * 120 - 60;
    legacy[i * 3 + 1] = 1 + ((i * 17) % 97) / 96 * 8;
    legacy[i * 3 + 2] = ((i * 43) % 103) / 102 * 120 - 60;
    velocities[i * 3] = .06;velocities[i * 3 + 1] = -.02;velocities[i * 3 + 2] = -.04;
  }
  return { positions, legacy, velocities, state: { initialized: false } };
}
function update(f, center, dt = .05, reduced = false) {
  return helpers.update(f.state, f.positions, f.legacy, f.velocities, center, dt, reduced);
}
function expectBounds(positions, center) {
  const origin = [center.x, center.y, center.z];
  positions.forEach((value, index) => {
    expect(Number.isFinite(value)).toBe(true);
    expect(Math.abs(value - origin[index % 3])).toBeLessThanOrEqual((index % 3 === 1 ? 8 : 18) + .0001);
  });
}

describe('Cephalopod Hunter water particle presentation', () => {
  it('builds a deterministic small irregular floc with finite normals and fewer triangles than the old food sphere', () => {
    const first = helpers.floc(THREE), second = helpers.floc(THREE);
    try {
      expect(first.attributes.position.count).toBe(84);
      expect(Array.from(first.attributes.position.array)).toEqual(Array.from(second.attributes.position.array));
      expect(first.boundingSphere.radius).toBeGreaterThan(.035);
      expect(first.boundingSphere.radius).toBeLessThan(.09);
      expect(Array.from(first.attributes.position.array).every(Number.isFinite)).toBe(true);
      const normals = first.attributes.normal.array;
      for (let i = 0; i < normals.length; i += 3) expect(Math.hypot(normals[i], normals[i + 1], normals[i + 2])).toBeCloseTo(1, 5);
      expect(new Set(Array.from(normals).map(value => value.toFixed(3))).size).toBeGreaterThan(12);
    } finally { first.dispose();second.dispose(); }
  });

  it('initializes a real three-dimensional field around a deep player without changing legacy data or using RNG', () => {
    const f = field(), center = { x: 42, y: -12, z: 0 }, legacy = Array.from(f.legacy), velocity = Array.from(f.velocities);
    expect(() => update(f, center, 0)).not.toThrow();
    expectBounds(f.positions, center);
    const depths = Array.from(f.positions).filter((_, i) => i % 3 === 1);
    expect(Math.min(...depths)).toBeLessThan(-18);
    expect(Math.max(...depths)).toBeGreaterThan(-6);
    expect(Array.from(f.legacy)).toEqual(legacy);
    expect(Array.from(f.velocities)).toEqual(velocity);
  });

  it('keeps nearby particles in world space and wraps into bounded depth after long horizontal and vertical travel', () => {
    const f = field(1);f.legacy.set([0, 5, 0]);
    update(f, { x: 0, y: 0, z: 0 }, 0);
    const original = Array.from(f.positions), buffer = f.positions.buffer;
    update(f, { x: 1, y: -1, z: 1 }, 0, true);
    expect(Array.from(f.positions)).toEqual(original);
    for (const center of [{ x: 360, y: -35, z: -260 }, { x: -470, y: 15, z: 385 }, { x: 42, y: -12, z: 0 }]) {
      update(f, center, 0, true);expectBounds(f.positions, center);
      expect(f.positions.buffer).toBe(buffer);
    }
  });

  it('freezes decorative positions exactly for zero time and reduced motion while permitting travel wrapping', () => {
    const f = field(), center = { x: 42, y: -12, z: 0 };
    update(f, center, 0);
    const frozen = Array.from(f.positions), buffer = f.positions.buffer;
    for (let i = 0; i < 20; i++) {
      expect(update(f, center, 0, false)).toBe(false);
      expect(update(f, center, .05, true)).toBe(false);
    }
    expect(Array.from(f.positions)).toEqual(frozen);
    expect(f.positions.buffer).toBe(buffer);
    expect(update(f, { x: 120, y: -25, z: 90 }, 0, true)).toBe(true);
    expectBounds(f.positions, { x: 120, y: -25, z: 90 });
  });

  it('advances drift in place without writing the legacy seed positions or velocities', () => {
    const f = field(), center = { x: 42, y: -12, z: 0 };
    update(f, center, 0);
    const before = Array.from(f.positions), legacy = Array.from(f.legacy), velocity = Array.from(f.velocities), buffer = f.positions.buffer;
    for (let i = 0; i < 180; i++) update(f, center);
    expect(Array.from(f.positions)).not.toEqual(before);
    expectBounds(f.positions, center);
    expect(f.positions.buffer).toBe(buffer);
    expect(Array.from(f.legacy)).toEqual(legacy);
    expect(Array.from(f.velocities)).toEqual(velocity);
  });

  it('keeps original seeded recycling on the legacy buffer independently of the visible cloud', () => {
    const a = source.indexOf('var planktonAttr = planktonLegacyAttr;');
    const marker = 'planktonAttr.needsUpdate = true;';
    const b = source.indexOf(marker, a);
    if (a < 0 || b <= a) throw new Error('Could not locate the live legacy plankton update');
    const stepLegacy = new Function('planktonLegacyAttr', 'planktonVel', 'octopus', 'dt', 'PLANKTON_COUNT', 'Math', 'plankton', source.slice(a, b + marker.length));
    const positions = new Float32Array([100, 4, 0, 0, .4, 0, 0, 9.1, 0]);
    const velocities = new Float32Array([0, 0, 0, 0, -.02, 0, 0, .02, 0]);
    const rng = Object.create(Math), draws = [.25, .5, .75];let calls = 0;
    rng.random = () => { if (calls >= draws.length) throw new Error('Unexpected extra random draw');return draws[calls++]; };
    const visible = new Proxy({}, { get() { throw new Error('Legacy recycling read the visible cloud'); } });
    stepLegacy({ array: positions }, velocities, { position: { x: 0, y: -35, z: 0 } }, .05, 3, rng, visible);
    expect(calls).toBe(3);
    expect(Array.from(positions.slice(0, 3))).toEqual([-20, 5, 20]);
    expect(velocities[4]).toBeGreaterThan(0);
    expect(velocities[7]).toBeLessThan(0);
  });

  it('modifies the actual r128 point shader with a pixel-ratio-aware size cap, near fade and soft edge', () => {
    const shader = { vertexShader: THREE.ShaderLib.points.vertexShader, fragmentShader: THREE.ShaderLib.points.fragmentShader, uniforms: {} };
    helpers.shade(shader, 1.5);
    expect(shader.uniforms.clParticleMaxSize.value).toBe(4.5);
    expect(shader.vertexShader).toContain('attribute float clParticleScale;');
    expect(shader.vertexShader).toContain('attribute float clParticleBrightness;');
    expect(shader.vertexShader).toContain('gl_PointSize=min(gl_PointSize*clParticleScale,clParticleMaxSize)');
    expect(shader.fragmentShader).toContain('smoothstep(0.9,2.4,clParticleDepth)');
    expect(shader.fragmentShader).toContain('smoothstep(0.08,0.5,clParticleRadius)');
    expect(shader.vertexShader).not.toContain('\\n');
    expect(shader.fragmentShader).not.toContain('\\n');
  });
});
