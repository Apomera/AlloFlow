// Behavior Lens Snapshot Exchange import.
//
// WHY: until 2026-09-23 a snapshot's export included the family's home-log entries and
// the student's self-checks, but import merged only ABC entries and observations. A
// family's home log (the main thing a family sends) was DROPPED without a word, and a
// family file holding only home-log entries could not be merged at all (the button
// stayed disabled). The preview said the file's AI analysis was "Included"; it was
// never imported.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let SN;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  SN = window.AlloModules.BehaviorLensSnapshot;
  if (!SN) throw new Error('BehaviorLensSnapshot did not register');
});

const FAMILY_FILE = {
  alloflowSnapshot: true, version: '1.0', exportedAt: '2026-09-22T23:00:00.000Z', exportedBy: 'family', studentCodename: 'Brave Otter',
  behaviorLens: {
    abcEntries: [], observationSessions: [], aiAnalysis: { summary: 'family-side analysis' },
    homeLogEntries: [
      { id: 'h1', timestamp: '2026-09-22T11:30:00.000Z', context: 'Morning routine', behavior: 'Refused shoes', response: 'Offered choices', notes: '', mood: 'Challenging' },
      { id: 'h2', timestamp: '2026-09-21T23:10:00.000Z', context: 'Bedtime routine', behavior: 'Cried', response: '', notes: 'Tired', mood: 'Okay' },
      { id: 'bad', timestamp: 'yesterday', behavior: 'x' },
    ],
    selfCheckEntries: [{ id: 's1', timestamp: '2026-09-22T19:00:00.000Z', mood: '😊', happening: 'Math', feeling: 'ok', needed: 'break', nextTime: 'ask' }],
  },
};

describe('snapshotSideEntries', () => {
  it('keeps well-formed entries, drops duplicates, and counts the malformed', () => {
    const r = SN.snapshotSideEntries('homeLog', FAMILY_FILE.behaviorLens.homeLogEntries, [{ id: 'h2', timestamp: '2026-09-21T23:10:00.000Z' }], 'family');
    expect(r.fresh.map(e => e.id)).toEqual(['h1']);
    expect(r.rejected).toBe(1);
    expect(r.fresh[0]).toMatchObject({ behavior: 'Refused shoes', importedFrom: 'family' });
  });
  it('strips fields the log does not use', () => {
    const r = SN.snapshotSideEntries('selfCheck', [{ id: 's9', timestamp: '2026-09-22T19:00:00.000Z', mood: 'x', onclick: 'alert(1)' }], [], 'educator');
    expect(Object.keys(r.fresh[0]).sort()).toEqual(['feeling', 'happening', 'id', 'importedFrom', 'mood', 'needed', 'nextTime', 'timestamp']);
  });
});

describe('importing a family file', () => {
  it('brings in the home log and self-checks (they were dropped), newest first', async () => {
    const toasts = [];
    const q = componentHarness('SnapshotExchange', { studentName: 'Brave Otter', studentKey: k => k, abcEntries: [], observationSessions: [], aiAnalysis: null, setAbcEntries: () => {}, setObservationSessions: () => {}, t: () => undefined, addToast: m => toasts.push(m), callGemini: null },
      { __durable: { homeLog: [{ id: 'old', timestamp: '2026-09-01T12:00:00.000Z', behavior: 'Earlier', context: '', response: '', notes: '', mood: '' }], selfCheck: [] } });
    q.all(n => n.type === 'button' && /Import/.test(q.text(n)) && n.props['aria-pressed'] !== undefined)[0].props.onClick(); q.render();
    const input = q.all(n => n.props['aria-label'] === 'BehaviorLens snapshot JSON file')[0];
    input.props.onChange({ target: { files: [new File([JSON.stringify(FAMILY_FILE)], 'family.json', { type: 'application/json' })] } });
    await new Promise(r => setTimeout(r, 50)); q.render();
    expect(q.all(n => n.props['data-snapshot-home'] !== undefined)[0].props['data-snapshot-home']).toBe(2);
    expect(q.text(q.byAttr('data-snapshot-ai', 'true')[0])).toContain('not imported');       // old: "Included"
    const merge = q.all(n => n.props['aria-label'] === 'Merge Data')[0];
    expect(merge.props.disabled).toBe(false);                                                 // old: disabled, no ABC or observations
    merge.props.onClick(); q.render();
    expect(toasts.pop()).toBe('Merged 0 ABC entries, 0 observations, 2 home-log entries and 1 self-checks.');
    q.all(n => n.type === 'button' && /Export/.test(q.text(n)) && n.props['aria-pressed'] !== undefined)[0].props.onClick(); q.render();
    expect(q.text()).toContain('Home Log Entries (3)');
    expect(q.text()).toContain('Student Self-Check (1)');
  });
  it('mergeSnapshotSide keeps every entry, newest first', () => {
    // Since 2026-09-24 there is no 250 cap: the logs themselves have none, so the cap
    // silently deleted the oldest entries already here.
    const existing = Array.from({ length: 250 }, (_, i) => ({ id: 'e' + i, timestamp: new Date(Date.UTC(2026, 0, 1) + i * 60000).toISOString() }));
    const out = SN.mergeSnapshotSide(existing, [{ id: 'new', timestamp: '2026-09-22T12:00:00.000Z' }]);
    expect(out).toHaveLength(251);
    expect(out[0].id).toBe('new');
    expect(out.some(e => e.id === 'e0')).toBe(true);
  });
});
