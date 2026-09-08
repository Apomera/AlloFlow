import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const block = (x = 0, y = 0, z = 0) => ({ x, y, z, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 });
for (const file of files) {
  describe('Architecture template library: ' + file, () => {
    let api;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); api = window.__alloArchTemplates; });
    it('provides five canonical, independent templates with accurate quantities', () => {
      const catalog = api.catalog();
      expect(catalog.map(t => t.id)).toEqual(['cottage', 'temple', 'tower', 'bridge', 'pyramid']);
      for (const template of catalog) {
        const project = window.__alloArchProject.create({ blocks: template.blocks });
        expect(window.__alloArchProject.parse(project).ok).toBe(true);
        expect(template.count).toBe(template.blocks.length);
        expect(template.cost).toBe(window.__alloArchSchedule.data(template.blocks).credits);
        expect(template.bounds.minY).toBe(0);
        expect(template.blocks.every(b => /^#[0-9a-f]{6}$/i.test(b.color) && b.rotation === 0)).toBe(true);
      }
      catalog[0].blocks[0].x = 64;
      expect(api.catalog()[0].blocks[0].x).toBe(0);
    });
    it.each([
      ['right', -6, -8], ['left', -16, -8], ['forward', -10, -4], ['back', -10, -13],
    ])('places a cottage %s with a one-cell gap and aligned ground', (side, x, z) => {
      const state = { blocks: [block(-10, 4, -8), block(-8, 6, -6)] }, before = JSON.stringify(state);
      const preview = api.proposal(state, 'cottage', side);
      expect(preview.origin).toEqual({ x, y: 0, z });
      expect(preview.result.ok).toBe(true);
      expect(preview.result.blocks).toHaveLength(state.blocks.length + preview.template.count);
      expect(JSON.stringify(state)).toBe(before);
      const placed = preview.result.blocks.slice(state.blocks.length);
      expect(placed[0]).toMatchObject({ x, y: 0, z });
      expect(new Set(preview.result.blocks.map(b => [b.x, b.y, b.z].join(','))).size).toBe(preview.result.blocks.length);
    });
    it('uses the origin in an empty build and rejects unknown IDs and placements', () => {
      expect(api.proposal({ blocks: [] }, 'bridge', 'right').origin).toEqual({ x: 0, y: 0, z: 0 });
      expect(api.proposal({}, 'missing', 'right')).toMatchObject({ ok: false, code: 'template' });
      expect(api.proposal({}, 'cottage', 'unknown')).toMatchObject({ ok: false, code: 'template' });
      expect(api.commit({ blocks: [] }, { id: 'missing' }).result.ok).toBe(false);
    });
    it('rejects boundary overflow while another placement remains available', () => {
      const state = { blocks: [block(64, 0, 64)] };
      expect(api.proposal(state, 'cottage', 'right').result.code).toBe('bounds');
      expect(api.proposal(state, 'cottage', 'back').result.code).toBe('bounds');
      expect(api.proposal(state, 'cottage', 'replace').result.ok).toBe(true);
      expect(api.proposal({ blocks: [block(64, 0, 0)] }, 'cottage', 'left').result.ok).toBe(true);
    });
    it('revalidates the exact preview position and never overwrites a late occupied cell', () => {
      const original = { blocks: [block()] }, preview = api.proposal(original, 'cottage', 'right');
      const next = { ...original, blocks: [...original.blocks, block(preview.origin.x, 0, preview.origin.z)] };
      const tx = api.commit(next, preview.action);
      expect(tx.result).toMatchObject({ ok: false, code: 'collision', count: 1 });
      expect(tx.state).toBe(next);
      expect(tx.state.undoStack).toBeUndefined();
    });
    it('applies templates atomically, preserves project details, and resets hidden views', () => {
      const state = { blocks: [block()], projectName: 'Learning studio', projectNotes: 'Keep notes', projectSavedId: 'saved-one',
        undoStack: [[]], redoStack: [[block(5)]], filterMaterial: 'glass', viewLayer: 31, showSlice: true, sliceZSelected: true, gridCursorX: 64, gridCursorZ: 64 };
      const tx = api.commit(state, api.proposal(state, 'cottage', 'right').action);
      expect(tx.result).toMatchObject({ ok: true, code: 'added' });
      expect(tx.state).toMatchObject({ projectName: state.projectName, projectNotes: state.projectNotes, projectSavedId: state.projectSavedId, redoStack: [], filterMaterial: '', viewLayer: -1, showSlice: false, sliceZSelected: false, gridCursorX: null, gridCursorZ: null });
      expect(tx.state.undoStack).toHaveLength(2);
      expect(tx.state.undoStack[1]).toMatchObject({ kind: 'arch-project-frame', projectName: state.projectName, blocks: state.blocks });
      expect(tx.state.blocks[0]).toEqual(state.blocks[0]);
    });
    it('rejects replay, capacity, and unchanged replacements without recording history', () => {
      const replay = { blocks: [], showReplay: true, undoStack: [[]] };
      expect(api.commit(replay, api.proposal(replay, 'cottage', 'right').action).state).toBe(replay);
      const full = { blocks: Array.from({ length: 4096 }, (_, i) => block(-64 + i % 128, 0, -16 + Math.floor(i / 128))) };
      expect(api.commit(full, api.proposal(full, 'cottage', 'right').action)).toMatchObject({ state: full, result: { ok: false, code: 'capacity' } });
      const state = { blocks: api.catalog()[0].blocks };
      const tx = api.commit(state, api.proposal(state, 'cottage', 'replace').action);
      expect(tx.result.code).toBe('unchanged'); expect(tx.state).toBe(state);
    });
    it('bounds replacement history and preserves all template properties', () => {
      const state = { blocks: [block(20)], undoStack: Array.from({ length: 50 }, () => [block()]) };
      const preview = api.proposal(state, 'temple', 'replace'), tx = api.commit(state, preview.action);
      expect(tx.result.code).toBe('replaced');
      expect(tx.state.undoStack).toHaveLength(50);
      expect(tx.state.blocks).toEqual(preview.template.blocks);
      expect(state.blocks).toEqual([block(20)]);
    });
    function render(patch = {}) {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: [block()], editorView: 'grid', showTemplates: true, ...patch } });
      return host;
    }
    it('offers labeled previews and separate apply controls without changing the model', () => {
      const host = render(), panel = host.querySelector('#arch-template-library');
      expect(host.querySelector('#arch-studio-tools').firstElementChild).toBe(panel);
      expect(panel.querySelector('select[aria-label="Choose a template"]').options).toHaveLength(5);
      expect(panel.querySelector('.arch-template-preview svg').getAttribute('aria-label')).toBe('Front elevation');
      expect(panel.querySelector('[data-arch-template-apply]').textContent).toBe('Add template to build');
      expect(panel.textContent).toContain('only changes this preview');
      expect(panel.textContent).toContain('one empty cell');
      expect(host.querySelector('#arch-template-toggle').getAttribute('aria-expanded')).toBe('true');
    });
    it('renders a genuine selected-floor plan with no unrelated section marker', () => {
      const panel = render({ templateView: 'plan', templateFloor: 2 }).querySelector('#arch-template-library');
      expect(panel.querySelector('select[aria-label="Preview floor"]').value).toBe('2');
      expect(panel.querySelector('.arch-template-preview svg').getAttribute('aria-label')).toContain('Floor plan · Y=2');
      expect(panel.querySelectorAll('[data-drawing-cell]').length).toBe(api.catalog()[0].blocks.filter(b => b.y === 2).length);
      expect(panel.querySelector('[data-drawing-cut]')).toBeNull();
    });
    it('allows browsing in replay while disabling application with an explanation', () => {
      const panel = render({ showReplay: true, undoStack: [[]] }).querySelector('#arch-template-library');
      expect(panel.querySelector('select[aria-label="Choose a template"]').disabled).toBe(false);
      const apply = panel.querySelector('[data-arch-template-apply]');
      expect(apply.disabled).toBe(true);
      expect(panel.querySelector('#' + apply.getAttribute('aria-describedby')).textContent).toContain('browse templates during replay');
    });
    it('states replacement consequences and keeps boundary failures visible', () => {
      const panel = render({ templatePlacement: 'replace' }).querySelector('#arch-template-library');
      expect(panel.querySelector('[data-arch-template-apply]').textContent).toBe('Replace build with template');
      expect(panel.textContent).toContain('Replace the current 1 blocks.');
      const failed = render({ blocks: [block(64, 0, 0)] }).querySelector('#arch-template-library');
      expect(failed.querySelector('[data-arch-template-apply]').disabled).toBe(true);
      expect(failed.querySelector('#arch-template-warning').textContent).toContain('build area');
    });
  });
}
it('keeps template code and all new translated labels synchronized', () => {
  expect(fs.readFileSync(files[0]).equals(fs.readFileSync(files[1]))).toBe(true);
  resetStemLab(); loadTool(files[0], 'archStudio');
  const harvest = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_templates_2026-09-08.json', 'utf8'));
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(file, 'utf8')).stem.archstudio;
    for (const [key, value] of Object.entries(window.__alloArchTemplates.labels)) {
      expect(registry['template_' + key]).toBe(value);
      expect(harvest['stem.archstudio.template_' + key]).toBe(value);
    }
  }
});
