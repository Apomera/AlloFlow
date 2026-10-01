import { describe,it,expect,afterEach,vi } from 'vitest';
import { createCoordinator,makeHydrationHarness } from './helpers/live_hydration_harness.js';
const live=[];const harness=options=>{const h=makeHydrationHarness(options);live.push(h);return h;};
const pending=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const packet=resources=>({of:1,data:JSON.stringify({kind:'assignment',resources})});
const manifest=(id,t=1)=>({packRef:{id,k:'key',t}});
afterEach(()=>{live.splice(0).forEach(h=>h.cleanup());vi.useRealTimers();});
describe('learner download ordering and ownership',()=>{
 it.each(['firebase','mailbox'])('ignores an older %s download that finishes last',async channel=>{
  const old=pending(),fresh=pending();const backend=vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const h=harness(channel==='firebase'?{hydrate:backend}:{mailbox:backend});
  const older=h.receive(channel==='firebase'?{resources:[{id:'old'}]}:manifest('old'));await vi.waitFor(()=>expect(backend).toHaveBeenCalledTimes(1));
  const newer=h.receive(channel==='firebase'?{resources:[{id:'new'}]}:manifest('new'));await vi.waitFor(()=>expect(backend).toHaveBeenCalledTimes(2));
  const expected=[{id:'new',type:'quiz'}];fresh.resolve(channel==='firebase'?expected:packet(expected));await newer;
  old.resolve(channel==='firebase'?[{id:'old'}]:packet([{id:'old'}]));await older;
  expect(h.history).toHaveBeenCalledTimes(1);expect(h.refs.hydratedHistoryRef.current).toEqual(expected);expect(h.status().status).toBe('ready');
 });
 it.each(['firebase','mailbox'])('reuses a pending %s download for a newer roster snapshot',async channel=>{
  const wait=pending(),backend=vi.fn(()=>wait.promise),h=harness(channel==='firebase'?{hydrate:backend}:{mailbox:backend});const data=channel==='firebase'?{resources:[{id:'a'}]}:manifest('a');
  const first=h.receive(data),second=h.receive({...data,roster:{student:{hand:true}}});await vi.waitFor(()=>expect(backend).toHaveBeenCalledOnce());
  wait.resolve(channel==='firebase'?[{id:'a'}]:packet([{id:'a'}]));await Promise.all([first,second]);expect(h.history).toHaveBeenCalledOnce();expect(h.status()).toEqual({status:'ready',attempt:1});
 });
 it('ignores an old failure after a newer resource is ready',async()=>{
  const wait=pending(),h=harness({hydrate:vi.fn().mockReturnValueOnce(wait.promise).mockResolvedValue([{id:'new'}])});
  const older=h.receive({resources:[{id:'old'}]});await vi.waitFor(()=>expect(h.hydrate).toHaveBeenCalledOnce());await h.receive({resources:[{id:'new'}]});wait.reject(Error('old network failure'));await older;
  expect(h.status().status).toBe('ready');expect(h.refs.liveResourceHydrationRetryTimerRef.current).toBeNull();
 });
 it.each(['firebase','mailbox'])('does not restore resources after leaving the %s session',async channel=>{
  const wait=pending(),backend=vi.fn(()=>wait.promise),h=harness(channel==='firebase'?{hydrate:backend}:{mailbox:backend});const work=h.receive(channel==='firebase'?{resources:[{id:'a'}]}:manifest('a'));
  await vi.waitFor(()=>expect(backend).toHaveBeenCalledOnce());h.cleanup();wait.resolve(channel==='firebase'?[{id:'a'}]:packet([{id:'a'}]));await work;expect(h.history).not.toHaveBeenCalled();
 });
 it('does not mistake a changed pack key for the cached version',async()=>{
  const h=harness({mailbox:vi.fn().mockResolvedValueOnce(packet([{id:'old'}])).mockResolvedValueOnce(packet([{id:'new'}]))});
  await h.receive(manifest('same'));await h.receive({packRef:{id:'same',k:'replacement',t:1}});expect(h.mailbox).toHaveBeenCalledTimes(2);expect(h.refs.hydratedHistoryRef.current[0].id).toBe('new');
 });
});
describe('learner retries and pack completeness',()=>{
 it('schedules recovery after a mailbox failure without waiting for another snapshot',async()=>{
  vi.useFakeTimers();const h=harness({mailbox:vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(packet([{id:'recovered'}]))});
  await h.receive(manifest('a'));expect(h.status()).toEqual({status:'failed',attempt:1});await vi.advanceTimersByTimeAsync(1200);expect(h.epoch).toHaveBeenCalledOnce();
  await h.receive(manifest('a'));expect(h.status()).toEqual({status:'ready',attempt:2});expect(h.refs.hydratedHistoryRef.current[0].id).toBe('recovered');
 });
 it('caps retries despite repeated snapshots and resets on network return',async()=>{
  vi.useFakeTimers();const h=harness({mailbox:vi.fn().mockRejectedValue(Error('offline'))});
  for(let i=0;i<6;i++){await h.receive(manifest('a'));await vi.advanceTimersByTimeAsync(4000);}
  expect(h.mailbox).toHaveBeenCalledTimes(3);expect(h.status()).toEqual({status:'failed',attempt:3});expect(vi.getTimerCount()).toBe(0);
  h.wake();h.mailbox.mockResolvedValue(packet([{id:'recovered'}]));await h.receive(manifest('a'));expect(h.mailbox).toHaveBeenCalledTimes(4);expect(h.status()).toEqual({status:'ready',attempt:1});
 });
 it('removes scheduled recovery when leaving',async()=>{
  vi.useFakeTimers();const h=harness({mailbox:vi.fn().mockRejectedValue(Error('offline'))});await h.receive(manifest('a'));h.cleanup();await vi.advanceTimersByTimeAsync(5000);expect(h.epoch).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
 });
 it.each([{of:0,data:'x'},{of:1.5,data:'x'},{of:1,data:null}])('rejects a malformed part instead of changing history: %j',async part=>{
  const h=harness({mailbox:vi.fn().mockResolvedValue(part)});await h.receive(manifest('a'));expect(h.history).not.toHaveBeenCalled();expect(h.status().status).toBe('failed');
 });
 it('rejects a changed part count while assembling a pack',async()=>{
  const h=harness({mailbox:vi.fn().mockResolvedValueOnce({of:2,data:'first'}).mockResolvedValueOnce({of:1,data:'last'})});await h.receive(manifest('a'));expect(h.history).not.toHaveBeenCalled();expect(h.status().status).toBe('failed');
 });
});

describe('cache and successful recovery boundaries',()=>{
 it('starts a fresh retry budget after a successful load',async()=>{
  const h=harness();await h.receive(manifest('a'));expect(h.refs.liveResourceHydrationAttemptsRef.current.count).toBe(0);
  h.refs.lastPackRefRef.current=null;h.mailbox.mockRejectedValue(Error('new interruption'));await h.receive(manifest('a'));expect(h.status()).toEqual({status:'failed',attempt:1});
 });
 it('does not reuse one transport cache after the other transport replaced its history',async()=>{
  const h=harness({hydrate:vi.fn(async()=>[{id:'firebase'}]),mailbox:vi.fn(async()=>packet([{id:'mailbox'}]))});
  const data={resources:[{id:'firebase'}]};await h.receive(data);await h.receive(manifest('mailbox'));await h.receive(data);
  expect(h.hydrate).toHaveBeenCalledTimes(2);expect(h.refs.hydratedHistoryRef.current).toEqual([{id:'firebase'}]);
 });
});

describe('late callbacks after session closure',()=>{
 it.each([{status:'ended'},{isActive:false}])('discards a pending download when the session ends: %j',async terminal=>{
  const wait=pending(),h=harness({hydrate:vi.fn(()=>wait.promise)});const work=h.receive({resources:[{id:'a'}]});await vi.waitFor(()=>expect(h.hydrate).toHaveBeenCalledOnce());
  h.endSession(terminal);wait.resolve([{id:'a'}]);await work;expect(h.history).not.toHaveBeenCalled();expect(h.lifecycleValues.setActiveSessionCode).toHaveBeenCalledWith(null);
 });
 it('ignores a listener error delivered after cleanup',()=>{
  const h=harness();h.cleanup();h.onError({code:'permission-denied'});expect(h.lifecycleValues.addToast).not.toHaveBeenCalled();expect(h.lifecycleValues.unsubscribe).toHaveBeenCalledOnce();
 });
});
