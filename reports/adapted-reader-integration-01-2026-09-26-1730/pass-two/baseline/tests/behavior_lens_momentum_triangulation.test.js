// Behavior Lens behavior momentum planner and data triangulation.
//
// WHY: until 2026-09-23:
//   - The momentum planner kept its request bank, sequences and attempt log in plain
//     component state (lost on close), showed a red "0%" success rate with no attempts,
//     counted "Partial" as a failure without saying so, and declared "Momentum is
//     working!" with nothing to compare against.
//   - Triangulation sent each observation as `count=${s.data?.count || 'N/A'}`: a
//     measured ZERO read "N/A", and interval and duration sessions (no data.count) read
//     "N/A" too. It sent the first five stored sessions, not the latest, and counted
//     the AI analysis (worked out from the ABC data) as a third independent source.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let TR;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  TR = window.AlloModules.BehaviorLensTriangulation;
  if (!TR) throw new Error('BehaviorLensTriangulation did not register');
});

describe('the momentum planner', () => {
  const mount = attempts => componentHarness('BehaviorMomentumPlanner', { studentName: 'Kestrel', abcEntries: [], callGemini: null, t: () => undefined, addToast: () => {} },
    { __durable: { momentumAttempts: attempts, momentumSequences: [], momentumHighPBank: [{ id: 1, request: 'Touch your nose' }] } });
  const openLog = q => { q.all(n => n.type === 'button' && /Log|Track/.test(q.text(n)) && n.props['aria-pressed'] !== undefined)[0].props.onClick(); q.render(); };
  it('no attempts is no rate, not a red 0%', () => {
    const q = mount([]); openLog(q);
    expect(q.all(n => n.props['data-momentum-rate'] !== undefined)[0].props['data-momentum-rate']).toBe('none');
  });
  it('partial attempts are shown, and a high rate is not called proof', () => {
    const at = outcome => ({ id: Math.random(), outcome, timestamp: '2026-09-22T14:00:00Z' });
    const q = mount([at('success'), at('success'), at('success'), at('success'), at('partial')]); openLog(q);
    expect(q.all(n => n.props['data-momentum-rate'] !== undefined)[0].props['data-momentum-rate']).toBe(80);
    expect(q.text()).toContain('1 partial, not counted as worked');
    expect(q.text()).not.toContain('Momentum is working');
    expect(q.text()).toContain('compare with how often the same request is followed without it');
    q.all(n => n.type === 'button' && /Setup/.test(q.text(n)) && n.props['aria-pressed'] !== undefined)[0].props.onClick(); q.render();
    expect(q.text()).toContain('Touch your nose');                       // the bank was kept with the workspace
  });
});

describe('triangulation', () => {
  it('a measured zero is 0, and interval and duration sessions say what was measured', () => {
    expect(TR.observationSessionLine({ timestamp: '2026-09-22T14:00:00Z', method: 'frequency', duration: 600, data: { counters: [{ label: 'Hit', count: 0 }] } }))
      .toBe('2026-09-22: frequency count, 0 occurrences over 10:00');                          // old: count=N/A
    expect(TR.observationSessionLine({ timestamp: '2026-09-22T14:00:00Z', method: 'interval', duration: 300, data: { occurredCount: 3, completedCount: 20 } }))
      .toBe('2026-09-22: interval recording, 3 of 20 intervals with the behavior over 5:00');
    expect(TR.observationSessionLine({ timestamp: '2026-09-22T14:00:00Z', method: 'duration', data: { totalDuration: 95 } }))
      .toBe('2026-09-22: duration, 95 s in total');
  });
  it('sends the latest five sessions, and does not count the AI analysis as a source', async () => {
    let sent = '';
    const sessions = [1, 2, 3, 4, 5, 6, 7].map(d => ({ id: 's' + d, timestamp: `2026-09-0${d}T14:00:00Z`, method: 'frequency', duration: 60, data: { counters: [{ label: 'Hit', count: d }] } }));
    const q = componentHarness('TriangulationCheck', { abcEntries: [{ antecedent: 'A', behavior: 'Hit', consequence: 'C', occurredAt: '2026-09-07T14:00:00Z' }], observationSessions: sessions, aiAnalysis: { hypothesizedFunction: 'Escape', summary: 's' }, studentName: 'Kestrel',
      callGemini: async p => { sent = p; return '{"confidence":"moderate","summary":"x"}'; }, t: () => undefined, addToast: () => {} });
    expect(q.text()).toContain('2 of 2 independent data sources available');                    // old: 3/3
    await q.all(n => n.type === 'button' && /Analyze Data Convergence/.test(q.text(n)))[0].props.onClick();
    expect(sent).toContain('2026-09-07: frequency count, 7 occurrences');
    expect(sent).toContain('2026-09-03: frequency count, 3 occurrences');
    expect(sent).not.toContain('2026-09-01: frequency');                                         // old: the first five stored
    expect(sent).toContain('NOT an independent source');
  });
});
