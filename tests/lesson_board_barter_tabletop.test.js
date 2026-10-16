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
const pending=(b,die=7)=>move(b,move(b,engine.emptyRun(),'heater'),'cloud',[die]);
const choose=(b,run,value)=>engine.merge(run,engine.chooseFieldOpportunity(b,run,value));
async function render(props={}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  const b=props.board||board(),run=props.run||engine.emptyRun();
  await act(async()=>root.render(React.createElement(UI.BoardMap,{board:b,run,progress:engine.derive(b,run),ready:engine.targets(b,run).map(item=>item.id),selected:b.starts[0],view:'tabletop',Icon:()=>null,t:key=>key,...props})));
}
const click=async selector=>{await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardMap} from './lesson_board_map.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'BarterTabletopUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return BarterTabletopUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Tactile encounter deck and tabletop barter',()=>{
  it('opens the saved encounter from a named native deck button in all map views without changing the game',async()=>{
    const b=board(),run=pending(b),before=JSON.stringify({b,run}),onOpenEncounter=vi.fn(),onSelect=vi.fn();
    await render({board:b});const random=vi.spyOn(Math,'random');
    for(const view of ['tabletop','board','list']){
      await render({board:b,run,view,onOpenEncounter,onSelect});
      const deck=find('[data-open-tabletop-deck]');
      expect(deck.tagName).toBe('BUTTON');expect(deck.type).toBe('button');expect(deck.getAttribute('aria-hidden')).toBeNull();
      expect(deck.getAttribute('aria-label')).toContain('Open encounter:');expect(deck.getAttribute('aria-label')).toContain(find('[data-tabletop-encounters] h4').textContent);
      expect(deck.querySelector('.lb-event-deck-face').getAttribute('aria-hidden')).toBe('true');expect(deck.querySelectorAll('button,input,[tabindex]').length).toBe(0);
      deck.focus();expect(document.activeElement).toBe(deck);await click('[data-open-tabletop-deck]');
      expect(find('[data-tabletop-trade="offer"]').textContent).toContain('Trade 1 resource for 2 of the other');
    }
    expect(onOpenEncounter).toHaveBeenCalledTimes(3);expect(onSelect).not.toHaveBeenCalled();expect(random).not.toHaveBeenCalled();expect(JSON.stringify({b,run})).toBe(before);
  });

  it('offers barter only on supplies and rendezvous encounters and preserves their existing physical emblem',async()=>{
    const b=board();
    for(const [die,kind,eligible] of [[1,'survey',false],[7,'supplies',true],[11,'passage',false],[16,'rendezvous',true]]){
      await render({board:b,run:pending(b,die),onOpenEncounter:vi.fn()});
      expect(!!find('[data-tabletop-trade="offer"]')).toBe(eligible);
      expect(find('[data-open-tabletop-deck] [data-encounter-emblem]').dataset.encounterEmblem).toBe(kind);
    }
  });

  it('shows the actual exchange as a receipt without advertising a second trade',async()=>{
    const b=board(),offered=pending(b),offer=engine.fieldOpportunity(b,offered),trade=offer.trades.find(item=>item.legal);
    expect(trade).toBeTruthy();const run=choose(b,offered,trade.id),before=JSON.stringify(run),onOpenEncounter=vi.fn();await render({board:b,run,onOpenEncounter});
    const receipt=find('[data-tabletop-trade="receipt"]');expect(receipt).toBeTruthy();
    expect(receipt.textContent).toContain('Gave 1 '+b.resources[trade.give]);expect(receipt.textContent).toContain('Received 2 '+b.resources[trade.take]);
    expect(find('[data-tabletop-trade="offer"]')).toBeNull();expect(find('[data-tabletop-encounter-token]')).toBeNull();
    expect(find('[data-open-tabletop-deck]').getAttribute('aria-label')).toContain('Review opportunity receipt');
    await click('[data-open-tabletop-deck]');expect(onOpenEncounter).toHaveBeenCalledTimes(1);expect(JSON.stringify(run)).toBe(before);
    await render({board:b,run:engine.merge(run,engine.advance(b,run)),onOpenEncounter});expect(find('[data-tabletop-trade]')).toBeNull();
  });

  it('keeps unavailable navigation readable and disabled for both pending choices and receipts',async()=>{
    const b=board(),offered=pending(b),trade=engine.fieldOpportunity(b,offered).trades.find(item=>item.legal);
    for(const run of [offered,choose(b,offered,trade.id),choose(b,pending(b,1),'prepare')]){
      const before=JSON.stringify(run);await render({board:b,run});
      expect(find('[data-open-tabletop-deck]').disabled).toBe(true);expect(find('[data-open-tabletop-encounter]').disabled).toBe(true);
      expect(find('[data-open-tabletop-deck]').getAttribute('aria-label')).toBeTruthy();await click('[data-open-tabletop-deck]');expect(JSON.stringify(run)).toBe(before);
    }
  });

  it('uses a decorative deck before any encounter and after completion, and hides it on projections and chance-free boards',async()=>{
    const b=board(),onOpenEncounter=vi.fn();await render({board:b,onOpenEncounter});
    expect(find('.lb-event-deck').tagName).toBe('DIV');expect(find('.lb-event-deck').getAttribute('aria-hidden')).toBe('true');expect(find('[data-open-tabletop-deck]')).toBeNull();
    const run=pending(b);await render({board:b,run,progress:{...engine.derive(b,run),complete:true},onOpenEncounter});
    expect(find('[data-open-tabletop-deck]')).toBeNull();expect(find('[data-tabletop-trade]')).toBeNull();expect(find('.lb-event-deck').getAttribute('aria-hidden')).toBe('true');
    await render({board:b,run,projection:true,onOpenEncounter});expect(find('[data-tabletop-encounters]')).toBeNull();
    await render({board:{...b,chance:false},run,onOpenEncounter});expect(find('[data-tabletop-encounters]')).toBeNull();
    expect(onOpenEncounter).not.toHaveBeenCalled();
  });

  it('keeps saved destination and crew commitments beside a new exchange and its receipt',async()=>{
    for(const [choice,marker] of [['lead:cooler','[data-tabletop-destination="cooler"]'],['crew','[data-tabletop-crew]']]){
      const b=board();let run=choose(b,pending(b,1),choice);for(const id of ['rain','sequence','weather'])run=move(b,run,id,[7,7]);
      await render({board:b,run,onOpenEncounter:vi.fn()});expect(find(marker)).toBeTruthy();expect(find('[data-tabletop-trade="offer"]')).toBeTruthy();
      const trade=engine.fieldOpportunity(b,run).trades.find(item=>item.legal);expect(trade).toBeTruthy();run=choose(b,run,trade.id);
      await render({board:b,run,onOpenEncounter:vi.fn()});expect(find(marker)).toBeTruthy();expect(find('[data-tabletop-trade="receipt"]')).toBeTruthy();
      if(choice==='crew')expect(find('[data-tabletop-encounter-token]').dataset.encounterState).toBe('crew');
      else expect(find('[data-expedition-destination-marker="cooler"]')).toBeTruthy();
    }
  });

  it('keeps each themed exchange static through camera rotation and encounter inspection',async()=>{
    const titles=[];
    for(const theme of ['river','garden','workshop','archive','space']){
      const b={...board(),theme},run=pending(b,16),onOpenEncounter=vi.fn(),before=JSON.stringify(run);await render({board:b,run,onOpenEncounter});
      const offer=find('[data-tabletop-trade="offer"]');titles.push(offer.querySelector('strong').textContent);
      expect(offer.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
      expect(find('[data-open-tabletop-deck] [data-encounter-emblem]').dataset.emblemTheme).toBe(theme);
      await click('[data-tabletop-camera="right"]');await click('[data-open-tabletop-deck]');
      expect(find('[data-spatial-board]').dataset.camera).toBe('right');expect(JSON.stringify(run)).toBe(before);expect(onOpenEncounter).toHaveBeenCalledTimes(1);
    }
    expect(new Set(titles).size).toBe(5);
  });
});
