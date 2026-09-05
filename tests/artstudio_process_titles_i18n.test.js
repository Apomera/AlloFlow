import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const toolPath = process.env.ART_STUDIO_PROCESS_SOURCE || 'stem_lab/stem_tool_artstudio.js';
function snapshot(id, title, parentStudyId = '') {
  return { id, tool: 'artStudio', timestamp: 1700000000000, label: 'Art Studio - Pixel Art', data: { tab: 'pixel', pixelGrid: 16 },
    artStudioStudy: { schemaVersion: 1, sourceTab: 'pixel', runId: 'title-review', threadId: '', stepLabel: 'Pixel Art',
      title, parentStudyId, branchDepth: parentStudyId ? 1 : 0, reflection: 'keep', note: '', summary: 'A saved pixel study', previewAlt: 'Learner image description' } };
}
describe('Art Studio Process Shelf titles and localization', () => {
  let root, host, config;
  beforeEach(() => {
    resetStemLab();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    config = loadTool(toolPath, 'artStudio');
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
  async function mount(t = (_key, fallback) => fallback, studies = [snapshot('one', 'Moon garden'), snapshot('two', 'Night orchard', 'one')]) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: { tab: 'artistExplorer', studioHome: false, studioCurrentProjectRunId: 'title-review' } });
      const [toolSnapshots, setToolSnapshots] = React.useState(studies);
      return config.render(makeCtx({ toolData, setToolData, toolSnapshots, setToolSnapshots, t }));
    }
    await act(async () => { root.render(React.createElement(Harness)); await Promise.resolve(); });
    await click(host.querySelector('#artstudio-process-button'));
  }
  async function click(node) {
    expect(node).not.toBeNull();
    await act(async () => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  }
  function cards() { return [...host.querySelectorAll('[data-artstudio-study-cards] > li')]; }
  it('names each action, lineage relationship and comparison by its displayed custom title', async () => {
    await mount();
    const allCards = cards();
    expect(allCards).toHaveLength(2);
    for (const card of allCards) {
      const title = card.querySelector('h4').textContent;
      for (const button of card.querySelectorAll('button[aria-label]')) expect(button.getAttribute('aria-label')).toContain(title);
    }
    expect(host.querySelector('[data-artstudio-variation-lineage]').textContent).toContain('Night orchard from Moon garden');
    await click(allCards[0].querySelector('button[aria-pressed]'));
    await click(allCards[1].querySelector('button[aria-pressed]'));
    const comparisons = [...host.querySelectorAll('[aria-labelledby="artstudio-process-compare-title"] article')];
    expect(comparisons).toHaveLength(2);
    comparisons.forEach(article => expect(article.getAttribute('aria-label')).toContain(article.querySelector('h5').textContent));
    expect(comparisons.map(article => article.getAttribute('aria-label')).join(' ')).not.toContain('undefined');
  });
  it('translates shelf controls and reflection defaults without translating learner titles or changing scope IDs', async () => {
    const translations = {
      'Process Shelf': 'Étagère des études', 'Current project': 'Projet actuel', 'Archived': 'Archivées',
      'Keep': 'Garder', 'A decision worth carrying forward.': 'Une décision à conserver.',
      'Select {title} for comparison': 'Comparer « {title} »', 'Archived {title}. It remains recoverable.': '« {title} » archivée et récupérable.',
    };
    await mount((_key, fallback) => translations[fallback] || fallback);
    const shelf = host.querySelector('#artstudio-process-shelf');
    expect(shelf.textContent).toContain('Étagère des études');
    expect(shelf.textContent).toContain('Projet actuel (2)');
    expect(cards()[0].textContent).toContain('Garder: Une décision à conserver.');
    expect(cards()[0].querySelector('button[aria-pressed]').getAttribute('aria-label')).toBe('Comparer « Moon garden »');
    expect(cards()[0].querySelector('h4').textContent).toBe('Moon garden');
    await click([...cards()[0].querySelectorAll('button')].find(button => button.getAttribute('aria-label')?.startsWith('Archive ')));
    expect(host.querySelector('#artstudio-process-status').textContent).toBe('« Moon garden » archivée et récupérable.');
    await click([...shelf.querySelectorAll('button')].find(button => button.textContent.startsWith('Archivées (')));
    expect(cards()).toHaveLength(1);
    expect(cards()[0].querySelector('h4').textContent).toBe('Moon garden');
    const restore = cards()[0].querySelector('button');
    expect(restore.getAttribute('aria-label')).toContain('Moon garden');
  });
});

