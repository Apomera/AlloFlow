/* AlloFlow Test Prep Hub - reusable exam-pack workspace */

const TEST_PREP_SCHEMA_VERSION = 1;
const TEST_PREP_STORAGE_KEY = 'alloflow_test_prep_progress_v1';
const TEST_PREP_ITEM_TYPES = ['single-choice'];
const TEST_PREP_SESSION_STORAGE_KEY = 'alloflow_test_prep_session_v1';
const TEST_PREP_PACK_STATUSES = ['ready', 'planned', 'research'];

const WORKPLACE_SAFETY_DEMO = {
  schemaVersion: TEST_PREP_SCHEMA_VERSION,
  id: 'workplace-safety-foundations-demo',
  title: 'Workplace Safety Foundations',
  shortTitle: 'Safety Foundations',
  description: 'A five-question demonstration of the reusable practice flow. It is not preparation for a credential or a substitute for workplace training.',
  credentialOwner: '',
  version: '1.0.0',
  status: 'ready',
  accent: 'teal',
  disclaimer: 'General learning demonstration only. Follow your employer, instructor, equipment manufacturer, and applicable safety authority.',
  domains: [
    { id: 'hazard-awareness', label: 'Hazard awareness', weight: 0.4 },
    { id: 'safe-response', label: 'Safe response', weight: 0.6 },
  ],
  sections: [{ id: 'foundations', label: 'Foundations', timeMinutes: null }],
  items: [
    {
      id: 'safety-demo-1',
      type: 'single-choice',
      domainId: 'hazard-awareness',
      difficulty: 'foundation',
      prompt: 'You are asked to use unfamiliar equipment. What is the best first step?',
      choices: [
        'Try it briefly to learn how it responds',
        'Ask another learner to operate it for you',
        'Complete the required training and review the approved operating procedure',
        'Use it only when a supervisor is nearby',
      ],
      answerIndex: 2,
      rationale: 'Training and the approved procedure establish the hazards, controls, and limits before operation begins.',
    },
    {
      id: 'safety-demo-2',
      type: 'single-choice',
      domainId: 'safe-response',
      difficulty: 'foundation',
      prompt: 'A ladder has a cracked rung. What is the safest response?',
      choices: [
        'Mark the rung and continue carefully',
        'Remove the ladder from service and report the damage',
        'Use it only for a short task',
        'Ask a coworker to steady it',
      ],
      answerIndex: 1,
      rationale: 'Damaged equipment should be removed from service through the workplace reporting process rather than used with an improvised workaround.',
    },
    {
      id: 'safety-demo-3',
      type: 'single-choice',
      domainId: 'hazard-awareness',
      difficulty: 'foundation',
      prompt: 'What is the main purpose of a Safety Data Sheet (SDS)?',
      choices: [
        'To record employee attendance',
        'To list a product price and supplier discount',
        'To communicate chemical hazards, handling, storage, and emergency information',
        'To replace all workplace-specific training',
      ],
      answerIndex: 2,
      rationale: 'An SDS communicates standardized information about a chemical product. It supports, but does not replace, training and workplace procedures.',
    },
    {
      id: 'safety-demo-4',
      type: 'single-choice',
      domainId: 'safe-response',
      difficulty: 'foundation',
      prompt: 'A task exposes workers to a hazard that cannot be eliminated immediately. What should guide the next action?',
      choices: [
        'The fastest available workaround',
        'The applicable hazard-control plan and authorized procedure',
        'Whatever another worksite usually does',
        'Whether the task can be finished before a break',
      ],
      answerIndex: 1,
      rationale: 'The applicable plan and authorized procedure identify the controls, responsibilities, and escalation path for the specific worksite and task.',
    },
    {
      id: 'safety-demo-5',
      type: 'single-choice',
      domainId: 'safe-response',
      difficulty: 'foundation',
      prompt: 'You do not understand a safety instruction. What is the best response?',
      choices: [
        'Continue and copy the person beside you',
        'Skip the instruction if the task seems familiar',
        'Pause and ask the responsible instructor or supervisor for clarification',
        'Search for a shorter instruction after the task',
      ],
      answerIndex: 2,
      rationale: 'Clarification should happen before exposure to the hazard. A learner should not have to guess about a safety-critical instruction.',
    },
  ],
};

const EPPP_PART_ONE_SCAFFOLD = {
  schemaVersion: TEST_PREP_SCHEMA_VERSION,
  id: 'eppp-part-one',
  title: 'EPPP Part 1 — Source-Reviewed Practice Bank',
  shortTitle: 'EPPP Part 1',
  description: 'One thousand source-reviewed practice items across all eight Part 1 domains, organized into ten balanced 100-question batches with feedback after each batch.',
  credentialOwner: 'Association of State and Provincial Psychology Boards',
  version: '2.0.0',
  status: 'ready',
  accent: 'violet',
  contentReview: '1,000 source-reviewed practice items; independent expert review pending',
  legacyUrl: './test_prep/eppp_legacy/index.html?embedded=1',
  legacyAuditUrl: './test_prep/eppp_legacy/content_audit.json',
  legacyInventoryUrl: './test_prep/eppp_legacy/content_inventory.json',
  legacyReviewLedgerUrl: './test_prep/eppp_legacy/review_ledger.json',
  curation500Url: './test_prep/eppp_legacy/curation_500.json',
  curation1000Url: './test_prep/eppp_legacy/curation_1000.json',
  expansionAuditUrl: './test_prep/eppp_native_expansion_1000_audit.json',
  nativeQaUrl: './test_prep/eppp_native_qa.json',
  learningLibraryUrl: './test_prep/eppp_learning_library.json',
  learningLibraryQaUrl: './test_prep/eppp_learning_library_qa.json',
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ASPPB. Practice results are not official scores or pass predictions.',
  domains: [
    { id: 'biological', label: 'Biological bases of behavior', weight: 0.10 },
    { id: 'cognitive-affective', label: 'Cognitive-affective bases of behavior', weight: 0.13 },
    { id: 'social-cultural', label: 'Social and cultural bases of behavior', weight: 0.11 },
    { id: 'lifespan', label: 'Growth and lifespan development', weight: 0.12 },
    { id: 'assessment', label: 'Assessment and diagnosis', weight: 0.16 },
    { id: 'intervention', label: 'Treatment, intervention, prevention and supervision', weight: 0.15 },
    { id: 'research', label: 'Research methods and statistics', weight: 0.07 },
    { id: 'professional', label: 'Ethical, legal, and professional issues', weight: 0.16 },
  ],
  sections: [{ id: 'knowledge', label: 'Part 1 — Knowledge', timeMinutes: 255 }],
  batchSize: 100,
  items: testPrepArrangeBalancedBatches(EPPP_NATIVE_ITEMS, ['biological', 'cognitive-affective', 'social-cultural', 'lifespan', 'assessment', 'intervention', 'research', 'professional'], 10),
};

const TEST_PREP_RESEARCH_LANES = [
  {
    id: 'code-inspection',
    icon: '\uD83C\uDFD7\uFE0F',
    title: 'Code and inspection credentials',
    examples: 'Electrician licensing, ICC inspection, contractor business and law',
    opportunity: 'High prep costs and a strong need for timed reference-navigation practice.',
    guardrail: 'Requires edition- and jurisdiction-specific packs plus licensed or user-owned reference books.',
  },
  {
    id: 'technical-safety',
    icon: '\uD83E\uDDF0',
    title: 'Technical safety credentials',
    examples: 'Welding inspection, fire systems, crane written examinations',
    opportunity: 'Preparation can cost hundreds or thousands of dollars.',
    guardrail: 'Safety-critical content requires qualified trade reviewers and must never imply practical certification.',
  },
  {
    id: 'language-access',
    icon: '\uD83C\uDF10',
    title: 'Language-access credentials',
    examples: 'Court and healthcare interpreter knowledge and performance exams',
    opportunity: 'AlloFlow already has multilingual, speech, replay, and accessible practice infrastructure.',
    guardrail: 'Oral-performance practice needs human-calibrated rubrics; transcript similarity is not interpreting quality.',
  },
];

const _testPrepPackRegistry = {};

function testPrepSlug(value, fallback) {
  const clean = String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return clean || fallback;
}

function testPrepFinite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

const TEST_PREP_REFERENCE_DETAILS = {
  'https://www.ets.org/pdfs/parapro/1755.pdf': {
    title: 'ParaPro Assessment (1755) Study Companion - Educational Testing Service',
    credibility: 'This is the official ETS study companion and public test blueprint for the current ParaPro Assessment. It defines the tested categories and format; AlloFlow questions remain independently authored.',
  },
  'https://ies.ed.gov/ncee/wwc/PracticeGuide/21/Published': {
    title: 'Foundational Skills to Support Reading for Understanding - What Works Clearinghouse, Institute of Education Sciences',
    credibility: 'The What Works Clearinghouse is part of the U.S. Department of Education\'s Institute of Education Sciences. This practice guide documents evidence reviews and recommendations for foundational reading instruction.',
  },
  'https://pubmed.ncbi.nlm.nih.gov/31066630/': {
    title: 'Myelin in the Central Nervous System: Structure, Function, and Pathology — PubMed, U.S. National Library of Medicine',
    credibility: 'PubMed is maintained by the U.S. National Library of Medicine, part of the National Institutes of Health, and provides traceable bibliographic records for biomedical research. The strength of a claim still depends on the underlying publication and study design.',
  },
  'https://pubmed.ncbi.nlm.nih.gov/34312672/': {
    title: 'Developing the Concept of Working Memory: The Role of Neuropsychology — PubMed, U.S. National Library of Medicine',
    credibility: 'PubMed is maintained by the U.S. National Library of Medicine, part of the National Institutes of Health, and provides traceable bibliographic records for biomedical research. The strength of a claim still depends on the underlying publication and study design.',
  },
  'https://www.apa.org/about/policy/multicultural-guidelines.pdf': {
    title: 'Multicultural Guidelines: An Ecological Approach to Context, Identity, and Intersectionality — American Psychological Association',
    credibility: 'The American Psychological Association is the principal U.S. professional organization for psychology, and these guidelines are an official APA policy resource developed for psychological education, research, and practice.',
  },
  'https://www.cdc.gov/act-early/about/developmental-monitoring-and-screening.html': {
    title: 'Developmental Monitoring and Screening — Centers for Disease Control and Prevention',
    credibility: 'The Centers for Disease Control and Prevention is the U.S. national public-health agency. This page synthesizes established pediatric guidance and clearly distinguishes routine monitoring from validated developmental screening.',
  },
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC4975285/': {
    title: 'Measures of Diagnostic Accuracy: Basic Definitions — PubMed Central, U.S. National Library of Medicine',
    credibility: 'PubMed Central is the U.S. National Library of Medicine’s full-text research archive. The cited peer-reviewed methods article defines diagnostic-accuracy terms and shows the associated calculations.',
  },
  'https://www.nimh.nih.gov/news/science-updates/2024/my-life-with-ocd': {
    title: 'My Life With OCD: I Feared I Was Going Crazy — National Institute of Mental Health',
    credibility: 'The National Institute of Mental Health is the lead U.S. federal agency for research on mental disorders. This NIMH feature connects a patient account with established descriptions of exposure and response prevention.',
  },
  'https://www.nist.gov/glossary-term/34096': {
    title: 'Type I Error — National Institute of Standards and Technology',
    credibility: 'The National Institute of Standards and Technology is a U.S. federal measurement-science agency. Its statistical glossary provides a concise, technically grounded definition of Type I error.',
  },
  'https://www.apa.org/ethics/code/manual-updates.html': {
    title: 'Ethical Principles of Psychologists and Code of Conduct — Amendments — American Psychological Association',
    credibility: 'This is the American Psychological Association’s official Ethics Code and amendments page. It is a primary professional source for the standards governing psychologists, though applicable law and jurisdictional rules must also be considered.',
  },
};

const TEST_PREP_REFERENCE_ORGANIZATIONS = {
  'apa.org': ['American Psychological Association', 'APA publishes official professional standards, ethics materials, policy, and guidance for psychology. The relevance and authority of the specific document still matter.'],
  'apastyle.apa.org': ['APA Style, American Psychological Association', 'APA Style is the American Psychological Association’s official source for its publication and citation guidance.'],
  'digital.apa.org': ['American Psychological Association Digital Learning', 'This is an official American Psychological Association educational resource.'],
  'dictionary.apa.org': ['APA Dictionary of Psychology, American Psychological Association', 'The APA Dictionary is maintained by the American Psychological Association and provides professionally edited definitions; definitions should be supplemented with primary evidence for contested or evolving claims.'],
  'pubmed.ncbi.nlm.nih.gov': ['PubMed, U.S. National Library of Medicine', 'PubMed is maintained by the U.S. National Library of Medicine, part of the National Institutes of Health, and provides traceable biomedical citations. Indexing alone does not guarantee that every study is strong.'],
  'pmc.ncbi.nlm.nih.gov': ['PubMed Central, U.S. National Library of Medicine', 'PubMed Central is the U.S. National Library of Medicine’s full-text archive for biomedical and life-sciences literature. Article design and evidence quality still require evaluation.'],
  'ncbi.nlm.nih.gov': ['National Center for Biotechnology Information, U.S. National Library of Medicine', 'NCBI is part of the U.S. National Library of Medicine and maintains authoritative biomedical databases and reference resources.'],
  'medlineplus.gov': ['MedlinePlus, U.S. National Library of Medicine', 'MedlinePlus is the U.S. National Library of Medicine’s reviewed consumer-health information service and links its summaries to established medical sources.'],
  'nimh.nih.gov': ['National Institute of Mental Health', 'NIMH is the lead U.S. federal agency for research on mental disorders and publishes evidence-informed health and research information.'],
  'nida.nih.gov': ['National Institute on Drug Abuse', 'NIDA is the U.S. National Institutes of Health institute responsible for research on drug use and addiction.'],
  'ninds.nih.gov': ['National Institute of Neurological Disorders and Stroke', 'NINDS is the U.S. National Institutes of Health institute responsible for neurological-disorder research and public information.'],
  'ods.od.nih.gov': ['NIH Office of Dietary Supplements', 'The NIH Office of Dietary Supplements publishes evidence-based fact sheets that document sources and distinguish established findings from uncertain evidence.'],
  'cdc.gov': ['Centers for Disease Control and Prevention', 'CDC is the U.S. national public-health agency and publishes surveillance data and evidence-informed health guidance.'],
  'nist.gov': ['National Institute of Standards and Technology', 'NIST is a U.S. federal measurement-science agency and is an authoritative source for statistical and technical definitions within its remit.'],
  'itl.nist.gov': ['NIST Information Technology Laboratory', 'This NIST laboratory publishes technically reviewed statistical and measurement reference materials.'],
  'hhs.gov': ['U.S. Department of Health and Human Services', 'HHS is the U.S. federal department responsible for national health policy and publishes primary regulatory and program guidance.'],
  'childwelfare.gov': ['Child Welfare Information Gateway, U.S. Department of Health and Human Services', 'This federal service synthesizes U.S. child-welfare law, policy, and practice information and identifies its supporting sources.'],
  'who.int': ['World Health Organization', 'WHO is the United Nations agency for international public health and develops evidence-informed classifications, standards, and guidance through documented review processes.'],
  'ptsd.va.gov': ['National Center for PTSD, U.S. Department of Veterans Affairs', 'The National Center for PTSD is a U.S. Department of Veterans Affairs research and education center that summarizes trauma evidence and clinical guidance.'],
  'openstax.org': ['OpenStax, Rice University', 'OpenStax textbooks are produced by Rice University, openly peer reviewed, and supported by citations and an editorial revision process.'],
  'pearsonassessments.com': ['Pearson Clinical Assessments', 'This is the assessment publisher’s primary source for a product’s current edition, intended use, scoring, and administration details; publisher claims are not a substitute for independent validity evidence.'],
  'parinc.com': ['PAR, Inc.', 'This is the test publisher’s primary source for current product specifications and manuals; publisher information should be paired with independent evidence when evaluating validity or clinical utility.'],
  'proedinc.com': ['PRO-ED, Inc.', 'This is the publisher’s primary source for current test-edition and administration details; independent evidence is still needed for broader validity claims.'],
  'ets.org': ['ETS Research Institute', 'ETS is a nonprofit educational measurement organization whose research reports document methods and sources; the specific report and evidence should still be appraised.'],
  'ies.ed.gov': ['Institute of Education Sciences, U.S. Department of Education', 'IES is the U.S. Department of Education\'s independent statistics, research, and evaluation arm. Its What Works Clearinghouse publishes evidence reviews and educator practice guides using documented standards.'],
  'gace.ets.org': ['Georgia Assessments for the Certification of Educators, ETS', 'This is the official ETS program source for the Georgia educator-certification assessment’s requirements and test information.'],
  'clep.collegeboard.org': ['College-Level Examination Program, College Board', 'This is the official program source for current CLEP exam descriptions, policies, and specifications.'],
  'files.eric.ed.gov': ['ERIC, Institute of Education Sciences, U.S. Department of Education', 'ERIC is the U.S. Department of Education’s education-research database and preserves source documents with traceable publication metadata. Inclusion does not itself establish study quality.'],
  'law.cornell.edu': ['Legal Information Institute, Cornell Law School', 'Cornell Law School’s Legal Information Institute provides maintained, citable access to U.S. statutes, regulations, and court materials.'],
  'supremecourt.gov': ['Supreme Court of the United States', 'This is the Court’s official source for its opinions, rules, and case documents.'],
  'law.justia.com': ['Justia U.S. Law', 'Justia republishes primary U.S. legal materials with case and citation metadata; controlling law should be confirmed against official and jurisdiction-current sources.'],
  'supreme.justia.com': ['Justia U.S. Supreme Court Center', 'Justia provides searchable reproductions of U.S. Supreme Court opinions; the underlying opinion is primary law, while current legal effect may require later-history review.'],
  'training.cochrane.org': ['Cochrane Training', 'Cochrane is an international evidence-synthesis organization known for explicit systematic-review methods and publishes official methodological training resources.'],
  'bmj.com': ['The BMJ', 'The BMJ is a peer-reviewed medical journal. Credibility depends on the cited article’s methods, transparency, and fit to the claim.'],
  'journals.sagepub.com': ['SAGE Journals', 'SAGE hosts peer-reviewed scholarly journals. Publisher and peer-review status support provenance, but the individual study’s methods determine evidentiary strength.'],
  'us.sagepub.com': ['SAGE Publishing', 'This is the scholarly publisher’s primary bibliographic source; the underlying work’s methods and evidence determine the strength of its claims.'],
  'routledge.com': ['Routledge, Taylor & Francis Group', 'This is the scholarly publisher’s primary bibliographic source. Editorial review supports provenance, while the underlying work must still be evaluated.'],
  'r-pas.org': ['Rorschach Performance Assessment System', 'This is the system developer’s primary source for current administration and scoring claims; independent validation evidence remains important.'],
  'europepmc.org': ['Europe PMC', 'Europe PMC is a life-sciences literature database supported by major public research funders and provides traceable publication metadata and links.'],
  'aasm.org': ['American Academy of Sleep Medicine', 'AASM is the U.S. professional society for sleep medicine and develops clinical classifications and guidance through expert and evidence-review processes.'],
  'soarworks.samhsa.gov': ['SOAR, Substance Abuse and Mental Health Services Administration', 'This is an official SAMHSA technical-assistance resource within the U.S. Department of Health and Human Services.'],
};

function testPrepReferencePageLabel(url) {
  const finalSegment = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
  if (!finalSegment || /^(articles?|pages?|index|home)$/i.test(finalSegment)) return 'Referenced resource';
  if (/^(pmc|\d{5,})\d*$/i.test(finalSegment)) return 'Record ' + finalSegment.toUpperCase();
  return finalSegment.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function testPrepDescribeReference(reference) {
  if (TEST_PREP_REFERENCE_DETAILS[reference]) return TEST_PREP_REFERENCE_DETAILS[reference];
  try {
    const url = new URL(reference, window.location.href);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (hostname === 'doi.org') {
      const doi = decodeURIComponent(url.pathname.replace(/^\//, ''));
      return {
        title: 'Digital Object Identifier record — ' + doi,
        credibility: 'A DOI is a persistent identifier that makes the cited scholarly work and its publisher metadata traceable. A DOI is not a quality rating; the publication and study methods still determine evidentiary strength.',
      };
    }
    const organization = TEST_PREP_REFERENCE_ORGANIZATIONS[hostname];
    const pageLabel = testPrepReferencePageLabel(url);
    if (organization) return { title: pageLabel + ' — ' + organization[0], credibility: organization[1] };
    return {
      title: pageLabel + ' — ' + hostname,
      credibility: 'This link identifies the publishing organization and preserves a traceable source record. Its relevance, authorship, evidence, and publication process should be evaluated for the specific claim.',
    };
  } catch (_error) {
    return {
      title: reference,
      credibility: 'This citation is retained for traceability, but its publisher and evidence quality should be verified before relying on it.',
    };
  }
}

function normalizeTestPrepDomain(domain, index) {
  const input = domain && typeof domain === 'object' && !Array.isArray(domain) ? domain : {};
  return {
    id: testPrepSlug(input.id || input.label, 'domain-' + (index + 1)),
    label: String(input.label || input.name || 'Domain ' + (index + 1)).trim().slice(0, 140),
    weight: Math.max(0, testPrepFinite(input.weight, 0)),
  };
}

function normalizeTestPrepItem(item, index, domainIds) {
  const input = item && typeof item === 'object' && !Array.isArray(item) ? item : {};
  const choices = (Array.isArray(input.choices) ? input.choices : input.options)
    ?.slice(0, 8).map((choice) => String(choice || '').trim().slice(0, 600)).filter(Boolean) || [];
  const requestedChoiceRationales = (Array.isArray(input.choiceRationales) ? input.choiceRationales : [])
    .slice(0, 8).map((rationale) => String(rationale || '').trim().slice(0, 1600));
  const choiceRationales = requestedChoiceRationales.length === choices.length && requestedChoiceRationales.every(Boolean)
    ? requestedChoiceRationales : [];
  const answerIndex = Math.floor(testPrepFinite(input.answerIndex, input.answer));
  const requestedDomain = testPrepSlug(input.domainId, '');
  const references = (Array.isArray(input.references) ? input.references : [])
    .slice(0, 8).map((reference) => String(reference || '').trim().slice(0, 500)).filter(Boolean);
  const sourceDetails = (Array.isArray(input.sourceDetails) ? input.sourceDetails : []).slice(0, 8).map((detail) => {
    const value = detail && typeof detail === 'object' && !Array.isArray(detail) ? detail : {};
    return {
      url: String(value.url || '').trim().slice(0, 500),
      title: String(value.title || '').trim().slice(0, 500),
      credibility: String(value.credibility || '').trim().slice(0, 1600),
    };
  }).filter((detail) => references.includes(detail.url) && detail.title && detail.credibility);
  return {
    id: testPrepSlug(input.id, 'item-' + (index + 1)),
    templateVersion: Math.max(1, Math.floor(testPrepFinite(input.templateVersion, 1))),
    type: TEST_PREP_ITEM_TYPES.includes(input.type) ? input.type : 'single-choice',
    domainId: domainIds.includes(requestedDomain) ? requestedDomain : (domainIds[0] || 'general'),
    difficulty: String(input.difficulty || 'unrated').trim().slice(0, 40),
    skillIds: (Array.isArray(input.skillIds) ? input.skillIds : []).slice(0, 4).map((value) => testPrepSlug(value, '')).filter(Boolean),
    chapterIds: (Array.isArray(input.chapterIds) ? input.chapterIds : []).slice(0, 4).map((value) => testPrepSlug(value, '')).filter(Boolean),
    prompt: String(input.prompt || input.q || '').trim().slice(0, 3000),
    choices,
    choiceRationales,
    answerIndex,
    rationale: String(input.rationale || '').trim().slice(0, 4000),
    references,
    sourceDetails,
    reviewStatus: String(input.reviewStatus || 'unreviewed').trim().slice(0, 40),
    legacySourceId: /^legacy-[a-f0-9]{16}$/.test(String(input.legacySourceId || '').trim()) ? String(input.legacySourceId).trim() : '',
    legacySourceFile: /^js\/[a-zA-Z0-9_.-]+\.js$/.test(String(input.legacySourceFile || '').trim()) ? String(input.legacySourceFile).trim() : '',
    authoredSourceId: String(input.authoredSourceId || '').trim().slice(0, 100),
    expansionBatch: String(input.expansionBatch || '').trim().slice(0, 100),
    sourceReviewBasis: String(input.sourceReviewBasis || '').trim().slice(0, 100),
    domainAlignmentStatus: String(input.domainAlignmentStatus || '').trim().slice(0, 100),
    clueReviewStatus: String(input.clueReviewStatus || '').trim().slice(0, 100),
    biasAccessibilityStatus: String(input.biasAccessibilityStatus || '').trim().slice(0, 100),
    migrationStatus: String(input.migrationStatus || '').trim().slice(0, 60),
    qaStatus: input.qaStatus === 'qa-passed' ? 'qa-passed' : 'review-required',
    qaReviewedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(input.qaReviewedAt || '').trim()) ? String(input.qaReviewedAt).trim() : '',
  };
}

function normalizeTestPrepPack(pack) {
  const input = pack && typeof pack === 'object' && !Array.isArray(pack) ? pack : {};
  const domains = (Array.isArray(input.domains) ? input.domains : []).slice(0, 80).map(normalizeTestPrepDomain);
  if (!domains.length) domains.push({ id: 'general', label: 'General', weight: 1 });
  const domainIds = domains.map((domain) => domain.id);
  const sections = (Array.isArray(input.sections) ? input.sections : []).slice(0, 20).map((section, index) => ({
    id: testPrepSlug(section && (section.id || section.label), 'section-' + (index + 1)),
    label: String(section && (section.label || section.name) || 'Section ' + (index + 1)).trim().slice(0, 140),
    timeMinutes: section && section.timeMinutes != null ? Math.max(1, Math.round(testPrepFinite(section.timeMinutes, 1))) : null,
  }));
  const items = (Array.isArray(input.items) ? input.items : []).slice(0, 10000)
    .map((item, index) => normalizeTestPrepItem(item, index, domainIds));
  return {
    schemaVersion: Math.floor(testPrepFinite(input.schemaVersion, TEST_PREP_SCHEMA_VERSION)),
    id: testPrepSlug(input.id || input.title, 'exam-pack'),
    title: String(input.title || '').trim().slice(0, 180),
    shortTitle: String(input.shortTitle || input.title || '').trim().slice(0, 100),
    description: String(input.description || '').trim().slice(0, 800),
    credentialOwner: String(input.credentialOwner || '').trim().slice(0, 180),
    version: String(input.version || '0.1.0').trim().slice(0, 40),
    status: TEST_PREP_PACK_STATUSES.includes(input.status) ? input.status : 'research',
    accent: String(input.accent || 'indigo').trim().slice(0, 30),
    disclaimer: String(input.disclaimer || 'Independent practice material. Not an official score or credential.').trim().slice(0, 800),
    contentReview: String(input.contentReview || '').trim().slice(0, 160),
    batchSize: Math.max(1, Math.min(500, Math.round(testPrepFinite(input.batchSize, 100)))),
    simulationItemCount: Math.max(0, Math.min(500, Math.round(testPrepFinite(input.simulationItemCount, 0)))),
    simulationTimeMinutes: Math.max(0, Math.min(600, Math.round(testPrepFinite(input.simulationTimeMinutes, 0)))),
    legacyUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.legacyUrl || '').trim()) && !String(input.legacyUrl || '').includes('..') ? String(input.legacyUrl).trim() : '',
    legacyAuditUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.legacyAuditUrl || '').trim()) && !String(input.legacyAuditUrl || '').includes('..') ? String(input.legacyAuditUrl).trim() : '',
    legacyInventoryUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.legacyInventoryUrl || '').trim()) && !String(input.legacyInventoryUrl || '').includes('..') ? String(input.legacyInventoryUrl).trim() : '',
    legacyReviewLedgerUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.legacyReviewLedgerUrl || '').trim()) && !String(input.legacyReviewLedgerUrl || '').includes('..') ? String(input.legacyReviewLedgerUrl).trim() : '',
    curation500Url: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.curation500Url || '').trim()) && !String(input.curation500Url || '').includes('..') ? String(input.curation500Url).trim() : '',
    curation1000Url: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.curation1000Url || '').trim()) && !String(input.curation1000Url || '').includes('..') ? String(input.curation1000Url).trim() : '',
    expansionAuditUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.expansionAuditUrl || '').trim()) && !String(input.expansionAuditUrl || '').includes('..') ? String(input.expansionAuditUrl).trim() : '',
    nativeQaUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.nativeQaUrl || '').trim()) && !String(input.nativeQaUrl || '').includes('..') ? String(input.nativeQaUrl).trim() : '',
    learningLibraryUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.learningLibraryUrl || '').trim()) && !String(input.learningLibraryUrl || '').includes('..') ? String(input.learningLibraryUrl).trim() : '',
    learningLibraryQaUrl: /^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(String(input.learningLibraryQaUrl || '').trim()) && !String(input.learningLibraryQaUrl || '').includes('..') ? String(input.learningLibraryQaUrl).trim() : '',
    domains,
    sections,
    items,
  };
}

function validateTestPrepPack(pack) {
  const normalized = normalizeTestPrepPack(pack);
  const errors = [];
  if (normalized.schemaVersion !== TEST_PREP_SCHEMA_VERSION) errors.push('Unsupported schema version.');
  if (!normalized.title) errors.push('Pack title is required.');
  if (!normalized.id) errors.push('Pack id is required.');
  const seen = new Set();
  normalized.items.forEach((item, index) => {
    if (!item.prompt) errors.push('Item ' + (index + 1) + ' is missing a prompt.');
    if (item.choices.length < 2) errors.push('Item ' + (index + 1) + ' needs at least two choices.');
    if (item.answerIndex < 0 || item.answerIndex >= item.choices.length) errors.push('Item ' + (index + 1) + ' has an invalid answer index.');
    if (seen.has(item.id)) errors.push('Duplicate item id: ' + item.id + '.');
    seen.add(item.id);
  });
  if (normalized.status === 'ready' && !normalized.items.length) errors.push('A ready pack must contain at least one item.');
  return { valid: errors.length === 0, errors, pack: normalized };
}

function registerTestPrepPack(pack) {
  const result = validateTestPrepPack(pack);
  if (!result.valid) throw new Error('Invalid test prep pack: ' + result.errors.join(' '));
  _testPrepPackRegistry[result.pack.id] = result.pack;
  return result.pack;
}

function listTestPrepPacks() {
  return Object.keys(_testPrepPackRegistry).map((id) => _testPrepPackRegistry[id]);
}

function testPrepArrangeBalancedBatches(items, domainIds, batchCount) {
  const sourceItems = Array.isArray(items) ? items.slice() : [];
  const domains = Array.isArray(domainIds) ? domainIds.slice() : [];
  const count = Math.max(1, Math.floor(testPrepFinite(batchCount, 1)));
  if (count === 1 || !sourceItems.length || !domains.length) return sourceItems;
  const groups = Object.fromEntries(domains.map((domainId) => [domainId, []]));
  const unmatched = [];
  sourceItems.forEach((item) => {
    if (item && groups[item.domainId]) groups[item.domainId].push(item);
    else unmatched.push(item);
  });
  const batches = Array.from({ length: count }, () => []);
  const domainSlices = Array.from({ length: count }, () => []);
  domains.forEach((domainId) => {
    const group = groups[domainId];
    let offset = 0;
    for (let batchIndex = 0; batchIndex < count; batchIndex += 1) {
      const size = Math.floor(group.length / count) + (batchIndex < group.length % count ? 1 : 0);
      domainSlices[batchIndex].push(group.slice(offset, offset + size));
      offset += size;
    }
  });
  domainSlices.forEach((slices, batchIndex) => {
    const longest = Math.max(0, ...slices.map((slice) => slice.length));
    for (let position = 0; position < longest; position += 1) {
      slices.forEach((slice) => { if (slice[position]) batches[batchIndex].push(slice[position]); });
    }
  });
  unmatched.forEach((item, index) => batches[index % count].push(item));
  return batches.flat();
}

function testPrepBatchMeta(pack, questionIndex) {
  const normalized = normalizeTestPrepPack(pack);
  const totalItems = normalized.items.length;
  const batchSize = Math.max(1, normalized.batchSize || 100);
  const safeIndex = Math.max(0, Math.min(Math.max(0, totalItems - 1), Math.floor(testPrepFinite(questionIndex, 0))));
  const batchNumber = Math.floor(safeIndex / batchSize) + 1;
  const batchCount = Math.max(1, Math.ceil(totalItems / batchSize));
  const startIndex = (batchNumber - 1) * batchSize;
  const endIndex = Math.min(totalItems, startIndex + batchSize);
  return {
    batchSize,
    batchNumber,
    batchCount,
    startIndex,
    endIndex,
    itemCount: Math.max(0, endIndex - startIndex),
    position: totalItems ? safeIndex - startIndex + 1 : 0,
    isFinalBatch: batchNumber === batchCount,
  };
}

function testPrepBuildBatchDiagnostic(pack, answers, confidence, batchNumber) {
  const normalized = normalizeTestPrepPack(pack);
  const batchSize = Math.max(1, normalized.batchSize || 100);
  const batchCount = Math.max(1, Math.ceil(normalized.items.length / batchSize));
  const safeBatchNumber = Math.max(1, Math.min(batchCount, Math.floor(testPrepFinite(batchNumber, 1))));
  const startIndex = (safeBatchNumber - 1) * batchSize;
  const endIndex = Math.min(normalized.items.length, startIndex + batchSize);
  const batchItems = normalized.items.slice(startIndex, endIndex);
  const responseMap = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  const confidenceMap = confidence && typeof confidence === 'object' && !Array.isArray(confidence) ? confidence : {};
  const byDomain = {};
  const bySkill = {};
  const confidenceSummary = { sure: { correct: 0, total: 0 }, unsure: { correct: 0, total: 0 }, guess: { correct: 0, total: 0 }, unrated: { correct: 0, total: 0 } };
  const confidentMissQuestionNumbers = [];
  let correct = 0;
  let uncertainCorrect = 0;
  batchItems.forEach((item, localIndex) => {
    const isCorrect = Number(responseMap[item.id]) === item.answerIndex;
    const domainId = item.domainId || 'general';
    if (!byDomain[domainId]) byDomain[domainId] = { correct: 0, total: 0 };
    byDomain[domainId].total += 1;
    if (isCorrect) { correct += 1; byDomain[domainId].correct += 1; }
    item.skillIds.forEach((skillId) => {
      if (!bySkill[skillId]) bySkill[skillId] = { correct: 0, total: 0 };
      bySkill[skillId].total += 1;
      if (isCorrect) bySkill[skillId].correct += 1;
    });
    const rating = ['sure', 'unsure', 'guess'].includes(confidenceMap[item.id]) ? confidenceMap[item.id] : 'unrated';
    confidenceSummary[rating].total += 1;
    if (isCorrect) confidenceSummary[rating].correct += 1;
    if (!isCorrect && rating === 'sure') confidentMissQuestionNumbers.push(startIndex + localIndex + 1);
    if (isCorrect && (rating === 'unsure' || rating === 'guess')) uncertainCorrect += 1;
  });
  Object.values(confidenceSummary).forEach((entry) => { entry.percent = entry.total ? Math.round(entry.correct / entry.total * 100) : 0; });
  const domainRows = normalized.domains.map((domain) => {
    const entry = byDomain[domain.id] || { correct: 0, total: 0 };
    return { id: domain.id, label: domain.label, correct: entry.correct, total: entry.total, percent: entry.total ? Math.round(entry.correct / entry.total * 100) : 0, missed: entry.total - entry.correct };
  }).filter((entry) => entry.total > 0);
  const focusDomains = domainRows.filter((entry) => entry.missed > 0).slice().sort((left, right) => left.percent - right.percent || right.total - left.total || left.label.localeCompare(right.label)).slice(0, 2);
  const skillRows = Object.keys(bySkill).map((skillId) => {
    const entry = bySkill[skillId];
    return { id: skillId, correct: entry.correct, total: entry.total, percent: entry.total ? Math.round(entry.correct / entry.total * 100) : 0, missed: entry.total - entry.correct };
  }).filter((entry) => entry.total > 0);
  const focusSkillIds = skillRows.filter((entry) => entry.missed > 0).slice().sort((left, right) => left.percent - right.percent || right.total - left.total || left.id.localeCompare(right.id)).slice(0, 3).map((entry) => entry.id);
  const feedback = [];
  if (focusDomains.length) feedback.push('Lowest accuracy in this batch: ' + focusDomains.map((entry) => entry.label + ' (' + entry.correct + '/' + entry.total + ')').join(' and ') + '. Review the missed concepts before the next batch.');
  else feedback.push('No items were missed in this batch. Use spaced retrieval later to check that the learning remains durable.');
  if (confidentMissQuestionNumbers.length) feedback.push('Review confident misses first: question' + (confidentMissQuestionNumbers.length === 1 ? ' ' : 's ') + confidentMissQuestionNumbers.join(', ') + '. High confidence plus an incorrect answer is especially useful calibration feedback.');
  if (uncertainCorrect) feedback.push(uncertainCorrect + ' correct answer' + (uncertainCorrect === 1 ? ' was' : 's were') + ' marked unsure or guessed. Revisit the reasoning, then retrieve it again without cues to strengthen confidence grounded in evidence.');
  if (confidenceSummary.unrated.total) feedback.push(confidenceSummary.unrated.total + ' response' + (confidenceSummary.unrated.total === 1 ? ' had' : 's had') + ' no confidence rating; rating future answers will make calibration feedback more informative.');
  return {
    batchNumber: safeBatchNumber,
    batchCount,
    startIndex,
    endIndex,
    firstQuestion: batchItems.length ? startIndex + 1 : 0,
    lastQuestion: endIndex,
    correct,
    total: batchItems.length,
    percent: batchItems.length ? Math.round(correct / batchItems.length * 100) : 0,
    byDomain,
    bySkill,
    domainRows,
    skillRows,
    focusSkillIds,
    confidenceSummary,
    confidentMissQuestionNumbers,
    uncertainCorrect,
    feedback,
    isFinalBatch: safeBatchNumber === batchCount,
  };
}

function testPrepNormalizeBreakdown(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const output = {};
  Object.keys(input).slice(0, 120).forEach((key) => {
    const id = testPrepSlug(key, '');
    const entry = input[key] && typeof input[key] === 'object' ? input[key] : {};
    const total = Math.max(0, Math.floor(testPrepFinite(entry.total, 0)));
    const correct = Math.max(0, Math.min(total, Math.floor(testPrepFinite(entry.correct, 0))));
    if (id && total) output[id] = { correct, total };
  });
  return output;
}

function testPrepNormalizeConfidenceSummary(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const output = {};
  ['sure', 'unsure', 'guess', 'unrated'].forEach((rating) => {
    const entry = input[rating] && typeof input[rating] === 'object' ? input[rating] : {};
    const total = Math.max(0, Math.floor(testPrepFinite(entry.total, 0)));
    const correct = Math.max(0, Math.min(total, Math.floor(testPrepFinite(entry.correct, 0))));
    output[rating] = { correct, total, percent: total ? Math.round(correct / total * 100) : 0 };
  });
  return output;
}

function testPrepAttemptMetadata(metadata) {
  const input = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
  return {
    mode: ['standard', 'diagnostic', 'targeted', 'simulation'].includes(input.mode) ? input.mode : 'standard',
    label: String(input.label || '').trim().slice(0, 120),
    targetSkillId: testPrepSlug(input.targetSkillId, ''),
    sourceStartIndex: Math.max(0, Math.floor(testPrepFinite(input.sourceStartIndex, 0))),
    timeLimitMinutes: Math.max(0, Math.min(600, Math.floor(testPrepFinite(input.timeLimitMinutes, 0)))),
    timedOut: input.timedOut === true,
    itemIds: (Array.isArray(input.itemIds) ? input.itemIds : []).slice(0, 500).map((id) => testPrepSlug(id, '')).filter(Boolean),
  };
}

function recordTestPrepBatchAttempt(progress, pack, diagnostic, confidence, now, metadata) {
  const normalizedPack = normalizeTestPrepPack(pack);
  const next = normalizeTestPrepProgress(progress);
  if (!diagnostic || !diagnostic.total) return next;
  const meta = testPrepAttemptMetadata(metadata);
  next.attempts.push({
    id: 'attempt-' + Math.round(testPrepFinite(now, Date.now())) + '-' + Math.random().toString(36).slice(2, 8),
    packId: normalizedPack.id,
    completedAt: Math.max(0, testPrepFinite(now, Date.now())),
    correct: diagnostic.correct,
    total: diagnostic.total,
    percent: diagnostic.percent,
    confidence: confidence && typeof confidence === 'object' && !Array.isArray(confidence) ? confidence : {},
    confidenceSummary: testPrepNormalizeConfidenceSummary(diagnostic.confidenceSummary),
    byDomain: testPrepNormalizeBreakdown(diagnostic.byDomain),
    bySkill: testPrepNormalizeBreakdown(diagnostic.bySkill),
    mode: meta.mode,
    label: meta.label,
    targetSkillId: meta.targetSkillId,
    sourceStartIndex: meta.sourceStartIndex,
    timeLimitMinutes: meta.timeLimitMinutes,
    timedOut: meta.timedOut,
    itemIds: meta.itemIds,
    batchNumber: diagnostic.batchNumber,
    batchCount: diagnostic.batchCount,
    firstQuestion: diagnostic.firstQuestion,
    lastQuestion: diagnostic.lastQuestion,
  });
  return writeTestPrepProgress(next);
}

function normalizeTestPrepProgress(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const attempts = (Array.isArray(input.attempts) ? input.attempts : []).slice(-100).map((attempt) => ({
    id: String(attempt && attempt.id || '').slice(0, 100),
    packId: testPrepSlug(attempt && attempt.packId, ''),
    completedAt: Math.max(0, testPrepFinite(attempt && attempt.completedAt, 0)),
    correct: Math.max(0, Math.floor(testPrepFinite(attempt && attempt.correct, 0))),
    total: Math.max(0, Math.floor(testPrepFinite(attempt && attempt.total, 0))),
    percent: Math.max(0, Math.min(100, Math.round(testPrepFinite(attempt && attempt.percent, 0)))),
    confidence: attempt && attempt.confidence && typeof attempt.confidence === 'object' && !Array.isArray(attempt.confidence) ? attempt.confidence : {},
    confidenceSummary: testPrepNormalizeConfidenceSummary(attempt && attempt.confidenceSummary),
    byDomain: testPrepNormalizeBreakdown(attempt && attempt.byDomain),
    bySkill: testPrepNormalizeBreakdown(attempt && attempt.bySkill),
    mode: ['standard', 'diagnostic', 'targeted', 'simulation'].includes(attempt && attempt.mode) ? attempt.mode : 'standard',
    label: String(attempt && attempt.label || '').trim().slice(0, 120),
    targetSkillId: testPrepSlug(attempt && attempt.targetSkillId, ''),
    sourceStartIndex: Math.max(0, Math.floor(testPrepFinite(attempt && attempt.sourceStartIndex, 0))),
    timeLimitMinutes: Math.max(0, Math.min(600, Math.floor(testPrepFinite(attempt && attempt.timeLimitMinutes, 0)))),
    timedOut: attempt && attempt.timedOut === true,
    itemIds: (Array.isArray(attempt && attempt.itemIds) ? attempt.itemIds : []).slice(0, 500).map((id) => testPrepSlug(id, '')).filter(Boolean),
    batchNumber: Math.max(0, Math.floor(testPrepFinite(attempt && attempt.batchNumber, 0))),
    batchCount: Math.max(0, Math.floor(testPrepFinite(attempt && attempt.batchCount, 0))),
    firstQuestion: Math.max(0, Math.floor(testPrepFinite(attempt && attempt.firstQuestion, 0))),
    lastQuestion: Math.max(0, Math.floor(testPrepFinite(attempt && attempt.lastQuestion, 0))),
  })).filter((attempt) => attempt.packId && attempt.total > 0 && attempt.correct <= attempt.total);
  return { attempts };
}

function readTestPrepProgress() {
  try { return normalizeTestPrepProgress(JSON.parse(localStorage.getItem(TEST_PREP_STORAGE_KEY) || '{}')); }
  catch (_) { return { attempts: [] }; }
}

function writeTestPrepProgress(progress) {
  const normalized = normalizeTestPrepProgress(progress);
  try { localStorage.setItem(TEST_PREP_STORAGE_KEY, JSON.stringify(normalized)); } catch (_) {}
  return normalized;
}

function scoreTestPrepAttempt(pack, answers) {
  const normalized = normalizeTestPrepPack(pack);
  const responseMap = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  let correct = 0;
  const byDomain = {};
  const bySkill = {};
  normalized.items.forEach((item) => {
    const domain = item.domainId || 'general';
    if (!byDomain[domain]) byDomain[domain] = { correct: 0, total: 0 };
    byDomain[domain].total += 1;
    const isCorrect = Number(responseMap[item.id]) === item.answerIndex;
    item.skillIds.forEach((skillId) => {
      if (!bySkill[skillId]) bySkill[skillId] = { correct: 0, total: 0 };
      bySkill[skillId].total += 1;
      if (isCorrect) bySkill[skillId].correct += 1;
    });
    if (isCorrect) {
      correct += 1;
      byDomain[domain].correct += 1;
    }
  });
  const total = normalized.items.length;
  return { correct, total, percent: total ? Math.round(correct / total * 100) : 0, byDomain, bySkill };
}

function testPrepConfidenceForAttempt(pack, answers, confidence) {
  const normalized = normalizeTestPrepPack(pack);
  const responseMap = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  const confidenceMap = confidence && typeof confidence === 'object' && !Array.isArray(confidence) ? confidence : {};
  const summary = { sure: { correct: 0, total: 0 }, unsure: { correct: 0, total: 0 }, guess: { correct: 0, total: 0 }, unrated: { correct: 0, total: 0 } };
  normalized.items.forEach((item) => {
    const rating = ['sure', 'unsure', 'guess'].includes(confidenceMap[item.id]) ? confidenceMap[item.id] : 'unrated';
    summary[rating].total += 1;
    if (Number(responseMap[item.id]) === item.answerIndex) summary[rating].correct += 1;
  });
  return testPrepNormalizeConfidenceSummary(summary);
}

function recordTestPrepAttempt(progress, pack, answers, confidence, now, metadata) {
  const score = scoreTestPrepAttempt(pack, answers);
  const next = normalizeTestPrepProgress(progress);
  if (!score.total) return next;
  const meta = testPrepAttemptMetadata(metadata);
  next.attempts.push({
    id: 'attempt-' + Math.round(testPrepFinite(now, Date.now())) + '-' + Math.random().toString(36).slice(2, 8),
    packId: normalizeTestPrepPack(pack).id,
    completedAt: Math.max(0, testPrepFinite(now, Date.now())),
    correct: score.correct,
    total: score.total,
    percent: score.percent,
    confidence: confidence && typeof confidence === 'object' && !Array.isArray(confidence) ? confidence : {},
    confidenceSummary: testPrepConfidenceForAttempt(pack, answers, confidence),
    byDomain: score.byDomain,
    bySkill: score.bySkill,
    mode: meta.mode,
    label: meta.label,
    targetSkillId: meta.targetSkillId,
    sourceStartIndex: meta.sourceStartIndex,
    timeLimitMinutes: meta.timeLimitMinutes,
    timedOut: meta.timedOut,
    itemIds: meta.itemIds,
  });
  return writeTestPrepProgress(next);
}

function testPrepBuildProgressAnalytics(progress, packId) {
  const normalized = normalizeTestPrepProgress(progress);
  const requestedPackId = testPrepSlug(packId, '');
  const attempts = normalized.attempts.filter((attempt) => !requestedPackId || attempt.packId === requestedPackId);
  const byDomain = {};
  const bySkill = {};
  const confidenceSummary = testPrepNormalizeConfidenceSummary({});
  const itemCounts = {};
  const modeCounts = {};
  let scorePercentTotal = 0;
  attempts.forEach((attempt) => {
    scorePercentTotal += attempt.percent;
    modeCounts[attempt.mode] = (modeCounts[attempt.mode] || 0) + 1;
    Object.keys(attempt.byDomain).forEach((id) => {
      if (!byDomain[id]) byDomain[id] = { correct: 0, total: 0 };
      byDomain[id].correct += attempt.byDomain[id].correct;
      byDomain[id].total += attempt.byDomain[id].total;
    });
    Object.keys(attempt.bySkill).forEach((id) => {
      if (!bySkill[id]) bySkill[id] = { correct: 0, total: 0 };
      bySkill[id].correct += attempt.bySkill[id].correct;
      bySkill[id].total += attempt.bySkill[id].total;
    });
    Object.keys(confidenceSummary).forEach((rating) => {
      confidenceSummary[rating].correct += attempt.confidenceSummary[rating].correct;
      confidenceSummary[rating].total += attempt.confidenceSummary[rating].total;
      confidenceSummary[rating].percent = confidenceSummary[rating].total ? Math.round(confidenceSummary[rating].correct / confidenceSummary[rating].total * 100) : 0;
    });
    attempt.itemIds.forEach((id) => { itemCounts[id] = (itemCounts[id] || 0) + 1; });
  });
  const makeRows = (map) => Object.keys(map).map((id) => ({ id, correct: map[id].correct, total: map[id].total, percent: map[id].total ? Math.round(map[id].correct / map[id].total * 100) : 0 })).sort((left, right) => left.percent - right.percent || right.total - left.total || left.id.localeCompare(right.id));
  return {
    attemptCount: attempts.length,
    averagePercent: attempts.length ? Math.round(scorePercentTotal / attempts.length) : 0,
    byDomain,
    bySkill,
    domainRows: makeRows(byDomain),
    skillRows: makeRows(bySkill),
    confidenceSummary,
    modeCounts,
    uniqueItemsAttempted: Object.keys(itemCounts).length,
    repeatedItems: Object.values(itemCounts).filter((count) => count > 1).length,
    repeatedResponses: Object.values(itemCounts).reduce((sum, count) => sum + Math.max(0, count - 1), 0),
  };
}

registerTestPrepPack(WORKPLACE_SAFETY_DEMO);
function testPrepNormalizeSession(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const meta = testPrepAttemptMetadata(input);
  const answers = {};
  Object.keys(input.answers && typeof input.answers === 'object' && !Array.isArray(input.answers) ? input.answers : {}).slice(0, 500).forEach((id) => {
    const answer = Math.floor(testPrepFinite(input.answers[id], -1));
    if (answer >= 0 && answer <= 7) answers[testPrepSlug(id, '')] = answer;
  });
  const confidence = {};
  Object.keys(input.confidence && typeof input.confidence === 'object' && !Array.isArray(input.confidence) ? input.confidence : {}).slice(0, 500).forEach((id) => {
    if (['sure', 'unsure', 'guess'].includes(input.confidence[id])) confidence[testPrepSlug(id, '')] = input.confidence[id];
  });
  return {
    packId: testPrepSlug(input.packId, ''),
    mode: meta.mode,
    label: meta.label,
    targetSkillId: meta.targetSkillId,
    sourceStartIndex: meta.sourceStartIndex,
    timeLimitMinutes: meta.timeLimitMinutes,
    itemIds: meta.itemIds,
    questionIndex: Math.max(0, Math.floor(testPrepFinite(input.questionIndex, 0))),
    timeRemainingSeconds: Math.max(0, Math.floor(testPrepFinite(input.timeRemainingSeconds, 0))),
    answers,
    confidence,
    updatedAt: Math.max(0, Math.floor(testPrepFinite(input.updatedAt, 0))),
  };
}

function readTestPrepSession() {
  try {
    const session = testPrepNormalizeSession(JSON.parse(localStorage.getItem(TEST_PREP_SESSION_STORAGE_KEY) || '{}'));
    return session.packId && session.itemIds.length ? session : null;
  } catch (_) { return null; }
}

function writeTestPrepSession(session) {
  const normalized = testPrepNormalizeSession(session);
  try { localStorage.setItem(TEST_PREP_SESSION_STORAGE_KEY, JSON.stringify(normalized)); } catch (_) {}
  return normalized;
}

function clearTestPrepSession() {
  try { localStorage.removeItem(TEST_PREP_SESSION_STORAGE_KEY); } catch (_) {}
}

registerTestPrepPack(EPPP_PART_ONE_SCAFFOLD);
registerTestPrepPack(PARAPRO_PRACTICE_PACK);
registerTestPrepPack(SPECIAL_EDUCATION_5355_PRACTICE_PACK);

function TestPrepStatusBadge({ status }) {
  const styles = status === 'ready'
    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
    : status === 'planned'
      ? 'bg-violet-100 text-violet-900 border-violet-300'
      : 'bg-amber-100 text-amber-900 border-amber-300';
  const label = status === 'ready' ? 'Practice ready' : status === 'planned' ? 'Migration planned' : 'Researching';
  return <span className={'inline-flex rounded-full border px-2 py-1 text-xs font-bold ' + styles}>{label}</span>;
}

function TestPrepHub(props) {
  const { isOpen = true, onClose = (() => {}), callTTS, addToast } = props || {};
  const packs = listTestPrepPacks();
  const readyPack = packs.find((pack) => pack.status === 'ready') || packs[0];
  const [tab, setTab] = React.useState('explore');
  const [selectedPackId, setSelectedPackId] = React.useState(readyPack ? readyPack.id : '');
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [selectedChoice, setSelectedChoice] = React.useState(null);
  const [checked, setChecked] = React.useState(false);
  const [answers, setAnswers] = React.useState({});
  const [confidence, setConfidence] = React.useState({});
  const [result, setResult] = React.useState(null);
  const [checkpoint, setCheckpoint] = React.useState(null);
  const [practiceStarted, setPracticeStarted] = React.useState(true);
  const [practiceMode, setPracticeMode] = React.useState('standard');
  const [practiceLabel, setPracticeLabel] = React.useState('');
  const [activeItemIds, setActiveItemIds] = React.useState([]);
  const [sourceStartIndex, setSourceStartIndex] = React.useState(0);
  const [targetSkillId, setTargetSkillId] = React.useState('');
  const [timeRemainingSeconds, setTimeRemainingSeconds] = React.useState(0);
  const [savedSession, setSavedSession] = React.useState(readTestPrepSession);
  const [progress, setProgress] = React.useState(readTestPrepProgress);
  const [largeText, setLargeText] = React.useState(false);
  const [legacyOpen, setLegacyOpen] = React.useState(false);
  const [legacyAudit, setLegacyAudit] = React.useState(null);
  const [legacyAuditStatus, setLegacyAuditStatus] = React.useState('idle');
  const [legacyInventory, setLegacyInventory] = React.useState(null);
  const [legacyInventoryStatus, setLegacyInventoryStatus] = React.useState('idle');
  const [learningLibrary, setLearningLibrary] = React.useState(null);
  const [learningLibraryStatus, setLearningLibraryStatus] = React.useState('idle');
  const [librarySearch, setLibrarySearch] = React.useState('');
  const [libraryDomain, setLibraryDomain] = React.useState('all');
  const [libraryChapterId, setLibraryChapterId] = React.useState('');
  const [libraryMode, setLibraryMode] = React.useState('chapters');
  const [flashcardIndex, setFlashcardIndex] = React.useState(0);
  const [flashcardRevealed, setFlashcardRevealed] = React.useState(false);
  const [flashcardRatings, setFlashcardRatings] = React.useState({});
  const [memoryAidOpen, setMemoryAidOpen] = React.useState('');
  const dialogRef = React.useRef(null);
  const [chapterCheckAnswers, setChapterCheckAnswers] = React.useState({});
  const [chapterCheckRevealed, setChapterCheckRevealed] = React.useState({});
  const selectedPack = packs.find((pack) => pack.id === selectedPackId) || readyPack;
  const itemLookup = new Map((selectedPack ? selectedPack.items : []).map((item) => [item.id, item]));
  const practiceItems = selectedPack && activeItemIds.length ? activeItemIds.map((id) => itemLookup.get(id)).filter(Boolean) : (selectedPack ? selectedPack.items : []);
  const activeBatchSize = !selectedPack ? 100 : practiceMode === 'diagnostic' ? Math.max(1, practiceItems.length) : practiceMode === 'standard' ? selectedPack.batchSize : Math.max(selectedPack.batchSize, practiceItems.length + 1);
  const activePack = selectedPack ? Object.assign({}, selectedPack, { items: practiceItems, batchSize: activeBatchSize }) : null;
  const currentItem = practiceStarted && activePack && activePack.items[questionIndex];
  const currentBatch = activePack ? testPrepBatchMeta(activePack, questionIndex) : null;
  const progressAnalytics = testPrepBuildProgressAnalytics(progress, selectedPackId);
  const skillById = Object.fromEntries((learningLibrary && Array.isArray(learningLibrary.skills) ? learningLibrary.skills : []).map((skill) => [skill.id, skill]));
  const domainById = Object.fromEntries((selectedPack ? selectedPack.domains : []).map((domain) => [domain.id, domain]));

  React.useEffect(() => {
    const key = 'alloflow_test_prep_flashcards_' + (selectedPack ? selectedPack.id : 'none') + '_v1';
    try { setFlashcardRatings(JSON.parse(localStorage.getItem(key) || '{}') || {}); }
    catch (_) { setFlashcardRatings({}); }
  }, [selectedPackId]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const prior = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (dialogRef.current) dialogRef.current.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = oldOverflow;
      if (prior && typeof prior.focus === 'function') prior.focus();
    };
  }, [isOpen, onClose]);

  React.useEffect(() => {
    let cancelled = false;
    const auditUrl = selectedPack && selectedPack.legacyAuditUrl;
    setLegacyAudit(null);
    if (!auditUrl || typeof fetch !== 'function') { setLegacyAuditStatus('idle'); return undefined; }
    setLegacyAuditStatus('loading');
    fetch(auditUrl, { cache: 'no-store' })
      .then((response) => {
        if (!response || !response.ok) throw new Error('Audit report unavailable.');
        return response.json();
      })
      .then((report) => {
        if (cancelled || !report || report.schemaVersion !== 1 || !report.summary) return;
        setLegacyAudit(report);
        setLegacyAuditStatus('ready');
      })
      .catch(() => { if (!cancelled) setLegacyAuditStatus('unavailable'); });
    return () => { cancelled = true; };
  }, [selectedPack && selectedPack.legacyAuditUrl]);

  React.useEffect(() => {
    let cancelled = false;
    const inventoryUrl = selectedPack && selectedPack.legacyInventoryUrl;
    setLegacyInventory(null);
    if (!inventoryUrl || typeof fetch !== 'function') { setLegacyInventoryStatus('idle'); return undefined; }
    setLegacyInventoryStatus('loading');
    fetch(inventoryUrl, { cache: 'no-store' })
      .then((response) => {
        if (!response || !response.ok) throw new Error('Content inventory unavailable.');
        return response.json();
      })
      .then((report) => {
        if (cancelled || !report || report.schemaVersion !== 1 || !report.summary) return;
        setLegacyInventory(report);
        setLegacyInventoryStatus('ready');
      })
      .catch(() => { if (!cancelled) setLegacyInventoryStatus('unavailable'); });
    return () => { cancelled = true; };
  }, [selectedPack && selectedPack.legacyInventoryUrl]);

  React.useEffect(() => {
    let cancelled = false;
    const libraryUrl = selectedPack && selectedPack.learningLibraryUrl;
    setLearningLibrary(null);
    setLibraryChapterId('');
    setFlashcardIndex(0);
    setFlashcardRevealed(false);
    setMemoryAidOpen('');
    setChapterCheckAnswers({});
    setChapterCheckRevealed({});
    if (!libraryUrl || typeof fetch !== 'function') { setLearningLibraryStatus('idle'); return undefined; }
    setLearningLibraryStatus('loading');
    fetch(libraryUrl, { cache: 'no-store' })
      .then((response) => {
        if (!response || !response.ok) throw new Error('Learning library unavailable.');
        return response.json();
      })
      .then((catalog) => {
        if (cancelled || !catalog || catalog.schemaVersion !== 1 || !catalog.summary || !Array.isArray(catalog.chapters)) return;
        setLearningLibrary(catalog);
        setLearningLibraryStatus('ready');
      })
      .catch(() => { if (!cancelled) setLearningLibraryStatus('unavailable'); });
    return () => { cancelled = true; };
  }, [selectedPack && selectedPack.learningLibraryUrl]);

  React.useEffect(() => {
    if (!practiceStarted || !selectedPack || !activeItemIds.length || result || checkpoint) return;
    setSavedSession(writeTestPrepSession({
      packId: selectedPack.id,
      mode: practiceMode,
      label: practiceLabel,
      targetSkillId,
      sourceStartIndex,
      timeLimitMinutes: practiceMode === 'simulation' ? selectedPack.simulationTimeMinutes : 0,
      itemIds: activeItemIds,
      questionIndex,
      timeRemainingSeconds,
      answers,
      confidence,
      updatedAt: Date.now(),
    }));
  }, [practiceStarted, selectedPackId, practiceMode, practiceLabel, targetSkillId, sourceStartIndex, activeItemIds, questionIndex, timeRemainingSeconds, answers, confidence, result, checkpoint]);

  React.useEffect(() => {
    if (!practiceStarted || practiceMode !== 'simulation' || result || checkpoint || timeRemainingSeconds <= 0) return undefined;
    const timer = setInterval(() => setTimeRemainingSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [practiceStarted, practiceMode, result, checkpoint, timeRemainingSeconds > 0]);

  React.useEffect(() => {
    if (practiceStarted && practiceMode === 'simulation' && !result && !checkpoint && activeItemIds.length && timeRemainingSeconds === 0) finishPractice(true);
  }, [practiceStarted, practiceMode, result, checkpoint, activeItemIds.length, timeRemainingSeconds]);

  if (!isOpen) return null;

  function announce(message, type) {
    try { if (typeof addToast === 'function') addToast(message, type || 'info'); } catch (_) {}
  }

  function resetPracticeWorkspace() {
    setQuestionIndex(0);
    setSelectedChoice(null);
    setChecked(false);
    setAnswers({});
    setConfidence({});
    setResult(null);
    setCheckpoint(null);
  }

  function openPack(pack, nextTab) {
    setSelectedPackId(pack.id);
    resetPracticeWorkspace();
    setPracticeStarted(!pack.simulationItemCount);
    setPracticeMode('standard');
    setPracticeLabel('');
    setActiveItemIds([]);
    setSourceStartIndex(0);
    setTargetSkillId('');
    setTimeRemainingSeconds(0);
    setLegacyOpen(false);
    setTab(nextTab || 'practice');
  }

  function startPracticeSet(config) {
    if (!selectedPack) return;
    const input = config && typeof config === 'object' ? config : {};
    const items = Array.isArray(input.items) ? input.items.filter(Boolean) : [];
    if (!items.length) { announce('No questions are available for that practice set.', 'info'); return; }
    resetPracticeWorkspace();
    setPracticeMode(input.mode || 'standard');
    setPracticeLabel(input.label || 'Practice set');
    setActiveItemIds(items.map((item) => item.id));
    setSourceStartIndex(Math.max(0, Number(input.sourceStartIndex) || 0));
    setTargetSkillId(input.targetSkillId || '');
    setTimeRemainingSeconds(input.mode === 'simulation' ? Math.max(1, selectedPack.simulationTimeMinutes) * 60 : 0);
    setPracticeStarted(true);
    setTab('practice');
  }

  function startDiagnosticBatch(batchIndex) {
    if (!selectedPack) return;
    const safeBatch = Math.max(0, Math.floor(Number(batchIndex) || 0));
    const start = safeBatch * selectedPack.batchSize;
    startPracticeSet({
      mode: 'diagnostic',
      label: 'Diagnostic Batch ' + (safeBatch + 1),
      items: selectedPack.items.slice(start, start + selectedPack.batchSize),
      sourceStartIndex: start,
    });
  }

  function startTargetedPractice(skillId) {
    if (!selectedPack) return;
    const skill = skillById[skillId];
    const matching = selectedPack.items.filter((item) => item.skillIds.includes(skillId)).slice(0, 20);
    if (!matching.length) { announce('No questions are tagged to that skill yet.', 'info'); return; }
    startPracticeSet({
      mode: 'targeted',
      label: 'Targeted practice: ' + (skill ? skill.label : skillId.replace(/-/g, ' ')),
      items: matching,
      targetSkillId: skillId,
    });
  }

  function startTimedSimulation() {
    if (!selectedPack || !selectedPack.simulationItemCount || !selectedPack.simulationTimeMinutes) return;
    startPracticeSet({
      mode: 'simulation',
      label: 'Optional timed simulation',
      items: selectedPack.items.slice(0, selectedPack.simulationItemCount),
    });
  }

  function resumeSavedPractice() {
    if (!savedSession) return;
    const pack = packs.find((candidate) => candidate.id === savedSession.packId);
    if (!pack) { setSavedSession(null); clearTestPrepSession(); return; }
    const lookup = new Map(pack.items.map((item) => [item.id, item]));
    const ids = savedSession.itemIds.filter((id) => lookup.has(id));
    if (!ids.length) { setSavedSession(null); clearTestPrepSession(); return; }
    const safeIndex = Math.min(savedSession.questionIndex, ids.length - 1);
    const resumedAnswer = savedSession.answers[ids[safeIndex]];
    setSelectedPackId(pack.id);
    setPracticeMode(savedSession.mode);
    setPracticeLabel(savedSession.label);
    setActiveItemIds(ids);
    setSourceStartIndex(savedSession.sourceStartIndex);
    setTargetSkillId(savedSession.targetSkillId);
    setTimeRemainingSeconds(savedSession.timeRemainingSeconds);
    setQuestionIndex(safeIndex);
    setAnswers(savedSession.answers);
    setConfidence(savedSession.confidence);
    setSelectedChoice(resumedAnswer == null ? null : resumedAnswer);
    setChecked(resumedAnswer != null);
    setResult(null);
    setCheckpoint(null);
    setPracticeStarted(true);
    setLegacyOpen(false);
    setTab('practice');
    announce('Resumed ' + (savedSession.label || 'your saved practice set') + '.', 'success');
  }

  function practiceAttemptMetadata(timedOut) {
    return {
      mode: practiceMode,
      label: practiceLabel,
      targetSkillId,
      sourceStartIndex,
      timeLimitMinutes: practiceMode === 'simulation' && selectedPack ? selectedPack.simulationTimeMinutes : 0,
      timedOut: timedOut === true,
      itemIds: activePack ? activePack.items.map((item) => item.id) : [],
    };
  }

  function finishPractice(timedOut, answerOverride) {
    if (!activePack || !activePack.items.length || result) return;
    const finalAnswers = answerOverride && typeof answerOverride === 'object' ? answerOverride : answers;
    const score = scoreTestPrepAttempt(activePack, finalAnswers);
    const nextProgress = recordTestPrepAttempt(progress, activePack, finalAnswers, confidence, Date.now(), practiceAttemptMetadata(timedOut));
    setProgress(nextProgress);
    setResult(Object.assign({}, score, { timedOut: timedOut === true }));
    clearTestPrepSession();
    setSavedSession(null);
    announce(timedOut ? 'Time ended. Review the learning summary; this is not an official score.' : 'Practice set complete. This result is for learning, not an official score.', timedOut ? 'info' : 'success');
  }

  function chooseAnotherPracticeSet() {
    resetPracticeWorkspace();
    setPracticeStarted(false);
    setPracticeMode('standard');
    setPracticeLabel('');
    setActiveItemIds([]);
    setSourceStartIndex(0);
    setTargetSkillId('');
    setTimeRemainingSeconds(0);
  }

  function openSkillReview(skillId) {
    const skill = skillById[skillId];
    if (!skill) { setTab('library'); return; }
    setLibraryMode('chapters');
    setLibraryChapterId(skill.chapterId || '');
    setTab('library');
  }

  function formatPracticeTime(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    return Math.floor(safe / 60) + ':' + String(safe % 60).padStart(2, '0');
  }

  function readQuestion() {
    if (!currentItem) return;
    const text = currentItem.prompt + '. ' + currentItem.choices.map((choice, index) => String.fromCharCode(65 + index) + ', ' + choice).join('. ');
    try {
      if (typeof callTTS === 'function') { callTTS(text); return; }
      if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(text));
        return;
      }
    } catch (_) {}
    announce('Read-aloud is unavailable in this environment.', 'info');
  }

  function checkAnswer() {
    if (!currentItem || selectedChoice == null) return;
    setAnswers((previous) => Object.assign({}, previous, { [currentItem.id]: selectedChoice }));
    setChecked(true);
  }

  function advanceSimulation() {
    if (!currentItem || selectedChoice == null || !activePack) return;
    const finalAnswers = Object.assign({}, answers, { [currentItem.id]: selectedChoice });
    setAnswers(finalAnswers);
    if (questionIndex >= activePack.items.length - 1) {
      finishPractice(false, finalAnswers);
      return;
    }
    setQuestionIndex((value) => value + 1);
    setSelectedChoice(null);
    setChecked(false);
  }

  function advance() {
    if (!currentItem || !checked || !currentBatch || !activePack) return;
    const finalAnswers = Object.assign({}, answers, { [currentItem.id]: selectedChoice });
    setAnswers(finalAnswers);
    const reachedBatchEnd = questionIndex + 1 >= currentBatch.endIndex;
    if (activePack.items.length >= currentBatch.batchSize && reachedBatchEnd) {
      const diagnostic = testPrepBuildBatchDiagnostic(activePack, finalAnswers, confidence, currentBatch.batchNumber);
      const metadata = practiceAttemptMetadata(false);
      metadata.itemIds = activePack.items.slice(currentBatch.startIndex, currentBatch.endIndex).map((item) => item.id);
      const nextProgress = recordTestPrepBatchAttempt(progress, activePack, diagnostic, confidence, Date.now(), metadata);
      setProgress(nextProgress);
      setCheckpoint(Object.assign({}, diagnostic, { practiceLabel: practiceLabel || ('Batch ' + diagnostic.batchNumber) }));
      clearTestPrepSession();
      setSavedSession(null);
      announce((practiceLabel || ('Batch ' + diagnostic.batchNumber)) + ' complete. Review the diagnostic feedback before continuing.', 'success');
      return;
    }
    if (questionIndex >= activePack.items.length - 1) {
      finishPractice(false, finalAnswers);
      return;
    }
    setQuestionIndex((value) => value + 1);
    setSelectedChoice(null);
    setChecked(false);
  }

  function continueAfterCheckpoint() {
    if (!checkpoint || !activePack) return;
    if (checkpoint.isFinalBatch) {
      setResult(scoreTestPrepAttempt(activePack, answers));
      setCheckpoint(null);
      announce('Practice batch complete. This summary is for learning, not an official score.', 'success');
      return;
    }
    setQuestionIndex(checkpoint.endIndex);
    setSelectedChoice(null);
    setChecked(false);
    setCheckpoint(null);
  }

  function setItemConfidence(value) {
    if (!currentItem) return;
    setConfidence((previous) => Object.assign({}, previous, { [currentItem.id]: value }));
  }

  const packAttempts = progress.attempts.filter((attempt) => attempt.packId === selectedPackId);
  const totalAttempts = packAttempts.length;
  const latestAttempt = totalAttempts ? packAttempts[packAttempts.length - 1] : null;

  return (
    <div className="fixed inset-0 z-[290] flex items-center justify-center bg-slate-950/70 p-2 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="test-prep-title" className={'allo-docsuite flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-4 ring-indigo-300 ' + (largeText ? 'text-lg' : '')}>
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-900 px-4 py-4 text-white sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">{'\uD83E\uDDED'}</span>
              <div>
                <h2 id="test-prep-title" className="text-xl font-black sm:text-2xl">Test Prep Hub</h2>
                <p className="text-sm text-indigo-100">Accessible practice, transparent evidence, no pretend official scores.</p>
              </div>
            </div>
          </div>
          <button type="button" aria-pressed={largeText} onClick={() => setLargeText((value) => !value)} className="rounded-lg border border-indigo-200 bg-indigo-800 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-white">
            {largeText ? 'Standard text' : 'Larger text'}
          </button>
          <button type="button" onClick={onClose} aria-label="Close Test Prep Hub" className="rounded-lg border border-indigo-200 bg-indigo-800 px-3 py-2 text-lg font-black text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-white">{'\u2715'}</button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 pt-2" role="tablist" aria-label="Test Prep Hub sections">
          {[
            ['explore', 'Explore packs'],
            ['practice', 'Practice'],
            ['library', 'Learning library'],
            ['progress', 'Progress'],
          ].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={'whitespace-nowrap rounded-t-lg border-x border-t px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 ' + (tab === id ? 'border-indigo-300 bg-white text-indigo-900' : 'border-transparent text-slate-700 hover:bg-slate-100')}>
              {label}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          {tab === 'explore' && (
            <div className="mx-auto max-w-5xl space-y-8">
              <div>
                <h3 className="text-xl font-black text-slate-900">Exam packs</h3>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-700">A pack supplies the blueprint, domains, timing, original questions, rationales, references, and scoring rules. The hub supplies the accessible study experience.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {packs.map((pack) => (
                  <article key={pack.id} className="flex flex-col rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-indigo-700">Schema v{pack.schemaVersion} {'\u00B7'} pack v{pack.version}</p>
                        <h4 className="mt-1 text-lg font-black text-slate-900">{pack.title}</h4>
                      </div>
                      <TestPrepStatusBadge status={pack.status} />
                    </div>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">{pack.description}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-slate-100 p-2"><dt className="font-bold text-slate-700">Domains</dt><dd className="text-slate-900">{pack.domains.length}</dd></div>
                      <div className="rounded-lg bg-slate-100 p-2"><dt className="font-bold text-slate-700">Practice items</dt><dd className="text-slate-900">{pack.items.length}</dd></div>
                    </dl>
                    <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs leading-relaxed text-amber-950">{pack.disclaimer}</p>
                    <button type="button" onClick={() => openPack(pack, 'practice')} className="mt-4 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-black text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">
                      {pack.status === 'ready' ? 'Open practice pack' : 'View migration plan'}
                    </button>
                  </article>
                ))}
              </div>

              <section aria-labelledby="research-lanes-title">
                <h3 id="research-lanes-title" className="text-xl font-black text-slate-900">Vocational research lanes</h3>
                <p className="mt-1 text-sm text-slate-700">These are discovery lanes, not announced products. Each needs a public blueprint, clean content rights, and qualified reviewers.</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {TEST_PREP_RESEARCH_LANES.map((lane) => (
                    <article key={lane.id} className="rounded-2xl border border-slate-300 bg-white p-4">
                      <span className="text-3xl" aria-hidden="true">{lane.icon}</span>
                      <h4 className="mt-2 font-black text-slate-900">{lane.title}</h4>
                      <p className="mt-1 text-sm font-semibold text-indigo-800">{lane.examples}</p>
                      <p className="mt-3 text-sm text-slate-700">{lane.opportunity}</p>
                      <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs leading-relaxed text-rose-950"><strong>Guardrail:</strong> {lane.guardrail}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === 'practice' && selectedPack && (
            <div className="mx-auto max-w-6xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-700">Selected pack</p>
                  <h3 className="text-xl font-black text-slate-900">{selectedPack.title}</h3>
                </div>
                <button type="button" onClick={() => { setLegacyOpen(false); setTab('explore'); }} className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600">Change pack</button>
              </div>

              {selectedPack.contentReview && (
                <section className="mb-4 rounded-lg border border-violet-300 bg-violet-50 px-3 py-3 text-violet-950" aria-labelledby="content-review-title">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p id="content-review-title" className="text-sm font-bold">Evidence status: {selectedPack.contentReview}</p>
                    {selectedPack.nativeQaUrl && <a href={selectedPack.nativeQaUrl.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open source-review report</a>}
                  </div>
                  {selectedPack.legacyUrl && (
                    <div className="mt-3 grid gap-2 border-t border-violet-200 pt-3 text-xs leading-relaxed sm:grid-cols-3">
                      <p><strong>Legacy source lead</strong><br />A topic lead from the old app. Its original wording and key are not automatically accepted.</p>
                      <p><strong>Source reviewed</strong><br />The practice item has named answer support, one best answer, reviewed distractors, clue checks, a rationale, and traceable provenance.</p>
                      <p><strong>Independent expert review pending</strong><br />A separate review by a qualified psychology and assessment professional has not yet been completed.</p>
                    </div>
                  )}
                </section>
              )}

              {selectedPack.legacyUrl && (
                <section className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3" aria-labelledby="legacy-audit-title">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-3xl text-sm text-amber-950"><strong>Complete legacy workspace:</strong> includes the existing lessons, quizzes, flashcards, games, and practice tools. Its item bank and score/adaptive heuristics still await expert validation.</p>
                    <button type="button" onClick={() => setLegacyOpen((value) => !value)} className="rounded-lg bg-violet-800 px-4 py-2 text-sm font-black text-white hover:bg-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2">{legacyOpen ? 'Return to native pilot' : 'Open complete legacy workspace'}</button>
                  </div>
                  <div className="mt-3 border-t border-amber-300 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 id="legacy-audit-title" className="font-black text-amber-950">Legacy-bank migration audit</h4>
                      {selectedPack.legacyAuditUrl && <a href={selectedPack.legacyAuditUrl.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open full audit report</a>}
                    </div>
                    {legacyAudit && legacyAudit.summary ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
                        <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyAudit.summary.totalItems || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-700">learner-visible questions</p></div>
                        <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyAudit.summary.referenceCoveragePercent || 0)}%</p><p className="text-xs font-bold text-slate-700">with attached references</p></div>
                        <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyAudit.summary.duplicateGroups || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-700">duplicate prompt groups</p></div>
                        <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{legacyAudit.summary.dominantAnswerIndex == null ? '—' : String.fromCharCode(65 + Number(legacyAudit.summary.dominantAnswerIndex)) + ' · ' + Number(legacyAudit.summary.dominantAnswerPercent || 0) + '%'}</p><p className="text-xs font-bold text-slate-700">dominant answer position</p></div>
                        <p className="sm:col-span-2 lg:col-span-4 text-xs leading-relaxed text-amber-950"><strong>Automated triage:</strong> {Number(legacyAudit.summary.blocker || 0)} structural blockers, {Number(legacyAudit.summary.high || 0).toLocaleString()} high-priority reviews, {Number(legacyAudit.summary.medium || 0).toLocaleString()} medium-priority reviews, and {Number(legacyAudit.summary.routine || 0).toLocaleString()} routine reviews. Flags identify review work; they do not establish that an answer is factually wrong.</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-amber-900" aria-live="polite">{legacyAuditStatus === 'loading' ? 'Loading the latest audit snapshot…' : legacyAuditStatus === 'unavailable' ? 'The audit snapshot is unavailable in this preview; the legacy review warning still applies.' : 'Audit snapshot will appear when the report is available.'}</p>
                    )}
                  </div>
                  <div className="mt-3 border-t border-amber-300 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-black text-amber-950">Legacy learning-library inventory</h4>
                      <div className="flex flex-wrap gap-3">{selectedPack.legacyInventoryUrl && <a href={selectedPack.legacyInventoryUrl.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open content inventory</a>}{selectedPack.legacyReviewLedgerUrl && <a href={selectedPack.legacyReviewLedgerUrl.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open full review ledger</a>}{selectedPack.curation1000Url && <a href={selectedPack.curation1000Url.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open 1,000-question curation record</a>}{selectedPack.expansionAuditUrl && <a href={selectedPack.expansionAuditUrl} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open 500-item expansion audit</a>}{selectedPack.curation500Url && <a href={selectedPack.curation500Url.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open historical 500-question curation record</a>}</div>
                    </div>
                    {legacyInventory && legacyInventory.summary ? (
                      <div className="mt-3" aria-live="polite">
                        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                          <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyInventory.summary.textbookChapters || 0)}</p><p className="text-xs font-bold text-slate-700">chapters</p></div>
                          <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyInventory.summary.diagramTemplates || 0)}</p><p className="text-xs font-bold text-slate-700">diagram templates</p></div>
                          <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyInventory.summary.flashcards || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-700">flashcards</p></div>
                          <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyInventory.summary.memoryAids || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-700">memory aids</p></div>
                          <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyInventory.summary.termDefinitions || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-700">term definitions</p></div>
                          <div className="rounded-lg bg-white p-3"><p className="text-xl font-black text-slate-900">{Number(legacyInventory.summary.knowledgeChecks || 0)}</p><p className="text-xs font-bold text-slate-700">knowledge checks</p></div>
                        </div>
                        <div className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-800">
                          <div className="flex items-center justify-between gap-2"><strong>Full-bank review program</strong><span>{Number(legacyInventory.summary.legacyReviewPassedQuestions || 0).toLocaleString()} / {Number(legacyInventory.summary.nativeTargetQuestions || 2933).toLocaleString()} legacy items</span></div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><div className="h-full bg-violet-700" style={{ width: Math.min(100, Math.round(Number(legacyInventory.summary.legacyReviewPassedQuestions || 0) / Math.max(1, Number(legacyInventory.summary.nativeTargetQuestions || 2933)) * 1000) / 10) + '%' }} /></div>
                          <p className="mt-2">{Number(legacyInventory.summary.legacyReviewPassedQuestions || 0).toLocaleString()} legacy-source items have completed the current source-and-content review; {Number(legacyInventory.summary.nativeOriginalQaQuestions || 0).toLocaleString()} additional questions were authored natively. All 2,933 legacy questions are in the review universe, not automatically approved. Items enter the native bank only after source, accuracy, ambiguity, distractor, clue, duplication, cultural/accessibility, rationale, and provenance review; production validation remains a separate independent-expert step. Practice sets should follow blueprint weights rather than the uneven legacy distribution.</p>
                        </div>
                      </div>
                    ) : <p className="mt-2 text-xs text-amber-900" aria-live="polite">{legacyInventoryStatus === 'loading' ? 'Loading the learning-library inventory…' : 'The inventory report is unavailable in this preview.'}</p>}
                  </div>
                </section>
              )}

              {legacyOpen && selectedPack.legacyUrl && (
                <section className="overflow-hidden rounded-2xl border border-violet-300 bg-white shadow-sm">
                  <h4 className="sr-only">Pass the EPPP legacy workspace</h4>
                  <iframe title="Pass the EPPP legacy workspace" src={selectedPack.legacyUrl} className="h-[68vh] min-h-[560px] w-full border-0" sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads" />
                </section>
              )}

              {!legacyOpen && !selectedPack.items.length && (
                <section className="rounded-2xl border border-violet-300 bg-white p-6 shadow-sm">
                  <TestPrepStatusBadge status={selectedPack.status} />
                  <h4 className="mt-4 text-lg font-black text-slate-900">Content migration has not started</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">The pack blueprint is present, but the existing question bank will not be imported until every item can carry provenance, review status, stable identifiers, and clue-quality checks.</p>
                  <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-800">
                    <li>Inventory and deduplicate source questions.</li>
                    <li>Separate official blueprint metadata from independently authored content.</li>
                    <li>Run answer-length, ambiguity, citation, and outdated-guidance checks.</li>
                    <li>Require qualified human review before a pack is marked ready.</li>
                  </ol>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {selectedPack.domains.map((domain) => <div key={domain.id} className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-950">{domain.label} {domain.weight ? '(' + Math.round(domain.weight * 100) + '%)' : ''}</div>)}
                  </div>
                </section>
              )}

              {!legacyOpen && !!selectedPack.items.length && !practiceStarted && (
                <section className="rounded-2xl border border-indigo-300 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="practice-options-title">
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-700">Choose a study mode</p>
                  <h4 id="practice-options-title" className="mt-1 text-2xl font-black text-slate-900">What would you like to work on?</h4>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">The two 100-item diagnostic batches provide answer feedback and a skill-by-skill checkpoint. Targeted sets contain up to 20 tagged questions. The timed simulation is optional and clearly separated from official scoring.</p>

                  {savedSession && savedSession.packId === selectedPack.id && (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                      <div><p className="font-black text-emerald-950">Resume saved practice</p><p className="text-sm text-emerald-900">{savedSession.label || 'Saved set'} ? question {Math.min(savedSession.questionIndex + 1, savedSession.itemIds.length)} of {savedSession.itemIds.length}</p></div>
                      <button type="button" onClick={resumeSavedPractice} className="rounded-lg bg-emerald-700 px-4 py-2 font-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2">Resume</button>
                    </div>
                  )}

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {Array.from({ length: Math.ceil(selectedPack.items.length / selectedPack.batchSize) }, (_, batchIndex) => {
                      const count = Math.min(selectedPack.batchSize, selectedPack.items.length - batchIndex * selectedPack.batchSize);
                      return <article key={'diagnostic-' + batchIndex} className="rounded-xl border border-sky-300 bg-sky-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-sky-800">Diagnostic batch {batchIndex + 1}</p><h5 className="mt-1 text-lg font-black text-slate-900">{count} questions with feedback</h5><p className="mt-2 text-sm text-slate-700">Untimed practice with rationales, confidence calibration, domain diagnostics, and recommended chapters.</p><button type="button" onClick={() => startDiagnosticBatch(batchIndex)} className="mt-4 rounded-lg bg-sky-800 px-4 py-2 font-black text-white focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2">Start Batch {batchIndex + 1}</button></article>;
                    })}
                    <article className="rounded-xl border border-violet-300 bg-violet-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-violet-800">Targeted practice</p>
                      <h5 className="mt-1 text-lg font-black text-slate-900">Practice one skill</h5>
                      <label className="mt-3 block text-sm font-bold text-slate-800">Skill<select value={targetSkillId} onChange={(event) => setTargetSkillId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-violet-600"><option value="">Choose a skill</option>{(learningLibrary && Array.isArray(learningLibrary.skills) ? learningLibrary.skills : []).map((skill) => <option key={skill.id} value={skill.id}>{skill.domain}: {skill.label}</option>)}</select></label>
                      <button type="button" disabled={!targetSkillId} onClick={() => startTargetedPractice(targetSkillId)} className="mt-4 rounded-lg bg-violet-800 px-4 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2">Start targeted set</button>
                    </article>
                    {!!selectedPack.simulationItemCount && !!selectedPack.simulationTimeMinutes && (
                      <article className="rounded-xl border border-amber-400 bg-amber-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-amber-900">Optional timed simulation</p>
                        <h5 className="mt-1 text-lg font-black text-slate-900">{selectedPack.simulationItemCount} questions / {selectedPack.simulationTimeMinutes} minutes</h5>
                        <p className="mt-2 text-sm leading-relaxed text-amber-950">This mode hides answer feedback until the set ends and treats unanswered items as incorrect. It is independent practice, not an official test form, scaled score, or pass prediction.</p>
                        <button type="button" onClick={startTimedSimulation} className="mt-4 rounded-lg bg-amber-800 px-4 py-2 font-black text-white focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2">Start timed simulation</button>
                      </article>
                    )}
                  </div>
                </section>
              )}

              {!legacyOpen && !!selectedPack.items.length && checkpoint && (
                <section className="rounded-2xl border border-sky-300 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="batch-checkpoint-title" aria-live="polite">
                  <p className="text-xs font-black uppercase tracking-wider text-sky-800">Questions {checkpoint.firstQuestion}–{checkpoint.lastQuestion}</p>
                  <h4 id="batch-checkpoint-title" className="mt-1 text-2xl font-black text-slate-900">{checkpoint.practiceLabel && !/^Batch \d+$/i.test(checkpoint.practiceLabel) ? checkpoint.practiceLabel : ('Batch ' + checkpoint.batchNumber + ' of ' + checkpoint.batchCount)} checkpoint</h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-sky-50 p-4"><p className="text-3xl font-black text-sky-950">{checkpoint.correct}/{checkpoint.total}</p><p className="text-sm font-bold text-sky-900">Correct in this batch</p></div>
                    <div className="rounded-xl bg-indigo-50 p-4"><p className="text-3xl font-black text-indigo-950">{checkpoint.percent}%</p><p className="text-sm font-bold text-indigo-900">Batch accuracy</p></div>
                    <div className="rounded-xl bg-amber-50 p-4"><p className="text-3xl font-black text-amber-950">{checkpoint.confidentMissQuestionNumbers.length}</p><p className="text-sm font-bold text-amber-900">Confident misses</p></div>
                  </div>
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">This checkpoint describes practice in this batch. It is not an official score, pass prediction, or readiness classification.</p>
                  <div className="mt-5 overflow-hidden rounded-xl border border-slate-300">
                    <table className="w-full text-left text-sm">
                      <caption className="bg-slate-100 px-4 py-3 text-left font-black text-slate-900">Domain diagnostic for this batch</caption>
                      <thead className="bg-slate-50 text-slate-700"><tr><th scope="col" className="px-4 py-2">Domain</th><th scope="col" className="px-4 py-2">Correct</th><th scope="col" className="px-4 py-2">Accuracy</th></tr></thead>
                      <tbody className="divide-y divide-slate-200">{checkpoint.domainRows.map((entry) => <tr key={entry.id}><th scope="row" className="px-4 py-2 font-semibold text-slate-900">{entry.label}</th><td className="px-4 py-2 text-slate-800">{entry.correct}/{entry.total}</td><td className="px-4 py-2 font-bold text-slate-900">{entry.percent}%</td></tr>)}</tbody>
                    </table>
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                      <h5 className="font-black text-slate-900">Confidence calibration</h5>
                      <ul className="mt-2 space-y-1 text-sm text-slate-800">
                        <li><strong>Knew it:</strong> {checkpoint.confidenceSummary.sure.correct}/{checkpoint.confidenceSummary.sure.total} correct</li>
                        <li><strong>Unsure:</strong> {checkpoint.confidenceSummary.unsure.correct}/{checkpoint.confidenceSummary.unsure.total} correct</li>
                        <li><strong>Guessed:</strong> {checkpoint.confidenceSummary.guess.correct}/{checkpoint.confidenceSummary.guess.total} correct</li>
                        <li><strong>Unrated:</strong> {checkpoint.confidenceSummary.unrated.total}</li>
                      </ul>
                    </div>
                    <div className="rounded-xl border border-violet-300 bg-violet-50 p-4">
                      <h5 className="font-black text-violet-950">What to do next</h5>
                      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-violet-950">{checkpoint.feedback.map((message) => <li key={message}>{message}</li>)}</ul>
                    </div>
                  </div>
                  {!!checkpoint.focusSkillIds.length && learningLibrary && (
                    <section className="mt-5 rounded-xl border border-indigo-300 bg-indigo-50 p-4" aria-labelledby="recommended-review-title">
                      <h5 id="recommended-review-title" className="font-black text-indigo-950">Recommended review from this diagnostic</h5>
                      <p className="mt-1 text-sm text-indigo-900">These suggestions point to the lowest-accuracy tagged skills in this batch; they are study priorities, not readiness classifications.</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {checkpoint.focusSkillIds.map((skillId) => {
                          const skill = skillById[skillId];
                          const row = checkpoint.skillRows.find((entry) => entry.id === skillId);
                          return <article key={skillId} className="rounded-lg border border-indigo-200 bg-white p-3"><p className="font-black text-slate-900">{skill ? skill.label : skillId.replace(/-/g, ' ')}</p>{row && <p className="mt-1 text-xs font-bold text-slate-600">{row.correct}/{row.total} correct ? {row.percent}% in this batch</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => openSkillReview(skillId)} className="rounded-lg border border-indigo-500 bg-indigo-50 px-3 py-2 text-sm font-black text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-600">Review chapter</button><button type="button" onClick={() => startTargetedPractice(skillId)} className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-600">Practice this skill</button></div></article>;
                        })}
                      </div>
                    </section>
                  )}
                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    {selectedPack.learningLibraryUrl && <button type="button" onClick={() => setTab('library')} className="rounded-xl border border-slate-400 bg-white px-5 py-3 font-black text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600">Review learning library</button>}
                    <button type="button" onClick={continueAfterCheckpoint} className="rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">{checkpoint.isFinalBatch ? 'View overall summary' : 'Continue to batch ' + (checkpoint.batchNumber + 1)}</button>
                  </div>
                </section>
              )}

              {!legacyOpen && !!selectedPack.items.length && result && (
                <section className="rounded-2xl border border-emerald-300 bg-white p-6 text-center shadow-sm" aria-live="polite">
                  <p className="text-sm font-black uppercase tracking-wider text-emerald-800">{practiceLabel || 'Practice complete'}</p>
                  <p className="mt-2 text-5xl font-black text-slate-900">{result.correct}/{result.total}</p>
                  <p className="mt-2 text-lg font-bold text-slate-800">{result.percent}% correct in this practice set</p>
                  {result.timedOut && <p className="mx-auto mt-3 max-w-xl rounded-lg bg-sky-50 p-3 text-sm font-bold text-sky-950">The timer ended before the set was submitted. Unanswered questions are included as incorrect in this practice summary.</p>}
                  <p className="mx-auto mt-3 max-w-xl rounded-lg bg-amber-50 p-3 text-sm text-amber-950">This is a learning result, not an official score, scaled score, pass prediction, certification, license, or evidence of professional competence.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button type="button" onClick={selectedPack.simulationItemCount ? chooseAnotherPracticeSet : () => openPack(selectedPack, 'practice')} className="rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">{selectedPack.simulationItemCount ? 'Choose another practice set' : 'Practice again'}</button>
                    <button type="button" onClick={() => setTab('progress')} className="rounded-xl border border-slate-400 bg-white px-5 py-3 font-black text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600">View progress</button>
                  </div>
                </section>
              )}

              {!legacyOpen && !!selectedPack.items.length && !result && currentItem && (
                <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-xs font-black uppercase tracking-wide text-indigo-700">{practiceLabel || 'Practice set'}</p><p className="font-black text-indigo-900">Question {questionIndex + 1} of {activePack.items.length}</p>{currentBatch && currentBatch.batchCount > 1 && <p className="mt-1 text-sm font-bold text-slate-700">Batch {currentBatch.batchNumber} of {currentBatch.batchCount} · Question {currentBatch.position} of {currentBatch.itemCount}</p>}{practiceMode === 'simulation' && <p className="mt-1 text-lg font-black text-amber-900" role="timer">Time remaining {formatPracticeTime(timeRemainingSeconds)}</p>}</div>
                    <button type="button" onClick={readQuestion} className="rounded-lg border border-indigo-400 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-900 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-600">{'\uD83D\uDD0A'} Read question</button>
                    {selectedPack.simulationItemCount && <button type="button" onClick={chooseAnotherPracticeSet} className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600">Practice options</button>}
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><div className="h-full bg-indigo-700" style={{ width: Math.round((questionIndex + 1) / Math.max(1, activePack.items.length) * 100) + '%' }} /></div>
                  <fieldset className="mt-6" disabled={checked}>
                    <legend className="text-lg font-black leading-relaxed text-slate-900">{currentItem.prompt}</legend>
                    <div className="mt-4 space-y-3">
                      {currentItem.choices.map((choice, index) => {
                        const inputId = 'test-prep-choice-' + currentItem.id + '-' + index;
                        const correctChoice = checked && index === currentItem.answerIndex;
                        const incorrectChoice = checked && index === selectedChoice && index !== currentItem.answerIndex;
                        return (
                          <label key={inputId} htmlFor={inputId} className={'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 text-sm font-semibold focus-within:ring-2 focus-within:ring-indigo-600 ' + (correctChoice ? 'border-emerald-600 bg-emerald-50 text-emerald-950' : incorrectChoice ? 'border-rose-600 bg-rose-50 text-rose-950' : selectedChoice === index ? 'border-indigo-600 bg-indigo-50 text-indigo-950' : 'border-slate-300 bg-white text-slate-900 hover:border-indigo-400')}>
                            <input id={inputId} type="radio" name={'answer-' + currentItem.id} checked={selectedChoice === index} onChange={() => setSelectedChoice(index)} className="mt-0.5 h-4 w-4 accent-indigo-700" />
                            <span><span className="mr-2 font-black">{String.fromCharCode(65 + index)}.</span>{choice}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {checked && practiceMode !== 'simulation' && (
                    <div className={'mt-5 rounded-xl border p-4 ' + (selectedChoice === currentItem.answerIndex ? 'border-emerald-400 bg-emerald-50' : 'border-amber-400 bg-amber-50')} role="status" aria-live="polite">
                      <p className="font-black text-slate-900">{selectedChoice === currentItem.answerIndex ? 'Correct' : 'Not yet - review the reasoning'}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-800">{currentItem.rationale}</p>
                      {currentItem.choiceRationales.length === currentItem.choices.length && (
                        <div className="mt-3 rounded-lg border border-slate-300 bg-white/70 p-3 text-sm text-slate-800">
                          <p className="font-black text-slate-900">Why the other options do not fit</p>
                          <ul className="mt-2 space-y-3">
                            {currentItem.choices.map((choice, index) => index === currentItem.answerIndex ? null : (
                              <li key={currentItem.id + '-rationale-' + index}>
                                <p className="font-bold">{String.fromCharCode(65 + index)}. {choice}</p>
                                <p className="mt-0.5 leading-relaxed">{currentItem.choiceRationales[index]}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {!!currentItem.references.length && (
                        <div className="mt-3 rounded-lg border border-slate-300 bg-white/70 p-3 text-xs text-slate-700">
                          <p className="font-black uppercase tracking-wide text-slate-800">Answer sources</p>
                          <ul className="mt-2 space-y-3">
                            {currentItem.references.map((reference) => {
                              const source = (currentItem.sourceDetails || []).find((detail) => detail.url === reference) || testPrepDescribeReference(reference);
                              return <li key={reference}><a href={reference} target="_blank" rel="noreferrer" className="font-semibold text-indigo-800 underline">{source.title}</a><p className="mt-1 leading-relaxed"><strong>Why this source is credible:</strong> {source.credibility}</p></li>;
                            })}
                          </ul>
                        </div>
                      )}
                      {currentItem.legacySourceId && (
                        <p className="mt-3 rounded-lg border border-violet-300 bg-violet-50 p-3 text-xs text-violet-950"><strong>Migration provenance:</strong> this native question was re-authored and source-reviewed using legacy source item <code>{currentItem.legacySourceId}</code> in <code>{currentItem.legacySourceFile}</code>. The original wording was not promoted automatically.</p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">How certain were you?</span>
                        {['sure', 'unsure', 'guess'].map((value) => (
                          <button key={value} type="button" aria-pressed={confidence[currentItem.id] === value} onClick={() => setItemConfidence(value)} className={'rounded-full border px-3 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 ' + (confidence[currentItem.id] === value ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-400 bg-white text-slate-800 hover:bg-slate-100')}>{value === 'sure' ? 'I knew it' : value === 'unsure' ? 'I was unsure' : 'I guessed'}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    {practiceMode === 'simulation' ? (
                      <button type="button" disabled={selectedChoice == null} onClick={advanceSimulation} className="rounded-xl bg-amber-800 px-5 py-3 font-black text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2">{questionIndex >= activePack.items.length - 1 ? 'Submit timed simulation' : 'Save answer and continue'}</button>
                    ) : !checked ? (
                      <button type="button" disabled={selectedChoice == null} onClick={checkAnswer} className="rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Check answer</button>
                    ) : (
                      <button type="button" onClick={advance} className="rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">{currentBatch && activePack.items.length >= currentBatch.batchSize && questionIndex + 1 >= currentBatch.endIndex ? 'View diagnostic feedback' : questionIndex >= activePack.items.length - 1 ? 'Finish practice' : 'Next question'}</button>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === 'library' && selectedPack && (
            <div className="mx-auto max-w-6xl space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-700">Native learning catalog</p>
                  <h3 className="text-xl font-black text-slate-900">{(learningLibrary && learningLibrary.title) || selectedPack.shortTitle + ' learning library'}</h3>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-700">{learningLibrary ? learningLibrary.description : 'Loading chapters, study cards, and memory aids for this pack.'}</p>
                  {learningLibrary && <p className="mt-1 text-xs font-bold text-emerald-800">{learningLibrary.summary.sourceReviewedChapters || 0} source reviewed · {(learningLibrary.summary.chapters || 0) - (learningLibrary.summary.sourceReviewedChapters || 0)} review required · independent expert validation pending</p>}
                </div>
                {libraryChapterId && <button type="button" onClick={() => setLibraryChapterId('')} className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600">Back to chapter catalog</button>}
              </div>

              <nav className="flex flex-wrap gap-2" aria-label="Learning library modes">
                {[['chapters', 'Chapters'], ['flashcards', 'Flashcards'], ['memory-aids', 'Memory aids']].map(([id, label]) => <button key={id} type="button" aria-pressed={libraryMode === id} onClick={() => { setLibraryMode(id); setLibraryChapterId(''); setFlashcardRevealed(false); setMemoryAidOpen(''); }} className={'rounded-lg border px-4 py-2 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-600 ' + (libraryMode === id ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-400 bg-white text-slate-800')}>{label}</button>)}
              </nav>

              {learningLibraryStatus === 'loading' && <p className="rounded-xl border border-indigo-200 bg-white p-5 text-sm font-bold text-indigo-900" role="status">Loading the learning library…</p>}
              {learningLibraryStatus === 'unavailable' && <p className="rounded-xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-950" role="alert">The learning catalog is unavailable in this preview. Practice questions remain available from the Practice tab.</p>}

              {learningLibrary && !libraryChapterId && libraryMode === 'chapters' && (() => {
                const domains = Array.from(new Set(learningLibrary.chapters.map((chapter) => chapter.domain))).sort();
                const query = librarySearch.trim().toLowerCase();
                const visible = learningLibrary.chapters.filter((chapter) => (libraryDomain === 'all' || chapter.domain === libraryDomain) && (!query || (chapter.title + ' ' + chapter.domain + ' ' + chapter.sections.map((section) => section.heading).join(' ')).toLowerCase().includes(query)));
                return <>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Learning library inventory">
                    {[['Chapters', learningLibrary.summary.chapters], ['Sections', learningLibrary.summary.sections], ['Knowledge checks', learningLibrary.summary.knowledgeChecks], ['Skills', (learningLibrary.skills || []).length], ['Flashcards', learningLibrary.summary.flashcards], ['Memory aids', learningLibrary.summary.memoryAids]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-2xl font-black text-slate-900">{Number(value || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-600">{label}</p></div>)}
                  </div>
                  <div className="grid gap-3 rounded-xl border border-slate-300 bg-white p-4 sm:grid-cols-[1fr_260px]">
                    <label className="text-sm font-bold text-slate-800">Search chapters and section headings<input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} type="search" className="mt-1 w-full rounded-lg border border-slate-400 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-indigo-600" placeholder="Try evidence, fractions, revision…" /></label>
                    <label className="text-sm font-bold text-slate-800">Domain<select value={libraryDomain} onChange={(event) => setLibraryDomain(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-indigo-600"><option value="all">All domains</option>{domains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}</select></label>
                  </div>
                  <p className="text-sm font-bold text-slate-700" role="status">Showing {visible.length} of {learningLibrary.chapters.length} chapters</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {visible.map((chapter) => <article key={chapter.id} className="flex flex-col rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-indigo-700">Chapter {learningLibrary.chapters.indexOf(chapter) + 1} · {chapter.domain}</p><h4 className="mt-1 text-lg font-black text-slate-900">{chapter.title}</h4></div><span className={'rounded-full border px-2 py-1 text-xs font-black ' + (chapter.reviewStatus === 'source-reviewed-editorial-pass' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900')}>{chapter.reviewStatus === 'source-reviewed-editorial-pass' ? 'Source reviewed' : 'Review required'}</span></div>
                      <p className="mt-3 flex-1 text-sm text-slate-700">{chapter.sectionCount} sections · {chapter.knowledgeCheckCount} knowledge checks · {chapter.referenceCount} references</p>
                      <button type="button" onClick={() => setLibraryChapterId(chapter.id)} className="mt-4 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-black text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Open chapter workspace</button>
                    </article>)}
                  </div>
                  {!visible.length && <p className="rounded-xl border border-slate-300 bg-white p-6 text-center text-sm text-slate-700">No chapters match those filters.</p>}
                </>;
              })()}

              {learningLibrary && libraryMode === 'flashcards' && (() => {
                const query = librarySearch.trim().toLowerCase();
                const cards = learningLibrary.flashcards.filter((card) => (libraryDomain === 'all' || card.domain === libraryDomain) && (!query || (card.front + ' ' + card.back + ' ' + card.domain).toLowerCase().includes(query)));
                const safeIndex = cards.length ? Math.min(flashcardIndex, cards.length - 1) : 0;
                const card = cards[safeIndex];
                const known = cards.filter((item) => flashcardRatings[item.id] === 'know').length;
                const rate = (rating) => {
                  if (!card) return;
                  const next = Object.assign({}, flashcardRatings, { [card.id]: rating });
                  setFlashcardRatings(next);
                  try { localStorage.setItem('alloflow_test_prep_flashcards_' + selectedPack.id + '_v1', JSON.stringify(next)); } catch (_) {}
                  setFlashcardRevealed(false);
                  if (cards.length) setFlashcardIndex((safeIndex + 1) % cards.length);
                };
                return <section className="space-y-4" aria-labelledby="flashcard-study-title">
                  <div><h4 id="flashcard-study-title" className="text-lg font-black text-slate-900">Flashcard study</h4><p className="text-sm text-slate-700">Reveal each answer, then mark whether you know it or want to study it again. Ratings stay in this browser and are separate for each test pack.</p><p className="mt-1 text-xs font-bold text-emerald-800">{learningLibrary.summary.sourceReviewedFlashcards || 0} source reviewed</p></div>
                  <div className="grid gap-3 rounded-xl border border-slate-300 bg-white p-4 sm:grid-cols-[1fr_260px]">
                    <label className="text-sm font-bold text-slate-800">Search cards<input value={librarySearch} onChange={(event) => { setLibrarySearch(event.target.value); setFlashcardIndex(0); setFlashcardRevealed(false); }} type="search" className="mt-1 w-full rounded-lg border border-slate-400 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-indigo-600" /></label>
                    <label className="text-sm font-bold text-slate-800">Domain<select value={libraryDomain} onChange={(event) => { setLibraryDomain(event.target.value); setFlashcardIndex(0); setFlashcardRevealed(false); }} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-indigo-600"><option value="all">All domains</option>{Array.from(new Set(learningLibrary.flashcards.map((item) => item.domain))).sort().map((domain) => <option key={domain} value={domain}>{domain}</option>)}</select></label>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-slate-700"><span>{cards.length ? safeIndex + 1 : 0} of {cards.length} matching cards</span><span>{known} marked “Know” in this view</span></div>
                  {card ? <article className="rounded-2xl border border-indigo-300 bg-white p-6 text-center shadow-sm" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-center gap-2"><span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-black text-indigo-900">{card.domain}</span><span className={'rounded-full border px-2 py-1 text-xs font-black ' + (card.reviewStatus === 'source-reviewed-editorial-pass' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900')}>{card.reviewStatus === 'source-reviewed-editorial-pass' ? 'Source reviewed' : 'Review required'}</span></div>
                    <p className="mx-auto mt-6 max-w-3xl text-xl font-black leading-relaxed text-slate-900">{card.front}</p>
                    {flashcardRevealed ? <div className="mx-auto mt-6 max-w-3xl rounded-xl bg-emerald-50 p-5 text-left text-base leading-relaxed text-emerald-950"><strong>Answer:</strong> {card.back}</div> : <button type="button" onClick={() => setFlashcardRevealed(true)} className="mt-6 rounded-xl bg-indigo-700 px-6 py-3 font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Reveal answer</button>}
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      <button type="button" onClick={() => { setFlashcardIndex((safeIndex - 1 + cards.length) % cards.length); setFlashcardRevealed(false); }} className="rounded-lg border border-slate-400 bg-white px-4 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600">Previous</button>
                      {flashcardRevealed && <><button type="button" onClick={() => rate('again')} className="rounded-lg border border-rose-400 bg-rose-50 px-4 py-2 font-black text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-600">Study again</button><button type="button" onClick={() => rate('know')} className="rounded-lg bg-emerald-700 px-4 py-2 font-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-600">Know it</button></>}
                      <button type="button" onClick={() => { setFlashcardIndex((safeIndex + 1) % cards.length); setFlashcardRevealed(false); }} className="rounded-lg border border-slate-400 bg-white px-4 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600">Next</button>
                    </div>
                  </article> : <p className="rounded-xl border border-slate-300 bg-white p-6 text-center text-sm text-slate-700">No flashcards match those filters.</p>}
                </section>;
              })()}

              {learningLibrary && libraryMode === 'memory-aids' && (() => {
                const query = librarySearch.trim().toLowerCase();
                const aids = learningLibrary.memoryAids.filter((aid) => (libraryDomain === 'all' || aid.domain === libraryDomain) && (!query || (aid.title + ' ' + aid.content + ' ' + aid.tags.join(' ')).toLowerCase().includes(query)));
                return <section className="space-y-4" aria-labelledby="memory-aids-title">
                  <div><h4 id="memory-aids-title" className="text-lg font-black text-slate-900">Memory-aid library</h4><p className="text-sm text-slate-700">Use these retrieval cues after learning the underlying concept. They support recall but do not replace worked reasoning, current guidance, or classroom judgment.</p><p className="mt-1 text-xs font-bold text-emerald-800">{learningLibrary.summary.sourceReviewedMemoryAids || 0} source reviewed · {learningLibrary.summary.editorialReviewedSourcePendingMemoryAids || 0} editorial pass/source pending</p></div>
                  <div className="grid gap-3 rounded-xl border border-slate-300 bg-white p-4 sm:grid-cols-[1fr_260px]">
                    <label className="text-sm font-bold text-slate-800">Search titles, content, and tags<input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} type="search" className="mt-1 w-full rounded-lg border border-slate-400 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-indigo-600" /></label>
                    <label className="text-sm font-bold text-slate-800">Domain<select value={libraryDomain} onChange={(event) => setLibraryDomain(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-indigo-600"><option value="all">All domains</option>{Array.from(new Set(learningLibrary.memoryAids.map((item) => item.domain))).sort().map((domain) => <option key={domain} value={domain}>{domain}</option>)}</select></label>
                  </div>
                  <p className="text-sm font-bold text-slate-700" role="status">Showing {aids.length} of {learningLibrary.memoryAids.length} memory aids</p>
                  <div className="grid gap-3 md:grid-cols-2">{aids.map((aid) => { const open = memoryAidOpen === aid.id; return <article key={aid.id} className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-indigo-700">{aid.domain} · {aid.type}</p><h5 className="mt-1 font-black text-slate-900">{aid.title}</h5></div><span className={'rounded-full border px-2 py-1 text-xs font-black ' + (aid.reviewStatus === 'source-reviewed-editorial-pass' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : aid.reviewStatus === 'editorial-reviewed-source-pending' ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-amber-300 bg-amber-50 text-amber-900')}>{aid.reviewStatus === 'source-reviewed-editorial-pass' ? 'Source reviewed' : aid.reviewStatus === 'editorial-reviewed-source-pending' ? 'Editorial pass · source pending' : 'Review required'}</span></div><button type="button" aria-expanded={open} onClick={() => setMemoryAidOpen(open ? '' : aid.id)} className="mt-3 rounded-lg border border-indigo-400 bg-indigo-50 px-3 py-2 text-sm font-black text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-600">{open ? 'Hide aid' : 'Show aid'}</button>{open && <><p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">{aid.content}</p><div className="mt-3 flex flex-wrap gap-1">{aid.tags.slice(0, 10).map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{tag}</span>)}</div></>}</article>; })}</div>
                  {!aids.length && <p className="rounded-xl border border-slate-300 bg-white p-6 text-center text-sm text-slate-700">No memory aids match those filters.</p>}
                </section>;
              })()}

              {learningLibrary && libraryChapterId && !selectedPack.legacyUrl && (() => {
                const chapter = learningLibrary.chapters.find((entry) => entry.id === libraryChapterId);
                if (!chapter) return <p className="rounded-xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-950">That chapter could not be found.</p>;
                const targetedCount = selectedPack.items.filter((item) => item.skillIds.includes(chapter.skillId)).length;
                return <article className="space-y-6 rounded-2xl border border-indigo-300 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="native-chapter-title">
                  <header className="border-b border-slate-200 pb-5">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-indigo-700">{chapter.domain} {'\u00B7'} Source-reviewed independent study chapter</p><h4 id="native-chapter-title" className="mt-1 text-2xl font-black text-slate-900">{chapter.title}</h4></div><span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900">Source reviewed</span></div>
                    <p className="mt-3 max-w-4xl leading-relaxed text-slate-700">{chapter.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-3">{targetedCount > 0 && <button type="button" onClick={() => startTargetedPractice(chapter.skillId)} className="rounded-lg bg-indigo-700 px-4 py-2 font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Practice this skill ({Math.min(20, targetedCount)} questions)</button>}<button type="button" onClick={() => { setLibraryMode('flashcards'); setLibraryChapterId(''); setLibraryDomain(chapter.domain); setFlashcardIndex(0); }} className="rounded-lg border border-slate-400 bg-white px-4 py-2 font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600">Study flashcards</button></div>
                  </header>

                  <section aria-labelledby="chapter-objectives-title"><h5 id="chapter-objectives-title" className="text-lg font-black text-slate-900">Learning objectives</h5><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-800">{chapter.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></section>

                  <section className="space-y-4" aria-labelledby="chapter-lessons-title">
                    <h5 id="chapter-lessons-title" className="text-lg font-black text-slate-900">Chapter lessons</h5>
                    {chapter.sections.map((section, index) => <section key={section.id} className="rounded-xl border border-slate-300 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-indigo-700">Lesson {index + 1}</p><h6 className="mt-1 text-base font-black text-slate-900">{section.heading}</h6><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-800">{section.content}</p>{section.keyTerms.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{section.keyTerms.map((term) => <span key={term} className="rounded-full border border-indigo-200 bg-white px-2 py-1 text-xs font-bold text-indigo-900">{term}</span>)}</div>}</section>)}
                  </section>

                  <section className="space-y-4" aria-labelledby="chapter-checks-title">
                    <div><h5 id="chapter-checks-title" className="text-lg font-black text-slate-900">Knowledge checks</h5><p className="mt-1 text-sm text-slate-700">Answer each question, check the response, and use the rationale to correct or strengthen your reasoning.</p></div>
                    {chapter.knowledgeChecks.map((check, checkIndex) => {
                      const selected = chapterCheckAnswers[check.id];
                      const revealed = chapterCheckRevealed[check.id] === true;
                      return <fieldset key={check.id} disabled={revealed} className="rounded-xl border border-slate-300 p-4"><legend className="px-1 font-black text-slate-900">Check {checkIndex + 1}: {check.prompt}</legend><div className="mt-3 space-y-2">{check.choices.map((choice, choiceIndex) => { const inputId = check.id + '-choice-' + choiceIndex; const correct = revealed && choiceIndex === check.answerIndex; const missed = revealed && choiceIndex === selected && choiceIndex !== check.answerIndex; return <label key={inputId} htmlFor={inputId} className={'flex items-start gap-2 rounded-lg border p-3 text-sm focus-within:ring-2 focus-within:ring-indigo-600 ' + (correct ? 'border-emerald-500 bg-emerald-50 text-emerald-950' : missed ? 'border-rose-500 bg-rose-50 text-rose-950' : selected === choiceIndex ? 'border-indigo-500 bg-indigo-50 text-indigo-950' : 'border-slate-300 bg-white text-slate-900')}><input id={inputId} type="radio" name={check.id} checked={selected === choiceIndex} onChange={() => setChapterCheckAnswers((previous) => Object.assign({}, previous, { [check.id]: choiceIndex }))} className="mt-0.5 h-4 w-4 accent-indigo-700" /><span><strong>{String.fromCharCode(65 + choiceIndex)}.</strong> {choice}</span></label>; })}</div>{!revealed ? <button type="button" disabled={selected == null} onClick={() => setChapterCheckRevealed((previous) => Object.assign({}, previous, { [check.id]: true }))} className="mt-3 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-600">Check answer</button> : <div className={'mt-3 rounded-lg border p-3 text-sm ' + (selected === check.answerIndex ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950')} role="status"><p className="font-black">{selected === check.answerIndex ? 'Correct' : 'Review the reasoning'}</p><p className="mt-1 leading-relaxed">{check.rationale}</p></div>}</fieldset>;
                    })}
                  </section>

                  <section className="rounded-xl border border-slate-300 bg-slate-50 p-4" aria-labelledby="chapter-sources-title"><h5 id="chapter-sources-title" className="font-black text-slate-900">Sources and review status</h5><p className="mt-1 text-sm leading-relaxed text-slate-700">{chapter.reviewNote}</p><ul className="mt-3 space-y-2 text-sm">{chapter.references.map((reference) => { const source = testPrepDescribeReference(reference); return <li key={reference}><a href={reference} target="_blank" rel="noreferrer" className="font-bold text-indigo-800 underline">{source.title}</a></li>; })}</ul></section>
                </article>;
              })()}

              {learningLibrary && libraryChapterId && selectedPack.legacyUrl && (
                <section className="overflow-hidden rounded-2xl border border-violet-300 bg-white shadow-sm">
                  <h4 className="sr-only">Selected EPPP chapter workspace</h4>
                  <iframe title="Selected EPPP chapter workspace" src={selectedPack.legacyUrl + '&page=textbook#' + encodeURIComponent(libraryChapterId)} className="h-[68vh] min-h-[560px] w-full border-0" sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads" />
                </section>
              )}
            </div>
          )}

          {tab === 'progress' && (
            <div className="mx-auto max-w-6xl space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><h3 className="text-xl font-black text-slate-900">Practice progress</h3><p className="mt-1 text-sm text-slate-700">Stored only in this browser. Results describe practice activity, not credential readiness, an official score, or a pass prediction.</p></div>
                <label className="text-sm font-bold text-slate-800">Test pack<select value={selectedPackId} onChange={(event) => setSelectedPackId(event.target.value)} className="mt-1 block rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-indigo-600">{packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.shortTitle}</option>)}</select></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-300 bg-white p-5"><p className="text-3xl font-black text-indigo-900">{totalAttempts}</p><p className="text-sm font-bold text-slate-700">Completed sets</p></div>
                <div className="rounded-2xl border border-slate-300 bg-white p-5"><p className="text-3xl font-black text-indigo-900">{totalAttempts ? progressAnalytics.averagePercent + '%' : '\u2014'}</p><p className="text-sm font-bold text-slate-700">Average practice accuracy</p></div>
                <div className="rounded-2xl border border-slate-300 bg-white p-5"><p className="text-3xl font-black text-indigo-900">{progressAnalytics.uniqueItemsAttempted}</p><p className="text-sm font-bold text-slate-700">Unique questions attempted</p></div>
                <div className="rounded-2xl border border-slate-300 bg-white p-5"><p className="text-3xl font-black text-indigo-900">{progressAnalytics.repeatedResponses}</p><p className="text-sm font-bold text-slate-700">Repeated question responses</p></div>
              </div>
              {totalAttempts > 0 && (
                <>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white"><h4 className="border-b border-slate-200 px-5 py-3 font-black text-slate-900">Accuracy by domain</h4><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-700"><tr><th className="px-4 py-2" scope="col">Domain</th><th className="px-4 py-2" scope="col">Correct</th><th className="px-4 py-2" scope="col">Accuracy</th></tr></thead><tbody className="divide-y divide-slate-200">{progressAnalytics.domainRows.map((row) => <tr key={row.id}><th className="px-4 py-2 font-semibold text-slate-900" scope="row">{domainById[row.id] ? domainById[row.id].label : row.id.replace(/-/g, ' ')}</th><td className="px-4 py-2">{row.correct}/{row.total}</td><td className="px-4 py-2 font-black">{row.percent}%</td></tr>)}</tbody></table></div></section>
                    <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white"><h4 className="border-b border-slate-200 px-5 py-3 font-black text-slate-900">Accuracy by skill</h4><div className="max-h-80 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-slate-700"><tr><th className="px-4 py-2" scope="col">Skill</th><th className="px-4 py-2" scope="col">Correct</th><th className="px-4 py-2" scope="col">Accuracy</th></tr></thead><tbody className="divide-y divide-slate-200">{progressAnalytics.skillRows.map((row) => <tr key={row.id}><th className="px-4 py-2 font-semibold text-slate-900" scope="row">{skillById[row.id] ? skillById[row.id].label : row.id.replace(/-/g, ' ')}</th><td className="px-4 py-2">{row.correct}/{row.total}</td><td className="px-4 py-2 font-black">{row.percent}%</td></tr>)}</tbody></table></div></section>
                  </div>
                  <section className="rounded-2xl border border-slate-300 bg-white p-5" aria-labelledby="confidence-progress-title"><h4 id="confidence-progress-title" className="font-black text-slate-900">Confidence calibration</h4><p className="mt-1 text-sm text-slate-700">Compare certainty with accuracy. Confident misses are useful signals to revisit reasoning; low-confidence correct answers are good retrieval-practice targets.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['sure', 'Knew it'], ['unsure', 'Unsure'], ['guess', 'Guessed'], ['unrated', 'Unrated']].map(([id, label]) => { const row = progressAnalytics.confidenceSummary[id]; return <div key={id} className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black text-indigo-900">{row.correct}/{row.total}</p><p className="text-sm font-bold text-slate-700">{label} · {row.percent}% correct</p></div>; })}</div><p className="mt-3 text-xs font-bold text-slate-600">{progressAnalytics.repeatedItems} unique question{progressAnalytics.repeatedItems === 1 ? '' : 's'} attempted more than once · {Object.keys(progressAnalytics.modeCounts).map((mode) => mode + ': ' + progressAnalytics.modeCounts[mode]).join(' · ')}</p></section>
                </>
              )}
              {!totalAttempts ? (
                <div className="rounded-2xl border border-dashed border-slate-400 bg-white p-8 text-center">
                  <p className="font-black text-slate-900">No practice history yet</p>
                  <p className="mt-2 text-sm text-slate-700">Complete a practice set in {selectedPack ? selectedPack.shortTitle : 'this pack'} to see domain, skill, confidence, and repeated-attempt patterns.</p>
                  <button type="button" onClick={() => selectedPack && openPack(selectedPack, 'practice')} className="mt-4 rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Open practice</button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
                  <h4 className="border-b border-slate-200 px-5 py-3 font-black text-slate-900">Recent practice</h4>
                  <ul className="divide-y divide-slate-200">
                    {packAttempts.slice().reverse().slice(0, 10).map((attempt) => {
                      const pack = packs.find((candidate) => candidate.id === attempt.packId);
                      return <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-bold text-slate-900">{attempt.label || (pack ? pack.shortTitle : attempt.packId)}{attempt.timedOut ? ' · time ended' : ''}</p><p className="text-xs text-slate-600">{attempt.mode.replace(/-/g, ' ')} · {attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : 'Date unavailable'}</p></div><p className="font-black text-indigo-900">{attempt.correct}/{attempt.total} {'\u00B7'} {attempt.percent}%</p></li>;
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </main>
      </section>
    </div>
  );
}

