import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let root, host;
const tick = async () => React.act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
const button = name => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === name);
const click = async name => { const el = typeof name === 'string' ? button(name) : name; expect(el).toBeTruthy(); await React.act(async () => el.click()); };
const change = async (selector, value) => { const el = host.querySelector(selector); expect(el).toBeTruthy(); await React.act(async () => Simulate.change(el, { target: { value } })); };
const workspace = (id = 'workflow-a') => JSON.parse(localStorage.getItem('behaviorLens_workspace_' + id));
async function mount(props = {}) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isCanvasEnv: true, isTeacherMode: true, dashboardData: [{ studentNickname: 'Student A' }, { studentNickname: 'Student B' }], ...props }))));
  await tick();
}
async function unmount() { if (root) await React.act(async () => root.unmount()); host?.remove(); host = null; root = null; }
const when = days => { const d = new Date(); d.setDate(d.getDate()-days); d.setHours(9,0,0,0); return d.toISOString(); };
function seed(extra = {}) {
  localStorage.setItem('behaviorLens_workspace_workflow-a', JSON.stringify({
    targetBehaviors: [{ id:'help', label:'Requests help', measurement:'count', operationalDefinition:'Shows a help card.' },{ id:'break', label:'Requests break', measurement:'duration', operationalDefinition:'Asks for a break.' }],
    abcEntries: [0,13,14].map(days => ({id:'help-'+days,timestamp:when(days),behaviorId:'help',behavior:'Requests help',antecedent:'Task',consequence:'Help offered'})).concat([{id:'break-note',timestamp:when(0),behaviorId:'break',behavior:'Requests break',antecedent:'Task',consequence:'Break offered'}]),
    observationSessions: [{id:'mixed',timestamp:when(0),duration:600,method:'frequency',data:{count:100,rate:10,counters:[{behaviorId:'help',label:'Requests help',count:2},{behaviorId:'break',label:'Requests break',count:98}]}},{id:'unassigned',timestamp:when(0),duration:600,method:'frequency'}],
    ...extra
  }));
}
const openReview = async () => { await click('Review observations'); await change('#bl-review-target','help'); };
const openSupports = async () => { await openReview(); await click('Plan or review supports'); };
const openReport = async () => { await openReview(); await click('Prepare report from this view'); await click('Advanced report options'); };
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); delete window.__alloFirebase; localStorage.setItem('bl_student_roster', JSON.stringify([{id:'workflow-a',name:'Student A'},{id:'workflow-b',name:'Student B'}])); });
afterEach(async () => { await unmount(); vi.restoreAllMocks(); });

describe('Target-aware recording', () => {
  it.each(['count','duration','latency','interval'])('launches the saved %s measurement with its definition', async measurement => {
    await mount(); await click('Define a target');
    await change('#bl-definition-label','Requests help'); await change('#bl-definition-text','Shows a help card.'); await change('#bl-definition-measure',measurement);
    await click('Save target and measure'); await tick();
    const target = workspace().targetBehaviors[0];
    expect(host.querySelector('[data-bl-recording-target]').dataset.blRecordingTarget).toBe(target.id);
    expect(host.querySelector('[data-bl-recording-target]').textContent).toContain('Shows a help card.');
    if (measurement==='count') {
      expect(host.querySelector('[aria-label="Behavior counter label"]').value).toBe('Requests help');
      await click(host.querySelector('[aria-label="Add one to Requests help"]')); await click('Save'); await tick();
      expect(workspace().observationSessions[0]).toMatchObject({behaviorId:target.id,method:'frequency',data:{counters:[{behaviorId:target.id,label:'Requests help',count:1}]}});
    } else if (measurement==='interval') expect(host.querySelector('[aria-label="Interval duration in seconds"]')).toBeTruthy();
    else expect([...host.querySelectorAll('[aria-pressed="true"]')].some(el=>el.textContent.toLowerCase().includes(measurement))).toBe(true);
  });
  it('retains the old target when another target opens a recovered recording', async () => {
    seed(); sessionStorage.setItem('behaviorLens_observation_draft_v1_frequency_workflow-a', JSON.stringify({version:1,savedAt:Date.now(),data:{target:{id:'break',label:'Requests break'},elapsed:60,counters:[{id:'old',behaviorId:'break',label:'Requests break',count:3}]}}));
    await mount(); await openReview(); await click('Measure this target');
    expect(host.querySelector('[data-bl-recording-target]').dataset.blRecordingTarget).toBe('break');
    expect(host.textContent).toContain('Its original target and setup have been kept');
    await click('Save'); await tick();
    expect(workspace().observationSessions.find(session=>session.data?.counters?.[0]?.count===3).behaviorId).toBe('break');
  });
});

describe('Persistent support strategies', () => {
  it('keeps drafts through reload and student changes, then updates one saved strategy', async () => {
    seed(); await mount(); await openSupports();
    expect(host.querySelector('#bl-support-target').value).toBe('help');
    await change('#bl-support-strategy','Offer the agreed visual prompt before independent work.'); await change('#bl-support-owner','Teacher'); await tick();
    await unmount(); await mount(); await click('Work on a support plan');
    expect(host.querySelector('#bl-support-strategy').value).toContain('visual prompt');
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]')); await change('#bl-today-student','Student B'); await tick(); await click('Work on a support plan');
    expect(host.querySelector('#bl-support-strategy').value).toBe('');
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]')); await change('#bl-today-student','Student A'); await tick(); await click('Work on a support plan');
    await click('Save strategy'); await tick();
    const id=workspace().toolState.supportStrategies[0].id;
    await change('#bl-support-status','active'); await change('#bl-support-notes','Used during two lessons.'); await click('Save strategy'); await tick();
    expect(workspace().toolState.supportStrategies).toHaveLength(1);
    expect(workspace().toolState.supportStrategies[0]).toMatchObject({id,status:'active',reviewNotes:'Used during two lessons.'});
    expect(host.querySelector('[data-bl-support-plan]').textContent).toContain('3 context notes · 1 linked timed sessions');
    await click('Review all observations for this target');
    expect(host.querySelector('#bl-review-target').value).toBe('help');
    expect(host.textContent).toContain('3 context notes and 1 timed session');
  });
  it('validates review dates and asks before replacing unsaved strategy edits', async () => {
    seed(); await mount(); await openSupports(); await change('#bl-support-strategy','Agreed support');
    await change('#bl-support-start','2026-09-18'); await change('#bl-support-review','2026-09-17'); await click('Save strategy');
    expect(host.textContent).toContain('review date must be on or after');
    await change('#bl-support-review','2026-09-20'); await click('Save strategy'); await change('#bl-support-notes','Unfinished review');
    await click('Plan another strategy'); await click('Keep editing');
    expect(host.querySelector('#bl-support-notes').value).toBe('Unfinished review');
    await click('Plan another strategy'); await click('Replace draft');
    expect(host.querySelector('#bl-support-strategy').value).toBe('');
    expect(host.querySelectorAll('[data-bl-support-plan]')).toHaveLength(1);
  });
});

describe('Reports from the review scope', () => {
  it('carries target and calendar dates into an export, including only matching counters', async () => {
    seed(); await mount(); await openReport();
    expect(host.querySelector('#bl-report-target').value).toBe('help');
    expect(host.querySelector('[aria-label="Date range for report"]').value).toBe('fortnight');
    expect(host.querySelector('[data-bl-report-scope]').textContent).toContain('2 context notes · 1 timed sessions');
    const check = label => [...host.querySelectorAll('label')].find(el=>el.textContent.includes(label)).querySelector('input');
    expect(check('AI Analysis').checked).toBe(false); expect(check('AI Analysis').disabled).toBe(true); expect(check('AI recommendations').checked).toBe(false);
    const write=vi.fn(); vi.spyOn(window,'open').mockReturnValue({document:{write,close:vi.fn()}});
    await click(host.querySelector('[aria-label="Generate Report"]'));
    const html=write.mock.calls[0][0];
    expect(html).toContain('Report scope:'); expect(html).toContain('Requests help · Last 14 calendar days'); expect(html).not.toContain('Requests break');
    expect(html).toContain('0.2/min'); expect(html).not.toContain('10.0/min'); expect(html).not.toContain('<h2>✅ Recommendations');
    await change('[aria-label="Date range for report"]','custom'); expect(host.querySelector('[aria-label="Generate Report"]').disabled).toBe(true);
    await change('[aria-label="Custom report start date"]','2026-09-18'); await change('[aria-label="Custom report end date"]','2026-09-17');
    expect(host.querySelector('[aria-label="Generate Report"]').disabled).toBe(true);
    await click('Back to observation review'); expect(host.querySelector('#bl-review-target').value).toBe('help');
  });
  it('allows a report containing timed sessions without context notes', async () => {
    seed({abcEntries:[]}); await mount(); await openReport();
    expect(host.querySelector('[aria-label="Generate Report"]').disabled).toBe(false);
    const write=vi.fn(); vi.spyOn(window,'open').mockReturnValue({document:{write,close:vi.fn()}});
    await click(host.querySelector('[aria-label="Generate Report"]')); expect(write.mock.calls[0][0]).toContain('Observation Sessions');
  });
  it('discards AI recommendations returned after the report target changes', async () => {
    let resolveAI; const callGemini=vi.fn(()=>new Promise(resolve=>{resolveAI=resolve;}));
    seed(); localStorage.setItem('bl_ai_consent_v1','1'); await mount({callGemini}); await openReport(); await click(host.querySelector('[aria-label="Generate Recs"]'));
    expect(callGemini).toHaveBeenCalled(); await change('#bl-report-target','break');
    await React.act(async()=>resolveAI('Outdated recommendation for Requests help'));
    expect(host.textContent).not.toContain('Outdated recommendation');
  });
});
