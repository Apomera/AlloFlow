import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
const from = source.indexOf('      function migrationAnatomyAtPoint(');
const until = source.indexOf('      function createMigrationAnatomyMarkers(', from);
if (from < 0 || until <= from) throw new Error('Missing actual marker picker');
const pick = new Function(source.slice(from, until) + '\nreturn migrationAnatomyAtPoint;')();

function fixture(rect = { left: 80, top: 120, width: 800, height: 600 }) {
  const camera = new THREE.PerspectiveCamera(54, rect.width / rect.height, 0.1, 100);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const root = new THREE.Group();
  ['head', 'inner-wing', 'primaries', 'tail'].forEach((anatomyId, index) => {
    const marker = new THREE.Group();
    marker.position.set(index % 2 ? 1 : -1, index < 2 ? 1 : -1, 0);
    marker.userData.anatomyId = anatomyId;
    root.add(marker);
  });
  root.updateMatrixWorld(true);
  const host = document.createElement('div');
  host.setAttribute('data-flight-ready', 'true');
  const engine = { camera, anatomyMarkers: root, anatomyPickPoint: new THREE.Vector3(), host,
    renderer: { domElement: { getBoundingClientRect: () => rect } } };
  return { engine, root, rect,
    at(index) {
      const point = root.children[index].getWorldPosition(new THREE.Vector3()).project(camera);
      return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 };
    } };
}

describe('Migration rendered anatomy marker picking', () => {
  it('selects all four actual projected centers using a reusable vector', () => {
    const ui = fixture(), pooled = ui.engine.anatomyPickPoint;
    for (let index = 0; index < 4; index++) {
      const point = ui.at(index);
      expect(pick(ui.engine, point.x, point.y)).toBe(ui.root.children[index].userData.anatomyId);
    }
    expect(ui.engine.anatomyPickPoint).toBe(pooled);
  });

  it('includes a 44px touch target but rejects nearby background', () => {
    const ui = fixture(), p = ui.at(0);
    expect(pick(ui.engine, p.x + 21.9, p.y)).toBe('head');
    expect(pick(ui.engine, p.x + 22.1, p.y)).toBe('');
    expect(pick(ui.engine, p.x + 17, p.y + 17)).toBe('');
  });

  it('uses CSS coordinates after viewport resize and page offsets', () => {
    const ui = fixture({ left: 12.5, top: 230.25, width: 366, height: 390 });
    const point = ui.at(2);
    expect(pick(ui.engine, point.x, point.y)).toBe('primaries');
    expect(pick(ui.engine, point.x * 2, point.y * 2)).toBe('');
    ui.rect.top -= 180;
    const scrolled = ui.at(2);
    expect(pick(ui.engine, scrolled.x, scrolled.y)).toBe('primaries');
  });

  it('rejects hidden markers, hidden overlays and unavailable contexts', () => {
    const ui = fixture(), point = ui.at(0);
    ui.root.children[0].visible = false;
    expect(pick(ui.engine, point.x, point.y)).toBe('');
    ui.root.children[0].visible = true; ui.root.visible = false;
    expect(pick(ui.engine, point.x, point.y)).toBe('');
    ui.root.visible = true; ui.engine.host.removeAttribute('data-flight-ready');
    expect(pick(ui.engine, point.x, point.y)).toBe('');
    ui.engine.host.setAttribute('data-flight-ready', 'true'); ui.engine.disposed = true;
    expect(pick(ui.engine, point.x, point.y)).toBe('');
  });

  it('rejects invalid coordinates and clicks outside the displayed canvas', () => {
    const ui = fixture();
    for (const [x, y] of [[NaN, 100], [100, Infinity], [79, 400], [881, 400], [400, 119], [400, 721]]) {
      expect(pick(ui.engine, x, y)).toBe('');
    }
    ui.rect.width = 0;
    expect(pick(ui.engine, 80, 400)).toBe('');
    expect(pick(null, 100, 100)).toBe('');
  });

  it('does not activate clipped, behind-camera, or malformed marker centers', () => {
    const ui = fixture(), marker = ui.root.children[0];
    marker.position.z = 10;
    const behind = ui.at(0);
    expect(pick(ui.engine, behind.x, behind.y)).toBe('');
    marker.position.set(-100, 1, 0);
    expect(pick(ui.engine, ui.rect.left, 300)).toBe('');
    marker.position.set(-1, 1, NaN);
    expect(pick(ui.engine, 300, 300)).toBe('');
    marker.position.set(-1, 1, 0); marker.userData.anatomyId = '__proto__';
    const invalid = ui.at(0);
    expect(pick(ui.engine, invalid.x, invalid.y)).toBe('');
  });

  it('chooses the closest center when two touch targets overlap', () => {
    const ui = fixture();
    ui.root.children[1].position.copy(ui.root.children[0].position).add(new THREE.Vector3(0.15, 0, 0));
    const point = ui.at(1);
    expect(pick(ui.engine, point.x, point.y)).toBe('inner-wing');
  });

  it('follows transformed marker parents and a changed camera', () => {
    const ui = fixture();
    ui.root.position.set(0.2, -0.3, 0.5);
    ui.root.rotation.z = 0.25;
    ui.engine.camera.position.set(2, 1, 8);
    ui.engine.camera.lookAt(0, 0, 0);
    ui.engine.camera.updateMatrixWorld(true);
    const point = ui.at(3);
    expect(pick(ui.engine, point.x, point.y)).toBe('tail');
  });
});
