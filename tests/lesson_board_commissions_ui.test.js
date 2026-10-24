import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;
const board=()=>({...makeBoard(),playStyle:'tabletop',chance:true,goal:'expedition'}),find=selector=>element.querySelector(selector);
function move(b,run,id,die=1){
  if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(b,run));
  run=engine.merge(run,engine.begin(b,run,id));
  if(engine.stepOf(run).phase==='answer'){
    run=engine.merge(run,engine.processAction(b,run,{attemptId:'commission-ui',turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:id,value:engine.solution(b.locations.find(item=>item.id===id))},'solo',{attemptId:'commission-ui',active:true}));
    run=engine.merge(run,engine.resolve(b,run,{solo:{}},{dice:[die,1]}));
  }
  return run;
}
function pending(b,die=6){return move(b,move(b,engine.emptyRun(),'heater'),'cloud',die);}
async function render(props){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  await act(async()=>root.render(React.createElement(UI.FieldEncounter,{t:key=>key,...props})));
}
const click=async selector=>{expect(find(selector)).toBeTruthy();await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {FieldEncounter} from './lesson_board_encounters_ui.jsx';export {forecastTabletopMove} from './lesson_board_tactical_preview.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'CommissionUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return CommissionUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Construction commission decisions',()=>{
  it('compares named projects, sites, payment and reserved rewards without mutating or accepting',async()=>{
    const b=board(),run=pending(b),offers=engine.fieldOpportunity(b,run).commissions,before=JSON.stringify({b,run}),onChoose=vi.fn(),onInspect=vi.fn();
    await render({board:b,run,onChoose,onInspect});expect(find('[data-field-commission-offer]')).toBeNull();await click('[data-field-approach=commission]');
    expect(find('[data-field-commission-preview]').dataset.fieldCommissionPreview).toBe(offers[0].projectId);
    await click('[data-field-commission-option="'+offers[1].projectId+'"]');
    expect(find('[data-field-commission-preview]').dataset.fieldCommissionPreview).toBe(offers[1].projectId);
    expect(find('[data-field-commission-preview]').textContent).toContain('Printed construction cost');
    expect(find('[data-field-commission-preview]').textContent).toContain('Reserved commission reward');
    expect(find('[data-commission-site]').textContent).toContain('Build at');
    await click('[data-commission-inspect="'+offers[1].projectId+'"]');
    expect(onInspect).toHaveBeenCalledExactlyOnceWith(offers[1].projectId);expect(onChoose).not.toHaveBeenCalled();expect(JSON.stringify({b,run})).toBe(before);
    await click('[data-field-approach=collect]');expect(find('[data-field-commission-offer]')).toBeNull();await click('[data-field-approach=commission]');expect(find('[data-field-commission-option="'+offers[1].projectId+'"]').checked).toBe(true);
  });
  it('accepts only the selected project and focuses its confirmed receipt without adding supplies',async()=>{
    const b=board(),run=pending(b),offer=engine.fieldOpportunity(b,run).commissions[1],onChoose=vi.fn();
    await render({board:b,run,onChoose});await click('[data-field-approach=commission]');await click('[data-field-commission-option="'+offer.projectId+'"]');find('[data-field-commission-commit]').focus();await click('[data-field-commission-commit]');
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('commission:'+offer.projectId);
    expect(find('[data-field-commission-receipt]')).toBeNull();
    const next=engine.merge(run,engine.chooseFieldOpportunity(b,run,'commission:'+offer.projectId));await render({board:b,run:next,onChoose});
    expect(find('[data-field-commission-offer]')).toBeNull();expect(document.activeElement).toBe(find('[data-field-receipt] h4'));
    expect(find('[data-field-receipt] h4').textContent).toBe('Construction commission accepted');
    expect(find('[data-field-commission-receipt]').textContent).toContain('no supplies were added');
    expect(engine.derive(b,next).balance).toEqual(engine.derive(b,run).balance);
  });
  it('blocks acceptance for students and paused teachers while allowing local project comparison and inspection',async()=>{
    const b=board(),run=pending(b),onChoose=vi.fn(),onInspect=vi.fn(),id=engine.fieldOpportunity(b,run).commissions[1].projectId;
    for(const props of [{role:'student'},{role:'teacher',locked:true},{role:'solo',locked:true}]){
      await render({board:b,run,onChoose,onInspect,...props});await click('[data-field-approach=commission]');expect(find('[data-field-commission-commit]').disabled).toBe(true);expect(find('[data-field-commission-option="'+id+'"]').disabled).toBe(false);await click('[data-field-commission-option="'+id+'"]');expect(find('[data-field-commission-preview]').dataset.fieldCommissionPreview).toBe(id);await click('[data-field-commission-commit]');await click('[data-commission-inspect]');
    }
    expect(onChoose).not.toHaveBeenCalled();expect(onInspect).toHaveBeenCalledTimes(3);
  });
  it('shows an active reminder between turns, then an explicit commission payout receipt',async()=>{
    const b=board();let run=pending(b);const offer=engine.fieldOpportunity(b,run).commissions.find(item=>item.projectId==='research');
    run=engine.merge(run,engine.chooseFieldOpportunity(b,run,'commission:research'));run=engine.merge(run,engine.advance(b,run));
    await render({board:b,run});expect(find('[data-field-commission-reminder]').textContent).toContain('Research station');
    run=move(b,run,'heater');run=move(b,run,'research');await render({board:b,run});
    expect(find('[data-field-commission-reminder]')).toBeNull();const paid=find('[data-field-delivery-kind=commission]');
    expect(paid.querySelector('h4').textContent).toBe('Construction commission completed');expect(paid.textContent).toContain('Research station');
    expect(engine.derive(b,run).fieldDeliveries.find(item=>item.kind==='commission').gain).toEqual(offer.reward);
  });
  it('keeps the full payment shortfall visible even when the promised reward would cover it',async()=>{
    const b=board();b.projects.forEach(project=>{project.cost=[12,12];});const run=pending(b);
    await render({board:b,run,onChoose:vi.fn()});await click('[data-field-approach=commission]');expect(find('[data-commission-funding=shortfall]')).toBeTruthy();
    expect(find('[data-field-commission-preview]').textContent).toContain('cannot fund that payment');expect(find('[data-field-commission-commit]').disabled).toBe(false);
  });
  it('previews an exchange-funded construction for the named commission without borrowing its reward',async()=>{
    const b=board();b.goal='architect';b.projects.find(project=>project.id==='network').cost=[3,3];b.projects.find(project=>project.id==='bridge').cost=[7,2];b.projects.find(project=>project.id==='research').cost=[6,3];
    // The completion reserve counts later projects' exchange funding, so only the research exchange is legal here (printed cost is unaffordable).
    const run=pending(b,8),before=JSON.stringify(run),onChoose=vi.fn();expect(engine.constructionFunding(b,run,'network').filter(option=>option.legal).map(option=>option.id)).toEqual(['research']);
    await render({board:b,run,onChoose});await click('[data-field-approach=commission]');await click('[data-field-commission-option=network]');
    expect(find('[data-commission-funding=funded]')).toBeTruthy();expect(onChoose).not.toHaveBeenCalled();expect(JSON.stringify(run)).toBe(before);
  });
  it('offers commissions only in supplies and rendezvous encounters and resets drafts for a new draw',async()=>{
    const b=board();await render({board:b,run:pending(b),onChoose:vi.fn()});await click('[data-field-approach=commission]');const offers=engine.fieldOpportunity(b,pending(b)).commissions;await click('[data-field-commission-option="'+offers[1].projectId+'"]');
    await render({board:b,run:pending(b,16),onChoose:vi.fn()});expect(find('[data-field-approach=collect]').getAttribute('aria-pressed')).toBe('true');await click('[data-field-approach=commission]');expect(find('[data-field-commission-preview]').dataset.fieldCommissionPreview).toBe(engine.fieldOpportunity(b,pending(b,16)).commissions[0].projectId);
    for(const die of [1,11]){await render({board:b,run:pending(b,die),onChoose:vi.fn()});expect(find('[data-field-commission-offer]')).toBeNull();expect(find('[data-field-approach=commission]')?.disabled??true).toBe(true);}
  });
  it('preserves focus moved elsewhere while an accepted choice is waiting for shared confirmation',async()=>{
    const b=board(),run=pending(b),offer=engine.fieldOpportunity(b,run).commissions[0],onChoose=vi.fn();await render({board:b,run,onChoose});await click('[data-field-approach=commission]');find('[data-field-commission-commit]').focus();await click('[data-field-commission-commit]');
    const outside=document.createElement('button');document.body.append(outside);outside.focus();
    await render({board:b,run:engine.merge(run,engine.chooseFieldOpportunity(b,run,'commission:'+offer.projectId)),onChoose});expect(document.activeElement).toBe(outside);outside.remove();
  });
  it('includes only the matching reserved reward in a legal construction forecast',()=>{
    const b=board();let run=pending(b);const offer=engine.fieldOpportunity(b,run).commissions.find(item=>item.projectId==='research');run=engine.merge(run,engine.chooseFieldOpportunity(b,run,'commission:research'));run=move(b,run,'heater');
    const before=JSON.stringify(run),forecast=UI.forecastTabletopMove(b,run,'research');expect(forecast.commissionGain).toEqual(offer.reward);expect(forecast.spent).toEqual([3,1]);
    expect(UI.forecastTabletopMove(b,run,'bridge').commissionGain).toEqual([0,0]);
    expect(engine.derive(b,move(b,run,'research')).balance).toEqual(forecast.balance);expect(JSON.stringify(run)).toBe(before);
  });
});
