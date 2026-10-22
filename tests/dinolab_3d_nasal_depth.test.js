import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_NASAL_DEPTH_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
window.StemLab = { registerTool() {} };
new Function(source.replace("window.StemLab.registerTool('dinoLab'", "globalThis.__nasalDepthNative={DINOS,dinoSauropodCraniumFrame};window.StemLab.registerTool('dinoLab'"))();
const nativeFrames = globalThis.__nasalDepthNative;
delete globalThis.__nasalDepthNative;
function helper(name) {
  const start = source.indexOf('  function ' + name + '('), open = source.indexOf('{', start);
  if (start < 0) throw Error('Missing helper ' + name);
  let depth = 1, end = open + 1;
  while (depth && end < source.length) { if (source[end] === '{') depth++; if (source[end] === '}') depth--; end++; }
  if (depth) throw Error('Unbalanced helper ' + name);
  return new Function(source.slice(start, end) + '; return ' + name + ';')();
}
const makeOpening = helper('dinoNostrilGeometry'), shadeOpening = helper('dinoNostrilShading'), frameFor = helper('dinoEyeSurfaceFrame');
const shaderFor = type => ({ vertexShader: T.ShaderLib[type].vertexShader, fragmentShader: T.ShaderLib[type].fragmentShader, uniforms: T.UniformsUtils.clone(T.ShaderLib[type].uniforms) });

describe('Smooth nasal opening coordinates', () => {
  for (const radius of [.0003, .1, 2.4]) {
    it('keeps normalized shading coordinates and a closed sphere at radius ' + radius, () => {
      const g = makeOpening(T, radius), p = g.attributes.position, n = g.attributes.normal, nasal = g.attributes.dinoNasal;
      expect(g.parameters.widthSegments).toBe(32); expect(g.parameters.heightSegments).toBe(16);
      expect(nasal.count).toBe(p.count); expect(nasal.itemSize).toBe(2);
      g.computeBoundingSphere(); expect(g.boundingSphere.radius).toBeCloseTo(radius, 6);
      const weldedEdges = new Map();
      const key = i => [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v / radius * 1e6)).join(',');
      for (let i = 0; i < p.count; i++) {
        expect([p.getX(i), p.getY(i), p.getZ(i), nasal.getX(i), nasal.getY(i)].every(Number.isFinite)).toBe(true);
        expect(nasal.getX(i)).toBeCloseTo(p.getX(i) / radius, 6); expect(nasal.getY(i)).toBeCloseTo(p.getY(i) / radius, 6);
        expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 6);
      }
      for (let i = 0; i < g.index.count; i += 3) {
        const ids = [...g.index.array.slice(i, i + 3)], points = ids.map(id => new T.Vector3().fromBufferAttribute(p, id));
        const face = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
        expect(face.dot(points[0])).toBeGreaterThan(0);
        for (let j = 0; j < 3; j++) { const edge = [key(ids[j]), key(ids[(j + 1) % 3])].sort().join('|'); weldedEdges.set(edge, (weldedEdges.get(edge) || 0) + 1); }
      }
      expect([...weldedEdges.values()].every(count => count === 2)).toBe(true);
      for (const side of [-1, 1]) {
        const mesh = new T.Mesh(g, new T.MeshBasicMaterial()); mesh.scale.set(1.25, .55, .16); mesh.rotation.set(.1, -.3 * side, .2);
        const before = Array.from(nasal.array); mesh.updateMatrixWorld(true);
        expect(Array.from(nasal.array)).toEqual(before); mesh.material.dispose();
      }
      g.dispose();
    });
  }
});

describe('Nasal depth shader composition', () => {
  for (const [type, Material] of [['standard', T.MeshStandardMaterial], ['phong', T.MeshPhongMaterial], ['basic', T.MeshBasicMaterial]]) {
    it('preserves existing hooks and renderer state for ' + type, () => {
      const material = new Material(), extension = { fragDepth: true }, probe = { value: .3 };
      material.extensions = extension; let receiver;
      material.onBeforeCompile = function (shader) { receiver = this; shader.uniforms.probe = probe; shader.fragmentShader = '// upstream\n' + shader.fragmentShader; };
      material.customProgramCacheKey = () => 'upstream-' + type;
      const before = { transparent: material.transparent, opacity: material.opacity, depthWrite: material.depthWrite, depthTest: material.depthTest, color: material.color.toArray() };
      const first = shaderFor(type), second = shaderFor(type), uniformKeys = Object.keys(first.uniforms);
      expect(shadeOpening(material)).toBe(material); const cacheKey = material.customProgramCacheKey();
      material.onBeforeCompile(first); material.onBeforeCompile(second);
      expect(receiver).toBe(material); expect(material.extensions).toBe(extension); expect(first.uniforms.probe).toBe(probe);
      expect(Object.keys(first.uniforms)).toEqual([...uniformKeys, 'probe']); expect(first).toEqual(second);
      expect(material.customProgramCacheKey()).toBe(cacheKey); expect(cacheKey).toContain('upstream-' + type); expect(cacheKey).not.toBe('upstream-' + type);
      expect(first.vertexShader).toContain('attribute vec2 dinoNasal;'); expect(first.vertexShader).toContain('vDinoNasal = dinoNasal;');
      expect(first.fragmentShader).toContain('// upstream'); expect(first.fragmentShader).toContain('varying vec2 vDinoNasal;');
      expect(first.fragmentShader.indexOf('diffuseColor.rgb *=')).toBeGreaterThan(first.fragmentShader.indexOf('#include <color_fragment>'));
      expect(first.fragmentShader.indexOf('diffuseColor.rgb *=')).toBeLessThan(first.fragmentShader.indexOf('gl_FragColor'));
      expect(first.fragmentShader.match(/diffuseColor\.a\s*\*=/g)).toEqual(T.ShaderLib[type].fragmentShader.match(/diffuseColor\.a\s*\*=/g));
      expect(T.ShaderLib[type].vertexShader).not.toContain('dinoNasal');
      expect({ transparent: material.transparent, opacity: material.opacity, depthWrite: material.depthWrite, depthTest: material.depthTest, color: material.color.toArray() }).toEqual(before);
      material.dispose();
    });
  }
  it('keeps distinct upstream shader programs separate', () => {
    const a = new T.MeshStandardMaterial(), b = new T.MeshStandardMaterial();
    a.customProgramCacheKey = () => 'a'; b.customProgramCacheKey = () => 'b'; shadeOpening(a); shadeOpening(b);
    expect(a.customProgramCacheKey()).not.toBe(b.customProgramCacheKey()); a.dispose(); b.dispose();
  });
});

const start = source.indexOf('                var nostrilPos = head.clone().lerp('), end = source.indexOf('                var mouthStart = ', start);
if (start < 0 || end < start) throw Error('Missing nasal construction');
function construct(side, supported, materialKind = 'MeshStandardMaterial', existingMaterial = null) {
  const model = new T.Group(), mouthMat = new T[materialKind]({ color: 0x241a17 }), headMat = new T.MeshBasicMaterial(), radius = .6 * .065;
  const context = { THREE: T, model, head: new T.Vector3(2, 3, 0), surfaceSnout: new T.Vector3(0, 2.9, 0), surfaceHeadHeight: .8, surfaceHeadDepth: .6,
    faceSide: side, cranialSurface: { nostrilPosition: .72, nostrilHeightScale: 1, muzzleTipScale: 1, nostrilScale: 1 }, isTheropod: true, mouthMat, headMat, nostrilMat: existingMaterial, headShell: {},
    vec: (x, y, z) => new T.Vector3(x, y, z), faceSurfacePoint: p => p,
    dinoSurfaceAnchor: () => supported ? { point: new T.Vector3(.56, 3.16, side * .42), normal: new T.Vector3(-.3, .1, side).normalize() } : null,
    dinoEyeSurfaceFrame: frameFor, dinoNostrilRimGeometry: () => null, dinoNostrilGeometry: makeOpening, dinoNostrilShading: shadeOpening };
  // This shader fixture uses an actual non-sauropod catalog gate while
  // retaining its authored nasal projection/material conditions.
  context.sauropodCranium = nativeFrames.dinoSauropodCraniumFrame(T,
    nativeFrames.DINOS.find(d => d.id === 'ceratosaurus'), context.head, context.surfaceSnout);
  const result = new Function(...Object.keys(context), source.slice(start, end) + '\nreturn { nostril, nostrilRim, nostrilMat, nostrilPos };')(...Object.values(context));
  return { ...result, model, mouthMat, radius, dispose() { result.nostril.geometry.dispose(); result.nostrilRim.geometry.dispose(); headMat.dispose(); mouthMat.dispose(); if (!existingMaterial) result.nostrilMat?.dispose(); } };
}
describe('Actual nasal construction selects detailed supported openings', () => {
  for (const side of [-1, 1]) for (const kind of ['MeshStandardMaterial', 'MeshPhongMaterial', 'MeshBasicMaterial']) {
    it('uses the new appearance on supported side ' + side + ' with ' + kind, () => {
      const rig = construct(side, true, kind), opening = rig.nostril;
      expect(rig.model.children).toHaveLength(2); expect(opening.geometry.parameters.widthSegments).toBe(32); expect(opening.geometry.parameters.heightSegments).toBe(16);
      expect(opening.geometry.attributes.dinoNasal).toBeDefined(); expect(opening.material).toBe(rig.nostrilMat); expect(opening.material).not.toBe(rig.mouthMat);
      expect(rig.mouthMat.color.toArray()).toEqual(new T.Color(0x241a17).toArray()); expect(opening.material.color).toEqual(new T.Color(0x241a17).convertSRGBToLinear());
      expect(opening.material.customProgramCacheKey()).toContain('dinolab-nasal-recess'); expect(opening.scale.toArray()).toEqual([1.25, .55, .16]);
      expect(opening.userData.dinoNostrilSide).toBe(side); expect(opening.userData.dinoNostrilRole).toBe('opening'); expect(opening.parent).toBe(rig.nostrilRim.parent);
      expect(opening.quaternion.toArray()).toEqual(rig.nostrilRim.quaternion.toArray()); expect(opening.position.distanceTo(rig.nostrilRim.position)).toBeCloseTo(rig.radius * .12, 10);
      const sphere = new T.SphereGeometry(rig.radius, 32, 16); expect(Array.from(opening.geometry.attributes.position.array)).toEqual(Array.from(sphere.attributes.position.array)); sphere.dispose(); rig.dispose();
    });
  }
  for (const side of [-1, 1]) it('keeps exact legacy geometry and material for unsupported side ' + side, () => {
    const rig = construct(side, false), reference = new T.SphereGeometry(rig.radius, 12, 8);
    for (const key of ['position', 'normal', 'uv']) expect(Array.from(rig.nostril.geometry.attributes[key].array)).toEqual(Array.from(reference.attributes[key].array));
    expect(rig.nostril.geometry.attributes.dinoNasal).toBeUndefined(); expect(rig.nostril.material).toBe(rig.mouthMat); expect(rig.nostrilMat).toBeNull();
    expect(rig.nostril.scale.toArray()).toEqual([1.25, .55, .42]); reference.dispose(); rig.dispose();
  });
  it('shares the configured material across supported sides', () => {
    const first = construct(1, true), second = construct(-1, true, 'MeshStandardMaterial', first.nostrilMat);
    expect(second.nostril.material).toBe(first.nostril.material); expect(second.nostril.material.customProgramCacheKey()).toBe(first.nostril.material.customProgramCacheKey()); second.dispose(); first.dispose();
  });
});
