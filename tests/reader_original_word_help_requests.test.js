import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const PASSAGE = 'Plants need light. Roots take in water.';
let React, createRoot, act, View, contract, pure, phase, root, host;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('pure_helpers_module.js');
  loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule('view_simplified_module.js');
  contract = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers;
  phase = window.AlloModules.PhaseNHelpers;
  View = window.AlloModules.SimplifiedView;
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('alloflow_auto_word_supports', 'off');
  View.resetAutoWordSupportRuns();
  window.__alloResolveAiCapability = () => ({ text: false, reason: 'none' });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  unmount();
  host?.remove(); host = null;
  delete window.__alloResolveAiCapability;
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});

function original(text = PASSAGE, options = {}) {
  return contract.createSupportedReading(text, { id: 'original-request-reader', language: 'English', ...options });
}

function mount(extra = {}, strict = false) {
  const noop = () => {};
  let props = {
    ComplexityGauge: () => null, t: key => key, generatedContent: original(),
    selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English', readingLearnerKey: 'learner-a',
    isTeacherMode: true, isZenMode: false, interactionMode: 'read', textEditorRef: React.createRef(),
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
    setReadingTheme: noop, setInteractionMode: noop, setIsCompareMode: noop, setIsFluencyMode: noop,
    stopPlayback: noop, closeDefinition: noop, closePhonics: noop, closeRevision: noop,
    onGenerateReadingSupports: vi.fn(async () => ({ status: 'complete', annotations: [] })),
    ...extra
  };
  host?.remove();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = next => {
    props = { ...props, ...next };
    const node = React.createElement(View, { ...props, history: [props.generatedContent] });
    act(() => root.render(strict ? React.createElement(React.StrictMode, null, node) : node));
  };
  render({});
  openSetup();
  return { render, get props() { return props; } };
}

function unmount() { if (root) { act(() => root.unmount()); root = null; } }
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function openSetup() {
  const toggle = host.querySelector('[data-teacher-setup-toggle]');
  if (toggle?.getAttribute('aria-expanded') === 'false') act(() => toggle.click());
}
const generate = () => host.querySelector('[data-original-generate-supports]');
const notice = () => host.querySelector('[data-gloss-status]');
const clickGenerate = () => {
  openSetup();
  const button = generate();
  expect(button).not.toBeNull();
  expect(button.closest('[hidden], [aria-hidden="true"]')).toBeNull();
  act(() => button.click());
};
const flush = async work => { await act(async () => { work?.(); for (let i = 0; i < 4; i++) await Promise.resolve(); }); };
const ready = { status: 'complete', annotations: [] };

for (const strict of [false, true]) {
  describe(`original word-help manual request ownership${strict ? ' in StrictMode' : ''}`, () => {
    for (const context of ['source text', 'learner', 'language']) {
      it.each(['resolve', 'reject'])(`ignores an old %s after the ${context} changes without ending a newer request`, async outcome => {
        const old = deferred(), current = deferred();
        const onGenerate = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
        const reader = mount({ onGenerateReadingSupports: onGenerate }, strict);
        clickGenerate();
        expect(generate().disabled).toBe(true);
        reader.render(context === 'source text'
          ? { generatedContent: original('Leaves use light. Roots take in water.') }
          : context === 'language' ? { generatedContent: original(PASSAGE, { language: 'Spanish' }) }
            : { readingLearnerKey: 'learner-b' });
        openSetup();
        expect(generate().disabled).toBe(false);
        expect(notice().textContent).toBe('');
        clickGenerate();
        expect(onGenerate).toHaveBeenCalledTimes(2);
        await flush(() => old[outcome](outcome === 'reject' ? Error('The old request failed') : { status: 'partial' }));
        expect(generate().disabled).toBe(true);
        expect(notice().textContent).toBe('');
        await flush(() => current.resolve(ready));
        expect(generate().disabled).toBe(false);
        expect(notice().textContent).toBe('Word help is ready.');
      });
    }

    it.each(['role', 'preview', 'learner', 'reading'])('does not revive a request after leaving and returning to the same %s scope', async context => {
      const old = deferred();
      const reader = mount({ onGenerateReadingSupports: () => old.promise }, strict);
      const first = reader.props.generatedContent;
      clickGenerate();
      const away = context === 'role' ? { isTeacherMode: false }
        : context === 'preview' ? { isStudentPreview: true }
          : context === 'learner' ? { readingLearnerKey: 'learner-b' }
            : { generatedContent: original(PASSAGE, { id: 'other-reading' }) };
      const back = context === 'role' ? { isTeacherMode: true }
        : context === 'preview' ? { isStudentPreview: false }
          : context === 'learner' ? { readingLearnerKey: 'learner-a' }
            : { generatedContent: first };
      reader.render(away); reader.render(back); openSetup();
      expect(generate().disabled).toBe(false);
      await flush(() => old.resolve({ status: 'partial' }));
      expect(notice().textContent).toBe('');
      expect(generate().disabled).toBe(false);
    });

    it('retains success when the same original receives its updated support envelope', async () => {
      const pending = deferred();
      const reader = mount({ onGenerateReadingSupports: () => pending.promise }, strict);
      clickGenerate();
      const item = reader.props.generatedContent;
      const saved = contract.validateReadingSupports(item, {
        status: 'complete', annotations: [{ id: 'light-help', start: PASSAGE.indexOf('light'), end: PASSAGE.indexOf('light') + 5, quote: 'light', text: 'Energy plants use to grow.' }]
      });
      reader.render({ generatedContent: { ...item, readingSupports: saved } });
      expect(generate().disabled).toBe(true);
      await flush(() => pending.resolve(saved));
      expect(generate().disabled).toBe(false);
      expect(notice().textContent).toBe('Word help is ready.');
      reader.render({ selectedVoice: 'Puck' });
      expect(notice().textContent).toBe('Word help is ready.');
      expect(reader.props.generatedContent.data).toBe(PASSAGE);
    });

    it('shows a current error, releases its controls, and allows a successful retry', async () => {
      const onGenerate = vi.fn().mockRejectedValueOnce(Error('Suggestions are unavailable')).mockResolvedValueOnce(ready);
      mount({ onGenerateReadingSupports: onGenerate }, strict);
      clickGenerate(); await flush();
      expect(notice().textContent).toBe('Suggestions are unavailable');
      expect(generate().disabled).toBe(false);
      clickGenerate(); await flush();
      expect(onGenerate).toHaveBeenCalledTimes(2);
      expect(generate().disabled).toBe(false);
      expect(notice().textContent).toBe('Word help is ready.');
    });

    it('starts only one manual request for repeated actions before rerender', async () => {
      const pending = deferred(), onGenerate = vi.fn(() => pending.promise);
      mount({ onGenerateReadingSupports: onGenerate }, strict);
      const button = generate();
      act(() => { button.click(); button.click(); });
      expect(onGenerate).toHaveBeenCalledTimes(1);
      await flush(() => pending.resolve(ready));
      expect(generate().disabled).toBe(false);
    });

    it('does not deliver an unmounted request to a newly mounted original reader', async () => {
      const old = deferred(), current = deferred();
      const onGenerate = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
      mount({ onGenerateReadingSupports: onGenerate }, strict); clickGenerate();
      unmount();
      mount({ onGenerateReadingSupports: onGenerate }, strict); clickGenerate();
      await flush(() => old.reject(Error('Late failure from the unmounted reader')));
      expect(generate().disabled).toBe(true);
      expect(notice().textContent).toBe('');
      await flush(() => current.resolve(ready));
      expect(generate().disabled).toBe(false);
      expect(notice().textContent).toBe('Word help is ready.');
    });
  });
}
