import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_artstudio.js');
const originalMatchMedia = window.matchMedia;
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Art Studio Gradient Lab accessibility', () => {
  let host;
  let root;
  let config;
  let announce;
  let latest;
  let clipboard;
  let updateState;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: vi.fn(() => ({ matches: false })) });
    const gradient = { addColorStop: vi.fn() };
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createLinearGradient: vi.fn(() => gradient),
      createRadialGradient: vi.fn(() => gradient),
      createConicGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      createImageData: vi.fn((width,height)=>({data:new Uint8ClampedArray(width*height*4),width,height})),
      putImageData: vi.fn(),
    });
    clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    announce = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: originalMatchMedia });
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else delete navigator.clipboard;
  });

  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: { tab: 'gradient', ...initial } });
      latest = toolData;
      updateState = setToolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('provides responsive grouped controls, visible stop labels, disclosure semantics, and descriptive output', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'gradient',
        gradType: 'linear',
        gradAngle: 135,
        gradBlend: 'hard',
        gradStops: [{ hue: 330, pos: 0 }, { hue: 180, pos: 50 }, { hue: 45, pos: 100 }],
        showGradInfo: true,
      },
    });

    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2');
    expect(html).toContain('role="group" aria-labelledby="artstudio-gradient-type-label"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-gradient-blend-label"');
    expect(html).toContain('for="artstudio-grad-angle"');
    expect(html).toContain('aria-valuetext="135 degrees"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-gradient-stops-label"');
    expect(html).toContain('Color stop 2, hue 180 degrees, position 50 percent');
    expect(html).toContain('for="artstudio-grad-stop-1-hue"');
    expect(html).toContain('for="artstudio-grad-stop-1-position"');
    expect(html).toContain('aria-label="Remove color stop 2"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-gradient-presets-label"');
    expect(html).toContain('aria-label="Copy gradient CSS to clipboard"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('role="region" aria-labelledby="artstudio-gradient-info-toggle"');
    expect(html).toContain('aria-label="Gradient output: linear at 135 degrees, hard blend, with 3 color stops: hue 330 at 0 percent, hue 180 at 50 percent, hue 45 at 100 percent."');
    expect(html).not.toContain('id="gradientCanvas" tabindex=');
  });

  it('adds and edits stops without reordering the focused row', async () => {
    await mount({ gradStops: [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }] });
    const add = host.querySelector('button[aria-label="Add color stop"]');
    await act(async () => {
      add.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.gradStops).toHaveLength(3);
    expect(announce).toHaveBeenCalledWith('Color stop added. 3 stops total.');

    const position = host.querySelector('#artstudio-grad-stop-1-position');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => {
      valueSetter.call(position, '60');
      position.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.gradStops[1].pos).toBe(60);
    expect(host.querySelector('#artstudio-grad-stop-1-position')).not.toBeNull();
    expect(host.querySelector('#gradientCanvas').getAttribute('aria-label')).toContain('at 60 percent');
  });

  it.each([[0,[256,512,256,0]],[90,[0,256,512,256]],[135,[0,0,512,512]]])('uses CSS geometry for a %s degree linear gradient', async (angle,expected) => {
    await mount({gradAngle:angle});
    const context=HTMLCanvasElement.prototype.getContext.mock.results.at(-1).value;
    const endpoints=context.createLinearGradient.mock.calls.at(-1);
    endpoints.forEach((value,index)=>expect(value).toBeCloseTo(expected[index],5));
    expect(host.querySelector('#artstudio-gradient-css').textContent).toContain(angle+'deg in srgb');
  });

  it('renders every hard-edge color and copies the same band boundaries', async () => {
    await mount({gradBlend:'hard',gradStops:[{hue:0,sat:100,lit:50,pos:0},{hue:120,sat:60,lit:30,pos:50},{hue:240,sat:20,lit:90,pos:100}]});
    const context=HTMLCanvasElement.prototype.getContext.mock.results.at(-1).value;
    const gradient=context.createLinearGradient.mock.results.at(-1).value;
    expect(gradient.addColorStop.mock.calls).toEqual([[0,'hsl(0, 100%, 50%)'],[.25,'hsl(0, 100%, 50%)'],[.25,'hsl(120, 60%, 30%)'],[.75,'hsl(120, 60%, 30%)'],[.75,'hsl(240, 20%, 90%)'],[1,'hsl(240, 20%, 90%)']]);
    expect(context.fillRect.mock.calls.length).toBeLessThan(5);
    await act(async()=>host.querySelector('[aria-label="Copy gradient CSS to clipboard"]').click());
    expect(clipboard.writeText).toHaveBeenCalledWith('background: '+host.querySelector('#artstudio-gradient-css').textContent+';');
    expect(clipboard.writeText.mock.calls.at(-1)[0]).toContain('hsl(240, 20%, 90%) 75%');
  });

  it('supports black, white and desaturated stops without replacing zero values with defaults', async () => {
    await mount({gradStops:[{hue:200,sat:0,lit:0,pos:0},{hue:45,sat:0,lit:100,pos:100}]});
    expect(host.querySelector('#artstudio-gradient-css').textContent).toContain('hsl(200, 0%, 0%)');
    expect(host.querySelector('#artstudio-gradient-css').textContent).toContain('hsl(45, 0%, 100%)');
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    await act(async()=>{const slider=host.querySelector('#artstudio-grad-stop-0-lit');setter.call(slider,'25');slider.dispatchEvent(new Event('input',{bubbles:true}));});
    expect(latest.artStudio.gradStops[0]).toEqual({hue:200,sat:0,lit:25,pos:0});
    expect(host.querySelector('#artstudio-gradient-css').textContent).toContain('hsl(200, 0%, 25%)');
  });

  it('uses native conic rendering with the CSS top-origin convention', async () => {
    await mount({gradType:'conic'});
    const context=HTMLCanvasElement.prototype.getContext.mock.results.at(-1).value;
    expect(context.createConicGradient).toHaveBeenCalledWith(-Math.PI/2,256,256);
    expect(host.querySelector('#artstudio-gradient-css').textContent).toContain('conic-gradient(from 0deg in srgb');
  });

  it('reports clipboard failure when writing throws synchronously', async () => {
    await mount();
    clipboard.writeText.mockImplementation(()=>{throw new Error('Clipboard unavailable');});
    await act(async()=>host.querySelector('[aria-label="Copy gradient CSS to clipboard"]').click());
    expect(announce).toHaveBeenCalledWith('Unable to copy gradient CSS.');
  });

  it('announces successful CSS copy status', async () => {
    await mount();
    const copy = host.querySelector('button[aria-label="Copy gradient CSS to clipboard"]');
    await act(async () => {
      copy.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('linear-gradient'));
    expect(announce).toHaveBeenCalledWith('Gradient CSS copied to the clipboard.');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });

  async function input(selector,value){
    const element=host.querySelector(selector),setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    await act(async()=>{setter.call(element,String(value));element.dispatchEvent(new Event('input',{bubbles:true}));});
  }
  async function button(label){const element=[...host.querySelectorAll('button')].find(node=>node.textContent===label||node.getAttribute('aria-label')===label);expect(element).toBeTruthy();await act(async()=>element.click());}

  it('adds a sampled color in the widest gap instead of inserting a random hue',async()=>{
    await mount({gradStops:[{hue:0,sat:100,lit:50,pos:0},{hue:120,sat:100,lit:50,pos:20},{hue:240,sat:100,lit:50,pos:100}]});
    await button('Add color stop');expect(latest.artStudio.gradStops.map(stop=>stop.pos)).toEqual([0,20,60,100]);
    expect(latest.artStudio.gradStops[2]).toEqual({hue:180,sat:100,lit:25,pos:60});
    await button('Undo gradient edit');expect(latest.artStudio.gradStops).toHaveLength(3);
    await button('Redo gradient edit');expect(latest.artStudio.gradStops[2].pos).toBe(60);
  });

  it('duplicates, reverses and distributes complete colors including opacity',async()=>{
    await mount({gradStops:[{hue:0,sat:100,lit:50,pos:10,alpha:30},{hue:120,sat:50,lit:30,pos:40},{hue:240,sat:30,lit:60,pos:80}]});
    await button('Duplicate color stop 1');expect(latest.artStudio.gradStops[0]).toEqual(latest.artStudio.gradStops[1]);
    await button('Reverse stops');expect(latest.artStudio.gradStops.map(stop=>stop.pos)).toEqual([20,60,90,90]);expect(latest.artStudio.gradStops.at(-1).alpha).toBe(30);
    await button('Space evenly');expect(latest.artStudio.gradStops.map(stop=>stop.pos)).toEqual([0,33.3333,66.6667,100]);
    await button('Undo gradient edit');expect(latest.artStudio.gradStops.map(stop=>stop.pos)).toEqual([20,60,90,90]);
  });

  it('groups a range drag into one undo step and retains the same live canvas',async()=>{
    await mount({gradAngle:90});const canvas=host.querySelector('#gradientCanvas'),slider=host.querySelector('#artstudio-grad-angle');
    await act(async()=>host.querySelector('#artstudio-grad-stop-0-hue').focus());
    await act(async()=>{slider.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true}));slider.focus();});
    await input('#artstudio-grad-angle',120);await input('#artstudio-grad-angle',170);await input('#artstudio-grad-angle',210);
    await act(async()=>slider.dispatchEvent(new MouseEvent('pointerup',{bubbles:true})));
    expect(host.querySelector('#gradientCanvas')).toBe(canvas);await button('Undo gradient edit');expect(latest.artStudio.gradAngle).toBe(90);expect(host.querySelector('#artstudio-gradient-undo').disabled).toBe(true);
    await button('Redo gradient edit');expect(latest.artStudio.gradAngle).toBe(210);
  });

  it('groups keyboard repeats and supports undo shortcuts',async()=>{
    await mount({gradAngle:90});const slider=host.querySelector('#artstudio-grad-angle');
    await act(async()=>slider.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));
    await input('#artstudio-grad-angle',91);await input('#artstudio-grad-angle',92);
    await act(async()=>slider.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowRight',bubbles:true})));
    await act(async()=>slider.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true})));
    expect(latest.artStudio.gradAngle).toBe(90);
    await act(async()=>slider.dispatchEvent(new KeyboardEvent('keydown',{key:'Z',metaKey:true,shiftKey:true,bubbles:true,cancelable:true})));
    expect(latest.artStudio.gradAngle).toBe(92);
  });

  it('makes a preset one complete reversible edit and discards redo after branching',async()=>{
    await mount({gradType:'conic',gradRotation:110,gradCenterX:10,gradCenterY:80,gradBlend:'hard'});
    await button('Load Sunset gradient preset');expect(latest.artStudio).toMatchObject({gradType:'linear',gradAngle:180,gradCenterX:50,gradCenterY:50,gradRotation:0,gradBlend:'smooth'});
    await button('Undo gradient edit');expect(latest.artStudio).toMatchObject({gradType:'conic',gradRotation:110,gradCenterX:10,gradCenterY:80,gradBlend:'hard'});
    await input('[aria-label="Conic rotation"]',140);expect(host.querySelector('#artstudio-gradient-redo').disabled).toBe(true);
  });

  it('uses the chosen radial center and farthest corner in both canvas and CSS',async()=>{
    await mount({gradType:'radial',gradCenterX:25,gradCenterY:80});
    const context=HTMLCanvasElement.prototype.getContext.mock.results.at(-1).value;
    expect(context.createRadialGradient).toHaveBeenLastCalledWith(128,409.6,0,128,409.6,Math.hypot(384,409.6));
    expect(host.querySelector('#artstudio-gradient-css').textContent).toContain('circle farthest-corner at 25% 80% in srgb');
    await button('Recenter gradient');expect(latest.artStudio).toMatchObject({gradCenterX:50,gradCenterY:50});
    await button('Undo gradient edit');expect(latest.artStudio).toMatchObject({gradCenterX:25,gradCenterY:80});
  });

  it('rotates conic gradients around an offset center',async()=>{
    await mount({gradType:'conic',gradRotation:90,gradCenterX:0,gradCenterY:100});
    const context=HTMLCanvasElement.prototype.getContext.mock.results.at(-1).value;
    expect(context.createConicGradient).toHaveBeenCalledWith(0,0,512);
    expect(host.querySelector('#artstudio-gradient-css').textContent).toContain('conic-gradient(from 90deg at 0% 100% in srgb');
  });

  it('renders alpha with premultiplied colors and retains fully transparent stops',async()=>{
    await mount({gradStops:[{hue:0,sat:100,lit:50,pos:0,alpha:0},{hue:240,sat:100,lit:50,pos:100}]});
    const context=HTMLCanvasElement.prototype.getContext.mock.results.at(-1).value;
    expect(context.createLinearGradient).not.toHaveBeenCalled();const pixels=context.putImageData.mock.calls.at(-1)[0].data;
    expect([...pixels.slice(256*4,256*4+4)]).toEqual([0,0,255,128]);
    expect(host.querySelector('#artstudio-grad-stop-0-alpha').value).toBe('0');
    expect(host.querySelector('#artstudio-gradient-css').textContent).toContain('hsla(0, 100%, 50%, 0)');
    await input('#artstudio-grad-stop-0-alpha',100);expect(latest.artStudio.gradStops[0].alpha).toBe(100);expect(context.createLinearGradient).toHaveBeenCalled();
  });

  it('resets history for an externally restored study even when its colors match',async()=>{
    await mount();await input('#artstudio-grad-angle',135);expect(host.querySelector('#artstudio-gradient-undo').disabled).toBe(false);
    await act(async()=>updateState(previous=>({artStudio:{...previous.artStudio,gradRestoreToken:'forked-study'}})));
    expect(host.querySelector('#artstudio-gradient-undo').disabled).toBe(true);expect(host.querySelector('#artstudio-gradient-redo').disabled).toBe(true);
  });
});
