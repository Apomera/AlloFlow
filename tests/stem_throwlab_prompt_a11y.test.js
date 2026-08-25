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

function mountThrowLab({ prompt, dialogAvailable = true, withResult = false, throwlabOverrides = {} } = {}) {
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
      throwlab: Object.assign({
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
      }, throwlabOverrides),
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

  it('keeps the last-result metrics pinned after controls change', async () => {
    const app = mountThrowLab();
    const launch = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('THROW PITCH'));
    expect(launch).toBeTruthy();
    await clickAsync(launch);

    expect(app.getData().throwlab.lastResult.trial).toMatchObject({
      mode: 'pitching',
      presetLabel: '4-Seam Fastball',
      speedMph: 92,
      spinRpm: 2300,
    });

    expect(app.getData().throwlab.modeThrowCounts.pitching).toBe(1);
    const speed = container.querySelector('#tl-pitching-slider-speed');
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await React.act(async () => {
      valueSetter.call(speed, '80');
      speed.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    expect(app.getData().throwlab.speedMph).toBe(80);
    expect(app.getData().throwlab.lastResult.trial.speedMph).toBe(92);
    expect(container.querySelector('[data-throwlab-result-stale="true"]')).toBeTruthy();
    const resultPanel = container.querySelector('[aria-labelledby="tl-result-heading"]');
    expect(resultPanel.textContent).toContain('Speed92 mph');
    expect(resultPanel.textContent).toContain('Controls changed');

    const saveReference = container.querySelector('button[aria-label^="Save current throw as reference"]');
    await clickAsync(saveReference);
    expect(app.getData().throwlab.referenceList[0].label).toContain('92 mph');
    expect(app.getData().throwlab.referenceList[0].label).not.toContain('80 mph');
  });

  it('renders semantic control groups, slider labels, and preset comparisons', () => {
    mountThrowLab();

    expect(container.querySelector('section[aria-labelledby="tl-preset-picker-heading"]')).toBeTruthy();
    expect(container.querySelector('section[aria-labelledby="tl-release-controls-heading"]')).toBeTruthy();

    const speed = container.querySelector('#tl-pitching-slider-speed');
    expect(speed.getAttribute('aria-labelledby')).toBe('tl-pitching-slider-speed-label');
    expect(container.querySelector('#tl-pitching-slider-speed-label').textContent).toBe('Speed');
    expect(container.querySelector('output[for="tl-pitching-slider-speed"]').textContent).toBe('92 mph');

    const table = container.querySelector('.throwlab-compendium-scroll table');
    expect(table).toBeTruthy();
    expect(table.querySelector('caption').textContent).toContain('Use the button in the first column');
    expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(6);
    expect(table.querySelectorAll('tbody tr').length).toBeGreaterThan(1);
    expect(table.querySelector('tbody th[scope="row"] button[aria-label^="Load "]')).toBeTruthy();
    expect(container.querySelector('button[role="row"]')).toBeNull();

    const stats = container.querySelector('dl[aria-label="Session stats"]');
    expect(stats).toBeTruthy();
    expect(stats.querySelectorAll('dt').length).toBe(stats.querySelectorAll('dd').length);
  });

  it('renders saved comparisons as a named list', async () => {
    mountThrowLab({ withResult: true });
    await clickAsync(container.querySelector('button[aria-label^="Save current throw as reference"]'));

    const list = container.querySelector('[role="list"][aria-label="Saved comparison trajectories"]');
    expect(list).toBeTruthy();
    expect(list.querySelectorAll('[role="listitem"]')).toHaveLength(1);
    expect(list.querySelector('button[aria-label^="Remove reference 1:"]')).toBeTruthy();
  });

  it('links sport tabs to the active workspace without resetting the selected sport', async () => {
    const app = mountThrowLab({ withResult: true });
    const tablist = container.querySelector('[role="tablist"][aria-label="Sport modes"]');
    const pitchingTab = container.querySelector('#throwlab-mode-tab-pitching');
    const workspace = container.querySelector('#throwlab-fs-workspace');

    expect(tablist.getAttribute('aria-orientation')).toBe('horizontal');
    expect(pitchingTab.getAttribute('aria-controls')).toBe('throwlab-fs-workspace');
    expect(workspace.getAttribute('role')).toBe('tabpanel');
    expect(workspace.getAttribute('aria-labelledby')).toBe('throwlab-mode-tab-pitching');

    await clickAsync(container.querySelector('button[aria-label^="Save current throw as reference"]'));
    const before = app.getData().throwlab;
    await clickAsync(pitchingTab);
    expect(app.getData().throwlab).toBe(before);
    expect(app.getData().throwlab.lastResult).toBeTruthy();
    expect(app.getData().throwlab.referenceList).toHaveLength(1);

    await clickAsync(container.querySelector('#throwlab-mode-tab-freethrow'));
    expect(container.querySelector('#throwlab-mode-tab-freethrow').getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('#throwlab-fs-workspace').getAttribute('aria-labelledby')).toBe('throwlab-mode-tab-freethrow');
  });

  it('keeps the fullscreen toggle name and pressed state synchronized', () => {
    let activeFullscreen = null;
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => activeFullscreen,
    });
    try {
      mountThrowLab();
      const workspace = container.querySelector('#throwlab-fs-workspace');
      let toggle = container.querySelector('button[aria-label="Enter fullscreen for the Throw Lab workspace"]');
      expect(toggle).toBeTruthy();
      expect(toggle.getAttribute('aria-pressed')).toBe('false');

      activeFullscreen = workspace;
      React.act(() => document.dispatchEvent(new Event('fullscreenchange')));
      toggle = container.querySelector('button[aria-label="Exit fullscreen for the Throw Lab workspace"]');
      expect(toggle).toBeTruthy();
      expect(toggle.getAttribute('aria-pressed')).toBe('true');

      activeFullscreen = null;
      React.act(() => document.dispatchEvent(new Event('fullscreenchange')));
      expect(container.querySelector('button[aria-label="Enter fullscreen for the Throw Lab workspace"]')).toBeTruthy();
    } finally {
      delete document.fullscreenElement;
    }
  });

  it('provides visual and textual equivalence for saved trajectory overlays', async () => {
    mountThrowLab({ withResult: true });
    await clickAsync(container.querySelector('button[aria-label^="Save current throw as reference"]'));

    const canvasLabel = container.querySelector('[data-throwlab-canvas="true"]').getAttribute('aria-label');
    expect(canvasLabel).toContain('Last throw outcome: STRIKE.');
    expect(canvasLabel).toContain('Trajectory peaked at 1.2 meters');
    expect(canvasLabel).toContain('Saved comparison overlays. Reference 1:');
    expect(canvasLabel).toContain('Outcome: STRIKE.');

    const current = container.querySelector('[data-throwlab-current-legend="true"]');
    const reference = container.querySelector('[role="listitem"][aria-label^="Reference 1:"]');
    expect(current.getAttribute('aria-label')).toContain('Current trajectory:');
    expect(reference.getAttribute('aria-label')).toContain('Trajectory peaked at 1.2 meters');
    expect(container.querySelector('[data-throwlab-current-line="true"]').style.borderTopStyle).toBe('solid');
    expect(container.querySelector('[data-throwlab-reference-line="true"]').style.borderTopStyle).toBe('dashed');
  });

  it('uses success colors for cricket outcomes instead of the baseball fallback', () => {
    mountThrowLab({
      throwlabOverrides: {
        mode: 'bowling',
        bowlType: 'fast',
        speedMph: 90,
        releaseHeight: 2.3,
        aimDegV: -2,
        spinRpm: 1200,
        lastResult: {
          samples: [{ z: 0, y: 2.3, t: 0 }, { z: 20, y: 0.7, t: 0.5 }],
          location: 'wicket',
          outcome: {},
          trial: {
            mode: 'bowling', shotKind: 'fast', presetLabel: 'Fast bowler',
            speedMph: 90, releaseHeight: 2.3, angleV: -2, angleH: 0,
            spinRpm: 1200, spinAxisDeg: 0, throwerHand: 'right',
            gravityId: 'earth', windMph: 0, windDirDeg: 0,
          },
        },
      },
    });

    const outcome = container.querySelector('[data-throwlab-outcome="wicket"]');
    expect(outcome).toBeTruthy();
    expect(outcome.style.color).toBe('rgb(16, 185, 129)');
  });

  it('opens an accessible optional 3D perspective zone with operable camera controls', async () => {
    mountThrowLab({ withResult: true });
    const saveReference = Array.from(container.querySelectorAll('button')).find((button) => (button.getAttribute('aria-label') || '').startsWith('Save current throw as reference'));
    await clickAsync(saveReference);
    let toggle = container.querySelector('button[aria-controls=throwlab-immersive-zone]');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('#throwlab-immersive-zone')).toBeNull();

    await clickAsync(toggle);
    toggle = container.querySelector('button[aria-controls=throwlab-immersive-zone]');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const zone = container.querySelector('#throwlab-immersive-zone');
    expect(zone).toBeTruthy();
    expect(zone.getAttribute('aria-labelledby')).toBe('throwlab-immersive-heading');
    const view = zone.querySelector('[data-throwlab-immersive-canvas=true]');
    expect(view.getAttribute('role')).toBe('img');
    expect(view.getAttribute('aria-label')).toContain('3D perspective view.');
    expect(view.getAttribute('height')).toBe('340');
    expect(view.getAttribute('aria-label')).toContain('A strike-zone target plane marks home plate.');
    expect(zone.querySelector('[data-throwlab-spatial-readout=true]').textContent).toContain('Trajectory peaked at 1.2 meters');
    const overlays = zone.querySelector('[data-throwlab-learning-overlays=true]');
    expect(overlays.querySelectorAll('input[type=checkbox]')).toHaveLength(3);
    const guides = overlays.querySelector('#throwlab-overlay-guides');
    const timeMarkers = overlays.querySelector('#throwlab-overlay-time');
    const comparisons = overlays.querySelector('#throwlab-overlay-references');
    expect(guides.checked).toBe(true);
    expect(timeMarkers.checked).toBe(false);
    expect(comparisons.checked).toBe(true);
    expect(overlays.textContent).toContain('Saved comparisons (1)');
    await clickAsync(timeMarkers);
    expect(timeMarkers.checked).toBe(true);
    expect(view.getAttribute('aria-label')).toContain('Time markers are visible.');
    await clickAsync(guides);
    expect(guides.checked).toBe(false);
    expect(view.getAttribute('aria-label')).toContain('Apex and endpoint guides are hidden.');
    await clickAsync(comparisons);
    expect(comparisons.checked).toBe(false);
    expect(view.getAttribute('aria-label')).toContain('Saved comparison overlays are hidden.');
    expect(view.getAttribute('aria-label')).toContain('Current outcome: STRIKE.');
    const camera = zone.querySelector('[role=group][aria-label=\'3D camera controls\']');
    expect(camera.querySelectorAll('button')).toHaveLength(5);
    expect(zone.querySelector('output').textContent).toContain('yaw -28');

    await clickAsync(camera.querySelector('button[aria-label=\'Rotate camera right 15 degrees\']'));
    expect(zone.querySelector('output').textContent).toContain('yaw -13');
    await clickAsync(camera.querySelector('button[aria-label=\'Reset 3D camera\']'));
    expect(zone.querySelector('output').textContent).toContain('yaw -28');

    const views = zone.querySelector('[data-throwlab-view-presets=true]');
    expect(views.querySelectorAll('button')).toHaveLength(4);
    const overhead = Array.from(views.querySelectorAll('button')).find((button) => button.textContent === 'Overhead');
    await clickAsync(overhead);
    expect(overhead.getAttribute('aria-pressed')).toBe('true');
    expect(zone.querySelector('output').textContent).toContain('height 55');
    const behind = Array.from(views.querySelectorAll('button')).find((button) => button.textContent === 'Behind launch');
    await clickAsync(behind);
    expect(behind.getAttribute('aria-pressed')).toBe('true');
    expect(zone.querySelector('output').textContent).toContain('yaw 0');
    expect(zone.querySelector('output').textContent).toContain('height 18');

    const follow = Array.from(views.querySelectorAll('button')).find((button) => button.textContent === 'Follow ball');
    await clickAsync(follow);
    expect(follow.getAttribute('aria-pressed')).toBe('true');
    expect(zone.querySelector('output').textContent).toContain('following ball');

    const analysis = zone.querySelector('[data-throwlab-analysis-details=true]');
    expect(analysis).toBeTruthy();
    expect(analysis.querySelector('#throwlab-camera-yaw')).toBeTruthy();
    expect(analysis.querySelector('#throwlab-camera-pitch')).toBeTruthy();
    const vectorControls = analysis.querySelector('[data-throwlab-vector-controls=true]');
    const vectorInputs = vectorControls.querySelectorAll('input[type=checkbox]');
    expect(vectorInputs).toHaveLength(5);
    expect(vectorControls.querySelector('[data-vector-key=velocity]').checked).toBe(true);
    const gravity = vectorControls.querySelector('[data-vector-key=gravity]');
    await clickAsync(gravity);
    expect(gravity.checked).toBe(true);
    expect(view.getAttribute('aria-label')).toContain('velocity, gravity');
    expect(analysis.querySelector('[data-throwlab-comparison-deltas=true]')).toBeTruthy();
    expect(analysis.querySelectorAll('#throwlab-observation-heading + ul li').length).toBeGreaterThanOrEqual(3);
    expect(Array.from(analysis.querySelectorAll('button')).find((button) => button.textContent === 'Download PNG').disabled).toBe(false);
    expect(Array.from(analysis.querySelectorAll('button')).find((button) => button.textContent === 'Export CSV').disabled).toBe(false);
    await clickAsync(Array.from(analysis.querySelectorAll('button')).find((button) => button.textContent === 'Reset immersive'));
    expect(zone.querySelector('[data-vector-key=gravity]').checked).toBe(false);
    expect(Array.from(views.querySelectorAll('button')).find((button) => button.textContent === 'Follow ball').getAttribute('aria-pressed')).toBe('false');

    await clickAsync(container.querySelector('button[aria-controls=throwlab-immersive-zone]'));
    expect(container.querySelector('#throwlab-immersive-zone')).toBeNull();
  });

  it('supports deterministic replay scrubbing, stepping, completion, and speed selection', async () => {
    const app = mountThrowLab({ withResult: true });
    const panel = container.querySelector('[data-throwlab-replay-analysis=true]');
    expect(panel).toBeTruthy();
    const timeline = panel.querySelector('#throwlab-replay-scrubber');
    expect(timeline.getAttribute('aria-label')).toBe('Trajectory replay timeline');
    expect(panel.querySelector('[role=progressbar]').getAttribute('aria-valuenow')).toBe('100');
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await React.act(async () => {
      valueSetter.call(timeline, '50');
      timeline.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(app.getData().throwlab.replayActive).toBe(true);
    expect(app.getData().throwlab.replayT).toBeCloseTo(0.5, 2);
    expect(Array.from(panel.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Resume trajectory replay')).toBeTruthy();
    await clickAsync(Array.from(panel.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Step replay backward one physics sample'));
    expect(app.getData().throwlab.replayT).toBe(0);
    const speedGroup = Array.from(panel.querySelectorAll('[role=group]')).find((group) => group.getAttribute('aria-label') === 'Replay speed');
    expect(speedGroup.querySelectorAll('button')).toHaveLength(3);
    const quarterSpeed = Array.from(speedGroup.querySelectorAll('button')).find((button) => button.textContent.startsWith('0.25'));
    await clickAsync(quarterSpeed);
    expect(quarterSpeed.getAttribute('aria-pressed')).toBe('true');
    await clickAsync(Array.from(panel.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Finish replay analysis and show the full trajectory'));
    expect(app.getData().throwlab.replayActive).toBe(false);
    expect(app.getData().throwlab.replayT).toBe(1);
    expect(panel.querySelector('[role=progressbar]').getAttribute('aria-valuenow')).toBe('100');
  });

  it('presents one coherent choose, predict, launch, compare loop with sport-specific rates', () => {
    mountThrowLab({
      throwlabOverrides: {
        throwCount: 12,
        modeThrowCounts: { pitching: 2, freethrow: 10 },
        strikeCount: 1,
      },
    });

    const loop = container.querySelector('section[aria-label="How Throw Lab works"]');
    expect(loop).toBeTruthy();
    expect(Array.from(loop.querySelectorAll('.throwlab-loop-step')).map((step) => step.textContent)).toEqual([
      '1ChoosePick a sport and setup',
      '2PredictCall the outcome',
      '3LaunchWatch the evidence',
      '4CompareChange one variable',
    ]);

    const rate = container.querySelector('[data-throwlab-run-focus] [role="progressbar"]');
    expect(rate.getAttribute('aria-valuenow')).toBe('50');
    expect(rate.getAttribute('data-throwlab-mode-attempts')).toBe('2');
    expect(rate.getAttribute('aria-label')).toContain('50 percent from 2 attempts');

    expect(container.querySelector('#tl-preset-picker-heading').textContent).toBe('1 · Choose a pitch');
    expect(container.querySelector('#tl-release-controls-heading').textContent).toBe('2 · Tune the release');
    expect(container.querySelector('#throwlab-launch-controls-heading').textContent).toBe('3 · Call it and launch');
    expect(container.querySelector('#tl-result-heading').textContent).toBe('4 · Launch to collect evidence');

    const jump = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'SET UP NEXT REP');
    expect(jump.getAttribute('aria-controls')).toBe('throwlab-launch-controls');
    expect(Array.from(container.querySelectorAll('button')).filter((button) => button.textContent.includes('THROW PITCH'))).toHaveLength(1);

    const prediction = container.querySelector('fieldset[data-throwlab-prediction="true"]');
    expect(prediction.querySelector('legend').textContent).toContain('Call your shot');
    expect(prediction.querySelectorAll('button[aria-pressed]')).toHaveLength(3);
  });

  it('pins an optional prediction to the launched trial and responds with evidence', async () => {
    const app = mountThrowLab();
    const prediction = container.querySelector('[data-throwlab-prediction="true"]');
    const strikeCall = Array.from(prediction.querySelectorAll('button')).find((button) => button.textContent.startsWith('Strike'));
    await clickAsync(strikeCall);

    expect(strikeCall.getAttribute('aria-pressed')).toBe('true');
    expect(app.getData().throwlab.predictionKey).toBe('target');

    const launch = Array.from(container.querySelectorAll('#throwlab-launch-controls button')).find((button) => button.textContent.includes('THROW PITCH'));
    await clickAsync(launch);

    const state = app.getData().throwlab;
    expect(state.lastResult.trial).toMatchObject({
      predictionKey: 'target',
      predictionLabel: 'Strike',
    });
    expect(state.predictionKey).toBeNull();
    expect(state.predictionStats.attempts).toBe(1);
    expect([0, 1]).toContain(state.predictionStats.matches);

    const feedback = container.querySelector('[data-throwlab-prediction-result]');
    expect(feedback).toBeTruthy();
    expect(feedback.textContent).toContain('You called Strike');
    expect(['matched', 'surprised']).toContain(feedback.getAttribute('data-throwlab-prediction-result'));
    expect(Array.from(container.querySelectorAll('[data-throwlab-prediction] button')).every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it('loads a scientifically controlled next rep by changing exactly one launched variable', async () => {
    const app = mountThrowLab();
    const launch = Array.from(container.querySelectorAll('#throwlab-launch-controls button')).find((button) => button.textContent.includes('THROW PITCH'));
    await clickAsync(launch);

    const baselineResult = app.getData().throwlab.lastResult;
    const trial = baselineResult.trial;
    const recommendationPanel = container.querySelector('[data-throwlab-next-rep]');
    const changedKey = recommendationPanel.getAttribute('data-throwlab-next-rep');
    const apply = recommendationPanel.querySelector('button[aria-label^="Load the suggested one-variable next rep:"]');
    await clickAsync(apply);

    const state = app.getData().throwlab;
    const launchedValues = {
      speedMph: trial.speedMph,
      aimDegV: trial.angleV,
      aimDegH: trial.angleH,
      spinRpm: trial.spinRpm,
    };
    expect(Object.keys(launchedValues)).toContain(changedKey);
    for (const [key, value] of Object.entries(launchedValues)) {
      if (key === changedKey) expect(state[key]).not.toBe(value);
      else expect(state[key]).toBe(value);
    }
    expect(state.lastResult).toBe(baselineResult);
    expect(state.replayActive).toBe(false);
    expect(container.querySelector('[data-throwlab-next-trial-check="fair"]')).toBeTruthy();
  });

  it('keeps high-spin golf presets and half-court speed inside their visible controls', async () => {
    mountThrowLab({
      throwlabOverrides: {
        mode: 'golf',
        golfClub: 'wedge',
        speedMph: 95,
        releaseHeight: 0,
        aimDegV: 50,
        spinRpm: 9500,
        spinAxisDeg: 0,
        scaffoldTier: 3,
      },
    });

    const golfSpin = container.querySelector('#tl-golf-slider-spin-rate');
    expect(golfSpin.value).toBe('9500');
    expect(golfSpin.max).toBe('12000');
    expect(golfSpin.step).toBe('100');
  });
});
