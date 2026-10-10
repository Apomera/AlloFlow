const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const candidatePath = path.join(__dirname, 'candidate.js'), beforePath = path.join(__dirname, 'before.js');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const candidate = fs.readFileSync(candidatePath, 'utf8'), before = fs.readFileSync(beforePath, 'utf8');
const inputs = Object.fromEntries([candidatePath, beforePath, __filename, path.join(repo, 'vendor/three-r128/three.min.js')].map(file => [file, hash(fs.readFileSync(file))]));
assert.equal(hash(before), '164407bb58546fc91584761e51e9a907d2eacd33442a0a5fae31da0c22ef37c0');
const THREE = {};
new Function('exports', 'module', fs.readFileSync(path.join(repo, 'vendor/three-r128/three.min.js'), 'utf8'))(THREE, { exports: THREE });
let assertions = 0;
const check = (value, message) => { assertions++; assert.ok(value, message); };
const equal = (a, b, message) => { assertions++; assert.deepEqual(a, b, message); };
function capture(source) {
  let config;
  const calls = { focus: [], reset: 0, nudge: [] };
  const viewer = { focus(id, options) { calls.focus.push([id, options]); return true; }, reset() { calls.reset++; }, nudge(...args) { calls.nudge.push(args); } };
  const scope = { StemLab: { isRegistered: () => false, registerTool() {}, makeBayViewer(value) { config = value; return viewer; } } };
  const anchor = '  var FR_NULL_VIEWER = {';
  assert.equal(source.split(anchor).length, 2);
  const probe = `  window.__supportFrame = { focus: focusSupportingHand, camera: palmDetailCamera, mount: function(width,height) { frHandInspectionNode={clientWidth:width,clientHeight:height}; } };\n`;
  new Function('window', source.replace(anchor, probe + anchor))(scope);
  return { config, calls, probe: scope.__supportFrame };
}
function build(runtime, age, phase, contrast) {
  const scene = new THREE.Scene();
  const content = runtime.config.buildScene(THREE, { scene, phase, dark: true, contrast, wantShadow: false,
    trim: (color, shininess) => new THREE.MeshPhongMaterial({ color, shininess: shininess == null ? 30 : shininess, specular: 0x6b7688 }),
    sceneProps: { age, tab: 'recovery', recoveryGuides: true } });
  const sample = () => { content.frame(0, {}, true); scene.updateMatrixWorld(true); };
  sample();
  return { runtime, scene, content, sample };
}
function dispose(model) {
  const resources = new Set();
  model.scene.traverse(object => { if (object.geometry) resources.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) resources.add(material); });
  for (const resource of resources) resource.dispose();
}
function fingerprint(model) {
  const h = crypto.createHash('sha256'), geometries = new Set(), materials = new Set();
  let nodes = 0, meshes = 0;
  const json = value => JSON.stringify(value, (key, value) => key === 'uuid' || key === 'faceFrame' ? undefined : value);
  function visit(object, location) {
    nodes++; if (object.isMesh) meshes++;
    h.update(json([location, object.type, object.name, object.visible, object.matrix.toArray(), object.matrixWorld.toArray(), object.castShadow, object.receiveShadow, object.renderOrder, object.layers.mask, object.userData]));
    if (object.geometry) {
      const g = object.geometry; geometries.add(g); h.update(json([g.type, g.parameters, g.drawRange, g.groups]));
      for (const key of Object.keys(g.attributes).sort()) { const a = g.attributes[key]; h.update(json([key, a.itemSize, a.normalized, a.count, a.array.constructor.name])); h.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength)); }
      if (g.index) { const a = g.index.array; h.update(a.constructor.name); h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)); }
    }
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) { materials.add(material); h.update(json(material.toJSON())); h.update(String(material.onBeforeCompile)); h.update(String(material.customProgramCacheKey)); }
    object.children.forEach((child, index) => visit(child, location + '.' + index));
  }
  visit(model.scene, 'scene');
  const resources = { nodes, meshes, geometries: geometries.size, materials: materials.size, picks: model.content.picks.map(o => o.name), meshKeys: Object.keys(model.content.meshes).sort() };
  h.update(json(resources));
  return { SHA256: h.digest('hex'), resources };
}
function vertices(root) {
  const points = [];
  root.traverse(object => { const p = object.geometry?.attributes.position; if (p) for (let i = 0; i < p.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(object.matrixWorld)); });
  return points;
}
function infoOf(model) { return model.content.meshes.supportingHand.userData.inspection; }
function assertMetadata(prior, current) {
  const info = infoOf(current), { faceFrame, ...original } = info;
  equal(original, infoOf(prior), 'original hand sphere, normal, forward and five cheek points stay exact');
  equal(Object.keys(faceFrame).sort(), ['center', 'radius'], 'only numeric center and radius in faceFrame');
  check(Array.isArray(faceFrame.center) && faceFrame.center.length === 3 && faceFrame.center.every(Number.isFinite), 'finite head frame center');
  check(Number.isFinite(faceFrame.radius) && faceFrame.radius > 0, 'finite positive head frame radius');
  const hand = current.scene.getObjectByName('fr-patient-right-hand'), head = current.scene.getObjectByName('fr-manikin-head-pivot');
  equal(current.content.meshes.supportingHand, hand, 'same existing hand alias');
  const box = new THREE.Box3().setFromObject(hand);
  info.context.forEach(point => box.expandByPoint(new THREE.Vector3().fromArray(point)));
  box.union(new THREE.Box3().setFromObject(head));
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const points = { hand: vertices(hand), head: vertices(head), cheek: info.context.map(point => new THREE.Vector3().fromArray(point)) };
  let radiusSq = 0;
  for (const point of points.hand.concat(points.head, points.cheek)) radiusSq = Math.max(radiusSq, point.distanceToSquared(sphere.center));
  sphere.radius = Math.sqrt(radiusSq);
  equal(faceFrame, { center: sphere.center.toArray(), radius: sphere.radius }, 'face frame equals actual posed head and original support bounds');
  check(faceFrame.radius >= info.radius, 'head-inclusive radius is at least original hand radius');
  return points;
}
function fitted(model, aspect) {
  const runtime = model.runtime;
  runtime.probe.mount(aspect * 1000, 1000);
  check(runtime.probe.focus(), 'focus succeeds at aspect ' + aspect);
  const [id, options] = runtime.calls.focus.at(-1), [yawDelta, pitchDelta] = runtime.calls.nudge.at(-1), home = runtime.config.home;
  equal(id, 'supportingHand', 'focus uses original supporting hand alias');
  check(options.immediate && !('padding' in options), 'same immediate explicit-distance focus contract');
  check(Number.isFinite(options.distance) && options.distance >= .8 - 1e-9 && options.distance <= home.dist, 'distance respects viewer limits');
  const yaw = home.yaw + yawDelta, pitch = home.pitch + pitchDelta;
  check(Number.isFinite(yaw) && pitch >= .12 && pitch <= 1.35, 'finite angle respects viewer pitch limits');
  const target = new THREE.Vector3(options.target.x, options.target.y, options.target.z), camera = new THREE.PerspectiveCamera(42, aspect, .1, 100);
  camera.position.copy(target).sub(new THREE.Vector3(home.target.x, home.target.y, home.target.z)).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch) * options.distance, Math.sin(pitch) * options.distance, Math.cos(yaw) * Math.cos(pitch) * options.distance));
  camera.lookAt(target); camera.updateMatrixWorld(true);
  return { camera, target, call: { id, options, yawDelta, pitchDelta } };
}
function assertProjection(points, camera, name) {
  let maxX = 0, maxY = 0, nearest = -Infinity, lowZ = Infinity, highZ = -Infinity;
  for (const point of points) {
    const p = point.clone().project(camera);
    maxX = Math.max(maxX, Math.abs(p.x)); maxY = Math.max(maxY, Math.abs(p.y)); lowZ = Math.min(lowZ, p.z); highZ = Math.max(highZ, p.z);
    nearest = Math.max(nearest, point.clone().applyMatrix4(camera.matrixWorldInverse).z);
  }
  check(maxX < .94 && maxY < .94, name + ' complete projected bounds fit with margin');
  check(nearest < -.105 && lowZ > -1 && highZ < 1, name + ' clears near/far planes');
  return { vertices: points.length, maxX, maxY, nearest, lowZ, highZ };
}
function verifyPair(prior, current, caseId) {
  const preserved = fingerprint(current); equal(preserved, fingerprint(prior), caseId + ' scene geometry/material/pose/metadata/resource preservation');
  const points = assertMetadata(prior, current), info = infoOf(current), projections = [];
  for (const aspect of [.5, .8, 1, 1.1499, 1.15, 1.5, 2]) {
    const fit = fitted(current, aspect), previous = fitted(prior, aspect), expected = aspect < 1.15 ? info.faceFrame : info;
    equal(fit.target.toArray(), expected.center, 'correct frame selected at aspect ' + aspect);
    if (aspect >= 1.15) equal(fit.call, previous.call, 'wide fit remains byte-for-byte numeric exact');
    const row = { aspect, hand: assertProjection(points.hand.concat(points.cheek), fit.camera, 'hand and cheek') };
    if (aspect < 1.15) row.head = assertProjection(points.head, fit.camera, 'head');
    check(fit.camera.position.clone().sub(fit.target).normalize().dot(new THREE.Vector3().fromArray(info.normal)) > .8, 'palm orientation retained');
    projections.push(row);
  }
  const savedInfo = JSON.stringify(info), metadataRef = info, frameRef = info.faceFrame, centerRef = info.faceFrame.center;
  const runtime = current.runtime;
  for (const aspect of [.8, 1.5, .5, 2, 1]) {
    runtime.probe.mount(aspect * 1000, 1000);
    const count = runtime.calls.focus.length;
    current.sample();
    equal(runtime.calls.focus.length, count + 1, 'resize refits exactly once');
    equal(Object.values(runtime.calls.focus.at(-1)[1].target), (aspect < 1.15 ? info.faceFrame : info).center, 'resize switches fitting frame');
    current.sample(); equal(runtime.calls.focus.length, count + 1, 'unchanged size does not refit');
  }
  check(infoOf(current) === metadataRef, 'inspection reference retained');
  check(info.faceFrame === frameRef && info.faceFrame.center === centerRef, 'numeric frame is reused on refit');
  equal(JSON.stringify(info), savedInfo, 'metadata stable through frames and resize');
  equal(fingerprint(current), preserved, 'render/refit preserves all scene resources and surfaces');
  return { caseId, preservation: preserved, faceFrame: info.faceFrame, projections };
}
const rows = [], negative = [], errors = [];
const currentRuntime = capture(candidate), priorRuntime = capture(before);
try {
  for (const age of ['adult', 'child', 'infant']) for (const phase of [3, 4, 5, 6, 7, 8]) for (const contrast of [false, true]) {
    let prior, current;
    try { prior = build(priorRuntime, age, phase, contrast); current = build(currentRuntime, age, phase, contrast); rows.push(verifyPair(prior, current, `${age}:${phase}:${contrast}`)); }
    finally { if (prior) dispose(prior); if (current) dispose(current); }
    console.log(JSON.stringify({ case: rows.at(-1).caseId, passed: true }));
  }
  if (process.argv.includes('--selftest')) {
    const mutationPath = path.join(__dirname, 'selftest-source.js'), saved = Buffer.from(candidate);
    for (const defect of [
      { name: 'ignore-head-frame', from: 'aspect < 1.15 && info.faceFrame', to: 'false && info.faceFrame', expected: 'correct frame selected' },
      { name: 'shrink-head-frame', from: 'radius: supportFaceSphere.radius', to: 'radius: supportFaceSphere.radius * .1', expected: 'face frame equals' },
    ]) {
      equal(candidate.split(defect.from).length, 2, 'unique mutation anchor');
      fs.writeFileSync(mutationPath, candidate.replace(defect.from, defect.to));
      let rejected = false, error = '', prior, mutated;
      try {
        const runtime = capture(fs.readFileSync(mutationPath, 'utf8'));
        prior = build(capture(before), 'infant', 8, false); mutated = build(runtime, 'infant', 8, false);
        verifyPair(prior, mutated, defect.name);
      } catch (e) { rejected = e.message.includes(defect.expected); error = e.message; }
      finally { if (prior) dispose(prior); if (mutated) dispose(mutated); fs.writeFileSync(mutationPath, saved); equal(fs.readFileSync(mutationPath), saved, 'saved mutation source restored and reread byte-for-byte'); }
      check(rejected, defect.name + ' defect must be rejected for the intended reason');
      negative.push({ name: defect.name, rejected, error, restoredSHA256: hash(fs.readFileSync(mutationPath)) });
    }
  }
} catch (e) { errors.push(e.stack); console.error(e.stack); }
for (const [file, pin] of Object.entries(inputs)) equal(hash(fs.readFileSync(file)), pin, 'input unchanged: ' + file);
const report = { passed: !errors.length, assertions, beforeSHA256: hash(before), candidateSHA256: hash(candidate), checkerSHA256: inputs[__filename], inputs, negative, errors, cases: rows };
fs.writeFileSync(path.join(__dirname, 'support-frame-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, assertions, cases: rows.length, selftests: negative.length, candidateSHA256: hash(candidate) }));
if (errors.length) process.exitCode = 1;
