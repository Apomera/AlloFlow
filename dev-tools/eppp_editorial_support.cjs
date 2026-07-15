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
  mmpi: source(
    'Minnesota Multiphasic Personality Inventory-3 (MMPI-3)',
    'University of Minnesota Press, Test Division, official MMPI publisher',
    'https://www.upress.umn.edu/test-division/mmpi-3/',
    'The University of Minnesota Press Test Division publishes the MMPI family. Its official instrument materials are the primary source for edition-specific structure, intended use, scales, administration, and interpretation limits.'
  ),
  wechsler: source(
    'Wechsler Intelligence Scale for Children | Fifth Edition (WISC-V)',
    'Pearson Clinical Assessment, official instrument publisher',
    'https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Cognition-%26-Neuro/Wechsler-Intelligence-Scale-for-Children-%7C-Fifth-Edition/p/100000771',
    'Pearson publishes and standardizes the Wechsler intelligence scales. Its official product and technical materials are the primary source for edition-specific subtests, composites, age ranges, administration, and interpretation.'
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
};

function sourceFor(domainId, value) {
  const text = normalize(value);
  if (domainId === 1) {
    if (/biopsychosocial|health behavior|stress and health/.test(text)) return SOURCES.health;
    return /\b(?:neurotrans\w*|dopamin\w*|seroton\w*|gaba\w*|acetyl\w*|receptors?|agonists?|antagonists?|synap\w*|drugs?|medicat\w*|benzodia\w*|antipsych\w*|antidepress\w*)\b/.test(text) ? SOURCES.neurochemistry : SOURCES.neuroanatomy;
  }
  if (domainId === 2) {
    if (/memory|recall|recognition|encoding|retrieval|forget|amnesia|interference|rehearsal|misinformation|serial position|generation effect|spacing effect/.test(text)) return SOURCES.memory;
    if (/conditioning|reinforcement|punishment|extinction|learning|schedule|shaping|modeling/.test(text)) return SOURCES.learning;
    if (/emotion|motivation|drive|arousal|hunger|attribution of emotion|overjustification|schachter/.test(text)) return SOURCES.motivation;
    return SOURCES.cognition;
  }
  if (domainId === 3) return SOURCES.social;
  if (domainId === 4) return SOURCES.development;
  if (domainId === 5) {
    if (/mmpi/.test(text)) return SOURCES.mmpi;
    if (/bayley/.test(text)) return SOURCES.bayley;
    if (/wechsler|wisc|wais|wppsi/.test(text)) return SOURCES.wechsler;
    if (/rorschach/.test(text)) return SOURCES.rorschach;
    if (/halstead|reitan|neuropsych/.test(text)) return SOURCES.neuropsychAssessment;
    if (/\b(?:disorder|syndrome|diagnos|psychopatholog|symptom)\b/.test(text)) return SOURCES.disorders;
    return SOURCES.testing;
  }
  if (domainId === 6) return /medicat|drug|antidepress|antipsych|benzodia|maoi|ssri|lithium|stimulant|clozapine/.test(text) ? SOURCES.medications : SOURCES.therapy;
  if (domainId === 7) return /belmont|human subject|informed consent|irb|research ethics|debrief|deception/.test(text) ? SOURCES.belmont : (/mean|median|mode|variance|deviation|correl|regress|probab|alpha|power|signific|distribution|anova|chi.square|t.test|effect size|cohen|type i|type ii/.test(text) ? SOURCES.statistics : SOURCES.research);
  if (/evidence based practice/.test(text)) return SOURCES.ebpp;
  if (/supervision/.test(text)) return SOURCES.supervision;
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
