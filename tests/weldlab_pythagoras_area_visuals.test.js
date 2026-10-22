import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const original = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-pythagoras-geometry-baseline.json'), 'utf8'));
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SEED = 83;
const BASE = { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'geometry', sym2_m_seed: SEED };
let host, root;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
const panel = (node = host) => node.querySelector('[data-pythagoras-area]');
const $ = selector => panel().querySelector(selector);
const num = (node, attr) => Number(node.getAttribute(attr));
const points = node => node.getAttribute('points').trim().split(/\s+/).map(point => point.split(',').map(Number));
const sub = (a,b) => [a[0]-b[0],a[1]-b[1]];
const dot = (a,b) => a[0]*b[0]+a[1]*b[1];
const cross = (a,b) => a[0]*b[1]-a[1]*b[0];
const length = v => Math.hypot(...v);
const center = vertices => vertices.reduce((sum,point)=>[sum[0]+point[0]/vertices.length,sum[1]+point[1]/vertices.length],[0,0]);
const area = vertices => Math.abs(vertices.reduce((sum,point,i)=>sum+cross(point,vertices[(i+1)%vertices.length]),0))/2;
async function mount(extra = {}, contrast = false) {
  let latest; const writes=[];
  function App() {
    const [data,setData]=React.useState({weldLab:{...BASE,...extra}});latest=data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({toolData:data,setToolData:setData,isContrast:contrast,
      update:(bucket,key,value)=>{writes.push([key,value]);setData(prev=>({...prev,[bucket]:{...prev[bucket],[key]:value}}));}}));
  }
  host=document.createElement('div');document.body.append(host);root=ReactDOMClient.createRoot(host);
  await React.act(()=>root.render(React.createElement(App)));return{latest:()=>latest,writes};
}
function render(extra={},contrast=false){const node=document.createElement('div');node.innerHTML=renderTool('weldLab',{weldLab:{...BASE,...extra}},{isContrast:contrast});return node;}
async function click(node){expect(node).toBeTruthy();await React.act(()=>node.click());}
async function preset(k){await click($('[data-pythagoras-preset="'+k+'"]'));}
async function emphasize(id){await click($('[data-pythagoras-focus="'+id+'"]'));}
async function input(card,value){await React.act(()=>Simulate.change(card.querySelector('input'),{target:{value:String(value)}}));}
async function button(card,label){await click([...card.querySelectorAll('button')].find(el=>el.textContent===label));}
function geometry(){return [...panel().querySelectorAll('[data-pythagoras-square],[data-pythagoras-triangle],[data-pythagoras-side],[data-pythagoras-right-angle]')].map(node=>[node.tagName,...['points','d','x1','y1','x2','y2'].map(attr=>node.getAttribute(attr))]);}
function checkGeometry(k){
  const scale=num(panel(),'data-scale'),tri=points($('[data-pythagoras-triangle]')),triCenter=center(tri);
  expect(scale).toBe(12);expect(num(panel(),'data-multiple')).toBe(k);expect(tri).toHaveLength(3);
  expect(dot(sub(tri[1],tri[0]),sub(tri[2],tri[0]))).toBe(0);
  expect(length(sub(tri[1],tri[0]))/scale).toBe(3*k);expect(length(sub(tri[2],tri[0]))/scale).toBe(4*k);expect(length(sub(tri[2],tri[1]))/scale).toBe(5*k);
  for(const [id,base] of [['a',3],['b',4],['c',5]]){
    const square=$('[data-pythagoras-square="'+id+'"]'),vertices=points(square),side=$('[data-pythagoras-side="'+id+'"]');expect(vertices).toHaveLength(4);
    const ends=[[num(side,'x1'),num(side,'y1')],[num(side,'x2'),num(side,'y2')]];
    expect(vertices.slice(0,2).map(pt=>pt.join(',')).sort()).toEqual(ends.map(pt=>pt.join(',')).sort());
    for(let i=0;i<4;i++){
      const edge=sub(vertices[(i+1)%4],vertices[i]),next=sub(vertices[(i+2)%4],vertices[(i+1)%4]);
      expect(length(edge)/scale).toBeCloseTo(base*k,12);expect(dot(edge,next)).toBeCloseTo(0,12);
    }
    const edge=sub(vertices[1],vertices[0]);expect(cross(edge,sub(triCenter,vertices[0]))*cross(edge,sub(center(vertices),vertices[0]))).toBeLessThan(0);
    expect(area(vertices)/(scale*scale)).toBe(base*base*k*k);expect(num(square,'data-side')).toBe(base*k);expect(num(square,'data-area')).toBe(base*base*k*k);
    for(const [x,y] of vertices){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(600);expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(590);}
  }
  expect(area(points($('[data-pythagoras-square="a"]')))+area(points($('[data-pythagoras-square="b"]')))).toBe(area(points($('[data-pythagoras-square="c"]'))));
}

describe('Pythagorean length and square-area relationship',()=>{
  it('builds three real outward squares sharing the exact triangle edges with equal perpendicular sides',async()=>{
    await mount();checkGeometry(2);
    expect($('[data-pythagoras-drawing]').getAttribute('viewBox')).toBe('0 0 600 590');expect($('[data-pythagoras-drawing]').getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');expect($('[data-pythagoras-drawing]').style.height).toBe('auto');expect($('[data-pythagoras-drawing]').querySelectorAll('[transform]')).toHaveLength(0);
  });

  it('keeps one physical scale and viewport through all four authored families, with exact quadratic area growth',async()=>{
    await mount();let baseGeometry;
    for(const k of [1,2,3,4]){
      await preset(k);checkGeometry(k);
      const origin=points($('[data-pythagoras-triangle]'))[0],normalized=[...panel().querySelectorAll('[data-pythagoras-square]')].map(node=>points(node).map(pt=>sub(pt,origin).map(value=>value/k)));
      if(k===1)baseGeometry=normalized;else expect(normalized).toEqual(baseGeometry);
      expect($('[data-pythagoras-drawing]').getAttribute('viewBox')).toBe('0 0 600 590');
      expect($('[data-pythagoras-preset="'+k+'"]').getAttribute('aria-pressed')).toBe('true');
      expect(panel().querySelectorAll('[data-pythagoras-preset][aria-pressed="true"]')).toHaveLength(1);
      const areas=['a','b','c'].map(id=>num($('[data-pythagoras-square="'+id+'"]'),'data-area'));
      expect(areas).toEqual([9*k*k,16*k*k,25*k*k]);expect(areas[0]/areas[2]).toBe(9/25);expect(areas[1]/areas[2]).toBe(16/25);
    }
  });

  it('explains length versus area multipliers and the complete equation in readable HTML with consistent abstract units',async()=>{
    await mount();
    for(const k of [1,2,3,4]){
      await preset(k);
      for(const [id,base] of [['a',3],['b',4],['c',5]]){
        const reading=$('[data-pythagoras-reading="'+id+'"]');expect(num(reading,'data-length')).toBe(base*k);expect(num(reading,'data-area')).toBe(base*base*k*k);
        expect(reading.textContent).toContain('Length: '+base*k+' units.');expect(reading.textContent).toContain('Square area: '+base*k+' × '+base*k+' = '+base*base*k*k+' square units.');
      }
      const equation=$('[data-pythagoras-equation]');expect(equation.textContent).toContain('a² + b² = c²');expect(equation.textContent).toContain(3*k+'² + '+4*k+'² = '+5*k+'²');expect(equation.textContent).toContain(9*k*k+' + '+16*k*k+' = '+25*k*k+' square units');
      expect($('[data-pythagoras-length-factor]').textContent).toContain('Lengths × '+k+':');expect($('[data-pythagoras-area-factor]').textContent).toContain('Areas × '+k+'² = × '+k*k+':');
    }
    expect($('[data-pythagoras-model-note]').textContent).toContain('abstract length units');expect($('[data-pythagoras-model-note]').textContent).toContain('1 × 1 unit square');
    expect(panel().textContent).not.toMatch(/inches|millimetres|tolerance|within|accuracy/);
  });

  it('manually emphasizes leg areas or hypotenuse area without hiding, moving, resizing or revealing anything',async()=>{
    await mount();const initial=geometry(),readings=[...panel().querySelectorAll('[data-pythagoras-reading]')].map(el=>el.textContent);
    for(const focus of ['legs','hypotenuse','all']){
      await emphasize(focus);expect(panel().dataset.focus).toBe(focus);expect(geometry()).toEqual(initial);checkGeometry(2);
      expect([...panel().querySelectorAll('[data-pythagoras-reading]')].map(el=>el.textContent)).toEqual(readings);
      expect(panel().querySelectorAll('[data-pythagoras-focus][aria-pressed="true"]')).toHaveLength(1);
      for(const id of ['a','b','c'])expect($('[data-pythagoras-square="'+id+'"]').getAttribute('stroke-width')).toBe(focus==='all'||(focus==='legs'?id!=='c':id==='c')?'3':'1.5');
      expect(panel().querySelectorAll('[hidden],[aria-hidden="true"],[opacity="0"]')).toHaveLength(0);
    }
  });

  it('keeps every original Pythagorean paragraph and all five triangle names and uses intact',async()=>{
    await mount();expect(original.paragraphs).toHaveLength(3);expect(original.triangles).toHaveLength(5);
    for(const text of original.paragraphs)expect(host.textContent).toContain(text);
    for(const triangle of original.triangles)for(const text of [triangle.name,triangle.use])expect(host.textContent).toContain(text);
    expect(host.querySelector('[data-sym2-math="square"]')).toBeTruthy();expect(host.querySelector('[data-sym2-math="brace"]')).toBeTruthy();
  });

  it('keeps exploration local and does not write scores, rounds, pending quiz records or saved work',async()=>{
    const records={sym2_m_rounds:{square:2,brace:1},sym2_m_score:3,sym2_m_tries:5,sym2_m_streak:1,sym2_m_best:2,mb_q_score:1,mb_q_idx:0,mb_q_picked:0,sym2_bp_ans:{a:1}};
    const app=await mount(records),saved=structuredClone(app.latest());
    for(const k of [4,1,3,2]){await preset(k);for(const focus of ['legs','hypotenuse','all'])await emphasize(focus);}
    expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);
  });

  it('preserves actual square and brace answer gates, hidden solutions and first-attempt scoring through exploration',async()=>{
    const app=await mount(),square=host.querySelector('[data-sym2-math="square"]'),brace=host.querySelector('[data-sym2-math="brace"]');
    for(const card of [square,brace]){expect(card.textContent).not.toContain('Show the worked solution');expect(card.textContent).not.toContain('Worked solution:');}
    expect(square.querySelector('[data-weld-math-reveal]').getAttribute('data-weld-math-reveal')).toBe('hidden');expect(brace.textContent).not.toContain('What if the angle changed?');
    await input(square,0);await button(square,'Check answer');expect(app.latest().sym2_m_tries).toBe(1);expect(app.latest().sym2_m_score||0).toBe(0);expect(square.textContent).toContain('Show the worked solution');expect(square.textContent).not.toContain('Worked solution:');
    const saved=structuredClone(app.latest()),writes=app.writes.length;await preset(4);await emphasize('legs');expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(writes);expect(square.querySelector('input').value).toBe('0');expect(square.querySelector('[data-weld-math-reveal]').getAttribute('data-weld-math-reveal')).toBe('hidden');
    const core=window.__WeldLabCore.sym2,problem=kind=>core.gen(kind,core.mixSeed(SEED,core.KINDS.indexOf(kind),0));
    await button(square,'Show the worked solution');expect(square.textContent).toContain('Worked solution:');expect(square.querySelector('[data-weld-math-reveal]').getAttribute('data-weld-math-reveal')).toBe('shown');
    await input(square,problem('square').answer);await button(square,'Check answer');expect(app.latest().sym2_m_score||0).toBe(0);expect(app.latest().sym2_m_tries).toBe(1);
    await input(brace,problem('brace').answer);await button(brace,'Check answer');expect(app.latest().sym2_m_score).toBe(1);expect(app.latest().sym2_m_tries).toBe(2);expect(brace.textContent).toContain('Worked solution:');expect(brace.textContent).toContain('What if the angle changed?');
    await preset(1);await emphasize('hypotenuse');expect(app.latest().sym2_m_score).toBe(1);expect(brace.textContent).toContain('Worked solution:');expect(brace.textContent).toContain('What if the angle changed?');
    await input(brace,0);await button(brace,'Check answer');expect(app.latest().sym2_m_score).toBe(1);expect(app.latest().sym2_m_tries).toBe(2);
  });

  it('appears only in geometry Browse and retains the other recent models and complete checked practice',()=>{
    for(const mb_sect of ['overview','arithmetic','measure','prints','symbols','estimate','not-a-section'])expect(panel(render({mb_sect}))).toBeNull();
    for(const mb_mode of ['practice','quiz'])expect(panel(render({mb_mode}))).toBeNull();
    expect(render({mb_mode:'practice'}).querySelectorAll('[data-sym2-math]')).toHaveLength(9);expect(render({mb_sect:'measure'}).querySelector('[data-pi-tape]')).toBeTruthy();expect(render({mb_sect:'prints'}).querySelector('[data-print-projections]')).toBeTruthy();
  });

  it.each([false,true])('uses named native44px controls, strong focus, readable HTML and explicit contrast without autoplay (contrast=%s)',async contrast=>{
    await mount({},contrast);expect(panel().style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(panel().style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(250, 245, 255)');
    expect(panel().style.getPropertyValue('--pythagoras-focus')).toBe(contrast?'#ffff00':'#6b21a8');const css=panel().querySelector('style').textContent;expect(css).toContain('button:focus-visible{outline:3px solid var(--pythagoras-focus);outline-offset:3px}');expect(css).toContain('transition:none!important;animation:none!important');
    const controls=[...panel().querySelectorAll('button')];expect(controls).toHaveLength(7);for(const control of controls){expect(control.type).toBe('button');expect(control.textContent.trim()).toBeTruthy();expect(parseInt(control.style.minHeight)).toBeGreaterThanOrEqual(44);}
    for(const group of panel().querySelectorAll('[role="group"]'))expect(group.getAttribute('aria-label')).toBeTruthy();
    expect($('[data-pythagoras-drawing]').getAttribute('aria-label')).toContain('Ideal right triangle');expect($('[data-pythagoras-equation]').getAttribute('aria-live')).toBe('polite');expect(panel().querySelectorAll('[data-pythagoras-reading]')).toHaveLength(3);
    expect(panel().querySelectorAll('animate,animateTransform,canvas,input,select')).toHaveLength(0);
    await emphasize('legs');expect($('[data-pythagoras-square="a"]').getAttribute('stroke')).toBe(contrast?'#ffff00':'#1d4ed8');expect($('[data-pythagoras-square="c"]').getAttribute('stroke')).toBe(contrast?'#ffffff':'#64748b');
  });
});
