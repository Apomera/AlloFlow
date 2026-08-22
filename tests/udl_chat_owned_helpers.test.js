import { describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

loadAlloModule('udl_chat_module.js');

const {
  generateStandardChatResponse,
  modifyBlueprintWithAI,
} = window.AlloModules.UdlChat;

describe('UDL Chat-owned helpers', () => {
  it('normalizes legacy blueprint edits into the canonical ordered resourcePlan', async () => {
    const current = {
      resourcePlan: [
        { tool: 'analysis', directive: 'Analyze' },
        { tool: 'glossary', directive: 'Vocabulary' },
        { tool: 'lesson-plan', directive: 'Synthesize' },
      ],
      recommendedResources: ['analysis', 'glossary', 'lesson-plan'],
      toolDirectives: { analysis: 'Analyze', glossary: 'Vocabulary', 'lesson-plan': 'Synthesize' },
      lessonDNA: { essentialQuestion: 'How do systems change?' },
    };
    const edited = {
      ...current,
      recommendedResources: ['quiz', 'analysis', 'lesson-plan'],
      toolDirectives: { quiz: 'Check transfer', analysis: 'Analyze', 'lesson-plan': 'Synthesize' },
    };
    const callGemini = vi.fn(async () => JSON.stringify(edited));
    const cleanJson = vi.fn(value => value);

    const result = await modifyBlueprintWithAI(current, 'replace the glossary with a quiz', {
      callGemini,
      cleanJson,
      warnLog: vi.fn(),
    });

    expect(callGemini).toHaveBeenCalledWith(expect.stringContaining('replace the glossary with a quiz'), true);
    expect(result.resourcePlan).toEqual([
      { tool: 'analysis', directive: 'Analyze' },
      { tool: 'quiz', directive: 'Check transfer' },
      { tool: 'lesson-plan', directive: 'Synthesize' },
    ]);
    expect(result.recommendedResources).toEqual(['analysis', 'quiz', 'lesson-plan']);
    expect(result.lessonDNA).toEqual(current.lessonDNA);
  });

  it('fails closed to the current blueprint when revision output is unavailable', async () => {
    const current = { resourcePlan: [{ tool: 'analysis', directive: '' }] };
    const warnLog = vi.fn();

    await expect(modifyBlueprintWithAI(current, 'add a quiz', {
      callGemini: vi.fn(async () => { throw new Error('offline'); }),
      cleanJson: value => value,
      warnLog,
    })).resolves.toBe(current);
    expect(warnLog).toHaveBeenCalledWith('Blueprint modification failed', expect.any(Error));
  });

  it('builds a contextual coaching prompt and appends actionable advice', async () => {
    let messages = [{ role: 'user', text: 'How can I teach this?' }];
    const callGemini = vi.fn(async () => '**Strategy: Retrieval**\n- **Action:** Ask students to explain the cycle.');

    await generateStandardChatResponse('Please suggest a strategy', {
      udlMessages: messages,
      history: [{
        type: 'analysis',
        title: 'Water cycle analysis',
        data: { originalText: 'Water evaporates, condenses, and returns as precipitation.' },
      }],
      inputText: 'Stale editor text',
      isParentMode: false,
      isIndependentMode: false,
      currentUiLanguage: 'English',
      gradeLevel: '5th Grade',
      getGroupDifferentiationContext: () => '- Group context: mixed readiness',
      callGemini,
      setUdlMessages: update => { messages = typeof update === 'function' ? update(messages) : update; },
      warnLog: vi.fn(),
    });

    const prompt = callGemini.mock.calls[0][0];
    expect(prompt).toContain('Water evaporates, condenses, and returns as precipitation.');
    expect(prompt).toContain('Group context: mixed readiness');
    expect(prompt).toContain('User: Please suggest a strategy');
    expect(messages.at(-1)).toMatchObject({ role: 'model', isActionable: true });
  });

  it('contains chat-generation failures without adding a false response', async () => {
    let messages = [];
    const warnLog = vi.fn();

    await expect(generateStandardChatResponse('Help', {
      udlMessages: [],
      history: [],
      inputText: '',
      isParentMode: false,
      isIndependentMode: true,
      currentUiLanguage: 'English',
      gradeLevel: 'Adult',
      getGroupDifferentiationContext: () => '',
      callGemini: vi.fn(async () => { throw new Error('throttled'); }),
      setUdlMessages: update => { messages = typeof update === 'function' ? update(messages) : update; },
      warnLog,
    })).resolves.toBeUndefined();
    expect(messages).toEqual([]);
    expect(warnLog).toHaveBeenCalledWith('Unhandled error in generateStandardChatResponse:', expect.any(Error));
  });
});
