'use strict';

const AUD_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5343.pdf';
const AUD_STANDARDS =
  'https://www.asha.org/certification/2020-Audiology-Certification-Standards/';
const AUD_SCOPE = 'https://www.asha.org/policy/SP2018-00353/';
const AUD_HEARING_LOSS =
  'https://www.asha.org/practice-portal/clinical-topics/hearing-loss/';
const AUD_OSHA = 'https://www.osha.gov/noise/hearing-programs';
const AUD_CDC_CHILDREN = 'https://www.cdc.gov/hearing-loss-children/about/';
const AUD_SCHOOL_GL = 'https://www.asha.org/policy/gl2002-00005/';
const AUD_PRACTICE_PORTAL = 'https://www.asha.org/practice-portal/';
const AUD_COCHLEAR =
  'https://www.asha.org/practice-portal/professional-issues/cochlear-implants/';
const AUD_ETHICS = 'https://www.asha.org/code-of-ethics/';
const AUD_FERPA = 'https://studentprivacy.ed.gov/ferpa';
const AUD_HIPAA =
  'https://www.hhs.gov/hipaa/for-professionals/privacy/index.html';

const SLP_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5331.pdf';
const SLP_STANDARDS =
  'https://www.asha.org/Certification/2020-SLP-Certification-Standards/';
const SLP_SCOPE = 'https://www.asha.org/policy/sp2016-00343/';
const SLP_IDEA = 'https://sites.ed.gov/idea/regs/b/d/300.304';
const SLP_EBP = 'https://www.asha.org/research/ebp/';
const SLP_MULTICULTURAL = 'https://www.asha.org/practice/multicultural/';
const SLP_ARTIC =
  'https://www.asha.org/practice-portal/clinical-topics/articulation-and-phonology/';
const SLP_DYSARTHRIA =
  'https://www.asha.org/practice-portal/clinical-topics/dysarthria-in-adults/';
const SLP_APHASIA =
  'https://www.asha.org/practice-portal/clinical-topics/aphasia/';
const SLP_SCHOOL_ASSESS =
  'https://www.asha.org/slp/assessment-and-evaluation-of-speech-language-disorders-in-schools/';
const SLP_SPOKEN_LANG =
  'https://www.asha.org/practice-portal/clinical-topics/spoken-language-disorders/';
const SLP_AAC =
  'https://www.asha.org/practice-portal/clinical-topics/augmentative-and-alternative-communication/';
const SLP_ADULT_DYSPHAGIA =
  'https://www.asha.org/practice-portal/clinical-topics/adult-dysphagia/';
const SLP_PED_FEEDING =
  'https://www.asha.org/practice-portal/clinical-topics/pediatric-feeding-and-swallowing/';

function makeEntry({
  id,
  term,
  definition,
  aliases,
  chapterId,
  chapterTitle,
  domainId,
  domainLabel,
  sectionId,
  sectionHeading,
  references,
}) {
  return {
    id,
    term,
    definition,
    aliases,
    chapterIds: [chapterId],
    domainIds: [domainId],
    linkage: {
      occurrences: [
        {
          chapterId,
          chapterTitle,
          domainId,
          domain: domainLabel,
          sectionId,
          sectionHeading,
          occurrences: 1,
        },
      ],
    },
    reviewStatus: 'source-reviewed-editorial-pass',
    references: references.slice(),
  };
}

const audiology_5343 = [
  // Chapter 1: Auditory Anatomy, Physiology, Acoustics, and Instrumentation
  makeEntry({
    id: 'aud5343-gloss-01',
    term: 'Impedance matching',
    definition:
      'Middle-ear transformer function that overcomes the acoustic impedance mismatch between air and cochlear fluid via the tympanic-to-oval-window area ratio and ossicular lever action.',
    aliases: ['Middle-ear transformer'],
    chapterId: 'aud5343-ch-01',
    chapterTitle:
      'Auditory Anatomy, Physiology, Acoustics, and Instrumentation',
    domainId: 'foundations-audiology',
    domainLabel: 'Foundations of Audiology',
    sectionId: 'aud5343-ch-01-section-01',
    sectionHeading: 'Outer, middle, and inner-ear systems',
    references: [AUD_PRAXIS, AUD_STANDARDS],
  }),
  makeEntry({
    id: 'aud5343-gloss-02',
    term: 'Cochlear amplifier',
    definition:
      'Active biological process in which outer hair cell electromotility amplifies low-level basilar membrane vibration, sharpening cochlear frequency tuning and improving threshold sensitivity.',
    aliases: ['OHC electromotility'],
    chapterId: 'aud5343-ch-01',
    chapterTitle:
      'Auditory Anatomy, Physiology, Acoustics, and Instrumentation',
    domainId: 'foundations-audiology',
    domainLabel: 'Foundations of Audiology',
    sectionId: 'aud5343-ch-01-section-02',
    sectionHeading: 'Hair-cell transduction and cochlear mechanics',
    references: [AUD_PRAXIS, AUD_STANDARDS],
  }),

  // Chapter 2: Psychoacoustics, Auditory Development, and Lifespan Effects
  makeEntry({
    id: 'aud5343-gloss-03',
    term: 'Upward spread of masking',
    definition:
      'Psychoacoustic asymmetry in which intense low-frequency sounds mask higher-frequency signals more effectively than the reverse, reducing consonant audibility in noisy settings.',
    aliases: ['Low-frequency masking spread'],
    chapterId: 'aud5343-ch-02',
    chapterTitle: 'Psychoacoustics, Auditory Development, and Lifespan Effects',
    domainId: 'foundations-audiology',
    domainLabel: 'Foundations of Audiology',
    sectionId: 'aud5343-ch-02-section-02',
    sectionHeading: 'Masking and temporal processing',
    references: [AUD_PRAXIS, AUD_HEARING_LOSS],
  }),
  makeEntry({
    id: 'aud5343-gloss-04',
    term: 'Interaural time difference',
    definition:
      'Microsecond arrival-time disparity of an acoustic signal between the two ears, serving as the primary binaural cue for horizontal sound localization at frequencies below about 1500 Hz.',
    aliases: ['ITD'],
    chapterId: 'aud5343-ch-02',
    chapterTitle: 'Psychoacoustics, Auditory Development, and Lifespan Effects',
    domainId: 'foundations-audiology',
    domainLabel: 'Foundations of Audiology',
    sectionId: 'aud5343-ch-02-section-03',
    sectionHeading: 'Binaural hearing and speech in noise',
    references: [AUD_PRAXIS, AUD_STANDARDS],
  }),

  // Chapter 3: Hearing Prevention, Conservation, and Ototoxic Monitoring
  makeEntry({
    id: 'aud5343-gloss-05',
    term: 'Standard threshold shift',
    definition:
      'Occupational hearing-conservation benchmark defined by OSHA as an average hearing threshold deterioration of 10 dB or more at 2000, 3000, and 4000 Hz in either ear relative to baseline.',
    aliases: ['STS'],
    chapterId: 'aud5343-ch-03',
    chapterTitle: 'Hearing Prevention, Conservation, and Ototoxic Monitoring',
    domainId: 'prevention-screening',
    domainLabel: 'Prevention and Screening',
    sectionId: 'aud5343-ch-03-section-03',
    sectionHeading: 'Monitoring and standard threshold shifts',
    references: [AUD_PRAXIS, AUD_OSHA],
  }),
  makeEntry({
    id: 'aud5343-gloss-06',
    term: 'Ototoxicity monitoring',
    definition:
      'Prospective serial auditory surveillance using ultra-high-frequency audiometry and otoacoustic emissions to detect early cochlear damage from platinum agents or aminoglycosides.',
    aliases: ['Ototoxic surveillance'],
    chapterId: 'aud5343-ch-03',
    chapterTitle: 'Hearing Prevention, Conservation, and Ototoxic Monitoring',
    domainId: 'prevention-screening',
    domainLabel: 'Prevention and Screening',
    sectionId: 'aud5343-ch-03-section-04',
    sectionHeading: 'Ototoxic and recreational risk counseling',
    references: [AUD_PRAXIS, AUD_SCOPE],
  }),

  // Chapter 4: Screening, EHDI, and School Identification Programs
  makeEntry({
    id: 'aud5343-gloss-07',
    term: 'Screening sensitivity and specificity',
    definition:
      'Diagnostic accuracy indices quantifying a screening test’s ability to identify true hearing loss (sensitivity) and correctly pass individuals without target disorder (specificity).',
    aliases: ['Screening validity metrics'],
    chapterId: 'aud5343-ch-04',
    chapterTitle: 'Screening, EHDI, and School Identification Programs',
    domainId: 'prevention-screening',
    domainLabel: 'Prevention and Screening',
    sectionId: 'aud5343-ch-04-section-01',
    sectionHeading: 'Screening purpose and decision rules',
    references: [AUD_PRAXIS, AUD_SCHOOL_GL],
  }),
  makeEntry({
    id: 'aud5343-gloss-08',
    term: 'Early Hearing Detection and Intervention',
    definition:
      'Public-health continuum targeting universal newborn hearing screening by 1 month, diagnostic audiologic evaluation by 3 months, and early intervention enrollment by 6 months of age.',
    aliases: ['EHDI', '1-3-6 benchmarks'],
    chapterId: 'aud5343-ch-04',
    chapterTitle: 'Screening, EHDI, and School Identification Programs',
    domainId: 'prevention-screening',
    domainLabel: 'Prevention and Screening',
    sectionId: 'aud5343-ch-04-section-02',
    sectionHeading: 'Newborn screening and EHDI pathways',
    references: [AUD_PRAXIS, AUD_CDC_CHILDREN],
  }),

  // Chapter 5: Behavioral Audiometry, Speech Measures, and Functional Listening
  makeEntry({
    id: 'aud5343-gloss-09',
    term: 'Air–bone gap',
    definition:
      'Decibel difference between poorer air-conduction thresholds and better bone-conduction thresholds at the same frequency, with a 15 dB or greater gap signifying a conductive component.',
    aliases: ['ABG'],
    chapterId: 'aud5343-ch-05',
    chapterTitle:
      'Behavioral Audiometry, Speech Measures, and Functional Listening',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'aud5343-ch-05-section-01',
    sectionHeading: 'Pure-tone thresholds and transducer choices',
    references: [AUD_PRAXIS, AUD_SCOPE],
  }),
  makeEntry({
    id: 'aud5343-gloss-10',
    term: 'Interaural attenuation',
    definition:
      'Amount of acoustic energy lost as sound crosses the skull from the test ear to the non-test cochlea; varies by transducer and determines when clinical masking is needed to prevent cross-hearing.',
    aliases: ['IA'],
    chapterId: 'aud5343-ch-05',
    chapterTitle:
      'Behavioral Audiometry, Speech Measures, and Functional Listening',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'aud5343-ch-05-section-02',
    sectionHeading: 'Masking and cross-hearing control',
    references: [AUD_PRAXIS, AUD_STANDARDS],
  }),

  // Chapter 6: Immittance, Otoacoustic Emissions, and Electrophysiology
  makeEntry({
    id: 'aud5343-gloss-11',
    term: 'Otoacoustic emissions',
    definition:
      'Low-level acoustic signals generated by healthy cochlear outer hair cell motility and recorded in the ear canal, providing a rapid objective check of pre-neural cochlear integrity.',
    aliases: ['OAE', 'DPOAE/TEOAE'],
    chapterId: 'aud5343-ch-06',
    chapterTitle: 'Immittance, Otoacoustic Emissions, and Electrophysiology',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'aud5343-ch-06-section-03',
    sectionHeading: 'Otoacoustic emissions',
    references: [AUD_PRAXIS, AUD_PRACTICE_PORTAL],
  }),
  makeEntry({
    id: 'aud5343-gloss-12',
    term: 'Auditory brainstem response',
    definition:
      'Far-field scalp-recorded evoked potential capturing synchronous neural firing along cranial nerve VIII and brainstem auditory tracts to estimate thresholds and screen retrocochlear pathology.',
    aliases: ['ABR'],
    chapterId: 'aud5343-ch-06',
    chapterTitle: 'Immittance, Otoacoustic Emissions, and Electrophysiology',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'aud5343-ch-06-section-04',
    sectionHeading: 'ABR, ASSR, and cross-checking',
    references: [AUD_PRAXIS, AUD_PRACTICE_PORTAL],
  }),

  // Chapter 7: Vestibular, Tinnitus, Sound-Tolerance, and Auditory-Processing Assessment
  makeEntry({
    id: 'aud5343-gloss-13',
    term: 'Video head impulse test',
    definition:
      'Quantitative vestibular assessment measuring high-frequency vestibulo-ocular reflex gain and covert or overt catch-up saccades across all six semicircular canals during rapid head impulses.',
    aliases: ['vHIT'],
    chapterId: 'aud5343-ch-07',
    chapterTitle:
      'Vestibular, Tinnitus, Sound-Tolerance, and Auditory-Processing Assessment',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'aud5343-ch-07-section-02',
    sectionHeading: 'Canal and otolith test selection',
    references: [AUD_PRAXIS, AUD_PRACTICE_PORTAL],
  }),
  makeEntry({
    id: 'aud5343-gloss-14',
    term: 'Hyperacusis',
    definition:
      'Form of decreased sound tolerance in which ordinary everyday environmental sounds are perceived as abnormally loud, intrusive, or physically painful across a broad frequency range.',
    aliases: ['Decreased sound tolerance'],
    chapterId: 'aud5343-ch-07',
    chapterTitle:
      'Vestibular, Tinnitus, Sound-Tolerance, and Auditory-Processing Assessment',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'aud5343-ch-07-section-03',
    sectionHeading: 'Tinnitus and decreased sound tolerance',
    references: [AUD_PRAXIS, AUD_SCOPE],
  }),

  // Chapter 8: Integrated Diagnostic Reasoning and Pediatric Educational Assessment
  makeEntry({
    id: 'aud5343-gloss-15',
    term: 'Cross-check principle',
    definition:
      'Core diagnostic tenet requiring that no single audiologic test result be accepted as definitive until corroborated by independent physiologic, behavioral, or immittance measures.',
    aliases: ['Test battery cross-check'],
    chapterId: 'aud5343-ch-08',
    chapterTitle:
      'Integrated Diagnostic Reasoning and Pediatric Educational Assessment',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'aud5343-ch-08-section-01',
    sectionHeading: 'Cross-checking and resolving disagreement',
    references: [AUD_PRAXIS, AUD_STANDARDS],
  }),
  makeEntry({
    id: 'aud5343-gloss-16',
    term: 'Auditory neuropathy spectrum disorder',
    definition:
      'Retrocochlear or synaptic hearing condition marked by preserved outer hair cell function (present OAEs or cochlear microphonic) alongside absent or severely abnormal ABR neural synchrony.',
    aliases: ['ANSD'],
    chapterId: 'aud5343-ch-08',
    chapterTitle:
      'Integrated Diagnostic Reasoning and Pediatric Educational Assessment',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'aud5343-ch-08-section-03',
    sectionHeading: 'Urgent and specialized referral patterns',
    references: [AUD_PRAXIS, AUD_SCHOOL_GL],
  }),

  // Chapter 9: Hearing-Aid Selection, Fitting, Verification, and Validation
  makeEntry({
    id: 'aud5343-gloss-17',
    term: 'Real-ear measurement',
    definition:
      'Gold-standard probe-microphone verification method measuring sound pressure near the patient’s tympanic membrane to match hearing-aid output to validated prescriptive targets and MPO limits.',
    aliases: ['REM', 'Probe-microphone verification'],
    chapterId: 'aud5343-ch-09',
    chapterTitle:
      'Hearing-Aid Selection, Fitting, Verification, and Validation',
    domainId: 'intervention',
    domainLabel: 'Intervention',
    sectionId: 'aud5343-ch-09-section-02',
    sectionHeading: 'Prescriptive targets and real-ear verification',
    references: [AUD_PRAXIS, AUD_HEARING_LOSS],
  }),
  makeEntry({
    id: 'aud5343-gloss-18',
    term: 'Wide dynamic range compression',
    definition:
      'Nonlinear hearing-aid signal processing that applies greater gain to soft inputs and progressively less gain to loud sounds, packaging the speech spectrum into a reduced residual dynamic range.',
    aliases: ['WDRC'],
    chapterId: 'aud5343-ch-09',
    chapterTitle:
      'Hearing-Aid Selection, Fitting, Verification, and Validation',
    domainId: 'intervention',
    domainLabel: 'Intervention',
    sectionId: 'aud5343-ch-09-section-03',
    sectionHeading: 'Compression, microphones, and feedback',
    references: [AUD_PRAXIS, AUD_SCOPE],
  }),

  // Chapter 10: Implants, Assistive Technology, Connectivity, and Device Management
  makeEntry({
    id: 'aud5343-gloss-19',
    term: 'Cochlear implant mapping',
    definition:
      'Iterative clinical programming of an internal cochlear implant array that sets electrical threshold and comfort levels across electrode channels to optimize speech perception and comfort.',
    aliases: ['CI programming'],
    chapterId: 'aud5343-ch-10',
    chapterTitle:
      'Implants, Assistive Technology, Connectivity, and Device Management',
    domainId: 'intervention',
    domainLabel: 'Intervention',
    sectionId: 'aud5343-ch-10-section-01',
    sectionHeading: 'Cochlear-implant candidacy and team care',
    references: [AUD_PRAXIS, AUD_COCHLEAR],
  }),
  makeEntry({
    id: 'aud5343-gloss-20',
    term: 'Remote microphone system',
    definition:
      'Wireless assistive listening technology capturing a talker’s voice near the mouth and transmitting it directly to hearing aids or implants to overcome distance, noise, and reverberation.',
    aliases: ['DM/FM system', 'HAT'],
    chapterId: 'aud5343-ch-10',
    chapterTitle:
      'Implants, Assistive Technology, Connectivity, and Device Management',
    domainId: 'intervention',
    domainLabel: 'Intervention',
    sectionId: 'aud5343-ch-10-section-03',
    sectionHeading: 'Remote microphones, alerting, and classroom systems',
    references: [AUD_PRAXIS, AUD_SCHOOL_GL],
  }),

  // Chapter 11: Audiologic Rehabilitation, Counseling, and Educational Access
  makeEntry({
    id: 'aud5343-gloss-21',
    term: 'Audiologic rehabilitation',
    definition:
      'Person- and family-centered intervention combining sensory technology, auditory training, communication strategies, and counseling to reduce participation restrictions from hearing loss.',
    aliases: ['AR', 'Aural rehabilitation'],
    chapterId: 'aud5343-ch-11',
    chapterTitle:
      'Audiologic Rehabilitation, Counseling, and Educational Access',
    domainId: 'intervention',
    domainLabel: 'Intervention',
    sectionId: 'aud5343-ch-11-section-01',
    sectionHeading: 'Goal setting and rehabilitation planning',
    references: [AUD_PRAXIS, AUD_HEARING_LOSS],
  }),
  makeEntry({
    id: 'aud5343-gloss-22',
    term: 'Classroom acoustics',
    definition:
      'Physical sound properties of learning spaces—especially background noise level, reverberation time, and signal-to-noise ratio—governed by ANSI standards to support speech understanding.',
    aliases: ['Reverberation and SNR'],
    chapterId: 'aud5343-ch-11',
    chapterTitle:
      'Audiologic Rehabilitation, Counseling, and Educational Access',
    domainId: 'intervention',
    domainLabel: 'Intervention',
    sectionId: 'aud5343-ch-11-section-04',
    sectionHeading: 'Classroom acoustics, plans, and self-advocacy',
    references: [AUD_PRAXIS, AUD_SCHOOL_GL],
  }),

  // Chapter 12: Professional, Ethical, Legal, Evidence-Based, and Practice Responsibilities
  makeEntry({
    id: 'aud5343-gloss-23',
    term: 'HIPAA and FERPA privacy rules',
    definition:
      'Federal privacy frameworks governing protected health information in covered healthcare settings (HIPAA) and student education records in federally funded schools (FERPA), guiding consent and disclosure.',
    aliases: ['Health and education privacy'],
    chapterId: 'aud5343-ch-12',
    chapterTitle:
      'Professional, Ethical, Legal, Evidence-Based, and Practice Responsibilities',
    domainId: 'professional-ethical',
    domainLabel: 'Professional and Ethical Responsibilities',
    sectionId: 'aud5343-ch-12-section-01',
    sectionHeading: 'Consent, autonomy, privacy, and access',
    references: [AUD_FERPA, AUD_HIPAA],
  }),
  makeEntry({
    id: 'aud5343-gloss-24',
    term: 'Teleaudiology jurisdiction',
    definition:
      'Regulatory requirement that an audiologist delivering remote care hold valid licensure in the jurisdiction where the patient is physically located and maintain local emergency escalation protocols.',
    aliases: ['Telepractice licensure'],
    chapterId: 'aud5343-ch-12',
    chapterTitle:
      'Professional, Ethical, Legal, Evidence-Based, and Practice Responsibilities',
    domainId: 'professional-ethical',
    domainLabel: 'Professional and Ethical Responsibilities',
    sectionId: 'aud5343-ch-12-section-04',
    sectionHeading: 'Telepractice, jurisdiction, and safety escalation',
    references: [AUD_PRAXIS, AUD_ETHICS],
  }),
];

const speech_language_pathology_5331 = [
  // Chapter 1: Anatomy, Physiology, Development, and Scientific Foundations
  makeEntry({
    id: 'slp5331-gloss-01',
    term: 'Velopharyngeal valve',
    definition:
      'Muscular sphincter formed by the soft palate and pharyngeal walls that seals the nasopharynx during oral pressure consonants and swallowing while opening for nasal speech sounds.',
    aliases: ['VP port', 'Velopharyngeal mechanism'],
    chapterId: 'slp5331-ch-01',
    chapterTitle:
      'Anatomy, Physiology, Development, and Scientific Foundations',
    domainId: 'foundations-professional-practice',
    domainLabel: 'Foundations and Professional Practice',
    sectionId: 'slp5331-ch-01-section-01',
    sectionHeading: 'Respiration, phonation, and resonance',
    references: [SLP_PRAXIS, SLP_STANDARDS],
  }),
  makeEntry({
    id: 'slp5331-gloss-02',
    term: 'Experience-dependent neuroplasticity',
    definition:
      'Capacity of the central nervous system to reorganize synaptic connections and functional networks in response to specific, salient, intensive, and repetitive behavioral practice.',
    aliases: ['Neuroplasticity'],
    chapterId: 'slp5331-ch-01',
    chapterTitle:
      'Anatomy, Physiology, Development, and Scientific Foundations',
    domainId: 'foundations-professional-practice',
    domainLabel: 'Foundations and Professional Practice',
    sectionId: 'slp5331-ch-01-section-03',
    sectionHeading: 'Neural systems and communication',
    references: [SLP_PRAXIS, SLP_SCOPE],
  }),

  // Chapter 2: Professional Practice, Ethics, Law, and Interprofessional Care
  makeEntry({
    id: 'slp5331-gloss-03',
    term: 'Educational impact under IDEA',
    definition:
      'Federal special-education eligibility criterion requiring that a speech or language impairment adversely affect a student’s academic, social, or vocational performance to warrant IEP services.',
    aliases: ['Adverse educational impact'],
    chapterId: 'slp5331-ch-02',
    chapterTitle:
      'Professional Practice, Ethics, Law, and Interprofessional Care',
    domainId: 'foundations-professional-practice',
    domainLabel: 'Foundations and Professional Practice',
    sectionId: 'slp5331-ch-02-section-03',
    sectionHeading: 'School eligibility and educational impact',
    references: [SLP_PRAXIS, SLP_IDEA],
  }),
  makeEntry({
    id: 'slp5331-gloss-04',
    term: 'Interprofessional collaborative practice',
    definition:
      'Coordinated service delivery in which clinicians from two or more professions partner with clients and families to share expertise, align goals, and improve functional health or educational outcomes.',
    aliases: ['IPP'],
    chapterId: 'slp5331-ch-02',
    chapterTitle:
      'Professional Practice, Ethics, Law, and Interprofessional Care',
    domainId: 'foundations-professional-practice',
    domainLabel: 'Foundations and Professional Practice',
    sectionId: 'slp5331-ch-02-section-04',
    sectionHeading: 'Collaboration, supervision, and telepractice',
    references: [SLP_PRAXIS, SLP_SCOPE],
  }),

  // Chapter 3: Evidence-Based and Culturally Responsive Practice
  makeEntry({
    id: 'slp5331-gloss-05',
    term: 'Evidence-based practice triad',
    definition:
      'Clinical decision-making framework integrating best available external research evidence, clinician expertise and internal practice data, and client or family values and preferences.',
    aliases: ['EBP triad'],
    chapterId: 'slp5331-ch-03',
    chapterTitle: 'Evidence-Based and Culturally Responsive Practice',
    domainId: 'foundations-professional-practice',
    domainLabel: 'Foundations and Professional Practice',
    sectionId: 'slp5331-ch-03-section-01',
    sectionHeading: 'The evidence-based practice triad',
    references: [SLP_PRAXIS, SLP_EBP],
  }),
  makeEntry({
    id: 'slp5331-gloss-06',
    term: 'Dynamic assessment',
    definition:
      'Interactive test-teach-retest evaluation measuring a learner’s modifiability and responsiveness to mediated cues to differentiate a true language disorder from a cultural or linguistic difference.',
    aliases: ['Test-teach-retest'],
    chapterId: 'slp5331-ch-03',
    chapterTitle: 'Evidence-Based and Culturally Responsive Practice',
    domainId: 'foundations-professional-practice',
    domainLabel: 'Foundations and Professional Practice',
    sectionId: 'slp5331-ch-03-section-04',
    sectionHeading: 'Culturally and linguistically responsive decisions',
    references: [SLP_PRAXIS, SLP_MULTICULTURAL],
  }),

  // Chapter 4: Disorder Characteristics, Etiology, and Differential Reasoning
  makeEntry({
    id: 'slp5331-gloss-07',
    term: 'Dysarthria',
    definition:
      'Group of neurologic motor-speech disorders caused by weakness, paralysis, spasticity, or incoordination of speech musculature affecting respiration, phonation, resonance, articulation, or prosody.',
    aliases: ['Neuromotor speech disorder'],
    chapterId: 'slp5331-ch-04',
    chapterTitle:
      'Disorder Characteristics, Etiology, and Differential Reasoning',
    domainId: 'foundations-professional-practice',
    domainLabel: 'Foundations and Professional Practice',
    sectionId: 'slp5331-ch-04-section-02',
    sectionHeading: 'Voice, resonance, and motor speech',
    references: [SLP_PRAXIS, SLP_DYSARTHRIA],
  }),
  makeEntry({
    id: 'slp5331-gloss-08',
    term: 'Aphasia',
    definition:
      'Acquired neurogenic language disorder resulting from injury to language-dominant brain networks that impairs spoken expression, auditory comprehension, reading, and writing across modalities.',
    aliases: ['Acquired neurogenic language disorder'],
    chapterId: 'slp5331-ch-04',
    chapterTitle:
      'Disorder Characteristics, Etiology, and Differential Reasoning',
    domainId: 'foundations-professional-practice',
    domainLabel: 'Foundations and Professional Practice',
    sectionId: 'slp5331-ch-04-section-03',
    sectionHeading:
      'Language, cognition, social communication, AAC, and hearing',
    references: [SLP_PRAXIS, SLP_APHASIA],
  }),

  // Chapter 5: Assessment Principles, Measurement, and Integrated Diagnosis
  makeEntry({
    id: 'slp5331-gloss-09',
    term: 'Standard error of measurement',
    definition:
      'Psychometric index estimating expected variability around an observed test score due to measurement error, used to construct confidence intervals rather than relying on a single point cutoff.',
    aliases: ['SEM'],
    chapterId: 'slp5331-ch-05',
    chapterTitle:
      'Assessment Principles, Measurement, and Integrated Diagnosis',
    domainId: 'screening-assessment-diagnosis',
    domainLabel: 'Screening, Assessment, Evaluation, and Diagnosis',
    sectionId: 'slp5331-ch-05-section-02',
    sectionHeading: 'Selecting and interpreting measures',
    references: [SLP_PRAXIS, SLP_SCHOOL_ASSESS],
  }),
  makeEntry({
    id: 'slp5331-gloss-10',
    term: 'Ecological validity',
    definition:
      'Extent to which assessment tasks and results reflect real-world communication demands in natural home, classroom, or community contexts, strengthened by language sampling and observation.',
    aliases: ['Functional generalizability'],
    chapterId: 'slp5331-ch-05',
    chapterTitle:
      'Assessment Principles, Measurement, and Integrated Diagnosis',
    domainId: 'screening-assessment-diagnosis',
    domainLabel: 'Screening, Assessment, Evaluation, and Diagnosis',
    sectionId: 'slp5331-ch-05-section-03',
    sectionHeading: 'Multimethod functional assessment',
    references: [SLP_PRAXIS, SLP_MULTICULTURAL],
  }),

  // Chapter 6: Assessment of Speech Sound, Fluency, Voice, Resonance, and Motor Speech
  makeEntry({
    id: 'slp5331-gloss-11',
    term: 'Stimulability',
    definition:
      'Client’s ability to imitate or produce an errored speech sound accurately when given structured auditory, visual, or tactile cues, informing prognosis and treatment target selection.',
    aliases: ['Phoneme stimulability'],
    chapterId: 'slp5331-ch-06',
    chapterTitle:
      'Assessment of Speech Sound, Fluency, Voice, Resonance, and Motor Speech',
    domainId: 'screening-assessment-diagnosis',
    domainLabel: 'Screening, Assessment, Evaluation, and Diagnosis',
    sectionId: 'slp5331-ch-06-section-01',
    sectionHeading: 'Speech sound production and intelligibility',
    references: [SLP_PRAXIS, SLP_ARTIC],
  }),
  makeEntry({
    id: 'slp5331-gloss-12',
    term: 'Childhood apraxia of speech',
    definition:
      'Neurological pediatric speech motor planning and programming disorder characterized by inconsistent errors on repeated productions, lengthened coarticulatory transitions, and inappropriate prosody.',
    aliases: ['CAS'],
    chapterId: 'slp5331-ch-06',
    chapterTitle:
      'Assessment of Speech Sound, Fluency, Voice, Resonance, and Motor Speech',
    domainId: 'screening-assessment-diagnosis',
    domainLabel: 'Screening, Assessment, Evaluation, and Diagnosis',
    sectionId: 'slp5331-ch-06-section-04',
    sectionHeading: 'Motor-speech differential diagnosis',
    references: [SLP_PRAXIS, SLP_ARTIC],
  }),

  // Chapter 7: Assessment of Language, Cognition, Social Communication, AAC, and Hearing
  makeEntry({
    id: 'slp5331-gloss-13',
    term: 'Pragmatic communication',
    definition:
      'Social use of verbal and nonverbal language across contexts—including conversational turn-taking, topic maintenance, presupposition, and repair—evaluated relative to cultural norms.',
    aliases: ['Social pragmatics'],
    chapterId: 'slp5331-ch-07',
    chapterTitle:
      'Assessment of Language, Cognition, Social Communication, AAC, and Hearing',
    domainId: 'screening-assessment-diagnosis',
    domainLabel: 'Screening, Assessment, Evaluation, and Diagnosis',
    sectionId: 'slp5331-ch-07-section-02',
    sectionHeading: 'Social and cognitive communication',
    references: [SLP_PRAXIS, SLP_SPOKEN_LANG],
  }),
  makeEntry({
    id: 'slp5331-gloss-14',
    term: 'AAC feature matching',
    definition:
      'Systematic clinical process aligning an individual’s motor, sensory, linguistic, and environmental communication needs with specific augmentative and alternative communication system features during trials.',
    aliases: ['Feature matching'],
    chapterId: 'slp5331-ch-07',
    chapterTitle:
      'Assessment of Language, Cognition, Social Communication, AAC, and Hearing',
    domainId: 'screening-assessment-diagnosis',
    domainLabel: 'Screening, Assessment, Evaluation, and Diagnosis',
    sectionId: 'slp5331-ch-07-section-03',
    sectionHeading: 'AAC feature matching and trials',
    references: [SLP_PRAXIS, SLP_AAC],
  }),

  // Chapter 8: Feeding and Swallowing Assessment
  makeEntry({
    id: 'slp5331-gloss-15',
    term: 'Silent aspiration',
    definition:
      'Entry of food, liquid, or secretions below the true vocal folds without an overt cough, throat clear, or outward clinical distress, making instrumental visualization essential for detection.',
    aliases: ['Asymptomatic aspiration'],
    chapterId: 'slp5331-ch-08',
    chapterTitle: 'Feeding and Swallowing Assessment',
    domainId: 'screening-assessment-diagnosis',
    domainLabel: 'Screening, Assessment, Evaluation, and Diagnosis',
    sectionId: 'slp5331-ch-08-section-01',
    sectionHeading: 'Clinical evaluation and immediate safety',
    references: [SLP_PRAXIS, SLP_ADULT_DYSPHAGIA],
  }),
  makeEntry({
    id: 'slp5331-gloss-16',
    term: 'Videofluoroscopic swallowing study',
    definition:
      'Dynamic radiographic instrumental swallowing examination visualizing oral, pharyngeal, and upper esophageal bolus transport, biomechanical impairments, airway invasion, and strategy effectiveness.',
    aliases: ['VFSS', 'MBSS'],
    chapterId: 'slp5331-ch-08',
    chapterTitle: 'Feeding and Swallowing Assessment',
    domainId: 'screening-assessment-diagnosis',
    domainLabel: 'Screening, Assessment, Evaluation, and Diagnosis',
    sectionId: 'slp5331-ch-08-section-02',
    sectionHeading: 'Instrumental assessment selection',
    references: [SLP_PRAXIS, SLP_ADULT_DYSPHAGIA],
  }),

  // Chapter 9: Treatment Planning, Goal Design, Outcomes, and Counseling
  makeEntry({
    id: 'slp5331-gloss-17',
    term: 'Principles of motor learning',
    definition:
      'Evidence-based practice and feedback variables—such as blocked versus random practice and frequent versus faded knowledge of results—that distinguish short-term acquisition from durable retention.',
    aliases: ['PML'],
    chapterId: 'slp5331-ch-09',
    chapterTitle:
      'Treatment Planning, Goal Design, Outcomes, and Counseling',
    domainId: 'treatment-planning-evaluation',
    domainLabel: 'Planning, Implementation, and Evaluation of Treatment',
    sectionId: 'slp5331-ch-09-section-03',
    sectionHeading: 'Practice, feedback, and generalization',
    references: [SLP_PRAXIS, SLP_EBP],
  }),
  makeEntry({
    id: 'slp5331-gloss-18',
    term: 'Treatment fidelity',
    definition:
      'Degree to which an intervention is delivered accurately and consistently as designed—covering adherence, dosage, and cueing quality—so outcome changes can be validly attributed to therapy.',
    aliases: ['Procedural fidelity'],
    chapterId: 'slp5331-ch-09',
    chapterTitle:
      'Treatment Planning, Goal Design, Outcomes, and Counseling',
    domainId: 'treatment-planning-evaluation',
    domainLabel: 'Planning, Implementation, and Evaluation of Treatment',
    sectionId: 'slp5331-ch-09-section-04',
    sectionHeading: 'Progress decisions, discharge, and follow-up',
    references: [SLP_PRAXIS, SLP_EBP],
  }),

  // Chapter 10: Treatment of Speech Sound, Fluency, Voice, Resonance, and Motor Speech
  makeEntry({
    id: 'slp5331-gloss-19',
    term: 'Minimal pairs contrast therapy',
    definition:
      'Phonological intervention pairing words that differ by a single target phoneme contrast to demonstrate communicative breakdown from homonymy and reorganize rule-based sound patterns.',
    aliases: ['Minimal opposition'],
    chapterId: 'slp5331-ch-10',
    chapterTitle:
      'Treatment of Speech Sound, Fluency, Voice, Resonance, and Motor Speech',
    domainId: 'treatment-planning-evaluation',
    domainLabel: 'Planning, Implementation, and Evaluation of Treatment',
    sectionId: 'slp5331-ch-10-section-01',
    sectionHeading: 'Speech sound contrasts and motor learning',
    references: [SLP_PRAXIS, SLP_ARTIC],
  }),
  makeEntry({
    id: 'slp5331-gloss-20',
    term: 'Integral stimulation',
    definition:
      'Motor-speech treatment hierarchy ("watch me, listen to me, say it with me") pairing simultaneous auditory-visual modeling with systematically faded tactile and temporal cues for apraxia of speech.',
    aliases: ['DTTC', 'Watch-listen-do'],
    chapterId: 'slp5331-ch-10',
    chapterTitle:
      'Treatment of Speech Sound, Fluency, Voice, Resonance, and Motor Speech',
    domainId: 'treatment-planning-evaluation',
    domainLabel: 'Planning, Implementation, and Evaluation of Treatment',
    sectionId: 'slp5331-ch-10-section-04',
    sectionHeading: 'Dysarthria, apraxia, and communication support',
    references: [SLP_PRAXIS, SLP_DYSARTHRIA],
  }),

  // Chapter 11: Treatment of Language, Cognition, Social Communication, AAC, and Hearing
  makeEntry({
    id: 'slp5331-gloss-21',
    term: 'Life Participation Approach to Aphasia',
    definition:
      'Consumer-driven rehabilitation philosophy prioritizing immediate re-engagement in personally meaningful life roles, relationships, and community access alongside impairment-level language support.',
    aliases: ['LPAA'],
    chapterId: 'slp5331-ch-11',
    chapterTitle:
      'Treatment of Language, Cognition, Social Communication, AAC, and Hearing',
    domainId: 'treatment-planning-evaluation',
    domainLabel: 'Planning, Implementation, and Evaluation of Treatment',
    sectionId: 'slp5331-ch-11-section-02',
    sectionHeading: 'Aphasia and cognitive-communication rehabilitation',
    references: [SLP_PRAXIS, SLP_APHASIA],
  }),
  makeEntry({
    id: 'slp5331-gloss-22',
    term: 'Aided language input',
    definition:
      'Naturalistic AAC intervention strategy in which communication partners point to symbols on the user’s AAC system while speaking, modeling vocabulary, syntax, and functional use without requiring imitation.',
    aliases: ['Aided language stimulation', 'AAC modeling'],
    chapterId: 'slp5331-ch-11',
    chapterTitle:
      'Treatment of Language, Cognition, Social Communication, AAC, and Hearing',
    domainId: 'treatment-planning-evaluation',
    domainLabel: 'Planning, Implementation, and Evaluation of Treatment',
    sectionId: 'slp5331-ch-11-section-04',
    sectionHeading: 'AAC and aural rehabilitation',
    references: [SLP_PRAXIS, SLP_AAC],
  }),

  // Chapter 12: Feeding and Swallowing Treatment
  makeEntry({
    id: 'slp5331-gloss-23',
    term: 'Compensatory swallowing strategy',
    definition:
      'Immediate postural, pacing, or bolus-volume adjustment designed to redirect flow or improve airway protection during the swallow without directly altering underlying neuromuscular physiology.',
    aliases: ['Postural or bolus modification'],
    chapterId: 'slp5331-ch-12',
    chapterTitle: 'Feeding and Swallowing Treatment',
    domainId: 'treatment-planning-evaluation',
    domainLabel: 'Planning, Implementation, and Evaluation of Treatment',
    sectionId: 'slp5331-ch-12-section-01',
    sectionHeading: 'Compensation, rehabilitation, and mechanism',
    references: [SLP_PRAXIS, SLP_ADULT_DYSPHAGIA],
  }),
  makeEntry({
    id: 'slp5331-gloss-24',
    term: 'Responsive feeding',
    definition:
      'Caregiver-child pediatric feeding approach honoring infant or child hunger, satiety, and stress cues to build oral-motor competence, safe intake, and positive mealtime autonomy without coercion.',
    aliases: ['Cue-based feeding'],
    chapterId: 'slp5331-ch-12',
    chapterTitle: 'Feeding and Swallowing Treatment',
    domainId: 'treatment-planning-evaluation',
    domainLabel: 'Planning, Implementation, and Evaluation of Treatment',
    sectionId: 'slp5331-ch-12-section-04',
    sectionHeading: 'Responsive pediatric feeding and alternate nutrition',
    references: [SLP_PRAXIS, SLP_PED_FEEDING],
  }),
];

module.exports = {
  audiology_5343,
  speech_language_pathology_5331,
};
