'use strict';

const sourceRecords = {
  apaEthics: {
    url: 'https://www.apa.org/ethics/code',
    title: 'Ethical Principles of Psychologists and Code of Conduct',
    organization: 'American Psychological Association',
    summary: 'The official APA Ethics Code states the requirements for accurate reports to payors and funding sources in Standard 6.06 and informed consent to therapy in Standard 10.01.',
    credibility: 'The American Psychological Association publishes the operative text of its own Ethics Code, making this the primary source for the cited standards and their required elements.',
  },
  apaAssessment: {
    url: 'https://www.apa.org/about/policy/guidelines-psychological-assessment-evaluation.pdf',
    title: 'APA Guidelines for Psychological Assessment and Evaluation',
    organization: 'American Psychological Association',
    summary: 'The official guidelines address appropriate interpretation, multimethod integration, contextual evidence, and limits on conclusions drawn from psychological assessment results.',
    credibility: 'These are official American Psychological Association professional guidelines for assessment and evaluation, including integration of multiple data sources and appropriately qualified conclusions.',
  },
  etsIrt: {
    url: 'https://www.ets.org/Media/Research/pdf/RM-20-06.pdf',
    title: 'Basic Concepts of Item Response Theory: A Nonmathematical Introduction',
    organization: 'Educational Testing Service Research Institute',
    summary: 'This research memorandum defines item information as the information an item provides at each point on the ability scale and explains its relationship to IRT-based measurement.',
    credibility: 'Educational Testing Service is a major nonprofit assessment and psychometrics organization; this technical memorandum is authored, dated, and published through its research program.',
  },
  bowenCenter: {
    url: 'https://www.thebowencenter.org/differentiation-of-self',
    title: 'Differentiation of Self',
    organization: 'Bowen Center for the Study of the Family',
    summary: 'The Bowen Center describes differentiation as maintaining thoughtful principles and a defined self while remaining realistically connected to other people under relationship pressure.',
    credibility: 'The Bowen Center is the institution founded to advance Murray Bowen’s family systems theory and provides a direct, theory-specific account of its central construct.',
  },
  socialComparison: {
    url: 'https://doi.org/10.1177/001872675400700202',
    title: 'A Theory of Social Comparison Processes',
    organization: 'Human Relations, SAGE Publications',
    summary: 'Festinger’s foundational article proposes that people evaluate opinions and abilities through comparison with other people when objective standards are unavailable.',
    credibility: 'This DOI resolves to the original peer-reviewed 1954 theory article, providing stable bibliographic provenance for the construct rather than a later unsourced summary.',
  },
  pai: {
    url: 'https://www.parinc.com/products/pai',
    title: 'Personality Assessment Inventory (PAI): Product and Technical Information',
    organization: 'Psychological Assessment Resources',
    summary: 'The publisher describes the adult PAI as a 344-item instrument with validity, clinical, treatment-consideration, and interpersonal scales and supplies normative and technical details.',
    credibility: 'Psychological Assessment Resources publishes the PAI and its professional manual; its product page is the primary source for the instrument’s intended use, structure, and technical specifications.',
  },
  dbtHierarchy: {
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2963469/',
    title: 'Dialectical Behavior Therapy: Current Indications and Unique Elements',
    organization: 'PubMed Central, U.S. National Library of Medicine',
    summary: 'This peer-reviewed clinical review describes the DBT hierarchy of life-threatening, therapy-interfering, and quality-of-life-interfering behavioral targets.',
    credibility: 'PubMed Central preserves the complete peer-reviewed article and its journal, author, citation, and reference metadata through the U.S. National Library of Medicine.',
  },
  lnnbDictionary: {
    url: 'https://dictionary.apa.org/luria-nebraska-neuropsychological-battery',
    title: 'Luria–Nebraska Neuropsychological Battery (LNNB)',
    organization: 'APA Dictionary of Psychology, American Psychological Association',
    summary: 'The APA Dictionary identifies the LNNB as a standardized battery derived from Luria’s approach and distinguishes the adult and children’s forms.',
    credibility: 'The APA Dictionary of Psychology is an edited professional reference published by the American Psychological Association and provides a traceable construct-specific entry.',
  },
  lnnbTextbook: {
    url: 'https://www.sciencedirect.com/topics/medicine-and-dentistry/luria-nebraska-neuropsychological-battery',
    title: 'Luria-Nebraska Neuropsychological Battery: Structure and Content',
    organization: 'ScienceDirect, Elsevier',
    summary: 'The referenced clinical-neurology and assessment textbook excerpts describe the battery’s quantitative scales, intended interpretations, and important psychometric limitations.',
    credibility: 'ScienceDirect is Elsevier’s scholarly publishing platform and exposes the source book titles and chapter context for the clinical descriptions, allowing the claims to be traced to named academic references.',
  },
};

function withSources(replacement, keys) {
  const sourceDetails = keys.map((key) => sourceRecords[key]);
  return { ...replacement, references: sourceDetails.map((source) => source.url), sourceDetails };
}

const replacements = {
  'eppp-v3-assessment-051': withSources({
    difficulty: 'advanced',
    prompt: 'On the Luria–Nebraska Neuropsychological Battery, an examinee has elevations on several clinical scales compared with appropriate norms. Which interpretation is most defensible?',
    choices: [
      'Treat the pattern as a hypothesis about dysfunction to integrate with history, observations, and other assessment data',
      'Localize a discrete lesion from the highest elevation before considering converging evidence',
      'Translate the elevations into a global intelligence estimate for primary interpretation',
      'Attribute the differing elevations to deliberate response distortion before evaluating contextual explanations',
    ],
    answerIndex: 0,
    rationale: 'The Luria–Nebraska produces a profile across multiple functional scales. Elevations can contribute hypotheses about neuropsychological dysfunction, but responsible interpretation integrates the profile with history, behavioral observations, other measures, referral context, and known limitations rather than treating one scale as a definitive localization or diagnosis.',
    choiceRationales: [
      'A multiscale battery contributes evidence to an integrated evaluation. The pattern should generate qualified hypotheses that are checked against history, behavior, other measures, and context.',
      'A single elevated scale does not independently establish precise lesion localization. Neuropsychological conclusions require converging evidence and attention to the battery’s limitations.',
      'The clinical scales sample several functional domains and are not a substitute formula for deriving a global intelligence score. Intelligence requires appropriate measures and interpretation.',
      'Differences among clinical-scale elevations do not by themselves establish deliberate distortion. Response validity and contextual explanations require their own evidence-based evaluation.',
    ],
    learningObjectiveId: 'assessment-lnnb-integrated-interpretation',
    cognitiveProcess: 'analysis',
    distractorDesign: ['single-scale-localization', 'construct-substitution', 'unsupported-response-distortion'],
  }, ['lnnbDictionary', 'lnnbTextbook', 'apaAssessment']),

  'eppp-v2-professional-040': withSources({
    difficulty: 'intermediate',
    expansionSelectionPrompt: "Complete the statement: Fee-splitting (receiving payment for referring a client) is:",
    expansionSelectionRationale: 'Standard 6.07: referral fees are prohibited because they create financial incentives that may compromise clinical judgment. The referral should be based on client need, not financial gain. Exception: contractual employment arrangements.',
    prompt: 'A licensed psychologist supervises a trainee who provided an assessment. The claim sent to a third-party payor lists the psychologist as the sole service provider. Which response best follows APA Ethics Code Standard 6.06?',
    choices: [
      'Leave the claim unchanged because the psychologist retained supervisory responsibility',
      'Correct the claim so the provider, services, fees, and relevant clinical information are reported accurately',
      'Replace the provider name with the clinician whose credential produces the preferred reimbursement',
      'Remove provider identity and report the assessment as an undifferentiated clinic service',
    ],
    answerIndex: 1,
    rationale: 'APA Ethics Code Standard 6.06 requires reasonable steps to ensure accurate reports to payors and funding sources, including the identity of the provider, the nature of services, fees or charges, and relevant findings or diagnoses when applicable. Supervisory responsibility does not justify misidentifying who delivered the service.',
    choiceRationales: [
      'Supervisory responsibility does not make an inaccurate provider entry acceptable. The report should identify service delivery and supervision accurately rather than leave the discrepancy in place.',
      'Standard 6.06 calls for reasonable steps to report the provider, services, fees, and relevant clinical information accurately. Correcting the claim directly addresses the discrepancy.',
      'Reimbursement preference is not the reporting standard. Selecting a provider name for financial advantage would preserve or create inaccuracy rather than correct the claim.',
      'Omitting provider identity does not resolve the problem because Standard 6.06 specifically includes accurate identification of the provider in reports to payors and funding sources.',
    ],
    learningObjectiveId: 'professional-accurate-payor-reporting',
    cognitiveProcess: 'application',
    distractorDesign: ['supervision-responsibility-confusion', 'reimbursement-incentive-confusion', 'omission-as-correction-confusion'],
  }, ['apaEthics']),

  'eppp-v2-assessment-005': withSources({
    difficulty: 'advanced',
    expansionSelectionPrompt: "Complete the statement: Item response theory (IRT) differs from classical test theory in that IRT:",
    expansionSelectionRationale: 'IRT models the relationship between a latent trait (ability) and the probability of endorsing an item using item characteristic curves. Parameters include difficulty, discrimination, and guessing. Unlike CTT, IRT properties are sample-independent.',
    prompt: 'A computerized adaptive test has updated an examinee’s ability estimate after 12 responses. To reduce conditional measurement error most efficiently, which remaining item should be selected next?',
    choices: [
      'The item with the highest difficulty estimate in the calibrated pool',
      'The item providing the greatest information at the current ability estimate',
      'The item with the highest discrimination averaged across the ability scale',
      'The item with the lowest prior exposure rate in the current testing window',
    ],
    answerIndex: 1,
    rationale: 'In item response theory, an item information function indicates how much precision an item provides at each ability level. A computerized adaptive test improves conditional precision by selecting an eligible item with high information near the examinee’s current ability estimate, while operational systems may also impose content and exposure constraints.',
    choiceRationales: [
      'The most difficult available item need not be informative at the examinee’s current level. A poorly matched item can contribute little conditional measurement precision.',
      'Item information is conditional on ability. Selecting an eligible item with the greatest information near the current estimate most directly reduces conditional standard error.',
      'High discrimination can increase information, but an item’s location also matters. A single discrimination value averaged across the scale does not identify the best current item.',
      'Exposure control is an important operational constraint, but choosing the least-used item by itself does not optimize conditional measurement precision for this examinee.',
    ],
    learningObjectiveId: 'assessment-irt-item-information-selection',
    cognitiveProcess: 'application',
    distractorDesign: ['difficulty-only-heuristic', 'discrimination-only-heuristic', 'exposure-only-heuristic'],
  }, ['etsIrt']),

  'eppp-v3-intervention-018': withSources({
    difficulty: 'intermediate',
    prompt: 'During a tense family meeting, a client states a considered position, remains emotionally engaged with relatives who disagree, and does not recruit another person to settle the conflict. In Bowen family systems theory, which response best reflects higher differentiation of self?',
    choices: [
      'Maintaining a clear position while staying connected and regulating reactivity',
      'Reducing anxiety by ending contact with relatives after the disagreement',
      'Adopting the family’s position to restore harmony during the meeting',
      'Asking a third relative to carry messages between the two sides',
    ],
    answerIndex: 0,
    rationale: 'In Bowen theory, higher differentiation involves maintaining a thoughtful, defined position while remaining in emotional contact and managing reactivity. Emotional cutoff, fusion through compliance, and triangling another person regulate anxiety differently and do not demonstrate the same differentiated stance.',
    choiceRationales: [
      'This response combines a defined position with continued relationship contact and regulation of emotional reactivity, which most closely reflects higher differentiation.',
      'Ending contact in response to relationship anxiety is emotional cutoff. It can look independent while leaving the underlying emotional process unresolved.',
      'Adopting the family’s view to relieve pressure reflects fusion or overreliance on relationship approval rather than a thoughtfully defined position.',
      'Recruiting a third person to stabilize tension forms a triangle. Triangling can manage anxiety but does not itself demonstrate greater differentiation between the two participants.',
    ],
    learningObjectiveId: 'intervention-bowen-differentiation-in-context',
    cognitiveProcess: 'application',
    distractorDesign: ['emotional-cutoff', 'fusion-through-compliance', 'triangulation'],
  }, ['bowenCenter']),

  'eppp-b016-social-1': withSources({
    difficulty: 'intermediate',
    expansionSelectionPrompt: "Social-comparison theory proposes that people often evaluate themselves by:",
    expansionSelectionRationale: 'When objective standards are unavailable or incomplete, people compare their abilities and opinions with others. Choice of comparison target shapes the result.',
    expansionSelectionAnchorEligible: false,
    prompt: 'A new employee has no objective benchmark for judging an unfamiliar presentation task, so she examines how coworkers with similar experience perform. Which process is most directly illustrated?',
    choices: [
      'Using relevant others as standards for self-evaluation',
      'Inferring an attitude by observing one’s own voluntary behavior',
      'Reducing discomfort by changing a belief after an inconsistent action',
      'Protecting identity by favoring members of one’s occupational group',
    ],
    answerIndex: 0,
    rationale: 'Social-comparison theory proposes that people evaluate their abilities or opinions by comparing themselves with other people, especially when objective standards are unavailable. Similar others can provide a particularly relevant comparison standard for an unfamiliar task.',
    choiceRationales: [
      'The employee is using similarly experienced coworkers as a social standard to evaluate her own ability when an objective benchmark is unavailable.',
      'Self-perception theory concerns inferring one’s attitudes or internal states from observing one’s behavior; the employee is instead evaluating performance through other people.',
      'Cognitive-dissonance reduction concerns resolving inconsistency among cognitions or actions. The scenario describes uncertainty and comparison, not a dissonant commitment.',
      'In-group favoritism concerns evaluating or allocating benefits toward one’s group. Looking to similarly experienced coworkers for a performance standard is a different process.',
    ],
    learningObjectiveId: 'social-comparison-application',
    cognitiveProcess: 'application',
    distractorDesign: ['self-perception', 'cognitive-dissonance', 'in-group-favoritism'],
  }, ['socialComparison']),

  'eppp-b022-assessment-1': withSources({
    difficulty: 'intermediate',
    expansionSelectionPrompt: "The adult Personality Assessment Inventory (PAI) is primarily designed as a:",
    expansionSelectionRationale: 'The PAI is an objective self-report inventory with validity, clinical, treatment-consideration, and interpersonal scales relevant to adult personality and psychopathology. Its scores inform formulation and planning but do not independently establish a diagnosis.',
    expansionSelectionAnchorEligible: false,
    prompt: 'An adult outpatient completes a 344-item self-report inventory. Several clinical scales are elevated, but response-validity indicators also suggest inconsistent and unusually negative responding. What should the psychologist do first?',
    choices: [
      'Evaluate the validity indicators and response context before interpreting the clinical elevations',
      'Convert the elevated clinical scales directly into categorical diagnoses',
      'Average the clinical scales to offset the influence of the validity indicators',
      'Substitute a cognitive ability score for interpretation of the symptom profile',
    ],
    answerIndex: 0,
    rationale: 'The description fits the Personality Assessment Inventory, whose validity scales help determine whether and how the substantive profile can be interpreted. Elevated inconsistency or impression-management indicators require contextual evaluation before clinical elevations are used in formulation; scale scores do not independently establish diagnoses.',
    choiceRationales: [
      'Validity indicators and testing context determine whether the substantive profile is interpretable. They should be evaluated before drawing conclusions from clinical elevations.',
      'Clinical-scale elevations are not categorical diagnoses, particularly when response-validity indicators raise concerns about consistency or response presentation.',
      'Averaging substantive scales does not correct inconsistent or distorted responding. The examiner must evaluate the validity pattern and relevant contextual explanations.',
      'A cognitive ability score addresses a different assessment construct and cannot substitute for determining whether a psychopathology self-report profile is interpretable.',
    ],
    learningObjectiveId: 'assessment-pai-validity-before-interpretation',
    cognitiveProcess: 'application',
    distractorDesign: ['scores-equal-diagnosis', 'averaging-corrects-invalidity', 'construct-substitution'],
  }, ['pai']),

  'eppp-b023-intervention-3': withSources({
    difficulty: 'intermediate',
    expansionSelectionPrompt: "Dialectical behavior therapy (DBT) was originally developed especially for clients with:",
    expansionSelectionRationale: 'Marsha Linehan developed DBT for highly suicidal and difficult-to-treat clients, particularly those diagnosed with borderline personality disorder. DBT integrates behavioral and cognitive methods with mindfulness and a dialectic of acceptance and change, and it has since been adapted for additional populations.',
    expansionSelectionAnchorEligible: false,
    prompt: 'A client in dialectical behavior therapy reports a suicide attempt since the previous session, missed skills homework, and escalating conflict at work. Which target should receive priority in the current individual session?',
    choices: [
      'Rehearse interpersonal-effectiveness skills for the workplace conflict',
      'Review the missed homework as a therapy-interfering behavior',
      'Develop a longer-term plan for quality-of-life problems at work',
      'Begin with the life-threatening behavior, including risk assessment and chain analysis',
    ],
    answerIndex: 3,
    rationale: 'DBT orders individual-therapy targets hierarchically: life-threatening behaviors receive priority, followed by therapy-interfering behaviors and then quality-of-life-interfering behaviors. The reported suicide attempt therefore takes precedence while the remaining targets can still be addressed later in the session or treatment plan.',
    choiceRationales: [
      'Interpersonal-effectiveness work may be clinically useful, but workplace conflict is lower in the DBT hierarchy than a recently reported life-threatening behavior.',
      'Missed homework can interfere with therapy and deserves attention, but therapy-interfering behavior follows life-threatening behavior in the DBT target hierarchy.',
      'Quality-of-life problems are legitimate DBT targets, but the hierarchy gives a recent life-threatening behavior priority for assessment and behavioral analysis.',
      'DBT gives life-threatening behavior the highest treatment priority. Risk assessment and a detailed behavioral chain analysis directly address the recent event before lower-order targets.',
    ],
    learningObjectiveId: 'intervention-dbt-target-hierarchy',
    cognitiveProcess: 'application',
    distractorDesign: ['skills-before-safety', 'therapy-interference-before-safety', 'quality-of-life-before-safety'],
  }, ['dbtHierarchy']),

  'eppp-v2-professional-030': withSources({
    difficulty: 'intermediate',
    expansionSelectionPrompt: "Complete the statement: Psychologists should disclose their theoretical orientation to clients because:",
    expansionSelectionRationale: 'Disclosing theoretical orientation (CBT, psychodynamic, etc.) helps clients understand the approach, set appropriate expectations, and make informed choices about their treatment — a key component of informed consent.',
    prompt: 'At the start of therapy, a psychologist reviews fees and cancellation policies but has not discussed the likely course of therapy, third-party involvement, or limits of confidentiality. What is the best next step under APA Ethics Code Standard 10.01?',
    choices: [
      'Provide the psychologist’s professional memberships, consultation schedule, and preferred documentation style',
      'Give a tentative diagnosis, a symptom timeline, and a catalog of techniques that could be used',
      'Review office logistics, emergency resources, and credentials of colleagues who accept referrals',
      'Complete the consent discussion, address the omitted topics, and invite the client’s questions',
    ],
    answerIndex: 3,
    rationale: 'APA Ethics Code Standard 10.01 directs psychologists to inform clients as early as feasible about the nature and anticipated course of therapy, fees, involvement of third parties, and limits of confidentiality, and to provide sufficient opportunity for questions and answers. Reviewing fees alone leaves required consent topics incomplete.',
    choiceRationales: [
      'Professional memberships and office preferences are not substitutes for the therapy information identified in Standard 10.01 as part of informed consent.',
      'A tentative formulation may be discussed when clinically appropriate, but a prediction and technique catalog do not complete the omitted consent elements in the scenario.',
      'Emergency resources and referral information may be useful practice information, but they do not replace discussion of the anticipated therapy course, third parties, and confidentiality limits.',
      'The psychologist should complete informed consent by discussing the omitted elements and allowing questions. This directly follows the content and process described in Standard 10.01.',
    ],
    learningObjectiveId: 'professional-therapy-informed-consent-elements',
    cognitiveProcess: 'application',
    distractorDesign: ['credentials-as-consent', 'formulation-as-consent', 'office-logistics-as-consent'],
  }, ['apaEthics']),
};

module.exports = { sourceRecords, replacements };
