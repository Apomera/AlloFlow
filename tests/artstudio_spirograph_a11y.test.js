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

function makeSpiroContext() {
  return {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
}

describe('Art Studio Spirograph accessibility', () => {
  let host;
  let root;
  let config;
  let announce;
  let latest;
  let canvasContext;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    canvasContext = makeSpiroContext();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
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
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: { tab: 'spirograph', ...initial },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('provides responsive layout, associated sliders, grouped presets, state, and a descriptive output', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'spirograph',
        spiroR: 150,
        spiror: 50,
        spirop: 25,
        spiroSpeed: 12,
        spiroRainbow: true,
      },
    });

    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2');
    expect(html).toContain('for="artstudio-spiroR"');
    expect(html).toContain('id="artstudio-spiroR"');
    expect(html).toContain('for="artstudio-spiroSpeed"');
    expect(html).toContain('aria-valuetext="12 drawing steps per frame"');
    expect(html).toContain('aria-label="Use a single color for the spirograph" aria-pressed="true"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-spiro-presets-label"');
    expect(html).toContain('aria-label="Load Star spirograph preset"');
    expect(html).toContain('aria-describedby="artstudio-spiro-description"');
    expect(html).toContain('aria-label="Spirograph output: a rainbow hypotrochoid with outer radius 150, inner radius 50, and pen offset 25."');
    expect(html).toContain('↻ Redraw');
    expect(html).not.toContain('id="spiroCanvas" tabindex=');
  });

  it('updates the output from keyboard-operable controls and announces color-mode changes', async () => {
    await mount({ spiroR: 120, spiroRainbow: false });
    const radius = host.querySelector('#artstudio-spiroR');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    await act(async () => {
      valueSetter.call(radius, '180');
      radius.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.spiroR).toBe(180);
    expect(host.querySelector('#spiroCanvas').getAttribute('aria-label')).toContain('outer radius 180');

    const rainbow = host.querySelector('button[aria-label="Use a rainbow color progression for the spirograph"]');
    await act(async () => {
      rainbow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.spiroRainbow).toBe(true);
    expect(announce).toHaveBeenCalledWith('Rainbow spirograph enabled.');
    expect(host.querySelector('button[aria-label="Use a single color for the spirograph"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('draws the complete result without progressive animation for reduced motion', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    await mount();

    expect(canvasContext.stroke).toHaveBeenCalled();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith('Spirograph drawing complete.');
  });

  it.each(['inside', 'outside'])('fits large %s curves and closes the exported path exactly', async (spiroCurve) => {
    await mount({spiroCurve,spiroR:200,spiror:11,spirop:120,spiroLineWidth:8,spiroPaused:true});
    const canvas = host.querySelector('#spiroCanvas');
    canvas._spiroFinish();
    expect(canvasContext.lineTo.mock.calls.length).toBeGreaterThan(1000);
    const coordinates = canvasContext.lineTo.mock.calls.flat();
    expect(Math.min(...coordinates)).toBeGreaterThanOrEqual(20-1e-8);
    expect(Math.max(...coordinates)).toBeLessThanOrEqual(492+1e-8);
    const svg = new DOMParser().parseFromString(canvas._spiroSVG(), 'image/svg+xml');
    expect(svg.querySelector('parsererror')).toBeNull();
    const path = svg.querySelector('path').getAttribute('d');
    const first = path.match(/^M([^L]+)/)[1];
    expect(path.slice(path.lastIndexOf('L')+1)).toBe(first);
    expect(svg.querySelector('path').getAttribute('stroke-width')).toBe('8');
    expect(canvas.dataset.spiroProgress).toBe(canvas.dataset.spiroTotal);
  });

  it('pauses and changes speed without discarding the curve, then resumes and finishes', async () => {
    await mount();
    const canvas = host.querySelector('#spiroCanvas');
    const progress = canvas.dataset.spiroProgress;
    await act(async () => host.querySelector('#artstudio-spiro-pause').click());
    expect(latest.artStudio.spiroPaused).toBe(true);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(canvas.dataset.spiroProgress).toBe(progress);
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => {
      const speed = host.querySelector('#artstudio-spiroSpeed');
      valueSetter.call(speed,'20');speed.dispatchEvent(new Event('input',{bubbles:true}));
    });
    expect(host.querySelector('#spiroCanvas')).toBe(canvas);
    expect(canvas.dataset.spiroProgress).toBe(progress);
    await act(async () => host.querySelector('#artstudio-spiro-pause').click());
    window.requestAnimationFrame.mock.calls.at(-1)[0]();
    expect(Number(canvas.dataset.spiroProgress)).toBe(Number(progress)+20);
    await act(async () => host.querySelector('#artstudio-spiro-finish').click());
    expect(host.querySelector('#artstudio-spiro-progress').value).toBe(100);
    expect(host.querySelector('#artstudio-spiro-finish').disabled).toBe(true);
    expect(host.querySelector('#artstudio-spiro-pause').disabled).toBe(true);
  });

  it('exports complete transparent PNG and rainbow SVG without advancing a paused preview', async () => {
    await mount({spiroPaused:true,spiroPaper:'transparent',spiroRainbow:true});
    const canvas = host.querySelector('#spiroCanvas');
    canvasContext.fillRect.mockClear();
    const output = canvas._spiroExportCanvas();
    expect(output.width).toBe(512);
    expect(canvasContext.fillRect).not.toHaveBeenCalled();
    expect(canvasContext.lineTo.mock.calls.length).toBe(Number(canvas.dataset.spiroTotal));
    expect(canvas.dataset.spiroProgress).toBe('0');
    const svg = new DOMParser().parseFromString(canvas._spiroSVG(),'image/svg+xml');
    expect(svg.querySelector('rect')).toBeNull();
    expect(svg.querySelectorAll('path').length).toBe(360);
    expect(svg.querySelector('path').getAttribute('stroke')).toBe('hsl(0,100%,50%)');
    expect(svg.querySelector('script')).toBeNull();
  });

  it('uses outside-rolling geometry and finite bounds for malformed saved inputs', async () => {
    await mount({spiroCurve:'outside',spiroR:120,spiror:40,spirop:20,spiroFit:false,spiroPaused:true});
    const canvas = host.querySelector('#spiroCanvas');
    expect(canvas._spiroSVG()).toContain('d="M396 256L');
    expect(host.querySelector('#artstudio-spiro-closure').textContent).toContain('3:1');
    await act(async () => root.unmount());
    root = ReactDOMClient.createRoot(host);
    await mount({spiroR:NaN,spiror:0,spirop:Infinity,spiroLineWidth:Infinity,spiroHue:NaN,spiroSat:Infinity,spiroLit:-100,spiroPaused:true});
    const svg = host.querySelector('#spiroCanvas')._spiroSVG();
    expect(svg).not.toMatch(/NaN|Infinity/);
    expect(host.querySelector('#artstudio-spiror').value).toBe('10');
    expect(svg).toContain('hsl(0,100%,0%)');
  });

  it('stops scheduled drawing when leaving for Studio home', async () => {
    await mount();
    window.cancelAnimationFrame.mockClear();
    await act(async () => host.querySelector('button[aria-label="Open Studio home"]').click());
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(host.querySelector('#spiroCanvas')).toBeNull();
    expect(latest.artStudio.spiroProgress).toBeGreaterThan(0);
  });

  it('restores a paused checkpoint and ignores it after changing the curve', async () => {
    await mount();
    await act(async () => host.querySelector('#artstudio-spiro-pause').click());
    const checkpoint = {...latest.artStudio};
    const progress = host.querySelector('#spiroCanvas').dataset.spiroProgress;
    await act(async () => root.unmount());root=ReactDOMClient.createRoot(host);
    await mount(checkpoint);
    expect(host.querySelector('#spiroCanvas').dataset.spiroProgress).toBe(progress);
    expect(host.querySelector('#artstudio-spiro-pause').textContent).toBe('Resume drawing');
    await act(async () => root.unmount());root=ReactDOMClient.createRoot(host);
    await mount({...checkpoint,spiroR:190});
    expect(host.querySelector('#spiroCanvas').dataset.spiroProgress).toBe('0');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
