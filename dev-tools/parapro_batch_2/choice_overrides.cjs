'use strict';

// Balanced-choice, prompt-length, and distractor-feedback overrides for ParaPro Batch 2.
// Keyed by item id ("parapro-<domain>-<role>-<nnn>") matching build_parapro_batch_2.cjs.
const overridesById = {
  'parapro-reading-skills-024': {
    correct: 'Neighbors turned an unused lot into a shared community park.',
    distractors: [
      'Native shrubs grow strongest when residents plant them during late autumn.',
      'Local families petitioned city officials to build a large new playground.',
      'The vacant corner lot stayed completely unused after cleanup work ended.',
    ],
  },
  'parapro-reading-skills-025': {
    correct: 'Express service aligned with shorter trips and higher ridership.',
    distractors: [
      'Every commuter on the weekday route reached work thirteen minutes earlier.',
      'City transit planners removed every regular local bus from the corridor.',
      'Weekend bus ridership climbed by the exact same rate as weekday ridership.',
    ],
  },
  'parapro-reading-skills-026': {
    correct: 'The roster listed students from grades four through eight.',
    distractors: [
      'The annual science fair took place inside the main school gymnasium.',
      'Several student entries displayed bright tri-fold presentation boards.',
      'Volunteer judges announced ribbon awards near the close of the evening.',
    ],
  },
  'parapro-reading-skills-029': {
    whyWrong: [
      null,
      null,
      'she ultimately agrees to introduce the group project after practicing, so being unable to speak is unsupported',
    ],
  },
  'parapro-reading-skills-030': {
    correct: 'They highlight different conditions affecting trail difficulty.',
    distractors: [
      'They disagree sharply about which park entrance marks the trailhead.',
      'They describe two separate hiking paths located in neighboring cities.',
      'They report conflicting calendar dates for when the trail first opened.',
    ],
  },
  'parapro-reading-skills-032': {
    prompt: 'During a classroom reading review about fact and opinion, which sentence expresses an opinion?',
    correct: 'The renovated cafeteria feels warm and welcoming.',
    distractors: [
      'The school cafeteria opens for student breakfast at 7:30 a.m.',
      'The recent cafeteria renovation added twelve new round tables.',
      'The north wall of the cafeteria contains three wide glass windows.',
    ],
  },
  'parapro-reading-skills-034': {
    correct: 'The club met its display need with low-cost recycled stands.',
    distractors: [
      'The art club purchased sturdy wooden display stands for every project.',
      'Recycled cardboard works better than any other display craft material.',
      'Several club members chose to stop displaying finished artwork publicly.',
    ],
    whyWrong: [
      null,
      null,
      'club members solved the display challenge creatively with cardboard stands rather than abandoning student art displays',
    ],
  },
  'parapro-reading-skills-037': {
    correct: 'Classes cannot use the lab from 10:30 to 11:00.',
    distractors: [
      'Seventh-grade classes are scheduled inside the computer lab before Grade 5.',
      'Scheduled computer maintenance lasts longer than every forty-minute class.',
      'Sixth-grade and seventh-grade computer sessions start at the identical hour.',
    ],
  },
  'parapro-reading-skills-039': {
    whyWrong: [
      'the Materials section lists needed tools and parts rather than explaining how to diagnose or fix a malfunction',
      null,
      null,
    ],
  },
  'parapro-reading-skills-041': {
    correct: 'To view something before its main showing',
    distractors: [
      'To view a finished presentation again after it ends',
      'To refuse to view a planned presentation at any time',
      'To split a long presentation into two separate halves',
    ],
  },
  'parapro-reading-skills-042': {
    correct: 'Bottle waste dropped by 600 bottles after installation.',
    distractors: [
      'The new water fountains match the blue paint on nearby hall lockers.',
      'Students voted on which hallway corners should hold the new fountains.',
      'The district plumbing crew finished installation before morning classes.',
    ],
  },
  'parapro-reading-skills-045': {
    correct: 'Steady practice helps performers recover from small slips.',
    distractors: [
      'A musical recital carries value when every played note is flawless.',
      'Developing musicians should avoid playing difficult pieces onstage.',
      'Natural musical talent makes daily slow practice sessions unnecessary.',
    ],
  },
  'parapro-reading-application-012': {
    correct: 'Name the shared topic, then form a statement covering key details.',
    distractors: [
      'Have the student copy the longest sentence verbatim from every paragraph.',
      'Tell the learner that the opening sentence states the main idea each time.',
      'Skip paragraph reading and practice spelling unrelated weekly word lists.',
    ],
  },
  'parapro-reading-application-013': {
    correct: 'Which nearby clues describe the region and suggest word meaning?',
    distractors: [
      'How many total letters and spoken syllables appear in the unfamiliar word?',
      'Can you ignore the surrounding sentence and pick the first glossary entry?',
      'Would you prefer that I swap in a simpler word without discussing context?',
    ],
  },
  'parapro-reading-application-014': {
    correct: 'Model fluent reading, then guide repeated oral reading with feedback.',
    distractors: [
      'Assign a much harder grade-level passage for unguided silent reading practice.',
      'Jump in on every brief hesitation by pronouncing the next printed word aloud.',
      'Replace connected story reading with isolated weekly spelling drills instead.',
    ],
  },
  'parapro-reading-application-015': {
    correct: 'Which clues in the passage led you to that conclusion?',
    distractors: [
      'Can you repeat your spoken answer more loudly without checking text?',
      'Would you rather choose a simpler answer that needs no explanation?',
      'How rapidly can you copy the comprehension prompt into your notebook?',
    ],
  },
  'parapro-reading-application-016': {
    correct: 'A chart of shared facts, unique details, and viewpoints',
    distractors: [
      'A simple tally counting total words printed inside each news article',
      'A wall calendar listing unrelated civic events from the prior month',
      'A spelling practice sheet featuring words absent from both articles',
    ],
  },
  'parapro-reading-application-017': {
    correct: 'Pause, reread the confusing part, and restate it in own words.',
    distractors: [
      'Keep skimming rapidly forward and assume the confusing details will clear up.',
      'Copy every sentence on the page carefully without pausing to check meaning.',
      'Pick a quick overall summary before rereading the unclear middle passage.',
    ],
    whyWrong: [
      'continuing forward without monitoring comprehension leaves the reader’s misunderstanding unresolved across the rest of the text',
      null,
      null,
    ],
  },
  'parapro-reading-application-018': {
    correct: 'Provide a numbered visual checklist so the student marks each step.',
    distractors: [
      'Read all multi-step directions aloud once while standing across the classroom.',
      'Remove visible step numbers so the student practices recalling sequence alone.',
      'Point out errors in the final product without reviewing the ordered procedure.',
    ],
  },
  'parapro-reading-application-020': {
    correct: 'Contrast verifiable numbers with numerical opinions using evidence.',
    distractors: [
      'Explain to the student that any statement lacking digits must be an opinion.',
      'Have the student underline every printed digit without reading full sentences.',
      'Avoid discussing how factual statements can be checked against reliable data.',
    ],
  },
  'parapro-reading-application-021': {
    correct: 'Chunk steps, pair each step with a visual, and check progress.',
    distractors: [
      'Complete the full written assignment directly for the student without review.',
      'Set the academic lesson aside and provide unrelated quiet coloring sheets.',
      'Repeat the dense written instructions faster without adding visual scaffolds.',
    ],
  },
  'parapro-reading-application-022': {
    correct: 'Compare the artwork with text clues and weigh direct actions first.',
    distractors: [
      'Accept the color cue alone while overlooking the character’s stated actions.',
      'Tell the student that story illustrations fail to offer helpful text clues.',
      'Supply a new interpretation directly without having the student revisit clues.',
    ],
    whyWrong: [
      'the character’s direct actions of smiling and thanking everyone clearly contradict a color-only inference of anger',
      'book illustrations can contribute meaningful story evidence when interpreted alongside the written text rather than in isolation',
      null,
    ],
  },
  'parapro-mathematics-skills-023': {
    prompt: 'Without using a calculator, find the sum in lowest terms: what is 3/4 + 2/3?',
  },
  'parapro-mathematics-skills-026': {
    prompt: 'Without using a calculator, evaluate the integer expression: what is -7 + 12 - 5?',
  },
  'parapro-mathematics-skills-027': {
    prompt: 'Without using a calculator, solve the linear equation for x: 4x - 7 = 21.',
  },
  'parapro-mathematics-skills-034': {
    distractors: ['7', '10', '9.5'],
    whyWrong: [
      null,
      null,
      '9.5 miscalculates the midpoint halfway between the two middle values 7 and 10, which equals (7 + 10) divided by 2, or 8.5',
    ],
  },
  'parapro-mathematics-skills-037': {
    prompt: 'Without using a calculator, compute the decimal product: what is 2.4 multiplied by 0.35?',
  },
  'parapro-mathematics-application-013': {
    correct: 'Model both decimals on a place-value chart to compare tenths and hundredths.',
    distractors: [
      'Explain that interior zeros carry no numerical effect inside decimal fractions.',
      'Have the student strip out decimal points before comparing the whole digits.',
      'Direct the learner to round both decimals to the nearest whole number instead.',
    ],
  },
  'parapro-mathematics-application-015': {
    correct: 'Tile rectangles with unit squares and link rows to multiplication.',
    distractors: [
      'Trace the outer rectangular boundary and label that total distance as area.',
      'Have students memorize length plus width as the standard rectangle area rule.',
      'Count the four corner squares alone while ignoring the interior grid units.',
    ],
  },
  'parapro-mathematics-application-016': {
    correct: 'A ratio table finding 1 ticket ($4) and scaling to 8',
    distractors: [
      'A chart adding 3 tickets and $12 together in one single column',
      'A blank number line with no labels, units, or equal intervals',
      'A classroom rule that subtracts the two terms inside each ratio',
    ],
  },
  'parapro-mathematics-application-017': {
    correct: 'Use a balance model to show applying the same step to both sides.',
    distractors: [
      'Tell the student to rewrite 17 as 12 without discussing why equality holds.',
      'Have the student divide the left side by 2 while keeping the right side fixed.',
      'Set the algebra problem aside and practice unrelated single-digit multiplication.',
    ],
  },
  'parapro-mathematics-application-019': {
    correct: 'Separate experimental data from theoretical odds and run more trials.',
    distractors: [
      'Agree that ten recorded coin tosses permanently shift theoretical probability.',
      'Erase several heads from the tally chart so the sample looks evenly balanced.',
      'Explain that hands-on coin trials fail to yield useful probability information.',
    ],
    whyWrong: [
      null,
      null,
      'classroom probability experiments help students estimate empirical rates and observe natural random variation across small samples',
    ],
  },
  'parapro-mathematics-application-021': {
    correct: 'Plot both on a number line; the point farther right is greater.',
    distractors: [
      'Compare their distances from zero and select whichever number lies farther out.',
      'Drop both negative signs first, compare 6 and 2, then put the signs back on.',
      'Rank the unsigned digits first and apply the negative signs afterward in order.',
    ],
  },
  'parapro-mathematics-application-022': {
    correct: 'Compare mean and median to show how the 60-minute outlier shifts center.',
    distractors: [
      'Report 60 minutes as the typical class reading time since it is the maximum.',
      'Discard every regular student time except the 60-minute outlier when reporting.',
      'Sum all recorded reading times without ordering values or dividing by count.',
    ],
    whyWrong: [
      'the single highest maximum value is not automatically representative of a clustered distribution when nearly all other times are 18 to 25 minutes',
      null,
      null,
    ],
  },
  'parapro-writing-skills-024': {
    correct: 'Each volunteer placed a name tag beside their materials.',
    distractors: [
      'Each volunteer placed their name tags beside his own materials.',
      'The volunteers placed her name tag beside their own materials.',
      'Every volunteers placed its name tag beside the table materials.',
    ],
    whyWrong: [
      'the sentence shifts inconsistently between plural their and singular his when referring to the same volunteer',
      null,
      null,
    ],
  },
  'parapro-writing-skills-025': {
    correct: 'The students displayed the bright painted mural in the hallway.',
    distractors: [
      'Covered in bright paint, the hallway displayed the students’ large mural.',
      'The brightly painted students displayed the hallway mural after art class.',
      'Displaying in the hallway, bright paint covered the students’ class mural.',
    ],
  },
  'parapro-writing-skills-026': {
    correct: 'Because the rain ended, the concert began on time.',
    distractors: [
      'Because the heavy rain stopped before the outdoor band concert.',
      'The student musicians near the covered stage and front audience.',
      'While waiting patiently for the final afternoon weather update.',
    ],
    whyWrong: [
      'the subordinating conjunction because introduces a dependent clause that lacks an accompanying independent clause to complete the thought',
      null,
      null,
    ],
  },
  'parapro-writing-skills-028': {
    whyWrong: [
      null,
      null,
      'apostrophe placement must distinguish plural possession for multiple teachers from singular possession for one school principal',
    ],
  },
  'parapro-writing-skills-031': {
    correct: 'The workshop teaches participants to plan, organize, and assess.',
    distractors: [
      'The workshop teaches planning lessons, to organize materials, and assessment.',
      'The workshop teaches participants to plan lessons, organizing, and assessments.',
      'The workshop teaches lesson planning, to organize well, and how work is graded.',
    ],
  },
  'parapro-writing-skills-033': {
    correct: 'After the library extended hours, more students used study rooms.',
    distractors: [
      'The library extended its evening hours, more students used the study rooms.',
      'Extending its evening hours and more students began using the study rooms.',
      'More students, the library extended its hours, used the evening study rooms.',
    ],
  },
  'parapro-writing-skills-039': {
    whyWrong: [
      'vague directions would leave steps unclear and confusing rather than helping every group assemble the model cleanly on the first try',
      null,
      null,
    ],
  },
  'parapro-writing-skills-040': {
    correct: 'Adequate sleep supports student attention, memory, and wellness.',
    distractors: [
      'Many home bedrooms contain comfortable beds, reading lamps, and clocks.',
      'Middle-school students attend several different classes during each day.',
      'Some students prefer blue blankets while classmates prefer green quilts.',
    ],
  },
  'parapro-writing-skills-042': {
    correct: 'Composting cuts waste and builds rich soil for school gardens.',
    distractors: [
      'The cafeteria walls received fresh paint during the summer school break.',
      'Several students bring packed lunches from home inside reusable boxes.',
      'The following paragraph will list every after-school club alphabetically.',
    ],
  },
  'parapro-writing-skills-043': {
    correct: 'The 2025 city report notes an 8 percent drop in home water use.',
    distractors: [
      'Household water use fell by 8 percent, which somebody reported somewhere.',
      'The city report says usage shifted, proving every public campaign succeeds.',
      'Household water use remains important according to general water brochures.',
    ],
  },
  'parapro-writing-skills-044': {
    correct: 'After practice with Alex, Jordan said the schedule changed.',
    distractors: [
      'When Jordan met Alex after practice, they said it had changed.',
      'After practice, Jordan met Alex, and they discussed that thing.',
      'When they met after it, the schedule had changed according to them.',
    ],
  },
  'parapro-writing-application-012': {
    correct: 'Group related facts under topic sentences and order sections clearly.',
    distractors: [
      'Fix one minor spelling mistake in the closing paragraph and leave order alone.',
      'Insert additional interesting facts into random spots without reorganizing.',
      'Rewrite the entire student report personally without explaining the revisions.',
    ],
    whyWrong: [
      'correcting one minor spelling mistake leaves the report’s core organizational jumping between three topics completely unresolved',
      null,
      null,
    ],
  },
  'parapro-writing-application-013': {
    correct: 'What survey or usage data could show broader student need?',
    distractors: [
      'Can you repeat that you personally prefer quiet rooms three more times?',
      'Which unrelated school tradition could appear inside the next paragraph?',
      'Would deleting the main claim remove the need to locate solid evidence?',
    ],
  },
  'parapro-writing-application-014': {
    correct: 'Use short steps, familiar words, and clear point-of-need warnings.',
    distractors: [
      'Use long technical phrasing so the safety handout sounds formal and advanced.',
      'Place the most important safety warning inside a closing background paragraph.',
      'Assume young readers already recognize every specialized safety abbreviation.',
    ],
    whyWrong: [
      'long technical phrasing creates unnecessary reading barriers for younger children who need immediate, accessible safety directions',
      null,
      null,
    ],
  },
  'parapro-writing-application-015': {
    correct: 'Name one strong passage and one specific edit with clear reasons.',
    distractors: [
      'Replace the brief comment with a numeric score offering no explanation.',
      'List unrelated personal tastes that fall outside the assignment rubric.',
      'Rewrite every rough sentence so the original author makes no choices.',
    ],
  },
  'parapro-writing-application-016': {
    correct: 'Model sentence combining, then guide revising selected lines.',
    distractors: [
      'Require every sentence in the paragraph to keep identical short length.',
      'Delete repeated action verbs so the draft contains fewer repeated words.',
      'Join the whole paragraph into one long run-on sentence without commas.',
    ],
  },
  'parapro-writing-application-017': {
    correct: 'Revise paragraph order and reasoning before editing commas.',
    distractors: [
      'Fix one comma error and submit the draft without reviewing paragraph flow.',
      'Arrange the body paragraphs alphabetically instead of checking logical flow.',
      'Delete the main thesis claim so punctuation stays the sole remaining task.',
    ],
  },
  'parapro-writing-application-019': {
    correct: 'Despite those benefits, route-safety issues also need attention.',
    distractors: [
      'For the same reason, walking to school has no link to intersections.',
      'In conclusion, this essay will now introduce a separate first topic.',
      'For example, every walking benefit proves no traffic hazard exists.',
    ],
  },
  'parapro-writing-application-020': {
    correct: 'Which objects, sounds, or actions help readers picture it?',
    distractors: [
      'Can you repeat the adjective messy at the end of every sentence?',
      'Would deleting the room setting make the story easier to follow?',
      'Can you insert a fact about an unrelated building across town?',
    ],
  },
  'parapro-writing-application-021': {
    whyWrong: [
      null,
      null,
      'handwriting neatness alone does not address the rubric requirement to connect each supporting fact directly to the main claim',
    ],
  },
  'parapro-writing-application-022': {
    correct: 'Add headings, define acronyms, and state actions plainly.',
    distractors: [
      'Insert extra district acronyms so the family notice sounds formal.',
      'Move required family actions into a dense small-print footnote.',
      'Strip out section headings and merge every detail into one block.',
    ],
    whyWrong: [
      null,
      null,
      'merging every detail into one continuous block removes clear headings and makes scanning required actions much harder for families',
    ],
  },
};

function applyParaproBatch2Overrides(id, spec) {
  const override = overridesById[id];
  if (!override) return spec;
  const next = { ...spec };
  if (override.prompt) next.prompt = override.prompt;
  if (override.correct) next.correct = override.correct;
  if (override.distractors) next.distractors = override.distractors.slice();
  if (override.whyWrong) {
    next.whyWrong = spec.whyWrong.map((existing, index) => override.whyWrong[index] || existing);
  }
  return next;
}

module.exports = { applyParaproBatch2Overrides, overridesById };
