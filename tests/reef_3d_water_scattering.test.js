import { afterEach, describe, expect, it, vi } from 'vitest';
import { THREE, SOURCE, runtime, cleanup } from './helpers/reef_dive_harness.js';

vi.setConfig({ testTimeout: 60000 });
afterEach(() => cleanup());
// Exercise the scalar functions that are actually inserted into GLSL, rather
// than maintaining a second, approximate implementation of the optical math.
const scope = {};
new Function('window', SOURCE.replace('global.Reef3DExplore = { version:',
  'global.__waterOptics = { source: WATER_COLUMN_SOURCE, phase: WATER_SCATTER_PHASE }; global.Reef3DExplore = { version:'))(scope);
function scalar(glsl, name) {
  const signature = new RegExp('float ' + name + '\\(([^)]*)\\)');
  const js = glsl.replace(signature, (_, parameters) => 'return function (' + parameters.replace(/\bfloat\s+/g, '') + ')').replace(/\bfloat\s+/g, 'var ');
  return new Function('max', 'min', 'exp', 'clamp', js)(Math.max, Math.min, Math.exp, (v, lo, hi) => Math.max(lo, Math.min(hi, v)));
}
const source = scalar(scope.__waterOptics.source, 'reefWaterSource');
const phase = scalar(scope.__waterOptics.phase, 'reefScatterPhase');
const EXTINCTION = [0.065, 0.042, 0.030];
function compile(t, material) {
  const standard = THREE.ShaderLib.standard;
  const shader = { uniforms: THREE.UniformsUtils.clone(standard.uniforms), vertexShader: standard.vertexShader, fragmentShader: standard.fragmentShader };
  material.onBeforeCompile(shader, t.renderer);
  return shader;
}
function kind(t, id) {
  let found;
  t.scene.traverse((object) => { if (object.userData.kind === id && object.userData.lod === 'near') found = object; });
  expect(found).toBeTruthy();
  return found;
}

describe('depth-aware reef water scattering', () => {
  it('stays finite and bounded from the surface to deep water, above and below a point, in clear and turbid water', () => {
    for (const eye of [0.01, 0.9, 3, 9, 24, 40]) for (const target of [0.01, 0.9, 8, 24, 40]) for (const horizontal of [0, 0.001, 1, 12, 70]) for (const murk of [1, 1.1, 1.35]) {
      const distance = Math.hypot(horizontal, target - eye), up = distance ? (eye - target) / distance : 0;
      for (const extinction of EXTINCTION) {
        const k = extinction * murk, transmittance = Math.exp(-k * distance), veil = source(k, distance, eye, up, 0.024);
        expect(Number.isFinite(veil)).toBe(true);
        expect(veil).toBeGreaterThanOrEqual(0);
        expect(veil).toBeLessThanOrEqual(1.08 * (1 - transmittance) + 1e-12);
        for (const cosine of [-1, 0, 0.000001, 0.7, 1]) {
          const colour = transmittance + veil * (0.88 + 0.1 * phase(cosine));
          expect(Number.isFinite(colour)).toBe(true);
          expect(colour).toBeGreaterThanOrEqual(0);
          expect(colour).toBeLessThan(1.27);
        }
        if (murk > 1 && distance > 0) expect(transmittance).toBeLessThan(Math.exp(-extinction * distance));
      }
    }
  });

  it('has a transparent origin and a continuous horizon and tangent-light transition', () => {
    for (const k of EXTINCTION) {
      expect(source(k, 0, 9, 0, 0.024)).toBe(0);
      expect(source(k, 0.000001, 9, 0, 0.024)).toBeLessThan(0.000001);
      const flat = source(k, 20, 9, 0, 0.024);
      for (const up of [-0.000001, 0.000001]) expect(Math.abs(source(k, 20, 9, up, 0.024) - flat)).toBeLessThan(0.000001);
      // With no depth falloff the integral reduces to ordinary homogeneous fog.
      expect(source(k, 12, 9, 0.7, 0)).toBeCloseTo(1.08 * (1 - Math.exp(-k * 12)), 12);
    }
    expect(Math.abs(phase(0.000001) - phase(-0.000001))).toBeLessThan(0.00001);
    expect(phase(1)).toBeGreaterThan(phase(0));
    expect(phase(0)).toBeGreaterThan(phase(-1));
    expect(phase(-10)).toBe(phase(-1));
    expect(phase(10)).toBe(phase(1));
  });

  it('receives more scattered sunlight when looking upward and less at deeper viewpoints', () => {
    for (const k of EXTINCTION) {
      const up = source(k, 5, 10, 1, 0.024), level = source(k, 5, 10, 0, 0.024), down = source(k, 5, 10, -1, 0.024);
      expect(up).toBeGreaterThan(level);
      expect(level).toBeGreaterThan(down);
      expect(source(k, 12, 24, 0, 0.024)).toBeLessThan(source(k, 12, 3, 0, 0.024));
    }
  });

  it('shares one extinction field across reef, coral and the unchanged shaft counts on both quality tiers', () => {
    for (const quality of ['low', 'high']) {
      const t = runtime({ quality });
      const floor = compile(t, t.scene.getObjectByName('reef-explore-floor').material), coral = compile(t, kind(t, 'plate').material);
      expect(coral.uniforms.reefWaterExtinction).toBe(floor.uniforms.reefWaterExtinction);
      expect(coral.uniforms.reefWaterSunFalloff).toBe(floor.uniforms.reefWaterSunFalloff);
      expect(floor.uniforms.reefWaterSunFalloff.value).toBeGreaterThan(0);
      expect(floor.uniforms.reefWaterSunFalloff.value).toBeLessThan(floor.uniforms.reefWaterExtinction.value.z);
      expect(coral.fragmentShader).toContain('reefGrowthBands');
      const shafts = t.scene.children.filter((object) => object.name === 'reef-explore-shaft');
      expect(shafts).toHaveLength(quality === 'high' ? 8 : 4);
      expect(new Set(shafts.map((object) => object.material.customProgramCacheKey())).size).toBe(1);
      for (const object of shafts) {
        const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
        object.material.onBeforeCompile(shader, t.renderer);
        expect(shader.uniforms.reefWaterExtinction).toBe(floor.uniforms.reefWaterExtinction);
        expect(shader.uniforms.reefCausticTime).toBe(floor.uniforms.reefCausticTime);
        expect(shader.fragmentShader).toContain(scope.__waterOptics.phase);
        expect(object.geometry.attributes.position.count).toBe(4);
      }
    }
  });

  it('keeps optical coefficients steady while reduced-motion time advances and pauses', () => {
    for (const reducedMotion of [false, true]) {
      const t = runtime({ reducedMotion });
      const shader = compile(t, t.scene.getObjectByName('reef-explore-floor').material);
      const before = shader.uniforms.reefWaterExtinction.value.toArray(), falloff = shader.uniforms.reefWaterSunFalloff.value;
      t.run(1);
      t.controller.setPaused(true); t.step();
      const time = shader.uniforms.reefCausticTime.value;
      t.run(1);
      expect(shader.uniforms.reefWaterExtinction.value.toArray()).toEqual(before);
      expect(shader.uniforms.reefWaterSunFalloff.value).toBe(falloff);
      expect(shader.uniforms.reefCausticTime.value).toBe(time);
      expect(t.errors).toEqual([]);
    }
  });
});
