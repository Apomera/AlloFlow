import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;
const find=selector=>element.querySelector(selector),all=selector=>[...element.querySelectorAll(selector)];
const next=(board,run)=>engine.merge(run,engine.advance(board,run));
function move(board,run,id,dice=[1,1],correct=true){
  if(engine.stepOf(run).phase==='review')run=next(board,run);
  run=engine.merge(run,engine.begin(board,run,id));
  if(engine.stepOf(run).phase!=='answer')return run;
  const node=board.locations.find(item=>item.id===id),value=correct?engine.solution(node):String((node.answer+1)%node.options.length);
  run=engine.merge(run,engine.processAction(board,run,{attemptId:'venture-map',turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value},'solo',{attemptId:'venture-map',active:true}));
  return engine.merge(run,engine.resolve(board,run,{solo:{}},{dice}));
}
function fixture(resource=0){
  const board={...makeBoard(),playStyle:'tabletop',chance:true,goal:'expedition'};
  board.edges=board.locations.slice(1).map((node,index)=>[board.locations[index].id,node.id]);
  let run=move(board,move(board,engine.emptyRun(),'heater'),'cloud');
  run=engine.merge(run,engine.chooseFieldOpportunity(board,run,'venture:'+resource));
  return {board,run:next(board,run)};
}
async function render({board,run,...props}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  await act(async()=>root.render(React.createElement(UI.BoardMap,{board,run,progress:engine.derive(board,run),ready:engine.targets(board,run).map(item=>item.id),selected:'river',view:'tabletop',Icon:()=>null,t:key=>key,...props})));
}
const click=async selector=>{expect(find(selector)).toBeTruthy();await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardMap} from './lesson_board_map.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'VentureMapUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return VentureMapUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('A reserved discovery venture on the tabletop',()=>{
  it('communicates exact future odds without showing a roll, adding a tile reward, or committing inspection',async()=>{
    const {board,run}=fixture(),saved=JSON.stringify({board,run}),onSelect=vi.fn();
    await render({board,run,onSelect});
    const rail=find('[data-tabletop-encounters]'),summary=find('[data-tabletop-venture]');
    expect(rail.dataset.encounterState).toBe('venture');expect(rail.dataset.encounterCompact).toBe('true');
    expect(all('[data-tabletop-encounters] [data-venture-miniature]')).toHaveLength(1);
    expect(summary.textContent).toContain('next successful new investigation');
    expect(find('[data-venture-odds]').textContent).toContain('50% chance');
    expect(find('[data-venture-odds]').textContent).toContain('First d20 only');
    expect(find('[data-venture-payout-range=empty]').textContent).toContain('1–10No venture bonus');
    expect(find('[data-venture-payout-range=found]').textContent).toContain('11–20+4 Observation tokens');
    expect(all('[data-venture-face]')).toHaveLength(20);expect(all('[data-venture-face-pays=true]')).toHaveLength(10);
    expect(find('[data-venture-chance-track]').getAttribute('aria-hidden')).toBe('true');
    expect(find('[data-location=river]').getAttribute('aria-label')).not.toContain('4 Observation');
    const details=find('[data-tabletop-commitment-details=venture]');expect(details.open).toBe(false);
    await click('[data-tabletop-commitment-details=venture] summary');expect(details.open).toBe(true);
    expect(details.textContent).toContain('momentum die does not change');expect(details.textContent).toContain('Ordinary investigation rewards are safe');
    await click('[data-inspect-tabletop-venture]');expect(onSelect).toHaveBeenCalledExactlyOnceWith('river');
    expect(find('[data-party-position]').dataset.partyPosition).toBe('cloud');expect(JSON.stringify({board,run})).toBe(saved);
  });

  it('inspects only an available new investigation and explains when travel is needed',async()=>{
    const {board,run}=fixture(1),onSelect=vi.fn();
    await render({board,run,selected:'heater',onSelect});
    expect(find('[data-inspect-tabletop-venture]').dataset.inspectTabletopVenture).toBe('river');
    expect(find('[data-venture-payout-range=found]').textContent).toContain('+4 Connection tokens');
    await click('[data-inspect-tabletop-venture]');expect(onSelect).toHaveBeenCalledExactlyOnceWith('river');
    const progress={...engine.derive(board,run),position:'heater',visited:board.locations.filter(item=>item.id!=='weather').map(item=>item.id)};
    await render({board:{...board,travelLimit:3},run,progress,onSelect});
    expect(find('[data-inspect-tabletop-venture]')).toBeNull();expect(find('[data-venture-needs-route]').textContent).toContain('venture waits while you travel');
    await render({board,run});expect(find('[data-inspect-tabletop-venture]').disabled).toBe(true);
  });

  it('preserves the sealed venture through travel, building, and a failed investigation',async()=>{
    const {board,run}=fixture(1),original=engine.derive(board,run).fieldVenture;
    let current=move(board,run,'heater');await render({board,run:current});expect(find('[data-tabletop-venture]')).toBeTruthy();
    current=move(board,current,'research');await render({board,run:current});expect(find('[data-tabletop-venture]')).toBeTruthy();
    current=move(board,current,'river',[20,20],false);await render({board,run:current});
    expect(engine.derive(board,current).fieldVenture).toEqual(original);expect(find('[data-venture-odds]').textContent).toContain('50% chance');
    expect(find('[data-tabletop-encounters] h4').textContent).not.toContain('found');
  });

  it.each([[11,1,'found','Venture discovery found'],[10,20,'empty','Venture resolved · no extra cache']])('shows only the actual first-die outcome for %s and momentum %s',async(first,second,outcome,heading)=>{
    const {board,run}=fixture(),resolved=move(board,run,'river',[first,second]);
    expect(engine.derive(board,resolved).fieldDeliveries.at(-1).outcome).toBe(outcome);
    await render({board,run:resolved});
    expect(find('[data-tabletop-venture]')).toBeNull();expect(find('[data-venture-odds]')).toBeNull();
    expect(find('[data-tabletop-encounters] h4').textContent).toBe(heading);
    if(outcome==='empty')expect(find('[data-tabletop-encounters]').textContent).not.toContain('Your preparation paid off');
    await render({board,run:next(board,resolved)});expect(find('[data-tabletop-encounters] h4').textContent).not.toBe(heading);
  });

  it('does not invent a bonus for an old receipt without a valid saved first die',async()=>{
    const {board,run}=fixture(),resolved=move(board,run,'river',[11,1]);
    delete resolved.steps['t'+resolved.turn].result.dice;
    await render({board,run:resolved});
    expect(find('[data-tabletop-encounters] h4').textContent).toBe('Venture resolved · die unavailable');
    expect(find('[data-tabletop-encounters]').textContent).toContain('no bonus was awarded');
    expect(find('[data-tabletop-venture]')).toBeNull();
  });

  it('keeps equivalent odds in tabletop, 2D and list views while projections expose no live commitment',async()=>{
    const {board,run}=fixture(),saved=JSON.stringify(run),onSelect=vi.fn();
    for(const view of ['tabletop','board','list']){
      await render({board,run,onSelect,view});expect(find('[data-venture-odds]').textContent).toContain('50% chance');
      await click('[data-inspect-tabletop-venture]');
      expect(all('[data-location]').some(node=>node.hasAttribute('data-venture-target'))).toBe(false);
    }
    expect(onSelect).toHaveBeenCalledTimes(3);expect(JSON.stringify(run)).toBe(saved);
    await render({board,run,onSelect,projection:true});expect(find('[data-tabletop-venture]')).toBeNull();expect(find('[data-inspect-tabletop-venture]')).toBeNull();expect(find('[data-venture-miniature]')).toBeNull();
    await render({board:{...board,chance:false},run,progress:engine.derive(board,run)});expect(find('[data-tabletop-venture]')).toBeNull();
    await render({board,run,progress:{...engine.derive(board,run),complete:true}});expect(find('[data-tabletop-venture]')).toBeNull();
  });

  it('uses the current theme miniature without repeating the heading or adding map ornaments',async()=>{
    const {board,run}=fixture();
    for(const theme of ['river','garden','archive','workshop','space']){
      await render({board:{...board,theme},run});
      expect(find('[data-tabletop-encounters] [data-venture-miniature]').dataset.ventureMiniature).toBe(theme);
      expect(find('[data-tabletop-venture] .lb-event-venture-heading')).toBeNull();
      expect(find('[data-board-map] [data-venture-miniature]')).toBeNull();
      expect(all('[data-venture-odds]')).toHaveLength(1);
    }
  });
});
