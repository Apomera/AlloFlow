import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {loadAlloModule} from './setup.js';
import * as e from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),{makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs'),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
let root,host,api,read,write;const props={appId:'board-app',targetAppId:'board-app',activeSessionCode:'ROOM',user:{uid:'learner'},t:key=>key};
const start=()=>{const data={hostId:'teacher',roster:{learner:{name:'Learner'}},escapeRoomState:e.createSession(makeBoard(),'teacher',{learner:{}})};const run=e.runOf(data.escapeRoomState);return put(data,e.merge(run,e.begin(data.escapeRoomState.board,run,'heater')));};
const put=(data,run)=>{const clone=structuredClone(data);clone.escapeRoomState.teamProgress.All.boardRuns[clone.escapeRoomState.attemptId]=run;return clone;};
const answer=(data,value='0')=>{const s=data.escapeRoomState,run=e.runOf(s),action={attemptId:s.attemptId,turn:run.turn,requestId:e.requestId(run,'answer'),kind:'answer',targetId:'heater',value};return put(data,e.merge(run,e.processAction(s.board,run,action,'learner',{attemptId:s.attemptId,active:true})));};
const resolve=data=>put(data,e.merge(e.runOf(data.escapeRoomState),e.resolve(data.escapeRoomState.board,e.runOf(data.escapeRoomState),data.roster)));
const retry=data=>put(data,e.merge(e.runOf(data.escapeRoomState),e.retry(data.escapeRoomState.board,e.runOf(data.escapeRoomState))));
const mount=async(Component,data,patch={})=>{if(!root){host=document.createElement('div');document.body.append(host);root=createRoot(host);}await act(async()=>root.render(React.createElement(Component,{...props,sessionData:data,...patch})));};
const click=async node=>{expect(node).toBeTruthy();await act(async()=>node.click());};
beforeAll(()=>{window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.AlloLanguageContext=React.createContext({t:key=>key});read=vi.fn();write=vi.fn();window.__alloFirebase={db:{},doc:(_,...parts)=>parts.join('/'),getDoc:read,updateDoc:write};window.__alloShared={db:{},warnLog(){}};loadAlloModule('lesson_board_module.js');api=window.AlloModules;});
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=host=null;read.mockReset();write.mockReset();localStorage.clear();sessionStorage.clear();});
describe('Board live retry integration',()=>{
 it('preserves the visible Pause intent when another teacher already paused the board',async()=>{
  const data=start(),fresh=structuredClone(data);fresh.escapeRoomState.isPaused=true;read.mockResolvedValue({data:()=>fresh});write.mockResolvedValue(undefined);
  await mount(api.LessonBoardTeacher,data);await click([...host.querySelectorAll('button')].find(button=>button.textContent==='Pause board'));
  expect(write).toHaveBeenCalledWith(expect.anything(),{'escapeRoomState.isPaused':true});
 });

 it('keeps oversized sessions open with an actionable error instead of throwing from host processing',async()=>{
  const data=start(),run=e.runOf(data.escapeRoomState);data.notes='x'.repeat(76000);data.escapeRoomState.teamProgress.All.boardActions.learner={attemptId:data.escapeRoomState.attemptId,turn:run.turn,requestId:e.requestId(run,'answer'),kind:'answer',targetId:'heater',value:'1'};
  await mount(api.LessonBoardTeacher,data);expect(host.querySelector('[role="alert"]').textContent).toContain('near its storage limit');expect(write).not.toHaveBeenCalled();
 });

 it('reopens an unsuccessful classroom activity in the same move with retained first-attempt evidence',async()=>{const data=resolve(answer(start()));read.mockResolvedValue({data:()=>data});write.mockResolvedValue(undefined);await mount(api.LessonBoardTeacher,data);await click(host.querySelector('[data-board-retry]'));expect(write).toHaveBeenCalledTimes(1);const patch=write.mock.calls[0][1],entry=Object.values(patch).find(value=>value&&typeof value==='object'&&value.retryRound===1);expect(entry).toMatchObject({phase:'answer',targetId:'heater',retryRound:1,retryStats:{learner:{answered:1,correct:0,firstCorrect:false,lastCorrect:false}}});expect(Object.keys(patch).some(key=>key.endsWith('.turn'))).toBe(false);});
 it('sends a new learner response with the current retry-round identity and unchanged mailbox shape',async()=>{const data=retry(resolve(answer(start())));write.mockResolvedValue(undefined);await mount(api.LessonBoardStudent,data);const input=host.querySelector('[data-board-choice]');await act(async()=>{input.value='1';input.dispatchEvent(new Event('change',{bubbles:true}));});await click(host.querySelector('[data-board-submit]'));expect(write).toHaveBeenCalledTimes(1);const action=Object.values(write.mock.calls[0][1])[0];expect(action.requestId).toMatch(/^r1_/);expect(Object.keys(action).sort()).toEqual(['attemptId','kind','requestId','targetId','turn','value']);expect(action).toMatchObject({turn:0,kind:'answer',targetId:'heater',value:'1'});});
 it('does not process an old-round action after the teacher opens a retry window',async()=>{const data=retry(resolve(answer(start())));data.escapeRoomState.teamProgress.All.boardActions.learner={attemptId:data.escapeRoomState.attemptId,turn:0,requestId:'old_delayed_response',kind:'answer',targetId:'heater',value:'1'};await mount(api.LessonBoardHost,data);expect(write).not.toHaveBeenCalled();});
 it('does not resolve a later retry round using a delayed earlier teacher click',async()=>{const old=answer(start()),fresh=answer(retry(resolve(old)),'1');let finish;read.mockReturnValue(new Promise(resolve=>finish=resolve));await mount(api.LessonBoardTeacher,old);await click(host.querySelector('[data-board-resolve]'));await mount(api.LessonBoardTeacher,fresh);await act(async()=>finish({data:()=>fresh}));expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('already advanced this move');});
 it('ignores a pending teacher resolution after switching applications',async()=>{const data=answer(start());let finish;read.mockReturnValue(new Promise(resolve=>finish=resolve));await mount(api.LessonBoardTeacher,data);await click(host.querySelector('[data-board-resolve]'));await mount(api.LessonBoardTeacher,data,{appId:'another-app'});await act(async()=>finish({data:()=>data}));expect(write).not.toHaveBeenCalled();});
});
