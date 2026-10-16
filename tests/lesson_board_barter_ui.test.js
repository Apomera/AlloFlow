import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;
const board=()=>({...makeBoard(),playStyle:'tabletop',chance:true,goal:'expedition'}),find=selector=>element.querySelector(selector);
function pending(b,die=6){
  let run=engine.emptyRun();
  for(const [index,id] of ['heater','cloud'].entries()){
    if(index)run=engine.merge(run,engine.advance(b,run));
    run=engine.merge(run,engine.begin(b,run,id));
    run=engine.merge(run,engine.processAction(b,run,{attemptId:'trade-ui',turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(b.locations.find(item=>item.id===id))},'solo',{attemptId:'trade-ui',active:true}));
    run=engine.merge(run,engine.resolve(b,run,{solo:{}},{dice:[index?die:1,1]}));
  }
  return run;
}
async function render(props){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  await act(async()=>root.render(React.createElement(UI.FieldEncounter,{t:key=>key,...props})));
}
const click=async selector=>{expect(find(selector)).toBeTruthy();await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({entryPoints:['lesson_board_encounters_ui.jsx'],bundle:true,write:false,format:'iife',globalName:'BarterUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return BarterUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Supply exchange interactions',()=>{
  it('compares both exchanges and newly funded construction without spending or committing',async()=>{
    const b=board();b.projects.find(item=>item.id==='network').cost=[4,4];
    const run=pending(b),before=JSON.stringify({b,run}),onChoose=vi.fn(),onInspect=vi.fn();
    await render({board:b,run,onChoose,onInspect});expect(find('[data-field-trade-offer]')).toBeNull();await click('[data-field-approach=trade]');
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('trade:0');
    expect([0,1].map(i=>find('[data-decision-after="'+i+'"]').textContent)).toEqual(['4','4']);
    expect(find('[data-decision-inspect=network]').textContent).toContain('Water-cycle network');
    await click('[data-decision-inspect=network]');expect(onInspect).toHaveBeenCalledExactlyOnceWith('network');
    await click('[data-field-trade-option="trade:1"]');
    expect([0,1].map(i=>find('[data-decision-after="'+i+'"]').textContent)).toEqual(['7','1']);
    expect(find('[data-decision-inspect=network]')).toBeNull();
    await click('[data-field-approach=prepare]');expect(find('[data-field-trade-offer]')).toBeNull();await click('[data-field-approach=trade]');
    expect(find('[data-field-trade-option="trade:1"]').checked).toBe(true);
    expect(onChoose).not.toHaveBeenCalled();expect(JSON.stringify({b,run})).toBe(before);
    expect(element.textContent).toContain('takes no move');
  });
  it('commits only the chosen direction, focuses the receipt, and separates spending from rewards',async()=>{
    const b=board(),run=pending(b),onChoose=vi.fn();await render({board:b,run,onChoose});
    await click('[data-field-approach=trade]');await click('[data-field-trade-option="trade:1"]');
    find('[data-field-trade-commit]').focus();await click('[data-field-trade-commit]');
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('trade:1');
    const committed=engine.merge(run,engine.chooseFieldOpportunity(b,run,'trade:1'));
    await render({board:b,run:committed,onChoose});
    expect(find('[data-field-trade-offer]')).toBeNull();
    expect(document.activeElement).toBe(find('[data-field-receipt] h4'));
    expect(find('[data-field-receipt] h4').textContent).toBe('Supplies exchanged');
    expect(find('[data-field-trade-receipt]').textContent).toContain('−1 Connection tokens');
    expect(find('[data-field-trade-receipt]').textContent).toContain('+2 Observation tokens');
    expect(find('[data-field-trade-receipt]').textContent).not.toContain('+-');
    expect(engine.derive(b,committed)).toMatchObject({balance:[7,1],fieldSpent:[0,1],fieldGains:[2,0]});
  });
  it('allows local exchange comparison and inspection but blocks submission for students and paused teachers',async()=>{
    const b=board();b.projects.find(item=>item.id==='network').cost=[4,4];const run=pending(b),onChoose=vi.fn(),onInspect=vi.fn();
    for(const restriction of [{role:'student'},{role:'teacher',locked:true}]){
      await render({board:b,run,onChoose,onInspect,...restriction});
      await click('[data-field-approach=trade]');await click('[data-field-trade-option="trade:0"]');
      expect(find('[data-field-trade-commit]').disabled).toBe(true);
      expect([...element.querySelectorAll('[data-field-trade-option]')].every(input=>!input.disabled)).toBe(true);
      await click('[data-field-trade-commit]');await click('[data-decision-inspect=network]');
      await click('[data-field-trade-option="trade:1"]');expect(find('[data-field-decision-preview]').dataset.choice).toBe('trade:1');
    }
    expect(onChoose).not.toHaveBeenCalled();expect(onInspect).toHaveBeenCalledTimes(2);
  });
  it('explains a resource shortage and defaults to the affordable exchange',async()=>{
    const b=board();for(const node of b.locations.slice(0,2))node.reward=[0,1];
    const run=pending(b,7),onChoose=vi.fn();await render({board:b,run,onChoose});await click('[data-field-approach=trade]');
    expect(find('[data-field-trade-option="trade:0"]').disabled).toBe(true);
    expect(find('[data-trade-unavailable="trade:0"]').textContent).toContain('need one');
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('trade:1');
    await click('[data-field-trade-option="trade:0"]');await click('[data-field-trade-commit]');
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('trade:1');
  });
  it('only offers trade at supplies and rendezvous events and uses all five themed stands',async()=>{
    const glyphs=new Set();
    for(const theme of ['river','garden','workshop','archive','space']){
      const b={...board(),theme};await render({board:b,run:pending(b,16),onChoose:vi.fn()});
      await click('[data-field-approach=trade]');
      expect(find('[data-field-trade-offer]')).toBeTruthy();glyphs.add(find('[data-barter-miniature]').innerHTML);
      expect(find('[data-barter-miniature]').getAttribute('aria-hidden')).toBe('true');
    }
    expect(glyphs.size).toBe(5);
    for(const die of [1,11]){const b=board();await render({board:b,run:pending(b,die),onChoose:vi.fn()});expect(find('[data-field-trade-offer]')).toBeNull();expect(find('[data-field-approach=trade]')?.disabled??true).toBe(true);}
    const b=board();await render({board:{...b,chance:undefined},run:pending(b),onChoose:vi.fn()});expect(find('[data-field-panel]')).toBeNull();
  });
});
