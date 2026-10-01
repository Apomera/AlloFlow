import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const block = (x, patch = {}) => ({ x, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0, ...patch });
const model = [block(0), block(1, { material: 'wood' }), block(2, { material: 'wood', shape: 'ramp', y: 1 }), block(3, { material: 'glass', shape: 'ramp', z: -1 })];
for (const file of files) {
  describe('Architecture block filters: ' + file, () => {
    let summary;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); summary = window.__alloArchFilters.summary; });
    const dom = (state = {}) => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: model, editorView: 'grid', showFilter: true, ...state } });
      return host;
    };
    it('counts intersections while keeping only the opposite facet in each choice count', () => {
      expect(summary(model, 'wood', 'ramp')).toEqual({ total: 4, count: 1,
        materials: { wood: 1, glass: 1 }, shapes: { block: 1, ramp: 1 }, allMaterials: 2, allShapes: 2 });
    });
    it('counts the whole frame without filters', () => {
      expect(summary(model)).toEqual({ total: 4, count: 4,
        materials: { stone: 1, wood: 2, glass: 1 }, shapes: { block: 2, ramp: 2 }, allMaterials: 4, allShapes: 4 });
    });
    it('treats invalid filters as unselected, consistent with restored views', () => {
      expect(summary(model, 'lava', 'sphere')).toEqual(summary(model));
    });
    it('keeps available alternative counts for a combination with no matches', () => {
      expect(summary(model, 'stone', 'ramp')).toMatchObject({ count: 0, materials: { wood: 1, glass: 1 }, shapes: { block: 1 }, allMaterials: 2, allShapes: 1 });
    });
    it('normalizes legacy blocks and supports retained project frames', () => {
      expect(summary({ kind: 'arch-project-frame', blocks: [{ x: 0, y: 0, z: 0 }] }, 'stone', 'block')).toMatchObject({ total: 1, count: 1, materials: { stone: 1 }, shapes: { block: 1 } });
    });
    it('returns empty counts without inventing geometry', () => {
      expect(summary(null, 'wood', 'ramp')).toEqual({ total: 0, count: 0, materials: {}, shapes: {}, allMaterials: 0, allShapes: 0 });
    });
    it('leaves the supplied frame and project data unchanged', () => {
      const input = Object.freeze({ kind: 'arch-project-frame', blocks: Object.freeze(model.map(b => Object.freeze({ ...b }))), projectName: 'Keep' });
      const before = JSON.stringify(input); summary(input, 'wood', 'ramp'); expect(JSON.stringify(input)).toBe(before);
    });
    it('places one named panel ahead of the authoring palette', () => {
      const host = dom(), panel = host.querySelector('#arch-filter-panel');
      expect(host.querySelector('#arch-studio-tools').firstElementChild).toBe(panel);
      expect(host.querySelectorAll('#arch-filter-panel')).toHaveLength(1);
      expect(panel.getAttribute('aria-labelledby')).toBe('arch-filter-heading');
      expect(panel.querySelector('#arch-filter-heading').tabIndex).toBe(-1);
      expect(panel.querySelector('[role=status]').getAttribute('aria-atomic')).toBe('true');
    });
    it('labels all shapes and materials and exposes their selected state and counts', () => {
      const panel = dom({ filterMaterial: 'wood', filterShape: 'ramp' }).querySelector('#arch-filter-panel');
      expect(panel.querySelectorAll('.arch-filter-materials button')).toHaveLength(6);
      expect(panel.querySelectorAll('.arch-filter-shapes button')).toHaveLength(12);
      for (const button of panel.querySelectorAll('.arch-filter-choice')) {
        expect(button.textContent).toContain(button.querySelector('.arch-filter-choice-label').textContent);
        expect(button.hasAttribute('aria-pressed')).toBe(true);
        expect(panel.querySelector('#' + button.getAttribute('aria-describedby'))).not.toBeNull();
      }
      expect(panel.querySelector('[aria-label="Filter by Wood material"]').getAttribute('aria-pressed')).toBe('true');
      expect(panel.querySelector('#arch-filter-material-count-glass').textContent).toBe('1');
      expect(panel.querySelector('#arch-filter-shape-count-block').textContent).toBe('1');
      expect(panel.querySelectorAll('.arch-filter-shapes svg[aria-hidden=true]')).toHaveLength(12);
    });
    it('separates matching blocks from those hidden by the current floor and section', () => {
      const panel = dom({ filterMaterial: 'wood', viewLayer: 0, showSlice: true, sliceZSelected: true, sliceZ: -1 }).querySelector('#arch-filter-panel');
      expect(panel.querySelector('[data-arch-filter-result]').textContent).toBe('2 of 4 blocks match');
      expect(panel.querySelector('[data-arch-filter-visible]').textContent).toBe('0 visible in 3D');
      expect(panel.querySelector('.arch-filter-hidden').textContent).toContain('Reveal matches across floors and sections');
      expect(panel.querySelector('.arch-filter-grid-note').textContent).toContain('full editing floor');
    });
    it('follows replay frames instead of counting the live build', () => {
      const panel = dom({ showReplay: true, undoStack: [[model[1]]], replayStep: 0, filterMaterial: 'wood' }).querySelector('#arch-filter-panel');
      expect(panel.querySelector('.arch-filter-scope').textContent).toBe('Replay step 1 of 2');
      expect(panel.querySelector('[data-arch-filter-result]').textContent).toBe('1 matching block out of 1');
      expect(panel.querySelector('#arch-filter-material-count-wood').textContent).toBe('1');
      expect(panel.querySelector('.arch-filter-remove').disabled).toBe(true);
      expect(panel.querySelector('#arch-filter-remove-help').textContent).toContain('Return to the live build');
    });
    it.each([
      [{ blocks: [] }, 'This build has no blocks yet.'],
      [{ showReplay: true, undoStack: [[]], replayStep: 0 }, 'This replay step has no blocks.'],
      [{ filterMaterial: 'stone', filterShape: 'ramp' }, 'No blocks match.']
    ])('explains an empty result for %j', (state, message) => {
      const panel = dom(state).querySelector('#arch-filter-panel');
      expect(panel.querySelector('.arch-filter-empty').textContent).toContain(message);
      expect(panel.querySelector('.arch-filter-remove').disabled).toBe(true);
    });
    it('keeps bulk edits separate and describes the full live-build scope', () => {
      const panel = dom({ filterMaterial: 'wood' }).querySelector('#arch-filter-panel');
      expect(panel.querySelector('details').open).toBe(false);
      expect(panel.querySelector('.arch-filter-remove').disabled).toBe(false);
      expect(panel.querySelector('#arch-filter-remove-help').textContent).toContain('across all floors and sections');
      expect(panel.querySelector('.arch-filter-remove').getAttribute('aria-describedby')).toBe('arch-filter-remove-help');
      expect(dom().querySelector('.arch-filter-remove').disabled).toBe(true);
    });
    it('omits the panel when closed while retaining view filter state', () => {
      const host = dom({ showFilter: false, filterMaterial: 'wood' });
      expect(host.querySelector('#arch-filter-panel')).toBeNull();
      expect(host.querySelector('.arch-studio-view-hud').textContent).toContain('Wood');
    });
  });
}
it('mirrors the implementation and registers the harvested labels', () => {
  expect(fs.readFileSync(files[0], 'utf8')).toBe(fs.readFileSync(files[1], 'utf8'));
  const labels = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_filters_2026-09-09.json', 'utf8'));
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(file, 'utf8')).stem.archstudio;
    for (const [key, value] of Object.entries(labels)) expect(registry[key.replace('stem.archstudio.', '')]).toBe(value);
  }
});
