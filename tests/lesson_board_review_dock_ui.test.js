import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {simulatePlan} from '../lesson_board_sandbox.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React,{makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,host;
const board=()=>({...makeBoard(),playStyle:'tabletop',travelLimit:3,goal:'expedition',expeditionKit:'pathfinder'});
const find=selector=>host.querySelector(selector),all=selector=>[...host.querySelectorAll(selector)];
async function click(selector){expect(find(selector)).toBeTruthy();await act(async()=>{find(selector).focus();find(selector).click();await new Promise(resolve=>setTimeout(resolve,0));});}
async function render(props,component=UI.BoardView){if(!root){host=document.createElement('div');host.className='lb';document.body.append(host);root=createRoot(host);}await act(async()=>root.render(React.createElement(component,{t:key=>key,Icon:UI.Icon,...props})));}
function travelFixture(){const b=board();return {board:b,run:simulatePlan(b,engine.emptyRun(),['heater','cloud','rain','sequence','heater','bridge']).run};}
function solve(b,run,id,dice=[1]){
  if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(b,run));
  run=engine.merge(run,engine.begin(b,run,id));
  run=engine.merge(run,engine.processAction(b,run,{attemptId:'dock',turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(b.locations.find(node=>node.id===id))},'solo',{attemptId:'dock',active:true}));
  return engine.merge(run,engine.resolve(b,run,{solo:{}},{dice}));
}
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardView,Icon} from './lesson_board_ui.jsx';export {BoardMap} from './lesson_board_map.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'ReviewDockUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return ReviewDockUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=host=null;localStorage.clear();sessionStorage.clear();vi.restoreAllMocks();});

describe('Tabletop selection to move review',()=>{
  it('reviews an investigation without opening it or writing another workspace change',async()=>{
    const b=board(),run=engine.emptyRun(),before=JSON.stringify({b,run}),onMove=vi.fn(),onAnswer=vi.fn(),onWorkspaceChange=vi.fn();
    await render({board:b,run,onMove,onAnswer,onWorkspaceChange});await click('[data-location="heater"]');
    const heading=find('.lb-current>h3');heading.scrollIntoView=vi.fn();onWorkspaceChange.mockClear();
    expect(find('[data-tabletop-review-move="heater"]').textContent).toContain('Review investigation');
    await click('[data-tabletop-review-move="heater"]');
    expect(document.activeElement).toBe(heading);expect(heading.scrollIntoView).toHaveBeenCalledWith({block:'start',behavior:'instant'});
    expect(onMove).not.toHaveBeenCalled();expect(onAnswer).not.toHaveBeenCalled();expect(onWorkspaceChange).not.toHaveBeenCalled();expect(JSON.stringify({b,run})).toBe(before);
    expect(all('[data-board-move="heater"]')).toHaveLength(1);
  });
  it('preserves the selected bridge route through 3D, 2D and list review before the sole commit',async()=>{
    const f=travelFixture(),before=JSON.stringify(f),onMove=vi.fn();await render({...f,onMove});await click('[data-location="rain"]');await click('.lb-current [value="bridge:bridge"]');
    for(const view of ['board','list','tabletop']){
      const button=all('.lb-presentation>button').find(node=>view==='tabletop'?node.hasAttribute('data-board-tabletop'):node.textContent===(view==='board'?'Board view':'Location list'));
      await act(async()=>button.click());
      expect(find('[data-tabletop-review-move="rain"]').textContent).toContain('Review travel');await click('[data-tabletop-review-move="rain"]');
      expect(document.activeElement).toBe(find('.lb-current>h3'));expect(find('.lb-current [value="bridge:bridge"]').checked).toBe(true);
      expect(find('[data-map-route-path]').dataset.mapRoutePath).toBe('heater,sequence,rain');
    }
    expect(onMove).not.toHaveBeenCalled();expect(JSON.stringify(f)).toBe(before);expect(all('[data-board-move="rain"]')).toHaveLength(1);
    await click('[data-board-move="rain"]');expect(onMove).toHaveBeenCalledExactlyOnceWith('rain','standard','bridge:bridge');
  });
  it('keeps a chosen construction payment intact and only spends at the existing build button',async()=>{
    const b=board(),run=simulatePlan(b,engine.emptyRun(),['heater','cloud']).run,before=JSON.stringify(run),onMove=vi.fn();
    await render({board:b,run,onMove});await click('[data-map-construction="network"]');await click('.lb-current [data-funding-option="research"] input');
    expect(find('[data-tabletop-review-move="network"]').textContent).toContain('Review construction payment');
    await click('[data-tabletop-review-move="network"]');expect(document.activeElement).toBe(find('.lb-current>h3'));expect(find('.lb-current [data-funding-option="research"] input').checked).toBe(true);
    expect(onMove).not.toHaveBeenCalled();expect(JSON.stringify(run)).toBe(before);
    await click('[data-board-move="network"]');expect(onMove).toHaveBeenCalledExactlyOnceWith('network','research');
  });
  it('returns only the active answer to its response and hides the dock for unrelated inspections',async()=>{
    const b=board(),run=engine.merge(engine.emptyRun(),engine.begin(b,engine.emptyRun(),'heater')),before=JSON.stringify(run),onMove=vi.fn(),onAnswer=vi.fn();
    await render({board:b,run,onMove,onAnswer});
    const response=find('[data-board-choice]');await act(async()=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(response,'1');response.dispatchEvent(new Event('change',{bubbles:true}));});
    await click('[data-location="river"]');expect(find('[data-tabletop-review-move]')).toBeNull();
    await click('[data-location="heater"]');expect(find('[data-tabletop-review-move="heater"]').textContent).toContain('Return to current move');await click('[data-tabletop-review-move="heater"]');
    expect(document.activeElement).toBe(find('.lb-current>h3'));expect(find('[data-board-choice]').value).toBe('1');expect(onMove).not.toHaveBeenCalled();expect(onAnswer).not.toHaveBeenCalled();expect(JSON.stringify(run)).toBe(before);
  });
  it('returns a pending encounter to its actual choice panel without resolving or advancing',async()=>{
    const b={...board(),chance:true},run=solve(b,solve(b,engine.emptyRun(),'heater'),'cloud',[7]),before=JSON.stringify(run),onFieldChoice=vi.fn(),onAdvance=vi.fn();
    await render({board:b,run,onFieldChoice,onAdvance});await click('[data-tabletop-review-move="cloud"]');
    expect(document.activeElement).toBe(find('[data-field-panel]'));expect(find('[data-field-choice="collect"]')).toBeTruthy();expect(onFieldChoice).not.toHaveBeenCalled();expect(onAdvance).not.toHaveBeenCalled();expect(JSON.stringify(run)).toBe(before);
    await click('[data-map-construction="bridge"]');expect(find('[data-tabletop-review-move]')).toBeNull();
  });
  it('keeps student review private and leaves the existing proposal action unchanged',async()=>{
    const f=travelFixture(),onMove=vi.fn();await render({...f,role:'student',onMove});await click('[data-location="rain"]');
    expect(find('[data-tabletop-review-dock]').textContent).toContain('before proposing it');await click('[data-tabletop-review-move="rain"]');
    expect(onMove).not.toHaveBeenCalled();expect(all('.lb-current [data-route-choice] input').every(input=>input.disabled)).toBe(true);expect(find('[data-board-move="rain"]').textContent).toBe('Propose this move');
    await click('[data-board-move="rain"]');expect(onMove).toHaveBeenCalledExactlyOnceWith('rain');
  });
  it('disables review alongside paused, busy and pending move controls',async()=>{
    const b=board(),run=engine.emptyRun(),onMove=vi.fn();
    for(const state of [{paused:true},{busy:true},{pending:{kind:'vote'}}]){
      await render({board:b,run,onMove,...state});expect(find('[data-tabletop-review-move]').disabled).toBe(true);expect(find('[data-board-move]').disabled).toBe(true);await click('[data-tabletop-review-move]');
    }
    expect(onMove).not.toHaveBeenCalled();
  });
  it('never adds a live dock to projections, completed maps, or inaccessible destinations',async()=>{
    const b=board(),run=engine.emptyRun(),progress=engine.derive(b,run),onReviewMove=vi.fn(),props={board:b,run,progress,ready:engine.targets(b,run).map(node=>node.id),selected:'heater',onReviewMove,view:'tabletop'};
    await render({...props,projection:true},UI.BoardMap);expect(find('[data-tabletop-review-move]')).toBeNull();
    await render({...props,progress:{...progress,complete:true}},UI.BoardMap);expect(find('[data-tabletop-review-move]')).toBeNull();
    await render({...props,selected:'weather'},UI.BoardMap);expect(find('[data-tabletop-review-move]')).toBeNull();
    await render({...props,onReviewMove:undefined},UI.BoardMap);expect(find('[data-tabletop-review-move]')).toBeNull();expect(onReviewMove).not.toHaveBeenCalled();
  });
});
