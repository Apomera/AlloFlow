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

function makeOpContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    ellipse: vi.fn(),
    stroke: vi.fn(),
    restore: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    closePath: vi.fn(),
  };
}

describe('Art Studio Op Art accessibility', () => {
  let host;
  let root;
  let config;
  let announce;
  let latest;
  let canvasContext;
  let frames, editSaved, setProfile, toast;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    canvasContext = makeOpContext();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
    frames=new Map();let frameId=0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback=>{frames.set(++frameId,callback);return frameId;});
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
        artStudio: { tab: 'opArt', ...initial },
      });
      latest = toolData;
      editSaved=values=>setToolData(previous=>({...previous,artStudio:{...previous.artStudio,...values}}));
      const [profile,updateProfile]=React.useState('op-learner');setProfile=updateProfile;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce,addToast:toast,activeProfileId:profile }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('provides responsive layout, grouped state, associated sliders, disclosure semantics, and descriptive output', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'opArt',
        opStyle: 'moire',
        opSpeed: 6,
        opDensity: 40,
        opHueA: 200,
        opHueB: 30,
        opPaused: true,
        showOpInfo: true,
      },
    });

    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2');
    expect(html).toContain('role="group" aria-labelledby="artstudio-op-style-label"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('for="artstudio-opSpeed"');
    expect(html).toContain('id="artstudio-opSpeed"');
    expect(html).toContain('aria-valuetext="6 animation speed"');
    expect(html).toContain('for="artstudio-opHueA"');
    expect(html).toContain('aria-valuetext="200 degrees hue"');
    expect(html).toContain('aria-label="Resume Op Art animation" aria-describedby="artstudio-op-motion-status"');
    expect(html).toContain('Animation paused.');
    expect(html).toContain('role="group" aria-labelledby="artstudio-op-presets-label"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="artstudio-op-info"');
    expect(html).toContain('role="region" aria-labelledby="artstudio-op-info-toggle"');
    expect(html).toContain('aria-describedby="artstudio-op-motion-status"');
    expect(html).toContain('aria-label="Op Art output: overlapping Moire line fields at density 40 and speed 6, paused."');
    expect(html).not.toContain('id="opArtCanvas" tabindex=');
  });

  it('updates the output from keyboard-operable style and density controls', async () => {
    await mount({ opStyle: 'concentric', opDensity: 20, opPaused: true });
    const density = host.querySelector('#artstudio-opDensity');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    await act(async () => {
      valueSetter.call(density, '32');
      density.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.opDensity).toBe(32);
    expect(host.querySelector('#opArtCanvas').getAttribute('aria-label')).toContain('density 32');

    const checker = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Checker'));
    await act(async () => {
      checker.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.opStyle).toBe('checkerboard');
    expect(checker.getAttribute('aria-pressed')).toBe('true');
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('Checker'));
  });

  it('starts paused for reduced motion and resumes only after explicit activation', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    await mount();

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(host.querySelector('#opArtCanvas').getAttribute('aria-label')).toContain('paused');
    const resume = host.querySelector('button[aria-label="Resume Op Art animation"]');

    await act(async () => {
      resume.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.opPaused).toBe(false);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(host.querySelector('button[aria-label="Pause Op Art animation"]')).not.toBeNull();
    expect(announce).toHaveBeenCalledWith('Op Art animation resumed.');

    const pause = host.querySelector('button[aria-label="Pause Op Art animation"]');
    await act(async () => {
      pause.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.opPaused).toBe(true);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith('Op Art animation paused.');
  });

  const canvas=()=>host.querySelector('#opArtCanvas');
  const phase=()=>canvas()._captureArtStudioState().opPhase;
  async function click(selector){const node=host.querySelector(selector);expect(node,selector).not.toBeNull();await act(async()=>node.click());}
  async function input(selector,value){await act(async()=>{const node=host.querySelector(selector);Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));});}
  async function frame(timestamp){await act(async()=>{const entry=frames.entries().next().value;if(entry){frames.delete(entry[0]);entry[1](timestamp);}});}

  it('pauses on the displayed frame and resumes without restarting it',async()=>{
    await mount({opPaused:false,opSpeed:5});const original=canvas();await frame(0);await frame(100);
    expect(phase()).toBeCloseTo(3,10);const before=canvas()._opSVG();
    await click('[aria-label="Pause Op Art animation"]');
    expect(canvas()._opSVG()).toBe(before);expect(latest.artStudio.opPhase).toBeCloseTo(3,10);expect(frames.size).toBe(0);
    await click('[aria-label="Resume Op Art animation"]');await frame(10000);expect(phase()).toBeCloseTo(3,10);
    await frame(10100);expect(phase()).toBeCloseTo(6,10);expect(canvas()).toBe(original);
  });

  it('uses elapsed time consistently at 30, 60 and 120 animation callbacks per second',async()=>{
    await mount({opPaused:false,opSpeed:5});
    for(const rate of [30,60,120]){
      await click('#artstudio-op-rewind');await click('[aria-label="Resume Op Art animation"]');
      for(let i=0;i<=rate;i++)await frame(i*1000/rate);
      expect(phase()).toBeCloseTo(30,8);
    }
  });

  it('keeps the frame when changing speed, color, density or unrelated panels',async()=>{
    await mount({opPaused:false});await frame(0);await frame(100);const original=canvas(),at=phase();
    await input('#artstudio-opSpeed',12);expect(phase()).toBe(at);
    await input('#artstudio-opHueA',210);expect(phase()).toBe(at);
    await input('#artstudio-opDensity',32);expect(phase()).toBe(at);
    const pattern=canvas()._opSVG();await click('#artstudio-op-info-toggle');
    expect(canvas()._opSVG()).toBe(pattern);expect(canvas()).toBe(original);expect(frames.size).toBe(1);
  });

  it('scrubs, steps rapidly, and rewinds to the exact initial frame',async()=>{
    await mount({opPaused:false});const first=canvas()._opSVG();await frame(0);await frame(100);
    await click('#artstudio-op-rewind');expect(phase()).toBe(0);expect(canvas()._opSVG()).toBe(first);
    await input('#artstudio-opPhase',123.4);expect(phase()).toBeCloseTo(123.4,9);expect(latest.artStudio.opPaused).toBe(true);
    await act(async()=>{host.querySelector('#artstudio-op-step').click();host.querySelector('#artstudio-op-step').click();});
    expect(phase()).toBeCloseTo(133.4,9);expect(frames.size).toBe(0);
    await input('#artstudio-opPhase',358);await click('#artstudio-op-step');expect(phase()).toBe(3);
  });

  it('keeps independent color values, supports red/red custom colors, and restores legacy monochrome',async()=>{
    await mount({opPaused:true,opHueA:0,opHueB:0});expect(canvas()._opSVG()).toContain('fill="#ffffff"');
    const two=Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Two colors');await act(async()=>two.click());
    expect(canvas()._opSVG()).toContain('hsl(0,85%,50%)');expect(canvas()._opSVG()).not.toContain('#ffffff');
    await input('#artstudio-opSatA',0);await input('#artstudio-opLitA',20);await input('#artstudio-opLitB',90);
    expect(canvas()._opSVG()).toContain('hsl(0,0%,20%)');expect(canvas()._opSVG()).toContain('hsl(0,85%,90%)');
    await click('#artstudio-op-swap');expect(latest.artStudio).toMatchObject({opSatA:85,opLitA:90,opSatB:0,opLitB:20});
    const classic=Array.from(host.querySelectorAll('[aria-labelledby="artstudio-op-presets-label"] button')).find(button=>button.textContent==='Classic B&W');
    await act(async()=>classic.click());expect(canvas()._opSVG()).toContain('#ffffff');expect(canvas()._opSVG()).toContain('#000000');
  });

  it('restores external phase changes and isolates restored studies and learners',async()=>{
    await mount({opPaused:true,opPhase:90});const original=canvas();expect(phase()).toBe(90);
    await act(async()=>editSaved({opPhase:45}));expect(phase()).toBe(45);expect(canvas()).toBe(original);
    await act(async()=>editSaved({opPhase:180,opRestoreToken:'study'}));expect(phase()).toBe(180);expect(canvas()).not.toBe(original);
    const second=canvas();await act(async()=>setProfile('next-learner'));expect(canvas()).not.toBe(second);expect(phase()).toBe(180);
  });

  it('captures SVG and PNG from the displayed frame without advancing it',async()=>{
    await mount({opPaused:false,opStyle:'checkerboard'});await frame(0);await frame(100);const at=phase(),svg=canvas()._opSVG();
    const dataURL=vi.spyOn(window.HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,c3RpbGw=');
    expect(canvas()._opExportPNG()).toBe('data:image/png;base64,c3RpbGw=');expect(dataURL).toHaveBeenCalledWith('image/png');
    expect(phase()).toBe(at);expect(canvas()._opSVG()).toBe(svg);expect(frames.size).toBe(1);
    expect(canvas()._captureArtStudioState()).toMatchObject({opPhase:at,opStyle:'checkerboard',opPaused:false});
  });

  it('cancels obsolete work when leaving the lab and rejects stale callbacks',async()=>{
    await mount({opPaused:false});const old=canvas(),callback=frames.values().next().value;
    await act(async()=>editSaved({studioHome:true}));expect(frames.size).toBe(0);
    const count=canvasContext.fillRect.mock.calls.length;await act(async()=>callback(100));expect(canvasContext.fillRect.mock.calls.length).toBe(count);expect(old.isConnected).toBe(false);
  });

  it('suspends hidden-page work and returns without a time jump',async()=>{
    let hidden=false;vi.spyOn(document,'hidden','get').mockImplementation(()=>hidden);
    await mount({opPaused:false});await frame(0);await frame(100);const at=phase();
    await act(async()=>{hidden=true;document.dispatchEvent(new Event('visibilitychange'));});expect(frames.size).toBe(0);
    await act(async()=>{hidden=false;document.dispatchEvent(new Event('visibilitychange'));});expect(frames.size).toBe(1);
    await frame(10000);expect(phase()).toBe(at);await frame(10100);expect(phase()).toBeCloseTo(at+3,10);
  });

  it('normalizes malformed saved values and uses finite bounded geometry',async()=>{
    await mount({opPaused:true,opStyle:'unknown',opPhase:Infinity,opDensity:-2,opSpeed:NaN,opSatA:Infinity,opLitB:900,opRotation:NaN});
    expect(canvas()._captureArtStudioState()).toMatchObject({opStyle:'concentric',opPhase:0,opDensity:3,opSpeed:5,opSatA:85,opLitB:100,opRotation:0});
    expect(canvas()._opSVG()).not.toMatch(/NaN|Infinity/);
  });

  it('reports export failure without claiming success',async()=>{
    window.HTMLCanvasElement.prototype.getContext.mockReturnValue(null);await mount({opPaused:true});
    await click('[aria-label="Export Op Art as PNG"]');expect(toast).toHaveBeenCalledWith('Could not export this frame. Please try again.','error');
    expect(announce).not.toHaveBeenCalledWith('Op Art PNG exported.');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
