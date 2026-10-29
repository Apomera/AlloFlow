import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const key = 'dissection_progress_frog';
const initial = {
  specimen: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', _dissLoadedSpec: 'frog',
  workspaceMode: 'advanced', techniquePanelOpen: true, toolbarToolsOpen: true, activeInstrument: 'probe', reducedMotion: false,
  exploredOrgans: { 'frog|dorsal_skin': true, 'frog|ventral_skin': true, 'frog|tympanum': true, 'frog|nictitating': true },
  organNotes: { 'frog|dorsal_skin': 'Protective surface.', 'frog|ventral_skin': 'Vascular surface.', 'frog|tympanum': 'Sound membrane.', 'frog|nictitating': 'Transparent eyelid.' },
  organConfidence: { 'frog|dorsal_skin': 2, 'frog|ventral_skin': 2, 'frog|tympanum': 2, 'frog|nictitating': 2 },
  procedureByLayer: { skin: { inspected: true, incisionStarted: true, incisionExtended: true, retracted: true,
    pins: [{ x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }], probed: true, probedOrganId: 'ventral_skin',
    history: ['inspect', 'pin', 'scalpel', 'scissors', 'forceps', 'probe'], actionLog: [{ action: 'probe', at: 2 }] } },
};

describe('dissection reset storage failure recovery', () => {
  let root, host, state;
  beforeEach(() => {
    vi.useFakeTimers(); localStorage.clear(); resetStemLab();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(async () => {
    if (root) await act(async () => { root.unmount(); });
    root = null; host?.remove(); host = null;
    vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear();
  });
  async function mount() {
    const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    function Lab() {
      const [toolData, setToolData] = React.useState({ dissection: structuredClone(initial) });
      state = toolData.dissection;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Lab)); });
    await act(async () => { vi.advanceTimersByTime(150); });
  }
  async function click(selector) {
    const button = host.querySelector(selector); expect(button).not.toBeNull();
    await act(async () => { button.click(); });
  }
  async function beginResetDuringReveal() {
    await click('[data-next-action="peel-layer"] .diss-next-action__primary');
    expect(state._incisionAnim?.active).toBe(true);
    await click('#diss-reset-specimen');
  }

  it('keeps an already-running layer reveal and the saved record intact when deletion fails', async () => {
    await mount(); const stored = localStorage.getItem(key);
    await beginResetDuringReveal();
    const canvas = host.querySelector('[data-diss-canvas]');
    const peelTimer = canvas._dissTimers.layerPeel;
    const notes = structuredClone(state.organNotes), procedure = structuredClone(state.procedureByLayer);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('Storage access denied', 'SecurityError'); });
    await click('#diss-reset-confirm');
    expect(state.procedureFeedback.message).toContain('Reset could not continue');
    expect(localStorage.getItem(key)).toBe(stored);
    expect(state.organNotes).toEqual(notes); expect(state.procedureByLayer).toEqual(procedure);
    expect(canvas._dissTimers?.layerPeel).toBe(peelTimer);
    await act(async () => { vi.advanceTimersByTime(550); });
    expect(state.revealedLayers.skin).toBe(true);
    expect(state.activeLayer).toBe('muscle'); expect(state._incisionAnim).toBeNull();
  });

  it('cancels queued reveal and old save callbacks only after a successful reset', async () => {
    await mount(); await beginResetDuringReveal();
    const canvas = host.querySelector('[data-diss-canvas]');
    expect(canvas._dissTimers.layerPeel).toBeDefined();
    await click('#diss-reset-confirm');
    expect(canvas._dissTimers?.layerPeel).toBeUndefined();
    expect(state.organNotes).toEqual({}); expect(state.procedureByLayer).toEqual({});
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(state.revealedLayers).toEqual({}); expect(state.activeLayer).toBe('skin');
    expect(state._incisionAnim).toBeNull();
    const saved = JSON.parse(localStorage.getItem(key));
    expect(saved.organNotes).toEqual({}); expect(saved.procedureByLayer).toEqual({}); expect(saved.revealedLayers).toEqual({});
  });
});
