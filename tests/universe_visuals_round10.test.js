// Universe Explorer, tenth pass (2026-10-19): a chapter strip under the timeline slider
// (one button per chapter stop, aligned with the slider), and a decorative illustration
// in the 3D flight banner. (The Big Bang plasma ripples are canvas-only and were checked
// in a browser.)
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true }, state) });
const count = (html, text) => html.split(text).length - 1;

describe('Chapter strip (rendered)', () => {
  it('draws one button per chapter, at the slider’s stops, and marks the current one', () => {
    const html = render({ cosmicTime: 13.8 });
    expect(count(html, 'class="uni-chapter-dot"')).toBe(9);
    expect(html.includes('left:calc(9px + (100% - 18px) * 0.0000)')).toBe(true);
    expect(html.includes('left:calc(9px + (100% - 18px) * 0.5000)')).toBe(true);
    expect(html.includes('left:calc(9px + (100% - 18px) * 1.0000)')).toBe(true);
    expect(count(html, 'aria-current="step"')).toBe(1);
    const current = /aria-current="step"[^>]*>(?:(?!<\/button>).)*?<span class="uni-sr">([^<]+)<\/span>/.exec(html);
    expect(current && current[1]).toBe('Present Day');
  });

  it('adds a decorative illustration to the 3D flight banner', () => {
    const html = render({});
    expect(/<svg class="uf-intro-art"[^>]*aria-hidden="true"/.test(html)).toBe(true);
  });
});

describe('Chapter strip (live)', () => {
  const { act } = React;
  let host, root, config, state;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    Element.prototype.scrollIntoView = vi.fn();
    resetStemLab();
    config = loadTool(TOOL, 'universe');
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => {
    if (window._universeTimeLapse) clearInterval(window._universeTimeLapse);
    window._universeTimeLapse = null;
    await act(async () => root.unmount());
    host.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  });
  async function mount(initial) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ universe: Object.assign({ tutorialDismissed: true }, initial) });
      state = toolData.universe;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => root.render(React.createElement(Harness)));
  }

  it('jumps to a chapter and moves the slider to its stop', async () => {
    await mount({ cosmicTime: 13.8 });
    const dots = () => [...host.querySelectorAll('.uni-chapter-dot')];
    await act(async () => dots()[4].click());
    expect(host.querySelector('#universe-cosmic-time').value).toBe('4');
    expect(dots()[4].getAttribute('aria-current')).toBe('step');
    expect(dots()[7].getAttribute('aria-current')).toBe(null);
    await act(async () => dots()[0].click());
    expect(state.cosmicTime).toBe(0);
    expect(host.querySelector('#universe-cosmic-time').value).toBe('0');
  });
});
