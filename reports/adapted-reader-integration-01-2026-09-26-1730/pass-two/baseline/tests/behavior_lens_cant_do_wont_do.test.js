// Behavior Lens Can't Do / Won't Do: a conclusion needs the probes it compares.
//
// WHY: until 2026-09-23 an untested condition counted as 0%. Testing only "with
// support" at 50% concluded "Likely Skill (Acquisition) Deficit" against a baseline
// and a motivation probe that were never run. Improvement with BOTH single levers read
// "Inconclusive" if the combined probe was skipped, and successes above attempts gave
// percentages over 100. Expected results are worked from the decision rules.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let D;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  D = window.AlloModules.BehaviorLensCantDoWontDo;
  if (!D) throw new Error('BehaviorLensCantDoWontDo did not register');
});

const probe = (success, attempts) => ({ success: String(success), attempts: String(attempts), notes: '' });
const blank = () => ({ success: '', attempts: '', notes: '' });
const probes = (over) => Object.assign({ baseline: blank(), withSupport: blank(), withMotivation: blank(), withBoth: blank() }, over);

describe('diagnosis', () => {
  it('only the support probe run: baseline needed, not "skill deficit" (was cantdo)', () => {
    expect(D.diagnose(probes({ withSupport: probe(5, 10) })).type).toBe('needs-baseline');
  });
  it('baseline and support but no motivation probe: more probes needed', () => {
    const r = D.diagnose(probes({ baseline: probe(2, 10), withSupport: probe(6, 10) }));
    expect(r.type).toBe('needs-probes');
    expect(r.desc).toContain('with motivation probe');
  });
  it('support helps and motivation does not: likely skill deficit', () => {
    expect(D.diagnose(probes({ baseline: probe(2, 10), withSupport: probe(6, 10), withMotivation: probe(25, 100) })).type).toBe('cantdo');
  });
  it('both single levers help, combined probe skipped: mixed (was Inconclusive)', () => {
    expect(D.diagnose(probes({ baseline: probe(2, 10), withSupport: probe(6, 10), withMotivation: probe(6, 10) })).type).toBe('mixed');
  });
  it('successes above attempts are rejected', () => {
    expect(D.diagnose(probes({ baseline: probe(12, 10), withSupport: probe(6, 10), withMotivation: probe(2, 10) })).type).toBe('invalid');
  });
  it('adequate at baseline is decided by baseline alone', () => {
    expect(D.diagnose(probes({ baseline: probe(17, 20) })).type).toBe('adequate');
  });
});

describe('the panel', () => {
  it('says "not tested" rather than 0% for a condition that was not run', () => {
    const q = componentHarness('CantDoWontDo', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} });
    const set = (label, value) => { q.all(n => n.props['aria-label'] === label)[0].props.onChange({ target: { value } }); q.render(); };
    set('Probe successes for withSupport', '5'); set('Probe attempts for withSupport', '10');
    const chart = q.all(n => n.type === 'svg' && String(n.props['aria-label'] || '').startsWith('Probe results'))[0];
    expect(chart.props['aria-label']).toBe('Probe results. Baseline not tested; with support 50%; with motivation not tested; with both not tested.');
    expect(q.text()).toContain('Baseline probe needed');
    expect(q.text()).not.toContain('Likely Skill (Acquisition) Deficit');
  });
});
