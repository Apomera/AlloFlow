// STEM Solver, sidebar Generate (2026-11-18): Spiral Review and Difficulty Ladder went to the single-problem tutor
// prompt and ignored the problem count, so a teacher asking for a 6-problem spiral got one worked problem. They now
// take the problem set path with the count box and their own ordering rules.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

beforeAll(() => { loadAlloModule('generation_helpers_module.js'); });

async function promptFor(mode, quantity, input) {
  const callGemini = vi.fn(async () => JSON.stringify({ title: 'x', problems: [
    { question: '2 + 3', expression: '2 + 3', answer: '5', skill: 'adding', difficulty: 'easy' },
    { question: '7 - 4', expression: '7 - 4', answer: '3', skill: 'subtracting', difficulty: 'medium' },
  ] }));
  let content = null;
  await window.AlloModules.GenerationHelpers.handleGenerateMath(null, true, null, {
    mathInput: input, history: [], inputText: '', useMathSourceContext: false, studentInterests: [], gradeLevel: '3',
    mathMode: mode, mathSubject: 'Math', mathQuantity: quantity, autoAttachManipulatives: false, leveledTextLanguage: 'English',
    translationMode: 'off', currentUiLanguage: 'English', isMathGraphEnabled: false, autoSnapshotManipulatives: false,
    setIsProcessing: vi.fn(), setGenerationStep: vi.fn(), setGenerationStage: vi.fn(), setError: vi.fn(), setActiveView: vi.fn(),
    setShowMathAnswers: vi.fn(), setGeneratedContent: (v) => { content = typeof v === 'function' ? v(content) : v; },
    setHistory: vi.fn(), setToolSnapshots: vi.fn(), addToast: vi.fn(), t: (k) => k, callGemini, cleanJson: (v) => v,
    safeJsonParse: JSON.parse, warnLog: vi.fn(), flyToElement: vi.fn(),
  });
  return { prompt: String(callGemini.mock.calls[0][0]), content };
}

describe('Spiral Review and Difficulty Ladder make problem sets from the sidebar', () => {
  it('Spiral Review asks for the count in the box, mixing the listed skills', async () => {
    const { prompt, content } = await promptFor('Spiral Review', 6, 'adding fractions, subtracting fractions');
    expect(prompt).toContain('Create EXACTLY 6 problems');
    expect(prompt).toContain('SPIRAL REVIEW');
    expect(prompt).toContain('never place two problems on the same skill next to each other');
    expect(prompt).toContain('"title": "Spiral Review: ');
    expect(prompt).toContain('"skill": "skill name"');
    expect(prompt).not.toContain('Expert Math & Science Tutor');
    expect(content && content.data && content.data.problems.length).toBe(2);
  });
  it('Difficulty Ladder asks for easiest to hardest, ending on a stretch problem', async () => {
    const { prompt } = await promptFor('Difficulty Ladder', 8, 'two-digit addition');
    expect(prompt).toContain('Create EXACTLY 8 problems');
    expect(prompt).toContain('DIFFICULTY LADDER');
    expect(prompt).toContain('end with one stretch problem');
    expect(prompt).toContain('"difficulty": "easy | medium | hard | stretch"');
    expect(prompt).not.toContain('Expert Math & Science Tutor');
  });
  it('a plain problem set is unchanged, and Step-by-Step still explains one problem', async () => {
    const set = await promptFor('Problem Set Generator', 4, 'area of rectangles');
    expect(set.prompt).toContain('Create EXACTLY 4 problems');
    expect(set.prompt).toContain('"title": "Problem Set: ');
    expect(set.prompt).not.toMatch(/SPIRAL REVIEW|DIFFICULTY LADDER|"skill": "skill name"/);
    const one = await promptFor('Step-by-Step', 4, '3x + 2 = 11');
    expect(one.prompt).toContain('Expert Math & Science Tutor');
  });
});
