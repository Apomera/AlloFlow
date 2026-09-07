import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text);
}
function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
}
async function settle() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe('Particle Lab 3D rendered WCAG interaction states', () => {
  let host;
  let root;
  let latestToolData = {};
  const persisted = () => latestToolData.particleLab3d || {};

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
    const Component = () => {
      const [toolData, setToolData] = React.useState({ particleLab3d: {} });
      latestToolData = toolData;
      const ctx = makeCtx({ toolData, setToolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await settle(); });
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('keeps the loading canvas non-tabbable and restores its interactive ready state', () => {
    const loadingStage = host.querySelector('#particle-stage');
    const loadingCanvas = host.querySelector('canvas[role="application"]');
    expect(loadingCanvas).not.toBeNull();
    expect(loadingStage.getAttribute('aria-busy')).toBe('true');
    expect(loadingCanvas.tabIndex).toBe(-1);
    expect(loadingCanvas.getAttribute('aria-hidden')).toBe('true');

    const previousThree = window.THREE;
    try {
      window.THREE = { OrbitControls: function OrbitControls() {} };
      resetStemLab();
      loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
      const readyMarkup = renderTool('particleLab3d', { particleLab3d: {} });
      const readyHost = document.createElement('div');
      readyHost.innerHTML = readyMarkup;
      const readyStage = readyHost.querySelector('#particle-stage');
      const readyCanvas = readyHost.querySelector('canvas[role="application"]');
      expect(readyCanvas).not.toBeNull();
      expect(readyHost.querySelectorAll('canvas[role="application"]')).toHaveLength(1);
      expect(readyStage.getAttribute('aria-busy')).toBe('false');
      expect(readyCanvas.tabIndex).toBe(0);
      expect(readyCanvas.hasAttribute('aria-hidden')).toBe(false);
      expect(readyCanvas.getAttribute('aria-roledescription')).toBe('Interactive 3D particle chamber');
      expect(readyCanvas.getAttribute('aria-describedby')).toBe('particle-chamber-help');
      expect(readyHost.querySelector('#particle-chamber-help')?.textContent).toContain('Arrow keys orbit the camera');
      expect(readyCanvas.parentElement.getAttribute('role')).toBeNull();
      expect(readyCanvas.className).toContain('focus-visible:outline-cyan-200');
    } finally {
      if (previousThree === undefined) delete window.THREE;
      else window.THREE = previousThree;
    }
  });

  it('does not activate a character shortcut outside the focused canvas', async () => {
    document.body.focus();
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true })); await settle(); });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens shortcuts from the canvas, focuses Close, and returns focus on Escape', async () => {
    const canvas = host.querySelector('canvas[role="application"]');
    canvas.focus();
    await act(async () => { canvas.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true })); await settle(); });
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-labelledby')).toBe('particle-keys-title');
    expect(document.activeElement?.textContent).toBe('Close');
    await act(async () => { document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await settle(); });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(canvas);
  });

  it('also closes the shortcuts dialog with the documented question-mark key', async () => {
    const canvas = host.querySelector('canvas[role="application"]');
    canvas.focus();
    await act(async () => { canvas.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true })); await settle(); });
    const close = document.activeElement;
    expect(close?.textContent).toBe('Close');
    await act(async () => { close.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true, cancelable: true })); await settle(); });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(canvas);
  });

  it('opens shortcuts from a dialog trigger with explicit popup semantics', async () => {
    const trigger = buttonByText(host, 'Keys (?)');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    await act(async () => { trigger.click(); await settle(); });
    expect(document.querySelector('#particle-keys-description')?.textContent).toContain('only while the particle chamber has keyboard focus');
    await act(async () => { buttonByText(document, 'Close').click(); await settle(); });
    expect(document.activeElement).toBe(trigger);
  });

  it('offers a labeled native keyboard control for selecting any particle', async () => {
    const selector = host.querySelector('#particle-trace-selector');
    expect(selector.type).toBe('number');
    expect(selector.min).toBe('1');
    expect(selector.max).toBe('64');
    expect(host.querySelector('label[for="particle-trace-selector"]')?.textContent).toContain('keyboard alternative');
    await act(async () => { setValue(selector, '4'); await settle(); });
    expect(selector.value).toBe('4');
    expect(buttonByText(host, '📍 Trace')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps core controls visible while advanced chamber conditions fold into a native disclosure', async () => {
    expect(host.querySelector('input[aria-label="Temperature in kelvin"]')).not.toBeNull();
    expect(host.querySelector('input[aria-label="Particle count"]')).not.toBeNull();
    const details = host.querySelector('#particle-advanced-conditions');
    const summary = details?.querySelector('summary');
    expect(details).not.toBeNull();
    expect(summary?.textContent).toContain('Advanced conditions');
    expect(summary?.textContent).toContain('11 u edge');
    expect(details.open).toBe(false);
    await act(async () => { summary.click(); await settle(); });
    expect(details.open).toBe(true);
    expect(details.querySelector('input[aria-label="Container edge length and volume"]')).not.toBeNull();
    await act(async () => { summary.click(); await settle(); });
    expect(details.open).toBe(false);
  });

  it('keeps optional visual overlays discoverable without crowding the essential stage controls', async () => {
    const details = host.querySelector('#particle-visual-overlays');
    const summary = details?.querySelector('summary');
    expect(details).not.toBeNull();
    expect(summary?.textContent).toContain('Visual overlays');
    expect(summary?.textContent).toContain('2 on');
    expect(details.open).toBe(false);
    await act(async () => { summary.click(); await settle(); });
    expect(details.open).toBe(true);
    const overlayButtons = details.querySelectorAll('button');
    expect(overlayButtons).toHaveLength(5);
    await act(async () => { overlayButtons[0].click(); await settle(); });
    expect(overlayButtons[0].getAttribute('aria-pressed')).toBe('true');
    expect(summary.textContent).toContain('3 on');
    await act(async () => { summary.click(); await settle(); });
    expect(details.open).toBe(false);
  });

  it('offers a direct path into the 3D chamber from the hero header', () => {
    const jump = host.querySelector('a[href="#particle-stage"]');
    expect(jump).not.toBeNull();
    expect(jump?.textContent).toContain('Enter 3D chamber');
    expect(jump?.getAttribute('aria-label')).toBe('Jump to the 3D particle chamber');
    expect(host.querySelector('#particle-stage')).not.toBeNull();
  });

  it('keeps the gesture guide folded until a learner asks for it', async () => {
    const guide = host.querySelector('#particle-chamber-guide');
    const toggle = host.querySelector('button[aria-label="Expand the chamber controls guide"]');
    expect(guide).not.toBeNull();
    expect(guide.textContent).toBe('');
    expect(toggle).not.toBeNull();
    await act(async () => { toggle.click(); await settle(); });
    expect(guide.textContent).toContain('Click: select');
  });

  it('renders camera alternatives with mobile-sized compact controls', () => {
    const cameraGroup = host.querySelector('[role="group"][aria-label="Camera views"]');
    expect(cameraGroup).not.toBeNull();
    expect(['Hero', 'Top', 'Close', '◎ Showcase camera', '◎ Follow tracer'].every((label) => !!buttonByText(cameraGroup, label))).toBe(true);
    Array.from(cameraGroup.querySelectorAll('button')).forEach((button) => {
      expect(button.className).toContain('min-h-11');
      expect(button.className).toContain('sm:min-h-6');
    });
    const speedGroup = host.querySelector('[role="group"][aria-label="Simulation speed"]');
    expect(speedGroup).not.toBeNull();
    expect(Array.from(speedGroup.querySelectorAll('button')).every((button) => button.className.includes('min-h-11') && button.className.includes('sm:min-h-6'))).toBe(true);
  });

  it('shows the experiment runway and scene key next to the 3D chamber', () => {
    const runway = host.querySelector('#particle-experiment-runway');
    expect(runway?.getAttribute('role')).toBe('region');
    expect(runway?.getAttribute('aria-label')).toBe('Experiment loop');
    expect(runway?.textContent).toContain('Predict');
    expect(runway?.textContent).toContain('Observe');
    expect(runway?.textContent).toContain('Explain');
    expect(runway?.textContent).toContain('What to notice');
    expect(host.querySelector('#particle-stage-status')?.textContent).toContain('Now: Predict');
    expect(host.querySelector('#particle-scene-key')?.getAttribute('role')).toBe('img');
    expect(host.querySelector('#particle-scene-key')?.getAttribute('aria-label')).toContain('cyan particles');
    expect(host.querySelector('#particle-readouts')?.textContent).toContain('measured');
    expect(host.querySelector('#particle-readouts')?.textContent).toContain('setpoint 300 K');
    expect(host.querySelector('#particle-stage-activity')?.textContent).toContain('Simulation paused');
    expect(host.querySelector('#particle-stage-activity')?.textContent).toContain('Press Run or Space to begin');
  });

  it('turns the stage activity cue into a live observation prompt when the chamber runs', async () => {
    const activity = host.querySelector('#particle-stage-activity');
    const run = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Run'));
    expect(activity).not.toBeNull();
    expect(run).not.toBeUndefined();
    await act(async () => { run.click(); await settle(); });
    expect(activity.textContent).toContain('Live simulation');
    expect(activity.textContent).toContain('Watch collisions and wall impacts');
    await act(async () => { run.click(); await settle(); });
    expect(activity.textContent).toContain('Simulation paused');
  });

  it('switches the live evidence line when a transport protocol is selected', async () => {
    const protocol = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Diffusion Race'));
    expect(protocol).not.toBeUndefined();
    await act(async () => { protocol.click(); await settle(); });
    const run = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Run'));
    await act(async () => { run.click(); await settle(); });
    const activity = host.querySelector('#particle-stage-activity');
    expect(activity.textContent).toContain('Watch A and B mix');
    expect(activity.textContent).toContain('Mixing');
  });

  it('keeps the selected camera view visible and announced', async () => {
    const cameraGroup = host.querySelector('[role="group"][aria-label="Camera views"]');
    const hero = buttonByText(cameraGroup, 'Hero');
    const top = buttonByText(cameraGroup, 'Top');
    expect(hero.getAttribute('aria-pressed')).toBe('true');
    expect(top.getAttribute('aria-pressed')).toBe('false');
    await act(async () => { top.click(); await settle(); });
    expect(hero.getAttribute('aria-pressed')).toBe('false');
    expect(top.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('#particle-readouts')?.textContent).toContain('View Top-down');
  });


  it('collapses readouts without replacing the canvas and restores focus to its toggle', async () => {
    const canvas = host.querySelector('canvas');
    // One collapse control only: the essential-bar toggle (the dock heading no longer duplicates it).
    expect(host.querySelector('#particle-readouts [aria-label="Collapse chamber readouts"]')).toBeNull();
    const collapse = buttonByText(host, 'Collapse readouts');
    expect(collapse.getAttribute('aria-controls')).toBe('particle-readouts');
    collapse.focus();
    await act(async () => { collapse.click(); await settle(); });
    expect(host.querySelector('#particle-readouts').hidden).toBe(true);
    expect(document.activeElement?.textContent).toBe('Show readouts');
    await act(async () => { document.activeElement.click(); await settle(); });
    expect(host.querySelector('#particle-readouts').hidden).toBe(false);
    expect(host.querySelector('canvas')).toBe(canvas);
  });

  it('offers a persisted dock width for side placements and a one-line status while the dock is collapsed', async () => {
    const width = host.querySelector('[aria-label="Chamber readouts width"]');
    expect(width.tagName).toBe('SELECT');
    expect(width.value).toBe('standard');
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    await act(async () => { setSelect.call(width, 'wide'); width.dispatchEvent(new Event('change', { bubbles: true })); await settle(); });
    expect(host.querySelector('#particle-workspace').getAttribute('data-width')).toBe('wide');
    expect(persisted().readoutsWidth).toBe('wide');
    // Width is meaningless below the chamber, so the control folds away there.
    const position = host.querySelector('[aria-label="Chamber readouts position"]');
    await act(async () => { setSelect.call(position, 'bottom'); position.dispatchEvent(new Event('change', { bubbles: true })); await settle(); });
    expect(host.querySelector('[aria-label="Chamber readouts width"]')).toBeNull();
    expect(host.querySelector('[data-testid="particle-mini-status"]')).toBeNull();
    await act(async () => { buttonByText(host, 'Collapse readouts').click(); await settle(); });
    const status = host.querySelector('[data-testid="particle-mini-status"]');
    expect(status.textContent).toMatch(/^\d+ K · 64 particles · paused$/);
    expect(status.getAttribute('aria-live')).toBeNull();
    await act(async () => { buttonByText(host, 'Show readouts').click(); await settle(); });
    expect(host.querySelector('[data-testid="particle-mini-status"]')).toBeNull();
  });

  it('clamps a stale saved trial when it is restored', async () => {
    // Saved trials live in the same persisted bucket, so restoring one is a second door into the simulation
    // for values an older build or a corrupt save could hold.
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
    const hostileTrial = {
      id: 'trial-stale', preset: 'plasma', temperature: -500, temperatureSetpoint: -500, count: 99999,
      boxSize: 900, attraction: 42, gravity: -7, permeability: 5, massRatioB: 99, particleDiameter: 9, membrane: true,
    };
    const Component = () => {
      const [toolData, setToolData] = React.useState({ particleLab3d: { trials: [hostileTrial] } });
      const ctx = makeCtx({ toolData, setToolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    const localHost = document.createElement('div');
    document.body.appendChild(localHost);
    const localRoot = ReactDOMClient.createRoot(localHost);
    try {
      await act(async () => { localRoot.render(React.createElement(Component)); await settle(); });
      const trialButton = Array.from(localHost.querySelectorAll('button')).find((button) => button.textContent.includes('Trial 1'));
      expect(trialButton).toBeDefined();
      await act(async () => { trialButton.click(); await settle(); });
      const value = (label) => localHost.querySelector(`[aria-label="${label}"]`)?.value;
      expect(value('Temperature in kelvin')).toBe('40'); // clamped up from -500
      expect(value('Particle count')).toBe('120'); // clamped down from 99999
      expect(value('Container edge length and volume')).toBe('18');
      expect(value('Downward gravity field strength')).toBe('0');
      expect(value('Particle collision diameter')).toBe('0.9');
      const pressedPresets = Array.from(localHost.querySelectorAll('#particle-preset-row button[aria-pressed="true"]'));
      expect(pressedPresets).toHaveLength(1);
      expect(pressedPresets[0].textContent).toContain('Gas');
    } finally {
      act(() => localRoot.unmount());
      localHost.remove();
      resetStemLab();
    }
  });

  it('survives a stale or corrupt saved bucket instead of rendering it', () => {
    // Saved tool data was restored verbatim: an unknown preset id crashed the render outright at
    // presets.filter(...)[0].note, and an out-of-range count went straight into the particle loop.
    const hostile = {
      preset: 'plasma', quality: 'turbo', cameraView: 'orbit', membraneSelectivity: 'z', timeScale: 99,
      count: 99999, temperature: -500, boxSize: 900, attraction: 42, gravity: -7, permeability: 5,
    };
    const previousThree = window.THREE;
    try {
      window.THREE = { OrbitControls: function OrbitControls() {} };
      resetStemLab();
      loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
      const markup = renderTool('particleLab3d', { particleLab3d: hostile });
      expect(markup.length).toBeGreaterThan(500);
      expect(markup).toContain('>40 K<'); // temperature clamped up to the slider minimum
      expect(markup).toContain('>120<'); // count clamped down to the slider maximum
      const dom = document.createElement('div');
      dom.innerHTML = markup;
      const pressedPresets = Array.from(dom.querySelectorAll('#particle-preset-row button[aria-pressed="true"]'));
      expect(pressedPresets).toHaveLength(1); // unknown preset falls back to exactly one real preset
      expect(pressedPresets[0].textContent).toContain('Gas');
    } finally {
      window.THREE = previousThree;
      resetStemLab();
    }
  });

  it.each([
    ['the AI call fails', () => Promise.reject(new Error('model unavailable'))],
    ['the AI returns nothing usable', () => Promise.resolve('   ')],
  ])('still coaches the student when %s', async (_label, callGemini) => {
    // The Ask lab coach button is disabled while the request runs, so any path that does not settle would
    // strand the student. Every failure mode must land on the built-in coach and re-enable the button.
    let attempts = 0;
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
    const Component = () => {
      const [toolData, setToolData] = React.useState({ particleLab3d: {} });
      const ctx = makeCtx({
        toolData,
        setToolData,
        aiHintsEnabled: true,
        callGemini: () => { attempts += 1; return callGemini(); },
        update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })),
      });
      return config.render(ctx);
    };
    const localHost = document.createElement('div');
    document.body.appendChild(localHost);
    const localRoot = ReactDOMClient.createRoot(localHost);
    try {
      await act(async () => { localRoot.render(React.createElement(Component)); await settle(); });
      const ask = Array.from(localHost.querySelectorAll('button')).find((button) => button.textContent.includes('Ask lab coach'));
      expect(ask).toBeDefined();
      await act(async () => { ask.click(); await settle(); });
      expect(attempts).toBe(1);
      const coach = Array.from(localHost.querySelectorAll('button')).find((button) => button.textContent.includes('Ask lab coach') || button.textContent.includes('Coach is thinking'));
      expect(coach.disabled).toBe(false); // never stuck on "Coach is thinking…"
      expect(localHost.textContent).toContain('Start by making a prediction');
    } finally {
      act(() => localRoot.unmount());
      localHost.remove();
      resetStemLab();
    }
  });

  it('copies the lab report through the shell helper, not the raw clipboard API', async () => {
    // Gemini Canvas refuses navigator.clipboard by permissions policy, so a direct call rejects on every click
    // there while passing every test on a normal origin. The shell publishes window.alloCopyText for this.
    const copyButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Copy complete lab report'));
    expect(copyButton).toBeDefined();
    const copied = [];
    const previousHelper = window.alloCopyText;
    const previousExec = document.execCommand;
    try {
      window.alloCopyText = (text) => { copied.push(text); return Promise.resolve(true); };
      await act(async () => { copyButton.click(); await settle(); });
      expect(copied).toHaveLength(1);
      expect(copied[0]).toContain('Particle Lab 3D');
      expect(copied[0]).toContain('Prediction:');

      // With no shell helper it must still copy synchronously via execCommand, never reject silently.
      delete window.alloCopyText;
      const execCalls = [];
      document.execCommand = (command) => { execCalls.push(command); return true; };
      await act(async () => { copyButton.click(); await settle(); });
      expect(execCalls).toEqual(['copy']);
      expect(document.querySelectorAll('textarea[readonly]')).toHaveLength(0); // the scratch textarea is cleaned up
    } finally {
      if (previousHelper === undefined) delete window.alloCopyText; else window.alloCopyText = previousHelper;
      document.execCommand = previousExec;
    }
  });

  it('remembers the chosen camera view', async () => {
    // bucket.cameraView was read on mount but nothing ever wrote it, so the framing reset on every return
    // while every other view preference persisted.
    const cameraGroup = host.querySelector('[role="group"][aria-label="Camera views"]');
    const top = buttonByText(cameraGroup, 'Top');
    await act(async () => { top.click(); await settle(); });
    expect(top.getAttribute('aria-pressed')).toBe('true');
    expect(persisted().cameraView).toBe('top');
    const close = buttonByText(cameraGroup, 'Close');
    await act(async () => { close.click(); await settle(); });
    expect(persisted().cameraView).toBe('close');
  });

  it('puts a left dock before the chamber in DOM order without replacing the canvas', async () => {
    const canvas = host.querySelector('canvas');
    const workspace = host.querySelector('#particle-workspace');
    const order = () => Array.from(workspace.children).map((child) => child.id);
    expect(order()).toEqual(['particle-viewport', 'particle-readouts']);
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    const position = host.querySelector('[aria-label="Chamber readouts position"]');
    await act(async () => { setSelect.call(position, 'left'); position.dispatchEvent(new Event('change', { bubbles: true })); await settle(); });
    expect(order()).toEqual(['particle-readouts', 'particle-viewport']);
    expect(host.querySelector('canvas')).toBe(canvas);
    await act(async () => { setSelect.call(position, 'bottom'); position.dispatchEvent(new Event('change', { bubbles: true })); await settle(); });
    expect(order()).toEqual(['particle-viewport', 'particle-readouts']);
    expect(host.querySelector('canvas')).toBe(canvas);
  });

  it('toggles the readouts dock with D while the chamber has focus, and ignores D once the UI is hidden', async () => {
    const canvas = host.querySelector('canvas');
    await act(async () => { canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true })); await settle(); });
    expect(host.querySelector('#particle-readouts').hidden).toBe(true);
    expect(buttonByText(host, 'Show readouts').getAttribute('aria-expanded')).toBe('false');
    await act(async () => { canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', bubbles: true })); await settle(); });
    expect(host.querySelector('#particle-readouts').hidden).toBe(false);
    await act(async () => { buttonByText(host, 'Hide UI').click(); await settle(); });
    await act(async () => { canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true })); await settle(); });
    expect(host.querySelector('#particle-readouts')).toBeNull();
    await act(async () => { buttonByText(host, 'Show controls (H)').click(); await settle(); });
    expect(host.querySelector('#particle-readouts').hidden).toBe(false);
    expect(host.querySelector('canvas')).toBe(canvas);
  });

  it('hides all readouts and optional controls while keeping run, exit, and restore reachable', async () => {
    const canvas = host.querySelector('canvas');
    await act(async () => { buttonByText(host, 'Hide UI').click(); await settle(); });
    expect(host.querySelector('#particle-readouts')).toBeNull();
    expect(host.querySelector('#particle-secondary-controls')).toBeNull();
    expect(host.querySelector('#particle-experiment-runway')).toBeNull();
    expect(host.querySelector('#particle-essential-controls').textContent).toContain('Run');
    expect(host.querySelector('[aria-label="Open fullscreen particle chamber"]')).not.toBeNull();
    await act(async () => { buttonByText(host, 'Show controls (H)').click(); await settle(); });
    expect(host.querySelector('#particle-readouts')).not.toBeNull();
    expect(host.querySelector('canvas')).toBe(canvas);
  });

  it('renders no persistent seven, eight, or nine pixel utility text', () => {
    expect(host.innerHTML).not.toMatch(/text-\[(?:7|8|9)px\]/);
  });

  it('lets a slider drag settle before committing the scene-rebuilding value', async () => {
    // Every input tick on these sliders used to change a scene-effect dependency, so a drag was a rebuild per tick.
    const slider = host.querySelector('input[aria-label="Container edge length and volume"]');
    await act(async () => { setValue(slider, '9'); setValue(slider, '13'); setValue(slider, '16'); await settle(); });
    // The thumb and its readout follow at once...
    expect(slider.value).toBe('16');
    expect(Array.from(host.querySelectorAll('output')).some((node) => node.textContent === '16 u')).toBe(true);
    // ...but nothing has been committed or persisted yet.
    expect(persisted().boxSize).toBeUndefined();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 260)); });
    expect(persisted().boxSize).toBe(16);
    // An external change (a preset) still drives the draft, so the thumb never shows a stale value.
    const gas = Array.from(host.querySelectorAll('button[aria-pressed]')).find((button) => /Solid/.test(button.textContent));
    await act(async () => { gas.click(); await new Promise((resolve) => setTimeout(resolve, 260)); });
    expect(slider.value).toBe(String(persisted().boxSize));
  });


  it('saves a continuous slider once after the drag settles, while the tool state follows every tick', async () => {
    const slider = host.querySelector('input[type="range"][aria-label="Interparticle attraction strength"]');
    expect(slider).not.toBeNull();
    await act(async () => { setValue(slider, '0.3'); setValue(slider, '0.9'); setValue(slider, '1.2'); await settle(); });
    expect(slider.value).toBe('1.2');            // local state moved on every tick
    expect(persisted().attraction).toBeUndefined(); // the host has not been asked to save yet
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 320)); });
    expect(persisted().attraction).toBe(1.2);     // one save, carrying only the final value
  });

});
