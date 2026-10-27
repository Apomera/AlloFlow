import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
const settle = (ms = 25) => new Promise(resolve => setTimeout(resolve, ms));
let originalScroll;

const ignoredKeys = [
  { altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true },
  { isComposing: true }, { keyCode: 229 }, { defaultPrevented: true },
];
function learnerWork(state) {
  return structuredClone(Object.fromEntries(['selectedOrgan', 'exploredOrgans', 'verifiedIdentifications', 'organNotes',
    'organConfidence', 'procedureByLayer', 'annotations', 'visualEvidence', 'quizScore', 'quizTotal', 'dissInquiry']
    .map(key => [key, state[key]])));
}

async function mountLab(patch = {}) {
  const config = window.StemLab._registry.dissection || loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), awardXP = vi.fn(), pluginInstanceToken = {};
  let state, update;
  const initial = {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
    techniquePanelOpen: true, toolbarToolsOpen: true, selectedOrgan: 'nictitating', hoveredOrgan: null,
    revealedLayers: { skin: true }, visualRealism: 'accessible', reducedMotion: true, soundEnabled: false,
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: {},
    organNotes: { 'frog|nictitating': 'Transparent membrane observed.' }, organConfidence: { 'frog|nictitating': 2 },
    procedureByLayer: { skin: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 1000 }] } },
    annotations: [{ type: 'dot', x: .4, y: .4 }], visualEvidence: [], quizScore: 1, quizTotal: 2, ...patch,
  };
  function Component() {
    const [toolData, setToolData] = React.useState({ dissection: initial });
    state = toolData.dissection; update = setToolData;
    return config.render(makeCtx({ toolData, setToolData, awardXP, pluginInstanceToken }));
  }
  const fixture = {
    host, awardXP, get state() { return state; },
    node(id) { return host.querySelector('[id="' + id + '"]'); },
    async click(node) {
      expect(node).not.toBeNull(); node.focus();
      await act(async () => { node.click(); }); await act(async () => { await settle(); });
    },
    async key(node, options = {}) {
      expect(node).not.toBeNull(); node.focus();
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...options });
      if (options.keyCode === 229) Object.defineProperty(event, 'keyCode', { value: 229 });
      if (options.defaultPrevented) event.preventDefault();
      await act(async () => { node.dispatchEvent(event); }); await act(async () => { await settle(); });
      return event;
    },
    async patch(next) {
      await act(async () => { update(previous => ({ ...previous, dissection: { ...previous.dissection, ...next } })); });
      await act(async () => { await settle(); });
    },
    async close() {
      await act(async () => { root.unmount(); }); host.remove(); await act(async () => { await settle(); });
    },
  };
  fixtures.push(fixture);
  await act(async () => { root.render(React.createElement(Component)); }); await act(async () => { await settle(); });
  return fixture;
}

beforeEach(() => {
  localStorage.clear(); resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  originalScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});
afterEach(async () => {
  for (const fixture of fixtures.splice(0).reverse()) await fixture.close();
  await settle(150); vi.restoreAllMocks(); localStorage.clear();
  if (originalScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScroll); else delete Element.prototype.scrollIntoView;
  document.getElementById('allo-live-dissection')?.remove(); window._dissectionKeyHandler = null;
});

const pausedReplay = () => ({ specimen: 'frog', layer: 'skin', startedAt: Date.now(), duration: 5000,
  paused: true, elapsed: 2500, returnFocusId: 'diss-review-actions',
  actions: [{ action: 'inspect', label: 'Inspected skin' }] });
const contexts = [
  {
    label: 'scenario restart review', patch: {},
    async open(f) { await f.click(f.node('diss-scenario-restart')); },
    control: f => f.node('diss-scenario-restart-cancel'),
    snapshot: f => !!f.node('diss-scenario-restart-review'),
    expectClosed(f) { expect(f.node('diss-scenario-restart-review')).toBeNull(); expect(document.activeElement).toBe(f.node('diss-scenario-restart')); },
  },
  ...[['held replay specimen', 'diss-replay-return'], ['replay action review', 'diss-replay-view-specimen']].map(([label, id]) => ({
    label, patch: () => ({ _procedureReplay: pausedReplay() }),
    async open() {}, control: f => f.node(id),
    snapshot: f => structuredClone(f.state._procedureReplay),
    expectClosed(f) {
      expect(f.state._procedureReplay).toBeNull(); expect(f.node('diss-replay-specimen')).toBeNull();
      expect(f.node('diss-replay-review')).toBeNull(); expect(document.activeElement).toBe(f.node('diss-review-actions'));
    },
  })),
  {
    label: 'observation search', patch: { _observationReviewSearch: 'transparent' },
    async open(f) { f.node('diss-observation-review').open = true; },
    control: f => f.node('diss-observation-search'), snapshot: f => f.state._observationReviewSearch,
    expectClosed(f) { expect(f.state._observationReviewSearch).toBe(''); expect(document.activeElement).toBe(f.node('diss-observation-search')); },
  },
  ...[['directory search', 'diss-organ-search'], ['directory results', 'diss-organ-nictitating']].map(([label, id]) => ({
    label, patch: { selectedOrgan: null, organSearch: 'nictitating', directoryFilter: 'all' }, async open() {},
    control: f => f.node(id), snapshot: f => [f.state.organSearch, f.state.directoryFilter],
    expectClosed(f) { expect(f.state.organSearch).toBe(''); expect(f.state.directoryFilter).toBe('all'); expect(document.activeElement).toBe(f.node('diss-organ-search')); },
  })),
];

describe('Dissection local Escape handlers respect assistive and input events', () => {
  it('rejects native composition even when the synthetic wrapper reports no composition', () => {
    const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
    const declaration = source.match(/^  function isDissectionPlainEscape\(event\) \{[\s\S]*?\n  \}/m);
    expect(declaration).not.toBeNull();
    const accepts = new Function('return (' + declaration[0] + ');')();
    expect(accepts({ key: 'Escape', isComposing: false, nativeEvent: { isComposing: true } })).toBe(false);
    for (const event of [null, undefined, { key: 'Enter' }]) expect(accepts(event)).toBe(false);
    expect(accepts({ key: 'Escape' })).toBe(true);
  });

  for (const context of contexts) {
    it('keeps ' + context.label + ' and learner work intact for modified, composing and handled Escape', async () => {
      const f = await mountLab(typeof context.patch === 'function' ? context.patch() : context.patch);
      await context.open(f);
      const before = learnerWork(f.state), viewBefore = context.snapshot(f), control = context.control(f);
      for (const options of ignoredKeys) {
        const event = await f.key(control, options);
        expect(event.defaultPrevented).toBe(!!options.defaultPrevented);
        expect(context.snapshot(f)).toEqual(viewBefore); expect(document.activeElement).toBe(control);
        expect(learnerWork(f.state)).toEqual(before);
      }
      const otherKey = await f.key(control, { key: 'F6' });
      expect(otherKey.defaultPrevented).toBe(false); expect(context.snapshot(f)).toEqual(viewBefore);
      expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
    });

    it('keeps plain Escape available in ' + context.label + ' with its normal focus return', async () => {
      const f = await mountLab(typeof context.patch === 'function' ? context.patch() : context.patch);
      await context.open(f); const before = learnerWork(f.state);
      const event = await f.key(context.control(f));
      expect(event.defaultPrevented).toBe(true); context.expectClosed(f);
      expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
    });
  }

  for (const fromResults of [false, true]) {
    it('does not move directory focus for handled or composing navigation from ' + (fromResults ? 'results' : 'search'), async () => {
      const f = await mountLab({ selectedOrgan: null, organSearch: '', directoryFilter: 'all' }), before = learnerWork(f.state);
      const rows = [...f.node('diss-directory-results').querySelectorAll('button[data-exposure-state]')];
      expect(rows.length).toBeGreaterThan(1);
      const control = fromResults ? rows[1] : f.node('diss-organ-search'), key = fromResults ? 'Home' : 'ArrowDown';
      for (const options of [{ defaultPrevented: true }, { isComposing: true }, { keyCode: 229 }]) {
        const event = await f.key(control, { key, ...options });
        expect(event.defaultPrevented).toBe(!!options.defaultPrevented); expect(document.activeElement).toBe(control);
        expect(learnerWork(f.state)).toEqual(before);
      }
      const event = await f.key(control, { key });
      expect(event.defaultPrevented).toBe(true); expect(document.activeElement).toBe(rows[0]);
      expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
    });
  }
});
