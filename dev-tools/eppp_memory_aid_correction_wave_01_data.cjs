'use strict';

const MANUAL_PROVENANCE_IDS = [
  'memory-aid-93e9d82228226719',
  'memory-aid-1709f623adcd8ca3',
  'memory-aid-13eb4b84a468f70e',
  'memory-aid-65cce325295440e1',
  'memory-aid-a54eb3d18d8152b2',
  'memory-aid-9992bd978c9152fa',
  'memory-aid-75406919861722df',
  'memory-aid-d011989a01fbace5',
];

const UNICODE_CONTENT_REPLACEMENTS = {
  'memory-aid-9b6b5983a642694a': [
    ['Erikson?s', 'Erikson\u2019s'],
    ['trust?mistrust', 'trust\u2013mistrust'],
    ['autonomy?shame', 'autonomy\u2013shame'],
    ['initiative?guilt', 'initiative\u2013guilt'],
    ['industry?inferiority', 'industry\u2013inferiority'],
    ['identity?role', 'identity\u2013role'],
    ['intimacy?isolation', 'intimacy\u2013isolation'],
    ['generativity?stagnation', 'generativity\u2013stagnation'],
    ['integrity?despair', 'integrity\u2013despair'],
    ['conventions?not', 'conventions\u2014not'],
  ],
  'memory-aid-d224f260cac7462f': [
    ['Vygotsky?s', 'Vygotsky\u2019s'],
    ['Avoid ?all learning happens only here.?', 'Avoid \u201call learning happens only here.\u201d'],
  ],
  'memory-aid-89105cc23ac46bea': [
    ['context?not ?the test? in', 'context\u2014not \u201cthe test\u201d in'],
    ['slogan ?validity is accuracy?', 'slogan \u201cvalidity is accuracy\u201d'],
  ],
  'memory-aid-32ef54e1330c4314': [
    ['Chosen ? controls', 'Chosen \u03b1 controls'],
    ['probability ?. **Power = 1 ? ?**', 'probability \u03b2. **Power = 1 \u2212 \u03b2**'],
  ],
  'memory-aid-d0be7b76c2ced3a3': [
    ['distinctiveness?evidence', 'distinctiveness\u2014evidence'],
    ['actor?observer', 'actor\u2013observer'],
  ],
  'memory-aid-59b232effad0d762': [
    ['Carlsmith?s', 'Carlsmith\u2019s'],
  ],
  'memory-aid-b3e0e08491d9100d': [
    ['2?2 table', '2\u00d72 table'],
  ],
  'memory-aid-b77f88b5b4c35b7a': [
    ['engaging ? focusing ? evoking ? planning', 'engaging \u2192 focusing \u2192 evoking \u2192 planning'],
    ['OARS?open', 'OARS\u2014open'],
    ['summaries?supports', 'summaries\u2014supports'],
    ['person?s', 'person\u2019s'],
  ],
  'memory-aid-cafad3c2f0114ed7': [
    ['SD ? ?(1 ? reliability)', 'SD \u00d7 \u221a(1 \u2212 reliability)'],
    ['??1 SEM guarantees a 68% true-score range?', '\u201c\u00b11 SEM guarantees a 68% true-score range\u201d'],
    ['decision rule?not', 'decision rule\u2014not'],
  ],
  'memory-aid-9e82a078f0f1652a': [
    ['removed (?)?', 'removed (\u2212)?'],
    ['behavior change?not', 'behavior change\u2014not'],
  ],
  'memory-aid-53a52aa301b81106': [
    ['Threshold ? rising phase ? falling phase ? afterhyperpolarization ? recovery', 'Threshold \u2192 rising phase \u2192 falling phase \u2192 afterhyperpolarization \u2192 recovery'],
    ['timing vary?memorize', 'timing vary\u2014memorize'],
  ],
  'memory-aid-2d80e59718d3de5d': [
    ['myelinate?do not', 'myelinate\u2014do not'],
    ['passive ?glue.?', 'passive \u201cglue.\u201d'],
    ['blood?brain', 'blood\u2013brain'],
    ['outdated ?glia outnumber neurons 10:1 everywhere? shortcut', 'outdated \u201cglia outnumber neurons 10:1 everywhere\u201d shortcut'],
  ],
  'memory-aid-bb7f154d8734f48e': [
    ['Principles A?E', 'Principles A\u2013E'],
    ['People?s', 'People\u2019s'],
  ],
  'memory-aid-6d25e9aece50a964': [
    ['Baddeley?s', 'Baddeley\u2019s'],
    ['?7 ? 2?', '\u201c7 \u00b1 2\u201d'],
  ],
};

const UNICODE_METADATA_REPLACEMENTS = {
  'memory-aid-b3e0e08491d9100d': [['authority?s', 'authority\u2019s']],
  'memory-aid-4827bf719ada6db6': [['APA?s', 'APA\u2019s']],
  'memory-aid-2d80e59718d3de5d': [['?Glial Cells?', '\u201cGlial Cells\u201d']],
  'memory-aid-bb7f154d8734f48e': [['APA?s', 'APA\u2019s']],
  'memory-aid-93e9d82228226719': [['APA?s', 'APA\u2019s']],
};

const REVIEW_NOTE_REPLACEMENTS = {
  'memory-aid-6d25e9aece50a964': [['7?2', '7 \u00b1 2']],
};

const DUPLICATE_PURPOSE_TITLES = {
  'memory-aid-8b2eea8339d6ce5b': 'Reinforcement Schedules: Four Basic Patterns',
  'memory-aid-5b8768222163c497': 'Reinforcement Schedules: Application & Extinction Nuance',
  'memory-aid-59487db95f2ff3ea': 'Intellectual Disability: Assessment Principles',
  'memory-aid-75406919861722df': 'Intellectual Disability: DSM-5-TR Criteria Cue',
  'memory-aid-f544e474db9589e8': 'Teratogens: Exposure Risk Factors',
  'memory-aid-cf7fd0ed8fcd3826': 'Prenatal Critical Periods & Teratogen Timing',
  'memory-aid-17c813e9917a2a88': 'Effect-Size Benchmarks: Cohen Conventions',
  'memory-aid-8a12ab83499601e5': 'Effect-Size Interpretation in Context',
  'memory-aid-a9466a34b18904da': 'Infant Attachment: Strange Situation Classifications',
  'memory-aid-1709f623adcd8ca3': 'Ainsworth Strange Situation: Procedure & Interpretation',
  'memory-aid-de048afe0e382d04': 'Duty to Protect: Current-Law Decision Framework',
  'memory-aid-ecaf8cdc679550e9': 'Tarasoff: California Case & Historical Rule',
  'memory-aid-77466b97050b1532': 'Clinical Documentation: SOAPIER, Access & Retention',
  'memory-aid-65cce325295440e1': 'Record Retention & Legal Demands',
};

const TITLE_CURRENTNESS_OVERRIDES = {
  'memory-aid-28fd96d344b9008e': 'Schizophrenia Criteria: DSM-5-TR Cue',
  'memory-aid-9455736a7497a5a4': 'Major Depressive Episode: DSM-5-TR Criteria Cue',
  'memory-aid-a54eb3d18d8152b2': 'ADHD Presentations: DSM-5-TR Cue',
  'memory-aid-482b603596c65a36': 'Personality Disorder Clusters: DSM-5-TR Cue',
  'memory-aid-1c6c42c0298ca5f4': 'Anxiety, OCD & Trauma-Related Differentials: DSM-5-TR Cue',
  'memory-aid-c03593684f409ca7': 'Substance Use Disorder: DSM-5-TR Criteria Cue',
};

const CONTENT_OVERRIDES = {
  'memory-aid-1709f623adcd8ca3': '**Procedure first:** Ainsworth\u2019s Strange Situation is a standardized series of infant\u2013caregiver separations, reunions, and exposure to an unfamiliar adult. Trained coders consider exploration, distress, proximity seeking, contact maintenance, avoidance, resistance, and the organization of reunion behavior across the full procedure. The resulting secure, avoidant, resistant/ambivalent, or disorganized classification describes behavior in that relationship and assessment context; it is not a fixed child diagnosis, a caregiver personality label, proof of maltreatment, or a forecast of every later relationship. Distinguish this observational infant procedure from adult attachment self-reports and the Adult Attachment Interview. Culture, developmental status, stress, familiarity, and measurement conditions affect interpretation.',
  'memory-aid-c4ee337cb0ae9dc8': '**Use three separate maps: INJURY, SEIZURE CLASS, and COGNITIVE SYNDROME.** **TBI:** A concussion is a mild traumatic brain injury, and loss of consciousness is not required. Acute severity classifications may combine Glasgow Coma Scale scores with loss or alteration of consciousness, post-traumatic amnesia, imaging, timing, and clinical context; a mnemonic or one score is not a diagnosis or prognosis. Symptoms can emerge later, and red flags require prompt medical evaluation. **Seizures:** The 2025 ILAE classification uses four main classes\u2014focal, generalized, unknown whether focal or generalized, and unclassified\u2014then adds classifiers and descriptors supported by the observed chronology and available evidence. Consciousness replaces awareness as a classifier, and observable versus nonobservable manifestations replace the older motor versus nonmotor split. \u201cGrand mal,\u201d \u201cpetit mal,\u201d and \u201csimple/complex partial\u201d are legacy terms, and one seizure is not automatically epilepsy. Treatment depends on seizure type, cause, comorbidity, and the person; do not attach one medication to a category by rote. **Dementia:** Alzheimer disease, vascular contributions, Lewy body disease, frontotemporal disorders, and mixed pathologies can produce overlapping and variable presentations. A pattern may guide a differential diagnosis, but no single symptom proves an etiology. Depression, delirium, medications, metabolic conditions, and other disorders can impair cognition, so avoid the imprecise label \u201cpseudodementia\u201d and assess potentially reversible contributors.',
};

const SOURCE_OVERRIDES = {
  'memory-aid-93e9d82228226719': {
    references: ['https://www.apa.org/ethics/code'],
    sourceDetails: [{
      title: 'Ethical Principles of Psychologists and Code of Conduct',
      organization: 'American Psychological Association',
      url: 'https://www.apa.org/ethics/code',
      whyReputable: 'APA\u2019s official primary ethics text, including confidentiality standards and legally created limits.',
    }],
  },
  'memory-aid-65cce325295440e1': {
    references: [
      'https://doi.org/10.1037/0003-066X.62.9.993',
      'https://www.apa.org/ethics/code',
    ],
    sourceDetails: [
      {
        title: 'Record Keeping Guidelines',
        organization: 'American Psychological Association',
        url: 'https://doi.org/10.1037/0003-066X.62.9.993',
        whyReputable: 'A peer-reviewed APA professional guideline on record content, confidentiality, retention, and legal context.',
      },
      {
        title: 'Ethical Principles of Psychologists and Code of Conduct',
        organization: 'American Psychological Association',
        url: 'https://www.apa.org/ethics/code',
        whyReputable: 'APA\u2019s official primary ethics text supplies current professional boundaries for records, confidentiality, disclosures, and legal demands.',
      },
    ],
  },
  'memory-aid-9992bd978c9152fa': {
    references: [
      'https://www.cdc.gov/autism/about/index.html',
      'https://www.cdc.gov/autism/data-research/',
    ],
    sourceDetails: [
      {
        title: 'About Autism Spectrum Disorder',
        organization: 'Centers for Disease Control and Prevention',
        url: 'https://www.cdc.gov/autism/about/index.html',
        whyReputable: 'The U.S. federal public-health authority maintains current developmental-surveillance definitions and context.',
      },
      {
        title: 'Autism Data and Research',
        organization: 'Centers for Disease Control and Prevention',
        url: 'https://www.cdc.gov/autism/data-research/',
        whyReputable: 'The CDC\u2019s current surveillance hub documents that prevalence estimates depend on study year, population, location, and identification methods.',
      },
    ],
  },
  'memory-aid-c4ee337cb0ae9dc8': {
    replaceReference: {
      from: 'https://www.ilae.org/guidelines/definition-and-classification/operational-classification-2017',
      to: 'https://www.ilae.org/files/dmfile/updated-classification-of-epileptic-seizures-2025.pdf',
    },
    replaceSourceDetail: {
      url: 'https://www.ilae.org/guidelines/definition-and-classification/operational-classification-2017',
      value: {
        title: 'Updated Classification of Epileptic Seizures (2025)',
        organization: 'International League Against Epilepsy',
        url: 'https://www.ilae.org/files/dmfile/updated-classification-of-epileptic-seizures-2025.pdf',
        whyReputable: 'The ILAE Executive Committee-approved 2025 position paper is the current primary professional classification and supersedes the 2017 seizure terminology used by the prior aid.',
      },
    },
  },
  'memory-aid-975f2d9055198688': {
    references: ['https://www.apa.org/ptsd-guideline/patients-and-families/cognitive-behavioral'],
    sourceDetails: [{
      title: 'What Is Cognitive Behavioral Therapy?',
      organization: 'American Psychological Association, Division 12',
      url: 'https://www.apa.org/ptsd-guideline/patients-and-families/cognitive-behavioral',
      whyReputable: 'This APA-hosted Society of Clinical Psychology resource directly describes CBT\u2019s collaborative formulation, linked cognitive-emotional-behavioral processes, and adaptable strategies.',
    }],
  },
  'memory-aid-52975d7ab9dc4cfb': {
    references: [
      'https://www.apa.org/practice/guidelines/evidence-based-statement.html',
      'https://www.nice.org.uk/guidance/cg31/chapter/Recommendations',
      'https://www.nice.org.uk/guidance/ng222/chapter/Recommendations',
      'https://www.apa.org/ptsd-guideline',
    ],
    sourceDetails: [
      {
        title: 'Policy Statement on Evidence-Based Practice in Psychology',
        organization: 'American Psychological Association',
        url: 'https://www.apa.org/practice/guidelines/evidence-based-statement.html',
        whyReputable: 'APA\u2019s official policy defines evidence-based practice as integration of research, expertise, and patient characteristics, culture, and preferences.',
      },
      {
        title: 'Obsessive-Compulsive Disorder and Body Dysmorphic Disorder: Recommendations',
        organization: 'National Institute for Health and Care Excellence',
        url: 'https://www.nice.org.uk/guidance/cg31/chapter/Recommendations',
        whyReputable: 'This evidence-based clinical guideline directly supports ERP and CBT options for OCD while distinguishing intensity, age, impairment, and preference.',
      },
      {
        title: 'Depression in Adults: Treatment and Management',
        organization: 'National Institute for Health and Care Excellence',
        url: 'https://www.nice.org.uk/guidance/ng222/chapter/Recommendations',
        whyReputable: 'This current evidence-based guideline directly addresses behavioral activation, CBT, other psychological treatments, medication, shared decisions, and monitoring for depression.',
      },
      {
        title: 'Clinical Practice Guideline for the Treatment of PTSD in Adults',
        organization: 'American Psychological Association',
        url: 'https://www.apa.org/ptsd-guideline',
        whyReputable: 'APA\u2019s evidence-based PTSD guideline directly supports the aid\u2019s trauma-focused psychotherapy example and its population-specific framing.',
      },
    ],
  },
  'memory-aid-28fd96d344b9008e': {
    references: [
      'https://www.psychiatry.org/File%20Library/Psychiatrists/Practice/DSM/APA_DSM-5-Schizophrenia.pdf',
      'https://www.nimh.nih.gov/health/publications/schizophrenia',
    ],
    sourceDetails: [
      {
        title: 'Schizophrenia: DSM-5 Changes',
        organization: 'American Psychiatric Association',
        url: 'https://www.psychiatry.org/File%20Library/Psychiatrists/Practice/DSM/APA_DSM-5-Schizophrenia.pdf',
        whyReputable: 'This official American Psychiatric Association DSM resource directly addresses the diagnostic framework and changes behind the aid\u2019s DSM retrieval cue.',
      },
      {
        title: 'Schizophrenia',
        organization: 'National Institute of Mental Health, National Institutes of Health',
        url: 'https://www.nimh.nih.gov/health/publications/schizophrenia',
        whyReputable: 'This current federal clinical-information resource directly supports symptom categories, functional impact, differential caution, and the distinction from dissociative identity disorder.',
      },
    ],
  },
};

const SOURCE_DIRECTNESS_IDS = [
  'memory-aid-975f2d9055198688',
  'memory-aid-52975d7ab9dc4cfb',
  'memory-aid-28fd96d344b9008e',
];

module.exports = {
  CONTENT_OVERRIDES,
  DUPLICATE_PURPOSE_TITLES,
  MANUAL_PROVENANCE_IDS,
  REVIEW_NOTE_REPLACEMENTS,
  SOURCE_DIRECTNESS_IDS,
  SOURCE_OVERRIDES,
  TITLE_CURRENTNESS_OVERRIDES,
  UNICODE_CONTENT_REPLACEMENTS,
  UNICODE_METADATA_REPLACEMENTS,
};
