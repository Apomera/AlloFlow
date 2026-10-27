import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url);
const { act }=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths=['stem_lab/stem_tool_climateExplorer.js','desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const disposers=[];
let frames,drawings;
const format=value=>value.toLocaleString();
const selector='canvas[aria-label^="Carbon footprint breakdown."]';

function canvasRecorder() {
  const saved=[],text=[];
  const context={ fillStyle:'#000000',font:'10px sans-serif',textAlign:'start',textBaseline:'alphabetic',shadowColor:'transparent',shadowBlur:0,
    scale:vi.fn(),beginPath:vi.fn(),arc:vi.fn(),closePath:vi.fn(),fill:vi.fn(),
    save(){ saved.push(Object.fromEntries(['fillStyle','font','textAlign','textBaseline','shadowColor','shadowBlur'].map(key=>[key,this[key]]))); },
    restore(){ Object.assign(this,saved.pop()); },
    fillText(value,x,y){ text.push({ text:String(value),x,y,color:this.fillStyle,font:this.font,align:this.textAlign,baseline:this.textBaseline }); }
  };
  return { context,text };
}
function mountTool(path,seed={},draw=false) {
  resetStemLab(); const config=loadTool(path,'climateExplorer');
  const host=document.createElement('div'); document.body.appendChild(host);
  const root=ReactDOMClient.createRoot(host); let updateTheme;
  function Host() {
    const [data,setData]=React.useState({ climateExplorer:{ tab:'carbon',heroMotionPaused:true,...seed } });
    const [theme,setTheme]=React.useState('light'); updateTheme=setTheme;
    return config.render(makeCtx({ toolData:data,setToolData:setData,theme:theme==='dark'?'dark':'light',isContrast:theme==='contrast' }));
  }
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(function(){
    if(!draw || !this.matches(selector)) return null;
    if(!drawings.has(this)) drawings.set(this,canvasRecorder());
    return drawings.get(this).context;
  });
  act(()=>root.render(React.createElement(Host)));
  disposers.push(()=>{ act(()=>root.unmount()); host.remove(); });
  return { host,one:query=>host.querySelector(query),theme:value=>act(()=>updateTheme(value)) };
}
async function settle() {
  await act(async()=>{ await Promise.resolve(); vi.runOnlyPendingTimers(); });
  await act(async()=>{ frames.splice(0).forEach(callback=>callback(16)); await Promise.resolve(); });
}
async function activate(button) { button.focus(); act(()=>button.click()); await settle(); }
function textColor(color) { const node=document.createElement('span'); node.style.color=color; return node.style.color; }
function legend(canvas,label,value) {
  return [...canvas.parentElement.querySelectorAll('span')].find(span=>span.textContent===label+': '+format(value)+' kg');
}

beforeEach(()=>{
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true); frames=[]; drawings=new WeakMap();
  vi.stubGlobal('requestAnimationFrame',callback=>{ frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
});
afterEach(async()=>{
  disposers.splice(0).forEach(dispose=>dispose()); await settle();
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Carbon chart accessibility: %s',path=>{
  it('keeps exact total and category values readable without canvas and updates them with the actual selection',async()=>{
    const view=mountTool(path,{ ccTransport:2,ccFood:2,ccEnergy:2,ccWaste:2 }); await settle();
    const chart=view.one(selector),total=view.one('#ce-carbon-total');
    expect(chart.getAttribute('role')).toBe('img'); expect(total).toBeTruthy();
    expect(total.textContent).toContain(format(8700)); expect(total.textContent).toMatch(/kg|kilograms/i);
    expect(chart.getAttribute('aria-label')).toContain('Total '+format(8700)+' kilograms');
    for(const [label,value] of [['Transport',1200],['Food',2500],['Energy',4000],['Waste',1000]]) {
      expect(legend(chart,label,value)).toBeTruthy();
      expect(chart.getAttribute('aria-label')).toContain(label+' '+format(value)+' kilograms');
    }
    const walking=view.one('#ce-carbon-choice-transport-0'); await activate(walking);
    expect(document.activeElement).toBe(walking); expect(legend(chart,'Transport',0)).toBeTruthy();
    expect(view.one('#ce-carbon-total').textContent).toContain(format(7500));
    expect(chart.getAttribute('aria-label')).toContain('Total '+format(7500)+' kilograms');
    expect(chart.getAttribute('aria-label')).toContain('Transport 0 kilograms, 0 percent');
  });

  it('redraws centered total and units when the theme changes while retaining the same values and text alternatives',async()=>{
    const view=mountTool(path,{},true); await settle();
    const chart=view.one(selector),record=drawings.get(chart),label=chart.getAttribute('aria-label');
    expect(record).toBeTruthy(); expect(record.text).toHaveLength(2);
    const primary=[],secondary=[];
    for(const theme of ['light','dark','contrast','light']) {
      const previousDrawCount=record.text.length;
      if(primary.length){ view.theme(theme); await settle(); expect(record.text).toHaveLength(previousDrawCount+2); }
      expect(view.one(selector)).toBe(chart); expect(chart.getAttribute('aria-label')).toBe(label);
      const [total,units]=record.text.slice(-2);
      expect(total.text).toBe(format(900)); expect(units.text).toBe('kg CO₂/yr');
      expect(total.align).toBe('center'); expect(units.align).toBe('center');
      expect(total.baseline).toBe('middle'); expect(units.baseline).toBe('middle'); expect(units.x).toBe(total.x);
      expect(textColor(total.color)).toBe(legend(chart,'Food',600).style.color);
      expect(view.one('#ce-carbon-total').textContent).toContain(format(900));
      primary.push(total.color); secondary.push(units.color);
    }
    expect(new Set(primary.slice(0,3)).size).toBe(3); expect(new Set(secondary.slice(0,3)).size).toBe(3);
    expect(primary[3]).toBe(primary[0]); expect(secondary[3]).toBe(secondary[0]);
  });
});
