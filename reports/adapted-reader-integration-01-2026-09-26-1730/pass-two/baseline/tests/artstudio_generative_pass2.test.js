import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalMatchMedia = window.matchMedia;

function study(id, data) {
  return {
    id, tool: 'artStudio', timestamp: id === 'a' ? 1 : 2,
    label: 'Art Studio · Generative Art',
    data: { tab: 'generative', genStyle: 'flow', genDensity: 20, ...data },
    artStudioStudy: {
      schemaVersion: 1, sourceTab: 'generative', runId: 'generative-pass2',
      threadId: '', stepIndex: null, stepLabel: 'Generative Art',
      summary: 'A generative study', previewSrc: '', previewAlt: '', note: '',
    },
  };
}

describe('Art Studio generative paused feedback and comparison provenance', () => {
  let host;
  let root;
  let config;
  let contexts;
  let callbacks;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: vi.fn(() => ({ matches: false })) });
    config = loadTool(process.env.ARTSTUDIO_TEST_SOURCE || 'stem_lab/stem_tool_artstudio.js', 'artStudio');
    contexts = new WeakMap();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      if (!contexts.has(this)) contexts.set(this, {
        arc: vi.fn(), beginPath: vi.fn(), fill: vi.fn(), fillRect: vi.fn(), drawImage: vi.fn(),
      });
      return contexts.get(this);
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
      return 'data:image/png;base64,' + btoa(String(this.getContext('2d').fill.mock.calls.length));
    });
    callbacks = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callbacks.push(callback); return callbacks.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: originalMatchMedia });
  });

  async function mount(initial = {}, snapshots = []) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: {
        tab: 'generative', genStyle: 'flow', genDensity: 20, genSeed: 17,
        genPaused: true, studioHome: false, studioStarted: true,
        studioCurrentProjectRunId: 'generative-pass2', studioFreeProjectId: 'generative-pass2', ...initial,
      } });
      const [toolSnapshots, setToolSnapshots] = React.useState(snapshots);
      return config.render(makeCtx({ toolData, setToolData, toolSnapshots, setToolSnapshots }));
    }
    await act(async () => { root.render(React.createElement(Harness)); });
  }

  it.each(['keyboard', 'stylus'])('shows a %s burst immediately while paused without moving simulation time', async (input) => {
    await mount();
    const canvas = host.querySelector('#genCanvas');
    const before = canvas._captureArtStudioState();
    const context = contexts.get(canvas);
    const originalParticles = before.genState.particles;
    if (input === 'keyboard') {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    } else {
      canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 480 });
      const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 120, clientY: 140 });
      Object.defineProperties(event, { pointerType: { value: 'pen' }, isPrimary: { value: true } });
      canvas.dispatchEvent(event);
    }
    const after = canvas._captureArtStudioState();
    expect(after.genFrame).toBe(0);
    expect(after.genPaused).toBe(true);
    expect(after.genState.burstCount).toBe(1);
    expect(after.genState.particles.slice(0, originalParticles.length)).toEqual(originalParticles);
    expect(after.genState.particles).toHaveLength(50);
    expect(context.fill.mock.calls.length).toBeGreaterThan(0);
    expect(after.genSnapshot).not.toBe(before.genSnapshot);
    const fills = context.fill.mock.calls.length;
    callbacks.splice(0).forEach((callback) => callback(1));
    expect(context.fill.mock.calls.length).toBe(fills);
    expect(canvas._captureArtStudioState().genFrame).toBe(0);
  });

  async function compare(snapshots) {
    await mount({}, snapshots);
    await act(async () => { host.querySelector('#artstudio-process-button').click(); });
    for (let index = 0; index < 2; index++) {
      const button = [...host.querySelectorAll('button')].find((node) => node.textContent.trim() === 'Compare');
      expect(button).toBeTruthy();
      await act(async () => { button.click(); });
    }
    return host.querySelector('section[aria-labelledby="artstudio-process-compare-title"]');
  }

  it.each([
    ['both older studies', {}, {}],
    ['one older study', {}, { genSeed: 1, genFrame: 0 }],
    ['missing frame', { genSeed: 1 }, { genSeed: 1, genFrame: 0 }],
  ])('does not claim matching random conditions for %s without recorded seed and frame', async (_, first, second) => {
    const comparison = await compare([study('a', first), study('b', second)]);
    expect(comparison.textContent).not.toContain('Same seed and step.');
    expect(comparison.textContent).toContain('not saved');
  });

  it('recognizes an explicitly recorded zero seed and zero frame as comparable', async () => {
    const comparison = await compare([study('a', { genSeed: 0, genFrame: 0 }), study('b', { genSeed: 0, genFrame: 0 })]);
    expect(comparison.textContent).toContain('Same seed and step.');
    expect(comparison.textContent).not.toContain('not saved');
  });
});
