import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

// Glossary review fixes (2026-09-27). Env vars swap in scratch copies so the
// suite can be mutation-checked against pre-fix code.
const read = (envName, file) => fs.readFileSync(path.resolve(process.cwd(), process.env[envName] || file), 'utf8');
const HELPERS = read('FIX0927_GLOS_HELPERS', 'glossary_helpers_module.js');
const PHASE_N = read('FIX0927_GLOS_PHASEN', 'phase_n_misc_helpers_module.js');
const VIEW = read('FIX0927_GLOS_VIEW', 'view_glossary_module.js');
const DISPATCH = read('FIX0927_GLOS_DISPATCH', 'generate_dispatcher_source.jsx');
const ANTI = read('FIX0927_GLOS_ANTI', 'AlloFlowANTI.txt');
const UI = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8'));
const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const noop = () => {};
let GH, PhaseN, Dispatcher, glossaryBranch;

const memoStart = ANTI.indexOf('  const latestGlossary = React.useMemo(');
const helperStart = ANTI.indexOf('  const _findRelatedHistoryItem =');
const memoRegion = ANTI.slice(helperStart >= 0 && helperStart < memoStart ? helperStart : memoStart, ANTI.indexOf('  const isClozeComplete', memoStart));
const hostLatestGlossary = (history, generatedContent) => new Function('React', 'history', 'generatedContent', 'warnLog',
  memoRegion + '\nreturn latestGlossary;')({ useMemo: fn => fn() }, history, generatedContent, noop);
const hostResolver = () => new Function(memoRegion.slice(0, memoRegion.indexOf('  const latestGlossary')) + '\nreturn typeof _findRelatedHistoryItem === "function" ? _findRelatedHistoryItem : null;')();

beforeAll(() => {
  window.React = React;
  window.AlloModules = window.AlloModules || {};
  ['GlossaryHelpersModule', 'GlossaryHelpers', 'PhaseNHelpersModule', 'PhaseNHelpers', 'GlossaryView', 'ViewGlossaryModule'].forEach(key => delete window.AlloModules[key]);
  new Function(HELPERS)();
  new Function(PHASE_N)();
  new Function(VIEW)();
  (0, eval)('(function(){\n' + DISPATCH + '\n})()');
  GH = window.AlloModules.GlossaryHelpers;
  PhaseN = window.AlloModules.PhaseNHelpers;
  Dispatcher = window.AlloModules.GenDispatcher;
  const ast = require('@babel/parser').parse(DISPATCH, { sourceType: 'script', plugins: ['jsx'] });
  require('@babel/traverse').default(ast, {
    IfStatement(p) {
      const test = p.node.test;
      if (test.type !== 'BinaryExpression' || test.left.name !== 'type' || test.right.value !== 'glossary' || p.node.consequent.type !== 'BlockStatement') return;
      const body = DISPATCH.slice(p.node.consequent.start + 1, p.node.consequent.end - 1);
      if (body.includes('glossaryTier2Count')) glossaryBranch = body;
    }
  });
  if (!GH || !PhaseN || !window.AlloModules.GlossaryView || !glossaryBranch) throw new Error('glossary modules or branch missing');
});
const cleanups = [];
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn()); delete window.__alloPrepareGlossaryAudio; vi.restoreAllMocks(); });

// Two units, each with a reading, an analysis and a glossary. Unit B is newer.
const glossA = { id: 'g-a', type: 'glossary', unitId: 'unit-a', sourceFamilyId: 'fam-a', data: [{ term: 'Erosion', def: 'Wearing away.', tier: 'Domain-Specific', translations: { Spanish: 'Erosion: Desgaste.' } }] };
const glossB = { id: 'g-b', type: 'glossary', unitId: 'unit-b', sourceFamilyId: 'fam-b', data: [{ term: 'Orbit', def: 'A path around.', tier: 'Domain-Specific' }] };
const textA = { id: 't-a', type: 'simplified', unitId: 'unit-a', sourceFamilyId: 'fam-a', data: 'Erosion shapes land.' };
const anaA = { id: 'a-a', type: 'analysis', unitId: 'unit-a', sourceFamilyId: 'fam-a', data: { originalText: 'Text A' } };
const anaB = { id: 'a-b', type: 'analysis', unitId: 'unit-b', sourceFamilyId: 'fam-b', data: { originalText: 'Text B' } };
const HISTORY = [anaA, textA, glossA, anaB, glossB];
const CASES = [
  ['a unit-A reading gets the unit-A glossary', HISTORY, 'glossary', textA, 'g-a'],
  ['an open glossary resolves to itself', HISTORY, 'glossary', { ...glossA }, 'g-a'],
  ['the same source family wins across units', [glossA, glossB], 'glossary', { id: 'x', type: 'simplified', unitId: 'unit-c', sourceFamilyId: 'fam-a' }, 'g-a'],
  ['a unit glossary without family data still matches the unit', [{ ...glossA, sourceFamilyId: null }, glossB], 'glossary', { id: 'x', type: 'quiz', unitId: 'unit-a' }, 'g-a'],
  ['config-only unit ids count', [{ ...glossA, unitId: undefined, config: { unitId: 'unit-a' } }, glossB], 'glossary', { id: 'x', type: 'quiz', config: { unitId: 'unit-a' } }, 'g-a'],
  ['falls back to the newest only when nothing matches', HISTORY, 'glossary', { id: 'x', type: 'quiz', unitId: 'unit-z' }, 'g-b'],
  ['no active resource keeps the newest', HISTORY, 'glossary', null, 'g-b'],
  ['a resource with no unit or family keeps the newest', HISTORY, 'glossary', { id: 'x', type: 'simplified', data: 'Plain text.' }, 'g-b'],
  ['an uncategorized unit counts as no unit', HISTORY, 'glossary', { id: 'x', type: 'quiz', unitId: 'uncategorized' }, 'g-b'],
  ['unit-less glossaries still serve unit-less readings', [{ ...glossA, unitId: undefined, sourceFamilyId: undefined }], 'glossary', { id: 'x', type: 'simplified' }, 'g-a'],
  ['a glossary resolves its own analysis', HISTORY, 'analysis', glossA, 'a-a'],
];

describe('G1: companions resolve to the active unit and source', () => {
  it.each(CASES)('GlossaryHelpers: %s', (_, history, type, active, expected) => {
    expect(typeof GH.findRelatedHistoryItem).toBe('function');
    expect(GH.findRelatedHistoryItem(history, type, active)?.id).toBe(expected);
  });
  it.each(CASES)('host resolver matches the module: %s', (_, history, type, active, expected) => {
    const resolve = hostResolver();
    expect(typeof resolve).toBe('function');
    expect(resolve(history, type, active)?.id).toBe(expected);
  });
  it('host latestGlossary feeds a unit-A reading the unit-A terms (cloze, highlighting)', () => {
    expect(hostLatestGlossary(HISTORY, textA).map(item => item.term)).toEqual(['Erosion']);
    expect(hostLatestGlossary(HISTORY, null).map(item => item.term)).toEqual(['Orbit']);
  });
  it('host health check scores against the glossary unit analysis', () => {
    expect(ANTI).toMatch(/const sourceText = _findRelatedHistoryItem\(state\.history, 'analysis', state\.resource\)\?\.data\?\.originalText/);
  });

  function quickAddDeps(overrides = {}) {
    const history = [...HISTORY];
    const deps = {
      generatedContent: textA, history, gradeLevel: '5th Grade', selectedLanguages: [], useEmojis: false,
      callGemini: vi.fn(async () => JSON.stringify({ term: 'Sediment', def: 'Bits of rock.', tier: 'Domain-Specific', translations: { Spanish: 'Sedimento: Trozos de roca.' } })),
      cleanJson: s => s, callImagen: vi.fn(async () => null), callGeminiImageEdit: noop, autoRemoveWords: false,
      glossaryImageStyle: '', universalImageStyle: '', setIsAddingTerm: noop, setNewGlossaryTerm: noop, addToast: noop, t: k => k, warnLog: noop,
      setGeneratedContent: noop, setHistory: vi.fn(update => { deps.nextHistory = update(history); }), ...overrides,
    };
    return deps;
  }
  it('Quick Add from a unit-A reading adds to the unit-A glossary with its Spanish column', async () => {
    const deps = quickAddDeps();
    expect(await PhaseN.handleQuickAddGlossary('sediment', false, deps)).toBe(true);
    const updatedA = deps.nextHistory.find(item => item.id === 'g-a');
    const updatedB = deps.nextHistory.find(item => item.id === 'g-b');
    expect(updatedA.data.map(item => item.term)).toEqual(['Erosion', 'Sediment']);
    expect(updatedB.data).toHaveLength(1);
    expect(deps.callGemini.mock.calls[0][0]).toContain('Provide translations into: Spanish');
  });
});

function mount(overrides = {}) {
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const props = glossaryMediaProps(overrides);
  props.filteredGlossaryData = props.generatedContent.data.map((item, index) => ({ ...item, _originalIdx: index }));
  act(() => root.render(React.createElement(window.AlloModules.GlossaryView, props)));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return container;
}
const spanishGlossary = { id: 'g-es', type: 'glossary', language: 'English', data: [{ entryId: 'e1', term: 'Erosion', def: 'Wearing away of land.', tier: 'Academic', translations: { Spanish: 'Erosion: Desgaste de la tierra.' } }] };

describe('G2: language tools follow the glossary translation columns', () => {
  it('offers language flashcards and export for a Spanish column with no language chips', async () => {
    const launchInteractiveFlashcards = vi.fn(), setFlashcardLang = vi.fn();
    const c = mount({ generatedContent: spanishGlossary, selectedLanguages: [], displayLanguages: ['Spanish'], launchInteractiveFlashcards, setFlashcardLang });
    const launch = c.querySelector('[data-help-key="glossary_language_flashcards"]');
    expect(launch).toBeTruthy();
    await act(async () => launch.click());
    expect(launchInteractiveFlashcards).toHaveBeenCalledWith('language');
    expect(setFlashcardLang).toHaveBeenLastCalledWith('Spanish');
    await act(async () => [...c.querySelectorAll('button')].find(b => b.textContent.includes('glossary.more_tools')).click());
    expect(c.querySelector('[data-help-key="glossary_export_language"]')).toBeTruthy();
  });
  it('prepares Spanish translation audio even when the chips list is empty', async () => {
    window.__alloPrepareGlossaryAudio = vi.fn(async () => ({ ok: true, ready: 3, total: 3 }));
    const c = mount({ generatedContent: spanishGlossary, selectedLanguages: [], displayLanguages: ['Spanish'] });
    await act(async () => [...c.querySelectorAll('button')].find(b => b.textContent.includes('glossary.more_tools')).click());
    const scope = c.querySelector('select[aria-label="common.download_audio"]');
    expect([...scope.options].map(o => o.value)).toContain('all');
    await act(async () => { scope.value = 'all'; scope.dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => c.querySelector('[data-help-key="glossary_prepare_audio"], button[aria-label="common.download_audio"]').click());
    expect(window.__alloPrepareGlossaryAudio.mock.calls[0][0].languages).toEqual(['Spanish']);
  });
});

describe('G1: health check in the view scores against the related analysis', () => {
  it('sends the unit-A analysis text for a unit-A glossary', async () => {
    const runGlossaryHealthCheck = vi.fn();
    const c = mount({ generatedContent: { ...glossA, data: [{ ...glossA.data[0], entryId: 'e' }] }, history: HISTORY, runGlossaryHealthCheck });
    await act(async () => [...c.querySelectorAll('button')].find(b => b.textContent.includes('glossary.more_tools')).click());
    await act(async () => [...c.querySelectorAll('button')].find(b => b.textContent.trim() === 'common.check').click());
    expect(runGlossaryHealthCheck).toHaveBeenCalledTimes(1);
    expect(runGlossaryHealthCheck.mock.calls[0][1]).toBe('Text A');
  });
});

describe('G4: glossary names and student strings', () => {
  const lookup = key => { const value = key.split('.').reduce((o, part) => (o && typeof o === 'object' ? o[part] : undefined), UI); return typeof value === 'string' ? value : undefined; };
  it('names each edit-row checkbox after its term', () => {
    const c = mount({ t: lookup, isEditingGlossary: true });
    const boxes = [...c.querySelectorAll('tbody input[type="checkbox"]')].map(el => el.getAttribute('aria-label'));
    expect(boxes).toEqual(['Include Leaf']);
    expect(c.innerHTML).not.toContain('Toggle is selected');
    expect(c.querySelector('thead input[type="checkbox"]').getAttribute('aria-label')).toBe('Include all terms');
  });
  it('routes the tier badge and read-aloud names through the translation helper', () => {
    const es = { 'glossary.tier_badge_subject': 'Vocabulario de la materia', 'glossary.read_term_aria': 'Leer el termino: {term}', 'glossary.read_definition_aria': 'Leer la definicion de {term}' };
    const c = mount({ t: key => es[key], isTeacherMode: false });
    expect(c.textContent).toContain('Vocabulario de la materia');
    expect(c.querySelector('[aria-label="Leer el termino: Leaf"]')).toBeTruthy();
    expect(c.querySelector('[aria-label="Leer la definicion de Leaf"]')).toBeTruthy();
  });
});

describe('G3: cloud glossary output is normalized like the local path', () => {
  const cleanJson = s => String(s).replace(/```json|```/g, '').trim();
  async function runBranch(response, overrides = {}) {
    const scope = {
      glossaryImageReuseCache: { begin: () => ({ references: [], getOrCreate: async () => null }) }, textToProcess: 'Source.',
      glossaryImageStyle: '', universalImageStyle: '', autoRemoveWords: false, _generationProviderProfile: {}, glossaryTier2Count: 1, glossaryTier3Count: 1,
      addToast: noop, t: k => k, setIsProcessing: noop, configOverride: {}, glossaryDefinitionLevel: 'Same as Global Level', effectiveGrade: '5th Grade',
      leveledTextLanguage: 'English', selectedLanguages: [], _xlate: { enabled: false }, usesLocalTextBackend: false, includeEtymology: false,
      effCustomInstructions: '', useEmojis: false, standardsDirective: '', dokDirective: '', interestsDirective: '', differentiationContext: '',
      setGenerationStatus: noop, setGenerationTaskProgress: noop, callGemini: async () => response, cleanJson, effectiveLanguage: 'Spanish',
      debugLog: noop, warnLog: noop, callImagenWithSignal: async () => null, callGeminiImageEditWithSignal: async () => null, generationSignal: null,
      localExcerpt: s => s, assertLocalTaskSupported: noop, localSchemaArg: () => null,
      parseJsonLenient: (raw, fallback) => { try { return JSON.parse(cleanJson(raw)); } catch (_) { return fallback; } },
      unwrapArray: (v, keys) => Array.isArray(v) ? v : (keys.map(k => v && v[k]).find(Array.isArray) || []),
      normalizeGlossaryTerms: Dispatcher.normalizeGlossaryTerms, ...overrides,
    };
    return new Function('scope', 'with (scope) { return (async () => { let content, metaInfo;\n' + glossaryBranch + '\nreturn { content, metaInfo }; })(); }')(scope);
  }
  it('accepts "definition" and "Tier 3", and unwraps a vocabulary wrapper', async () => {
    const out = await runBranch(JSON.stringify({ Vocabulary: [{ term: 'Erosion', definition: 'Wearing away of land.', tier: 'Tier 3', emoji: 'x' }, { term: 'Infer', def: 'Figure out.', tier: 'Tier 2' }] }));
    expect(out.content.map(({ term, def, tier }) => ({ term, def, tier }))).toEqual([
      { term: 'Erosion', def: 'Wearing away of land.', tier: 'Domain-Specific' },
      { term: 'Infer', def: 'Figure out.', tier: 'Academic' },
    ]);
    expect(out.content[0]).not.toHaveProperty('definition');
    const kept = await runBranch(JSON.stringify([{ term: 'Photo', definition: 'Light.', tier: 'Academic', roots: [{ root: 'photo' }], translations: { Spanish: 'Foto: Luz.' } }]));
    expect(kept.content[0]).toMatchObject({ def: 'Light.', roots: [{ root: 'photo' }], translations: { Spanish: 'Foto: Luz.' } });
  });
  it('rejects empty, unknown-wrapper or prose output with a retryable error', async () => {
    for (const response of ['{}', '{"note":"none"}', '[{"term":"","def":""}]', 'Here are the words you asked for.']) {
      await expect(runBranch(response)).rejects.toThrow(/Glossary/);
    }
  });
  it('local path uses the same normalizer', async () => {
    const out = await runBranch(JSON.stringify({ items: [{ term: 'Delta', definition: 'River mouth land.', tier: 'Subject-specific' }] }), { usesLocalTextBackend: true });
    expect(out.content).toEqual([{ term: 'Delta', def: 'River mouth land.', tier: 'Domain-Specific' }]);
  });
});
