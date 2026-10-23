import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X;
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; vi.spyOn(Date, 'now').mockReturnValue(1720000000000); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } vi.restoreAllMocks(); });
const query = (t, selector) => t.host.querySelector(selector);
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); }
async function select(el, value) { expect(el).toBeTruthy(); await React.act(async () => { el.value = String(value); el.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function mount(extra = {}) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { clownfish: true, banded_pipefish: true }, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } }, ...extra } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (k, v) => v || k }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(query(t, '[data-start-practice]')); return t;
}
function ids(t) { return [...t.host.querySelectorAll('[data-practice-choice]')].map(e => e.dataset.practiceChoice); }
function truthAt(t, length, scope, priority = [], previous, sequence = 1) {
  const index = Number(query(t, '[data-practice-question]').dataset.practiceQuestion);
  return X.buildMarinePracticeRound(X.SPECIES_META, 1720000000000 + sequence, scope, priority, previous, length)[index].id;
}

describe('optional identification round length', () => {
  it('keeps the default five and bounds explicit quick/extended rounds to unique living targets', () => {
    const all = X.SPECIES_META;
    for (const seed of [1, 17, 206]) {
      const standard = X.buildMarinePracticeRound(all, seed);
      expect(standard).toHaveLength(5);
      for (const invalid of [undefined, null, 0, 4, 11, 100, '10', NaN, {}, []]) {
        expect(X.buildMarinePracticeRound(all, seed, undefined, [], undefined, invalid)).toEqual(standard);
      }
      for (const length of [3, 5, 10]) {
        const round = X.buildMarinePracticeRound(all, seed, undefined, [], undefined, length);
        expect(round).toHaveLength(length); expect(new Set(round.map(q => q.id)).size).toBe(length);
        for (const q of round) { expect(all.find(m => m.id === q.id).group).not.toBe('structure'); expect(q.choices).toContain(q.id); expect(new Set(q.choices).size).toBe(3); }
        expect(round).toEqual(X.buildMarinePracticeRound(all, seed, undefined, [], undefined, length));
      }
    }
  });

  it('caps a round to its collection and retains priority targets and previous confusions at ten', () => {
    const scope = X.SPECIES_META.filter(m => m.group !== 'structure').slice(0, 12).map(m => m.id);
    const priority = scope.slice(0, 8), wrongChoice = X.SPECIES_META.find(m => m.group !== 'structure' && !scope.includes(m.id)).id;
    const round = X.buildMarinePracticeRound(X.SPECIES_META, 17, scope, priority, [{ id: priority[0], choice: wrongChoice, correct: false, skipped: false }], 10);
    expect(round).toHaveLength(10); for (const id of priority) expect(round.map(q => q.id)).toContain(id);
    expect(round.find(q => q.id === priority[0]).choices).toContain(wrongChoice);
    expect(round.every(q => scope.includes(q.id))).toBe(true);
    const tiny = X.buildMarinePracticeRound(X.SPECIES_META, 17, ['clownfish', 'banded_pipefish', 'clownfish', 'reef_star', 'invalid'], [], [], 10);
    expect(tiny.map(q => q.id).sort()).toEqual(['banded_pipefish', 'clownfish']);
  });

  it('reads ten-organism records safely and preserves existing five-organism records', () => {
    const old = { rounds: 2, answered: 8, correct: 6, last: { total: 5, correct: 3, skipped: 1, hinted: 2, finishedAt: 23, missedIds: ['clownfish'] } };
    expect(X.marinePracticeProgress(old)).toEqual(old);
    const ids = X.SPECIES_META.filter(m => m.group !== 'structure').slice(0, 12).map(m => m.id);
    expect(X.marinePracticeProgress({ last: { total: 10, correct: 7, skipped: 1, hinted: 4, missedIds: ids.slice(0, 10) } }).last).toMatchObject({ total: 10, correct: 7, skipped: 1, hinted: 4, missedIds: ids.slice(0, 10) });
    expect(X.marinePracticeProgress({ answered: -1, last: { total: 99, correct: 99, missedIds: ids } })).toMatchObject({ answered: 0, last: { total: 10, correct: 10, missedIds: ids.slice(0, 10) } });
  });

  it('starts a quick round and keeps the chosen length while respecting a two-specimen saved collection', async () => {
    const t = await mount(); expect(query(t, '[data-practice-length]').value).toBe('5');
    await select(query(t, '[data-practice-length]'), 3);
    expect(query(t, '[data-practice-start]').textContent).toContain('3-organism');
    await click(query(t, '[data-practice-start]'));
    expect(query(t, 'h3').textContent).toBe('Organism 1 of 3');
    for (let i = 0; i < 3; i++) { await click(query(t, '[data-practice-choice="' + truthAt(t, 3) + '"]')); await click(query(t, '[data-practice-next], [data-practice-finish]')); }
    expect(t.data.speciesPractice.last).toMatchObject({ total: 3, correct: 3 });
    await click([...t.host.querySelectorAll('button')].find(b => b.textContent === 'Choose another group'));
    expect(query(t, '[data-practice-length]').value).toBe('3');
    await select(query(t, '[data-practice-length]'), 10); await select(query(t, '[data-practice-collection-select]'), 'saved');
    expect(query(t, '[data-practice-start]').textContent).toContain('2-organism');
    await click(query(t, '[data-practice-start]')); expect(query(t, 'h3').textContent).toBe('Organism 1 of 2');
    expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } }); expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' });
  });

  it('completes and retries all ten misses without truncating review or awarding dive discoveries', async () => {
    const t = await mount(); await select(query(t, '[data-practice-length]'), 10); await click(query(t, '[data-practice-start]'));
    const targets = [], guesses = {};
    for (let i = 0; i < 10; i++) {
      const id = truthAt(t, 10); targets.push(id);
      const wrong = ids(t).find(other => other !== id); guesses[id] = wrong;
      await click(query(t, '[data-practice-choice="' + wrong + '"]')); await click(query(t, '[data-practice-next], [data-practice-finish]'));
    }
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 10, correct: 0, last: { total: 10, correct: 0, skipped: 0, missedIds: targets } });
    expect(t.host.querySelectorAll('.cr-dxp-review>li')).toHaveLength(10);
    await click(query(t, '[data-practice-second-look]'));
    const retry = [];
    const previous = targets.map(id => ({ id, choice: guesses[id], correct: false, skipped: false }));
    for (let i = 0; i < 10; i++) {
      const id = truthAt(t, 10, targets, targets, previous, 2); retry.push(id); expect(ids(t)).toContain(guesses[id]);
      await click(query(t, '[data-practice-choice="' + id + '"]')); await click(query(t, '[data-practice-next], [data-practice-finish]'));
    }
    expect(retry.sort()).toEqual(targets.slice().sort());
    expect(t.data.speciesPractice).toMatchObject({ rounds: 2, answered: 20, correct: 10, last: { total: 10, correct: 10, missedIds: [] } });
    expect(t.host.querySelectorAll('[data-practice-new-recognition]')).toHaveLength(10);
    expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } }); expect(t.data.speciesBookmarks).toEqual({ clownfish: true, banded_pipefish: true });
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' }); expect(JSON.stringify(t.data.speciesPractice)).not.toMatch(/choice|detailIndex|observation/);
  });

  it('reopens an extended review collection with all ten organisms available', async () => {
    const missed = X.SPECIES_META.filter(m => m.group !== 'structure').slice(0, 10).map(m => m.id);
    const record = { rounds: 1, answered: 10, correct: 0, last: { total: 10, correct: 0, skipped: 0, hinted: 0, missedIds: missed, finishedAt: 100 } };
    const t = await mount({ speciesPractice: record });
    expect(t.host.textContent).toContain('Last round: 0 of 10 recognized');
    await select(query(t, '[data-practice-length]'), 10); await select(query(t, '[data-practice-collection-select]'), 'revisit');
    expect(query(t, '[data-practice-start]').textContent).toContain('10-organism');
    await click(query(t, '[data-practice-start]')); expect(missed).toContain(truthAt(t, 10, missed, missed));
    expect(t.data.speciesPractice).toEqual(record);
  });
});
