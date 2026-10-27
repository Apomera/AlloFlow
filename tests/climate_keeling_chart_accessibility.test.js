import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url);
const {act}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const sources=['stem_lab/stem_tool_climateExplorer.js','desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const cleanup=[];
let frames,observers,paint;

function mount(source){
  resetStemLab();const tool=loadTool(source,'climateExplorer');
  const host=document.createElement('div');document.body.appendChild(host);
  const root=ReactDOMClient.createRoot(host);let update;
  function Host(){
    const[data,setData]=React.useState({climateExplorer:{tab:'keeling',heroMotionPaused:true}});
    update=patch=>setData(previous=>({climateExplorer:{...previous.climateExplorer,...patch}}));
    return tool.render(makeCtx({toolData:data,setToolData:setData,callGemini:null}));
  }
  act(()=>root.render(React.createElement(Host)));
  let closed=false;const unmount=()=>{if(closed)return;closed=true;act(()=>root.unmount());host.remove();};cleanup.push(unmount);
  return {one:selector=>host.querySelector(selector),update:patch=>act(()=>update(patch)),unmount};
}
async function settle(){await act(async()=>{await Promise.resolve();vi.runOnlyPendingTimers();frames.splice(0).forEach(callback=>callback(16));await Promise.resolve();});}
function series(color){return paint.strokes.filter(row=>row.color===color).at(-1);}
function backgroundPaints(){return paint.rects.filter(row=>row.color==='#0f172a');}

beforeEach(()=>{
  vi.useFakeTimers();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);frames=[];observers=[];
  vi.stubGlobal('requestAnimationFrame',callback=>{frames.push(callback);return frames.length;});vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.stubGlobal('devicePixelRatio',2);
  vi.spyOn(HTMLElement.prototype,'offsetWidth','get').mockReturnValue(240);
  vi.stubGlobal('ResizeObserver',class{constructor(callback){this.callback=callback;this.disconnect=vi.fn();this.observe=vi.fn();observers.push(this);}});
  paint={strokes:[],rects:[],texts:[],circles:[],path:[],dash:[],setTransform:vi.fn(),
    beginPath(){this.path=[];},moveTo(x,y){this.path.push({command:'M',x,y});},lineTo(x,y){this.path.push({command:'L',x,y});},
    setLineDash(value){this.dash=value.slice();},stroke(){this.strokes.push({color:this.strokeStyle,dash:this.dash.slice(),points:this.path.slice()});},
    arc(x,y,r){this.circles.push({x,y,r,color:this.fillStyle});},fill(){},
    fillRect(x,y,w,h){this.rects.push({x,y,w,h,color:this.fillStyle});},
    fillText(text,x,y){this.texts.push({text,x,y,color:this.fillStyle,font:this.font});}};
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){return this.id==='ce-keeling-chart'?paint:null;});
});
afterEach(async()=>{cleanup.splice(0).forEach(fn=>fn());await settle();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});

describe.each(sources)('Keeling chart rendering: %s',source=>{
  it('gives the selected record its factual name and shared text descriptions without adding a noninteractive tab stop',async()=>{
    const view=mount(source);await settle();const canvas=view.one('#ce-keeling-chart');
    expect(canvas?.getAttribute('role')).toBe('img');expect(canvas.hasAttribute('tabindex')).toBe(false);
    expect(canvas.getAttribute('aria-label')).toContain('Selected historical records, 1958 to 2024');
    expect(canvas.getAttribute('aria-label')).toContain('315.0 to 424.6 ppm');
    expect(canvas.getAttribute('aria-label')).toContain('+0.07 to +1.28 degrees Celsius');
    expect(canvas.getAttribute('aria-label')).toContain('1951 to 1980 average');
    expect(canvas.getAttribute('aria-label')).toContain('separate aligned plots');
    expect(canvas.getAttribute('aria-describedby').split(/\s+/)).toEqual(['ce-keeling-summary','ce-keeling-legend']);
    expect(paint.texts.some(row=>/Paris|pre-industrial|right axis/i.test(row.text))).toBe(false);
  });

  it('draws both original records on aligned separate scales with distinct line and marker patterns',async()=>{
    const view=mount(source);await settle();const canvas=view.one('#ce-keeling-chart');
    expect(backgroundPaints()).toEqual([{x:0,y:0,w:240,h:448,color:'#0f172a'}]);
    expect(canvas.width).toBe(480);expect(canvas.height).toBe(896);
    expect(paint.setTransform).toHaveBeenCalledWith(2,0,0,2,0,0);
    const co2=series('#60a5fa'),temperature=series('#fbbf24');
    expect(co2.dash).toEqual([]);expect(temperature.dash).toEqual([8,5]);
    expect(co2.points).toHaveLength(18);expect(temperature.points).toHaveLength(17);
    expect(co2.points[0].x).toBe(temperature.points[0].x);expect(co2.points[0].x).toBe(46);
    expect(co2.points.at(-1).x).toBe(temperature.points.at(-1).x);expect(co2.points.at(-1).x).toBe(228);
    expect(co2.points[0].y).toBeCloseTo(182-(315-300)/140*128);
    expect(co2.points.at(-1).y).toBeCloseTo(182-(424.6-300)/140*128);
    expect(temperature.points[0].y).toBeCloseTo(414-(0.07+0.2)/1.6*128);
    expect(temperature.points.at(-1).y).toBeCloseTo(414-(1.28+0.2)/1.6*128);
    expect(co2.points.every(point=>point.y>=54&&point.y<=182)).toBe(true);
    expect(temperature.points.every(point=>point.y>=286&&point.y<=414)).toBe(true);
    expect(paint.circles.filter(row=>row.color==='#60a5fa')).toHaveLength(18);
    expect(paint.rects.filter(row=>row.color==='#fbbf24'&&row.w===6&&row.h===6)).toHaveLength(17);
    expect(paint.texts.map(row=>row.text)).toEqual(expect.arrayContaining(['Mauna Loa CO₂ (ppm)','Temperature anomaly (°C)','Baseline: 1951–1980','-0.2','0.0','+1.4']));
    expect(paint.texts.filter(row=>/^(1958|1990|2024)$/.test(row.text)).map(row=>row.text)).toEqual(['1958','1990','2024','1958','1990','2024']);
  });

  it('redraws the same canvas at the new width and pixel density without accumulating transforms',async()=>{
    const view=mount(source);await settle();const canvas=view.one('#ce-keeling-chart'),observer=observers.at(-1);
    expect(observer.observe).toHaveBeenCalledWith(canvas);
    Object.defineProperty(canvas,'offsetWidth',{configurable:true,value:220});
    act(()=>observer.callback());expect(view.one('#ce-keeling-chart')).toBe(canvas);expect(canvas.width).toBe(440);
    expect(series('#60a5fa').points.at(-1).x).toBe(208);expect(series('#fbbf24').points.at(-1).x).toBe(208);
    expect(backgroundPaints()).toHaveLength(2);
    act(()=>observer.callback());expect(backgroundPaints()).toHaveLength(2);
    vi.stubGlobal('devicePixelRatio',1);act(()=>observer.callback());expect(canvas.width).toBe(220);expect(canvas.height).toBe(448);
    expect(paint.setTransform).toHaveBeenLastCalledWith(1,0,0,1,0,0);expect(backgroundPaints()).toHaveLength(3);
  });

  it('disconnects resize observation when leaving the tab and ignores callbacks after detachment',async()=>{
    const view=mount(source);await settle();const observer=observers.at(-1);
    view.update({tab:'carbon'});await settle();expect(view.one('#ce-keeling-chart')).toBeNull();expect(observer.disconnect).toHaveBeenCalledOnce();
    const count=backgroundPaints().length;act(()=>observer.callback());await settle();expect(backgroundPaints()).toHaveLength(count);
    view.unmount();act(()=>observer.callback());await settle();expect(backgroundPaints()).toHaveLength(count);
  });

  it('uses and removes the window resize fallback when ResizeObserver is unavailable',async()=>{
    vi.stubGlobal('ResizeObserver',undefined);
    const add=vi.spyOn(window,'addEventListener'),remove=vi.spyOn(window,'removeEventListener');
    const view=mount(source);await settle();const canvas=view.one('#ce-keeling-chart');
    const listener=add.mock.calls.find(([name])=>name==='resize')?.[1];expect(typeof listener).toBe('function');
    Object.defineProperty(canvas,'offsetWidth',{configurable:true,value:230});
    act(()=>window.dispatchEvent(new Event('resize')));expect(canvas.width).toBe(460);
    view.unmount();expect(remove).toHaveBeenCalledWith('resize',listener);
    const count=backgroundPaints().length;act(()=>listener());expect(backgroundPaints()).toHaveLength(count);
  });
});
