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
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeContext() {
  return {
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
  };
}

describe('Art Studio Tessellation accessibility', () => {
  let host;
  let root;
  let config;
  let announce;
  let context;
  let latest;
  let editSaved;
  let setProfile;

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    announce = vi.fn();
    context = makeContext();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: {
          tab: 'tessellation',
          tessShape: 'square',
          tessGrid: 4,
          tessRotation: 0,
          tessWarpAmt: 0,
          tessScheme: 'rainbow',
          tessClickData: {},
          ...initial,
        },
      });
      latest = toolData;
      editSaved = patch => setToolData(previous => ({...previous,artStudio:{...previous.artStudio,...patch}}));
      const [profile,updateProfile] = React.useState(undefined);
      setProfile=updateProfile;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce, activeProfileId:profile }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('renders responsive layout, grouped choices, associated sliders, instructions, and disclosure state', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'tessellation',
        tessShape: 'square',
        tessGrid: 4,
        tessRotation: 15,
        tessWarpAmt: 10,
        tessScheme: 'cool',
      },
    });

    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2 gap-4');
    expect(html).toContain('role="group" aria-labelledby="artstudio-tess-shape-label"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>□ Square/);
    expect(html).toContain('for="artstudio-tessGrid"');
    expect(html).toContain('for="artstudio-tessRotation"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-tess-scheme-label"');
    expect(html).toContain('aria-describedby="artstudio-tess-keyboard-help"');
    expect(html).toContain('Shift+ArrowUp');
    expect(html).toContain('aria-expanded="false" aria-controls="artstudio-tess-math"');
    expect(html).toContain('focus-visible:ring-4');
  });

  it('moves between visible tiles and cycles a tile color without pointer input', async () => {
    await mount();
    const canvas = host.querySelector('#tessCanvas');
    const cursor = host.querySelector('[data-tess-keyboard-cursor="true"]');
    const initialFillCount = context.fill.mock.calls.length;
    canvas.focus();

    expect(cursor.style.display).toBe('block');
    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/^Selected tile \d+ of \d+\.$/));
    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/^Tile \d+ of \d+ changed to orange\.$/));
    expect(context.fill.mock.calls.length).toBeGreaterThan(initialFillCount);
    expect(Object.keys(latest.artStudio.tessClickData)).toHaveLength(1);
    expect(canvas.getAttribute('aria-label')).toMatch(/Selected tile \d+ of \d+, colored orange\./);
  });

  it('cycles the tile under a pointer click and exposes a non-color announcement', async () => {
    await mount();
    const canvas = host.querySelector('#tessCanvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 512,
      height: 512,
      right: 512,
      bottom: 512,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('click', { clientX: 256, clientY: 256, bubbles: true }));
      await Promise.resolve();
    });

    expect(Object.keys(latest.artStudio.tessClickData)).toHaveLength(1);
    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/changed to orange\.$/));
  });

  async function clickTile(x,y) {
    const canvas=host.querySelector('#tessCanvas');
    vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:512,height:512});
    await act(async()=>canvas.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y})));
  }
  async function click(selector) { await act(async()=>host.querySelector(selector).click()); }

  it.each([0,90])('selects the visibly warped tile at %s degrees rather than its original polygon', async (tessRotation) => {
    await mount({tessShape:'square',tessGrid:4,tessWarpAmt:50,tessRotation});
    await clickTile(tessRotation?480:123,tessRotation?123:32);
    expect(latest.artStudio.tessClickData).toEqual({'square:0:1':1});
  });

  it('colors adjacent triangles independently when their legacy coordinate keys coincide', async () => {
    await mount({tessShape:'triangle',tessGrid:4});
    await click('button[aria-label="Paint tiles red"]');await clickTile(74,85);
    await click('button[aria-label="Paint tiles blue"]');await clickTile(74,171);
    expect(latest.artStudio.tessClickData).toEqual({'triangle:0:0':0,'triangle:1:0':4});
    await click('#artstudio-tess-undo');
    expect(latest.artStudio.tessClickData).toEqual({'triangle:0:0':0});
    await click('#artstudio-tess-redo');
    expect(latest.artStudio.tessClickData).toEqual({'triangle:0:0':0,'triangle:1:0':4});
  });

  it('undoes each rapid keyboard edit and retains the same focused canvas', async () => {
    await mount();const canvas=host.querySelector('#tessCanvas');canvas.focus();
    await act(async()=>{
      for(let i=0;i<2;i++)canvas.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));
    });
    expect(Object.values(latest.artStudio.tessClickData)).toEqual([2]);
    await act(async()=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true})));
    expect(Object.values(latest.artStudio.tessClickData)).toEqual([1]);
    expect(host.querySelector('#tessCanvas')).toBe(canvas);
    expect(document.activeElement).toBe(canvas);
    await act(async()=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'y',ctrlKey:true,bubbles:true,cancelable:true})));
    expect(Object.values(latest.artStudio.tessClickData)).toEqual([2]);
  });

  it('undoes shape changes and clearing without losing edited colors', async () => {
    await mount({tessShape:'triangle'});await clickTile(74,85);
    const colors={...latest.artStudio.tessClickData};
    const square=[...host.querySelectorAll('[aria-labelledby="artstudio-tess-shape-label"] button')].find(button=>button.textContent.includes('Square'));
    await act(async()=>square.click());
    expect(latest.artStudio.tessShape).toBe('square');expect(latest.artStudio.tessClickData).toEqual({});
    await click('#artstudio-tess-undo');
    expect(latest.artStudio.tessShape).toBe('triangle');expect(latest.artStudio.tessClickData).toEqual(colors);
    await click('button[aria-label="Clear tessellation tile colors"]');
    expect(latest.artStudio.tessClickData).toEqual({});
    await click('#artstudio-tess-undo');expect(latest.artStudio.tessClickData).toEqual(colors);
    expect(host.querySelector('#artstudio-tess-redo').disabled).toBe(false);
    await clickTile(74,171);
    expect(host.querySelector('#artstudio-tess-redo').disabled).toBe(true);
  });

  it('restores one tile to its palette color without changing a legacy-colored neighbor', async () => {
    await mount({tessShape:'triangle',tessGrid:4,tessClickData:{'0_128':4}});
    await act(async()=>editSaved({tessEditMode:'reset'}));
    await clickTile(74,85);
    expect(latest.artStudio.tessClickData).toEqual({'0_128':4,'triangle:0:0':-1});
    const canvas=host.querySelector('#tessCanvas');
    expect(canvas._tessSVG()).toContain('hsl(200,75%,50%)');
    await click('#artstudio-tess-undo');expect(latest.artStudio.tessClickData).toEqual({'0_128':4});
  });

  it('redraws externally restored colors and clears history across saved data or profiles', async () => {
    await mount();await clickTile(64,64);
    expect(host.querySelector('#artstudio-tess-undo').disabled).toBe(false);
    const canvas=host.querySelector('#tessCanvas');
    await act(async()=>editSaved({tessClickData:{'square:0:0':5}}));
    expect(host.querySelector('#tessCanvas')).toBe(canvas);
    expect(canvas._tessSVG()).toContain('hsl(270,70%,55%)');
    expect(host.querySelector('#artstudio-tess-undo').disabled).toBe(true);
    await clickTile(64,64);
    await act(async()=>setProfile('another-learner'));
    expect(host.querySelector('#artstudio-tess-undo').disabled).toBe(true);
  });

  it('bounds history and finite geometry inputs', async () => {
    await mount({tessShape:'unknown',tessGrid:Infinity,tessRotation:NaN,tessWarpAmt:Infinity,tessClickData:{bad:'red','0_0':Infinity}});
    const canvas=host.querySelector('#tessCanvas');
    expect(canvas._tessSVG()).not.toMatch(/NaN|Infinity/);
    expect(host.querySelector('#artstudio-tessGrid').value).toBe('6');
    const svg=new DOMParser().parseFromString(canvas._tessSVG(),'image/svg+xml');
    expect(svg.querySelectorAll('polygon').length).toBeGreaterThan(20);
    expect(svg.querySelectorAll('polygon').length).toBeLessThan(1000);
    await act(async()=>{for(let i=0;i<35;i++)canvas.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));});
    for(let i=0;i<30;i++)await click('#artstudio-tess-undo');
    expect(host.querySelector('#artstudio-tess-undo').disabled).toBe(true);
    expect(Object.values(latest.artStudio.tessClickData)).toEqual([5]);
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
