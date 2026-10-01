import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Exercise the shipped renderer helper and block operations with the same Three
// r128 geometry/raycaster used in the app. No report artifacts or helper copies
// participate in these tests.
const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8').replace(/\r\n/g, '\n');
let THREE, installGround, fillLessonGroundAndStructures, garden;
const engines = new Set();

function implementation(name) {
  const start = source.indexOf('        engine.' + name + ' = function(');
  if (start < 0) throw Error('Missing production engine method ' + name);
  const end = source.indexOf('\n        };', start);
  if (end < 0) throw Error('Unterminated production engine method ' + name);
  return source.slice(start, end + '\n        };'.length);
}

beforeAll(() => {
  const exports = {};
  new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, { exports });
  THREE = exports;
  const start = source.indexOf('        function installGeometryGround(');
  const end = source.indexOf('        installGeometryGround(engine, THREE, getBlockMaterial, geometryWorldGroundTint);', start);
  if (start < 0 || end < 0) throw Error('Missing production terrain installer');
  installGround = new Function(source.slice(start, end) + '\nreturn installGeometryGround;')();
  const loadStart = source.indexOf('        engine.loadLesson = function(lesson) {');
  const fillStart = source.indexOf('          // Place ground and structures as indestructible lesson blocks', loadStart);
  const fillEnd = source.indexOf('          engine.refreshAllAO();', fillStart);
  if (loadStart < 0 || fillStart < 0 || fillEnd < 0) throw Error('Missing production lesson ground/structure loading stage');
  fillLessonGroundAndStructures = new Function('engine', 'lesson', source.slice(fillStart, fillEnd));
  const gardenStart = source.indexOf('    geometryGarden: {');
  const gardenEnd = source.indexOf('    compositeVolume:', gardenStart);
  if (gardenStart < 0 || gardenEnd < 0) throw Error('Missing original Garden fixture');
  garden = new Function('return ({' + source.slice(gardenStart, gardenEnd) + '}).geometryGarden;')();
});

function fixture() {
  const engine = {
    blocks: {}, scene: new THREE.Scene(), _blocksDirty: true, npcs: [],
    _undoStack: [], _redoStack: [], _placingLessonBlocks: true, _measurementLayer: 'ground',
    _currentLesson: { ground: { y: 0 } }, refreshAONeighbourhood() {}, configureBlockFinish() {}
  };
  const material = () => new THREE.MeshStandardMaterial({ color: 0x88aa66 });
  installGround(engine, THREE, material, () => 1);
  const deps = {
    engine, THREE, MAX_BLOCKS: 1500, getBlockMaterial: material,
    createShapeGeometry: () => new THREE.BoxGeometry(1, 1, 1), geometryWorldGroundTint: () => 1,
    addBlockEdges() {}, pushUndo() {}, BLOCK_SHAPES: [{ id: 'cube', volume: 1 }], spawnBreakParticles() {}, window: {}
  };
  new Function(...Object.keys(deps), [
    'getBlocksArr', 'getPlacementEligibility', 'placementCellForHit', 'placeBlock',
    'fillBlocks', '_disposeBlockMesh', 'removeBlock', 'clearWorld'
  ].map(implementation).join('\n'))(...Object.values(deps));
  engines.add(engine);
  return engine;
}

afterEach(() => {
  engines.forEach(engine => engine.clearWorld());
  engines.clear();
});

function aim(engine, origin, direction, far = 8) {
  engine.scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction).normalize(), 0, far);
  return ray.intersectObjects(engine.getRaycastTargets());
}

function loadGarden() {
  const engine = fixture();
  engine._currentLesson = garden;
  fillLessonGroundAndStructures(engine, garden);
  return engine;
}

describe('Geometry World batched lesson ground', () => {
  it('provides white base vertex colors for r128 instance tint multiplication', () => {
    const engine = fixture();
    engine.placeBlock(0, 0, 0, 'grass'); engine.placeBlock(1, 0, 0, 'stone');
    engine._groundChunks.forEach(chunk => {
      const color = chunk.geometry.getAttribute('color');
      expect(color).toBeTruthy();
      expect(color.count).toBe(chunk.geometry.getAttribute('position').count);
      expect(Array.from(color.array).every(value => value === 1)).toBe(true);
      expect(chunk.instanceColor).toBeTruthy();
      expect(chunk.instanceColor.count).toBe(chunk.instanceMatrix.count);
      expect(Array.from(chunk.instanceColor.array).every(value => value > 0)).toBe(true);
      const live = Object.values(engine.blocks).find(mesh => mesh.userData._groundRecord.mesh === chunk);
      const offset = live.userData._groundInstance * 3;
      expect(Array.from(chunk.instanceColor.array.slice(offset, offset + 3))).toHaveLength(3);
    });
  });

  it('keeps every Garden ground cell while charging only authored structures to the build budget', () => {
    const engine = loadGarden();
    expect(engine.getGroundBlockCount()).toBe((garden.ground.xMax - garden.ground.xMin + 1) * (garden.ground.zMax - garden.ground.zMin + 1));
    const construction = Object.values(engine.blocks).filter(mesh => mesh.userData._measurementLayer !== 'ground');
    expect(engine.getConstructionBlockCount()).toBe(construction.length);
    expect(construction.length).toBeGreaterThan(0);
    expect(engine._fillTruncated).toBe(false);
    expect(engine._groundChunks.length).toBeLessThan(40);
    expect(engine.scene.children.length).toBe(engine._groundChunks.length + construction.length);
  });

  it('loads every Garden structure cell, including the final hidden tower, without truncation', () => {
    const engine = loadGarden();
    garden.structures.forEach(s => {
      for (let x = s.x1; x <= s.x2; x++) for (let y = s.y1; y <= s.y2; y++) for (let z = s.z1; z <= s.z2; z++) {
        expect(engine.blocks[x + ',' + y + ',' + z]).toBeTruthy();
      }
    });
    expect(engine.blocks['50,5,5'].userData.blockType).toBe('diamond');
    expect(engine.getConstructionBlockCount()).toBeLessThan(1500);
    expect(engine._fillTruncated).toBe(false);
  });

  it('returns the canonical ground proxy and correct adjacent placement cell', () => {
    const engine = fixture();
    engine.placeBlock(-6, 0, -10, 'grass');
    const hit = aim(engine, [-5.5, 5, -9.5], [0, -1, 0])[0];
    expect(hit.object).toBe(engine.blocks['-6,0,-10']);
    expect(engine.placementCellForHit(hit)).toEqual({ x: -6, y: 1, z: -10 });
    expect(hit.distance).toBe(4);
  });

  it('respects ray distance and the chunk visibility used by Showcase isolation', () => {
    const engine = fixture();
    const proxy = engine.placeBlock(0, 0, 0, 'grass');
    expect(aim(engine, [.5, 15, .5], [0, -1, 0], 8)).toHaveLength(0);
    proxy.userData._groundRecord.mesh.visible = false;
    expect(aim(engine, [.5, 5, .5], [0, -1, 0])).toHaveLength(0);
    proxy.userData._groundRecord.mesh.visible = true;
    expect(aim(engine, [.5, 5, .5], [0, -1, 0])[0].object).toBe(proxy);
  });

  it('protects lesson ground without changing its cell, budget, or history', () => {
    const engine = fixture();
    const proxy = engine.placeBlock(0, 0, 0, 'grass');
    engine.removeBlock(0, 0, 0);
    expect(engine.blocks['0,0,0']).toBe(proxy);
    expect(engine.getGroundBlockCount()).toBe(1);
    expect(engine.getConstructionBlockCount()).toBe(0);
    expect(engine._undoStack).toEqual([]);
  });

  it('opens a real raycast hole when terrain is force removed', () => {
    const engine = fixture();
    engine.placeBlock(0, 0, 0, 'grass');
    engine.removeBlock(0, 0, 0, true);
    expect(engine.blocks['0,0,0']).toBeUndefined();
    expect(engine.getGroundBlockCount()).toBe(0);
    expect(aim(engine, [.5, 5, .5], [0, -1, 0])).toHaveLength(0);
  });

  it('recolors only the requested ground cell without charging construction capacity', () => {
    const engine = fixture();
    engine.fillBlocks(-5, 0, -9, -4, 0, -9, 'grass');
    engine.fillBlocks(-5, 0, -9, -5, 0, -9, 'stone');
    expect(engine.blocks['-5,0,-9'].userData).toMatchObject({ blockType: 'stone', _measurementLayer: 'ground', _lessonBlock: true });
    expect(engine.blocks['-4,0,-9'].userData.blockType).toBe('grass');
    expect(engine.getGroundBlockCount()).toBe(2);
    expect(engine.getConstructionBlockCount()).toBe(0);
    expect(aim(engine, [-4.5, 5, -8.5], [0, -1, 0])[0].object).toBe(engine.blocks['-5,0,-9']);
  });

  it('treats legacy floor paths as terrain but charges elevated ground-tagged fills as structures', () => {
    const engine = fixture();
    const lesson = {
      ground: { xMin: 0, xMax: 2, zMin: 0, zMax: 0, y: 0, type: 'grass' },
      structures: [
        { type: 'fill', x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0, block: 'stone' },
        { type: 'fill', x1: 1, x2: 1, y1: 2, y2: 2, z1: 0, z2: 0, block: 'gold', measurementLayer: 'ground' }
      ]
    };
    engine._currentLesson = lesson;
    fillLessonGroundAndStructures(engine, lesson);
    expect(engine.blocks['0,0,0'].userData).toMatchObject({ blockType: 'stone', _measurementLayer: 'ground' });
    expect(engine.blocks['1,2,0'].userData._measurementLayer).toBe('lesson');
    expect(engine.getGroundBlockCount()).toBe(3);
    expect(engine.getConstructionBlockCount()).toBe(1);
  });

  it('traverses material holes correctly for horizontal rays', () => {
    const engine = fixture();
    engine.placeBlock(0, 0, 0, 'grass'); engine.placeBlock(1, 0, 0, 'stone'); engine.placeBlock(2, 0, 0, 'grass');
    engine.removeBlock(0, 0, 0, true);
    const hit = aim(engine, [-2, .5, .5], [1, 0, 0])[0];
    expect(hit.object).toBe(engine.blocks['1,0,0']);
    expect(hit.distance).toBe(3);
    expect(engine.placementCellForHit(hit)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('invalidates target caches so a new construction block occludes its floor', () => {
    const engine = fixture();
    engine.placeBlock(0, 0, 0, 'grass'); engine.getRaycastTargets();
    engine._measurementLayer = 'lesson'; engine.placeBlock(0, 1, 0, 'stone');
    expect(aim(engine, [.5, 5, .5], [0, -1, 0])[0].object).toBe(engine.blocks['0,1,0']);
    expect(engine.getConstructionBlockCount()).toBe(1);
  });

  it('leaves the full 1,500-block building allowance on a 97 by 97 landscape', () => {
    const engine = fixture();
    engine.fillBlocks(-48, 0, -48, 48, 0, 48, 'grass');
    expect(engine.getGroundBlockCount()).toBe(9409);
    engine._measurementLayer = 'lesson'; engine.fillBlocks(0, 1, 0, 49, 1, 29, 'stone');
    expect(engine.getConstructionBlockCount()).toBe(1500);
    expect(engine.placeBlock(50, 1, 30, 'stone')).toBeNull();
    engine._measurementLayer = 'ground';
    expect(engine.placeBlock(60, 0, 60, 'grass')).toBeTruthy();
    expect(engine.getGroundBlockCount()).toBe(9410);
  }, 90000);

  it('caps a pathological terrain fill independently of the construction allowance', () => {
    const engine = fixture();
    engine.fillBlocks(0, 0, 0, 128, 0, 128, 'grass');
    expect(engine.getGroundBlockCount()).toBe(16384);
    expect(engine._fillTruncated).toBe(true);
    expect(engine.getConstructionBlockCount()).toBe(0);
  }, 90000);

  it('disposes each shared resource once, clears targets, and can rebuild after clearing', () => {
    const engine = fixture();
    engine.fillBlocks(-2, 0, -2, 2, 0, 2, 'grass'); engine.placeBlock(4, 0, 4, 'stone');
    const resources = new Set();
    engine._groundChunks.forEach(chunk => { resources.add(chunk.material); resources.add(chunk.geometry); });
    let disposed = 0;
    resources.forEach(resource => resource.addEventListener('dispose', () => disposed++));
    engine.getRaycastTargets(); engine.clearWorld();
    expect(disposed).toBe(resources.size);
    expect(engine.getGroundBlockCount()).toBe(0);
    expect(engine.getConstructionBlockCount()).toBe(0);
    expect(engine.getRaycastTargets()).toEqual([]);
    expect(engine.scene.children).toHaveLength(0);
    engine._measurementLayer = 'ground'; engine.placeBlock(0, 0, 0, 'grass');
    expect(aim(engine, [.5, 4, .5], [0, -1, 0])[0].object).toBe(engine.blocks['0,0,0']);
  });

  it('matches ordinary Mesh raycasts across 500 deterministic rays, materials, holes and chunk boundaries', () => {
    const engine = fixture();
    for (let x = -20; x <= 20; x++) for (let z = -20; z <= 20; z++) {
      if ((x * 37 + z * 19) % 11) engine.placeBlock(x, 0, z, (x + z) % 3 === 0 ? 'stone' : 'grass');
    }
    engine.scene.updateMatrixWorld(true);
    let seed = 1123;
    function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    for (let i = 0; i < 500; i++) {
      const origin = new THREE.Vector3(random() * 55 - 27.5, random() * 8 - 1, random() * 55 - 27.5);
      const direction = new THREE.Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize();
      const ray = new THREE.Raycaster(origin, direction, 0, 45);
      const reference = ray.intersectObjects(engine.getBlocksArr())[0];
      const actual = ray.intersectObjects(engine.getRaycastTargets())[0];
      expect(!!actual, 'hit presence for ray ' + i).toBe(!!reference);
      if (actual) {
        expect(actual.distance, 'nearest hit for ray ' + i).toBeCloseTo(reference.distance, 7);
        expect(actual.object, 'canonical proxy for ray ' + i).toBe(reference.object);
      }
    }
  }, 90000);
});
