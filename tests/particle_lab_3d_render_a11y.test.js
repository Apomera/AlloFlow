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
    const slider = host.querySelector('input[aria-label="Particle collision diameter"]');
    await act(async () => { setValue(slider, '0.42'); setValue(slider, '0.6'); setValue(slider, '0.78'); await settle(); });
    // The thumb and its readout follow at once...
    expect(slider.value).toBe('0.78');
    expect(Array.from(host.querySelectorAll('output')).some((node) => node.textContent === '0.78 u')).toBe(true);
    // ...but nothing has been committed or persisted yet.
    expect(persisted().particleDiameter).toBeUndefined();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 260)); });
    expect(persisted().particleDiameter).toBe(0.78);
    // An external change (a preset) still drives the draft, so the thumb never shows a stale value.
    const solid = Array.from(host.querySelectorAll('button[aria-pressed]')).find((button) => /Solid/.test(button.textContent));
    await act(async () => { solid.click(); await new Promise((resolve) => setTimeout(resolve, 260)); });
    expect(slider.value).toBe(String(persisted().particleDiameter));
  });

  it('moves the container live, offers a heat bath, and turns it on for the Compression investigation', async () => {
    // The container slider used to re-seed the chamber; now it is a piston, so it needs no draft and saves once the drag settles.
    const slider = host.querySelector('input[aria-label="Container edge length and volume"]');
    await act(async () => { setValue(slider, '9'); setValue(slider, '14'); await settle(); });
    expect(slider.value).toBe('14');
    expect(Array.from(host.querySelectorAll('output')).some((node) => node.textContent === '14 u')).toBe(true);
    expect(persisted().boxSize).toBeUndefined();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 320)); });
    expect(persisted().boxSize).toBe(14);
    const bath = buttonByText(host, '♨ Heat bath off');
    expect(bath).toBeDefined();
    await act(async () => { bath.click(); await settle(); });
    expect(buttonByText(host, '♨ Heat bath on').getAttribute('aria-pressed')).toBe('true');
    expect(persisted().thermostat).toBe(true);
    const adiabatic = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Squeeze Without a Bath'));
    await act(async () => { adiabatic.click(); await settle(); });
    expect(persisted().thermostat).toBe(false);
    const compression = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Compression'));
    await act(async () => { compression.click(); await settle(); });
    expect(persisted().thermostat).toBe(true);
    expect(buttonByText(host, '♨ Heat bath on')).toBeDefined();
  });

  it('counts wall hits apart from particle hits and checks PV over NT across a trial pair', () => {
    const pure = window.__alloParticleLabPure;
    const settings = { preset: 'gas', boxSize: 12, particleDiameter: 0.58, attraction: 0, gravity: 0, massRatioB: 1, membrane: false, permeability: 0, membraneSelectivity: 'both' };
    const atWall = [{ x: 5.7, y: 0, z: 0, vx: 3, vy: 0, vz: 0, type: 0, freeFlights: [] }];
    expect(pure.advanceParticles(atWall, settings, 1 / 60)).toMatchObject({ collisions: 1, wallCollisions: 1 });
    const overlapping = [{ x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0, type: 0, freeFlights: [] }, { x: 0.4, y: 0, z: 0, vx: -1, vy: 0, vz: 0, type: 0, freeFlights: [] }];
    expect(pure.advanceParticles(overlapping, settings, 1 / 60)).toMatchObject({ collisions: 1, wallCollisions: 0 });
    expect(pure.gasLawRatio(1, 10, 50, 300)).toBeCloseTo(66.667, 2);
    expect(pure.gasLawRatio(0, 10, 50, 300)).toBeNull(); // no settled gauge, no ratio
    // Boyle: halve the volume at fixed N and T and the pressure doubles, so the ratio holds.
    const boyle = pure.gasLawAgreement({ pressure: 1.0, boxSize: 12, count: 64, temperature: 300 }, { pressure: 2.1, boxSize: 12 / Math.cbrt(2), count: 64, temperature: 300 });
    expect(boyle.label).toContain('held constant');
    expect(boyle.spread).toBeLessThan(0.15);
    const drifted = pure.gasLawAgreement({ pressure: 1.0, boxSize: 12, count: 64, temperature: 300 }, { pressure: 1.0, boxSize: 12, count: 64, temperature: 500 });
    expect(drifted.label).toContain('moved');
    expect(pure.gasLawAgreement({ pressure: 0, boxSize: 12, count: 64, temperature: 300 }, { pressure: 1, boxSize: 12, count: 64, temperature: 300 }).spread).toBeNull();
    const cells = Array.from(host.querySelectorAll('.rounded-xl.bg-slate-100 .text-\\[10px\\]')).map((el) => el.textContent);
    expect(cells).toEqual(expect.arrayContaining(['Wall hits', 'All collisions', 'PV / NT']));
  });

  it('holds pressure by handing the container to the gauge, and treats the volume change as a response in a fair test', async () => {
    const pure = window.__alloParticleLabPure;
    const base = { preset: 'gas', temperatureSetpoint: 200, temperature: 200, pressure: 1, count: 72, boxSize: 9, attraction: 0, gravity: 0 };
    const warmer = { ...base, temperatureSetpoint: 400, temperature: 400, boxSize: 12 };
    expect(pure.compareTrials(base, warmer).fair).toBe(false); // by hand: two variables moved
    expect(pure.compareTrials({ ...base, holdPressure: true }, { ...warmer, holdPressure: true })).toMatchObject({ fair: true, changed: ['temperature'] });
    // The controller: samples are weighted by the simulated time they cover, so the spiky first sample after Run barely
    // moves the target, a low frame rate (many short samples) still reaches it, and each move is capped.
    const holdState = { target: 0, window: 0, weighted: 0, smoothed: 0 };
    expect(pure.holdPressureStep(holdState, 3.6, 0.02, 9)).toEqual({ targetReady: false, nextBox: null }); // the spike
    expect(holdState.window).toBeCloseTo(0.02, 5);
    for (let i = 0; i < 5; i += 1) pure.holdPressureStep(holdState, 1.0, 0.4, 9);
    expect(holdState.target).toBeCloseTo((3.6 * 0.02 + 1.0 * 2.0) / 2.02, 5); // 1.026: the spike weighs 1 percent
    const slowFrames = { target: 0, window: 0, weighted: 0, smoothed: 0 };
    let ready = false;
    for (let i = 0; i < 60 && !ready; i += 1) ready = pure.holdPressureStep(slowFrames, 1.0, 0.05, 9).targetReady; // 50 ms samples at a crawl
    expect(ready).toBe(true);
    expect(slowFrames.target).toBeCloseTo(1.0, 5);
    holdState.smoothed = 2.2; // gauge reads double: the gas warmed
    const grow = pure.holdPressureStep(holdState, 2.2, 0.4, 9);
    expect(grow.nextBox).toBeGreaterThan(9);
    expect(grow.nextBox).toBeLessThanOrEqual(9.3);
    holdState.smoothed = 0.55;
    expect(pure.holdPressureStep(holdState, 0.55, 0.4, 9).nextBox).toBeLessThan(9);
    expect(pure.holdPressureStep({ target: 1, samples: [], smoothed: 1 }, 1, 0.4, 9).nextBox).toBeNull(); // at balance the walls rest
    const hold = buttonByText(host, '⇔ Hold pressure off');
    expect(hold).toBeDefined();
    const slider = host.querySelector('input[aria-label="Container edge length and volume"]');
    expect(slider.getAttribute('aria-disabled')).toBeNull();
    await act(async () => { hold.click(); await settle(); });
    expect(buttonByText(host, '⇔ Hold pressure on').getAttribute('aria-pressed')).toBe('true');
    expect(persisted().holdPressure).toBe(true);
    expect(slider.getAttribute('aria-disabled')).toBe('true');
    expect(host.textContent).toContain('Sampling the gauge');
    await act(async () => { setValue(slider, '15'); await new Promise((resolve) => setTimeout(resolve, 320)); });
    expect(slider.value).toBe('11'); // the slider is off duty while the hold owns the container
    expect(persisted().boxSize).toBeUndefined();
    const charles = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Warm at Fixed Pressure'));
    await act(async () => { charles.click(); await settle(); });
    expect(persisted()).toMatchObject({ holdPressure: true, thermostat: true, boxSize: 9, temperature: 200 });
    await act(async () => { buttonByText(host, '⇔ Hold pressure on').click(); await settle(); });
    expect(persisted().holdPressure).toBe(false);
    expect(slider.getAttribute('aria-disabled')).toBeNull();
  });

  it('overlays the Maxwell-Boltzmann prediction and describes the chamber on demand', async () => {
    const pure = window.__alloParticleLabPure;
    // The prediction integrates to one over a wide enough range and peaks at the most probable speed sqrt(2a).
    const bins = pure.maxwellBoltzmannBins(300, 1, 40, 10);
    expect(Math.abs(bins.reduce((sum, value) => sum + value, 0) - 1)).toBeLessThan(0.01);
    const a = 300 / 120, peakBin = bins.indexOf(Math.max(...bins));
    expect(Math.abs((peakBin + 0.5) * (10 / 40) - Math.sqrt(2 * a))).toBeLessThan(0.3);
    expect(pure.histogramDistance([0.5, 0.5], [0.5, 0.5])).toBe(0);
    expect(pure.histogramDistance([1, 0], [0, 1])).toBe(1);
    // The heat bath scales toward the setpoint and stays still when it is reached.
    expect(pure.thermostatScale(150, 300, 0.02)).toBeGreaterThan(1);
    expect(pure.thermostatScale(600, 300, 0.02)).toBeLessThan(1);
    expect(pure.thermostatScale(300, 300, 0.02)).toBe(1);
    // A wall moving inward at 1 unit per second returns a 3 unit per second particle at 5: work done on the gas.
    const settings = { preset: 'gas', boxSize: 12, particleDiameter: 0.58, attraction: 0, gravity: 0, massRatioB: 1, membrane: false, permeability: 0, membraneSelectivity: 'both', wallVelocity: -1 };
    const squeezed = [{ x: 5.7, y: 0, z: 0, vx: 3, vy: 0, vz: 0, type: 0, freeFlights: [] }];
    pure.advanceParticles(squeezed, settings, 1 / 60);
    expect(squeezed[0].vx).toBeCloseTo(-5, 5);
    // The chart carries the prediction and its agreement label; the description reads the same numbers aloud.
    const chart = host.querySelector('svg[aria-label^="Histogram of current particle speeds"]');
    expect(chart.getAttribute('aria-label')).toContain('Maxwell-Boltzmann');
    expect(chart.querySelector('path[stroke-dasharray]')).not.toBeNull();
    const describe = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Describe the chamber'));
    await act(async () => { describe.click(); await settle(); });
    const description = host.querySelector('#particle-chamber-description');
    expect(description).not.toBeNull();
    expect(description.textContent).toMatch(/Gas chamber with \d+ particles in \d+ cubic model units, paused/);
    expect(description.textContent).toContain('Pressure');
    expect(description.textContent).toContain('The speed histogram: few particles: the histogram is noisy'); // no physics under jsdom, so the histogram is empty
  });


  it('seeds the chamber at the setpoint and models the pump, the divider and kinetic energy (pure functions)', () => {
    const pure = window.__alloParticleLabPure;
    expect(pure).toBeDefined();
    // A chamber seeded at 300 K read 239 K until the slider was touched: the seed drew speeds from a uniform band.
    for (const [count, preset, temperature, massB] of [[64, 'gas', 300, 1], [48, 'liquid', 120, 1], [80, 'diffusion', 500, 2.5], [96, 'solid', 40, 1]]) {
      const seeded = pure.makeParticles(count, preset, temperature, 2048, massB);
      expect(Math.abs(pure.metrics(seeded, 0, 11, 1, massB).temperature - temperature)).toBeLessThanOrEqual(1);
    }
    // The seed respects the container: in a 7-unit box (and the classic 11) every particle starts inside the walls,
    // so the first step counts no spurious wall hits. It used to scatter gas across a fixed 10-unit cube.
    for (const box of [7, 11, 18]) {
      for (const preset of ['gas', 'liquid', 'solid', 'diffusion', 'osmosis']) {
        const inside = pure.makeParticles(120, preset, 300, 9, 1, box);
        const limit = box / 2 - 0.29;
        expect(inside.every((p) => Math.abs(p.x) <= limit && Math.abs(p.y) <= limit && Math.abs(p.z) <= limit), preset + ' in box ' + box).toBe(true);
        pure.advanceParticles(inside, { preset, boxSize: box, particleDiameter: 0.58, attraction: 0, gravity: 0, massRatioB: 1, membrane: false, permeability: 0, membraneSelectivity: 'both' }, 1 / 120);
        expect(inside.reduce((sum, p) => sum + (p.wallHits || 0), 0), preset + ' first-step wall hits in box ' + box).toBe(0); // nothing starts outside the walls
      }
    }
    const [leftA, rightB] = [pure.makeParticles(80, 'diffusion', 300, 9, 1, 9).filter((p) => !p.type), pure.makeParticles(80, 'diffusion', 300, 9, 1, 9).filter((p) => p.type)];
    expect(leftA.every((p) => p.x < 0) && rightB.every((p) => p.x > 0)).toBe(true); // A left of the divider, B right
    const settings = { preset: 'gas', boxSize: 12, particleDiameter: 0.58, attraction: 0, gravity: 0, massRatioB: 1, membrane: false, permeability: 0, membraneSelectivity: 'both' };
    // The pump: A enters through the left wall heading inward, B through the right, both settling until a wall hit.
    const pumpedA = pure.makePumpedParticles(8, settings, 300, 5, 0), pumpedB = pure.makePumpedParticles(8, settings, 300, 5, 1);
    expect(pumpedA.every((p) => p.x < -5 && p.vx > 0 && p.settling && p.type === 0)).toBe(true);
    expect(pumpedB.every((p) => p.x > 5 && p.vx < 0 && p.settling && p.type === 1)).toBe(true);
    expect(Math.abs(pure.metrics(pumpedA, 0, 12, 1, 1).temperature - 300)).toBeLessThan(120); // drawn for the chamber temperature
    // The first wall hit ends settling and adds no impulse; the next one counts.
    const settling = [{ x: 5.7, y: 0, z: 0, vx: 3, vy: 0, vz: 0, type: 0, settling: true, freeFlights: [] }];
    expect(pure.advanceParticles(settling, settings, 1 / 60).impulse).toBe(0);
    expect(settling[0].settling).toBe(false);
    settling[0].x = 5.7; settling[0].vx = 3;
    expect(pure.advanceParticles(settling, settings, 1 / 60).impulse).toBeGreaterThan(0);
    // A divider (a membrane at 0% permeability) reflects without transport events or selectivity samples.
    const divided = [{ x: -0.05, y: 0, z: 0, vx: 4, vy: 0, vz: 0, type: 0, freeFlights: [] }];
    const crossing = pure.advanceParticles(divided, { ...settings, preset: 'diffusion', membrane: true, permeability: 0 }, 1 / 60);
    expect(divided[0].x).toBeLessThan(0);
    expect(divided[0].vx).toBeLessThan(0);
    expect(crossing.membraneBlocked).toBe(0);
    expect(crossing.events).toEqual([]);
    // Kinetic energy: the mean of one half m v squared is T / 80 in these units when every mass is 1.
    const gas = pure.makeParticles(64, 'gas', 400, 7, 1);
    expect(Math.abs(pure.energyDistribution(gas, 1, 12).all.mean - 400 / 80)).toBeLessThan(0.05);
  });

  it('explains an unavailable pump instead of disabling it, and offers species B only for transport presets', async () => {
    const group = () => host.querySelector('[role="group"][aria-label="Pump and lid"]');
    expect(group()).not.toBeNull();
    expect(buttonByText(group(), '➕ Pump in 8 A')).toBeDefined();
    expect(buttonByText(group(), '➕ Pump in 8 B')).toBeUndefined(); // the gas preset has one species
    expect(buttonByText(group(), '↖ Release 8').getAttribute('aria-disabled')).toBeNull();
    const solid = Array.from(host.querySelectorAll('#particle-preset-row button')).find((button) => button.textContent.includes('Solid'));
    await act(async () => { solid.click(); await settle(); });
    const pump = buttonByText(group(), '➕ Pump in 8 A');
    expect(pump.getAttribute('aria-disabled')).toBe('true');
    expect(pump.disabled).toBe(false); // reachable, so the reason in its name can be read
    expect(pump.getAttribute('aria-label')).toContain('unavailable in the solid preset');
    const diffusion = Array.from(host.querySelectorAll('#particle-preset-row button')).find((button) => button.textContent.includes('Diffusion'));
    await act(async () => { diffusion.click(); await settle(); });
    expect(buttonByText(group(), '➕ Pump in 8 B')).toBeDefined();
  });

  it('starts the diffusion preset behind a divider and names the control accordingly', async () => {
    const diffusion = Array.from(host.querySelectorAll('#particle-preset-row button')).find((button) => button.textContent.includes('Diffusion'));
    await act(async () => { diffusion.click(); await settle(); });
    const advanced = host.querySelector('#particle-advanced-conditions');
    expect(advanced.textContent).toContain('Divider in place');
    expect(host.querySelector('input[aria-label="Membrane permeability"]').value).toBe('0');
    const remove = buttonByText(advanced, 'Remove divider');
    expect(remove).toBeDefined();
    await act(async () => { remove.click(); await settle(); });
    expect(buttonByText(advanced, 'Insert divider')).toBeDefined();
    expect(advanced.textContent).toContain('Open chamber');
  });

  it('offers a flat 2D view that persists and yields to a 3D camera shot', async () => {
    const cameraGroup = host.querySelector('[role="group"][aria-label="Camera views"]');
    const flat = buttonByText(cameraGroup, 'Flat 2D');
    expect(flat.getAttribute('aria-pressed')).toBe('false');
    await act(async () => { flat.click(); await settle(); });
    expect(flat.getAttribute('aria-pressed')).toBe('true');
    expect(persisted().viewMode).toBe('flat');
    expect(host.textContent).toContain('View Flat 2D');
    await act(async () => { buttonByText(cameraGroup, 'Top').click(); await settle(); });
    expect(flat.getAttribute('aria-pressed')).toBe('false');
    expect(persisted().viewMode).toBe('orbit');
  });

  it('renders a kinetic energy histogram next to the speed chart, paired by species for transport presets', async () => {
    expect(host.querySelector('svg[aria-label^="Histogram of kinetic energy per particle"]')).not.toBeNull();
    const diffusion = Array.from(host.querySelectorAll('#particle-preset-row button')).find((button) => button.textContent.includes('Diffusion'));
    await act(async () => { diffusion.click(); await settle(); });
    expect(host.querySelector('svg[aria-label^="Paired histogram of kinetic energy per particle"]')).not.toBeNull();
    expect(host.textContent).toContain('share one mean kinetic energy');
  });

  it('falls back to the flat 2D chamber when the engine cannot load, and Retry asks the loader again', async () => {
    // Under jsdom the shared loader never settles; here it rejects, which is what a school network filter produces.
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
    let attempts = 0;
    window.StemLab.ensureThree = () => { attempts += 1; return Promise.reject(new Error('blocked')); };
    const Component = () => {
      const [toolData, setToolData] = React.useState({ particleLab3d: {} });
      const ctx = makeCtx({ toolData, setToolData });
      return config.render(ctx);
    };
    const localHost = document.createElement('div');
    document.body.appendChild(localHost);
    const localRoot = ReactDOMClient.createRoot(localHost);
    try {
      await act(async () => { localRoot.render(React.createElement(Component)); await settle(); });
      // Attribute selectors, not #id: jsdom resolves #id through the document's FIRST element with that id, which
      // belongs to the suite's own mounted instance, so a scoped #particle-stage lookup on this second mount is null.
      const notice = localHost.querySelector('[id="particle-fallback-notice"]');
      expect(notice).not.toBeNull();
      expect(notice.getAttribute('role')).toBe('alert');
      expect(notice.textContent).toContain('flat 2D chamber');
      expect(localHost.querySelector('[id="particle-stage-overlay"]')).toBeNull(); // no dead overlay over a live chamber
      expect(localHost.querySelector('section[id="particle-stage"]').getAttribute('aria-busy')).toBe('false');
      const canvas = localHost.querySelector('canvas[role="application"]');
      expect(canvas.getAttribute('tabindex')).toBe('0');
      expect(canvas.getAttribute('aria-roledescription')).toBe('Interactive flat 2D particle chamber');
      expect(attempts).toBe(1);
      const retry = Array.from(notice.querySelectorAll('button')).find((button) => button.textContent === 'Retry');
      await act(async () => { retry.click(); await settle(); });
      expect(attempts).toBe(2); // the loader is asked again; it rejects again here, so the fallback stays up
      expect(localHost.querySelector('[id="particle-fallback-notice"]')).not.toBeNull();
    } finally {
      act(() => localRoot.unmount());
      localHost.remove();
      resetStemLab();
    }
  });

  it('keeps audio cues off and says so when the browser has no AudioContext', async () => {
    // jsdom has no Web Audio; a real browser starts the context from this gesture. Either way the control must
    // never latch on without sound, and the reason must be announced.
    const announcements = [];
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
    const Component = () => {
      const [toolData, setToolData] = React.useState({ particleLab3d: {} });
      const ctx = makeCtx({ toolData, setToolData, announceToSR: (message) => announcements.push(message) });
      return config.render(ctx);
    };
    const localHost = document.createElement('div');
    document.body.appendChild(localHost);
    const localRoot = ReactDOMClient.createRoot(localHost);
    try {
      await act(async () => { localRoot.render(React.createElement(Component)); await settle(); });
      const audio = Array.from(localHost.querySelectorAll('button')).find((button) => button.textContent.includes('Audio cues'));
      expect(audio.getAttribute('aria-pressed')).toBe('false');
      await act(async () => { audio.click(); await settle(); });
      expect(audio.getAttribute('aria-pressed')).toBe('false');
      expect(announcements.some((message) => /Audio cues are unavailable/.test(message))).toBe(true);
    } finally {
      act(() => localRoot.unmount());
      localHost.remove();
      resetStemLab();
    }
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

  it('lists common student ideas, loads the matching protocol on request, and withholds the model answer until there is evidence', async () => {
    const ideas = window.__alloParticleLabPure.commonIdeas;
    expect(ideas.length).toBeGreaterThanOrEqual(7);
    const card = host.querySelector('#particle-common-ideas');
    expect(card).not.toBeNull();
    expect(card.open).toBe(false);
    expect(card.querySelectorAll('li').length).toBe(ideas.length);
    for (const idea of ideas) {
      expect(card.textContent).toContain(idea.idea);
      // Every idea points at an existing protocol, and the answer is never in the DOM before the chamber has run.
      expect(Array.from(host.querySelectorAll('button')).some((button) => button.textContent.includes(idea.protocol === 'thermal' ? 'Heat at Fixed Volume' : idea.protocol === 'boyle' ? 'Compression' : idea.protocol === 'avogadro' ? 'Add Particles' : 'Diffusion Race'))).toBe(true);
      expect(host.textContent).not.toContain(idea.shows);
    }
    const cold = ideas.find((idea) => idea.id === 'stop');
    const button = host.querySelector('button[aria-label="Test this idea: ' + cold.idea + '"]');
    expect(button).not.toBeNull();
    await act(async () => { button.click(); await settle(); });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toContain('Testing now');
    expect(card.open).toBe(true);
    expect(persisted().activeIdea).toBe('stop');
    expect(persisted().activeProtocol).toBe('thermal');
    expect(persisted().temperature).toBe(40);
    expect(Array.from(host.querySelectorAll('output')).some((node) => node.textContent === '40 K')).toBe(true);
    const verdict = host.querySelector('#particle-idea-verdict');
    expect(verdict.textContent).toMatch(/Write your prediction, then run the chamber/);
    expect(host.textContent).not.toContain(cold.shows);
    // The Predict step names the idea and the readout to watch, so the prediction is about something specific.
    expect(host.textContent).toContain('You are testing the idea: \u201C' + cold.idea + '\u201D');
    expect(host.textContent).toContain('predict what ' + cold.watch + ' will do');
    // Choosing a protocol by hand drops the idea: the card must not claim a test that is no longer set up.
    const compression = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Compression') && b.getAttribute('aria-pressed') !== null);
    await act(async () => { compression.click(); await settle(); });
    expect(persisted().activeIdea).toBe('');
    expect(host.querySelector('#particle-idea-verdict')).toBeNull();
    expect(host.querySelector('button[aria-label="Test this idea: ' + cold.idea + '"]').getAttribute('aria-pressed')).toBe('false');
  });

  it('reveals what the model shows only after the chamber has produced evidence, and carries the idea into the lab report', async () => {
    const heavy = window.__alloParticleLabPure.commonIdeas.find((idea) => idea.id === 'heavy');
    resetStemLab();
    const announcements = [];
    const config = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
    // jsdom has no 2D canvas, so the flat fallback (the only chamber that can run here) would bail out before its
    // first physics step. A no-op drawing context lets it run and publish real samples, which is the evidence gate.
    window.StemLab.ensureThree = () => Promise.reject(new Error('blocked'));
    const noop = new Proxy(function () {}, { get: (target, key) => (key === Symbol.toPrimitive ? () => 0 : (key === 'width' ? 10 : noop)), apply: () => noop, set: () => true });
    const realGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind) { return kind === '2d' ? noop : null; };
    const Component = () => {
      const [toolData, setToolData] = React.useState({ particleLab3d: {} });
      const ctx = makeCtx({ toolData, setToolData, announceToSR: (message) => announcements.push(message) });
      return config.render(ctx);
    };
    const localHost = document.createElement('div');
    document.body.appendChild(localHost);
    const localRoot = ReactDOMClient.createRoot(localHost);
    try {
      await act(async () => { localRoot.render(React.createElement(Component)); await settle(); });
      expect(localHost.textContent).not.toContain(heavy.shows);
      const button = localHost.querySelector('button[aria-label="Test this idea: ' + heavy.idea + '"]');
      await act(async () => { button.click(); await settle(); });
      expect(announcements.some((message) => message.includes('Testing the idea: ' + heavy.idea) && message.includes('Diffusion Race'))).toBe(true);
      expect(localHost.querySelector('[id="particle-idea-verdict"]').textContent).toMatch(/run the chamber/);
      expect(localHost.textContent).not.toContain(heavy.shows);
      const run = Array.from(localHost.querySelectorAll('button')).find((b) => b.textContent === '▶ Run');
      expect(run, 'run button').toBeDefined();
      await act(async () => { run.click(); await new Promise((resolve) => setTimeout(resolve, 900)); });
      const verdict = localHost.querySelector('[id="particle-idea-verdict"]');
      expect(verdict.getAttribute('role')).toBe('note');
      expect(verdict.textContent).toContain('What the model shows: ' + heavy.shows);
      // The mass ratio the idea needs was applied, so the two species really differ.
      const mass = localHost.querySelector('input[type="range"][aria-label="Particle B mass relative to particle A"]');
      expect(mass, 'mass ratio slider (transport presets only)').not.toBeNull();
      expect(Number(mass.value)).toBe(2.5);
    } finally {
      HTMLCanvasElement.prototype.getContext = realGetContext;
      act(() => localRoot.unmount());
      localHost.remove();
      resetStemLab();
    }
  });

});
