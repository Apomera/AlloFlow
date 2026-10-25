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
async function mount(ids = ['clownfish', 'blue_tang', 'cleaner_shrimp'], overrides = {}) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: Object.fromEntries(ids.map(id => [id, true])), speciesFieldNotes: { clownfish: 'My saved note' }, speciesLog: { green_turtle: { firstSeen: 10 } } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Shell() {
    const [state, setState] = React.useState(data); data = state;
    return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : fallback || key });
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


const another = t => recall(t).querySelector('[data-practice-recall-another-clue]');
const clue = t => recall(t).querySelector('[data-practice-recall-clue-text]');
const clueCount = t => recall(t).querySelector('[data-practice-recall-clue-count]');
const reveal = t => click(recall(t).querySelector('[data-practice-recall-reveal]'));
describe('recall from different field marks', () => {
  it('starts with the selected safe detail and cycles through each safe clue before wrapping, without changing saved learning', async () => {
    const t=await mount(), ids=await finish(t), before=learning(t);
    await click(recall(t).querySelector('summary')); await promptMode(t,'marks');
    const safe=X.marinePracticeClues(TX[ids[0]],X.SPECIES_META.find(m=>m.id===ids[0]));
    expect(clue(t).textContent).toBe(TX[ids[0]].marks[3]);
    const first=clue(t).textContent, seen=[];
    for(let i=0;i<safe.length;i++){
      seen.push(clue(t).textContent); expect(clueCount(t).textContent).toBe('Field mark '+(i+1)+' of '+safe.length);
      expect(document.getElementById(another(t).getAttribute('aria-controls'))).toBe(clue(t));
      await click(another(t)); expect(document.activeElement).toBe(another(t));
      expect(answer(t).textContent).toBe(''); expect(card(t).querySelector('img')).toBeNull();
    }
    expect(new Set(seen)).toEqual(new Set(safe)); expect(clue(t).textContent).toBe(first);
    expect(learning(t)).toBe(before); expect(recall(t).querySelector('canvas')).toBeNull();
  });
  it('hides an uncovered picture when changing clues and retains the chosen clue through answer reveal', async () => {
    const t=await mount(); await finish(t); await click(recall(t).querySelector('summary')); await promptMode(t,'marks');
    const first=clue(t).textContent; await click(pictureButton(t)); expect(card(t).querySelector('img')).toBeTruthy();
    await click(another(t)); expect(card(t).querySelector('img')).toBeNull(); expect(clue(t).textContent).not.toBe(first);
    expect(pictureButton(t).getAttribute('aria-expanded')).toBe('false'); const second=clue(t).textContent;
    await reveal(t); expect(another(t)).toBeNull(); expect(answer(t).hidden).toBe(false);
    await reveal(t); expect(clue(t).textContent).toBe(second); expect(clueCount(t).textContent).toMatch(/^Field mark 2 of/);
    expect(card(t).querySelector('img')).toBeNull(); expect(clue(t).getAttribute('aria-live')).toBeNull(); expect(recall(t).querySelector('[data-practice-recall-announcement]').getAttribute('aria-live')).toBe('polite');
  });
  it('resets the clue for a newly selected prompt, card, mixed order and targeted revisit while keeping self-checks', async () => {
    const t=await mount(), ids=await finish(t); await click(recall(t).querySelector('summary')); await promptMode(t,'marks');
    await click(another(t)); await promptMode(t,'name'); expect(another(t)).toBeNull();
    await promptMode(t,'marks'); expect(clueCount(t).textContent).toMatch(/^Field mark 1 of/);
    await click(another(t)); await reveal(t); await click(recall(t).querySelector('[data-practice-recall-rate="practice"]'));
    await click(recall(t).querySelector('[data-practice-recall-next]')); expect(clueCount(t).textContent).toMatch(/^Field mark 1 of/);
    await click(another(t)); await click(recall(t).querySelector('[data-practice-recall-order-toggle]')); expect(clueCount(t).textContent).toMatch(/^Field mark 1 of/);
    await click(another(t)); await click(recall(t).querySelector('[data-practice-recall-revisit]')); expect(card(t).dataset.practiceRecallCard).toBe(ids[0]);
    expect(clue(t).textContent).toBe(TX[ids[0]].marks[3]); await reveal(t);
    expect(recall(t).querySelector('[data-practice-recall-rate="practice"]').getAttribute('aria-pressed')).toBe('true');
  });
  it('keeps the current clue across a profile visit, review filters and disclosure, then starts a fresh retry', async () => {
    const t=await mount(); await finish(t); await click(recall(t).querySelector('summary')); await promptMode(t,'marks'); await click(another(t));
    const second=clue(t).textContent; await reveal(t); await click(recall(t).querySelector('[data-practice-recall-study]'));
    await click(t.host.querySelector('[data-close-profile]')); await reveal(t);
    await click(t.host.querySelector('[data-practice-review-filter="missed"]')); await click(recall(t).querySelector('summary')); await click(recall(t).querySelector('summary'));
    expect(clue(t).textContent).toBe(second); expect(clueCount(t).textContent).toMatch(/^Field mark 2 of/);
    await click(t.host.querySelector('[data-practice-second-look]')); await finish(t,['correct','correct']);
    expect(recall(t).dataset.practiceRecallPrompt).toBe('picture'); expect(another(t)).toBeNull();
    await click(recall(t).querySelector('summary')); await promptMode(t,'marks'); expect(clueCount(t).textContent).toMatch(/^Field mark 1 of/);
  });
  it('never cycles answer-bearing translated marks and handles one or zero safe clues without an empty control', async () => {
    const overrides=Object.fromEntries([1,2,3,4].map(n=>['stem.coralreef.sp_clownfish_mark'+n, 'Clown anemonefish is the named answer.']));
    for(const safeText of ['', 'Three pale bands cross the orange body.']){
      const t=await mount(['clownfish'],{...overrides,'stem.coralreef.sp_clownfish_mark1':safeText}); await finish(t,['correct']);
      await click(recall(t).querySelector('summary')); await promptMode(t,'marks');
      expect(another(t)).toBeNull(); expect(clueCount(t)).toBeNull(); expect(answer(t).textContent).toBe('');
      expect(clue(t).textContent).not.toContain('named answer');
      expect(clue(t).textContent).toBe(safeText || 'Notice the body shape, markings, and arrangement of fins, arms, or branches.');
      await click(pictureButton(t)); await reveal(t); expect(answer(t).textContent).toContain('Clown anemonefish');
    }
  });
});
