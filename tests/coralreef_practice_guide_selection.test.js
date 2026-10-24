import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef'); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(element) { expect(element, 'control exists').toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
async function change(element, value) { expect(element).toBeTruthy(); await React.act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function search(t, value) { const element = t.host.querySelector('input[type="search"]'); await React.act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); }); }
const query = (t, selector) => t.host.querySelector(selector);
const named = (t, text) => [...t.host.querySelectorAll('button')].find(el => el.textContent.trim() === text);
const visible = t => [...t.host.querySelectorAll('[data-species]')].map(el => el.dataset.species);
const collection = t => query(t, '[data-practice-collection-select]');
const target = t => query(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
async function mount(seed = {}) {
  let data = { coralReef: { section: 'guide', ...seed } }, update;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; update = setState; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; }, async patch(patch) { await React.act(async () => update(before => ({ ...before, coralReef: { ...before.coralReef, ...patch } }))); } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}
async function openPractice(t) { await click(query(t, '[data-start-practice]')); }
async function finish(t) { const id = target(t); await click(query(t, '[data-practice-choice="' + id + '"]')); await click(query(t, '[data-practice-next]')); return id; }

describe('practice from the current guide selection', () => {
  it('defaults to the filtered guide collection and asks only its living organisms', async () => {
    const t = await mount({ guideGroupFilter: 'coral', speciesLog: { green_turtle: { firstSeen: 1 } } }), expected = visible(t);
    expect(expected).toHaveLength(7); await openPractice(t);
    expect(collection(t).value).toBe('selection'); expect(collection(t).selectedOptions[0].textContent).toBe('This guide selection (7)');
    expect(query(t, '[data-practice-count]').textContent).toContain('7 available. 5 in this round.');
    expect(query(t, '[data-practice-count]').textContent).toContain('stays the same during this practice visit');
    await click(query(t, '[data-practice-start]')); const asked = [];
    for (let i = 0; i < 5; i++) asked.push(await finish(t));
    expect(new Set(asked).size).toBe(5); expect(asked.every(id => expected.includes(id))).toBe(true);
    expect(t.data.speciesPractice.last).toMatchObject({ total: 5, correct: 5, hinted: 0 });
    expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
    expect(JSON.stringify(t.data)).not.toMatch(/selectionIds|practiceSelection/);
  });

  it('intersects saved collection, group, reef role and query without widening the selected targets', async () => {
    const t = await mount({ guideFilter: 'saved', guideGroupFilter: 'invertebrate', speciesBookmarks: { cleaner_shrimp: true, cleaner_wrasse: true, brain_coral: true, reef_star: true } });
    await change(query(t, '[data-guide-role]'), 'cleaners'); await search(t, 'shrimp');
    expect(visible(t)).toEqual(['cleaner_shrimp']); await openPractice(t);
    expect(collection(t).value).toBe('selection'); expect(query(t, '[data-practice-count]').dataset.practiceCount).toBe('1');
    await click(query(t, '[data-practice-start]')); expect(target(t)).toBe('cleaner_shrimp');
    await finish(t); expect(t.data.speciesPractice.last.total).toBe(1);
    await click(named(t, 'Back to the field guide'));
    expect(visible(t)).toEqual(['cleaner_shrimp']); expect(query(t, 'input[type="search"]').value).toBe('shrimp'); expect(query(t, '[data-guide-role]').value).toBe('cleaners');
  });

  it('includes the field-notes collection and excludes unrelated notes and restoration structures', async () => {
    const t = await mount({ guideFilter: 'notes', speciesFieldNotes: { brain_coral: 'My coral note', staghorn_coral: 'Branching note', clownfish: 'Fish note', reef_star: 'Frame note', blue_tang: '   ' } });
    await search(t, 'coral'); expect(visible(t).sort()).toEqual(['brain_coral', 'staghorn_coral']); await openPractice(t);
    expect(query(t, '[data-practice-count]').dataset.practiceCount).toBe('2');
    await click(query(t, '[data-practice-start]')); const asked = [await finish(t), await finish(t)]; expect(asked.sort()).toEqual(['brain_coral', 'staghorn_coral']);
  });

  it('keeps the launch snapshot through profile edits, external filter changes, retries and collection switching', async () => {
    const t = await mount({ guideFilter: 'saved', speciesBookmarks: { clownfish: true, blue_tang: true }, speciesFieldNotes: { clownfish: 'Old note' } });
    await openPractice(t); await click(query(t, '[data-practice-start]')); const first = target(t);
    await click([...t.host.querySelectorAll('[data-practice-choice]')].find(el => el.dataset.practiceChoice !== first));
    await click(named(t, 'Study profile')); await click(query(t, '[data-save-profile]'));
    await t.patch({ guideGroupFilter: 'coral', speciesFieldNotes: {} }); await click(query(t, '[data-close-profile]'));
    expect(target(t)).toBe(first); expect(query(t, '[data-practice-feedback]')).toBeTruthy();
    await click(query(t, '[data-practice-next]')); const second = await finish(t); expect([first, second].sort()).toEqual(['blue_tang', 'clownfish']);
    await click(query(t, '[data-practice-second-look]')); expect(target(t)).toBe(first); await finish(t);
    await click(named(t, 'Choose another group')); expect(collection(t).value).toBe('selection'); expect(query(t, '[data-practice-count]').dataset.practiceCount).toBe('2');
    await change(collection(t), 'saved'); expect(query(t, '[data-practice-count]').dataset.practiceCount).toBe('1');
    await change(collection(t), 'selection'); expect(query(t, '[data-practice-count]').dataset.practiceCount).toBe('2');
    expect(t.data.guideGroupFilter).toBe('coral'); expect(t.data.speciesFieldNotes).toEqual({});
  });

  it.each(['structures', 'no-results'])('explains an empty %s selection without silently adding other organisms', async kind => {
    const t = await mount(kind === 'structures' ? { guideGroupFilter: 'structure' } : {});
    if (kind === 'no-results') await search(t, 'zzzz no matching species');
    await openPractice(t); expect(collection(t).value).toBe('selection'); expect(collection(t).selectedOptions[0].textContent).toBe('This guide selection (0)');
    expect(query(t, '[data-practice-start]')).toBeNull(); expect(query(t, '[data-practice-count]').textContent).toContain('No living organisms in this guide selection.');
    await click(query(t, '[data-practice-mixed]')); expect(collection(t).value).toBe('all'); expect(document.activeElement).toBe(collection(t)); expect(query(t, '[data-practice-start]')).toBeTruthy();
    await change(collection(t), 'selection'); expect(query(t, '[data-practice-start]')).toBeNull();
    await click(named(t, 'Back to the field guide'));
    expect(kind === 'structures' ? query(t, '[data-guide-group-filter]').value : query(t, 'input[type="search"]').value).toBe(kind === 'structures' ? 'structure' : 'zzzz no matching species');
  });

  it('leaves unfiltered and profile-origin launches mixed, and recaptures a new guide visit', async () => {
    const t = await mount(); await openPractice(t); expect(collection(t).value).toBe('all'); expect(collection(t).querySelector('[value="selection"]')).toBeNull();
    await click(named(t, 'Back to the field guide')); await search(t, 'clownfish'); await click(query(t, '[data-open-profile="clownfish"]'));
    await click(named(t, 'Try identification practice')); expect(collection(t).value).toBe('all'); expect(collection(t).querySelector('[value="selection"]')).toBeNull();
    await click(named(t, 'Back to the field guide')); await search(t, 'turtle'); expect(visible(t)).toEqual(['green_turtle', 'hawksbill_turtle']); await openPractice(t);
    expect(collection(t).value).toBe('selection'); expect(query(t, '[data-practice-count]').dataset.practiceCount).toBe('2');
    await click(named(t, 'Back to the field guide')); await search(t, 'clownfish'); await openPractice(t); expect(query(t, '[data-practice-count]').dataset.practiceCount).toBe('1');
    await click(query(t, '[data-practice-start]')); expect(target(t)).toBe('clownfish');
  });
});
