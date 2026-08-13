import { beforeAll, describe, expect, it } from 'vitest';
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
});
