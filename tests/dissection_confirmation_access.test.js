import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
const settle = (ms = 25) => new Promise(resolve => setTimeout(resolve, ms));
const frame = { id: 104, layer: 'skin', image: 'data:image/png;base64,eA==', at: 104 };
let originalScroll;

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
    toolbarToolsOpen: true, selectedOrgan: 'nictitating', hoveredOrgan: null, revealedLayers: { skin: true },
    visualRealism: 'accessible', reducedMotion: true, soundEnabled: false, evidenceNotebookOpen: true,
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: {},
    organNotes: { 'frog|nictitating': 'Transparent membrane observed.' }, organConfidence: { 'frog|nictitating': 2 },
    procedureByLayer: {}, annotations: [], visualEvidence: [frame], quizScore: 1, quizTotal: 2, ...patch,
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

const openQuestionControl = f => [...f.host.querySelectorAll('button')].find(node => /open questions/.test(node.textContent));
const removeControl = f => f.host.querySelector('[data-evidence-remove-id="104"]');
const removeConfirmation = f => f.host.querySelector('[data-evidence-confirm-remove-id="104"]');
const conditionalControls = f => [f.node('diss-reset-specimen'), f.node('diss-scenario-restart'),
  f.node('diss-evidence-clear-all'), openQuestionControl(f), f.node('diss-inquiry-understood')];

function expectRelationship(f, control, targetId, expanded) {
  expect(control).not.toBeNull();
  if (expanded) {
    expect(control.getAttribute('aria-controls')).toBe(targetId);
    expect(f.node(targetId)).not.toBeNull();
  } else {
    expect(control.hasAttribute('aria-controls')).toBe(false);
    expect(f.node(targetId)).toBeNull();
  }
}

beforeEach(() => {
  localStorage.clear(); resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  originalScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});
afterEach(async () => {
  for (const f of fixtures.splice(0).reverse()) await f.close();
  await settle(150); vi.restoreAllMocks(); localStorage.clear();
  if (originalScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScroll); else delete Element.prototype.scrollIntoView;
  document.getElementById('allo-live-dissection')?.remove(); window._dissectionKeyHandler = null;
});

describe('dissection conditional accessibility relationships', () => {
  for (const [label, targetId, otherLabel, otherId] of [
    ['View and accessibility options', 'diss-view-tools', 'Lab tool options', 'diss-lab-tools'],
    ['Lab tool options', 'diss-lab-tools', 'View and accessibility options', 'diss-view-tools'],
  ]) {
    it('keeps ' + label + ' relationships aligned with collapsed, expanded and mutually closed panels', async () => {
      const f = await mountLab({ toolbarViewOpen: false, toolbarToolsOpen: false });
      const control = f.host.querySelector('button[aria-label="' + label + '"]');
      const other = f.host.querySelector('button[aria-label="' + otherLabel + '"]');
      expectRelationship(f, control, targetId, false);
      await f.click(control);
      expectRelationship(f, control, targetId, true); expect(control.getAttribute('aria-expanded')).toBe('true');
      await f.click(other);
      expectRelationship(f, control, targetId, false); expect(control.getAttribute('aria-expanded')).toBe('false');
      expectRelationship(f, other, otherId, true);
      await f.click(other); expectRelationship(f, other, otherId, false);
    });
  }

  it('omits relationships to all five absent conditional panels', async () => {
    const f = await mountLab();
    for (const control of conditionalControls(f)) {
      expect(control).not.toBeNull(); expect(control.hasAttribute('aria-controls')).toBe(false);
    }
  });

  it('connects open questions only while their content is present, preserving the hypothesis', async () => {
    const f = await mountLab({ dissInquiry: { hypothesis: 'Care will matter most.', stuckRevealed: false } });
    await f.click(openQuestionControl(f));
    expectRelationship(f, openQuestionControl(f), 'diss-inquiry-open-questions', true);
    expect(openQuestionControl(f).getAttribute('aria-expanded')).toBe('true');
    await f.click(openQuestionControl(f));
    expectRelationship(f, openQuestionControl(f), 'diss-inquiry-open-questions', false);
    expect(f.state.dissInquiry.hypothesis).toBe('Care will matter most.');
  });

  it('connects the explanation checkbox only while its editable response is present and preserves that response', async () => {
    const f = await mountLab({ dissInquiry: { understood: false, explanation: 'Slower movement gives more control.' } });
    await f.click(f.node('diss-inquiry-understood'));
    expectRelationship(f, f.node('diss-inquiry-understood'), 'diss-inquiry-explanation', true);
    expect(f.node('diss-inquiry-explanation-text').value).toBe('Slower movement gives more control.');
    await f.click(f.node('diss-inquiry-understood'));
    expectRelationship(f, f.node('diss-inquiry-understood'), 'diss-inquiry-explanation', false);
    expect(f.state.dissInquiry.explanation).toBe('Slower movement gives more control.');
  });

  it('connects normal reset confirmation while open and restores its opener when canceled', async () => {
    const f = await mountLab(), before = learnerWork(f.state);
    await f.click(f.node('diss-reset-specimen'));
    expectRelationship(f, f.node('diss-reset-specimen'), 'diss-reset-confirmation', true);
    await f.click(f.node('diss-reset-cancel'));
    expectRelationship(f, f.node('diss-reset-specimen'), 'diss-reset-confirmation', false);
    expect(document.activeElement).toBe(f.node('diss-reset-specimen')); expect(learnerWork(f.state)).toEqual(before);
  });

  it('keeps the reset relationship valid when the confirmation lives in protected-save recovery', async () => {
    const raw = JSON.stringify({ schemaVersion: 22, activeLayer: 'skin', futureOnlyField: { keep: true } });
    localStorage.setItem('dissection_progress_frog', raw);
    const f = await mountLab(), before = learnerWork(f.state);
    await f.click(f.node('diss-protected-save-reset'));
    expectRelationship(f, f.node('diss-reset-specimen'), 'diss-reset-confirmation', true);
    expect(f.host.querySelectorAll('#diss-reset-confirmation')).toHaveLength(1);
    await f.click(f.node('diss-reset-cancel'));
    expectRelationship(f, f.node('diss-reset-specimen'), 'diss-reset-confirmation', false);
    expect(document.activeElement).toBe(f.node('diss-protected-save-reset'));
    expect(learnerWork(f.state)).toEqual(before); expect(localStorage.getItem('dissection_progress_frog')).toBe(raw);
  });

  it('connects scenario restart review only during review and returns focus after cancellation', async () => {
    const f = await mountLab(), before = learnerWork(f.state);
    await f.click(f.node('diss-scenario-restart'));
    expectRelationship(f, f.node('diss-scenario-restart'), 'diss-scenario-restart-review', true);
    await f.click(f.node('diss-scenario-restart-cancel'));
    expectRelationship(f, f.node('diss-scenario-restart'), 'diss-scenario-restart-review', false);
    expect(document.activeElement).toBe(f.node('diss-scenario-restart')); expect(learnerWork(f.state)).toEqual(before);
  });

  it('connects clear-all confirmation only while review is open', async () => {
    const f = await mountLab(), before = learnerWork(f.state);
    await f.click(f.node('diss-evidence-clear-all'));
    expectRelationship(f, f.node('diss-evidence-clear-all'), 'diss-evidence-clear-confirmation', true);
    const cancel = [...f.node('diss-evidence-clear-confirmation').querySelectorAll('button')].find(node => node.textContent === 'Cancel');
    await f.click(cancel);
    expectRelationship(f, f.node('diss-evidence-clear-all'), 'diss-evidence-clear-confirmation', false);
    expect(document.activeElement).toBe(f.node('diss-evidence-clear-all')); expect(learnerWork(f.state)).toEqual(before);
  });
});

describe('dissection contextual confirmation Escape', () => {
  for (const mode of ['single-frame removal', 'clear-all']) {
    const isClear = mode === 'clear-all';
    it('cancels ' + mode + ' and returns focus without changing the selected structure or saved work', async () => {
      const f = await mountLab(), before = learnerWork(f.state);
      await f.click(isClear ? f.node('diss-evidence-clear-all') : removeControl(f));
      const event = await f.key(isClear ? f.node('diss-evidence-confirm-clear') : removeConfirmation(f));
      expect(event.defaultPrevented).toBe(true);
      expect(isClear ? f.state.evidenceClearPending : f.state.evidenceRemovePendingId).toBeFalsy();
      expect(document.activeElement).toBe(isClear ? f.node('diss-evidence-clear-all') : removeControl(f));
      expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
    });

    it('leaves modified, composing and already handled Escape untouched inside ' + mode, async () => {
      const f = await mountLab();
      await f.click(isClear ? f.node('diss-evidence-clear-all') : removeControl(f));
      const before = learnerWork(f.state), control = isClear ? f.node('diss-evidence-confirm-clear') : removeConfirmation(f);
      for (const options of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true },
        { isComposing: true }, { keyCode: 229 }, { defaultPrevented: true }]) {
        const event = await f.key(control, options);
        expect(event.defaultPrevented).toBe(!!options.defaultPrevented);
        expect(isClear ? f.state.evidenceClearPending : f.state.evidenceRemovePendingId).toBe(isClear ? true : 104);
        expect(document.activeElement).toBe(control); expect(learnerWork(f.state)).toEqual(before);
      }
      expect(f.awardXP).not.toHaveBeenCalled();
    });
  }

  it('does not cancel an open evidence confirmation when Escape originates outside it', async () => {
    const f = await mountLab(); await f.click(f.node('diss-evidence-clear-all'));
    const control = f.host.querySelector('button[aria-label="Advanced workspace"]');
    await f.key(control);
    expect(f.state.evidenceClearPending).toBe(true); expect(document.activeElement).toBe(control);
  });

  it('does not act on handled or Shift+Escape in the reset confirmation', async () => {
    const f = await mountLab(); await f.click(f.node('diss-reset-specimen'));
    const before = learnerWork(f.state), control = f.node('diss-reset-confirm');
    for (const options of [{ defaultPrevented: true }, { shiftKey: true }]) {
      const event = await f.key(control, options);
      expect(event.defaultPrevented).toBe(!!options.defaultPrevented);
      expect(f.state.resetConfirmPending).toBe(true); expect(document.activeElement).toBe(control);
      expect(learnerWork(f.state)).toEqual(before);
    }
  });
});
