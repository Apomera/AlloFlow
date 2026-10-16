import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {buildSite} from '../lesson_board_spatial.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;
const board=()=>({...makeBoard(),playStyle:'tabletop',chance:true,goal:'expedition'}),find=selector=>element.querySelector(selector);
function move(b,run,id,dice=[1,1]){
  if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(b,run));
  run=engine.merge(run,engine.begin(b,run,id));
  if(engine.stepOf(run).phase==='answer'){
    const target=b.locations.find(item=>item.id===id);
    run=engine.merge(run,engine.processAction(b,run,{attemptId:'a',requestId:engine.requestId(run),turn:run.turn,kind:'answer',targetId:id,value:engine.solution(target)},'solo',{attemptId:'a',active:true}));
    run=engine.merge(run,engine.resolve(b,run,{solo:{}},{dice}));
  }
  return run;
}
const pending=b=>move(b,move(b,engine.emptyRun(),'heater'),'cloud',[7]);
const choose=(b,run,choice)=>engine.merge(run,engine.chooseFieldOpportunity(b,run,choice));
const active=b=>choose(b,pending(b),'commission:bridge');
function build(b,run,id){const site=buildSite(b,id);return move(b,engine.derive(b,run).position===site?run:move(b,run,site),id);}
async function render(props={}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  const b=props.board||board(),run=props.run||engine.emptyRun();
  await act(async()=>root.render(React.createElement(UI.BoardMap,{board:b,run,progress:engine.derive(b,run),ready:engine.targets(b,run).map(item=>item.id),selected:'bridge',view:'tabletop',Icon:()=>null,t:key=>key,...props})));
}
const click=async selector=>{await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardMap} from './lesson_board_map.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'CommissionTabletopUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return CommissionTabletopUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Commissioned construction on the tabletop',()=>{
  it('does not turn an offer, inspected project, or another chosen benefit into an assignment',async()=>{
    const b=board();
    for(const run of [engine.emptyRun(),pending(b),choose(b,pending(b),'collect'),choose(b,pending(b),'crew')]){
      await render({board:b,run});
      expect(find('[data-commission-marker]')).toBeNull();expect(find('[data-tabletop-commission]')).toBeNull();expect(find('[data-commission-detail]')).toBeNull();
      expect(find('[data-map-construction][data-commission-project="true"]')).toBeNull();
    }
  });

  it('shows the exact reserved project and payment timing in 3D, 2D and list views without moving or paying',async()=>{
    const b=board(),run=active(b),before=JSON.stringify({b,run}),onSelect=vi.fn(),onOpenEncounter=vi.fn();
    await render({board:b});const random=vi.spyOn(Math,'random');
    for(const view of ['tabletop','board','list']){
      await render({board:b,run,view,onSelect,onOpenEncounter});
      expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('commission');
      const rail=find('[data-tabletop-commission="bridge"]');expect(rail.textContent).toContain('Observation bridge');expect(rail.textContent).toContain('+3 Observation tokens · +1 Connection tokens');expect(rail.textContent).toContain('Pay its full cost first');
      expect(find('[data-map-construction="bridge"]').dataset.commissionProject).toBe('true');expect(find('[data-map-construction="research"]').dataset.commissionProject).toBe('false');
      expect(find('[data-commission-detail="bridge"]').textContent).toContain('reserved reward cannot fund the payment');
      if(view==='list'){expect(find('[data-commission-marker]')).toBeNull();expect(find('[data-commission-list="bridge"]').textContent).toContain('Receive +3');}
      else{expect(find('[data-commission-marker="bridge"]').getAttribute('aria-hidden')).toBe('true');expect(find('[data-map-construction="bridge"]').getAttribute('aria-label')).toContain('Commissioned project. Receive +3');expect(find('[data-commission-readout="bridge"]').textContent).toBe('Commissioned project');}
      await click('[data-inspect-tabletop-commission="bridge"]');await click('[data-open-tabletop-deck]');
    }
    expect(onSelect).toHaveBeenCalledTimes(3);expect(onSelect).toHaveBeenLastCalledWith('bridge');expect(onOpenEncounter).toHaveBeenCalledTimes(3);expect(random).not.toHaveBeenCalled();expect(JSON.stringify({b,run})).toBe(before);
  });

  it('keeps the saved assignment after advancing and reloading until its specific project is constructed',async()=>{
    const b=board();let run=active(b);run=engine.merge(run,engine.advance(b,run));run=JSON.parse(JSON.stringify(run));
    await render({board:b,run});expect(find('[data-commission-marker="bridge"]')).toBeTruthy();
    run=build(b,run,'research');await render({board:b,run});expect(find('[data-commission-marker="bridge"]')).toBeTruthy();expect(find('[data-tabletop-commission="bridge"]')).toBeTruthy();
    run=move(b,run,'rain');run=build(b,run,'bridge');await render({board:b,run,onOpenEncounter:vi.fn()});
    expect(engine.derive(b,run).fieldDeliveries).toContainEqual(expect.objectContaining({kind:'commission',projectId:'bridge',gain:[3,1]}));
    expect(find('[data-commission-marker]')).toBeNull();expect(find('[data-tabletop-commission]')).toBeNull();expect(find('[data-commission-detail]')).toBeNull();
    expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('delivered');expect(find('[data-tabletop-encounters]').textContent).toContain('Construction assignment completed');expect(find('[data-tabletop-encounters]').textContent).toContain('You built Observation bridge');
  });

  it('keeps a later encounter and crew commitment alongside the named project assignment',async()=>{
    const b=board();let run=active(b);for(const id of ['rain','sequence','weather'])run=move(b,run,id);
    await render({board:b,run});expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('pending');expect(find('[data-commission-marker="bridge"]')).toBeTruthy();
    run=choose(b,run,'crew');await render({board:b,run,onOpenEncounter:vi.fn()});
    expect(find('[data-tabletop-crew]')).toBeTruthy();expect(find('[data-tabletop-commission="bridge"]')).toBeTruthy();expect(find('[data-open-tabletop-encounter]').textContent).toContain('Open expedition plans');
    expect(find('[data-tabletop-encounter-token]').dataset.encounterState).toBe('crew');
  });

  it('never displays real assignments in projections, legacy, chance-free or completed boards',async()=>{
    const b=board(),run=active(b);
    for(const props of [{projection:true},{board:{...b,chance:false}},{board:{...b,playStyle:undefined}},{progress:{...engine.derive(b,run),complete:true}}]){
      await render({board:b,run,...props});expect(find('[data-commission-marker]')).toBeNull();expect(find('[data-tabletop-commission]')).toBeNull();expect(find('[data-commission-detail]')).toBeNull();expect(find('[data-map-construction][data-commission-project="true"]')).toBeNull();
    }
  });

  it('does not retain a project seal when supplied progress already marks that project built',async()=>{
    const b=board(),run=active(b),progress=engine.derive(b,run);
    await render({board:b,run,progress:{...progress,built:[...progress.built,'bridge']}});
    expect(find('[data-commission-marker]')).toBeNull();expect(find('[data-tabletop-commission]')).toBeNull();expect(find('[data-commission-detail]')).toBeNull();
  });

  it('uses themed static drafting miniatures and decorative project seals without adding tile controls',async()=>{
    const glyphs=new Set();
    for(const theme of ['river','garden','workshop','archive','space']){
      const b={...board(),theme},run=active(b),before=JSON.stringify(run);await render({board:b,run});
      const miniature=find('[data-tabletop-commission] [data-commission-miniature]');expect(miniature.dataset.commissionMiniature).toBe(theme);expect(miniature.getAttribute('aria-hidden')).toBe('true');glyphs.add(miniature.innerHTML);
      const marker=find('[data-commission-marker="bridge"]');expect(marker.dataset.commissionTheme).toBe(theme);expect(marker.querySelectorAll('button,input,[tabindex],animate,animateTransform').length).toBe(0);
      expect(find('[data-inspect-tabletop-commission]').disabled).toBe(true);
      for(const camera of ['left','right','overhead','angle'])await click('[data-tabletop-camera="'+camera+'"]');
      expect(JSON.stringify(run)).toBe(before);
    }
    expect(glyphs.size).toBe(5);
  });
});
