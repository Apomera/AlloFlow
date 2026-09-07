import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const block = (x = 0, y = 0, z = 0, patch = {}) => ({ x, y, z, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0, ...patch });
const project = (blocks = [block()], name = 'Courtyard', notes = 'Keep the entrance open.') => ({
  format: 'alloflow.architecture-studio', version: 1, project: { name, notes }, blocks,
});
for (const file of files) {
  describe('Architecture projects: ' + file, () => {
    let api;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); api = window.__alloArchProject; });
    it('round-trips Unicode project details and canonical geometry without UI state', () => {
      const state = { blocks: [block(-3, 2, 5, { shape: 'ramp', rotation: 270 })], projectName: '図書館 🌿', projectNotes: 'Line 1\nÉnergie & light', showReplay: true, apiKey: 'never-export', undoStack: [[]] };
      const data = api.create(state), result = api.parse(JSON.stringify(data));
      expect(result.ok).toBe(true);
      expect(result.project).toEqual(data);
      expect(data).toEqual(project(state.blocks, state.projectName, state.projectNotes));
      expect(JSON.stringify(data)).not.toContain('never-export');
      expect(data.blocks[0]).not.toBe(state.blocks[0]);
    });
    it('bounds notebook text when constructing a project from runtime state', () => {
      const data = api.create({ projectName: 'x'.repeat(100), projectNotes: 'y'.repeat(5000), blocks: [] });
      expect(data.project.name).toHaveLength(80);
      expect(data.project.notes).toHaveLength(4000);
      expect(api.parse(data).ok).toBe(true);
    });
    it.each([
      ['broken JSON', '{', 'json'],
      ['oversized text', ' '.repeat(2 * 1024 * 1024 + 1), 'size'],
      ['unrelated file', { blocks: [] }, 'format'],
      ['future version', { ...project(), version: 2 }, 'format'],
      ['invalid notes', { ...project(), project: { name: 'Room', notes: {} } }, 'details'],
      ['oversized name', project([], 'x'.repeat(81)), 'details'],
      ['invalid block collection', { ...project(), blocks: {} }, 'capacity'],
      ['over capacity', project(Array.from({ length: 4097 }, () => block())), 'capacity'],
      ['duplicate cells', project([block(), block()]), 'duplicates'],
      ['unknown shape', project([block(0, 0, 0, { shape: '__proto__' })]), 'blocks'],
      ['unknown material', project([block(0, 0, 0, { material: 'toString' })]), 'blocks'],
      ['CSS color payload', project([block(0, 0, 0, { color: 'url(unsafe)' })]), 'blocks'],
      ['non-quarter rotation', project([block(0, 0, 0, { rotation: 45 })]), 'blocks'],
      ['fractional coordinate', project([block(1.2)]), 'bounds'],
      ['numeric coordinate string', project([block('1')]), 'bounds'],
      ['outside grid', project([block(65)]), 'bounds'],
      ['below ground', project([block(0, -1)]), 'bounds'],
    ])('rejects %s without partial import', (_, input, code) => {
      expect(api.parse(input)).toMatchObject({ ok: false, code });
    });
    it('accepts boundary coordinates and normalizes equivalent rotations and colors', () => {
      const result = api.parse(project([block(-64, 31, 64, { color: '#ABCDEF', rotation: 450 })]));
      expect(result.project.blocks[0]).toMatchObject({ x: -64, y: 31, z: 64, color: '#abcdef', rotation: 90 });
    });
    it('compares revisions by occupied cell and properties, independently of array order', () => {
      const a = [block(), block(1), block(2, 0, 0, { shape: 'roof' })];
      const b = [block(2, 0, 0, { shape: 'roof', rotation: 90 }), block(1, 0, 0, { material: 'wood', color: '#92400e' }), block(3)];
      expect(api.compare(a, b)).toEqual({ added: 1, removed: 1, changed: 2, unchanged: 0, costDelta: -2 });
      expect(api.compare(a, a.slice().reverse())).toEqual({ added: 0, removed: 0, changed: 0, unchanged: 3, costDelta: 0 });
      expect(api.compare([], [])).toEqual({ added: 0, removed: 0, changed: 0, unchanged: 0, costDelta: 0 });
    });
    it('previews replacement without altering the live model or notebook', () => {
      const state = { blocks: [block(10)], projectName: 'Original', projectNotes: 'Original notes', undoStack: [] };
      const result = api.preview(state, project(), 'replace');
      expect(result.ok).toBe(true);
      expect(result.delta).toMatchObject({ added: 1, removed: 1 });
      expect(state).toEqual({ blocks: [block(10)], projectName: 'Original', projectNotes: 'Original notes', undoStack: [] });
    });
    it('opens a whole project as one bounded undo frame, with previous details preserved', () => {
      const state = { blocks: [block(10)], projectName: 'Original', projectNotes: 'Original notes',
        undoStack: Array.from({ length: 50 }, () => []), redoStack: [[block(20)]], filterMaterial: 'glass', viewLayer: 20, showSlice: true };
      const tx = api.commit(state, project(), 'replace');
      expect(tx.state).toMatchObject({ blocks: [block()], projectName: 'Courtyard', projectNotes: 'Keep the entrance open.',
        redoStack: [], filterMaterial: '', viewLayer: -1, showSlice: false, projectImport: null });
      expect(tx.state.undoStack).toHaveLength(50);
      const frame = tx.state.undoStack.at(-1);
      expect(frame).toEqual({ kind: 'arch-project-frame', blocks: [block(10)], projectName: 'Original', projectNotes: 'Original notes', projectSavedId: '' });
      expect(api.frameDetails(frame)).toEqual({ projectName: 'Original', projectNotes: 'Original notes', projectSavedId: '' });
      expect(state.blocks).toEqual([block(10)]);
    });
    it('preserves empty metadata when importing into an unnamed project and supports old history', () => {
      const tx = api.commit({ blocks: [block(10)], undoStack: [[]] }, project(), 'replace');
      expect(api.frameDetails(tx.state.undoStack.at(-1))).toEqual({ projectName: '', projectNotes: '', projectSavedId: '' });
      expect(api.historyFrame({ blocks: [block()] })).toEqual([block()]);
      expect(api.frameDetails([block()])).toEqual({});
      const persisted = JSON.parse(JSON.stringify(tx.state.undoStack));
      expect(window.__alloArchDisplayBlocks([], { showReplay: true, replayStep: 1, undoStack: persisted })).toEqual([block(10)]);
      expect(window.__alloArchDisplayBlocks([], { showReplay: true, replayStep: 0, undoStack: persisted })).toEqual([]);
    });
    it('merges a translated model while retaining current project details and block properties', () => {
      const state = { blocks: [block()], projectName: 'Campus', projectNotes: 'Shared site', undoStack: [] };
      const incoming = project([block(0, 1, 0, { shape: 'door', rotation: 90 })], 'Wing', 'Incoming notes');
      const result = api.commit(state, incoming, 'merge', { dx: 4, dy: 2, dz: -5 });
      expect(result.state.projectName).toBe('Campus');
      expect(result.state.projectNotes).toBe('Shared site');
      expect(result.state.blocks).toEqual([block(), block(4, 3, -5, { shape: 'door', rotation: 90 })]);
      expect(state.blocks).toEqual([block()]);
    });
    it('rechecks occupancy at commit time and leaves failed history unchanged', () => {
      const incoming = project([block()]);
      expect(api.preview({ blocks: [] }, incoming, 'merge', { dx: 4, dy: 0, dz: 0 }).ok).toBe(true);
      const latest = { blocks: [block(4)], undoStack: [], redoStack: [[block(20)]] };
      const tx = api.commit(latest, incoming, 'merge', { dx: 4, dy: 0, dz: 0 });
      expect(tx.result).toMatchObject({ ok: false, code: 'collision', count: 1 });
      expect(tx.state).toBe(latest);
    });
    it('rejects invalid offsets, bounds, capacity, empty merges, and replay edits', () => {
      const state = { blocks: [block()] };
      expect(api.preview(state, project(), 'merge', { dx: '', dy: 0, dz: 0 }).code).toBe('offset');
      expect(api.preview(state, project(), 'merge', { dx: 65, dy: 0, dz: 0 }).code).toBe('bounds');
      expect(api.preview(state, project([]), 'merge', { dx: 1, dy: 0, dz: 0 }).code).toBe('empty');
      expect(api.preview(state, project(), 'other').code).toBe('mode');
      const replay = { ...state, showReplay: true };
      expect(api.commit(replay, project(), 'replace').state).toBe(replay);
      const full = [];
      for (let y = 0; y < 32; y++) for (let x = -64; x < 64; x++) full.push(block(x, y));
      expect(api.preview({ blocks: full }, project(), 'merge', { dx: 0, dy: 0, dz: 1 }).code).toBe('capacity');
    });
    it('recognizes equivalent imports but allows notebook-only changes and explicitly empty projects', () => {
      const state = { blocks: [block()], projectName: 'Courtyard', projectNotes: 'Keep the entrance open.' };
      expect(api.preview(state, project(), 'replace').code).toBe('unchanged');
      expect(api.preview(state, project([block()], 'Courtyard', 'New note'), 'replace').ok).toBe(true);
      const cleared = api.commit(state, project([], 'Blank', ''), 'replace');
      expect(cleared.state.blocks).toEqual([]);
      expect(cleared.state.undoStack.at(-1).blocks).toEqual(state.blocks);
    });
  });
}
it('registers every project label in both translation registries', () => {
  const source = fs.readFileSync(files[0], 'utf8');
  const harvest = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_projects_2026-09-07.json', 'utf8'));
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const match of source.matchAll(/t\('(stem\.archstudio\.project_[^']+)', '((?:\\.|[^'\\])*)'\)/g)) {
      const text = JSON.parse('"' + match[2].replace(/"/g, '\\"') + '"');
      expect(harvest[match[1]], match[1]).toBe(text);
      expect(registry.stem.archstudio[match[1].split('.').at(-1)], match[1]).toBe(text);
    }
  }
});
