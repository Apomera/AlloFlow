import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const block = (x, y, z, patch = {}) => ({ x, y, z, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0, ...patch });
for (const file of files) {
  describe('Architecture grid navigation: ' + file, () => {
    let api;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); api = window.__alloArchGridNav; });
    it('counts all 32 floors and maps only the level immediately below', () => {
      const blocks = [block(-4, 0, 2), block(1, 0, 3), block(1, 1, 3), block(1, 31, 3)];
      const data = api.data(blocks, 1);
      expect(data.counts).toHaveLength(32);
      expect(data.counts.slice(0, 3)).toEqual([2, 1, 0]);
      expect(data.counts[31]).toBe(1);
      expect(data.below).toEqual({ '-4,2': blocks[0], '1,3': blocks[1] });
      expect(api.data(blocks, 0).below).toEqual({});
      expect(api.data(blocks, 31).below).toEqual({});
      expect(blocks).toHaveLength(4);
    });
    it.each([false, true])('keeps coordinate destinations reachable with existing blocks: %s', hasBlocks => {
      const bounds = window.__alloArchGridAxisBounds;
      for (const target of [-64, -40, -2, 0, 12, 40, 64]) {
        const [lo, hi] = bounds(hasBlocks, 0, 3, target);
        expect(lo).toBeLessThanOrEqual(target); expect(hi).toBeGreaterThanOrEqual(target);
        expect(lo).toBeGreaterThanOrEqual(-64); expect(hi).toBeLessThanOrEqual(64);
        expect(hi - lo + 1).toBeGreaterThanOrEqual(10); expect(hi - lo + 1).toBeLessThanOrEqual(32);
      }
    });
    it('uses the supplied replay frame rather than a separate live model', () => {
      const frame = { kind: 'arch-project-frame', blocks: [block(4, 3, 2)] };
      expect(api.data(frame, 4)).toMatchObject({ below: { '4,2': block(4, 3, 2) } });
      expect(api.data(frame, 4).counts[3]).toBe(1);
    });
    it('sanitizes older block data consistently with the renderer', () => {
      const data = api.data([{ x: 0, y: 0, z: 0 }], 1);
      expect(data.below['0,0']).toMatchObject({ shape: 'block', material: 'stone' });
      expect(api.data(null, 'bad').counts.reduce((a, b) => a + b)).toBe(0);
    });
    it.each([{ x: -64, z: 64 }, { x: ' 12 ', z: '-3' }, { x: 0, z: 0 }])('accepts valid grid positions %j', value => {
      expect(api.jump(value)).toEqual({ x: Number(value.x), z: Number(value.z) });
    });
    it.each([{ x: '', z: 0 }, { x: ' ', z: 0 }, { x: null, z: 0 }, { x: false, z: 0 }, { x: 65, z: 0 }, { x: 0, z: -65 }, { x: 1.5, z: 0 }, { x: Infinity, z: 0 }, { x: NaN, z: 0 }, {}, null])('rejects invalid grid positions %j without clamping', value => {
      expect(api.jump(value)).toBeNull();
    });
    function render(patch) {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { editorView: 'grid', blocks: [block(0, 0, 0), block(1, 0, 0), block(1, 1, 0)], editLayer: 1, ...patch } });
      return host;
    }
    it('shows floor counts and leaves below-floor outlines opt-in', () => {
      const host = render({});
      const select = host.querySelector('select[aria-label="Editing floor"]');
      expect(select.options).toHaveLength(32);
      expect(select.value).toBe('1');
      expect(select.options[0].textContent).toBe('Y=0 · 2 blocks');
      expect(host.querySelector('[data-arch-underlay]')).toBeNull();
      expect(host.querySelector('.arch-grid-jump').hasAttribute('open')).toBe(false);
      expect(host.querySelector('[data-arch-grid-cursor]').textContent).toContain('Y 1');
    });
    it('distinguishes reference cells from active-floor blocks in appearance and accessible names', () => {
      const host = render({ gridShowBelow: true });
      const empty = host.querySelector('[data-arch-cell="0,1,0"]'), occupied = host.querySelector('[data-arch-cell="1,1,0"]');
      expect(empty.querySelector('[data-arch-underlay]').getAttribute('aria-hidden')).toBe('true');
      expect(empty.getAttribute('aria-label')).toContain('Empty cell at X 0, Y 1, Z 0');
      expect(empty.getAttribute('aria-label')).toContain('Reference below: stone block on floor Y=0.');
      expect(host.querySelector('#' + empty.getAttribute('aria-describedby')).textContent).toContain('Edits affect only the current floor');
      expect(occupied.querySelector('[data-arch-underlay]')).toBeNull();
      expect(occupied.getAttribute('aria-label')).not.toContain('Reference below');
    });
    it('disables ground-floor reference controls without rendering imaginary negative floors', () => {
      const host = render({ editLayer: 0, gridShowBelow: true });
      const checkbox = host.querySelector('.arch-grid-below-toggle input');
      expect(checkbox.disabled).toBe(true);
      expect(checkbox.checked).toBe(false);
      expect(host.querySelector('[data-arch-underlay]')).toBeNull();
    });
    it('keeps replay references and counts confined to the selected history frame', () => {
      const host = render({ showReplay: true, replayStep: 0, undoStack: [[block(5, 0, 0, { material: 'wood' })]], gridShowBelow: true });
      expect(host.querySelector('select[aria-label="Editing floor"]').options[0].textContent).toBe('Y=0 · 1 blocks');
      expect(host.querySelector('[data-arch-cell="5,1,0"]').getAttribute('aria-label')).toContain('Reference below: wood block');
      expect(host.querySelector('[data-arch-cell="0,1,0"] [data-arch-underlay]')).toBeNull();
      expect(host.querySelector('[role=grid]').getAttribute('aria-readonly')).toBe('true');
    });
    it('labels invalid jump fields and links the explanation without changing the cursor', () => {
      const host = render({ gridJump: { x: '', z: 65 } });
      const fields = host.querySelectorAll('.arch-grid-jump input');
      expect(Array.from(fields).every(el => el.getAttribute('aria-invalid') === 'true')).toBe(true);
      expect(host.querySelector('#' + fields[0].getAttribute('aria-describedby')).textContent).toContain('whole-number');
      expect(host.querySelector('.arch-grid-jump button').disabled).toBe(true);
      expect(host.querySelector('[data-arch-grid-cursor]').getAttribute('aria-live')).toBeNull();
    });
  });
}
it('keeps code and floor-navigation labels synchronized with the public copy and harvest', () => {
  expect(fs.readFileSync(files[0]).equals(fs.readFileSync(files[1]))).toBe(true);
  resetStemLab(); loadTool(files[0], 'archStudio');
  const harvest = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_gridnav_2026-09-08.json', 'utf8'));
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const strings = JSON.parse(fs.readFileSync(file, 'utf8')).stem.archstudio;
    for (const [key, value] of Object.entries(window.__alloArchGridNav.labels)) {
      expect(strings['gridnav_' + key]).toBe(value);
      expect(harvest['stem.archstudio.gridnav_' + key]).toBe(value);
    }
  }
});
