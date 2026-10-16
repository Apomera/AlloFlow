import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;
const board=kit=>({...makeBoard(),playStyle:'tabletop',...(kit?{expeditionKit:kit}:{})}),find=selector=>element.querySelector(selector);
const choose=(b,run)=>engine.stepOf(run).phase==='review'?engine.merge(run,engine.advance(b,run)):run;
function move(b,run,id){
  run=engine.merge(choose(b,run),engine.begin(b,choose(b,run),id));
  if(engine.stepOf(run).phase==='answer'){
    const node=b.locations.find(item=>item.id===id);
    run=engine.merge(run,engine.processAction(b,run,{attemptId:'a',requestId:engine.requestId(run),turn:run.turn,kind:'answer',targetId:id,value:engine.solution(node)},'solo',{attemptId:'a',active:true}));
    run=engine.merge(run,engine.resolve(b,run,{solo:{}},{dice:Array.from({length:engine.diceNeeded(b,run)},()=>1)}));
  }
  return run;
}
const sequence=(b,ids)=>ids.reduce((run,id)=>move(b,run,id),engine.emptyRun());
async function render({b=board(),run=engine.emptyRun(),targetId='heater',funding,route,values}={}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  const props={board:b,run,t:key=>key},target=[...b.locations,...b.projects].find(item=>item.id===targetId);
  await act(async()=>root.render(values?React.createElement(UI.ResourceCounters,{board:b,values,t:key=>key}):React.createElement(React.Fragment,null,React.createElement(UI.TabletopHud,props),React.createElement(UI.TacticalMoveDetails,{...props,target,funding,route}))));
}
const number=(selector,index)=>Number(find('['+selector+'="'+index+'"]').textContent);
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {TabletopHud} from './lesson_board_tabletop_ui.jsx';export {TacticalMoveDetails} from './lesson_board_tactical_preview.jsx';export {ResourceCounters} from './lesson_board_tokens.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'ResourcePreviewUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return ResourcePreviewUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Tactile supplies and transparent move payments',()=>{
  it('shows exact zero and large balances beside capped, decorative token stacks',async()=>{
    const b=board();await render({b,values:[0,137]});
    expect(find('[data-resource-counters]').tagName).toBe('DL');expect(find('[data-resource-counters]').getAttribute('aria-label')).toBe('Shared resources');
    expect(number('data-resource-count',0)).toBe(0);expect(number('data-resource-count',1)).toBe(137);
    expect(find('[data-resource-counter="0"] dt').textContent).toBe(b.resources[0]);expect(find('[data-resource-counter="1"] dt').textContent).toBe(b.resources[1]);
    for(const [index,count] of [[0,0],[1,4]]){const stack=find('[data-resource-counter="'+index+'"] svg');expect(stack.getAttribute('aria-hidden')).toBe('true');expect(stack.getAttribute('focusable')).toBe('false');expect(stack.querySelectorAll('[data-stack-piece]').length).toBe(count);expect(stack.dataset.stackPieces).toBe(String(count));}
  });

  it('keeps actual supplies separate from a successful investigation forecast and excludes unrolled fortune',async()=>{
    const b={...board(),chance:true},run=move(b,engine.emptyRun(),'heater'),before=JSON.stringify(run);await render({b,run,targetId:'river'});
    expect([0,1].map(index=>number('data-resource-count',index))).toEqual([2,1]);expect([0,1].map(index=>number('data-resource-before',index))).toEqual([2,1]);expect([0,1].map(index=>number('data-resource-after',index))).toEqual([4,2]);
    expect(find('[data-resource-cost]')).toBeNull();expect(find('[data-resource-gain="0"]').textContent).toBe('Earn on success +2');expect(find('[data-resource-gain="1"]').textContent).toBe('Earn on success +1');expect(find('[data-tabletop-forecast]').textContent).toContain('Fortune bonuses are extra');expect(JSON.stringify(run)).toBe(before);
  });

  it('shows full construction payment separately from a Builder refund, including a net increase',async()=>{
    const b=board('builder'),run=sequence(b,['heater','cloud','heater']);await render({b,run,targetId:'research'});
    expect([0,1].map(index=>number('data-resource-count',index))).toEqual([4,2]);expect([0,1].map(index=>number('data-resource-after',index))).toEqual([1,3]);
    expect(find('[data-resource-cost="0"]').textContent).toBe('Pay first −3');expect(find('[data-resource-cost="1"]').textContent).toBe('Pay first −1');expect(find('[data-resource-gain="1"]').textContent).toBe('Receive after payment +2');expect(find('[data-forecast-kit]').textContent).toContain('2 Connection tokens');
    const actual=engine.derive(b,move(b,run,'research'));expect([0,1].map(index=>number('data-resource-after',index))).toEqual(actual.balance);
  });

  it('uses the selected alternate construction payment instead of the printed standard cost',async()=>{
    const b=board('builder'),run=choose(b,sequence(b,['heater','cloud'])),before=JSON.stringify(run);await render({b,run,targetId:'network',funding:'research'});
    expect(find('[data-resource-cost="0"]').textContent).toBe('Pay first −3');expect(find('[data-resource-cost="1"]').textContent).toBe('Pay first −2');expect([0,1].map(index=>number('data-resource-after',index))).toEqual([1,2]);
    await render({b,run,targetId:'network',funding:'standard'});expect(find('[data-tabletop-forecast]')).toBeNull();expect([0,1].map(index=>number('data-resource-count',index))).toEqual([4,2]);expect(JSON.stringify(run)).toBe(before);
  });

  it('shows an unchanged balance on ordinary travel without suggesting new resources',async()=>{
    const b=board(),run=sequence(b,['heater','cloud']);await render({b,run,targetId:'heater'});
    expect([0,1].map(index=>number('data-resource-before',index))).toEqual([4,2]);expect([0,1].map(index=>number('data-resource-after',index))).toEqual([4,2]);expect(find('[data-resource-cost]')).toBeNull();expect(find('[data-resource-gain]')).toBeNull();
    expect(find('[data-resource-unchanged="0"]').textContent).toBe('No change');expect(find('[data-resource-unchanged="1"]').textContent).toBe('No change');
  });

  it('updates only the forecast when comparing a rewarded bridge route with ordinary travel',async()=>{
    const b=board('pathfinder');b.projects[0]={...b.projects[0],cost:[1,0]};const run=choose(b,sequence(b,['heater','cloud','rain','sequence','heater','bridge'])),snapshot=JSON.stringify({b,run});
    await render({b,run,targetId:'cloud'});const random=vi.spyOn(Math,'random');
    expect([0,1].map(index=>number('data-resource-count',index))).toEqual([7,4]);expect([0,1].map(index=>number('data-resource-after',index))).toEqual([7,4]);
    await render({b,run,targetId:'cloud',route:'bridge:bridge'});expect([0,1].map(index=>number('data-resource-after',index))).toEqual([9,6]);expect(find('[data-resource-gain="0"]').textContent).toBe('Receive +2');expect(find('[data-resource-gain="1"]').textContent).toBe('Receive +2');expect(find('[data-forecast-kit]')).toBeTruthy();
    expect([0,1].map(index=>number('data-resource-count',index))).toEqual([7,4]);expect(find('[data-resource-counters]').querySelectorAll('button,[tabindex],animate').length).toBe(0);expect(random).not.toHaveBeenCalled();expect(JSON.stringify({b,run})).toBe(snapshot);
  });

  it('displays a saved delivery payout once in the forecast while retaining the actual balance',async()=>{
    const b={...board(),chance:true},pending=sequence(b,['heater','cloud']),run=engine.merge(pending,engine.chooseFieldOpportunity(b,pending,'delivery:heater'));
    await render({b,run,targetId:'heater'});expect([0,1].map(index=>number('data-resource-count',index))).toEqual([4,2]);expect([0,1].map(index=>number('data-resource-after',index))).toEqual([7,2]);expect(find('[data-resource-gain="0"]').textContent).toBe('Receive +3');expect(find('[data-forecast-delivery]')).toBeTruthy();
    const delivered=move(b,run,'heater');await render({b,run:delivered,targetId:'cloud'});expect([0,1].map(index=>number('data-resource-count',index))).toEqual([7,2]);expect([0,1].map(index=>number('data-resource-after',index))).toEqual([7,2]);expect(find('[data-resource-gain]')).toBeNull();expect(find('[data-forecast-delivery]')).toBeNull();
  });

  it('keeps current counters readable when there is no legal hypothetical move',async()=>{
    const b=board();for(const run of [engine.emptyRun(),engine.merge(engine.emptyRun(),engine.begin(b,engine.emptyRun(),'heater'))]){
      await render({b,run,targetId:'weather'});expect(find('[data-tabletop-forecast]')).toBeNull();expect(find('[data-resource-counters]')).toBeTruthy();expect([0,1].map(index=>number('data-resource-count',index))).toEqual([0,0]);
    }
  });
});
