import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
const block = { x: 0, y: 0, z: 0, shape: 'block', material: 'stone' };
for (const file of files) {
  describe('Architecture Studio usability: ' + file, () => {
    let api;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); api = window.__alloArchUX; });
    it('keeps zoom between fit and four times fit with repeatable increments', () => {
      expect(api.zoom(1, 'out')).toBe(1);
      expect(api.zoom(1, 'in')).toBe(1.5);
      expect(api.zoom(3.5, 'in')).toBe(4);
      expect(api.zoom(4, 'in')).toBe(4);
      expect(api.zoom(4, 'fit')).toBe(1);
      expect(api.zoom(NaN, 'in')).toBe(1.5);
    });
    it.each([[720, 480], [320, 240], [1000, 300], [240, 600]])('fits a drawing within a %s by %s viewport without distortion', (w, h) => {
      const size = api.fit(w, h, 1);
      expect(size.width).toBeLessThanOrEqual(w);
      expect(size.height).toBeLessThanOrEqual(h);
      expect(size.width / size.height).toBeCloseTo(1.5);
      const zoomed = api.fit(w, h, 4);
      expect(zoomed.width).toBeCloseTo(size.width * 4);
      expect(zoomed.height).toBeCloseTo(size.height * 4);
    });
    it('has a stable, nonzero fallback before browser layout is available', () => {
      expect(api.fit(0, 0, 1).width).toBe(1);
      expect(api.fit(0, 0, 1).height).toBeCloseTo(2 / 3);
      expect(api.fit(undefined, undefined, 1)).toEqual(api.fit(0, 0, 1));
    });
    it('separates primary navigation and save/history actions from secondary tools', () => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: [], editorView: 'grid' } });
      const nav = host.querySelector('nav[aria-label="Studio workspaces"]');
      expect(nav.querySelectorAll('button')).toHaveLength(3);
      expect(nav.querySelector('#arch-design-toggle')).not.toBeNull();
      expect(nav.querySelector('#arch-drawings-toggle')).not.toBeNull();
      expect(nav.querySelector('#arch-project-toggle')).not.toBeNull();
      expect(host.querySelector('[aria-label="Build history and saving"]').querySelectorAll('button')).toHaveLength(4);
      expect(host.querySelector('.arch-studio-feature-strip').contains(nav)).toBe(false);
    });
    it.each([{ showDesign: true }, { showProject: true }, { showDesign: true, showProject: true }])('does not advertise absent panels while drawings are open: %j', state => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { ...state, blocks: [block], showDrawings: true } });
      for (const id of ['arch-design-toggle', 'arch-project-toggle']) {
        expect(host.querySelector('#' + id).getAttribute('aria-expanded')).toBe('false');
        expect(host.querySelector('#' + id).hasAttribute('aria-controls')).toBe(false);
      }
      expect(host.querySelector('#arch-drawings-toggle').getAttribute('aria-expanded')).toBe('true');
      expect(host.querySelector('#arch-drawings-desk')).not.toBeNull();
      expect(host.querySelector('.arch-studio-feature-strip')).toBeNull();
    });
    it('names the keyboard viewport, help text, and zoom controls', () => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: [block], showDrawings: true } });
      const viewport = host.querySelector('[data-arch-drawing-viewport]');
      expect(viewport.getAttribute('tabindex')).toBe('0');
      expect(viewport.getAttribute('role')).toBe('region');
      expect(viewport.getAttribute('aria-label')).toBe('Drawing viewport');
      expect(host.querySelector('#' + viewport.getAttribute('aria-describedby')).textContent).toContain('arrow keys');
      expect(host.querySelector('[aria-label="Zoom drawing in"]')).not.toBeNull();
      expect(host.querySelector('[aria-label="Zoom drawing out"]').disabled).toBe(true);
      expect(host.querySelector('[data-arch-drawing-zoom]').textContent).toBe('100% of fit');
      expect(host.querySelector('[aria-label="Drawing summary"]')).not.toBeNull();
    });
  });
}
it('keeps source/public code and new usability labels synchronized', () => {
  expect(fs.readFileSync(files[0]).equals(fs.readFileSync(files[1]))).toBe(true);
  resetStemLab(); loadTool(files[0], 'archStudio');
  const labels = window.__alloArchUX.labels;
  const harvest = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_ux_2026-09-07.json', 'utf8'));
  for (const f of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(f, 'utf8')).stem.archstudio;
    for (const [key, value] of Object.entries(labels)) {
      expect(registry['ux_' + key]).toBe(value);
      expect(harvest['stem.archstudio.ux_' + key]).toBe(value);
    }
  }
});
