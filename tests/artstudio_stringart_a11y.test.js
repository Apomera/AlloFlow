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

function makeStringContext() {
  return {
    clearRect: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
}

describe('Art Studio String Art accessibility', () => {
  let host;
  let root;
  let config;
  let announce;
  let latest;
  let canvasContext;
  let toast;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    canvasContext = makeStringContext();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
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
        artStudio: { tab: 'stringArt', ...initial },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce, addToast: toast }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('provides responsive layout, grouped shape state, associated sliders, presets, and descriptive output', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'stringArt',
        strShape: 'triangle',
        strNails: 72,
        strMult: 37,
        strOpacity: 45,
        strRainbow: true,
      },
    });

    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2');
    expect(html).toContain('role="group" aria-labelledby="artstudio-string-shape-label"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('for="artstudio-strNails"');
    expect(html).toContain('id="artstudio-strNails"');
    expect(html).toContain('aria-valuetext="72 nails"');
    expect(html).toContain('for="artstudio-strOpacity"');
    expect(html).toContain('aria-valuetext="45 percent opacity"');
    expect(html).toContain('aria-label="Use a single thread color" aria-pressed="true"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-string-presets-label"');
    expect(html).toContain('aria-label="Load Cardioid string-art preset"');
    expect(html).toContain('aria-describedby="artstudio-string-description"');
    expect(html).toContain('aria-label="String-art output: 72 nails arranged on a triangle frame, connected with multiplier 37 using rainbow threads at 45 percent opacity."');
    expect(html).toContain('↻ Redraw');
    expect(html).not.toContain('id="stringCanvas" tabindex=');
  });

  it('updates the output from keyboard-operable controls and announces thread-mode changes', async () => {
    await mount({ strNails: 80, strRainbow: false });
    const nails = host.querySelector('#artstudio-strNails');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    await act(async () => {
      valueSetter.call(nails, '100');
      nails.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.strNails).toBe(100);
    expect(host.querySelector('#stringCanvas').getAttribute('aria-label')).toContain('100 nails');

    const rainbow = host.querySelector('button[aria-label="Use a rainbow thread progression"]');
    await act(async () => {
      rainbow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.strRainbow).toBe(true);
    expect(announce).toHaveBeenCalledWith('Rainbow threads enabled.');
    expect(host.querySelector('button[aria-label="Use a single thread color"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('draws the complete result without progressive animation for reduced motion', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    await mount();

    expect(canvasContext.stroke).toHaveBeenCalledTimes(79); // Pin 0 connects to itself and needs no thread.
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith('String-art drawing complete.');
  });

  function rows() {
    return [...host.querySelectorAll('[data-artstudio-string-guide] tbody tr')]
      .map(row => [...row.querySelectorAll('td')].map(cell => Number(cell.textContent)));
  }
  function svg() {
    return new DOMParser().parseFromString(host.querySelector('#stringCanvas')._strSVG(),'image/svg+xml');
  }

  it.each(['circle','square','triangle','star'])('matches the %s SVG endpoints to every connection-guide row', async (strShape) => {
    await mount({strShape,strNails:20,strMult:3,strOffset:4,strPaused:true});
    const guide = rows();
    expect(guide).toHaveLength(18); // Pins 8 and 18 connect to themselves.
    for (const [from,to] of guide) expect(to).toBe((from*3+4)%20);
    const output = svg();
    expect(output.querySelector('parsererror')).toBeNull();
    const pins = [...output.querySelectorAll('circle')].map(pin => [Number(pin.getAttribute('cx')),Number(pin.getAttribute('cy'))]);
    const paths = [...output.querySelectorAll('path')];
    expect(pins).toHaveLength(20);
    expect(paths).toHaveLength(guide.length);
    expect(pins[0]).toEqual(strShape==='square'?[46,46]:[256,46]);
    guide.forEach(([from,to],index) => {
      const endpoints = paths[index].getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      expect(endpoints).toEqual([...pins[from],...pins[to]]);
    });
    expect(pins.flat().every(value => value>=46 && value<=466)).toBe(true);
  });

  it('wraps skip plus offset around the frame and omits zero-length threads', async () => {
    await mount({strNails:20,strRule:'skip',strSkip:7,strOffset:2,strPaused:true});
    expect(rows()).toHaveLength(20);
    expect(rows()[0]).toEqual([0,9]);
    expect(rows()[19]).toEqual([19,8]);
    expect(host.querySelector('#artstudio-strSkip')).not.toBeNull();
    expect(host.querySelector('#artstudio-strMult')).toBeNull();
    await act(async () => root.unmount());root=ReactDOMClient.createRoot(host);
    window.requestAnimationFrame.mockClear();
    await mount({strNails:20,strRule:'skip',strSkip:1,strOffset:19});
    expect(rows()).toHaveLength(0);
    expect(host.textContent).toContain('This rule connects every pin to itself.');
    expect(host.querySelector('#artstudio-string-progress').value).toBe(100);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(host.querySelector('#artstudio-string-finish').disabled).toBe(true);
  });

  it('exports all transparent threads without pins or advancing the paused preview', async () => {
    await mount({strNails:80,strPaused:true,strPaper:'transparent',strShowPins:false,strLabelPins:true});
    const canvas = host.querySelector('#stringCanvas');
    for (const key of ['fillRect','arc','stroke']) canvasContext[key].mockClear();
    expect(canvas._strExportCanvas().width).toBe(512);
    expect(canvasContext.stroke).toHaveBeenCalledTimes(79);
    expect(canvasContext.arc).not.toHaveBeenCalled();
    expect(canvasContext.fillRect).not.toHaveBeenCalled();
    expect(canvas.dataset.strProgress).toBe('0');
    expect(svg().querySelector('rect,circle,text')).toBeNull();
    expect(svg().querySelector('path').getAttribute('stroke-opacity')).toBe('0.3');
  });

  it('keeps pin labels sparse while listing every construction step', async () => {
    await mount({strNails:200,strLabelPins:true,strRule:'skip',strSkip:13,strPaused:true});
    expect(svg().querySelectorAll('circle')).toHaveLength(200);
    expect(svg().querySelectorAll('text')).toHaveLength(40);
    expect(rows()).toHaveLength(200);
    expect(host.textContent).toContain('label every 5 pins');
    expect(canvasContext.fillText).toHaveBeenCalledTimes(40);
  });

  it('pauses, changes speed without restarting, restores progress, and finishes', async () => {
    await mount();
    const canvas=host.querySelector('#stringCanvas');
    await act(async () => host.querySelector('#artstudio-string-pause').click());
    const progress=Number(canvas.dataset.strProgress);
    const setValue=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    await act(async () => {
      const input=host.querySelector('#artstudio-strSpeed');setValue.call(input,'10');input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    expect(host.querySelector('#stringCanvas')).toBe(canvas);
    expect(Number(canvas.dataset.strProgress)).toBe(progress);
    const saved={...latest.artStudio};
    await act(async () => root.unmount());root=ReactDOMClient.createRoot(host);
    await mount(saved);
    expect(Number(host.querySelector('#stringCanvas').dataset.strProgress)).toBe(progress);
    await act(async () => host.querySelector('#artstudio-string-pause').click());
    window.requestAnimationFrame.mock.calls.at(-1)[0]();
    expect(Number(host.querySelector('#stringCanvas').dataset.strProgress)).toBe(progress+10);
    await act(async () => host.querySelector('#artstudio-string-finish').click());
    expect(latest.artStudio.strProgress).toBe(1);
    expect(host.querySelector('#artstudio-string-progress').value).toBe(100);
  });

  it('bounds corrupt saved numbers before generating the construction', async () => {
    await mount({strShape:{},strNails:Infinity,strMult:NaN,strOffset:-900,strOpacity:Infinity,strLineWidth:Infinity,strHue:NaN,strSat:Infinity,strPaused:true});
    expect(host.querySelector('#artstudio-strNails').value).toBe('80');
    expect(host.querySelector('#artstudio-strMult').value).toBe('2');
    const output=host.querySelector('#stringCanvas')._strSVG();
    expect(output).not.toMatch(/NaN|Infinity/);
    expect(output).toContain('stroke-width="1"');
    expect(rows()).toHaveLength(79);
  });

  it('restores the circular multiplication rule when loading a named preset', async () => {
    await mount({strShape:'star',strRule:'skip',strSkip:17,strOffset:8,strPaused:true,strHue:180});
    await act(async () => host.querySelector('button[aria-label="Load Cardioid string-art preset"]').click());
    expect(latest.artStudio).toMatchObject({strShape:'circle',strRule:'multiply',strMult:2,strNails:100,strOffset:0,strPaused:false,strHue:180});
    expect(rows()).toHaveLength(99);
  });

  it('cancels drawing and captures progress when returning to Studio home', async () => {
    await mount();
    window.cancelAnimationFrame.mockClear();
    await act(async () => host.querySelector('button[aria-label="Open Studio home"]').click());
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(latest.artStudio.strProgress).toBeGreaterThan(0);
    expect(host.querySelector('#stringCanvas')).toBeNull();
  });

  it('reports an unavailable PNG context while keeping vector export available', async () => {
    vi.spyOn(window.HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
    const click=vi.spyOn(window.HTMLAnchorElement.prototype,'click').mockImplementation(() => {});
    await mount();
    await act(async () => host.querySelector('button[aria-label="Export string art as PNG"]').click());
    expect(toast).toHaveBeenCalledWith('Could not export this pattern. Try again.','error');
    expect(click).not.toHaveBeenCalled();
    await act(async () => host.querySelector('button[aria-label="Export string art as SVG"]').click());
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
