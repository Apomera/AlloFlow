import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
// Tabletop spaces keep a short name; their details are the accessible description.
const spoken=node=>[node?.getAttribute('aria-label'),...(node?.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent)].filter(Boolean).join('. ');
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
const pending=b=>move(b,move(b,engine.emptyRun(),'heater'),'cloud');
const choose=(b,run,value)=>engine.merge(run,engine.chooseFieldOpportunity(b,run,value));
const active=b=>{const run=pending(b);expect(engine.fieldOpportunity(b,run).leads[0].targetId).toBe('cooler');return choose(b,run,'lead:cooler');};
async function render(props={}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  const b=props.board||board(),run=props.run||engine.emptyRun();
  await act(async()=>root.render(React.createElement(UI.BoardMap,{board:b,run,progress:engine.derive(b,run),ready:engine.targets(b,run).map(item=>item.id),selected:b.starts[0],view:'tabletop',Icon:()=>null,t:key=>key,...props})));
}
const click=async selector=>{await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardMap} from './lesson_board_map.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'DestinationTabletopUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return DestinationTabletopUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Committed destinations on the tabletop',()=>{
  it('places no destination on the board until a lead is explicitly reserved',async()=>{
    const b=board();for(const run of [engine.emptyRun(),pending(b),choose(b,pending(b),'prepare')]){
      await render({board:b,run});
      expect(find('[data-tabletop-destination]')).toBeNull();expect(find('[data-expedition-destination-marker]')).toBeNull();
      expect(find('[data-location][data-expedition-destination="true"]')).toBeNull();
    }
    await render({board:b,selected:undefined});expect(find('[data-destination-detail]')).toBeNull();
  });

  it('shows the saved target and reward in 3D, 2D and list views and only inspects on activation',async()=>{
    const b=board(),run=active(b),before=JSON.stringify({b,run}),onSelect=vi.fn(),onOpenEncounter=vi.fn(),random=vi.spyOn(Math,'random');
    for(const view of ['tabletop','board','list']){
      await render({board:b,run,view,onSelect,onOpenEncounter,selected:'cooler'});
      expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('lead');
      const rail=find('[data-tabletop-destination="cooler"]');
      expect(rail.textContent).toContain('Cooling station');expect(rail.textContent).toContain('+2 Observation tokens · +1 Connection tokens');
      expect(rail.textContent).toContain('after a successful investigation here');
      expect(find('[data-location="cooler"]').dataset.expeditionDestination).toBe('true');
      expect(find('[data-destination-detail="cooler"]').textContent).toContain('Reward after a successful investigation');
      if(view==='list'){
        expect(find('[data-expedition-destination-marker]')).toBeNull();
        expect(find('[data-destination-list="cooler"]').textContent).toContain('Expedition destination · +2 Observation tokens');
      }else{
        expect(find('[data-expedition-destination-marker="cooler"]').getAttribute('aria-hidden')).toBe('true');
        expect(spoken(find('[data-location="cooler"]'))).toContain('Expedition destination. Reward after a successful investigation');
      }
      await click('[data-inspect-tabletop-destination="cooler"]');
    }
    expect(onSelect).toHaveBeenCalledTimes(3);expect(onSelect).toHaveBeenLastCalledWith('cooler');expect(onOpenEncounter).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();expect(JSON.stringify({b,run})).toBe(before);
  });

  it('keeps the actual destination through unrelated investigations, travel and camera changes',async()=>{
    const b=board();let run=active(b);run=move(b,run,'rain');run=move(b,run,'heater');
    const before=JSON.stringify(run);await render({board:b,run,onSelect:vi.fn()});
    expect(find('[data-party-position]').dataset.partyPosition).toBe('heater');
    for(const camera of ['left','right','overhead','angle']){
      await click('[data-tabletop-camera="'+camera+'"]');
      expect(find('[data-expedition-destination-marker="cooler"]')).toBeTruthy();
      expect(find('[data-spatial-board]').dataset.camera).toBe(camera);
    }
    expect(JSON.stringify(run)).toBe(before);
  });

  it('removes the objective marker only after the target investigation actually delivers its reward',async()=>{
    const b=board();let run=active(b);for(const id of ['heater','river','lake'])run=move(b,run,id);
    await render({board:b,run});expect(find('[data-expedition-destination-marker="cooler"]')).toBeTruthy();
    run=move(b,run,'cooler');expect(engine.derive(b,run).fieldDeliveries).toContainEqual(expect.objectContaining({kind:'destination',targetId:'cooler',gain:[2,1]}));
    await render({board:b,run,selected:'cooler'});
    expect(find('[data-tabletop-destination]')).toBeNull();expect(find('[data-expedition-destination-marker]')).toBeNull();expect(find('[data-destination-detail]')).toBeNull();
    expect(find('[data-location="cooler"]').dataset.expeditionDestination).toBe('false');
    let near=choose(b,pending(b),'lead:river');near=move(b,near,'heater');near=move(b,near,'river');
    await render({board:b,run:near,onOpenEncounter:vi.fn()});
    expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('delivered');
    expect(find('[data-tabletop-encounters]').textContent).toContain('Destination investigated');
    expect(find('[data-tabletop-encounters]').textContent).toContain('Your investigation at River station earned the marked reward');
  });

  it('retains a destination beside a new encounter and independent crew or supply commitments',async()=>{
    const b=board();let run=active(b);for(const id of ['rain','sequence','weather'])run=move(b,run,id);
    await render({board:b,run});expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('pending');
    expect(find('[data-tabletop-destination="cooler"]')).toBeTruthy();expect(find('[data-tabletop-encounter-token]').dataset.encounterState).toBe('pending');
    for(const [choice,token,reminder] of [['crew','crew','[data-tabletop-crew]'],['prepare','prepared','[data-tabletop-prepared]']]){
      const committed=choose(b,run,choice);await render({board:b,run:committed,onOpenEncounter:vi.fn()});
      expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('lead');
      expect(find('[data-tabletop-destination="cooler"]')).toBeTruthy();expect(find(reminder)).toBeTruthy();
      expect(find('[data-tabletop-encounter-token]').dataset.encounterState).toBe(token);
      expect(find('[data-open-tabletop-encounter]').textContent).toContain('Open expedition plans');
    }
  });

  it('omits real destination promises from projections, chance-free boards and completed expeditions',async()=>{
    const b=board(),run=active(b);
    for(const props of [{projection:true},{board:{...b,chance:false}},{progress:{...engine.derive(b,run),complete:true}}]){
      await render({board:b,run,selected:'cooler',...props});
      expect(find('[data-tabletop-destination]')).toBeNull();expect(find('[data-expedition-destination-marker]')).toBeNull();
      expect(find('[data-destination-detail]')).toBeNull();expect(find('[data-location][data-expedition-destination="true"]')).toBeNull();
    }
  });

  it('uses a theme-specific static pennant and disables unavailable inspection',async()=>{
    const glyphs=new Set();
    for(const theme of ['river','garden','workshop','archive','space']){
      const b={...board(),theme},run=active(b);await render({board:b,run});
      const marker=find('[data-expedition-destination-marker="cooler"]');
      expect(marker.dataset.destinationTheme).toBe(theme);expect(marker.querySelectorAll('button,[tabindex]').length).toBe(0);
      glyphs.add(marker.querySelector('.lb-destination-pennant').innerHTML);
      expect(find('[data-inspect-tabletop-destination]').disabled).toBe(true);
    }
    expect(glyphs.size).toBe(5);
  });
});
