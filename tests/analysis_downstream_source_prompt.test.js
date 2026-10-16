import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let dispatcher, contract;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  contract = window.AlloModules.InstructionalContext;
  // Exercise the editable source before the release module is rebuilt.
  new Function(readFileSync('generate_dispatcher_source.jsx', 'utf8'))();
  dispatcher = window.AlloModules.GenDispatcher;
});

const source = '  La Luna es un satélite.\r\n--- ENGLISH TRANSLATION ---\r\nThe Moon is a satellite.\r\n';
const english = 'The Moon is a satellite.';
const noop = () => {};

function analyzedSource({ legacy = false } = {}) {
  return {
    id: 'analyzed-reading', type: 'analysis', unitId: 'lesson', sourceFamilyId: 'reading-family',
    config: { language: 'Multiple languages' },
    sourceSnapshot: contract.createSourceSnapshot(source, { sourceArtifactId: 'analyzed-reading', language: 'Multiple languages' }),
    data: {
      ...(!legacy ? { analysisSourceVersion: 1, reportLanguage: 'English', sourceLanguage: 'Multiple languages' } : {}),
      originalText: source, rawEnglishText: source,
      readingLevel: { range: '5th Grade', explanation: 'The source is bilingual.' },
      concepts: ['Moon'], accuracy: { rating: 'Not checked', reason: '' }, grammar: [],
      sourceTranslations: { French: 'La Lune est un satellite.' },
    },
  };
}

function fixture(overrides = {}) {
  const extractSourceTextForProcessing = vi.fn(text => ({ text: english, englishBlock: english, isBilingual: true }));
  const callGemini = vi.fn(async () => JSON.stringify([{ question: 'What orbits Earth?', answer: 'The Moon.' }]));
  const deps = new Proxy({
    gradeLevel: '5th Grade', history: [], inputText: source, activeUnitId: 'lesson', selectedReadingSourceId: '',
    differentiationRange: 'None', leveledTextLanguage: 'English', selectedLanguages: [], studentInterests: [],
    guidedMode: false, guidedStep: 0, standardsInput: '', targetStandards: [], standardsPromptString: '',
    sourceTopic: 'Moon', currentUiLanguage: 'English', generatedContent: null,
    audioRef: { current: null }, alloBotRef: { current: null }, GUIDED_STEPS: [], checkAccuracyWithSearch: false,
    callGemini, extractSourceTextForProcessing, cleanJson: String, getGroupDifferentiationContext: () => '',
    getDefaultTitle: type => type, t: key => key, resolveTranslationPolicy: () => ({ enabled: false, target: 'English' }),
    glossaryImageStyle: '', universalImageStyle: '', imageGenerationStyle: '', glossaryTier2Count: 1, glossaryTier3Count: 0,
    chunkText: text => [text], countWords: text => text.trim().split(/\s+/).length,
    textFormat: 'Standard Text', leveledTextLength: 'Same as Source', keepCitations: false, quizMcqCount: 1, quizReflectionCount: 0,
    ...overrides,
  }, { get: (target, key) => key in target ? target[key] : noop });
  return { deps, callGemini, extractSourceTextForProcessing };
}

async function generateFaq(f, config = {}, textOverride = null) {
  return dispatcher.handleGenerate('faq', null, false, textOverride, { rethrowErrors: true, ...config }, true, f.deps);
}

describe('downstream prompts preserve the analyzed source including legacy separators', () => {
  it.each([false, true])('preserves the complete selected analysis in the final FAQ prompt (legacy=%s)', async legacy => {
    const item = analyzedSource({ legacy });
    const f = fixture({ history: [item], selectedReadingSourceId: item.id, inputText: 'Unrelated editor text.' });
    const result = await generateFaq(f);
    expect(f.callGemini.mock.calls[0][0]).toContain(source);
    expect(f.callGemini.mock.calls[0][0]).not.toContain(item.data.sourceTranslations.French);
    expect(f.extractSourceTextForProcessing).not.toHaveBeenCalled();
    expect(result.config.sourceTransformations).not.toContain('english-block-extraction');
    expect(result.config.sourceSnapshot.text).toBe(source);
  });

  it.each(['quiz', 'glossary', 'simplified'])('reaches the final %s generation prompt with both source languages', async type => {
    const item = analyzedSource();
    const captured = new Error('Captured the final resource prompt');
    const f = fixture({ history: [item], selectedReadingSourceId: item.id });
    // Stop at the provider boundary; source selection must have survived every
    // preprocessing step before the request, independently of model output.
    f.callGemini.mockRejectedValue(captured);
    await expect(dispatcher.handleGenerate(type, null, false, null, { rethrowErrors: true }, true, f.deps)).rejects.toBe(captured);
    expect(f.callGemini.mock.calls[0][0]).toContain(source.trim());
    expect(f.extractSourceTextForProcessing).not.toHaveBeenCalled();
  });

  it('preserves a supported original created from the analysis', async () => {
    const item = analyzedSource();
    const reading = contract.createSupportedReading(item.sourceSnapshot, { id: 'supported-reading', sourceItem: item });
    const f = fixture({ history: [item, reading], selectedReadingSourceId: reading.id });
    await generateFaq(f);
    expect(f.callGemini.mock.calls[0][0]).toContain(source);
    expect(f.extractSourceTextForProcessing).not.toHaveBeenCalled();
  });

  it('preserves the captured Full Pack input after analysis without a selected artifact id', async () => {
    const item = analyzedSource();
    const f = fixture({ history: [], inputText: 'Unrelated editor text.' });
    await generateFaq(f, {
      historyOverride: [item], generationInputText: source, inputArtifactId: null,
      sourceSnapshot: contract.createSourceSnapshot(source), sourceFamilyId: item.sourceFamilyId,
    });
    expect(f.callGemini.mock.calls[0][0]).toContain(source);
    expect(f.extractSourceTextForProcessing).not.toHaveBeenCalled();
  });

  it('preserves a saved retry input linked to the selected analysis', async () => {
    const item = analyzedSource();
    const f = fixture({ history: [item], inputText: 'Unrelated editor text.' });
    await generateFaq(f, { inputArtifactId: item.id, generationInputText: source, sourceSnapshot: item.sourceSnapshot });
    expect(f.callGemini.mock.calls[0][0]).toContain(source);
    expect(f.extractSourceTextForProcessing).not.toHaveBeenCalled();
  });

  it('retains legacy extraction for raw editor input even when identical analyzed text exists in history', async () => {
    const f = fixture({ history: [analyzedSource()], selectedReadingSourceId: '__input__' });
    const result = await generateFaq(f);
    expect(f.extractSourceTextForProcessing).toHaveBeenCalledOnce();
    expect(f.callGemini.mock.calls[0][0]).toContain(english);
    expect(f.callGemini.mock.calls[0][0]).not.toContain('La Luna es un satélite.');
    expect(result.config.sourceTransformations).toContain('english-block-extraction');
  });

  it('does not borrow preservation from an unrelated source family or a changed explicit override', async () => {
    const item = analyzedSource();
    for (const [config, override] of [
      [{ historyOverride: [item], generationInputText: source, sourceSnapshot: contract.createSourceSnapshot(source), sourceFamilyId: 'unrelated-family' }, null],
      [{ inputArtifactId: item.id, generationInputText: source, sourceSnapshot: item.sourceSnapshot }, source.replace('La Luna', 'Nuestro satélite')],
    ]) {
      const f = fixture({ history: [item] });
      await generateFaq(f, config, override);
      expect(f.extractSourceTextForProcessing).toHaveBeenCalledOnce();
      expect(f.callGemini.mock.calls[0][0]).not.toContain('--- ENGLISH TRANSLATION ---');
    }
  });
});
