// Behavior Lens panels with a keyboard and a screen reader (pass 9).
//
// WHY: until 2026-09-24, from a read-only audit that mounted every tool:
// - Running the AI analysis from the ABC log moved the user to the tools list, where the result
//   came after 310 focusable controls, with nothing announced.
// - Switching student removed the pressed button and was silent (a toast only), so a screen
//   reader user could keep recording against the student they had just left.
// - In the ABC log, Delete, "Yes, Delete", Restore, "Clear all filters" and "Clear selection"
//   dropped focus onto the page; every row's controls had the same names ("Delete" x42); and
//   "No entries match your filters" was never announced.
// - Export format and range, the IOA method, interval and mode, and the ABA graph's data source
//   showed the chosen option by colour only.
// - 19 inputs were named by their example ("eg 12, 15, 14, 13, 16"), four tables were captioned
//   "behavior lens module data table", and the Overview's daily and hourly charts kept their
//   numbers in tooltips and colours.
// - Effect sizes, IOA results, the IEP prep packet and an inspected graph point appeared silently.
// - The Data Quality badge was named "🟢 100%"; chart axis numbers were #94a3b8 on white (2.6:1).
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const src = readFileSync('behavior_lens_module.js', 'utf8');
let root, host;
const settle = (ms = 60) => React.act(async () => { await new Promise(done => setTimeout(done, ms)); });
const panel = () => document.querySelector('[data-bl-panel-content]');
const live = () => (document.getElementById('behavior-lens-live-status') || {}).textContent || '';
const buttonText = (text, scope = document) => [...scope.querySelectorAll('button')].find(el => el.textContent.trim() === text);
const buttonIncl = (text, scope = document) => [...scope.querySelectorAll('button')].find(el => el.textContent.includes(text));
const press = async el => { expect(el).toBeTruthy(); el.focus(); await React.act(async () => el.click()); await settle(); };
const change = async (el, value) => { expect(el).toBeTruthy(); await React.act(async () => Simulate.change(el, { target: { value } })); };
const lost = () => !document.activeElement || document.activeElement === document.body;
const daysAgo = (d, hh = 9, mm = 0) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(hh, mm, 0, 0); return x.toISOString(); };
const analysisReply = JSON.stringify({ summary: 'Refusal follows independent math work.', hypothesizedFunction: 'Escape', confidence: 60, patterns: [{ pattern: 'After math demands', frequency: '10 of 30', evidence: 'Entries 1, 4' }], recommendations: ['Offer a break card'], notes: 'Sampled.' });
const callGemini = async prompt => (String(prompt).includes('"hypothesizedFunction"') ? analysisReply : 'Packet text for the team.');

function seed() {
  localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'pa-a', name: 'Student A' }, { id: 'pa-b', name: 'Student B' }]));
  localStorage.setItem('bl_onboarded', 'true');
  localStorage.setItem('bl_ai_consent_v1', '1');
  const targets = [{ id: 'refusal', label: 'Task refusal', measurement: 'count', operationalDefinition: 'Pushes work away.' }, { id: 'help', label: 'Requests help', measurement: 'count', operationalDefinition: 'Raises hand.' }];
  const abcEntries = Array.from({ length: 30 }, (_, i) => {
    const target = targets[i % 2];
    const when = daysAgo(i % 15, 8 + (i % 6), (i * 7) % 60);
    return { id: 'abc-' + i, timestamp: when, occurredAt: when, behaviorId: target.id, behavior: target.label, antecedent: ['Math work', 'Transition', 'Peer conflict'][i % 3], consequence: ['Break', 'Redirection'][i % 2], intensity: (i % 5) + 1, setting: 'Classroom', observer: 'Ms. Rivera', notes: i % 5 === 0 ? 'Calmed with a timer.' : '' };
  });
  const sessionHistory = Array.from({ length: 10 }, (_, i) => ({ id: 'sh-' + i, date: daysAgo(10 - i, 11), endedAt: daysAgo(10 - i, 11), durationSec: 1200, behavior: 'Task refusal', count: i < 5 ? 8 : 3, phase: i < 5 ? 'Baseline' : 'Intervention', targets: [{ id: 'refusal', name: 'Task refusal', type: 'frequency', count: i < 5 ? 8 : 3, total: 0, durations: [], intervals: [], rate: 0.4 }] }));
  localStorage.setItem('behaviorLens_workspace_pa-a', JSON.stringify({ targetBehaviors: targets, abcEntries, observationSessions: [], sessionHistory }));
}
async function mount() {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isTeacherMode: true, callGemini, dashboardData: [{ studentNickname: 'Student A' }, { studentNickname: 'Student B' }] }))));
  await settle(400);
}
async function openTool(id) {
  const back = document.querySelector('[aria-label="Back to BehaviorLens tools"]');
  if (back) await press(back);
  if (!document.getElementById('bl-tool-' + id + '-title')) await press(buttonText('All tools'));
  const buttons = document.getElementById('bl-tool-' + id + '-title').closest('article').querySelectorAll('button');
  await press(buttons[buttons.length - 1]);
  await settle(250);
}
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(async () => { localStorage.clear(); sessionStorage.clear(); seed(); await mount(); });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); host?.remove(); root = null; host = null; document.body.innerHTML = ''; });

describe('the ABC log', () => {
  it('names each row control by its entry', async () => {
    await openTool('abc');
    const names = [...panel().querySelectorAll('tbody button, tbody input')].map(el => el.getAttribute('aria-label')).filter(Boolean);
    expect(names.length).toBeGreaterThan(20);
    expect(new Set(names).size).toBe(names.length);                        // was "Delete" and "Edit entry" on every row
    expect(names.find(name => name.startsWith('Delete '))).toMatch(/^Delete (Task refusal|Requests help), /);
  });
  it('keeps focus through bulk delete, row delete and restore', async () => {
    await openTool('abc');
    const boxes = () => [...panel().querySelectorAll('tbody input[type="checkbox"]')];
    await press(boxes()[0]); await press(boxes()[1]);
    await press(buttonIncl('Delete Selected', panel()));
    expect(document.activeElement.textContent).toBe('Yes, Delete');        // was the page
    await press(buttonText('Cancel', panel()));
    expect(document.activeElement.hasAttribute('data-bl-bulk-delete')).toBe(true);   // (body text contains it too)
    await press(buttonIncl('Delete Selected', panel()));
    await press(buttonText('Yes, Delete', panel()));
    expect(document.activeElement.id).toBe('bl-abc-recently-deleted-toggle');
    await press(panel().querySelector('tbody button[aria-label^="Delete "]'));
    await press(buttonText('Move to Recently deleted'));
    await settle(200);
    expect(lost()).toBe(false);
    expect(document.activeElement.matches('tbody input[type="checkbox"]')).toBe(true);
    await press(document.getElementById('bl-abc-recently-deleted-toggle'));
    await press(panel().querySelector('[data-bl-restore]'));
    expect(document.activeElement.hasAttribute('data-bl-restore')).toBe(true);
  });
  it('says when no entries match, and "Clear all filters" returns to the search', async () => {
    await openTool('abc');
    await change(panel().querySelector('input[aria-label="Search ABC entries"]'), 'zzzz');
    const none = [...panel().querySelectorAll('[role="status"]')].find(el => /No entries match/.test(el.textContent));
    expect(none).toBeTruthy();                                             // was silent
    await press(buttonText('Clear all filters', panel()));
    expect(document.activeElement.getAttribute('aria-label')).toBe('Search ABC entries');
  });
});

describe('moving around', () => {
  it('switching student says who is open and keeps focus', async () => {
    await press(buttonText('All tools'));
    await press(document.querySelector('button[aria-label="Switch to student Student B"]'));
    await settle(300);
    expect(live()).toBe('Now viewing Student B');                          // was silent
    expect(document.activeElement.id).toBe('bl-quick-switch');
    expect(document.activeElement.getAttribute('aria-label')).toBe('Quick switch. Now viewing Student B');
  });
  it('the AI analysis from the ABC log ends on its result', async () => {
    await openTool('abc');
    await press(buttonIncl('AI Analyze', panel()));
    await settle(600);
    expect(document.activeElement.id).toBe('bl-ai-analysis-title');        // was the tools list, 310 stops away
    expect(live()).toBe('AI analysis complete');
  });
  it('announces a tool by its title', async () => {
    await openTool('scatterplot');
    expect(live()).toBe('Opened Time Pattern Finder (Scatterplot Analysis)');   // was "Opened scatterplot panel"
  });
});

describe('results that appear', () => {
  it('effect sizes, the IEP packet and an inspected graph point take focus', async () => {
    await openTool('effectsize');
    await change(panel().querySelector('input[aria-label="Baseline phase (A) data, separated by commas"]'), '9, 8, 9, 8, 9');
    await change(panel().querySelector('input[aria-label="Intervention phase (B) data, separated by commas"]'), '5, 4, 3, 2, 1');
    await press(panel().querySelector('button[aria-label="Calculate Effect Sizes"]'));
    expect(document.activeElement.getAttribute('aria-label')).toBe('Effect size results');
    await openTool('iepprep');
    await press(buttonIncl('Generate IEP Prep Packet', panel()));
    await settle(400);
    expect(document.activeElement.getAttribute('aria-label')).toBe('IEP prep packet');
    await openTool('overview');
    await press(panel().querySelector('button[aria-label="Inspect graph point 1"]'));
    expect(document.activeElement.getAttribute('aria-label')).toBe('Selected graph record');
  });
});

describe('what is chosen, and what things are called', () => {
  const pressed = list => list.map(el => el.getAttribute('aria-pressed'));
  it('export, IOA and graph options say which one is chosen', async () => {
    await openTool('export');
    const formats = () => [...panel().querySelectorAll('[aria-labelledby="bl-export-format-label"] button')];
    expect(pressed(formats())).toEqual(['true', 'false', 'false']);
    await press(formats()[1]);
    expect(pressed(formats())).toEqual(['false', 'true', 'false']);
    expect(pressed([...panel().querySelectorAll('[aria-labelledby="bl-export-range-label"] button')])).toContain('true');
    await openTool('ioacalc');
    expect(pressed([...panel().querySelectorAll('[aria-label="Agreement method"] button')])).toEqual(['true', 'false', 'false']);
    expect(pressed([...panel().querySelectorAll('[aria-labelledby="bl-ioa-interval-label"] button')]).filter(v => v === 'true')).toHaveLength(1);
    const methods = [...panel().querySelectorAll('button')].filter(el => /Interval-by-Interval|Total Count/.test(el.textContent));
    expect(pressed(methods).filter(v => v === 'true')).toHaveLength(1);
    await openTool('abagraph');
    expect(pressed([...panel().querySelectorAll('[aria-label="Graph data source"] button')])).toEqual(['true', 'false']);
  });
  it('the data quality badge says what it is and that it opens', async () => {
    const badge = [...document.querySelectorAll('button')].find(el => /^Data quality: /.test(el.getAttribute('aria-label') || ''));
    expect(badge).toBeTruthy();                                            // was named "🟢 100%"
    expect(badge.getAttribute('aria-expanded')).toBe('false');
    await press(badge);
    expect(badge.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(badge.getAttribute('aria-controls'))).toBeTruthy();
  });
  it('no input is named by its example, no table is captioned generically, and axis numbers are dark', () => {
    expect(src.match(/['"]aria-label['"]:\s*['"](?:eg\b|e\.g\.)/g)).toBeNull();
    expect(src).not.toContain("'aria-label': 'Optional'");
    expect(src).not.toContain('behavior lens module data table');
    expect(src.split(String.fromCharCode(10)).filter(line => line.includes("h('text'") && line.includes("fill: '#94a3b8'"))).toEqual([]);
  });
});

describe('the Overview charts', () => {
  it('give their numbers as tables, with the drawings hidden from screen readers', async () => {
    await openTool('overview');
    const details = buttonIncl('Detailed charts', panel()) || [...panel().querySelectorAll('summary')].find(el => /Detailed charts/.test(el.textContent));
    if (details) await press(details);
    const daily = panel().querySelector('[data-bl-daily-table]');
    const hours = panel().querySelector('[data-bl-hour-table]');
    expect(daily.querySelectorAll('tbody tr').length).toBeGreaterThan(5);
    expect(hours.querySelectorAll('tbody tr').length).toBe(6);             // 8:00 to 13:00
    expect(hours.querySelector('tbody th').textContent).toBe('8:00 to 8:59');
    expect(Number(hours.querySelector('tbody td').textContent)).toBe(5);
    expect([...panel().querySelectorAll('div[title]')].filter(el => !el.closest('[aria-hidden="true"]') && !el.textContent.trim())).toEqual([]);
    const cooccurrence = [...panel().querySelectorAll('table')].find(table => /before-event/.test(table.querySelector('caption')?.textContent || ''));
    expect(cooccurrence.querySelector('tbody tr').firstElementChild.tagName).toBe('TH');
  });
});
