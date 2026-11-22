'use strict';

// Balanced-choice overrides for ParaPro Learning Library knowledge checks.
// Keyed by check id ("parapro-ch-<nn>-check-<m>") matching build_parapro_learning_library.cjs.
const overridesById = {
  'parapro-ch-01-check-1': {
    correct: 'A topic names the subject; a main idea states the key point.',
    distractors: [
      'A topic is a complete sentence; a main idea is a single word.',
      'A topic gives factual evidence; a main idea lists every detail.',
      'A topic states a personal view; a main idea requires a number.',
    ],
  },
  'parapro-ch-01-check-2': {
    correct: 'Saturday visits rose from 18 to 31 after hours grew.',
    distractors: [
      'The neighborhood library walls were painted soft cream.',
      'The renovated library building contains two staircases.',
      'Several new picture books have bright blue cloth covers.',
    ],
  },
  'parapro-ch-01-check-3': {
    correct: 'Claims or opinions not backed by the passage',
    distractors: [
      'The central governing idea of the reading passage',
      'An essential cause-and-effect link from the text',
      'A concise paraphrase capturing major text points',
    ],
  },
  'parapro-ch-01-check-4': {
    correct: 'Check whether the sentence is only a minor detail.',
    distractors: [
      'Assume the longest sentence must state the main idea.',
      'Delete every other paragraph that does not match it.',
      'Treat the line as central because it appears first.',
    ],
  },
  'parapro-ch-01-check-5': {
    correct: 'What do the key details show together about the topic?',
    distractors: [
      'Copy the opening sentence verbatim and stop reading there.',
      'Choose whichever sentence holds the longest vocabulary word.',
      'Let me tell you the main idea before you reread the passage.',
    ],
  },
  'parapro-ch-02-check-1': {
    correct: 'The reader cites clues and explains how they fit.',
    distractors: [
      'The chosen conclusion sounds like the most dramatic guess.',
      'The reader has held that same personal belief for years.',
      'The proposed conclusion repeats a word from the question.',
    ],
  },
  'parapro-ch-02-check-5': {
    correct: 'Which text clues led you there, and how do they link?',
    distractors: [
      'Can you repeat your spoken answer more loudly right now?',
      'Which multiple-choice option contains the greatest words?',
      'Would you like me to select the best inference for you?',
    ],
  },
  'parapro-ch-03-check-4': {
    correct: 'A student diary entry written on opening day',
    distractors: [
      'A school history textbook published in 2025',
      'A modern online encyclopedia article summary',
      'A recent television documentary voice narration',
    ],
  },
  'parapro-ch-03-check-5': {
    correct: 'Their viewpoints differ even when shared facts match.',
    distractors: [
      'At least one of the two published accounts is false.',
      'The exact same historical event must have happened twice.',
      'Every difference between accounts reflects typos alone.',
    ],
  },
  'parapro-ch-04-check-1': {
    correct: 'Modeled repeated oral reading with phrasing tips',
    distractors: [
      'A harder silent reading passage with zero feedback',
      'Unrelated weekly spelling lists without oral reading',
      'Pronouncing every next printed word immediately aloud',
    ],
  },
  'parapro-ch-04-check-2': {
    correct: 'Name the observed gap and specific task demand',
    distractors: [
      'Assume the struggling learner lacks classroom effort',
      'Pick the most intensive support right away by default',
      'Complete the challenging reading task for the learner',
    ],
  },
  'parapro-ch-04-check-3': {
    correct: 'Model clearly, guide practice, then fade to independence',
    distractors: [
      'Test once, label the gap, and supply answers permanently',
      'Assign unguided independent practice before any modeling',
      'Continue teacher modeling indefinitely without student turns',
    ],
  },
  'parapro-ch-04-check-4': {
    correct: 'Chunk directions, add clear visuals, and check each step',
    distractors: [
      'Swap the grade-level task for unrelated coloring sheets',
      'Repeat the exact same dense directions much more rapidly',
      'Finish the written assignment without reviewing any steps',
    ],
  },
  'parapro-ch-04-check-5': {
    correct: 'When evidence shows the learner handles the step solo',
    distractors: [
      'Keep every scaffold permanently once it is introduced',
      'Remove the scaffold immediately after one wrong try',
      'Wait until every classmate finishes the full unit',
    ],
  },
  'parapro-ch-05-check-1': {
    correct: 'Fractions must name equal-sized parts.',
    distractors: [
      'Both numerators must first reduce to zero.',
      'Every fraction must exceed one whole unit.',
      'Denominators are summed before numerators.',
    ],
  },
  'parapro-ch-06-check-2': {
    correct: 'Both terms scale by the same factor.',
    distractors: [
      'Both quantities increase by adding one.',
      'The difference between terms stays zero.',
      'Measurement units swap around freely.',
    ],
  },
  'parapro-ch-06-check-5': {
    correct: 'Substitute it into the original equation.',
    distractors: [
      'Pick whichever candidate value is largest.',
      'Count how many symbols appear in the problem.',
      'Round the draft solution without verifying it.',
    ],
  },
  'parapro-ch-08-check-4': {
    correct: 'Elicit student steps and find the first error.',
    distractors: [
      'Give the corrected final answer right away.',
      'Assume the student guessed without checking.',
      'Assign unrelated arithmetic drills instead.',
    ],
  },
  'parapro-ch-08-check-5': {
    correct: 'It shows equal steps keep both sides balanced.',
    distractors: [
      'It converts every algebra equation into shapes.',
      'It removes any need to calculate the solution.',
      'It guarantees the unknown variable is positive.',
    ],
  },
  'parapro-ch-09-check-3': {
    correct: 'It is a dependent fragment lacking a main clause.',
    distractors: [
      'It contains far too many separate grammatical subjects.',
      'It requires placing a semicolon directly after "When."',
      'The word "ended" cannot function as an action verb.',
    ],
  },
  'parapro-ch-09-check-5': {
    correct: 'It seems to describe the wrong word or actor.',
    distractors: [
      'It turns a regular noun into an action verb.',
      'It strips out every punctuation mark nearby.',
      'It turns the sentence into a direct quotation.',
    ],
  },
  'parapro-ch-10-check-3': {
    correct: 'Replace the vague pronoun with the intended noun.',
    distractors: [
      'Insert a second unclear pronoun beside the first.',
      'Delete every specific noun inside the sentence.',
      'Shift every verb in the paragraph to future tense.',
    ],
  },
  'parapro-ch-10-check-5': {
    correct: 'The actor doing the action',
    distractors: [
      'The closing punctuation mark',
      'An unrelated background object',
      'The final word alphabetically',
    ],
  },
  'parapro-ch-11-check-1': {
    correct: 'State the paragraph’s controlling idea',
    distractors: [
      'List every cited source in the paper',
      'Fix every comma and spelling mistake',
      'Add an unrelated personal anecdote',
    ],
  },
  'parapro-ch-11-check-3': {
    correct: 'Attendance and work data from a similar program',
    distractors: [
      'The paint color along the school hallway walls',
      'A directory of unrelated after-school art clubs',
      'One writer’s personal favorite time of the day',
    ],
  },
  'parapro-ch-11-check-5': {
    correct: 'Big edits may move or cut whole sentences.',
    distractors: [
      'Proofreading grammar adds no real value.',
      'Organization changes handwriting neatness.',
      'Every body paragraph must be alphabetized.',
    ],
  },
  'parapro-ch-12-check-2': {
    correct: 'It names a goal, text line, effect, and reusable step.',
    distractors: [
      'It rewrites every rough sentence directly for the author.',
      'It gives a single numeric score without written comments.',
      'It centers on personal style tastes outside the rubric.',
    ],
  },
  'parapro-ch-12-check-3': {
    correct: 'Which sights, sounds, or actions picture the scene?',
    distractors: [
      'Can you repeat the word messy five times in a row?',
      'Should we delete the entire story setting instead?',
      'Can you add a fact about an unrelated tall building?',
    ],
  },
  'parapro-ch-12-check-4': {
    correct: 'Offer models and prompts while the learner owns wording.',
    distractors: [
      'Draft the polished final paragraph directly for the child.',
      'Require the student to adopt the adult’s preferred view.',
      'Replace the writing assignment with unrelated worksheets.',
    ],
  },
  'parapro-ch-12-check-5': {
    correct: 'Define acronyms, add headings, and state actions clearly.',
    distractors: [
      'Insert extra formal school abbreviations into the letter.',
      'Place required family steps inside a tiny bottom footnote.',
      'Merge every school announcement into one unbroken block.',
    ],
  },
};

function applyParaproLibraryCheckOverrides(checkId, seed) {
  const override = overridesById[checkId];
  if (!override) return seed;
  return {
    ...seed,
    correct: override.correct || seed.correct,
    distractors: override.distractors ? override.distractors.slice() : seed.distractors,
  };
}

module.exports = { applyParaproLibraryCheckOverrides, overridesById };
