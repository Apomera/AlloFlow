// Behavior Lens: bringing records in from files, snapshots, pasted text and other tools.
//
// WHY: until 2026-09-24
// - Spreadsheet dates were read with new Date(): "2026-09-10" became the evening of the 9th west
//   of UTC, "9/10/50" became 1950, "Sep 10" 2001, and an Excel serial number the year 45910.
// - Behavior Lens's own CSV exports did not import back: "Duration (s)" was dropped, the
//   formula-guard apostrophe stayed on notes, and the session table became row errors.
// - A snapshot matched records on the time alone (a different incident in the same minute was
//   skipped, an edited copy became a second record with the same id), merged them without
//   normalizing, dropped when a home incident happened, and cut the home log to 250 entries.
// - The home log's Export wrote a file Snapshot Exchange refused.
// - Pasted graph points replaced the graph without asking and lost their session numbers.
// - A blank cell in a pasted IOA column vanished, so the two records shifted and could score 100%.
// - A consent template replaced the form without asking and could drop the FERPA rights section.
// - A shared workspace said "Imported" while nothing was added.
// - An entry using a target's alias became its own target after a reload.
// - Notes over 3,000 characters were cut silently, and the rest cleared from the box.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { readFileSync } from 'node:fs';
import { componentHarness, componentSource, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let R, I, S;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  R = behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  I = window.AlloModules.BehaviorLensImport;
  S = window.AlloModules.BehaviorLensSnapshot;
  if (!I || !S) throw new Error('Behavior Lens import helpers did not register');
});
const flush = () => new Promise(r => setTimeout(r, 30));
const moduleSource = readFileSync('behavior_lens_module.js', 'utf8');
const hostIcons = name => Object.fromEntries([...componentSource(name).matchAll(/h\(([A-Z][A-Za-z0-9]*)\s*,/g)].map(m => m[1])
  .filter(id => !moduleSource.includes('const ' + id + ' =') && !moduleSource.includes('function ' + id + '(')).map(id => [id, 'span']));
const localDay = iso => { const d = new Date(iso); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function confirmEnv(answer) {
  const asked = [];
  return { asked, env: { askBehaviorLensConfirmation: async (m, o) => { asked.push(o.title); return answer; }, DualLabel: text => text } };
}

describe('dates from a spreadsheet', () => {
  const when = v => I.blParseImportedWhen(v);
  it('a date with no time is that day here, marked as having no time', () => {
    const w = when('2026-09-10');
    expect(localDay(w.iso)).toBe('2026-09-10');                          // was the 9th west of UTC
    expect(w.timeStated).toBe(false);
  });
  it('US, day-first dotted, and 12-hour times', () => {
    const us = new Date(when('9/10/2026 1:15 PM').iso);
    expect([localDay(us.toISOString()), us.getHours(), us.getMinutes()]).toEqual(['2026-09-10', 13, 15]);
    expect(localDay(when('10.09.2026').iso)).toBe('2026-09-10');          // was 9 October
    expect(new Date(when('2026-09-10 7:05 am').iso).getHours()).toBe(7);
  });
  it('an exact moment is kept as it is', () => {
    expect(when('2026-09-18T13:00:00.000Z').iso).toBe('2026-09-18T13:00:00.000Z');
  });
  it('a spreadsheet serial number is a date', () => {
    expect(localDay(when('45910').iso)).toBe('2025-09-10');              // was the year 45910
  });
  it('refuses what it cannot read for sure', () => {
    for (const bad of ['9/10/50', 'Sep 10', '1', '2026-02-30', '25/09/2026', '2026-09-10 25:00', '', '3000-01-01']) expect(when(bad).error, bad).toBeTruthy();
  });
});

describe('reading Behavior Lens files back', () => {
  it('headers and guarded cells', () => {
    expect(I.blImportHeader('Duration (s)')).toBe('duration');           // was "durations", dropped
    expect(I.blImportHeader('Duration (min)')).toBe('duration_minutes');
    expect(I.blImportHeader('Student Name')).toBe('student');
    expect(I.blUnguardCell("'- left room")).toBe('- left room');
    expect(I.blUnguardCell("'twas late")).toBe("'twas late");
  });
});

describe('snapshots', () => {
  const at = '2026-09-18T13:15:00.000Z';
  const here = [{ id: 'abc-1', antecedent: 'Math', behavior: 'Yelled', consequence: 'Break', intensity: 3, occurredAt: at, timestamp: at }];
  it('matches records by content, not by the minute, and keeps ids unique', () => {
    const incoming = [
      { id: 'x-1', antecedent: 'Math', behavior: 'Yelled', consequence: 'Break', intensity: 3, timestamp: at },            // the same record
      { id: 'x-2', antecedent: 'Math', behavior: 'Threw chair', consequence: 'Removed', intensity: 5, timestamp: at },    // another incident, same minute
      { id: 'abc-1', antecedent: 'Recess', behavior: 'Yelled', consequence: 'Break', intensity: 0, timestamp: '2026-09-19T10:00:00.000Z' }   // an edited copy
    ];
    const r = S.snapshotRecords('abc', incoming, here, 'family');
    expect(r.duplicates).toBe(1);
    expect(r.fresh.map(e => e.behavior)).toEqual(['Threw chair', 'Yelled']);   // "Threw chair" was skipped as a duplicate
    const copy = r.fresh.find(e => e.antecedent === 'Recess');
    expect(copy.id).not.toBe('abc-1');                                   // was a second record with the same id
    expect(copy.intensity).toBe(null);                                   // 0 is not a rating
    expect(copy.localDate).toBeTruthy();
    expect(copy.metadata.importedFrom).toBe('family');
  });
  it('drops a __proto__ key', () => {
    const crafted = JSON.parse('{"id":"p","antecedent":"A","behavior":"B","consequence":"C","timestamp":"2026-09-19T10:00:00.000Z","__proto__":{"intensity":5}}');
    const entry = S.snapshotRecords('abc', [crafted], [], 'educator').fresh[0];
    expect(Object.assign({}, entry).intensity).toBe(null);
  });
  it('keeps when a home incident happened', () => {
    const r = S.snapshotSideEntries('homeLog', [{ id: 'h1', timestamp: '2026-09-23T01:00:00.000Z', occurredAt: '2026-09-22T11:30:00.000Z', timezoneOffset: 240, behavior: 'Refused shoes' }], [], 'family');
    expect(r.fresh[0]).toMatchObject({ occurredAt: '2026-09-22T11:30:00.000Z', timezoneOffset: 240 });   // was dropped
  });
  it('a merge keeps every entry already here', () => {
    const existing = Array.from({ length: 240 }, (_, i) => ({ id: 'e' + i, timestamp: new Date(Date.UTC(2026, 0, 1) + i * 3600000).toISOString() }));
    const fresh = Array.from({ length: 20 }, (_, i) => ({ id: 'n' + i, timestamp: new Date(Date.UTC(2026, 5, 1) + i * 3600000).toISOString() }));
    expect(S.mergeSnapshotSide(existing, fresh)).toHaveLength(260);      // was 250
  });
});

describe('the home log export and Snapshot Exchange', () => {
  it('the export is a snapshot Snapshot Exchange reads, and an older export still imports', async () => {
    let blob = null;
    const realCreate = URL.createObjectURL;
    URL.createObjectURL = b => { blob = b; return 'blob:x'; };
    try {
      const entry = { id: 'h1', timestamp: '2026-09-23T01:00:00.000Z', occurredAt: '2026-09-22T11:30:00.000Z', timezoneOffset: 240, behavior: 'Refused shoes', context: 'Morning routine' };
      const log = componentHarness('HomeBehaviorLog', { studentName: 'Kestrel', studentKey: k => k, t: () => undefined, addToast: () => {}, callGemini: null, setAbcEntries: () => {}, abcEntries: [] }, { __durable: { homeLog: [entry] } });
      log.all(n => n.props['aria-label'] === 'Export')[0].props.onClick();
      const file = JSON.parse(await blob.text());
      expect(file).toMatchObject({ alloflowSnapshot: true, exportedBy: 'family' });   // was type: behaviorLens_homeLog_snapshot
      expect(file.behaviorLens.homeLogEntries).toHaveLength(1);
      for (const content of [JSON.stringify(file), JSON.stringify({ type: 'behaviorLens_homeLog_snapshot', version: 1, studentName: 'Kestrel', exportedAt: '2026-09-23T02:00:00.000Z', homeLogEntries: [entry] })]) {
        const toasts = [], durableLog = [];
        const q = componentHarness('SnapshotExchange', { studentName: 'Kestrel', studentKey: k => k, abcEntries: [], observationSessions: [], aiAnalysis: null, setAbcEntries: () => {}, setObservationSessions: () => {}, t: () => undefined, addToast: (m, k) => toasts.push([m, k]), callGemini: null }, { __durable: { homeLog: [] }, __durableLog: durableLog });
        q.all(n => n.type === 'button' && /Import/.test(q.text(n)) && n.props.onClick)[0].props.onClick(); q.render();
        const input = q.all(n => n.type === 'input' && n.props.type === 'file')[0];
        input.props.onChange({ target: { files: [new File([content], 'home.json')] } });
        await flush(); q.render();
        expect(toasts.filter(([, k]) => k === 'error')).toEqual([]);   // "Not a valid AlloFlow snapshot file"
        const merge = q.all(n => n.type === 'button' && /Merge/.test(q.text(n)))[0];
        merge.props.onClick(); q.render();
        const homeWrite = durableLog.filter(([key]) => key === 'homeLog').at(-1);
        expect(homeWrite[1].map(e => e.occurredAt)).toEqual(['2026-09-22T11:30:00.000Z']);
      }
    } finally { URL.createObjectURL = realCreate; }
  });
});

describe('pasted graph points', () => {
  function graph(answer) {
    const { asked, env } = confirmEnv(answer);
    const durableLog = [];
    const q = componentHarness('ABAGraphEngine', { abcEntries: [], observationSessions: [], studentName: 'Kestrel', t: () => undefined, addToast: () => {}, callGemini: null },
      { ...env, __durable: { abaGraphDataMode: 'manual', abaGraphManualData: [{ session: 1, value: 2, date: '2026-09-01' }, { session: 2, value: 4, date: '2026-09-02' }] }, __durableLog: durableLog });
    return { q, asked, durableLog };
  }
  async function paste(q, text) {
    const open = q.all(n => n.type === 'button' && /Paste CSV/.test(q.text(n)))[0];
    open.props.onClick(); q.render();
    q.all(n => n.type === 'textarea')[0].props.onChange({ target: { value: text } }); q.render();
    await q.all(n => n.type === 'button' && /Import Data/.test(q.text(n)))[0].props.onClick(); q.render();
  }
  it('asks before replacing the points on the graph', async () => {
    const { q, asked, durableLog } = graph(false);
    await paste(q, '3,7\n5,9\n4,8');
    expect(asked).toEqual(['Replace graph data']);                        // replaced without asking
    expect(durableLog.filter(([key]) => key === 'abaGraphManualData')).toEqual([]);
  });
  it('keeps the stated session numbers, in order', async () => {
    const { q, durableLog } = graph(true);
    await paste(q, '3,7\n5,9\n4,8');
    const written = durableLog.filter(([key]) => key === 'abaGraphManualData').at(-1)[1];
    expect(written.map(p => [p.session, p.value])).toEqual([[3, 7], [4, 8], [5, 9]]);   // was sessions 1, 2, 3 in pasted order
  });
});

describe('IOA lists pasted from a spreadsheet', () => {
  it('a blank cell keeps its place and is reported', () => {
    const { splitIOAList, parseIOARecord } = window.AlloModules.BehaviorLensIOA;
    expect(splitIOAList('1\t0\t\t1')).toEqual(['1', '0', '', '1']);
    expect(parseIOARecord('1\n0\n\n1\n1').bad).toEqual([3]);              // the blank vanished and the rest shifted
    expect(splitIOAList('1 0 1 1')).toEqual(['1', '0', '1', '1']);
  });
});

describe('consent template import', () => {
  it('asks first, keeps the FERPA rights section, and clears the AI undo', async () => {
    const { asked, env } = confirmEnv(true);
    const durableLog = [];
    const q = componentHarness('ConsentManager', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} },
      { ...env, __durableLog: durableLog, __durable: { consentSectionsBeforeAi: [{ id: 'purpose', title: 'Purpose', content: 'before AI' }] } });
    const input = q.all(n => n.type === 'input' && n.props.type === 'file')[0];
    const template = { alloflowConsentTemplate: true, sections: [{ id: 'purpose', title: 'Purpose', content: 'District wording', required: true }, { id: 'rights', title: 'Rights', content: 'Weaker rights text', required: true }] };
    input.props.onChange({ target: { files: [new File([JSON.stringify(template)], 'consent.json')] } });
    await flush(); await flush(); q.render();
    expect(asked).toEqual(['Import consent template']);                   // replaced without asking
    const sections = durableLog.filter(([key]) => key === 'consentSections').at(-1)[1];
    expect(sections.find(s => s.id === 'purpose').content).toBe('District wording');
    expect(sections.find(s => s.id === 'rights').content).toContain('Family Educational Rights and Privacy Act');   // was "Weaker rights text"
    expect(durableLog.filter(([key]) => key === 'consentSectionsBeforeAi').at(-1)[1]).toBe(null);
  });
});

describe('a shared workspace', () => {
  it('says it is view only', () => {
    const q = componentHarness('WorkspaceSharing', { abcEntries: [], observationSessions: [], sessionHistory: [], aiAnalysis: null, studentProfile: {}, selectedStudent: 'Kestrel', studentRoster: [], cloudSync: {}, addToast: () => {}, t: () => undefined }, { DualLabel: text => text });
    const code = btoa(unescape(encodeURIComponent(JSON.stringify({ student: 'Kestrel', role: 'teacher', generatedAt: '2026-09-20T12:00:00.000Z', abcEntries: [], aiAnalysis: { summary: 'Escape from math', hypothesizedFunction: 'Escape' } }))));
    const box = q.all(n => (n.type === 'textarea' || n.type === 'input') && /code/i.test(String(n.props.placeholder || n.props['aria-label'] || '')))[0];
    box.props.onChange({ target: { value: code } }); q.render();
    q.all(n => n.type === 'button' && n.props.onClick && q.text(n).trim().endsWith('Load'))[0].props.onClick(); q.render();
    expect(q.all(n => n.props['data-bl-shared-view-only'])).toHaveLength(1);
    expect(q.text()).not.toContain('Imported Workspace Preview');
    expect(q.text()).toContain('Hypothesized function: Escape');
  });
});

describe('an entry using a target\'s alias', () => {
  it('stays with that target after a reload', () => {
    const targets = [{ id: 'elopement', label: 'Elopement', aliases: ['bolted'], operationalDefinition: 'Leaves the assigned area without permission.' }];
    const entries = [
      { id: 'a', antecedent: 'Recess', behavior: 'Elopement', consequence: 'Returned', timestamp: '2026-09-20T13:00:00.000Z' },
      { id: 'b', antecedent: 'Recess', behavior: 'bolted', consequence: 'Returned', timestamp: '2026-09-21T13:00:00.000Z' }
    ];
    const loaded = R.normalizeWorkspace({ abcEntries: entries, targetBehaviors: targets });
    expect(loaded.targetBehaviors.map(t => t.label)).toEqual(['Elopement']);   // "bolted" became a target
    const again = R.normalizeWorkspace(JSON.parse(JSON.stringify(loaded)));
    expect(R.groupByCanonicalBehavior(again.abcEntries, again.targetBehaviors).map(g => [g.label, g.count])).toEqual([['Elopement', 2]]);
  });
  it('a target someone defined with the same name is kept', () => {
    const targets = [{ id: 'elopement', label: 'Elopement', aliases: ['bolted'] }, { id: 'bolted', label: 'Bolted', operationalDefinition: 'Runs at full speed.' }];
    expect(R.normalizeWorkspace({ abcEntries: [], targetBehaviors: targets }).targetBehaviors.map(t => t.label)).toEqual(['Elopement', 'Bolted']);
  });
});

describe('Voice-to-ABC', () => {
  it('says when it kept only the first 100 entries or shortened a field', async () => {
    const realSR = window.webkitSpeechRecognition;
    window.webkitSpeechRecognition = class { start() { this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'many incidents today' }], { isFinal: true })] }); } stop() {} };
    try {
      const toasts = [];
      const reply = JSON.stringify(Array.from({ length: 105 }, (_, i) => ({ antecedent: 'Math', behavior: i === 0 ? 'x'.repeat(600) : 'Yelled ' + i, consequence: 'Break', time: '9:15' })));
      const q = componentHarness('VoiceToABC', { abcEntries: [], setAbcEntries: () => {}, studentName: 'Kestrel', callGemini: async () => reply, addToast: (m, k) => toasts.push([m, k]), t: () => undefined }, { DualLabel: text => text, ...hostIcons('VoiceToABC') });
      q.all(n => n.type === 'button' && n.props.onClick && /Start|Record|Mic/i.test((n.props['aria-label'] || '') + q.text(n)))[0].props.onClick(); q.render();
      await q.all(n => n.props['aria-label'] === 'Parse ABC Entries from Transcript')[0].props.onClick(); q.render();
      const warning = toasts.find(([, k]) => k === 'warning');
      expect(warning && warning[0]).toContain('5 more entries were left out');              // said nothing
      expect(warning[0]).toContain('1 entry had a field too long to keep in full');
    } finally { window.webkitSpeechRecognition = realSR; }
  });
});

describe('long notes', () => {
  it('over 3,000 characters cannot be parsed, and says so', () => {
    const q = componentHarness('NaturalLanguageABC', { setAbcEntries: () => {}, studentName: 'Kestrel', callGemini: async () => '[]', t: () => undefined, addToast: () => {} }, { DualLabel: text => text });
    q.all(n => n.type === 'textarea')[0].props.onChange({ target: { value: 'x'.repeat(3500) } }); q.render();
    const parse = q.all(n => n.type === 'button' && n.props.onClick && /Parse/i.test(q.text(n)))[0];
    expect(parse.props.disabled).toBe(true);                              // read the first 3,000 and cleared the rest
    expect(q.all(n => n.props.role === 'alert').map(n => q.text(n)).join(' ')).toContain('parse these notes in parts');
  });
});
