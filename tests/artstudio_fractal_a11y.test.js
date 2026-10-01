import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_artstudio.js');
const originalMatchMedia = window.matchMedia;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeFractalContext() {
  return {
    createImageData: vi.fn((width, height) => ({
      data: new Uint8ClampedArray(width * height * 4),
    })),
    putImageData: vi.fn(),
    fillRect: vi.fn(),
  };
}

describe('Art Studio Fractal Explorer accessibility', () => {
  let host;
  let root;
  let config;
  let announce;
  let toast;
  let latest;
  let canvasContext;
  let frames;
  let editSaved;
  let setProfile;
  let contexts;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    canvasContext = makeFractalContext();
    contexts=new Map();frames=new Map();let nextFrame=0;
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(){
      if(!contexts.has(this))contexts.set(this,this.id==='fractalCanvas'?canvasContext:makeFractalContext());return contexts.get(this);
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback=>{frames.set(++nextFrame,callback);return nextFrame;});
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id=>frames.delete(id));
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    announce = vi.fn();
    toast = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: { tab: 'fractal', ...initial },
      });
      latest = toolData;
      editSaved=values=>setToolData(previous=>({artStudio:{...previous.artStudio,...values}}));
      const [profile,changeProfile]=React.useState('fractal-learner');setProfile=changeProfile;
      return config.render(makeCtx({ toolData, setToolData, activeProfileId:profile, announceToSR: announce, addToast:toast }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('provides responsive layout, grouped states, associated sliders, disclosure semantics, and a descriptive output', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'fractal',
        fractalType: 'burningShip',
        fractalIter: 300,
        fractalZoom: 80,
        fractalPanX: 36,
        fractalPanY: -4,
        fractalColor: 'ocean',
        showFractalInfo: true,
      },
    });

    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2');
    expect(html).toContain('role="group" aria-labelledby="artstudio-fractal-type-label"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-fractal-color-label"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-fractal-presets-label"');
    expect(html).toContain('for="artstudio-fractalPanX"');
    expect(html).toContain('id="artstudio-fractalPanX"');
    expect(html).toContain('aria-valuetext="36 horizontal units"');
    expect(html).toContain('for="artstudio-fractalPanY"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="artstudio-fractal-info"');
    expect(html).toContain('role="region" aria-labelledby="artstudio-fractal-info-toggle"');
    expect(html).toContain('aria-describedby="artstudio-fractal-instructions"');
    expect(html).toContain('aria-label="Burning Ship fractal: an asymmetric ship-like boundary with flame-shaped repeating detail. 300 maximum iterations, 80 times zoom, horizontal pan 36, vertical pan -4, ocean color scheme."');
    expect(html).toContain('id="fractalCanvas" tabindex="0"');
    expect(html).toContain('aria-keyshortcuts="ArrowLeft');
  });

  it('offers keyboard-operable pan and zoom controls and announces reset', async () => {
    await mount({ fractalPanX: 0, fractalZoom: 1 });
    const pan = host.querySelector('#artstudio-fractalPanX');
    const zoom = host.querySelector('#artstudio-fractalZoom');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    await act(async () => {
      valueSetter.call(pan, '74');
      pan.dispatchEvent(new Event('input', { bubbles: true }));
      valueSetter.call(zoom, '120');
      zoom.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    expect(latest.artStudio.fractalPanX).toBe(74);
    expect(latest.artStudio.fractalZoom).toBe(120);
    expect(host.querySelector('#fractalCanvas').getAttribute('aria-label')).toContain('120 times zoom, horizontal pan 74');

    const reset = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Reset View'));
    await act(async () => {
      reset.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.fractalPanX).toBe(0);
    expect(latest.artStudio.fractalZoom).toBe(1);
    expect(announce).toHaveBeenCalledWith('Fractal view reset to one times zoom and centered pan.');
  });

  it('suppresses progressive canvas painting when reduced motion is requested', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    await mount();

    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(canvasContext.putImageData).not.toHaveBeenCalled();
    await advance(1);
    expect(canvasContext.putImageData).not.toHaveBeenCalled();
    await advance(63);
    expect(canvasContext.putImageData).toHaveBeenCalledTimes(1);
    expect(host.querySelector('#fractalCanvas').getAttribute('aria-busy')).toBe('false');
  });

  async function advance(count=1){await act(async()=>{for(let i=0;i<count;i++){const entry=frames.entries().next().value;if(!entry)break;frames.delete(entry[0]);entry[1](i*16);}});}
  async function click(selector){await act(async()=>host.querySelector(selector).click());}
  async function key(value,options={}){await act(async()=>host.querySelector('#fractalCanvas').dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...options})));}
  function geometry(){const canvas=host.querySelector('#fractalCanvas');canvas.getBoundingClientRect=()=>({left:10,top:20,width:512,height:512});return canvas;}
  function center(state=latest.artStudio){return [(state.fractalType==='mandelbrot'||!state.fractalType?-0.5:state.fractalType==='burningShip'?-0.4:0)-(state.fractalPanX||0)/50,(state.fractalType==='burningShip'?-0.5:0)-(state.fractalPanY||0)/50];}
  function point(u,v,state=latest.artStudio){const c=center(state);return [c[0]+(u-.5)*3/(state.fractalZoom||1),c[1]+(v-.5)*3/(state.fractalZoom||1)];}
  function exportedPixels(){const output=host.querySelector('#fractalCanvas')._fractalExportCanvas();return contexts.get(output).putImageData.mock.calls.at(-1)[0].data;}

  it('starts wheel zoom at one and preserves the complex point under the pointer',async()=>{
    await mount();const canvas=geometry(),before=point(.8,.2);
    await act(async()=>canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,clientX:10+512*.8,clientY:20+512*.2,cancelable:true})));
    expect(latest.artStudio.fractalZoom).toBe(1.3);
    point(.8,.2).forEach((value,i)=>expect(value).toBeCloseTo(before[i],12));
    await act(async()=>canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:100,clientX:10+512*.8,clientY:20+512*.2,cancelable:true})));
    expect(latest.artStudio.fractalZoom).toBe(1);
    expect(latest.artStudio.fractalPanX).toBeCloseTo(0,12);
    expect(latest.artStudio.fractalPanY).toBeCloseTo(0,12);
    expect(host.querySelector('#fractalCanvas')).toBe(canvas);
  });

  it('centers a double-click precisely at deep zoom and retains keyboard focus',async()=>{
    await mount({fractalZoom:200,fractalPanX:12.34567,fractalPanY:-5.12345});const canvas=geometry(),target=point(.75,.25);
    await act(async()=>canvas.dispatchEvent(new MouseEvent('dblclick',{clientX:394,clientY:148,cancelable:true})));
    expect(latest.artStudio.fractalZoom).toBe(400);
    center().forEach((value,i)=>expect(value).toBeCloseTo(target[i],12));
    expect(document.activeElement).toBe(canvas);
    await key('+');expect(latest.artStudio.fractalZoom).toBe(500);
  });

  it('pans by the visible scale, supports rapid edits, and restores previous/next settings',async()=>{
    await mount({fractalZoom:100});const canvas=geometry();canvas.focus();
    await act(async()=>{canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));});
    expect(latest.artStudio.fractalPanX).toBeCloseTo(-.3,12);
    await key('z',{ctrlKey:true});expect(latest.artStudio.fractalPanX).toBeCloseTo(-.15,12);
    await key('z',{ctrlKey:true,shiftKey:true});expect(latest.artStudio.fractalPanX).toBeCloseTo(-.3,12);
    await click('#artstudio-fractal-back');await click('#artstudio-fractal-in');
    expect(host.querySelector('#artstudio-fractal-forward').disabled).toBe(true);
    await key('Home');expect(latest.artStudio.fractalZoom).toBe(1);expect(latest.artStudio.fractalPanX).toBe(0);
    expect(host.querySelector('#fractalCanvas')).toBe(canvas);
  });

  it('recomputes externally restored settings, cancels stale jobs, and clears other learners history',async()=>{
    await mount();await click('#artstudio-fractal-in');const canvas=geometry();await advance(1);
    const calls=canvasContext.putImageData.mock.calls.length;
    await act(async()=>editSaved({fractalZoom:80,fractalPanX:12.5}));
    expect(host.querySelector('#artstudio-fractal-back').disabled).toBe(true);
    expect(frames.size).toBe(1);
    expect(canvas.getAttribute('data-fractal-rows')).toBe('0');
    await advance(1);expect(canvasContext.putImageData.mock.calls.length).toBe(calls+1);
    await click('#artstudio-fractal-in');await act(async()=>setProfile('second-learner'));
    expect(host.querySelector('#artstudio-fractal-back').disabled).toBe(true);
    expect(host.querySelector('#fractalCanvas')).not.toBe(canvas);
  });

  it('exports opaque complete pixels without advancing a partial preview',async()=>{
    await mount();await advance(2);const canvas=geometry();expect(canvas.getAttribute('data-fractal-rows')).toBe('16');
    const data=exportedPixels();expect(data.every((value,index)=>index%4!==3||value===255)).toBe(true);
    expect(canvas.getAttribute('data-fractal-rows')).toBe('16');
    await advance(62);
    expect(Buffer.compare(Buffer.from(canvasContext.putImageData.mock.calls.at(-1)[0].data),Buffer.from(data))).toBe(0);
    expect(host.querySelector('#artstudio-fractal-progress').value).toBe(100);
    expect(host.querySelector('#artstudio-fractal-status').textContent).toContain('Complete');
  });

  it('draws deterministic Sierpinski subdivisions and applies pan/zoom to their geometry',async()=>{
    await mount({fractalType:'sierpinski',fractalDepth:0});
    expect(host.querySelector('#artstudio-fractalDepth')).not.toBeNull();expect(host.querySelector('#artstudio-fractalIter')).toBeNull();
    const base=exportedPixels().slice(),offset=(256*512+256)*4;
    expect(Array.from(base.slice(offset,offset+3))).not.toEqual([10,10,26]);
    await act(async()=>editSaved({fractalDepth:1}));const carved=exportedPixels().slice();
    expect(Array.from(carved.slice(offset,offset+3))).toEqual([10,10,26]);
    await act(async()=>editSaved({fractalPanX:10,fractalZoom:2}));expect(Buffer.compare(Buffer.from(exportedPixels()),Buffer.from(carved))).not.toBe(0);
    await act(async()=>editSaved({fractalPanX:0,fractalZoom:1}));expect(Buffer.compare(Buffer.from(exportedPixels()),Buffer.from(carved))).toBe(0);
  });

  it('loads Mandelbrot landmarks with the intended view centers',async()=>{
    await mount();await click('[aria-label="Load Seahorse Valley fractal preset"]');
    expect(center()).toEqual([-.75,.1]);
    await click('[aria-label="Load Elephant Valley fractal preset"]');
    expect(center()[0]).toBeCloseTo(.3,12);expect(center()[1]).toBe(0);
    await click('#artstudio-fractal-back');expect(center()).toEqual([-.75,.1]);
  });

  it('handles malformed saved values with finite bounded controls and rendering',async()=>{
    await mount({fractalZoom:NaN,fractalIter:Infinity,fractalPanX:-Infinity,fractalPanY:900,fractalType:'unknown',juliaReal:NaN});
    const model=host.querySelector('#fractalCanvas')._captureArtStudioState();
    expect(model).toMatchObject({fractalZoom:1,fractalIter:200,fractalPanX:0,fractalPanY:200,fractalType:'mandelbrot',juliaReal:-70});
    expect(exportedPixels().every(Number.isFinite)).toBe(true);
  });

  it('stops pending rendering when leaving the fractal lab',async()=>{
    await mount();expect(frames.size).toBe(1);
    await act(async()=>editSaved({studioHome:true}));
    expect(frames.size).toBe(0);expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('classifies known bounded and escaping orbits, including a Julia fixed point on the escape circle',()=>{
    const source=fs.readFileSync(sourcePath,'utf8'),start=source.indexOf('  function artStudioFractalModel('),end=source.indexOf('  // The live watercolor grid',start);
    const {model,sample}=new Function(source.slice(start,end)+';return {model:artStudioFractalModel,sample:artStudioFractalSample};')();
    const mandelbrot=model({});
    for(const x of [0,-1,-2])expect(sample(mandelbrot,x,0)).toBe(-1);
    expect(sample(mandelbrot,1,0)).toBeGreaterThanOrEqual(0);
    expect(sample(mandelbrot,0,1.5)).toBeGreaterThanOrEqual(0);
    const julia=model({fractalType:'julia',juliaReal:-200,juliaImag:0});
    expect(sample(julia,2,0)).toBe(-1);
    expect(sample(julia,2.1,0)).toBeGreaterThanOrEqual(0);
    expect(sample(julia,8,8)).toBeGreaterThanOrEqual(0);
  });

  it('reports an unavailable canvas export without claiming success',async()=>{
    window.HTMLCanvasElement.prototype.getContext.mockReturnValue(null);
    await mount();await click('[aria-label="Export fractal as PNG"]');
    expect(toast).toHaveBeenCalledWith('Unable to export this fractal. Please try again.','error');
    expect(announce).not.toHaveBeenCalledWith('Fractal PNG exported.');
  });

  it('bounds exploration history and clears it when an identical study is restored',async()=>{
    await mount({fractalZoom:100});
    for(let i=0;i<35;i++)await key('ArrowRight');
    for(let i=0;i<30;i++)await click('#artstudio-fractal-back');
    expect(host.querySelector('#artstudio-fractal-back').disabled).toBe(true);
    expect(latest.artStudio.fractalPanX).toBeCloseTo(-.75,12);
    await click('#artstudio-fractal-forward');
    await act(async()=>editSaved({fractalRestoreToken:'forked-study'}));
    expect(host.querySelector('#artstudio-fractal-back').disabled).toBe(true);
    expect(host.querySelector('#artstudio-fractal-forward').disabled).toBe(true);
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
