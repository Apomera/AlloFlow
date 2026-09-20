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
const openReport = async () => { await openReview(); await click('Prepare report from this view'); };
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); delete window.__alloFirebase; localStorage.setItem('bl_student_roster', JSON.stringify([{id:'workflow-a',name:'Student A'},{id:'workflow-b',name:'Student B'}])); });
afterEach(async () => { await unmount(); vi.restoreAllMocks(); });

describe('Actionable Today workspace', () => {
  it('resumes the correct recorder draft and preserves separate drafts', async () => {
    seed();
    const writeDraft = (kind, data, student='workflow-a') => sessionStorage.setItem('behaviorLens_observation_draft_v1_'+kind+'_'+student,JSON.stringify({version:1,savedAt:Date.now(),data}));
    writeDraft('frequency',{elapsed:90,target:{id:'help',label:'Requests help'},counters:[{id:'c',label:'Requests help',behaviorId:'help',count:2}]});
    writeDraft('interval',{elapsed:0,target:{id:'break',label:'Requests break'},mode:'whole',grid:[],totalIntervals:20,intervalSec:15});
    writeDraft('live',{timer:5,method:'latency',latencyMs:5000,target:{id:'help',label:'Requests help'}});
    writeDraft('frequency',{elapsed:10,counters:[{id:'private',label:'Other student',count:9}]},'workflow-b');
    await mount();
    expect(host.querySelector('[data-bl-resume-recordings]').textContent).toContain('90 seconds recorded');
    expect(host.querySelector('[data-bl-resume-recordings]').textContent).not.toContain('Other student');
    await click(host.querySelector('[aria-label="Resume count recording"]')); expect(host.querySelector('[aria-label="Behavior counter label"]').value).toBe('Requests help');
    await click('Save'); await tick();
    expect(host.querySelector('[aria-label="Resume count recording"]')).toBeFalsy(); expect(host.querySelector('[aria-label="Resume interval recording"]')).toBeTruthy(); expect(host.querySelector('[aria-label="Resume timed observation"]')).toBeTruthy();
    await click(host.querySelector('[aria-label="Resume interval recording"]')); expect(host.querySelector('[aria-label="Whole Interval"]').getAttribute('aria-pressed')).toBe('true');
  });
  it('starts a saved target directly and surfaces only active/planned support work', async () => {
    seed({toolState:{supportStrategies:[{id:'due',targetId:'help',strategy:'Agreed visual prompt',owner:'Teacher',status:'active',reviewDate:'2020-01-01'},{id:'later',targetId:'break',strategy:'Future planned support',status:'planned',reviewDate:'2099-01-01'},{id:'done',strategy:'Completed work',status:'completed'}]}});
    await mount(); expect(host.querySelector('[data-bl-today-supports]').textContent).toContain('Review due: 2020-01-01'); expect(host.querySelector('[data-bl-today-supports]').textContent).not.toContain('Completed work');
    await click(host.querySelector('[aria-label="Measure Requests help"]')); expect(host.querySelector('[data-bl-recording-target]').dataset.blRecordingTarget).toBe('help');
  });
});

describe('Individual timed-session review', () => {
  it('shows measurement units and zero values for every recording method', async () => {
    seed({abcEntries:[],observationSessions:[{id:'zero',timestamp:when(0),duration:60,method:'frequency',data:{count:0}},{id:'duration',timestamp:when(0),duration:120,method:'duration',data:{totalDuration:25,durations:[10,15]}},{id:'latency',timestamp:when(0),duration:5,method:'latency',data:{latencyMs:0}},{id:'interval',timestamp:when(0),duration:30,method:'interval',data:{mode:'whole',intervalSec:15,completedCount:2,occurredCount:0,percentage:0}}]});
    await mount(); await click('Review observations');
    expect(host.querySelectorAll('[data-bl-session]')).toHaveLength(4);
    expect(host.querySelector('[data-bl-session="zero"]').textContent).toContain('0 events');
    expect(host.querySelector('[data-bl-session="duration"]').textContent).toContain('25 seconds');
    expect(host.querySelector('[data-bl-session="latency"]').textContent).toContain('0 seconds');
    expect(host.querySelector('[data-bl-session="interval"]').textContent).toContain('0 %');
  });
  it('corrects counter attribution, preserves measurements, updates linked history, and survives reload', async () => {
    seed({sessionHistory:[{id:'mixed:0',observationSessionId:'mixed',behavior:'Requests help',measurementType:'frequency',value:2,unit:'count'},{id:'mixed:1',observationSessionId:'mixed',behavior:'Requests break',measurementType:'frequency',value:98,unit:'count'}]});
    await mount(); await click('Review observations');
    const original=workspace().observationSessions.find(session=>session.id==='mixed');
    await click(host.querySelector('[data-bl-session="mixed"] button'));
    await change('#bl-session-target-mixed-0','break'); await change('#bl-session-notes-mixed','Target label corrected after team review.');
    await click('Save session correction'); expect(host.textContent).toContain('Briefly describe why');
    await change('#bl-session-reason-mixed','Wrong counter target selected'); await click('Save session correction'); await tick();
    const updated=workspace().observationSessions.find(session=>session.id==='mixed');
    expect(updated).toMatchObject({id:'mixed',duration:original.duration,recordedAt:original.recordedAt,data:{count:100,rate:10,counters:[{behaviorId:'break',count:2},{behaviorId:'break',count:98}]}});
    expect(updated.data.reviewHistory[0].before.counters[0].behaviorId).toBe('help');
    expect(workspace().sessionHistory.find(record=>record.id==='mixed:0')).toMatchObject({behavior:'Requests break',value:2,unit:'count'});
    await unmount(); await mount(); await click('Review observations');
    expect(host.querySelector('[data-bl-session="mixed"]').textContent).toContain('Correction history (1)');
    await change('#bl-review-target','help'); expect(host.querySelector('[data-bl-session="mixed"]')).toBeFalsy();
  });
  it('retains correction drafts across navigation/reload and isolates students', async () => {
    seed(); await mount(); await click('Review observations'); await click(host.querySelector('[data-bl-session="unassigned"] button'));
    await change('#bl-session-notes-unassigned','Unfinished clarification'); await click('Keep correction draft'); await tick();
    await unmount(); await mount(); await click('Review observations'); expect(host.querySelector('#bl-session-notes-unassigned').value).toBe('Unfinished clarification');
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]')); await change('#bl-today-student','Student B'); await tick(); await click('Review observations');
    expect(host.textContent).not.toContain('Unfinished clarification'); expect(host.querySelectorAll('[data-bl-session]')).toHaveLength(0);
    expect(workspace().toolState.sessionReviewDrafts.unassigned.notes).toBe('Unfinished clarification');
  });
  it('pages sessions independently and resets to the first page when filters change', async () => {
    seed({abcEntries:[],observationSessions:Array.from({length:10},(_,i)=>({id:'session-'+i,timestamp:when(0),method:'frequency',behaviorId:'help',duration:60,data:{count:i}}))});
    await mount(); await click('Review observations'); expect(host.querySelectorAll('[data-bl-session]')).toHaveLength(8);
    await click('Next sessions'); expect(host.querySelectorAll('[data-bl-session]')).toHaveLength(2);
    await change('#bl-review-target','help'); expect(host.querySelectorAll('[data-bl-session]')).toHaveLength(8);
  });
});


it('preserves a large measurement payload when correction history would exceed the storage limit',async()=>{
  seed({observationSessions:[{id:'large',timestamp:when(0),method:'frequency',duration:60,notes:'n'.repeat(2000),data:{count:1,padding:Array.from({length:13},()=> 'x'.repeat(10000))}}]});
  await mount(); await click('Review observations'); await click(host.querySelector('[data-bl-session="large"] button'));
  await change('#bl-session-reason-large','Clarify observer'); await change('#bl-session-observer-large','Teacher'); await click('Save session correction'); await tick();
  expect(host.textContent).toContain('original session and your draft have been kept');
  expect(workspace().observationSessions[0].data.padding).toHaveLength(13);
  expect(workspace().observationSessions[0].observer).toBe('');
  expect(workspace().toolState.sessionReviewDrafts.large.observer).toBe('Teacher');
});


it('resumes a correction for a large session after reload without truncating its revision',async()=>{
 seed({observationSessions:[{id:'long',timestamp:when(0),method:'frequency',duration:60,data:{count:1,padding:Array.from({length:3},()=> 'x'.repeat(10000))}}]});
 await mount(); await click('Review observations'); await click(host.querySelector('[data-bl-session="long"] button')); await change('#bl-session-observer-long','Teacher'); await change('#bl-session-reason-long','Add missing observer'); await tick();
 await unmount(); await mount(); await click('Review observations'); await click('Save session correction'); await tick();
 expect(workspace().observationSessions[0].observer).toBe('Teacher'); expect(workspace().observationSessions[0].data.padding).toHaveLength(3); expect(workspace().toolState.sessionReviewDrafts.long).toBeUndefined();
});
