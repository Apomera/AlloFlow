// Behavior Lens Preference Assessment Wizard, Free Operant mode.
//
// WHY: until 2026-09-23 the run screen referenced two handlers that were never
// defined (stopFoSession, toggleFoTimer). `onClick: stopFoSession` is evaluated while
// rendering, so choosing Free Operant and pressing Start threw a ReferenceError.
// Behind that, "Total Session Time" only advanced while an item was engaged, so each
// item's percentage was a share of ENGAGED time (always summing to 100%), not of the
// session (Roane, Vollmer, Ringdahl & Marcus, 1998). Times were also counted in 1 s
// ticks, which stall when a tablet locks. Expected values are worked by hand.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let Pref;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  Pref = window.AlloModules && window.AlloModules.BehaviorLensPreference;
  if (!Pref) throw new Error('BehaviorLensPreference did not register');
});
afterEach(() => vi.restoreAllMocks());

describe('scoreFreeOperant', () => {
  it('each item is a share of the whole session, not of engaged time', () => {
    const r = Pref.scoreFreeOperant(['iPad', 'Bubbles', 'Slinky'], { iPad: 60000, Bubbles: 30000, Slinky: 0 }, 300000);
    expect(r.map(x => [x.item, x.pct])).toEqual([['iPad', 20], ['Bubbles', 10], ['Slinky', 0]]);
  });
  it('no session time gives 0%, never NaN', () => {
    expect(Pref.scoreFreeOperant(['A'], { A: 0 }, 0)[0].pct).toBe(0);
  });
});

describe('the Free Operant run and results screens', () => {
  it('runs, times engagement from the clock, and reports shares of the session', () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const q = componentHarness('PreferenceAssessmentWizard', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} },
      { scoreFreeOperant: Pref.scoreFreeOperant });
    q.byAttr('data-pref-mode', 'free')[0].props.onClick(); q.render();
    ['iPad', 'Bubbles', 'Slinky'].forEach((name, i) => {
      q.all(n => n.props['aria-label'] === 'Preference item ' + (i + 1))[0].props.onChange({ target: { value: name } });
      q.render();
    });
    q.button('Start Assessment').props.onClick();
    expect(() => q.render(), 'the run screen threw').not.toThrow();

    now += 10_000; q.byAttr('data-fo-item', 'iPad')[0].props.onClick(); q.render();
    expect(q.byAttr('data-fo-item', 'iPad')[0].props['aria-pressed']).toBe('true');
    now += 60_000; q.byAttr('data-fo-item', 'Bubbles')[0].props.onClick(); q.render();
    now += 30_000; q.render();
    expect(q.text(q.byAttr('data-fo-session', 'true')[0])).toBe('1:40');
    q.button('End Session').props.onClick(); q.render();

    const text = q.text();
    expect(text).toContain('1:00 (60% of session)');
    expect(text).toContain('0:30 (30% of session)');
    expect(text).toContain('0:00 (0% of session)');
  });

  it('protocol and MSWO buttons are named by their visible text', () => {
    const q = componentHarness('PreferenceAssessmentWizard', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} },
      { scoreFreeOperant: Pref.scoreFreeOperant });
    for (const b of q.all(n => n.props['data-pref-mode'])) expect(b.props['aria-label']).toBeUndefined();
    q.byAttr('data-pref-mode', 'mswo')[0].props.onClick(); q.render();
    ['A', 'B', 'C'].forEach((name, i) => { q.all(n => n.props['aria-label'] === 'Preference item ' + (i + 1))[0].props.onChange({ target: { value: name } }); q.render(); });
    q.button('Start Assessment').props.onClick(); q.render();
    const items = q.all(n => n.props['data-mswo-item']);
    expect(items.map(n => q.text(n))).toEqual(['A', 'B', 'C']);
    for (const b of items) expect(b.props['aria-label']).toBeUndefined();
  });
});
