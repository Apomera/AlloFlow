// Behavior Lens AI analysis in the mounted app: the hub card, the tool badge, alerts and panels.
//
// WHY: until 2026-09-24
// - Only the Overview and the progress report checked whether the saved analysis still matched
//   the data. The hub card, the "Ready" badge, the alerts, the exports, the BCBA handoff, IEP
//   prep, the full summary and the parent share all reused an out-of-date analysis as current.
// - The hub card never showed the model's own caveats or what the analysis was based on, and
//   its small-sample warning counted today's entries, not the ones analyzed.
// - "Multiple" or "Unknown" was drawn in Attention's blue with its eyes icon.
// - A reply with no analysis in it (for example []) replaced the saved analysis with an empty card.
// - A dismissed alert never came back.
// - The hub's recent sessions divided by the planned intervals and showed 0 for a multi-counter count.
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
let root, host, toasts, replies;
const tick = async () => React.act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
const button = name => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === name);
const click = async name => { const el = typeof name === 'string' ? button(name) : name; expect(el, String(name)).toBeTruthy(); await React.act(async () => el.click()); };
const text = () => host.textContent;
const runtime = () => window.AlloModules.BehaviorLensWorkspace;
const saved = () => JSON.parse(localStorage.getItem('behaviorLens_workspace_ai-a'));

const iso = (d, hh = 9) => new Date(Date.UTC(2026, 8, d, hh)).toISOString();
const ENTRIES = Array.from({ length: 12 }, (_, i) => ({ id: 'e' + i, antecedent: 'Math task', behavior: 'Yelled', consequence: 'Break', intensity: i < 3 ? 5 : 2, occurredAt: iso(1 + i), timestamp: iso(1 + i), timezoneOffset: 240 }));
function workspace(extra) { return Object.assign({ student: 'Student A', studentId: 'ai-a', abcEntries: ENTRIES, observationSessions: [], savedAt: '2026-09-20T12:00:00.000Z' }, extra); }
// An analysis of exactly the seeded data, as the app would have saved it.
function freshAnalysis(extra, base) {
  const loaded = runtime().normalizeWorkspace(workspace(base));
  return Object.assign({ summary: 'SAVED SUMMARY of the pattern', hypothesizedFunction: 'Escape', confidence: 60, patterns: [], recommendations: [], notes: '',
    provenance: { sourceFingerprint: runtime().dataFingerprint(loaded.abcEntries, loaded.targetBehaviors), totalEntries: 12, sampleCount: 12, sampleStrategy: 'complete', dateFrom: iso(1), dateTo: iso(12), generatedAt: iso(13) } }, extra);
}
const staleAnalysis = extra => freshAnalysis(Object.assign({ provenance: { sourceFingerprint: 'bl-data-older', totalEntries: 11, sampleCount: 11, sampleStrategy: 'complete' } }, extra));
function seed(extra) { localStorage.setItem('behaviorLens_workspace_ai-a', JSON.stringify(workspace(extra))); }
async function mount() {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({
    studentNickname: 'Student A', isCanvasEnv: true, isTeacherMode: true, dashboardData: [{ studentNickname: 'Student A' }],
    addToast: (m, k) => toasts.push([m, k]), callGemini: async () => replies.shift()
  }))));
  await tick();
}
async function unmount() { if (root) await React.act(async () => root.unmount()); host?.remove(); host = null; root = null; document.body.innerHTML = ''; }
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); delete window.__alloFirebase; toasts = []; replies = [];
  localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'ai-a', name: 'Student A' }]));
});
afterEach(unmount);
const toolCard = id => host.querySelector('article[aria-labelledby="bl-tool-' + id + '-title"]');

describe('an analysis of data that has changed since', () => {
  it('is marked out of date and not treated as current', async () => {
    seed({ aiAnalysis: staleAnalysis() });
    await mount(); await click('All tools');
    expect(text()).toContain('Out of date:');
    expect(button('Run the analysis again')).toBeTruthy();
    expect(toolCard('analysis').textContent).toContain('Out of date');      // was "Ready"
    expect(toolCard('analysis').textContent).not.toContain('Ready');
    expect(text()).toContain('You have enough data for AI analysis');      // the alert treated it as done
  });
  it('a current analysis is Ready and unmarked', async () => {
    seed({ aiAnalysis: freshAnalysis() });
    await mount(); await click('All tools');
    expect(text()).not.toContain('Out of date');
    expect(toolCard('analysis').textContent).toContain('Ready');
    expect(text()).not.toContain('You have enough data for AI analysis');
  });
  it('is left out of the exported text', async () => {
    const copied = [];
    const clip = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { copied.push(value); } } });
    try {
      for (const analysis of [freshAnalysis(), staleAnalysis()]) {
        localStorage.clear(); localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'ai-a', name: 'Student A' }]));
        seed({ aiAnalysis: analysis });
        await mount(); await click('Review observations');
        await click(host.querySelector('[aria-label="Export this tool"]'));
        await click(host.querySelector('[aria-label="Copy as Text"]')); await tick();
        await unmount();
      }
    } finally { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clip }); }
    expect(copied).toHaveLength(2);
    expect(copied[0]).toContain('SAVED SUMMARY of the pattern');
    expect(copied[1]).not.toContain('SAVED SUMMARY of the pattern');
  });
  it('every tool that uses it gets it only while it is current', () => {
    const src = readFileSync(resolve('behavior_lens_module.js'), 'utf8');
    const block = panel => { const start = src.indexOf("activePanel === '" + panel + "' && h("); expect(start, panel).toBeGreaterThan(0); return src.slice(start, src.indexOf('activePanel ===', start + 10)); };
    for (const panel of ['export', 'hypothesis', 'goals', 'contract', 'cycle', 'reinforcer', 'triangulation', 'crisis', 'traffic', 'homenote', 'fidelity', 'gas', 'pocket', 'counseling', 'snapshot', 'intervention', 'progress', 'fbaworkflow', 'iepprep', 'alloBotChat', 'bcbahandoff', 'sharing']) {
      expect(block(panel), panel).toMatch(/aiAnalysis: currentAnalysis,/);
    }
    // These check it themselves and say so.
    for (const panel of ['overview', 'progressreport']) expect(block(panel), panel).toMatch(/\n\s+aiAnalysis,|aiAnalysis, targetBehaviors/);
  });
});

describe('the hub analysis card', () => {
  it('shows what it was based on, the model caveats, and a neutral colour for Multiple', async () => {
    // The fingerprint has to match, so build it for the same data, then say it covered 8 entries.
    const a = freshAnalysis({ hypothesizedFunction: 'Multiple', notes: 'Afternoon data are missing.' });
    a.provenance.totalEntries = 8; a.provenance.sampleCount = 8;
    seed({ aiAnalysis: a });
    await mount(); await click('All tools');
    expect(host.querySelector('[data-bl-analysis-basis]').textContent).toMatch(/^Based on all 8 entries, recorded 2026-09-0\d to 2026-09-1\d\. Run /);
    expect(host.querySelector('[data-bl-analysis-notes]').textContent).toContain('Afternoon data are missing.');
    expect(text()).toContain('8 ABC entries analyzed');                     // was today's 12
    const card = [...host.querySelectorAll('h3')].find(el => el.textContent.includes('AI-Assisted Analysis')).closest('div.mt-6');
    expect(card.textContent).toContain(String.fromCharCode(0x2754) + ' Multiple');
    expect(card.textContent).not.toContain(String.fromCodePoint(0x1F440));   // Attention's eyes
  });
  it('a reply with no analysis in it keeps the saved one', async () => {
    localStorage.setItem('bl_ai_consent_v1', '1');
    seed({ aiAnalysis: freshAnalysis() });
    replies = ['[]'];
    await mount(); await click('All tools');
    await click('Open AI Pattern Analysis'); await tick();
    expect(toasts.some(([m, k]) => k === 'error' && /Analysis failed/.test(m))).toBe(true);
    expect(text()).toContain('SAVED SUMMARY of the pattern');              // was replaced by an empty card
  });
});

describe('alerts', () => {
  const consult = () => [...host.querySelectorAll('button[aria-label="Close"]')].find(el => el.parentElement.textContent.includes('Consider consulting'));
  it('a dismissal covers the alert as it was, and it returns with a new severe incident', async () => {
    seed({ dismissedAlerts: ['consult_bcba|e2'] });                          // e2: the newest severe entry
    await mount(); await click('All tools');
    expect(consult()).toBeFalsy();
    await unmount();
    seed({ dismissedAlerts: ['consult_bcba|e2'], abcEntries: ENTRIES.map((e, i) => i === 3 ? { ...e, intensity: 4 } : e) });
    await mount(); await click('All tools');
    expect(consult()).toBeTruthy();                                         // was silenced for good
    await click(consult()); await tick(); await tick();
    expect(consult()).toBeFalsy();
    expect(saved().dismissedAlerts).toContain('consult_bcba|e3');
  });
});

describe('recent observation sessions on the hub', () => {
  it('reads each result the way the exports do', async () => {
    seed({ observationSessions: [
      { id: 's1', method: 'interval', timestamp: iso(20), duration: 600, data: { occurredCount: 3, completedCount: 8, totalIntervals: 20 } },
      { id: 's2', method: 'frequency', timestamp: iso(21), duration: 300, data: { counters: [{ id: 'c1', count: 2 }, { id: 'c2', count: 3 }], totalCount: 5 } }
    ] });
    await mount(); await click('All tools');
    const list = [...host.querySelectorAll('h3')].find(el => el.textContent.includes('Recent Observation Sessions')).parentElement.textContent;
    expect(list).toContain('3 of 8 intervals with the behavior');            // was 3/20
    expect(list).not.toContain('3/20');
    expect(list).toContain('5 occurrences');                                // was 0
  });
});
