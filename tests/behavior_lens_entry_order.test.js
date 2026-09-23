// Behavior Lens tools that read "the most recent" ABC entries.
//
// WHY: the stored array's order depends on how the data arrived (the ABC form adds
// newest first; snapshot import sorts oldest first; voice, CSV and natural-language
// entry append). Until 2026-09-23 tools read "recent" by array POSITION:
//   - Smart Alerts: on an oldest-first array a rising intensity read as "Great news!
//     intensity has decreased", and "No new entries in N days" was dated from the
//     OLDEST entry;
//   - Predictive Insights compared overlapping windows and averaged unrated as 0;
//   - 17 AI prompts sent `slice(-n)` (the oldest n, for form data) as "recent".
// Every test here runs the same data in BOTH orders and expects the same answer.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let A, runtime;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  runtime = behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  A = window.AlloModules && window.AlloModules.BehaviorLensAlerts;
  if (!A) throw new Error('BehaviorLensAlerts did not register');
});

const DAY = 86400000;
const NOW = Date.parse('2026-09-20T12:00:00Z');
const entry = (daysAgo, intensity, extra = {}) => runtime.normalizeAbcEntry(Object.assign({
  antecedent: 'Math worksheet', behavior: 'Left seat', consequence: 'Redirected',
  occurredAt: new Date(NOW - daysAgo * DAY).toISOString(), intensity,
}, extra)).entry;
const both = list => [list.slice(), list.slice().reverse()];
const ids = alerts => alerts.map(a => a.id).sort();

describe('Smart Alerts read entries by time', () => {
  it('rising intensity is an escalation warning in either order (oldest-first used to say "Great news")', () => {
    const oldestFirst = [5, 4, 3, 2, 1].map((d, i) => entry(d, i + 1)); // 1 → 5 over five days
    for (const list of both(oldestFirst)) {
      const got = ids(A.computeSmartAlerts(list, { userRole: 'teacher', aiAnalysis: {}, now: NOW }));
      expect(got).toContain('intensity_up');
      expect(got).not.toContain('intensity_down');
    }
  });
  it('"No new entries" is dated from the NEWEST entry', () => {
    const list = [30, 20, 10, 1].map(d => entry(d, 2));
    for (const order of both(list)) {
      expect(ids(A.computeSmartAlerts(order, { userRole: 'teacher', aiAnalysis: {}, now: NOW }))).not.toContain('stale');
    }
    for (const order of both([30, 20, 9].map(d => entry(d, 2)))) {
      const stale = A.computeSmartAlerts(order, { userRole: 'teacher', aiAnalysis: {}, now: NOW }).find(a => a.id === 'stale');
      expect(stale && stale.msg).toContain('No new entries in 9 days');
    }
  });
});

describe('Predictive Insights intensity trend', () => {
  const render = list => {
    const q = componentHarness('PredictiveInsights', { abcEntries: list, callGemini: null, t: () => undefined, addToast: () => {} });
    return q.text();
  };
  it('compares the newest and earliest RATED entries, in either stored order', () => {
    const list = [];
    for (let d = 20; d >= 11; d -= 1) list.push(entry(d, d > 15 ? 4 : 1)); // earliest five rated 4, newest five rated 1
    list.push(entry(12.5, null), entry(11.5, null));                     // unrated entries are not zeros
    for (const order of both(list)) {
      const text = render(order);
      expect(text).toContain('Intensity ratings lower lately: newest 5 average 1.0 vs earliest 5 average 4.0');
      expect(text).not.toContain('higher lately');
    }
  });
  it('with fewer than 10 rated entries it makes no trend claim (the windows would overlap)', () => {
    const list = [9, 8, 7, 6, 5, 4, 3, 2, 1].map(d => entry(d, d > 5 ? 5 : 1));
    expect(render(list)).not.toMatch(/Intensity ratings (lower|higher) lately/);
  });
});

describe('no tool reads "recent" ABC entries by array position', () => {
  it('every sliced window of abcEntries goes through the time-ordered copy', () => {
    const src = readFileSync('behavior_lens_module.js', 'utf8');
    const positional = src.match(/(?<![\w.])abcEntries\.slice\((0, \d+|-\d+)\)/g) || [];
    expect(positional, 'read through abcEntriesNewestFirst(abcEntries) instead').toEqual([]);
    expect(src).not.toMatch(/abcEntries\[0\]\.timestamp|abcEntries\[abcEntries\.length - 1\]/);
  });
});
