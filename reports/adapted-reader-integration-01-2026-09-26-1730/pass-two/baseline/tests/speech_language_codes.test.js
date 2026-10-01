import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let language;

beforeAll(() => {
  window.React = window.React || {
    Component: class {},
    createElement: () => null,
  };
  window.AlloLanguageContext = window.AlloLanguageContext || {};
  loadAlloModule('module_scope_extras_module.js');
  language = window.AlloModules.ModuleScopeExtras;
});

describe('speech language code normalization', () => {
  it('maps friendly language names and preserves BCP-47 tags', () => {
    expect(language.getSpeechLangCode('Spanish')).toBe('es-ES');
    expect(language.getSpeechLangCode('Spanish (Latin America)')).toBe('es-419');
    expect(language.getSpeechLangCode('Spanish (Castilian)')).toBe('es-ES');
    expect(language.getSpeechLangCode('French (Canadian)')).toBe('fr-CA');
    expect(language.getSpeechLangCode('Portuguese (Angola)')).toBe('pt-AO');
    expect(language.getSpeechLangCode('Chinese (Traditional)')).toBe('zh-TW');
    expect(language.getSpeechLangCode('es')).toBe('es');
    expect(language.getSpeechLangCode('es-es')).toBe('es-ES');
    expect(language.getSpeechLangCode('zh-hans-cn')).toBe('zh-Hans-CN');
    expect(language.getSpeechLangCode('fil-PH')).toBe('fil-PH');
  });

  it('routes valid language tags to their base local-TTS language', () => {
    expect(language.languageToTTSCode('es')).toBe('es');
    expect(language.languageToTTSCode('es-ES')).toBe('es');
    expect(language.languageToTTSCode('Spanish')).toBe('es');
  });

  it('maps every deployed language-pack display name instead of falling back to English', () => {
    const selector = readFileSync(resolve(process.cwd(), 'ui_language_selector_source.jsx'), 'utf8');
    const deployedNames = [...selector.matchAll(/\{\s*value:\s*["']([^"']+)["']/g)].map((match) => match[1]);
    expect(deployedNames.length).toBeGreaterThan(50);
    for (const name of deployedNames.filter((value) => value !== 'English')) {
      expect(language.getSpeechLangCode(name), name).not.toBe('en-US');
    }
  });
});
