import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
function block(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error('Fossil material fixture boundary missing');
  return source.slice(from, to);
}
// Run the real construction and anatomy traversal; no copied material policy.
const construction = block('            var boneMat =', '            var muscleMat =');
const traversal = block('            // Frame anatomy, not sprites,', '            var studyBounds =');
const swatches = {
  boneMat: 0xc7b99c, jointMat: 0xc9b990, costalJointMat: 0x9fb8aa,
  cranialAccentMat: 0xd8c39a, jawJointMat: 0xb99d73, hyoidMat: 0xc4b5d9,
  toothMat: 0xfff5d6
};
const noOp = () => {};
function materials(phong) {
  const THREE = phong ? { ...T, MeshStandardMaterial: undefined, MeshPhysicalMaterial: undefined } : T;
  const context = {
    THREE, bodyColor: '#819564', fieldPalette: { accent: '#8c8465', dark: '#343e30' },
    skinTexture: null, skinBumpTexture: null, skinRoughnessTexture: null,
    lifeSurface: false, inferenceOpacity: 0.28, ht: 5, len: 18,
    integument: { pattern: 'subtle' }, dinoSkinMapping: noOp,
    dinoIrisShading: noOp, dinoGlintShading: noOp
  };
  return new Function(...Object.keys(context), construction + '\nreturn {' +
    Object.keys(swatches).join(',') + ', bodyMat, headMat, anatomyAccentMat, anatomyCalloutMat, eyeMat, eyePupilMat, eyeGlintMat, corneaMat, mouthMat, mouthCreaseMat, skeletonCavityMat };')(...Object.values(context));
}
function srgbChannel(value) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}
function linearSwatch(hex) {
  return [srgbChannel((hex >> 16) & 255), srgbChannel((hex >> 8) & 255), srgbChannel(hex & 255)];
}
function executeTraversal(model, showBody, mappingCalls) {
  new Function('THREE', 'model', 'props', 'dinoSkinCoordinates', 'len', 'ht', 'vec', traversal)(
    T, model, { showBody }, (...args) => mappingCalls.push(args), 6, 2,
    (x, y, z) => new T.Vector3(x, y, z)
  );
}
function meshSnapshot(mesh) {
  return {
    position: Array.from(mesh.geometry.attributes.position.array),
    normal: Array.from(mesh.geometry.attributes.normal.array),
    index: mesh.geometry.index && Array.from(mesh.geometry.index.array),
    world: mesh.matrixWorld.toArray(), castShadow: mesh.castShadow,
    material: JSON.stringify(mesh.material.toJSON())
  };
}

for (const phong of [false, true]) describe('Fossil shading with ' + (phong ? 'Phong fallback' : 'Standard materials'), () => {
  it('uses a single sRGB transfer for all seven bone and anatomical accent swatches', () => {
    const palette = materials(phong);
    for (const [name, swatch] of Object.entries(swatches)) {
      const material = palette[name], expected = linearSwatch(swatch);
      expect(material.type, name).toBe(phong ? 'MeshPhongMaterial' : 'MeshStandardMaterial');
      expect(material.userData.dinoSkeletalMaterial, name).toBe(true);
      material.color.toArray().forEach((channel, i) => expect(channel, name).toBeCloseTo(expected[i], 9));
    }
  });

  it('keeps bone matte and free of self illumination, while retaining tooth sheen', () => {
    const { boneMat, toothMat } = materials(phong);
    expect(boneMat.emissive.toArray()).toEqual([0, 0, 0]);
    expect(boneMat.transparent).toBe(false);
    expect(boneMat.opacity).toBe(1);
    expect(boneMat.depthWrite).toBe(true);
    if (phong) {
      expect(boneMat.shininess).toBe(6);
      expect(toothMat.shininess).toBe(24);
    } else {
      expect(boneMat.roughness).toBe(0.90);
      expect(boneMat.metalness).toBe(0);
      expect(toothMat.roughness).toBe(0.48);
    }
  });

  it('retains cartilage transparency and the different joint and hyoid teaching colors', () => {
    const palette = materials(phong);
    expect(palette.costalJointMat.transparent).toBe(true);
    expect(palette.costalJointMat.opacity).toBe(0.72);
    expect(palette.costalJointMat.depthWrite).toBe(true);
    for (const name of ['jointMat', 'cranialAccentMat', 'jawJointMat', 'hyoidMat', 'toothMat']) {
      expect(palette[name].transparent, name).toBe(false);
      expect(palette[name].opacity, name).toBe(1);
    }
    const hues = ['boneMat', 'costalJointMat', 'hyoidMat', 'toothMat'].map(name => palette[name].color.getHex());
    expect(new Set(hues).size).toBe(hues.length);
    expect(palette.hyoidMat.color.b).toBeGreaterThan(palette.hyoidMat.color.g);
    expect(palette.costalJointMat.color.g).toBeGreaterThan(palette.costalJointMat.color.r);
  });

  it('preserves calibrated colors and skeletal classification through independent frill clones', () => {
    const palette = materials(phong);
    for (const name of Object.keys(swatches)) {
      const original = palette[name], clone = original.clone(), second = clone.clone();
      expect(clone.userData.dinoSkeletalMaterial, name).toBe(true);
      expect(second.userData.dinoSkeletalMaterial, name).toBe(true);
      expect(second.color.toArray(), name).toEqual(original.color.toArray());
      expect(second.opacity, name).toBe(original.opacity);
      expect(second.transparent, name).toBe(original.transparent);
      clone.userData.dinoSkeletalMaterial = false;
      clone.color.set(0);
      expect(original.userData.dinoSkeletalMaterial, name).toBe(true);
      expect(second.userData.dinoSkeletalMaterial, name).toBe(true);
      expect(second.color.toArray(), name).toEqual(original.color.toArray());
    }
  });

  it('does not classify skin, cavities, eyes or teaching overlays as skeletal material', () => {
    const palette = materials(phong);
    for (const [name, material] of Object.entries(palette)) {
      if (name in swatches) continue;
      expect(material.userData.dinoSkeletalMaterial, name).toBeUndefined();
    }
    expect(palette.bodyMat.color.getHex()).toBe(0x819564);
    expect(palette.bodyMat.opacity).toBe(0.28);
    expect(palette.skeletonCavityMat.color.getHex()).toBe(0x211f1a);
    expect(palette.skeletonCavityMat.opacity).toBe(0.90);
    expect(palette.anatomyCalloutMat.opacity).toBe(0.62);
    expect(palette.eyeMat.color.toArray()).toEqual(new T.Color(0x947448).convertSRGBToLinear().toArray());
  });

  for (const showBody of [false, true]) it('preserves anatomy and existing receivers with showBody=' + showBody, () => {
    const palette = materials(phong), model = new T.Group(), mappingCalls = [];
    model.rotation.set(0.03, 0.45, -0.08);
    model.position.set(-0.5, 0.8, 0.4);
    const bones = Object.keys(swatches).map((name, i) => {
      const mesh = new T.Mesh(new T.BoxGeometry(0.4, 0.2, 0.3), palette[name]);
      mesh.position.set(i * 0.25, i % 2, -i * 0.12);
      mesh.castShadow = i % 2 === 0;
      model.add(mesh);
      return mesh;
    });
    // Frills already received shadows before this change. Keep that behavior
    // in the combined layer view while enabling ordinary fossil bones too.
    const frill = new T.Mesh(new T.BoxGeometry(0.3, 0.5, 0.7), palette.boneMat.clone());
    frill.receiveShadow = true; frill.castShadow = true; model.add(frill);
    const skin = new T.Mesh(new T.BoxGeometry(0.6, 0.2, 0.2), palette.bodyMat);
    skin.material.userData.dinoSkinMapping = true;
    skin.userData.dinoRegion = 'tail'; model.add(skin);
    const cavity = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.1), palette.skeletonCavityMat);
    model.add(cavity);
    const contour = new T.Mesh(new T.BoxGeometry(30, 30, 30), palette.boneMat);
    contour.userData.dinoContour = true; model.add(contour);
    model.updateMatrixWorld(true);
    const meshes = [...bones, frill, skin, cavity, contour];
    const before = meshes.map(meshSnapshot);
    const expectedBounds = new T.Box3();
    for (const mesh of meshes.filter(part => part !== contour)) {
      mesh.geometry.computeBoundingBox();
      expectedBounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
    }
    for (let pass = 0; pass < 3; pass++) executeTraversal(model, showBody, mappingCalls);
    bones.forEach(mesh => expect(mesh.receiveShadow).toBe(!showBody));
    expect(frill.receiveShadow).toBe(true);
    expect(skin.receiveShadow).toBe(true);
    expect(cavity.receiveShadow).toBe(false);
    expect(contour.receiveShadow).toBe(false);
    expect(contour.userData.dinoAnatomy).toBeUndefined();
    for (const mesh of meshes.filter(part => part !== contour)) expect(mesh.userData.dinoAnatomy).toBe(true);
    expect(mappingCalls.length).toBe(3);
    mappingCalls.forEach(call => {
      expect(call[0]).toBe(T); expect(call[1]).toBe(skin.geometry);
      expect(call[2]).toBe(skin.matrixWorld); expect(call[3]).toBe(true);
    });
    expect(model.userData.specimenBounds).toEqual({ min: expectedBounds.min.toArray(), max: expectedBounds.max.toArray() });
    expect(meshes.map(meshSnapshot)).toEqual(before);
  });
});
