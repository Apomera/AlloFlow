import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
let THREE, makeShape;
beforeAll(() => {
  const exports = {};
  new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, { exports });
  THREE = exports; window.THREE = THREE;
  makeShape = new Function(source.slice(source.indexOf('  function createShapeGeometry('), source.indexOf('  // Format fractional volume for display')) + '\nreturn createShapeGeometry;')();
});

function engineFunction(name, from = 0) {
  const start = source.indexOf('        engine.' + name + ' = function(', from);
  const endMark = '\n        };';
  if (start < 0) throw Error('Missing runtime function ' + name);
  return source.slice(start, source.indexOf(endMark, start) + endMark.length);
}

// Run the production creation, action, preview, and history implementations with
// actual r128 geometry/materials. Only audio, UI, and unrelated finish/AO effects
// are replaced; those spies expose accidental success feedback on rejected cells.
function fixture() {
  const events = [], updates = [], effects = { sound: vi.fn(), particles: vi.fn(), xp: vi.fn(), toast: vi.fn(), sr: vi.fn() };
  let hits = [], active = true;
  const engine = {
    blocks: {}, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), npcs: [],
    _currentLesson: { sandbox: true, ground: { y: 0 } },
    _undoStack: [], _redoStack: [], _blocksArr: [], _blocksDirty: true,
    _particles: [], _popBlocks: [], blocksPlaced: 9, _blockMilestones: {},
    _placeState: { selectedBlock: 0, selectedShape: 0, blockRotation: 0 },
    _tutorialState: { step: 3, dismissed: false },
    isInputActive: () => active, clock: { getElapsedTime: () => 1 },
    configureBlockFinish() {}, refreshAONeighbourhood() {},
    logEvent: (type, data) => events.push({ type, data }),
    raycaster: { setFromCamera() {}, intersectObjects(objects) { return objects.length ? hits : []; } }
  };
  const helperNames = ['_disposeBlockMesh', 'placementCellForHit', 'getPlacementEligibility', 'placementForHit', 'publishPlacementPreview', 'getBlocksArr'];
  const historyStart = source.indexOf('        var MAX_UNDO = 200;');
  const historyEnd = source.indexOf('        // ── Ambient occlusion', historyStart);
  const wrapperStart = source.indexOf('        var origPlace = engine.placeBlock;');
  const wrapperEnd = source.indexOf('        var origRemove = engine.removeBlock;', wrapperStart);
  const ghostStart = source.indexOf('        function updateGhostPreview() {');
  const ghostEnd = source.indexOf('        // ── Collision helper', ghostStart);
  const body = helperNames.map(n => engineFunction(n)).join('\n') + '\n'
    + source.slice(historyStart, historyEnd) + '\n'
    + engineFunction('placeBlock') + '\n' + source.slice(wrapperStart, wrapperEnd) + '\n'
    + engineFunction('interactAtCrosshair') + '\n' + source.slice(ghostStart, ghostEnd);
  const deps = {
    engine, THREE, MAX_BLOCKS: 1500, createShapeGeometry: makeShape,
    BLOCK_TYPES: [{ id: 'stone' }, { id: 'wood' }],
    BLOCK_SHAPES: [{ id: 'cube', volume: 1 }, { id: 'halfB', volume: .5 }, { id: 'halfA', volume: .5 }, { id: 'quarter', volume: .25 }],
    getBlockMaterial: () => new THREE.MeshStandardMaterial({ color: 0x998877 }),
    addBlockEdges() {}, geometryWorldGroundTint: () => 1,
    upd: (key, value) => updates.push({ key, value }), addToast: effects.toast,
    announceToSR: effects.sr, sfxPlace: effects.sound, spawnPlaceParticles: effects.particles,
    awardXP: effects.xp, sfxBreak() {}, checkBreakFrustration() {}, sfxNpcChime() {}, syncBlocksToFirestore() {},
    answeredNpcs: {}, disposeGhost: mesh => mesh.traverse(p => { p.geometry?.dispose(); p.material?.dispose(); })
  };
  new Function(...Object.keys(deps), body)(...Object.values(deps));
  return { engine, events, updates, effects, setHits(value) { hits = value; }, setActive(value) { active = value; } };
}

function seed(f, cell, shape = 'cube', rotation = 0) {
  f.engine._placingLessonBlocks = true;
  const mesh = f.engine.placeBlock(...cell, 'stone', shape, rotation);
  f.engine._placingLessonBlocks = false;
  f.engine._undoStack = []; f.engine._redoStack = []; f.events.length = 0;
  return mesh;
}

function hitFace(mesh, localNormal) {
  mesh.updateMatrixWorld(true);
  return { object: mesh, face: { normal: new THREE.Vector3(...localNormal) }, distance: 2 };
}

function snapshot(f) {
  return {
    blocks: Object.entries(f.engine.blocks).map(([key, mesh]) => ({ key, shape: mesh.userData.shape,
      position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), scale: mesh.scale.toArray(),
      positions: Array.from(mesh.geometry.getAttribute('position').array) })),
    undo: structuredClone(f.engine._undoStack), redo: structuredClone(f.engine._redoStack),
    placed: f.engine.blocksPlaced, milestones: { ...f.engine._blockMilestones },
    particles: f.engine._particles.length, pop: f.engine._popBlocks.length,
    events: structuredClone(f.events), sceneChildren: f.engine.scene.children.length
  };
}

describe('placement rejects without a successful transaction', () => {
  const cases = [
    ['occupied', [0, 0, 0], [0, 1, 0], [0, 1, 0]],
    ['below_floor', [0, 0, 0], [0, -1, 0], null],
    ['out_of_bounds', [64, 1, 0], [1, 0, 0], null],
    ['out_of_bounds', [0, 128, 0], [0, 1, 0], null],
    ['block_limit', [0, 0, 0], [0, 1, 0], null]
  ];
  it.each(cases)('%s preserves mesh data, history, count, rewards, and effects', (code, at, normal, occupied) => {
    const f = fixture(), target = seed(f, at);
    if (occupied) seed(f, occupied);
    if (code === 'block_limit') {
      // Capacity concerns count only; sharing the real mesh avoids allocating
      // thousands of irrelevant render objects for this transaction test.
      for (let i = 1; i < 1500; i++) f.engine.blocks['capacity-' + i] = target;
      f.engine._blocksDirty = true;
    }
    f.engine._undoStack = [{ action: 'existing-undo' }];
    f.engine._redoStack = [{ action: 'existing-redo' }];
    const hit = hitFace(target, normal); f.setHits([hit]);
    expect(f.engine.placementForHit(hit).code).toBe(code);
    const before = snapshot(f);
    expect(f.engine.interactAtCrosshair('place')).toBeNull();
    expect(snapshot(f)).toEqual(before);
    expect(f.effects.sound).not.toHaveBeenCalled();
    expect(f.effects.particles).not.toHaveBeenCalled();
    expect(f.effects.xp).not.toHaveBeenCalled();
    expect(f.effects.toast).toHaveBeenCalledWith(expect.any(String), 'info');
    expect(f.effects.sr).toHaveBeenCalledWith(f.engine._placementPreview.reason);
    expect(f.updates.some(u => u.key === 'blocksPlaced' || typeof u.key === 'object')).toBe(false);
    const cell = f.engine._placementPreview.cell;
    expect(f.engine.placeBlock(cell.x, cell.y, cell.z, 'stone')).toBeNull();
    expect(snapshot(f)).toEqual(before);
  });

  it.each([[NaN, 1, 0], [0, Infinity, 0], [.5, 1, 0], ['0', 1, 0]])('rejects invalid direct coordinates %j', (x, y, z) => {
    const f = fixture(), before = snapshot(f);
    expect(f.engine.placeBlock(x, y, z, 'stone')).toBeNull();
    expect(snapshot(f)).toEqual(before);
  });

  it('retains an authored lesson’s offset world and floor', () => {
    const f = fixture(); f.engine._currentLesson = { ground: { y: 12 } };
    expect(f.engine.placeBlock(1000, 12, -1000, 'stone', 'halfB', 1)).toBeInstanceOf(THREE.Mesh);
    expect(f.engine.getPlacementEligibility(1001, 11, -1000).code).toBe('below_floor');
    f.engine._placingLessonBlocks = true;
    expect(f.engine.placeBlock(1000, -3, -1000, 'stone')).toBeInstanceOf(THREE.Mesh);
  });

  it.each(['cube', 'halfB', 'halfA', 'quarter'])('creates exactly one correctly placed %s and one success transaction', shape => {
    const f = fixture(), target = seed(f, [0, 0, 0]);
    f.engine._placeState = { selectedBlock: 1, selectedShape: ['cube', 'halfB', 'halfA', 'quarter'].indexOf(shape), blockRotation: 1 };
    f.engine._ambientMotionEnabled = false;
    f.engine._redoStack = [{ action: 'old-redo' }];
    f.setHits([hitFace(target, [0, 1, 0])]);
    const created = f.engine.interactAtCrosshair('place');
    expect(created).toBeInstanceOf(THREE.Mesh);
    expect(Object.keys(f.engine.blocks)).toHaveLength(2);
    expect(created.userData).toMatchObject({ gridPos: { x: 0, y: 1, z: 0 }, shape, rotation: 1, blockType: 'wood' });
    expect(created.position.toArray()).toEqual([.5, shape === 'cube' ? 1.5 : shape === 'halfB' ? 1.25 : 1, .5]);
    expect(created.rotation.y).toBe(shape === 'cube' ? 0 : Math.PI / 2);
    expect(Array.from(created.geometry.getAttribute('position').array)).toEqual(Array.from(makeShape(shape).getAttribute('position').array));
    expect(f.engine.blocksPlaced).toBe(10); expect(f.engine._undoStack).toHaveLength(1); expect(f.engine._redoStack).toEqual([]);
    expect(f.events.filter(e => e.type === 'block_place')).toHaveLength(1);
    expect(f.effects.sound).toHaveBeenCalledTimes(1); expect(f.effects.particles).toHaveBeenCalledTimes(1); expect(f.effects.xp).toHaveBeenCalledTimes(1);
  });
});

describe('preview and history use the same eligibility', () => {
  it('shows allowed and blocked states at the same rotated target without modifying it', () => {
    const f = fixture(), target = seed(f, [0, 1, 0], 'halfA', 1);
    const hit = hitFace(target, [0, 0, 1]); f.setHits([hit]);
    f.engine.updateGhostPreview();
    expect(f.engine._placementPreview).toMatchObject({ allowed: true, cell: { x: 1, y: 1, z: 0 } });
    expect(f.engine._ghostMesh.userData.placementAllowed).toBe(true);
    seed(f, [1, 1, 0]);
    const before = target.scale.toArray();
    f.engine.updateGhostPreview();
    expect(f.engine._placementPreview.code).toBe('occupied');
    expect(f.engine._ghostMesh.userData.placementAllowed).toBe(false);
    expect(f.engine._ghostMesh.material.color.getHex()).toBe(0xf16c58);
    expect(f.engine._ghostEdges.material.depthTest).toBe(false);
    expect(target.scale.toArray()).toEqual(before);
    f.setActive(false); f.engine.updateGhostPreview();
    expect(f.engine._ghostMesh.visible).toBe(false);
    expect(f.engine._placementPreview.code).toBe('no_target');
    expect(f.updates.at(-1)).toEqual({ key: 'placementHint', value: null });
  });

  it('publishes compact hints only when visible status changes', () => {
    const f = fixture();
    f.engine.publishPlacementPreview(f.engine.getPlacementEligibility(0, 1, 0));
    f.engine.publishPlacementPreview(f.engine.getPlacementEligibility(1, 1, 0));
    expect(f.updates).toHaveLength(1);
    expect(f.updates[0].value).toEqual({ allowed: true, code: 'ready', reason: 'Ready to build' });
    expect(f.engine._placementPreview.cell).toEqual({ x: 1, y: 1, z: 0 });
    f.engine._showcase = {}; f.engine.updateGhostPreview();
    expect(f.updates.at(-1).value).toBeNull();
    f.engine.updateGhostPreview(); expect(f.updates).toHaveLength(2);
  });

  it('failed undo re-placement keeps both history stacks', () => {
    const f = fixture(); seed(f, [0, 1, 0]);
    f.engine._undoStack = [{ action: 'remove', x: 0, y: 1, z: 0, type: 'stone', shape: 'cube', rotation: 0 }];
    f.engine._redoStack = [{ action: 'unrelated' }];
    const before = snapshot(f); expect(f.engine.undo()).toBe(false); expect(snapshot(f)).toEqual(before);
    expect(f.updates).toEqual([]);
  });

  it('failed redo re-placement keeps both history stacks', () => {
    const f = fixture(); seed(f, [0, 1, 0]);
    f.engine._undoStack = [{ action: 'unrelated' }];
    f.engine._redoStack = [{ action: 'place', x: 0, y: 1, z: 0, type: 'stone', shape: 'halfA', rotation: 1 }];
    const before = snapshot(f); expect(f.engine.redo()).toBe(false); expect(snapshot(f)).toEqual(before);
    expect(f.updates).toEqual([]);
  });

  it('successful redo preserves the remaining redo actions and exact shape rotation', () => {
    const f = fixture();
    const first = { action: 'place', x: 0, y: 1, z: 0, type: 'stone', shape: 'halfA', rotation: 3 };
    const second = { action: 'place', x: 1, y: 1, z: 0, type: 'stone', shape: 'quarter', rotation: 2 };
    f.engine._redoStack = [second, first];
    f.engine.redo(); expect(f.engine._redoStack).toEqual([second]); expect(f.engine._undoStack).toEqual([first]);
    expect(f.engine.blocks['0,1,0'].rotation.y).toBe(Math.PI * 1.5);
    f.engine.redo(); expect(f.engine._redoStack).toEqual([]); expect(f.engine._undoStack).toEqual([first, second]);
    expect(f.engine.blocks['1,1,0'].userData.shape).toBe('quarter');
  });
});


describe('measurement and placement feedback coexist', () => {
  it('keeps an allowed ghost and hover fill quiet during measurement', () => {
    const f = fixture(), target = seed(f, [0, 0, 0]);
    f.setHits([hitFace(target, [0, 1, 0])]); f.engine._rmHover = true;
    f.engine.updateGhostPreview();
    const normalHover = f.engine._hoverGlowMesh.material.opacity;
    f.engine._dimLines = [{}]; f.engine.updateGhostPreview();
    expect(f.engine._placementPreview.allowed).toBe(true);
    expect(f.engine._ghostMesh.material.opacity).toBe(.03);
    expect(f.engine._ghostEdges.material.opacity).toBe(.22);
    expect(f.engine._hoverGlowMesh.material.opacity).toBeCloseTo(normalHover * .35);
    seed(f, [0, 1, 0]); f.engine.updateGhostPreview();
    expect(f.engine._placementPreview.allowed).toBe(false);
    expect(f.engine._ghostEdges.material.opacity).toBe(.95);
    f.setHits([]); f.engine.updateGhostPreview();
    expect(f.engine._ghostMesh.visible).toBe(false);
    expect(f.engine._placementPreview.code).toBe('no_target');
    expect(f.updates.at(-1).value).toBeNull();
  });
});


describe('history changes publish an immediate UI revision', () => {
  it('publishes once after successful undo and redo of an actual wrapped placement', () => {
    const f = fixture();
    f.engine.placeBlock(2, 1, 3, 'stone', 'quarter', 3);
    expect(f.updates).toEqual([]);
    expect(f.engine.undo()).toBe(true);
    expect(f.engine.blocks['2,1,3']).toBeUndefined();
    expect(f.engine._undoStack).toHaveLength(0); expect(f.engine._redoStack).toHaveLength(1);
    expect(f.updates).toEqual([{ key: 'historyRevision', value: 1 }]);
    expect(f.engine.redo()).toBe(true);
    expect(f.engine.blocks['2,1,3'].userData).toMatchObject({ shape: 'quarter', rotation: 3 });
    expect(f.engine._undoStack).toHaveLength(1); expect(f.engine._redoStack).toHaveLength(0);
    expect(f.updates).toEqual([{ key: 'historyRevision', value: 1 }, { key: 'historyRevision', value: 2 }]);
  });

  it('publishes once after restoring and redoing a removed block', () => {
    const f = fixture();
    const action = { action: 'remove', x: 1, y: 2, z: 3, type: 'stone', shape: 'halfA', rotation: 2 };
    f.engine._undoStack = [action];
    expect(f.engine.undo()).toBe(true);
    expect(f.engine.blocks['1,2,3'].rotation.y).toBe(Math.PI);
    expect(f.engine.redo()).toBe(true);
    expect(f.engine.blocks['1,2,3']).toBeUndefined();
    expect(f.updates).toEqual([{ key: 'historyRevision', value: 1 }, { key: 'historyRevision', value: 2 }]);
  });

  it('leaves empty history and missing removal targets unpublished and unchanged', () => {
    const f = fixture();
    expect(f.engine.undo()).toBe(false); expect(f.engine.redo()).toBe(false);
    expect(f.updates).toEqual([]);
    f.engine._undoStack = [{ action: 'place', x: 0, y: 1, z: 0 }];
    f.engine._redoStack = [{ action: 'remove', x: 1, y: 1, z: 0 }];
    const before = snapshot(f);
    expect(f.engine.undo()).toBe(false); expect(f.engine.redo()).toBe(false);
    expect(snapshot(f)).toEqual(before);
    expect(f.updates).toEqual([]);
    expect(f.engine._historyRevision).toBeUndefined();
  });

  it('disposes undo geometry without disposing the shared block-edge material', () => {
    const f = fixture(), mesh = f.engine.placeBlock(0, 1, 0, 'stone');
    const shared = new THREE.LineBasicMaterial(); shared.userData.gwSharedBlockEdge = true;
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), shared); mesh.add(outline);
    const geometryDisposed = vi.fn(), outlineDisposed = vi.fn(), materialDisposed = vi.fn(), sharedDisposed = vi.fn();
    mesh.geometry.addEventListener('dispose', geometryDisposed);
    mesh.material.addEventListener('dispose', materialDisposed);
    outline.geometry.addEventListener('dispose', outlineDisposed);
    shared.addEventListener('dispose', sharedDisposed);
    expect(f.engine.undo()).toBe(true);
    expect(geometryDisposed).toHaveBeenCalledTimes(1); expect(outlineDisposed).toHaveBeenCalledTimes(1);
    expect(materialDisposed).toHaveBeenCalledTimes(1); expect(sharedDisposed).not.toHaveBeenCalled();
  });
});
