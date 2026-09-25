// Behavior Lens exports: order, units and windows.
//
// WHY: until 2026-09-24
// - The toolbar session CSV read `count` and `rate` off every record: a Session Data
//   Tracker session exported an empty row, a duration record its seconds as "Count"
//   and 0 as "Rate", a latency record its trial count as "Count" and seconds as "Rate".
// - The Observation panel's copy/download read `s.type` (sessions have `method`): every
//   row was "Type:  |" with no result, saved unescaped as .csv.
// - Exports listed entries in STORED order, which is mixed (the form prepends, imports
//   append, a snapshot merge sorts oldest first). IEP prep, IEP goals, the hub list and
//   the profile prompt took "the first/last N" sessions, which after a merge were the
//   oldest ones.
// - "Last 7 days" in the export panel was a rolling 168 hours (a partial 8th day came
//   along), unlike the progress report's calendar days; latency results were blank and
//   an interval result "3/10" opens in a spreadsheet as 10 March.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  behaviorLensRuntime();
});
const src = readFileSync('behavior_lens_module.js', 'utf8');
const readers = () => window.AlloModules.BehaviorLensEntryReaders;
const flush = () => new Promise(r => setTimeout(r, 0));
// A small CSV reader: quoted fields may hold commas and doubled quotes.
function rows(csv) {
  const out = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) { if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); out.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out;
}

describe('session CSV', () => {
  const sessions = [
    { id: 'old', date: '2026-09-20T14:00:00Z', behavior: 'Latency Recording', measurementType: 'latency', value: 3.2, count: 5, unit: 'seconds', source: 'latency-recorder', phase: 'Latency' },
    // 00:30Z on the 24th is 20:30 on the 23rd in New York.
    { id: 'new', date: '2026-09-24T00:30:00Z', durationSec: 600, targets: [{ name: 'Call-outs', type: 'frequency', count: 10, rate: 1 }] },
    { id: 'mid', date: '2026-09-22T14:00:00Z', behavior: 'Out of seat', measurementType: 'duration', value: 300, count: 300, rate: 0, source: 'observation-duration', phase: 'Observation' },
  ];
  it('one row per measurement, with its type and unit, newest first on the local day', () => {
    const r = rows(readers().buildSessionCsv(sessions));
    expect(r[0]).toEqual(['Date', 'Behavior', 'Measure', 'Value', 'Unit', 'Count', 'Rate per minute', 'Total duration (s)', 'Percent', 'Phase', 'Session length (s)', 'Source']);
    expect(r.slice(1).map(x => x[1])).toEqual(['Call-outs', 'Out of seat', 'Latency Recording']);
    expect(r[1].slice(0, 7)).toEqual(['2026-09-23', 'Call-outs', 'frequency', '1', 'per_minute', '10', '1']);   // was an empty row
    expect(r[2].slice(2, 6)).toEqual(['duration', '300', 'seconds', '']);                // not "Count 300, Rate 0"
    expect(r[3].slice(2, 6)).toEqual(['latency', '3.2', 'seconds', '5']);                // trials stay a count; seconds are the value
  });
  it('observation CSV names the method and its result, latency included', () => {
    const csv = readers().buildObservationCsv([
      { id: 'a', method: 'latency', timestamp: '2026-09-21T14:00:00Z', duration: 300, data: { latencySeconds: 4.5 }, notes: 'Said "no", then started' },
      { id: 'b', method: 'interval', timestamp: '2026-09-22T14:00:00Z', duration: 600, data: { occurredCount: 3, completedCount: 10 } },
    ]);
    const r = rows(csv);
    expect(r[1][2]).toBe('interval');
    expect(r[1][3]).toBe('interval recording, 3 of 10 intervals with the behavior over 10:00');
    expect(r[2][3]).toBe('latency, 4.5 s over 5:00');
    expect(r[2][5]).toBe('Said "no", then started');                                     // escaped, one cell
  });
});

describe('observation order', () => {
  it('newest first however the list was stored', () => {
    const { observationSessionsNewestFirst } = window.AlloModules.BehaviorLensObservationOrder;
    const merged = [{ id: 1, timestamp: '2026-09-01T10:00:00Z' }, { id: 2, timestamp: '2026-09-02T10:00:00Z' }, { id: 3, timestamp: '2026-09-03T10:00:00Z' }];
    expect(observationSessionsNewestFirst([{ id: 4, timestamp: '2026-09-04T10:00:00Z' }, ...merged]).map(s => s.id)).toEqual([4, 3, 2, 1]);
  });
  it('IEP prep sends the newest sessions after a merge stored them oldest first', async () => {
    let sent = '';
    const sessions = [1, 2, 3, 4].map(i => ({ method: 'frequency', timestamp: new Date(2026, 8, i, 10).toISOString(), data: { totalCount: 100 + i } }));
    sessions.unshift({ method: 'frequency', timestamp: new Date(2026, 8, 5, 10).toISOString(), data: { totalCount: 105 } });   // a new save, prepended
    const q = componentHarness('IEPPrepGenerator', { studentName: 'Kestrel', abcEntries: [{ id: 'a', antecedent: 'A', behavior: 'B', consequence: 'C', intensity: 2, occurredAt: '2026-09-20T14:00:00Z', timestamp: '2026-09-20T14:00:00Z' }], observationSessions: sessions, aiAnalysis: null, graphExport: null, effectSizeResults: null, setActivePanel: () => {}, callGemini: async p => { sent = p; return 'ok'; }, t: () => undefined, addToast: () => {} }, { DualLabel: text => text });
    await q.all(n => n.type === 'button' && n.props.onClick && /Generate|Prep/i.test(q.text(n)) && !n.props.disabled)[0].props.onClick(); await flush();
    for (const n of [105, 104, 103]) expect(sent).toContain(n + ' occurrences');
    expect(sent).not.toContain('101 occurrences');
  });
  it('the other readers use the same order', () => {
    expect(src).not.toMatch(/observationSessions \|\| \[\]\)\.slice\(-5\)/);
    expect(src).toContain('observationSessionsNewestFirst(observationSessions).slice(0, 5).map(session =>');
    expect(src).toContain('const sessionLines = observationSessionsNewestFirst(observationSessions).slice(0, 5)');
    expect(src).not.toContain("Type: ${s.type || ''}");
  });
});

describe('export panel', () => {
  let saved;
  const realBlob = globalThis.Blob, realCreate = URL.createObjectURL, realRevoke = URL.revokeObjectURL, realClick = HTMLAnchorElement.prototype.click;
  afterEach(() => { globalThis.Blob = realBlob; URL.createObjectURL = realCreate; URL.revokeObjectURL = realRevoke; HTMLAnchorElement.prototype.click = realClick; });
  function exportCsv(abcEntries, observationSessions, range) {
    saved = null;
    globalThis.Blob = function (parts) { saved = parts.join(''); };
    URL.createObjectURL = () => 'blob:x'; URL.revokeObjectURL = () => {}; HTMLAnchorElement.prototype.click = () => {};
    const q = componentHarness('ExportPanel', { abcEntries, observationSessions, studentName: 'Kestrel', aiAnalysis: null, t: () => undefined, onOpenAlloSheetReview: () => {} }, { DualLabel: text => text });
    q.all(n => n.type === 'button' && n.props.key === 'csv')[0].props.onClick(); q.render();
    q.all(n => n.type === 'button' && n.props.key === range)[0].props.onClick(); q.render();
    q.all(n => n.type === 'button' && /Export|Download/i.test(q.text(n)) && n.props.key == null)[0].props.onClick();
    return saved;
  }
  it('last 7 days is today and the six days before, newest first, with each result', () => {
    const day = (back, hh) => { const d = new Date(); d.setHours(hh, 0, 0, 0); d.setDate(d.getDate() - back); return d.toISOString(); };
    const e = (id, back, hh, behavior) => ({ id, antecedent: 'A', behavior, consequence: 'C', function: 'escape', intensity: 2, occurredAt: day(back, hh), timestamp: day(back, hh) });
    const csv = exportCsv([e('x', 7, 23, 'EIGHTH DAY'), e('y', 6, 1, 'SIXTH DAY BACK'), e('z', 0, 9, 'TODAY')],
      [{ id: 's', method: 'latency', timestamp: day(1, 10), duration: 120, data: { latencySeconds: 7 } }], 'week');
    expect(csv).not.toContain('EIGHTH DAY');                         // a rolling 168 hours kept it
    expect(csv.indexOf('TODAY')).toBeLessThan(csv.indexOf('SIXTH DAY BACK'));
    expect(csv).toContain('"escape"');                               // the function column
    expect(csv).toContain('"latency, 7 s over 2:00"');               // latency was blank
  });
});
