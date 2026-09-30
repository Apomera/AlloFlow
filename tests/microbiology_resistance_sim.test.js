import fs from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});

function comparisonNotebook() {
  const first = { day: 0, sensitive: 68, resistant: 12 };
  return { selectedId: 4, nextId: 10, records: [
    { id: 4, evidence: { dose: 60, duration: 3, initRes: 15, prediction: 'increase', notes: 'Original A',
      history: [first, { day: 1, sensitive: 12, resistant: 12 }, { day: 2, sensitive: 0, resistant: 20 }, { day: 3, sensitive: 0, resistant: 30 }] } },
    { id: 9, evidence: { dose: 30, duration: 8, initRes: 15, prediction: 'similar', notes: 'Original B',
      history: [first, { day: 1, sensitive: 0, resistant: 2 }] } }
  ] };
}

function readComparisonCSV(csv) {
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

describe('Microbiology resistance investigation', () => {
  it('models a resistance advantage consistently', () => {
    const probabilities = window.__MicrobiologyCore.getResistanceKillProbabilities;
    expect(probabilities(0)).toEqual({ sensitive: 0, resistant: 0 });
    expect(probabilities(5).resistant).toBeLessThan(probabilities(5).sensitive);
    expect(probabilities(100)).toEqual({ sensitive: 1, resistant: 0.05 });
  });

  it('classifies and evaluates observed trends', () => {
    const core = window.__MicrobiologyCore;
    expect(core.classifyResistanceTrend(3, 25)).toBe('increase');
    expect(core.classifyResistanceTrend(50, 53)).toBe('similar');
    expect(core.classifyResistanceTrend(30, 20)).toBe('decrease');
    expect(core.evaluateResistancePrediction(3, 25, 'increase')).toMatchObject({ correct: true, observed: 'increase', change: 22 });
  });

  it('adapts the explanation to initial variation', () => {
    const evaluate = window.__MicrobiologyCore.evaluateResistanceExplanation;
    expect(evaluate(3, 'selection')).toMatchObject({ correct: true, expected: 'selection' });
    expect(evaluate(0, 'variation-required')).toMatchObject({ correct: true, expected: 'variation-required' });
    expect(evaluate(0, 'selection').correct).toBe(false);
  });

  it('treats extinction as an undefined share and reviews the observed mechanism', () => {
    const core = window.__MicrobiologyCore;
    expect(core.classifyResistanceTrend(10, null)).toBe('extinct');
    expect(core.evaluateResistancePrediction(10, null, 'extinct')).toMatchObject({ correct: true, change: null });
    expect(core.evaluateResistanceExplanation(10, 'extinction', { totalAlive: 0, finalPct: null, dose: 100 }).correct).toBe(true);
    expect(core.evaluateResistanceExplanation(10, 'no-selection', { totalAlive: 80, finalPct: 10, dose: 0 }).correct).toBe(true);
    expect(core.evaluateResistanceExplanation(10, 'chance', { totalAlive: 20, finalPct: 5, dose: 60 }).correct).toBe(true);
    expect(core.evaluateResistanceExplanation(10, 'selection', { totalAlive: 20, finalPct: 5, dose: 60 }).correct).toBe(false);
  });

  it('seeds the requested whole-cell count independently of random position', () => {
    const population = window.__MicrobiologyCore.createResistancePopulation;
    for (const random of [() => 0, () => 0.999]) {
      expect(population(0, random).filter(cell => cell.resistant)).toHaveLength(0);
      expect(population(15, random).filter(cell => cell.resistant)).toHaveLength(12);
      expect(population(3, random).filter(cell => cell.resistant)).toHaveLength(2);
      expect(population(100, random)).toHaveLength(80);
    }
  });

  it('normalizes bounded saved runs and reconstructs cells from intact evidence', () => {
    const normalize = window.__MicrobiologyCore.normalizeResistanceInvestigation;
    const corrupt = normalize({ dose: Infinity, duration: 2000, initRes: -5, day: NaN, bact: [{ alive: true }], prediction: {}, explanation: 'unknown', explanationSubmitted: true });
    expect(corrupt).toMatchObject({ version: 1, dose: 60, duration: 30, initRes: 0, day: 0, prediction: null, explanation: null, explanationSubmitted: false });
    expect(corrupt.history).toEqual([{ day: 0, sensitive: 80, resistant: 0 }]);
    expect(corrupt.bact).toHaveLength(80);
    const history = [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 10, resistant: 10 }];
    const restored = normalize({ initRes: 15, history, bact: [], prediction: 'increase', day: 900 });
    expect(restored.day).toBe(1);
    expect(restored.history).toEqual(history);
    expect(restored.bact.filter(cell => cell.alive)).toHaveLength(20);
    expect(restored.bact.filter(cell => cell.alive && cell.resistant)).toHaveLength(10);
    expect(normalize(JSON.parse(JSON.stringify(restored)))).toEqual(restored);
    history[1].resistant = 0;
    expect(restored.history[1].resistant).toBe(10);
    expect(restored.bact.every(cell => Number.isFinite(cell.x) && Number.isFinite(cell.y) && Math.hypot(cell.x - 100, cell.y - 100) < 90.001)).toBe(true);
  });

  it('retains a valid history prefix without inventing cells after extinction or accepting oversized history', () => {
    const normalize = window.__MicrobiologyCore.normalizeResistanceInvestigation;
    const extinct = normalize({ initRes: 0, history: [{ day: 0, sensitive: 80, resistant: 0 }, { day: 1, sensitive: 0, resistant: 0 }, { day: 2, sensitive: 0, resistant: 10 }] });
    expect(extinct.day).toBe(1);
    expect(extinct.history).toHaveLength(2);
    expect(extinct.bact.filter(cell => cell.alive)).toHaveLength(0);
    const bounded = normalize({ duration: 30, history: Array.from({ length: 200 }, (_, day) => ({ day, sensitive: 78, resistant: 2 })) });
    expect(bounded.history).toHaveLength(31);
    expect(bounded.day).toBe(30);
    const broken = normalize({ history: [{ day: 0, sensitive: 78, resistant: 2 }, { day: 1, sensitive: NaN, resistant: 2 }] });
    expect(broken.day).toBe(0);
    expect(broken.history).toHaveLength(1);
  });

  it('keeps the workflow explicit and accessible', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
    expect(source).toContain('1. Predict the resistant share after exposure');
    expect(source).toContain('Choose a prediction to unlock the culture controls.');
    expect(source).toContain('disabled: !investigationReady || finished');
    expect(source).toContain("name: 'micro-resistance-prediction'");
    expect(source).toContain('2. Observe: ');
    expect(source).toContain('3. Explain the observed pattern');
    expect(source).toContain("name: 'micro-resistance-explanation'");
    expect(source).toContain("role: 'status', 'aria-live': 'polite'");
    expect(source).not.toContain('var killRes = 0.05;');
  });

  it('derives ready, partial, completed and extinct status from observed counts', () => {
    const api = window.__MicrobiologyCore.resistance;
    const history = [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 0, resistant: 12 }];
    expect(api.status(null)).toBe('ready');
    expect(api.status({ initRes: 15, history })).toBe('in-progress');
    expect(api.status({ initRes: 15, duration: 3, history: history.concat([{ day: 2, sensitive: 0, resistant: 12 }, { day: 3, sensitive: 0, resistant: 12 }]) })).toBe('completed');
    expect(api.evidence({ initRes: 0, history: [{ day: 0, sensitive: 80, resistant: 0 }, { day: 1, sensitive: 0, resistant: 0 }], status: 'completed', finalPct: 100, finalAlive: 80 }))
      .toMatchObject({ status: 'extinct', finalPct: null, finalAlive: 0, day: 1 });
  });

  it('copies original conditions and counts into immutable snapshots without random draws', () => {
    const api = window.__MicrobiologyCore.resistance;
    const source = { initRes: 15, dose: 35, duration: 6, prediction: 'decrease', notes: 'Evidence before reset', history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 20, resistant: 12 }] };
    const random = vi.spyOn(Math, 'random');
    const snapshot = api.evidence(source);
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
    expect(snapshot).toMatchObject({ initRes: 15, dose: 35, duration: 6, prediction: 'decrease', day: 1, status: 'in-progress', notes: 'Evidence before reset', initialPct: 15, finalAlive: 32, finalPct: 38 });
    source.history[1].resistant = 0;
    source.notes = 'Changed later';
    expect(snapshot.history[1].resistant).toBe(12);
    expect(snapshot.notes).toBe('Evidence before reset');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.history[0])).toBe(true);
    expect(api.evidence(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
  });

  it('saves and deduplicates explicit evidence without overwriting earlier snapshots', () => {
    const api = window.__MicrobiologyCore.resistance;
    const run = { initRes: 15, history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 0, resistant: 12 }], prediction: 'increase', notes: 'First note' };
    expect(api.save(null, {}).status).toBe('empty');
    const first = api.save(null, run);
    expect(first).toMatchObject({ status: 'saved', id: 1, notebook: { selectedId: 1, nextId: 2 } });
    const same = api.save(first.notebook, JSON.parse(JSON.stringify(run)));
    expect(same.status).toBe('duplicate');
    expect(same.notebook.records).toHaveLength(1);
    const second = api.save(same.notebook, { ...run, notes: 'A later interpretation' });
    expect(second.status).toBe('saved');
    expect(second.notebook.records.map(item => item.id)).toEqual([1, 2]);
    expect(second.notebook.records[0].evidence.notes).toBe('First note');
    expect(second.notebook.records[1].evidence.notes).toBe('A later interpretation');
    expect(first.notebook.records).toHaveLength(1);
  });

  it('bounds notebooks, repairs identifiers and refuses additions at capacity', () => {
    const api = window.__MicrobiologyCore.resistance;
    const run = { history: [{ day: 0, sensitive: 78, resistant: 2 }, { day: 1, sensitive: 10, resistant: 2 }] };
    const notebook = api.normalizeNotebook({ records: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, evidence: { ...run, notes: 'Record ' + i } })), selectedId: 12, nextId: 13 });
    expect(notebook.records.map(item => item.id)).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
    expect(api.save(notebook, { ...run, notes: 'New evidence' })).toMatchObject({ status: 'full', notebook });
    expect(api.save(notebook, notebook.records[0].evidence).status).toBe('duplicate');
    const repaired = api.normalizeNotebook({ records: [null, {}, { id: 3, evidence: run }, { id: 3, evidence: run }, { id: Infinity, evidence: run }], selectedId: 9 });
    expect(new Set(repaired.records.map(item => item.id)).size).toBe(3);
    expect(repaired.selectedId).toBe(null);
    expect(repaired.nextId).toBeGreaterThan(Math.max(...repaired.records.map(item => item.id)));
    expect(api.normalizeNotebook(JSON.parse(JSON.stringify(notebook)))).toEqual(notebook);
    expect(api.normalizeNotebook({ records: [{ id: 1, evidence: { history: 'invalid' } }] }).records).toEqual([]);
  });

  it('exports original settings, all observed rounds, notes and undefined extinct shares', () => {
    const api = window.__MicrobiologyCore.resistance;
    const evidence = { initRes: 0, dose: 100, duration: 8, prediction: 'extinct', explanation: 'extinction', explanationSubmitted: true,
      notes: '=SUM(A1:A2), "counts"\nNot percentages alone.', history: [{ day: 0, sensitive: 80, resistant: 0 }, { day: 1, sensitive: 0, resistant: 0 }] };
    const book = { records: [{ id: 7, evidence }] };
    const text = api.exportText(book);
    expect(text).toContain('Evidence 7\nStatus: extinct');
    expect(text).toContain('Exposure strength: 100/100; planned rounds: 8; observed rounds: 1');
    expect(text).toContain('Original prediction: extinct');
    expect(text).toContain('Selected explanation: extinction (submitted)');
    expect(text).toContain('1\t0\t0\t0\tUndefined');
    expect(text).toContain(evidence.notes);
    const csv = api.exportCSV(book);
    expect(csv).toContain('"actual_initial_resistant_cells"');
    expect(csv).toContain('"7","extinct","100","8","1","0","0","extinct","extinction","true"');
    expect(csv).toContain('"\'=SUM(A1:A2), ""counts""\nNot percentages alone."');
    expect(csv).toContain('"1","0","0","0","Undefined"');
    expect(csv).toContain('snapshots may share a run');
    expect(api.evidence({ ...evidence, notes: '\u0000' + 'x'.repeat(2000) }).notes).toBe('x'.repeat(1200));
  });

  it('applies the record limit after rejecting malformed evidence so valid restored records survive', () => {
    const api = window.__MicrobiologyCore.resistance;
    const evidence = comparisonNotebook().records[1].evidence;
    const records = Array.from({ length: 8 }, (_, index) => ({ id: index + 1, evidence: { ...evidence, notes: 'Record ' + index } }));
    const restored = api.normalizeNotebook({ records: records.concat([{ id: 99, evidence: {} }, { id: 100, evidence: { history: 'damaged' } }]), selectedId: 1, nextId: 101 });
    expect(restored.records.map(record => record.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(restored).toMatchObject({ selectedId: 1, nextId: 101 });
    const withNinth = api.normalizeNotebook({ records: records.concat([{ id: 99, evidence: {} }, { id: 9, evidence }]) });
    expect(withNinth.records.map(record => record.id)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('compares the latest shared observed round and distinguishes resistant counts from rounded shares', () => {
    const api = window.__MicrobiologyCore.resistance;
    const result = api.compare(comparisonNotebook(), { aId: 4, bId: 9 });
    expect(result.records.map(record => record.evidence.day)).toEqual([3, 1]);
    expect(result.sharedRound).toBe(1);
    expect(result.counts).toEqual({ a: { sensitive: 12, resistant: 12, totalAlive: 24, sharePct: 50 }, b: { sensitive: 0, resistant: 2, totalAlive: 2, sharePct: 100 } });
    expect(result.difference).toEqual({ sensitive: -12, resistant: -10, totalAlive: -22, sharePercentagePoints: 50 });
    expect(result.changedSettings).toEqual(['dose', 'duration']);
    expect(result.records[0].evidence.finalPct).toBe(100);
    const reversed = api.compare(comparisonNotebook(), { aId: 9, bId: 4 });
    expect(reversed.difference.resistant).toBe(10);
    expect(reversed.difference.sharePercentagePoints).toBe(-50);
  });

  it('reserves retained valid IDs before repairing malformed or duplicate IDs so explicit pairs keep their evidence', () => {
    const api = window.__MicrobiologyCore.resistance, evidence = comparisonNotebook().records[1].evidence;
    const record = (id, notes) => ({ id, evidence: { ...evidence, notes } });
    const records = [record('bad', 'Malformed A'), record(1, 'Valid B'), record(9, 'Valid C'), record(1, 'Duplicate D')];
    const raw = { records, selectedId: 1, nextId: 10 }, before = JSON.stringify(raw);
    const normalized = api.normalizeNotebook(raw);
    expect(normalized.records.map(item => [item.id, item.evidence.notes])).toEqual([[2, 'Malformed A'], [1, 'Valid B'], [9, 'Valid C'], [3, 'Duplicate D']]);
    expect(normalized).toMatchObject({ selectedId: 1, nextId: 10 });
    expect(api.compare(raw, { aId: 1, bId: 9 }).records.map(item => item.evidence.notes)).toEqual(['Valid B', 'Valid C']);
    expect(api.normalizeNotebook(JSON.parse(JSON.stringify(normalized)))).toEqual(normalized);
    expect(JSON.stringify(raw)).toBe(before);
    const atCapacity = { records: [record(1, 'Discarded oldest')].concat(records, [record(5, 'E'), record(6, 'F'), record(7, 'G'), record(8, 'H'), { id: 4, evidence: {} }]), selectedId: 1 };
    const retained = api.normalizeNotebook(atCapacity);
    expect(retained.records.map(item => item.id)).toEqual([2, 1, 9, 3, 5, 6, 7, 8]);
    expect(api.compare(atCapacity, { aId: 1, bId: 9 }).records.map(item => item.evidence.notes)).toEqual(['Valid B', 'Valid C']);
    expect(retained.records.some(item => item.evidence.notes === 'Discarded oldest')).toBe(false);
  });

  it('uses observed shares at the common round and keeps extinct shares and differences undefined', () => {
    const api = window.__MicrobiologyCore.resistance;
    const book = comparisonNotebook();
    book.records[0].evidence.history = book.records[0].evidence.history.slice(0, 2).concat([{ day: 2, sensitive: 0, resistant: 0 }]);
    const beforeExtinction = api.compare(book, { aId: 4, bId: 9 });
    expect(beforeExtinction.records[0].evidence.status).toBe('extinct');
    expect(beforeExtinction.sharedRound).toBe(1);
    expect(beforeExtinction.counts.a.sharePct).toBe(50);
    book.records[1].evidence.history[1] = { day: 1, sensitive: 0, resistant: 0 };
    const extinct = api.compare(book, { aId: 4, bId: 9 });
    expect(extinct.counts.b).toEqual({ sensitive: 0, resistant: 0, totalAlive: 0, sharePct: null });
    expect(extinct.difference).toEqual({ sensitive: -12, resistant: -12, totalAlive: -24, sharePercentagePoints: null });
  });

  it('requires distinct explicit numeric IDs and never substitutes for missing or deleted snapshots', () => {
    const api = window.__MicrobiologyCore.resistance, book = comparisonNotebook();
    for (const pair of [null, [], { aId: '4', bId: 9 }, { aId: 4, bId: true }, { aId: 4, bId: Infinity }, { aId: 4, bId: 500 }, { aId: 4, bId: 4 }]) {
      expect(api.compare(book, pair)).toBe(null);
    }
    expect(api.normalizeComparison({ aId: '4', bId: 9 }, book)).toEqual({ aId: null, bId: 9 });
    book.records = book.records.filter(record => record.id !== 4);
    expect(api.normalizeComparison({ aId: 4, bId: 9 }, book)).toEqual({ aId: null, bId: 9 });
    expect(api.compare(book, { aId: 4, bId: 9 })).toBe(null);
  });

  it('keeps paired projections immutable and stable through JSON without randomness or record mutation', () => {
    const api = window.__MicrobiologyCore.resistance, book = comparisonNotebook();
    const before = JSON.stringify(book), pair = { aId: 4, bId: 9 };
    const random = vi.spyOn(Math, 'random');
    try {
      const result = api.compare(book, pair);
      expect(api.compare(JSON.parse(before), JSON.parse(JSON.stringify(pair)))).toEqual(result);
      expect(random).not.toHaveBeenCalled();
      expect(JSON.stringify(book)).toBe(before);
      for (const value of [result, result.records, result.counts, result.counts.a, result.difference, result.changedSettings, result.records[0].evidence.history[1]]) expect(Object.isFrozen(value)).toBe(true);
      book.records[0].evidence.history[1].resistant = 0;
      expect(result.counts.a.resistant).toBe(12);
      expect(result.records[0].evidence.notes).toBe('Original A');
    } finally { random.mockRestore(); }
  });

  it('does not resolve missing restored selections or comparison IDs to freshly repaired records', () => {
    const api = window.__MicrobiologyCore.resistance, book = comparisonNotebook();
    book.records[0].id = 'bad'; book.selectedId = 1;
    const pair = { aId: 1, bId: 9 }, before = JSON.stringify(book);
    const canonical = api.normalizeNotebook(book), safePair = api.normalizeComparison(pair, book);
    expect(canonical.records.map(record => record.id)).toEqual([1, 9]);
    expect(canonical.selectedId).toBe(null);
    expect(safePair).toEqual({ aId: null, bId: 9 });
    expect(api.compare(book, pair)).toBe(null);
    expect(api.exportComparisonText(book, pair)).toBe(null);
    expect(api.exportComparisonCSV(book, pair)).toBe(null);
    expect(api.compare(JSON.parse(JSON.stringify(canonical)), JSON.parse(JSON.stringify(safePair)))).toBe(null);
    expect(JSON.stringify(book)).toBe(before);
  });

  it('exports the chosen A/B snapshots and their shared round separately from endpoint evidence', () => {
    const api = window.__MicrobiologyCore.resistance, book = comparisonNotebook(), pair = { aId: 4, bId: 9 };
    book.records.push({ id: 20, evidence: { ...book.records[1].evidence, notes: 'Not in this pair' } });
    const before = JSON.stringify(book), oldText = api.exportText(book), oldCSV = api.exportCSV(book);
    const random = vi.spyOn(Math, 'random');
    try {
      const text = api.exportComparisonText(book, pair), rows = readComparisonCSV(api.exportComparisonCSV(book, pair));
      expect(text).toContain('Snapshot A: Evidence 4; saved history ends at round 3');
      expect(text).toContain('Snapshot B: Evidence 9; saved history ends at round 1');
      expect(text).toContain('Shared comparison round: 1');
      expect(text).toContain('Different saved settings: Exposure strength, Planned rounds');
      expect(text).toContain('Resistant cells\t12\t2\t-10');
      expect(text).toContain('Resistant share\t50%\t100%\t+50 percentage points');
      expect(text).toContain('Original prediction: increase');
      expect(text).toContain('Original prediction: similar');
      expect(text).toContain('My written evidence: Original A');
      expect(text).toContain('3\t0\t30\t30\t100%');
      expect(text).not.toContain('Not in this pair');
      expect(rows.map(row => row.row_kind)).toEqual(['snapshot_a', 'snapshot_b', 'difference_b_minus_a']);
      expect(rows[0]).toMatchObject({ evidence_id: '4', shared_round: '1', saved_end_round: '3', snapshot_status: 'completed', exposure_strength_0_100: '60', planned_rounds: '3', requested_initial_resistance_pct: '15', actual_initial_resistant_cells: '12', original_prediction: 'increase', shared_resistant_cells: '12', shared_resistant_share_pct_rounded: '50', saved_end_resistant_cells: '30', saved_end_resistant_share_pct_rounded: '100' });
      expect(rows[1]).toMatchObject({ evidence_id: '9', saved_end_round: '1', snapshot_status: 'in-progress', planned_rounds: '8', original_prediction: 'similar' });
      expect(rows[2]).toMatchObject({ evidence_id: '', shared_resistant_cells: '-10', shared_total_alive: '-22', shared_share_difference_percentage_points: '50', shared_resistant_share_pct_rounded: '', saved_end_round: '', saved_end_resistant_cells: '', original_prediction: '' });
      expect(rows.every(row => row.comparison_a_id === '4' && row.comparison_b_id === '9')).toBe(true);
      expect(rows[0].model_note).toContain('snapshots may share a run');
      expect(random).not.toHaveBeenCalled();
      expect(api.exportText(book)).toBe(oldText); expect(api.exportCSV(book)).toBe(oldCSV);
      expect(JSON.stringify(book)).toBe(before);
    } finally { random.mockRestore(); }
  });

  it('quotes paired CSV notes, protects formulas and retains signed numeric differences', () => {
    const api = window.__MicrobiologyCore.resistance, book = comparisonNotebook();
    book.records[0].evidence.notes = '=SUM(A1:A2), "saved"\nSecond line';
    book.records[1].evidence.notes = '  @formula\nOriginal words';
    const rows = readComparisonCSV(api.exportComparisonCSV(book, { aId: 4, bId: 9 }));
    expect(rows[0].written_evidence).toBe("'" + book.records[0].evidence.notes);
    expect(rows[1].written_evidence).toBe("'" + book.records[1].evidence.notes);
    expect(rows[2].shared_resistant_cells).toBe('-10');
    expect(rows[2].shared_share_difference_percentage_points).toBe('50');
    const reversed = readComparisonCSV(api.exportComparisonCSV(book, { aId: 9, bId: 4 }));
    expect(reversed[0].evidence_id).toBe('9');
    expect(reversed[2].shared_resistant_cells).toBe('10');
    expect(reversed[2].shared_share_difference_percentage_points).toBe('-50');
  });

  it('exports extinction as undefined without replacing an earlier shared-round share with the endpoint share', () => {
    const api = window.__MicrobiologyCore.resistance, book = comparisonNotebook(), pair = { aId: 4, bId: 9 };
    book.records[0].evidence.history = book.records[0].evidence.history.slice(0, 2).concat([{ day: 2, sensitive: 0, resistant: 0 }]);
    const earlier = readComparisonCSV(api.exportComparisonCSV(book, pair));
    expect(earlier[0]).toMatchObject({ shared_round: '1', shared_resistant_share_pct_rounded: '50', saved_end_round: '2', snapshot_status: 'extinct', saved_end_resistant_share_pct_rounded: 'Undefined' });
    expect(earlier[2].shared_share_difference_percentage_points).toBe('50');
    book.records[1].evidence.history[1] = { day: 1, sensitive: 0, resistant: 0 };
    const extinct = readComparisonCSV(api.exportComparisonCSV(book, pair));
    expect(extinct[1]).toMatchObject({ shared_total_alive: '0', shared_resistant_share_pct_rounded: 'Undefined', saved_end_resistant_share_pct_rounded: 'Undefined' });
    expect(extinct[2].shared_share_difference_percentage_points).toBe('Undefined');
    expect(api.exportComparisonText(book, pair)).toContain('Resistant share\t50%\tUndefined\tUndefined');
  });

  it('refuses paired exports for malformed, identical and deleted IDs without selecting replacement evidence', () => {
    const api = window.__MicrobiologyCore.resistance, book = comparisonNotebook();
    for (const pair of [null, [], { aId: '4', bId: 9 }, { aId: 4, bId: 4 }, { aId: 4, bId: 500 }]) {
      expect(api.exportComparisonText(book, pair)).toBe(null);
      expect(api.exportComparisonCSV(book, pair)).toBe(null);
    }
    book.records.shift();
    expect(api.exportComparisonText(book, { aId: 4, bId: 9 })).toBe(null);
    expect(api.exportComparisonCSV(book, { aId: 4, bId: 9 })).toBe(null);
  });
});

describe('Mounted resistance controls', { timeout: 20000 }, () => {
  let container;
  let root;
  let latestData;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null;
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  function mount(seed = {}, awardXP = vi.fn()) {
    const config = window.StemLab._registry.microbiology;
    function Host() {
      const [toolData, setToolData] = React.useState({ microbiology: { tab: 'resistance', ...seed } });
      latestData = toolData;
      return config.render(makeCtx({ toolData, setToolData, awardXP }));
    }
    root = ReactDOMClient.createRoot(container);
    act(() => root.render(React.createElement(Host)));
  }

  function click(text) {
    const button = [...container.querySelectorAll('button')].find(node => node.textContent.trim() === text);
    expect(button, text).toBeDefined();
    act(() => button.click());
    return button;
  }

  function range(label, value) {
    const input = container.querySelector(`input[aria-label="${label}"]`);
    expect(input, label).not.toBeNull();
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(value));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function predict(value) {
    act(() => container.querySelector(`input[name="micro-resistance-prediction"][value="${value}"]`).click());
  }

  function writeNotes(value) {
    const input = container.querySelector('#micro-resistance-notes');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return input;
  }

  function openNotebook() {
    const details = container.querySelector('.micro-resistance-saved');
    expect(details).not.toBe(null);
    if (!details.open) act(() => details.querySelector('summary').click());
    expect(details.open).toBe(true);
    return details;
  }

  function counts() {
    return [...container.querySelectorAll('[data-resistance-current-history] tbody tr')].map(row => [...row.cells].map(cell => cell.textContent));
  }

  function openComparison() {
    const details = container.querySelector('#micro-resistance-comparison');
    expect(details).not.toBe(null);
    if (!details.open) act(() => details.querySelector('summary').click());
    return details;
  }

  function compareSelect(side, value) {
    const select = container.querySelector('#micro-resistance-compare-' + side);
    act(() => { select.value = String(value); select.dispatchEvent(new Event('change', { bubbles: true })); });
    return select;
  }

  function comparisonCells(metric) {
    return [...container.querySelector(`[data-resistance-compare-row="${metric}"]`).cells].map(cell => cell.textContent);
  }

  function captureComparisonDownloads() {
    const blobs = [], files = [];
    vi.stubGlobal('Blob', class { constructor(parts, options) { this.parts = parts; this.type = options.type; } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:resistance-comparison-' + blobs.length; }), revokeObjectURL: vi.fn() });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { files.push(this.download); });
    return { blobs, files, anchorClick };
  }

  function tab(id) { act(() => container.querySelector('#micro-tab-' + id).click()); }

  it('updates the live culture when the slider changes and starts Play and Step from that culture', () => {
    mount();
    range('Initial resistance', 15);
    expect(counts()).toEqual([['0', '68', '12', '15%']]);
    predict('increase');
    click('Step round');
    expect(counts()[1]).toEqual(['1', '0', '12', '100%']);
    click('↺ Reset current run');
    predict('increase');
    click('▶ Play');
    expect(counts()).toEqual([['0', '68', '12', '15%']]);
    act(() => vi.advanceTimersByTime(600));
    expect(counts()[1]).toEqual(['1', '0', '12', '100%']);
  });

  it('ends an extinct run with an undefined percentage and an extinction explanation', () => {
    mount();
    range('Initial resistance', 0);
    range('Antibiotic exposure strength in the teaching model', 100);
    predict('extinct');
    click('Step round');
    expect(counts()[1]).toEqual(['1', '0', '0', 'Undefined']);
    expect(container.textContent).toContain('Prediction matched. The population died out.');
    expect(container.textContent).toContain('The resistant share is undefined (no survivors)');
    expect(click('Step round').disabled).toBe(true);
    act(() => container.querySelector('input[name="micro-resistance-explanation"][value="extinction"]').click());
    click('Submit explanation');
    expect(container.textContent).toContain('Explanation confirmed. No cells survived.');
  });

  it('keeps the zero-exposure control unchanged and does not claim selection increased resistance', () => {
    mount();
    range('Initial resistance', 15);
    range('Antibiotic exposure strength in the teaching model', 0);
    range('Number of exposure rounds in the teaching model', 3);
    predict('similar');
    for (let i = 0; i < 3; i++) click('Step round');
    expect(counts()[3]).toEqual(['3', '68', '12', '15%']);
    act(() => container.querySelector('input[name="micro-resistance-explanation"][value="no-selection"]').click());
    click('Submit explanation');
    expect(container.textContent).toContain('Explanation confirmed. With zero exposure');
  });

  it('preserves an in-progress culture through tab navigation and pauses until playback is requested again', () => {
    mount({ growthLab: { hypothesis: 'Preserve another investigation' } });
    range('Initial resistance', 15);
    predict('increase');
    click('▶ Play');
    act(() => vi.advanceTimersByTime(600));
    const saved = JSON.parse(JSON.stringify(latestData.microbiology.resistanceInvestigation));
    expect(saved.day).toBe(1);
    expect(saved.history[1]).toEqual({ day: 1, sensitive: 0, resistant: 12 });
    tab('home');
    act(() => vi.advanceTimersByTime(5000));
    expect(latestData.microbiology.resistanceInvestigation).toEqual(saved);
    tab('resistance');
    expect(counts()).toEqual([['0', '68', '12', '15%'], ['1', '0', '12', '100%']]);
    expect(container.querySelector('input[name="micro-resistance-prediction"][value="increase"]').checked).toBe(true);
    expect([...container.querySelectorAll('button')].some(node => node.textContent.trim() === '▶ Play')).toBe(true);
    act(() => vi.advanceTimersByTime(5000));
    expect(latestData.microbiology.resistanceInvestigation).toEqual(saved);
    expect(latestData.microbiology.growthLab.hypothesis).toBe('Preserve another investigation');
    click('▶ Play');
    act(() => vi.advanceTimersByTime(600));
    expect(latestData.microbiology.resistanceInvestigation.day).toBe(2);
  });

  it('restores a submitted explanation after JSON storage and remount without awarding the same work again', () => {
    const awardXP = vi.fn();
    mount({}, awardXP);
    range('Antibiotic exposure strength in the teaching model', 0);
    range('Number of exposure rounds in the teaching model', 3);
    predict('similar');
    for (let i = 0; i < 3; i++) click('Step round');
    act(() => container.querySelector('input[name="micro-resistance-explanation"][value="no-selection"]').click());
    click('Submit explanation');
    const saved = JSON.parse(JSON.stringify(latestData.microbiology));
    expect(saved.resistanceInvestigation).toMatchObject({ day: 3, runAwarded: true, explanationAwarded: true, explanationSubmitted: true });
    expect(awardXP.mock.calls).toEqual([[3], [2]]);
    act(() => root.unmount());
    root = null;
    mount(saved, awardXP);
    expect(container.textContent).toContain('Explanation confirmed. With zero exposure');
    expect(counts()).toHaveLength(4);
    expect(container.querySelector('input[name="micro-resistance-explanation"][value="no-selection"]').checked).toBe(true);
    expect(container.querySelector('input[name="micro-resistance-explanation"][value="no-selection"]').disabled).toBe(true);
    tab('home');
    tab('resistance');
    act(() => vi.advanceTimersByTime(5000));
    expect(awardXP.mock.calls).toEqual([[3], [2]]);
    expect(latestData.microbiology.resistanceInvestigation).toEqual(saved.resistanceInvestigation);
  });

  it('resumes valid saved observations even if a damaged snapshot lacks its original prediction', () => {
    mount({ resistanceInvestigation: { initRes: 15, duration: 3, history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 0, resistant: 12 }] } });
    expect(container.textContent).toContain('No prediction was saved for this restored run');
    expect(click('Step round').disabled).toBe(false);
    expect(latestData.microbiology.resistanceInvestigation.day).toBe(2);
  });

  it('explicitly saves a partial snapshot, pauses playback and retains evidence after reset', () => {
    mount({ growthLab: { hypothesis: 'Keep other work' } });
    expect(click('Save evidence').disabled).toBe(true);
    range('Initial resistance', 15);
    predict('increase');
    const notes = container.querySelector('#micro-resistance-notes');
    notes.focus();
    writeNotes('The resistant count stayed at 12 while its share rose.');
    expect(document.activeElement).toBe(notes);
    expect(notes.maxLength).toBe(1200);
    click('▶ Play');
    act(() => vi.advanceTimersByTime(600));
    click('Save evidence');
    const book = JSON.parse(JSON.stringify(latestData.microbiology.resistanceNotebook));
    expect(book.records).toHaveLength(1);
    expect(book.records[0]).toMatchObject({ id: 1, evidence: { status: 'in-progress', initRes: 15, dose: 60, duration: 14, day: 1, prediction: 'increase', notes: notes.value } });
    act(() => vi.advanceTimersByTime(3000));
    expect(latestData.microbiology.resistanceInvestigation.day).toBe(1);
    click('Save evidence');
    expect(latestData.microbiology.resistanceNotebook.records).toHaveLength(1);
    expect(container.textContent).toContain('This exact snapshot was already saved.');
    click('↺ Reset current run');
    expect(latestData.microbiology.resistanceInvestigation).toMatchObject({ day: 0, prediction: null, notes: '' });
    expect(latestData.microbiology.resistanceNotebook).toEqual(book);
    const saved = openNotebook().querySelector('[data-resistance-evidence="1"]');
    expect(saved.textContent).toContain('Partial run');
    expect(saved.textContent).toContain('original prediction has not been evaluated as a final outcome');
    expect(saved.querySelector('[data-resistance-prediction-review]')).toBe(null);
    expect(saved.textContent).toContain('The resistant count stayed at 12 while its share rose.');
    expect(saved.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(counts()).toHaveLength(1);
    expect(latestData.microbiology.growthLab.hypothesis).toBe('Keep other work');
  });

  it('preserves completed settings, submitted explanation and notes after JSON remount', () => {
    const awardXP = vi.fn();
    mount({}, awardXP);
    range('Antibiotic exposure strength in the teaching model', 0);
    range('Number of exposure rounds in the teaching model', 3);
    predict('similar');
    for (let i = 0; i < 3; i++) click('Step round');
    act(() => container.querySelector('input[name="micro-resistance-explanation"][value="no-selection"]').click());
    click('Submit explanation');
    writeNotes('Counts stayed at 78 sensitive and 2 resistant.');
    click('Save evidence');
    const savedState = JSON.parse(JSON.stringify(latestData.microbiology));
    expect(savedState.resistanceNotebook.records[0].evidence).toMatchObject({ status: 'completed', prediction: 'similar', explanation: 'no-selection', explanationSubmitted: true, notes: 'Counts stayed at 78 sensitive and 2 resistant.' });
    const originalAwards = awardXP.mock.calls.slice();
    act(() => root.unmount());
    root = null;
    mount(savedState, awardXP);
    const saved = openNotebook().querySelector('[data-resistance-evidence="1"]');
    expect(saved.textContent).toContain('Planned rounds completed');
    expect(saved.textContent).toContain('Zero exposure created no survival difference');
    expect(saved.textContent).toContain('Submitted');
    expect(saved.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(container.querySelector('#micro-resistance-notes').value).toBe('Counts stayed at 78 sensitive and 2 resistant.');
    expect(latestData.microbiology.resistanceNotebook).toEqual(savedState.resistanceNotebook);
    expect(awardXP.mock.calls).toEqual(originalAwards);
  });

  it('reviews older snapshots without changing the active culture or its original prediction', () => {
    mount();
    predict('increase');
    click('Step round');
    writeNotes('First snapshot');
    click('Save evidence');
    click('Step round');
    writeNotes('Second snapshot');
    click('Save evidence');
    const active = JSON.parse(JSON.stringify(latestData.microbiology.resistanceInvestigation));
    const saved = openNotebook();
    const first = [...saved.querySelectorAll('button')].find(node => node.querySelector('strong')?.textContent === 'Evidence 1');
    const randomCalls = Math.random.mock.calls.length;
    act(() => first.click());
    expect(saved.querySelector('[data-resistance-evidence="1"]').textContent).toContain('First snapshot');
    expect(latestData.microbiology.resistanceInvestigation).toEqual(active);
    expect(Math.random.mock.calls).toHaveLength(randomCalls);
    expect(container.querySelector('#micro-resistance-notes').value).toBe('Second snapshot');
    expect(container.querySelector('input[name="micro-resistance-prediction"]:checked').value).toBe('increase');
    expect(latestData.microbiology.resistanceNotebook.records.map(item => item.evidence.notes)).toEqual(['First snapshot', 'Second snapshot']);
  });

  it('blocks only saving at capacity and frees a slot without renumbering remaining records', () => {
    const evidence = { initRes: 15, history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 0, resistant: 12 }], prediction: 'increase' };
    const records = Array.from({ length: 8 }, (_, i) => ({ id: i + 3, evidence: { ...evidence, notes: 'Saved ' + i } }));
    mount({ resistanceInvestigation: evidence, resistanceNotebook: { records, selectedId: 6, nextId: 11 } });
    expect(click('Save evidence').disabled).toBe(true);
    expect(container.textContent).toContain('The notebook is full.');
    expect([...container.querySelectorAll('button')].find(node => node.textContent === '↺ Reset current run').disabled).toBe(false);
    openNotebook();
    click('Remove selected evidence');
    expect(latestData.microbiology.resistanceNotebook.records.map(item => item.id)).toEqual([3, 4, 5, 7, 8, 9, 10]);
    click('Save evidence');
    expect(latestData.microbiology.resistanceNotebook.records.map(item => item.id)).toEqual([3, 4, 5, 7, 8, 9, 10, 11]);
    click('↺ Reset current run');
    expect(latestData.microbiology.resistanceNotebook.records).toHaveLength(8);
    expect(latestData.microbiology.resistanceInvestigation.day).toBe(0);
  });

  it('announces removal and moves focus to remaining evidence without changing its stable ID or the active run', () => {
    const evidence = { dose: 0, duration: 3, initRes: 15, prediction: 'similar', notes: 'Saved observations',
      history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 68, resistant: 12 }] };
    mount({ resistanceInvestigation: evidence, resistanceNotebook: { records: [{ id: 4, evidence }, { id: 9, evidence: { ...evidence, notes: 'Other observations' } }], selectedId: 4, nextId: 12 } });
    const active = JSON.parse(JSON.stringify(latestData.microbiology.resistanceInvestigation));
    const retained = window.__MicrobiologyCore.resistance.normalizeNotebook(latestData.microbiology.resistanceNotebook).records[1];
    openNotebook();
    const remove = [...container.querySelectorAll('button')].find(node => node.textContent === 'Remove selected evidence');
    remove.focus();
    click('Remove selected evidence');
    expect(document.activeElement).toBe(container.querySelector('#micro-resistance-evidence-9'));
    expect(container.querySelector('[data-resistance-notebook-notice]').textContent).toBe('Removed evidence 4. Selected evidence 9.');
    expect(latestData.microbiology.resistanceNotebook).toEqual({ records: [retained], selectedId: 9, nextId: 12 });
    expect(latestData.microbiology.resistanceInvestigation).toEqual(active);
  });

  it('focuses the notebook heading and announces an empty notebook after the last record is removed', () => {
    const evidence = { dose: 0, duration: 3, initRes: 15, prediction: 'similar', notes: 'Current evidence remains',
      history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 68, resistant: 12 }] };
    mount({ resistanceInvestigation: evidence, resistanceNotebook: { records: [{ id: 6, evidence }], selectedId: 6, nextId: 8 } });
    const active = JSON.parse(JSON.stringify(latestData.microbiology.resistanceInvestigation));
    openNotebook();
    const remove = [...container.querySelectorAll('button')].find(node => node.textContent === 'Remove selected evidence');
    remove.focus();
    click('Remove selected evidence');
    const notice = container.querySelector('[data-resistance-notebook-notice]');
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.getAttribute('aria-live')).toBe('polite');
    expect(notice.textContent).toBe('Removed evidence 6. No saved snapshots remain. Your current run is unchanged.');
    expect(document.activeElement).toBe(container.querySelector('#micro-resistance-notebook-title'));
    expect(container.querySelector('.micro-resistance-saved')).toBe(null);
    expect(latestData.microbiology.resistanceNotebook).toEqual({ records: [], selectedId: null, nextId: 8 });
    expect(latestData.microbiology.resistanceInvestigation).toEqual(active);
    click('Save evidence');
    expect(latestData.microbiology.resistanceNotebook.records.map(item => item.id)).toEqual([8]);
  });

  it('keeps extinction undefined in the saved table and both downloadable artifacts', () => {
    mount();
    range('Initial resistance', 0);
    range('Antibiotic exposure strength in the teaching model', 100);
    predict('extinct');
    click('Step round');
    writeNotes('No cells remain.');
    click('Save evidence');
    const saved = openNotebook().querySelector('[data-resistance-evidence="1"]');
    expect(saved.textContent).toContain('Ended with no survivors');
    expect(saved.textContent).toContain('Undefined (no survivors)');
    expect([...saved.querySelectorAll('tbody tr')][1].lastElementChild.textContent).toBe('Undefined');
    expect(saved.querySelectorAll('thead th[scope="col"]')).toHaveLength(5);
    expect(saved.querySelectorAll('tbody th[scope="row"]')).toHaveLength(2);
    const blobs = [], files = [];
    vi.stubGlobal('Blob', class { constructor(parts, options) { this.parts = parts; this.type = options.type; } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:resistance-evidence'; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { files.push(this.download); });
    click('Download resistance notebook');
    click('Download resistance CSV');
    expect(files).toEqual(['micro-lab-resistance-notebook.txt', 'micro-lab-resistance-evidence.csv']);
    expect(blobs[0].parts.join('')).toContain('1\t0\t0\t0\tUndefined');
    expect(blobs[1].parts.join('')).toContain('"1","0","0","0","Undefined"');
    act(() => vi.advanceTimersByTime(1000));
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('reports a failed download while keeping saved evidence intact', () => {
    mount();
    predict('increase');
    click('Step round');
    click('Save evidence');
    const before = JSON.parse(JSON.stringify(latestData.microbiology.resistanceNotebook));
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => { throw new Error('Unavailable'); }), revokeObjectURL: vi.fn() });
    click('Download resistance notebook');
    expect(container.textContent).toContain('The download could not start. Your saved evidence is still in this notebook.');
    expect(latestData.microbiology.resistanceNotebook).toEqual(before);
  });

  it('reviews submitted choices against the saved outcome without replacing the original answers or awarding XP', () => {
    const awardXP = vi.fn();
    const evidence = { dose: 0, duration: 3, initRes: 3, prediction: 'increase', explanation: 'learned', explanationSubmitted: true,
      history: Array.from({ length: 4 }, (_, day) => ({ day, sensitive: 78, resistant: 2 })), notes: 'Original interpretation' };
    mount({ resistanceNotebook: { records: [{ id: 5, evidence }], selectedId: 5 } }, awardXP);
    const saved = openNotebook().querySelector('[data-resistance-evidence="5"]');
    expect(saved.textContent).toContain('Original prediction: Increase');
    expect(saved.textContent).toContain('Selected explanation: Individual bacteria learned resistance during the run.');
    expect(saved.querySelector('[data-resistance-prediction-review="different"]')).not.toBe(null);
    expect(saved.querySelector('[data-resistance-explanation-review="review"]').textContent).toContain('With zero exposure, neither type is killed');
    expect(awardXP).not.toHaveBeenCalled();
    expect(window.__MicrobiologyCore.resistance.normalizeNotebook(latestData.microbiology.resistanceNotebook).records[0].evidence)
      .toMatchObject({ prediction: 'increase', explanation: 'learned', explanationSubmitted: true, notes: 'Original interpretation' });
  });

  it('requires explicit comparison choices and preserves the active run, playback, notes, selection and XP', () => {
    const awardXP = vi.fn(), notebook = comparisonNotebook();
    const active = { dose: 0, duration: 3, initRes: 15, prediction: 'similar', notes: 'Current notes',
      history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 68, resistant: 12 }] };
    mount({ resistanceNotebook: notebook, resistanceInvestigation: active }, awardXP);
    const before = JSON.parse(JSON.stringify(latestData.microbiology.resistanceInvestigation));
    click('▶ Play');
    const randomCalls = Math.random.mock.calls.length;
    const region = openComparison();
    expect(region.querySelectorAll('label')).toHaveLength(2);
    expect(region.querySelector('label[for="micro-resistance-compare-a"]').textContent).toBe('Snapshot A');
    expect(region.querySelector('label[for="micro-resistance-compare-b"]').textContent).toBe('Snapshot B');
    expect(region.querySelectorAll('select')).toHaveLength(2);
    expect(container.querySelector('#micro-resistance-compare-a').value).toBe('');
    expect(container.querySelector('#micro-resistance-compare-b').value).toBe('');
    expect(region.querySelector('#micro-resistance-comparison-table')).toBe(null);
    compareSelect('a', 4);
    expect(region.querySelector('#micro-resistance-comparison-unavailable')).not.toBe(null);
    const b = container.querySelector('#micro-resistance-compare-b'); b.focus(); compareSelect('b', 9);
    expect(document.activeElement).toBe(b);
    expect(latestData.microbiology.resistanceComparison).toEqual({ aId: 4, bId: 9 });
    expect(latestData.microbiology.resistanceNotebook).toEqual(notebook);
    expect(latestData.microbiology.resistanceInvestigation).toEqual(before);
    expect(container.querySelector('#micro-resistance-notes').value).toBe('Current notes');
    expect(region.querySelector('#micro-resistance-comparison-round').textContent).toContain('Comparing round 1.');
    expect(region.textContent).toContain('ends at round 3/3');
    expect(region.textContent).toContain('ends at round 1/8');
    expect(region.textContent).toContain('Actual starting resistant cells: 12/80 (15%)');
    expect(region.querySelector('[data-resistance-comparison-settings]').textContent).toBe('Different saved settings: Exposure strength, Planned rounds.');
    expect(comparisonCells('resistant')).toEqual(['Resistant cells', '12', '2', '-10']);
    expect(comparisonCells('totalAlive')).toEqual(['Total living cells', '24', '2', '-22']);
    expect(comparisonCells('sharePct')).toEqual(['Resistant share', '50%', '100%', '+50 percentage points']);
    expect(region.querySelectorAll('thead th[scope="col"]')).toHaveLength(4);
    expect(region.querySelectorAll('tbody th[scope="row"]')).toHaveLength(4);
    expect(region.querySelector('table').closest('[role="region"]').tabIndex).toBe(0);
    expect(Math.random.mock.calls).toHaveLength(randomCalls);
    expect(awardXP).not.toHaveBeenCalled();
    expect([...container.querySelectorAll('button')].some(button => button.textContent === '⏸ Pause')).toBe(true);
    act(() => vi.advanceTimersByTime(600));
    expect(latestData.microbiology.resistanceInvestigation.day).toBe(2);
    expect(comparisonCells('resistant')).toEqual(['Resistant cells', '12', '2', '-10']);
  });

  it('restores comparison preferences through JSON independently of review selection and reset', () => {
    const notebook = comparisonNotebook(), pair = { aId: 9, bId: 4 };
    mount({ resistanceNotebook: notebook, resistanceComparison: pair });
    openComparison();
    expect(comparisonCells('resistant')).toEqual(['Resistant cells', '2', '12', '+10']);
    openNotebook(); act(() => container.querySelector('#micro-resistance-evidence-9').click());
    expect(latestData.microbiology.resistanceComparison).toEqual(pair);
    click('↺ Reset current run');
    const restored = JSON.parse(JSON.stringify(latestData.microbiology));
    act(() => root.unmount()); root = null; mount(restored);
    const region = openComparison();
    expect(container.querySelector('#micro-resistance-compare-a').value).toBe('9');
    expect(container.querySelector('#micro-resistance-compare-b').value).toBe('4');
    expect(region.querySelector('caption').textContent).toBe('Saved counts at shared round 1');
    expect(latestData.microbiology.resistanceNotebook.selectedId).toBe(9);
    expect(latestData.microbiology.resistanceNotebook.records).toEqual(window.__MicrobiologyCore.resistance.normalizeNotebook(notebook).records);
    expect(latestData.microbiology.resistanceComparison).toEqual(pair);
    expect(comparisonCells('sharePct')).toEqual(['Resistant share', '100%', '50%', '-50 percentage points']);
  });

  it('leaves same-ID and deleted-ID comparisons unavailable until distinct existing records are selected', () => {
    const notebook = comparisonNotebook();
    mount({ resistanceNotebook: notebook, resistanceComparison: { aId: 4, bId: 4 } });
    const region = openComparison();
    expect(region.querySelector('#micro-resistance-comparison-table')).toBe(null);
    expect(region.querySelector('#micro-resistance-comparison-unavailable').textContent).toContain('two different');
    compareSelect('b', 9);
    expect(region.querySelector('#micro-resistance-comparison-table')).not.toBe(null);
    openNotebook(); click('Remove selected evidence');
    expect(latestData.microbiology.resistanceNotebook.records.map(record => record.id)).toEqual([9]);
    expect(container.querySelector('#micro-resistance-compare-a').value).toBe('');
    expect(container.querySelector('#micro-resistance-compare-b').value).toBe('9');
    expect(region.querySelector('#micro-resistance-comparison-table')).toBe(null);
    expect(region.querySelector('#micro-resistance-comparison-unavailable').textContent).toContain('not replaced automatically');
    const restored = JSON.parse(JSON.stringify(latestData.microbiology));
    act(() => root.unmount()); root = null; mount(restored);
    expect(container.querySelector('#micro-resistance-compare-a').value).toBe('');
    expect(container.querySelector('#micro-resistance-compare-b').value).toBe('9');
    compareSelect('a', 9);
    expect(openComparison().querySelector('#micro-resistance-comparison-table')).toBe(null);
    expect(latestData.microbiology.resistanceNotebook.nextId).toBe(10);
  });

  it('shows undefined extinct shares and differences without changing either original saved prediction', () => {
    const notebook = comparisonNotebook();
    notebook.records[1].evidence.history[1] = { day: 1, sensitive: 0, resistant: 0 };
    notebook.records[1].evidence.prediction = 'extinct';
    mount({ resistanceNotebook: notebook, resistanceComparison: { aId: 4, bId: 9 } });
    const region = openComparison();
    expect(comparisonCells('totalAlive')).toEqual(['Total living cells', '24', '0', '-24']);
    expect(comparisonCells('sharePct')).toEqual(['Resistant share', '50%', 'Undefined', 'Undefined']);
    expect(region.textContent).toContain('Ended with no survivors');
    expect(region.textContent).toContain('Original prediction: Increase');
    expect(region.textContent).toContain('Original prediction: No survivors to compare');
    expect(region.textContent).toContain('Snapshots may come from different rounds of the same run');
    expect(latestData.microbiology.resistanceNotebook).toEqual(notebook);
    expect(region.querySelector('[data-resistance-prediction-review]')).toBe(null);
  });

  it('downloads the restored pair without changing valid notebook bytes, focus, playback, live evidence, RNG or XP', () => {
    const notebook = { ...comparisonNotebook(), extraSavedField: 'Preserve this raw field' }, pair = { aId: 4, bId: 9 }, awardXP = vi.fn();
    const active = { ...notebook.records[1].evidence, dose: 0, notes: 'Current notes are separate' };
    mount({ resistanceNotebook: notebook, resistanceComparison: pair, resistanceInvestigation: active }, awardXP);
    const restored = JSON.parse(JSON.stringify(latestData.microbiology));
    act(() => root.unmount()); root = null; mount(restored, awardXP);
    openComparison(); click('▶ Play');
    const before = JSON.stringify(latestData), randomCalls = Math.random.mock.calls.length;
    const download = captureComparisonDownloads(), api = window.__MicrobiologyCore.resistance;
    const reportButton = container.querySelector('#micro-resistance-comparison-download-text');
    expect(reportButton.getAttribute('aria-describedby')).toBe('micro-resistance-comparison-export-note');
    reportButton.focus(); click('Download comparison report');
    expect(document.activeElement).toBe(reportButton);
    const csvButton = container.querySelector('#micro-resistance-comparison-download-csv');
    csvButton.focus(); click('Download comparison CSV');
    expect(document.activeElement).toBe(csvButton);
    expect(download.files).toEqual(['micro-lab-resistance-comparison-A4-B9-round1.txt', 'micro-lab-resistance-comparison-A4-B9-round1.csv']);
    expect(download.blobs[0].type).toBe('text/plain;charset=utf-8');
    expect(download.blobs[0].parts.join('')).toBe(api.exportComparisonText(notebook, pair));
    expect(download.blobs[1].type).toBe('text/csv;charset=utf-8');
    expect(download.blobs[1].parts.join('')).toBe(api.exportComparisonCSV(notebook, pair));
    expect(container.querySelector('#micro-resistance-comparison-export-status').textContent).toBe('The comparison download has started.');
    click('Download resistance CSV');
    expect(download.files[2]).toBe('micro-lab-resistance-evidence.csv');
    expect(download.blobs[2].parts.join('')).toBe(api.exportCSV(notebook));
    expect(JSON.stringify(latestData)).toBe(before);
    expect(Math.random.mock.calls).toHaveLength(randomCalls);
    expect(awardXP).not.toHaveBeenCalled();
    expect(document.querySelector('a[download^="micro-lab-resistance-"]')).toBe(null);
    act(() => vi.advanceTimersByTime(1000));
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
    expect(latestData.microbiology.resistanceInvestigation.day).toBe(2);
    expect(latestData.microbiology.resistanceNotebook).toEqual(notebook);
  });

  it.each(['review', 'save', 'remove'])('clears missing repaired-ID preferences before a %s notebook mutation and JSON reload', action => {
    const notebook = comparisonNotebook(); notebook.records[0].id = 'bad'; notebook.selectedId = action === 'remove' ? 9 : 1;
    const active = { ...notebook.records[1].evidence, notes: 'A distinct current run' };
    mount({ resistanceNotebook: notebook, resistanceComparison: { aId: 1, bId: 9 }, resistanceInvestigation: active });
    const region = openComparison();
    expect(container.querySelector('#micro-resistance-compare-a').value).toBe('');
    expect(container.querySelector('#micro-resistance-comparison-download-text').disabled).toBe(true);
    expect(container.querySelector('#micro-resistance-comparison-download-csv').disabled).toBe(true);
    if (action === 'save') click('Save evidence');
    else { openNotebook(); if (action === 'remove') click('Remove selected evidence'); else act(() => container.querySelector('#micro-resistance-evidence-9').click()); }
    expect(latestData.microbiology.resistanceNotebook.records[0].id).toBe(1);
    expect(latestData.microbiology.resistanceComparison).toEqual({ aId: null, bId: action === 'remove' ? null : 9 });
    expect(latestData.microbiology.resistanceNotebook.selectedId).toBe(action === 'save' ? 10 : action === 'remove' ? 1 : 9);
    expect(region.querySelector('#micro-resistance-comparison-table')).toBe(null);
    const saved = JSON.parse(JSON.stringify(latestData.microbiology));
    act(() => root.unmount()); root = null; mount(saved);
    expect(openComparison().querySelector('#micro-resistance-comparison-table')).toBe(null);
    expect(container.querySelector('#micro-resistance-compare-a').value).toBe('');
    expect(container.querySelector('#micro-resistance-comparison-download-text').disabled).toBe(true);
    if (action !== 'remove') {
      const canonical = JSON.stringify(latestData.microbiology.resistanceNotebook);
      compareSelect('a', 1);
      expect(container.querySelector('#micro-resistance-comparison-download-text').disabled).toBe(false);
      expect(JSON.stringify(latestData.microbiology.resistanceNotebook)).toBe(canonical);
      expect(latestData.microbiology.resistanceComparison).toEqual({ aId: 1, bId: 9 });
    }
  });

  it('establishes repaired record identity only through an explicit choice and clears the stale review selection', () => {
    const notebook = comparisonNotebook(); notebook.records[0].id = 'bad'; notebook.selectedId = 1;
    mount({ resistanceNotebook: notebook, resistanceComparison: { aId: 1, bId: 9 } });
    openComparison();
    expect(container.querySelector('[data-resistance-evidence]')).toBe(null);
    expect(container.querySelector('#micro-resistance-compare-a').value).toBe('');
    expect(latestData.microbiology.resistanceNotebook).toEqual(notebook);
    compareSelect('a', 1);
    expect(latestData.microbiology.resistanceNotebook.selectedId).toBe(null);
    expect(latestData.microbiology.resistanceNotebook.records.map(record => record.id)).toEqual([1, 9]);
    expect(latestData.microbiology.resistanceComparison).toEqual({ aId: 1, bId: 9 });
    expect(comparisonCells('resistant')).toEqual(['Resistant cells', '12', '2', '-10']);
    const saved = JSON.parse(JSON.stringify(latestData.microbiology));
    act(() => root.unmount()); root = null; mount(saved);
    expect(container.querySelector('#micro-resistance-compare-a').value).toBe('1');
    expect(latestData.microbiology.resistanceNotebook.selectedId).toBe(null);
    expect(comparisonCells('resistant')).toEqual(['Resistant cells', '12', '2', '-10']);
  });

  it('reports paired download failures, cleans up links and URLs, and clears feedback when the pair changes', () => {
    mount({ resistanceNotebook: comparisonNotebook(), resistanceComparison: { aId: 4, bId: 9 } });
    openComparison();
    const before = JSON.stringify(latestData), randomCalls = Math.random.mock.calls.length;
    const download = captureComparisonDownloads();
    URL.createObjectURL.mockImplementationOnce(() => { throw new Error('Object URLs unavailable'); });
    const button = container.querySelector('#micro-resistance-comparison-download-csv'); button.focus();
    click('Download comparison CSV');
    expect(document.activeElement).toBe(button);
    expect(container.querySelector('#micro-resistance-comparison-export-status').textContent).toBe('The comparison could not download. Your selected snapshots and current run are unchanged.');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    download.anchorClick.mockImplementationOnce(() => { throw new Error('Download blocked'); });
    click('Download comparison report');
    expect(document.querySelector('a[download^="micro-lab-resistance-comparison-"]')).toBe(null);
    act(() => vi.advanceTimersByTime(1000));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:resistance-comparison-1');
    click('Download comparison CSV');
    expect(container.querySelector('#micro-resistance-comparison-export-status').textContent).toBe('The comparison download has started.');
    expect(JSON.stringify(latestData)).toBe(before);
    expect(Math.random.mock.calls).toHaveLength(randomCalls);
    compareSelect('a', 9);
    expect(container.querySelector('#micro-resistance-comparison-export-status').textContent).toBe('');
    expect(container.querySelector('#micro-resistance-comparison-download-csv').disabled).toBe(true);
    const calls = URL.createObjectURL.mock.calls.length;
    click('Download comparison CSV');
    expect(URL.createObjectURL.mock.calls).toHaveLength(calls);
  });
});
