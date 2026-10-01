// Behavior Lens ABA graph: phase membership, the x axis, and the effect sizes it
// prints, plus how latency and duration records are graphed and exported.
//
// WHY (fixed 2026-09-23):
//   - Choosing a design before there was one session per phase set EVERY phase to
//     start at session 1; the graph's phase filter read "next start - 1 = 0" as
//     Infinity, so every phase held all the data and baseline equalled intervention.
//   - The x axis spanned the number of points, but points sit at their session number
//     across ALL behaviors: sessions 1,3,5,7,9 on a 5-wide axis put session 9 at twice
//     the plot width, off the graph.
//   - Graph PND counted change in EITHER direction and PEM was "above the baseline
//     median" whatever the goal, so a behavior that got worse under a reduction goal
//     read as an effect (Scruggs, Mastropieri & Casto 1987; Ma 2006).
//   - Latency Recorder records carried no measurement type, so the graph plotted the
//     number of trials as "Frequency"; the AlloSheet export sent duration sessions as
//     "rate 0 per minute" and latency seconds as a per-minute rate.
// Expected values are worked by hand from the definitions.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensInternals } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let G, internals;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  G = window.AlloModules && window.AlloModules.BehaviorLensGraphMath;
  if (!G) throw new Error('BehaviorLensGraphMath did not register');
  internals = behaviorLensInternals();
});

const session = (n, behavior, count, extra = {}) => Object.assign({ id: 's' + n + behavior, date: `2026-09-${String(n).padStart(2, '0')}T12:00:00Z`, behavior, count }, extra);

describe('phase starts and membership', () => {
  it('later phases wait until there is a session for each (all used to start at 1)', () => {
    expect(G.defaultPhaseStarts(0, 2)).toEqual([1, null]);
    expect(G.defaultPhaseStarts(1, 4)).toEqual([1, null, null, null]);
    expect(G.defaultPhaseStarts(8, 2)).toEqual([1, 5]);
  });
  it('an unstarted phase holds no data and never duplicates another phase', () => {
    const data = [1, 2, 3, 4].map(n => ({ session: n, value: n }));
    const [a, b] = G.abaPhaseMembership(data, [{ startSession: 1 }, { startSession: null }]);
    expect(a.data.map(d => d.session)).toEqual([1, 2, 3, 4]);
    expect(b.data).toEqual([]);
    const [x, y] = G.abaPhaseMembership(data, [{ startSession: 1 }, { startSession: 1 }]);
    expect(x.data.length + y.data.length).toBe(4);
  });
  it('alternating-treatment conditions keep their own letters (all were "B")', () => {
    expect(['Condition A', 'Condition B', 'Condition C', 'Baseline (A1)', 'Intervention (B1)', 'Withdrawal (A)'].map(G.phaseCondition))
      .toEqual(['A', 'B', 'C', 'A', 'B', 'A']);
  });
  it('a design chosen before any data, then graphed, keeps baseline and intervention apart', () => {
    let phases = null;
    const manager = componentHarness('SingleCaseDesignManager', { sessionHistory: [], callGemini: null, t: () => undefined, addToast: () => {}, onPhasesChange: p => { phases = p; }, onDesignChange: () => {} });
    manager.all(n => n.type === 'button' && manager.text(n).includes('AB Design'))[0].props.onClick();
    expect(phases.map(p => p.startSession)).toEqual([1, null]);
    let exported;
    const graph = componentHarness('ABAGraphEngine', { sessionHistory: [4, 3, 2, 1].map(n => session(n, 'Calling out', 10 - n)), phases, t: () => undefined, onExportData: v => { exported = v; } });
    graph.render(true); graph.render(true);
    expect(exported.phaseAnalysis.map(pa => pa.data.length)).toEqual([4, 0]);
  });
});

describe('the x axis', () => {
  it('spans the highest session number shown', () => {
    expect(G.abaGraphSessionSpan([1, 3, 5, 7, 9].map(n => ({ session: n })))).toBe(9);
    expect(G.abaGraphSessionSpan([{ session: 1 }])).toBe(5);
  });
  it('every plotted point of a filtered behavior stays inside the plot', () => {
    const history = [];
    for (let n = 1; n <= 10; n += 1) history.push(session(n, n % 2 ? 'Calling out' : 'Leaving seat', n));
    const graph = componentHarness('ABAGraphEngine', { sessionHistory: history.reverse(), phases: [], t: () => undefined, onExportData: () => {} });
    graph.render(true); graph.render(true);
    const plot = graph.all(n => n.type === 'svg' && n.props.id === 'aba-graph-svg')[0];
    expect(plot, 'main graph svg').toBeTruthy();
    // Data markers only: the legend sits in a translated group with local coordinates.
    const circles = []; const walk = node => { if (!node || typeof node !== 'object' || node.props.transform) return; if (node.type === 'circle') circles.push(node); node.children.forEach(walk); };
    walk(plot);
    const xs = circles.map(n => Number(n.props.cx)).filter(Number.isFinite);
    expect(xs.length).toBeGreaterThanOrEqual(5);
    // W 700, padL 60, padR 30: the plot runs from x = 60 to x = 670.
    for (const x of xs) { expect(x).toBeGreaterThanOrEqual(60 - 0.5); expect(x).toBeLessThanOrEqual(670 + 0.5); }
  });
});

describe('graph effect sizes follow the goal', () => {
  const base = [10, 12, 8, 11], inter = [4, 9, 13, 2];
  it('decrease goal: PND counts points below the LOWEST baseline point only (old two-sided: 75%)', () => {
    const es = G.abaGraphEffectSizes(base, inter, 'decrease');
    expect(es.pnd).toBe(50);                // 4 and 2 are below 8; 13 is WORSE, not an effect
    expect(es.baselineMedian).toBe(10.5);   // even n: mean of 10 and 11 (old: upper-middle 11)
    expect(es.pem).toBe(75);                // 4, 9, 2 below 10.5 (old "above median": 25%)
  });
  it('increase goal: the same data read the other way', () => {
    const es = G.abaGraphEffectSizes(base, inter, 'increase');
    expect(es.pnd).toBe(25);                // only 13 is above 12
    expect(es.pem).toBe(25);                // only 13 is above 10.5
  });
  it('points equal to the baseline median count half (Ma, 2006)', () => {
    expect(G.abaGraphEffectSizes([2, 4, 6], [4, 4], 'decrease').pem).toBe(50);
  });
  it('the graph panel shows direction-aware numbers and lets the goal be changed', () => {
    const history = [1, 2, 3, 4].map(n => session(n, 'Hitting', base[n - 1])).concat([5, 6, 7, 8].map(n => session(n, 'Hitting', inter[n - 5])));
    const graph = componentHarness('ABAGraphEngine', { sessionHistory: history, phases: [{ label: 'Baseline', startSession: 1 }, { label: 'Intervention', startSession: 5 }], t: () => undefined, onExportData: () => {} });
    graph.render(true); graph.render(true);
    const read = key => graph.text(graph.byAttr('data-es', key)[0]);
    expect(read('pnd')).toBe('PND: 50%');
    graph.all(n => n.type === 'button' && graph.text(n) === 'Goal: increase')[0].props.onClick(); graph.render();
    expect(read('pnd')).toBe('PND: 25%');
  });
});

describe('latency and duration records', () => {
  it('Latency Recorder sessions graph their average latency, not the number of trials', () => {
    let exported;
    const legacy = session(1, 'Starting work', 5, { rate: 3.2, phase: 'Latency', source: 'latency-recorder' });
    const graph = componentHarness('ABAGraphEngine', { sessionHistory: [legacy], phases: [], t: () => undefined, onExportData: v => { exported = v; } });
    graph.render(true); graph.render(true);
    expect(exported.measurementType).toBe('latency');
    expect(exported.dataSeries.map(p => p.value)).toEqual([3.2]);
  });
  it('AlloSheet rows honour the record\'s own measurement type', () => {
    const rows = internals('blAlloSheetSessionMeasurementRows')([
      session(1, 'Tantrum', 90, { rate: 0, value: 90, unit: 'seconds', measurementType: 'duration', phase: 'Observation', source: 'observation-duration' }),
      session(2, 'Starting work', 4.5, { rate: 4.5, value: 4.5, unit: 'seconds', measurementType: 'latency', phase: 'Observation', source: 'observation-latency' }),
    ], false, '', false);
    const byBehavior = Object.fromEntries(rows.map(r => [r.values.behavior, r.values]));
    expect(byBehavior.Tantrum).toMatchObject({ measurement_type: 'duration', measurement_value: 90, measurement_unit: 'seconds', total_duration_seconds: 90, rate_per_minute: null });
    expect(byBehavior['Starting work']).toMatchObject({ measurement_type: 'latency', measurement_value: 4.5, measurement_unit: 'seconds', rate_per_minute: null });
  });
});

describe('Session Data Tracker percentage target', () => {
  it('shows "No trials yet" instead of 0/0 = 100%', () => {
    const src = require('node:fs').readFileSync('behavior_lens_module.js', 'utf8');
    expect(src).not.toContain('tgt.total ? Math.round(tgt.count / tgt.total * 100) : 100}%');
    expect(src).toContain("tt('behavior_lens.tracker.no_trials_yet', 'No trials yet')");
  });
});
