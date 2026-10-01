// Behavior Lens cross-student comparison.
//
// WHY: until 2026-09-23 the trend sparkline took `sessions.slice(-10)` of a NEWEST-first
// list, so older sessions drew on the right and a falling count drew as rising, and it
// read `abcCount || count`, which Session Data Tracker sessions do not have, so those
// students drew a flat zero. The behavior chart knew only each student's top 5
// behaviors: a behavior that was one student's 6th most frequent showed as 0 (blank)
// for them. Raw counts across students observed for different lengths of time were
// compared with no caveat.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let C;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  C = window.AlloModules.BehaviorLensComparison;
  if (!C) throw new Error('BehaviorLensComparison did not register');
});

// Stored newest first, like sessionHistory.
const tracker = (day, count) => ({ date: `2026-09-${String(day).padStart(2, '0')}T14:00:00Z`, targets: [{ name: 'Out of seat', type: 'frequency', count }] });

describe('comparisonSparkValues', () => {
  it('draws oldest to newest and counts tracker sessions', () => {
    const newestFirst = [tracker(5, 1), tracker(4, 2), tracker(3, 4), tracker(2, 6)];
    expect(C.comparisonSparkValues(newestFirst)).toEqual([6, 4, 2, 1]);           // old: [1,2,4,6] read left to right as rising; tracker sessions read 0
  });
  it('leaves out sessions that are not counts', () => {
    expect(C.comparisonSessionValue({ date: 'x', behavior: 'Tantrum', measurementType: 'duration', count: 240 })).toBe(null);
    expect(C.comparisonSessionValue({ targets: [{ type: 'frequency', count: 3 }, { type: 'duration', count: 2 }] })).toBe(3);
  });
});

describe('comparisonBehaviorMatrix', () => {
  it('uses the full counts of each student, so a 6th-ranked behavior is not 0', () => {
    const a = { student: 'A', topBehaviors: [['Hit', 9], ['Yell', 8], ['Spit', 7], ['Run', 6], ['Kick', 5]], behaviorCounts: [['Hit', 9], ['Yell', 8], ['Spit', 7], ['Run', 6], ['Kick', 5], ['Elopement', 3]] };
    const b = { student: 'B', topBehaviors: [['Elopement', 2]], behaviorCounts: [['Elopement', 2]] };
    const m = C.comparisonBehaviorMatrix([a, b]);
    expect(m.matrix.A.Elopement).toBe(3);                                            // old: undefined, shown as 0
    expect(m.partial).toBe(false);
  });
});

describe('the comparison panel', () => {
  it('shows real counts including zeros, with a caveat about exposure', () => {
    const ws = (student, counts, sessions) => ({ student, abcCount: counts.reduce((x, [, c]) => x + c, 0), sessionCount: 1, avgIntensity: null, topBehaviors: counts.slice(0, 5), behaviorCounts: counts, sessionHistory: sessions, lastEntry: null });
    const q = componentHarness('ComparisonDashboard', { comparisonWorkspaces: [
      ws('A', [['Hit', 9], ['Yell', 8], ['Spit', 7], ['Run', 6], ['Kick', 5], ['Elopement', 3]], [tracker(5, 1), tracker(4, 2), tracker(3, 4)]),
      ws('B', [['Elopement', 2]], []),
    ], setComparisonWorkspaces: () => {}, compareFileInputRef: { current: null }, handleLoadComparisonFiles: () => {}, callGemini: null, t: () => undefined, addToast: () => {}, switchToStudent: () => {} });
    const count = key => { const n = q.all(x => x.props['data-compare-count'] === key)[0]; return n && q.text(n); };
    expect(count('A|Elopement')).toBe('3');
    expect(count('B|Hit')).toBe('0');                                               // old: blank
    expect(q.text(q.byAttr('data-compare-caveat', 'true')[0])).toContain('not directly comparable by count');
    // The sparkline is a nested component: render it with the props the panel gave it.
    const spark = q.all(x => typeof x.type === 'function' && x.props.sessions && x.props.sessions.length === 3)[0];
    expect(spark.type(spark.props).props['data-spark']).toBe('4,2,1');
  });
});
