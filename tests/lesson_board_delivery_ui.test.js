import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,Tactics,root,element;
const board=()=>({...makeBoard(),playStyle:'tabletop',chance:true,goal:'expedition'}),find=selector=>element.querySelector(selector);
function pending(b,die=1,count=5){
  let run=engine.emptyRun();
  for(const [index,id] of ['heater','cloud','rain','river','lake'].slice(0,count).entries()){
    if(index)run=engine.merge(run,engine.advance(b,run));
    run=engine.merge(run,engine.begin(b,run,id));
    run=engine.merge(run,engine.processAction(b,run,{attemptId:'delivery-ui',turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(b.locations.find(item=>item.id===id))},'solo',{attemptId:'delivery-ui',active:true}));
    run=engine.merge(run,engine.resolve(b,run,{solo:{}},{dice:[index===count-1?die:1,1]}));
    if(index<count-1&&engine.fieldOpportunity(b,run)?.pending)run=engine.merge(run,engine.chooseFieldOpportunity(b,run,'collect'));
  }
  return run;
}
const accept=(b,run,id)=>engine.merge(run,engine.chooseFieldOpportunity(b,run,'delivery:'+id));
const travel=(b,run,id)=>engine.merge(engine.merge(run,engine.advance(b,run)),engine.begin(b,engine.merge(run,engine.advance(b,run)),id));
async function render(props,Component=UI.FieldEncounter){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  await act(async()=>root.render(React.createElement(Component,{t:key=>key,...props})));
}
const click=async selector=>{expect(find(selector)).toBeTruthy();await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  function bundle(file,name){
    const code="process.stdout.write(require('esbuild').buildSync({entryPoints:['"+file+"'],bundle:true,write:false,format:'iife',globalName:'"+name+"',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)";
    const source=require('node:child_process').execFileSync(process.execPath,['-e',code],{encoding:'utf8'});
    return new Function(source+';return '+name+';')();
  }
  UI=bundle('lesson_board_encounters_ui.jsx','DeliveryUI');Tactics=bundle('lesson_board_tactical_preview.jsx','DeliveryTactics');
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Delivery encounter decisions',()=>{
  it('compares two explored stations and inspects an exact travel route without committing',async()=>{
    const b=board(),run=pending(b),saved=JSON.stringify({b,run}),onChoose=vi.fn(),onInspect=vi.fn(),options=engine.fieldOpportunity(b,run).deliveries;
    expect(options).toHaveLength(2);await render({board:b,run,onChoose,onInspect});
    expect(find('[data-field-delivery-offer]')).toBeNull();await click('[data-field-approach=delivery]');
    await click('[data-field-delivery-option="'+options[1].targetId+'"]');
    expect(find('[data-field-delivery-preview]').dataset.fieldDeliveryPreview).toBe(options[1].targetId);
    await click('[data-field-delivery-inspect="'+options[1].targetId+'"]');
    expect(onInspect).toHaveBeenCalledExactlyOnceWith(options[1].targetId);expect(onChoose).not.toHaveBeenCalled();
    expect(find('[data-delivery-route]').textContent).toContain('deliver in one travel move');expect(JSON.stringify({b,run})).toBe(saved);
    await click('[data-field-approach=prepare]');expect(find('[data-field-delivery-offer]')).toBeNull();await click('[data-field-approach=delivery]');expect(find('[data-field-delivery-option="'+options[1].targetId+'"]').checked).toBe(true);
  });
  it('saves only the chosen station, preserves supplies and dice, then focuses the receipt',async()=>{
    const b=board(),run=pending(b,11),onChoose=vi.fn(),options=engine.fieldOpportunity(b,run).deliveries;
    await render({board:b,run,onChoose});await click('[data-field-approach=delivery]');await click('[data-field-delivery-option="'+options[1].targetId+'"]');
    find('[data-field-delivery-commit]').focus();await click('[data-field-delivery-commit]');
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('delivery:'+options[1].targetId);
    const committed=accept(b,run,options[1].targetId);await render({board:b,run:committed,onChoose});
    expect(find('[data-field-delivery-offer]')).toBeNull();expect(document.activeElement).toBe(find('[data-field-receipt] h4'));
    expect(find('[data-field-receipt] h4').textContent).toBe('Delivery accepted');expect(find('[data-field-delivery-receipt]').textContent).toContain('has not changed your balance');
    expect(engine.derive(b,committed).balance).toEqual(engine.derive(b,run).balance);expect(engine.stepOf(committed).result.dice).toEqual(engine.stepOf(run).result.dice);expect(committed.turn).toBe(run.turn);
  });
  it('does not steal focus when shared confirmation arrives after focus leaves the card',async()=>{
    const b=board(),run=pending(b),id=engine.fieldOpportunity(b,run).deliveries[0].targetId;
    await render({board:b,run,onChoose:vi.fn()});await click('[data-field-approach=delivery]');find('[data-field-delivery-commit]').focus();await click('[data-field-delivery-commit]');
    const outside=document.createElement('button');document.body.append(outside);outside.focus();
    await render({board:b,run:accept(b,run,id),onChoose:vi.fn()});expect(document.activeElement).toBe(outside);outside.remove();
  });
  it('allows students and paused teachers to compare destinations locally while acceptance remains blocked',async()=>{
    const b=board(),run=pending(b),onChoose=vi.fn(),onInspect=vi.fn(),id=engine.fieldOpportunity(b,run).deliveries[1].targetId;
    for(const restriction of [{role:'student'},{role:'teacher',locked:true}]){
      await render({board:b,run,onChoose,onInspect,...restriction});
      await click('[data-field-approach=delivery]');
      expect(find('[data-field-delivery-commit]').disabled).toBe(true);expect([...element.querySelectorAll('[data-field-delivery-option]')].every(input=>!input.disabled)).toBe(true);
      await click('[data-field-delivery-option="'+id+'"]');expect(find('[data-field-delivery-preview]').dataset.fieldDeliveryPreview).toBe(id);
      await click('[data-field-delivery-commit]');await click('[data-field-delivery-inspect="'+id+'"]');
    }
    expect(onChoose).not.toHaveBeenCalled();expect(onInspect).toHaveBeenCalledTimes(2);
  });
  it('shows the saved dispatch between turns and a one-time receipt after actual delivery',async()=>{
    const b=board(),run=pending(b,1,2),id=engine.fieldOpportunity(b,run).deliveries[0].targetId,committed=accept(b,run,id);
    await render({board:b,run:engine.merge(committed,engine.advance(b,committed)),onChoose:vi.fn(),onInspect:vi.fn()});
    expect(find('[data-field-delivery-active]').textContent).toContain('Passing through does not deliver');
    const delivered=travel(b,committed,id);await render({board:b,run:delivered,onChoose:vi.fn()});
    expect(find('[data-field-delivery-active]')).toBeNull();expect(find('[data-field-delivery-kind=delivery] h4').textContent).toBe('Delivery completed');
    expect(find('[data-field-delivery-kind=delivery]').textContent).toContain('original supplies were not collected again');
    const returned=travel(b,delivered,'cloud'),again=travel(b,returned,id);await render({board:b,run:again,onChoose:vi.fn()});
    expect(find('[data-field-delivery-kind=delivery]')).toBeNull();
  });
  it('offers deliveries only for survey and passage and supports all five setting miniatures',async()=>{
    const glyphs=new Set();
    for(const theme of ['river','garden','workshop','archive','space']){
      const b={...board(),theme};await render({board:b,run:pending(b,1,2),onChoose:vi.fn()});await click('[data-field-approach=delivery]');glyphs.add(find('[data-delivery-miniature]').innerHTML);
    }
    expect(glyphs.size).toBe(5);
    for(const die of [6,16]){const b=board();await render({board:b,run:pending(b,die,2),onChoose:vi.fn()});expect(find('[data-field-delivery-offer]')).toBeNull();expect(find('[data-field-approach=delivery]')?.disabled??true).toBe(true);}
    const b=board();await render({board:{...b,chance:undefined},run:pending(b),onChoose:vi.fn()});expect(find('[data-field-panel]')).toBeNull();
  });
  it('includes a committed delivery in the travel forecast without paying it early',async()=>{
    const b=board(),run=pending(b,1,2),id=engine.fieldOpportunity(b,run).deliveries[0].targetId,committed=accept(b,run,id),before=JSON.stringify(committed);
    const forecast=Tactics.forecastTabletopMove(b,committed,id),actual=engine.derive(b,travel(b,committed,id));
    expect(forecast).toMatchObject({deliveryGain:[3,0],travel:true,investigation:false,balance:actual.balance});
    expect(forecast.gain).toEqual([3,0]);expect(JSON.stringify(committed)).toBe(before);
    await render({board:b,run:committed,target:b.locations.find(node=>node.id===id)},Tactics.TacticalMoveDetails);
    expect(find('[data-forecast-delivery]').textContent).toContain('one-time delivery reward');
    expect(find('[data-forecast-field]')).toBeNull();expect(find('[data-forecast-lead]')).toBeNull();
  });
  it('reveals construction newly funded by a delivery without spending its reward',async()=>{
    const b=board(),run=pending(b,1,2),id=engine.fieldOpportunity(b,run).deliveries[0].targetId,committed=accept(b,run,id),before=engine.derive(b,committed);
    b.projects.find(project=>project.id==='network').cost=[before.balance[0]+2,before.balance[1]];
    const delivered=travel(b,committed,id),onInspect=vi.fn(),saved=JSON.stringify(delivered);
    await render({board:b,run:delivered,onInspect},UI.NextOpportunity);await click('[data-next-project=network]');
    expect(onInspect).toHaveBeenCalledExactlyOnceWith('network');expect(JSON.stringify(delivered)).toBe(saved);
  });
});
