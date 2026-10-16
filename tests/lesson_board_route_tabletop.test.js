import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {spatialState,travelRouteOptions} from '../lesson_board_spatial.js';
import {simulatePlan} from '../lesson_board_sandbox.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;
const board=()=>({...makeBoard(),playStyle:'tabletop',goal:'expedition'}),find=selector=>element.querySelector(selector),all=selector=>[...element.querySelectorAll(selector)];
const edgeKey=(a,b)=>[a,b].sort().join(':');
function move(b,run,id,dice=[1,1],route='shortest'){
  if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(b,run));
  run=engine.merge(run,engine.begin(b,run,id,'standard',route));
  if(engine.stepOf(run).phase==='answer'){
    const target=b.locations.find(item=>item.id===id);
    run=engine.merge(run,engine.processAction(b,run,{attemptId:'a',requestId:engine.requestId(run),turn:run.turn,kind:'answer',targetId:id,value:engine.solution(target)},'solo',{attemptId:'a',active:true}));
    run=engine.merge(run,engine.resolve(b,run,{solo:{}},{dice}));
  }
  return run;
}
function readyRun(b){
  let run=engine.emptyRun();for(const id of ['heater','bridge','sequence','rain','cloud','heater'])run=move(b,run,id);
  return engine.merge(run,engine.advance(b,run));
}
const bridgeBoard=()=>{const b=board();b.projects[0]={...b.projects[0],cost:[1,0]};return b;};
async function render(props={}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  const b=props.board||board(),run=props.run||engine.emptyRun(),progress=props.progress||engine.derive(b,run);
  await act(async()=>root.render(React.createElement(UI.BoardMap,{board:b,run,progress,ready:spatialState(b,progress).moves.map(item=>item.id),selected:'cloud',view:'tabletop',Icon:()=>null,t:key=>key,...props})));
}
const click=async selector=>{await act(async()=>find(selector).click());};
const highlighted=()=>all('[data-route-preview="true"][data-route-from]').map(node=>edgeKey(node.dataset.routeFrom,node.dataset.routeTo)).sort();
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardMap} from './lesson_board_map.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'RouteTabletopUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return RouteTabletopUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Chosen routes and compact tabletop commitments',()=>{
  it('previews the legal bridge route rather than the shortest route in every map view',async()=>{
    const b=bridgeBoard(),run=readyRun(b),progress=engine.derive(b,run),route=travelRouteOptions(b,progress,'cloud').find(item=>item.id==='bridge:bridge'),before=JSON.stringify({b,run});expect(route?.legal).toBe(true);
    for(const view of ['tabletop','board','list']){
      await render({board:b,run,view,routeChoice:{targetId:'cloud',route:route.id}});
      expect(find('[data-map-route-choice]').dataset.mapRoutePath).toBe(route.path.join(','));expect(find('[data-map-route-choice]').textContent).toContain('Observation bridge');
      if(view!=='list')expect(highlighted()).toEqual(route.path.slice(1).map((id,index)=>edgeKey(route.path[index],id)).sort());
      else expect(find('[data-route-preview]')).toBeNull();
      expect(find('[data-spatial-selection]').textContent).toContain(route.segments+' spaces');
    }
    expect(JSON.stringify({b,run})).toBe(before);
  });

  it('ignores drafts for other targets, non-choose phases, projections, or illegal routes',async()=>{
    const b=bridgeBoard(),run=readyRun(b),choice={targetId:'cloud',route:'bridge:bridge'};
    for(const props of [{routeChoice:{...choice,targetId:'rain'}},{routeChoice:{...choice,route:'bridge:missing'}},{routeChoice:choice,projection:true},{run:engine.merge(run,engine.begin(b,run,'cloud')),routeChoice:choice}]){
      await render({board:b,run,...props});expect(find('[data-map-route-choice]')).toBeNull();
    }
    const limited={...b,travelLimit:3},progress={...engine.derive(limited,run),position:'river',visited:[...engine.derive(b,run).visited,'river']};
    const options=travelRouteOptions(limited,progress,'cloud');expect(options.find(item=>item.id==='bridge:bridge')?.legal).toBe(false);
    await render({board:limited,run,progress,routeChoice:choice});expect(find('[data-map-route-choice]')).toBeNull();
  });

  it('also previews a bridge choice ending at an unexplored investigation',async()=>{
    const b=bridgeBoard(),run=readyRun(b),progress={...engine.derive(b,run),visited:engine.derive(b,run).visited.filter(id=>id!=='cloud')};
    const route=travelRouteOptions(b,progress,'cloud').find(item=>item.id==='bridge:bridge');expect(route?.legal).toBe(true);
    await render({board:b,run,progress,routeChoice:{targetId:'cloud',route:route.id}});
    expect(find('[data-map-route-choice]').dataset.mapRoutePath).toBe(route.path.join(','));expect(find('[data-selection-activity]').dataset.selectionActivity).toBe('investigate');
    expect(highlighted()).toEqual(route.path.slice(1).map((id,index)=>edgeKey(route.path[index],id)).sort());
  });

  it('reconstructs the saved chosen path for the last-move trail and pawn motion',async()=>{
    const b=bridgeBoard(),run=readyRun(b),route=travelRouteOptions(b,engine.derive(b,run),'cloud').find(item=>item.id==='bridge:bridge');
    await render({board:b,run});const next=move(b,run,'cloud',[1,1],route.id);await render({board:b,run:next,selected:'heater'});
    expect(find('[data-last-move]').dataset.lastMove).toBe(route.path.join(','));expect(find('[data-party-pawn]').dataset.partyRoute).toBe(route.path.join(','));
    await click('[data-tabletop-camera="right"]');expect(find('[data-party-pawn]').dataset.partyRoute).toBe(route.path.join(','));
    await act(async()=>root.unmount());root=null;element.remove();element=null;await render({board:b,run:JSON.parse(JSON.stringify(next)),selected:'heater'});
    expect(find('[data-last-move]').dataset.lastMove).toBe(route.path.join(','));expect(find('[data-party-pawn]').dataset.partyRoute).toBe(route.path.join(','));
  });

  it('shows only the current hypothetical bridge or shortest path in every projected view without actual travel or animation',async()=>{
    const b=bridgeBoard(),base=readyRun(b),before=JSON.stringify({b,base}),onSelect=vi.fn();
    for(const route of ['bridge:bridge','shortest']){
      const frame=simulatePlan(b,base,[{id:'cloud',route}]),path=frame.steps[0].path,projectionTurn=frame.run.turn-Number(engine.stepOf(frame.run).phase==='choose');
      expect(path).toEqual(route==='shortest'?['heater','cloud']:['heater','sequence','rain','cloud']);
      for(const view of ['tabletop','board','list']){
        await render({board:b,run:frame.run,progress:frame.progress,projection:true,projectionTurn,view,onSelect});
        expect(find('[data-projected-route-readout]').dataset.projectedRouteReadout).toBe(path.join(','));expect(find('[data-projected-route-readout]').textContent).toContain('Hypothetical move');
        expect(find('[data-last-move]')).toBeNull();expect(find('[data-last-route]')).toBeNull();
        if(view==='list')expect(find('[data-projected-route]')).toBeNull();
        else{
          expect(find('[data-projected-route]').dataset.projectedRoute).toBe(path.join(','));
          expect(all('[data-projected-route-edge]').map(node=>node.dataset.projectedRouteEdge)).toEqual(path.slice(1).map((id,index)=>path[index]+':'+id));
          expect(find('[data-party-pawn]').dataset.partyMoving).toBe('false');expect(find('[data-party-pawn]').dataset.partyRoute).toBe(frame.progress.position);
        }
        const station=find('[data-location="heater"]');station.focus();expect(document.activeElement).toBe(station);await click('[data-location="heater"]');expect(onSelect).toHaveBeenLastCalledWith('heater');
      }
    }
    expect(JSON.stringify({b,base})).toBe(before);
  });

  it('removes hypothetical travel at the starting frame and rejects stale or mismatched frame routes',async()=>{
    const b=bridgeBoard(),base=readyRun(b),frame=simulatePlan(b,base,[{id:'cloud',route:'bridge:bridge'}]),projectionTurn=frame.run.turn-1;
    await render({board:b,run:frame.run,projection:true,projectionTurn});expect(find('[data-projected-route-readout]')).not.toBeNull();
    for(const props of [{run:base},{run:engine.emptyRun(),projectionTurn:0},{run:frame.run,projectionTurn:projectionTurn-1},{run:frame.run,projectionTurn,progress:{...frame.progress,position:'heater'}}]){
      await render({board:b,projection:true,...props});expect(find('[data-projected-route-readout]')).toBeNull();expect(find('[data-projected-route]')).toBeNull();expect(find('[data-last-move]')).toBeNull();expect(find('[data-last-route]')).toBeNull();
    }
  });

  it('does not borrow earlier travel when the current projected move is construction',async()=>{
    const b=bridgeBoard(),base=readyRun(b),frame=simulatePlan(b,base,['research']);expect(frame.steps).toHaveLength(1);expect(frame.steps[0].kind).toBe('build');
    await render({board:b,run:frame.run,projection:true,projectionTurn:frame.run.turn-1,selected:'research'});
    expect(find('[data-projected-route-readout]')).toBeNull();expect(find('[data-projected-route]')).toBeNull();expect(find('[data-last-move]')).toBeNull();expect(find('[data-party-pawn]').dataset.partyMoving).toBe('false');
  });

  it('keeps confirmed travel unchanged when a projection turn is supplied outside a projection',async()=>{
    const b=bridgeBoard(),base=readyRun(b),run=move(b,base,'cloud',[1,1],'bridge:bridge'),path=engine.routeForStep(b,run);
    await render({board:b,run,selected:'cloud',projectionTurn:run.turn});
    expect(find('[data-last-move]').dataset.lastMove).toBe(path.join(','));expect(all('[data-last-route]').map(node=>node.dataset.lastRoute)).toEqual(path.slice(1).map((id,index)=>path[index]+':'+id));
    expect(find('[data-projected-route-readout]')).toBeNull();expect(find('[data-projected-route]')).toBeNull();
  });

  it('describes explored selections as travel without suggesting another answer',async()=>{
    const b=bridgeBoard(),run=readyRun(b);await render({board:b,run});
    const label=find('[data-selection-activity]');expect(label.dataset.selectionActivity).toBe('travel');expect(label.textContent).toContain('without repeating its challenge');expect(label.querySelector('[data-challenge-badge]')).toBeNull();
    await render({board:b,run,selected:'lake'});expect(find('[data-selection-activity]').dataset.selectionActivity).toBe('investigate');
  });

  it('keeps delivery inspection directly available while its verbose timing and milestones are collapsed',async()=>{
    const b={...board(),chance:true};let run=move(b,move(b,engine.emptyRun(),'heater',[1]),'cloud',[1]);run=engine.merge(run,engine.chooseFieldOpportunity(b,run,'delivery:heater'));
    const before=JSON.stringify(run),onSelect=vi.fn(),onOpenEncounter=vi.fn();await render({board:b,run,onSelect,onOpenEncounter});
    expect(find('[data-tabletop-encounters]').dataset.encounterCompact).toBe('true');expect(find('[data-tabletop-commitment-details="delivery"]').open).toBe(false);expect(find('[data-tabletop-encounter-details]').open).toBe(false);
    const inspect=find('[data-inspect-tabletop-delivery]');expect(inspect.closest('details')).toBeNull();inspect.focus();expect(document.activeElement).toBe(inspect);await click('[data-inspect-tabletop-delivery]');expect(onSelect).toHaveBeenCalledWith('heater');
    await click('[data-tabletop-commitment-details="delivery"]>summary');expect(find('[data-tabletop-commitment-details="delivery"]').open).toBe(true);await click('[data-tabletop-encounter-details]>summary');expect(find('[data-tabletop-encounter-details]').open).toBe(true);
    await click('[data-open-tabletop-deck]');expect(onOpenEncounter).toHaveBeenCalledTimes(1);expect(JSON.stringify(run)).toBe(before);
  });

  it('expands the pending encounter while retaining a visible delivery inspection action',async()=>{
    const b={...board(),chance:true};let run=move(b,move(b,engine.emptyRun(),'heater',[1]),'cloud',[1]);run=engine.merge(run,engine.chooseFieldOpportunity(b,run,'delivery:heater'));for(const id of ['rain','sequence','weather'])run=move(b,run,id);
    await render({board:b,run,onSelect:vi.fn()});expect(find('[data-tabletop-encounters]').dataset.encounterCompact).toBe('false');expect(find('[data-tabletop-encounter-details]').open).toBe(true);expect(find('[data-tabletop-commitment-details]')).toBeNull();expect(find('[data-inspect-tabletop-delivery]').closest('details')).toBeNull();
  });

  it('keeps an active destination inspection outside compact explanatory details',async()=>{
    const b={...board(),chance:true};let run=move(b,move(b,engine.emptyRun(),'heater',[1]),'cloud',[1]);run=engine.merge(run,engine.chooseFieldOpportunity(b,run,'lead:cooler'));await render({board:b,run,onSelect:vi.fn()});
    expect(find('[data-tabletop-encounters]').dataset.encounterCompact).toBe('true');expect(find('[data-tabletop-commitment-details="destination"]').open).toBe(false);expect(find('[data-inspect-tabletop-destination]').closest('details')).toBeNull();expect(find('[data-tabletop-destination]').textContent).toContain('after a successful investigation here');
  });
});
