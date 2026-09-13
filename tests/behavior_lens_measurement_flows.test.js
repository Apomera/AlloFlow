import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';

const source = readFileSync('behavior_lens_module.js', 'utf8');
new Function(readFileSync('behavior_lens_workspace_module.js', 'utf8'))();
const runtime = window.AlloModules.BehaviorLensWorkspace;
const t = () => undefined;
let nextId = 0;

// Exercise the actual component callbacks with controlled hooks. Memo/effect
// dependencies are retained, allowing the graph export feedback path to be checked.
function componentHarness(name, props) {
  const start = source.indexOf('    const ' + name + ' =');
  const end = source.indexOf('\n    };', start) + '\n    };'.length;
  const slots = []; let cursor = 0; const effects = new Map(); let tree;
  const equal = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  const useState = initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
    if (!slots[index].setter) slots[index].setter = value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; };
    return [slots[index].value, slots[index].setter];
  };
  const useMemo = (factory, deps) => {
    const index = cursor++;
    if (!slots[index] || !equal(slots[index].deps, deps)) slots[index] = { value: factory(), deps };
    return slots[index].value;
  };
  const useEffect = (effect, deps) => {
    const index = cursor++;
    if (!slots[index] || !equal(slots[index].deps, deps)) effects.set(index, effect);
    slots[index] = { deps };
  };
  const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false) });
  const env = {
    h, useState, useMemo, useEffect,
    useCallback: (callback, deps) => useMemo(() => callback, deps),
    useRef: initial => useState(() => ({ current: initial }))[0],
    useDurableToolState: (key, initial) => useState(initial),
    tt: (key, fallback) => fallback,
    getBehaviorLensWorkspaceRuntime: () => runtime,
    uid: () => 'test-' + (++nextId),
    X: 'svg', Save: 'svg', fmtDuration: String,
    ABA_GRAPH_COLORS: ['#6366f1'], JABA_GRAPH_COLORS: ['#000']
  };
  const component = new Function(...Object.keys(env), source.slice(start, end) + '\nreturn ' + name)(...Object.values(env));
  const render = (runEffects = false) => { cursor = 0; tree = component(props); if (runEffects) { const pending = [...effects.values()]; effects.clear(); pending.forEach(effect => effect()); } return tree; };
  const all = (predicate, node = tree, result = []) => { if (node && typeof node === 'object') { if (predicate(node)) result.push(node); node.children.forEach(child => all(predicate, child, result)); } return result; };
  const text = node => node && typeof node === 'object' ? node.children.map(text).join('') : String(node ?? '');
  const label = value => { const node = all(node => node.props['aria-label'] === value)[0]; expect(node, value).toBeTruthy(); return node; };
  const button = value => { const node = all(node => node.type === 'button' && text(node).includes(value))[0]; expect(node, value).toBeTruthy(); return node; };
  render();
  return { render, all, text, label, button, props };
}

afterEach(() => vi.restoreAllMocks());

describe('Behavior Lens measurement flows', () => {
  it('plots saved sessions chronologically and keeps phase membership after a backdated insertion', () => {
    let exported;
    const sessions = [3, 2, 1].map(day => ({ id: 's' + day, date: `2026-09-0${day}T12:00:00Z`, behavior: 'Calling out', count: 12 - day * 3 }));
    const props = { t, sessionHistory: sessions, phases: [{ label: 'Baseline', startSession: 1 }, { label: 'Intervention', startSession: 3 }], onExportData: value => exported = value };
    const q = componentHarness('ABAGraphEngine', props); q.render(true); q.render(true);
    expect(exported.dataSeries.map(point => point.value)).toEqual([9, 6, 3]);
    expect(exported.phaseAnalysis[1].data.map(point => point.sessionId)).toEqual(['s3']);
    props.sessionHistory = [{ id: 'backdated', date: '2026-08-31T12:00:00Z', behavior: 'Calling out', count: 20 }, ...sessions];
    q.render(true); q.render(true);
    expect(exported.phaseAnalysis[1].data.map(point => point.sessionId)).toEqual(['s3']);
    expect(exported.phaseAnalysis[0].data.map(point => point.sessionId)).toEqual(['s1', 's2']);
  });

  it('does not repeatedly republish graph data when the parent rerenders unchanged props', () => {
    const onExportData = vi.fn();
    const q = componentHarness('ABAGraphEngine', { t, phases: [], sessionHistory: [{ id: 'a', date: '2026-09-01', behavior: 'Task', count: 2 }], onExportData });
    q.render(true); const count = onExportData.mock.calls.length;
    q.render(true); q.render(true);
    expect(onExportData).toHaveBeenCalledTimes(count);
  });

  it('imports documented two-column CSV values and rejects malformed rows without replacing data', () => {
    let exported; const addToast = vi.fn();
    const q = componentHarness('ABAGraphEngine', { t, phases: [], sessionHistory: [], onExportData: value => exported = value, addToast });
    q.button('Manual Entry').props.onClick(); q.render();
    q.label('Toggle show csv import').props.onClick(); q.render();
    q.label('Session data CSV input').props.onChange({ target: { value: '1,12\n2,8\n3,4' } }); q.render();
    q.label('Import Data').props.onClick(); q.render(true);
    expect(exported.dataSeries.map(point => point.value)).toEqual([12, 8, 4]);
    q.label('Toggle show csv import').props.onClick(); q.render();
    q.label('Session data CSV input').props.onChange({ target: { value: '1,6\n2,broken' } }); q.render();
    q.label('Import Data').props.onClick(); q.render(true);
    expect(exported.dataSeries.map(point => point.value)).toEqual([12, 8, 4]);
    expect(addToast).toHaveBeenLastCalledWith(expect.stringContaining('row 2'), 'warning');
  });

  it('plots percentages with their denominator and separates incompatible measurements', () => {
    let exported;
    const q = componentHarness('ABAGraphEngine', { t, phases: [], sessionHistory: [
      { id: 'p', date: '2026-09-01', targets: [{ name: 'Task', type: 'percentage', count: 3, total: 4 }] },
      { id: 'f', date: '2026-09-02', targets: [{ name: 'Task', type: 'frequency', count: 7 }] }
    ], onExportData: value => exported = value });
    q.render(true);
    expect(exported.dataSeries.map(point => point.value)).toEqual([75]);
    expect(exported.unit).toBe('%');
    q.label('Graph measurement').props.onChange({ target: { value: 'frequency' } }); q.render(true);
    expect(exported.dataSeries.map(point => point.value)).toEqual([7]);
    expect(exported.unit).toBe('count');
  });

  it('uses bridged interval percentages and duration/latency units', () => {
    for (const [measurementType, unit, value] of [['interval', '%', 50], ['duration', 'seconds', 30], ['latency', 'seconds', 4]]) {
      let exported;
      const q = componentHarness('ABAGraphEngine', { t, phases: [], sessionHistory: [{ id: 'a', date: '2026-09-01', behavior: 'Task', count: 2, rate: 50, value, measurementType, unit }], onExportData: data => exported = data });
      q.render(true); expect(exported.dataSeries[0].value).toBe(value); expect(exported.unit).toBe(unit);
    }
  });

  it('does not turn an unobserved percentage target into a zero-percent measurement', () => {
    let exported;
    const q = componentHarness('ABAGraphEngine', { t, phases: [], sessionHistory: [{ id: 'p', date: '2026-09-01', targets: [{ name: 'Task', type: 'percentage', count: 0, total: 0 }] }], onExportData: data => exported = data });
    q.render(true); expect(exported.dataSeries).toEqual([]);
  });

  it('keeps target edits independent after add/remove/add', () => {
    const q = componentHarness('SessionDataTracker', { t, abcEntries: [] });
    q.label('+ Add').props.onClick(); q.render(); q.label('+ Add').props.onClick(); q.render();
    q.all(node => node.props['aria-label'] === 'Remove target')[1].props.onClick(); q.render();
    q.label('+ Add').props.onClick(); q.render();
    q.all(node => node.props['aria-label'] === 'Target behavior name')[2].props.onChange({ target: { value: 'Only final target' } }); q.render();
    expect(q.all(node => node.props['aria-label'] === 'Target behavior name').map(node => node.props.value)).toEqual(['', '', 'Only final target']);
  });

  it('finalizes open duration episodes at the actual end time and resets the next session', () => {
    let now = 100000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    let saved; const q = componentHarness('SessionDataTracker', { t, abcEntries: [], onSaveSession: data => saved = data });
    q.label('Target behavior name').props.onChange({ target: { value: 'Task' } }); q.render();
    q.label('Data collection type for Task').props.onChange({ target: { value: 'duration' } }); q.render();
    q.button('Start Session').props.onClick(); q.render(); q.label('Toggle Duration').props.onClick(); q.render();
    now += 5500; q.label('End Session & Save').props.onClick(); q.render();
    expect(saved.targets[0].durations).toEqual([5.5]); expect(saved.targets[0].count).toBe(1); expect(saved.durationSec).toBe(5);
    now += 10000; q.button('Start Session').props.onClick(); q.render();
    expect(q.text(q.label('Toggle Duration'))).toContain('Start');
  });

  it('saves timed zero-event observations and retains both zero and nonzero bridge counters', () => {
    const start = source.indexOf('        const handleSaveObsSession = (sessionData) => {');
    const end = source.indexOf('\n        };', start) + '\n        };'.length;
    let history = []; let observations = [];
    const save = new Function('setObservationSessions', 'setSessionHistory', 'getBehaviorLensWorkspaceRuntime', 'uid', source.slice(start, end) + '\nreturn handleSaveObsSession;')(
      update => observations = update(observations), update => history = update(history), () => runtime, () => 'test-obs');
    save({ id: 'obs', timestamp: '2026-09-01T12:23:45Z', method: 'frequency', duration: 60, data: { counters: [{ label: 'A', count: 2 }, { label: 'B', count: 0 }] } });
    expect(history.map(record => record.count)).toEqual([2, 0]); expect(observations).toHaveLength(1);
    expect(history.every(record => record.observationSessionId === 'obs')).toBe(true);
    expect(history[0].date).toBe('2026-09-01T12:23:45.000Z');
    // The save guard must be based on both elapsed observation time and events.
    expect(source).not.toContain('if (totalCount === 0) return;');
    expect(source).toContain('if (saveElapsed <= 0 && totalCount === 0)');
  });

  it('extends the aim line to the goal date, preserves zero goals and uses canonical local dates', () => {
    const q = componentHarness('ProgressMonitorDashboard', { t, abcEntries: [{ timestamp: '2026-09-02T01:00:00Z', localDate: '2026-09-01' }, { timestamp: '2026-09-02T12:00:00Z', localDate: '2026-09-02' }] });
    q.label('Goal count per day').props.onChange({ target: { value: '0' } }); q.render();
    const beforeX = q.all(node => node.type === 'circle')[1].props.cx;
    q.label('Goal target date').props.onChange({ target: { value: '2026-09-10' } }); q.render();
    expect(q.all(node => node.type === 'line' && node.props.stroke === '#22c55e')).toHaveLength(1);
    expect(q.all(node => node.type === 'circle')[1].props.cx).toBeLessThan(beforeX);
    expect(q.all(node => node.type === 'svg')[0].props['aria-label']).toContain('2026-09-01: 1');
    q.label('Goal count per day').props.onChange({ target: { value: '' } }); q.render();
    expect(q.all(node => node.type === 'line' && node.props.stroke === '#22c55e')).toHaveLength(0);
  });

  it('excludes unrated intensity values from effect-size autofill', () => {
    const entries = ['baseline', 'intervention'].flatMap(phase => [null, phase === 'baseline' ? 4 : 2, phase === 'baseline' ? 5 : 1].map((intensity, index) => ({ id: phase + index, phase, intensity, timestamp: `2026-09-0${index + 1}` })));
    const q = componentHarness('EffectSizeCalculator', { t, abcEntries: entries });
    q.button('Auto-fill from Phase-Tagged').props.onClick(); q.render();
    expect(q.label('eg 12, 15, 14, 13, 16').props.value).toBe('4, 5');
    expect(q.label('eg 8, 6, 5, 4, 3').props.value).toBe('2, 1');
  });
});
