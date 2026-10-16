import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_raptorhunt.js', 'utf8');
function extract(name, boundary, scope = {}) {
  const start = source.indexOf(`function ${name}(`), end = source.indexOf(boundary, start);
  if (start < 0 || end < start) throw new Error(`Missing ${name} shader fixture`);
  return new Function(...Object.keys(scope), `return (${source.slice(start, end).trim()});`)(...Object.values(scope));
}
const api = loadAvianFeatherArt();
const finishGrain = extract('finishRaptorVaneGrain', '        [layeredFeatherMaterial,fingerMat,tail.material]', {
  window: { AvianFeatherArt: api },
});
const applyUnderwing = extract('applyOspreyUnderwing', '        if(isOspreyWing)');
function finishContrast() {
  return extract('finishRaptorPlumageContrast', '        [body.material,head.material,wingMat', {
    plumageContrast: { value: new THREE.Vector3(0, 0, 1) }, plumageContrastMaterials: [],
  });
}
const shaderFixture = () => ({ uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader,
  fragmentShader: THREE.ShaderLib.standard.fragmentShader });

describe('Raptor shared feather detail composition', () => {
  it('keeps existing material ownership, renderer context, uniforms and cache identities', () => {
    const material = new THREE.MeshStandardMaterial(), other = new THREE.MeshStandardMaterial();
    const originalOtherHook = other.onBeforeCompile, renderer = { name: 'actual-renderer' };
    const uniform = { value: 'species-owned' };
    const extensions = { shaderTextureLOD: true };
    material.extensions = extensions;
    let calls = 0;
    material.onBeforeCompile = function (shader, context) {
      expect(this).toBe(material); expect(context).toBe(renderer); calls++;
      shader.uniforms.speciesPigment = uniform;
      shader.vertexShader += '\n// existing feather articulation';
    };
    material.customProgramCacheKey = function () { expect(this).toBe(material); return 'species-owned-program'; };
    finishGrain(material);
    const shader = shaderFixture();
    material.onBeforeCompile(shader, renderer);
    expect(calls).toBe(1);
    expect(shader.uniforms.speciesPigment).toBe(uniform);
    expect(material.extensions).toBe(extensions);
    expect(material.extensions).toMatchObject({ shaderTextureLOD: true, derivatives: true });
    expect(shader.vertexShader).toContain('existing feather articulation');
    expect(shader.fragmentShader.match(/avian-vane-grain:/g)).toHaveLength(1);
    expect(material.customProgramCacheKey()).toBe('species-owned-program-' + api.vaneGrainCacheKey({ variants: 1, contourFeather: false }));
    expect(other.onBeforeCompile).toBe(originalOtherHook);
  });

  it('retains both Osprey underwing patterns before grain and scene contrast after it', () => {
    const keys = [];
    for (const primary of [false, true]) {
      const material = new THREE.MeshStandardMaterial();
      applyUnderwing(material, primary);
      const before = shaderFixture(); material.onBeforeCompile(before);
      const begin = before.fragmentShader.indexOf(primary ? 'if (gl_FrontFacing)' : 'if (!gl_FrontFacing)');
      const end = before.fragmentShader.indexOf('diffuseColor.rgb=rhUnderColor;', begin) + 'diffuseColor.rgb=rhUnderColor;\n}'.length;
      const pattern = before.fragmentShader.slice(begin, end);
      expect(pattern).toContain('rhWrist');
      expect(pattern).toContain('rhBar');
      finishGrain(material); finishContrast()(material);
      const shader = shaderFixture(); material.onBeforeCompile(shader, {});
      expect(shader.fragmentShader).toContain(pattern);
      expect(shader.vertexShader.match(/attribute vec2 rhOspreyWing;/g)).toHaveLength(1);
      expect(shader.fragmentShader.match(/varying vec2 vRhOspreyWing;/g)).toHaveLength(1);
      expect(shader.fragmentShader.match(/avian-vane-grain:/g)).toHaveLength(1);
      expect(shader.fragmentShader.indexOf('diffuseColor.rgb=rhUnderColor;'))
        .toBeLessThan(shader.fragmentShader.indexOf('float blFiber='));
      expect(shader.fragmentShader.indexOf('float blFiber='))
        .toBeLessThan(shader.fragmentShader.indexOf('float rhPlumageEdge='));
      expect(shader.uniforms.rhPlumageContrast).toBe(material.userData.plumageContrastUniform);
      keys.push(material.customProgramCacheKey());
      expect(keys.at(-1)).toContain(primary ? 'osprey-underwing-v1-primary' : 'osprey-underwing-v1-wing');
      expect(keys.at(-1)).toContain(api.vaneGrainCacheKey({ variants: 1, contourFeather: false }));
      expect(keys.at(-1)).toContain('plumage-contrast-v1');
    }
    expect(new Set(keys).size).toBe(2);
  });

  it('preserves barred tail pigmentation and its authored feather coordinate through both finishes', () => {
    const material = new THREE.MeshStandardMaterial(), tail = { material };
    const start = source.indexOf('        if (plumageProfile.tailBands) {');
    const end = source.indexOf('        // These vanes have one feather per UV square', start);
    if (start < 0 || end < start) throw new Error('Missing tail band material hook');
    new Function('tail', 'plumageProfile', source.slice(start, end))(tail, { tailBands: true });
    const before = shaderFixture(); material.onBeforeCompile(before);
    const band = before.fragmentShader.match(/float rhBandDistance=[\s\S]*?diffuseColor\.rgb\*=[^\n]+/)[0];
    finishGrain(material); finishContrast()(material);
    const shader = shaderFixture(); material.onBeforeCompile(shader, {});
    expect(shader.fragmentShader).toContain(band);
    expect(shader.vertexShader.match(/attribute float rhTailAlong;/g)).toHaveLength(1);
    expect(shader.vertexShader).toContain('vRhTailAlong=rhTailAlong;');
    expect(shader.fragmentShader.indexOf('float rhBandDistance='))
      .toBeLessThan(shader.fragmentShader.indexOf('float blFiber='));
    expect(shader.fragmentShader.indexOf('float blFiber='))
      .toBeLessThan(shader.fragmentShader.indexOf('float rhPlumageEdge='));
    expect(material.customProgramCacheKey()).toContain('raptor-tail-bands-v1');
    expect(shader.fragmentShader.match(/avian-vane-grain:/g)).toHaveLength(1);
  });
});
