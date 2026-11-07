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

  it('offers prepared passage languages as a toggle: the original stays selected; same-language or equal-text copies are left out', () => {
    const props = makeProps({ sourceTranslations: {
      Spanish: 'El zorro salta sobre el perro perezoso.', English: 'A needless second English passage.',
      French: '  The fox jupms\n over the lazy dog.  ', Malformed: { text: 'Not a string.' },
    } });
    render(props);
    const versions = () => [...container.querySelectorAll('[data-passage-language]')];
    expect(versions().map(button => button.textContent)).toEqual(['Spanish']);
    expect(container.querySelector('[data-passage-original]').getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-passage-original]').textContent).toBe('Original · English');
    expect(container.textContent).not.toContain('needless second');
    expect(container.textContent).not.toContain('El zorro');
    expect(container.textContent.match(/The fox jupms over the lazy dog\./g)).toHaveLength(1);
    act(() => versions()[0].click());
    expect(versions()[0].getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-passage-shown="Spanish"]').textContent).toBe('El zorro salta sobre el perro perezoso.');
    expect(container.textContent).toContain('Translated passage · Spanish');
    expect(container.textContent).not.toContain('output.common_original');
    expect(container.textContent).not.toContain('The fox jupms over the lazy dog.');
    act(() => container.querySelector('[data-passage-original]').click());
    expect(container.textContent.match(/The fox jupms over the lazy dog\./g)).toHaveLength(1);
    expect(props.setInputText).not.toHaveBeenCalled();
    expect(props.onUpdateResource).not.toHaveBeenCalled();
  });

  it("puts this device's app language first among prepared versions, and students cannot add languages", () => {
    const props = makeProps({ sourceTranslations: { French: 'Le renard saute.', Spanish: 'El zorro salta sobre el perro perezoso.' } },
      { isTeacherMode: false, currentUiLanguage: 'Spanish', onTranslatePassage: vi.fn(), selectedLanguages: ['Vietnamese'] });
    render(props);
    expect([...container.querySelectorAll('[data-passage-language]')].map(button => button.textContent)).toEqual(['Spanish', 'French']);
    expect(container.querySelector('[data-passage-original]').getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-add-passage-language]')).toBeNull();
  });

  it('lets a teacher add a class language through the passage translator and saves only that version', async () => {
    const translated = { Vietnamese: 'Con cáo nhảy qua con chó lười.' };
    const onTranslatePassage = vi.fn(async (item) => ({ ...item, data: { ...item.data, sourceTranslations: { ...item.data.sourceTranslations, ...translated } } }));
    const props = makeProps({}, { onTranslatePassage, outputLanguage: 'Spanish', selectedLanguages: ['Vietnamese', 'spanish'], currentUiLanguage: 'English' });
    render(props);
    // Spanish already exists and English is the source language.
    expect([...container.querySelectorAll('[data-add-passage-language]')].map(button => button.dataset.addPassageLanguage)).toEqual(['Vietnamese']);
    await act(async () => container.querySelector('[data-add-passage-language="Vietnamese"]').click());
    expect(onTranslatePassage).toHaveBeenCalledWith(props.generatedContent, 'Vietnamese');
    expect(props.onUpdateResource).toHaveBeenCalledTimes(1);
    const [id, updater] = props.onUpdateResource.mock.calls[0];
    expect(id).toBe('analysis-a');
    const latest = { ...props.generatedContent, data: { ...props.generatedContent.data, concepts: ['A concurrent saved change'] } };
    const saved = updater(latest);
    expect(saved.data.concepts).toEqual(['A concurrent saved change']);
    expect(saved.data.sourceTranslations).toEqual({ Spanish: 'El zorro salta sobre el perro perezoso.', Vietnamese: 'Con cáo nhảy qua con chó lười.' });
    expect(saved.data.reportTranslations).toBe(latest.data.reportTranslations);
    expect(updater({ ...latest, id: 'analysis-b' })).toEqual({ ...latest, id: 'analysis-b' });
    // A translation of the old wording is not saved onto an edited passage.
    const edited = { ...latest, data: { ...latest.data, originalText: 'A concurrent saved edit.' } };
    expect(updater(edited)).toBe(edited);
  });

  it('reports a failed or same-language passage translation without saving anything', async () => {
    const failing = makeProps({}, { onTranslatePassage: vi.fn(async () => { throw new Error('model down'); }), selectedLanguages: ['Vietnamese'] });
    render(failing);
    await act(async () => container.querySelector('[data-add-passage-language="Vietnamese"]').click());
    expect(failing.addToast).toHaveBeenCalledWith('The Vietnamese passage did not finish. Try again.', 'error');
    expect(failing.onUpdateResource).not.toHaveBeenCalled();
    expect(container.querySelector('[data-add-passage-language="Vietnamese"]').disabled).toBe(false);
    act(() => root.unmount()); container.remove(); root = null; container = null;
    const same = makeProps({}, { onTranslatePassage: vi.fn(async item => item), selectedLanguages: ['Vietnamese'] });
    render(same);
    await act(async () => container.querySelector('[data-add-passage-language="Vietnamese"]').click());
    expect(same.addToast).toHaveBeenCalledWith('The passage is already in Vietnamese.', 'info');
    expect(same.onUpdateResource).not.toHaveBeenCalled();
  });

  // An edit removes the passage versions (they no longer match the text); the host lists their languages.
  const editedProps = (overrides = {}, data = {}) => makeProps({ sourceTranslations: {}, passageVersionsToRefresh: ['Spanish', 'Vietnamese'], analysisNeedsRecheck: true, ...data },
    { onTranslatePassage: vi.fn(async (item, language) => ({ ...item, data: { ...item.data, sourceTranslations: { [language]: language + ' passage.' } } })),
      outputLanguage: 'Spanish', selectedLanguages: ['Vietnamese', 'French'], ...overrides });
  const applyAll = (props, item) => props.onUpdateResource.mock.calls.reduce((current, [, updater]) => updater(current), item);

  it('after an edit, tells the teacher which passage versions were removed and updates them all against the unchanged text', async () => {
    const props = editedProps();
    render(props);
    expect(container.querySelector('[data-passage-refresh]').textContent).toContain('Your edit removed the passage in Spanish, Vietnamese.');
    expect(container.querySelector('[data-add-passage-language]')).toBeNull();
    await act(async () => container.querySelector('[data-refresh-passage-versions]').click());
    expect(props.onTranslatePassage.mock.calls.map(call => call[1])).toEqual(['Spanish', 'Vietnamese']);
    const saved = applyAll(props, props.generatedContent);
    expect(saved.data.sourceTranslations).toEqual({ Spanish: 'Spanish passage.', Vietnamese: 'Vietnamese passage.' });
    expect(saved.data).not.toHaveProperty('passageVersionsToRefresh');
    expect(saved.data.analysisNeedsRecheck).toBe(true);
    const moved = { ...props.generatedContent, data: { ...props.generatedContent.data, originalText: 'Edited again meanwhile.' } };
    expect(applyAll(props, moved)).toBe(moved);
  });

  it('keeps a failed language listed, can be dismissed, never reaches students and is not offered twice', async () => {
    const props = editedProps({ onTranslatePassage: vi.fn(async (item, language) => {
      if (language === 'Vietnamese') throw new Error('model down');
      return { ...item, data: { ...item.data, sourceTranslations: { [language]: 'Pasaje.' } } };
    }) });
    render(props);
    await act(async () => container.querySelector('[data-refresh-passage-versions]').click());
    expect(props.addToast).toHaveBeenCalledWith('The Vietnamese passage did not finish. Try again.', 'error');
    const saved = applyAll(props, props.generatedContent);
    expect(saved.data.sourceTranslations).toEqual({ Spanish: 'Pasaje.' });
    expect(saved.data.passageVersionsToRefresh).toEqual(['Vietnamese']);
    act(() => root.unmount()); container.remove(); root = null; container = null;
    // Rechecked: the notice stays for Vietnamese, and Vietnamese is not also offered as a new language.
    const rechecked = editedProps({}, { analysisNeedsRecheck: undefined, sourceTranslations: { Spanish: 'Pasaje.' }, passageVersionsToRefresh: ['Vietnamese'] });
    render(rechecked);
    expect(container.querySelector('[data-passage-refresh]').textContent).toContain('in Vietnamese.');
    expect([...container.querySelectorAll('[data-add-passage-language]')].map(button => button.dataset.addPassageLanguage)).toEqual(['French']);
    act(() => container.querySelector('[data-dismiss-passage-refresh]').click());
    const dismissed = applyAll(rechecked, rechecked.generatedContent);
    expect(dismissed.data).not.toHaveProperty('passageVersionsToRefresh');
    expect(dismissed.data.sourceTranslations).toEqual({ Spanish: 'Pasaje.' });
    act(() => root.unmount()); container.remove(); root = null; container = null;
    render(editedProps({ isTeacherMode: false, onTranslatePassage: null }));
    expect(container.querySelector('[data-passage-refresh]')).toBeNull();
  });

  it("names languages by their own name and the app language's name, and keeps the saved English keys", async () => {
    const extras = readFileSync(resolve(process.cwd(), 'module_scope_extras_source.jsx'), 'utf8');
    const from = extras.indexOf('const getSpeechLangCode = ');
    const getSpeechLangCode = new Function(extras.slice(from, extras.indexOf('const languageToTTSCode', from)) + '\nreturn getSpeechLangCode;')();
    const before = { extras: window.AlloModules.ModuleScopeExtras, pipeline: window.AlloModules.TextPipelineHelpers, flag: window.AlloModules.TextPipelineHelpersModule };
    try {
      window.AlloModules.ModuleScopeExtras = { getSpeechLangCode };
      delete window.AlloModules.TextPipelineHelpersModule;
      new Function(readFileSync(resolve(process.cwd(), process.env.ALLO_PIPELINE_CANDIDATE || 'text_pipeline_helpers_module.js'), 'utf8'))();
      const spanishApp = { currentUiLanguage: 'Spanish', selectedLanguages: ['Vietnamese'] };
      const teacher = editedProps({ ...spanishApp, onTranslatePassage: vi.fn(async () => { throw new Error('model down'); }) }, { sourceTranslations: { Spanish: 'El zorro salta.' } });
      render(teacher);
      expect(container.querySelector('[data-passage-refresh]').textContent).toContain('Your edit removed the passage in vietnamita.');
      await act(async () => container.querySelector('[data-refresh-passage-versions]').click());
      expect(teacher.addToast).toHaveBeenCalledWith('The vietnamita passage did not finish. Try again.', 'error');
      act(() => root.unmount()); container.remove(); root = null; container = null;
      const student = makeProps({ sourceTranslations: { Spanish: 'El zorro salta.', Vietnamese: 'Con cáo nhảy.' } }, { ...spanishApp, isTeacherMode: false });
      render(student);
      expect(container.querySelector('[data-passage-original]').textContent).toBe('Original · English · Inglés');
      const versions = [...container.querySelectorAll('[data-passage-language]')];
      expect(versions.map(button => [button.dataset.passageLanguage, button.textContent])).toEqual([['Spanish', 'Español'], ['Vietnamese', 'Tiếng Việt · Vietnamita']]);
      expect(versions[1].querySelector('span').getAttribute('lang')).toBe('vi');
      act(() => versions[1].click());
      expect(container.textContent).toContain('Translated passage · Tiếng Việt · Vietnamita');
    } finally {
      window.AlloModules.ModuleScopeExtras = before.extras;
      window.AlloModules.TextPipelineHelpers = before.pipeline;
      window.AlloModules.TextPipelineHelpersModule = before.flag;
    }
  });

  it('downloads audio of the version on screen, in its language', () => {
    const props = makeProps();
    render(props);
    act(() => container.querySelector('[data-passage-language="Spanish"]').click());
    act(() => buttons().find(button => button.dataset.helpKey === 'analysis_download_audio').click());
    expect(props.handleDownloadAudio).toHaveBeenLastCalledWith('El zorro salta sobre el perro perezoso.', 'passage-spanish', 'dl-analysis-source', 'Spanish');
    act(() => container.querySelector('[data-passage-original]').click());
    act(() => buttons().find(button => button.dataset.helpKey === 'analysis_download_audio').click());
    expect(props.handleDownloadAudio).toHaveBeenLastCalledWith('The fox jupms over the lazy dog.', 'original-source-text', 'dl-analysis-source');
  });

  it('opens Read with supports in the version on screen, for teachers and students', () => {
    for (const isTeacherMode of [true, false]) {
      const props = makeProps({}, { isTeacherMode, onReadOriginal: vi.fn() });
      render(props);
      const read = () => container.querySelector('[data-read-original]');
      act(() => read().click());
      expect(props.onReadOriginal).toHaveBeenLastCalledWith(props.generatedContent);
      expect(read().textContent).toBe('Read with supports');
      act(() => container.querySelector('[data-passage-language="Spanish"]').click());
      expect(read().dataset.readLanguage).toBe('Spanish');
      expect(read().textContent).toBe('Read with supports · Spanish');
      act(() => read().click());
      expect(props.onReadOriginal).toHaveBeenLastCalledWith(props.generatedContent, { language: 'Spanish' });
      act(() => container.querySelector('[data-passage-original]').click());
      act(() => read().click());
      expect(props.onReadOriginal).toHaveBeenLastCalledWith(props.generatedContent);
      act(() => root.unmount()); root = null;
    }
  });

  it('uses a serif font that stacks Vietnamese marks only when the passage needs it', () => {
    const passage = () => container.querySelector('[data-passage-languages]').parentElement;
    render(makeProps());
    expect(passage().style.fontFamily).toBe('');
    act(() => container.querySelector('[data-passage-language="Spanish"]').click());
    expect(passage().style.fontFamily).toBe('');
    act(() => root.unmount()); root = null;
    render(makeProps({ sourceTranslations: { Vietnamese: 'Con cáo nhảy qua con chó lười trên đất.' } }));
    expect(passage().style.fontFamily).toBe('');
    act(() => container.querySelector('[data-passage-language="Vietnamese"]').click());
    expect(passage().style.fontFamily).toMatch(/^ui-serif, Cambria, "Times New Roman"/);
    expect(passage().style.fontFamily).not.toMatch(/^[^,]*Georgia/);
    act(() => root.unmount()); root = null;
    // Decomposed marks (base letter + two combining marks) need it too.
    render(makeProps({ originalText: 'Da\u0302\u0301t.', rawEnglishText: 'Da\u0302\u0301t.', sourceLanguage: 'Vietnamese', sourceTranslations: {} }));
    expect(container.querySelector('.font-serif').style.fontFamily).toContain('Cambria');
    act(() => root.unmount()); root = null;
    render(makeProps({ originalText: 'Đất nước.', rawEnglishText: 'Đất nước.', sourceLanguage: 'Vietnamese', sourceTranslations: {} }, { isEditingAnalysis: true }));
    expect(container.querySelector('textarea.font-serif').style.fontFamily).toContain('Cambria');
  });

  it('opens the report in the app language when that view exists, and translates the fixed rating and grade labels', () => {
    const labels = { 'analysis.rating_high': 'Alta', 'input.level_options.g5': '5.º grado' };
    render(makeProps({}, { currentUiLanguage: 'Spanish', t: key => labels[key] || key }));
    expect(container.querySelector('[aria-label="Report language"]').value).toBe('Spanish');
    expect(container.textContent).toContain('5.º grado');
    expect(container.textContent).not.toContain('5th Grade');
    expect(container.textContent).toContain('AI rating: Alta');
    act(() => root.unmount()); container.remove(); root = null; container = null;
    render(makeProps({ displayReportLanguage: 'English' }, { currentUiLanguage: 'Spanish', t: key => labels[key] || key }));
    expect(container.querySelector('[aria-label="Report language"]').value).toBe('English');
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
    expect(container.querySelector('[data-passage-language="Spanish"]')).not.toBeNull();
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
