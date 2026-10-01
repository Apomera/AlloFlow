import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, pure, phase, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'))); act = React.act;
  window.React = global.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'view_simplified_module.js'].forEach(loadAlloModule);
  View = window.AlloModules.SimplifiedView; pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
});
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; vi.restoreAllMocks();
  for (const key of ['__alloGetReadAloudAudioSummary', '__alloGetReadAloudReadiness', '__alloRetryReadAloudPersistence', '__alloPrepareReadAloud', '__alloReadAloudProfileRevision']) delete window[key];
});
function mount(extra = {}) {
  const noop = () => {};
  let props = { ComplexityGauge: () => null, t: key => key,
    generatedContent: { id: 'r', type: 'simplified', data: 'Plants need light. Roots need water.', instructionalText: { form: 'adapted', role: 'supplemental' } },
    selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English', isTeacherMode: true, isZenMode: false,
    interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: text => pure.splitTextToSentences(text, {}),
    getSideBySideContent: () => null, handleSpeak: noop, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
    renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: text => text, latestGlossary: [], MathSymbol: ({ text }) => text }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text, latestGlossary: [],
    setFocusedParagraphIndex: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, handleToggleIsEditingLeveledText: noop,
    handleSimplifiedTextChange: noop, handleFormatText: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, setSelectionMenu: noop, ...extra };
  window.__alloGetReadAloudAudioSummary = () => ({ total: 2, ready: 2, stale: 0, corrupt: 0, missing: 0 });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = async next => { props = { ...props, ...next }; await act(async () => root.render(React.createElement(View, props))); };
  return { render, get props() { return props; } };
}
const row = () => host.querySelector('[data-review-state="audio"]');
const action = key => row()?.querySelector(`[data-review-action="${key}"]`);
const result = (state, extra = {}) => ({ resourceId: 'r', scope: 'device-audio', state, total: 2, ready: 2, durableReady: 0, sessionOnly: 2, remaining: 0, protectedRecordings: 0, nextActions: ['retry-save'], pictureOmissions: [], ...extra });

describe('verified device audio in the reader', () => {
  it('does not turn in-memory preparation into a verified save', async () => {
    const view = mount(); await view.render({});
    expect(row().textContent).toContain('Device audio not verified');
    expect(row().getAttribute('data-review-tone')).not.toBe('ok');
    expect(action('audio-check')).toBeTruthy();
  });
  it('retries saving retained clips without synthesis and refreshes after the save receipt', async () => {
    let state = result('session-only');
    window.__alloGetReadAloudReadiness = vi.fn(async () => state);
    window.__alloRetryReadAloudPersistence = vi.fn(async () => false);
    window.__alloPrepareReadAloud = vi.fn();
    const view = mount(); await view.render({});
    expect(row().textContent).toContain('Audio available for this session');
    await act(async () => action('audio-retry-save').click());
    expect(window.__alloRetryReadAloudPersistence).toHaveBeenCalledOnce();
    expect(window.__alloPrepareReadAloud).not.toHaveBeenCalled();
    expect(row().getAttribute('data-review-tone')).toBe('attention');
    state = result('ready', { durableReady: 2, sessionOnly: 0, nextActions: [] });
    await act(async () => window.dispatchEvent(new CustomEvent('alloflow:offline-media-persistence')));
    expect(row().textContent).toContain('Audio saved on this device');
    expect(row().textContent).toContain('2 of 2');
    expect(row().getAttribute('data-review-tone')).toBe('ok');
  });
  it('shows missing pictures and protected recordings separately from missing AI audio', async () => {
    window.__alloGetReadAloudReadiness = async () => result('partial', { ready: 0, sessionOnly: 0, remaining: 2, protectedRecordings: 1, nextActions: ['prepare-missing', 'review-recordings'], pictureOmissions: [{ id: 'picture' }] });
    const view = mount(); await view.render({});
    expect(row().textContent).toContain('Support pictures omitted from the device save: 1');
    expect(action('audio')).toBeTruthy(); expect(action('audio-recordings')).toBeTruthy(); expect(action('audio-pictures')).toBeTruthy();
    expect(action('audio-retry-save')).toBeNull();
  });
  it('drops a late check after voice settings change and forwards current identity options', async () => {
    let finish;
    window.__alloGetReadAloudReadiness = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(result('partial', { ready: 0, sessionOnly: 0, remaining: 2, nextActions: ['prepare-missing'] }));
    const view = mount(); await view.render({}); await view.render({ selectedVoice: 'Aoede', voiceSpeed: 0.8 });
    await act(async () => finish(result('ready', { durableReady: 2, sessionOnly: 0 })));
    expect(row().textContent).toContain('Audio partly prepared');
    expect(window.__alloGetReadAloudReadiness.mock.calls.at(-1)[2].profile).toMatchObject({ voice: 'Aoede', synthesisRate: 0.8 });
    expect(action('audio')).toBeTruthy();
  });
  it('keeps cancellation usable and never announces an unverified preparation as saved', async () => {
    let finish, signal;
    window.__alloGetReadAloudReadiness = async () => result('partial', { ready: 0, sessionOnly: 0, remaining: 2, nextActions: ['prepare-missing'] });
    window.__alloPrepareReadAloud = vi.fn((_text, _progress, options) => { signal = options.signal; return new Promise(resolve => { finish = resolve; }); });
    const view = mount(); await view.render({}); await act(async () => action('audio').click());
    expect(row().textContent).toContain('Preparing audio');
    await act(async () => action('audio-stop').click()); expect(signal.aborted).toBe(true);
    await act(async () => finish({ cancelled: true, remaining: 1 }));
    expect(host.textContent).toContain('Completed clips are kept');
    expect(row().getAttribute('data-review-tone')).not.toBe('ok');
    expect(action('audio')).toBeTruthy();
  });
});
