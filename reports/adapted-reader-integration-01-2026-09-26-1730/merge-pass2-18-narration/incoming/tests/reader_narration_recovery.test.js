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
  for (const key of ['__alloGetReadAloudReadiness', '__alloRetryReadAloudPersistence', '__alloGetReadAloudAudioSummary', '__alloInspectReadAloudAudio', '__alloPrepareReadAloud', '__alloQuarantineReadAloudAudio', '__alloReadAloudProfileRevision']) delete window[key];
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

const retry = () => host.querySelector('[data-review-action="audio-retry-save"]');
const announcement = () => host.querySelector('[data-device-audio-status]');
const device = (id = 'audio-1', saved = 0) => ({ resourceId: id, scope: 'device-audio', state: saved === 2 ? 'ready' : 'session-only', ready: 2, total: 2, remaining: 0, durableReady: saved, sessionOnly: 2 - saved, nextActions: saved === 2 ? [] : ['retry-save'] });
const settle = () => act(async () => {});

describe('narration device save feedback and focus', () => {
  beforeEach(() => {
    window.__alloGetReadAloudAudioSummary = () => summary(2);
    window.__alloGetReadAloudReadiness = vi.fn(async () => device());
  });

  it.each([false, null, undefined, { status: 'failed' }])('explains unconfirmed result %j without generating audio again', async result => {
    window.__alloRetryReadAloudPersistence = vi.fn(async () => result);
    window.__alloPrepareReadAloud = vi.fn();
    mount(); await settle();
    await act(async () => retry().click());
    expect(row().textContent).toContain('Audio saving was not confirmed');
    expect(announcement().textContent).toContain('Audio saving was not confirmed');
    expect(retry().getAttribute('aria-busy')).toBeNull();
    expect(window.__alloPrepareReadAloud).not.toHaveBeenCalled();
  });

  it('announces storage failure beside the retry action', async () => {
    window.__alloRetryReadAloudPersistence = vi.fn(async () => { throw new Error('Storage unavailable'); });
    mount(); await settle();
    await act(async () => retry().click());
    expect(row().textContent).toContain('Audio could not be saved on this device');
    expect(announcement().getAttribute('role')).toBe('status');
    expect(announcement().getAttribute('aria-live')).toBe('polite');
    expect(announcement().getAttribute('aria-atomic')).toBe('true');
  });

  it('releases a pending retry on resource change and ignores its later failure', async () => {
    let firstReject, secondFinish, currentId = 'audio-1';
    window.__alloGetReadAloudReadiness = vi.fn(async () => device(currentId));
    const save = window.__alloRetryReadAloudPersistence = vi.fn()
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { firstReject = reject; }))
      .mockImplementationOnce(() => new Promise(resolve => { secondFinish = resolve; }));
    const view = mount(); await settle();
    await act(async () => retry().click());
    const signal = save.mock.calls[0][1]?.signal;
    expect(signal).toBeDefined();
    currentId = 'audio-2'; view.render({ generatedContent: { ...view.props.generatedContent, id: currentId } }); await settle();
    expect(signal.aborted).toBe(true);
    expect(retry().getAttribute('aria-busy')).toBeNull();
    await act(async () => retry().click()); expect(save).toHaveBeenCalledTimes(2);
    await act(async () => firstReject(new Error('Old save failed')));
    expect(row().textContent).not.toContain('Audio could not be saved');
    expect(retry().getAttribute('aria-busy')).toBe('true');
    await act(async () => secondFinish(true));
    expect(retry().getAttribute('aria-busy')).toBeNull();
  });

  it('cancels a pending retry when author controls are hidden', async () => {
    let finish;
    const save = window.__alloRetryReadAloudPersistence = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const view = mount(); await settle();
    await act(async () => retry().click());
    const signal = save.mock.calls[0][1]?.signal;
    view.render({ isTeacherMode: false });
    expect(signal?.aborted).toBe(true);
    await act(async () => finish(false));
    view.render({ isTeacherMode: true }); await settle();
    expect(retry().getAttribute('aria-busy')).toBeNull();
    expect(row().textContent).not.toContain('Audio saving was not confirmed');
  });

  it('restores focus when a focused retry disappears before it was clicked', async () => {
    let saved = 0; window.__alloGetReadAloudReadiness = async () => device('audio-1', saved);
    mount(); await settle(); retry().focus();
    saved = 2; update('alloflow:offline-media-persistence'); await settle();
    expect(retry()).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('[data-manage-narration]'));
    expect(announcement().textContent).toContain('Audio saved on this device');
  });

  it('does not steal focus from another control on storage completion', async () => {
    let saved = 0; window.__alloGetReadAloudReadiness = async () => device('audio-1', saved);
    mount(); await settle(); retry().focus();
    const edit = host.querySelector('[data-review-action="edit"]'); edit.focus();
    saved = 2; update('alloflow:offline-media-persistence'); await settle();
    expect(document.activeElement).toBe(edit);
  });

  it('keeps a focused retry and guards repeated activation while saving', async () => {
    let finish; const save = window.__alloRetryReadAloudPersistence = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    mount(); await settle(); retry().focus();
    await act(async () => { retry().click(); retry().click(); });
    expect(save).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(retry());
    expect(announcement().textContent).toContain('Saving audio on this device');
    await act(async () => finish(true));
  });

  it('does not announce changing storage counts over active read-aloud', async () => {
    const view = mount({ isPlaying: true }); await settle();
    expect(announcement().textContent).toBe('');
    view.render({ isPlaying: false }); await settle();
    expect(announcement().textContent).toContain('Audio available for this session');
  });

  it('still announces an explicitly requested save failure during read-aloud', async () => {
    window.__alloRetryReadAloudPersistence = vi.fn(async () => false);
    mount({ isPlaying: true }); await settle();
    await act(async () => retry().click());
    expect(announcement().textContent).toContain('Audio saving was not confirmed');
  });

  it('clears an old failure when the current audio is subsequently verified in storage', async () => {
    let saved = 0; window.__alloGetReadAloudReadiness = async () => device('audio-1', saved);
    window.__alloRetryReadAloudPersistence = vi.fn(async () => false);
    mount(); await settle(); await act(async () => retry().click());
    expect(host.querySelector('[data-device-audio-notice]')).not.toBeNull();
    saved = 2; update('alloflow:offline-media-persistence'); await settle();
    expect(host.querySelector('[data-device-audio-notice]')).toBeNull();
    expect(announcement().textContent).toContain('Audio saved on this device');
  });
});
