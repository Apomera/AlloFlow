import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let TX;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  TX = window.__RR_TEST_EXPORTS__.coralReef.speciesText((key, fallback) => fallback);
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(element) { expect(element, 'control exists').toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
async function mount() {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { clownfish: true }, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(host.querySelector('[data-start-practice]'));
  const select = host.querySelector('[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  await click(host.querySelector('[data-practice-start]')); return t;
}
const query = (t, selector) => t.host.querySelector(selector);
const controls = t => [...t.host.querySelectorAll('[data-practice-choice]')];
const toggle = t => query(t, '[data-practice-compare-toggle]');
const reminder = t => query(t, '[data-practice-contrast-reminder]');
const selectedPair = node => [...node.querySelectorAll('[data-practice-contrast-species]')].map(el => ({ id: el.dataset.practiceContrastSpecies, name: el.querySelector('dt').textContent, mark: el.querySelector('dd').textContent }));
async function wrong(t, excluded) { const button = controls(t).find(el => el.dataset.practiceChoice !== 'clownfish' && el.dataset.practiceChoice !== excluded); const id = button.dataset.practiceChoice; await click(button); return id; }
async function choosePair(t, guessIndex = 1, shownIndex = 2) { await click(toggle(t)); await click(query(t, '[data-practice-guess-detail="' + guessIndex + '"]')); await click(query(t, '[data-practice-detail="' + shownIndex + '"]')); }

describe('learner-selected recognition contrasts', () => {
  it.each(['correct', 'revealed'])('keeps unanswered and %s comparisons free of contrast controls', async result => {
    const t = await mount(); await click(toggle(t));
    const cards = [...t.host.querySelectorAll('[data-practice-candidate]')];
    expect(cards).toHaveLength(3);
    for (const card of cards) expect([...card.querySelectorAll('ul li')].map(li => li.textContent)).toEqual(TX[card.dataset.practiceCandidate].marks.slice(0, 2));
    expect(query(t, '[data-candidate-result]')).toBeNull();
    expect(query(t, '[data-practice-guess-detail]')).toBeNull(); expect(reminder(t)).toBeNull();
    await click(result === 'correct' ? query(t, '[data-practice-choice="clownfish"]') : query(t, '[data-practice-skip]'));
    expect(query(t, '[data-practice-guess-detail]')).toBeNull(); expect(reminder(t)).toBeNull();
    expect(t.host.querySelectorAll('[data-practice-detail]')).toHaveLength(3);
    expect(query(t, '[data-practice-reflection]')).toBeTruthy();
  });

  it('synchronizes the existing shown detail, builds only a complete pair, and restores reflection on close', async () => {
    const t = await mount(), guessed = await wrong(t);
    await click(query(t, '[data-practice-detail="1"]')); await click(toggle(t));
    expect(t.host.querySelectorAll('[data-practice-detail]')).toHaveLength(3);
    expect(query(t, '[data-practice-detail="1"]').getAttribute('aria-pressed')).toBe('true');
    expect(query(t, '.cr-dxp-detail')).toBeNull(); expect(reminder(t)).toBeNull();
    expect(query(t, '[data-practice-contrast-help]').textContent).toContain('ungraded');
    for (const card of t.host.querySelectorAll('[data-practice-candidate]')) {
      expect([...card.querySelectorAll('.cr-dxp-detail-options button')].map(button => button.textContent)).toEqual(TX[card.dataset.practiceCandidate].marks.slice(0, 3));
      expect(card.querySelector('fieldset').getAttribute('aria-label')).toContain(TX[card.dataset.practiceCandidate].name);
    }
    const guessDetail = query(t, '[data-practice-guess-detail="2"]'); await click(guessDetail);
    expect(document.activeElement).toBe(guessDetail);
    expect(selectedPair(reminder(t))).toEqual([{ id: guessed, name: TX[guessed].name, mark: TX[guessed].marks[2] }, { id: 'clownfish', name: TX.clownfish.name, mark: TX.clownfish.marks[1] }]);
    await click(guessDetail); expect(reminder(t)).toBeNull(); await click(guessDetail);
    await click(query(t, '[data-practice-comparison-close]'));
    expect(document.activeElement).toBe(toggle(t));
    expect(query(t, '.cr-dxp-detail [data-practice-detail="1"]').getAttribute('aria-pressed')).toBe('true');
    await click(query(t, '[data-practice-detail="0"]')); await click(toggle(t));
    expect(selectedPair(reminder(t))[1].mark).toBe(TX.clownfish.marks[0]);
    expect(query(t, '[data-practice-guess-detail="2"]').getAttribute('aria-pressed')).toBe('true');
    expect(t.data.speciesPractice).toBeUndefined();
  });

  it('keeps completed reminders read-only through profile visits without persisting selections or changing scores', async () => {
    const t = await mount(), guessed = await wrong(t); await choosePair(t);
    const selected = selectedPair(reminder(t));
    await click(query(t, '[data-practice-guess-study="' + guessed + '"]')); await click(query(t, '[data-close-profile]'));
    expect(selectedPair(reminder(t))).toEqual(selected);
    await click(query(t, '[data-practice-next]'));
    const disclosure = query(t, '[data-practice-review-guess]'); await click(disclosure.querySelector('summary'));
    expect(selectedPair(reminder(t))).toEqual(selected);
    expect(query(t, '[data-practice-detail]')).toBeNull(); expect(query(t, '[data-practice-guess-detail]')).toBeNull();
    expect(query(t, '[data-practice-contrast-help]')).toBeNull();
    await click(query(t, '[data-practice-guess-study="' + guessed + '"]')); await click(query(t, '[data-close-profile]'));
    expect(disclosure.open).toBe(true); expect(selectedPair(reminder(t))).toEqual(selected);
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 1, correct: 0, last: { total: 1, hinted: 0, skipped: 0, missedIds: ['clownfish'] } });
    expect(JSON.stringify(t.data)).not.toMatch(/guessDetailIndex|detailIndex|contrast/);
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' }); expect(t.data.speciesBookmarks).toEqual({ clownfish: true }); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
  });

  it('retains the original pair across different retry guesses without exposing it during an unanswered retry', async () => {
    const t = await mount(), firstGuess = await wrong(t); await choosePair(t, 2, 1); const firstPair = selectedPair(reminder(t));
    await click(query(t, '[data-practice-next]')); await click(query(t, '[data-practice-second-look]'));
    expect(reminder(t)).toBeNull(); expect(query(t, '[data-practice-guess-detail]')).toBeNull(); expect(query(t, '[data-candidate-result]')).toBeNull();
    const secondGuess = await wrong(t, firstGuess); await choosePair(t, 0, 2); const secondPair = selectedPair(reminder(t));
    expect(secondGuess).not.toBe(firstGuess); await click(query(t, '[data-practice-next]'));
    expect(selectedPair(query(t, '.cr-dxp-review [data-practice-contrast-reminder]'))).toEqual(secondPair);
    expect(selectedPair(query(t, '[data-practice-earlier-review] [data-practice-contrast-reminder]'))).toEqual(firstPair);
    await click(query(t, '[data-practice-second-look]')); expect(reminder(t)).toBeNull();
    await click(query(t, '[data-practice-choice="clownfish"]')); await click(query(t, '[data-practice-next]'));
    expect(t.host.querySelectorAll('[data-practice-contrast-reminder]')).toHaveLength(1);
    expect(selectedPair(reminder(t))).toEqual(firstPair);
  });

  it('does not manufacture a paired reminder from one optional selection', async () => {
    const t = await mount(); await wrong(t); await click(toggle(t)); await click(query(t, '[data-practice-guess-detail="1"]'));
    await click(query(t, '[data-practice-next]')); expect(reminder(t)).toBeNull();
    expect(query(t, '[data-practice-review-guess]')).toBeTruthy();
  });
});
