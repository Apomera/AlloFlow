import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react');
const {createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {buildLiveAacModule}=require('../_build_live_aac_module.js');
let api,root,host;
beforeAll(()=>{
 window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 new Function(buildLiveAacModule(readFileSync(process.env.ALLO_DELIVERY_RETRY_SOURCE||'live_aac_source.jsx','utf8')))();
 api=window.AlloModules.LiveAac;
});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;host?.remove();host=null;});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const props=extra=>({entry:{uid:'student-a',name:'Learner'},recipientId:'student-a',sessionKey:'school/session-a',resourceId:'picture-a',resourceAt:100,mediaRevision:'image-a',now:300,mailboxVersion:23,onRetry:vi.fn(async()=>{}),...extra});
function render(value){if(!root){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);}act(()=>root.render(React.createElement(api.MailboxImageStatus,value)));}
const button=()=>host.querySelector('button');
const click=()=>act(()=>button().dispatchEvent(new MouseEvent('click',{bubbles:true})));
async function settle(work,fail=false){await act(async()=>{if(fail)work.reject(Error('Fixture unavailable'));else work.resolve();await Promise.resolve();});}
function ready(value){return {...value,entry:{...value.entry,imageDelivery:{version:1,resourceId:api.mailboxImageReceiptId(value.resourceId,value.mediaRevision),status:'ready',loaded:1,total:1,omitted:0,assignmentAt:value.resourceAt,at:200}}};}

describe('image retry feedback belongs to its delivery target',()=>{
 for(const [name,change] of Object.entries({resource:{resourceId:'picture-b'},revision:{mediaRevision:'image-b'},assignment:{resourceAt:101},student:{recipientId:'student-b',entry:{uid:'student-b',name:'Other learner'}},session:{sessionKey:'school/session-b'},capability:{mailboxVersion:24}})){
  it('releases the retry button after a '+name+' change and ignores the older failure',async()=>{
   const old=deferred(),current=deferred(),initial=props({onRetry:vi.fn(()=>old.promise)});
   render(initial);click();expect(button().disabled).toBe(true);
   const next={...initial,...change,onRetry:vi.fn(()=>current.promise)};render(next);
   expect(button().disabled).toBe(false);expect(host.querySelector('[role="alert"]')).toBeNull();
   click();expect(next.onRetry).toHaveBeenCalledOnce();await settle(old,true);
   expect(button().disabled).toBe(true);expect(host.querySelector('[role="alert"]')).toBeNull();
   await settle(current);expect(button().disabled).toBe(false);
  });
 }
 it('does not revive an old retry after navigating away and back to the same target',async()=>{
  const old=deferred(),current=deferred(),value=props({onRetry:()=>old.promise});render(value);click();
  render({...value,resourceId:'picture-b'});render({...value,onRetry:()=>current.promise});
  expect(button().disabled).toBe(false);click();await settle(old,true);
  expect(button().disabled).toBe(true);expect(host.querySelector('[role="alert"]')).toBeNull();await settle(current);
 });
 it('clears a completed failure when only the assignment changes',async()=>{
  const work=deferred(),value=props({onRetry:()=>work.promise});render(value);click();await settle(work,true);
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Could not resend');
  render({...value,resourceAt:101});expect(host.querySelector('[role="alert"]')).toBeNull();
 });
 it('does not carry an error through a matching ready receipt and a later missing receipt',async()=>{
  const work=deferred(),value=props({onRetry:()=>work.promise});render(value);click();await settle(work,true);
  render(ready(value));expect(host.textContent).toContain('Images loaded 1/1');expect(host.querySelector('[role="alert"]')).toBeNull();
  render(value);expect(host.querySelector('[role="alert"]')).toBeNull();expect(button().disabled).toBe(false);
 });
 it('ignores a late rejection once a matching receipt reports readiness',async()=>{
  const work=deferred(),value=props({onRetry:()=>work.promise});render(value);click();render(ready(value));await settle(work,true);
  expect(host.querySelector('[role="alert"]')).toBeNull();render(value);expect(button().disabled).toBe(false);
 });
 it('keeps the retry in flight across unrelated roster, clock and callback rerenders',async()=>{
  const work=deferred(),value=props({onRetry:()=>work.promise});render(value);click();
  render({...value,entry:{...value.entry,name:'Renamed',xp:9},now:400,onRetry:()=>Promise.resolve()});
  expect(button().disabled).toBe(true);await settle(work,true);expect(host.querySelector('[role="alert"]')).not.toBeNull();
 });
 it('sends only one retry when two activation events arrive before the next render',async()=>{
  const work=deferred(),value=props({onRetry:vi.fn(()=>work.promise)});render(value);
  act(()=>{const target=button();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));target.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  expect(value.onRetry).toHaveBeenCalledOnce();await settle(work);
 });
 it('does not claim delivery merely because the resend completed',async()=>{
  const work=deferred(),value=props({onRetry:()=>work.promise});render(value);click();await settle(work);
  expect(host.textContent).toContain('Images: awaiting device');expect(host.textContent).not.toContain('Images loaded');expect(button().disabled).toBe(false);
 });
 it('keeps a newer retry error when an older successful send finishes later',async()=>{
  const old=deferred(),current=deferred(),value=props({onRetry:()=>old.promise});render(value);click();
  render({...value,mediaRevision:'image-b',onRetry:()=>current.promise});expect(button().disabled).toBe(false);click();await settle(current,true);await settle(old);
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Could not resend');expect(button().disabled).toBe(false);
 });
 it('allows another retry after a synchronous send failure and clears the error on success',async()=>{
  const value=props({onRetry:vi.fn().mockImplementationOnce(()=>{throw Error('Send failed');}).mockResolvedValueOnce()});render(value);click();
  expect(button().disabled).toBe(false);expect(host.querySelector('[role="alert"]')).not.toBeNull();
  await act(async()=>{button().click();await Promise.resolve();});expect(value.onRetry).toHaveBeenCalledTimes(2);expect(host.querySelector('[role="alert"]')).toBeNull();
 });
 it('does not change a remounted recipient when an unmounted retry rejects',async()=>{
  const work=deferred(),value=props({onRetry:()=>work.promise});render(value);click();act(()=>root.unmount());root=null;host.remove();host=null;
  render(value);await settle(work,true);expect(button().disabled).toBe(false);expect(host.querySelector('[role="alert"]')).toBeNull();
 });
});
