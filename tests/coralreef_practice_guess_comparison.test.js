import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, TX, profiles;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((key, fallback) => fallback); profiles = X.marineProfiles((key, fallback) => fallback);
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(element) { expect(element, 'control exists').toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
async function mount() {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { clownfish: true }, speciesFieldNotes: { clownfish: 'My original field note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
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
const choices = t => [...t.host.querySelectorAll('[data-practice-choice]')];
const comparison = t => t.host.querySelector('[data-practice-guess-comparison]');
const toggle = t => t.host.querySelector('[data-practice-compare-toggle]');
async function wrongAnswer(t) {
  const wrong = choices(t).find(button => button.dataset.practiceChoice !== 'clownfish');
  const id = wrong.dataset.practiceChoice; await click(wrong); return id;
}

describe('optional comparison of a locked guess with the organism shown', () => {
  it('keeps unanswered candidates equal, then shows only the actual guess and target after opting in', async () => {
    const t = await mount(), originalChoices = choices(t).map(button => button.dataset.practiceChoice);
    expect(toggle(t).textContent).toBe('Compare field marks');
    expect(comparison(t)).toBeNull();
    await click(toggle(t));
    expect([...t.host.querySelectorAll('[data-practice-candidate]')].map(card => card.dataset.practiceCandidate)).toEqual(originalChoices);
    expect(t.host.querySelector('[data-candidate-result]')).toBeNull();
    expect(t.host.querySelector('[data-practice-guess-observe]')).toBeNull();
    expect(comparison(t)).toBeNull();
    await click(t.host.querySelector('[data-practice-comparison-close]'));
    const guessed = await wrongAnswer(t);
    expect(toggle(t).textContent).toBe('Compare my guess');
    expect(toggle(t).getAttribute('aria-expanded')).toBe('false');
    expect(comparison(t), 'the focused comparison is optional').toBeNull();
    await click(toggle(t));
    expect(toggle(t).getAttribute('aria-expanded')).toBe('true');
    const panel = comparison(t), cards = [...panel.querySelectorAll('[data-practice-candidate]')];
    expect(cards.map(card => card.dataset.practiceCandidate)).toEqual([guessed, 'clownfish']);
    expect(cards.map(card => card.dataset.candidateResult)).toEqual(['chosen', 'shown']);
    for (const card of cards) {
      const id = card.dataset.practiceCandidate;
      expect([...card.querySelectorAll('.cr-dxp-detail-options button')].map(item => item.textContent)).toEqual(TX[id].marks.slice(0, 3));
      expect(card.querySelector('[data-practice-guess-observe] p').textContent).toBe(profiles[id].observe);
      expect(card.querySelector('img').getAttribute('src')).toContain('/' + id + '.webp');
      expect(card.querySelector('img').getAttribute('alt')).toContain(TX[id].name);
    }
    expect(panel.querySelector('[data-practice-guess-prompt]').textContent).toContain('notice something new');
    expect(panel.querySelector('canvas')).toBeNull();
    await click(panel.querySelector('[data-practice-comparison-close]'));
    expect(comparison(t)).toBeNull();
    expect(document.activeElement).toBe(toggle(t));
    expect(t.data.speciesPractice).toBeUndefined();
  });

  it('retains the chosen profile, first observation, confidence and review detail without an extra help penalty', async () => {
    const t = await mount(), input = t.host.querySelector('[data-practice-observation-input]');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'I noticed the bands and rounded fins.');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(t.host.querySelector('[data-confidence-choice="hunch"]'));
    const guessed = await wrongAnswer(t);
    await click(t.host.querySelector('[data-practice-detail="1"]'));
    const feedback = t.host.querySelector('[data-practice-feedback]').textContent;
    await click(toggle(t));
    await click(comparison(t).querySelector('[data-practice-guess-study="' + guessed + '"]'));
    expect(t.host.querySelector('[data-marine-profile="' + guessed + '"]')).toBeTruthy();
    await click(t.host.querySelector('[data-close-profile]'));
    expect(comparison(t)).toBeTruthy();
    expect(t.host.querySelector('[data-practice-observation-feedback]').textContent).toBe('I noticed the bands and rounded fins.');
    expect(t.host.querySelector('[data-practice-confidence-feedback]').dataset.practiceConfidenceFeedback).toBe('hunch');
    expect(t.host.querySelector('[data-practice-detail="1"]').getAttribute('aria-pressed')).toBe('true');
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    expect(t.host.querySelector('[data-practice-feedback]').textContent).toBe(feedback);
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 1, correct: 0, last: { hinted: 0, missedIds: ['clownfish'] } });
    expect(t.host.querySelector('[data-practice-review-detail]').textContent).toBe(TX.clownfish.marks[1]);
    await click(t.host.querySelector('[data-practice-second-look]'));
    expect(comparison(t)).toBeNull(); expect(t.host.querySelector('[data-practice-feedback]')).toBeNull();
    expect(toggle(t).textContent).toBe('Compare field marks');
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelector('[data-practice-earlier-observation]').textContent).toBe('I noticed the bands and rounded fins.');
    expect(t.host.querySelector('[data-practice-earlier-review]').textContent).toContain('Have a hunch');
    expect(t.data.speciesPractice).toMatchObject({ rounds: 2, answered: 2, correct: 1, last: { hinted: 0 } });
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'My original field note' });
    expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
    expect(JSON.stringify(t.data.speciesPractice)).not.toMatch(/observation|confidence|detailIndex|comparison/);
  });

  it.each(['correct', 'revealed'])('keeps the ordinary candidate workspace for a %s answer', async result => {
    const t = await mount();
    await click(t.host.querySelector(result === 'correct' ? '[data-practice-choice="clownfish"]' : '[data-practice-skip]'));
    expect(toggle(t).textContent).toBe('Compare field marks');
    await click(toggle(t));
    expect(comparison(t)).toBeNull();
    expect(t.host.querySelectorAll('[data-practice-candidate]')).toHaveLength(3);
    expect(t.host.querySelectorAll('[data-candidate-result="chosen"]')).toHaveLength(0);
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice.last.hinted).toBe(0);
    expect(t.data.speciesPractice.last.correct).toBe(result === 'correct' ? 1 : 0);
  });
});
