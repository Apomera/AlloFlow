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
  sceneConfiguration.build(THREE, state, {
    span: settings.span, height: settings.height, nBays: settings.nBays,
    joints: analysis.spec.joints, members: analysis.spec.members, forces: analysis.moj.memberForces,
    braceEvery: analysis.braceEvery, bowedId: analysis.buckles ? analysis.governingCompression.id : null,
    bowOutOfPlane: analysis.governingCompression.outOfPlane,
    braceStartM: analysis.governingCompression.braceStartM, braceEndM: analysis.governingCompression.braceEndM,
    ...viewOverrides
  });
  return { state, analysis, mesh: (id, plane = 0) => state.model.children.find(child =>
    child.userData.bridgeMemberId === id && child.userData.trussPlane === plane) };
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
