/* AlloFlow Test Prep Hub - reusable exam-pack workspace */

const TEST_PREP_SCHEMA_VERSION = 1;
const TEST_PREP_STORAGE_KEY = 'alloflow_test_prep_progress_v1';
const TEST_PREP_REVIEW_STORAGE_KEY = 'alloflow_test_prep_review_items_v1';
const TEST_PREP_ANNOTATIONS_STORAGE_KEY = 'alloflow_test_prep_annotations_v1';
const TEST_PREP_STUDY_PLANS_STORAGE_KEY = 'alloflow_test_prep_study_plans_v1';
const TEST_PREP_ITEM_TYPES = ['single-choice'];
const TEST_PREP_SESSION_STORAGE_KEY = 'alloflow_test_prep_session_v1';
const TEST_PREP_PACK_STATUSES = ['ready', 'preview', 'planned', 'research'];
const TEST_PREP_CDN_BASE = 'https://alloflow-cdn.pages.dev/';
const TEST_PREP_GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/Apomera/AlloFlow/main/';

function testPrepNormalizeRepoAssetUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.includes('..')) return '';
  if (/^\.?\/test_prep\/[a-zA-Z0-9_./?=&-]+$/.test(raw)) return raw;
  try {
    const parsed = new URL(raw);
    const isCloudflare = parsed.origin === 'https://alloflow-cdn.pages.dev' && parsed.pathname.startsWith('/test_prep/');
    const isGitHubRaw = parsed.origin === 'https://raw.githubusercontent.com' && parsed.pathname.startsWith('/Apomera/AlloFlow/main/test_prep/');
    if (isCloudflare || isGitHubRaw) return raw;
  } catch (_) {}
  return '';
}

function testPrepRepoAssetPath(value) {
  const safeUrl = testPrepNormalizeRepoAssetUrl(value);
  if (!safeUrl) return '';
  if (!/^https?:\/\//i.test(safeUrl)) return safeUrl.replace(/^\.\//, '').split(/[?#]/)[0];
  try {
    const parsed = new URL(safeUrl);
    if (parsed.origin === 'https://raw.githubusercontent.com') return parsed.pathname.replace(/^\/Apomera\/AlloFlow\/main\//, '');
    return parsed.pathname.replace(/^\/+/, '');
  } catch (_) {
    return '';
  }
}

function testPrepRepoAssetCandidates(value) {
  const path = testPrepRepoAssetPath(value);
  if (!path) return [];
  return [
    TEST_PREP_CDN_BASE + path,
    TEST_PREP_GITHUB_RAW_BASE + path,
    './' + path,
  ].filter((candidate, index, candidates) => candidates.indexOf(candidate) === index);
}

async function testPrepFetchRepoJson(value, validate) {
  const candidates = testPrepRepoAssetCandidates(value);
  let lastError = new Error('No trusted AlloFlow repository asset URL was provided.');
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { cache: 'no-store' });
      if (!response || !response.ok) throw new Error('HTTP ' + (response && response.status ? response.status : 'unavailable'));
      const payload = await response.json();
      if (typeof validate === 'function' && !validate(payload)) throw new Error('Unexpected JSON schema');
      return payload;
    } catch (error) {
      lastError = error;
      try { console.warn('[TestPrepHub] Repository asset unavailable from ' + candidate + ':', error && error.message); } catch (_) {}
    }
  }
  throw lastError;
}

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
  description: 'Fifteen hundred source-reviewed practice items across all eight Part 1 domains, organized into fifteen balanced 100-question banks with feedback after each bank.',
  credentialOwner: 'Association of State and Provincial Psychology Boards',
  version: '3.1.0',
  status: 'ready',
  accent: 'violet',
  contentReview: '1,500 source-reviewed practice items; independent expert review pending',
  legacyUrl: 'https://alloflow-cdn.pages.dev/test_prep/eppp_legacy/index.html?embedded=1',
  nativeQaUrl: 'https://alloflow-cdn.pages.dev/test_prep/eppp_native_qa.json',
  learningLibraryUrl: 'https://alloflow-cdn.pages.dev/test_prep/eppp_learning_library.json',
  learningLibraryQaUrl: 'https://alloflow-cdn.pages.dev/test_prep/eppp_learning_library_qa.json',
  blueprintLabel: 'EPPP Part 1-Knowledge current blueprint (2026-2027)',
  blueprintEffective: 'Current Part 1 blueprint used during 2026 and 2027 administrations',
  officialBlueprintUrl: 'https://asppb.net/exams/asppb-examination-for-professional-psychology-eppp/eppp-exam-topics/',
  transitionNotice: 'ASPPB plans an integrated six-domain EPPP for the fourth quarter of 2027. This pack follows the current eight-domain Part 1-Knowledge blueprint and is not an integrated-EPPP pack.',
  transitionUrl: 'https://asppb.net/future-eppp-content-areas-2027/',
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
  items: testPrepArrangeBalancedBatches(EPPP_NATIVE_ITEMS, ['biological', 'cognitive-affective', 'social-cultural', 'lifespan', 'assessment', 'intervention', 'research', 'professional'], 15),
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
  if (typeof TEST_PREP_REFERENCE_CATALOG !== 'undefined' && TEST_PREP_REFERENCE_CATALOG[reference]) return TEST_PREP_REFERENCE_CATALOG[reference];
  if (TEST_PREP_REFERENCE_DETAILS[reference]) return TEST_PREP_REFERENCE_DETAILS[reference];
  try {
    const url = new URL(reference, window.location.href);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (hostname === 'doi.org') {
      const doi = decodeURIComponent(url.pathname.replace(/^\//, ''));
      return {
        title: 'Digital Object Identifier record — ' + doi,
        organization: 'DOI Foundation record',
        summary: 'This DOI preserves a link to a scholarly publication. Open the record to review the article or book title, scope, findings, and limitations.',
        credibility: 'A DOI is a persistent identifier that makes the cited scholarly work and its publisher metadata traceable. A DOI is not a quality rating; the publication and study methods still determine evidentiary strength.',
      };
    }
    const organization = TEST_PREP_REFERENCE_ORGANIZATIONS[hostname];
    const pageLabel = testPrepReferencePageLabel(url);
    if (organization) return { title: pageLabel + ' — ' + organization[0], organization: organization[0], summary: 'This resource addresses ' + pageLabel.toLowerCase() + ' and provides source context for the answer explanation.', credibility: organization[1] };
    return {
      title: pageLabel + ' — ' + hostname,
      organization: hostname,
      summary: 'This linked resource provides source context for the related answer explanation. Open it to review the complete content, scope, and limitations.',
      credibility: 'This link identifies the publishing organization and preserves a traceable source record. Its relevance, authorship, evidence, and publication process should be evaluated for the specific claim.',
    };
  } catch (_error) {
    return {
      title: reference,
      organization: '',
      summary: 'This citation is retained as supporting context for the answer explanation. Verify the complete publication record before relying on it.',
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
      organization: String(value.organization || '').trim().slice(0, 300),
      summary: String(value.summary || value.relevance || '').trim().slice(0, 1600),
      credibility: String(value.credibility || '').trim().slice(0, 1600),
    };
  }).filter((detail) => references.includes(detail.url) && detail.title && detail.credibility);
  return {
    id: testPrepSlug(input.id, 'item-' + (index + 1)),
    templateVersion: Math.max(1, Math.floor(testPrepFinite(input.templateVersion, 1))),
    type: TEST_PREP_ITEM_TYPES.includes(input.type) ? input.type : 'single-choice',
    domainId: domainIds.includes(requestedDomain) ? requestedDomain : (domainIds[0] || 'general'),
    difficulty: String(input.difficulty || 'unrated').trim().slice(0, 40),
    competencyTag: String(input.competencyTag || input.blueprintCompetency || '').trim().slice(0, 40),
    competencyLabel: String(input.competencyLabel || input.blueprintCompetencyLabel || '').trim().slice(0, 600),
    futureBlueprintAlignment: String(input.futureBlueprintAlignment || '').trim().slice(0, 120),
    officialItem: input.officialItem === true,
    learningObjectiveId: testPrepSlug(input.learningObjectiveId, ''),
    cognitiveProcess: String(input.cognitiveProcess || '').trim().slice(0, 60),
    skillIds: (Array.isArray(input.skillIds) ? input.skillIds : []).slice(0, 4).map((value) => testPrepSlug(value, '')).filter(Boolean),
    chapterIds: (Array.isArray(input.chapterIds) ? input.chapterIds : []).slice(0, 4).map((value) => testPrepSlug(value, '')).filter(Boolean),
    prompt: String(input.prompt || input.q || '').trim().slice(0, 3000),
    choices,
    choiceRationales,
    answerIndex,
    rationale: String(input.rationale || '').trim().slice(0, 4000),
    references,
    sourceDetails,
    reviewStatus: String(input.reviewStatus || 'unreviewed').trim().slice(0, 100),
    legacySourceId: /^legacy-[a-f0-9]{16}$/.test(String(input.legacySourceId || '').trim()) ? String(input.legacySourceId).trim() : '',
    legacySourceFile: /^js\/[a-zA-Z0-9_.-]+\.js$/.test(String(input.legacySourceFile || '').trim()) ? String(input.legacySourceFile).trim() : '',
    authoredSourceId: String(input.authoredSourceId || '').trim().slice(0, 100),
    expansionBatch: String(input.expansionBatch || '').trim().slice(0, 100),
    sourceItemId: String(input.sourceItemId || '').trim().slice(0, 120),
    taskForm: String(input.taskForm || '').trim().slice(0, 80),
    expansionStatus: String(input.expansionStatus || '').trim().slice(0, 100),
    assistantReviewStatus: String(input.assistantReviewStatus || '').trim().slice(0, 100),
    examItemStatus: String(input.examItemStatus || '').trim().slice(0, 100),
    sourceAnswerIndex: input.sourceAnswerIndex == null ? null : Math.max(0, Math.min(3, Math.floor(testPrepFinite(input.sourceAnswerIndex, 0)))),
    answerDerivation: String(input.answerDerivation || '').trim().slice(0, 160),
    authorship: String(input.authorship || '').trim().slice(0, 120),
    editorialReviewer: String(input.editorialReviewer || '').trim().slice(0, 120),
    assistantReviewedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(input.assistantReviewedAt || '').trim()) ? String(input.assistantReviewedAt).trim() : '',
    reviewMethod: String(input.reviewMethod || '').trim().slice(0, 180),
    sourceReviewBasis: String(input.sourceReviewBasis || '').trim().slice(0, 100),
    domainAlignmentStatus: String(input.domainAlignmentStatus || '').trim().slice(0, 100),
    clueReviewStatus: String(input.clueReviewStatus || '').trim().slice(0, 100),
    biasAccessibilityStatus: String(input.biasAccessibilityStatus || '').trim().slice(0, 100),
    migrationStatus: String(input.migrationStatus || '').trim().slice(0, 60),
    qaStatus: ['qa-passed', 'qa-passed-independent-practice-item', 'structural-qa-passed-guided-practice-only'].includes(input.qaStatus) ? input.qaStatus : 'review-required',
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
    kind: section && section.kind === 'guided-review' ? 'guided-review' : section && section.kind === 'source-diagnostic' ? 'source-diagnostic' : section && section.kind === 'independent-diagnostic' ? 'independent-diagnostic' : 'practice',
    timeMinutes: section && section.timeMinutes != null ? Math.max(1, Math.round(testPrepFinite(section.timeMinutes, 1))) : null,
  }));
  const items = (Array.isArray(input.items) ? input.items : []).slice(0, 10000)
    .map((item, index) => normalizeTestPrepItem(item, index, domainIds));
  const officialSubtests = (Array.isArray(input.officialSubtests) ? input.officialSubtests : []).slice(0, 12).map((subtest, index) => {
    const entry = subtest && typeof subtest === 'object' && !Array.isArray(subtest) ? subtest : {};
    const normalized = {
      code: String(entry.code || index + 1).trim().slice(0, 20),
      label: String(entry.label || 'Subtest ' + (index + 1)).trim().slice(0, 120),
      questions: Math.max(0, Math.min(500, Math.round(testPrepFinite(entry.questions, 0)))),
      timeMinutes: Math.max(0, Math.min(600, Math.round(testPrepFinite(entry.timeMinutes, 0)))),
    };
    const essayCount = Math.max(0, Math.min(20, Math.round(testPrepFinite(entry.essayCount, 0))));
    if (essayCount) {
      normalized.essayCount = essayCount;
      normalized.essayMinutesEach = Math.max(0, Math.min(180, Math.round(testPrepFinite(entry.essayMinutesEach, 0))));
    }
    return normalized;
  });
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
    contentReview: String(input.contentReview || '').trim().slice(0, 800),
    bankDisclosure: String(input.bankDisclosure || '').trim().slice(0, 800),
    diagnosticBatchCount: Math.max(0, Math.min(20, Math.round(testPrepFinite(input.diagnosticBatchCount, 0)))),
    diagnosticBatchCountSemantics: String(input.diagnosticBatchCountSemantics || '').trim().slice(0, 100),
    sourceDiagnosticBatchCount: Math.max(0, Math.min(20, Math.round(testPrepFinite(input.sourceDiagnosticBatchCount, 0)))),
    assistantAuthoredIndependentBatchCount: Math.max(0, Math.min(20, Math.round(testPrepFinite(input.assistantAuthoredIndependentBatchCount, 0)))),
    independentDiagnosticBatchCount: Math.max(0, Math.min(20, Math.round(testPrepFinite(input.independentDiagnosticBatchCount, input.sourceDiagnosticBatchCount || 0)))),
    guidedReviewBatchCount: Math.max(0, Math.min(20, Math.round(testPrepFinite(input.guidedReviewBatchCount, 0)))),
    learningActivityBankCount: Math.max(0, Math.min(20, Math.round(testPrepFinite(input.learningActivityBankCount, 0)))),
    sourceQuestionItems: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.sourceQuestionItems, 200)))),
    assistantAuthoredIndependentItems: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.assistantAuthoredIndependentItems, 0)))),
    independentPracticeItems: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.independentPracticeItems, input.sourceQuestionItems || 200)))),
    guidedReviewItems: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.guidedReviewItems, 0)))),
    distinctSourceContentKernels: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.distinctSourceContentKernels, 0)))),
    parallelSourceVariants: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.parallelSourceVariants, 0)))),
    distinctIndependentContentKernels: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.distinctIndependentContentKernels, input.distinctSourceContentKernels || 0)))),
    parallelIndependentVariants: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.parallelIndependentVariants, input.parallelSourceVariants || 0)))),
    newIndependentItemsNeeded: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.newIndependentItemsNeeded, 0)))),
    expansionVersion: String(input.expansionVersion || '').trim().slice(0, 100),
    assistantReviewVerdict: String(input.assistantReview && input.assistantReview.verdict || '').trim().slice(0, 100),
    assistantReview: input.assistantReview && typeof input.assistantReview === 'object' && !Array.isArray(input.assistantReview) ? {
      reviewer: String(input.assistantReview.reviewer || '').trim().slice(0, 120),
      structurallyReviewedItems: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.assistantReview.structurallyReviewedItems, 0)))),
      sourceItems: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.assistantReview.sourceItems, 0)))),
      assistantAuthoredIndependentItems: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.assistantReview.assistantAuthoredIndependentItems, 0)))),
      independentPracticeItems: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.assistantReview.independentPracticeItems, input.assistantReview.sourceItems || 0)))),
      distinctSourceContentKernels: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.assistantReview.distinctSourceContentKernels, 0)))),
      parallelSourceVariants: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.assistantReview.parallelSourceVariants, 0)))),
      distinctIndependentContentKernels: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.assistantReview.distinctIndependentContentKernels, input.assistantReview.distinctSourceContentKernels || 0)))),
      parallelIndependentVariants: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.assistantReview.parallelIndependentVariants, input.assistantReview.parallelSourceVariants || 0)))),
      guidedReviewItems: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.assistantReview.guidedReviewItems, 0)))),
      independentQuestionTarget: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.assistantReview.independentQuestionTarget, 0)))),
      newIndependentItemsNeeded: Math.max(0, Math.min(10000, Math.round(testPrepFinite(input.assistantReview.newIndependentItemsNeeded, 0)))),
      verdict: String(input.assistantReview.verdict || '').trim().slice(0, 100),
      categories: (Array.isArray(input.assistantReview.categories) ? input.assistantReview.categories : []).slice(0, 20).map(value => String(value || '').trim().slice(0, 100)).filter(Boolean),
      taskForms: (Array.isArray(input.assistantReview.taskForms) ? input.assistantReview.taskForms : []).slice(0, 10).map(value => String(value || '').trim().slice(0, 100)).filter(Boolean),
      limitation: String(input.assistantReview.limitation || '').trim().slice(0, 800),
    } : null,
    batchSize: Math.max(1, Math.min(500, Math.round(testPrepFinite(input.batchSize, 100)))),
    simulationItemCount: Math.max(0, Math.min(500, Math.round(testPrepFinite(input.simulationItemCount, 0)))),
    simulationTimeMinutes: Math.max(0, Math.min(600, Math.round(testPrepFinite(input.simulationTimeMinutes, 0)))),
    simulationDomainCounts: Object.fromEntries(domains.map((domain) => [domain.id, Math.max(0, Math.min(500, Math.round(testPrepFinite(input.simulationDomainCounts && input.simulationDomainCounts[domain.id], 0))))]).filter((entry) => entry[1] > 0)),
    simulationDomainCountsBasis: String(input.simulationDomainCountsBasis || '').trim().slice(0, 160),
    simulationLabel: String(input.simulationLabel || '').trim().slice(0, 120),
    simulationNote: String(input.simulationNote || '').trim().slice(0, 600),
    officialSelectedResponseCount: Math.max(0, Math.min(500, Math.round(testPrepFinite(input.officialSelectedResponseCount, 0)))),
    officialConstructedResponseCount: Math.max(0, Math.min(50, Math.round(testPrepFinite(input.officialConstructedResponseCount, 0)))),
    officialTotalTimeMinutes: Math.max(0, Math.min(1000, Math.round(testPrepFinite(input.officialTotalTimeMinutes, 0)))),
    officialSubtests,
    legacyUrl: testPrepNormalizeRepoAssetUrl(input.legacyUrl),
    legacyAuditUrl: testPrepNormalizeRepoAssetUrl(input.legacyAuditUrl),
    legacyInventoryUrl: testPrepNormalizeRepoAssetUrl(input.legacyInventoryUrl),
    legacyReviewLedgerUrl: testPrepNormalizeRepoAssetUrl(input.legacyReviewLedgerUrl),
    nextReviewDocketUrl: testPrepNormalizeRepoAssetUrl(input.nextReviewDocketUrl),
    curation500Url: testPrepNormalizeRepoAssetUrl(input.curation500Url),
    curation1000Url: testPrepNormalizeRepoAssetUrl(input.curation1000Url),
    expansionAuditUrl: testPrepNormalizeRepoAssetUrl(input.expansionAuditUrl),
    assistantAuditUrl: testPrepNormalizeRepoAssetUrl(input.assistantAuditUrl),
    nativeQaUrl: testPrepNormalizeRepoAssetUrl(input.nativeQaUrl),
    learningLibraryUrl: testPrepNormalizeRepoAssetUrl(input.learningLibraryUrl),
    learningLibraryQaUrl: testPrepNormalizeRepoAssetUrl(input.learningLibraryQaUrl),
    blueprintLabel: String(input.blueprintLabel || '').trim().slice(0, 180),
    blueprintEffective: String(input.blueprintEffective || '').trim().slice(0, 240),
    officialBlueprintUrl: /^https:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9_./?=&%#-]*$/.test(String(input.officialBlueprintUrl || '').trim()) ? String(input.officialBlueprintUrl).trim() : '',
    transitionNotice: String(input.transitionNotice || '').trim().slice(0, 800),
    transitionUrl: /^https:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9_./?=&%#-]*$/.test(String(input.transitionUrl || '').trim()) ? String(input.transitionUrl).trim() : '',
    domains,
    sections,
    items,
  };
}

function testPrepBuildSimulationSet(pack) {
  const items = Array.isArray(pack && pack.items) ? pack.items : [];
  const requested = Math.max(0, Math.floor(testPrepFinite(pack && pack.simulationItemCount, 0)));
  const counts = pack && pack.simulationDomainCounts && typeof pack.simulationDomainCounts === 'object' ? pack.simulationDomainCounts : {};
  const entries = (pack && Array.isArray(pack.domains) ? pack.domains : [])
    .map((domain) => [domain.id, Math.max(0, Math.floor(testPrepFinite(counts[domain.id], 0)))])
    .filter((entry) => entry[1] > 0);
  if (!requested || entries.reduce((sum, entry) => sum + entry[1], 0) !== requested) return items.slice(0, requested);
  const independent = items.filter((item) => item.examItemStatus !== 'not-approved-as-independent-exam-item');
  const queues = entries.map(([domainId, count]) => ({ domainId, count, items: independent.filter((item) => item.domainId === domainId).slice(0, count) }));
  if (queues.some((queue) => queue.items.length !== queue.count)) return items.slice(0, requested);
  const selected = [];
  for (let position = 0; selected.length < requested; position += 1) {
    queues.forEach((queue) => { if (queue.items[position]) selected.push(queue.items[position]); });
  }
  return selected;
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
  if (normalized.simulationItemCount) {
    const simulationEntries = Object.entries(normalized.simulationDomainCounts || {});
    const simulationTotal = simulationEntries.reduce((sum, entry) => sum + entry[1], 0);
    if (!simulationEntries.length || simulationTotal !== normalized.simulationItemCount) errors.push('Simulation domain counts must total the declared simulation item count.');
    for (const [domainId, required] of simulationEntries) {
      const available = normalized.items.filter((item) => item.domainId === domainId && item.examItemStatus !== 'not-approved-as-independent-exam-item').length;
      if (available < required) errors.push('Simulation domain ' + domainId + ' needs ' + required + ' independent items; only ' + available + ' are available.');
    }
  }
  if (normalized.status === 'ready' && !normalized.items.length) errors.push('A ready pack must contain at least one item.');
  return { valid: errors.length === 0, errors, pack: normalized };
}

function registerTestPrepPack(pack) {
  // Slim-embed contract: the release build ships only the 200 source items per
  // expanded pack (Cloudflare 25 MiB per-file cap) and the 300 guided-review
  // activities are derived here, deterministically, from the same shared core
  // the pipeline used to write test_prep/*_items.json (parity-gated at build).
  if (pack && Array.isArray(pack.items) && pack.items.length === 200 && pack.guidedReviewBatchCount > 0 &&
      typeof TEST_PREP_GUIDED_EXPANSION !== 'undefined' && TEST_PREP_GUIDED_EXPANSION &&
      typeof TEST_PREP_GUIDED_EXPANSION.deriveGuidedReviewItems === 'function') {
    pack = { ...pack, items: pack.items.concat(TEST_PREP_GUIDED_EXPANSION.deriveGuidedReviewItems(pack.items)) };
  }
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
  const itemResults = {};
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
    itemResults[item.id] = { correct: isCorrect, confidence: rating };
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
    itemResults,
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


function testPrepNormalizeItemResults(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const output = {};
  Object.keys(input).slice(0, 500).forEach((key) => {
    const id = testPrepSlug(key, '');
    const entry = input[key] && typeof input[key] === 'object' && !Array.isArray(input[key]) ? input[key] : {};
    if (!id) return;
    output[id] = {
      correct: entry.correct === true,
      confidence: ['sure', 'unsure', 'guess'].includes(entry.confidence) ? entry.confidence : 'unrated',
    };
  });
  return output;
}
function testPrepNormalizeAssistedItemIds(value) {
  return Array.from(new Set((Array.isArray(value) ? value : []).slice(0, 500).map((id) => testPrepSlug(id, '')).filter(Boolean)));
}

function testPrepAttemptMetadata(metadata) {
  const input = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
  return {
    mode: ['standard', 'diagnostic', 'guided-review', 'targeted', 'custom', 'review', 'simulation'].includes(input.mode) ? input.mode : 'standard',
    label: String(input.label || '').trim().slice(0, 120),
    targetSkillId: testPrepSlug(input.targetSkillId, ''),
    targetDomainId: testPrepSlug(input.targetDomainId, ''),
    targetDifficulties: testPrepNormalizeDifficultyIds(input.targetDifficulties),
    sourceStartIndex: Math.max(0, Math.floor(testPrepFinite(input.sourceStartIndex, 0))),
    sourceItemCount: Math.max(0, Math.floor(testPrepFinite(input.sourceItemCount, 0))),
    sourceBatchSize: Math.max(0, Math.floor(testPrepFinite(input.sourceBatchSize, 0))),
    timeLimitMinutes: Math.max(0, Math.min(600, Math.floor(testPrepFinite(input.timeLimitMinutes, 0)))),
    timedOut: input.timedOut === true,
    itemIds: (Array.isArray(input.itemIds) ? input.itemIds : []).slice(0, 500).map((id) => testPrepSlug(id, '')).filter(Boolean),
    assistedItemIds: testPrepNormalizeAssistedItemIds(input.assistedItemIds),
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
    itemResults: testPrepNormalizeItemResults(diagnostic.itemResults),
    byDomain: testPrepNormalizeBreakdown(diagnostic.byDomain),
    bySkill: testPrepNormalizeBreakdown(diagnostic.bySkill),
    mode: meta.mode,
    label: meta.label,
    targetSkillId: meta.targetSkillId,
    targetDomainId: meta.targetDomainId,
    targetDifficulties: meta.targetDifficulties,
    sourceStartIndex: meta.sourceStartIndex,
    timeLimitMinutes: meta.timeLimitMinutes,
    timedOut: meta.timedOut,
    itemIds: meta.itemIds,
    assistedItemIds: meta.assistedItemIds,
    batchNumber: Math.max(1, Math.floor(testPrepFinite(diagnostic.sourceBatchNumber, diagnostic.batchNumber))),
    batchCount: Math.max(1, Math.floor(testPrepFinite(diagnostic.sourceBatchCount, diagnostic.batchCount))),
    firstQuestion: Math.max(1, Math.floor(testPrepFinite(diagnostic.sourceFirstQuestion, diagnostic.firstQuestion))),
    lastQuestion: Math.max(1, Math.floor(testPrepFinite(diagnostic.sourceLastQuestion, diagnostic.lastQuestion))),
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
    itemResults: testPrepNormalizeItemResults(attempt && attempt.itemResults),
    byDomain: testPrepNormalizeBreakdown(attempt && attempt.byDomain),
    bySkill: testPrepNormalizeBreakdown(attempt && attempt.bySkill),
    mode: ['standard', 'diagnostic', 'guided-review', 'targeted', 'custom', 'review', 'simulation'].includes(attempt && attempt.mode) ? attempt.mode : 'standard',
    label: String(attempt && attempt.label || '').trim().slice(0, 120),
    targetSkillId: testPrepSlug(attempt && attempt.targetSkillId, ''),
    targetDomainId: testPrepSlug(attempt && attempt.targetDomainId, ''),
    targetDifficulties: testPrepNormalizeDifficultyIds(attempt && attempt.targetDifficulties),
    sourceStartIndex: Math.max(0, Math.floor(testPrepFinite(attempt && attempt.sourceStartIndex, 0))),
    timeLimitMinutes: Math.max(0, Math.min(600, Math.floor(testPrepFinite(attempt && attempt.timeLimitMinutes, 0)))),
    timedOut: attempt && attempt.timedOut === true,
    itemIds: (Array.isArray(attempt && attempt.itemIds) ? attempt.itemIds : []).slice(0, 500).map((id) => testPrepSlug(id, '')).filter(Boolean),
    assistedItemIds: testPrepNormalizeAssistedItemIds(attempt && attempt.assistedItemIds),
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

function normalizeTestPrepReviewItems(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const output = {};
  Object.keys(input).slice(0, 50).forEach((packKey) => {
    const packId = testPrepSlug(packKey, '');
    if (!packId) return;
    const itemIds = Array.from(new Set((Array.isArray(input[packKey]) ? input[packKey] : [])
      .slice(0, 500)
      .map((itemId) => testPrepSlug(itemId, ''))
      .filter(Boolean)));
    if (itemIds.length) output[packId] = itemIds;
  });
  return output;
}

function readTestPrepReviewItems() {
  try { return normalizeTestPrepReviewItems(JSON.parse(localStorage.getItem(TEST_PREP_REVIEW_STORAGE_KEY) || '{}')); }
  catch (_) { return {}; }
}

function writeTestPrepReviewItems(value) {
  const normalized = normalizeTestPrepReviewItems(value);
  try { localStorage.setItem(TEST_PREP_REVIEW_STORAGE_KEY, JSON.stringify(normalized)); } catch (_) {}
  return normalized;
}

function normalizeTestPrepAnnotations(value) {
  const input = Array.isArray(value) ? { records: value } : (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
  const records = (Array.isArray(input.records) ? input.records : []).slice(-1000).map((record) => {
    const entry = record && typeof record === 'object' && !Array.isArray(record) ? record : {};
    const packId = testPrepSlug(entry.packId, '');
    const text = String(entry.text || '').trim().slice(0, 4000);
    if (!packId || !text) return null;
    return {
      id: testPrepSlug(entry.id, ''),
      packId,
      targetType: ['general', 'question', 'chapter', 'flashcard', 'memory-aid', 'constructed-response'].includes(entry.targetType) ? entry.targetType : 'general',
      targetId: testPrepSlug(entry.targetId, ''),
      targetLabel: String(entry.targetLabel || 'General pack note').trim().slice(0, 240),
      kind: entry.kind === 'highlight' ? 'highlight' : 'note',
      color: ['yellow', 'blue', 'green', 'pink'].includes(entry.color) ? entry.color : 'yellow',
      text,
      createdAt: Math.max(0, Math.floor(testPrepFinite(entry.createdAt, 0))),
      updatedAt: Math.max(0, Math.floor(testPrepFinite(entry.updatedAt, 0))),
    };
  }).filter(Boolean);
  return { records };
}

function testPrepUpsertAnnotation(value, annotation, now) {
  const normalized = normalizeTestPrepAnnotations(value);
  const input = annotation && typeof annotation === 'object' && !Array.isArray(annotation) ? annotation : {};
  const timestamp = Math.max(0, Math.floor(testPrepFinite(now, Date.now())));
  const existingId = testPrepSlug(input.id, '');
  const existing = existingId ? normalized.records.find((record) => record.id === existingId) : null;
  const candidate = normalizeTestPrepAnnotations({ records: [Object.assign({}, existing || {}, input, {
    id: existingId || ('annotation-' + timestamp + '-' + testPrepSeedNumber(String(input.packId || '') + ':' + String(input.targetId || '') + ':' + String(input.text || '')).toString(36)),
    createdAt: existing ? existing.createdAt : timestamp,
    updatedAt: timestamp,
  })] }).records[0];
  if (!candidate) return normalized;
  const records = normalized.records.filter((record) => record.id !== candidate.id).concat(candidate).slice(-1000);
  return { records };
}

function testPrepDeleteAnnotation(value, annotationId) {
  const normalized = normalizeTestPrepAnnotations(value);
  const id = testPrepSlug(annotationId, '');
  return { records: normalized.records.filter((record) => record.id !== id) };
}

function readTestPrepAnnotations() {
  try { return normalizeTestPrepAnnotations(JSON.parse(localStorage.getItem(TEST_PREP_ANNOTATIONS_STORAGE_KEY) || '{}')); }
  catch (_) { return { records: [] }; }
}

function writeTestPrepAnnotations(value) {
  const normalized = normalizeTestPrepAnnotations(value);
  try { localStorage.setItem(TEST_PREP_ANNOTATIONS_STORAGE_KEY, JSON.stringify(normalized)); } catch (_) {}
  return normalized;
}

function normalizeTestPrepStudyPlans(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const source = input.byPack && typeof input.byPack === 'object' && !Array.isArray(input.byPack) ? input.byPack : input;
  const byPack = {};
  Object.keys(source).slice(0, 50).forEach((rawPackId) => {
    const packId = testPrepSlug(rawPackId, '');
    const plan = source[rawPackId] && typeof source[rawPackId] === 'object' && !Array.isArray(source[rawPackId]) ? source[rawPackId] : {};
    if (!packId) return;
    byPack[packId] = {
      weeklyQuestions: Math.max(1, Math.min(5000, Math.floor(testPrepFinite(plan.weeklyQuestions, 100)))),
      weeklySets: Math.max(1, Math.min(50, Math.floor(testPrepFinite(plan.weeklySets, 3)))),
      activeDays: Math.max(1, Math.min(7, Math.floor(testPrepFinite(plan.activeDays, 3)))),
    };
  });
  return { byPack };
}

function testPrepStudyPlanForPack(value, packId) {
  const normalized = normalizeTestPrepStudyPlans(value);
  return normalized.byPack[testPrepSlug(packId, '')] || { weeklyQuestions: 100, weeklySets: 3, activeDays: 3 };
}

function readTestPrepStudyPlans() {
  try { return normalizeTestPrepStudyPlans(JSON.parse(localStorage.getItem(TEST_PREP_STUDY_PLANS_STORAGE_KEY) || '{}')); }
  catch (_) { return { byPack: {} }; }
}

function writeTestPrepStudyPlans(value) {
  const normalized = normalizeTestPrepStudyPlans(value);
  try { localStorage.setItem(TEST_PREP_STUDY_PLANS_STORAGE_KEY, JSON.stringify(normalized)); } catch (_) {}
  return normalized;
}

function testPrepBuildStudyPlanStatus(progress, studyPlans, packId, now) {
  const normalizedProgress = normalizeTestPrepProgress(progress);
  const safePackId = testPrepSlug(packId, '');
  const plan = testPrepStudyPlanForPack(studyPlans, safePackId);
  const timestamp = Math.max(0, Math.floor(testPrepFinite(now, Date.now())));
  const date = new Date(timestamp);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const mondayOffset = (date.getDay() + 6) % 7;
  const weekStart = today - mondayOffset * 24 * 60 * 60 * 1000;
  const attempts = normalizedProgress.attempts.filter((attempt) => attempt.packId === safePackId && attempt.completedAt >= weekStart && attempt.completedAt <= timestamp);
  const questionsCompleted = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
  const activeDayValues = Array.from(new Set(attempts.map((attempt) => {
    const completed = new Date(attempt.completedAt);
    return new Date(completed.getFullYear(), completed.getMonth(), completed.getDate()).getTime();
  })));
  const allActivityDays = Array.from(new Set(normalizedProgress.attempts.filter((attempt) => attempt.packId === safePackId).map((attempt) => {
    const completed = new Date(attempt.completedAt);
    return new Date(completed.getFullYear(), completed.getMonth(), completed.getDate()).getTime();
  }))).sort((left, right) => right - left);
  let activityStreakDays = 0;
  if (allActivityDays.length && allActivityDays[0] >= today - 24 * 60 * 60 * 1000) {
    let cursor = allActivityDays[0];
    allActivityDays.forEach((day) => {
      if (day === cursor) { activityStreakDays += 1; cursor -= 24 * 60 * 60 * 1000; }
    });
  }
  const percent = (value, goal) => Math.min(100, Math.round(value / Math.max(1, goal) * 100));
  return {
    packId: safePackId,
    weekStart,
    weekEnd: weekStart + 7 * 24 * 60 * 60 * 1000 - 1,
    plan,
    questionsCompleted,
    setsCompleted: attempts.length,
    activeDaysCompleted: activeDayValues.length,
    activityStreakDays,
    questionPercent: percent(questionsCompleted, plan.weeklyQuestions),
    setPercent: percent(attempts.length, plan.weeklySets),
    activeDayPercent: percent(activeDayValues.length, plan.activeDays),
    limitation: 'Goals and streaks describe study activity only; they do not estimate readiness, ability, an official score, or passing.',
  };
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


function testPrepItemResultsForAttempt(pack, answers, confidence) {
  const normalized = normalizeTestPrepPack(pack);
  const responseMap = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  const confidenceMap = confidence && typeof confidence === 'object' && !Array.isArray(confidence) ? confidence : {};
  const results = {};
  normalized.items.forEach((item) => {
    results[item.id] = {
      correct: Number(responseMap[item.id]) === item.answerIndex,
      confidence: ['sure', 'unsure', 'guess'].includes(confidenceMap[item.id]) ? confidenceMap[item.id] : 'unrated',
    };
  });
  return results;
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
    itemResults: testPrepItemResultsForAttempt(pack, answers, confidence),
    byDomain: score.byDomain,
    bySkill: score.bySkill,
    mode: meta.mode,
    label: meta.label,
    targetSkillId: meta.targetSkillId,
    targetDomainId: meta.targetDomainId,
    targetDifficulties: meta.targetDifficulties,
    sourceStartIndex: meta.sourceStartIndex,
    timeLimitMinutes: meta.timeLimitMinutes,
    timedOut: meta.timedOut,
    itemIds: meta.itemIds,
    assistedItemIds: meta.assistedItemIds,
  });
  return writeTestPrepProgress(next);
}

function testPrepBuildProgressAnalytics(progress, packId) {
  const normalized = normalizeTestPrepProgress(progress);
  const requestedPackId = testPrepSlug(packId, '');
  const attempts = normalized.attempts.filter((attempt) => attempt.mode !== 'guided-review' && (!requestedPackId || attempt.packId === requestedPackId));
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
function testPrepBuildReviewSet(progress, pack, options) {
  const normalizedPack = normalizeTestPrepPack(pack);
  const normalizedProgress = normalizeTestPrepProgress(progress);
  const input = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  const sourceItems = normalizedPack.items.filter((item) => item.examItemStatus !== 'not-approved-as-independent-exam-item');
  const limit = sourceItems.length ? Math.max(1, Math.min(sourceItems.length, Math.min(100, Math.floor(testPrepFinite(input.limit, 20))))) : 0;
  const attempts = normalizedProgress.attempts.filter((attempt) => attempt.packId === normalizedPack.id && attempt.mode !== 'guided-review');
  const analytics = testPrepBuildProgressAnalytics(normalizedProgress, normalizedPack.id);
  const stats = {};
  attempts.forEach((attempt) => {
    Object.keys(attempt.itemResults || {}).forEach((itemId) => {
      const result = attempt.itemResults[itemId];
      if (!stats[itemId]) stats[itemId] = { attempts: 0, correct: 0, misses: 0, confidentMisses: 0, uncertainCorrect: 0 };
      const row = stats[itemId];
      row.attempts += 1;
      if (result.correct) row.correct += 1;
      else row.misses += 1;
      if (!result.correct && result.confidence === 'sure') row.confidentMisses += 1;
      if (result.correct && (result.confidence === 'unsure' || result.confidence === 'guess')) row.uncertainCorrect += 1;
    });
  });
  const domainPerformance = Object.fromEntries(analytics.domainRows.map((row) => [row.id, row]));
  const candidates = sourceItems.map((item, index) => {
    const row = stats[item.id] || { attempts: 0, correct: 0, misses: 0, confidentMisses: 0, uncertainCorrect: 0 };
    const domain = domainPerformance[item.domainId];
    const weakness = domain && domain.total ? Math.max(0, 100 - domain.percent) / 25 : 1;
    const score = row.confidentMisses * 8 + row.misses * 5 + row.uncertainCorrect * 3 + weakness + (row.attempts ? 0 : 2);
    const reason = row.confidentMisses ? 'Confident miss to recalibrate'
      : row.misses ? 'Previously missed'
        : row.uncertainCorrect ? 'Correct with low confidence'
          : row.attempts ? 'Retrieval practice for retention' : 'Not attempted yet';
    return { item, index, score, reason, stats: row };
  });
  const domainOrder = normalizedPack.domains.slice().sort((left, right) => {
    const a = domainPerformance[left.id], b = domainPerformance[right.id];
    if (a && b) return a.percent - b.percent || b.total - a.total;
    if (a) return -1;
    if (b) return 1;
    return normalizedPack.domains.findIndex((domain) => domain.id === left.id) - normalizedPack.domains.findIndex((domain) => domain.id === right.id);
  }).map((domain) => domain.id);
  const groups = Object.fromEntries(domainOrder.map((domainId) => [domainId, []]));
  const unmatched = [];
  candidates.forEach((candidate) => (groups[candidate.item.domainId] || unmatched).push(candidate));
  Object.values(groups).forEach((group) => group.sort((left, right) => right.score - left.score || left.index - right.index));
  unmatched.sort((left, right) => right.score - left.score || left.index - right.index);
  const selected = [];
  while (selected.length < limit) {
    let added = false;
    domainOrder.forEach((domainId) => {
      if (selected.length >= limit || !groups[domainId].length) return;
      selected.push(groups[domainId].shift());
      added = true;
    });
    if (!added) break;
  }
  while (selected.length < limit && unmatched.length) selected.push(unmatched.shift());
  const itemReasons = Object.fromEntries(selected.map((entry) => [entry.item.id, entry.reason]));
  const priorityDomains = analytics.domainRows.slice(0, 3).map((row) => ({
    id: row.id,
    label: (normalizedPack.domains.find((domain) => domain.id === row.id) || { label: row.id.replace(/-/g, ' ') }).label,
    correct: row.correct,
    total: row.total,
    percent: row.percent,
  }));
  return {
    strategy: 'transparent-review-v1',
    packId: normalizedPack.id,
    attemptCount: attempts.length,
    limit,
    items: selected.map((entry) => entry.item),
    itemIds: selected.map((entry) => entry.item.id),
    itemReasons,
    priorityDomains,
    counts: {
      confidentMisses: selected.filter((entry) => entry.stats.confidentMisses > 0).length,
      priorMisses: selected.filter((entry) => entry.stats.misses > 0).length,
      uncertainCorrect: selected.filter((entry) => entry.stats.uncertainCorrect > 0).length,
      notAttempted: selected.filter((entry) => entry.stats.attempts === 0).length,
    },
    limitation: 'This queue uses transparent practice history and blueprint coverage; it is not computerized adaptive testing or an ability estimate.',
  };
}

function testPrepSeedNumber(value) {
  const text = String(value == null ? '' : value).slice(0, 200);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function testPrepSeededShuffle(items, seed) {
  const output = items.slice();
  let state = testPrepSeedNumber(seed) || 1;
  for (let index = output.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    const temporary = output[index];
    output[index] = output[swapIndex];
    output[swapIndex] = temporary;
  }
  return output;
}

function testPrepNormalizeDifficultyIds(value) {
  return Array.from(new Set((Array.isArray(value) ? value : [])
    .slice(0, 12)
    .map((difficulty) => testPrepSlug(difficulty, ''))
    .filter(Boolean)));
}

function testPrepTargetDifficultyValues(filterId) {
  return filterId === 'higher-challenge' ? ['intermediate', 'advanced'] : filterId === 'advanced' ? ['advanced'] : [];
}

function testPrepTargetDifficultyFilter(value) {
  const difficulties = testPrepNormalizeDifficultyIds(value);
  if (difficulties.length === 1 && difficulties[0] === 'advanced') return 'advanced';
  if (difficulties.length === 2 && difficulties.includes('intermediate') && difficulties.includes('advanced')) return 'higher-challenge';
  return 'all';
}

function testPrepBuildTargetedSet(pack, options) {
  const normalizedPack = normalizeTestPrepPack(pack);
  const input = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  const requestedDomainId = testPrepSlug(input.domainId, '');
  const domain = normalizedPack.domains.find((entry) => entry.id === requestedDomainId) || null;
  const difficulties = testPrepNormalizeDifficultyIds(input.difficulties);
  const requestedLength = Math.max(1, Math.min(100, Math.floor(testPrepFinite(input.limit, 20))));
  const seed = String(input.seed == null ? normalizedPack.id + '-targeted-' + requestedDomainId + '-' + (difficulties.join('-') || 'all') : input.seed).slice(0, 120);
  const eligible = domain ? normalizedPack.items.filter((item) => item.examItemStatus !== 'not-approved-as-independent-exam-item' && item.domainId === domain.id
    && (!difficulties.length || difficulties.includes(testPrepSlug(item.difficulty, '')))) : [];
  const items = testPrepSeededShuffle(eligible, seed).slice(0, requestedLength);
  return {
    strategy: 'domain-difficulty-targeted-v1',
    packId: normalizedPack.id,
    domainId: domain ? domain.id : '',
    domainLabel: domain ? domain.label : '',
    difficulties,
    requestedLength,
    eligibleCount: eligible.length,
    limit: items.length,
    seed,
    items,
    itemIds: items.map((item) => item.id),
    limitation: 'This is a reproducible learner-selected domain set, not an official test form, readiness estimate, or pass prediction.',
  };
}

function testPrepBuildCustomQuiz(pack, options) {
  const normalizedPack = normalizeTestPrepPack(pack);
  const input = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  const availableDomainIds = normalizedPack.domains.map((domain) => domain.id);
  const requestedDomainIds = Array.from(new Set((Array.isArray(input.domainIds) ? input.domainIds : [])
    .map((id) => testPrepSlug(id, '')).filter((id) => availableDomainIds.includes(id))));
  const domainIds = requestedDomainIds.length ? requestedDomainIds : availableDomainIds;
  const eligible = normalizedPack.items.filter((item) => item.examItemStatus !== 'not-approved-as-independent-exam-item' && domainIds.includes(item.domainId));
  const requestedLength = Math.max(1, Math.min(100, Math.floor(testPrepFinite(input.limit, Math.min(20, eligible.length || 1)))));
  const limit = Math.min(requestedLength, eligible.length);
  const seed = String(input.seed == null ? normalizedPack.id + '-custom-1' : input.seed).slice(0, 120);
  const groups = Object.fromEntries(domainIds.map((domainId) => [domainId, testPrepSeededShuffle(eligible.filter((item) => item.domainId === domainId), seed + ':' + domainId)]));
  const selected = [];
  while (selected.length < limit) {
    let added = false;
    domainIds.forEach((domainId) => {
      if (selected.length >= limit || !groups[domainId].length) return;
      selected.push(groups[domainId].shift());
      added = true;
    });
    if (!added) break;
  }
  const domainCounts = Object.fromEntries(domainIds.map((domainId) => [domainId, selected.filter((item) => item.domainId === domainId).length]));
  return {
    strategy: 'balanced-custom-v1',
    packId: normalizedPack.id,
    seed,
    requestedLength,
    limit,
    domainIds,
    domainCounts,
    items: selected,
    itemIds: selected.map((item) => item.id),
    limitation: 'This is a reproducible learner-selected practice set, not an official test form, readiness estimate, or pass prediction.',
  };
}

function testPrepSearchPack(pack, learningLibrary, query, options) {
  const normalizedPack = normalizeTestPrepPack(pack);
  const library = learningLibrary && typeof learningLibrary === 'object' && !Array.isArray(learningLibrary) ? learningLibrary : {};
  const input = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  const normalizedQuery = String(query || '').trim().toLowerCase().slice(0, 120);
  const limit = Math.max(1, Math.min(100, Math.floor(testPrepFinite(input.limit, 40))));
  const results = [];
  const add = (type, id, title, snippet, domain, searchText, reviewStatus) => {
    if (!normalizedQuery || !String(searchText || '').toLowerCase().includes(normalizedQuery)) return;
    results.push({
      type,
      id: String(id || '').slice(0, 180),
      title: String(title || '').slice(0, 300),
      snippet: String(snippet || '').replace(/\s+/g, ' ').trim().slice(0, 360),
      domain: String(domain || '').slice(0, 180),
      reviewStatus: String(reviewStatus || '').slice(0, 120),
    });
  };
  normalizedPack.items.forEach((item) => add('question', item.id, item.prompt, item.explanation, item.domainId, [item.prompt].concat(item.choices, item.optionFeedback, item.skillIds, item.chapterIds, item.explanation).join(' '), item.reviewStatus));
  (Array.isArray(library.chapters) ? library.chapters : []).forEach((chapter) => add('chapter', chapter.id, chapter.title, (chapter.sections || []).map((section) => section.heading).join(' · '), chapter.domain, JSON.stringify(chapter), chapter.reviewStatus));
  (Array.isArray(library.flashcards) ? library.flashcards : []).filter((card) => card.reviewStatus === 'source-reviewed-editorial-pass' && card.contentDisposition !== 'retire-redundant').forEach((card) => add('flashcard', card.id, card.front, card.back, card.domain, [card.front, card.back, card.domain].join(' '), card.reviewStatus));
  (Array.isArray(library.memoryAids) ? library.memoryAids : []).filter((aid) => aid.reviewStatus === 'source-reviewed-editorial-pass').forEach((aid) => add('memory-aid', aid.id, aid.title, aid.content, aid.domain, [aid.title, aid.content].concat(aid.tags || []).join(' '), aid.reviewStatus));
  (Array.isArray(library.constructedResponseWorkshops) ? library.constructedResponseWorkshops : []).forEach((workshop) => add('constructed-response', workshop.id, workshop.title, workshop.prompt, workshop.taskType, JSON.stringify(workshop), workshop.reviewStatus || 'source-reviewed-editorial-pass'));
  normalizeTestPrepAnnotations(input.annotations).records.filter((record) => record.packId === normalizedPack.id).forEach((record) => add(record.kind, record.id, record.targetLabel || (record.kind === 'highlight' ? 'Highlight' : 'Note'), record.text, record.targetType, [record.targetLabel, record.text, record.targetType].join(' '), 'learner-created'));
  const typeOrder = { question: 0, chapter: 1, flashcard: 2, 'memory-aid': 3, 'constructed-response': 4, note: 5, highlight: 6 };
  results.sort((left, right) => (typeOrder[left.type] - typeOrder[right.type]) || left.title.localeCompare(right.title));
  const counts = {};
  results.forEach((result) => { counts[result.type] = (counts[result.type] || 0) + 1; });
  return { query: normalizedQuery, total: results.length, counts, results: results.slice(0, limit), limit };
}

function normalizeTestPrepFlashcardSchedule(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const output = {};
  Object.keys(input).slice(0, 5000).forEach((rawId) => {
    const id = testPrepSlug(rawId, '');
    if (!id) return;
    const raw = input[rawId];
    if (raw === 'know' || raw === 'again') {
      output[id] = { rating: raw, repetitions: raw === 'know' ? 1 : 0, intervalDays: 0, lastReviewedAt: 0, dueAt: 0 };
      return;
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const rating = ['again', 'learning', 'know'].includes(raw.rating) ? raw.rating : 'again';
    output[id] = {
      rating,
      repetitions: Math.max(0, Math.min(100, Math.floor(testPrepFinite(raw.repetitions, 0)))),
      intervalDays: Math.max(0, Math.min(3650, testPrepFinite(raw.intervalDays, 0))),
      lastReviewedAt: Math.max(0, Math.floor(testPrepFinite(raw.lastReviewedAt, 0))),
      dueAt: Math.max(0, Math.floor(testPrepFinite(raw.dueAt, 0))),
    };
  });
  return output;
}

function testPrepRateFlashcard(schedule, cardId, rating, now) {
  const normalized = normalizeTestPrepFlashcardSchedule(schedule);
  const id = testPrepSlug(cardId, '');
  if (!id || !['again', 'learning', 'know'].includes(rating)) return normalized;
  const reviewedAt = Math.max(0, Math.floor(testPrepFinite(now, Date.now())));
  const previous = normalized[id] || { repetitions: 0 };
  const day = 24 * 60 * 60 * 1000;
  let repetitions = 0;
  let intervalDays = 0;
  let dueAt = reviewedAt + 10 * 60 * 1000;
  if (rating === 'learning') {
    repetitions = Math.max(1, previous.repetitions || 0);
    intervalDays = 1;
    dueAt = reviewedAt + day;
  } else if (rating === 'know') {
    repetitions = Math.max(0, previous.repetitions || 0) + 1;
    const intervals = [1, 3, 7, 14, 30, 60, 120];
    intervalDays = intervals[Math.min(repetitions - 1, intervals.length - 1)];
    dueAt = reviewedAt + intervalDays * day;
  }
  normalized[id] = { rating, repetitions, intervalDays, lastReviewedAt: reviewedAt, dueAt };
  return normalized;
}

function testPrepBuildFlashcardQueue(cards, schedule, options) {
  const source = Array.isArray(cards) ? cards : [];
  const normalized = normalizeTestPrepFlashcardSchedule(schedule);
  const input = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  const now = Math.max(0, Math.floor(testPrepFinite(input.now, Date.now())));
  const query = String(input.query || '').trim().toLowerCase().slice(0, 120);
  const domain = String(input.domain || 'all');
  const filtered = source.filter((card) => (domain === 'all' || card.domain === domain) && (!query || [card.front, card.back, card.domain].join(' ').toLowerCase().includes(query)));
  const due = filtered.filter((card) => !normalized[card.id] || normalized[card.id].dueAt <= now);
  const visible = input.dueOnly ? due : filtered;
  const originalIndex = new Map(source.map((card, index) => [card.id, index]));
  const sorted = visible.slice().sort((left, right) => {
    const leftDue = normalized[left.id] ? normalized[left.id].dueAt : 0;
    const rightDue = normalized[right.id] ? normalized[right.id].dueAt : 0;
    return leftDue - rightDue || (originalIndex.get(left.id) || 0) - (originalIndex.get(right.id) || 0);
  });
  return { items: sorted, total: filtered.length, dueCount: due.length, scheduledCount: filtered.length - due.length, now, schedule: normalized };
}
function testPrepExportProgress(progress, reviewItems, now, extras) {
  const optional = extras && typeof extras === 'object' && !Array.isArray(extras) ? extras : {};
  return {
    schemaVersion: 2,
    kind: 'alloflow-test-prep-progress',
    exportedAt: Math.max(0, Math.floor(testPrepFinite(now, Date.now()))),
    progress: normalizeTestPrepProgress(progress),
    reviewItems: normalizeTestPrepReviewItems(reviewItems),
    annotations: normalizeTestPrepAnnotations(optional.annotations),
    studyPlans: normalizeTestPrepStudyPlans(optional.studyPlans),
  };
}

function testPrepImportProgress(value) {
  let input = value;
  if (typeof input === 'string') input = JSON.parse(input);
  if (!input || typeof input !== 'object' || Array.isArray(input) || ![1, 2].includes(input.schemaVersion) || input.kind !== 'alloflow-test-prep-progress') {
    throw new Error('Unsupported AlloFlow test-prep progress file.');
  }
  return {
    progress: normalizeTestPrepProgress(input.progress),
    reviewItems: normalizeTestPrepReviewItems(input.reviewItems),
    annotations: normalizeTestPrepAnnotations(input.annotations),
    studyPlans: normalizeTestPrepStudyPlans(input.studyPlans),
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
    targetDomainId: meta.targetDomainId,
    targetDifficulties: meta.targetDifficulties,
    sourceStartIndex: meta.sourceStartIndex,
    timeLimitMinutes: meta.timeLimitMinutes,
    itemIds: meta.itemIds,
    questionIndex: Math.max(0, Math.floor(testPrepFinite(input.questionIndex, 0))),
    timeRemainingSeconds: Math.max(0, Math.floor(testPrepFinite(input.timeRemainingSeconds, 0))),
    answers,
    confidence,
    assistedItemIds: meta.assistedItemIds,
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
registerTestPrepPack(EPPP_INTEGRATED_2027_PREVIEW_PACK);
registerTestPrepPack(PARAPRO_PRACTICE_PACK);
registerTestPrepPack(SPECIAL_EDUCATION_5355_PRACTICE_PACK);
registerTestPrepPack(SCHOOL_COUNSELOR_5422_PRACTICE_PACK);
registerTestPrepPack(SCHOOL_PSYCHOLOGIST_5403_PRACTICE_PACK);
registerTestPrepPack(SPEECH_LANGUAGE_PATHOLOGY_5331_PRACTICE_PACK);
registerTestPrepPack(AUDIOLOGY_5343_PRACTICE_PACK);
registerTestPrepPack(READING_SPECIALIST_5302_PRACTICE_PACK);
registerTestPrepPack(EDUCATIONAL_LEADERSHIP_5412_PRACTICE_PACK);
registerTestPrepPack(PLT_K6_5622_PRACTICE_PACK);
registerTestPrepPack(PRAXIS_CORE_5752_PRACTICE_PACK);
registerTestPrepPack(ESOL_5362_PRACTICE_PACK);
registerTestPrepPack(TEACHING_READING_5205_PRACTICE_PACK);
registerTestPrepPack(EARLY_CHILDHOOD_5025_PRACTICE_PACK);
registerTestPrepPack(PLT_EARLY_CHILDHOOD_5621_PRACTICE_PACK);
registerTestPrepPack(SPECIAL_EDUCATION_EARLY_CHILDHOOD_5692_PRACTICE_PACK);
registerTestPrepPack(SPECIAL_EDUCATION_SEVERE_PROFOUND_5547_PRACTICE_PACK);
registerTestPrepPack(SPECIAL_EDUCATION_LEARNING_DISABILITIES_5383_PRACTICE_PACK);
registerTestPrepPack(SPECIAL_EDUCATION_BEHAVIOR_EMOTIONAL_5372_PRACTICE_PACK);
registerTestPrepPack(SPECIAL_EDUCATION_INTELLECTUAL_DISABILITIES_5322_PRACTICE_PACK);
registerTestPrepPack(PLT_5_9_5623_PRACTICE_PACK);
registerTestPrepPack(PLT_7_12_5624_PRACTICE_PACK);
registerTestPrepPack(SCHOOL_LIBRARIAN_5312_PRACTICE_PACK);

function TestPrepStatusBadge({ status }) {
  const styles = status === 'ready'
    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
    : status === 'preview'
      ? 'bg-indigo-100 text-indigo-950 border-indigo-300'
      : status === 'planned'
        ? 'bg-violet-100 text-violet-900 border-violet-300'
        : 'bg-amber-100 text-amber-900 border-amber-300';
  const label = status === 'ready' ? 'Practice ready' : status === 'preview' ? 'Future preview' : status === 'planned' ? 'Migration planned' : 'Researching';
  return <span className={'inline-flex rounded-full border px-2 py-1 text-xs font-bold ' + styles}>{label}</span>;
}

const TEST_PREP_LARGE_TEXT_STYLES = `
[data-test-prep-text-size="large"] { font-size: 1.25rem; line-height: 1.6; }
[data-test-prep-text-size="large"] .text-xs { font-size: 0.9375rem !important; line-height: 1.375rem !important; }
[data-test-prep-text-size="large"] .text-sm { font-size: 1.09375rem !important; line-height: 1.625rem !important; }
[data-test-prep-text-size="large"] .text-base { font-size: 1.25rem !important; line-height: 1.875rem !important; }
[data-test-prep-text-size="large"] .text-lg { font-size: 1.40625rem !important; line-height: 2rem !important; }
[data-test-prep-text-size="large"] .text-xl { font-size: 1.5625rem !important; line-height: 2.125rem !important; }
[data-test-prep-text-size="large"] .text-2xl { font-size: 1.875rem !important; line-height: 2.375rem !important; }
[data-test-prep-text-size="large"] .text-3xl { font-size: 2.34375rem !important; line-height: 2.75rem !important; }
[data-test-prep-text-size="large"] .text-4xl { font-size: 2.8125rem !important; line-height: 3.25rem !important; }
[data-test-prep-text-size="large"] .text-5xl { font-size: 3.75rem !important; line-height: 4.25rem !important; }
@media (min-width: 640px) {
  [data-test-prep-text-size="large"] [class~="sm:text-2xl"] { font-size: 1.875rem !important; line-height: 2.375rem !important; }
}
`;

function testPrepQuestionSpeechText(item, questionIndex, totalQuestions) {
  if (!item) return '';
  const position = Math.max(0, Math.floor(testPrepFinite(questionIndex, 0))) + 1;
  const total = Math.max(position, Math.floor(testPrepFinite(totalQuestions, position)));
  const choiceList = Array.isArray(item.choices) ? item.choices : [];
  const choices = choiceList.map((choice, index) => String.fromCharCode(65 + index) + ', ' + choice).join('. ');
  const labels = choiceList.map((_, index) => String.fromCharCode(65 + index));
  return 'Question ' + position + ' of ' + total + '. ' + String(item.prompt || '').trim() + '. Answer choices. ' + choices + '. Say choose ' + (labels.length > 1 ? labels.slice(0, -1).join(', ') + ', or ' + labels[labels.length - 1] : labels[0] || 'an option') + '.';
}

function testPrepFeedbackSpeechText(item, selectedChoice) {
  if (!item || selectedChoice == null) return '';
  const correct = Number(selectedChoice) === Number(item.answerIndex);
  const selectedLabel = String.fromCharCode(65 + Number(selectedChoice));
  const supportedLabel = String.fromCharCode(65 + Number(item.answerIndex));
  return (correct ? 'Correct. ' : 'Review this one. You selected ' + selectedLabel + '. The supported answer is ' + supportedLabel + '. ') + String(item.rationale || '').trim() + '. Say next question, repeat explanation, or ask a clarification question.';
}

function testPrepParseHandsFreeCommand(value) {
  const original = String(value || '').trim();
  const text = original.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return { type: 'unknown', transcript: original };
  if (/^(?:stop|exit|disable|turn off)(?: hands free| voice mode)?$/.test(text) || /^(?:stop hands free|stop voice mode)$/.test(text)) return { type: 'stop', transcript: original };
  if (/\b(?:slower|slow down)\b/.test(text)) return { type: 'slower', transcript: original };
  if (/\b(?:faster|speed up)\b/.test(text)) return { type: 'faster', transcript: original };
  if (/\b(?:repeat|read)(?: the)? (?:explanation|feedback|reasoning)\b/.test(text)) return { type: 'repeat-feedback', transcript: original };
  if (/^(?:repeat|repeat question|read question|read it again|say that again)$/.test(text)) return { type: 'repeat-question', transcript: original };
  const choiceMatch = text.match(/\b(?:choose|select|answer|option)\s+(?:option\s+)?(a|b|c|d|e|f|g|h|first|second|third|fourth|fifth|sixth|seventh|eighth|1|2|3|4|5|6|7|8)\b/);
  if (choiceMatch) {
    const choiceMap = { a: 0, first: 0, '1': 0, b: 1, second: 1, '2': 1, c: 2, third: 2, '3': 2, d: 3, fourth: 3, '4': 3, e: 4, fifth: 4, '5': 4, f: 5, sixth: 5, '6': 5, g: 6, seventh: 6, '7': 6, h: 7, eighth: 7, '8': 7 };
    return { type: 'choose', choiceIndex: choiceMap[choiceMatch[1]], transcript: original };
  }
  if (/^(?:check|check answer|submit|submit answer)$/.test(text)) return { type: 'submit', transcript: original };
  if (/^(?:next|next question|continue|save answer and continue|finish practice)$/.test(text)) return { type: 'next', transcript: original };
  if (/^(?:help|commands|what can i say)$/.test(text)) return { type: 'help', transcript: original };
  if (/^(?:ask|clarify|explain|define|what does|what is|who is|can you|could you|why|how)\b/.test(text)) return { type: 'clarify', query: original.replace(/^(?:ask|clarify)\s+/i, '').trim() || original, transcript: original };
  return { type: 'unknown', transcript: original };
}

function testPrepBuildClarificationPrompt(item, question, checked, selectedChoice) {
  const safeQuestion = String(question || '').trim().slice(0, 800);
  const choices = item && Array.isArray(item.choices) ? item.choices.map((choice, index) => String.fromCharCode(65 + index) + '. ' + choice).join('\n') : '';
  const base = 'You are the accessibility clarification assistant inside AlloFlow Test Prep. Answer in 70 words or fewer, in plain language, and do not claim an official score or endorsement.\nQuestion shown to learner: ' + String(item && item.prompt || '').slice(0, 1200) + (checked ? '\nChoices:\n' + choices : '') + '\nLearner asks: ' + safeQuestion;
  if (!checked) return base + '\nThe learner has not checked an answer. Clarify wording, vocabulary, or task directions only. Do not identify, hint at, eliminate, rank, or paraphrase toward the correct option. If the request would reveal the answer, politely refuse and offer a neutral definition.';
  return base + '\nThe learner has checked an answer. You may explain the source-reviewed feedback. Selected option: ' + (selectedChoice == null ? 'none' : String.fromCharCode(65 + Number(selectedChoice))) + '. Supported option: ' + String.fromCharCode(65 + Number(item.answerIndex)) + '. Rationale: ' + String(item.rationale || '').slice(0, 1800);
}

function TestPrepHub(props) {
  const { isOpen = true, onClose = (() => {}), callTTS, callGemini, selectedVoice = 'Puck', addToast } = props || {};
  const SpeechRecognitionCtor = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
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
  const [practiceStarted, setPracticeStarted] = React.useState(false);
  const [practiceMode, setPracticeMode] = React.useState('standard');
  const [practiceLabel, setPracticeLabel] = React.useState('');
  const [activeItemIds, setActiveItemIds] = React.useState([]);
  const [sourceStartIndex, setSourceStartIndex] = React.useState(0);
  const [targetSkillId, setTargetSkillId] = React.useState('');
  const [targetDomainId, setTargetDomainId] = React.useState('');
  const [targetDifficultyFilter, setTargetDifficultyFilter] = React.useState('all');
  const [timeRemainingSeconds, setTimeRemainingSeconds] = React.useState(0);
  const [savedSession, setSavedSession] = React.useState(readTestPrepSession);
  const [progress, setProgress] = React.useState(readTestPrepProgress);
  const [reviewItems, setReviewItems] = React.useState(readTestPrepReviewItems);
  const [annotations, setAnnotations] = React.useState(readTestPrepAnnotations);
  const [studyPlans, setStudyPlans] = React.useState(readTestPrepStudyPlans);
  const [annotationDraft, setAnnotationDraft] = React.useState('');
  const [annotationKind, setAnnotationKind] = React.useState('note');
  const [annotationColor, setAnnotationColor] = React.useState('yellow');
  const [annotationEditingId, setAnnotationEditingId] = React.useState('');
  const [annotationTarget, setAnnotationTarget] = React.useState({ targetType: 'general', targetId: '', targetLabel: 'General pack note' });
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
  const [flashcardDueOnly, setFlashcardDueOnly] = React.useState(false);
  const [customQuizDomainIds, setCustomQuizDomainIds] = React.useState([]);
  const [customQuizLength, setCustomQuizLength] = React.useState(20);
  const [customQuizVariant, setCustomQuizVariant] = React.useState(1);
  const [memoryAidOpen, setMemoryAidOpen] = React.useState('');
  const [readAloudStatus, setReadAloudStatus] = React.useState('idle');
  const [handsFreeEnabled, setHandsFreeEnabled] = React.useState(false);
  const [handsFreeStatus, setHandsFreeStatus] = React.useState('idle');
  const [handsFreeTranscript, setHandsFreeTranscript] = React.useState('');
  const [handsFreeError, setHandsFreeError] = React.useState('');
  const [handsFreeRate, setHandsFreeRate] = React.useState(1);
  const [clarificationDraft, setClarificationDraft] = React.useState('');
  const [clarificationStatus, setClarificationStatus] = React.useState('idle');
  const [clarificationResponse, setClarificationResponse] = React.useState('');
  const [assistedItemIds, setAssistedItemIds] = React.useState([]);
  const dialogRef = React.useRef(null);
  const legacyChapterFrameRef = React.useRef(null);
  const readAloudAudioRef = React.useRef(null);
  const readAloudUtteranceRef = React.useRef(null);
  const readAloudAbortRef = React.useRef(null);
  const readAloudRequestRef = React.useRef(0);
  const handsFreeRecognitionRef = React.useRef(null);
  const handsFreeSuppressRestartRef = React.useRef(false);
  const handsFreeEnabledRef = React.useRef(false);
  const handsFreeCommandHandlerRef = React.useRef(null);
  const handsFreeRateRef = React.useRef(1);
  const handsFreeAudioCacheRef = React.useRef(new Map());
  const handsFreeCacheGenerationRef = React.useRef(0);
  const [chapterCheckAnswers, setChapterCheckAnswers] = React.useState({});
  const [chapterCheckRevealed, setChapterCheckRevealed] = React.useState({});
  const selectedPack = packs.find((pack) => pack.id === selectedPackId) || readyPack;
  const itemLookup = new Map((selectedPack ? selectedPack.items : []).map((item) => [item.id, item]));
  const practiceItems = selectedPack && activeItemIds.length ? activeItemIds.map((id) => itemLookup.get(id)).filter(Boolean) : (selectedPack ? selectedPack.items : []);
  const activeBatchSize = !selectedPack ? 100 : (practiceMode === 'diagnostic' || practiceMode === 'guided-review') ? Math.max(1, practiceItems.length) : practiceMode === 'standard' ? selectedPack.batchSize : Math.max(selectedPack.batchSize, practiceItems.length + 1);
  const activePack = selectedPack ? Object.assign({}, selectedPack, { items: practiceItems, batchSize: activeBatchSize }) : null;
  const currentItem = practiceStarted && activePack && activePack.items[questionIndex];
  const currentBatch = activePack ? testPrepBatchMeta(activePack, questionIndex) : null;
  const currentSection = selectedPack && selectedPack.sections[Math.floor(sourceStartIndex / Math.max(1, selectedPack.batchSize))] || null;
  const savedReviewItemIds = selectedPack ? (reviewItems[selectedPack.id] || []).filter((itemId) => {
    const item = itemLookup.get(itemId);
    return item && item.examItemStatus !== 'not-approved-as-independent-exam-item';
  }) : [];
  const currentItemSavedForReview = !!(currentItem && savedReviewItemIds.includes(currentItem.id));
  const progressAnalytics = testPrepBuildProgressAnalytics(progress, selectedPackId);
  const smartReviewPlan = selectedPack ? testPrepBuildReviewSet(progress, selectedPack, { limit: Math.min(20, selectedPack.items.length) }) : null;
  const customQuizPlan = selectedPack ? testPrepBuildCustomQuiz(selectedPack, { domainIds: customQuizDomainIds, limit: customQuizLength, seed: selectedPack.id + '-custom-' + customQuizVariant }) : null;
  const targetedDomainPlan = selectedPack ? testPrepBuildTargetedSet(selectedPack, { domainId: targetDomainId, difficulties: testPrepTargetDifficultyValues(targetDifficultyFilter), limit: 20 }) : null;
  const globalSearch = selectedPack && learningLibrary ? testPrepSearchPack(selectedPack, learningLibrary, librarySearch, { limit: 60, annotations }) : { query: '', total: 0, counts: {}, results: [] };
  const packAnnotations = selectedPack ? normalizeTestPrepAnnotations(annotations).records.filter((record) => record.packId === selectedPack.id) : [];
  const currentStudyPlan = selectedPack ? testPrepStudyPlanForPack(studyPlans, selectedPack.id) : { weeklyQuestions: 100, weeklySets: 3, activeDays: 3 };
  const studyPlanStatus = selectedPack ? testPrepBuildStudyPlanStatus(progress, studyPlans, selectedPack.id, Date.now()) : null;
  const availableSkills = learningLibrary && Array.isArray(learningLibrary.skills) ? learningLibrary.skills : [];
  const skillById = Object.fromEntries(availableSkills.map((skill) => [skill.id, skill]));
  const domainById = Object.fromEntries((selectedPack ? selectedPack.domains : []).map((domain) => [domain.id, domain]));

  handsFreeEnabledRef.current = handsFreeEnabled;
  handsFreeRateRef.current = handsFreeRate;

  React.useEffect(() => {
    const key = 'alloflow_test_prep_flashcards_' + (selectedPack ? selectedPack.id : 'none') + '_v1';
    try { setFlashcardRatings(normalizeTestPrepFlashcardSchedule(JSON.parse(localStorage.getItem(key) || '{}') || {})); }
    catch (_) { setFlashcardRatings({}); }
    setFlashcardDueOnly(false);
    setCustomQuizDomainIds([]);
    setTargetDomainId('');
    setTargetDifficultyFilter('all');
    setCustomQuizLength(Math.min(20, selectedPack && selectedPack.items.length ? selectedPack.items.length : 20));
    setCustomQuizVariant(1);
    setAnnotationTarget({ targetType: 'general', targetId: '', targetLabel: 'General pack note' });
    setAnnotationDraft('');
    setAnnotationEditingId('');
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
      const focusable = Array.from(dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (document.activeElement === dialogRef.current) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
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
    testPrepFetchRepoJson(libraryUrl, (catalog) => Boolean(catalog && catalog.schemaVersion === 1 && catalog.summary && Array.isArray(catalog.chapters)))
      .then((catalog) => {
        if (cancelled) return;
        setLearningLibrary(catalog);
        setLearningLibraryStatus('ready');
      })
      .catch(() => { if (!cancelled) setLearningLibraryStatus('unavailable'); });
    return () => { cancelled = true; };
  }, [selectedPack && selectedPack.learningLibraryUrl]);

  React.useEffect(() => {
    if (!practiceStarted || !selectedPack || !activePack || !activePack.items.length || result || checkpoint) return;
    setSavedSession(writeTestPrepSession({
      packId: selectedPack.id,
      mode: practiceMode,
      label: practiceLabel,
      targetSkillId,
      targetDomainId,
      targetDifficulties: testPrepTargetDifficultyValues(targetDifficultyFilter),
      sourceStartIndex,
      sourceItemCount: selectedPack ? selectedPack.items.length : 0,
      sourceBatchSize: selectedPack ? selectedPack.batchSize : 0,
      timeLimitMinutes: practiceMode === 'simulation' ? selectedPack.simulationTimeMinutes : 0,
      itemIds: activePack.items.map((item) => item.id),
      questionIndex,
      timeRemainingSeconds,
      answers,
      confidence,
      assistedItemIds,
      updatedAt: Date.now(),
    }));
  }, [practiceStarted, selectedPackId, practiceMode, practiceLabel, targetSkillId, targetDomainId, targetDifficultyFilter, sourceStartIndex, activeItemIds, questionIndex, timeRemainingSeconds, answers, confidence, assistedItemIds, result, checkpoint]);

  React.useEffect(() => {
    if (!practiceStarted || practiceMode !== 'simulation' || result || checkpoint || timeRemainingSeconds <= 0) return undefined;
    const timer = setInterval(() => setTimeRemainingSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [practiceStarted, practiceMode, result, checkpoint, timeRemainingSeconds > 0]);

  React.useEffect(() => {
    if (practiceStarted && practiceMode === 'simulation' && !result && !checkpoint && activeItemIds.length && timeRemainingSeconds === 0) finishPractice(true);
  }, [practiceStarted, practiceMode, result, checkpoint, activeItemIds.length, timeRemainingSeconds]);

  React.useEffect(() => () => { disableHandsFree(false); stopReadAloud(false); }, []);

  React.useEffect(() => {
    setClarificationDraft('');
    setClarificationResponse('');
    setClarificationStatus('idle');
    if (!handsFreeEnabled || !currentItem) {
      if (readAloudAudioRef.current || readAloudUtteranceRef.current || readAloudAbortRef.current) stopReadAloud();
      return undefined;
    }
    const timer = setTimeout(() => {
      prewarmUpcomingQuestionAudio();
      const text = testPrepQuestionSpeechText(currentItem, questionIndex, activePack ? activePack.items.length : 1);
      speakTestPrepText(text, { cacheKey: testPrepAudioCacheKey(text) });
    }, 0);
    return () => clearTimeout(timer);
  }, [handsFreeEnabled, currentItem && currentItem.id]);

  React.useEffect(() => {
    syncLegacyChapterTextSize();
  }, [largeText, libraryChapterId]);

  handsFreeCommandHandlerRef.current = handleHandsFreeCommand;

  if (!isOpen) return null;

  function announce(message, type) {
    try { if (typeof addToast === 'function') addToast(message, type || 'info'); } catch (_) {}
  }

  function syncLegacyChapterTextSize(frame) {
    const target = frame || legacyChapterFrameRef.current;
    try {
      const frameDocument = target && target.contentDocument;
      if (!frameDocument || !frameDocument.documentElement) return;
      frameDocument.documentElement.style.fontSize = largeText ? '125%' : '';
      frameDocument.documentElement.dataset.alloflowTextSize = largeText ? 'large' : 'standard';
    } catch (_) {}
  }

  function stopReadAloud(updateStatus = true) {
    readAloudRequestRef.current += 1;
    if (readAloudAbortRef.current) {
      try { readAloudAbortRef.current.abort(); } catch (_) {}
      readAloudAbortRef.current = null;
    }
    if (readAloudAudioRef.current) {
      readAloudAudioRef.current.onplay = null;
      readAloudAudioRef.current.onended = null;
      readAloudAudioRef.current.onerror = null;
      try { readAloudAudioRef.current.pause(); } catch (_) {}
      readAloudAudioRef.current = null;
    }
    const hadBrowserSpeech = !!readAloudUtteranceRef.current;
    readAloudUtteranceRef.current = null;
    try { if (hadBrowserSpeech && typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
    if (updateStatus) setReadAloudStatus('idle');
  }

  function resetPracticeWorkspace() {
    disableHandsFree();
    setQuestionIndex(0);
    setSelectedChoice(null);
    setChecked(false);
    setAnswers({});
    setConfidence({});
    setAssistedItemIds([]);
    setClarificationDraft('');
    setClarificationResponse('');
    setClarificationStatus('idle');
    setResult(null);
    setCheckpoint(null);
  }

  function openPack(pack, nextTab) {
    setSelectedPackId(pack.id);
    resetPracticeWorkspace();
    setPracticeStarted(pack.status !== 'preview' && !(pack.simulationItemCount || pack.items.length > pack.batchSize));
    setPracticeMode('standard');
    setPracticeLabel('');
    setActiveItemIds([]);
    setSourceStartIndex(0);
    setTargetSkillId('');
    setTargetDomainId('');
    setTargetDifficultyFilter('all');
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
    setTargetDomainId(input.targetDomainId || '');
    setTargetDifficultyFilter(testPrepTargetDifficultyFilter(input.targetDifficulties));
    setTimeRemainingSeconds(input.mode === 'simulation' ? Math.max(1, selectedPack.simulationTimeMinutes) * 60 : 0);
    setPracticeStarted(true);
    setTab('practice');
  }

  function startDiagnosticBatch(batchIndex) {
    if (!selectedPack) return;
    const safeBatch = Math.max(0, Math.floor(Number(batchIndex) || 0));
    const start = safeBatch * selectedPack.batchSize;
    const bankCount = Math.ceil(selectedPack.items.length / selectedPack.batchSize);
    const section = selectedPack.sections[safeBatch];
    const guided = section && section.kind === 'guided-review';
    startPracticeSet({
      mode: guided ? 'guided-review' : 'diagnostic',
      label: guided ? section.label + ' (' + (safeBatch + 1) + ' of ' + bankCount + ')' : 'Practice Bank ' + (safeBatch + 1) + ' of ' + bankCount,
      items: selectedPack.items.slice(start, start + selectedPack.batchSize),
      sourceStartIndex: start,
    });
  }

  function toggleSavedForReview(itemId) {
    if (!selectedPack) return;
    const safeItemId = testPrepSlug(itemId, '');
    const item = itemLookup.get(safeItemId);
    if (!item || item.examItemStatus === 'not-approved-as-independent-exam-item') {
      announce('Guided activities stay in their guided-review bank and are excluded from saved-question diagnostic review.', 'info');
      return;
    }
    const normalized = normalizeTestPrepReviewItems(reviewItems);
    const packItems = normalized[selectedPack.id] || [];
    const removing = packItems.includes(safeItemId);
    const nextPackItems = removing ? packItems.filter((id) => id !== safeItemId) : packItems.concat(safeItemId);
    const next = Object.assign({}, normalized);
    if (nextPackItems.length) next[selectedPack.id] = nextPackItems;
    else delete next[selectedPack.id];
    setReviewItems(writeTestPrepReviewItems(next));
    announce(removing ? 'Question removed from saved review.' : 'Question saved for later review.', 'info');
  }

  function startSavedQuestionReview() {
    const items = savedReviewItemIds.map((itemId) => itemLookup.get(itemId)).filter(Boolean);
    if (!items.length) { announce('Save a question before starting a review set.', 'info'); return; }
    startPracticeSet({
      mode: 'targeted',
      label: 'Saved-question review',
      items,
    });
  }


  function startSmartReview() {
    if (!smartReviewPlan || !smartReviewPlan.items.length) { announce('No questions are available for smart review.', 'info'); return; }
    startPracticeSet({
      mode: 'review',
      label: smartReviewPlan.attemptCount ? 'Smart review from practice history' : 'Balanced starter review',
      items: smartReviewPlan.items,
    });
  }

  function toggleCustomQuizDomain(domainId) {
    if (!selectedPack) return;
    const allIds = selectedPack.domains.map((domain) => domain.id);
    const active = customQuizDomainIds.length ? customQuizDomainIds : allIds;
    const next = active.includes(domainId) ? active.filter((id) => id !== domainId) : active.concat(domainId);
    setCustomQuizDomainIds(next.length === allIds.length ? [] : next);
  }

  function startCustomQuiz() {
    if (!customQuizPlan || !customQuizPlan.items.length) { announce('Choose at least one domain with available questions.', 'info'); return; }
    startPracticeSet({
      mode: 'custom',
      label: 'Custom quiz · ' + customQuizPlan.items.length + ' questions · variation ' + customQuizVariant,
      items: customQuizPlan.items,
    });
  }

  function openLibrarySearchResult(searchResult) {
    if (!searchResult) return;
    if (searchResult.type === 'question') {
      const item = itemLookup.get(searchResult.id);
      if (item) startPracticeSet({ mode: 'custom', label: 'Search result practice', items: [item] });
      return;
    }
    if (searchResult.type === 'chapter') {
      setLibraryMode('chapters');
      setLibraryChapterId(searchResult.id);
      return;
    }
    if (searchResult.type === 'flashcard') {
      setLibraryMode('flashcards');
      setLibraryDomain('all');
      setLibrarySearch(searchResult.title);
      setFlashcardIndex(0);
      setFlashcardRevealed(false);
      return;
    }
    if (searchResult.type === 'memory-aid') {
      setLibraryMode('memory-aids');
      setLibraryDomain('all');
      setLibrarySearch(searchResult.title);
      setMemoryAidOpen(searchResult.id);
      return;
    }
    if (searchResult.type === 'note' || searchResult.type === 'highlight') {
      const record = normalizeTestPrepAnnotations(annotations).records.find((entry) => entry.id === searchResult.id);
      if (record) editAnnotation(record);
      return;
    }
    if (searchResult.type === 'constructed-response') {
      setLibraryMode('constructed-response');
      setLibrarySearch('');
    }
  }
  function beginAnnotation(target) {
    const input = target && typeof target === 'object' ? target : {};
    setAnnotationTarget({
      targetType: ['question', 'chapter', 'flashcard', 'memory-aid', 'constructed-response'].includes(input.targetType) ? input.targetType : 'general',
      targetId: input.targetId || '',
      targetLabel: input.targetLabel || 'General pack note',
    });
    setAnnotationDraft('');
    setAnnotationKind('note');
    setAnnotationColor('yellow');
    setAnnotationEditingId('');
    setTab('notes');
  }

  function editAnnotation(record) {
    if (!record) return;
    setAnnotationTarget({ targetType: record.targetType, targetId: record.targetId, targetLabel: record.targetLabel });
    setAnnotationDraft(record.text);
    setAnnotationKind(record.kind);
    setAnnotationColor(record.color);
    setAnnotationEditingId(record.id);
    setTab('notes');
  }

  function saveAnnotationDraft() {
    if (!selectedPack || !annotationDraft.trim()) { announce('Write a note or highlight before saving.', 'info'); return; }
    const next = testPrepUpsertAnnotation(annotations, {
      id: annotationEditingId,
      packId: selectedPack.id,
      targetType: annotationTarget.targetType,
      targetId: annotationTarget.targetId,
      targetLabel: annotationTarget.targetLabel,
      kind: annotationKind,
      color: annotationColor,
      text: annotationDraft,
    }, Date.now());
    setAnnotations(writeTestPrepAnnotations(next));
    setAnnotationDraft('');
    setAnnotationEditingId('');
    setAnnotationTarget({ targetType: 'general', targetId: '', targetLabel: 'General pack note' });
    announce(annotationEditingId ? 'Study annotation updated.' : 'Study annotation saved.', 'success');
  }

  function removeAnnotation(annotationId) {
    setAnnotations(writeTestPrepAnnotations(testPrepDeleteAnnotation(annotations, annotationId)));
    if (annotationEditingId === annotationId) {
      setAnnotationDraft('');
      setAnnotationEditingId('');
    }
    announce('Study annotation removed.', 'info');
  }

  function updateStudyPlan(patch) {
    if (!selectedPack) return;
    const next = normalizeTestPrepStudyPlans(studyPlans);
    next.byPack[selectedPack.id] = Object.assign({}, currentStudyPlan, patch || {});
    setStudyPlans(writeTestPrepStudyPlans(next));
  }
  function exportPracticeProgress() {
    try {
      const payload = testPrepExportProgress(progress, reviewItems, Date.now(), { annotations, studyPlans });
      if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') throw new Error('File export is unavailable in this browser.');
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'alloflow-test-prep-progress.json';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      announce('Test-prep progress backup created.', 'success');
    } catch (error) { announce(error && error.message ? error.message : 'Progress export failed.', 'warning'); }
  }

  function importPracticeProgressFile(event) {
    const file = event && event.target && event.target.files && event.target.files[0];
    if (!file || typeof FileReader === 'undefined') return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = testPrepImportProgress(String(reader.result || ''));
        setProgress(writeTestPrepProgress(imported.progress));
        setReviewItems(writeTestPrepReviewItems(imported.reviewItems));
        setAnnotations(writeTestPrepAnnotations(imported.annotations));
        setStudyPlans(writeTestPrepStudyPlans(imported.studyPlans));
        announce('Test-prep progress, notes, and plans restored.', 'success');
      } catch (error) { announce(error && error.message ? error.message : 'Progress import failed.', 'warning'); }
      if (event.target) event.target.value = '';
    };
    reader.onerror = () => announce('Progress import failed.', 'warning');
    reader.readAsText(file);
  }
  function startDomainTargetedPractice() {
    if (!selectedPack || !targetDomainId) { announce('Choose a domain before starting Domain focus.', 'info'); return; }
    if (!targetedDomainPlan || !targetedDomainPlan.items.length) { announce('No questions match that domain and difficulty selection.', 'info'); return; }
    const difficultyLabel = targetDifficultyFilter === 'advanced' ? 'advanced only' : targetDifficultyFilter === 'higher-challenge' ? 'intermediate and advanced' : 'all difficulty levels';
    startPracticeSet({
      mode: 'targeted',
      label: 'Domain focus: ' + targetedDomainPlan.domainLabel + ' · ' + difficultyLabel,
      items: targetedDomainPlan.items,
      targetDomainId: targetedDomainPlan.domainId,
      targetDifficulties: targetedDomainPlan.difficulties,
    });
  }

  function startTargetedPractice(skillId) {
    if (!selectedPack) return;
    const skill = skillById[skillId];
    const matching = selectedPack.items.filter((item) => item.examItemStatus !== 'not-approved-as-independent-exam-item' && item.skillIds.includes(skillId)).slice(0, 20);
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
      label: selectedPack.simulationLabel || 'Optional timed simulation',
      items: testPrepBuildSimulationSet(selectedPack),
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
    setTargetDomainId(savedSession.targetDomainId);
    setTargetDifficultyFilter(testPrepTargetDifficultyFilter(savedSession.targetDifficulties));
    setTimeRemainingSeconds(savedSession.timeRemainingSeconds);
    setQuestionIndex(safeIndex);
    setAnswers(savedSession.answers);
    setConfidence(savedSession.confidence);
    setAssistedItemIds(savedSession.assistedItemIds);
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
      targetDomainId,
      targetDifficulties: testPrepTargetDifficultyValues(targetDifficultyFilter),
      sourceStartIndex,
      sourceItemCount: selectedPack ? selectedPack.items.length : 0,
      sourceBatchSize: selectedPack ? selectedPack.batchSize : 0,
      timeLimitMinutes: practiceMode === 'simulation' && selectedPack ? selectedPack.simulationTimeMinutes : 0,
      timedOut: timedOut === true,
      itemIds: activePack ? activePack.items.map((item) => item.id) : [],
      assistedItemIds,
    };
  }

  function finishPractice(timedOut, answerOverride) {
    if (!activePack || !activePack.items.length || result) return;
    const finalAnswers = answerOverride && typeof answerOverride === 'object' ? answerOverride : answers;
    const score = scoreTestPrepAttempt(activePack, finalAnswers);
    const nextProgress = recordTestPrepAttempt(progress, activePack, finalAnswers, confidence, Date.now(), practiceAttemptMetadata(timedOut));
    setProgress(nextProgress);
    setResult(Object.assign({}, score, { timedOut: timedOut === true, assistedItemCount: assistedItemIds.filter((id) => activePack.items.some((item) => item.id === id)).length }));
    if (handsFreeEnabledRef.current) speakTestPrepText('Practice complete. You answered ' + score.correct + ' of ' + score.total + ' correctly. This is a learning result, not an official score.');
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
    setTargetDomainId('');
    setTargetDifficultyFilter('all');
    setTimeRemainingSeconds(0);
  }

  function openSkillReview(skillId) {
    const skill = skillById[skillId];
    if (!skill) { setTab('library'); return; }
    setLibraryMode('chapters');
    setLibraryChapterId(skill.chapterId || '');
    setTab('library');
  }

  function extendSimulationTime() {
    if (practiceMode !== 'simulation' || result) return;
    setTimeRemainingSeconds((seconds) => seconds + 600);
    announce('Ten minutes added to the timed simulation.', 'info');
  }

  function formatPracticeTime(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    return Math.floor(safe / 60) + ':' + String(safe % 60).padStart(2, '0');
  }

  function stopHandsFreeRecognition(suppressRestart = true) {
    if (suppressRestart) handsFreeSuppressRestartRef.current = true;
    const recognition = handsFreeRecognitionRef.current;
    handsFreeRecognitionRef.current = null;
    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch (_) { try { recognition.stop(); } catch (_) {} }
    }
  }

  function startHandsFreeListening() {
    if (!handsFreeEnabledRef.current || !SpeechRecognitionCtor || readAloudAudioRef.current || readAloudUtteranceRef.current || readAloudAbortRef.current) return;
    stopHandsFreeRecognition(false);
    handsFreeSuppressRestartRef.current = false;
    try {
      const recognition = new SpeechRecognitionCtor();
      handsFreeRecognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = 'en-US';
      recognition.onstart = () => { if (handsFreeEnabledRef.current) setHandsFreeStatus('listening'); };
      recognition.onresult = (event) => {
        const transcript = String(event && event.results && event.results[0] && event.results[0][0] && event.results[0][0].transcript || '').trim();
        setHandsFreeTranscript(transcript);
        setHandsFreeStatus('processing');
        stopHandsFreeRecognition(true);
        Promise.resolve(handsFreeCommandHandlerRef.current && handsFreeCommandHandlerRef.current(transcript)).catch(() => {
          setHandsFreeError('That voice command could not be completed.');
          speakTestPrepText('That command could not be completed. Say help to hear the available commands.');
        });
      };
      recognition.onerror = (event) => {
        const code = String(event && event.error || 'unavailable');
        handsFreeRecognitionRef.current = null;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          handsFreeEnabledRef.current = false;
          setHandsFreeEnabled(false);
          setHandsFreeStatus('unavailable');
          setHandsFreeError('Microphone permission is required for hands-free commands.');
          announce('Microphone permission is required for hands-free Test Prep.', 'warning');
          return;
        }
        if (code !== 'aborted' && code !== 'no-speech') setHandsFreeError('Voice recognition paused. It will retry automatically.');
      };
      recognition.onend = () => {
        handsFreeRecognitionRef.current = null;
        if (handsFreeSuppressRestartRef.current) { handsFreeSuppressRestartRef.current = false; return; }
        if (handsFreeEnabledRef.current && !readAloudAudioRef.current && !readAloudUtteranceRef.current && !readAloudAbortRef.current) setTimeout(startHandsFreeListening, 250);
      };
      recognition.start();
    } catch (_) {
      handsFreeRecognitionRef.current = null;
      setHandsFreeStatus('unavailable');
      setHandsFreeError('Voice recognition is unavailable in this browser.');
    }
  }

  function testPrepAudioCacheKey(text) {
    return String(selectedVoice || 'Puck') + '|' + handsFreeRateRef.current.toFixed(2) + '|en|' + String(text || '');
  }

  function prewarmUpcomingQuestionAudio() {
    if (!handsFreeEnabledRef.current || typeof callTTS !== 'function' || !activePack || !currentItem) return;
    try { if (typeof navigator !== 'undefined' && navigator.connection && navigator.connection.saveData) return; } catch (_) {}
    const generation = handsFreeCacheGenerationRef.current;
    for (let offset = 1; offset <= 3; offset += 1) {
      const item = activePack.items[questionIndex + offset];
      if (!item) continue;
      const text = testPrepQuestionSpeechText(item, questionIndex + offset, activePack.items.length);
      const key = testPrepAudioCacheKey(text);
      if (handsFreeAudioCacheRef.current.has(key)) continue;
      const promise = Promise.resolve(callTTS(text, selectedVoice || 'Puck', handsFreeRateRef.current, { maxRetries: 0, priority: 'low', reason: 'test-prep-prewarm', language: 'English' }))
        .then((url) => {
          if (generation !== handsFreeCacheGenerationRef.current || !url) { handsFreeAudioCacheRef.current.delete(key); return null; }
          const entry = handsFreeAudioCacheRef.current.get(key);
          if (entry) entry.url = url;
          return url;
        })
        .catch(() => { handsFreeAudioCacheRef.current.delete(key); return null; });
      handsFreeAudioCacheRef.current.set(key, { promise, url: null });
    }
    while (handsFreeAudioCacheRef.current.size > 12) handsFreeAudioCacheRef.current.delete(handsFreeAudioCacheRef.current.keys().next().value);
  }

  function finishSpokenRequest(requestId, nextStatus) {
    if (requestId !== readAloudRequestRef.current) return;
    readAloudAudioRef.current = null;
    readAloudUtteranceRef.current = null;
    readAloudAbortRef.current = null;
    setReadAloudStatus(nextStatus || 'idle');
    if (handsFreeEnabledRef.current && nextStatus !== 'unavailable') setTimeout(startHandsFreeListening, 100);
  }

  function speakQuestionWithBrowser(text, requestId) {
    if (requestId !== readAloudRequestRef.current) return false;
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.rate = handsFreeRateRef.current;
        readAloudUtteranceRef.current = utterance;
        utterance.onstart = () => { if (requestId === readAloudRequestRef.current) { setReadAloudStatus('speaking'); if (handsFreeEnabledRef.current) setHandsFreeStatus('speaking'); } };
        utterance.onend = () => finishSpokenRequest(requestId, 'idle');
        utterance.onerror = () => {
          if (requestId !== readAloudRequestRef.current) return;
          finishSpokenRequest(requestId, 'unavailable');
          setHandsFreeError('Speech playback is unavailable in this environment.');
          announce('Read-aloud is unavailable in this environment.', 'warning');
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        setReadAloudStatus('speaking');
        if (handsFreeEnabledRef.current) setHandsFreeStatus('speaking');
        return true;
      }
    } catch (_) {}
    finishSpokenRequest(requestId, 'unavailable');
    announce('Read-aloud is unavailable in this environment.', 'warning');
    return false;
  }

  async function speakTestPrepText(text, options) {
    const safeText = String(text || '').trim();
    if (!safeText) return;
    stopHandsFreeRecognition(true);
    stopReadAloud(false);
    const requestId = readAloudRequestRef.current + 1;
    readAloudRequestRef.current = requestId;
    const input = options && typeof options === 'object' ? options : {};
    const cached = input.cacheKey ? handsFreeAudioCacheRef.current.get(input.cacheKey) : null;
    const controller = !cached && typeof AbortController === 'function' ? new AbortController() : null;
    readAloudAbortRef.current = controller || { abort: () => {} };
    setReadAloudStatus('loading');
    if (handsFreeEnabledRef.current) setHandsFreeStatus('speaking');
    try {
      const audioUrl = cached
        ? (cached.url || await cached.promise)
        : typeof callTTS === 'function'
          ? await callTTS(safeText, selectedVoice || 'Puck', handsFreeRateRef.current, controller ? { maxRetries: 2, signal: controller.signal, reason: 'test-prep-playback', language: 'English' } : 2)
          : null;
      if (requestId !== readAloudRequestRef.current) return;
      if (audioUrl && typeof window !== 'undefined' && typeof window.Audio === 'function') {
        const audio = new window.Audio(audioUrl);
        readAloudAudioRef.current = audio;
        audio.onplay = () => { if (requestId === readAloudRequestRef.current) { setReadAloudStatus('speaking'); if (handsFreeEnabledRef.current) setHandsFreeStatus('speaking'); } };
        audio.onended = () => finishSpokenRequest(requestId, 'idle');
        audio.onerror = () => {
          if (requestId !== readAloudRequestRef.current) return;
          audio.onplay = null; audio.onended = null; audio.onerror = null;
          readAloudAudioRef.current = null;
          speakQuestionWithBrowser(safeText, requestId);
        };
        await Promise.resolve(audio.play());
        if (requestId === readAloudRequestRef.current) setReadAloudStatus('speaking');
        return;
      }
    } catch (error) {
      if (controller && controller.signal.aborted) return;
      if (requestId !== readAloudRequestRef.current) return;
      if (readAloudAudioRef.current) {
        readAloudAudioRef.current.onplay = null; readAloudAudioRef.current.onended = null; readAloudAudioRef.current.onerror = null;
        try { readAloudAudioRef.current.pause(); } catch (_) {}
        readAloudAudioRef.current = null;
      }
    }
    if (requestId === readAloudRequestRef.current) speakQuestionWithBrowser(safeText, requestId);
  }

  async function readQuestion() {
    if (!currentItem) return;
    if (readAloudStatus === 'loading' || readAloudStatus === 'speaking') {
      stopReadAloud();
      if (handsFreeEnabledRef.current) setTimeout(startHandsFreeListening, 100);
      announce('Read-aloud stopped.', 'info');
      return;
    }
    const text = testPrepQuestionSpeechText(currentItem, questionIndex, activePack ? activePack.items.length : 1);
    await speakTestPrepText(text, { cacheKey: testPrepAudioCacheKey(text) });
  }

  function disableHandsFree(updateState = true) {
    handsFreeEnabledRef.current = false;
    stopHandsFreeRecognition(true);
    stopReadAloud(false);
    if (updateState) {
      setHandsFreeEnabled(false);
      setHandsFreeStatus('idle');
      setHandsFreeTranscript('');
    }
  }

  function toggleHandsFree() {
    if (handsFreeEnabledRef.current) { disableHandsFree(); announce('Hands-free Test Prep stopped.', 'info'); return; }
    if (!SpeechRecognitionCtor) {
      setHandsFreeStatus('unavailable');
      setHandsFreeError('This browser does not provide speech recognition. Read question remains available.');
      announce('Voice commands are unavailable in this browser. Read-aloud still works.', 'warning');
      return;
    }
    handsFreeAudioCacheRef.current.clear();
    handsFreeCacheGenerationRef.current += 1;
    try { if (typeof window !== 'undefined' && window.__alloVoiceLoop && window.__alloVoiceLoop.isActive && window.__alloVoiceLoop.isActive()) window.__alloVoiceLoop.stop(); } catch (_) {}
    handsFreeEnabledRef.current = true;
    setHandsFreeEnabled(true);
    setHandsFreeStatus('starting');
    setHandsFreeError('');
    setHandsFreeTranscript('');
    announce('Hands-free Test Prep started. Audio pauses the microphone while speaking.', 'success');
  }

  async function askTestPrepClarification(question) {
    const query = String(question || clarificationDraft || '').trim();
    if (!currentItem || !query || clarificationStatus === 'loading') return;
    if (practiceMode === 'simulation') {
      const message = 'AI content clarification is locked during a timed simulation. You can still say repeat question or choose an answer.';
      setClarificationResponse(message);
      if (handsFreeEnabledRef.current) await speakTestPrepText(message);
      return;
    }
    if (typeof callGemini !== 'function') {
      const message = 'AI clarification is unavailable right now. The source-reviewed explanation remains available after you check your answer.';
      setClarificationResponse(message);
      if (handsFreeEnabledRef.current) await speakTestPrepText(message);
      return;
    }
    setClarificationStatus('loading');
    setHandsFreeStatus('processing');
    setClarificationResponse('');
    setAssistedItemIds((previous) => previous.includes(currentItem.id) ? previous : previous.concat(currentItem.id));
    try {
      const raw = await callGemini(testPrepBuildClarificationPrompt(currentItem, query, checked, selectedChoice));
      const response = String(raw && typeof raw === 'object' && raw.text ? raw.text : raw || '').trim().slice(0, 1200) || 'No clarification was returned. Try asking in a different way.';
      setClarificationResponse(response);
      setClarificationStatus('ready');
      setClarificationDraft('');
      if (handsFreeEnabledRef.current) await speakTestPrepText(response);
    } catch (_) {
      const message = 'AI clarification could not be reached. You can continue, repeat the question, or review the sourced explanation after checking your answer.';
      setClarificationResponse(message);
      setClarificationStatus('error');
      if (handsFreeEnabledRef.current) await speakTestPrepText(message);
    }
  }

  async function handleHandsFreeCommand(transcript) {
    const command = testPrepParseHandsFreeCommand(transcript);
    if (checkpoint) {
      if (command.type === 'stop') { disableHandsFree(); return; }
      if (command.type === 'next') { continueAfterCheckpoint(); return; }
      await speakTestPrepText('A diagnostic checkpoint is open. Say next question to continue, or stop hands free.');
      return;
    }
    if (result) {
      if (command.type === 'stop') { disableHandsFree(); return; }
      await speakTestPrepText('Practice is complete. Use the visible buttons to choose another set or view progress, or say stop hands free.');
      return;
    }
    setHandsFreeError('');
    if (command.type === 'stop') { disableHandsFree(); announce('Hands-free Test Prep stopped.', 'info'); return; }
    if (command.type === 'slower' || command.type === 'faster') {
      const nextRate = Math.max(0.75, Math.min(1.25, handsFreeRateRef.current + (command.type === 'faster' ? 0.1 : -0.1)));
      handsFreeRateRef.current = nextRate;
      setHandsFreeRate(nextRate);
      handsFreeAudioCacheRef.current.clear();
      handsFreeCacheGenerationRef.current += 1;
      await speakTestPrepText('Speech rate set to ' + Math.round(nextRate * 100) + ' percent.');
      return;
    }
    if (command.type === 'repeat-question') { await readQuestion(); return; }
    if (command.type === 'repeat-feedback') {
      await speakTestPrepText(checked ? testPrepFeedbackSpeechText(currentItem, selectedChoice) : 'Check your answer before asking to repeat the explanation.');
      return;
    }
    if (command.type === 'choose') {
      if (checked) { await speakTestPrepText('This answer has already been checked. Say next question or repeat explanation.'); return; }
      if (!currentItem || command.choiceIndex >= currentItem.choices.length) { await speakTestPrepText('That answer option is not available for this question.'); return; }
      setSelectedChoice(command.choiceIndex);
      await speakTestPrepText('Selected ' + String.fromCharCode(65 + command.choiceIndex) + ', ' + currentItem.choices[command.choiceIndex] + '. Say check answer, or choose a different option.');
      return;
    }
    if (command.type === 'submit') {
      if (selectedChoice == null) { await speakTestPrepText('Choose an answer before submitting.'); return; }
      if (practiceMode === 'simulation') { advanceSimulation(); return; }
      if (checked) { await speakTestPrepText('Your answer is already checked. Say next question.'); return; }
      checkAnswer();
      await speakTestPrepText(testPrepFeedbackSpeechText(currentItem, selectedChoice));
      return;
    }
    if (command.type === 'next') {
      if (practiceMode === 'simulation') {
        if (selectedChoice == null) { await speakTestPrepText('Choose an answer before continuing.'); return; }
        advanceSimulation(); return;
      }
      if (!checked) { await speakTestPrepText('Check your answer before moving to the next question.'); return; }
      advance(); return;
    }
    if (command.type === 'clarify') { await askTestPrepClarification(command.query); return; }
    if (command.type === 'help') {
      await speakTestPrepText('You can say choose A, check answer, next question, repeat question, repeat explanation, slower, faster, ask followed by a question, or stop hands free.');
      return;
    }
    await speakTestPrepText('I did not recognize that command. Say help to hear the available commands.');
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
      const sourceBatchSize = Math.max(1, metadata.sourceBatchSize || diagnostic.total);
      const sourceBatchNumber = Math.floor(metadata.sourceStartIndex / sourceBatchSize) + diagnostic.batchNumber;
      const sourceConfidentMissQuestionNumbers = diagnostic.confidentMissQuestionNumbers.map((number) => metadata.sourceStartIndex + number);
      const sourceFeedback = diagnostic.feedback.map((message) => message.startsWith('Review confident misses first:') ? 'Review confident misses first: question' + (sourceConfidentMissQuestionNumbers.length === 1 ? ' ' : 's ') + sourceConfidentMissQuestionNumbers.join(', ') + '. High confidence plus an incorrect answer is especially useful calibration feedback.' : message);
      const sourceDiagnostic = Object.assign({}, diagnostic, {
        sourceBatchNumber,
        sourceBatchCount: metadata.sourceItemCount ? Math.ceil(metadata.sourceItemCount / sourceBatchSize) : diagnostic.batchCount,
        sourceFirstQuestion: metadata.sourceStartIndex + diagnostic.firstQuestion,
        sourceLastQuestion: metadata.sourceStartIndex + diagnostic.lastQuestion,
        confidentMissQuestionNumbers: sourceConfidentMissQuestionNumbers,
        feedback: sourceFeedback,
      });
      metadata.itemIds = activePack.items.slice(currentBatch.startIndex, currentBatch.endIndex).map((item) => item.id);
      const nextProgress = recordTestPrepBatchAttempt(progress, activePack, sourceDiagnostic, confidence, Date.now(), metadata);
      setProgress(nextProgress);
      setCheckpoint(Object.assign({}, sourceDiagnostic, { practiceLabel: practiceLabel || ('Batch ' + sourceBatchNumber), assistedItemCount: metadata.assistedItemIds.filter((id) => metadata.itemIds.includes(id)).length }));
      if (handsFreeEnabledRef.current) speakTestPrepText('This practice batch is complete. Review the diagnostic feedback, then say next question to continue.');
      clearTestPrepSession();
      setSavedSession(null);
      announce((practiceLabel || ('Batch ' + diagnostic.batchNumber)) + ' complete. Review the ' + (practiceMode === 'guided-review' ? 'guided-learning' : 'diagnostic') + ' feedback before continuing.', 'success');
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
  const readAloudActive = readAloudStatus === 'loading' || readAloudStatus === 'speaking';
  const readAloudMessage = readAloudStatus === 'loading'
    ? 'Preparing question audio.'
    : readAloudStatus === 'speaking'
      ? 'Reading the question and answer choices.'
      : readAloudStatus === 'unavailable'
        ? 'Read-aloud is unavailable in this environment.'
        : '';

  return (
    <div className="fixed inset-0 z-[290] flex items-center justify-center bg-slate-950/70 p-2 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <style data-test-prep-accessibility-styles="true">{TEST_PREP_LARGE_TEXT_STYLES}</style>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="test-prep-title" data-test-prep-text-size={largeText ? 'large' : 'standard'} className="allo-docsuite flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-4 ring-indigo-300">
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
          <button type="button" aria-pressed={largeText} onClick={() => setLargeText((value) => !value)} className="rounded-lg border border-indigo-200 bg-indigo-800 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 focus:ring-2 focus:ring-white">
            {largeText ? 'Standard text' : 'Larger text'}
          </button>
          <button type="button" onClick={onClose} aria-label="Close Test Prep Hub" className="rounded-lg border border-indigo-200 bg-indigo-800 px-3 py-2 text-lg font-black text-white hover:bg-indigo-700 focus:ring-2 focus:ring-white">{'\u2715'}</button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 pt-2" role="tablist" aria-label="Test Prep Hub sections">
          {[
            ['explore', 'Explore packs'],
            ['practice', 'Practice'],
            ['library', 'Learning library'],
            ['notes', 'Notes & highlights'],
            ['progress', 'Progress'],
          ].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={'whitespace-nowrap rounded-t-lg border-x border-t px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-600 ' + (tab === id ? 'border-indigo-300 bg-white text-indigo-900' : 'border-transparent text-slate-700 hover:bg-slate-100')}>
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
                    {pack.blueprintLabel && <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs leading-relaxed text-sky-950"><strong>Blueprint:</strong> {pack.blueprintLabel}{pack.officialBlueprintUrl && <> | <a href={pack.officialBlueprintUrl} target="_blank" rel="noreferrer" className="font-black underline">Official specification</a></>}</p>}
                    <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-slate-100 p-2"><dt className="font-bold text-slate-700">Domains</dt><dd className="text-slate-900">{pack.domains.length}</dd></div>
                      <div className="rounded-lg bg-slate-100 p-2"><dt className="font-bold text-slate-700">Practice items</dt><dd className="text-slate-900">{pack.items.length}</dd></div>
                    </dl>
                    <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs leading-relaxed text-amber-950">{pack.disclaimer}</p>
                    <button type="button" onClick={() => openPack(pack, 'practice')} className="mt-4 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-black text-white hover:bg-indigo-800 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">
                      {pack.status === 'ready' ? 'Open practice pack' : pack.status === 'preview' ? 'Open preview pack' : 'View migration plan'}
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
                <button type="button" onClick={() => { setLegacyOpen(false); setTab('explore'); }} className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 focus:ring-2 focus:ring-indigo-600">Change pack</button>
              </div>

              {selectedPack.contentReview && (
                <section className="mb-4 rounded-lg border border-violet-300 bg-violet-50 px-3 py-3 text-violet-950" aria-labelledby="content-review-title">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p id="content-review-title" className="text-sm font-bold">Evidence status: {selectedPack.contentReview}</p>
                    <span className="flex flex-wrap gap-3">{selectedPack.assistantAuditUrl && <a href={selectedPack.assistantAuditUrl.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open assistant audit</a>}{selectedPack.nativeQaUrl && <a href={selectedPack.nativeQaUrl.replace(/\.json(?:\?.*)?$/, '.md')} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-800 underline">Open source-review report</a>}</span>
                  </div>
                  {selectedPack.bankDisclosure && <p className="mt-2 text-sm leading-relaxed"><strong>Bank disclosure:</strong> {selectedPack.bankDisclosure}</p>}
                  <div className="mt-3 grid gap-2 border-t border-violet-200 pt-3 text-xs leading-relaxed sm:grid-cols-2">
                    <p><strong>{selectedPack.assistantReviewVerdict ? 'Assistant review completed' : 'Source review recorded'}</strong><br />The displayed evidence status records the completed review scope and its verdict; it does not convert parallel forms or guided review into independent exam questions.</p>
                    <p><strong>Independent professional and psychometric validation is separate</strong><br />This tool does not claim licensed-professional endorsement, field testing, score calibration, or official-form status.</p>
                    <p className="sm:col-span-2"><strong>Expert validation is in progress — and you can help.</strong><br />Educators are reviewing these items now. Spot something wrong in a question? Use <strong>Suggest a correction</strong> on any item to send a fix for review, the same way translation and bug fixes are sent.</p>
                  </div>
                </section>
              )}

              {selectedPack.transitionNotice && (
                <section className="mb-4 rounded-lg border border-sky-300 bg-sky-50 px-3 py-3 text-sm leading-relaxed text-sky-950" aria-labelledby="blueprint-transition-title">
                  <p id="blueprint-transition-title" className="font-black">Blueprint version and scheduled transition</p>
                  <p className="mt-1">{selectedPack.blueprintEffective || selectedPack.blueprintLabel}</p>
                  <p className="mt-2">{selectedPack.transitionNotice} {selectedPack.transitionUrl && <a href={selectedPack.transitionUrl} target="_blank" rel="noreferrer" className="font-black underline">Read the official future blueprint.</a>}</p>
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
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">{selectedPack.guidedReviewBatchCount ? selectedPack.assistantAuthoredIndependentBatchCount ? 'Choose from ' + selectedPack.sourceDiagnosticBatchCount + ' source-question diagnostic banks, ' + selectedPack.assistantAuthoredIndependentBatchCount + ' assistant-authored independent diagnostic bank' + (selectedPack.assistantAuthoredIndependentBatchCount === 1 ? '' : 's') + ', and ' + selectedPack.guidedReviewBatchCount + ' guided-reasoning review banks. Each includes answer explanations, confidence calibration, and end-of-bank feedback; guided banks reinforce source items and are not additional independent exam questions.' : 'Choose from ' + selectedPack.sourceDiagnosticBatchCount + ' source-question diagnostic banks and ' + selectedPack.guidedReviewBatchCount + ' guided-reasoning review banks. Each includes answer explanations, confidence calibration, and end-of-bank feedback; guided banks reinforce source items and are not additional independent exam questions.' : 'Choose any of the ' + Math.ceil(selectedPack.items.length / selectedPack.batchSize) + ' practice banks. Each bank includes ' + selectedPack.batchSize + ' questions, answer explanations, confidence calibration, and diagnostic feedback. Targeted sets and the optional timed simulation remain available below.'}</p>

                  {savedSession && savedSession.packId === selectedPack.id && (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                      <div><p className="font-black text-emerald-950">Resume saved practice</p><p className="text-sm text-emerald-900">{savedSession.label || 'Saved set'} ? question {Math.min(savedSession.questionIndex + 1, savedSession.itemIds.length)} of {savedSession.itemIds.length}</p></div>
                      <button type="button" onClick={resumeSavedPractice} className="rounded-lg bg-emerald-700 px-4 py-2 font-black text-white focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2">Resume</button>
                    </div>
                  )}

                  <section className="mt-5 rounded-2xl border border-sky-300 bg-sky-50/60 p-4" aria-labelledby="practice-banks-title">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div><p className="text-xs font-black uppercase tracking-wide text-sky-800">{selectedPack.guidedReviewBatchCount ? 'Learning activity banks' : 'Practice banks'}</p><h5 id="practice-banks-title" className="text-xl font-black text-slate-900">Choose a {selectedPack.batchSize}{selectedPack.guidedReviewBatchCount ? '-activity' : '-question practice'} bank</h5></div>
                      <p className="text-sm font-bold text-sky-900">{Math.ceil(selectedPack.items.length / selectedPack.batchSize)} banks {'·'} {selectedPack.items.length.toLocaleString()} {selectedPack.guidedReviewBatchCount ? 'learning activities total' : 'questions total'}</p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {Array.from({ length: Math.ceil(selectedPack.items.length / selectedPack.batchSize) }, (_, batchIndex) => {
                      const start = batchIndex * selectedPack.batchSize;
                      const count = Math.min(selectedPack.batchSize, selectedPack.items.length - start);
                      const bankNumber = batchIndex + 1;
                      const section = selectedPack.sections[batchIndex];
                      const guided = section && section.kind === 'guided-review';
                      const independent = section && section.kind === 'independent-diagnostic';
                      const classified = guided || independent || section && section.kind === 'source-diagnostic';
                      const guidedNumber = batchIndex - Math.max(0, selectedPack.independentDiagnosticBatchCount || selectedPack.sourceDiagnosticBatchCount) + 1;
                      const bankLabel = classified ? section.label : 'Practice Bank ' + bankNumber;
                      const prior = packAttempts.filter((attempt) => attempt.mode === (guided ? 'guided-review' : 'diagnostic') && attempt.batchNumber === bankNumber);
                      const latest = prior.length ? prior[prior.length - 1] : null;
                      return <article key={'diagnostic-' + batchIndex} className="flex min-h-52 flex-col rounded-xl border border-sky-300 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-sky-800">{bankLabel}</p><h6 className="mt-1 text-lg font-black text-slate-900">{selectedPack.guidedReviewBatchCount ? 'Activities ' : 'Questions '}{start + 1}{'–'}{start + count}</h6><p className="mt-2 text-sm text-slate-700">{guided ? count + ' source-derived guided reasoning activities with feedback; these are not independent exam questions.' : independent ? count + ' assistant-authored independent practice questions with item-specific feedback; these are not official or psychometrically calibrated exam items.' : count + ' untimed source questions with answer explanations and an end-of-bank diagnostic.'}</p><p className={'mt-3 text-xs font-bold ' + (latest ? 'text-emerald-800' : 'text-slate-600')}>{latest ? 'Latest: ' + latest.correct + '/' + latest.total + ' · ' + latest.percent + '% · ' + prior.length + ' attempt' + (prior.length === 1 ? '' : 's') : 'Not started on this browser'}</p><button type="button" onClick={() => startDiagnosticBatch(batchIndex)} className="mt-auto rounded-lg bg-sky-800 px-3 py-2 font-black text-white focus:ring-2 focus:ring-sky-600 focus:ring-offset-2">{guided ? 'Start Guided Review ' + guidedNumber : 'Start Practice Bank ' + bankNumber}</button></article>;
                    })}
                    </div>
                  </section>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <article className="rounded-xl border border-fuchsia-300 bg-fuchsia-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-fuchsia-800">Transparent smart review</p>
                      <h5 className="mt-1 text-lg font-black text-slate-900">{smartReviewPlan && smartReviewPlan.attemptCount ? 'Review what needs another retrieval' : 'Start with a balanced review set'}</h5>
                      <p className="mt-2 text-sm leading-relaxed text-fuchsia-950">{smartReviewPlan && smartReviewPlan.attemptCount ? 'Builds a 20-question set from confident misses, prior misses, low-confidence correct responses, weaker domains, and unseen items.' : 'Until practice history exists, the engine rotates across this pack’s domains. It never estimates ability or predicts passing.'}</p>
                      {smartReviewPlan && smartReviewPlan.priorityDomains.length > 0 && <p className="mt-3 text-xs font-bold text-fuchsia-900">Current priority: {smartReviewPlan.priorityDomains.map((domain) => domain.label + ' (' + domain.percent + '%)').join(' · ')}</p>}
                      <button type="button" disabled={!smartReviewPlan || !smartReviewPlan.items.length} onClick={startSmartReview} className="mt-4 rounded-lg bg-fuchsia-800 px-4 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-fuchsia-600 focus:ring-offset-2">Start {smartReviewPlan && smartReviewPlan.attemptCount ? 'smart review' : 'balanced review'}</button>
                    </article>                    <article className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-emerald-800">Saved-question review</p>
                      <h5 className="mt-1 text-lg font-black text-slate-900">{savedReviewItemIds.length} question{savedReviewItemIds.length === 1 ? '' : 's'} saved</h5>
                      <p className="mt-2 text-sm leading-relaxed text-emerald-950">Build a focused set from questions you marked while practicing this pack. Saved questions remain on this browser until you remove them.</p>
                      <button type="button" disabled={!savedReviewItemIds.length} onClick={startSavedQuestionReview} className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2">Review {savedReviewItemIds.length} saved question{savedReviewItemIds.length === 1 ? '' : 's'}</button>
                    </article>
                    <article className="rounded-xl border border-violet-300 bg-violet-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-violet-800">Targeted practice</p>
                      <h5 className="mt-1 text-lg font-black text-slate-900">Practice one domain or tagged skill</h5>
                      <p className="mt-2 text-sm leading-relaxed text-violet-950">Domain focus works for every released pack, including packs without a separate skill catalog. Difficulty labels describe editorial item tiers, not an ability estimate.</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-bold text-slate-800">Domain<select aria-label="Domain focus domain" value={targetDomainId} onChange={(event) => setTargetDomainId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:ring-2 focus:ring-violet-600"><option value="">Choose a domain</option>{selectedPack.domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.label}</option>)}</select></label>
                        <label className="text-sm font-bold text-slate-800">Difficulty<select aria-label="Domain focus difficulty" value={targetDifficultyFilter} onChange={(event) => setTargetDifficultyFilter(['higher-challenge', 'advanced'].includes(event.target.value) ? event.target.value : 'all')} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:ring-2 focus:ring-violet-600"><option value="all">All available levels</option><option value="higher-challenge">Intermediate and advanced</option><option value="advanced">Advanced only</option></select></label>
                      </div>
                      <p className="mt-3 text-xs font-bold text-violet-950" role="status">{!targetDomainId ? 'Choose a domain to build a focused set.' : targetedDomainPlan && targetedDomainPlan.items.length ? targetedDomainPlan.items.length + ' of ' + targetedDomainPlan.eligibleCount + ' matching questions ready.' : 'No questions match this domain and difficulty selection.'}</p>
                      <button type="button" disabled={!targetedDomainPlan || !targetedDomainPlan.items.length} onClick={startDomainTargetedPractice} className="mt-3 rounded-lg bg-violet-800 px-4 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-violet-600 focus:ring-offset-2">Start Domain focus</button>
                      {availableSkills.length > 0 && <div className="mt-4 border-t border-violet-300 pt-4"><p className="text-xs font-black uppercase tracking-wide text-violet-800">Tagged skill focus</p><label className="mt-2 block text-sm font-bold text-slate-800">Skill<select aria-label="Target practice skill" value={targetSkillId} onChange={(event) => setTargetSkillId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:ring-2 focus:ring-violet-600"><option value="">Choose a skill</option>{availableSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.domain}: {skill.label}</option>)}</select></label><button type="button" disabled={!targetSkillId} onClick={() => startTargetedPractice(targetSkillId)} className="mt-3 rounded-lg border border-violet-700 bg-white px-4 py-2 font-black text-violet-950 disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-violet-600 focus:ring-offset-2">Start targeted set</button></div>}
                    </article>
                    <article className="rounded-xl border border-cyan-300 bg-cyan-50 p-4 md:col-span-2 lg:col-span-3">
                      <p className="text-xs font-black uppercase tracking-wide text-cyan-900">Custom quiz builder</p>
                      <h5 className="mt-1 text-lg font-black text-slate-900">Choose domains, length, and a reproducible variation</h5>
                      <p className="mt-2 text-sm leading-relaxed text-cyan-950">The engine balances selected domains and uses a visible variation number, so the same choices reproduce the same set. It does not create an official form or readiness estimate.</p>
                      <fieldset className="mt-4">
                        <legend className="text-sm font-black text-slate-900">Domains</legend>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {selectedPack.domains.map((domain) => <label key={domain.id} className="flex items-start gap-2 rounded-lg border border-cyan-200 bg-white p-2 text-sm font-bold text-slate-800"><input type="checkbox" checked={!customQuizDomainIds.length || customQuizDomainIds.includes(domain.id)} onChange={() => toggleCustomQuizDomain(domain.id)} className="mt-1 h-4 w-4 rounded border-slate-400 text-cyan-800 focus:ring-cyan-700" /><span>{domain.label}</span></label>)}
                        </div>
                        <button type="button" onClick={() => setCustomQuizDomainIds([])} className="mt-2 text-xs font-black text-cyan-900 underline focus:ring-2 focus:ring-cyan-700">Select all domains</button>
                      </fieldset>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-bold text-slate-800">Number of questions<input aria-label="Custom quiz question count" type="number" min="1" max="100" value={customQuizLength} onChange={(event) => setCustomQuizLength(Math.max(1, Math.min(100, Math.floor(Number(event.target.value) || 1))))} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:ring-2 focus:ring-cyan-700" /></label>
                        <label className="text-sm font-bold text-slate-800">Variation<select aria-label="Custom quiz variation" value={customQuizVariant} onChange={(event) => setCustomQuizVariant(Math.max(1, Math.min(5, Number(event.target.value) || 1)))} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:ring-2 focus:ring-cyan-700">{[1, 2, 3, 4, 5].map((variant) => <option key={variant} value={variant}>Variation {variant}</option>)}</select></label>
                      </div>
                      <p className="mt-3 text-xs font-bold text-cyan-950" role="status">Ready: {customQuizPlan ? customQuizPlan.items.length : 0} questions across {customQuizPlan ? customQuizPlan.domainIds.length : 0} selected domains.</p>
                      <button type="button" disabled={!customQuizPlan || !customQuizPlan.items.length} onClick={startCustomQuiz} className="mt-4 rounded-lg bg-cyan-900 px-4 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2">Start custom quiz</button>
                    </article>                    {!!selectedPack.simulationItemCount && !!selectedPack.simulationTimeMinutes && (
                      <article className="rounded-xl border border-amber-400 bg-amber-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-amber-900">{selectedPack.simulationLabel || 'Optional timed simulation'}</p>
                        <h5 className="mt-1 text-lg font-black text-slate-900">{selectedPack.simulationItemCount} questions / {selectedPack.simulationTimeMinutes} minutes</h5>
                        {!!selectedPack.simulationNote && <p className="mt-2 rounded-lg border border-amber-300 bg-white/70 p-3 text-sm font-bold leading-relaxed text-amber-950">{selectedPack.simulationNote}</p>}
                        <p className="mt-2 text-sm leading-relaxed text-amber-950">This mode hides answer feedback until the set ends and treats unanswered items as incorrect. It is independent practice, not an official test form, scaled score, or pass prediction. You can add 10 minutes at any time, as often as needed.</p>
                        <button type="button" onClick={startTimedSimulation} className="mt-4 rounded-lg bg-amber-800 px-4 py-2 font-black text-white focus:ring-2 focus:ring-amber-700 focus:ring-offset-2">Start timed simulation</button>
                      </article>
                    )}
                  </div>
                </section>
              )}

              {!legacyOpen && !!selectedPack.items.length && checkpoint && (
                <section className="rounded-2xl border border-sky-300 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="batch-checkpoint-title" aria-live="polite">
                  <p className="text-xs font-black uppercase tracking-wider text-sky-800">{practiceMode === 'guided-review' ? 'Activities ' : 'Questions '}{checkpoint.sourceFirstQuestion || checkpoint.firstQuestion}{'–'}{checkpoint.sourceLastQuestion || checkpoint.lastQuestion}</p>
                  <h4 id="batch-checkpoint-title" className="mt-1 text-2xl font-black text-slate-900">{checkpoint.practiceLabel && !/^Batch \d+$/i.test(checkpoint.practiceLabel) ? checkpoint.practiceLabel : ('Batch ' + checkpoint.batchNumber + ' of ' + checkpoint.batchCount)} checkpoint</h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-sky-50 p-4"><p className="text-3xl font-black text-sky-950">{checkpoint.correct}/{checkpoint.total}</p><p className="text-sm font-bold text-sky-900">{practiceMode === 'guided-review' ? 'Correct in this guided bank' : 'Correct in this batch'}</p></div>
                    <div className="rounded-xl bg-indigo-50 p-4"><p className="text-3xl font-black text-indigo-950">{checkpoint.percent}%</p><p className="text-sm font-bold text-indigo-900">{practiceMode === 'guided-review' ? 'Guided-practice accuracy' : 'Batch accuracy'}</p></div>
                    <div className="rounded-xl bg-amber-50 p-4"><p className="text-3xl font-black text-amber-950">{checkpoint.confidentMissQuestionNumbers.length}</p><p className="text-sm font-bold text-amber-900">Confident misses</p></div>
                  </div>
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{practiceMode === 'guided-review' ? 'This checkpoint describes source-derived guided practice and is excluded from diagnostic analytics.' : currentSection && currentSection.kind === 'independent-diagnostic' ? 'This checkpoint describes assistant-authored independent practice questions in this diagnostic bank.' : 'This checkpoint describes practice in this source-question batch.'} It is not an official score, pass prediction, or readiness classification.</p>
                  <div className="mt-5 overflow-hidden rounded-xl border border-slate-300">
                    <table className="w-full text-left text-sm">
                      <caption className="bg-slate-100 px-4 py-3 text-left font-black text-slate-900">{practiceMode === 'guided-review' ? 'Domain breakdown for guided review' : currentSection && currentSection.kind === 'independent-diagnostic' ? 'Domain diagnostic for this independent-practice bank' : selectedPack.guidedReviewBatchCount ? 'Domain diagnostic for this source-question batch' : 'Domain diagnostic for this batch'}</caption>
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
                      <h5 id="recommended-review-title" className="font-black text-indigo-950">{practiceMode === 'guided-review' ? 'Optional follow-up from guided review' : 'Recommended review from this diagnostic'}</h5>
                      <p className="mt-1 text-sm text-indigo-900">These suggestions point to the lowest-accuracy tagged skills in this batch; they are study priorities, not readiness classifications.</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {checkpoint.focusSkillIds.map((skillId) => {
                          const skill = skillById[skillId];
                          const row = checkpoint.skillRows.find((entry) => entry.id === skillId);
                          return <article key={skillId} className="rounded-lg border border-indigo-200 bg-white p-3"><p className="font-black text-slate-900">{skill ? skill.label : skillId.replace(/-/g, ' ')}</p>{row && <p className="mt-1 text-xs font-bold text-slate-600">{row.correct}/{row.total} correct ? {row.percent}% in this batch</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => openSkillReview(skillId)} className="rounded-lg border border-indigo-500 bg-indigo-50 px-3 py-2 text-sm font-black text-indigo-950 focus:ring-2 focus:ring-indigo-600">Review chapter</button><button type="button" onClick={() => startTargetedPractice(skillId)} className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-black text-white focus:ring-2 focus:ring-indigo-600">Practice this skill</button></div></article>;
                        })}
                      </div>
                    </section>
                  )}
                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    {selectedPack.learningLibraryUrl && <button type="button" onClick={() => setTab('library')} className="rounded-xl border border-slate-400 bg-white px-5 py-3 font-black text-slate-900 hover:bg-slate-100 focus:ring-2 focus:ring-indigo-600">Review learning library</button>}
                    <button type="button" onClick={continueAfterCheckpoint} className="rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">{checkpoint.isFinalBatch ? 'View overall summary' : 'Continue to batch ' + (checkpoint.batchNumber + 1)}</button>
                  </div>
                </section>
              )}

              {!legacyOpen && !!selectedPack.items.length && result && (
                <section className="rounded-2xl border border-emerald-300 bg-white p-6 text-center shadow-sm" aria-live="polite">
                  <p className="text-sm font-black uppercase tracking-wider text-emerald-800">{practiceLabel || 'Practice complete'}</p>
                  <p className="mt-2 text-5xl font-black text-slate-900">{result.correct}/{result.total}</p>
                  <p className="mt-2 text-lg font-bold text-slate-800">{result.percent}% correct in this practice set</p>
                  {result.timedOut && <p className="mx-auto mt-3 max-w-xl rounded-lg bg-sky-50 p-3 text-sm font-bold text-sky-950">The timer ended before the set was submitted. Unanswered questions are included as incorrect in this practice summary.</p>}
                  {!!result.assistedItemCount && <p className="mx-auto mt-3 max-w-xl rounded-lg border border-violet-300 bg-violet-50 p-3 text-sm font-bold text-violet-950">AI clarification was used on {result.assistedItemCount} item{result.assistedItemCount === 1 ? '' : 's'}. Narration and voice navigation do not mark an item assisted.</p>}
                  <p className="mx-auto mt-3 max-w-xl rounded-lg bg-amber-50 p-3 text-sm text-amber-950">This is a learning result, not an official score, scaled score, pass prediction, certification, license, or evidence of professional competence.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button type="button" onClick={selectedPack.simulationItemCount ? chooseAnotherPracticeSet : () => openPack(selectedPack, 'practice')} className="rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">{selectedPack.simulationItemCount ? 'Choose another practice set' : 'Practice again'}</button>
                    <button type="button" onClick={() => setTab('progress')} className="rounded-xl border border-slate-400 bg-white px-5 py-3 font-black text-slate-900 hover:bg-slate-100 focus:ring-2 focus:ring-indigo-600">View progress</button>
                  </div>
                </section>
              )}

              {!legacyOpen && !!selectedPack.items.length && !result && currentItem && (
                <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-xs font-black uppercase tracking-wide text-indigo-700">{practiceLabel || 'Practice set'}</p><p className="font-black text-indigo-900">{practiceMode === 'guided-review' ? 'Guided-review activity ' : 'Question '}{questionIndex + 1} of {activePack.items.length}</p>{practiceMode === 'diagnostic' && <p className="mt-1 text-sm font-bold text-sky-800">{currentSection && currentSection.kind === 'independent-diagnostic' ? 'Independent-practice bank item ' : selectedPack.guidedReviewBatchCount ? 'Source-question bank item ' : 'Question bank item '}{sourceStartIndex + questionIndex + 1} of {selectedPack.items.length}</p>}{practiceMode === 'guided-review' && <p className="mt-1 text-sm font-bold text-violet-800">Guided activity {sourceStartIndex + questionIndex + 1} of {selectedPack.items.length}; this score is excluded from diagnostic analytics.</p>}{currentBatch && currentBatch.batchCount > 1 && <p className="mt-1 text-sm font-bold text-slate-700">Batch {currentBatch.batchNumber} of {currentBatch.batchCount} · Question {currentBatch.position} of {currentBatch.itemCount}</p>}{practiceMode === 'simulation' && <div className="mt-2 flex flex-wrap items-center gap-2"><p className="text-lg font-black text-amber-900" role="timer">Time remaining {formatPracticeTime(timeRemainingSeconds)}</p><button type="button" onClick={extendSimulationTime} className="rounded-lg border border-amber-600 bg-amber-50 px-3 py-2 text-sm font-black text-amber-950 focus:ring-2 focus:ring-amber-700 focus:ring-offset-2">Add 10 minutes</button>{timeRemainingSeconds <= 60 && <p className="w-full text-sm font-bold text-rose-800" role="status" aria-live="polite">One minute or less remains. Use Add 10 minutes now if you need more time.</p>}</div>}</div>
                    <button type="button" aria-pressed={readAloudActive} onClick={readQuestion} className="rounded-lg border border-indigo-400 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-900 hover:bg-indigo-100 focus:ring-2 focus:ring-indigo-600">{'\uD83D\uDD0A'} {readAloudStatus === 'loading' ? 'Preparing audio' : readAloudStatus === 'speaking' ? 'Stop reading' : 'Read question'}</button>
                    <button type="button" aria-pressed={handsFreeEnabled} onClick={toggleHandsFree} className={'rounded-lg border px-3 py-2 text-sm font-black focus:ring-2 focus:ring-cyan-700 ' + (handsFreeEnabled ? 'border-cyan-700 bg-cyan-700 text-white' : 'border-cyan-500 bg-cyan-50 text-cyan-950')}>{handsFreeEnabled ? '\uD83C\uDFA4 Stop hands-free' : '\uD83C\uDFA4 Hands-free mode'}</button>
                    {currentItem.examItemStatus !== 'not-approved-as-independent-exam-item' && <button type="button" aria-pressed={currentItemSavedForReview} onClick={() => toggleSavedForReview(currentItem.id)} className={'rounded-lg border px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-600 ' + (currentItemSavedForReview ? 'border-emerald-600 bg-emerald-50 text-emerald-950' : 'border-indigo-400 bg-indigo-50 text-indigo-900')}>{currentItemSavedForReview ? 'Remove from review' : 'Save for review'}</button>}
                    <button type="button" onClick={() => beginAnnotation({ targetType: 'question', targetId: currentItem.id, targetLabel: 'Question: ' + currentItem.prompt })} className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950 focus:ring-2 focus:ring-amber-600">Add note or highlight</button>
                    <button type="button" onClick={() => { try { window.AlloModules && window.AlloModules.ItemCorrection && window.AlloModules.ItemCorrection.openFor({ packId: selectedPack.id, packTitle: selectedPack.title, itemId: currentItem.id, prompt: currentItem.prompt, domain: currentItem.domainId, reviewTier: currentItem.examItemStatus === 'not-approved-as-independent-exam-item' ? 'guided-review' : 'source-reviewed', currentAnswer: currentItem.choices[currentItem.answerIndex] }); } catch (_) {} }} className="rounded-lg border border-teal-400 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-900 focus:ring-2 focus:ring-teal-600">Suggest a correction</button>
                    <button type="button" onClick={chooseAnotherPracticeSet} className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600">Practice options</button>
                  </div>
                  <p role="status" aria-live="polite" className={readAloudStatus === 'unavailable' ? 'mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950' : 'sr-only'}>{readAloudMessage}</p>
                  {(handsFreeEnabled || handsFreeError) && <section className="mt-4 rounded-xl border border-cyan-300 bg-cyan-50 p-4" aria-labelledby="test-prep-hands-free-title">
                    <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 id="test-prep-hands-free-title" className="font-black text-cyan-950">Hands-free Test Prep</h4><p className="mt-1 text-sm text-cyan-950">The microphone pauses during narration. Audio for the next three questions is prepared quietly when cloud speech is available.</p></div><span className="rounded-full border border-cyan-500 bg-white px-3 py-1 text-xs font-black uppercase text-cyan-950" role="status" aria-live="polite">{handsFreeEnabled ? handsFreeStatus : 'off'} - {Math.round(handsFreeRate * 100)}% speed</span></div>
                    {handsFreeEnabled && <p className="mt-3 text-sm font-semibold text-cyan-950">Say: choose B; check answer; next question; repeat question; repeat explanation; slower; faster; ask followed by a question; or stop hands free.</p>}
                    {!!handsFreeTranscript && <p className="mt-2 rounded-lg border border-cyan-200 bg-white p-2 text-sm text-slate-800"><strong>Heard:</strong> {handsFreeTranscript}</p>}
                    {!!handsFreeError && <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm font-bold text-amber-950">{handsFreeError}</p>}
                    {handsFreeEnabled && <div className="mt-3 border-t border-cyan-200 pt-3"><label htmlFor="test-prep-clarification" className="text-sm font-black text-slate-900">Ask for clarification</label><p className="mt-1 text-xs text-slate-700">Before checking, AI may only clarify neutral wording or definitions. After checking, it may discuss the sourced rationale. Use is labeled as assisted; narration alone is not.</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input id="test-prep-clarification" value={clarificationDraft} onChange={(event) => setClarificationDraft(event.target.value)} disabled={practiceMode === 'simulation' || clarificationStatus === 'loading'} placeholder={practiceMode === 'simulation' ? 'Locked during timed simulation' : 'Example: What does this term mean?'} className="min-w-0 flex-1 rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-cyan-700 disabled:bg-slate-100" /><button type="button" onClick={() => askTestPrepClarification()} disabled={!clarificationDraft.trim() || practiceMode === 'simulation' || clarificationStatus === 'loading'} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-violet-600">{clarificationStatus === 'loading' ? 'Clarifying...' : 'Ask AI'}</button></div>{practiceMode === 'simulation' && <p className="mt-2 text-xs font-bold text-amber-900">Content coaching is locked during timed simulation; narration, answer selection, and navigation remain available.</p>}{!!clarificationResponse && <div className="mt-3 rounded-lg border border-violet-300 bg-white p-3 text-sm leading-relaxed text-slate-900" role="status" aria-live="polite"><p className="font-black text-violet-950">AI clarification - assisted item</p><p className="mt-1">{clarificationResponse}</p></div>}</div>}
                  </section>}
                  {currentItem.competencyTag && <p className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm leading-relaxed text-indigo-950"><strong>Unofficial integrated 2027 blueprint practice · {currentItem.competencyTag}</strong>{currentItem.competencyLabel ? ' - ' + currentItem.competencyLabel : ''}</p>}
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
                      {selectedChoice !== currentItem.answerIndex && <div className="mt-3 grid gap-2 rounded-lg border border-amber-300 bg-white/80 p-3 text-sm text-slate-900 sm:grid-cols-2"><p><strong>Your answer:</strong><br />{String.fromCharCode(65 + selectedChoice)}. {currentItem.choices[selectedChoice]}</p><p><strong>Supported answer:</strong><br />{String.fromCharCode(65 + currentItem.answerIndex)}. {currentItem.choices[currentItem.answerIndex]}</p></div>}
                      <p className="mt-2 text-sm leading-relaxed text-slate-800">{currentItem.rationale}</p>
                      {currentItem.choiceRationales.length === currentItem.choices.length && (
                        <div className="mt-3 rounded-lg border border-slate-300 bg-white/70 p-3 text-sm text-slate-800">
                          <p className="font-black text-slate-900">Why the other options do not fit</p>
                          <ul className="mt-2 space-y-3">
                            {currentItem.choices.map((choice, index) => index === currentItem.answerIndex ? null : (
                              <li key={currentItem.id + '-rationale-' + index} className={selectedChoice === index ? 'rounded-lg border border-rose-300 bg-rose-50 p-2' : ''}>
                                <p className="flex flex-wrap items-center gap-2 font-bold"><span>{String.fromCharCode(65 + index)}. {choice}</span>{selectedChoice === index && <span className="rounded-full bg-rose-700 px-2 py-0.5 text-xs font-black text-white">Your answer</span>}</p>
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
                              return <li key={reference} className="rounded-lg border border-slate-200 bg-white p-3"><a href={reference} target="_blank" rel="noreferrer" className="font-black text-indigo-800 underline">{source.title}</a>{source.organization && <p className="mt-1 font-bold text-slate-800">{source.organization}</p>}<p className="mt-1 leading-relaxed"><strong>Brief source summary:</strong> {source.summary || 'This source provides context for the related answer explanation; open it to review the complete scope and limitations.'}</p><p className="mt-1 leading-relaxed"><strong>Why this source is credible:</strong> {source.credibility}</p></li>;
                            })}
                          </ul>
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">How certain were you?</span>
                        {['sure', 'unsure', 'guess'].map((value) => (
                          <button key={value} type="button" aria-pressed={confidence[currentItem.id] === value} onClick={() => setItemConfidence(value)} className={'rounded-full border px-3 py-1 text-sm font-bold focus:ring-2 focus:ring-indigo-600 ' + (confidence[currentItem.id] === value ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-400 bg-white text-slate-800 hover:bg-slate-100')}>{value === 'sure' ? 'I knew it' : value === 'unsure' ? 'I was unsure' : 'I guessed'}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    {practiceMode === 'simulation' ? (
                      <button type="button" disabled={selectedChoice == null} onClick={advanceSimulation} className="rounded-xl bg-amber-800 px-5 py-3 font-black text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-amber-700 focus:ring-offset-2">{questionIndex >= activePack.items.length - 1 ? 'Submit timed simulation' : 'Save answer and continue'}</button>
                    ) : !checked ? (
                      <button type="button" disabled={selectedChoice == null} onClick={checkAnswer} className="rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Check answer</button>
                    ) : (
                      <button type="button" onClick={advance} className="rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">{currentBatch && activePack.items.length >= currentBatch.batchSize && questionIndex + 1 >= currentBatch.endIndex ? 'View diagnostic feedback' : questionIndex >= activePack.items.length - 1 ? 'Finish practice' : 'Next question'}</button>
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
                {libraryChapterId && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => beginAnnotation({ targetType: 'chapter', targetId: libraryChapterId, targetLabel: 'Chapter: ' + (((learningLibrary && learningLibrary.chapters || []).find((chapter) => chapter.id === libraryChapterId) || {}).title || libraryChapterId) })} className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950 focus:ring-2 focus:ring-amber-600">Add chapter note</button><button type="button" onClick={() => setLibraryChapterId('')} className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600">Back to chapter catalog</button></div>}
              </div>

              <nav className="flex flex-wrap gap-2" aria-label="Learning library modes">
                {([['search', 'Search all'], ['chapters', 'Chapters'], ['flashcards', 'Flashcards'], ['memory-aids', 'Memory aids']].concat(learningLibrary && Array.isArray(learningLibrary.constructedResponseWorkshops) && learningLibrary.constructedResponseWorkshops.length ? [['constructed-response', learningLibrary.workshopLabel || 'Written-response workshops']] : [])).map(([id, label]) => <button key={id} type="button" aria-pressed={libraryMode === id} onClick={() => { setLibraryMode(id); setLibraryChapterId(''); setFlashcardRevealed(false); setMemoryAidOpen(''); }} className={'rounded-lg border px-4 py-2 text-sm font-black focus:ring-2 focus:ring-indigo-600 ' + (libraryMode === id ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-400 bg-white text-slate-800')}>{label}</button>)}
              </nav>

              {learningLibraryStatus === 'loading' && <p className="rounded-xl border border-indigo-200 bg-white p-5 text-sm font-bold text-indigo-900" role="status">Loading the learning library…</p>}
              {learningLibraryStatus === 'unavailable' && <p className="rounded-xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-950" role="alert">The learning catalog could not be loaded from AlloFlow's content network. Practice questions remain available from the Practice tab.</p>}

              {learningLibrary && !libraryChapterId && libraryMode === 'search' && (
                <section className="space-y-4" aria-labelledby="library-global-search-title">
                  <div className="rounded-2xl border border-indigo-300 bg-indigo-50 p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-indigo-800">One pack-wide index</p>
                    <h4 id="library-global-search-title" className="mt-1 text-xl font-black text-slate-900">Search questions and learning resources</h4>
                    <p className="mt-2 text-sm leading-relaxed text-indigo-950">Searches released practice questions, chapters, flashcards, memory aids, and written-response workshops for this pack. Content that has not passed its release gate is excluded.</p>
                    <label className="mt-4 block text-sm font-black text-slate-900">Search the complete released pack<input aria-label="Search the complete released pack" value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} type="search" className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-3 font-normal focus:ring-2 focus:ring-indigo-600" placeholder="Try assessment, phonology, ethics, evidence…" /></label>
                  </div>
                  {globalSearch.query ? <p className="text-sm font-bold text-slate-700" role="status">Found {globalSearch.total} result{globalSearch.total === 1 ? '' : 's'}; showing {globalSearch.results.length}.</p> : <p className="rounded-xl border border-slate-300 bg-white p-5 text-sm text-slate-700">Enter a word or phrase to search all released content in this pack.</p>}
                  <div className="grid gap-3 md:grid-cols-2">
                    {globalSearch.results.map((searchResult) => {
                      const typeLabel = searchResult.type === 'memory-aid' ? 'Memory aid' : searchResult.type === 'constructed-response' ? 'Written-response workshop' : searchResult.type.charAt(0).toUpperCase() + searchResult.type.slice(1);
                      const actionLabel = searchResult.type === 'question' ? 'Practice this question' : searchResult.type === 'chapter' ? 'Open chapter' : searchResult.type === 'flashcard' ? 'Study card' : searchResult.type === 'memory-aid' ? 'Open memory aid' : (searchResult.type === 'note' || searchResult.type === 'highlight') ? 'Open annotation' : 'Open workshops';
                      return <article key={searchResult.type + '-' + searchResult.id} className="flex flex-col rounded-xl border border-slate-300 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-black text-indigo-900">{typeLabel}</span>{searchResult.domain && <span className="text-xs font-bold text-slate-600">{searchResult.domain}</span>}</div><h5 className="mt-2 font-black text-slate-900">{searchResult.title}</h5>{searchResult.snippet && <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-700">{searchResult.snippet}</p>}<button type="button" onClick={() => openLibrarySearchResult(searchResult)} className="mt-4 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-black text-white focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">{actionLabel}</button></article>;
                    })}
                  </div>
                  {globalSearch.query && !globalSearch.results.length && <p className="rounded-xl border border-slate-300 bg-white p-6 text-center text-sm text-slate-700">No released questions or learning resources match that search.</p>}
                </section>
              )}
              {learningLibrary && !libraryChapterId && libraryMode === 'chapters' && (() => {
                const domains = Array.from(new Set(learningLibrary.chapters.map((chapter) => chapter.domain))).sort();
                const query = librarySearch.trim().toLowerCase();
                const visible = learningLibrary.chapters.filter((chapter) => (libraryDomain === 'all' || chapter.domain === libraryDomain) && (!query || (chapter.title + ' ' + chapter.domain + ' ' + (chapter.sections || []).map((section) => section.heading).join(' ')).toLowerCase().includes(query)));
                return <>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Learning library inventory">
                    {([['Chapters', learningLibrary.summary.chapters], ['Sections', learningLibrary.summary.sections], ['Knowledge checks', learningLibrary.summary.knowledgeChecks], ['Skills', (learningLibrary.skills || []).length], ['Flashcards', learningLibrary.summary.flashcards], ['Memory aids', learningLibrary.summary.memoryAids]].concat(learningLibrary.summary.constructedResponseWorkshops ? [['Response workshops', learningLibrary.summary.constructedResponseWorkshops]] : [])).map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-2xl font-black text-slate-900">{Number(value || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-600">{label}</p></div>)}
                  </div>
                  <div className="grid gap-3 rounded-xl border border-slate-300 bg-white p-4 sm:grid-cols-[1fr_260px]">
                    <label className="text-sm font-bold text-slate-800">Search chapters and section headings<input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} type="search" className="mt-1 w-full rounded-lg border border-slate-400 px-3 py-2 font-normal focus:ring-2 focus:ring-indigo-600" placeholder="Try evidence, fractions, revision…" /></label>
                    <label className="text-sm font-bold text-slate-800">Domain<select value={libraryDomain} onChange={(event) => setLibraryDomain(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:ring-2 focus:ring-indigo-600"><option value="all">All domains</option>{domains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}</select></label>
                  </div>
                  <p className="text-sm font-bold text-slate-700" role="status">Showing {visible.length} of {learningLibrary.chapters.length} chapters</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {visible.map((chapter) => <article key={chapter.id} className="flex flex-col rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-indigo-700">Chapter {learningLibrary.chapters.indexOf(chapter) + 1} · {chapter.domain}</p><h4 className="mt-1 text-lg font-black text-slate-900">{chapter.title}</h4></div><span className={'rounded-full border px-2 py-1 text-xs font-black ' + (chapter.reviewStatus === 'source-reviewed-editorial-pass' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900')}>{chapter.reviewStatus === 'source-reviewed-editorial-pass' ? 'Source reviewed' : 'Review required'}</span></div>
                      <p className="mt-3 flex-1 text-sm text-slate-700">{chapter.sectionCount} sections · {chapter.knowledgeCheckCount} knowledge checks · {chapter.referenceCount} references</p>
                      <button type="button" onClick={() => setLibraryChapterId(chapter.id)} className="mt-4 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-black text-white hover:bg-indigo-800 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Open chapter workspace</button>
                    </article>)}
                  </div>
                  {!visible.length && <p className="rounded-xl border border-slate-300 bg-white p-6 text-center text-sm text-slate-700">No chapters match those filters.</p>}
                </>;
              })()}

              {learningLibrary && libraryMode === 'flashcards' && (() => {
                const releasedFlashcards = learningLibrary.flashcards.filter((card) => card.reviewStatus === 'source-reviewed-editorial-pass' && card.contentDisposition !== 'retire-redundant');
                const queue = testPrepBuildFlashcardQueue(releasedFlashcards, flashcardRatings, { query: librarySearch, domain: libraryDomain, dueOnly: flashcardDueOnly, now: Date.now() });
                const cards = queue.items;
                const safeIndex = cards.length ? Math.min(flashcardIndex, cards.length - 1) : 0;
                const card = cards[safeIndex];
                const known = releasedFlashcards.filter((item) => flashcardRatings[item.id] && flashcardRatings[item.id].rating === 'know').length;
                const cardSchedule = card && flashcardRatings[card.id];
                const rate = (rating) => {
                  if (!card) return;
                  const next = testPrepRateFlashcard(flashcardRatings, card.id, rating, Date.now());
                  setFlashcardRatings(next);
                  try { localStorage.setItem('alloflow_test_prep_flashcards_' + selectedPack.id + '_v1', JSON.stringify(next)); } catch (_) {}
                  setFlashcardRevealed(false);
                  if (cards.length) setFlashcardIndex(Math.min(safeIndex, Math.max(0, cards.length - 2)));
                };
                return <section className="space-y-4" aria-labelledby="flashcard-study-title">
                  <div><h4 id="flashcard-study-title" className="text-lg font-black text-slate-900">Flashcard study</h4><p className="text-sm text-slate-700">Reveal each answer, then schedule the next retrieval. “Study again” returns in 10 minutes; “Still learning” returns in 1 day; “Know it” advances through 1, 3, 7, 14, 30, 60, and 120-day intervals. This transparent schedule is not a readiness score.</p><p className="mt-1 text-xs font-bold text-emerald-800">{learningLibrary.summary.sourceReviewedFlashcards || 0} source reviewed</p></div>
                  <div className="grid gap-3 rounded-xl border border-slate-300 bg-white p-4 sm:grid-cols-[1fr_260px]">
                    <label className="text-sm font-bold text-slate-800">Search cards<input value={librarySearch} onChange={(event) => { setLibrarySearch(event.target.value); setFlashcardIndex(0); setFlashcardRevealed(false); }} type="search" className="mt-1 w-full rounded-lg border border-slate-400 px-3 py-2 font-normal focus:ring-2 focus:ring-indigo-600" /></label>
                    <label className="text-sm font-bold text-slate-800">Domain<select value={libraryDomain} onChange={(event) => { setLibraryDomain(event.target.value); setFlashcardIndex(0); setFlashcardRevealed(false); }} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:ring-2 focus:ring-indigo-600"><option value="all">All domains</option>{Array.from(new Set(releasedFlashcards.map((item) => item.domain))).sort().map((domain) => <option key={domain} value={domain}>{domain}</option>)}</select></label>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm font-bold text-slate-800"><span>{queue.dueCount} due now · {queue.scheduledCount} scheduled later · {known} marked Know</span><label className="flex items-center gap-2"><input type="checkbox" checked={flashcardDueOnly} onChange={(event) => { setFlashcardDueOnly(event.target.checked); setFlashcardIndex(0); setFlashcardRevealed(false); }} className="h-4 w-4 rounded border-slate-400 text-indigo-700 focus:ring-indigo-600" />Show due cards only</label></div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-slate-700"><span>{cards.length ? safeIndex + 1 : 0} of {cards.length} matching cards</span><span>{flashcardDueOnly ? 'Due queue' : 'All matching cards'}</span></div>
                  {card ? <article className="rounded-2xl border border-indigo-300 bg-white p-6 text-center shadow-sm" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-center gap-2"><span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-black text-indigo-900">{card.domain}</span><span className={'rounded-full border px-2 py-1 text-xs font-black ' + (card.reviewStatus === 'source-reviewed-editorial-pass' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900')}>{card.reviewStatus === 'source-reviewed-editorial-pass' ? 'Source reviewed' : 'Review required'}</span>{cardSchedule && <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-black text-sky-900">{cardSchedule.dueAt <= queue.now ? 'Due now' : 'Next review ' + new Date(cardSchedule.dueAt).toLocaleDateString()}</span>}</div>
                    <p className="mx-auto mt-6 max-w-3xl text-xl font-black leading-relaxed text-slate-900">{card.front}</p>
                    {flashcardRevealed ? <div className="mx-auto mt-6 max-w-3xl rounded-xl bg-emerald-50 p-5 text-left text-base leading-relaxed text-emerald-950"><strong>Answer:</strong> {card.back}</div> : <button type="button" onClick={() => setFlashcardRevealed(true)} className="mt-6 rounded-xl bg-indigo-700 px-6 py-3 font-black text-white focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Reveal answer</button>}
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      <button type="button" onClick={() => { setFlashcardIndex((safeIndex - 1 + cards.length) % cards.length); setFlashcardRevealed(false); }} className="rounded-lg border border-slate-400 bg-white px-4 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600">Previous</button>
                      {flashcardRevealed && <><button type="button" onClick={() => rate('again')} className="rounded-lg border border-rose-400 bg-rose-50 px-4 py-2 font-black text-rose-950 focus:ring-2 focus:ring-rose-600">Study again · 10 min</button><button type="button" onClick={() => rate('learning')} className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 font-black text-amber-950 focus:ring-2 focus:ring-amber-600">Still learning · 1 day</button><button type="button" onClick={() => rate('know')} className="rounded-lg bg-emerald-700 px-4 py-2 font-black text-white focus:ring-2 focus:ring-emerald-600">Know it</button></>}
                      <button type="button" onClick={() => { setFlashcardIndex((safeIndex + 1) % cards.length); setFlashcardRevealed(false); }} className="rounded-lg border border-slate-400 bg-white px-4 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600">Next</button>
                    </div>
                  </article> : <p className="rounded-xl border border-slate-300 bg-white p-6 text-center text-sm text-slate-700">{flashcardDueOnly ? 'No flashcards are due for these filters.' : 'No flashcards match those filters.'}</p>}
                </section>;
              })()}

              {learningLibrary && libraryMode === 'memory-aids' && (() => {
                const query = librarySearch.trim().toLowerCase();
                const releasedMemoryAids = learningLibrary.memoryAids.filter((aid) => aid.reviewStatus === 'source-reviewed-editorial-pass');
                const aids = releasedMemoryAids.filter((aid) => (libraryDomain === 'all' || aid.domain === libraryDomain) && (!query || (aid.title + ' ' + aid.content + ' ' + aid.tags.join(' ')).toLowerCase().includes(query)));
                return <section className="space-y-4" aria-labelledby="memory-aids-title">
                  <div><h4 id="memory-aids-title" className="text-lg font-black text-slate-900">Memory-aid library</h4><p className="text-sm text-slate-700">Use these retrieval cues after learning the underlying concept. They support recall but do not replace worked reasoning, current guidance, or classroom judgment.</p><p className="mt-1 text-xs font-bold text-emerald-800">{learningLibrary.summary.sourceReviewedMemoryAids || 0} source reviewed · {learningLibrary.summary.editorialReviewedSourcePendingMemoryAids || 0} editorial pass/source pending</p></div>
                  <div className="grid gap-3 rounded-xl border border-slate-300 bg-white p-4 sm:grid-cols-[1fr_260px]">
                    <label className="text-sm font-bold text-slate-800">Search titles, content, and tags<input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} type="search" className="mt-1 w-full rounded-lg border border-slate-400 px-3 py-2 font-normal focus:ring-2 focus:ring-indigo-600" /></label>
                    <label className="text-sm font-bold text-slate-800">Domain<select value={libraryDomain} onChange={(event) => setLibraryDomain(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:ring-2 focus:ring-indigo-600"><option value="all">All domains</option>{Array.from(new Set(releasedMemoryAids.map((item) => item.domain))).sort().map((domain) => <option key={domain} value={domain}>{domain}</option>)}</select></label>
                  </div>
                  <p className="text-sm font-bold text-slate-700" role="status">Showing {aids.length} of {releasedMemoryAids.length} released memory aids</p>
                  <div className="grid gap-3 md:grid-cols-2">{aids.map((aid) => { const open = memoryAidOpen === aid.id; return <article key={aid.id} className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-indigo-700">{aid.domain} · {aid.type}</p><h5 className="mt-1 font-black text-slate-900">{aid.title}</h5></div><span className={'rounded-full border px-2 py-1 text-xs font-black ' + (aid.reviewStatus === 'source-reviewed-editorial-pass' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : aid.reviewStatus === 'editorial-reviewed-source-pending' ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-amber-300 bg-amber-50 text-amber-900')}>{aid.reviewStatus === 'source-reviewed-editorial-pass' ? 'Source reviewed' : aid.reviewStatus === 'editorial-reviewed-source-pending' ? 'Editorial pass · source pending' : 'Review required'}</span></div><button type="button" aria-expanded={open} onClick={() => setMemoryAidOpen(open ? '' : aid.id)} className="mt-3 rounded-lg border border-indigo-400 bg-indigo-50 px-3 py-2 text-sm font-black text-indigo-900 focus:ring-2 focus:ring-indigo-600">{open ? 'Hide aid' : 'Show aid'}</button>{open && <><p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">{aid.content}</p>{Array.isArray(aid.sourceDetails) && aid.sourceDetails.length > 0 && <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3"><h6 className="text-xs font-black uppercase tracking-wide text-slate-800">Sources</h6><ul className="mt-2 space-y-3">{aid.sourceDetails.map((source) => <li key={source.url} className="text-xs leading-relaxed text-slate-700"><a href={source.url} target="_blank" rel="noreferrer" className="font-black text-indigo-800 underline">{source.title}</a>{source.organization && <span className="font-bold"> - {source.organization}</span>}<p className="mt-1">Why this source is reputable: {source.whyReputable}</p></li>)}</ul></div>}<div className="mt-3 flex flex-wrap gap-1">{aid.tags.slice(0, 10).map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{tag}</span>)}</div></>}</article>; })}</div>
                  {!aids.length && <p className="rounded-xl border border-slate-300 bg-white p-6 text-center text-sm text-slate-700">No memory aids match those filters.</p>}
                </section>;
              })()}

              {learningLibrary && libraryMode === 'constructed-response' && (() => {
                const workshops = Array.isArray(learningLibrary.constructedResponseWorkshops) ? learningLibrary.constructedResponseWorkshops : [];
                return <section className="space-y-5" aria-labelledby="written-response-workshops-title">
                  <header className="rounded-xl border border-sky-300 bg-sky-50 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-sky-800">{selectedPack.shortTitle} application practice</p>
                    <h4 id="written-response-workshops-title" className="mt-1 text-xl font-black text-slate-900">{learningLibrary.workshopLabel || 'Written-response workshops'}</h4>
                    <p className="mt-2 max-w-4xl text-sm leading-relaxed text-sky-950">{learningLibrary.workshopPracticeNote || 'Plan a complete response, then compare your reasoning with transparent self-check criteria and a sample outline. AlloFlow does not score written responses, and these independent workshops are not official ETS prompts, rubrics, scores, or predictions.'}</p>
                  </header>
                  <div className="space-y-5">
                    {workshops.map((workshop, workshopIndex) => <article key={workshop.id} className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm sm:p-7">
                      <header className="border-b border-slate-200 pb-4">
                        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-black text-indigo-900">Workshop {workshopIndex + 1}</span><span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-black text-sky-900">{workshop.taskType}</span><span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-900">Source reviewed</span></div>
                        <h5 className="mt-3 text-xl font-black text-slate-900">{workshop.title}</h5>
                        <p className="mt-2 text-sm font-bold leading-relaxed text-slate-800">{workshop.prompt}</p>
                      </header>
                      <section className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4" aria-label={'Stimulus for ' + workshop.title}>
                        <h6 className="font-black text-indigo-950">Stimulus</h6>
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-indigo-950">{workshop.stimulus}</p>
                      </section>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <section className="rounded-xl border border-slate-300 p-4">
                          <h6 className="font-black text-slate-900">Task parts</h6>
                          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-800">{workshop.taskParts.map((part) => <li key={part}>{part}</li>)}</ol>
                        </section>
                        <section className="rounded-xl border border-slate-300 p-4">
                          <h6 className="font-black text-slate-900">Planning frame</h6>
                          <ol className="mt-2 space-y-3 text-sm leading-relaxed text-slate-800">{workshop.planningFrame.map((step, stepIndex) => <li key={step.label}><strong>{stepIndex + 1}. {step.label}:</strong> {step.guidance}</li>)}</ol>
                        </section>
                      </div>
                      <details className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                        <summary className="cursor-pointer font-black text-amber-950 focus:ring-2 focus:ring-amber-700">Open self-check criteria and sample outline</summary>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <section><h6 className="font-black text-emerald-950">Success criteria</h6><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-800">{workshop.successCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></section>
                          <section><h6 className="font-black text-rose-950">Common pitfalls</h6><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-800">{workshop.commonPitfalls.map((pitfall) => <li key={pitfall}>{pitfall}</li>)}</ul></section>
                        </div>
                        <section className="mt-4 rounded-lg bg-white p-4"><h6 className="font-black text-slate-900">Sample outline</h6><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-800">{workshop.sampleOutline.map((point) => <li key={point}>{point}</li>)}</ol></section>
                      </details>
                      <footer className="mt-4 border-t border-slate-200 pt-4">
                        <p className="text-xs leading-relaxed text-slate-700">{workshop.reviewNote}</p>
                        <ul className="mt-2 flex flex-wrap gap-3 text-xs">{(workshop.references || []).map((reference) => { const source = testPrepDescribeReference(reference); return <li key={reference}><a href={reference} target="_blank" rel="noreferrer" className="font-bold text-indigo-800 underline">{source.title}</a></li>; })}</ul>
                      </footer>
                    </article>)}
                  </div>
                  {!workshops.length && <p className="rounded-xl border border-slate-300 bg-white p-6 text-center text-sm text-slate-700">No written-response workshops are available for this pack.</p>}
                </section>;
              })()}

              {learningLibrary && libraryChapterId && !selectedPack.legacyUrl && (() => {
                const chapter = learningLibrary.chapters.find((entry) => entry.id === libraryChapterId);
                if (!chapter) return <p className="rounded-xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-950">That chapter could not be found.</p>;
                const targetedCount = selectedPack.items.filter((item) => item.examItemStatus !== 'not-approved-as-independent-exam-item' && item.skillIds.includes(chapter.skillId)).length;
                return <article className="space-y-6 rounded-2xl border border-indigo-300 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="native-chapter-title">
                  <header className="border-b border-slate-200 pb-5">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-indigo-700">{chapter.domain} {'\u00B7'} Source-reviewed independent study chapter</p><h4 id="native-chapter-title" className="mt-1 text-2xl font-black text-slate-900">{chapter.title}</h4></div><span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900">Source reviewed</span></div>
                    <p className="mt-3 max-w-4xl leading-relaxed text-slate-700">{chapter.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-3">{targetedCount > 0 && <button type="button" onClick={() => startTargetedPractice(chapter.skillId)} className="rounded-lg bg-indigo-700 px-4 py-2 font-black text-white focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Practice this skill ({Math.min(20, targetedCount)} questions)</button>}<button type="button" onClick={() => { setLibraryMode('flashcards'); setLibraryChapterId(''); setLibraryDomain(chapter.domain); setFlashcardIndex(0); }} className="rounded-lg border border-slate-400 bg-white px-4 py-2 font-black text-slate-900 focus:ring-2 focus:ring-indigo-600">Study flashcards</button></div>
                  </header>

                  <section aria-labelledby="chapter-objectives-title"><h5 id="chapter-objectives-title" className="text-lg font-black text-slate-900">Learning objectives</h5><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-800">{(chapter.objectives || []).map((objective) => <li key={objective}>{objective}</li>)}</ul></section>

                  <section className="space-y-4" aria-labelledby="chapter-lessons-title">
                    <h5 id="chapter-lessons-title" className="text-lg font-black text-slate-900">Chapter lessons</h5>
                    {(chapter.sections || []).map((section, index) => <section key={section.id} className="rounded-xl border border-slate-300 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-indigo-700">Lesson {index + 1}</p><h6 className="mt-1 text-base font-black text-slate-900">{section.heading}</h6><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-800">{section.content || section.preview || 'Section details are available in the reviewed source chapter.'}</p>{(section.keyTerms || []).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{(section.keyTerms || []).map((term) => <span key={term} className="rounded-full border border-indigo-200 bg-white px-2 py-1 text-xs font-bold text-indigo-900">{term}</span>)}</div>}</section>)}
                  </section>

                  <section className="space-y-4" aria-labelledby="chapter-checks-title">
                    <div><h5 id="chapter-checks-title" className="text-lg font-black text-slate-900">Knowledge checks</h5><p className="mt-1 text-sm text-slate-700">Answer each question, check the response, and use the rationale to correct or strengthen your reasoning.</p></div>
                    {(chapter.knowledgeChecks || []).map((check, checkIndex) => {
                      const selected = chapterCheckAnswers[check.id];
                      const revealed = chapterCheckRevealed[check.id] === true;
                      return <fieldset key={check.id} disabled={revealed} className="rounded-xl border border-slate-300 p-4"><legend className="px-1 font-black text-slate-900">Check {checkIndex + 1}: {check.prompt}</legend><div className="mt-3 space-y-2">{check.choices.map((choice, choiceIndex) => { const inputId = check.id + '-choice-' + choiceIndex; const correct = revealed && choiceIndex === check.answerIndex; const missed = revealed && choiceIndex === selected && choiceIndex !== check.answerIndex; return <label key={inputId} htmlFor={inputId} className={'flex items-start gap-2 rounded-lg border p-3 text-sm focus-within:ring-2 focus-within:ring-indigo-600 ' + (correct ? 'border-emerald-500 bg-emerald-50 text-emerald-950' : missed ? 'border-rose-500 bg-rose-50 text-rose-950' : selected === choiceIndex ? 'border-indigo-500 bg-indigo-50 text-indigo-950' : 'border-slate-300 bg-white text-slate-900')}><input id={inputId} type="radio" name={check.id} checked={selected === choiceIndex} onChange={() => setChapterCheckAnswers((previous) => Object.assign({}, previous, { [check.id]: choiceIndex }))} className="mt-0.5 h-4 w-4 accent-indigo-700" /><span><strong>{String.fromCharCode(65 + choiceIndex)}.</strong> {choice}</span></label>; })}</div>{!revealed ? <button type="button" disabled={selected == null} onClick={() => setChapterCheckRevealed((previous) => Object.assign({}, previous, { [check.id]: true }))} className="mt-3 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-indigo-600">Check answer</button> : <div className={'mt-3 rounded-lg border p-3 text-sm ' + (selected === check.answerIndex ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950')} role="status"><p className="font-black">{selected === check.answerIndex ? 'Correct' : 'Review the reasoning'}</p><p className="mt-1 leading-relaxed">{check.rationale}</p></div>}</fieldset>;
                    })}
                  </section>

                  <section className="rounded-xl border border-slate-300 bg-slate-50 p-4" aria-labelledby="chapter-sources-title"><h5 id="chapter-sources-title" className="font-black text-slate-900">Sources and review status</h5><p className="mt-1 text-sm leading-relaxed text-slate-700">{chapter.reviewNote}</p><ul className="mt-3 space-y-2 text-sm">{(chapter.references || chapter.reviewReferences || []).map((reference) => { const source = testPrepDescribeReference(reference); return <li key={reference}><a href={reference} target="_blank" rel="noreferrer" className="font-bold text-indigo-800 underline">{source.title}</a></li>; })}</ul></section>
                </article>;
              })()}

              {learningLibrary && libraryChapterId && selectedPack.legacyUrl && (
                <section className="overflow-hidden rounded-2xl border border-violet-300 bg-white shadow-sm">
                  <h4 className="sr-only">Selected EPPP chapter</h4>
                  <iframe ref={legacyChapterFrameRef} onLoad={(event) => syncLegacyChapterTextSize(event.currentTarget)} title="Selected EPPP chapter" src={selectedPack.legacyUrl + '&page=textbook#' + encodeURIComponent(libraryChapterId)} className="h-[68vh] min-h-[560px] w-full border-0" sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads" />
                </section>
              )}
            </div>
          )}

          {tab === 'notes' && selectedPack && (
            <div className="mx-auto max-w-6xl space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-amber-800">Portable study workspace</p><h3 className="text-xl font-black text-slate-900">Notes & highlights</h3><p className="mt-1 max-w-3xl text-sm text-slate-700">Records are scoped to a test pack, searchable with released content, and included in progress backup files. Avoid storing sensitive personal or client information.</p></div><label className="text-sm font-bold text-slate-800">Test pack<select value={selectedPackId} onChange={(event) => setSelectedPackId(event.target.value)} className="mt-1 block rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:ring-2 focus:ring-amber-600">{packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.shortTitle}</option>)}</select></label></div>
              <section className="rounded-2xl border border-amber-300 bg-white p-5 shadow-sm" aria-labelledby="annotation-editor-title">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-amber-800">Attached to {annotationTarget.targetType.replace(/-/g, ' ')}</p><h4 id="annotation-editor-title" className="mt-1 font-black text-slate-900">{annotationTarget.targetLabel}</h4></div>{annotationTarget.targetType !== 'general' && <button type="button" onClick={() => { setAnnotationTarget({ targetType: 'general', targetId: '', targetLabel: 'General pack note' }); setAnnotationEditingId(''); }} className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-600">Use general pack note</button>}</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-bold text-slate-800">Record type<select value={annotationKind} onChange={(event) => setAnnotationKind(event.target.value === 'highlight' ? 'highlight' : 'note')} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:ring-2 focus:ring-amber-600"><option value="note">Note</option><option value="highlight">Highlight or key quotation</option></select></label>
                  <label className="text-sm font-bold text-slate-800">Highlight color<select value={annotationColor} onChange={(event) => setAnnotationColor(event.target.value)} disabled={annotationKind !== 'highlight'} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal disabled:bg-slate-100 focus:ring-2 focus:ring-amber-600"><option value="yellow">Yellow</option><option value="blue">Blue</option><option value="green">Green</option><option value="pink">Pink</option></select></label>
                </div>
                <label className="mt-4 block text-sm font-bold text-slate-800">{annotationKind === 'highlight' ? 'Key passage and why it matters' : 'Study note'}<textarea aria-label="Study annotation text" value={annotationDraft} onChange={(event) => setAnnotationDraft(event.target.value.slice(0, 4000))} rows="5" className="mt-1 w-full rounded-lg border border-slate-400 px-3 py-2 font-normal focus:ring-2 focus:ring-amber-600" placeholder="Write the idea in your own words, record a question, or paste a short key passage with context." /></label>
                <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={!annotationDraft.trim()} onClick={saveAnnotationDraft} className="rounded-lg bg-amber-700 px-4 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-amber-600 focus:ring-offset-2">{annotationEditingId ? 'Update annotation' : 'Save annotation'}</button>{annotationEditingId && <button type="button" onClick={() => { setAnnotationDraft(''); setAnnotationEditingId(''); setAnnotationTarget({ targetType: 'general', targetId: '', targetLabel: 'General pack note' }); }} className="rounded-lg border border-slate-400 bg-white px-4 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-amber-600">Cancel editing</button>}<span className="text-xs font-bold text-slate-600">{annotationDraft.length.toLocaleString()} / 4,000 characters</span></div>
              </section>
              <section aria-labelledby="saved-annotations-title"><div className="flex flex-wrap items-end justify-between gap-2"><div><h4 id="saved-annotations-title" className="text-lg font-black text-slate-900">Saved for {selectedPack.shortTitle}</h4><p className="text-sm text-slate-700">{packAnnotations.length} annotation{packAnnotations.length === 1 ? '' : 's'} · searchable from Learning library → Search all</p></div><button type="button" onClick={() => beginAnnotation()} className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm font-black text-amber-950 focus:ring-2 focus:ring-amber-600">New general note</button></div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">{packAnnotations.slice().sort((left, right) => right.updatedAt - left.updatedAt).map((record) => { const colorClass = record.kind !== 'highlight' ? 'border-slate-300 bg-white' : record.color === 'blue' ? 'border-sky-300 bg-sky-50' : record.color === 'green' ? 'border-emerald-300 bg-emerald-50' : record.color === 'pink' ? 'border-pink-300 bg-pink-50' : 'border-amber-300 bg-amber-50'; return <article key={record.id} className={'rounded-xl border p-4 shadow-sm ' + colorClass}><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/80 px-2 py-1 text-xs font-black text-slate-800">{record.kind === 'highlight' ? 'Highlight' : 'Note'}</span><span className="text-xs font-bold text-slate-600">{record.targetType.replace(/-/g, ' ')}</span></div><h5 className="mt-2 font-black text-slate-900">{record.targetLabel}</h5><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{record.text}</p><p className="mt-3 text-xs text-slate-600">Updated {record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'date unavailable'}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => editAnnotation(record)} className="rounded-lg border border-indigo-400 bg-white px-3 py-2 text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-600">Edit</button><button type="button" onClick={() => removeAnnotation(record.id)} className="rounded-lg border border-rose-400 bg-white px-3 py-2 text-sm font-bold text-rose-900 focus:ring-2 focus:ring-rose-600">Delete</button></div></article>; })}</div>
                {!packAnnotations.length && <p className="mt-3 rounded-xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-slate-700">No annotations for this pack yet. Add a general note here, or attach one directly from a practice question or chapter.</p>}
              </section>
            </div>
          )}
          {tab === 'progress' && (
            <div className="mx-auto max-w-6xl space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><h3 className="text-xl font-black text-slate-900">Practice progress</h3><p className="mt-1 text-sm text-slate-700">Stored only in this browser. Results describe practice activity, not credential readiness, an official score, or a pass prediction.</p></div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-sm font-bold text-slate-800">Test pack<select value={selectedPackId} onChange={(event) => setSelectedPackId(event.target.value)} className="mt-1 block rounded-lg border border-slate-400 bg-white px-3 py-2 font-normal focus:ring-2 focus:ring-indigo-600">{packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.shortTitle}</option>)}</select></label>
                  <button type="button" onClick={exportPracticeProgress} className="rounded-lg border border-indigo-400 bg-white px-3 py-2 text-sm font-black text-indigo-900 focus:ring-2 focus:ring-indigo-600">Export progress</button>
                  <label htmlFor="test-prep-progress-import" className="cursor-pointer rounded-lg border border-indigo-400 bg-white px-3 py-2 text-sm font-black text-indigo-900 focus-within:ring-2 focus-within:ring-indigo-600">Import progress<input id="test-prep-progress-import" type="file" accept="application/json,.json" onChange={importPracticeProgressFile} className="sr-only" /></label>
                </div>
              </div>
              {studyPlanStatus && <section className="rounded-2xl border border-teal-300 bg-white p-5 shadow-sm" aria-labelledby="weekly-study-plan-title">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-teal-800">Activity goals only</p><h4 id="weekly-study-plan-title" className="mt-1 text-lg font-black text-slate-900">Weekly study plan</h4><p className="mt-1 max-w-3xl text-sm text-slate-700">Set retrieval-practice targets for the current Monday–Sunday week. Goals and streaks describe activity; they do not estimate ability, readiness, an official score, or passing.</p></div><div className="rounded-lg bg-teal-50 px-3 py-2 text-center"><p className="text-2xl font-black text-teal-950">{studyPlanStatus.activityStreakDays}</p><p className="text-xs font-bold text-teal-800">day activity streak</p></div></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="text-sm font-bold text-slate-800">Weekly questions<input aria-label="Weekly question goal" type="number" min="1" max="5000" value={currentStudyPlan.weeklyQuestions} onChange={(event) => updateStudyPlan({ weeklyQuestions: Number(event.target.value) || 1 })} className="mt-1 w-full rounded-lg border border-slate-400 px-3 py-2 font-normal focus:ring-2 focus:ring-teal-600" /></label>
                  <label className="text-sm font-bold text-slate-800">Completed sets<input aria-label="Weekly completed-set goal" type="number" min="1" max="50" value={currentStudyPlan.weeklySets} onChange={(event) => updateStudyPlan({ weeklySets: Number(event.target.value) || 1 })} className="mt-1 w-full rounded-lg border border-slate-400 px-3 py-2 font-normal focus:ring-2 focus:ring-teal-600" /></label>
                  <label className="text-sm font-bold text-slate-800">Active study days<input aria-label="Weekly active-day goal" type="number" min="1" max="7" value={currentStudyPlan.activeDays} onChange={(event) => updateStudyPlan({ activeDays: Number(event.target.value) || 1 })} className="mt-1 w-full rounded-lg border border-slate-400 px-3 py-2 font-normal focus:ring-2 focus:ring-teal-600" /></label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[[studyPlanStatus.questionsCompleted, currentStudyPlan.weeklyQuestions, studyPlanStatus.questionPercent, 'Questions'], [studyPlanStatus.setsCompleted, currentStudyPlan.weeklySets, studyPlanStatus.setPercent, 'Completed sets'], [studyPlanStatus.activeDaysCompleted, currentStudyPlan.activeDays, studyPlanStatus.activeDayPercent, 'Active days']].map(([value, goal, percent, label]) => <div key={label} className="rounded-xl border border-teal-200 bg-teal-50 p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-black text-teal-950">{label}</span><span className="text-sm font-bold text-teal-900">{value}/{goal}</span></div><progress aria-label={label + ' weekly progress'} className="mt-2 h-2 w-full accent-teal-700" max="100" value={percent}>{percent}%</progress><p className="mt-1 text-xs font-bold text-teal-800">{percent}% of activity goal</p></div>)}
                </div>
              </section>}              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  <button type="button" onClick={() => selectedPack && openPack(selectedPack, 'practice')} className="mt-4 rounded-xl bg-indigo-700 px-5 py-3 font-black text-white hover:bg-indigo-800 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Open practice</button>
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

