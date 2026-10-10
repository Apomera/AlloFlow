import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import geometryDelta from './helpers/firstresponse_manikin_refinement_delta.cjs';

// This fixture retains its fixed historical geometry contract. Reverse only
// the exact later manikin refinement; current head/palm/reach checks use raw source.
const source = geometryDelta.revertManikinRefinement(readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8'));
const THREE = {}, scenes = [], ages = ['adult', 'child', 'infant'];
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
// Fixed hashes from the completed wrist pass, before the patient contrast
// material was added. Both wrist buffers and all recovery guide meshes are
// included; no patient geometry is exempt from preservation.
const baseline = /* captured baseline */ {
  "arms": {
    "adult:0": "aeb1c3681023760805b56cc1424e23e14bec847f7c2f208641fda834d0e1f6e8",
    "adult:1": "aeb1c3681023760805b56cc1424e23e14bec847f7c2f208641fda834d0e1f6e8",
    "adult:2": "e56680fa307cff0aa6324670315bbb645d5099b951ae43c364967c613cdd13af",
    "adult:3": "d41dcb2a30d15ffb682e4c66ce00b9b3370d59c23f5424d776cff4326c0f4183",
    "adult:4": "d41dcb2a30d15ffb682e4c66ce00b9b3370d59c23f5424d776cff4326c0f4183",
    "adult:5": "c5185bc82df8d1dc839df4a92b4b3a9a9c85d646a1dccbc3ccf4dc7a441263ac",
    "adult:6": "dfaaea296aa6f903f44ecb3a62a7da0a4f71b2bf405dcfb2adf2e53bf951f981",
    "adult:7": "4b1ac0cdb91265a54f6c4f26d59bbcdc9abdab9bd91e932dc5307fba8d3109df",
    "adult:8": "4b1ac0cdb91265a54f6c4f26d59bbcdc9abdab9bd91e932dc5307fba8d3109df",
    "child:0": "bbd0cea856eeb4ec56611cf942049afdf2c84494a319f6bd65330ea1f7aaef66",
    "child:1": "bbd0cea856eeb4ec56611cf942049afdf2c84494a319f6bd65330ea1f7aaef66",
    "child:2": "e2f761310f3fef6de41ee9627b46fefaf76c76ade41f35d22f6538e8152387cf",
    "child:3": "db3ee96c3f11638fe35f797a6a08690a9b37d61f7ae8f3691ad3e0eb0b3b8ee8",
    "child:4": "db3ee96c3f11638fe35f797a6a08690a9b37d61f7ae8f3691ad3e0eb0b3b8ee8",
    "child:5": "e8f119e5447465b6a684d565d832f2a2ba20b611a3b6359da64d38e96a0af94c",
    "child:6": "85e92e5af0ae2dd3d4340897322e1c88faa1420c994894a8e2660db6cd95ed51",
    "child:7": "c996e8b6227c0a8c402f71ff11230be3eaa30d3ef2d89d0ac94cb193343f5921",
    "child:8": "c996e8b6227c0a8c402f71ff11230be3eaa30d3ef2d89d0ac94cb193343f5921",
    "infant:0": "1f37d6d419f31c8fdfe8e95c62e4703a0fcf2f861a3600777769a38f20bd8ed3",
    "infant:1": "1f37d6d419f31c8fdfe8e95c62e4703a0fcf2f861a3600777769a38f20bd8ed3",
    "infant:2": "b25ff5e1e58d6f33c048bf1852888647ce885c174a312096f2e1605afa22d238",
    "infant:3": "dd1b59119507c7f7dad83c5bb7000dac637ca11297b68bea33df77e81d6a819d",
    "infant:4": "dd1b59119507c7f7dad83c5bb7000dac637ca11297b68bea33df77e81d6a819d",
    "infant:5": "7c8e0bf7f4622e58fed71987ce9ee16ed0ccba48ff20b4f7b1fd4ef11b5ef3fe",
    "infant:6": "263b97362cd08776499541cb424c3fdad58d9f89e8b39d573a58da44a7d4641b",
    "infant:7": "dc5d5c92047455c71197591aa52c553b4bba04f958915c40fb62216c71cf2c48",
    "infant:8": "dc5d5c92047455c71197591aa52c553b4bba04f958915c40fb62216c71cf2c48"
  },
  "normalMaterials": {
    "adult:0": "e74dd3c0aee26a762ea53cd95e579200f81aa168df6ca371551bb33e6665826e",
    "adult:1": "a615bacfb4cf9431f49f55aaa83787b96e2356435ee9b31403bda0fe919d0044",
    "adult:2": "00c98e0c70689ceca23d1183f538bd049e30ed1d2e1698dcea2b0f9ae1af7dac",
    "adult:3": "00c98e0c70689ceca23d1183f538bd049e30ed1d2e1698dcea2b0f9ae1af7dac",
    "adult:4": "00c98e0c70689ceca23d1183f538bd049e30ed1d2e1698dcea2b0f9ae1af7dac",
    "adult:5": "00c98e0c70689ceca23d1183f538bd049e30ed1d2e1698dcea2b0f9ae1af7dac",
    "adult:6": "00c98e0c70689ceca23d1183f538bd049e30ed1d2e1698dcea2b0f9ae1af7dac",
    "adult:7": "00c98e0c70689ceca23d1183f538bd049e30ed1d2e1698dcea2b0f9ae1af7dac",
    "adult:8": "00c98e0c70689ceca23d1183f538bd049e30ed1d2e1698dcea2b0f9ae1af7dac",
    "child:0": "aa1c2a7a2a00a50a19f6fa5b53a1f1cd2d1c8d46af4a17806de35cbc78eef206",
    "child:1": "95465eb672013b4aad9d246a24325b6927ad9b1528c0f0eceb19606ca69cf91a",
    "child:2": "6aaaaa546bf7a840a8f912a121cf2ab245e1a490e61dd19735b2b645afa460f9",
    "child:3": "6aaaaa546bf7a840a8f912a121cf2ab245e1a490e61dd19735b2b645afa460f9",
    "child:4": "6aaaaa546bf7a840a8f912a121cf2ab245e1a490e61dd19735b2b645afa460f9",
    "child:5": "6aaaaa546bf7a840a8f912a121cf2ab245e1a490e61dd19735b2b645afa460f9",
    "child:6": "6aaaaa546bf7a840a8f912a121cf2ab245e1a490e61dd19735b2b645afa460f9",
    "child:7": "6aaaaa546bf7a840a8f912a121cf2ab245e1a490e61dd19735b2b645afa460f9",
    "child:8": "6aaaaa546bf7a840a8f912a121cf2ab245e1a490e61dd19735b2b645afa460f9",
    "infant:0": "484f12877144d444382a5951f3feab9168b1be8acecf81423a9fb05fe6b07d3e",
    "infant:1": "e54ac2deff5853f973fe6f1ce86293e6f7b778b32dfa241f9fdb0e3a9cdf1cc0",
    "infant:2": "194854cf731d332881da999cebea858f8549f9de447caac7d9d97c9df6792ba2",
    "infant:3": "194854cf731d332881da999cebea858f8549f9de447caac7d9d97c9df6792ba2",
    "infant:4": "194854cf731d332881da999cebea858f8549f9de447caac7d9d97c9df6792ba2",
    "infant:5": "194854cf731d332881da999cebea858f8549f9de447caac7d9d97c9df6792ba2",
    "infant:6": "194854cf731d332881da999cebea858f8549f9de447caac7d9d97c9df6792ba2",
    "infant:7": "194854cf731d332881da999cebea858f8549f9de447caac7d9d97c9df6792ba2",
    "infant:8": "194854cf731d332881da999cebea858f8549f9de447caac7d9d97c9df6792ba2"
  },
  "contrastOutsideSkin": {
    "adult:0": "f6a7b2b4911c6c1de5114d7132d1ceaea1c6284b04ea8926bffe7cfa90efd6e8",
    "adult:1": "b9571540310d44dcf11109b6d354de3b71225c796fbc04642ae93af087c4c6c3",
    "adult:2": "3ce96ba6710d8b3cc23bb150bcd265824e1f88b47e47aab33ae2f9c816d914eb",
    "adult:3": "3ce96ba6710d8b3cc23bb150bcd265824e1f88b47e47aab33ae2f9c816d914eb",
    "adult:4": "3ce96ba6710d8b3cc23bb150bcd265824e1f88b47e47aab33ae2f9c816d914eb",
    "adult:5": "3ce96ba6710d8b3cc23bb150bcd265824e1f88b47e47aab33ae2f9c816d914eb",
    "adult:6": "3ce96ba6710d8b3cc23bb150bcd265824e1f88b47e47aab33ae2f9c816d914eb",
    "adult:7": "3ce96ba6710d8b3cc23bb150bcd265824e1f88b47e47aab33ae2f9c816d914eb",
    "adult:8": "3ce96ba6710d8b3cc23bb150bcd265824e1f88b47e47aab33ae2f9c816d914eb",
    "child:0": "52f7954876ab675a948a9af38eb816212c873a17e9c2f9ff210e633b9f2d4e95",
    "child:1": "047c1c57beebb6ba682897f5ef1d799c6c9fd9aab54b158bb890865ef758b386",
    "child:2": "c057ce2c343e9e54c46a12ace3c6a9953b6d2bb5ad21e9e41fa4766e60f3b265",
    "child:3": "c057ce2c343e9e54c46a12ace3c6a9953b6d2bb5ad21e9e41fa4766e60f3b265",
    "child:4": "c057ce2c343e9e54c46a12ace3c6a9953b6d2bb5ad21e9e41fa4766e60f3b265",
    "child:5": "c057ce2c343e9e54c46a12ace3c6a9953b6d2bb5ad21e9e41fa4766e60f3b265",
    "child:6": "c057ce2c343e9e54c46a12ace3c6a9953b6d2bb5ad21e9e41fa4766e60f3b265",
    "child:7": "c057ce2c343e9e54c46a12ace3c6a9953b6d2bb5ad21e9e41fa4766e60f3b265",
    "child:8": "c057ce2c343e9e54c46a12ace3c6a9953b6d2bb5ad21e9e41fa4766e60f3b265",
    "infant:0": "db34acf09476ebaffb07fd4e682d4305220d6874e05febfda2169ffeff100c3b",
    "infant:1": "9aed839f9c06fa549a370f2d8a981160defff310f073e1ce3830ddf813167d45",
    "infant:2": "5c04929db632dd3a939aeb40adfa0cf8d6f96a7db89d712f8f4ee02a7bad0783",
    "infant:3": "5c04929db632dd3a939aeb40adfa0cf8d6f96a7db89d712f8f4ee02a7bad0783",
    "infant:4": "5c04929db632dd3a939aeb40adfa0cf8d6f96a7db89d712f8f4ee02a7bad0783",
    "infant:5": "5c04929db632dd3a939aeb40adfa0cf8d6f96a7db89d712f8f4ee02a7bad0783",
    "infant:6": "5c04929db632dd3a939aeb40adfa0cf8d6f96a7db89d712f8f4ee02a7bad0783",
    "infant:7": "5c04929db632dd3a939aeb40adfa0cf8d6f96a7db89d712f8f4ee02a7bad0783",
    "infant:8": "5c04929db632dd3a939aeb40adfa0cf8d6f96a7db89d712f8f4ee02a7bad0783"
  }
};
const patientSkinNames = ['left', 'right'].flatMap(side =>
  ['upper-arm', 'forearm', 'elbow', 'wrist', 'palm', 'finger-0-surface', 'finger-1-surface', 'finger-2-surface', 'finger-3-surface', 'thumb-surface']
    .map(part => 'fr-patient-' + side + '-' + part));
let previous, build;

beforeAll(() => {
  previous = window.StemLab;
  window.StemLab = { isRegistered: () => false, registerTool() {}, makeBayViewer(config) {
    build = config.buildScene;
    return { attach() {}, sync() {}, reset() {}, nudge() {}, zoom() {}, status: () => 'failed' };
  } };
  new Function(source)();
});
afterAll(() => { window.StemLab = previous; });
afterEach(() => {
  const geometries = new Set(), materials = new Set();
  for (const scene of scenes.splice(0)) scene.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) if (material) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
});

function model(age, phase = 0, contrast = false) {
  const scene = new THREE.Scene(); scenes.push(scene);
  const content = build(THREE, { scene, phase, dark: true, contrast, wantShadow: false,
    trim: (color, shininess) => new THREE.MeshPhongMaterial({ color, shininess: shininess == null ? 30 : shininess, specular: 0x6b7688 }),
    sceneProps: { age, tab: phase ? 'recovery' : 'depth', recoveryGuides: true } });
  const sample = (settings = {}, childHands = 'two') => {
    content.frame(0, { depthLab: { age, motion: 'release', lean: 0, ...settings }, childHands }, true);
    scene.updateMatrixWorld(true); return scene;
  };
  if (!phase) sample(); else scene.updateMatrixWorld(true);
  return { scene, sample };
}
function part(scene, name) {
  const result = scene.getObjectByName(name); expect(result, name).toBeTruthy(); return result;
}
function geometryFingerprint(root) {
  const hash = createHash('sha256'); hash.update(JSON.stringify(root.matrixWorld.toArray()));
  root.traverse(o => {
    hash.update(JSON.stringify([o.type, o.name, o.matrix.toArray()]));
    if (!o.geometry) return;
    const g = o.geometry; hash.update(g.type); hash.update(JSON.stringify([g.drawRange, g.groups]));
    for (const key of Object.keys(g.attributes).sort()) {
      const a = g.attributes[key], b = a.array;
      hash.update(JSON.stringify([key, a.itemSize, a.normalized, b.constructor.name]));
      hash.update(Buffer.from(b.buffer, b.byteOffset, b.byteLength));
    }
    if (g.index) { const b = g.index.array; hash.update(b.constructor.name); hash.update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)); }
  });
  return hash.digest('hex');
}
function parameters(material) {
  const value = {};
  for (const key of ['type', 'name', 'transparent', 'opacity', 'depthTest', 'depthWrite', 'side', 'shininess', 'wireframe', 'vertexColors', 'flatShading', 'alphaTest', 'blending', 'blendSrc', 'blendDst', 'blendEquation', 'premultipliedAlpha', 'dithering', 'toneMapped', 'fog', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'linewidth', 'dashSize', 'gapSize', 'scale']) {
    if (material[key] !== undefined) value[key] = material[key];
  }
  for (const key of ['color', 'specular', 'emissive']) if (material[key]) value[key] = material[key].toArray();
  value.userData = material.userData; value.onBeforeCompile = String(material.onBeforeCompile);
  value.customProgramCacheKey = material.customProgramCacheKey(); return value;
}

function legacyPatientFinish(parameters, material, patientSkin) {
  // Retain the fixed pre-finish hashes. Only the two intended fields on the
  // single shared normal patient skin are mapped back; all other parameters,
  // shader hooks and every unrelated material remain in the fingerprint.
  if (material === patientSkin && material.isMeshPhongMaterial) {
    expect(material.color.toArray()).toEqual(new THREE.Color(0xc09478).multiplyScalar(.86).toArray());
    expect(material.specular.getHexString()).toBe('060606');
    parameters.color = new THREE.Color(0xc09478).toArray();
    parameters.specular = new THREE.Color(0x25313b).toArray();
  }
  return parameters;
}
function materialFingerprint(scene, excludeSkin = false) {
  const hash = createHash('sha256'), patientSkin = part(scene, 'fr-manikin-head').material;
  function visit(o, path) {
    if (o.material && !(excludeSkin && patientSkinNames.includes(o.name))) {
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      hash.update(JSON.stringify([path, o.type, o.name, materials.map(material =>
        legacyPatientFinish(parameters(material), material, patientSkin))]));
    }
    o.children.forEach((child, index) => visit(child, path + '.' + index));
  }
  visit(scene, 'scene'); return hash.digest('hex');
}
function assertScope(scene, contrast) {
  const arms = part(scene, 'fr-patient-arms'), skin = part(scene, 'fr-patient-left-palm').material;
  const originalSkin = part(scene, 'fr-manikin-head').material, rescuer = part(scene, 'fr-rescuer-lower-palm').material;
  expect(skin.type).toBe(contrast ? 'MeshBasicMaterial' : 'MeshPhongMaterial');
  expect(skin.transparent).toBe(false); expect(skin.opacity).toBe(1);
  expect(skin.depthTest).toBe(true); expect(skin.depthWrite).toBe(true); expect(skin.side).toBe(THREE.FrontSide);
  expect(skin.color.toArray()).toEqual(contrast ? new THREE.Color(0xffffff).toArray() : new THREE.Color(0xc09478).multiplyScalar(.86).toArray());
  expect(skin).not.toBe(rescuer);
  expect(skin.userData.frContourStrength).toBeUndefined();
  const matched = [];
  arms.traverse(o => {
    if (!o.material) return;
    if (patientSkinNames.includes(o.name)) {
      matched.push(o.name); expect(o.material, o.name).toBe(skin);
    } else {
      expect(o.material, o.name).not.toBe(skin);
      expect(o.material.userData.frPatientContourStrength, o.name).toBeUndefined();
    }
  });
  expect(matched.sort()).toEqual([...patientSkinNames].sort());
  if (contrast) {
    expect(skin.name).toBe('fr-patient-arm-skin');
    expect(skin).not.toBe(originalSkin);
    expect(skin.userData.frPatientContourStrength).toEqual({ value: 1 });
    expect(skin.customProgramCacheKey()).toBe('fr-patient-arm-contrast-contours-v1');
    const onlySkin = [];
    scene.traverse(o => {
      if (o.material !== skin) return;
      onlySkin.push(o.name);
      let ancestor = o; while (ancestor && ancestor !== arms) ancestor = ancestor.parent;
      expect(ancestor, 'patient contrast material stays inside the arm group').toBe(arms);
    });
    expect(onlySkin.sort()).toEqual([...patientSkinNames].sort());
  } else {
    expect(skin).toBe(originalSkin);
    expect(skin.name).toBe('');
    expect(skin.userData.frPatientContourStrength).toBeUndefined();
    expect(skin.specular.getHexString()).toBe('060606'); expect(skin.shininess).toBe(12);
    expect(skin.onBeforeCompile).toBe(THREE.Material.prototype.onBeforeCompile);
  }
  expect(originalSkin.userData.frPatientContourStrength).toBeUndefined();
  expect(rescuer.userData.frPatientContourStrength).toBeUndefined();
  expect(part(scene, 'fr-patient-left-nail-0').material.color.getHexString()).toBe(contrast ? '777777' : 'e1c5b2');
  expect(part(scene, 'fr-patient-left-palm-crease').material.color.getHexString()).toBe(contrast ? '777777' : '8d6650');
  expect(part(scene, 'fr-depth-reference').material.color.getHexString()).toBe(contrast ? 'ffffff' : '5eead4');
  expect(part(scene, 'fr-depth-marker').material.color.getHexString()).toBe(contrast ? 'ffffff' : 'fbbf24');
  return skin;
}
function snapshot(root) {
  const records = []; root.traverse(o => records.push({ o, parent: o.parent, geometry: o.geometry, material: o.material,
    matrix: o.matrix.toArray(), attributes: o.geometry ? { ...o.geometry.attributes } : undefined,
    arrays: o.geometry ? Object.fromEntries(Object.entries(o.geometry.attributes).map(([key, attribute]) => [key, attribute.array])) : undefined,
    index: o.geometry?.index, indexArray: o.geometry?.index?.array })); return records;
}
function assertResources(root, records) {
  const objects = []; root.traverse(o => objects.push(o)); expect(objects).toEqual(records.map(r => r.o));
  for (const r of records) {
    expect(r.o.parent).toBe(r.parent); expect(r.o.geometry).toBe(r.geometry); expect(r.o.material).toBe(r.material);
    expect(r.o.matrix.toArray()).toEqual(r.matrix);
    if (!r.geometry) continue;
    expect(Object.keys(r.geometry.attributes)).toEqual(Object.keys(r.attributes));
    for (const key of Object.keys(r.attributes)) {
      expect(r.geometry.attributes[key]).toBe(r.attributes[key]); expect(r.geometry.attributes[key].array).toBe(r.arrays[key]);
    }
    expect(r.geometry.index).toBe(r.index); expect(r.geometry.index?.array).toBe(r.indexArray);
  }
}
function compile(material) {
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
  material.onBeforeCompile(shader); return shader;
}

describe('First Response patient arm contrast contours', () => {
  for (const age of ages) for (let phase = 0; phase <= 8; phase++) {
    it(age + ' preserves every patient arm buffer and scopes the contrast material in pose ' + phase, () => {
      const key = age + ':' + phase;
      for (const contrast of [false, true]) {
        const m = model(age, phase, contrast); assertScope(m.scene, contrast);
        expect(geometryFingerprint(part(m.scene, 'fr-patient-arms'))).toBe(baseline.arms[key]);
        if (contrast) expect(materialFingerprint(m.scene, true), 'all other materials and shader hooks stay exact').toBe(baseline.contrastOutsideSkin[key]);
        else expect(materialFingerprint(m.scene), 'normal-mode material settings and hooks stay exact except the two asserted patient finish fields').toBe(baseline.normalMaterials[key]);
      }
    });
  }

  for (const age of ages) for (const contrast of [false, true]) {
    it(age + ' retains meshes, buffers and material state across compression frames (contrast ' + contrast + ')', () => {
      const m = model(age, 0, contrast), arms = part(m.scene, 'fr-patient-arms');
      const skin = assertScope(m.scene, contrast), records = snapshot(arms), version = skin.version;
      const strength = skin.userData.frPatientContourStrength, key = skin.customProgramCacheKey();
      const rescuer = part(m.scene, 'fr-rescuer-lower-palm').material, rescuerStrength = rescuer.userData.frContourStrength;
      for (const settings of [
        { motion: 'press', depth: 7, lean: 2 }, { motion: 'release', depth: 6, lean: 0 },
        ...[0, 12.5, 25, 50, 75, 87.5, 100].map(phase => ({ motion: 'inspect', phase, lean: 1 })),
      ]) for (const choice of age === 'child' ? ['one', 'two'] : ['two']) {
        m.sample(settings, choice); assertResources(arms, records);
        expect(geometryFingerprint(arms)).toBe(baseline.arms[age + ':0']);
        expect(skin.version).toBe(version); expect(skin.customProgramCacheKey()).toBe(key);
        expect(skin.userData.frPatientContourStrength).toBe(strength);
        expect(rescuer.userData.frContourStrength).toBe(rescuerStrength);
      }
      assertScope(m.scene, contrast);
    });
  }

  it('transforms real r128 Basic shaders and keeps patient, rescuer and scene uniforms independent', () => {
    const first = model('adult', 5, true), second = model('child', 5, true);
    const patient = assertScope(first.scene, true), otherPatient = assertScope(second.scene, true);
    const rescuer = part(first.scene, 'fr-rescuer-lower-palm').material;
    const a = compile(patient), b = compile(patient), c = compile(otherPatient), rescuerShader = compile(rescuer);
    expect(a.uniforms.frPatientContourStrength).toBe(patient.userData.frPatientContourStrength);
    expect(b.uniforms.frPatientContourStrength).toBe(a.uniforms.frPatientContourStrength);
    expect(c.uniforms.frPatientContourStrength).toBe(otherPatient.userData.frPatientContourStrength);
    expect(c.uniforms.frPatientContourStrength).not.toBe(a.uniforms.frPatientContourStrength);
    expect(a.uniforms.frPatientContourStrength).not.toBe(rescuerShader.uniforms.frContourStrength);
    expect(a.uniforms.frContourStrength).toBeUndefined(); expect(rescuerShader.uniforms.frPatientContourStrength).toBeUndefined();
    expect(a.vertexShader).toBe(b.vertexShader); expect(a.fragmentShader).toBe(b.fragmentShader);
    expect(a.vertexShader).toBe(c.vertexShader); expect(a.fragmentShader).toBe(c.fragmentShader);
    expect(a.vertexShader).toContain('normalize(normalMatrix * normal)');
    expect(a.vertexShader).toContain('frPatientViewPosition = -mvPosition.xyz');
    expect(a.vertexShader.indexOf('#include <project_vertex>')).toBeLessThan(a.vertexShader.indexOf('frPatientViewPosition ='));
    expect(a.fragmentShader).toContain('normalize(frPatientSurfaceNormal)'); expect(a.fragmentShader).toContain('normalize(frPatientViewPosition)');
    expect(a.fragmentShader).toContain('abs(dot('); expect(a.fragmentShader).toContain('mix(0.08, 1.0, smoothstep(0.34, 0.60,');
    expect(a.fragmentShader).toContain('diffuseColor.rgb *=');
    for (const name of ['frPatientSurfaceNormal', 'frPatientViewPosition']) {
      expect(a.vertexShader.split('varying vec3 ' + name + ';')).toHaveLength(2);
      expect(a.fragmentShader.split('varying vec3 ' + name + ';')).toHaveLength(2);
    }
    expect(a.fragmentShader.split('uniform float frPatientContourStrength;')).toHaveLength(2);
    for (const marker of ['#include <clipping_planes_fragment>', '#include <color_fragment>', '#include <alphatest_fragment>', '#include <tonemapping_fragment>', '#include <encodings_fragment>']) expect(a.fragmentShader).toContain(marker);
    expect(a.fragmentShader.indexOf('#include <color_fragment>')).toBeLessThan(a.fragmentShader.indexOf('diffuseColor.rgb *='));
    expect(a.fragmentShader.indexOf('diffuseColor.rgb *=')).toBeLessThan(a.fragmentShader.indexOf('#include <alphatest_fragment>'));
    expect(patient.customProgramCacheKey()).toBe(otherPatient.customProgramCacheKey());
    expect(patient.customProgramCacheKey()).not.toBe(rescuer.customProgramCacheKey());
    const key = patient.customProgramCacheKey(), version = patient.version;
    for (const value of [0, .5, 1]) {
      a.uniforms.frPatientContourStrength.value = value;
      expect(patient.userData.frPatientContourStrength.value).toBe(value);
      expect(compile(patient).uniforms.frPatientContourStrength).toBe(a.uniforms.frPatientContourStrength);
      expect(otherPatient.userData.frPatientContourStrength.value).toBe(1);
      expect(rescuer.userData.frContourStrength.value).toBe(1);
      expect(patient.customProgramCacheKey()).toBe(key); expect(patient.version).toBe(version);
    }
    for (const name of ['fr-manikin-head', 'fr-patient-left-nail-0', 'fr-patient-left-palm-crease', 'fr-patient-left-sleeve', 'fr-recovery-elbow-curve', 'fr-recovery-palm-arrow-stem', 'fr-recovery-palm-arrow-tip']) {
      const shader = compile(part(first.scene, name).material);
      expect(shader.vertexShader, name).toBe(THREE.ShaderLib.basic.vertexShader);
      expect(shader.fragmentShader, name).toBe(THREE.ShaderLib.basic.fragmentShader);
    }
    expect(rescuerShader.vertexShader).toContain('varying vec3 frSurfaceNormal;');
    expect(rescuerShader.fragmentShader).not.toContain('frPatient');
    expect(part(first.scene, 'fr-patient-right-palm').material).toBe(patient);
  });
});
