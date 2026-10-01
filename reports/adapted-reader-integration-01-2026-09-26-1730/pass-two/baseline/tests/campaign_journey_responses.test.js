import {createSessionStore} from '../dev-tools/campaign-adventure-pilot/session-store.mjs';
import {beforeAll,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {createAdapters} from '../dev-tools/campaign-adventure-pilot/adapters.mjs';
import {selfAdvocacyJourney as sel} from '../dev-tools/campaign-adventure-pilot/sel-adapter.mjs';
import {reviewResponse,dispatchResponse} from '../dev-tools/campaign-adventure-pilot/responses.mjs';
import {makeRun,dispatch,materialize,validateRun,saveRun,saveKey,readRun,listRuns,forkRun} from '../dev-tools/campaign-adventure-pilot/core.mjs';
let water,grove;
beforeAll(()=>{const c={window:{StemLab:{isRegistered:()=>false,registerTool(){}}},console:{log(){},warn(){}}};vm.createContext(c);vm.runInContext(fs.readFileSync('stem_lab/stem_tool_treelab.js','utf8'),c);[water,grove]=createAdapters(c.window.__alloTreeLabEngine);});
const make=a=>makeRun(a,{seed:'FIELD-01',runId:a.id+'-responses'});
function storage(){const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};}
describe('journey response formats',()=>{
 it('keeps a written watershed proposal inert until the chosen valid action is confirmed',()=>{
   const run=make(water),before=JSON.stringify(run),proposal=reviewResponse(water,run,'I would plant trees in a buffer.',{location:'forestBuffer'});
   expect(proposal.suggested).toBe('tech:bufferPlant:forestBuffer');expect(JSON.stringify(run)).toBe(before);
   const result=dispatchResponse(water,run,proposal,proposal.suggested);
   expect(materialize(water,result)).toEqual(materialize(water,dispatch(water,run,proposal.suggested)));
   expect(result.responses[0].text).toBe('I would plant trees in a buffer.');expect(result.version).toBe(2);
 });
 it('supports written and choice decisions in the same Grove run',()=>{
   let run=make(grove);const p=reviewResponse(grove,run,'Use the food to grow roots.');
   expect(p.suggested).toBe('roots');run=dispatchResponse(grove,run,p,'roots');run=dispatch(grove,run,'reserve');
   expect(run.commands).toEqual(['roots','reserve']);expect(run.responses).toHaveLength(1);expect(validateRun(grove,run)).toEqual(run);
 });
 it('requires clarification for unmatched text and rejects unavailable or stale commands',()=>{
   let run=make(water),p=reviewResponse(water,run,'Make it magically perfect.',{location:'forestBuffer'});
   expect(p.suggested).toBeNull();expect(run.commands).toEqual([]);
   expect(()=>dispatchResponse(water,run,p,'invented')).toThrow();
   run=dispatch(water,run,'end-year');expect(()=>dispatchResponse(water,run,p,'end-year')).toThrow(/changed/);
   expect(()=>reviewResponse(water,run,'  ')).toThrow();expect(()=>reviewResponse(water,run,'a'.repeat(1201))).toThrow();
 });
 it('rejects reuse of a proposal in another run and revalidates available actions',()=>{
   const run=make(grove),p=reviewResponse(grove,run,'roots'),other={...run,runId:'other'};
   expect(()=>dispatchResponse(grove,other,p,'roots')).toThrow(/changed/);
   expect(()=>dispatchResponse(grove,run,{...p,actions:[{id:'invented'}]},'invented')).toThrow(/unavailable/);
 });
 it('round-trips v1 and v2 saves while protecting written history against overwrite and downgrade',()=>{
   const s=storage(),old=make(grove);expect(saveRun(s,old).ok).toBe(true);
   const p=reviewResponse(grove,old,'I want to store reserves.'),next=dispatchResponse(grove,old,p,'reserve');
   expect(saveRun(s,next).ok).toBe(true);expect(readRun(s,saveKey(next),[grove])).toEqual(next);
   expect(saveRun(s,{...next,version:1,responses:undefined}).ok).toBe(false);
   expect(saveRun(s,{...next,responses:[]}).ok).toBe(false);expect(saveRun(s,{...next,responses:[{...next.responses[0],text:'Changed'}]}).ok).toBe(false);
   expect(validateRun(grove,old)).toEqual(old);
 });
 it('retains earlier written responses in a replay branch and keeps hub libraries separate',()=>{
   const s=storage();let run=make(sel);
   for(const text of ['written plan','quiet space']){const p=reviewResponse(sel,run,text);run=dispatchResponse(sel,run,p,p.suggested);}
   saveRun(s,run);const branch=forkRun(run,1,'practice-branch');saveRun(s,branch);saveRun(s,make(grove));
   expect(branch.responses).toHaveLength(1);expect(run.responses).toHaveLength(2);
   expect(listRuns(s,[sel])).toHaveLength(2);expect(listRuns(s,[grove,water])).toHaveLength(1);
   expect(s.getItem(saveKey(run))).toBe(JSON.stringify(run));
 });
 it('rejects malformed, duplicated or misaligned written records',()=>{
   const run=make(grove),p=reviewResponse(grove,run,'roots'),next=dispatchResponse(grove,run,p,'roots');
   for(const responses of [[{...next.responses[0],revision:0}],[{...next.responses[0],actionId:'reserve'}],[next.responses[0],next.responses[0]],[{...next.responses[0],text:''}]]){
     expect(()=>validateRun(grove,{...next,responses})).toThrow();
   }
 });
 it('finishes all 81 SEL paths without a social score and carries prior choices into later scenes',()=>{
   for(let path=0;path<81;path++){let run=make(sel),n=path;
     for(let chapter=0;chapter<4;chapter++){const model=materialize(sel,run),actions=sel.actions(model);expect(actions).toHaveLength(3);run=dispatch(sel,run,actions[n%3].id);n=Math.floor(n/3);
       if(chapter===0)expect(sel.view(materialize(sel,run)).body).toContain('Earlier, you chose');
     }
     const view=sel.view(materialize(sel,run));expect(view.ended).toBe(true);expect(view.receipts).toHaveLength(4);expect(view.metrics).toEqual([]);expect(view.actions).toEqual([]);
   }
 });
});

it('keeps SEL journeys in the host session and can restore that session without browser storage',()=>{
 let records={};const session=createSessionStore({},next=>{records=next;});
 const original=make(sel),proposal=reviewResponse(sel,original,'a written plan');
 const run=dispatchResponse(sel,original,proposal,'written-plan');expect(saveRun(session,run).ok).toBe(true);
 const reopened=createSessionStore(records);expect(readRun(reopened,saveKey(run),[sel])).toEqual(run);
 expect(listRuns(createSessionStore(),[sel])).toEqual([]);
 expect(()=>session.setItem('allo_adventure_save','overwrite')).toThrow();
});
