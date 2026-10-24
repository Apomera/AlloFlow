import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, TX;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; TX = X.speciesText((key, fallback) => fallback);
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
});
async function click(element) {
  expect(element, 'control exists').toBeTruthy();
  await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); });
}
async function type(element, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function mount(ids = ['clownfish', 'blue_tang', 'cleaner_shrimp']) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: Object.fromEntries(ids.map(id => [id, true])), speciesFieldNotes: { clownfish: 'My saved note' }, speciesLog: { green_turtle: { firstSeen: 10 } } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Shell() {
    const [state, setState] = React.useState(data); data = state;
    return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key });
  }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(host.querySelector('[data-start-practice]'));
  const select = host.querySelector('[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  await click(host.querySelector('[data-practice-start]'));
  return t;
}
const recall = t => t.host.querySelector('[data-practice-recall]');
const card = t => recall(t).querySelector('[data-practice-recall-card]');
const answer = t => recall(t).querySelector('[data-practice-recall-answer]');
const target = t => t.host.querySelector('.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
const learning = t => JSON.stringify(t.data);
async function finish(t, outcomes = ['correct', 'wrong', 'skip'], reflection = '') {
  const ids = [];
  for (const [i, outcome] of outcomes.entries()) {
    const id = target(t); ids.push(id);
    if (outcome === 'skip') await click(t.host.querySelector('[data-practice-skip]'));
    else await click([...t.host.querySelectorAll('[data-practice-choice]')].find(el => (el.dataset.practiceChoice === id) === (outcome === 'correct')));
    if (i === 0) {
      await click(t.host.querySelector('[data-practice-detail="3"]'));
      if (reflection) { await click(t.host.querySelector('[data-practice-written-reflection] summary')); await type(t.host.querySelector('[data-practice-reflection-input]'), reflection); }
    }
    await click(t.host.querySelector('[data-practice-next]'));
  }
  expect(t.host.querySelector('[data-marine-practice="complete"]')).toBeTruthy();
  return ids;
}


const toggleOrder = t => recall(t).querySelector('[data-practice-recall-order-toggle]');
async function orderIds(t) {
  const ids = [card(t).dataset.practiceRecallCard];
  while (recall(t).querySelector('[data-practice-recall-next]').getAttribute('aria-disabled') !== 'true') {
    await click(recall(t).querySelector('[data-practice-recall-next]'));
    ids.push(card(t).dataset.practiceRecallCard);
    expect(answer(t).hidden).toBe(true);
  }
  return ids;
}

describe('optional mixed recall-card order', () => {
  it('mixes every completed organism once, hides each new answer, and restores the original round order without changing records', async () => {
    const t = await mount(), ids = await finish(t), before = learning(t);
    await click(recall(t).querySelector('summary'));
    expect(recall(t).dataset.practiceRecallOrder).toBe('round');
    expect(toggleOrder(t).getAttribute('aria-pressed')).toBe('false');
    await click(recall(t).querySelector('[data-practice-recall-reveal]'));
    await click(toggleOrder(t));
    expect(document.activeElement).toBe(toggleOrder(t));
    expect(recall(t).dataset.practiceRecallOrder).toBe('mixed');
    expect(toggleOrder(t).getAttribute('aria-pressed')).toBe('true');
    expect(card(t).dataset.practiceRecallCard).not.toBe(ids[0]);
    expect(answer(t).hidden).toBe(true);
    const mixed = await orderIds(t);
    expect(mixed).toHaveLength(ids.length); expect(new Set(mixed)).toEqual(new Set(ids));
    expect(mixed).not.toEqual(ids);
    await click(recall(t).querySelector('[data-practice-recall-reveal]'));
    await click(toggleOrder(t));
    expect(recall(t).dataset.practiceRecallOrder).toBe('round');
    expect(card(t).dataset.practiceRecallCard).toBe(ids[0]); expect(answer(t).hidden).toBe(true);
    expect(await orderIds(t)).toEqual(ids);
    expect(learning(t)).toBe(before); expect(t.data.speciesPractice.last.hinted).toBe(0);
  });

  it('retains the mixed sequence and current revealed organism through profile visits, review filters and disclosure toggles', async () => {
    const t = await mount(); await finish(t); const before = learning(t);
    await click(recall(t).querySelector('summary')); await click(toggleOrder(t));
    const mixed = await orderIds(t), id = card(t).dataset.practiceRecallCard;
    await click(recall(t).querySelector('[data-practice-recall-reveal]'));
    await click(recall(t).querySelector('[data-practice-recall-study]'));
    expect(t.host.querySelector('[data-marine-profile="' + id + '"]')).toBeTruthy();
    await click(t.host.querySelector('[data-close-profile]'));
    expect(recall(t).open).toBe(true); expect(card(t).dataset.practiceRecallCard).toBe(id); expect(answer(t).hidden).toBe(false);
    expect(recall(t).dataset.practiceRecallOrder).toBe('mixed');
    await click(t.host.querySelector('[data-practice-review-filter="missed"]'));
    await click(recall(t).querySelector('summary')); await click(recall(t).querySelector('summary'));
    expect(card(t).dataset.practiceRecallCard).toBe(id); expect(answer(t).hidden).toBe(false);
    for (let i = 0; i < mixed.length - 1; i++) await click(recall(t).querySelector('[data-practice-recall-previous]'));
    expect(await orderIds(t)).toEqual(mixed); expect(learning(t)).toBe(before);
  });

  it('resets to round order on a focused retry or fresh collection while retaining the original review', async () => {
    const t = await mount(), ids = await finish(t);
    await click(recall(t).querySelector('summary')); await click(toggleOrder(t));
    await click(t.host.querySelector('[data-practice-second-look]')); expect(recall(t)).toBeNull();
    const retry = await finish(t, ['correct', 'correct']);
    expect(new Set(retry)).toEqual(new Set(ids.slice(1)));
    expect(recall(t).dataset.practiceRecallOrder).toBe('round'); expect(recall(t).open).toBe(false); expect(answer(t).hidden).toBe(true);
    expect([...t.host.querySelectorAll('[data-practice-earlier-organism]')].map(el => el.dataset.practiceEarlierOrganism)).toEqual(ids);
    await click(recall(t).querySelector('summary')); await click(toggleOrder(t));
    const change = [...t.host.querySelectorAll('button')].find(el => el.textContent === 'Choose another group'); await click(change);
    await click(t.host.querySelector('[data-practice-start]')); await finish(t, ['correct', 'correct', 'correct']);
    expect(recall(t).dataset.practiceRecallOrder).toBe('round'); expect(recall(t).open).toBe(false);
    expect(t.host.querySelector('[data-practice-earlier-review]')).toBeNull();
  });

  it('handles two-card mixes and omits the order control when there is only one card', async () => {
    const one = await mount(['clownfish']); await finish(one, ['correct']);
    expect(toggleOrder(one)).toBeNull(); expect(one.data.speciesPractice.last).toMatchObject({ total: 1, correct: 1, hinted: 0 });
    const pair = await mount(['clownfish', 'blue_tang']), ids = await finish(pair, ['correct', 'correct']);
    await click(recall(pair).querySelector('summary')); await click(toggleOrder(pair));
    expect(await orderIds(pair)).toEqual(ids.slice().reverse());
    await click(toggleOrder(pair)); expect(card(pair).dataset.practiceRecallCard).toBe(ids[0]);
    expect(pair.data.speciesPractice.last).toMatchObject({ total: 2, correct: 2, hinted: 0 });
  });
});
