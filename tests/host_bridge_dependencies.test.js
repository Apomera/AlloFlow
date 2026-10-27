import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { loadHostHandlersFactory } from './helpers/host_source.js';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt'];
const CAP_NAMES = [
  'ALLO_AAC_PACK_IMAGE_ITEM_CHARS',
  'ALLO_AAC_PACK_IMAGE_CHARS',
  'ALLO_AAC_PACK_AUDIO_ITEM_CHARS',
  'ALLO_AAC_PACK_AUDIO_CHARS',
];
const BRIDGE_NAMES = new Set([...CAP_NAMES, 'ORF_SCREENING_PASSAGES', 'assignmentDirections', 'studentLanguage', 'isProcessing']);
const REVIEWED_CAPS = {
  ALLO_AAC_PACK_IMAGE_ITEM_CHARS: 2 * 1024 * 1024,
  ALLO_AAC_PACK_IMAGE_CHARS: 4 * 1024 * 1024,
  ALLO_AAC_PACK_AUDIO_ITEM_CHARS: 1024 * 1024,
  ALLO_AAC_PACK_AUDIO_CHARS: 1024 * 1024,
};
const createHandlers = loadHostHandlersFactory();

function parseSource(file) {
  const text = readFileSync(file, 'utf8');
  return { text, ast: parse(text, { sourceType: 'module', plugins: ['jsx'] }) };
}

function declaration(model, name) {
  for (const statement of model.ast.program.body) {
    if (statement.type !== 'VariableDeclaration') continue;
    const item = statement.declarations.find(candidate => candidate.id.type === 'Identifier' && candidate.id.name === name);
    if (item) return statement.kind + ' ' + model.text.slice(item.start, item.end) + ';';
  }
  return null;
}

function bridgeModel(file) {
  const model = parseSource(file);
  const content = model.ast.program.body
    .filter(node => node.type === 'VariableDeclaration')
    .flatMap(node => node.declarations)
    .find(node => node.id.name === 'AlloFlowContent');
  if (!content || content.init.body.type !== 'BlockStatement') throw new Error(file + ': AlloFlowContent missing');
  const deps = content.init.body.body
    .filter(node => node.type === 'VariableDeclaration')
    .flatMap(node => node.declarations)
    .find(node => node.id.name === '__alloHostDeps');
  if (!deps || deps.init.type !== 'ObjectExpression') throw new Error(file + ': host bridge missing');
  const properties = deps.init.properties.filter(property => BRIDGE_NAMES.has(property.key?.name));
  return {
    constants: CAP_NAMES.map(name => declaration(model, name)).filter(Boolean).join('\n'),
    getters: '({' + properties.map(property => model.text.slice(property.start, property.end)).join(',\n') + '})',
    normalization: ['_alloLiveAacModule', '_alloNormalizePortableAacBoardPackage'].map(name => {
      const text = declaration(model, name);
      if (!text) throw new Error(file + ': normalization bridge missing ' + name);
      return text;
    }).join('\n'),
  };
}

function fixture(model, pageWindow = { AlloModules: {} }) {
  const context = vm.createContext({ window: pageWindow, isProcessing: false });
  const bridge = vm.runInContext(model.constants + '\n' + model.normalization + '\n' + model.getters, context);
  const normalize = vm.runInContext('_alloNormalizePortableAacBoardPackage', context);
  return {
    window: pageWindow,
    bridge,
    setProcessing(value) { context.isProcessing = value; },
    handlers(extra) {
      const deps = Object.assign(Object.create(bridge), {
        _alloNormalizePortableAacBoardPackage: normalize,
      }, extra);
      return { deps, api: createHandlers(deps) };
    },
  };
}

const liveAac = parseSource('live_aac_source.jsx');
const liveCaps = vm.runInNewContext(
  CAP_NAMES.map(name => {
    const text = declaration(liveAac, name);
    if (!text) throw new Error('LiveAac cap missing: ' + name);
    return text;
  }).join('\n') + '\n({' + CAP_NAMES.join(',') + '})',
);
const visual = parseSource('visual_panel_source.jsx');
const visualPlanNode = visual.ast.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'generateVisualPlan');
if (!visualPlanNode) throw new Error('Visual plan implementation missing');
const generateVisualPlan = vm.runInNewContext('(' + visual.text.slice(visualPlanNode.start, visualPlanNode.end) + ')', {
  console: { log() {}, warn() {} },
});

describe.each(HOSTS)('%s host dependency behavior', file => {
  const model = bridgeModel(file);

  it('exposes the independently owned portable AAC pack budgets without lowering per-item limits', () => {
    const { bridge } = fixture(model);
    const actual = Object.fromEntries(CAP_NAMES.map(name => [name, bridge[name]]));
    expect(actual).toEqual(liveCaps);
    expect(actual).toEqual(REVIEWED_CAPS);
  });

  it('passes those limits through the real save handler and host normalization bridge', () => {
    const normalizePortable = vi.fn(() => null);
    const state = fixture(model, { AlloModules: { LiveAac: { normalizePortable } } });
    const { api } = state.handlers({});
    const portable = { format: 'alloflow.aac-board', version: 1, board: { id: 'board' }, pages: [] };
    expect(api.savePortableAacResourceToHistory(portable)).toBeNull();
    expect(normalizePortable).toHaveBeenCalledExactlyOnceWith(portable, {
      allowAudio: true,
      maxImageChars: liveCaps.ALLO_AAC_PACK_IMAGE_CHARS,
      maxImageItemChars: liveCaps.ALLO_AAC_PACK_IMAGE_ITEM_CHARS,
      maxAudioChars: liveCaps.ALLO_AAC_PACK_AUDIO_CHARS,
      maxAudioItemChars: liveCaps.ALLO_AAC_PACK_AUDIO_ITEM_CHARS,
    });
  });

  it('does not save or change history before the LiveAac normalizer is available', () => {
    const setHistory = vi.fn();
    const { api } = fixture(model).handlers({ setHistory });
    expect(api.savePortableAacResourceToHistory({ board: { id: 'waiting' } })).toBeNull();
    expect(setHistory).not.toHaveBeenCalled();
  });

  it('reads the currently populated ORF bank rather than capturing an absent global', () => {
    const pageWindow = { AlloModules: {}, ORF_SCREENING_PASSAGES: null };
    const { bridge } = fixture(model, pageWindow);
    expect(bridge.ORF_SCREENING_PASSAGES).toBeNull();
    const firstBank = { '3': { A: [{ text: 'First passage' }] } };
    pageWindow.ORF_SCREENING_PASSAGES = firstBank;
    expect(bridge.ORF_SCREENING_PASSAGES).toBe(firstBank);
    const replacement = { '4': { B: [{ text: 'Replacement passage' }] } };
    pageWindow.ORF_SCREENING_PASSAGES = replacement;
    expect(bridge.ORF_SCREENING_PASSAGES).toBe(replacement);
  });

  it('keeps the live processing guard from starting a second translation', async () => {
    const state = fixture(model);
    expect(state.bridge.isProcessing).toBe(false);
    state.setProcessing(true);
    expect(state.bridge.isProcessing).toBe(true);
    const setIsProcessing = vi.fn();
    const addToast = vi.fn();
    const { api } = state.handlers({
      targetTranslationLang: 'Spanish', translateScope: 'single', setIsProcessing, addToast,
    });
    await api.handleTranslateAction('single');
    expect(setIsProcessing).not.toHaveBeenCalled();
    expect(addToast).not.toHaveBeenCalled();
    state.setProcessing(false);
    expect(state.bridge.isProcessing).toBe(false);
  });

  it('collects learner work and provided prompts when optional assignment directions are absent', () => {
    const state = fixture(model);
    expect(state.bridge.assignmentDirections).toBeUndefined();
    const { api } = state.handlers({
      studentResponses: { reading: { answer: 'My own explanation' } },
      generatedContent: { data: [{ question: 'Explain your reasoning.' }] },
    });
    expect(api._alloCheckpointArtifact()).toEqual({
      text: 'My own explanation',
      providedTexts: ['Explain your reasoning.'],
    });
    const withDirections = state.handlers({
      studentResponses: { reading: { answer: 'My own explanation' } },
      generatedContent: { data: [{ question: 'Explain your reasoning.' }] },
      assignmentDirections: 'Use evidence from the passage.',
    });
    expect(withDirections.api._alloCheckpointArtifact().providedTexts).toEqual([
      'Explain your reasoning.', 'Use evidence from the passage.',
    ]);
  });

  it.each([
    { savedLanguage: undefined, expectedLanguage: 'English' },
    { savedLanguage: 'Spanish', expectedLanguage: 'Spanish' },
  ])('regenerates visual plans in $expectedLanguage with saved-resource language taking priority', async ({ savedLanguage, expectedLanguage }) => {
    const state = fixture(model);
    expect(state.bridge.studentLanguage).toBeUndefined();
    const callGemini = vi.fn(async () => JSON.stringify({
      layout: 'sequence', title: 'Water cycle', panels: [{ id: 'before' }, { id: 'after' }],
    }));
    const warnLog = vi.fn();
    const plan = vi.fn((concept, grade, language) => generateVisualPlan(concept, grade, language, '', '', null, {
      callGemini, cleanJson: text => text, warnLog,
    }));
    const { api } = state.handlers({
      isTeacherMode: true,
      generatedContent: {
        id: 'water-cycle',
        config: savedLanguage ? { language: savedLanguage } : {},
        data: { prompt: 'Water cycle', visualPlan: { panels: [{ id: 'old-before' }, { id: 'old-after' }] } },
      },
      gradeLevel: '5th Grade',
      setSingleImageOverride: vi.fn(),
      setIsProcessing: vi.fn(),
      setGenerationStep: vi.fn(),
      setError: vi.fn(),
      t: () => '',
      generateVisualPlan: plan,
      executeVisualPlan: vi.fn(async result => result),
      onUpdateResource: vi.fn(() => false),
      addToast: vi.fn(),
      warnLog,
    });
    await api.handleRestoreImage();
    expect(plan).toHaveBeenCalledExactlyOnceWith('Water cycle', '5th Grade', savedLanguage);
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGemini.mock.calls[0][0]).toContain('STUDENT LANGUAGE: ' + expectedLanguage);
    expect(warnLog).not.toHaveBeenCalled();
  });
});
