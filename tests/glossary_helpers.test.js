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
