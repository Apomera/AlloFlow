import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_volume.js';
let root;
let container;
let originalAlloModules;
let originalAlloFlowUX;
let originalCanvasGetContext;
let originalResizeObserver;

beforeEach(() => {
  originalAlloModules = window.AlloModules;
  originalAlloFlowUX = window.AlloFlowUX;
  resetStemLab();
  loadTool(SOURCE, 'volume');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalCanvasGetContext = window.HTMLCanvasElement.prototype.getContext;
  window.HTMLCanvasElement.prototype.getContext = function() {
    const noop = function() {};
    return {
      scale: noop, fillRect: noop, save: noop, translate: noop,
      beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
      rect: noop, arc: noop, ellipse: noop, fill: noop, stroke: noop,
      restore: noop, fillText: noop, setTransform: noop, clearRect: noop,
      measureText: () => ({ width: 20 }),
    };
  };
  originalResizeObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
});

afterEach(async () => {
  if (root) {
    await React.act(async () => root.unmount());
    root = null;
  }
  container?.remove();
  container = null;
  window.AlloModules = originalAlloModules;
  window.AlloFlowUX = originalAlloFlowUX;
  window.HTMLCanvasElement.prototype.getContext = originalCanvasGetContext;
  if (originalResizeObserver) globalThis.ResizeObserver = originalResizeObserver;
  else delete globalThis.ResizeObserver;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  vi.restoreAllMocks();
});

function mountVolume({ prompt, dialogAvailable = true } = {}) {
  const cfg = window.StemLab._registry.volume;
  const addToast = vi.fn();
  const announceToSR = vi.fn();
  const api = {};
  window.AlloModules = dialogAvailable
    ? { PromptDialog: { PromptDialog: function PromptDialog() {} } }
    : {};
  window.AlloFlowUX = { prompt: prompt || vi.fn(async () => null) };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);

  function Host() {
    const [toolData, setToolData] = React.useState({
      _volume: {
        mode: 'slider',
        dims: { l: 3, w: 2, h: 2 },
        positions: [],
        saved: {},
      },
    });
    api.getData = () => toolData;
    return cfg.render(makeCtx({
      toolData,
      setToolData,
      addToast,
      announceToSR,
    }));
  }
  React.act(() => root.render(React.createElement(Host)));
  api.addToast = addToast;
  api.announceToSR = announceToSR;
  api.prompt = window.AlloFlowUX.prompt;
  api.button = () => container.querySelector('button[aria-label="Save current construction"]');
  return api;
}

async function clickAsync(element) {
  await React.act(async () => {
    element.click();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('Volume Lab construction-name prompt accessibility', () => {
  it('keeps mirrors identical and removes the native construction prompt', () => {
    const source = readFileSync('stem_lab/stem_tool_volume.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_volume.js', 'utf8')).toBe(source);
    expect(source).not.toContain("window.prompt('Name this construction:");
    expect(source).toContain('window.AlloModules.PromptDialog.PromptDialog');
    expect(source).toContain('window.AlloFlowUX && window.AlloFlowUX.prompt');
    expect(source).toContain('fail closed instead');
    expect(source).toContain('maxLength: 40');
  });

  it('saves a trimmed name only after the accessible dialog submits', async () => {
    const prompt = vi.fn(async () => '  Bridge model  ');
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => {
      throw new Error('Native prompt must not be called');
    });
    const app = mountVolume({ prompt });
    expect(app.button().getAttribute('type')).toBe('button');
    await clickAsync(app.button());

    expect(prompt).toHaveBeenCalledWith(
      'Name this construction.',
      expect.stringMatching(/^My build /),
      {
        title: 'Save construction',
        placeholder: 'Construction name',
        confirmText: 'Save construction',
        cancelText: 'Cancel',
        maxLength: 40,
      },
    );
    expect(app.getData()._volume.saved['Bridge model']).toMatchObject({
      dims: { l: 3, w: 2, h: 2 },
      mode: 'slider',
    });
    expect(app.addToast).toHaveBeenCalledWith('💾 Saved "Bridge model"', 'success');
    expect(app.announceToSR).toHaveBeenCalledWith('Saved as Bridge model');
    expect(nativePrompt).not.toHaveBeenCalled();
  });

  it('does not save on cancel', async () => {
    const app = mountVolume({ prompt: vi.fn(async () => null) });
    await clickAsync(app.button());
    expect(app.getData()._volume.saved).toEqual({});
    expect(app.announceToSR).toHaveBeenCalledWith('Save cancelled.');
  });

  it('fails closed when the real PromptDialog module is unavailable', async () => {
    const prompt = vi.fn(async () => 'Should not save');
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => 'Native name');
    const app = mountVolume({ prompt, dialogAvailable: false });
    await clickAsync(app.button());

    expect(prompt).not.toHaveBeenCalled();
    expect(nativePrompt).not.toHaveBeenCalled();
    expect(app.getData()._volume.saved).toEqual({});
    expect(app.addToast).toHaveBeenCalledWith(
      'The save-name dialog is unavailable, so this construction was not saved.',
      'warning',
    );
    expect(app.announceToSR).toHaveBeenCalledWith(
      'The save-name dialog is unavailable, so this construction was not saved.',
    );
  });

  it('preserves saved work when the accessible dialog rejects', async () => {
    const prompt = vi.fn(async () => { throw new Error('dialog failed'); });
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => 'Native name');
    const app = mountVolume({ prompt });
    await clickAsync(app.button());

    expect(app.getData()._volume.saved).toEqual({});
    expect(nativePrompt).not.toHaveBeenCalled();
    expect(app.addToast).toHaveBeenCalledWith(
      'The save-name dialog could not open, so this construction was not saved.',
      'warning',
    );
  });
});
