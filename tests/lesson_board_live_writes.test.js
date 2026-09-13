import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { writeBoardDocument } from '../lesson_board_live.js';
const source = readFileSync('AlloFlowANTI.txt','utf8');
const start=source.indexOf('async function _alloLessonBoardConditionalUpdate('),end=source.indexOf('function _applyMbSessionAdapter()',start);
function mailbox(call) {
  const bridge={isTeacher:true,code:'BOARD'}, store=vi.fn(), nudge=vi.fn();
  const controller=new Function('_alloMbBridgeState','_alloMbDocCall','_alloMbStoreAndFire','_alloMbSendNudge',source.slice(start,end)+'; return {write:_alloLessonBoardConditionalUpdate, switchBridge:next=>_alloMbBridgeState=next};')(bridge,call,store,nudge);
  return {...controller,bridge,store,nudge,ref:{__alloMbRef:'session',code:'BOARD',p:'s'}};
}
describe('Board conditional live writes',()=>{
 it('recomputes the plan from the fresh Firebase transaction snapshot',async()=>{
  const update=vi.fn(),transaction={get:vi.fn().mockResolvedValue({data:()=>({phase:'answer'})}),update};
  const fb={db:{},runTransaction:vi.fn(async(_,fn)=>fn(transaction)),updateDoc:vi.fn()},ref={};
  await writeBoardDocument(fb,ref,data=>({'escapeRoomState.phase':data.phase+'-resolved'}));
  expect(update).toHaveBeenCalledWith(ref,{'escapeRoomState.phase':'answer-resolved'});expect(fb.updateDoc).not.toHaveBeenCalled();
 });
 it('does not write after the current state invalidates a teacher action',async()=>{
  const update=vi.fn(),fb={db:{},runTransaction:async(_,fn)=>fn({get:async()=>({data:()=>({phase:'review'})}),update})};
  await expect(writeBoardDocument(fb,{},data=>{if(data.phase!=='answer')throw Error('Move advanced');return {}; })).rejects.toThrow('Move advanced');expect(update).not.toHaveBeenCalled();
 });
 it('sends a Mailbox expected revision and replans a known conflict',async()=>{
  let revision=4;
  const call=vi.fn(async request=>{if(request.a==='dget')return {docs:[{p:'s',w:revision,d:{revision}}]};if(request.xw===4){revision=5;const err=Error('conflict');err.code='allo/mailbox-conflict';throw err;}return {ok:true,w:6,d:{revision:6}};});
  const api=mailbox(call),plan=vi.fn(data=>({'escapeRoomState.revision':data.revision}));
  await api.write(api.ref,plan);
  expect(plan.mock.calls.map(([data])=>data.revision)).toEqual([4,5]);expect(call.mock.calls.filter(([r])=>r.a==='dpatch').map(([r])=>r.xw)).toEqual([4,5]);expect(api.store).toHaveBeenCalledOnce();
 });
 it('does not resend a teacher decision after an uncertain network failure',async()=>{
  const call=vi.fn(async r=>{if(r.a==='dget')return {docs:[{p:'s',w:4,d:{}}]};throw Error('offline');}),api=mailbox(call);
  await expect(api.write(api.ref,()=>({'escapeRoomState.isPaused':true}))).rejects.toThrow('offline');expect(call).toHaveBeenCalledTimes(2);expect(api.store).not.toHaveBeenCalled();
 });
 it('abandons a read if the connection changed while awaiting it',async()=>{
  let finish;const call=vi.fn(()=>new Promise(resolve=>finish=resolve)),api=mailbox(call);
  const promise=api.write(api.ref,()=>({'escapeRoomState.isPaused':true}));api.switchBridge({isTeacher:true,code:'OTHER'});finish({docs:[{p:'s',w:4,d:{}}]});
  await expect(promise).rejects.toThrow('connection has changed');expect(call).toHaveBeenCalledOnce();
 });
 it('never routes Mailbox or LAN references into the native Firebase transaction',async()=>{
  const transaction=vi.fn(),fb={runTransaction:transaction,getDoc:async()=>({data:()=>({})}),updateDoc:vi.fn()};
  const previous=window.__alloLessonBoardConditionalUpdate;window.__alloLessonBoardConditionalUpdate=vi.fn(async(_,plan)=>plan({}));
  try{await writeBoardDocument(fb,{__alloMbRef:'session'},()=>({'escapeRoomState.isPaused':true}));await writeBoardDocument(fb,{__alloLanRef:'session'},()=>({'escapeRoomState.isPaused':true}));expect(transaction).not.toHaveBeenCalled();expect(fb.updateDoc).toHaveBeenCalledOnce();}finally{window.__alloLessonBoardConditionalUpdate=previous;}
 });
 it('keeps the conditional helper identical in all host entry files',()=>{
  for(const file of ['desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx']){const other=readFileSync(file,'utf8'),a=other.indexOf('async function _alloLessonBoardConditionalUpdate('),b=other.indexOf('function _applyMbSessionAdapter()',a);expect(other.slice(a,b)).toBe(source.slice(start,end));expect(other).toContain('window.__alloLessonBoardConditionalUpdate = _alloLessonBoardConditionalUpdate;');}
 });
});
