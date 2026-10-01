// Behavior Lens with a year of data: what broke or went quiet at scale.
//
// WHY: until 2026-09-24
// - A 5,000-entry student's own backup (indented JSON, 6.3 MB) was refused by the 4 MB loader.
// - A bulk delete of 400 said "400 entries moved to Recently deleted" when 250 were kept, and the
//   list showed 25, so entries 26 to 250 could not be restored.
// - The scatterplot auto-fill used every entry ever, so with a year of data every cell was "high".
// - The home log, self-checks and integrity checks showed 20 or 10 under a count of all of them.
// - The Overview matrix went through every entry 25 times (the result is pinned here, so the
//   faster single pass must give the same counts).
// - A workspace over Firestore's 1 MiB document limit read as "Offline" while online.
// - The AI analysis saw 24 of 3,000 entries and no counts over the rest.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { readFileSync } from 'node:fs';
import { componentHarness, componentSource, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let R;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  R = behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
});
const src = readFileSync('behavior_lens_module.js', 'utf8');
// Host icons (Plus, Sparkles, ...) are globals the host provides.
const hostIcons = name => Object.fromEntries([...componentSource(name).matchAll(/h\(([A-Z][A-Za-z0-9]*)\s*,/g)].map(m => m[1])
  .filter(id => !src.includes('const ' + id + ' =') && !src.includes('function ' + id + '(')).map(id => [id, 'span']));
const iso = (d, hh = 9) => new Date(2026, 8, d, hh).toISOString();
const entry = (id, extra) => Object.assign({ id, antecedent: 'Math task', behavior: 'Yelled', consequence: 'Break', intensity: 2, occurredAt: iso(10), timestamp: iso(10), timezoneOffset: 240 }, extra);

describe('a large backup', () => {
  it('a 5,000-entry workspace saved the way Download backup saves it can be loaded back', () => {
    const big = R.normalizeWorkspace({ student: 'Kestrel', abcEntries: Array.from({ length: 5000 }, (_, i) => entry('e' + i, { notes: 'Observed during the lesson; returned to task after prompting. '.repeat(5), occurredAt: new Date(Date.UTC(2025, 8, 1) + i * 3600e3).toISOString() })), observationSessions: [] });
    const compact = JSON.stringify(big);
    const indented = JSON.stringify(big, null, 2);
    expect(R.utf8ByteLength(indented)).toBeGreaterThan(4 * 1024 * 1024);   // over the old limit
    expect(R.utf8ByteLength(compact)).toBeLessThan(R.MAX_WORKSPACE_IMPORT_BYTES);
    expect(R.validateWorkspaceImport({ ...big, favorites: [] }, { sourceBytes: R.utf8ByteLength(indented) }).ok).toBe(true);   // an older indented backup too (was refused)
  });
});

describe('Recently deleted', () => {
  const panel = (entries, deleted, toasts, audits = []) => componentHarness('ABCDataPanel', {
    entries, setEntries: () => {}, studentName: 'Kestrel', onAnalyze: () => {}, analyzing: false, t: () => undefined, addToast: (m, k) => toasts.push([m, k]),
    targetBehaviors: [], setTargetBehaviors: () => {}, deletedEntries: deleted, setDeletedEntries: () => {}, appendAuditEvent: event => audits.push(event), userRole: 'teacher'
  }, { DualLabel: text => text, ...hostIcons('ABCDataPanel') });
  const deleted = n => Array.from({ length: n }, (_, i) => ({ entry: entry('d' + i, { behavior: 'Deleted ' + i }), deletedAt: iso(12) }));
  it('every kept entry can be listed and restored', () => {
    const q = panel([entry('a')], deleted(40), []);
    q.all(n => n.type === 'button' && /Recently deleted/i.test(q.text(n)) && n.props.onClick)[0].props.onClick(); q.render();
    const more = q.all(n => n.type === 'button' && /Showing 25 of 40/.test(q.text(n)))[0];
    expect(q.text(more)).toBe('Showing 25 of 40. Show 15 more');          // it listed 25 and stopped
    more.props.onClick(); q.render();
    expect(q.text()).toContain('Deleted 39');
  });
  it('a bulk delete says what Recently deleted cannot keep', () => {
    const toasts = [], audits = [];
    const q = panel(Array.from({ length: 60 }, (_, i) => entry('e' + i, { occurredAt: iso(1 + (i % 20), 8 + (i % 8)) })), deleted(240), toasts, audits);
    q.all(n => n.props['aria-label'] === 'Select all entries on this page')[0].props.onChange({ target: { checked: true } }); q.render();
    q.all(n => n.type === 'button' && /Delete Selected/.test(q.text(n)))[0].props.onClick(); q.render();
    expect(q.text(q.all(n => n.props['data-bl-bulk-delete-overflow'])[0])).toBe('40 deleted entries will not be restorable (Recently deleted keeps 250).');
    q.all(n => n.type === 'button' && /Yes, Delete/.test(q.text(n)))[0].props.onClick();
    expect(audits.at(-1).metadata).toMatchObject({ count: 50 });          // the id list was dropped past 16 KB, leaving no count
    expect(toasts.at(-1)).toEqual(['50 entries deleted. Recently deleted keeps 250, so 40 of the oldest deleted entries can no longer be restored.', 'warning']);   // said "50 moved to Recently deleted"
  });
});

describe('scatterplot auto-fill', () => {
  it('uses the weeks up to the newest entry', () => {
    const SP = window.AlloModules.BehaviorLensScatterplot;
    // Mondays 10 AM over 12 weeks, one incident each.
    const mondays = Array.from({ length: 12 }, (_, i) => entry('m' + i, { occurredAt: new Date(2026, 6, 6 + i * 7, 10).toISOString(), timezoneOffset: new Date(2026, 6, 6 + i * 7, 10).getTimezoneOffset() }));
    expect(SP.scatterplotFromEntries(mondays, '').counts['0_10']).toBe(12);          // every week at once
    const four = SP.scatterplotFromEntries(mondays, '', 4);
    expect([four.counts['0_10'], four.older]).toEqual([5, 7]);                       // the newest Monday and the 4 weeks before it
    const q = componentHarness('ScatterplotAnalysis', { abcEntries: mondays, t: () => undefined, addToast: () => {} });
    expect(q.all(n => n.props['aria-label'] === 'Weeks to auto-fill from')[0].props.value).toBe(4);
    q.all(n => n.props['aria-label'] === 'Auto-fill from ABC')[0].props.onClick(); q.render();
    expect(q.text()).toContain('7 older entries are not used.');
  });
});

describe('lists that stopped at 20 or 10', () => {
  it('the home log shows the rest on request', () => {
    const log = Array.from({ length: 25 }, (_, i) => ({ id: 'h' + i, timestamp: iso(1 + i), behavior: 'Home ' + i }));
    const q = componentHarness('HomeBehaviorLog', { studentName: 'Kestrel', studentKey: k => k, t: () => undefined, addToast: () => {}, callGemini: null, setAbcEntries: () => {}, abcEntries: [] }, { __durable: { homeLog: log } });
    expect(q.text()).not.toContain('Home 24');
    q.byAttr('data-bl-show-all', 'homelog')[0].props.onClick(); q.render();
    expect(q.text()).toContain('Home 24');
  });
  it('self-checks and integrity checks too', () => {
    const checks = Array.from({ length: 22 }, (_, i) => ({ id: 's' + i, timestamp: iso(1 + (i % 20)), mood: '😊', happening: 'Check ' + i }));
    const q = componentHarness('StudentSelfCheck', { studentName: 'Kestrel', studentKey: k => k, t: () => undefined, addToast: () => {}, callGemini: null }, { __durable: { selfCheck: checks }, ...hostIcons('StudentSelfCheck') });
    expect(q.text()).not.toContain('Check 21');
    q.byAttr('data-bl-show-all', 'selfcheck')[0].props.onClick(); q.render();
    expect(q.text()).toContain('Check 21');
    const sessions = Array.from({ length: 12 }, (_, i) => ({ id: 'i' + i, date: iso(1 + i), integrity: 50 + i, interventionName: 'Check-in', components: [] }));
    const t = componentHarness('TreatmentIntegrityTracker', { t: () => undefined, addToast: () => {} }, { __durable: { integrityIntervention: 'Check-in', integrityChecks: sessions }, ...hostIcons('TreatmentIntegrityTracker') });
    expect(t.byAttr('data-bl-show-all', 'integrity')).toHaveLength(1);
    const before = t.all(n => n.type === 'span' && /%$/.test(t.text(n))).length;
    t.byAttr('data-bl-show-all', 'integrity')[0].props.onClick(); t.render();
    expect(t.all(n => n.type === 'span' && /%$/.test(t.text(n))).length).toBe(before + 2);
  });
});

describe('the Overview matrix', () => {
  it('counts each before-event and behavior pair, aliases included', () => {
    const targets = [{ id: 'elopement', label: 'Elopement', aliases: ['bolted'] }, { id: 'yelled', label: 'Yelled' }];
    const entries = [entry('a'), entry('b'), entry('c', { behavior: 'bolted' }), entry('d', { antecedent: 'Recess', behavior: 'Elopement' })];
    const q = componentHarness('OverviewPanel', { abcEntries: entries, observationSessions: [], aiAnalysis: null, studentName: 'Kestrel', targetBehaviors: targets, t: () => undefined },
      { __durable: { observationReviewFilters: { dateRange: 0, targetId: '' } }, DualLabel: text => text });
    const row = ante => { const tr = q.all(n => n.type === 'tr' && n.children[0] && n.children[0].props && n.children[0].props.title === ante)[0]; return tr.children.slice(1).map(td => q.text(td)); };
    const header = q.all(n => n.type === 'th' && n.props.scope === 'col' && n.props.title).map(n => n.props.title);
    const math = row('Math task'), recess = row('Recess');
    const cells = Object.fromEntries(header.map((b, i) => [b, [math[i], recess[i]]]));
    expect(cells, JSON.stringify(cells)).toMatchObject({ Yelled: ['2', '0'], Elopement: ['1', '1'] });
  });
});

describe('a workspace too large for one cloud document', () => {
  it('says so, once, instead of "Offline"', async () => {
    const { React, baseProps, setupBehaviorLens } = await import('./helpers/behavior_lens_harness.js');
    const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens();
    localStorage.clear();
    localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'big-a', name: 'Student A' }]));
    localStorage.setItem('behaviorLens_workspace_big-a', JSON.stringify({ student: 'Student A', studentId: 'big-a', abcEntries: [entry('x')], observationSessions: [], savedAt: '2026-09-20T12:00:00.000Z' }));
    let refused = 0;
    const tooBig = Object.assign(new Error('Document cannot be written because its size (1,250,000 bytes) exceeds the maximum allowed size of 1,048,576 bytes.'), { code: 'invalid-argument' });
    window.__alloFirebase = {
      onAuthStateChanged: (_a, listener) => { listener({ uid: 'u' }); return () => {}; }, signInAnonymously: vi.fn(),
      doc: (_db, ...parts) => ({ path: parts.join('/') }), getDoc: vi.fn(async () => ({ exists: () => false, data: () => null })), setDoc: vi.fn(),
      runTransaction: vi.fn(async (_db, update) => { let wrote = null; await update({ get: async () => ({ exists: () => false, data: () => null }), set: (ref, data) => { wrote = ref; } }); if (wrote && !wrote.path.endsWith('__roster__')) { refused += 1; throw tooBig; } return { ok: true, revision: 1 }; })
    };
    const toasts = [];
    // The backup download goes on to a cloud save: a second refused save.
    const realCreate = URL.createObjectURL, realRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:backup'; URL.revokeObjectURL = () => {};
    const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
    try {
      await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isTeacherMode: true, isCanvasEnv: false, firestore: {}, firebaseAuth: {}, addToast: (m, k) => toasts.push([m, k]), dashboardData: [{ studentNickname: 'Student A' }] }))));
      for (let i = 0; i < 6; i++) await React.act(async () => { await new Promise(r => setTimeout(r, 300)); });
      for (let click = 0; click < 2; click++) {
        await React.act(async () => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === 'Download backup').click());
        for (let i = 0; i < 3; i++) await React.act(async () => { await new Promise(r => setTimeout(r, 300)); });
      }
      const badges = [...host.querySelectorAll('[role="status"][aria-label]')].map(el => el.getAttribute('aria-label') + ' = ' + el.textContent);
      expect(badges, JSON.stringify(badges)).toContain('Too large for cloud sync; saved in this browser = Too large to sync');                // was "Offline" while online
      expect(refused).toBeGreaterThanOrEqual(2);                           // several refused saves, one message
      expect(toasts.filter(([m]) => /too large for one cloud copy/.test(m))).toHaveLength(1);
    } finally {
      URL.createObjectURL = realCreate; URL.revokeObjectURL = realRevoke;
      await React.act(async () => root.unmount()); host.remove(); delete window.__alloFirebase;
    }
  });
});

describe('the AI analysis of a large dataset', () => {
  it('sends counts over every entry with its sample', async () => {
    const entries = Array.from({ length: 40 }, (_, i) => entry('e' + i, { antecedent: i < 30 ? 'Math task' : 'Recess', occurredAt: iso(1 + (i % 20), 8 + (i % 8)) }));
    const { React, baseProps, setupBehaviorLens } = await import('./helpers/behavior_lens_harness.js');
    const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens();
    localStorage.clear(); delete window.__alloFirebase;
    localStorage.setItem('bl_ai_consent_v1', '1');
    localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'ai-a', name: 'Student A' }]));
    localStorage.setItem('behaviorLens_workspace_ai-a', JSON.stringify({ student: 'Student A', studentId: 'ai-a', abcEntries: entries, observationSessions: [], savedAt: '2026-09-20T12:00:00.000Z' }));
    const prompts = [];
    const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
    try {
      await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isTeacherMode: true, isCanvasEnv: true, callGemini: async p => { prompts.push(p); return '{"summary":"s","hypothesizedFunction":"Escape"}'; }, dashboardData: [{ studentNickname: 'Student A' }] }))));
      await React.act(async () => { await new Promise(r => setTimeout(r, 350)); });
      await React.act(async () => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === 'All tools').click());
      await React.act(async () => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === 'Open AI Pattern Analysis').click());
      await React.act(async () => { await new Promise(r => setTimeout(r, 200)); });
      const prompt = prompts.find(p => /DATA COVERAGE/.test(p));
      expect(prompt).toContain('COUNTS OVER ALL 40 ENTRIES');
      expect(prompt).toContain('Antecedents: Math task 30 (75%); Recess 10 (25%)');
    } finally {
      await React.act(async () => root.unmount()); host.remove();
    }
  });
});

describe('Download backup', () => {
  it('writes compact JSON, so a large backup stays under the loader limit', async () => {
    const { React, baseProps, setupBehaviorLens } = await import('./helpers/behavior_lens_harness.js');
    const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens();
    localStorage.clear(); delete window.__alloFirebase;
    localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'bk-a', name: 'Student A' }]));
    localStorage.setItem('behaviorLens_workspace_bk-a', JSON.stringify({ student: 'Student A', studentId: 'bk-a', abcEntries: [entry('x')], observationSessions: [], savedAt: '2026-09-20T12:00:00.000Z' }));
    let blob = null;
    const realCreate = URL.createObjectURL, realRevoke = URL.revokeObjectURL;
    URL.createObjectURL = b => { blob = b; return 'blob:backup'; }; URL.revokeObjectURL = () => {};
    const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
    try {
      await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isTeacherMode: true, isCanvasEnv: true, dashboardData: [{ studentNickname: 'Student A' }] }))));
      await React.act(async () => { await new Promise(r => setTimeout(r, 350)); });
      await React.act(async () => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === 'Download backup').click());
      const text = await blob.text();
      expect(JSON.parse(text).abcEntries).toHaveLength(1);
      expect(text).not.toContain(String.fromCharCode(10));                // indented, a 5,000-entry backup was 6.3 MB
    } finally {
      URL.createObjectURL = realCreate; URL.revokeObjectURL = realRevoke;
      await React.act(async () => root.unmount()); host.remove();
    }
  });
});
