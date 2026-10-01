// Does the math probe record we now write actually mean anything to Assessment
// Center's clinical engine? (2026-08-17)
//
// tests/assessment_center_math_probe_loop.test.js pins the WIRING. This runs the
// REAL interpretation engine over the REAL record shape and asserts the loop
// closes: a completed fixed-form math probe lands in probe history, is mapped to
// a probeType/score, and comes back out as an RTI tier.
//
// The record literal is EXECUTED out of view_sidebar_panels_source.jsx rather
// than hand-copied here. This suite already learned that lesson the hard way:
// tests/extracted_logic/clinical_logic.js is a hand-copied fork that drifted
// from the live source, so real regressions stayed green.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

let SAI;
let meta;
let runHandlerReady;

// Pull the WHOLE onProbeComplete handler out of the sidebar and turn it into a
// callable, so this test can never drift from what ships. Running the handler
// rather than just its record literal also exercises the real gating: benchmark
// only, student required, interrupted runs refused.
function extractHandler() {
  const src = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
  const marker = 'onProbeComplete={(entry) => {';
  const start = src.indexOf(marker);
  expect(start, 'onProbeComplete handler not found').toBeGreaterThan(-1);
  const open = start + marker.length - 1; // the '{' opening the arrow body
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  expect(end, 'unbalanced handler body').toBeGreaterThan(open);
  const body = src.slice(open + 1, end);
  // The handler closes over these; supply them as parameters.
  // eslint-disable-next-line no-new-func
  return new Function('entry', 'setHistory', 'saveProbeResult', 'addToast', 't', body);
}

// Run the shipped handler and report what it did.
function runHandler(resultData, entryExtras) {
  const entry = Object.assign({ timestamp: 1737385200000, data: resultData }, entryExtras || {});
  const saved = [];
  const toasts = [];
  extractHandler()(
    entry,
    () => {},
    (student, record) => saved.push({ student, record }),
    (msg, level) => toasts.push({ msg, level }),
    () => null // no translations in this environment; handler falls back to English
  );
  return { saved, toasts };
}

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  const ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
  globalThis.React = window.React = React;
  try { window.ReactDOM = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom')); } catch (e) {}
  loadAlloModule('student_analytics_module.js');
  const Panel = window.AlloModules.StudentAnalytics;
  try {
    ReactDOMServer.renderToStaticMarkup(React.createElement(Panel, { isOpen: true, onClose: () => {}, students: [], dashboardData: null }));
  } catch (e) { /* seam is captured before the JSX return */ }
  SAI = window.AlloModules.StudentAnalyticsInternals;
  meta = window.AlloModules.StudentAnalytics._meta;
  runHandlerReady = true;
});

// A completed grade-3 fixed form. Field names are the live panel's result shape
// (math_fluency_module.js finishProbe).
const completedRun = {
  mode: 'benchmark',
  form: 'A',
  grade: '3',
  student: 'Otter',
  dcpm: 28,
  accuracy: 93,
  totalCorrect: 14,
  totalAttempted: 15,
  validForComparison: true,
  date: '2026-01-20T15:00:00.000Z'
};

describe('the record the sidebar writes', () => {
  it('carries the same number in dcpm and itemsPerMin', () => {
    const { saved } = runHandler(completedRun);
    expect(saved).toHaveLength(1);
    expect(saved[0].student).toBe('Otter');
    const rec = saved[0].record;
    // Two Assessment Center readers take different fields. If they diverged, one
    // probe would report two different scores.
    expect(rec.dcpm).toBe(28);
    expect(rec.itemsPerMin).toBe(28);
    expect(rec.activity).toBe('math_dcpm');
    expect(rec.grade).toBe('3');
    expect(rec.form).toBe('A');
  });

  it('is an activity the engine maps rather than silently ignores', () => {
    const rec = runHandler(completedRun).saved[0].record;
    // Assessment Center returns null for activities it will not guess at, which
    // would drop the probe out of every RTI surface without a word.
    expect(SAI.interpretProbeResult).toBeTypeOf('function');
    const out = SAI.interpretProbeResult('math_dcpm', rec.itemsPerMin, rec.grade, 'winter');
    expect(out).toBeTruthy();
    expect(out.benchmark50).toBeNull();
    expect(out.comparisonAvailable).toBe(false);
  });
});

describe('what the handler refuses to record', () => {
  it('a practice run is not written to anyone', () => {
    const { saved } = runHandler(Object.assign({}, completedRun, { mode: 'practice', student: null }));
    expect(saved).toHaveLength(0);
  });

  it('a benchmark with no student is not written', () => {
    const { saved } = runHandler(Object.assign({}, completedRun, { student: null }));
    expect(saved).toHaveLength(0);
  });

  it('an interrupted run is refused AND announced', () => {
    // Probe history has no validity flag, so anything written is read as a real
    // CBM. Dropping it silently is the failure mode being prevented here.
    const { saved, toasts } = runHandler(Object.assign({}, completedRun, { validForComparison: false }));
    expect(saved).toHaveLength(0);
    expect(toasts.some((x) => x.level === 'warning' && /interrupted|ended early/i.test(x.msg))).toBe(true);
  });

  it('a run with no usable score is refused', () => {
    const { saved } = runHandler(Object.assign({}, completedRun, { dcpm: null }));
    expect(saved).toHaveLength(0);
  });
});

describe('the loop closes: written record remains descriptive', () => {
  beforeAll(() => {
    const rec = runHandler(completedRun).saved[0].record;
    localStorage.setItem('alloflow_probe_history', JSON.stringify({ Otter: [Object.assign({ timestamp: 1737385200000 }, rec)] }));
  });

  it('appears in that student probe history', () => {
    const hist = meta.getStudentProbeHistory('Otter');
    expect(hist).toHaveLength(1);
    expect(hist[0].activity).toBe('math_dcpm');
  });

  it('appears in the screening summary', () => {
    const summary = meta.getScreeningSummary('Otter');
    expect(summary.activities).toContain('math_dcpm');
  });

  it('preserves the score without asserting unvalidated math norms', () => {
    const tier = meta.getRTITier('Otter');
    expect(tier).toBeTruthy();
    const math = tier.perProbe.find((p) => p.activity === 'math_dcpm');
    expect(math, 'math probe missing from the tier breakdown').toBeTruthy();
    // The score must survive the round trip unchanged.
    expect(math.score).toBe(28);
    expect(math.tier).toBe(0);
    expect(math.comparisonAvailable).toBe(false);
    expect(math.status).toBe('Reference comparison unavailable');
  });

  it('does not invent norm bands for either high or low practice scores', () => {
    const strong = SAI.interpretProbeResult('math_dcpm', 60, '3', 'winter');
    const weak = SAI.interpretProbeResult('math_dcpm', 5, '3', 'winter');
    expect(strong).toMatchObject({tier:0, benchmark50:null});
    expect(weak).toMatchObject({tier:0, benchmark50:null});
  });
});
