import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const helperSource = readFileSync('phase_k_helpers_source.jsx', 'utf8');
const start = helperSource.indexOf('const translateResourceItem =');
const end = helperSource.indexOf('\nconst extractReflectionGroundingContext', start);
const translate = new Function(helperSource.slice(start, end) + '\nreturn translateResourceItem;')();
const createHostHandlers = new Function(readFileSync('host_handlers_source.jsx', 'utf8') + '\nreturn createHostHandlers;')();

const analysis = () => ({
  id: 'source-1', type: 'analysis', title: 'Source analysis', timestamp: 'original-time',
  sourceFingerprint: 'source-fingerprint', sourceSnapshot: { text: 'They is ready.\n\n', artifactId: 'input-1' },
  config: { language: 'English', sourceFingerprint: 'config-fingerprint', sourceSnapshot: { text: 'They is ready.\n\n' } },
  meta: { origin: 'source', verified: true },
  data: {
    analysisSourceVersion: 1, originalText: 'They is ready.\n\n', rawEnglishText: 'They is ready.\n\n', sourceLanguage: 'English', reportLanguage: 'English',
    localStats: { words: 3, sentences: 1, score: '1.2' },
    readingLevel: { range: 'Grade 3', explanation: 'A short sentence.' }, concepts: ['Readiness'],
    accuracy: { rating: 'High', reason: 'No factual errors.', discrepancies: [], verifiedFacts: ['Evidence [⁽¹⁾](https://example.org/fact)'], citations: [{ uri: 'https://example.org/fact', title: 'Evidence' }] },
    grammar: ['Replace "They is" with "They are".']
  }
});
const translationDeps = (edit = value => value) => ({
  callGemini: vi.fn(async prompt => {
    const report = JSON.parse(prompt.match(/Report JSON: (.*)\n/)[1]);
    const prefix = value => typeof value === 'string' && value ? 'ES ' + value : value;
    report.readingLevel.explanation = prefix(report.readingLevel.explanation);
    report.concepts = report.concepts.map(prefix);
    report.accuracy.reason = prefix(report.accuracy.reason);
    report.accuracy.discrepancies = report.accuracy.discrepancies.map(prefix);
    report.accuracy.verifiedFacts = report.accuracy.verifiedFacts.map(prefix);
    report.grammar = report.grammar.map(prefix);
    return JSON.stringify(edit({ report, sourceTranslation: 'Ellos están listos.' }));
  }), cleanJson: value => value, warnLog: vi.fn()
});
const host = (items, scope = 'single', translator = item => translate(item, 'Spanish', translationDeps())) => {
  const state = { history: items, generatedContent: items[0], inputText: items[0].data.originalText };
  const deps = {
    get history() { return state.history; }, get generatedContent() { return state.generatedContent; },
    targetTranslationLang: 'Spanish', translateScope: scope, translateResourceItem: translator,
    setHistory: setter => { state.history = setter(state.history); },
    setGeneratedContent: setter => { state.generatedContent = typeof setter === 'function' ? setter(state.generatedContent) : setter; },
    setInputText: setter => { state.inputText = typeof setter === 'function' ? setter(state.inputText) : setter; },
    setIsProcessing: vi.fn(), setGenerationStep: vi.fn(), setIsTranslateModalOpen: vi.fn(), setProcessingProgress: vi.fn(), setActiveView: vi.fn(),
    addToast: vi.fn(), t: () => '', warnLog: vi.fn(), _recordTextChange: vi.fn(), gradeLevel: '3', leveledTextLanguage: 'English',
    _resourceMutationStateRef: { current: state }
  };
  const handlers = createHostHandlers(deps);
  deps.onUpdateResource = handlers.onUpdateResource;
  deps._getFreshTextComplexityEvidence = handlers._getFreshTextComplexityEvidence;
  return { state, deps, handlers };
};
const runTranslation = async harness => {
  vi.useFakeTimers();
  const pending = harness.handlers.handleTranslateAction();
  await vi.runAllTimersAsync();
  await pending;
};
afterEach(() => { vi.useRealTimers(); delete window.AlloModules.StudentSources; });

describe('analysis translations retain their canonical source', () => {
  it('adds only translated report and companion fields, preserving all source identity and base findings', async () => {
    const item = analysis();
    const before = structuredClone(item);
    const deps = translationDeps(result => ({ ...result, originalText: 'MODEL OVERWRITE', config: {}, report: { ...result.report, readingLevel: { ...result.report.readingLevel, range: 'Grade 99' }, accuracy: { ...result.report.accuracy, rating: 'Low' } } }));
    const translated = await translate(item, 'Spanish', deps);
    expect(item).toEqual(before);
    expect(translated).toMatchObject(before);
    expect(translated.data.reportTranslations.Spanish).toMatchObject({ readingLevel: { range: 'Grade 3', explanation: 'ES A short sentence.' }, accuracy: { rating: 'High', verifiedFacts: ['ES Evidence [⁽¹⁾](https://example.org/fact)'] }, grammar: ['ES Replace "They is" with "They are".'] });
    expect(translated.data.sourceTranslations).toEqual({ Spanish: 'Ellos están listos.' });
    expect(translated.data.displayReportLanguage).toBe('Spanish');
    expect(deps.callGemini.mock.calls[0][0]).not.toMatch(/source-fingerprint|config-fingerprint|original-time/);
  });

  it('uses stored report languages, not UI language, and reuses cached or equivalent-language reports without API calls', async () => {
    const item = analysis();
    const deps = translationDeps();
    const same = await translate(item, 'en-US', deps);
    expect(same.data.displayReportLanguage).toBe('English');
    expect(deps.callGemini).not.toHaveBeenCalled();
    const spanish = await translate(item, 'Spanish', deps);
    deps.callGemini.mockClear();
    const reused = await translate(spanish, 'es', { ...deps, currentUiLanguage: 'French' });
    expect(reused.data.displayReportLanguage).toBe('Spanish');
    expect(reused.data.sourceTranslations).toBe(spanish.data.sourceTranslations);
    expect(deps.callGemini).not.toHaveBeenCalled();
  });

  it('does not migrate legacy originalText or English aliases when adding translations', async () => {
    const item = analysis();
    delete item.data.analysisSourceVersion;
    delete item.data.reportLanguage;
    item.data.originalText = 'Ellos están listos.\n';
    item.data.rawEnglishText = 'They is ready.\n\n';
    const translated = await translate(item, 'French', translationDeps());
    expect(translated.data.originalText).toBe(item.data.originalText);
    expect(translated.data.rawEnglishText).toBe(item.data.rawEnglishText);
    expect(translated.data).not.toHaveProperty('analysisSourceVersion');
    expect(translated.config).toBe(item.config);
  });

  it('suppresses a companion matching the original and does not request one for a known same-language source', async () => {
    const item = analysis();
    const out = await translate(item, 'Spanish', translationDeps(result => ({ ...result, sourceTranslation: 'They is ready.' })));
    expect(out.data).not.toHaveProperty('sourceTranslations');
    item.data.sourceLanguage = 'es';
    const deps = translationDeps();
    const spanishSource = await translate(item, 'Spanish', deps);
    expect(deps.callGemini.mock.calls[0][0]).toContain('no companion translation is needed');
    expect(spanishSource.data).not.toHaveProperty('sourceTranslations');
  });

  it('rejects replies that lose findings or quoted evidence instead of storing misleading translations', async () => {
    await expect(translate(analysis(), 'Spanish', translationDeps(result => ({ ...result, report: { ...result.report, grammar: [] } })))).rejects.toThrow('findings');
    await expect(translate(analysis(), 'Spanish', translationDeps(result => ({ ...result, report: { ...result.report, grammar: ['Use the plural form.'] } })))).rejects.toThrow('quoted evidence');
  });

  it('translates only the public companion passage while preserving the saved source', async () => {
    const item = analysis();
    item.data.originalText = 'They is ready.\n\n## Research Review\nPRIVATE REFERENCE';
    window.AlloModules.StudentSources = { publicText: text => text.split('\n\n## Research Review')[0] };
    const deps = translationDeps();
    const result = await translate(item, 'Spanish', deps);
    expect(deps.callGemini.mock.calls[0][0]).not.toContain('PRIVATE REFERENCE');
    expect(deps.callGemini.mock.calls[0][0]).toContain('Original passage: "They is ready."');
    expect(result.data.originalText).toBe(item.data.originalText);
  });

  it('omits companions when private-reference filtering is unavailable', async () => {
    const item = analysis();
    item.data.originalText = 'They is ready.\n\n## Research Review\nPRIVATE REFERENCE';
    const deps = translationDeps();
    const result = await translate(item, 'Spanish', deps);
    expect(deps.callGemini.mock.calls[0][0]).not.toContain('PRIVATE REFERENCE');
    expect(result.data.sourceTranslations).toBeUndefined();
    expect(result.data.originalText).toBe(item.data.originalText);
  });
});

describe('existing analysis reports can acquire a missing source companion', () => {
  const companionDeps = reply => ({ callGemini: vi.fn(async () => JSON.stringify(reply)), cleanJson: value => value, warnLog: vi.fn() });
  const spanishSource = () => {
    const item = analysis();
    item.data.originalText = 'Ellos están listos.\n\n';
    item.data.rawEnglishText = item.data.originalText;
    item.data.sourceLanguage = 'Spanish';
    item.config.language = 'Spanish';
    item.sourceSnapshot.text = item.data.originalText;
    item.config.sourceSnapshot.text = item.data.originalText;
    return item;
  };

  it('requests only a missing English companion when the base report is already English', async () => {
    const item = spanishSource();
    const before = structuredClone(item);
    const deps = companionDeps({ sourceTranslation: 'They are ready.', report: { grammar: ['MODEL REWRITE'] }, originalText: 'MODEL REWRITE', localStats: {} });
    const result = await translate(item, 'en-US', deps);
    expect(deps.callGemini).toHaveBeenCalledTimes(1);
    const prompt = deps.callGemini.mock.calls[0][0];
    expect(prompt).toContain('Original passage: "Ellos están listos.\\n\\n"');
    expect(prompt).not.toContain('Report JSON:');
    expect(prompt).not.toContain('Replace "They is"');
    expect(result.data.sourceTranslations).toEqual({ English: 'They are ready.' });
    expect(result.data.displayReportLanguage).toBe('English');
    expect(result.data).not.toHaveProperty('reportTranslations');
    expect(result).toMatchObject(before);
    expect(item).toEqual(before);
    expect(result.data.grammar).toBe(item.data.grammar);
    expect(result.config).toBe(item.config);
  });

  it('keeps an existing translated report unchanged when filling its missing companion', async () => {
    const item = await translate(analysis(), 'Spanish', translationDeps(result => ({ ...result, sourceTranslation: null })));
    const originalReportMap = item.data.reportTranslations;
    const deps = companionDeps({ sourceTranslation: 'Ellos están listos.', report: { accuracy: { rating: 'Low' } } });
    const result = await translate(item, 'es', deps);
    expect(deps.callGemini.mock.calls[0][0]).not.toContain('Report JSON:');
    expect(result.data.reportTranslations).toBe(originalReportMap);
    expect(result.data.sourceTranslations).toEqual({ Spanish: 'Ellos están listos.' });
    expect(result.data.displayReportLanguage).toBe('Spanish');
    expect(result.data.originalText).toBe(item.data.originalText);
    deps.callGemini.mockClear();
    const reused = await translate(result, 'es-MX', deps);
    expect(deps.callGemini).not.toHaveBeenCalled();
    expect(reused.data.sourceTranslations).toBe(result.data.sourceTranslations);
  });

  it.each(['', '   ', 'Ellos están listos.'])('repairs an unusable companion cache containing %j', async cached => {
    const item = spanishSource();
    item.data.sourceTranslations = { English: cached };
    const deps = companionDeps({ sourceTranslation: 'They are ready.' });
    const result = await translate(item, 'English', deps);
    expect(deps.callGemini).toHaveBeenCalledTimes(1);
    expect(result.data.sourceTranslations).toEqual({ English: 'They are ready.' });
  });

  it('sends only the public source and preserves the saved private source verbatim', async () => {
    const item = spanishSource();
    item.data.originalText += '## Research Review\nPRIVATE REFERENCE';
    item.studentSources = { referenceId: 'saved-private-reference' };
    const publicText = vi.fn(text => text.split('## Research Review')[0]);
    window.AlloModules.StudentSources = { publicText };
    const deps = companionDeps({ sourceTranslation: 'They are ready.' });
    const result = await translate(item, 'English', deps);
    expect(publicText).toHaveBeenCalledWith(item.data.originalText, item.studentSources);
    expect(deps.callGemini.mock.calls[0][0]).not.toContain('PRIVATE REFERENCE');
    expect(result.data.originalText).toBe(item.data.originalText);
    expect(result.studentSources).toBe(item.studentSources);
    expect(result.data.sourceTranslations.English).toBe('They are ready.');
  });

  it('does not send private source text without its privacy filter or spend on an empty public passage', async () => {
    const item = spanishSource();
    item.data.originalText += '## Research Review\nPRIVATE REFERENCE';
    const deps = companionDeps({ sourceTranslation: 'unused' });
    const unavailable = await translate(item, 'English', deps);
    expect(deps.callGemini).not.toHaveBeenCalled();
    expect(unavailable.data.sourceTranslations).toBeUndefined();
    window.AlloModules.StudentSources = { publicText: () => '' };
    await translate(item, 'English', deps);
    expect(deps.callGemini).not.toHaveBeenCalled();
  });

  it('suppresses same-text companions and accepts an explicit same-language null without changing the report', async () => {
    const item = spanishSource();
    delete item.data.sourceLanguage;
    for (const sourceTranslation of ['Ellos están listos.', null]) {
      const result = await translate(item, 'English', companionDeps({ sourceTranslation }));
      expect(result.data.sourceTranslations).toBeUndefined();
      expect(result.data.readingLevel).toBe(item.data.readingLevel);
      expect(result.data.grammar).toBe(item.data.grammar);
    }
  });

  it.each([{}, { sourceTranslation: '' }, { sourceTranslation: 42 }, []])('rejects an unusable companion-only reply: %j', async reply => {
    const item = spanishSource();
    const before = structuredClone(item);
    await expect(translate(item, 'English', companionDeps(reply))).rejects.toThrow('source translation reply');
    expect(item).toEqual(before);
  });
});

describe('analysis translation actions preserve downstream identity', () => {
  it('updates the single analysis in place, preserving id, timestamp, source fingerprint and configuration', async () => {
    const item = analysis();
    const harness = host([item]);
    await runTranslation(harness);
    expect(harness.state.history).toHaveLength(1);
    expect(harness.state.history[0]).toMatchObject(item);
    expect(harness.state.generatedContent.data.displayReportLanguage).toBe('Spanish');
    expect(harness.state.generatedContent.id).toBe(item.id);
    expect(harness.state.history[0].data.originalText).toBe(item.data.originalText);
  });

  it('keeps one analysis during pack translation while normal resources still get copies and directions follow correct ids', async () => {
    const item = analysis();
    const quiz = { id: 'quiz-1', type: 'quiz', data: { questions: [] } };
    const directions = { id: 'directions-1', type: 'directions', data: { objectives: [{ resourceRef: item.id }, { resourceRef: quiz.id }], choiceBoard: { choices: [{ resourceRef: item.id }, { resourceRef: quiz.id }] } } };
    const harness = host([item, quiz, directions], 'all', resource => resource.type === 'analysis' ? translate(resource, 'Spanish', translationDeps()) : Promise.resolve({ ...resource, title: 'Spanish copy' }));
    await runTranslation(harness);
    expect(harness.state.history.filter(resource => resource.type === 'analysis')).toHaveLength(1);
    expect(harness.state.history).toHaveLength(5);
    const quizCopy = harness.state.history[3];
    const directionsCopy = harness.state.history[4];
    expect(quizCopy.id).not.toBe(quiz.id);
    expect(directionsCopy.data.objectives.map(value => value.resourceRef)).toEqual([item.id, quizCopy.id]);
    expect(directionsCopy.data.choiceBoard.choices.map(value => value.resourceRef)).toEqual([item.id, quizCopy.id]);
    expect(harness.state.history[0].sourceFingerprint).toBe(item.sourceFingerprint);
    expect(harness.state.generatedContent.data.displayReportLanguage).toBe('Spanish');
  });

  it('does not attach a stale report when the source changes while translation is running', async () => {
    const item = analysis();
    const harness = host([item], 'single', async resource => {
      const out = await translate(resource, 'Spanish', translationDeps());
      harness.handlers.handleAnalysisTextChange('The new source.');
      return out;
    });
    await runTranslation(harness);
    expect(harness.state.history[0].data.originalText).toBe('The new source.');
    expect(harness.state.history[0].data).not.toHaveProperty('reportTranslations');
    expect(harness.state.generatedContent.data).not.toHaveProperty('reportTranslations');
    expect(harness.deps.addToast).toHaveBeenCalledWith(expect.any(String), 'warning');
    expect(harness.deps.addToast).not.toHaveBeenCalledWith(expect.any(String), 'success');
  });
});

describe('source edits invalidate translated companions', () => {
  it.each(['typing', 'correction', 'undo'])('%s clears stale translations and synchronizes versioned canonical aliases', async action => {
    const item = await translate(analysis(), 'Spanish', translationDeps());
    const harness = host([item]);
    if (action === 'typing') harness.handlers.handleAnalysisTextChange('They are ready.');
    if (action === 'correction') harness.handlers.onCorrectAnalysisText(item.id, item.data.originalText, 'They are ready.', item.data.grammar);
    if (action === 'undo') harness.handlers._applyTextDomain({ domain: 'analysis', id: item.id, value: 'They are ready.' });
    for (const resource of [harness.state.history[0], harness.state.generatedContent]) {
      expect(resource.data.originalText).toBe('They are ready.');
      expect(resource.data.rawEnglishText).toBe('They are ready.');
      expect(resource.data).not.toHaveProperty('reportTranslations');
      expect(resource.data).not.toHaveProperty('sourceTranslations');
      expect(resource.data).not.toHaveProperty('displayReportLanguage');
    }
  });

  it('preserves companions for a no-op edit and preserves legacy English aliases after an actual edit', async () => {
    const item = await translate(analysis(), 'Spanish', translationDeps());
    delete item.data.analysisSourceVersion;
    item.data.rawEnglishText = 'A distinct legacy English original.';
    const harness = host([item]);
    harness.handlers.handleAnalysisTextChange(item.data.originalText);
    expect(harness.state.history[0].data.reportTranslations).toEqual(item.data.reportTranslations);
    harness.handlers.handleAnalysisTextChange('Changed source');
    expect(harness.state.history[0].data.rawEnglishText).toBe('A distinct legacy English original.');
    expect(harness.state.history[0].data).not.toHaveProperty('reportTranslations');
  });
});
