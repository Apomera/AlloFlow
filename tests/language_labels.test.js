// Language names for display (2026-11-04). Saved data keeps English language names;
// languageLabels shows each language by its own name (what a newcomer student
// recognizes: "Español", "Tiếng Việt") and by its name in the app language
// ("vietnamita" in a Spanish app). Codes come from the app's one name->code table
// (ModuleScopeExtras.getSpeechLangCode), loaded here from its real source.
// ALLO_PIPELINE_CANDIDATE points at a mutated copy for mutation checks.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let helpers;
const previousModules = window.AlloModules;

function loadLanguageHelpers() {
  const extras = readFileSync('module_scope_extras_source.jsx', 'utf8');
  const start = extras.indexOf('const getSpeechLangCode = ');
  const end = extras.indexOf('const languageToTTSCode', start);
  const getSpeechLangCode = new Function(extras.slice(start, end) + '\nreturn getSpeechLangCode;')();
  window.AlloModules = { ModuleScopeExtras: { getSpeechLangCode } };
  new Function(readFileSync(process.env.ALLO_PIPELINE_CANDIDATE || 'text_pipeline_helpers_module.js', 'utf8'))();
  return window.AlloModules.TextPipelineHelpers;
}

beforeAll(() => { helpers = loadLanguageHelpers(); });
afterAll(() => { window.AlloModules = previousModules; });

describe('languageLabels', () => {
  it("gives a language's own name and its name in the app language", () => {
    expect(helpers.languageLabels('Spanish', 'English')).toMatchObject({ name: 'Spanish', tag: 'es', native: 'Español', inUi: 'Spanish' });
    expect(helpers.languageLabels('vietnamese', 'Spanish')).toMatchObject({ name: 'Vietnamese', tag: 'vi', native: 'Tiếng Việt', inUi: 'vietnamita' });
    expect(helpers.languageLabels('Arabic', 'French')).toMatchObject({ native: 'العربية', inUi: 'arabe' });
  });

  it('keeps regional and script variants, and uses the native script', () => {
    expect(helpers.languageLabels('Chinese (Simplified)', 'English')).toMatchObject({ tag: 'zh-Hans', native: '简体中文' });
    expect(helpers.languageLabels('Chinese (Traditional)', 'English')).toMatchObject({ tag: 'zh-Hant', native: '繁體中文' });
    expect(helpers.languageLabels('Spanish (Latin America)', 'English').tag).toBe('es-419');
    expect(helpers.languageLabels('Dari', 'English').native).toBe('دری');
    expect(helpers.languageLabels('Tigrinya', 'English').native).toBe('ትግርኛ');
  });

  it('uses own names the browser lacks, and never shows a guessed English name', () => {
    expect(helpers.languageLabels('Haitian Creole', 'English').native).toBe('Kreyòl ayisyen');
    expect(helpers.languageLabels('Chin (Hakha)', 'English').native).toBe('Laiholh');
    expect(helpers.languageLabels('Hmong', 'English').native).toBe('Hmoob');
    expect(helpers.languageLabels('Hausa', 'English').native).toBe('Hausa');
    // Unknown names stay as saved; the speech table's English default is not trusted.
    expect(helpers.languageLabels('Klingon', 'Spanish')).toMatchObject({ name: 'Klingon', tag: '', native: 'Klingon', inUi: 'Klingon' });
  });

  it("keeps the app's own English names in an English app", () => {
    expect(helpers.languageLabels('Kirundi', 'English').inUi).toBe('Kirundi');
    expect(helpers.languageLabels('Acholi', 'English').inUi).toBe('Acholi');
  });

  it('formats a list in the app language', () => {
    expect(helpers.formatLanguageList(['español', 'vietnamita'], 'Spanish')).toBe('español y vietnamita');
    expect(helpers.formatLanguageList(['Spanish', 'Vietnamese', 'Arabic'], 'English')).toBe('Spanish, Vietnamese, and Arabic');
    expect(helpers.formatLanguageList(['Spanish'], 'Klingon')).toBe('Spanish');
  });

  it('falls back to the saved names when the code table is not loaded', () => {
    const extras = window.AlloModules.ModuleScopeExtras;
    delete window.AlloModules.ModuleScopeExtras;
    try {
      expect(helpers.languageLabels('Vietnamese', 'Spanish')).toMatchObject({ native: 'Vietnamese', inUi: 'Vietnamese', tag: '' });
    } finally { window.AlloModules.ModuleScopeExtras = extras; }
  });
});
