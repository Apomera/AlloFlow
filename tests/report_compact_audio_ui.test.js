import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, pure, phase, root, host, props;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; globalThis.React = window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const file of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js']) loadAlloModule(file);
  const { INPUTS, renderReaderModule } = require('../dev-tools/lib/reader_compiler.cjs');
  new Function(renderReaderModule(INPUTS.map(file => readFileSync(file, 'utf8'))))();
  View = window.AlloModules.SimplifiedView; pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
}, 180000);
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); root = host = null; localStorage.clear();
  vi.restoreAllMocks(); vi.useRealTimers();
  for (const key of ['__alloGetReadAloudReadiness', '__alloRetryReadAloudPersistence', '__alloGetReadAloudAudioSummary', '__alloPrepareReadAloud', '__alloCancelPrepareReadAloud', '_kokoroTTS', '__compactAudioFixture']) delete window[key];
});
const TEXT = 'Plants need light. Roots take in water. Seeds can sprout. Leaves take in air. Water moves through stems.';
function installAudioFixture(options = {}) {
  const state = window.__compactAudioFixture = { id: 'compact-audio', ready: 2, saved: 0, unknown: false, prepareCalls: [], saveCalls: [], cancelCalls: 0, ...options };
  window.__alloGetReadAloudAudioSummary = () => state.unknown ? null : ({ total: 5, ready: state.ready, missing: 5 - state.ready, stale: 0, corrupt: 0, unverified: 0 });
  window.__alloGetReadAloudReadiness = async () => state.unknown ? null : ({ resourceId: state.id, scope: 'device-audio', state: state.saved === 5 ? 'ready' : state.ready > state.saved ? 'session-only' : 'partial', total: 5, ready: state.ready, durableReady: state.saved, sessionOnly: state.ready - state.saved, remaining: state.remaining ?? 5 - state.ready, nextActions: [state.ready > state.saved && 'retry-save', state.ready < 5 && 'prepare-missing'].filter(Boolean) });
  window.__alloPrepareReadAloud = (texts, progress, options) => { state.prepareCalls.push({ texts, progress, options }); return state.preparePromise || Promise.resolve({ ok: true, remaining: 0 }); };
  window.__alloRetryReadAloudPersistence = (scope, options) => { state.saveCalls.push({ scope, options }); return state.savePromise || Promise.resolve(true); };
  window.__alloCancelPrepareReadAloud = () => { state.cancelCalls++; };
  return state;
}
function mount(extra = {}) {
  const noop = () => {};
  props = { ComplexityGauge: () => null, t: key => key, generatedContent: { id: 'compact-audio', type: 'simplified', data: TEXT, config: { language: 'English' }, instructionalText: { form: 'adapted', role: 'supplemental' } }, selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English', isTeacherMode: true, isZenMode: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null, handleSpeak: noop, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: text => text, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text, latestGlossary: [], setFocusedParagraphIndex: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, handleToggleIsEditingLeveledText: noop, handleSimplifiedTextChange: noop, handleFormatText: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, setSelectionMenu: noop, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
}
function update(extra) { Object.assign(props, extra); act(() => root.render(React.createElement(View, props))); }
const panel = () => host.querySelector('[data-compact-audio]');
const detail = () => host.querySelector('[data-compact-audio-details]');
const toggle = () => host.querySelector('[data-audio-details-toggle]');
const action = key => host.querySelector('[data-review-action="' + key + '"]');
const status = () => host.querySelector('[data-device-audio-status]');
const settle = () => act(async () => {});
const click = node => act(() => node.click());
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function refresh() { act(() => window.dispatchEvent(new CustomEvent('alloflow:offline-media-persistence', { detail: { resourceId: window.__compactAudioFixture.id } }))); }

describe('compact preparation status on the mounted reader', () => {
  it('starts collapsed with session readiness, confirmed saves and actions', async () => {
    installAudioFixture(); mount(); await settle();
    expect(detail().hidden).toBe(true); expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(panel().querySelector('[data-compact-audio-counts]').textContent).toBe('2/5 clips ready · 0/5 saved on this device');
    expect(action('audio')).not.toBeNull(); expect(action('audio-retry-save')).not.toBeNull();
    expect(detail().textContent).toContain('playback in this session');
  });
  it('opens details and Escape closes them with focus returned', async () => {
    installAudioFixture(); mount(); await settle(); click(toggle());
    expect(detail().hidden).toBe(false); expect(toggle().getAttribute('aria-controls')).toBe(detail().id);
    detail().tabIndex = -1; detail().focus();
    act(() => detail().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(detail().hidden).toBe(true); expect(document.activeElement).toBe(toggle());
    click(toggle()); toggle().focus();
    act(() => toggle().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(detail().hidden).toBe(true); expect(document.activeElement).toBe(toggle());
  });
  it('never invents readiness or saved totals when the bridges are unavailable', async () => {
    installAudioFixture({ unknown: true }); mount(); await settle();
    expect(panel().querySelector('[data-compact-audio-counts]').textContent).toContain('Clip readiness is not verified');
    expect(panel().querySelector('[data-compact-audio-counts]').textContent).not.toContain('0/5');
    expect(action('audio-check')).not.toBeNull();
  });
  it('uses current clip readiness rather than a stale device preparation count', async () => {
    installAudioFixture({ remaining: 4 }); mount(); await settle(); click(toggle());
    expect(detail().textContent).toContain('2 of 5 sentence clips available');
    expect(detail().textContent).not.toContain('4 still need preparation');
    expect(detail().textContent).toContain('0 of 5 clips confirmed saved');
  });
  it('guards repeated preparation and retains the existing clips while pending', async () => {
    const pending = deferred(), state = installAudioFixture({ preparePromise: pending.promise }); mount(); await settle();
    const prepare = action('audio'); act(() => { prepare.click(); prepare.click(); }); await settle();
    expect(state.prepareCalls).toHaveLength(1); expect(action('audio').textContent).toBe('Stop preparation');
    expect(host.querySelector('[data-review-details]').open).toBe(true);
    expect(panel().querySelector('[data-compact-audio-counts]').textContent).toContain('2/5 clips ready');
    expect(status().textContent).toContain('Preparing sentence audio');
    await act(async () => pending.resolve({ ok: false, cancelled: true }));
  });
  it('distinguishes model preparation progress from processed clip attempts', async () => {
    vi.useFakeTimers(); const pending = deferred(); window._kokoroTTS = { ready: false, progress: .2 };
    const state = installAudioFixture({ preparePromise: pending.promise }); mount({ selectedVoice: 'af_heart' }); await settle(); click(action('audio')); await settle();
    expect(panel().textContent).toContain('Preparing local voice model'); expect(panel().textContent).toContain('20%');
    const announcement = status().textContent;
    window._kokoroTTS.progress = .45; await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(panel().textContent).toContain('45%'); expect(status().textContent).toBe(announcement);
    window._kokoroTTS.ready = true; await act(async () => vi.advanceTimersByTimeAsync(500));
    act(() => state.prepareCalls[0].progress(1, 3));
    expect(panel().querySelector('[data-compact-audio-title]').textContent).toBe('Preparing sentence audio');
    expect(panel().textContent).toContain('Processed 1/3 requested clips');
    await act(async () => pending.resolve({ ok: false, cancelled: true }));
  });
  it('cancels through the real abort/cancel hooks and keeps completed clips', async () => {
    const pending = deferred(), state = installAudioFixture({ preparePromise: pending.promise }); mount(); await settle(); click(action('audio')); await settle();
    const signal = state.prepareCalls[0].options.signal;
    signal.addEventListener('abort', () => pending.resolve({ ok: false, cancelled: true }));
    click(action('audio')); await settle();
    expect(signal.aborted).toBe(true); expect(state.cancelCalls).toBe(1);
    expect(panel().textContent).toContain('2/5 clips ready'); expect(host.querySelector('[data-tts-prep-status]').textContent).toContain('Completed clips are kept');
  });
  it('keeps preparation failures actionable while the sentence list stays collapsed', async () => {
    const state = installAudioFixture({ preparePromise: Promise.resolve({ ok: false, remaining: 3, failure: { code: 'network-failed' }, failures: [{ index: 2, text: 'Seeds can sprout.', code: 'network-failed', action: 'retry' }] }) });
    mount(); await settle(); click(action('audio')); await settle();
    expect(detail().hidden).toBe(true); expect(host.querySelectorAll('[data-audio-preparation-issues]')).toHaveLength(1);
    expect(host.querySelector('[data-tts-prep-status]').textContent).toContain('Last preparation: 3 clips needed attention');
    click(toggle()); expect(detail().querySelector('[data-audio-recovery-index="2"]').textContent).toContain('Seeds can sprout.');
    expect(state.prepareCalls).toHaveLength(1);
  });
  it('names the visible missing-clip action when preparation returns no sentence details', async () => {
    installAudioFixture({ preparePromise: Promise.resolve({ ok: false, remaining: 3 }) }); mount(); await settle(); click(action('audio')); await settle();
    expect(host.querySelector('[data-tts-prep-status]').textContent).toContain('Choose Prepare missing audio');
    expect(action('audio').textContent).toBe('Prepare missing audio'); expect(panel().textContent).toContain('2/5 clips ready');
  });
  it('reports a thrown synthesis failure as preparation, preserving partial clips', async () => {
    const pending = deferred(); installAudioFixture({ preparePromise: pending.promise }); mount(); await settle(); click(action('audio')); await settle();
    await act(async () => pending.reject(new Error('timeout')));
    expect(host.querySelector('[data-tts-prep-status]').textContent).toContain('Sentence audio could not be prepared');
    expect(panel().textContent).toContain('2/5 clips ready'); expect(action('audio')).not.toBeNull();
  });
  it('guards duplicate save activation and waits for durable readiness verification', async () => {
    const pending = deferred(), state = installAudioFixture({ ready: 5, savePromise: pending.promise }); mount(); await settle();
    action('audio-retry-save').focus(); const save = action('audio-retry-save'); act(() => { save.click(); save.click(); }); await settle();
    expect(state.saveCalls).toHaveLength(1); expect(save.getAttribute('aria-busy')).toBe('true'); expect(document.activeElement).toBe(save);
    expect(status().textContent).toContain('Saving audio on this device');
    await act(async () => pending.resolve(true));
    expect(panel().querySelector('[data-compact-audio-counts]').textContent).toContain('0/5 saved');
    expect(panel().querySelector('[data-compact-audio-title]').textContent).not.toContain('Audio saved');
    state.saved = 5; refresh(); await settle();
    expect(panel().querySelector('[data-compact-audio-title]').textContent).toContain('Audio saved on this device');
    expect(panel().querySelector('[data-compact-audio-counts]').textContent).toContain('5/5 saved');
  });
  it.each([false, 'reject'])('keeps save failure %s visible without discarding clips or synthesizing again', async outcome => {
    const pending = deferred(), state = installAudioFixture({ ready: 5, savePromise: pending.promise }); mount(); await settle(); click(action('audio-retry-save')); await settle();
    await act(async () => outcome === 'reject' ? pending.reject(new Error('storage unavailable')) : pending.resolve(false));
    expect(panel().querySelector('[data-device-audio-notice]').textContent).toContain(outcome === 'reject' ? 'could not be saved' : 'was not confirmed');
    expect(status().textContent).toContain('Keep this page open'); expect(panel().textContent).toContain('5/5 clips ready'); expect(state.prepareCalls).toHaveLength(0);
  });
  it('resets expanded details on navigation and ignores late preparation completion', async () => {
    const pending = deferred(), state = installAudioFixture({ preparePromise: pending.promise }); mount(); await settle(); click(toggle()); click(action('audio')); await settle();
    const signal = state.prepareCalls[0].options.signal; state.id = 'next-audio'; update({ generatedContent: { ...props.generatedContent, id: state.id } }); await settle();
    expect(signal.aborted).toBe(true); expect(detail().hidden).toBe(true);
    await act(async () => pending.resolve({ ok: true }));
    expect(host.querySelector('[data-tts-prep-status]').textContent).toBe(''); expect(action('audio').textContent).toBe('Prepare missing audio');
  });
  it('keeps background count announcements quiet during playback, with explicit failures still announced', async () => {
    const pending = deferred(); installAudioFixture({ savePromise: pending.promise }); mount({ isPlaying: true, playingContentId: 'simplified-main' }); await settle();
    expect(status().textContent).toBe(''); click(action('audio-retry-save')); await settle();
    await act(async () => pending.resolve(false)); expect(status().textContent).toContain('Audio saving was not confirmed');
    click(toggle()); expect(detail().textContent).toContain('Reading aloud');
  });
  it('does not expose author preparation controls in student preview', async () => {
    installAudioFixture(); mount({ isStudentPreview: true }); await settle(); expect(panel()).toBeNull();
  });
});
