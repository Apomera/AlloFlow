import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const room = (patch = {}) => ({ kind: 'room', x: 0, y: 0, z: 0, width: 6, depth: 5, height: 3, door: true, windows: true, ceiling: false, material: 'stone', ...patch });
const block = (x, y, z, patch = {}) => ({ x, y, z, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0, ...patch });
for (const file of files) {
  describe('Architecture design engine: ' + file, () => {
    let design;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); design = window.__alloArchDesign; });
    it('generates a hollow room with an intact base, oriented windows, and a front door', () => {
      const result = design.generate(room());
      expect(result.ok).toBe(true);
      expect(result.blocks).toHaveLength(84);
      expect(result.interior).toBe(12);
      expect(result.footprint).toBe(30);
      expect(result.blocks.filter(b => b.y === 0)).toHaveLength(30);
      expect(result.blocks.some(b => b.x === 2 && b.z === 2 && b.y === 1)).toBe(false);
      expect(result.blocks.find(b => b.shape === 'door')).toMatchObject({ x: 3, y: 1, z: 0, material: 'wood' });
      expect(result.blocks.filter(b => b.shape === 'window' && b.x === 0).every(b => b.rotation === 90)).toBe(true);
      expect(new Set(result.blocks.map(b => [b.x, b.y, b.z].join())).size).toBe(84);
      expect(result.blocks.every(b => /^#[0-9a-f]{6}$/.test(b.color))).toBe(true);
      expect(result.cost).toBe(result.blocks.reduce((n, b) => n + ({stone: 5, wood: 3, glass: 12})[b.material], 0));
    });
    it('builds a ceiling on a separate layer and translates the complete room', () => {
      const result = design.generate(room({ x: -12, y: 2, z: -6, ceiling: true, door: false, windows: false }));
      expect(result.blocks).toHaveLength(114);
      expect(result.bounds).toEqual({ minX: -12, maxX: -7, minY: 2, maxY: 6, minZ: -6, maxZ: -2 });
      expect(result.blocks.filter(b => b.y === 6 && b.shape === 'slab')).toHaveLength(30);
      expect(result.blocks.every(b => b.material === 'stone')).toBe(true);
    });
    it('builds independent walls and floor slabs without room-only options', () => {
      const wall = design.generate(room({ kind: 'wall', width: 5, height: 4, depth: '', ceiling: true }));
      expect(wall.blocks).toHaveLength(20);
      expect(wall.blocks.every(b => b.z === 0 && b.shape === 'block')).toBe(true);
      const floor = design.generate(room({ kind: 'floor', width: 4, depth: 5, height: '' }));
      expect(floor.blocks).toHaveLength(20);
      expect(floor.blocks.every(b => b.y === 0 && b.shape === 'slab')).toBe(true);
    });
    it.each(['', ' ', null, false, NaN, Infinity, 3.5, -1, 33])('rejects invalid room width %s', width => {
      expect(design.generate(room({ width }))).toMatchObject({ ok: false, code: 'invalid', blocks: [] });
    });
    it('rejects out-of-bounds and oversized generation without clipping', () => {
      expect(design.generate(room({ x: 62 }))).toMatchObject({ ok: false, code: 'bounds' });
      expect(design.generate(room({ y: 28, ceiling: true }))).toMatchObject({ ok: false, code: 'bounds' });
      expect(design.generate(room({ width: 32, depth: 32, height: 30 }))).toMatchObject({ ok: false, code: 'capacity', blocks: [] });
      expect(design.generate(room({ kind: 'unexpected' })).ok).toBe(false);
    });
    it('rejects an entire generated room when even one cell collides', () => {
      const before = [block(1, 0, 1)];
      const result = design.apply(before, { type: 'build', spec: room() });
      expect(result).toMatchObject({ ok: false, code: 'collision', count: 1 });
      expect(result.blocks).toBe(before);
      expect(design.apply(before, { type: 'build', spec: room({ x: 8 }) }).blocks).toHaveLength(85);
    });
    it('normalizes reversed corners and selects all layers regardless of order', () => {
      const list = [block(-2, 1, 0), block(0, 0, 0), block(1, 1, 0)];
      const region = { minX: 0, maxX: -2, minY: 1, maxY: 0, minZ: 0, maxZ: 0 };
      expect(design.select(list, region)).toEqual(list.slice(0, 2));
      expect(design.select(list, { ...region, minY: '' })).toEqual([]);
    });
    it('moves a region through its own old cells and preserves block properties and order', () => {
      const list = [block(0, 0, 0, { shape: 'ramp', rotation: 270 }), block(8, 0, 0), block(1, 0, 0)];
      const region = design.bounds([list[0], list[2]]);
      const result = design.apply(list, { type: 'move', region, dx: 1, dy: 2, dz: -3 });
      expect(result.ok).toBe(true);
      expect(result.blocks[0]).toMatchObject({ x: 1, y: 2, z: -3, shape: 'ramp', rotation: 270 });
      expect(result.blocks[1]).toBe(list[1]);
      expect(result.blocks[2]).toMatchObject({ x: 2, y: 2, z: -3 });
      expect(result.selection).toEqual({ minX: 1, maxX: 2, minY: 2, maxY: 2, minZ: -3, maxZ: -3 });
      expect(list[0].x).toBe(0);
    });
    it('rejects collisions and downward/outward moves without changing source data', () => {
      const list = [block(0, 0, 0), block(1, 0, 0)];
      const region = design.bounds([list[0]]);
      for (const [offset, code] of [[{dx: 1, dy: 0, dz: 0}, 'collision'], [{dx: 0, dy: -1, dz: 0}, 'bounds'], [{dx: 65, dy: 0, dz: 0}, 'bounds'], [{dx: '', dy: 0, dz: 0}, 'invalid']]) {
        const result = design.apply(list, { type: 'move', region, ...offset });
        expect(result).toMatchObject({ ok: false, code });
        expect(result.blocks).toBe(list);
      }
    });
    it('rotates a rectangular group in the same positive-Y direction as the renderer', () => {
      const list = [block(4, 1, -2, { shape: 'ramp', rotation: 270 }), block(6, 1, -1)];
      let current = list;
      const rotated = design.apply(current, { type: 'rotate', region: design.bounds(current) });
      expect(rotated.blocks).toEqual([block(4, 1, 0, { shape: 'ramp', rotation: 0 }), block(5, 1, -2, { rotation: 90 })]);
      for (let i = 0; i < 4; i++) current = design.apply(current, { type: 'rotate', region: design.bounds(current) }).blocks;
      expect(current).toEqual(list);
    });
    it('copies a selection independently and never overlaps its source', () => {
      const list = [block(0, 0, 0), block(1, 0, 0)];
      const region = design.bounds(list);
      expect(design.apply(list, { type: 'duplicate', region, dx: 1, dy: 0, dz: 0 })).toMatchObject({ ok: false, code: 'collision' });
      const result = design.apply(list, { type: 'duplicate', region, dx: 4, dy: 0, dz: 0 });
      expect(result.blocks).toHaveLength(4);
      expect(result.blocks[0]).toBe(list[0]);
      expect(result.blocks[2]).not.toBe(list[0]);
      expect(result.selection.minX).toBe(4);
    });
    it('paints and deletes only selected cells, with no-op detection', () => {
      const list = [block(0, 0, 0, { shape: 'door', rotation: 90 }), block(4, 0, 0)];
      const region = design.bounds([list[0]]);
      const painted = design.apply(list, { type: 'paint', region, material: 'wood', color: '#123456' });
      expect(painted.blocks[0]).toMatchObject({ material: 'wood', color: '#123456', shape: 'door', rotation: 90 });
      expect(painted.blocks[1]).toBe(list[1]);
      expect(design.apply(painted.blocks, { type: 'paint', region, material: 'wood', color: '#123456' })).toMatchObject({ ok: false, code: 'unchanged' });
      expect(design.apply(list, { type: 'delete', region }).blocks).toEqual([list[1]]);
      expect(design.apply(list, { type: 'pick', region }).ok).toBe(false);
    });
    it('enforces the global block limit atomically', () => {
      const list = [];
      for (let y = 0; y < 32; y++) for (let x = -64; x < 64; x++) list.push(block(x, y, 0));
      const result = design.apply(list, { type: 'duplicate', region: design.bounds([list[0]]), dx: 0, dy: 0, dz: 1 });
      expect(result).toMatchObject({ ok: false, code: 'capacity' });
      expect(result.blocks).toBe(list);
    });
    it('records one bounded undo transaction and reveals edits hidden by view filters', () => {
      const before = [block(30, 0, 0)];
      const state = { blocks: before, undoStack: Array.from({length: 50}, () => []), redoStack: [[block(31, 0, 0)]],
        viewLayer: 20, filterMaterial: 'wood', filterShape: 'door', showSlice: true, selectedBlockKey: '30,0,0', quakeResult: {} };
      const tx = design.commit(state, { type: 'build', spec: room() });
      expect(tx.state.blocks).toHaveLength(85);
      expect(tx.state.undoStack).toHaveLength(50);
      expect(tx.state.undoStack.at(-1)).toEqual(before);
      expect(tx.state.undoStack.at(-1)).not.toBe(before);
      expect(tx.state).toMatchObject({ redoStack: [], viewLayer: -1, filterMaterial: '', filterShape: '', showSlice: false, selectedBlockKey: '', quakeResult: null });
      expect(state.blocks).toBe(before);
      expect(tx.state.materialsUsed).toMatchObject({ stone: true, wood: true, glass: true });
    });
    it('revalidates against latest state and leaves failed or replay transactions untouched', () => {
      const state = { blocks: [block(1, 0, 1)], undoStack: [], redoStack: [[block(1, 2, 1)]] };
      expect(design.commit(state, { type: 'build', spec: room() }).state).toBe(state);
      const replay = { ...state, showReplay: true };
      expect(design.commit(replay, { type: 'delete', region: design.bounds(state.blocks) })).toMatchObject({ state: replay, result: {ok: false, code: 'replay'} });
      expect(design.commit(replay, { type: 'delete', region: design.bounds(state.blocks) }).state).toBe(replay);
    });
  });
}
it('keeps deploy assets byte-identical', () => {
  expect(fs.readFileSync(files[0], 'utf8')).toBe(fs.readFileSync(files[1], 'utf8'));
});

it('registers every workbench label in both translation registries', () => {
  const source = fs.readFileSync(files[0], 'utf8');
  const harvest = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_design_2026-09-07.json', 'utf8'));
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const match of source.matchAll(/t\('(stem\.archstudio\.design_[^']+)', '((?:\\.|[^'\\])*)'\)/g)) {
      const text = JSON.parse('"' + match[2].replace(/"/g, '\\"') + '"');
      expect(harvest[match[1]], match[1]).toBe(text);
      expect(registry.stem.archstudio[match[1].split('.').at(-1)], match[1]).toBe(text);
    }
  }
});
