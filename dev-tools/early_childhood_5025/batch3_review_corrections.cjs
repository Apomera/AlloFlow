'use strict';

// Bounded independent-review corrections applied before the authored Batch 3
// artifact is generated. Answer positions, skills, domains, and difficulty are
// deliberately preserved.
const corrections = {
  'ec5025-b3-002': {
    prompt: 'A child points to a picture of a dog after the teacher says, “Show me dog,” but does not yet say the word. What does this performance demonstrate?',
  },
  'ec5025-b3-006': {
    prompt: 'A teacher wants children to understand how a spoken message becomes a written one. Which activity best targets that goal?',
  },
  'ec5025-b3-007': {
    correct: 'Ask what the character wanted, what got in the way, what the character tried, and how the situation was resolved.',
  },
  'ec5025-b3-013': {
    correct: 'The child needs practice blending a four-phoneme sequence into the complete spoken form.',
  },
  'ec5025-b3-018': {
    prompt: 'A child reads pet as pit. Which knowledge should the teacher check first?',
  },
  'ec5025-b3-021': {
    correct: 'Decoding is accurate, but automaticity and phrasing need support through repeated oral reading.',
    distractors: [
      'The pauses are enough to conclude that comprehension is weak, so passage questions should replace fluency practice.',
      'Because every word was identified correctly, fluency is adequate and repeated oral reading would add little.',
      'The passage is probably too easy, so increasing text complexity is the best next step for smoother reading.',
    ],
    rationale: 'Fluency includes accuracy, appropriate rate, and expression. Accurate but effortful reading indicates that decoding is available while automaticity and phrasing remain appropriate instructional targets.',
    whyWrong: [
      'infers weak comprehension from pausing alone even though the sample provides no direct comprehension evidence and shows accurate word identification.',
      'treats accuracy as the whole of fluency and overlooks the observed rate and phrasing difficulties that repeated oral reading can address.',
      'raises text demand before the child reads the current passage efficiently, which is unlikely to address the identified automaticity need.',
    ],
  },
  'ec5025-b3-022': {
    correct: 'Compare the response with the printed letters; preserved meaning plus a visual mismatch suggests context was favored over full orthographic processing.',
    distractors: [
      'Score the substitution as acceptable because preserving sentence meaning matters more than matching the specific printed word.',
      'Treat the substitution as weak comprehension because using a semantically related word shows that the sentence was misunderstood.',
      'Measure volume and rate on the substituted word to decide whether fluency, rather than word identification, caused the response.',
    ],
    rationale: 'A meaning-preserving substitution suggests that semantic context influenced the response, while the mismatch between house and home reveals incomplete attention to the printed word. Comparing all available orthographic information tests that interpretation.',
    whyWrong: [
      'confuses a semantically acceptable sentence with accurate word identification; the response still fails to match the author’s printed word.',
      'draws the opposite inference from the evidence because a related substitution shows some access to meaning, not its absence.',
      'samples delivery features that do not explain why the child selected a different printed word with related meaning.',
    ],
  },
  'ec5025-b3-024': {
    prompt: 'A child can name letters but gives inconsistent sounds when shown individual graphemes. Which assessment adds the most useful evidence?',
    correct: 'Present the letters in varied order without pictures and record the sound given for each.',
    distractors: [
      'Present the letters alphabetically and record whether the child can sing each printed letter name in sequence.',
      'Pair each letter with a familiar picture and record whether the child can name the pictured object.',
      'Show uppercase-lowercase pairs and record whether the child gives the same letter name for both forms.',
    ],
    rationale: 'Varied grapheme presentation without semantic cues directly samples letter-sound knowledge and reduces support from sequence memory or pictures. Letter-name matching supplies different evidence from the inconsistent sound responses in the stem.',
    whyWrong: [
      'samples rehearsed sequence and letter-name production rather than independent retrieval of the sound represented by each grapheme.',
      'measures object naming with a semantic cue, which can hide whether the child knows the grapheme-phoneme correspondence.',
      'checks recognition of letter-name identity across cases but does not resolve the reported inconsistency in sound production.',
    ],
  },
  'ec5025-b3-025': {
    correct: 'The text describes warmer conditions and less standing water even though no one poured or drained it.',
  },
  'ec5025-b3-026': {
    correct: 'Boxes labeled goal, obstacle, attempts, result, and response',
  },
  'ec5025-b3-028': {
    correct: '“Where could you add a speaker tag or punctuation so the conversation is easy to follow?”',
  },
  'ec5025-b3-029': {
    correct: 'Informational texts, traditional tales, poetry, and realistic fiction from varied cultures and perspectives',
  },
  'ec5025-b3-030': {
    correct: '“Our idea is complete, so I will add a period; the next idea begins with a capital letter.”',
  },
  'ec5025-b3-037': {
    correct: 'Build 12 counters in two groupings and compare the total quantities.',
  },
  'ec5025-b3-050': {
    correct: 'Rotate several examples and verify that each still has three straight sides and three vertices.',
  },
  'ec5025-b3-053': {
    prompt: 'On a north-up classroom map, the shelf is southeast of the rug. Which route moves from the rug to the shelf?',
    correct: 'Move diagonally down and to the right.',
    distractors: [
      'Move diagonally up and to the left.',
      'Move straight up without changing horizontal position.',
      'Move straight left without changing vertical position.',
    ],
    rationale: 'On a north-up map, southeast is represented by movement toward the bottom and right. The route therefore changes both vertical and horizontal position in the stated directions.',
    whyWrong: [
      'describes northwest movement, the direction opposite the shelf’s stated location from the rug.',
      'describes northward movement and omits the eastward component required to reach a southeast location.',
      'describes westward movement and omits the southward component required to reach a southeast location.',
    ],
  },
  'ec5025-b3-054': {
    distractors: [
      'A square belongs in a separate category because its equal sides prevent it from satisfying the rectangle definition.',
      'A rectangle has two right angles and two other angles, whereas a square has four right angles.',
      'Orientation determines the category; tilting the square creates the rectangle classification.',
    ],
    whyWrong: [
      'uses an exclusive-category misconception: equal side lengths add a property but do not remove the four right angles required of rectangles.',
      'states a false definition because a rectangle has four right angles rather than a mixture of right and nonright angles.',
      'uses orientation as a defining attribute even though a rigid rotation does not change side or angle relationships.',
    ],
  },
  'ec5025-b3-056': {
    correct: 'A dated photograph taken at the school during the period being studied',
  },
  'ec5025-b3-063': {
    distractors: [
      'The conflicting details show that one writer is unreliable, so the shorter account should be discarded before considering context.',
      'The longer entry should be treated as more reliable because greater detail by itself establishes historical accuracy.',
      'Because perspective affects every account, corroborating evidence cannot make one interpretation better supported than another.',
    ],
    whyWrong: [
      'treats disagreement as sufficient evidence of unreliability instead of examining each writer’s position, purpose, and supporting details.',
      'uses document length as a proxy for reliability without evaluating authorship, purpose, evidence, or corroboration.',
      'moves from acknowledging perspective to unsupported relativism even though source comparison can strengthen or weaken historical claims.',
    ],
  },
  'ec5025-b3-072': {
    correct: 'Under these tested conditions, the window group grew more than the cabinet group.',
  },
  'ec5025-b3-076': {
    correct: 'Greater tension lets the band vibrate faster, increasing the sound frequency.',
  },
  'ec5025-b3-079': {
    correct: 'These are patterned life-cycle stages, and the adult can reproduce to begin a new cycle.',
  },
  'ec5025-b3-081': {
    correct: 'Energy moves from grass to grasshopper to frog through feeding, with less available at each transfer.',
    distractors: [
      'Energy moves from grasshopper to grass because producers obtain energy by consuming animals beneath the soil.',
      'Energy returns from the frog to the Sun after decomposition, so it cycles through the chain unchanged.',
      'The arrows show which organism is larger and more important rather than the direction of energy transfer.',
    ],
    rationale: 'Food-chain arrows represent energy transfer from a resource to a consumer. Energy enters the system through producers, moves through feeding relationships, and becomes less available to organisms at successive trophic levels.',
    whyWrong: [
      'reverses the producer-consumer relationship because grass captures light energy rather than obtaining energy by eating an animal.',
      'confuses matter cycling with energy flow; energy is transformed and dissipated rather than returned to the Sun unchanged.',
      'misreads a transfer model as a ranking even though the arrows represent the direction of energy movement between organisms.',
    ],
  },
  'ec5025-b3-082': {
    correct: 'The amount of building material is capped at ten pieces.',
  },
  'ec5025-b3-087': {
    correct: 'Adjust target height and distance and offer stable balls while retaining aiming and controlled release for everyone.',
    distractors: [
      'Provide a seated coloring task about throwing while classmates practice aiming at the shared target.',
      'Keep the target and ball unchanged but require a standing release position before a throw can count.',
      'Record participation time but remove the aiming target and accuracy criterion from the child’s activity.',
    ],
    rationale: 'Changing access features while retaining aiming, force control, and release lets the child pursue the same meaningful motor objective as peers. The adaptation changes means of access rather than replacing the learning construct.',
    whyWrong: [
      'substitutes representation of throwing for actual object-control practice and excludes the child from the shared motor goal.',
      'makes an unnecessary posture the gate to participation even though standing is not essential to aiming or controlled release.',
      'removes the defining performance target and therefore changes the objective instead of adapting access to it.',
    ],
  },
  'ec5025-b3-088': {
    correct: 'The child may stop, move to a trusted adult, and report what happened; the teacher will respond without requiring proof of intent.',
    distractors: [
      'Ask the child to finish the current round, then discuss whether a rule misunderstanding made the interaction uncomfortable.',
      'Tell the child to avoid the older student and report back if the same incident happens again.',
      'Coach the child to confront the other student alone so the teacher can see whether peers can solve the concern themselves.',
    ],
    rationale: 'Safety instruction should validate discomfort, bodily autonomy, and prompt help seeking. The teacher should receive and assess the report; a child need not prove intent, continue an uncomfortable interaction, or manage a possible safety concern alone.',
    whyWrong: [
      'delays the child’s exit from an interaction reported as unsafe and makes continued participation a condition for adult support.',
      'sets a recurrence threshold that can delay assessment and support after the child has already reported a safety concern.',
      'shifts adult safeguarding responsibility to the child and may increase exposure to risk through an unsupported confrontation.',
    ],
  },
  'ec5025-b3-090': {
    prompt: 'A child has shown persistent withdrawal and loss of interest across several weeks. What should the teacher do?',
    correct: 'Document observable patterns, support the child, follow school communication procedures, and refer concerns without diagnosing.',
    distractors: [
      'Tell the family that the pattern confirms a depressive disorder and recommend a specific treatment plan.',
      'Wait for the child to request help before documenting, because emotional changes should remain outside school records.',
      'Promise complete confidentiality and keep the concern outside school channels unless the child authorizes disclosure.',
    ],
    rationale: 'Educators observe, support, document, and refer according to policy. Diagnosis and treatment planning belong to qualified professionals, while confidentiality must remain consistent with safeguarding and required school procedures.',
    whyWrong: [
      'treats classroom observations as a diagnosis and exceeds an educator’s role by prescribing clinical treatment.',
      'withholds timely documentation and support despite a sustained observable change that warrants appropriate school follow-up.',
      'makes a guarantee the teacher may be unable to keep when safety, mandated reporting, or established referral procedures apply.',
    ],
  },
  'ec5025-b3-091': {
    prompt: 'Children clap a steady pulse while chanting syllables with unequal durations. Which terms identify the two musical features?',
    correct: 'The steady pulse is beat, and the changing sound lengths create rhythm.',
    whyWrong: [
      'confuses timing with pitch and dynamics: pitch describes highness or lowness, and dynamics describes loudness rather than recurring pulse or duration patterns.',
      'imports visual-art concepts because texture and value describe visual relationships rather than musical pulse or the arrangement of sound lengths.',
      'uses dramatic elements because character and setting organize a story rather than naming musical pulse and duration patterns.',
    ],
  },
};

const correctionReview = [
  {
    id: 'ec5025-b3-002',
    issue: 'The stem named a printed word while the keyed rationale asserted that no print was presented.',
    resolution: 'Changed the response target to a picture so the stem, receptive-vocabulary key, distractor analysis, and rationale agree.',
  },
  {
    ids: ['ec5025-b3-021', 'ec5025-b3-022', 'ec5025-b3-024'],
    issue: 'The highest-priority warning docket combined lexical, extreme-distractor, answer-length, or thin-feedback signals.',
    resolution: 'Reauthored parallel response sets and misconception-specific feedback while preserving the verified keys and answer positions.',
  },
  {
    ids: ['ec5025-b3-054', 'ec5025-b3-063'],
    issue: 'Multiple distractors used absolute wording that made the keyed response conspicuously moderate.',
    resolution: 'Replaced the absolute distractors with plausible definition, source-evaluation, and reasoning misconceptions.',
  },
  {
    ids: ['ec5025-b3-081', 'ec5025-b3-087'],
    issue: 'The keyed response was substantially longer and more detailed than every distractor.',
    resolution: 'Rebalanced all four responses for grammatical and informational parallelism without changing the tested construct.',
  },
  {
    ids: ['ec5025-b3-006', 'ec5025-b3-007', 'ec5025-b3-013', 'ec5025-b3-018', 'ec5025-b3-025', 'ec5025-b3-026', 'ec5025-b3-028', 'ec5025-b3-029', 'ec5025-b3-030', 'ec5025-b3-037', 'ec5025-b3-050', 'ec5025-b3-053', 'ec5025-b3-056', 'ec5025-b3-072', 'ec5025-b3-076', 'ec5025-b3-079', 'ec5025-b3-082', 'ec5025-b3-088', 'ec5025-b3-090', 'ec5025-b3-091'],
    issue: 'The warning heuristic identified a stem term that appeared only in the keyed response; several response sets also relied on implausibly weak alternatives.',
    resolution: 'Removed avoidable lexical echoes and strengthened the most conspicuous distractors while retaining necessary disciplinary vocabulary and verified meanings.',
  },
];

module.exports = { corrections, correctionReview };
