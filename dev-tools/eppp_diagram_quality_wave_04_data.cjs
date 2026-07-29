#!/usr/bin/env node
'use strict';

const reviewWave = 'eppp-diagram-review-wave-04';
const reviewDate = '2026-07-28';

const sourceRecords = {
  apaDsm: {
    title: 'What is the DSM?',
    organization: 'American Psychiatric Association',
    url: 'https://www.psychiatry.org/patients-families/what-is-the-dsm',
    whyReputable: 'The American Psychiatric Association publishes the DSM and describes it as a classification whose criteria clinicians evaluate when making diagnoses. This primary organizational source supports criterion-based diagnosis without treating one symptom or one data source as sufficient.',
  },
  whoCddr: {
    title: 'Clinical descriptions and diagnostic requirements for ICD-11 mental, behavioural and neurodevelopmental disorders',
    organization: 'World Health Organization',
    url: 'https://www.who.int/publications/i/item/9789240077263',
    whyReputable: 'The World Health Organization publishes the ICD-11 clinical descriptions and diagnostic requirements for worldwide clinical use. It provides an authoritative diagnostic framework and explicitly supports attention to differential diagnosis, boundaries, context, and clinical judgment.',
  },
  aacnValidity: {
    title: 'American Academy of Clinical Neuropsychology 2021 Consensus Statement on Validity Assessment',
    organization: 'American Academy of Clinical Neuropsychology; The Clinical Neuropsychologist',
    url: 'https://doi.org/10.1080/13854046.2021.1896036',
    whyReputable: 'This peer-reviewed professional consensus statement distinguishes performance and symptom validity evidence from diagnostic attribution, recommends multiple validity methods, and explains how validity findings constrain interpretation rather than proving a motive or diagnosis by themselves.',
  },
  ahrqIntegration: {
    title: 'What is Integrated Behavioral Health?',
    organization: 'Academy for Integrating Behavioral Health and Primary Care, Agency for Healthcare Research and Quality',
    url: 'https://integrationacademy.ahrq.gov/about/integrated-behavioral-health',
    whyReputable: 'AHRQ is the U.S. federal agency for healthcare quality research. Its Integration Academy defines integrated behavioral health as medical and behavioral clinicians working together with patients and families, and describes teamwork, coordination, procedures, and information systems as substantive features.',
  },
  ahrqLexicon: {
    title: 'Lexicon for Behavioral Health and Primary Care Integration: Concepts and Definitions Developed by Expert Consensus',
    organization: 'Agency for Healthcare Research and Quality Integration Academy',
    url: 'https://integrationacademy.ahrq.gov/sites/default/files/2020-06/Lexicon.pdf',
    whyReputable: 'This AHRQ-hosted expert-consensus lexicon supplies practical concepts and definitions for behavioral-health and primary-care integration. It supports describing integration by functions and shared systems while avoiding the claim that every program follows one universal linear taxonomy.',
  },
  beckInstitute: {
    title: 'Understanding CBT',
    organization: 'Beck Institute for Cognitive Behavior Therapy',
    url: 'https://beckinstitute.org/about/understanding-cbt/',
    whyReputable: 'Beck Institute is a specialist nonprofit founded by cognitive-therapy developer Aaron T. Beck. Its clinician-facing material describes individualized cognitive formulation, collaborative treatment planning, and interactions among thoughts, emotions, physiology, and behavior.',
  },
  beckHaigh: {
    title: 'Advances in cognitive theory and therapy: the generic cognitive model',
    organization: 'Annual Review of Clinical Psychology; PubMed, U.S. National Library of Medicine',
    url: 'https://pubmed.ncbi.nlm.nih.gov/24387236/',
    whyReputable: 'This peer-reviewed review by Aaron T. Beck and Emily A. P. Haigh presents the generic cognitive model and situates cognition within a broader formulation of psychopathology. PubMed supplies traceable author, journal, and publication metadata.',
  },
  caplanBook: {
    title: 'Principles of Preventive Psychiatry',
    organization: 'Basic Books; bibliographic record hosted by Google Books',
    url: 'https://books.google.com/books/about/Principles_Prevent_Psychatry.html?id=YVtrAAAAMAAJ',
    whyReputable: 'This is the bibliographic record for Gerald Caplan’s 1964 primary exposition of preventive psychiatry, including separate treatments of primary, secondary, and tertiary prevention. It is authoritative for the historical framework but not evidence that the categories guarantee program effects.',
  },
  napPrevention: {
    title: 'Preventing Mental, Emotional, and Behavioral Disorders Among Young People: Progress and Possibilities',
    organization: 'National Research Council and Institute of Medicine; National Academies Press',
    url: 'https://doi.org/10.17226/12480',
    whyReputable: 'This consensus report from the National Academies reviews prevention science and explains how contemporary universal, selective, and indicated categories differ from the older primary, secondary, and tertiary terminology. It provides authoritative context for labeling Caplan’s model as historical.',
  },
  rogersConditions: {
    title: 'The necessary and sufficient conditions of therapeutic personality change',
    organization: 'Journal of Consulting Psychology, American Psychological Association',
    url: 'https://doi.org/10.1037/h0045357',
    whyReputable: 'Rogers’s 1957 peer-reviewed article is the primary source for the six proposed relational conditions. It directly names psychological contact, client incongruence, therapist congruence, unconditional positive regard, empathic understanding, and minimally achieved communication to the client.',
  },
  ttmOriginal: {
    title: 'Stages and processes of self-change of smoking: Toward an integrative model of change',
    organization: 'Journal of Consulting and Clinical Psychology, American Psychological Association',
    url: 'https://doi.org/10.1037/0022-006X.51.3.390',
    whyReputable: 'This peer-reviewed article by Prochaska and DiClemente is a foundational primary report for the stages and processes of change. Its smoking-specific research context supports teaching the model while avoiding a claim that a stage label is a universal trait or deterministic sequence.',
  },
  ttmOverview: {
    title: 'The transtheoretical model of health behavior change',
    organization: 'American Journal of Health Promotion; PubMed, U.S. National Library of Medicine',
    url: 'https://pubmed.ncbi.nlm.nih.gov/10170434/',
    whyReputable: 'This peer-reviewed overview by Prochaska and Velicer defines the model’s stages, processes, decisional balance, self-efficacy, and behavior-change scope. PubMed supplies stable authorship and publication metadata for checking the model-specific terminology.',
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
  frameworkContext: 'historical-and-model-context-editorial-pass',
};

function withSources(item, sourceKeys) {
  const sourceDetails = sourceKeys.map((key) => sourceRecords[key]);
  return { ...item, references: sourceDetails.map((source) => source.url), sourceDetails };
}

const corrections = [
  withSources({
    placementId: 'diagram-placement-ch-11-section-05',
    chapterId: 'ch-11',
    sectionIndex: 5,
    expectedHeading: 'Integrated Care and Interprofessional Practice',
    sourceFile: 'js/textbook_ch11.js',
    expectedOriginal: {
      title: '',
      description: 'The Spectrum of Integrated Care',
      svgSha256: 'e010497681441823bdbbe18156f9016c14a2a4189b9a9108ecca9a43271732b5',
    },
    title: 'Integrated Behavioral Health Varies by Teamwork and Shared Systems',
    description: 'Three-column illustrative continuum. Co-location places medical and behavioral services at the same site but may leave systems separate. Collaborative care adds planned communication, coordinated roles, and shared goals. Highly integrated care adds team workflows, shared accountability, and supporting information systems. These are descriptive features, not universal maturity scores; programs may combine features rather than progress linearly.',
    svg: '<svg viewBox="0 0 840 290" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch11IntegrationTitle ch11IntegrationDesc"><title id="ch11IntegrationTitle">Illustrative integrated behavioral-health continuum</title><desc id="ch11IntegrationDesc">Three cards compare co-location, collaboration, and highly integrated team care. A footer states that programs can combine features and the continuum is not a universal maturity score.</desc><defs><linearGradient id="ch11IntegrationGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#94a3b8"/><stop offset="50%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#10b981"/></linearGradient><marker id="ch11IntegrationArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#10b981"/></marker></defs><text x="420" y="28" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="18">Illustrative features of behavioral-health integration</text><line x1="80" y1="133" x2="760" y2="133" stroke="url(#ch11IntegrationGradient)" stroke-width="7" marker-end="url(#ch11IntegrationArrow)"/><g font-family="system-ui"><g transform="translate(30 54)"><rect width="230" height="158" rx="13" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/><text x="115" y="31" text-anchor="middle" fill="#f8fafc" font-weight="bold" font-size="16">CO-LOCATED</text><text x="115" y="66" text-anchor="middle" fill="#e2e8f0" font-size="12">Same site</text><text x="115" y="90" text-anchor="middle" fill="#e2e8f0" font-size="12">Communication may vary</text><text x="115" y="114" text-anchor="middle" fill="#e2e8f0" font-size="12">Systems may remain separate</text></g><g transform="translate(305 54)"><rect width="230" height="158" rx="13" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2"/><text x="115" y="31" text-anchor="middle" fill="#f8fafc" font-weight="bold" font-size="16">COLLABORATIVE</text><text x="115" y="66" text-anchor="middle" fill="#dbeafe" font-size="12">Planned communication</text><text x="115" y="90" text-anchor="middle" fill="#dbeafe" font-size="12">Coordinated roles</text><text x="115" y="114" text-anchor="middle" fill="#dbeafe" font-size="12">Shared care goals</text></g><g transform="translate(580 54)"><rect width="230" height="158" rx="13" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="115" y="31" text-anchor="middle" fill="#f8fafc" font-weight="bold" font-size="16">HIGHLY INTEGRATED</text><text x="115" y="66" text-anchor="middle" fill="#d1fae5" font-size="12">Team workflows</text><text x="115" y="90" text-anchor="middle" fill="#d1fae5" font-size="12">Shared accountability</text><text x="115" y="114" text-anchor="middle" fill="#d1fae5" font-size="12">Supporting information systems</text></g></g><rect x="100" y="235" width="640" height="40" rx="10" fill="#0f172a" stroke="#94a3b8"/><text x="420" y="260" text-anchor="middle" fill="#e2e8f0" font-size="13">Programs may combine features; this is not a universal linear maturity score.</text></svg>',
    correctionSummary: 'Added a learner-facing title and full alternative, namespaced all SVG identifiers, raised every label to at least 12 units, and framed the three positions as illustrative features rather than a universal linear maturity scale.',
  }, ['ahrqIntegration', 'ahrqLexicon']),

  withSources({
    placementId: 'diagram-placement-ch-5-section-07',
    chapterId: 'ch-5',
    sectionIndex: 7,
    expectedHeading: 'Differential Diagnosis',
    sourceFile: 'js/textbook_ch5.js',
    expectedOriginal: {
      title: '',
      description: 'Differential Diagnosis Hierarchy',
      svgSha256: 'b5cd66db1a6517a571d93e01f1c5d62ef8de8f753030d1b8e39cea532584d1ed',
    },
    title: 'Differential Diagnosis Uses Parallel, Revisable Hypotheses',
    description: 'Assessment first addresses immediate safety and medical urgency, then develops parallel hypotheses involving medical or neurologic conditions, substances and medications, mental disorders, response validity, development and cognition, culture and language, trauma, environment, and collateral information. Evidence is integrated iteratively; uncertainty is documented, and genuine conditions may coexist with invalid or incomplete responding.',
    svg: '<svg viewBox="0 0 920 430" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch5DifferentialTitle ch5DifferentialDesc"><title id="ch5DifferentialTitle">Parallel and iterative differential-diagnosis map</title><desc id="ch5DifferentialDesc">After immediate safety and medical urgency are addressed, medical, substance, mental-disorder, and response-validity hypotheses are evaluated in parallel and integrated with developmental, cognitive, cultural, language, trauma, environmental, and collateral information.</desc><rect width="920" height="430" rx="24" fill="#f8fafc"/><text x="460" y="38" text-anchor="middle" font-family="system-ui" font-size="23" font-weight="700" fill="#172554">Differential diagnosis is iterative—not a suspicion-first ladder</text><g font-family="system-ui"><rect x="260" y="65" width="400" height="55" rx="14" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="460" y="99" text-anchor="middle" font-size="17" font-weight="700" fill="#991b1b">Triage immediate safety and medical urgency</text><path d="M460 120V150" stroke="#475569" stroke-width="3"/><g transform="translate(25 155)"><rect width="205" height="95" rx="14" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><text x="102" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="#1e40af">Medical / neurologic</text><text x="102" y="57" text-anchor="middle" font-size="13" fill="#1e3a8a">onset • course • exam</text><text x="102" y="78" text-anchor="middle" font-size="13" fill="#1e3a8a">labs/records when indicated</text></g><g transform="translate(245 155)"><rect width="205" height="95" rx="14" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><text x="102" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="#92400e">Substances / medicines</text><text x="102" y="57" text-anchor="middle" font-size="13" fill="#78350f">exposure • dose • timing</text><text x="102" y="78" text-anchor="middle" font-size="13" fill="#78350f">intoxication • withdrawal</text></g><g transform="translate(465 155)"><rect width="205" height="95" rx="14" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/><text x="102" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="#166534">Mental disorders</text><text x="102" y="57" text-anchor="middle" font-size="13" fill="#14532d">criteria • impairment</text><text x="102" y="78" text-anchor="middle" font-size="13" fill="#14532d">course • comorbidity</text></g><g transform="translate(685 155)"><rect width="205" height="95" rx="14" fill="#ede9fe" stroke="#7c3aed" stroke-width="3"/><text x="102" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="#5b21b6">Response validity</text><text x="102" y="57" text-anchor="middle" font-size="13" fill="#4c1d95">under/over-reporting</text><text x="102" y="78" text-anchor="middle" font-size="13" fill="#4c1d95">factitious/malingering</text></g><path d="M130 270V295M350 270V295M570 270V295M790 270V295" stroke="#475569" stroke-width="2"/><rect x="85" y="295" width="750" height="65" rx="16" fill="#fff" stroke="#334155" stroke-width="3"/><text x="460" y="322" text-anchor="middle" font-size="16" font-weight="700" fill="#334155">Integrate development, cognition, culture, language, trauma, environment, collateral data</text><text x="460" y="346" text-anchor="middle" font-size="14" fill="#475569">Revise hypotheses as evidence arrives • document uncertainty • allow multiple explanations</text><path d="M460 360V382" stroke="#475569" stroke-width="3"/><rect x="245" y="382" width="430" height="35" rx="12" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/><text x="460" y="405" text-anchor="middle" font-size="15" font-weight="700" fill="#075985">Diagnosis + formulation + plan + monitoring</text></g></svg>',
    correctionSummary: 'Replaced the short hierarchy label with a full alternative, namespaced the SVG title and description, and preserved the parallel, iterative map with explicit attention to urgency, validity, context, uncertainty, and possible co-occurrence.',
  }, ['apaDsm', 'whoCddr', 'aacnValidity']),

  withSources({
    placementId: 'diagram-placement-ch-14-section-02',
    chapterId: 'ch-14',
    sectionIndex: 2,
    expectedHeading: 'Beck’s Cognitive Therapy',
    sourceFile: 'js/textbook_ch14.js',
    expectedOriginal: {
      title: '',
      description: "Beck's Cognitive Model of Depression",
      svgSha256: 'fa44b90cba32d4389899a24478192ddbd55ebeb605f7e6c0fae73bc8cc2f43ad',
    },
    title: 'Beck-Informed Formulation Links Situations, Appraisals, and Responses',
    description: 'A situation is interpreted through automatic thoughts or appraisals that may be shaped by deeper beliefs and assumptions. Appraisals, emotions and physiological responses, and behavior can influence one another, so the figure is a formulation aid rather than a claim that cognition is the sole cause of distress. Assessment tests the individual formulation, and cognitive or behavioral interventions may change multiple linked elements.',
    svg: '<svg viewBox="0 0 880 375" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch14BeckTitle ch14BeckDesc"><title id="ch14BeckTitle">Beck-informed cognitive formulation</title><desc id="ch14BeckDesc">A situation connects to automatic thoughts or appraisals, which interact with emotional and physiological responses and behavior. Deeper beliefs and assumptions can shape appraisals. Bidirectional arrows emphasize reciprocal influence rather than a single cause.</desc><defs><marker id="ch14BeckArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><text x="440" y="27" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="18">Individualized cognitive formulation</text><rect x="305" y="47" width="270" height="55" rx="12" fill="#4338ca"/><text x="440" y="80" text-anchor="middle" fill="#fff" font-weight="bold" font-size="15">SITUATION / CONTEXT</text><path d="M440 102V132" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch14BeckArrow)"/><rect x="260" y="135" width="360" height="75" rx="12" fill="#991b1b"/><text x="440" y="165" text-anchor="middle" fill="#fff" font-weight="bold" font-size="16">AUTOMATIC THOUGHTS / APPRAISALS</text><text x="440" y="190" text-anchor="middle" fill="#fecaca" font-size="12">Meaning assigned in this situation</text><rect x="55" y="245" width="300" height="65" rx="12" fill="#92400e"/><text x="205" y="274" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">EMOTION + PHYSIOLOGY</text><text x="205" y="297" text-anchor="middle" fill="#fef3c7" font-size="12">Feeling and bodily responses</text><rect x="525" y="245" width="300" height="65" rx="12" fill="#166534"/><text x="675" y="274" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">BEHAVIOR</text><text x="675" y="297" text-anchor="middle" fill="#dcfce7" font-size="12">Actions, avoidance, and coping</text><path d="M354 204L267 241M526 204L613 241M355 278H525" fill="none" stroke="#94a3b8" stroke-width="3" marker-start="url(#ch14BeckArrow)" marker-end="url(#ch14BeckArrow)"/><rect x="235" y="330" width="410" height="35" rx="9" fill="#1e293b" stroke="#8b5cf6" stroke-width="2"/><text x="440" y="353" text-anchor="middle" fill="#c4b5fd" font-weight="bold" font-size="13">DEEPER BELIEFS + ASSUMPTIONS CAN SHAPE APPRAISALS</text><path d="M440 330V214" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="5,4" marker-end="url(#ch14BeckArrow)"/></svg>',
    correctionSummary: 'Added the missing accessible SVG name and full alternative, raised all labels to at least 12 units, replaced “distorted” as an automatic default with neutral appraisal language, and represented reciprocal cognitive, emotional, physiological, and behavioral influences.',
  }, ['beckInstitute', 'beckHaigh']),

  withSources({
    placementId: 'diagram-placement-ch-17-section-02',
    chapterId: 'ch-17',
    sectionIndex: 2,
    expectedHeading: 'Caplan’s Prevention Model',
    sourceFile: 'js/textbook_ch17.js',
    expectedOriginal: {
      title: '',
      description: 'Caplan’s historical prevention continuum',
      svgSha256: 'be998ed128f5344e9138c915b4356e6e0e87728ad19394d37b5c46a31efe1985',
    },
    title: 'Caplan’s Historical Primary, Secondary, and Tertiary Framework',
    description: 'Caplan’s historical framework organizes prevention by the course of a disorder. Primary prevention acts before onset and aims to reduce incidence; secondary prevention emphasizes early detection and intervention to shorten duration and reduce prevalence; tertiary prevention addresses established disorder and aims to reduce disability or recurrence and support rehabilitation. The categories do not guarantee effectiveness and differ from the later universal, selective, and indicated population-risk framework.',
    svg: '<svg viewBox="0 0 900 335" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch17CaplanTitle ch17CaplanDesc"><title id="ch17CaplanTitle">Caplan’s historical prevention framework</title><desc id="ch17CaplanDesc">Three cards present primary prevention before onset, secondary prevention through early detection and intervention, and tertiary prevention after an established condition. A footer distinguishes this historical course-based system from universal, selective, and indicated categories.</desc><defs><marker id="ch17CaplanArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><text x="450" y="28" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="18">Caplan’s historical course-based prevention framework</text><g font-family="system-ui"><g transform="translate(35 60)"><rect width="245" height="185" rx="14" fill="#065f46" stroke="#34d399" stroke-width="2"/><text x="122" y="34" text-anchor="middle" fill="#fff" font-weight="bold" font-size="17">PRIMARY</text><text x="122" y="68" text-anchor="middle" fill="#d1fae5" font-size="13">Before disorder onset</text><text x="122" y="96" text-anchor="middle" fill="#d1fae5" font-size="13">Goal: reduce incidence</text><text x="122" y="132" text-anchor="middle" fill="#a7f3d0" font-size="12">Population or group strategies</text></g><path d="M280 152H322" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch17CaplanArrow)"/><g transform="translate(328 60)"><rect width="245" height="185" rx="14" fill="#1e40af" stroke="#60a5fa" stroke-width="2"/><text x="122" y="34" text-anchor="middle" fill="#fff" font-weight="bold" font-size="17">SECONDARY</text><text x="122" y="68" text-anchor="middle" fill="#dbeafe" font-size="13">Early detection + intervention</text><text x="122" y="96" text-anchor="middle" fill="#dbeafe" font-size="13">Goal: shorten duration</text><text x="122" y="124" text-anchor="middle" fill="#bfdbfe" font-size="12">Historically linked to prevalence</text></g><path d="M573 152H615" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch17CaplanArrow)"/><g transform="translate(621 60)"><rect width="245" height="185" rx="14" fill="#5b21b6" stroke="#c084fc" stroke-width="2"/><text x="122" y="34" text-anchor="middle" fill="#fff" font-weight="bold" font-size="17">TERTIARY</text><text x="122" y="68" text-anchor="middle" fill="#f3e8ff" font-size="13">Established condition</text><text x="122" y="96" text-anchor="middle" fill="#f3e8ff" font-size="13">Reduce disability / recurrence</text><text x="122" y="124" text-anchor="middle" fill="#e9d5ff" font-size="12">Rehabilitation and support</text></g></g><rect x="90" y="273" width="720" height="45" rx="11" fill="#0f172a" stroke="#94a3b8"/><text x="450" y="293" text-anchor="middle" fill="#e2e8f0" font-size="13">Historical course categories—not guaranteed effects and not the same as</text><text x="450" y="311" text-anchor="middle" fill="#cbd5e1" font-size="12">universal, selective, and indicated population-risk categories.</text></svg>',
    correctionSummary: 'Expanded the text alternative, raised every label to at least 12 units, replaced dated shorthand examples with the framework’s actual timing and goals, and distinguished Caplan’s historical course categories from later population-risk categories.',
  }, ['caplanBook', 'napPrevention']),

  withSources({
    placementId: 'diagram-placement-ch-13-section-05',
    chapterId: 'ch-13',
    sectionIndex: 5,
    expectedHeading: 'Person-Centered Therapy (Rogers)',
    sourceFile: 'js/textbook_ch13.js',
    expectedOriginal: {
      title: '',
      description: 'Rogers’s six-condition relational pathway',
      svgSha256: 'da73187337b1650fbbe0c6b7999cf646f04f0f287c0fab72cba1a4f2f8091e38',
    },
    allowMissingOriginalInDeploy: true,
    title: 'Rogers’s Six Proposed Relational Conditions',
    description: 'Rogers’s 1957 proposition begins with psychological contact and a client experiencing incongruence, vulnerability, or anxiety. The therapist is congruent, experiences unconditional positive regard, and experiences empathic understanding of the client’s internal frame. Communication of empathy and positive regard must be achieved to at least a minimal degree. The familiar three therapist attitudes are therefore part of a six-condition theoretical claim, not three techniques that guarantee change.',
    svg: '<svg viewBox="0 0 820 300" width="100%" role="img" aria-labelledby="ch13RogersTitle ch13RogersDesc" xmlns="http://www.w3.org/2000/svg"><title id="ch13RogersTitle">Rogers’s six proposed conditions</title><desc id="ch13RogersDesc">Psychological contact and client incongruence form the relational context. Therapist congruence, unconditional positive regard, and empathy must be communicated sufficiently for the client to perceive them.</desc><rect x="30" y="42" width="220" height="88" rx="14" fill="#172554" stroke="#60a5fa" stroke-width="2"/><text x="140" y="70" text-anchor="middle" fill="#bfdbfe" font-weight="bold">RELATIONAL CONTEXT</text><text x="140" y="94" text-anchor="middle" fill="#e2e8f0" font-size="12">1. Psychological contact</text><text x="140" y="114" text-anchor="middle" fill="#e2e8f0" font-size="12">2. Client incongruence</text><path d="M255 86h55" stroke="#94a3b8" stroke-width="3"/><path d="M303 79l9 7-9 7" fill="none" stroke="#94a3b8" stroke-width="3"/><rect x="315" y="25" width="235" height="122" rx="14" fill="#134e4a" stroke="#5eead4" stroke-width="2"/><text x="432" y="51" text-anchor="middle" fill="#99f6e4" font-weight="bold">THERAPIST ATTITUDES</text><text x="432" y="77" text-anchor="middle" fill="#e2e8f0" font-size="12">3. Congruence</text><text x="432" y="99" text-anchor="middle" fill="#e2e8f0" font-size="12">4. Positive regard</text><text x="432" y="121" text-anchor="middle" fill="#e2e8f0" font-size="12">5. Empathic understanding</text><path d="M555 86h55" stroke="#94a3b8" stroke-width="3"/><path d="M603 79l9 7-9 7" fill="none" stroke="#94a3b8" stroke-width="3"/><rect x="615" y="42" width="175" height="88" rx="14" fill="#4c1d95" stroke="#c084fc" stroke-width="2"/><text x="702" y="70" text-anchor="middle" fill="#e9d5ff" font-weight="bold">CLIENT RECEIVES</text><text x="702" y="96" text-anchor="middle" fill="#f3e8ff" font-size="12">6. Minimally perceives</text><text x="702" y="116" text-anchor="middle" fill="#f3e8ff" font-size="12">empathy + regard</text><rect x="85" y="185" width="650" height="72" rx="14" fill="#0f172a" stroke="#64748b"/><text x="410" y="213" text-anchor="middle" fill="#fff" font-weight="bold">Historical theoretical proposition</text><text x="410" y="238" text-anchor="middle" fill="#cbd5e1" font-size="12">“Necessary and sufficient” was Rogers’s claim—not proof that three techniques alone guarantee change.</text></svg>',
    correctionSummary: 'Added a learner-facing title and full six-condition alternative while preserving the already accessible diagram and its explicit boundary between Rogers’s historical proposition and a guaranteed treatment effect.',
  }, ['rogersConditions']),

  withSources({
    placementId: 'diagram-placement-ch-19-section-02',
    chapterId: 'ch-19',
    sectionIndex: 2,
    expectedHeading: 'The Transtheoretical Model (Prochaska & DiClemente)',
    sourceFile: 'js/textbook_ch19.js',
    expectedOriginal: {
      title: '',
      description: 'TTM stages as a revisable change snapshot',
      svgSha256: '942fece552c3fd66779f3053f131502b5a3b7913117ec8f466948a30b0ea846c',
    },
    title: 'TTM Stages Describe a Behavior-Specific, Revisable Snapshot',
    description: 'Five commonly taught Transtheoretical Model stages move from not currently considering a specific behavior change, through considering and preparing, to taking action and sustaining change. Return paths show that a person may pause, reconsider, or move to an earlier stage. Stage is assessed for a particular behavior and time rather than assigned as a stable trait, moral ranking, or deterministic staircase; individualized goals, context, readiness, evidence, and safety still guide intervention.',
    svg: '<svg viewBox="0 0 960 350" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch19TtmTitle ch19TtmDesc"><title id="ch19TtmTitle">Behavior-specific Transtheoretical Model stage snapshot</title><desc id="ch19TtmDesc">Five cards show precontemplation, contemplation, preparation, action, and maintenance for a particular behavior and time. Forward arrows show the commonly taught order, while a dashed return path shows that movement can pause, reverse, or repeat.</desc><defs><marker id="ch19TtmArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker><marker id="ch19TtmReturnArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#f87171"/></marker></defs><text x="480" y="28" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="18">TTM stage snapshot for a particular behavior and time</text><g font-family="system-ui"><g transform="translate(20 75)"><rect width="160" height="130" rx="14" fill="#475569"/><text x="80" y="34" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">PRECONTEMPLATION</text><text x="80" y="68" text-anchor="middle" fill="#e2e8f0" font-size="12">Not currently</text><text x="80" y="89" text-anchor="middle" fill="#e2e8f0" font-size="12">considering change</text></g><path d="M180 140H205" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch19TtmArrow)"/><g transform="translate(210 75)"><rect width="160" height="130" rx="14" fill="#1e40af"/><text x="80" y="34" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">CONTEMPLATION</text><text x="80" y="68" text-anchor="middle" fill="#dbeafe" font-size="12">Considering change</text><text x="80" y="89" text-anchor="middle" fill="#dbeafe" font-size="12">with ambivalence</text></g><path d="M370 140H395" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch19TtmArrow)"/><g transform="translate(400 75)"><rect width="160" height="130" rx="14" fill="#92400e"/><text x="80" y="34" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">PREPARATION</text><text x="80" y="68" text-anchor="middle" fill="#fef3c7" font-size="12">Intending and</text><text x="80" y="89" text-anchor="middle" fill="#fef3c7" font-size="12">planning near-term action</text></g><path d="M560 140H585" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch19TtmArrow)"/><g transform="translate(590 75)"><rect width="160" height="130" rx="14" fill="#166534"/><text x="80" y="34" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">ACTION</text><text x="80" y="68" text-anchor="middle" fill="#dcfce7" font-size="12">Making observable</text><text x="80" y="89" text-anchor="middle" fill="#dcfce7" font-size="12">behavior changes</text></g><path d="M750 140H775" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch19TtmArrow)"/><g transform="translate(780 75)"><rect width="160" height="130" rx="14" fill="#5b21b6"/><text x="80" y="34" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">MAINTENANCE</text><text x="80" y="68" text-anchor="middle" fill="#f3e8ff" font-size="12">Sustaining change</text><text x="80" y="89" text-anchor="middle" fill="#f3e8ff" font-size="12">and planning for setbacks</text></g></g><path d="M860 210C845 300 335 315 290 213" fill="none" stroke="#f87171" stroke-width="3" stroke-dasharray="7,5" marker-end="url(#ch19TtmReturnArrow)"/><text x="575" y="297" text-anchor="middle" fill="#fecaca" font-weight="bold" font-size="13">RETURN, PAUSE, OR REASSESSMENT CAN OCCUR</text><rect x="125" y="316" width="710" height="28" rx="9" fill="#0f172a" stroke="#94a3b8"/><text x="480" y="335" text-anchor="middle" fill="#e2e8f0" font-size="12">A stage is not a stable trait, moral rank, or guaranteed treatment sequence.</text></svg>',
    correctionSummary: 'Expanded the alternative, raised every label to at least 12 units, replaced judgmental shorthand with behavior-specific descriptions, and kept visible return paths so the stages cannot be read as a fixed trait or deterministic staircase.',
  }, ['ttmOriginal', 'ttmOverview']),
].map((item) => ({
  ...item,
  reviewStatus: 'source-reviewed-editorial-pass',
  reviewWave,
  reviewDate,
  reviewNote: `Diagram wording, labels, and placement were corrected for accuracy, nuance, source alignment, accessibility, and learner interpretation. ${item.correctionSummary} Independent qualified expert validation remains pending.`,
  checks: { ...commonChecks },
}));

module.exports = { reviewWave, reviewDate, sourceRecords, corrections };
