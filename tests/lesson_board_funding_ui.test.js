import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;const t=key=>key;
const make=()=>({...makeBoard(),playStyle:'tabletop'});
function move(b,run,id){if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(b,run));run=engine.merge(run,engine.begin(b,run,id));if(engine.stepOf(run).phase==='answer'){const node=b.locations.find(item=>item.id===id);run=engine.merge(run,engine.processAction(b,run,{attemptId:'a',requestId:engine.requestId(run),turn:run.turn,kind:'answer',targetId:id,value:engine.solution(node)},'solo',{attemptId:'a',active:true}));run=engine.merge(run,engine.resolve(b,run,{solo:{}}));}return run;}
const ready=b=>{const run=move(b,move(b,engine.emptyRun(),'heater'),'cloud');return engine.merge(run,engine.advance(b,run));};
beforeAll(()=>{window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;const code=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export * from './lesson_board_funding_ui.jsx'; export {BoardView} from './lesson_board_ui.jsx'; export {LessonBoardSolo} from './lesson_board_source.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'FundingUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});UI=new Function(code+';return FundingUI;')();});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();element=root=null;localStorage.clear();sessionStorage.clear();});
async function mount(component,props){if(!root){element=document.createElement('div');document.body.append(element);root=createRoot(element);}await act(async()=>root.render(React.createElement(component,props)));}
async function click(selector){const button=element.querySelector(selector);expect(button).toBeTruthy();await act(async()=>button.click());}
describe('Construction funding choices',()=>{
  it('shows actual payment costs and requires an explicit build to spend anything',async()=>{
    const board=make(),run=ready(board),snapshot=JSON.stringify(run),onChange=vi.fn(),project=board.projects.find(item=>item.id==='network');
    await mount(UI.ConstructionFundingPicker,{board,run,project,value:'standard',onChange,t});
    expect(element.querySelector('[value=standard]').disabled).toBe(true);
    expect(element.querySelector('[value=research]').disabled).toBe(false);
    expect(element.querySelector('[data-funding-option=research]').textContent).toContain('3 '+board.resources[0]);
    await click('[value=research]');expect(onChange).toHaveBeenCalledWith('research');expect(JSON.stringify(run)).toBe(snapshot);
    expect(element.textContent).toContain('one extra token overall');
  });
  it('keeps student proposals project-only and makes the teacher payment choice explicit',async()=>{
    const board=make(),run=ready(board),onMove=vi.fn();
    await mount(UI.BoardView,{board,run,role:'student',uid:'s',roster:{s:{}},onMove,t});
    await click('[data-ready-move=network]');
    expect(element.querySelectorAll('[data-construction-funding] input')).toHaveLength(0);
    expect(element.querySelector('[data-construction-funding]').textContent).toContain('Your teacher chooses its payment');
    await click('[data-board-move=network]');expect(onMove).toHaveBeenCalledWith('network');
  });
  it('commits the visible exchanged payment and previews the exact remaining supplies',async()=>{
    const board=make(),run=ready(board),onMove=vi.fn();
    await mount(UI.BoardView,{board,run,role:'solo',uid:'solo',roster:{solo:{}},onMove,t});
    await click('[data-ready-move=network]');
    expect(element.querySelector('[value=research]').checked).toBe(true);
    expect(element.querySelector('[data-tabletop-forecast]').textContent).toContain('1 '+board.resources[0]+' · 0 '+board.resources[1]);
    await click('[data-board-move=network]');expect(onMove).toHaveBeenCalledWith('network','research');
    const built=engine.merge(run,engine.begin(board,run,'network','research'));
    await mount(UI.BoardView,{board,run:built,role:'solo',uid:'solo',roster:{solo:{}},t});
    expect(element.querySelector('[data-funding-receipt]').textContent).toContain('Trade 2');
    expect(element.querySelector('[data-board-rewards]').textContent).toContain('3');
  });
  it('disables funding controls when the game is paused',async()=>{
    const board=make(),run=ready(board),onChange=vi.fn();
    await mount(UI.ConstructionFundingPicker,{board,run,project:board.projects[0],value:'standard',onChange,disabled:true,t});
    expect(element.querySelector('fieldset').disabled).toBe(true);
    await click('[value=standard]');expect(onChange).not.toHaveBeenCalled();
  });
});
