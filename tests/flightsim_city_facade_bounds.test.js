import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const api = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), api);
runInNewContext(readFileSync('dev-tools/skyschool-city-facade.js', 'utf8'), api);
runInNewContext(readFileSync('dev-tools/skyschool-city-reveal.js', 'utf8'), api);
const Three = api.THREE;

function patch(mapped = true, reveal = false) {
  const material = new Three.MeshLambertMaterial({ vertexColors: true });
  if (mapped) material.defines = { FLIGHT_FACADE_BOUNDS: 1 };
  api.attachFlightCityFacade(material, Three);
  if (reveal) api.attachFlightCityReveal(material, Three, { value: 0.5 });
  const shader = { uniforms: {}, vertexShader: Three.ShaderLib.lambert.vertexShader,
    fragmentShader: Three.ShaderLib.lambert.fragmentShader };
  material.onBeforeCompile(shader, {});
  return { material, shader };
}

// Evaluate the actual scalar GLSL expressions inserted by the authored hook.
// This checks its physical bounds without duplicating the window-mask formula.
const { shader: mappedShader } = patch();
const mappedBlock = mappedShader.fragmentShader.match(/float flightFacadeAboveBase = vFlightFacadePosition.y;\n#ifdef FLIGHT_FACADE_BOUNDS\n([\s\S]*?)#endif/)[1];
const runMapped = new Function('vFlightFacadePosition', 'vFlightFacadeBounds', 'fwidth', 'max', 'clamp', 'smoothstep', 'step',
  'var flightFacadeUV = { y: 0 }, flightFacadeWindowZone = 1, flightFacadeAboveBase = vFlightFacadePosition.y;\n' + mappedBlock.replace(/\bfloat\b/g, 'var') +
  '\nreturn { verticalUV: flightFacadeUV.y, windowZone: flightFacadeWindowZone };');
function evaluate(y, base, roof, pixelHeight = 0.25) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const smoothstep = (lo, hi, v) => { const t = clamp((v - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t); };
  return runMapped({ y }, { x: base, y: roof }, () => pixelHeight, Math.max, clamp, smoothstep,
    (edge, v) => v < edge ? 0 : 1);
}

describe('mapped city facade floor bounds', () => {
  it('keeps the same storey and window trim after an elevation rebuild', () => {
    for (const offset of [-1, 0, 2, 2.1, 6, 18, 30, 58, 60]) {
      const before = evaluate(50 + offset, 50, 110);
      for (const ground of [-200, 1000, 19000]) {
        const after = evaluate(ground + offset, ground, ground + 60);
        expect(after.verticalUV).toBeCloseTo(before.verticalUV, 10);
        expect(after.windowZone).toBeCloseTo(before.windowZone, 8);
      }
    }
    expect(evaluate(106, 100, 160).verticalUV).toBe(0.5);
    expect(evaluate(118, 100, 160).verticalUV).toBe(1.5);
  });

  it('keeps downhill foundations and roof trim solid at near and subpixel distances', () => {
    for (const pixelHeight of [0, 0.05, 0.25, 1, 30, 300]) {
      for (const y of [60, 90, 100, 101, 102, 158, 159, 160, 170]) {
        expect(evaluate(y, 100, 160, pixelHeight).windowZone).toBe(0);
      }
      expect(evaluate(130, 100, 160, pixelHeight).windowZone).toBe(1);
    }
  });

  it('antialiases inward without introducing glass outside the occupied envelope', () => {
    const rising = [2, 2.0625, 2.125, 2.1875, 2.25].map(y => evaluate(y, 0, 60).windowZone);
    expect(rising[0]).toBe(0);
    expect(rising[2]).toBe(0.5);
    expect(rising.at(-1)).toBe(1);
    for (let i = 1; i < rising.length; i++) expect(rising[i]).toBeGreaterThan(rising[i - 1]);
    expect(evaluate(57.875, 0, 60).windowZone).toBe(0.5);
  });

  it('leaves structures too short for a window row solid and finite', () => {
    for (const height of [-1, 0, 1, 4, 5.99]) {
      for (const y of [-2, 0, 2, 3, 4, 6]) {
        const result = evaluate(100 + y, 100, 100 + height);
        expect(Number.isFinite(result.verticalUV)).toBe(true);
        expect(result.windowZone).toBe(0);
      }
    }
  });

  it('applies the bounds to daytime glass and nighttime light while preserving wall and roof masks', () => {
    expect(mappedShader.fragmentShader).toContain('flightFacadeWall * flightFacadeWindowZone');
    expect(mappedShader.fragmentShader).toContain('totalEmissiveRadiance *= flightFacadeWindowZone;');
    expect(mappedShader.fragmentShader).toContain('1.0 - smoothstep(0.15, 0.5, abs(flightFacadeNormal.y))');
    expect(mappedShader.fragmentShader).toContain('fwidth(flightFacadeUV)');
    expect(mappedShader.fragmentShader).toContain('#include <fog_fragment>');
  });

  it('does not require bounds attributes or change physical window scale on generic box materials', () => {
    const { material, shader } = patch(false);
    try {
      expect(material.defines?.FLIGHT_FACADE_BOUNDS).toBeUndefined();
      const disabled = text => text.replace(/#ifdef FLIGHT_FACADE_BOUNDS\n[\s\S]*?#endif/g, '');
      expect(disabled(shader.vertexShader)).not.toContain('flightFacadeBounds');
      expect(disabled(shader.fragmentShader)).not.toContain('vFlightFacadeBounds');
      expect(disabled(shader.fragmentShader)).toContain('vFlightFacadePosition.y) / 12.0;');
      expect(disabled(shader.fragmentShader)).toContain('float flightFacadeWindowZone = 1.0;');
      expect(material.userData.flightCityFacade.patched).toBe(true);
    } finally { material.dispose(); }
  });

  it('composes mapped floor bounds with the opaque reveal and preserves its uniform', () => {
    const { material, shader } = patch(true, true);
    try {
      expect(material.defines.FLIGHT_FACADE_BOUNDS).toBe(1);
      expect(material.userData.flightCityFacade.patched).toBe(true);
      expect(material.userData.flightCityReveal.patched).toBe(true);
      expect(shader.vertexShader).toContain('vFlightFacadeBounds = flightFacadeBounds;');
      expect(shader.fragmentShader).toContain('flightFacadeAboveBase / 12.0');
      expect(shader.fragmentShader).toContain('flightCityRevealThreshold(gl_FragCoord.xy)');
      expect(shader.uniforms.flightCityRevealCoverage.value).toBe(0.5);
      expect(material.transparent).toBe(false);
      expect(material.depthWrite).toBe(true);
      expect(material.customProgramCacheKey()).toContain('|flight-city-facade:v3|flight-city-reveal:v1');
    } finally { material.dispose(); }
  });
});
