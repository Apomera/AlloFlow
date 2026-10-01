import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const block = (x, y, material, shape = 'block') => ({ x, y, z: 0, material, shape });
const build = [block(0, 0, 'stone'), block(1, 0, 'wood', 'slab'), block(0, 1, 'glass'), block(1, 1, 'wood', 'slab')];
for (const file of files) {
  describe('Architecture materials schedule: ' + file, () => {
    let api;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); api = window.__alloArchSchedule; });
    it('counts each block once and uses existing per-material teaching prices', () => {
      const before = JSON.stringify(build), data = api.data(build);
      expect(data).toMatchObject({ scope: 'all', count: 4, credits: 23, materialCount: 3 });
      expect(data.floors).toHaveLength(32); expect(data.floors.slice(0, 3)).toEqual([2, 2, 0]);
      expect(data.material).toEqual([
        { id: 'wood', count: 2, credits: 6, percent: 50 },
        { id: 'glass', count: 1, credits: 12, percent: 25 },
        { id: 'stone', count: 1, credits: 5, percent: 25 },
      ]);
      expect(data.shape).toEqual([
        { id: 'block', count: 2, credits: 17, percent: 50 },
        { id: 'slab', count: 2, credits: 6, percent: 50 },
      ]);
      expect(JSON.stringify(build)).toBe(before);
    });
    it('filters a floor while retaining the full model floor counts', () => {
      const data = api.data(build, 'floor', 1);
      expect(data).toMatchObject({ scope: 'floor', floor: 1, count: 2, credits: 15, materialCount: 2 });
      expect(data.floors.slice(0, 2)).toEqual([2, 2]);
      expect(data.material.map(r => r.id)).toEqual(['glass', 'wood']);
      expect(data.shape.reduce((sum, r) => sum + r.credits, 0)).toBe(15);
    });
    it('handles empty floors and empty or legacy builds without invalid percentages', () => {
      expect(api.data(build, 'floor', 31)).toMatchObject({ count: 0, credits: 0, material: [], shape: [] });
      expect(api.data(null)).toMatchObject({ count: 0, materialCount: 0 });
      expect(api.data([{ x: 0, y: 0, z: 0 }])).toMatchObject({ count: 1, credits: 5, materialCount: 1 });
      expect(api.data(build, 'invalid', 'invalid')).toMatchObject({ scope: 'all', floor: 0 });
    });
    it('sorts ties consistently regardless of insertion order and rounds shares to one decimal', () => {
      expect(api.data([...build].reverse())).toEqual(api.data(build));
      const data = api.data([block(0, 0, 'stone'), block(1, 0, 'wood'), block(2, 0, 'glass')]);
      expect(data.material.map(r => r.percent)).toEqual([33.3, 33.3, 33.3]);
    });
    it('exports the selected floor and grouping with matching quantities and credits', () => {
      const csv = api.csv(api.data(build, 'floor', 1), 'shape', { block: 'Block', slab: 'Slab' });
      expect(csv).toBe('\uFEFF"Scope","Floor","Group","Item","Blocks","Share (%)","Teaching credits"\r\n' +
        '"floor","1","shape","Block","1","50","12"\r\n"floor","1","shape","Slab","1","50","3"\r\n');
      expect(api.csv(api.data([]), 'material')).toBe('');
      expect(api.csv(api.data(build), 'bad')).toContain('"all","","material","wood","2","50","6"');
    });
    it('escapes quoted CSV labels and prevents spreadsheet formula interpretation', () => {
      const data = api.data([block(0, 0, 'stone')]);
      expect(api.csv(data, 'material', { stone: 'Stone, "rough"\nfinish' })).toContain('"Stone, ""rough""\nfinish"');
      for (const value of ['=1+1', '+SUM(A1)', '-1+1', '@SUM(A1)', '  =1+1', '\t=1+1']) {
        expect(api.csv(data, 'material', { stone: value })).toContain('"' + "'" + value + '"');
      }
    });
    function render(patch = {}) {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: build, showBOM: true, editorView: 'grid', ...patch } });
      return host;
    }
    it('puts the schedule before building controls with named fields and a native quantity table', () => {
      const host = render(), panel = host.querySelector('#arch-schedule-panel');
      expect(host.querySelector('#arch-studio-tools').firstElementChild).toBe(panel);
      expect(host.querySelector('#arch-schedule-toggle').getAttribute('aria-expanded')).toBe('true');
      expect(panel.getAttribute('aria-labelledby')).toBe('arch-schedule-heading');
      expect(panel.querySelectorAll('label select')).toHaveLength(2);
      expect(panel.querySelector('select[aria-label="Schedule scope"]')).not.toBeNull();
      expect(panel.querySelector('select[aria-label="Group quantities by"]')).not.toBeNull();
      expect(panel.querySelector('caption').textContent).toBe('Material quantities · Full build');
      expect(panel.querySelectorAll('thead th[scope=col]')).toHaveLength(3);
      expect(panel.querySelectorAll('tbody th[scope=row]')).toHaveLength(3);
      expect(panel.querySelector('[data-arch-schedule-total=credits]').textContent).toBe('23');
    });
    it('shows full live quantities during replay and ignores 3D material, shape, and slice filters', () => {
      const host = render({ filterMaterial: 'stone', filterShape: 'block', viewLayer: 0, showSlice: true, sliceZ: 3, sliceZSelected: true,
        showReplay: true, replayStep: 0, undoStack: [[block(0, 0, 'stone')]] });
      const panel = host.querySelector('#arch-schedule-panel');
      expect(panel.querySelector('[data-arch-schedule-total=blocks]').textContent).toBe('4');
      expect(panel.textContent).toContain('live build');
      expect(panel.querySelector('.arch-schedule-download').disabled).toBe(false);
    });
    it('provides a useful empty state and disables empty exports', () => {
      const panel = render({ scheduleScope: 'floor', scheduleFloor: 31 }).querySelector('#arch-schedule-panel');
      expect(panel.querySelector('.arch-schedule-floor select').options).toHaveLength(32);
      expect(panel.textContent).toContain('No blocks in this scope.');
      expect(panel.querySelector('table')).toBeNull();
      expect(panel.querySelector('.arch-schedule-download').disabled).toBe(true);
    });
    it('hides the schedule and its toggle while the drawing desk is active', () => {
      const host = render({ showDrawings: true });
      expect(host.querySelector('#arch-schedule-panel')).toBeNull();
      expect(host.querySelector('#arch-schedule-toggle')).toBeNull();
    });
  });
}
it('keeps schedule code, translation registries, and harvest synchronized', () => {
  expect(fs.readFileSync(files[0]).equals(fs.readFileSync(files[1]))).toBe(true);
  resetStemLab(); loadTool(files[0], 'archStudio');
  const harvest = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_schedule_2026-09-08.json', 'utf8'));
  for (const f of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(f, 'utf8')).stem.archstudio;
    for (const [key, value] of Object.entries(window.__alloArchSchedule.labels)) {
      expect(registry['schedule_' + key]).toBe(value);
      expect(harvest['stem.archstudio.schedule_' + key]).toBe(value);
    }
  }
});
