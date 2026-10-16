import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const api = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), api);
runInNewContext(readFileSync('dev-tools/skyschool-city-reveal.js', 'utf8'), api);
// Exercise the actual existing facade hook without booting the full simulator.
const source = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
const facadeStart = source.indexOf('function attachFlightCityFacade(');
const facadeEnd = source.indexOf('\n}\n', facadeStart) + 3;
if (facadeStart < 0 || facadeEnd <= facadeStart) throw new Error('City facade helper was not found');
runInNewContext(source.slice(facadeStart, facadeEnd), api);
const Three = api.THREE;

function material() { return new Three.MeshLambertMaterial({ vertexColors: true }); }
function shader() {
  return { uniforms: {}, vertexShader: Three.ShaderLib.lambert.vertexShader,
    fragmentShader: Three.ShaderLib.lambert.fragmentShader };
}
function revealGroup(materials) {
  return { userData: { cityReveal: api.createFlightCityReveal(Three, materials) } };
}

describe('mapped city arrival reveal', () => {
  it('shares bounded coverage across opaque walls, roofs, and roads without sorting or extra geometry', () => {
    const mats = [material(), material(), material()];
    try {
      const group = revealGroup(mats);
      const shaders = mats.map(m => { const s = shader(); m.onBeforeCompile(s, {}); return s; });
      const uniform = group.userData.cityReveal.uniform;
      expect(uniform.value).toBe(0);
      for (let i = 0; i < mats.length; i++) {
        expect(mats[i].transparent).toBe(false);
        expect(mats[i].opacity).toBe(1);
        expect(mats[i].depthWrite).toBe(true);
        expect(shaders[i].uniforms.flightCityRevealCoverage).toBe(uniform);
        expect(mats[i].userData.flightCityReveal.patched).toBe(true);
      }
      expect(api.updateFlightCityReveal(group, 0.3, false).progress).toBeCloseTo(0.5);
      expect(uniform.value).toBeCloseTo(0.5);
      expect(api.updateFlightCityReveal(group, 0.3, false).active).toBe(false);
      expect(uniform.value).toBe(1);
    } finally { mats.forEach(m => m.dispose()); }
  });

  it('preserves the real facade, fog, lighting and custom program identity through the shader chain', () => {
    const m = material();
    try {
      m.fog = true;
      m.emissive.setRGB(0.55, 0.3, 0.1);
      api.attachFlightCityFacade(m, Three);
      const facadeKey = m.customProgramCacheKey();
      api.attachFlightCityReveal(m, Three);
      const s = shader();
      m.onBeforeCompile(s, {});
      expect(m.userData.flightCityFacade.patched).toBe(true);
      expect(m.userData.flightCityReveal.patched).toBe(true);
      expect(m.customProgramCacheKey()).toBe(facadeKey + '|flight-city-reveal:v1');
      expect(s.fragmentShader).toContain('totalEmissiveRadiance *= flightFacadeLight * flightFacadeWall');
      expect(s.fragmentShader).toContain('#include <fog_fragment>');
      expect(s.vertexShader).toContain('#include <lights_lambert_vertex>');
      expect(s.fragmentShader).toContain('flightCityRevealThreshold(gl_FragCoord.xy)');
      expect(m.fog).toBe(true);
      expect(m.emissive.r).toBe(0.55);
      const hook = m.onBeforeCompile;
      api.attachFlightCityReveal(m, Three);
      expect(m.onBeforeCompile).toBe(hook);
    } finally { m.dispose(); }
  });

  it('keeps unsupported shaders fully visible and leaves their code and uniforms unchanged', () => {
    const m = material();
    try {
      api.attachFlightCityReveal(m, Three, { value: 0 });
      const s = { fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }', uniforms: { existing: { value: 1 } } };
      const original = s.fragmentShader, uniforms = s.uniforms;
      m.onBeforeCompile(s, {});
      expect(s.fragmentShader).toBe(original);
      expect(s.uniforms).toBe(uniforms);
      expect(Object.keys(s.uniforms)).toEqual(['existing']);
      expect(m.userData.flightCityReveal.patched).toBe(false);
      expect(m.userData.flightCityReveal.reason).toBe('unsupported-shader-chunks');
      expect(m.transparent).toBe(false);
      expect(m.opacity).toBe(1);
      m.onBeforeCompile(null, {});
      expect(m.userData.flightCityReveal.reason).toBe('invalid-shader');
    } finally { m.dispose(); }
  });

  it('does not overwrite an existing reveal uniform or alter a non-Lambert material', () => {
    const m = material(), basic = new Three.MeshBasicMaterial();
    try {
      api.attachFlightCityReveal(m, Three);
      const s = shader(), existing = { value: 0.75 }, original = s.fragmentShader;
      s.uniforms.flightCityRevealCoverage = existing;
      m.onBeforeCompile(s, {});
      expect(s.uniforms.flightCityRevealCoverage).toBe(existing);
      expect(s.fragmentShader).toBe(original);
      expect(m.userData.flightCityReveal.reason).toBe('uniform-already-defined');
      const originalHook = basic.onBeforeCompile;
      expect(api.attachFlightCityReveal(basic, Three)).toBe(basic);
      expect(basic.onBeforeCompile).toBe(originalHook);
    } finally { m.dispose(); basic.dispose(); }
  });

  it('makes progress independent of frame subdivision and never changes simulation time', () => {
    const one = revealGroup([]), many = revealGroup([]);
    api.updateFlightCityReveal(one, 0.3, false);
    for (let i = 0; i < 18; i++) api.updateFlightCityReveal(many, 1 / 60, false);
    expect(many.userData.cityReveal.progress).toBeCloseTo(one.userData.cityReveal.progress, 10);
    expect(many.userData.cityReveal.elapsed).toBeCloseTo(0.3, 10);
    expect(many.userData.cityReveal.active).toBe(true);
    expect(api.updateFlightCityReveal(many, 1000, false).progress).toBe(1);
    expect(api.updateFlightCityReveal(many, 0.1, false).progress).toBe(1);
  });

  it('ignores invalid or negative deltas and snaps paused or reduced-motion frames to completion', () => {
    const group = revealGroup([]);
    for (const delta of [0, -0.1, NaN, Infinity, undefined]) {
      expect(api.updateFlightCityReveal(group, delta, false).progress).toBe(0);
      expect(group.userData.cityReveal.active).toBe(true);
    }
    expect(api.updateFlightCityReveal(group, 0, true).progress).toBe(1);
    expect(group.userData.cityReveal.active).toBe(false);
    expect(group.userData.cityReveal.uniform.value).toBe(1);
    expect(api.updateFlightCityReveal(null, NaN, false)).toEqual({ progress: 1, active: false });
  });

  it('defaults an independently attached material to full visibility and sanitizes invalid initial coverage', () => {
    for (const [value, expected] of [[undefined, 1], [NaN, 1], [Infinity, 1], [-4, 0], [5, 1]]) {
      const m = material();
      try {
        api.attachFlightCityReveal(m, Three, value === undefined ? undefined : { value });
        const s = shader();
        m.onBeforeCompile(s, {});
        expect(s.uniforms.flightCityRevealCoverage.value).toBe(expected);
      } finally { m.dispose(); }
    }
  });
});
