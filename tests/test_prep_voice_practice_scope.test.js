import fs from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Hub;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [value, () => {}],
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
});

describe('Test Prep platform practice voice boundary', () => {
  it('maps only narration and status phrases to direct platform commands', () => {
    expect(Hub.parsePracticeVoiceCommand('read question')).toEqual({
      commandId: 'practice_read_question',
      params: {},
    });
    expect(Hub.parsePracticeVoiceCommand('read choices')).toEqual({
      commandId: 'practice_read_choices',
      params: {},
    });
    expect(Hub.parsePracticeVoiceCommand('read option C')).toEqual({
      commandId: 'practice_read_option',
      params: { choiceIndex: 2 },
    });
    expect(Hub.parsePracticeVoiceCommand('repeat feedback')).toEqual({
      commandId: 'practice_repeat_feedback',
      params: {},
    });
    expect(Hub.parsePracticeVoiceCommand('status')).toEqual({
      commandId: 'practice_status',
      params: {},
    });
  });

  it.each([
    ['B', 'choose'],
    ['submit', 'submit'],
    ['next question', 'next'],
    ['save this question for review', 'save-review'],
    ['add ten minutes', 'add-time'],
    ['ask what does safeguard mean', 'clarify'],
    ['exit Test Prep', 'exit'],
    ['choose practice set 2', 'choose-practice-set'],
    ['start practice', 'start-practice'],
    ['start practice with hands free', 'start-practice-hands-free'],
  ])('intercepts state-changing phrase %s before global command fallthrough', (phrase, requestedAction) => {
    expect(Hub.parsePracticeVoiceCommand(phrase)).toEqual({
      commandId: 'practice_start_hands_free_required',
      params: { requestedAction },
    });
  });

  it('leaves only non-destructive setup and platform voice-control grammar with their owning scopes', () => {
    expect(Hub.parsePracticeVoiceCommand('list practice sets')).toBeNull();
    expect(Hub.parsePracticeVoiceCommand('start hands free')).toBeNull();
    expect(Hub.parsePracticeVoiceCommand('stop hands free')).toBeNull();
    expect(Hub.parsePracticeVoiceCommand('yes')).toBeNull();
    expect(Hub.parsePracticeVoiceCommand('slower')).toBeNull();
  });

  it('registers a phase-aware, content-private, local-speech-free priority scope', () => {
    const source = fs.readFileSync(resolve(process.cwd(), 'test_prep_hub_source.jsx'), 'utf8');
    const snapshot = source.match(/testPrepPracticeVoiceRef\.current = \{([\s\S]*?)\n  \};/);
    expect(snapshot).not.toBeNull();
    expect(snapshot[1]).not.toMatch(/prompt\s*:|choices\s*:|rationale\s*:|answerIndex\s*:/);
    const publicState = source.match(/getState: \(\) => \{\n        const state = testPrepPracticeVoiceRef\.current \|\| \{\};\n        return \{([\s\S]*?)\n        \};/);
    expect(publicState).not.toBeNull();
    expect(publicState[1]).toContain('hasSelection:');
    expect(publicState[1]).toContain('hasPendingConfirmation:');
    expect(publicState[1]).not.toMatch(/packId|itemId|selectedChoice:|pendingConfirmation:/);
    expect(source).toContain("id: 'test-prep-practice'");
    expect(source).toMatch(/id: 'test-prep-practice',[\s\S]{0,80}priority: 100/);
    expect(source).toContain("state.phase !== 'question' && state.phase !== 'feedback'");
    expect(source).toContain("state.phase === 'feedback' && checked && currentItem");
    const scope = source.slice(source.indexOf("id: 'test-prep-practice'"), source.indexOf('}, [isOpen, handsFreeEnabled', source.indexOf("id: 'test-prep-practice'")));
    expect(scope).toContain('!handsFreeEnabledRef.current');
    expect(scope).not.toContain('speakTestPrepText(');
    expect(source).not.toMatch(/\[isOpen, handsFreeEnabled[^\]]*timeRemainingSeconds/);
    expect(source).toContain('const replacesActivePractice =');
    expect(source).toContain('replacesActivePractice && currentItem && !result');
    expect(source).toContain('Finish or exit this practice before choosing or starting another set.');
  });
});
