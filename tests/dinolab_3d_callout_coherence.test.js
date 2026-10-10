import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const repo = process.env.DINO_CALLOUT_REPO || process.cwd();
const THREE = createRequire(import.meta.url)(resolve(repo, 'vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_CALLOUT_SOURCE || resolve(repo, 'stem_lab/stem_tool_dinolab.js'), 'utf8');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert(a >= 0 && b > a, 'Missing native callout seam: ' + start);
  assert.equal(source.indexOf(start, a + start.length), -1, 'Ambiguous native callout seam: ' + start);
  return source.slice(a, b);
}
const nativeCode = [
  section('function addModelCylinder(a, b, radius, mat, order) {', 'function addAssemblyCylinder('),
  section('function addTextLabel(text, pos, color, scaleFactor, parent) {', 'var detailScale = Math.min(1, ht / 2);'),
  section('function addAnatomyCallout(label, anchor, offset) {', 'var calloutLift ='),
  section('function layoutSceneLabels() {', 'function resize() {')
].join('\n');
const assemble = new Function('context', 'with(context){' + nativeCode + '\nreturn {addAnatomyCallout,addTextLabel,layoutSceneLabels};}');

function harness(contextAvailable = true) {
  const camera = new THREE.PerspectiveCamera(50, 720 / 420, .1, 100);
  camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const model = new THREE.Group(), measurementGuides = new THREE.Group(); model.add(measurementGuides);
  const state = {
    THREE, model, camera, measurementGuides, sceneLabels: [], labelModeRef: {current: 'all'},
    canvas: {clientWidth: 720, clientHeight: 420}, cameraStudy: 'full', scanTargetId: '',
    props: {showHuman: false}, len: 8, ht: 3, detailScale: 1,
    anatomyCalloutMat: new THREE.MeshBasicMaterial({color: 0xf8fafc}),
    document: {createElement(tag) {
      assert.equal(tag, 'canvas');
      return {width: 0, height: 0, getContext(type) {
        assert.equal(type, '2d');
        return contextAvailable ? {beginPath(){}, roundRect(){}, rect(){}, fill(){}, stroke(){}, fillText(){}} : null;
      }};
    }}
  };
  const api = assemble(state);
  function add(text = 'Skull', point = new THREE.Vector3(), offset = new THREE.Vector3(0, 1, 0)) {
    const before = state.sceneLabels.length;
    api.addAnatomyCallout(text, point.clone().sub(offset), offset);
    return state.sceneLabels[before];
  }
  function dispose() {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    model.traverse(node => { if (node.geometry) geometries.add(node.geometry); if (node.material) materials.add(node.material); });
    materials.add(state.anatomyCalloutMat);
    materials.forEach(material => {if (material.map) textures.add(material.map); material.dispose();});
    geometries.forEach(geometry => geometry.dispose()); textures.forEach(texture => texture.dispose());
  }
  return {state, ...api, add, dispose};
}
function paired(label, visible) {
  assert.equal(label.visible, visible, label.userData.dinoLabel + ' label visibility');
  assert.equal(label.dinoCalloutLeader.visible, visible, label.userData.dinoLabel + ' leader visibility');
}
function snapshot(mesh) {
  return {position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray(),
    parent: mesh.parent, geometry: mesh.geometry, material: mesh.material,
    attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key, attribute]) => [key, Array.from(attribute.array)])),
    index: mesh.geometry.index && Array.from(mesh.geometry.index.array)};
}

describe('Dino Lab anatomy callout coherence', () => {
  it('registers the actual native label and leader without changing the connector geometry', () => {
    const h = harness();
    try {
      const anchor = new THREE.Vector3(.3, -.7, .2), offset = new THREE.Vector3(.4, 1.2, -.1);
      const originals = [anchor.toArray(), offset.toArray()];
      h.addAnatomyCallout('Skull', anchor, offset);
      assert.equal(h.state.sceneLabels.length, 1);
      const label = h.state.sceneLabels[0], leader = label.dinoCalloutLeader;
      assert(label.isSprite && leader.isMesh);
      assert.equal(label.parent, h.state.model); assert.equal(leader.parent, h.state.model);
      assert.equal(h.state.model.children.length, 3);
      assert.deepEqual(label.position.toArray(), anchor.clone().add(offset).toArray());
      assert(leader.position.distanceTo(anchor.clone().addScaledVector(offset, .5)) < 1e-12);
      assert.equal(leader.geometry.parameters.radialSegments, 10);
      assert.equal(leader.geometry.parameters.radiusTop, Math.max(.008, 3 * .0028));
      assert(Math.abs(leader.geometry.parameters.height - offset.length()) < 1e-12);
      assert.equal(leader.material, h.state.anatomyCalloutMat); assert.equal(leader.renderOrder, 18);
      assert.equal(leader.name, 'dinolab-callout-skull');
      assert.equal(leader.userData.dinoCalloutLabel, 'Skull'); assert.equal(leader.visible, false);
      assert.deepEqual([anchor.toArray(), offset.toArray()], originals);
    } finally {h.dispose();}
  });

  it('creates no orphan geometry if the text canvas context is unavailable', () => {
    const h = harness(false);
    try {assert.equal(h.add(), undefined); assert.equal(h.state.sceneLabels.length, 0); assert.deepEqual(h.state.model.children, [h.state.measurementGuides]);}
    finally {h.dispose();}
  });

  it('supports a zero-length connector without dereferencing a missing mesh', () => {
    const h = harness();
    try {const label = h.add('Skull', new THREE.Vector3(), new THREE.Vector3()); assert.equal(label.dinoCalloutLeader, undefined); h.layoutSceneLabels(); assert.equal(label.visible, true);}
    finally {h.dispose();}
  });

  it('keeps all four callouts coherent through all, key, anatomy and off modes', () => {
    const h = harness();
    try {
      const labels = ['Skull', 'Spine', 'Pelvis', 'Tail'].map((text, i) => h.add(text, new THREE.Vector3(-3 + i * 2, 0, 0)));
      for (const mode of ['all', 'key', 'anatomy', 'off', 'all']) {
        h.state.labelModeRef.current = mode; h.layoutSceneLabels();
        labels.forEach((label, i) => paired(label, mode === 'all' || (mode === 'key' && i === 0)));
      }
    } finally {h.dispose();}
  });

  it('hides stale leaders behind the camera and outside the near/far planes, then recovers', () => {
    const h = harness();
    try {
      const label = h.add();
      for (const z of [11, 9.99, -110]) {
        label.position.z = 0; h.layoutSceneLabels(); paired(label, true);
        label.position.z = z; h.layoutSceneLabels(); paired(label, false);
        label.position.z = 0; h.layoutSceneLabels(); paired(label, true);
      }
    } finally {h.dispose();}
  });

  it('hides stale leaders at every viewport edge and reserved control margin', () => {
    const h = harness();
    try {
      const label = h.add();
      for (const [x, y] of [[-8, 0], [8, 0], [0, 3.4], [0, -3.3]]) {
        label.position.set(0, 0, 0); h.layoutSceneLabels(); paired(label, true);
        label.position.set(x, y, 0); h.layoutSceneLabels(); paired(label, false);
      }
      label.position.set(0, 0, 0); h.layoutSceneLabels(); paired(label, true);
    } finally {h.dispose();}
  });

  it('shows only the winning label’s leader when collision priority changes', () => {
    const h = harness();
    try {
      const spine = h.add('Spine'), skull = h.add('Skull');
      h.layoutSceneLabels(); paired(skull, true); paired(spine, false);
      h.state.scanTargetId = 'spine'; h.layoutSceneLabels(); paired(spine, true); paired(skull, false);
      h.state.scanTargetId = ''; h.layoutSceneLabels(); paired(skull, true); paired(spine, false);
      spine.position.x = 3; h.layoutSceneLabels(); paired(skull, true); paired(spine, true);
    } finally {h.dispose();}
  });

  it('hides anatomy connectors in size study while preserving measurement label rules', () => {
    const h = harness();
    try {
      const label = h.add(); h.layoutSceneLabels(); paired(label, true);
      const endpoint = h.addTextLabel('8 m', new THREE.Vector3(), '#ffffff', .52, h.state.measurementGuides);
      Object.assign(endpoint.userData, {dinoMeasurement: true, dinoMeasurementEndpoint: true, dinoMeasurementMeters: 8});
      h.state.cameraStudy = 'size';
      for (const mode of ['all', 'key', 'anatomy', 'off']) {
        h.state.labelModeRef.current = mode; h.layoutSceneLabels(); paired(label, false); assert.equal(endpoint.visible, mode !== 'off');
      }
      h.state.labelModeRef.current = 'all'; h.state.measurementGuides.visible = false; h.layoutSceneLabels(); assert.equal(endpoint.visible, false);
      h.state.cameraStudy = 'full'; h.layoutSceneLabels(); paired(label, true);
    } finally {h.dispose();}
  });

  it('keeps runtime links out of serializable metadata and preserves shared-parent capture', () => {
    const h = harness();
    try {
      const label = h.add(), leader = label.dinoCalloutLeader, cranial = new THREE.Group();
      assert.equal(label.userData.dinoCalloutLeader, undefined);
      assert.equal(JSON.parse(JSON.stringify(leader.userData)).dinoCalloutLabel, 'Skull');
      assert.equal(JSON.parse(JSON.stringify(label.userData)).dinoLabel, 'Skull');
      assert.doesNotThrow(() => h.state.model.clone(true));
      h.state.model.add(cranial); cranial.add(label, leader); cranial.position.set(1, 0, 0); cranial.rotation.z = .1;
      h.layoutSceneLabels(); paired(label, true); assert.equal(label.parent, leader.parent);
      h.state.labelModeRef.current = 'anatomy'; h.layoutSceneLabels(); paired(label, false);
    } finally {h.dispose();}
  });

  it('changes visibility without allocating or mutating leader resources and transforms', () => {
    const h = harness();
    try {
      const label = h.add(), leader = label.dinoCalloutLeader; h.layoutSceneLabels();
      const before = snapshot(leader), children = h.state.model.children.slice(), spriteMaterial = label.material, texture = label.material.map;
      for (let i = 0; i < 100; i++) {h.state.labelModeRef.current = ['off', 'anatomy', 'key', 'all'][i % 4]; h.layoutSceneLabels();}
      assert.deepEqual(snapshot(leader), before); assert.deepEqual(h.state.model.children, children);
      assert.equal(label.material, spriteMaterial); assert.equal(label.material.map, texture); assert.equal(h.state.sceneLabels.length, 1);
      assert.deepEqual(label.position.toArray(), [0, 0, 0]);
    } finally {h.dispose();}
  });
});
