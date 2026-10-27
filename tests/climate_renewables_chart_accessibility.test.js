import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url);
const {act}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const sources=['stem_lab/stem_tool_climateExplorer.js','desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const cleanup=[];
let frames,observers,paint;

function mount(source,seed={}){
  resetStemLab();const tool=loadTool(source,'climateExplorer');
  const host=document.createElement('div');document.body.appendChild(host);
  const root=ReactDOMClient.createRoot(host);let current;
  function Host(){
    const[data,setData]=React.useState({climateExplorer:{tab:'renewables',heroMotionPaused:true,rsSolar:0,rsWind:0,rsHydro:0,rsNuclear:0,rsStorage:0,rsTimespan:5,...seed}});
    current=data.climateExplorer;
    return tool.render(makeCtx({toolData:data,setToolData:setData,callGemini:null}));
  }
  act(()=>root.render(React.createElement(Host)));
  let closed=false;const unmount=()=>{if(closed)return;closed=true;act(()=>root.unmount());host.remove();};cleanup.push(unmount);
  return {host,one:selector=>host.querySelector(selector),all:selector=>[...host.querySelectorAll(selector)],state:()=>current,unmount};
}
async function settle(){await act(async()=>{await Promise.resolve();});await act(async()=>{vi.runOnlyPendingTimers();frames.splice(0).forEach(callback=>callback(16));await Promise.resolve();});}
async function activate(button){expect(button).toBeTruthy();button.focus();act(()=>button.click());await settle();}
function values(view){return view.all('#ce-renewables-timeline-table tbody tr').map(row=>[...row.children].map(cell=>cell.textContent));}

beforeEach(()=>{
  vi.useFakeTimers();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);frames=[];observers=[];
  vi.stubGlobal('requestAnimationFrame',callback=>{frames.push(callback);return frames.length;});vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.stubGlobal('ResizeObserver',class{constructor(callback){this.callback=callback;this.disconnect=vi.fn();this.observe=vi.fn();observers.push(this);}});
  paint={fills:[],strokes:[],texts:[],dash:[],scale:vi.fn(),fillRect:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),arc:vi.fn(),
    setLineDash(value){this.dash=value.slice();},stroke(){this.strokes.push({color:this.strokeStyle,dash:this.dash.slice()});},fill(){this.fills.push(this.fillStyle);},fillText(text,x,y){this.texts.push({text,x,y});}};
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){return this.id==='ce-renewables-timeline'?paint:null;});
});
afterEach(async()=>{cleanup.splice(0).forEach(fn=>fn());await settle();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});

describe.each(sources)('Renewables chart alternatives: %s',source=>{
  it('keeps an empty persistent data target without taking restored focus',async()=>{
    const outside=document.createElement('button');document.body.appendChild(outside);outside.focus();cleanup.push(()=>outside.remove());
    const view=mount(source);await settle();
    const toggle=view.one('#ce-renewables-timeline-toggle'),panel=view.one('#ce-renewables-timeline-panel');
    expect(document.activeElement).toBe(outside);expect(toggle.type).toBe('button');expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe(panel.id);expect(panel.hidden).toBe(true);expect(view.one('table')).toBeNull();
    expect(panel.getAttribute('aria-labelledby')).toBe(toggle.id);
  });

  it('opens a real table of every year with caption and row/column headers; closing retains focus',async()=>{
    const view=mount(source);await settle();const toggle=view.one('#ce-renewables-timeline-toggle'),panel=view.one('#ce-renewables-timeline-panel');
    await activate(toggle);expect(document.activeElement).toBe(toggle);expect(panel.hidden).toBe(false);expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(view.one('caption').textContent).toMatch(/2025.*2030/);
    expect(view.all('thead th[scope="col"]').map(cell=>cell.textContent)).toEqual(['Year','Gt CO₂ / year']);
    expect(view.all('tbody th[scope="row"]')).toHaveLength(6);
    expect(values(view)).toEqual(Array.from({length:6},(_,index)=>[String(2025+index),'37.0']));
    await activate(toggle);expect(document.activeElement).toBe(toggle);expect(view.one('#ce-renewables-timeline-panel')).toBe(panel);expect(panel.hidden).toBe(true);expect(view.one('table')).toBeNull();
  });

  it('keeps the summary, text alternative, table and result synchronized after a preset',async()=>{
    const view=mount(source,{rsTimespan:10,rsTimelineOpen:true});await settle();await activate(view.one('#ce-renewables-preset-0'));
    const rows=values(view);expect(rows).toHaveLength(11);expect(rows[0]).toEqual(['2025','37.0']);expect(rows[5]).toEqual(['2030','19.4']);expect(rows[10]).toEqual(['2035','1.8']);
    expect(view.one('#ce-renewables-endpoint').textContent).toBe('1.8');
    const canvas=view.one('#ce-renewables-timeline'),summary=view.one('#ce-renewables-timeline-summary');
    expect(summary.textContent).toMatch(/37\.0 Gt.*1\.8 Gt.*2035/);
    expect(canvas.getAttribute('aria-label')).toMatch(/2035.*1\.8.*at or below/);
    expect(canvas.getAttribute('aria-label')).toContain('does not predict temperature');
    for(const id of canvas.getAttribute('aria-describedby').split(/\s+/))expect(view.one('#'+id)?.textContent.trim()).toBeTruthy();
    expect(view.one('#ce-renewables-timeline-legend').textContent).toMatch(/Solid.*Long dashed.*Dotted/);
  });

  it('updates the open table across every offered duration without moving focus',async()=>{
    const view=mount(source,{rsTimelineOpen:true});await settle();
    for(const years of [10,25,50,5]){
      const button=view.one('#ce-renewables-timespan-'+years);await activate(button);
      expect(document.activeElement).toBe(button);expect(values(view)).toHaveLength(years+1);
      expect(values(view).at(-1)).toEqual([String(2025+years),'37.0']);expect(view.one('caption').textContent).toContain(String(2025+years));
    }
  });

  it('retains zero results and explicit units for an unchanged fossil baseline',async()=>{
    const view=mount(source,{rsTimelineOpen:true});await settle();
    expect(view.one('#ce-renewables-reduction').textContent).toBe('0%');expect(view.one('#ce-renewables-avoided').textContent).toBe('0');
    expect(view.one('#ce-renewables-endpoint').textContent).toBe('37.0');expect(values(view).every(row=>row[1]==='37.0')).toBe(true);
    expect(view.one('#ce-renewables-timeline').getAttribute('aria-label')).toContain('remains at 37.0');
    expect(view.one('#ce-renewables-timeline-summary').textContent).toContain('one billion metric tons');
  });

  it('redraws the same canvas on resize with distinct line patterns and releases its observer',async()=>{
    const view=mount(source);await settle();const canvas=view.one('#ce-renewables-timeline'),observer=observers.at(-1);
    expect(observer.observe).toHaveBeenCalledWith(canvas);
    expect(paint.strokes.some(row=>row.dash.length===0)).toBe(true);
    expect(new Set(paint.strokes.filter(row=>row.dash.length).map(row=>row.dash.join(','))).size).toBe(2);
    const before=paint.fillRect.mock.calls.length;Object.defineProperty(canvas,'offsetWidth',{configurable:true,value:230});
    act(()=>observer.callback());expect(paint.fillRect.mock.calls.length).toBe(before+1);expect(canvas.width).toBe(230*(window.devicePixelRatio||1));
    const latest=paint.texts.slice(-7);expect(latest.filter(row=>/^20\d\d$/.test(row.text)).map(row=>row.text)).toEqual(['2025','2030']);
    act(()=>observer.callback());expect(paint.fillRect.mock.calls.length).toBe(before+1);
    view.unmount();expect(observer.disconnect).toHaveBeenCalled();const finished=paint.fillRect.mock.calls.length;
    act(()=>observer.callback());await settle();expect(paint.fillRect.mock.calls.length).toBe(finished);
  });
});
