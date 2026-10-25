import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

beforeAll(() => {
  loadAlloModule('firestore_sync_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
});

const createHost = new Function(readFileSync('host_handlers_source.jsx', 'utf8') + '\nreturn createHostHandlers;')();
const source = () => ({
  id: 'source', type: 'analysis', timestamp: '2026-10-01T00:00:00.000Z',
  config: { language: 'Spanish' }, sourceSnapshot: { text: 'El agua importa.\r\n' },
  data: { analysisSourceVersion: 1, originalText: 'El agua importa.\r\n', rawEnglishText: 'El agua importa.\r\n',
    reportLanguage: 'English', sourceLanguage: 'Spanish', readingLevel: { range: '3', explanation: 'Simple.' },
    concepts: ['Water'], accuracy: { rating: 'High', reason: 'Correct.' }, grammar: [] }
});
const merge = createHost({ getArtifactInstanceId: item => item._artifactInstanceId || '', getArtifactPublicId: item => item.id }).mergeCloudAndLocal;

function harness(items = [source()], scope = 'single') {
  const state = { history: items, generatedContent: items[0] };
  const deps = {
    get history() { return state.history; }, get generatedContent() { return state.generatedContent; },
    _resourceMutationStateRef: { current: state }, translateScope: scope, targetTranslationLang: 'French',
    translateResourceItem: vi.fn(async item => item.type === 'analysis'
      ? { ...item, data: { ...item.data, displayReportLanguage: 'French', reportTranslations: { French: { concepts: ['Eau'] } }, sourceTranslations: { French: "L’eau compte." } } }
      : { ...item, data: 'Translated quiz' }),
    setHistory: fn => { state.history = fn(state.history); },
    setGeneratedContent: value => { state.generatedContent = typeof value === 'function' ? value(state.generatedContent) : value; },
    setIsProcessing: vi.fn(), setGenerationStep: vi.fn(), setIsTranslateModalOpen: vi.fn(), setProcessingProgress: vi.fn(),
    setActiveView: vi.fn(), addToast: vi.fn(), warnLog: vi.fn(), t: () => '', _recordTextChange: vi.fn(),
    _getFreshTextComplexityEvidence: () => ({ targetGrade: '3', instructionalText: {} })
  };
  return { state, deps, handlers: createHost(deps) };
}
async function translate(h, scope) {
  const pending = h.handlers.handleTranslateAction(scope);
  await vi.runAllTimersAsync();
  await pending;
}
afterEach(() => vi.useRealTimers());

describe('analysis language views survive sync without replacing source edits', () => {
  it('merges an in-place translation into another device and preserves creation time and source identity', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
    const original = source(), h = harness([original]);
    await translate(h);
    const translated = h.state.history[0];
    expect(translated.analysisTranslationUpdatedAt).toBe('2026-10-14T12:00:00.500Z');
    expect(translated.updatedAt).toBeUndefined();
    const cloudHistory = window.hydrateHistory(JSON.parse(JSON.stringify(window.sanitizeHistoryForCloud([translated]))));
    expect(cloudHistory[0].analysisTranslationUpdatedAt).toBe(translated.analysisTranslationUpdatedAt);
    const [synced] = merge([original], cloudHistory);
    expect(synced.data.sourceTranslations.French).toBe('L’eau compte.');
    expect(synced.data.displayReportLanguage).toBe('French');
    expect(synced.data.originalText).toBe(original.data.originalText);
    expect(synced.sourceSnapshot).toEqual(original.sourceSnapshot);
    expect(synced.timestamp).toBe(original.timestamp);
    expect(merge([synced], [original])[0]).toEqual(synced);
  });

  it.each(['edit', 'undo'])('keeps a newer local source %s over a later translation from a stale device', async action => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
    const original = source(), editor = harness([original]);
    if (action === 'edit') editor.handlers.handleAnalysisTextChange('A corrected source.');
    else editor.handlers._applyTextDomain({ domain: 'analysis', id: original.id, value: 'An earlier source restored.' });
    const edited = editor.state.history[0];
    expect(edited.updatedAt).toBe('2026-10-14T12:00:00.000Z');
    vi.setSystemTime(new Date('2026-10-14T13:00:00Z'));
    const stale = harness([original]); await translate(stale);
    expect(merge([edited], stale.state.history)[0]).toEqual(edited);
    expect(merge(stale.state.history, [edited])[0]).toEqual(edited);
  });

  it.each(['host', 'shell'])('does not treat %s display-language selection as a source edit', implementation => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-14T13:00:00Z'));
    const stale = source(), h = harness([stale]);
    let update = h.handlers.onUpdateResource;
    if (implementation === 'shell') {
      const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
      const start = shell.indexOf('  const onUpdateResource = useCallback(');
      const end = shell.indexOf('  const handleNoteUpdate =', start);
      update = new Function('useCallback', '_resourceMutationStateRef', 'setHistory', 'setGeneratedContent',
        shell.slice(start, end) + '\nreturn onUpdateResource;')((fn) => fn, h.deps._resourceMutationStateRef, h.deps.setHistory, h.deps.setGeneratedContent);
    }
    update(stale.id, item => ({ ...item, data: { ...item.data, displayReportLanguage: 'English' } }));
    expect(h.state.history[0].updatedAt).toBeUndefined();
    expect(h.state.history[0].analysisTranslationUpdatedAt).toBe('2026-10-14T13:00:00.000Z');
    const edited = { ...stale, updatedAt: '2026-10-14T12:00:00Z', data: { ...stale.data, originalText: 'New source.' } };
    expect(merge([edited], h.state.history)[0]).toEqual(edited);
  });

  it('combines compatible language caches and keeps the newest preference without changing the base', () => {
    const local = source(), cloud = source();
    local.analysisTranslationUpdatedAt = '2026-10-14T12:00:00Z';
    local.data.reportTranslations = { French: { concepts: ['Eau'] } };
    local.data.displayReportLanguage = 'French';
    cloud.analysisTranslationUpdatedAt = '2026-10-14T13:00:00Z';
    cloud.data.reportTranslations = { German: { concepts: ['Wasser'] } };
    cloud.data.displayReportLanguage = 'German';
    const [synced] = merge([local], [cloud]);
    expect(Object.keys(synced.data.reportTranslations).sort()).toEqual(['French', 'German']);
    expect(synced.data.displayReportLanguage).toBe('German');
    expect(synced.data.originalText).toBe(local.data.originalText);
  });

  it('rejects views based on stale findings even when their translation timestamp is later', () => {
    const local = source(), cloud = source();
    local.updatedAt = '2026-10-14T12:00:00Z'; local.data.grammar = ['New finding.'];
    cloud.analysisTranslationUpdatedAt = '2026-10-14T13:00:00Z'; cloud.data.sourceTranslations = { French: 'Old translation.' };
    expect(merge([local], [cloud])[0]).toEqual(local);
  });

  it('does not restore stale cached languages when another translation finishes', async () => {
    vi.useFakeTimers();
    const original = source();
    original.data.reportTranslations = { Spanish: { concepts: ['Old cached report'] } };
    original.data.sourceTranslations = { English: 'Old cached passage' };
    const h = harness([original]);
    h.deps.translateResourceItem = async item => {
      const newer = { ...item, data: { ...item.data,
        reportTranslations: { Spanish: { concepts: ['New cached report'] } },
        sourceTranslations: { English: 'New cached passage' } } };
      h.state.history = [newer]; h.state.generatedContent = newer;
      return { ...item, data: { ...item.data, displayReportLanguage: 'French',
        reportTranslations: { ...item.data.reportTranslations, French: { concepts: ['Eau'] } },
        sourceTranslations: { ...item.data.sourceTranslations, French: 'De l’eau' } } };
    };
    await translate(h);
    expect(h.state.history[0].data.reportTranslations.Spanish.concepts).toEqual(['New cached report']);
    expect(h.state.history[0].data.sourceTranslations.English).toBe('New cached passage');
    expect(h.state.history[0].data.sourceTranslations.French).toBe('De l’eau');
  });

  it('honors ordinary edit timestamps, legacy creation timestamps, and separate imported instances', () => {
    const local = { id: 'quiz', type: 'quiz', timestamp: '2026-10-01T00:00:00Z', data: 'Old' };
    const cloud = { ...local, updatedAt: '2026-10-14T12:00:00Z', data: 'Edited' };
    expect(merge([local], [cloud])[0]).toBe(cloud);
    const legacy = { ...local, timestamp: '2026-10-02T00:00:00Z', updatedAt: 'invalid', data: 'Legacy' };
    expect(merge([local], [legacy])[0]).toBe(legacy);
    expect(merge([{ ...local, _artifactInstanceId: 'a' }], [{ ...cloud, _artifactInstanceId: 'b' }])).toHaveLength(2);
  });
});

describe('translation modal scope is captured from the clicked button', () => {
  it.each(['single', 'pack'])('uses %s and the modal companion choice before React commits the previous scope', async scope => {
    vi.useFakeTimers();
    const current = { ...source(), unitId: 'current-unit' };
    const quiz = { id: 'quiz', type: 'quiz', unitId: 'current-unit', data: 'Question' };
    const unrelated = { id: 'other-quiz', type: 'quiz', unitId: 'other-unit', data: 'Other question' };
    const h = harness([current, quiz, unrelated], scope === 'single' ? 'pack' : 'single');
    const app = readFileSync('AlloFlowANTI.txt', 'utf8');
    const body = app.match(new RegExp("onClick=\\{\\(\\) => \\{ (setTranslateScope\\('" + scope + "'\\);.*?) \\}\\}"))[1];
    let pending;
    new Function('setTranslateScope', 'handleTranslateAction', 'companionPolicy', body)(vi.fn(), (requested, options) => {
      pending = h.handlers.handleTranslateAction(requested, options);
    }, { mode: 'off' });
    await vi.runAllTimersAsync(); await pending;
    expect(h.deps.translateResourceItem.mock.calls.map(([item]) => item.id)).toEqual(scope === 'single' ? ['source'] : ['source', 'quiz']);
    for (const [, targetLanguage, options] of h.deps.translateResourceItem.mock.calls) {
      expect(targetLanguage).toBe('French');
      expect(options.translationPolicy).toMatchObject({ enabled: false, target: '', mode: 'off' });
    }
  });

  it('keeps the primary and companion languages fixed for every resource while settings change during a reply', async () => {
    vi.useFakeTimers();
    const h = harness([source(), { id: 'quiz', type: 'quiz', data: 'Question' }], 'single');
    const pipeline = window.AlloModules.TextPipelineHelpers;
    Object.assign(h.deps, {
      targetTranslationLang: ' French ', currentUiLanguage: 'Spanish', translationMode: 'auto',
      selectedLanguages: ['French', 'Spanish', 'Arabic'],
      resolveTranslationPolicy: vi.fn(pipeline.resolveTranslationPolicy),
      translationTargetChoices: pipeline.translationTargetChoices
    });
    h.deps.translateResourceItem = vi.fn(async item => {
      if (h.deps.translateResourceItem.mock.calls.length === 1) {
        h.deps.targetTranslationLang = 'Arabic';
        h.deps.currentUiLanguage = 'German';
        h.deps.translationMode = 'off';
        h.deps.selectedLanguages = [];
      }
      return item.type === 'analysis'
        ? { ...item, data: { ...item.data, displayReportLanguage: 'French', reportTranslations: { French: { concepts: ['Eau'] } } } }
        : { ...item, data: 'Question traduite', translationOf: item.id };
    });
    await translate(h, 'all');
    expect(h.deps.translateResourceItem.mock.calls.map(([item]) => item.id)).toEqual(['source', 'quiz']);
    expect(h.deps.resolveTranslationPolicy).toHaveBeenCalledTimes(1);
    expect(h.deps.resolveTranslationPolicy).toHaveBeenCalledWith('auto', 'French', 'Spanish', expect.any(Array));
    const policy = h.deps.translateResourceItem.mock.calls[0][2].translationPolicy;
    expect(policy).toMatchObject({ enabled: true, target: 'Spanish', mode: 'auto' });
    for (const [, targetLanguage, options] of h.deps.translateResourceItem.mock.calls) {
      expect(targetLanguage).toBe('French');
      expect(options.translationPolicy).toBe(policy);
    }
  });
});
