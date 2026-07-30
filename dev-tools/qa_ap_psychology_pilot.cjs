#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_psychology_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_psychology_pilot_learning_library.json');
const deployPackPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'ap_psychology_pilot.json');
const deployLibraryPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'ap_psychology_pilot_learning_library.json');
const reportPath = path.join(root, 'test_prep', 'ap_psychology_pilot_qa.json');

const cedUrl = 'https://apcentral.collegeboard.org/media/pdf/ap-psychology-course-and-exam-description.pdf';
const clarificationsUrl = 'https://apcentral.collegeboard.org/media/pdf/ap-psychology-course-and-exam-description-clarifications.pdf';
const examUrl = 'https://apcentral.collegeboard.org/courses/ap-psychology/exam';
const expectedUnits = [
  'biological-bases-of-behavior',
  'cognition',
  'development-and-learning',
  'social-psychology-and-personality',
  'mental-and-physical-health',
];
const expectedPractices = { P1: 13, P2: 5, P3: 2, P4: 0 };
const expectedAnswerPositions = { 0: 5, 1: 5, 2: 5, 3: 5 };
const signalDefinitions = [
  ['asset-identity', 'Pack and library identities, versions, preview state, and cross-links are structurally consistent.'],
  ['blueprint-and-unit-balance', 'The five current public framework units are declared and receive four pilot items each.'],
  ['science-practice-balance', 'The pilot preserves its declared P1/P2/P3/P4 allocation of 13/5/2/0.'],
  ['answer-key-balance', 'Answer positions are exactly balanced at five keys in each A-D position.'],
  ['answer-key-sequence', 'Ordered key transitions avoid a mechanically dominant modulo-four progression; sequence metrics do not establish psychometric quality.'],
  ['one-best-answer', 'Every item and chapter check has one prompt, four distinct options, and a valid key.'],
  ['substantive-feedback', 'Every pilot item has a substantive rationale and four substantive option explanations.'],
  ['source-and-provenance', 'Public source links, source details, and independent native provenance declarations are complete.'],
  ['rights-boundary', 'Automated QA confirms only that restricted-content and release flags remain closed; it is not independent rights clearance.'],
  ['accessibility-boundary', 'Automated QA confirms text/reading-order declarations and a still-pending independent accessibility gate.'],
  ['expert-review-boundary', 'Automated QA confirms the independent AP Psychology expert gate remains pending and release-blocking.'],
  ['psychometric-boundary', 'Automated QA confirms the items remain uncalibrated, unfielded, and ineligible for score inference or release.'],
  ['prompt-originality', 'No exact or high-similarity prompt pair crosses the conservative automated duplicate threshold.'],
  ['keyed-option-length-cues', 'No severe item-level or bank-level keyed-option length cue crosses the automated threshold.'],
  ['distractor-editorial', 'Choices are distinct and substantive and avoid all/none-of-the-above; wording advisories remain human-review signals.'],
  ['library-inventory', 'Declared chapter, section, check, study-aid, and workshop counts match the actual library.'],
  ['library-content-structure', 'Chapters, study aids, references, review declarations, and release boundaries remain structurally complete.'],
  ['diagram-integrity', 'Optional original diagram specifications have accessible text equivalents, valid graph structure, and exactly linked section placements across all five units.'],
  ['workshop-unscored-safeguards', 'AAQ- and EBQ-style workshops remain original, synthetic, unscored, non-predictive, and release-ineligible.'],
  ['deployment-parity', 'When deployment mirrors exist, they are byte-identical to source; absent pre-build mirrors are reported as deferred.'],
];
const stopWords = new Set(
  'a an and are as at be because been but by can could did do does every for from had has have how if in into is it its may most no not of on one or other should so than that the their then there these they this those through to under use was were what when which while who will with would'.split(' ')
);
const categoricalCueTermPattern = /\b(?:always|never|necessarily|entirely|solely|only|every|cannot|proves?|guarantees?|must)\b/gi;
const lexicalGenericTerms = new Set(
  'best directly following likely statement scenario research researcher researchers study studies student students result results response responses question questions effect effects method methods design approach condition conditions group groups'.split(' ')
);
const prohibitedChoicePattern = /\b(?:all|none) of the above\b/i;

function readAsset(filePath) {
  const bytes = fs.readFileSync(filePath);
  return {
    bytes,
    byteLength: bytes.length,
    json: JSON.parse(bytes.toString('utf8')),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function tokenSet(value) {
  return new Set(
    (normalizeText(value).match(/[a-z0-9]+/g) || []).filter((token) => !stopWords.has(token))
  );
}

function jaccardSimilarity(left, right) {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  let intersection = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1;
  const union = leftTokens.size + rightTokens.size - intersection;
  return union ? intersection / union : 0;
}

function categoricalCueTerms(value) {
  const scrubbed = String(value || '')
    .replace(/\ball-or-none\b/gi, '')
    .replace(/\bonly-child\b/gi, '')
    .replace(/\b(?:does|do|did|can|could|would|should)\s+not\s+(?:necessarily\s+)?(?:prove|show|mean|establish|imply|guarantee)\b/gi, '')
    .replace(/\b(?:cannot|can't)\s+(?:prove|show|mean|establish|imply|guarantee)\b/gi, '')
    .replace(/\bnot necessarily\b/gi, '');
  return [...new Set([...scrubbed.matchAll(categoricalCueTermPattern)].map((match) => match[0].toLowerCase()))];
}

function meaningfulTokenSet(value) {
  return new Set(
    (normalizeText(value).match(/[a-z0-9]+/g) || []).filter(
      (token) => token.length >= 4 && !stopWords.has(token) && !lexicalGenericTerms.has(token)
    )
  );
}

function feedbackOpeningMerelyRestatesOption(choice, feedback) {
  const comparable = (value) => normalizeText(value).replace(/^(?:the|a|an)\s+/, '');
  const option = comparable(choice);
  const opening = comparable(String(feedback || '').split(/[.!?;]/, 1)[0]);
  if (!option || !opening.startsWith(option)) return false;
  const remainder = opening.slice(option.length).trim();
  return new Set([
    '',
    'is correct',
    'is incorrect',
    'is the correct answer',
    'is the incorrect answer',
    'is the best answer',
    'is the strongest answer',
    'would be correct',
    'would be incorrect',
  ]).has(remainder);
}

function countBy(records, valueFor) {
  const counts = {};
  for (const record of records) {
    const value = String(valueFor(record));
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function sortedObject(input, keys) {
  return Object.fromEntries(keys.map((key) => [key, Number(input[key] || 0)]));
}

function validHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function deterministicGeneratedAt(pack, library) {
  const candidates = [
    pack?.blueprint?.lastVerifiedAt,
    library?.blueprint?.lastVerifiedAt,
    library?.generatedAt,
  ].filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')));
  if (!candidates.length) throw new Error('AP pilot QA needs a stable YYYY-MM-DD verification date.');
  const latest = [...candidates].sort().at(-1);
  return latest + 'T00:00:00.000Z';
}

function inspectParity(assetName, sourceAsset, deployPath, addFinding) {
  if (!fs.existsSync(deployPath)) {
    return {
      asset: assetName,
      status: 'not-present-prebuild',
      blocking: false,
      sourceSha256: sourceAsset.sha256,
      deploySha256: null,
      note: 'The deployment mirror is absent. This is reported as a pre-build sequencing state, not a content failure.',
    };
  }
  const deployBytes = fs.readFileSync(deployPath);
  const deploySha256 = sha256(deployBytes);
  const matches = deploySha256 === sourceAsset.sha256;
  if (!matches) {
    addFinding(
      'deployment-parity',
      `${assetName} deployment mirror is not byte-identical to its source asset.`,
      { asset: assetName }
    );
  }
  return {
    asset: assetName,
    status: matches ? 'pass' : 'mismatch',
    blocking: !matches,
    sourceSha256: sourceAsset.sha256,
    deploySha256,
    note: matches
      ? 'Source and deployment bytes are identical.'
      : 'Rebuild the deployment mirror from the reviewed source before continuing.',
  };
}

const packAsset = readAsset(packPath);
const libraryAsset = readAsset(libraryPath);
const pack = packAsset.json;
const library = libraryAsset.json;
const structuralFindings = [];
const editorialAdvisories = [];
const itemReports = new Map(
  (Array.isArray(pack.items) ? pack.items : []).map((item) => [
    item.id,
    {
      id: item.id,
      domainId: item.domainId,
      practiceId: item.practiceId,
      answerIndex: item.answerIndex,
      findings: [],
      editorialAdvisories: [],
    },
  ])
);

function addFinding(check, message, detail = {}) {
  const finding = {
    check,
    asset: detail.asset || 'pack',
    recordId: detail.recordId || '',
    message,
  };
  structuralFindings.push(finding);
  if (finding.recordId && itemReports.has(finding.recordId)) {
    itemReports.get(finding.recordId).findings.push({ check, message });
  }
}

function addAdvisory(check, message, detail = {}) {
  const advisory = {
    check,
    asset: detail.asset || 'pack',
    recordId: detail.recordId || '',
    message,
    requiresHumanJudgment: true,
  };
  editorialAdvisories.push(advisory);
  if (advisory.recordId && itemReports.has(advisory.recordId)) {
    itemReports.get(advisory.recordId).editorialAdvisories.push({ check, message });
  }
}

function requireCondition(condition, check, message, detail) {
  if (!condition) addFinding(check, message, detail);
}

requireCondition(
  pack.schemaVersion === 1 &&
    pack.itemSchemaVersion === 2 &&
    pack.id === 'ap-psychology-pilot' &&
    pack.status === 'preview' &&
    pack.visibility === 'internal',
  'asset-identity',
  'Pack schema, identity, or internal-preview state is invalid.'
);
requireCondition(
  library.schemaVersion === 1 &&
    library.librarySchemaVersion === 1 &&
    library.libraryId === 'ap-psychology-pilot-learning-library' &&
    library.packId === pack.id &&
    library.status === 'preview' &&
    library.visibility === 'internal',
  'asset-identity',
  'Learning-library schema, identity, pack link, or internal-preview state is invalid.',
  { asset: 'learning-library' }
);
requireCondition(
  pack.learningLibraryUrl === './test_prep/ap_psychology_pilot_learning_library.json' &&
    pack.version === library.version,
  'asset-identity',
  'Pack-to-library URL or version linkage is invalid.'
);
requireCondition(
  pack.released === false &&
    pack.calibrated === false &&
    library.released === false &&
    library.releaseEligible === false &&
    library.officialItem === false,
  'psychometric-boundary',
  'Internal pilot assets must remain unreleased, uncalibrated, unofficial, and release-ineligible.'
);
requireCondition(
  pack.officialBlueprintUrl === cedUrl &&
    pack.clarificationsUrl === clarificationsUrl &&
    pack.officialExamUrl === examUrl &&
    library.blueprint?.officialBlueprintUrl === cedUrl &&
    library.blueprint?.clarificationsUrl === clarificationsUrl &&
    library.blueprint?.officialExamUrl === examUrl,
  'blueprint-and-unit-balance',
  'Pack and library must preserve the exact public CED, clarification, and exam references.'
);
requireCondition(
  pack.blueprint?.cedEffectiveLabel === 'Fall 2025' &&
    pack.blueprint?.cedFrameworkVersion === 'V.1' &&
    pack.blueprint?.cedClarificationsImplemented === 'October 2025' &&
    pack.blueprint?.examFormatReferenceYear === 2026 &&
    pack.blueprint?.targetExamYear === null &&
    library.blueprint?.targetExamYear === null,
  'blueprint-and-unit-balance',
  'Current-framework metadata or the intentionally unset target exam year regressed.'
);

const packSourceCatalog = Array.isArray(pack.sourceCatalog) ? pack.sourceCatalog : [];
const librarySourceCatalog = Array.isArray(library.sourceCatalog) ? library.sourceCatalog : [];
const allowedHosts = new Set();
for (const source of [...packSourceCatalog, ...librarySourceCatalog]) {
  if (!validHttpsUrl(source.url)) {
    addFinding('source-and-provenance', 'Source catalog contains an invalid HTTPS URL.', {
      asset: packSourceCatalog.includes(source) ? 'pack' : 'learning-library',
      recordId: source.id || '',
    });
    continue;
  }
  allowedHosts.add(new URL(source.url).hostname.toLowerCase());
}
requireCondition(
  new Set(packSourceCatalog.map((source) => source.id)).size === packSourceCatalog.length &&
    new Set(packSourceCatalog.map((source) => source.url)).size === packSourceCatalog.length &&
    [cedUrl, clarificationsUrl, examUrl].every((url) => packSourceCatalog.some((source) => source.url === url)),
  'source-and-provenance',
  'Pack source catalog IDs/URLs must be unique and include all three official public references.'
);

const domains = Array.isArray(pack.domains) ? pack.domains : [];
const items = Array.isArray(pack.items) ? pack.items : [];
const itemCountsByUnit = countBy(items, (item) => item.domainId);
requireCondition(
  domains.length === 5 &&
    new Set(domains.map((domain) => domain.id)).size === 5 &&
    expectedUnits.every((unit) => domains.some((domain) => domain.id === unit)),
  'blueprint-and-unit-balance',
  'Exactly the five expected AP Psychology units must be declared.'
);
for (const unit of expectedUnits) {
  const domain = domains.find((candidate) => candidate.id === unit);
  requireCondition(
    domain &&
      domain.weight === 0.2 &&
      domain.officialWeightMin === 0.15 &&
      domain.officialWeightMax === 0.25 &&
      domain.itemCount === 4 &&
      itemCountsByUnit[unit] === 4,
    'blueprint-and-unit-balance',
    `${unit} must declare the 15%-25% official range and contain exactly four pilot items.`
  );
}
requireCondition(
  Math.abs(domains.reduce((sum, domain) => sum + Number(domain.weight || 0), 0) - 1) < 1e-10,
  'blueprint-and-unit-balance',
  'Pilot midpoint unit weights must total 1.0.'
);
requireCondition(
  items.length === 20 && pack.batchSize === 20,
  'asset-identity',
  'The internal pilot and declared batch size must remain exactly 20 items.'
);

const itemIds = new Set();
const answerPositions = sortedObject(countBy(items, (item) => item.answerIndex), ['0', '1', '2', '3']);
const practiceCountsRaw = countBy(items, (item) => item.practiceId);
const practiceCounts = sortedObject(practiceCountsRaw, ['P1', 'P2', 'P3', 'P4']);
const promptRecords = [];
const optionLengthMetrics = [];
const categoricalCueMetrics = [];
const lexicalCueMetrics = [];
const feedbackOpeningRestatementMetrics = [];
let completeOptionFeedbackItems = 0;
let editorialDeclarationItems = 0;
let sourceCompleteItems = 0;
let rightsBoundaryItems = 0;
let accessibilityBoundaryItems = 0;
let expertGateItems = 0;
let psychometricBoundaryItems = 0;
let uniquelyLongestKeyedOptions = 0;

for (const item of items) {
  const recordId = item.id || '';
  const report = itemReports.get(recordId);
  const expectedUnitIndex = expectedUnits.indexOf(item.domainId);
  requireCondition(
    /^ap-psych-u[1-5]-\d{3}$/.test(recordId) &&
      !itemIds.has(recordId) &&
      expectedUnitIndex >= 0 &&
      recordId.startsWith(`ap-psych-u${expectedUnitIndex + 1}-`),
    'asset-identity',
    'Item ID is invalid, duplicated, or inconsistent with its unit.',
    { recordId }
  );
  itemIds.add(recordId);
  promptRecords.push({ id: recordId, kind: 'pilot-item', prompt: item.prompt });

  const choices = Array.isArray(item.choices) ? item.choices : [];
  const normalizedChoices = choices.map(normalizeText);
  const validOneBestAnswer =
    item.templateVersion === 1 &&
    item.itemSchemaVersion === 2 &&
    item.type === 'single-choice' &&
    normalizeText(item.prompt).length >= 20 &&
    choices.length === 4 &&
    normalizedChoices.every((choice) => choice.length >= 2) &&
    new Set(normalizedChoices).size === 4 &&
    Number.isInteger(item.answerIndex) &&
    item.answerIndex >= 0 &&
    item.answerIndex <= 3;
  requireCondition(
    validOneBestAnswer,
    'one-best-answer',
    'Item must use template v1/schema v2 with a substantive prompt, four distinct choices, and one valid answer key.',
    { recordId }
  );
  requireCondition(
    choices.every((choice) => !prohibitedChoicePattern.test(String(choice))),
    'distractor-editorial',
    'All/none-of-the-above options are not permitted.',
    { recordId }
  );
  requireCondition(
    ['P1', 'P2', 'P3'].includes(item.practiceId) &&
      new RegExp(`^${item.practiceId.slice(1)}\\.[A-D]$`).test(String(item.skillId || '')) &&
      Array.isArray(item.topicIds) &&
      item.topicIds.length > 0,
    'science-practice-balance',
    'Practice, skill, or topic alignment metadata is incomplete.',
    { recordId }
  );

  const choiceRationales = Array.isArray(item.choiceRationales) ? item.choiceRationales : [];
  const feedbackComplete =
    wordCount(item.rationale) >= 20 &&
    choiceRationales.length === 4 &&
    choiceRationales.every((rationale) => wordCount(rationale) >= 15);
  requireCondition(
    feedbackComplete,
    'substantive-feedback',
    'Overall rationale must contain at least 20 words and every option explanation at least 15 words.',
    { recordId }
  );
  if (feedbackComplete) completeOptionFeedbackItems += 1;

  const editorialChecks = item.editorialChecks || {};
  const editorialDeclarationComplete = [
    'scenarioBased',
    'singleBestAnswer',
    'parallelPlausibleOptions',
    'noKeywordGiveaway',
    'completeOptionFeedback',
    'ageAppropriate',
    'medicalSafety',
  ].every((key) => editorialChecks[key] === true);
  requireCondition(
    editorialDeclarationComplete,
    'distractor-editorial',
    'Item is missing one or more required author/editorial declarations.',
    { recordId }
  );
  if (editorialDeclarationComplete) editorialDeclarationItems += 1;

  const references = Array.isArray(item.references) ? item.references : [];
  const sourceDetails = Array.isArray(item.sourceDetails) ? item.sourceDetails : [];
  const sourceComplete =
    references.includes(cedUrl) &&
    references.length >= 2 &&
    references.every((url) => validHttpsUrl(url) && allowedHosts.has(new URL(url).hostname.toLowerCase())) &&
    sourceDetails.length >= 1 &&
    sourceDetails.every(
      (source) =>
        wordCount(source.title) >= 2 &&
        wordCount(source.organization) >= 1 &&
        wordCount(source.credibility) >= 8 &&
        validHttpsUrl(source.url) &&
        references.includes(source.url) &&
        allowedHosts.has(new URL(source.url).hostname.toLowerCase())
    ) &&
    item.provenance === 'native-original' &&
    item.officialItem === false &&
    item.reviewStatus === 'internal-editorial-draft' &&
    item.qaStatus === 'structure-ready-content-review-pending';
  requireCondition(
    sourceComplete,
    'source-and-provenance',
    'Item public references, attributable source details, provenance, or draft-review declarations are incomplete.',
    { recordId }
  );
  if (sourceComplete) sourceCompleteItems += 1;

  const rightsComplete =
    item.rights?.secureContentUsed === false &&
    item.rights?.copiedOfficialQuestion === false &&
    item.rights?.sourceUse === 'facts-and-blueprint-only' &&
    item.rights?.status === 'pending-independent-rights-review' &&
    item.releaseEligible === false;
  requireCondition(
    rightsComplete,
    'rights-boundary',
    'Restricted-content declarations or the pending independent rights gate regressed.',
    { recordId }
  );
  if (rightsComplete) rightsBoundaryItems += 1;

  const accessibilityComplete =
    item.accessibility?.textOnly === true &&
    item.accessibility?.essentialVisual === false &&
    item.accessibility?.linearReadingOrder === true &&
    item.accessibility?.handsFreeContentCompatible === true &&
    item.accessibility?.status === 'pending-independent-accessibility-review';
  requireCondition(
    accessibilityComplete,
    'accessibility-boundary',
    'Text/reading-order declarations or the pending independent accessibility gate regressed.',
    { recordId }
  );
  if (accessibilityComplete) accessibilityBoundaryItems += 1;

  const expertComplete =
    item.expertReview?.status === 'pending' &&
    item.expertReview?.releaseBlocked === true &&
    item.releaseEligible === false;
  requireCondition(
    expertComplete,
    'expert-review-boundary',
    'Item must retain a pending, release-blocking independent expert review gate.',
    { recordId }
  );
  if (expertComplete) expertGateItems += 1;

  const psychometricComplete = item.psychometricStatus === 'not-calibrated' && item.releaseEligible === false;
  requireCondition(
    psychometricComplete,
    'psychometric-boundary',
    'Item must remain uncalibrated and release-ineligible.',
    { recordId }
  );
  if (psychometricComplete) psychometricBoundaryItems += 1;

  if (validOneBestAnswer) {
    const optionWords = choices.map(wordCount);
    const keyedWords = optionWords[item.answerIndex];
    const distractorWords = optionWords.filter((_, index) => index !== item.answerIndex);
    const longestDistractorWords = Math.max(...distractorWords);
    const severeCue =
      keyedWords >= longestDistractorWords + 3 &&
      keyedWords / Math.max(1, longestDistractorWords) >= 1.4;
    if (keyedWords > longestDistractorWords) uniquelyLongestKeyedOptions += 1;
    optionLengthMetrics.push({
      id: recordId,
      keyedWords,
      longestDistractorWords,
      severeCue,
    });
    requireCondition(
      !severeCue,
      'keyed-option-length-cues',
      `Keyed option has ${keyedWords} words versus a ${longestDistractorWords}-word longest distractor.`,
      { recordId }
    );

    const cueChoices = choices
      .map((choice, index) => ({ index, terms: categoricalCueTerms(choice) }))
      .filter((entry) => entry.terms.length > 0);
    const keyedCueTerms = cueChoices
      .filter((entry) => entry.index === item.answerIndex)
      .flatMap((entry) => entry.terms);
    const distractorCueChoices = cueChoices.filter((entry) => entry.index !== item.answerIndex);
    categoricalCueMetrics.push({
      id: recordId,
      keyedCueTerms,
      distractorCueChoices,
      advisory: distractorCueChoices.length >= 2 && keyedCueTerms.length === 0,
    });
    if (distractorCueChoices.length >= 2 && keyedCueTerms.length === 0) {
      addAdvisory(
        'categorical-cue-review',
        'Categorical wording appears in at least two distractors but not the key; confirm it does not make elimination mechanical.',
        { recordId }
      );
    }

    const stemTerms = meaningfulTokenSet(item.prompt);
    const optionTermSets = choices.map(meaningfulTokenSet);
    const overlapCounts = optionTermSets.map(
      (terms) => [...terms].filter((term) => stemTerms.has(term)).length
    );
    const keyedTerms = optionTermSets[item.answerIndex];
    const distractorTerms = new Set(
      optionTermSets.flatMap((terms, index) => (index === item.answerIndex ? [] : [...terms]))
    );
    const uniqueStemKeyTerms = [...keyedTerms]
      .filter((term) => stemTerms.has(term) && !distractorTerms.has(term))
      .sort();
    const keyedOverlap = overlapCounts[item.answerIndex];
    const maxDistractorOverlap = Math.max(
      ...overlapCounts.filter((_, index) => index !== item.answerIndex)
    );
    const keyOverlapAdvantage = keyedOverlap - maxDistractorOverlap;
    const lexicalAdvisory = uniqueStemKeyTerms.length >= 2 && keyOverlapAdvantage >= 2;
    lexicalCueMetrics.push({
      id: recordId,
      keyedOverlap,
      maxDistractorOverlap,
      keyOverlapAdvantage,
      uniqueStemKeyTerms,
      advisory: lexicalAdvisory,
    });
    if (lexicalAdvisory) {
      addAdvisory(
        'stem-key-lexical-cue-review',
        'The stem and key uniquely share ' + uniqueStemKeyTerms.join(', ') +
          ' with a key-overlap advantage of ' + keyOverlapAdvantage +
          '; confirm this is content-relevant rather than a lexical giveaway.',
        { recordId }
      );
    }

    const restatementIndexes = choiceRationales
      .map((feedback, index) => (feedbackOpeningMerelyRestatesOption(choices[index], feedback) ? index : -1))
      .filter((index) => index >= 0);
    feedbackOpeningRestatementMetrics.push({ id: recordId, choiceIndexes: restatementIndexes });
    if (restatementIndexes.length) {
      addAdvisory(
        'feedback-opening-restatement-review',
        'Choice feedback at zero-based position(s) ' + restatementIndexes.join(', ') +
          ' opens with only the option label plus a correctness claim; add explanation before release.',
        { recordId }
      );
    }
  }

  if (report) {
    report.rationaleWords = wordCount(item.rationale);
    report.minimumChoiceFeedbackWords = choiceRationales.length
      ? Math.min(...choiceRationales.map(wordCount))
      : 0;
    report.sourceDetailCount = sourceDetails.length;
  }
}

requireCondition(
  Object.entries(expectedPractices).every(([practice, count]) => practiceCounts[practice] === count) &&
    pack.practiceDistribution?.['P1-concept-application'] === 13 &&
    pack.practiceDistribution?.['P2-research-methods-and-design'] === 5 &&
    pack.practiceDistribution?.['P3-data-interpretation'] === 2 &&
    pack.practiceDistribution?.['P4-argumentation'] === 0,
  'science-practice-balance',
  'Observed or declared science-practice allocation is not exactly 13/5/2/0.'
);
requireCondition(
  Object.entries(expectedAnswerPositions).every(([position, count]) => answerPositions[position] === count) &&
    Object.entries(expectedAnswerPositions).every(
      ([position, count]) => pack.answerPositionDistribution?.[position] === count
    ),
  'answer-key-balance',
  'Observed or declared answer positions are not exactly 5/5/5/5.'
);

const orderedAnswerKeys = items.map((item) => item.answerIndex);
const validAnswerKeySequence = orderedAnswerKeys.every(
  (answerIndex) => Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex <= 3
);
const transitionDeltasMod4 = validAnswerKeySequence
  ? orderedAnswerKeys.slice(1).map(
      (answerIndex, index) => (answerIndex - orderedAnswerKeys[index] + 4) % 4
    )
  : [];
const transitionDeltaCounts = sortedObject(
  countBy(transitionDeltasMod4, (delta) => delta),
  ['0', '1', '2', '3']
);
const dominantTransitionCount = Math.max(0, ...Object.values(transitionDeltaCounts));
const dominantTransitionDeltas = [0, 1, 2, 3].filter(
  (delta) => transitionDeltaCounts[delta] === dominantTransitionCount
);
const dominantTransitionDelta = transitionDeltasMod4.length
  ? dominantTransitionDeltas[0]
  : null;
const dominantTransitionRate = transitionDeltasMod4.length
  ? dominantTransitionCount / transitionDeltasMod4.length
  : 0;
let currentSameKeyRun = orderedAnswerKeys.length ? 1 : 0;
let longestSameKeyRun = currentSameKeyRun;
for (let index = 1; index < orderedAnswerKeys.length; index += 1) {
  currentSameKeyRun =
    orderedAnswerKeys[index] === orderedAnswerKeys[index - 1] ? currentSameKeyRun + 1 : 1;
  longestSameKeyRun = Math.max(longestSameKeyRun, currentSameKeyRun);
}
requireCondition(
  validAnswerKeySequence,
  'answer-key-sequence',
  'Ordered answer-key sequence contains an invalid key.'
);
requireCondition(
  dominantTransitionRate <= 0.7,
  'answer-key-sequence',
  'A modulo-four answer-key transition dominates ' +
    (dominantTransitionRate * 100).toFixed(1) +
    '% of ordered transitions, above the explicit 70% hard threshold.'
);
if (dominantTransitionRate > 0.6) {
  addAdvisory(
    'answer-key-transition-review',
    'Modulo-four transition delta ' + dominantTransitionDelta +
      ' occurs in ' + dominantTransitionCount + '/' + transitionDeltasMod4.length +
      ' transitions (' + (dominantTransitionRate * 100).toFixed(1) +
      '%), above the 60% editorial-review threshold.'
  );
}

const keyedOptionWords = optionLengthMetrics.map((metric) => metric.keyedWords);
const distractorOptionWords = items.flatMap((item) =>
  Array.isArray(item.choices)
    ? item.choices.filter((_, index) => index !== item.answerIndex).map(wordCount)
    : []
);
const average = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const keyedOptionMeanWords = average(keyedOptionWords);
const distractorOptionMeanWords = average(distractorOptionWords);
const keyedToDistractorMeanRatio = keyedOptionMeanWords / Math.max(0.001, distractorOptionMeanWords);
requireCondition(
  keyedToDistractorMeanRatio >= 0.8 && keyedToDistractorMeanRatio <= 1.25,
  'keyed-option-length-cues',
  `Bank-level keyed/distractor mean word ratio ${keyedToDistractorMeanRatio.toFixed(3)} is outside 0.80-1.25.`
);

const chapterRecords = Array.isArray(library.chapters) ? library.chapters : [];
const knowledgeChecks = chapterRecords.flatMap((chapter) =>
  (Array.isArray(chapter.knowledgeChecks) ? chapter.knowledgeChecks : []).map((check) => ({
    ...check,
    chapterId: chapter.id,
    domainId: chapter.domainId,
  }))
);
const sections = chapterRecords.flatMap((chapter) =>
  Array.isArray(chapter.sections) ? chapter.sections : []
);
const flashcards = Array.isArray(library.flashcards) ? library.flashcards : [];
const memoryAids = Array.isArray(library.memoryAids) ? library.memoryAids : [];
const diagrams = Array.isArray(library.diagrams) ? library.diagrams : [];
const diagramPlacements = Array.isArray(library.diagramPlacements) ? library.diagramPlacements : [];
const workshops = Array.isArray(library.constructedResponseWorkshops)
  ? library.constructedResponseWorkshops
  : [];
const skills = Array.isArray(library.skills) ? library.skills : [];
const inventory = {
  chapters: chapterRecords.length,
  sections: sections.length,
  diagrams: diagrams.length,
  diagramPlacements: diagramPlacements.length,
  knowledgeChecks: knowledgeChecks.length,
  skills: skills.length,
  flashcards: flashcards.length,
  memoryAids: memoryAids.length,
  constructedResponseWorkshops: workshops.length,
};
const expectedInventory = {
  chapters: 5,
  sections: 15,
  diagrams: 5,
  diagramPlacements: 5,
  knowledgeChecks: 10,
  skills: 4,
  flashcards: 15,
  memoryAids: 10,
  constructedResponseWorkshops: 2,
};
requireCondition(
  Object.entries(expectedInventory).every(([key, value]) => inventory[key] === value) &&
    Object.entries(inventory).every(([key, value]) => library.summary?.[key] === value),
  'library-inventory',
  'Learning-library actual, expected, and declared inventory counts do not match.',
  { asset: 'learning-library' }
);
requireCondition(
  new Set(skills.map((skill) => skill.id)).size === 4 &&
    ['P1', 'P2', 'P3', 'P4'].every((id) => skills.some((skill) => skill.id === id)),
  'library-content-structure',
  'Learning library must declare distinct P1-P4 skill records.',
  { asset: 'learning-library' }
);

const chapterById = new Map(chapterRecords.map((chapter) => [chapter.id, chapter]));
const sectionById = new Map(
  chapterRecords.flatMap((chapter) =>
    (Array.isArray(chapter.sections) ? chapter.sections : []).map((section) => [
      section.id,
      { chapter, section },
    ])
  )
);
const libraryRecordIds = new Set();
for (const chapter of chapterRecords) {
  requireCondition(
    chapter.id &&
      !libraryRecordIds.has(chapter.id) &&
      expectedUnits.includes(chapter.domainId) &&
      chapterRecords.filter((candidate) => candidate.domainId === chapter.domainId).length === 1,
    'library-content-structure',
    'Chapter ID is duplicated or unit linkage is invalid.',
    { asset: 'learning-library', recordId: chapter.id || '' }
  );
  libraryRecordIds.add(chapter.id);
  requireCondition(
    Array.isArray(chapter.objectives) &&
      chapter.objectives.length >= 3 &&
      wordCount(chapter.summary) >= 15 &&
      chapter.sectionCount === 3 &&
      chapter.knowledgeCheckCount === 2 &&
      chapter.referenceCount === chapter.references?.length &&
      Array.isArray(chapter.sections) &&
      chapter.sections.length === 3 &&
      Array.isArray(chapter.knowledgeChecks) &&
      chapter.knowledgeChecks.length === 2,
    'library-content-structure',
    'Chapter summary, objectives, counts, sections, checks, or references are incomplete.',
    { asset: 'learning-library', recordId: chapter.id || '' }
  );
  requireCondition(
    chapter.reviewStatus === 'source-reviewed-editorial-pass' &&
      chapter.expertReviewStatus === 'pending' &&
      chapter.accessibilityReviewStatus === 'pending-independent-review' &&
      chapter.releaseEligible === false,
    'expert-review-boundary',
    'Chapter must retain source/editorial declaration plus pending expert/accessibility gates and release ineligibility.',
    { asset: 'learning-library', recordId: chapter.id || '' }
  );
  requireCondition(
    Array.isArray(chapter.references) &&
      chapter.references.includes(cedUrl) &&
      chapter.references.every(
        (url) => validHttpsUrl(url) && allowedHosts.has(new URL(url).hostname.toLowerCase())
      ),
    'source-and-provenance',
    'Chapter references are incomplete or outside the public source catalog hosts.',
    { asset: 'learning-library', recordId: chapter.id || '' }
  );
  for (const section of chapter.sections || []) {
    requireCondition(
      section.id &&
        !libraryRecordIds.has(section.id) &&
        wordCount(section.heading) >= 2 &&
        wordCount(section.content) >= 60 &&
        Array.isArray(section.keyTerms) &&
        section.keyTerms.length >= 3 &&
        section.reviewStatus === 'source-reviewed-editorial-pass' &&
        Array.isArray(section.references) &&
        section.references.length >= 1,
      'library-content-structure',
      'Section ID, content, key terms, references, or review declaration is incomplete.',
      { asset: 'learning-library', recordId: section.id || '' }
    );
    libraryRecordIds.add(section.id);
  }
}

for (const check of knowledgeChecks) {
  promptRecords.push({ id: check.id, kind: 'knowledge-check', prompt: check.prompt });
  const choices = Array.isArray(check.choices) ? check.choices : [];
  requireCondition(
    check.id &&
      !libraryRecordIds.has(check.id) &&
      normalizeText(check.prompt).length >= 20 &&
      choices.length === 4 &&
      new Set(choices.map(normalizeText)).size === 4 &&
      Number.isInteger(check.answerIndex) &&
      check.answerIndex >= 0 &&
      check.answerIndex <= 3 &&
      wordCount(check.rationale) >= 15 &&
      check.reviewStatus === 'source-reviewed-editorial-pass' &&
      Array.isArray(check.references) &&
      check.references.length >= 1,
    'one-best-answer',
    'Knowledge check structure, rationale, sources, or review declaration is incomplete.',
    { asset: 'learning-library', recordId: check.id || '' }
  );
  libraryRecordIds.add(check.id);
}

for (const card of flashcards) {
  const chapter = chapterById.get(card.chapterId);
  requireCondition(
    card.id &&
      !libraryRecordIds.has(card.id) &&
      chapter &&
      card.domainId === chapter.domainId &&
      wordCount(card.front) >= 3 &&
      wordCount(card.back) >= 12 &&
      card.reviewStatus === 'source-reviewed-editorial-pass' &&
      Array.isArray(card.references) &&
      card.references.length >= 1,
    'library-content-structure',
    'Flashcard identity, linkage, content, sources, or review declaration is incomplete.',
    { asset: 'learning-library', recordId: card.id || '' }
  );
  libraryRecordIds.add(card.id);
}

for (const aid of memoryAids) {
  requireCondition(
    aid.id &&
      !libraryRecordIds.has(aid.id) &&
      wordCount(aid.title) >= 2 &&
      wordCount(aid.content) >= 10 &&
      Array.isArray(aid.tags) &&
      aid.tags.length >= 2 &&
      Array.isArray(aid.references) &&
      aid.references.length >= 1 &&
      aid.reviewStatus === 'source-reviewed-editorial-pass',
    'library-content-structure',
    'Memory-aid identity, content, tags, sources, or review declaration is incomplete.',
    { asset: 'learning-library', recordId: aid.id || '' }
  );
  libraryRecordIds.add(aid.id);
}

const diagramById = new Map();
let accessibleDiagramCount = 0;
let originalSpecificationDiagramCount = 0;
let unscoredDiagramCount = 0;
let validDiagramCount = 0;
for (const diagram of diagrams) {
  const chapter = chapterById.get(diagram.chapterId);
  const nodes = Array.isArray(diagram.spec?.nodes) ? diagram.spec.nodes : [];
  const edges = Array.isArray(diagram.spec?.edges) ? diagram.spec.edges : [];
  const nodeIds = nodes.map((node) => node.id);
  const nodeIdSet = new Set(nodeIds);
  const edgeIds = edges.map((edge) => edge.id);
  const readingOrder = Array.isArray(diagram.accessibility?.readingOrder)
    ? diagram.accessibility.readingOrder
    : [];
  const textEquivalent = Array.isArray(diagram.accessibility?.textEquivalent)
    ? diagram.accessibility.textEquivalent
    : [];
  const graphIsValid =
    diagram.spec?.format === 'alloflow-diagram-v1' &&
    typeof diagram.spec?.layout === 'string' &&
    diagram.spec.layout.length > 0 &&
    nodes.length >= 3 &&
    new Set(nodeIds).size === nodes.length &&
    nodes.every(
      (node) => node.id && wordCount(node.label) >= 1 && wordCount(node.detail) >= 4
    ) &&
    edges.length >= 2 &&
    new Set(edgeIds).size === edges.length &&
    edges.every(
      (edge) =>
        edge.id &&
        nodeIdSet.has(edge.from) &&
        nodeIdSet.has(edge.to) &&
        edge.from !== edge.to &&
        wordCount(edge.label) >= 1
    );
  const accessibilityIsComplete =
    diagram.accessibility?.essentialVisualContent === false &&
    wordCount(diagram.accessibility?.shortAlt) >= 8 &&
    wordCount(diagram.accessibility?.longDescription) >= 25 &&
    textEquivalent.length >= 3 &&
    textEquivalent.every((step) => wordCount(step) >= 4) &&
    readingOrder.length === nodes.length &&
    new Set(readingOrder).size === nodes.length &&
    readingOrder.every((nodeId) => nodeIdSet.has(nodeId)) &&
    diagram.accessibility?.colorIndependent === true &&
    diagram.accessibility?.shapeIndependentLabels === true &&
    diagram.accessibility?.fallbackMode === 'ordered-text-equivalent' &&
    diagram.accessibility?.independentReviewStatus === 'pending';
  const rightsAreOriginal =
    diagram.rights?.originalSpecification === true &&
    diagram.rights?.officialFigureReproduced === false &&
    diagram.rights?.sourceFigureReproduced === false &&
    diagram.rights?.thirdPartyArtworkIncluded === false;
  const reviewBoundaryIsClosed =
    diagram.unscored === true &&
    diagram.officialItem === false &&
    diagram.releaseEligible === false &&
    diagram.reviewStatus === 'source-reviewed-editorial-pass' &&
    diagram.expertReviewStatus === 'pending';
  const diagramIsValid =
    diagram.id &&
    !libraryRecordIds.has(diagram.id) &&
    !diagramById.has(diagram.id) &&
    chapter &&
    diagram.domainId === chapter.domainId &&
    wordCount(diagram.title) >= 2 &&
    wordCount(diagram.learnerPurpose) >= 8 &&
    wordCount(diagram.caption) >= 8 &&
    Array.isArray(diagram.references) &&
    diagram.references.includes(cedUrl) &&
    diagram.references.every(
      (url) => validHttpsUrl(url) && allowedHosts.has(new URL(url).hostname.toLowerCase())
    ) &&
    graphIsValid &&
    accessibilityIsComplete &&
    rightsAreOriginal &&
    reviewBoundaryIsClosed;
  requireCondition(
    diagramIsValid,
    'diagram-integrity',
    'Diagram identity, unit linkage, graph specification, accessible equivalent, rights declaration, or closed review boundary is incomplete.',
    { asset: 'learning-library', recordId: diagram.id || '' }
  );
  if (diagram.id && !diagramById.has(diagram.id)) diagramById.set(diagram.id, diagram);
  libraryRecordIds.add(diagram.id);
  if (accessibilityIsComplete) accessibleDiagramCount += 1;
  if (rightsAreOriginal) originalSpecificationDiagramCount += 1;
  if (reviewBoundaryIsClosed && diagram.unscored === true) unscoredDiagramCount += 1;
  if (diagramIsValid) validDiagramCount += 1;
}

const placedDiagramIds = new Set();
const placementChapterIds = new Set();
let validDiagramPlacementCount = 0;
for (const placement of diagramPlacements) {
  const diagram = diagramById.get(placement.diagramId);
  const sectionLink = sectionById.get(placement.sectionId);
  const placementIsValid =
    placement.id &&
    !libraryRecordIds.has(placement.id) &&
    diagram &&
    sectionLink &&
    placement.chapterId === diagram.chapterId &&
    placement.chapterId === sectionLink.chapter.id &&
    !placedDiagramIds.has(placement.diagramId) &&
    placement.position === 'after-section-content' &&
    wordCount(placement.learnerPurpose) >= 8 &&
    placement.requiredForComprehension === false &&
    placement.unscored === true &&
    placement.fallbackMode === 'diagram-text-equivalent' &&
    placement.reviewStatus === 'source-reviewed-editorial-pass' &&
    placement.accessibilityReviewStatus === 'pending-independent-review' &&
    placement.releaseEligible === false;
  requireCondition(
    placementIsValid,
    'diagram-integrity',
    'Diagram placement identity, diagram/section linkage, learner purpose, fallback, or closed review boundary is invalid.',
    { asset: 'learning-library', recordId: placement.id || '' }
  );
  if (placement.diagramId) placedDiagramIds.add(placement.diagramId);
  if (placement.chapterId) placementChapterIds.add(placement.chapterId);
  if (placementIsValid) validDiagramPlacementCount += 1;
  libraryRecordIds.add(placement.id);
}

const diagramChapterIds = new Set(diagrams.map((diagram) => diagram.chapterId));
const visualCoverageComplete =
  diagrams.length === expectedUnits.length &&
  diagramPlacements.length === expectedUnits.length &&
  validDiagramCount === diagrams.length &&
  validDiagramPlacementCount === diagramPlacements.length &&
  placedDiagramIds.size === diagrams.length &&
  diagramChapterIds.size === expectedUnits.length &&
  placementChapterIds.size === expectedUnits.length &&
  chapterRecords.every(
    (chapter) => diagramChapterIds.has(chapter.id) && placementChapterIds.has(chapter.id)
  ) &&
  accessibleDiagramCount === diagrams.length &&
  originalSpecificationDiagramCount === diagrams.length &&
  unscoredDiagramCount === diagrams.length;
requireCondition(
  visualCoverageComplete &&
    library.summary?.sourceReviewedDiagrams === diagrams.length &&
    library.summary?.independentExpertReviewedDiagrams === 0,
  'diagram-integrity',
  'Diagram coverage must include one accessible, original, unscored, placed specification per chapter while expert review remains pending.',
  { asset: 'learning-library' }
);

let aaqWorkshopCount = 0;
let ebqWorkshopCount = 0;
let safeguardedWorkshopCount = 0;
for (const workshop of workshops) {
  promptRecords.push({ id: workshop.id, kind: 'constructed-response-workshop', prompt: workshop.prompt });
  if (/^AAQ-style/i.test(workshop.taskType || '')) aaqWorkshopCount += 1;
  if (/^EBQ-style/i.test(workshop.taskType || '')) ebqWorkshopCount += 1;
  const safeguarded =
    workshop.id &&
    !libraryRecordIds.has(workshop.id) &&
    wordCount(workshop.prompt) >= 12 &&
    /synthetic/i.test(String(workshop.stimulus || '')) &&
    /synthetic/i.test(String(workshop.stimulusNature || '')) &&
    Array.isArray(workshop.taskParts) &&
    workshop.taskParts.length >= 3 &&
    Array.isArray(workshop.planningFrame) &&
    workshop.planningFrame.length >= 3 &&
    Array.isArray(workshop.successCriteria) &&
    workshop.successCriteria.length >= 3 &&
    Array.isArray(workshop.commonPitfalls) &&
    workshop.commonPitfalls.length >= 3 &&
    Array.isArray(workshop.sampleOutline) &&
    workshop.sampleOutline.length >= 3 &&
    Array.isArray(workshop.references) &&
    workshop.references.includes(cedUrl) &&
    workshop.references.includes(clarificationsUrl) &&
    workshop.unscored === true &&
    workshop.automatedScoring === false &&
    workshop.scorePrediction === false &&
    workshop.officialItem === false &&
    workshop.rights?.secureCollegeBoardContentUsed === false &&
    workshop.rights?.copiedOrRephrasedOfficialPrompt === false &&
    workshop.rights?.copiedOfficialRubric === false &&
    workshop.rights?.originalStimulus === true &&
    workshop.accessibility?.stimulusFormat === 'plain text' &&
    workshop.accessibility?.essentialVisualContent === false &&
    workshop.accessibility?.readingOrder === 'linear' &&
    workshop.accessibility?.independentReviewStatus === 'pending' &&
    workshop.expertReviewStatus === 'pending' &&
    workshop.releaseEligible === false;
  requireCondition(
    safeguarded,
    'workshop-unscored-safeguards',
    'Workshop structure, synthetic-source declaration, unscored boundary, rights, accessibility, or release gate regressed.',
    { asset: 'learning-library', recordId: workshop.id || '' }
  );
  if (safeguarded) safeguardedWorkshopCount += 1;
  libraryRecordIds.add(workshop.id);
}
requireCondition(
  aaqWorkshopCount === 1 &&
    ebqWorkshopCount === 1 &&
    safeguardedWorkshopCount === 2 &&
    /unscored/i.test(library.workshopLabel || '') &&
    /does not score/i.test(library.workshopPracticeNote || '') &&
    /does not provide official AP questions, rubrics, scores, score predictions/i.test(
      library.disclaimer || ''
    ),
  'workshop-unscored-safeguards',
  'Library must contain one safeguarded AAQ-style and one safeguarded EBQ-style workshop with explicit non-scoring language.',
  { asset: 'learning-library' }
);

const normalizedPromptGroups = new Map();
for (const promptRecord of promptRecords) {
  const normalized = normalizeText(promptRecord.prompt);
  if (!normalizedPromptGroups.has(normalized)) normalizedPromptGroups.set(normalized, []);
  normalizedPromptGroups.get(normalized).push(promptRecord);
}
const exactDuplicatePrompts = [...normalizedPromptGroups.values()]
  .filter((records) => records.length > 1)
  .map((records) => records.map(({ id, kind }) => ({ id, kind })));
for (const duplicate of exactDuplicatePrompts) {
  addFinding(
    'prompt-originality',
    `Exact normalized prompt duplicate: ${duplicate.map((record) => record.id).join(', ')}.`
  );
}
const nearDuplicatePrompts = [];
for (let leftIndex = 0; leftIndex < promptRecords.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < promptRecords.length; rightIndex += 1) {
    const left = promptRecords[leftIndex];
    const right = promptRecords[rightIndex];
    if (normalizeText(left.prompt) === normalizeText(right.prompt)) continue;
    const score = jaccardSimilarity(left.prompt, right.prompt);
    if (score >= 0.72) {
      nearDuplicatePrompts.push({
        leftId: left.id,
        leftKind: left.kind,
        rightId: right.id,
        rightKind: right.kind,
        tokenJaccard: Number(score.toFixed(3)),
      });
    }
  }
}
nearDuplicatePrompts.sort(
  (left, right) =>
    right.tokenJaccard - left.tokenJaccard ||
    left.leftId.localeCompare(right.leftId) ||
    left.rightId.localeCompare(right.rightId)
);
for (const duplicate of nearDuplicatePrompts) {
  addFinding(
    'prompt-originality',
    `Near-duplicate prompt pair ${duplicate.leftId}/${duplicate.rightId} reached token Jaccard ${duplicate.tokenJaccard}.`
  );
}

requireCondition(
  pack.rightsPolicy?.secureCollegeBoardContentUsed === false &&
    pack.rightsPolicy?.copiedOrRephrasedCollegeBoardQuestions === false &&
    pack.rightsPolicy?.status === 'pending-independent-rights-review' &&
    library.rightsPolicy?.secureCollegeBoardContentUsed === false &&
    library.rightsPolicy?.copiedOrRephrasedCollegeBoardQuestions === false &&
    library.rightsPolicy?.copiedCollegeBoardRubricText === false &&
    library.rightsPolicy?.sourceProseOrFiguresReproduced === false &&
    library.rightsPolicy?.diagramSpecificationsOriginal === true &&
    library.rightsPolicy?.workshopStudiesAreSynthetic === true &&
    library.rightsPolicy?.status === 'pending-independent-rights-review',
  'rights-boundary',
  'Top-level independent-authoring, restricted-content, or pending rights declarations regressed.'
);
requireCondition(
  pack.accessibilityGate?.essentialVisualItems === 0 &&
    pack.accessibilityGate?.screenReaderReadingOrderDeclared === true &&
    pack.accessibilityGate?.handsFreeContentCompatible === true &&
    pack.accessibilityGate?.independentReviewStatus === 'pending' &&
    pack.accessibilityGate?.productionVoiceValidationStatus === 'pending' &&
    library.accessibility?.essentialVisualItems === 0 &&
    library.accessibility?.optionalDiagramCount === diagrams.length &&
    library.accessibility?.diagramTextEquivalentsRequired === true &&
    library.accessibility?.diagramsRequiredForComprehension === false &&
    library.accessibility?.diagramFallbackMode === 'ordered-text-equivalent' &&
    library.accessibility?.screenReaderReadingOrderDeclared === true &&
    library.accessibility?.headingsAndListsStructured === true &&
    library.accessibility?.workshopStimuliUsePlainText === true &&
    library.accessibility?.handsFreeContentCompatible === true &&
    library.accessibility?.independentReviewStatus === 'pending' &&
    library.accessibility?.productionScreenReaderValidationStatus === 'pending' &&
    library.accessibility?.productionVoiceValidationStatus === 'pending',
  'accessibility-boundary',
  'Top-level accessibility declarations or pending production/independent gates regressed.'
);
requireCondition(
  pack.expertReviewGate?.status === 'pending' &&
    pack.expertReviewGate?.releaseBlocked === true &&
    library.expertReviewGate?.status === 'pending' &&
    library.expertReviewGate?.releaseBlocked === true,
  'expert-review-boundary',
  'Independent AP Psychology expert gates must remain pending and release-blocking.'
);
requireCondition(
  pack.capabilities?.currentEngineCompatible === true &&
    JSON.stringify(pack.capabilities?.responseTypes) === JSON.stringify(['single-choice']) &&
    pack.capabilities?.stimulusGroupsIncluded === false &&
    pack.capabilities?.constructedResponseIncluded === false &&
    pack.capabilities?.frqWorkshopsIncluded === true &&
    pack.capabilities?.limitations?.some((limitation) => /No official-score or readiness inference/i.test(limitation)) &&
    /not official AP scores/i.test(pack.disclaimer || '') &&
    /not diagnosis, treatment, or medical advice/i.test(pack.disclaimer || ''),
  'psychometric-boundary',
  'Engine capability, constructed-response, score-inference, or health-safety boundary regressed.'
);

const humanGateDefinitions = [
  {
    gate: 'independent-rights-review',
    packStatus: pack.releaseGates?.independentRightsReview,
    libraryStatus: library.releaseGates?.independentRightsReview,
    expected: 'pending',
    requiredEvidence: 'Independent intellectual-property and public-use review of both assets.',
  },
  {
    gate: 'independent-accessibility-review',
    packStatus: pack.releaseGates?.independentAccessibilityReview,
    libraryStatus: library.releaseGates?.independentAccessibilityReview,
    expected: 'pending',
    requiredEvidence: 'Independent WCAG/assistive-technology content review plus production screen-reader and voice validation.',
  },
  {
    gate: 'ap-psychology-subject-expert-review',
    packStatus: pack.releaseGates?.apPsychologySubjectExpertReview,
    libraryStatus: library.releaseGates?.apPsychologySubjectExpertReview,
    expected: 'pending',
    requiredEvidence: 'Independent review by a current AP Psychology educator or faculty subject expert.',
  },
  {
    gate: 'production-validation',
    packStatus: pack.releaseGates?.productionValidation,
    libraryStatus: library.releaseGates?.productionValidation,
    expected: 'pending',
    requiredEvidence: 'End-to-end browser, keyboard, screen-reader, hands-free, and deployment validation.',
  },
  {
    gate: 'student-safety-review',
    packStatus: 'not-declared-for-pack',
    libraryStatus: library.releaseGates?.studentSafetyReview,
    expected: 'pending',
    requiredEvidence: 'Independent student-safety review of mental-health examples and cautions.',
  },
  {
    gate: 'field-testing',
    packStatus: pack.releaseGates?.fieldTesting,
    libraryStatus: library.releaseGates?.fieldTesting,
    expected: 'not-started',
    requiredEvidence: 'Representative learner field testing and documented item/library revisions.',
  },
  {
    gate: 'psychometric-calibration',
    packStatus: pack.releaseGates?.psychometricCalibration,
    libraryStatus: library.releaseGates?.psychometricCalibration,
    expected: 'not-started',
    requiredEvidence: 'Qualified psychometric review, calibration, and validity evidence before any score or readiness inference.',
  },
  {
    gate: 'ced-and-policy-reverification',
    packStatus: pack.releaseGates?.cedAndPolicyReverification,
    libraryStatus: library.releaseGates?.cedAndPolicyReverification,
    expected: 'required-before-release',
    requiredEvidence: 'Fresh verification of the current CED, clarifications, exam mode, timing, policies, and public-use boundary.',
  },
];
for (const gate of humanGateDefinitions) {
  const packMatches = gate.packStatus === gate.expected || gate.packStatus === 'not-declared-for-pack';
  const libraryMatches = gate.libraryStatus === gate.expected;
  requireCondition(
    packMatches && libraryMatches,
    gate.gate === 'psychometric-calibration'
      ? 'psychometric-boundary'
      : gate.gate.includes('accessibility')
        ? 'accessibility-boundary'
        : gate.gate.includes('expert')
          ? 'expert-review-boundary'
          : gate.gate.includes('rights')
            ? 'rights-boundary'
            : 'asset-identity',
    `${gate.gate} must retain its expected "${gate.expected}" release-blocking state.`
  );
}
requireCondition(
  pack.releaseGates?.releaseEligible === false &&
    library.releaseGates?.releaseEligible === false &&
    library.summary?.independentExpertReviewedChapters === 0 &&
    library.summary?.releaseEligibleRecords === 0,
  'expert-review-boundary',
  'Top-level and library-record release eligibility must remain false with zero independently expert-reviewed chapters.'
);

if (!visualCoverageComplete) {
  addAdvisory(
    'visual-learning-coverage',
    'Optional visual-learning coverage is incomplete; review missing diagram specifications, accessible equivalents, or chapter placements after structural findings are resolved.',
    { asset: 'learning-library' }
  );
}

const deploymentParity = [
  inspectParity('pack', packAsset, deployPackPath, addFinding),
  inspectParity('learning-library', libraryAsset, deployLibraryPath, addFinding),
];
const deploymentSignalStatus = deploymentParity.some((entry) => entry.status === 'mismatch')
  ? 'fail'
  : deploymentParity.some((entry) => entry.status === 'not-present-prebuild')
    ? 'deferred-prebuild'
    : 'pass';

const automatedSignals = signalDefinitions.map(([check, meaning]) => {
  const findingCount = structuralFindings.filter((finding) => finding.check === check).length;
  return {
    check,
    status: check === 'deployment-parity' ? deploymentSignalStatus : findingCount ? 'fail' : 'pass',
    findingCount,
    meaning,
  };
});
const itemReportList = [...itemReports.values()].map((report) => ({
  ...report,
  automatedStatus: report.findings.length ? 'fail' : 'pass',
}));
const generatedAt = deterministicGeneratedAt(pack, library);
const automatedStatus = structuralFindings.length ? 'fail' : 'pass';
const report = {
  schemaVersion: 1,
  reportId: 'ap-psychology-pilot-qa',
  generatedAt,
  packId: pack.id,
  packVersion: pack.version,
  inputs: {
    pack: {
      path: 'test_prep/ap_psychology_pilot.json',
      byteLength: packAsset.byteLength,
      sha256: packAsset.sha256,
    },
    learningLibrary: {
      path: 'test_prep/ap_psychology_pilot_learning_library.json',
      byteLength: libraryAsset.byteLength,
      sha256: libraryAsset.sha256,
    },
  },
  standard: {
    label: 'AlloFlow AP Psychology internal-pilot structural and editorial QA v1',
    meaning: 'Automated pass signals cover deterministic structure, public-source linkage, blueprint distributions, answer-key balance and sequence screens, length and lexical cue screens, feedback completeness, independent-authoring declarations, library inventory, original accessible diagram specifications and placements, unscored workshop safeguards, and source/deploy parity.',
    limitation: 'Automated QA cannot establish AP Psychology content validity, distractor functioning, fairness, accessibility conformance, rights clearance, student safety, psychometric quality, official AP alignment, score meaning, or release readiness. College Board has not reviewed or endorsed these materials.',
  },
  automatedAssessment: {
    automatedQaStatus: automatedStatus,
    releaseReady: false,
    structuralFindingCount: structuralFindings.length,
    signals: automatedSignals,
    structuralFindings,
  },
  independentHumanReview: {
    releaseStatus: 'blocked-pending-independent-review',
    releaseReady: false,
    blockerCount: humanGateDefinitions.length,
    blockers: humanGateDefinitions.map((gate) => ({
      gate: gate.gate,
      expectedBlockingState: gate.expected,
      packDeclaredStatus: gate.packStatus,
      libraryDeclaredStatus: gate.libraryStatus,
      requiredEvidence: gate.requiredEvidence,
    })),
    note: 'These are genuine release blockers. Their presence is expected and does not make structural QA fail; automated checks must never convert them into completed reviews.',
  },
  deploymentParity,
  metrics: {
    blueprint: {
      framework: 'Fall 2025 AP Psychology Course Framework V.1',
      clarificationsImplemented: 'October 2025',
      examFormatReferenceYear: 2026,
      targetExamYear: null,
      itemCount: items.length,
      unitItemCounts: sortedObject(itemCountsByUnit, expectedUnits),
      declaredUnitWeight: 0.2,
      officialUnitWeightRange: [0.15, 0.25],
    },
    sciencePractices: {
      itemCounts: practiceCounts,
      expectedItemCounts: expectedPractices,
    },
    answerKeys: {
      itemCounts: answerPositions,
      expectedItemCounts: expectedAnswerPositions,
      sequence: {
        orderedAnswerKeys,
        transitionDeltasMod4,
        transitionDeltaCounts,
        dominantTransitionDelta,
        dominantTransitionDeltas,
        dominantTransitionCount,
        dominantTransitionRate: Number(dominantTransitionRate.toFixed(3)),
        longestSameKeyRun,
        advisoryThresholdExclusive: 0.6,
        structuralThresholdExclusive: 0.7,
      },
    },
    itemQuality: {
      completeOptionFeedbackItems,
      editorialDeclarationItems,
      sourceCompleteItems,
      rightsBoundaryItems,
      accessibilityBoundaryItems,
      expertGateItems,
      psychometricBoundaryItems,
      keyedOptionMeanWords: Number(keyedOptionMeanWords.toFixed(3)),
      distractorOptionMeanWords: Number(distractorOptionMeanWords.toFixed(3)),
      keyedToDistractorMeanRatio: Number(keyedToDistractorMeanRatio.toFixed(3)),
      uniquelyLongestKeyedOptions,
      severeKeyedLengthCueItems: optionLengthMetrics.filter((metric) => metric.severeCue).length,
      optionLengthMetrics,
      categoricalCueMetrics,
      lexicalCueMetrics,
      feedbackOpeningRestatementMetrics,
      heuristicDefinitions: {
        categoricalCueAdvisory: 'At least two distractor choices contain unprotected categorical terms while the key contains none; named all-or-none/only-child constructs and explicit not-necessarily or does-not-prove/show/mean/establish/imply/guarantee phrases are excluded.',
        stemKeyLexicalAdvisory: 'At least two meaningful terms occur uniquely in the stem and key, and keyed stem overlap exceeds every distractor by at least two terms.',
        feedbackOpeningRestatementAdvisory: 'The first feedback sentence contains only the option label plus a bare correctness claim.',
      },
    },
    promptOriginality: {
      threshold: {
        method: 'lowercased alphanumeric non-stopword token-set Jaccard',
        nearDuplicateAtOrAbove: 0.72,
      },
      promptRecordsChecked: promptRecords.length,
      exactDuplicateGroups: exactDuplicatePrompts,
      nearDuplicatePairs: nearDuplicatePrompts,
    },
    learningLibrary: {
      inventory,
      expectedInventory,
      sourceReviewedChapters: library.summary?.sourceReviewedChapters,
      sourceReviewedFlashcards: library.summary?.sourceReviewedFlashcards,
      sourceReviewedMemoryAids: library.summary?.sourceReviewedMemoryAids,
      sourceReviewedConstructedResponseWorkshops:
        library.summary?.sourceReviewedConstructedResponseWorkshops,
      independentExpertReviewedChapters: library.summary?.independentExpertReviewedChapters,
      releaseEligibleRecords: library.summary?.releaseEligibleRecords,
      diagramAccessibility: {
        accessibleDiagramCount,
        originalSpecificationDiagramCount,
        unscoredDiagramCount,
        validDiagramCount,
        validDiagramPlacementCount,
        placedDiagramCount: placedDiagramIds.size,
        coveredChapterCount: placementChapterIds.size,
        essentialVisualDiagramCount: diagrams.filter(
          (diagram) => diagram.accessibility?.essentialVisualContent === true
        ).length,
        diagramsRequiredForComprehension: library.accessibility?.diagramsRequiredForComprehension,
        fallbackMode: library.accessibility?.diagramFallbackMode,
      },
      workshopSafeguards: {
        aaqWorkshopCount,
        ebqWorkshopCount,
        safeguardedWorkshopCount,
        unscoredWorkshops: workshops.filter((workshop) => workshop.unscored === true).length,
        automatedScoringWorkshops: workshops.filter((workshop) => workshop.automatedScoring === true).length,
        scorePredictionWorkshops: workshops.filter((workshop) => workshop.scorePrediction === true).length,
        officialWorkshops: workshops.filter((workshop) => workshop.officialItem === true).length,
        releaseEligibleWorkshops: workshops.filter((workshop) => workshop.releaseEligible === true).length,
      },
    },
  },
  editorialReviewQueue: {
    count: editorialAdvisories.length,
    advisories: editorialAdvisories,
    note: 'Advisories identify worthwhile human review targets. They are not automated proof that an item is defective.',
  },
  items: itemReportList,
  releaseAssessment: {
    releaseStatus: 'not-release-ready',
    releaseReady: false,
    reason: automatedStatus === 'pass'
      ? 'Automated structural QA passed, but every independent review, production, field-test, psychometric, and reverification gate remains open.'
      : 'Automated structural findings and all independent release gates remain unresolved.',
  },
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

if (automatedStatus === 'fail') {
  console.error(
    `AP Psychology pilot QA: structural failure (${structuralFindings.length} finding${structuralFindings.length === 1 ? '' : 's'}); release not ready.`
  );
  for (const finding of structuralFindings.slice(0, 40)) {
    console.error(
      `- [${finding.check}] ${finding.recordId ? `${finding.recordId}: ` : ''}${finding.message}`
    );
  }
  process.exitCode = 1;
} else {
  console.log(
    `AP Psychology pilot QA: automated structure passed (${items.length} items; ${inventory.chapters} chapters; ${inventory.constructedResponseWorkshops} unscored workshops); release remains blocked by ${humanGateDefinitions.length} independent/human gates.`
  );
}
