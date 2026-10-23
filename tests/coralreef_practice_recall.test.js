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

describe('optional recall cards after identification practice', () => {
  it('starts collapsed, uses only this completed round, and keeps the name and marks out of an unrevealed card', async () => {
    const t = await mount(); expect(recall(t)).toBeNull();
    const ids = await finish(t), before = learning(t);
    expect(recall(t).open).toBe(false);
    await click(recall(t).querySelector('summary'));
    expect(recall(t).open).toBe(true);
    expect(card(t).dataset.practiceRecallCard).toBe(ids[0]);
    expect(recall(t).querySelector('[data-practice-recall-count]').textContent).toBe('Card 1 of 3');
    expect(answer(t).hidden).toBe(true); expect(answer(t).textContent).toBe('');
    expect(recall(t).textContent).not.toContain(TX[ids[0]].name);
    expect(card(t).querySelector('img').alt).toBe('Marine organism for recall');
    expect(card(t).querySelector('img').getAttribute('loading')).toBe('lazy');
    expect(recall(t).querySelector('[data-practice-recall-study]')).toBeNull();
    expect(learning(t)).toBe(before);
  });

  it('reveals all field marks and escaped session reflections, with bounded navigation and no score or saved-record changes', async () => {
    const t = await mount(), note = '<img src=x onerror=alert(1)> Check the appendages.';
    const ids = await finish(t, ['wrong', 'skip', 'correct'], note), before = learning(t);
    await click(recall(t).querySelector('summary'));
    const previous = recall(t).querySelector('[data-practice-recall-previous]');
    expect(previous.getAttribute('aria-disabled')).toBe('true'); await click(previous);
    expect(document.activeElement).toBe(previous); expect(card(t).dataset.practiceRecallCard).toBe(ids[0]);
    await click(recall(t).querySelector('[data-practice-recall-reveal]'));
    expect(answer(t).hidden).toBe(false);
    expect(answer(t).querySelector('h4').textContent).toBe(TX[ids[0]].name);
    expect([...answer(t).querySelectorAll('li')].map(el => el.textContent)).toEqual(TX[ids[0]].marks);
    expect(answer(t).querySelector('[data-practice-recall-chosen]').textContent).toContain(TX[ids[0]].marks[3]);
    expect(answer(t).querySelector('[data-practice-recall-reflection]').textContent).toBe(note);
    expect(answer(t).querySelector('[data-practice-recall-reflection] img')).toBeNull();
    await click(recall(t).querySelector('[data-practice-recall-reveal]')); expect(answer(t).hidden).toBe(true);
    for (const id of ids.slice(1)) {
      await click(recall(t).querySelector('[data-practice-recall-next]'));
      expect(card(t).dataset.practiceRecallCard).toBe(id); expect(answer(t).hidden).toBe(true);
      await click(recall(t).querySelector('[data-practice-recall-reveal]'));
    }
    const next = recall(t).querySelector('[data-practice-recall-next]');
    expect(next.getAttribute('aria-disabled')).toBe('true'); await click(next);
    expect(document.activeElement).toBe(next); expect(answer(t).hidden).toBe(false);
    await click(previous); expect(card(t).dataset.practiceRecallCard).toBe(ids[1]); expect(answer(t).hidden).toBe(true);
    expect(learning(t)).toBe(before); expect(t.data.speciesPractice.last.hinted).toBe(0);
    expect(JSON.stringify(t.data.speciesPractice)).not.toContain('appendages');
  });

  it('retains a revealed card through profile visits, review filtering and disclosure toggles', async () => {
    const t = await mount(), ids = await finish(t), before = learning(t);
    await click(recall(t).querySelector('summary'));
    await click(recall(t).querySelector('[data-practice-recall-next]'));
    await click(recall(t).querySelector('[data-practice-recall-reveal]'));
    await click(recall(t).querySelector('[data-practice-recall-study]'));
    expect(t.host.querySelector(`[data-marine-profile="${ids[1]}"]`)).toBeTruthy();
    await click(t.host.querySelector('[data-close-profile]'));
    expect(recall(t).open).toBe(true); expect(answer(t).hidden).toBe(false);
    expect(card(t).dataset.practiceRecallCard).toBe(ids[1]);
    await click(t.host.querySelector('[data-practice-review-filter="missed"]'));
    expect(card(t).dataset.practiceRecallCard).toBe(ids[1]); expect(answer(t).hidden).toBe(false);
    await click(recall(t).querySelector('summary')); await click(recall(t).querySelector('summary'));
    expect(answer(t).hidden).toBe(false); expect(learning(t)).toBe(before);
  });

  it('resets for a retry or fresh round, and keeps the original collection in its existing review', async () => {
    const t = await mount(), ids = await finish(t);
    await click(recall(t).querySelector('summary')); await click(recall(t).querySelector('[data-practice-recall-reveal]'));
    await click(t.host.querySelector('[data-practice-second-look]')); expect(recall(t)).toBeNull();
    const retry = await finish(t, ['correct', 'correct']);
    expect(new Set(retry)).toEqual(new Set(ids.slice(1)));
    expect(recall(t).open).toBe(false); expect(answer(t).hidden).toBe(true);
    expect(recall(t).querySelector('[data-practice-recall-count]').textContent).toBe('Card 1 of 2');
    expect([...t.host.querySelectorAll('[data-practice-earlier-organism]')].map(el => el.dataset.practiceEarlierOrganism)).toEqual(ids);
    const change = [...t.host.querySelectorAll('button')].find(el => el.textContent === 'Choose another group'); await click(change);
    await click(t.host.querySelector('[data-practice-start]')); expect(recall(t)).toBeNull();
    await finish(t, ['correct', 'correct', 'correct']);
    expect(recall(t).open).toBe(false); expect(answer(t).hidden).toBe(true);
    expect(t.host.querySelector('[data-practice-earlier-review]')).toBeNull();
  });

  it('handles a single card and a missing portrait with a generic accessible fallback and usable text', async () => {
    const t = await mount(['clownfish']); await finish(t, ['correct']);
    await click(recall(t).querySelector('summary'));
    const img = card(t).querySelector('img');
    await React.act(async () => { img.dispatchEvent(new Event('error')); await Promise.resolve(); });
    expect(card(t).querySelector('[role="img"]').getAttribute('aria-label')).toBe('Marine organism for recall');
    expect(recall(t).textContent).not.toContain(TX.clownfish.name);
    expect(recall(t).querySelector('canvas')).toBeNull();
    expect(recall(t).querySelector('[data-practice-recall-previous]').getAttribute('aria-disabled')).toBe('true');
    expect(recall(t).querySelector('[data-practice-recall-next]').getAttribute('aria-disabled')).toBe('true');
    await click(recall(t).querySelector('[data-practice-recall-reveal]'));
    expect(answer(t).textContent).toContain(TX.clownfish.marks[0]);
  });
});
