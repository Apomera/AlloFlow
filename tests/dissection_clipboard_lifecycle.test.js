import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
let clipboardDescriptor, clipboard;
const settle = () => new Promise(resolve => setTimeout(resolve, 15));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function mount() {
  const config = window.StemLab._registry.dissection || loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), pluginInstanceToken = {};
  const announce = vi.fn(), toast = vi.fn();
  let state, update, closed = false;
  function Lab() {
    const [toolData, setToolData] = React.useState({ dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', workspaceMode: 'advanced',
      toolbarToolsOpen: true, _labReportPreviewOpen: true, reducedMotion: true, soundEnabled: false,
      exploredOrgans: { 'frog|nictitating': true }, organNotes: { 'frog|nictitating': 'My membrane observation.' },
      organConfidence: { 'frog|nictitating': 2 },
    } });
    state = toolData.dissection; update = setToolData;
    return config.render(makeCtx({ toolData, setToolData, pluginInstanceToken, announceToSR: announce, addToast: toast }));
  }
  const fixture = { host, announce, toast, get state() { return state; },
    async click(label) {
      const button = [...host.querySelectorAll('button')].find(node => node.textContent === label);
      expect(button).toBeTruthy();
      await act(async () => { button.click(); await Promise.resolve(); });
    },
    async patch(patch) { await act(async () => { update(previous => ({ ...previous, dissection: { ...previous.dissection, ...patch } })); await Promise.resolve(); }); },
    async close() { if (closed) return; closed = true; await act(async () => { root.unmount(); }); host.remove(); await act(async () => { await settle(); }); }
  };
  fixtures.push(fixture);
  await act(async () => { root.render(React.createElement(Lab)); });
  await act(async () => { await settle(); });
  return fixture;
}

beforeEach(() => {
  localStorage.clear(); resetStemLab();
  clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  clipboard = { writeText: vi.fn() };
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(async () => {
  for (const f of fixtures.splice(0).reverse()) await f.close();
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor); else delete navigator.clipboard;
  vi.restoreAllMocks(); localStorage.clear();
});
async function finish(request, failure = false) {
  await act(async () => { if (failure) request.reject(new Error('Clipboard denied')); else request.resolve(); await Promise.resolve(); });
}
const copied = 'Lab report copied to the clipboard.';

describe('dissection clipboard outcome ownership', () => {
  it('waits for completion and keeps the request through ordinary time and state renders', async () => {
    const request = deferred(); clipboard.writeText.mockReturnValue(request.promise);
    const f = await mount(); await f.click('Copy lab report');
    expect(clipboard.writeText.mock.calls[0][0]).toContain('My membrane observation.');
    expect(f.announce).not.toHaveBeenCalledWith(copied);
    await f.patch({ timeSpent: 37 });
    await finish(request);
    expect(f.state.procedureFeedback).toMatchObject({ message: copied, tone: 'success' });
    expect(f.toast).toHaveBeenCalledWith(copied, 'success');
    expect(f.state.organNotes).toEqual({ 'frog|nictitating': 'My membrane observation.' });
  });

  it.each([false, true])('ignores an older copy outcome after a newer copy, older failure=%s', async failure => {
    const older = deferred(), newer = deferred();
    clipboard.writeText.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    const f = await mount(); await f.click('Copy lab report'); await f.click('Copy lab report');
    await finish(older, failure);
    expect(f.toast).not.toHaveBeenCalled();
    await finish(newer, !failure);
    expect(f.toast).toHaveBeenCalledTimes(1);
    expect(f.state.procedureFeedback.tone).toBe(failure ? 'success' : 'caution');
    const feedback = f.state.procedureFeedback;
    expect(feedback.message).toContain(failure ? 'copied to the clipboard' : 'could not be copied');
  });

  it('does not let an old success replace a newer denied copy', async () => {
    const older = deferred(), newer = deferred();
    clipboard.writeText.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    const f = await mount(); await f.click('Copy lab report'); await f.click('Copy lab report');
    await finish(newer, true);
    const failure = f.state.procedureFeedback;
    await finish(older);
    expect(f.state.procedureFeedback).toEqual(failure);
    expect(f.toast).toHaveBeenCalledTimes(1);
    expect(f.announce).not.toHaveBeenCalledWith(copied);
  });

  it.each([false, true])('retires outcomes across specimen navigation, returning to original=%s', async returnToOriginal => {
    const request = deferred(); clipboard.writeText.mockReturnValue(request.promise);
    const f = await mount(); await f.click('Copy lab report');
    await f.patch({ specimen: 'pig', _dissLoadedSpec: 'pig' });
    if (returnToOriginal) await f.patch({ specimen: 'frog', _dissLoadedSpec: 'frog' });
    const feedback = f.state.procedureFeedback; f.announce.mockClear(); f.toast.mockClear();
    await finish(request);
    expect(f.state.procedureFeedback).toEqual(feedback);
    expect(f.toast).not.toHaveBeenCalled(); expect(f.announce).not.toHaveBeenCalled();
  });

  it('keeps a newer action status instead of overwriting it with delayed export feedback', async () => {
    const request = deferred(); clipboard.writeText.mockReturnValue(request.promise);
    const f = await mount(); await f.click('Copy lab report');
    await f.click('Select report');
    const feedback = f.state.procedureFeedback;
    expect(feedback.message).toContain('Report selected');
    f.announce.mockClear(); f.toast.mockClear();
    await finish(request, true);
    expect(f.state.procedureFeedback).toEqual(feedback);
    expect(f.toast).not.toHaveBeenCalled(); expect(f.announce).not.toHaveBeenCalled();
  });

  it('retires a report result when assessment replaces the export workflow', async () => {
    const request = deferred(); clipboard.writeText.mockReturnValue(request.promise);
    const f = await mount(); await f.click('Copy lab report');
    await f.patch({ quizMode: true });
    f.announce.mockClear(); f.toast.mockClear();
    await finish(request);
    expect(f.toast).not.toHaveBeenCalled(); expect(f.announce).not.toHaveBeenCalled();
  });

  it.each([false, true])('does not announce after the originating lab unmounts, failure=%s', async failure => {
    const request = deferred(); clipboard.writeText.mockReturnValue(request.promise);
    const f = await mount(); await f.click('Copy lab report'); await f.close();
    f.announce.mockClear(); f.toast.mockClear();
    await finish(request, failure);
    expect(f.toast).not.toHaveBeenCalled(); expect(f.announce).not.toHaveBeenCalled();
  });

  it('keeps independent pending copies owned by their corresponding lab roots', async () => {
    const a = deferred(), b = deferred();
    clipboard.writeText.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const first = await mount(), second = await mount();
    await first.click('Copy lab report'); await second.click('Copy lab report');
    await finish(a);
    expect(first.toast).toHaveBeenCalledWith(copied, 'success');
    expect(second.toast).not.toHaveBeenCalled();
    await finish(b, true);
    expect(second.state.procedureFeedback.tone).toBe('caution');
    expect(first.state.procedureFeedback.message).toBe(copied);
  });
});
