import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
let LP,root,element;
beforeAll(()=>{global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;loadAlloModule('live_polling_module.js');LP=window.AlloModules.LivePolling;});
afterEach(async()=>{if(root)await act(async()=>root.unmount());root=null;element?.remove();element=null;vi.restoreAllMocks();vi.useRealTimers();sessionStorage.clear();delete window.__alloFirebase;});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const poll=(id='p1',type='freetext',extra={})=>({id,type,prompt:'Explain the evidence',options:['Water','Stone'],ratingMin:1,ratingMax:3,afterSubmitMode:'wait',responseReceipts:1,...extra});
function host(config={}){const h=LP.createHost({sessionCode:'LIVE',confirmResponses:true,...config}),sent=[];h.peers.set('u',{dc:{readyState:'open',send:data=>sent.push(JSON.parse(data))},codename:'Rowan'});h.broadcastPoll(poll());return{h,sent};}
const request=(requestId='r1',extra={})=>({pollId:'p1',requestId,response:'Evidence',attempt:1,...extra});
const receipt=(requestId='r1',extra={})=>({pollId:'p1',requestId,status:'accepted',response:'Evidence',attempt:1,withdrawn:false,...extra});

describe('Teacher response acknowledgement protocol',()=>{
  it('negotiates receipts without changing unrelated transport consumers',()=>{
    const {h,sent}=host();expect(sent[0].payload.responseReceipts).toBe(1);
    const legacy=LP.createHost({sessionCode:'LEGACY'});legacy.broadcastPoll({id:'legacy'});expect(legacy.activePoll).not.toHaveProperty('responseReceipts');
    h.stop();legacy.stop();
  });
  it('acknowledges a response once and deduplicates a retry even after pause',()=>{
    const onResponse=vi.fn(),{h,sent}=host({onResponse});h._receiveResponse('u','Rowan',request());h.broadcastPoll(poll('p1','freetext',{submissionsLocked:true}));h._receiveResponse('u','Rowan',request());
    expect(onResponse).toHaveBeenCalledTimes(1);expect(sent.filter(p=>p.type==='responseReceipt'&&p.payload.status==='accepted')).toHaveLength(2);h.stop();
  });
  it('rejects late or invalid responses instead of falsely confirming them',()=>{
    const onResponse=vi.fn(),{h,sent}=host({onResponse});h.broadcastPoll(poll('p1','rating'));h._receiveResponse('u','Rowan',request('bad',{response:99}));expect(sent.at(-1).payload.reason).toBe('invalid');
    h.broadcastPoll(poll('p1','rating',{submissionsLocked:true}));h._receiveResponse('u','Rowan',request('paused',{response:2}));expect(sent.at(-1).payload.reason).toBe('paused');
    h.closePoll('p1');h._receiveResponse('u','Rowan',request('late',{response:2}));expect(sent.at(-1).payload.reason).toBe('closed');expect(onResponse).not.toHaveBeenCalled();h.stop();
  });
  it('does not confirm an update the host consumer rejected or failed to accept',()=>{
    const onResponse=vi.fn().mockReturnValueOnce(false).mockImplementationOnce(()=>{throw Error('failed');}),{h,sent}=host({onResponse});h._receiveResponse('u','Rowan',request());h._receiveResponse('u','Rowan',request('r2'));expect(sent.filter(p=>p.type==='responseReceipt').every(p=>p.payload.status==='rejected')).toBe(true);expect(h.responseReceipts.size).toBe(0);h.stop();
  });
  it('retains only the current response per student and clears private recovery data between polls',()=>{
    const onResponse=vi.fn(),{h}=host({onResponse});h._receiveResponse('u','Rowan',request());h._receiveResponse('u','Rowan',request('r2',{response:'Revised'}));expect(h.responseReceipts.size).toBe(1);expect(h.responseReceipts.get('u').response).toBe('Revised');
    h.sendFeedback('u','p1',{text:'Use a detail',attempt:1,allowRevision:true});expect(h.deliveredFeedback.size).toBe(1);h.broadcastPoll(poll('next'));expect(h.responseReceipts.size).toBe(0);expect(h.deliveredFeedback.size).toBe(0);h.stop();
  });
  it('does not accept new responses after the teacher reveals results',()=>{
    const onResponse=vi.fn(),{h,sent}=host({onResponse});h.broadcastPollResults('p1',{totalResponses:0,items:[]});h._receiveResponse('u','Rowan',request());expect(sent.at(-1).payload.reason).toBe('closed');expect(onResponse).not.toHaveBeenCalled();h.stop();
  });
  it('acknowledges withdrawal idempotently and rejects withdrawal for other poll types',()=>{
    const onResponse=vi.fn(),{h,sent}=host({onResponse});h._receiveResponse('u','Rowan',request('wrong',{withdrawn:true,response:''}));expect(sent.at(-1).payload.reason).toBe('invalid');h.broadcastPoll(poll('p1','wordcloud'));h._receiveResponse('u','Rowan',request('remove',{withdrawn:true,response:''}));h._receiveResponse('u','Rowan',request('remove',{withdrawn:true,response:''}));expect(onResponse).toHaveBeenCalledTimes(1);expect(h.responseReceipts.get('u').withdrawn).toBe(true);h.stop();
  });
});

function guestMock(connect=true){const guests=[],proto=Object.getPrototypeOf(LP.createGuest({}));vi.spyOn(proto,'join').mockImplementation(async function(){guests.push(this);if(connect)this.onConnected();});vi.spyOn(proto,'leave').mockImplementation(()=>{});const send=vi.spyOn(proto,'sendResponse').mockReturnValue(true);return{guests,send};}
const props={enabled:true,hostActive:true,sessionCode:'LIVE',userUid:'u',codename:'Rowan'};
async function render(extra={}){if(!root){element=document.createElement('div');document.body.appendChild(element);root=createRoot(element);}await act(async()=>root.render(React.createElement(LP.GuestOverlay,{...props,...extra})));}
const button=text=>[...element.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
async function click(el){expect(el).toBeTruthy();await act(async()=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));}
async function input(el,value){await act(async()=>{Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
async function receive(guest,p){await act(async()=>guest.onPoll(p));}
async function ack(guest,send,extra={}){const [pollId,response,meta]=send.mock.calls.at(-1);await act(async()=>guest.onResponseReceipt(receipt(meta.requestId,{pollId,response,attempt:meta.attempt,withdrawn:!!meta.withdrawn,...extra})));}

describe('Live student delivery and recovery UI',()=>{
  it('keeps the draft until receipt, prevents duplicate clicks, and retries the same request',async()=>{
    vi.useFakeTimers();const{guests,send}=guestMock();await render();await receive(guests[0],poll());await input(element.querySelector('textarea'),'Evidence');const submitButton=button('Submit response');await act(async()=>{submitButton.dispatchEvent(new MouseEvent('click',{bubbles:true}));submitButton.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
    expect(send).toHaveBeenCalledTimes(1);expect(element.textContent).toContain('Waiting for your teacher to confirm');expect(element.textContent).not.toContain('Response received by teacher');expect(LP.readLivePollDraft('LIVE','u','p1').value).toBe('Evidence');
    await act(async()=>vi.advanceTimersByTime(8000));expect(button('Retry response')).toBeTruthy();await click(button('Retry response'));expect(send.mock.calls[1][2].requestId).toBe(send.mock.calls[0][2].requestId);await ack(guests[0],send);expect(element.textContent).toContain('Response received by teacher');expect(LP.readLivePollDraft('LIVE','u','p1')).toBeNull();
  });
  it('retains rejected responses for correction and ignores receipts from a prior poll',async()=>{
    const{guests,send}=guestMock();await render();await receive(guests[0],poll());await input(element.querySelector('textarea'),'Evidence');await click(button('Submit response'));const old=send.mock.calls[0][2].requestId;await ack(guests[0],send,{status:'rejected',reason:'paused'});expect(element.querySelector('textarea').value).toBe('Evidence');expect(element.textContent).toContain('paused submissions');
    await receive(guests[0],poll('new'));await input(element.querySelector('textarea'),'New draft');await act(async()=>guests[0].onResponseReceipt(receipt(old)));expect(element.querySelector('textarea').value).toBe('New draft');expect(element.textContent).not.toContain('Response received by teacher');
  });
  it('restores a confirmed response and private feedback after reload',async()=>{
    const{guests}=guestMock();await render();await receive(guests[0],poll('p1','freetext',{feedback:{enabled:true,criteria:'Use evidence',maxAttempts:2}}));await act(async()=>{guests[0].onResponseState(receipt());guests[0].onFeedback({pollId:'p1',text:'Add a concrete example.',attempt:1,allowRevision:true});});expect(element.textContent).toContain('Add a concrete example.');await click(button('Revise using this feedback'));expect(element.querySelector('textarea').value).toBe('Evidence');expect(button('Submit revision')).toBeTruthy();
  });
  it('preserves a revision draft across reconnect instead of restoring the earlier submitted view',async()=>{
    const{guests,send}=guestMock();const p=poll('p1','freetext',{feedback:{enabled:true,criteria:'Use evidence',maxAttempts:2}});await render();await receive(guests[0],p);await act(async()=>{guests[0].onResponseState(receipt());guests[0].onFeedback({pollId:'p1',text:'Add an example',attempt:1,allowRevision:true});});await click(button('Revise using this feedback'));await input(element.querySelector('textarea'),'New example');
    await receive(guests[0],p);await act(async()=>{guests[0].onResponseState(receipt());guests[0].onFeedback({pollId:'p1',text:'Add an example',attempt:1,allowRevision:true});});expect(element.querySelector('textarea').value).toBe('New example');await click(button('Submit revision'));await ack(guests[0],send);expect(element.textContent).toContain('Revision received by teacher. Waiting for feedback.');expect(element.textContent).not.toContain('Your teacher reviewed your response');
  });
  it('preserves an intentionally empty revision draft on reconnect',async()=>{
    const{guests}=guestMock();const p=poll('p1','freetext',{feedback:{enabled:true,criteria:'Use evidence',maxAttempts:2}});await render();await receive(guests[0],p);await act(async()=>{guests[0].onResponseState(receipt());guests[0].onFeedback({pollId:'p1',text:'Try again',attempt:1,allowRevision:true});});await click(button('Revise using this feedback'));await input(element.querySelector('textarea'),'');await receive(guests[0],p);await act(async()=>{guests[0].onResponseState(receipt());guests[0].onFeedback({pollId:'p1',text:'Try again',attempt:1,allowRevision:true});});expect(element.querySelector('textarea').value).toBe('');expect(button('Submit revision').disabled).toBe(true);expect(LP.readLivePollDraft('LIVE','u','p1').editing).toBe(true);
  });
  it('keeps a pending withdrawal visible until the teacher confirms it',async()=>{
    const{guests,send}=guestMock();await render();await receive(guests[0],poll('p1','wordcloud'));await input(element.querySelector('input'),'water');await click(button('Submit response'));await ack(guests[0],send);await click(button('Withdraw term'));expect(send.mock.calls.at(-1)[2].withdrawn).toBe(true);expect(element.textContent).toContain('Waiting for your teacher');await ack(guests[0],send);expect(element.querySelector('input').value).toBe('');expect(element.textContent).toContain('confirmed that your term was withdrawn');
  });
  it('allows downloading an unconfirmed response without claiming delivery',async()=>{
    vi.useFakeTimers();const{guests}=guestMock();vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:response');vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});await render();await receive(guests[0],poll());await input(element.querySelector('textarea'),'Evidence');await click(button('Submit response'));await act(async()=>vi.advanceTimersByTime(8000));await click(button('Download unconfirmed response'));expect(element.textContent).toContain('Response downloaded, not sent.');expect(LP.readLivePollDraft('LIVE','u','p1').value).toBe('Evidence');
  });
  it('keeps offline drafts editable, provides fallback, and reconnects when the network returns',async()=>{
    let online=true;vi.spyOn(navigator,'onLine','get').mockImplementation(()=>online);const{guests}=guestMock();vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:response');vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});await render();await receive(guests[0],poll());await input(element.querySelector('textarea'),'Evidence');online=false;await act(async()=>window.dispatchEvent(new Event('offline')));expect(element.textContent).toContain('You are offline.');expect(button('Download response for teacher').disabled).toBe(false);await click(button('Download response for teacher'));expect(element.querySelector('textarea').value).toBe('Evidence');online=true;await act(async()=>window.dispatchEvent(new Event('online')));expect(guests).toHaveLength(2);
  });
  it('downloads a disconnected revision without sending it or resetting its attempt after reload',async()=>{
    vi.useFakeTimers();const{guests,send}=guestMock();vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:response');vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    const p=poll('p1','freetext',{feedback:{enabled:true,criteria:'Use evidence',maxAttempts:2}});await render();await receive(guests[0],p);await act(async()=>{guests[0].onResponseState(receipt());guests[0].onFeedback({pollId:'p1',text:'Add an example',attempt:1,allowRevision:true});});await click(button('Revise using this feedback'));await input(element.querySelector('textarea'),'New example');await act(async()=>guests[0].onFailed());await click(button('Download response for teacher'));
    expect(send).not.toHaveBeenCalled();expect(LP.readLivePollDraft('LIVE','u','p1')).toMatchObject({value:'New example',attempt:2,editing:true});await act(async()=>root.unmount());root=null;await render();await receive(guests.at(-1),p);await act(async()=>{guests.at(-1).onResponseState(receipt());guests.at(-1).onFeedback({pollId:'p1',text:'Add an example',attempt:1,allowRevision:true});});expect(element.querySelector('textarea').value).toBe('New example');expect(button('Submit revision')).toBeTruthy();
  });
  it('cancels a queued reconnect when the current connection recovers',async()=>{
    vi.useFakeTimers();const{guests}=guestMock();await render();await act(async()=>{guests[0].onDisconnected();guests[0].onConnected();});await act(async()=>vi.advanceTimersByTime(30000));expect(guests).toHaveLength(1);
  });
  it('caps automatic retries without charging duplicate failure events and offers manual retry',async()=>{
    vi.useFakeTimers();const{guests}=guestMock(false);await render();const delays=[2000,5000,10000,20000,30000,30000,30000,30000];for(const delay of delays){await act(async()=>{guests.at(-1).onFailed();guests.at(-1).onFailed();});await act(async()=>vi.advanceTimersByTime(delay));}expect(guests).toHaveLength(9);await act(async()=>guests.at(-1).onFailed());await click(button('Support'));expect(element.textContent).toContain('Automatic reconnect attempts have stopped');await click(button('Retry connection'));expect(guests).toHaveLength(10);
  });
  it('minimizes with Escape while retaining a draft',async()=>{
    const{guests}=guestMock();await render();await receive(guests[0],poll());await input(element.querySelector('textarea'),'Evidence');await act(async()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));expect(element.querySelector('[role="dialog"]')).toBeNull();await click(button('Open activity'));expect(element.querySelector('textarea').value).toBe('Evidence');
  });
});

class FakePC {
  constructor(){this.signalingState='stable';this.connectionState='new';}
  createDataChannel(){return{readyState:'open',send:vi.fn(),close:vi.fn()};}
  async createOffer(){return{type:'offer',sdp:'offer'};}
  async createAnswer(){return{type:'answer',sdp:'answer'};}
  async setLocalDescription(){this.signalingState='have-local-offer';}
  async setRemoteDescription(){}
  async addIceCandidate(){}
  close(){this.connectionState='closed';}
}
function rtc(){global.RTCPeerConnection=window.RTCPeerConnection=FakePC;global.RTCSessionDescription=window.RTCSessionDescription=class{constructor(v){Object.assign(this,v);}};global.RTCIceCandidate=window.RTCIceCandidate=class{};window.__alloFirebase={db:{},doc:(_db,...parts)=>({path:parts.join('/')}),collection:()=>({}),setDoc:vi.fn(async()=>{}),deleteDoc:vi.fn(async()=>{}),onSnapshot:vi.fn(()=>()=>{})};}
describe('Private live reconnect snapshots',()=>{
  it('replays only the connecting student’s response, feedback, and outstanding check-in',async()=>{
    rtc();const{h}=host();h.broadcastPoll(poll('p1','freetext',{feedback:{enabled:true}}));h._receiveResponse('u','Rowan',request());h.sendFeedback('u','p1',{text:'Private feedback',attempt:1,allowRevision:true});h.sendCheckIn('u','p1');h.responseReceipts.set('other',receipt('other',{response:'Other student writing'}));
    await h._acceptPeer('u',{offer:{type:'offer',sdp:'fresh'}},{});const sent=[],dc={readyState:'open',send:data=>sent.push(JSON.parse(data))};h.peers.get('u').pc.ondatachannel({channel:dc});dc.onopen();expect(sent.find(p=>p.type==='responseState').payload.response).toBe('Evidence');expect(sent.find(p=>p.type==='feedback').payload.text).toBe('Private feedback');expect(sent.some(p=>p.type==='checkIn')).toBe(true);expect(JSON.stringify(sent)).not.toContain('Other student writing');h.stop();
  });
  it('does not subscribe or arm a timeout after leaving during a signaling write',async()=>{
    rtc();const writing=deferred();window.__alloFirebase.setDoc.mockReturnValue(writing.promise);const guest=LP.createGuest({sessionCode:'LIVE',userUid:'u'}),join=guest.join();await Promise.resolve();await Promise.resolve();guest.leave();writing.resolve();await join;expect(window.__alloFirebase.onSnapshot).not.toHaveBeenCalled();expect(guest._timeoutHandle).toBeNull();
  });
});
