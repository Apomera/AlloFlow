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

const note = t => recall(t).querySelector('[data-practice-recall-note-input]');
const noteReview = t => recall(t).querySelector('[data-practice-recall-note-review]');
async function openNote(t) { const d=recall(t).querySelector('[data-practice-recall-note]'); if(!d.open) await click(d.querySelector('summary')); return note(t); }
describe('optional notes for recalled organisms', () => {
  it('starts optional and empty, bounds input and compares escaped text with the revealed card without saving or grading it', async () => {
    const t=await mount(); await finish(t); const records=learning(t);
    await click(recall(t).querySelector('summary'));
    expect(recall(t).querySelector('[data-practice-recall-note]').open).toBe(false);
    const input=await openNote(t); expect(input.value).toBe(''); expect(input.maxLength).toBe(240);
    expect(recall(t).querySelector('label[for="'+input.id+'"]').textContent).toBe('Your guess or identifying features');
    for(const id of input.getAttribute('aria-describedby').split(' '))expect(document.getElementById(id)).toBeTruthy();
    const raw='<img src=x onerror="window.bad=true">\nA broad shell '+ 'x'.repeat(250);
    await type(input,raw); expect(note(t).value).toBe(raw.slice(0,240));
    expect(recall(t).querySelector('[data-practice-recall-note-count]').textContent).toBe('240 of 240 characters');
    await reveal(t); expect(note(t)).toBeNull(); expect(noteReview(t).querySelector('blockquote').textContent).toBe(raw.slice(0,240));
    expect(noteReview(t).querySelector('img')).toBeNull(); expect(noteReview(t).textContent).not.toContain('correct');
    await reveal(t); expect(note(t).value).toBe(raw.slice(0,240)); expect(learning(t)).toBe(records); expect(recall(t).querySelector('canvas')).toBeNull();
  });
  it('keeps separate drafts by organism across navigation and every prompt mode', async () => {
    const t=await mount(),ids=await finish(t); await click(recall(t).querySelector('summary'));
    await type(await openNote(t),'First organism: broad stripes');
    await click(recall(t).querySelector('[data-practice-recall-next]')); expect(note(t).value).toBe('');
    await type(await openNote(t),'Second organism: forked tail');
    for(const mode of ['name','marks','picture']) { await promptMode(t,mode); expect(note(t).value).toBe('Second organism: forked tail'); }
    await click(recall(t).querySelector('[data-practice-recall-previous]')); expect(card(t).dataset.practiceRecallCard).toBe(ids[0]); expect(note(t).value).toBe('First organism: broad stripes');
    await click(recall(t).querySelector('[data-practice-recall-next]')); expect(note(t).value).toBe('Second organism: forked tail');
  });
  it('preserves a note through clues, mixed order, self-checks and targeted revisit without uncovering the answer', async () => {
    const t=await mount(),ids=await finish(t),records=learning(t); await click(recall(t).querySelector('summary')); await promptMode(t,'marks');
    await type(await openNote(t),'I notice the body shape'); await click(another(t)); expect(note(t).value).toBe('I notice the body shape'); expect(answer(t).textContent).toBe(''); expect(card(t).querySelector('img')).toBeNull();
    await reveal(t); await click(recall(t).querySelector('[data-practice-recall-rate="practice"]'));
    await click(recall(t).querySelector('[data-practice-recall-order-toggle]')); await click(recall(t).querySelector('[data-practice-recall-revisit]'));
    expect(card(t).dataset.practiceRecallCard).toBe(ids[0]); expect(note(t).value).toBe('I notice the body shape'); expect(answer(t).textContent).toBe('');
    await reveal(t); expect(noteReview(t).textContent).toContain('I notice the body shape'); expect(recall(t).querySelector('[data-practice-recall-rate="practice"]').getAttribute('aria-pressed')).toBe('true'); expect(learning(t)).toBe(records);
  });
  it('retains notes across profile and disclosure visits but clears them for a new retry round', async () => {
    const t=await mount(); await finish(t); await click(recall(t).querySelector('summary')); await type(await openNote(t),'A note from the first round');
    await reveal(t); await click(recall(t).querySelector('[data-practice-recall-study]')); await click(t.host.querySelector('[data-close-profile]'));
    expect(noteReview(t).textContent).toContain('A note from the first round'); await reveal(t);
    await click(t.host.querySelector('[data-practice-review-filter="missed"]')); await click(recall(t).querySelector('summary')); await click(recall(t).querySelector('summary')); expect(note(t).value).toBe('A note from the first round');
    await click(t.host.querySelector('[data-practice-second-look]')); await finish(t,['correct','correct']);
    await click(recall(t).querySelector('summary')); expect(note(t).value).toBe(''); await reveal(t); expect(noteReview(t)).toBeNull();
  });
  it('supports a single card and clearing a draft without requiring text or changing the completed result', async () => {
    const t=await mount(['clownfish']); await finish(t,['correct']); const records=learning(t); await click(recall(t).querySelector('summary'));
    await type(await openNote(t),'An orange body'); await type(note(t),''); await reveal(t); expect(noteReview(t)).toBeNull(); expect(answer(t).textContent).toContain(TX.clownfish.name);
    await reveal(t); await type(await openNote(t),'   '); await reveal(t); expect(noteReview(t)).toBeNull(); expect(learning(t)).toBe(records);
  });
});
