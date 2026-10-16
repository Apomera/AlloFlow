import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {loadAlloModule} from './setup.js';
import * as engine from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React,{makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let root,host,api,read,write;
function fixture(){
  const board={...makeBoard(),playStyle:'tabletop',travelLimit:3,goal:'expedition',expeditionKit:'pathfinder'},roster={learner:{name:'Rowan'}},state=engine.createSession(board,'teacher',roster);let run=engine.emptyRun();
  for(const id of ['heater','cloud','rain','sequence','heater','bridge']){
    if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(board,run));run=engine.merge(run,engine.begin(board,run,id));
    if(engine.stepOf(run).phase==='answer'){run=engine.merge(run,engine.processAction(board,run,{attemptId:state.attemptId,turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(board.locations.find(node=>node.id===id))},'learner',{attemptId:state.attemptId,active:true}));run=engine.merge(run,engine.resolve(board,run,roster));}
  }
  run=engine.merge(run,engine.advance(board,run));state.teamProgress.All.boardRuns[state.attemptId]=run;return {hostId:'teacher',roster,escapeRoomState:state};
}
const runOf=data=>engine.runOf(data.escapeRoomState);
async function render(data,student=false){if(!root){host=document.createElement('div');document.body.append(host);root=createRoot(host);}await act(async()=>root.render(React.createElement(student?api.LessonBoardStudent:api.LessonBoardTeacher,{appId:'routes-live',targetAppId:'routes-live',activeSessionCode:'ROOM',user:{uid:student?'learner':'teacher'},t:key=>key,sessionData:data})));}
async function click(selector){const node=host.querySelector(selector);expect(node).toBeTruthy();await act(async()=>node.click());}
beforeAll(()=>{window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.AlloLanguageContext=React.createContext({t:key=>key});read=vi.fn();write=vi.fn();window.__alloFirebase={db:{},doc:()=>({}),getDoc:(...args)=>read(...args),updateDoc:(...args)=>write(...args)};window.__alloShared={db:{},warnLog(){}};loadAlloModule('lesson_board_module.js');api=window.AlloModules;});
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=host=null;read.mockReset();write.mockReset();localStorage.clear();sessionStorage.clear();});
describe('Authoritative shared route decisions',()=>{
  it('drafts without writing and commits the teacher’s chosen route in the move',async()=>{
    const data=fixture();read.mockResolvedValue({data:()=>data});write.mockResolvedValue(undefined);await render(data);await click('[data-ready-move=rain]');await click('[data-route-option="bridge:bridge"] input');expect(write).not.toHaveBeenCalled();
    expect(host.querySelector('[data-forecast-kit]')).toBeTruthy();await click('[data-board-move=rain]');expect(write).toHaveBeenCalledOnce();
    const patch=write.mock.calls[0][1],prefix='escapeRoomState.teamProgress.All.boardRuns.'+data.escapeRoomState.attemptId+'.steps.t'+runOf(data).turn;
    expect(patch[prefix+'.route']).toBe('bridge:bridge');const next=engine.merge(data,patch);expect(engine.routeForStep(data.escapeRoomState.board,runOf(next))).toEqual(['heater','sequence','rain']);expect(engine.derive(data.escapeRoomState.board,runOf(next)).kitGains).toEqual([2,2]);
  });
  it('rechecks fresh pause and turn state before committing a drafted route',async()=>{
    for(const reason of ['pause','turn']){const data=fixture(),fresh=structuredClone(data);if(reason==='pause')fresh.escapeRoomState.isPaused=true;else{const state=fresh.escapeRoomState;state.teamProgress.All.boardRuns[state.attemptId]=engine.merge(runOf(fresh),engine.begin(state.board,runOf(fresh),'cloud'));}
      read.mockResolvedValue({data:()=>fresh});await render(data);await click('[data-ready-move=rain]');await click('[data-route-option="bridge:bridge"] input');await click('[data-board-move=rain]');expect(write).not.toHaveBeenCalled();
    }
  });
  it('allows students to discuss route details without selecting or writing a route',async()=>{
    const data=fixture();await render(data,true);await click('[data-ready-move=rain]');expect(host.querySelector('[data-route-option="bridge:bridge"] input').disabled).toBe(true);await click('[data-route-option="bridge:bridge"] input');expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('Your teacher chooses the route');
  });
  it('resets a drafted route on a later turn instead of silently reusing it',async()=>{
    const data=fixture();await render(data);await click('[data-ready-move=rain]');await click('[data-route-option="bridge:bridge"] input');
    const next=structuredClone(data),state=next.escapeRoomState;let run=runOf(next);run=engine.merge(run,engine.begin(state.board,run,'cloud'));run=engine.merge(run,engine.advance(state.board,run));state.teamProgress.All.boardRuns[state.attemptId]=run;
    await render(next);await click('[data-ready-move=rain]');expect(host.querySelector('[data-route-option=shortest] input').checked).toBe(true);expect(write).not.toHaveBeenCalled();
  });
});
