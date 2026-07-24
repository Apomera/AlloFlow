// Logic-characterization tests for student_analytics_module.js — the CBM probe
// interpretation engine + RTI tier classifier.
//
// WHY (highest clinical stakes in the suite): these outputs label real students
// Tier 1/2/3 and print "Consider referral for comprehensive evaluation" into RTI
// meeting summaries. Two live hazards from the 2026-06-07 coverage assessment:
//   1. The only prior "coverage" is a hand-copied FORK (tests/extracted_logic/
//      clinical_logic.js) that has DRIFTED from the live source — so a real-source
//      regression stays green. These tests run the REAL shipped bytes.
//   2. The module has TWO copies of CBM_NORMS + interpretProbeResult in one
//      function scope. They are same-scope `var` redeclarations, so the SECOND
//      (@1161/@1152) wins and is LIVE; the FIRST (@1041/@1033) is DEAD and has
//      already drifted in its narrative/recommendations text. We pin the LIVE
//      engine AND assert the two CBM_NORMS tables stay byte-identical, so a norm
//      typo can never silently re-tier a student via the stale copy.
//
// The engine fns are component-local (defined inside StudentAnalyticsPanel,
// referencing closure state). The module exposes them via a one-time test seam
// (window.AlloModules.StudentAnalyticsInternals) captured during render; we SSR-
// render the panel once to populate it (the capture sits before the JSX return,
// so it populates even if the heavy panel render throws). interpretProbeResult
// takes `season` as an explicit arg, so no Date freeze is needed.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

let SAI;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  const ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
  globalThis.React = window.React = React;
  try { window.ReactDOM = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom')); } catch (e) {}
  loadAlloModule('student_analytics_module.js');
  const Panel = window.AlloModules.StudentAnalytics;
  // Render once to execute the component body and populate the test seam. The
  // capture is before the JSX return; a later render throw is fine (and swallowed).
  let renderErr = null;
  try {
    ReactDOMServer.renderToStaticMarkup(React.createElement(Panel, { isOpen: true, onClose: () => {}, students: [], dashboardData: null }));
  } catch (e) { renderErr = e; }
  SAI = window.AlloModules.StudentAnalyticsInternals;
  if (!SAI || !SAI.interpretProbeResult || !SAI.classifyRTITier) {
    throw new Error('seam not populated (render err: ' + (renderErr && renderErr.message) + ')');
  }
});

// Default RTI thresholds (passed explicitly so the test does not depend on the
// component's rtiThresholds state). Mirrors the in-source default object.
const T = { quizTier3: 50, quizTier2: 80, wsTier3: 50, wsTier2: 75, engagementMin: 2, fluencyMin: 60, labelChallengeMin: 50 };

describe('CBM_NORMS — pin the benchmark numbers (a typo re-tiers a student)', () => {
  it('ORF 50th-percentile norms by grade/season', () => {
    expect(SAI.CBM_NORMS.orf['3']).toEqual({ fall: 71, winter: 92, spring: 107 });
    expect(SAI.CBM_NORMS.orf['1']).toEqual({ fall: 0, winter: 23, spring: 53 });
    expect(SAI.CBM_NORMS.orf['6']).toEqual({ fall: 127, winter: 140, spring: 150 });
  });
  it('NWF_CLS, LNF, MATH_DCPM norms', () => {
    expect(SAI.CBM_NORMS.nwf_cls.K).toEqual({ fall: 0, winter: 17, spring: 35 });
    expect(SAI.CBM_NORMS.lnf.K).toEqual({ fall: 7, winter: 30, spring: 47 });
    expect(SAI.CBM_NORMS.math_dcpm['3']).toEqual({ fall: 25, winter: 35, spring: 45 });
  });
  // (The dead duplicate CBM_NORMS copy was removed from the module 2026-06-07; a
  //  single live norm table remains, pinned above.)
});

describe('interpretProbeResult — tier cut points (ORF grade 3 winter, benchmark 92)', () => {
  const ipr = (score) => SAI.interpretProbeResult('orf', score, '3', 'winter');
  it('score at benchmark → pct 100, Tier 1 At/Above', () => {
    expect(ipr(92)).toMatchObject({ tier: 1, status: 'At or Above Benchmark', statusColor: '#16a34a', benchmark50: 92, pctOfBenchmark: 100 });
  });
  it('pct in [75,100) → Tier 1 Approaching', () => {
    expect(ipr(70)).toMatchObject({ tier: 1, status: 'Approaching Benchmark', statusColor: '#65a30d', pctOfBenchmark: 76 });
  });
  it('pct in [50,75) → Tier 2 Below', () => {
    const r = ipr(55);
    expect(r).toMatchObject({ tier: 2, status: 'Below Benchmark', statusColor: '#d97706', pctOfBenchmark: 60 });
    expect(r.recommendations).toContain('Begin Tier 2 intervention.');
    expect(r.recommendations).toContain('Implement repeated reading with corrective feedback.'); // ORF-specific, tier>=2
  });
  it('pct < 50 → Tier 3 Well Below, with the referral language', () => {
    const r = ipr(40);
    expect(r).toMatchObject({ tier: 3, status: 'Well Below Benchmark', statusColor: '#dc2626', pctOfBenchmark: 43 });
    expect(r.recommendations).toContain('Consider referral for comprehensive evaluation if insufficient growth after 6-8 weeks.');
  });
});

describe('interpretProbeResult — across probe types + edge cases', () => {
  it('MATH_DCPM grade 3 winter (benchmark 35)', () => {
    expect(SAI.interpretProbeResult('math_dcpm', 35, '3', 'winter')).toMatchObject({ tier: 1, benchmark50: 35, pctOfBenchmark: 100 });
    const r = SAI.interpretProbeResult('math_dcpm', 20, '3', 'winter');
    expect(r).toMatchObject({ tier: 2, pctOfBenchmark: 57 });
    expect(r.recommendations.some((x) => /daily fact fluency/i.test(x))).toBe(true);
  });
  it('NWF_CLS grade K winter (benchmark 17)', () => {
    expect(SAI.interpretProbeResult('nwf_cls', 17, 'K', 'winter')).toMatchObject({ tier: 1, benchmark50: 17, pctOfBenchmark: 100 });
    expect(SAI.interpretProbeResult('nwf_cls', 5, 'K', 'winter')).toMatchObject({ tier: 3, pctOfBenchmark: 29 });
  });
  it('unknown probe type → tier 0, "No norms available"', () => {
    expect(SAI.interpretProbeResult('bogus', 50, '3', 'winter')).toMatchObject({ tier: 0, status: 'No norms available', benchmark50: null });
  });
  it('grade with no norm row → tier 0', () => {
    expect(SAI.interpretProbeResult('orf', 50, '9', 'winter')).toMatchObject({ tier: 0, status: 'No norms available' });
  });
  it('benchmark of 0 (ORF grade 1 fall): any positive score → pct 200 / Tier 1; zero → pct 0 / Tier 3', () => {
    expect(SAI.interpretProbeResult('orf', 10, '1', 'fall')).toMatchObject({ tier: 1, benchmark50: 0, pctOfBenchmark: 200 });
    expect(SAI.interpretProbeResult('orf', 0, '1', 'fall')).toMatchObject({ tier: 3, benchmark50: 0, pctOfBenchmark: 0 });
  });
});

describe('classifyRTITier — RTI tier classification (real bytes, explicit thresholds)', () => {
  it('quizAvg below Tier-3 cut → Tier 3 Intensive', () => {
    const r = SAI.classifyRTITier({ quizAvg: 40, totalActivities: 5 }, T);
    expect(r).toMatchObject({ tier: 3, label: 'Tier 3 — Intensive', color: '#dc2626', emoji: '🔴' });
  });
  it('quizAvg in instructional range → Tier 2 Strategic', () => {
    const r = SAI.classifyRTITier({ quizAvg: 70, totalActivities: 5 }, T);
    expect(r).toMatchObject({ tier: 2, label: 'Tier 2 — Strategic', color: '#d97706', emoji: '🟡' });
  });
  it('strong profile → Tier 1 On Track with strength reasons', () => {
    const r = SAI.classifyRTITier({ quizAvg: 90, wsAccuracy: 90, totalActivities: 5, fluencyWCPM: 100 }, T);
    expect(r).toMatchObject({ tier: 1, label: 'Tier 1 — On Track', color: '#16a34a', emoji: '🟢' });
    expect(r.reasons).toContain('Strong quiz performance');
    expect(r.reasons).toContain('Strong fluency');
  });
  it('critically low math fluency forces Tier 3', () => {
    const r = SAI.classifyRTITier({ quizAvg: 90, totalActivities: 5, mathDCPM: 10 }, T);
    expect(r.tier).toBe(3);
    expect(r.reasons.some((x) => /Math fluency critically below/.test(x))).toBe(true);
  });
  it('very low engagement escalates to at least Tier 2', () => {
    const r = SAI.classifyRTITier({ quizAvg: 90, totalActivities: 1 }, T);
    expect(r.tier).toBeGreaterThanOrEqual(2);
    expect(r.reasons.some((x) => /low engagement/i.test(x))).toBe(true);
  });
  it('returns the full label shape', () => {
    const r = SAI.classifyRTITier({ quizAvg: 90, wsAccuracy: 90, totalActivities: 5 }, T);
    expect(r).toHaveProperty('bg');
    expect(r).toHaveProperty('border');
    expect(Array.isArray(r.reasons)).toBe(true);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

describe('_meta — reciprocal query surface (P3-1)', () => {
  const META = () => window.AlloModules.StudentAnalytics._meta;
  it('is registered on the module with read-only helpers', () => {
    expect(META()).toBeTruthy();
    expect(typeof META().getStudentProbeHistory).toBe('function');
    expect(typeof META().getScreeningSummary).toBe('function');
    expect(typeof META().getRTITier).toBe('function');
  });
  it('never throws + returns empty/null for an unknown student on empty storage', () => {
    try { localStorage.removeItem('alloflow_probe_history'); } catch (e) {}
    expect(META().getStudentProbeHistory('nobody')).toEqual([]);
    expect(META().getScreeningSummary('nobody')).toMatchObject({ student: 'nobody', probeCount: 0, activities: [] });
    expect(META().getRTITier('nobody')).toBeNull();
  });
  it('reads probe history and summarizes the latest record per activity', () => {
    localStorage.setItem('alloflow_probe_history', JSON.stringify({ Robin: [
      { activity: 'orf', grade: '3', wcpm: 40, timestamp: 1000 },
      { activity: 'orf', grade: '3', wcpm: 55, timestamp: 2000 },
      { activity: 'math', grade: '3', itemsPerMin: 20, timestamp: 1500 }
    ] }));
    expect(META().getStudentProbeHistory('Robin').length).toBe(3);
    const sum = META().getScreeningSummary('Robin');
    expect(sum.probeCount).toBe(3);
    expect(sum.byActivity.orf.wcpm).toBe(55); // latest by timestamp
    expect(sum.activities.slice().sort()).toEqual(['math', 'orf']);
  });
  it('getRTITier interprets latest probes and returns the most concerning tier', () => {
    // timestamp 2000ms → Jan 1970 → winter. ORF g3 winter bench 92: 40 → 43% → Tier 3.
    // math_dcpm g3 winter bench 35: 35 → 100% → Tier 1. Worst across probes = 3.
    localStorage.setItem('alloflow_probe_history', JSON.stringify({ Robin: [
      { activity: 'orf', grade: '3', wcpm: 40, timestamp: 2000 },
      { activity: 'math_dcpm', grade: '3', itemsPerMin: 35, timestamp: 2000 }
    ] }));
    const rti = META().getRTITier('Robin');
    expect(rti).toBeTruthy();
    expect(rti.tier).toBe(3);
    expect(rti.perProbe.length).toBe(2);
  });
  it('buildReportWriterExport assembles a payload + fact chunks and emits it', () => {
    localStorage.setItem('alloflow_probe_history', JSON.stringify({ Robin: [{ activity: 'orf', grade: '3', wcpm: 40, timestamp: 2000 }] }));
    try { localStorage.removeItem('alloflow_intervention_logs'); } catch (e) {}
    let emitted = null;
    const handler = (e) => { emitted = e.detail; };
    window.addEventListener('alloRTIExportReady', handler);
    const payload = META().buildReportWriterExport('Robin');
    window.removeEventListener('alloRTIExportReady', handler);
    expect(payload).toMatchObject({ source: 'AssessmentCenter', student: 'Robin' });
    expect(payload.rtiTier.tier).toBe(3);
    // IEP contract the Report Writer ingest depends on (prePopulatedSections keys
    // must match the 'IEP-Ready Packet' blueprint section names).
    expect(payload.studentNickname).toBe('Robin');
    expect(payload.targetSectionName).toBe('RTI / CBM Screening & Benchmark Summary');
    expect(typeof payload.prePopulatedSections['RTI / CBM Screening & Benchmark Summary']).toBe('string');
    expect(payload.prePopulatedSections['RTI / CBM Screening & Benchmark Summary'].length).toBeGreaterThan(0);
    expect(payload.prePopulatedSections).toHaveProperty('Intervention Summary');
    expect(payload.prePopulatedSections).toHaveProperty('Dynamic Assessment Findings');
    // Trendline series for the IEP progress-monitoring SVG (score points + benchmark).
    expect(Array.isArray(payload.trendSeries)).toBe(true);
    const orf = payload.trendSeries.find(s => s.activity === 'orf');
    expect(orf).toBeTruthy();
    expect(orf.benchmark).toBe(92); // ORF grade 3 winter 50th-%ile
    expect(orf.points.length).toBe(1);
    expect(orf.points[0].value).toBe(40);
    expect(payload.factChunks.length).toBeGreaterThan(0);
    expect(payload.caveat).toMatch(/not an eligibility determination/);
    expect(window.__alloRTIExport).toBe(payload);
    expect(emitted).toMatchObject({ student: 'Robin' });
  });
  it('buildReportWriterExport never throws for an unknown student', () => {
    try { localStorage.removeItem('alloflow_probe_history'); } catch (e) {}
    expect(() => META().buildReportWriterExport('ghost', { emit: false })).not.toThrow();
    const p = META().buildReportWriterExport('ghost', { emit: false });
    expect(p.student).toBe('ghost');
    expect(p.rtiTier).toBeNull();
  });
  it('getTrendSeries caps to 12 points and overlays an aimline for ORF when a goal exists', () => {
    const base = Date.parse('2026-01-08');
    const probes = Array.from({ length: 14 }, (_, i) => ({ activity: 'orf', grade: '3', wcpm: 30 + i, timestamp: base + i * 7 * 24 * 3600 * 1000 }));
    localStorage.setItem('alloflow_probe_history', JSON.stringify({ Robin: probes }));
    localStorage.setItem('alloflow_rti_goals', JSON.stringify({ Robin: { baseline: 30, target: 90, baselineDate: '2026-01-01', targetDate: '2026-04-01' } }));
    const orf = META().getTrendSeries('Robin').find(s => s.activity === 'orf');
    expect(orf.points.length).toBe(12);          // capped from 14
    expect(Array.isArray(orf.aimline)).toBe(true);
    expect(orf.aimline.length).toBe(12);
    expect(orf.goal).toMatchObject({ baseline: 30, target: 90 });
    expect(typeof orf.benchmark).toBe('number'); // ORF g3 winter benchmark
  });
  it('getTrendSeries has no aimline when no goal is set', () => {
    try { localStorage.removeItem('alloflow_rti_goals'); } catch (e) {}
    localStorage.setItem('alloflow_probe_history', JSON.stringify({ Robin: [{ activity: 'orf', grade: '3', wcpm: 40, timestamp: 2000 }] }));
    const orf = META().getTrendSeries('Robin').find(s => s.activity === 'orf');
    expect(orf.aimline).toBeNull();
  });
});

describe('calculateAimline — RTI decision-rule thresholds (P2-4)', () => {
  const goal = { baseline: 10, target: 40, baselineDate: '2026-01-01', targetDate: '2026-04-01' };
  // All points value 0 are below the aimline (baseline 10, rising), so consecutiveBelow == n.
  const belowPoints = (n) => Array.from({ length: n }, (_, i) => ({ date: '2026-01-' + String(8 + i * 3).padStart(2, '0'), value: 0 }));
  it('is exposed on the test seam', () => {
    expect(typeof SAI.calculateAimline).toBe('function');
  });
  it('default (no threshold) reproduces the fixed 4-warn / 6-change rule EXACTLY', () => {
    expect(SAI.calculateAimline(goal, belowPoints(3)).alert).toBe('ok');
    expect(SAI.calculateAimline(goal, belowPoints(4)).alert).toBe('warning');
    expect(SAI.calculateAimline(goal, belowPoints(6)).alert).toBe('critical');
    expect(SAI.calculateAimline(goal, belowPoints(6))).toMatchObject({ warnThreshold: 4, changeThreshold: 6, consecutiveBelow: 6 });
  });
  it('picker threshold shifts when warning/critical fire', () => {
    // threshold 6 → warn@6 / change@8: 6 consecutive below is only a WARNING now.
    expect(SAI.calculateAimline(goal, belowPoints(6), 6).alert).toBe('warning');
    // threshold 2 → warn@2 / change@4: 4 consecutive below is CRITICAL.
    expect(SAI.calculateAimline(goal, belowPoints(4), 2).alert).toBe('critical');
  });
});
