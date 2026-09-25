// Behavior Lens: entries recorded with a date and no time.
//
// WHY: a date-only import and notes that state no time are marked `timeNotStated` (pass 7),
// but until 2026-09-24 every time-of-day view still put them at midnight: the Overview's hour
// chart and "peak time", the trend dashboard's early block, the FBA report grid (counted as
// "outside 7:00-18:59"), the scatterplot, and the exported and displayed times ("12:00 AM").
// Predictive Insights also took the day of the week from the viewer's clock and the save time.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { componentHarness, componentSource, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
});
const realOpen = window.open;
afterEach(() => { window.open = realOpen; });
const src = readFileSync('behavior_lens_module.js', 'utf8');
const hostIcons = name => Object.fromEntries([...componentSource(name).matchAll(/h\(([A-Z][A-Za-z0-9]*)\s*,/g)].map(m => m[1])
  .filter(id => !src.includes('const ' + id + ' =') && !src.includes('function ' + id + '(')).map(id => [id, 'span']));
// Monday 21 Sep 2026.
const local = (d, hh, mm = 0) => new Date(2026, 8, d, hh, mm);
const timed = (id, d, hh, extra) => Object.assign({ id, antecedent: 'Math task', behavior: 'Yelled', consequence: 'Break', intensity: 2, occurredAt: local(d, hh).toISOString(), timestamp: local(d, hh).toISOString(), timezoneOffset: local(d, hh).getTimezoneOffset(), setting: 'Room 4' }, extra);
const untimed = (id, d, extra) => timed(id, d, 0, Object.assign({ metadata: { timeNotStated: true }, setting: 'Room 4' }, extra));

describe('the hour of an entry', () => {
  it('is left empty when no time was recorded, and the day is kept', () => {
    const { abcEntryLocalParts } = window.AlloModules.BehaviorLensScatterplot;
    expect(abcEntryLocalParts(untimed('u', 21))).toEqual({ dow: 1, hour: null });     // was hour 0
    expect(abcEntryLocalParts(timed('t', 21, 10))).toEqual({ dow: 1, hour: 10 });
  });
  it('the scatterplot counts them apart', () => {
    const r = window.AlloModules.BehaviorLensScatterplot.scatterplotFromEntries([untimed('u', 21), timed('t', 21, 10)], '');
    expect(r).toMatchObject({ included: 1, outside: 0, untimed: 1 });       // was "outside Mon-Fri 7 AM-7 PM"
  });
});

describe('times shown and exported', () => {
  it('the toolbar CSV leaves the time blank, not 12:00 AM', () => {
    const csv = window.AlloModules.BehaviorLensEntryReaders.buildAbcCsv([untimed('u', 21)]);
    expect(csv.split('\n')[1].split(',').slice(0, 2)).toEqual(['"2026-09-21"', '""']);
  });
  it('the ABC log says no time was recorded', () => {
    const q = componentHarness('ABCDataPanel', { entries: [untimed('u', 21)], setEntries: () => {}, studentName: 'Kestrel', onAnalyze: () => {}, analyzing: false, t: () => undefined, addToast: () => {}, targetBehaviors: [], setTargetBehaviors: () => {}, deletedEntries: [], setDeletedEntries: () => {}, appendAuditEvent: () => {}, userRole: 'teacher' },
      { DualLabel: text => text, ...hostIcons('ABCDataPanel') });
    expect(q.text()).toContain('No time recorded');
    expect(q.text()).not.toContain('12:00 AM');
  });
});

describe('time-of-day views', () => {
  it('the Overview peak time comes from timed entries', () => {
    const entries = [untimed('u1', 21), untimed('u2', 22), untimed('u3', 23), timed('t1', 21, 10), timed('t2', 22, 10)];
    const q = componentHarness('OverviewPanel', { abcEntries: entries, observationSessions: [], aiAnalysis: null, studentName: 'Kestrel', targetBehaviors: [], t: () => undefined },
      { __durable: { observationReviewFilters: { dateRange: 0, targetId: '' } }, DualLabel: text => text });
    expect(q.text()).toContain('10:00-11:00 in Room 4');                   // was 0:00-1:00, from the three with no time
    expect(q.text()).not.toContain('0:00-1:00');
  });
  it('the trend dashboard leaves them out of its time blocks and says so', () => {
    const q = componentHarness('BehaviorTrendDashboard', { abcEntries: [untimed('u1', 21), untimed('u2', 21), timed('t', 21, 10)], observationSessions: [], targetBehaviors: [], t: () => undefined }, { DualLabel: text => text, ...hostIcons('BehaviorTrendDashboard') });
    q.all(n => n.type === 'button' && n.props.key === 'heatmap')[0].props.onClick(); q.render();
    const monday = q.all(n => n.type === 'tr' && n.children[0] && q.text(n.children[0]) === 'Mon')[0];
    expect(monday.children.slice(1).map(td => q.text(td))).toEqual(['0', '1', '0', '0']);   // was 2 before 9 AM
    expect(q.byAttr('data-bl-trend-untimed', 2)).toHaveLength(1);
  });
  it('the FBA report grid names them instead of calling them out of hours', () => {
    const pages = [];
    window.open = () => ({ document: { write: html => pages.push(html), close() {} }, print() {}, focus() {} });
    const q = componentHarness('ExportPanel', { abcEntries: [untimed('u', 21), timed('t', 21, 10)], observationSessions: [], studentName: 'Kestrel', aiAnalysis: null, t: () => undefined, onOpenAlloSheetReview: () => {} }, { DualLabel: text => text });
    q.all(n => n.type === 'button' && /IEP-Ready FBA Report/.test(q.text(n)))[0].props.onClick();
    const html = pages.join('');
    expect(html).toContain('1 entry with no time recorded is not shown.');
    expect(html).not.toContain('outside 7:00-18:59 is not shown');         // was counted there
  });
  it('the portfolio PDF gives each session result as the exports do', () => {
    // Pass 8: one count in 40 minutes printed "1 (0/min)", and a latency session printed a dash.
    const pages = [];
    window.open = () => ({ document: { write: html => pages.push(html), close() {} }, print() {}, focus() {} });
    const sessions = [
      { id: 'f', method: 'frequency', timestamp: local(21, 9).toISOString(), duration: 2400, data: { count: 1, rate: 0 } },
      { id: 'l', method: 'latency', timestamp: local(22, 9).toISOString(), duration: 30, data: { latencyMs: 4200, latencySeconds: 4.2 } }
    ];
    const q = componentHarness('ExportPanel', { abcEntries: [timed('t', 21, 10)], observationSessions: sessions, studentName: 'Kestrel', aiAnalysis: null, t: () => undefined, onOpenAlloSheetReview: () => {} }, { DualLabel: text => text });
    q.all(n => n.type === 'button' && /Portfolio/.test(q.text(n)))[0].props.onClick();
    const html = pages.join('');
    expect(html).toContain('frequency count, 1 occurrences');
    expect(html).toContain('latency, 4.2 s');
    expect(html).not.toContain('(0/min)');
  });
  it('Predictive Insights takes the day from the recorder\'s clock', () => {
    // 15:30 UTC on Monday is 00:30 Tuesday in Tokyo (offset -540), where these were recorded.
    const tokyo = i => ({ id: 'k' + i, antecedent: 'A', behavior: 'B', consequence: 'C', intensity: 2, occurredAt: '2026-09-21T15:30:00.000Z', timestamp: '2026-09-21T16:00:00.000Z', timezoneOffset: -540 });   // saved at noon Monday here
    const q = componentHarness('PredictiveInsights', { abcEntries: [0, 1, 2, 3].map(tokyo), callGemini: null, t: () => undefined, addToast: () => {} }, { DualLabel: text => text, ...hostIcons('PredictiveInsights') });
    expect(q.text()).toContain('Tuesday has the most incidents (4 of 4)');   // was Monday on this machine's clock
  });
});
