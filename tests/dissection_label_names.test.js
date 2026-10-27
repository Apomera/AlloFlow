import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
const settle = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));
const normalise = text => text.replace(/\s+/g, ' ').trim();
const frame = index => ({ id: 100 + index, layer: 'skin', image: 'data:image/png;base64,eA==', at: 100 + index });
const learnerWork = state => structuredClone(Object.fromEntries(['selectedOrgan', 'exploredOrgans',
  'verifiedIdentifications', 'organNotes', 'organConfidence', 'procedureByLayer', 'attemptArchive',
  'annotations', 'visualEvidence', 'quizScore', 'quizTotal', 'assessmentRecordedScore', 'assessmentRecordedTotal']
  .map(key => [key, state[key]])));
let originalScroll;

async function mountLab(patch = {}) {
  const config = window.StemLab._registry.dissection || loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), awardXP = vi.fn(), pluginInstanceToken = {};
  let state, update;
  const initial = {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    workspaceMode: 'advanced', techniquePanelOpen: true, toolbarToolsOpen: true,
    selectedOrgan: 'nictitating', hoveredOrgan: null, revealedLayers: { skin: true },
    visualRealism: 'accessible', reducedMotion: true, soundEnabled: false, evidenceNotebookOpen: true,
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: {},
    organNotes: { 'frog|nictitating': 'Transparent membrane observed.' }, organConfidence: { 'frog|nictitating': 2 },
    procedureByLayer: {}, attemptArchive: {}, annotations: [], visualEvidence: [frame(0)],
    quizScore: 1, quizTotal: 2, assessmentRecordedScore: 2, assessmentRecordedTotal: 4, ...patch,
  };
  function Component() {
    const [toolData, setToolData] = React.useState({ dissection: initial });
    state = toolData.dissection; update = setToolData;
    return config.render(makeCtx({ toolData, setToolData, awardXP, pluginInstanceToken }));
  }
  const fixture = {
    host, awardXP, get state() { return state; },
    button(caption) { return [...host.querySelectorAll('button')].find(button => normalise(button.textContent).endsWith(caption)); },
    async click(node) {
      expect(node).not.toBeNull(); node.focus();
      await act(async () => { node.click(); }); await act(async () => { await settle(); });
    },
    async patch(next) {
      await act(async () => { update(previous => ({ ...previous, dissection: { ...previous.dissection, ...next } })); });
      await act(async () => { await settle(); });
    },
    async close() { await act(async () => { root.unmount(); }); host.remove(); await settle(); },
  };
  fixtures.push(fixture);
  await act(async () => { root.render(React.createElement(Component)); }); await act(async () => { await settle(); });
  return fixture;
}

function expectVisibleName(control, caption) {
  expect(control).toBeDefined(); expect(control).not.toBeNull();
  const visible = normalise(control.textContent), name = normalise(axe.commons.text.accessibleText(control));
  expect(visible).toContain(caption); expect(name.startsWith(visible)).toBe(true);
  expect(name).toContain(caption); expect(control.hasAttribute('aria-label')).toBe(false);
  return name;
}

beforeEach(() => {
  localStorage.clear(); resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  originalScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});

afterEach(async () => {
  axe.teardown();
  for (const fixture of fixtures.splice(0).reverse()) await fixture.close();
  await settle(150); vi.restoreAllMocks(); localStorage.clear();
  if (originalScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScroll); else delete Element.prototype.scrollIntoView;
  document.getElementById('allo-live-dissection')?.remove(); window._dissectionKeyHandler = null;
});

describe('dissection control names retain visible speech labels', () => {
  it.each([
    [0, 'Capture evidence', 'Capture evidence — Save a lightweight frame in the specimen notebook'],
    [6, 'Evidence full · manage notebook', 'Evidence notebook full — download or remove a frame first'],
  ])('names the capture control from its visible caption with %i frames', async (count, caption, title) => {
    const f = await mountLab({ visualEvidence: Array.from({ length: count }, (_, index) => frame(index)) });
    const before = learnerWork(f.state), control = f.host.querySelector('[data-evidence-capture]');
    axe.setup(f.host); expectVisibleName(control, caption); expect(control.title).toBe(title);
    const description = f.host.querySelector('#' + control.getAttribute('aria-describedby'));
    expect(description).not.toBeNull(); expect(description.id).toBe('diss-evidence-capacity');
    expect(description.textContent).toContain(count === 6 ? 'Notebook full' : 'Frames use browser storage');
    expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  for (const [caption, title] of [
    ['Show technique', 'Show a generalized safe-technique demonstration on the specimen'],
    ['Save attempt', 'Save this technique attempt as a comparison baseline'],
    ['Start new attempt', 'Start a new technique attempt for this layer'],
    ['Reset specimen', 'Reset progress for this specimen'],
  ]) {
    it('keeps the visible ' + caption + ' phrase in the computed name and retains its contextual tooltip', async () => {
      const f = await mountLab(), before = learnerWork(f.state), control = f.button(caption);
      axe.setup(f.host); expectVisibleName(control, caption); expect(control.title).toBe(title);
      expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
    });
  }

  it('retains visible speech names when attempt actions become enabled', async () => {
    const f = await mountLab(), save = f.button('Save attempt'), start = f.button('Start new attempt');
    expect(save.disabled).toBe(true); expect(start.disabled).toBe(true);
    await f.patch({ procedureByLayer: { skin: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 100 }] } },
      attemptArchive: { skin: [{ id: 100, savedAt: 100, layer: 'skin', history: ['inspect'], actionLog: [{ action: 'inspect', at: 100 }] }] } });
    const before = learnerWork(f.state); axe.setup(f.host);
    expect(f.button('Save attempt').disabled).toBe(false); expect(f.button('Start new attempt').disabled).toBe(false);
    expectVisibleName(f.button('Save attempt'), 'Save attempt'); expectVisibleName(f.button('Start new attempt'), 'Start new attempt');
    expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('opens the full notebook without replacing an evidence frame or awarding credit', async () => {
    const f = await mountLab({ visualEvidence: Array.from({ length: 6 }, (_, index) => frame(index)), evidenceNotebookOpen: false });
    const before = learnerWork(f.state), control = f.host.querySelector('[data-evidence-capture]');
    axe.setup(f.host); expectVisibleName(control, 'Evidence full · manage notebook'); axe.teardown();
    await f.click(control);
    expect(f.state.evidenceNotebookOpen).toBe(true); expect(learnerWork(f.state)).toEqual(before);
    expect(f.awardXP).not.toHaveBeenCalled(); expect(f.host.querySelectorAll('[data-evidence-id]')).toHaveLength(6);
  });

  it('opens and cancels reset review without changing anatomy or learner records', async () => {
    const f = await mountLab(), before = learnerWork(f.state); axe.setup(f.host);
    expectVisibleName(f.button('Reset specimen'), 'Reset specimen'); axe.teardown();
    await f.click(f.button('Reset specimen')); expect(f.state.resetConfirmPending).toBe(true);
    await f.click(f.host.querySelector('#diss-reset-cancel'));
    expect(f.state.resetConfirmPending).toBe(false); expect(document.activeElement).toBe(f.button('Reset specimen'));
    expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });
});
