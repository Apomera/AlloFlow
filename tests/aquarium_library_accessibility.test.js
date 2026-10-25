import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { mounts.splice(0).forEach(({ root, host }) => { act(() => root.unmount()); host.remove(); }); vi.restoreAllMocks(); });
function find(node, match) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const result = find(child, match); if (result) return result; } return null; }
  return match(node) ? node : find(node.props?.children, match);
}
async function mount(patch = {}) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium');
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  const store = newStore(); let latest, update, tree;
  function Harness() {
    const [data, setData] = React.useState({ _aquarium: { mode: 'learn', selectedTank: 'freshwater', tutorialDismissed: true, soundEnabled: false, simRunning: false,
      fishIdentityVersion: 3, tankFish: [], fishInstanceIds: [], tankPlants: [], equipment: {}, habitatLayout: [], coins: 42, observationNotes: 'Keep my observation.',
      waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 10, salinity: 0, dissolvedO2: 7, co2: 3 }, ...patch } });
    latest = data._aquarium; update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    tree = tool.render(makeCtx({ toolData: data, setToolData: setData }, store));
    return React.createElement('div', null, tree, React.createElement('button', { 'data-other-control': 'true' }, 'Another control'));
  }
  await act(async () => root.render(React.createElement(Harness)));
  return { host, state: () => latest, update: values => act(async () => update(values)),
    items: mode => [...host.querySelectorAll('[data-aquarium-' + (mode === 'learn' ? 'learn' : 'reference') + '-item]')],
    heading: mode => host.querySelector('[data-aquarium-' + mode + '-heading]'),
    search: value => act(async () => find(tree, n => n.type === 'input' && n.props.type === 'search').props.onChange({ target: { value } })) };
}
async function activate(button) { await act(async () => { button.focus(); button.click(); }); }

describe('Aquarium Learn library accessibility', () => {
  it('exposes article selection and sends explicit activation to the named article heading', async () => {
    const t = await mount(); const initial = t.items('learn');
    expect(initial.filter(n => n.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    const chosen = initial[1]; await activate(chosen);
    const heading = t.heading('learn'), article = t.host.querySelector('[data-aquarium-learn-article]');
    expect(document.activeElement).toBe(heading); expect(article.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(chosen.getAttribute('aria-controls')).toBe(article.id); expect(chosen.getAttribute('aria-pressed')).toBe('true');
    expect(t.state().libArticle).toBe(chosen.dataset.aquariumLearnItem);
    expect(t.state().coins).toBe(42); expect(t.state().observationNotes).toBe('Keep my observation.');
  });

  it('filters active content without discarding the saved article or moving focus from its category', async () => {
    const t = await mount(); const chosen = t.items('learn').at(-1); await activate(chosen); const saved = t.state().libArticle;
    const category = chosen.firstElementChild.textContent.split(' · ')[0];
    const filter = [...t.host.querySelectorAll('[data-aquarium-learn-category]')].find(n => n.textContent !== 'All' && n.textContent !== category);
    await activate(filter);
    expect(document.activeElement).toBe(filter); expect(t.state().libArticle).toBe(saved);
    const visible = t.items('learn'); expect(visible.length).toBeGreaterThan(0);
    expect(t.host.querySelector('[data-aquarium-learn-article]').dataset.aquariumLearnArticle).toBe(visible[0].dataset.aquariumLearnItem);
    expect(visible[0].getAttribute('aria-pressed')).toBe('true');
    const status = t.host.querySelector('[data-aquarium-learn-results]'); expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toBe(visible.length + ' articles found');
    await activate(t.host.querySelector('[data-aquarium-learn-category="All"]'));
    expect(t.host.querySelector('[data-aquarium-learn-article]').dataset.aquariumLearnArticle).toBe(saved);
  });

  it('gives an empty category a clear result status and no unrelated active article', async () => {
    const t = await mount({ libCategory: 'No matching category', libArticle: 'keep-this-saved-selection' });
    expect(t.items('learn')).toHaveLength(0); expect(t.heading('learn')).toBeNull();
    expect(t.host.querySelector('[data-aquarium-learn-results]').textContent).toBe('0 articles found');
    expect(t.host.textContent).toContain('No articles match this category.'); expect(t.state().libArticle).toBe('keep-this-saved-selection');
  });
});

describe('Aquarium Reference library accessibility', () => {
  it('selects tables with supported states and focuses the named content heading', async () => {
    const t = await mount({ mode: 'reference' }), chosen = t.items('reference')[1]; await activate(chosen);
    const heading = t.heading('reference'), content = t.host.querySelector('[data-aquarium-reference-content]');
    expect(document.activeElement).toBe(heading); expect(content.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(chosen.getAttribute('aria-controls')).toBe(content.id); expect(chosen.getAttribute('aria-pressed')).toBe('true');
    expect(t.state().refSection).toBe(chosen.dataset.aquariumReferenceItem);
  });

  it('keeps search focus, reports matching counts, and restores a saved table after filtering', async () => {
    const t = await mount({ mode: 'reference' }), chosen = t.items('reference').at(-1); await activate(chosen); const saved = t.state().refSection;
    const firstTitle = t.items('reference')[0].firstElementChild.textContent;
    const search = t.host.querySelector('[data-aquarium-reference-search]'); search.focus();
    const result = t.host.querySelector('[data-aquarium-reference-results]');
    await t.search(firstTitle);
    expect(document.activeElement).toBe(search); expect(t.state().refSection).toBe(saved); expect(t.items('reference').length).toBeGreaterThan(0);
    expect(t.host.querySelector('[data-aquarium-reference-content]').dataset.aquariumReferenceContent).toBe(t.items('reference')[0].dataset.aquariumReferenceItem);
    expect(t.host.querySelector('[data-aquarium-reference-results]')).toBe(result); expect(result.getAttribute('role')).toBe('status'); expect(result.textContent).toBe(t.items('reference').length + ' tables found');
    await t.search('zzzz-no-match-zzzz');
    expect(document.activeElement).toBe(search); expect(t.heading('reference')).toBeNull(); expect(result.textContent).toBe('0 tables found');
    expect(t.host.textContent).toContain('No table matches that search.');
    await t.search(''); expect(t.host.querySelector('[data-aquarium-reference-content]').dataset.aquariumReferenceContent).toBe(saved);
    expect(t.state().coins).toBe(42); expect(t.state().observationNotes).toBe('Keep my observation.');
  });

  it('derives content from the selected category without overwriting the persistent selected table', async () => {
    const t = await mount({ mode: 'reference' }), chosen = t.items('reference').at(-1); await activate(chosen); const saved = t.state().refSection;
    const category = chosen.lastElementChild.textContent.split(' · ')[0];
    const filter = [...t.host.querySelectorAll('[data-aquarium-reference-category]')].find(n => n.textContent !== 'All' && n.textContent !== category);
    await activate(filter); expect(document.activeElement).toBe(filter); expect(t.state().refSection).toBe(saved);
    const first = t.items('reference')[0]; expect(first).toBeTruthy(); expect(first.getAttribute('aria-pressed')).toBe('true');
    expect(t.host.querySelector('[data-aquarium-reference-content]').dataset.aquariumReferenceContent).toBe(first.dataset.aquariumReferenceItem);
    await activate(t.host.querySelector('[data-aquarium-reference-category="All"]'));
    expect(t.host.querySelector('[data-aquarium-reference-content]').dataset.aquariumReferenceContent).toBe(saved);
  });
});

describe('Aquarium library focus ownership and instance identity', () => {
  it.each(['learn', 'reference'])('respects subsequent user focus movement during %s activation', async mode => {
    const t = await mount({ mode }), chosen = t.items(mode)[1], other = t.host.querySelector('[data-other-control]');
    await act(async () => { chosen.focus(); chosen.click(); other.focus(); });
    expect(document.activeElement).toBe(other); expect(t.state()[mode === 'learn' ? 'libArticle' : 'refSection']).toBe(chosen.dataset[mode === 'learn' ? 'aquariumLearnItem' : 'aquariumReferenceItem']);
  });

  it('uses stable unique search and content IDs across instances and mode switches', async () => {
    const original = document.activeElement, a = await mount({ mode: 'reference' }), b = await mount({ mode: 'reference' });
    const searchA = a.host.querySelector('[data-aquarium-reference-search]'), searchB = b.host.querySelector('[data-aquarium-reference-search]');
    expect(searchA.id).not.toBe(searchB.id); expect(searchA.labels).toHaveLength(1); expect(searchB.labels).toHaveLength(1);
    const id = searchA.id; await a.update({ mode: 'learn' }); await a.update({ mode: 'reference' });
    expect(a.host.querySelector('[data-aquarium-reference-search]').id).toBe(id); expect(document.activeElement).toBe(original);
  });
});
