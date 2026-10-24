import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let TX;
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef'); TX = window.__RR_TEST_EXPORTS__.coralReef.speciesText((key, fallback) => fallback); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(element) { expect(element, 'control exists').toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
const target = t => t.host.querySelector('.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
const reviews = t => [...t.host.querySelectorAll('[data-practice-review-guess]')];
async function mount(bookmarks = { clownfish: true }) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: bookmarks, speciesFieldNotes: { clownfish: 'Keep this profile note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
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
async function finish(t, result, excludedGuess) {
  const id = target(t);
  const choices = [...t.host.querySelectorAll('[data-practice-choice]')];
  const choice = result === 'wrong' ? choices.find(b => b.dataset.practiceChoice !== id && b.dataset.practiceChoice !== excludedGuess) : choices.find(b => b.dataset.practiceChoice === id);
  const guessed = choice.dataset.practiceChoice;
  await click(result === 'revealed' ? t.host.querySelector('[data-practice-skip]') : choice);
  await click(t.host.querySelector('[data-practice-next]'));
  return { id, guessed };
}
function pair(disclosure) { return [...disclosure.querySelectorAll('[data-practice-candidate]')].map(card => card.dataset.practiceCandidate); }

describe('completed practice keeps a useful original-guess comparison', () => {
  it('offers only a collapsed review after completion, and preserves it through profile navigation', async () => {
    const t = await mount();
    expect(reviews(t)).toHaveLength(0);
    await click(t.host.querySelector('[data-confidence-choice="hunch"]'));
    const wrong = [...t.host.querySelectorAll('[data-practice-choice]')].find(b => b.dataset.practiceChoice !== 'clownfish');
    const guessed = wrong.dataset.practiceChoice;
    await click(wrong);
    expect(reviews(t)).toHaveLength(0);
    await click(t.host.querySelector('[data-practice-detail="1"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    const saved = JSON.stringify(t.data);
    const disclosure = reviews(t)[0], summary = disclosure.querySelector('summary');
    expect(disclosure.open).toBe(false);
    expect(summary.textContent).toBe('Compare my original guess: ' + TX[guessed].name);
    expect(pair(disclosure)).toEqual([guessed, 'clownfish']);
    expect([...disclosure.querySelectorAll('[data-candidate-result]')].map(e => e.dataset.candidateResult)).toEqual(['chosen', 'shown']);
    await click(summary); expect(disclosure.open).toBe(true);
    await click(disclosure.querySelector('[data-practice-guess-study="' + guessed + '"]'));
    expect(t.host.querySelector('[data-marine-profile="' + guessed + '"]')).toBeTruthy();
    await click(t.host.querySelector('[data-close-profile]'));
    expect(reviews(t)[0].open).toBe(true); expect(pair(reviews(t)[0])).toEqual([guessed, 'clownfish']);
    expect(t.host.querySelector('[data-practice-review-detail]').textContent).toBe(TX.clownfish.marks[1]);
    expect(t.host.querySelector('[data-practice-confidence-review]').textContent).toContain('Have a hunch');
    await click(disclosure.querySelector('[data-practice-comparison-close]'));
    expect(disclosure.open).toBe(false); expect(document.activeElement).toBe(summary);
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 1, correct: 0, last: { hinted: 0, missedIds: ['clownfish'] } });
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this profile note' });
    expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
    expect(t.data.speciesBookmarks).toEqual({ clownfish: true });
    expect(JSON.stringify(t.data.speciesPractice)).not.toMatch(/choice|comparison|observation|confidence|detailIndex/);
    expect(JSON.parse(saved).speciesPractice).toEqual(t.data.speciesPractice);
  });

  it('does not invent a wrong guess for recognized or revealed organisms', async () => {
    const t = await mount({ clownfish: true, blue_tang: true, brain_coral: true });
    const correct = await finish(t, 'correct'), revealed = await finish(t, 'revealed'), wrong = await finish(t, 'wrong');
    expect(reviews(t)).toHaveLength(1);
    expect(reviews(t)[0].dataset.practiceReviewGuess).toBe(wrong.id);
    expect(pair(reviews(t)[0])).toEqual([wrong.guessed, wrong.id]);
    expect(reviews(t).some(e => [correct.id, revealed.id].includes(e.dataset.practiceReviewGuess))).toBe(false);
    expect(t.data.speciesPractice.last).toMatchObject({ correct: 1, skipped: 1, hinted: 0 });
  });

  it('keeps the first guess distinct from later attempts without exposing it during the retry', async () => {
    const t = await mount(), first = await finish(t, 'wrong');
    await click(t.host.querySelector('[data-practice-second-look]'));
    expect(reviews(t)).toHaveLength(0);
    expect(t.host.querySelector('[data-candidate-result]')).toBeNull();
    const second = await finish(t, 'wrong', first.guessed);
    const current = t.host.querySelector('.cr-dxp-review [data-practice-review-guess]');
    const earlier = t.host.querySelector('[data-practice-earlier-review] [data-practice-review-guess]');
    expect(pair(current)).toEqual([second.guessed, 'clownfish']);
    expect(pair(earlier)).toEqual([first.guessed, 'clownfish']);
    expect(current.querySelector('[data-practice-comparison]').id).not.toBe(earlier.querySelector('[data-practice-comparison]').id);
    await click(t.host.querySelector('[data-practice-earlier-review]>summary'));
    await click(earlier.querySelector('summary'));
    await click(earlier.querySelector('[data-practice-guess-study="' + first.guessed + '"]'));
    await click(t.host.querySelector('[data-close-profile]'));
    expect(t.host.querySelector('[data-practice-earlier-review]').open).toBe(true); expect(earlier.open).toBe(true);
    await click(t.host.querySelector('[data-practice-second-look]'));
    expect(reviews(t)).toHaveLength(0);
    await finish(t, 'correct');
    expect(reviews(t)).toHaveLength(1);
    expect(pair(reviews(t)[0])).toEqual([first.guessed, 'clownfish']);
    expect(t.host.querySelector('[data-practice-new-recognition]')).toBeTruthy();
    expect(t.data.speciesPractice).toMatchObject({ rounds: 3, correct: 1, answered: 3, last: { hinted: 0 } });
  });
});
