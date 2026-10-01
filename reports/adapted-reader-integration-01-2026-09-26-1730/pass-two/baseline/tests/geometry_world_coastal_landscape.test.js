import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Run the production landscape owner and its merged mesh builders with the
// actual vendored Three.js runtime. Report candidates are never read by CI.
const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8').replace(/\r\n/g, '\n');
const ground = { xMin: -27, xMax: 27, zMin: -21, zMax: 21, y: 0, type: 'grass' };
let THREE, initialize;
const engines = new Set();

beforeAll(() => {
  const exports = {};
  new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, { exports });
  THREE = exports;
  const start = source.indexOf('        (function initLandscape() {');
  const end = source.indexOf('        // Soft rim light', start);
  if (start < 0 || end < 0) throw Error('Missing production landscape lifecycle');
  initialize = new Function('engine', 'THREE', 'geometryWorldSrgbColor', source.slice(start, end));
});

function fixture() {
  const engine = {
    scene: new THREE.Scene(),
    blocks: { '1,1,1': { userData: { gridPos: { x: 1, y: 1, z: 1 }, _measurementLayer: 'student' } } },
    _currentLesson: { landscapeTheme: 'coastal' }, _renderProfile: { tier: 'saver' }
  };
  initialize(engine, THREE, (T, hex) => new T.Color(hex).convertSRGBToLinear());
  engines.add(engine);
  engine.refreshLandscape(ground);
  return engine;
}

afterEach(() => { engines.forEach(engine => engine.disposeLandscape()); engines.clear(); });

describe('Geometry World coastal scenery lifecycle', () => {
  it('selects a bounded group of six merged decorative meshes from stable theme metadata', () => {
    const engine = fixture();
    expect(engine._landscape.name).toBe('gw-coastal-landscape');
    expect(engine._landscape.children).toHaveLength(6);
    expect(engine._landscape.userData.gwLandscapeDetail).toEqual({
      theme: 'coastal', tier: 'saver', islands: 3, beacons: 1, sailboats: 1, shoreSegments: 40, glints: 14
    });
    engine._landscape.children.forEach(mesh => {
      expect(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      expect(mesh.geometry.attributes.color.count).toBe(mesh.geometry.attributes.position.count);
    });
  });

  it('preserves the exact block map, student role and object identity', () => {
    const engine = fixture(), block = engine.blocks['1,1,1'];
    engine.refreshLandscape({ ...ground, xMax: 30 });
    expect(engine.blocks['1,1,1']).toBe(block);
    expect(Object.keys(engine.blocks)).toEqual(['1,1,1']);
    expect(block.userData).toEqual({ gridPos: { x: 1, y: 1, z: 1 }, _measurementLayer: 'student' });
  });

  it('excludes sea, shore and landmarks from building and selection raycasts', () => {
    const engine = fixture();
    engine.scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(70, 20, 0), new THREE.Vector3(0, -1, 0), 0, 100);
    expect(ray.intersectObjects(engine._landscape.children)).toEqual([]);
    engine._landscape.children.forEach(mesh => expect(mesh.userData.gwDecorative).toBe(true));
  });

  it('places the visible sea between the old horizon and block tops without changing the horizon', () => {
    const engine = fixture();
    const water = engine._landscape.getObjectByName('gw-coastal-water');
    const heights = Array.from(water.geometry.attributes.position.array).filter((_, i) => i % 3 === 1);
    expect(Math.min(...heights)).toBeGreaterThan(-.03);
    expect(Math.max(...heights)).toBeLessThan(1);
    expect(engine._horizon).toBeUndefined();
  });

  it('keeps static scenery and cached resources unchanged with reduced motion', () => {
    const engine = fixture(), group = engine._landscape;
    const positions = group.children.map(mesh => Array.from(mesh.geometry.attributes.position.array));
    let disposed = 0;
    group.children.forEach(mesh => mesh.geometry.addEventListener('dispose', () => disposed++));
    engine._ambientMotionEnabled = false; engine._rmHover = true;
    engine.refreshLandscape(ground);
    expect(engine._landscape).toBe(group);
    expect(group.children.map(mesh => Array.from(mesh.geometry.attributes.position.array))).toEqual(positions);
    expect(disposed).toBe(0);
  });

  it('adds detail for a higher quality tier while disposing every old resource exactly once', () => {
    const engine = fixture(), old = engine._landscape;
    let disposed = 0;
    old.children.forEach(mesh => {
      mesh.geometry.addEventListener('dispose', () => disposed++);
      mesh.material.addEventListener('dispose', () => disposed++);
    });
    engine._renderProfile.tier = 'detail'; engine.refreshLandscape(ground);
    expect(engine._landscape).not.toBe(old);
    expect(disposed).toBe(12);
    expect(engine.scene.children).toHaveLength(1);
    expect(engine._landscape.userData.gwLandscapeDetail).toMatchObject({ tier: 'detail', sailboats: 2, shoreSegments: 72 });
  });

  it('invalidates the cache when theme changes at the same lesson bounds', () => {
    const engine = fixture();
    engine._currentLesson = { title: 'A Harbor title without coastal metadata' };
    engine.refreshLandscape(ground);
    expect(engine._landscape.name).toBe('gw-landscape');
    engine._currentLesson = { landscapeTheme: 'coastal' };
    engine.refreshLandscape(ground);
    expect(engine._landscape.name).toBe('gw-coastal-landscape');
    expect(engine.scene.children).toHaveLength(1);
  });

  it('keeps a rebuilt landscape hidden in Showcase and restores only the replacement group', () => {
    const engine = fixture(), old = engine._landscape;
    engine._showcase = { studio: { hidden: [[old, true]] } }; old.visible = false;
    engine._renderProfile.tier = 'detail'; engine.refreshLandscape(ground);
    expect(engine._landscape.visible).toBe(false);
    expect(engine._showcase.studio.hidden).toEqual([[engine._landscape, true]]);
  });

  it('clears all coastal GPU resources and stale Showcase restoration references', () => {
    const engine = fixture(), group = engine._landscape;
    engine._showcase = { studio: { hidden: [[group, true]] } };
    let disposed = 0;
    group.children.forEach(mesh => {
      mesh.geometry.addEventListener('dispose', () => disposed++);
      mesh.material.addEventListener('dispose', () => disposed++);
    });
    engine.disposeLandscape();
    expect(engine._landscape).toBeNull();
    expect(engine.scene.children).toHaveLength(0);
    expect(engine._showcase.studio.hidden).toEqual([]);
    expect(disposed).toBe(12);
  });
});
