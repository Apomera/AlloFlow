import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const block = (x, y, z, extra = {}) => ({ x, y, z, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0, ...extra });
for (const file of files) {
  describe('Architecture Studio repeated layouts: ' + file, () => {
    let api, design;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); api = window.__alloArchRepeat; design = window.__alloArchDesign; });
    const action = (patch = {}) => ({ type: 'repeat', region: { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 0 }, count: 3, dx: 3, dy: 0, dz: 0, ...patch });
    it('makes independent copies at successive offsets and preserves shape, color, rotation, and the original', () => {
      const original = [block(0, 0, 0, { shape: 'ramp', rotation: 270, material: 'wood', color: '#123456' }), block(1, 1, 0), block(-8, 0, 0)];
      const result = design.apply(original, action());
      expect(result).toMatchObject({ ok: true, code: 'repeated', count: 6, addedCost: 24, selection: design.bounds(original.slice(0, 2)) });
      expect(result.blocks).toHaveLength(9);
      expect(result.blocks.slice(0, 3)).toEqual(original);
      expect(result.blocks[0]).toBe(original[0]);
      expect(result.blocks[3]).toEqual({ ...original[0], x: 3 });
      expect(result.blocks[7]).toEqual({ ...original[0], x: 9 });
      expect(result.blocks[3]).not.toBe(original[0]);
      expect(new Set(result.blocks.map(b => [b.x, b.y, b.z].join())).size).toBe(9);
    });
    it('supports negative and combined spacing with the full model including other floors', () => {
      const original = [block(0, 1, 0)];
      const result = api.plan(original, action({ count: 2, dx: -3, dy: 2, dz: -4 }));
      expect(result.ok).toBe(true);
      expect(result.copies.map(c => c[0])).toEqual([block(-3, 3, -4), block(-6, 5, -8)]);
      expect(result.bounds).toEqual({ minX: -6, maxX: 0, minY: 1, maxY: 5, minZ: -8, maxZ: 0 });
    });
    it.each(['', ' ', null, false, NaN, Infinity, 0, -1, 1.5, 13, 1000000])('rejects invalid copy count %s before generating copies', count => {
      const original = [block(0, 0, 0)];
      const result = api.plan(original, action({ count }));
      expect(result).toMatchObject({ ok: false, code: 'repeat_count', blocks: original });
      expect(result.blocks).toBe(original);
      expect(result.copies).toBeUndefined();
    });
    it('allows one copy and the maximum of twelve', () => {
      expect(api.plan([block(0, 0, 0)], action({ count: 1 })).blocks).toHaveLength(2);
      expect(api.plan([block(0, 0, 0)], action({ count: 12 })).blocks).toHaveLength(13);
    });
    it.each([{ dx: '' }, { dy: 1.5 }, { dz: 129 }])('refuses malformed spacing %j', patch => {
      expect(api.plan([block(0, 0, 0)], action(patch))).toMatchObject({ ok: false, code: 'invalid' });
    });
    it('refuses zero spacing and empty or invalid selections', () => {
      expect(api.plan([block(0, 0, 0)], action({ dx: 0 }))).toMatchObject({ ok: false, code: 'unchanged' });
      expect(api.plan([], action())).toMatchObject({ ok: false, code: 'empty' });
      expect(api.plan([block(0, 0, 0)], action({ region: {} }))).toMatchObject({ ok: false, code: 'region' });
    });
    it('rejects the whole operation if the last copy hits an existing cell', () => {
      const original = [block(0, 0, 0), block(9, 0, 0)];
      const result = design.apply(original, action());
      expect(result).toMatchObject({ ok: false, code: 'collision', count: 1, conflictKeys: { '9,0,0': true } });
      expect(result.blocks).toBe(original);
      expect(result.copies).toHaveLength(3);
    });
    it('detects collisions between new copies even when the first copy clears the source', () => {
      const original = [block(0, 0, 0), block(2, 0, 0)];
      const result = api.plan(original, action({ region: design.bounds(original), dx: 1, count: 3 }));
      expect(result).toMatchObject({ ok: false, code: 'collision', count: 2 });
      expect(Object.keys(result.conflictKeys).sort()).toEqual(['2,0,0', '3,0,0']);
      expect(result.blocks).toBe(original);
    });
    it.each([{ dx: 22 }, { dx: -22 }, { dy: 11 }, { dy: -1 }, { dz: 22 }, { dz: -22 }])('checks the last copy against all bounds %j', patch => {
      const original = [block(0, 0, 0)];
      expect(api.plan(original, action(patch))).toMatchObject({ ok: false, code: 'bounds', blocks: original });
    });
    it('rejects over-capacity layouts before allocating previews', () => {
      const original = [];
      for (let x = 0; x < 32; x++) for (let z = 0; z < 32; z++) original.push(block(x, 0, z));
      const result = api.plan(original, action({ region: design.bounds(original), count: 4, dx: 0, dy: 1 }));
      expect(result).toMatchObject({ ok: false, code: 'capacity' });
      expect(result.blocks).toBe(original);
      expect(result.copies).toBeUndefined();
      expect(api.plan(original, action({ region: design.bounds(original), count: 3, dx: 0, dy: 1 })).blocks).toHaveLength(4096);
    });
    it('sets rows one cell apart and stacks directly above the occupied selection height', () => {
      const source = [block(-4, 2, -6), block(0, 5, -3)];
      expect(api.preset(source, 'x')).toEqual({ dx: 6, dy: 0, dz: 0 });
      expect(api.preset(source, 'z')).toEqual({ dx: 0, dy: 0, dz: 5 });
      expect(api.preset(source, 'y')).toEqual({ dx: 0, dy: 4, dz: 0 });
      expect(api.preset([], 'x')).toBeNull();
      expect(api.preset(source, 'oops')).toBeNull();
    });
    it('projects elevation upward and never treats projected overlap as a 3D collision', () => {
      const result = api.plan([block(0, 0, 0)], action({ dx: 0, dy: 2, count: 2 }));
      const plan = api.projection(result, 'plan'), front = api.projection(result, 'front');
      expect(plan).toMatchObject({ width: 1, height: 1 });
      expect(plan.groups.every(g => g.cells.length === 1 && !g.cells[0].conflict)).toBe(true);
      expect(front).toMatchObject({ width: 1, height: 5 });
      expect(front.groups.map(g => g.cells[0].y)).toEqual([4, 2, 0]);
      expect(api.projection({ ok: false }, 'plan')).toBeNull();
    });
    it('marks conflicting projected cells using full 3D keys', () => {
      const result = api.plan([block(0, 0, 0), block(3, 0, 0)], action({ count: 1 }));
      const preview = api.projection(result, 'plan');
      expect(preview.groups[0].cells[0].conflict).toBe(false);
      expect(preview.groups[1].cells[0]).toMatchObject({ x: 3, y: 0, conflict: true });
    });
    it('commits every copy as one project-aware undo frame and preserves the original selection', () => {
      const blocks = [block(0, 0, 0)];
      const state = { blocks, projectName: 'Gallery', projectNotes: 'Three columns', projectSavedId: 'saved', undoStack: [], redoStack: [blocks], filterMaterial: 'glass', showSlice: true };
      const tx = design.commit(state, action());
      expect(tx.state.blocks).toHaveLength(4);
      expect(tx.state.undoStack).toEqual([{ kind: 'arch-project-frame', blocks, projectName: 'Gallery', projectNotes: 'Three columns', projectSavedId: 'saved' }]);
      expect(tx.state).toMatchObject({ projectName: 'Gallery', redoStack: [], filterMaterial: '', showSlice: false, designRegion: design.bounds(blocks) });
      expect(state.blocks).toBe(blocks);
      expect(state.undoStack).toEqual([]);
    });
    it('rechecks late collisions and refuses replay without changing history or metadata', () => {
      const state = { blocks: [block(0, 0, 0)], projectName: 'Keep', undoStack: [], redoStack: [[block(1, 0, 0)]] };
      expect(design.apply(state.blocks, action()).ok).toBe(true);
      state.blocks.push(block(9, 0, 0));
      expect(design.commit(state, action()).state).toBe(state);
      const replay = { ...state, showReplay: true };
      expect(design.commit(replay, action())).toMatchObject({ state: replay, result: { code: 'replay' } });
      expect(design.commit(replay, action()).state).toBe(replay);
    });
    it('renders named controls and a preview legend without announcing each spacing keystroke', () => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: [block(0, 0, 0)], showDesign: true, designTab: 'region', designOperation: 'repeat', editorView: 'grid' } });
      const repeat = host.querySelector('[data-arch-repeat]');
      expect(repeat.querySelector('[aria-label="New copies"]').getAttribute('max')).toBe('12');
      expect(repeat.querySelector('[aria-label="Spacing presets"]').querySelectorAll('button')).toHaveLength(3);
      const img = repeat.querySelector('[role="img"]');
      expect(host.querySelector('#' + img.getAttribute('aria-describedby')).textContent).toContain('Dashed outlines');
      expect(repeat.querySelector('select').getAttribute('aria-label')).toBe('Preview view');
      expect(repeat.querySelector('[aria-live]')).toBeNull();
      expect(repeat.querySelectorAll('[data-arch-repeat-copy]')).toHaveLength(4);
      expect(host.querySelector('[data-arch-design-apply]').getAttribute('aria-describedby')).toBe('arch-repeat-help');
    });
  });
}
it('keeps source/public and every repeat label synchronized with the harvest', () => {
  expect(fs.readFileSync(files[0]).equals(fs.readFileSync(files[1]))).toBe(true);
  resetStemLab(); loadTool(files[0], 'archStudio');
  const labels = window.__alloArchRepeat.labels;
  const harvest = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_repeat_2026-09-07.json', 'utf8'));
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(file, 'utf8')).stem.archstudio;
    for (const [key, value] of Object.entries(labels)) {
      expect(registry['repeat_' + key]).toBe(value);
      expect(harvest['stem.archstudio.repeat_' + key]).toBe(value);
    }
  }
});
