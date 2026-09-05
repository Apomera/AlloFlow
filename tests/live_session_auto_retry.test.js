import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const host=readFileSync('AlloFlowANTI.txt','utf8');
function slice(start,end){const a=host.indexOf(start),b=host.indexOf(end,a);if(a<0||b<a)throw Error(start);return host.slice(a,b);}
const createRetry=new Function('window',slice('function createLiveSessionRetryController(', 'const enqueueLiveSessionResourcePublish =')+';return createLiveSessionRetryController;')(window);
const enqueue=new Function(slice('const enqueueLiveSessionResourcePublish =','const resolveRosterCodenamesToLiveUids =')+';return enqueueLiveSessionResourcePublish;')();
let ST;const controllers=[];
beforeAll(()=>{const win={};new Function('window',readFileSync('session_transport_module.js','utf8'))(win);ST=win.AlloModules.SessionTransport;});
afterEach(()=>{controllers.splice(0).forEach(c=>c.dispose());vi.useRealTimers();});
function controller(options){vi.useFakeTimers();const c=createRetry(options);controllers.push(c);return c;}
const tick=ms=>vi.advanceTimersByTimeAsync(ms);
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
describe('automatic live publication recovery',()=>{
 it('debounces, retries a failed send without a history edit, then becomes quiet',async()=>{
  const publish=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({failed:0});
  const error=vi.fn();controller({publish,onError:error});
  await tick(1499);expect(publish).not.toHaveBeenCalled();await tick(1);expect(error).toHaveBeenCalledOnce();
  await tick(1999);expect(publish).toHaveBeenCalledTimes(1);await tick(1);expect(publish).toHaveBeenCalledTimes(2);
  await tick(60000);expect(publish).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
 });
 it('retries partial delivery and failed reference publication until both succeed',async()=>{
  const publish=vi.fn().mockResolvedValueOnce({failed:1}).mockResolvedValueOnce({failed:0,referencePublished:false}).mockResolvedValue({failed:0,referencePublished:true});
  controller({publish});await tick(1500+2000+5000);expect(publish).toHaveBeenCalledTimes(3);expect(vi.getTimerCount()).toBe(0);
 });
 it('caps automatic retries and resumes after network return',async()=>{
  const publish=vi.fn().mockRejectedValue(new Error('offline'));
  controller({publish});await tick(60000);expect(publish).toHaveBeenCalledTimes(4);expect(vi.getTimerCount()).toBe(0);
  publish.mockResolvedValue({failed:0});window.dispatchEvent(new Event('online'));await tick(300);expect(publish).toHaveBeenCalledTimes(5);expect(vi.getTimerCount()).toBe(0);
 });
 it('coalesces network events while a send is running without overlap',async()=>{
  const pending=deferred(),publish=vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue({failed:0});
  controller({publish});await tick(1500);for(let i=0;i<8;i++)window.dispatchEvent(new Event('online'));
  await tick(10000);expect(publish).toHaveBeenCalledTimes(1);pending.resolve({failed:0});await tick(300);expect(publish).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
 });
 it('cancels scheduled retries and removes wake listeners on cleanup',async()=>{
  const publish=vi.fn().mockRejectedValue(new Error('offline'));const c=controller({publish});await tick(1500);c.dispose();
  window.dispatchEvent(new Event('online'));await tick(60000);expect(publish).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
 });
 it('does not retry or report an obsolete in-flight failure',async()=>{
  const pending=deferred(),onError=vi.fn(),publish=vi.fn(()=>pending.promise);const c=controller({publish,onError});await tick(1500);c.dispose();pending.resolve({failed:1});await tick(60000);
  expect(publish).toHaveBeenCalledOnce();expect(onError).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
 });
 it('ignores normal pageshow but retries a restored browser page',async()=>{
  const publish=vi.fn().mockResolvedValue({failed:0});controller({publish});await tick(1500);
  window.dispatchEvent(new Event('pageshow'));await tick(300);expect(publish).toHaveBeenCalledOnce();
  const restored=new Event('pageshow');Object.defineProperty(restored,'persisted',{value:true});window.dispatchEvent(restored);await tick(300);expect(publish).toHaveBeenCalledTimes(2);
 });
});
function ops(extra={}){return {seen:{},fingerprint:r=>r.id,pushItem:vi.fn(async()=>{}),hostPack:vi.fn(async()=>({id:'pack',k:'key'})),packFingerprint:()=> 'fp',publishPackRef:vi.fn(async()=>{}),setHostedFp:vi.fn(),...extra};}
describe('obsolete live publications',()=>{
 it('stops after an in-flight resource and leaves its fingerprint unconfirmed',async()=>{
  let current=true;const pending=deferred(),o=ops({isCurrent:()=>current,pushItem:vi.fn(()=>pending.promise)});
  const result=ST.runMailboxPackCycle([{id:'a'},{id:'b'}],o);const rejected=expect(result).rejects.toMatchObject({name:'AbortError'});
  await vi.waitFor(()=>expect(o.pushItem).toHaveBeenCalledOnce());current=false;pending.resolve();await rejected;
  expect(o.seen).toEqual({});expect(o.hostPack).not.toHaveBeenCalled();expect(o.publishPackRef).not.toHaveBeenCalled();
 });
 it('does not publish a completed old upload into a changed session',async()=>{
  let current=true;const pending=deferred(),o=ops({isCurrent:()=>current,hostPack:vi.fn(()=>pending.promise)});
  const result=ST.runMailboxPackCycle([{id:'a'}],o);const rejected=expect(result).rejects.toMatchObject({name:'AbortError'});
  await vi.waitFor(()=>expect(o.hostPack).toHaveBeenCalledOnce());current=false;pending.resolve({id:'old',k:'old-key'});await rejected;
  expect(o.publishPackRef).not.toHaveBeenCalled();expect(o.setHostedFp).not.toHaveBeenCalled();
 });
 it('does not mark a superseded removal as complete',async()=>{
  let current=true;const pending=deferred(),o=ops({seen:{old:'fp'},isCurrent:()=>current,sendRemovals:vi.fn(()=>pending.promise)});
  const result=ST.runMailboxPackCycle([],o);const rejected=expect(result).rejects.toMatchObject({name:'AbortError'});
  await vi.waitFor(()=>expect(o.sendRemovals).toHaveBeenCalledOnce());current=false;pending.resolve();await rejected;expect(o.seen.old).toBe('fp');
 });
 it('serializes changed snapshots and lets a later publication recover after cancellation',async()=>{
  const queues={},pending=deferred();let current=true;const old=ops({isCurrent:()=>current,pushItem:vi.fn(()=>pending.promise)}),next=ops();
  const first=enqueue({queues,sessionKey:'same',publish:()=>ST.runMailboxPackCycle([{id:'old'}],old)});const rejected=expect(first).rejects.toMatchObject({name:'AbortError'});
  await vi.waitFor(()=>expect(old.pushItem).toHaveBeenCalledOnce());const second=enqueue({queues,sessionKey:'same',publish:()=>ST.runMailboxPackCycle([{id:'new'}],next)});
  expect(next.pushItem).not.toHaveBeenCalled();current=false;pending.resolve();await rejected;await second;expect(next.pushItem).toHaveBeenCalledOnce();expect(queues).toEqual({});
 });
 it('reports a failed reference so the controller schedules another attempt',async()=>{
  const o=ops({publishPackRef:vi.fn(async()=>{throw Error('offline');})});expect(await ST.runMailboxPackCycle([{id:'a'}],o)).toMatchObject({referencePublished:false});expect(o.setHostedFp).not.toHaveBeenCalled();
 });
});
function pushHarness({peer=false}={}) {
 let current=true;
 const mailbox=vi.fn(async()=>{current=false;}),drain=vi.fn(async()=>{current=false;});
 const values={useCallback:fn=>fn,mbLive:{code:'class-a'},mbConfig:{url:'local',admin:'test'},mbPeersRef:{current:peer?{learner:{dc:{readyState:'open'}}}:{}},_alloSerializeResourceForStudentPack:r=>r,_alloEncodeAlloPack:async s=>s,_alloSplitPackChunks:()=>['one','two','three'],_alloDcSendDrained:drain,_alloMailboxCallWithRetry:mailbox,warnLog:vi.fn()};
 const push=new Function(...Object.keys(values),slice('  const _mbPushOneResource = useCallback(', '  const pushResourceToMailbox =')+';return _mbPushOneResource;')(...Object.values(values));
 return {push,mailbox,drain,isCurrent:()=>current};
}
describe('actual host retry and chunk wiring',()=>{
 it.each([false,true])('stops chunk sends after cancellation (peer channel: %s)',async peer=>{
  const h=pushHarness({peer});await expect(h.push({id:'a',type:'quiz'},{isCurrent:h.isCurrent})).rejects.toMatchObject({name:'AbortError'});
  expect(peer?h.drain:h.mailbox).toHaveBeenCalledOnce();if(peer)expect(h.mailbox).not.toHaveBeenCalled();
 });
 it('retries the actual mailbox effect without any new history change',async()=>{
  vi.useFakeTimers();let cleanup;
  const push=vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue({rtcCount:0});
  const values={useEffect:fn=>{cleanup=fn();},mbLive:{code:'class-a'},mbConfig:{url:'local',admin:'test'},isTeacherMode:true,activeSessionAppId:'test-app',history:[{id:'a',type:'quiz'}],mailboxResourcePublishQueuesRef:{current:{}},mbPackItemsRef:{current:[]},mbSentPacksRef:{current:{}},mbHostedPackFpRef:{current:''},mbLivePackRef:{current:null},createLiveSessionRetryController:createRetry,enqueueLiveSessionResourcePublish:enqueue,window:{AlloModules:{SessionTransport:ST}},_alloStudentSafeResources:r=>r,TEACHER_ONLY_TYPES:[],_alloProjectStudentActivityResource:r=>r,_alloQuickHash:s=>s,_alloSerializeResourceForStudentPack:r=>r,_mbPushOneResource:push,_alloMailboxCallWithRetry:vi.fn(async()=>{}),generateUUID:()=> 'id',_alloRandomToken:()=> 'key',stripUndefined:r=>r,_alloEncodeAlloPack:async s=>s,_alloSplitPackChunks:s=>[s],doc:()=>({}),db:{},updateDoc:vi.fn(async()=>{}),warnLog:vi.fn(),_alloSessionSyncTrace:vi.fn()};
  const anchor=host.indexOf('// Firestore-parity: the class pack syncs AUTOMATICALLY');const start=host.indexOf('  useEffect(() => {',anchor),end=host.indexOf('  useEffect(() => {',start+10);
  new Function(...Object.keys(values),host.slice(start,end))(...Object.values(values));
  controllers.push({dispose:()=>cleanup()});await tick(1500);expect(push).toHaveBeenCalledOnce();await tick(2000);expect(push).toHaveBeenCalledTimes(2);
  expect(values.mbSentPacksRef.current.a).toBeTruthy();expect(vi.getTimerCount()).toBe(0);cleanup();window.dispatchEvent(new Event('online'));await tick(10000);expect(push).toHaveBeenCalledTimes(2);
 });
});
