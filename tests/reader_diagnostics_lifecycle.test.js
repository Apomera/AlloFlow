import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, View, pure, phase, root, host, clipboardDescriptor, execCommandDescriptor;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('pure_helpers_module.js');
  loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule('view_simplified_module.js');
  pure = window.AlloModules.PureHelpers;
  phase = window.AlloModules.PhaseNHelpers;
  View = window.AlloModules.SimplifiedView;
});
beforeEach(() => {
  localStorage.clear();
  clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  execCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => {
  unmount();
  host?.remove(); host = null;
  document.querySelectorAll('textarea[aria-label="Temporary field for copying read-aloud diagnostics"]').forEach(node => node.remove());
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  else delete navigator.clipboard;
  if (execCommandDescriptor) Object.defineProperty(document, 'execCommand', execCommandDescriptor);
  else delete document.execCommand;
  vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});

function mount(extra = {}, strict = false) {
  const noop = () => {};
  let props = {
    ComplexityGauge: () => null,
    t: key => ({ 'common.copy': 'Copied', 'common.error_analysis': 'Diagnostics' })[key] || key,
    generatedContent: { id: 'audio-1', type: 'simplified', data: 'Plants need light. Roots take in water.', config: { language: 'English' }, instructionalText: { form: 'adapted', role: 'supplemental' } },
    selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English', readingLearnerKey: 'learner-a',
    isTeacherMode: true, isZenMode: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(),
    splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null,
    handleSpeak: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
    renderFormattedText: text => text,
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, {
      highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: ({ text: value }) => value
    }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text,
    latestGlossary: [], setFocusedParagraphIndex: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop,
    handleToggleIsEditingLeveledText: noop, handleSimplifiedTextChange: noop, handleFormatText: noop,
    handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, setSelectionMenu: noop,
    ...extra
  };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = next => {
    props = { ...props, ...next };
    const node = React.createElement(View, props);
    act(() => root.render(strict ? React.createElement(React.StrictMode, null, node) : node));
  };
  render({});
  act(() => host.querySelector('[data-manage-narration]').click());
  return { render, get props() { return props; } };
}
function unmount() { if (root) { act(() => root.unmount()); root = null; } }
function clipboard(writeText) { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: writeText ? { writeText } : undefined }); }
function fallback(run) { Object.defineProperty(document, 'execCommand', { configurable: true, value: run }); }
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const diagnostics = () => host.querySelector('[data-narration-tools] button[title]');
const temporaryFields = () => document.querySelectorAll('textarea[aria-label="Temporary field for copying read-aloud diagnostics"]');
const copy = () => { expect(diagnostics()).not.toBeNull(); act(() => diagnostics().click()); };
const flush = async run => { await act(async () => { run?.(); for (let i = 0; i < 4; i++) await Promise.resolve(); }); };
const tick = ms => flush(() => vi.advanceTimersByTime(ms));

describe('reader diagnostics copying lifecycle', () => {
  it('removes the temporary field when legacy copying throws', async () => {
    clipboard(undefined);
    const legacy = vi.fn(() => { throw Error('Legacy copying is unavailable'); }); fallback(legacy);
    mount(); copy(); await flush();
    expect(legacy).toHaveBeenCalledWith('copy');
    expect(temporaryFields()).toHaveLength(0);
    expect(diagnostics().textContent).toContain('Diagnostics');
  });

  it('keeps a working clipboard fallback and removes its temporary field', async () => {
    clipboard(vi.fn(async () => { throw Error('Clipboard permission denied'); }));
    const legacy = vi.fn(() => true); fallback(legacy);
    mount(); copy(); await flush();
    expect(legacy).toHaveBeenCalledOnce();
    expect(temporaryFields()).toHaveLength(0);
    expect(diagnostics().textContent).toContain('Copied');
    await tick(2000);
    expect(diagnostics().textContent).toContain('Diagnostics');
  });

  it.each(['resolve', 'reject'])('ignores clipboard %s after unmount, including StrictMode', async outcome => {
    const pending = deferred(); clipboard(() => pending.promise);
    const legacy = vi.fn(() => true); fallback(legacy);
    mount({}, true); copy(); unmount();
    const timers = vi.getTimerCount();
    await flush(() => pending[outcome](outcome === 'reject' ? Error('Late permission denial') : undefined));
    expect(legacy).not.toHaveBeenCalled();
    expect(temporaryFields()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(timers);
  });

  it.each(['resource', 'instance', 'text', 'learner', 'preview'])('invalidates pending copying when the %s changes', async context => {
    const pending = deferred(), write = vi.fn(() => pending.promise); clipboard(write);
    const legacy = vi.fn(() => true); fallback(legacy);
    const reader = mount(); copy();
    const item = reader.props.generatedContent;
    const change = context === 'resource' ? { generatedContent: { ...item, id: 'audio-2' } }
      : context === 'instance' ? { generatedContent: { ...item, _artifactInstanceId: 'new-instance' } }
      : context === 'text' ? { generatedContent: { ...item, data: 'A revised passage.' } }
      : context === 'learner' ? { readingLearnerKey: 'learner-b' } : { isStudentPreview: true };
    reader.render(change);
    await flush(() => pending.reject(Error('Late clipboard rejection')));
    expect(legacy).not.toHaveBeenCalled();
    expect(temporaryFields()).toHaveLength(0);
    expect(diagnostics()?.textContent || '').not.toContain('Copied');
    if (context !== 'preview') {
      write.mockResolvedValue(undefined);
      if (!diagnostics()) act(() => host.querySelector('[data-manage-narration]').click());
      copy(); await flush();
      expect(diagnostics().textContent).toContain('Copied');
    }
  });

  it('restarts feedback for the latest copy and cancels its timer on unmount', async () => {
    clipboard(vi.fn(async () => {}));
    mount({}, true); copy(); await flush();
    await tick(1000);
    copy(); await flush();
    await tick(1001);
    expect(diagnostics().textContent).toContain('Copied');
    await tick(999);
    expect(diagnostics().textContent).toContain('Diagnostics');
    copy(); await flush();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores an earlier copy that rejects after a newer copy succeeds', async () => {
    const first = deferred(), write = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
    clipboard(write);
    const legacy = vi.fn(() => true); fallback(legacy);
    mount(); copy(); copy(); await flush();
    expect(diagnostics().textContent).toContain('Copied');
    await flush(() => first.reject(Error('Earlier copy rejected')));
    expect(legacy).not.toHaveBeenCalled();
    expect(diagnostics().textContent).toContain('Copied');
  });

  it('resets copied feedback and cancels its timer when the resource changes', async () => {
    clipboard(vi.fn(async () => {}));
    const reader = mount();
    // jsdom dispatches details toggle events with zero-delay timers.
    await tick(0);
    copy(); await flush();
    expect(diagnostics().textContent).toContain('Copied');
    expect(vi.getTimerCount()).toBe(1);
    reader.render({ generatedContent: { ...reader.props.generatedContent, id: 'audio-2' } });
    await tick(0);
    expect(diagnostics()?.textContent || '').not.toContain('Copied');
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
