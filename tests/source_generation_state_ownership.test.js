import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const root = process.cwd();
const canonicalHost = readFileSync(resolve(root, 'AlloFlowANTI.txt'), 'utf8');

const MUTATION_KEYS = [
  'setActiveView',
  'setError',
  'setGeneratedContent',
  'setGenerationStep',
  'setInputText',
  'setIsGeneratingSource',
  'setShowSourceGen',
];

let createContentEngine;

beforeAll(() => {
  loadAlloModule('content_engine_module.js');
  createContentEngine = window.AlloModules?.createContentEngine;
  if (typeof createContentEngine !== 'function') {
    throw new Error('createContentEngine failed to register');
  }
});

afterEach(() => {
  delete window.__contentEngineState;
  vi.restoreAllMocks();
});

function createStateBag(label) {
  const mutations = Object.fromEntries(MUTATION_KEYS.map((key) => [key, vi.fn()]));
  return {
    mutations,
    state: {
      inputText: '',
      gradeLevel: '5th Grade',
      sourceTopic: 'Instance-owned water cycle',
      generatedContent: null,
      currentUiLanguage: 'English',
      leveledTextLanguage: 'English',
      selectedLanguages: [],
      studentInterests: [],
      selectedConcepts: [],
      sourceCustomInstructions: '',
      sourceLength: '250',
      sourceLevel: '5th Grade',
      sourceTone: 'Informative',
      sourceVocabulary: '',
      resourceCount: 1,
      targetStandards: [],
      dokLevel: '',
      selectedFont: 'Default',
      includeSourceCitations: false,
      standardsPromptString: '',
      interactionMode: 'revise',
      revisionData: null,
      ai: { backend: 'gemini' },
      webSearchProvider: null,
      alloBotRef: { current: null },
      ownerLabel: label,
      ...mutations,
    },
  };
}

describe('source generation state ownership', () => {
  it('keeps every synchronous and asynchronous write on the engine instance state', async () => {
    const bagA = createStateBag('engine-a');
    const bagB = createStateBag('newer-global-host');
    const getState = vi.fn(() => bagA.state);
    let resolveGeneration;
    const callGemini = vi.fn(() => new Promise((resolve) => {
      resolveGeneration = resolve;
    }));

    window.__contentEngineState = bagA.state;
    const engineA = createContentEngine({
      callGemini,
      addToast: vi.fn(),
      t: (key) => key,
      getBilingualPromptInstruction: () => '',
      flyToElement: vi.fn(),
      getState,
    });

    // A second host render may replace the legacy global while engine A still has
    // an in-flight request. Engine A must continue writing through its own resolver.
    window.__contentEngineState = bagB.state;
    const generation = engineA.handleGenerateSource({}, true);

    expect(getState).toHaveBeenCalledTimes(1);
    expect(bagA.mutations.setIsGeneratingSource).toHaveBeenNthCalledWith(1, true);
    expect(bagA.mutations.setInputText.mock.calls.map(([value]) => value)).toEqual([
      'Title: Instance-owned water cycle\n\n',
    ]);
    for (const mutation of Object.values(bagB.mutations)) {
      expect(mutation).not.toHaveBeenCalled();
    }

    resolveGeneration('## Water on the move\n\nWater evaporates, cools into clouds, and returns as rain.');
    await generation;

    const inputWrites = bagA.mutations.setInputText.mock.calls.map(([value]) => value);
    expect(inputWrites.length).toBeGreaterThanOrEqual(3);
    expect(inputWrites.slice(1, -1).some((value) => value.includes('Water on the move'))).toBe(true);
    expect(inputWrites.at(-1)).toContain('Water evaporates, cools into clouds, and returns as rain.');
    expect(bagA.mutations.setShowSourceGen).toHaveBeenCalledWith(false);
    expect(bagA.mutations.setIsGeneratingSource).toHaveBeenLastCalledWith(false);
    for (const mutation of Object.values(bagB.mutations)) {
      expect(mutation).not.toHaveBeenCalled();
    }
  });

  it('keeps the canonical host state behind a stable ref passed to getState', () => {
    const hostRegionStart = canonicalHost.indexOf('window.__alloCallTTS = callTTS;');
    const hostRegionEnd = canonicalHost.indexOf("const _ceFn = (name, fallback)", hostRegionStart);
    expect(hostRegionStart).toBeGreaterThan(-1);
    expect(hostRegionEnd).toBeGreaterThan(hostRegionStart);
    const hostRegion = canonicalHost.slice(hostRegionStart, hostRegionEnd);
    const refMatch = hostRegion.match(/const\s+([\w$]*contentEngineStateRef)\s*=\s*(?:React\.)?useRef\([^)]*\)/i);
    expect(refMatch).not.toBeNull();
    const refName = refMatch[1];

    expect(hostRegion).toContain(`${refName}.current = {`);
    expect(hostRegion).toContain(`window.__contentEngineState = ${refName}.current`);
    expect(hostRegion).toContain(`getState: () => ${refName}.current`);
  });
});

describe('Guided source generation progress', () => {
  it('does not auto-advance the source step while generation or extraction is active', () => {
    const effectStart = canonicalHost.indexOf('if (guidedMode && guidedStep === 0 && inputText');
    const effectEnd = canonicalHost.indexOf('// Hands-on guided tutorial:', effectStart);
    expect(effectStart).toBeGreaterThan(-1);
    expect(effectEnd).toBeGreaterThan(effectStart);
    const effect = canonicalHost.slice(effectStart, effectEnd);
    const beforeAdvanceTimer = effect.slice(0, effect.indexOf('setTimeout'));

    expect(beforeAdvanceTimer).toMatch(
      /if\s*\(\s*(?:isGeneratingSource\s*\|\|\s*isExtracting|isExtracting\s*\|\|\s*isGeneratingSource)\s*\)\s*(?:\{\s*)?return/,
    );
    const dependencies = effect.slice(effect.lastIndexOf('}, ['));
    expect(dependencies).toContain('isGeneratingSource');
    expect(dependencies).toContain('isExtracting');
  });

  it('shows source generation in the output header and loading overlay', () => {
    const outputStart = canonicalHost.indexOf("${isOutputHeaderCollapsed ? 'py-1.5'");
    const outputEnd = canonicalHost.indexOf('data-help-key="gen_loading_progress"', outputStart);
    expect(outputStart).toBeGreaterThan(-1);
    expect(outputEnd).toBeGreaterThan(outputStart);
    const output = canonicalHost.slice(outputStart, outputEnd);
    const busy = String.raw`isProcessing\s*\|\|\s*isGeneratingSource`;

    expect(output).toMatch(new RegExp(`\\$\\{\\s*\\(${busy}\\)\\s*\\?\\s*'hidden md:flex'`));
    expect(output).toMatch(new RegExp(`\\{\\s*\\(${busy}\\)\\s*\\?\\s*<>\\s*<RefreshCw`));
    expect(output).toMatch(new RegExp(`\\{\\s*\\(${busy}\\)\\s*&&\\s*\\(!generatedContent`));
  });
});
