import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let Hub;
beforeAll(() => {
  window.React = window.React || { useState: (value) => [value, () => {}], useEffect: () => {}, useRef: (value) => ({ current: value }), createElement: () => null, Fragment: 'fragment' };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
});

describe('Test Prep hands-free contracts', () => {
  const item = {
    id: 'voice-item',
    prompt: 'Which response best protects the learner?',
    choices: ['Ignore the issue', 'Use the approved safeguard', 'Wait indefinitely', 'Remove all supports', 'Escalate publicly'],
    answerIndex: 1,
    rationale: 'The approved safeguard addresses the risk while preserving access.',
  };

  it('builds complete, position-aware narration for every available option', () => {
    const speech = Hub.questionSpeechText(item, 2, 10);
    expect(speech).toContain('Question 3 of 10.');
    expect(speech).toContain('A, Ignore the issue');
    expect(speech).toContain('E, Escalate publicly');
    expect(speech).toContain('Say choose A, B, C, D, or E.');
  });

  it('routes deterministic answer, navigation, rate, help, and clarification commands', () => {
    expect(Hub.parseHandsFreeCommand('choose option B')).toMatchObject({ type: 'choose', choiceIndex: 1 });
    expect(Hub.parseHandsFreeCommand('select fifth')).toMatchObject({ type: 'choose', choiceIndex: 4 });
    expect(Hub.parseHandsFreeCommand('check answer').type).toBe('submit');
    expect(Hub.parseHandsFreeCommand('next question').type).toBe('next');
    expect(Hub.parseHandsFreeCommand('repeat explanation').type).toBe('repeat-feedback');
    expect(Hub.parseHandsFreeCommand('slow down').type).toBe('slower');
    expect(Hub.parseHandsFreeCommand('ask what does safeguard mean?')).toMatchObject({ type: 'clarify', query: 'what does safeguard mean?' });
    expect(Hub.parseHandsFreeCommand('stop hands free').type).toBe('stop');
    expect(Hub.parseHandsFreeCommand('pick something for me').type).toBe('unknown');
  });

  it('keeps pre-answer AI clarification answer-blind and unlocks sourced feedback only after checking', () => {
    const before = Hub.buildClarificationPrompt(item, 'What does safeguard mean?', false, null);
    expect(before).toContain('Clarify wording, vocabulary, or task directions only.');
    expect(before).toContain('Do not identify, hint at, eliminate, rank');
    expect(before).not.toContain(item.rationale);
    expect(before).not.toContain('B. Use the approved safeguard');
    expect(before).not.toContain('Supported option:');
    const after = Hub.buildClarificationPrompt(item, 'Why was my answer not supported?', true, 0);
    expect(after).toContain('Selected option: A. Supported option: B.');
    expect(after).toContain(item.rationale);
  });

  it('ships low-priority three-question prewarm and timed-simulation coaching locks', () => {
    const source = fs.readFileSync(resolve(process.cwd(), 'test_prep_hub_source.jsx'), 'utf8');
    const host = fs.readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    expect(source).toContain('for (let offset = 1; offset <= 3; offset += 1)');
    expect(source).toContain("priority: 'low', reason: 'test-prep-prewarm'");
    expect(source).toContain("practiceMode === 'simulation'");
    expect(source).toContain('AI content clarification is locked during a timed simulation.');
    expect(source).toContain("window.__alloVoiceLoop.isActive()");
    expect(host).toMatch(/moduleKey="TestPrepHub"[\s\S]{0,500}callTTS,[\s\S]{0,120}callGemini,[\s\S]{0,120}selectedVoice,/);
  });

  it('normalizes and preserves assisted-item audit metadata without conflating narration', () => {
    const pack = Hub.listPacks().find((entry) => entry.id === 'workplace-safety-foundations-demo');
    const itemIds = pack.items.slice(0, 2).map((entry) => entry.id);
    const answers = Object.fromEntries(pack.items.map((entry) => [entry.id, entry.answerIndex]));
    const progress = Hub.recordAttempt({ attempts: [] }, pack, answers, {}, 1234, { itemIds, assistedItemIds: [itemIds[0], itemIds[0]] });
    expect(progress.attempts[0].assistedItemIds).toEqual([itemIds[0]]);
    expect(Hub.normalizeProgress(progress).attempts[0].assistedItemIds).toEqual([itemIds[0]]);
  });
});
