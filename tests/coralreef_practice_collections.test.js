import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Saved and review collections change question targets, never the dive's
// discovery record. Small collections stay small instead of adding outsiders.
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X;
beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => {
  while (mounted.length) {
    const item = mounted.pop();
    await React.act(async () => item.root.unmount());
    item.host.remove();
  }
});
async function mount(seed = {}) {
  let data = { coralReef: { section: 'guide', ...seed } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [state, setState] = React.useState(data); data = state;
    return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key });
  }
  const item = { host, root, get data() { return data; } }; mounted.push(item);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(host.querySelector('[data-start-practice="true"]'));
  return item;
}
async function click(element) {
  expect(element).toBeTruthy();
  await React.act(async () => { element.click(); await Promise.resolve(); });
}
async function collection(host, id) {
  const select = host.querySelector('[data-practice-collection-select]');
  expect(select).toBeTruthy();
  await React.act(async () => { select.value = id; select.dispatchEvent(new Event('change', { bubbles: true })); });
}
function targetId(host) {
  return host.querySelector('.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
}
function button(host, text) { return [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text); }

describe('marine practice collections', () => {
  it('filters saved and missed collections to unique living organisms without trusting malformed data', () => {
    const meta = X.SPECIES_META;
    expect(X.marinePracticeCollectionIds(meta, 'saved', { clownfish: true, reef_star: true, made_up: true, blue_tang: 'true' }, [])).toEqual(['clownfish']);
    const missed = X.marinePracticeCollectionIds(meta, 'revisit', {}, ['blue_tang', 'reef_star', 'blue_tang', 'made_up', 'green_turtle']);
    expect(missed.sort()).toEqual(['blue_tang', 'green_turtle']);
    for (const raw of [null, [], 'wrong', false]) expect(X.marinePracticeCollectionIds(meta, 'saved', raw, raw)).toEqual([]);
    expect(X.marinePracticeCollectionIds(meta, 'revisit', {}, 'clownfish')).toEqual([]);
    expect(X.marinePracticeCollectionIds(meta, 'fish', {}, [])).toEqual(meta.filter((m) => m.group === 'fish').map((m) => m.id));
    expect(X.marinePracticeCollectionIds(meta, 'unknown', {}, [])).toEqual(meta.filter((m) => m.group !== 'structure').map((m) => m.id));
  });

  it('asks only saved living species and keeps a two-organism collection at two questions', async () => {
    const log = { green_turtle: { site: 'healthy', firstSeen: 10 } };
    const t = await mount({ speciesBookmarks: { clownfish: true, blue_tang: true, reef_star: true }, speciesLog: log });
    await collection(t.host, 'saved');
    expect(t.host.querySelector('[data-practice-count]').getAttribute('data-practice-count')).toBe('2');
    expect(t.host.textContent).toContain('2 available. 2 in this round.');
    await click(t.host.querySelector('[data-practice-start]'));
    const asked = [];
    for (let i = 0; i < 2; i++) {
      asked.push(targetId(t.host));
      await click(t.host.querySelector('[data-practice-skip]'));
      await click(t.host.querySelector('[data-practice-next]'));
    }
    expect(asked.sort()).toEqual(['blue_tang', 'clownfish']);
    expect(t.host.querySelector('[data-marine-practice="complete"]')).toBeTruthy();
    expect(t.data.coralReef.speciesPractice.last).toMatchObject({ total: 2, correct: 0, skipped: 2 });
    expect(t.data.coralReef.speciesLog).toEqual(log);
    expect(t.data.coralReef.speciesBookmarks).toEqual({ clownfish: true, blue_tang: true, reef_star: true });
  });

  it('revisits a persisted missed set and offers a new collection after it is fully recognized', async () => {
    const t = await mount({ speciesPractice: { rounds: 1, answered: 3, correct: 1, last: { total: 3, correct: 1, skipped: 0, missedIds: ['blue_tang', 'clownfish', 'blue_tang', 'reef_star', 'made_up'] } } });
    await collection(t.host, 'revisit');
    expect(t.host.querySelector('[data-practice-count]').getAttribute('data-practice-count')).toBe('2');
    await click(t.host.querySelector('[data-practice-start]'));
    const asked = [];
    for (let i = 0; i < 2; i++) {
      const id = targetId(t.host); asked.push(id);
      await click(t.host.querySelector('[data-practice-choice="' + id + '"]'));
      await click(t.host.querySelector('[data-practice-next]'));
    }
    expect(asked.sort()).toEqual(['blue_tang', 'clownfish']);
    expect(t.data.coralReef.speciesPractice).toMatchObject({ rounds: 2, last: { total: 2, correct: 2, missedIds: [] } });
    await click(button(t.host, 'Choose a mixed collection'));
    expect(t.host.querySelector('[data-marine-practice="setup"]')).toBeTruthy();
    expect(t.host.querySelector('[data-practice-collection-select]').value).toBe('all');
    expect(t.host.querySelector('[data-practice-start]')).toBeTruthy();
    expect(t.data.coralReef.speciesLog).toBeUndefined();
  });

  it('explains empty collections and can recover without starting a zero-question round', async () => {
    const t = await mount({ speciesBookmarks: { reef_star: true }, speciesPractice: { rounds: 'bad', last: { missedIds: ['not_a_species'] } } });
    await collection(t.host, 'saved');
    expect(t.host.textContent).toContain('Save a few species first.');
    expect(t.host.querySelector('[data-practice-start]')).toBeNull();
    expect(t.host.querySelector('[data-practice-count]').getAttribute('data-practice-count')).toBe('0');
    await click(t.host.querySelector('[data-practice-mixed]'));
    expect(document.activeElement).toBe(t.host.querySelector('[data-practice-collection-select]'));
    expect(t.host.querySelector('[data-practice-start]')).toBeTruthy();
    await collection(t.host, 'revisit');
    expect(t.host.textContent).toContain('Your review collection starts after a round.');
    expect(t.host.querySelector('[data-practice-start]')).toBeNull();
    expect(t.data.coralReef.speciesLog).toBeUndefined();
  });
});
