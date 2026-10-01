// Unit tests for window.AlloModules.GlossaryHelpers.applyAIConfig.
//
// applyAIConfig has 30+ deps but the LOGIC inside is mostly deterministic
// transforms (grade-level mapping, length mapping, value clamping). We test
// by passing a mock-deps object with vi.fn() setters, then asserting which
// setters got called with which values.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let GH;
beforeAll(() => {
  loadAlloModule('glossary_helpers_module.js');
  GH = window.AlloModules.GlossaryHelpers;
  if (!GH) throw new Error('GlossaryHelpers failed to register');
});

// Minimal deps stub. All setters are mocks; state values default to empty/safe.
const makeDeps = (overrides = {}) => ({
  inputText: '',
  selectedLanguages: [],
  studentInterests: [],
  generatedContent: null,
  gradeLevel: '',
  leveledTextLanguage: 'English',
  setGradeLevel: vi.fn(),
  setSourceTopic: vi.fn(),
  setInputText: vi.fn(),
  setSelectedLanguages: vi.fn(),
  setLeveledTextLanguage: vi.fn(),
  setStudentInterests: vi.fn(),
  setLeveledTextCustomInstructions: vi.fn(),
  setSourceTone: vi.fn(),
  setSourceLength: vi.fn(),
  setTextFormat: vi.fn(),
  setDokLevel: vi.fn(),
  setVisualStyle: vi.fn(),
  setIncludeSourceCitations: vi.fn(),
  setFullPackTargetGroup: vi.fn(),
  setDifferentiationRange: vi.fn(),
  setTargetStandards: vi.fn(),
  setVoiceSpeed: vi.fn(),
  setVoiceVolume: vi.fn(),
  setSelectedVoice: vi.fn(),
  setIsGeneratingEtymology: vi.fn(),
  setGeneratedContent: vi.fn(),
  setHistory: vi.fn(),
  callGemini: vi.fn(),
  warnLog: vi.fn(),
  addToast: vi.fn(),
  t: (k) => k,
  ...overrides,
});

describe('applyAIConfig — empty / null cases', () => {
  it('returns [] for null/undefined config', () => {
    expect(GH.applyAIConfig(null, makeDeps())).toEqual([]);
    expect(GH.applyAIConfig(undefined, makeDeps())).toEqual([]);
  });

  it('returns [] when config has no recognized keys', () => {
    expect(GH.applyAIConfig({ junk: 'value' }, makeDeps())).toEqual([]);
  });
});

describe('applyAIConfig — grade level mapping', () => {
  it("maps 'k' or 'kinder' to Kindergarten", () => {
    const deps = makeDeps();
    GH.applyAIConfig({ gradeLevel: 'k' }, deps);
    expect(deps.setGradeLevel).toHaveBeenCalledWith('Kindergarten');
    deps.setGradeLevel.mockClear();
    GH.applyAIConfig({ gradeLevel: 'kindergarten' }, deps);
    expect(deps.setGradeLevel).toHaveBeenCalledWith('Kindergarten');
  });

  it('maps numeric grade strings to "Nth Grade" format', () => {
    const deps = makeDeps();
    GH.applyAIConfig({ gradeLevel: '5' }, deps);
    expect(deps.setGradeLevel).toHaveBeenCalledWith('5th Grade');
  });

  it('maps verbose grade strings (e.g. "3rd")', () => {
    const deps = makeDeps();
    GH.applyAIConfig({ gradeLevel: '3rd' }, deps);
    expect(deps.setGradeLevel).toHaveBeenCalledWith('3rd Grade');
  });

  it("maps 'college' or 'university' to 'College'", () => {
    const deps = makeDeps();
    GH.applyAIConfig({ gradeLevel: 'college' }, deps);
    expect(deps.setGradeLevel).toHaveBeenCalledWith('College');
    deps.setGradeLevel.mockClear();
    GH.applyAIConfig({ gradeLevel: 'university' }, deps);
    expect(deps.setGradeLevel).toHaveBeenCalledWith('College');
  });

  it("maps 'grad' to 'Graduate Level'", () => {
    const deps = makeDeps();
    GH.applyAIConfig({ gradeLevel: 'grad' }, deps);
    expect(deps.setGradeLevel).toHaveBeenCalledWith('Graduate Level');
  });
});

describe('applyAIConfig — length mapping', () => {
  it("maps 'short' to 150 words", () => {
    const deps = makeDeps();
    GH.applyAIConfig({ length: 'short' }, deps);
    expect(deps.setSourceLength).toHaveBeenCalledWith('150');
  });

  it("maps 'standard' / 'medium' / 'normal' to 250", () => {
    const deps = makeDeps();
    for (const v of ['standard', 'medium', 'normal']) {
      deps.setSourceLength.mockClear();
      GH.applyAIConfig({ length: v }, deps);
      expect(deps.setSourceLength).toHaveBeenCalledWith('250');
    }
  });

  it("maps 'detailed' / 'long' to 500", () => {
    const deps = makeDeps();
    GH.applyAIConfig({ length: 'detailed' }, deps);
    expect(deps.setSourceLength).toHaveBeenCalledWith('500');
    deps.setSourceLength.mockClear();
    GH.applyAIConfig({ length: 'long' }, deps);
    expect(deps.setSourceLength).toHaveBeenCalledWith('500');
  });

  it("maps 'exhaustive' to 1000", () => {
    const deps = makeDeps();
    GH.applyAIConfig({ length: 'exhaustive' }, deps);
    expect(deps.setSourceLength).toHaveBeenCalledWith('1000');
  });

  it('passes through plain numeric strings', () => {
    const deps = makeDeps();
    GH.applyAIConfig({ length: '750' }, deps);
    expect(deps.setSourceLength).toHaveBeenCalledWith('750');
  });

  it('does not call setSourceLength on unrecognized values', () => {
    const deps = makeDeps();
    GH.applyAIConfig({ length: 'gibberish' }, deps);
    expect(deps.setSourceLength).not.toHaveBeenCalled();
  });
});

describe('applyAIConfig — voice clamping', () => {
  it('clamps voiceSpeed to [0.5, 2.0]', () => {
    const deps = makeDeps();
    GH.applyAIConfig({ voiceSpeed: 5.0 }, deps);
    expect(deps.setVoiceSpeed).toHaveBeenCalledWith(2);
    deps.setVoiceSpeed.mockClear();
    GH.applyAIConfig({ voiceSpeed: 0.1 }, deps);
    expect(deps.setVoiceSpeed).toHaveBeenCalledWith(0.5);
    deps.setVoiceSpeed.mockClear();
    GH.applyAIConfig({ voiceSpeed: 1.2 }, deps);
    expect(deps.setVoiceSpeed).toHaveBeenCalledWith(1.2);
  });

  it('clamps voiceVolume to [0, 1]', () => {
    const deps = makeDeps();
    GH.applyAIConfig({ voiceVolume: 1.5 }, deps);
    expect(deps.setVoiceVolume).toHaveBeenCalledWith(1);
    deps.setVoiceVolume.mockClear();
    GH.applyAIConfig({ voiceVolume: -0.5 }, deps);
    expect(deps.setVoiceVolume).toHaveBeenCalledWith(0);
  });

  it('skips voice setters when value is NaN', () => {
    const deps = makeDeps();
    GH.applyAIConfig({ voiceSpeed: NaN, voiceVolume: NaN }, deps);
    expect(deps.setVoiceSpeed).not.toHaveBeenCalled();
    expect(deps.setVoiceVolume).not.toHaveBeenCalled();
  });
});

describe('applyAIConfig — language list management', () => {
  it("does NOT re-add a language already in selectedLanguages", () => {
    const deps = makeDeps({ selectedLanguages: ['Spanish'] });
    GH.applyAIConfig({ language: 'Spanish' }, deps);
    expect(deps.setSelectedLanguages).not.toHaveBeenCalled();
    // But it does set leveledTextLanguage
    expect(deps.setLeveledTextLanguage).toHaveBeenCalledWith('Spanish');
  });

  it('adds a new language when under the 4-language cap', () => {
    const deps = makeDeps({ selectedLanguages: ['Spanish', 'French'] });
    GH.applyAIConfig({ language: 'German' }, deps);
    expect(deps.setSelectedLanguages).toHaveBeenCalled();
  });

  it('does NOT add a language when at the 4-language cap', () => {
    const deps = makeDeps({ selectedLanguages: ['Spanish', 'French', 'German', 'Italian'] });
    GH.applyAIConfig({ language: 'Japanese' }, deps);
    expect(deps.setSelectedLanguages).not.toHaveBeenCalled();
  });
});

describe('applyAIConfig — change log', () => {
  it('returns a list of human-readable change descriptions', () => {
    const r = GH.applyAIConfig(
      { gradeLevel: '5', length: 'standard', tone: 'formal' },
      makeDeps(),
    );
    expect(r.length).toBeGreaterThanOrEqual(3);
    expect(r.some(s => s.includes('5th Grade'))).toBe(true);
    expect(r.some(s => s.toLowerCase().includes('250'))).toBe(true);
    expect(r.some(s => s.toLowerCase().includes('formal'))).toBe(true);
  });
});

// handleGenerateTermEtymology — per-locale root glosses.
//
// The renderer does `r.meaningByLang?.[lang] || r.meaning`, and r.meaning is
// English by definition. So when the model omits meaningByLang the Spanish
// column silently renders "servare LATÍN = to keep or watch" — the origin
// language localized (it has a hardcoded fallback table) but the gloss not.
// These tests pin the repair pass that closes that gap.

const GLOSSARY = (translations = { Spanish: 'Conservación' }) => ({
  id: 'g1',
  type: 'glossary',
  data: [{ term: 'Conservation', def: 'Careful management of the environment.', translations }],
});

// Runs the handler and returns the roots array it committed to state.
const runEtymology = async (deps) => {
  await GH.handleGenerateTermEtymology(0, 'Conservation', deps);
  const updater = deps.setGeneratedContent.mock.calls[0]?.[0];
  if (typeof updater !== 'function') return null;
  const next = updater(deps.generatedContent);
  return next.data[0].roots;
};

const ROOTS_NO_LOCALE = JSON.stringify({
  prosePerLanguage: { English: 'From Latin.', Spanish: 'Del latín.' },
  roots: [{ root: 'servare', lang: 'Latin', meaning: 'to keep or watch', related: ['preserve'] }],
});

describe('handleGenerateTermEtymology — per-locale root glosses', () => {
  it('repairs a missing meaningByLang instead of falling back to English', async () => {
    const callGemini = vi.fn()
      .mockResolvedValueOnce(ROOTS_NO_LOCALE)
      .mockResolvedValueOnce(JSON.stringify({
        0: { Spanish: { lang: 'latín', meaning: 'guardar o vigilar' } },
      }));
    const deps = makeDeps({
      generatedContent: GLOSSARY(),
      selectedLanguages: ['Spanish'],
      callGemini,
    });

    const roots = await runEtymology(deps);

    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(roots[0].meaningByLang.Spanish).toBe('guardar o vigilar');
    expect(roots[0].langByLocale.Spanish).toBe('latín');
    // English stays available for the English column.
    expect(roots[0].meaningByLang.English).toBe('to keep or watch');
    expect(roots[0].meaning).toBe('to keep or watch');
  });

  it('does not fire a repair call when the model already filled every locale', async () => {
    const callGemini = vi.fn().mockResolvedValueOnce(JSON.stringify({
      prosePerLanguage: { English: 'From Latin.', Spanish: 'Del latín.' },
      roots: [{
        root: 'servare',
        lang: 'Latin',
        meaning: 'to keep or watch',
        langByLocale: { English: 'Latin', Spanish: 'latín' },
        meaningByLang: { English: 'to keep or watch', Spanish: 'guardar o vigilar' },
      }],
    }));
    const deps = makeDeps({
      generatedContent: GLOSSARY(),
      selectedLanguages: ['Spanish'],
      callGemini,
    });

    const roots = await runEtymology(deps);

    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(roots[0].meaningByLang.Spanish).toBe('guardar o vigilar');
  });

  it('skips the repair entirely for an English-only glossary', async () => {
    const callGemini = vi.fn().mockResolvedValueOnce(ROOTS_NO_LOCALE);
    const deps = makeDeps({
      generatedContent: GLOSSARY({}),
      selectedLanguages: [],
      callGemini,
    });

    const roots = await runEtymology(deps);

    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(roots[0].meaning).toBe('to keep or watch');
  });

  it('still saves the etymology when the repair call fails', async () => {
    const callGemini = vi.fn()
      .mockResolvedValueOnce(ROOTS_NO_LOCALE)
      .mockRejectedValueOnce(new Error('429 rate limited'));
    const deps = makeDeps({
      generatedContent: GLOSSARY(),
      selectedLanguages: ['Spanish'],
      callGemini,
    });

    const roots = await runEtymology(deps);

    expect(roots[0].root).toBe('servare');
    expect(roots[0].meaningByLang.Spanish).toBeUndefined(); // renderer falls back, as before
    expect(deps.warnLog).toHaveBeenCalled();
    expect(deps.addToast).toHaveBeenCalledWith(expect.stringContaining('etymology_generated'), 'success');
  });

  it('survives unparseable repair JSON without losing the roots', async () => {
    const callGemini = vi.fn()
      .mockResolvedValueOnce(ROOTS_NO_LOCALE)
      .mockResolvedValueOnce('sorry, I cannot do that');
    const deps = makeDeps({
      generatedContent: GLOSSARY(),
      selectedLanguages: ['Spanish'],
      callGemini,
    });

    const roots = await runEtymology(deps);

    expect(roots).toHaveLength(1);
    expect(roots[0].meaning).toBe('to keep or watch');
    expect(deps.warnLog).toHaveBeenCalled();
  });

  it('asks the repair call only for the locales that are actually missing', async () => {
    const callGemini = vi.fn()
      .mockResolvedValueOnce(JSON.stringify({
        prosePerLanguage: { English: 'From Latin.', Spanish: 'Del latín.', French: 'Du latin.' },
        roots: [{
          root: 'servare',
          lang: 'Latin',
          meaning: 'to keep or watch',
          langByLocale: { Spanish: 'latín' },
          meaningByLang: { Spanish: 'guardar o vigilar' },
        }],
      }))
      .mockResolvedValueOnce(JSON.stringify({
        0: { French: { lang: 'latin', meaning: 'garder ou surveiller' } },
      }));
    const deps = makeDeps({
      generatedContent: GLOSSARY({ Spanish: 'Conservación', French: 'Conservation' }),
      selectedLanguages: ['Spanish', 'French'],
      callGemini,
    });

    const roots = await runEtymology(deps);

    const repairPrompt = callGemini.mock.calls[1][0];
    expect(repairPrompt).toContain('French');
    expect(repairPrompt).not.toMatch(/EVERY one of these languages:.*Spanish/);
    expect(roots[0].meaningByLang.French).toBe('garder ou surveiller');
    expect(roots[0].meaningByLang.Spanish).toBe('guardar o vigilar');
  });
});
