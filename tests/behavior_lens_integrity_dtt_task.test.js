// Behavior Lens treatment integrity, DTT and task analysis.
//
// WHY: until 2026-09-23:
//   - Treatment integrity had no N/A: 3 of 3 steps done plus one step with no chance to
//     happen read 75%, "Below 80% Threshold" (correct: 3/3 = 100%). Blank rows sat in
//     the denominator, Save on an untouched form recorded 0%, checks of different
//     interventions were averaged together, and all of it was lost on close.
//   - DTT kept the consecutive-session count as a stored counter: raise the criterion
//     from 80% to 90% after two 85% sessions and the next 90% session read "MASTERED"
//     (only ONE session had met 90%). Mastery disabled Start, whose label promised a new
//     program, and "auto-advance" was promised but not built. Programs were lost on close.
//   - Task analysis matched mastery by step POSITION: delete step 1 and step 2 took over
//     its "✓ MAS"; sessions of other tasks counted; blank rows sat in "% independent";
//     prompt levels were never cleared, so three Saves in a row "mastered" a step.
// Expected values are worked by hand.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let TI, DTT, TA;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  TI = window.AlloModules.BehaviorLensIntegrity;
  DTT = window.AlloModules.BehaviorLensDTT;
  TA = window.AlloModules.BehaviorLensTaskAnalysis;
  if (!TI || !DTT || !TA) throw new Error('integrity / DTT / task helpers did not register');
});

describe('treatment integrity', () => {
  it('a step with no chance to happen is N/A, not a miss', () => {
    const steps = [['a', 'done'], ['b', 'done'], ['c', 'done'], ['d', 'na'], ['', null]].map(([desc, status]) => ({ desc, status }));
    expect(TI.integrityScore(steps)).toMatchObject({ steps: 4, done: 3, na: 1, opportunities: 3, pct: 100 });   // old: 3/5 or 3/4
  });
  it('the panel will not save an unmarked form, and averages one intervention at a time', () => {
    const toasts = [];
    const q = componentHarness('TreatmentIntegrityTracker', { t: () => undefined, addToast: (m, k) => toasts.push([m, k]) },
      { __durable: { integrityIntervention: 'FCT', integrityChecks: [{ date: '2026-09-20T12:00:00Z', interventionName: 'Token economy', integrity: 20 }, { date: '2026-09-21T12:00:00Z', interventionName: 'FCT', integrity: 90 }] } });
    q.all(n => n.props['aria-label'] === 'Save Integrity Check')[0].props.onClick(); q.render();
    expect(toasts.pop()).toEqual(['Describe at least one step of the plan first.', 'warning']);    // old: saved a 0% check
    expect(q.all(n => n.props['data-integrity-avg'] !== undefined)[0].props['data-integrity-avg']).toBe(90);   // old: 55, both interventions
    expect(q.text()).toContain('1 checks of other interventions are not in this average.');
    q.all(n => n.props['aria-label'] === 'Step 1 description')[0].props.onChange({ target: { value: 'Prompt the request card' } }); q.render();
    q.all(n => n.props['aria-label'] === 'Save Integrity Check')[0].props.onClick(); q.render();
    expect(toasts.pop()[0]).toBe('Mark every step Done, Not done, or N/A before saving (1 not marked).');
  });
});

describe('DTT mastery', () => {
  const s = pct => ({ pct });
  it('is worked out from the sessions at the criterion as it stands', () => {
    // Two 85% sessions, then the criterion is raised to 90%, then one 90% session.
    expect(DTT.dttMastery([s(85), s(85), s(90)], { pct: 90, sessions: 3 })).toMatchObject({ consecutive: 1, mastered: false });   // old: MASTERED
    expect(DTT.dttMastery([s(85), s(85), s(90)], { pct: 80, sessions: 3 })).toMatchObject({ consecutive: 3, mastered: true });
    expect(DTT.dttMastery([s(95), s(60), s(90)], { pct: 80, sessions: 2 })).toMatchObject({ consecutive: 1, mastered: false });
  });
  it('the panel shows progress at the current criterion and keeps sessions going after mastery', () => {
    const program = { id: 'p1', name: 'Colors', target: 'red', trials: [{ pct: 85 }, { pct: 85 }], masteryCriteria: { pct: 90, sessions: 3 } };
    const q = componentHarness('DTTDataSheet', { studentName: 'Kestrel', t: () => undefined, addToast: () => {} }, { __durable: { dttPrograms: [program] } });
    expect(q.text(q.byAttr('data-dtt-progress', 'true')[0])).toBe('Progress: 0/3 consecutive at ≥90%');       // old: 2/3 (earned at 80%)
    expect(q.text()).not.toContain('auto-advance');
    const done = componentHarness('DTTDataSheet', { studentName: 'Kestrel', t: () => undefined, addToast: () => {} }, { __durable: { dttPrograms: [{ ...program, masteryCriteria: { pct: 80, sessions: 2 } }] } });
    const start = done.all(n => n.type === 'button' && /Start/.test(done.text(n)))[0];
    expect(done.text(start)).toBe('▶ Start Maintenance Session');
    expect(start.props.disabled).toBeFalsy();                                                                  // old: disabled
    start.props.onClick(); done.render();
    expect(done.all(n => /^Record trial: /.test(n.props['aria-label'] || '')).map(n => n.props['aria-label'])).toEqual(
      ['Record trial: Correct', 'Record trial: Incorrect', 'Record trial: Prompted', 'Record trial: No Response']);
  });
});

describe('task analysis mastery', () => {
  const sess = (task, steps) => ({ taskName: task, steps });
  const water = { id: 'w', desc: 'Turn on water' }, soap = { id: 's', desc: 'Pump soap' };
  const three = [1, 2, 3].map(() => sess('Handwashing', [{ id: 'w', desc: 'Turn on water', promptLevel: 'I' }, { id: 's', desc: 'Pump soap', promptLevel: 'V' }]));
  it('belongs to the step, not its position', () => {
    expect(TA.taskStepMastered(three, 'Handwashing', water, 3)).toBe(true);
    expect(TA.taskStepMastered(three, 'Handwashing', soap, 3)).toBe(false);    // old: after deleting step 1, soap (now first) read mastered
  });
  it('counts only sessions of this task', () => {
    expect(TA.taskStepMastered(three, 'Tying shoes', water, 3)).toBe(false);
  });
  it('% independent leaves out blank rows', () => {
    expect(TA.taskIndependentPct([{ desc: 'a', promptLevel: 'I' }, { desc: 'b', promptLevel: 'I' }, { desc: '', promptLevel: 'FP' }])).toBe(100);   // old: 67
  });
  it('the panel clears prompt levels after Save, so repeated Saves are not new data', () => {
    const toasts = [];
    const q = componentHarness('TaskAnalysisTool', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: m => toasts.push(m) },
      { __durable: { taskAnalysisName: 'Handwashing', taskAnalysisSteps: [{ id: 'w', desc: 'Turn on water', promptLevel: 'I' }], taskAnalysisSessions: [] } });
    const save = () => { q.all(n => n.type === 'button' && /Save Session/.test(q.text(n)))[0].props.onClick(); q.render(); };
    save();
    expect(toasts.pop()).toBe('Session saved! 100% independent');
    save();
    expect(toasts.pop()).toBe('Record a prompt level for every step before saving (1 not recorded).');   // old: saved again
    expect(q.all(n => n.props['aria-label'] === 'Session history (1)')).toHaveLength(1);
  });
});
