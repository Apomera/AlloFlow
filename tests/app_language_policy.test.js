import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadHelpers(extras = {}) {
  const window = { AlloModules: {}, ...extras };
  const context = vm.createContext({ window, console: { log() {}, warn() {}, error() {} } });
  vm.runInContext(readFileSync('text_pipeline_helpers_module.js', 'utf8'), context);
  return { helpers: window.AlloModules.TextPipelineHelpers, window, context };
}
const { helpers: H } = loadHelpers();

describe('output language preference migration and resolution', () => {
  it('lets a fresh preference inherit the app language', () => {
    const fresh = H.normalizeOutputLanguagePreference();
    expect(fresh).toEqual({ mode: 'app' });
    expect(H.resolveOutputLanguagePreference(fresh, 'Français')).toBe('French');
    expect(H.resolveOutputLanguagePreference(fresh, 'Arabic')).toBe('Arabic');
  });

  it('preserves legacy English as an explicit choice across app-language changes', () => {
    const migrated = H.normalizeOutputLanguagePreference(undefined, 'English');
    expect(migrated).toEqual({ mode: 'language', language: 'English' });
    expect(H.resolveOutputLanguagePreference(migrated, 'French')).toBe('English');
    expect(H.resolveOutputLanguagePreference(migrated, 'Arabic')).toBe('English');
  });

  it('migrates a stored language and the existing all-selected value', () => {
    expect(H.normalizeOutputLanguagePreference(undefined, 'fr')).toEqual({ mode: 'language', language: 'French' });
    const all = H.normalizeOutputLanguagePreference(undefined, ' all selected languages ');
    expect(all).toEqual({ mode: 'all-selected' });
    expect(H.resolveOutputLanguagePreference(all, 'French')).toBe('All Selected Languages');
  });

  it('honors a saved preference ahead of its legacy resolved snapshot', () => {
    expect(H.normalizeOutputLanguagePreference({ mode: 'app' }, 'English')).toEqual({ mode: 'app' });
    expect(H.normalizeOutputLanguagePreference({ mode: 'language', language: 'Français' }, 'English'))
      .toEqual({ mode: 'language', language: 'French' });
    expect(H.normalizeOutputLanguagePreference({ mode: 'all-selected' }, 'English')).toEqual({ mode: 'all-selected' });
  });

  it('rejects malformed preferences without treating their values as language names', () => {
    for (const value of [false, 42, [], { mode: 'wrong' }, { mode: 'language', language: {} }]) {
      expect(H.normalizeOutputLanguagePreference(value)).toEqual({ mode: 'app' });
      expect(H.normalizeOutputLanguagePreference(value, 'Spanish')).toEqual({ mode: 'language', language: 'Spanish' });
    }
    expect(H.resolveOutputLanguagePreference({ mode: 'app' }, '')).toBe('English');
    expect(H.resolveOutputLanguagePreference({ mode: 'app' }, 'All Selected Languages')).toBe('English');
  });
});

describe('language aliases and language choices', () => {
  it('compares known codes and endonyms as the same language', () => {
    for (const alias of ['French', 'fr', 'Français', 'Francais', ' français ']) {
      expect(H.normalizeLanguageName(alias)).toBe('French');
      expect(H.isSameLanguage(alias, 'French')).toBe(true);
    }
    expect(H.isSameLanguage('ar', 'Arabic')).toBe(true);
    expect(H.isSameLanguage('iw', 'Hebrew')).toBe(true);
    expect(H.isSameLanguage('', '')).toBe(false);
    expect(H.normalizeLanguageName({ language: 'French' })).toBe('');
    expect(H.normalizeLanguageName('constructor')).toBe('constructor');
    expect(H.normalizeLanguageName('__proto__')).toBe('__proto__');
  });

  it('keeps explicit regional and script variants distinct', () => {
    expect(H.isSameLanguage('fr-CA', 'French (Canadian)')).toBe(true);
    expect(H.isSameLanguage('fr-FR', 'French (France)')).toBe(true);
    expect(H.isSameLanguage('French', 'French (Canadian)')).toBe(false);
    expect(H.isSameLanguage('fr-CA', 'fr-FR')).toBe(false);
    expect(H.isSameLanguage('en-US', 'en-GB')).toBe(false);
    expect(H.isSameLanguage('pt-BR', 'Portuguese (Portugal)')).toBe(false);
    expect(H.isSameLanguage('zh-Hans', 'Chinese (Traditional)')).toBe(false);
    expect(H.normalizeLanguageName('FR_be')).toBe('fr-BE');
  });

  it('consults registered aliases exactly and never invokes fuzzy matching', () => {
    let fuzzyCalls = 0;
    const { helpers } = loadHelpers({ AlloLangMatcher: {
      _ALIASES: { kreyol: 'Haitian Creole' },
      match() { fuzzyCalls++; throw new Error('Fuzzy matching must not run'); }
    } });
    expect(helpers.normalizeLanguageName('Kreyol')).toBe('Haitian Creole');
    expect(helpers.normalizeLanguageName('Kreyoll')).toBe('Kreyoll');
    expect(fuzzyCalls).toBe(0);
  });

  it('puts the app language first and retains English and an active explicit choice', () => {
    expect(H.languageOptions('fr', ['French', 'Français', 'English', 'ar', 'All Selected Languages', null], 'Twi'))
      .toEqual(['French', 'English', 'Arabic', 'Twi']);
    expect(H.languageOptions('Arabic', [], { mode: 'language', language: 'fr-CA' }))
      .toEqual(['Arabic', 'English', 'French (Canadian)']);
  });

  it('generates the app language and selected additions without inserting English', () => {
    expect(H.allGenerationLanguages('Français', ['fr', 'Arabic', 'ar', 'All Selected Languages']))
      .toEqual(['French', 'Arabic']);
    expect(H.allGenerationLanguages('French', [])).toEqual(['French']);
    expect(H.allGenerationLanguages('French', ['English'])).toEqual(['French', 'English']);
    expect(H.allGenerationLanguages('fr', ['fr-CA'])).toEqual(['French', 'French (Canadian)']);
  });

  it('does not request a redundant secondary translation for known aliases', () => {
    expect(H.resolveTranslationPolicy('auto', 'fr', 'Français').enabled).toBe(false);
    expect(H.resolveTranslationPolicy('French', 'fr', 'English').enabled).toBe(false);
    expect(H.resolveTranslationPolicy('auto', 'French (Canadian)', 'French').enabled).toBe(true);
  });

  it('separates homograph audio by canonical language while retaining the raw content text', () => {
    expect(H.getGlossaryAudioCacheKey('pain', 'fr')).toBe('French\u241fpain');
    expect(H.getGlossaryAudioCacheKey('pain', 'Français')).toBe(H.getGlossaryAudioCacheKey('pain', 'French'));
    expect(H.getGlossaryAudioCacheKey('pain', 'English')).not.toBe(H.getGlossaryAudioCacheKey('pain', 'French'));
    expect(H.getGlossaryAudioCacheKey('Pain: du pain', 'French (Canadian)')).toBe('French (Canadian)\u241fPain: du pain');
  });
});

describe('saved resource languages are independent of generation defaults', () => {
  it('prefers saved primary language metadata and leaves the artifact unchanged', () => {
    const artifact = { config: { language: 'fr' }, language: 'Spanish', instructionalText: { complexity: { language: 'German' } } };
    const before = JSON.stringify(artifact);
    expect(H.getArtifactPrimaryLanguage(artifact, 'Arabic')).toBe('French');
    expect(JSON.stringify(artifact)).toBe(before);
    expect(H.getArtifactPrimaryLanguage({ language: 'Hebrew' }, 'French')).toBe('Hebrew');
    expect(H.getArtifactPrimaryLanguage({ instructionalText: { complexity: { language: 'Spanish' } } }, 'French')).toBe('Spanish');
    expect(H.getArtifactPrimaryLanguage({}, 'French')).toBe('French');
    expect(H.getArtifactPrimaryLanguage({})).toBe('English');
  });

  it('keeps analysis original language ahead of its report configuration', () => {
    expect(H.getArtifactPrimaryLanguage({ type: 'analysis', config: { language: 'English' }, data: { sourceLanguage: 'Arabic' } })).toBe('Arabic');
    expect(H.getArtifactPrimaryLanguage({ type: 'analysis', config: { language: 'English' }, sourceSnapshot: { language: 'Hebrew' } })).toBe('Hebrew');
  });

  it('uses explicit glossary base metadata and never mistakes an old translation destination for its base', () => {
    const legacy = { type: 'glossary', config: { language: 'Spanish' }, language: 'Spanish', data: [{ term: 'Leaf', def: 'Part of a plant' }] };
    expect(H.getGlossaryBaseLanguage(legacy)).toBe('English');
    expect(H.getArtifactPrimaryLanguage(legacy, 'French')).toBe('English');
    expect(H.getGlossaryBaseLanguage({ ...legacy, baseLanguage: 'French' })).toBe('French');
    expect(H.getGlossaryBaseLanguage({ ...legacy, config: { ...legacy.config, glossaryBaseLanguage: 'Arabic' } })).toBe('Arabic');
    expect(H.getGlossaryBaseLanguage(legacy, { termLanguage: 'ar', definitionLanguage: 'French' })).toBe('Arabic');
    expect(H.getGlossaryBaseLanguage(legacy, { definitionLanguage: 'Hebrew' })).toBe('Hebrew');
    expect(H.getGlossaryBaseLanguage({ type: 'glossary', language: 'French (Canadian)', data: legacy.data })).toBe('French (Canadian)');
    expect(H.getGlossaryBaseLanguage({ type: 'glossary', language: 'German', translationOf: 'original', data: legacy.data })).toBe('English');
    expect(H.getGlossaryBaseLanguage({ type: 'glossary', language: 'German', config: { language: 'German' }, translationOf: 'original', data: legacy.data })).toBe('English');
    expect(H.getGlossaryBaseLanguage({ type: 'glossary', language: 'German', config: { language: 'German', baseLanguage: 'French' }, translationOf: 'original', data: legacy.data })).toBe('French');
  });

  it('infers row-only native glossaries only from unanimous explicit term or base languages', () => {
    const glossary = rows => ({ type: 'glossary', config: { language: 'Spanish' }, data: rows });
    expect(H.getArtifactPrimaryLanguage(glossary([{ termLanguage: 'fr', definitionLanguage: 'Arabic' }, { baseLanguage: 'French' }]))).toBe('French');
    expect(H.getArtifactPrimaryLanguage(glossary([{ termLanguage: 'French' }, { termLanguage: 'Arabic' }]))).toBe('English');
    expect(H.getArtifactPrimaryLanguage(glossary([{ termLanguage: 'French' }, {}]))).toBe('English');
    expect(H.getArtifactPrimaryLanguage(glossary([{ definitionLanguage: 'French' }]))).toBe('English');
    expect(H.getArtifactPrimaryLanguage(glossary([{ termLanguage: 'All Selected Languages' }]))).toBe('English');
  });
});

describe('resource read-aloud uses saved content language', () => {
  function loadAudio(withHelpers = true) {
    const state = withHelpers ? loadHelpers() : { window: { AlloModules: {} } };
    const context = state.context || vm.createContext({ window: state.window, console });
    vm.runInContext(readFileSync('resource_read_aloud_module.js', 'utf8'), context);
    const api = state.window.AlloModules.ResourceReadAloud;
    api.register('language-policy-test', (_resource, add) => add('body', 'A saved lesson sentence.'));
    return api;
  }

  it('uses config.language ahead of a changed app or output fallback', () => {
    const api = loadAudio();
    const artifact = { type: 'language-policy-test', config: { language: 'Spanish' }, language: 'English', data: { language: 'French' } };
    expect(api.enumerate(artifact, { defaultLanguage: 'Arabic' })[0].language).toBe('Spanish');
    expect(api.enumerate(artifact, { defaultLanguage: 'German' })[0].language).toBe('Spanish');
  });

  it('also protects saved config language before text helpers have loaded', () => {
    const api = loadAudio(false);
    expect(api.enumerate({ type: 'language-policy-test', config: { language: 'French' } }, { defaultLanguage: 'Arabic' })[0].language).toBe('French');
  });
});
