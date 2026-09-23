// Behavior Lens Virtual Practicum answer keys.
//
// WHY: until 2026-09-23 Scenario 2 interval 5 ("Mia raises hand at second 5, puts it
// down at second 10, raises again at second 18", 20-second intervals) was keyed NO for
// momentary time sampling, though her hand is up when the interval ends, so a trainee
// who scored every interval right got 90%. AI-generated keys were accepted unchecked:
// strings like "true" graded every answer wrong, and a key could say "whole interval:
// yes" and "end of interval: no" for the same interval. The expected MTS answers below
// are read off the narrative by hand.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let P, SCENARIOS;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  P = window.AlloModules.BehaviorLensPracticum;
  if (!P) throw new Error('BehaviorLensPracticum did not register');
  // The built-in scenarios, read from the shipped source.
  const src = readFileSync('behavior_lens_module.js', 'utf8');
  const start = src.indexOf('const SCENARIOS = [', src.indexOf('const VirtualPracticum = '));
  const end = src.indexOf('];\n', start);
  SCENARIOS = new Function('return ' + src.slice(start + 'const SCENARIOS = '.length, end + 1))();
});
afterEach(() => { vi.useRealTimers(); });

describe('the built-in answer keys', () => {
  it('there are five, and every key agrees with itself', () => {
    expect(SCENARIOS).toHaveLength(5);
    expect(SCENARIOS.map(s => P.practicumKeyProblem(s.expertKeys, s.narrative.length))).toEqual([null, null, null, null, null]);
  });
  it('Scenario 2 MTS matches the narrative: hand up at the end of intervals 1, 3, 5, 8, 9, 10', () => {
    expect(SCENARIOS[1].expertKeys.mts).toEqual([true, false, true, false, true, false, false, true, true, true]);
  });
});

describe('practicumKeyProblem', () => {
  const ok = { mts: [true, false], partial: [true, true], whole: [true, false] };
  it('accepts a consistent key', () => { expect(P.practicumKeyProblem(ok, 2)).toBe(null); });
  it('rejects strings, wrong lengths and contradictions', () => {
    expect(P.practicumKeyProblem({ ...ok, mts: ['true', 'false'] }, 2)).toBe('mts: answers must be true or false');
    expect(P.practicumKeyProblem({ ...ok, partial: [true] }, 2)).toBe('partial: needs 2 answers');
    expect(P.practicumKeyProblem({ ...ok, whole: [true, true] }, 2)).toBe('interval 2: whole interval yes but end of interval no');
    expect(P.practicumKeyProblem({ ...ok, partial: [false, true] }, 2)).toBe('interval 1: end of interval yes but any time no');
  });
});

describe('the practicum panel', () => {
  it('scoring Scenario 2 from the narrative gets 100% (was 90%)', () => {
    vi.useFakeTimers();
    const q = componentHarness('VirtualPracticum', { t: () => undefined, addToast: () => {}, callGemini: null });
    q.all(n => n.props['aria-label'] === 'Next')[0].props.onClick(); q.render();
    const method = q.all(n => n.type === 'button' && /Momentary Time Sampling \(MTS\)/.test(q.text(n)))[0];
    expect(method.props['aria-label']).toBeUndefined();     // old: every method was "Toggle mode"
    method.props.onClick(); q.render();
    q.all(n => n.props['aria-label'] === 'Start Observation')[0].props.onClick(); q.render(true);
    const answers = [true, false, true, false, true, false, false, true, true, true];
    answers.forEach(answer => {
      for (let k = 0; k < 6; k += 1) { vi.advanceTimersByTime(1000); q.render(true); }
      q.all(n => n.props['aria-label'] === (answer ? 'YES' : 'NO'))[0].props.onClick(); q.render(true);
    });
    expect(q.text()).toContain('100% Accuracy');
    expect(q.text()).toContain('10 of 10 intervals correct');
  });
  it('an AI key that contradicts itself is not added', async () => {
    const toasts = [];
    const bad = { title: 'T', student: 'S', setting: 'x', behaviorDef: 'd', narrative: Array(10).fill('n'),
      expertKeys: { mts: Array(10).fill(false), partial: Array(10).fill(true), whole: Array(10).fill(true) } };
    const q = componentHarness('VirtualPracticum', { t: () => undefined, addToast: (m, kind) => toasts.push([m, kind]), callGemini: async () => JSON.stringify(bad) });
    await q.all(n => n.props['aria-label'] === 'Generate Ai Scenario')[0].props.onClick(); q.render();
    expect(toasts.pop()).toEqual(['The AI answer key did not hold together (interval 1: whole interval yes but end of interval no), so the scenario was not added. Try again.', 'error']);
    expect(q.text()).toContain('1 of 5');   // still five scenarios: the bad one was not added
  });
});
