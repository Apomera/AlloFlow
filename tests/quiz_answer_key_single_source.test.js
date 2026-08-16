// Quiz MCQ answer key: one matcher, not twelve.
//
// Second instance of the class that produced the Language Deck flashcard bug
// (see tests/flashcard_quiz_answer_single_source.test.js). Here the split was:
//
//   - handlePresentationOptionClick in AlloFlowANTI.txt NORMALIZED
//     (option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase())
//   - every reveal highlight and the voice "check my answer" path compared EXACTLY
//
// So when the answer key differed from its matching option only by case or
// spacing — which is what LLM-generated quiz JSON produces, and what a teacher
// editing an option can leave behind — the click grader scored the student
// correct and awarded XP while no option was shown as correct, and the voice
// check contradicted the click.
//
// The authoring validators deliberately still compare exactly. They exist to
// warn an author about that drift, and making them lenient would silence the
// only thing that reports it.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let anti;
let view;
let matches;

beforeAll(() => {
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  view = readFileSync('view_quiz_source.jsx', 'utf8');

  // Source-literal extraction rather than importing the monolith, the same
  // approach tests/cell_quiz_position_bias.test.js uses on a 1MB tool file.
  const start = anti.indexOf('const quizAnswerMatches = (option, key) => {');
  if (start < 0) throw new Error('quizAnswerMatches not found in AlloFlowANTI.txt');
  const end = anti.indexOf('window.quizAnswerMatches = quizAnswerMatches;', start);
  if (end < 0) throw new Error('quizAnswerMatches export not found');
  matches = new Function(anti.slice(start, end) + '; return quizAnswerMatches;')();
});

describe('quizAnswerMatches', () => {
  it('matches the option that is the answer', () => {
    expect(matches('Photosynthesis', 'Photosynthesis')).toBe(true);
  });

  it('tolerates the drift that actually occurs in generated quiz JSON', () => {
    expect(matches('Photosynthesis', 'photosynthesis')).toBe(true);
    expect(matches('  Photosynthesis  ', 'Photosynthesis')).toBe(true);
    expect(matches('Photosynthesis', 'PHOTOSYNTHESIS ')).toBe(true);
    expect(matches('cell  wall', 'cell wall')).toBe(true);
  });

  it('does not match different answers', () => {
    expect(matches('Photosynthesis', 'Respiration')).toBe(false);
    expect(matches('cell wall', 'cell walls')).toBe(false);
  });

  it('never matches on an empty or missing side', () => {
    expect(matches('', '')).toBe(false);
    expect(matches('   ', 'Four')).toBe(false);
    expect(matches('Four', '   ')).toBe(false);
    expect(matches(null, 'Four')).toBe(false);
    expect(matches('Four', undefined)).toBe(false);
    expect(matches(undefined, undefined)).toBe(false);
  });

  it('does not coerce unrelated values into a match', () => {
    expect(matches(0, '0')).toBe(true);      // a numeric option keyed as a string is the same answer
    expect(matches(0, 'zero')).toBe(false);
  });
});

describe('grade, reveal and voice check agree', () => {
  // A question whose key differs from its option only by case. This is the case
  // that used to score correct and reveal nothing.
  const q = {
    options: ['Photosynthesis', 'Respiration', 'Osmosis', 'Mitosis'],
    correctAnswer: 'photosynthesis',
  };

  it('all three paths pick the same option', () => {
    const picked = 0;
    const graded = matches(q.options[picked], q.correctAnswer);            // host click grader
    const voice = matches(q.options[picked], q.correctAnswer);             // voice check
    const revealed = q.options.filter((opt) => matches(opt, q.correctAnswer)); // reveal highlight

    expect(graded).toBe(true);
    expect(voice).toBe(graded);
    expect(revealed).toEqual(['Photosynthesis']);
  });

  it('the old exact rule revealed nothing while the grader said correct', () => {
    const oldReveal = q.options.filter((opt) => opt === q.correctAnswer);
    expect(oldReveal).toEqual([]);
    // and the old grader, which already normalized, disagreed with it
    expect(q.options[0].trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()).toBe(true);
  });

  it('exactly one option is ever revealed as correct', () => {
    const revealed = q.options.filter((opt) => matches(opt, q.correctAnswer));
    expect(revealed).toHaveLength(1);
  });

  it('a wrong pick is still wrong', () => {
    expect(matches(q.options[1], q.correctAnswer)).toBe(false);
  });
});

describe('no student-facing path re-derives the verdict', () => {
  it('the host grader calls the shared matcher', () => {
    expect(anti).toContain('const isCorrect = quizAnswerMatches(option, question.correctAnswer);');
    expect(anti).not.toContain('option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()');
  });

  it('the view reaches the host matcher rather than copying it', () => {
    expect(view).toContain('var _quizAnswerMatches = function (option, key) {');
    expect(view).toContain("typeof window.quizAnswerMatches === 'function'");
    // the fallback is strict equality, not a second normalizer
    expect(view).not.toContain("String(option).trim().toLowerCase().replace(/\\s+/g, ' ')");
  });

  it('every student-facing comparison goes through it', () => {
    const calls = view.split('_quizAnswerMatches(').length - 1;
    expect(calls).toBeGreaterThanOrEqual(10);
    expect(view).not.toContain('=== q.correctAnswer');
    expect(view).not.toContain('=== question.correctAnswer');
  });

  it('the negated form is covered too, so the answer is never treated as a distractor', () => {
    // `opt !== q.correctAnswer` guards the "improve this distractor" controls.
    // Left exact, a drifted key makes the correct answer look like a distractor
    // and offers to rewrite it. This is the same defect wearing a not.
    expect(view).not.toContain('!== q.correctAnswer');
    expect(view).not.toContain('!== question.correctAnswer');
    expect(view).toContain('!_quizAnswerMatches(opt, q.correctAnswer)');
  });

  it('the key is repaired, not abandoned, when a teacher edits the options', () => {
    expect(view).toContain('var answerIndex = oldAnswers.findIndex(function (answer) { return _quizAnswerMatches(answer, q.correctAnswer); });');
  });
});

describe('authoring validators stay strict on purpose', () => {
  it('still tells an author when the key does not match an option exactly', () => {
    expect(view).toContain("if (mcqOptions.indexOf(q.correctAnswer) === -1) add(index, 'error', 'The correct answer must match one option exactly.', 'mcq-key');");
  });

  it('the other three validators keep exact indexOf', () => {
    expect(view).toContain("answers.indexOf(q.correctAnswer) === -1");
    expect(view).toContain('mcqOptions.indexOf(q.correctAnswer) !== -1');
    expect(view).toContain('q.answerOptions.indexOf(q.correctAnswer) !== -1');
  });
});

describe('build artifacts', () => {
  it('keeps the built and deployed quiz modules synchronized', () => {
    expect(readFileSync('desktop/web-app/public/view_quiz_module.js', 'utf8'))
      .toBe(readFileSync('view_quiz_module.js', 'utf8'));
  });
});
