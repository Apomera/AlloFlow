import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC=process.env.WELDLAB_SRC||'stem_lab/stem_tool_weldlab.js';
const original=JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-joint-preparations-baseline.json'),'utf8'));
const BASE={view:'jointCatalog',jc_tab:'butt',proc2_prep:'v'};
const presets=[['v30',30,30,60],['v375',37.5,37.5,75],['bevel45',45,0,45]];
const jointNames={butt:'Butt Joint',lap:'Lap Joint',tjoint:'T-Joint',corner:'Corner Joint',edge:'Edge Joint'};
let host,root;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;delete window.__alloflowWeldLab;localStorage.clear();resetStemLab();loadTool(SRC,'weldLab');});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;host?.remove();});
const panel=(node=host)=>node.querySelector('[data-joint-angles]');
const $=selector=>panel().querySelector(selector);
const num=(node,attr)=>Number(node.getAttribute(attr));
const point=(node,x,y)=>[num(node,x),num(node,y)];
const subtract=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const magnitude=a=>Math.hypot(...a);
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b)/(magnitude(a)*magnitude(b)))))*180/Math.PI;
async function mount(extra={},contrast=false){
 let latest;const writes=[];
 function App(){const[data,setData]=React.useState({weldLab:{...BASE,...extra}});latest=data.weldLab;
  return window.StemLab._registry.weldLab.render(makeCtx({toolData:data,setToolData:setData,isContrast:contrast,update:(bucket,key,value)=>{writes.push([key,value]);setData(prev=>({...prev,[bucket]:{...prev[bucket],[key]:value}}));}}));}
 host=document.createElement('div');document.body.append(host);root=ReactDOMClient.createRoot(host);await React.act(()=>root.render(React.createElement(App)));return{latest:()=>latest,writes};
}
function render(extra={},contrast=false){const node=document.createElement('div');node.innerHTML=renderTool('weldLab',{weldLab:{...BASE,...extra}},{isContrast:contrast});return node;}
async function click(node){expect(node).toBeTruthy();await React.act(()=>node.click());}
async function preset(id){await click($('[data-joint-angle-preset="'+id+'"]'));}
async function focus(id){await click($('[data-joint-angle-focus="'+id+'"]'));}
function button(label,node=host){return [...node.querySelectorAll('button')].find(el=>el.textContent.trim()===label);}
function geometry(){return [...panel().querySelectorAll('polygon,line,path,circle')].map(node=>[node.tagName,...['points','d','x1','y1','x2','y2','cx','cy','r'].map(attr=>node.getAttribute(attr))]);}
function fixedGeometry(){return ['root','land'].map(id=>{const node=$('[data-joint-angle-'+id+']');return ['x1','y1','x2','y2'].map(attr=>num(node,attr));});}
function checkAngles(left,right,included){
 const vertex=$('[data-joint-angle-vertex]'),common=point(vertex,'cx','cy'),vectors=[];
 for(const [id,degrees] of [['left',left],['right',right]]){
  const face=$('[data-joint-angle-face="'+id+'"]'),ray=$('[data-joint-angle-ray="'+id+'"]');
  const a=point(face,'x1','y1'),b=point(face,'x2','y2'),v=subtract(a,b),rayEnd=point(ray,'x2','y2');
  expect(Math.atan2(Math.abs(v[0]),Math.abs(v[1]))*180/Math.PI).toBeCloseTo(degrees,10);
  expect(point(ray,'x1','y1')).toEqual(common);expect(rayEnd).toEqual(a);expect(cross(subtract(b,common),subtract(a,common))).toBeCloseTo(0,8);
  vectors.push(subtract(rayEnd,common));
 }
 expect(angle(vectors[0],vectors[1])).toBeCloseTo(included,10);
 const ref=$('[data-joint-angle-reference="vertical"]');expect(num(ref,'x1')).toBe(num(ref,'x2'));expect(point(ref,'x1','y1')).toEqual(common);
 expect(num(panel(),'data-left-angle')).toBe(left);expect(num(panel(),'data-right-angle')).toBe(right);expect(num(panel(),'data-included-angle')).toBe(included);
 const triCoords=[...panel().querySelectorAll('[data-joint-angle-plate]')].flatMap(node=>node.getAttribute('points').split(' ').map(pt=>pt.split(',').map(Number)));
 for(const[x,y]of triCoords){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(600);expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(350);}
}

describe('Groove-angle construction bench',()=>{
 it('constructs a genuine30+30=60degree example from face geometry and a shared ray intersection',async()=>{
  await mount();checkAngles(30,30,60);expect(panel().dataset.jointAngles).toBe('v30');expect($('[data-joint-angle-drawing]').getAttribute('viewBox')).toBe('0 0 600 350');expect($('[data-joint-angle-drawing]').getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');expect($('[data-joint-angle-drawing]').style.height).toBe('auto');
 });
 it('uses the three authored examples with true face angles while keeping root opening and left land fixed',async()=>{
  await mount();const fixed=fixedGeometry();expect(fixed).toEqual([[280,298,324,298],[280,214,280,238]]);
  for(const[id,left,right,included]of presets){await preset(id);checkAngles(left,right,included);expect(fixedGeometry()).toEqual(fixed);expect($('[data-joint-angle-preset="'+id+'"]').getAttribute('aria-pressed')).toBe('true');expect(panel().querySelectorAll('[data-joint-angle-preset][aria-pressed="true"]')).toHaveLength(1);
   const leftPlate=$('[data-joint-angle-plate="left"]').getAttribute('points').split(' ').map(pt=>pt.split(',').map(Number));expect(leftPlate.slice(2,4)).toEqual([[280,214],[280,238]]);
   expect($('[data-joint-angle-drawing]').getAttribute('viewBox')).toBe('0 0 600 350');}
 });
 it('draws each angle arc with endpoints on the real face/reference rays and the correct swept angle',async()=>{
  await mount();for(const[id,left,right,included]of presets){await preset(id);const common=point($('[data-joint-angle-vertex]'),'cx','cy');
   for(const[name,degrees]of [['left',left],['right',right],['included',included]]){const arc=$('[data-joint-angle-arc="'+name+'"]');if(degrees===0){expect(arc).toBeNull();continue;}
    const match=arc.getAttribute('d').match(/^M([^,]+),([^ ]+) A([^,]+),([^ ]+) 0 0 1 ([^,]+),([^ ]+)$/);expect(match).toBeTruthy();const start=subtract([Number(match[1]),Number(match[2])],common),end=subtract([Number(match[5]),Number(match[6])],common),r=Number(match[3]);
    expect(Number(match[4])).toBe(r);expect(magnitude(start)).toBeCloseTo(r,10);expect(magnitude(end)).toBeCloseTo(r,10);expect(angle(start,end)).toBeCloseTo(degrees,10);expect(num(arc,'data-degrees')).toBe(degrees);
    const leftRay=subtract(point($('[data-joint-angle-ray="left"]'),'x2','y2'),common),rightRay=subtract(point($('[data-joint-angle-ray="right"]'),'x2','y2'),common);
    expect(cross(start,name==='right'?[0,-1]:leftRay)).toBeCloseTo(0,8);expect(cross(end,name==='left'?[0,-1]:rightRay)).toBeCloseTo(0,8);
   }
  }
 });
 it('shows complete HTML readings and equations, explaining the square edge and schematic limits',async()=>{
  await mount();for(const[id,left,right,included]of presets){await preset(id);for(const[name,value]of [['left',left],['right',right],['included',included]]){const reading=$('[data-joint-angle-reading="'+name+'"]');expect(num(reading,'data-value')).toBe(value);expect(reading.textContent).toContain(value+'°');}
   expect($('[data-joint-angle-equation]').textContent).toContain('α = βL + βR = '+left+'° + '+right+'° = '+included+'°');}
  expect($('[data-joint-angle-equation]').textContent).toContain('right edge is square');expect($('[data-joint-angle-equation]').textContent).toContain('0°');
  expect($('[data-joint-angle-scope]').textContent).toContain('75° is derived from two 37.5° edges');expect($('[data-joint-angle-scope]').textContent).toContain('without operating dimensions');expect($('[data-joint-angle-guide-note]').textContent).toContain('common intersection');
  for(const node of panel().querySelectorAll('[data-joint-angle-fixed-reading]'))expect(node.textContent).not.toMatch(/\d+(?:\.\d+)? ?(?:in|mm|ft)\b/);
 });
 it('changes manual emphasis without hiding or altering plates, rays, arcs, root or land',async()=>{
  await mount();for(const[id]of presets){await preset(id);const initial=geometry();for(const item of ['bevel','included','root','land']){await focus(item);expect(panel().dataset.focus).toBe(item);expect(geometry()).toEqual(initial);expect(panel().querySelectorAll('[data-joint-angle-focus][aria-pressed="true"]')).toHaveLength(1);expect(panel().querySelectorAll('[hidden],[opacity="0"],[aria-hidden="true"]')).toHaveLength(0);}}
 });
 it('preserves all five original prep descriptions and their exact plate/weld paths including curved J/U shapes',()=>{
  expect(original.preparations).toHaveLength(5);expect(original.letters).toHaveLength(5);
  for(const prep of original.preparations){const node=render({proc2_prep:prep.id});expect(node.textContent).toContain(prep.name);expect(node.textContent).toContain(prep.description);expect([...node.querySelector('[data-proc2="prep-'+prep.id+'"]').querySelectorAll('path')].slice(0,3).map(el=>el.getAttribute('d'))).toEqual(prep.paths);}
 });
 it('keeps original dimension visibility, selected prep/position and all saved score records independent of local exploration',async()=>{
  const saved={proc2_prep:'u',proc2_pos:'3G',proc2_jqSeed:31,proc2_jqAns:['butt'],proc2_jqBest:7,psScore:3,sym2_m_score:5};const app=await mount(saved),initial=structuredClone(app.latest());
  for(const[id]of presets){await preset(id);for(const item of ['bevel','included','root','land'])await focus(item);}
  expect(app.latest()).toEqual(initial);expect(app.writes).toHaveLength(0);expect(host.querySelector('[data-proc2="prep-u"]').textContent).not.toContain('β');
  await click([...host.querySelectorAll('button')].find(el=>el.textContent.startsWith('Hide the weld')));expect(host.querySelector('[data-proc2="prep-u"]').textContent).toContain('β');for(const text of [original.letters[0],original.letters[1],original.letters[3],original.letters[4]])expect(host.textContent).toContain(text);expect(app.latest()).toEqual(initial);expect(app.writes).toHaveLength(0);
 });
 it('stays out of all other joints and quizzes and preserves actual quiz first-pick locking and earned best score',async()=>{
  for(const jc_tab of ['lap','tjoint','corner','edge'])expect(panel(render({jc_tab}))).toBeNull();
  const app=await mount({proc2_jqOn:true,proc2_jqSeed:31,proc2_jqIdx:0,proc2_jqAns:[],proc2_jqBest:4}),items=window.__WeldLabCore.proc.jqBuild(31);expect(panel()).toBeNull();expect(host.textContent).not.toContain('Why not');
  const firstWrong=Object.keys(jointNames).find(id=>id!==items[0].joint);await click(button(jointNames[firstWrong]));const first=[...app.latest().proc2_jqAns];await click([...host.querySelectorAll('[role="radio"]')].find(el=>el.textContent.includes(jointNames[items[0].joint])));expect(app.latest().proc2_jqAns).toEqual(first);expect(host.textContent).toContain('Why not');
  for(let i=0;i<items.length;i++){if(i>0)await click(button(jointNames[items[i].joint]));await click([...host.querySelectorAll('button')].find(el=>/^(Next drawing|See your results)/.test(el.textContent)));expect(panel()).toBeNull();}
  expect(app.latest().proc2_jqBest).toBe(9);expect(app.latest().proc2_jqAns).toHaveLength(10);expect(host.textContent).toContain('Joint Reader badge earned');
 });
 it.each([false,true])('uses native named44px controls, strong focus, manual SVG and readable contrast (contrast=%s)',async contrast=>{
  await mount({},contrast);expect(panel().style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(panel().style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(255, 247, 237)');expect(panel().style.getPropertyValue('--joint-angle-focus')).toBe(contrast?'#ffff00':'#9a3412');
  const css=panel().querySelector('style').textContent;expect(css).toContain('button:focus-visible{outline:3px solid var(--joint-angle-focus);outline-offset:3px}');expect(css).toContain('transition:none!important;animation:none!important');const controls=[...panel().querySelectorAll('button')];expect(controls).toHaveLength(7);for(const control of controls){expect(control.type).toBe('button');expect(control.textContent.trim()).toBeTruthy();expect(parseInt(control.style.minHeight)).toBeGreaterThanOrEqual(44);}for(const group of panel().querySelectorAll('[role="group"]'))expect(group.getAttribute('aria-label')).toBeTruthy();
  expect($('[data-joint-angle-drawing]').getAttribute('aria-label')).toContain('Schematic groove');expect($('[data-joint-angle-equation]').getAttribute('aria-live')).toBe('polite');expect(panel().querySelectorAll('input,select,animate,animateTransform,canvas')).toHaveLength(0);
  await focus('root');expect($('[data-joint-angle-root]').getAttribute('stroke')).toBe(contrast?'#ffff00':'#fdba74');
 });
});
