import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {simulatePlan} from '../lesson_board_sandbox.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React,{makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,host;
function fixture(longRoute=false,build=true){
  const board={...makeBoard(),playStyle:'tabletop',travelLimit:3,goal:'expedition',expeditionKit:'pathfinder'};
  if(longRoute){board.edges=board.edges.filter(([a,b])=>!(a==='rain'&&b==='sequence'));board.edges.push(['sequence','river'],['river','cloud']);}
  let run=engine.emptyRun();
  const moves=longRoute?['heater','cloud','river','sequence','river','heater']:['heater','cloud','rain','sequence','heater'];
  if(build)moves.push('bridge');
  for(const id of moves){
    if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(board,run));
    run=engine.merge(run,engine.begin(board,run,id));
    if(engine.stepOf(run).phase==='answer'){
      run=engine.merge(run,engine.processAction(board,run,{attemptId:'sandbox-route',turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(board.locations.find(node=>node.id===id))},'solo',{attemptId:'sandbox-route',active:true}));
      run=engine.merge(run,engine.resolve(board,run,{solo:{}}));
    }
  }
  return {board,run:engine.merge(run,engine.advance(board,run))};
}
const find=selector=>host.querySelector(selector),all=selector=>[...host.querySelectorAll(selector)];
const option=(id,route)=>'[data-sandbox-travel="'+id+'"] [data-sandbox-route-option="'+route+'"]';
async function click(selector){expect(find(selector)).toBeTruthy();await act(async()=>{find(selector).click();await new Promise(resolve=>setTimeout(resolve,0));});}
async function render(props,component=UI.PlanningSandbox){if(!root){host=document.createElement('div');host.className='lb';document.body.append(host);root=createRoot(host);}await act(async()=>root.render(React.createElement(component,{t:key=>key,Icon:UI.Icon,...props})));}
async function start(props,component){await render(props,component);await click('[data-sandbox-start]');}
function balances(index){return all('[data-sandbox-comparison="'+index+'"] [data-resource-count]').map(node=>Number(node.textContent));}
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {PlanningSandbox} from './lesson_board_sandbox_ui.jsx';export {BoardView,Icon} from './lesson_board_ui.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'SandboxRoutesUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return SandboxRoutesUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=host=null;localStorage.clear();sessionStorage.clear();vi.restoreAllMocks();});

describe('Explicit routes in private multi-turn plans',()=>{
  it('previews legal alternatives and first-use rewards before adding or moving',async()=>{
    const f=fixture(),before=JSON.stringify(f),onInspect=vi.fn();await start({...f,onInspect});
    expect(find(option('rain','shortest')+' input').checked).toBe(true);
    expect(find(option('rain','shortest')+' [data-sandbox-route]').textContent).toContain('Heating station → Cloud laboratory → Rain observatory');
    expect(find(option('rain','bridge:bridge')+' [data-sandbox-route]').textContent).toContain('Heating station → Cycle mechanism → Rain observatory');
    expect(find(option('rain','shortest')+' [data-sandbox-route-kit]')).toBeNull();
    expect(find(option('rain','bridge:bridge')+' [data-sandbox-route-first-use]').textContent).toContain('Observation bridge');
    expect(find(option('rain','bridge:bridge')+' [data-sandbox-route-kit]').textContent).toContain('+2 Observation tokens');
    await click(option('rain','bridge:bridge')+' input');
    expect(find('[data-sandbox-step]')).toBeNull();expect(onInspect).not.toHaveBeenCalled();expect(JSON.stringify(f)).toBe(before);
    await click('[data-sandbox-add="rain"]');
    expect(find('[data-sandbox-step="rain"] [data-sandbox-route]').textContent).toContain('Cycle mechanism');
    expect(find('[data-sandbox-step="rain"]').textContent).toContain('Kit bonus included');
    expect(balances(0)).toEqual(simulatePlan(f.board,f.run,[{id:'rain',route:'bridge:bridge'}]).progress.balance);
    expect(localStorage.length+sessionStorage.length).toBe(0);
  });
  it('compares manually drafted alternatives without replacing the other plan',async()=>{
    const f=fixture();await start(f);await click('[data-sandbox-add="cloud"]');
    const a=balances(0);await click('[data-sandbox-plan="1"]');
    await click(option('cloud','bridge:bridge')+' input');await click('[data-sandbox-add="cloud"]');
    expect(find('[data-sandbox-route-segments]').textContent).toContain('Plan A: 1 route segment; Plan B: 3 route segments');
    expect(find('[data-plan-tradeoffs]').textContent).toContain('Plan A leaves 2 fewer Observation tokens');
    expect(find('[data-sandbox-route-uses]').textContent).toContain('Plan A: none. Plan B: Observation bridge.');
    expect(balances(0)).toEqual(a);expect(balances(1)).toEqual(a.map(value=>value+2));
    await click('[data-sandbox-plan="0"]');expect(find('[data-sandbox-step="cloud"] [data-sandbox-route]').textContent).toBe('Route: Heating station → Cloud laboratory');
    await click('[data-sandbox-plan="1"]');expect(find('[data-sandbox-step="cloud"] [data-sandbox-route]').textContent).toContain('Cycle mechanism');
  });
  it('preserves exact paths across copy, a later crossing, undo, and first-move inspection',async()=>{
    const f=fixture(),onInspect=vi.fn();await start({...f,onInspect});
    await click(option('rain','bridge:bridge')+' input');await click('[data-sandbox-add="rain"]');
    expect(find(option('heater','bridge:bridge')+' [data-sandbox-route-kit]')).toBeNull();
    expect(find(option('heater','bridge:bridge')+' [data-sandbox-route-first-use]')).toBeNull();
    await click(option('heater','bridge:bridge')+' input');await click('[data-sandbox-add="heater"]');
    expect(find('[data-sandbox-step="heater"] [data-sandbox-route]').textContent).toContain('Rain observatory → Cycle mechanism → Heating station');
    expect(all('[data-sandbox-step]').filter(node=>node.textContent.includes('Kit bonus included'))).toHaveLength(1);
    await click('[data-sandbox-copy]');await click('[data-sandbox-plan="1"]');await click('[data-sandbox-undo]');
    expect(all('[data-sandbox-step]')).toHaveLength(1);expect(find('[data-sandbox-comparison="0"]').textContent).toContain('2 planned moves');
    await click('[data-sandbox-inspect]');expect(onInspect).toHaveBeenCalledExactlyOnceWith('rain',undefined,'bridge:bridge');expect(find('[data-planning-sandbox]').open).toBe(false);
  });
  it('resets uncommitted route choices when switching plans or changing projected history',async()=>{
    const f=fixture();await start(f);await click(option('rain','bridge:bridge')+' input');
    await click('[data-sandbox-plan="1"]');expect(find(option('rain','shortest')+' input').checked).toBe(true);
    await click('[data-sandbox-plan="0"]');expect(find(option('rain','shortest')+' input').checked).toBe(true);
    await click(option('rain','bridge:bridge')+' input');await click('[data-sandbox-add="cloud"]');await click('[data-sandbox-undo]');
    expect(find(option('rain','shortest')+' input').checked).toBe(true);
    await click('[data-sandbox-add="rain"]');expect(find('[data-sandbox-step="rain"] [data-sandbox-route]').textContent).toContain('Cloud laboratory');expect(find('[data-sandbox-step="rain"]').textContent).not.toContain('Kit bonus included');
  });
  it('offers routes unlocked by a planned construction and removes them when that step is undone',async()=>{
    const f=fixture(false,false),before=JSON.stringify(f.run);await start(f);expect(find('[data-sandbox-travel="rain"]')).toBeNull();
    await click('[data-sandbox-construction="bridge"] [data-funding-option="standard"] input');await click('[data-sandbox-add="bridge"]');
    expect(find(option('rain','bridge:bridge')+' input')).toBeTruthy();
    await click('[data-sandbox-undo]');expect(find('[data-sandbox-travel="rain"]')).toBeNull();expect(JSON.stringify(f.run)).toBe(before);
  });
  it('omits routes beyond the move limit while retaining the ordinary shortest-path action',async()=>{
    const f=fixture(true);expect(engine.travelRouteOptions(f.board,engine.derive(f.board,f.run),'rain').find(option=>option.id==='bridge:bridge').legal).toBe(false);
    await start(f);expect(find('[data-sandbox-travel="rain"]')).toBeNull();expect(find('[data-sandbox-add="rain"]')).toBeTruthy();
    await click('[data-sandbox-add="rain"]');expect(find('[data-sandbox-step="rain"] [data-sandbox-route]').textContent).toContain('Heating station → Cloud laboratory → Rain observatory');
  });
  it('remains private for learners, including inspection of a chosen alternate',async()=>{
    const f=fixture(),before=JSON.stringify(f.run),onMove=vi.fn(),onAnswer=vi.fn(),onPropose=vi.fn();
    await start({...f,role:'student',uid:'learner',onMove,onAnswer,onPropose},UI.BoardView);
    expect(find(option('rain','bridge:bridge')+' input').disabled).toBe(false);
    await click(option('rain','bridge:bridge')+' input');await click('[data-sandbox-add="rain"]');await click('[data-sandbox-inspect]');
    expect(find('[data-board-move="rain"]')).toBeTruthy();expect(onMove).not.toHaveBeenCalled();expect(onAnswer).not.toHaveBeenCalled();expect(onPropose).not.toHaveBeenCalled();expect(JSON.stringify(f.run)).toBe(before);expect(localStorage.length+sessionStorage.length).toBe(0);
  });
  it('removes route controls when locked or stale and preserves the earlier plan',async()=>{
    const f=fixture(),onInspect=vi.fn();await start({...f,onInspect});await click(option('rain','bridge:bridge')+' input');await click('[data-sandbox-add="rain"]');
    await render({...f,onInspect,locked:true});expect(find('[data-sandbox-travel]')).toBeNull();expect(find('[data-sandbox-inspect]').disabled).toBe(true);
    const changed=simulatePlan(f.board,f.run,['cloud']).run;await render({...f,run:changed,onInspect});expect(find('[data-sandbox-stale]')).toBeTruthy();expect(find('[data-sandbox-travel]')).toBeNull();expect(find('[data-sandbox-step="rain"] [data-sandbox-route]').textContent).toContain('Cycle mechanism');
    await click('[data-sandbox-inspect]');expect(onInspect).not.toHaveBeenCalled();await click('[data-sandbox-restart]');expect(find('[data-sandbox-step]')).toBeNull();expect(find('[data-sandbox-stale]')).toBeNull();
  });
});
