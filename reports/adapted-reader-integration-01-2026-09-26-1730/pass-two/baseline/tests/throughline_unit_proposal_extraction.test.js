import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupThroughline } from './helpers/throughline_harness.js';

function proposalApi() {
  const Throughline = setupThroughline();
  expect(Throughline.proposeUnit).toBeTypeOf('function');
  return Throughline.proposeUnit;
}

function capabilities(overrides) {
  return Object.assign({
    gradeLevel: 'Grade 5',
    formatToolCatalogInline: vi.fn(() => 'CUSTOM TOOL CATALOG'),
    callGemini: vi.fn(),
    cleanJson: vi.fn((value) => value),
    warnLog: vi.fn(),
  }, overrides || {});
}

describe('Learning Web unit proposal extraction', () => {
  it('preserves the prompt contract and bounds every model-controlled field', async () => {
    const proposeUnit = proposalApi();
    const lessons = Array.from({ length: 9 }, (_unused, index) => ({
      title: index === 0 ? 'T'.repeat(150) : 'Lesson ' + (index + 1),
      objective: index === 0 ? 'O'.repeat(450) : 'Objective ' + (index + 1),
      focus: index === 0 ? 'F'.repeat(450) : 'Focus ' + (index + 1),
      suggestedResourceTypes: index === 0
        ? ['quiz', 'quiz', 'not-a-tool', 'analysis', 'lesson-plan', 'glossary', 'faq', 'image', 'timeline']
        : (index === 1 ? ['not-a-tool'] : ['analysis']),
    }));
    const modelProposal = {
      title: 'U'.repeat(180),
      essentialQuestion: 'E'.repeat(350),
      gradeBand: '',
      desiredResults: ['d1', 'd2', 'd3', 'd4', 'd5'],
      goldenThread: Array.from({ length: 14 }, (_unused, index) => 'g' + index),
      keyTerms: Array.from({ length: 22 }, (_unused, index) => 'k' + index),
      sourceConfig: {
        lengthWords: 2000,
        tone: 'Unsupported tone',
        readingLevel: 'R'.repeat(60),
      },
      lessons,
    };
    const deps = capabilities({
      callGemini: vi.fn(async () => JSON.stringify(modelProposal)),
    });
    const input = {
      topic: 'Earth systems',
      gradeLevel: 'Grade 7',
      standards: 'NGSS MS-ESS2-4',
      lessonCount: 99,
      tone: 'Persuasive',
      notes: 'Use local examples.',
      sourceText: 'S'.repeat(4100) + 'SOURCE_TAIL_MUST_BE_TRUNCATED',
    };

    const result = await proposeUnit(input, deps);

    expect(deps.callGemini).toHaveBeenCalledTimes(1);
    const [prompt, jsonMode] = deps.callGemini.mock.calls[0];
    expect(jsonMode).toBe(true);
    expect(prompt).toContain('- Grade band: Grade 7');
    expect(prompt).toContain('- Desired lessons: 8');
    expect(prompt).toContain('Produce exactly 8 lessons.');
    expect(prompt).toContain('CUSTOM TOOL CATALOG');
    expect(prompt).not.toContain('SOURCE_TAIL_MUST_BE_TRUNCATED');
    expect(deps.formatToolCatalogInline).toHaveBeenCalledTimes(1);
    expect(deps.cleanJson).toHaveBeenCalledTimes(1);

    expect(result.lessons).toHaveLength(8);
    expect(result.lessons[0].title).toHaveLength(120);
    expect(result.lessons[0].objective).toHaveLength(400);
    expect(result.lessons[0].focus).toHaveLength(400);
    expect(result.lessons[0].suggestedResourceTypes).toEqual([
      'quiz', 'analysis', 'lesson-plan', 'glossary', 'faq', 'image',
    ]);
    expect(result.lessons[1].suggestedResourceTypes).toEqual(['analysis', 'glossary', 'lesson-plan']);
    expect(result.lessons.every((lesson) => lesson.sourceStrategy === 'shared')).toBe(true);
    expect(result.title).toHaveLength(140);
    expect(result.essentialQuestion).toHaveLength(300);
    expect(result.gradeBand).toBe('Grade 7');
    expect(result.desiredResults).toEqual(['d1', 'd2', 'd3', 'd4']);
    expect(result.goldenThread).toHaveLength(12);
    expect(result.keyTerms).toHaveLength(20);
    expect(result.sourceConfig).toEqual({
      lengthWords: 1500,
      tone: 'Persuasive',
      readingLevel: 'R'.repeat(40),
    });
  });

  it('retains catalog, grade, resource, and source defaults', async () => {
    const proposeUnit = proposalApi();
    const deps = capabilities({
      gradeLevel: 'Grade 5',
      formatToolCatalogInline: null,
      callGemini: vi.fn(async () => JSON.stringify({
        title: '',
        essentialQuestion: null,
        gradeBand: '',
        desiredResults: null,
        goldenThread: null,
        keyTerms: null,
        sourceConfig: { lengthWords: 50, tone: 'Dialogue', readingLevel: '' },
        lessons: [{ title: '', objective: null, focus: null, suggestedResourceTypes: null }],
      })),
    });

    const result = await proposeUnit({ topic: 'Migration', lessonCount: 1, tone: 'Unsupported' }, deps);
    const prompt = deps.callGemini.mock.calls[0][0];

    expect(prompt).toContain('- Desired lessons: 2');
    expect(prompt).toContain('analysis, simplified, glossary, outline');
    expect(result).toMatchObject({
      title: 'Migration',
      essentialQuestion: '',
      gradeBand: 'Grade 5',
      desiredResults: [],
      goldenThread: [],
      keyTerms: [],
      sourceConfig: { lengthWords: 100, tone: 'Dialogue', readingLevel: 'Grade 5' },
    });
    expect(result.lessons[0]).toEqual({
      title: 'Lesson',
      objective: '',
      focus: '',
      suggestedResourceTypes: ['analysis', 'glossary', 'lesson-plan'],
      sourceStrategy: 'shared',
    });
  });

  it('logs and rejects an empty model proposal', async () => {
    const proposeUnit = proposalApi();
    const deps = capabilities({
      callGemini: vi.fn(async () => '{"lessons":[]}'),
    });

    await expect(proposeUnit({ topic: 'Weather' }, deps)).rejects.toThrow('empty proposal');
    expect(deps.warnLog).toHaveBeenCalledWith('onProposeUnit failed', expect.any(Error));
  });

  it('keeps a thin host bridge across all canonical shells', () => {
    const hostSources = [
      'AlloFlowANTI.txt',
      'desktop/web-app/src/App.jsx',
      'desktop/web-app/src/AlloFlowANTI.txt',
    ].map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'));
    const moduleSource = readFileSync(resolve(process.cwd(), 'mind_map_module.js'), 'utf8');
    const publicModule = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/mind_map_module.js'), 'utf8');

    for (const host of hostSources) {
      const start = host.indexOf('const onProposeUnit = async');
      const end = host.indexOf('const onGenerateUnitLesson = async', start);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeGreaterThan(start);
      const bridge = host.slice(start, end);
      expect(bridge).toContain('_mindMapModule.proposeUnit(input');
      expect(bridge).not.toContain('callGemini(');
      expect(bridge).not.toContain('_UNIT_KNOWN_TYPES');
      expect(bridge).not.toContain('Return ONLY valid JSON');
    }
    expect(moduleSource).toContain('async function proposeUnit(input, dependencies)');
    expect(moduleSource).toContain('ThroughlineModal.proposeUnit = proposeUnit;');
    expect(publicModule).toBe(moduleSource);
  });
});
