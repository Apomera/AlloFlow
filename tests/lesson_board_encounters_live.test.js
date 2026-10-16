import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {loadAlloModule} from './setup.js';
import * as engine from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),{makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs'),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
let root,host,api,read,write;
const props={appId:'encounter-live',targetAppId:'encounter-live',activeSessionCode:'ROOM',user:{uid:'teacher'},t:key=>key};
function pendingSession(die=1){
  const board={...makeBoard(),playStyle:'tabletop',chance:true},roster={learner:{name:'Rowan'}};
  const state=engine.createSession(board,'teacher',roster);let run=engine.emptyRun();
  for(const id of ['heater','cloud']){
    if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(board,run));
    run=engine.merge(run,engine.begin(board,run,id));
    const node=board.locations.find(item=>item.id===id);
    run=engine.merge(run,engine.processAction(board,run,{attemptId:state.attemptId,turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(node)},'learner',{attemptId:state.attemptId,active:true}));
    run=engine.merge(run,engine.resolve(board,run,roster,{dice:[id==='cloud'?die:1,1]}));
  }
  state.teamProgress.All.boardRuns[state.attemptId]=run;
  return {hostId:'teacher',roster,escapeRoomState:state};
}
const getRun=data=>engine.runOf(data.escapeRoomState);
const choose=(data,choice)=>{const copy=structuredClone(data),state=copy.escapeRoomState;state.teamProgress.All.boardRuns[state.attemptId]=engine.merge(getRun(copy),engine.chooseFieldOpportunity(state.board,getRun(copy),choice));return copy;};
function pendingRelaySession(){
  const data=choose(pendingSession(),'collect'),state=data.escapeRoomState,board=state.board;
  board.edges=board.locations.slice(1).map((node,index)=>[board.locations[index].id,node.id]);
  let run=getRun(data);
  for(const id of ['river','rain','lake']){
    run=engine.merge(run,engine.advance(board,run));run=engine.merge(run,engine.begin(board,run,id));
    run=engine.merge(run,engine.processAction(board,run,{attemptId:state.attemptId,turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(board.locations.find(node=>node.id===id))},'learner',{attemptId:state.attemptId,active:true}));
    run=engine.merge(run,engine.resolve(board,run,data.roster,{dice:[11,1]}));
  }
  state.teamProgress.All.boardRuns[state.attemptId]=run;
  return data;
}
async function mount(component,data,extra={}){if(!root){host=document.createElement('div');document.body.append(host);root=createRoot(host);}await act(async()=>root.render(React.createElement(component,{...props,sessionData:data,...extra})));}
async function click(selector){const node=host.querySelector(selector);expect(node).toBeTruthy();await act(async()=>node.click());}
beforeAll(()=>{window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.AlloLanguageContext=React.createContext({t:key=>key});read=vi.fn();write=vi.fn();window.__alloFirebase={db:{},doc:()=>({}),getDoc:(...args)=>read(...args),updateDoc:(...args)=>write(...args)};window.__alloShared={db:{},warnLog(){}};loadAlloModule('lesson_board_module.js');api=window.AlloModules;});
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=host=null;read.mockReset();write.mockReset();delete window.__alloFirebase.runTransaction;localStorage.clear();sessionStorage.clear();});
describe('Shared expedition encounter choices',()=>{
  it('commits the teacher’s selected relay order once and rejects a stale competing benefit',async()=>{
    const data=pendingRelaySession(),board=data.escapeRoomState.board,run=getRun(data),before=engine.derive(board,run),offer=engine.fieldOpportunity(board,run).relays[1];
    read.mockResolvedValue({data:()=>data});write.mockResolvedValue(undefined);await mount(api.LessonBoardTeacher,data);
    await click('[data-field-approach=relay]');await click('[data-field-relay-option="'+offer.id+'"]');
    expect(write).not.toHaveBeenCalled();expect(host.querySelector('[data-board-next]').disabled).toBe(true);
    await click('[data-field-relay-commit]');expect(write).toHaveBeenCalledOnce();
    const patch=write.mock.calls[0][1];
    expect(patch).toEqual({['escapeRoomState.teamProgress.All.boardRuns.'+data.escapeRoomState.attemptId+'.steps.t4.result.fieldChoice']:offer.id});
    const updated=engine.merge(data,patch),progress=engine.derive(board,getRun(updated));
    expect(progress.fieldRelay).toMatchObject({turn:4,id:'passage',stage:0,targetId:offer.stops[0].targetId,stops:offer.stops,reward:offer.reward});
    for(const key of ['balance','fortune','position','fieldGains','fieldDeliveries'])expect(progress[key]).toEqual(before[key]);
    expect(getRun(updated).turn).toBe(run.turn);expect(engine.stepOf(getRun(updated)).result.dice).toEqual(engine.stepOf(run).result.dice);
    write.mockClear();const competing=choose(data,'crew');
    window.__alloFirebase.runTransaction=async(_,fn)=>fn({get:async()=>({data:()=>competing}),update:write});
    await mount(api.LessonBoardTeacher,data);await click('[data-field-relay-commit]');
    expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('no longer available');
    expect(engine.fieldOpportunity(board,getRun(data)).pending).toBe(true);
  });
  it('lets students compare both relay orders while blocking acceptance and checks a fresh pause',async()=>{
    const data=pendingRelaySession(),snapshot=JSON.stringify(data),offers=engine.fieldOpportunity(data.escapeRoomState.board,getRun(data)).relays;
    await mount(api.LessonBoardStudent,data,{user:{uid:'learner'}});await click('[data-field-approach=relay]');
    for(const offer of offers){
      await click('[data-field-relay-option="'+offer.id+'"]');expect(host.querySelector('[data-field-relay-preview]').dataset.fieldRelayPreview).toBe(offer.id);
      expect(host.querySelector('[data-field-relay-commit]').disabled).toBe(true);await click('[data-field-relay-commit]');
    }
    expect(write).not.toHaveBeenCalled();expect(JSON.stringify(data)).toBe(snapshot);
    const fresh=structuredClone(data);fresh.escapeRoomState.isPaused=true;read.mockResolvedValue({data:()=>fresh});
    await mount(api.LessonBoardTeacher,data);await click('[data-field-approach=relay]');await click('[data-field-relay-commit]');
    expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('Resume the board');
    expect(engine.derive(data.escapeRoomState.board,getRun(data))).not.toHaveProperty('fieldRelay');
  });
  it('commits one named construction commission and rejects a stale competing choice',async()=>{
    const data=pendingSession(6),board=data.escapeRoomState.board,run=getRun(data),id=engine.fieldOpportunity(board,run).commissions[0].projectId;
    read.mockResolvedValue({data:()=>data});write.mockResolvedValue(undefined);await mount(api.LessonBoardTeacher,data);
    await click('[data-field-approach=commission]');expect(write).not.toHaveBeenCalled();await click('[data-field-commission-commit]');
    expect(write).toHaveBeenCalledOnce();const patch=write.mock.calls[0][1];
    expect(patch).toEqual({['escapeRoomState.teamProgress.All.boardRuns.'+data.escapeRoomState.attemptId+'.steps.t1.result.fieldChoice']:'commission:'+id});
    const updated=engine.merge(data,patch),progress=engine.derive(board,getRun(updated));
    expect(progress.fieldCommission).toMatchObject({projectId:id,reward:[3,1]});expect(progress.balance).toEqual(engine.derive(board,run).balance);expect(progress.position).toBe('cloud');expect(getRun(updated).turn).toBe(run.turn);
    write.mockClear();read.mockResolvedValue({data:()=>choose(data,'crew')});await mount(api.LessonBoardTeacher,data);await click('[data-field-commission-commit]');
    expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('no longer available');
  });
  it('keeps commission offers read-only for students and rechecks a pause before teacher acceptance',async()=>{
    const data=pendingSession(6);await mount(api.LessonBoardStudent,data,{user:{uid:'learner'}});await click('[data-field-approach=commission]');
    expect(host.querySelector('[data-field-commission-commit]').disabled).toBe(true);await click('[data-field-commission-commit]');expect(write).not.toHaveBeenCalled();
    const fresh=structuredClone(data);fresh.escapeRoomState.isPaused=true;read.mockResolvedValue({data:()=>fresh});
    await mount(api.LessonBoardTeacher,data);await click('[data-field-approach=commission]');await click('[data-field-commission-commit]');
    expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('Resume the board');expect(engine.derive(data.escapeRoomState.board,getRun(data)).fieldCommission).toBeUndefined();
  });
  it('keeps the delivery receipt visible when arriving home also completes the expedition',async()=>{
    const data=pendingSession(),state=data.escapeRoomState,b=state.board;b.starts=['cloud','heater'];b.edges=b.locations.slice(1).map((node,index)=>[b.locations[index].id,node.id]);
    let run=engine.emptyRun();
    const move=id=>{
      if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(b,run));
      run=engine.merge(run,engine.begin(b,run,id));
      if(engine.stepOf(run).phase==='answer'){
        run=engine.merge(run,engine.processAction(b,run,{attemptId:state.attemptId,turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(b.locations.find(item=>item.id===id))},'learner',{attemptId:state.attemptId,active:true}));
        run=engine.merge(run,engine.resolve(b,run,data.roster,{dice:[1,1]}));
      }
    };
    move('cloud');move('heater');run=engine.merge(run,engine.chooseFieldOpportunity(b,run,'delivery:cloud'));
    for(const id of ['river','heater','bridge','research','sequence','cloud'])move(id);
    state.teamProgress.All.boardRuns[state.attemptId]=run;expect(engine.derive(b,run).complete).toBe(true);
    await mount(api.LessonBoardTeacher,data);
    expect(host.querySelector('[data-board-final-move]')).toBeTruthy();expect(host.querySelector('[data-field-delivery-kind=delivery] h4').textContent).toBe('Delivery completed');
    expect(host.querySelector('[data-field-delivery-active]')).toBeNull();expect(write).not.toHaveBeenCalled();
  });
  it('commits one teacher delivery and rejects a stale competing choice without moving or paying',async()=>{
    const data=pendingSession(),board=data.escapeRoomState.board,run=getRun(data),id=engine.fieldOpportunity(board,run).deliveries[0].targetId;
    read.mockResolvedValue({data:()=>data});write.mockResolvedValue(undefined);await mount(api.LessonBoardTeacher,data);
    await click('[data-field-approach=delivery]');expect(write).not.toHaveBeenCalled();await click('[data-field-delivery-commit]');
    expect(write).toHaveBeenCalledOnce();const patch=write.mock.calls[0][1];
    expect(patch).toEqual({['escapeRoomState.teamProgress.All.boardRuns.'+data.escapeRoomState.attemptId+'.steps.t1.result.fieldChoice']:'delivery:'+id});
    const updated=engine.merge(data,patch),progress=engine.derive(board,getRun(updated));
    expect(progress.fieldDelivery).toMatchObject({targetId:id,reward:[3,0]});expect(progress.balance).toEqual(engine.derive(board,run).balance);expect(progress.position).toBe('cloud');expect(getRun(updated).turn).toBe(run.turn);
    write.mockClear();read.mockResolvedValue({data:()=>choose(data,'crew')});await mount(api.LessonBoardTeacher,data);await click('[data-field-delivery-commit]');
    expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('no longer available');
  });
  it('keeps delivery offers read-only for students and rechecks a pause before teacher acceptance',async()=>{
    const data=pendingSession();await mount(api.LessonBoardStudent,data,{user:{uid:'learner'}});await click('[data-field-approach=delivery]');
    expect(host.querySelector('[data-field-delivery-commit]').disabled).toBe(true);await click('[data-field-delivery-commit]');expect(write).not.toHaveBeenCalled();
    const fresh=structuredClone(data);fresh.escapeRoomState.isPaused=true;read.mockResolvedValue({data:()=>fresh});
    await mount(api.LessonBoardTeacher,data);await click('[data-field-approach=delivery]');await click('[data-field-delivery-commit]');
    expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('Resume the board');expect(engine.derive(data.escapeRoomState.board,getRun(data)).fieldDelivery).toBeUndefined();
  });
  it('commits one teacher trade and refuses a stale offer without a second spend',async()=>{
    const data=pendingSession(6);read.mockResolvedValue({data:()=>data});write.mockResolvedValue(undefined);
    await mount(api.LessonBoardTeacher,data);
    await click('[data-field-approach=trade]');await click('[data-field-trade-option="trade:1"]');
    expect(write).not.toHaveBeenCalled();await click('[data-field-trade-commit]');
    expect(write).toHaveBeenCalledOnce();const patch=write.mock.calls[0][1];
    expect(patch).toEqual({['escapeRoomState.teamProgress.All.boardRuns.'+data.escapeRoomState.attemptId+'.steps.t1.result.fieldChoice']:'trade:1'});
    const updated=engine.merge(data,patch),progress=engine.derive(updated.escapeRoomState.board,getRun(updated));
    expect(progress).toMatchObject({balance:[7,1],fieldGains:[2,0],fieldSpent:[0,1]});
    expect(getRun(updated).turn).toBe(getRun(data).turn);expect(engine.stepOf(getRun(updated)).result.dice).toEqual([6]);
    write.mockClear();read.mockResolvedValue({data:()=>updated});
    await mount(api.LessonBoardTeacher,data);await click('[data-field-trade-commit]');
    expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('no longer available');
  });
  it('keeps barter read-only for students and respects a pause discovered before committing',async()=>{
    const data=pendingSession(6);await mount(api.LessonBoardStudent,data,{user:{uid:'learner'}});await click('[data-field-approach=trade]');
    expect(host.querySelector('[data-field-trade-commit]').disabled).toBe(true);await click('[data-field-trade-commit]');expect(write).not.toHaveBeenCalled();
    const fresh=structuredClone(data);fresh.escapeRoomState.isPaused=true;read.mockResolvedValue({data:()=>fresh});
    await mount(api.LessonBoardTeacher,data);await click('[data-field-approach=trade]');await click('[data-field-trade-commit]');
    expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('Resume the board');
    expect(engine.derive(data.escapeRoomState.board,getRun(data)).fieldSpent).toBeUndefined();
  });
  it('commits the teacher’s selected named destination and rejects a competing fresh choice',async()=>{
    const data=pendingSession();read.mockResolvedValue({data:()=>data});write.mockResolvedValue(undefined);
    await mount(api.LessonBoardTeacher,data);
    await click('[data-field-approach=lead]');await click('[data-field-lead-option=river]');expect(write).not.toHaveBeenCalled();
    await click('[data-field-lead-commit]');
    expect(write).toHaveBeenCalledOnce();
    const patch=write.mock.calls[0][1];
    expect(patch).toEqual({['escapeRoomState.teamProgress.All.boardRuns.'+data.escapeRoomState.attemptId+'.steps.t1.result.fieldChoice']:'lead:river'});
    const updated=engine.merge(data,patch);
    expect(engine.derive(updated.escapeRoomState.board,getRun(updated)).fieldLead).toMatchObject({targetId:'river',reward:[1,2]});
    write.mockClear();read.mockResolvedValue({data:()=>choose(data,'crew')});
    await mount(api.LessonBoardTeacher,data);await click('[data-field-lead-commit]');
    expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('no longer available');
  });
  it('commits one teacher choice without changing the saved dice or turn',async()=>{
    const data=pendingSession();read.mockResolvedValue({data:()=>data});write.mockResolvedValue(undefined);
    await mount(api.LessonBoardTeacher,data);
    expect(host.querySelector('[data-board-next]').disabled).toBe(true);
    await click('[data-field-approach=prepare]');expect(write).not.toHaveBeenCalled();await click('[data-field-choice=prepare]');
    expect(write).toHaveBeenCalledOnce();
    const patch=write.mock.calls[0][1];
    expect(patch).toEqual({['escapeRoomState.teamProgress.All.boardRuns.'+data.escapeRoomState.attemptId+'.steps.t1.result.fieldChoice']:'prepare'});
    const updated=engine.merge(data,patch);
    expect(engine.stepOf(getRun(updated)).result.dice).toEqual([1]);
    expect(engine.derive(updated.escapeRoomState.board,getRun(updated)).fieldPreparation.reward).toEqual([2,0]);
    await mount(api.LessonBoardTeacher,updated);
    expect(host.querySelector('[data-board-next]').disabled).toBe(false);
    expect(host.querySelector('[data-field-choice]')).toBeNull();
  });
  it('rejects a stale teacher choice when another host already chose',async()=>{
    const data=pendingSession(),fresh=choose(data,'collect');
    window.__alloFirebase.runTransaction=async(_,fn)=>fn({get:async()=>({data:()=>fresh}),update:write});
    await mount(api.LessonBoardTeacher,data);await click('[data-field-approach=prepare]');await click('[data-field-choice=prepare]');
    expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('no longer available');
  });
  it('respects a pause found in the fresh document',async()=>{
    const data=pendingSession(),fresh=structuredClone(data);fresh.escapeRoomState.isPaused=true;read.mockResolvedValue({data:()=>fresh});
    await mount(api.LessonBoardTeacher,data);await click('[data-field-choice=collect]');
    expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('Resume the board');
  });
  it('lets students inspect the offer while only the teacher can commit it',async()=>{
    const data=pendingSession(),before=JSON.stringify(data);await mount(api.LessonBoardStudent,data,{user:{uid:'learner'}});
    const approaches=[...host.querySelectorAll('[data-field-approach]')].filter(button=>!button.disabled).map(button=>button.dataset.fieldApproach);
    expect(approaches).toEqual(expect.arrayContaining(['collect','prepare','crew','lead','delivery']));
    for(const approach of approaches){
      await click('[data-field-approach='+approach+']');expect(host.querySelector('[data-field-approach='+approach+']').getAttribute('aria-pressed')).toBe('true');
      const choices=[...host.querySelectorAll('[data-field-choice]')];expect(choices).toHaveLength(1);expect(choices[0].disabled).toBe(true);
      await act(async()=>choices[0].click());
    }
    expect(write).not.toHaveBeenCalled();expect(JSON.stringify(data)).toBe(before);
    expect(engine.fieldOpportunity(data.escapeRoomState.board,getRun(data)).pending).toBe(true);
  });
});
