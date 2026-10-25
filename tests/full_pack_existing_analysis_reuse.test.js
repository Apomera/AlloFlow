import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

// A saved analysis of the current reading must be reused by the real Full Pack
// planner. The planner always gives the analysis row a directive, which the
// analysis generator never reads; that directive used to mark the saved
// analysis "refresh" and every pack added a second copy of it.
loadAlloModule('instructional_context_module.js');
loadAlloModule('generation_matrix_module.js');
loadAlloModule('generation_helpers_source.jsx');
const Matrix = window.AlloModules.GenerationMatrix;
const FullPack = window.AlloModules.GenerationHelpers;

const SOURCE = 'Photosynthesis is how plants make food from sunlight, water and carbon dioxide.';

const makeDeps = (overrides = {}) => Object.assign({
  isProcessing: false, fullPackTargetGroup: 'none', rosterKey: null,
  gradeLevel: '5th Grade', leveledTextLanguage: 'English', translationMode: 'auto', currentUiLanguage: 'English',
  studentInterests: [], dokLevel: '', leveledTextCustomInstructions: '', selectedLanguages: [],
  differentiationRange: 'None', differentiationTypes: ['simplified'], differentiationCustomGrades: [],
  targetStandards: [], useEmojis: false, textFormat: 'Standard Text', imageGenerationStyle: 'Auto', imageAspectRatio: '16:9',
  aiProviderProfile: { backend: 'gemini', model: 'gemini-test', imageProvider: 'auto', imageModel: 'imagen-test', isLocal: false },
  history: [], inputText: SOURCE, sourceTopic: 'Photosynthesis', standardsInput: '', standardsContext: null,
  instructionalContext: { primaryTextPolicy: 'preserve-primary', adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'educator' },
  resourceCount: 'Auto', isAutoConfigEnabled: true,
  setIsProcessing: vi.fn(), setGenerationStep: vi.fn(), setFullPackTargetGroup: vi.fn(), setGradeLevel: vi.fn(),
  setLeveledTextLanguage: vi.fn(), setStudentInterests: vi.fn(), setDokLevel: vi.fn(), setLeveledTextCustomInstructions: vi.fn(),
  setSelectedLanguages: vi.fn(), setTargetStandards: vi.fn(), setUseEmojis: vi.fn(), setTextFormat: vi.fn(),
  setPersistedLessonDNA: vi.fn(), setError: vi.fn(), addToast: vi.fn(), t: key => key, warnLog: vi.fn(),
  handleApplyRosterGroup: vi.fn(),
  // The real planner prompt asks for analysis first and writes a directive for every row.
  autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [
    { tool: 'analysis', directive: 'Analyze the text for key ideas and vocabulary.' },
    { tool: 'quiz', directive: 'Check understanding of how plants make food.' },
  ] })),
  applyDetailedAutoConfig: vi.fn(), getGroupDifferentiationContext: vi.fn(() => ''), getAssetManifest: vi.fn(() => []),
  getDifferentiationGrades: vi.fn(grade => [grade]),
  handleGenerate: vi.fn(async type => ({ id: 'resource-' + type, type, data: {} })),
}, overrides);

async function plan(history, overrides = {}) {
  let run = null;
  await FullPack.handlePlanFullPack(makeDeps(Object.assign({
    history, setFullPackRun: next => { run = typeof next === 'function' ? next(run) : next; },
  }, overrides)));
  expect(run && run.status, 'the plan should be ready for review').toBe('ready');
  return run;
}
const analysisCells = run => run.preflight.selected
  .filter(row => row.type === 'analysis').flatMap(row => row.generationVariants || []);

// Shape the dispatcher stores on an analysis: identity, fingerprints and the
// projected config, from a matrix call with the Analyze button's empty directive.
function savedAnalysis(id, directive, settings) {
  const cell = Matrix.resolveGenerationMatrix({ type: 'analysis', directive }, Object.assign({}, settings, { sourceText: SOURCE })).variants[0];
  const stamp = {
    generationIdentity: { key: cell.generationIdentity, type: 'analysis', sourceFingerprint: cell.sourceFingerprint },
    sourceFingerprint: cell.sourceFingerprint,
    generationConfig: JSON.parse(JSON.stringify(cell.generationConfig)),
    generationConfigFingerprint: cell.generationConfigFingerprint,
  };
  return Object.assign({ id, type: 'analysis', title: 'Source Analysis', data: { originalText: SOURCE } }, stamp, { config: stamp });
}

describe('Full Pack reuses the analysis the teacher already made', () => {
  it('plans one analysis row and reuses the saved analysis with no AI call', async () => {
    const first = await plan([]);
    const settings = first.preflight.generationMatrix.settings;
    const run = await plan([savedAnalysis('analysis-1', '', settings)]);
    const cells = analysisCells(run);
    expect(cells.map(cell => cell.action)).toEqual(['reuse']);
    expect(cells[0].existingArtifactId).toBe('analysis-1');
    expect(run.preflight.generationMatrix.summary.actions.reuse).toBe(1);
  });

  it('still reuses an analysis that an earlier pack saved with its directive hashed in', async () => {
    const first = await plan([]);
    const settings = first.preflight.generationMatrix.settings;
    // The pre-fix matrix is this module with no directive-free types.
    const marker = "var DIRECTIVE_FREE_TYPES = Object.freeze(['analysis']);";
    const source = readFileSync('generation_matrix_module.js', 'utf8');
    expect(source.includes(marker), 'directive-free type list').toBe(true);
    const legacyModule = { exports: {} };
    new Function('module', 'window', source.replace(marker, 'var DIRECTIVE_FREE_TYPES = Object.freeze([]);'))(legacyModule, undefined);
    const cell = legacyModule.exports.resolveGenerationMatrix({ type: 'analysis', directive: 'Essential verification step.' },
      Object.assign({}, settings, { sourceText: SOURCE })).variants[0];
    expect(cell.generationConfig.fields.customInstructions).toBe('essential verification step.');
    const stamp = { generationIdentity: cell.generationIdentity, sourceFingerprint: cell.sourceFingerprint,
      generationConfig: JSON.parse(JSON.stringify(cell.generationConfig)), generationConfigFingerprint: cell.generationConfigFingerprint };
    const legacy = Object.assign({ id: 'analysis-old', type: 'analysis', data: { originalText: SOURCE } }, stamp, { config: stamp });
    expect(analysisCells(await plan([legacy])).map(cell => [cell.action, cell.existingArtifactId]))
      .toEqual([['reuse', 'analysis-old']]);

    // A stored projection that does not reproduce its own fingerprint is not
    // trusted, even though rehashing it would match the current settings.
    const mismatched = JSON.parse(JSON.stringify(legacy));
    mismatched.generationConfigFingerprint = mismatched.config.generationConfigFingerprint = 'cfg-analysis-other';
    expect(analysisCells(await plan([mismatched])).map(cell => cell.action)).toEqual(['refresh']);
  });

  it('refreshes the saved analysis when a setting the analysis really uses changes', async () => {
    const first = await plan([]);
    const settings = Object.assign({}, first.preflight.generationMatrix.settings, { model: 'an-older-model' });
    const run = await plan([savedAnalysis('analysis-1', '', settings)]);
    expect(analysisCells(run).map(cell => cell.action)).toEqual(['refresh']);
  });
});
