import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;
const board=()=>({...makeBoard(),playStyle:'tabletop',chance:true,goal:'expedition'}),find=selector=>element.querySelector(selector);
const next=(b,run)=>engine.merge(run,engine.advance(b,run));
function pending(b){
  let run=engine.emptyRun();
  for(const [index,id] of ['heater','cloud','rain','river','lake'].entries()){
    if(index)run=next(b,run);
    run=engine.merge(run,engine.begin(b,run,id));
    run=engine.merge(run,engine.processAction(b,run,{attemptId:'relay-ui',turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(b.locations.find(item=>item.id===id))},'solo',{attemptId:'relay-ui',active:true}));
    run=engine.merge(run,engine.resolve(b,run,{solo:{}},{dice:[index===4?11:1,1]}));
    if(index<4&&engine.fieldOpportunity(b,run)?.pending)run=engine.merge(run,engine.chooseFieldOpportunity(b,run,'collect'));
  }
  return run;
}
const accept=(b,run,id)=>engine.merge(run,engine.chooseFieldOpportunity(b,run,id));
function travel(b,run,id){run=next(b,run);return engine.merge(run,engine.begin(b,run,id));}
function props(){
  const b=board(),run=pending(b),card={id:'passage',turn:5,pending:true,canRelay:true,relays:[{id:'relay:cloud:river',stops:[{targetId:'cloud',reward:[1,0]},{targetId:'river',reward:[0,3]}],reward:[1,3]},{id:'relay:river:cloud',stops:[{targetId:'river',reward:[0,1]},{targetId:'cloud',reward:[3,0]}],reward:[3,1]}]};
  return {board:b,progress:engine.derive(b,run),card};
}
async function render(values,Component=UI.RelayOffer){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  await act(async()=>root.render(React.createElement(Component,{t:key=>key,...values})));
}
const click=async selector=>{expect(find(selector)).toBeTruthy();await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export * from './lesson_board_relays_ui.jsx';export {FieldEncounter} from './lesson_board_encounters_ui.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'RelayUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return RelayUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;localStorage.clear();sessionStorage.clear();vi.restoreAllMocks();});

describe('Themed two-stop relay decisions',()=>{
  it('compares exact payout sequences and keeps route inspection private until confirmation',async()=>{
    const input=props(),before=JSON.stringify(input),onChoose=vi.fn(),onInspect=vi.fn();await render({...input,onChoose,onInspect});
    expect(element.querySelectorAll('[data-field-relay-option]')).toHaveLength(2);expect(find('[data-field-relay-preview]').dataset.fieldRelayPreview).toBe('relay:cloud:river');
    expect(find('[data-relay-stop=cloud]').textContent).toContain('+1 Observation tokens');expect(find('[data-relay-stop=river]').textContent).toContain('+3 Connection tokens');
    await click('[data-field-relay-option="relay:river:cloud"]');expect(find('[data-field-relay-preview]').dataset.fieldRelayPreview).toBe('relay:river:cloud');
    expect(find('[data-relay-stop=river]').dataset.relayStopState).toBe('next');expect(find('[data-relay-stop=cloud]').textContent).toContain('+3 Observation tokens');
    await click('[data-field-relay-inspect=river]');expect(onInspect).toHaveBeenCalledExactlyOnceWith('river');expect(onChoose).not.toHaveBeenCalled();
    expect(element.textContent).toContain('visiting stop 2 first pays nothing');expect(find('[data-relay-route]').textContent).toContain('handoff in one travel move');
    await click('[data-field-relay-commit]');expect(onChoose).toHaveBeenCalledExactlyOnceWith('relay:river:cloud');expect(JSON.stringify(input)).toBe(before);expect(localStorage.length+sessionStorage.length).toBe(0);
  });

  it('supports a controlled comparison without committing or replacing its parent selection',async()=>{
    const input=props(),onSelect=vi.fn(),onChoose=vi.fn();await render({...input,choice:'relay:cloud:river',onSelect,onChoose});
    await click('[data-field-relay-option="relay:river:cloud"]');expect(onSelect).toHaveBeenCalledExactlyOnceWith('relay:river:cloud');expect(find('[data-field-relay-preview]').dataset.fieldRelayPreview).toBe('relay:cloud:river');expect(onChoose).not.toHaveBeenCalled();
    await render({...input,choice:'relay:river:cloud',onSelect,onChoose});expect(find('[data-field-relay-preview]').dataset.fieldRelayPreview).toBe('relay:river:cloud');
  });

  it('allows private comparison while locked and requires both eligibility and a commit callback',async()=>{
    const input=props(),onChoose=vi.fn(),onInspect=vi.fn();await render({...input,disabled:true,onChoose,onInspect});
    await click('[data-field-relay-option="relay:river:cloud"]');expect(find('[data-field-relay-option="relay:river:cloud"]').disabled).toBe(false);expect(find('[data-field-relay-commit]').disabled).toBe(true);
    await click('[data-field-relay-commit]');await click('[data-field-relay-inspect=cloud]');expect(onInspect).toHaveBeenCalledExactlyOnceWith('cloud');expect(onChoose).not.toHaveBeenCalled();
    await render({...input,card:{...input.card,canRelay:false},progress:{...input.progress,fieldDelivery:{targetId:'cloud'}},onChoose});expect(find('[data-relay-unavailable]').textContent).toContain('active delivery');expect(find('[data-field-relay-commit]').disabled).toBe(true);await click('[data-field-relay-commit]');expect(onChoose).not.toHaveBeenCalled();
    await render(input);expect(find('[data-field-relay-commit]').disabled).toBe(true);
  });

  it('resets its local order for a new saved opportunity',async()=>{
    const input=props();await render({...input,onChoose:vi.fn()});await click('[data-field-relay-option="relay:river:cloud"]');
    await render({...input,card:{...input.card,turn:8},onChoose:vi.fn()});expect(find('[data-field-relay-option="relay:cloud:river"]').checked).toBe(true);
  });

  it('shows the paid first handoff and guides only the next handoff',async()=>{
    const input=props(),relay={...input.card.relays[0],stage:1,targetId:'river',reward:[0,3]},onInspect=vi.fn();await render({board:input.board,progress:{...input.progress,position:'cloud'},relay,onInspect},UI.RelayReminder);
    expect(find('[data-field-relay-active]').dataset.relayStage).toBe('1');expect(find('[data-relay-stop=cloud]').dataset.relayStopState).toBe('complete');expect(find('[data-relay-stop=river]').dataset.relayStopState).toBe('next');
    expect(find('[data-relay-progress]').textContent).toBe('1 of 2 handoffs completed');expect(find('[data-relay-route]').dataset.relayRoute).toBe('river');
    await click('[data-field-relay-inspect=river]');expect(onInspect).toHaveBeenCalledExactlyOnceWith('river');expect(element.textContent).toContain('first handoff is paid');
  });

  it('uses a legal waypoint when the next station is beyond travel range',async()=>{
    const input=props(),b={...input.board,travelLimit:3,edges:input.board.locations.slice(1).map((node,index)=>[input.board.locations[index].id,node.id])},relay={...input.card.relays[0],stage:0},progress={...input.progress,position:'weather',visited:input.board.locations.map(node=>node.id)};await render({board:b,progress,relay,onInspect:vi.fn()},UI.RelayReminder);
    expect(find('[data-relay-next-stop]')).toBeTruthy();expect(find('[data-relay-route]').textContent).toContain('continue toward the handoff');
    await render({board:b,progress:{...input.progress,visited:['lake']},relay},UI.RelayReminder);expect(find('[data-relay-route-unavailable]')).toBeTruthy();expect(find('[data-relay-route]')).toBeNull();
  });

  it('renders distinct story props for all five settings and a clear saved receipt',async()=>{
    const input=props(),miniatures=new Set(),titles=new Set();
    for(const theme of ['river','garden','workshop','archive','space']){await render({...input,board:{...input.board,theme},onChoose:vi.fn()});miniatures.add(find('[data-relay-miniature]').innerHTML);titles.add(find('.lb-relay-heading h5').textContent);}
    expect(miniatures.size).toBe(5);expect(titles.size).toBe(5);await render({board:input.board,relay:input.card.relays[0]},UI.RelayReceipt);expect(find('[data-field-relay-receipt]').textContent).toContain('No supplies were added and the party has not moved');expect(element.querySelectorAll('[data-relay-stop]')).toHaveLength(2);expect(element.querySelectorAll('button')).toHaveLength(0);
  });

  it('saves the selected real relay without early payout or movement and focuses its receipt',async()=>{
    const b=board(),run=pending(b),card=engine.fieldOpportunity(b,run),onChoose=vi.fn();expect(card.relays).toHaveLength(2);const selected=card.relays[1];
    await render({board:b,run,onChoose},UI.FieldEncounter);await click('[data-field-approach=relay]');await click('[data-field-relay-option="'+selected.id+'"]');find('[data-field-relay-commit]').focus();await click('[data-field-relay-commit]');expect(onChoose).toHaveBeenCalledExactlyOnceWith(selected.id);
    const saved=accept(b,run,selected.id);await render({board:b,run:saved,onChoose},UI.FieldEncounter);expect(find('[data-field-receipt] h4').textContent).toBe('Relay accepted');expect(document.activeElement).toBe(find('[data-field-receipt] h4'));expect(find('[data-field-relay-receipt]')).toBeTruthy();expect(engine.derive(b,saved).balance).toEqual(engine.derive(b,run).balance);expect(engine.derive(b,saved).position).toBe(engine.derive(b,run).position);expect(saved.turn).toBe(run.turn);expect(engine.stepOf(saved).result.dice).toEqual(engine.stepOf(run).result.dice);
  });

  it('reports first and final real handoffs separately and pays nothing for the wrong order',async()=>{
    const b=board(),base=pending(b),offer=engine.fieldOpportunity(b,base).relays[0],saved=accept(b,base,offer.id);let run=travel(b,saved,offer.stops[1].targetId);
    await render({board:b,run,onChoose:vi.fn()},UI.FieldEncounter);expect(find('[data-field-delivery-kind=relay-stop]')).toBeNull();expect(find('[data-field-relay-active]').dataset.relayStage).toBe('0');
    run=travel(b,run,offer.stops[0].targetId);await render({board:b,run,onChoose:vi.fn()},UI.FieldEncounter);expect(find('[data-field-delivery-kind=relay-stop] h4').textContent).toBe('First relay handoff completed');expect(find('[data-field-relay-active]').dataset.relayStage).toBe('1');expect(element.textContent).toContain('second station for the final reward');
    run=travel(b,run,offer.stops[1].targetId);await render({board:b,run,onChoose:vi.fn()},UI.FieldEncounter);expect(find('[data-field-delivery-kind=relay] h4').textContent).toBe('Relay completed');expect(find('[data-field-relay-active]')).toBeNull();expect(find('[data-field-delivery-kind=relay]').textContent).toContain('Both handoffs are complete');
    run=travel(b,travel(b,run,offer.stops[0].targetId),offer.stops[1].targetId);await render({board:b,run,onChoose:vi.fn()},UI.FieldEncounter);expect(find('[data-field-delivery-kind=relay]')).toBeNull();
  });

  it('lets students compare relay orders without accepting them',async()=>{
    const b=board(),run=pending(b),onChoose=vi.fn(),onInspect=vi.fn(),selected=engine.fieldOpportunity(b,run).relays[1];await render({board:b,run,role:'student',onChoose,onInspect},UI.FieldEncounter);await click('[data-field-approach=relay]');await click('[data-field-relay-option="'+selected.id+'"]');expect(find('[data-field-relay-preview]').dataset.fieldRelayPreview).toBe(selected.id);expect(find('[data-field-relay-commit]').disabled).toBe(true);await click('[data-field-relay-commit]');await click('[data-field-relay-inspect="'+selected.stops[0].targetId+'"]');expect(onChoose).not.toHaveBeenCalled();expect(onInspect).toHaveBeenCalledExactlyOnceWith(selected.stops[0].targetId);
  });
});
