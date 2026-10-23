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

describe('field-mark-first recall cards', () => {
  it('starts with the existing picture prompt and offers an anonymous written cue with a stable accessible picture target', async () => {
    const t = await mount(), ids = await finish(t), before = learning(t);
    await click(recall(t).querySelector('summary'));
    expect(recall(t).dataset.practiceRecallPrompt).toBe('picture'); expect(card(t).querySelector('img')).toBeTruthy();
    const select = await promptMode(t, 'marks');
    expect(document.activeElement).toBe(select); expect(recall(t).dataset.practiceRecallPrompt).toBe('marks');
    expect(card(t).querySelector('img')).toBeNull(); expect(answer(t).hidden).toBe(true); expect(answer(t).textContent).toBe('');
    const clue = card(t).querySelector('[data-practice-recall-clue]');
    expect(clue.textContent).toContain(TX[ids[0]].marks[3]); expect(clue.textContent).not.toContain(TX[ids[0]].name);
    expect(pictureButton(t).getAttribute('aria-expanded')).toBe('false');
    const target = document.getElementById(pictureButton(t).getAttribute('aria-controls'));
    expect(target).toBeTruthy(); expect(target.hidden).toBe(true);
    expect(recall(t).querySelector('[data-practice-recall-study]')).toBeNull(); expect(learning(t)).toBe(before);
  });

  it('uncovers the portrait optionally and reveals a complete card without changing the completed result or help count', async () => {
    const t = await mount(), ids = await finish(t), before = learning(t);
    await click(recall(t).querySelector('summary')); await promptMode(t, 'marks');
    await click(pictureButton(t)); expect(pictureButton(t).getAttribute('aria-expanded')).toBe('true');
    expect(card(t).querySelector('img').alt).toBe('Marine organism for recall'); expect(answer(t).hidden).toBe(true);
    await click(pictureButton(t)); expect(card(t).querySelector('img')).toBeNull(); expect(document.activeElement).toBe(pictureButton(t));
    await click(recall(t).querySelector('[data-practice-recall-reveal]'));
    expect(answer(t).querySelector('h4').textContent).toBe(TX[ids[0]].name); expect(card(t).querySelector('img')).toBeTruthy();
    expect(pictureButton(t)).toBeNull(); expect([...answer(t).querySelectorAll('li')].map(li => li.textContent)).toEqual(TX[ids[0]].marks);
    await click(recall(t).querySelector('[data-practice-recall-reveal]'));
    expect(card(t).querySelector('img')).toBeNull(); expect(answer(t).hidden).toBe(true); expect(learning(t)).toBe(before);
    expect(t.data.speciesPractice.last.hinted).toBe(0); expect(recall(t).querySelector('canvas')).toBeNull();
  });

  it('keeps the chosen prompt across navigation and order mixing while resetting the picture and revealed answer for each organism', async () => {
    const t = await mount(), ids = await finish(t), before = learning(t);
    await click(recall(t).querySelector('summary')); await promptMode(t, 'marks'); await click(pictureButton(t));
    await click(recall(t).querySelector('[data-practice-recall-next]'));
    expect(card(t).dataset.practiceRecallCard).toBe(ids[1]); expect(card(t).querySelector('img')).toBeNull(); expect(answer(t).hidden).toBe(true);
    expect(recall(t).dataset.practiceRecallPrompt).toBe('marks');
    await click(recall(t).querySelector('[data-practice-recall-reveal]')); await click(recall(t).querySelector('[data-practice-recall-order-toggle]'));
    expect(recall(t).dataset.practiceRecallPrompt).toBe('marks'); expect(answer(t).hidden).toBe(true); expect(card(t).querySelector('img')).toBeNull();
    const current = card(t).dataset.practiceRecallCard;
    await promptMode(t, 'picture'); expect(card(t).dataset.practiceRecallCard).toBe(current); expect(card(t).querySelector('img')).toBeTruthy();
    await promptMode(t, 'marks'); expect(card(t).dataset.practiceRecallCard).toBe(current); expect(card(t).querySelector('img')).toBeNull();
    expect(learning(t)).toBe(before);
  });

  it('preserves field-mark prompt and the current card across profiles and review filters, but resets the prompt for a retry', async () => {
    const t = await mount(), ids = await finish(t);
    await click(recall(t).querySelector('summary')); await promptMode(t, 'marks'); await click(recall(t).querySelector('[data-practice-recall-order-toggle]'));
    const current = card(t).dataset.practiceRecallCard;
    await click(recall(t).querySelector('[data-practice-recall-reveal]')); await click(recall(t).querySelector('[data-practice-recall-study]'));
    expect(t.host.querySelector('[data-marine-profile="' + current + '"]')).toBeTruthy(); await click(t.host.querySelector('[data-close-profile]'));
    expect(recall(t).dataset.practiceRecallPrompt).toBe('marks'); expect(recall(t).open).toBe(true); expect(answer(t).hidden).toBe(false);
    await click(t.host.querySelector('[data-practice-review-filter="missed"]')); await click(recall(t).querySelector('summary')); await click(recall(t).querySelector('summary'));
    expect(card(t).dataset.practiceRecallCard).toBe(current); expect(recall(t).dataset.practiceRecallPrompt).toBe('marks');
    await click(t.host.querySelector('[data-practice-second-look]')); const retry = await finish(t, ['correct', 'correct']);
    expect(new Set(retry)).toEqual(new Set(ids.slice(1))); expect(recall(t).dataset.practiceRecallPrompt).toBe('picture');
    expect(recall(t).open).toBe(false); expect(answer(t).hidden).toBe(true);
    expect([...t.host.querySelectorAll('[data-practice-earlier-organism]')].map(el => el.dataset.practiceEarlierOrganism)).toEqual(ids);
  });

  it('keeps the written clue usable when an uncovered portrait fails, including one-card collections', async () => {
    const t = await mount(['clownfish']); await finish(t, ['correct']); const before = learning(t);
    await click(recall(t).querySelector('summary')); await promptMode(t, 'marks'); await click(pictureButton(t));
    await React.act(async () => { card(t).querySelector('img').dispatchEvent(new Event('error')); await Promise.resolve(); });
    expect(card(t).querySelector('[data-practice-recall-clue]').textContent).toContain(TX.clownfish.marks[3]);
    expect(card(t).querySelector('[role="img"]').getAttribute('aria-label')).toBe('Marine organism for recall');
    expect(card(t).textContent).not.toContain(TX.clownfish.name); expect(card(t).querySelector('canvas')).toBeNull();
    await click(recall(t).querySelector('[data-practice-recall-reveal]')); expect(answer(t).textContent).toContain(TX.clownfish.name);
    expect(learning(t)).toBe(before);
  });
});
