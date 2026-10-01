import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const block = (x, y, patch = {}) => ({ x, y, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0, ...patch });
const model = [block(-1, 0), block(1, 0, { z: -2, material: 'wood', color: '#92400e' }), block(0, 2, { shape: 'arch' }), block(2, 5)];
for (const file of files) {
  describe('Architecture floor explorer: ' + file, () => {
    let summary;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); summary = window.__alloArchFloors.summary; });
    const dom = (state = {}) => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: model, editorView: 'grid', showFloorPlans: true, ...state } });
      return host;
    };
    it('sorts occupied floors and summarizes the selected floor', () => {
      expect(summary(model, 0)).toMatchObject({ floor: 0, count: 2, total: 4, highest: 5, previous: null, next: 2,
        materials: { stone: 1, wood: 1 }, levels: [{ floor: 0, count: 2 }, { floor: 2, count: 1 }, { floor: 5, count: 1 }] });
      expect(summary(model, 0).blocks.map(b => [b.x, b.z])).toEqual([[1, -2], [-1, 0]]);
    });
    it('navigates between occupied floors across gaps', () => {
      expect(summary(model, 2)).toMatchObject({ previous: 0, next: 5 });
      expect(summary(model, 3)).toMatchObject({ floor: 3, count: 0, previous: 2, next: 5 });
      expect(summary(model, 5)).toMatchObject({ previous: 2, next: null });
    });
    it.each([undefined, null, 'bad', -1, 32])('falls back to the lowest occupied floor for %s', value => {
      expect(summary([block(0, 4), block(1, 9)], value)).toMatchObject({ floor: 4, count: 1 });
    });
    it('retains valid empty floors and rounds persisted coordinates like the viewport', () => {
      expect(summary(model, 31)).toMatchObject({ floor: 31, count: 0, previous: 5, next: null });
      expect(summary(model, 1.6)).toMatchObject({ floor: 2, count: 1 });
    });
    it('normalizes legacy project frames without mutating their data', () => {
      const input = Object.freeze({ kind: 'arch-project-frame', blocks: Object.freeze([Object.freeze({ x: 0, y: 3, z: 1 })]), projectName: 'Keep' });
      const before = JSON.stringify(input);
      expect(summary(input, 3)).toMatchObject({ count: 1, materials: { stone: 1 }, blocks: [{ shape: 'block', color: '#94a3b8' }] });
      expect(JSON.stringify(input)).toBe(before);
    });
    it('represents empty frames without inventing occupied floors', () => {
      expect(summary([], 0)).toMatchObject({ count: 0, total: 0, floor: 0, levels: [], materials: {}, previous: null, next: null, highest: 0 });
    });
    it('puts one named floor explorer above the authoring palette', () => {
      const host = dom(), panel = host.querySelector('#arch-floor-panel');
      expect(host.querySelector('#arch-studio-tools').firstElementChild).toBe(panel);
      expect(host.querySelectorAll('#arch-floor-panel')).toHaveLength(1);
      expect(panel.getAttribute('aria-labelledby')).toBe('arch-floor-heading');
      expect(panel.querySelector('#arch-floor-heading').tabIndex).toBe(-1);
      expect(panel.querySelector('#arch-floor-select').getAttribute('aria-label')).toBe('Preview floor (Y)');
    });
    it('draws one selected plan with stable whole-frame extents and no stray section line', () => {
      const panel = dom({ floorPlanY: 2, showSlice: true, sliceZSelected: true, sliceZ: 0 }).querySelector('#arch-floor-panel');
      expect(panel.querySelectorAll('svg')).toHaveLength(1);
      expect(panel.querySelectorAll('[data-drawing-cell]')).toHaveLength(1);
      expect(panel.querySelector('[data-block]').getAttribute('data-block')).toBe('0,2,0');
      expect(panel.querySelector('[data-drawing-cut]')).toBeNull();
      expect(panel.querySelector('.arch-floor-drawing').textContent).toContain('X [-1, 3]');
      expect(panel.querySelector('[data-arch-floor-count]').textContent).toBe('1 block on this floor');
    });
    it('includes hidden cells in plans and material counts', () => {
      const panel = dom({ floorPlanY: 0, filterMaterial: 'glass', filterShape: 'dome', viewLayer: 5, showSlice: true, sliceZSelected: true, sliceZ: 12 }).querySelector('#arch-floor-panel');
      expect(panel.querySelectorAll('[data-drawing-cell]')).toHaveLength(2);
      expect(panel.querySelector('.arch-floor-materials').textContent).toContain('Wood: 1 block');
      expect(panel.querySelector('.arch-floor-materials').textContent).toContain('Stone: 1 block');
      expect(panel.querySelector('[data-arch-floor-current]').textContent).toBe('3D floor filter: Y=5');
      expect(panel.querySelector('.arch-floor-note').textContent).toContain('includes blocks hidden');
    });
    it('counts and draws the replay frame instead of the live build', () => {
      const panel = dom({ showReplay: true, replayStep: 0, undoStack: [[block(4, 9)]], floorPlanY: 9 }).querySelector('#arch-floor-panel');
      expect(panel.querySelector('[data-arch-floor-frame]').textContent).toBe('Replay step 1 of 2');
      expect(panel.querySelector('[data-block]').getAttribute('data-block')).toBe('4,9,0');
      expect(panel.querySelectorAll('option')).toHaveLength(1);
      expect(panel.querySelector('[data-arch-floor-count]').textContent).toBe('1 block on this floor');
    });
    it('keeps empty restored selections visible during replay', () => {
      const panel = dom({ showReplay: true, replayStep: 0, undoStack: [[block(4, 9)]], floorPlanY: 2 }).querySelector('#arch-floor-panel');
      expect(panel.querySelector('#arch-floor-select').value).toBe('2');
      expect(panel.querySelector('option[value="2"]').textContent).toBe('Y=2 · 0 blocks');
      expect(panel.querySelector('.arch-floor-note').textContent).toContain('This floor is empty');
      expect(panel.querySelectorAll('[data-drawing-cell]')).toHaveLength(0);
    });
    it('uses an active 3D floor as the initial preview without changing it', () => {
      expect(dom({ viewLayer: 2 }).querySelector('#arch-floor-select').value).toBe('2');
    });
    it('has useful recovery actions even for an empty build', () => {
      const panel = dom({ blocks: [] }).querySelector('#arch-floor-panel');
      expect(panel.querySelector('.arch-floor-note').textContent).toContain('Open the floor grid to build');
      expect(panel.querySelector('[aria-label="Previous occupied floor"]').disabled).toBe(true);
      expect(panel.querySelector('[aria-label="Next occupied floor"]').disabled).toBe(true);
      expect([...panel.querySelectorAll('.arch-floor-actions button')].every(b => !b.disabled)).toBe(true);
    });
    it('keeps the visibility slider in range for a restored empty floor', () => {
      const host = dom({ viewLayer: 31 }), slider = host.querySelector('.arch-floor-visibility input');
      expect(slider.max).toBe('31'); expect(slider.value).toBe('31');
      expect(slider.getAttribute('aria-valuetext')).toBe('Floor Y=31; 0 blocks in this frame');
    });
    it('makes visibility counts and bounds follow the historical frame', () => {
      const host = dom({ showReplay: true, undoStack: [[block(0, 12), block(1, 12)]], replayStep: 0, viewLayer: 12 });
      const slider = host.querySelector('.arch-floor-visibility input');
      expect(slider.max).toBe('12');
      expect(slider.getAttribute('aria-valuetext')).toBe('Floor Y=12; 2 blocks in this frame');
      expect(host.querySelector('[data-arch-floor-visibility-count]').textContent).toBe('2 blocks in this frame');
    });
    it('keeps only the compact visibility card when the explorer is closed', () => {
      const host = dom({ showFloorPlans: false });
      expect(host.querySelector('#arch-floor-panel')).toBeNull();
      expect(host.querySelectorAll('.arch-floor-visibility')).toHaveLength(1);
    });
    it('renders cells for the selected floor rather than allocating empty grids for all floors', () => {
      const blocks = [block(-64, 0, { z: -64 }), block(64, 0, { z: 64 }), block(0, 31)];
      const panel = dom({ blocks, floorPlanY: 0 }).querySelector('#arch-floor-panel');
      expect(panel.querySelectorAll('[data-drawing-cell]')).toHaveLength(2);
      expect(panel.querySelectorAll('*').length).toBeLessThan(400);
    });
  });
}
it('mirrors floor code and harvests every localized label', () => {
  expect(fs.readFileSync(files[0], 'utf8')).toBe(fs.readFileSync(files[1], 'utf8'));
  const labels = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_floors_2026-09-19.json', 'utf8'));
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(file, 'utf8')).stem.archstudio;
    for (const [key, value] of Object.entries(labels)) expect(registry[key.replace('stem.archstudio.', '')]).toBe(value);
  }
});
