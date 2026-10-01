import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];
for (const file of files) {
  describe('Architecture tool browser: ' + file, () => {
    let api;
    beforeEach(() => { resetStemLab(); loadTool(file, 'archStudio'); api = window.__alloArchToolbox; });
    const dom = (state = {}, overrides) => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('archStudio', { archStudio: { blocks: [], editorView: 'grid', ...state } }, overrides);
      return host;
    };
    it('keeps every existing action available once in the compact toolbar', () => {
      const host = dom();
      expect(api.catalog()).toHaveLength(29);
      expect(new Set(api.catalog().map(item => item.id)).size).toBe(29);
      expect(host.querySelectorAll('.arch-studio-feature-strip button')).toHaveLength(30);
      expect(host.querySelector('#arch-tool-browser-toggle').getAttribute('aria-expanded')).toBe('false');
      expect(host.querySelector('#arch-tool-browser')).toBeNull();
    });
    it('renders all categories with descriptive, uniquely identified action cards', () => {
      const host = dom({ toolBrowserOpen: true });
      expect(host.querySelectorAll('.arch-tool-group')).toHaveLength(5);
      expect(host.querySelector('#arch-tool-category').getAttribute('aria-label')).toBe('Tool category');
      expect(host.querySelectorAll('[data-arch-tool]')).toHaveLength(29);
      expect(host.querySelector('.arch-studio-feature-strip')).toBeNull();
      expect(host.querySelector('[role=status]').textContent).toBe('29 tools');
      const ids = [...host.querySelectorAll('[id]')].map(node => node.id);
      expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
      for (const button of host.querySelectorAll('button[data-arch-tool]')) {
        expect(button.type).toBe('button');
        expect(button.getAttribute('aria-label')).toBeTruthy();
        expect(host.querySelector('#' + button.getAttribute('aria-describedby'))).not.toBeNull();
      }
    });
    it.each([
      ['  BoM  ', 'all', ['schedule']],
      ['3d print', 'share', ['printlab', 'stl']],
      ['bill quantities', 'review', ['schedule']],
      ['COTTAGE', 'create', ['templates']],
      ['materials', 'create', []],
      ['unfindableword', 'all', []]
    ])('filters %s in %s without changing the catalog', (query, group, ids) => {
      const catalog = api.catalog(), before = JSON.stringify(catalog);
      expect(api.filter(catalog, query, group).map(item => item.id)).toEqual(ids);
      expect(JSON.stringify(catalog)).toBe(before);
    });
    it('searches translated names, descriptions, and categories without accent sensitivity', () => {
      dom({}, { t: (key, fallback) => ({
        'stem.archstudio.toolbox_templates_name': 'Modèles',
        'stem.archstudio.toolbox_templates_help': 'Choisir une maison',
        'stem.archstudio.toolbox_group_create': 'Création'
      })[key] || fallback });
      expect(api.filter(api.catalog(), 'modeles maison', 'all').map(item => item.id)).toEqual(['templates']);
      expect(api.filter(api.catalog(), 'creation', 'create')).toHaveLength(5);
    });
    it('accepts malformed restored filters and returns independent catalog objects', () => {
      const entries = api.catalog();
      expect(api.filter(entries, { bad: true }, 'missing')).toHaveLength(29);
      entries[0].name = 'Changed';
      expect(api.catalog()[0].name).toBe('Editor style');
      const host = dom({ toolBrowserOpen: true, toolBrowserQuery: [], toolBrowserGroup: 'missing' });
      expect(host.querySelector('#arch-tool-search').value).toBe('');
      expect(host.querySelector('#arch-tool-category').value).toBe('all');
      expect(host.querySelectorAll('[data-arch-tool]')).toHaveLength(29);
    });
    it('retains native disabled and active states and explains unavailable actions', () => {
      const host = dom({ toolBrowserOpen: true, showReplay: true, undoStack: [[]], soundEnabled: true, showAnalysis: true });
      for (const id of ['gravity', 'topsvg', 'sidesvg', 'printlab', 'stl']) expect(host.querySelector('[data-arch-tool="' + id + '"]').disabled).toBe(true);
      expect(host.querySelector('[data-arch-tool=gravity]').textContent).toContain('Exit replay');
      expect(host.querySelector('[data-arch-tool=stl]').textContent).toContain('Add blocks');
      for (const id of ['sound', 'analysis', 'replay']) {
        expect(host.querySelector('[data-arch-tool="' + id + '"]').getAttribute('aria-pressed')).toBe('true');
        expect(host.querySelector('[data-arch-tool="' + id + '"]').getAttribute('data-active')).toBe('true');
      }
    });
    it('renders an actionable empty state and hides the browser in the drawing desk', () => {
      const empty = dom({ toolBrowserOpen: true, toolBrowserQuery: 'zznoresult' });
      expect(empty.querySelector('.arch-tool-empty').textContent).toContain('reset the filters');
      expect(empty.querySelector('.arch-tool-reset').disabled).toBe(false);
      expect(empty.querySelectorAll('[data-arch-tool]')).toHaveLength(0);
      const drawing = dom({ toolBrowserOpen: true, showDrawings: true });
      expect(drawing.querySelector('.arch-studio-tools')).toBeNull();
    });
  });
}
it('keeps browser labels harvested and both source copies identical', () => {
  expect(fs.readFileSync(files[0], 'utf8')).toBe(fs.readFileSync(files[1], 'utf8'));
  const harvest = JSON.parse(fs.readFileSync('dev-tools/harvest_input_archstudio_toolbox_2026-09-08.json', 'utf8'));
  expect(Object.keys(harvest)).toHaveLength(78);
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    const source = fs.readFileSync(file, 'utf8');
    for (const [key, value] of Object.entries(harvest)) {
      expect(source).toContain(JSON.stringify(key.replace('stem.archstudio.', '')) + ': ' + JSON.stringify(value));
    }
  }
});
