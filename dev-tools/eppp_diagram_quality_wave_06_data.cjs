#!/usr/bin/env node
'use strict';

const reviewWave = 'eppp-diagram-review-wave-06';
const reviewDate = '2026-07-28';

const sourceRecords = {
  chcReview: {
    title: 'The Wiring of Intelligence',
    organization: 'Molecular Psychiatry; PubMed Central, U.S. National Library of Medicine',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7433699/',
    whyReputable: 'This peer-reviewed review describes Carroll\u2019s three-stratum hierarchy and the CHC broad-ability stratum while emphasizing that intelligence models concern correlated performance and distributed systems rather than isolated task modules.',
  },
  chcMeta: {
    title: 'Meta-analysis of the relationship between academic achievement and broad abilities of the Cattell-Horn-Carroll theory',
    organization: 'Journal of School Psychology; PubMed, U.S. National Library of Medicine',
    url: 'https://pubmed.ncbi.nlm.nih.gov/30463669/',
    whyReputable: 'This peer-reviewed meta-analysis directly evaluates general, broad, and narrow CHC interpretations and documents that relations vary across abilities, outcomes, and ages, supporting a cautious rather than one-to-one score map.',
  },
  exposureReview: {
    title: 'Maximizing Exposure Therapy: An Inhibitory Learning Approach',
    organization: 'Behaviour Research and Therapy; PubMed Central, U.S. National Library of Medicine',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4114726/',
    whyReputable: 'This peer-reviewed clinical review explains expectancy violation, safety-signal reduction, variability, retrieval cues, and multiple contexts, and distinguishes inhibitory learning from a requirement for within-session fear reduction.',
  },
  vaExposure: {
    title: 'Prolonged Exposure (PE) for PTSD',
    organization: 'National Center for PTSD, U.S. Department of Veterans Affairs',
    url: 'https://www.ptsd.va.gov/understand_tx/prolonged_exposure.asp',
    whyReputable: 'The VA National Center for PTSD is a federal specialty authority. Its patient-facing treatment summary describes gradual approach to trauma memories and objectively safe situations without presenting exposure as forced or universally identical.',
  },
  niaCognition: {
    title: 'Assessing Cognitive Impairment in Older Patients',
    organization: 'National Institute on Aging, National Institutes of Health',
    url: 'https://www.nia.nih.gov/health/health-care-professionals-information/assessing-cognitive-impairment-older-patients',
    whyReputable: 'This federal clinical resource describes multiple possible causes of cognitive change, the need to assess behavior and function, limits of brief screening, and the need for fuller evaluation rather than diagnosis from one pattern.',
  },
  niceDelirium: {
    title: 'Delirium: prevention, diagnosis and management in hospital and long-term care \u2014 Recommendations',
    organization: 'National Institute for Health and Care Excellence',
    url: 'https://www.nice.org.uk/guidance/cg103/chapter/Recommendations',
    whyReputable: 'NICE publishes evidence-based clinical guidance. The guideline identifies recent hours-to-days changes or fluctuation in cognition, perception, physical function, or social behavior as reasons for delirium assessment.',
  },
  ashaMultilingual: {
    title: 'Multilingual Service Delivery in Audiology and Speech-Language Pathology',
    organization: 'American Speech-Language-Hearing Association Practice Portal',
    url: 'https://www.asha.org/practice-portal/professional-issues/multilingual-service-delivery/',
    whyReputable: 'ASHA\u2019s expert-reviewed Practice Portal explains language-history collection, culturally relevant functional assessment, norm-sample limits, cross-language evidence, and why no formal test is completely free of cultural bias.',
  },
  ashaInterpreters: {
    title: 'Collaborating With Interpreters, Transliterators, and Translators',
    organization: 'American Speech-Language-Hearing Association Practice Portal',
    url: 'https://www.asha.org/Practice-Portal/Professional-Issues/Collaborating-With-Interpreters/',
    whyReputable: 'This expert-reviewed professional portal describes clinician responsibility and the briefing-interaction-debriefing collaboration needed when language-matched assessment is unavailable, rather than treating interpretation as mechanical translation.',
  },
  apaMulticultural: {
    title: 'Multicultural Guidelines: An Ecological Approach to Context, Identity, and Intersectionality',
    organization: 'American Psychological Association',
    url: 'https://www.apa.org/about/policy/multicultural-guidelines.pdf',
    whyReputable: 'APA\u2019s official guidelines frame identity and experience ecologically and intersectionally, supporting collaborative inquiry into individual, relational, community, institutional, and historical context instead of group-based assumptions.',
  },
  apaCfi: {
    title: 'Cultural Formulation Interview',
    organization: 'American Psychiatric Association, DSM-5-TR educational resources',
    url: 'https://www.psychiatry.org/getmedia/5cc5329d-3bd4-4c6a-bae1-dfd0d6496f44/APA-DSM5TR-CulturalFormulationInterview.pdf',
    whyReputable: 'The American Psychiatric Association publishes this official interview. Its prompts elicit the person\u2019s definition and meaning of the problem, context, supports, stressors, identity, coping, and expectations for care.',
  },
  attachmentConsensus: {
    title: 'Disorganized attachment in infancy: a review of the phenomenon and its implications for clinicians and policy-makers',
    organization: 'Attachment & Human Development; PubMed Central, U.S. National Library of Medicine',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5600694/',
    whyReputable: 'This peer-reviewed consensus review directly addresses common misuses: Strange Situation classifications are not definitive individual or forensic assessments, do not prove maltreatment, do not equal diagnosis, and are not fixed traits.',
  },
  attachmentClinical: {
    title: 'Practitioner Review: Clinical applications of attachment theory and research for infants and young children',
    organization: 'Journal of Child Psychology and Psychiatry; PubMed Central, U.S. National Library of Medicine',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3670111/',
    whyReputable: 'This peer-reviewed practitioner review describes trained Strange Situation classification, relationship-specific behavioral patterns, developmental qualifications, and clinically appropriate integration with broader assessment.',
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

function withSources(item, sourceKeys) {
  const sourceDetails = sourceKeys.map((key) => sourceRecords[key]);
  return { ...item, references: sourceDetails.map((source) => source.url), sourceDetails };
}

const corrections = [
  withSources({
    placementId: 'diagram-placement-ch-2-section-02',
    chapterId: 'ch-2',
    sectionIndex: 2,
    expectedHeading: 'CHC Theory: The Map of Human Intelligence',
    sourceFile: 'js/textbook_ch5_2.js',
    expectedOriginal: {
      title: 'CHC Hierarchy: From General to Specific',
      description: 'Accessible hierarchy showing general ability, illustrative broad CHC abilities, and narrower examples, with a reminder that test tasks can reflect multiple abilities.',
      svgSha256: '0c75681013285aab57bdb6e2d38143220bcd42bba10d68a7728f1adf1ab9ee04',
    },
    contentReplacements: [{
      from: 'It is influential in test development and interpretation, but its taxonomy has evolved and should not be treated as a fixed list of exactly 16 broad or 80 narrow abilities.',
      to: 'It is influential in test development and interpretation, but CHC is an evolving family of formulations rather than a fixed list of exactly 16 broad or 80 narrow abilities. Interpret a named score through the instrument manual, its validity evidence, and the examinee\u2019s response context; a generic hierarchy cannot establish a one-to-one construct mapping.',
    }],
    title: 'CHC Is a Hierarchy, Not a One-to-One Test Map',
    description: 'A three-level hierarchy places general cognitive ability above selected broad CHC abilities and narrower examples. The figure is intentionally illustrative rather than exhaustive: CHC formulations and labels evolve, broad abilities are correlated, and any test task can reflect several abilities plus nonconstruct demands. Interpret an actual score with the instrument manual, validity evidence, and the examinee\u2019s context.',
    svg: '<svg viewBox="0 0 920 390" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch2ChcWave6Title ch2ChcWave6Desc"><title id="ch2ChcWave6Title">CHC hierarchy with interpretation boundaries</title><desc id="ch2ChcWave6Desc">General ability appears above five selected broad CHC abilities and narrower examples. Cross-links and a footer show that tasks can reflect multiple abilities and other demands, so an instrument manual and validity evidence control score interpretation.</desc><defs><marker id="ch2ChcWave6Arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><rect width="920" height="390" rx="20" fill="#0f172a"/><text x="460" y="28" text-anchor="middle" fill="#f8fafc" font-family="system-ui" font-size="19" font-weight="700">CHC: an evolving hierarchy for organizing correlated abilities</text><rect x="340" y="48" width="240" height="58" rx="13" fill="#312e81" stroke="#818cf8" stroke-width="2"/><text x="460" y="73" text-anchor="middle" fill="#fff" font-family="system-ui" font-size="15" font-weight="700">GENERAL ABILITY (g)</text><text x="460" y="94" text-anchor="middle" fill="#c7d2fe" font-family="system-ui" font-size="12">shared variance across diverse tasks</text><path d="M460 106V130" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch2ChcWave6Arrow)"/><text x="460" y="126" text-anchor="middle" fill="#cbd5e1" font-family="system-ui" font-size="12">selected broad abilities</text><g font-family="system-ui" text-anchor="middle"><g transform="translate(35 142)"><rect width="150" height="62" rx="11" fill="#0f766e"/><text x="75" y="27" fill="#fff" font-size="14" font-weight="700">Gf</text><text x="75" y="48" fill="#ccfbf1" font-size="12">fluid reasoning</text></g><g transform="translate(210 142)"><rect width="150" height="62" rx="11" fill="#0369a1"/><text x="75" y="27" fill="#fff" font-size="14" font-weight="700">Gc</text><text x="75" y="48" fill="#e0f2fe" font-size="12">comprehension-knowledge</text></g><g transform="translate(385 142)"><rect width="150" height="62" rx="11" fill="#7c3aed"/><text x="75" y="27" fill="#fff" font-size="14" font-weight="700">Gv</text><text x="75" y="48" fill="#ede9fe" font-size="12">visual processing</text></g><g transform="translate(560 142)"><rect width="150" height="62" rx="11" fill="#b45309"/><text x="75" y="27" fill="#fff" font-size="14" font-weight="700">Gwm*</text><text x="75" y="48" fill="#fef3c7" font-size="12">working memory</text></g><g transform="translate(735 142)"><rect width="150" height="62" rx="11" fill="#be123c"/><text x="75" y="27" fill="#fff" font-size="14" font-weight="700">Gs</text><text x="75" y="48" fill="#ffe4e6" font-size="12">processing speed</text></g></g><g stroke="#94a3b8" stroke-width="2" marker-end="url(#ch2ChcWave6Arrow)"><path d="M110 204V235"/><path d="M285 204V235"/><path d="M460 204V235"/><path d="M635 204V235"/><path d="M810 204V235"/></g><g font-family="system-ui" font-size="12" text-anchor="middle"><g transform="translate(30 245)"><rect width="160" height="58" rx="9" fill="#1e293b" stroke="#475569"/><text x="80" y="25" fill="#e2e8f0">induction</text><text x="80" y="45" fill="#cbd5e1">quantitative reasoning</text></g><g transform="translate(205 245)"><rect width="160" height="58" rx="9" fill="#1e293b" stroke="#475569"/><text x="80" y="25" fill="#e2e8f0">lexical knowledge</text><text x="80" y="45" fill="#cbd5e1">general information</text></g><g transform="translate(380 245)"><rect width="160" height="58" rx="9" fill="#1e293b" stroke="#475569"/><text x="80" y="25" fill="#e2e8f0">spatial relations</text><text x="80" y="45" fill="#cbd5e1">visualization</text></g><g transform="translate(555 245)"><rect width="160" height="58" rx="9" fill="#1e293b" stroke="#475569"/><text x="80" y="25" fill="#e2e8f0">memory span</text><text x="80" y="45" fill="#cbd5e1">manipulation tasks</text></g><g transform="translate(730 245)"><rect width="160" height="58" rx="9" fill="#1e293b" stroke="#475569"/><text x="80" y="25" fill="#e2e8f0">perceptual speed</text><text x="80" y="45" fill="#cbd5e1">timed scanning</text></g></g><rect x="55" y="322" width="810" height="52" rx="11" fill="#1e293b" stroke="#fbbf24"/><text x="460" y="343" text-anchor="middle" fill="#fde68a" font-family="system-ui" font-size="13" font-weight="700">Selected examples, not an exhaustive or one-to-one map.</text><text x="460" y="362" text-anchor="middle" fill="#e2e8f0" font-family="system-ui" font-size="12">Tasks cross-load; manuals, validity evidence, and context control interpretation. *Labels vary by formulation.</text></svg>',
    correctionSummary: 'Made the hierarchy explicitly illustrative and evolving, added manual-and-validity boundaries, retained selected broad and narrow examples, and ensured every visible label is at least 12 units.',
  }, ['chcReview', 'chcMeta']),

  withSources({
    placementId: 'diagram-placement-ch-14-section-06',
    chapterId: 'ch-14',
    sectionIndex: 6,
    expectedHeading: 'Behavioral Techniques: Exposure Therapies',
    sourceFile: 'js/textbook_ch14.js',
    expectedOriginal: {
      title: '',
      description: 'Exposure learning cycle: prediction, safe approach, response prevention, and new learning',
      svgSha256: '824ea1627ecfce50388c377b80e83575b352782e3cc2c318f7eefafff4f466a6',
    },
    contentReplacements: [{
      from: 'Exposure-based interventions draw on conditioning, emotional-processing, and inhibitory-learning accounts.',
      to: 'Contemporary exposure-based interventions draw on conditioning, emotional-processing, and inhibitory-learning accounts. They require an individualized rationale, consent, assessment of objective risk and readiness, and protocol-appropriate planning; exposure is not forced contact with genuine danger.',
    }],
    title: 'Exposure Tests Predictions and Builds Retrievable Learning',
    description: 'A collaborative exposure cycle begins by specifying a feared prediction, then selecting a consent-based and objectively safe approach. Protocol-relevant avoidance, rituals, reassurance, or safety behaviors are reduced when appropriate; predicted and observed outcomes are compared; and learning is practiced across contexts. Distress may decline, remain elevated, or vary during an exercise, so within-session anxiety reduction is not the sole success criterion.',
    svg: '<svg viewBox="0 0 900 350" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch14ExposureWave6Title ch14ExposureWave6Desc"><title id="ch14ExposureWave6Title">Collaborative exposure learning cycle</title><desc id="ch14ExposureWave6Desc">Specify a feared prediction, collaboratively choose an objectively safe approach, reduce protocol-relevant avoidance or safety behavior, compare expected with observed outcomes, and retrieve learning across varied contexts. Anxiety reduction may occur but is not required within every exercise.</desc><defs><marker id="ch14ExposureWave6Arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><rect width="900" height="350" rx="20" fill="#0f172a"/><text x="450" y="29" text-anchor="middle" fill="#f8fafc" font-family="system-ui" font-size="19" font-weight="700">Exposure learning: a collaborative, protocol-specific cycle</text><g font-family="system-ui" text-anchor="middle"><g transform="translate(22 67)"><rect width="190" height="112" rx="13" fill="#451a03" stroke="#fb923c" stroke-width="2"/><text x="95" y="30" fill="#fed7aa" font-size="14" font-weight="700">1. SPECIFY PREDICTION</text><text x="95" y="61" fill="#fff" font-size="12">What outcome is feared?</text><text x="95" y="82" fill="#fff" font-size="12">How likely or intolerable?</text></g><g transform="translate(242 67)"><rect width="190" height="112" rx="13" fill="#172554" stroke="#60a5fa" stroke-width="2"/><text x="95" y="30" fill="#bfdbfe" font-size="14" font-weight="700">2. PLAN APPROACH</text><text x="95" y="58" fill="#fff" font-size="12">Consent + rationale</text><text x="95" y="79" fill="#fff" font-size="12">Objectively safe cue</text><text x="95" y="100" fill="#fff" font-size="12">Fit protocol and readiness</text></g><g transform="translate(462 57)"><rect width="198" height="132" rx="13" fill="#4c1d95" stroke="#c084fc" stroke-width="2"/><text x="99" y="30" fill="#e9d5ff" font-size="14" font-weight="700">3. REDUCE OLD LOOP</text><text x="99" y="61" fill="#fff" font-size="12">Avoidance, ritual, reassurance,</text><text x="99" y="82" fill="#fff" font-size="12">or safety behavior when it</text><text x="99" y="103" fill="#fff" font-size="12">blocks the learning target</text></g><g transform="translate(690 57)"><rect width="188" height="132" rx="13" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="94" y="30" fill="#a7f3d0" font-size="14" font-weight="700">4. COMPARE + RETRIEVE</text><text x="94" y="61" fill="#fff" font-size="12">Predicted vs observed</text><text x="94" y="82" fill="#fff" font-size="12">Tolerate uncertainty</text><text x="94" y="103" fill="#fff" font-size="12">Practice across contexts</text></g></g><g stroke="#94a3b8" stroke-width="3" marker-end="url(#ch14ExposureWave6Arrow)"><path d="M212 123H236"/><path d="M432 123H456"/><path d="M660 123H684"/></g><path d="M784 195C784 250 117 250 117 187" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="7 5" marker-end="url(#ch14ExposureWave6Arrow)"/><rect x="75" y="267" width="750" height="65" rx="11" fill="#1e293b" stroke="#fbbf24"/><text x="450" y="289" text-anchor="middle" fill="#fde68a" font-family="system-ui" font-size="13" font-weight="700">Do not use exposure to force genuine danger or to demand zero anxiety.</text><text x="450" y="311" text-anchor="middle" fill="#e2e8f0" font-family="system-ui" font-size="12">Learning may occur without within-session fear reduction; monitor fit, consent, safety, and outcome.</text></svg>',
    correctionSummary: 'Added a learner-facing title and full alternative, distinguished objective safety from feared prediction, made consent and protocol fit visible, and removed anxiety reduction as a mandatory within-session endpoint.',
  }, ['exposureReview', 'vaExposure']),

  withSources({
    placementId: 'diagram-placement-ch-22-section-04',
    chapterId: 'ch-22',
    sectionIndex: 4,
    expectedHeading: 'Dementia Types',
    sourceFile: 'js/textbook_ch22.js',
    expectedOriginal: {
      title: '',
      description: 'Educational cognitive-change triage by onset and course',
      svgSha256: '9959a91015bc435f9ad4e1af111b0d9c1eb60c3313ef4b9ac4775f89be23e8aa',
    },
    contentReplacements: [{
      from: 'The table lists common patterns; diagnosis requires decline from prior function, interference with independence for major NCD, history/examination, and appropriate testing:',
      to: 'The table summarizes common patterns, but diagnosis requires decline from prior function, interference with independence for major NCD, history/examination, and appropriate testing. Onset and course guide triage but do not diagnose etiology, and delirium may be superimposed on preexisting neurocognitive disorder:',
    }],
    title: 'Cognitive-Change Triage: Urgency Before Etiologic Labels',
    description: 'A triage map separates recent fluctuating attention or awareness, sudden focal neurological findings, and gradual progressive cognitive or functional change. Recent fluctuation prompts urgent delirium and medical assessment; sudden focal findings prompt emergency neurological evaluation; gradual progression prompts comprehensive cognitive, functional, medical, and contextual evaluation. These patterns overlap, delirium can coexist with dementia, and time course alone does not establish a diagnosis.',
    svg: '<svg viewBox="0 0 920 355" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch22TriageWave6Title ch22TriageWave6Desc"><title id="ch22TriageWave6Title">Cognitive-change urgency and differential triage</title><desc id="ch22TriageWave6Desc">Recent fluctuating attention or awareness calls for urgent delirium and medical assessment. Sudden focal findings call for emergency neurological evaluation. Gradual progressive cognitive or functional decline calls for comprehensive assessment. Patterns can overlap, and course alone is not a diagnosis.</desc><defs><marker id="ch22TriageWave6Arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><rect width="920" height="355" rx="20" fill="#0f172a"/><text x="460" y="28" text-anchor="middle" fill="#f8fafc" font-family="system-ui" font-size="19" font-weight="700">New cognitive or behavioral change: triage urgency first</text><path d="M460 38V72" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch22TriageWave6Arrow)"/><g font-family="system-ui" text-anchor="middle"><g transform="translate(25 82)"><rect width="275" height="145" rx="13" fill="#7f1d1d" stroke="#f87171" stroke-width="2"/><text x="137" y="31" fill="#fecaca" font-size="15" font-weight="700">RECENT + FLUCTUATING</text><text x="137" y="61" fill="#fff" font-size="12">Attention or awareness changed</text><text x="137" y="82" fill="#fff" font-size="12">within hours or days?</text><text x="137" y="110" fill="#fff" font-size="13" font-weight="700">Urgent delirium + medical assessment</text><text x="137" y="132" fill="#fecaca" font-size="12">Can coexist with dementia</text></g><g transform="translate(322 82)"><rect width="275" height="145" rx="13" fill="#78350f" stroke="#fbbf24" stroke-width="2"/><text x="137" y="31" fill="#fde68a" font-size="15" font-weight="700">SUDDEN + FOCAL</text><text x="137" y="61" fill="#fff" font-size="12">Weakness, field loss, aphasia,</text><text x="137" y="82" fill="#fff" font-size="12">seizure, or abrupt severe change?</text><text x="137" y="110" fill="#fff" font-size="13" font-weight="700">Emergency neurological pathway</text><text x="137" y="132" fill="#fde68a" font-size="12">Do not label dementia first</text></g><g transform="translate(619 82)"><rect width="275" height="145" rx="13" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="137" y="31" fill="#a7f3d0" font-size="15" font-weight="700">GRADUAL + PROGRESSIVE</text><text x="137" y="61" fill="#fff" font-size="12">Document decline from baseline</text><text x="137" y="82" fill="#fff" font-size="12">and everyday function</text><text x="137" y="110" fill="#fff" font-size="13" font-weight="700">Comprehensive differential</text><text x="137" y="132" fill="#a7f3d0" font-size="12">Mixed causes are common</text></g></g><rect x="65" y="250" width="790" height="84" rx="12" fill="#1e293b" stroke="#94a3b8"/><text x="460" y="274" text-anchor="middle" fill="#fbbf24" font-family="system-ui" font-size="13" font-weight="700">Course guides urgency; it does not establish etiology.</text><text x="460" y="296" text-anchor="middle" fill="#e2e8f0" font-family="system-ui" font-size="12">Assess medication/substance effects, illness, mood, sleep, sensory access, language/culture,</text><text x="460" y="316" text-anchor="middle" fill="#e2e8f0" font-family="system-ui" font-size="12">neurological disease, collateral history, cognition, and function as the setting requires.</text></svg>',
    correctionSummary: 'Added a learner-facing title and complete alternative, raised all labels to at least 12 units, emphasized urgency before etiologic labels, and made overlap and delirium superimposed on dementia explicit.',
  }, ['niaCognition', 'niceDelirium']),

  withSources({
    placementId: 'diagram-placement-ch-28-section-04',
    chapterId: 'ch-28',
    sectionIndex: 4,
    expectedHeading: 'Bilingualism & Language Diversity',
    sourceFile: 'js/textbook_ch28.js',
    expectedOriginal: {
      title: '',
      description: 'Multilingual assessment workflow: define the question, map language experience, select valid methods, triangulate evidence, and document limits',
      svgSha256: '44fc9032bb8e7faf07ab16a7d913712047034ae0734d6b3d00068da6e7ed2aea',
    },
    contentReplacements: [{
      from: 'Measures with reduced spoken-language demands may answer some questions, but instructions, familiarity, schooling, culture, motor/visual demands, and norms still matter;',
      to: 'Measures with lower spoken-language demands may answer some questions, but instructions, familiarity, schooling, culture, motor/visual demands, and norms remain consequential; translation or interpreter use does not automatically preserve standardization, construct equivalence, or score validity;',
    }],
    title: 'Multilingual Assessment Requires Language-Specific Validity Evidence',
    description: 'A five-step workflow defines the referral decision, maps language and modality history across settings, selects language-matched or carefully interpreted methods with applicable norms, triangulates tests with functioning, records, interviews, and observation, and documents validity limits and follow-up. Translation, interpreter use, a nonverbal label, or one dominant-language score does not automatically establish construct equivalence or diagnosis.',
    svg: '<svg viewBox="0 0 1000 335" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch28AssessWave6Title ch28AssessWave6Desc"><title id="ch28AssessWave6Title">Culturally and linguistically responsive assessment workflow</title><desc id="ch28AssessWave6Desc">Define the referral decision, map language and modality history, select language support and methods with applicable norms, triangulate multiple evidence sources, and document validity and uncertainty. Translation, interpreter use, nonverbal tasks, or a single score do not automatically establish equivalence or diagnosis.</desc><defs><marker id="ch28AssessWave6Arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><rect width="1000" height="335" rx="20" fill="#0f172a"/><text x="500" y="29" text-anchor="middle" fill="#f8fafc" font-family="system-ui" font-size="19" font-weight="700">Multilingual assessment: build validity for this question and person</text><g font-family="system-ui" text-anchor="middle"><g transform="translate(20 62)"><rect width="175" height="132" rx="11" fill="#172554" stroke="#60a5fa" stroke-width="2"/><text x="87" y="29" fill="#fff" font-size="14" font-weight="700">1. DEFINE</text><text x="87" y="57" fill="#bfdbfe" font-size="12">Question + decision</text><text x="87" y="78" fill="#bfdbfe" font-size="12">Risks + alternatives</text><text x="87" y="104" fill="#dbeafe" font-size="12">What must evidence support?</text></g><g transform="translate(215 62)"><rect width="175" height="132" rx="11" fill="#312e81" stroke="#a5b4fc" stroke-width="2"/><text x="87" y="29" fill="#fff" font-size="14" font-weight="700">2. MAP</text><text x="87" y="57" fill="#c7d2fe" font-size="12">Languages + modalities</text><text x="87" y="78" fill="#c7d2fe" font-size="12">Exposure + use + schooling</text><text x="87" y="104" fill="#e0e7ff" font-size="12">Access + setting + change</text></g><g transform="translate(410 62)"><rect width="175" height="132" rx="11" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="87" y="29" fill="#fff" font-size="14" font-weight="700">3. SELECT</text><text x="87" y="57" fill="#a7f3d0" font-size="12">Language-matched provider</text><text x="87" y="78" fill="#a7f3d0" font-size="12">or prepared interpreter</text><text x="87" y="104" fill="#d1fae5" font-size="12">Methods + norms fit purpose</text></g><g transform="translate(605 62)"><rect width="175" height="132" rx="11" fill="#78350f" stroke="#fbbf24" stroke-width="2"/><text x="87" y="29" fill="#fff" font-size="14" font-weight="700">4. TRIANGULATE</text><text x="87" y="57" fill="#fde68a" font-size="12">Tests + functioning</text><text x="87" y="78" fill="#fde68a" font-size="12">Records + interview</text><text x="87" y="104" fill="#fef3c7" font-size="12">Observation across settings</text></g><g transform="translate(800 62)"><rect width="180" height="132" rx="11" fill="#7f1d1d" stroke="#f87171" stroke-width="2"/><text x="90" y="29" fill="#fff" font-size="14" font-weight="700">5. DOCUMENT</text><text x="90" y="57" fill="#fecaca" font-size="12">Validity + uncertainty</text><text x="90" y="78" fill="#fecaca" font-size="12">Modifications + interpreter</text><text x="90" y="104" fill="#fee2e2" font-size="12">Limits + follow-up</text></g></g><g stroke="#94a3b8" stroke-width="3" marker-end="url(#ch28AssessWave6Arrow)"><path d="M195 128H209"/><path d="M390 128H404"/><path d="M585 128H599"/><path d="M780 128H794"/></g><rect x="70" y="220" width="860" height="94" rx="12" fill="#1e293b" stroke="#fbbf24"/><text x="500" y="244" text-anchor="middle" fill="#fde68a" font-family="system-ui" font-size="13" font-weight="700">No test is culture-free; no translation, interpreter, or nonverbal label guarantees equivalence.</text><text x="500" y="268" text-anchor="middle" fill="#e2e8f0" font-family="system-ui" font-size="12">Report standardized scores only when administration, construct, and normative applicability support them.</text><text x="500" y="292" text-anchor="middle" fill="#e2e8f0" font-family="system-ui" font-size="12">One score or language label does not establish intellectual disability or another diagnosis.</text></svg>',
    correctionSummary: 'Added a learner-facing title and full alternative, raised labels from 11 to at least 12 units, distinguished language support from psychometric equivalence, and made score-reporting and diagnosis boundaries visible.',
  }, ['ashaMultilingual', 'ashaInterpreters']),

  withSources({
    placementId: 'diagram-placement-ch-34-section-03',
    chapterId: 'ch-34',
    sectionIndex: 3,
    expectedHeading: 'Acculturation as Person\u2013Context Process',
    sourceFile: 'js/textbook_ch34.js',
    expectedOriginal: {
      title: 'Culture-in-Context Formulation Loop',
      description: 'Accessible diagram showing a collaborative loop from asking about identity and meaning through context, adaptation, and outcome checking.',
      svgSha256: 'd6c36cacb5fa2bc61223b9f0a4c6fd07a0b43f2be682e3edd779f034a68f8cd5',
    },
    contentReplacements: [{
      from: 'These are analytic patterns, not fixed personality types or a moral hierarchy.',
      to: 'Treat these as analytic patterns, not fixed personality types, diagnoses, developmental stages, or a moral hierarchy. Ask how the person describes identity, belonging, participation, and constraint rather than assigning a strategy from group membership or appearance.',
    }],
    title: 'Cultural Formulation Starts With the Person, Then Maps Context',
    description: 'A collaborative cultural-formulation loop asks how the person defines the concern and relevant identities, maps relationships, language, institutions, history, power, barriers, and resources, adapts assessment or care collaboratively, and checks understanding, access, outcomes, and unintended harm. Group evidence can guide respectful questions but cannot answer for an individual, and the Cultural Formulation Interview supports inquiry rather than acting as a diagnostic test.',
    svg: '<svg viewBox="0 0 940 465" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch34CultureWave6Title ch34CultureWave6Desc"><title id="ch34CultureWave6Title">Person-centered cultural formulation loop</title><desc id="ch34CultureWave6Desc">Ask how the person defines the concern and identities, map relationships institutions history power barriers and resources, adapt assessment or care collaboratively, and check impact and revise. Group evidence guides questions but does not determine an individual answer or diagnosis.</desc><defs><marker id="ch34CultureWave6Arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><rect width="940" height="465" rx="20" fill="#0f172a"/><text x="470" y="29" text-anchor="middle" fill="#f8fafc" font-family="system-ui" font-size="19" font-weight="700">Cultural formulation: ask, map, adapt, check, and revise</text><g font-family="system-ui" text-anchor="middle"><g transform="translate(40 68)"><rect width="290" height="118" rx="14" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2"/><text x="145" y="32" fill="#fff" font-size="15" font-weight="700">1. ASK: PERSON\u2019S MEANING</text><text x="145" y="62" fill="#dbeafe" font-size="12">How do you name the concern?</text><text x="145" y="83" fill="#dbeafe" font-size="12">Which identities and supports matter now?</text></g><g transform="translate(610 68)"><rect width="290" height="118" rx="14" fill="#155e75" stroke="#22d3ee" stroke-width="2"/><text x="145" y="32" fill="#fff" font-size="15" font-weight="700">2. MAP: CONTEXT + POWER</text><text x="145" y="62" fill="#cffafe" font-size="12">Relationships, language, institutions,</text><text x="145" y="83" fill="#cffafe" font-size="12">history, barriers, resources, and safety</text></g><g transform="translate(610 292)"><rect width="290" height="118" rx="14" fill="#713f12" stroke="#fbbf24" stroke-width="2"/><text x="145" y="32" fill="#fff" font-size="15" font-weight="700">3. ADAPT COLLABORATIVELY</text><text x="145" y="62" fill="#fef3c7" font-size="12">Goals, language, methods, family role,</text><text x="145" y="83" fill="#fef3c7" font-size="12">interpretation, access, and intervention</text></g><g transform="translate(40 292)"><rect width="290" height="118" rx="14" fill="#065f46" stroke="#34d399" stroke-width="2"/><text x="145" y="32" fill="#fff" font-size="15" font-weight="700">4. CHECK IMPACT + REVISE</text><text x="145" y="62" fill="#d1fae5" font-size="12">Understanding, alliance, access,</text><text x="145" y="83" fill="#d1fae5" font-size="12">outcomes, constraints, unintended harm</text></g></g><g stroke="#94a3b8" stroke-width="3" marker-end="url(#ch34CultureWave6Arrow)"><path d="M330 127H604"/><path d="M755 186V286"/><path d="M610 351H336"/><path d="M185 292V192"/></g><rect x="345" y="211" width="250" height="58" rx="11" fill="#3f1d56" stroke="#c084fc" stroke-width="2"/><text x="470" y="234" text-anchor="middle" fill="#fff" font-family="system-ui" font-size="13" font-weight="700">GROUP EVIDENCE GUIDES QUESTIONS</text><text x="470" y="254" text-anchor="middle" fill="#f3e8ff" font-family="system-ui" font-size="12">It does not answer for the person.</text><text x="470" y="442" text-anchor="middle" fill="#fbbf24" font-family="system-ui" font-size="12">CFI prompts support inquiry; they are not a stand-alone diagnostic test or a substitute for humility.</text></svg>',
    correctionSummary: 'Centered the person\u2019s own account before ecological context, named power and constraint, clarified that group evidence only guides questions, and bounded the Cultural Formulation Interview as an inquiry aid rather than a diagnostic test.',
  }, ['apaMulticultural', 'apaCfi']),

  withSources({
    placementId: 'diagram-placement-ch-36-section-02',
    chapterId: 'ch-36',
    sectionIndex: 2,
    expectedHeading: 'Attachment Theory & the Strange Situation',
    sourceFile: 'js/textbook_ch36.js',
    expectedOriginal: {
      title: 'Attachment Observation Inference Boundaries',
      description: 'Accessible diagram separating observed reunion behavior, research classification, contextual formulation, and clinical diagnosis.',
      svgSha256: 'a3292758f08b4367692c5071bd83eeb7359f944d0b0a79684bf56c9a81b6ae39',
    },
    contentReplacements: [{
      from: 'Classification is relationship-specific and can change.',
      to: 'A classification is relationship- and procedure-specific and can change. Strange Situation coding requires training and is not a stand-alone screen for maltreatment, a clinical attachment-disorder diagnosis, or a deterministic prognosis.',
    }],
    title: 'Strange Situation Classification Has Strict Inference Boundaries',
    description: 'A four-part boundary map moves from observed behavior in a standardized separation-reunion procedure with one caregiver, to trained research classification, then to contextual formulation using history, stress, support, culture, development, and other data. A stop boundary blocks direct inference to maltreatment, attachment-disorder diagnosis, a fixed child trait, or inevitable outcome. Classification is relationship- and procedure-specific.',
    svg: '<svg viewBox="0 0 960 410" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch36AttachWave6Title ch36AttachWave6Desc"><title id="ch36AttachWave6Title">Strange Situation observation and inference boundaries</title><desc id="ch36AttachWave6Desc">Observe behavior in one standardized caregiver relationship, apply trained research coding, and integrate history context development and other data. Do not infer maltreatment, attachment-disorder diagnosis, a fixed child trait, or inevitable outcome directly from a classification.</desc><defs><marker id="ch36AttachWave6Arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#cbd5e1"/></marker></defs><rect width="960" height="410" rx="20" fill="#0f172a"/><text x="480" y="29" text-anchor="middle" fill="#f8fafc" font-family="system-ui" font-size="19" font-weight="700">Strange Situation: what a classification can and cannot support</text><g font-family="system-ui" text-anchor="middle"><g transform="translate(25 72)"><rect width="210" height="158" rx="14" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2"/><text x="105" y="34" fill="#fff" font-size="15" font-weight="700">1. OBSERVE</text><text x="105" y="65" fill="#dbeafe" font-size="12">Behavior during standardized</text><text x="105" y="86" fill="#dbeafe" font-size="12">separation and reunion</text><text x="105" y="115" fill="#bfdbfe" font-size="12">One procedure + relationship</text></g><g transform="translate(265 72)"><rect width="210" height="158" rx="14" fill="#155e75" stroke="#22d3ee" stroke-width="2"/><text x="105" y="34" fill="#fff" font-size="15" font-weight="700">2. CLASSIFY</text><text x="105" y="65" fill="#cffafe" font-size="12">Trained research coding</text><text x="105" y="86" fill="#cffafe" font-size="12">with thresholds + uncertainty</text><text x="105" y="115" fill="#a5f3fc" font-size="12">Not a global child trait</text></g><g transform="translate(505 72)"><rect width="225" height="158" rx="14" fill="#065f46" stroke="#34d399" stroke-width="2"/><text x="112" y="34" fill="#fff" font-size="15" font-weight="700">3. FORMULATE</text><text x="112" y="65" fill="#d1fae5" font-size="12">History, stress, support, culture,</text><text x="112" y="86" fill="#d1fae5" font-size="12">development, other relationships,</text><text x="112" y="107" fill="#d1fae5" font-size="12">and converging assessment data</text></g><g transform="translate(760 72)"><rect width="175" height="158" rx="14" fill="#4c1d36" stroke="#fb7185" stroke-width="2"/><text x="87" y="34" fill="#fff" font-size="15" font-weight="700">STOP</text><text x="87" y="65" fill="#ffe4e6" font-size="12">Not proof of abuse</text><text x="87" y="86" fill="#ffe4e6" font-size="12">Not a diagnosis</text><text x="87" y="107" fill="#ffe4e6" font-size="12">Not fixed destiny</text><text x="87" y="128" fill="#fecdd3" font-size="12">Not a forensic verdict</text></g></g><g stroke="#cbd5e1" stroke-width="3" marker-end="url(#ch36AttachWave6Arrow)"><path d="M235 151H259"/><path d="M475 151H499"/></g><path d="M730 151H752" stroke="#fb7185" stroke-width="5" stroke-dasharray="7 6"/><rect x="90" y="266" width="780" height="118" rx="12" fill="#1e293b" stroke="#c084fc"/><text x="480" y="291" text-anchor="middle" fill="#f3e8ff" font-family="system-ui" font-size="13" font-weight="700">Relationship- and procedure-specific evidence</text><text x="480" y="316" text-anchor="middle" fill="#e2e8f0" font-family="system-ui" font-size="12">Low-level disorganized behaviors alone do not establish a disorganized classification.</text><text x="480" y="339" text-anchor="middle" fill="#e2e8f0" font-family="system-ui" font-size="12">Classification and attachment disorder are different constructs.</text><text x="480" y="362" text-anchor="middle" fill="#fde68a" font-family="system-ui" font-size="12">Relationships, caregiving supports, context, and development can change.</text></svg>',
    correctionSummary: 'Made trained coding thresholds and procedure specificity visible, separated classification from diagnosis and forensic inference, and explicitly blocked maltreatment, trait, and destiny overclaims.',
  }, ['attachmentConsensus', 'attachmentClinical']),
].map((item) => ({
  ...item,
  reviewStatus: 'source-reviewed-editorial-pass',
  reviewWave,
  reviewDate,
  reviewNote: `Diagram wording, chapter explanation, labels, and placement were reviewed for source alignment, factual clarity, accessibility, and learner interpretation. ${item.correctionSummary} Independent qualified expert validation remains pending.`,
  checks: { ...commonChecks },
}));

module.exports = { reviewWave, reviewDate, sourceRecords, corrections };
