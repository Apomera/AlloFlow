import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
const settle = (ms = 25) => new Promise(resolve => setTimeout(resolve, ms));
const saveKey = 'dissection_progress_frog';
const byId = (host, id) => host.querySelector('[id="' + id + '"]');

function learnerWork(state) {
  return structuredClone(Object.fromEntries(['specimen', 'activeLayer', 'exploredOrgans', 'verifiedIdentifications',
    'organNotes', 'organConfidence', 'procedureByLayer', 'annotations', 'quizScore', 'quizTotal'].map(key => [key, state[key]])));
}

async function mountLab(patch = {}) {
  const config = window.StemLab._registry.dissection || loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), awardXP = vi.fn(), announce = vi.fn(), pluginInstanceToken = {};
  let state, update;
  const initial = {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    workspaceMode: 'advanced', selectedOrgan: null, hoveredOrgan: null,
    visualRealism: 'accessible', reducedMotion: true, soundEnabled: false,
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: {},
    organNotes: { 'frog|nictitating': 'A transparent membrane covers the eye.' },
    organConfidence: { 'frog|nictitating': 2 }, procedureByLayer: {}, annotations: [],
    quizScore: 1, quizTotal: 2, ...patch,
  };
  function Component() {
    const [toolData, setToolData] = React.useState({ dissection: initial });
    state = toolData.dissection; update = setToolData;
    return config.render(makeCtx({ toolData, setToolData, awardXP, announceToSR: announce, pluginInstanceToken }));
  }
  const fixture = {
    host, awardXP, announce, get state() { return state; },
    get tabs() { return [...host.querySelectorAll('[data-dissection-specimens] [role="tab"]')]; },
    get selectedTab() { return host.querySelector('[data-dissection-specimens] [role="tab"][aria-selected="true"]'); },
    get toolbar() { return host.querySelector('.diss-toolbar[role="toolbar"]'); },
    node(id) { return byId(host, id); },
    async key(node, key, options = {}) {
      expect(node).not.toBeNull(); node.focus();
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
      if (options.keyCode === 229) Object.defineProperty(event, 'keyCode', { value: 229 });
      await act(async () => { node.dispatchEvent(event); });
      await act(async () => { await settle(); });
      return event;
    },
    async patch(next) {
      await act(async () => { update(previous => ({ ...previous, dissection: { ...previous.dissection, ...next } })); });
      await act(async () => { await settle(); });
    },
    async close() {
      await act(async () => { root.unmount(); }); host.remove();
      await act(async () => { await settle(); });
    },
  };
  fixtures.push(fixture);
  await act(async () => { root.render(React.createElement(Component)); });
  await act(async () => { await settle(); });
  return fixture;
}

function rendered(node, visible = true) {
  Object.defineProperty(node, 'getClientRects', { configurable: true, value: () => visible ? [{ x: 0, y: 0, width: 80, height: 44 }] : [] });
}

beforeEach(() => {
  localStorage.clear(); resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(async () => {
  for (const fixture of fixtures.splice(0).reverse()) await fixture.close();
  await settle(150);
  vi.restoreAllMocks(); localStorage.clear();
  document.getElementById('allo-live-dissection')?.remove(); window._dissectionKeyHandler = null;
});

const modifiedNavigation = [
  ['Alt+Left', 'ArrowLeft', { altKey: true }],
  ['Control+Home', 'Home', { ctrlKey: true }],
  ['Meta+End', 'End', { metaKey: true }],
  ['Shift+Right', 'ArrowRight', { shiftKey: true }],
  ['Control+Alt+Right', 'ArrowRight', { ctrlKey: true, altKey: true }],
  ['composition navigation', 'ArrowRight', { isComposing: true }],
  ['legacy IME navigation', 'Home', { keyCode: 229 }],
];

describe('dissection composite keyboard command boundaries', () => {
  it('leaves modified and composing specimen commands to the browser or assistive technology', async () => {
    const f = await mountLab(), before = learnerWork(f.state), current = f.selectedTab;
    for (const [label, key, options] of modifiedNavigation) {
      const event = await f.key(current, key, options);
      expect(event.defaultPrevented, label).toBe(false);
      expect(document.activeElement, label).toBe(current);
      expect(f.selectedTab, label).toBe(current);
      expect(learnerWork(f.state), label).toEqual(before);
    }
    expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('leaves modified and composing toolbar commands untouched without activating another control', async () => {
    const f = await mountLab(), before = learnerWork(f.state), controls = [...f.toolbar.querySelectorAll('button')];
    controls.forEach(node => rendered(node));
    const current = controls[0];
    for (const [label, key, options] of modifiedNavigation) {
      const event = await f.key(current, key, options);
      expect(event.defaultPrevented, label).toBe(false);
      expect(document.activeElement, label).toBe(current);
      expect(learnerWork(f.state), label).toEqual(before);
    }
    expect(f.state.toolbarToolsOpen).not.toBe(true); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('keeps ordinary specimen Arrow, Home and End navigation selecting and focusing the accepted tab', async () => {
    const f = await mountLab(), tabs = f.tabs;
    expect(tabs.length).toBeGreaterThan(2);
    const first = tabs[0], last = tabs[tabs.length - 1], second = tabs[1];
    for (const [key, expected] of [['ArrowRight', second], ['End', last], ['Home', first], ['ArrowLeft', last]]) {
      const event = await f.key(f.selectedTab, key);
      expect(event.defaultPrevented).toBe(true);
      expect(f.selectedTab).toBe(expected); expect(document.activeElement).toBe(expected);
      expect(expected.getAttribute('aria-selected')).toBe('true');
      expect(f.state.specimen).toBe(expected.id.replace('diss-specimen-tab-', ''));
    }
    const departed = JSON.parse(localStorage.getItem(saveKey));
    expect(departed.organNotes['frog|nictitating']).toBe('A transparent membrane covers the eye.');
    expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('ignores a non-navigation key on specimen and toolbar controls', async () => {
    const f = await mountLab(), before = learnerWork(f.state);
    for (const control of [f.selectedTab, f.toolbar.querySelector('button')]) {
      rendered(control);
      const event = await f.key(control, 'F2');
      expect(event.defaultPrevented).toBe(false); expect(document.activeElement).toBe(control);
      expect(learnerWork(f.state)).toEqual(before);
    }
  });
});

describe('dissection toolbar navigation uses rendered available controls', () => {
  it('skips disabled, hidden, inert and unrendered controls and wraps among visible targets', async () => {
    const f = await mountLab({ workspaceMode: 'essentials' }), toolbar = f.toolbar;
    const view = toolbar.querySelector('button'), tools = toolbar.querySelector('button.diss-advanced-only');
    expect(tools).not.toBeNull(); rendered(view); rendered(tools, false);
    function append(text, attributes = {}) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
      for (const [name, value] of Object.entries(attributes)) button.setAttribute(name, value);
      rendered(button); toolbar.appendChild(button); return button;
    }
    const hidden = append('Hidden target', { hidden: '' });
    const disabled = append('Disabled target', { disabled: '' });
    const inert = append('Inert target');
    const inertGroup = document.createElement('div'); inertGroup.setAttribute('inert', ''); toolbar.appendChild(inertGroup); inertGroup.appendChild(inert);
    const unrendered = append('No layout target'); rendered(unrendered, false);
    const final = append('Visible final target');
    for (const [origin, key, target] of [[view, 'ArrowRight', final], [final, 'ArrowRight', view], [view, 'ArrowLeft', final], [final, 'Home', view], [view, 'End', final]]) {
      const event = await f.key(origin, key);
      expect(event.defaultPrevented).toBe(true); expect(document.activeElement).toBe(target);
      expect([tools, hidden, disabled, inert, unrendered]).not.toContain(document.activeElement);
    }
    expect(f.state.toolbarToolsOpen).not.toBe(true); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('keeps valid focus on the only rendered Essentials toolbar control', async () => {
    const f = await mountLab({ workspaceMode: 'essentials' }), controls = [...f.toolbar.querySelectorAll('button')];
    const view = controls[0]; controls.forEach(node => rendered(node, node === view));
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      await f.key(view, key); expect(document.activeElement).toBe(view);
    }
    expect(f.state.toolbarToolsOpen).not.toBe(true);
  });

  it('does not claim a navigation event when the originating control is not a rendered candidate', async () => {
    const f = await mountLab(), controls = [...f.toolbar.querySelectorAll('button')];
    controls.forEach(node => rendered(node, false));
    const event = await f.key(controls[0], 'End');
    expect(event.defaultPrevented).toBe(false); expect(document.activeElement).toBe(controls[0]);
  });
});

describe('refused specimen navigation preserves progress and recovery focus', () => {
  it('keeps the protected-save recovery action focused instead of an unselected requested tab', async () => {
    const protectedRaw = JSON.stringify({ schemaVersion: 22, activeLayer: 'skin', futureOnlyField: { keep: true }, organNotes: { 'frog|tympanum': 'Protected future record.' } });
    localStorage.setItem(saveKey, protectedRaw);
    const f = await mountLab(), before = learnerWork(f.state), current = f.selectedTab;
    expect(f.node('diss-protected-save-retry')).not.toBeNull();
    const event = await f.key(current, 'ArrowRight');
    expect(event.defaultPrevented).toBe(true); expect(f.state.specimen).toBe('frog');
    expect(f.selectedTab).toBe(current); expect(document.activeElement).toBe(f.node('diss-protected-save-retry'));
    expect(localStorage.getItem(saveKey)).toBe(protectedRaw); expect(learnerWork(f.state)).toEqual(before);
    expect(f.state.procedureFeedback.message).toContain('specimen was not changed'); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('keeps storage-unavailable recovery focus and leaves the unreadable saved record intact', async () => {
    const savedRaw = JSON.stringify({ schemaVersion: 21, activeLayer: 'skin', organNotes: { 'frog|tympanum': 'Previously saved observation.' } });
    localStorage.setItem(saveKey, savedRaw);
    const nativeGet = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === saveKey) throw new DOMException('Temporary read failure', 'SecurityError');
      return nativeGet.call(this, key);
    });
    const f = await mountLab(), before = learnerWork(f.state), current = f.selectedTab;
    expect(f.node('diss-protected-save-retry')).not.toBeNull();
    await f.key(current, 'End');
    expect(f.state.specimen).toBe('frog'); expect(f.selectedTab).toBe(current);
    expect(document.activeElement).toBe(f.node('diss-protected-save-retry'));
    expect(nativeGet.call(localStorage, saveKey)).toBe(savedRaw); expect(learnerWork(f.state)).toEqual(before);
  });

  it('keeps the active tab and latest work when a pending departure save cannot flush', async () => {
    const f = await mountLab();
    await act(async () => { await settle(150); });
    const savedRaw = localStorage.getItem(saveKey); expect(savedRaw).not.toBeNull();
    const nativeSet = Storage.prototype.setItem;
    let rejectedWrites = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === saveKey) { rejectedWrites += 1; throw new DOMException('Temporary write limit', 'QuotaExceededError'); }
      return nativeSet.call(this, key, value);
    });
    await f.patch({ organNotes: { 'frog|nictitating': 'Latest work that must stay in this lab.' } });
    const before = learnerWork(f.state), current = f.selectedTab;
    await f.key(current, 'ArrowRight');
    expect(rejectedWrites).toBeGreaterThan(0);
    expect(f.state.procedureFeedback.message).toContain('Could not save the latest');
    expect(f.state.specimen).toBe('frog'); expect(f.selectedTab).toBe(current); expect(document.activeElement).toBe(current);
    expect(learnerWork(f.state)).toEqual(before); expect(localStorage.getItem(saveKey)).toBe(savedRaw);
    expect(f.awardXP).not.toHaveBeenCalled();
  });
});

describe('inspection feedback matches the actual keyboard outcome', () => {
  it.each(['Enter', ' '])('keeps the guided observation instruction after %j activates its target', async key => {
    const f = await mountLab({ guidedMode: true, guidedStep: 0, guidedTargetIds: ['nictitating'] });
    const canvas = f.node('diss-canvas');
    await f.key(canvas, 'End');
    expect(canvas._keyboardPreviewOrganId).toBe('nictitating');
    f.announce.mockClear();
    await f.key(canvas, key);
    expect(f.state.guidedObservationPending).toBe('nictitating');
    expect(f.state.guidedStep).toBe(0);
    expect(f.state.verifiedIdentifications).toEqual({});
    expect(f.state.procedureFeedback).toMatchObject({ tone: 'working' });
    expect(f.state.procedureFeedback.message).toContain('Now choose the specimen observation');
    expect(f.state.procedureFeedback.message).toContain('has not advanced yet');
    expect(f.announce.mock.calls.some(([message]) => message.startsWith('Inspected '))).toBe(false);
    expect(document.activeElement).toBe(f.node('diss-guided-observation-check'));
    expect(f.awardXP).not.toHaveBeenCalled();
  });

  it.each(['Enter', ' '])('describes an existing record as review after %j', async key => {
    const f = await mountLab(), before = learnerWork(f.state), canvas = f.node('diss-canvas');
    await f.key(canvas, 'End');
    f.announce.mockClear();
    await f.key(canvas, key);
    expect(f.state.procedureFeedback.message).toContain('Reviewing your existing observation record for Nictitating Membrane');
    expect(f.state.procedureFeedback.tone).toBe('working');
    expect(f.announce.mock.calls.some(([message]) => message.startsWith('Inspected '))).toBe(false);
    expect(learnerWork(f.state)).toEqual(before);
    expect(document.activeElement).toBe(f.node('diss-selection-title'));
    expect(f.awardXP).not.toHaveBeenCalled();
  });

  it.each(['Enter', ' '])('announces a first inspection once after %j without granting verification', async key => {
    const f = await mountLab({ exploredOrgans: {}, organNotes: {}, organConfidence: {} }), canvas = f.node('diss-canvas');
    await f.key(canvas, 'End');
    expect(f.state.exploredOrgans).toEqual({});
    f.announce.mockClear();
    await f.key(canvas, key);
    expect(f.state.exploredOrgans).toEqual({ 'frog|nictitating': true });
    expect(f.state.verifiedIdentifications).toEqual({});
    expect(f.state.procedureFeedback.tone).toBe('success');
    expect(f.state.procedureFeedback.message).toContain('Inspected Nictitating Membrane.');
    expect(f.announce.mock.calls.filter(([message]) => message.startsWith('Inspected '))).toHaveLength(1);
    expect(document.activeElement).toBe(f.node('diss-selection-title'));
  });

  it('retains recovery feedback when the directory cannot inspect an occluded structure', async () => {
    const f = await mountLab({ exploredOrgans: {}, organNotes: {}, organConfidence: {} }), before = learnerWork(f.state);
    const hidden = f.node('diss-organ-ventral_skin');
    expect(hidden.getAttribute('data-exposure-state')).not.toBe('visible');
    f.announce.mockClear();
    await act(async () => { hidden.focus(); hidden.click(); });
    expect(f.state.procedureFeedback.tone).toBe('caution');
    expect(f.state.procedureFeedback.message).toMatch(/occluded|not yet exposed/);
    expect(f.announce.mock.calls.some(([message]) => message.startsWith('Inspected '))).toBe(false);
    expect(learnerWork(f.state)).toEqual(before);
    expect(f.awardXP).not.toHaveBeenCalled();
  });
});
