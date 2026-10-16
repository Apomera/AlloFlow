import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const api = {};
runInNewContext(readFileSync('dev-tools/skyschool-city-facade.js', 'utf8') + '\n' +
  readFileSync('dev-tools/skyschool-city-reveal.js', 'utf8'), api);
const shader = () => ({ vertexShader: THREE.ShaderLib.lambert.vertexShader,
  fragmentShader: THREE.ShaderLib.lambert.fragmentShader, uniforms: {} });
const smoothstep = (low, high, value) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};
function patched(mapped = false) {
  const material = new THREE.MeshLambertMaterial();
  if (mapped) material.defines = { FLIGHT_FACADE_BOUNDS: 1 };
  api.attachFlightCityFacade(material, THREE);
  const output = shader(); material.onBeforeCompile(output, {});
  return { material, output };
}
function ambientFactor(output) {
  // Evaluate the injected expression rather than duplicating the shading curve.
  const expression = output.fragmentShader.match(/float flightFacadeBaseAmbient = ([^;]+);/)[1];
  return new Function('flightFacadeAboveBase', 'flightFacadeWall', 'smoothstep', 'return ' + expression);
}

describe('city base ambient shading', () => {
  it('limits ambient reduction to 25% and clears within twelve physical feet', () => {
    const factor = ambientFactor(patched().output);
    expect(factor(-20, 1, smoothstep)).toBe(0.75);
    expect(factor(0, 1, smoothstep)).toBe(0.75);
    expect(factor(6, 1, smoothstep)).toBe(0.875);
    expect(factor(12, 1, smoothstep)).toBe(1);
    expect(factor(10000, 1, smoothstep)).toBe(1);
    let previous = 0.75;
    for (let height = -20; height <= 30; height += 0.25) {
      const value = factor(height, 1, smoothstep);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });

  it('leaves roof faces unaffected at every height', () => {
    const factor = ambientFactor(patched().output);
    for (const height of [-10, 0, 1, 6, 12, 100]) expect(factor(height, 0, smoothstep)).toBe(1);
    expect(factor(0, 0.5, smoothstep)).toBe(0.875);
  });

  it('uses scaled box height and mapped ground-relative height consistently', () => {
    const { output } = patched(true);
    expect(output.fragmentShader).toContain('float flightFacadeAboveBase = vFlightFacadePosition.y;');
    expect(output.fragmentShader).toContain('flightFacadeAboveBase = vFlightFacadePosition.y - vFlightFacadeBounds.x;');
    const factor = ambientFactor(output);
    const boxMatrix = new THREE.Matrix4().makeScale(80, 120, 60);
    boxMatrix.setPosition(100000, 6000, -90000);
    const boxPoint = new THREE.Vector4(0, 0.05, 0, 0).applyMatrix4(boxMatrix);
    const mappedPoint = new THREE.Vector4(0, 6006, 0, 0).applyMatrix4(new THREE.Matrix4().makeTranslation(50000, 0, -20000));
    expect(factor(boxPoint.y, 1, smoothstep)).toBe(factor(mappedPoint.y - 6000, 1, smoothstep));
    expect(factor(boxPoint.y, 1, smoothstep)).toBe(0.875);
  });

  it('changes only indirect diffuse after the existing ambient-occlusion stage', () => {
    const code = patched().output.fragmentShader;
    const application = code.indexOf('reflectedLight.indirectDiffuse *= flightFacadeBaseAmbient;');
    expect(application).toBeGreaterThan(code.indexOf('#include <aomap_fragment>'));
    expect(application).toBeLessThan(code.indexOf('vec3 outgoingLight ='));
    const directLines = text => text.split('\n').filter(line => line.includes('reflectedLight.directDiffuse'));
    expect(directLines(code)).toEqual(directLines(THREE.ShaderLib.lambert.fragmentShader));
    expect(code).toContain('totalEmissiveRadiance *= flightFacadeLight * flightFacadeWall;');
    expect(code).toContain('totalEmissiveRadiance *= flightFacadeWindowZone;');
    expect(code.match(/flightFacadeBaseAmbient/g)).toHaveLength(2);
  });

  it('preserves either hook order with reveal and earlier material hooks', () => {
    for (const revealFirst of [false, true]) {
      const material = new THREE.MeshLambertMaterial();
      material.defines = { FLIGHT_FACADE_BOUNDS: 1 };
      let previousCalls = 0;
      material.onBeforeCompile = output => { previousCalls++; output.fragmentShader += '\n// earlier hook'; };
      if (revealFirst) api.attachFlightCityReveal(material, THREE, { value: 0.4 });
      api.attachFlightCityFacade(material, THREE);
      if (!revealFirst) api.attachFlightCityReveal(material, THREE, { value: 0.4 });
      const output = shader(); material.onBeforeCompile(output, {});
      expect(previousCalls).toBe(1);
      expect(material.userData.flightCityFacade).toMatchObject({ version: 3, patched: true });
      expect(material.userData.flightCityReveal.patched).toBe(true);
      expect(output.fragmentShader).toContain('flightCityRevealThreshold(gl_FragCoord.xy)');
      expect(output.fragmentShader).toContain('reflectedLight.indirectDiffuse *= flightFacadeBaseAmbient;');
      expect(output.fragmentShader).toContain('// earlier hook');
      expect(material.customProgramCacheKey()).toContain('|flight-city-facade:v3');
    }
  });

  it('leaves unsupported shader stages intact when the ambient hook is missing', () => {
    const material = new THREE.MeshLambertMaterial(); api.attachFlightCityFacade(material, THREE);
    const output = shader();
    output.fragmentShader = output.fragmentShader.replace('#include <aomap_fragment>', '');
    const before = { ...output }; material.onBeforeCompile(output, {});
    expect(output).toEqual(before);
    expect(material.userData.flightCityFacade).toMatchObject({ patched: false, reason: 'unsupported-shader-chunks' });
  });
});
