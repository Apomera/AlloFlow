// Behavior Lens Family view: what a family sees, in the mounted app.
//
// WHY: until 2026-09-24 the only Family view rule was the filter on the hub's tool cards.
// - The role was saved with each student and restored with them, so switching student in
//   Family view brought back teacher view, and a teacher who had shown the Family view
//   reopened that student in it. Family on and off left a specialist in teacher view.
// - Family view listed every student in the class (the Today picker, Quick switch and the
//   setup dropdown) and offered "Download backup" (the whole workspace) and "Load workspace".
// - All tools showed the staff profile editor with its notes, the AI analysis and summary,
//   the staff alerts, and heatmap links into staff tools.
// - The Overview kept its staff buttons (edit, supports, reports), showed observer names
//   and staff notes, and opened in the staff's saved document layout with their review notes.
// - Family tools sent the AI the staff notes, known triggers and accommodations.
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let root, host;
const tick = async () => React.act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
const button = name => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === name);
const buttonMatching = re => [...host.querySelectorAll('button')].find(el => re.test(el.textContent));
const click = async name => { const el = typeof name === 'string' ? button(name) : name; expect(el).toBeTruthy(); await React.act(async () => el.click()); };
const change = async (id, value) => { const el = host.querySelector(id); expect(el).toBeTruthy(); await React.act(async () => Simulate.change(el, { target: { value } })); };
const familyToggle = () => host.querySelector('[aria-label="Family Mode"]');
const inFamily = () => familyToggle().getAttribute('aria-pressed') === 'true';
// Text a person can read, including what is typed into fields.
const visible = () => host.textContent + ' ' + [...host.querySelectorAll('textarea, input')].map(el => el.value).join(' ');

const at = (d, hh) => new Date(2026, 8, d, hh).toISOString();
const staff = (id, d, extra) => Object.assign({ id, antecedent: 'Math task', behavior: 'Yelled', consequence: 'Break', intensity: 5, observer: 'Ms. Staffer', notes: 'STAFF NOTE about a custody matter', occurredAt: at(d, 9), timestamp: at(d, 9) }, extra);
const ENTRIES = [
  staff('e1', 20), staff('e2', 21), staff('e3', 22),
  { id: 'home_h1', antecedent: 'Bedtime routine', behavior: 'Cried', consequence: 'Gave a break', intensity: null, observer: 'Family (home log)', source: 'home-log', setting: 'Home', notes: '[Home Log] Slept badly after a long day', occurredAt: at(22, 20), timestamp: at(22, 21) }
];
function seed(id, name, extra) {
  localStorage.setItem('behaviorLens_workspace_' + id, JSON.stringify(Object.assign({ student: name, studentId: id, abcEntries: [], observationSessions: [], savedAt: '2026-09-20T12:00:00.000Z' }, extra)));
}
const RICH = {
  abcEntries: ENTRIES,
  studentProfile: { interests: 'Trains and maps', strengths: 'Kind to peers', triggers: 'Loud noises', accommodations: 'Noise-cancelling headphones', notes: 'STAFF PROFILE NOTE' },
  aiAnalysis: { summary: 'AI SUMMARY TEXT for staff', hypothesizedFunction: 'Escape', confidence: 60, patterns: [], recommendations: ['Teach a break request'] },
  fullSummary: 'FULL SUMMARY TEXT for staff',
  toolState: { observationReviewFilters: { dateRange: 0, targetId: '' }, reviewPresentation: { mode: 'document', measurement: 'notes', monochrome: false },
    homeLog: [{ id: 'h2', timestamp: at(21, 21), occurredAt: at(21, 19), behavior: 'Refused dinner', context: 'Mealtime', response: 'Offered choices' }, { id: 'h3', timestamp: at(22, 21), occurredAt: at(22, 7), behavior: 'Refused shoes', context: 'Morning routine', response: 'Used a timer' }] }
};
let prompts, toasts;
async function mount(studentNickname = 'Student A') {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({
    studentNickname, isCanvasEnv: true, isTeacherMode: true,
    callGemini: async prompt => { prompts.push(prompt); return 'A reply'; },
    addToast: (m, k) => toasts.push([m, k]),
    dashboardData: [{ studentNickname: 'Student A' }, { studentNickname: 'Student B' }]
  }))));
  await tick();
}
async function unmount() { if (root) await React.act(async () => root.unmount()); host?.remove(); host = null; root = null; document.body.innerHTML = ''; }
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); delete window.__alloFirebase; prompts = []; toasts = [];
  localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'fv-a', name: 'Student A' }, { id: 'fv-b', name: 'Student B' }, { id: 'fv-c', name: 'Student C' }]));
});
afterEach(unmount);

describe('the role belongs to the person at the device', () => {
  it('switching student keeps the view it was in', async () => {
    seed('fv-a', 'Student A', { userRole: 'teacher' });
    seed('fv-b', 'Student B', { userRole: 'parent' });
    await mount();
    expect(inFamily()).toBe(false);
    await change('#bl-today-student', 'Student B'); await tick();
    expect(inFamily()).toBe(false);                                   // was Family: B's saved role
  });
  it('Family view is not reopened with the student', async () => {
    seed('fv-a', 'Student A');
    await mount(); await click(familyToggle()); await tick();
    expect(inFamily()).toBe(true);
    await tick(); await unmount(); await mount();
    expect(inFamily()).toBe(false);                                   // was Family: saved with the student
  });
  it('Family off returns a specialist to the specialist view, which is remembered', async () => {
    seed('fv-a', 'Student A');
    await mount(); await click('Student and role settings');
    await click(host.querySelector('[aria-label="Use specialist view"]'));
    await click(familyToggle()); await click(familyToggle());
    expect(host.querySelector('[aria-label="Use specialist view"]').getAttribute('aria-pressed')).toBe('true');   // was teacher
    await tick(); await unmount(); await mount(); await click('Student and role settings');
    expect(host.querySelector('[aria-label="Use specialist view"]').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Family view shows one student', () => {
  it('no other names and no whole-workspace files', async () => {
    seed('fv-a', 'Student A');
    await mount();
    expect(host.querySelector('#bl-today-student')).toBeTruthy();
    expect(button('Download backup')).toBeTruthy();
    await click('All tools');
    expect(visible()).toContain('Quick Switch');
    expect(host.querySelector('select[aria-label="Choose a student"]')).toBeTruthy();
    expect(buttonMatching(/Load Workspace/)).toBeTruthy();
    await click(familyToggle());
    expect(visible()).not.toContain('Quick Switch');
    expect(visible()).not.toContain('Student B');
    expect(host.querySelector('select[aria-label="Choose a student"]')).toBeFalsy();
    expect(buttonMatching(/Download backup|Load Workspace/)).toBeFalsy();
    await click('Today');
    expect(host.querySelector('#bl-today-student')).toBeFalsy();
    expect(button('Download backup')).toBeFalsy();
    expect(button('Load workspace from file')).toBeFalsy();
  });
});

describe('All tools in Family view', () => {
  it('leaves out the staff profile, AI output, staff alerts and staff links', async () => {
    seed('fv-a', 'Student A', RICH);
    await mount(); await click('All tools');
    const staffOnly = () => [
      buttonMatching(/Student Profile/) && 'profile editor',
      visible().includes('AI SUMMARY TEXT') && 'AI analysis',
      visible().includes('Full Student Summary') && 'full summary',
      visible().includes('Consider consulting your BCBA') && 'staff alert',
      host.querySelector('[aria-label="View Full"]') && 'heatmap link'
    ].filter(Boolean);
    expect(staffOnly()).toEqual(['profile editor', 'AI analysis', 'full summary', 'staff alert', 'heatmap link']);
    await click(familyToggle());
    expect(staffOnly()).toEqual([]);
    expect(visible()).toContain('4-Week Activity');                 // the heatmap itself stays
  });
});

describe('the Overview in Family view', () => {
  it('has no staff buttons, observers, staff notes or staff review document', async () => {
    seed('fv-a', 'Student A', RICH);
    await mount(); await click('Review observations');
    expect(host.querySelector('[data-bl-document]')).toBeTruthy();   // the staff's saved layout
    expect(host.querySelector('#bl-review-narrative')).toBeTruthy();
    await click('Dashboard');
    expect(button('Edit observation')).toBeTruthy();
    expect(host.querySelector('[aria-label="Open AI Analysis"]')).toBeTruthy();
    expect(visible()).toContain('STAFF NOTE about a custody matter');
    expect(visible()).toContain('Ms. Staffer');
    await click('Document');                                           // leave the staff layout saved
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]'));
    await click(familyToggle()); await click('Review observations');
    expect(host.querySelector('[data-bl-document]')).toBeFalsy();
    expect(host.querySelector('#bl-review-narrative')).toBeFalsy();
    expect(host.querySelector('[aria-label="Review presentation"]')).toBeFalsy();
    for (const name of ['Edit observation', 'Plan or review supports', 'Prepare report from this view', 'Measure this target']) expect(button(name)).toBeFalsy();
    expect(visible()).not.toContain('STAFF NOTE');
    expect(visible()).not.toContain('Ms. Staffer');
    expect(visible()).toContain('Slept badly after a long day');     // the family's own note
    expect(host.querySelector('[aria-label="Export this tool"]')).toBeFalsy();
    expect(host.querySelector('[aria-label="Open AI Analysis"], [aria-label="Open ABC Data"]')).toBeFalsy();   // Related Tools
    await click('Record an observation');
    expect(visible()).toMatch(/Log a Behavior/);                      // the home log, not the staff ABC form
    expect(host.querySelector('[aria-label="New ABC entry"]')).toBeFalsy();
  });
});

describe('AI replies a family reads', () => {
  async function analyzeHomeLog(family) {
    localStorage.setItem('bl_ai_consent_v1', '1');
    seed('fv-a', 'Student A', RICH);
    await mount();
    if (family) { await click(familyToggle()); await click('Add home observation'); }
    else { await click('All tools'); await click(host.querySelector('[aria-label="Open Home Behavior Log"], [aria-label^="Open Home"]') || buttonMatching(/Home Behavior Log/)); }
    await click(buttonMatching(/Analyze Patterns/)); await tick();
    return prompts.join('\n');
  }
  it('Family view sends interests and strengths, not staff notes, triggers or accommodations', async () => {
    const sent = await analyzeHomeLog(true);
    expect(sent).toContain('Trains and maps');
    for (const staffText of ['STAFF PROFILE NOTE', 'Loud noises', 'Noise-cancelling']) expect(sent).not.toContain(staffText);
  });
  it('staff still get the full context', async () => {
    const sent = await analyzeHomeLog(false);
    expect(sent).toContain('STAFF PROFILE NOTE');
    expect(sent).toContain('Loud noises');
  });
});

describe('which AI context each family and student screen gets', () => {
  const src = readFileSync(resolve('behavior_lens_module.js'), 'utf8');
  const panelBlock = panel => { const start = src.indexOf("activePanel === '" + panel + "' && h("); expect(start).toBeGreaterThan(0); return src.slice(start, src.indexOf('activePanel ===', start + 10)); };
  it('screens the student uses never get the staff context', () => {
    for (const panel of ['traffic', 'selfcheck', 'selfregulation']) expect(panelBlock(panel), panel).toMatch(/callGemini: callGeminiFamilySafe,/);
  });
  it('family tools get it only in Family view', () => {
    for (const panel of ['homelog', 'homenote', 'pocket', 'familyvoice', 'snapshot']) expect(panelBlock(panel), panel).toMatch(/callGemini: isParentMode \? callGeminiFamilySafe : callGeminiWithContext,/);
  });
});
