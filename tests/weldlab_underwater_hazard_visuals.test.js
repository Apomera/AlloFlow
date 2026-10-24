import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'underwater', uw_view: 'safety' };
// Durable authored-note expectations: three unchanged notes and three narrowly sourced corrections.
const NOTES = [
  {
    "id": "shock",
    "title": "Electric shock",
    "detail": "Saltwater conducts. Wet welding is done on DC, normally electrode-negative (straight polarity), which also slows electrolytic corrosion of the electrode holder. Gear is fully insulated, and a topside knife switch keeps the circuit dead until the diver calls for it. AC is avoided because it is a greater shock hazard to the diver; follow AWS D3.6M and ADCI diving-safety practice."
  },
  {
    "id": "explosion",
    "title": "Hydrogen explosion",
    "detail": "Arc dissociates water into H₂ + O₂. If the gas pocket gets trapped (hull cavity, pipe), it can detonate. Multiple recorded fatalities. Procedures include venting cavities before lighting up."
  },
  {
    "id": "decompression",
    "title": "Decompression sickness",
    "detail": "Working at depth on compressed gas, the diver-welder must follow strict ascent / decompression schedules. \"Bends\" can cause permanent neurological damage or death. The dive team uses applicable tables and maintains a depth-time profile."
  },
  {
    "id": "cold",
    "title": "Hypothermia",
    "detail": "Cold water + long shifts (4-8h underwater is common). Dry suits, hot-water suits, and constant monitoring required."
  },
  {
    "id": "visibility",
    "title": "Visibility / disorientation",
    "detail": "Stirred-up sediment can cut visibility to inches. Surface-supplied divers need operational two-way voice communication with the surface team and continuous tending; a fixed check-in interval is not a substitute."
  },
  {
    "id": "collapse",
    "title": "Object strikes / collapse",
    "detail": "Strong currents, vessel surge and structural failure can injure or trap a diver. The dive plan must address site hazards, dive-team staffing and a means to recover an injured diver; team requirements depend on the diving operation."
  }
];
const MAPPING = { shock:['switch','circuit'], explosion:['cavity'], decompression:['diver','record'], cold:['diver'], visibility:['voice','diver'], collapse:['structure','recovery'] };
const STANDARDS = [
  'AWS D3.6M — code for underwater welding (defines Class A, B, O quality tiers)',
  'ANSI/ACDE-01 — Association of Commercial Diving Educators commercial-diver training standard',
  'OSHA 29 CFR 1910 Subpart T — Commercial Diving Operations',
  'ADCI Consensus Standards — Association of Diving Contractors International (industry baseline)',
];
let root, host;
const lens = (node = host) => node.querySelector('[data-uw-hazard]');
const pick = id => host.querySelector('[data-uw-hazard-pick="'+id+'"]');
const reading = () => host.querySelector('[data-uw-hazard-detail]');
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if(root) await React.act(()=>root.unmount()); root=null; host?.remove(); });
function render(extra = {}, contrast = false) { const node=document.createElement('div');node.innerHTML=renderTool('weldLab',{weldLab:{...BASE,...extra}},{isContrast:contrast});return node; }
async function mount(extra = {}, contrast = false) {
  let latest; const writes=[];
  function App() {
    const [data,setData]=React.useState({weldLab:{...BASE,...extra}});latest=data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({isContrast:contrast,toolData:data,setToolData:setData,
      update:(tool,key,value)=>{writes.push([key,value]);setData(prev=>({...prev,[tool]:{...prev[tool],[key]:value}}));},
    }));
  }
  host=document.createElement('div');document.body.append(host);root=ReactDOMClient.createRoot(host);await React.act(()=>root.render(React.createElement(App)));
  return {latest:()=>latest,writes};
}
async function click(node) {expect(node).toBeTruthy();await React.act(()=>node.click());}
async function tab(number) {await click([...host.querySelectorAll('[role="tab"]')].find(node=>node.textContent.startsWith(number+'. ')));}

describe('Underwater safety context lens',()=>{
  it('preserves the full warning, standards, six titles and all reference details',()=>{
    const node=render(), section=lens(node);expect(section.dataset.uwHazard).toBe('shock');
    expect(node.textContent).toContain('Underwater welding fatality rate is among the highest in any trade.');
    expect(node.textContent).toContain("Commercial diving is consistently counted among the most dangerous occupations. There is no single reliable \"times more deadly\" figure for diver-welders - numbers quoted online vary widely and are often unsourced - but the hazards stack: drowning + electric shock + decompression sickness + explosion risk + structural collapse + hypothermia. This isn't a scare tactic - it's why the training is strict and the pay is what it is.");
    STANDARDS.forEach(text=>expect(node.textContent).toContain(text));
    expect([...section.querySelectorAll('[data-uw-hazard-reference]')].map(node=>({id:node.dataset.uwHazardReference,title:node.querySelector('h4').textContent,detail:node.querySelector('[data-uw-hazard-reference-detail]').textContent}))).toEqual(NOTES);
    expect(section.querySelector('[data-uw-hazard-references] summary').textContent).toBe('Read all six hazard notes');
    expect(section.textContent).not.toContain('comm checks every 60 seconds');expect(section.textContent).not.toContain('Always two divers');
  });

  it('maps each of the six manual choices to its exact reading and highlighted context',async()=>{
    await mount();
    for(const note of NOTES){
      await click(pick(note.id));expect(lens().dataset.uwHazard).toBe(note.id);expect(reading().textContent).toBe(note.detail);expect(host.querySelector('#uw6-hazard-heading').textContent).toBe(note.title);
      const focus=lens().querySelector('[data-uw-hazard-focus]');expect(focus.dataset.uwHazardFocus).toBe(note.id);expect(focus.dataset.contexts.split(' ')).toEqual(MAPPING[note.id]);
      expect([...lens().querySelectorAll('[data-uw-hazard-context][data-highlighted="true"]')].map(node=>node.dataset.uwHazardContext)).toEqual(Object.keys({team:1,switch:1,circuit:1,diver:1,voice:1,record:1,cavity:1,structure:1,recovery:1}).filter(id=>MAPPING[note.id].includes(id)));
      expect(lens().querySelectorAll('[data-uw-hazard-pick][aria-pressed="true"]')).toHaveLength(1);expect(pick(note.id).getAttribute('aria-pressed')).toBe('true');
      expect(lens().querySelector('svg').getAttribute('aria-label')).toContain(host.querySelector('[data-uw-hazard-locations]').textContent.replace('Highlighted: ',''));
    }
  });

  it('keeps every diver, waterline, workpiece, switch and line coordinate fixed across every lens',async()=>{
    await mount();const base=lens().querySelector('[data-uw-hazard-base]').outerHTML;
    const ids=['waterline','platform','team','switch','circuit','voice','recovery','record','diver','structure','cavity','holder'];
    expect([...lens().querySelectorAll('[data-uw-hazard-object]')].map(node=>node.dataset.uwHazardObject)).toEqual(ids);
    for(const note of NOTES){await click(pick(note.id));expect(lens().querySelector('[data-uw-hazard-base]').outerHTML).toBe(base);}
    expect(lens().querySelector('[data-uw-hazard-scene]').getAttribute('viewBox')).toBe('0 0 720 340');
    expect(lens().querySelector('[data-uw-hazard-object="switch"] path').getAttribute('d')).toBe('M251 81 L271 58');
    expect(lens().textContent).toContain('The switch is drawn open and no arc is shown.');
  });

  it('contains no operational controls, depth schedule, energized arc or simulated particles',()=>{
    const section=lens(render());expect(section.querySelectorAll('button')).toHaveLength(6);expect(section.querySelector('input,select,canvas,animate,animateTransform,marker')).toBeNull();
    expect(section.querySelector('[data-uw-hazard-scene]').querySelectorAll('text')).toHaveLength(9);
    expect(section.textContent).toContain('Letters identify context, not operating steps.');expect(section.textContent).toContain('does not specify staffing, a dive profile or a recovery arrangement.');
    const source=readFileSync(resolve(SRC),'utf8');const start=source.indexOf('function renderHazardLens()'),end=source.indexOf('// ── Predict before you dive',start);const helper=source.slice(start,end);
    for(const call of ['requestAnimationFrame','setInterval','setTimeout','setDepth(','setTech(','setUwPred(','setUwDec('])expect(helper).not.toContain(call);
    expect(helper).toContain("working_at_depth_on_compressed_gas_the_r2");expect(helper).toContain("uw6_hazard_visibility_r2");expect(helper).toContain("uw6_hazard_collapse_r2");expect(helper).not.toContain("__alloT('stem.weldlab.stirred_up_sediment_can_cut_visibility'");expect(helper).not.toContain("__alloT('stem.weldlab.strong_currents_surge_from_passing_ves'");
  });

  it('uses local inspection state without writing existing depth, clocks, predictions or decisions',async()=>{
    const state={uw_depth:173,uw_tech:'dry',uw_probe_time:7.25,tech2_uw_pred:'same',tech2_uw_pred_from:15,tech2_uw_dec:{0:2,2:2},pipe2_stack:['root','hot']};const app=await mount(state);const snapshot=JSON.stringify(app.latest());
    for(const note of NOTES)await click(pick(note.id));expect(JSON.stringify(app.latest())).toBe(snapshot);expect(app.writes).toHaveLength(0);
    await tab(2);expect(lens()).toBeNull();expect(app.latest()).toMatchObject({...state,uw_view:'pressure'});await tab(4);expect(lens().dataset.uwHazard).toBe('collapse');expect(app.latest()).toMatchObject(state);
  });

  it('does not unlock the existing pressure prediction gate when exploring the safety view',async()=>{
    const app=await mount({tech2_uw_pred:'',uw_probe_time:9});await click(pick('decompression'));await tab(2);
    expect(host.textContent).toContain('Predict first');expect(host.querySelector('[data-uw-cooling-probe]')).toBeNull();expect(host.querySelector('[data-uw-workshop]')).toBeNull();expect(app.latest().tech2_uw_pred).toBe('');
    await click(button('Skip the prediction'));expect(app.latest().tech2_uw_pred).toBe('skip');expect(host.querySelector('[data-uw-cooling-probe]').dataset.uwCoolingProbe).toBe('9');
    await tab(4);await click(pick('shock'));await tab(2);expect(app.latest().tech2_uw_pred).toBe('skip');expect(host.querySelector('[data-uw-workshop]')).toBeTruthy();
  });

  it('preserves first-pick-final decisions, feedback reveal and scoring through hazard inspection',async()=>{
    const app=await mount({tech2_uw_dec:{}});await tab(3);const group=()=>host.querySelector('[role="radiogroup"][aria-label="Choices for job 1"]');
    expect(host.textContent).toContain('Score 0 / 0');expect(host.textContent).not.toContain('Why not B:');expect(group().querySelector('button').disabled).toBe(false);
    await click(group().querySelectorAll('button')[1]);expect(app.latest().tech2_uw_dec).toEqual({0:1});expect(host.textContent).toContain('Score 0 / 1');expect(host.textContent).toContain('Why not B:');expect([...group().querySelectorAll('button')].every(button=>button.disabled)).toBe(true);
    await tab(4);await click(pick('collapse'));await tab(3);await click(group().querySelectorAll('button')[0]);expect(app.latest().tech2_uw_dec).toEqual({0:1});expect(host.textContent).toContain('Score 0 / 1');
    await click(button('↺ Reset decisions'));await click(group().querySelectorAll('button')[0]);expect(app.latest().tech2_uw_dec).toEqual({0:0});expect(host.textContent).toContain('Score 1 / 1');
  });

  it('limits the explorer to Safety and leaves malformed saved physics inputs outside its fixed scene',()=>{
    for(const view of ['intro','pressure','decide','career','bad'])expect(lens(render({uw_view:view}))).toBeNull();
    const node=render({uw_depth:{depth:30},uw_tech:'bad',uw_probe_time:Infinity,tech2_uw_pred:{bad:1},tech2_uw_dec:[99]});expect(lens(node)).toBeTruthy();expect(lens(node).outerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);expect(lens(node).dataset.uwHazard).toBe('shock');
  });

  it('links directly to the three official communication, tending and planning sources',()=>{
    const links=[...lens(render()).querySelectorAll('[data-uw-hazard-source]')];expect(links.map(link=>link.getAttribute('href'))).toEqual(['https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.422','https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.425','https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.421']);
    links.forEach(link=>{expect(link.target).toBe('_blank');expect(link.rel).toBe('noopener noreferrer');});
  });

  it.each([false,true])('keeps native keyboard controls, full-size HTML readings and explicit focus contrast (contrast=%s)',async contrast=>{
    await mount({},contrast);const section=lens(), edge=contrast?'#ffff00':'#9f1239';
    expect(section.style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(section.style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(255, 241, 242)');
    for(const button of section.querySelectorAll('button')){expect(button.type).toBe('button');expect(button.style.minHeight).toBe('44px');expect(button.getAttribute('aria-controls')).toBe('uw6-hazard-reading');expect(button.tabIndex).toBe(0);button.focus();expect(document.activeElement).toBe(button);}
    expect(reading().tagName).toBe('P');expect(reading().className).toContain('text-base');expect(section.querySelector('[data-uw-hazard-reading]').getAttribute('aria-live')).toBe('polite');expect(section.querySelectorAll('[data-uw-hazard-context]')).toHaveLength(9);
    expect(section.querySelector('style').textContent).toContain('outline: 3px solid '+edge+' !important');expect(section.querySelector('style').textContent).toContain('transition-property: none !important; animation: none !important;');
    expect(section.querySelector('svg').style.width).toBe('100%');expect(section.querySelector('svg').getAttribute('role')).toBe('img');expect(section.querySelector('summary').style.minHeight).toBe('44px');
  });
});
