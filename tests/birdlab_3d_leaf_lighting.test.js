import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_habitat.js', 'utf8');
const leafStart = source.indexOf('function applyLeafTransmission(');
const leafBody = source.slice(leafStart, source.indexOf('leaves.forEach(', leafStart));
const windBody = source.slice(source.indexOf('function applyWind('), leafStart);
const engine = readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8');
const fogBody = engine.slice(engine.indexOf('function applyHeightFog('), engine.indexOf('function mount('));
const applyHeightFog = new Function(`${fogBody};return applyHeightFog;`)();
const leafLighting = detailed => new Function('detailed', `${leafBody};return applyLeafTransmission;`)(detailed);
const shader = () => ({ uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader });

describe('BirdLab living leaf illumination', () => {
  it('leaves low-quality shaders, resources, and cache identity untouched', () => {
    const material = new THREE.MeshStandardMaterial();
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey, properties = Object.keys(material);
    leafLighting(false)(material);
    expect(material.onBeforeCompile).toBe(previous);
    expect(material.customProgramCacheKey).toBe(key);
    expect(Object.keys(material)).toEqual(properties);
    material.dispose();
  });

  it('preserves earlier shader hooks and renderer context without adding uniforms or global shader changes', () => {
    const chunks = { ...THREE.ShaderChunk }, material = new THREE.MeshStandardMaterial(), renderer = {};
    let calls = 0;
    material.onBeforeCompile = function (program, context) {
      expect(this).toBe(material); expect(context).toBe(renderer); calls++;
      program.uniforms.existing = { value: 1 };
      program.fragmentShader += '\n// existing pigment hook';
    };
    material.customProgramCacheKey = () => 'existing-leaf-variant';
    leafLighting(true)(material);
    const program = shader(); material.onBeforeCompile(program, renderer);
    expect(calls).toBe(1);
    expect(program.vertexShader).toBe(THREE.ShaderLib.standard.vertexShader);
    expect(program.fragmentShader).toContain('existing pigment hook');
    expect(program.fragmentShader).toContain('RE_Direct_Physical(directLight,geometry,material,reflectedLight)');
    expect(program.fragmentShader).toContain('#define RE_Direct blLeafDirect');
    expect(Object.keys(program.uniforms)).toEqual(['existing']);
    expect(material.customProgramCacheKey()).toContain('existing-leaf-variant|');
    expect(THREE.ShaderChunk).toEqual(chunks);
    material.dispose();
  });

  it.each(['bough', 'grass'])('composes with actual %s wind deformation and the scene atmosphere', kind => {
    const phase = { value: 1 }, breeze = { value: new THREE.Vector3(.1, 0, .05) };
    const applyWind = new Function('cyclePhase', 'breeze', `${windBody};return applyWind;`)(phase, breeze);
    const material = new THREE.MeshStandardMaterial();
    applyWind(material, kind, kind === 'bough');
    const originalKey = material.customProgramCacheKey();
    leafLighting(true)(material);
    const scene = new THREE.Scene(), mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    scene.add(mesh); applyHeightFog(scene);
    const program = shader(); material.onBeforeCompile(program, {});
    expect(program.uniforms.blHabitatPhase).toBe(phase);
    expect(program.uniforms.blHabitatWind).toBe(breeze);
    expect(program.vertexShader).toContain('transformed=blBentPosition');
    expect(program.vertexShader).toContain('objectNormal=blBentNormal');
    if (kind === 'bough') expect(program.vertexShader).toContain('blSprayVariant');
    expect(program.fragmentShader.match(/void blLeafDirect\(/g)).toHaveLength(1);
    expect(program.fragmentShader.match(/float blWoodlandFogDensity\(/g)).toHaveLength(1);
    expect(material.customProgramCacheKey()).toContain(originalKey);
    expect(material.customProgramCacheKey()).toContain('birdlab-thin-leaf-v1');
    expect(material.customProgramCacheKey()).toContain('birdlab-height-fog-v1');
    mesh.geometry.dispose(); material.dispose();
  });
});
