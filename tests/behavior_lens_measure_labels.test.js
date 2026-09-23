// Behavior Lens numbers that are right only if their DEFINITION is right.
//
// WHY (fixed 2026-09-23):
//   - Latency Recorder goal: no-response trials were dropped from the denominator,
//     so [2 s, NR, NR, NR] against a 3 s goal showed "1/1 trials met (100%)"; saving
//     all-no-response trials stored an average latency of 0 s.
//   - Token Board variable ratio drew from floor(0.5p)..floor(1.5p), which averages
//     p - 0.5 for odd p (VR-5 averaged 4.5). A variable schedule's mean is its value.
//   - Conditional Probability called 0.96 vs 0.80 (risk ratio 1.2) "a strong
//     association" while its own legend beside it calls under 1.5 weak.
// Expected values are worked by hand from the definitions.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let S, C;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  S = window.AlloModules.BehaviorLensSchedules;
  C = window.AlloModules.BehaviorLensConditional;
  if (!S || !C) throw new Error('schedule or conditional helpers did not register');
});
afterEach(() => vi.restoreAllMocks());

describe('Latency Recorder goal', () => {
  it('counts no-response trials as not meeting the goal, and saves no latency when none responded', () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const saved = [];
    const q = componentHarness('LatencyRecorder', { t: () => undefined, addToast: () => {}, onSaveSession: r => saved.push(r) });
    q.all(n => n.props['aria-label'] === 'eg 3')[0].props.onChange({ target: { value: '3' } }); q.render();
    const present = () => { q.all(n => n.props['aria-label'] === 'Present Stimulus')[0].props.onClick(); q.render(); };
    present(); now += 2000;
    q.all(n => n.type === 'button' && n.props['aria-label'] !== 'No Response' && /respon/i.test(q.text(n)))[0].props.onClick(); q.render();
    for (let i = 0; i < 3; i += 1) { present(); q.all(n => n.props['aria-label'] === 'No Response')[0].props.onClick(); q.render(); }
    const goal = q.all(n => n.props['data-latency-goal'] !== undefined)[0];
    expect(q.text(goal)).toBe('🎯 Goal (≤3s): 1/4 trials met criteria (25%); 3 with no response count as not met');
    q.all(n => n.type === 'button' && /save/i.test(q.text(n)))[0].props.onClick();
    expect(saved[0]).toMatchObject({ measurementType: 'latency', value: 2, unit: 'seconds', trials: 4, noResponseTrials: 3 });
  });
  it('an all-no-response session saves no average latency (was 0 s)', () => {
    const saved = [];
    const q = componentHarness('LatencyRecorder', { t: () => undefined, addToast: () => {}, onSaveSession: r => saved.push(r) });
    q.all(n => n.props['aria-label'] === 'Present Stimulus')[0].props.onClick(); q.render();
    q.all(n => n.props['aria-label'] === 'No Response')[0].props.onClick(); q.render();
    q.all(n => n.type === 'button' && /save/i.test(q.text(n)))[0].props.onClick();
    expect(saved[0]).toMatchObject({ value: null, rate: null, noResponseTrials: 1 });
  });
});

describe('variable schedules average their value', () => {
  it('VR-n draws from a range whose mean is exactly n (VR-5 averaged 4.5)', () => {
    for (let n = 1; n <= 12; n += 1) {
      const { min, max } = S.variableRatioRange(n);
      expect((min + max) / 2, 'VR-' + n).toBe(n);
      expect(min).toBeGreaterThanOrEqual(1);
    }
    expect(S.variableRatioRange(5)).toEqual({ min: 3, max: 7 });
  });
  it('VI-n (minutes) draws from a range averaging n minutes', () => {
    expect(S.variableIntervalRangeSec(3)).toEqual({ min: 90, max: 270 });
    for (const n of [1, 2, 3, 5, 10]) { const r = S.variableIntervalRangeSec(n); expect((r.min + r.max) / 2).toBe(n * 60); }
  });
});

describe('conditional probability verdict follows the legend', () => {
  const base = { withAntN: 25, withoutAntN: 25 };
  it('risk ratio 1.2 is weak, not "strong" (0.96 vs 0.80)', () => {
    expect(C.conditionalAssociation({ ...base, pBgivA: 0.96, pBgivNoA: 0.80, riskRatio: 0.96 / 0.80 }).band).toBe('weak');
  });
  it('bands match the legend: > 2 strong, 1.5-2 moderate, <= 1 none', () => {
    expect(C.conditionalAssociation({ ...base, riskRatio: 2.4 }).band).toBe('strong');
    expect(C.conditionalAssociation({ ...base, riskRatio: 1.7 }).band).toBe('moderate');
    expect(C.conditionalAssociation({ ...base, riskRatio: 0.9 }).band).toBe('none');
  });
  it('nothing to compare, or too few entries, is said plainly', () => {
    expect(C.conditionalAssociation({ withAntN: 12, withoutAntN: 0, riskRatio: Infinity }).band).toBe('no-comparison');
    expect(C.conditionalAssociation({ withAntN: 3, withoutAntN: 20, riskRatio: 3 }).band).toBe('too-few');
  });
});

describe('conditional probability panel', () => {
  it('opens the matrix cell 0.96 vs 0.80 and calls it weak, as its legend does', () => {
    const runtime = behaviorLensRuntime();
    const e = (i, antecedent, behavior) => runtime.normalizeAbcEntry({ antecedent, behavior, consequence: 'Redirect', occurredAt: new Date(Date.UTC(2026, 8, 1) + i * 3600e3).toISOString() }).entry;
    const entries = [];
    for (let i = 0; i < 25; i += 1) entries.push(e(i, 'Demand', i < 24 ? 'Hit' : 'Yell'));
    for (let i = 0; i < 25; i += 1) entries.push(e(100 + i, 'Transition', i < 20 ? 'Hit' : 'Yell'));
    const q = componentHarness('ConditionalProbability', { abcEntries: entries, t: () => undefined, addToast: () => {}, callGemini: null });
    q.all(n => n.type === 'button' && /matrix/i.test(q.text(n)))[0].props.onClick(); q.render();
    q.all(n => n.type === 'button' && String(n.props['aria-label'] || '').startsWith('Focused analysis for Demand and Hit'))[0].props.onClick(); q.render();
    const verdict = q.all(n => n.props['data-cp-band'])[0];
    expect(verdict.props['data-cp-band']).toBe('weak');
    expect(q.text(verdict)).not.toMatch(/strong association/);
  });
});

describe('AI confidence', () => {
  it('a missing confidence reads Unknown, not Low (Number(null) is 0)', async () => {
    const { behaviorLensInternals } = await import('./helpers/behavior_lens_component_harness.js');
    const bucket = behaviorLensInternals()('aiConfidenceBucket');
    expect(bucket(null).label).toBe('Unknown');
    expect(bucket(undefined).label).toBe('Unknown');
    expect(bucket('').label).toBe('Unknown');
    expect(bucket(0).label).toBe('Low');
    expect(bucket(72).label).toBe('High');
  });
  it('the analysis normalizer keeps a missing confidence missing', () => {
    const src = require('node:fs').readFileSync('behavior_lens_module.js', 'utf8');
    expect(src).not.toContain('confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),');
  });
});
