import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Load the same local UMD bundle as stem_gl_harness, without an npm dependency
// or network request. Its CommonJS branch exports the actual geometry library.
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
if (THREE.REVISION !== '128') throw Error('Camera fit must use the same vendored THREE r128 as the browser harness');

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text) {
  const start = '        function cameraPose() {', end = '        function clearRemovalFeedback()';
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous Dino camera fit');
  return text.slice(a, b).trim();
}
const shipped = bounded(source);
// Frozen pre-tightening camera function: preserve full/section behavior without
// making repository tests depend on a workstation-only scratch backup.
const prior = `function cameraPose() {
  var width = canvas.clientWidth || 640, height = canvas.clientHeight || 420;
  var sectionZ = (Math.floor(latest.current.focus / 6) - 1.5) * 1.08, inspecting = latest.current.inspect;
  var finding = latest.current.findMode;
  var target = finding ? new window.THREE.Vector3(0,.62,0) : new window.THREE.Vector3(0, .90, inspecting ? sectionZ : 0), sy = Math.sin(pose.yaw), cy = Math.cos(pose.yaw), sp = Math.sin(pose.pitch), cp = Math.cos(pose.pitch);
  var tanV = Math.tan(camera.fov * Math.PI / 360) * .88, tanH = tanV * width / height, fitted = finding ? .5 : 7;
  (finding ? [-1.92,1.92] : inspecting && width < 500 ? [-4.12,4.12] : [-3.85,3.85]).forEach(function (x) { (finding ? [-.16,1.65] : [-.3,2.8]).forEach(function (y) { (finding ? [-1.92,1.92] : inspecting ? [sectionZ - .8, sectionZ + .8] : [-2.8,2.8]).forEach(function (z) {
    var dy = y - target.y, dz = z - target.z, right = x * cy - dz * sy, up = -x * sy * sp + dy * cp - dz * cy * sp, toward = x * sy * cp + dy * sp + dz * cy * cp;
    fitted = Math.max(fitted, toward + Math.abs(right) / tanH, toward + Math.abs(up) / tanV);
  }); }); });
  var distance = fitted * 1.04 / pose.zoom;
  camera.position.set(Math.sin(pose.yaw) * Math.cos(pose.pitch) * distance, target.y + Math.sin(pose.pitch) * distance, target.z + Math.cos(pose.yaw) * Math.cos(pose.pitch) * distance);
  camera.lookAt(target); camera.updateMatrixWorld();
  if (sectionGuides) sectionGuides.children.forEach(function (object) { if (object.isSprite) { var labelWidth = object.userData.sectionLabelWidth * (width < 500 ? 1.8 : 1); object.scale.set(labelWidth, labelWidth / 2, 1); } });
}`;
const tracked = [];
const material = new THREE.MeshBasicMaterial();
afterEach(() => { tracked.splice(0).forEach(model => model.traverse(object => { if (object.geometry) object.geometry.dispose(); })); });
function mesh(geometry) { return new THREE.Mesh(geometry, material); }
function specimen(shape, rotation = 0) {
  const model = new THREE.Group(); tracked.push(model);
  if (shape === 'curved') {
    const arc = mesh(new THREE.TorusGeometry(.31, .059, 11, 42, Math.PI * 1.28));
    arc.rotation.x = Math.PI / 2; arc.position.y = .075; model.add(arc);
  } else if (shape === 'elongate') {
    const shaft = mesh(new THREE.CylinderGeometry(.073, .096, .64, 18, 5));
    shaft.rotation.z = Math.PI / 2; shaft.position.y = .12; model.add(shaft);
    const end = mesh(new THREE.SphereGeometry(.115, 16, 12));
    end.position.set(-.30, .12, 0); end.scale.set(1, .82, .95); model.add(end);
  } else {
    const body = mesh(new THREE.CylinderGeometry(.17, .18, .18, 14, 3));
    body.rotation.z = Math.PI / 2; body.position.y = .12; model.add(body);
    for (const x of [-.092, .092]) {
      const end = mesh(new THREE.CircleGeometry(.162, 11));
      end.rotation.y = Math.PI / 2; end.position.set(x, .12, 0); model.add(end);
    }
    const splinter = mesh(new THREE.DodecahedronGeometry(.17, 0));
    splinter.position.set(.13, .17, .13); splinter.scale.set(1.4, .55, .58); splinter.rotation.set(.12, .25, .18); model.add(splinter);
  }
  model.rotation.y = rotation; model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model), span = box.getSize(new THREE.Vector3());
  const scale = 2.75 / Math.max(span.x, span.y, span.z);
  model.scale.setScalar(scale); model.position.y = .035 - box.min.y * scale;
  model.visible = true; model.updateMatrixWorld(true);
  return model;
}
function setup({ width = 1332, height = 570, view = 'find', focus = 0, pose = { yaw: .66, pitch: .62, zoom: 1 }, models = [], surveyAxes = null, code = shipped } = {}) {
  const camera = new THREE.PerspectiveCamera(42, width / height, .1, 80);
  const latest = { current: { focus, inspect: view === 'section', findMode: view === 'find' } };
  const run = new Function('canvas', 'latest', 'pose', 'camera', 'findModels', 'window', 'sectionGuides', 'surveyAxes', code + '\nreturn cameraPose;')(
    { clientWidth: width, clientHeight: height }, latest, pose, camera, models, { THREE }, null, surveyAxes
  );
  return { camera, latest, pose, run };
}
function corners(box) {
  const result = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) result.push(new THREE.Vector3(x, y, z));
  return result;
}
// Check a much denser circle than the 24 fit samples, including every direction
// between samples. The entire actual platform should retain a visible margin.
const circle = [];
for (let i = 0; i < 720; i++) {
  const angle = i * Math.PI / 360;
  for (const y of [-.15, .01]) circle.push(new THREE.Vector3(Math.cos(angle) * 1.88, y, Math.sin(angle) * 1.88));
}
function projectionLimits(camera, points) {
  let horizontal = 0, vertical = 0, minZ = Infinity, maxZ = -Infinity;
  for (const point of points) {
    const projected = point.clone().project(camera);
    if (![projected.x, projected.y, projected.z].every(Number.isFinite)) throw Error('Camera projection became non-finite');
    horizontal = Math.max(horizontal, Math.abs(projected.x)); vertical = Math.max(vertical, Math.abs(projected.y));
    minZ = Math.min(minZ, projected.z); maxZ = Math.max(maxZ, projected.z);
  }
  return { horizontal, vertical, minZ, maxZ };
}
function expectInside(camera, points) {
  const limits = projectionLimits(camera, points);
  expect(limits.horizontal).toBeLessThanOrEqual(.92);
  expect(limits.vertical).toBeLessThanOrEqual(.92);
  expect(limits.minZ).toBeGreaterThan(-1); expect(limits.maxZ).toBeLessThan(1);
}
const sizes = [
  { label: 'desktop', width: 1332, height: 570 },
  { label: 'phone 320', width: 298, height: 360 },
  { label: 'phone 390', width: 368, height: 360 }
];
const poses = [];
for (const yaw of [-Math.PI, -1.4, 0, .66, 1.8, 4.2]) for (const pitch of [.12, .3, .62, 1.53]) poses.push({ yaw, pitch, zoom: 1 });

describe('selected exposed fragment camera fit', () => {
  it('scales survey labels for narrow displays without changing any camera pose', () => {
    for (const size of sizes) for (const view of ['full','section','find']) {
      const label = { userData: { surveyLabelWidth: .56 }, scale: new THREE.Vector3() };
      const plain = setup({ ...size, view }), annotated = setup({ ...size, view, surveyAxes: { children: [label] } });
      plain.run(); annotated.run();
      expect(annotated.camera.position.toArray()).toEqual(plain.camera.position.toArray());
      expect(annotated.camera.quaternion.toArray()).toEqual(plain.camera.quaternion.toArray());
      const width = .56 * (size.width < 500 ? 1.5 : 1);
      expect(label.scale.toArray()).toEqual([width,width * .625,1]);
    }
  });


  for (const shape of ['curved', 'elongate', 'compact']) for (const size of sizes) {
    it('keeps the ' + shape + ' fragment and circular plinth in frame on ' + size.label, () => {
      for (const rotation of [0, .47, 2.6]) {
        const model = specimen(shape, rotation), box = new THREE.Box3().setFromObject(model), span = box.getSize(new THREE.Vector3());
        expect(Math.max(span.x, span.y, span.z)).toBeCloseTo(2.75, 10);
        expect(box.min.y).toBeCloseTo(.035, 10);
        for (const pose of poses) {
          const { camera, run } = setup({ ...size, pose, models: [model] });
          run(); expectInside(camera, [...corners(box), ...circle]);
        }
      }
    });
  }

  it('ignores a hidden enormous template before the selected visible model', () => {
    const model = specimen('compact');
    const hidden = mesh(new THREE.BoxGeometry(10000, 10000, 10000)); tracked.push(hidden);
    hidden.position.set(300, 700, 400); hidden.visible = false;
    const plain = setup({ models: [model] }), withHidden = setup({ models: [hidden, model] });
    plain.run(); withHidden.run();
    expect(withHidden.camera.position.toArray()).toEqual(plain.camera.position.toArray());
    expect(withHidden.camera.quaternion.toArray()).toEqual(plain.camera.quaternion.toArray());
    expectInside(withHidden.camera, [...corners(new THREE.Box3().setFromObject(model)), ...circle]);
  });

  it('keeps an empty inspection camera finite without reading hidden template bounds', () => {
    const hidden = mesh(new THREE.BoxGeometry(10000, 10000, 10000)); tracked.push(hidden); hidden.visible = false;
    for (const size of sizes) for (const pose of poses) {
      const empty = setup({ ...size, pose, models: [] }), unexposed = setup({ ...size, pose, models: [hidden] });
      empty.run(); unexposed.run();
      expect(unexposed.camera.position.toArray()).toEqual(empty.camera.position.toArray());
      expect([...empty.camera.position.toArray(), ...empty.camera.quaternion.toArray()].every(Number.isFinite)).toBe(true);
      expectInside(empty.camera, circle);
    }
  });

  it('preserves zoom as the same relative distance multiplier', () => {
    const model = specimen('compact'), box = new THREE.Box3().setFromObject(model);
    const target = new THREE.Vector3(0, (Math.min(-.15, box.min.y) + box.max.y) / 2, 0);
    for (const size of sizes) {
      const baseline = setup({ ...size, models: [model] }); baseline.run();
      const distance = baseline.camera.position.distanceTo(target);
      const direction = baseline.camera.position.clone().sub(target).normalize();
      for (const zoom of [.65, 1, 1.8]) {
        const H = setup({ ...size, models: [model], pose: { yaw: .66, pitch: .62, zoom } }); H.run();
        expect(H.camera.position.distanceTo(target) * zoom).toBeCloseTo(distance, 10);
        expect(H.camera.position.clone().sub(target).normalize().distanceTo(direction)).toBeLessThan(1e-12);
      }
    }
  });

  it('recomputes the fit when a fragment changes its visible axis and vertical bounds', () => {
    const model = mesh(new THREE.CylinderGeometry(.12, .12, 2.75, 16)); tracked.push(model);
    model.position.y = 2.75 / 2 + .035; model.visible = true;
    const H = setup({ models: [model], pose: { yaw: .66, pitch: .12, zoom: 1 } });
    H.run(); const verticalPosition = H.camera.position.clone();
    expectInside(H.camera, [...corners(new THREE.Box3().setFromObject(model)), ...circle]);
    model.rotation.z = Math.PI / 2; H.run();
    expect(H.camera.position.distanceTo(verticalPosition)).toBeGreaterThan(.1);
    expectInside(H.camera, [...corners(new THREE.Box3().setFromObject(model)), ...circle]);
  });

  it('tightens the desktop default view for flatter fragments compared with the old square fit', () => {
    for (const shape of ['curved', 'elongate']) {
      const model = specimen(shape), current = setup({ models: [model] }), old = setup({ models: [model], code: prior });
      current.run(); old.run();
      const box = new THREE.Box3().setFromObject(model);
      const currentTarget = new THREE.Vector3(0, (Math.min(-.15, box.min.y) + box.max.y) / 2, 0);
      const priorTarget = new THREE.Vector3(0, .62, 0);
      expect(current.camera.position.distanceTo(currentTarget)).toBeLessThan(old.camera.position.distanceTo(priorTarget) * .9);
    }
  });

  it('ships the same actual camera fitting function in the desktop mirror', () => {
    const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
    expect(bounded(mirror)).toBe(shipped);
  });
});

describe('unchanged full excavation and row-section cameras', () => {
  for (const view of ['full', 'section']) for (const size of sizes) {
    it('preserves the existing ' + view + ' fit on ' + size.label, () => {
      for (const focus of [0, 6, 17, 23]) for (const basePose of poses) for (const zoom of [.65, 1, 1.8]) {
        const pose = { ...basePose, zoom };
        const current = setup({ ...size, view, focus, pose }), old = setup({ ...size, view, focus, pose, code: prior });
        current.run(); old.run();
        expect(current.camera.position.distanceTo(old.camera.position)).toBeLessThan(1e-11);
        expect(current.camera.quaternion.angleTo(old.camera.quaternion)).toBeLessThan(1e-7);
      }
    });
  }
});
