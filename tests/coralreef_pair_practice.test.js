import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
const q = (t, s) => t.host.querySelector(s);
const named = (t, s) => [...t.host.querySelectorAll('button')].find(b => b.textContent === s);
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); }
async function change(el, value) { expect(el).toBeTruthy(); await React.act(async () => { el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }); }
const choices = t => [...t.host.querySelectorAll('[data-practice-choice]')].map(b => b.dataset.practiceChoice);
const target = t => q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
async function mount(extra = {}) {
  let data = { coralReef: { section: 'guide', guideSpeciesId: 'green_turtle', speciesLog: { clownfish: { firstSeen: 1 } }, speciesBookmarks: { green_turtle: true }, speciesFieldNotes: { green_turtle: 'Keep this observation' }, ...extra } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (k, v) => v || k }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}
async function openPair(t) { await click(q(t, '[data-start-comparison]')); await click(q(t, '[data-practice-comparison-pair]')); }
async function next(t, correct = true) {
  const id = target(t), choice = correct ? id : choices(t).find(c => c !== id);
  await click(q(t, '[data-practice-choice="' + choice + '"]')); await click(q(t, '[data-practice-next], [data-practice-finish]')); return { id, choice };
}

describe('practice directly from a comparison pair', () => {
  it('asks about both compared organisms with only their two names and keeps ordinary records separate', async () => {
    const t = await mount(); await openPair(t);
    expect(q(t, '[data-practice-collection-select]').value).toBe('pair'); expect(q(t, '[data-practice-length]')).toBeNull();
    const preview = q(t, '[data-practice-pair-preview]');
    expect(preview.querySelector('h4').textContent).toBe('Your comparison pair');
    expect([...preview.querySelectorAll('[data-practice-pair-organism]')].map(el => el.dataset.practicePairOrganism).sort()).toEqual(['green_turtle', 'hawksbill_turtle']);
    expect(preview.textContent).toContain('Green turtle');
    expect(preview.textContent).toContain('Hawksbill');
    expect(preview.querySelectorAll('img')).toHaveLength(2);
    expect(q(t, '[data-practice-count]').textContent).toContain('2 available. 2 in this round.');
    expect(q(t, '[data-practice-count]').textContent).toContain('only their names as choices');
    await click(q(t, '[data-practice-start]'));
    expect(q(t, '[data-practice-pair-preview]')).toBeNull();
    const asked = [];
    for (let i = 0; i < 2; i++) { expect(choices(t).sort()).toEqual(['green_turtle', 'hawksbill_turtle']); asked.push((await next(t)).id); }
    expect(asked.sort()).toEqual(['green_turtle', 'hawksbill_turtle']);
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 2, correct: 2, last: { total: 2, correct: 2 } });
    expect(named(t, 'Practice this pair again')).toBeTruthy();
    expect(t.data.speciesLog).toEqual({ clownfish: { firstSeen: 1 } }); expect(t.data.speciesBookmarks).toEqual({ green_turtle: true }); expect(t.data.speciesFieldNotes).toEqual({ green_turtle: 'Keep this observation' });
    expect(JSON.stringify(t.data)).not.toMatch(/practicePair|pairIds|practiceSelection/);
  });

  it('retains the original pair and wrong choice through a focused second look and profile return', async () => {
    const t = await mount(); await openPair(t); await click(q(t, '[data-practice-start]'));
    const first = target(t), wrong = choices(t).find(c => c !== first);
    await click(q(t, '[data-practice-choice="' + wrong + '"]'));
    const feedback = q(t, '[data-practice-feedback]').textContent;
    await click(named(t, 'Study profile')); expect(q(t, '[data-marine-profile]')).toBeTruthy();
    await click(q(t, '[data-close-profile]')); expect(target(t)).toBe(first); expect(q(t, '[data-practice-feedback]').textContent).toBe(feedback);
    await click(q(t, '[data-practice-next]')); await next(t, true);
    await click(q(t, '[data-practice-second-look]'));
    expect(target(t)).toBe(first); expect(choices(t).sort()).toEqual(['green_turtle', 'hawksbill_turtle']);
    await next(t, true); expect(t.data.speciesPractice).toMatchObject({ rounds: 2, answered: 3, correct: 2, last: { total: 1, correct: 1, missedIds: [] } });
    expect(q(t, '[data-practice-earlier-review]')).toBeTruthy();
  });

  it('restores a standard collection and its three choices when the learner changes collections', async () => {
    const t = await mount(); await openPair(t);
    await change(q(t, '[data-practice-collection-select]'), 'all');
    expect(q(t, '[data-practice-pair-preview]')).toBeNull();
    expect(q(t, '[data-practice-length]').value).toBe('5');
    await click(q(t, '[data-practice-start]')); expect(choices(t)).toHaveLength(3); expect(q(t, 'h3').textContent).toBe('Organism 1 of 5');
    expect(t.data.speciesPractice).toBeUndefined();
  });

  it('uses the currently selected comparison pair rather than the original profile or guide filter', async () => {
    const t = await mount({ guideFilter: 'saved', guideGroupFilter: 'reptile' });
    await click(q(t, '[data-start-comparison]')); await change(q(t, '[data-compare-select="1"]'), 'blue_tang');
    await click(q(t, '[data-practice-comparison-pair]')); await click(q(t, '[data-practice-start]'));
    expect(choices(t).sort()).toEqual(['blue_tang', 'green_turtle']);
    const asked = [(await next(t)).id, (await next(t)).id]; expect(asked.sort()).toEqual(['blue_tang', 'green_turtle']);
    await click(named(t, 'Back to the field guide')); expect(t.data.guideFilter).toBe('saved'); expect(t.data.guideGroupFilter).toBe('reptile');
    await click(q(t, '[data-start-practice]')); expect(q(t, '[data-practice-collection-select]').value).toBe('selection');
    await click(q(t, '[data-practice-start]')); expect(target(t)).toBe('green_turtle'); expect(choices(t)).toHaveLength(3);
  });

  it('keeps pair practice unavailable for restoration structures', async () => {
    const t = await mount({ guideSpeciesId: 'reef_star' }); await click(q(t, '[data-start-comparison]'));
    expect(q(t, '[data-practice-comparison-pair]')).toBeNull();
    await change(q(t, '[data-compare-select="0"]'), 'green_turtle'); expect(q(t, '[data-practice-comparison-pair]')).toBeNull();
    await change(q(t, '[data-compare-select="1"]'), 'hawksbill_turtle'); expect(q(t, '[data-practice-comparison-pair]')).toBeTruthy();
  });

  it('preserves an active identification round when a comparison is opened while studying an answer', async () => {
    const t = await mount({ guideSpeciesId: null }); await click(q(t, '[data-start-practice]')); await click(q(t, '[data-practice-start]'));
    const id = target(t), before = choices(t); await click(q(t, '[data-practice-choice="' + id + '"]'));
    await click(named(t, 'Study profile')); await click(q(t, '[data-start-comparison]'));
    expect(q(t, '[data-practice-comparison-pair]')).toBeNull();
    await click(q(t, '[data-close-comparison]')); await click(q(t, '[data-close-profile]'));
    expect(target(t)).toBe(id); expect(choices(t)).toEqual(before); expect(q(t, '[data-practice-feedback]')).toBeTruthy(); expect(t.data.speciesPractice).toBeUndefined();
  });
});
