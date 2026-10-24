import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {assignmentItineraries} from '../lesson_board_assignments.js';
import {planningKey,simulatePlan} from '../lesson_board_sandbox.js';
// Tabletop spaces keep a short name; their details are the accessible description.
const spoken=node=>[node?.getAttribute('aria-label'),...(node?.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent)].filter(Boolean).join('. ');
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;
const find=selector=>element.querySelector(selector),all=selector=>[...element.querySelectorAll(selector)];
const next=(b,run)=>engine.merge(run,engine.advance(b,run));
const choose=(b,run,value)=>engine.merge(run,engine.chooseFieldOpportunity(b,run,value));
function board(){const b={...makeBoard(),playStyle:'tabletop',chance:true,goal:'expedition'};b.edges=b.locations.slice(1).map((node,index)=>[b.locations[index].id,node.id]);return b;}
function move(b,run,id,die=1){
  if(engine.stepOf(run).phase==='review')run=next(b,run);
  run=engine.merge(run,engine.begin(b,run,id));if(engine.stepOf(run).phase!=='answer')return run;
  const node=b.locations.find(item=>item.id===id);
  run=engine.merge(run,engine.processAction(b,run,{attemptId:'assignment-map',requestId:engine.requestId(run),turn:run.turn,kind:'answer',targetId:id,value:engine.solution(node)},'solo',{attemptId:'assignment-map',active:true}));
  return engine.merge(run,engine.resolve(b,run,{solo:{}},{dice:[die,die]}));
}
const pending=b=>move(b,move(b,engine.emptyRun(),'heater'),'cloud');
function fixture(pair=false){
  const b=board();let run=choose(b,pending(b),pair?'delivery:heater':'lead:cooler');
  if(pair){for(const id of ['river','rain'])run=move(b,run,id);run=choose(b,move(b,run,'lake',7),'commission:network');}
  run=next(b,run);const report=assignmentItineraries(b,run);
  return {b,run,preview:{key:report.key,plan:report.plans[0],assignments:report.assignments}};
}
async function render({b,run,...props}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  await act(async()=>root.render(React.createElement(UI.BoardMap,{board:b,run,progress:engine.derive(b,run),ready:engine.targets(b,run).map(item=>item.id),selected:'research',view:'tabletop',Icon:()=>null,t:key=>key,...props})));
}
const click=async selector=>{await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardMap} from './lesson_board_map.jsx';export {assignmentMapModel} from './lesson_board_assignment_art.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'AssignmentMapUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return AssignmentMapUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Private assignment routes on the live tabletop',()=>{
  it('requires an explicit current preview and preserves actual state while inspecting or clearing',async()=>{
    const {b,run,preview}=fixture(),saved=JSON.stringify({b,run,preview}),onSelect=vi.fn(),onClearAssignmentPreview=vi.fn();
    await render({b,run,onSelect,onClearAssignmentPreview});expect(find('[data-assignment-map-preview]')).toBeNull();
    const actualParty=find('[data-party-position]').dataset.partyPosition,actualTiles=all('[data-location]').map(node=>[node.dataset.location,node.dataset.state]);
    await render({b,run,assignmentPreview:preview,onSelect,onClearAssignmentPreview,planned:['river','rain']});
    expect(find('[data-assignment-map-preview]').textContent).toContain('Private assignment plan');expect(find('[data-plan-pin]')).toBeNull();
    expect(find('[data-party-position]').dataset.partyPosition).toBe(actualParty);expect(all('[data-location]').map(node=>[node.dataset.location,node.dataset.state])).toEqual(actualTiles);
    expect(find('[data-assignment-map-priority]').dataset.assignmentTarget).toBe('cooler');
    expect(spoken(find('[data-location="cooler"]'))).toContain('Private plan priority 1: Expedition destination');
    await click('[data-assignment-map-inspect]');expect(onSelect).toHaveBeenCalledWith('cooler');
    await click('[data-clear-assignment-preview]');expect(onClearAssignmentPreview).toHaveBeenCalledTimes(1);expect(JSON.stringify({b,run,preview})).toBe(saved);
    await render({b,run});expect(find('[data-assignment-map-priority]')).toBeNull();expect(find('[data-assignment-map-route]')).toBeNull();
  });

  it('draws authoritative plan paths while preserving the current move and last actual route',async()=>{
    const {b,run,preview}=fixture();await render({b,run,assignmentPreview:preview,selected:'river'});
    const paths=preview.plan.result.steps.flatMap(step=>(step.path||[]).slice(1).map((to,index)=>[step.path[index],to].sort().join(':')));
    const routeKeys=all('[data-assignment-map-route]').map(node=>node.dataset.assignmentMapRoute.split(':').sort().join(':'));
    expect(routeKeys.length).toBeGreaterThan(0);expect(routeKeys.every(key=>paths.includes(key))).toBe(true);expect(new Set(routeKeys).size).toBe(routeKeys.length);
    expect(find('[data-route-from="cloud"][data-route-to="river"]').dataset.routePreview).toBe('true');expect(routeKeys).not.toContain('cloud:river');
    expect(find('[data-last-route="heater:cloud"]')).toBeTruthy();expect(routeKeys).not.toContain('cloud:heater');
    expect(all('[data-assignment-future-connection=true]')).toHaveLength(0);expect(find('[data-assignment-future-note]')).toBeNull();
  });

  it('retains requested priorities even if assignments pay in a different sequence and puts construction priority on its piece',async()=>{
    const {b,run,preview}=fixture(true),report=assignmentItineraries(b,run);preview.plan=report.plans[1];
    await render({b,run,assignmentPreview:preview});
    expect(preview.plan.order[0]).toContain('commission:');expect(preview.plan.completed[0]).toContain('delivery:');
    expect(find('[data-map-construction="network"] [data-assignment-map-priority]').dataset.assignmentPriority).toBe('1');
    expect(find('[data-location="heater"] [data-assignment-map-priority]').dataset.assignmentPriority).toBe('2');
    expect(find('[data-assignment-map-preview]').textContent).toContain('rewards may arrive in a different order');
    expect(find('[data-map-construction="network"]').dataset.built).toBe('false');expect(find('[data-production-total="network"]')).toBeNull();
  });

  it('offers the same private priorities and read-only inspection in 2D and list views',async()=>{
    const {b,run,preview}=fixture(true),onSelect=vi.fn();
    for(const view of ['board','list']){
      await render({b,run,assignmentPreview:preview,onSelect,view});
      expect(all('[data-assignment-map-inspect]')).toHaveLength(2);
      if(view==='list'){expect(all('[data-assignment-map-route]')).toHaveLength(0);expect(all('[data-assignment-list-priority]')).toHaveLength(2);expect(find('[data-map-construction="network"]').textContent).toContain('Private plan priority 2');}
      await click('[data-assignment-inspect-target="network"]');
    }
    expect(onSelect).toHaveBeenCalledTimes(2);expect(onSelect).toHaveBeenLastCalledWith('network');
  });

  it('labels a legal blocked prefix without claiming unfinished assignments have paid',async()=>{
    const {b,run,preview}=fixture(true);b.projects.find(project=>project.id==='network').cost=[99,99];
    const report=assignmentItineraries(b,run);preview.key=report.key;preview.plan=report.plans[0];preview.assignments=report.assignments;
    expect(preview.plan.status).toBe('blocked');await render({b,run,assignmentPreview:preview});
    expect(find('[data-assignment-map-partial-note]').textContent).toBe('Partial plan — assignments remain unfinished.');
    expect(find('[data-assignment-map-preview]').dataset.assignmentMapPartial).toBe('true');expect(find('[data-map-construction="network"]').dataset.built).toBe('false');
  });

  it('removes stale plans, active-turn plans, chance-off plans, and projection overlays',async()=>{
    const {b,run,preview}=fixture();
    await render({b,run,assignmentPreview:{...preview,key:'stale'}});expect(find('[data-assignment-map-preview]')).toBeNull();
    const started=engine.merge(run,engine.begin(b,run,'river'));await render({b,run:started,assignmentPreview:{...preview,key:planningKey(b,started)}});expect(find('[data-assignment-map-preview]')).toBeNull();
    await render({b,run,assignmentPreview:preview,reviewDisabled:true});expect(find('[data-assignment-map-preview]')).toBeNull();
    await render({b,run,assignmentPreview:preview,projection:true});expect(find('[data-assignment-map-preview]')).toBeNull();
    const noChance={...b,chance:false};await render({b:noChance,run,assignmentPreview:{...preview,key:planningKey(noChance,run)}});expect(find('[data-assignment-map-preview]')).toBeNull();
    await render({b,run,assignmentPreview:preview});expect(find('[data-assignment-map-preview]')).toBeTruthy();
    await render({b,run,assignmentPreview:preview,progress:{...engine.derive(b,run),complete:true}});expect(find('[data-assignment-map-preview]')).toBeNull();
  });

  it('marks a future shortcut as planned while keeping the actual construction and routes unchanged',async()=>{
    const {b,run}=fixture(true),bridge=b.projects.find(item=>item.id==='bridge');bridge.cost=[0,0];
    const result=simulatePlan(b,run,['heater',{id:'bridge',funding:'standard'},'sequence']);
    expect(result.steps.map(step=>step.id)).toContain('bridge');
    const assignment={id:'lead:1:sequence',kind:'lead',originTurn:1,targetId:'sequence',reward:[2,1]},preview={key:planningKey(b,run),assignments:[assignment],plan:{order:[assignment.id],result,status:'ready'}};
    await render({b,run,assignmentPreview:preview});
    expect(find('[data-assignment-map-route="heater:sequence"]').dataset.assignmentFutureConnection).toBe('true');
    expect(find('[data-assignment-future-note]').textContent).toContain('planned construction');
    expect(find('[data-built-route="bridge"]')).toBeNull();expect(find('[data-map-construction="bridge"]').dataset.built).toBe('false');
  });
});
