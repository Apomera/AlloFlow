#!/usr/bin/env node
'use strict';

const reviewWave = 'eppp-diagram-review-wave-07';
const reviewDate = '2026-07-28';

const sourceRecords = {
  apaAssessment: {
    title: 'APA Guidelines for Psychological Assessment and Evaluation',
    organization: 'American Psychological Association',
    url: 'https://www.apa.org/about/policy/guidelines-psychological-assessment-evaluation.pdf',
    whyReputable: 'APA guidance addresses referral questions, method selection, validity, response context, integration, and qualified communication of assessment findings.',
  },
  osepFba: {
    title: 'Using Functional Behavioral Assessments to Create Supportive Learning Environments',
    organization: 'Office of Special Education Programs, U.S. Department of Education',
    url: 'https://sites.ed.gov/idea/idea-files/using-functional-behavioral-assessments-to-create-supportive-learning-environments/',
    whyReputable: 'This federal technical resource describes observable behavior, antecedent and consequence evidence, hypothesis development, function-based planning, and ongoing monitoring.',
  },
  belmont: {
    title: 'The Belmont Report',
    organization: 'Office for Human Research Protections, U.S. Department of Health and Human Services',
    url: 'https://www.hhs.gov/ohrp/regulations-and-policy/belmont-report/read-the-belmont-report/index.html',
    whyReputable: 'The official Belmont text connects respect for persons with informed consent, beneficence with risk-benefit assessment, and justice with subject selection.',
  },
  autonomic: {
    title: 'The Autonomic Nervous System',
    organization: 'Neuroscience, 2nd edition; NCBI Bookshelf, U.S. National Library of Medicine',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK10854/',
    whyReputable: 'This academic neuroscience chapter supports the shared cholinergic preganglionic step, usual postganglionic transmitters, and the sympathetic sweat-gland exception.',
  },
  operant: {
    title: 'Learning: Theory and Research',
    organization: 'National Research Council; NCBI Bookshelf, U.S. National Library of Medicine',
    url: 'https://www.ncbi.nlm.nih.gov/books/n/nap10732/pdf/',
    whyReputable: 'This National Academies text defines positive and negative reinforcement and punishment by presentation or removal and the observed change in future behavior.',
  },
  dualProcess: {
    title: 'Dual-Process Theories of Higher Cognition: Advancing the Debate',
    organization: 'Perspectives on Psychological Science',
    url: 'https://doi.org/10.1177/1745691612460685',
    whyReputable: 'This peer-reviewed theoretical review distinguishes defining processing features from common correlates and cautions against treating two process types as two literal systems.',
  },
  yerkesDodson: {
    title: 'The relation of strength of stimulus to rapidity of habit-formation',
    organization: 'Journal of Comparative Neurology and Psychology',
    url: 'https://doi.org/10.1002/cne.920180503',
    whyReputable: 'The primary 1908 experiment establishes the historically bounded animal discrimination result behind later arousal-performance generalizations.',
  },
  executiveFunction: {
    title: 'Unity and Diversity of Executive Functions: Individual Differences as a Window on Cognitive Structure',
    organization: 'Cortex; PubMed Central, U.S. National Library of Medicine',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5104682/',
    whyReputable: 'This peer-reviewed review explains correlated but separable executive-function components and the task-impurity problem that constrains score interpretation.',
  },
  kelley: {
    title: 'The How and What of Why: Some Determinants and Consequences of Causal Attribution',
    organization: 'Journal of Personality and Social Psychology; author manuscript hosted by Brandeis University',
    url: 'https://www.brandeis.edu/psychology/zebrowitz/publications/PDFs/McArthur_1972.pdf',
    whyReputable: 'This classic empirical paper tests Kelley-style consensus, distinctiveness, and consistency information and documents the attribution patterns summarized in the map.',
  },
  asch: {
    title: 'Opinions and Social Pressure',
    organization: 'Scientific American; archival copy hosted by Columbia University',
    url: 'https://www.columbia.edu/cu/psychology/terrace/w1001/readings/asch.pdf',
    whyReputable: 'Asch reports the original conformity procedure and findings, allowing the diagram to separate the observed group-pressure result from broader claims.',
  },
  milgram: {
    title: 'Behavioral Study of Obedience',
    organization: 'Journal of Abnormal and Social Psychology',
    url: 'https://doi.org/10.1037/h0040525',
    whyReputable: 'Milgram reports the original obedience procedure and results, supporting a bounded study-level inference rather than a universal claim about persons.',
  },
  prisonCritique: {
    title: 'Debunking the Stanford Prison Experiment',
    organization: 'American Psychologist; PubMed, U.S. National Library of Medicine',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31380664/',
    whyReputable: 'This peer-reviewed archival analysis documents major procedural and interpretive problems that require especially cautious treatment of the Stanford Prison study.',
  },
  elaboration: {
    title: 'The Elaboration Likelihood Model of Persuasion',
    organization: 'Advances in Experimental Social Psychology',
    url: 'https://doi.org/10.1016/S0065-2601(08)60214-2',
    whyReputable: 'The foundational scholarly chapter describes elaboration as a continuum shaped by motivation and ability and distinguishes routes without claiming guaranteed outcomes.',
  },
  bystander: {
    title: 'The bystander-effect: a meta-analytic review on bystander intervention in dangerous and non-dangerous emergencies',
    organization: 'Psychological Bulletin; PubMed, U.S. National Library of Medicine',
    url: 'https://pubmed.ncbi.nlm.nih.gov/21534650/',
    whyReputable: 'This meta-analysis synthesizes 105 independent effect sizes and identifies emergency danger, perpetrator presence, and intervention costs as important moderators.',
  },
  cdcMilestones: {
    title: 'Developmental Monitoring and Screening',
    organization: 'Centers for Disease Control and Prevention',
    url: 'https://www.cdc.gov/act-early/about/developmental-monitoring-and-screening.html',
    whyReputable: 'CDC distinguishes ongoing milestone monitoring from standardized screening and diagnostic evaluation, supporting proportionate follow-up rather than diagnosis from one observation.',
  },
  piagetTask: {
    title: 'A-not-B performance in rhesus monkeys: partial failures on the object retrieval detour task',
    organization: 'Developmental Science; PubMed Central, U.S. National Library of Medicine',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3564966/',
    whyReputable: 'This peer-reviewed study illustrates how looking and reaching measures can produce different developmental performance, supporting task-demand qualifications.',
  },
  adolescentScience: {
    title: 'The Promise of Adolescence: Realizing Opportunity for All Youth',
    organization: 'National Academies of Sciences, Engineering, and Medicine',
    url: 'https://www.nationalacademies.org/read/25388/chapter/2',
    whyReputable: 'This consensus report integrates developmental, social, contextual, and structural evidence and rejects a simplistic single-cause immature-brain account of adolescent behavior.',
  },
  normalAging: {
    title: 'Normal Cognitive Aging',
    organization: 'Clinical Geriatric Medicine; PubMed Central, U.S. National Library of Medicine',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4015335/',
    whyReputable: 'This peer-reviewed clinical review distinguishes common age-related changes from pathologic decline and emphasizes variability across cognitive domains and individuals.',
  },
  niaAssessment: {
    title: 'Assessing Cognitive Impairment in Older Patients',
    organization: 'National Institute on Aging, National Institutes of Health',
    url: 'https://www.nia.nih.gov/health/health-care-professionals-information/assessing-cognitive-impairment-older-patients',
    whyReputable: 'This federal clinical resource emphasizes function, history, reversible contributors, screening limits, and fuller etiologic evaluation rather than diagnosis from one score.',
  },
  fdaClozapine: {
    title: 'FDA removes risk evaluation and mitigation strategy program for the antipsychotic drug clozapine',
    organization: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/drugs/drug-safety-and-availability/fda-removes-risk-evaluation-and-mitigation-strategy-rems-program-antipsychotic-drug-clozapine',
    whyReputable: 'The current FDA notice confirms the 2025 REMS removal while retaining severe-neutropenia warnings and label-directed absolute neutrophil count monitoring recommendations.',
  },
  lithiumLabel: {
    title: 'Lithium Carbonate Prescribing Information',
    organization: 'DailyMed, U.S. National Library of Medicine',
    url: 'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=803eab29-0d0a-4df0-b504-bcd85ec01ead&type=display',
    whyReputable: 'The official drug labeling supports level, renal, thyroid, hydration, sodium, toxicity, and interaction monitoring represented in the recognition-only safety map.',
  },
  synapses: {
    title: 'Chemical Synapses',
    organization: 'Neuroscience, 2nd edition; NCBI Bookshelf, U.S. National Library of Medicine',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK11009/',
    whyReputable: 'This academic neuroscience chapter describes calcium-triggered vesicle fusion, transmitter release, receptor binding, and the sequence of chemical synaptic transmission.',
  },
  transmitterTermination: {
    title: 'Physiology, Neurotransmitters',
    organization: 'StatPearls; NCBI Bookshelf, U.S. National Library of Medicine',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK539894/',
    whyReputable: 'This clinically reviewed reference describes receptor effects and signal termination through reuptake, enzymatic degradation, diffusion, and glial handling.',
  },
};

const commonChecks = {
  textAlternative: 'editorial-pass',
  reducedMotion: 'static-content-pass',
  keyboardDependency: 'no-keyboard-dependency',
  conceptAccuracy: 'assisted-editorial-pass-expert-pending',
  labelQuality: 'editorial-pass-minimum-12',
  sourceSupport: 'topically-aligned-reputable-source',
  expertReview: 'pending-independent-review',
  frameworkContext: 'current-source-and-model-context-editorial-pass',
};

function correction(item, sourceKeys) {
  const sourceDetails = sourceKeys.map((key) => sourceRecords[key]);
  const title = item.title ?? item.expectedOriginal.title;
  const description = item.description ?? item.expectedOriginal.description;
  const correctedSvgSha256 = item.correctedSvgSha256 || item.expectedOriginal.svgSha256;
  return {
    ...item,
    title,
    description,
    correctedSvgSha256,
    svgReplacements: item.svgReplacements || [],
    contentReplacements: item.contentReplacements || [],
    correctionSummary: item.correctionSummary || 'Verified the existing accessible static diagram against named sources and preserved its already-qualified learner-facing rendering behind an exact SVG fingerprint.',
    references: sourceDetails.map((source) => source.url),
    sourceDetails,
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewWave,
    reviewDate,
    checks: commonChecks,
    reviewNote: 'Assisted editorial and source-alignment review only. Independent qualified expert validation remains pending.',
  };
}

const corrections = [
  correction({
    placementId: 'diagram-placement-ch-3-section-11', chapterId: 'ch-3', sectionIndex: 11,
    expectedHeading: 'Choosing and Integrating Personality Assessment Methods', sourceFile: 'js/textbook_ch5_3.js',
    expectedOriginal: { title: 'Personality Assessment: From Referral to Inference', description: 'Accessible workflow from defining the decision through checking applicability and response quality to integrating findings, with a feedback path for invalid or out-of-scope evidence.', svgSha256: 'af0e7dd18c1fa5a42bd1de153ed1af0d1a9c60bf63ede8925f1b366ad88868e5' },
  }, ['apaAssessment']),
  correction({
    placementId: 'diagram-placement-ch-4-section-03', chapterId: 'ch-4', sectionIndex: 3,
    expectedHeading: 'ABC Recording: Observation Before Inference', sourceFile: 'js/textbook_ch4.js',
    expectedOriginal: { title: 'Function-Based Assessment Cycle', description: 'Accessible four-step cycle separating operational measurement, descriptive evidence, functional hypothesis or analysis, and intervention monitoring, with a reminder that an observed consequence is not automatically a reinforcer.', svgSha256: 'f302d5281ed4846043e8a9ba087b53461ee38f0384a8fe21ef51e00567249bfd' },
  }, ['osepFba']),
  correction({
    placementId: 'diagram-placement-ch-12-section-02', chapterId: 'ch-12', sectionIndex: 2,
    expectedHeading: 'The Belmont Report (1979)', sourceFile: 'js/textbook_ch12.js',
    expectedOriginal: { title: 'From Belmont Principles to Protocol Questions', description: 'Three-column concept map connecting Respect for Persons to informed and voluntary consent, Beneficence to risk-benefit assessment, and Justice to equitable subject selection. Each column ends with a protocol-review question.', svgSha256: '1fc849c08172dad857199bea17f6608dc81e4ac7436296f6665181153bb031fc' },
  }, ['belmont']),
  correction({
    placementId: 'diagram-placement-ch-23-section-03', chapterId: 'ch-23', sectionIndex: 3,
    expectedHeading: 'The Autonomic Nervous System', sourceFile: 'js/textbook_ch23.js',
    expectedOriginal: { title: '', description: 'Autonomic two-neuron pathways and major transmitter exceptions', svgSha256: 'c9bda76ed264cfe8427999b2e7ea0291ddfd2e79578748b4cbb1a98bbbd78885' },
    title: 'Autonomic Signaling Uses a Shared Preganglionic Step and Qualified Exceptions',
    description: 'All autonomic preganglionic neurons release acetylcholine at nicotinic receptors. Parasympathetic postganglionic neurons usually release acetylcholine at muscarinic receptors; most sympathetic postganglionic neurons release norepinephrine, with cholinergic sweat-gland and adrenal-medulla qualifications.',
    svgReplacements: [{ from: 'font-size="11"', to: 'font-size="12"', expectedCount: 1 }],
    correctedSvgSha256: '4d5d5f213b45c2e19976fd85504f0f715260c2a6b8d18d8971037dbf2e15371c',
    correctionSummary: 'Added a complete learner-facing title and alternative, retained the qualified transmitter exceptions, and raised the sole undersized visible label from 11 to 12 units.',
  }, ['autonomic']),
  correction({
    placementId: 'diagram-placement-ch-24-section-03', chapterId: 'ch-24', sectionIndex: 3,
    expectedHeading: 'Operant (Instrumental) Conditioning', sourceFile: 'js/textbook_ch24.js',
    expectedOriginal: { title: '', description: 'Classify operant contingencies by whether a stimulus is added or removed and whether the future behavior increases or decreases', svgSha256: '587fba0ab38ef4f1fe861b2c1447c9919744b9c9f207839e773e4e4bef969adf' },
    title: 'Operant Contingencies Depend on Environmental Change and Future Behavior',
    description: 'The matrix crosses whether a stimulus is added or removed with whether the future behavior increases or decreases. Positive and negative mean addition and removal, not good and bad; a consequence is a reinforcer or punisher only when its observed effect on later behavior supports that classification.',
    correctionSummary: 'Added a meaningful learner-facing title and expanded the alternative to define both axes, the nonmoral meaning of positive and negative, and the observed-effect boundary.',
  }, ['operant']),
  correction({
    placementId: 'diagram-placement-ch-26-section-03', chapterId: 'ch-26', sectionIndex: 3,
    expectedHeading: 'Dual-Process Theory (System 1 & System 2)', sourceFile: 'js/textbook_ch26.js',
    expectedOriginal: { title: '', description: 'Dual-process reasoning as interacting modes with a structured cross-check rather than two literal brain modules', svgSha256: '0e1f7b7cdc5be38cf15d1322054c40cbf26881afba898fd9363db517bc40f45c' },
    title: 'Type 1 and Type 2 Describe Interacting Processing Modes',
    description: 'Type 1 processing is typically rapid, automatic, and less dependent on working memory; Type 2 processing is typically deliberative and working-memory dependent. They are not two literal brain modules or a simple bad-versus-good ranking: either mode can err, and structured checks can improve reasoning.',
    correctionSummary: 'Added a learner-facing title and a full alternative that states the defining contrast while preventing literal-module and good-versus-bad misconceptions.',
  }, ['dualProcess']),
  correction({
    placementId: 'diagram-placement-ch-27-section-03', chapterId: 'ch-27', sectionIndex: 3,
    expectedHeading: 'Theories of Motivation', sourceFile: 'js/textbook_ch27.js',
    expectedOriginal: { title: '', description: 'Arousal and performance are related conditionally: task complexity, skill, stressor, and the measured outcome can shift the useful range', svgSha256: 'a7b9d319f64fea7bdf0c813df4ec1b3c44f35e10de054099468dbfa2aeeb4415' },
    title: 'Arousal-Performance Curves Are Conditional Heuristics',
    description: 'Two illustrative curves show performance peaking at different arousal ranges. The original evidence came from a specific mouse discrimination task, and task complexity, practiced skill, stressor, outcome measure, and individual differences can shift or change the pattern; the graph is not a universal optimum or prescription.',
    correctionSummary: 'Added a learner-facing title and expanded the alternative to state the original-study boundary and the variables that prevent a universal optimal-arousal claim.',
  }, ['yerkesDodson']),
  correction({
    placementId: 'diagram-placement-ch-29-section-02', chapterId: 'ch-29', sectionIndex: 2,
    expectedHeading: 'Executive Functions: Unity, Diversity & Task Impurity', sourceFile: 'js/textbook_ch29.js',
    expectedOriginal: { title: 'Executive-Function Inference Ladder', description: 'Accessible four-step diagram showing why a task score supports a component hypothesis only after task demands, validity, context, and converging evidence are considered.', svgSha256: '4378e8d5596c3fe8cfb8a033633403da49a9fbedcfc601e63ddde89f47083f04' },
  }, ['executiveFunction']),
  correction({
    placementId: 'diagram-placement-ch-30-section-02', chapterId: 'ch-30', sectionIndex: 2,
    expectedHeading: 'Causal Attribution: Person, Entity & Circumstance', sourceFile: 'js/textbook_ch30.js',
    expectedOriginal: { title: 'Kelley Covariation Inference Map', description: 'Accessible decision map showing canonical circumstance, person, and entity patterns while emphasizing that mixed evidence supports uncertainty or multiple causes.', svgSha256: 'f03172b5bda40b65fe005a2332d12000f2ea7263e505f164111a8b25b5fe28cc' },
  }, ['kelley']),
  correction({
    placementId: 'diagram-placement-ch-31-section-03', chapterId: 'ch-31', sectionIndex: 3,
    expectedHeading: 'Obedience, Roles & the Limits of a Study', sourceFile: 'js/textbook_ch31.js',
    expectedOriginal: { title: 'From Classic Study to Defensible Inference', description: 'Accessible evidence map separating an observed result, moderators and design features, and the bounded conclusion supported for Asch, Milgram, and the Stanford Prison study.', svgSha256: '6797c50bfc64e8e2e284b39f539fa37237da1faacbdfb54fa18e4e3cb8658b76' },
  }, ['asch', 'milgram', 'prisonCritique']),
  correction({
    placementId: 'diagram-placement-ch-32-section-02', chapterId: 'ch-32', sectionIndex: 2,
    expectedHeading: 'Attitudes, Dissonance & Persuasion', sourceFile: 'js/textbook_ch32.js',
    expectedOriginal: { title: 'Persuasion Inference Map', description: 'Accessible diagram showing how motivation, ability, message features, and context shape elaboration and why processing route does not guarantee an outcome.', svgSha256: 'c10fd1c729086459ec9f87f3b3f48d9d35c7f979c0836349961bcd6d845db46f' },
  }, ['elaboration']),
  correction({
    placementId: 'diagram-placement-ch-33-section-02', chapterId: 'ch-33', sectionIndex: 2,
    expectedHeading: 'Helping, Altruism & Bystander Action', sourceFile: 'js/textbook_ch33.js',
    expectedOriginal: { title: 'Helping Decision and Safety Map', description: 'Accessible diagram separating recognition, responsibility, response selection, safety, and action while showing contextual moderators.', svgSha256: 'ae5d6448ada0d62b2ddd576cb2b68e95c0327a7455b0d9990498648349f8cd09' },
  }, ['bystander']),
  correction({
    placementId: 'diagram-placement-ch-35-section-05', chapterId: 'ch-35', sectionIndex: 5,
    expectedHeading: 'Infant Perception, Action & Developmental Inference', sourceFile: 'js/textbook_ch35.js',
    expectedOriginal: { title: 'Developmental Observation-to-Action Ladder', description: 'Accessible diagram showing how observation, context, combined measurement, and proportionate action prevent a milestone from becoming a diagnosis.', svgSha256: 'd3dfa06e783b0953bcb7b29960de4a48dc33197223ae55513edcd63fbd639c3c' },
  }, ['cdcMilestones']),
  correction({
    placementId: 'diagram-placement-ch-37-section-02', chapterId: 'ch-37', sectionIndex: 2,
    expectedHeading: 'Piaget: Structures, Tasks & Modern Qualifications', sourceFile: 'js/textbook_ch37.js',
    expectedOriginal: { title: 'One Task, Multiple Developmental Demands', description: 'Accessible diagram showing that observed performance reflects interacting demands rather than a pure stage or single ability.', svgSha256: '29a82ce2c00dd8598409ccb557adb76265485dc666f6db6805702e23194ea00e' },
  }, ['piagetTask']),
  correction({
    placementId: 'diagram-placement-ch-38-section-04', chapterId: 'ch-38', sectionIndex: 4,
    expectedHeading: 'Adolescent Brain Development, Sleep & Risk Context', sourceFile: 'js/textbook_ch38.js',
    expectedOriginal: { title: 'Adolescent Decision Context Mixer', description: 'Accessible diagram showing how person, development, immediate context, and structural opportunity combine before a decision rather than a single immature-brain cause.', svgSha256: '2262cf713574841dc5fd7f0182e2c3dba07ae96e5693951e12b0a292ee839852' },
  }, ['adolescentScience']),
  correction({
    placementId: 'diagram-placement-ch-39-section-02', chapterId: 'ch-39', sectionIndex: 2,
    expectedHeading: 'Cognitive Aging, MCI & Dementia Assessment', sourceFile: 'js/textbook_ch39.js',
    expectedOriginal: { title: 'Cognitive Concern to Clinical Inference', description: 'Accessible flow diagram moving from concern through function, time course, reversible contributors, multiple cognitive domains, and etiologic evaluation.', svgSha256: '373ac3658a6e668d881cecb7f4bd5e144c6681c40d64b5d5b5acd8445fbb6744' },
  }, ['normalAging', 'niaAssessment']),
  correction({
    placementId: 'diagram-placement-ch-47-section-01', chapterId: 'ch-47', sectionIndex: 1,
    expectedHeading: 'Antipsychotics (Neuroleptics)', sourceFile: 'js/textbook_ch47.js',
    expectedOriginal: { title: 'Psychotropic Safety Recognition Map', description: 'A recognition—not prescribing—map linking antipsychotics to movement, metabolic, and severe neutropenia monitoring; serotonergic combinations to serotonin toxicity; lithium to level, renal, thyroid, hydration, and interaction monitoring; lamotrigine to serious-rash vigilance; and sedatives or stimulants to individualized safety monitoring.', svgSha256: '28d4533f63533b4a7e6c6a1b5c253d2ebbcfa7cd105565ef0c0914a8357d9b8f' },
    description: 'A recognition-only safety map, not a prescribing guide, linking antipsychotics to movement, metabolic, and severe-neutropenia monitoring; serotonergic combinations to serotonin toxicity; lithium to level, renal, thyroid, hydration, and interaction monitoring; lamotrigine to serious-rash vigilance; and sedatives or stimulants to individualized monitoring.',
    correctionSummary: 'Verified the recognition-only map and the surrounding 2025 clozapine REMS update against current FDA information, while preserving label-directed ANC and broader medication-safety boundaries.',
  }, ['fdaClozapine', 'lithiumLabel']),
  correction({
    placementId: 'diagram-placement-ch-49-section-01', chapterId: 'ch-49', sectionIndex: 1,
    expectedHeading: 'The Synaptic Cleft and Neurotransmission', sourceFile: 'js/textbook_ch49.js',
    expectedOriginal: { title: '', description: 'The Synapse: Neurotransmitter Release and Reuptake', svgSha256: '185ff451c149826e72cb3e5679ed86ffab3a66463c4fd8c80db1f5e5ed83e3f7' },
    title: 'Chemical Synaptic Transmission Has Multiple Control and Termination Points',
    description: 'An action potential opens presynaptic calcium channels, calcium triggers vesicle fusion and transmitter release, and transmitter binds receptors that can produce excitatory, inhibitory, or modulatory effects. Signaling ends through reuptake, enzymatic degradation, glial handling, or diffusion rather than one universal mechanism.',
    correctionSummary: 'Added a meaningful learner-facing title and expanded the alternative to cover release, receptor effects, and multiple signal-termination mechanisms without implying one universal pathway.',
  }, ['synapses', 'transmitterTermination']),
];

module.exports = { reviewWave, reviewDate, sourceRecords, commonChecks, corrections };
