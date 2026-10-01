import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const block = (x, patch = {}) => ({ x, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0, ...patch });
const model = [block(-1), block(0, { material: 'wood', shape: 'arch', y: 2, z: 1 }), block(1, { material: 'wood', shape: 'arch', y: 2, z: 1 })];
for (const file of files) {
  describe('Architecture composition: ' + file, () => {
    let summary;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); summary = window.__alloArchComposition.summary; });
    const dom = (state = {}) => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: model, editorView: 'grid', showStats: true, ...state } });
      return host;
    };
    it('counts materials, shapes, occupied floors and occupied-cell extents', () => {
      expect(summary(model)).toEqual({ total: 3, materials: { stone: 1, wood: 2 }, shapes: { block: 1, arch: 2 }, floors: 2, materialCount: 2, shapeCount: 2, span: { x: 3, y: 3, z: 2 } });
    });
    it('measures occupied span independently of the ground and world origin', () => {
      expect(summary([block(-64, { y: 9, z: 64 }), block(-63, { y: 10, z: 64 })])).toMatchObject({ floors: 2, span: { x: 2, y: 2, z: 1 } });
    });
    it('supports retained project frames without changing their metadata', () => {
      const input = Object.freeze({ kind: 'arch-project-frame', blocks: Object.freeze(model.map(b => Object.freeze({ ...b }))), projectName: 'Keep', projectNotes: 'Keep too' });
      const before = JSON.stringify(input); expect(summary(input)).toEqual(summary(model)); expect(JSON.stringify(input)).toBe(before);
    });
    it('normalizes legacy entries and excludes invalid coordinates and duplicate cells', () => {
      expect(summary([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, null, { x: 99, y: 0, z: 0 }])).toMatchObject({ total: 1, materials: { stone: 1 }, shapes: { block: 1 } });
    });
    it('represents empty input without imaginary dimensions', () => {
      expect(summary(null)).toEqual({ total: 0, materials: {}, shapes: {}, floors: 0, materialCount: 0, shapeCount: 0, span: { x: 0, y: 0, z: 0 } });
    });
    it('opens one named composition panel above the authoring tools', () => {
      const host = dom(), panel = host.querySelector('#arch-composition-panel');
      expect(host.querySelector('#arch-studio-tools').firstElementChild).toBe(panel);
      expect(host.querySelectorAll('#arch-composition-panel')).toHaveLength(1);
      expect(panel.getAttribute('aria-labelledby')).toBe('arch-composition-heading');
      expect(panel.querySelector('h3').tabIndex).toBe(-1);
      expect(panel.querySelectorAll('dl dt')).toHaveLength(4);
    });
    it('shows true shares of total blocks rather than shares of the largest group', () => {
      const host = dom(), rows = [...host.querySelectorAll('[data-arch-composition-row]')];
      expect(rows.map(r => r.getAttribute('data-arch-composition-row'))).toEqual(['wood', 'stone']);
      expect(rows[0].textContent).toContain('2 blocks; 66.7% of this frame');
      expect(rows[1].textContent).toContain('1 block; 33.3% of this frame');
      expect(parseFloat(rows[0].querySelector('.arch-composition-bar>span').style.width)).toBeCloseTo(66.666, 2);
      expect(rows[0].querySelector('.arch-composition-bar').getAttribute('aria-hidden')).toBe('true');
    });
    it('keeps small nonzero groups distinguishable from zero', () => {
      const blocks = Array.from({ length: 1200 }, (_, i) => block(i % 60 - 30, { y: Math.floor(i / 60), material: i === 0 ? 'wood' : 'stone' }));
      const panel = dom({ blocks }).querySelector('#arch-composition-panel');
      expect(panel.querySelector('[data-arch-composition-row=wood]').textContent).toContain('1 block; Less than 0.1% of this frame');
      expect(panel.querySelectorAll('[data-arch-composition-row]')).toHaveLength(2);
    });
    it('shows complete frame counts even when floor, section, and block filters hide cells', () => {
      const panel = dom({ viewLayer: 31, showSlice: true, sliceZSelected: true, sliceZ: -64, filterMaterial: 'glass', filterShape: 'dome' }).querySelector('#arch-composition-panel');
      expect(panel.querySelector('[data-arch-composition-metric=blocks]').textContent).toBe('3');
      expect(panel.querySelector('[data-arch-composition-span]').textContent).toBe('Model span: X 3 × Y 3 × Z 2 grid units');
      expect(panel.querySelector('.arch-composition-scope').textContent).toContain('including blocks hidden by 3D filters');
    });
    it('uses the historical frame for every metric, row and span', () => {
      const panel = dom({ showReplay: true, replayStep: 0, undoStack: [[block(4, { y: 9, material: 'glass', shape: 'slab' })]] }).querySelector('#arch-composition-panel');
      expect(panel.querySelector('[data-arch-composition-frame]').textContent).toBe('Replay step 1 of 2');
      expect([...panel.querySelectorAll('dd')].map(n => n.textContent)).toEqual(['1', '1', '1', '1']);
      expect(panel.querySelector('[data-arch-composition-row]').getAttribute('data-arch-composition-row')).toBe('glass');
      expect(panel.querySelector('[data-arch-composition-span]').textContent).toContain('X 1 × Y 1 × Z 1');
    });
    it('offers distinct guidance for empty live and historical frames', () => {
      const live = dom({ blocks: [] }).querySelector('#arch-composition-panel');
      expect(live.querySelector('.arch-composition-empty').textContent).toContain('Add blocks');
      expect(live.querySelector('.arch-composition-empty button').textContent).toBe('Open the floor grid');
      const past = dom({ showReplay: true, replayStep: 0, undoStack: [[]] }).querySelector('#arch-composition-panel');
      expect(past.querySelector('.arch-composition-empty').textContent).toContain('This replay step has no blocks');
      expect(past.querySelector('.arch-composition-empty button').textContent).toBe('Return to live build');
      expect(past.querySelectorAll('[data-arch-composition-row]')).toHaveLength(0);
    });
    it('supports shape grouping with named diagrams and count order', () => {
      const panel = dom({ compositionGroup: 'shapes' }).querySelector('#arch-composition-panel');
      expect([...panel.querySelectorAll('[data-arch-composition-row]')].map(r => r.getAttribute('data-arch-composition-row'))).toEqual(['arch', 'block']);
      expect(panel.querySelector('[aria-label="Inspect Arch shape"]')).not.toBeNull();
      expect(panel.querySelectorAll('.arch-shape-icon')).toHaveLength(2);
      expect(panel.querySelector('[role=group] button[aria-pressed=true]').textContent).toBe('Shapes');
    });
    it('orders groups by displayed names when requested', () => {
      const rows = [...dom({ compositionOrder: 'name' }).querySelectorAll('[data-arch-composition-row]')];
      expect(rows.map(r => r.getAttribute('data-arch-composition-row'))).toEqual(['stone', 'wood']);
    });
    it('recovers invalid saved display preferences to material/count defaults', () => {
      const panel = dom({ compositionGroup: 'other', compositionOrder: 'other' }).querySelector('#arch-composition-panel');
      expect(panel.querySelector('select').value).toBe('count');
      expect(panel.querySelector('[role=group] button[aria-pressed=true]').textContent).toBe('Materials');
      expect(panel.querySelector('[data-arch-composition-row]').getAttribute('data-arch-composition-row')).toBe('wood');
    });
    it('describes inspection effects and keeps each row separately named', () => {
      const panel = dom().querySelector('#arch-composition-panel');
      expect(panel.querySelector('#arch-composition-inspect-help').textContent).toContain('replace the material and shape filters');
      for (const button of panel.querySelectorAll('.arch-composition-row')) {
        expect(button.getAttribute('aria-label')).toMatch(/^Inspect .+ material$/);
        for (const id of button.getAttribute('aria-describedby').split(' ')) expect(panel.querySelector('#' + id)).not.toBeNull();
      }
    });
    it('does not render the old charts or composition controls while closed', () => {
      const host = dom({ showStats: false });
      expect(host.querySelector('#arch-composition-panel')).toBeNull();
      expect(host.textContent).not.toContain('Material Distribution');
    });
  });
}
it('synchronizes the module and registers every composition label', () => {
  expect(fs.readFileSync(files[0], 'utf8')).toBe(fs.readFileSync(files[1], 'utf8'));
  const labels = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_composition_2026-09-19.json', 'utf8'));
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(file, 'utf8')).stem.archstudio;
    for (const [key, value] of Object.entries(labels)) expect(registry[key.replace('stem.archstudio.', '')]).toBe(value);
  }
});
