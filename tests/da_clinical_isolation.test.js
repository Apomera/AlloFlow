// DA CLINICAL ISOLATION — the invariant, enforced against the real dispatcher.
//
// A Dynamic Assessment probe measures one student's MODIFIABILITY on one
// construct. If a DA-generated support inherits the open lesson's topic,
// vocabulary, standards, roster differentiation or student interests, the
// support teaches outside content and the measure is confounded. That is a
// validity failure, not a cosmetic one.
//
// The defect this pins (found 2026-07-27): the DA host callbacks passed
// { isolatedContext: true } into handleGenerate under a comment promising it
// "suppresses ALL ambient lesson context", but the string `isolatedContext`
// appeared ZERO times in the dispatcher. The flag was passed and read by
// nobody, so every DA support silently inherited the ambient lesson.
//
// These tests drive the REAL handleGenerate with poisoned ambient deps and
// inspect the prompt that reaches callGemini. Each ambient channel is checked
// in BOTH directions: suppressed when isolated, still present when not — the
// second half is what proves the guard is conditional and that ordinary
// lesson generation was not broken to achieve isolation.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let dispatcher;

beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('generation_helpers_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  dispatcher = window.AlloModules?.GenDispatcher;
  if (!dispatcher || typeof dispatcher.handleGenerate !== 'function') {
    throw new Error('GenDispatcher.handleGenerate failed to register');
  }
});

// Distinctive tokens: if any of these reach the prompt in isolated mode, an
// ambient channel is still open.
const AMBIENT = {
  standards: 'ZZSTANDARDZZ',
  interest: 'ZZINTERESTZZ',
  concept: 'ZZCONCEPTZZ',
  dna: 'ZZLESSONDNAZZ',
  diff: 'ZZDIFFERENTIATIONZZ',
  topic: 'ZZSOURCETOPICZZ',
};
const DIRECTIVE = 'Order the four steps of the water cycle from memory.';

class PromptCaptured extends Error {}

// Everything the dispatcher destructures. Unlisted names fall back to a no-op
// function via the Proxy, which is enough to reach prompt construction.
const makeDeps = (over = {}) => {
  const captured = { prompts: [] };
  const explicit = {
    // ── the ambient channels under test ──
    standardsPromptString: AMBIENT.standards,
    studentInterests: [AMBIENT.interest],
    selectedConcepts: [AMBIENT.concept],
    persistedLessonDNA: { grade: '5th', topic: 'photosynthesis' },
    formatLessonDNA: () => AMBIENT.dna,
    getGroupDifferentiationContext: () => AMBIENT.diff,
    sourceTopic: AMBIENT.topic,
    timelineTopic: '',
    // ── inert scaffolding ──
    history: [],
    inputText: 'Water moves between the ground and the sky.',
    gradeLevel: '5th Grade',
    leveledTextLanguage: 'English',
    selectedLanguages: [],
    differentiationRange: 'None',
    visualStyle: 'Default',
    quizMcqCount: 5,
    outlineType: 'Standard Outline',
    isTeacherMode: true,
    isParentMode: false,
    isIndependentMode: false,
    dokLevel: 'Level 2',
    targetStandards: [],
    standardsInput: '',
    // The timeline branch reads these before building its prompt.
    timelineItemCount: 5,
    timelineMode: 'auto',
    timelineImageStyle: 'None',
    includeTimelineVisuals: false,
    TIMELINE_MODE_DEFINITIONS: {
      chronological: { label: 'Chronological', description: 'By time', examples: 'dates' },
    },
    LENGTH_THRESHOLDS: { short: 200, medium: 500, long: 900 },
    GUIDED_STEPS: [],
    // Capture the prompt, then abort so we never need a full generation.
    callGemini: vi.fn(async (prompt) => {
      captured.prompts.push(String(prompt));
      throw new PromptCaptured('captured');
    }),
    t: (k) => k,
    warnLog: () => {},
    debugLog: () => {},
    addToast: () => {},
    ...over,
  };
  // Unlisted deps fall back by NAME SHAPE. A blanket `() => ''` breaks the
  // moment someone adds a string-shaped dep (it did: universalImageStyle, added
  // by the UniversalSettingsPanel work, is `.trim()`ed in the dispatcher). The
  // dispatcher's deps are overwhelmingly setters/handlers (callable) or scalar
  // settings (string-ish), so split on the conventional prefixes.
  const CALLABLE = /^(set|handle|get|call|build|format|parse|validate|compute|generate|execute|apply|fetch|is|has|can|should|split|chunk|count|filter|detect|repair|reset|reverify|perform|normalize|sanitize|fix|extract|process|reg|flyTo|fisher)/;
  const deps = new Proxy(explicit, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop !== 'string') return undefined;
      if (CALLABLE.test(prop)) return () => '';
      if (/s$/.test(prop) && /^(selected|target|suggested)/.test(prop)) return [];
      return ''; // scalar setting — safe for .trim(), interpolation, comparisons
    },
    has: () => true,
  });
  return { deps, captured };
};

// Runs handleGenerate far enough to capture the prompt. Returns '' if the
// branch never reached callGemini (which the assertions then surface).
const promptFor = async (type, { isolated, extraCfg = {} } = {}) => {
  const cfg = { ...extraCfg };
  if (isolated) cfg.isolatedContext = true;
  const { deps, captured } = makeDeps();
  try {
    await dispatcher.handleGenerate(type, null, false, DIRECTIVE, cfg, false, deps);
  } catch (e) {
    if (!(e instanceof PromptCaptured)) {
      // Any other throw after capture is fine; before capture is a test bug.
      if (!captured.prompts.length) throw e;
    }
  }
  return captured.prompts.join('\n\n');
};

// The four tool types the DA support kinds actually route through.
const DA_TYPES = ['outline', 'timeline', 'concept-sort', 'sentence-frames'];

describe('DA clinical isolation — ambient context is suppressed', () => {
  it.each(DA_TYPES)('%s: no ambient lesson context reaches the prompt', async (type) => {
    const prompt = await promptFor(type, { isolated: true });
    expect(prompt.length).toBeGreaterThan(0); // guard against a vacuous pass
    for (const [channel, token] of Object.entries(AMBIENT)) {
      expect(prompt, `${type} leaked ${channel}`).not.toContain(token);
    }
  });

  it.each(DA_TYPES)('%s: the DA directive itself still drives generation', async (type) => {
    const prompt = await promptFor(type, { isolated: true });
    expect(prompt).toContain('water cycle');
  });
});

describe('DA clinical isolation — ordinary generation is unchanged', () => {
  // Each of these pins a channel that was verified leaking. If a case here
  // fails, isolation was achieved by breaking normal lesson generation.
  const EXPECTED = {
    outline: ['standards', 'diff'],
    'sentence-frames': ['standards', 'interest', 'diff'],
    timeline: ['diff'],
    'concept-sort': ['concept'],
  };

  it.each(Object.keys(EXPECTED))('%s: ambient context still flows when NOT isolated', async (type) => {
    const prompt = await promptFor(type, { isolated: false });
    expect(prompt.length).toBeGreaterThan(0);
    for (const channel of EXPECTED[type]) {
      expect(prompt, `${type} lost ${channel} in normal generation`).toContain(AMBIENT[channel]);
    }
  });
});

describe('DA clinical isolation — the flag is actually wired', () => {
  it('the dispatcher reads isolatedContext at all', () => {
    // The original defect was precisely that it did not.
    const src = readFileSync(resolve(process.cwd(), 'generate_dispatcher_source.jsx'), 'utf8');
    expect(src).toContain('configOverride.isolatedContext');
    expect(src).toContain('_isolatedContext');
  });

  it.each(['generate_dispatcher_source.jsx', 'generate_dispatcher_module.js',
           'desktop/web-app/public/generate_dispatcher_module.js'])(
    '%s carries the guard', (file) => {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(src).toContain('_isolatedContext');
      // Every ambient channel must be suppressed at its computation point.
      expect(src).toMatch(/_isolatedContext \? '' : _ambientStandardsPromptString/);
      expect(src).toMatch(/_isolatedContext \? \[\] : _ambientSelectedConcepts/);
      expect(src).toMatch(/_isolatedContext \? \[\] : _ambientStudentInterests/);
      expect(src).toMatch(/_isolatedContext \? '' : formatLessonDNA/);
      expect(src).toMatch(/_isolatedContext \? '' : getGroupDifferentiationContext/);
    });

  it.each(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt',
           'desktop/web-app/src/App.jsx'])(
    '%s still wires the extracted DA host adapter', (file) => {
      const host = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(host).toContain('DA && DA.HostAdapter');
      expect(host).toContain('DynamicAssessment: DA');
      expect(host).toMatch(/host:\s*\{[\s\S]{0,1600}\bhandleGenerate,/);
      expect(host).not.toContain('onGenerateVisualOrganizer: async');
      expect(host).not.toContain('onGenerateSentenceFrames: async');
    });

  it.each(['dynamic_assessment_module.js',
           'desktop/web-app/public/dynamic_assessment_module.js'])(
    '%s keeps each extracted callback clinically isolated', (file) => {
      const adapter = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(adapter).toContain('function DynamicAssessmentHostAdapter(props)');
      expect(adapter).toContain('DynamicAssessment.HostAdapter = DynamicAssessmentHostAdapter');

      const visualStart = adapter.indexOf('onGenerateVisualOrganizer: async');
      const sentenceComment = adapter.indexOf('// Sentence-frames host callback', visualStart);
      const sentenceStart = adapter.indexOf('onGenerateSentenceFrames: async', sentenceComment);
      const resourceStart = adapter.indexOf('onOpenResource:', sentenceStart);
      expect(visualStart).toBeGreaterThan(-1);
      expect(sentenceComment).toBeGreaterThan(visualStart);
      expect(sentenceStart).toBeGreaterThan(sentenceComment);
      expect(resourceStart).toBeGreaterThan(sentenceStart);
      const visualCallback = adapter.slice(visualStart, sentenceComment);
      expect(visualCallback).toMatch(/const cfg\s*=\s*\{\s*isolatedContext:\s*true\s*\}/);
      expect(visualCallback).toMatch(/handleGenerate\([\s\S]*?\bcfg\b[\s\S]*?\)/);
      expect(adapter.slice(sentenceStart, resourceStart)).toMatch(/handleGenerate\([\s\S]*isolatedContext:\s*true/);
    });
});
