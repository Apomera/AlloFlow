import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const PASSAGE = 'The heron walked slowly in the shallow water.';
let React, createRoot, act, View, contract, pure, phase, root, host;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('alt_text_module.js');
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
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  unmount();
  host?.remove(); host = null;
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});

function item({ stale = false } = {}) {
  const reading = {
    id: 'request-reader', type: 'simplified', data: PASSAGE,
    instructionalText: { form: 'adapted', role: 'supplemental' },
    config: { language: 'English' }
  };
  const start = PASSAGE.indexOf('heron');
  reading.adaptedReadingSupports = contract.upsertAdaptedReadingSupport(reading, null, {
    id: 'heron-help', start, end: start + 5, quote: 'heron', text: 'A long-legged bird.'
  });
  return stale ? { ...reading, data: PASSAGE.replace('slowly', 'quickly') } : reading;
}

function mount(extra = {}, strict = false) {
  const noop = () => {};
  let props = {
    ComplexityGauge: () => null, t: key => key, generatedContent: item(),
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
    onGenerateReadingSupports: vi.fn(async () => ({ status: 'complete', annotations: [] })),
    ...extra
  };
  host?.remove();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = next => {
    props = { ...props, ...next };
    const node = React.createElement(View, props);
    act(() => root.render(strict ? React.createElement(React.StrictMode, null, node) : node));
  };
  render({});
  return { render, get props() { return props; } };
}

function unmount() { if (root) { act(() => root.unmount()); root = null; } }
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const generate = () => host.querySelector('[data-adapted-word-help-generate]');
const notice = () => host.querySelector('[data-adapted-word-help-teacher] [data-word-help-notice]');
const click = node => { expect(node).not.toBeNull(); act(() => node.click()); };
const flush = async work => { await act(async () => { work?.(); for (let i = 0; i < 4; i++) await Promise.resolve(); }); };
const ready = { status: 'complete', annotations: [] };

for (const strict of [false, true]) {
  describe(`adapted word-help request ownership${strict ? ' in StrictMode' : ''}`, () => {
    for (const context of ['text', 'learner', 'language']) {
      it.each(['resolve', 'reject'])(`ignores an old %s after the ${context} changes without ending a newer request`, async outcome => {
        const old = deferred(), current = deferred();
        const onGenerate = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
        const reader = mount({ onGenerateReadingSupports: onGenerate }, strict);
        click(generate());
        expect(generate().disabled).toBe(true);
        reader.render(context === 'text'
          ? { generatedContent: { ...reader.props.generatedContent, data: PASSAGE.replace('slowly', 'quickly') } }
          : context === 'language'
            ? { generatedContent: { ...reader.props.generatedContent, config: { language: 'Spanish' } } }
            : { readingLearnerKey: 'learner-b' });
        expect(generate().disabled).toBe(false);
        expect(notice().textContent).toBe('');
        click(generate());
        expect(onGenerate).toHaveBeenCalledTimes(2);
        await flush(() => old[outcome](outcome === 'reject' ? Error('Old request failed') : { status: 'partial' }));
        expect(generate().disabled).toBe(true);
        expect(notice().textContent).toBe('');
        await flush(() => current.resolve(ready));
        expect(generate().disabled).toBe(false);
        expect(notice().textContent).toContain('Suggested word help is ready.');
      });
    }

    it.each(['teacher', 'preview'])('invalidates outstanding feedback across a %s boundary and return', async context => {
      const old = deferred();
      const reader = mount({ onGenerateReadingSupports: () => old.promise }, strict);
      click(generate());
      reader.render(context === 'teacher' ? { isTeacherMode: false } : { isStudentPreview: true });
      reader.render(context === 'teacher' ? { isTeacherMode: true } : { isStudentPreview: false });
      expect(generate().disabled).toBe(false);
      await flush(() => old.reject(Error('The previous session failed')));
      expect(notice().textContent).toBe('');
      expect(generate().disabled).toBe(false);
    });

    it.each(['owner', 'unmount'])('does not deliver an old completion to a replacement panel after %s', async change => {
      const old = deferred(), current = deferred();
      const onGenerate = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
      const reader = mount({ onGenerateReadingSupports: onGenerate }, strict);
      click(generate());
      if (change === 'owner') reader.render({ generatedContent: { ...reader.props.generatedContent, id: 'new-reader' } });
      else { unmount(); mount({ onGenerateReadingSupports: onGenerate }, strict); }
      expect(generate().disabled).toBe(false);
      click(generate());
      await flush(() => old.resolve({ status: 'partial' }));
      expect(generate().disabled).toBe(true);
      expect(notice().textContent).toBe('');
      await flush(() => current.resolve(ready));
      expect(notice().textContent).toContain('Suggested word help is ready.');
    });

    it.each(['clear', 'rebase'])('ignores delayed %s focus and feedback after a learner switch', async action => {
      const save = deferred(), suggestion = deferred();
      const onUpdate = vi.fn(() => save.promise);
      const reader = mount({
        generatedContent: item({ stale: true }), onUpdateReadingSupports: onUpdate,
        onGenerateReadingSupports: () => suggestion.promise
      }, strict);
      click(host.querySelector(`[data-adapted-word-help-${action}]`));
      expect(onUpdate).toHaveBeenCalledWith(reader.props.generatedContent, { type: action });
      reader.render({ readingLearnerKey: 'learner-b' });
      expect(generate().disabled).toBe(false);
      click(generate());
      const focusTarget = document.createElement('button');
      focusTarget.textContent = 'Current reading action';
      host.append(focusTarget); focusTarget.focus();
      await flush(() => save.resolve(ready));
      expect(document.activeElement).toBe(focusTarget);
      expect(notice().textContent).toBe('');
      expect(generate().disabled).toBe(true);
      await flush(() => suggestion.resolve(ready));
      expect(generate().disabled).toBe(false);
      expect(notice().textContent).toContain('Suggested word help is ready.');
    });

    it('retains completion feedback when the same reading receives its updated supports', async () => {
      const pending = deferred();
      const reader = mount({ onGenerateReadingSupports: () => pending.promise }, strict);
      click(generate());
      const reading = reader.props.generatedContent;
      const saved = contract.setAdaptedReadingSupportsShown(reading, reading.adaptedReadingSupports, true);
      reader.render({ generatedContent: { ...reading, adaptedReadingSupports: saved } });
      expect(generate().disabled).toBe(true);
      await flush(() => pending.resolve(saved));
      expect(generate().disabled).toBe(false);
      expect(notice().textContent).toContain('Suggested word help is ready.');
      expect(host.querySelector('[data-adapted-word-help]')).not.toBeNull();
    });

    it('shows a current failure, releases its controls, and permits a successful retry', async () => {
      const onGenerate = vi.fn()
        .mockRejectedValueOnce(Error('Suggestions service unavailable'))
        .mockResolvedValueOnce(ready);
      mount({ onGenerateReadingSupports: onGenerate }, strict);
      click(generate());
      await flush();
      expect(notice().textContent).toBe('Suggestions service unavailable');
      expect(generate().disabled).toBe(false);
      click(generate());
      await flush();
      expect(onGenerate).toHaveBeenCalledTimes(2);
      expect(notice().textContent).toContain('Suggested word help is ready.');
      expect(generate().disabled).toBe(false);
    });

    it('starts only one operation for repeated actions in the same render', async () => {
      const pending = deferred();
      const onGenerate = vi.fn(() => pending.promise);
      mount({ onGenerateReadingSupports: onGenerate }, strict);
      const button = generate();
      act(() => { button.click(); button.click(); });
      expect(onGenerate).toHaveBeenCalledTimes(1);
      await flush(() => pending.resolve(ready));
      expect(generate().disabled).toBe(false);
    });
  });
}
