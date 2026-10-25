import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const matrix = require('../generation_matrix_module.js');
let dispatcher, blueprints, phaseO, glossary;
beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  dispatcher = window.AlloModules.GenDispatcher;
  loadAlloModule('agent_core_contracts_module.js');
  loadAlloModule('agent_core_blueprint_service_module.js');
  loadAlloModule('agent_core_ui_adapter_module.js');
  loadAlloModule('phase_o_misc_handlers_module.js');
  loadAlloModule('glossary_helpers_module.js');
  loadAlloModule('generation_helpers_module.js');
  blueprints = window.AlloModules.AgentCoreBlueprintService.createBlueprintService({ generationMatrix: matrix });
  phaseO = window.AlloModules.PhaseOHandlers;
  glossary = window.AlloModules.GlossaryHelpers;
});
const native = { sourceText: 'Plants use light.', gradeLevel: '5th Grade', language: 'All Selected Languages',
  nativeLanguageDefaultsVersion: 1, appLanguage: 'French', currentUiLanguage: 'French', selectedLanguages: ['Spanish', 'French', 'spanish'], translationMode: 'auto' };
describe('native and reviewed legacy generation languages', () => {
  it('includes the app language and additional languages once without adding English', () => {
    expect(matrix.resolveGenerationMatrix({ type: 'quiz' }, native).variants.map(cell => cell.language)).toEqual(['French', 'Spanish']);
    expect(matrix.resolveGenerationMatrix({ type: 'glossary' }, native).variants.map(cell => cell.language)).toEqual(['French']);
  });
  it('deduplicates known app-language aliases before resolving glossary columns', () => {
    const settings = matrix.buildFrozenGenerationSettings({ ...native, appLanguage: 'fr', currentUiLanguage: 'French', selectedLanguages: ['Français', 'Spanish'] });
    expect(settings.appLanguage).toBe('French');
    expect(settings.effectiveLanguageList).toEqual(['French', 'Spanish']);
    expect(matrix.resolveGenerationMatrix({ type: 'quiz' }, settings).variants.map(cell => cell.language)).toEqual(['French', 'Spanish']);
  });
  it('resolves new group app preferences but preserves reviewed concrete group languages', () => {
    const resolve = window.AlloModules.GenerationHelpers.resolveFullPackProfileLanguage;
    const profile = { outputLanguagePreference: { mode: 'app' }, leveledTextLanguage: 'French', appLanguage: 'French', currentUiLanguage: 'French',
      nativeLanguageDefaultsVersion: 1, selectedLanguages: ['Spanish'], effectiveLanguageList: ['French', 'Spanish'] };
    const inherited = { ...native, appLanguage: 'Arabic', currentUiLanguage: 'Arabic', leveledTextLanguage: 'Arabic' };
    expect(resolve(profile, inherited, false)).toMatchObject({ leveledTextLanguage: 'Arabic', appLanguage: 'Arabic', effectiveLanguageList: ['Arabic', 'Spanish'] });
    expect(resolve(profile, inherited, true)).toMatchObject({ leveledTextLanguage: 'French', appLanguage: 'French', effectiveLanguageList: ['French', 'Spanish'] });
    expect(resolve({ leveledTextLanguage: 'English' }, inherited, false).leveledTextLanguage).toBe('English');
  });
  it('retains the historical concrete list for a reviewed legacy plan', () => {
    const saved = matrix.buildFrozenGenerationSettings({ ...native, nativeLanguageDefaultsVersion: 0 });
    expect(saved.effectiveLanguageList).toEqual(['English', 'Spanish', 'French']);
    expect(matrix.resolveGenerationMatrix({ type: 'quiz' }, { settings: saved }).variants.map(cell => cell.language)).toEqual(saved.effectiveLanguageList);
  });
  it('preserves a reviewed native output list rather than recomputing from later controls', () => {
    const saved = matrix.buildFrozenGenerationSettings(native);
    const reopened = matrix.buildFrozenGenerationSettings({ ...saved, currentUiLanguage: 'Arabic', selectedLanguages: ['German'] });
    expect(reopened.appLanguage).toBe('French');
    expect(reopened.effectiveLanguageList).toEqual(['French', 'Spanish']);
    expect(matrix.resolveGenerationMatrix({ type: 'quiz' }, reopened).variants.map(cell => cell.language)).toEqual(['French', 'Spanish']);
  });
  it('ignores presentation locale in an explicit-output identity when companions are off', () => {
    const settings = { ...native, language: 'Spanish', translationMode: 'off' };
    expect(matrix.buildGenerationIdentity({ type: 'quiz' }, settings)).toBe(matrix.buildGenerationIdentity({ type: 'quiz' }, {
      ...settings, appLanguage: 'German', currentUiLanguage: 'German', selectedLanguages: ['Italian'],
    }));
    expect(matrix.buildGenerationIdentity({ type: 'glossary' }, settings)).toBe(matrix.buildGenerationIdentity({ type: 'glossary' }, {
      ...settings, selectedLanguages: ['Arabic'],
    }));
  });
  it('changes identity when an Automatic companion actually changes', () => {
    const settings = { ...native, language: 'Spanish' };
    expect(matrix.buildGenerationIdentity({ type: 'quiz' }, settings)).not.toBe(matrix.buildGenerationIdentity({ type: 'quiz' }, {
      ...settings, appLanguage: 'Arabic', currentUiLanguage: 'Arabic',
    }));
  });
  it('keeps the matrix and dispatcher glossary language plans aligned', () => {
    const settings = matrix.buildFrozenGenerationSettings(native);
    const plan = dispatcher.resolveGlossaryLanguagePlan({ ...settings, outputLanguage: settings.language,
      translationPolicy: { enabled: false, target: '' } });
    expect(plan).toMatchObject({ baseLanguage: 'French', translationLanguages: ['Spanish'], glossaryLanguageSchemaVersion: 1 });
    const prompt = dispatcher.buildNativeGlossaryPrompt({ languagePlan: plan, includeEtymology: true, text: 'Original source.' });
    expect(prompt).toContain('history in French');
    expect(prompt).not.toContain('entered English');
  });
  it('freezes native Blueprint languages and forwards the original All Selected glossary request', async () => {
    const blueprint = await blueprints.createDraft({ ...native, blueprintId: 'native-plan', primaryLanguage: 'All Selected Languages',
      gradeLevel: '5th Grade', plan: [{ tool: 'glossary', uiId: 'glossary-native' }] });
    expect(blueprint.globalSettings).toMatchObject({ nativeLanguageDefaultsVersion: 1, appLanguage: 'French', effectiveLanguageList: ['French', 'Spanish'] });
    const calls = [];
    await phaseO.executeOneBlueprint({ globalSettings: blueprint.globalSettings, resourcePlan: [{ tool: 'glossary', type: 'glossary', uiId: 'native-glossary',
      generationVariants: matrix.resolveGenerationMatrix({ type: 'glossary' }, blueprint.globalSettings).variants }] }, {
      historyOverride: [], initialSourceText: native.sourceText, settingsSnapshot: blueprint.globalSettings,
      handleGenerate: async (_type, language, _keep, _source, config) => {
        calls.push({ language, config });
        return { id: 'new-native-glossary', type: 'glossary', data: [] };
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ language: 'French', config: { nativeLanguageDefaultsVersion: 1, appLanguage: 'French', requestedOutputLanguage: 'All Selected Languages' } });
    expect(dispatcher.resolveGlossaryLanguagePlan({ outputLanguage: calls[0].config.requestedOutputLanguage,
      ...calls[0].config, translationPolicy: { enabled: false } }).translationLanguages).toEqual(['Spanish']);
  });
  it('retains saved native settings through the UI adapter when context omits its version', async () => {
    const blueprint = await blueprints.createDraft({ ...native, blueprintId: 'native-ui-boundary', primaryLanguage: 'All Selected Languages',
      plan: [{ tool: 'quiz', uiId: 'saved-quiz' }] });
    const legacy = window.AlloModules.AgentCoreContracts.toLegacyConfig(blueprint);
    const adapter = window.AlloModules.AgentCoreUIAdapter.createUIAdapter({ generationMatrix: matrix });
    const context = { appLanguage: 'German', currentUiLanguage: 'German', selectedLanguages: ['Italian'] };
    expect(window.AlloModules.AgentCoreUIAdapter.normalizeContext(context).nativeLanguageDefaultsVersion).toBe(0);
    const converted = adapter.toBlueprint(legacy, context);
    expect(converted.globalSettings).toMatchObject({ nativeLanguageDefaultsVersion: 1, appLanguage: 'French', effectiveLanguageList: ['French', 'Spanish'] });
    const execution = adapter.prepareExecution(legacy, context, 'native-language-test');
    expect(execution.ok).toBe(true);
    expect(execution.blueprint.globalSettings).toMatchObject({ nativeLanguageDefaultsVersion: 1, appLanguage: 'French', effectiveLanguageList: ['French', 'Spanish'] });
  });
});
