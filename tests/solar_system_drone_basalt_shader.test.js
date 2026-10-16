import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const PROFILES = ['regolith-pitted', 'aeolian-rippled', 'fractured-basalt', 'crevassed-ice', 'rocky-granular'];
const CASES = PROFILES.flatMap(profile => [0, 0.4, 0.86].map(strength => [profile, strength]));
let createFractureShader, applySource;

beforeAll(() => {
  const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
  const helperStart = source.indexOf('function solarDroneBasaltFractureShader(');
  const helperEnd = source.indexOf('\n}', helperStart);
  if (helperStart < 0 || helperEnd < helperStart) throw new Error('Missing basalt shader helper');
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => { throw new Error('Shader construction must not consume scenery randomness'); };
  createFractureShader = new Function('Math', source.slice(helperStart, helperEnd + 2) +
    '\nreturn solarDroneBasaltFractureShader;')(deterministicMath);
  const applyStart = source.indexOf('function applyDroneGeology(');
  const applyEnd = source.indexOf('var rockyHorizonMesh', applyStart);
  if (applyStart < 0 || applyEnd < applyStart) throw new Error('Missing complete applyDroneGeology function');
  applySource = source.slice(applyStart, applyEnd).trim();
});

function geologyContext(profile) {
  const materials = [];
  let factoryCalls = 0;
  const factory = () => { factoryCalls++; return createFractureShader(); };
  const apply = new Function('rockySurfaceProfile', 'geologyMaterials', 'solarDroneBasaltFractureShader',
    applySource + '\nreturn applyDroneGeology;')(profile, materials, factory);
  return { apply, materials, get factoryCalls() { return factoryCalls; } };
}

function standardShader() {
  const standard = THREE.ShaderLib.standard;
  return {
    vertexShader: standard.vertexShader,
    fragmentShader: standard.fragmentShader,
    uniforms: THREE.UniformsUtils.clone(standard.uniforms)
  };
}

function compile(material) {
  const shader = standardShader();
  material.onBeforeCompile(shader);
  return shader;
}

// The existing vertex additions are a compact regression fixture. Keeping this
// here avoids depending on an ignored reports/ snapshot and ensures that a
// fragment-only visual change cannot alter instancing, slope or world position.
function unchangedGeologyVertex() {
  return THREE.ShaderLib.standard.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vGeologyPosition; varying float vGeologySlope;')
    .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvGeologySlope = 1.0 - abs(dot(normalize(transformedNormal), normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)));')
    .replace('#include <worldpos_vertex>', [
      '#include <worldpos_vertex>',
      'vec4 geologyLocal = vec4(transformed, 1.0);',
      '#ifdef USE_INSTANCING',
      'geologyLocal = instanceMatrix * geologyLocal;',
      '#endif',
      'vGeologyPosition = (modelMatrix * geologyLocal).xyz;'
    ].join('\n'));
}

const matches = (source, pattern) => source.match(pattern) || [];
const includes = source => matches(source, /#include\s*<[^>]+>/g);
const occurrences = (source, text) => source.split(text).length - 1;

function expectBalancedShader(source) {
  let braces = 0, minimumBraces = 0, conditionals = 0, minimumConditionals = 0;
  for (const character of source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')) {
    if (character === '{') braces++;
    if (character === '}') braces--;
    minimumBraces = Math.min(minimumBraces, braces);
  }
  expect(minimumBraces, 'a shader block closed before it opened').toBe(0);
  expect(braces).toBe(0);
  for (const directive of matches(source, /^\s*#(?:if|ifdef|ifndef|endif)\b[^\n]*/gm)) {
    conditionals += /#endif\b/.test(directive) ? -1 : 1;
    minimumConditionals = Math.min(minimumConditionals, conditionals);
  }
  expect(minimumConditionals, 'a shader conditional closed before it opened').toBe(0);
  expect(conditionals).toBe(0);
}

describe('drone basalt joints integrate into the pinned standard material', () => {
  it.each(CASES)('preserves shader plumbing for %s at rock strength %s', (profile, strength) => {
    const context = geologyContext(profile), material = new THREE.MeshStandardMaterial();
    try {
      context.apply(material, strength, false);
      const shader = standardShader(), originalUniforms = { ...shader.uniforms };
      material.onBeforeCompile(shader);
      const basalt = profile === 'fractured-basalt', fracture = createFractureShader();
      expect(material.userData.geologyProfile).toBe(profile);
      expect(context.materials).toEqual([material]);
      expect(context.factoryCalls).toBe(basalt ? 1 : 0);
      expect(shader.vertexShader).toBe(unchangedGeologyVertex());
      expect(includes(shader.vertexShader)).toEqual(includes(THREE.ShaderLib.standard.vertexShader));
      expect(includes(shader.fragmentShader)).toEqual(includes(THREE.ShaderLib.standard.fragmentShader));
      expectBalancedShader(shader.vertexShader);
      expectBalancedShader(shader.fragmentShader);
      expect(matches(shader.fragmentShader, /float\s+geologyHash\s*\(/g)).toHaveLength(1);
      expect(matches(shader.fragmentShader, /float\s+geologyNoise\s*\(/g)).toHaveLength(1);
      expect(occurrences(shader.fragmentShader, fracture.common)).toBe(basalt ? 1 : 0);
      expect(occurrences(shader.fragmentShader, fracture.surface)).toBe(basalt ? 1 : 0);
      expect(matches(shader.fragmentShader, /float\s+geologyJointCoverage\s*\(/g)).toHaveLength(basalt ? 1 : 0);
      // One declaration and two independent joint-family calls, only in basalt.
      expect(matches(shader.fragmentShader, /\bgeologyJointCoverage\s*\(/g)).toHaveLength(basalt ? 3 : 0);
      expect(matches(shader.fragmentShader, /\bfwidth\s*\(/g).length -
        matches(THREE.ShaderLib.standard.fragmentShader, /\bfwidth\s*\(/g).length).toBe(basalt ? 1 : 0);
      expect(Object.keys(shader.uniforms).sort()).toEqual([...Object.keys(originalUniforms), 'geologyRockStrength'].sort());
      for (const [name, uniform] of Object.entries(originalUniforms)) expect(shader.uniforms[name]).toBe(uniform);
      expect(shader.uniforms.geologyRockStrength.value).toBe(strength);
      expect(matches(shader.fragmentShader, /uniform\s+sampler\w*\s+\w+/g))
        .toEqual(matches(THREE.ShaderLib.standard.fragmentShader, /uniform\s+sampler\w*\s+\w+/g));
      expect(shader.fragmentShader).not.toMatch(/uniform\s+\w+\s+(?:time|uTime|geologyTime)\b/);
      if (basalt) {
        const commonAt = shader.fragmentShader.indexOf(fracture.common);
        const mainAt = shader.fragmentShader.indexOf('void main()');
        expect(commonAt).toBeGreaterThan(shader.fragmentShader.indexOf('float geologyNoise('));
        expect(commonAt).toBeLessThan(mainAt);
        expect(shader.fragmentShader.indexOf(fracture.surface)).toBeGreaterThan(shader.fragmentShader.indexOf('#include <map_fragment>'));
        expect(shader.fragmentShader.indexOf(fracture.surface)).toBeLessThan(shader.fragmentShader.indexOf('#include <roughnessmap_fragment>'));
      }
    } finally { material.dispose(); }
  });

  it('places derivative coverage before independent masks and keeps their union bounded', () => {
    const { common, surface } = createFractureShader();
    // Inspect the executed helper output rather than duplicating the GLSL math
    // in JavaScript. Real derivative/antialiasing behavior requires WebGL QA.
    expect(common).toMatch(/float footprint\s*=\s*max\(fwidth\(phase\),\s*0\.0001\)/);
    expect(common).toMatch(/smoothstep\(-halfWidth - footprint, -halfWidth \+ footprint, signedDistance\)/);
    expect(common).toMatch(/smoothstep\(halfWidth - footprint, halfWidth \+ footprint, signedDistance\)/);
    expect(common).toMatch(/clamp\(leading - trailing, 0\.0, 1\.0\)\s*\*\s*\(1\.0 - smoothstep\(0\.25, 0\.90, footprint\)\)/);
    expect(matches(surface, /\bgeologyNoise\s*\(/g)).toHaveLength(2);
    expect(surface).toMatch(/float jointA\s*=\s*geologyJointCoverage\(jointPhaseA,/);
    expect(surface).toMatch(/float jointB\s*=\s*geologyJointCoverage\(jointPhaseB,/);
    expect(surface.indexOf('float jointMaskA')).toBeGreaterThan(surface.indexOf('float jointB'));
    expect(surface).toMatch(/jointMaskA\s*=\s*smoothstep\([^;]*jointWarp\.y\)/);
    expect(surface).toMatch(/jointMaskB\s*=\s*smoothstep\([^;]*1\.0 - jointWarp\.x\)/);
    expect(surface).toMatch(/float joints\s*=\s*max\(jointA \* jointMaskA, jointB \* jointMaskB\)/);
    expect(surface).toMatch(/mix\(0\.20, 0\.30, clamp\(geologyRockStrength, 0\.0, 1\.0\)\)/);
    expect(surface).toMatch(/diffuseColor\.rgb\s*\*=\s*1\.0 - joints \* jointStrength \* nearDetail/);
    expect(common + surface).not.toMatch(/\b(?:if|for|while|discard)\b|#(?:if|ifdef|ifndef)/);
    expect(createFractureShader()).toEqual({ common, surface });
  });

  it('recompiles fresh shaders without accumulating helpers, registrations or uniforms', () => {
    const context = geologyContext('fractured-basalt'), material = new THREE.MeshStandardMaterial();
    try {
      context.apply(material, 0.86);
      const shaders = [compile(material), compile(material), compile(material)];
      for (const shader of shaders.slice(1)) {
        expect(shader.vertexShader).toBe(shaders[0].vertexShader);
        expect(shader.fragmentShader).toBe(shaders[0].fragmentShader);
        expect(Object.keys(shader.uniforms)).toEqual(Object.keys(shaders[0].uniforms));
        expect(shader.uniforms.geologyRockStrength).not.toBe(shaders[0].uniforms.geologyRockStrength);
      }
      expect(context.materials).toEqual([material]);
      expect(context.factoryCalls).toBe(1);
    } finally { material.dispose(); }
  });

  it('retains the shared ground/apron material and all existing texture and geometry resources', () => {
    const context = geologyContext('fractured-basalt');
    const map = new THREE.Texture(), bump = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map, bumpMap: bump, roughness: 0.99, bumpScale: 0.13 });
    const groundGeometry = new THREE.PlaneGeometry(250, 250, 1, 1);
    const apronGeometry = new THREE.PlaneGeometry(260, 260, 1, 1);
    const ground = new THREE.Mesh(groundGeometry, material), apron = new THREE.Mesh(apronGeometry, material);
    const resources = [map, bump, material, groundGeometry, apronGeometry];
    const disposed = [];
    for (const resource of resources) resource.addEventListener('dispose', () => disposed.push(resource));
    const geometryBefore = [groundGeometry, apronGeometry].map(geometry => ({
      index: geometry.index, indices: Array.from(geometry.index.array),
      attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([name, attribute]) =>
        [name, { reference: attribute, values: Array.from(attribute.array), version: attribute.version }]))
    }));
    const materialBefore = {
      defines: material.defines && { ...material.defines }, extensions: material.extensions && { ...material.extensions },
      roughness: material.roughness, bumpScale: material.bumpScale, side: material.side,
      transparent: material.transparent, depthWrite: material.depthWrite, version: material.version
    };
    try {
      context.apply(material, 0);
      expect(compile(ground.material).fragmentShader).toBe(compile(apron.material).fragmentShader);
      expect(ground.material).toBe(material); expect(apron.material).toBe(material);
      expect(material.map).toBe(map); expect(material.bumpMap).toBe(bump);
      expect(Object.keys(material).filter(key => /map$/i.test(key) && material[key] != null).sort()).toEqual(['bumpMap', 'map']);
      for (const [key, value] of Object.entries(materialBefore)) expect(material[key]).toEqual(value);
      expect(map.version).toBe(0); expect(bump.version).toBe(0);
      [groundGeometry, apronGeometry].forEach((geometry, index) => {
        const before = geometryBefore[index];
        expect(geometry.index).toBe(before.index); expect(Array.from(geometry.index.array)).toEqual(before.indices);
        expect(Object.keys(geometry.attributes)).toEqual(Object.keys(before.attributes));
        for (const [name, attribute] of Object.entries(before.attributes)) {
          expect(geometry.attributes[name]).toBe(attribute.reference);
          expect(Array.from(geometry.attributes[name].array)).toEqual(attribute.values);
          expect(geometry.attributes[name].version).toBe(attribute.version);
        }
      });
      expect(disposed).toEqual([]);
    } finally { for (const resource of resources) resource.dispose(); }
  });

  it('registers ordinary materials once while leaving separately owned horizon cleanup to its owner', () => {
    const context = geologyContext('fractured-basalt');
    const ordinary = new THREE.MeshStandardMaterial(), horizon = new THREE.MeshStandardMaterial();
    let ordinaryDisposals = 0, horizonDisposals = 0;
    ordinary.addEventListener('dispose', () => ordinaryDisposals++);
    horizon.addEventListener('dispose', () => horizonDisposals++);
    context.apply(ordinary, 0.86, false); context.apply(horizon, 0.4, true);
    compile(ordinary); compile(horizon); compile(ordinary); compile(horizon);
    expect(context.materials).toEqual([ordinary]);
    expect(ordinaryDisposals).toBe(0); expect(horizonDisposals).toBe(0);
    context.materials.forEach(material => material.dispose());
    expect(ordinaryDisposals).toBe(1); expect(horizonDisposals).toBe(0);
    horizon.dispose();
    expect(horizonDisposals).toBe(1);
  });

  it('keeps cache keys stable and separates every distinct profile program and strength', () => {
    const codes = { 'regolith-pitted': 0, 'aeolian-rippled': 1, 'fractured-basalt': 2, 'crevassed-ice': 3, 'rocky-granular': 0 };
    const programs = new Map(), materials = [];
    try {
      for (const [profile, strength] of CASES) {
        const context = geologyContext(profile), material = new THREE.MeshStandardMaterial();
        materials.push(material); context.apply(material, strength);
        const key = material.customProgramCacheKey(), shader = compile(material);
        expect(key).toBe('drone-geology-3-' + codes[profile] + '-' + strength);
        expect(material.customProgramCacheKey()).toBe(key);
        if (programs.has(key)) expect(shader.fragmentShader).toBe(programs.get(key));
        else programs.set(key, shader.fragmentShader);
      }
      expect(programs.size).toBe(4 * 3);
      // Building another world's material must not change a previous closure.
      for (let index = 0; index < CASES.length; index++) {
        const [profile, strength] = CASES[index];
        expect(materials[index].customProgramCacheKey()).toBe('drone-geology-3-' + codes[profile] + '-' + strength);
        expect(compile(materials[index]).uniforms.geologyRockStrength.value).toBe(strength);
      }
    } finally { for (const material of materials) material.dispose(); }
  });
});
