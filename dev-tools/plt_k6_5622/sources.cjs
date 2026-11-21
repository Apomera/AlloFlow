'use strict';

const ETS = 'https://www.ets.org/pdfs/praxis/5622.pdf';
const INTASC = 'https://ccsso.org/sites/default/files/2017-11/InTASC_Model_Core_Teaching_Standards_2011.pdf';
const IES_GUIDES = 'https://ies.ed.gov/ncee/wwc/PracticeGuides';
const IES_LEARNING = 'https://ies.ed.gov/ncee/wwc/practiceguide/1';
const IES_DATA = 'https://ies.ed.gov/ncee/wwc/practiceguide/12';
const IES_BEHAVIOR = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/31/Published';
const FERPA = 'https://studentprivacy.ed.gov/faq/under-ferpa-may-educational-agency-or-institution-disclose-education-records-any-its-employees';
const IDEA_EVAL = 'https://sites.ed.gov/idea/regs/b/d/300.304';
const IDEA_MTSS = 'https://sites.ed.gov/idea/idea-files/rts-qa-child-find-part-b-08-24-2021/';
const DISABILITY_RIGHTS = 'https://www.ed.gov/laws-and-policy/civil-rights-laws/disability-discrimination';
const ENGLISH_LEARNERS = 'https://www.ed.gov/laws-and-policy/civil-rights-laws/race-color-and-national-origin-discrimination/race-color-and-national-origin-discrimination-key-issues/equal-education-opportunities-english';
const EOP = 'https://www.ed.gov/teaching-and-administration/safe-learning-environments/school-safety-and-security/emergency-planning';

const sources = {
  ETS,
  INTASC,
  IES_GUIDES,
  IES_LEARNING,
  IES_DATA,
  IES_BEHAVIOR,
  FERPA,
  IDEA_EVAL,
  IDEA_MTSS,
  DISABILITY_RIGHTS,
  ENGLISH_LEARNERS,
  EOP,
};

function q(promptA, promptB, correct, distractors, rationale, distractorNotes, difficulty = 'application') {
  return { promptA, promptB, correct, distractors, rationale, distractorNotes, difficulty };
}

module.exports = { sources, q };
