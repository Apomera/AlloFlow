import { stripClauseTrace } from './helpers/weldlab_clause_trace_restore.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC=process.env.WELDLAB_SRC||'stem_lab/stem_tool_weldlab.js';
const baseline=JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-wps-example-baseline.json'),'utf8'));
const BASE={view:'codes',insp2_codesTab:'flow',insp2_wpsField:'base'};
const EXAMPLES=[['coupon',.375,'3/8',1],['upper',.75,'3/4',2],['proposal',1.5,'1-1/2',4]];
let host,root;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;delete window.__alloflowWeldLab;localStorage.clear();resetStemLab();loadTool(SRC,'weldLab');});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;host?.remove();});
const panel=(node=host)=>node.querySelector('[data-wps-thickness]');
const $=selector=>panel().querySelector(selector);
const num=(node,attr)=>Number(node.getAttribute(attr));
async function mount(extra={},contrast=false){let latest;const writes=[];
 function App(){const[data,setData]=React.useState({weldLab:{...BASE,...extra}});latest=data.weldLab;return window.StemLab._registry.weldLab.render(makeCtx({toolData:data,setToolData:setData,isContrast:contrast,update:(bucket,key,value)=>{writes.push([key,value]);setData(prev=>({...prev,[bucket]:{...prev[bucket],[key]:value}}));}}));}
 host=document.createElement('div');document.body.append(host);root=ReactDOMClient.createRoot(host);await React.act(()=>root.render(React.createElement(App)));return{latest:()=>latest,writes};}
function render(extra={},contrast=false){const node=document.createElement('div');node.innerHTML=renderTool('weldLab',{weldLab:{...BASE,...extra}},{isContrast:contrast});return node;}
async function click(node){expect(node).toBeTruthy();await React.act(()=>node.click());}
async function preset(id){await click($('[data-wps-thickness-preset="'+id+'"]'));}
function textButton(text){return [...host.querySelectorAll('button')].find(el=>el.textContent===text);}
async function tab(id){const labels={flow:'🔁 WPS → PQR → WPQ',sort:'🗂 Essential Variable Sorter',clause:'🔎 Find the clause',read:'📖 Code reader'};await click(textButton(labels[id]));}
function fixedGeometry(){return [...panel().querySelectorAll('[data-wps-thickness-bar="coupon"],[data-wps-thickness-upper],[data-wps-thickness-baseline],[data-wps-thickness-scale-axis],[data-wps-thickness-tick]')].map(node=>[node.tagName,...['x','y','width','height','x1','y1','x2','y2'].map(attr=>node.getAttribute(attr))]);}
function checkGeometry(value,ratio){const scale=num(panel(),'data-scale');expect(scale).toBe(112);
 for(const[id,thickness,multiple]of [['coupon',.375,1],['comparison',value,ratio]]){const bar=$('[data-wps-thickness-bar="'+id+'"]');expect(num(bar,'data-value')).toBe(thickness);expect(num(bar,'data-ratio')).toBe(multiple);expect(num(bar,'height')).toBe(thickness*scale);expect(num(bar,'y')+num(bar,'height')).toBe(236);}
 const coupon=$('[data-wps-thickness-bar="coupon"]'),comparison=$('[data-wps-thickness-bar="comparison"]'),upper=$('[data-wps-thickness-upper]');expect(num(comparison,'height')/num(coupon,'height')).toBe(ratio);expect(num(comparison,'width')).toBe(num(coupon,'width'));expect(num(coupon,'width')).toBe(112);expect(num(upper,'data-value')).toBe(.75);expect(num(upper,'y1')).toBe(236-.75*scale);expect(num(upper,'y2')).toBe(num(upper,'y1'));
 for(const[id,t]of EXAMPLES){const tick=$('[data-wps-thickness-tick="'+id+'"]');expect(num(tick,'y1')).toBe(236-t*scale);expect(num(tick,'y2')).toBe(num(tick,'y1'));}
 expect(num(panel(),'data-value')).toBe(value);expect(num(panel(),'data-ratio')).toBe(ratio);
}

describe('Bounded illustrative WPS thickness comparison',()=>{
 it('draws the actual coupon and each comparison with exact1T/2T/4T heights on one fixed inch scale',async()=>{
  await mount();expect(panel().dataset.wpsThickness).toBe('upper');checkGeometry(.75,2);
  for(const[id,value,,ratio]of EXAMPLES){await preset(id);checkGeometry(value,ratio);expect(panel().dataset.wpsThickness).toBe(id);expect($('[data-wps-thickness-preset="'+id+'"]').getAttribute('aria-pressed')).toBe('true');expect(panel().querySelectorAll('[data-wps-thickness-preset][aria-pressed="true"]')).toHaveLength(1);}
 });
 it('keeps the coupon, upper line, baseline and ruler fixed while changing only the selected comparison',async()=>{
  await mount();const fixed=fixedGeometry();for(const[id]of EXAMPLES){await preset(id);expect(fixedGeometry()).toEqual(fixed);expect($('[data-wps-thickness-drawing]').getAttribute('viewBox')).toBe('0 0 640 300');}
  expect($('[data-wps-thickness-drawing]').getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');expect($('[data-wps-thickness-drawing]').style.height).toBe('auto');expect($('[data-wps-thickness-drawing]').querySelectorAll('[transform]')).toHaveLength(0);
 });
 it('provides full HTML fractions, ratios and equations without relying on small SVG labels',async()=>{
  await mount();for(const[id,value,fraction,ratio]of EXAMPLES){await preset(id);const reading=$('[data-wps-thickness-reading="comparison"]');expect(num(reading,'data-value')).toBe(value);expect(num(reading,'data-ratio')).toBe(ratio);expect(reading.textContent).toContain(fraction+' in · '+ratio+'T');expect($('[data-wps-thickness-comparison-equation]').textContent).toBe('Selected comparison: '+fraction+' in = '+ratio+' × 3/8 in = '+ratio+'T.');}
  expect($('[data-wps-thickness-reading="coupon"]').textContent).toContain('3/8 in · 1T');expect($('[data-wps-thickness-reading="upper"]').textContent).toContain('3/4 in · 2T');expect($('[data-wps-thickness-upper-equation]').textContent).toBe('T = 3/8 in; 2T = 2 × 3/8 in = 3/4 in');
  expect($('[data-wps-thickness-scope]').textContent).toContain('illustrative WPS above');expect($('[data-wps-thickness-scope]').textContent).toContain('actual qualified ranges depend on the applicable code and the complete WPS/PQR');expect($('[data-wps-thickness-legend]').textContent).toContain('only the stated example’s upper thickness');
  expect(panel().querySelectorAll('input,select,[data-correct],[data-answer],[data-status],[data-lower-limit]')).toHaveLength(0);
 });
 it('mounts only in the free WPS reference with the existing Base metal field selected',()=>{
  for(const insp2_codesTab of ['read','sort','clause','invalid'])expect(panel(render({insp2_codesTab}))).toBeNull();for(const field of baseline.fields.filter(field=>field.id!=='base'))expect(panel(render({insp2_wpsField:field.id}))).toBeNull();expect(panel(render({insp2_wpsField:'invalid'}))).toBeNull();
  expect(render().querySelector('[data-wps-workbench="base"]')).toBeTruthy();expect(render().querySelector('[data-codes-flow-step]')).toBeTruthy();
 });
 it('keeps all eleven original WPS labels, values and explanations intact',()=>{
  expect(baseline.fields).toHaveLength(11);for(const field of baseline.fields){const node=render({insp2_wpsField:field.id});for(const text of [field.label,field.value,field.ex])expect(node.textContent).toContain(text);expect(node.querySelector('[data-wps-field-label="'+field.id+'"]').textContent).toContain(field.label);expect(node.querySelector('[data-wps-field-value="'+field.id+'"]').textContent).toBe(field.value);}
 });
 it('preserves all pre-existing Codes source exactly after removing its three additive changes',()=>{
  const source=stripClauseTrace(readFileSync(resolve(SRC),'utf8'));const begin=source.indexOf('function CodesAndStandards('),end=source.indexOf('function WelderQualPrep(',begin);let region=source.slice(begin,end).replace(/\r\n/g,'\n');
  const hook="        var wpsThicknessState = useState('upper');\n";expect(region.split(hook)).toHaveLength(2);region=region.replace(hook,'');const helperStart=region.indexOf('        function renderWpsThicknessComparator() {'),helperEnd=region.indexOf('        function renderWpsWorkbench(f) {',helperStart);expect(helperStart).toBeGreaterThan(0);expect(helperEnd).toBeGreaterThan(helperStart);region=region.slice(0,helperStart)+region.slice(helperEnd);
  const site="                h('p', { className: 'text-sm text-slate-800' }, f.ex)\n              ),\n              f.id === 'base' && renderWpsThicknessComparator()\n";expect(region.split(site)).toHaveLength(2);region=region.replace(site,"                h('p', { className: 'text-sm text-slate-800' }, f.ex)\n              )\n");expect(createHash('sha256').update(region).digest('hex')).toBe(baseline.codesRegionSha256);
 });
 it('keeps comparison state local and independent from saved WPS choices, assessment data and neighboring field navigation',async()=>{
  const records={codes_pick:'asme9',insp2_sortIdx:2,insp2_sort:{fno:'req'},insp2_clauseIdx:0,insp2_clause:{0:1},sym2_m_score:4,weldBadges:{a:true}};const app=await mount(records),saved=structuredClone(app.latest());for(const[id]of EXAMPLES)await preset(id);expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);
  await click(host.querySelector('[data-wps-form-field="gas"]'));expect(panel()).toBeNull();expect(app.latest().insp2_wpsField).toBe('gas');await click(host.querySelector('[data-wps-form-field="base"]'));expect(panel().dataset.wpsThickness).toBe('proposal');for(const[key,value]of Object.entries(records))expect(app.latest()[key]).toEqual(value);expect(app.writes.every(([key])=>key==='insp2_wpsField')).toBe(true);
 });
 it('preserves real sorter first-call locking, hidden feedback, all ten answer keys and reset after free exploration',async()=>{
  const app=await mount();await preset('proposal');await tab('sort');expect(panel()).toBeNull();const cards=window.__WeldLabCore.INSP2_SORT,answer=bin=>host.querySelector('[aria-label="Sort this change"]').querySelectorAll('button')[bin==='req'?0:1];
  expect(host.textContent).not.toContain('F-Numbers group electrodes by how they run');await click(answer('ok'));expect(app.latest().insp2_sort).toEqual({fno:'ok'});expect(host.textContent).toContain('F-Numbers group electrodes by how they run');await click(answer('req'));expect(app.latest().insp2_sort.fno).toBe('ok');
  for(let i=1;i<cards.length;i++){await click(textButton('Next ➡️'));const bench=host.querySelector('[data-codes-change-bench]');expect(bench.dataset.codesChangeBench).toBe(cards[i].id);expect(panel()).toBeNull();if(cards[i].id==='thick')expect(bench.textContent).not.toContain('3/4 in');await click(answer(cards[i].req?'req':'ok'));}
  expect(Object.keys(app.latest().insp2_sort)).toHaveLength(10);expect(host.textContent).toContain('Score 9 / 10');await click(textButton('🔄 Reset sorter'));expect(app.latest().insp2_sort).toEqual({});expect(app.latest().insp2_sortIdx).toBe(0);expect(host.textContent).not.toContain('F-Numbers group electrodes by how they run');
 });
 it('keeps actual clause explanations behind their original first-pick gate and preserves reset',async()=>{
  const app=await mount();await preset('coupon');await tab('clause');expect(panel()).toBeNull();expect(host.textContent).not.toContain('Clause 8 Inspection holds the acceptance criteria');const options=host.querySelector('[aria-label="Pick the clause"]').querySelectorAll('button');await click(options[1]);expect(app.latest().insp2_clause).toEqual({0:1});expect(host.textContent).toContain('Clause 8 Inspection holds the acceptance criteria');await click(options[0]);expect(app.latest().insp2_clause).toEqual({0:1});await click(textButton('🔄 Restart quiz'));expect(app.latest().insp2_clause).toEqual({});expect(host.textContent).not.toContain('Clause 8 Inspection holds the acceptance criteria');
 });
 it.each([false,true])('uses named native44px controls, full HTML readings, strong focus and explicit contrast without autoplay (contrast=%s)',async contrast=>{
  await mount({},contrast);expect(panel().style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(panel().style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(240, 249, 255)');expect(panel().style.getPropertyValue('--wps-thickness-focus')).toBe(contrast?'#ffff00':'#075985');const css=panel().querySelector('style').textContent;expect(css).toContain('button:focus-visible{outline:3px solid var(--wps-thickness-focus);outline-offset:3px}');expect(css).toContain('transition:none!important;animation:none!important');
  const buttons=[...panel().querySelectorAll('button')];expect(buttons).toHaveLength(3);for(const button of buttons){expect(button.type).toBe('button');expect(button.textContent.trim()).toBeTruthy();expect(parseInt(button.style.minHeight)).toBeGreaterThanOrEqual(44);}expect(panel().querySelector('[role="group"]').getAttribute('aria-label')).toBeTruthy();expect($('[data-wps-thickness-drawing]').getAttribute('aria-label')).toContain('fixed scale');expect($('[data-wps-thickness-equation]').getAttribute('aria-live')).toBe('polite');expect(panel().querySelectorAll('[data-wps-thickness-reading]')).toHaveLength(3);expect(panel().querySelectorAll('animate,animateTransform,canvas')).toHaveLength(0);
  for(const[id]of EXAMPLES){await preset(id);expect($('[data-wps-thickness-bar="comparison"]').getAttribute('fill')).toBe('#c4b5fd');}
 });
});
