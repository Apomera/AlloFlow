import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React,{makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,host;
function fixture(longRoute=false){
  const board={...makeBoard(),playStyle:'tabletop',travelLimit:3,goal:'expedition',expeditionKit:'pathfinder'};if(longRoute){board.edges=board.edges.filter(([a,b])=>!(a==='rain'&&b==='sequence'));board.edges.push(['sequence','river'],['river','cloud']);}let run=engine.emptyRun();
  for(const id of longRoute?['heater','cloud','river','sequence','river','heater','bridge']:['heater','cloud','rain','sequence','heater','bridge']){
    if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(board,run));
    run=engine.merge(run,engine.begin(board,run,id));
    if(engine.stepOf(run).phase==='answer'){
      run=engine.merge(run,engine.processAction(board,run,{attemptId:'route-ui',turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(board.locations.find(node=>node.id===id))},'solo',{attemptId:'route-ui',active:true}));
      run=engine.merge(run,engine.resolve(board,run,{solo:{}}));
    }
  }
  run=engine.merge(run,engine.advance(board,run));return {board,run,target:board.locations.find(node=>node.id==='rain')};
}
async function render(props,component=UI.RouteChoice){if(!root){host=document.createElement('div');host.className='lb';document.body.append(host);root=createRoot(host);}await act(async()=>root.render(React.createElement(component,{t:key=>key,...props})));}
const find=s=>host.querySelector(s),click=async s=>{expect(find(s)).toBeTruthy();await act(async()=>find(s).click());};
beforeAll(()=>{window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {RouteChoice} from './lesson_board_route_ui.jsx';export {TabletopPreview,TabletopTravelRecap} from './lesson_board_tabletop_ui.jsx';export {forecastTabletopMove} from './lesson_board_tactical_preview.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'RoutesUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});UI=new Function(source+';return RoutesUI;')();});
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=host=null;vi.restoreAllMocks();});
describe('Intentional tabletop route decisions',()=>{
  it('compares distinct routes and their real bridge/kit consequences without moving',async()=>{
    const f=fixture(),before=JSON.stringify(f),onChange=vi.fn();await render({...f,onChange});
    expect(find('[data-route-option-path=shortest]').textContent).toBe('Heating station → Cloud laboratory → Rain observatory');
    expect(find('[data-route-option-path="bridge:bridge"]').textContent).toBe('Heating station → Cycle mechanism → Rain observatory');
    expect(find('[data-route-option=shortest] [data-route-kit]')).toBeNull();expect(find('[data-route-option="bridge:bridge"] [data-route-kit]').textContent).toContain('+2 Observation tokens');
    await click('input[value="bridge:bridge"]');expect(onChange).toHaveBeenCalledExactlyOnceWith('bridge:bridge');expect(JSON.stringify(f)).toBe(before);
  });
  it('previews and records the chosen route, with kit supplies once on crossing',async()=>{
    const f=fixture(),forecast=UI.forecastTabletopMove(f.board,f.run,'rain','standard','bridge:bridge');
    expect(forecast.kitGain).toEqual([2,2]);expect(forecast.usedProjects).toEqual(['bridge']);
    await render({...f,route:'bridge:bridge'},UI.TabletopPreview);expect(find('.lb-tabletop-route').textContent).toContain('Cycle mechanism');expect(find('[data-forecast-kit]')).toBeTruthy();
    const arrived=engine.merge(f.run,engine.begin(f.board,f.run,'rain','standard','bridge:bridge'));await render({...f,run:arrived},UI.TabletopTravelRecap);
    expect(find('[data-travel-recap-path]').textContent).toContain('Cycle mechanism');expect(engine.derive(f.board,arrived).balance).toEqual(forecast.balance);
    const next=engine.merge(arrived,engine.advance(f.board,arrived));expect(UI.forecastTabletopMove(f.board,next,'heater','standard','bridge:bridge').kitGain).toEqual([0,0]);
  });
  it('keeps student and paused route choices read-only',async()=>{
    const f=fixture(),onChange=vi.fn();for(const props of [{role:'student'},{disabled:true}]){
      await render({...f,onChange,...props});expect([...host.querySelectorAll('input')].every(input=>input.disabled)).toBe(true);await click('input[value="bridge:bridge"]');
    }expect(onChange).not.toHaveBeenCalled();
  });
  it('shows the move limit on a longer bridge route and refuses its forecast',async()=>{
    const f=fixture(true),run=f.run;
    await render({...f,run,onChange:vi.fn()});expect(find('input[value="bridge:bridge"]').disabled).toBe(true);expect(find('[data-route-unavailable]').textContent).toContain('Beyond');expect(UI.forecastTabletopMove(f.board,run,'rain','standard','bridge:bridge')).toBeNull();
  });
  it('omits comparisons when no distinct built bridge route exists',async()=>{
    const f=fixture();await render({...f,run:engine.emptyRun(),target:f.board.locations[0]});expect(find('[data-route-choice]')).toBeNull();await render({...f,board:{...f.board,playStyle:undefined}});expect(find('[data-route-choice]')).toBeNull();
  });
});
