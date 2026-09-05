import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let api, root, host;
beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('studio_response_module.js');
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('applied_challenge_module.js');
  loadAlloModule('live_aac_module.js');
  api = window.AlloModules.StudioResponse;
});
afterEach(() => { if(root) act(() => root.unmount()); root = null; host?.remove(); delete window.callGemini; });
const resource = type => ({ id: 'r1', type, title: 'Teacher title', timestamp: 'original', data: type === 'memory-aid' ? { cards: [{ id: 'c1', target: 'Gravity', essentialFacts: ['Things fall'], mnemonic: 'Down', studentDraft: '', studentReasoning: '' }] } : { title: 'Gravity challenge', family: 'design', brief: { drivingQuestion: 'How?', lockedLessonFacts: ['Things fall'], criteria: ['Works'], factVerified: true }, workspace: { response: '' }, sourceExcerpt: 'PRIVATE SOURCE' } });
const normalize = data => window.AlloModules.AppliedChallenge._testing.normalizeAppliedChallengeData(data);
function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(React.createElement(api.Boundary, props)));
}
async function type(node, value) {
  await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
describe('studio response ownership', () => {
  it.each(['memory-aid', 'applied-challenge'])('keeps %s learner writes out of canonical resources and history', async typeName => {
    const original = resource(typeName); const before = JSON.stringify(original); const teacherUpdate = vi.fn(); let saved;
    function Harness() {
      const [responses,setResponses] = React.useState({});
      saved = responses;
      return React.createElement(api.Boundary, { View: window.AlloModules[typeName === 'memory-aid' ? 'MemoryAidView' : 'AppliedChallengeView'], generatedContent: original, isTeacherMode: false, studentResponses: responses, handleNoteUpdate: teacherUpdate, allowRuntimeAi: false, onResponseChange: (id, studio) => setResponses(p => ({ ...p, [id]: { studio } })) });
    }
    host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
    await act(async()=>root.render(React.createElement(Harness)));
    const input=typeName==='memory-aid' ? host.querySelector('textarea[id$="-draft"]') : host.querySelector('#applied-workspace-response');
    await type(input,'My own answer');
    expect(teacherUpdate).not.toHaveBeenCalled(); expect(JSON.stringify(original)).toBe(before);
    expect(JSON.stringify(saved.r1.studio)).toContain('My own answer');
    const hydrated=api.project(original,JSON.parse(JSON.stringify(saved.r1.studio)));
    expect(typeName==='memory-aid' ? hydrated.data.cards[0].studentDraft : hydrated.data.workspace.response).toBe('My own answer');
  });
  it('composes functional updates in one event', () => {
    let child; const save=vi.fn();
    function View(props){ child=props; return null; }
    mount({View,generatedContent:resource('applied-challenge'),isTeacherMode:false,onResponseChange:save,handleNoteUpdate:vi.fn()});
    act(()=>{ child.handleNoteUpdate('workspace', p=>({...p,response:'First'})); child.handleNoteUpdate('workspace',p=>({...p,revision:'Second'})); });
    expect(save.mock.lastCall[1].workspace).toEqual({response:'First',revision:'Second'});
  });
  it('starts teacher authoring read-only, resets preview, and never autosaves preview work', async () => {
    const original=resource('applied-challenge'); const save=vi.fn(), canonical=vi.fn();
    mount({View:window.AlloModules.AppliedChallengeView,generatedContent:original,isTeacherMode:true,onResponseChange:save,handleNoteUpdate:canonical,allowRuntimeAi:false});
    expect(host.querySelector('#applied-workspace-response').readOnly).toBe(true);
    const button = label => [...host.querySelectorAll('button')].find(b=>b.textContent===label);
    await act(async()=>button('Preview as student').click());
    await type(host.querySelector('#applied-workspace-response'),'Temporary');
    expect(host.querySelector('#applied-workspace-response').value).toBe('Temporary');
    await act(async()=>button('Reset preview').click());
    expect(host.querySelector('#applied-workspace-response').value).toBe('');
    expect(save).not.toHaveBeenCalled();expect(canonical).not.toHaveBeenCalled();
  });
  it('cannot restore a forbidden global AI provider when a host explicitly disables it', () => {
    window.callGemini=vi.fn();
    mount({View:window.AlloModules.AppliedChallengeView,generatedContent:resource('applied-challenge'),isTeacherMode:false,onResponseChange:vi.fn(),handleNoteUpdate:vi.fn(),allowRuntimeAi:false});
    const buttons=[...host.querySelectorAll('button')].filter(b=>/hint|feedback|stress.test/i.test(b.textContent));
    expect(buttons.length).toBeGreaterThan(0); buttons.forEach(b=>expect(b.disabled).toBe(true));
    expect(window.callGemini).not.toHaveBeenCalled();
  });
  it('retains history metadata when the active resource is smaller than the history row', () => {
    const source=readFileSync('AlloFlowANTI.txt','utf8');
    const body=source.slice(source.indexOf('  const onUpdateResource = useCallback('),source.indexOf('  const [fillInTheBlank',source.indexOf('  const handleNoteUpdate = useCallback(')));
    expect(body).toContain('const handleNoteUpdate');
    let active={id:'a',type:'memory-aid',data:{cards:[]}};
    let history=[{...active,title:'Original',timestamp:'yesterday',metadata:{owner:'teacher'},data:{cards:[],extra:'keep'}}];
    const handler=new Function('useCallback','setGeneratedContent','setHistory','generatedContent','_resourceMutationStateRef',body+';return handleNoteUpdate;')(fn=>fn,fn=>{active=fn(active);},fn=>{history=fn(history);},active,{current:{history,generatedContent:active}});
    handler('instructions','New');
    expect(history[0]).toMatchObject({title:'Original',timestamp:'yesterday',metadata:{owner:'teacher'},data:{extra:'keep',instructions:'New'}});
  });
});
describe('bounded submissions and delivery',()=>{
  it('excludes Memory Aid teacher facts, media, and private retrieval evidence from every submission projection',()=>{
    const r=resource('memory-aid');
    r.data.cards[0]={...r.data.cards[0],studentDraft:'Mine',studentReasoning:'My reason',visualImage:'data:image/png;base64,PRIVATE',practiceAttempts:[{response:'SECRET'}],feedback:{strength:'Good',sourceExcerpt:'SECRET'}};
    const response=api.responseFromData(r.type,r.data);
    response.cards[0].retrievalAttempts=['SECRET'];
    const serialized=JSON.stringify([api.toSubmission(r,response),api.toResponseEntries(r,response)]);
    expect(serialized).toContain('Mine');expect(serialized).toContain('My reason');expect(serialized).not.toMatch(/SECRET|PRIVATE|Things fall|essentialFacts|visualImage|retrievalAttempts/);
  });
  it('round-trips all current Applied Challenge response fields without importing teacher fields',()=>{
    const r=resource('applied-challenge');
    const normalized=normalize({...r.data,workspace:{stakeholders:'People',assumptions:'Assumption',tradeoffs:'Cost',response:'Proposal',revision:'Improved'},criteriaCheck:{'criterion-0':{rating:'met',note:'Checked'}},evidenceLedger:[{id:'e',claim:'A',evidence:'B',status:'verified',tradeoff:'C'}],validationCycles:[{id:'v',source:'self',family:'design',plan:{methodId:'prototype',testQuestion:'Does it work?',criterion:'Works',expectedFinding:'Yes',changeThreshold:'Fails',evidenceMode:'notes'},observation:{evidence:'Trial',outcome:'mixed'},decision:{action:'revise',reasoning:'Trial result',revisionSummary:'Changed',nextStep:'Retry'}}],feedback:{strength:'Good',question:'Why?',contextFingerprint:'ctx'}});
    const submitted=api.toSubmission(r,api.responseFromData(r.type,normalized));
    const restored=window.AlloModules.AppliedChallenge.fromSubmission(r.data,{r1:{studio:JSON.parse(JSON.stringify(submitted.data))}},'r1');
    expect(restored.data.workspace).toEqual(normalized.workspace);
    expect(restored.data.validationCycles).toEqual(normalized.validationCycles);
    expect(restored.data.criteriaCheck).toEqual(normalized.criteriaCheck);
    expect(restored.data.evidenceLedger).toEqual(normalized.evidenceLedger);
    expect(restored.data.feedback).toEqual(normalized.feedback);
    expect(restored.data.brief).toEqual(normalized.brief);
    expect(JSON.stringify(submitted)).not.toMatch(/PRIVATE SOURCE|lockedLessonFacts|sourceExcerpt/);
    expect(api.toResponseEntries(r,submitted.data)['r1:applied:response']).toBe('Proposal');
  });
  it('strips source excerpts from nested student packs while preserving the teacher project',()=>{
    const shared={sourceExcerpt:'teacher-only',workspace:{response:'Draft'}};
    const r={id:'outer',type:'lesson-plan',data:{neutral:shared,child:{id:'nested',type:'applied-challenge',data:shared}}};
    const safe=window.AlloModules.LiveAac.serializeResourceForStudentPack(r,{sanitizeHistoryForCloud:x=>x,stripUndefined:x=>x});
    expect(safe.data.child.data.sourceExcerpt).toBeUndefined();
    expect(safe.data.neutral.sourceExcerpt).toBe('teacher-only');
    expect(r.data.child.data.sourceExcerpt).toBe('teacher-only');
  });
});


describe('legacy resources and authoring controls', () => {
  it('normalizes missing and duplicate Memory Aid IDs before projecting learner edits', () => {
    const r={id:'legacy',type:'memory-aid',data:{cards:[{target:'First'},{id:'same',target:'Second'},{id:'same',target:'Third'}]}};
    const shown=api.project(r,null);
    expect(new Set(shown.data.cards.map(card=>card.id)).size).toBe(3);
    const response=api.responseFromData(r.type,shown.data);
    response.cards[0].studentDraft='First draft';response.cards[2].studentDraft='Third draft';
    const next=api.project(r,response);
    expect(next.data.cards.map(card=>card.studentDraft)).toEqual(['First draft','','Third draft']);
    expect(r.data.cards[0].id).toBeUndefined();
  });
  it('lets teachers edit phase prompts while learner fields stay disabled', async () => {
    const update=vi.fn();
    mount({View:window.AlloModules.AppliedChallengeView,generatedContent:resource('applied-challenge'),isTeacherMode:true,onResponseChange:vi.fn(),handleNoteUpdate:update,allowRuntimeAi:false});
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Edit challenge').click());
    const label=[...host.querySelectorAll('label')].find(l=>l.textContent.startsWith('Teacher prompt for'));
    const prompt=label.querySelector('textarea');
    expect(prompt.matches(':disabled')).toBe(false);
    expect(host.querySelector('#applied-workspace-response').matches(':disabled')).toBe(true);
    await type(prompt,'Explain your first step.');
    expect(update.mock.calls.some(([key])=>key==='supports')).toBe(true);
  });
  it('moves keyboard focus to the selected phase', async () => {
    mount({View:window.AlloModules.AppliedChallengeView,generatedContent:resource('applied-challenge'),isTeacherMode:false,onResponseChange:vi.fn(),handleNoteUpdate:vi.fn(),allowRuntimeAi:false});
    const button=[...host.querySelectorAll('nav button')].find(b=>b.textContent.startsWith('7.'));
    await act(async()=>button.click());
    expect(document.activeElement.id).toBe('applied-workspace-response');
    expect(button.getAttribute('aria-current')).toBe('step');
  });
});

it('keeps the integrated workspace accessible after adding mode and section navigation', async () => {
  mount({View:window.AlloModules.AppliedChallengeView,generatedContent:resource('applied-challenge'),isTeacherMode:false,onResponseChange:vi.fn(),handleNoteUpdate:vi.fn(),allowRuntimeAi:false});
  const axe=require(resolve('desktop/web-app/node_modules/axe-core'));
  const result=await axe.run(host,{rules:{'color-contrast':{enabled:false}}});
  expect(result.violations.map(v=>({id:v.id,help:v.help}))).toEqual([]);
});
