import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {simulatePlan} from '../lesson_board_sandbox.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;
const board=()=>({...makeBoard(),playStyle:'tabletop',goal:'expedition'}),find=selector=>element.querySelector(selector);
function answer(b,run,success=true){
  const step=engine.stepOf(run),node=b.locations.find(item=>item.id===step.targetId),solution=engine.solution(node);
  run=engine.merge(run,engine.processAction(b,run,{attemptId:'a',requestId:engine.requestId(run),turn:run.turn,kind:'answer',targetId:node.id,value:success?solution:solution==='0'?'1':'0'},'solo',{attemptId:'a',active:true}));
  return engine.merge(run,engine.resolve(b,run,{solo:{}}));
}
function move(b,run,id,success=true){
  if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(b,run));
  run=engine.merge(run,engine.begin(b,run,id));
  return engine.stepOf(run).phase==='answer'?answer(b,run,success):run;
}
const ready=b=>move(b,move(b,move(b,engine.emptyRun(),'heater'),'cloud'),'heater');
const built=b=>move(b,ready(b),'research');
async function render(props={}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  const b=props.board||board(),run=props.run||engine.emptyRun();
  await act(async()=>root.render(React.createElement(UI.BoardMap,{board:b,run,progress:engine.derive(b,run),ready:engine.targets(b,run).map(item=>item.id),selected:'research',view:'tabletop',Icon:()=>null,t:key=>key,...props})));
}
const click=async selector=>{await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardMap} from './lesson_board_map.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'ConstructionImpactUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return ConstructionImpactUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Construction consequences on the tabletop',()=>{
  it('marks selected blueprint potential separately from printed base supplies and actual income',async()=>{
    const b=board(),run=ready(b),before=JSON.stringify({b,run}),onSelect=vi.fn();await render({board:b,run,onSelect});
    const stamp=find('[data-production-stamp="rain"]');expect(stamp.dataset.productionState).toBe('blueprint');expect(stamp.dataset.productionProject).toBe('research');expect(stamp.dataset.productionResource).toBe('0');
    expect(stamp.getAttribute('aria-hidden')).toBe('true');expect(find('[data-production-total]')).toBeNull();
    expect([...find('[data-resource-cache="rain"]').querySelectorAll('[data-resource-amount]')].map(node=>node.dataset.resourceAmount)).toEqual(['2','1']);
    expect(find('[data-production-caption]').textContent).toContain('After building Research station: +1 Observation tokens on a successful investigation');
    expect(find('[data-production-potential="research"]').textContent).toContain('After construction: up to 6 extra Observation tokens');
    expect(find('[data-location="rain"]').getAttribute('aria-label')).toContain('After building Research station');
    expect(find('[data-production-stamp="heater"]')).toBeNull();await click('[data-location="rain"]');
    expect(onSelect).toHaveBeenCalledWith('rain');expect(JSON.stringify({b,run})).toBe(before);
    await render({board:b,run,selected:'rain'});expect(find('[data-production-stamp]')).toBeNull();expect(find('[data-production-caption]')).toBeNull();
  });

  it('shows built income only after successful new investigations and preserves it through retries and travel',async()=>{
    const b=board();let run=built(b);await render({board:b,run});
    expect(find('[data-production-total="research"]').dataset.productionCount).toBe('0');
    expect(find('[data-production-stamp="rain"]').dataset.productionState).toBe('built');
    expect(find('[data-production-earned="research"]').textContent).toContain('Supplied so far: 0 Observation tokens');
    run=move(b,run,'rain',false);await render({board:b,run});
    expect(find('[data-production-total="research"]').dataset.productionCount).toBe('0');
    run=engine.merge(run,engine.retry(b,run));run=answer(b,run);await render({board:b,run});
    expect(find('[data-production-total="research"]').dataset.productionCount).toBe('1');
    expect(find('[data-production-earned="research"]').textContent).toContain('Supplied so far: 1 Observation tokens');
    expect(find('[data-production-stamp="rain"]')).toBeNull();
    run=move(b,run,'cloud');await render({board:b,run});expect(find('[data-production-total="research"]').dataset.productionCount).toBe('1');
    const before=JSON.stringify(run);for(const camera of ['left','right','overhead','angle'])await click('[data-tabletop-camera="'+camera+'"]');
    expect(find('[data-production-total="research"]').dataset.productionCount).toBe('1');expect(JSON.stringify(run)).toBe(before);
  });

  it('offers equivalent construction totals and conditional effects in 2D and list views',async()=>{
    const b=board(),run=move(b,built(b),'rain'),onSelect=vi.fn();
    for(const view of ['board','list']){
      await render({board:b,run,view,onSelect});
      expect(find('[data-construction-impact="research"]').textContent).toContain('Supplied so far: 1 Observation tokens');
      if(view==='list'){
        expect(find('[data-production-total]')).toBeNull();
        expect(find('[data-production-list-total="research"]').textContent).toContain('1 Observation tokens');
        expect(find('[data-production-list-effect="river"]').textContent).toContain('From Research station: +1 Observation tokens');
      }else expect(find('[data-map-construction="research"]').getAttribute('aria-label')).toContain('Supplied so far: 1 Observation tokens');
      await click('[data-map-construction="research"]');
    }
    expect(onSelect).toHaveBeenCalledTimes(2);expect(onSelect).toHaveBeenLastCalledWith('research');
  });

  it('keeps the ledger on symbol-based miniatures and distinguishes the second resource',async()=>{
    const b=board();let run=move(b,ready(b),'river');run=move(b,run,'cloud');run=move(b,run,'network');
    const support={assets:{network:'https://example.test/network.png'},art:{symbols:{network:'network'}}};
    await render({board:b,run,selected:'network',support});
    expect(find('[data-map-construction="network"] img')).toBeTruthy();
    expect(find('[data-production-total="network"]').dataset.productionResource).toBe('1');
    expect(find('[data-production-stamp="rain"]').dataset.productionResource).toBe('1');
    expect(find('[data-production-caption]').textContent).toContain('+1 Connection tokens');
  });

  it('labels sandbox income as projected and leaves the actual game unchanged',async()=>{
    const b=board(),actual=engine.merge(built(b),engine.advance(b,built(b))),saved=JSON.stringify(actual),plan=simulatePlan(b,actual,['rain']);
    expect(plan.steps).toHaveLength(1);await render({board:b,run:plan.run,progress:plan.progress,projection:true});
    expect(find('[data-production-total="research"]').dataset.productionScope).toBe('projected');
    expect(find('[data-construction-impact="research"]').dataset.impactScope).toBe('projected');
    expect(find('[data-production-earned="research"]').textContent).toContain('Projected total supplied: 1 Observation tokens');
    expect(find('[data-production-caption]').textContent).toContain('Projection: From Research station');
    expect(find('[data-production-stamp="river"]').dataset.productionScope).toBe('projected');
    expect(find('[data-map-construction="research"]').getAttribute('aria-label')).toContain('Projected total supplied');
    expect(JSON.stringify(actual)).toBe(saved);await render({board:b,run:actual});
    expect(find('[data-production-total="research"]').dataset.productionCount).toBe('0');
  });

  it('preserves earned totals but offers no future supplies after the expedition is completed',async()=>{
    const b={...board(),goal:'core'};let run=move(b,built(b),'rain');for(const id of ['heater','bridge','heater'])run=move(b,run,id);
    expect(engine.derive(b,run).complete).toBe(true);await render({board:b,run});
    expect(find('[data-production-total="research"]').dataset.productionCount).toBe('1');
    expect(find('[data-production-potential="research"]').dataset.productionMaximum).toBe('0');
    expect(find('[data-production-potential="research"]').textContent).toContain('No further production');
    expect(find('[data-production-stamp]')).toBeNull();expect(find('[data-production-caption]')).toBeNull();
  });

  it('highlights only a selected built engine bridge and reports actual use without inventing crossings',async()=>{
    const b=board();let run=ready(b);await render({board:b,run,selected:'bridge'});
    expect(find('[data-shortcut-preview="bridge"]')).toBeTruthy();expect(find('[data-construction-impact-route]')).toBeNull();
    run=move(b,run,'bridge');await render({board:b,run,selected:'bridge'});
    expect(find('[data-construction-impact-route="bridge"]').dataset.builtRoute).toBe('bridge');
    expect(find('[data-construction-impact="bridge"]').textContent).toContain('has not been crossed yet');
    run=move(b,run,'sequence');await render({board:b,run,selected:'bridge'});
    expect(find('[data-construction-impact="bridge"]').textContent).toBe('The party has crossed this bridge.');
    await render({board:b,run,selected:'sequence'});expect(find('[data-construction-impact-route]')).toBeNull();
    await render({board:b,run,selected:'bridge',view:'list'});expect(find('[data-construction-impact="bridge"]').textContent).toContain('has crossed');
  });

  it('does not attach authoritative earnings to a supplied snapshot that disagrees with the saved run',async()=>{
    const b=board(),run=ready(b),progress={...engine.derive(b,run),built:['research'],usedProjects:['research']};
    await render({board:b,run,progress});
    expect(find('[data-map-construction="research"]').dataset.built).toBe('true');
    expect(find('[data-production-total]')).toBeNull();expect(find('[data-production-stamp]')).toBeNull();expect(find('[data-construction-impact]')).toBeNull();
  });
});
