// Behavior Lens: pasted and dictated notes, the ABC log sort, unrated intensity,
// IEP tools, the data-quality grade and panels opened from guided tools.
//
// WHY: until 2026-09-23
// - Natural-language and voice entries were stamped with the moment the notes were
//   PARSED (a 9:15 incident pasted at 3:40 pm counted at 15:00, on the wrong day if
//   parsed next morning), skipped normalization, and the model had to invent a
//   consequence and a function the notes did not state.
// - Sorting the ABC log by Intensity called localeCompare on a number: the log crashed.
// - An unrated entry was read out as "Intensity: 0 out of 5" and sent as "null/5".
// - IEP goal headings read "Goal " and "Objective " (registered text, so the fallback
//   carrying the goal never ran); the goal prompt listed 15 undated entries as "N
//   entries" and sent no observations; IEP Prep sent the three OLDEST sessions.
// - The data-quality grade read "Dataset grade" instead of the grade.
// - Guided workflow, skill tracker and PD path opened 'observation' / 'analysis' /
//   'interval' with setActivePanel, which renders nothing for those ids.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, componentSource, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  behaviorLensRuntime();   // the workspace runtime the module normalizes entries with
});
const ns = () => window.AlloModules.BehaviorLensAbcNotes;
const flush = () => new Promise(r => setTimeout(r, 0));
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const hostT = key => { const v = key.split('.').reduce((a, p) => (a && typeof a === 'object' ? a[p] : undefined), strings); return typeof v === 'string' ? v : undefined; };
const src = readFileSync('behavior_lens_module.js', 'utf8');
// Icons (Sparkles, Plus...) are window globals the host sets; stand them in as spans.
const hostIcons = name => Object.fromEntries([...componentSource(name).matchAll(/h\(([A-Z][A-Za-z0-9]*)\s*,/g)].map(m => m[1])
  .filter(id => !src.includes('const ' + id + ' =') && !src.includes('function ' + id + '(')).map(id => [id, 'span']));

describe('clock times in notes', () => {
  it.each([
    ['9:15', '09:15'], ['9:15 am', '09:15'], ['at 10:45 a.m.', '10:45'], ['2:30', '14:30'], ['2 pm', '14:00'],
    ['12:05 pm', '12:05'], ['12:30 am', '00:30'], ['13:20', '13:20'], ['7:50', '07:50'],
    ['during math', ''], ['around 10 minutes in', ''], ['', ''], [null, ''], ['25:10', ''],
  ])('%s -> %s', (text, want) => { expect(ns().parseNoteClock(text)).toBe(want); });
});

describe('notes become normalized entries at the time they describe', () => {
  const now = new Date(2026, 8, 23, 15, 40);
  it('uses the stated time on the chosen date', () => {
    const e = ns().notesEntryToAbc({ antecedent: 'Math worksheet', behavior: 'Pushed papers off desk', consequence: '', clock: '09:15', function: 'unknown', intensity: null }, '2026-09-21', 'natural_language', now);
    const when = new Date(e.occurredAt);
    expect([when.getFullYear(), when.getMonth(), when.getDate(), when.getHours(), when.getMinutes()]).toEqual([2026, 8, 21, 9, 15]);
    expect(e.localDate).toBe('2026-09-21');
    expect(e.timezoneOffset).toBe(when.getTimezoneOffset());
    expect(e.recordedAt).toBe(now.toISOString());
    expect(e.consequence).toBe('');                 // not invented
    expect(e.function).toBe(null);                   // "unknown" is not stored as a function
    expect(e.source).toBe('natural_language');
    expect(e.metadata).toEqual({});
  });
  it('with no stated time, uses the time of adding and says so', () => {
    const e = ns().notesEntryToAbc({ behavior: 'Yelled', clock: '' }, '2026-09-23', 'voice', now);
    expect(new Date(e.occurredAt).getHours()).toBe(15);
    expect(e.metadata).toEqual({ timeNotStated: true });
  });
  it('refuses an entry with no behavior', () => {
    expect(ns().notesEntryToAbc({ antecedent: 'Lunch', behavior: '  ' }, '2026-09-23', 'voice', now)).toBe(null);
  });
});

describe('natural-language notes', () => {
  const reply = JSON.stringify([
    { antecedent: 'Math worksheet', behavior: 'Pushed papers off desk', consequence: '', function: 'unknown', intensity: null, time: '9:15 am', setting: 'Room 4', notes: '' },
    { antecedent: 'Transition', behavior: 'Ran to hallway', consequence: 'Aide followed', function: 'escape', intensity: 3, time: '', setting: '', notes: '' },
  ]);
  function mount(callGemini) {
    const added = []; const toasts = []; let sent = '';
    const setAbcEntries = fn => { added.push(...fn([])); };
    const q = componentHarness('NaturalLanguageABC', { abcEntries: [], setAbcEntries, callGemini: callGemini || (async p => { sent = p; return reply; }), t: () => undefined, addToast: (m, k) => toasts.push([m, k]), studentName: 'Kestrel' });
    return { q, added, toasts, sent: () => sent };
  }
  async function parse(q, text = 'At 9:15 during math he pushed his papers off the desk.') {
    q.all(n => n.type === 'textarea')[0].props.onChange({ target: { value: text } }); q.render();
    await q.all(n => n.type === 'button' && n.props.onClick && /Parse/i.test(q.text(n)))[0].props.onClick(); await flush(); q.render();
  }
  it('keeps the stated time and the chosen date, and asks for nothing it cannot know', async () => {
    const { q, added, toasts, sent } = mount();
    await parse(q);
    expect(sent()).toContain('leave consequence empty');
    expect(toasts.pop()).toEqual(['Parsed 2 ABC entries. Check the date and times before adding.', 'success']);
    expect(q.all(n => n.props['aria-label'] === 'Time of entry 1')[0].props.value).toBe('09:15');
    expect(q.all(n => n.props['data-time-missing'])).toHaveLength(1);           // entry 2 stated no time
    q.all(n => n.type === 'input' && n.props.type === 'date')[0].props.onChange({ target: { value: '2026-09-21' } }); q.render();
    q.all(n => n.props['aria-label'] === 'Time of entry 2')[0].props.onChange({ target: { value: '10:05' } }); q.render();
    q.all(n => n.props['aria-label'] === 'Add All to ABC Log')[0].props.onClick(); q.render();
    expect(added).toHaveLength(2);
    const hm = e => { const d = new Date(e.occurredAt); return [d.getDate(), d.getHours(), d.getMinutes()]; };
    expect(added.map(hm)).toEqual([[21, 9, 15], [21, 10, 5]]);
    expect(added.map(e => e.localDate)).toEqual(['2026-09-21', '2026-09-21']);
    expect(added[0].student).toBe(null);                                         // no "student" name stamped on
    expect(added.map(e => e.function)).toEqual([null, 'escape']);
    expect(toasts.pop()).toEqual(['Added all 2 entries.', 'success']);
  });
  it('a declined consent gate is not reported as a parse failure', async () => {
    const { q, toasts } = mount(async () => null);
    await parse(q);
    expect(toasts).toEqual([]);
  });
});

describe('voice transcript', () => {
  it('uses the spoken time and drops entries with no behavior', async () => {
    let rec;
    window.SpeechRecognition = function () { rec = this; this.start = () => {}; this.stop = () => {}; };
    try {
      const added = []; const toasts = [];
      const reply = JSON.stringify([{ antecedent: 'Reading group', behavior: 'Threw a pencil', consequence: '', intensity: null, time: '10:40', notes: '' }, { antecedent: 'x', behavior: '', consequence: 'y' }]);
      const q = componentHarness('VoiceToABC', { abcEntries: [], setAbcEntries: fn => added.push(...fn([])), studentName: 'Kestrel', callGemini: async () => reply, addToast: (m, k) => toasts.push([m, k]), t: () => undefined });
      q.all(n => n.type === 'button' && /Start Recording/.test(q.text(n)))[0].props.onClick(); q.render();
      const result = Object.assign([{ transcript: 'At 10:40 in reading group he threw a pencil' }], { isFinal: true });
      rec.onresult({ resultIndex: 0, results: [result] }); q.render();
      await q.all(n => n.props['aria-label'] === 'Parse ABC Entries from Transcript')[0].props.onClick(); await flush(); q.render();
      expect(q.text()).toContain('Review 1 Parsed Entries');
      q.all(n => n.type === 'input' && n.props.type === 'date')[0].props.onChange({ target: { value: '2026-09-22' } }); q.render();
      q.all(n => n.props['aria-label'] === 'Add Selected Entries')[0].props.onClick(); q.render();
      expect(added).toHaveLength(1);
      const d = new Date(added[0].occurredAt);
      expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([22, 10, 40]);
      expect(added[0].localDate).toBe('2026-09-22');
      expect(added[0].source).toBe('voice');
    } finally { delete window.SpeechRecognition; }
  });
});

describe('ABC log sort and intensity', () => {
  const E = (id, intensity, behavior) => ({ id, intensity, behavior, antecedent: 'A', consequence: 'C', timestamp: '2026-09-2' + id + 'T14:00:00Z', occurredAt: '2026-09-2' + id + 'T14:00:00Z' });
  it('sorts by intensity with unrated last, both ways', () => {
    const rows = [E(1, 3, 'b'), E(2, null, 'a'), E(3, 5, 'c')];
    const by = dir => [...rows].sort((a, b) => ns().abcSortCompare(a, b, 'intensity', dir)).map(e => e.intensity);
    expect(by('desc')).toEqual([5, 3, null]);
    expect(by('asc')).toEqual([3, 5, null]);
    expect([...rows].sort((a, b) => ns().abcSortCompare(a, b, 'behavior', 'asc')).map(e => e.behavior)).toEqual(['a', 'b', 'c']);
  });
  it('the log sorts by Intensity without crashing, and an unrated entry is "not rated"', () => {
    const entries = [E(1, 3, 'Yell'), E(2, null, 'Run'), E(3, 5, 'Hit')];
    const q = componentHarness('ABCDataPanel', { entries, setEntries: () => {}, studentName: 'Kestrel', onAnalyze: () => {}, analyzing: false, t: () => undefined, addToast: () => {}, callGemini: null, targetBehaviors: [], setTargetBehaviors: () => {}, deletedEntries: [], setDeletedEntries: () => {}, appendAuditEvent: () => {}, userRole: 'teacher', recordWorkflowDiagnostic: () => {} }, { DualLabel: text => text, ...hostIcons('ABCDataPanel') });
    q.all(n => typeof n.props['aria-label'] === 'string' && /^Sort ABC entries by intensity/i.test(n.props['aria-label']))[0].props.onClick();
    expect(() => q.render()).not.toThrow();
    const labels = q.all(n => typeof n.props['aria-label'] === 'string' && /^Intensity/.test(n.props['aria-label'])).map(n => n.props['aria-label']);
    expect(labels).toEqual(['Intensity: 5 out of 5', 'Intensity: 3 out of 5', 'Intensity not rated']);
  });
  it('no prompt sends a raw intensity as "null/5" or "?/5"', () => {
    expect(src.match(/\$\{e(?:ntry)?\.intensity(?: \|\| '\?')?\}\/5/g) || []).toEqual([]);
  });
});

describe('IEP goals', () => {
  const entries = Array.from({ length: 20 }, (_, i) => ({ id: 'e' + i, antecedent: 'Math', behavior: 'Yell', consequence: 'Break', intensity: i === 19 ? null : 3, occurredAt: new Date(2026, 8, 1 + i, 10).toISOString(), timestamp: new Date(2026, 8, 1 + i, 10).toISOString(), localDate: '2026-09-' + String(1 + i).padStart(2, '0') }));
  const sessions = [{ method: 'frequency', timestamp: '2026-09-20T15:00:00Z', data: { totalCount: 7 } }];
  const reply = '{"presentLevel":"p","annualGoals":[{"goalNumber":1,"goal":"Student will request a break in 4/5 opportunities"}],"shortTermObjectives":[{"objectiveNumber":2,"objective":"Use the break card"}]}';
  it('labels carry the goal and objective with the host strings', async () => {
    let sent = '';
    const q = componentHarness('IEPGoalGenerator', { abcEntries: entries, observationSessions: sessions, studentProfile: {}, studentName: 'Kestrel', callGemini: async p => { sent = p; return reply; }, t: hostT, addToast: () => {} }, { DualLabel: text => text });
    await q.all(n => n.type === 'button' && n.props.onClick && /Generate/i.test(q.text(n)))[0].props.onClick(); await flush(); q.render();
    expect(q.text()).toContain('Goal 1: Student will request a break in 4/5 opportunities');
    expect(q.text()).toContain('Objective 2');
    expect(sent).toContain('the 15 most recent of 20 entries');
    expect(sent).toContain('[2026-09-20');
    expect(sent).toContain('[2026-09-20 10:00 AM] A:Math B:Yell C:Break Func:? Int:not rated');   // the newest entry is unrated
    expect(sent).toContain('frequency count, 7 occurrences');
  });
  it('is not offered with no data', () => {
    const q = componentHarness('IEPGoalGenerator', { abcEntries: [], observationSessions: [], studentProfile: {}, studentName: 'Kestrel', callGemini: async () => '{}', t: () => undefined, addToast: () => {} }, { DualLabel: text => text });
    expect(q.all(n => n.type === 'button' && n.props.onClick && /Generate/i.test(q.text(n)))[0].props.disabled).toBe(true);
  });
});

describe('a registered key never hides the data its fallback carries', () => {
  it('no t(registered key) || <text built from data>', () => {
    const reg = key => { const v = hostT(key); return typeof v === 'string' && v; };
    const bad = [];
    for (const m of src.matchAll(/\bt\(\s*'([a-z0-9_.]+)'\s*\)\s*\|\|\s*([^\n]{0,120})/g)) {
      if (reg(m[1]) && /^(`[^`]*\$\{|'[^']*'\s*\+|[A-Za-z_$][\w$.]*\s*\+)/.test(m[2])) bad.push(m[1] + ' => ' + JSON.stringify(hostT(m[1])));
    }
    expect(bad).toEqual([]);
  });
  it('the gate can see one (not vacuous)', () => {
    expect(hostT('behavior_lens.ui.goal')).toBe('Goal ');
    const sample = "t('behavior_lens.ui.goal') || 'Goal ' + g.goalNumber";
    const m = /\bt\(\s*'([a-z0-9_.]+)'\s*\)\s*\|\|\s*([^\n]{0,120})/.exec(sample);
    expect(/^(`[^`]*\$\{|'[^']*'\s*\+|[A-Za-z_$][\w$.]*\s*\+)/.test(m[2])).toBe(true);
  });
  it('the data-quality grade names the grade', () => {
    const entries = Array.from({ length: 12 }, (_, i) => ({ id: 'e' + i, antecedent: 'During independent math work', behavior: 'Left assigned seat without permission', consequence: 'Teacher redirected verbally', intensity: 3, setting: 'Room 4', occurredAt: new Date(2026, 8, 1 + i, 10).toISOString(), timestamp: new Date(2026, 8, 1 + i, 10).toISOString() }));
    const q = componentHarness('DataQualityBadge', { abcEntries: entries, t: hostT });
    q.all(n => n.type === 'button')[0].props.onClick(); q.render();
    expect(q.text()).toMatch(/(Strong|Fair|Poor) dataset/);
    expect(q.text()).not.toContain('Dataset grade');
  });
});

describe('IEP prep sends the latest sessions', () => {
  it('the three newest, not the three oldest', async () => {
    let sent = '';
    const sessions = Array.from({ length: 10 }, (_, i) => ({ method: 'frequency', timestamp: new Date(2026, 8, 20 - i, 10).toISOString(), data: { totalCount: 100 + (10 - i) } }));   // newest first: S10..S1
    const q = componentHarness('IEPPrepGenerator', { studentName: 'Kestrel', abcEntries: [{ id: 'a', antecedent: 'A', behavior: 'B', consequence: 'C', intensity: 2, occurredAt: '2026-09-20T14:00:00Z', timestamp: '2026-09-20T14:00:00Z' }], observationSessions: sessions, aiAnalysis: { summary: 'Escape-maintained during math.', hypothesizedFunction: 'Escape', confidence: 0.6, recommendations: ['Break card'] }, graphExport: null, effectSizeResults: null, setActivePanel: () => {}, callGemini: async p => { sent = p; return 'ok'; }, t: () => undefined, addToast: () => {} }, { DualLabel: text => text });
    await q.all(n => n.type === 'button' && n.props.onClick && /Generate|Prep/i.test(q.text(n)) && !n.props.disabled)[0].props.onClick(); await flush();
    expect(sent).toContain('110 occurrences');
    expect(sent).toContain('108 occurrences');
    expect(sent).not.toContain('101 occurrences');
    // The analysis as text, not JSON cut at 500 characters.
    expect(sent).toContain('Escape-maintained during math.');
    expect(sent).not.toContain('{"summary"');
  });
  it('the student context dates notes by the local day', () => {
    expect(src).toContain('ctx += `- [${blLocalDateKey(n.timestamp) || ' + "'undated'" + '}]');
    expect(src).not.toContain("(n.timestamp || '').slice(0, 10)");
  });
});

describe('guided tools open panels that exist', () => {
  it('every step tool id renders a panel or is opened by launchHubTool', () => {
    const rendered = new Set([...src.matchAll(/activePanel === '([a-zA-Z_]+)'/g)].map(m => m[1]));
    const launcher = src.slice(src.indexOf('const launchHubTool = (toolId) => {'), src.indexOf('const startTargetMeasurement'));
    const special = new Set([...launcher.matchAll(/toolId === '([a-zA-Z_]+)'/g)].map(m => m[1]));
    expect(special.has('observation') && special.has('analysis') && special.has('interval')).toBe(true);
    const ids = [...src.matchAll(/\btool: '([a-zA-Z_]+)'/g)].map(m => m[1]).filter(id => id !== 'behaviorlens');
    expect(ids.length).toBeGreaterThan(30);
    expect(ids.filter(id => !rendered.has(id) && !special.has(id))).toEqual([]);
  });
  it('the special ids are never opened with a bare setActivePanel', () => {
    expect(src).not.toContain('onOpenTool: (toolId) => { setActivePanel(toolId); }');
    expect(src).toMatch(/h\(GuidedWorkflowHub, \{\s*(?:\/\/[^\n]*\s*)*setActivePanel: launchHubTool,/);
  });
});
