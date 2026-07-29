#!/usr/bin/env node
'use strict';

const reviewWave = 'eppp-diagram-review-wave-05';
const reviewDate = '2026-07-28';

const sourceRecords = {
  apaEthics: {
    title: 'Ethical Principles of Psychologists and Code of Conduct',
    organization: 'American Psychological Association',
    url: 'https://www.apa.org/ethics/code',
    whyReputable: 'APA publishes and maintains the governing code. Its current Ethics Office page identifies the 2002 code, amended in 2010 and 2017, while the code distinguishes five aspirational General Principles from enforceable Ethical Standards.',
  },
  apaStructural: {
    title: 'Structural family therapy',
    organization: 'American Psychological Association Dictionary of Psychology',
    url: 'https://dictionary.apa.org/structural-family-therapy',
    whyReputable: 'The APA Dictionary supplies a concise professional definition of structural family therapy that names subsystems, boundaries, hierarchies, coalitions, and enactment without reducing the model to a single boundary continuum.',
  },
  minuchinBook: {
    title: 'Families and Family Therapy',
    organization: 'Harvard University Press; Google Books bibliographic record',
    url: 'https://books.google.com/books/about/Families_and_Family_Therapy.html?id=3lRdLKNTEYcC',
    whyReputable: 'This is the bibliographic record for Salvador Minuchin\u2019s foundational 1974 exposition. It documents the model\u2019s attention to family organization, subsystem boundaries, adaptation, mapping, and restructuring.',
  },
  apaEbpp: {
    title: 'Policy Statement on Evidence-Based Practice in Psychology',
    organization: 'American Psychological Association',
    url: 'https://www.apa.org/practice/guidelines/evidence-based-statement.html',
    whyReputable: 'APA\u2019s official policy defines evidence-based practice in psychology as integrating best available research with clinical expertise in the context of patient characteristics, culture, and preferences, and emphasizes collaboration and ongoing monitoring.',
  },
  tremblayDick: {
    title: 'Broca and Wernicke are dead, or moving past the classic model of language neurobiology',
    organization: 'Brain and Language; PubMed, U.S. National Library of Medicine',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27584714/',
    whyReputable: 'This peer-reviewed review evaluates the historical language model and explains why contemporary language neurobiology requires more precise anatomy, distributed cortical regions, subcortical contributions, and multiple white-matter pathways.',
  },
  fedorenkoLanguage: {
    title: 'The language network as a natural kind within the broader landscape of the human brain',
    organization: 'Nature Reviews Neuroscience; PubMed, U.S. National Library of Medicine',
    url: 'https://pubmed.ncbi.nlm.nih.gov/38609551/',
    whyReputable: 'This recent peer-reviewed review characterizes a strongly interconnected, predominantly left-hemisphere frontal-temporal language network and supports teaching network-level organization rather than isolated one-function centers.',
  },
  dopamineReview: {
    title: 'Dopamine receptor signaling and current and future antipsychotic drugs',
    organization: 'Handbook of Experimental Pharmacology; PubMed Central, U.S. National Library of Medicine',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4711768/',
    whyReputable: 'This peer-reviewed pharmacology review explains dopamine pathways, D1- and D2-family signaling, antipsychotic mechanisms, motor effects, Parkinson disease associations, and the important distinction between antagonism and functionally selective partial agonism.',
  },
  dopamineSystematic: {
    title: 'Canonical and Non-Canonical Antipsychotics\u2019 Dopamine-Related Mechanisms',
    organization: 'International Journal of Molecular Sciences; PubMed, U.S. National Library of Medicine',
    url: 'https://pubmed.ncbi.nlm.nih.gov/36983018/',
    whyReputable: 'This peer-reviewed systematic review summarizes contemporary dopamine-receptor mechanisms across antipsychotic agents while documenting variation in affinity, partial agonism, receptor profiles, treatment response, and adverse effects.',
  },
  nistNormal: {
    title: 'What do we mean by Normal data?',
    organization: 'National Institute of Standards and Technology',
    url: 'https://www.itl.nist.gov/div898/handbook/pmc/section5/pmc51.htm',
    whyReputable: 'NIST\u2019s Engineering Statistics Handbook gives the normal density, identifies mean and standard deviation as its parameters, defines the standard-normal transformation, and reports the 68.27, 95.45, and 99.73 percent areas.',
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
    placementId: 'diagram-placement-ch-48-section-01',
    chapterId: 'ch-48',
    sectionIndex: 1,
    expectedHeading: 'The Normal Distribution & Standard Scores',
    sourceFile: 'js/textbook_ch48.js',
    expectedOriginal: {
      title: '',
      description: 'The Normal Distribution: Mean (\u03bc) and Standard Deviations (\u03c3)',
      svgSha256: 'c9eaa0a403787120e86a52c884012e48e9049940ade9f32b80dc54d2c9234793',
    },
    title: 'Normal-Model Areas and Common Standard-Score Transforms',
    description: 'A symmetric normal curve is marked at the mean and at one and two standard deviations on either side. Each half between the mean and one standard deviation contains about 34.13 percent, and each band from one to two standard deviations contains about 13.59 percent. Matching z, T, and illustrative IQ-score transforms are shown. The area percentages require a normal model; a linear standard-score transformation does not make observed data normal.',
    svg: '<svg viewBox="0 0 960 420" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch48NormalTitle ch48NormalDesc"><title id="ch48NormalTitle">Normal curve areas and standard-score transforms</title><desc id="ch48NormalDesc">Symmetric bell curve marked at minus two, minus one, zero, plus one, and plus two standard deviations. Areas are 34.13 percent from the mean to one standard deviation and 13.59 percent from one to two. Rows align z, T, and illustrative IQ scores.</desc><rect width="960" height="420" rx="20" fill="#0f172a"/><text x="480" y="30" text-anchor="middle" fill="#f8fafc" font-family="system-ui" font-size="20" font-weight="700">Normal-model areas and score transforms</text><path d="M60 260C190 260 250 250 330 170C390 105 420 55 480 55C540 55 570 105 630 170C710 250 770 260 900 260L900 270L60 270Z" fill="#818cf8" opacity="0.22"/><path d="M60 260C190 260 250 250 330 170C390 105 420 55 480 55C540 55 570 105 630 170C710 250 770 260 900 260" fill="none" stroke="#a78bfa" stroke-width="5"/><line x1="60" y1="270" x2="900" y2="270" stroke="#64748b" stroke-width="2"/><g stroke="#94a3b8" stroke-dasharray="5,4"><line x1="240" y1="238" x2="240" y2="275"/><line x1="360" y1="138" x2="360" y2="275"/><line x1="480" y1="55" x2="480" y2="275"/><line x1="600" y1="138" x2="600" y2="275"/><line x1="720" y1="238" x2="720" y2="275"/></g><g fill="#e2e8f0" font-family="system-ui" font-size="14" font-weight="700" text-anchor="middle"><text x="240" y="294">-2&#963;</text><text x="360" y="294">-1&#963;</text><text x="480" y="294">&#956;</text><text x="600" y="294">+1&#963;</text><text x="720" y="294">+2&#963;</text></g><g fill="#f8fafc" font-family="system-ui" font-size="14" font-weight="700" text-anchor="middle"><text x="300" y="226">13.59%</text><text x="420" y="150">34.13%</text><text x="540" y="150">34.13%</text><text x="660" y="226">13.59%</text></g><g font-family="system-ui" font-size="13" text-anchor="middle"><text x="110" y="322" fill="#cbd5e1" font-weight="700">z</text><text x="240" y="322" fill="#bae6fd">-2</text><text x="360" y="322" fill="#bae6fd">-1</text><text x="480" y="322" fill="#bae6fd">0</text><text x="600" y="322" fill="#bae6fd">+1</text><text x="720" y="322" fill="#bae6fd">+2</text><text x="110" y="344" fill="#cbd5e1" font-weight="700">T</text><text x="240" y="344" fill="#bae6fd">30</text><text x="360" y="344" fill="#bae6fd">40</text><text x="480" y="344" fill="#bae6fd">50</text><text x="600" y="344" fill="#bae6fd">60</text><text x="720" y="344" fill="#bae6fd">70</text><text x="110" y="366" fill="#cbd5e1" font-weight="700">IQ*</text><text x="240" y="366" fill="#bae6fd">70</text><text x="360" y="366" fill="#bae6fd">85</text><text x="480" y="366" fill="#bae6fd">100</text><text x="600" y="366" fill="#bae6fd">115</text><text x="720" y="366" fill="#bae6fd">130</text></g><text x="480" y="402" text-anchor="middle" fill="#fbbf24" font-family="system-ui" font-size="12">Areas require a normal model. Linear transforms do not make data normal. *Illustrative mean 100, SD 15.</text></svg>',
    correctionSummary: 'Added complete SVG naming semantics, a full alternative, exact normal-model area labels, and an explicit boundary between distributional assumptions and linear score transformations.',
  }, ['nistNormal']),

  withSources({
    placementId: 'diagram-placement-ch-7-section-03',
    chapterId: 'ch-7',
    sectionIndex: 3,
    expectedHeading: 'The Five General Principles',
    sourceFile: 'js/textbook_ch7.js',
    expectedOriginal: {
      title: '',
      description: 'The Five APA General Principles (Aspirational)',
      svgSha256: '4e557b17c5f27ea3ecca4b0410308c1a7e67df5401286a8acd9e87382c4398f4',
    },
    title: 'APA General Principles Are Aspirational, Not Enforceable Rules',
    description: 'Five cards name the current APA Ethics Code General Principles: A, Beneficence and Nonmaleficence; B, Fidelity and Responsibility; C, Integrity; D, Justice; and E, Respect for People\u2019s Rights and Dignity. Short cues summarize benefit and harm, trust and accountability, honesty, fair access and bias awareness, and privacy, dignity, and culture. A footer distinguishes these aspirational guides from the separately enforceable Ethical Standards.',
    svg: '<svg viewBox="0 0 960 350" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch7PrinciplesTitle ch7PrinciplesDesc"><title id="ch7PrinciplesTitle">Five aspirational APA General Principles</title><desc id="ch7PrinciplesDesc">Cards A through E name Beneficence and Nonmaleficence, Fidelity and Responsibility, Integrity, Justice, and Respect for People&apos;s Rights and Dignity. The principles guide ethical reasoning but are not enforceable standards themselves.</desc><rect width="960" height="350" rx="20" fill="#0f172a"/><text x="480" y="30" text-anchor="middle" fill="#f8fafc" font-family="system-ui" font-size="20" font-weight="700">APA General Principles A-E: aspirational guides</text><g font-family="system-ui" text-anchor="middle"><g transform="translate(20 55)"><rect width="168" height="225" rx="14" fill="#312e81" stroke="#818cf8" stroke-width="2"/><text x="84" y="36" fill="#fff" font-size="25" font-weight="700">A</text><text x="84" y="69" fill="#e0e7ff" font-size="13" font-weight="700">BENEFICENCE</text><text x="84" y="87" fill="#e0e7ff" font-size="13" font-weight="700">AND NONMALEFICENCE</text><text x="84" y="132" fill="#c7d2fe" font-size="12">Strive to benefit</text><text x="84" y="152" fill="#c7d2fe" font-size="12">and reduce harm</text></g><g transform="translate(208 55)"><rect width="168" height="225" rx="14" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="84" y="36" fill="#fff" font-size="25" font-weight="700">B</text><text x="84" y="69" fill="#d1fae5" font-size="13" font-weight="700">FIDELITY AND</text><text x="84" y="87" fill="#d1fae5" font-size="13" font-weight="700">RESPONSIBILITY</text><text x="84" y="132" fill="#a7f3d0" font-size="12">Trust, roles,</text><text x="84" y="152" fill="#a7f3d0" font-size="12">and accountability</text></g><g transform="translate(396 55)"><rect width="168" height="225" rx="14" fill="#78350f" stroke="#fbbf24" stroke-width="2"/><text x="84" y="36" fill="#fff" font-size="25" font-weight="700">C</text><text x="84" y="78" fill="#fef3c7" font-size="13" font-weight="700">INTEGRITY</text><text x="84" y="132" fill="#fde68a" font-size="12">Accuracy, honesty,</text><text x="84" y="152" fill="#fde68a" font-size="12">and truthfulness</text></g><g transform="translate(584 55)"><rect width="168" height="225" rx="14" fill="#7f1d1d" stroke="#f87171" stroke-width="2"/><text x="84" y="36" fill="#fff" font-size="25" font-weight="700">D</text><text x="84" y="78" fill="#fee2e2" font-size="13" font-weight="700">JUSTICE</text><text x="84" y="132" fill="#fecaca" font-size="12">Fair access and</text><text x="84" y="152" fill="#fecaca" font-size="12">bias awareness</text></g><g transform="translate(772 55)"><rect width="168" height="225" rx="14" fill="#4c1d95" stroke="#c084fc" stroke-width="2"/><text x="84" y="36" fill="#fff" font-size="25" font-weight="700">E</text><text x="84" y="66" fill="#f3e8ff" font-size="12" font-weight="700">RESPECT FOR RIGHTS</text><text x="84" y="84" fill="#f3e8ff" font-size="12" font-weight="700">AND DIGNITY</text><text x="84" y="126" fill="#e9d5ff" font-size="12">Privacy, dignity,</text><text x="84" y="146" fill="#e9d5ff" font-size="12">self-determination,</text><text x="84" y="166" fill="#e9d5ff" font-size="12">and culture</text></g></g><rect x="120" y="300" width="720" height="34" rx="10" fill="#1e293b" stroke="#94a3b8"/><text x="480" y="322" text-anchor="middle" fill="#e2e8f0" font-family="system-ui" font-size="13">General Principles guide reasoning; the separate Ethical Standards state enforceable rules.</text></svg>',
    correctionSummary: 'Added a learner-facing title and full alternative, raised every label to at least 12 units, preserved the five official names, and made the aspirational-versus-enforceable distinction prominent.',
  }, ['apaEthics']),

  withSources({
    placementId: 'diagram-placement-ch-16-section-02',
    chapterId: 'ch-16',
    sectionIndex: 2,
    expectedHeading: 'Evidence-Based Practice in Psychology (EBPP)',
    sourceFile: 'js/textbook_ch16.js',
    expectedOriginal: {
      title: '',
      description: 'The Three-Legged Stool of Evidence-Based Practice',
      svgSha256: '6eb42a8ee174393b2441c420c9d1e29541daea0955981e442b1b65971e4b6a78',
    },
    title: 'EBPP Integrates Evidence, Expertise, and Patient Context',
    description: 'Three connected cards represent best available research; clinical expertise; and patient characteristics, culture, and preferences. All feed collaborative clinical decision-making rather than acting as interchangeable votes. A monitoring loop returns observed benefits, harms, feasibility, and fit to the next decision. The figure presents APA\u2019s integration model, not a claim that any one component alone establishes an appropriate intervention.',
    svg: '<svg viewBox="0 0 960 380" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch16EbppTitle ch16EbppDesc"><title id="ch16EbppTitle">Evidence-based practice in psychology integration loop</title><desc id="ch16EbppDesc">Best available research, clinical expertise, and patient characteristics, culture, and preferences converge in collaborative clinical decision-making. Outcomes, benefits, harms, feasibility, and fit are monitored and feed the next decision.</desc><defs><marker id="ch16EbppArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><rect width="960" height="380" rx="20" fill="#0f172a"/><text x="480" y="30" text-anchor="middle" fill="#f8fafc" font-family="system-ui" font-size="20" font-weight="700">Evidence-based practice is an integration process</text><g font-family="system-ui" text-anchor="middle"><g transform="translate(25 60)"><rect width="280" height="145" rx="14" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2"/><text x="140" y="34" fill="#fff" font-size="15" font-weight="700">BEST AVAILABLE RESEARCH</text><text x="140" y="70" fill="#dbeafe" font-size="12">Quality, relevance, and</text><text x="140" y="90" fill="#dbeafe" font-size="12">the supporting body of evidence</text><text x="140" y="118" fill="#bfdbfe" font-size="12">Methods should fit the question</text></g><g transform="translate(340 60)"><rect width="280" height="145" rx="14" fill="#78350f" stroke="#fbbf24" stroke-width="2"/><text x="140" y="34" fill="#fff" font-size="15" font-weight="700">CLINICAL EXPERTISE</text><text x="140" y="70" fill="#fef3c7" font-size="12">Assess, formulate, implement,</text><text x="140" y="90" fill="#fef3c7" font-size="12">monitor, and recognize limits</text><text x="140" y="118" fill="#fde68a" font-size="12">Use evidence with clinical data</text></g><g transform="translate(655 60)"><rect width="280" height="145" rx="14" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="140" y="31" fill="#fff" font-size="14" font-weight="700">PATIENT CHARACTERISTICS,</text><text x="140" y="50" fill="#fff" font-size="14" font-weight="700">CULTURE, AND PREFERENCES</text><text x="140" y="82" fill="#d1fae5" font-size="12">Goals, strengths, identity,</text><text x="140" y="102" fill="#d1fae5" font-size="12">context, values, and resources</text><text x="140" y="126" fill="#a7f3d0" font-size="12">Support informed collaboration</text></g></g><path d="M165 205V235M480 205V235M795 205V235" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch16EbppArrow)"/><rect x="270" y="240" width="420" height="58" rx="14" fill="#312e81" stroke="#a78bfa" stroke-width="2"/><text x="480" y="266" text-anchor="middle" fill="#fff" font-family="system-ui" font-size="15" font-weight="700">COLLABORATIVE CLINICAL DECISION</text><text x="480" y="286" text-anchor="middle" fill="#e0e7ff" font-family="system-ui" font-size="12">Apply evidence probabilistically to this person and setting</text><path d="M690 270C840 270 845 346 690 346H260C150 346 155 220 270 220" fill="none" stroke="#fbbf24" stroke-width="3" stroke-dasharray="7,5" marker-end="url(#ch16EbppArrow)"/><text x="480" y="340" text-anchor="middle" fill="#fde68a" font-family="system-ui" font-size="13" font-weight="700">Monitor benefits, harms, feasibility, and fit; revise as needed.</text><text x="480" y="366" text-anchor="middle" fill="#cbd5e1" font-family="system-ui" font-size="12">The three inputs inform one another; they are not interchangeable votes.</text></svg>',
    correctionSummary: 'Replaced the small-label stool shorthand with a fully named integration loop, raised labels to at least 12 units, and represented collaborative choice and outcome monitoring explicitly.',
  }, ['apaEbpp']),

  withSources({
    placementId: 'diagram-placement-ch-20-section-04',
    chapterId: 'ch-20',
    sectionIndex: 4,
    expectedHeading: 'Language Areas: Broca\u2019s and Wernicke\u2019s',
    sourceFile: 'js/textbook_ch20.js',
    expectedOriginal: {
      title: '',
      description: 'Classic language model and modern network qualification',
      svgSha256: 'd00f7a518f428b31dc9244a5d8bf9b2f0af0d0802205ac24b0b2072454b95e79',
    },
    title: 'Classic Language Labels Sit Within Distributed Networks',
    description: 'Two historical cards associate inferior frontal regions with Broca labels and posterior temporal regions with Wernicke labels. Both point to a distributed language-network card containing interacting frontal, temporal, and parietal regions plus dorsal and ventral connections. The figure keeps classic aphasia patterns available as exam shorthand while warning that these names are anatomically variable, functions are not one-to-one, and real lesion-symptom localization requires a full assessment.',
    svg: '<svg viewBox="0 0 960 390" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch20LanguageTitle ch20LanguageDesc"><title id="ch20LanguageTitle">Classic language labels within distributed networks</title><desc id="ch20LanguageDesc">Historical inferior-frontal Broca and posterior-temporal Wernicke labels point toward a distributed network of frontal, temporal, and parietal regions with dorsal and ventral connections. Aphasia patterns are useful shorthand but not one-to-one localization rules.</desc><defs><marker id="ch20LanguageArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><rect width="960" height="390" rx="20" fill="#0f172a"/><text x="480" y="30" text-anchor="middle" fill="#f8fafc" font-family="system-ui" font-size="20" font-weight="700">Classic labels are landmarks inside a distributed language network</text><g font-family="system-ui" text-anchor="middle"><g transform="translate(40 65)"><rect width="350" height="125" rx="14" fill="#7f1d1d" stroke="#f87171" stroke-width="2"/><text x="175" y="30" fill="#fff" font-size="15" font-weight="700">INFERIOR FRONTAL REGIONS</text><text x="175" y="56" fill="#fee2e2" font-size="13">Historically called Broca&apos;s area</text><text x="175" y="82" fill="#fecaca" font-size="12">Often linked with speech planning and output</text><text x="175" y="104" fill="#fecaca" font-size="12">Lesions can affect more than fluency</text></g><g transform="translate(570 65)"><rect width="350" height="125" rx="14" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2"/><text x="175" y="30" fill="#fff" font-size="15" font-weight="700">POSTERIOR TEMPORAL REGIONS</text><text x="175" y="56" fill="#dbeafe" font-size="13">Historically called Wernicke&apos;s area</text><text x="175" y="82" fill="#bfdbfe" font-size="12">Often linked with language comprehension</text><text x="175" y="104" fill="#bfdbfe" font-size="12">Anatomical definitions and deficits vary</text></g></g><path d="M215 190L365 225M745 190L595 225" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch20LanguageArrow)"/><rect x="180" y="220" width="600" height="105" rx="16" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="480" y="248" text-anchor="middle" fill="#fff" font-family="system-ui" font-size="16" font-weight="700">DISTRIBUTED LANGUAGE NETWORK</text><g fill="#d1fae5" font-family="system-ui" font-size="13" text-anchor="middle"><text x="300" y="280">Frontal regions</text><text x="480" y="280">Temporal regions</text><text x="660" y="280">Parietal regions</text></g><path d="M335 285H445M515 285H625M300 300C390 340 570 340 660 300" fill="none" stroke="#6ee7b7" stroke-width="3" stroke-dasharray="6,4"/><text x="480" y="316" text-anchor="middle" fill="#a7f3d0" font-family="system-ui" font-size="12">Dorsal and ventral connections; cortical and subcortical contributions</text><text x="480" y="352" text-anchor="middle" fill="#fbbf24" font-family="system-ui" font-size="13" font-weight="700">Classic aphasia labels are exam shorthand, not one-region / one-function rules.</text><text x="480" y="375" text-anchor="middle" fill="#cbd5e1" font-family="system-ui" font-size="12">Real localization uses the complete language, neurological, and imaging pattern.</text></svg>',
    correctionSummary: 'Replaced one-to-one production and comprehension labels with historically anchored, anatomically qualified cards and a visible distributed-network model while retaining classic aphasia exam cues.',
  }, ['tremblayDick', 'fedorenkoLanguage']),

  withSources({
    placementId: 'diagram-placement-ch-21-section-02',
    chapterId: 'ch-21',
    sectionIndex: 2,
    expectedHeading: 'Major Neurotransmitters',
    sourceFile: 'js/textbook_ch21.js',
    expectedOriginal: {
      title: '',
      description: 'Four dopamine pathways: associations and D2-blockade effects',
      svgSha256: '0680cf7524ebf3f1cb910517b2505445cb0aa7f4761ae14758e34ecc00e32057',
    },
    title: 'Dopamine Pathways Show Associations, Not One-Chemical Diagnoses',
    description: 'Four cards distinguish mesolimbic associations with salience, motivation, reward learning, psychosis research, and D2-related antipsychotic benefit; mesocortical associations with cognition, motivation, and prefrontal hypotheses; nigrostriatal motor function, Parkinson disease neuron loss, and extrapyramidal risk from D2 antagonism; and tuberoinfundibular inhibition of prolactin with medication-related hyperprolactinemia risk. A footer notes that antipsychotics differ in antagonism or partial agonism, affinity, occupancy, kinetics, and other receptor actions.',
    svg: '<svg viewBox="0 0 960 395" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch21DopamineTitle ch21DopamineDesc"><title id="ch21DopamineTitle">Four dopamine pathway associations and medication effects</title><desc id="ch21DopamineDesc">Four cards summarize mesolimbic, mesocortical, nigrostriatal, and tuberoinfundibular functions, cautious psychosis associations, Parkinson disease neuron loss, extrapyramidal risk, and prolactin effects. Drug actions and individual outcomes vary.</desc><rect width="960" height="395" rx="20" fill="#0f172a"/><text x="480" y="30" text-anchor="middle" fill="#f8fafc" font-family="system-ui" font-size="20" font-weight="700">Dopamine pathways: selected associations and medication effects</text><g font-family="system-ui" text-anchor="middle"><g transform="translate(20 55)"><rect width="220" height="260" rx="14" fill="#7f1d1d" stroke="#f87171" stroke-width="2"/><text x="110" y="34" fill="#fff" font-size="16" font-weight="700">MESOLIMBIC</text><text x="110" y="68" fill="#fee2e2" font-size="12">Salience, motivation,</text><text x="110" y="88" fill="#fee2e2" font-size="12">and reward learning</text><line x1="25" y1="110" x2="195" y2="110" stroke="#fca5a5"/><text x="110" y="139" fill="#fecaca" font-size="12">Altered dopamine is one</text><text x="110" y="159" fill="#fecaca" font-size="12">psychosis association</text><text x="110" y="198" fill="#fff" font-size="12" font-weight="700">D2-related action can</text><text x="110" y="218" fill="#fff" font-size="12" font-weight="700">support antipsychotic benefit</text></g><g transform="translate(253 55)"><rect width="220" height="260" rx="14" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2"/><text x="110" y="34" fill="#fff" font-size="16" font-weight="700">MESOCORTICAL</text><text x="110" y="68" fill="#dbeafe" font-size="12">Cognition, motivation,</text><text x="110" y="88" fill="#dbeafe" font-size="12">and executive functions</text><line x1="25" y1="110" x2="195" y2="110" stroke="#93c5fd"/><text x="110" y="139" fill="#bfdbfe" font-size="12">Prefrontal dopamine models</text><text x="110" y="159" fill="#bfdbfe" font-size="12">remain hypotheses</text><text x="110" y="198" fill="#fff" font-size="12" font-weight="700">Medication effects vary</text><text x="110" y="218" fill="#fff" font-size="12" font-weight="700">by drug and person</text></g><g transform="translate(486 55)"><rect width="220" height="260" rx="14" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="110" y="34" fill="#fff" font-size="16" font-weight="700">NIGROSTRIATAL</text><text x="110" y="78" fill="#d1fae5" font-size="12">Motor control</text><line x1="25" y1="110" x2="195" y2="110" stroke="#6ee7b7"/><text x="110" y="139" fill="#a7f3d0" font-size="12">Dopamine-neuron loss is</text><text x="110" y="159" fill="#a7f3d0" font-size="12">central in Parkinson disease</text><text x="110" y="198" fill="#fff" font-size="12" font-weight="700">D2 antagonism can raise</text><text x="110" y="218" fill="#fff" font-size="12" font-weight="700">extrapyramidal risk</text></g><g transform="translate(719 55)"><rect width="220" height="260" rx="14" fill="#78350f" stroke="#fbbf24" stroke-width="2"/><text x="110" y="34" fill="#fff" font-size="14" font-weight="700">TUBEROINFUNDIBULAR</text><text x="110" y="68" fill="#fef3c7" font-size="12">Dopamine restrains</text><text x="110" y="88" fill="#fef3c7" font-size="12">prolactin release</text><line x1="25" y1="110" x2="195" y2="110" stroke="#fcd34d"/><text x="110" y="139" fill="#fde68a" font-size="12">Some D2-acting drugs</text><text x="110" y="159" fill="#fde68a" font-size="12">can raise prolactin</text><text x="110" y="198" fill="#fff" font-size="12" font-weight="700">Risk differs substantially</text><text x="110" y="218" fill="#fff" font-size="12" font-weight="700">across agents</text></g></g><rect x="70" y="335" width="820" height="42" rx="10" fill="#1e293b" stroke="#94a3b8"/><text x="480" y="352" text-anchor="middle" fill="#e2e8f0" font-family="system-ui" font-size="12">Antipsychotics differ in antagonism or partial agonism, affinity, occupancy, kinetics,</text><text x="480" y="369" text-anchor="middle" fill="#e2e8f0" font-family="system-ui" font-size="12">and other receptor actions. Pathway associations are not one-chemical diagnoses.</text></svg>',
    correctionSummary: 'Added a full alternative and learner title, raised every label to at least 12 units, replaced deterministic pathway claims with associations, and distinguished D2 antagonism from partial agonism and other drug-specific properties.',
  }, ['dopamineReview', 'dopamineSystematic']),

  withSources({
    placementId: 'diagram-placement-ch-15-section-02',
    chapterId: 'ch-15',
    sectionIndex: 2,
    expectedHeading: 'Structural Family Therapy (Minuchin)',
    sourceFile: 'js/textbook_ch15.js',
    expectedOriginal: {
      title: '',
      description: 'Structural family therapy boundary continuum',
      svgSha256: 'e9aec0a2b671ba7d33f5c9d9c1a9d4d64577346900af882c342c9d48f2b71c70',
    },
    title: 'Structural Family Therapy Examines Boundaries in Context',
    description: 'Three cards compare structural-theory labels: diffuse or enmeshed boundaries involve greater permeability and may constrain autonomy; clear or flexible boundaries support connection and autonomy responsive to context; and rigid or disengaged boundaries involve lower permeability and may constrain support. The cards are not diagnoses or universal ratings. A footer directs interpretation to the specific subsystem, task, development, culture, safety, caregiving responsibilities, and family members\u2019 perspectives.',
    svg: '<svg viewBox="0 0 920 365" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ch15BoundaryTitle ch15BoundaryDesc"><title id="ch15BoundaryTitle">Structural family therapy boundary patterns in context</title><desc id="ch15BoundaryDesc">Three structural-theory cards compare diffuse or enmeshed, clear or flexible, and rigid or disengaged boundary patterns. Meaning depends on subsystem, task, development, culture, safety, caregiving responsibilities, and family perspectives.</desc><rect width="920" height="365" rx="20" fill="#0f172a"/><text x="460" y="30" text-anchor="middle" fill="#f8fafc" font-family="system-ui" font-size="20" font-weight="700">Structural family therapy: boundary patterns in context</text><g font-family="system-ui" text-anchor="middle"><g transform="translate(25 58)"><rect width="270" height="215" rx="14" fill="#7f1d1d" stroke="#f87171" stroke-width="2"/><text x="135" y="34" fill="#fff" font-size="15" font-weight="700">DIFFUSE / ENMESHED</text><text x="135" y="61" fill="#fee2e2" font-size="12">Greater permeability</text><circle cx="95" cy="115" r="32" fill="#ef4444" opacity="0.45"/><circle cx="135" cy="115" r="32" fill="#ef4444" opacity="0.45"/><circle cx="175" cy="115" r="32" fill="#ef4444" opacity="0.45"/><text x="135" y="172" fill="#fecaca" font-size="12">May constrain autonomy</text><text x="135" y="194" fill="#fecaca" font-size="12">in a given subsystem or task</text></g><g transform="translate(325 58)"><rect width="270" height="215" rx="14" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="135" y="34" fill="#fff" font-size="15" font-weight="700">CLEAR / FLEXIBLE</text><text x="135" y="61" fill="#d1fae5" font-size="12">Context-responsive contact</text><circle cx="83" cy="115" r="27" fill="#10b981" opacity="0.35" stroke="#34d399" stroke-width="2"/><circle cx="135" cy="115" r="27" fill="#10b981" opacity="0.35" stroke="#34d399" stroke-width="2"/><circle cx="187" cy="115" r="27" fill="#10b981" opacity="0.35" stroke="#34d399" stroke-width="2"/><text x="135" y="172" fill="#a7f3d0" font-size="12">Supports connection</text><text x="135" y="194" fill="#a7f3d0" font-size="12">and autonomy</text></g><g transform="translate(625 58)"><rect width="270" height="215" rx="14" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2"/><text x="135" y="34" fill="#fff" font-size="15" font-weight="700">RIGID / DISENGAGED</text><text x="135" y="61" fill="#dbeafe" font-size="12">Lower permeability</text><circle cx="70" cy="115" r="25" fill="#3b82f6" opacity="0.3" stroke="#60a5fa" stroke-width="2"/><circle cx="135" cy="115" r="25" fill="#3b82f6" opacity="0.3" stroke="#60a5fa" stroke-width="2"/><circle cx="200" cy="115" r="25" fill="#3b82f6" opacity="0.3" stroke="#60a5fa" stroke-width="2"/><text x="135" y="172" fill="#bfdbfe" font-size="12">May constrain support</text><text x="135" y="194" fill="#bfdbfe" font-size="12">in a given subsystem or task</text></g></g><rect x="55" y="292" width="810" height="55" rx="12" fill="#1e293b" stroke="#94a3b8"/><text x="460" y="312" text-anchor="middle" fill="#fbbf24" font-family="system-ui" font-size="13" font-weight="700">Theory labels, not diagnoses or universal judgments.</text><text x="460" y="333" text-anchor="middle" fill="#e2e8f0" font-family="system-ui" font-size="12">Interpret by subsystem, task, development, culture, safety, caregiving, and family perspectives.</text></svg>',
    correctionSummary: 'Added a full alternative and learner title, raised every label to at least 12 units, reframed the continuum as contextual theory labels, and made subsystem, development, culture, safety, caregiving, and perspective boundaries visible.',
  }, ['apaStructural', 'minuchinBook']),
].map((item) => ({
  ...item,
  reviewStatus: 'source-reviewed-editorial-pass',
  reviewWave,
  reviewDate,
  reviewNote: `Diagram wording, labels, and placement were reviewed for source alignment, factual clarity, accessibility, and learner interpretation. ${item.correctionSummary} Independent qualified expert validation remains pending.`,
  checks: { ...commonChecks },
}));

module.exports = { reviewWave, reviewDate, sourceRecords, corrections };
