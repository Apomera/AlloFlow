import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const api = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), api);
const source = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
const solarStart = source.indexOf('  function getFlightSolarFrame(');
const solarEnd = source.indexOf('  function getTerrainSunLight(', solarStart);
if (solarStart < 0 || solarEnd <= solarStart) throw new Error('Production solar helpers were not found');
runInNewContext(source.slice(solarStart, solarEnd), api);
runInNewContext(readFileSync('dev-tools/skyschool-atmosphere.js', 'utf8'), api);
const Three = api.THREE;
const palette = api.getFlightSkyPalette;
const environment = { haze: [175, 195, 210], visibilityFactor: 0.9 };
const rgb = color => [color.r, color.g, color.b];
const luminance = color => 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2];
const chroma = color => Math.max(...color) - Math.min(...color);
const difference = (a, b) => Math.max(...a.map((value, index) => Math.abs(value - b[index])));
function bounded(colors) {
  for (const key of ['horizon', 'zenith']) {
    expect(colors[key]).toHaveLength(3);
    for (const value of colors[key]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  }
}

describe('atmospheric sky palette', () => {
  it('provides finite normalized colors through day, twilight, night, weather, and altitude', () => {
    for (let hour = 0; hour < 24; hour += 0.5) {
      for (const [altitude, visibility] of [[0, 1], [35000, 1], [80000, 0.4], [1500, 0.25]]) {
        bounded(palette(hour, environment, altitude, visibility));
      }
    }
  });

  it('uses finite defaults and wraps the existing solar clock', () => {
    const noon = palette(12, environment, 0, 1);
    for (const hour of [undefined, null, NaN, Infinity, -Infinity]) expect(palette(hour, environment, 0, 1)).toEqual(noon);
    for (const [input, wrapped] of [[-1, 23], [25, 1], [48, 0], [-48, 0]]) {
      expect(palette(input, environment, 1000, 0.6)).toEqual(palette(wrapped, environment, 1000, 0.6));
    }
    for (const altitude of [undefined, null, NaN, Infinity, -Infinity]) {
      expect(palette(12, environment, altitude, 1)).toEqual(noon);
    }
    for (const visibility of [undefined, null, NaN, Infinity, -Infinity]) {
      expect(palette(12, environment, 0, visibility)).toEqual(noon);
    }
  });

  it('has no color steps at either horizon, midnight, or the old dusk boundaries', () => {
    const oldBoundaries = [0.2, 0.4].flatMap(brightness => {
      const offset = Math.acos(brightness) * 12 / Math.PI;
      return [12 - offset, 12 + offset];
    });
    const twilightBoundaries = [-12, -6, -4, 0, 6, 12, 20].flatMap(elevation => {
      const hour = 6 + Math.asin(elevation * Math.PI / 180 / 1.15) * 12 / Math.PI;
      return [hour, 24 - hour];
    });
    for (const hour of [0, 4, 6, 18, 20, 24, ...oldBoundaries, ...twilightBoundaries]) {
      const before = palette(hour - 0.0001, environment, 1500, 0.7);
      const after = palette(hour + 0.0001, environment, 1500, 0.7);
      expect(difference(before.horizon, after.horizon), 'horizon at ' + hour).toBeLessThan(0.001);
      expect(difference(before.zenith, after.zenith), 'zenith at ' + hour).toBeLessThan(0.001);
    }
  });

  it('keeps a lighter horizon and a deeper blue zenith in clear daylight', () => {
    const noon = palette(12, environment, 1500, 1);
    expect(luminance(noon.horizon)).toBeGreaterThan(luminance(noon.zenith));
    expect(noon.zenith[2]).toBeGreaterThan(noon.zenith[0]);
    expect(difference(noon.horizon, noon.zenith)).toBeGreaterThan(0.05);
    const night = palette(0, environment, 1500, 1);
    expect(luminance(night.horizon)).toBeLessThan(luminance(noon.horizon));
    expect(luminance(night.zenith)).toBeLessThan(luminance(noon.zenith));
  });

  it('softens blue saturation in poor visibility and darkens the upper sky at high altitude', () => {
    const clear = palette(12, environment, 0, 1), gray = palette(12, environment, 0, 0.25);
    expect(chroma(gray.zenith)).toBeLessThan(chroma(clear.zenith));
    expect(chroma(gray.horizon)).toBeLessThan(chroma(clear.horizon));
    const high = palette(12, environment, 60000, 1);
    expect(luminance(high.zenith)).toBeLessThan(luminance(clear.zenith));
  });

  it('bounds malformed environment and extreme inputs without changing caller data', () => {
    const env = Object.freeze({ haze: Object.freeze([175, 195, 210]), visibilityFactor: 0.9 });
    const original = palette(17, env, 1500, 0.7);
    expect(palette(17, env, 1500, 0.7)).toEqual(original);
    for (const invalid of [null, undefined, {}, { haze: [] }, { haze: [NaN, Infinity, -Infinity] },
      { haze: [-200, 900, 10], visibilityFactor: NaN }, { haze: 'blue', visibilityFactor: Infinity }]) {
      bounded(palette(17, invalid, -1000000, -5));
      bounded(palette(17, invalid, 1000000, 5));
    }
    expect(env).toEqual({ haze: [175, 195, 210], visibilityFactor: 0.9 });
    expect(palette(12, env, -10000, 1)).toEqual(palette(12, env, 0, 1));
    expect(palette(12, env, 1000000, 1)).toEqual(palette(12, env, 65000, 1));
    expect(palette(12, env, 0, -5)).toEqual(palette(12, env, 0, 0.25));
    expect(palette(12, env, 0, 5)).toEqual(palette(12, env, 0, 1));
  });
});

function material() { return new Three.MeshBasicMaterial({ side: Three.BackSide, fog: false }); }
function shader() {
  return { uniforms: {}, vertexShader: Three.ShaderLib.basic.vertexShader,
    fragmentShader: Three.ShaderLib.basic.fragmentShader };
}

describe('Three r128 atmospheric sky material', () => {
  it('patches the actual basic shader while retaining alpha, output encoding, and opaque render behavior', () => {
    const m = material();
    try {
      expect(api.attachFlightSkyGradient(m, Three)).toBe(m);
      const s = shader(); m.onBeforeCompile(s, {});
      const diagnostic = m.userData.flightSkyGradient;
      expect(diagnostic).toMatchObject({ version: 1, attached: true, patched: true });
      expect(s.uniforms.flightSkyZenith).toBe(diagnostic.uniforms.zenith);
      expect(s.vertexShader).toContain('varying vec3 vFlightSkyDirection');
      expect(s.fragmentShader).toContain('varying vec3 vFlightSkyDirection');
      for (const chunk of ['tonemapping_fragment', 'encodings_fragment', 'fog_fragment', 'dithering_fragment']) {
        expect(s.fragmentShader).toContain('#include <' + chunk + '>');
      }
      expect(s.fragmentShader).toContain('diffuseColor.a');
      expect(m.side).toBe(Three.BackSide);
      expect(m.transparent).toBe(false); expect(m.opacity).toBe(1);
      expect(m.depthWrite).toBe(true); expect(m.fog).toBe(false);
    } finally { m.dispose(); }
  });

  it('anchors elevation to world up without translating the sky direction with the camera', () => {
    const m = material();
    try {
      api.attachFlightSkyGradient(m, Three);
      const s = shader(); m.onBeforeCompile(s, {});
      expect(s.vertexShader).toContain('(modelMatrix * vec4(transformed, 0.0)).xyz');
      const assignment = s.vertexShader.split('\n').find(line => line.includes('vFlightSkyDirection ='));
      expect(assignment).not.toContain('modelViewMatrix');
      expect(assignment).not.toContain('cameraPosition');
      expect(s.fragmentShader).toMatch(/normalize\s*\(\s*vFlightSkyDirection\s*\)/);
      expect(s.fragmentShader).toMatch(/smoothstep\s*\(\s*0\.0\s*,\s*0\.65/);
      expect(s.fragmentShader).toMatch(/clamp\s*\([^;]*\.y\s*,\s*0\.0\s*,\s*1\.0\s*\)/);
      const local = new Three.Vector4(100, 40, -80, 0);
      const rotation = new Three.Matrix4().makeRotationZ(0.4);
      const translated = rotation.clone().setPosition(80000, 35000, -200000);
      expect(local.clone().applyMatrix4(translated).toArray()).toEqual(local.clone().applyMatrix4(rotation).toArray());
    } finally { m.dispose(); }
  });

  it('updates shared colors in place without recompiling and keeps fog matched exactly to the horizon', () => {
    const m = material();
    try {
      api.attachFlightSkyGradient(m, Three);
      const s = shader(); m.onBeforeCompile(s, {});
      const diagnostic = m.userData.flightSkyGradient, uniform = diagnostic.uniforms.zenith;
      const zenith = uniform.value, horizon = m.color;
      const version = m.version, key = m.customProgramCacheKey();
      const fog = new Three.Fog(0, 60000, 240000);
      for (const hour of [12, 17, 18, 22, 6]) {
        const colors = palette(hour, environment, 3500, 0.8);
        expect(api.updateFlightSkyGradient(m, colors)).toBe(m);
        fog.color.copy(m.color);
        expect(rgb(m.color)).toEqual(colors.horizon);
        expect(rgb(uniform.value)).toEqual(colors.zenith);
        expect(rgb(fog.color)).toEqual(colors.horizon);
        expect(m.color).toBe(horizon); expect(uniform.value).toBe(zenith);
        expect(s.uniforms.flightSkyZenith).toBe(uniform);
        expect(m.version).toBe(version); expect(m.customProgramCacheKey()).toBe(key);
        expect(m.userData.flightSkyGradient).toBe(diagnostic);
      }
      const secondShader = shader(); m.onBeforeCompile(secondShader, {});
      expect(secondShader.uniforms.flightSkyZenith).toBe(uniform);
    } finally { m.dispose(); }
  });

  it('chains existing compile hooks and cache keys and is idempotent', () => {
    const m = material();
    try {
      const renderer = {};
      const prior = vi.fn(function(s, passedRenderer) {
        expect(this).toBe(m); expect(passedRenderer).toBe(renderer);
        s.uniforms.existing = { value: 42 };
        s.fragmentShader = '// existing hook\n' + s.fragmentShader;
      });
      m.onBeforeCompile = prior;
      m.customProgramCacheKey = function() { expect(this).toBe(m); return 'host-sky:v2'; };
      api.attachFlightSkyGradient(m, Three);
      const hook = m.onBeforeCompile, version = m.version, diagnostic = m.userData.flightSkyGradient;
      expect(m.customProgramCacheKey()).toBe('host-sky:v2|flight-sky-gradient:v1');
      api.attachFlightSkyGradient(m, Three);
      expect(m.onBeforeCompile).toBe(hook); expect(m.version).toBe(version);
      expect(m.userData.flightSkyGradient).toBe(diagnostic);
      const s = shader(); m.onBeforeCompile(s, renderer);
      expect(prior).toHaveBeenCalledOnce();
      expect(s.uniforms.existing.value).toBe(42);
      expect(s.fragmentShader.startsWith('// existing hook')).toBe(true);
      expect(diagnostic.patched).toBe(true);
    } finally { m.dispose(); }
  });

  it('leaves unsupported shaders visible and unchanged without partially patching a stage', () => {
    const m = material();
    try {
      api.attachFlightSkyGradient(m, Three);
      for (const stage of ['vertexShader', 'fragmentShader']) {
        const s = shader(); s[stage] = 'void main() {}';
        s.uniforms.existing = { value: 1 };
        const original = { vertex: s.vertexShader, fragment: s.fragmentShader, uniforms: s.uniforms };
        m.onBeforeCompile(s, {});
        expect(s.vertexShader).toBe(original.vertex); expect(s.fragmentShader).toBe(original.fragment);
        expect(s.uniforms).toBe(original.uniforms); expect(Object.keys(s.uniforms)).toEqual(['existing']);
        expect(m.userData.flightSkyGradient).toMatchObject({ patched: false, reason: 'unsupported-shader-chunks' });
      }
      m.onBeforeCompile(null, {});
      expect(m.userData.flightSkyGradient).toMatchObject({ patched: false, reason: 'invalid-shader' });
    } finally { m.dispose(); }
  });

  it('does not overwrite prior shader symbols or uniforms', () => {
    const m = material();
    try {
      api.attachFlightSkyGradient(m, Three);
      for (const collision of ['uniform', 'vertex', 'fragment']) {
        const s = shader(), existing = { value: new Three.Color(0.2, 0.3, 0.4) };
        if (collision === 'uniform') s.uniforms.flightSkyZenith = existing;
        if (collision === 'vertex') s.vertexShader += '\nvarying vec3 vFlightSkyDirection;';
        if (collision === 'fragment') s.fragmentShader += '\nuniform vec3 flightSkyZenith;';
        const original = { vertex: s.vertexShader, fragment: s.fragmentShader, uniforms: { ...s.uniforms } };
        m.onBeforeCompile(s, {});
        expect(s.vertexShader).toBe(original.vertex); expect(s.fragmentShader).toBe(original.fragment);
        expect(s.uniforms).toEqual(original.uniforms);
        expect(m.userData.flightSkyGradient).toMatchObject({ patched: false, reason: 'uniform-already-defined' });
      }
    } finally { m.dispose(); }
  });

  it('preserves default cache identities without including changing palette data', () => {
    const first = material(), second = material();
    try {
      const originalKey = first.customProgramCacheKey();
      api.attachFlightSkyGradient(first, Three); api.attachFlightSkyGradient(second, Three);
      expect(first.customProgramCacheKey()).toBe(originalKey + '|flight-sky-gradient:v1');
      api.updateFlightSkyGradient(first, palette(12, environment, 0, 1));
      api.updateFlightSkyGradient(second, palette(22, environment, 60000, 0.3));
      expect(first.customProgramCacheKey()).toBe(second.customProgramCacheKey());
      expect(first.userData.flightSkyGradient.uniforms.zenith).not.toBe(second.userData.flightSkyGradient.uniforms.zenith);
    } finally { first.dispose(); second.dispose(); }
  });

  it('ignores invalid palette updates and unsupported materials', () => {
    const m = material(), lambert = new Three.MeshLambertMaterial();
    try {
      api.attachFlightSkyGradient(m, Three);
      api.updateFlightSkyGradient(m, palette(17, environment, 1500, 0.8));
      const before = { horizon: rgb(m.color), zenith: rgb(m.userData.flightSkyGradient.uniforms.zenith.value) };
      for (const invalid of [null, {}, { horizon: [], zenith: [] },
        { horizon: [NaN, 0, 0], zenith: [0, 0, 0] }, { horizon: [0, 0, 0], zenith: [0, Infinity, 0] },
        { horizon: [-0.1, 0, 0], zenith: [0, 0, 0] }, { horizon: [0, 0, 0], zenith: [0, 1.1, 0] }]) {
        api.updateFlightSkyGradient(m, invalid);
        expect(rgb(m.color)).toEqual(before.horizon);
        expect(rgb(m.userData.flightSkyGradient.uniforms.zenith.value)).toEqual(before.zenith);
      }
      const hook = lambert.onBeforeCompile;
      expect(api.attachFlightSkyGradient(lambert, Three)).toBe(lambert);
      expect(lambert.onBeforeCompile).toBe(hook);
      expect(lambert.userData.flightSkyGradient).toBeUndefined();
      const basic = material();
      try {
        const original = basic.onBeforeCompile;
        expect(api.attachFlightSkyGradient(basic, null)).toBe(basic);
        expect(basic.onBeforeCompile).toBe(original);
      } finally { basic.dispose(); }
      expect(api.attachFlightSkyGradient(null, Three)).toBeNull();
      expect(api.updateFlightSkyGradient(null, before)).toBeNull();
    } finally { m.dispose(); lambert.dispose(); }
  });
});
