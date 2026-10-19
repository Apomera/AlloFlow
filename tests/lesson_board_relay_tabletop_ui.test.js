import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {assignmentItineraries} from '../lesson_board_assignments.js';
// Tabletop spaces keep a short name; their details are the accessible description.
const spoken=node=>[node?.getAttribute('aria-label'),...(node?.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent)].filter(Boolean).join('. ');
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;
const find=selector=>element.querySelector(selector),all=selector=>[...element.querySelectorAll(selector)];
const advance=(b,run)=>engine.merge(run,engine.advance(b,run));
function fixture(){
  const b={...makeBoard(),playStyle:'tabletop',chance:true,goal:'expedition'};
  b.edges=b.locations.slice(1).map((node,index)=>[b.locations[index].id,node.id]);
  let run=engine.emptyRun();
  for(const [index,id] of ['heater','cloud','river','rain','lake'].entries()){
    if(index)run=advance(b,run);
    run=engine.merge(run,engine.begin(b,run,id));
    run=engine.merge(run,engine.processAction(b,run,{attemptId:'relay-map',turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(b.locations.find(item=>item.id===id))},'solo',{attemptId:'relay-map',active:true}));
    run=engine.merge(run,engine.resolve(b,run,{solo:{}},{dice:[index===4?11:1,1]}));
    if(index<4&&engine.fieldOpportunity(b,run)?.pending)run=engine.merge(run,engine.chooseFieldOpportunity(b,run,'collect'));
  }
  const offer=engine.fieldOpportunity(b,run),relay=offer.relays[0];
  run=engine.merge(run,engine.chooseFieldOpportunity(b,run,relay.id));
  return {b,run:advance(b,run),relay};
}
function travel(b,run,id){if(engine.stepOf(run).phase==='review')run=advance(b,run);return engine.merge(run,engine.begin(b,run,id));}
async function render({b,run,...props}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  await act(async()=>root.render(React.createElement(UI.BoardMap,{board:b,run,progress:engine.derive(b,run),ready:engine.targets(b,run).map(item=>item.id),selected:'lake',view:'tabletop',Icon:()=>null,t:key=>key,...props})));
}
const click=async selector=>{expect(find(selector)).toBeTruthy();await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardMap} from './lesson_board_map.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'RelayMapUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return RelayMapUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Saved relay stages on the tabletop',()=>{
  it('numbers saved stations separately from map spaces and keeps later rewards conditional',async()=>{
    const {b,run,relay}=fixture(),[first,second]=relay.stops,saved=JSON.stringify({b,run}),onSelect=vi.fn();
    await render({b,run,selected:second.targetId,onSelect});
    expect(all('[data-tabletop-relay-marker]')).toHaveLength(2);
    expect(all('[data-tabletop-encounters] .lb-relay-miniature')).toHaveLength(1);
    expect(find('[data-tabletop-relay] .lb-event-relay-heading')).toBeNull();
    expect(find('[data-tabletop-relay-marker="'+first.targetId+'"]').dataset.relayStopStatus).toBe('next');
    expect(find('[data-tabletop-relay-marker="'+second.targetId+'"]').dataset.relayStopStatus).toBe('later');
    expect(spoken(find('[data-location="'+first.targetId+'"]'))).toContain('Relay stop 1 of 2 · Next');
    expect(spoken(find('[data-location="'+second.targetId+'"]'))).toContain('Arriving here early or passing through does not pay');
    expect(find('[data-relay-detail]').textContent).toContain('Complete stop 1');
    expect(find('[data-relay-detail] [data-delivery-route]')).toBeNull();
    await click('[data-inspect-tabletop-relay]');expect(onSelect).toHaveBeenCalledExactlyOnceWith(first.targetId);
    expect(find('[data-party-position]').dataset.partyPosition).toBe('lake');
    expect(JSON.stringify({b,run})).toBe(saved);
  });

  it('retains ordered stages when visiting the later stop early and advances only after the next endpoint',async()=>{
    const {b,run,relay}=fixture(),[first,second]=relay.stops;
    const early=travel(b,run,second.targetId);await render({b,run:early,selected:second.targetId});
    expect(find('[data-tabletop-relay-marker="'+first.targetId+'"]').dataset.relayStopStatus).toBe('next');
    expect(find('[data-relay-detail]').textContent).toContain('Arriving here early');
    const reached=travel(b,early,first.targetId),saved=JSON.stringify(reached);await render({b,run:reached,selected:first.targetId});
    expect(find('[data-tabletop-relay-marker="'+first.targetId+'"]').dataset.relayStopStatus).toBe('complete');
    expect(find('[data-tabletop-relay-marker="'+second.targetId+'"]').dataset.relayStopStatus).toBe('next');
    expect(find('[data-relay-detail]').textContent).toContain('will not pay again');
    expect(find('[data-tabletop-relay-stage="1"]').textContent).toContain('Collected');
    expect(find('[data-inspect-tabletop-relay]').dataset.inspectTabletopRelay).toBe(second.targetId);
    expect(JSON.stringify(reached)).toBe(saved);
  });

  it('clears both pieces after final payment and shows the completed relay receipt only on that turn',async()=>{
    const {b,run,relay}=fixture();const first=travel(b,run,relay.stops[0].targetId),done=travel(b,first,relay.stops[1].targetId);
    await render({b,run:done});expect(all('[data-tabletop-relay-marker]')).toHaveLength(0);
    expect(find('[data-tabletop-encounters]').dataset.encounterState).toBe('delivered');
    expect(find('[data-tabletop-encounters]').textContent).toContain('Relay completed');
    expect(find('[data-tabletop-encounters]').textContent).toContain('Both stops have paid');
    await render({b,run:advance(b,done)});expect(find('[data-tabletop-encounters]').textContent).not.toContain('Both stops have paid');
  });

  it('offers equivalent station order and read-only inspection in 2D and list views',async()=>{
    const {b,run,relay}=fixture(),onSelect=vi.fn(),first=relay.stops[0].targetId,second=relay.stops[1].targetId;
    for(const view of ['board','list']){
      await render({b,run,selected:first,view,onSelect});
      expect(find('[data-inspect-tabletop-relay]').dataset.inspectTabletopRelay).toBe(first);
      expect(find('[data-relay-detail]').textContent).toContain('later travel move ends here');
      if(view==='list'){
        expect(all('[data-tabletop-relay-marker]')).toHaveLength(0);expect(all('[data-relay-list]')).toHaveLength(2);
        expect(find('[data-relay-list="'+second+'"]').textContent).toContain('Relay stop 2 of 2 · Later');
      }
      await click('[data-location="'+second+'"]');
    }
    expect(onSelect).toHaveBeenCalledTimes(2);expect(onSelect).toHaveBeenLastCalledWith(second);
  });

  it('keeps the saved relay out of future projections, completed games, and chance-off tables',async()=>{
    const {b,run,relay}=fixture(),onSelect=vi.fn();
    await render({b,run,selected:relay.stops[0].targetId,projection:true,onSelect});
    expect(find('[data-tabletop-relay-marker]')).toBeNull();expect(find('[data-relay-detail]')).toBeNull();
    expect(find('[data-tabletop-relay]')).toBeNull();expect(find('[data-inspect-tabletop-relay]')).toBeNull();
    expect(spoken(find('[data-location="'+relay.stops[0].targetId+'"]'))).not.toContain('Relay stop');
    await render({b,run,progress:{...engine.derive(b,run),complete:true}});expect(find('[data-tabletop-relay-marker]')).toBeNull();expect(find('[data-tabletop-relay]')).toBeNull();
    await render({b:{...b,chance:false},run,progress:engine.derive(b,run)});expect(find('[data-tabletop-relay-marker]')).toBeNull();expect(find('[data-tabletop-relay]')).toBeNull();
    await render({b,run});expect(find('[data-inspect-tabletop-relay]').disabled).toBe(true);
  });

  it('retains actual relay progress underneath private assignment priorities and camera changes',async()=>{
    const {b,run,relay}=fixture(),report=assignmentItineraries(b,run),saved=JSON.stringify(run);
    const preview={key:report.key,plan:report.plans[0],assignments:report.assignments};
    await render({b,run,assignmentPreview:preview,selected:relay.stops[0].targetId,onSelect:vi.fn()});
    expect(find('[data-assignment-map-priority]')).toBeTruthy();
    expect(all('[data-tabletop-relay-marker]')).toHaveLength(2);
    expect(find('[data-tabletop-relay-stage="1"]').dataset.relayStopStatus).toBe('next');
    await click('[data-tabletop-camera="left"]');await click('[data-tabletop-camera="overhead"]');
    expect(find('[data-spatial-board]').dataset.camera).toBe('overhead');
    expect(find('[data-party-position]').dataset.partyPosition).toBe('lake');
    expect(JSON.stringify(run)).toBe(saved);
  });
});
