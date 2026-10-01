// Test Prep hands-free — explanations must be complete, and optional.
//
// Two reported problems:
//   1. Explanations were CUT SHORT. testPrepSpeechExcerpt clipped the selected
//      option's feedback at 320 characters and each other option's at 240, then
//      appended a literal "..." mid-sentence. A hands-free learner cannot glance
//      at the screen to recover the rest, so the clipped half was simply lost.
//   2. There was no way to decline them. Checking an answer always read the full
//      explanation, and "explain" was not a command at all -- it fell into the
//      clarify catch-all and fired an AI round-trip instead of replaying this
//      item's own written rationale.
//
// The note COUNT bound is intentionally NOT relaxed here: released items carry
// exactly four choices (the non-EPPP QA reviewer fails anything else), so at most
// two "other" notes can exist and the cap cannot fire in production.

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

// A realistic released item: exactly four choices, long prose in every slot.
const LONG = (tag) => tag + ' ' + 'clause '.repeat(80) + 'ending sentence.';
const item = () => ({
  answerIndex: 1,
  choices: ['Choice A', 'Choice B', 'Choice C', 'Choice D'],
  rationale: LONG('The controlling rationale'),
  choiceRationales: [LONG('A feedback'), LONG('B feedback'), LONG('C feedback'), LONG('D feedback')],
});

describe('hands-free explanations — completeness', () => {
  it('never clips the explanation mid-sentence by default', () => {
    const speech = Hub.feedbackSpeechText(item(), 0, 'guided');
    expect(speech).not.toContain('...');
    expect(speech).toContain(LONG('The controlling rationale'));
    expect(speech).toContain(LONG('A feedback'));
  });

  it('defaults to the full reading when no detail is given', () => {
    expect(Hub.feedbackSpeechText(item(), 0, 'guided')).toBe(Hub.feedbackSpeechText(item(), 0, 'guided', 'full'));
  });

  it('still offers the old clipped pass explicitly as brief', () => {
    const brief = Hub.feedbackSpeechText(item(), 0, 'guided', 'brief');
    expect(brief).toContain('...');
    expect(brief.length).toBeLessThan(Hub.feedbackSpeechText(item(), 0, 'guided', 'full').length);
  });

  it('reads every other-option note for a real four-choice item', () => {
    // Selected A, supported B, so C and D are the only "other" notes and both
    // must be read in full. Nothing may be announced as withheld.
    const speech = Hub.feedbackSpeechText(item(), 0, 'guided', 'full');
    expect(speech).toContain(LONG('C feedback'));
    expect(speech).toContain(LONG('D feedback'));
    expect(speech).not.toMatch(/additional option note/);
  });
});

describe('hands-free explanations — opting out', () => {
  it('gives a short verdict and says how to hear the rest', () => {
    const speech = Hub.feedbackSpeechText(item(), 0, 'guided', 'none');
    expect(speech).toContain('The supported answer is B');
    expect(speech).toMatch(/say explain to hear why/i);
    expect(speech).not.toContain(LONG('The controlling rationale'));
    expect(speech.length).toBeLessThan(200);
  });

  it('still names the verdict correctly when the learner was right', () => {
    expect(Hub.feedbackSpeechText(item(), 1, 'guided', 'none')).toMatch(/^Correct\./);
  });
});

describe('hands-free explanations — commands', () => {
  const parse = (text) => Hub.parseHandsFreeCommand(text, {});

  it('routes a bare "explain" to the item rationale, not the AI clarifier', () => {
    // This is the regression that matters: the clarify catch-all matches
    // /^(?:...|explain|...|why|...)\b/, so without an earlier rule "explain"
    // and "why is that" silently became AI questions.
    for (const phrase of ['explain', 'explain that', 'explain the answer', 'tell me why', 'why is that']) {
      expect(parse(phrase).type, phrase).toBe('explain');
    }
  });

  it('leaves real clarification questions with the clarifier', () => {
    for (const phrase of ['explain photosynthesis', 'why do cells divide', 'what is mitosis', 'ask what a p value means']) {
      expect(parse(phrase).type, phrase).toBe('clarify');
    }
  });

  it('turns explanations on', () => {
    for (const phrase of ['listen', 'listen to explanations', 'explanations on', 'turn on explanations', 'always explain']) {
      const command = parse(phrase);
      expect(command.type, phrase).toBe('explanations');
      expect(command.explanations, phrase).toBe('on');
    }
  });

  it('turns explanations off', () => {
    for (const phrase of ['skip explanations', 'explanations off', 'no explanations', "don't explain", 'stop explaining']) {
      const command = parse(phrase);
      expect(command.type, phrase).toBe('explanations');
      expect(command.explanations, phrase).toBe('off');
    }
  });

  it('does not shadow the existing answer and navigation commands', () => {
    expect(parse('check answer').type).toBe('submit');
    expect(parse('next question').type).toBe('next');
    expect(parse('repeat explanation').type).toBe('repeat-feedback');
    expect(parse('b').type).toBe('choose');
  });

  it('advertises the new commands in help', () => {
    const help = Hub.handsFreeHelpText('practice', true);
    expect(help).toContain('explain');
    expect(help).toContain('skip explanations');
    // Simulation has no explanation step, so it must not promise one.
    expect(Hub.handsFreeHelpText('simulation', true)).not.toContain('skip explanations');
  });
});
