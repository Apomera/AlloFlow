#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const docket = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'next_review_docket.json'), 'utf8'));
const prior = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'adjudication_batch_01.json'), 'utf8'));

const sources = {
  thalamus: {
    title: 'The olfactory thalamus: unanswered questions about the role of the mediodorsal thalamic nucleus in olfaction',
    organization: 'Frontiers in Neural Circuits review archived by PubMed Central, U.S. National Library of Medicine',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4585119/',
    credibility: 'This peer-reviewed neuroscience review directly distinguishes the lack of an obligatory first thalamic relay for olfaction from later olfactory processing involving mediodorsal and other thalamic nuclei.',
  },
  afferent: {
    title: 'Neural Circuits, Neuroscience, 2nd edition',
    organization: 'NCBI Bookshelf, U.S. National Library of Medicine',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK11154/',
    credibility: 'This government-hosted neuroscience textbook chapter explicitly defines afferent neurons as carrying information toward the central nervous system and distinguishes efferent and local-circuit neurons.',
  },
  pvt: {
    title: 'American Academy of Clinical Neuropsychology consensus conference statement on validity assessment',
    organization: 'American Academy of Clinical Neuropsychology, The Clinical Neuropsychologist, 35(6), 1053-1106 (2021)',
    url: 'https://www.tandfonline.com/doi/abs/10.1080/13854046.2021.1896036',
    credibility: 'This current professional consensus statement addresses performance and symptom validity assessment and recommends integrating multiple data sources rather than inferring malingering from one isolated indicator.',
  },
  conflict: {
    title: 'APA Dictionary of Psychology: realistic group conflict theory',
    organization: 'American Psychological Association',
    url: 'https://dictionary.apa.org/realistic-group-conflict-theory',
    credibility: 'The APA is the principal U.S. professional psychology association. Its dictionary entry directly defines the theory in terms of intergroup competition for scarce resources and resulting antagonism.',
  },
  sequential: {
    title: 'A general model for the study of developmental problems',
    organization: 'K. Warner Schaie, Developmental Review, 6(3), 213-229 (1986)',
    url: 'https://www.sciencedirect.com/science/article/pii/0273229786900146',
    credibility: "This is Schaie's peer-reviewed methodological treatment of sequential designs. It explains the age, cohort, and period framework while identifying dependencies that require assumptions for estimation.",
  },
  face: {
    title: 'APA Dictionary of Psychology: face validity',
    organization: 'American Psychological Association',
    url: 'https://dictionary.apa.org/face-validity',
    credibility: 'The APA dictionary directly defines face validity as apparent appropriateness to respondents or observers, regardless of whether evidence shows that the instrument is actually valid.',
  },
  ceiling: {
    title: 'Investigating Ceiling Effects in Longitudinal Data Analysis',
    organization: 'Psychological Methods article archived by PubMed Central, U.S. National Library of Medicine',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2778494/',
    credibility: 'This peer-reviewed methods article defines ceiling effects as score limitation at the top of a scale and explains how an easy test can obscure differences among high-performing examinees.',
  },
  paradoxical: {
    title: 'Paradoxical Intention: A Logotherapeutic Technique',
    organization: 'Viktor E. Frankl, American Journal of Psychotherapy, 14(3), 520-535 (1960)',
    url: 'https://psychiatryonline.org/doi/abs/10.1176/appi.psychotherapy.1960.14.3.520',
    credibility: "This is Frankl's original scholarly description of the logotherapeutic technique, making it the primary source for the construct rather than a later test-preparation paraphrase.",
  },
  desirability: {
    title: 'Objective Measurement of Subjective Phenomena: Social Desirability',
    organization: 'Office of Behavioral and Social Sciences Research, U.S. National Institutes of Health',
    url: 'https://obssr.od.nih.gov/sites/obssr/files/Objective-Measurement-of-Subjective-Phenomena.pdf',
    credibility: 'This federal behavioral-science research resource defines social desirability responding and grounds the construct in Paulhus and related measurement scholarship without claiming that one correction eliminates it.',
  },
  hipaa: {
    title: 'Minimum Necessary Requirement',
    organization: 'Office for Civil Rights, U.S. Department of Health and Human Services',
    url: 'https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/minimum-necessary-requirement/index.html',
    credibility: 'HHS Office for Civil Rights administers and enforces the HIPAA Privacy Rule. Its official guidance identifies the general standard, reasonable-efforts framework, and the disclosures to which it does not apply.',
  },
};

const revisions = [
  {
    legacyId: 'legacy-9c96c6a80e3c4b56', decision: 'minor-revision', sourceVerification: 'key-supported-with-olfactory-qualification',
    findings: ['The thalamus is the major relay to primary sensory cortex for most sensory modalities.', 'The legacy exception was too categorical: olfaction lacks an obligatory first thalamic relay, but thalamic nuclei still participate in later olfactory processing.'],
    sources: [sources.thalamus],
    prompt: 'Which statement best explains why the thalamus is commonly described as a sensory relay station?',
    choices: ['It directs most sensory signals toward relevant cortical regions before primary cortical processing.', 'It synthesizes the neurotransmitters used by every peripheral sensory receptor.', 'It converts all sensory signals into voluntary motor commands before they reach cortex.', 'It is the sole cortical center responsible for producing and understanding language.'], answerIndex: 0,
    rationale: 'The thalamus relays and modulates information for most sensory modalities on the way to primary sensory cortex. Primary olfactory input is the important qualification: it can reach primary olfactory cortex without an obligatory first thalamic relay, although thalamic nuclei contribute to later olfactory processing.',
    choiceRationales: ['Most visual, auditory, somatosensory, and gustatory pathways use thalamic relays before reaching their primary cortical targets, making this the best general description.', 'Neurotransmitters are synthesized by many neuron populations throughout the nervous system; universal transmitter production is not a thalamic relay function.', 'The thalamus participates in motor circuits, but sensory relay does not mean converting every input into a voluntary command before cortical processing.', 'Language depends on distributed cortical and subcortical networks. The thalamus is neither the sole language center nor itself a cortical language area.'],
  },
  {
    legacyId: 'legacy-7d31d7afba6d52da', decision: 'minor-revision', sourceVerification: 'key-supported',
    findings: ['The direction-of-information key is supported by authoritative neuroscience sources.', 'The original correct option was conspicuously longer and the inactive-cell distractor was not plausible.'],
    sources: [sources.afferent],
    prompt: 'In a simple somatic sensory pathway, which direction of information flow defines an afferent neuron?',
    choices: ['From a peripheral receptor toward the central nervous system', 'From the central nervous system toward a skeletal muscle', 'Between nearby neurons entirely within a local neural circuit', 'From an endocrine gland into the bloodstream toward a target organ'], answerIndex: 0,
    rationale: 'Afferent neurons carry information toward the central nervous system or toward a more central point in a defined circuit. In a basic somatic pathway, sensory receptors activate afferent fibers that enter the spinal cord or brain; efferent neurons carry commands away from the CNS.',
    choiceRationales: ['This is the defining direction for sensory afferents: signals travel from receptors in the periphery toward the spinal cord or brain.', 'Signals traveling from the CNS toward skeletal muscle are motor efferent signals, the directional counterpart to sensory afferent input.', 'A neuron confined to local processing within a circuit is generally described as an interneuron rather than as the peripheral afferent limb.', 'Hormones released into blood are endocrine signals. That route is not the neural direction denoted by the term afferent neuron.'],
  },
  {
    legacyId: 'legacy-d9dd68f0aad54083', decision: 'major-rewrite', sourceVerification: 'tool-purpose-supported-malingering-inference-overstated',
    findings: ['Performance validity tests provide evidence about the validity of obtained cognitive performance.', 'Malingering includes an intentional response pattern plus external incentive and cannot be established solely from one failed forced-choice measure.'],
    sources: [sources.pvt],
    prompt: 'During a neuropsychological evaluation, an examinee performs below a validated cutoff on one forced-choice performance validity test. What is the most defensible interpretation?',
    choices: ['The score is evidence that the cognitive test performance may be invalid and should be integrated with other validity and contextual data.', 'The score independently proves malingering and identifies the examinee\'s external incentive without further evidence.', 'The score establishes a neurological memory disorder because chance-level responding is a diagnostic sign of brain injury.', 'The score should be ignored because performance validity measures are unrelated to interpretation of cognitive test results.'], answerIndex: 0,
    rationale: 'A failed performance validity test raises concern that the obtained cognitive scores may not accurately represent ability. It does not, by itself, establish motive or the full construct of malingering. The evaluator should integrate multiple validity indicators, behavioral observations, history, incentives, and other relevant evidence.',
    choiceRationales: ['This treats the result as meaningful validity evidence while preserving the required integration of multiple indicators and contextual information.', 'A single failed measure cannot independently establish intentional deception, external incentive, and the broader malingering determination; those require converging evidence.', 'Below-cutoff or below-chance performance is not a diagnostic marker of neurological injury and should not be used to infer a specific brain disorder.', 'Performance validity affects whether cognitive scores can be interpreted as representative, so a valid indicator should neither be ignored nor treated as irrelevant.'],
  },
  {
    legacyId: 'legacy-6b4fe3baa8c8e1a6', decision: 'minor-revision', sourceVerification: 'key-supported',
    findings: ['Competition for scarce resources is the central theoretical mechanism.', 'The original alternatives were mostly implausible individual or biological explanations rather than competing social-psychological constructs.'],
    sources: [sources.conflict],
    prompt: 'Two groups develop increasingly hostile attitudes when they believe that only one group can obtain a limited pool of jobs and political influence. Which theory most directly explains this pattern?',
    choices: ['Realistic group conflict theory', 'Social identity theory', 'Contact hypothesis', 'Cognitive dissonance theory'], answerIndex: 0,
    rationale: 'Realistic group conflict theory predicts that intergroup antagonism can emerge when groups perceive that they are competing for scarce resources or incompatible outcomes. The scenario directly supplies that mechanism; it does not claim that resource competition is the only possible source of prejudice.',
    choiceRationales: ['The scenario explicitly centers on incompatible group interests and scarce jobs and influence, which is the defining mechanism of realistic group conflict theory.', 'Social identity processes can produce in-group favoritism without material competition, but the question asks for the theory most directly tied to scarce resources.', 'The contact hypothesis concerns conditions under which intergroup contact may reduce prejudice; it does not identify competition for limited resources as its core mechanism.', 'Cognitive dissonance concerns discomfort from inconsistent cognitions or actions within a person, not the stated structural competition between social groups.'],
  },
  {
    legacyId: 'legacy-2ab548707822a930', decision: 'major-rewrite', sourceVerification: 'design-combination-supported-disentanglement-overstated',
    findings: ['Sequential designs combine observations across cohorts and measurement occasions, incorporating cross-sectional and longitudinal comparisons.', 'Age, cohort, and period are mathematically dependent; the design permits informative contrasts but estimates require assumptions and do not automatically eliminate confounding.'],
    sources: [sources.sequential],
    prompt: 'What is the principal advantage and limitation of a cohort-sequential developmental design?',
    choices: ['It combines cohort and longitudinal comparisons, but separating age, cohort, and period effects still requires explicit assumptions.', 'It uses one age group at one occasion, so it removes cohort effects without following anyone over time.', 'It replaces quantitative measurement with interviews, so historical influences no longer affect the observations.', 'It follows one birth cohort indefinitely, which makes age and time-of-measurement statistically independent.'], answerIndex: 0,
    rationale: 'A cohort-sequential design samples multiple cohorts and follows them across multiple occasions, thereby combining cross-sectional and longitudinal contrasts. This can reveal patterns that either design alone would miss. However, age, cohort, and period are linearly dependent, so their separation depends on modeling choices and assumptions.',
    choiceRationales: ['This correctly states both the design advantage and its inferential boundary: richer overlapping comparisons improve analysis but do not create assumption-free identification.', 'One age group measured once is neither longitudinal nor sequential and cannot show within-person change or remove cohort explanations.', 'Sequential design concerns the organization of cohorts and occasions, not a switch from quantitative to qualitative methods; historical influences remain relevant.', 'Following only one birth cohort confounds aging with time of measurement rather than making those dimensions independent, which is why additional cohorts are sampled.'],
  },
  {
    legacyId: 'legacy-6d860a7a44eeb7c3', decision: 'major-rewrite', sourceVerification: 'construct-supported-duplicate-reauthored',
    findings: ['The keyed definition is supported, but face validity is an appearance judgment rather than empirical validity evidence.', 'The duplicate definition stem was replaced with a scenario and conceptually distinct measurement alternatives.'],
    sources: [sources.face],
    prompt: 'Applicants say that a firefighter-selection test seems relevant because its tasks visibly resemble activities performed on the job. This reaction is evidence of which property?',
    choices: ['Face validity', 'Predictive validity', 'Interrater reliability', 'Internal consistency'], answerIndex: 0,
    rationale: 'Face validity is the extent to which an instrument appears, on its surface, to measure what it is intended to measure. It may affect acceptance or engagement, but it is not evidence that scores actually predict performance, represent the construct, or meet another empirical validity criterion.',
    choiceRationales: ['The applicants are judging the test by its visible relevance, which is precisely an observation about apparent or face validity.', 'Predictive validity requires empirical evidence that scores forecast a later criterion such as job performance; resemblance alone does not demonstrate that relationship.', 'Interrater reliability concerns agreement among scorers or observers, not whether test takers believe the content looks appropriate.', 'Internal consistency concerns the relationships among items intended to measure a common construct, which cannot be inferred from surface resemblance to job tasks.'],
  },
  {
    legacyId: 'legacy-cb148e49e1080803', decision: 'major-rewrite', sourceVerification: 'construct-supported-duplicate-and-options-failed',
    findings: ['The ceiling-effect concept is supported.', 'The duplicate stem and mechanically padded distractors made the original answer identifiable without knowledge of measurement.'],
    sources: [sources.ceiling],
    prompt: 'A reasoning test is so easy for an advanced sample that many examinees earn the maximum score. What is the main measurement consequence?',
    choices: ['The test has reduced ability to distinguish among examinees at the high end.', 'The test produces a floor effect that exaggerates differences among low scorers.', 'The test necessarily gains predictive validity because most examinees answer correctly.', 'The test converts ordinal scores into interval scores at the maximum boundary.'], answerIndex: 0,
    rationale: 'When many examinees reach a test\'s upper limit, scores cluster at or near the maximum and the instrument cannot represent differences above that limit. This ceiling effect restricts observed variation and can obscure change or differences among high-performing examinees; harder items may extend the measured range.',
    choiceRationales: ['Once many examinees reach the maximum, stronger performances cannot be expressed in the observed score, reducing discrimination at the upper end.', 'A floor effect occurs when scores cluster near the minimum, usually because an instrument is too difficult for the sample; the direction here is the opposite.', 'A high proportion correct does not by itself improve criterion prediction and may weaken useful score variation when the items are too easy.', 'Reaching a scale boundary does not change the score scale\'s level of measurement or mathematically transform ordinal observations into interval data.'],
  },
  {
    legacyId: 'legacy-8d8261cd2b6090b8', decision: 'major-rewrite', sourceVerification: 'construct-supported-duplicate-and-options-failed',
    findings: ['Frankl describes paradoxical intention as intentionally wishing for or enacting the feared occurrence rather than continuing the struggle to prevent it.', 'The duplicate stem and artificial padded distractors were replaced with an applied example and credible treatment contrasts.'],
    sources: [sources.paradoxical],
    prompt: 'A client becomes increasingly anxious while trying to force sleep. A therapist asks the client, while safely resting in bed, to try to remain awake rather than struggle to fall asleep. Which technique is illustrated?',
    choices: ['Paradoxical intention', 'Systematic desensitization', 'Behavioral activation', 'Free association'], answerIndex: 0,
    rationale: 'Paradoxical intention asks a person to intentionally approach, wish for, or exaggerate the feared response instead of fighting to prevent it. In the classic insomnia example, trying to remain awake can interrupt anticipatory anxiety and the self-reinforcing struggle around sleep. It is not a universal or risk-free prescription.',
    choiceRationales: ['The therapist prescribes the intentional opposite of the client\'s anxious effort to force sleep, matching the defining paradoxical procedure.', 'Systematic desensitization pairs graded exposure to a fear hierarchy with relaxation or another incompatible response; no such hierarchy appears here.', 'Behavioral activation schedules reinforcing, value-consistent activities to address avoidance and low mood rather than prescribing the feared symptom or response.', 'Free association asks a client to verbalize thoughts with minimal censorship and does not involve deliberately wishing for or enacting the feared event.'],
  },
  {
    legacyId: 'legacy-e4d7dbdedfe1bce5', decision: 'minor-revision', sourceVerification: 'construct-supported-control-claim-qualified',
    findings: ['The core construct is responding in a way that presents oneself favorably according to perceived norms.', 'The legacy statement that particular scales or anonymity control the bias was too strong; such approaches may assess or reduce it but do not guarantee elimination.'],
    sources: [sources.desirability],
    prompt: 'In an identified interview about a stigmatized behavior, respondents systematically underreport the behavior because they want to appear socially acceptable. What is the most specific threat?',
    choices: ['Social desirability bias', 'Selection bias', 'Acquiescent responding', 'Random responding'], answerIndex: 0,
    rationale: 'Social desirability bias occurs when answers are shaped toward favorable self-presentation under perceived social norms rather than fully candid reporting. Confidentiality protections, indirect questioning, and dedicated measures may help assess or reduce this influence, but no single validity scale or administration choice automatically removes it.',
    choiceRationales: ['The directional underreporting is motivated by favorable presentation on a socially sensitive topic, matching social desirability bias.', 'Selection bias concerns who enters or remains in a sample and how that affects representation, not systematic self-presentation in answers from respondents.', 'Acquiescence is a tendency to agree with items regardless of content; the scenario instead describes answers changing in a socially favorable direction.', 'Random responding lacks a systematic direction or motive, whereas the responses here consistently minimize a stigmatized behavior to manage impressions.'],
  },
  {
    legacyId: 'legacy-aa0849b09f9f479e', decision: 'major-rewrite', sourceVerification: 'general-rule-supported-exceptions-required',
    findings: ['Official HHS guidance supports reasonable efforts to limit applicable uses, disclosures, and requests to the minimum necessary for the purpose.', 'The legacy statement omitted major exceptions, including provider treatment requests or disclosures, disclosures to the individual, authorized disclosures, HHS enforcement, and uses or disclosures required by law.'],
    sources: [sources.hipaa],
    prompt: 'Under the HIPAA Privacy Rule, which statement most accurately describes the minimum necessary standard?',
    choices: ['For uses, disclosures, and requests to which it applies, a covered entity generally takes reasonable steps to limit protected health information to what is needed for the purpose.', 'Every disclosure between health care providers for treatment must be limited to a summary rather than the complete record.', 'The standard prohibits disclosing protected health information to the individual unless a court first determines what is necessary.', 'The standard applies without exception whenever protected health information is used, requested, or disclosed for any reason.'], answerIndex: 0,
    rationale: 'The minimum necessary standard generally requires reasonable steps to limit applicable uses, disclosures, and requests for protected health information to what is needed for the intended purpose. It is not absolute. Official HHS guidance lists exceptions, including treatment disclosures or requests between providers and disclosures to the individual.',
    choiceRationales: ['This tracks the official reasonable-efforts standard while correctly limiting the statement to circumstances in which the requirement applies.', 'Provider disclosures and requests for treatment purposes are expressly outside the minimum necessary requirement; HIPAA does not impose a summary-only rule.', 'Disclosures to the person who is the subject of the information are also outside this standard and do not require the described court determination.', 'HHS lists multiple exceptions, including individual authorization, treatment, required-by-law disclosures, and specified enforcement-related disclosures, so the rule is not exceptionless.'],
  },
];

const docketById = new Map(docket.items.map((item) => [item.legacyId, item]));
const priorIds = new Set(prior.items.map((item) => item.legacyId));
const items = revisions.map((revision, index) => {
  const candidate = docketById.get(revision.legacyId);
  if (!candidate) throw new Error(`Missing docket candidate ${revision.legacyId}`);
  if (priorIds.has(revision.legacyId)) throw new Error(`Candidate already adjudicated in batch 01: ${revision.legacyId}`);
  return {
    adjudicationPosition: index + 1,
    legacyId: revision.legacyId,
    domainId: candidate.domainId,
    originalPrompt: candidate.prompt,
    originalAnswerIndex: candidate.answerIndex,
    decision: revision.decision,
    sourceVerification: revision.sourceVerification,
    findings: revision.findings,
    workflowStage: 'editorial-adjudicated-quarantine',
    learnerVisibleInNativeBank: false,
    independentExpertStatus: 'not-started',
    productionStatus: 'not-production-validated',
    revisedItem: { prompt: revision.prompt, choices: revision.choices, answerIndex: revision.answerIndex, rationale: revision.rationale, choiceRationales: revision.choiceRationales, sourceDetails: revision.sources },
  };
});

const expectedDomains = { biological: 2, 'cognitive-affective': 1, 'social-cultural': 1, lifespan: 1, assessment: 2, intervention: 1, research: 1, professional: 1 };
const actualDomains = Object.fromEntries(Object.keys(expectedDomains).map((domain) => [domain, items.filter((item) => item.domainId === domain).length]));
if (JSON.stringify(actualDomains) !== JSON.stringify(expectedDomains)) throw new Error(`Unexpected domain distribution: ${JSON.stringify(actualDomains)}`);
for (const item of items) {
  const q = item.revisedItem;
  if (q.choices.length !== 4 || q.choiceRationales.length !== 4) throw new Error(`${item.legacyId} must have four choices and explanations.`);
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) throw new Error(`${item.legacyId} has an invalid key.`);
  if (q.rationale.length < 140 || q.choiceRationales.some((text) => text.length < 90)) throw new Error(`${item.legacyId} has incomplete feedback.`);
  if (!q.sourceDetails.length || q.sourceDetails.some((source) => !source.title || !source.organization || !/^https:\/\//.test(source.url) || source.credibility.length < 120)) throw new Error(`${item.legacyId} has incomplete provenance.`);
}

const summary = {
  adjudicatedCandidates: items.length,
  minorRevision: items.filter((item) => item.decision === 'minor-revision').length,
  majorRewrite: items.filter((item) => item.decision === 'major-rewrite').length,
  promotedToNativeBank: 0,
  independentExpertValidated: 0,
  domainDistribution: actualDomains,
};
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: 'editorial-adjudication-complete-still-quarantined',
  purpose: 'Perform claim-level source verification and full option-quality review on a blueprint-spanning set of ten legacy EPPP candidates without treating editorial revision as independent expert approval.',
  reviewMethod: [
    'Verify the keyed concept against a current authoritative, official, or primary source.',
    'Identify material qualifications, overstatement, legal exceptions, and construct boundaries before rewriting.',
    'Require four plausible, conceptually distinct options and a substantive explanation for every option.',
    'Replace duplicate or definition-only prompts with applied scenarios where that improves construct sampling.',
    'Keep every revised candidate quarantined until independent qualified psychology, assessment, or legal review as appropriate.',
  ],
  summary,
  items,
};

const rows = items.map((item) => `| ${item.adjudicationPosition} | ${item.legacyId} | ${item.domainId} | ${item.decision} | ${item.sourceVerification} |`).join('\n');
const markdown = `# EPPP editorial adjudication batch 02\n\nGenerated: ${report.generatedAt}\n\n**Status: editorial adjudication complete; all items remain quarantined.**\n\n${report.purpose}\n\n## Outcome\n\n- ${summary.adjudicatedCandidates} candidates reviewed across all eight EPPP domains.\n- ${summary.minorRevision} required minor corrections.\n- ${summary.majorRewrite} required major rewriting.\n- ${summary.promotedToNativeBank} were promoted to the learner-facing bank.\n- Independent qualified review remains pending for every item.\n\n| # | Legacy ID | Domain | Decision | Source finding |\n| ---: | --- | --- | --- | --- |\n${rows}\n\n## Review method\n\n${report.reviewMethod.map((step) => `- ${step}`).join('\n')}\n\nThe JSON companion preserves the original prompt and key, item-specific findings, the complete revised item, explanation of every option, and full source provenance.\n`;

for (const outputRoot of [sourceRoot, deployRoot]) {
  fs.writeFileSync(path.join(outputRoot, 'adjudication_batch_02.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'adjudication_batch_02.md'), markdown, 'utf8');
}

console.log(`EPPP adjudication batch 02: ${summary.adjudicatedCandidates} reviewed, ${summary.minorRevision} minor revisions, ${summary.majorRewrite} major rewrites, 0 released.`);
