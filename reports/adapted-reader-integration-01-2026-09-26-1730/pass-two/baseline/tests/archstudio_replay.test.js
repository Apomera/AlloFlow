import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const block = (x = 0, patch = {}) => ({ x, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0, ...patch });
for (const file of files) {
  describe('Architecture replay timeline: ' + file, () => {
    let summary;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); summary = window.__alloArchReplay.summary; });
    const dom = (state = {}) => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: [block()], showReplay: true, undoStack: [[]], replayStep: 0, editorView: 'grid', ...state } });
      return host;
    };
    it('compares properties at each cell rather than guessing an edit operation', () => {
      const previous = [block(0), block(1), block(2)];
      const current = [block(0, { color: '#123456' }), block(2), block(3)];
      expect(summary(current, [previous], 1)).toMatchObject({ step: 1, total: 2, count: 3, counts: [3, 3],
        delta: { added: 1, removed: 1, changed: 1, unchanged: 1, costDelta: 0 } });
    });
    it('treats the first retained state as a baseline even when it already has blocks', () => {
      expect(summary([block(4)], [[block(), block(1)]], 0)).toMatchObject({ step: 0, count: 2, delta: null });
      expect(dom({ undoStack: [[block()]] }).querySelector('[data-arch-replay-note]').textContent).toContain('may already contain blocks');
    });
    it('includes the latest model as the final read-only step', () => {
      expect(summary([block(), block(1)], [[], [block()]], 2)).toMatchObject({ total: 3, counts: [0, 1, 2], delta: { added: 1 } });
    });
    it('ignores project text changes while supporting project history frames', () => {
      const frame = { kind: 'arch-project-frame', blocks: [block()], projectName: 'Before', projectNotes: 'Old notes' };
      expect(summary([block()], [frame], 1).delta).toEqual({ added: 0, removed: 0, changed: 0, unchanged: 1, costDelta: 0 });
      expect(dom({ undoStack: [frame], replayStep: 1 }).querySelector('[data-arch-replay-note]').textContent).toBe('No block properties changed in this step.');
    });
    it('normalizes old colors and missing properties before comparing', () => {
      const legacy = [{ x: 0, y: 0, z: 0, color: 'var(--legacy, #94a3b8)' }];
      expect(summary([block()], [legacy], 1).delta).toMatchObject({ added: 0, removed: 0, changed: 0, unchanged: 1 });
    });
    it('counts shape, material, rotation, and color changes as changed cells', () => {
      const current = [block(0, { shape: 'ramp' }), block(1, { material: 'wood' }), block(2, { rotation: 90 }), block(3, { color: '#123456' })];
      expect(summary(current, [[block(0), block(1), block(2), block(3)]], 1).delta).toMatchObject({ added: 0, removed: 0, changed: 4, costDelta: -2 });
    });
    it('drops invalid frames and caps retained history consistently with the renderer', () => {
      const history = [null, 'invalid', ...Array.from({ length: 55 }, (_, i) => [block(i)])];
      const result = summary([], history, 0);
      expect(result.total).toBe(51);
      expect(result.counts).toHaveLength(51);
      expect(result.count).toBe(1);
      expect(result.delta).toBeNull();
      expect(summary([], history, 50).delta.removed).toBe(1);
    });
    it.each([[-5, 0], [999, 2], ['1', 1], ['bad', 0], [undefined, 0]])('bounds requested step %s to %s', (value, step) => {
      expect(summary([block()], [[], [block()]], value).step).toBe(step);
    });
    it('does not mutate live blocks or retained history', () => {
      const current = Object.freeze([Object.freeze(block(3))]), history = Object.freeze([Object.freeze([Object.freeze(block())])]);
      const before = JSON.stringify({ current, history });
      summary(current, history, 1);
      expect(JSON.stringify({ current, history })).toBe(before);
    });
    it('puts one named panel before the authoring tools and names its step slider', () => {
      const host = dom(), panel = host.querySelector('#arch-replay-panel'), aside = host.querySelector('#arch-studio-tools');
      expect(aside.firstElementChild).toBe(panel);
      expect(host.querySelectorAll('#arch-replay-panel')).toHaveLength(1);
      expect(panel.getAttribute('aria-labelledby')).toBe('arch-replay-heading');
      expect(panel.querySelector('#arch-replay-heading').tabIndex).toBe(-1);
      expect(panel.querySelector('input[type=range]').getAttribute('aria-valuetext')).toBe('Step 1 of 2; 0 blocks; read-only');
      expect(panel.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
      expect(panel.querySelectorAll('svg rect')).toHaveLength(2);
    });
    it('disables both transport actions at each timeline boundary', () => {
      for (const [step, disabledNames] of [[0, ['first', 'previous']], [1, ['next', 'final']]]) {
        const panel = dom({ replayStep: step }).querySelector('#arch-replay-panel');
        for (const button of panel.querySelectorAll('.arch-replay-transport button')) {
          expect(button.disabled).toBe(disabledNames.some(word => button.getAttribute('aria-label').includes(word)));
        }
      }
    });
    it('keeps all-step counts and changes independent of layer/material/shape filters', () => {
      const host = dom({ blocks: [block(), block(1)], undoStack: [[]], replayStep: 1, viewLayer: 31, filterMaterial: 'glass', filterShape: 'dome' });
      expect(host.querySelector('[data-arch-replay-count]').textContent).toBe('2 blocks at this step');
      expect(host.querySelector('[data-arch-replay-delta=added] dd').textContent).toBe('2');
      expect(host.querySelector('.arch-replay-scope').textContent).toContain('including those hidden by 3D filters');
    });
    it('omits the timeline outside replay or when no usable history remains', () => {
      for (const state of [{ showReplay: false }, { undoStack: [] }, { undoStack: [null, {}] }]) expect(dom(state).querySelector('#arch-replay-panel')).toBeNull();
    });
  });
}
it('mirrors replay code and harvests every new label', () => {
  expect(fs.readFileSync(files[0], 'utf8')).toBe(fs.readFileSync(files[1], 'utf8'));
  const labels = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_replay_2026-09-09.json', 'utf8'));
  expect(Object.keys(labels)).toHaveLength(27);
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(file, 'utf8')).stem.archstudio;
    for (const [key, value] of Object.entries(labels)) expect(registry[key.replace('stem.archstudio.', '')]).toBe(value);
  }
});
