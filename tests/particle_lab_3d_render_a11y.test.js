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

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
    const Component = () => {
      const [toolData, setToolData] = React.useState({ particleLab3d: {} });
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
      expect(readyHost.querySelector('#particle-chamber-help')?.textContent).toContain('keyboard alternatives');
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
    expect(host.querySelector('[aria-label="gas particle simulation"]')?.parentElement?.textContent).toContain('measured');
    expect(host.querySelector('[aria-label="gas particle simulation"]')?.parentElement?.textContent).toContain('setpoint 300 K');
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
    expect(host.querySelector('[aria-label="gas particle simulation"]')?.parentElement?.textContent).toContain('View Top-down');
  });

  it('renders no persistent seven, eight, or nine pixel utility text', () => {
    expect(host.innerHTML).not.toMatch(/text-\[(?:7|8|9)px\]/);
  });
});
