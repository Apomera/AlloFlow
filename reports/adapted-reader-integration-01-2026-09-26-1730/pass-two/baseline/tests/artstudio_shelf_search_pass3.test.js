import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const toolPath = process.env.ART_STUDIO_SHELF_SOURCE || 'stem_lab/stem_tool_artstudio.js';
function snapshot(id, title, timestamp, stepIndex, extra = {}) {
  return { id, tool: 'artStudio', timestamp, label: 'Art Studio - Pixel Art', data: { tab: 'pixel', pixelGrid: 16 },
    artStudioStudy: { schemaVersion: 1, sourceTab: 'pixel', runId: 'search-review', threadId: '', stepIndex,
      stepLabel: 'Pixel Art', title, reflection: 'keep', summary: 'A saved pixel study', ...extra } };
}
const fixtures = () => [
  snapshot('one', 'Café garden', 100, 0, { note: 'Soft violet', intention: 'A calm place', description: 'Folded paper fans' }),
  snapshot('two', 'Amber sky', 300, 1, { parentStudyId: 'one', branchDepth: 1, note: 'Try a soft edge' }),
  snapshot('three', 'Blue bridge', 200, 2),
  snapshot('four', 'Other river', 400, null, { runId: 'other-project' }),
  snapshot('old', 'Old café', 50, null, { archivedAt: 500 }),
];
describe('Art Studio saved-study discovery', () => {
  let host, root, config;
  beforeEach(() => {
    resetStemLab();
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: query === '(max-width: 1279px)', addEventListener() {}, removeEventListener() {} })));
    config = loadTool(toolPath, 'artStudio');
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
  async function mount(t = (_key, fallback) => fallback) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: { tab: 'artistExplorer', studioHome: false, studioCurrentProjectRunId: 'search-review' } });
      const [toolSnapshots, setToolSnapshots] = React.useState(fixtures());
      return config.render(makeCtx({ toolData, setToolData, toolSnapshots, setToolSnapshots, t }));
    }
    await act(async () => root.render(React.createElement(Harness)));
    await click(host.querySelector('#artstudio-process-button'));
  }
  async function click(node) { expect(node).not.toBeNull(); await act(async () => { node.click(); }); }
  async function search(value) {
    await act(async () => {
      const input = host.querySelector('#artstudio-study-search');
      expect(input).not.toBeNull();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  async function sort(value) {
    await act(async () => {
      const select = host.querySelector('#artstudio-study-sort');
      expect(select).not.toBeNull();
      select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  async function scope(value) {
    await act(async () => {
      const select = host.querySelector('#artstudio-study-scope');
      expect(select).not.toBeNull();
      select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  function cards() { return [...host.querySelectorAll('[data-artstudio-study-cards] > li')]; }
  function titles() { return cards().map(card => card.querySelector('h4').textContent); }
  function button(prefix) { return [...host.querySelectorAll('#artstudio-process-shelf button')].find(node => node.textContent.startsWith(prefix)); }
  it('finds accent-free words across titles, notes, intentions, descriptions and lab labels', async () => {
    await mount();
    await search('  CAFE   VIOLET  '); expect(titles()).toEqual(['Café garden']);
    expect(host.querySelector('#artstudio-study-results').textContent).toBe('1 of 3 studies in Current project');
    await search('calm fans'); expect(titles()).toEqual(['Café garden']);
    await search('pixel'); expect(titles()).toEqual(['Café garden', 'Amber sky', 'Blue bridge']);
    await search('nothing-matches'); expect(titles()).toEqual([]);
    expect(host.querySelector('#artstudio-process-title').textContent).toBe('See how the idea changed');
    expect(host.querySelector('#artstudio-process-shelf').textContent).toContain('No studies match this search.');
    await click(host.querySelector('button[aria-label="Clear study search"]'));
    expect(titles()).toHaveLength(3);
  });
  it('sorts results without changing the underlying project order or saved family tree', async () => {
    await mount();
    expect(titles()).toEqual(['Café garden', 'Amber sky', 'Blue bridge']);
    await sort('newest'); expect(titles()).toEqual(['Amber sky', 'Blue bridge', 'Café garden']);
    await sort('oldest'); expect(titles()).toEqual(['Café garden', 'Blue bridge', 'Amber sky']);
    await sort('title'); expect(titles()).toEqual(['Amber sky', 'Blue bridge', 'Café garden']);
    await search('amber'); expect(titles()).toEqual(['Amber sky']);
    const lineage = host.querySelector('[data-artstudio-variation-lineage]');
    expect(lineage.textContent).toContain('Amber sky from Café garden');
    expect(lineage.querySelectorAll('li[data-study-id]')).toHaveLength(3);
    expect(lineage.closest('details').open).toBe(false);
    await search(''); await sort('project'); expect(titles()).toEqual(['Café garden', 'Amber sky', 'Blue bridge']);
  });
  it('retains and removes comparison selections even when a search hides their cards', async () => {
    await mount();
    await click(cards()[0].querySelector('button[aria-pressed]'));
    await search('amber');
    expect(host.querySelector('[data-artstudio-comparison-selection]').textContent).toContain('A: Café garden');
    await click(cards()[0].querySelector('button[aria-pressed]'));
    expect(host.querySelectorAll('[aria-labelledby="artstudio-process-compare-title"] article')).toHaveLength(2);
    await click(button('View comparison'));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 60)); });
    expect(document.activeElement.id).toBe('artstudio-process-compare-title');
    await click(host.querySelector('[data-artstudio-comparison-selection] button[aria-label="Remove Café garden from comparison slot A"]'));
    expect(host.querySelector('[data-artstudio-comparison-selection]').textContent).toContain('A: Amber sky');
    expect(host.querySelector('#artstudio-process-compare-title')).toBeNull();
    await scope('all');
    expect(host.querySelector('[data-artstudio-comparison-selection]')).toBeNull();
  });
  it('searches within the selected scope, including recoverable archived studies, with translated controls', async () => {
    await mount((_key, fallback) => ({ 'Search saved studies': 'Rechercher les études', 'Sort studies': 'Trier les études', 'Pixel Art': 'Art pixelisé' })[fallback] || fallback);
    expect(host.querySelector('label[for="artstudio-study-search"]').textContent).toBe('Rechercher les études');
    expect(host.querySelector('label[for="artstudio-study-sort"]').textContent).toBe('Trier les études');
    await search('river'); expect(titles()).toEqual([]);
    await scope('all'); expect(titles()).toEqual(['Other river']);
    await search('cafe'); expect(titles()).toEqual(['Café garden']);
    await scope('archived'); expect(titles()).toEqual(['Old café']);
    expect(host.querySelector('#artstudio-study-results').textContent).toBe('1 of 1 studies in Archived');
    await click(cards()[0].querySelector('button'));
    expect(titles()).toEqual([]);
    await scope('all'); expect(titles()).toEqual(['Old café', 'Café garden']);
    await search('pixelise'); expect(titles()).toHaveLength(5);
  });
});
