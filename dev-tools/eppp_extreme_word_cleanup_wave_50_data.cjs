'use strict';

const reviewedAt = '2026-08-21';
const reviewWave = 'eppp-extreme-word-cleanup-wave-50';

// Replace absolute or categorical distractor wording with plausible,
// bounded alternatives. Answer positions and keyed answers remain fixed.
const revisions = [
  {
    id: 'eppp-v2-cognitive-affective-037', answerIndex: 2,
    key: 'Changing behavior or beliefs for consistency',
    choices: [
      'Increasing the tension between the conflicting beliefs',
      'Discounting information that makes the conflict salient',
      'Changing behavior or beliefs for consistency',
      'Holding the same beliefs while changing the interpretation of the conflict',
    ],
  },
  {
    id: 'eppp-v2-professional-008', answerIndex: 1,
    key: 'The standard consent process when immediate care is needed',
    choices: [
      'Broadly suspending ethical duties while the crisis is unfolding',
      'The standard consent process when immediate care is needed',
      'Setting aside competence obligations while providing urgent care',
      'Treating confidentiality as optional after the immediate danger has passed',
    ],
  },
  {
    id: 'eppp-v2-professional-011', answerIndex: 0,
    key: 'Disclose and correct the overcharge, then return the excess payment',
    choices: [
      'Disclose and correct the overcharge, then return the excess payment',
      'Delay addressing the discrepancy until the client raises a concern',
      'Address the billing error at the next routine administrative review',
      'Correct the amount after first obtaining the client\'s request for reimbursement',
    ],
  },
  {
    id: 'eppp-v2-professional-044', answerIndex: 1,
    key: 'Fairness and equal access to the benefits of established psychological contributions',
    choices: [
      'Applying a consistent procedure even when clients\' needs differ',
      'Fairness and equal access to the benefits of established psychological contributions',
      'Following jurisdictional requirements as the main definition of justice',
      'Using formal discipline as the primary response to an ethics concern',
    ],
  },
  {
    id: 'eppp-v2-professional-046', answerIndex: 3,
    key: 'Establish trust, uphold professional standards, and contribute professional time for little or no compensation',
    choices: [
      'Restrict professional conduct to local regulatory requirements and focus primarily on compliance',
      'Center ethical compliance on research-participant protections and give limited attention to clinical duties',
      'Increase revenue through high permissible fees for specialized services and limit uncompensated work',
      'Establish trust, uphold professional standards, and contribute professional time for little or no compensation',
    ],
  },
  {
    id: 'eppp-v2-professional-071', answerIndex: 0,
    key: 'Provide pretermination counseling and indicated referrals',
    choices: [
      'Provide pretermination counseling and indicated referrals',
      'End treatment with minimal transition planning once improvement begins',
      'Continue treatment while goals and progress are reviewed',
      'Add an administrative charge when treatment ends',
    ],
  },
  {
    id: 'eppp-v2-professional-074', answerIndex: 0,
    key: 'For substantial harm not suitably resolved informally',
    choices: [
      'For substantial harm not suitably resolved informally',
      'When a theoretical disagreement persists despite collegial discussion',
      'After sharing identifiable client details to support the complaint',
      'When the behavior has also been addressed through another formal process',
    ],
  },
  {
    id: 'eppp-v3-assessment-069', answerIndex: 2,
    key: 'Aptitude forecasts learning potential; achievement assesses acquired learning',
    choices: [
      'Aptitude tests assess personality traits, whereas achievement tests assess intelligence',
      'The labels refer to the same construct measured in different settings',
      'Aptitude forecasts learning potential; achievement assesses acquired learning',
      'Achievement tests usually have higher reliability than aptitude tests',
    ],
  },
  {
    id: 'eppp-v3-assessment-075', answerIndex: 0,
    key: 'Scores cluster at the upper or lower limit of the instrument',
    choices: [
      'Scores cluster at the upper or lower limit of the instrument',
      'Reliability rises because the scores occupy a narrow range',
      'A single examinee completes the assessment during standardization',
      'Items distinguish examinees across the full ability continuum',
    ],
  },
  {
    id: 'eppp-v3-cognitive-affective-047', answerIndex: 1,
    key: 'Automatic word reading interfering with controlled color naming',
    choices: [
      'Bottom-up perception overriding learned knowledge during a color-naming task',
      'Automatic word reading interfering with controlled color naming',
      'Deliberate word reading preceding color perception in the task',
      'Color naming proceeds with little influence from the printed word',
    ],
  },
  {
    id: 'eppp-v3-cognitive-affective-053', answerIndex: 2,
    key: 'Semantic analysis producing more durable memory than shallow analysis',
    choices: [
      'Structural analysis yielding more durable memory than semantic analysis',
      'Different processing levels yielding similar long-term memory traces',
      'Semantic analysis producing more durable memory than shallow analysis',
      'Repetition influencing retention even when processing depth varies',
    ],
  },
  {
    id: 'eppp-v3-cognitive-affective-063', answerIndex: 0,
    key: 'Competing information disrupts access to the target memory',
    choices: [
      'Competing information disrupts access to the target memory',
      'Limited storage capacity displaces earlier memories over time',
      'Unpredictable neural activity weakens memory traces during retrieval',
      'Memory traces become less accessible as time passes',
    ],
  },
  {
    id: 'eppp-v3-intervention-061', answerIndex: 2,
    key: 'Teaching clients and families about symptoms, treatment, coping, and self-management',
    choices: [
      'Providing reading material and checking understanding during follow-up',
      'Explaining the diagnosis while inviting questions and collaboration',
      'Teaching clients and families about symptoms, treatment, coping, and self-management',
      'Withholding treatment information until symptoms have stabilized',
    ],
  },
  {
    id: 'eppp-v3-professional-004', answerIndex: 3,
    key: 'Relevant education, training, supervised experience, consultation, study, or experience',
    choices: [
      'A fixed period of independent practice in the treatment area',
      'Board certification for each specialty addressed in treatment',
      'A doctoral degree paired with limited supervised experience',
      'Relevant education, training, supervised experience, consultation, study, or experience',
    ],
  },
  {
    id: 'eppp-v3-professional-005', answerIndex: 0,
    key: 'Strive to contribute some professional time for little or no compensation',
    choices: [
      'Strive to contribute some professional time for little or no compensation',
      'Offer free treatment when a prospective client\'s circumstances warrant it',
      'Reserve uncompensated services for work in public agencies',
      'Set a defined share of clinical hours aside for pro bono work',
    ],
  },
  {
    id: 'eppp-v3-professional-007', answerIndex: 2,
    key: 'Clarify the conflict and take reasonable steps to resolve it ethically',
    choices: [
      'Pause the disputed practice while seeking consultation about the conflict',
      'Follow the legal demand and document the unresolved ethics concern',
      'Clarify the conflict and take reasonable steps to resolve it ethically',
      'Apply personal values as the governing standard when law and ethics differ',
    ],
  },
  {
    id: 'eppp-v3-professional-008', answerIndex: 3,
    key: 'Promoting fair access and guarding against bias or unjust practices',
    choices: [
      'Give legal institutions authority over psychological decisions in contested cases',
      'Restrict services to clients with greater financial resources',
      'Use the same sanction for each ethical violation',
      'Promoting fair access and guarding against bias or unjust practices',
    ],
  },
  {
    id: 'eppp-v3-professional-012', answerIndex: 3,
    key: 'Psychologists must do no harm and strive to benefit those with whom they work',
    choices: [
      'Prioritize research activities when clinical demands compete',
      'Support client choice as one part of informed treatment planning',
      'Emphasize potential benefits when evaluating options with uncertain risks',
      'Psychologists must do no harm and strive to benefit those with whom they work',
    ],
  },
  {
    id: 'eppp-v3-professional-016', answerIndex: 3,
    key: 'Obtain appropriate consultation or training, or arrange a suitable referral',
    choices: [
      'Continue familiar treatment while monitoring the unfamiliar issue informally',
      'Study the issue independently before continuing care',
      'End services and leave the client to locate another provider',
      'Obtain appropriate consultation or training, or arrange a suitable referral',
    ],
  },
  {
    id: 'eppp-v3-professional-018', answerIndex: 1,
    key: 'Self-awareness, knowledge of diverse worldviews, and culturally responsive intervention skills',
    choices: [
      'Provide a consistent service model across clients despite contextual differences',
      'Self-awareness, knowledge of diverse worldviews, and culturally responsive intervention skills',
      'Set aside cultural background to reduce assumptions in assessment',
      'Accept referrals from clients with backgrounds similar to the psychologist\'s own',
    ],
  },
  {
    id: 'eppp-v3-professional-021', answerIndex: 0,
    key: 'Remain impartial, define the referral scope, and gather sufficient relevant data',
    choices: [
      'Remain impartial, define the referral scope, and gather sufficient relevant data',
      'Advocate for the parent who requested and funded the evaluation',
      'Rely on the child\'s interview while treating collateral data as potentially biased',
      'Base the custody opinion primarily on test scores and limit contextual inquiry',
    ],
  },
  {
    id: 'eppp-v3-professional-028', answerIndex: 3,
    key: 'Relative scientific or professional contribution to the published work',
    choices: [
      'Use alphabetical order when contributions are comparable',
      'Give greater credit to seniority within the department',
      'Credit the person who secured funding even when scientific contribution is limited',
      'Relative scientific or professional contribution to the published work',
    ],
  },
  {
    id: 'eppp-v3-professional-038', answerIndex: 1,
    key: 'Offer appropriate information about the research and correct known misconceptions',
    choices: [
      'Debrief when deception occurred and provide no further study information',
      'Offer appropriate information about the research and correct known misconceptions',
      'Debrief animal studies but use a different standard for human participants',
      'Provide detailed results promptly when the study design permits disclosure',
    ],
  },
  {
    id: 'eppp-v3-professional-049', answerIndex: 0,
    key: 'Supervisees progress toward autonomy and need changing supervisory support',
    choices: [
      'Supervisees progress toward autonomy and need changing supervisory support',
      'Structured supervision is useful mainly after independent licensure',
      'Supervisee growth provides limited guidance for supervisory planning',
      'Use a common supervisory structure while adjusting emphasis as skills change',
    ],
  },
  {
    id: 'eppp-v3-professional-056', answerIndex: 3,
    key: 'Self-awareness of one\'s own cultural background, biases, and limitations',
    choices: [
      'Develop expertise primarily within one\'s own cultural group',
      'Limit cross-cultural work until advanced specialization is complete',
      'Use the same intervention approach across clients despite background differences',
      'Self-awareness of one\'s own cultural background, biases, and limitations',
    ],
  },
  {
    id: 'eppp-v3-professional-057', answerIndex: 0,
    key: 'Avoid actions that create an unreasonable risk of client harm',
    choices: [
      'Avoid actions that create an unreasonable risk of client harm',
      'Maintain a neutral stance toward client goals and personal values',
      'Prioritize administrative efficiency when individual needs differ',
      'Aim for measurable benefit from each professional action',
    ],
  },
  {
    id: 'eppp-v3-professional-080', answerIndex: 3,
    key: 'Take reasonable precautions to protect confidential information obtained through or stored in any medium.',
    choices: [
      'Disclose confidential information when doing so would simplify coordination',
      'Protect paper records while treating electronic messages as a separate issue',
      'Treat confidentiality as a shared responsibility between clinician and client',
      'Take reasonable precautions to protect confidential information obtained through or stored in any medium.',
    ],
  },
];

module.exports = { reviewedAt, reviewWave, revisions };
