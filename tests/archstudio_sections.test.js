import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const block = (x, z, patch = {}) => ({ x, y: 0, z, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0, ...patch });
const model = [block(-1, -2), block(0, -1), block(1, -1, { y: 1, shape: 'ramp', material: 'wood' }), block(2, 3)];
for (const file of files) {
  describe('Architecture section explorer: ' + file, () => {
    let summary;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); summary = window.__alloArchSections.summary; });
    const dom = (state = {}) => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: model, editorView: 'grid', showSlice: true, ...state } });
      return host;
    };
    it('sorts occupied depths and counts the entire frame', () => {
      expect(summary(model, -1, false)).toMatchObject({ total: 4, selectedZ: null, count: 4, blocks: [], previous: null, next: -2,
        levels: [{ z: -2, count: 1 }, { z: -1, count: 2 }, { z: 3, count: 1 }] });
    });
    it('distinguishes negative-one depth from the all-depths state', () => {
      const result = summary(model, -1, true);
      expect(result).toMatchObject({ selectedZ: -1, count: 2, previous: -2, next: 3 });
      expect(result.blocks.map(b => [b.x, b.y])).toEqual([[1, 1], [0, 0]]);
    });
    it('navigates to adjacent occupied depths across empty gaps', () => {
      expect(summary(model, 0, true)).toMatchObject({ count: 0, selectedZ: 0, previous: -1, next: 3 });
      expect(summary(model, -2, true)).toMatchObject({ previous: null, next: -1 });
      expect(summary(model, 3, true)).toMatchObject({ previous: -1, next: null });
    });
    it.each([-64, 64])('retains valid but empty restored depth %s', z => {
      expect(summary(model, z, true)).toMatchObject({ count: 0, selectedZ: z });
    });
    it.each(['bad', -65, 65])('ignores invalid depth %s', z => {
      expect(summary(model, z, true)).toMatchObject({ count: 4, selectedZ: null });
    });
    it('rounds persisted fractional depths consistently with the viewport', () => {
      expect(summary(model, 1.5, true)).toMatchObject({ count: 0, selectedZ: 2 });
    });
    it('supports legacy blocks inside retained project frames', () => {
      expect(summary({ kind: 'arch-project-frame', blocks: [{ x: 0, y: 1, z: -1 }] }, '-1', true)).toMatchObject({ count: 1, blocks: [{ shape: 'block', material: 'stone' }] });
    });
    it('does not sort or mutate the input model', () => {
      const frame = Object.freeze(model.map(b => Object.freeze({ ...b }))), before = JSON.stringify(frame);
      summary(frame, -1, true); expect(JSON.stringify(frame)).toBe(before);
    });
    it('puts one named explorer ahead of the authoring palette', () => {
      const host = dom(), panel = host.querySelector('#arch-section-panel');
      expect(host.querySelectorAll('#arch-section-panel')).toHaveLength(1);
      expect(host.querySelector('#arch-studio-tools').firstElementChild).toBe(panel);
      expect(panel.getAttribute('aria-labelledby')).toBe('arch-section-heading');
      expect(panel.querySelector('#arch-section-heading').tabIndex).toBe(-1);
      expect(panel.querySelector('label').htmlFor).toBe('arch-section-depth');
      expect(panel.querySelector('#arch-section-depth').getAttribute('aria-label')).toBe('Depth (Z)');
    });
    it('shows an overview before choosing a depth', () => {
      const panel = dom().querySelector('#arch-section-panel');
      expect(panel.querySelector('#arch-section-depth').value).toBe('all');
      expect(panel.querySelector('.arch-section-drawing svg').getAttribute('aria-label')).toBe('Front overview');
      expect(panel.querySelector('[data-arch-section-count]').textContent).toBe('4 blocks across all depths');
      expect(panel.querySelector('.arch-section-coordinates')).toBeNull();
      expect(panel.querySelector('[aria-label="Previous section"]').disabled).toBe(true);
      expect(panel.querySelector('[aria-label="Next section"]').disabled).toBe(false);
    });
    it('previews the full section while reporting the filtered 3D count', () => {
      const panel = dom({ sliceZ: -1, sliceZSelected: true, viewLayer: 0, filterMaterial: 'wood' }).querySelector('#arch-section-panel');
      expect(panel.querySelector('[data-arch-section-count]').textContent).toBe('2 blocks in this section');
      expect(panel.querySelector('[data-arch-section-visible]').textContent).toBe('0 visible in 3D');
      expect(panel.querySelectorAll('[data-drawing-cell]')).toHaveLength(2);
      expect(panel.querySelector('.arch-section-drawing svg').getAttribute('aria-label')).toBe('Cut section · Z=-1');
      expect(panel.querySelector('.arch-section-grid-note').textContent).toContain('full editing floor');
    });
    it('retains an empty selection instead of silently choosing another replay depth', () => {
      const panel = dom({ showReplay: true, replayStep: 0, undoStack: [[model[0]]], sliceZSelected: true, sliceZ: -1 }).querySelector('#arch-section-panel');
      expect(panel.querySelector('.arch-section-frame').textContent).toBe('Replay step 1 of 2');
      expect(panel.querySelector('#arch-section-depth').value).toBe('-1');
      expect(panel.querySelector('option[value="-1"]').textContent).toBe('Z=-1 · 0 blocks');
      expect(panel.querySelector('[data-arch-section-count]').textContent).toBe('0 blocks in this section');
      expect(panel.querySelectorAll('[data-drawing-cell]')).toHaveLength(0);
      expect(panel.querySelector('.arch-section-empty').textContent).toContain('current frame');
    });
    it('follows the historical frame for both the drawing and depth options', () => {
      const panel = dom({ showReplay: true, undoStack: [[model[0]]], replayStep: 0, sliceZSelected: true, sliceZ: -2 }).querySelector('#arch-section-panel');
      expect(panel.querySelectorAll('option')).toHaveLength(2);
      expect(panel.querySelector('[data-arch-section-count]').textContent).toBe('1 block in this section');
      expect(panel.querySelector('[data-block]').getAttribute('data-block')).toBe('-1,0,-2');
    });
    it('keeps coordinate rows collapsed by default and bounds expanded rendering to one page', () => {
      const blocks = Array.from({ length: 70 }, (_, i) => block(i - 35, -1));
      const collapsed = dom({ blocks, sliceZSelected: true, sliceZ: -1 }).querySelector('#arch-section-panel');
      expect(collapsed.querySelector('details').open).toBe(false);
      expect(collapsed.querySelector('table')).toBeNull();
      const panel = dom({ blocks, sliceZSelected: true, sliceZ: -1, sectionCoordinatesOpen: true, sectionPage: 9, sectionPageKey: 'stale' }).querySelector('#arch-section-panel');
      expect(panel.querySelector('tbody').children).toHaveLength(48);
      expect(panel.querySelector('.arch-section-pages').textContent).toContain('Page 1 of 2');
      expect(panel.querySelector('tbody tr td').textContent).toBe('-35');
      expect(panel.querySelectorAll('th[scope=col]')).toHaveLength(4);
    });
    it('explains empty frames and disables navigation', () => {
      const panel = dom({ blocks: [] }).querySelector('#arch-section-panel');
      expect(panel.querySelector('.arch-section-empty').textContent).toContain('This frame has no blocks');
      expect(panel.querySelector('[aria-label="Next section"]').disabled).toBe(true);
      expect(panel.querySelector('.arch-section-profile')).toBeNull();
    });
    it('leaves a usable all-depth option at the single-depth boundary', () => {
      const panel = dom({ blocks: [model[0]], sliceZ: -2, sliceZSelected: true }).querySelector('#arch-section-panel');
      expect(panel.querySelector('[aria-label="Previous section"]').disabled).toBe(true);
      expect(panel.querySelector('[aria-label="Next section"]').disabled).toBe(true);
      expect(panel.querySelector('[aria-label="Show all Z cross-sections"]').disabled).toBe(false);
    });
    it('omits the explorer when sections are closed', () => {
      expect(dom({ showSlice: false }).querySelector('#arch-section-panel')).toBeNull();
    });
  });
}
it('mirrors the section code and registers every harvested label', () => {
  expect(fs.readFileSync(files[0], 'utf8')).toBe(fs.readFileSync(files[1], 'utf8'));
  const labels = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_sections_2026-09-09.json', 'utf8'));
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(file, 'utf8')).stem.archstudio;
    for (const [key, value] of Object.entries(labels)) expect(registry[key.replace('stem.archstudio.', '')]).toBe(value);
  }
});
