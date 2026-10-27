import { afterEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts=[];
afterEach(()=>{for(const {root,host} of mounts.splice(0)){act(()=>root.unmount());host.remove();}});
async function mount({data={},hub={},t}={}){
 resetStemLab();const tool=loadTool(process.env.STEWARDSHIP_SOURCE||'stem_lab/stem_tool_stewardship.js','stewardshipHub'),store=newStore(),host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host);mounts.push({root,host});let latest;
 function Host(){const [state,setState]=React.useState({...data,stewardshipHub:{tutorialSeen:true,launchedAny:true,stewIQ:{hypothesis:'Keep my work.'},...hub}});latest=state;return tool.render(makeCtx({toolData:state,setToolData:setState,...(t?{t}:{})},store));}
 await act(async()=>root.render(React.createElement(Host)));
 return {host,state:()=>latest,action:key=>host.querySelector('[data-stewardship-action="'+key+'"]'),card:key=>host.querySelector('[data-stewardship-campaign="'+key+'"]'),summary:()=>host.querySelector('[data-stewardship-progress-summary]'),heading:()=>host.querySelector('[data-stewardship-heading=tutorial]')};
}
async function activate(el){await act(async()=>{el.focus();el.click();});}
function activeTotals(t){return {header:[...t.host.querySelectorAll('.stewardship-metric')].find(el=>el.querySelector('.stewardship-metric-label').textContent==='In progress').querySelector('strong').textContent,summary:[...t.summary().querySelectorAll('dt')].find(el=>el.textContent==='In progress').nextElementSibling.textContent};}
const mixed={ecosystem:{conserve:{phase:'year',year:3,maxYears:10}},epidemicSim:{outbreak:{phase:'week',week:2,maxWeeks:26}},climateExplorer:{pathway:{phase:'year',year:3,maxYears:8}}};
describe('Stewardship progress clarity and tutorial orientation',()=>{
 it('counts active scenarios alongside Maine campaigns in both progress summaries',async()=>{
  const t=await mount({data:mixed,hub:{scenarioStates:{liberia:{phase:'playing',step:1},yarralin:{phase:'playing',step:2}}}});expect(activeTotals(t)).toEqual({header:'5',summary:'5'});expect(t.state().stewardshipHub.stewIQ.hypothesis).toBe('Keep my work.');expect(t.state().epidemicSim).toEqual(mixed.epidemicSim);
 });
 it('shows a paused scenario even when no Maine campaign has started',async()=>{
  const t=await mount({hub:{scenarioStates:{liberia:{phase:'playing',step:1}}}});expect(activeTotals(t)).toEqual({header:'1',summary:'1'});
 });
 it('excludes completed and not-started work from active totals',async()=>{
  const t=await mount({data:{ecosystem:{conserve:{phase:'debrief',finalOutcome:{tier:'recovery',label:'Recovered'}}},fireEcology:{mosaic:{phase:'setup'}}},hub:{scenarioStates:{liberia:{phase:'debrief',outcome:{tier:'strong',label:'Completed'}},yarralin:null}}});expect(activeTotals(t)).toEqual({header:'0',summary:'0'});
 });
 it('preserves the existing active status of an explicitly saved scenario briefing',async()=>{
  const t=await mount({hub:{scenarioStates:{yarralin:{phase:'briefing'}}}});expect(activeTotals(t)).toEqual({header:'1',summary:'1'});expect(t.state().stewardshipHub.scenarioStates.yarralin).toEqual({phase:'briefing'});
 });
 it('pairs every aggregate label and value in a native definition list',async()=>{
  const t=await mount();expect(t.summary().tagName).toBe('DL');expect(t.summary().querySelectorAll('dt')).toHaveLength(4);expect(t.summary().querySelectorAll('dd')).toHaveLength(4);for(const label of t.summary().querySelectorAll('dt')){expect(label.nextElementSibling.tagName).toBe('DD');expect(label.nextElementSibling.textContent.length).toBeGreaterThan(0);}
 });
 it('distinguishes outbreak weeks, climate periods, and annual campaign years',async()=>{
  const t=await mount({data:mixed});expect(t.card('outbreak').textContent).toContain('Week 2 of 26');expect(t.card('pathway').textContent).toContain('Period 3 of 8');expect(t.card('conserve').textContent).toContain('Year 3 of 10');expect(t.card('outbreak').textContent).not.toContain('Year 2 of 26');expect(t.state().climateExplorer).toEqual(mixed.climateExplorer);
 });
 it('uses localized period units and tour step text',async()=>{
  const tr=(key,fb)=>({'stem.stewardship.week_label':'Semaine','stem.stewardship.period_label':'Période','stem.stewardship.year_label':'Année','stem.stewardship.of':'sur','stem.stewardship.tour_step_counter':'Étape {step} sur {total}'}[key]||fb);const t=await mount({data:mixed,t:tr});expect(t.card('outbreak').textContent).toContain('Semaine 2 sur 26');expect(t.card('pathway').textContent).toContain('Période 3 sur 8');await activate(t.action('tour'));expect(t.host.querySelector('[data-stewardship-tour-step]').textContent).toBe('Étape 1 sur 5');
 });
 it.each([
  ['outbreak','epidemicSim','weekLog',{week:2,event:'Community clinics'},'Week 2: Community clinics'],
  ['pathway','climateExplorer','yearLog',{year:3,event:'Clean grid review'},'Period 3: Clean grid review'],
  ['conserve','ecosystem','yearLog',{year:4,event:'Habitat review'},'Year 4: Habitat review']
 ])('uses the correct recorded time unit in the %s report',async(id,tool,logField,entry,expected)=>{
  const logs=Object.freeze([Object.freeze(entry)]),data={[tool]:{[id]:{phase:'debrief',finalOutcome:{label:'Completed'},[logField]:logs}}};const t=await mount({data,hub:{viewingReport:id}});expect(t.host.querySelector('[data-stewardship-report]').textContent).toContain(expected);expect(t.state()[tool][id][logField]).toBe(logs);
 });
 it('associates every focused tutorial heading with its visible step counter',async()=>{
  const t=await mount({data:mixed});const saved=JSON.stringify(t.state().ecosystem);await activate(t.action('tour'));for(let i=1;i<=5;i++){const heading=t.heading(),counter=t.host.querySelector('[data-stewardship-tour-step]');expect(heading.getAttribute('aria-describedby')).toBe(counter.id);expect(counter.textContent).toBe('Step '+i+' of 5');expect(document.activeElement).toBe(heading);if(i<5)await activate(t.action('tutorial-next'));}await activate(t.action('tutorial-next'));expect(document.activeElement).toBe(t.action('tour'));expect(JSON.stringify(t.state().ecosystem)).toBe(saved);
 });
 it('keeps tutorial descriptions scoped to their own mounted instance',async()=>{
  const a=await mount({hub:{tutorialStep:0}}),b=await mount({hub:{tutorialStep:3}});const ca=a.host.querySelector('[data-stewardship-tour-step]'),cb=b.host.querySelector('[data-stewardship-tour-step]');expect(ca.id).not.toBe(cb.id);expect(a.heading().getAttribute('aria-describedby')).toBe(ca.id);expect(b.heading().getAttribute('aria-describedby')).toBe(cb.id);expect(cb.textContent).toBe('Step 4 of 5');
 });
});
