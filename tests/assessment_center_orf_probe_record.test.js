// Does a screening ORF result actually reach probe history now? (2026-08-23)
//
// Until 2026-08-23 the host's ORF completion effect only advanced the battery:
// the record went to setLatestProbeResult (in-memory screeningHistory) and
// never to saveProbeResult, so no ORF score ever reached
// alloflow_probe_history — the RTI tier, the aimline (ORF-only by contract),
// the trend series and the IEP export all read an empty series, and standalone
// (non-battery) screening runs were discarded entirely by the
// status !== 'running' gate.
//
// The effect body is EXECUTED out of AlloFlowANTI.txt rather than hand-copied,
// per the lesson tests/assessment_center_math_probe_record.test.js documents:
// hand-copied forks drift and keep real regressions green.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let anti;

beforeAll(() => {
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
});

// Slice a brace-balanced region starting at the '{' found at/after `open`.
function braceBalanced(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(open + 1, i); }
  }
  throw new Error('unbalanced region');
}

const EFFECT_PARAMS = [
  'fluencyStatus', 'fluencyResult', 'screenerSession', 'generatedContent',
  'probeTargetStudent', 'probeGradeLevel', 'mathProbeForm', 'orfScreeningSavedRef',
  'saveProbeResult', 'addToast', 't', 'setLatestProbeResult', 'setIsFluencyMode',
  'setFluencyStatus', 'setActiveView', 'setScreenerSession',
];

function extractEffect() {
  const marker = "const inBattery = !!(screenerSession && screenerSession.status === 'running'";
  const at = anti.indexOf(marker);
  expect(at, 'ORF persistence effect not found').toBeGreaterThan(-1);
  const effOpen = anti.lastIndexOf('React.useEffect(() => {', at);
  expect(effOpen, 'enclosing useEffect not found').toBeGreaterThan(-1);
  const body = braceBalanced(anti, anti.indexOf('{', effOpen + 'React.useEffect(() =>'.length));
  // eslint-disable-next-line no-new-func
  return new Function(...EFFECT_PARAMS, body);
}

// Drive the shipped effect with a given world; report everything it did.
function run(world) {
  const saved = [];
  const toasts = [];
  const calls = { latest: [], fluencyMode: [], fluencyStatus: [], activeView: [], screener: [] };
  const ref = world.ref || { current: null };
  extractEffect()(
    world.fluencyStatus !== undefined ? world.fluencyStatus : 'complete',
    world.fluencyResult,
    world.screenerSession || null,
    world.generatedContent || null,
    world.probeTargetStudent !== undefined ? world.probeTargetStudent : null,
    world.probeGradeLevel || '2',
    world.mathProbeForm || 'A',
    ref,
    (student, record) => saved.push({ student, record }),
    (msg, level) => toasts.push({ msg, level }),
    () => undefined, // t() misses like the live host on an absent key
    (r) => calls.latest.push(r),
    (v) => calls.fluencyMode.push(v),
    (v) => calls.fluencyStatus.push(v),
    (v) => calls.activeView.push(v),
    (v) => calls.screener.push(v),
  );
  return { saved, toasts, calls, ref };
}

const screeningContent = { isScreeningORF: true };
const result = (extra) => ({ recordId: 'rec-1', wcpm: 42, wordData: new Array(98), accuracy: 96, feedback: '', ...extra });

describe('standalone screening ORF persists', () => {
  it('a completed run with a student and a real score is saved once, wcpm === itemsPerMin', () => {
    const { saved, toasts, calls } = run({ generatedContent: screeningContent, probeTargetStudent: 'Falcon', fluencyResult: result() });
    expect(saved).toHaveLength(1);
    expect(saved[0].student).toBe('Falcon');
    expect(saved[0].record.activity).toBe('orf');
    expect(saved[0].record.wcpm).toBe(42);
    expect(saved[0].record.itemsPerMin).toBe(42);
    expect(saved[0].record.grade).toBe('2');
    expect(saved[0].record.form).toBe('A');
    expect(toasts.some(x => x.level === 'success')).toBe(true);
    expect(calls.latest).toHaveLength(1);
    // Standalone must NOT drive the battery machinery.
    expect(calls.screener).toHaveLength(0);
    expect(calls.fluencyStatus).toHaveLength(0);
  });

  it('a REAL zero is a score: 0 WCPM records as 0, not as missing', () => {
    const { saved } = run({ generatedContent: screeningContent, probeTargetStudent: 'Falcon', fluencyResult: result({ wcpm: 0 }) });
    expect(saved).toHaveLength(1);
    expect(saved[0].record.wcpm).toBe(0);
  });

  it('a MISSING score is refused, not recorded as 0 (Number(null) class)', () => {
    for (const wcpm of [null, undefined, NaN]) {
      const { saved, toasts } = run({ generatedContent: screeningContent, probeTargetStudent: 'Falcon', fluencyResult: result({ wcpm }) });
      expect(saved).toHaveLength(0);
      expect(toasts.some(x => x.level === 'warning')).toBe(true);
    }
  });

  it('practice mode (no student) saves nothing and says so', () => {
    const { saved, toasts } = run({ generatedContent: screeningContent, probeTargetStudent: null, fluencyResult: result() });
    expect(saved).toHaveLength(0);
    expect(toasts.some(x => x.level === 'info')).toBe(true);
  });

  it('an ordinary practice read (no screening flag, no battery) does nothing at all', () => {
    const { saved, toasts, calls } = run({ generatedContent: { text: 'hi' }, probeTargetStudent: 'Falcon', fluencyResult: result() });
    expect(saved).toHaveLength(0);
    expect(toasts).toHaveLength(0);
    expect(calls.latest).toHaveLength(0);
  });

  it('a review replay (same recordId while still complete) does not double-save', () => {
    const ref = { current: null };
    const first = run({ generatedContent: screeningContent, probeTargetStudent: 'Falcon', fluencyResult: result(), ref });
    expect(first.saved).toHaveLength(1);
    const second = run({ generatedContent: screeningContent, probeTargetStudent: 'Falcon', fluencyResult: result({ wcpm: 99 }), ref });
    expect(second.saved).toHaveLength(0);
    // A fresh run (ref reset by the status-change effect, new recordId) saves again.
    ref.current = null;
    const third = run({ generatedContent: screeningContent, probeTargetStudent: 'Falcon', fluencyResult: result({ recordId: 'rec-2' }), ref });
    expect(third.saved).toHaveLength(1);
  });
});

describe('battery ORF persists AND still advances', () => {
  const battery = (idx, extra) => ({
    grade: '2', form: 'B', student: 'Falcon', status: 'running',
    subtests: ['nwf', 'orf', 'segmentation'], currentIndex: idx, results: [], ...extra,
  });

  it('mid-battery: saves the record and advances to interstitial', () => {
    const { saved, calls } = run({ screenerSession: battery(1), fluencyResult: result() });
    expect(saved).toHaveLength(1);
    expect(saved[0].record.grade).toBe('2');
    expect(saved[0].record.form).toBe('B');
    expect(calls.screener).toHaveLength(1);
    expect(calls.screener[0].status).toBe('interstitial');
    expect(calls.screener[0].currentIndex).toBe(2);
    expect(calls.screener[0].results).toHaveLength(1);
    expect(calls.fluencyStatus).toEqual(['idle']);
    expect(calls.fluencyMode).toEqual([false]);
    expect(calls.activeView).toEqual([null]);
  });

  it('last subtest: saves and completes the session', () => {
    const { saved, calls } = run({ screenerSession: battery(2, { subtests: ['nwf', 'segmentation', 'orf'] }), fluencyResult: result() });
    expect(saved).toHaveLength(1);
    expect(calls.screener[0].status).toBe('complete');
  });

  it('a battery run with no usable score still advances but records nothing', () => {
    const { saved, toasts, calls } = run({ screenerSession: battery(1), fluencyResult: result({ wcpm: null }) });
    expect(saved).toHaveLength(0);
    expect(toasts.some(x => x.level === 'warning')).toBe(true);
    expect(calls.screener).toHaveLength(1); // the battery must not stall
  });

  it('a battery on a non-ORF subtest is ignored by this effect', () => {
    const { saved, calls } = run({ screenerSession: battery(0), fluencyResult: result() });
    expect(saved).toHaveLength(0);
    expect(calls.screener).toHaveLength(0);
  });
});
