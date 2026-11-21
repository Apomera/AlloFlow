'use strict';

const ETS = 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dwa68a3c59/pdfs/5355.pdf';
const IDEA_EVAL = 'https://sites.ed.gov/idea/regs/b/d/300.304';
const IDEA_IEP = 'https://sites.ed.gov/idea/regs/b/d/300.320';
const IDEA_IEP_REVIEW = 'https://sites.ed.gov/idea/regs/b/d/300.324';
const IDEA_LRE = 'https://sites.ed.gov/idea/regs/b/b/300.114';
const IDEA_PLACEMENT = 'https://sites.ed.gov/idea/regs/b/b/300.116';
const IDEA_ASSESS = 'https://sites.ed.gov/idea/regs/b/b/300.160';
const IDEA_SAFEGUARDS = 'https://sites.ed.gov/idea/regs/b/e/300.504';
const IDEA_DISCIPLINE = 'https://sites.ed.gov/idea/regs/b/e/300.530';
const IES_BEHAVIOR = 'https://ies.ed.gov/ncee/wwc/practiceguide/31';
const IES_DATA = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/12';
const IES_READING = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/29';
const IES_MATH = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/26';
const SECTION_504 = 'https://www.ed.gov/laws-and-policy/individuals-disabilities/section-504';

const sources = {
  ETS,
  IDEA_EVAL,
  IDEA_IEP,
  IDEA_IEP_REVIEW,
  IDEA_LRE,
  IDEA_PLACEMENT,
  IDEA_ASSESS,
  IDEA_SAFEGUARDS,
  IDEA_DISCIPLINE,
  IES_BEHAVIOR,
  IES_DATA,
  IES_READING,
  IES_MATH,
  SECTION_504,
};

function q(promptA, promptB, correct, distractors, rationale, distractorNotes, difficulty = 'application', variantB = null) {
  const spec = {
    promptA,
    promptB,
    correct,
    distractors,
    rationale,
    distractorNotes,
    difficulty,
  };
  if (variantB) spec.variantB = variantB;
  return spec;
}

module.exports = { sources, q };
