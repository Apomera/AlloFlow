import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
for (const file of files) {
  describe('Architecture workspace controls: ' + file, () => {
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); });
    const dom = (state = {}, overrides) => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: [], editorView: '3d', ...state } }, overrides);
      return host;
    };
    it('places view choices above the model and camera controls below it', () => {
      const host = dom(), stage = host.querySelector('.arch-studio-stage');
      const bar = host.querySelector('.arch-workspace-bar'), camera = host.querySelector('.arch-studio-camera-controls');
      expect(bar.getAttribute('aria-label')).toBe('Model workspace controls');
      expect(bar.querySelector('[aria-label="Model view"]')).not.toBeNull();
      expect(stage.contains(bar)).toBe(false);
      expect(stage.contains(camera)).toBe(false);
      expect(camera.parentElement).toBe(stage.parentElement);
      expect(camera.querySelectorAll('button')).toHaveLength(7);
      expect(camera.querySelector('[data-arch-camera=reset]').textContent).toContain('Reset');
      expect(host.querySelectorAll('.arch-studio-view-switch')).toHaveLength(1);
    });
    it('preserves the sidebar contents when hidden and exposes its disclosure relationship', () => {
      const host = dom({ sidebarCollapsed: true, showTemplates: true, editorView: 'grid' });
      const sidebar = host.querySelector('#arch-studio-tools'), toggle = host.querySelector('#arch-sidebar-toggle');
      expect(sidebar.hidden).toBe(true);
      expect(sidebar.tabIndex).toBe(-1);
      expect(sidebar.querySelector('#arch-template-library')).not.toBeNull();
      expect(sidebar.querySelector('[aria-labelledby="arch-shapes-heading"]')).not.toBeNull();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(toggle.getAttribute('aria-controls')).toBe(sidebar.id);
      expect(toggle.textContent).toContain('Show tools');
      expect(host.querySelector('[data-tools-collapsed=true]')).not.toBeNull();
    });
    it.each([undefined, false, 'true', 1])('only hides the sidebar for an explicit true value, not %s', value => {
      const host = dom({ sidebarCollapsed: value, editorView: 'grid' });
      expect(host.querySelector('#arch-studio-tools').hidden).toBe(false);
      expect(host.querySelector('#arch-sidebar-toggle').getAttribute('aria-expanded')).toBe('true');
    });
    it('describes the active palette without depending on its color swatch', () => {
      const host = dom({ activeShape: 'ramp', activeMaterial: 'glass', activeColor: '#123456', activeRotation: 270, mode: 'place' });
      const summary = host.querySelector('[aria-label="Current building tool"]');
      expect(summary.textContent).toContain('Place Mode');
      expect(summary.textContent).toContain('Ramp');
      expect(summary.textContent).toContain('Glass');
      expect(summary.textContent).toContain('Rotation 270°');
      expect(summary.textContent).toContain('Color #123456');
      expect(summary.querySelector('.arch-workspace-swatch').getAttribute('aria-hidden')).toBe('true');
    });
    it.each(['paint', 'erase', 'pick'])('describes %s without implying shape or rotation edits', mode => {
      const host = dom({ mode, activeShape: 'ramp', activeMaterial: 'glass', activeColor: '#123456', activeRotation: 270 });
      const summary = host.querySelector('[aria-label="Current building tool"]');
      expect(summary.textContent).not.toContain('Ramp');
      expect(summary.textContent).not.toContain('Rotation');
      if (mode === 'paint') {
        expect(summary.textContent).toContain('Glass');
        expect(summary.textContent).toContain('Color #123456');
        expect(summary.textContent).toContain('Paint material and color.');
      } else expect(summary.querySelector('.arch-workspace-palette')).toBeNull();
    });
    it('uses truthful replay guidance instead of an editable palette summary', () => {
      const host = dom({ showReplay: true, undoStack: [[]], mode: 'place' });
      const summary = host.querySelector('[aria-label="Current building tool"]');
      expect(summary.textContent).toContain('Read-only replay');
      expect(summary.textContent).not.toContain('Place Mode');
      expect(summary.querySelector('.arch-workspace-palette')).toBeNull();
    });
    it('keeps grid fallback and retry navigation available and omits camera controls in the grid', () => {
      const host = dom({ hide3d: true, editorView: 'grid' });
      expect(host.querySelector('.arch-workspace-bar').textContent).toContain('Retry 3D');
      expect(host.querySelector('.arch-workspace-bar').textContent).toContain('Floor Grid');
      expect(host.querySelector('.arch-studio-camera-controls')).toBeNull();
      expect(host.querySelector('[data-arch-grid]')).not.toBeNull();
    });
    it('keeps the workspace bar out of the drawing desk', () => {
      const host = dom({ showDrawings: true, sidebarCollapsed: true });
      expect(host.querySelector('.arch-workspace-bar')).toBeNull();
      expect(host.querySelector('#arch-sidebar-toggle')).toBeNull();
      expect(host.querySelector('#arch-drawings-desk')).not.toBeNull();
    });
  });
}
it('mirrors the final workspace source and harvests its user-facing labels', () => {
  expect(fs.readFileSync(files[0], 'utf8')).toBe(fs.readFileSync(files[1], 'utf8'));
  const harvest = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_workspace_2026-09-08.json', 'utf8'));
  expect(Object.keys(harvest)).toHaveLength(18);
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const source = fs.readFileSync(file, 'utf8');
    for (const [key, value] of Object.entries(harvest)) expect(source).toContain(JSON.stringify(key.replace('stem.archstudio.', '')) + ': ' + JSON.stringify(value));
  }
});
