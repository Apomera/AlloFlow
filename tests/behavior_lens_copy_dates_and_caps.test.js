// Behavior Lens: copying, local dates, and caps that deleted saved records.
//
// WHY: until 2026-09-23
// - 17 copy buttons said "Copied!" without waiting for navigator.clipboard, which is
//   often blocked where AlloFlow runs (a sandboxed frame); 13 more showed nothing when
//   the copy failed. A teacher could paste an empty clipboard into an IEP.
// - IEP goals "Copy All" left out measurement, schedule, objective criteria and dates,
//   progress monitoring and interventions.
// - AlloSheet summaries grouped entries by their UTC day (a 9 pm entry fell on the next
//   date); manual graph points and file names used the UTC date; the demo sandbox
//   saved date-only entries, which normalized to UTC midnight (about 8 pm the day before).
// - The 21st saved contract (signed or not), the 11th reinforcer snapshot and the 11th
//   momentum sequence silently deleted the oldest.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime, behaviorLensInternals } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  behaviorLensRuntime();
});
const src = readFileSync('behavior_lens_module.js', 'utf8');
const flush = () => new Promise(r => setTimeout(r, 0));
const clip = () => window.AlloModules.BehaviorLensClipboard;
const realClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const realExec = document.execCommand;
function setClipboard(api, execResult) {
  Object.defineProperty(navigator, 'clipboard', { value: api, configurable: true });
  document.execCommand = () => execResult;
}
afterEach(() => {
  if (realClipboard) Object.defineProperty(navigator, 'clipboard', realClipboard); else delete navigator.clipboard;
  document.execCommand = realExec;
});

describe('copying', () => {
  it('reports success only when the text was copied', async () => {
    setClipboard({ writeText: () => Promise.reject(new Error('blocked')) }, false);
    expect(await clip().blTryCopy('x')).toBe(false);
    setClipboard({ writeText: () => Promise.reject(new Error('blocked')) }, true);
    expect(await clip().blTryCopy('x')).toBe(true);                 // the older copy path worked
    setClipboard({ writeText: () => Promise.resolve() }, false);
    expect(await clip().blTryCopy('x')).toBe(true);
    setClipboard(undefined, false);
    expect(await clip().blTryCopy('x')).toBe(false);
  });
  it('a failed copy says so and never says "Copied!"', async () => {
    setClipboard({ writeText: () => Promise.reject(new Error('blocked')) }, false);
    const toasts = [];
    const q = componentHarness('HomeNoteGenerator', { studentName: 'Kestrel', abcEntries: [], aiAnalysis: null, callGemini: null, t: () => undefined, addToast: (m, k) => toasts.push([m, k]) }, { DualLabel: text => text, __durable: { homeNoteDraft: 'Dear family' } });
    q.all(n => n.props['aria-label'] === 'Copy')[0].props.onClick(); await flush(); await flush();
    expect(toasts).toEqual([['Could not copy here. Select the text and press Ctrl+C (Cmd+C on a Mac).', 'warning']]);
    setClipboard({ writeText: () => Promise.resolve() }, false);
    toasts.length = 0;
    q.all(n => n.props['aria-label'] === 'Copy')[0].props.onClick(); await flush(); await flush();
    expect(toasts).toEqual([['Copied!', 'success']]);
  });
  it('every copy goes through the checked helper', () => {
    const direct = (src.match(/navigator\.clipboard\.writeText\(/g) || []).length;
    expect(direct).toBe(1);                                          // the helper's own call
    expect(src.indexOf('navigator.clipboard.writeText(')).toBeGreaterThan(src.indexOf('function blTryCopy('));
    expect((src.match(/blWriteClipboard\(/g) || []).length).toBeGreaterThan(25);
  });
});

describe('IEP goals Copy All', () => {
  it('includes every part the generator produced, and no "undefined"', () => {
    const text = window.AlloModules.BehaviorLensIepGoals.iepGoalsText({
      presentLevel: 'Leaves seat 6x per period.',
      annualGoals: [{ goalNumber: 1, goal: 'Stay seated', baseline: '6x', targetCriteria: '1x or fewer', measurementMethod: 'Frequency count', schedule: 'Daily in math' }],
      shortTermObjectives: [{ objectiveNumber: 1, relatedGoal: 1, objective: 'Use break card', criteria: '4 of 5', targetDate: 'Dec 2026' }],
      accommodations: ['Visual timer'],
      progressMonitoring: { frequency: 'Weekly', method: 'ABA graph', reportingSchedule: 'Each quarter' },
      suggestedInterventions: ['FCT'],
    });
    for (const part of ['Frequency count', 'Daily in math', '4 of 5', 'Dec 2026', '(goal 1)', 'Weekly', 'ABA graph', 'Each quarter', '- FCT', '- Visual timer']) expect(text).toContain(part);
    expect(window.AlloModules.BehaviorLensIepGoals.iepGoalsText({ annualGoals: [{ goalNumber: 1, goal: 'X' }] })).not.toContain('undefined');
  });
});

describe('dates on the recorder\'s clock', () => {
  it('AlloSheet groups an entry by its local day', () => {
    const day = behaviorLensInternals()('blAlloSheetDate');
    // 01:30Z on the 22nd, recorded at UTC-4: 21:30 on the 21st.
    expect(day({ occurredAt: '2026-09-22T01:30:00Z', timestamp: '2026-09-22T01:30:00Z', timezoneOffset: 240 })).toBe('2026-09-21');
    expect(day({ timestamp: '2026-09-22T01:30:00Z', localDate: '2026-09-21' })).toBe('2026-09-21');
    expect(day({})).toBe('');
  });
  it('no current-date value is taken from the UTC day', () => {
    expect(src).not.toContain("new Date().toISOString().split('T')[0]");
    expect(src).not.toContain('new Date().toISOString().slice(0, 10)');
    expect(src).not.toContain("toISOString().split('T')[0]");
  });
  it('demo entries carry a real time and the current field name', () => {
    const i = src.indexOf('mockAbc.push({');
    const block = src.slice(i, i + 1600);
    expect(block).toContain('timestamp: d.toISOString(),');
    expect(block).toContain('timezoneOffset: d.getTimezoneOffset(),');
    expect(block).toContain('function: functions[');
    expect(block).not.toContain('perceivedFunction');
  });
});

describe('saved records are not silently capped', () => {
  it('no saved list drops its oldest record', () => {
    // (The home log, self-check, contracts, snapshots, sequences and token sessions all did.)
    const caps = [...src.matchAll(/\[\w+, \.\.\.prev\w*\]\.slice\(0, ?\d+\)/g)].map(m => m[0]);
    expect(caps).toEqual([]);
    expect('setEntries(previous => [entry, ...previous].slice(0, 250))'.match(/\[\w+, \.\.\.prev\w*\]\.slice\(0, ?\d+\)/g)).toHaveLength(1);
  });
  it('the 21st contract is kept', async () => {
    const history = Array.from({ length: 20 }, (_, i) => ({ id: 'c' + i, savedAt: '2026-09-01T12:00:00Z', target: 'Goal ' + i, studentSig: 'J', status: 'completed' }));
    const q = componentHarness('BehaviorContract', { studentName: 'Kestrel', abcEntries: [], aiAnalysis: null, callGemini: null, t: () => undefined, addToast: () => {} }, { DualLabel: text => text, __durable: { behaviorContracts: history } });
    q.render(true); q.render();
    q.all(n => n.type === 'button' && /Save/.test(q.text(n)) && !/aria-expanded/.test(Object.keys(n.props).join(',')))[0].props.onClick(); q.render();
    q.all(n => n.type === 'button' && n.props['aria-expanded'] !== undefined)[0].props.onClick(); q.render();
    expect(q.all(n => typeof n.props['aria-label'] === 'string' && /^Delete /.test(n.props['aria-label']))).toHaveLength(21);
    expect(q.all(n => n.props['aria-label'] === 'Delete Goal 19')).toHaveLength(1);  // the oldest (history is newest first) is still there
  });
});

describe('every message placeholder gets a value', () => {
  // A tt() text with {n} and no value for it shows a literal "{n}". None do today;
  // this keeps it that way (1,700+ calls).
  function unfilled(source) {
    const re = /\btt\(\s*'([a-z0-9_.]+)'\s*,\s*('(?:[^'\\]|\\.)*'|`[^`]*`)\s*(,\s*\{)?/g;
    const bad = []; let m;
    while ((m = re.exec(source))) {
      const ph = [...m[2].matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map(x => x[1]);
      if (!ph.length) continue;
      if (!m[3]) { bad.push(m[1] + ': ' + ph.join(',')); continue; }
      const i = re.lastIndex - 1; let depth = 0, end = i;
      for (let k = i; k < i + 1200; k++) { if (source[k] === '{') depth++; else if (source[k] === '}') { depth--; if (depth === 0) { end = k; break; } } }
      const obj = source.slice(i, end + 1);
      const missing = ph.filter(p => !new RegExp('(^|[{,\\s])' + p + '\\s*(:|,|\\})').test(obj));
      if (missing.length) bad.push(m[1] + ': ' + missing.join(','));
    }
    return bad;
  }
  it('in the module', () => {
    expect(unfilled(src)).toEqual([]);
  });
  it('the check can fail', () => {
    expect(unfilled("tt('a.b', 'Saved {n} items'); tt('a.c', 'Saved {n} of {total}', { n: 3 });")).toEqual(['a.b: n', 'a.c: total']);
  });
});

describe('sweeps that found nothing stay clean', () => {
  const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
  const registered = k => typeof k.split('.').reduce((a, p) => (a && typeof a === 'object' ? a[p] : undefined), strings) === 'string';
  // A host t() call with no fallback shows nothing (or "undefined") if its key is missing.
  const unregisteredBare = source => [...source.matchAll(/(?<![\w.])t\(\s*'([a-z0-9_.]+)'\s*\)(?!\s*(\|\||\?\?))/g)].map(m => m[1]).filter(k => !registered(k));
  // Sorting an array a tool was handed reorders the app's own data.
  const inPlaceSorts = source => [...source.matchAll(/\b(abcEntries|entries|sessionHistory|observationSessions|sessions|targetBehaviors|notes|history)\.sort\(/g)].map(m => m[0]);
  // A clickable element other than a button needs a role, a tab stop or a key handler.
  function mouseOnly(source) {
    const out = [];
    for (const m of source.matchAll(/h\('(div|span|tr|td|li|p|label|img|section|article)', \{/g)) {
      const start = m.index + m[0].length - 1; let depth = 0, end = start;
      for (let k = start; k < start + 1500; k++) { if (source[k] === '{') depth++; else if (source[k] === '}') { depth--; if (depth === 0) { end = k; break; } } }
      const props = source.slice(start, end + 1);
      if (!/\bonClick\b/.test(props) || /\brole\b|tabIndex|onKeyDown|onKeyUp/.test(props)) continue;
      if (/onClick: (\(?e\)?|e) => e.stopPropagation\(\)/.test(props)) continue;
      out.push(props.slice(0, 60));
    }
    return out;
  }
  it('every bare host t() key is registered', () => {
    expect(unregisteredBare(src)).toEqual([]);
    expect(unregisteredBare("t('behavior_lens.no_such_key_anywhere')")).toEqual(['behavior_lens.no_such_key_anywhere']);
  });
  it('no tool sorts the data it was handed', () => {
    expect(inPlaceSorts(src)).toEqual([]);
    expect(inPlaceSorts('abcEntries.sort((a, b) => 0)')).toEqual(['abcEntries.sort(']);
  });
  it('nothing clickable is mouse-only', () => {
    expect(mouseOnly(src)).toEqual([]);
    expect(mouseOnly("h('div', { onClick: () => go() }, 'x')")).toHaveLength(1);
  });
});
