import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { parseExpressionAt } from 'acorn';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const THREE = vendor.THREE;
function expression(start) {
  if (start < 0) throw new Error('Required grapple integration is absent');
  const node = parseExpressionAt(source, start, { ecmaVersion: 'latest' });
  return source.slice(node.start, node.end);
}
function namedFunction(name) { return expression(source.indexOf('function ' + name + '(')); }
const geometryFactory = new Function('return ' + namedFunction('issArmHandGeometry'))();
const capture = new Function('return ' + namedFunction('issGrappleCapture'))();
const armMath = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn {pose:issMapArmPose,target:issMapArmTarget,step:issMapArmStep};')();
const resources = new Set();
function keep(resource) {
  if (!resources.has(resource)) {
    resources.add(resource);
    resource.addEventListener('dispose', () => resources.delete(resource));
  }
  return resource;
}
afterEach(() => { for (const resource of [...resources]) resource.dispose(); });
function triangles(geometry) {
  const p = geometry.getAttribute('position'), index = geometry.index;
  const count = index ? index.count : p.count, result = [];
  for (let i = 0; i < count; i += 3) result.push([0, 1, 2].map(offset =>
    new THREE.Vector3().fromBufferAttribute(p, index ? index.getX(i + offset) : i + offset)));
  return result;
}
function inspectGeometry() {
  const tubes = [], boxes = [];
  const instrumented = new Proxy(THREE, { get(target, name) {
    if (name === 'TubeGeometry') return function (...args) {
      const geometry = new THREE.TubeGeometry(...args);
      tubes.push({ curve: args[0], segments: args[1], radius: args[2], positions: Array.from(geometry.getAttribute('position').array) });
      return geometry;
    };
    if (name === 'BoxGeometry') return function (...args) {
      const geometry = new THREE.BoxGeometry(...args); boxes.push(args); return geometry;
    };
    return target[name];
  } });
  return { geometry: keep(geometryFactory(instrumented)), tubes, boxes };
}

describe('robotic hand geometry', () => {
  it('returns fresh finite vertex-coloured geometry inside the existing hand envelope', () => {
    const geometry = keep(geometryFactory(THREE)), second = keep(geometryFactory(THREE));
    expect(geometry.isBufferGeometry).toBe(true); expect(geometry).not.toBe(second);
    expect(geometry.index).toBeNull();
    const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), c = geometry.getAttribute('color');
    expect(p.count % 3).toBe(0); expect(p.count).toBeGreaterThan(100);
    expect(p.count / 3).toBeLessThan(3000);
    expect(n.count).toBe(p.count); expect(c.count).toBe(p.count);
    for (const a of [p, n, c]) expect(Array.from(a.array).every(Number.isFinite)).toBe(true);
    for (let i = 0; i < p.count; i++) {
      expect(Math.hypot(p.getX(i), p.getZ(i))).toBeLessThanOrEqual(.07500001);
      expect(Math.abs(p.getY(i))).toBeLessThanOrEqual(.08000001);
      expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
    }
    expect(Array.from(c.array).every(value => value >= 0 && value <= 1)).toBe(true);
    expect(new Set(Array.from({ length: c.count }, (_, i) => [c.getX(i), c.getY(i), c.getZ(i)].join(','))).size).toBeGreaterThanOrEqual(3);
    const unchanged = second.getAttribute('position').getX(0);
    p.setX(0, 10);
    expect(second.getAttribute('position').getX(0)).toBe(unchanged);
    expect(second.getAttribute('color').array).not.toBe(c.array);
  });

  it('leaves the +Y mouth open to a recessed backplate instead of a solid front cap', () => {
    const geometry = keep(geometryFactory(THREE));
    const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true }));
    const mesh = new THREE.Mesh(geometry, material); mesh.updateMatrixWorld(true);
    const hitAt = (x, z) => new THREE.Raycaster(new THREE.Vector3(x, .5, z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)[0];
    const samples = [[0, 0]];
    for (const radius of [.008, .02, .028]) for (let i = 0; i < 8; i++) samples.push([radius * Math.cos(i * Math.PI / 4), radius * Math.sin(i * Math.PI / 4)]);
    for (const [x, z] of samples) {
      const hit = hitAt(x, z);
      expect(hit).toBeDefined();
      expect(hit.point.y).toBeCloseTo(.004, 7);
      expect(.08 - hit.point.y).toBeGreaterThan(.075);
      expect(hit.face.normal.y).toBeGreaterThan(.9);
    }
    const rim = hitAt(.07, 0);
    expect(rim).toBeDefined(); expect(rim.point.y).toBeGreaterThan(.05);
    // A front face across the central opening would fail the ray-depth checks,
    // even if every one of its vertices sat on the annular rim.
    expect(triangles(geometry).length).toBeGreaterThan(50);
  });

  it('batches exactly three finite snare tubes around the clear centre and four latch housings', () => {
    const { tubes, boxes } = inspectGeometry();
    expect(tubes).toHaveLength(3); expect(boxes).toHaveLength(4);
    for (const tube of tubes) {
      expect(tube.radius).toBeGreaterThan(0); expect(tube.radius).toBeLessThan(.004);
      expect(tube.positions.every(Number.isFinite)).toBe(true);
      for (let i = 0; i <= 48; i++) {
        const p = tube.curve.getPoint(i / 48);
        expect([p.x, p.y, p.z].every(Number.isFinite)).toBe(true);
        expect(p.y).toBeCloseTo(.048, 10);
        expect(Math.hypot(p.x, p.z) - tube.radius).toBeGreaterThan(.012);
        expect(Math.hypot(p.x, p.z) + tube.radius).toBeLessThan(.075);
      }
    }
    for (let i = 0; i < 3; i++) {
      const a = tubes[i].curve.getPoint(.5), b = tubes[(i + 1) % 3].curve.getPoint(.5);
      expect((a.x * b.x + a.z * b.z) / (Math.hypot(a.x, a.z) * Math.hypot(b.x, b.z))).toBeCloseTo(-.5, 10);
      expect(tubes[i].curve.getPoint(1).distanceTo(tubes[(i + 1) % 3].curve.getPoint(0))).toBeLessThan(1e-12);
    }
  });

  it('preserves all eight pre-existing arm physics helpers exactly apart from line endings', () => {
    // Fingerprints from source-before.js SHA256
    // 621c42c8681be94d5a5c68f1a90f815f49e57943a5bbbcc973fee71d5fffc7df.
    // These permanent fixtures do not depend on ignored local evidence files.
    const expected = {
      issMapArmPose: '2fd95b2566b54de6ef723019a538293ee417de334ca80bce8c9d2b1b5596be0d',
      issMapArmTarget: 'fe7e0c35d1a2e5042b3f53593356fe5640849c3f79454351c31fd3054e774217',
      issMapArmStep: 'b33cc9a182fcefe964cff6969104abede7df992f8261438f3381b88ed2ef5053',
      issMapArmBrakePlan: 'bde291a1dd4bb574101fc42daa18f5dda9ff5a454fb04060e30c1f72e63c7ce7',
      issMapArmMotion: 'c828c53ce249055fec144c4616e88ac0a894e03e5a29cfa160f19f7c5ecd95d2',
      issMapArmComparison: 'c696735e53803131341439cdc9e5a8c3983bd63fe97b46c83ea5f92a1f3107ad',
      issMapArmForecast: '17d6960f328ee40fceb34410a9e25234bfdbb34326777341b6bf9d1f9db6bc41',
      issMapArmForecastAt: 'a0713b2298f610700e3085e62b8e57ecff1e585962a8ccc801c2b020ba59c17d'
    };
    for (const [name, hash] of Object.entries(expected)) {
      expect(createHash('sha256').update(namedFunction(name).replace(/\r\n/g, '\n')).digest('hex'), name).toBe(hash);
    }
  });
});

describe('conceptual grapple capture sequence', () => {
  it('keeps all three cables outside the probe with finite paths at every stage', () => {
    for (const stage of [0, 1, 2]) {
      const state = capture(stage);
      expect(state.stage).toBe(stage); expect(state.cables).toHaveLength(3);
      expect(state.probeRadius).toBe(9);
      state.cables.forEach(cable => {
        expect(cable.points).toHaveLength(49);
        expect(cable.path).toMatch(/^M/); expect(cable.path).not.toMatch(/NaN|Infinity/);
        for (const p of cable.points) {
          expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
          expect(Math.hypot(p.x - 145, p.y - 135)).toBeGreaterThanOrEqual(state.probeRadius + 2);
        }
        expect(Math.min(...cable.points.map(p => Math.hypot(p.x - 145, p.y - 135)))).toBeCloseTo(state.aperture, 10);
        for (const p of [cable.points[0], cable.points[48]]) expect(Math.hypot(p.x - 145, p.y - 135)).toBeCloseTo(70, 10);
      });
    }
  });

  it('closes the snares before retracting the captured probe and carriage together', () => {
    const align = capture(0), snare = capture(1), seat = capture(2);
    expect([align.id, snare.id, seat.id]).toEqual(['align', 'snare', 'seat']);
    expect([align.aperture, snare.aperture, seat.aperture]).toEqual([44, 12, 12]);
    expect([align.headX, snare.headX, seat.headX]).toEqual([564, 492, 470]);
    expect([align.carriageX, snare.carriageX, seat.carriageX]).toEqual([514, 514, 492]);
    for (const state of [align, snare, seat]) expect(state.flangeX - state.headX).toBe(60);
    expect(snare.headX - seat.headX).toBe(snare.carriageX - seat.carriageX);
    expect(snare.cables).toEqual(seat.cables);
    expect(align.cables).not.toEqual(snare.cables);
  });

  it('clamps malformed stages and returns detached finite snapshots', () => {
    for (const value of [undefined, null, NaN, Infinity, -100, 100, 'bad', 1.6]) {
      const state = capture(value);
      expect([0, 1, 2]).toContain(state.stage);
      for (const cable of state.cables) for (const point of cable.points) expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
    }
    const input = Object.freeze({ stage: 1 });
    capture(input); expect(input).toEqual({ stage: 1 });
    const a = capture(1), b = capture(1), firstX = b.cables[0].points[0].x;
    a.cables[0].points[0].x = 999;
    expect(b.cables[0].points[0].x).toBe(firstX);
    expect(capture(1)).toEqual(b);
  });
});

const assemblyStart = source.indexOf('          var armMat =');
const assemblyEnd = source.indexOf('          function updateArm()', assemblyStart);
if (assemblyStart < 0 || assemblyEnd < assemblyStart) throw new Error('Robotic arm assembly block missing');
function armFixture() {
  const context = {
    THREE, ISS_TRUSS_Y: .9, scene: new THREE.Scene(), station: new THREE.Group(),
    moduleDetails: [], moduleCapPickers: [], cv: { closest: () => null }, cameraFocusId: null,
    issArmHandGeometry: geometryFactory, issMapArmPose: armMath.pose, issMapArmTarget: armMath.target,
    syncArmPreview: vi.fn(), syncGrappleCamera: vi.fn(), _lastFrameSig: ''
  };
  context.scene.add(context.station);
  runInNewContext(source.slice(assemblyStart, assemblyEnd), context);
  runInNewContext(namedFunction('updateArm'), context);
  context.scene.updateMatrixWorld(true);
  context.scene.traverse(object => {
    if (object.geometry) keep(object.geometry);
    if (object.material) keep(object.material);
  });
  return context;
}

describe('robotic hand renderer integration', () => {
  it('keeps the boom dimensions and hand origin while smoothing their cylindrical faces', () => {
    const context = armFixture();
    for (const [mesh, length, radius] of [[context.arm1, 1.4, .05], [context.arm2, 1.2, .045]]) {
      expect(mesh.geometry.parameters.height).toBe(length);
      expect(mesh.geometry.parameters.radiusTop).toBe(radius);
      expect(mesh.geometry.parameters.radiusBottom).toBe(radius);
      expect(mesh.geometry.parameters.radialSegments).toBe(24);
    }
    expect(context.armHand.name).toBe('iss-arm-hand');
    expect(context.armHand.position.distanceTo(context.armTip)).toBeLessThan(1e-12);
    expect(context.armHand.rotation.z).toBe(context.armAngle2);
    expect(context.armHand._issScienceId).toBe('grapple');
    expect(context.moduleCapPickers).toContain(context.armHand);
    expect(context.moduleDetails).not.toContain(context.armHand);
    expect(context.armHand.material.isMeshStandardMaterial).toBe(true);
    expect(context.armHand.material.vertexColors).toBe(true);
    expect(context.armHand.material.emissive.getHex()).toBe(0);
    expect(context.armHand.material).not.toBe(context.armMat);
    expect(context.armHand.material).not.toBe(context.armJointMat);
    for (const [key, value] of Object.entries(context.armHand.material)) if (/Map$/.test(key) || key === 'map') expect(value, key).toBeNull();
  });

  it('places the hand at the same actual tip through both joint branches and representation seams', () => {
    const context = armFixture();
    for (const [shoulder, elbow] of [[0, 0], [90, -90], [-90, 90], [179, -179], [-179, 179], [47.25, -123.5]]) {
      context.armActual = { ...context.armActual, shoulder, elbow };
      context.updateArm();
      const pose = armMath.pose(context.armActual), tip = new THREE.Vector3().fromArray(pose.tip).add(context.armBase);
      expect(context.armHand.position.distanceTo(tip)).toBeLessThan(1e-12);
      expect(context.armHand.rotation.z).toBeCloseTo((shoulder + elbow) * Math.PI / 180, 12);
      expect(context.arm1.position.distanceTo(context.armBase.clone().add(new THREE.Vector3().fromArray(pose.joint).multiplyScalar(.5)))).toBeLessThan(1e-12);
      expect(context.arm2.position.distanceTo(context.armBase.clone().add(new THREE.Vector3().fromArray(pose.joint).add(new THREE.Vector3().fromArray(pose.tip)).multiplyScalar(.5)))).toBeLessThan(1e-12);
    }
  });

  it('raycasts the recessed mouth and uses the science-inspection branch without discovery writes', () => {
    const context = armFixture();
    context.station.rotation.set(.25, -.3, .18); context.scene.updateMatrixWorld(true);
    const center = context.armHand.getWorldPosition(new THREE.Vector3());
    const outward = new THREE.Vector3(0, 1, 0).applyQuaternion(context.armHand.getWorldQuaternion(new THREE.Quaternion()));
    const camera = new THREE.PerspectiveCamera(46, 1.6, .001, 100);
    camera.up.set(0, 0, 1); camera.position.copy(center).addScaledVector(outward, .5); camera.lookAt(center); camera.updateMatrixWorld(true);
    Object.assign(context, { camera, dragTravel: 0, gestureMultiple: false, clickable: [], visitorPickers: [],
      mouseV: new THREE.Vector2(), raycaster: new THREE.Raycaster(), onLeave: vi.fn(), upd: vi.fn(),
      markSeen: vi.fn(), awardXP: vi.fn(), MODULES: [], announceToSR: vi.fn() });
    context.cv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
    context.cv._issFitCamera = vi.fn();
    context.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    // Include the complete visible physical arm, including the unchanged
    // forearm cap at the hand origin. The carriage must occlude that cap.
    const hits = context.raycaster.intersectObjects(context.station.children.filter(object => object.isMesh), true);
    expect(hits[0].object).toBe(context.armHand);
    expect(context.armHand.worldToLocal(hits[0].point.clone()).y).toBeCloseTo(.004, 7);
    runInNewContext(namedFunction('pick') + '\npick({clientX:400,clientY:250,button:0});', context);
    expect(context.cv._issFitCamera).toHaveBeenCalledExactlyOnceWith('grapple');
    expect(context.onLeave).toHaveBeenCalled();
    expect(context.upd).not.toHaveBeenCalled(); expect(context.markSeen).not.toHaveBeenCalled(); expect(context.awardXP).not.toHaveBeenCalled();
  });

  it('releases the private hand geometry and material with normal scene cleanup', () => {
    const context = armFixture(), disposed = [];
    for (const resource of [context.armHand.geometry, context.armHand.material]) resource.addEventListener('dispose', () => disposed.push(resource.uuid));
    const start = source.indexOf('var geometries = new Set()', assemblyEnd);
    const end = source.indexOf('renderer.dispose();', start) + 'renderer.dispose();'.length;
    if (start < 0 || end < start) throw new Error('Station resource cleanup missing');
    context.planetScene = new THREE.Scene(); context.renderer = { dispose: vi.fn() };
    runInNewContext(source.slice(start, end), context);
    expect(disposed).toHaveLength(2); expect(new Set(disposed).size).toBe(2);
    expect(context.renderer.dispose).toHaveBeenCalledOnce();
  });
});

const cameraMath = new Function(['issFlightNumber', 'issMapCameraPose', 'issMapCameraPan', 'issMapCameraFit'].map(namedFunction).join('\n') +
  '\nreturn {pose:issMapCameraPose,pan:issMapCameraPan,fit:issMapCameraFit};')();
function cameraFixture(aspect = 1.6) {
  const context = armFixture();
  const module = new THREE.Mesh(keep(new THREE.SphereGeometry(.5, 12, 8)), keep(new THREE.MeshStandardMaterial()));
  module._issId = 'unity'; context.station.add(module);
  Object.assign(context, {
    camera: new THREE.PerspectiveCamera(46, aspect, .01, 1000), cameraTarget: new THREE.Vector3(0, 0, 1),
    cameraFocusId: null, cameraFitMode: null, cameraFitResult: null, cameraTween: null,
    cameraPanned: false, cameraView: 'overview', cameraMinDistance: 3.2, cameraMaxDistance: 30,
    cleaned: false, _prefersReducedMotion: true, Hc: 500,
    visitorTargets: Object.create(null), radiatorTargets: Object.create(null),
    stationEnvelope: { center: new THREE.Vector3(0, 1, 0), radius: 9 },
    wings: [{}, {}, { position: new THREE.Vector3(4, 2, -1) }], arrayFocus: { visible: false },
    armVelocity: { enabled: false }, clickable: [module], MODULES: [{ id: 'unity', name: 'Unity' }],
    finishJointDrag: vi.fn(), finishArmDrag: vi.fn(), finishMotionDrag: vi.fn(),
    onUp: vi.fn(), onLeave: vi.fn(), syncCameraHUD: vi.fn(), announceToSR: vi.fn(), upd: vi.fn(),
    __alloT: (key, fallback) => fallback,
    __alloFill: (text, values) => text.replace(/\{([^}]+)\}/g, (_, key) => String(values[key])),
    issMapCameraPose: cameraMath.pose, issMapCameraPan: cameraMath.pan, issMapCameraFit: cameraMath.fit
  });
  context.cv._issWantSel = 'unity'; context.camera.position.set(8, 4, 10);
  runInNewContext(['applyCameraPose', 'updateGrappleEnvelope', 'syncGrappleCamera', 'settleCameraFit',
    'cancelCameraTween', 'moveCamera', 'onKey'].map(namedFunction).join('\n'), context);
  for (const key of ['_issCameraOrbit', '_issCameraZoom', '_issCameraPan', '_issSetView', '_issFitCamera', '_issFocusModule']) {
    const start = source.indexOf('cv.' + key + ' = function');
    runInNewContext('cv.' + key + ' = ' + expression(source.indexOf('function', start)) + ';', context);
  }
  return context;
}
function handFrameOffset(context) {
  const frame = context.armHand.getWorldQuaternion(new THREE.Quaternion());
  return context.camera.position.clone().sub(context.cameraTarget).applyQuaternion(frame.invert());
}
function actualHandSphere(context) {
  context.station.updateMatrixWorld(true);
  return context.armHand.geometry.boundingSphere.clone().applyMatrix4(context.armHand.matrixWorld);
}

describe('moving grapple inspection camera', () => {
  it('frames the geometric hand sphere from its +Y mouth with the bounded close range', () => {
    for (const aspect of [1.6, .7]) {
      const context = cameraFixture(aspect), before = JSON.stringify(context.armActual);
      context.station.rotation.set(.25, -.3, .18);
      context.cv._issFitCamera('grapple');
      const sphere = actualHandSphere(context);
      expect(context.cameraTarget.distanceTo(sphere.center)).toBeLessThan(1e-12);
      expect(context.cameraFitResult.radius).toBeCloseTo(sphere.radius, 12);
      expect(context.cameraMinDistance).toBe(.5); expect(context.cameraMaxDistance).toBe(1.8);
      expect(context.cameraFocusId).toBe('grapple'); expect(context.cameraFitMode).toBe('grapple');
      expect(context.cameraTween).toBeNull(); expect(context.arrayFocus.visible).toBe(false);
      expect(handFrameOffset(context).normalize().y).toBeGreaterThan(.9);
      context.cv._issCameraZoom(.001);
      expect(context.camera.position.distanceTo(context.cameraTarget)).toBeCloseTo(.5, 12);
      context.cv._issCameraZoom(1000);
      expect(context.camera.position.distanceTo(context.cameraTarget)).toBeCloseTo(1.8, 12);
      expect(JSON.stringify(context.armActual)).toBe(before); expect(context.upd).not.toHaveBeenCalled();
    }
  });

  it('follows the actual moving and rotating hand while preserving the chosen offset in hand coordinates', () => {
    const context = cameraFixture();
    context.cv._issFitCamera('grapple'); context.cv._issCameraOrbit(.3, -.2); context.cv._issCameraZoom(1.4);
    const localOffset = handFrameOffset(context), distance = context.camera.position.distanceTo(context.cameraTarget);
    for (const [shoulder, elbow, stationAngle] of [[30, -40, .2], [-70, 90, -.4], [179, -179, .6], [-179, 179, -.3]]) {
      context.armActual = { ...context.armActual, shoulder, elbow };
      context.station.rotation.set(stationAngle, -.2, .15);
      context.updateArm();
      const sphere = actualHandSphere(context);
      expect(context.cameraTarget.distanceTo(sphere.center)).toBeLessThan(1e-12);
      expect(handFrameOffset(context).distanceTo(localOffset)).toBeLessThan(1e-11);
      expect(context.camera.position.distanceTo(context.cameraTarget)).toBeCloseTo(distance, 11);
      expect(context.armActual.shoulder).toBe(shoulder); expect(context.armActual.elbow).toBe(elbow);
      const eye = context.camera.position.clone(); context.syncGrappleCamera();
      expect(context.camera.position.toArray()).toEqual(eye.toArray());
    }
  });

  it('keeps adversarial close orbits outside the mouth and preserves follow after manual orbit and zoom', () => {
    const context = cameraFixture(); context.cv._issFitCamera('grapple');
    for (let i = 0; i < 90; i++) {
      context.cv._issCameraOrbit(i % 2 ? .7 : -.4, i < 45 ? -.09 : .09);
      const offset = handFrameOffset(context);
      expect(offset.y).toBeGreaterThanOrEqual(.08 * offset.length() - 1e-11);
      expect(context.cameraFocusId).toBe('grapple');
      expect(context.camera.position.distanceTo(context.cameraTarget)).toBeCloseTo(.5, 11);
      expect(context.camera.position.y).toBeGreaterThanOrEqual(-3.8 - 1e-11);
    }
    const before = handFrameOffset(context);
    context.camera.aspect = .7; context.camera.updateProjectionMatrix(); context.cv._issFitCamera('grapple', true);
    expect(handFrameOffset(context).normalize().distanceTo(before.normalize())).toBeLessThan(1e-11);
  });

  it('follows orientation-only and translation-only changes rather than requiring both', () => {
    const context = cameraFixture(); context.cv._issFitCamera('grapple');
    const offset = handFrameOffset(context);
    const setPose = pose => { context.armActual = { ...context.armActual, shoulder: pose.shoulder, elbow: pose.elbow }; context.updateArm(); };
    const branchA = armMath.target({ x: .7, y: 1.4, branch: -1 }), branchB = armMath.target({ x: .7, y: 1.4, branch: 1 });
    setPose(branchA);
    const center = actualHandSphere(context).center.clone(), frame = context.armHand.getWorldQuaternion(new THREE.Quaternion());
    setPose(branchB);
    expect(actualHandSphere(context).center.distanceTo(center)).toBeLessThan(1e-12);
    expect(1 - Math.abs(frame.dot(context.armHand.getWorldQuaternion(new THREE.Quaternion())))).toBeGreaterThan(.01);
    expect(handFrameOffset(context).distanceTo(offset)).toBeLessThan(1e-11);
    setPose({ shoulder: 20, elbow: -80 });
    const translatedFrom = actualHandSphere(context).center.clone(), sameFrame = context.armHand.getWorldQuaternion(new THREE.Quaternion());
    setPose({ shoulder: 45, elbow: -105 });
    expect(actualHandSphere(context).center.distanceTo(translatedFrom)).toBeGreaterThan(.1);
    expect(1 - Math.abs(sameFrame.dot(context.armHand.getWorldQuaternion(new THREE.Quaternion())))).toBeLessThan(1e-14);
    expect(context.cameraTarget.distanceTo(actualHandSphere(context).center)).toBeLessThan(1e-12);
    expect(handFrameOffset(context).distanceTo(offset)).toBeLessThan(1e-11);
  });

  it('hides only construction overlays during close inspection and restores their saved visibility choices', () => {
    const context = cameraFixture();
    Object.assign(context, { armEnabled: true, armPreview: { seconds: 30 }, armPreviewGroup: new THREE.Group(),
      armVelocity: { enabled: true }, armVelocityGroup: new THREE.Group(), armBrakeShowPath: true, armBrakeGroup: new THREE.Group(),
      armReference: { shoulder: 80, elbow: -90 }, armReferenceShow: true, armReferenceGroup: new THREE.Group() });
    const original = JSON.stringify([context.armActual, context.armTarget, context.armElapsed, context.armPreview, context.armReference]);
    runInNewContext(namedFunction('syncArmInspectionVisibility'), context);
    context.cameraFocusId = 'grapple'; context.syncArmInspectionVisibility();
    for (const group of [context.armOverlay, context.armPreviewGroup, context.armVelocityGroup, context.armBrakeGroup, context.armReferenceGroup]) expect(group.visible).toBe(false);
    expect(JSON.stringify([context.armActual, context.armTarget, context.armElapsed, context.armPreview, context.armReference])).toBe(original);
    context.cameraFocusId = 'arm'; context.syncArmInspectionVisibility();
    for (const group of [context.armOverlay, context.armPreviewGroup, context.armVelocityGroup, context.armReferenceGroup]) expect(group.visible).toBe(true);
    expect(context.armBrakeGroup.visible).toBe(false); // Preview remains the selected source.
    context.armPreview = null; context.armReferenceShow = false; context.syncArmInspectionVisibility();
    expect(context.armPreviewGroup.visible).toBe(false); expect(context.armBrakeGroup.visible).toBe(true); expect(context.armReferenceGroup.visible).toBe(false);
  });

  it('leaves follow after Pan, Home, F or Fit arm and ignores inspection after cleanup', () => {
    for (const action of ['pan', 'home', 'focus', 'arm']) {
      const context = cameraFixture(); context.cv._issFitCamera('grapple');
      if (action === 'pan') context.cv._issCameraPan(32, 0);
      if (action === 'home' || action === 'focus') context.onKey({ key: action === 'home' ? 'Home' : 'F', preventDefault: vi.fn() });
      if (action === 'arm') context.cv._issFitCamera('arm');
      expect(context.cameraFocusId).not.toBe('grapple');
      const eye = context.camera.position.toArray(), target = context.cameraTarget.toArray();
      context.armActual = { ...context.armActual, shoulder: 80, elbow: -30 }; context.updateArm();
      expect(context.camera.position.toArray()).toEqual(eye); expect(context.cameraTarget.toArray()).toEqual(target);
      context.cleaned = true; context.cv._issFitCamera('grapple');
      expect(context.camera.position.toArray()).toEqual(eye); expect(context.cameraFocusId).not.toBe('grapple');
    }
  });
});

const require = createRequire(import.meta.url), modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
const { act } = React;
const save = vi.fn();
const Study = runInNewContext(namedFunction('IssGrappleStudy') + '\nIssGrappleStudy;', { document, issGrappleCapture: capture, setLabToolData: save });
const mounts = [];
let previousActEnvironment;
beforeAll(() => { previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });
afterEach(() => {
  for (const { root, host } of mounts.splice(0)) {
    host.querySelectorAll('style').forEach(style => style.remove());
    act(() => root.unmount()); host.remove();
  }
  save.mockClear();
});
function mountStudy(props = {}) {
  const host = document.createElement('div'); host.setAttribute('data-iss-map', ''); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  const render = () => act(() => root.render(React.createElement(Study, { React, ...props })));
  render();
  return { host, render, state: () => host.querySelector('[data-iss-grapple-study]'),
    stage(value) { act(() => host.querySelector(`[data-iss-capture-stage="${value}"]`).click()); }
  };
}
function addCamera(view) {
  const stage = document.createElement('div'); stage.className = 'iss-station-stage'; stage.scrollIntoView = vi.fn();
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0; canvas._issFitCamera = vi.fn();
  stage.appendChild(canvas); view.host.appendChild(stage); return { canvas, stage };
}

describe('local grapple study', () => {
  it('updates the native stage selection and the three displayed cable paths together', () => {
    const view = mountStudy();
    for (const stage of [0, 1, 2, 0]) {
      view.stage(stage);
      const state = capture(stage);
      expect(view.state().getAttribute('data-iss-grapple-study')).toBe(state.id);
      expect(view.host.querySelectorAll('[data-iss-capture-wire]')).toHaveLength(3);
      for (let i = 0; i < 3; i++) {
        const button = view.host.querySelector(`[data-iss-capture-stage="${i}"]`);
        expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
        expect(button.getAttribute('aria-pressed')).toBe(String(i === stage));
        expect(view.host.querySelector(`[data-iss-capture-wire="${i}"]`).getAttribute('d')).toBe(state.cables[i].path);
      }
      const graphic = view.host.querySelector('svg[role="img"]');
      expect(graphic.getAttribute('aria-label').toLowerCase()).toContain(state.id);
      expect(graphic.getAttribute('aria-label')).toMatch(/not to scale/i);
      expect(view.host.querySelector('[data-iss-capture-description]').textContent.toLowerCase()).toContain(state.id);
    }
    expect(view.host.textContent).toMatch(/seven joints/i);
    expect(view.host.textContent).toMatch(/two planar links/i);
    expect(view.host.textContent).toMatch(/without changing the 3D hand/i);
    expect(view.host.textContent).toMatch(/not every grapple fixture/i);
    for (const link of view.host.querySelectorAll('a')) {
      expect(['www.asc-csa.gc.ca', 'www.nasa.gov']).toContain(new URL(link.href).hostname);
      expect(link.rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    }
  });

  it('keeps capture stages local to each study and never commands or persists the actual arm', () => {
    const evidence = Object.freeze({ selModule: 'truss', mapPhase: 61, mapPlaying: true,
      armShoulder: 50, armElbow: -90, seenModules: Object.freeze(['zarya']) });
    const onChange = vi.fn(), updateData = vi.fn();
    const a = mountStudy({ data: evidence, onChange, updateData }), b = mountStudy({ data: evidence });
    const aCamera = addCamera(a), bCamera = addCamera(b);
    a.stage(2); a.render();
    expect(a.state().dataset.issGrappleStudy).toBe('seat'); expect(b.state().dataset.issGrappleStudy).toBe('align');
    expect(aCamera.canvas._issFitCamera).not.toHaveBeenCalled(); expect(bCamera.canvas._issFitCamera).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled(); expect(updateData).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
    expect(evidence).toEqual({ selModule: 'truss', mapPhase: 61, mapPlaying: true, armShoulder: 50, armElbow: -90, seenModules: ['zarya'] });
  });

  it('opens only its own hand inspection and leaves another map alone when its canvas is absent', () => {
    const a = mountStudy(), b = mountStudy(), aCamera = addCamera(a), bCamera = addCamera(b);
    act(() => a.host.querySelector('[data-iss-grapple-inspect]').click());
    expect(aCamera.canvas._issFitCamera).toHaveBeenCalledExactlyOnceWith('grapple');
    expect(bCamera.canvas._issFitCamera).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(aCamera.canvas); expect(aCamera.stage.scrollIntoView).toHaveBeenCalledOnce();
    aCamera.stage.remove(); aCamera.canvas._issFitCamera.mockClear();
    act(() => a.host.querySelector('[data-iss-grapple-inspect]').click());
    expect(aCamera.canvas._issFitCamera).not.toHaveBeenCalled(); expect(bCamera.canvas._issFitCamera).not.toHaveBeenCalled();
  });
});
