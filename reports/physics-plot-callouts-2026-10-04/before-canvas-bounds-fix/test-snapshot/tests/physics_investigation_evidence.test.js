import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let physics;
const iso = '2026-09-27T18:00:00.000Z';
const run = (n, extra = {}) => ({ n, angle: 45, vel: 25, grav: 9.8, mass: 1, launchHeight: 0, drag: false, range: 60, maxH: 15, time: 3.6, modelVersion: 'projectile-v2', ...extra });
const draft = (selectedRunIds = [10, 11]) => ({ title: 'Changing speed', question: 'How does launch speed affect range?', prediction: 'Twice the speed should travel four times as far.', observation: 'The second range was four times the first.', claim: 'The measurements support a squared relationship.', activityId: 'speed', selectedRunIds });
const evidence = () => [run(10), run(11, { vel: 50, range: 240, maxH: 60, time: 7.2 })];
const save = (id = 'notebook-1', rows = evidence(), input = draft(rows.map(r => r.n))) => physics.createInvestigation(input, rows, id, iso);

beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  physics = window.StemLab._physics;
  window.StemLab._registry.physics.render({
    React: { createElement: (type, props, ...children) => ({ type, props, children }) },
    icons: {}, toolData: { physics: {} }, setToolData() {}, gradeLevel: '5th Grade',
    t: (_key, fallback) => fallback, props: {}, toolSnapshots: [],
  });
});

describe('investigation evidence snapshots', () => {
  it('captures original measured values and immutable copies', () => {
    const rows = evidence();
    const input = draft();
    const saved = save('notebook-1', rows, input);
    expect(saved).toMatchObject({ id: 'notebook-1', createdAt: iso, title: input.title, runs: rows });
    expect(saved).not.toHaveProperty('selectedRunIds');
    rows[0].range = 999;
    input.question = 'Changed later';
    expect(saved.runs[0].range).toBe(60);
    expect(saved.question).toBe('How does launch speed affect range?');
    expect(Object.isFrozen(saved)).toBe(true);
    expect(Object.isFrozen(saved.runs)).toBe(true);
    expect(Object.isFrozen(saved.runs[0])).toBe(true);
    expect(() => { saved.runs[0].range = 2; }).toThrow();
  });

  it('preserves selected order and requires two distinct valid completed runs', () => {
    expect(save('reverse', evidence(), draft([11, 10])).runs.map(r => r.n)).toEqual([11, 10]);
    expect(save('duplicate', evidence(), draft([10, 10]))).toBeNull();
    expect(save('missing', evidence(), draft([10, 999]))).toBeNull();
    expect(save('invalid', [run(10), run(11, { time: 0 })])).toBeNull();
    expect(save('invalid', [run(10), run(11, { mass: undefined })])).toBeNull();
    expect(save('invalid', [run(10), run(11, { drag: 'yes' })])).toBeNull();
  });

  it('caps selection and text without filling absent observations', () => {
    const rows = Array.from({ length: 12 }, (_, i) => run(i + 1));
    const normalized = physics.normalizeInvestigationDraft({ title: 'a'.repeat(200), question: 'b'.repeat(900), prediction: 'c'.repeat(2100), observation: {}, claim: null, activityId: 'd'.repeat(100), selectedRunIds: [1, 1, ...rows.map(r => r.n), 99, '2'] }, rows);
    expect(normalized.title).toHaveLength(160);
    expect(normalized.question).toHaveLength(800);
    expect(normalized.prediction).toHaveLength(2000);
    expect(normalized.activityId).toHaveLength(80);
    expect(normalized.observation).toBe('');
    expect(normalized.claim).toBe('');
    expect(normalized.selectedRunIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it.each([null, '', {}, 'x'.repeat(97), 0, -1, NaN])('rejects an invalid notebook identifier: %j', id => {
    expect(save(id)).toBeNull();
  });

  it('requires an ISO timestamp and keeps valid IDs unchanged', () => {
    expect(physics.createInvestigation(draft(), evidence(), 'x', 'not a date')).toBeNull();
    expect(physics.createInvestigation(draft(), evidence(), 'x', 'September 27, 2026')).toBeNull();
    expect(save(42).id).toBe(42);
    expect(save('__proto__').id).toBe('__proto__');
  });
});

describe('saved notebook recovery', () => {
  it('survives serialization and clearing the current log, preserving the run counter', () => {
    const archived = JSON.parse(JSON.stringify(save()));
    const state = physics.normalizeState({ investigations: [archived], runLog: [], runCount: 0, investigationDraft: draft(), selectedInvestigationId: 'notebook-1', investigationOpen: true });
    expect(state.investigations).toEqual([archived]);
    expect(state.investigations[0].runs.map(r => r.n)).toEqual([10, 11]);
    expect(state.investigationDraft.selectedRunIds).toEqual([]);
    expect(state.runCount).toBe(11);
    expect(state.selectedInvestigationId).toBe('notebook-1');
    expect(state.investigationOpen).toBe(true);
  });

  it('drops malformed nested rows, preserves usable notebooks, and deduplicates IDs', () => {
    const first = { ...save(), runs: [...evidence(), { range: 'oops' }, null] };
    const duplicate = { ...save(), title: 'Must not overwrite the first' };
    const broken = { ...save('broken'), runs: [run(1)] };
    const recovered = physics.normalizeInvestigations([null, first, duplicate, broken, save('second')]);
    expect(recovered.map(n => n.id)).toEqual(['notebook-1', 'second']);
    expect(recovered[0].title).toBe('Changing speed');
    expect(recovered[0].runs).toHaveLength(2);
    expect(physics.normalizeInvestigations({})).toEqual([]);
    expect(physics.normalizeState({ selectedInvestigationId: 'missing' }).selectedInvestigationId).toBeNull();
  });

  it('limits restored archives to twelve complete notebooks', () => {
    const recovered = physics.normalizeInvestigations(Array.from({ length: 15 }, (_, i) => save('saved-' + i)));
    expect(recovered).toHaveLength(12);
    expect(recovered[0].id).toBe('saved-3');
    expect(recovered[11].id).toBe('saved-14');
  });

  it('reopens numeric saved IDs selected through a string-valued dropdown', () => {
    const state = physics.normalizeState({ investigations: [save(42)], selectedInvestigationId: '42' });
    expect(state.selectedInvestigationId).toBe(42);
    expect(state.investigations[0].id).toBe(42);
  });

  it('rejects invalid comparison snapshots and preserves captured model parameters', () => {
    const pair = { parameters: { angle: 45, velocity: 25, gravity: 9.8, mass: 2, launchHeight: 0 }, vacuum: { range: 63, maxH: 15, time: 3.6 }, drag: { range: 59, maxH: 14, time: 3.5 } };
    expect(physics.normalizeState({ mass: 9, gravity: 3.7, modelComparison: pair }).modelComparison).toEqual(pair);
    for (const bad of [{ ...pair, drag: null }, { ...pair, vacuum: { range: 63 } }, { ...pair, parameters: { ...pair.parameters, mass: 0 } }, { ...pair, drag: { ...pair.drag, time: Infinity } }]) {
      expect(physics.normalizeState({ modelComparison: bad }).modelComparison).toBeNull();
    }
  });
});

describe('comparison and reports', () => {
  it('compares measured changes, absolute differences, percentages and ratios', () => {
    const comparison = physics.compareRuns(...evidence());
    expect(comparison).toMatchObject({ fromRunId: 10, toRunId: 11, changes: [{ key: 'vel', before: 25, after: 50, unit: 'm/s' }], modelCompatible: true, modelWarning: false, fairTest: true });
    expect(comparison.measurements.range).toEqual({ before: 60, after: 240, delta: 180, percentChange: 300, ratio: 4, unit: 'm' });
    expect(comparison.measurements.maxH.delta).toBe(45);
    expect(comparison.measurements.time).toMatchObject({ delta: 3.6, ratio: 2, unit: 's' });
  });

  it('keeps mass changes visible without drag and identifies confounded comparisons', () => {
    expect(physics.compareRuns(run(1), run(2, { mass: 2 })).changes).toEqual([{ key: 'mass', before: 1, after: 2, unit: 'kg' }]);
    const confounded = physics.compareRuns(run(1), run(2, { vel: 50, drag: true }));
    expect(confounded.fairTest).toBe(false);
    expect(confounded.changes.map(c => c.key)).toEqual(['vel', 'drag']);
    expect(physics.compareRuns(run(1), { range: 5 })).toBeNull();
  });

  it.each([undefined, '', '   ', 'projectile-v1'])('flags absent or different numerical models (%j) without altering recorded differences', version => {
    const comparison = physics.compareRuns(run(1, { modelVersion: version }), run(2, { vel: 50, range: 240 }));
    expect(comparison).toMatchObject({ modelCompatible: false, modelWarning: true, fairTest: false });
    expect(comparison.changes.map(change => change.key)).toEqual(['vel']);
    expect(comparison.measurements.range).toMatchObject({ before: 60, after: 240, delta: 180, ratio: 4 });
    const saved = save('versions', [run(1, { modelVersion: version }), run(2, { vel: 50, range: 240 })]);
    expect(physics.formatInvestigationReport(saved)).toContain('Measured differences may reflect the model update');
  });

  it('treats two unversioned observations as unknown and keeps matching-version claims limited to changed settings', () => {
    expect(physics.compareRuns(run(1, { modelVersion: undefined }), run(2, { modelVersion: undefined }))).toMatchObject({ modelCompatible: false, modelWarning: true, fairTest: false });
    expect(physics.compareRuns(run(1), run(2))).toMatchObject({ modelCompatible: true, modelWarning: false, fairTest: false });
    expect(physics.compareRuns(run(1), run(2, { vel: 50, grav: 3.7 }))).toMatchObject({ modelCompatible: true, modelWarning: false, fairTest: false });
    expect(physics.formatInvestigationReport(save('unknown-models', [run(1, { modelVersion: undefined }), run(2, { modelVersion: undefined })]))).not.toContain('none; repeat trial');
    expect(physics.formatInvestigationReport(save())).not.toContain('Measured differences may reflect the model update');
  });

  it('reports zero baselines without NaN or Infinity', () => {
    const rows = [run(1, { range: 0, maxH: 0 }), run(2)];
    const comparison = physics.compareRuns(...rows);
    expect(comparison.measurements.range).toMatchObject({ delta: 60, ratio: null, percentChange: null });
    const report = physics.formatInvestigationReport(save('zeros', rows));
    expect(report).toContain('percent change unavailable; ratio unavailable');
    expect(report).not.toMatch(/NaN|Infinity/);
  });

  it('exports IDs, units, recorded values, model assumptions and reasoning', () => {
    const report = physics.formatInvestigationReport(save('report', [run(10), run(11, { drag: true, range: 54, maxH: 14, time: 3.4 })]));
    expect(report).toContain('Investigation ID: report');
    expect(report).toContain('Run 10');
    expect(report).toContain('Run 11');
    expect(report).toContain('Launch speed: 25 m/s; Gravity: 9.8 m/s²; Mass: 1 kg');
    expect(report).toContain('Range: 54.000 m; Maximum height: 14.000 m; Flight time: 3.400 s');
    expect(report).toContain('ground level');
    expect(report).toContain('Drag off: only gravity acts');
    expect(report).toContain('Drag on: force opposes velocity');
    expect(report).toContain('k = 0.004 kg/m');
    expect(report).toContain('Model version: projectile-v2');
    expect(report).toContain(draft().claim);
    expect(physics.formatInvestigationReport({})).toBeNull();
  });

  it('accepts the application translator for every report label and explanation', () => {
    const translator = vi.fn((key, fallback) => key === 'stem.physics.report_evidence' ? 'Recorded observations translated' : fallback);
    const report = physics.formatInvestigationReport(save(), translator);
    expect(report).toContain('## Recorded observations translated');
    expect(translator.mock.calls.every(([key]) => key.startsWith('stem.physics.'))).toBe(true);
    expect(physics.formatInvestigationReport(save(), () => { throw new Error('unavailable'); })).toContain('Recorded evidence');
  });
});
