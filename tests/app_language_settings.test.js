import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const t = key => key.split('.').reduce((value, part) => value?.[part], strings) || key;
let React, createRoot, act, api, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = {};
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('view_sidebar_panels_module.js');
  loadAlloModule('content_engine_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  api = window.AlloModules.TextPipelineHelpers;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = null; host = null;
  window.AlloModules.TextPipelineHelpers = api;
  vi.restoreAllMocks();
});

const noop = () => {};
const propsFor = extra => ({
  t, InfoTooltip: () => null, isUniversalSettingsOpen: true, setIsUniversalSettingsOpen: noop,
  gradeLevel: '5th Grade', dokLevel: '', targetStandards: [], studentInterests: [], suggestedStandards: [],
  standardMode: 'manual', standardInputValue: '', aiStandardQuery: '', interestInput: '', universalImageStyle: '',
  differentiationRange: 'None', differentiationTypes: [], differentiationCustomGrades: [], useEmojis: false,
  languageInput: '', selectedLanguages: [], currentUiLanguage: 'French', leveledTextLanguage: 'French',
  outputLanguagePreference: { mode: 'app' }, setOutputLanguagePreference: vi.fn(), setLeveledTextLanguage: vi.fn(),
  translationMode: 'auto', setTranslationMode: vi.fn(), resolveTranslationPolicy: api.resolveTranslationPolicy,
  isTranslationControlRelevant: api.isTranslationControlRelevant, translationTargetChoices: api.translationTargetChoices,
  addLanguage: vi.fn(), removeLanguage: vi.fn(), setLanguageInput: noop, handleKeyDown: noop,
  ...extra
});
function mount(props, component = window.AlloModules.UniversalSettingsPanel) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(React.createElement(component, props)));
  return next => act(() => root.render(React.createElement(component, next)));
}
const selectOutput = value => {
  const select = host.querySelector('#universal-output-language');
  act(() => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); });
};

describe('app language in Universal Settings', () => {
  it('shows the automatic app choice and pill without adding stored languages', () => {
    const extras = Object.freeze([]), props = propsFor({ selectedLanguages: extras });
    mount(props);
    const select = host.querySelector('#universal-output-language');
    expect(select.value).toBe('__app__');
    expect(select.selectedOptions[0].textContent).toBe('Use app language (French)');
    expect([...select.options].filter(option => option.value === 'French')).toHaveLength(1);
    expect([...select.options].some(option => option.value === 'English')).toBe(true);
    expect(host.querySelector('[data-app-language-pill]').textContent).toBe('French · App language');
    expect(host.querySelector('[data-app-language-pill] button')).toBeNull();
    expect(host.textContent).toContain('0/4 added languages');
    expect(extras).toEqual([]);
  });

  it('keeps a restored fixed language selectable at the four-language limit', () => {
    const props = propsFor({ selectedLanguages: Object.freeze(['German', 'Spanish', 'Arabic', 'Japanese']),
      languageInput: 'Italian', leveledTextLanguage: 'Italian', outputLanguagePreference: { mode: 'language', language: 'Italian' } });
    mount(props);
    expect(host.querySelector('#universal-output-language').value).toBe('Italian');
    expect(host.querySelector('[data-app-language-pill]').textContent).toContain('French');
    expect(host.textContent).toContain('4/4 added languages');
    expect(host.querySelector('[data-help-key="glossary_language_input"] button[aria-label="Add"]').disabled).toBe(true);
    selectOutput('__app__');
    expect(props.setOutputLanguagePreference).toHaveBeenCalledWith({ mode: 'app' });
    expect(props.setLeveledTextLanguage).not.toHaveBeenCalled();
  });

  it('changes the automatic pill without changing fixed output or stored extras', () => {
    const extras = Object.freeze(['French', 'German']);
    const props = propsFor({ selectedLanguages: extras, outputLanguagePreference: { mode: 'language', language: 'English' }, leveledTextLanguage: 'English' });
    const rerender = mount(props);
    expect(host.querySelector('#universal-output-language').value).toBe('English');
    rerender({ ...props, currentUiLanguage: 'Arabic' });
    expect(host.querySelector('[data-app-language-pill]').textContent).toContain('Arabic');
    expect(host.querySelector('#universal-output-language').value).toBe('English');
    expect(host.querySelector('button[aria-label="Remove French from added languages"]')).toBeTruthy();
    expect(extras).toEqual(['French', 'German']);
    expect(props.setOutputLanguagePreference).not.toHaveBeenCalled();
  });

  it('deduplicates aliases for display, preserving regional variants and explicit app membership', () => {
    const props = propsFor({ selectedLanguages: Object.freeze(['fr', 'French', 'fr-CA', 'German']) });
    mount(props);
    expect(host.textContent).toContain('3/4 added languages');
    const select = host.querySelector('#universal-output-language');
    expect([...select.options].filter(option => option.value === 'French')).toHaveLength(1);
    expect([...select.options].some(option => option.value === 'French (Canadian)')).toBe(true);
    const remove = host.querySelector('[data-app-language-pill] button');
    expect(remove.getAttribute('aria-label')).toBe('Remove French from added languages');
    expect(remove.title).toContain('remains available as the app language');
    act(() => remove.click());
    expect(props.removeLanguage).toHaveBeenCalledWith('French');
  });

  it('maps choices to preferences without leaking the UI sentinel into content language', () => {
    const props = propsFor({ selectedLanguages: ['German'] });
    mount(props);
    selectOutput('German');
    selectOutput('All Selected Languages');
    expect(props.setOutputLanguagePreference.mock.calls).toEqual([[{ mode: 'language', language: 'German' }], [{ mode: 'all-selected' }]]);
    expect(props.setLeveledTextLanguage).not.toHaveBeenCalled();
  });

  it('keeps all-selected valid with only the automatic app language', () => {
    mount(propsFor({ leveledTextLanguage: 'All Selected Languages', outputLanguagePreference: { mode: 'all-selected' } }));
    const select = host.querySelector('#universal-output-language');
    expect(select.value).toBe('All Selected Languages');
    expect(select.selectedOptions[0].textContent).toBe('App and added languages (1)');
  });

  it('keeps per-language translation choices visible for an all-language generation', () => {
    mount(propsFor({ leveledTextLanguage: 'All Selected Languages', outputLanguagePreference: { mode: 'all-selected' }, selectedLanguages: ['German'] }));
    const translations = host.querySelector('#universal-translations-select');
    expect(translations).toBeTruthy();
    expect([...translations.options].map(option => option.value)).toEqual(expect.arrayContaining(['auto', 'off', 'French', 'German']));
    expect(host.textContent).toContain('Applies to each output language.');
  });

  it('preserves a legacy explicit value before the optional language helpers load', () => {
    delete window.AlloModules.TextPipelineHelpers;
    const props = propsFor({ outputLanguagePreference: undefined, leveledTextLanguage: 'Italian', selectedLanguages: ['German', 'Spanish', 'Arabic', 'Japanese'] });
    mount(props);
    expect(host.querySelector('#universal-output-language').value).toBe('Italian');
    selectOutput('__app__');
    expect(props.setOutputLanguagePreference).toHaveBeenCalledWith({ mode: 'app' });
  });
});

function languageStore(extra = {}) {
  const state = { languageInput: '', selectedLanguages: [], leveledTextLanguage: 'French', outputLanguagePreference: { mode: 'app' },
    currentUiLanguage: 'French', ...extra };
  state.setSelectedLanguages = vi.fn(value => { state.selectedLanguages = typeof value === 'function' ? value(state.selectedLanguages) : value; });
  state.setLanguageInput = vi.fn(value => { state.languageInput = value; });
  state.setLeveledTextLanguage = vi.fn(value => { state.leveledTextLanguage = value; });
  if (extra.setOutputLanguagePreference !== null) state.setOutputLanguagePreference = vi.fn(value => { state.outputLanguagePreference = value; });
  const engine = window.AlloModules.createContentEngine({ getState: () => state, t, addToast: noop });
  return { state, engine };
}
describe('shared add/remove language actions', () => {
  it('deduplicates known aliases without collapsing a regional choice', () => {
    const { state, engine } = languageStore({ languageInput: 'fr', selectedLanguages: ['French', 'de'] });
    engine.addLanguage();
    expect(state.selectedLanguages).toEqual(['French', 'German']);
    state.languageInput = 'fr-CA'; engine.addLanguage();
    expect(state.selectedLanguages).toEqual(['French', 'German', 'French (Canadian)']);
  });
  it('limits only stored added languages and still allows canonical duplicate cleanup', () => {
    const { state, engine } = languageStore({ languageInput: 'Italian', selectedLanguages: ['French', 'German', 'Arabic', 'Japanese'] });
    engine.addLanguage();
    expect(state.selectedLanguages).toEqual(['French', 'German', 'Arabic', 'Japanese']);
    expect(state.languageInput).toBe('Italian');
    state.languageInput = 'fr'; engine.addLanguage();
    expect(state.selectedLanguages).toHaveLength(4);
    expect(state.languageInput).toBe('');
  });
  it('removes added membership while preserving a fixed output across later app changes', () => {
    const { state, engine } = languageStore({ selectedLanguages: ['French', 'fr', 'German'], leveledTextLanguage: 'French', outputLanguagePreference: { mode: 'language', language: 'French' } });
    engine.removeLanguage('fr');
    expect(state.selectedLanguages).toEqual(['German']);
    expect(state.outputLanguagePreference).toEqual({ mode: 'language', language: 'French' });
    expect(state.setLeveledTextLanguage).not.toHaveBeenCalled();
    expect(state.setOutputLanguagePreference).not.toHaveBeenCalled();
    state.currentUiLanguage = 'Arabic';
    expect(api.resolveOutputLanguagePreference(state.outputLanguagePreference, state.currentUiLanguage)).toBe('French');
    engine.removeLanguage('German');
    expect(state.setOutputLanguagePreference).not.toHaveBeenCalled();
  });
  it('keeps all-selected on the app language when the last added language is removed', () => {
    const { state, engine } = languageStore({ selectedLanguages: ['German'], leveledTextLanguage: 'All Selected Languages', outputLanguagePreference: { mode: 'all-selected' } });
    engine.removeLanguage('German');
    expect(state.selectedLanguages).toEqual([]);
    expect(state.outputLanguagePreference.mode).toBe('all-selected');
    expect(state.setOutputLanguagePreference).not.toHaveBeenCalled();
  });
  it('retains the English fallback for a legacy host without the preference setter', () => {
    const { state, engine } = languageStore({ selectedLanguages: ['German'], leveledTextLanguage: 'German', outputLanguagePreference: undefined, setOutputLanguagePreference: null });
    engine.removeLanguage('German');
    expect(state.setLeveledTextLanguage).toHaveBeenCalledWith('English');
  });
});

describe('glossary forecast language contract', () => {
  const glossaryProps = extra => ({ ...propsFor(), expandedTools: ['glossary'], hasSourceOrAnalysis: true,
    glossaryDefinitionLevel: 'Grade Level', glossaryTier2Count: 3, glossaryTier3Count: 3, glossaryCustomInstructions: '',
    nativeLanguageDefaultsVersion: 1, appLanguage: 'French', leveledTextLanguage: 'Spanish', ...extra });
  it('forecasts native definitions and the selected companion, including translation none', () => {
    const props = glossaryProps();
    const rerender = mount(props, window.AlloModules.GlossaryPanel);
    const summary = () => host.querySelector('[data-help-key="glossary_language_summary"]').textContent;
    expect(summary()).toContain('Next glossary: Spanish definitions');
    expect(summary()).toContain('Translation columns: French');
    rerender({ ...props, translationMode: 'off' });
    expect(summary()).toContain('Spanish definitions');
    expect(summary()).toContain('No translation columns.');
  });
  it('forecasts app-language definitions plus added columns for all-selected', () => {
    mount(glossaryProps({ leveledTextLanguage: 'All Selected Languages', selectedLanguages: ['German', 'Italian'] }), window.AlloModules.GlossaryPanel);
    const summary = host.querySelector('[data-help-key="glossary_language_summary"]').textContent;
    expect(summary).toContain('French definitions');
    expect(summary).toContain('German, Italian');
  });
  it('retains the English-base forecast for a legacy host', () => {
    mount(glossaryProps({ nativeLanguageDefaultsVersion: undefined, currentUiLanguage: 'English', appLanguage: 'English' }), window.AlloModules.GlossaryPanel);
    const summary = host.querySelector('[data-help-key="glossary_language_summary"]').textContent;
    expect(summary).toContain('English definitions');
    expect(summary).toContain('Translation columns: Spanish');
  });
});

describe('Adventure app-language preference', () => {
  const adventureProps = extra => ({ ...propsFor(), expandedTools: ['adventure'], isTeacherMode: true,
    globalPoints: 0, studentProjectSettings: { adventureUnlockXP: 0, adventurePermissions: {} },
    adventureState: { currentScene: null, stats: {}, episodeTurnLimit: 12, choiceCount: 4 },
    adventureInputMode: 'choice', adventureDifficulty: 'Normal', adventureArtStyle: 'auto',
    adventureLanguageMode: 'French', adventureLanguagePreference: null, setAdventureLanguageMode: vi.fn(),
    setAdventureState: noop, adventureCustomInstructions: '', ...extra });
  it('shows Use app language without added languages and follows a changed app locale', () => {
    const props = adventureProps();
    const rerender = mount(props, window.AlloModules.AdventurePanel);
    const select = () => host.querySelector('#sidebar-adventure-language');
    expect(select().value).toBe('__app__');
    expect(select().selectedOptions[0].textContent).toBe('Use app language (French)');
    rerender({ ...props, currentUiLanguage: 'German', adventureLanguageMode: 'German' });
    expect(select().value).toBe('__app__');
    expect(select().selectedOptions[0].textContent).toBe('Use app language (German)');
    expect(props.setAdventureLanguageMode).not.toHaveBeenCalled();
  });
  it('keeps saved explicit modes available and sends the app sentinel only to an aware host', () => {
    const props = adventureProps({ adventureLanguageMode: 'Italian', adventureLanguagePreference: 'Italian' });
    mount(props, window.AlloModules.AdventurePanel);
    const select = host.querySelector('#sidebar-adventure-language');
    expect(select.value).toBe('Italian');
    act(() => { select.value = '__app__'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(props.setAdventureLanguageMode).toHaveBeenCalledWith('__app__');
  });
  it('preserves legacy bilingual mode values and their explicit-language list', () => {
    mount(adventureProps({ selectedLanguages: ['Spanish', 'German'], adventureLanguageMode: 'All + English', adventureLanguagePreference: 'All + English' }), window.AlloModules.AdventurePanel);
    const select = host.querySelector('#sidebar-adventure-language');
    expect(select.value).toBe('All + English');
    const option = [...select.options].find(value => value.value === 'All + English');
    expect(option.textContent).toContain('Spanish, German');
    expect(option.textContent).not.toContain('French');
    expect([...select.options].some(value => value.value === 'Spanish + English')).toBe(true);
  });
});
