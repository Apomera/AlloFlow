import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(element) { expect(element).toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
async function mount(bookmarks = { clownfish: true }) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: bookmarks, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } }, update;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [value, setValue] = React.useState(data); data = value; update = setValue; return cfg.render({ React, toolData: value, setToolData: setValue, t: (key, fallback) => fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; }, async patch(patch) { await React.act(async () => update(before => ({ ...before, coralReef: { ...before.coralReef, ...patch } }))); } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(host.querySelector('[data-start-practice]'));
  const select = host.querySelector('[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  await click(host.querySelector('[data-practice-start]')); return t;
}
const choice = (t, value) => t.host.querySelector('[data-confidence-choice="' + value + '"]');
const target = t => t.host.querySelector('.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');

describe('optional confidence reflection', () => {
  it('starts unset, toggles off, and leaves an ordinary answer entirely unchanged', async () => {
    const t = await mount();
    expect(t.host.querySelector('[data-practice-observation]').open).toBe(false);
    expect(t.host.querySelectorAll('[data-confidence-choice][aria-pressed="true"]')).toHaveLength(0);
    await click(choice(t, 'hunch')); expect(choice(t, 'hunch').getAttribute('aria-pressed')).toBe('true');
    await click(choice(t, 'hunch')); expect(choice(t, 'hunch').getAttribute('aria-pressed')).toBe('false');
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    expect(t.host.querySelector('[data-practice-confidence-feedback]')).toBeNull();
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelector('[data-practice-confidence-review]')).toBeNull();
    expect(t.data.speciesPractice).toMatchObject({ correct: 1, answered: 1, last: { hinted: 0 } });
  });
  it('keeps a confidence choice through profile visits and reflects on it without grading or persisting it', async () => {
    const t = await mount(); await click(choice(t, 'sure'));
    await t.patch({ guideSpeciesId: 'blue_tang' }); await click(t.host.querySelector('[data-close-profile]'));
    expect(choice(t, 'sure').getAttribute('aria-pressed')).toBe('true');
    const wrong = [...t.host.querySelectorAll('[data-practice-choice]')].find(b => b.dataset.practiceChoice !== 'clownfish');
    await click(wrong);
    expect(t.host.querySelector('[data-practice-confidence-feedback]').textContent).toContain('Check the distinguishing field marks');
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelector('[data-practice-confidence-review]').textContent).toContain('Feel sure');
    expect(t.data.speciesPractice).toMatchObject({ answered: 1, correct: 0, last: { hinted: 0 } });
    expect(JSON.stringify(t.data.speciesPractice)).not.toContain('confidence');
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' });
    expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
  });
  it('clears confidence on the next organism and keeps only chosen check-ins in round review', async () => {
    const t = await mount({ clownfish: true, blue_tang: true }), first = target(t);
    await click(choice(t, 'exploring')); await click(t.host.querySelector('[data-practice-skip]')); await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelectorAll('[data-confidence-choice][aria-pressed="true"]')).toHaveLength(0);
    await click(t.host.querySelector('[data-practice-choice="' + target(t) + '"]')); await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelectorAll('[data-practice-confidence-review]')).toHaveLength(1);
    expect(t.host.querySelector('[data-practice-confidence-review]').dataset.practiceConfidenceReview).toBe(first);
    const restart = [...t.host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Practice these again'); await click(restart);
    expect(t.host.querySelectorAll('[data-confidence-choice][aria-pressed="true"]')).toHaveLength(0);
  });
});
