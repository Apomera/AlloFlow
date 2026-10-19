// REF lane: the finale summary reads saved state defensively and never shows raw values.
import { beforeAll, describe, expect, it } from 'vitest';
import { harness, leaks } from './cell_ref_helpers.js';

let R, H;
beforeAll(async () => {
  H = await harness();
  H.resetStemLab();
  H.loadTool('stem_lab/stem_tool_cell.js', 'cell');
  R = window.__alloCellRef;
});
const ORGS = ['amoeba', 'paramecium', 'euglena', 'wbc', 'bacterium', 'plantcell', 'diatom', 'volvox', 'stentor', 'tardigrade', 'spirillum'].map(id => ({ id, label: id }));
const OPTS = { organisms: ORGS, factsTotal: 55, dbIds: Array.from({ length: 54 }, (_, i) => i + 1), badgeIds: ['firstObserve', 'allOrganisms', 'quizStreak3'] };
const RICH = {
  _cellExt: { organismsObserved: ['amoeba', 'paramecium', 'amoeba', 'not-a-model'], quizCorrect: 7, badges: ['firstObserve', 'bogus'] },
  discoveries: ['amoeba_0', 'amoeba_1', 'paramecium_2'], _refViewed: [1, 2, 3, 999], interiorCellType: 'plant', interiorSeen: ['nucleus', 'chloroplast', 'cellWall'],
  _studiedVocab: { nucleus: true, ribosome: true, notAWord: true }, _completedChallenges: { first_observe: true, quiz_correct_3: true },
  _osmoHunt: { log: [{}, {}, {}] }, _cmpDrafts: { '0:1': { claim: 'They move differently.' }, '0:2': { claim: '   ' } },
  _cellInquiryRecords: { balance: { observations: ['Membrane controls exchange'], recorded: [true] } }, _glossBest: 6, xpEarned: 40
};
const MALFORMED = [
  null, undefined, 7, 'cell', [],
  { _cellExt: 'broken', discoveries: 'x', _refViewed: { a: 1 }, interiorSeen: 5, _studiedVocab: [1, 2], _completedChallenges: null, _osmoHunt: { log: 'no' }, _cmpDrafts: [1], _cellInquiryRecords: 'x', _glossBest: 'lots', xpEarned: NaN },
  { _cellExt: { organismsObserved: [null, 5, {}], quizCorrect: -4, badges: 'all' }, discoveries: [1, null, 'a'], _refViewed: [NaN, Infinity, -1, '2'], _glossBest: 1e9, interiorCellType: 'alien' },
  { _cellExt: { quizCorrect: Infinity, organismsObserved: new Array(40).fill('amoeba') }, _glossBest: -3, _osmoHunt: { log: new Array(5000).fill(0) } }
];

function checkSummary(s, label) {
  for (const st of s.stats) {
    expect(Number.isInteger(st.value), label + ' ' + st.key).toBe(true);
    expect(st.value, label + ' ' + st.key).toBeGreaterThanOrEqual(0);
    if (st.total) expect(st.value, label + ' ' + st.key).toBeLessThanOrEqual(st.total);
    expect(st.display, label + ' ' + st.key).not.toMatch(/NaN|undefined|Infinity|null|object/);
    expect(st.pct, label).toBeGreaterThanOrEqual(0);
    expect(st.pct, label).toBeLessThanOrEqual(100);
  }
  for (const t of s.types) {
    expect(t.seen, label).toBeLessThanOrEqual(t.total);
    expect(t.quizCorrect, label).toBeLessThanOrEqual(t.quizAttempts);
  }
  expect(s.suggestions.length, label).toBeGreaterThanOrEqual(1);
  expect(s.suggestions.length, label).toBeLessThanOrEqual(4);
  for (const sg of s.suggestions) expect(['observe', 'interior', 'processes', 'osmoHunt', 'compare', 'encyclopedia', 'quiz', 'glossary']).toContain(sg.mode);
  expect(R.cellRefFinaleReport(s, 'Ana', 'today')).not.toMatch(/NaN|undefined|Infinity/);
}

describe('REF finale summary', () => {
  it('treats an empty save as a fresh start', () => {
    const s = R.cellRefFinaleSummary({}, undefined, OPTS);
    checkSummary(s, 'empty');
    expect(s.empty).toBe(true);
    expect(s.explored).toBe(0);
    expect(s.stats.every(x => x.value === 0)).toBe(true);
    expect(s.suggestions.map(x => x.mode)).toEqual(['observe', 'interior', 'processes', 'osmoHunt']);
  });

  it('counts only real, de-duplicated evidence from a rich save', () => {
    const s = R.cellRefFinaleSummary(RICH, undefined, OPTS);
    checkSummary(s, 'rich');
    const v = Object.fromEntries(s.stats.map(x => [x.key, x.value]));
    expect(v).toMatchObject({ observed: 2, profiles: 3, quiz: 7, facts: 3, vocab: 2, gloss: 6, osmosis: 3, claims: 1, inquiry: 1, challenges: 2, badges: 1 });
    const plant = s.types.find(t => t.type === 'plant');
    expect(plant.seen).toBeGreaterThanOrEqual(3);
    expect(s.empty).toBe(false);
    expect(s.suggestions.map(x => x.mode)).not.toContain('observe');
  });

  it('survives malformed saves without raw values', () => {
    MALFORMED.forEach((cell, i) => checkSummary(R.cellRefFinaleSummary(cell, i % 2 ? 'garbage' : { schemaVersion: 99, byCellType: 5 }, i === 2 ? null : OPTS), 'malformed #' + i));
  });

  it('renders the finale for empty, rich and malformed state in the real tool', () => {
    const cases = [{ cell: { mode: 'finale' } }, { cell: Object.assign({ mode: 'finale', _finaleName: 'Ana' }, RICH) }];
    MALFORMED.filter(c => c && typeof c === 'object' && !Array.isArray(c)).forEach(c => cases.push({ cell: Object.assign({ mode: 'finale' }, c) }));
    cases.push({ cell: { mode: 'finale', _finaleName: { bad: true }, _finaleBurst: 'x' }, cellProgress: { schemaVersion: 1, byCellType: { animal: { seen: 'nope', quizAttempts: 'x' } } } });
    for (const td of cases) {
      const html = H.renderTool('cell', td);
      expect(html).toContain('data-cell-ref="finale"');
      expect(html).toContain('Certificate of Exploration');
      expect(leaks(html), JSON.stringify(td).slice(0, 120)).toEqual([]);
    }
    const empty = H.renderTool('cell', { cell: { mode: 'finale' } });
    expect(empty).toContain('Your Cell Explorer journey starts here');
    const rich = H.renderTool('cell', { cell: Object.assign({ mode: 'finale', _finaleName: 'Ana' }, RICH) });
    expect(rich).toContain('You explored the microscopic world!');
    expect(rich).toContain('>Ana<');
    expect(rich).toMatch(/prefers-reduced-motion:reduce\)\{\[data-cell-ref-confetti\] i/);
  });
});
