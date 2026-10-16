import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const babel = require('@babel/core');
let AnalysisView, root, container;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const source = readFileSync(resolve(process.cwd(), 'view_analysis_source.jsx'), 'utf8');
  const compiled = babel.transformSync(source, {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
    babelrc: false, configFile: false, parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  });
  AnalysisView = new Function('window', 'React', compiled.code + '\nreturn AnalysisView;')(window, React);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = null; container = null;
});

function makeProps(data = {}, overrides = {}) {
  return {
    generatedContent: { id: 'analysis-a', type: 'analysis', data: {
      analysisSourceVersion: 1,
      originalText: 'The fox jupms over the lazy dog.', rawEnglishText: 'The fox jupms over the lazy dog.',
      sourceLanguage: 'English', reportLanguage: 'English',
      readingLevel: { range: '5th Grade', explanation: 'The original explanation.' }, concepts: ['Foxes'],
      localStats: { words: 7, sentences: 1, syllables: 8, score: 5.3 },
      accuracy: { rating: 'High', reason: 'Original reason.', discrepancies: ['The date is wrong.'], verifiedFacts: ['Foxes are mammals.'], citations: 'Original citation [1].' },
      grammar: ['Spelling: jupms'],
      sourceTranslations: { Spanish: 'El zorro salta sobre el perro perezoso.' },
      reportTranslations: { Spanish: {
        readingLevel: { range: 'UNSAFE REPLACEMENT GRADE', explanation: 'Explicación de la fuente.' }, concepts: ['Zorros'],
        accuracy: { rating: 'UNSAFE REPLACEMENT RATING', reason: 'Razón original.', discrepancies: ['La fecha es incorrecta.'], verifiedFacts: ['Los zorros son mamíferos.'], citations: 'Invented citation.' },
        grammar: ['Ortografía: jupms'],
      } }, ...data,
    } },
    isTeacherMode: true, isProcessing: false, isEditingAnalysis: false, sourceRefineInstruction: '', downloadingContentId: null,
    selectedDiscrepancies: new Set([0]), selectedGrammarErrors: new Set([0]), analysisEditorRef: { current: null },
    toggleDiscrepancySelection: vi.fn(), toggleGrammarErrorSelection: vi.fn(), setGeneratedContent: vi.fn(), setGenerationStep: vi.fn(),
    setIsProcessing: vi.fn(), setInputText: vi.fn(), setSelectedGrammarErrors: vi.fn(), setSourceRefineInstruction: vi.fn(),
    handleAiRefineSource: vi.fn(), handleAnalysisTextChange: vi.fn(), handleAutoCorrectSource: vi.fn(), handleDownloadAudio: vi.fn(),
    handleFormatText: vi.fn(), handleToggleIsEditingAnalysis: vi.fn(), onCorrectAnalysisText: vi.fn(async () => true), addToast: vi.fn(), callGemini: vi.fn(), warnLog: vi.fn(),
    onUpdateResource: vi.fn(), t: key => key, formatInlineText: text => text, renderFormattedText: text => text,
    splitReferencesFromBody: text => ({ body: text, references: '' }),
    BilingualFieldRenderer: props => React.createElement('span', null, props.text), SourceReferencesPanel: () => null,
    ...overrides,
  };
}

function render(props) {
  if (!root) {
    container = document.createElement('div'); document.body.appendChild(container);
    root = createRoot(container);
  }
  act(() => root.render(React.createElement(AnalysisView, props)));
  return container;
}
function selectReport(language) {
  act(() => {
    const select = container.querySelector('[aria-label="Report language"]');
    select.value = language; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
const buttons = () => [...container.querySelectorAll('button')];
const fixGrammar = () => buttons().find(button => button.textContent.includes('analysis.fix_grammar_button'));

describe('analysis report languages preserve the selected source', () => {
  it('switches explanations and findings while persisting only the display preference', () => {
    const props = makeProps();
    const originalData = JSON.stringify(props.generatedContent);
    render(props);
    selectReport('Spanish');
    expect(container.textContent).toContain('Explicación de la fuente.');
    expect(container.textContent).toContain('La fecha es incorrecta.');
    expect(container.textContent).toContain('Ortografía: jupms');
    expect(container.textContent).toContain('Zorros');
    expect(container.textContent).not.toContain('The original explanation.');
    expect(container.textContent).toContain('5th Grade');
    expect(container.textContent).toContain('High');
    expect(container.textContent).toContain('5.3');
    expect(container.textContent).toContain('Original citation [1].');
    expect(container.textContent).not.toContain('UNSAFE REPLACEMENT');
    expect(container.textContent).not.toContain('Invented citation.');
    expect(container.textContent).toContain(props.generatedContent.data.originalText);
    expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(0);
    expect(fixGrammar()).toBeUndefined();
    expect(buttons().some(button => (button.getAttribute('aria-label') || '').startsWith('analysis.grammar_dismiss_one'))).toBe(false);
    expect(props.onUpdateResource).toHaveBeenCalledTimes(1);
    expect(props.onUpdateResource.mock.calls[0][0]).toBe('analysis-a');
    expect(props.setGeneratedContent).not.toHaveBeenCalled();
    const update = props.onUpdateResource.mock.calls[0][1];
    const latest = { ...props.generatedContent, config: { language: 'English' }, provenance: { source: 'saved-file' }, data: { ...props.generatedContent.data, originalText: 'A newer source edit.', grammar: ['A newer note.'] } };
    expect(update(latest)).toEqual({ ...latest, data: { ...latest.data, displayReportLanguage: 'Spanish' } });
    const anotherResource = { ...latest, id: 'analysis-b' };
    expect(update(anotherResource)).toBe(anotherResource);
    selectReport('English');
    expect(container.textContent).toContain('The original explanation.');
    expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(2);
    expect(fixGrammar()).toBeTruthy();
    expect(JSON.stringify(props.generatedContent)).toBe(originalData);
    for (const key of ['setInputText', 'handleAnalysisTextChange', 'handleAutoCorrectSource', 'onCorrectAnalysisText', 'toggleGrammarErrorSelection', 'toggleDiscrepancySelection']) expect(props[key]).not.toHaveBeenCalled();
  });

  it('saves only the matching history item and reopens in the saved report language', () => {
    const props = makeProps({}, { setHistory: vi.fn(), onUpdateResource: undefined });
    render(props); selectReport('Spanish');
    const anotherResource = { ...props.generatedContent, id: 'analysis-b' };
    const latest = { ...props.generatedContent, config: { language: 'English' }, provenance: { source: 'library' }, data: { ...props.generatedContent.data, originalText: 'A concurrent saved edit.' } };
    const saved = props.setHistory.mock.calls[0][0]([latest, anotherResource]);
    expect(saved[0]).toEqual({ ...latest, data: { ...latest.data, displayReportLanguage: 'Spanish' } });
    expect(saved[1]).toBe(anotherResource);
    act(() => root.unmount()); container.remove(); root = null; container = null;
    render({ ...props, generatedContent: saved[0] });
    expect(container.querySelector('[aria-label="Report language"]').value).toBe('Spanish');
    expect(container.textContent).toContain('Explicación de la fuente.');
    expect(container.textContent).toContain('A concurrent saved edit.');
  });

  it('honors an explicit translated report selection and resets for another resource or removed translation', () => {
    const props = makeProps(); render(props); selectReport('Spanish');
    render({ ...props, generatedContent: { ...props.generatedContent, id: 'analysis-b' } });
    expect(container.querySelector('[aria-label="Report language"]').value).toBe('English');
    render(makeProps({ displayReportLanguage: 'Spanish' }));
    expect(container.querySelector('[aria-label="Report language"]').value).toBe('Spanish');
    render(makeProps({ displayReportLanguage: 'Spanish', reportTranslations: {} }));
    expect(container.querySelector('[aria-label="Report language"]')).toBeNull();
    expect(container.textContent).toContain('The original explanation.');
  });

  it('presents optional language-labeled companions and suppresses same-language or equal-text copies', () => {
    const props = makeProps({ sourceTranslations: {
      Spanish: 'El zorro salta sobre el perro perezoso.', English: 'A needless second English passage.',
      French: '  The fox jupms\n over the lazy dog.  ', Malformed: { text: 'Not a string.' },
    } });
    render(props);
    const companions = container.querySelectorAll('[data-source-translation]');
    expect(companions).toHaveLength(1);
    expect(companions[0].querySelector('summary').textContent).toBe('Translated passage · Spanish');
    expect(companions[0].open).toBe(false);
    expect(container.textContent).not.toContain('needless second');
    act(() => companions[0].querySelector('summary').click());
    expect(companions[0].open).toBe(true);
    expect(props.setInputText).not.toHaveBeenCalled();
    expect(props.onUpdateResource).not.toHaveBeenCalled();
    expect(container.textContent.match(/The fox jupms over the lazy dog\./g)).toHaveLength(1);
  });

  it('keeps correction prompts, editing and audio bound to the original with companions present', async () => {
    const props = makeProps({}, { callGemini: vi.fn(async () => 'The fox jumps over the lazy dog.') });
    render(props);
    await act(async () => fixGrammar().click());
    expect(props.callGemini.mock.calls[0][0]).toContain('SOURCE TEXT:\nThe fox jupms over the lazy dog.');
    expect(props.callGemini.mock.calls[0][0]).not.toContain('El zorro');
    expect(props.onCorrectAnalysisText).toHaveBeenCalledWith('analysis-a', 'The fox jupms over the lazy dog.', 'The fox jumps over the lazy dog.', ['Spelling: jupms']);
    act(() => buttons().find(button => button.dataset.helpKey === 'analysis_download_audio').click());
    expect(props.handleDownloadAudio).toHaveBeenCalledWith('The fox jupms over the lazy dog.', 'original-source-text', 'dl-analysis-source');
    render({ ...props, isEditingAnalysis: true });
    expect(container.querySelector('textarea').value).toBe('The fox jupms over the lazy dog.');
  });

  it('retains resolved status from the original notes in translated reports', () => {
    render(makeProps({ grammar: ['✓ DISMISSED: Spelling: jupms'], displayReportLanguage: 'Spanish' }));
    expect(container.textContent).toContain('Ortografía: jupms');
    expect(container.textContent).toContain('analysis.grammar_all_resolved');
    expect(container.textContent).toContain('analysis.grammar_dismissed_tag');
    expect(buttons().some(button => button.textContent.includes('analysis.dismiss_fixed'))).toBe(false);
  });

  it('does not show the legacy original source twice when both saved fields contain the same text', () => {
    const text = 'The same source appears once.';
    render(makeProps({ analysisSourceVersion: undefined, originalText: text, rawEnglishText: text, translatedText: text, reportTranslations: {}, sourceTranslations: {} }));
    expect(container.textContent.match(/The same source appears once\./g)).toHaveLength(1);
  });

  it('keeps teacher findings and the report selector out of student mode', () => {
    render(makeProps({ displayReportLanguage: 'Spanish' }, { isTeacherMode: false }));
    expect(container.querySelector('[data-analysis-report-language]')).toBeNull();
    expect(container.textContent).not.toContain('Ortografía: jupms');
    expect(container.textContent).toContain('The fox jupms over the lazy dog.');
    expect(container.querySelector('[data-source-translation="Spanish"]')).not.toBeNull();
  });
});
