import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let translate, hostWindow;
beforeAll(() => {
  const context = vm.createContext({ window: { AlloModules: {} }, React: { useState() {}, useEffect() {}, useRef() {}, useCallback() {}, useMemo() {} },
    console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout });
  for (const file of ['text_pipeline_helpers_module.js', 'phase_k_helpers_module.js']) vm.runInContext(readFileSync(file, 'utf8'), context);
  translate = context.window.AlloModules.PhaseKHelpers.translateResourceItem;
  hostWindow = context.window;
});
const nativeGlossary = () => ({ id: 'native-fr', type: 'glossary', title: 'La plante', baseLanguage: 'French', glossaryLanguageSchemaVersion: 1,
  sourceFingerprint: 'canonical-source', config: { language: 'French', baseLanguage: 'French', glossaryLanguageSchemaVersion: 1,
    translationPolicy: { enabled: true, target: 'English', mode: 'auto' }, translationTarget: 'English' },
  data: [{ id: 'row-1', entryId: 'leaf', term: 'Feuille', def: 'Une partie de la plante.', termLanguage: 'French', definitionLanguage: 'French',
    baseLanguage: 'French', glossaryLanguageSchemaVersion: 1, sourceTerm: 'Leaf', sourceLanguage: 'English',
    image: 'data:image/png;base64,original-illustration', termAudio: 'old-term-audio', definitionAudio: 'old-definition-audio',
    phonemes: ['old-phoneme'], dictionaryEvidence: { locale: 'French' }, etymology: 'Old French word roots', roots: [{ root: 'old-root' }],
    translations: { English: 'Leaf: Part of a plant.', Italian: 'Foglia: Parte di una pianta.' }, translationSource: { English: 'old-en', Italian: 'old-it' } }] });
const deps = (reply, extra = {}) => ({ currentUiLanguage: 'French', translationMode: 'auto', selectedLanguages: ['German', 'Italian'],
  callGemini: vi.fn(async prompt => typeof reply === 'function' ? reply(prompt) : JSON.stringify(reply)), cleanJson: value => value, warnLog: vi.fn(), ...extra });
const germanRow = (extra = {}) => ({ term: 'Blatt', def: 'Ein Teil einer Pflanze.', termLanguage: 'German', definitionLanguage: 'German',
  baseLanguage: 'German', glossaryLanguageSchemaVersion: 1, sourceTerm: 'MODEL SOURCE CHANGE', sourceLanguage: 'MODEL LANGUAGE CHANGE', ...extra });

describe('native glossary header translation', () => {
  it('rebases a French glossary into German with its requested French companion', async () => {
    const original = nativeGlossary(), before = structuredClone(original);
    const d = deps([germanRow({ id: 'model-id', entryId: 'model-entry', translations: { French: 'Feuille : Une partie de la plante.', English: 'Unrequested English' } })]);
    const result = await translate(original, 'German', d);
    const prompt = d.callGemini.mock.calls[0][0];
    expect(prompt).toContain('Translate this French glossary into German');
    expect(prompt).toContain('Translate "term" and "def" into German');
    expect(prompt).not.toContain('Keep the "term" and "def" fields in English');
    expect(prompt).not.toContain('old-term-audio');
    expect(result).toMatchObject({ baseLanguage: 'German', glossaryLanguageSchemaVersion: 1, translationSourceLanguage: 'French', sourceFingerprint: 'canonical-source' });
    expect(result.config).toMatchObject({ baseLanguage: 'German', language: 'German', glossaryLanguageSchemaVersion: 1, translationTarget: 'French' });
    const row = result.data[0];
    expect(row).toMatchObject({ id: 'row-1', entryId: 'leaf', term: 'Blatt', def: 'Ein Teil einer Pflanze.',
      termLanguage: 'German', definitionLanguage: 'German', baseLanguage: 'German', glossaryLanguageSchemaVersion: 1,
      sourceTerm: 'Leaf', sourceLanguage: 'English', image: before.data[0].image });
    expect(row.translations).toEqual({ Italian: 'Foglia: Parte di una pianta.', French: 'Feuille : Une partie de la plante.' });
    expect(row.translationSource.Italian).toBe('old-it');
    expect(row.translationSource.French).toMatch(/^fp-/);
    for (const key of ['termAudio', 'definitionAudio', 'phonemes', 'dictionaryEvidence', 'etymology', 'roots']) expect(row).not.toHaveProperty(key);
    expect(original).toEqual(before);
  });

  it('creates a German base with no mandatory French or English column when companions are off', async () => {
    const d = deps([germanRow({ translations: { French: 'Unrequested French', English: 'Unrequested English', German: 'Duplicate base', Italian: 'MODEL ITALIAN CHANGE' } })], { translationMode: 'off' });
    const result = await translate(nativeGlossary(), 'German', d);
    expect(result.data[0].term).toBe('Blatt');
    expect(result.data[0].translations).toEqual({ Italian: 'Foglia: Parte di una pianta.' });
    expect(result.config.translationPolicy).toEqual({ enabled: false, target: '', mode: 'off' });
    expect(d.callGemini.mock.calls[0][0]).toContain('Do not add any translation columns');
  });

  it('supports an explicitly requested English companion without making English the base', async () => {
    const result = await translate(nativeGlossary(), 'German', deps([germanRow({ translations: { English: 'Leaf: Part of a plant.' } })],
      { translationPolicy: { enabled: true, target: 'English', mode: 'English' } }));
    expect(result.baseLanguage).toBe('German');
    expect(result.data[0].termLanguage).toBe('German');
    expect(result.data[0].translations.English).toBe('Leaf: Part of a plant.');
  });

  it('keeps an English native base versioned when translating it again', async () => {
    const original = nativeGlossary();
    original.baseLanguage = original.config.baseLanguage = 'English';
    original.config.language = 'English';
    Object.assign(original.data[0], { term: 'Leaf', def: 'Part of a plant.', termLanguage: 'English', definitionLanguage: 'English', baseLanguage: 'English' });
    const result = await translate(original, 'German', deps([germanRow()], { translationMode: 'off' }));
    expect(result.baseLanguage).toBe('German');
    expect(result.data[0].term).toBe('Blatt');
    expect(result.glossaryLanguageSchemaVersion).toBe(1);
  });

  it('recognizes explicit row-only native metadata without treating legacy config.language as a base', async () => {
    const native = nativeGlossary();
    delete native.baseLanguage; delete native.glossaryLanguageSchemaVersion;
    delete native.config.baseLanguage; delete native.config.glossaryLanguageSchemaVersion;
    delete native.data[0].glossaryLanguageSchemaVersion;
    expect((await translate(native, 'German', deps([germanRow()], { translationMode: 'off' }))).data[0].term).toBe('Blatt');
    const legacy = { id: 'legacy', type: 'glossary', config: { language: 'French' }, data: [{ term: 'Leaf', def: 'Part of a plant.' }] };
    const result = await translate(legacy, 'German', deps([{ term: 'Blatt', def: 'Pflanzenteil', translations: { German: 'Blatt: Pflanzenteil' } }], { translationMode: 'off' }));
    expect(result.data[0]).toMatchObject({ term: 'Leaf', def: 'Part of a plant.', translations: { German: 'Blatt: Pflanzenteil' } });
    expect(result).not.toHaveProperty('glossaryLanguageSchemaVersion');
    expect(result).not.toHaveProperty('baseLanguage');
  });

  it('rejects dropped rows, blank primary prose and a missing requested companion', async () => {
    await expect(translate(nativeGlossary(), 'German', deps([], { translationMode: 'off' }))).rejects.toThrow(/row count/);
    await expect(translate(nativeGlossary(), 'German', deps([germanRow({ term: '' })], { translationMode: 'off' }))).rejects.toThrow(/primary term/);
    await expect(translate(nativeGlossary(), 'German', deps([germanRow()]))).rejects.toThrow(/French/);
  });

  it('keeps explicit row-language metadata when the optional helper module is unavailable', async () => {
    const savedHelpers = hostWindow.AlloModules.TextPipelineHelpers;
    delete hostWindow.AlloModules.TextPipelineHelpers;
    try {
      const original = nativeGlossary();
      delete original.baseLanguage; delete original.config.baseLanguage;
      const d = deps([germanRow()], { translationMode: 'off' });
      const result = await translate(original, 'German', d);
      expect(d.callGemini.mock.calls[0][0]).toContain('Translate this French glossary into German');
      expect(result.translationSourceLanguage).toBe('French');
      expect(result.data[0].term).toBe('Blatt');
    } finally { hostWindow.AlloModules.TextPipelineHelpers = savedHelpers; }
  });
});
