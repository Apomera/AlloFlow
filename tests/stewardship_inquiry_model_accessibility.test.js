import { afterEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts=[];
afterEach(()=>{for(const {root,host} of mounts.splice(0)){act(()=>root.unmount());host.remove();}});
async function mount(iq={}){
  resetStemLab();const tool=loadTool(process.env.STEWARDSHIP_SOURCE||'stem_lab/stem_tool_stewardship.js','stewardshipHub'),store=newStore(),host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host);mounts.push({root,host});let latest,setLatest;
  function Host(){const [state,setState]=React.useState({stewardshipHub:{tutorialSeen:true,stewIQ:{investment:50,timeHorizon:10,communityBuyin:5,interventionComplexity:5,hypothesis:'Keep my hypothesis.',explanation:'Keep my explanation.',log:[{t:'12:00',inv:50,hor:10,comm:5,ic:5,odds:'47',state:'Tenuous'}],...iq}},ecosystem:{conserve:{phase:'playing',year:4,custom:'keep'}}});latest=state;setLatest=setState;return tool.render(makeCtx({toolData:state,setToolData:setState},store));}
  await act(async()=>root.render(React.createElement(Host)));host.querySelector('[data-stewardship-inquiry]').open=true;
  return {host,state:()=>latest,panel:()=>host.querySelector('[data-stewardship-inquiry-model]'),update:patch=>act(async()=>setLatest(old=>({...old,stewardshipHub:{...old.stewardshipHub,stewIQ:{...old.stewardshipHub.stewIQ,...patch}}}))),factor:key=>host.querySelector('[data-stewardship-model-factor="'+key+'"] td').textContent,total:()=>host.querySelector('[data-stewardship-model-total] td').textContent,displayed:()=>host.querySelector('[data-stewardship-model-displayed] td').textContent};
}
async function activate(el){await act(async()=>{el.focus();el.click();});}
describe('Stewardship inquiry model explanation',()=>{
  it('provides a native disclosure and table with readable units and header associations',async()=>{
    const t=await mount(),panel=t.panel();expect(panel.open).toBe(false);expect(panel.querySelector('summary').textContent).toBe('How this model is calculated');
    expect(panel.querySelector('caption').textContent).toBe('Success model contributions');expect(panel.querySelectorAll('thead th[scope=col]')).toHaveLength(2);expect(panel.querySelectorAll('tbody th[scope=row]')).toHaveLength(7);
    expect(panel.textContent).toContain('Percentage points');expect(panel.textContent).toContain('unitless comparison score');await activate(panel.querySelector('summary'));expect(panel.open).toBe(true);expect(document.activeElement).toBe(panel.querySelector('summary'));
  });
  it('shows the existing model weights and correct ROI arithmetic for the default project',async()=>{
    const t=await mount();expect(['baseline','investment','time','community','complexity'].map(t.factor)).toEqual(['+20.0','+15.0','+7.0','+12.5','-7.5']);expect(t.total()).toBe('47.0');expect(t.displayed()).toBe('47%');
    expect(t.host.querySelector('[data-stewardship-model-roi-values]').textContent).toBe('10 × 5 × 0.05 − 50 ÷ 1000 = 2.45');expect(t.host.querySelector('[data-stewardship-model-roi-formula]').textContent).toContain('(investment in $K ÷ 1000)');
    const chart=t.host.querySelector('[data-stewardship-inquiry-chart]');expect(chart.textContent).toContain('ROI proxy: 2.45');expect(chart.textContent).not.toContain('time × community / investment');
  });
  it('explains the limit without displaying a percentage above 100 or changing saved inputs',async()=>{
    const t=await mount({investment:500,timeHorizon:50,communityBuyin:10,interventionComplexity:0});expect(t.total()).toBe('230.0');expect(t.displayed()).toBe('100%');expect(t.host.querySelector('[data-stewardship-inquiry-outcome]').textContent).toContain('100%');expect(t.state().stewardshipHub.stewIQ.investment).toBe(500);
  });
  it('shows low contributions and a negative ROI proxy without hiding the sign',async()=>{
    const low=await mount({investment:1,timeHorizon:1,communityBuyin:0,interventionComplexity:10});expect(low.total()).toBe('6.0');expect(low.displayed()).toBe('6%');
    const high=await mount({investment:500,timeHorizon:1,communityBuyin:0,interventionComplexity:10});expect(high.host.querySelector('[data-stewardship-model-roi-values]').textContent).toBe('1 × 0 × 0.05 − 500 ÷ 1000 = -0.50');
  });
  it('updates readable calculations while retaining disclosure focus, writing, history and other campaigns',async()=>{
    const t=await mount(),summary=t.panel().querySelector('summary');await activate(summary);const before=JSON.stringify({campaign:t.state().ecosystem,log:t.state().stewardshipHub.stewIQ.log});await t.update({investment:100,timeHorizon:20});
    expect(t.factor('investment')).toBe('+30.0');expect(t.factor('time')).toBe('+14.0');expect(t.total()).toBe('69.0');expect(t.displayed()).toBe('69%');expect(t.panel().open).toBe(true);expect(document.activeElement).toBe(summary);expect(t.state().stewardshipHub.stewIQ.hypothesis).toBe('Keep my hypothesis.');expect(JSON.stringify({campaign:t.state().ecosystem,log:t.state().stewardshipHub.stewIQ.log})).toBe(before);
  });
  it('keeps disclosure targets unique across instances and opens only the activated explanation',async()=>{
    const a=await mount(),b=await mount();expect(a.panel().id).not.toBe(b.panel().id);await activate(b.panel().querySelector('summary'));expect(b.panel().open).toBe(true);expect(a.panel().open).toBe(false);expect(document.activeElement).toBe(b.panel().querySelector('summary'));
  });
});
