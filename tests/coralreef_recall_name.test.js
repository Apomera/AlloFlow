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


const cue = t => recall(t).querySelector('[data-practice-recall-name-cue]');
const reveal = t => click(recall(t).querySelector('[data-practice-recall-reveal]'));
const rate = (t, value) => recall(t).querySelector('[data-practice-recall-rate="' + value + '"]');
describe('species-name-first recall', () => {
  it('offers only the name and retrieval prompt, with no portrait, field marks, reflections or checks before reveal', async () => {
    const t = await mount(), ids = await finish(t, ['correct','wrong','skip'], 'Recorded field note'), before = learning(t);
    await click(recall(t).querySelector('summary')); const select = await promptMode(t, 'name');
    expect(document.activeElement).toBe(select); expect(cue(t).querySelector('h4').textContent).toBe(TX[ids[0]].name);
    expect(card(t).querySelector('img')).toBeNull(); expect(answer(t).hidden).toBe(true); expect(answer(t).textContent).toBe('');
    for (const mark of TX[ids[0]].marks) expect(card(t).textContent).not.toContain(mark);
    expect(card(t).textContent).not.toContain('Recorded field note'); expect(rate(t,'remembered')).toBeNull();
    expect(recall(t).querySelector('[data-practice-recall-reveal]').textContent).toBe('Reveal field marks');
    expect(document.getElementById(select.getAttribute('aria-describedby')).textContent).toContain('Start with the name');
    expect(learning(t)).toBe(before);
  });
  it('optionally uncovers the portrait and reveals marks with mode-specific instructions and safe hiding', async () => {
    const t = await mount(), ids = await finish(t), before = learning(t);
    await click(recall(t).querySelector('summary')); await promptMode(t,'name');
    await click(pictureButton(t)); expect(pictureButton(t).textContent).toBe('Return to the name');
    expect(card(t).querySelector('figcaption').textContent).toBe('Recall two field marks you would look for on a dive.');
    expect(answer(t).textContent).toBe(''); await click(pictureButton(t)); expect(card(t).querySelector('img')).toBeNull();
    await reveal(t); expect([...answer(t).querySelectorAll('li')].map(n=>n.textContent)).toEqual(TX[ids[0]].marks);
    expect(card(t).querySelector('img')).toBeTruthy(); expect(recall(t).querySelector('[data-practice-recall-reveal]').textContent).toBe('Hide field marks');
    await reveal(t); expect(card(t).querySelector('img')).toBeNull(); expect(cue(t)).toBeTruthy();
    await click(pictureButton(t)); await reveal(t); await reveal(t); expect(card(t).querySelector('img')).toBeTruthy();
    expect(learning(t)).toBe(before); expect(recall(t).querySelector('canvas')).toBeNull();
  });
  it('clears name and revealed marks when switching back to anonymous prompts, preserving the selected organism and self-check', async () => {
    const t = await mount(), ids = await finish(t), before=learning(t);
    await click(recall(t).querySelector('summary')); await promptMode(t,'name'); await reveal(t); await click(rate(t,'practice'));
    await promptMode(t,'marks'); expect(card(t).dataset.practiceRecallCard).toBe(ids[0]); expect(cue(t)).toBeNull();
    expect(answer(t).hidden).toBe(true); expect(card(t).querySelector('img')).toBeNull(); expect(card(t).textContent).not.toContain(TX[ids[0]].name);
    await promptMode(t,'picture'); expect(cue(t)).toBeNull(); expect(card(t).querySelector('img')).toBeTruthy();
    await promptMode(t,'name'); await reveal(t); expect(rate(t,'practice').getAttribute('aria-pressed')).toBe('true'); expect(learning(t)).toBe(before);
  });
  it('preserves name mode through reorder, targeted revisit and profile navigation, then resets it for a new retry', async () => {
    const t = await mount(), ids=await finish(t);
    await click(recall(t).querySelector('summary')); await promptMode(t,'name'); await reveal(t); await click(rate(t,'practice'));
    await click(recall(t).querySelector('[data-practice-recall-order-toggle]'));
    expect(recall(t).dataset.practiceRecallPrompt).toBe('name'); expect(answer(t).hidden).toBe(true);
    await click(recall(t).querySelector('[data-practice-recall-revisit]')); expect(card(t).dataset.practiceRecallCard).toBe(ids[0]);
    expect(card(t).querySelector('img')).toBeNull(); await reveal(t); await click(recall(t).querySelector('[data-practice-recall-study]'));
    await click(t.host.querySelector('[data-close-profile]')); await click(t.host.querySelector('[data-practice-review-filter="missed"]'));
    expect(recall(t).dataset.practiceRecallPrompt).toBe('name'); expect(answer(t).hidden).toBe(false); expect(rate(t,'practice').getAttribute('aria-pressed')).toBe('true');
    await click(t.host.querySelector('[data-practice-second-look]')); await finish(t,['correct','correct']);
    expect(recall(t).dataset.practiceRecallPrompt).toBe('picture'); expect(cue(t)).toBeNull(); expect(recall(t).open).toBe(false);
  });
  it('keeps a single-card name cue usable if its portrait fails and shows no field marks before reveal', async () => {
    const t = await mount(['clownfish']); await finish(t,['correct']);
    await click(recall(t).querySelector('summary')); await promptMode(t,'name'); await click(pictureButton(t));
    await React.act(async()=>{card(t).querySelector('img').dispatchEvent(new Event('error')); await Promise.resolve();});
    expect(cue(t).querySelector('h4').textContent).toBe(TX.clownfish.name); expect(answer(t).textContent).toBe('');
    expect(card(t).querySelector('[role="img"]').getAttribute('aria-label')).toBe('Marine organism for recall');
    await click(pictureButton(t)); expect(card(t).querySelector('[role="img"]')).toBeNull();
    await reveal(t); expect(answer(t).textContent).toContain(TX.clownfish.marks[0]); expect(card(t).querySelector('canvas')).toBeNull();
  });
});
