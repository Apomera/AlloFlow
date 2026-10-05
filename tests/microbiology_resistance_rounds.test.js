import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const act = React.act, priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
let tool, mounted;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct;
});

const api = () => window.__MicrobiologyCore.resistance;
const pair = () => ({ aId: 4, bId: 9 });
function book() {
  const start = { day: 0, sensitive: 68, resistant: 12 };
  return { selectedId: 9, nextId: 32, metadata: { keep: ['Raw notebook'] }, unknownImport: [null, 'Keep'],
    records: [
      { id: 4, evidence: { dose: 60, duration: 3, initRes: 15, prediction: 'increase', notes: 'A original notes ' + 'a'.repeat(1800),
        history: [start, { day: 1, sensitive: 12, resistant: 12 }, { day: 2, sensitive: 0, resistant: 20 }, { day: 3, sensitive: 0, resistant: 30 }],
        metadata: { importedEvidence: true } }, reviewNote: 'A later reflection ' + 'r'.repeat(1400), metadata: { record: 'A' } },
      { id: 9, evidence: { dose: 30, duration: 8, initRes: 15, prediction: 'similar', notes: 'B original notes',
        history: [{ ...start }, { day: 1, sensitive: 10, resistant: 5 }, { day: 2, sensitive: 2, resistant: 1 }] }, reviewNote: 'B reflection', metadata: { record: 'B' } },
      { id: 13, evidence: { dose: 0, duration: 4, initRes: 15, prediction: 'similar', notes: 'Independent C original notes',
        history: [{ ...start }, { day: 1, sensitive: 68, resistant: 12 }] }, reviewNote: 'C reflection', metadata: { record: 'C' } }
    ], removed: { index: 1, record: { id: 31, evidence: { dose: 0, initRes: 15,
      history: [{ ...start }, { day: 1, sensitive: 68, resistant: 12 }], notes: 'Recoverable evidence' }, reviewNote: 'Recovery reflection', metadata: { recovered: true } } }
  };
}
function frozen(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); }
  return value;
}
function csvRows(csv) {
  const records = []; let row = [];
  const cells = [...csv.matchAll(/"((?:[^"]|"")*)"(,|\r\n|$)/g)];
  expect(cells.map(cell => cell[0]).join('')).toBe(csv);
  for (const cell of cells) {
    row.push(cell[1].replace(/""/g, '"'));
    if (cell[2] !== ',') { records.push(row); row = []; }
  }
  const [headers, ...data] = records;
  return data.map(values => {
    expect(values).toHaveLength(headers.length);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}
function transition(notebook, preferences, key, selection, owner) {
  return api().changeComparison(notebook, preferences, key, selection,
    owner === undefined ? api().comparisonOwner(notebook, preferences, key === 'round' || selection === null ? undefined : selection) : owner);
}
function unchanged(result, notebook, preferences) {
  expect(result.changed).toBe(false);
  expect(typeof result.status).toBe('string');
  expect(result.notebook).toBe(notebook); expect(result.comparison).toBe(preferences);
}

const observed = [
  { round: 0, a: { sensitive: 68, resistant: 12, totalAlive: 80, sharePct: 15 }, b: { sensitive: 68, resistant: 12, totalAlive: 80, sharePct: 15 }, difference: { sensitive: 0, resistant: 0, totalAlive: 0, sharePercentagePoints: 0 } },
  { round: 1, a: { sensitive: 12, resistant: 12, totalAlive: 24, sharePct: 50 }, b: { sensitive: 10, resistant: 5, totalAlive: 15, sharePct: 33 }, difference: { sensitive: -2, resistant: -7, totalAlive: -9, sharePercentagePoints: -17 } },
  { round: 2, a: { sensitive: 0, resistant: 20, totalAlive: 20, sharePct: 100 }, b: { sensitive: 2, resistant: 1, totalAlive: 3, sharePct: 33 }, difference: { sensitive: 2, resistant: -19, totalAlive: -17, sharePercentagePoints: -67 } }
];

describe('Resistance comparisons inspect recorded common rounds', () => {
  it.each(observed)('uses observed counts at round $round, with saved endpoints kept separate', expected => {
    const result = api().compare(book(), pair(), expected.round);
    expect(result).toMatchObject({ sharedRound: expected.round, latestSharedRound: 2,
      counts: { a: expected.a, b: expected.b }, difference: expected.difference });
    expect(result.records.map(record => record.evidence.day)).toEqual([3, 2]);
    expect(result.records.map(record => record.evidence.finalAlive)).toEqual([30, 3]);
  });

  it('keeps the existing latest common round default independent of preference metadata', () => {
    const preferences = { ...pair(), round: 0, metadata: { imported: true } };
    expect(api().normalizeComparison(preferences, book())).toEqual(pair());
    expect(api().compare(book(), preferences)).toMatchObject({ sharedRound: 2, latestSharedRound: 2 });
    expect(api().compare(book(), preferences, undefined)).toEqual(api().compare(book(), preferences));
  });

  it.each(observed)('reverses A and B at round $round without changing the measured shares', expected => {
    const result = api().compare(book(), { aId: 9, bId: 4 }, expected.round);
    expect(result.counts).toEqual({ a: expected.b, b: expected.a });
    for (const key of ['sensitive', 'resistant', 'totalAlive', 'sharePercentagePoints']) {
      expect(result.difference[key]).toBe(expected.difference[key] === 0 ? 0 : -expected.difference[key]);
    }
  });

  it.each([null, '1', '', true, false, NaN, Infinity, -Infinity, -1, 0.5, 3, {}, [], 1n])('rejects an explicit unobserved or nonnumeric round %s in comparison and both exports', round => {
    const notebook = book(), preferences = pair(), before = JSON.stringify({ notebook, preferences });
    expect(api().compare(notebook, preferences, round)).toBe(null);
    expect(api().exportComparisonText(notebook, preferences, round)).toBe(null);
    expect(api().exportComparisonCSV(notebook, preferences, round)).toBe(null);
    expect(JSON.stringify({ notebook, preferences })).toBe(before);
  });

  it('limits the round choices to the intact observed history prefix', () => {
    const notebook = book();
    notebook.records[1].evidence.history[2].day = 4;
    expect(api().compare(notebook, pair())).toMatchObject({ sharedRound: 1, latestSharedRound: 1 });
    expect(api().compare(notebook, pair(), 2)).toBe(null);
    expect(api().compare(notebook, pair(), 0).counts.a.sharePct).toBe(15);
  });

  it('keeps extinct endpoint shares undefined while earlier living observations remain comparable', () => {
    const notebook = book(); notebook.records[1].evidence.history[2] = { day: 2, sensitive: 0, resistant: 0 };
    const earlier = api().compare(notebook, pair(), 1), extinct = api().compare(notebook, pair(), 2);
    expect(earlier.counts.b).toEqual(observed[1].b);
    expect(earlier.difference.sharePercentagePoints).toBe(-17);
    expect(extinct.counts.b).toEqual({ sensitive: 0, resistant: 0, totalAlive: 0, sharePct: null });
    expect(extinct.difference.sharePercentagePoints).toBe(null);
    const exported = csvRows(api().exportComparisonCSV(notebook, pair(), 1));
    expect(exported[1]).toMatchObject({ shared_round: '1', shared_resistant_share_pct_rounded: '33', saved_end_resistant_share_pct_rounded: 'Undefined', snapshot_status: 'extinct' });
    expect(csvRows(api().exportComparisonCSV(notebook, pair(), 2))[2].shared_share_difference_percentage_points).toBe('Undefined');
  });

  it('exports the chosen round in the report and CSV, preserving the original saved histories and endpoint meanings', () => {
    const notebook = book(), preferences = pair();
    const report = api().exportComparisonText(notebook, preferences, 1);
    expect(report).toContain('Shared comparison round: 1');
    expect(report).toContain('Resistant cells\t12\t5\t-7');
    expect(report).toContain('Resistant share\t50%\t33%\t-17 percentage points');
    expect(report).toContain('3\t0\t30\t30\t100%');
    expect(report).toContain('2\t2\t1\t3\t33%');
    expect(report).toContain('Differences do not establish which setting caused them.');
    expect(report).not.toContain('Shared-round counts use the latest round observed in both histories');
    const rows = csvRows(api().exportComparisonCSV(notebook, preferences, 1));
    expect(rows.map(row => row.shared_round)).toEqual(['1', '1', '1']);
    expect(rows[0]).toMatchObject({ evidence_id: '4', saved_end_round: '3', shared_total_alive: '24', saved_end_total_alive: '30', shared_resistant_share_pct_rounded: '50', saved_end_resistant_share_pct_rounded: '100' });
    expect(rows[1]).toMatchObject({ evidence_id: '9', saved_end_round: '2', shared_total_alive: '15', saved_end_total_alive: '3', shared_resistant_share_pct_rounded: '33', saved_end_resistant_share_pct_rounded: '33' });
    expect(rows[2]).toMatchObject({ row_kind: 'difference_b_minus_a', shared_total_alive: '-9', shared_share_difference_percentage_points: '-17', saved_end_total_alive: '' });
  });

  it('continues escaping formula-leading annotations when exporting an earlier round', () => {
    const notebook = book(); notebook.records[0].evidence.notes = '=SUM(1,2)'; notebook.records[1].reviewNote = '@Earlier interpretation';
    const rows = csvRows(api().exportComparisonCSV(notebook, pair(), 0));
    expect(rows[0].written_evidence).toBe("'=SUM(1,2)");
    expect(rows[1].later_reflection).toBe("'@Earlier interpretation");
  });

  it('reads deeply frozen imported evidence without mutation or random draws', () => {
    const notebook = frozen(book()), preferences = frozen({ ...pair(), metadata: { keep: true } });
    const before = JSON.stringify({ notebook, preferences }), random = vi.spyOn(Math, 'random');
    for (const round of [0, 1, 2]) {
      const result = api().compare(notebook, preferences, round);
      expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.counts.a)).toBe(true);
      expect(api().exportComparisonText(notebook, preferences, round)).toContain('Shared comparison round: ' + round);
      expect(csvRows(api().exportComparisonCSV(notebook, preferences, round))[0].shared_round).toBe(String(round));
    }
    expect(random).not.toHaveBeenCalled(); expect(JSON.stringify({ notebook, preferences })).toBe(before);
  });

  it.each([{ aId: 4, bId: 4 }, { aId: null, bId: 9 }, { aId: 4, bId: 31 }, { aId: 4, bId: '9' }])('requires distinct retained original snapshot identities for every round: %j', preferences => {
    for (const round of [undefined, 0, 1]) expect(api().compare(book(), preferences, round)).toBe(null);
  });
});

describe('Resistance comparison intent protects later raw notebook state', () => {
  it('stores an explicit round while preserving all raw notebook references, long annotations, and preference metadata', () => {
    const notebook = frozen(book()), preferences = frozen({ ...pair(), metadata: { keep: [1, 2] }, importedPreference: ['Keep'] });
    const before = JSON.stringify({ notebook, preferences }), result = transition(notebook, preferences, 'round', 1);
    expect(result.changed).toBe(true); expect(result.notebook).toBe(notebook);
    expect(result.comparison).toEqual({ ...preferences, round: 1 });
    expect(result.comparison.metadata).toBe(preferences.metadata); expect(JSON.stringify({ notebook, preferences })).toBe(before);
  });

  it('returns to the latest round through a null preference without passing null to core comparison', () => {
    const notebook = book(), preferences = { ...pair(), round: 0 };
    const result = transition(notebook, preferences, 'round', null);
    expect(result.changed).toBe(true); expect(result.comparison).toEqual({ ...pair(), round: null });
    expect(result.notebook).toBe(notebook);
    unchanged(transition(notebook, result.comparison, 'round', null), notebook, result.comparison);
  });

  it('resets a selected round when either snapshot changes and preserves unrelated preferences', () => {
    const notebook = book(), preferences = { ...pair(), round: 1, metadata: { keep: true } };
    const result = transition(notebook, preferences, 'bId', 13);
    expect(result.changed).toBe(true); expect(result.notebook).toBe(notebook);
    expect(result.comparison).toEqual({ ...preferences, bId: 13, round: null });
    const cleared = transition(notebook, result.comparison, 'aId', null);
    expect(cleared.comparison).toEqual({ ...result.comparison, aId: null, round: null });
  });

  it('keeps legacy preference shape when changing a pair that has no round field', () => {
    const notebook = book(), preferences = { ...pair(), metadata: { keep: true } };
    const result = transition(notebook, preferences, 'bId', 13);
    expect(result.comparison).toEqual({ ...preferences, bId: 13 });
    expect(Object.hasOwn(result.comparison, 'round')).toBe(false); expect(result.notebook).toBe(notebook);
  });

  it('allows newer notebook and preference metadata while keeping the intended snapshots intact', () => {
    const notebook = book(), preferences = { ...pair(), round: 0, metadata: { old: true } };
    const owner = api().comparisonOwner(notebook, preferences);
    const latestBook = { ...notebook, selectedId: 13, metadata: { new: true }, removed: { ...notebook.removed, laterMetadata: 'Keep recovery' } };
    latestBook.records[0].metadata.later = 'Keep this record metadata';
    const latestPreferences = { ...preferences, metadata: { new: true }, importLabel: 'Latest comparison metadata' };
    const result = api().changeComparison(latestBook, latestPreferences, 'round', 1, owner);
    expect(result.changed).toBe(true); expect(result.notebook).toBe(latestBook);
    expect(result.comparison).toEqual({ ...latestPreferences, round: 1 });
    expect(result.comparison.metadata).toBe(latestPreferences.metadata);
    expect(result.notebook.records).toBe(notebook.records); expect(result.notebook.removed).toBe(latestBook.removed);
  });

  it('accepts an edit to an unselected snapshot without overwriting its newer annotation', () => {
    const notebook = book(), preferences = { ...pair(), round: 0 }, owner = api().comparisonOwner(notebook, preferences);
    const laterRecord = { ...notebook.records[2], reviewNote: 'A newer independent reflection', unknown: { keep: true } };
    const latestBook = { ...notebook, records: [notebook.records[0], notebook.records[1], laterRecord] };
    const result = api().changeComparison(latestBook, preferences, 'round', 1, owner);
    expect(result.changed).toBe(true); expect(result.notebook).toBe(latestBook); expect(result.notebook.records[2]).toBe(laterRecord);
  });

  const races = [
    { name: 'JSON import', change: (notebook, preferences) => [JSON.parse(JSON.stringify(notebook)), JSON.parse(JSON.stringify(preferences))] },
    { name: 'A identity replacement', change: (notebook, preferences) => [{ ...notebook, records: [{ ...notebook.records[0] }, ...notebook.records.slice(1)] }, preferences] },
    { name: 'B identity replacement', change: (notebook, preferences) => [{ ...notebook, records: [notebook.records[0], { ...notebook.records[1] }, notebook.records[2]] }, preferences] },
    { name: 'A evidence changed in place', change: (notebook, preferences) => { notebook.records[0].evidence.history[1].resistant = 11; return [notebook, preferences]; } },
    { name: 'B evidence changed in place', change: (notebook, preferences) => { notebook.records[1].evidence.notes = 'Later original evidence import'; return [notebook, preferences]; } },
    { name: 'new pair selection', change: (notebook, preferences) => [notebook, { ...preferences, bId: 13 }] },
    { name: 'new round selection', change: (notebook, preferences) => [notebook, { ...preferences, round: 2 }] },
    { name: 'round field ownership changed', change: (notebook, preferences) => { const next = { ...preferences }; delete next.round; return [notebook, next]; } },
    { name: 'removed selected snapshot', change: (notebook, preferences) => [{ ...notebook, records: notebook.records.slice(1) }, preferences] }
  ];
  it.each(races)('rejects an older round intent after $name', race => {
    const notebook = book(), preferences = { ...pair(), round: 0 }, owner = api().comparisonOwner(notebook, preferences);
    const [latestBook, latestPreferences] = race.change(notebook, preferences), before = JSON.stringify({ latestBook, latestPreferences });
    unchanged(api().changeComparison(latestBook, latestPreferences, 'round', 1, owner), latestBook, latestPreferences);
    expect(JSON.stringify({ latestBook, latestPreferences })).toBe(before);
  });

  it('rejects a stale target snapshot while choosing a new pair', () => {
    const notebook = book(), preferences = { ...pair(), round: 1 }, owner = api().comparisonOwner(notebook, preferences, 13);
    const latestBook = { ...notebook, records: [notebook.records[0], notebook.records[1], { ...notebook.records[2], reviewNote: 'New import reflection' }] };
    unchanged(api().changeComparison(latestBook, preferences, 'bId', 13, owner), latestBook, preferences);
  });

  it('rejects a target whose evidence was edited in place after the pair chooser rendered', () => {
    const notebook = book(), preferences = pair(), owner = api().comparisonOwner(notebook, preferences, 13);
    notebook.records[2].evidence.history[1].sensitive = 67;
    unchanged(api().changeComparison(notebook, preferences, 'bId', 13, owner), notebook, preferences);
  });

  it('rejects clearing an unresolved pair after a replacement notebook makes both raw IDs valid', () => {
    const notebook = { records: [], selectedId: null, metadata: { old: true } }, preferences = { ...pair(), round: null };
    const owner = api().comparisonOwner(notebook, preferences, null);
    const latestBook = JSON.parse(JSON.stringify(book())), before = JSON.stringify({ latestBook, preferences });
    unchanged(api().changeComparison(latestBook, preferences, 'bId', null, owner), latestBook, preferences);
    expect(api().compare(latestBook, preferences)).not.toBe(null);
    expect(JSON.stringify({ latestBook, preferences })).toBe(before);
  });

  it('rejects clearing an unresolved B after B becomes valid while A retains its original raw identity', () => {
    const complete = book(), notebook = { ...complete, records: [complete.records[0]] }, preferences = { ...pair(), round: null };
    const owner = api().comparisonOwner(notebook, preferences, null);
    const latestBook = { ...notebook, records: [notebook.records[0], complete.records[1]] };
    expect(latestBook.records[0]).toBe(notebook.records[0]);
    unchanged(api().changeComparison(latestBook, preferences, 'bId', null, owner), latestBook, preferences);
    expect(api().compare(latestBook, preferences)).not.toBe(null);
  });

  it.each([-1, 0.5, 3, '1', undefined, NaN, Infinity, {}, true])('rejects invalid round preference %s without changing notebook or pair', round => {
    const notebook = book(), preferences = { ...pair(), round: 0 };
    unchanged(transition(notebook, preferences, 'round', round), notebook, preferences);
  });

  it.each([['aId', '13'], ['bId', 31], ['unknown', 4]])('rejects an invalid chooser action %s=%s', (key, selection) => {
    const notebook = book(), preferences = pair();
    unchanged(transition(notebook, preferences, key, selection), notebook, preferences);
  });

  it('repairs only the explicitly selected record ID and preserves every raw evidence and recovery field', () => {
    const notebook = book(); notebook.records[0].id = 'bad';
    const preferences = { aId: 1, bId: 9, round: 1, metadata: { keep: true } }, before = JSON.stringify({ notebook, preferences });
    const owner = api().comparisonOwner(notebook, preferences, 1), result = api().changeComparison(notebook, preferences, 'aId', 1, owner);
    expect(result.changed).toBe(true); expect(result.comparison).toEqual({ ...preferences, aId: 1, bId: 9, round: null });
    expect(result.notebook).toEqual({ ...notebook, records: [{ ...notebook.records[0], id: 1 }, notebook.records[1], notebook.records[2]] });
    expect(result.notebook.records[0].evidence).toBe(notebook.records[0].evidence);
    expect(result.notebook.records[0].reviewNote).toBe(notebook.records[0].reviewNote);
    expect(result.notebook.records[0].metadata).toBe(notebook.records[0].metadata);
    expect(result.notebook.records[1]).toBe(notebook.records[1]); expect(result.notebook.records[2]).toBe(notebook.records[2]);
    expect(result.notebook.removed).toBe(notebook.removed); expect(result.notebook.metadata).toBe(notebook.metadata);
    expect(JSON.stringify({ notebook, preferences })).toBe(before);
  });

  it('clears an invalid opposite ID before explicit repair so it cannot silently attach to the newly repaired record', () => {
    const notebook = book(); notebook.records[0].id = 'bad';
    const preferences = { aId: 9, bId: 1, metadata: { keep: true } };
    const result = transition(notebook, preferences, 'aId', 1);
    expect(result.changed).toBe(true); expect(result.comparison).toEqual({ ...preferences, aId: 1, bId: null });
    expect(api().compare(result.notebook, result.comparison)).toBe(null);
  });

  it('rejects a repaired target after its raw record was replaced', () => {
    const notebook = book(); notebook.records[0].id = 'bad';
    const preferences = { aId: null, bId: 9 }, owner = api().comparisonOwner(notebook, preferences, 1);
    const latestBook = { ...notebook, records: [{ ...notebook.records[0] }, ...notebook.records.slice(1)] };
    unchanged(api().changeComparison(latestBook, preferences, 'aId', 1, owner), latestBook, preferences);
  });
});

function seed(round = null) {
  const notebook = book();
  return { tab: 'resistance', earnedXP: 41, rootMetadata: { keep: ['Raw root'] },
    resistanceNotebook: notebook, resistanceComparison: { ...pair(), round, metadata: { keep: true } },
    resistanceInvestigation: window.__MicrobiologyCore.normalizeResistanceInvestigation({ ...notebook.records[2].evidence, notes: 'Current culture observations' }),
    growthLab: { hypothesis: 'Keep another investigation' } };
}
function mount(value = seed(), { strict = false } = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, hold: false, pending: [], awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: value, otherTool: { notes: 'Keep another tool' } });
    view.state = data; view.change = setData;
    return tool.render(makeCtx({ toolData: data, setToolData: update => {
      if (view.hold) view.pending.push(update); else setData(update);
    }, awardXP: view.awardXP }));
  }
  mounted = view;
  act(() => view.root.render(React.createElement(strict ? React.StrictMode : React.Fragment, null, React.createElement(Host))));
  return view;
}
const node = selector => mounted.container.querySelector(selector);
function choose(selector, value) {
  const select = node(selector); expect(select, selector).toBeTruthy();
  act(() => { select.value = value === null ? '' : String(value); select.dispatchEvent(new Event('change', { bubbles: true })); });
  return select;
}
function openComparison() {
  const details = node('#micro-resistance-comparison'); expect(details).toBeTruthy();
  if (!details.open) act(() => details.querySelector('summary').click());
  return details;
}
function cells(key) { return [...node(`[data-resistance-compare-row="${key}"]`).children].map(cell => cell.textContent); }
function queueRound(round) {
  mounted.hold = true; choose('#micro-resistance-compare-round', round); mounted.hold = false;
  expect(mounted.pending).toHaveLength(1); expect(typeof mounted.pending[0]).toBe('function');
}
function release() {
  const [update] = mounted.pending.splice(0); expect(typeof update).toBe('function');
  act(() => mounted.change(previous => update(previous)));
}
function changeMicro(change) { act(() => mounted.change(previous => ({ ...previous, microbiology: change(previous.microbiology) }))); }
function downloads() {
  const blobs = [], files = [];
  vi.stubGlobal('Blob', class { constructor(parts, options) { this.parts = parts; this.type = options.type; } });
  vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:round-inspector-' + blobs.length; }), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { files.push(this.download); });
  return { blobs, files };
}

describe('Resistance round inspector mounted workflow', { timeout: 60000 }, () => {
  it('names the round chooser, offers only common observations, and keeps endpoints separate', () => {
    mount(); openComparison(); const select = node('#micro-resistance-compare-round');
    expect(node('label[for="micro-resistance-compare-round"]').textContent).toBe('Shared comparison round');
    expect(select.value).toBe(''); expect([...select.options].map(option => option.value)).toEqual(['', '0', '1', '2']);
    expect(cells('resistant')).toEqual(['Resistant cells', '20', '1', '-19']);
    choose('#micro-resistance-compare-round', 0);
    expect(node('[data-resistance-comparison-round]').getAttribute('data-resistance-comparison-round')).toBe('0');
    expect(cells('totalAlive')).toEqual(['Total living cells', '80', '80', '0']);
    expect(cells('sharePct')).toEqual(['Resistant share', '15%', '15%', '0 percentage points']);
    expect(openComparison().textContent).toContain('ends at round 3/3');
    expect(openComparison().textContent).toContain('ends at round 2/8');
  });

  it('changes round without changing notebook bytes, current observations, focus, random draws, or XP', () => {
    mount(frozen(seed())); openComparison(); const before = mounted.state, random = vi.spyOn(Math, 'random');
    const select = node('#micro-resistance-compare-round'); act(() => select.focus()); choose('#micro-resistance-compare-round', 1);
    expect(document.activeElement).toBe(select);
    expect(cells('sharePct')).toEqual(['Resistant share', '50%', '33%', '-17 percentage points']);
    const latest = mounted.state;
    expect(latest.microbiology.resistanceComparison).toEqual({ ...before.microbiology.resistanceComparison, round: 1 });
    for (const [key, value] of Object.entries(before.microbiology)) {
      if (key !== 'resistanceComparison') expect(latest.microbiology[key], key).toBe(value);
    }
    expect(latest.otherTool).toBe(before.otherTool); expect(node('#micro-resistance-notes').value).toBe('Current culture observations');
    expect(random).not.toHaveBeenCalled(); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('restores a selected observation after JSON reload and resets it when the pair changes', () => {
    mount(); openComparison(); choose('#micro-resistance-compare-round', 1);
    const saved = JSON.parse(JSON.stringify(mounted.state.microbiology));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; mount(saved); openComparison();
    expect(node('#micro-resistance-compare-round').value).toBe('1'); expect(cells('resistant')).toEqual(['Resistant cells', '12', '5', '-7']);
    choose('#micro-resistance-compare-b', 13);
    expect(mounted.state.microbiology.resistanceComparison).toEqual({ ...saved.resistanceComparison, bId: 13, round: null });
    expect(node('#micro-resistance-compare-round').value).toBe('');
    expect([...node('#micro-resistance-compare-round').options].map(option => option.value)).toEqual(['', '0', '1']);
    expect(mounted.state.microbiology.resistanceNotebook).toBe(saved.resistanceNotebook);
  });

  it.each(['2', -1, 99, {}, undefined])('shows the latest valid observation for malformed imported round %s without rewriting the raw preference', round => {
    const value = seed(round); if (round === undefined) value.resistanceComparison.round = undefined;
    mount(value); openComparison(); const before = mounted.state;
    expect(node('#micro-resistance-compare-round').value).toBe('');
    expect(cells('resistant')).toEqual(['Resistant cells', '20', '1', '-19']);
    expect(mounted.state).toBe(before); expect(mounted.state.microbiology.resistanceComparison).toBe(value.resistanceComparison);
  });

  it('downloads the displayed chosen round in both filenames and artifacts without changing persisted work', () => {
    mount(seed(1)); openComparison(); const captured = downloads(), before = JSON.stringify(mounted.state), random = vi.spyOn(Math, 'random');
    act(() => node('#micro-resistance-comparison-download-text').click());
    act(() => node('#micro-resistance-comparison-download-csv').click());
    expect(captured.files).toEqual(['micro-lab-resistance-comparison-A4-B9-round1.txt', 'micro-lab-resistance-comparison-A4-B9-round1.csv']);
    expect(captured.blobs[0].parts.join('')).toBe(api().exportComparisonText(mounted.state.microbiology.resistanceNotebook, pair(), 1));
    expect(captured.blobs[1].parts.join('')).toBe(api().exportComparisonCSV(mounted.state.microbiology.resistanceNotebook, pair(), 1));
    expect(JSON.stringify(mounted.state)).toBe(before); expect(random).not.toHaveBeenCalled(); expect(mounted.awardXP).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000)); expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('preserves newer unrelated state when an earlier round action finally applies', () => {
    mount(seed(0)); openComparison(); queueRound(1);
    changeMicro(micro => ({ ...micro, rootMetadata: { newer: true }, growthLab: { hypothesis: 'A newer independent question' },
      resistanceNotebook: { ...micro.resistanceNotebook, selectedId: 13, metadata: { newer: true } },
      resistanceComparison: { ...micro.resistanceComparison, metadata: { newer: true } } }));
    const before = mounted.state; release();
    expect(mounted.state.microbiology.resistanceComparison).toEqual({ ...before.microbiology.resistanceComparison, round: 1 });
    for (const [key, value] of Object.entries(before.microbiology)) if (key !== 'resistanceComparison') expect(mounted.state.microbiology[key], key).toBe(value);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(['JSON import', 'new pair', 'new round', 'active tab'])('rejects an older round control after %s', race => {
    mount(seed(0)); openComparison(); queueRound(1);
    if (race === 'JSON import') act(() => mounted.change(previous => JSON.parse(JSON.stringify(previous))));
    else changeMicro(micro => race === 'active tab' ? { ...micro, tab: 'home' } : { ...micro,
      resistanceComparison: { ...micro.resistanceComparison, ...(race === 'new pair' ? { bId: 13 } : { round: 2 }) } });
    const before = mounted.state; release(); expect(mounted.state).toBe(before); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(['JSON import', 'new pair', 'chosen target replacement'])('rejects an older snapshot chooser after %s', race => {
    mount(seed(1)); openComparison(); mounted.hold = true; choose('#micro-resistance-compare-b', 13); mounted.hold = false;
    expect(mounted.pending).toHaveLength(1); expect(typeof mounted.pending[0]).toBe('function');
    if (race === 'JSON import') act(() => mounted.change(previous => JSON.parse(JSON.stringify(previous))));
    else changeMicro(micro => race === 'new pair' ? { ...micro, resistanceComparison: { ...micro.resistanceComparison, aId: 13 } } :
      { ...micro, resistanceNotebook: { ...micro.resistanceNotebook, records: [micro.resistanceNotebook.records[0], micro.resistanceNotebook.records[1],
        { ...micro.resistanceNotebook.records[2], reviewNote: 'New imported target reflection' }] } });
    const before = mounted.state; release(); expect(mounted.state).toBe(before); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(['both unresolved', 'only B unresolved'])('keeps newly resolved snapshots after an earlier clear action from %s', scenario => {
    const value = seed();
    value.resistanceNotebook = { ...value.resistanceNotebook,
      records: scenario === 'both unresolved' ? [] : [value.resistanceNotebook.records[0]] };
    mount(value); openComparison();
    expect(node('#micro-resistance-compare-b').value).toBe('');
    mounted.hold = true; choose('#micro-resistance-compare-b', null); mounted.hold = false;
    expect(mounted.pending).toHaveLength(1); expect(typeof mounted.pending[0]).toBe('function');
    changeMicro(micro => ({ ...micro, resistanceNotebook: scenario === 'both unresolved'
      ? JSON.parse(JSON.stringify(book()))
      : { ...micro.resistanceNotebook, records: [micro.resistanceNotebook.records[0], book().records[1]] } }));
    const before = mounted.state;
    expect(node('#micro-resistance-compare-b').value).toBe('9');
    expect(node('#micro-resistance-comparison-table')).toBeTruthy();
    release(); expect(mounted.state).toBe(before);
    expect(mounted.state.microbiology.resistanceComparison.bId).toBe(9);
    expect(node('#micro-resistance-compare-b').value).toBe('9');
    expect(node('#micro-resistance-comparison-table')).toBeTruthy(); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('preserves newer metadata and notes when a delayed pair choice resets the shared round', () => {
    mount(seed(1)); openComparison(); mounted.hold = true; choose('#micro-resistance-compare-b', 13); mounted.hold = false;
    expect(mounted.pending).toHaveLength(1);
    changeMicro(micro => ({ ...micro, rootMetadata: { newer: true }, resistanceComparison: { ...micro.resistanceComparison, metadata: { newer: true } },
      resistanceNotebook: { ...micro.resistanceNotebook, selectedId: 4, metadata: { newer: true } } }));
    const before = mounted.state; release();
    expect(mounted.state.microbiology.resistanceComparison).toEqual({ ...before.microbiology.resistanceComparison, bId: 13, round: null });
    expect(mounted.state.microbiology.resistanceNotebook).toBe(before.microbiology.resistanceNotebook);
    expect(mounted.state.microbiology.resistanceInvestigation).toBe(before.microbiology.resistanceInvestigation);
    expect(mounted.state.microbiology.rootMetadata).toBe(before.microbiology.rootMetadata); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('establishes only the chosen repaired ID through the mounted chooser without normalizing long raw evidence', () => {
    const value = seed(1); value.resistanceNotebook.records[0].id = 'bad'; value.resistanceComparison.aId = 1;
    mount(value); openComparison(); const before = mounted.state.microbiology;
    expect(node('#micro-resistance-compare-a').value).toBe(''); choose('#micro-resistance-compare-a', 1);
    const after = mounted.state.microbiology;
    expect(after.resistanceComparison).toEqual({ ...before.resistanceComparison, aId: 1, round: null });
    expect(after.resistanceNotebook).toEqual({ ...before.resistanceNotebook,
      records: [{ ...before.resistanceNotebook.records[0], id: 1 }, before.resistanceNotebook.records[1], before.resistanceNotebook.records[2]] });
    expect(after.resistanceNotebook.records[0].evidence).toBe(before.resistanceNotebook.records[0].evidence);
    expect(after.resistanceNotebook.records[0].reviewNote.length).toBeGreaterThan(1400);
    expect(after.resistanceNotebook.removed).toBe(before.resistanceNotebook.removed);
    expect(after.resistanceInvestigation).toBe(before.resistanceInvestigation); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('applies the round choice under Strict Mode without advancing the live culture or awarding work', () => {
    mount(seed(), { strict: true }); openComparison(); const before = mounted.state;
    choose('#micro-resistance-compare-round', 1);
    expect(mounted.state.microbiology.resistanceComparison.round).toBe(1);
    expect(mounted.state.microbiology.resistanceInvestigation).toBe(before.microbiology.resistanceInvestigation);
    expect(mounted.state.microbiology.resistanceNotebook).toBe(before.microbiology.resistanceNotebook);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });
});
