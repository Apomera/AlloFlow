// Behavior Lens AI analysis: when it counts as current, what a reply must hold, and the alerts.
//
// WHY: until 2026-09-24
// - An analysis read as out of date after any reload: a reload turns the entries' free-text
//   behavior labels into targets, and the fingerprint included the targets.
// - The reply parse took an array, {} or unrelated JSON as an analysis (an empty card replaced
//   the saved one), took any text as the function ("Escape-maintained" did not match Escape, and
//   anything unknown was drawn as Attention), and dropped patterns written as sentences.
// - The clinical progress report printed pattern objects as raw JSON.
// - The analysis sample always began with an undated entry, and its method was described as
//   "stratified across the date range" (the picks are evenly spaced through the records).
// - A saved entry with no date read as 1 January 1970 in the alerts, so the average rate was
//   near zero and any 3 recent entries were a "spike"; an empty date turned the check off.
// - "Intensity has increased" fired on any 3 of the last 4 steps, dips included.
// - A dismissed alert never came back, whatever the data did next.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let R, A, reply;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  R = behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  A = window.AlloModules.BehaviorLensAlerts;
  reply = window.AlloModules.BehaviorLensAnalysisReply;
  if (!A || !reply) throw new Error('Behavior Lens helpers did not register');
});
const realOpen = window.open;
afterEach(() => { window.open = realOpen; });

const iso = (d, hh = 9) => new Date(Date.UTC(2026, 8, d, hh)).toISOString();
const entry = (id, d, extra) => Object.assign({ id, antecedent: 'Math task', behavior: 'Yelled at peer', consequence: 'Break', intensity: 3, occurredAt: iso(d), timestamp: iso(d), timezoneOffset: 240 }, extra);
const formEntries = () => [entry('a1', 20), entry('a2', 21, { behavior: 'Left seat' }), entry('a3', 22)].map(e => R.normalizeAbcEntry(e, { targetBehaviors: [] }).entry);

describe('is the saved analysis current?', () => {
  it('an analysis stays current across a reload', () => {
    const entries = formEntries();
    const analysis = { summary: 'x', provenance: R.createAnalysisProvenance(entries, null, iso(23), []) };
    const reloaded = R.normalizeWorkspace({ abcEntries: entries, targetBehaviors: [], aiAnalysis: analysis });
    expect(reloaded.targetBehaviors.map(t => t.label)).toEqual(['Yelled at peer', 'Left seat']);   // what the reload adds
    expect(R.isAnalysisStale(analysis, reloaded.abcEntries, reloaded.targetBehaviors)).toBe(false);   // was true
    expect(R.isAnalysisStale(analysis, [...reloaded.abcEntries, entry('a4', 23)], reloaded.targetBehaviors)).toBe(true);
    expect(R.isAnalysisStale(analysis, reloaded.abcEntries.map(e => e.id === 'a2' ? { ...e, intensity: 5 } : e), reloaded.targetBehaviors)).toBe(true);
  });
  it('...also when the student has defined targets of their own', () => {
    const entries = formEntries();
    const defined = [{ id: 'requests-help', label: 'Requests help', operationalDefinition: 'Raises a hand or shows a help card.' }];
    const analysis = { summary: 'x', provenance: R.createAnalysisProvenance(entries, null, iso(23), defined) };
    const reloaded = R.normalizeWorkspace({ abcEntries: entries, targetBehaviors: defined, aiAnalysis: analysis });
    expect(reloaded.targetBehaviors.map(t => t.label)).toEqual(['Requests help', 'Yelled at peer', 'Left seat']);
    expect(R.isAnalysisStale(analysis, reloaded.abcEntries, reloaded.targetBehaviors)).toBe(false);   // was true
  });
  it('defining a new target changes what an analysis ran on, even for the same entries', () => {
    const entries = formEntries();
    const before = R.dataFingerprint(entries, []);
    expect(R.dataFingerprint(entries, [{ id: 'requests-help', label: 'Requests help' }])).not.toBe(before);
    expect(R.dataFingerprint(entries, [])).toBe(before);
  });
  it('an analysis saved before this change is read the way it was saved', () => {
    const entries = formEntries();
    const saved = { summary: 'x', provenance: { sourceFingerprint: R.legacyDataFingerprint(entries, []) } };
    const reloaded = R.normalizeWorkspace({ abcEntries: entries, targetBehaviors: [] });
    expect(R.isAnalysisStale(saved, reloaded.abcEntries, reloaded.targetBehaviors)).toBe(false);
    expect(R.isAnalysisStale(saved, [...reloaded.abcEntries, entry('a4', 23)], reloaded.targetBehaviors)).toBe(true);
  });
  it('the sample starts with the oldest dated entry and says how it was chosen', () => {
    const dated = Array.from({ length: 30 }, (_, i) => entry('d' + i, 1 + (i % 28), { occurredAt: new Date(Date.UTC(2026, 7, 1, 12) + i * 86400000).toISOString() }));
    const sample = R.selectStratifiedEntries([{ ...entry('u1', 1), occurredAt: null, timestamp: null }, ...dated], 10);
    expect(sample.entries[0].id).toBe('d0');                                 // was the undated one
    const basis = reply.blAnalysisBasisText({ totalEntries: 31, sampleCount: 10, sampleStrategy: sample.strategy, dateFrom: dated[0].occurredAt, dateTo: dated[29].occurredAt });
    expect(basis).toMatch(/^Based on 10 of 31 entries, entries spread evenly through the records in time order, recorded 2026-08-0\d to 2026-08-3\d\.$/);
    expect(basis).not.toContain('stratified');
  });
});

describe('what an analysis reply must hold', () => {
  const norm = parsed => reply.normalizeAiAnalysisReply(parsed, { sourceFingerprint: 'fp' });
  it('an empty or unrelated reply is not an analysis', () => {
    for (const bad of [[], {}, { foo: 1 }, { summary: '  ', patterns: [], recommendations: [] }, 'text', null]) expect(norm(bad)).toBe(null);
  });
  it('the function is one of the named ones when the model means one', () => {
    const fn = text => norm({ summary: 's', hypothesizedFunction: text }).hypothesizedFunction;
    expect(fn('Escape-maintained (avoiding math)')).toBe('Escape');
    expect(fn('attention')).toBe('Attention');
    expect(fn('Access to tangibles')).toBe('Tangible');
    expect(fn('Automatic reinforcement')).toBe('Sensory');
    expect(fn('Escape and attention')).toBe('Multiple');
    expect(fn('Insufficient data')).toBe('Unknown');
    expect(fn('Communication of pain')).toBe('Communication of pain');   // kept as said, drawn neutral
  });
  it('keeps patterns written as sentences, and a missing confidence stays missing', () => {
    const a = norm({ summary: 's', patterns: ['Mostly during math', { pattern: 'After transitions', frequency: '4 of 12' }, 7], confidence: '' });
    expect(a.patterns.map(p => p.pattern)).toEqual(['Mostly during math', 'After transitions']);   // the sentence was dropped
    expect(a.confidence).toBe(null);
  });
  it('a pattern prints as words', () => {
    expect(reply.blPatternText({ pattern: 'After transitions', frequency: '4 of 12', evidence: 'entries 2, 5' })).toBe('After transitions (4 of 12) Evidence: entries 2, 5');
  });
});

describe('the clinical progress report', () => {
  it('prints each pattern as words, not JSON', () => {
    const pages = [];
    window.open = () => ({ document: { write: html => pages.push(html), close() {} }, print() {}, focus() {} });
    const analysis = { summary: 'Escape from math is likely.', hypothesizedFunction: 'Escape', confidence: 60, patterns: [{ pattern: 'After transitions', frequency: '4 of 12', evidence: '' }], recommendations: [] };
    const q = componentHarness('ProgressReportGenerator', { abcEntries: [entry('a1', 20)], observationSessions: [], sessionHistory: [], aiAnalysis: analysis, targetBehaviors: [], studentProfile: {}, selectedStudent: 'Kestrel', callGemini: null, addToast: () => {}, t: () => undefined, initialScope: null, onBackToReview: null }, { DualLabel: text => text });
    q.all(n => n.type === 'button' && n.props.onClick && /clinical/i.test(q.text(n)))[0].props.onClick(); q.render();
    const box = q.all(n => n.type === 'label' && /AI/.test(q.text(n)) && /Analysis/i.test(q.text(n)))[0].children.find(c => c.type === 'input');
    box.props.onChange(); q.render();
    q.all(n => n.props['aria-label'] === 'Generate Report')[0].props.onClick();
    const html = pages.join('');
    expect(html).toContain('After transitions (4 of 12)');
    expect(html).not.toContain('{&quot;pattern');                           // was the escaped JSON object
  });
});

describe('smart alerts', () => {
  const NOW = Date.UTC(2026, 8, 24, 12);
  const ids = list => A.computeSmartAlerts(list, { userRole: 'teacher', aiAnalysis: {}, now: NOW }).map(a => a.id);
  const at = (msAgo, id, extra) => Object.assign({ id, antecedent: 'a', behavior: 'b', consequence: 'c', intensity: 2, occurredAt: new Date(NOW - msAgo).toISOString(), timestamp: new Date(NOW - msAgo).toISOString() }, extra);
  const DAY = 86400000;
  it('an entry with no date does not make an ordinary week a spike', () => {
    const even = Array.from({ length: 10 }, (_, i) => at(i * DAY / 2 + 3600000, 'e' + i));       // 2 a day for 5 days
    expect(ids(even)).not.toContain('freq_spike');
    expect(ids([...even, at(0, 'n', { occurredAt: null, timestamp: null })])).not.toContain('freq_spike');   // was a spike (1970)
  });
  it('a real spike still shows when an entry has an empty date', () => {
    const month = Array.from({ length: 10 }, (_, i) => at((3 + i * 3) * DAY, 'm' + i));
    const burst = Array.from({ length: 5 }, (_, i) => at(i * 3600000 + 60000, 'b' + i));
    expect(ids([...month, ...burst])).toContain('freq_spike');
    expect(ids([...month, ...burst, at(0, 'x', { occurredAt: '', timestamp: '' })])).toContain('freq_spike');   // was switched off
  });
  it('intensity has to rise at each of the last three steps', () => {
    const series = levels => levels.map((level, i) => at((levels.length - i) * DAY, 's' + i, { intensity: level }));   // oldest first
    expect(ids(series([2, 3, 4, 5]))).toContain('intensity_up');
    expect(ids(series([2, 3, 5, 4, 5]))).not.toContain('intensity_up');       // a dip in between counted
    expect(ids(series([5, 4, 3, 2]))).toContain('intensity_down');
  });
  it('the BCBA alert counts the last 30 days, not every severe entry ever', () => {
    // Pass 7: with a year of data it was on for good ("1002 high-intensity incidents recorded").
    const old = Array.from({ length: 5 }, (_, i) => at((40 + i) * DAY, 'o' + i, { intensity: 5 }));
    expect(ids(old)).not.toContain('consult_bcba');
    const recent = Array.from({ length: 3 }, (_, i) => at((2 + i) * DAY, 'r' + i, { intensity: 4 }));
    const alert = A.computeSmartAlerts([...recent, ...old], { userRole: 'teacher', aiAnalysis: {}, now: NOW }).find(a => a.id === 'consult_bcba');
    expect(alert.msg).toMatch(/^3 high-intensity incidents in the last 30 days/);
  });
  it('a dismissal covers what the alert was about at the time', () => {
    const severe = n => Array.from({ length: n }, (_, i) => at((i + 1) * DAY, 'h' + i, { intensity: 5 }));
    const key = list => A.computeSmartAlerts(list, { userRole: 'teacher', aiAnalysis: {}, now: NOW }).find(a => a.id === 'consult_bcba').dismissKey;
    expect(key(severe(3))).not.toBe(key([at(DAY / 2, 'newer', { intensity: 5 }), ...severe(3)]));   // a new severe incident brings it back
    const old = [at(20 * DAY, 'o1')], later = [at(9 * DAY, 'o2'), ...old];
    const staleKey = list => A.computeSmartAlerts(list, { userRole: 'teacher', aiAnalysis: {}, now: NOW }).find(a => a.id === 'stale').dismissKey;
    expect(staleKey(old)).not.toBe(staleKey(later));
  });
});
