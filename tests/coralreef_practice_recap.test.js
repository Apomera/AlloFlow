import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, TX;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; TX = X.speciesText((k, v) => v);
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await Promise.resolve(); }); }
async function type(el, value) { expect(el).toBeTruthy(); el.focus(); await React.act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); }
const button = (t, label) => [...t.host.querySelectorAll('button')].find(el => el.textContent.trim() === label);
const recap = t => t.host.querySelector('[data-practice-recap]');
const recapIds = t => [...t.host.querySelectorAll('[data-practice-recap-organism]')].map(el => el.dataset.practiceRecapOrganism);
const learning = t => JSON.stringify({ notes: t.data.speciesFieldNotes, bookmarks: t.data.speciesBookmarks, log: t.data.speciesLog, practice: t.data.speciesPractice });
function target(t) {
  const img = t.host.querySelector('.cr-dxp-portrait img');
  if (img) return img.getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
  const clue = t.host.querySelector('[data-practice-mystery] h4').textContent;
  return X.SPECIES_META.find(m => X.marinePracticeClues(TX[m.id], m)[0] === clue).id;
}
async function mount(mode = 'picture') {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { clownfish: true, blue_tang: true, cleaner_shrimp: true }, speciesFieldNotes: { clownfish: 'Keep this saved note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
  function Shell() { const [state, setState] = React.useState(data); data = state; return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (k, v) => v || k }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(host.querySelector('[data-start-practice]'));
  const select = host.querySelector('[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  if (mode === 'marks') await click(host.querySelector('[data-practice-mode="marks"]'));
  await click(host.querySelector('[data-practice-start]')); return t;
}
async function answer(t, outcome = 'correct') {
  const id = target(t);
  if (outcome === 'skip') await click(t.host.querySelector('[data-practice-skip]'));
  else if (outcome === 'wrong') await click([...t.host.querySelectorAll('[data-practice-choice]')].find(el => el.dataset.practiceChoice !== id));
  else await click(t.host.querySelector(`[data-practice-choice="${id}"]`));
  return id;
}

describe('read-only recap during identification practice', () => {
  it('shows only earlier completed organisms and a learner reflection, without exposing the current answer or changing records', async () => {
    const t = await mount(), before = learning(t);
    expect(recap(t)).toBeNull();
    const first = await answer(t, 'wrong');
    await click(t.host.querySelector('[data-practice-written-reflection] summary'));
    const note = '<img src=x onerror=alert(1)> I will check the appendages.';
    await type(t.host.querySelector('[data-practice-reflection-input]'), note);
    expect(recap(t)).toBeNull();
    await click(t.host.querySelector('[data-practice-next]'));
    const current = target(t), details = recap(t);
    expect(details.open).toBe(false); expect(recapIds(t)).toEqual([first]);
    expect(recapIds(t)).not.toContain(current);
    expect(details.querySelector('summary').textContent).toBe('Earlier in this round (1)');
    await click(details.querySelector('summary')); expect(details.open).toBe(true);
    expect(document.activeElement).toBe(details.querySelector('summary'));
    expect(details.querySelector('[data-practice-recap-reflection]').textContent).toBe(note);
    expect(details.querySelector('[data-practice-recap-reflection] img')).toBeNull();
    expect(details.querySelector('[data-practice-choice]')).toBeNull();
    expect(details.textContent).toContain('Keep learning');
    expect(learning(t)).toBe(before);
  });

  it('returns from a previous profile with the current question, picture inspection and observation draft intact', async () => {
    const t = await mount(), first = await answer(t);
    await click(t.host.querySelector('[data-practice-detail="2"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    const current = target(t), choices = [...t.host.querySelectorAll('[data-practice-choice]')].map(el => el.dataset.practiceChoice);
    await click(button(t, 'Zoom in'));
    const view = JSON.stringify({ ...t.host.querySelector('[data-practice-picture-view]').dataset });
    await click(t.host.querySelector('[data-practice-observation] summary'));
    await type(t.host.querySelector('[data-practice-observation-input]'), 'My current observation stays here.');
    await click(recap(t).querySelector('summary'));
    expect(t.host.querySelector(`[data-practice-recap-detail="${first}"]`).textContent).toBe(TX[first].marks[2]);
    await click(t.host.querySelector(`[data-practice-recap-study="${first}"]`));
    expect(t.host.querySelector(`[data-marine-profile="${first}"]`)).toBeTruthy();
    await click(t.host.querySelector('[data-close-profile]'));
    expect(target(t)).toBe(current);
    expect([...t.host.querySelectorAll('[data-practice-choice]')].map(el => el.dataset.practiceChoice)).toEqual(choices);
    expect(recap(t).open).toBe(true);
    expect(JSON.stringify({ ...t.host.querySelector('[data-practice-picture-view]').dataset })).toBe(view);
    expect(t.host.querySelector('[data-practice-observation-input]').value).toBe('My current observation stays here.');
    expect(t.host.querySelector('[data-practice-feedback]')).toBeNull();
  });

  it('closes again on a new question and preserves prior outcomes, scores and unassisted answers', async () => {
    const t = await mount(), ids = [];
    ids.push(await answer(t, 'skip')); await click(t.host.querySelector('[data-practice-next]'));
    await click(recap(t).querySelector('summary'));
    expect(recap(t).textContent).toContain('Revealed for study');
    ids.push(await answer(t)); await click(t.host.querySelector('[data-practice-next]'));
    expect(recap(t).open).toBe(false); expect(recapIds(t)).toEqual(ids);
    const before = learning(t); await click(recap(t).querySelector('summary')); await click(recap(t).querySelector('summary'));
    expect(learning(t)).toBe(before);
    await answer(t); await click(t.host.querySelector('[data-practice-next]'));
    expect(recap(t)).toBeNull();
    expect(t.data.speciesPractice.last).toMatchObject({ total: 3, correct: 2, skipped: 1, hinted: 0 });
    expect(JSON.stringify(t.data.speciesPractice)).not.toMatch(/recap|Earlier/);
  });

  it('starts fresh in focused retries and written-clue sessions while preserving the complete original review', async () => {
    const t = await mount('marks');
    for (const outcome of ['wrong', 'skip', 'correct']) { await answer(t, outcome); await click(t.host.querySelector('[data-practice-next]')); }
    await click(t.host.querySelector('[data-practice-second-look]')); expect(recap(t)).toBeNull();
    const firstRetry = await answer(t); await click(t.host.querySelector('[data-practice-next]'));
    expect(recapIds(t)).toEqual([firstRetry]); expect(recap(t).open).toBe(false);
    expect(t.host.querySelector('[data-practice-mystery]')).toBeTruthy();
    expect(recap(t).querySelector(`[data-practice-recap-study="${target(t)}"]`)).toBeNull();
    await click(recap(t).querySelector('summary')); await answer(t); await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelectorAll('[data-practice-earlier-organism]')).toHaveLength(3);
    expect(t.data.speciesPractice).toMatchObject({ rounds: 2, correct: 3, answered: 4, last: { total: 2, correct: 2, hinted: 0 } });
    await click(button(t, 'Back to the field guide'));
    await click(t.host.querySelector('[data-start-practice]')); await click(t.host.querySelector('[data-practice-start]'));
    expect(recap(t)).toBeNull();
  });

  it('keeps a missing earlier portrait local and retains its name, reminder and profile control', async () => {
    const t = await mount(), first = await answer(t); await click(t.host.querySelector('[data-practice-next]'));
    const current = target(t), img = recap(t).querySelector('img');
    await click(recap(t).querySelector('summary'));
    await React.act(async () => img.dispatchEvent(new Event('error')));
    expect(recap(t).querySelector('img')).toBeNull();
    expect(recap(t).querySelector('[role="img"]').getAttribute('aria-label')).toContain(TX[first].name);
    expect(recap(t).querySelector('[data-practice-recap-detail]')).toBeTruthy();
    expect(recap(t).querySelector(`[data-practice-recap-study="${first}"]`)).toBeTruthy();
    expect(target(t)).toBe(current); expect(t.host.querySelector('.cr-dxp-portrait img')).toBeTruthy();
  });
});
