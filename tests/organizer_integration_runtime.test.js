import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { React, ReactDOMClient, act, loadGames, mountGame } from './helpers/games_live_harness.js';

const host = fs.readFileSync('AlloFlowANTI.txt','utf8');
const start=host.indexOf('const LIVE_ORGANIZER_TYPES =');
const end=host.indexOf('const normalizeLiveOrganizerProgress =',start);
if(start<0 || end<0) throw Error('Organizer contracts missing');
const contracts = new Function(host.slice(start,end)+';return {readiness:getLiveOrganizerReadiness, revision:getLiveOrganizerResourceRevision, types:LIVE_ORGANIZER_TYPES};')();
const fixture=(type='T-Chart', id='diagram-a')=>({id,type:'outline',data:{structureType:type,main:'Water',branches:[{title:'First',items:['A','B','C']},{title:'Second',items:['D','E','F']}]}});
let mounted=[];
beforeAll(()=>{
 window.React=React;
 window.AlloIcons = new Proxy({}, {get:()=>()=>null});
 window.AlloLanguageContext=React.createContext({t:key=>key});
 loadGames();
 new Function(fs.readFileSync('view_renderers_module.js','utf8'))();
 new Function(fs.readFileSync('host_handlers_module.js','utf8'))();
});
afterEach(()=>{mounted.splice(0).forEach(m=>m.unmount()); vi.restoreAllMocks();});
function hostHarness(resource=fixture()) {
 const state={isTeacherMode:true,activeSessionCode:'SESSION1',activeSessionAppId:'app',appId:'app',generatedContent:resource,sessionData:{resources:[structuredClone(resource)]},activeInteractiveOrganizerTypeRef:{current:null},interactiveOrganizerWriteQueueRef:{current:Promise.resolve()},interactiveOrganizerSync:{status:'idle'},addToast:vi.fn(),warnLog:vi.fn(),doc:(...args)=>args,db:{},getLiveOrganizerReadiness:contracts.readiness,getLiveOrganizerResourceRevision:contracts.revision,_alloMbBridgeActive:()=>false,_setOnlyInteractiveOrganizer:vi.fn(),setInteractiveOrganizerRetrying:vi.fn(),normalizeInteractiveVennGameData:x=>x,isPlayableInteractiveVennData:x=>!!x};
 state.setInteractiveOrganizerSync=value=>{state.interactiveOrganizerSync=value;};
 const writes=vi.fn().mockResolvedValue(undefined); window.__alloWriteToSession=writes;
 const api=window.AlloModules.HostHandlers(state);
 return {state,writes,api};
}
function mountOutline(extra={}) {
 const deps={generatedContent:fixture(),t:k=>k,isTeacherMode:true,ErrorBoundary:({children})=>children,addToast:vi.fn(),getLiveOrganizerReadiness:contracts.readiness,playSound:vi.fn(),handleGameCompletion:vi.fn(),handleGameScoreUpdate:vi.fn(),closeOutlineSort:vi.fn(),...extra};
 const container=document.createElement('div');document.body.append(container);const root=ReactDOMClient.createRoot(container);
 act(()=>root.render(window.AlloModules.ViewRenderers.renderOutlineContent(deps)));
 const m={container,deps,unmount:()=>{act(()=>root.unmount());container.remove();}};mounted.push(m);return m;
}
const click=async el=>{expect(el).toBeTruthy();await act(async()=>{el.click();});};
const findButton=(container,text)=>[...container.querySelectorAll('button')].find(b=>b.textContent.includes(text));

describe('organizer live launch behavior',()=>{
 it('starts a KWL reflection without requiring generated answers in its sections',async()=>{const resource={id:'kwl-live',type:'outline',data:{structureType:'KWL Chart',main:'Water',branches:[{title:'Know',items:[]},{title:'Want',items:[]},{title:'Learned',items:[]}]}};const h=hostHarness(resource);const result=await h.api.broadcastInteractiveOrganizer('reflection');expect(result.ok).toBe(true);expect(h.writes.mock.calls[0][1].interactiveOrganizer).toMatchObject({type:'reflection',resourceId:'kwl-live'});expect(h.state._setOnlyInteractiveOrganizer).toHaveBeenCalledWith('reflection');});

 it('launches the exact diagram and records success only after its write completes',async()=>{
  const h=hostHarness();let finish;h.writes.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  const pending=h.api.broadcastInteractiveOrganizer('tchart');await vi.waitFor(()=>expect(h.writes).toHaveBeenCalledTimes(1));
  expect(h.state.interactiveOrganizerSync.status).toBe('starting');expect(h.state._setOnlyInteractiveOrganizer).not.toHaveBeenCalled();
  finish();const result=await pending;
  expect(result.ok).toBe(true);expect(h.writes.mock.calls[0][1].interactiveOrganizer).toMatchObject({resourceId:'diagram-a',structureType:'T-Chart',resourceRevision:contracts.revision(h.state.generatedContent)});
  expect(h.state.interactiveOrganizerSync.status).toBe('live');
 });
 it('does not claim success when the provider rejects a launch',async()=>{
  const h=hostHarness();h.writes.mockRejectedValue(new Error('offline'));
  expect((await h.api.broadcastInteractiveOrganizer('tchart')).ok).toBe(false);
  expect(h.state.interactiveOrganizerSync.status).toBe('error');expect(h.state.activeInteractiveOrganizerTypeRef.current).toBe(null);
 });
 it('rejects stale shared resources',async()=>{
  const h=hostHarness();h.state.sessionData.resources[0].data.branches[0].items.push('Edited');
  expect((await h.api.broadcastInteractiveOrganizer('tchart')).ok).toBe(false);expect(h.writes).not.toHaveBeenCalled();
 });
 it('does not switch a queued launch to another open diagram',async()=>{
  const h=hostHarness();let release;h.state.interactiveOrganizerWriteQueueRef.current=new Promise(r=>release=r);
  const pending=h.api.broadcastInteractiveOrganizer('tchart');h.state.generatedContent=fixture('T-Chart','diagram-b');h.state.sessionData.resources.push(h.state.generatedContent);release();
  expect((await pending).ok).toBe(false);expect(h.writes).not.toHaveBeenCalled();
 });
 it('does not send a queued launch into a different session',async()=>{
  const h=hostHarness();let release;h.state.interactiveOrganizerWriteQueueRef.current=new Promise(r=>release=r);
  const pending=h.api.broadcastInteractiveOrganizer('tchart');h.state.activeSessionCode='SESSION2';release();
  expect((await pending).reason).toBe('session-changed');expect(h.writes).not.toHaveBeenCalled();
 });
 it('cannot resurrect an activity by retrying behind a stop',async()=>{
  const h=hostHarness();const live=(await h.api.broadcastInteractiveOrganizer('tchart')).interactiveOrganizer;h.state.sessionData.interactiveOrganizer=live;
  const stop=h.api.broadcastInteractiveOrganizer(null);const retry=h.api.retryInteractiveOrganizerStudents(['student-1']);
  expect((await stop).ok).toBe(true);expect((await retry).reason).toBe('activity-changed');expect(h.writes).toHaveBeenCalledTimes(2);expect(h.writes.mock.calls[1][1]).toEqual({interactiveOrganizer:null});
 });
 it('retries a current activity without changing its identity',async()=>{
  const h=hostHarness();const live=(await h.api.broadcastInteractiveOrganizer('tchart')).interactiveOrganizer;h.state.sessionData.interactiveOrganizer=live;
  expect((await h.api.retryInteractiveOrganizerStudents(['student-1','student-1'])).ok).toBe(true);
  expect(h.writes.mock.calls[1][1].interactiveOrganizer).toMatchObject({activityId:live.activityId,retryUids:['student-1']});
 });
 it('does not restore an old activity after a same-type replacement even before React or snapshot updates',async()=>{
  const h=hostHarness();vi.spyOn(Date,'now').mockReturnValue(1000);const live=(await h.api.broadcastInteractiveOrganizer('tchart')).interactiveOrganizer;h.state.sessionData.interactiveOrganizer=live;
  const replacement=h.api.broadcastInteractiveOrganizer('tchart');const retry=h.api.retryInteractiveOrganizerStudents(['student-1']);
  const newLive=await replacement;expect(newLive.interactiveOrganizer.activityId).not.toBe(live.activityId);expect((await retry).reason).toBe('activity-changed');expect(h.writes).toHaveBeenCalledTimes(2);
 });
 it('allows retry of a resumed session without a prior local launch',async()=>{
  const h=hostHarness();h.state.sessionData.interactiveOrganizer={type:'tchart',activityId:'organizer:diagram-a:tchart:resumed'};
  expect((await h.api.retryInteractiveOrganizerStudents(['student-1'])).ok).toBe(true);
 });
 it('uses the same normalized data for legacy diagrams and their revisions',async()=>{
  const raw=fixture('Structured Outline');delete raw.data.structureType;raw.data.branches[0].items=[{label:'A'},{name:'B'},'C'];
  const normalized={...raw,data:window.AlloModules.ViewRenderers.normalizeVisualOrganizerData(raw.data)};
  expect(contracts.readiness('outline',raw).ok).toBe(true);expect(contracts.revision(raw)).toBe(contracts.revision(normalized));
  const h=hostHarness(raw);expect((await h.api.broadcastInteractiveOrganizer('outline')).ok).toBe(true);
 });
});

describe('diagram and interactive activity integration',()=>{
 it('keeps reflection controls available after closing a teacher sorting preview',()=>{const m=mountOutline({activeSessionCode:'SESSION1',isInteractiveTChart:true,isTChartPlaying:false});expect(findButton(m.container,'Start reflection for students')).toBeTruthy();});

 it('lets a teacher practice locally during a live session without broadcasting',async()=>{const local=vi.fn(),broadcast=vi.fn();const m=mountOutline({activeSessionCode:'SESSION1',broadcastInteractiveOrganizer:broadcast,setIsTChartPlaying:local});await click(findButton(m.container,'Practice activity'));expect(local).toHaveBeenCalledWith(true);expect(broadcast).not.toHaveBeenCalled();});

 it('keeps the diagram open when live launch fails',async()=>{
  const local=vi.fn(),broadcast=vi.fn().mockResolvedValue({ok:false});const m=mountOutline({activeSessionCode:'SESSION1',broadcastInteractiveOrganizer:broadcast,setIsTChartPlaying:local});
  await click(findButton(m.container,m.deps.activeSessionCode ? 'Start activity for students' : 'Practice activity'));expect(broadcast).toHaveBeenCalledWith('tchart',null);expect(local).not.toHaveBeenCalled();
 });
 it('waits for successful live launch before starting the teacher preview',async()=>{
  const local=vi.fn();let finish;const broadcast=vi.fn(()=>new Promise(r=>finish=r));const m=mountOutline({activeSessionCode:'SESSION1',broadcastInteractiveOrganizer:broadcast,setIsTChartPlaying:local});
  await click(findButton(m.container,m.deps.activeSessionCode ? 'Start activity for students' : 'Practice activity'));expect(local).not.toHaveBeenCalled();await act(async()=>finish({ok:true}));expect(local).toHaveBeenCalledWith(true);
 });
 it('supports local practice without asking for a live session',async()=>{
  const local=vi.fn(),broadcast=vi.fn();const m=mountOutline({broadcastInteractiveOrganizer:broadcast,setIsTChartPlaying:local});await click(findButton(m.container,m.deps.activeSessionCode ? 'Start activity for students' : 'Practice activity'));
  expect(local).toHaveBeenCalledWith(true);expect(broadcast).not.toHaveBeenCalled();
 });
 const cer=()=>({id:'cer-1',type:'outline',data:{main:'Why do plants grow?',structureType:'Claim-Evidence-Reasoning',branches:[{title:'Claim',items:['Plants need light']},{title:'Evidence',items:['Plant A grew','Plant B did not']},{title:'Reasoning',items:['Light provides energy']}]}});
 it('offers a playable CER activity and validates all three sections',async()=>{
  const resource=cer(),local=vi.fn();expect(contracts.readiness('outline',resource).ok).toBe(true);
  const m=mountOutline({generatedContent:resource,setIsOutlineSortPlaying:local});await click(findButton(m.container,'Practice CER sorting'));expect(local).toHaveBeenCalledWith(true);
  resource.data.branches[2].items=[];expect(contracts.readiness('outline',resource).ok).toBe(false);
 });
 it('opens the CER activity for a remotely armed student and completes through accessible buttons',async()=>{
  const resource=cer();const m=mountOutline({generatedContent:resource,isTeacherMode:false,isInteractiveOutlineSort:true});
  expect(m.container.textContent).toContain('Claim, Evidence, or Reasoning?');
  for(const branch of resource.data.branches)for(const text of branch.items){
   const item=[...m.container.querySelectorAll('[data-multi-bucket-item-id]')].find(el=>el.textContent.includes(text));
   expect(item.tagName).toBe('BUTTON'); await click(item);
   await click(findButton(m.container.querySelector('[aria-labelledby="multi-bucket-move-title"]'),branch.title));
  }
  expect(m.deps.handleGameCompletion).toHaveBeenCalledWith('outlineSort',expect.objectContaining({itemsSorted:4,totalItems:4,incorrectAttempts:0}));
 });
 it('matches solution details to their source path rather than arbitrary thirds',async()=>{
  const complete=vi.fn();const data=fixture('Problem Solution').data;data.branches[0].title='Reduce runoff';data.branches[1].title='Store water';
  const m=mountGame('ProblemSolutionSortGame',{data,onClose:vi.fn(),onGameComplete:complete});mounted.push(m);
  expect(m.container.textContent).not.toContain('Try First');expect(m.container.textContent).toContain('Reduce runoff');
  for(const branch of data.branches)for(const text of branch.items){
   const item=[...m.container.querySelectorAll('[data-multi-bucket-item-id]')].find(el=>el.textContent===text || el.textContent.includes(text));
   await click(item);await click(findButton(m.container.querySelector('[aria-labelledby="multi-bucket-move-title"]'),branch.title));
  }
  expect(complete).toHaveBeenCalledWith('problemSolutionSort',expect.objectContaining({itemsSorted:6,incorrectAttempts:0}));
 });
});

describe('student organizer delivery consumes an arm even when already on its diagram',()=>{
 const a=host.indexOf('const organizerPushKey = [');const b=host.indexOf("else if (data.mode === 'sync' && data.currentResourceId)",a);
 const snippet=host.slice(a,b).replace(/\}\s*$/, '');
 function deliver(refs,currentId='diagram-a', retryAt=0) {
  const setGeneratedContent=vi.fn();const data={interactiveOrganizer:{activityId:'organizer:diagram-a:tchart:1',armedAt:1,retryAt,retryUids:['student-1']}};
  new Function('user','data','organizerResourceRevision','organizerResourceIsCurrent','lastOrganizerPushKeyRef','currentGenContentIdRef','currentGenContentRevisionRef','organizerResourceId','setGeneratedContent','organizerResource','setActiveView','hydrateWordSoundsFromSync','audioRef','setIsPlaying','addToast','getDefaultTitle',snippet)({uid:'student-1'},data,'rev1',true,refs,{current:currentId},{current:'rev1'},'diagram-a',setGeneratedContent,fixture(),vi.fn(),vi.fn(),{current:null},vi.fn(),vi.fn(),vi.fn());
  return setGeneratedContent;
 }
 it('does not snap the student back after an already-open diagram is armed',()=>{const refs={current:null};expect(deliver(refs)).not.toHaveBeenCalled();expect(refs.current).toBeTruthy();expect(deliver(refs,'other-diagram')).not.toHaveBeenCalled();});
 it('delivers a targeted retry once even after the student navigated away',()=>{const refs={current:null};deliver(refs);expect(deliver(refs,'other-diagram',123)).toHaveBeenCalledTimes(1);expect(deliver(refs,'third-diagram',123)).not.toHaveBeenCalled();});
 it('delivers once when a different resource is open',()=>{const refs={current:null};expect(deliver(refs,'other-diagram')).toHaveBeenCalledTimes(1);expect(deliver(refs,'third-diagram')).not.toHaveBeenCalled();});
});
