// Truthful local audio readiness: identity, lifecycle updates, and recovery.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';
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
  for (const key of ['__alloGetReadAloudAudioSummary', '__alloInspectReadAloudAudio', '__alloPrepareReadAloud', '__alloQuarantineReadAloudAudio', '__alloReadAloudProfileRevision']) delete window[key];
});
const TEXT = 'Plants need light. Roots take in water.';
function mount(extra = {}) {
  const noop = () => {};
  let props = { ComplexityGauge: () => null, t: k => k, generatedContent: { id: 'audio-1', type: 'simplified', data: TEXT, config: { language: 'English' }, instructionalText: { form: 'adapted', role: 'supplemental' } }, selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English', isTeacherMode: true, isZenMode: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleSpeak: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: x => x, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text: m }) => m }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [], setFocusedParagraphIndex: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, handleToggleIsEditingLeveledText: noop, handleSimplifiedTextChange: noop, handleFormatText: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, setSelectionMenu: noop, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = next => { props = { ...props, ...next }; act(() => root.render(React.createElement(View, props))); };
  render({}); return { render, get props() { return props; } };
}
const row = () => host.querySelector('[data-review-state="audio"]');
const recovery = () => row()?.querySelector('[data-review-action="audio"]');
const update = type => act(() => window.dispatchEvent(new CustomEvent(type, { detail: { resourceId: 'audio-1' } })));
const summary = (ready, stale = 0, corrupt = 0, missing = 2 - ready - stale - corrupt) => ({ total: 2, ready, stale, corrupt, missing });

describe('teacher audio readiness', () => {
  it.each([
    ['all stale', summary(0, 2), 'Audio not prepared', 0],
    ['mixed ready/stale', summary(1, 1), 'Audio partly prepared', 1],
    ['corrupt and missing', summary(0, 0, 1, 1), 'Audio not prepared', 0],
    ['partially missing', summary(1), 'Audio partly prepared', 1],
  ])('%s keeps preparation available', (_name, state, label, ready) => {
    window.__alloGetReadAloudAudioSummary = () => state;
    mount();
    expect(row().textContent).toContain(label);
    expect(row().textContent).toContain(`${ready} of 2`);
    expect(row().textContent).not.toContain('without waiting');
    expect(recovery()).not.toBeNull();
    expect(row().getAttribute('data-review-tone')).not.toBe('ok');
  });
  it('only all-ready audio is prepared, with a device-scoped claim', () => {
    window.__alloGetReadAloudAudioSummary = () => summary(2);
    mount();
    expect(row().textContent).toContain('Audio prepared');
    expect(row().textContent).toContain('on this device');
    expect(recovery()).toBeNull();
  });
  it.each([['selectedVoice', 'Aoede'], ['voiceSpeed', 0.8], ['leveledTextLanguage', 'Spanish']])('rechecks a changed %s without playback', (key, value) => {
    let state = summary(2);
    const resolver = window.__alloGetReadAloudAudioSummary = vi.fn(() => state);
    const view = mount();
    state = summary(0, 2);
    view.render(key === 'leveledTextLanguage'
      ? { generatedContent: { ...view.props.generatedContent, config: { language: value } } }
      : { [key]: value });
    expect(row().textContent).toContain('Audio not prepared');
    expect(recovery()).not.toBeNull();
    const options = resolver.mock.calls.at(-1)[2];
    expect(options.profile).toMatchObject({ voice: key === 'selectedVoice' ? value : 'Kore', synthesisRate: key === 'voiceSpeed' ? value : 1 });
    expect(options.entries.every(entry => entry.language === (key === 'leveledTextLanguage' ? value : 'English'))).toBe(true);
  });
  it.each(['alloflow:karaoke-audio-updated', 'alloflow:karaoke-audio-capture', 'alloflow:read-aloud-reconciled'])('rechecks store changes after %s', type => {
    let state = summary(2); window.__alloGetReadAloudAudioSummary = () => state;
    mount(); state = summary(1);
    act(() => window.dispatchEvent(new CustomEvent(type, { detail: { resourceId: 'audio-1', sentence: 'Plants need light.', status: 'saved' } })));
    expect(row().textContent).toContain('1 of 2'); expect(recovery()).not.toBeNull();
    state = summary(2); update('alloflow:karaoke-audio-updated');
    expect(row().textContent).toContain('Audio prepared');
  });
  it('rechecks same-ID payload replacement in both directions', () => {
    let state = summary(2); window.__alloGetReadAloudAudioSummary = () => state;
    const view = mount();
    state = summary(0); view.render({ generatedContent: { ...view.props.generatedContent, karaokeAudio: { version: 4, entries: {} } } });
    expect(row().textContent).toContain('Audio not prepared');
    state = summary(2); view.render({ generatedContent: { ...view.props.generatedContent, karaokeAudio: { version: 4, entries: { restored: true } } } });
    expect(row().textContent).toContain('Audio prepared');
  });
  it('recovers from unavailable tools when the module registry changes', () => {
    mount();
    expect(row().textContent).toContain('Audio status unavailable');
    expect(recovery()).not.toBeNull();
    window.__alloGetReadAloudAudioSummary = () => summary(2);
    update('alloflow:module-registry-changed');
    expect(row().textContent).toContain('Audio prepared');
  });
  it('rechecks text and resource changes and does not resplit on unrelated renders', () => {
    const resolver = window.__alloGetReadAloudAudioSummary = vi.fn(texts => ({ ready: texts.filter(t => t === 'Plants need light.' || t === 'Roots take in water.').length }));
    const view = mount(); const before = resolver.mock.calls.length;
    view.render({ chunkReaderSweepPct: 42 }); expect(resolver).toHaveBeenCalledTimes(before);
    view.render({ generatedContent: { ...view.props.generatedContent, data: 'Plants need light. Birds sing.' } });
    expect(row().textContent).toContain('1 of 2');
    const afterText = resolver.mock.calls.length;
    view.render({ generatedContent: { ...view.props.generatedContent, id: 'audio-2' } });
    expect(resolver.mock.calls.length).toBeGreaterThan(afterText);
  });
  it.each(['speed', 'provider/model'])('cancels %s-invalidated preparation and retains retry after partial completion', async change => {
    window.__alloGetReadAloudAudioSummary = () => summary(0);
    let finish; let signal;
    window.__alloPrepareReadAloud = vi.fn((_texts, _progress, options) => { signal = options.signal; return new Promise(resolve => { finish = resolve; }); });
    const view = mount();
    await act(async () => { recovery().click(); });
    expect(recovery()?.textContent).toContain('Stop');
    if (change === 'speed') view.render({ voiceSpeed: 0.8 });
    else { window.__alloReadAloudProfileRevision = 'new-provider/model'; view.render({}); }
    expect(signal.aborted).toBe(true);
    await act(async () => { finish({ ok: true, remaining: 0 }); });
    expect(row().textContent).toContain('Audio not prepared');
    expect(recovery().textContent).toContain('Save audio');
    expect(host.querySelector('[data-tts-prep-status]').textContent).not.toContain('saved for all');
  });

  it.each(['NotSupportedError', 'NotAllowedError', 'AbortError'])('handles edit-audio %s without a false prepared claim', async name => {
    let state = summary(2);
    window.__alloGetReadAloudAudioSummary = () => state;
    window.__alloInspectReadAloudAudio = sentence => ({
      status: state.corrupt && sentence === 'Plants need light.' ? 'corrupt' : 'ready',
      url: 'blob:clip', storedUrl: 'blob:clip', source: 'ai', metadata: { voice: 'Kore' }
    });
    window.__alloQuarantineReadAloudAudio = vi.fn(async () => { state = summary(1, 0, 1); return true; });
    vi.stubGlobal('Audio', class {
      play() { return Promise.reject(Object.assign(new Error('Media failed'), { name })); }
      pause() {}
    });
    mount({ isEditingLeveledText: true, t: key => key === 'common.play' ? 'Play' : key });
    await act(async () => { host.querySelector('button[aria-controls^="allo-edit-audio-"]').click(); });
    await act(async () => { host.querySelector('button[aria-label="Play 1"]').click(); });
    if (name === 'NotAllowedError' || name === 'AbortError') {
      expect(window.__alloQuarantineReadAloudAudio).not.toHaveBeenCalled();
      expect(row().textContent).toContain('Audio prepared');
    } else {
      expect(window.__alloQuarantineReadAloudAudio).toHaveBeenCalledWith('Plants need light.', expect.objectContaining({ code: 'media-playback-failed' }), expect.objectContaining({ occurrence: 0 }));
      expect(row().textContent).toContain('1 of 2');
      expect(recovery()).not.toBeNull();
    }
  });

  it('rechecks provider/model identity when the host revision changes', () => {
    let state = summary(2); window.__alloGetReadAloudAudioSummary = () => state;
    window.__alloReadAloudProfileRevision = 'gemini/model-a';
    const view = mount();
    state = summary(0, 2); window.__alloReadAloudProfileRevision = 'gemini/model-b';
    view.render({});
    expect(row().textContent).toContain('Audio not prepared');
    expect(recovery()).not.toBeNull();
  });

  it('the actual host wrapper forwards summary descriptors and profile', () => {
    const source = readFileSync(resolve('AlloFlowANTI.txt'), 'utf8');
    const start = source.indexOf('window.__alloGetReadAloudAudioSummary =');
    const end = source.indexOf('\n  };', start) + '\n  };'.length;
    const hostWindow = {};
    const bridge = { summary: vi.fn(() => summary(2)) };
    new Function('window', '_getReadAloudBridge', source.slice(start, end))(hostWindow, () => bridge);
    const options = { entries: [{ text: 'Hola.', language: 'Spanish' }], profile: { voice: 'Aoede' } };
    hostWindow.__alloGetReadAloudAudioSummary(['Hola.'], 'reference', options);
    expect(bridge.summary).toHaveBeenCalledWith(['Hola.'], 'reference', options);
  });

  it('deleting temporary TTS cache does not delete saved resource audio', async () => {
    loadAlloModule('karaoke_audio_store_module.js');
    loadAlloModule('read_aloud_audio_service_module.js');
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:durable', revokeObjectURL: vi.fn() });
    const store = window.AlloModules.KaraokeAudioStore.createStore();
    const entries = [{ text: 'Plants need light.', segmentId: 'one' }, { text: 'Roots take in water.', segmentId: 'two' }];
    const bridge = window.AlloModules.createReadAloudLegacyBridge({
      getResource: () => ({ id: 'audio-1', type: 'simplified', data: TEXT }),
      getStore: () => store,
      getProfile: () => ({ voice: 'Kore', language: 'English', synthesisRate: 1, voiceResolverVersion: 2 }),
      enumerateResourceSegments: () => entries,
      synthesize: async () => ({ b64: validAudioBase64(), mime: 'audio/mpeg' }),
    });
    await bridge.prepare(entries);
    window.__alloGetReadAloudAudioSummary = (...args) => bridge.summary(...args);
    mount();
    const source = readFileSync(resolve('AlloFlowANTI.txt'), 'utf8');
    const start = source.indexOf('window.__clearAlloTtsCacheForWord =');
    const end = source.indexOf('\n  };', start) + '\n  };'.length;
    const hostWindow = {};
    const cache = new Map([['plants need light.__Kore', 'blob:temporary']]);
    new Function('window', 'globalTtsUrlCache', source.slice(start, end))(hostWindow, cache);
    expect(hostWindow.__clearAlloTtsCacheForWord('Plants need light.')).toBe(1);
    update('alloflow:karaoke-audio-updated');
    expect(row().textContent).toContain('Audio prepared');
    expect(bridge.summary(entries)).toMatchObject({ ready: 2, missing: 0 });
    store.clear(); update('alloflow:karaoke-audio-updated');
    expect(row().textContent).toContain('Audio not prepared');
    expect(recovery()).not.toBeNull();
  });
});
