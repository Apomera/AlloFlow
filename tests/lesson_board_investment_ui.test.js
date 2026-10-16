import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {simulatePlan,planningKey} from '../lesson_board_sandbox.js';
import {investmentComparisons} from '../lesson_board_investment.js';
const require=createRequire(import.meta.url),{makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs'),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
let UI,root,element;
const board=()=>({...makeBoard(),playStyle:'tabletop',goal:'expedition'}),node=s=>element.querySelector(s);
const ready=b=>simulatePlan(b,engine.emptyRun(),['heater','cloud']).run;
const click=async selector=>{expect(node(selector)).toBeTruthy();await act(async()=>{node(selector).click();await new Promise(resolve=>setTimeout(resolve,10));});};
async function render(Component,props){if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}await act(async()=>root.render(React.createElement(Component,{t:key=>key,...props})));}
beforeAll(()=>{window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;const bundle=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardView} from './lesson_board_ui.jsx';export {ConstructionInvestment} from './lesson_board_investment_ui.jsx';export {PlanningSandbox} from './lesson_board_sandbox_ui.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'InvestmentUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});UI=new Function(bundle+';return InvestmentUI;')();});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;localStorage.clear();sessionStorage.clear();});

describe('Construction investment decisions',()=>{
  it('shows the tradeoff between an immediate exchange and a later printed payment',async()=>{
    const b=board(),run=ready(b),onCompare=vi.fn(),before=JSON.stringify(run);
    await render(UI.ConstructionInvestment,{board:b,run,project:b.projects.find(p=>p.id==='network'),funding:'research',onCompare});
    await click('[data-construction-investment]>summary');
    expect(node('[data-investment-payback]').textContent).toContain('separate cost');
    expect(node('[data-investment-plan="0"]').textContent).toContain('Trade 2');expect(node('[data-investment-plan="1"]').textContent).toContain('Pay the printed cost');
    await click('[data-investment-compare]');const routes=onCompare.mock.calls[0][0];
    expect(routes[0][0]).toEqual({id:'network',funding:'research'});expect(routes[1].at(-1)).toEqual({id:'network',funding:'standard'});
    expect(JSON.stringify(run)).toBe(before);expect(localStorage.length+sessionStorage.length).toBe(0);
  });
  it('loads editable alternatives into the actual planner and preserves inspect-before-act',async()=>{
    const b=board(),run=ready(b),onMove=vi.fn(),onAnswer=vi.fn(),before=JSON.stringify(run);
    await render(UI.BoardView,{board:b,run,role:'solo',onMove,onAnswer});await click('[data-ready-move="network"]');await click('[data-construction-investment]>summary');await click('[data-investment-compare]');
    expect(node('[data-board-sandbox]').open).toBe(true);expect(node('[data-sandbox-comparison="0"]').textContent).toContain('3 planned moves');expect(node('[data-sandbox-comparison="1"]').textContent).toContain('3 planned moves');
    expect(node('[data-sandbox-step="network"]').textContent).toContain('Trade 2');
    await click('[data-sandbox-plan="1"]');expect(node('[data-sandbox-step="network"]').textContent).toContain('Pay the printed cost');
    await click('[data-sandbox-undo]');expect(node('[data-sandbox-step="network"]')).toBeNull();
    await click('[data-sandbox-plan="0"]');await click('[data-sandbox-inspect]');expect(node('.lb-current [value="research"]').checked).toBe(true);
    expect(onMove).not.toHaveBeenCalled();expect(onAnswer).not.toHaveBeenCalled();expect(JSON.stringify(run)).toBe(before);
    await click('[data-board-move="network"]');expect(onMove).toHaveBeenCalledWith('network','research');
  });
  it('ignores stale or invalid external plan requests and pauses the decision controls',async()=>{
    const b=board(),run=ready(b),plans=investmentComparisons(b,run,'network','research')[0].plans.map(p=>p.entries);
    await render(UI.PlanningSandbox,{board:b,run,planRequest:{id:1,key:'stale',plans}});expect(node('[data-sandbox-step]')).toBeNull();
    await render(UI.PlanningSandbox,{board:b,run,planRequest:{id:2,key:planningKey(b,run),plans:[['missing'],plans[1]]}});expect(node('[data-sandbox-step]')).toBeNull();
    await render(UI.ConstructionInvestment,{board:b,run,project:b.projects.find(p=>p.id==='network'),funding:'research',disabled:true,onCompare:vi.fn()});await click('[data-construction-investment]>summary');
    expect(node('[data-investment-stop]').disabled).toBe(true);expect(node('[data-investment-compare]').disabled).toBe(true);
  });
  it('does not advertise a Pathfinder bonus for another kit or show an unavailable investment',async()=>{
    const b={...board(),expeditionKit:'builder'},run=simulatePlan(b,engine.emptyRun(),['heater','cloud','heater']).run,project=b.projects.find(p=>p.id==='bridge');
    await render(UI.ConstructionInvestment,{board:b,run,project});expect(element.textContent).not.toContain('Your Pathfinder bonus');
    await render(UI.ConstructionInvestment,{board:b,run:engine.emptyRun(),project});expect(node('[data-construction-investment]')).toBeNull();
  });
  it('shows home-first route savings and the move spent building without changing the game',async()=>{
    const b={...board(),travelLimit:3},path=['cloud','rain','sequence','weather','cooler','lake','heater','river'];
    b.edges=path.slice(1).map((id,index)=>[path[index],id]);
    const project=b.projects.find(item=>item.id==='bridge');project.effect.targetId='lake';
    const run=simulatePlan(b,engine.emptyRun(),['heater','lake','cooler','weather','sequence','rain','cloud']).run,before=JSON.stringify({b,run}),onCompare=vi.fn();
    await render(UI.ConstructionInvestment,{board:b,run,project,onCompare});await click('[data-construction-investment]>summary');
    const routes=[...element.querySelectorAll('[data-investment-route]')];
    expect(routes.map(item=>item.dataset.investmentRoute)).toEqual(['heater','river','cooler']);
    expect(routes[0].textContent).toContain('Home camp');
    expect(routes[0].textContent).toContain('Segments: 6 → 2');
    expect(routes[0].textContent).toContain('Moves to reach: 2 → 1');
    expect(node('[data-investment-route-tradeoff]').textContent).toContain('Building uses one move');
    expect(node('[data-investment-route-tradeoff]').textContent).toContain('An unexplored destination still needs its investigation');
    expect(JSON.stringify({b,run})).toBe(before);expect(onCompare).not.toHaveBeenCalled();expect(localStorage.length+sessionStorage.length).toBe(0);
  });
  it('explains shorter routes that save no move and removes stale savings when the state changes',async()=>{
    const b={...board(),travelLimit:3},project=b.projects.find(item=>item.id==='bridge');
    const run=simulatePlan(b,engine.emptyRun(),['heater','cloud','rain','heater']).run;
    await render(UI.ConstructionInvestment,{board:b,run,project,onCompare:vi.fn()});
    expect(node('[data-investment-route="sequence"]').textContent).toContain('Segments: 3 → 1');
    expect(node('[data-investment-route="sequence"]').textContent).toContain('Moves to reach: 1 → 1');
    expect(node('[data-investment-route="sequence"]').textContent).toContain('Shorter route, same move count');
    const earlier=simulatePlan(b,engine.emptyRun(),['heater','cloud','heater']).run;
    await render(UI.ConstructionInvestment,{board:b,run:earlier,project,onCompare:vi.fn()});
    expect(node('[data-investment-route-savings]')).toBeNull();expect(node('[data-investment-frontier]').textContent).toContain('Cycle mechanism');
  });
});
