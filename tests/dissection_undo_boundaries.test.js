import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const result = find(child, predicate); if (result) return result; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
const completed = {
  specimen: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', _dissLoadedSpec: 'frog',
  workspaceMode: 'advanced', techniquePanelOpen: true, activeInstrument: 'probe', reducedMotion: false,
  exploredOrgans: { 'frog|dorsal_skin': true, 'frog|ventral_skin': true, 'frog|tympanum': true, 'frog|nictitating': true },
  organNotes: { 'frog|dorsal_skin': 'Protective surface.', 'frog|ventral_skin': 'Vascular surface.', 'frog|tympanum': 'Sound membrane.', 'frog|nictitating': 'Transparent eyelid.' },
  organConfidence: { 'frog|dorsal_skin': 2, 'frog|ventral_skin': 2, 'frog|tympanum': 2, 'frog|nictitating': 2 },
  procedureByLayer: { skin: {
    inspected: true, incisionStarted: true, incisionExtended: true, retracted: true,
    pins: [{ x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }], probed: true, probedOrganId: 'ventral_skin',
    history: ['inspect', 'pin', 'scalpel', 'scissors', 'forceps', 'probe'],
    actionLog: [{ action: 'inspect', at: 1 }, { action: 'probe', at: 2 }],
  } },
};

describe('dissection undo interaction boundaries', () => {
  let config, root, host, state, patch, awardXP, view;
  beforeEach(() => {
    vi.useFakeTimers(); localStorage.clear(); resetStemLab();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    awardXP = vi.fn();
  });
  afterEach(async () => {
    if (root) await act(async () => { root.unmount(); });
    root = null; host?.remove(); host = null;
    vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear();
  });
  async function mount(initial = {}) {
    function Lab() {
      const [toolData, setToolData] = React.useState({ dissection: { ...structuredClone(completed), ...initial } });
      state = toolData.dissection;
      patch = values => setToolData(current => ({ ...current, dissection: { ...current.dissection, ...values } }));
      view = config.render(makeCtx({ toolData, setToolData, awardXP }));
      return view;
    }
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Lab)); });
  }
  function undo() { return [...host.querySelectorAll('button')].find(button => button.textContent.includes('Undo last technique action')); }
  function undoHandler() { return find(view, node => node.type === 'button' && String(node.props.children).includes('Undo last technique action')).props.onClick; }

  it('does not undo the final technique action while the layer reveal is pending', async () => {
    await mount();
    const reveal = host.querySelector('[data-next-action="peel-layer"] .diss-next-action__primary');
    expect(reveal).not.toBeNull();
    await act(async () => { reveal.click(); });
    expect(state._incisionAnim?.active).toBe(true);
    const procedure = structuredClone(state.procedureByLayer);
    await act(async () => { undo().click(); });
    const afterUndo = structuredClone(state.procedureByLayer);
    const undoWasDisabled = undo().disabled;
    await act(async () => { vi.advanceTimersByTime(550); });
    expect(state.revealedLayers.skin).toBe(true);
    expect(afterUndo).toEqual(procedure);
    expect(undoWasDisabled).toBe(true);
    expect(state.procedureByLayer.skin.probed).toBe(true);
    expect(state.activeLayer).toBe('muscle');
  });

  it.each([
    ['quiz', { quizMode: true }, /assessment/i],
    ['practical', { practicalMode: true, quizMode: true }, /assessment/i],
    ['incision', { _incisionAnim: { active: true } }, /finish/i],
    ['layer transition', { _layerTransition: { active: true } }, /finish/i],
    ['layer browsing', { _layerBrowseTransition: { active: true } }, /finish/i],
    ['view transition', { _viewTransition: { active: true } }, /finish/i],
  ])('rejects an old Undo callback during %s without changing the recorded attempt', async (_name, values, reason) => {
    await mount();
    const staleUndo = undoHandler();
    await act(async () => { patch(values.practicalMode ? { ...values, practicalEndsAt: Date.now() + 60000, practicalTimer: 60, practicalTargetIds: ['nictitating', 'tympanum'], quizSeed: 1234, quizIdx: 0 } : values); });
    const procedure = structuredClone(state.procedureByLayer);
    await act(async () => { staleUndo(); });
    expect(state.procedureByLayer).toEqual(procedure);
    if (undo()) {
      expect(undo().disabled).toBe(true);
      expect(host.querySelector('#diss-undo-unavailable')?.textContent).toMatch(reason);
      expect(undo().getAttribute('aria-describedby')).toBe('diss-undo-unavailable');
    }
  });

  it.each([
    ['specimen', { specimen: 'pig', _dissLoadedSpec: 'pig', procedureByLayer: { skin: { inspected: true, history: ['inspect'] } } }],
    ['layer', { activeLayer: 'muscle', procedureByLayer: { ...structuredClone(completed.procedureByLayer), muscle: { inspected: true, history: ['inspect'] } } }],
    ['newer action', { procedureByLayer: { skin: { ...structuredClone(completed.procedureByLayer.skin), history: [...completed.procedureByLayer.skin.history, 'dropper'], surfaceCleared: true } } }],
  ])('does not apply a stale Undo after a %s change', async (_name, values) => {
    await mount(); const staleUndo = undoHandler();
    await act(async () => { patch(values); });
    const procedure = structuredClone(state.procedureByLayer);
    await act(async () => { staleUndo(); });
    expect(state.procedureByLayer).toEqual(procedure);
  });

  it.each(['_toolDrawing', '_cameraTransition', '_probeDrag'])('preserves an in-progress canvas interaction: %s', async field => {
    await mount();
    const canvas = host.querySelector('[data-diss-canvas]');
    const gesture = field === '_toolDrawing' ? true : { active: true };
    canvas[field] = gesture;
    const procedure = structuredClone(state.procedureByLayer);
    await act(async () => { undoHandler()(); });
    expect(state.procedureByLayer).toEqual(procedure);
    expect(canvas[field]).toBe(gesture);
    expect(host.querySelector('#diss-undo-unavailable')?.textContent).toMatch(/finish|gesture/i);
    expect(undo().disabled).toBe(true);
  });

  it('still permits Undo on a new practice attempt in an already revealed layer', async () => {
    await mount({ revealedLayers: { skin: true }, procedureByLayer: { skin: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 3 }] } } });
    expect(undo().disabled).toBe(false);
    const notes = structuredClone(state.organNotes);
    await act(async () => { undo().click(); });
    expect(state.procedureByLayer.skin.inspected).toBe(false);
    expect(state.procedureByLayer.skin.history).toEqual([]);
    expect(state.revealedLayers.skin).toBe(true);
    expect(state.organNotes).toEqual(notes);
  });
});
