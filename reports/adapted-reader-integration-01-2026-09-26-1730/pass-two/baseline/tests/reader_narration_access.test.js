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
  for (const key of ['__alloStoreRecordedSentenceAudio', '__alloRegenerateSentenceAudio', '__alloGetReadAloudAudioSummary', '__alloInspectReadAloudAudio', '__alloPrepareReadAloud', '__alloQuarantineReadAloudAudio', '__alloReadAloudProfileRevision']) delete window[key];
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

const manage = () => host.querySelector('[data-manage-narration]');
const region = () => host.querySelector('[role="region"][aria-label="Manage narration"]');
const original = () => window.AlloModules.InstructionalContext.createSupportedReading(TEXT, { id: 'original-1', config: { language: 'English' } });

describe('narration access without text Edit', () => {
  it.each(['adapted', 'original'])('opens %s sentence controls without exposing or changing text', kind => {
    const changeText = vi.fn(), editText = vi.fn();
    const item = kind === 'original' ? original() : undefined;
    const before = item && JSON.stringify(item);
    mount({ ...(item ? { generatedContent: item } : {}), handleSimplifiedTextChange: changeText, handleToggleIsEditingLeveledText: editText });
    expect(manage().textContent).toContain('Manage narration');
    expect(host.querySelector('textarea')).toBeNull();
    act(() => manage().click());
    expect(region().textContent).toContain('Plants need light.');
    expect(region().textContent).toContain('Roots take in water.');
    expect(region().querySelector('button[aria-label="common.generate 1"]')).not.toBeNull();
    expect(changeText).not.toHaveBeenCalled(); expect(editText).not.toHaveBeenCalled();
    if (item) {
      expect(JSON.stringify(item)).toBe(before);
      expect(host.textContent).toContain('leaves the original text unchanged');
      expect(host.querySelector('[data-review-action="edit"]')).toBeNull();
    }
  });

  it('prepares the preserved original through the existing audio API', async () => {
    window.__alloGetReadAloudAudioSummary = () => summary(0);
    window.__alloPrepareReadAloud = vi.fn(async () => ({ ok: true, remaining: 0 }));
    const item = original(), before = JSON.stringify(item);
    mount({ generatedContent: item });
    expect(row().textContent).toContain('0 of 2');
    await act(async () => recovery().click());
    expect(window.__alloPrepareReadAloud).toHaveBeenCalledWith(['Plants need light.', 'Roots take in water.'], expect.any(Function), expect.objectContaining({ entries: expect.arrayContaining([expect.objectContaining({ occurrence: 0, language: 'English' })]) }));
    expect(JSON.stringify(item)).toBe(before);
  });

  it.each(['close button', 'Escape'])('returns focus to Manage narration using %s', method => {
    mount(); act(() => { manage().focus(); manage().click(); });
    expect(manage().getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(manage().getAttribute('aria-controls'))).toBe(region());
    const close = host.querySelector('[data-close-narration]');
    act(() => {
      close.focus();
      if (method === 'Escape') close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      else close.click();
    });
    expect(region()).toBeNull(); expect(document.activeElement).toBe(manage());
    expect(manage().getAttribute('aria-expanded')).toBe('false');
  });

  it.each([{ isTeacherMode: false }, { isStudentPreview: true }, { isZenMode: true }])('hides authoring controls for %j', props => {
    mount(props); expect(manage()).toBeNull(); expect(recovery()).toBeUndefined();
  });

  it('keeps narration available when entering and leaving text Edit', () => {
    const view = mount(); act(() => manage().click());
    view.render({ isEditingLeveledText: true });
    expect(region()).not.toBeNull(); expect(host.querySelector('textarea')).not.toBeNull();
    expect(host.querySelectorAll('[data-narration-tools]')).toHaveLength(1);
    view.render({ isEditingLeveledText: false });
    expect(region()).not.toBeNull(); expect(host.querySelector('textarea')).toBeNull();
  });

  it('closes the old narration panel when moving to another reading', () => {
    const view = mount(); act(() => manage().click());
    view.render({ generatedContent: original() });
    expect(region()).toBeNull(); expect(manage().getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps Edit text reachable from Both and focuses the adapted editor', () => {
    const toggle = vi.fn(), compare = vi.fn(), stop = vi.fn();
    const view = mount({ isCompareMode: true, handleToggleIsEditingLeveledText: toggle, setIsCompareMode: compare, stopPlayback: stop });
    act(() => host.querySelector('[data-review-action="edit"]').click());
    expect(toggle).toHaveBeenCalledOnce(); expect(compare).toHaveBeenCalledWith(false); expect(stop).toHaveBeenCalled();
    view.render({ isCompareMode: false, isEditingLeveledText: true });
    expect(document.activeElement).toBe(host.querySelector('textarea'));
  });

  it('releases a late microphone request after teacher controls become hidden', async () => {
    let resolveMic;
    window.__alloStoreRecordedSentenceAudio = vi.fn(async () => true);
    const stop = vi.fn();
    vi.stubGlobal('MediaRecorder', class { static isTypeSupported() { return true; } });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(() => new Promise(resolve => { resolveMic = resolve; })) } });
    const view = mount(); act(() => manage().click());
    await act(async () => region().querySelector('button[aria-label="word_sounds.voice_pack_tab_record 1"]').click());
    expect(resolveMic).toBeTypeOf('function');
    view.render({ isTeacherMode: false });
    await act(async () => resolveMic({ getTracks: () => [{ stop }] }));
    expect(stop).toHaveBeenCalled(); expect(manage()).toBeNull();
    view.render({ isTeacherMode: true }); act(() => manage().click());
    expect(region().querySelector('button[aria-label="word_sounds.voice_pack_tab_record 1"]').disabled).toBe(false);
  });
});
