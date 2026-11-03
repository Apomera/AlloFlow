import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const babel = require('@babel/core');
let AnalysisView, root, container;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('generation_matrix_module.js');
  loadAlloModule('generate_dispatcher_module.js');
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

function sectionedProps(complete = false, overrides = {}) {
  const opening = 'Roots absorb water. '.repeat(305);
  const ending = 'River deltas form downstream. '.repeat(100).trimEnd();
  const source = opening + ending;
  const report = (concept, range) => ({
    readingLevel: { range, explanation: 'Vocabulary in this section.' }, concepts: [concept],
    accuracy: { rating: 'High', reason: concept + ' finding.' }, grammar: [],
  });
  const sections = [{ start: 0, end: opening.length, report: report('Root absorption', '2nd Grade') }];
  if (complete) sections.push({ start: opening.length, end: source.length, report: report('Delta formation', '8th Grade') });
  return makeProps({
    originalText: source, rawEnglishText: source, analysisIncomplete: !complete,
    localStats: { words: 1315, sentences: 405, syllables: 2010, score: 6.7 },
    analysisCoverage: { sourceFingerprint: window.AlloModules.InstructionalContext.fingerprintText(source), sections },
  }, overrides);
}

describe('analysis report languages preserve the selected source', () => {
  it.each(['structured', 'legacy'])('keeps %s evidence beside its own fact when report language changes', format => {
    const atlas = 'https://evidence.example/atlas', survey = 'https://evidence.example/survey';
    const fake = 'https://wrong.example/translation';
    const catalog = [{ number: 1, title: 'River atlas', url: atlas }, { number: 2, title: 'Field survey', url: survey }];
    const accuracy = {
      ...makeProps().generatedContent.data.accuracy, discrepancies: [],
      ...(format === 'structured' ? { verification: 'web-search', sourceReferences: catalog }
        : { citations: `1. [River atlas](${atlas})\n2. [Field survey](${survey})` }),
      verifiedFacts: [`The river bends [⁽¹⁾](${atlas}).`, `The banks flooded [⁽²⁾](${survey}).`, 'The current doubled.'],
      unsourcedFacts: ['The channel widened.'],
    };
    const props = makeProps({ accuracy });
    props.generatedContent.data.reportTranslations.Spanish.accuracy = {
      ...props.generatedContent.data.reportTranslations.Spanish.accuracy,
      verifiedFacts: [`El río gira [⁽¹⁾](${atlas}).`, `Las orillas se inundaron [⁽¹⁾](${fake}).`, `La corriente se duplicó [⁽¹⁾](${atlas}).`],
      unsourcedFacts: [`El canal se ensanchó [⁽¹⁾](${fake}).`], sourceReferences: [{ number: 1, url: fake, title: 'Invented source' }],
    };
    render(props);
    const check = (bend, flood, current, channel) => {
      const sourced = container.querySelector('[data-analysis-facts="verified"]');
      const rows = Array.from(sourced.querySelectorAll(':scope > ol > li'));
      expect(rows).toHaveLength(2);
      for (const [i, [fact, source]] of [[bend, catalog[0]], [flood, catalog[1]]].entries()) {
        expect(rows[i].textContent).toContain(fact);
        expect([...rows[i].querySelectorAll('a')].map(a => [a.textContent, a.href])).toEqual([[source.title, source.url]]);
      }
      const needs = container.querySelector('[data-analysis-facts="unsourced"]');
      expect(needs.querySelector('h5').textContent).toBe('Needs a source');
      expect([...needs.querySelectorAll('li')].map(li => li.textContent)).toEqual([current, channel]);
      expect(needs.querySelector('a')).toBeNull();
      expect(sourced.querySelector(`a[href="${fake}"]`)).toBeNull();
      expect(container.querySelector('[data-accuracy-verification="web-search"]')).toBeTruthy();
    };
    check('The river bends.', 'The banks flooded.', 'The current doubled.', 'The channel widened.');
    selectReport('Spanish');
    check('El río gira.', 'The banks flooded.', 'The current doubled.', 'El canal se ensanchó.');
  });

  it('keeps an AI estimate unverified even if its saved claim looks like a numbered citation', () => {
    const url = 'https://evidence.example/atlas';
    const props = makeProps({ accuracy: { verification: 'ai-estimate', rating: 'High', discrepancies: [],
      sourceReferences: [{ number: 1, url, title: 'River atlas' }], verifiedFacts: [`The river bends [⁽¹⁾](${url}).`] } });
    render(props);
    expect(container.querySelector('[data-analysis-facts="verified"]')).toBeNull();
    expect(container.querySelector('[data-accuracy-verification="ai-estimate"]')).toBeTruthy();
    const row = container.querySelector('[data-analysis-facts="unsourced"] li');
    expect(row.textContent).toBe('The river bends.');
    expect(row.querySelector('a')).toBeNull();
  });
  it('distinguishes full-passage readability from a partial AI report and lets the teacher continue it', async () => {
    const onRecheckAnalysis = vi.fn();
    const props = sectionedProps(false, { onRecheckAnalysis });
    const data = props.generatedContent.data, end = data.analysisCoverage.sections[0].end;
    render(props);
    const notice = container.querySelector('[data-analysis-needs-recheck]');
    expect(notice.textContent).toContain('Partial analysis');
    expect(notice.textContent).toContain(`AI checked ${end} of ${data.originalText.length} characters`);
    expect(notice.textContent).toContain('readability estimate uses the full passage');
    expect(notice.querySelector('[data-current-local-readability]').textContent).toContain('6.7');
    const sections = container.querySelectorAll('[data-analysis-coverage] details');
    expect(sections).toHaveLength(1);
    expect(sections[0].querySelector('summary').textContent).toContain(`characters 1–${end}`);
    expect(sections[0].querySelector('blockquote').textContent).toContain('Roots absorb water.');
    expect(sections[0].textContent).toContain('Root absorption');
    expect(sections[0].textContent).not.toContain('River deltas');
    expect(container.textContent).toContain('River deltas form downstream.');
    expect(container.querySelector('[data-accuracy-verification]')).toBeNull();
    const action = notice.querySelector('button');
    expect(action.textContent).toBe('Check remaining sections');
    await act(async () => action.click());
    expect(onRecheckAnalysis).toHaveBeenCalledWith(props.generatedContent);
    render({ ...props, isTeacherMode: false });
    expect(buttons().some(button => button.textContent === 'Check remaining sections')).toBe(false);
    expect(container.textContent).not.toContain('Root absorption finding.');
    expect(container.textContent).toContain('River deltas form downstream.');
  });

  it('keeps findings with their own passage ranges and drops them after an equal-length source change', () => {
    const props = sectionedProps(true);
    const { data } = props.generatedContent, end = data.analysisCoverage.sections[0].end;
    render(props);
    expect(container.querySelector('[data-analysis-needs-recheck]')).toBeNull();
    const rows = container.querySelectorAll('[data-analysis-coverage] details');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Root absorption');
    expect(rows[0].textContent).not.toContain('Delta formation');
    expect(rows[1].querySelector('summary').textContent).toContain(`characters ${end + 1}–${data.originalText.length}`);
    expect(rows[1].querySelector('blockquote').textContent).toContain('River deltas form downstream.');
    expect(rows[1].textContent).toContain('Delta formation');
    expect(rows[1].textContent).not.toContain('Root absorption');
    const changed = data.originalText.replace('Roots', 'Seeds');
    render({ ...props, generatedContent: { ...props.generatedContent, data: { ...data, originalText: changed, rawEnglishText: changed } } });
    expect(container.querySelector('[data-analysis-needs-recheck]').textContent).toContain(`AI checked 0 of ${changed.length}`);
    expect(container.querySelector('[data-analysis-coverage]')).toBeNull();
    expect(container.textContent).not.toContain('Delta formation finding.');
  });
  it('shows the saved passage and Retry analysis after an incomplete first check', async () => {
    const onRecheckAnalysis = vi.fn();
    const props = makeProps({ analysisIncomplete: true, originalText: 'Seeds need water.' }, { onRecheckAnalysis });
    render(props);
    const notice = container.querySelector('[data-analysis-needs-recheck]');
    expect(notice.textContent).toContain('Analysis incomplete');
    expect(notice.querySelector('[data-current-local-readability]').textContent).toContain('5.3');
    expect(container.textContent).toContain('Seeds need water.');
    expect(container.querySelector('[data-accuracy-verification]')).toBeNull();
    const retry = notice.querySelector('button');
    expect(retry.textContent).toBe('Retry analysis');
    await act(async () => retry.click());
    expect(onRecheckAnalysis).toHaveBeenCalledWith(props.generatedContent);
  });
  it('shows fresh local readability but withholds AI findings until the edited source is rechecked', async () => {
    let finish;
    const onRecheckAnalysis = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const props = makeProps({ analysisNeedsRecheck: true, originalText: 'Seeds need water.' }, { onRecheckAnalysis });
    render(props);
    const notice = container.querySelector('[data-analysis-needs-recheck]');
    expect(notice.textContent).toContain('Needs recheck');
    expect(notice.querySelector('[data-current-local-readability]').textContent).toContain('5.3');
    expect(container.textContent).toContain('Seeds need water.');
    expect(container.textContent).not.toContain('Original reason.');
    expect(container.querySelector('[data-accuracy-verification]')).toBeNull();
    const action = notice.querySelector('button');
    act(() => { action.click(); action.click(); });
    expect(onRecheckAnalysis).toHaveBeenCalledTimes(1);
    expect(onRecheckAnalysis).toHaveBeenCalledWith(props.generatedContent);
    expect(action.disabled).toBe(true);
    await act(async () => finish());
    expect(action.disabled).toBe(false);
  });
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

it('refreshes the displayed readability of an older wrapped passage without mutating its saved report', () => {
  window.React = React;
  loadAlloModule('host_handlers_module.js');
  const originalText = 'When the river rises after several days of rain,\nthe water spreads into nearby fields\nand leaves fresh soil behind.';
  const saved = { words: 20, syllables: 28, sentences: 3, score: '3.5' };
  const calculateReadability = window.AlloModules.createHostHandlers({}).calculateReadability;
  const props = makeProps({ originalText, localStats: saved, analysisTargets: { grade: '8th Grade' } }, { calculateReadability });
  render(props);
  const rating = container.querySelector('[title*="(0.39 × ASL)"]');
  expect(rating.textContent).toContain('8.7');
  expect(rating.title).toContain('analysis.readability.sentences: 1');
  expect(props.generatedContent.data.localStats).toEqual(saved);
  render(makeProps({ originalText, localStats: { ...saved, words: 8 } }, { calculateReadability }));
  expect(container.querySelector('[title*="(0.39 × ASL)"]').textContent).toContain('3.5');
});

it('refreshes an older decimal score when the original passage has not changed',()=>{
 window.React=React;loadAlloModule('host_handlers_module.js');
 const originalText='The solution contained 3.5 grams of dissolved salt in a small container.';
 const saved={words:11,syllables:17,sentences:2,score:'4.8'};
 const props=makeProps({originalText,localStats:saved},{calculateReadability:window.AlloModules.createHostHandlers({}).calculateReadability});
 render(props);expect(container.querySelector('[title*="(0.39 × ASL)"]').textContent).toContain('6.9');expect(props.generatedContent.data.localStats).toEqual(saved);
});
