import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X;
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
const q = (t, s) => t.host.querySelector(s);
const named = (t, name) => [...t.host.querySelectorAll('button')].find(b => b.textContent === name);
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); }
async function select(el, value) { expect(el).toBeTruthy(); await React.act(async () => { el.value = String(value); el.dispatchEvent(new Event('change', { bubbles: true })); }); }
const target = t => q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
const reviewIds = t => [...t.host.querySelectorAll('[data-practice-review-organism]')].map(el => el.dataset.practiceReviewOrganism);
const learning = t => JSON.stringify({ practice:t.data.speciesPractice, notes:t.data.speciesFieldNotes, bookmarks:t.data.speciesBookmarks, log:t.data.speciesLog });
async function mount(extra = {}, length = 5) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { clownfish: true, green_turtle: true, brain_coral: true }, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } }, ...extra } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (k, v) => v || k }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(q(t, '[data-start-practice]')); await select(q(t, '[data-practice-collection-select]'), 'saved'); await select(q(t, '[data-practice-length]'), length); await click(q(t, '[data-practice-start]')); return t;
}
async function answer(t, outcome) {
  const id = target(t);
  if (outcome === 'skip') await click(q(t, '[data-practice-skip]'));
  else { const button = outcome === 'correct' ? q(t, '[data-practice-choice="' + id + '"]') : [...t.host.querySelectorAll('[data-practice-choice]')].find(b => b.dataset.practiceChoice !== id); await click(button); }
  await click(q(t, '[data-practice-next], [data-practice-finish]')); return id;
}

describe('completed identification round review filters', () => {
  it('focuses on wrong and revealed organisms without changing scores, notes or the complete review', async () => {
    const t = await mount(); const correct = await answer(t, 'correct'), wrong = await answer(t, 'wrong'), skipped = await answer(t, 'skip');
    expect(reviewIds(t)).toEqual([correct, wrong, skipped]);
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 2, correct: 1, last: { total: 3, correct: 1, skipped: 1, missedIds: [wrong, skipped] } });
    const before = learning(t), filter = q(t, '[data-practice-review-filter="missed"]');
    await click(filter); expect(document.activeElement).toBe(filter); expect(filter.getAttribute('aria-pressed')).toBe('true');
    expect(reviewIds(t)).toEqual([wrong, skipped]); expect(q(t, '[data-practice-review-count]').textContent).toBe('Showing 2 of 3 organisms from this round.');
    expect(q(t, '.cr-dxp-score').textContent).toContain('1 of 3'); expect(learning(t)).toBe(before);
    await click(q(t, '[data-practice-review-organism="' + wrong + '"] button')); expect(q(t, '[data-marine-profile]')).toBeTruthy();
    await click(q(t, '[data-close-profile]')); expect(reviewIds(t)).toEqual([wrong, skipped]); expect(q(t, '[data-practice-review-filter="missed"]').getAttribute('aria-pressed')).toBe('true');
    await click(q(t, '[data-practice-review-filter="all"]')); expect(reviewIds(t)).toEqual([correct, wrong, skipped]); expect(learning(t)).toBe(before);
    expect(JSON.stringify(t.data)).not.toContain('reviewFilter');
  });

  it('retries the missed set while retaining the entire original collection and resetting the filter', async () => {
    const t = await mount(); const original = [await answer(t, 'correct'), await answer(t, 'wrong'), await answer(t, 'skip')];
    await click(q(t, '[data-practice-review-filter="missed"]')); await click(q(t, '[data-practice-second-look]'));
    const retry = [await answer(t, 'correct'), await answer(t, 'correct')]; expect(retry.sort()).toEqual(original.slice(1).sort());
    expect(reviewIds(t).sort()).toEqual(retry.sort()); expect(q(t, '[data-practice-review-filter]')).toBeNull();
    const tx = X.speciesText((k, v) => v), earlier = q(t, '[data-practice-earlier-review]');
    for (const id of original) expect(earlier.textContent).toContain(tx[id].name);
    expect(t.data.speciesPractice).toMatchObject({ rounds: 2, answered: 4, correct: 3, last: { total: 2, correct: 2, missedIds: [] } });
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' }); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
  });

  it('starts each new collection with all organisms and avoids offering an empty filter on a perfect round', async () => {
    const t = await mount(); await answer(t, 'wrong'); await answer(t, 'correct'); await answer(t, 'correct');
    await click(q(t, '[data-practice-review-filter="missed"]')); expect(reviewIds(t)).toHaveLength(1);
    await click(named(t, 'Choose another group')); await click(q(t, '[data-practice-start]'));
    await answer(t, 'correct'); await answer(t, 'wrong'); await answer(t, 'correct');
    expect(reviewIds(t)).toHaveLength(3); expect(q(t, '[data-practice-review-filter="all"]').getAttribute('aria-pressed')).toBe('true');
    await click(named(t, 'Choose another group')); await click(q(t, '[data-practice-start]'));
    await answer(t, 'correct'); await answer(t, 'correct'); await answer(t, 'correct');
    expect(q(t, '[data-practice-review-filter]')).toBeNull(); expect(q(t, '[data-practice-review-count]')).toBeNull(); expect(reviewIds(t)).toHaveLength(3);
  });

  it('keeps all ten outcomes in an extended round while filtering only its five misses', async () => {
    const living = X.SPECIES_META.filter(m => m.group !== 'structure').slice(0, 10).map(m => m.id), bookmarks = Object.fromEntries(living.map(id => [id, true]));
    const t = await mount({ speciesBookmarks: bookmarks }, 10), all = [], missed = [];
    for (let i = 0; i < 10; i++) { const id = await answer(t, i % 2 ? 'wrong' : 'correct'); all.push(id); if (i % 2) missed.push(id); }
    const before = JSON.stringify(t.data);
    await click(q(t, '[data-practice-review-filter="missed"]')); expect(reviewIds(t)).toEqual(missed); expect(q(t, '[data-practice-review-count]').textContent).toBe('Showing 5 of 10 organisms from this round.');
    await click(q(t, '[data-practice-review-filter="all"]')); expect(reviewIds(t)).toEqual(all);
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 10, correct: 5, last: { total: 10, correct: 5, missedIds: missed } }); expect(JSON.stringify(t.data)).toBe(before);
  });
});
