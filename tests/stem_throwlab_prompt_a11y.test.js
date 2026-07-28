import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_throwlab.js';
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
  loadTool(SOURCE, 'throwlab');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalCanvasGetContext = window.HTMLCanvasElement.prototype.getContext;
  window.HTMLCanvasElement.prototype.getContext = function() {
    const noop = function() {};
    return new Proxy({
      scale: noop, fillRect: noop, save: noop, translate: noop,
      beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
      rect: noop, arc: noop, ellipse: noop, fill: noop, stroke: noop,
      restore: noop, fillText: noop, setTransform: noop, clearRect: noop,
      measureText: () => ({ width: 20 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      setLineDash: noop,
    }, {
      get(target, key) { return key in target ? target[key] : noop; },
      set(target, key, value) { target[key] = value; return true; },
    });
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

function mountThrowLab({ prompt, dialogAvailable = true, withResult = false } = {}) {
  const cfg = window.StemLab._registry.throwlab;
  const addToast = vi.fn();
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
      throwlab: {
        mode: 'pitching',
        pitchType: '4seam',
        speedMph: 92,
        releaseHeight: 1.85,
        aimDegV: -1.5,
        aimDegH: 0,
        spinRpm: 2300,
        spinAxisDeg: 0,
        gravityId: 'earth',
        windMph: 0,
        windDirDeg: 0,
        customScenarios: [],
        drillStats: { streakStrikes: 0, strikeTypes: {} },
        badgesEarned: {},
        lastResult: withResult ? {
          samples: [{ z: 0, y: 1, t: 0 }, { z: 18, y: 1.2, t: 0.4 }],
          location: 'strike',
          outcome: { plateY: 0.75, plateX: 0, plateT: 0.4 },
          vBreakIn: 0,
          hBreakIn: 0,
        } : null,
      },
    });
    api.getData = () => toolData;
    return cfg.render(makeCtx({
      toolData,
      setToolData,
      addToast,
    }));
  }
  React.act(() => root.render(React.createElement(Host)));
  api.addToast = addToast;
  api.prompt = window.AlloFlowUX.prompt;
  api.scenarioButton = () => container.querySelector('button[aria-label="Save current setup as a custom scenario"]');
  api.cardButton = () => container.querySelector('button[aria-label="Export your last throw as a printable trading card"]');
  return api;
}

async function clickAsync(element) {
  await React.act(async () => {
    element.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 80));
  });
}

describe('Throw Lab prompt accessibility', () => {
  it('keeps mirrors identical and removes both native prompt paths', () => {
    const source = readFileSync('stem_lab/stem_tool_throwlab.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_throwlab.js', 'utf8')).toBe(source);
    expect(source).not.toContain("window.prompt('Name this scenario:");
    expect(source).not.toContain("window.prompt('What\\'s your player name?");
    expect(source).toContain('window.AlloModules.PromptDialog.PromptDialog');
    expect(source).toContain('window.AlloFlowUX && window.AlloFlowUX.prompt');
    expect(source).toContain("status: 'unavailable'");
    expect(source).toContain('maxLength: 60');
    expect(source).toContain('maxLength: 30');
  });

  it('saves a custom scenario only after accessible submission', async () => {
    const prompt = vi.fn(async () => '  Curve on Mars  ');
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => {
      throw new Error('Native prompt must not be called');
    });
    const app = mountThrowLab({ prompt });
    await clickAsync(app.scenarioButton());

    expect(prompt).toHaveBeenCalledWith(
      'Name this scenario.',
      expect.stringContaining('on Earth'),
      {
        title: 'Save custom scenario',
        placeholder: 'Scenario name',
        confirmText: 'Save scenario',
        cancelText: 'Cancel',
        maxLength: 60,
      },
    );
    expect(app.getData().throwlab.customScenarios).toHaveLength(1);
    expect(app.getData().throwlab.customScenarios[0]).toMatchObject({
      label: 'Curve on Mars',
      mode: 'pitching',
      custom: true,
    });
    expect(nativePrompt).not.toHaveBeenCalled();
  });

  it('cancels scenario saving without changing state', async () => {
    const app = mountThrowLab({ prompt: vi.fn(async () => null) });
    await clickAsync(app.scenarioButton());
    expect(app.getData().throwlab.customScenarios).toEqual([]);
    expect(document.getElementById('allo-live-throwlab').textContent).toBe('Scenario save cancelled.');
  });

  it('fails closed when the real PromptDialog is unavailable', async () => {
    const prompt = vi.fn(async () => 'Should not save');
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => 'Native value');
    const app = mountThrowLab({ prompt, dialogAvailable: false });
    await clickAsync(app.scenarioButton());

    expect(prompt).not.toHaveBeenCalled();
    expect(nativePrompt).not.toHaveBeenCalled();
    expect(app.getData().throwlab.customScenarios).toEqual([]);
    expect(app.addToast).toHaveBeenCalledWith(
      'The scenario-name dialog is unavailable, so this scenario was not saved.',
      'warning',
    );
  });

  it('persists a submitted player name without invoking native prompt', async () => {
    const prompt = vi.fn(async () => '  Ace Rivera  ');
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => 'Native player');
    vi.spyOn(window, 'open').mockReturnValue(null);
    const app = mountThrowLab({ prompt, withResult: true });
    await clickAsync(app.cardButton());

    expect(prompt).toHaveBeenCalledWith(
      'What is your player name? It will be saved for next time.',
      'Lab Athlete',
      {
        title: 'Name your trading card',
        placeholder: 'Player name',
        confirmText: 'Create card',
        cancelText: 'Cancel',
        maxLength: 30,
      },
    );
    expect(app.getData().throwlab.playerName).toBe('Ace Rivera');
    expect(nativePrompt).not.toHaveBeenCalled();
  });

  it('does not export when the accessible player-name dialog rejects', async () => {
    const prompt = vi.fn(async () => { throw new Error('dialog failed'); });
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => 'Native player');
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const app = mountThrowLab({ prompt, withResult: true });
    await clickAsync(app.cardButton());

    expect(app.getData().throwlab.playerName).toBeUndefined();
    expect(open).not.toHaveBeenCalled();
    expect(nativePrompt).not.toHaveBeenCalled();
    expect(app.addToast).toHaveBeenCalledWith(
      'The player-name dialog could not open, so the trading card was not created.',
      'warning',
    );
  });
});
