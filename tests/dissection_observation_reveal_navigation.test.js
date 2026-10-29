import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const ids = ['ventral_skin', 'pectoralis', 'rectus_abd', 'gastrocnemius', 'triceps_fem', 'sartorius', 'deltoid'];
const initial = {
  specimen: 'frog', activeLayer: 'muscle', anatomicalView: 'ventral', _dissLoadedSpec: 'frog',
  workspaceMode: 'advanced', techniquePanelOpen: true, activeInstrument: 'probe', reducedMotion: false,
  revealedLayers: { skin: true },
  exploredOrgans: Object.fromEntries(ids.map(id => ['frog|' + id, true])),
  organNotes: Object.fromEntries(ids.map(id => ['frog|' + id, 'Original observation: ' + id])),
  organConfidence: Object.fromEntries(ids.map(id => ['frog|' + id, 2])),
  procedureByLayer: { muscle: { inspected: true, incisionStarted: true, incisionExtended: true, retracted: true,
    pins: [{ x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }], probed: true, probedOrganId: 'pectoralis',
    history: ['inspect', 'pin', 'scalpel', 'scissors', 'forceps', 'probe'], actionLog: [{ action: 'probe', at: 2 }] } },
};

describe('observation navigation during a layer reveal', () => {
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
    const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection'), pluginInstanceToken = {};
    function Lab() {
      const [toolData, setToolData] = React.useState({ dissection: structuredClone(initial) });
      state = toolData.dissection;
      return config.render(makeCtx({ toolData, setToolData, pluginInstanceToken }));
    }
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Lab)); });
    await act(async () => { vi.advanceTimersByTime(150); });
  }
  async function click(selector) {
    const button = host.querySelector(selector); expect(button).not.toBeNull();
    await act(async () => { button.click(); });
  }

  it('finishes the active reveal before handing off to a saved observation in another layer', async () => {
    await mount();
    await click('[data-next-action="peel-layer"] .diss-next-action__primary');
    expect(state._incisionAnim?.active).toBe(true);
    const canvas = host.querySelector('[data-diss-canvas]'), timer = canvas._dissTimers.layerPeel;
    await click('[data-observation-edit="ventral_skin"]');
    expect(state.activeLayer).toBe('muscle');
    expect(canvas._dissTimers.layerPeel).toBe(timer);
    expect(state.organNotes).toEqual(initial.organNotes);
    await act(async () => { vi.advanceTimersByTime(550); });
    expect(state.activeLayer).toBe('organs');
    expect(state.revealedLayers).toEqual({ skin: true, muscle: true });
    expect(state._incisionAnim).toBeNull();
    await click('[data-observation-edit="ventral_skin"]');
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(state.activeLayer).toBe('skin');
    expect(state.selectedOrgan).toBe('ventral_skin');
    expect(document.activeElement).toBe(host.querySelector('#diss-note-ventral_skin'));
    expect(state.organNotes).toEqual(initial.organNotes);
    expect(state.organConfidence).toEqual(initial.organConfidence);
  });
});
