import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let scroll, oldScroll, TX;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  TX = window.__RR_TEST_EXPORTS__.coralReef.speciesText((key, fallback) => fallback);
  scroll = vi.fn(); oldScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener() {}, removeListener() {} })));
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  if (oldScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', oldScroll); else delete Element.prototype.scrollIntoView;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await Promise.resolve(); }); }
const q = (t, selector) => t.host.querySelector(selector);
const choose = (t, id) => q(t, '[data-practice-candidate-choose="' + id + '"]');
async function mount(reduceMotion = false, mode = 'picture') {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { clownfish: true }, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, reduceMotion }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(q(t, '[data-start-practice]'));
  const select = q(t, '[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  if (mode === 'marks') await click(q(t, '[data-practice-mode="marks"]'));
  await click(q(t, '[data-practice-start]')); scroll.mockClear(); return t;
}

describe('choosing from candidate evidence', () => {
  it('keeps all unanswered alternatives equal and preserves candidate order and marks', async () => {
    const t = await mount(); await click(q(t, '[data-practice-compare-toggle]'));
    const ids = [...t.host.querySelectorAll('[data-practice-choice]')].map(el => el.dataset.practiceChoice);
    const cards = [...t.host.querySelectorAll('[data-practice-candidate]')];
    expect(cards.map(el => el.dataset.practiceCandidate)).toEqual(ids);
    expect(t.host.querySelectorAll('[data-practice-candidate-choose]')).toHaveLength(3);
    for (const card of cards) {
      const id = card.dataset.practiceCandidate, button = choose(t, id);
      expect(button.textContent).toBe('Choose ' + TX[id].name);
      expect(button.getAttribute('aria-pressed')).toBeNull(); expect(button.getAttribute('aria-disabled')).toBeNull();
      expect([...card.querySelectorAll('ul li')].map(el => el.textContent)).toEqual(TX[id].marks.slice(0, 2));
    }
    expect(q(t, '[data-candidate-result]')).toBeNull(); expect(q(t, '[data-practice-guess-study]')).toBeNull();
    expect(q(t, '[data-practice-feedback]')).toBeNull(); expect(scroll).not.toHaveBeenCalled();
    expect(t.data.speciesPractice).toBeUndefined();
  });

  it.each([[false, false, 'smooth'], [true, false, 'auto'], [false, true, 'auto']])('reveals existing feedback only after direct choice with host reduce=%s system reduce=%s', async (hostReduce, systemReduce, behavior) => {
    const t = await mount(hostReduce, systemReduce ? 'marks' : 'picture'); window.matchMedia.mockReturnValue({ matches: systemReduce });
    await click(q(t, '[data-practice-compare-toggle]')); await click(choose(t, 'clownfish'));
    const feedback = q(t, '[data-practice-feedback]');
    expect(feedback.textContent).toContain('Yes, ' + TX.clownfish.name);
    expect(document.activeElement).toBe(feedback);
    expect(scroll.mock.contexts).toEqual([feedback]); expect(scroll).toHaveBeenLastCalledWith({ block: 'start', behavior });
    expect(q(t, '[data-practice-candidate-choose]')).toBeNull(); expect(q(t, '[data-practice-guess-comparison]')).toBeNull();
    expect(q(t, '[data-practice-mystery]')).toBeNull();
    await click(q(t, '[data-practice-next]'));
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 1, correct: 1, last: { total: 1, correct: 1, hinted: 1, skipped: 0 } });
    expect(q(t, '[data-practice-candidate-choose]')).toBeNull();
  });

  it('locks the first decision, keeps contrast learning and profile return, and starts retries without old choice focus', async () => {
    const t = await mount(); await click(q(t, '[data-practice-compare-toggle]'));
    const wrong = [...t.host.querySelectorAll('[data-practice-candidate-choose]')].find(el => el.dataset.practiceCandidateChoose !== 'clownfish'), wrongId = wrong.dataset.practiceCandidateChoose;
    const correct = choose(t, 'clownfish');
    await React.act(async () => { wrong.click(); correct.click(); wrong.click(); });
    const feedback = q(t, '[data-practice-feedback]');
    expect(feedback.textContent).toContain('A useful comparison: this is ' + TX.clownfish.name);
    expect(q(t, '[data-candidate-result="chosen"]').dataset.practiceCandidate).toBe(wrongId);
    expect(scroll.mock.contexts).toEqual([feedback]); expect(q(t, '[data-practice-candidate-choose]')).toBeNull();
    await click(q(t, '[data-practice-guess-detail="1"]')); await click(q(t, '[data-practice-detail="2"]'));
    const pair = q(t, '[data-practice-contrast-reminder]').textContent;
    await click(q(t, '[data-practice-guess-study="' + wrongId + '"]'));
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); }); scroll.mockClear();
    await click(q(t, '[data-close-profile]'));
    expect(q(t, '[data-practice-contrast-reminder]').textContent).toBe(pair); expect(scroll).not.toHaveBeenCalled();
    await click(q(t, '[data-practice-next]')); await click(q(t, '[data-practice-review-guess]>summary'));
    expect(q(t, '[data-practice-candidate-choose]')).toBeNull();
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 1, correct: 0, last: { hinted: 1, missedIds: ['clownfish'] } });
    await click(q(t, '[data-practice-second-look]')); scroll.mockClear(); await click(q(t, '[data-practice-compare-toggle]'));
    expect(choose(t, wrongId)).toBeTruthy(); expect(q(t, '[data-candidate-result]')).toBeNull(); expect(q(t, '[data-practice-contrast-reminder]')).toBeNull();
    await click(choose(t, 'clownfish')); expect(document.activeElement).toBe(q(t, '[data-practice-feedback]'));
    expect(scroll.mock.contexts).toEqual([q(t, '[data-practice-feedback]')]); await click(q(t, '[data-practice-next]'));
    expect(q(t, '[data-practice-earlier-review] [data-practice-contrast-reminder]').textContent).toBe(pair);
    expect(t.data.speciesPractice).toMatchObject({ rounds: 2, answered: 2, correct: 1, last: { hinted: 1 } });
    expect(t.data.speciesBookmarks).toEqual({ clownfish: true }); expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' }); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
    expect(JSON.stringify(t.data)).not.toMatch(/detailIndex|guessDetailIndex|pendingChoice|comparison/);
  });

  it('does not change ordinary answer-button or reveal focus behavior', async () => {
    const t = await mount(); await click(q(t, '[data-practice-compare-toggle]'));
    const main = q(t, '[data-practice-choice="clownfish"]'); await click(main);
    expect(document.activeElement).toBe(main); expect(scroll).not.toHaveBeenCalled(); expect(q(t, '[data-practice-candidate-choose]')).toBeNull();
    await click(q(t, '[data-practice-next]')); await click([...t.host.querySelectorAll('button')].find(el => el.textContent === 'Meet another collection'));
    scroll.mockClear(); await click(q(t, '[data-practice-compare-toggle]')); await click(q(t, '[data-practice-skip]'));
    expect(document.activeElement).toBe(q(t, '[data-practice-feedback]')); expect(scroll).not.toHaveBeenCalled(); expect(q(t, '[data-practice-candidate-choose]')).toBeNull();
  });
});
