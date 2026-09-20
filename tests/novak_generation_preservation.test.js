import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
import { readFileSync } from 'node:fs';

const dispatcherSource = readFileSync('generate_dispatcher_source.jsx', 'utf8');
let dispatcher, contract, helpers, audit;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  loadAlloModule('generation_helpers_module.js');
  loadAlloModule('content_engine_module.js');
  dispatcher = window.AlloModules.GenDispatcher;
  contract = window.AlloModules.InstructionalContext;
  helpers = window.AlloModules.GenerationHelpers;
  audit = new Function(dispatcherSource.slice(0, dispatcherSource.indexOf('const handleGenerate =')) + '\nreturn { collectAuditText, _auditTextAccessEvidence, computeDifferentiationCoverage, selectCurriculumArtifacts, _auditFingerprint };')();
});

describe('generation source selection', () => {
  const older = { id: 'play', type: 'analysis', data: { originalText: 'FIRST WITCH:\r\nWhen shall we three meet again?\r\n' } };
  const latest = { id: 'science', type: 'analysis', data: { originalText: 'Cells divide.' } };
  const resolve = options => dispatcher.resolveGenerationSource({ type: 'simplified', textOverride: null, inputText: 'Current paste', history: [older, latest], contextModule: contract, ...options });
  it('pairs an explicit analysis body and ID even with another core text available', () => {
    expect(resolve({ selectedReadingSourceId: latest.id })).toMatchObject({ text: latest.data.originalText, sourceArtifactId: latest.id, sourceSnapshot: { text: latest.data.originalText, sourceArtifactId: latest.id } });
  });
  it('keeps explicit overrides separate from ambient source IDs', () => {
    const source = resolve({ textOverride: older.data.originalText });
    expect(source.sourceArtifactId).toBeNull();
    expect(source.sourceSnapshot.text).toBe(older.data.originalText);
    expect(source.sourceSnapshot.provenance.selection).toBe('explicit-generation-source');
  });
  it('captures analysis input before translation or cleaning', () => {
    const text = '  FIRST WITCH:\r\nFair is foul.\r\n\r\n### References\r\n[Book](https://example.com)  ';
    const source = resolve({ type: 'analysis', inputText: text, selectedReadingSourceId: latest.id });
    expect(source.text).toBe(text);
    expect(source.sourceSnapshot.text).toBe(text);
    expect(source.sourceArtifactId).toBeNull();
  });
  it('captures selected revised or translated analysis as selected saved text', () => {
    const snapshot = contract.createSourceSnapshot('Earlier English text', { sourceArtifactId: 'translated' });
    const source = resolve({ history: [{ id: 'translated', type: 'analysis', sourceSnapshot: snapshot, data: { originalText: 'Texto traducido.' } }] });
    expect(source.sourceSnapshot.text).toBe('Texto traducido.');
    expect(source.sourceSnapshot.provenance.selection).toMatch(/^saved-analysis/);
  });
  it('carries canonical source through transformed working-text fan-out', () => {
    const snapshot = contract.createSourceSnapshot('Texto\n--- ENGLISH TRANSLATION ---\nText', { sourceArtifactId: 'bilingual' });
    const source = resolve({ textOverride: 'Text', config: { sourceSnapshot: snapshot } });
    expect(source.text).toBe('Text');
    expect(source.sourceSnapshot).toEqual(snapshot);
    expect(source.sourceArtifactId).toBe('bilingual');
  });
  it('uses a carried canonical snapshot when a retry has no explicit working text', () => {
    const snapshot = contract.createSourceSnapshot(older.data.originalText, { sourceArtifactId: 'play' });
    const source = resolve({ config: { sourceSnapshot: snapshot } });
    expect(source.text).toBe(snapshot.text);
    expect(source.sourceArtifactId).toBe('play');
  });
  it('keeps source ID coherent when selecting a newly analyzed snapshot', () => {
    const snapshot = contract.createSourceSnapshot(latest.data.originalText);
    const source = resolve({ history: [{ ...latest, sourceSnapshot: snapshot }] });
    expect(source.sourceArtifactId).toBe('science');
    expect(source.sourceSnapshot.sourceArtifactId).toBe('science');
  });
  it('requires a choice between distinct scoped core texts despite residual paste', () => {
    expect(resolve()).toMatchObject({ status: 'ambiguous', text: '' });
  });
  it('automatically uses an authorized adapted main body and keeps origin provenance separate', () => {
    const snapshot = contract.createSourceSnapshot(older.data.originalText, { sourceArtifactId: older.id });
    const original = { ...older, unitId: 'plays', instructionalText: { role: 'supplemental', form: 'original' } };
    const adapted = { id: 'adapted-main', type: 'simplified', unitId: 'plays', data: 'FIRST WITCH: When will we meet?', sourceSnapshot: snapshot,
      sourceFamilyId: older.id, sourceInstructionalText: original.instructionalText,
      instructionalText: { role: 'primary', form: 'adapted', sourceArtifactId: older.id, replacementAuthorization: { authorized: true, source: 'educator' } } };
    const result = resolve({ type: 'quiz', history: [original, adapted, { ...latest, unitId: 'science' }], activeUnitId: 'plays' });
    expect(result).toMatchObject({ status: 'resolved', text: adapted.data, inputArtifactId: adapted.id, sourceArtifactId: older.id,
      sourceSnapshot: snapshot, sourceInstructionalText: { role: 'supplemental' } });
  });
  it('allows an explicit supplemental input without reassigning its role', () => {
    const companion = { id: 'support', type: 'simplified', data: 'An extra example.', instructionalText: { role: 'supplemental', form: 'adapted' } };
    const result = resolve({ type: 'glossary', history: [older, companion], selectedReadingSourceId: companion.id });
    expect(result).toMatchObject({ text: companion.data, inputArtifactId: companion.id, sourceSnapshot: null, instructionalText: { role: 'supplemental' } });
  });
  it('uses explicit current input and reports a missing selected reading without falling back', () => {
    expect(resolve({ selectedReadingSourceId: '__input__' })).toMatchObject({ status: 'resolved', text: 'Current paste', inputArtifactId: null });
    expect(resolve({ selectedReadingSourceId: 'deleted' })).toMatchObject({ status: 'missing', text: '' });
  });
  it('keeps copied adapted activity retry input distinct from its captured original', () => {
    const snapshot = contract.createSourceSnapshot(older.data.originalText, { sourceArtifactId: older.id });
    const config = JSON.parse(JSON.stringify({ sourceSnapshot: snapshot, inputArtifactId: 'adapted-copy', generationInputText: 'The actual adapted passage.',
      inputInstructionalText: { role: 'primary', form: 'adapted', replacementAuthorization: { authorized: true, source: 'educator' } },
      sourceInstructionalText: { role: 'supplemental', form: 'original' }, sourceFamilyId: older.id, unitId: 'plays' }));
    const result = resolve({ type: 'quiz', config });
    expect(result).toMatchObject({ text: config.generationInputText, inputArtifactId: 'adapted-copy', sourceSnapshot: snapshot,
      sourceInstructionalText: { role: 'supplemental' }, unitId: 'plays' });
  });
  it('does not fabricate original provenance for a carried adapted-only input', () => {
    expect(resolve({ textOverride: 'Adapted without a saved origin.', config: { inputArtifactId: 'imported', sourceSnapshot: null,
      inputInstructionalText: { role: 'supplemental', form: 'adapted' } } })).toMatchObject({ sourceSnapshot: null, inputArtifactId: 'imported' });
  });
  it('preserves exact source strings which look like JSON', () => {
    for (const text of ['42', 'null', '{"text":"keep this"}']) expect(resolve({ textOverride: text }).sourceSnapshot.text).toBe(text);
  });
});

describe('source form adaptation policy', () => {
  it('keeps requested literary structure while allowing honest language adaptation', () => {
    const directive = dispatcher.buildAdaptationFormatPolicy('Keep Source Format and Tone');
    for (const phrase of ['speaker', 'point of view', 'stage directions', 'claim/evidence', 'meter', 'rhyme', 'Desired length is separate']) expect(directive).toContain(phrase);
    expect(dispatcher.buildAdaptationFormatPolicy('Standard Text')).toBe('');
    expect(dispatcher.buildAdaptationFormatPolicy('Podcast Script')).toBe('');
  });
  it('never grants a preserved-original label to generic rewriting', () => {
    const src = dispatcherSource;
    const start = src.indexOf('      const _authorizedReplacement =');
    const end = src.indexOf('      const tempItem =', start);
    const enforce = new Function('_baseInstructionalText', '_primarySourceArtifactId', '_chosenPrimaryArtifactId', src.slice(start, end) + '\nreturn _baseInstructionalText;');
    const profile = { role: 'primary', form: 'same-text-supported', sourceArtifactId: 'wrong', replacementAuthorization: { authorized: true, source: 'inferred' } };
    expect(enforce(profile, 'right')).toMatchObject({ role: 'supplemental', form: 'adapted', sourceArtifactId: 'right', replacementAuthorization: { authorized: false } });
    expect(enforce({ ...profile, replacementAuthorization: { authorized: true, source: 'educator' } }, 'right')).toMatchObject({ role: 'primary', form: 'adapted' });
  });
});

describe('anchored reading support generation', () => {
  function response(snapshot, annotations) { return JSON.stringify({ sourceFingerprint: snapshot.fingerprint, annotations }); }
  it('binds repeated words and phrases to exact app-created occurrences without editing source', async () => {
    const snapshot = contract.createSourceSnapshot('😀 Hurly burly. Fair is foul, and foul is fair.\r\n');
    const unchanged = JSON.stringify(snapshot);
    const first = snapshot.text.indexOf('foul'), last = snapshot.text.lastIndexOf('foul');
    const callGemini = vi.fn(async () => response(snapshot, [
      { id: 'word-' + first, text: 'morally bad in this use' },
      { id: 'word-' + last, text: 'what seems bad in this repeated use' },
      { id: 'word-3', endId: 'word-9', text: 'noisy confusion' }
    ]));
    const result = await dispatcher.generateReadingSupports(snapshot, { callGemini, language: 'English' });
    expect(result.status).toBe('complete');
    expect(result.annotations).toHaveLength(3);
    expect(result.annotations.find(x => x.start === last).quote).toBe('foul');
    expect(result.annotations.find(x => x.start === 3).quote).toBe('Hurly burly');
    expect(JSON.stringify(snapshot)).toBe(unchanged);
    expect(callGemini.mock.calls[0][0]).toContain('archaic usage');
  });
  it('rejects fabricated IDs and overlapping output independently', async () => {
    const snapshot = contract.createSourceSnapshot('Fair is foul.');
    const result = await dispatcher.generateReadingSupports(snapshot, { callGemini: async () => response(snapshot, [
      { id: 'word-999', text: 'fabricated' }, { id: 'word-0', endId: 'word-5', text: 'seems good' }, { id: 'word-5', text: 'overlap' }
    ]) });
    expect(result.status).toBe('partial');
    expect(result.annotations).toHaveLength(1);
    expect(result.rejectedCount).toBe(2);
  });
  it('rejects stale model fingerprints and keeps the source readable', async () => {
    const snapshot = contract.createSourceSnapshot('Hurly burly.');
    const result = await dispatcher.generateReadingSupports(snapshot, { callGemini: async () => '{"sourceFingerprint":"other","annotations":[]}' });
    expect(result.status).toBe('unavailable');
    expect(result.annotations).toEqual([]);
    expect(result.skippedRanges).toEqual([{ start: 0, end: 12, reason: 'invalid-response' }]);
  });
  it('reports incomplete long-source coverage and round-trips its ranges', async () => {
    const snapshot = contract.createSourceSnapshot('Hurly burly. '.repeat(100));
    const result = await dispatcher.generateReadingSupports(snapshot, { chunkChars: 500, maxChunks: 1, callGemini: async () => response(snapshot, [{ id: 'word-0', text: 'noisy confusion' }]) });
    expect(result.status).toBe('partial');
    expect(result.coveredRanges[0].start).toBe(0);
    expect(result.skippedRanges.at(-1).end).toBe(snapshot.text.length);
    expect(contract.validateReadingSupports(snapshot, result).status).toBe('partial');
  });
  it('accepts no-needed-glosses and retains exact Unicode source', async () => {
    const snapshot = contract.createSourceSnapshot('مرحبا بالعالم。星が光る。\r\n');
    const result = await dispatcher.generateReadingSupports(snapshot, { callGemini: async () => response(snapshot, []) });
    expect(result.status).toBe('complete');
    expect(result.annotations).toEqual([]);
    expect(result.coveredRanges).toEqual([{ start: 0, end: snapshot.text.length }]);
  });
  it('cancels without accepting an async result', async () => {
    const snapshot = contract.createSourceSnapshot('Hurly burly.');
    const controller = new AbortController();
    const promise = dispatcher.generateReadingSupports(snapshot, { signal: controller.signal, callGemini: async () => { controller.abort(); return response(snapshot, []); } });
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('protected original mutation handlers', () => {
  it('blocks complexity changes before any AI call', async () => {
    const item = contract.createSupportedReading('FIRST WITCH:\r\nFair is foul.');
    const callGemini = vi.fn(), generateBilingualText = vi.fn(), setHistory = vi.fn();
    await helpers.handleComplexityAdjustment({ generatedContent: item, complexityLevel: 4, gradeLevel: '5th Grade', addToast: vi.fn(), callGemini, generateBilingualText, setHistory });
    expect(callGemini).not.toHaveBeenCalled();
    expect(generateBilingualText).not.toHaveBeenCalled();
    expect(setHistory).not.toHaveBeenCalled();
  });
  it('blocks selection revision and direct Apply on original readings', async () => {
    const item = contract.createSupportedReading('Fair is foul.');
    const callGemini = vi.fn(), change = vi.fn();
    const state = { generatedContent: item, selectionMenu: { text: 'Fair' }, revisionData: { original: 'Fair', result: 'Good' }, handleSimplifiedTextChange: change };
    const engine = window.AlloModules.createContentEngine({ getState: () => state, callGemini, addToast: vi.fn(), t: k => k });
    await engine.handleReviseSelection('simplify');
    await engine.applyTextRevision();
    expect(callGemini).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });
  it('uses the selected pane context and language for a word definition', async () => {
    const callGemini = vi.fn(async () => 'contextual definition');
    const state = { generatedContent: { id: 'adapted', type: 'simplified', data: 'A science adaptation', config: { language: 'English' } }, interactionMode: 'define', gradeLevel: '5th Grade', setDefinitionData: vi.fn() };
    const engine = window.AlloModules.createContentEngine({ getState: () => state, callGemini, addToast: vi.fn(), t: k => k });
    await engine.handleWordClick('Fair', { stopPropagation() {}, currentTarget: { getBoundingClientRect: () => ({ left: 0, bottom: 0 }) } }, { text: 'Fair is foul: the original dramatic scene.', language: 'French' });
    expect(callGemini.mock.calls[0][0]).toContain('the original dramatic scene');
    expect(callGemini.mock.calls[0][0]).toContain('Output Language: French');
    expect(callGemini.mock.calls[0][0]).not.toContain('A science adaptation');
  });
});

describe('complexity adjustment source and async isolation', () => {
  function harness() {
    const sourceSnapshot = contract.createSourceSnapshot('FIRST WITCH:\nFair is foul.');
    const item = { id: 'adapted', type: 'simplified', data: 'FIRST WITCH:\nGood can seem bad.', sourceSnapshot,
      config: { textFormat: 'Keep Source Format and Tone', language: 'English', grade: '5th Grade' },
      instructionalText: { form: 'adapted', role: 'supplemental' } };
    const state = { current: item, history: [item] };
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    const deps = { generatedContent: item, complexityLevel: 4, gradeLevel: '5th Grade', leveledTextLanguage: 'English',
      saveOriginalOnAdjust: false, generatedTerms: [], addToast: vi.fn(), t: k => k, warnLog: vi.fn(),
      setIsProcessing: vi.fn(), setComplexityLevel: vi.fn(), setError: vi.fn(),
      setWordSoundsCustomTerms: vi.fn(), setWsPreloadedWords: vi.fn(),
      generateBilingualText: vi.fn(() => pending), callGemini: vi.fn(),
      extractSourceTextForProcessing: text => ({ text, isBilingual: false }),
      setGeneratedContent: value => { state.current = typeof value === 'function' ? value(state.current) : value; },
      setHistory: value => { state.history = typeof value === 'function' ? value(state.history) : value; } };
    return { deps, state, sourceSnapshot, finish };
  }
  it('retains exact snapshot and selected format on a completed adjustment', async () => {
    const h = harness();
    const pending = helpers.handleComplexityAdjustment(h.deps);
    h.finish('FIRST WITCH:\nGood seems bad.');
    await pending;
    expect(h.state.current.data).toBe('FIRST WITCH:\nGood seems bad.');
    expect(h.state.current.sourceSnapshot).toEqual(h.sourceSnapshot);
    expect(h.state.current.config.textFormat).toBe('Keep Source Format and Tone');
    expect(h.deps.generateBilingualText.mock.calls[0][0]).toContain('KEEP SOURCE FORMAT AND TONE');
  });
  it('does not apply a late result over a new body or a newly protected original', async () => {
    const h = harness();
    const pending = helpers.handleComplexityAdjustment(h.deps);
    const protectedOriginal = { ...contract.createSupportedReading(h.sourceSnapshot), id: 'adapted' };
    h.state.current = protectedOriginal;
    h.state.history = [protectedOriginal];
    h.finish('FIRST WITCH:\nWrong stale result.');
    await pending;
    expect(h.state.current).toEqual(protectedOriginal);
    expect(h.state.history).toEqual([protectedOriginal]);
  });
});


describe('reading-role audit consistency', () => {
  it('does not grant preserved-original access to a modified body', () => {
    const snapshot = contract.createSourceSnapshot('Exact source.');
    const invalid = { ...contract.createSupportedReading(snapshot), data: 'Rewritten source.' };
    const result = audit._auditTextAccessEvidence([invalid]);
    expect(result.hasPrimary).toBe(false);
    expect(result.supportedPrimaryArtifactIds).toEqual([]);
    expect(audit.computeDifferentiationCoverage([invalid], {}, 'English').flags?.sameTextSupport || false).toBe(false);
  });
  it('does not promote an explicitly supplemental analysis through legacy fallback', () => {
    const original = { id: 'supplemental-source', type: 'analysis', data: { originalText: 'A supporting source.' }, instructionalText: { role: 'supplemental', form: 'original' } };
    expect(audit._auditTextAccessEvidence([original])).toMatchObject({ hasPrimary: false, hasLegacySource: false });
    expect(audit.collectAuditText([original])).toMatchObject({ sourceText: original.data.originalText, sourceSelection: 'supplemental-selected-source' });
  });
  it('keeps multiple main readings and requires explicit vocabulary-source selection', () => {
    const mains = ['one', 'two'].map(id => ({ id, unitId: 'plays', type: 'analysis', data: { originalText: id + ' main text' }, instructionalText: { role: 'primary', form: 'original' } }));
    expect(audit.collectAuditText(mains, { unitId: 'plays' })).toMatchObject({ sourceSelection: 'ambiguous-reading-selection', sourceText: '' });
    expect(audit.collectAuditText(mains, { unitId: 'plays', inputArtifactId: 'one' })).toMatchObject({ sourceArtifactId: 'one', sourceText: 'one main text' });
    expect(audit._auditTextAccessEvidence(mains).primaryArtifactIds).toEqual(['one', 'two']);
    expect(audit.selectCurriculumArtifacts([...mains, { id: 'other', unitId: 'science', type: 'quiz', data: [] }], { unitId: 'plays' }).artifacts).toHaveLength(2);
  });
  it('makes captured originals available with their saved source role and fingerprints role changes', () => {
    const snapshot = contract.createSourceSnapshot('Retained original.');
    const companion = { id: 'companion', type: 'simplified', data: 'Adapted wording.', sourceSnapshot: snapshot,
      instructionalText: { role: 'supplemental', form: 'adapted' }, sourceInstructionalText: { role: 'primary', form: 'original' } };
    expect(audit._auditTextAccessEvidence([companion]).hasPrimary).toBe(true);
    const changed = { ...companion, sourceInstructionalText: { role: 'supplemental', form: 'original' } };
    expect(audit._auditTextAccessEvidence([changed]).hasPrimary).toBe(false);
    expect(audit._auditFingerprint([changed])).not.toBe(audit._auditFingerprint([companion]));
  });
});


describe('new analysis source role metadata', () => {
  function createAnalysis(config = {}, selected = {}) {
    const start = dispatcherSource.indexOf('      const newItem = {', dispatcherSource.indexOf('      const storedContent ='));
    const end = dispatcherSource.indexOf("      if (type === 'lesson-plan' && planningGenerationInputs)", start);
    const fn = new Function('state', 'const { newItemId, type, storedContent, metaInfo, itemTitle, _buildItemConfig, _sourceUse, _sourceSnapshot, _instructionalContextModule, configOverride, effectiveLanguage, effectiveGrade, _primarySourceArtifactId, _chosenPrimaryArtifactId, _selectedSource } = state;\n' + dispatcherSource.slice(start, end) + '\nreturn newItem;');
    const snapshot = contract.createSourceSnapshot('Exact original.');
    return fn({ newItemId: 'new-analysis', type: 'analysis', storedContent: { originalText: selected.text || snapshot.text }, metaInfo: '', itemTitle: 'Analysis',
      _buildItemConfig: () => ({}), _sourceUse: { unitId: 'plays' }, _sourceSnapshot: snapshot, _instructionalContextModule: contract,
      configOverride: config, effectiveLanguage: 'English', effectiveGrade: '5th Grade', _primarySourceArtifactId: null,
      _chosenPrimaryArtifactId: null, _selectedSource: { text: snapshot.text, ...selected } });
  }
  it('explicitly stamps a new original as primary and captures a coherent saved origin ID', () => {
    const result = createAnalysis();
    expect(result.instructionalText).toMatchObject({ role: 'primary', form: 'original', designationSource: 'workflow-default' });
    expect(result.sourceSnapshot).toMatchObject({ text: 'Exact original.', sourceArtifactId: result.id });
    expect(result.sourceInstructionalText).toMatchObject({ role: 'primary', form: 'original' });
  });
  it('preserves an educator override and a selected adapted main without claiming original form', () => {
    expect(createAnalysis({ instructionalText: { role: 'supplemental', form: 'original', designationSource: 'educator' } }).instructionalText).toMatchObject({ role: 'supplemental', designationSource: 'educator' });
    const result = createAnalysis({}, { text: 'Adapted selected text.', instructionalText: { role: 'primary', form: 'adapted', replacementAuthorization: { authorized: true, source: 'educator' } } });
    expect(result.instructionalText).toMatchObject({ role: 'primary', form: 'adapted', replacementAuthorization: { authorized: true, source: 'educator' } });
    expect(result.sourceSnapshot.text).toBe('Exact original.');
  });
});
