import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as e from '../lesson_board_engine.js';
import {simulatePlan} from '../lesson_board_sandbox.js';
const require=createRequire(import.meta.url),{makeBoard,support}=require('../dev-tools/fixtures/lesson_board_support.cjs'),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
let UI,root,element;const board=()=>({...makeBoard(),goal:'expedition'}),node=s=>element.querySelector(s);
const click=async selector=>{await act(async()=>{node(selector).click();await new Promise(resolve=>setTimeout(resolve,10));});};
const point=async value=>{await act(async()=>{const select=node('[data-plan-preview-position]');select.value=String(value);select.dispatchEvent(new Event('change',{bubbles:true}));});};
async function render(Component,props){if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}await act(async()=>root.render(React.createElement(Component,{t:key=>key,...props})));}
async function start(props={}){await render(UI.BoardView,{board:board(),run:e.emptyRun(),role:'solo',uid:'solo',...props});await click('[data-sandbox-start]');for(const id of ['heater','cloud','research','river','bridge'])await click('[data-sandbox-add="'+id+'"]');await click('[data-plan-preview] > summary');}
beforeAll(()=>{window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;const bundle=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardView} from './lesson_board_ui.jsx';export {PlanMapPreview,PlanMissionReview,PlanTradeoffs} from './lesson_board_plan_review.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'TestBoard',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});UI=new Function(bundle+';return TestBoard;')();});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;sessionStorage.clear();localStorage.clear();vi.restoreAllMocks();});

describe('Step-by-step projected board',()=>{
  it('rewinds resources, constructions, and new routes without touching actual play',async()=>{
    const run=e.emptyRun(),before=JSON.stringify(run),onMove=vi.fn(),onAnswer=vi.fn();await start({run,onMove,onAnswer});
    expect(node('[data-plan-map] [data-map-construction="bridge"]').dataset.built).toBe('true');
    expect(node('[data-board-map] [data-map-construction="bridge"]').dataset.built).toBe('false');
    expect(node('[data-plan-preview-opened]').textContent).toContain('Cycle mechanism');
    await point(2);expect(node('[data-plan-map] [data-map-construction="research"]').dataset.built).toBe('false');
    expect(node('[data-plan-preview] .lb-tokens').textContent).toContain('4 Observation tokens');
    await point(0);expect(node('[data-plan-preview-prev]').disabled).toBe(true);expect(node('[data-plan-preview] .lb-tokens').textContent).toContain('0 Observation tokens');
    await click('[data-plan-preview-next]');expect(node('[data-plan-preview-status]').textContent).toContain('after 1 of 5');
    expect(JSON.stringify(run)).toBe(before);expect(onMove).not.toHaveBeenCalled();expect(onAnswer).not.toHaveBeenCalled();expect(localStorage.length+sessionStorage.length).toBe(0);
  });
  it('keeps map selection inside the preview even for a learner in classroom play',async()=>{
    const onMove=vi.fn();await start({role:'student',uid:'learner',onMove});
    const target=node('.lb-current h3').textContent;await click('[data-plan-map] [data-location="sequence"]');
    expect(node('[data-plan-preview-selection]').textContent).toContain('Cycle mechanism');expect(node('.lb-current h3').textContent).toBe(target);expect(onMove).not.toHaveBeenCalled();
    await click('[data-plan-preview-list]');expect(node('[data-plan-map]').dataset.view).toBe('list');expect(node('[data-plan-map] [data-map-construction="bridge"]').textContent).toContain('Cycle mechanism');
  });
  it('resets to the current route when plans are switched or shortened',async()=>{
    await start();await point(1);await click('[data-sandbox-copy]');await click('[data-sandbox-plan="1"]');
    expect(node('[data-plan-preview-position]').value).toBe('5');await click('[data-sandbox-undo]');expect(node('[data-plan-preview-position]').value).toBe('4');
    expect(node('[data-plan-map] [data-map-construction="bridge"]').dataset.built).toBe('false');await click('[data-sandbox-plan="0"]');expect(node('[data-plan-preview-position]').value).toBe('5');
  });
  it('keeps the earlier preview while a real move makes the plan stale',async()=>{
    const b=board(),run=e.emptyRun();await start({board:b,run});const next=e.merge(run,e.begin(b,run,'cloud'));
    await render(UI.BoardView,{board:b,run:next,role:'solo',uid:'solo'});expect(node('[data-sandbox-stale]')).toBeTruthy();expect(node('[data-sandbox-inspect]').disabled).toBe(true);
    await point(0);expect(node('[data-plan-preview] .lb-tokens').textContent).toContain('0 Observation tokens');expect(node('[data-plan-map] [data-location="cloud"]').dataset.built).toBe('false');
  });
  it('does not reveal review-only pictures through a hypothetical successful response',async()=>{
    const raw={...support(),definitionMode:'review'};await start({support:raw});
    expect(node('[data-plan-map] [data-location="heater"] img')).toBeNull();
    const b=board(),base=simulatePlan(b,e.emptyRun(),['heater']).run;
    await render(UI.PlanMapPreview,{board:b,base,ids:['cloud'],title:'Plan A',support:raw,showImages:true});await click('[data-plan-preview] > summary');
    expect(node('[data-plan-map] [data-location="heater"] img')).toBeTruthy();
  });
  it('respects hiding pictures and removes the preview map when its disclosure closes',async()=>{
    await start({support:support()});expect(node('[data-plan-map] img')).toBeTruthy();await click('[data-board-images]');expect(node('[data-plan-map] img')).toBeNull();
    await click('[data-plan-preview] > summary');expect(node('[data-plan-map]')).toBeNull();
  });
  it('explains equal-length routes with different income and unmet expedition goals',async()=>{
    await start();await click('[data-sandbox-copy]');await click('[data-sandbox-plan="1"]');for(let i=0;i<3;i++)await click('[data-sandbox-undo]');for(const id of ['bridge','river','research'])await click('[data-sandbox-add="'+id+'"]');
    expect(node('[data-plan-tradeoffs]').textContent).toContain('same number of moves');expect(node('[data-plan-tradeoffs]').textContent).toContain('1 more Observation tokens');
    const a=node('[data-sandbox-comparison="0"]');expect(a.textContent).toContain('5 remaining locations');expect(a.querySelector('[data-plan-effect="research"]').textContent).toContain('1 extra Observation tokens');
    expect(node('[data-sandbox-comparison="1"] [data-plan-effect="research"]').textContent).toContain('0 extra Observation tokens');
  });
});
