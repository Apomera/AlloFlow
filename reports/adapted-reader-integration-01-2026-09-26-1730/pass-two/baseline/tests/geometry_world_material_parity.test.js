import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

// Geometry World gained eight materials (obsidian ... wool) in the engine's hotbar,
// but the Free Build enhancement and Print Lab kept their own older lists. Anything
// not on those lists fell back to Stone or was refused, so a student's emerald
// tower autosaved to My Worlds as stone, printed as stone, could not be moved,
// rotated, mirrored or recoloured, and its editable JSON would not save. Grass the
// student placed was dropped from the print and the saved draft altogether, while
// the measurement on screen still counted it.
//
// The engine's table is the source of truth. These tests read it and hold the
// other two lists, and every path that relabels materials, to it.
const CORE = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
const BUILDER = readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8');

function coreMaterialIds() {
  const start = CORE.indexOf('var BLOCK_TYPES = [');
  const table = CORE.slice(start, CORE.indexOf('];', start));
  return [...table.matchAll(/\{\s*id:\s*'([a-z_]+)'/g)].map((match) => match[1]);
}

const EDITABLE = 'alloflow-geometry-world/2';
let THREE, builder, printLab;
const originalLab = window.StemLab, originalThree = window.THREE;

beforeAll(() => {
  const exports = {};
  new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, { exports });
  THREE = exports; window.THREE = THREE;
  const lab = resetStemLab();
  lab.registerTool('geometryWorld', { aliases: [], render() { return null; } });
  new Function(BUILDER)();
  builder = window.StemLab.geometryWorldBuilderPure;
  resetStemLab();
  window.StemLab.geometryWorldBuilderPure = builder;
  loadTool('stem_lab/stem_tool_printlab.js', 'printLab');
  printLab = window.StemLab.printLabPure;
});
afterAll(() => { window.StemLab = originalLab; window.THREE = originalThree; });

// A unit cube at a grid cell, tagged the way the engine tags it.
function cube(x, y, z, blockType, layer = 'student') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5); mesh.updateMatrixWorld(true);
  mesh.userData = { blockType, gridPos: { x, y, z }, shape: 'cube', rotation: 0, volume: 1,
    _lessonBlock: layer !== 'student', _measurementLayer: layer };
  return mesh;
}
function engineWith(meshes) {
  const blocks = {};
  meshes.forEach((mesh) => { const p = mesh.userData.gridPos; blocks[[p.x, p.y, p.z].join(',')] = mesh; });
  return { blocks, _currentLesson: { sandbox: true } };
}

describe('Geometry World materials are one list', () => {
  const ids = coreMaterialIds();

  it('reads the engine hotbar (guards this test against an empty parse)', () => {
    expect(ids.length).toBeGreaterThanOrEqual(20);
    expect(ids.slice(0, 3)).toEqual(['stone', 'grass', 'wood']);
    expect(ids).toContain('wool');
  });

  it('the Free Build enhancement lists the same materials in hotbar order', () => {
    // Order matters: toolData.selectedBlock is an index into the hotbar, and the
    // dock names the held material with it. Past index 11 it used to say Torch.
    expect(builder.BLOCK_TYPE_IDS).toEqual(ids);
  });

  it('Print Lab accepts every material in a returning Geometry World source', () => {
    expect([...printLab.GEOMETRY_WORLD_BLOCK_TYPES].sort()).toEqual([...ids].sort());
  });

  it.each(coreMaterialIds())('%s keeps its name through every save, send and edit path', (id) => {
    const block = { x: 2, y: 1, z: -3, type: id, shape: 'cube', rotation: 0 };
    expect(builder.sanitizeSourceBlock(block).type).toBe(id);
    const editable = builder.normalizeEditableWorld({ schema: EDITABLE, blocks: [block] });
    expect(editable.ok, editable.error).toBe(true);
    expect(editable.value.blocks[0].type).toBe(id);
    const source = printLab.sanitizeGeometryWorldSource({ schema: 'alloflow-geometry-world-build/1', blocks: [block] });
    expect(source.blocks[0].type).toBe(id);

    const engine = engineWith([cube(2, 1, -3, id)]);
    engine._builderSelection = { blocks: [{ x: 2, y: 1, z: -3 }] };
    const snapshot = builder.selectionEditSnapshot(engine);
    expect(snapshot.ok, snapshot.reason).toBe(true);
    expect(snapshot.blocks[0].type).toBe(id);
    expect(builder.editableWorld(engine).blocks.map((b) => b.type)).toEqual([id]);
    const stl = builder.buildGeometryWorldStl(engine, [{ x: 2, y: 1, z: -3 }]);
    expect(stl.sourceModel.blocks.map((b) => b.type)).toEqual([id]);
  });

  it('draws each material in its own colour in saved snapshots and portfolios', () => {
    const fills = ids.map((id) => /<polygon[^>]*fill="(#[0-9a-f]{6})"/.exec(builder.activitySnapshotSvg({ blocks: [{ x: 0, y: 1, z: 0, type: id, shape: 'cube', rotation: 0 }] }))[1]);
    expect(new Set(fills).size).toBe(ids.length);
  });

  it('a recolour can use any material, grass included', () => {
    const records = [{ x: 0, y: 1, z: 0, type: 'stone', shape: 'cube', rotation: 0 }];
    ids.forEach((id) => {
      const result = builder.transformCreationBlocks(records, 'recolor', { type: id });
      expect(result.ok, id + ': ' + result.reason).toBe(true);
    });
  });
});

describe('the student\'s own grass is part of their build; the floor is not', () => {
  it('prints and saves a grass block the student placed, and never the ground under it', () => {
    const engine = engineWith([
      cube(0, 0, 0, 'grass', 'ground'),
      cube(0, 1, 0, 'emerald'),
      cube(0, 2, 0, 'grass'),
    ]);
    const bundle = builder.buildGeometryWorldStl(engine, [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 2, z: 0 }]);
    expect(bundle.blockCount).toBe(2);
    // The print source is rebased to its own lowest block.
    expect(bundle.sourceModel.blocks.map((b) => [b.y, b.type])).toEqual([[0, 'emerald'], [1, 'grass']]);
    // Two stacked unit cubes with the shared face removed: 24 - 4 = 20 triangles,
    // one closed shell, 2 blocks high as the on-screen measurement says.
    expect(bundle.triangleCount).toBe(20);
    expect(bundle.topology).toEqual({ openEdges: 0, nonManifoldEdges: 0 });
    expect(bundle.dimensions).toMatchObject({ H: 2 });
    expect(builder.editableWorld(engine).blocks.map((b) => [b.y, b.type])).toEqual([[1, 'emerald'], [2, 'grass']]);
    expect(builder.measurementIsStudentBuild(engine, { blocks: [{ x: 0, y: 2, z: 0 }] })).toBe(true);
    expect(builder.measurementIsStudentBuild(engine, { blocks: [{ x: 0, y: 0, z: 0 }] })).toBe(false);
  });
});
