#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const docket = readJson(path.join(sourceRoot, 'next_review_docket.json'));
const priorIds = new Set(['01', '02', '03', '04', '05', '06'].flatMap((batch) => readJson(path.join(sourceRoot, `adjudication_batch_${batch}.json`)).items.map((item) => item.legacyId)));

const sources = {
  dtiPitfalls: {
    title: 'Does diffusion MRI tell us anything about the white matter? An overview of methods and pitfalls',
    organization: 'Lauren J. O\'Donnell and Ofer Pasternak, Schizophrenia Research, 161(1), 133-141 (2015)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4277728/',
    credibility: 'This peer-reviewed methods review explains what diffusion MRI signals measure and why fractional anisotropy should not be treated as a direct or specific measure of white-matter integrity, myelination, or axon count.',
  },
  dtiMethods: {
    title: 'An introduction to diffusion tensor image analysis',
    organization: 'Lauren J. O\'Donnell and Carl-Fredrik Westin, Neurosurgery Clinics of North America, 22(2), 185-196 (2011)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3163395/',
    credibility: 'This peer-reviewed tutorial describes DTI as a voxel-level model of the magnitude and directionality of water diffusion and documents important limits such as crossing fibers and model dependence.',
  },
  weaponMeta: {
    title: 'Of guns and geese: A meta-analytic review of the weapon focus literature',
    organization: 'Jonathan M. Fawcett, Elin M. Russell, Kathy A. Peace, and Jonathan Christie, Psychology, Crime & Law, 19(1), 35-66 (2013)',
    url: 'https://doi.org/10.1080/1068316X.2011.599325',
    credibility: 'This peer-reviewed meta-analysis synthesizes the weapon-focus literature and directly evaluates memory for concurrent event details while identifying methodological and situational moderators of the effect.',
  },
  weaponReplication: {
    title: 'Four (and a Half) Preregistered Failures to Replicate the Weapon Focus Effect in Online Samples',
    organization: 'John T. West, Neil W. Mulligan, and Brian H. Bornstein, Psychology, Public Policy, and Law (2025)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/41234291/',
    credibility: 'These four preregistered experiments with a combined sample of 1,316 found weak or absent effects in their online paradigms, providing current evidence against teaching weapon focus as inevitable or context-free.',
  },
  crenshaw: {
    title: 'Demarginalizing the Intersection of Race and Sex: A Black Feminist Critique of Antidiscrimination Doctrine, Feminist Theory and Antiracist Politics',
    organization: 'Kimberlé Crenshaw, University of Chicago Legal Forum, 1989(1), Article 8, 139-167',
    url: 'https://ideas.wharton.upenn.edu/wp-content/uploads/2018/07/Crenshaw-1989.pdf',
    credibility: 'This is Crenshaw\'s primary 1989 legal scholarship introducing the term intersectionality to analyze how single-axis frameworks obscure Black women\'s experiences in law and social analysis.',
  },
  tomCrossCultural: {
    title: 'Early false-belief understanding in traditional non-Western societies',
    organization: 'H. Clark Barrett and colleagues, Proceedings of the Royal Society B, 280(1755), 20122654 (2013)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3574387/',
    credibility: 'This peer-reviewed cross-cultural study compares elicited and spontaneous-response false-belief tasks and demonstrates that age of success depends on task demands and sociocultural context.',
  },
  tomReview: {
    title: 'How children come to understand false beliefs: A shared intentionality account',
    organization: 'Michael Tomasello, Proceedings of the National Academy of Sciences, 115(34), 8491-8498 (2018)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6112688/',
    credibility: 'This developmental review distinguishes multiple theory-of-mind abilities and summarizes the classic emergence of explicit first-order false-belief success around ages four to five without equating it with the entire construct.',
  },
  wiscPearson: {
    title: 'WISC-V Coding and Symbol Search in Digital Format: Reliability, Validity, Special Group Studies, and Interpretation',
    organization: 'Pearson Clinical Assessment, Q-interactive Technical Report 2 (2016)',
    url: 'https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/q-interactive/002-Qi-Processing-Speed-Tech-Report_FNL2.pdf',
    credibility: 'Pearson publishes and standardizes the WISC-V. This official technical report describes Coding and Symbol Search, their contribution to the Processing Speed Index, and the perceptual, attention, and motor demands relevant to interpretation.',
  },
  sirsPar: {
    title: 'Structured Interview of Reported Symptoms, Second Edition (SIRS-2)',
    organization: 'PAR, Inc., official instrument description and professional test publisher',
    url: 'https://www.parinc.com/products/SIRS-2',
    credibility: 'PAR publishes the SIRS-2 and describes its intended structured evaluation of reported symptoms and feigning classifications, making this the authoritative source for the instrument\'s scope and outputs.',
  },
  validityConsensus: {
    title: 'American Academy of Clinical Neuropsychology (AACN) 2021 consensus statement on validity assessment: Update of the 2009 AACN consensus conference statement on neuropsychological assessment of effort, response bias, and malingering',
    organization: 'American Academy of Clinical Neuropsychology, The Clinical Neuropsychologist, 35(6), 1053-1106 (2021)',
    url: 'https://doi.org/10.1080/13854046.2021.1896036',
    credibility: 'This specialty consensus statement explains that conclusions about invalid responding and malingering require converging, context-sensitive evidence rather than a single score or instrument used as a stand-alone detector.',
  },
  baReview: {
    title: 'Behavioural activation therapy for depression in adults',
    organization: 'Cochrane Common Mental Disorders Group systematic review, Cochrane Database of Systematic Reviews (2020), archived by PubMed Central',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7390059/',
    credibility: 'This systematic review describes behavioral activation\'s theory and components, including functional links among behavior and mood, self-monitoring, activity scheduling, and contact with meaningful reinforcement.',
  },
  baGuidance: {
    title: 'Behavioral Therapy/Behavioral Activation for Major Depressive Disorder',
    organization: 'Psychological Health Center of Excellence, U.S. Department of Defense (2021)',
    url: 'https://www.health.mil/Reference-Center/Publications/2021/04/27/Behavioral-Therapy-Behavioral-Activation-for-Major-Depressive-Disorder',
    credibility: 'This official U.S. Department of Defense evidence brief identifies behavioral activation as an evidence-based psychotherapy for major depressive disorder and summarizes its guideline-supported clinical role.',
  },
  extinctionBurst: {
    title: 'Prevalence of the extinction burst and its attenuation during treatment',
    organization: 'Dorothea C. Lerman and Brian A. Iwata, Journal of Applied Behavior Analysis, 28(1), 93-94 (1995)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1279794/',
    credibility: 'This primary peer-reviewed study directly measured bursting during extinction and found it in only a minority of cases, with lower prevalence when extinction was combined with alternative procedures.',
  },
  kindlingReview: {
    title: 'Life stress and kindling in bipolar disorder: Review of the evidence and integration with emerging biopsychosocial theories',
    organization: 'Rachel E. Bender and Lauren B. Alloy, Clinical Psychology Review, 31(3), 383-398 (2011)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3072804/',
    credibility: 'This peer-reviewed review evaluates evidence for Post\'s kindling hypothesis and frames the proposed decline in stress dependence across recurrences as a course model requiring qualified, biopsychosocial interpretation.',
  },
  kindlingCurrent: {
    title: 'The Kindling/Sensitization Model and Early Life Stress',
    organization: 'Robert M. Post, Current Topics in Behavioral Neurosciences, volume 48, 255-275 (2021), indexed by PubMed',
    url: 'https://pubmed.ncbi.nlm.nih.gov/33432554/',
    credibility: 'This contemporary scholarly review by the originator of the clinical model describes sensitization and kindling as analogical mechanisms that may help explain stress-linked and spontaneous recurrences, not a universal rule.',
  },
  apaEthics: {
    title: 'Ethical Principles of Psychologists and Code of Conduct: Standard 4.05, Disclosures',
    organization: 'American Psychological Association',
    url: 'https://www.apa.org/ethics/code',
    credibility: 'The APA publishes the profession\'s ethics code. Standard 4.05 addresses authorized and legally permitted disclosures while requiring psychologists to consider confidentiality alongside controlling law.',
  },
  hhsSubpoena: {
    title: 'Court Orders and Subpoenas',
    organization: 'U.S. Department of Health and Human Services, Office for Civil Rights',
    url: 'https://www.hhs.gov/hipaa/for-individuals/court-orders-subpoenas/index.html',
    credibility: 'HHS Office for Civil Rights administers and enforces the HIPAA Privacy Rule. Its official guidance distinguishes court orders from subpoenas and describes notice or qualified-protective-order conditions for covered records.',
  },
};

const revisions = [
  {
    legacyId: 'legacy-aee95092e17dd925', decision: 'major-rewrite', sourceVerification: 'water-diffusion-model-supported-direct-white-matter-integrity-inference-rejected',
    findings: ['DTI models the direction and magnitude of water diffusion within voxels and derives measures such as fractional anisotropy; it does not directly observe axons or myelin.', 'Diffusion measures are sensitive to white-matter microstructure but nonspecific: crossing fibers, edema, inflammation, axon geometry, acquisition, and analysis can change them, so “tract integrity” requires cautious operational definition.'],
    sources: [sources.dtiPitfalls, sources.dtiMethods],
    prompt: 'Which statement most accurately describes what diffusion tensor imaging (DTI) measures?',
    choices: ['DTI models the direction and magnitude of water diffusion in tissue; derived measures are sensitive but not specific markers of white-matter microstructure.', 'DTI directly photographs individual myelin sheaths and therefore provides a pure, pathology-specific measure of tract integrity.', 'DTI records neuronal electrical potentials at the scalp and localizes each action potential to a named white-matter pathway.', 'DTI directly assays neurotransmitter concentrations and receptor occupancy without relying on a tracer or indirect signal.'], answerIndex: 0,
    rationale: 'DTI fits a tensor model to diffusion-weighted MRI data and estimates how water diffusion varies by direction within each voxel. Measures such as fractional anisotropy can be sensitive to tissue organization, but they are not direct images of axons or myelin and are not biologically specific. Crossing fibers, inflammation, edema, geometry, motion, acquisition, and analytic choices can all influence the result.',
    choiceRationales: ['This accurately identifies the measured signal and preserves the crucial distinction between sensitivity to microstructure and specificity for one tissue property.', 'Myelin and axons influence diffusion, but DTI does not directly photograph either one; “integrity” is an inference that can have several biological explanations.', 'Scalp electrical activity is measured by electroencephalography, whereas DTI uses diffusion-weighted magnetic resonance signals rather than electrical potentials.', 'Neurochemical concentration or receptor occupancy requires other methods; DTI is based on water diffusion and cannot directly identify a neurotransmitter system.'],
  },
  {
    legacyId: 'legacy-d3069bc3c815db61', decision: 'major-rewrite', sourceVerification: 'concurrent-detail-memory-effect-supported-inevitability-and-face-specificity-rejected',
    findings: ['Weapon focus refers broadly to reduced memory for event details concurrent with a visible weapon, not necessarily only impaired memory for a perpetrator\'s face.', 'Meta-analytic and preregistered evidence shows that effect size and reproducibility depend on design, arousal, unusualness, exposure, and testing conditions; a weapon does not inevitably erase other memories.'],
    sources: [sources.weaponMeta, sources.weaponReplication],
    prompt: 'What is the most defensible description of the weapon-focus effect in eyewitness research?',
    choices: ['Attention to a visible weapon can reduce memory for other concurrent event details, but the size and reliability of that effect depend on the person, event, and study conditions.', 'The presence of any weapon guarantees complete amnesia for the perpetrator\'s face while improving memory for every other event detail.', 'Witnesses reliably identify armed perpetrators more accurately because a weapon automatically expands attention to the entire scene.', 'A weapon cannot influence attention or memory under any circumstances, so it is irrelevant when evaluating eyewitness evidence.'], answerIndex: 0,
    rationale: 'Weapon focus is the proposed reduction in memory for details presented alongside a weapon, often explained through attentional narrowing, arousal, or unusualness. It is an average experimental effect rather than a rule for an individual witness. Meta-analytic moderators and recent preregistered failures show that stimulus, timing, context, encoding, and test method matter; presence of a weapon alone does not establish memory accuracy or inaccuracy.',
    choiceRationales: ['This captures the research construct while avoiding a deterministic conclusion about a particular witness or a face-specific effect in every event.', 'The literature does not support guaranteed or complete amnesia, and weapon presence cannot by itself establish which details were remembered or forgotten.', 'Weapon focus predicts possible costs to memory for concurrent details, not an automatic expansion of attention or universally superior identification.', 'Experimental studies have reported weapon-related memory differences, so categorical irrelevance is inconsistent with the evidence even though effects vary.'],
  },
  {
    legacyId: 'legacy-442533540f471007', decision: 'minor-revision', sourceVerification: 'crenshaw-attribution-supported-definition-and-intellectual-context-added',
    findings: ['Kimberlé Crenshaw introduced the term intersectionality in her 1989 legal scholarship to critique single-axis treatment of race and sex discrimination.', 'The concept concerns interacting structures and social positions rather than merely adding demographic identities, and its intellectual roots include earlier Black feminist thought.'],
    sources: [sources.crenshaw],
    prompt: 'Which statement best describes Kimberlé Crenshaw\'s introduction of intersectionality?',
    choices: ['Crenshaw coined the term in 1989 to show how single-axis legal and social frameworks can obscure experiences shaped jointly by racism, sexism, and other structures.', 'Crenshaw proposed that every person with two demographic identities has the same experience regardless of power, history, institutions, or context.', 'Crenshaw argued that race and gender must always be analyzed separately because combining them makes discrimination impossible to evaluate.', 'Crenshaw created the first Black feminist analysis and rejected all intellectual contributions that preceded her 1989 article.'], answerIndex: 0,
    rationale: 'Crenshaw introduced “intersectionality” in 1989 while analyzing how antidiscrimination law could make Black women\'s combined experiences invisible when race and sex were treated as mutually exclusive categories. The framework examines interacting positions and structures of power; it is not a simple identity count. Coining the term also should not erase the earlier Black feminist scholarship and activism from which the analysis emerged.',
    choiceRationales: ['This gives the correct attribution, date, and analytic purpose while locating the term within the problem of single-axis reasoning.', 'Intersectionality does not predict an identical experience from identity labels; institutions, power, history, context, and within-group variation remain central.', 'The framework was developed precisely because separate single-axis analyses could fail to represent discrimination occurring at their intersection.', 'Crenshaw coined and developed the term, but Black feminist thinkers and movements had long analyzed interlocking forms of oppression.'],
  },
  {
    legacyId: 'legacy-58b391dca062c308', decision: 'major-rewrite', sourceVerification: 'explicit-false-belief-age-pattern-supported-single-age-theory-of-mind-claim-rejected',
    findings: ['Many children begin passing classic explicit first-order false-belief tasks around ages four to five, with performance affected by language, executive demands, task format, and culture.', 'Theory of mind is a family of developing abilities with earlier precursors and later refinements; no single age marks acquisition of the complete construct.'],
    sources: [sources.tomCrossCultural, sources.tomReview],
    prompt: 'Which developmental statement about theory of mind is most accurate?',
    choices: ['Many children pass classic explicit first-order false-belief tasks around ages four to five, but theory of mind has earlier precursors, later-developing skills, and task and cultural variation.', 'A complete and adult-like theory of mind appears suddenly on every child\'s third birthday and remains unchanged afterward.', 'Failure on one verbal false-belief task proves that a child has no understanding of any mental state in any context.', 'Theory of mind is fully present at birth, so developmental changes in false-belief reasoning reflect only deliberate noncompliance.'], answerIndex: 0,
    rationale: 'Classic explicit false-belief tasks often show a marked improvement around ages four to five, but that result is not the birthday of a single all-or-none capacity. Infants and younger children show debated precursors on less explicit tasks, while perspective taking, irony, second-order beliefs, and social interpretation continue developing. Language, executive function, task design, experience, and cultural practices all affect performance.',
    choiceRationales: ['This states the well-known explicit-task pattern without treating one task or age range as the whole, culturally invariant construct.', 'Theory-of-mind development is gradual and multidimensional; children vary, and more complex social-cognitive abilities continue to change well beyond age three.', 'One task can impose language, memory, inhibition, and pragmatic demands, so failure does not demonstrate absence of all mental-state understanding.', 'Developmental evidence shows substantial age-related change, and performance differences cannot be dismissed as universal intentional refusal.'],
  },
  {
    legacyId: 'legacy-61a7abd69f739635', decision: 'minor-revision', sourceVerification: 'coding-symbol-search-composite-supported-pure-speed-and-diagnostic-inference-qualified',
    findings: ['The WISC-V Processing Speed Index is primarily derived from Coding and Symbol Search and samples speed and accuracy on simple visual scanning, discrimination, and graphomotor or marking tasks.', 'Performance can reflect attention, visual processing, fine-motor demands, strategy, motivation, and format; the index is not a pure measure of general mental speed and does not diagnose a condition by itself.'],
    sources: [sources.wiscPearson],
    prompt: 'How should a psychologist interpret the WISC-V Processing Speed Index (PSI)?',
    choices: ['It summarizes performance on timed Coding and Symbol Search tasks and should be interpreted with their visual, attention, decision, and graphomotor demands in context.', 'It is a process-pure measure of general brain speed that independently identifies the cause of any low score and establishes a diagnosis.', 'It directly measures long-term autobiographical memory without requiring visual scanning, rapid decisions, or written or motor responding.', 'It is interchangeable with the Verbal Comprehension Index because both composites contain the same subtests and measure the same skills.'], answerIndex: 0,
    rationale: 'The WISC-V PSI is a composite based primarily on Coding and Symbol Search, which require efficient visual scanning and discrimination under time limits; Coding also has prominent graphomotor and associative demands. Attention, motor speed, strategy, engagement, and administration format can influence scores. Interpretation should examine subtests, observations, history, and the broader profile rather than assigning one cause or diagnosis to a low PSI.',
    choiceRationales: ['This identifies the component tasks and the multiple demands that must be considered before making an inference about an individual child.', 'No composite is process-pure, and a low PSI can have several explanations; a score alone neither identifies etiology nor establishes a diagnosis.', 'The tasks emphasize timed visual-symbol processing rather than direct retrieval of autobiographical events from long-term memory.', 'Verbal Comprehension and Processing Speed use different subtests and target different constructs, so their scores are not interchangeable.'],
  },
  {
    legacyId: 'legacy-de20aaa08c932ef5', decision: 'major-rewrite', sourceVerification: 'feigning-evaluation-purpose-supported-standalone-malingering-detector-rejected',
    findings: ['The SIRS-2 is a structured interview designed to evaluate reported symptoms and response patterns relevant to feigning, including classifications concerning exaggeration or fabrication.', 'Malingering includes an external-incentive criterion and is a clinical or forensic conclusion based on converging evidence; one SIRS-2 score cannot independently determine motive, diagnosis, or truthfulness.'],
    sources: [sources.sirsPar, sources.validityConsensus],
    prompt: 'What is the appropriate role of the SIRS-2 in an assessment?',
    choices: ['It provides structured evidence about reported symptoms and patterns associated with feigning that must be integrated with records, context, observations, other validity findings, and possible incentives.', 'It is a stand-alone lie detector whose score proves malingering, identifies the person\'s exact motive, and overrides all conflicting evidence.', 'It is primarily an achievement test used to diagnose reading disability from grade-equivalent scores.', 'It is a vocational-interest inventory that recommends careers without evaluating symptom presentation or response validity.'], answerIndex: 0,
    rationale: 'The SIRS-2 structures inquiry into reported psychiatric symptoms and response patterns that may support classifications involving feigning. It contributes evidence; it does not read intent. Malingering is not synonymous with any invalid score and involves intentional production or exaggeration in the presence of external incentives. Sound inference integrates referral context, records, observations, collateral information, multiple validity indicators, base rates, and alternative explanations.',
    choiceRationales: ['This preserves the instrument\'s intended evidentiary role and the multi-method reasoning needed for high-stakes validity conclusions.', 'No test independently proves intention and motive; discordant evidence, base rates, misunderstanding, severe symptoms, and other explanations require evaluation.', 'The SIRS-2 evaluates reported psychiatric symptoms and response style rather than academic decoding or grade-level achievement.', 'Its structured content concerns symptom reporting and possible feigning, not occupational preferences or career matching.'],
  },
  {
    legacyId: 'legacy-35f6ca1251042e7e', decision: 'minor-revision', sourceVerification: 'activity-and-reinforcement-mechanism-supported-values-function-and-avoidance-context-added',
    findings: ['Behavioral activation uses activity and mood monitoring, functional analysis, graded scheduling, and problem solving to reduce avoidance and increase contact with meaningful reinforcement.', '“Do more pleasant things” is incomplete: activities are selected collaboratively for function and values, progress is graded, and reduced avoidance can be important even before mood improves.'],
    sources: [sources.baReview, sources.baGuidance],
    prompt: 'Which intervention best represents behavioral activation for depression?',
    choices: ['Collaboratively monitor activity and mood, identify avoidance patterns, and schedule manageable actions linked to values and opportunities for reinforcing experience.', 'Wait until motivation and mood have fully recovered before attempting any planned activity, because action cannot precede emotional improvement.', 'Use free association alone to uncover every unconscious conflict while deliberately leaving routines, avoidance, and environmental reinforcement unchanged.', 'Assign the same long list of pleasant events to every client without considering function, values, disability, culture, feasibility, or observed consequences.'], answerIndex: 0,
    rationale: 'Behavioral activation helps a person examine links among situations, actions, avoidance, and mood, then take graded, feasible steps toward valued and potentially reinforcing activities. Self-monitoring, scheduling, problem solving, and reducing avoidance are common components. The approach does not require waiting for motivation, and it is more individualized than simply maximizing activity or prescribing generic pleasant events. Safety, disability, culture, resources, and preferences shape the plan.',
    choiceRationales: ['This includes functional assessment, graded action, values, and contact with reinforcement rather than treating activity as an undifferentiated quantity.', 'Behavioral activation often uses planned action to change the context in which motivation and mood can improve; waiting for complete recovery can maintain avoidance.', 'Insight-oriented exploration may serve other treatment aims, but leaving behavior and environmental contingencies unchanged is not behavioral activation.', 'Effective activity selection is collaborative and functional; an identical burdensome list can be inaccessible, irrelevant, or counterproductive.'],
  },
  {
    legacyId: 'legacy-e9fba12fbeec1c99', decision: 'major-rewrite', sourceVerification: 'temporary-increase-definition-supported-inevitability-and-safety-implications-qualified',
    findings: ['An extinction burst is a temporary increase in a previously reinforced response after the maintaining reinforcer is withheld, potentially involving frequency, duration, intensity, or variability.', 'Bursting is not inevitable: a primary clinical study observed it in a minority of cases, and prevalence was lower when extinction was combined with alternative procedures.'],
    sources: [sources.extinctionBurst],
    prompt: 'Which statement most accurately describes an extinction burst?',
    choices: ['After a maintaining reinforcer is withheld, the response may temporarily increase in rate, intensity, duration, or variability, but this pattern is possible rather than inevitable.', 'Every extinction procedure produces a dangerous increase that must occur before behavior can decrease, regardless of function or accompanying treatment.', 'The term means permanent and immediate elimination of a conditioned or operant response after one trial with no chance of recurrence.', 'It refers to reinforcement becoming more effective over time while the target behavior steadily decreases from the first observation.'], answerIndex: 0,
    rationale: 'An extinction burst is a possible early increase or change in a response when the consequence that previously maintained it is no longer delivered. It can involve rate, duration, magnitude, or novel forms, and it should be distinguished from later recurrence phenomena. Empirical work shows that bursts do not always occur and may be less common when function-based extinction is paired with alternative reinforcement. Planning must account for function, feasibility, and safety.',
    choiceRationales: ['This gives the functional definition while correctly avoiding the common claim that a burst is a required stage of every extinction procedure.', 'Bursting was not observed in most cases in the primary study, and ethical, function-based planning cannot assume or provoke escalation casually.', 'Extinguished responding can recover under some conditions, and extinction is a learning process rather than guaranteed deletion after one exposure.', 'The defining change follows withholding the maintaining reinforcer; it does not mean that reinforcement itself grows stronger during a steady decline.'],
  },
  {
    legacyId: 'legacy-e6461434b46a1ef5', decision: 'major-rewrite', sourceVerification: 'post-kindling-course-hypothesis-supported-universal-autonomy-and-seizure-equivalence-rejected',
    findings: ['Post\'s kindling or sensitization model proposes that early affective episodes may be more closely linked to major stress, while repeated episodes can become less stress-dependent and sometimes appear spontaneous.', 'The account is an analogical longitudinal hypothesis with mixed and moderating evidence, not proof that every person follows the sequence or that bipolar episodes are epileptic seizures.'],
    sources: [sources.kindlingReview, sources.kindlingCurrent],
    prompt: 'What does the kindling or sensitization model propose about the course of bipolar disorder?',
    choices: ['For some people, early episodes may be more stress-linked while recurrence can become progressively less dependent on major external stressors; this is a probabilistic course hypothesis.', 'Every bipolar episode is an epileptic seizure caused by one identical neural mechanism and can be diagnosed from kindling alone.', 'All episodes at every stage require the same major life event, so prior episodes can never affect later vulnerability or recurrence.', 'After several episodes, psychosocial context becomes irrelevant for every person and spontaneous recurrence is biologically guaranteed.'], answerIndex: 0,
    rationale: 'The clinical kindling or sensitization model borrows from preclinical phenomena to propose changing vulnerability across repeated affective episodes. Initial onsets or recurrences may be more tied to major stress, whereas later episodes may require less external provocation or occur apparently spontaneously. Evidence is heterogeneous and biopsychosocial factors remain relevant, so the model is a probabilistic framework—not a diagnosis, universal trajectory, or claim that mood episodes are seizures.',
    choiceRationales: ['This accurately states the proposed longitudinal shift and labels it as a qualified hypothesis rather than a guaranteed law of illness progression.', 'Kindling is used as an analogy or model; bipolar mood episodes are not thereby reclassified as epileptic seizures or explained by one proven mechanism.', 'The hypothesis specifically allows the stress–episode relationship to change with recurrence, although not every person necessarily follows that pattern.', 'Reduced dependence on major stress does not make environment irrelevant or guarantee autonomy; treatment, sleep, substances, relationships, biology, and other factors still matter.'],
  },
  {
    legacyId: 'legacy-e1b51479a673e3ea', decision: 'major-rewrite', sourceVerification: 'preserve-review-consult-response-supported-automatic-release-and-universal-client-contact-sequence-rejected',
    findings: ['A subpoena must not be ignored or treated as automatic authorization to release all records; its issuer, validity, scope, deadline, privilege, jurisdiction, and accompanying order or assurances must be reviewed.', 'A court order and a subpoena are not interchangeable under HIPAA, and client notice, authorization, objections, protective orders, minimum-necessary limits, and special record laws can alter the response.'],
    sources: [sources.apaEthics, sources.hhsSubpoena],
    prompt: 'A psychologist receives a subpoena requesting a client\'s records. What is the most defensible initial response?',
    choices: ['Preserve the records, promptly verify the subpoena\'s validity, issuer, scope, deadline, privilege, and any court order, and obtain jurisdiction-specific legal or risk guidance before disclosing.', 'Immediately send the requester the complete file because every subpoena is a judge\'s order and automatically defeats confidentiality and privilege.', 'Destroy or alter sensitive portions before the deadline so that no confidential material can be produced.', 'Ignore the document and miss its deadline because confidentiality always eliminates any duty to respond through lawful channels.'], answerIndex: 0,
    rationale: 'Receipt of a subpoena starts a time-sensitive legal and ethical response; it does not automatically authorize silence or wholesale disclosure. The psychologist should preserve the record, determine who issued the demand and whether a court order accompanies it, review scope and deadline, and consult qualified counsel, insurer, or organizational privacy resources under controlling law. Client notice or authorization, privilege, objections, a protective order, minimum-necessary limits, HIPAA, state law, and special record rules may matter.',
    choiceRationales: ['This protects the record and deadline while creating time to determine the controlling duties and the narrowest lawful, ethically defensible response.', 'An attorney- or clerk-issued subpoena can differ from a court order, and even an order generally authorizes only the information it specifically describes.', 'Destruction or alteration after a legal demand can violate record, ethics, and evidence-preservation duties and can create serious legal consequences.', 'Confidentiality is crucial but does not justify ignoring valid legal process; timely review can preserve objections, privilege, notice, and protective options.'],
  },
];

const docketById = new Map(docket.items.map((item) => [item.legacyId, item]));
const answerPositions = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1];
const moveKey = (values, fromIndex, toIndex) => {
  const reordered = values.slice();
  const [keyedValue] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, keyedValue);
  return reordered;
};
const items = revisions.map((revision, index) => {
  const candidate = docketById.get(revision.legacyId);
  if (!candidate) throw new Error(`Missing docket candidate ${revision.legacyId}`);
  if (priorIds.has(revision.legacyId)) throw new Error(`Candidate already adjudicated: ${revision.legacyId}`);
  const targetAnswerIndex = answerPositions[index];
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
      choices: moveKey(revision.choices, revision.answerIndex, targetAnswerIndex),
      answerIndex: targetAnswerIndex,
      rationale: revision.rationale,
      choiceRationales: moveKey(revision.choiceRationales, revision.answerIndex, targetAnswerIndex),
      sourceDetails: revision.sources,
    },
  };
});

const expectedDomains = { biological: 1, 'cognitive-affective': 1, 'social-cultural': 1, lifespan: 1, assessment: 2, intervention: 2, research: 1, professional: 1 };
const actualDomains = Object.fromEntries(Object.keys(expectedDomains).map((domain) => [domain, items.filter((item) => item.domainId === domain).length]));
if (JSON.stringify(actualDomains) !== JSON.stringify(expectedDomains)) throw new Error(`Unexpected domain distribution: ${JSON.stringify(actualDomains)}`);
for (const item of items) {
  const q = item.revisedItem;
  if (q.choices.length !== 4 || q.choiceRationales.length !== 4) throw new Error(`${item.legacyId} must have four choices and explanations.`);
  if (new Set(q.choices).size !== 4 || q.choices.some((choice) => choice.trim().length < 20)) throw new Error(`${item.legacyId} must have four distinct, substantive choices.`);
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) throw new Error(`${item.legacyId} has an invalid key.`);
  if (q.rationale.length < 140 || q.choiceRationales.some((text) => text.length < 90)) throw new Error(`${item.legacyId} has incomplete feedback.`);
  if (!q.sourceDetails.length || q.sourceDetails.some((source) => source.title.length < 12 || source.organization.length < 12 || !/^https:\/\//.test(source.url) || source.credibility.length < 120)) throw new Error(`${item.legacyId} has incomplete provenance.`);
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
  currentSourceReviewDate: '2026-07-14',
  status: 'editorial-adjudication-complete-still-quarantined',
  purpose: 'Adjudicate ten EPPP legacy candidates selected for imaging-inference errors, memory and development overgeneralization, assessment misuse, intervention-mechanism absolutes, a probabilistic illness-course model, and legally sensitive record disclosure without treating editorial revision as expert approval.',
  reviewMethod: [
    'Verify every key, distractor, and inference boundary against authoritative, official, primary, systematic-review, or peer-reviewed sources.',
    'Distinguish a measured signal, task score, or response-validity indicator from the biological, diagnostic, or motivational conclusion it may help inform.',
    'State developmental, behavioral, eyewitness, and illness-course findings probabilistically and identify important task, person, cultural, and context limits.',
    'For legal and ethical content, separate a subpoena from a court order and require current jurisdiction-specific review before disclosure.',
    'Require four distinct substantive options, an explanation for every option, full named source provenance, and continued quarantine pending independent qualified review.',
  ],
  summary,
  items,
};

const rows = items.map((item) => `| ${item.adjudicationPosition} | ${item.legacyId} | ${item.domainId} | ${item.decision} | ${item.sourceVerification} |`).join('\n');
const markdown = `# EPPP editorial adjudication batch 07\n\nGenerated: ${report.generatedAt}\n\n**Status: editorial adjudication complete; all items remain quarantined.**\n\n${report.purpose}\n\n## Outcome\n\n- ${summary.adjudicatedCandidates} candidates reviewed across all eight EPPP domains.\n- ${summary.minorRevision} required minor corrections.\n- ${summary.majorRewrite} required major rewriting.\n- ${summary.promotedToNativeBank} were promoted to the learner-facing bank.\n- Independent qualified review remains pending for every item.\n- Current legal, instrument, and research sources were checked through ${report.currentSourceReviewDate}.\n\n| # | Legacy ID | Domain | Decision | Source finding |\n| ---: | --- | --- | --- | --- |\n${rows}\n\n## Review method\n\n${report.reviewMethod.map((step) => `- ${step}`).join('\n')}\n\nThe JSON companion preserves the original prompt and key, item-specific findings, the complete revised item, explanation of every option, and full source provenance.\n`;

for (const outputRoot of [sourceRoot, deployRoot]) {
  fs.writeFileSync(path.join(outputRoot, 'adjudication_batch_07.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'adjudication_batch_07.md'), markdown, 'utf8');
}

console.log(`EPPP adjudication batch 07: ${summary.adjudicatedCandidates} reviewed, ${summary.minorRevision} minor revisions, ${summary.majorRewrite} major rewrites, 0 released.`);
