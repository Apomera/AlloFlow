import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const sourceText = '  FIRST WITCH:\r\nWhen shall we three meet again?\r\n[Thunder & lightning.] <strange> 😀\r\n';
const translatedText = 'PRIMERA BRUJA: ¿Cuándo volveremos a encontrarnos?';
let contract, dispatcher, helpers, ensurePackOriginal, readOriginalSource, pipeline;

function sliceBetween(file, startText, endText) {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf(startText), end = source.indexOf(endText, start);
  if (start < 0 || end < 0) throw new Error('Missing production handler boundaries in ' + file);
  return source.slice(start, end);
}

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('firestore_sync_module.js');
  loadAlloModule('generation_helpers_module.js');
  loadAlloModule('doc_pipeline_module.js');
  contract = window.AlloModules.InstructionalContext;
  // Use current source, including changes not yet rebuilt into the CDN module.
  new Function(readFileSync('generate_dispatcher_source.jsx', 'utf8'))();
  dispatcher = window.AlloModules.GenDispatcher;
  helpers = window.AlloModules.GenerationHelpers;
  ensurePackOriginal = new Function('_getInstructionalContextModule',
    sliceBetween('generation_helpers_source.jsx', 'const _ensureFullPackSupportedOriginal =', '\nconst ') + '\nreturn _ensureFullPackSupportedOriginal;')(() => contract);
  readOriginalSource = sliceBetween('AlloFlowANTI.txt', '  const handleReadOriginal =', '  const handleCreateAdaptedCompanion =');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: () => undefined, isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => 'Reading', state: { leveledTextLanguage: 'Spanish', exportConfig: {}, currentUiLanguage: 'English' }
  });
});

function analysis(text = sourceText) {
  return {
    id: 'analyzed-source', type: 'analysis', title: 'Source', unitId: 'lesson', sourceFamilyId: 'analyzed-source',
    config: { grade: '5th Grade', language: 'English', sourceLanguage: 'English' },
    sourceSnapshot: contract.createSourceSnapshot(text, { sourceArtifactId: 'analyzed-source', language: 'English' }),
    data: {
      analysisSourceVersion: 1, originalText: text, sourceLanguage: 'English', reportLanguage: 'Spanish',
      readingLevel: { range: '5th-7th Grade', explanation: 'Diálogo literario.' }, concepts: ['Encuentro'],
      accuracy: { rating: 'Not checked', reason: '' }, grammar: [],
      reportTranslations: { English: { concepts: ['Meeting'], grammar: [] } },
      sourceTranslations: { Spanish: translatedText }
    }
  };
}

function resolve(item, options = {}) {
  return dispatcher.resolveGenerationSource({ type: 'quiz', inputText: 'Unrelated current editor text.', history: [item],
    selectedReadingSourceId: item.id, activeUnitId: item.unitId, contextModule: contract, ...options });
}

describe('translated analysis keeps the selected source canonical downstream', () => {
  it.each(['quiz', 'glossary', 'simplified', 'lesson-plan'])('passes the exact source to %s generation', type => {
    const item = analysis(), before = JSON.stringify(item);
    const selected = resolve(item, { type });
    expect(selected.text).toBe(sourceText);
    expect(selected.sourceSnapshot.text).toBe(sourceText);
    expect(selected.sourceSnapshot.language).toBe('English');
    expect(selected.inputArtifactId).toBe(item.id);
    expect(JSON.stringify(item)).toBe(before);
  });

  it('keeps the same source when the older-runtime fallback resolves it', () => {
    const item = analysis();
    const selected = resolve(item, { contextModule: null });
    expect(selected.text).toBe(sourceText);
    expect(selected.inputArtifactId).toBe(item.id);
  });

  it('retains source selection through a Full Pack run and its saved retry selection', () => {
    const item = analysis();
    const deps = { history: [item], inputText: 'Unrelated current editor text.', selectedReadingSourceId: item.id, activeUnitId: 'lesson' };
    const selected = helpers.resolveFullPackReadingSource(deps);
    const resumed = helpers.resolveFullPackReadingSource({ ...deps, selectedReadingSourceId: '__input__' }, { preflight: { readingSource: selected } });
    for (const result of [selected, resumed]) {
      expect(result.text).toBe(sourceText);
      expect(result.sourceSnapshot.text).toBe(sourceText);
      expect(result.inputArtifactId).toBe(item.id);
    }
  });

  it('creates one Full Pack supported original from the source, never its translation', () => {
    const item = analysis();
    let history = [item];
    const setHistory = updater => { history = updater(history); };
    const reader = ensurePackOriginal(item, { history, setHistory });
    expect(reader.data).toBe(sourceText);
    expect(reader.config.language).toBe('English');
    expect(contract.isSupportedOriginal(reader)).toBe(true);
    expect(ensurePackOriginal(item, { history, setHistory })).toBeNull();
    expect(history).toHaveLength(2);
  });

  it('opens Read with supports using the exact source and its saved language', () => {
    const item = analysis(), openReadingArtifact = vi.fn();
    let history = [item];
    const deps = { supportDraftSessionRef: { current: null }, requestReadingSupportTransition: vi.fn(),
      history, selectedReadingSourceId: item.id, inputText: 'Unrelated editor text.', activeUnitId: 'lesson',
      leveledTextLanguage: 'Spanish', sourceTopic: 'Source', gradeLevel: '5th Grade', addToast: vi.fn(),
      setHistory: updater => { history = updater(history); }, openReadingArtifact };
    const run = new Function(...Object.keys(deps), readOriginalSource + '\nreturn handleReadOriginal;')(...Object.values(deps));
    run(item);
    const reader = openReadingArtifact.mock.calls[0][0];
    expect(reader.data).toBe(sourceText);
    expect(reader.sourceSnapshot.text).toBe(sourceText);
    expect(reader.config.language).toBe('English');
    expect(item.data.originalText).toBe(sourceText);
  });

  it('preserves canonical source and language companions through saved-history round trips', () => {
    const item = analysis();
    const [loaded] = window.hydrateHistory(window.sanitizeHistoryForCloud([item]));
    expect(loaded.data.originalText).toBe(sourceText);
    expect(loaded.data.reportTranslations).toEqual(item.data.reportTranslations);
    expect(loaded.data.sourceTranslations).toEqual(item.data.sourceTranslations);
    expect(resolve(loaded).text).toBe(sourceText);
  });

  it('recaptures an edited source in its source language and preserves older readers', () => {
    const item = analysis();
    const reader = ensurePackOriginal(item, { history: [item], setHistory: () => {} });
    item.data.originalText = '  FIRST WITCH:\r\nWhen will we meet?\r\n';
    const selected = resolve(item);
    expect(selected.text).toBe(item.data.originalText);
    expect(selected.sourceSnapshot.text).toBe(item.data.originalText);
    expect(selected.sourceSnapshot.language).toBe('English');
    expect(reader.data).toBe(sourceText);
    expect(reader.sourceSnapshot.text).toBe(sourceText);
  });

  it('exports the supported original with exact whitespace and escaped source markup', () => {
    const item = analysis();
    const reader = ensurePackOriginal(item, { history: [item], setHistory: () => {} });
    const html = pipeline.generateResourceHTML(reader, false, {}, { includeOriginalReading: true, includeSimplified: true });
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('[data-original-text]').textContent).toBe(sourceText);
    expect(document.querySelector('strange')).toBeNull();
    expect(document.body.textContent).not.toContain(translatedText);
  });

  it('keeps a legacy translated analysis as the saved source the teacher selected', () => {
    const legacy = analysis();
    legacy.data = { originalText: translatedText, translatedText, rawEnglishText: sourceText };
    const selected = resolve(legacy);
    expect(selected.text).toBe(translatedText);
    expect(selected.sourceSnapshot.text).toBe(translatedText);
    expect(legacy.sourceSnapshot.text).toBe(sourceText);
  });
});
