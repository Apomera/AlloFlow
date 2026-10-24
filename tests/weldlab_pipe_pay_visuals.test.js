import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'pipeWelding', pipe_sect: 'pipeline' };
const IDS = ['straight', 'overtime', 'perdiem', 'costs', 'net'];
let root, host;
const explorer = (node = host) => node.querySelector('[data-pipe-pay]');
const num = (node, key) => Number(node.getAttribute(key));
const row = (id, node = host) => explorer(node).querySelector('[data-pipe-pay-select="' + id + '"]');
const core = () => window.__WeldLabCore;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })); },
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function period(id) { await click(explorer().querySelector('[data-pipe-pay-period="' + id + '"]')); }
async function inspect(id) { await click(row(id)); }
async function input(label, value) { const el = host.querySelector('input[aria-label="' + label + '"]'); expect(el).toBeTruthy(); await React.act(() => Simulate.change(el, { target: { value: String(value) } })); }
async function buttonText(text) { await click([...host.querySelectorAll('button')].find(el => el.textContent.trim() === text)); }
function expected(pay, factor = 1) {
  return [[0,pay.straight,pay.straight],[pay.straight,pay.wages,pay.ot],[pay.wages,pay.week,pay.perDiem],[pay.week,pay.net,-pay.costs],[0,pay.net,pay.net]].map(xs=>xs.map(n=>n === 0 ? 0 : n * factor));
}
function assertRows(pay, factor = 1, node = host) {
  const section = explorer(node), lo = Math.min(0,pay.net)*factor, hi = pay.week*factor;
  expect(num(section,'data-min')).toBe(lo); expect(num(section,'data-max')).toBe(hi);
  const x = n => 20+(n-lo)/(hi-lo)*600;
  IDS.forEach((id,i)=>{
    const element=row(id,node), [from,to,value]=expected(pay,factor)[i];
    expect(['data-from','data-to','data-value'].map(k=>num(element,k))).toEqual([from,to,value]);
    expect(num(element.querySelector('[data-pipe-pay-zero-axis]'),'x1')).toBeCloseTo(x(0),9);
    const bar=element.querySelector('[data-pipe-pay-bar]'), zero=element.querySelector('[data-pipe-pay-zero]');
    if(value===0){ expect(bar).toBeNull();expect(zero).toBeTruthy();expect(num(zero,'cx')).toBeCloseTo(x(from),9); }
    else{ expect(zero).toBeNull();expect(num(bar,'x')).toBeCloseTo(Math.min(x(from),x(to)),9);expect(num(bar,'width')).toBeCloseTo(Math.abs(x(to)-x(from)),9);expect(num(bar,'x')).toBeGreaterThanOrEqual(20-1e-8);expect(num(bar,'x')+num(bar,'width')).toBeLessThanOrEqual(620+1e-8); }
  });
}

describe('Pipeline pay contribution explorer', () => {
  it('replaces the result strip only in the pipeline reading and retains the full worked example and four summaries', () => {
    const node=render(), section=explorer(node);
    expect(section.dataset).toMatchObject({period:'week',factor:'1',min:'0',max:'4410'});
    expect(node.textContent).toContain('representative and pre-tax'); expect(node.textContent).toContain('$114,660');
    expect(node.textContent).toContain('Worked example: $50/hr, 60 h/week, $130/day per diem, 26 weeks');
    expect([...section.querySelectorAll('[data-pipe-pay-summary]')].map(el=>[el.dataset.pipePaySummary,el.textContent])).toEqual([['wages','$3,500'],['perdiem','$910'],['net','$4,060'],['job','$105,560']]);
    for(const sect of ['overview','positions','passes','updown','orbital','specialty','not-real'])expect(explorer(render({pipe_sect:sect}))).toBeNull();
  });

  it('pins default straight time, overtime, per diem, subtraction and net to independent hand arithmetic', () => {
    const pay=core().pipe2PayWeek({rate:50,hours:60,perDiem:130,days:7,costs:350,weeks:26});
    expect([pay.straight,pay.ot,pay.perDiem,pay.week,pay.net,pay.projectNet]).toEqual([2000,1500,910,4410,4060,105560]);
    const node=render();assertRows(pay,1,node);
    expect(row('costs',node).textContent).toContain('−$350');
    const arrow=row('costs',node).querySelector('[data-pipe-pay-direction]').getAttribute('d').match(/[-+]?\d*\.?\d+/g).map(Number);
    const bar=row('costs',node).querySelector('[data-pipe-pay-bar]');expect(arrow[2]).toBeCloseTo(num(bar,'x'),9);expect(arrow[0]).toBeGreaterThan(arrow[2]);
  });

  it('uses one shared rendered coordinate scale for all rows and fixed row insets', async () => {
    await mount();const pay=core().pipe2PayWeek({rate:50,hours:60,perDiem:130,days:7,costs:350,weeks:26});assertRows(pay);
    const xs=IDS.map(id=>num(row(id).querySelector('[data-pipe-pay-zero-axis]'),'x1'));expect(new Set(xs).size).toBe(1);
    for(const id of IDS){expect(row(id).style.borderWidth).toBe('2px');expect(row(id).style.padding).toBe('12px');expect(row(id).querySelector('svg').getAttribute('viewBox')).toBe('0 0 640 48');expect(row(id).querySelector('svg').getAttribute('preserveAspectRatio')).toBe('none');}
    expect(explorer().querySelector('[data-pipe-pay-axis]').style.padding).toBe('0px 14px');
    for(const id of IDS){await inspect(id);expect(row(id).style.borderWidth).toBe('2px');}
  });

  it('handles negative net on a signed axis and shows the subtraction crossing zero', async () => {
    await mount({pipe2_rate:20,pipe2_hrs:40,pipe2_pd:0,pipe2_costs:1500,pipe2_weeks:52});
    const pay=core().pipe2PayWeek({rate:20,hours:40,perDiem:0,days:7,costs:1500,weeks:52});
    expect(pay.net).toBe(-700);assertRows(pay);expect(row('net').textContent).toContain('−$700');
    const netBar=row('net').querySelector('[data-pipe-pay-bar]'), zero=num(row('net').querySelector('[data-pipe-pay-zero-axis]'),'x1');
    expect(num(netBar,'x')).toBe(20);expect(num(netBar,'x')+num(netBar,'width')).toBeCloseTo(zero,9);
    const costBar=row('costs').querySelector('[data-pipe-pay-bar]');expect(num(costBar,'x')).toBe(20);expect(num(costBar,'width')).toBe(600);
    await period('job');assertRows(pay,52);expect(explorer().querySelector('[data-pipe-pay-summary="job"]').textContent).toBe('−$36,400');
  });

  it('renders real zero overtime, per diem, costs and net as markers without minimum-width money bars', async () => {
    await mount({pipe2_rate:20,pipe2_hrs:40,pipe2_pd:0,pipe2_costs:800});
    let pay=core().pipe2PayWeek({rate:20,hours:40,perDiem:0,days:7,costs:800,weeks:26});assertRows(pay);
    for(const id of ['overtime','perdiem','net']){expect(row(id).querySelector('[data-pipe-pay-bar]')).toBeNull();expect(row(id).querySelector('[data-pipe-pay-zero]')).toBeTruthy();expect(row(id).querySelector('[data-pipe-pay-direction]')).toBeNull();}
    await input('Your costs per week (lodging, food, fuel)',0);pay=core().pipe2PayWeek({rate:20,hours:40,perDiem:0,days:7,costs:0,weeks:26});assertRows(pay);expect(row('costs').querySelector('[data-pipe-pay-zero]')).toBeTruthy();
  });

  it('multiplies each exact contribution for whole-job view and makes its rescaled period explicit', async () => {
    const app=await mount({pipe2_rate:57,pipe2_hrs:63,pipe2_pd:135,pipe2_pddays:6,pipe2_weeks:17,pipe2_costs:475});
    const pay=core().pipe2PayWeek({rate:57,hours:63,perDiem:135,days:6,costs:475,weeks:17});const saved=JSON.stringify(app.latest());
    const before=IDS.map(id=>{const el=row(id).querySelector('[data-pipe-pay-bar]');return [num(el,'x'),num(el,'width')];});
    await period('job');assertRows(pay,17);expect(explorer().dataset).toMatchObject({period:'job',factor:'17'});expect(explorer().textContent).toContain('Switching periods rescales the axis');
    const after=IDS.map(id=>{const el=row(id).querySelector('[data-pipe-pay-bar]');return [num(el,'x'),num(el,'width')];});after.forEach((xs,i)=>xs.forEach((n,j)=>expect(n).toBeCloseTo(before[i][j],9)));
    for(const id of IDS){await inspect(id);expect(explorer().querySelector('[data-pipe-pay-reading]').dataset.pipePayReading).toBe(id);expect(explorer().querySelector('[data-pipe-pay-multiplication]').textContent).toContain('× 17 weeks');}
    await period('week');expect(explorer().querySelector('[data-pipe-pay-multiplication]')).toBeNull();expect(JSON.stringify(app.latest())).toBe(saved);expect(app.writes).toHaveLength(0);
  });

  it('retains half-dollar arithmetic and avoids a rounded overtime hourly-rate equation', async () => {
    await mount({pipe2_rate:21,pipe2_hrs:41,pipe2_pd:0,pipe2_costs:0,pipe2_weeks:3});
    const pay=core().pipe2PayWeek({rate:21,hours:41,perDiem:0,days:7,costs:0,weeks:3});assertRows(pay);expect(pay.ot).toBe(31.5);
    await inspect('overtime');expect(explorer().querySelector('[data-pipe-pay-reading]').textContent).toContain('Overtime: 1 h × $21/h × 1.5 = $31.5 per week.');
    expect(row('overtime').querySelector('[data-pipe-pay-amount]').textContent).toBe('+$31.5');expect(explorer().querySelector('[data-pipe-pay-summary="net"]').textContent).toBe('$871.5');
    await period('job');expect(num(row('overtime'),'data-value')).toBe(94.5);expect(explorer().querySelector('[data-pipe-pay-multiplication]').textContent).toContain('$94.5');
    await input('Weeks on the job',1);expect(num(row('overtime'),'data-value')).toBe(31.5);expect(explorer().querySelector('[data-pipe-pay-multiplication]').textContent).toContain('× 1 week = $31.5');expect(explorer().querySelector('[data-pipe-pay-period-note]').textContent).toBe('Whole job: each weekly amount × 1 week.');
  });

  it('updates from the existing persisted sliders without resetting local exploration or changing other pipe state', async () => {
    const extra={pipe2_pos:'6G',pipe2_hour:3,pipe2_chal:2,pipe2_dir:'downhill',pipe2_stack:['root','hot'],pipe2_wall:.432};const app=await mount(extra);
    await period('job');await inspect('overtime');await input('Hours per week',40);
    expect(app.latest().pipe2_hrs).toBe(40);expect(explorer().dataset.period).toBe('job');expect(explorer().querySelector('[data-pipe-pay-reading]').dataset.pipePayReading).toBe('overtime');expect(row('overtime').querySelector('[data-pipe-pay-zero]')).toBeTruthy();expect(app.latest()).toMatchObject(extra);
    const saved=JSON.stringify(app.latest());await inspect('net');await period('week');expect(JSON.stringify(app.latest())).toBe(saved);
  });

  it('preserves the existing local guess/check flow and keeps its feedback through inspection changes', async () => {
    const app=await mount();await buttonText('Check');expect(host.textContent).toContain('Type a dollar amount first.');
    await React.act(()=>Simulate.change(host.querySelector('#pipe2-guess'),{target:{value:'105560'}}));await buttonText('Check');
    expect(host.textContent).toContain('Within 5%: the model says $105,560');const saved=JSON.stringify(app.latest());
    await period('job');await inspect('costs');expect(host.querySelector('#pipe2-guess').value).toBe('105560');expect(host.textContent).toContain('Within 5%: the model says $105,560');expect(JSON.stringify(app.latest())).toBe(saved);
    await React.act(()=>Simulate.change(host.querySelector('#pipe2-guess'),{target:{value:'0'}}));await buttonText('Check');expect(host.textContent).toContain('Off by $105,560');
  });

  it('normalizes hostile calculator saves before drawing and does not leak the explorer into other sections', () => {
    for(const state of [{pipe2_rate:'x',pipe2_hrs:null,pipe2_pd:[],pipe2_costs:1e9,pipe2_weeks:-3},{pipe2_rate:1e9,pipe2_hrs:-1,pipe2_pd:'bad',pipe2_pddays:'x',pipe2_weeks:1e9}]){
      const node=render(state), section=explorer(node);expect(section).toBeTruthy();expect(section.outerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);for(const bar of section.querySelectorAll('[data-pipe-pay-bar]')){expect(num(bar,'width')).toBeGreaterThan(0);expect(num(bar,'x')).toBeGreaterThanOrEqual(20-1e-8);expect(num(bar,'x')+num(bar,'width')).toBeLessThanOrEqual(620+1e-8);}
    }
  });

  it.each([false,true])('provides named native controls, full-size HTML readings, zero labels and explicit contrast (contrast=%s)', async contrast => {
    await mount({},contrast);const section=explorer();expect(section.style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(section.style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(238, 242, 255)');
    for(const button of section.querySelectorAll('button')){expect(button.type).toBe('button');expect(button.style.minHeight).toBe('44px');expect(button.hasAttribute('aria-pressed')).toBe(true);expect(button.className).toContain('focus:ring-4');}
    expect(section.querySelectorAll('[data-pipe-pay-select][aria-pressed="true"]')).toHaveLength(1);expect(section.querySelectorAll('[data-pipe-pay-period][aria-pressed="true"]')).toHaveLength(1);
    expect(section.querySelector('[data-pipe-pay-reading]').getAttribute('aria-live')).toBe('polite');expect(section.querySelectorAll('svg text')).toHaveLength(0);expect(section.querySelector('style').textContent).toContain('transition-property: none !important');expect(section.querySelector('style').textContent).toContain('[data-pipe-pay] button:focus-visible { outline: 3px solid '+(contrast?'#ffff00':'#3730a3')+' !important; outline-offset: 3px; }');expect(section.querySelectorAll('animate,animateTransform,canvas')).toHaveLength(0);
    for(const label of section.querySelectorAll('[data-pipe-pay-axis-label]'))expect(label.style.whiteSpace).toBe('nowrap');
  });
});
