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
    expect(help).toContain('check or check answer');
    // Simulation has no explanation step, so it must not promise one.
    expect(Hub.handsFreeHelpText('simulation', true)).not.toContain('skip explanations');
  });

  it('accepts natural conversational hands-free responses including bare check and polite wrappers', () => {
    for (const phrase of [
      'check', 'check it', 'check that', 'check my answer', 'check the answer',
      'check please', 'please check', 'okay check', 'ok check answer',
      'submit', 'submit it', 'submit my answer', 'confirm answer', 'confirm my answer',
      'grade', 'grade it', 'verify', 'verify my answer', 'lock it in', 'lock in',
      'final answer', 'am i right', 'is that right', 'did i get it right',
    ]) {
      expect(parse(phrase).type, phrase).toBe('submit');
    }

    for (const [phrase, expectedIdx] of [
      ['letter B', 1], ['choice C', 2], ['number 2', 1], ['answer A', 0],
      ['my answer is D', 3], ['I think B', 1], ["I think it's C", 2], ["it's A", 0],
      ['okay option bee', 1], ['choose sea', 2], ['go with dee', 3], ['switch to B', 1],
      ['please pick 4', 3], ['um B', 1],
    ]) {
      expect(parse(phrase), phrase).toMatchObject({ type: 'choose', choiceIndex: expectedIdx });
    }

    for (const phrase of ['next', 'next one', 'move on', 'go on', 'keep going', 'proceed', 'advance', 'done', 'okay next']) {
      expect(parse(phrase).type, phrase).toBe('next');
    }
    for (const phrase of ['why', 'explanation', 'rationale', 'reasoning', 'explain why', 'why is that right', 'why is it wrong']) {
      expect(parse(phrase).type, phrase).toBe('explain');
    }
    for (const phrase of ['again', 'one more time', 'reread question', 'what is the question']) {
      expect(parse(phrase).type, phrase).toBe('repeat-question');
    }
    for (const phrase of ['choices', 'options', 'read options', 'list choices']) {
      expect(parse(phrase).type, phrase).toBe('repeat-choices');
    }
    expect(parse('knew it')).toMatchObject({ type: 'confidence', confidence: 'sure' });
    expect(parse('not sure')).toMatchObject({ type: 'confidence', confidence: 'unsure' });
    expect(parse('took a guess')).toMatchObject({ type: 'confidence', confidence: 'guess' });
    expect(parse('flag it').type).toBe('save-review');
    expect(parse('clear flag').type).toBe('remove-review');
    expect(parse('too fast').type).toBe('slower');
    expect(parse('too slow').type).toBe('faster');

    // Guardrails: negatives and real clarification queries still stay safe.
    expect(parse("don't choose B").type).toBe('unknown');
    expect(parse('pick something for me').type).toBe('unknown');
    expect(parse('what does option C mean?').type).toBe('clarify');
    expect(parse('why do cells divide').type).toBe('clarify');
  });
});

describe('hands-free explanations — deduplication on correct answers', () => {
  it('never repeats the explanation twice when the learner answers correctly', () => {
    const rationaleText = 'Thiamine deficiency impairs mammillary bodies and produces Wernicke-Korsakoff memory loss.';
    for (const keyedChoiceRationale of [
      rationaleText,
      'Correct. ' + rationaleText,
      'This is the best answer because ' + rationaleText,
      'Best answer. Thiamine (vitamin B1) deficiency causes the classic alcohol-related amnestic triad.',
    ]) {
      const sample = {
        answerIndex: 1,
        choices: ['Vitamin B12', 'Thiamine (B1)', 'Folate (B9)', 'Niacin (B3)'],
        rationale: rationaleText,
        choiceRationales: [
          'Cobalamin deficiency causes anemia rather than Wernicke-Korsakoff syndrome.',
          keyedChoiceRationale,
          'Folate deficiency affects red blood cell formation rather than this triad.',
          'Niacin deficiency is linked to pellagra instead.',
        ],
      };
      const speech = Hub.feedbackSpeechText(sample, 1, 'guided', 'full');
      expect(speech).toMatch(/^Correct\. Thiamine deficiency/);
      expect(speech).not.toContain('Correct. Correct.');
      expect(speech).not.toContain('Feedback for your selected option B');
      expect(speech.split(rationaleText).length - 1).toBe(1);
      expect(speech).toContain('Other option feedback.');
      expect(speech).toContain('Option A.');
      expect(speech).toContain('Option C.');
      expect(speech).toContain('Option D.');
    }
  });

  it('falls back to the keyed choice rationale once when item.rationale is empty', () => {
    const sample = {
      answerIndex: 0,
      choices: ['Option A', 'Option B', 'Option C', 'Option D'],
      rationale: '',
      choiceRationales: [
        'Correct. Only A satisfies the experimental control requirement.',
        'B confounds the independent variable.',
        'C lacks random assignment.',
        'D measures the wrong construct.',
      ],
    };
    const speech = Hub.feedbackSpeechText(sample, 0, 'quick', 'full');
    expect(speech).toMatch(/^Correct\. Only A satisfies/);
    expect(speech).not.toContain('Correct. Correct.');
    expect(speech).not.toContain('Feedback for your selected option A');
    expect(speech.split('Only A satisfies').length - 1).toBe(1);
  });

  it('still skips duplicate distractor notes that echo the main rationale on a wrong answer', () => {
    const sample = {
      answerIndex: 1,
      choices: ['Option A', 'Option B', 'Option C', 'Option D'],
      rationale: 'Negative reinforcement strengthens behavior by removing an aversive stimulus.',
      choiceRationales: [
        'Positive punishment weakens behavior by adding an aversive stimulus.',
        'Negative reinforcement strengthens behavior by removing an aversive stimulus.',
        'Negative reinforcement strengthens behavior by removing an aversive stimulus.',
        'Extinction withholds reinforcement to reduce a previously reinforced behavior.',
      ],
    };
    const speech = Hub.feedbackSpeechText(sample, 0, 'quick', 'full');
    expect(speech).toContain('Feedback for your selected option A. Positive punishment');
    expect(speech.split('Negative reinforcement strengthens behavior').length - 1).toBe(1);
    expect(speech).toContain('Option D. Extinction withholds reinforcement');
  });

  it('supports targeted option feedback, other-options-only replay, core-only summary, voice elimination, and flashcard speech', () => {
    const parse = (text) => Hub.parseHandsFreeCommand(text, {});

    for (const [phrase, expectedIdx] of [
      ['why not B', 1], ['why not option C', 2], ['why is A wrong', 0],
      ['why is option D incorrect', 3], ["why isn't B right", 1],
      ['feedback for C', 2], ['read feedback for option A', 0],
    ]) {
      expect(parse(phrase), phrase).toMatchObject({ type: 'explain-choice', choiceIndex: expectedIdx });
    }
    for (const phrase of ['other options', 'why not the others', 'read other options', 'explain other options', 'other option feedback']) {
      expect(parse(phrase).type, phrase).toBe('other-options');
    }
    for (const phrase of ['brief explanation', 'short explanation', 'quick explanation', 'main rationale', 'summary']) {
      expect(parse(phrase).type, phrase).toBe('brief-feedback');
    }
    for (const [phrase, expectedIdx] of [
      ['eliminate B', 1], ['strike out C', 2], ['cross out A', 0], ['rule out option D', 3], ['exclude bee', 1],
    ]) {
      expect(parse(phrase), phrase).toMatchObject({ type: 'eliminate-choice', choiceIndex: expectedIdx });
    }
    for (const [phrase, expectedIdx] of [
      ['restore B', 1], ['unstrike option C', 2], ['bring back A', 0],
    ]) {
      expect(parse(phrase), phrase).toMatchObject({ type: 'restore-choice', choiceIndex: expectedIdx });
    }
    for (const phrase of ['save missed', 'save all missed', 'bookmark missed questions', 'flag missed items for review']) {
      expect(parse(phrase).type, phrase).toBe('save-missed');
    }
    // Keep existing clarify phrases intact
    expect(parse('can you explain option B?').type).toBe('clarify');
    expect(parse('what does option C mean?').type).toBe('clarify');

    const sample = {
      answerIndex: 1,
      choices: ['Option A', 'Option B', 'Option C', 'Option D'],
      rationale: 'Option B matches the controlling criterion.',
      choiceRationales: [
        'A misses the controlling variable.',
        'Correct. Option B matches the controlling criterion.',
        'C reverses the direction of the effect.',
        'D confuses correlation with causation.',
      ],
    };
    expect(Hub.optionFeedbackSpeechText(sample, 2)).toBe('Option C. C reverses the direction of the effect.');
    expect(Hub.optionFeedbackSpeechText(sample, 1)).toBe('Option B is the supported answer. Option B matches the controlling criterion.');

    const others = Hub.otherOptionsSpeechText(sample, 0);
    expect(others).toContain('Other option feedback.');
    expect(others).toContain('Option C. C reverses');
    expect(others).toContain('Option D. D confuses');
    expect(others).not.toContain('Option A.');
    expect(others).not.toContain('Option B.');

    const coreCorrect = Hub.feedbackSpeechText(sample, 1, 'quick', 'core');
    expect(coreCorrect).toBe('Correct. Option B matches the controlling criterion.');
    const coreWrong = Hub.feedbackSpeechText(sample, 0, 'quick', 'core');
    expect(coreWrong).toContain('Feedback for your selected option A. A misses the controlling variable.');
    expect(coreWrong).not.toContain('Other option feedback.');

    const card = { front: 'What is negative reinforcement?', back: 'Strengthening behavior by removing an aversive stimulus.' };
    expect(Hub.flashcardSpeechText(card, false)).toBe('Flashcard prompt. What is negative reinforcement?');
    expect(Hub.flashcardSpeechText(card, true)).toBe('Flashcard answer. Strengthening behavior by removing an aversive stimulus.');

    for (const phrase of ['core explanations', 'brief explanations', 'short explanations', 'concise explanations', 'skip other options', 'skip distractor feedback', 'explanations core']) {
      expect(parse(phrase), phrase).toMatchObject({ type: 'explanations', explanations: 'core' });
    }
    expect(Hub.memoryAidSpeechText({ title: 'OCEAN Big Five', content: 'Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism.' }))
      .toBe('Memory aid. OCEAN Big Five. Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism.');
    const qrSpeech = Hub.quickReferenceSpeechText({
      title: 'Chi-Square Tests',
      purpose: 'Compare observed and expected counts.',
      checklistLabel: 'Conditions',
      checklist: ['Random sample', 'All expected counts at least 5'],
      formulas: [],
      decisionRules: [],
      cautions: ['Do not use proportions in place of counts.'],
    });
    expect(qrSpeech).toContain('Chi-Square Tests');
    expect(qrSpeech).toContain('Conditions: Random sample. All expected counts at least 5');
    expect(qrSpeech).toContain('Cautions: Do not use proportions in place of counts.');
    expect(qrSpeech).not.toContain('Decision rules:');
    expect(qrSpeech).not.toContain('Relationships:');

    const pbSpeech = Hub.playbookSpeechText({
      title: 'Sign Reversal Trap',
      description: 'Students flip negative signs.',
      recognitionCue: 'Watch for negative slopes.',
      repairQuestion: 'Does increasing x increase or decrease y?',
      steps: [{ label: 'Check direction', instruction: 'Inspect the sign before computing.' }],
    });
    expect(pbSpeech).toContain('Misconception playbook. Sign Reversal Trap');
    expect(pbSpeech).toContain('Repair question: Does increasing x increase or decrease y?');
    expect(pbSpeech).toContain('Step 1. Check direction. Inspect the sign before computing.');

    const wsSpeech = Hub.workshopSpeechText({
      title: 'Case Intervention Plan',
      prompt: 'Design a two-step intervention.',
      stimulus: 'Student reads 45 words per minute.',
      taskParts: ['Identify the primary deficit.', 'Propose one progress-monitoring measure.'],
    });
    expect(wsSpeech).toContain('Written-response workshop. Case Intervention Plan');
    expect(wsSpeech).toContain('Stimulus: Student reads 45 words per minute.');
    expect(wsSpeech).toContain('Part 1. Identify the primary deficit.');

    for (const phrase of ['retry missed', 'retry missed questions', 'practice missed', 'review missed', 'drill missed']) {
      expect(parse(phrase).type, phrase).toBe('retry-missed');
    }
    for (const phrase of ['read missed', 'read missed questions', 'hear missed', 'list missed items', 'summarize missed', 'what did i miss']) {
      expect(parse(phrase).type, phrase).toBe('read-missed');
    }

    // No-AI mode must omit AI clarification prompts from both help and feedback speech.
    const helpNoAi = Hub.handsFreeHelpText('practice', true, { aiAvailable: false });
    expect(helpNoAi).not.toMatch(/clarification|ask followed by/i);
    expect(Hub.handsFreeHelpText('practice', true, { aiAvailable: true })).toContain('ask followed by a clarification question');
    const fbNoAi = Hub.feedbackSpeechText(sample, 1, 'guided', 'full', { aiAvailable: false });
    expect(fbNoAi).not.toMatch(/clarification/i);
    expect(fbNoAi).toContain('next question or repeat explanation');

    // Missed summary speech covers 0, bounded <=5, and >5 overflow cleanly.
    expect(Hub.missedSummarySpeechText([], {})).toContain('answered every question');
    const summary1 = Hub.missedSummarySpeechText([sample], { [sample.id]: 0 });
    expect(summary1).toContain('You missed 1 question.');
    expect(summary1).toContain('The supported answer is Option B.');
    expect(summary1).toContain('Say retry missed');
    const sixMissed = Array.from({ length: 6 }, (_, i) => ({ ...sample, id: 'm-' + i, prompt: 'Prompt ' + (i + 1) }));
    const summary6 = Hub.missedSummarySpeechText(sixMissed, {});
    expect(summary6).toContain('You missed 6 questions.');
    expect(summary6).toContain('1 additional missed question is listed on screen.');

    // Zero-AI Hands-Free Flashcards voice parser and help text
    const parseFc = (text) => Hub.parseFlashcardVoiceCommand(text);
    for (const phrase of ['flip', 'reveal', 'show answer', 'okay flip', 'check', 'turn over']) {
      expect(parseFc(phrase).type, phrase).toBe('reveal');
    }
    for (const phrase of ['study again', 'again', 'missed it', 'hard', '1']) {
      expect(parseFc(phrase), phrase).toMatchObject({ type: 'rate', rating: 'again' });
    }
    for (const phrase of ['still learning', 'learning', 'almost', '2']) {
      expect(parseFc(phrase), phrase).toMatchObject({ type: 'rate', rating: 'learning' });
    }
    for (const phrase of ['know it', 'knew it', 'got it', 'easy', '3']) {
      expect(parseFc(phrase), phrase).toMatchObject({ type: 'rate', rating: 'know' });
    }
    expect(parseFc('next card').type).toBe('next');
    expect(parseFc('previous card').type).toBe('prev');
    expect(parseFc('repeat').type).toBe('repeat');
    expect(parseFc('slow down').type).toBe('slower');
    expect(parseFc('speed up').type).toBe('faster');
    expect(parseFc('stop hands free').type).toBe('stop');
    expect(parseFc('what is photosynthesis').type).toBe('unknown');
    const fcHelp = Hub.flashcardHandsFreeHelpText();
    expect(fcHelp).toContain('flip or reveal');
    expect(fcHelp).not.toMatch(/\bAI\b|clarification/i);

    // Hands-free Reference Aid commands & speech formatting (zero-AI)
    for (const phrase of ['read reference', 'open reference aid', 'show quick reference', 'reference aid', 'quick reference']) {
      expect(parse(phrase).type, phrase).toBe('read-reference');
    }
    for (const phrase of ['hide reference', 'close reference aid', 'dismiss reference']) {
      expect(parse(phrase).type, phrase).toBe('hide-reference');
    }
    expect(Hub.handsFreeHelpText('standard', false, { aiAvailable: false })).toContain('read reference');
    expect(Hub.handsFreeHelpText('simulation', false, { aiAvailable: false })).not.toContain('read reference');
    const refText = Hub.itemReferenceSpeechText({
      quickReference: [
        { id: 'qr-other', domainId: 'other-domain', title: 'Other Card', formulas: ['X = Y'] },
        { id: 'qr-match', domainId: 'biological-bases', title: 'Neuroanatomy Core', formulas: ['Broca = production'] },
      ],
    }, { domainId: 'biological-bases' });
    expect(refText).toContain('Reference aid. Neuroanatomy Core');
    expect(refText).toContain('Broca = production');
    const aidFallback = Hub.itemReferenceSpeechText({
      memoryAids: [
        { id: 'ma-1', domainId: 'ethics', title: 'APA 10.08', content: 'Wait two years.', reviewStatus: 'source-reviewed-editorial-pass' },
      ],
    }, { domainId: 'ethics' });
    expect(aidFallback).toContain('Memory aid. APA 10.08');
    expect(Hub.itemReferenceSpeechText({}, { domainId: 'ethics' })).toBe('');

    // Normal/reset speed across both Practice & Flashcards + Study Session & Chapter Check speech helpers
    for (const phrase of ['normal speed', 'default speed', 'reset speed', 'regular pace']) {
      expect(parse(phrase).type, 'practice ' + phrase).toBe('reset-rate');
      expect(parseFc(phrase).type, 'flashcard ' + phrase).toBe('reset-rate');
    }
    const sessSpeech = Hub.studySessionSpeechText({
      title: 'Unit 1 Warm-Up',
      durationMinutes: 25,
      purpose: 'Anchor core definitions.',
      steps: [{ label: 'Review notes', durationMinutes: 10, action: 'Scan summary formulas.' }],
    });
    expect(sessSpeech).toContain('Study session. Unit 1 Warm-Up');
    expect(sessSpeech).toContain('About 25 minutes');
    expect(sessSpeech).toContain('Step 1. Review notes (10 minutes). Scan summary formulas.');
    const preCheck = Hub.chapterCheckSpeechText({ prompt: 'What is 2+2?', choices: ['3', '4'], answerIndex: 1, rationale: 'Correct. 2+2 equals 4.' }, false, null);
    expect(preCheck).toMatch(/^Knowledge check\. What is 2\+2\?/);
    const postCheckCorrect = Hub.chapterCheckSpeechText({ prompt: 'What is 2+2?', choices: ['3', '4'], answerIndex: 1, rationale: 'Correct. 2+2 equals 4.' }, true, 1);
    expect(postCheckCorrect).toBe('Correct. 2+2 equals 4.');
  });
});
