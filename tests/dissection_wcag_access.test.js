import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const fixtures = [];
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
let osReduced, mediaListeners, motionQuery, originalMatchMedia, originalScroll;

function learnerWork(state) {
  return structuredClone(Object.fromEntries(['exploredOrgans', 'verifiedIdentifications', 'organNotes', 'organConfidence',
    'procedureByLayer', 'annotations', 'quizScore', 'quizTotal'].map(key => [key, state[key]])));
}

async function mountLab(patch = {}) {
  const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), awardXP = vi.fn();
  let state, update;
  const initial = {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    workspaceMode: 'advanced', techniquePanelOpen: true, toolbarToolsOpen: true, toolbarViewOpen: true,
    selectedOrgan: 'nictitating', hoveredOrgan: null, visualRealism: 'accessible', parallaxDepth: false,
    reducedMotion: false, soundEnabled: false, activeInstrument: 'probe', revealedLayers: { skin: true },
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: {},
    organNotes: { 'frog|nictitating': 'Transparent membrane observed.' }, organConfidence: { 'frog|nictitating': 2 },
    procedureByLayer: { skin: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 50 }] } },
    annotations: [{ type: 'dot', x: .4, y: .4 }], quizScore: 1, quizTotal: 2,
    ...patch,
  };
  function Component() {
    const [toolData, setToolData] = React.useState({ dissection: initial });
    state = toolData.dissection; update = setToolData;
    return config.render(makeCtx({ toolData, setToolData, awardXP }));
  }
  const fixture = {
    host, awardXP, get state() { return state; },
    async click(node) {
      expect(node).not.toBeNull();
      await act(async () => { node.click(); });
      await act(async () => { await settle(); });
    },
    async key(node, key = 'Escape', options = {}) {
      expect(node).not.toBeNull(); node.focus();
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
      await act(async () => { node.dispatchEvent(event); });
      await act(async () => { await settle(); });
      return event;
    },
    async patch(next) {
      await act(async () => { update(previous => ({ ...previous, dissection: { ...previous.dissection, ...next } })); await settle(); });
    },
    async close() {
      await act(async () => { root.unmount(); await settle(); }); host.remove();
    },
  };
  fixtures.push(fixture);
  await act(async () => { root.render(React.createElement(Component)); await settle(); });
  return fixture;
}

beforeEach(() => {
  localStorage.clear(); resetStemLab(); osReduced = false; mediaListeners = new Set();
  motionQuery = {
    get matches() { return osReduced; }, media: '(prefers-reduced-motion: reduce)',
    addEventListener: (type, listener) => { if (type === 'change') mediaListeners.add(listener); },
    removeEventListener: (type, listener) => { if (type === 'change') mediaListeners.delete(listener); },
    addListener: listener => mediaListeners.add(listener), removeListener: listener => mediaListeners.delete(listener),
  };
  originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  originalScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true,
    value: vi.fn(query => query === motionQuery.media ? motionQuery : {
      matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    }) });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});

afterEach(async () => {
  for (const fixture of fixtures.splice(0).reverse()) await fixture.close();
  await new Promise(resolve => setTimeout(resolve, 150));
  localStorage.clear(); document.getElementById('allo-live-dissection')?.remove();
  window._dissectionKeyHandler = null; vi.restoreAllMocks();
  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia); else delete window.matchMedia;
  if (originalScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScroll); else delete Element.prototype.scrollIntoView;
});

describe('dissection keyboard focus and recovery actions', () => {
  it('returns Escape from the removed structure card to the matching directory result without altering learner work', async () => {
    const f = await mountLab(), before = learnerWork(f.state);
    const control = f.host.querySelector('[data-dissection-selection] button[aria-label="Back to structure directory"]');
    expect(control.disabled).toBe(false);
    await f.key(control);
    expect(f.host.querySelector('[data-dissection-selection]')).toBeNull();
    expect(f.state.selectedOrgan).toBeNull();
    expect(document.activeElement).toBe(f.host.querySelector('#diss-organ-nictitating'));
    expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('keeps canvas focus when Escape closes a selection', async () => {
    const f = await mountLab(), canvas = f.host.querySelector('[data-diss-canvas]'), before = learnerWork(f.state);
    await f.key(canvas);
    expect(f.state.selectedOrgan).toBeNull(); expect(document.activeElement).toBe(canvas);
    expect(learnerWork(f.state)).toEqual(before);
  });

  it('keeps focus on a persistent outside control when Escape closes a selection', async () => {
    const f = await mountLab(), control = f.host.querySelector('button[aria-label="Advanced workspace"]');
    await f.key(control);
    expect(f.state.selectedOrgan).toBeNull(); expect(document.activeElement).toBe(control);
  });

  it('does not steal Escape from a note field or modified/composing keyboard input', async () => {
    const f = await mountLab(), before = learnerWork(f.state), note = f.host.querySelector('[data-dissection-selection] textarea');
    const fieldEvent = await f.key(note);
    expect(fieldEvent.defaultPrevented).toBe(false); expect(document.activeElement).toBe(note);
    expect(f.state.selectedOrgan).toBe('nictitating');
    const control = f.host.querySelector('[data-dissection-selection] button[aria-label="Back to structure directory"]');
    for (const modifiers of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }]) {
      const event = await f.key(control, 'Escape', modifiers);
      expect(event.defaultPrevented).toBe(false); expect(f.state.selectedOrgan).toBe('nictitating');
      expect(document.activeElement).toBe(control);
    }
    expect(learnerWork(f.state)).toEqual(before);
  });

  it('cancels reset confirmation before closing the selected structure', async () => {
    const f = await mountLab({ resetConfirmPending: true }), before = learnerWork(f.state);
    await f.key(f.host.querySelector('#diss-reset-confirm'));
    expect(f.state.resetConfirmPending).toBe(false); expect(f.state.selectedOrgan).toBe('nictitating');
    expect(document.activeElement).toBe(f.host.querySelector('#diss-reset-specimen'));
    expect(learnerWork(f.state)).toEqual(before);
  });

  it('exits annotation placement before closing the selected structure and keeps saved marks', async () => {
    const f = await mountLab({ annotateMode: true }), before = learnerWork(f.state), canvas = f.host.querySelector('[data-diss-canvas]');
    await f.key(canvas);
    expect(f.state.annotateMode).toBe(false); expect(f.state.selectedOrgan).toBe('nictitating');
    expect(document.activeElement).toBe(canvas); expect(learnerWork(f.state)).toEqual(before);
  });

  it('announces hidden-anatomy recovery as an enabled action without granting inspection credit', async () => {
    const f = await mountLab({ selectedOrgan: null, exploredOrgans: {} }), before = learnerWork(f.state);
    const control = f.host.querySelector('#diss-organ-ventral_skin');
    expect(control).not.toBeNull(); expect(control.disabled).toBe(false);
    expect(control.getAttribute('aria-disabled')).not.toBe('true');
    expect(control.dataset.directoryAction).toBe('recover');
    expect(control.getAttribute('aria-label')).toContain('Show recovery guidance');
    expect(control.getAttribute('aria-describedby').split(' ').every(id => f.host.querySelector('#' + id))).toBe(true);
    control.focus(); await f.click(control);
    expect(document.activeElement).toBe(control); expect(f.state.selectedOrgan).toBeNull();
    expect(f.state.procedureFeedback.message).toMatch(/occluded|not yet exposed/);
    expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('references layer review only once its panel exists and focuses that review without changing learner work', async () => {
    const f = await mountLab({ selectedOrgan: null, procedureByLayer: {}, exploredOrgans: {} });
    const before = learnerWork(f.state);
    const reviewButton = () => [...f.host.querySelectorAll('button')].find(button => button.textContent === 'Review layer');
    const control = reviewButton();
    expect(control).toBeDefined(); expect(control.disabled).toBe(false);
    expect(f.host.querySelector('#diss-layer-review')).toBeNull();
    expect(control.hasAttribute('aria-controls')).toBe(false);
    control.focus(); await f.click(control);
    const panel = f.host.querySelector('#diss-layer-review');
    const title = f.host.querySelector('#diss-layer-review-title');
    expect(panel).not.toBeNull(); expect(panel.contains(title)).toBe(true);
    expect(reviewButton().getAttribute('aria-controls')).toBe(panel.id);
    expect(document.activeElement).toBe(title);
    expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });
});

describe('dissection navigation honors effective reduced motion', () => {
  it.each([[false, false, 'smooth'], [true, false, 'auto'], [false, true, 'auto'], [true, true, 'auto']])(
    'uses %s app / %s OS preference for all three navigation paths', async (appReduced, systemReduced, behavior) => {
      osReduced = systemReduced;
      const f = await mountLab({ reducedMotion: appReduced }), before = learnerWork(f.state);
      const preference = () => f.host.querySelector('button[aria-label^="Toggle additional reduced motion"]');
      expect(preference().getAttribute('aria-pressed')).toBe(String(appReduced));
      const target = f.host.querySelector('#diss-structure-directory'), targetScroll = vi.spyOn(target, 'scrollIntoView');
      await f.click(f.host.querySelector('a[href="#diss-structure-directory"]'));
      expect(document.activeElement).toBe(target); expect(targetScroll).toHaveBeenCalledWith({ block: 'center', behavior });

      const scenario = f.host.querySelector('#diss-scenario-select'), scenarioScroll = vi.spyOn(scenario, 'scrollIntoView');
      await f.click(f.host.querySelector('button[aria-controls="diss-scenario-select"]'));
      expect(document.activeElement).toBe(scenario); expect(scenarioScroll).toHaveBeenCalledWith({ block: 'center', behavior });

      const control = f.host.querySelector('[data-dissection-selection] button[aria-label="Back to structure directory"]');
      await f.click(control);
      const result = f.host.querySelector('#diss-organ-nictitating');
      expect(document.activeElement).toBe(result);
      expect(Element.prototype.scrollIntoView.mock.calls.some((args, index) => args[0]?.block === 'nearest' &&
        args[0]?.behavior === behavior && Element.prototype.scrollIntoView.mock.contexts[index] === result)).toBe(true);
      expect(preference().getAttribute('aria-pressed')).toBe(String(appReduced));
      expect(f.state.reducedMotion).toBe(appReduced); expect(learnerWork(f.state)).toEqual(before);
    });

  it('reacts to an OS preference change while retaining the user’s independent app toggle', async () => {
    const f = await mountLab({ reducedMotion: false });
    expect(mediaListeners.size).toBeGreaterThan(0);
    await act(async () => { osReduced = true; for (const listener of [...mediaListeners]) listener({ matches: true, media: motionQuery.media }); await settle(); });
    const target = f.host.querySelector('#diss-structure-directory'), scroll = vi.spyOn(target, 'scrollIntoView');
    await f.click(f.host.querySelector('a[href="#diss-structure-directory"]'));
    expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect(f.state.reducedMotion).toBe(false);
    expect(f.host.querySelector('button[aria-label^="Toggle additional reduced motion"]').getAttribute('aria-pressed')).toBe('false');
  });
});
