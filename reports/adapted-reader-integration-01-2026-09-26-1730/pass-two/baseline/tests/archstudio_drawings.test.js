import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const block = (x = 0, y = 0, z = 0, extra = {}) => ({ x, y, z, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0, ...extra });
for (const file of files) {
  describe('Architecture drawings: ' + file, () => {
    let api;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); api = window.__alloArchDrawing; });
    it('draws a true floor slice beneath a roof while retaining whole-model extents', () => {
      const blocks = [block(-3, 0, -2, { material: 'wood' }), block(-3, 4, -2), block(5, 4, 2)];
      const plan = api.project(blocks, { view: 'plan', floor: 0 });
      expect(plan.cells.map(c => c.block)).toEqual([block(-3, 0, -2, { material: 'wood' })]);
      expect(plan).toMatchObject({ uAxis: 'X', vAxis: 'Z', minU: -3, maxU: 6, minV: -2, maxV: 3, width: 9, height: 5, total: 3 });
      expect(plan.floors).toEqual([{ y: 0, count: 1 }, { y: 4, count: 2 }]);
      expect(api.project(blocks, { floor: 2 }).cells).toEqual([]);
    });
    it('chooses the nearest front face independently of input order', () => {
      const blocks = [block(2, 1, 4), block(2, 1, -4, { material: 'wood' }), block(2, 1, 0)];
      for (const input of [blocks, blocks.slice().reverse()]) {
        const p = api.project(input, { view: 'front' });
        expect(p.cells).toHaveLength(1);
        expect(p.cells[0].block.z).toBe(-4);
        expect(p).toMatchObject({ uAxis: 'X', vAxis: 'Y', minV: 0, maxV: 2 });
      }
    });
    it('chooses the rightmost exterior face and uses Z/Y axes', () => {
      const p = api.project([block(-4, 2, -3), block(6, 2, -3, { shape: 'window' })], { view: 'right' });
      expect(p.cells).toHaveLength(1);
      expect(p.cells[0]).toMatchObject({ u: -3, v: 2, block: { x: 6, shape: 'window' } });
      expect(p).toMatchObject({ uAxis: 'Z', vAxis: 'Y', minU: -3, maxU: -2 });
    });
    it('cuts at an exact negative Z coordinate rather than showing an exterior projection', () => {
      const blocks = [block(1, 0, -2), block(1, 1, -1), block(1, 2, 0)];
      const section = api.project(blocks, { view: 'section', cut: -1 });
      expect(section.cells.map(c => c.block)).toEqual([blocks[1]]);
      expect(api.project(blocks, { view: 'section', cut: 4 }).cells).toEqual([]);
    });
    it('includes the ground datum beneath floating blocks', () => {
      const p = api.project([block(-1, 12, 2)], { view: 'front' });
      expect(p).toMatchObject({ minV: 0, maxV: 13, height: 13 });
      const svg = new DOMParser().parseFromString(api.svg(p), 'image/svg+xml');
      const cell = svg.querySelector('[data-drawing-cell]');
      const layout = api.layout(p, 720, 480);
      expect(Number(cell.getAttribute('y'))).toBeCloseTo(layout.y);
      expect(svg.documentElement.textContent).toContain('Ground Y=0');
    });
    it('has bounded, valid empty views and cannot export an empty project sheet', () => {
      const p = api.project([], { view: 'unknown', floor: 'bad', cut: '' });
      expect(p).toMatchObject({ kind: 'plan', floor: 0, cut: 0, total: 0, width: 1, height: 1 });
      expect(api.svg(p)).toContain('Add blocks to create drawings.');
      expect(api.sheet({ blocks: [] })).toBeNull();
    });
    it('reports inclusive cell widths correctly at the workspace boundaries', () => {
      const blocks = [block(-64, 0, -64), block(64, 31, 64)];
      expect(api.project(blocks)).toMatchObject({ width: 129, height: 129, maxU: 65, maxV: 65 });
      expect(api.project(blocks, { view: 'front' })).toMatchObject({ height: 32 });
    });
    it('measures signed axis changes and exact diagonal distance', () => {
      const p = api.project([block(), block(3, 0, 4)]);
      expect(api.measure(p, { u1: 0, v1: 0, u2: '3', v2: '4' })).toEqual({ u1: 0, v1: 0, u2: 3, v2: 4, du: 3, dv: 4, distance: 5 });
      expect(api.measure(p, { u1: 3, v1: 4, u2: 0, v2: 0 })).toMatchObject({ du: -3, dv: -4, distance: 5 });
      expect(api.measure(p, { u1: 0.5, v1: 0.5, u2: 0.5, v2: 0.5 }).distance).toBe(0);
    });
    it.each([
      { u1: '', v1: 0, u2: 1, v2: 1 },
      { u1: null, v1: 0, u2: 1, v2: 1 },
      { u1: Infinity, v1: 0, u2: 1, v2: 1 },
      { u1: -1, v1: 0, u2: 1, v2: 1 },
      { u1: 0, v1: 0, u2: 2, v2: 1 },
    ])('rejects incomplete or out-of-frame measurement %j', value => {
      expect(api.measure(api.project([block()]), value)).toBeNull();
    });
    it('maps pointer positions to half-unit coordinates in plan and inverted elevations', () => {
      for (const view of ['plan', 'front', 'right', 'section']) {
        const p = api.project([block(-2, 0, -2), block(2, 3, 2)], { view });
        const layout = api.layout(p, 720, 480);
        const result = api.pick(p, 720, 480, layout.x + layout.cell * 1.4, layout.y + layout.cell * 0.6);
        expect(result).toEqual({ u: p.minU + 1.5, v: view === 'plan' ? p.minV + 0.5 : p.maxV - 0.5 });
        expect(api.pick(p, 720, 480, 0, 0)).toBeNull();
      }
    });
    it('exports dimensions, a section marker, and a measured span only when enabled', () => {
      const p = api.project([block(), block(3, 0, 4)], { cut: 2 });
      const svg = api.svg(p, { measurement: { u1: 0, v1: 0, u2: 3, v2: 4 } });
      expect(svg).toContain('data-drawing-dimensions');
      expect(svg).toContain('data-drawing-cut');
      expect(svg).toContain('Distance: 5 grid units');
      expect(api.svg(p, { dimensions: false })).not.toContain('data-drawing-dimensions');
      expect(api.svg(p)).not.toContain('data-drawing-measurement');
      expect(api.svg(api.project([block()], { cut: -1 }))).not.toContain('data-drawing-cut');
    });
    it('creates a standalone four-view sheet and escapes names, notes, and translated labels', () => {
      const state = { blocks: [block(-1, 1, -1, { shape: 'ramp', rotation: 90 })],
        projectName: '図書館 <script>alert(1)</script> & "notes"', projectNotes: 'Door <image href="https://bad"> & light',
        showReplay: true, undoStack: [[]], secret: 'never included' };
      const before = JSON.stringify(state);
      const svg = api.sheet(state, { view: 'front', floor: 1, cut: -1,
        measurement: { u1: -1, v1: 0, u2: 0, v2: 2 }, labels: { front: '<Front & view>' } });
      const xml = new DOMParser().parseFromString(svg, 'image/svg+xml');
      expect(xml.querySelector('parsererror')).toBeNull();
      expect(xml.querySelectorAll('svg')).toHaveLength(5);
      expect(xml.querySelectorAll('script,image,foreignObject')).toHaveLength(0);
      expect(xml.querySelectorAll('[data-drawing-measurement]')).toHaveLength(1);
      expect(xml.documentElement.textContent).toContain(state.projectName);
      expect(xml.documentElement.textContent).toContain('<Front & view>');
      expect(svg).not.toContain('never included');
      expect(JSON.stringify(state)).toBe(before);
    });
    it('keeps long notebook excerpts inside a bounded sheet', () => {
      const svg = api.sheet({ blocks: [block()], projectName: 'W'.repeat(80), projectNotes: 'W'.repeat(4000) });
      const xml = new DOMParser().parseFromString(svg, 'image/svg+xml');
      expect(Number(xml.documentElement.getAttribute('height'))).toBeLessThanOrEqual(1100);
      expect(xml.documentElement.textContent).toContain('Full notes are in the project file.');
      expect(xml.documentElement.textContent).toContain('…');
      const name = [...xml.querySelectorAll('text')].find(n => n.textContent === 'W'.repeat(80));
      expect(Number(name.getAttribute('font-size'))).toBeLessThan(24);
    });
  });
}
it('keeps the Architecture Studio source and public mirror identical', () => {
  expect(fs.readFileSync(files[0]).equals(fs.readFileSync(files[1]))).toBe(true);
});
it('registers drawing labels and their harvest without replacing existing keys', () => {
  resetStemLab(); loadTool(files[0], 'archStudio');
  const labels = window.__alloArchDrawing.labels;
  const harvest = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_drawings_2026-09-07.json', 'utf8'));
  for (const f of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(f, 'utf8')).stem.archstudio;
    for (const [key, value] of Object.entries(labels)) {
      expect(registry['drawing_' + key]).toBe(value);
      expect(harvest['stem.archstudio.drawing_' + key]).toBe(value);
    }
    expect(registry.project_title).toBe('Project & revisions');
  }
});
