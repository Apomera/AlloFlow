// Behavior Lens Cumulative Record.
//
// WHY: until 2026-09-23 the record reversed the stored history (assuming newest first,
// which an import is not), added every session that did not measure the behavior as a
// ZERO-response session (so two behaviors tracked on alternate days each showed a flat
// step every other session), defaulted to the first stored session's first target (so
// bridged frequency records graphed nothing), and added duration and latency bridge
// records whose `count` is SECONDS. Phase slopes ran from each phase's first point, so
// the first session's responses were left out: [5,5,5 | 20,0,0] read 0/session for the
// intervention. Manual "-3" pulled the curve down. Expected values are worked by hand.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let CR;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  CR = window.AlloModules.BehaviorLensCumulative;
  if (!CR) throw new Error('BehaviorLensCumulative did not register');
});

const day = (d) => `2026-09-${String(d).padStart(2, '0')}T14:00:00.000Z`;
// A SessionDataTracker session: nested targets.
const tracked = (d, targets) => ({ id: 's' + d, date: day(d), targets: targets.map(([name, count, type = 'frequency']) => ({ name, count, type })) });
// A bridged observation record: flat.
const flat = (d, behavior, count, extra = {}) => ({ id: 'f' + d, date: day(d), behavior, count, measurementType: 'frequency', ...extra });

describe('cumulativeRecordPoints', () => {
  it('orders by date, whatever order the history is stored in', () => {
    const oldestFirst = [tracked(1, [['Out of seat', 1]]), tracked(2, [['Out of seat', 2]]), tracked(3, [['Out of seat', 4]])];
    const expected = [{ session: 1, count: 1, cumulative: 1 }, { session: 2, count: 2, cumulative: 3 }, { session: 3, count: 4, cumulative: 7 }];
    expect(CR.cumulativeRecordPoints(oldestFirst, 'Out of seat').points).toEqual(expected);
    expect(CR.cumulativeRecordPoints(oldestFirst.slice().reverse(), 'Out of seat').points).toEqual(expected);
  });
  it('a session that did not measure the behavior is left out, not graphed as zero', () => {
    const history = [tracked(1, [['Out of seat', 3]]), tracked(2, [['Call out', 9]]), tracked(3, [['Out of seat', 3]])];
    const r = CR.cumulativeRecordPoints(history, 'Out of seat');
    expect(r.points.map(p => p.cumulative)).toEqual([3, 6]);  // old: [3, 3, 6], a flat step that never happened
    expect(r.skipped).toBe(1);
  });
  it('a measured zero stays a zero', () => {
    const r = CR.cumulativeRecordPoints([tracked(1, [['Out of seat', 3]]), tracked(2, [['Out of seat', 0]])], 'Out of seat');
    expect(r.points.map(p => p.count)).toEqual([0 + 3, 0]);
  });
  it('with no name typed, graphs the earliest behavior, including bridged flat records', () => {
    const history = [flat(3, 'Hitting', 2), flat(1, 'Hitting', 5), flat(2, 'Hitting', 1)];
    const r = CR.cumulativeRecordPoints(history, '');
    expect(r.behavior).toBe('Hitting');   // old: '' (flat records have no targets), so nothing graphed
    expect(r.points.map(p => p.cumulative)).toEqual([5, 6, 8]);
  });
  it('matches the typed name ignoring case and spaces', () => {
    expect(CR.cumulativeRecordPoints([tracked(1, [['Out of seat', 2]])], '  out OF seat ').points).toHaveLength(1);
  });
  it('duration and latency bridge records are seconds, not responses', () => {
    const history = [flat(1, 'Tantrum', 3), flat(2, 'Tantrum', 240, { measurementType: 'duration', unit: 'seconds' }), flat(3, 'Tantrum', 12.5, { measurementType: 'latency', unit: 'seconds' })];
    const r = CR.cumulativeRecordPoints(history, 'Tantrum');
    expect(r.points.map(p => p.cumulative)).toEqual([3]);  // old: 3, 243, 255.5 "responses"
    expect(r.skipped).toBe(2);
  });
});

describe('cumulativePhaseSlopes', () => {
  const pts = (counts) => { let c = 0; return counts.map((n, i) => ({ session: i + 1, count: n, cumulative: (c += n) })); };
  it('rate in a phase includes the phase\'s first session', () => {
    const s = CR.cumulativePhaseSlopes(pts([5, 5, 5, 20, 0, 0]), [{ session: 4, label: 'Intervention' }]);
    expect(s.map(x => x.label)).toEqual(['Baseline', 'Intervention']);
    expect(s[0].slope).toBeCloseTo(5, 10);        // 15 / 3 (old: (15 - 5) / 2 = 5, right by luck)
    expect(s[1].slope).toBeCloseTo(20 / 3, 10);   // (35 - 15) / 3 (old: (35 - 35) / 2 = 0)
  });
  it('a one-session phase still has a rate', () => {
    const s = CR.cumulativePhaseSlopes(pts([2, 2, 9]), [{ session: 3, label: 'Probe' }]);
    expect(s.map(x => [x.label, x.slope])).toEqual([['Baseline', 2], ['Probe', 9]]);
  });
  it('the drawn slope line ends on the phase\'s last point', () => {
    const [b] = CR.cumulativePhaseSlopes(pts([1, 3, 2]), []);
    expect(b).toMatchObject({ startSession: 1, endSession: 3, endCum: 6, slope: 2, startCum: 2 });
  });
});

describe('parseManualCounts', () => {
  it('keeps whole numbers of 0 or more only', () => {
    expect(CR.parseManualCounts('3, 5, -3, 2.5, x, 0, ')).toEqual([3, 5, 0]);
  });
});

describe('the Cumulative Record panel', () => {
  it('says which behavior it graphs and how many sessions it left out', () => {
    const history = [tracked(1, [['Out of seat', 3]]), tracked(2, [['Call out', 9]]), tracked(3, [['Out of seat', 1]])];
    const q = componentHarness('CumulativeRecord', { sessionHistory: history, t: () => undefined, addToast: () => {} });
    const scope = q.byAttr('data-cumrec-scope', 'true')[0];
    expect(q.text(scope)).toBe('Graphing Out of seat: 2 sessions that counted it. 1 other sessions did not count this behavior and are not in the record.');
    expect(q.all(n => n.type === 'svg')[0].props['aria-label']).toBe('Cumulative record for Out of seat. session 1, count 3, cumulative 3; session 2, count 1, cumulative 4.');
  });
  it('labels each phase rate with its phase', () => {
    const history = [1, 2, 3, 4].map((d, i) => tracked(d, [['Out of seat', [4, 4, 1, 1][i]]]));
    const q = componentHarness('CumulativeRecord', { sessionHistory: history, t: () => undefined, addToast: () => {} });
    q.all(n => n.props['aria-expanded'] !== undefined && /Add Phase Line/.test(q.text(n)))[0].props.onClick(); q.render();
    q.all(n => n.props['aria-label'] === 'eg 4')[0].props.onChange({ target: { value: '3' } }); q.render();
    q.all(n => n.props['aria-label'] === 'Add')[0].props.onClick(); q.render();
    expect(q.text(q.byAttr('data-cumrec-slopes', 'true')[0])).toBe('Responses per session by phase: Baseline 4.0, Intervention 1.0');
  });
  it('tells the user when manual values were left out', () => {
    const q = componentHarness('CumulativeRecord', { sessionHistory: [], t: () => undefined, addToast: () => {} });
    q.all(n => n.type === 'input' && n.props.type === 'checkbox')[0].props.onChange(); q.render();
    q.all(n => n.props['aria-label'] === 'Counts per session 3, 5, 2, 8, 4')[0].props.onChange({ target: { value: '3, -2, 4' } }); q.render();
    expect(q.text(q.byAttr('data-cumrec-rejected', 'true')[0])).toBe('1 values left out: counts must be whole numbers of 0 or more.');
    expect(q.all(n => n.type === 'svg')[0].props['aria-label']).toBe('Cumulative record. session 1, count 3, cumulative 3; session 2, count 4, cumulative 7.');
  });
});
