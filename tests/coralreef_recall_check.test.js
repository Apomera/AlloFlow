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


async function promptMode(t, value) {
  const select = recall(t).querySelector('[data-practice-recall-prompt-select]');
  await React.act(async () => { select.focus(); select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); });
  return select;
}
const pictureButton = t => recall(t).querySelector('[data-practice-recall-picture-toggle]');


const rate = (t, value) => recall(t).querySelector('[data-practice-recall-rate="' + value + '"]');
const progress = t => recall(t).querySelector('[data-practice-recall-check-progress]').textContent;
const revisit = t => recall(t).querySelector('[data-practice-recall-revisit]');
const reveal = t => click(recall(t).querySelector('[data-practice-recall-reveal]'));
describe('session-only recall self-check', () => {
  it('starts unchecked and offers checks only after revealing, without changing learning records', async () => {
    const t = await mount(); await finish(t); const before = learning(t);
    await click(recall(t).querySelector('summary'));
    expect(rate(t, 'remembered')).toBeNull(); expect(progress(t)).toContain('0 remembered · 0 to practise · 3 unchecked');
    expect(revisit(t).getAttribute('aria-disabled')).toBe('true');
    await click(revisit(t)); expect(answer(t).hidden).toBe(true);
    await reveal(t); await click(rate(t, 'remembered'));
    expect(document.activeElement).toBe(rate(t, 'remembered')); expect(rate(t, 'remembered').getAttribute('aria-pressed')).toBe('true');
    expect(progress(t)).toContain('1 remembered · 0 to practise · 2 unchecked');
    await click(rate(t, 'practice')); expect(rate(t, 'remembered').getAttribute('aria-pressed')).toBe('false');
    expect(progress(t)).toContain('0 remembered · 1 to practise · 2 unchecked');
    await click(rate(t, 'practice')); expect(progress(t)).toContain('0 remembered · 0 to practise · 3 unchecked');
    expect(learning(t)).toBe(before); expect(recall(t).querySelector('canvas')).toBeNull();
  });
  it('revisits only marked cards, wraps in current order and hides answers and uncovered pictures', async () => {
    const t = await mount(), ids = await finish(t), before = learning(t);
    await click(recall(t).querySelector('summary')); await promptMode(t, 'marks');
    await reveal(t); await click(rate(t, 'practice'));
    await click(recall(t).querySelector('[data-practice-recall-next]')); await reveal(t); await click(rate(t, 'remembered'));
    await click(recall(t).querySelector('[data-practice-recall-next]')); await reveal(t); await click(rate(t, 'practice'));
    await click(revisit(t)); expect(card(t).dataset.practiceRecallCard).toBe(ids[0]);
    expect(document.activeElement).toBe(recall(t).querySelector('[data-practice-recall-count]')); expect(answer(t).hidden).toBe(true); expect(card(t).querySelector('img')).toBeNull();
    await click(pictureButton(t)); await click(revisit(t)); expect(card(t).dataset.practiceRecallCard).toBe(ids[2]);
    expect(card(t).querySelector('img')).toBeNull(); expect(answer(t).hidden).toBe(true);
    await reveal(t); expect(rate(t, 'practice').getAttribute('aria-pressed')).toBe('true'); expect(learning(t)).toBe(before);
  });
  it('keeps checks attached to organism IDs through mixed order, prompt changes and profile visits', async () => {
    const t = await mount(), ids = await finish(t);
    await click(recall(t).querySelector('summary')); await reveal(t); await click(rate(t, 'practice'));
    await click(recall(t).querySelector('[data-practice-recall-order-toggle]')); await promptMode(t, 'marks');
    await click(revisit(t)); expect(card(t).dataset.practiceRecallCard).toBe(ids[0]); await reveal(t);
    expect(rate(t, 'practice').getAttribute('aria-pressed')).toBe('true');
    await click(recall(t).querySelector('[data-practice-recall-study]')); await click(t.host.querySelector('[data-close-profile]'));
    await click(t.host.querySelector('[data-practice-review-filter="missed"]'));
    expect(rate(t, 'practice').getAttribute('aria-pressed')).toBe('true'); expect(progress(t)).toContain('1 to practise');
    await click(recall(t).querySelector('summary')); await click(recall(t).querySelector('summary'));
    expect(progress(t)).toContain('1 to practise');
  });
  it('resets all checks for a new retry and keeps original identification results independent', async () => {
    const t = await mount(), ids = await finish(t);
    await click(recall(t).querySelector('summary')); await reveal(t); await click(rate(t, 'practice'));
    await click(recall(t).querySelector('[data-practice-recall-next]')); await reveal(t); await click(rate(t, 'remembered'));
    const before = t.data.speciesPractice.last; expect(before.correct).toBe(1);
    await click(t.host.querySelector('[data-practice-second-look]')); const retry = await finish(t, ['correct', 'correct']);
    expect(new Set(retry)).toEqual(new Set(ids.slice(1))); expect(progress(t)).toContain('0 remembered · 0 to practise · 2 unchecked');
    expect(revisit(t).getAttribute('aria-disabled')).toBe('true'); expect(recall(t).open).toBe(false);
  });
  it('supports a single marked card and no-op revisit without losing focus', async () => {
    const t = await mount(['clownfish']); await finish(t, ['correct']);
    await click(recall(t).querySelector('summary')); await reveal(t); await click(rate(t, 'practice'));
    await click(revisit(t)); expect(answer(t).hidden).toBe(true); expect(document.activeElement).toBe(recall(t).querySelector('[data-practice-recall-count]'));
    await reveal(t); await click(rate(t, 'remembered')); await click(revisit(t));
    expect(answer(t).hidden).toBe(false); expect(document.activeElement).toBe(revisit(t)); expect(progress(t)).toContain('1 remembered · 0 to practise · 0 unchecked');
  });
});
