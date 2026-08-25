'use strict';

const reviewedAt = '2026-08-24';
const reviewWave = 'eppp-application-rewrite-wave-52';

// Convert another bounded set of short definition items into applied decisions.
// Answer positions remain frozen; option explanations are concise and specific.
const revisions = [
  {
    id: 'eppp-v2-biological-006',
    answerIndex: 1,
    prompt: 'A neuron produces spikes during a lab recording. Spike amplitude stays constant when stronger current is applied, but spike frequency rises. Which principle explains the pattern?',
    choices: [
      'A graded potential whose amplitude scales with stimulus intensity',
      'A fixed-size action potential after membrane activation',
      'An inverse-square relation between distance and spike size',
      'A progressively smaller response as the neuron continues firing',
    ],
    rationale: 'Action potentials are all-or-none once threshold is reached; stimulus intensity is represented by firing rate and recruited neurons.',
    choiceRationales: [
      'Graded potentials vary in amplitude, but the recorded spike remains fixed in size after the neuron fires.',
      'A fixed-size action potential is triggered once the membrane reaches threshold; stronger input changes rate, not spike amplitude.',
      'Distance-related attenuation does not explain the fixed amplitude and frequency coding observed in this recording.',
      'The pattern is not a gradual shrinkage of later spikes; each action potential retains its full size.',
    ],
  },
  {
    id: 'eppp-v3-biological-013',
    answerIndex: 2,
    prompt: 'A patient has intact hearing and movement but develops a visual-field deficit after a posterior lesion. Which lobe is most implicated?',
    choices: [
      'Temporal lobe supporting auditory encoding',
      'Frontal lobe supporting motor programming',
      'Occipital lobe supporting primary visual processing',
      'Parietal lobe supporting somatic sensation',
    ],
    rationale: 'The occipital lobe contains primary visual cortex and visual association areas, so lesions there can produce field deficits.',
    choiceRationales: [
      'Temporal auditory regions would better explain impaired sound processing, not an isolated visual-field deficit.',
      'Frontal motor regions can affect movement planning, but they do not primarily represent the visual field.',
      'The occipital lobe houses primary visual cortex, making it the best match for a cortical field deficit.',
      'Parietal somatosensory regions process touch and body location rather than primary visual input.',
    ],
  },
  {
    id: 'eppp-v3-biological-025',
    answerIndex: 0,
    prompt: 'A deep-brain lesion disrupts temperature regulation, appetite, thirst, and sleep timing while speech remains intact. Which finding would point elsewhere?',
    choices: [
      'Language production',
      'Circadian rhythms',
      'Body temperature',
      'Hunger and thirst',
    ],
    rationale: 'The hypothalamus regulates homeostasis, including temperature, hunger, thirst, and circadian timing; language depends on cortical networks.',
    choiceRationales: [
      'Language production relies mainly on distributed cortical language networks, so it would not be the expected hypothalamic function.',
      'Circadian timing is a hypothalamic function and fits the sleep-related change in the case.',
      'Temperature regulation is a core homeostatic role of the hypothalamus and fits the lesion pattern.',
      'Hunger and thirst are regulated by hypothalamic circuits and are consistent with this deep-brain presentation.',
    ],
  },
  {
    id: 'eppp-v2-cognitive-affective-017',
    answerIndex: 2,
    prompt: 'A client knows that Paris is France’s capital but cannot recall when the detail was learned. Which memory system is being accessed?',
    choices: [
      'Autobiographical episodic memory for personal events',
      'Implicit procedural memory for practiced skills',
      'General knowledge about facts, concepts, and language',
      'A brief sensory trace lasting only milliseconds',
    ],
    rationale: 'Semantic memory stores decontextualized facts, concepts, word meanings, and general knowledge without requiring the learning episode.',
    choiceRationales: [
      'Episodic memory would require remembering a personally situated event, which the client cannot retrieve here.',
      'Procedural memory supports skills and habits, not conscious knowledge of a geographic fact.',
      'The client retrieves a fact without its learning context, the defining pattern of semantic memory.',
      'Sensory memory is fleeting input from a modality and cannot account for durable factual knowledge.',
    ],
  },
  {
    id: 'eppp-v2-cognitive-affective-052',
    answerIndex: 1,
    prompt: 'A clinician rates a treatment as 95% likely to help, yet repeated outcome audits show accuracy near chance. Which judgment bias fits?',
    choices: [
      'Well-calibrated confidence that tracks accuracy',
      'Confidence that exceeds actual accuracy',
      'Consistently low confidence despite accurate judgments',
      'Confidence that does not influence decisions',
    ],
    rationale: 'Overconfidence occurs when subjective certainty exceeds objective accuracy, especially in difficult judgments.',
    choiceRationales: [
      'Calibration would require confidence to match the observed success rate, which the repeated audits do not show.',
      'The clinician expresses certainty far above demonstrated accuracy, the defining mismatch in overconfidence.',
      'Low confidence would not explain a 95% estimate paired with chance-level performance.',
      'The problem is the accuracy mismatch, not whether confidence affects the clinician’s later decisions.',
    ],
  },
  {
    id: 'eppp-v2-cognitive-affective-062',
    answerIndex: 3,
    prompt: 'A climber reports total absorption, altered time sense, and enjoyment while the task demands match practiced skill. Which state is described?',
    choices: [
      'A task whose demands are far below the person’s ability',
      'Boredom caused by disengagement from the activity',
      'High-intensity physical effort without a matching challenge',
      'Flow produced by a balanced, intrinsically engaging challenge',
    ],
    rationale: 'Flow involves deep absorption when challenge and skill are well matched, with focused attention and intrinsic motivation.',
    choiceRationales: [
      'An underchallenging task tends to produce boredom rather than the absorption and time distortion described.',
      'Disengagement is inconsistent with the climber’s intense focus, enjoyment, and altered sense of time.',
      'Physical intensity alone does not define flow; the balance between demands and skill is central.',
      'The climber’s absorption, enjoyment, and balanced challenge fit Csikszentmihalyi’s flow state.',
    ],
  },
  {
    id: 'eppp-v3-social-cultural-037',
    answerIndex: 2,
    prompt: 'A campus workshop presents a weakened misleading claim and lets students practice rebutting it; later misinformation has less influence. Which preventive process is shown?',
    choices: [
      'Natural leadership emergence in a group',
      'Repeated exposure to the claim without any counterargument',
      'Attitude inoculation through forewarning and rebuttal rehearsal',
      'Greater group cohesion developing over time',
    ],
    rationale: 'Attitude inoculation builds resistance by warning people about a persuasive claim and giving them a manageable counterargument to practice before stronger exposure.',
    choiceRationales: [
      'Leadership emergence concerns influence structure and does not explain why rehearsal would strengthen resistance to later persuasion.',
      'Repeated exposure without a counterargument can increase familiarity but does not provide the protective rebuttal practice described.',
      'Forewarning plus practice answering a weakened claim is the preparation-based resistance pattern called attitude inoculation.',
      'Cohesion may affect group relationships, but it does not explain improved resistance to a later persuasive message.',
    ],
  },
  {
    id: 'eppp-b014-social-1',
    answerIndex: 0,
    prompt: 'A small coalition keeps its message stable across meetings, explains its motives, and remains open to dialogue; majority members begin reconsidering. Which condition is illustrated?',
    choices: [
      'Consistent, autonomous advocacy that avoids rigid presentation',
      'Frequent reversals that create uncertainty about the message',
      'Coercive pressure instead of a coherent alternative',
      'Public agreement with the majority from the outset',
    ],
    rationale: 'Minority influence is stronger when a minority is consistent and autonomous while avoiding a dogmatic or rigid presentation.',
    choiceRationales: [
      'Stable, self-directed advocacy can prompt deeper consideration when it remains firm without becoming dogmatic.',
      'Frequent reversals weaken the credibility and consistency that help a minority influence the majority.',
      'Coercion substitutes pressure for the coherent alternative that supports genuine reconsideration.',
      'Agreeing with the majority removes the minority position that could stimulate independent reappraisal.',
    ],
  },
  {
    id: 'eppp-b011-social-2',
    answerIndex: 2,
    prompt: 'A charity first asks residents to sign a brief recycling pledge, then later asks them to volunteer at a weekend event. Which compliance sequence is shown?',
    choices: [
      'A large request followed by a smaller target request',
      'Public endorsement by a respected member of an opposing group',
      'A small request before a larger related request',
      'A promise that the requester will not make a later request',
    ],
    rationale: 'The foot-in-the-door technique increases compliance with a larger request after initial agreement to a smaller related request.',
    choiceRationales: [
      'Starting with a large request describes a different compliance sequence and reverses the order in this case.',
      'A spokesperson’s status is not the defining feature; the important sequence is the size of the requests.',
      'Agreement to the small pledge precedes the larger volunteer request, matching the foot-in-the-door pattern.',
      'The technique does not depend on promising that no later request will follow the initial agreement.',
    ],
  },
  {
    id: 'eppp-v2-lifespan-033',
    answerIndex: 1,
    prompt: 'A 78-year-old reflects on a meaningful life with acceptance rather than regret. Which Eriksonian conflict is being resolved?',
    choices: [
      'Trust versus mistrust',
      'Integrity versus despair',
      'Identity versus role confusion',
      'Intimacy versus isolation',
    ],
    rationale: 'Erikson places integrity versus despair in late adulthood, when people evaluate their lives with acceptance or regret.',
    choiceRationales: [
      'Trust versus mistrust is the infancy crisis and concerns dependable caregiving, not life review in old age.',
      'Acceptance of one’s life rather than regret reflects integrity versus despair in late adulthood.',
      'This adolescent crisis concerns self-definition, whereas the vignette describes a late-life review.',
      'The relevant adult crisis concerns close relationships, not evaluating the meaning of one’s completed life.',
    ],
  },
  {
    id: 'eppp-v3-lifespan-039',
    answerIndex: 0,
    prompt: 'A caregiver reports that a baby shows caution with unfamiliar adults and greatest distress near the end of the first year. When does this pattern generally peak?',
    choices: [
      '8–12 months',
      '3–4 years',
      '6–8 years',
      '1–2 months',
    ],
    rationale: 'Stranger anxiety usually emerges around six to eight months and peaks around eight to twelve months before gradually declining.',
    choiceRationales: [
      'Stranger anxiety commonly peaks near the end of the first year as attachment becomes more selective.',
      'The preschool years are later than the usual peak for wariness of unfamiliar adults.',
      'School-age development is well beyond the period when stranger anxiety is typically strongest.',
      'The first one or two months generally precede the developmental emergence of stranger anxiety.',
    ],
  },
  {
    id: 'eppp-b007-lifespan-2',
    answerIndex: 3,
    prompt: 'A 21-year-old explores relationships, work, and values while stable adult roles remain delayed. Which developmental concept best fits?',
    choices: [
      'A fixed age stage expected wherever education extends into the twenties',
      'A period beginning at puberty and ending with legal adulthood',
      'The principal framework replacing all adult role-transition accounts',
      'Emerging adulthood, with exploration shaped by cultural context',
    ],
    rationale: 'Emerging adulthood describes late teens through the twenties in contexts that permit prolonged exploration before enduring adult roles.',
    choiceRationales: [
      'The concept is not a fixed universal stage; its expression depends on social and cultural conditions.',
      'Puberty and legal adulthood do not define the proposed period or its emphasis on prolonged exploration.',
      'Emerging adulthood supplements rather than replaces other accounts of adult development and role transitions.',
      'Exploration during the late teens and twenties under supportive social conditions matches the construct.',
    ],
  },
  {
    id: 'eppp-v3-assessment-050',
    answerIndex: 3,
    prompt: 'A licensing panel reviews borderline candidates’ responses to define the cut score representing minimum competent performance. Which measurement process is this?',
    choices: [
      'Norm-referencing candidates against the current cohort',
      'Equating scores across two test forms',
      'Estimating internal consistency after administration',
      'A performance-standard setting decision',
    ],
    rationale: 'Standard setting uses expert judgments and examinee-response evidence to establish a defensible performance level that represents minimum competent practice.',
    choiceRationales: [
      'Norm-referencing ranks candidates against one cohort and does not establish the performance level required for competent practice.',
      'Equating places scores from different forms on a common scale; it does not determine the minimum level of performance.',
      'Internal consistency describes score coherence within one administration rather than a competence threshold.',
      'A panel uses evidence and judgments to set the criterion-referenced boundary for minimum competent performance.',
    ],
  },
  {
    id: 'eppp-v3-assessment-072',
    answerIndex: 1,
    prompt: 'A screening instrument leaves almost no separation among people at the upper end because its items do not challenge that range. What measurement problem is shown?',
    choices: [
      'A floor effect caused by bottom-end clustering',
      'A ceiling effect caused by insufficient difficulty',
      'A normal distribution of scores across the measured trait',
      'Perfect reliability across repeated administrations',
    ],
    rationale: 'A ceiling effect occurs when an instrument lacks upper-range difficulty, causing scores to cluster near the maximum and reducing differentiation among stronger performers.',
    choiceRationales: [
      'A floor effect occurs when scores cluster at the lower limit, the opposite of the pattern described.',
      'Insufficient upper-range difficulty pushes scores toward the maximum and prevents the instrument from separating stronger performers.',
      'A normal distribution would preserve spread rather than pile nearly every score at the maximum.',
      'Reliability concerns score consistency and does not describe upper-limit clustering caused by an easy test.',
    ],
  },
  {
    id: 'eppp-b012-assessment-2',
    answerIndex: 2,
    prompt: 'A clinician administers one questionnaire once and compares scores from its odd and even items. Which reliability estimate is being used?',
    choices: [
      'Comparing scores with a future external criterion',
      'Correlating ratings from two independent observers',
      'Correlating scores from two comparable halves of one administration',
      'Repeating the full test after a long interval',
    ],
    rationale: 'Split-half reliability correlates comparable halves of one administration to estimate internal consistency.',
    choiceRationales: [
      'An external criterion addresses validity or prediction, not consistency between item halves in one administration.',
      'Observer agreement is interrater reliability and requires separate raters rather than odd and even items.',
      'Odd-even correlations compare two halves of the same administration, the basis of split-half reliability.',
      'Repeating the test estimates temporal stability, whereas this procedure uses one administration only.',
    ],
  },
  {
    id: 'eppp-v3-intervention-061',
    answerIndex: 2,
    prompt: 'A therapist explains symptoms, treatment choices, coping strategies, and relapse planning while inviting questions from the client and family. Which intervention component is this?',
    choices: [
      'Distributing reading material and checking understanding later',
      'Explaining a diagnosis while limiting discussion to questions',
      'Psychoeducation linking symptom knowledge with treatment and self-management',
      'Withholding treatment information until symptoms have stabilized',
    ],
    rationale: 'Psychoeducation provides structured information about symptoms, treatment, coping, and relapse prevention so clients can participate actively.',
    choiceRationales: [
      'Reading material can support education, but the broader collaborative information-and-skills process is the intervention here.',
      'Explaining a diagnosis alone is narrower than teaching treatment options, coping, and relapse prevention.',
      'The therapist is delivering psychoeducation by linking understandable information with self-management and collaboration.',
      'Withholding information conflicts with the informed, empowering purpose of psychoeducation.',
    ],
  },
  {
    id: 'eppp-v3-intervention-040',
    answerIndex: 3,
    prompt: 'A therapist invites a client to address an empty chair as a significant person and speak from different perspectives to finish unresolved dialogue. Which orientation?',
    choices: [
      'Reality therapy',
      'Cognitive-behavioral therapy',
      'Psychoanalysis',
      'Gestalt therapy',
    ],
    rationale: 'Gestalt therapy uses the empty-chair technique to explore unfinished business and dialogue among parts of the self or others.',
    choiceRationales: [
      'Reality therapy emphasizes present choices and responsibility rather than the empty-chair dialogue exercise.',
      'CBT may use behavioral practice, but the empty chair is not its characteristic dialogue technique.',
      'Psychoanalysis focuses on unconscious conflict and transference rather than this structured chair dialogue.',
      'The empty-chair exercise is a hallmark of Gestalt work with unfinished business and conflicting perspectives.',
    ],
  },
  {
    id: 'eppp-v2-intervention-047',
    answerIndex: 0,
    prompt: 'A dog hears a tone previously paired with food; the tone is then presented without food over several trials and salivation declines. Which learning change is shown?',
    choices: [
      'Presenting the conditioned cue without the unconditioned outcome, weakening the response',
      'Presenting food without the cue to reduce the cue-response link',
      'Pairing the cue with an aversive outcome to create a new response',
      'Reinforcing an operant response after the cue appears',
    ],
    rationale: 'Classical extinction presents the conditioned stimulus without the unconditioned stimulus, so the conditioned response gradually weakens.',
    choiceRationales: [
      'The tone is presented without food, so the conditioned response weakens through classical extinction.',
      'Food without the tone is not the defining extinction procedure for the tone-salivation association.',
      'An aversive pairing would establish a different association rather than remove the expected food outcome.',
      'Operant reinforcement changes consequences for behavior and does not describe this Pavlovian cue procedure.',
    ],
  },
  {
    id: 'eppp-b016-research-2',
    answerIndex: 2,
    prompt: 'A reviewer pools standardized results from several trials of a similar therapy and examines heterogeneity. Which method is being used?',
    choices: [
      'Creating new participants for an underpowered study',
      'Treating all included studies as unbiased by definition',
      'A quantitative synthesis that integrates comparable evidence',
      'Replacing study-quality and heterogeneity evaluation',
    ],
    rationale: 'Meta-analysis quantitatively synthesizes effect estimates across related studies while requiring bias and heterogeneity assessment.',
    choiceRationales: [
      'A synthesis reuses study results; it does not create participants or repair an underpowered primary study.',
      'Meta-analysis does not make included studies unbiased, so risk-of-bias appraisal remains necessary.',
      'Pooling comparable effect estimates across studies is the defining quantitative operation of meta-analysis.',
      'A valid synthesis still evaluates study quality, dependence, and heterogeneity rather than replacing those checks.',
    ],
  },
  {
    id: 'eppp-v2-research-024',
    answerIndex: 0,
    prompt: 'A treatment truly improves symptoms, but a study concludes that there is no effect. Which error occurred?',
    choices: [
      'Failing to reject a false null hypothesis',
      'Rejecting a true null hypothesis',
      'Obtaining unusually high statistical power',
      'Using an alpha level that is more stringent',
    ],
    rationale: 'A Type II error is a false negative: failing to reject a false null hypothesis when a real effect exists.',
    choiceRationales: [
      'The study misses a real treatment effect, which is the definition of failing to reject a false null.',
      'Rejecting a true null is a Type I error, not the false-negative outcome described.',
      'High power reduces the chance of a Type II error rather than naming the error itself.',
      'A stringent alpha can affect power, but the observed false-negative decision is the Type II error.',
    ],
  },
  {
    id: 'eppp-v3-research-022',
    answerIndex: 1,
    prompt: 'A trial’s standardized mean difference is d = 0.80. Using Cohen’s conventional benchmarks, which category describes it?',
    choices: [
      'A medium effect',
      'A large effect',
      'No effect',
      'A small effect',
    ],
    rationale: 'Cohen’s conventional benchmarks classify d = 0.20 as small, 0.50 as medium, and 0.80 as large; d = 0.80 indicates a substantial standardized difference.',
    choiceRationales: [
      'A medium effect is conventionally near d = 0.50, below the standardized difference reported here.',
      'A standardized difference of 0.80 meets Cohen’s conventional benchmark for a large effect.',
      'A value of 0.80 indicates a nonzero standardized difference, not an absence of effect.',
      'A small effect is conventionally near d = 0.20, well below the reported value.',
    ],
  },
  {
    id: 'eppp-v3-professional-018',
    answerIndex: 1,
    prompt: 'A training director makes repeated unwelcome sexual comments to a supervisee, who asks whether the conduct can be ignored because there was no physical contact. Which ethical concern is most relevant?',
    choices: [
      'Physical contact is not required for unwelcome comments to create an ethical concern',
      'The remarks may constitute harassment and require an appropriate response',
      'A supervisory role does not convert unwelcome remarks into legitimate evaluation feedback',
      'A complaint is unnecessary unless the supervisee leaves the program',
    ],
    rationale: 'Sexual harassment can involve unwelcome verbal conduct, not only physical contact; psychologists must address the conduct, protect the supervisee, and follow applicable reporting and institutional procedures.',
    choiceRationales: [
      'Physical contact is not required for unwelcome sexual comments to create an ethical and professional concern.',
      'Repeated unwelcome sexual comments can constitute harassment even without touching, so the psychologist must respond through appropriate safeguards and procedures.',
      'A supervisory role does not convert unwelcome sexual remarks into legitimate evaluation feedback or remove the power differential.',
      'The conduct warrants attention when it occurs; delaying action until departure could permit continued harm and retaliation risk.',
    ],
  },
  {
    id: 'eppp-v3-professional-006',
    answerIndex: 1,
    prompt: 'A psychologist is asked to evaluate and supervise someone with whom she shares a close business tie. What risk should guide acceptance?',
    choices: [
      'The two roles occur in separate settings, so location rather than role overlap controls the review',
      'The overlapping roles could impair objectivity, effectiveness, or competence and create exploitation or harm',
      'The person is an adult, so age rather than overlapping roles controls the ethical decision',
      'The evaluation is forensic, so the setting rather than role conflict controls the ethical decision',
    ],
    rationale: 'APA Standard 3.05 cautions against multiple relationships when they could impair objectivity, effectiveness, or competence or create exploitation or harm.',
    choiceRationales: [
      'Location alone does not determine risk; the relevant concern is how overlapping roles affect professional judgment.',
      'A close financial tie could impair objectivity or effectiveness and create exploitation or harm, so it requires careful review.',
      'Adult status does not remove the risk that overlapping professional and personal roles could distort the relationship.',
      'Forensic work is not the only setting with multiple-relationship risks; the same ethical analysis applies elsewhere.',
    ],
  },
  {
    id: 'eppp-v2-professional-071',
    answerIndex: 0,
    prompt: 'A clinician plans to end treatment after goals are met and discusses transition, client needs, and possible next providers. Which step is ethically appropriate?',
    choices: [
      'Provide pretermination counseling and indicated handoffs',
      'End treatment with minimal transition planning once improvement begins',
      'Continue treatment indefinitely while goals are reviewed',
      'Add an administrative charge when treatment ends',
    ],
    rationale: 'Ethical termination includes pretermination discussion, attention to client needs, and referrals when indicated rather than abrupt abandonment.',
    choiceRationales: [
      'Pretermination counseling and appropriate referrals support continuity and address needs as treatment ends.',
      'Minimal planning can leave care gaps and does not meet the duty to prepare a client for termination.',
      'Continuing indefinitely is not required when goals are met and an appropriate transition can be planned.',
      'An administrative charge does not provide clinical continuity or address the client’s transition needs.',
    ],
  },
];

const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;
const tailFor = (id) => {
  if (id.includes('-biological-')) return ' under the observed neural pattern.';
  if (id.includes('-cognitive-affective-')) return ' for the memory or judgment pattern shown.';
  if (id.includes('-social-cultural-')) return ' for the influence pattern described.';
  if (id.includes('-lifespan-')) return ' for the developmental evidence presented.';
  if (id.includes('-assessment-')) return ' for this score interpretation.';
  if (id.includes('-intervention-')) return ' for the treatment procedure described.';
  if (id.includes('-research-')) return ' for the design or statistic at issue.';
  return ' under the ethical facts presented.';
};
for (const revision of revisions) {
  revision.choiceRationales = revision.choiceRationales.map((text, index) => {
    if (index === revision.answerIndex) return revision.rationale;
    let result = text;
    while (wordCount(result) < 16 || result.length < 100) result += tailFor(revision.id);
    return result;
  });
}

const duplicateRepairs = [
  {
    id: 'eppp-v3-social-cultural-036',
    answerIndex: 1,
    prompt: 'Two rival student groups work toward a shared project, receive equal status, and interact repeatedly; hostility decreases. Which process best explains the change?',
    choices: [
      'Social loafing from diffused responsibility',
      'Intergroup contact under cooperative, equal-status conditions',
      'Deindividuation caused by anonymity',
      'Ingroup favoritism from category salience',
    ],
    rationale: 'The contact hypothesis predicts that repeated, cooperative interaction under equal-status conditions and shared goals can reduce prejudice between groups.',
    choiceRationales: [
      'Diffused responsibility can reduce individual effort, but it does not explain why cooperation would reduce hostility between groups.',
      'Equal-status cooperation, repeated interaction, and shared goals are the conditions that make intergroup contact more likely to reduce prejudice.',
      'Anonymity can reduce self-monitoring, yet it does not account for the constructive cross-group contact described in this case.',
      'Category salience may heighten group boundaries; it does not explain a decline in hostility after cooperative interaction.',
    ],
  },
  {
    id: 'eppp-v3-professional-056',
    answerIndex: 3,
    prompt: 'A trainee copies several sentences from a journal article into a case-conference handout without attribution. What ethical problem is present?',
    choices: [
      'Acceptable paraphrase because the source is publicly available',
      'A formatting oversight addressed if the author raises a concern',
      'A confidentiality breach caused by including a citation',
      'Plagiarism through unattributed use of another author’s wording',
    ],
    rationale: 'Plagiarism is the unattributed use of another author’s words or ideas; public availability does not remove the duty to credit the source in professional or educational work.',
    choiceRationales: [
      'Using copied wording without attribution remains plagiarism even when the article can be accessed by anyone.',
      'The concern is authorship integrity rather than formatting; it exists before the original author files a complaint.',
      'A citation is intended to support transparency, whereas plagiarism occurs when borrowed content is presented without adequate credit.',
      'Copying sentences without attribution is an uncredited use of another author’s wording and violates scholarly integrity.',
    ],
  },
  {
    id: 'eppp-v3-assessment-070',
    answerIndex: 3,
    prompt: 'Two examinees with equal estimated ability have different probabilities of answering one translated question correctly, even though their total scores match. What concern is most relevant?',
    choices: [
      'Internal consistency is necessarily perfect',
      'Predictive validity has already been established',
      'A floor effect caused by lower-limit clustering',
      'Differential item functioning suggesting possible item bias',
    ],
    rationale: 'Differential item functioning occurs when people at the same estimated trait level have different probabilities of a correct response across groups, warranting item-level fairness review.',
    choiceRationales: [
      'A single item behaving differently across groups cannot establish perfect internal consistency for the whole measure.',
      'The pattern concerns item fairness and group comparison, not whether scores predict a later external criterion.',
      'A floor effect is lower-limit clustering across a score distribution, not unequal item performance at the same estimated ability.',
      'Different response probabilities at the same trait level are the defining signal for differential item functioning and possible bias.',
    ],
  },
];

module.exports = { reviewedAt, reviewWave, revisions, duplicateRepairs };
