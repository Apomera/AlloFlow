// Behavioral tests for the shipped assessment reference engine and review groups.
// Norm compatibility, numeric validity, exports and educator-review boundaries.
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

const reviewedORF = (overrides = {}) => ({
  activity: 'orf', grade: '3', timestamp: Date.parse('2026-01-20'),
  benchmarkContext: {
    referenceId: 'hasbrouck-tindal-2017-orf', measure: 'orf', unit: 'wcpm',
    grade: '3', season: 'winter', language: 'en', durationSeconds: 60,
    material: 'unpracticed-grade-level', scoring: 'standardized',
    reviewedByEducator: true, formId: 'reviewed-external-form', ...overrides
  }
});

describe('reviewed ORF reference and conservative interpretation', () => {
  it('uses the published 2017 medians and leaves first-grade fall unavailable', () => {
    expect(SAI.CBM_NORMS.orf).toEqual({
      '1': { fall: null, winter: 29, spring: 60 }, '2': { fall: 50, winter: 84, spring: 100 },
      '3': { fall: 83, winter: 97, spring: 112 }, '4': { fall: 94, winter: 120, spring: 133 },
      '5': { fall: 121, winter: 133, spring: 146 }, '6': { fall: 132, winter: 145, spring: 146 }
    });
    expect(Object.keys(SAI.CBM_NORMS)).toEqual(['orf']);
  });
  it.each(['math', 'math_dcpm', 'missing_number', 'quantity_discrimination', 'nwf', 'nwf_cls', 'lnf', 'orf_decodable', 'bogus', '__proto__'])('keeps %s descriptive without a validated compatible reference', type => {
    expect(SAI.interpretProbeResult(type, 20, '3', 'winter', reviewedORF())).toMatchObject({ tier: 0, comparisonAvailable: false, benchmark50: null, reviewRequired: true });
  });
  it('does not relabel missing-number, quantity or generic item scores as DCPM', () => {
    for (const type of ['math', 'missing_number', 'quantity_discrimination']) expect(SAI.normTypeFor(type)).toBe(type);
  });
  it('requires record-level administration evidence even for a known reference', () => {
    const r = SAI.interpretProbeResult('orf', 40, '3', 'winter');
    expect(r).toMatchObject({ tier: 0, comparisonAvailable: false, benchmark50: null, reference: null });
    expect(r.interpretation).toMatch(/descriptive practice data/);
  });
  it.each([
    { unit: 'items_correct' }, { referenceId: 'other-edition' }, { measure: 'nwf' },
    { grade: '4' }, { season: 'spring' }, { language: 'es' }, { durationSeconds: 30 },
    { material: 'decodable' }, { scoring: 'ai-estimate' }, { reviewedByEducator: false }, { formId: '' }
  ])('rejects incompatible administration metadata %j', change => {
    expect(SAI.interpretProbeResult('orf', 40, '3', 'winter', reviewedORF(change)).comparisonAvailable).toBe(false);
  });
  it.each([NaN, Infinity, -1, null, undefined, '', '40'])('rejects invalid score %s', score => {
    expect(SAI.interpretProbeResult('orf', score, '3', 'winter', reviewedORF()).benchmark50).toBeNull();
  });
  it.each([[null, 'winter'], ['3', null], ['9', 'winter'], ['__proto__', 'winter'], ['3', 'invalid'], ['1', 'fall']])('does not invent reference data for %s / %s', (grade, season) => {
    expect(SAI.interpretProbeResult('orf', 0, grade, season, reviewedORF({grade,season}))).toMatchObject({ tier: 0, benchmark50: null, pctOfBenchmark: null });
  });
  it('compares a reviewed compatible record without assigning intervention tiers', () => {
    const low = SAI.interpretProbeResult('orf', 40, '3', 'winter', reviewedORF());
    const at = SAI.interpretProbeResult('orf', 97, '3', 'winter', reviewedORF());
    expect(low).toMatchObject({ tier: 0, comparisonAvailable: true, benchmark50: 97, pctOfBenchmark: 41, comparisonBand: 'below-reference' });
    expect(at).toMatchObject({ tier: 0, pctOfBenchmark: 100, comparisonBand: 'at-or-above-reference' });
    expect(low.reference).toMatchObject({id: 'hasbrouck-tindal-2017-orf', unit: 'wcpm', grade: '3', season: 'winter'});
    expect(low.interpretation).toMatch(/not a percentile rank or an intervention tier/);
    expect(low.recommendations.join(' ')).not.toMatch(/Begin Tier|referral|immediately/);
  });
  it('keeps a genuine zero score and rejects interrupted, decodable or mismatched records', () => {
    expect(SAI.interpretProbeResult('orf', 0, '3', 'winter', reviewedORF())).toMatchObject({pctOfBenchmark:0, tier:0});
    for(const change of [{validForComparison:false}, {activity:'orf_decodable'}, {wcpm:90}]) {
      expect(SAI.interpretProbeResult('orf',40,'3','winter',{...reviewedORF(),...change}).comparisonAvailable).toBe(false);
    }
  });
  it('renders the unavailable explanation instead of hiding it', () => {
    const ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
    const html=ReactDOMServer.renderToStaticMarkup(SAI.renderProbeInterpretation('nwf_cls',5,'K','winter'));
    expect(html).toContain('Reference comparison unavailable');
    expect(html).toContain('Descriptive result');
    expect(html).not.toContain('null%');
  });
});

describe('classifyRTITier — RTI tier classification (real bytes, explicit thresholds)', () => {
  it('quizAvg below Tier-3 cut → Tier 3 Intensive', () => {
    const r = SAI.classifyRTITier({ quizAvg: 40, totalActivities: 5 }, T);
    expect(r).toMatchObject({ tier: 3, label: 'Review group 3 — priority review', color: '#dc2626', emoji: '🔴' });
  });
  it('quizAvg in instructional range → Tier 2 Strategic', () => {
    const r = SAI.classifyRTITier({ quizAvg: 70, totalActivities: 5 }, T);
    expect(r).toMatchObject({ tier: 2, label: 'Review group 2 — check supports', color: '#d97706', emoji: '🟡' });
  });
  it('strong profile → Tier 1 On Track with strength reasons', () => {
    const r = SAI.classifyRTITier({ quizAvg: 90, wsAccuracy: 90, totalActivities: 5, fluencyWCPM: 100 }, T);
    expect(r).toMatchObject({ tier: 1, label: 'Review group 1 — current supports', color: '#16a34a', emoji: '🟢' });
    expect(r.reasons).toContain('Strong quiz performance');
    expect(r.reasons).toContain('Fluency meets the practice review threshold');
  });
  it('critically low math fluency forces Tier 3', () => {
    const r = SAI.classifyRTITier({ quizAvg: 90, totalActivities: 5, mathDCPM: 10 }, T);
    expect(r.tier).toBe(3);
    expect(r.reasons.some((x) => /Math practice score below configured review threshold/.test(x))).toBe(true);
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

describe('reference metadata follows real stored records into exports', () => {
  it('preserves zero and correct-letter-sound scores across summaries and trends', () => {
    const meta=window.AlloModules.StudentAnalytics._meta;
    localStorage.setItem('alloflow_probe_history',JSON.stringify({Test:[
      {activity:'orf',grade:'3',wcpm:0,correct:90,timestamp:2000},
      {activity:'nwf',grade:'K',cls:0,correct:9,timestamp:2000},
      {activity:'math_dcpm',grade:'3',dcpm:28,correct:8,timestamp:2000}
    ]}));
    const out=meta.getRTITier('Test');
    expect(out.perProbe.map(p=>p.score)).toEqual([0,0,28]);
    expect(meta.getTrendSeries('Test').map(s=>s.points[0].value)).toEqual([0,0,28]);
    expect(meta.buildReportWriterExport('Test',{emit:false}).prePopulatedSections['RTI / CBM Screening & Benchmark Summary']).toContain('NWF: 0');
  });
  it('exposes a source-bound reference only on a matching reviewed record', () => {
    const meta=window.AlloModules.StudentAnalytics._meta;
    localStorage.setItem('alloflow_probe_history',JSON.stringify({Test:[{...reviewedORF(),wcpm:40}]}));
    expect(meta.getTrendSeries('Test')[0].benchmark).toBe(97);
    expect(meta.getRTITier('Test').perProbe[0].reference.id).toBe('hasbrouck-tindal-2017-orf');
    localStorage.setItem('alloflow_probe_history',JSON.stringify({Test:[{...reviewedORF(),wcpm:40,timestamp:null}]}));
    expect(meta.getTrendSeries('Test')[0].benchmark).toBeNull();
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
  it('getRTITier preserves legacy probe scores without inventing service placement', () => {
    // Old records remain descriptive; a legacy numeric tier is never invented.
    localStorage.setItem('alloflow_probe_history', JSON.stringify({ Robin: [
      { activity: 'orf', grade: '3', wcpm: 40, timestamp: 2000 },
      { activity: 'math_dcpm', grade: '3', itemsPerMin: 35, timestamp: 2000 }
    ] }));
    const rti = META().getRTITier('Robin');
    expect(rti).toBeTruthy();
    expect(rti.tier).toBe(0);
    expect(rti.reviewRequired).toBe(true);
    expect(rti.perProbe.every(p => !p.comparisonAvailable)).toBe(true);
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
    expect(payload.rtiTier.tier).toBe(0);
    expect(payload.factChunks.join(" ")).not.toMatch(/RTI screening tier|Tier 0/);
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
    expect(orf.benchmark).toBeNull(); // Legacy records lack verified reference compatibility.
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
    expect(orf.benchmark).toBeNull(); // Individual goals remain usable without a normative comparison.
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
  it('default (no threshold) keeps the 4-warn / 6-change thresholds', () => {
    expect(SAI.calculateAimline(goal, belowPoints(4)).alert).toBe('warning');
    expect(SAI.calculateAimline(goal, belowPoints(6)).alert).toBe('critical');
    expect(SAI.calculateAimline(goal, belowPoints(6))).toMatchObject({ warnThreshold: 4, changeThreshold: 6, consecutiveBelow: 6 });
  });
  it('below its minimum, four-point returns no verdict instead of a green one', () => {
    // CHANGED 2026-08-17, deliberately. This previously asserted 'ok' for three
    // points, and 'ok' renders as "On track toward goal" — for a student who was
    // below the aimline at EVERY measurement. Three points is simply too few to
    // apply a four-point rule; the honest answer is "no decision yet", so the
    // rule now declares a minimum and reports 'insufficient' under it. The
    // 4/6 thresholds themselves are untouched (see the test above).
    const a = SAI.calculateAimline(goal, belowPoints(3));
    expect(a.alert).toBe('insufficient');
    expect(a.minPoints).toBe(4);
    expect(a.detail).toContain('3 of 4 points');
    // The streak is still counted, so the banner can report it once earned.
    expect(a.consecutiveBelow).toBe(3);
  });
  it('picker threshold shifts when warning/critical fire', () => {
    // threshold 6 → warn@6 / change@8: 6 consecutive below is only a WARNING now.
    expect(SAI.calculateAimline(goal, belowPoints(6), 6).alert).toBe('warning');
    // threshold 2 → warn@2 / change@4: 4 consecutive below is CRITICAL.
    expect(SAI.calculateAimline(goal, belowPoints(4), 2).alert).toBe('critical');
  });
});
