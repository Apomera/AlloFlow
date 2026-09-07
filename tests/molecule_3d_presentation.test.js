import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_molecule.js', 'utf8');
const vendor = readFileSync('vendor/three-r128/three.min.js', 'utf8');
const THREE = new Function('var module = { exports: {} }; var exports = module.exports;\n' + vendor + '\nreturn module.exports;')();
const marker = 'const fitMoleculeCamera = ';
const start = source.indexOf(marker);
const end = source.indexOf('const syncThreeCanvasSize', start);
const expression = source.slice(start + marker.length, end).trim().replace(/;$/, '');
function fixture(aspect, centers = [[-8, -2, 0], [10, 5, 4]]) {
  const group = new THREE.Group();
  centers.forEach(p => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), new THREE.MeshBasicMaterial());
    mesh.position.set(...p);
    group.add(mesh);
  });
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  camera.position.set(8, 6, 12);
  const controls = { target: new THREE.Vector3(), update: vi.fn(() => { camera.lookAt(controls.target); camera.updateMatrixWorld(); }) };
  const fit = new Function('window', 'threeResourcesRef', 'threeCameraRef', 'threeControlsRef', 'return (' + expression + ');')({ THREE }, { current: { atomGroup: group } }, { current: camera }, { current: controls });
  return { group, camera, controls, fit };
}
function expectFramed(group, camera) {
  const box = new THREE.Box3().setFromObject(group);
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const p = new THREE.Vector3(x, y, z).project(camera);
    expect(Math.abs(p.x)).toBeLessThan(1);
    expect(Math.abs(p.y)).toBeLessThan(1);
    expect(p.z).toBeLessThan(1);
  }
}
describe('Molecule 3D camera fitting with the shipped Three.js math', () => {
  it.each([2.5, 1, 0.7, 0.3])('frames the whole model at aspect ratio %s', aspect => {
    const { group, camera, controls, fit } = fixture(aspect);
    fit();
    expectFramed(group, camera);
    expect(controls.update).toHaveBeenCalled();
  });
  it('keeps the current viewing direction when fitting', () => {
    const { camera, controls, fit } = fixture(1);
    const direction = camera.position.clone().sub(controls.target).normalize();
    fit();
    expect(camera.position.clone().sub(controls.target).normalize().distanceTo(direction)).toBeLessThan(1e-10);
  });
  it('expands the far plane and zoom range for a large custom model', () => {
    const { group, camera, controls, fit } = fixture(0.5, [[-500, 0, 0], [500, 300, 100]]);
    fit();
    expectFramed(group, camera);
    expect(camera.far).toBeGreaterThan(1000);
    expect(controls.maxDistance).toBeGreaterThan(camera.position.distanceTo(controls.target));
  });
  it('leaves an empty scene alone', () => {
    const { camera, controls, fit } = fixture(1, []);
    fit();
    expect(camera.position.toArray()).toEqual([8, 6, 12]);
    expect(controls.update).not.toHaveBeenCalled();
  });
});
describe('Molecule viewer presentation guidance', () => {
  it('labels illustrative size and bond lengths without claiming measured radii', () => {
    resetStemLab(); loadTool('stem_lab/stem_tool_molecule.js', 'molecule');
    const html = renderTool('molecule', { molecule: { moleculeMode: 'viewer' } });
    expect(html).toContain('Sizes and bond lengths are illustrative, not measured to scale');
    expect(html).not.toContain('~70-150 picometers');
    expect(html).not.toContain('hydrogen white');
  });
});


describe('Core molecule preset bond orders', () => {
  const presetStart = source.indexOf('const viewerPresets =');
  const presetEnd = source.indexOf('const moleculeTeachingModels', presetStart);
  const presets = new Function('__alloT', source.slice(presetStart, presetEnd) + '\nreturn viewerPresets;')((key, fallback) => fallback);
  it.each([['CO₂', [2, 2]], ['O₂', [2]], ['N₂', [3]], ['CO', [3]]])('shows the expected bond order for %s in the WebGL input and 2D fallback', (formula, orders) => {
    const preset = presets.find(p => p.formula === formula);
    expect(preset.bonds.map(b => b[2] || 1)).toEqual(orders);
    resetStemLab(); loadTool('stem_lab/stem_tool_molecule.js', 'molecule');
    const el = document.createElement('div');
    el.innerHTML = renderTool('molecule', { molecule: { moleculeMode: 'viewer', ...preset } });
    const groups = [...el.querySelectorAll('[data-molecule-bond-order]')];
    expect(groups.map(g => g.querySelectorAll('line').length)).toEqual(orders);
  });
});
