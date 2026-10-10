import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import geometryDelta from './helpers/firstresponse_manikin_refinement_delta.cjs';
import handStudyDelta from './helpers/firstresponse_hand_study_delta.cjs';

// This fixture retains its fixed historical geometry contract. Reverse only
// the exact later manikin refinement; current head/palm/reach checks use raw source.
const source = geometryDelta.revertManikinRefinement(readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8'));
const beforeSHA = '6e24299465bceafcce0f079ef8171d6ab2871f852a64483acad90ac57cd79a9f';
const finishBlock = `    if (!api.contrast) {
      // Keep the patient's face and hands on one finish. These viewer lights
      // need quieter skin highlights to retain cheek and finger curvature.
      // Rescuer finishes were cloned above and keep their own settings.
      skin.color.multiplyScalar(0.86);
      if (skin.specular) skin.specular.setHex(0x060606);
    }
`;
// Reverse the documented later UI expansion, then remove only this unique
// finish block to recover the exact completed supporting-hand source. Both
// builders retain fixed geometry, cameras and unrelated material baselines.
if (source.split(finishBlock).length !== 2) throw new Error('Patient finish block must occur exactly once');
const beforeSource = handStudyDelta.revertHandStudy(source).replace(finishBlock, '');
if (createHash('sha256').update(beforeSource).digest('hex') !== beforeSHA) {
  throw new Error('Removing only the patient finish must recover the fixed before-source SHA256');
}
const THREE = {}, models = new Set(), ages = ['adult', 'child', 'infant'];
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
let previous, oldConfig, newConfig;
function capture(code) {
  let config;
  window.StemLab = { isRegistered: () => false, registerTool() {}, makeBayViewer(value) {
    config = value;
    return { attach() {}, sync() {}, reset() {}, nudge() {}, zoom() {}, status: () => 'failed' };
  } };
  new Function(code)();
  return config;
}
beforeAll(() => { previous = window.StemLab; oldConfig = capture(beforeSource); newConfig = capture(source); });
afterAll(() => { window.StemLab = previous; });
afterEach(() => { for (const model of [...models]) dispose(model); });

function createModel(config, age, phase, contrast) {
  const allocatedMaterials = [], allocatedGeometries = [];
  const tracked = { ...THREE };
  for (const key of Object.keys(THREE)) {
    if (typeof THREE[key] !== 'function') continue;
    const collection = /Material$/.test(key) ? allocatedMaterials : /Geometry$/.test(key) ? allocatedGeometries : null;
    if (!collection) continue;
    tracked[key] = new Proxy(THREE[key], { construct(target, args) {
      const value = Reflect.construct(target, args); collection.push(value); return value;
    } });
  }
  const scene = new THREE.Scene();
  const content = config.buildScene(tracked, { scene, phase, dark: true, contrast, wantShadow: false,
    trim: (color, shininess) => new tracked.MeshPhongMaterial({ color,
      shininess: shininess == null ? 30 : shininess, specular: 0x6b7688 }),
    sceneProps: { age, tab: phase ? 'recovery' : 'depth', recoveryGuides: true } });
  const model = { scene, content, allocatedMaterials, allocatedGeometries, age, phase, contrast };
  model.sample = (settings = {}, childHands = 'two') => {
    content.frame(0, { depthLab: { age, motion: 'release', lean: 0, ...settings }, childHands }, true);
    scene.updateMatrixWorld(true);
  };
  models.add(model); model.sample(); return model;
}
function resources(model) {
  const geometries = new Set(model.allocatedGeometries), materials = new Set(model.allocatedMaterials);
  model.scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
  });
  return { geometries, materials };
}
function dispose(model) {
  const { geometries, materials } = resources(model);
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  models.delete(model);
}
function part(scene, name) {
  const result = scene.getObjectByName(name); expect(result, name).toBeTruthy(); return result;
}
function parameters(material) {
  const value = {};
  for (const key of ['type', 'name', 'transparent', 'opacity', 'depthTest', 'depthWrite', 'side',
    'shininess', 'wireframe', 'vertexColors', 'flatShading', 'alphaTest', 'blending', 'blendSrc',
    'blendDst', 'blendEquation', 'premultipliedAlpha', 'dithering', 'toneMapped', 'fog',
    'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'linewidth', 'dashSize', 'gapSize', 'scale']) {
    if (material[key] !== undefined) value[key] = material[key];
  }
  for (const key of ['color', 'specular', 'emissive']) if (material[key]) value[key] = material[key].toArray();
  value.userData = material.userData; value.onBeforeCompile = String(material.onBeforeCompile);
  value.customProgramCacheKey = material.customProgramCacheKey(); return value;
}
function oldParameters(model, material, candidate) {
  const value = parameters(material), skin = part(model.scene, 'fr-manikin-head').material;
  if (candidate && !model.contrast && material === skin) {
    expect(material.color.toArray()).toEqual(new THREE.Color(0xc09478).multiplyScalar(.86).toArray());
    expect(material.specular.getHexString()).toBe('060606');
    value.color = new THREE.Color(0xc09478).toArray();
    value.specular = new THREE.Color(0x25313b).toArray();
  }
  return value;
}
function materialFingerprint(model, candidate = false) {
  const hash = createHash('sha256'), identities = new Map();
  function identity(material) {
    if (!identities.has(material)) identities.set(material, identities.size);
    return identities.get(material);
  }
  function visit(object, path) {
    if (object.material) hash.update(JSON.stringify([path, object.name,
      (Array.isArray(object.material) ? object.material : [object.material])
        .map(material => [identity(material), oldParameters(model, material, candidate)])]));
    object.children.forEach((child, index) => visit(child, path + '.' + index));
  }
  visit(model.scene, 'scene');
  // Direct material allocations also include finishes prepared for currently
  // hidden or unused objects. They retain their creation order and sharing.
  hash.update(JSON.stringify(model.allocatedMaterials.map(material => [identity(material), oldParameters(model, material, candidate)])));
  return hash.digest('hex');
}
function geometryFingerprint(scene) {
  const hash = createHash('sha256'), identities = new Map();
  function visit(object, path) {
    hash.update(JSON.stringify([path, object.type, object.name, object.visible, object.matrix.toArray(),
      object.matrixWorld.toArray(), object.castShadow, object.receiveShadow, object.renderOrder, object.layers.mask]));
    if (object.geometry) {
      const geometry = object.geometry;
      if (!identities.has(geometry)) identities.set(geometry, identities.size);
      hash.update(JSON.stringify([identities.get(geometry), geometry.type, geometry.drawRange, geometry.groups]));
      for (const key of Object.keys(geometry.attributes).sort()) {
        const attribute = geometry.attributes[key], bytes = attribute.array;
        hash.update(JSON.stringify([key, attribute.itemSize, attribute.normalized, bytes.constructor.name]));
        hash.update(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      }
      if (geometry.index) {
        const bytes = geometry.index.array; hash.update(bytes.constructor.name);
        hash.update(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      }
    }
    object.children.forEach((child, index) => visit(child, path + '.' + index));
  }
  visit(scene, 'scene'); return hash.digest('hex');
}
function summary(model) {
  const { geometries, materials } = resources(model); let nodes = 0, meshes = 0;
  model.scene.traverse(object => { nodes++; if (object.isMesh) meshes++; });
  return { nodes, meshes, geometries: geometries.size, materials: materials.size,
    allocatedGeometries: model.allocatedGeometries.length, allocatedMaterials: model.allocatedMaterials.length,
    picks: model.content.picks.map(object => object.name), meshKeys: Object.keys(model.content.meshes).sort() };
}
function inspectionMetadata(model) {
  return Object.fromEntries(['nearPalm', 'supportingHand', 'heelSide', 'handContact'].map(key => {
    const object = model.content.meshes[key];
    return [key, object ? { name: object.name, inspection: object.userData.inspection } : null];
  }));
}
function snapshot(model) {
  const entries = [];
  model.scene.traverse(object => entries.push({ object, geometry: object.geometry, material: object.material,
    attributes: object.geometry && Object.fromEntries(Object.entries(object.geometry.attributes)
      .map(([key, attribute]) => [key, [attribute, attribute.array]])),
    index: object.geometry?.index, indexArray: object.geometry?.index?.array }));
  return { entries, geometries: model.allocatedGeometries.length, materials: model.allocatedMaterials.length };
}
function assertSnapshot(model, saved) {
  const objects = []; model.scene.traverse(object => objects.push(object));
  expect(objects).toEqual(saved.entries.map(entry => entry.object));
  expect(model.allocatedGeometries).toHaveLength(saved.geometries);
  expect(model.allocatedMaterials).toHaveLength(saved.materials);
  for (const { object, geometry, material, attributes, index, indexArray } of saved.entries) {
    expect(object.geometry).toBe(geometry); expect(object.material).toBe(material);
    if (!geometry) continue;
    expect(Object.keys(geometry.attributes)).toEqual(Object.keys(attributes));
    for (const [key, [attribute, array]] of Object.entries(attributes)) {
      expect(geometry.attributes[key]).toBe(attribute); expect(attribute.array).toBe(array);
    }
    expect(geometry.index).toBe(index); expect(geometry.index?.array).toBe(indexArray);
  }
}
function assertScope(model, candidate) {
  const head = part(model.scene, 'fr-manikin-head').material;
  const palm = part(model.scene, 'fr-patient-left-palm').material;
  const rescuer = part(model.scene, 'fr-rescuer-lower-palm').material;
  if (model.contrast) {
    expect(head.color.getHexString()).toBe('ffffff'); expect(palm.color.getHexString()).toBe('ffffff');
    expect(palm).not.toBe(head); expect(palm.name).toBe('fr-patient-arm-skin');
    expect(palm.customProgramCacheKey()).toBe('fr-patient-arm-contrast-contours-v1');
  } else {
    expect(palm).toBe(head);
    expect(head.color.toArray()).toEqual(new THREE.Color(0xc09478).multiplyScalar(candidate ? .86 : 1).toArray());
    expect(head.specular.getHexString()).toBe(candidate ? '060606' : '25313b');
    expect(head.shininess).toBe(12); expect(head.name).toBe('');
    expect(head.onBeforeCompile).toBe(THREE.Material.prototype.onBeforeCompile);
    expect(head.userData).toEqual({});
    expect(rescuer.color.toArray()).toEqual(new THREE.Color(0xc09478).multiplyScalar(.76).toArray());
    expect(rescuer.specular.getHexString()).toBe('000000');
  }
  expect(rescuer).not.toBe(head); expect(rescuer).not.toBe(palm);
  expect(head.transparent).toBe(false); expect(head.opacity).toBe(1);
  expect(head.depthTest).toBe(true); expect(head.depthWrite).toBe(true); expect(head.side).toBe(THREE.FrontSide);
  for (const side of ['left', 'right']) {
    expect(part(model.scene, 'fr-patient-' + side + '-palm').material).toBe(palm);
    expect(part(model.scene, 'fr-patient-' + side + '-wrist').material).toBe(palm);
    const nail = part(model.scene, 'fr-patient-' + side + '-nail-0').material;
    expect(nail).not.toBe(head); expect(nail).not.toBe(palm);
    expect(nail.color.getHexString()).toBe(model.contrast ? '777777' : 'e1c5b2');
    if (!model.contrast) expect(nail.specular.getHexString()).toBe('25313b');
    expect(part(model.scene, 'fr-patient-' + side + '-palm-crease').material).not.toBe(palm);
    expect(part(model.scene, 'fr-patient-' + side + '-sleeve').material).not.toBe(palm);
  }
  return head;
}

describe('First Response patient skin finish', () => {
  it('reverses the documented hand-study UI delta and preserves the unique finish block and viewer configuration', () => {
    expect(createHash('sha256').update(beforeSource).digest('hex')).toBe(beforeSHA);
    const values = config => JSON.parse(JSON.stringify(config, (_, value) => typeof value === 'function' ? '[function]' : value));
    expect(values(newConfig)).toEqual(values(oldConfig));
  });
  for (const age of ages) for (const phase of [0, 2, 4, 5, 8]) {
    it(age + ' preserves exact geometry, resources, cameras and all other finishes in pose ' + phase, () => {
      for (const contrast of [false, true]) {
        const before = createModel(oldConfig, age, phase, contrast), after = createModel(newConfig, age, phase, contrast);
        assertScope(before, false); assertScope(after, true);
        expect(geometryFingerprint(after.scene), 'every buffer, transform and visibility flag').toBe(geometryFingerprint(before.scene));
        expect(summary(after)).toEqual(summary(before));
        expect(materialFingerprint(after, true), 'only asserted patient diffuse/specular fields are normalized').toBe(materialFingerprint(before));
        expect(inspectionMetadata(after)).toEqual(inspectionMetadata(before));
        dispose(before); dispose(after);
      }
    });
  }
  for (const age of ages) {
    it(age + ' keeps finish values and material/buffer identities stable during compression and recovery frames', () => {
      for (const contrast of [false, true]) for (const phase of [0, 5]) {
        const before = createModel(oldConfig, age, phase, contrast), after = createModel(newConfig, age, phase, contrast);
        const saved = snapshot(after), head = assertScope(after, true), color = head.color.toArray(), specular = head.specular?.toArray();
        const version = head.version, materialHash = materialFingerprint(after, true);
        for (const settings of [{ motion: 'press', depth: 6, lean: 1 }, { motion: 'release', lean: 0 },
          ...[0, 50, 100].map(phase => ({ motion: 'inspect', phase, depth: 6, lean: 1 }))]) {
          const choices = age === 'child' ? ['one', 'two'] : ['two'];
          for (const choice of choices) {
            before.sample(settings, choice); after.sample(settings, choice);
            assertSnapshot(after, saved); expect(head.color.toArray()).toEqual(color);
            expect(head.specular?.toArray()).toEqual(specular); expect(head.version).toBe(version);
            expect(materialFingerprint(after, true)).toBe(materialHash);
            expect(geometryFingerprint(after.scene)).toBe(geometryFingerprint(before.scene));
          }
        }
        dispose(before); dispose(after);
      }
    });
    it(age + ' creates independent finishes on rebuild and disposes each unique resource once', () => {
      const first = createModel(newConfig, age, 5, false), second = createModel(newConfig, age, 8, false);
      const firstSkin = assertScope(first, true), secondSkin = assertScope(second, true);
      expect(firstSkin).not.toBe(secondSkin); expect(firstSkin.color).not.toBe(secondSkin.color);
      expect(firstSkin.specular).not.toBe(secondSkin.specular);
      for (const model of [first, second]) {
        const { geometries, materials } = resources(model), events = new Map();
        for (const resource of [...geometries, ...materials]) {
          events.set(resource, 0); resource.addEventListener('dispose', () => events.set(resource, events.get(resource) + 1));
        }
        dispose(model);
        expect([...events.values()]).toEqual([...events.keys()].map(() => 1));
        expect(models.has(model)).toBe(false);
      }
    });
  }
});
