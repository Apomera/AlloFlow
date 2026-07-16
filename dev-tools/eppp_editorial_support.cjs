'use strict';

const clean = (value) => String(value || '')
  .replace(/â€“|â€”/g, '-')
  .replace(/â€™|â€˜/g, "'")
  .replace(/â€œ|â€/g, '"')
  .replace(/\s+/g, ' ')
  .trim();

const normalize = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hasFlag = (item, code) => Array.isArray(item.flags) && item.flags.some((flag) => flag.code === code);
const source = (title, organization, url, credibility) => ({ title, organization, url, credibility });

const SOURCES = {
  neuroanatomy: source(
    'Introduction to Behavioral Neuroscience, Chapter 1: Building a Nervous System',
    'Irina Calin-Jageman and OpenStax, Rice University (2024)',
    'https://openstax.org/books/introduction-behavioral-neuroscience/pages/1-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This openly available text was written by neuroscientists, peer reviewed, and designed to teach foundational nervous-system structure and function.'
  ),
  neurochemistry: source(
    'Introduction to Behavioral Neuroscience, Chapter 3: General Neurochemistry Principles',
    'Gary L. Wenk and OpenStax, Rice University (2024)',
    'https://openstax.org/books/introduction-behavioral-neuroscience/pages/3-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-authored and peer-reviewed neuroscience chapter covers neurotransmitter synthesis, release, receptor action, and inactivation.'
  ),
  sensation: source(
    'Psychology 2e, Chapter 5: Sensation and Perception',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/5-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-authored, peer-reviewed chapter directly covers sensory transduction, thresholds, perception, attention, and bottom-up and top-down processing.'
  ),
  memory: source(
    'Psychology 2e, Chapter 8: Memory',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/8-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. Psychology 2e undergoes expert authorship, peer review, and editorial revision and directly covers encoding, storage, retrieval, forgetting, and memory systems.'
  ),
  learning: source(
    'Psychology 2e, Chapter 6: Learning',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/6-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-reviewed chapter covers classical conditioning, operant conditioning, observational learning, and the core learning distinctions used by these items.'
  ),
  cognition: source(
    'Psychology 2e, Chapter 7: Thinking and Intelligence',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/7-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-reviewed chapter directly addresses reasoning, concepts, problem solving, judgment, decision making, language, and intelligence.'
  ),
  motivation: source(
    'Psychology 2e, Chapter 10: Emotion and Motivation',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/10-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-reviewed chapter covers major motivation and emotion constructs while distinguishing historical theories from contemporary evidence.'
  ),
  social: source(
    'Psychology 2e, Chapter 12: Social Psychology',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/12-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-reviewed chapter covers attribution, attitudes, persuasion, conformity, group processes, prejudice, aggression, and prosocial behavior.'
  ),
  industrialOrganizational: source(
    'Psychology 2e, Chapter 13: Industrial-Organizational Psychology',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/13-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-authored and peer-reviewed chapter covers personnel assessment, appraisal, motivation, job design, leadership, organizational culture, and workplace behavior.'
  ),
  development: source(
    'Psychology 2e, Chapter 9: Lifespan Development',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/9-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-reviewed chapter provides a broad lifespan framework for cognitive, social, emotional, and physical development without serving as an individual diagnostic rule.'
  ),
  health: source(
    'Psychology 2e, Chapter 14: Stress, Lifestyle, and Health',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/14-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-authored and peer-reviewed psychology chapter covers integrated biological, psychological, behavioral, and social perspectives on stress, health, coping, and health-related behavior.'
  ),
  multicultural: source(
    'Multicultural Guidelines: An Ecological Approach to Context, Identity, and Intersectionality',
    'American Psychological Association (2017)',
    'https://www.apa.org/about/policy/multicultural-guidelines.pdf',
    'The American Psychological Association adopted these professional guidelines after expert and governance review. They provide the primary APA framework for culturally responsive practice, identity, intersectionality, context, and power.'
  ),
  forensic: source(
    'Specialty Guidelines for Forensic Psychology',
    'American Psychological Association and American Academy of Forensic Psychology',
    'https://www.apa.org/practice/guidelines/forensic-psychology',
    'These APA-adopted specialty guidelines were developed by forensic-psychology experts and provide the profession\'s authoritative guidance on roles, competence, relationships, methods, communications, and limits in forensic practice.'
  ),
  mmpi: source(
    'Minnesota Multiphasic Personality Inventory-3 (MMPI-3)',
    'University of Minnesota Press, Test Division, official MMPI publisher',
    'https://www.upress.umn.edu/test-division/mmpi-3/',
    'The University of Minnesota Press Test Division publishes the MMPI family. Its official instrument materials are the primary source for edition-specific structure, intended use, scales, administration, and interpretation limits.'
  ),
  mmpi2: source(
    'Minnesota Multiphasic Personality Inventory-2 (MMPI-2)',
    'University of Minnesota Press, Test Division, official MMPI publisher',
    'https://www.upress.umn.edu/test-division/mmpi-2/',
    'The University of Minnesota Press Test Division is the official publisher of the MMPI-2. Its instrument materials are the primary source for edition-specific scales, administration, scoring, validity indicators, and interpretation limits.'
  ),
  wechsler: source(
    'Wechsler Intelligence Scale for Children | Fifth Edition (WISC-V)',
    'Pearson Clinical Assessment, official instrument publisher',
    'https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Cognition-%26-Neuro/Wechsler-Intelligence-Scale-for-Children-%7C-Fifth-Edition/p/100000771',
    'Pearson publishes and standardizes the Wechsler intelligence scales. Its official product and technical materials are the primary source for edition-specific subtests, composites, age ranges, administration, and interpretation.'
  ),
  wais: source(
    'Wechsler Adult Intelligence Scale | Fourth Edition (WAIS-IV)',
    'Pearson Clinical Assessment, official instrument publisher',
    'https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Cognition-%26-Neuro/Wechsler-Adult-Intelligence-Scale-%7C-Fourth-Edition/p/100000392',
    'Pearson publishes and standardizes the WAIS-IV. Its official product and technical materials are the primary source for edition-specific index scores, composites, administration, norms, and interpretation boundaries.'
  ),
  bayley: source(
    'Bayley Scales of Infant and Toddler Development | Fourth Edition (Bayley-4)',
    'Pearson Clinical Assessment, official instrument publisher',
    'https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Cognition-%26-Neuro/Bayley-Scales-of-Infant-and-Toddler-Development-%7C-Fourth-Edition/p/100001996',
    'Pearson publishes and standardizes the Bayley-4. Its official product materials are the primary source for the instrument\'s age range, domains, administration, scoring, and intended developmental-assessment uses.'
  ),
  rorschach: source(
    'Rorschach Performance Assessment System: About R-PAS',
    'Rorschach Performance Assessment System, official system publisher',
    'https://r-pas.org/Home/About',
    'R-PAS is the official publisher and training organization for its standardized Rorschach system. Its materials document the system\'s administration, coding, normative basis, and appropriate evidence boundaries.'
  ),
  tat: source(
    'Thematic Apperception Test',
    'American Psychological Association Dictionary of Psychology',
    'https://dictionary.apa.org/thematic-apperception-test',
    'The APA Dictionary of Psychology is maintained by the American Psychological Association as an expert-edited reference. It provides a profession-specific definition and appropriate conceptual scope for the Thematic Apperception Test.'
  ),
  neuropsychAssessment: source(
    'Neuropsychological Assessment',
    'StatPearls, NCBI Bookshelf, U.S. National Library of Medicine',
    'https://www.ncbi.nlm.nih.gov/books/NBK513310/',
    'This clinician-authored NCBI Bookshelf chapter describes neuropsychological evaluation as an integration of interview, records, observations, validity evidence, norms, test patterns, and relevant medical information.'
  ),
  testing: source(
    'Standards for Educational and Psychological Testing',
    'American Educational Research Association, American Psychological Association, and National Council on Measurement in Education (2014)',
    'https://www.testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf',
    'These jointly published professional standards are the principal U.S. consensus framework for validity, reliability, fairness, accessibility, administration, scoring, and responsible interpretation of tests.'
  ),
  disorders: source(
    'Psychology 2e, Chapter 15: Psychological Disorders',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/15-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-reviewed chapter supports foundational disorder recognition and conceptual distinctions; item wording remains quarantined from clinical diagnosis or current-criteria claims.'
  ),
  therapy: source(
    'Psychology 2e, Chapter 16: Therapy and Treatment',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/16-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-reviewed chapter covers major psychotherapy traditions, behavioral and cognitive techniques, treatment formats, and evidence-based care principles.'
  ),
  medications: source(
    'Mental Health Medications',
    'National Institute of Mental Health, National Institutes of Health (last reviewed December 2023)',
    'https://www.nimh.nih.gov/health/topics/mental-health-medications',
    'NIMH is the lead U.S. federal agency for research on mental disorders. Its official overview describes common medication classes, uses, monitoring, and safety limits while directing current prescribing questions to FDA labeling and clinicians.'
  ),
  research: source(
    'Psychology 2e, Chapter 2: Psychological Research',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/2-introduction',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-reviewed chapter covers hypotheses, operational definitions, sampling, experiments, correlation, ethics, replication, and limits on causal inference.'
  ),
  statistics: source(
    'NIST/SEMATECH e-Handbook of Statistical Methods',
    'National Institute of Standards and Technology, Statistical Engineering Division, and SEMATECH',
    'https://www.itl.nist.gov/div898/handbook/',
    'NIST is the U.S. federal measurement-science agency. Its technically edited statistical handbook provides authoritative definitions, methods, assumptions, and examples for distributions, estimation, testing, regression, and experimental design.'
  ),
  belmont: source(
    'The Belmont Report: Ethical Principles and Guidelines for the Protection of Human Subjects of Research',
    'U.S. Department of Health and Human Services, Office for Human Research Protections',
    'https://www.hhs.gov/ohrp/regulations-and-policy/belmont-report/read-the-belmont-report/index.html',
    'HHS Office for Human Research Protections is the federal authority responsible for human-subject protections. This is the primary federal source for respect for persons, beneficence, justice, and their applications.'
  ),
  ebpp: source(
    'Evidence-Based Practice in Psychology',
    'American Psychological Association Dictionary of Psychology and APA Presidential Task Force framework',
    'https://dictionary.apa.org/evidence-based-practice',
    'The American Psychological Association defines evidence-based practice for psychology and anchors it in the integration of research evidence, clinical expertise, and patient characteristics, culture, values, and preferences.'
  ),
  supervision: source(
    'Guidelines for Clinical Supervision in Health Service Psychology',
    'American Psychological Association (2014)',
    'https://www.apa.org/about/policy/guidelines-supervision.pdf',
    'The American Psychological Association adopted these professional guidelines to describe competency-based clinical supervision, the supervisory relationship, assessment, feedback, diversity, ethical responsibilities, and documentation in health service psychology.'
  ),
  ethics: source(
    'Ethical Principles of Psychologists and Code of Conduct',
    'American Psychological Association, current published Ethics Code and amendments',
    'https://www.apa.org/ethics/code',
    'The American Psychological Association publishes the profession\'s Ethics Code. It is the primary source for the Code\'s General Principles and enforceable standards, while jurisdiction-specific law still requires separate review.'
  ),
  telepsychology: source(
    'Guidelines for the Practice of Telepsychology',
    'American Psychological Association, approved by the Council of Representatives in August 2024',
    'https://www.apa.org/about/policy/telepsychology-revisions',
    'The American Psychological Association adopted these guidelines through professional expert and governance review. They are the current APA guidance on competence, consent, security, equity, emergencies, and technology-mediated psychological services.'
  ),
  hipaa: source(
    'HIPAA for Professionals: Privacy, Security, and Breach Notification Rules',
    'U.S. Department of Health and Human Services, Office for Civil Rights',
    'https://www.hhs.gov/hipaa/for-professionals/index.html',
    'HHS Office for Civil Rights administers and enforces the federal HIPAA Privacy, Security, and Breach Notification Rules. Its official materials are the primary federal source for scope, safeguards, disclosures, and psychotherapy-note protections.'
  ),
  jaffee: source(
    'Jaffee v. Redmond, 518 U.S. 1 (1996), Opinion of the Court',
    'Supreme Court of the United States',
    'https://www.supremecourt.gov/opinions/boundvolumes/518bv.pdf',
    'The bound-volume opinion published by the Supreme Court is the primary federal source for the holding recognizing psychotherapist-patient privilege in federal proceedings and for the scope of what the Court actually decided.'
  ),
  longTermPotentiation: source(
    'Neuroscience, 2nd edition: Long-Term Synaptic Potentiation',
    'National Center for Biotechnology Information Bookshelf, U.S. National Library of Medicine',
    'https://www.ncbi.nlm.nih.gov/books/NBK10878/',
    'NCBI Bookshelf is maintained by the U.S. National Library of Medicine and preserves expert-authored biomedical texts. This chapter directly defines LTP, its synaptic properties, and the evidence connecting it with memory mechanisms.'
  ),
  epilepsy: source(
    'Epilepsy and Seizures',
    'National Institute of Neurological Disorders and Stroke, National Institutes of Health (2024)',
    'https://www.ninds.nih.gov/publications/epilepsy-and-seizures',
    'NINDS is the lead U.S. federal institute for brain and nervous-system research. Its official publication reviews seizure diversity, diagnosis, treatment, safety, and current evidence without reducing seizure type to a single medication.'
  ),
  endocrine: source(
    'Psychology 2e, Section 3.5: The Endocrine System',
    'OpenStax, Rice University (second edition)',
    'https://openstax.org/books/psychology-2e/pages/3-5-the-endocrine-system',
    'OpenStax is Rice University\'s nonprofit educational publisher. This expert-authored and peer-reviewed section directly explains endocrine glands, hormones, hypothalamic-pituitary regulation, and their relationships with behavior.'
  ),
  wernickeKorsakoff: source(
    'Wernicke Encephalopathy',
    'StatPearls, NCBI Bookshelf, U.S. National Library of Medicine (updated 2026)',
    'https://www.ncbi.nlm.nih.gov/books/NBK470344/',
    'This clinician-authored and medically reviewed NCBI Bookshelf chapter directly covers thiamine deficiency, non-alcohol causes, variable presentation, urgency, and the relationship between Wernicke encephalopathy and Korsakoff syndrome.'
  ),
  alexithymia: source(
    'Alexithymia — APA Dictionary of Psychology',
    'American Psychological Association Dictionary of Psychology',
    'https://dictionary.apa.org/alexithymia',
    'The APA Dictionary of Psychology is an expert-edited professional reference maintained by the American Psychological Association. It supplies the field-specific definition and appropriately broad clinical context for alexithymia.'
  ),
  tarasoff: source(
    'Tarasoff v. Regents of the University of California, 17 Cal. 3d 425 (1976)',
    'Supreme Court of California opinion archive reproduced by Justia',
    'https://law.justia.com/cases/california/supreme-court/3d/17/425.html',
    'This is the full published California Supreme Court opinion with its official reporter citation. It is the primary case text for the historical holding, while current duties still require jurisdiction-specific statutory and case-law review.'
  ),
  dusky: source(
    'Dusky v. United States, 362 U.S. 402 (1960)',
    'Supreme Court of the United States opinion reproduced by Cornell Legal Information Institute',
    'https://www.law.cornell.edu/supremecourt/text/362/402',
    'Cornell Law School\'s Legal Information Institute reproduces the complete U.S. Supreme Court opinion and official citation. The short per curiam opinion is the primary source for the federal trial-competence wording.'
  ),
  insanityDefense: source(
    'Insanity Defense',
    'Cornell Law School Legal Information Institute, Wex legal encyclopedia',
    'https://www.law.cornell.edu/wex/insanity_defense',
    'Cornell Law School\'s expert-edited Wex resource summarizes major insanity-defense formulations and, critically, their jurisdictional variation. It is a reputable legal orientation source rather than a substitute for controlling local law.'
  ),
  mandatoryReporting: source(
    'Mandatory Reporting of Child Abuse and Neglect: State Statutes',
    'Child Welfare Information Gateway, Children\'s Bureau, Administration for Children and Families, U.S. Department of Health and Human Services',
    'https://www.childwelfare.gov/resources/mandatory-reporting-child-abuse-and-neglect/',
    'Child Welfare Information Gateway is the federal Children\'s Bureau information service. Its state-statute summaries document that reporter categories, thresholds, timing, and procedures are jurisdiction-specific and require current verification.'
  ),
  goldwater: source(
    'American Psychiatric Association Ethics Committee Opinion: The Goldwater Rule',
    'American Psychiatric Association Ethics Committee',
    'https://www.psychiatry.org/File%20Library/Psychiatrists/Practice/Ethics/APA-Ethics-Committee-Goldwater-Opinion.pdf',
    'This is the issuing organization\'s official Ethics Committee opinion interpreting Section 7.3 for psychiatrists. It directly prevents the common error of attributing the Goldwater Rule to the American Psychological Association.'
  ),
  oconnorDonaldson: source(
    'O\'Connor v. Donaldson, 422 U.S. 563 (1975)',
    'Supreme Court of the United States opinion reproduced by Cornell Legal Information Institute',
    'https://www.law.cornell.edu/supremecourt/text/422/563',
    'Cornell Law School\'s Legal Information Institute reproduces the complete U.S. Supreme Court opinion and official citation. The opinion is the primary source for the bounded constitutional holding on confinement.'
  ),
  wyatt: source(
    'Wyatt v. Stickney, 325 F. Supp. 781 (M.D. Ala. 1971)',
    'United States District Court opinion archive reproduced by Justia',
    'https://law.justia.com/cases/federal/district-courts/FSupp/325/781/2594259/',
    'This is the full federal district-court opinion with its official reporter citation. Reading the case itself supports its historical importance while avoiding the inaccurate claim that it is a nationwide Supreme Court rule.'
  ),
  psypact: source(
    'About the Psychology Interjurisdictional Compact (PSYPACT)',
    'Psychology Interjurisdictional Compact Commission, official compact governing body',
    'https://psypact.gov/page/About',
    'The PSYPACT Commission is the compact\'s official governing body and grants interjurisdictional authorizations. Its current materials are the primary source for compact purpose, APIT authorization, temporary practice, and participation rules.'
  ),
};

function sourceFor(domainId, value) {
  const text = normalize(value);
  if (domainId === 1) {
    if (/biopsychosocial|health behavior|stress and health|diathesis|health belief/.test(text)) return SOURCES.health;
    if (/long term potentiation|\bltp\b/.test(text)) return SOURCES.longTermPotentiation;
    if (/seizure/.test(text)) return SOURCES.epilepsy;
    if (/endocrine/.test(text)) return SOURCES.endocrine;
    if (/wernicke korsakoff/.test(text)) return SOURCES.wernickeKorsakoff;
    if (/alexithymia/.test(text)) return SOURCES.alexithymia;
    if (/ssri|benzodia|buspirone|medicat|lithium|antipsych|antidepress|anxiolytic|mood stabilizer|adhd medications|anticonvulsant|cholinesterase/.test(text)) return SOURCES.medications;
    return /\b(?:neurotrans\w*|dopamin\w*|seroton\w*|gaba\w*|acetyl\w*|receptors?|agonists?|antagonists?|synap\w*|drugs?|parkinson|antipsych\w*|antidepress\w*)\b/.test(text) ? SOURCES.neurochemistry : SOURCES.neuroanatomy;
  }
  if (domainId === 2) {
    if (/memory|recall|recognition|encoding|retrieval|forget|amnesia|interference|rehearsal|misinformation|serial position|generation effect|spacing effect/.test(text)) return SOURCES.memory;
    if (/conditioning|reinforcement|punishment|extinction|learning|schedule|shaping|modeling|taste aversion|garcia/.test(text)) return SOURCES.learning;
    if (/sensation|perception/.test(text)) return SOURCES.sensation;
    if (/emotion|motivation|drive|arousal|hunger|attribution of emotion|overjustification|schachter/.test(text)) return SOURCES.motivation;
    return SOURCES.cognition;
  }
  if (domainId === 3) {
    if (/racial identity|acculturation|intersectionality|implicit bias|power and privilege|multicultural counseling/.test(text)) return SOURCES.multicultural;
    if (/herzberg|performance appraisal|organizational justice|job characteristics|leadership|role ambiguity|role conflict/.test(text)) return SOURCES.industrialOrganizational;
    if (/consultation|supervision/.test(text)) return SOURCES.supervision;
    if (/dusky|competency/.test(text)) return SOURCES.dusky;
    if (/insanity/.test(text)) return SOURCES.insanityDefense;
    return /program evaluation|ecological momentary/.test(text) ? SOURCES.research : SOURCES.social;
  }
  if (domainId === 4) return SOURCES.development;
  if (domainId === 5) {
    if (/mmpi 2/.test(text)) return SOURCES.mmpi2;
    if (/mmpi/.test(text)) return SOURCES.mmpi;
    if (/bayley/.test(text)) return SOURCES.bayley;
    if (/wais/.test(text)) return SOURCES.wais;
    if (/wechsler|wisc|wppsi/.test(text)) return SOURCES.wechsler;
    if (/rorschach/.test(text)) return SOURCES.rorschach;
    if (/thematic apperception|\btat\b/.test(text)) return SOURCES.tat;
    if (/halstead|reitan|neuropsych/.test(text)) return SOURCES.neuropsychAssessment;
    if (/\b(?:disorder|syndrome|diagnos|psychopatholog|symptom)\b/.test(text)) return SOURCES.disorders;
    if (/prolonged exposure|cognitive processing therapy|trauma informed care/.test(text)) return SOURCES.therapy;
    if (/adhd|autism|substance use|eating|dissociative|mood|ocd|ptsd|acute stress|complex ptsd|somatic symptom|illness anxiety|factitious/.test(text)) return SOURCES.disorders;
    return SOURCES.testing;
  }
  if (domainId === 6) return /medicat|drug|antidepress|antipsych|benzodia|maoi|ssri|lithium|stimulant|clozapine/.test(text) ? SOURCES.medications : SOURCES.therapy;
  if (domainId === 7) return /belmont|human subject|informed consent|irb|research ethics|debrief|deception/.test(text) ? SOURCES.belmont : (/mean|median|mode|variance|deviation|correl|regress|probab|alpha|power|signific|distribution|anova|chi.square|t.test|effect size|cohen|type i|type ii|bayesian|frequentist|multicollinearity|mediation|moderation|normal distribution|parametric|non parametric|propensity|item response theory|irt|structural equation|sem/.test(text) ? SOURCES.statistics : SOURCES.research);
  if (/evidence based practice/.test(text)) return SOURCES.ebpp;
  if (/tarasoff/.test(text)) return SOURCES.tarasoff;
  if (/dusky|competency to stand trial/.test(text)) return SOURCES.dusky;
  if (/insanity defense/.test(text)) return SOURCES.insanityDefense;
  if (/mandatory reporting|duty to report|child abuse/.test(text)) return SOURCES.mandatoryReporting;
  if (/goldwater/.test(text)) return SOURCES.goldwater;
  if (/o connor|donaldson/.test(text)) return SOURCES.oconnorDonaldson;
  if (/wyatt|stickney/.test(text)) return SOURCES.wyatt;
  if (/psypact/.test(text)) return SOURCES.psypact;
  if (/supervision/.test(text)) return SOURCES.supervision;
  if (/telehealth|telepsychology/.test(text)) return SOURCES.telepsychology;
  if (/hipaa|insurance company|protected health|psychotherapy notes/.test(text)) return SOURCES.hipaa;
  if (/jaffee/.test(text)) return SOURCES.jaffee;
  if (/child custody/.test(text)) return SOURCES.forensic;
  if (/forensic/.test(text)) return SOURCES.forensic;
  if (/multicultural|cultural competence|culturally responsive/.test(text)) return SOURCES.multicultural;
  return SOURCES.ethics;
}

function parseChoiceReasons(item) {
  if (Array.isArray(item.choiceRationales) && item.choiceRationales.length === 4) return Object.fromEntries(item.choiceRationales.map((value, index) => [index, clean(value)]));
  const reasons = {};
  String(item.rationale || '').replace(/\r/g, '').split('\n').forEach((line) => {
    const match = line.match(/^\s*\(?([A-D])\)?\s*(?:[).:\-]|->)\s*(.+)$/i);
    if (match) reasons[match[1].toUpperCase().charCodeAt(0) - 65] = clean(match[2]);
  });
  return reasons;
}

function mainRationale(item) {
  const raw = String(item.rationale || '').replace(/\r/g, '');
  const beforeFeedback = raw.split(/why (?:the )?others? (?:are )?wrong\s*:?/i)[0];
  return clean(beforeFeedback.split('\n').filter((line) => !/^\s*\(?[A-D]\)?\s*(?:[).:\-]|->)/i.test(line)).join(' '))
    .replace(/^(?:correct(?: answer)?|answer)\s*:?\s*(?:\([A-D]\)|[A-D][).:\-])?\s*/i, '')
    .trim();
}

function ensureLength(value, minimum, addition) {
  let result = clean(value);
  while (result.length < minimum) result = clean(`${result} ${addition}`);
  return result;
}

function moveKey(values, fromIndex, toIndex) {
  const reordered = values.slice();
  const [keyed] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, keyed);
  return reordered;
}

module.exports = { SOURCES, clean, normalize, hasFlag, sourceFor, parseChoiceReasons, mainRationale, ensureLength, moveKey };
