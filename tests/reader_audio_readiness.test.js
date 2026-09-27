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
const row = () => host.querySelector('[data-review-state="audio"]');
const recovery = () => row()?.querySelector('[data-review-action="audio"]');
const update = type => act(() => window.dispatchEvent(new CustomEvent(type, { detail: { resourceId: 'audio-1' } })));
const summary = (ready, stale = 0, corrupt = 0, missing = 2 - ready - stale - corrupt) => ({ total: 2, ready, stale, corrupt, missing });

function liveStore() {
  loadAlloModule('karaoke_audio_store_module.js');
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:local', revokeObjectURL: vi.fn() });
  const KS = window.AlloModules.KaraokeAudioStore;
  const store = KS.current = KS.createStore();
  const sentences = ['Plants need light.', 'Roots take in water.'];
  const profile = { voice: 'Kore', language: 'English', synthesisRate: 1, voiceResolverVersion: 2 };
  const save = (target = store) => sentences.forEach(sentence => target.put(sentence, validAudioBase64(), 'audio/wav', 'ai', profile));
  save();
  window.__alloGetReadAloudAudioSummary = vi.fn(() => {
    const state = summary(0, 0, 0, 0);
    sentences.forEach(sentence => { state[KS.current.inspect(sentence, profile).status]++; });
    return state;
  });
  return { KS, store, sentences, save };
}

describe('teacher audio readiness', () => {
  it('distinguishes unknown settings from clips that need updating and from damage', () => {
    window.__alloGetReadAloudAudioSummary = () => ({ ...summary(0, 1, 1, 0), unverified: 1 });
    mount();
    expect(row().textContent).toContain('To update: 0; unknown settings: 1; damaged: 1; missing: 0.');
  });
  it('shows each preparation failure and opens the matching narration controls', async () => {
    window.__alloGetReadAloudAudioSummary = () => summary(0);
    window.__alloPrepareReadAloud = vi.fn(async () => ({ remaining: 2, failure: { code: 'human-recording-protected' }, failures: [
      { index: 0, text: 'Plants need light.', code: 'network-failed', action: 'retry' },
      { index: 1, text: 'Roots take in water.', code: 'human-recording-protected', action: 'review-recording' },
    ] }));
    mount(); await act(async () => { recovery().click(); });
    const panel = host.querySelector('[data-audio-preparation-issues]');
    expect(panel.querySelectorAll('li').length).toBe(2);
    expect(panel.textContent).toContain('This recording is protected');
    await act(async () => { panel.querySelectorAll('button')[1].click(); });
    expect(document.activeElement.closest('[data-audio-sentence-index]')?.getAttribute('data-audio-sentence-index')).toBe('1');
  });
  it('discards recovery details when the reading identity changes', async () => {
    window.__alloGetReadAloudAudioSummary = () => summary(0);
    window.__alloPrepareReadAloud = async () => ({ remaining: 2, failures: [{ index: 0, text: 'Plants need light.', code: 'network-failed' }] });
    const view = mount(); await act(async () => { recovery().click(); });
    expect(host.querySelector('[data-audio-preparation-issues]')).not.toBeNull();
    view.render({ generatedContent: { ...view.props.generatedContent, id: 'new-reading' } });
    expect(host.querySelector('[data-audio-preparation-issues]')).toBeNull();
  });
  it('removes an individually repaired sentence from the recovery list', async () => {
    window.__alloGetReadAloudAudioSummary = () => summary(0);
    let repaired = false;
    window.__alloInspectReadAloudAudio = () => ({ status: repaired ? 'ready' : 'missing', url: repaired ? 'blob:repaired' : null });
    window.__alloPrepareReadAloud = async () => ({ remaining: 2, failures: [{ index: 0, text: 'Plants need light.', code: 'network-failed' }] });
    mount(); await act(async () => { recovery().click(); });
    expect(host.querySelector('[data-audio-preparation-issues]')).not.toBeNull();
    repaired = true; update('alloflow:karaoke-audio-updated');
    expect(host.querySelector('[data-audio-preparation-issues]')).toBeNull();
  });
  it('retains failures reported before cancellation and clears them after a successful retry', async () => {
    let state = summary(0);
    window.__alloGetReadAloudAudioSummary = () => state;
    window.__alloPrepareReadAloud = vi.fn()
      .mockResolvedValueOnce({ cancelled: true, remaining: 2, failures: [{ index: 0, text: 'Plants need light.', code: 'network-failed' }] })
      .mockImplementationOnce(async () => { state = summary(2); return { ok: true, remaining: 0, failures: [] }; });
    mount(); await act(async () => { recovery().click(); });
    expect(host.querySelector('[data-audio-preparation-issues]')).not.toBeNull();
    await act(async () => { recovery().click(); });
    expect(host.querySelector('[data-audio-preparation-issues]')).toBeNull();
    expect(row().textContent).toContain('Audio prepared');
  });
  it('refreshes on direct store removal, hydration, quarantine, replacement and clear without window events', async () => {
    const { store, sentences, save } = liveStore(); const payload = store.serialize();
    mount(); expect(row().textContent).toContain('Audio prepared');
    await act(async () => { store.remove(sentences[0]); });
    expect(row().textContent).toContain('1 of 2'); expect(recovery()).not.toBeNull();
    await act(async () => { store.hydrate(payload); }); expect(row().textContent).toContain('Audio prepared');
    await act(async () => { store.quarantine(sentences[0], { code: 'decode-failed' }); });
    expect(row().textContent).toContain('1 of 2');
    await act(async () => { save(); }); expect(row().textContent).toContain('Audio prepared');
    await act(async () => { store.clear(); }); expect(row().textContent).toContain('0 of 2'); expect(recovery()).not.toBeNull();
  });
  it('rebinds a replaced store and ignores unrelated stores and queued old-store notifications', async () => {
    const { KS, store, save } = liveStore(); const view = mount();
    const resolver = window.__alloGetReadAloudAudioSummary; const before = resolver.mock.calls.length;
    const other = KS.createStore(); await act(async () => { save(other); other.clear(); });
    expect(resolver).toHaveBeenCalledTimes(before);
    await act(async () => { store.clear(); KS.current = other; view.render({}); });
    expect(row().textContent).toContain('0 of 2');
    const replacedCalls = resolver.mock.calls.length;
    await act(async () => { save(store); }); expect(resolver).toHaveBeenCalledTimes(replacedCalls);
    await act(async () => { save(other); }); expect(row().textContent).toContain('Audio prepared');
  });
  it('closes the render-to-subscription race when summary initializes the store', async () => {
    const { KS, store } = liveStore(); KS.current = null;
    const base = window.__alloGetReadAloudAudioSummary;
    window.__alloGetReadAloudAudioSummary = () => { KS.current = store; return base(); };
    await act(async () => { mount(); });
    await act(async () => { store.clear(); }); expect(row().textContent).toContain('0 of 2');
  });
  it('rechecks a mutation between render and subscription and batches synchronous mutations', async () => {
    const { store, save } = liveStore(); const subscribe = store.subscribe.bind(store);
    vi.spyOn(store, 'subscribe').mockImplementationOnce(listener => { store.clear(); return subscribe(listener); });
    await act(async () => { mount(); }); expect(row().textContent).toContain('0 of 2');
    const resolver = window.__alloGetReadAloudAudioSummary; const before = resolver.mock.calls.length;
    await act(async () => { save(); }); expect(row().textContent).toContain('Audio prepared');
    expect(resolver.mock.calls.length - before).toBe(1);
    await act(async () => { store.clear(); root.unmount(); root = null; });
    const afterUnmount = resolver.mock.calls.length;
    await act(async () => { save(); }); expect(resolver).toHaveBeenCalledTimes(afterUnmount);
  });
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
    expect(recovery().textContent).toContain('Prepare missing audio');
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

  it('replays a replacement URL instead of the previously decoded element', async () => {
    let url = 'blob:first'; const players = [];
    window.__alloGetReadAloudAudioSummary = () => summary(2);
    window.__alloInspectReadAloudAudio = () => ({ status: 'ready', storedUrl: url, url });
    vi.stubGlobal('Audio', class {
      constructor(src) { this.src = src; this.paused = true; this.play = vi.fn(async () => { this.paused = false; }); players.push(this); }
      pause() { this.paused = true; }
    });
    mount({ isEditingLeveledText: true, t: key => key === 'common.play' ? 'Play' : key });
    await act(async () => { host.querySelector('button[aria-controls^="allo-edit-audio-"]').click(); });
    await act(async () => { host.querySelector('button[aria-label="Play 1"]').click(); });
    await act(async () => { players[0].paused = true; players[0].onended(); });
    url = 'blob:replacement';
    await act(async () => { host.querySelector('button[aria-label="Play 1"]').click(); });
    expect(players.map(player => player.src)).toEqual(['blob:first', 'blob:replacement']);
    expect(players[0].play).toHaveBeenCalledTimes(1);
  });
  it('stops attributing an old decoder failure to a repaired clip', async () => {
    let url = 'blob:broken';
    window.__alloGetReadAloudAudioSummary = () => summary(2);
    window.__alloInspectReadAloudAudio = () => ({ status: 'ready', storedUrl: url, url });
    window.__alloQuarantineReadAloudAudio = vi.fn(async () => true);
    vi.stubGlobal('Audio', class { play() { return Promise.reject(Object.assign(new Error('decode'), { name: 'NotSupportedError' })); } pause() {} });
    mount({ isEditingLeveledText: true, t: key => key === 'common.play' ? 'Play' : key });
    await act(async () => { host.querySelector('button[aria-controls^="allo-edit-audio-"]').click(); });
    await act(async () => { host.querySelector('button[aria-label="Play 1"]').click(); });
    expect(row().textContent).toContain('1 of 2');
    url = 'blob:repaired'; update('alloflow:karaoke-audio-updated');
    expect(row().textContent).toContain('Audio prepared'); expect(recovery()).toBeNull();
  });
  it('does not quarantine a new clip for a delayed rejection from the old clip', async () => {
    let url = 'blob:old', rejectPlayback;
    window.__alloGetReadAloudAudioSummary = () => summary(2);
    window.__alloInspectReadAloudAudio = () => ({ status: 'ready', storedUrl: url, url });
    window.__alloQuarantineReadAloudAudio = vi.fn();
    vi.stubGlobal('Audio', class { play() { return new Promise((_resolve, reject) => { rejectPlayback = reject; }); } pause() {} });
    mount({ isEditingLeveledText: true, t: key => key === 'common.play' ? 'Play' : key });
    await act(async () => { host.querySelector('button[aria-controls^="allo-edit-audio-"]').click(); });
    await act(async () => { host.querySelector('button[aria-label="Play 1"]').click(); });
    url = 'blob:new';
    await act(async () => { rejectPlayback(Object.assign(new Error('old decode failed'), { name: 'NotSupportedError' })); });
    expect(window.__alloQuarantineReadAloudAudio).not.toHaveBeenCalled();
    expect(row().textContent).toContain('Audio prepared');
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
