// Behavior Lens Effect Size Calculator autofill.
//
// WHY: until 2026-09-23 "Auto-fill from Graph" compared the FIRST phase with the LAST,
// so an A-B-A withdrawal design compared baseline with the return to baseline, and it
// ignored the graph's goal direction. "Auto-fill from Phase-Tagged ABC Data" counted
// every UNTAGGED entry as baseline and every other tag ('maintenance',
// 'return_baseline', and a CSV round trip's 'Baseline') as intervention. Expected
// values are worked by hand.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let ES, runtime;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  runtime = behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  ES = window.AlloModules.BehaviorLensEffectSize;
  if (!ES) throw new Error('BehaviorLensEffectSize did not register');
});

const phase = (label, values, condition) => ({ label, condition, data: values.map((value, i) => ({ session: i + 1, value })) });
const ABA = [phase('Baseline', [5, 6, 7], 'A'), phase('Intervention', [1, 2], 'B'), phase('Withdrawal', [6, 6], 'A')];

describe('effectSizeContrasts', () => {
  it('an A-B-A design offers each neighbouring pair and defaults to baseline then treatment', () => {
    const r = ES.effectSizeContrasts(ABA);
    expect(r.contrasts.map(c => [c.key, c.label, c.baseline, c.intervention])).toEqual([
      ['0>1', 'Baseline → Intervention', [5, 6, 7], [1, 2]],
      ['1>2', 'Intervention → Withdrawal', [1, 2], [6, 6]]]);
    expect(r.defaultKey).toBe('0>1');   // old: Baseline against Withdrawal
  });
  it('a phase with no data yet is skipped, and a saved graph without conditions reads them from labels', () => {
    const r = ES.effectSizeContrasts([phase('Baseline', [4, 4]), phase('Intervention', []), phase('Intervention 2', [1, 1])]);
    expect(r.contrasts.map(c => c.label)).toEqual(['Baseline → Intervention 2']);
  });
  it('two treatment phases in a row are not a baseline-intervention contrast', () => {
    const r = ES.effectSizeContrasts([phase('Baseline', [5, 5], 'A'), phase('Intervention', [3, 3], 'B'), phase('Intervention 2', [1, 1], 'B')]);
    expect(r.contrasts.map(c => c.label)).toEqual(['Baseline → Intervention']);
  });
  it('fewer than two phases with data: nothing to compare', () => {
    expect(ES.effectSizeContrasts([phase('All Data', [1, 2, 3])])).toEqual({ contrasts: [], defaultKey: null });
  });
});

describe('effectSizeFromPhaseTags', () => {
  const e = (min, phaseTag, intensity) => ({ occurredAt: `2026-09-10T14:${String(min).padStart(2, '0')}:00Z`, phase: phaseTag, intensity });
  it('baseline against intervention only, ignoring case, with the rest counted', () => {
    const entries = [e(9, 'intervention', 1), e(1, 'baseline', 4), e(3, 'Baseline', 3), e(2, 'baseline', 5), e(8, 'intervention', 2),
      e(4, 'maintenance', 1), e(5, 'return_baseline', 5), e(6, '', 5), e(7, null, 5), e(10, 'intervention', null)];
    expect(ES.effectSizeFromPhaseTags(entries, runtime.normalizeIntensity)).toEqual({
      baseline: [4, 5, 3], intervention: [2, 1], baselineEntries: 3, interventionEntries: 3, untagged: 2, otherPhases: 2, unrated: 1 });
  });
});

describe('the Effect Size panel', () => {
  const graphExport = { phaseAnalysis: ABA, behaviorName: 'Hitting', goalDirection: 'decrease' };
  const inputs = q => q.all(n => n.type === 'input' && /^eg /.test(n.props['aria-label'] || '')).map(n => n.props.value);
  it('fills the chosen contrast and names it', () => {
    const toasts = [];
    const q = componentHarness('EffectSizeCalculator', { sessionHistory: [], designPhases: [], graphExport, onResultsChange: () => {}, setActivePanel: () => {}, abcEntries: [], t: () => undefined, addToast: m => toasts.push(m) });
    const button = q.byAttr('data-es-contrast', '0>1')[0];
    expect(q.text(button)).toBe('📊 Auto-fill from Graph: "Hitting", Baseline → Intervention');
    button.props.onClick(); q.render();
    expect(inputs(q)).toEqual(['5, 6, 7', '1, 2']);
    expect(toasts.pop()).toBe('Auto-filled Baseline → Intervention: 3 and 2 points from "Hitting".');
    q.all(n => n.type === 'select')[0].props.onChange({ target: { value: '1>2' } }); q.render();
    q.byAttr('data-es-contrast', '1>2')[0].props.onClick(); q.render();
    expect(inputs(q)).toEqual(['1, 2', '6, 6']);
  });
  it('takes the goal direction the graph was set to', () => {
    const q = componentHarness('EffectSizeCalculator', { sessionHistory: [], designPhases: [], graphExport: { ...graphExport, goalDirection: 'increase' }, onResultsChange: () => {}, setActivePanel: () => {}, abcEntries: [], t: () => undefined, addToast: () => {} });
    const checked = () => q.all(n => n.props.role === 'radio' && n.props['aria-checked'] === 'true').map(n => q.text(n));
    expect(checked()).toEqual(['📈 Increase behavior']);
  });
  it('the phase-tag button and toast count what was used and what was left out', () => {
    const toasts = [];
    const entries = ['baseline', 'baseline', 'intervention', 'intervention', 'maintenance', ''].map((tag, i) => ({ occurredAt: `2026-09-10T14:0${i}:00Z`, phase: tag, intensity: [4, 5, 2, 1, 1, 3][i] }));
    const q = componentHarness('EffectSizeCalculator', { sessionHistory: [], designPhases: [], graphExport: null, onResultsChange: () => {}, setActivePanel: () => {}, abcEntries: entries, t: () => undefined, addToast: m => toasts.push(m) });
    const button = q.all(n => n.type === 'button' && /Phase-Tagged/.test(q.text(n)))[0];
    expect(q.text(button)).toBe('🏷️ Auto-fill from Phase-Tagged ABC Data (2 baseline, 2 intervention)');   // old: (3A + 3B)
    button.props.onClick(); q.render();
    expect(inputs(q)).toEqual(['4, 5', '2, 1']);
    expect(toasts.pop()).toBe('Auto-filled 2 baseline and 2 intervention intensity ratings. Left out: 1 untagged, 1 in other phases.');
  });
});

describe('the ABA graph', () => {
  it('publishes its goal direction for the calculator', () => {
    let exported = null;
    const history = [1, 2, 3, 4].map(n => ({ id: 's' + n, date: `2026-09-0${n}T12:00:00Z`, behavior: 'Asking for help', count: n }));
    const graph = componentHarness('ABAGraphEngine', { sessionHistory: history, phases: [], t: () => undefined, onExportData: v => { exported = v; } }, { __durable: { abaGraphGoalDirection: 'increase' } });
    graph.render(true); graph.render(true);
    expect(exported.goalDirection).toBe('increase');
  });
});
