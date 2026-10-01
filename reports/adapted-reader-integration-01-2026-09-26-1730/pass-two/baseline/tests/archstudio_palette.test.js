import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
for (const file of files) {
  describe('Architecture palette: ' + file, () => {
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); });
    const dom = (state = {}) => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: [], editorView: 'grid', ...state } });
      return host;
    };
    it('keeps all twelve shape names and selected states beside decorative diagrams', () => {
      const host = dom({ activeShape: 'ramp' }), choices = [...host.querySelectorAll('.arch-shape-choice')];
      expect(choices).toHaveLength(12);
      expect(new Set(choices.map(b => b.querySelector('path').getAttribute('d'))).size).toBe(12);
      for (const button of choices) {
        expect(button.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
        expect(button.querySelector('svg').getAttribute('focusable')).toBe('false');
        expect(button.getAttribute('aria-label')).toContain(button.querySelector('.arch-palette-label').textContent);
        expect(button.querySelector('.arch-palette-check').style.visibility).toBe(button.getAttribute('aria-pressed') === 'true' ? 'visible' : 'hidden');
      }
      expect(host.querySelector('.arch-shape-choice[aria-pressed=true]').textContent).toContain('Ramp');
    });
    it('uses material names, patterns, and check marks without relying on color', () => {
      const host = dom({ activeMaterial: 'wood', budgetEnabled: true });
      expect(host.querySelectorAll('.arch-material-swatch')).toHaveLength(6);
      expect(host.querySelector('.arch-material-choice[aria-pressed=true]').textContent).toContain('Wood');
      expect(host.querySelector('.arch-material-choice[aria-pressed=true] small').textContent).toBe('3 credits');
      for (const swatch of host.querySelectorAll('.arch-material-swatch')) expect(swatch.getAttribute('aria-hidden')).toBe('true');
    });
    it.each([
      [{ activeColor: '#Ab12EF', customColor: '#ff0000' }, '#ab12ef'],
      [{ activeMaterial: 'stone', activeColor: 'var(--old, #94a3b8)' }, '#94a3b8'],
      [{ activeMaterial: 'wood', activeColor: 'invalid' }, '#92400e'],
    ])('keeps restored colors valid and ignores an obsolete secondary color', (state, expected) => {
      const host = dom({ ...state, showColorPicker: true });
      expect(host.querySelector('input[type=color]').value).toBe(expected);
      expect(host.querySelector('[data-arch-palette-color]').textContent).toBe(expected.toUpperCase());
      expect(host.querySelectorAll('input[type=color]')).toHaveLength(1);
    });
    it('offers twelve compact choices and all twenty-six colors without duplicate buttons', () => {
      const compact = dom(), expanded = dom({ showColorPicker: true });
      expect(compact.querySelectorAll('.arch-color-choice')).toHaveLength(12);
      expect(expanded.querySelectorAll('.arch-color-choice')).toHaveLength(26);
      expect(new Set([...expanded.querySelectorAll('.arch-color-choice')].map(b => b.getAttribute('aria-label'))).size).toBe(26);
      expect(compact.querySelector('#arch-color-options').hidden).toBe(true);
      expect(expanded.querySelector('#arch-color-options').hidden).toBe(false);
      expect(expanded.querySelector('#arch-color-toggle').getAttribute('aria-controls')).toBe('arch-color-options');
      expect(expanded.querySelector('#arch-color-toggle').getAttribute('aria-expanded')).toBe('true');
    });
    it('marks color selection with a symbol and its pressed state', () => {
      const host = dom({ activeColor: '#EF4444' }), selected = host.querySelector('.arch-color-choice[aria-pressed=true]');
      expect(selected.getAttribute('aria-label')).toBe('Use custom color #ef4444');
      expect(selected.querySelector('.arch-palette-check').style.visibility).toBe('visible');
      expect(selected.querySelector('.arch-palette-check').getAttribute('aria-hidden')).toBe('true');
    });
    it('keeps the paint shortcut disabled during replay and explains its scope', () => {
      const host = dom({ showColorPicker: true, showReplay: true, undoStack: [[]] });
      expect(host.querySelector('.arch-color-paint').disabled).toBe(true);
      expect(host.querySelector('.arch-color-options').textContent).toContain('Return to the live build to paint.');
      expect(host.querySelector('.arch-color-options').textContent).toContain('Existing blocks change when you edit them.');
    });
  });
}
it('mirrors the palette source and registers its labels', () => {
  expect(fs.readFileSync(files[0], 'utf8')).toBe(fs.readFileSync(files[1], 'utf8'));
  const labels = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_palette_2026-09-09.json', 'utf8'));
  expect(Object.keys(labels)).toHaveLength(9);
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const source = fs.readFileSync(file, 'utf8');
    for (const [key, value] of Object.entries(labels)) expect(source).toContain(JSON.stringify(key.replace('stem.archstudio.', '')) + ': ' + JSON.stringify(value));
  }
});
