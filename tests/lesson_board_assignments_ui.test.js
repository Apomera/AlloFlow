import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {assignmentItineraries} from '../lesson_board_assignments.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;
const find=selector=>element.querySelector(selector);
const next=(board,run)=>engine.merge(run,engine.advance(board,run));
const choose=(board,run,choice)=>engine.merge(run,engine.chooseFieldOpportunity(board,run,choice));
function move(board,run,id,die=1){
  if(engine.stepOf(run).phase==='review')run=next(board,run);
  run=engine.merge(run,engine.begin(board,run,id));
  if(engine.stepOf(run).phase==='answer'){
    run=engine.merge(run,engine.processAction(board,run,{attemptId:'assignment-ui',turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(board.locations.find(node=>node.id===id))},'solo',{attemptId:'assignment-ui',active:true}));
    run=engine.merge(run,engine.resolve(board,run,{solo:{}},{dice:[die,die]}));
  }
  return run;
}
function fixture({blocked=false,bridgeTarget}={}){
  const board={...makeBoard(),playStyle:'tabletop',chance:true,goal:'expedition'};
  board.edges=board.locations.slice(1).map((node,index)=>[board.locations[index].id,node.id]);
  if(bridgeTarget)board.projects.find(project=>project.id==='bridge').effect.targetId=bridgeTarget;
  if(blocked){board.locations.slice(0,5).forEach(node=>{node.reward=[0,1];});board.locations.slice(5).forEach(node=>{node.reward=[3,3];});board.projects.find(project=>project.id==='network').cost=[3,5];}
  let run=choose(board,move(board,move(board,engine.emptyRun(),'heater'),'cloud'),'delivery:heater');
  for(const id of ['river','rain'])run=move(board,run,id);
  run=next(board,choose(board,move(board,run,'lake',7),'commission:network'));
  return {board,run};
}
async function render(props,Component=UI.AssignmentRoutes){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  await act(async()=>root.render(React.createElement(Component,{t:key=>key,...props})));
}
const click=async selector=>{expect(find(selector)).toBeTruthy();await act(async()=>{find(selector).click();await new Promise(resolve=>setTimeout(resolve,0));});};
async function open(){const details=find('[data-assignment-routes]');expect(details).toBeTruthy();await act(async()=>{details.open=true;details.dispatchEvent(new Event('toggle',{bubbles:true}));});}
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {AssignmentRoutes} from './lesson_board_assignments_ui.jsx';export {BoardView,Icon} from './lesson_board_ui.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'AssignmentUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return AssignmentUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;localStorage.clear();sessionStorage.clear();vi.restoreAllMocks();});

describe('Private assignment route comparisons',()=>{
  it('opens only on request and shows exact order distances, balances and earned assignment rewards',async()=>{
    const {board,run}=fixture(),report=assignmentItineraries(board,run),before=JSON.stringify({board,run});
    await render({board,run});expect(find('[data-assignment-workspace]')).toBeNull();await open();
    expect(element.querySelectorAll('[data-assignment-option]:checked')).toHaveLength(2);
    for(const [index,plan]of report.plans.entries()){
      await click('[data-assignment-order="'+index+'"]');expect(find('[data-assignment-plan]').dataset.assignmentStatus).toBe(plan.status);
      expect(find('[data-assignment-moves]').textContent).toBe(String(plan.entries.length));expect(find('[data-assignment-segments]').textContent).toBe(String(plan.segments));expect(find('[data-assignment-completed]').textContent).toBe('2/2');
      for(const [i,value]of plan.result.progress.balance.entries())expect(find('[data-assignment-plan] [data-resource-count="'+i+'"]').textContent).toBe(String(value));
      expect(find('[data-assignment-earned]').textContent).toContain('+4 Observation tokens');expect(find('[data-assignment-earned]').textContent).toContain('+3 Connection tokens');
    }
    expect(JSON.stringify({board,run})).toBe(before);expect(localStorage.length+sessionStorage.length).toBe(0);
  });

  it('keeps priority changes private and publishes only an explicitly selected preview or pair of plans',async()=>{
    const {board,run}=fixture(),report=assignmentItineraries(board,run),onPreview=vi.fn(),onCompare=vi.fn(),onInspect=vi.fn();
    await render({board,run,onPreview,onCompare,onInspect});await open();await click('[data-assignment-order="1"]');
    expect(onPreview).not.toHaveBeenCalled();expect(onCompare).not.toHaveBeenCalled();expect(onInspect).not.toHaveBeenCalled();
    await click('[data-assignment-show]');expect(onPreview).toHaveBeenCalledExactlyOnceWith({key:report.key,plan:report.plans[1],assignments:report.assignments});
    await click('[data-assignment-customize]');expect(onCompare).toHaveBeenCalledExactlyOnceWith(report.plans.map(plan=>plan.entries));
    await click('[data-assignment-review-first]');expect(onInspect).toHaveBeenCalledExactlyOnceWith('cloud',undefined,undefined);
    expect(localStorage.length+sessionStorage.length).toBe(0);
  });

  it('allows one or no selected assignments and resets the order when the selection changes',async()=>{
    const {board,run}=fixture(),report=assignmentItineraries(board,run),delivery=report.assignments.find(item=>item.kind==='delivery').id,commission=report.assignments.find(item=>item.kind==='commission').id;
    await render({board,run});await open();await click('[data-assignment-order="1"]');await click('[data-assignment-option="'+commission+'"]');
    expect(element.querySelectorAll('[data-assignment-order]')).toHaveLength(1);expect(find('[data-assignment-order="0"]').getAttribute('aria-pressed')).toBe('true');expect(find('[data-assignment-completed]').textContent).toBe('1/1');expect(find('[data-assignment-customize]')).toBeNull();
    await click('[data-assignment-option="'+delivery+'"]');expect(find('[data-assignment-empty]')).toBeTruthy();expect(find('[data-assignment-plan]')).toBeNull();
    await click('[data-assignment-option="'+delivery+'"]');await click('[data-assignment-option="'+commission+'"]');expect(element.querySelectorAll('[data-assignment-order]')).toHaveLength(2);expect(find('[data-assignment-order="0"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('retains a blocked order’s valid prefix and never imports it as two completed plans',async()=>{
    const {board,run}=fixture({blocked:true}),report=assignmentItineraries(board,run),onPreview=vi.fn();
    await render({board,run,onPreview});await open();await click('[data-assignment-order="1"]');
    expect(find('[data-assignment-blocked]').dataset.assignmentBlocked).toBe('unaffordable');expect(find('[data-assignment-blocked]').textContent).toContain('reserved reward cannot pay');expect(find('[data-assignment-moves]').textContent).toBe('1');expect(find('[data-assignment-completed]').textContent).toBe('0/2');
    expect(find('[data-assignment-customize]')).toBeNull();expect(find('[data-assignment-earned]').textContent).toContain('+0 Observation tokens');
    await click('[data-assignment-show]');expect(onPreview).toHaveBeenCalledExactlyOnceWith({key:report.key,plan:report.plans[1],assignments:report.assignments});
    await click('[data-assignment-stops]>summary');expect(element.querySelectorAll('[data-assignment-step]')).toHaveLength(1);expect(find('[data-assignment-step]').textContent).toContain('Travel to Cloud laboratory');
  });

  it('keeps comparison available while locked but blocks preview, import and first-move callbacks',async()=>{
    const {board,run}=fixture(),onPreview=vi.fn(),onCompare=vi.fn(),onInspect=vi.fn();
    await render({board,run,locked:true,onPreview,onCompare,onInspect});await open();await click('[data-assignment-order="1"]');
    expect(find('[data-assignment-order="1"]').getAttribute('aria-pressed')).toBe('true');
    for(const selector of ['[data-assignment-show]','[data-assignment-customize]','[data-assignment-review-first]']){expect(find(selector).disabled).toBe(true);await click(selector);}
    expect(onPreview).not.toHaveBeenCalled();expect(onCompare).not.toHaveBeenCalled();expect(onInspect).not.toHaveBeenCalled();
  });

  it('waits during an unfinished move and resets private order selection after mechanical progress changes',async()=>{
    const {board,run}=fixture();await render({board,run});await open();await click('[data-assignment-order="1"]');
    const answering=engine.merge(run,engine.begin(board,run,'sequence'));await render({board,run:answering});expect(find('[data-assignment-finish-move]')).toBeTruthy();expect(find('[data-assignment-plan]')).toBeNull();
    const changed=structuredClone(board);changed.projects[0].cost[0]+=1;await render({board:changed,run});expect(find('[data-assignment-order="0"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('forwards an explicit first construction payment without submitting a build',async()=>{
    const {board,run:base}=fixture(),run=next(board,move(board,base,'cloud')),report=assignmentItineraries(board,run),onInspect=vi.fn();
    await render({board,run,onInspect});await open();await click('[data-assignment-order="1"]');expect(report.plans[1].firstMove).toEqual({id:'network',funding:'standard'});
    await click('[data-assignment-review-first]');expect(onInspect).toHaveBeenCalledExactlyOnceWith('network','standard',undefined);expect(engine.derive(board,run).built).toEqual([]);
  });

  it('adds and clears a live-map preview without changing party, counters or submitting moves',async()=>{
    const {board,run}=fixture(),onMove=vi.fn(),onAnswer=vi.fn(),before=JSON.stringify(run);await render({board,run,role:'solo',onMove,onAnswer},UI.BoardView);await open();await click('[data-assignment-order="1"]');await click('[data-assignment-show]');
    expect(find('[data-assignment-map-preview]').textContent).toContain('Private assignment plan');expect(find('[aria-current=location]').dataset.location).toBe('lake');expect(find('[data-board-mission] [data-resource-count="0"]').textContent).toBe(String(engine.derive(board,run).balance[0]));
    await click('[data-clear-assignment-preview]');expect(find('[data-assignment-map-preview]')).toBeNull();expect(onMove).not.toHaveBeenCalled();expect(onAnswer).not.toHaveBeenCalled();expect(JSON.stringify(run)).toBe(before);
  });

  it('replaces an earlier bridge-route draft with the assignment first move’s shortest route without submitting',async()=>{
    const {board,run:base}=fixture({bridgeTarget:'river'});
    let run=move(board,base,'heater');run=move(board,run,'bridge');run=next(board,move(board,run,'lake'));
    const report=assignmentItineraries(board,run),before=JSON.stringify(run),onMove=vi.fn();
    expect(engine.derive(board,run).built).toContain('bridge');expect(report.assignments.map(item=>item.kind)).toEqual(['commission']);expect(report.plans[0].firstMove).toBe('cloud');
    await render({board,run,role:'solo',onMove},UI.BoardView);await click('[data-ready-move="cloud"]');
    await click('.lb-current [data-route-option="bridge:bridge"] input');expect(find('.lb-current [data-route-option="bridge:bridge"] input').checked).toBe(true);
    expect(find('[data-map-route-choice]').dataset.mapRouteChoice).toBe('bridge:bridge');
    await open();await click('[data-assignment-review-first]');
    expect(find('.lb-current [data-route-option="shortest"] input').checked).toBe(true);expect(find('.lb-current [data-route-option="bridge:bridge"] input').checked).toBe(false);
    expect(find('[data-map-route-choice]')).toBeNull();expect(find('[data-board-move="cloud"]')).toBeTruthy();expect(onMove).not.toHaveBeenCalled();expect(JSON.stringify(run)).toBe(before);
  });
});
