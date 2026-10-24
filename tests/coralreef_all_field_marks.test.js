import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let TX;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef');
  TX = window.__RR_TEST_EXPORTS__.coralReef.speciesText((key, fallback) => fallback);
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
const q = (t, selector) => t.host.querySelector(selector);
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await Promise.resolve(); }); }
async function mount() {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { copperband_butterflyfish: true }, speciesLog: { green_turtle: { firstSeen: 1 } }, speciesFieldNotes: { copperband_butterflyfish: 'Keep this note' } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(q(t, '[data-start-practice]'));
  const select = q(t, '[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  await click(q(t, '[data-practice-start]')); return t;
}
const review = t => q(t, '[data-practice-review-detail="copperband_butterflyfish"]');

describe('complete sourced field-mark reflection', () => {
  it('keeps unanswered candidates limited to two equal clues, then lets a learner remember the fourth mark', async () => {
    const t = await mount(); await click(q(t, '[data-practice-compare-toggle]'));
    for (const card of t.host.querySelectorAll('[data-practice-candidate]')) {
      expect([...card.querySelectorAll('ul li')].map(el => el.textContent)).toEqual(TX[card.dataset.practiceCandidate].marks.slice(0, 2));
    }
    expect(q(t, '[data-practice-detail]')).toBeNull();
    await click(q(t, '[data-practice-comparison-close]')); await click(q(t, '[data-practice-choice="copperband_butterflyfish"]'));
    const buttons = [...t.host.querySelectorAll('[data-practice-detail]')];
    expect(buttons.map(el => el.textContent)).toEqual(TX.copperband_butterflyfish.marks);
    await click(q(t, '[data-practice-detail="3"]'));
    expect(q(t, '[data-practice-detail="3"]').getAttribute('aria-pressed')).toBe('true');
    await click(q(t, '[data-practice-next]'));
    expect(review(t).textContent).toBe(TX.copperband_butterflyfish.marks[3]);
    expect(t.data.speciesPractice.last).toMatchObject({ correct: 1, hinted: 1, total: 1 });
    expect(JSON.stringify(t.data)).not.toMatch(/detailIndex|guessDetailIndex/);
  });

  it('retains fourth-mark choices on both sides of a wrong-guess comparison and through a profile visit', async () => {
    const t = await mount(); await click(q(t, '[data-practice-choice="threadfin_butterflyfish"]'));
    await click(q(t, '[data-practice-compare-toggle]'));
    await click(q(t, '[data-practice-guess-detail="3"]')); await click(q(t, '[data-practice-detail="3"]'));
    const reminder = q(t, '[data-practice-contrast-reminder]').textContent;
    expect(reminder).toContain(TX.copperband_butterflyfish.marks[3]);
    expect(reminder).toContain(TX.threadfin_butterflyfish.marks[3]);
    await click(q(t, '[data-practice-guess-study="threadfin_butterflyfish"]'));
    await click(q(t, '[data-close-profile]'));
    expect(q(t, '[data-practice-contrast-reminder]').textContent).toBe(reminder);
    await click(q(t, '[data-practice-next]'));
    expect(review(t).textContent).toBe(TX.copperband_butterflyfish.marks[3]);
    await click(q(t, '[data-practice-review-guess]>summary'));
    expect(q(t, '[data-practice-review-guess] [data-practice-contrast-reminder]').textContent).toBe(reminder);
    expect(q(t, '[data-practice-review-guess] [data-practice-detail]')).toBeNull();
    expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
    expect(t.data.speciesFieldNotes.copperband_butterflyfish).toBe('Keep this note');
  });

  it('lets the fourth mark be cleared and preserves it in the original collection during a focused retry', async () => {
    const t = await mount(); await click(q(t, '[data-practice-skip]'));
    const button = q(t, '[data-practice-detail="3"]'); await click(button); await click(button);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await click(button); await click(q(t, '[data-practice-next]'));
    await click(q(t, '[data-practice-second-look]'));
    expect(q(t, '[data-practice-detail]')).toBeNull();
    await click(q(t, '[data-practice-choice="copperband_butterflyfish"]')); await click(q(t, '[data-practice-next]'));
    const earlier = q(t, '[data-practice-earlier-review]');
    expect(earlier.textContent).toContain(TX.copperband_butterflyfish.marks[3]);
    expect(t.data.speciesPractice).toMatchObject({ rounds: 2, correct: 1, answered: 1 });
    expect(JSON.stringify(t.data)).not.toMatch(/detailIndex|guessDetailIndex/);
  });
});
