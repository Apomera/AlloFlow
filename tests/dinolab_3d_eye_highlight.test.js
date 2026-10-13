import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_HIGHLIGHT_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');

function productionFunction(name) {
  const start = source.indexOf('  function ' + name + '(');
  if (start < 0) throw new Error('Missing production function: ' + name);
  const end = source.indexOf('\n  function ', start + 1);
  return new Function(source.slice(start, end) + '\nreturn ' + name + ';')();
}

const glintShading = productionFunction('dinoGlintShading');
const irisShading = productionFunction('dinoIrisShading');

function shaderFor(type) {
  const original = THREE.ShaderLib[type];
  return {
    uniforms: THREE.UniformsUtils.clone(original.uniforms),
    vertexShader: original.vertexShader,
    fragmentShader: original.fragmentShader
  };
}

function eyeMaterials(fallback = false) {
  const start = source.indexOf('            var irisColor =');
  const end = source.indexOf('            var mouthMat =', start);
  if (start < 0 || end < 0) throw new Error('Missing production eye material block');
  const types = fallback ? { ...THREE, MeshStandardMaterial: undefined, MeshPhysicalMaterial: undefined } : THREE;
  return new Function('THREE', 'dinoIrisShading', 'dinoGlintShading', source.slice(start, end) +
    '\nreturn { eyeMat, eyePupilMat, eyeGlintMat, corneaMat };')(types, irisShading, glintShading);
}

describe('Corneal catchlight shader integration', () => {
  it('composes the existing material hook with its receiver, uniforms and extensions intact', () => {
    const material = new THREE.MeshBasicMaterial();
    const probe = { value: new THREE.Vector3(1, 2, 3) };
    const extensions = { fragDepth: true };
    material.extensions = extensions;
    let receiver;
    material.onBeforeCompile = function (shader) {
      receiver = this;
      shader.uniforms.probe = probe;
      shader.fragmentShader = '// Existing material hook\n' + shader.fragmentShader;
    };
    const shader = shaderFor('basic');
    const uniforms = shader.uniforms;
    const previousNames = Object.keys(uniforms);
    expect(glintShading(material)).toBe(material);
    material.onBeforeCompile(shader);
    expect(receiver).toBe(material);
    expect(shader.uniforms).toBe(uniforms);
    expect(shader.uniforms.probe).toBe(probe);
    expect(Object.keys(shader.uniforms)).toEqual([...previousNames, 'probe']);
    expect(material.extensions).toBe(extensions);
    expect(material.extensions.fragDepth).toBe(true);
    expect(shader.fragmentShader).toContain('// Existing material hook');
    material.dispose();
  });

  it('integrates with the bundled Basic shader without requiring new mesh attributes', () => {
    const material = glintShading(new THREE.MeshBasicMaterial());
    const shader = shaderFor('basic');
    const original = shaderFor('basic');
    material.onBeforeCompile(shader);
    expect(shader.vertexShader.match(/attribute\s+\w+\s+\w+/g)).toEqual(original.vertexShader.match(/attribute\s+\w+\s+\w+/g));
    expect(shader.vertexShader).toContain('vDinoGlintNormal = normalMatrix * normal;');
    expect(shader.vertexShader).toContain('vDinoGlintView = -mvPosition.xyz;');
    expect(shader.vertexShader.indexOf('#include <project_vertex>')).toBeLessThan(shader.vertexShader.indexOf('vDinoGlintView ='));
    for (const varying of ['vDinoGlintNormal', 'vDinoGlintView']) {
      expect(shader.vertexShader.split('varying vec3 ' + varying + ';')).toHaveLength(2);
      expect(shader.fragmentShader.split('varying vec3 ' + varying + ';')).toHaveLength(2);
    }
    const alphaWrite = shader.fragmentShader.indexOf('diffuseColor.a *=');
    expect(alphaWrite).toBeGreaterThan(shader.fragmentShader.indexOf('#include <color_fragment>'));
    expect(alphaWrite).toBeLessThan(shader.fragmentShader.indexOf('gl_FragColor'));
    expect(shader.uniforms).toEqual(original.uniforms);
    material.dispose();
  });

  it('produces identical shaders on independent compiles without accumulating state', () => {
    const material = glintShading(new THREE.MeshBasicMaterial());
    const key = material.customProgramCacheKey();
    const first = shaderFor('basic');
    const second = shaderFor('basic');
    material.onBeforeCompile(first);
    material.onBeforeCompile(second);
    expect(first).toEqual(second);
    expect(material.customProgramCacheKey()).toBe(key);
    expect(THREE.ShaderLib.basic.vertexShader).not.toContain('vDinoGlint');
    expect(THREE.ShaderLib.basic.fragmentShader).not.toContain('glintSoftness');
    material.dispose();
  });

  it('separates modified and original programs while retaining base program distinctions', () => {
    const plain = new THREE.MeshBasicMaterial();
    const a = new THREE.MeshBasicMaterial();
    const b = new THREE.MeshBasicMaterial();
    a.customProgramCacheKey = () => 'base-a';
    b.customProgramCacheKey = () => 'base-b';
    const originalKey = plain.customProgramCacheKey();
    glintShading(plain);
    glintShading(a);
    glintShading(b);
    expect(plain.customProgramCacheKey()).not.toBe(originalKey);
    expect(a.customProgramCacheKey()).not.toBe(b.customProgramCacheKey());
    expect(a.customProgramCacheKey()).toContain('base-a');
    expect(b.customProgramCacheKey()).toContain('base-b');
    [plain, a, b].forEach(material => material.dispose());
  });
});

describe('Eye material rendering contracts', () => {
  for (const fallback of [false, true]) {
    const mode = fallback ? 'Phong and Basic fallback' : 'Standard and Physical';
    it('keeps catchlights blendable and depth-tested with ' + mode + ' materials', () => {
      const materials = eyeMaterials(fallback);
      const { eyeMat, eyePupilMat, eyeGlintMat, corneaMat } = materials;
      expect(eyeMat.type).toBe(fallback ? 'MeshPhongMaterial' : 'MeshStandardMaterial');
      expect(corneaMat.type).toBe(fallback ? 'MeshBasicMaterial' : 'MeshPhysicalMaterial');
      expect(eyeGlintMat.type).toBe('MeshBasicMaterial');
      expect(eyeGlintMat.color).toEqual(new THREE.Color(0xfff3cf).convertSRGBToLinear());
      expect(eyeGlintMat.transparent).toBe(true);
      expect(eyeGlintMat.opacity).toBeGreaterThan(0);
      expect(eyeGlintMat.opacity).toBeLessThan(1);
      expect(eyeGlintMat.depthWrite).toBe(false);
      expect(eyeGlintMat.depthTest).toBe(true);
      expect(eyeGlintMat.blending).toBe(THREE.NormalBlending);
      expect(eyeGlintMat.premultipliedAlpha).toBe(false);
      expect(eyePupilMat.transparent).toBe(false);
      expect(eyePupilMat.opacity).toBe(1);
      expect(eyePupilMat.color).toEqual(new THREE.Color(0x0b0a08).convertSRGBToLinear());
      expect(corneaMat.transparent).toBe(true);
      expect(corneaMat.depthWrite).toBe(false);
      expect(corneaMat.opacity).toBeLessThan(eyeGlintMat.opacity);
      Object.values(materials).forEach(material => material.dispose());
    });

    it('installs both shaders on the actual ' + mode + ' eye material block', () => {
      const materials = eyeMaterials(fallback);
      const irisShader = shaderFor(fallback ? 'phong' : 'standard');
      const glintShader = shaderFor('basic');
      materials.eyeMat.onBeforeCompile(irisShader);
      materials.eyeGlintMat.onBeforeCompile(glintShader);
      expect(irisShader.fragmentShader).toContain('vec3 irisPigment');
      expect(irisShader.fragmentShader).toContain('dFdx(vDinoIris)');
      expect(irisShader.fragmentShader).toContain('dFdy(vDinoIris)');
      expect(materials.eyeMat.extensions.derivatives).toBe(true);
      expect(materials.eyeMat.customProgramCacheKey()).not.toBe('dinolab-iris-v1');
      expect(glintShader.fragmentShader).toContain('glintSoftness');
      expect(materials.eyeMat.color).toEqual(new THREE.Color(0x947448).convertSRGBToLinear());
      Object.values(materials).forEach(material => material.dispose());
    });
  }
});
