import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act, SOURCE = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN2UAAAAASUVORK5CYII=';
const mounted = [];
let engines, downloads, mountReady, supported;
const button = (host, label) => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === label);
const captureButton = t => t.host.querySelector('[data-dive-capture]');
const captureStatus = t => t.host.querySelector('[data-dive-capture-status]');
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function emit(ctl, patch) { await act(async () => ctl.emit(patch)); }

beforeEach(() => {
  resetStemLab(); engines = []; downloads = []; mountReady = true; supported = true;
  window.__RR_TEST_EXPORTS__ = {}; window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    downloads.push({ href: this.href, filename: this.download, attached: document.body.contains(this), hidden: this.hidden });
  });
  window.Reef3DExplore = { version: '1.0.0', mount(canvas, options) {
    let state = { ready: mountReady, paused: false, view: 'third', vision: 'natural', quality: 'low', navigation: null,
      diver: { x: 2, y: -8, z: 4, depthM: 8, headingDeg: 90 }, focused: null, nearby: [], moments: [] };
    const ctl = { canvas, options, dispose: vi.fn(), resize: vi.fn(), setInput: vi.fn(), captureImage: vi.fn(() => PNG),
      lookCamera: vi.fn(), zoomCamera: vi.fn(), resetCamera: vi.fn(), lookAtFocused: vi.fn(),
      getState: () => state, emit(patch) { state = { ...state, ...patch }; options.onState(state); },
      setView: vi.fn(view => ctl.emit({ view })), setPaused: vi.fn(paused => ctl.emit({ paused })),
      setVision: vi.fn(vision => ctl.emit({ vision })),
      focus: vi.fn(), focusPrevious: vi.fn(), focusNext: vi.fn(), swimTo: vi.fn(), cancelSwim: vi.fn(), clearFocus: vi.fn() };
    if (!supported) delete ctl.captureImage;
    engines.push(ctl); options.onState(state); return ctl;
  } };
  loadTool(SOURCE, 'coralReef');
});

afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await act(async () => t.root.unmount()); t.host.remove(); }
  for (const name of ['Reef3DExplore', 'Reef3DSpecies', 'THREE', '__RR_TEST_EXPORTS__']) delete window[name];
  vi.restoreAllMocks();
});
async function mountTool() {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  let data;
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: { section: 'explore', speciesLog: { clownfish: { site: 'healthy' } }, speciesFieldNotes: { clownfish: 'Keep this note' } } });
    data = toolData; return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key });
  }
  const t = { host, root, get data() { return data; } }; mounted.push(t);
  await act(async () => root.render(React.createElement(Shell))); return t;
}
async function ready() { const t = await mountTool(); await click(button(t.host, 'Start the dive')); return Object.assign(t, { ctl: engines[0] }); }

describe('reef scene PNG download', () => {
  it('downloads a scene-only PNG through a native focused button without changing dive state or learner data', async () => {
    const t = await ready();
    await emit(t.ctl, { paused: true, navigation: { uid: 'far-organism' }, focused: { uid: 'far-organism', speciesId: 'clownfish', distanceM: 25, bearingDeg: 30, riseM: 0 } });
    const save = captureButton(t), status = captureStatus(t), before = JSON.stringify(t.data), state = JSON.stringify(t.ctl.getState());
    expect(t.host.querySelectorAll('[data-dive-capture-controls]')).toHaveLength(1);
    const mutationMethods = ['setPaused', 'setInput', 'setView', 'setVision', 'focus', 'clearFocus', 'swimTo', 'cancelSwim', 'lookAtFocused', 'lookCamera', 'zoomCamera', 'resetCamera'];
    const counts = Object.fromEntries(mutationMethods.map(method => [method, t.ctl[method].mock.calls.length]));
    expect(save.tagName).toBe('BUTTON'); expect(save.type).toBe('button'); expect(save.textContent).toBe('Save reef image');
    expect(document.getElementById(save.getAttribute('aria-describedby')).textContent).toBe('Download a PNG of the current 3D view, including its angle and lighting. The image contains the reef scene only.');
    expect(status.dataset.diveCaptureStatus).toBe('idle'); expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite'); expect(status.getAttribute('aria-atomic')).toBe('true');
    await click(save);
    expect(t.host.querySelectorAll('[data-dive-capture-controls]')).toHaveLength(1);
    expect(t.ctl.captureImage).toHaveBeenCalledTimes(1);
    expect(downloads).toEqual([{ href: PNG, filename: 'coral-reef-view.png', attached: true, hidden: true }]);
    expect(document.querySelector('a[download]')).toBeNull(); expect(document.activeElement).toBe(save);
    expect(captureStatus(t)).toBe(status); expect(status.dataset.diveCaptureStatus).toBe('saved'); expect(status.textContent).toBe('PNG download started.');
    expect(JSON.stringify(t.data)).toBe(before); expect(JSON.stringify(t.ctl.getState())).toBe(state);
    for (const method of mutationMethods) expect(t.ctl[method], method).toHaveBeenCalledTimes(counts[method]);
    expect(t.ctl.dispose).not.toHaveBeenCalled(); expect(engines).toHaveLength(1);
  });

  it('does not offer capture before readiness or on a companion without image capture', async () => {
    mountReady = false; const t = await mountTool(); expect(captureButton(t)).toBeNull();
    await click(button(t.host, 'Start the dive')); expect(captureButton(t)).toBeNull();
    await emit(engines[0], { ready: true }); expect(captureButton(t)).toBeTruthy();
    supported = false; await click(t.host.querySelector('[data-site="heatwave"]'));
    expect(t.host.querySelector('[data-dive-capture-controls]')).toBeNull(); expect(downloads).toHaveLength(0);
  });

  it('refreshes repeated success and failure announcements while preserving live-region identity and button focus', async () => {
    const t = await ready(), save = captureButton(t), status = captureStatus(t);
    let previousMessage = status.querySelector('span');
    for (const result of ['saved', 'saved', 'error', 'error']) {
      if (result === 'error') t.ctl.captureImage.mockReturnValueOnce(null);
      await click(save);
      const message = status.querySelector('span');
      expect(captureStatus(t)).toBe(status);
      expect(status.dataset.diveCaptureStatus).toBe(result);
      expect(status.getAttribute('role')).toBe('status');
      expect(status.getAttribute('aria-live')).toBe('polite');
      expect(status.getAttribute('aria-atomic')).toBe('true');
      expect(message).toBeTruthy(); expect(message).not.toBe(previousMessage);
      expect(previousMessage.isConnected).toBe(false);
      expect(message.textContent).toBe(result === 'saved' ? 'PNG download started.' : 'The image could not be saved. Try again; you can keep exploring.');
      expect(document.activeElement).toBe(save);
      previousMessage = message;
    }
    expect(t.ctl.captureImage).toHaveBeenCalledTimes(4); expect(downloads).toHaveLength(2);
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('keeps capture labels and live feedback axe-clean after success and retryable failure', async () => {
    const t = await ready(), save = captureButton(t), status = captureStatus(t);
    for (const result of ['saved', 'error']) {
      if (result === 'error') t.ctl.captureImage.mockReturnValueOnce(null);
      await click(save);
      expect(captureStatus(t)).toBe(status);
      expect(status.dataset.diveCaptureStatus).toBe(result);
      const controls = t.host.querySelector('[data-dive-capture-controls]');
      const describedBy = save.getAttribute('aria-describedby');
      expect(controls.querySelector('[id="' + describedBy + '"]').textContent).toContain('Download a PNG');
      const audit = await runIsolatedAxe(controls.outerHTML);
      expect(audit.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).join(' | '))).toEqual([]);
    }
  }, 60000);

  it.each([
    ['null image', null],
    ['empty PNG payload', 'data:image/png;base64,'],
    ['wrong image type', 'data:image/jpeg;base64,aGk='],
    ['invalid base64 payload', 'data:image/png;base64,not base64'],
    ['non-string result', { image: PNG }]
  ])('keeps the reef usable and permits retry after %s', async (_label, result) => {
    const t = await ready(), save = captureButton(t), before = JSON.stringify(t.data);
    t.ctl.captureImage.mockReturnValueOnce(result);
    await click(save);
    expect(downloads).toHaveLength(0); expect(document.querySelector('a[download]')).toBeNull(); expect(document.activeElement).toBe(save);
    expect(captureStatus(t).dataset.diveCaptureStatus).toBe('error'); expect(captureStatus(t).textContent).toBe('The image could not be saved. Try again; you can keep exploring.');
    expect(t.ctl.dispose).not.toHaveBeenCalled(); expect(t.host.contains(t.ctl.canvas)).toBe(true); expect(JSON.stringify(t.data)).toBe(before);
    await click(save); expect(downloads).toHaveLength(1); expect(captureStatus(t).dataset.diveCaptureStatus).toBe('saved');
  });

  it('contains a synchronous capture exception without disrupting the dive or blocking retry', async () => {
    const t = await ready(), save = captureButton(t);
    t.ctl.captureImage.mockImplementationOnce(() => { throw new DOMException('Tainted canvas', 'SecurityError'); });
    await click(save); expect(captureStatus(t).dataset.diveCaptureStatus).toBe('error'); expect(downloads).toHaveLength(0);
    expect(t.ctl.dispose).not.toHaveBeenCalled(); expect(document.activeElement).toBe(save);
    await click(save); expect(downloads).toHaveLength(1); expect(captureStatus(t).dataset.diveCaptureStatus).toBe('saved');
  });

  it('removes the temporary anchor after a download handoff failure and keeps camera controls working', async () => {
    const t = await ready(), save = captureButton(t);
    HTMLAnchorElement.prototype.click.mockImplementationOnce(() => { throw new Error('Download blocked'); });
    await click(save); expect(captureStatus(t).dataset.diveCaptureStatus).toBe('error'); expect(document.querySelector('a[download]')).toBeNull();
    expect(t.ctl.dispose).not.toHaveBeenCalled(); expect(document.activeElement).toBe(save);
    await click(button(t.host, 'Mask view')); expect(t.ctl.getState().view).toBe('first');
    await click(save); expect(downloads).toHaveLength(1); expect(captureStatus(t).dataset.diveCaptureStatus).toBe('saved');
  });

  it('retains download feedback across telemetry and resets it for a new site or retry', async () => {
    const t = await ready(); await click(captureButton(t)); const status = captureStatus(t);
    await emit(t.ctl, { diver: { depthM: 10, headingDeg: 130 } }); expect(captureStatus(t)).toBe(status); expect(status.dataset.diveCaptureStatus).toBe('saved');
    await click(t.host.querySelector('[data-site="heatwave"]')); expect(engines).toHaveLength(2);
    expect(captureStatus(t).dataset.diveCaptureStatus).toBe('idle'); expect(captureStatus(t).textContent).toBe('');
    await click(captureButton(t)); await act(async () => engines[1].options.onError(new Error('Graphics context lost')));
    expect(captureButton(t)).toBeNull(); await click(button(t.host, 'Try the 3D view again'));
    expect(engines).toHaveLength(3); expect(captureStatus(t).dataset.diveCaptureStatus).toBe('idle'); expect(captureStatus(t).textContent).toBe('');
  });

  it('restores stage-title focus when a graphics error removes the focused capture button', async () => {
    const t = await ready(), save = captureButton(t), title = t.host.querySelector('#cr-dive-title');
    save.focus(); expect(document.activeElement).toBe(save);
    await act(async () => t.ctl.options.onError(new Error('Graphics context lost')));
    expect(save.isConnected).toBe(false); expect(document.activeElement).toBe(title); expect(t.ctl.dispose).toHaveBeenCalledTimes(1);
  });
});
