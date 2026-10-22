import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, TX;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((key, fallback) => fallback);
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(element) { expect(element, 'control exists').toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
async function mount(seed = {}) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { clownfish: true }, ...seed } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [state, setState] = React.useState(data); data = state;
    return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key });
  }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(host.querySelector('[data-start-practice]'));
  const select = host.querySelector('[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  await click(host.querySelector('[data-practice-start]'));
  return t;
}
const buttons = (t) => [...t.host.querySelectorAll('[data-practice-choice]')];
const target = (t) => t.host.querySelector('.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
const buttonText = (t, text) => [...t.host.querySelectorAll('button')].find(button => button.textContent.trim() === text);

describe('practice field-mark comparison and reflection', () => {
  it('offers optional comparison help with equal candidates and no correctness disclosure before an answer', async () => {
    const t = await mount(), id = target(t), choices = buttons(t).map(button => button.dataset.practiceChoice);
    expect(id).toBe('clownfish');
    expect(t.host.querySelector('[data-practice-comparison]')).toBeNull();
    expect(t.host.querySelector('[data-practice-assistance]').textContent).toContain('counts as field-mark help');
    await click(t.host.querySelector('[data-practice-compare-toggle]'));
    expect(t.host.querySelector('[data-practice-compare-toggle]').getAttribute('aria-expanded')).toBe('true');
    const candidates = [...t.host.querySelectorAll('[data-practice-candidate]')];
    expect(candidates.map(card => card.dataset.practiceCandidate)).toEqual(choices);
    expect(t.host.querySelector('[data-candidate-result]')).toBeNull();
    for (const card of candidates) {
      const marks = [...card.querySelectorAll('li')].map(item => item.textContent);
      expect(marks).toEqual(TX[card.dataset.practiceCandidate].marks.slice(0, 2));
      expect(card.querySelector('figcaption').textContent).toBe('Illustrative model');
    }
    expect(t.host.querySelector('[data-practice-comparison]').textContent).toContain('even when a picture is unavailable');
    expect(t.host.querySelector('canvas')).toBeNull();
    await click(t.host.querySelector('[data-practice-comparison-close]'));
    expect(t.host.querySelector('[data-practice-comparison]')).toBeNull();
    expect(document.activeElement).toBe(t.host.querySelector('[data-practice-compare-toggle]'));
    expect(target(t)).toBe(id);
    expect(buttons(t).map(button => button.dataset.practiceChoice)).toEqual(choices);
    expect(t.host.querySelector('[data-practice-feedback]')).toBeNull();
    expect(t.data.speciesPractice).toBeUndefined();
  });

  it('preserves the locked answer, open comparison and memorable detail through a profile visit', async () => {
    const speciesLog = { green_turtle: { firstSeen: 10, site: 'healthy' } }, fieldNotes = { clownfish: 'My own note' };
    const t = await mount({ speciesLog, speciesFieldNotes: fieldNotes }), id = target(t);
    await click(t.host.querySelector('[data-practice-compare-toggle]'));
    const wrong = buttons(t).find(button => button.dataset.practiceChoice !== id);
    await click(wrong);
    const feedback = t.host.querySelector('[data-practice-feedback]').textContent;
    expect(t.host.querySelector('[data-practice-candidate="' + id + '"]').dataset.candidateResult).toBe('shown');
    expect(t.host.querySelector('[data-practice-candidate="' + wrong.dataset.practiceChoice + '"]').dataset.candidateResult).toBe('chosen');
    await click(t.host.querySelector('[data-practice-choice="' + id + '"]'));
    expect(t.host.querySelector('[data-practice-feedback]').textContent).toBe(feedback);
    const detail = t.host.querySelector('[data-practice-detail="1"]');
    await click(detail);
    expect(detail.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(detail);
    expect(t.host.querySelector('[data-practice-contrast-help]').textContent).toContain('stay only in this practice session');
    await click(buttonText(t, 'Study profile'));
    expect(t.host.querySelector('[data-marine-profile="' + id + '"]')).toBeTruthy();
    await click(t.host.querySelector('[data-close-profile]'));
    expect(target(t)).toBe(id);
    expect(t.host.querySelector('[data-practice-comparison]')).toBeTruthy();
    expect(t.host.querySelector('[data-practice-feedback]').textContent).toBe(feedback);
    expect(t.host.querySelector('[data-practice-detail="1"]').getAttribute('aria-pressed')).toBe('true');
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice.last).toMatchObject({ total: 1, correct: 0, hinted: 1, missedIds: [id] });
    expect(t.host.querySelector('[data-practice-review-detail="' + id + '"]').textContent).toBe(TX[id].marks[1]);
    expect(t.data.speciesLog).toEqual(speciesLog);
    expect(t.data.speciesFieldNotes).toEqual(fieldNotes);
    expect(JSON.stringify(t.data.speciesPractice)).not.toContain('detailIndex');
  });

  it('keeps reflection optional, preserves focus after reveal, and does not count post-answer comparison as help', async () => {
    const t = await mount();
    await click(t.host.querySelector('[data-practice-skip]'));
    const detail = t.host.querySelector('[data-practice-detail="2"]');
    await click(detail);
    expect(detail.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(detail);
    await click(detail);
    expect(detail.getAttribute('aria-pressed')).toBe('false');
    await click(t.host.querySelector('[data-practice-compare-toggle]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 0, correct: 0, last: { skipped: 1, hinted: 0 } });
    expect(t.host.querySelector('[data-practice-review-detail]')).toBeNull();
    expect(t.data.speciesLog).toBeUndefined();
  });

  it('starts the next round without stale comparison or reflection while retaining normal collection progress', async () => {
    const t = await mount();
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    await click(t.host.querySelector('[data-practice-detail="1"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelector('[data-practice-review-detail="clownfish"]')).toBeTruthy();
    await click(buttonText(t, 'Choose another group'));
    await click(t.host.querySelector('[data-practice-start]'));
    expect(target(t)).toBe('clownfish');
    expect(t.host.querySelector('[data-practice-comparison]')).toBeNull();
    expect(t.host.querySelector('[data-practice-reflection]')).toBeNull();
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    expect([...t.host.querySelectorAll('[data-practice-detail]')].every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice).toMatchObject({ rounds: 2, answered: 2, correct: 2, last: { total: 1, correct: 1, hinted: 0 } });
  });
});
