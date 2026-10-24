import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const tools = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-math-measurement-tools-baseline.json'), 'utf8'));
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'measure', sym2_m_seed: 12345 };
let host, root;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
const panel = (node = host) => node.querySelector('[data-pi-tape]');
const $ = selector => panel().querySelector(selector);
const n = (node, attr) => Number(node.getAttribute(attr));
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
function render(extra={}){const node=document.createElement('div');node.innerHTML=renderTool('weldLab',{weldLab:{...BASE,...extra}});return node;}
async function click(node){expect(node).toBeTruthy();await React.act(()=>node.click());}
async function input(raw){await React.act(()=>Simulate.change($('[data-pi-tape-diameter]'),{target:{value:raw}}));}
async function focus(id){await click($('[data-pi-tape-focus="'+id+'"]'));}
async function mode(label){await click([...host.querySelectorAll('button')].find(node=>node.textContent.includes(label)));}
function geometry(){return [...panel().querySelectorAll('[data-pi-tape-circle],[data-pi-tape-diameter-line],[data-pi-tape-strip],[data-pi-tape-tick],[data-pi-tape-end]')].map(node=>[node.tagName,...['cx','cy','r','x','width','x1','y1','x2','y2'].map(attr=>node.getAttribute(attr))]);}
function checkGeometry(diameter){
  const circumference=Math.PI*diameter,scale=n(panel(),'data-scale');expect(scale).toBe(20);expect(n(panel(),'data-diameter')).toBe(diameter);expect(n(panel(),'data-circumference')).toBeCloseTo(circumference,12);
  const circle=$('[data-pi-tape-circle]'),across=$('[data-pi-tape-diameter-line]');expect(n(circle,'r')*2).toBe(diameter*scale);expect(n(across,'x2')-n(across,'x1')).toBe(diameter*scale);expect(n(across,'x1')).toBe(n(circle,'cx')-n(circle,'r'));expect(n(across,'x2')).toBe(n(circle,'cx')+n(circle,'r'));
  const strips=[...panel().querySelectorAll('[data-pi-tape-strip]')];expect(strips).toHaveLength(2);expect(n(strips[0],'x')).toBe(n(strips[1],'x'));expect(n(strips[0],'width')).toBe(n(strips[1],'width'));
  for(const strip of strips){expect(n(strip,'width')).toBeCloseTo(2*Math.PI*n(circle,'r'),11);expect(n(strip,'width')).toBeCloseTo(circumference*scale,11);}
  const ends=[...panel().querySelectorAll('[data-pi-tape-end]')];expect(n(ends[0],'x1')).toBe(n(ends[1],'x1'));expect(n(ends[0],'x1')).toBeCloseTo(n(strips[0],'x')+n(strips[0],'width'),11);
  for(const [kind,step,maximum] of [['linear',scale,circumference],['diameter',Math.PI*scale,diameter]]){
    const ticks=[...panel().querySelectorAll('[data-pi-tape-tick="'+kind+'"]')];expect(ticks).toHaveLength(Math.floor(maximum)+1);
    for(let i=0;i<ticks.length;i++){expect(n(ticks[i],'data-reading')).toBe(i);expect(n(ticks[i],'x1')).toBeCloseTo(n(strips[0],'x')+i*step,11);expect(n(ticks[i],'x2')).toBe(n(ticks[i],'x1'));expect(n(ticks[i],'x1')).toBeLessThanOrEqual(n(ends[0],'x1')+1e-9);}
  }
}

describe('Pi-tape circumference and diameter relationship',()=>{
  it('uses a genuine ideal circle and one physical scale for its diameter, perimeter and both equally long unwrapped scales',async()=>{
    await mount();checkGeometry(6);
    expect($('[data-pi-tape-drawing]').getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');expect($('[data-pi-tape-drawing]').style.height).toBe('auto');expect($('[data-pi-tape-drawing]').querySelectorAll('[transform]')).toHaveLength(0);
  });

  it('retains exact geometry through both endpoints and every quarter-inch diameter in the local input range',async()=>{
    const app=await mount(),saved=structuredClone(app.latest());
    for(let quarters=8;quarters<=40;quarters++){const diameter=quarters/4;await input(String(diameter));checkGeometry(diameter);}
    for(const diameter of [2,4,6,8,10]){await click($('[data-pi-tape-preset="'+diameter+'"]'));checkGeometry(diameter);expect($('[data-pi-tape-preset="'+diameter+'"]').getAttribute('aria-pressed')).toBe('true');}
    expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);
  });

  it('spaces linear inches and diameter inches differently while mapping corresponding scale values to the same physical length',async()=>{
    await mount();await input('6.25');
    const linear=[...panel().querySelectorAll('[data-pi-tape-tick="linear"]')],diameter=[...panel().querySelectorAll('[data-pi-tape-tick="diameter"]')];
    expect((n(diameter[1],'x1')-n(diameter[0],'x1'))/(n(linear[1],'x1')-n(linear[0],'x1'))).toBeCloseTo(Math.PI,12);
    const c=$('[data-pi-tape-strip="linear"]'),d=$('[data-pi-tape-strip="diameter"]');expect(n(c,'data-reading')/Math.PI).toBeCloseTo(n(d,'data-reading'),12);
    expect($('[data-pi-tape-reading="diameter"]').textContent).toBe('6.250 in');expect($('[data-pi-tape-reading="circumference"]').textContent).toBe('19.635 in');expect($('[data-pi-tape-reading="calibrated"]').textContent).toBe('6.250 in');
    expect($('[data-pi-tape-equation]').textContent).toContain('C = π × 6.250 in ≈ 19.635 in');expect($('[data-pi-tape-equation]').textContent).toContain('D = C ÷ π = 6.250 in');
    // Display rounding must never feed back into the physical geometry.
    expect(Math.abs(n(c,'width')-19.635*20)).toBeGreaterThan(.0001);expect(n(c,'width')).toBeCloseTo(Math.PI*6.25*20,12);
    expect($('[data-pi-tape-model-note]').textContent).toContain('rounded to 0.001 in for display');
  });

  it('bounds and quarter-rounds real numeric changes, ignores invalid synthetic values and keeps units in inches',async()=>{
    await mount();await input('-9');checkGeometry(2);await input('1000');checkGeometry(10);await input('5.18');checkGeometry(5.25);
    for(const raw of ['', ' ', 'bad', 'Infinity', 'NaN', null, {}, 4]){await input(raw);checkGeometry(5.25);}
    const slider=$('[data-pi-tape-diameter]');expect(slider.min).toBe('2');expect(slider.max).toBe('10');expect(slider.step).toBe('0.25');expect(slider.getAttribute('aria-valuetext')).toBe('5.250 in');
    for(const reading of panel().querySelectorAll('[data-pi-tape-reading]'))expect(reading.textContent).toMatch(/ in$/);
    expect(panel().outerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
  });

  it('emphasizes across versus around without altering geometry, the derived values or saved work',async()=>{
    const app=await mount(),initial=geometry(),saved=structuredClone(app.latest());
    for(const id of ['diameter','circumference']){await focus(id);expect(panel().dataset.focus).toBe(id);expect(geometry()).toEqual(initial);checkGeometry(6);expect(panel().querySelectorAll('[data-pi-tape-focus][aria-pressed="true"]')).toHaveLength(1);}
    expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);
  });

  it('preserves all ten original measurement tool names, descriptions and precision text',async()=>{
    await mount();expect(tools).toHaveLength(10);
    for(const tool of tools)for(const text of [tool.tool,tool.use,tool.precision])expect(host.textContent).toContain(text);
    expect(host.querySelector('[data-math-tolerance]')||host.textContent.includes('Read the tolerance window')).toBeTruthy();
    expect(host.querySelector('[data-sym2-math="tape"]')).toBeTruthy();
  });

  it('preserves a practice attempt and reveal gate through local exploration and isolates all existing saved score records',async()=>{
    const records={sym2_m_rounds:{square:2},sym2_m_score:3,sym2_m_tries:5,sym2_m_streak:1,sym2_m_best:2,mb_q_score:1,mb_q_idx:0,mb_q_picked:0,sym2_bp_ans:{a:1}};
    const app=await mount(records),card=host.querySelector('[data-sym2-math="tape"]');expect(card.textContent).not.toContain('Show the worked solution');
    await React.act(()=>Simulate.change(card.querySelector('input'),{target:{value:'0'}}));await click([...card.querySelectorAll('button')].find(el=>el.textContent==='Check answer'));
    expect(card.textContent).toContain('Show the worked solution');expect(card.textContent).not.toContain('Worked solution:');
    const saved=structuredClone(app.latest()),writes=app.writes.length;await input('8.5');await focus('diameter');await click($('[data-pi-tape-preset="4"]'));
    expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(writes);expect(card.textContent).not.toContain('Worked solution:');expect(card.querySelector('input').value).toBe('0');
    await mode('Symbol Match quiz');expect(panel()).toBeNull();const answers=[...host.querySelectorAll('[role="radiogroup"] button')];expect(answers.length).toBeGreaterThan(1);expect(answers.every(el=>el.disabled)).toBe(true);for(const answer of answers)await click(answer);
    expect(app.latest().mb_q_picked).toBe(0);expect(app.latest().mb_q_score).toBe(1);expect(app.latest().sym2_m_score).toBe(saved.sym2_m_score);expect(app.latest().sym2_m_tries).toBe(saved.sym2_m_tries);
  });

  it('stays exclusive to measurement Browse and keeps existing checked-practice and other lesson content available',()=>{
    for(const mb_sect of ['overview','arithmetic','geometry','prints','symbols','estimate','not-a-section'])expect(panel(render({mb_sect}))).toBeNull();
    for(const mb_mode of ['practice','quiz'])expect(panel(render({mb_mode}))).toBeNull();
    expect(render({mb_mode:'practice'}).querySelectorAll('[data-sym2-math]')).toHaveLength(9);expect(render({mb_sect:'prints'}).querySelector('[data-print-projections]')).toBeTruthy();
  });

  it.each([false,true])('has readable HTML equivalents, named native44px controls, strong focus and manual motion (contrast=%s)',async contrast=>{
    await mount({},contrast);expect(panel().style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(panel().style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(240, 249, 255)');
    expect(panel().style.getPropertyValue('--pi-tape-focus')).toBe(contrast?'#ffff00':'#075985');const css=panel().querySelector('style').textContent;expect(css).toContain(':is(button,input,a):focus-visible{outline:3px solid var(--pi-tape-focus);outline-offset:3px}');expect(css).toContain('transition:none!important;animation:none!important');
    for(const control of panel().querySelectorAll('input,button,a'))expect(parseInt(control.style.minHeight)).toBeGreaterThanOrEqual(44);
    const slider=$('[data-pi-tape-diameter]');expect(slider.type).toBe('range');expect(panel().querySelector('label[for="'+slider.id+'"]').textContent).toContain('Ideal specimen diameter');expect(slider.style.appearance).toBe('');
    for(const group of panel().querySelectorAll('[role="group"]'))expect(group.getAttribute('aria-label')).toBeTruthy();for(const button of panel().querySelectorAll('button'))expect(button.type).toBe('button');
    expect($('[data-pi-tape-drawing]').getAttribute('aria-label')).toContain('Ideal circle');expect($('[data-pi-tape-equation]').getAttribute('aria-live')).toBe('polite');expect(panel().querySelectorAll('[data-pi-tape-reading]')).toHaveLength(3);
    expect(panel().querySelectorAll('animate,animateTransform,canvas')).toHaveLength(0);expect($('[data-pi-tape-source]').getAttribute('href')).toBe('https://pitape.com/resources/faqs/');
  });
});
