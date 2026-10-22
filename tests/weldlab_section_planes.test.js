import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const SRC=process.env.WELDLAB_SRC||'stem_lab/stem_tool_weldlab.js';
const original=JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-section-plane-baseline.json'),'utf8'));
const reference=JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-projection-anatomy-baseline.json'),'utf8'));
const require=createRequire(resolve('desktop/web-app/package.json'));const{Simulate}=require('react-dom/test-utils');
const BASE={view:'mathBlueprint',mb_mode:'browse',mb_sect:'prints',sym2_m_seed:83,mb_q_picked:null};
const CUTS=[.75,1.75,2.5,3.5,4.5,5.5];
const SOLIDS={base:{x:[0,6],y:[0,4],z:[0,.5]},upright:{x:[1.5,2],y:[0,4],z:[.5,6.5]},gusset:{x:[2,5],y:[1.75,2.25],z:[.5,3.5]}};
const CROPS={all:'0 0 760 410',parent:'16 0 390 410',section:'450 0 270 410'};
let host,root;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;delete window.__alloflowWeldLab;localStorage.clear();resetStemLab();loadTool(SRC,'weldLab');});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;host?.remove();});
const panel=(node=host)=>node.querySelector('[data-section-planes]');const $=s=>panel().querySelector(s);const num=(node,attr)=>Number(node.getAttribute(attr));
const points=node=>node.getAttribute('points').split(' ').map(pt=>pt.split(',').map(Number));
const area=vertices=>Math.abs(vertices.reduce((sum,p,i)=>{const q=vertices[(i+1)%vertices.length];return sum+p[0]*q[1]-p[1]*q[0];},0))/2;
const bounds=vertices=>({x0:Math.min(...vertices.map(pt=>pt[0])),x1:Math.max(...vertices.map(pt=>pt[0])),y0:Math.min(...vertices.map(pt=>pt[1])),y1:Math.max(...vertices.map(pt=>pt[1]))});
function expected(cut){return Object.entries(SOLIDS).filter(([,p])=>cut>p.x[0]&&cut<p.x[1]).map(([id,p])=>{const height=id==='gusset'?(p.z[1]-p.z[0])*(p.x[1]-cut)/(p.x[1]-p.x[0]):p.z[1]-p.z[0];return{id,depth:p.y[1]-p.y[0],height,area:(p.y[1]-p.y[0])*height,y:p.y,z:[p.z[0],p.z[0]+height]};});}
async function mount(extra={},contrast=false){let latest;const writes=[];function App(){const[data,setData]=React.useState({weldLab:{...BASE,...extra}});latest=data.weldLab;return window.StemLab._registry.weldLab.render(makeCtx({toolData:data,setToolData:setData,isContrast:contrast,update:(bucket,key,value)=>{writes.push([key,value]);setData(prev=>({...prev,[bucket]:{...prev[bucket],[key]:value}}));}}));}host=document.createElement('div');document.body.append(host);root=ReactDOMClient.createRoot(host);await React.act(()=>root.render(React.createElement(App)));return{latest:()=>latest,writes};}
function render(extra={},contrast=false){const node=document.createElement('div');node.innerHTML=renderTool('weldLab',{weldLab:{...BASE,...extra}},{isContrast:contrast});return node;}
async function click(node){expect(node).toBeTruthy();await React.act(()=>node.click());}async function cut(i){await click($('[data-section-plane-preset="'+i+'"]'));}async function view(id){await click($('[data-section-view="'+id+'"]'));}
async function input(raw){await React.act(()=>Simulate.change($('[data-section-plane-input]'),{target:{value:raw}}));}
async function mode(label){await click([...host.querySelectorAll('button')].find(el=>el.textContent.includes(label)));}
function geometry(){return [...panel().querySelectorAll('[data-section-parent-part],[data-section-part],[data-section-plane],[data-section-look],[data-section-cut-distance],[data-section-height-dimension]')].map(node=>[node.tagName,...['points','d','x1','y1','x2','y2'].map(attr=>node.getAttribute(attr))]);}
function checkSection(x){const parts=expected(x),actual=[...panel().querySelectorAll('[data-section-part]')];expect(num(panel(),'data-scale')).toBe(40);expect(num(panel(),'data-cut-x')).toBe(x);expect(actual.map(p=>p.dataset.sectionPart)).toEqual(parts.map(p=>p.id));
 for(const part of parts){const polygon=$('[data-section-part="'+part.id+'"]'),coords=points(polygon),b=bounds(coords);expect(coords).toHaveLength(4);expect(coords).toEqual([[500+part.y[0]*40,324-part.z[0]*40],[500+part.y[1]*40,324-part.z[0]*40],[500+part.y[1]*40,324-part.z[1]*40],[500+part.y[0]*40,324-part.z[1]*40]]);expect((b.x1-b.x0)/40).toBe(part.depth);expect((b.y1-b.y0)/40).toBe(part.height);expect(area(coords)/1600).toBe(part.area);expect(num(polygon,'data-depth')).toBe(part.depth);expect(num(polygon,'data-height')).toBe(part.height);expect(num(polygon,'data-area')).toBe(part.area);expect(polygon.getAttribute('fill')).toBe('url(#mb10-section-hatch)');}
 expect(num($('[data-section-total]'),'data-section-total')).toBe(parts.reduce((sum,p)=>sum+p.area,0));expect(num($('[data-section-height]'),'data-section-height')).toBe(Math.max(...parts.map(p=>p.z[1])));
 const plane=$('[data-section-plane]');expect(num(plane,'data-x')).toBe(x);expect(num(plane,'x1')).toBe(74+x*40);expect(num(plane,'x2')).toBe(num(plane,'x1'));for(const arrow of panel().querySelectorAll('[data-section-look]'))expect(num(arrow,'x2')).toBeLessThan(num(arrow,'x1'));
}

describe('BRKT-01 true cutting-plane sections',()=>{
 it('intersects the authored solids at all six interior x positions with true polygons, depth, height and material area',async()=>{
  await mount();expect(num(panel(),'data-index')).toBe(2);checkSection(2.5);for(let i=0;i<CUTS.length;i++){await cut(i);checkSection(CUTS[i]);expect($('[data-section-plane-preset="'+i+'"]').getAttribute('aria-pressed')).toBe('true');}
  expect(CUTS.map(x=>expected(x).reduce((sum,p)=>sum+p.area,0))).toEqual([2,26,3.25,2.75,2.25,2]);
 });
 it('derives the section height from the actual parent-polygon intersections and retains the same physical scale',async()=>{
  await mount();for(let i=0;i<CUTS.length;i++){await cut(i);const px=num($('[data-section-plane]'),'x1');for(const[id]of Object.entries(SOLIDS)){
   const polygon=points($('[data-section-parent-part="'+id+'"]')),ys=[];for(let k=0;k<polygon.length;k++){const p=polygon[k],q=polygon[(k+1)%polygon.length];if(p[0]!==q[0]&&px>Math.min(p[0],q[0])&&px<Math.max(p[0],q[0]))ys.push(p[1]+(px-p[0])*(q[1]-p[1])/(q[0]-p[0]));}
   const section=$('[data-section-part="'+id+'"]');if(!ys.length){expect(section).toBeNull();continue;}const b=bounds(points(section));expect(b.y0).toBeCloseTo(Math.min(...ys),10);expect(b.y1).toBeCloseTo(Math.max(...ys),10);expect((b.y1-b.y0)/40).toBe(num(section,'data-height'));
  }}
 });
 it('reveals the tapering gusset only where the plane crosses it and provides complete full-size HTML readings',async()=>{
  await mount();for(let i=0;i<CUTS.length;i++){await cut(i);for(const[id]of Object.entries(SOLIDS)){const reading=$('[data-section-reading="'+id+'"]'),slice=expected(CUTS[i]).find(p=>p.id===id);expect(reading.dataset.state).toBe(slice?'cut':'clear');expect(reading.querySelector('p').className).toContain('text-base');if(slice){expect(reading.textContent).toContain(slice.depth+' in deep × '+slice.height+' in high = '+slice.area+' in².');}else expect(reading.textContent).toContain('does not cross this part');}
   expect($('[data-section-position-reading]').textContent).toContain('x = '+CUTS[i]+' in');expect($('[data-section-total]').textContent).toContain(num($('[data-section-total]'),'data-section-total')+' in².');}
  for(const[index,height]of [[2,2.5],[3,1.5],[4,.5]]){await cut(index);expect(num($('[data-section-part="gusset"]'),'data-height')).toBe(height);}
  expect($('[data-section-model-note]').textContent).toContain('middle 0.5 in of the 4 in depth');expect(panel().querySelectorAll('[data-callout],[data-answer],[data-correct],animate,animateTransform')).toHaveLength(0);
 });
 it('manually crops both/parent/section views without changing any physical geometry for all eighteen cut-view combinations',async()=>{
  await mount();for(let i=0;i<CUTS.length;i++){await cut(i);const snapshot=geometry();for(const detail of ['all','parent','section']){await view(detail);expect(panel().dataset.detail).toBe(detail);expect($('[data-section-drawing]').getAttribute('viewBox')).toBe(CROPS[detail]);expect(geometry()).toEqual(snapshot);checkSection(CUTS[i]);expect($('[data-section-drawing]').style.maxWidth).toBe((detail==='all'?900:detail==='parent'?520:360)+'px');}}
  await view('section');await cut(1);expect(panel().dataset.detail).toBe('section');expect($('[data-section-drawing]').getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');expect($('[data-section-drawing]').style.height).toBe('auto');
  const upperA=[...$('[data-section-drawing]').querySelectorAll('text')].find(node=>node.textContent==='A');expect(num(upperA,'y')).toBe(47);
 });
 it('offers exactly six ordered native-slider positions, reports physical x rather than an index, and ignores invalid synthetic inputs',async()=>{
  await mount();const slider=$('[data-section-plane-input]');expect(slider.type).toBe('range');expect(slider.min).toBe('0');expect(slider.max).toBe('5');expect(slider.step).toBe('1');
  for(let i=0;i<CUTS.length;i++){await input(String(i));checkSection(CUTS[i]);expect($('[data-section-plane-input]').getAttribute('aria-valuetext')).toBe('x = '+CUTS[i]+' in from the left edge');}
  for(const raw of ['', ' ', '6','-1','2.5','bad','NaN','Infinity',null,{},[],3]){await input(raw);checkSection(5.5);}
  expect(panel().outerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
 });
 it('keeps the original projection geometry, anatomy, checklist and cross-link unchanged and independent',async()=>{
  await mount();const old=host.querySelector('[data-print-projections]').outerHTML;for(let i=0;i<CUTS.length;i++){await cut(i);await view(i%2?'parent':'section');expect(host.querySelector('[data-print-projections]').outerHTML).toBe(old);}
  const section=geometry(),position=panel().dataset.cutX;await click(host.querySelector('[data-projection-focus="depth"]'));await click(host.querySelector('[data-projection-detail="front"]'));expect(geometry()).toEqual(section);expect(panel().dataset.cutX).toBe(position);
  for(const part of reference.anatomy)for(const text of [part.part,part.detail])expect(host.textContent).toContain(text);for(const text of reference.checklist)expect(host.textContent).toContain(text);expect(host.textContent).toContain(reference.crosslink);expect(host.textContent).toContain(reference.crosslinkButton);
 });
 it('keeps every new control local without changing saved math, blueprint or quiz records',async()=>{
  const records={sym2_m_rounds:{square:2},sym2_m_score:3,sym2_m_tries:5,sym2_m_streak:1,sym2_m_best:2,mb_q_idx:0,mb_q_score:1,mb_q_picked:0,sym2_bp_ans:{c1:1}};const app=await mount(records),saved=structuredClone(app.latest());for(let i=0;i<CUTS.length;i++){await input(String(i));for(const detail of ['all','parent','section'])await view(detail);}expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);
 });
 it('preserves actual square/brace practice and Symbol Match commit/reveal gates through free section exploration',async()=>{
  const app=await mount();await cut(1);await view('section');await mode('Checked practice');expect(panel()).toBeNull();let square=host.querySelector('[data-sym2-math="square"]');const brace=host.querySelector('[data-sym2-math="brace"]');for(const card of [square,brace]){expect(card.textContent).not.toContain('Show the worked solution');expect(card.textContent).not.toContain('Worked solution:');}
  await React.act(()=>Simulate.change(square.querySelector('input'),{target:{value:'0'}}));await click([...square.querySelectorAll('button')].find(node=>node.textContent==='Check answer'));expect(app.latest().sym2_m_tries).toBe(1);expect(app.latest().sym2_m_score||0).toBe(0);expect(square.textContent).not.toContain('Worked solution:');const saved=structuredClone(app.latest());
  await mode('Browse topics');expect(num(panel(),'data-index')).toBe(1);expect(panel().dataset.detail).toBe('section');await cut(4);await view('parent');await mode('Checked practice');square=host.querySelector('[data-sym2-math="square"]');expect(square.querySelector('input').value).toBe('0');expect(square.textContent).not.toContain('Worked solution:');for(const key of ['sym2_m_tries','sym2_m_score'])expect(app.latest()[key]).toEqual(saved[key]);
  await click([...square.querySelectorAll('button')].find(node=>node.textContent==='Show the worked solution'));expect(square.textContent).toContain('Worked solution:');expect(app.latest().sym2_m_score||0).toBe(0);
  const core=window.__WeldLabCore.sym2,problem=core.gen('brace',core.mixSeed(83,core.KINDS.indexOf('brace'),0));const currentBrace=host.querySelector('[data-sym2-math="brace"]');await React.act(()=>Simulate.change(currentBrace.querySelector('input'),{target:{value:String(problem.answer)}}));await click([...currentBrace.querySelectorAll('button')].find(node=>node.textContent==='Check answer'));expect(app.latest().sym2_m_score).toBe(1);expect(app.latest().sym2_m_tries).toBe(2);
  await mode('Symbol Match quiz');expect(panel()).toBeNull();const check=[...host.querySelectorAll('button')].find(node=>node.textContent==='Check answer');expect(check.disabled).toBe(true);await click(check);expect(app.latest().mb_q_picked).toBeNull();expect(host.querySelector('#sym2-mq-fb')).toBeNull();expect(app.latest().sym2_m_score).toBe(1);
 });
 it('preserves the exact original Math region after removing only the new local hook/helper/call',()=>{
  const source=readFileSync(resolve(SRC),'utf8'),start=source.indexOf('function MathBlueprintLab('),end=source.indexOf('function CareerStories(',start);let region=source.slice(start,end).replace(/\r\n/g,'\n');const hook="        var sectionPlaneState = useState({ index: 2, detail: 'all' });\n";expect(region.split(hook)).toHaveLength(2);region=region.replace(hook,'');const helper=region.indexOf('        function renderSectionPlaneExplorer() {'),next=region.indexOf('        function renderProjectionExplorer() {',helper);expect(helper).toBeGreaterThan(0);expect(next).toBeGreaterThan(helper);region=region.slice(0,helper)+region.slice(next);const call='            renderSectionPlaneExplorer(),\n';expect(region.split(call)).toHaveLength(2);region=region.replace(call,'');expect(createHash('sha256').update(region).digest('hex')).toBe(original.mathRegionSha256);
 });
 it('stays exclusive to print-reading Browse and keeps the other recent teaching models available',()=>{
  for(const mb_sect of ['overview','arithmetic','measure','geometry','symbols','estimate','bad'])expect(panel(render({mb_sect}))).toBeNull();for(const mb_mode of ['practice','quiz'])expect(panel(render({mb_mode}))).toBeNull();expect(render({mb_sect:'measure'}).querySelector('[data-pi-tape]')).toBeTruthy();expect(render({mb_sect:'geometry'}).querySelector('[data-pythagoras-area]')).toBeTruthy();expect(render({view:'symbolsReader',sr_view:'blueprint'}).querySelector('[data-callout]')).toBeTruthy();
 });
 it.each([false,true])('uses readable HTML, native44px controls, strong focus and explicit contrast without autoplay (contrast=%s)',async contrast=>{
  await mount({},contrast);expect(panel().style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(panel().style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(240, 249, 255)');expect(panel().style.getPropertyValue('--section-plane-focus')).toBe(contrast?'#ffff00':'#075985');const css=panel().querySelector('style').textContent;expect(css).toContain(':is(button,input):focus-visible{outline:3px solid var(--section-plane-focus);outline-offset:3px}');expect(css).toContain('transition:none!important;animation:none!important');
  expect(panel().querySelectorAll('button')).toHaveLength(9);for(const control of panel().querySelectorAll('button,input'))expect(parseInt(control.style.minHeight)).toBeGreaterThanOrEqual(44);for(const button of panel().querySelectorAll('button')){expect(button.type).toBe('button');expect(button.textContent.trim()).toBeTruthy();}for(const group of panel().querySelectorAll('[role="group"]'))expect(group.getAttribute('aria-label')).toBeTruthy();const slider=$('[data-section-plane-input]');expect(slider.style.appearance).toBe('');expect(panel().querySelector('label[for="'+slider.id+'"]').textContent).toContain('six interior positions');
  expect($('[data-section-drawing]').getAttribute('aria-label')).toContain('Hatched shapes are cut material');expect($('[data-section-position-reading]').closest('[aria-live]').getAttribute('aria-live')).toBe('polite');expect(panel().querySelectorAll('animate,animateTransform,canvas,select')).toHaveLength(0);expect($('[data-section-plane]').getAttribute('stroke')).toBe(contrast?'#ffff00':'#fbbf24');
 });
});
