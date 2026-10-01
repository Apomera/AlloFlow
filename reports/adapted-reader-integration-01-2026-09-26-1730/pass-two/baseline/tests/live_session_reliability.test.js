import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeHydrationHarness } from './helpers/live_hydration_harness.js';
const hydrationHarnesses=[];
afterEach(()=>hydrationHarnesses.splice(0).forEach(h=>h.cleanup()));
const host=readFileSync('AlloFlowANTI.txt','utf8');
const dock=readFileSync('view_live_session_dock_source.jsx','utf8');
function health(trace, activeSessionCode='session', activeSessionAppId='app') {
 const start=dock.indexOf('const trace = '),end=dock.indexOf('const ageSec =',start);
 expect(start).toBeGreaterThan(-1);expect(end).toBeGreaterThan(start);
 return new Function('window','activeSessionCode','activeSessionAppId',dock.slice(start,end)+'return {lastSync,lastProblem,problemIsCurrent:!!problemIsCurrent};')({__alloSessionSyncTrace:trace},activeSessionCode,activeSessionAppId);
}
const event=(name,failed=0)=>({at:100,event:name,detail:{failed,sessionPath:'artifacts/app/public/data/sessions/session'}});
describe('live dashboard delivery status',()=>{
 it('does not show a failed mailbox cycle as successful sync',()=>{
  const before=event('sync:write-ok'),failure=event('mailbox:pack-cycle',1),status=health([before,failure]);
  expect(status.lastSync).toBe(before);expect(status.lastProblem).toBe(failure);expect(status.problemIsCurrent).toBe(true);
 });
 it('keeps a failed pack-reference write visible',()=>{expect(health([event('mailbox:pack-cycle'),event('mailbox:pack-reference-failed')]).problemIsCurrent).toBe(true);});
 it('uses trace order to recognize recovery within the same millisecond',()=>{expect(health([event('mailbox:pack-cycle',2),event('mailbox:pack-cycle')]).problemIsCurrent).toBe(false);});
 it('clears a reference failure after its retry succeeds',()=>{expect(health([event('mailbox:pack-reference-failed'),event('mailbox:pack-reference-published')]).problemIsCurrent).toBe(false);});
 it('ignores another session, app, and legacy unscoped success',()=>{const events=[event('sync:write-ok'),{at:101,event:'sync:write-ok',detail:{}}];expect(health(events,'other').lastSync).toBeNull();expect(health(events,'session','other-app').lastSync).toBeNull();expect(health([events[1]]).lastSync).toBeNull();});
 it('does not fabricate a sync before any delivery',()=>{const status=health([]);expect(status.lastSync).toBeNull();expect(status.lastProblem).toBeNull();});
});
function hydrateHarness() {
 const h=makeHydrationHarness();hydrationHarnesses.push(h);
 return {...h,hydratedHistoryRef:h.refs.hydratedHistoryRef,setHistory:h.history,setLiveResourceLoadState:h.loadState,
  run:assembled=>{h.mailbox.mockResolvedValue({of:1,data:assembled});return h.receive({packRef:{id:'test',k:'key',t:1}});}};
}
describe('mailbox reconnect with an intentionally empty assignment',()=>{
 it('clears stale history and settles ready when the teacher removes every resource',async()=>{
  const h=hydrateHarness();expect(await h.run(JSON.stringify({kind:'assignment',resources:[]}))).toEqual([]);
  expect(h.hydratedHistoryRef.current).toEqual([]);expect(h.setHistory).toHaveBeenCalledWith([]);expect(h.setLiveResourceLoadState).toHaveBeenCalledWith({status:'ready',attempt:1});
 });
 it('retains prior history for a malformed packet',async()=>{
  const h=hydrateHarness();await h.run(JSON.stringify({kind:'assignment'}));expect(h.status().status).toBe('failed');
  expect(h.setHistory).not.toHaveBeenCalled();expect(h.hydratedHistoryRef.current[0].id).toBe('old');
 });
 it('keeps the student-safe filter when hydrating a nonempty assignment',async()=>{
  const h=hydrateHarness();expect(await h.run(JSON.stringify({kind:'assignment',resources:[{id:'a',type:'quiz'},{id:'private',type:'lesson-plan'}]}))).toEqual([{id:'a',type:'quiz'}]);
 });
});
