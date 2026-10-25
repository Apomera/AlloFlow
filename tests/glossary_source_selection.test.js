import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let dispatcher, contract;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  contract = window.AlloModules.InstructionalContext;
  // Exercise the editable dispatcher so this regression also protects rebuilds.
  new Function(readFileSync('generate_dispatcher_source.jsx', 'utf8'))();
  dispatcher = window.AlloModules.GenDispatcher;
});

beforeEach(() => {
  document.body.innerHTML = '<button id="generate-glossary">Generate glossary</button>'
    + '<section data-reading-source-choice><label for="reading-activity-source">Based on</label>'
    + '<select id="reading-activity-source"><option value="">Choose a reading for this activity</option>'
    + '<option value="moon">Moon reading</option><option value="plants">Plants reading</option></select></section>';
  document.getElementById('reading-activity-source').scrollIntoView = vi.fn();
  document.getElementById('generate-glossary').focus();
});
afterEach(() => { document.body.innerHTML = ''; });

const noop = () => {};
const moonText = 'The Moon orbits Earth, and its gravitational pull creates tides.';
const plantText = 'Plant chloroplasts contain chlorophyll that absorbs sunlight for photosynthesis.';
const sourcePickerTypes = ['simplified', 'glossary', 'quiz', 'sentence-frames', 'faq', 'brainstorm', 'outline',
  'timeline', 'concept-sort', 'dbq', 'note-taking', 'anchor-chart', 'memory-aid', 'applied-challenge',
  'image', 'gemini-bridge', 'lesson-plan', 'persona', 'adventure'];
function readings(role = 'unspecified') {
  return [
    { id: 'moon', title: 'Moon reading', data: { originalText: moonText } },
    { id: 'plants', title: 'Plants reading', data: { originalText: plantText } },
  ].map(item => ({ ...item, type: 'analysis', unitId: 'lesson',
    instructionalText: { role, form: 'original', designationSource: 'educator' } }));
}

function fixture(overrides = {}) {
  const callGemini = vi.fn();
  const addToast = vi.fn();
  const setIsProcessing = vi.fn();
  const setHistory = vi.fn();
  const setGeneratedContent = vi.fn();
  const deps = new Proxy({
    gradeLevel: '5th Grade', history: readings(), inputText: 'Residual text from another source.',
    activeUnitId: 'lesson', selectedReadingSourceId: '', differentiationRange: 'None',
    leveledTextLanguage: 'English', selectedLanguages: [], studentInterests: [],
    guidedMode: false, guidedStep: 0, standardsInput: '', targetStandards: [], standardsPromptString: '',
    sourceTopic: '', currentUiLanguage: 'English', generatedContent: null,
    audioRef: { current: null }, alloBotRef: { current: null }, GUIDED_STEPS: [], checkAccuracyWithSearch: false,
    callGemini, addToast, setIsProcessing, setHistory, setGeneratedContent,
    extractSourceTextForProcessing: text => ({ text, englishBlock: '', isBilingual: false }),
    cleanJson: String, getGroupDifferentiationContext: () => '', getDefaultTitle: type => type,
    t: key => key, resolveTranslationPolicy: () => ({ enabled: false, target: 'English' }),
    glossaryImageStyle: '', universalImageStyle: '', imageGenerationStyle: '', glossaryTier2Count: 1, glossaryTier3Count: 0,
    chunkText: text => [text], countWords: text => text.trim().split(/\s+/).length,
    textFormat: 'Standard Text', leveledTextLength: 'Same as Source', keepCitations: false,
    ...overrides,
  }, { get: (target, key) => key in target ? target[key] : noop });
  return { deps, callGemini, addToast, setIsProcessing, setHistory, setGeneratedContent };
}

function generate(f, config = {}, keepLoading = false, switchView = true) {
  return dispatcher.handleGenerate('glossary', null, keepLoading, null, config, switchView, f.deps);
}

const acceptAndCancelChoice = request => { request.onComplete(undefined); return true; };

describe('native glossary generation language contract', () => {
  it.each([
    ['French', 'auto', 'French', []],
    ['Spanish', 'off', 'Spanish', []],
    ['Spanish', 'auto', 'Spanish', ['French']],
    ['All Selected Languages', 'off', 'French', ['Spanish']],
  ])('generates %s with %s support and saves actual base metadata', async (output, mode, base, languages) => {
    const priorImages = window.AlloImageGeneration;
    window.AlloImageGeneration = { isEnabled: () => false };
    try {
      const f = fixture({ history: readings().slice(0, 1), selectedReadingSourceId: 'moon',
        nativeLanguageDefaultsVersion: 1, appLanguage: 'French', currentUiLanguage: 'French',
        leveledTextLanguage: output, selectedLanguages: ['French', 'Spanish', 'spanish'], translationMode: mode,
        resolveTranslationPolicy: window.AlloModules.TextPipelineHelpers.resolveTranslationPolicy,
        useEmojis: false, includeEtymology: false, glossaryDefinitionLevel: 'Same as Global Level',
      });
      f.callGemini.mockResolvedValue(JSON.stringify([{ term: base === 'Spanish' ? 'Luna' : 'Lune', def: 'Une définition.',
        sourceTerm: 'Moon', sourceLanguage: 'English', translations: { English: 'Moon: A natural satellite.', French: 'Lune: Un satellite.', Spanish: 'Luna: Un satélite.' } }]));
      const resource = await generate(f, { rethrowErrors: true });
      expect(resource).toMatchObject({ baseLanguage: base, glossaryLanguageSchemaVersion: 1,
        config: { language: base, baseLanguage: base, nativeLanguageDefaultsVersion: 1 } });
      expect(resource.data[0]).toMatchObject({ termLanguage: base, definitionLanguage: base, sourceTerm: 'Moon', sourceLanguage: 'English' });
      expect(Object.keys(resource.data[0].translations)).toEqual(languages);
      expect(f.callGemini.mock.calls[0][0]).toContain('PRIMARY LANGUAGE: Write each visible term and definition in ' + base);
      expect(f.callGemini.mock.calls[0][0]).not.toContain('An English definition');
    } finally { window.AlloImageGeneration = priorImages; }
  });
});

describe('glossary asks for the source before starting generation', () => {
  it('requests the picker with readable titles and previews only when the sources are ambiguous', async () => {
    const requestGenerationSourceChoice = vi.fn(acceptAndCancelChoice);
    const f = fixture({ requestGenerationSourceChoice });
    await generate(f);
    expect(requestGenerationSourceChoice).toHaveBeenCalledOnce();
    expect(requestGenerationSourceChoice.mock.calls[0][0]).toMatchObject({
      type: 'glossary', choices: [
        { value: 'moon', label: 'Moon reading', description: moonText, sourceText: moonText },
        { value: 'plants', label: 'Plants reading', description: plantText, sourceText: plantText },
      ],
    });
    expect(f.addToast).not.toHaveBeenCalled();
    expect(f.callGemini).not.toHaveBeenCalled();
    expect(f.setIsProcessing).not.toHaveBeenCalledWith(true);
    expect(f.setHistory).not.toHaveBeenCalled();
  });

  it.each(['single', 'selected', 'main'])('skips the picker when a %s reading already resolves the source', async mode => {
    const history = readings();
    if (mode === 'single') history.pop();
    if (mode === 'main') history[0].instructionalText.role = 'primary';
    const requestGenerationSourceChoice = vi.fn(acceptAndCancelChoice);
    const f = fixture({ history, selectedReadingSourceId: mode === 'selected' ? 'moon' : '', requestGenerationSourceChoice });
    const captured = new Error('Selected glossary source reached the provider');
    f.callGemini.mockRejectedValue(captured);
    await generate(f);
    expect(requestGenerationSourceChoice).not.toHaveBeenCalled();
    expect(f.callGemini.mock.calls[0][0]).toContain(moonText);
    expect(f.callGemini.mock.calls[0][0]).not.toContain(plantText);
  });

  it('excludes ineligible sources and bounds long previews without changing the saved text', async () => {
    const history = readings();
    history[0].data.originalText = 'A long source passage.\n'.repeat(60);
    history.push({ id: 'invalid', type: 'simplified', unitId: 'lesson', data: 'An unverified copy.',
      instructionalText: { role: 'supplemental', form: 'same-text-supported' } });
    const requestGenerationSourceChoice = vi.fn(acceptAndCancelChoice);
    await generate(fixture({ history, requestGenerationSourceChoice }));
    const choices = requestGenerationSourceChoice.mock.calls[0][0].choices;
    expect(choices.map(choice => choice.value)).toEqual(['moon', 'plants']);
    expect(choices[0].description.length).toBeLessThanOrEqual(181);
    expect(choices[0].sourceText).toBe(history[0].data.originalText);
  });

  it.each([[true, true], [false, false]])('does not prompt during noninteractive generation (keepLoading=%s, switchView=%s)', async (keepLoading, switchView) => {
    const requestGenerationSourceChoice = vi.fn(acceptAndCancelChoice);
    const f = fixture({ requestGenerationSourceChoice });
    await generate(f, {}, keepLoading, switchView);
    expect(requestGenerationSourceChoice).not.toHaveBeenCalled();
    expect(f.callGemini).not.toHaveBeenCalled();
  });

  it.each(['unspecified', 'supplemental'])('focuses the source choice when neither saved reading is primary (%s)', async role => {
    const history = readings(role);
    const before = JSON.stringify(history);
    const f = fixture({ history });

    await generate(f);

    expect(f.addToast).toHaveBeenCalledWith(expect.stringMatching(/choose a (?:source|reading)/i), 'info');
    expect(f.addToast.mock.calls[0][0]).not.toMatch(/more than one main reading/i);
    expect(document.activeElement).toBe(document.getElementById('reading-activity-source'));
    expect(document.activeElement.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect(f.callGemini).not.toHaveBeenCalled();
    expect(f.setIsProcessing).not.toHaveBeenCalledWith(true);
    expect(f.setHistory).not.toHaveBeenCalled();
    expect(f.setGeneratedContent).not.toHaveBeenCalled();
    expect(JSON.stringify(history)).toBe(before);
  });

  it('preserves the source-ambiguous error for batch callers without changing focus', async () => {
    const f = fixture();
    await expect(generate(f, { rethrowErrors: true }, true, false)).rejects.toMatchObject({ code: 'allo/source-ambiguous' });
    expect(document.activeElement.id).toBe('generate-glossary');
    expect(f.callGemini).not.toHaveBeenCalled();
    expect(f.setHistory).not.toHaveBeenCalled();
  });

  it.each(['moon', 'plants'])('uses only the explicitly chosen %s source in the glossary request', async selectedId => {
    const history = readings();
    const selected = history.find(item => item.id === selectedId);
    const other = history.find(item => item.id !== selectedId);
    const f = fixture({ history, selectedReadingSourceId: selectedId });
    const captured = new Error('Captured the glossary provider request');
    f.callGemini.mockRejectedValue(captured);

    await expect(generate(f, { rethrowErrors: true })).rejects.toBe(captured);

    expect(f.callGemini).toHaveBeenCalled();
    const prompt = f.callGemini.mock.calls[0][0];
    expect(prompt).toContain(selected.data.originalText);
    expect(prompt).not.toContain(other.data.originalText);
    expect(prompt).not.toContain(f.deps.inputText);
    expect(history.every(item => item.instructionalText.role === 'unspecified')).toBe(true);
  });

  it('completes and saves a glossary after the user chooses one of the sources', async () => {
    const f = fixture();
    await generate(f);
    expect(f.callGemini).not.toHaveBeenCalled();
    f.deps.selectedReadingSourceId = 'plants';
    f.callGemini.mockResolvedValue(JSON.stringify([{ term: 'chlorophyll', def: 'The green pigment plants use to absorb light.', tier: 'Domain-Specific' }]));

    const glossary = await generate(f, { rethrowErrors: true });

    expect(glossary).toMatchObject({ type: 'glossary', inputArtifactId: 'plants',
      config: { inputArtifactId: 'plants', sourceSnapshot: { text: plantText } } });
    expect(glossary.data[0].term).toBe('chlorophyll');
    expect(f.setHistory.mock.calls[0][0](f.deps.history)).toEqual([...f.deps.history, glossary]);
    expect(f.deps.history.every(item => item.instructionalText.role === 'unspecified')).toBe(true);
    expect(f.setIsProcessing).toHaveBeenLastCalledWith(false);
  });
});

describe('shared source picker across reading-based generators', () => {
  it.each(sourcePickerTypes)('asks before starting %s when the readings are ambiguous', async type => {
    const requestGenerationSourceChoice = vi.fn(acceptAndCancelChoice);
    const f = fixture({ requestGenerationSourceChoice });
    const historyBefore = JSON.stringify(f.deps.history);

    await dispatcher.handleGenerate(type, null, false, null, {}, true, f.deps);

    expect(dispatcher.getGenerationSourceChoiceLabel(type)).toEqual(expect.any(String));
    expect(dispatcher.getGenerationSourceChoiceLabel(type).trim()).not.toBe('');
    expect(requestGenerationSourceChoice).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      type, choices: expect.arrayContaining([
        expect.objectContaining({ value: 'moon', sourceText: moonText }),
        expect.objectContaining({ value: 'plants', sourceText: plantText }),
      ]), onComplete: expect.any(Function),
    }));
    expect(f.callGemini).not.toHaveBeenCalled();
    expect(f.setIsProcessing).not.toHaveBeenCalledWith(true);
    expect(f.setHistory).not.toHaveBeenCalled();
    expect(f.setGeneratedContent).not.toHaveBeenCalled();
    expect(JSON.stringify(f.deps.history)).toBe(historyBefore);
  });

  it.each(['analysis', 'math', 'alignment-report', 'unknown'])('does not offer the reading picker for %s', async type => {
    expect(dispatcher.getGenerationSourceChoiceLabel(type)).toBeFalsy();
    const requestGenerationSourceChoice = vi.fn(acceptAndCancelChoice);
    const f = fixture({ requestGenerationSourceChoice });
    // These tools may use unrelated generation paths; none may request this picker.
    f.callGemini.mockRejectedValue(new Error('Stop at provider boundary'));
    await dispatcher.handleGenerate(type, null, false, null, {}, true, f.deps);
    expect(requestGenerationSourceChoice).not.toHaveBeenCalled();
  });

  it('waits for resumed glossary completion and returns its generated resource', async () => {
    let request;
    const f = fixture({ requestGenerationSourceChoice: vi.fn(value => { request = value; return true; }) });
    const completed = vi.fn();
    const pending = generate(f).then(result => { completed(result); return result; });
    await vi.waitFor(() => expect(request).toBeDefined());
    expect(completed).not.toHaveBeenCalled();
    expect(f.callGemini).not.toHaveBeenCalled();
    f.callGemini.mockResolvedValue(JSON.stringify([{ term: 'chlorophyll', def: 'A light absorbing plant pigment.', tier: 'Domain-Specific' }]));

    const result = await dispatcher.handleGenerate(request.type, request.langOverride, false, request.textOverride,
      { ...request.configOverride, inputArtifactId: 'plants', selectedReadingSourceId: 'plants' }, request.switchView, f.deps);
    request.onComplete(result);

    await expect(pending).resolves.toBe(result);
    expect(result).toMatchObject({ type: 'glossary', inputArtifactId: 'plants' });
    expect(f.callGemini.mock.calls[0][0]).toContain(plantText);
    expect(f.callGemini.mock.calls[0][0]).not.toContain(moonText);
    expect(f.deps.history.every(item => item.instructionalText.role === 'unspecified')).toBe(true);
  });

  it('resolves a canceled source choice without starting generation', async () => {
    let request;
    const f = fixture({ requestGenerationSourceChoice: vi.fn(value => { request = value; return true; }) });
    const pending = dispatcher.handleGenerate('quiz', null, false, null, {}, true, f.deps);
    await vi.waitFor(() => expect(request).toBeDefined());
    request.onComplete(undefined);
    await expect(pending).resolves.toBeUndefined();
    expect(f.callGemini).not.toHaveBeenCalled();
    expect(f.setHistory).not.toHaveBeenCalled();
  });

  it('does not leave a pending request when the dialog module declines the picker', async () => {
    const requestGenerationSourceChoice = vi.fn(() => false);
    const f = fixture({ requestGenerationSourceChoice });
    await expect(dispatcher.handleGenerate('quiz', null, false, null, {}, true, f.deps)).resolves.toBeUndefined();
    expect(requestGenerationSourceChoice).toHaveBeenCalledOnce();
    expect(f.callGemini).not.toHaveBeenCalled();
    expect(f.addToast).toHaveBeenCalled();
  });

  it('allows the memory-aid preview to choose a source without switching views', async () => {
    const requestGenerationSourceChoice = vi.fn(acceptAndCancelChoice);
    const f = fixture({ requestGenerationSourceChoice });
    await dispatcher.handleGenerate('memory-aid', null, false, null, { memoryAidPreviewOnly: true }, false, f.deps);
    expect(requestGenerationSourceChoice).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      type: 'memory-aid', switchView: false, configOverride: { memoryAidPreviewOnly: true },
    }));
    expect(f.callGemini).not.toHaveBeenCalled();
  });

  it.each(sourcePickerTypes)('keeps background %s generation noninteractive', async type => {
    const requestGenerationSourceChoice = vi.fn(acceptAndCancelChoice);
    const f = fixture({ requestGenerationSourceChoice });
    await dispatcher.handleGenerate(type, null, false, null, {}, false, f.deps);
    expect(requestGenerationSourceChoice).not.toHaveBeenCalled();
    expect(f.callGemini).not.toHaveBeenCalled();
  });

  it('builds reusable source cards from the resolver without modifying saved text', () => {
    const history = readings();
    const before = JSON.stringify(history);
    const resolved = dispatcher.resolveGenerationSource({ type: 'quiz', history, inputText: 'Unrelated input',
      activeUnitId: 'lesson', contextModule: contract });
    expect(dispatcher.getGenerationSourceChoices(resolved)).toEqual([
      { value: 'moon', label: 'Moon reading', description: moonText, sourceText: moonText },
      { value: 'plants', label: 'Plants reading', description: plantText, sourceText: plantText },
    ]);
    expect(JSON.stringify(history)).toBe(before);
  });

  it.each(['lesson-plan', 'gemini-bridge'])('%s builds its context from explicit source text instead of ambient input', async type => {
    const captured = new Error('Captured resolved source context');
    const getLessonContext = vi.fn(() => { throw captured; });
    const requestGenerationSourceChoice = vi.fn(acceptAndCancelChoice);
    const f = fixture({ getLessonContext, requestGenerationSourceChoice });

    await expect(dispatcher.handleGenerate(type, null, false, plantText, { rethrowErrors: true }, true, f.deps))
      .rejects.toBe(captured);

    expect(getLessonContext).toHaveBeenCalledExactlyOnceWith(expect.any(Array), expect.objectContaining({
      inputText: plantText, selectedReadingSourceId: '__input__', unitId: 'lesson',
    }));
    expect(getLessonContext.mock.calls[0][1].inputText).not.toBe(f.deps.inputText);
    expect(requestGenerationSourceChoice).not.toHaveBeenCalled();
    expect(f.callGemini).not.toHaveBeenCalled();
  });

  it.each(['lesson-plan', 'gemini-bridge'])('%s forwards the chosen saved reading and its exact text to context generation', async type => {
    const captured = new Error('Captured saved source context');
    const getLessonContext = vi.fn(() => { throw captured; });
    const requestGenerationSourceChoice = vi.fn(acceptAndCancelChoice);
    const f = fixture({ getLessonContext, requestGenerationSourceChoice });

    await expect(dispatcher.handleGenerate(type, null, false, null,
      { inputArtifactId: 'plants', selectedReadingSourceId: 'plants', rethrowErrors: true }, true, f.deps))
      .rejects.toBe(captured);

    expect(getLessonContext).toHaveBeenCalledExactlyOnceWith(expect.any(Array), expect.objectContaining({
      inputText: plantText, selectedReadingSourceId: 'plants', unitId: 'lesson',
    }));
    expect(requestGenerationSourceChoice).not.toHaveBeenCalled();
    expect(f.callGemini).not.toHaveBeenCalled();
    expect(f.setHistory).not.toHaveBeenCalled();
    expect(f.deps.history.every(item => item.instructionalText.role === 'unspecified')).toBe(true);
  });
});

describe('source choice remains required while the context module is unavailable', () => {
  function resolve(history, overrides = {}) {
    return dispatcher.resolveGenerationSource({ type: 'glossary', textOverride: null,
      inputText: 'Residual pasted text.', history, contextModule: {}, activeUnitId: 'lesson', ...overrides });
  }

  it.each(['unspecified', 'supplemental'])('does not misclassify two %s sources as missing', role => {
    const history = readings(role);
    expect(resolve(history)).toMatchObject({ status: 'ambiguous', text: '' });
    expect(resolve(history, { selectedReadingSourceId: 'plants' })).toMatchObject({
      status: 'resolved', text: plantText, inputArtifactId: 'plants', instructionalText: { role },
    });
  });

  it('includes sources from separate lessons when all lessons are selected', () => {
    const history = readings();
    history[0].unitId = 'moon-lesson';
    history[0].instructionalText.role = 'primary';
    history[1].unitId = 'plants-lesson';
    expect(resolve(history, { activeUnitId: 'all' })).toMatchObject({ status: 'ambiguous', text: '' });
    expect(resolve(history, { activeUnitId: 'all', selectedReadingSourceId: 'plants' })).toMatchObject({
      status: 'resolved', text: plantText, inputArtifactId: 'plants', unitId: 'plants-lesson',
    });
  });

  it('does not offer an unverified supported original alongside a usable source', () => {
    const history = readings('supplemental');
    history[1] = { ...history[1], type: 'simplified', data: plantText,
      instructionalText: { role: 'supplemental', form: 'same-text-supported' } };
    expect(resolve(history)).toMatchObject({ status: 'resolved', inputArtifactId: 'moon' });
    expect(resolve(history, { selectedReadingSourceId: 'plants' })).toMatchObject({ status: 'missing', text: '' });
  });

  it('does not let an unauthorized adapted main in another lesson create ambiguity', () => {
    const history = readings('supplemental');
    history[1] = { ...history[1], unitId: 'other-lesson', type: 'simplified', data: plantText,
      instructionalText: { role: 'primary', form: 'adapted', replacementAuthorization: { authorized: false } } };
    expect(resolve(history, { activeUnitId: 'all' })).toMatchObject({ status: 'resolved', inputArtifactId: 'moon' });
  });
});
