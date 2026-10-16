import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
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
const pending=(b,die=1)=>move(b,move(b,engine.emptyRun(),'heater',[1]),'cloud',[die]);
const choose=(b,run,value)=>engine.merge(run,engine.chooseFieldOpportunity(b,run,value));
const active=(b,die=1)=>choose(b,pending(b,die),'delivery:heater');
async function render(props={}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  const b=props.board||board(),run=props.run||engine.emptyRun();
  await act(async()=>root.render(React.createElement(UI.BoardMap,{board:b,run,progress:engine.derive(b,run),ready:engine.targets(b,run).map(item=>item.id),selected:b.starts[0],view:'tabletop',Icon:()=>null,t:key=>key,...props})));
}
const click=async selector=>{await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardMap} from './lesson_board_map.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'DeliveryTabletopUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return DeliveryTabletopUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('One-time deliveries on the tabletop',()=>{
  it('does not mark a delivery before committing or for another encounter benefit',async()=>{
    const b=board();for(const run of [engine.emptyRun(),pending(b),choose(b,pending(b),'prepare')]){
      await render({board:b,run});expect(find('[data-tabletop-delivery]')).toBeNull();expect(find('[data-tabletop-delivery-marker]')).toBeNull();expect(find('[data-location][data-delivery-station="true"]')).toBeNull();
    }
  });

  it('shows the actual station and reward in all views, with inspection that never moves or delivers',async()=>{
    const b=board(),run=active(b),before=JSON.stringify({b,run}),onSelect=vi.fn(),onOpenEncounter=vi.fn();
    await render({board:b});const random=vi.spyOn(Math,'random');
    for(const view of ['tabletop','board','list']){
      await render({board:b,run,view,onSelect,onOpenEncounter,selected:'heater'});
      expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('delivery');
      const rail=find('[data-tabletop-delivery="heater"]');expect(rail.textContent).toContain('Heating station');expect(rail.textContent).toContain('+3 Observation tokens');expect(rail.textContent).toContain('later travel move ends here');
      expect(find('[data-location="heater"]').dataset.deliveryStation).toBe('true');expect(find('[data-delivery-detail="heater"]').textContent).toContain('Passing through does not deliver');
      expect(find('[data-spatial-selection]').textContent).toContain('does not award its base supplies again');
      if(view==='list'){expect(find('[data-tabletop-delivery-marker]')).toBeNull();expect(find('[data-delivery-list="heater"]').textContent).toContain('Delivery station');}
      else{expect(find('[data-tabletop-delivery-marker="heater"]').getAttribute('aria-hidden')).toBe('true');expect(find('[data-location="heater"]').getAttribute('aria-label')).toContain('One-time reward after a later travel move ends here');}
      await click('[data-inspect-tabletop-delivery="heater"]');await click('[data-open-tabletop-deck]');
    }
    expect(onSelect).toHaveBeenCalledTimes(3);expect(onSelect).toHaveBeenLastCalledWith('heater');expect(onOpenEncounter).toHaveBeenCalledTimes(3);expect(random).not.toHaveBeenCalled();expect(JSON.stringify({b,run})).toBe(before);
  });

  it('keeps cargo after passing through its station and removes the marker only on an actual later delivery',async()=>{
    const b=board();let run=active(b,11);run=move(b,run,'river');
    await render({board:b,run,selected:'heater'});expect(find('[data-tabletop-delivery-marker="heater"]')).toBeTruthy();expect(find('[data-tabletop-delivery]').textContent).toContain('+3 Connection tokens');
    run=move(b,run,'heater');await render({board:b,run,selected:'heater',onOpenEncounter:vi.fn()});
    expect(engine.derive(b,run).fieldDeliveries).toContainEqual(expect.objectContaining({kind:'delivery',targetId:'heater',gain:[0,3]}));
    expect(find('[data-tabletop-delivery-marker]')).toBeNull();expect(find('[data-tabletop-delivery]')).toBeNull();expect(find('[data-delivery-detail]')).toBeNull();
    expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('delivered');expect(find('[data-tabletop-encounters]').textContent).toContain('Dispatch delivered');expect(find('[data-tabletop-encounters]').textContent).toContain('one-time supplies are now in your balance');
  });

  it('retains a delivery with a later opportunity and separate crew or unexplored destination commitment',async()=>{
    const b=board();let run=active(b);for(const id of ['rain','sequence','weather'])run=move(b,run,id);
    await render({board:b,run});expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('pending');expect(find('[data-tabletop-delivery="heater"]')).toBeTruthy();
    const crew=choose(b,run,'crew');await render({board:b,run:crew,onOpenEncounter:vi.fn()});expect(find('[data-tabletop-crew]')).toBeTruthy();expect(find('[data-open-tabletop-encounter]').textContent).toContain('Open expedition plans');
    const target=engine.fieldOpportunity(b,run).leads[0].targetId,lead=choose(b,run,'lead:'+target);await render({board:b,run:lead});
    expect(find('[data-tabletop-delivery-marker="heater"]')).toBeTruthy();expect(find('[data-expedition-destination-marker="'+target+'"]')).toBeTruthy();
  });

  it('shows a legal next waypoint when a saved delivery moves beyond tactical range',async()=>{
    const b={...board(),travelLimit:3};let run=active(b);for(const id of ['rain','sequence','weather'])run=move(b,run,id);
    const onSelect=vi.fn(),before=JSON.stringify(run);await render({board:b,run,onSelect,selected:'heater'});
    expect(find('[data-delivery-route="heater"]').textContent).toContain('travel to Cloud laboratory first');expect(find('[data-delivery-next-stop="cloud"]')).toBeTruthy();
    await click('[data-delivery-next-stop="cloud"]');expect(onSelect).toHaveBeenCalledWith('cloud');expect(JSON.stringify(run)).toBe(before);
  });

  it('warns when the next delivery at home will finish the expedition',async()=>{
    const b=board(),run=active(b),progress={...engine.derive(b,run),requirementsMet:true,objectiveReady:true,usedProjects:['research']};
    await render({board:b,run,progress,selected:'heater'});expect(find('[data-delivery-finishes]').textContent).toContain('will also finish the expedition');
  });

  it('omits real delivery promises from projections, chance-free boards and completed expeditions',async()=>{
    const b=board(),run=active(b);
    for(const props of [{projection:true},{board:{...b,chance:false}},{progress:{...engine.derive(b,run),complete:true}}]){
      await render({board:b,run,selected:'heater',...props});expect(find('[data-tabletop-delivery]')).toBeNull();expect(find('[data-tabletop-delivery-marker]')).toBeNull();expect(find('[data-delivery-detail]')).toBeNull();expect(find('[data-location][data-delivery-station="true"]')).toBeNull();
    }
  });

  it('uses distinct static thematic cargo and field notes without new controls on the target tile',async()=>{
    const glyphs=new Set(),titles=new Set();
    for(const theme of ['river','garden','workshop','archive','space']){
      const b={...board(),theme},run=active(b),before=JSON.stringify(run);await render({board:b,run});
      const marker=find('[data-tabletop-delivery-marker="heater"]');expect(marker.querySelectorAll('button,input,[tabindex]').length).toBe(0);expect(marker.querySelector('svg').dataset.deliveryKind).toBe('survey');glyphs.add(marker.querySelector('svg').innerHTML);titles.add(find('[data-tabletop-delivery] strong').textContent);
      expect(find('[data-inspect-tabletop-delivery]').disabled).toBe(true);for(const camera of ['left','right','overhead','angle'])await click('[data-tabletop-camera="'+camera+'"]');expect(JSON.stringify(run)).toBe(before);
    }
    expect(glyphs.size).toBe(5);expect(titles.size).toBe(5);
    const b=board();await render({board:b,run:active(b,11)});expect(find('[data-tabletop-delivery-marker] svg').dataset.deliveryKind).toBe('passage');
  });
});
