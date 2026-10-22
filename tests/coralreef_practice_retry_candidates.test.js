import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
const SEED = 1720000000000;
let X;
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; vi.spyOn(Date, 'now').mockReturnValue(SEED); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } vi.restoreAllMocks(); });
const wrong = (id, choice) => ({ id, choice, correct: false, skipped: false });
const build = (seed, scope, priority, previous) => X.buildMarinePracticeRound(X.SPECIES_META, seed, scope, priority, previous);
async function click(element) { expect(element, 'control exists').toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
const query = (t, selector) => t.host.querySelector(selector);
const choices = t => [...t.host.querySelectorAll('[data-practice-choice]')].map(el => el.dataset.practiceChoice);
const named = (t, name) => [...t.host.querySelectorAll('button')].find(el => el.textContent.trim() === name);
async function mount(extra = {}, collection = 'saved') {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { clownfish: true }, speciesFieldNotes: { clownfish: 'Keep this observation' }, speciesLog: { green_turtle: { firstSeen: 1 } }, ...extra } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(query(t, '[data-start-practice]'));
  const select = query(t, '[data-practice-collection-select]');
  await React.act(async () => { select.value = collection; select.dispatchEvent(new Event('change', { bubbles: true })); });
  await click(query(t, '[data-practice-start]')); return t;
}

describe('focused second-look candidate continuity', () => {
  it('retains the known confusion outside the saved target collection while leaving ordinary seeded choices unchanged', () => {
    const normal = build(SEED + 2, ['clownfish'], ['clownfish']);
    expect(normal).toEqual([{ id: 'clownfish', choices: ['clownfish', 'threadfin_butterflyfish', 'moorish_idol'] }]);
    const focused = build(SEED + 2, ['clownfish'], ['clownfish'], [wrong('clownfish', 'lionfish')]);
    expect(focused.map(q => q.id)).toEqual(['clownfish']);
    expect(focused[0].choices).toContain('lionfish');
    expect(focused[0].choices).toHaveLength(3);
    expect(new Set(focused[0].choices).size).toBe(3);
    expect(focused).toEqual(build(SEED + 2, ['clownfish'], ['clownfish'], [wrong('clownfish', 'lionfish')]));
  });

  it('ignores malformed, correct, skipped, self, unknown and restoration choices without changing seeded output', () => {
    const normal = build(SEED + 2, ['clownfish'], ['clownfish']);
    const invalid = [null, false, 'lionfish', [], {}, wrong('unknown', 'lionfish'), wrong('clownfish', 'clownfish'), wrong('clownfish', 'unknown'), wrong('clownfish', 'reef_star'), wrong('clownfish', 1), { ...wrong('clownfish', 'lionfish'), correct: true }, { ...wrong('clownfish', 'lionfish'), skipped: true }, { id: 'clownfish', choice: 'lionfish' }];
    for (const entry of invalid) expect(build(SEED + 2, ['clownfish'], ['clownfish'], [entry])).toEqual(normal);
    for (const input of [undefined, null, false, 'lionfish', {}, invalid]) expect(build(SEED + 2, ['clownfish'], ['clownfish'], input)).toEqual(normal);
    expect(build(SEED + 2, ['clownfish'], ['clownfish'], invalid.concat(wrong('clownfish', 'lionfish')))[0].choices).toContain('lionfish');
  });

  it('preserves target membership and order, valid shuffled choices, and priorities across representative seeds', () => {
    const scope = ['clownfish', 'green_turtle', 'brain_coral', 'sea_cucumber'];
    const previous = [wrong('clownfish', 'lionfish'), wrong('green_turtle', 'hawksbill_turtle'), wrong('brain_coral', 'boulder_coral'), wrong('sea_cucumber', 'nudibranch')];
    const positions = new Set();
    for (let seed = 1; seed <= 25; seed++) {
      const ordinary = build(seed, scope, ['green_turtle']), focused = build(seed, scope, ['green_turtle'], previous);
      expect(focused.map(q => q.id)).toEqual(ordinary.map(q => q.id));
      for (const q of focused) {
        const previousChoice = previous.find(a => a.id === q.id).choice;
        expect(q.choices).toContain(previousChoice); expect(q.choices).toContain(q.id);
        expect(q.choices).toHaveLength(3); expect(new Set(q.choices).size).toBe(3);
        expect(q.choices.every(id => X.SPECIES_META.some(m => m.id === id && m.group !== 'structure'))).toBe(true);
        if (q.id === 'clownfish') positions.add(q.choices.indexOf(previousChoice));
      }
    }
    expect(positions.size).toBe(3);
  });

  it('uses the most recent wrong answer on successive retries and preserves the original contrast reminder', async () => {
    const t = await mount(); expect(choices(t)).toEqual(build(SEED + 1, ['clownfish'], [])[0].choices);
    const firstChoice = choices(t).find(id => id !== 'clownfish');
    await click(query(t, '[data-practice-choice="' + firstChoice + '"]')); await click(query(t, '[data-practice-compare-toggle]'));
    await click(query(t, '[data-practice-guess-detail="2"]')); await click(query(t, '[data-practice-detail="1"]'));
    const reminder = query(t, '[data-practice-contrast-reminder]').textContent;
    await click(query(t, '[data-practice-next]')); await click(query(t, '[data-practice-second-look]'));
    expect(choices(t)).toContain(firstChoice);
    expect(query(t, '[data-practice-contrast-reminder]')).toBeNull(); expect(query(t, '[data-candidate-result]')).toBeNull();
    expect(t.host.querySelectorAll('[data-practice-choice][aria-disabled]')).toHaveLength(0);
    const secondChoice = choices(t).find(id => id !== 'clownfish' && id !== firstChoice);
    await click(query(t, '[data-practice-choice="' + secondChoice + '"]')); await click(query(t, '[data-practice-next]'));
    expect(query(t, '[data-practice-earlier-review] [data-practice-contrast-reminder]').textContent).toBe(reminder);
    await click(query(t, '[data-practice-second-look]'));
    expect(choices(t)).toEqual(build(SEED + 3, ['clownfish'], ['clownfish'], [wrong('clownfish', secondChoice)])[0].choices);
    expect(choices(t)).toContain(secondChoice); expect(query(t, '[data-practice-earlier-review]')).toBeNull();
    await click(query(t, '[data-practice-choice="clownfish"]')); await click(query(t, '[data-practice-next]'));
    expect(query(t, '[data-practice-earlier-review] [data-practice-contrast-reminder]').textContent).toBe(reminder);
    expect(t.data.speciesPractice).toMatchObject({ rounds: 3, answered: 3, correct: 1, last: { correct: 1, hinted: 0, missedIds: [] } });
    expect(JSON.stringify(t.data.speciesPractice)).not.toMatch(/choice|contrast|detailIndex|previousAnswers/);
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this observation' }); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } }); expect(t.data.speciesBookmarks).toEqual({ clownfish: true });
  });

  it('keeps setup rounds and persisted revisit collections independent of prior choices', async () => {
    const t = await mount(), firstChoice = choices(t).find(id => id !== 'clownfish'); await click(query(t, '[data-practice-choice="' + firstChoice + '"]')); await click(query(t, '[data-practice-next]'));
    await click(named(t, 'Choose another group')); await click(query(t, '[data-practice-start]'));
    expect(choices(t)).toEqual(build(SEED + 2, ['clownfish'], [])[0].choices);
    const persisted = await mount({ speciesPractice: { rounds: 1, answered: 1, correct: 0, last: { total: 1, correct: 0, skipped: 0, missedIds: ['clownfish'], choice: 'lionfish', previousAnswers: [wrong('clownfish', 'lionfish')] } } }, 'revisit');
    expect(choices(persisted)).toEqual(build(SEED + 1, ['clownfish'], ['clownfish'])[0].choices);
    expect(query(persisted, '[data-practice-second-look-active]')).toBeNull();
  });
});
