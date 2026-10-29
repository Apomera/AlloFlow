import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const key = 'dissection_progress_frog';

describe('dissection specimen departure without a queued save', () => {
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
  async function mountAndSave() {
    const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    function Lab() {
      const [toolData, setToolData] = React.useState({ dissection: {
        specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog', workspaceMode: 'advanced', reducedMotion: true,
        organNotes: { 'frog|dorsal_skin': 'My existing observation.' },
        procedureByLayer: { skin: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 1 }] } },
        attemptArchive: { skin: [{ id: 1, savedAt: 1, score: 50, history: ['inspect'] }] },
      } });
      state = toolData.dissection;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Lab)); });
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(JSON.parse(localStorage.getItem(key)).organNotes).toEqual(state.organNotes);
  }
  async function choosePig() { await act(async () => { host.querySelector('#diss-specimen-tab-pig').click(); }); }

  it('keeps the in-memory version when another same-page writer changed the stored record after autosave', async () => {
    await mountAndSave();
    const before = structuredClone(state);
    const other = JSON.parse(localStorage.getItem(key));
    other.organNotes = { 'frog|dorsal_skin': 'A different embedded lab wrote this observation.' };
    const otherRaw = JSON.stringify(other);
    const canvas = host.querySelector('[data-diss-canvas]');
    const gesture = { active: true, pointerId: 7 };
    canvas._probeDrag = gesture;
    // Writes in this page do not emit a StorageEvent to this page.
    localStorage.setItem(key, otherRaw);
    await choosePig();
    expect(state.specimen).toBe('frog');
    expect(state.organNotes).toEqual(before.organNotes);
    expect(state.procedureByLayer).toEqual(before.procedureByLayer);
    expect(state.attemptArchive).toEqual(before.attemptArchive);
    expect(canvas._probeDrag).toBe(gesture);
    expect(localStorage.getItem(key)).toBe(otherRaw);
    expect(state.procedureFeedback.message).toMatch(/not changed|not switched/i);
    expect(host.querySelector('#diss-protected-save-retry')).not.toBeNull();
  });

  it.each([
    ['deleted', null],
    ['malformed', '{broken'],
    ['newer version', '{"schemaVersion":999,"organNotes":{"frog|dorsal_skin":"Protected future work"}}'],
  ])('preserves work and the external %s record without silently accepting a new baseline', async (_label, raw) => {
    await mountAndSave(); const notes = structuredClone(state.organNotes);
    if (raw == null) localStorage.removeItem(key); else localStorage.setItem(key, raw);
    await choosePig();
    expect(state.specimen).toBe('frog'); expect(state.organNotes).toEqual(notes);
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(localStorage.getItem(key)).toBe(raw);
    expect(host.querySelector('#diss-protected-save-retry')).not.toBeNull();
  });

  it('keeps the current attempt when stored progress becomes unreadable after autosave', async () => {
    await mountAndSave(); const before = structuredClone(state);
    const getItem = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (name) {
      if (name === key) throw new DOMException('Storage inaccessible', 'SecurityError');
      return getItem.call(this, name);
    });
    await choosePig();
    expect(state.specimen).toBe('frog');
    expect(state.organNotes).toEqual(before.organNotes);
    expect(state.procedureByLayer).toEqual(before.procedureByLayer);
  });

  it('allows an ordinary switch after the latest record is already fully saved', async () => {
    await mountAndSave(); const raw = localStorage.getItem(key);
    await choosePig();
    expect(state.specimen).toBe('pig');
    expect(localStorage.getItem(key)).toBe(raw);
  });
});
