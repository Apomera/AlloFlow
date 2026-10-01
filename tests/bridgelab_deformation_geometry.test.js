import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const THREE = require(resolve('vendor/three-r128/three.min.js'));
let sceneConfiguration;
const sandbox = { console, window: { StemLab: {
  registerTool() {},
  makeOrbitViewer(configuration) { sceneConfiguration = configuration; return { status: () => 'ready' }; }
} } };
vm.runInNewContext(readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8').replace(
  "window.StemLab.registerTool('bridgeLab', {",
  "window.analyzeBridge = bridgeGoverningAnalysis; window.StemLab.registerTool('bridgeLab', {"
), sandbox);

function scene(overrides = {}, viewOverrides = {}) {
  const analysis = sandbox.window.analyzeBridge({ span: 36, height: 6, nBays: 6,
    trussStyle: 'warren', materialId: 'steel', crossSectionMm2: 14000,
    loadMode: 'uniform', loadPerJoint: 50, lateralBraceEvery: 6, ...overrides });
  const state = { model: new THREE.Group() };
  const settings = analysis.settings;
  const viewData = {
    span: settings.span, height: settings.height, nBays: settings.nBays,
    joints: analysis.spec.joints, members: analysis.spec.members, forces: analysis.moj.memberForces,
    braceEvery: analysis.braceEvery, bowedId: analysis.buckles ? analysis.governingCompression.id : null,
    bowOutOfPlane: analysis.governingCompression.outOfPlane,
    braceStartM: analysis.governingCompression.braceStartM, braceEndM: analysis.governingCompression.braceEndM,
    ...viewOverrides
  };
  sceneConfiguration.build(THREE, state, viewData);
  state.data = viewData;
  state.THREE = THREE;
  return { state, analysis, mesh: (id, plane = 0) => {
    let found;
    state.model.traverse(child => { if (child.userData.bridgeMemberId === id && child.userData.trussPlane === plane) found = child; });
    return found;
  } };
}

function endpoint(mesh, index) {
  if (mesh.geometry.type === 'TubeGeometry') return mesh.geometry.parameters.path.getPoint(index);
  mesh.updateMatrix();
  return new THREE.Vector3(0, 0, (index ? 1 : -1) * mesh.geometry.parameters.depth / 2).applyMatrix4(mesh.matrix);
}

describe('Bridge Lab illustrative buckling geometry', () => {
  it('bows every chord segment over the actual unbraced interval with fixed ends', () => {
    const { state, analysis, mesh } = scene();
    expect(analysis.governingCompression.outOfPlane).toBe(true);
    expect(state.bowedInterval).toEqual({ startM: 3, endM: 33 });
    expect(state.bowedMembers).toEqual(['TC0', 'TC1', 'TC2', 'TC3', 'TC4']);
    expect(state.braceStations).toEqual(Array.from(analysis.lateralBracing.stations));
    const start = endpoint(mesh('TC0'), 0);
    const end = endpoint(mesh('TC4'), 1);
    expect(start.x).toBeCloseTo(-15);
    expect(end.x).toBeCloseTo(15);
    expect(start.z).toBeCloseTo(end.z);
    expect(Math.abs(mesh('TC2').geometry.parameters.path.getPoint(0.5).z)).toBeGreaterThan(Math.abs(start.z));
  });

  it('keeps neighboring chord segments and attached diagonals connected in both truss planes', () => {
    const { analysis, mesh } = scene();
    for (const plane of [0, 1]) {
      const chord0 = analysis.spec.members.find(member => member.id === 'TC0');
      const junction = chord0.j2;
      expect(endpoint(mesh('TC0', plane), 1).distanceTo(endpoint(mesh('TC1', plane), 0))).toBeLessThan(1e-8);
      const web = analysis.spec.members.find(member => !member.id.startsWith('TC') && (member.j1 === junction || member.j2 === junction));
      const webEndpoint = endpoint(mesh(web.id, plane), web.j1 === junction ? 0 : 1);
      expect(webEndpoint.distanceTo(endpoint(mesh('TC0', plane), 1))).toBeLessThan(1e-8);
    }
    expect(endpoint(mesh('TC1', 0), 1).z).toBeCloseTo(-endpoint(mesh('TC1', 1), 1).z);
  });

  it('uses a shorter final brace interval without deforming the adjacent restrained interval', () => {
    const { state, mesh } = scene({ nBays: 8, lateralBraceEvery: 5 }, {
      bowedId: 'TC5', bowOutOfPlane: true, braceStartM: 24.75, braceEndM: 33.75
    });
    expect(state.bowedInterval).toEqual({ startM: 24.75, endM: 33.75 });
    expect(state.bowedMembers).toEqual(['TC5', 'TC6']);
    expect(mesh('TC4').geometry.type).toBe('BoxGeometry');
    expect(endpoint(mesh('TC4'), 1).distanceTo(endpoint(mesh('TC5'), 0))).toBeLessThan(1e-8);
    expect(endpoint(mesh('TC5'), 0).z).toBeCloseTo(endpoint(mesh('TC6'), 1).z);
  });

  it('preserves the single-member in-plane mode and draws no bow for a passing design', () => {
    const failing = scene({ crossSectionMm2: 1000, lateralBraceEvery: 1 });
    expect(failing.analysis.buckles).toBe(true);
    expect(failing.state.bowedAxis).toBe('in-plane');
    expect(failing.state.bowedInterval).toBeNull();
    expect(failing.state.bowedMembers).toHaveLength(1);
    const bowed = failing.mesh(failing.state.bowedMember);
    expect(endpoint(bowed, 0).z).toBeCloseTo(bowed.geometry.parameters.path.getPoint(0.5).z);
    const passing = scene({ lateralBraceEvery: 1, crossSectionMm2: 30000 });
    expect(passing.analysis.buckles).toBe(false);
    expect(passing.state.bowedMembers).toEqual([]);
  });

  it('keeps solver force signs mapped to red tension and blue compression', () => {
    const { analysis, mesh } = scene({ crossSectionMm2: 30000, lateralBraceEvery: 1 });
    const tensionId = Object.keys(analysis.moj.memberForces).find(id => analysis.moj.memberForces[id] > 1);
    const compressionId = Object.keys(analysis.moj.memberForces).find(id => analysis.moj.memberForces[id] < -1);
    const tensionColor = mesh(tensionId).material.color;
    const compressionColor = mesh(compressionId).material.color;
    expect(tensionColor.r).toBeGreaterThan(tensionColor.b);
    expect(compressionColor.b).toBeGreaterThan(compressionColor.r);
  });
});


describe('Bridge Lab deck viewpoint and seismic scene', () => {
  it('places the bank observer at eye level outside the crossing for every supported span', () => {
    for (const span of [10, 30, 80]) {
      const { state } = scene({ span }, { cameraMode: 'bank' });
      state.camera = new THREE.PerspectiveCamera();
      state.tick();
      sceneConfiguration.camera(THREE, state, state.data);
      expect(state.camera.position.x).toBeLessThan(-span / 2 - 3);
      expect(state.camera.position.z).toBeGreaterThan(state.extent.d / 2 + 3);
      expect(state.camera.position.y - state.bankStandpoint.y).toBeCloseTo(1.65);
      expect(state.camera.position.toArray().every(Number.isFinite)).toBe(true);
      expect(state.camera.getWorldDirection(new THREE.Vector3()).x).toBeGreaterThan(0);
      expect(state.camera.fov).toBe(60);
      expect(sceneConfiguration.debug(state).observerAnchor).toBe('ground');
    }
  });

  it('anchors the bank camera to the ground without following the moving deck or rebuilding the scene', () => {
    const { state } = scene({}, { cameraMode: 'bank', bankYaw: 15, bankPitch: -8 });
    state.camera = new THREE.PerspectiveCamera();
    state.tick();
    sceneConfiguration.camera(THREE, state, state.data);
    const rest = state.camera.position.clone();
    const direction = state.camera.getWorldDirection(new THREE.Vector3());
    const children = [...state.model.children];
    state.data.quake = { enabled: true, groundM: 0.04, deckM: -0.11, maxOffsetM: 0.2 };
    state.tick();
    sceneConfiguration.camera(THREE, state, state.data);
    expect(state.camera.position.z - rest.z).toBeCloseTo(0.4);
    expect(state.camera.position.x).toBe(rest.x);
    expect(state.camera.position.y).toBe(rest.y);
    expect(state.camera.getWorldDirection(new THREE.Vector3()).distanceTo(direction)).toBeLessThan(1e-10);
    const firstEye = state.camera.position.clone();
    state.data.quake.deckM = 0.2;
    state.tick();
    sceneConfiguration.camera(THREE, state, state.data);
    expect(state.camera.position.toArray()).toEqual(firstEye.toArray());
    const deckRelativeToEye = state.structure.position.z - state.camera.position.z + rest.z;
    expect(deckRelativeToEye).toBeCloseTo((0.2 - 0.04) * 10);
    state.data.cameraMode = 'deck';
    sceneConfiguration.camera(THREE, state, state.data);
    expect(sceneConfiguration.debug(state).observerAnchor).toBe('deck');
    state.data.cameraMode = 'bank';
    sceneConfiguration.camera(THREE, state, state.data);
    expect(state.camera.position.toArray()).toEqual(firstEye.toArray());
    expect(state.model.children).toEqual(children);
    expect(state.bridgeBuilds).toBe(1);
  });

  it('bounds bank look angles and keeps malformed restored angles finite', () => {
    const { state } = scene({}, { cameraMode: 'bank' });
    state.camera = new THREE.PerspectiveCamera();
    state.tick();
    for (const value of [NaN, Infinity, -Infinity, 999, -999]) {
      sceneConfiguration.camera(THREE, state, { ...state.data, bankYaw: value, bankPitch: value });
      const direction = state.camera.getWorldDirection(new THREE.Vector3());
      expect(direction.toArray().every(Number.isFinite)).toBe(true);
      expect(Math.abs(direction.y)).toBeLessThanOrEqual(Math.sin(80 * Math.PI / 180) + 1e-10);
    }
  });

  it('keeps the added landscape finite and batched across supported span limits', () => {
    for (const span of [10, 30, 80]) {
      const { state } = scene({ span, nBays: 8, height: 15, lateralBraceEvery: 1 });
      const instances = [];
      state.model.traverse(object => {
        if (object.isInstancedMesh) instances.push(object);
        if (object.geometry?.attributes.position) expect(Array.from(object.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      });
      expect(instances).toHaveLength(2);
      expect(instances.every(mesh => mesh.count === 48 && mesh.frustumCulled === false)).toBe(true);
      expect(Array.from(instances[0].instanceMatrix.array).every(Number.isFinite)).toBe(true);
      expect(state.sky.material.fog).toBe(false);
      state.camera = new THREE.PerspectiveCamera();
      sceneConfiguration.camera(THREE, state, { cameraMode: 'deck', deckPosition: 0.97, deckYaw: 180 });
      expect(state.camera.far).toBeGreaterThan(state.sky.geometry.parameters.radius + span);
      const waterPosition = state.water.position.clone();
      state.data.quake = { enabled: true, groundM: 0.2, deckM: -0.3, maxOffsetM: 0.3 };
      state.tick();
      expect(state.water.position.toArray()).toEqual(waterPosition.toArray());
      expect(state.ground.position.z).toBe(2);
      expect(state.structure.position.z).toBe(-3);
    }
  });

  it('places the eye at human height and looks along the bridge with bounded walking and pitch', () => {
    const { state } = scene({}, { cameraMode: 'deck', deckPosition: 0.12, deckYaw: 0, deckPitch: 0 });
    state.camera = new THREE.PerspectiveCamera();
    state.tick();
    sceneConfiguration.camera(THREE, state, state.data);
    expect(state.camera.position.x).toBeCloseTo((0.12 - 0.5) * 36);
    expect(state.camera.position.y - state.deckSurfaceY).toBeCloseTo(1.65);
    const direction = state.camera.getWorldDirection(new THREE.Vector3());
    expect(direction.x).toBeCloseTo(1);
    expect(direction.y).toBeCloseTo(0);
    expect(direction.z).toBeCloseTo(0);
    expect(state.camera.fov).toBe(72);
    expect(state.roadway).toBeTruthy();
    expect(state.railings).toBe(true);
    sceneConfiguration.camera(THREE, state, { ...state.data, deckPosition: 999, deckPitch: 999 });
    expect(state.camera.position.x).toBeCloseTo((0.97 - 0.5) * 36);
    expect(state.camera.getWorldDirection(new THREE.Vector3()).y).toBeCloseTo(Math.sin(Math.PI / 3));
  });

  it('connects pier bases to the ground and tops to the deck while the camera follows the deck', () => {
    const { state } = scene({}, { cameraMode: 'deck' });
    state.camera = new THREE.PerspectiveCamera();
    state.tick();
    sceneConfiguration.camera(THREE, state, state.data);
    const eyeZ = state.camera.position.z;
    const children = [...state.model.children];
    state.data = { ...state.data, quake: { enabled: true, groundM: 0.04, deckM: 0.11, maxOffsetM: 0.2, visualScale: 10 } };
    state.tick();
    sceneConfiguration.camera(THREE, state, state.data);
    expect(state.structure.position.z).toBeCloseTo(1.1);
    expect(state.ground.position.z).toBeCloseTo(0.4);
    expect(state.camera.position.z - eyeZ).toBeCloseTo(1.1);
    expect(sceneConfiguration.debug(state).relativeOffsetM).toBeCloseTo(0.07);
    state.supports.forEach(pier => {
      expect(endpoint(pier.mesh, 0).z).toBeCloseTo(pier.base.z + 0.4);
      expect(endpoint(pier.mesh, 1).z).toBeCloseTo(pier.top.z + 1.1);
    });
    expect(state.model.children).toEqual(children);
    expect(state.bridgeBuilds).toBe(1);
    state.data.quake.enabled = false;
    state.tick();
    expect(state.structure.position.z).toBe(0);
    expect(state.ground.position.z).toBe(0);
    state.supports.forEach(pier => expect(pier.mesh.scale.z).toBeCloseTo(1));
  });

  it('leaves the fitted orbit camera untouched and rejects nonfinite seismic offsets', () => {
    const { state } = scene({}, { cameraMode: 'orbit', quake: { enabled: true, groundM: NaN, deckM: Infinity } });
    state.camera = new THREE.PerspectiveCamera();
    state.camera.position.set(20, 10, 40);
    state.tick();
    sceneConfiguration.camera(THREE, state, state.data);
    expect(state.camera.position.toArray()).toEqual([20, 10, 40]);
    expect(state.cameraMode).toBe('orbit');
    expect(state.groundOffsetVisualM).toBe(0);
    expect(state.deckOffsetVisualM).toBe(0);
  });

  it('keeps resting rails stationary and reuses their geometry when motion or visibility changes', () => {
    const { state } = scene({}, { motionGuide: true, quake: { enabled: true, groundM: 0.04, deckM: -0.11, maxOffsetM: 0.2 } });
    const reference = state.motionReference;
    const geometry = reference.geometry;
    const positions = Array.from(geometry.attributes.position.array);
    state.tick();
    expect(reference.parent).toBe(state.model);
    expect(reference.visible).toBe(true);
    expect(reference.position.toArray()).toEqual([0, 0, 0]);
    expect(state.ground.position.z).toBeCloseTo(0.4);
    expect(state.structure.position.z).toBeCloseTo(-1.1);
    expect(reference.material.type).toBe('LineDashedMaterial');
    expect(reference.material.depthWrite).toBe(false);
    expect(reference.geometry.attributes.lineDistance.count).toBe(positions.length / 3);
    expect(sceneConfiguration.debug(state).motionReferenceVisible).toBe(true);
    for (let index = 0; index < 20; index++) {
      state.data.quake.deckM = index / 100;
      state.data.motionGuide = index % 2 === 0;
      state.tick();
      expect(reference.geometry).toBe(geometry);
      expect(Array.from(geometry.attributes.position.array)).toEqual(positions);
      expect(reference.visible).toBe(state.data.motionGuide);
    }
    state.data.motionGuide = true;
    state.data.quake.enabled = false;
    state.tick();
    expect(reference.visible).toBe(false);
    expect(state.bridgeBuilds).toBe(1);
  });

  it('starts resting rails hidden and only accepts the explicit guide preference', () => {
    const { state } = scene({}, { quake: { enabled: true } });
    expect(state.motionReference.visible).toBe(false);
    for (const preference of [undefined, false, 'true', 1]) {
      state.data.motionGuide = preference;
      state.tick();
      expect(state.motionReference.visible).toBe(false);
    }
    state.data.motionGuide = true;
    state.tick();
    expect(sceneConfiguration.debug(state).motionReferencePosition).toEqual([0, 0, 0]);
    expect(state.motionReference.visible).toBe(true);
  });
});
