#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const docket = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'next_review_docket.json'), 'utf8'));

const sources = {
  cerebellum: {
    title: 'Neuroanatomy, Cerebellar Dysfunction',
    organization: 'StatPearls Publishing via the National Library of Medicine NCBI Bookshelf',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK545251/',
    credibility: 'NCBI Bookshelf is a service of the U.S. National Library of Medicine. This clinically reviewed chapter directly describes ataxia, intention tremor, dysmetria, and impaired rapid alternating movement as manifestations of cerebellar dysfunction.',
  },
  antipsychotic: {
    title: 'Antipsychotic Medications',
    organization: 'StatPearls Publishing via the National Library of Medicine NCBI Bookshelf',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK519503/',
    credibility: 'This NCBI-hosted clinical review summarizes mechanisms, formulations, and adverse effects across first- and second-generation antipsychotics. It supports a class-level comparison while also making clear that individual agents differ.',
  },
  autonomic: {
    title: 'Chapter 4: Autonomic Nervous System',
    organization: 'Nursing Pharmacology, NCBI Bookshelf, National Library of Medicine',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK595003/',
    credibility: 'This government-hosted, professionally edited pharmacology chapter directly distinguishes sympathetic fight-or-flight activity from parasympathetic rest-and-digest activity and describes the relevant organ responses.',
  },
  synapse: {
    title: 'Physiology, Synapse',
    organization: 'StatPearls Publishing via the National Library of Medicine NCBI Bookshelf',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK526047/',
    credibility: 'This NCBI-hosted physiology review directly identifies reuptake, enzymatic destruction, and diffusion or clearance as signal-termination mechanisms at chemical synapses.',
  },
  ssri: {
    title: 'Selective Serotonin Reuptake Inhibitors',
    organization: 'StatPearls Publishing via the National Library of Medicine NCBI Bookshelf',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK554406/',
    credibility: 'This NCBI-hosted clinical review directly describes serotonin-transporter inhibition, reduced presynaptic reuptake, and the variable delay before patients experience therapeutic effects.',
  },
  antidepressantDelay: {
    title: 'How do antidepressants work? New perspectives for refining future treatment approaches',
    organization: 'The Lancet Psychiatry review archived by PubMed Central',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5410405/',
    credibility: 'This peer-reviewed synthesis distinguishes rapid monoamine effects from slower clinical improvement and reviews downstream neuroadaptive and neuroplastic explanations without reducing response to one fixed timetable.',
  },
  piaget: {
    title: 'APA Dictionary of Psychology: Piagetian theory',
    organization: 'American Psychological Association',
    url: 'https://dictionary.apa.org/piagetian-theory',
    credibility: 'The APA is the principal U.S. professional psychology association. Its dictionary entry clearly distinguishes preoperational centration from the more decentered, logical categorization associated with concrete operations.',
  },
  amygdala: {
    title: 'Understanding Emotions: Origins and Roles of the Amygdala',
    organization: 'Peer-reviewed review archived by PubMed Central, National Library of Medicine',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8228195/',
    credibility: 'This peer-reviewed neurobiological review describes both faster subcortical and slower cortical pathways to the amygdala and cautions against equating amygdala activity with a complete conscious emotion system.',
  },
  merton: {
    title: 'The Self-Fulfilling Prophecy',
    organization: 'Robert K. Merton, The Antioch Review, 8(2), 193-210 (1948)',
    url: 'https://doi.org/10.2307/4609267',
    credibility: 'This is Merton’s original scholarly article introducing the construct: an initially false definition evokes behavior that helps make the original expectation come true.',
  },
  elm: {
    title: 'The Elaboration Likelihood Model of Persuasion',
    organization: 'Richard E. Petty and John T. Cacioppo, Advances in Experimental Social Psychology, volume 19 (1986)',
    url: 'https://doi.org/10.1016/S0065-2601(08)60214-2',
    credibility: 'This is the original peer-reviewed theoretical chapter by the model’s developers. It explains elaboration as a continuum and the commonly described central and peripheral routes to persuasion.',
  },
};

const revisions = [
  {
    legacyId: 'legacy-472bd1fde5323679', decision: 'minor-revision', sourceVerification: 'key-supported',
    findings: ['The keyed cerebellum localization is supported.', 'The thalamus feedback was too absolute because thalamic structures participate in motor circuits and thalamic lesions can produce movement abnormalities.'],
    sources: [sources.cerebellum],
    prompt: 'A patient has intention tremor, limb ataxia, and difficulty performing rapid alternating movements. Which site of dysfunction best accounts for this pattern?',
    choices: ['Basal ganglia', 'Cerebellum', 'Hippocampus', 'Thalamus'], answerIndex: 1,
    rationale: 'The cluster of intention tremor, ataxia, and impaired rapid alternating movement is a classic cerebellar syndrome. Localization questions should rely on the complete pattern rather than treating any single sign as unique to one structure.',
    choiceRationales: [
      'Basal-ganglia disorders can produce tremor, rigidity, bradykinesia, or involuntary movement, but intention tremor with ataxia and impaired alternating movement more strongly localizes to the cerebellum.',
      'The cerebellum coordinates the timing, range, and precision of movement. Cerebellar dysfunction can produce ataxia, intention tremor, dysmetria, and dysdiadochokinesia.',
      'The hippocampus is central to declarative-memory formation and spatial memory. Hippocampal dysfunction does not best explain this coordinated motor syndrome.',
      'The thalamus participates in sensory and motor circuits, and lesions can cause movement abnormalities, but this three-sign pattern is more characteristic of cerebellar dysfunction.',
    ],
  },
  {
    legacyId: 'legacy-4ffd7f4bc310e740', decision: 'major-rewrite', sourceVerification: 'overgeneralized-class-claim',
    findings: ['The legacy key reflects a common teaching distinction but incorrectly presents all second-generation agents as pharmacologically uniform.', 'The legacy rationale overstates superiority for negative symptoms and understates variation in movement and metabolic risks.'],
    sources: [sources.antipsychotic],
    prompt: 'Which statement most accurately compares second-generation with first-generation antipsychotic medications?',
    choices: ['Every second-generation agent has an identical receptor profile.', 'Many second-generation agents combine dopamine D2 effects with prominent serotonin-receptor effects, but the exact pharmacology differs by drug.', 'Second-generation agents cannot cause extrapyramidal symptoms or tardive dyskinesia.', 'Second-generation agents are available only as long-acting injections.'], answerIndex: 1,
    rationale: 'Second-generation antipsychotics are often described by combined dopamine and serotonin receptor effects, especially D2 and 5-HT2A actions, but individual medications have meaningfully different receptor profiles. Class labels do not eliminate drug-specific efficacy, metabolic, movement, or formulation considerations.',
    choiceRationales: [
      'The class is heterogeneous. Individual second-generation medications differ in receptor affinity, intrinsic activity, adverse effects, indications, and formulation.',
      'This qualified statement captures the common serotonin-dopamine comparison while preserving the important fact that individual agents do not share one identical mechanism.',
      'Second-generation medications generally have lower rates of some extrapyramidal effects than high-potency first-generation agents, but they can still cause movement disorders and tardive dyskinesia.',
      'Several second-generation antipsychotics are oral medications, and some also have short-acting or long-acting injectable formulations; the class is not injection-only.',
    ],
  },
  {
    legacyId: 'legacy-8ddb1ba2696a3901', decision: 'minor-revision', sourceVerification: 'key-supported',
    findings: ['The sympathetic-system key is supported.', 'The rationale needed to distinguish sympathetic nerves from adrenal-medullary hormonal amplification rather than describing all effects as one neurotransmitter pathway.'],
    sources: [sources.autonomic],
    prompt: 'Which division of the autonomic nervous system primarily organizes the classic fight-or-flight response?',
    choices: ['Parasympathetic division', 'Sympathetic division', 'Somatic motor system', 'Enteric nervous system'], answerIndex: 1,
    rationale: 'The sympathetic division coordinates the classic fight-or-flight pattern, including increased cardiac output, vascular changes, bronchodilation, and mobilization of energy. Adrenal-medullary catecholamine release amplifies this coordinated autonomic response.',
    choiceRationales: [
      'Parasympathetic activity generally supports energy conservation and functions such as digestion and slowing the heart, so it does not primarily organize fight-or-flight.',
      'Sympathetic autonomic activation coordinates the widespread cardiovascular, respiratory, and metabolic changes required for a rapid response to threat.',
      'The somatic motor system controls voluntary skeletal-muscle activity. It participates in movement but does not organize the involuntary organ response described here.',
      'The enteric nervous system regulates gastrointestinal function. It interacts with autonomic pathways but does not coordinate the whole-body fight-or-flight response.',
    ],
  },
  {
    legacyId: 'legacy-4c56726a2d0aa1cd', decision: 'minor-revision', sourceVerification: 'key-supported-with-mechanism-correction',
    findings: ['Myelination is correctly identified as unrelated to transmitter clearance.', 'The original rationale blurred where enzymatic degradation occurs; the replacement avoids implying that monoamine oxidase normally acts freely in the synaptic cleft.'],
    sources: [sources.synapse],
    prompt: 'Which process does not terminate neurotransmitter signaling at a chemical synapse?',
    choices: ['Transporter-mediated reuptake', 'Enzymatic degradation', 'Diffusion or clearance away from receptors', 'Myelination of the axon'], answerIndex: 3,
    rationale: 'Chemical signaling is terminated by removing or inactivating transmitter through mechanisms such as transporter-mediated uptake, enzymatic degradation, and diffusion or other clearance. Myelin changes the speed and reliability of axonal conduction rather than clearing transmitter from a synapse.',
    choiceRationales: [
      'Presynaptic terminals and, for some transmitters, glial cells use transporters to remove transmitter from extracellular space and reduce receptor stimulation.',
      'Enzymes can inactivate transmitters, although the relevant enzymes and cellular locations vary by transmitter; acetylcholinesterase in the cleft is a familiar example.',
      'Transmitter can diffuse away or be cleared from the receptor environment, lowering its concentration and helping terminate the postsynaptic signal.',
      'Myelination insulates axons and supports action-potential conduction. It does not remove or chemically inactivate neurotransmitter after vesicular release.',
    ],
  },
  {
    legacyId: 'legacy-e9d89a716db14154', decision: 'major-rewrite', sourceVerification: 'fixed-timeline-not-defensible',
    findings: ['A single 2-6 week “full effect” answer collapses substantial variation across people, disorders, drugs, outcomes, and definitions of response.', 'The stronger learning objective is the difference between rapid transporter inhibition and slower clinical change.'],
    sources: [sources.ssri, sources.antidepressantDelay],
    prompt: 'Serotonin-transporter inhibition begins soon after an SSRI is taken, but meaningful clinical improvement may emerge later. Which explanation best accounts for this difference?',
    choices: ['SSRIs cannot reach the brain until several weeks of dosing have passed.', 'Serotonin must first be converted into dopamine before symptoms can change.', 'Clinical response depends partly on slower downstream neuroadaptive and neuroplastic processes, not transporter blockade alone.', 'Therapeutic response begins only after the medication permanently destroys serotonin transporters.'], answerIndex: 2,
    rationale: 'SSRIs inhibit the serotonin transporter relatively quickly, whereas clinical improvement can unfold over days or weeks and varies among patients and conditions. Contemporary explanations therefore examine slower receptor, network, gene-expression, and neuroplastic adaptations rather than treating one fixed week range as universal.',
    choiceRationales: [
      'SSRIs enter the central nervous system and affect serotonin transport well before several weeks have elapsed, so delayed brain access does not explain the clinical time course.',
      'Serotonin does not need to be converted into dopamine for SSRIs to work. These neurotransmitters have distinct synthetic pathways and signaling systems.',
      'Rapid transporter inhibition and slower clinical change occur on different timescales, supporting a role for downstream neuroadaptive and neuroplastic processes.',
      'SSRIs reversibly inhibit serotonin transporters; they do not need to permanently destroy SERT proteins before a therapeutic response can occur.',
    ],
  },
  {
    legacyId: 'legacy-fe894ced4d1f2f81', decision: 'minor-revision', sourceVerification: 'key-supported',
    findings: ['The SERT-inhibition key is supported.', 'The replacement avoids implying that increased synaptic serotonin alone fully explains every therapeutic effect.'],
    sources: [sources.ssri],
    prompt: 'What is the primary molecular action shared by selective serotonin reuptake inhibitors?',
    choices: ['Blocking reuptake of all monoamine neurotransmitters equally', 'Inhibiting the serotonin transporter and reducing presynaptic serotonin reuptake', 'Directly activating postsynaptic dopamine D2 receptors', 'Irreversibly inhibiting monoamine oxidase'], answerIndex: 1,
    rationale: 'SSRIs inhibit the serotonin transporter, or SERT, at presynaptic terminals and thereby reduce serotonin reuptake. This increases and prolongs serotonergic signaling, while the relationship between that immediate molecular action and later clinical response involves additional downstream processes.',
    choiceRationales: [
      'Equal blockade of serotonin, norepinephrine, and dopamine transporters would not be selective serotonin reuptake inhibition and better resembles broader monoamine actions.',
      'Inhibition of SERT is the defining shared molecular action of SSRIs and reduces the return of serotonin into the presynaptic terminal.',
      'Direct dopamine-receptor activation describes dopamine agonism, not the defining pharmacologic action of selective serotonin reuptake inhibitors.',
      'Irreversible inhibition of monoamine oxidase describes the action of some MAO inhibitors and is mechanistically distinct from blocking a membrane transporter.',
    ],
  },
  {
    legacyId: 'legacy-7bd76614bacda72b', decision: 'major-rewrite', sourceVerification: 'key-supported-under-classic-theory',
    findings: ['The intended answer is defensible only when explicitly framed as Piaget’s classic stage account.', 'The legacy claim that a sensorimotor child would not sort at all was too absolute, and stage performance is not perfectly uniform across tasks.'],
    sources: [sources.piaget],
    prompt: 'According to Piaget’s classic stage theory, a child focuses on one visible classification dimension and cannot yet coordinate two dimensions at once. Which stage best fits that pattern?',
    choices: ['Sensorimotor', 'Preoperational', 'Concrete operational', 'Formal operational'], answerIndex: 1,
    rationale: 'In Piaget’s classic account, preoperational thought is characterized by centration, or focusing on one salient aspect of a problem. Concrete operational thought is more decentered and supports logical categorization across multiple aspects. Real children’s performance can vary by task, context, and support.',
    choiceRationales: [
      'Sensorimotor development centers on knowledge through perception and action. The described symbolic classification limitation is more specifically associated with preoperational centration.',
      'Preoperational thought is classically described as centered on one salient dimension, making this the best answer within Piaget’s stage framework.',
      'Concrete operational thought includes decentration and logical classification of concrete objects, so coordinating more than one relevant feature becomes more likely.',
      'Formal operational thought supports abstract and hypothetical reasoning. The concrete sorting limitation described here is associated with a substantially earlier stage.',
    ],
  },
  {
    legacyId: 'legacy-7545f04892f6ac72', decision: 'major-rewrite', sourceVerification: 'popular-shorthand-overstated-as-literal-circuit',
    findings: ['“Amygdala hijack” is a popularized metaphor rather than a formal diagnosis or a complete neuroscientific model.', 'The legacy wording implied that rational cortical processing is categorically bypassed, which overstates a complex, interacting pathway model.'],
    sources: [sources.amygdala],
    prompt: 'The popular phrase “amygdala hijack” is best understood as shorthand for which process?',
    choices: ['Surgical removal of the amygdala to treat seizures', 'Permanent shutdown of all cortical processing during emotion', 'A rapid emotion- or threat-driven response that temporarily dominates slower deliberative regulation', 'Hippocampal consolidation of every emotionally significant memory'], answerIndex: 2,
    rationale: '“Amygdala hijack” is popular shorthand for a rapid emotion-driven response that can outpace or dominate slower deliberation. It should not be taught as a literal shutdown of the cortex or as a complete neural model: threat processing uses interacting subcortical and cortical pathways, and the amygdala is not itself a complete conscious emotion system.',
    choiceRationales: [
      'The phrase names a popular psychological metaphor, not an amygdalectomy or any other neurosurgical procedure.',
      'Emotional responding does not require a permanent or complete cortical shutdown. Cortical and subcortical pathways continue to interact during threat processing.',
      'This qualified description preserves the useful idea of rapid responding outpacing deliberation without treating the metaphor as a literal anatomical event.',
      'The hippocampus contributes to contextual and episodic memory, but “amygdala hijack” does not refer to universal consolidation of emotional memories.',
    ],
  },
  {
    legacyId: 'legacy-ad1c87057c3f8039', decision: 'major-rewrite', sourceVerification: 'construct-supported-distractors-failed',
    findings: ['The Merton definition and key are supported.', 'All three legacy distractors were implausible, synthetically padded, and easy to reject without knowing the construct.'],
    sources: [sources.merton],
    prompt: 'A supervisor incorrectly expects a new employee to perform poorly, provides less coaching and fewer opportunities, and the employee’s performance subsequently declines. Which concept best explains this sequence?',
    choices: ['Fundamental attribution error', 'Self-fulfilling prophecy', 'Cognitive dissonance', 'Social loafing'], answerIndex: 1,
    rationale: 'A self-fulfilling prophecy begins with an expectation that changes behavior in ways that help produce the expected outcome. Here, the supervisor’s initially unsupported belief changes the employee’s environment and contributes to the later decline.',
    choiceRationales: [
      'Fundamental attribution error is the tendency to overemphasize dispositional explanations for another person’s behavior while underweighting situational influences.',
      'The expectation changes the supervisor’s behavior, and that behavior helps create the predicted poor performance, matching the self-fulfilling-prophecy sequence.',
      'Cognitive dissonance is discomfort arising from inconsistent cognitions or behavior and the processes used to reduce that inconsistency.',
      'Social loafing is reduced individual effort when contributions are pooled in a group; the scenario instead centers on an expectation altering treatment and outcome.',
    ],
  },
  {
    legacyId: 'legacy-5444536ceb3e44b1', decision: 'major-rewrite', sourceVerification: 'core-model-supported-distractors-and-binary-framing-failed',
    findings: ['The central/peripheral distinction is supported, but ELM treats elaboration as a continuum rather than two completely sealed mechanisms.', 'The legacy distractors were implausible and could be rejected without understanding persuasion.'],
    sources: [sources.elm],
    prompt: 'One audience carefully evaluates argument quality, while another relies mainly on a speaker’s attractiveness because motivation and opportunity to scrutinize are low. Which model most directly explains this contrast?',
    choices: ['Elaboration likelihood model', 'Cognitive dissonance theory', 'Mere-exposure effect', 'Social identity theory'], answerIndex: 0,
    rationale: 'The elaboration likelihood model explains persuasion along a continuum of elaboration. Careful scrutiny of issue-relevant arguments characterizes relatively high elaboration, commonly called the central route; greater reliance on simple cues under low elaboration is commonly called the peripheral route.',
    choiceRationales: [
      'ELM directly addresses how motivation and ability influence the extent of message elaboration and the roles played by arguments and peripheral cues.',
      'Cognitive dissonance concerns tension from inconsistent cognitions or actions; it does not primarily distinguish careful argument scrutiny from cue-based persuasion.',
      'Mere exposure is increased liking after repeated contact with a stimulus and does not provide the central-versus-peripheral processing account in the scenario.',
      'Social identity theory explains self-concept and behavior through group membership, not the level of elaboration used to process a persuasive message.',
    ],
  },
];

const docketById = new Map(docket.items.map((item) => [item.legacyId, item]));
const items = revisions.map((revision, index) => {
  const candidate = docketById.get(revision.legacyId);
  if (!candidate) throw new Error(`Missing docket candidate ${revision.legacyId}`);
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
    revisedItem: {
      prompt: revision.prompt,
      choices: revision.choices,
      answerIndex: revision.answerIndex,
      rationale: revision.rationale,
      choiceRationales: revision.choiceRationales,
      sourceDetails: revision.sources,
    },
  };
});

for (const item of items) {
  const q = item.revisedItem;
  if (q.choices.length !== 4 || q.choiceRationales.length !== 4) throw new Error(`${item.legacyId} must have four choices and four explanations.`);
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) throw new Error(`${item.legacyId} has an invalid key.`);
  if (q.rationale.length < 140 || q.choiceRationales.some((text) => text.length < 90)) throw new Error(`${item.legacyId} has incomplete explanatory feedback.`);
  if (!q.sourceDetails.length || q.sourceDetails.some((source) => !source.title || !source.organization || !/^https:\/\//.test(source.url) || source.credibility.length < 120)) throw new Error(`${item.legacyId} has incomplete source provenance.`);
}

const summary = {
  adjudicatedCandidates: items.length,
  minorRevision: items.filter((item) => item.decision === 'minor-revision').length,
  majorRewrite: items.filter((item) => item.decision === 'major-rewrite').length,
  promotedToNativeBank: 0,
  independentExpertValidated: 0,
};
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: 'editorial-adjudication-complete-still-quarantined',
  purpose: 'Perform claim-level source verification and option-quality review on the ten lowest-automated-risk candidates without treating automated triage or editorial revision as independent expert approval.',
  reviewMethod: [
    'Verify the keyed concept against a current authoritative or primary source.',
    'Check whether the original wording overstates, universalizes, or dates the supported claim.',
    'Require four plausible, conceptually distinct options and an explanation for every option.',
    'Replace vague source labels with full source names, organizations, stable URLs, and credibility rationales.',
    'Keep every revised candidate quarantined until independent qualified psychology/assessment review.',
  ],
  summary,
  items,
};

const rows = items.map((item) => `| ${item.adjudicationPosition} | ${item.legacyId} | ${item.domainId} | ${item.decision} | ${item.sourceVerification} |`).join('\n');
const markdown = `# EPPP editorial adjudication batch 01

Generated: ${report.generatedAt}

**Status: editorial adjudication complete; all items remain quarantined.**

${report.purpose}

## Outcome

- ${summary.adjudicatedCandidates} candidates reviewed at claim and option level.
- ${summary.minorRevision} required minor corrections.
- ${summary.majorRewrite} required major rewriting despite having no automated docket risks.
- ${summary.promotedToNativeBank} were promoted to the learner-facing bank.
- Independent qualified psychology/assessment review remains pending for every item.

| # | Legacy ID | Domain | Decision | Source finding |
| ---: | --- | --- | --- | --- |
${rows}

## Review method

${report.reviewMethod.map((step) => `- ${step}`).join('\n')}

The JSON companion contains the original prompt, specific findings, revised prompt and choices, answer key, full rationale, four option explanations, and complete source provenance for each candidate.
`;

for (const outputRoot of [sourceRoot, deployRoot]) {
  fs.writeFileSync(path.join(outputRoot, 'adjudication_batch_01.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'adjudication_batch_01.md'), markdown, 'utf8');
}

console.log(`EPPP adjudication batch 01: ${summary.adjudicatedCandidates} reviewed, ${summary.minorRevision} minor revisions, ${summary.majorRewrite} major rewrites, 0 released.`);
