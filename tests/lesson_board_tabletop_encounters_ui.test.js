import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {encounterStory} from '../lesson_board_encounter_labels.js';
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
const pending=(b,die=1)=>move(b,move(b,engine.emptyRun(),'heater'),'cloud',[die]);
const choose=(b,run,value)=>engine.merge(run,engine.chooseFieldOpportunity(b,run,value));
async function render(props={}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  const b=props.board||board(),run=props.run||engine.emptyRun();
  await act(async()=>root.render(React.createElement(UI.BoardMap,{board:b,run,progress:engine.derive(b,run),ready:engine.targets(b,run).map(item=>item.id),selected:b.starts[0],view:'tabletop',Icon:()=>null,t:key=>key,...props})));
}
const click=async selector=>{await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardMap} from './lesson_board_map.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'TabletopEncountersUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return TabletopEncountersUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Opportunities on the tabletop',()=>{
  it('sets a visible discovery cadence without claiming a draw or offering a meaningless action',async()=>{
    const b=board(),run=engine.emptyRun(),before=JSON.stringify({b,run});await render({board:b,run});
    expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('upcoming');
    expect(find('[data-tabletop-encounters]').textContent).toContain('Next opportunity in 2');
    expect([...element.querySelectorAll('[data-encounter-milestone]')].map(node=>node.dataset.encounterMilestone)).toEqual(['2','5','8']);
    expect([...element.querySelectorAll('[data-encounter-milestone]')].every(node=>node.dataset.milestoneState==='upcoming')).toBe(true);
    expect(find('[data-open-tabletop-encounter]')).toBeNull();expect(find('[data-tabletop-encounter-token]')).toBeNull();
    expect(JSON.stringify({b,run})).toBe(before);
  });
  it('opens the saved themed draw from 3D, 2D and list views without choosing, rerolling, or moving',async()=>{
    const b=board(),run=pending(b,7),before=JSON.stringify({b,run}),onOpenEncounter=vi.fn(),onSelect=vi.fn(),random=vi.spyOn(Math,'random');
    for(const view of ['tabletop','board','list']){
      await render({board:b,run,view,onOpenEncounter,onSelect});
      const rail=find('[data-tabletop-encounters]');expect(rail.dataset.encounterState).toBe('pending');
      expect(rail.textContent).toContain(encounterStory(b,'supplies',[7]).title);
      expect(find('[data-encounter-milestone="2"]').dataset.milestoneState).toBe('pending');
      expect(find('[data-open-tabletop-encounter]').textContent).toContain('Open encounter');
      if(view==='list')expect(find('[data-tabletop-encounter-token]')).toBeNull();
      else{expect(find('[data-tabletop-encounter-token]').dataset.tokenPosition).toBe('cloud');expect(find('[data-tabletop-encounter-token]').getAttribute('aria-hidden')).toBe('true');}
      await click('[data-open-tabletop-encounter]');
    }
    expect(onOpenEncounter).toHaveBeenCalledTimes(3);expect(onSelect).not.toHaveBeenCalled();expect(random).not.toHaveBeenCalled();
    expect(JSON.stringify({b,run})).toBe(before);
  });
  it('keeps committed supplies alongside the party after advancing and removes their token only when delivered',async()=>{
    const b=board();let run=choose(b,pending(b),'prepare');run=engine.merge(run,engine.advance(b,run));
    await render({board:b,run,onOpenEncounter:vi.fn()});
    expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('prepared');
    expect(find('[data-tabletop-prepared]').textContent).toContain('+2 Observation tokens');
    expect(find('[data-tabletop-prepared]').textContent).toContain('next successful new investigation');
    expect(find('[data-tabletop-encounter-token]').dataset.encounterState).toBe('prepared');
    expect(find('[data-encounter-milestone="2"]').dataset.milestoneState).toBe('resolved');
    run=move(b,run,'rain');await render({board:b,run,onOpenEncounter:vi.fn()});
    expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('delivered');
    expect(find('[data-tabletop-prepared]')).toBeNull();expect(find('[data-tabletop-encounter-token]')).toBeNull();
    expect(find('[data-open-tabletop-encounter]').textContent).toContain('receipt');
  });
  it('shows a reserved crew through investigations, then shows its actual paid construction receipt',async()=>{
    const b=board();let run=choose(b,pending(b),'crew');run=move(b,run,'rain');
    await render({board:b,run,onOpenEncounter:vi.fn()});
    expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('crew');
    expect(find('[data-tabletop-crew]').textContent).toContain('+1 Observation tokens · +1 Connection tokens');
    expect(find('[data-tabletop-crew]').textContent).toContain('Pay the full cost first');
    expect(find('[data-tabletop-encounter-token]').dataset.tokenPosition).toBe('rain');
    run=move(b,run,'heater');run=move(b,run,'bridge');
    await render({board:b,run,onOpenEncounter:vi.fn()});
    expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('delivered');
    expect(find('[data-tabletop-crew]')).toBeNull();expect(find('[data-tabletop-encounter-token]')).toBeNull();
  });
  it('shows both independent commitments and offers one readable plans action',async()=>{
    const b=board();let run=choose(b,pending(b),'crew');
    for(const id of ['rain','sequence','weather'])run=move(b,run,id);
    run=choose(b,run,'prepare');
    await render({board:b,run,onOpenEncounter:vi.fn()});
    expect(find('[data-tabletop-crew]')).toBeTruthy();expect(find('[data-tabletop-prepared]')).toBeTruthy();
    expect(find('[data-open-tabletop-encounter]').textContent).toContain('Open expedition plans');
    expect(find('[data-encounter-milestone="5"]').dataset.milestoneState).toBe('resolved');
    expect(find('[data-tabletop-encounter-token]').dataset.encounterState).toBe('crew');
  });
  it('keeps receipts inspectable and disables navigation when no callback is provided',async()=>{
    const b=board(),run=choose(b,pending(b),'collect');await render({board:b,run});
    expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('collected');
    expect(find('[data-open-tabletop-encounter]').disabled).toBe(true);
    expect(find('[data-tabletop-encounter-token]')).toBeNull();
  });
  it('never places real chance events or crew promises on projected, chance-free, legacy, or completed maps',async()=>{
    const b=board(),run=choose(b,pending(b),'crew');
    await render({board:b,run,projection:true});expect(find('[data-tabletop-encounters]')).toBeNull();expect(find('[data-tabletop-encounter-token]')).toBeNull();
    await render({board:{...b,chance:undefined},run});expect(find('[data-tabletop-encounters]')).toBeNull();expect(find('[data-tabletop-encounter-token]')).toBeNull();
    await render({board:makeBoard()});expect(find('[data-tabletop-encounters]')).toBeNull();
    await render({board:b,run,progress:{...engine.derive(b,run),complete:true}});expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('complete');
    expect(find('[data-tabletop-crew]')).toBeNull();expect(find('[data-open-tabletop-encounter]')).toBeNull();expect(find('[data-tabletop-encounter-token]')).toBeNull();
  });
  it('uses theme-specific static miniatures without changing the opportunity or camera state',async()=>{
    const onOpenEncounter=vi.fn();
    for(const theme of ['river','garden','workshop','archive','space']){
      const b={...board(),theme},run=pending(b,16);await render({board:b,run,onOpenEncounter});
      expect(find('[data-tabletop-encounters] [data-encounter-emblem]').dataset.emblemTheme).toBe(theme);
      expect(find('[data-tabletop-encounters] [data-encounter-emblem]').dataset.encounterEmblem).toBe('rendezvous');
      const before=JSON.stringify(run);await click('[data-tabletop-camera="right"]');await click('[data-open-tabletop-encounter]');
      expect(find('[data-spatial-board]').dataset.camera).toBe('right');expect(JSON.stringify(run)).toBe(before);
    }
  });
});
