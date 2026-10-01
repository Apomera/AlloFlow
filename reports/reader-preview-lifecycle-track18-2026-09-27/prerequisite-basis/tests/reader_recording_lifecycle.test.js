// Recording ownership, cancellation, and visible completion through route changes.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule('view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
});
beforeEach(() => { localStorage.clear(); });
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); root = null; host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const key of ['__alloStoreRecordedSentenceAudio', '__alloRemoveSentenceAudio', '__alloGetReadAloudAudioSummary', '__alloInspectReadAloudAudio', '__alloPrepareReadAloud', '__alloQuarantineReadAloudAudio', '__alloReadAloudProfileRevision']) delete window[key];
  if (window.AlloModules.KaraokeAudioStore) window.AlloModules.KaraokeAudioStore.current = null;
});
const TEXT = 'Plants need light. Roots take in water.';
function mount(extra = {}) {
  const noop = () => {};
  let props = { ComplexityGauge: () => null, t: k => k, generatedContent: { id: 'audio-1', type: 'simplified', data: TEXT, config: { language: 'English' }, instructionalText: { form: 'adapted', role: 'supplemental' } }, selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English', isTeacherMode: true, isZenMode: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleSpeak: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: x => x, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text: m }) => m }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [], setFocusedParagraphIndex: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, handleToggleIsEditingLeveledText: noop, handleSimplifiedTextChange: noop, handleFormatText: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, setSelectionMenu: noop, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = next => { props = { ...props, ...next }; act(() => root.render(React.createElement(View, props))); };
  render({}); return { render, get props() { return props; } };
}
let recorders, streams, getMedia;
const mediaDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
class Recorder {
  static isTypeSupported() { return true; }
  constructor(stream, options = {}) { this.stream = stream; this.mimeType = options.mimeType || 'audio/webm'; this.state = 'inactive'; recorders.push(this); }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; }
  async finish(text = 'one take') { this.ondataavailable?.({ data: new Blob([text], { type: this.mimeType }) }); await this.onstop?.(); }
}
const newStream = () => { const stop = vi.fn(); const stream = { getTracks: () => [{ stop }], stop }; streams.push(stream); return stream; };
const toggle = () => host.querySelector('[data-manage-narration]');
const record = () => host.querySelector('[data-audio-sentence-index="0"] button[aria-label="word_sounds.voice_pack_tab_record 1"]');
const stopRecord = () => host.querySelector('[data-audio-sentence-index="0"] button[aria-label="common.stop 1"]');
const notice = () => host.querySelector('[data-edit-audio-status]');
const retryTake = () => host.querySelector('[data-retry-recording]');
const discardTake = () => host.querySelector('[data-discard-recording]');
const open = () => act(() => toggle().click());
const start = async () => { await act(async () => record().click()); return recorders.at(-1); };
const nextReading = view => { view.render({ generatedContent: { ...view.props.generatedContent, id: 'audio-2' } }); open(); };

beforeEach(() => {
  recorders = []; streams = [];
  vi.stubGlobal('MediaRecorder', Recorder);
  getMedia = vi.fn(async () => newStream());
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: getMedia } });
  window.__alloStoreRecordedSentenceAudio = vi.fn(async () => true);
});
afterEach(() => {
  if (mediaDescriptor) Object.defineProperty(navigator, 'mediaDevices', mediaDescriptor);
  else delete navigator.mediaDevices;
});

describe('recording request ownership', () => {
  it('does not let an old permission rejection stop the next reading microphone', async () => {
    let rejectOld;
    getMedia.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; }));
    const view = mount(); open(); await act(async () => record().click());
    nextReading(view); await start();
    await act(async () => rejectOld(new Error('Old permission denied')));
    expect(streams[0].stop).not.toHaveBeenCalled();
    expect(stopRecord()).not.toBeNull();
  });

  it('ignores a queued stop event after an inactive recorder belongs to an old reading', async () => {
    const view = mount(); open(); const old = await start();
    act(() => stopRecord().click());
    nextReading(view);
    await act(async () => old.finish('old take'));
    expect(window.__alloStoreRecordedSentenceAudio).not.toHaveBeenCalled();
    expect(notice().textContent).not.toContain('saved');
  });

  it('keeps old event callbacks out of the new recording buffer and stream', async () => {
    const view = mount(); open(); const old = await start();
    const lateData = old.ondataavailable, lateStop = old.onstop;
    nextReading(view); const current = await start();
    await act(async () => { lateData({ data: new Blob(['old take']) }); await lateStop(); });
    expect(streams[1].stop).not.toHaveBeenCalled();
    expect(window.__alloStoreRecordedSentenceAudio).not.toHaveBeenCalled();
    act(() => stopRecord().click()); await act(async () => current.finish('new take'));
    const savedBlob = window.__alloStoreRecordedSentenceAudio.mock.calls[0][1];
    expect(savedBlob.size).toBe(new Blob(['new take']).size);
  });

  it.each(['text', 'language'])('ends a recording when the same reading changes %s', async changed => {
    const view = mount(); open(); const old = await start();
    view.render({ generatedContent: { ...view.props.generatedContent, ...(changed === 'text' ? { data: 'Changed wording.' } : { config: { language: 'Spanish' } }) } });
    expect(streams[0].stop).toHaveBeenCalled();
    expect(notice().textContent).not.toContain('Recording sentence');
    await act(async () => old.finish());
    expect(window.__alloStoreRecordedSentenceAudio).not.toHaveBeenCalled();
  });

  it('aborts an in-flight recording save and ignores its late failure in the next reading', async () => {
    let finishOld;
    const save = window.__alloStoreRecordedSentenceAudio = vi.fn(() => new Promise(resolve => { finishOld = resolve; }));
    const view = mount(); open(); const old = await start(); act(() => stopRecord().click());
    let pending; await act(async () => { pending = old.finish(); });
    const signal = save.mock.calls[0][3]?.signal;
    expect(signal).toBeDefined();
    nextReading(view); await start();
    expect(signal.aborted).toBe(true);
    await act(async () => { finishOld(false); await pending; });
    expect(notice().textContent).toContain('Recording sentence 1');
    expect(stopRecord()).not.toBeNull();
  });

  it('finishes and reports a recording after closing narration in the same reading', async () => {
    mount(); open(); const recorder = await start();
    act(() => host.querySelector('[data-close-narration]').click());
    await act(async () => recorder.finish());
    expect(window.__alloStoreRecordedSentenceAudio).toHaveBeenCalledOnce();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(notice()).not.toBeNull();
    expect(notice().textContent).toContain('Teacher recording ready for sentence 1');
    expect(notice().textContent).toContain('Check device save status');
    expect(notice().getAttribute('aria-atomic')).toBe('true');
  });

  it('guards rapid recording activation before React publishes busy state', async () => {
    let resolvePermission;
    getMedia.mockImplementation(() => new Promise(resolve => { resolvePermission = resolve; }));
    mount(); open(); await act(async () => { record().click(); record().click(); });
    expect(getMedia).toHaveBeenCalledOnce();
    await act(async () => resolvePermission(newStream()));
  });

  it('cancels a pending permission request when narration closes', async () => {
    let resolvePermission;
    getMedia.mockImplementationOnce(() => new Promise(resolve => { resolvePermission = resolve; }));
    mount(); open(); await act(async () => record().click());
    act(() => host.querySelector('[data-close-narration]').click());
    expect(notice().textContent).toContain('Microphone request cancelled');
    const stream = newStream(); await act(async () => resolvePermission(stream));
    expect(stream.stop).toHaveBeenCalled(); expect(recorders).toHaveLength(0);
  });

  it('cleans up active recording when teacher controls become unavailable', async () => {
    const view = mount(); open(); const recorder = await start();
    view.render({ isTeacherMode: false });
    expect(streams[0].stop).toHaveBeenCalled();
    await act(async () => recorder.finish());
    expect(window.__alloStoreRecordedSentenceAudio).not.toHaveBeenCalled();
  });

  it('keeps a human recording active when only the selected AI voice changes', async () => {
    const view = mount(); open(); await start();
    view.render({ selectedVoice: 'Puck' });
    expect(streams[0].stop).not.toHaveBeenCalled(); expect(stopRecord()).not.toBeNull();
  });

  it('does not report readiness when the recording API returns no result', async () => {
    window.__alloStoreRecordedSentenceAudio = vi.fn(async () => undefined);
    mount(); open(); const recorder = await start(); act(() => stopRecord().click());
    await act(async () => recorder.finish());
    expect(notice().textContent).toContain('Could not save the recording');
    expect(notice().textContent).not.toContain('Teacher recording saved');
  });

  it('retries the same take and identity after Close without reopening the microphone', async () => {
    const save = window.__alloStoreRecordedSentenceAudio = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mount(); open(); const recorder = await start();
    act(() => host.querySelector('[data-close-narration]').click());
    await act(async () => recorder.finish('retained teacher take'));
    expect(retryTake()).not.toBeNull();
    expect(host.querySelector('[data-recording-recovery]').textContent).toContain('Leaving or reloading clears this take');
    const first = save.mock.calls[0];
    const replacement = window.__alloStoreRecordedSentenceAudio = vi.fn(async () => true);
    retryTake().focus(); await act(async () => retryTake().click());
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][1]).toBe(first[1]);
    expect(save.mock.calls[1][3]).toEqual(first[3]);
    expect(replacement).not.toHaveBeenCalled();
    expect(getMedia).toHaveBeenCalledOnce();
    expect(retryTake()).toBeNull(); expect(document.activeElement).toBe(toggle());
    expect(notice().textContent).toContain('Teacher recording ready');
  });

  it('keeps recovery available after another failed retry', async () => {
    const save = window.__alloStoreRecordedSentenceAudio = vi.fn(async () => false);
    mount(); open(); const recorder = await start(); act(() => stopRecord().click());
    await act(async () => recorder.finish());
    expect(retryTake()).not.toBeNull();
    retryTake().focus(); await act(async () => retryTake().click());
    expect(save).toHaveBeenCalledTimes(2); expect(getMedia).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(retryTake());
    expect(retryTake().getAttribute('aria-disabled')).toBe('false');
    expect(notice().textContent).toContain('available to retry');
  });

  it('guards duplicate retry and discard while saving, retaining focus on the busy action', async () => {
    let resolveRetry;
    const save = window.__alloStoreRecordedSentenceAudio = vi.fn().mockResolvedValueOnce(false).mockImplementationOnce(() => new Promise(resolve => { resolveRetry = resolve; }));
    mount(); open(); const recorder = await start(); act(() => stopRecord().click()); await act(async () => recorder.finish());
    expect(retryTake()).not.toBeNull(); retryTake().focus();
    await act(async () => { retryTake().click(); retryTake().click(); discardTake().click(); });
    expect(save).toHaveBeenCalledTimes(2);
    expect(retryTake().getAttribute('aria-busy')).toBe('true');
    expect(discardTake().getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(retryTake());
    await act(async () => resolveRetry(true));
    expect(retryTake()).toBeNull(); expect(document.activeElement).toBe(toggle());
  });

  it('does not steal focus from another control when retry succeeds', async () => {
    let resolveRetry;
    window.__alloStoreRecordedSentenceAudio = vi.fn().mockResolvedValueOnce(false).mockImplementationOnce(() => new Promise(resolve => { resolveRetry = resolve; }));
    mount(); open(); const recorder = await start(); act(() => stopRecord().click()); await act(async () => recorder.finish());
    expect(retryTake()).not.toBeNull(); retryTake().focus(); await act(async () => retryTake().click());
    const close = host.querySelector('[data-close-narration]'); close.focus();
    await act(async () => resolveRetry(true)); expect(document.activeElement).toBe(close);
  });

  it('discards only the temporary take, restores focus, and enables another recording', async () => {
    const save = window.__alloStoreRecordedSentenceAudio = vi.fn(async () => false);
    const remove = window.__alloRemoveSentenceAudio = vi.fn();
    mount(); open(); const recorder = await start(); act(() => stopRecord().click()); await act(async () => recorder.finish());
    expect(discardTake()).not.toBeNull(); expect(record().getAttribute('aria-disabled')).toBe('true');
    discardTake().focus(); act(() => discardTake().click());
    expect(retryTake()).toBeNull(); expect(document.activeElement).toBe(toggle());
    expect(notice().textContent).toContain('Unsaved take discarded');
    expect(remove).not.toHaveBeenCalled(); expect(save).toHaveBeenCalledOnce();
    expect(record().getAttribute('aria-disabled')).toBe('false'); await start(); expect(getMedia).toHaveBeenCalledTimes(2);
    delete window.__alloRemoveSentenceAudio;
  });

  it.each(['reading', 'text', 'language', 'eligibility'])('clears a retained take after changing %s', async changed => {
    const save = window.__alloStoreRecordedSentenceAudio = vi.fn(async () => false);
    const view = mount(); open(); const recorder = await start(); act(() => stopRecord().click()); await act(async () => recorder.finish());
    expect(retryTake()).not.toBeNull(); const signal = save.mock.calls[0][3].signal;
    if(changed==='eligibility')view.render({isTeacherMode:false});
    else view.render({generatedContent:{...view.props.generatedContent,...(changed==='reading'?{id:'audio-2'}:changed==='text'?{data:'Changed wording.'}:{config:{language:'Spanish'}})}});
    expect(retryTake()).toBeNull(); expect(signal.aborted).toBe(true); expect(save).toHaveBeenCalledOnce();
  });

  it('ignores an old retry result after navigation while keeping the new failed take', async () => {
    let resolveRetry;
    const save = window.__alloStoreRecordedSentenceAudio = vi.fn().mockResolvedValueOnce(false).mockImplementationOnce(() => new Promise(resolve => { resolveRetry = resolve; })).mockResolvedValueOnce(false);
    const view = mount(); open(); const old = await start(); act(() => stopRecord().click()); await act(async () => old.finish('old'));
    expect(retryTake()).not.toBeNull(); await act(async () => retryTake().click());
    const oldSignal = save.mock.calls[1][3].signal;
    nextReading(view); const current = await start(); act(() => stopRecord().click()); await act(async () => current.finish('new'));
    expect(oldSignal.aborted).toBe(true); expect(retryTake()).not.toBeNull();
    await act(async () => resolveRetry(true));
    expect(retryTake()).not.toBeNull(); expect(notice().textContent).toContain('available to retry');
    expect(save).toHaveBeenCalledTimes(3);
  });

  it('moves the focused Stop control to Retry when adding that take fails', async () => {
    window.__alloStoreRecordedSentenceAudio = vi.fn(async () => false);
    mount(); open(); const recorder = await start(); stopRecord().focus(); act(() => stopRecord().click());
    await act(async () => recorder.finish());
    expect(retryTake()).not.toBeNull(); expect(document.activeElement).toBe(retryTake());
    act(() => record().click()); expect(getMedia).toHaveBeenCalledOnce();
  });

  it('clears a failed take on unmount', async () => {
    const save = window.__alloStoreRecordedSentenceAudio = vi.fn(async () => false);
    mount(); open(); const recorder = await start(); act(() => stopRecord().click()); await act(async () => recorder.finish());
    expect(retryTake()).not.toBeNull(); const signal = save.mock.calls[0][3].signal;
    act(() => root.unmount()); root = null;
    expect(signal.aborted).toBe(true); expect(retryTake()).toBeNull();
  });
});
