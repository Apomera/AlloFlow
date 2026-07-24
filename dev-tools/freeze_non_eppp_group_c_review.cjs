#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  auditSourceContentIntegrity: auditEcSource,
  auditPackContentIntegrity: auditEcPack,
  auditLibraryContentIntegrity: auditEcLibrary,
} = require('./special_education_early_childhood_5692/content_integrity.cjs');
const { findResponseFormIssue } = require('./speech_language_pathology_5331/semantic_response_form_gate.cjs');
const { auditCredentialRoleIntegrity } = require('./teaching_reading_5205/credential_role_integrity.cjs');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const outputPath = path.join(__dirname, 'authored', 'non_eppp_eppp_guided_qa_group_c.review.json');
const reviewedAt = '2026-07-18';
const reviewer = 'OpenAI Codex independent EPPP-guided review';
const artifactSuffixes = [
  '_pack.json', '_items.json', '_native_qa.json', '_native_qa.md',
  '_learning_library.json', '_learning_library_qa.json', '_learning_library_qa.md',
];

const specs = [
  {
    stem: 'special_education_5355',
    officialSource: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dwa68a3c59/pdfs/5355.pdf',
    selected: 120, minutes: 120,
    domains: { 'development-differences': 32, 'planning-instruction-environment': 38, assessment: 27, 'professional-practice-collaboration': 23 },
    manual: ['sp5355-b1-014', 'sp5355-b1-017', 'sp5355-b1-022', 'sp5355-b1-025', 'sp5355-b1-035', 'sp5355-b1-036', 'sp5355-b1-068', 'sp5355-b1-082', 'sp5355-b1-085', 'sp5355-b1-098'],
  },
  {
    stem: 'special_education_behavior_emotional_5372',
    officialSource: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5372.pdf',
    selected: 120, minutes: 120,
    domains: { 'development-characteristics-ebd': 22, 'planning-managing-learning-environments': 31, instruction: 31, assessment: 20, 'foundations-professional-responsibilities': 16 },
    manual: ['ebd5372-b1-045', 'ebd5372-b1-055', 'ebd5372-b1-063', 'ebd5372-b1-066', 'ebd5372-b1-068', 'ebd5372-b2-045', 'ebd5372-b2-049', 'ebd5372-b2-053', 'ebd5372-b2-061', 'ebd5372-b2-062'],
  },
  {
    stem: 'special_education_early_childhood_5692',
    officialSource: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5692.pdf',
    selected: 120, minutes: 120,
    domains: { 'child-development-early-learning': 25, 'curriculum-planning-instruction': 30, assessment: 24, 'partnering-collaborating': 22, 'legal-ethical-professionalism': 19 },
    manual: [
      'se5692-b1-005', 'se5692-b1-020', 'se5692-b1-025', 'se5692-b1-035', 'se5692-b1-036', 'se5692-b1-037', 'se5692-b1-056', 'se5692-b1-062', 'se5692-b1-085', 'se5692-b1-099',
      'se5692-b2-035', 'se5692-b2-036', 'se5692-b2-054', 'se5692-b2-085', 'se5692-b2-099',
      'se5692-b1-022', 'se5692-b2-022', 'se5692-b2-025', 'se5692-b2-037', 'se5692-b1-039', 'se5692-b2-039', 'se5692-b1-086', 'se5692-b2-086',
    ],
  },
  {
    stem: 'special_education_intellectual_disabilities_5322',
    officialSource: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5322.pdf',
    selected: 120, minutes: 120,
    domains: { 'development-characteristics-intellectual-disabilities': 22, 'planning-managing-learning-environment': 31, instruction: 31, assessment: 19, 'foundations-professional-responsibilities': 17 },
    manual: ['id5322-b1-045', 'id5322-b1-055', 'id5322-b1-063', 'id5322-b1-066', 'id5322-b2-045', 'id5322-b2-052', 'id5322-b2-059', 'id5322-b2-060', 'id5322-b2-063', 'id5322-b2-070'],
  },
  {
    stem: 'special_education_learning_disabilities_5383',
    officialSource: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5383.pdf',
    selected: 120, minutes: 120,
    domains: { 'development-characteristics-learning-disabilities': 20, 'planning-managing-learning-environment': 32, instruction: 33, 'identification-eligibility-placement': 14, 'foundations-professional-responsibilities': 21 },
    recast: { sourcePrompts: 63, libraryChecks: 24, flashcardFronts: 29, correctKeyChanges: 0 },
    manual: ['ld5383-b1-017', 'ld5383-b1-045', 'ld5383-b1-053', 'ld5383-b1-063', 'ld5383-b1-071', 'ld5383-b1-085', 'ld5383-b1-093', 'ld5383-b1-099', 'ld5383-b2-045', 'ld5383-b2-099'],
  },
  {
    stem: 'special_education_severe_profound_5547',
    officialSource: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5547.pdf',
    selected: 120, minutes: 120,
    domains: { 'development-individualized-needs': 35, 'planning-instruction-environment': 38, assessment: 23, 'ethical-legal-professional-collaboration': 24 },
    recast: { sourcePrompts: 194, libraryChecks: 60, flashcardFronts: 72, correctKeyChanges: 0 },
    manual: ['sp5547-b1-016', 'sp5547-b1-022', 'sp5547-b1-025', 'sp5547-b1-035', 'sp5547-b1-056', 'sp5547-b1-073', 'sp5547-b1-085', 'sp5547-b1-098', 'sp5547-b2-035', 'sp5547-b2-098'],
  },
  {
    stem: 'speech_language_pathology_5331',
    officialSource: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5331.pdf',
    selected: 132, minutes: 150,
    domains: { 'foundations-professional-practice': 44, 'screening-assessment-diagnosis': 44, 'treatment-planning-evaluation': 44 },
    manual: [
      'slp5331-b1-009', 'slp5331-b1-026', 'slp5331-b1-028', 'slp5331-b1-034', 'slp5331-b1-047', 'slp5331-b1-049', 'slp5331-b1-060', 'slp5331-b1-061', 'slp5331-b1-062', 'slp5331-b1-063', 'slp5331-b1-064', 'slp5331-b1-066', 'slp5331-b1-093', 'slp5331-b1-094', 'slp5331-b1-095', 'slp5331-b1-099',
      'slp5331-b2-009', 'slp5331-b2-026', 'slp5331-b2-034', 'slp5331-b2-061', 'slp5331-b2-062', 'slp5331-b2-064', 'slp5331-b2-094',
    ],
  },
  {
    stem: 'teaching_reading_5205',
    officialSource: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw08f38395/pdfs/5205.pdf',
    selected: 90, constructed: 3, minutes: 120, officialMinutes: 150,
    domains: { 'phonological-emergent': 14, 'phonics-decoding': 18, 'vocabulary-fluency': 21, comprehension: 21, 'written-expression': 16 },
    manual: ['tr5205-b1-005', 'tr5205-b1-034', 'tr5205-b1-070', 'tr5205-b1-071', 'tr5205-b1-075', 'tr5205-b1-077', 'tr5205-b1-078', 'tr5205-b1-080', 'tr5205-b1-082', 'tr5205-b1-093', 'tr5205-b2-070', 'tr5205-b2-082', 'tr5205-b2-016', 'tr5205-b2-020', 'tr5205-b2-021', 'tr5205-b2-055', 'tr5205-b2-061'],
  },
];

const read = (file) => fs.readFileSync(file);
const json = (file) => JSON.parse(read(file));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const raw = (value) => String(value == null ? '' : value).normalize('NFKC').replace(/\s+/g, ' ').trim();
const canonical = (value) => raw(value).toLowerCase().replace(/["']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const words = (value) => raw(value).split(/\s+/).filter(Boolean).length;
const answerCounts = (items) => [0, 1, 2, 3].map((key) => items.filter((item) => item.answerIndex === key).length);
const itemText = (item) => [item.prompt, ...(item.choices || []), item.rationale, ...(item.choiceRationales || [])].join('\n');
const contentKernel = (item) => JSON.stringify({
  answer: canonical(item.choices?.[item.answerIndex]),
  distractors: (item.choices || []).filter((_, index) => index !== item.answerIndex).map(canonical).sort(),
  rationale: canonical(item.rationale), references: (item.references || []).map(canonical).sort(),
});
const responseKernel = (item) => JSON.stringify((item.choices || []).map(canonical).sort());
const visibleEncoding = /(?:\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00e2(?:\u20ac|[\u0080-\u00bf])|\u00f0\u0178|\u00ef\u00bf\u00bd|\ufffd|[A-Za-z]\?[A-Za-z])/u;

function collectHttps(value, output = new Set()) {
  if (Array.isArray(value)) value.forEach((entry) => collectHttps(entry, output));
  else if (value && typeof value === 'object') Object.values(value).forEach((entry) => collectHttps(entry, output));
  else if (typeof value === 'string' && /^https:\/\/\S+$/i.test(value.trim())) output.add(value.trim());
  return output;
}

function selectSimulation(pack) {
  const entries = (pack.domains || []).map((domain) => [domain.id, Number(pack.simulationDomainCounts?.[domain.id] || 0)]).filter((entry) => entry[1] > 0);
  if (!pack.simulationItemCount || entries.reduce((sum, entry) => sum + entry[1], 0) !== pack.simulationItemCount) return [];
  const independent = pack.items.filter((item) => item.examItemStatus !== 'not-approved-as-independent-exam-item');
  const queues = entries.map(([domainId, count]) => ({ count, items: independent.filter((item) => item.domainId === domainId).slice(0, count) }));
  if (queues.some((queue) => queue.items.length !== queue.count)) return [];
  const selected = [];
  for (let position = 0; selected.length < pack.simulationItemCount; position++) {
    queues.forEach((queue) => { if (queue.items[position]) selected.push(queue.items[position]); });
  }
  return selected;
}

function tokenSet(value) {
  return new Set(canonical(value).split(' ').filter((token) => token.length > 3));
}

function warningCodes(item) {
  const findings = [];
  const choices = item.choices || [];
  const key = choices[item.answerIndex] || '';
  if (raw(item.prompt).length < 35) findings.push('shortPrompt');
  if (choices.length === 4 && key) {
    const lengths = choices.map((choice) => canonical(choice).length);
    const longestWrong = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
    if (lengths[item.answerIndex] >= longestWrong + 20 && lengths[item.answerIndex] >= longestWrong * 1.75) findings.push('severeAnswerLengthClue');
    const stem = tokenSet(item.prompt), keyed = tokenSet(key);
    const wrong = choices.filter((_, index) => index !== item.answerIndex).map(tokenSet);
    if ([...stem].some((token) => keyed.has(token) && wrong.every((set) => !set.has(token)))) findings.push('keyStemLexicalLeakage');
    const extreme = /\b(?:always|never|only|entirely|completely|guarantees?|immediately|automatically|all students|no students)\b/i;
    if (choices.filter((choice, index) => index !== item.answerIndex && extreme.test(choice)).length >= 2 && !extreme.test(key)) findings.push('asymmetricExtremeDistractors');
  }
  const generic = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|does not represent the best available answer)\b/i;
  for (let index = 0; index < (item.choiceRationales || []).length; index++) {
    if (index === item.answerIndex) continue;
    const feedback = raw(item.choiceRationales[index]);
    if (feedback.length < 100 || words(feedback) < 16 || generic.test(feedback)) findings.push('incorrectOptionFeedbackDetail');
  }
  return [...new Set(findings)];
}

function repeatedSentenceCount(sections) {
  const sets = sections.map((section) => new Set(raw(section.content).split(/(?<=[.!?])\s+/).map(canonical).filter((sentence) => sentence.length >= 70)));
  return sets.length ? [...sets[0]].filter((sentence) => sets.every((set) => set.has(sentence))).length : 0;
}

function severeKeyLength(item) {
  if (item.choices?.length !== 4 || !Number.isInteger(item.answerIndex)) return false;
  const lengths = item.choices.map((choice) => canonical(choice).length);
  const wrong = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
  return lengths[item.answerIndex] >= wrong + 20 && lengths[item.answerIndex] >= wrong * 1.75;
}

const catalogPath = path.join(sourceDir, 'reference_catalog.json');
const catalog = json(catalogPath);
const hard = [];
const addHard = (stem, check, message, id = '') => hard.push({ stem, check, message, id });
if (!read(catalogPath).equals(read(path.join(deployDir, 'reference_catalog.json')))) addHard('reference_catalog', 'source-deploy-parity', 'Reference catalog differs between source and deploy.');

const warningNames = ['shortPrompt', 'severeAnswerLengthClue', 'keyStemLexicalLeakage', 'asymmetricExtremeDistractors', 'incorrectOptionFeedbackDetail'];
const warningTotals = Object.fromEntries(warningNames.map((name) => [name, 0]));
const feedbackTotals = { incorrectOptionExplanations: 0, startsWithGenericNotTheBestAnswerWrapper: 0, containsCompleteOverallRationale: 0, underSixteenWords: 0, underOneHundredCharacters: 0 };
const counters = { invalidKeys: 0, duplicateChoicesWithinItem: 0, missingOrShortRationales: 0, missingOptionFeedbackArrays: 0, invalidLearningLinks: 0, invalidReviewTierProvenance: 0, invalidOrUncatalogedReferences: 0, encodingDefects: 0 };
const allReferences = new Set();
const rows = [];
const artifactBindings = [];
const responseIndex = new Map();
const repetition = {};
const semanticClosure = {};
let sourceItemsReviewed = 0, activitiesReviewed = 0, guidedItemsReviewed = 0;
let distinctKernels = 0, newIndependentNeeded = 0, warningItems = 0;
let sourceDetailsPresent = 0, editorialChecksPresent = 0;
let chapters = 0, sections = 0, checks = 0, flashcards = 0, aids = 0, diagrams = 0, workshops = 0, labs = 0, severeLibraryKeys = 0;

for (const spec of specs) {
  const stem = spec.stem;
  const artifactHashes = {};
  for (const suffix of artifactSuffixes) {
    const sourcePath = path.join(sourceDir, stem + suffix), deployPath = path.join(deployDir, stem + suffix);
    if (!fs.existsSync(sourcePath) || !fs.existsSync(deployPath)) { addHard(stem, 'source-deploy-parity', `Missing ${suffix} source or deploy artifact.`); continue; }
    artifactHashes[suffix] = sha256(read(sourcePath));
    if (!read(sourcePath).equals(read(deployPath))) addHard(stem, 'source-deploy-parity', `${suffix} differs between source and deploy.`);
  }
  const pack = json(path.join(sourceDir, stem + '_pack.json'));
  const itemsArtifact = json(path.join(sourceDir, stem + '_items.json'));
  const nativeQa = json(path.join(sourceDir, stem + '_native_qa.json'));
  const libraryPath = path.join(sourceDir, stem + '_learning_library.json');
  const library = json(libraryPath);
  const libraryQa = json(path.join(sourceDir, stem + '_learning_library_qa.json'));
  const sourceItems = pack.items.slice(0, 200), guidedItems = pack.items.slice(200);
  const kernels = new Set(sourceItems.map(contentKernel)).size;
  const skills = new Map((library.skills || []).map((skill) => [skill.id, skill]));
  const chapterMap = new Map((library.chapters || []).map((chapter) => [chapter.id, chapter]));
  const packWarnings = Object.fromEntries(warningNames.map((name) => [name, 0]));
  let packWarningItems = 0;
  const { items: _items, ...packMetadata } = pack;
  if (visibleEncoding.test(JSON.stringify(packMetadata)) || visibleEncoding.test(JSON.stringify(library))) addHard(stem, 'encoding', 'Pack metadata or learning library contains visible encoding corruption.');

  if (JSON.stringify(itemsArtifact) !== JSON.stringify(pack.items)) addHard(stem, 'artifact-consistency', 'Items artifact differs from pack.items.');
  if (pack.status !== 'ready' || pack.items.length !== 500 || pack.batchSize !== 100 || pack.sections?.length !== 5) addHard(stem, 'pack-inventory', 'Pack is not a ready five-bank 500-activity release.');
  if (new Set(pack.items.map((item) => item.id)).size !== 500 || new Set(pack.items.map((item) => canonical(item.prompt))).size !== 500) addHard(stem, 'unique-items', 'IDs or normalized prompts are not unique across 500 activities.');
  if (answerCounts(pack.items).some((count) => count !== 125)) addHard(stem, 'answer-balance', 'Full-pack answers are not 125/125/125/125.');
  for (let bank = 0; bank < 5; bank++) if (answerCounts(pack.items.slice(bank * 100, bank * 100 + 100)).some((count) => count !== 25)) addHard(stem, 'answer-balance', `Bank ${bank + 1} is not 25/25/25/25.`);
  if (Number(pack.distinctSourceContentKernels) !== kernels || Number(pack.parallelSourceVariants) !== 200 - kernels || Number(pack.newIndependentItemsNeeded) !== 500 - kernels) addHard(stem, 'independent-content-accounting', 'Distinct-kernel, parallel-variant, or remaining-target declarations are stale.');
  if (pack.simulationItemCount !== spec.selected || pack.simulationTimeMinutes !== spec.minutes || pack.officialSelectedResponseCount !== spec.selected || pack.officialTotalTimeMinutes !== (spec.officialMinutes || spec.minutes) || JSON.stringify(pack.simulationDomainCounts) !== JSON.stringify(spec.domains)) addHard(stem, 'simulation-blueprint', 'Official count, time, or exact simulation domain allocation differs from the reviewed ETS blueprint.');
  if (spec.constructed && pack.officialConstructedResponseCount !== spec.constructed) addHard(stem, 'simulation-blueprint', 'Constructed-response count is missing or incorrect.');
  const simulation = selectSimulation(pack);
  if (simulation.length !== spec.selected || Object.entries(spec.domains).some(([domain, count]) => simulation.filter((item) => item.domainId === domain).length !== count)) addHard(stem, 'simulation-blueprint', 'The runtime-equivalent selector does not assemble the declared exact domain quotas.');
  if (!/not official|independent/i.test(String(pack.disclaimer || '')) || !/score|pass prediction/i.test(String(pack.disclaimer || ''))) addHard(stem, 'professional-boundary', 'Independent-preparation and no-score-prediction boundary is incomplete.');
  if (nativeQa.summary?.status !== 'pass' || libraryQa.summary?.status !== 'pass') addHard(stem, 'qa-status', 'Native or learning-library QA is not passing.');
  const sourceHash = sha256(Buffer.from(JSON.stringify(sourceItems))), libraryHash = sha256(read(libraryPath));
  artifactBindings.push({ stem, algorithm: 'sha256', reviewedAt, sourceItemCount: 200, sourceItemsSha256: sourceHash, learningLibrarySha256: libraryHash });
  for (const [label, qa] of [['native', nativeQa], ['learning-library', libraryQa]]) {
    const binding = qa.contentBinding;
    if (!binding || binding.algorithm !== 'sha256' || binding.reviewedAt !== reviewedAt || binding.sourceItemCount !== 200 || binding.sourceItemsSha256 !== sourceHash || binding.learningLibrarySha256 !== libraryHash) addHard(stem, 'qa-content-binding', `${label} QA is not cryptographically bound to this source-item/library snapshot.`);
  }

  const librarySections = (library.chapters || []).flatMap((chapter) => chapter.sections || []);
  const libraryChecks = (library.chapters || []).flatMap((chapter) => chapter.knowledgeChecks || []);
  const summary = library.summary || {};
  if (summary.chapters !== 12 || summary.sections !== 48 || summary.knowledgeChecks !== 60 || summary.diagrams !== 0 || summary.flashcards !== 75 || summary.memoryAids !== 20) addHard(stem, 'library-inventory', 'Library does not match the reviewed 12/48/60/0/75/20 inventory.');
  if (stem === 'teaching_reading_5205' && summary.constructedResponseWorkshops !== 9) addHard(stem, 'library-inventory', 'Teaching Reading must retain nine constructed-response workshops.');
  if (stem === 'special_education_intellectual_disabilities_5322' && summary.caseStudyDecisionLabs !== 6) addHard(stem, 'library-inventory', 'Intellectual Disabilities must retain six case-study decision labs.');
  for (const chapter of library.chapters || []) {
    if (!skills.has(chapter.skillId) || chapter.sections?.length !== 4 || chapter.knowledgeChecks?.length !== 5 || chapter.sections.some((section) => raw(section.content).length < 250) || chapter.knowledgeChecks.some((check) => check.choices?.length !== 4 || !Number.isInteger(check.answerIndex) || raw(check.rationale).length < 70)) addHard(stem, 'library-integrity', `Invalid chapter, lesson, or check: ${chapter.id || '(missing)'}.`);
  }
  for (const reference of collectHttps(library)) allReferences.add(reference);
  repetition[stem] = { sections: librarySections.length, longSentencesRepeatedInEverySection: repeatedSentenceCount(librarySections) };
  severeLibraryKeys += libraryChecks.filter(severeKeyLength).length;

  for (let index = 0; index < pack.items.length; index++) {
    const item = pack.items[index], choices = item.choices || [];
    const validKey = item.type === 'single-choice' && choices.length === 4 && Number.isInteger(item.answerIndex) && item.answerIndex >= 0 && item.answerIndex < 4;
    if (!validKey) { counters.invalidKeys++; addHard(stem, 'one-best-answer', 'Invalid one-best-answer structure.', item.id); }
    if (new Set(choices.map(raw)).size !== 4 || choices.some((choice) => !raw(choice) || /\b(?:all|none) of the above\b/i.test(choice))) { counters.duplicateChoicesWithinItem++; addHard(stem, 'choice-quality', 'Blank, duplicate, or all/none choice.', item.id); }
    if (raw(item.rationale).length < 80) { counters.missingOrShortRationales++; addHard(stem, 'rationale', 'Missing or short overall rationale.', item.id); }
    if (!Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4 || item.choiceRationales.some((feedback) => raw(feedback).length < 20)) { counters.missingOptionFeedbackArrays++; addHard(stem, 'option-feedback', 'Missing four substantive option explanations.', item.id); }
    const skill = skills.get(item.skillIds?.[0]), chapter = chapterMap.get(item.chapterIds?.[0]);
    if (item.skillIds?.length !== 1 || item.chapterIds?.length !== 1 || !skill || !chapter || skill.domainId !== item.domainId || skill.chapterId !== chapter.id || chapter.skillId !== skill.id) { counters.invalidLearningLinks++; addHard(stem, 'learning-link', 'Item does not resolve to one domain-compatible skill/chapter.', item.id); }
    if (index < 200) {
      if (item.sourceDetails && Object.keys(item.sourceDetails).length) sourceDetailsPresent++;
      if (item.editorialChecks && Object.keys(item.editorialChecks).length) editorialChecksPresent++;
      if (item.reviewStatus !== 'source-reviewed' || item.qaStatus !== 'qa-passed') { counters.invalidReviewTierProvenance++; addHard(stem, 'provenance', 'Source item lacks source-reviewed/qa-passed status.', item.id); }
      const kernel = responseKernel(item);
      if (!responseIndex.has(kernel)) responseIndex.set(kernel, []);
      responseIndex.get(kernel).push({ stem, id: item.id });
    } else if (item.reviewStatus !== 'assistant-reviewed-guided-practice-only' || item.qaStatus !== 'structural-qa-passed-guided-practice-only' || item.examItemStatus !== 'not-approved-as-independent-exam-item' || !item.sourceItemId) { counters.invalidReviewTierProvenance++; addHard(stem, 'provenance', 'Guided activity is not honestly source-linked and bounded.', item.id); }
    const references = item.references || [];
    if (!references.length || references.some((reference) => !/^https:\/\//i.test(reference) || !catalog[reference])) { counters.invalidOrUncatalogedReferences++; addHard(stem, 'source-catalog', 'Missing, invalid, or uncataloged HTTPS reference.', item.id); }
    references.forEach((reference) => allReferences.add(reference));
    if (visibleEncoding.test(itemText(item))) { counters.encodingDefects++; addHard(stem, 'encoding', 'Visible encoding corruption or an internal replacement question mark remains.', item.id); }
    if (index < 200) {
      const warnings = warningCodes(item);
      if (warnings.length) { packWarningItems++; warningItems++; }
      warnings.forEach((name) => { packWarnings[name]++; warningTotals[name]++; });
      for (let choice = 0; choice < (item.choiceRationales || []).length; choice++) {
        if (choice === item.answerIndex) continue;
        const feedback = raw(item.choiceRationales[choice]);
        feedbackTotals.incorrectOptionExplanations++;
        if (/^Not the best answer\b/i.test(feedback)) feedbackTotals.startsWithGenericNotTheBestAnswerWrapper++;
        if (canonical(item.rationale).length >= 30 && canonical(feedback).includes(canonical(item.rationale))) feedbackTotals.containsCompleteOverallRationale++;
        if (words(feedback) < 16) feedbackTotals.underSixteenWords++;
        if (feedback.length < 100) feedbackTotals.underOneHundredCharacters++;
      }
    }
  }

  for (const id of spec.manual) if (!sourceItems.some((item) => item.id === id)) addHard(stem, 'manual-review-docket', 'Manually adjudicated source item is missing from final snapshot.', id);
  if (stem === 'special_education_behavior_emotional_5372' || stem === 'special_education_intellectual_disabilities_5322') {
    const foreign = sourceItems.filter((item) => /\b5383\b|Teaching Students with Learning Disabilities|learning-disabilities specialist/i.test(itemText(item)));
    if (foreign.length) addHard(stem, 'credential-scope', `Foreign 5383 credential residue remains in ${foreign.length} source items.`);
    semanticClosure[stem] = { foreignLearningDisabilitiesCredentialOccurrences: foreign.length, status: foreign.length ? 'fail' : 'pass' };
  }
  if (stem === 'special_education_early_childhood_5692') {
    const sourceFindings = auditEcSource(require('./special_education_early_childhood_5692/item_content.cjs'));
    const packFindings = auditEcPack(pack), libraryFindings = auditEcLibrary(library);
    [...sourceFindings, ...packFindings, ...libraryFindings].forEach((finding) => addHard(stem, finding.check, finding.message, finding.id));
    semanticClosure[stem] = { staleTargetedPostpassOverridesRetired: 9, sourceFindings: sourceFindings.length, packFindings: packFindings.length, libraryFindings: libraryFindings.length, status: sourceFindings.length + packFindings.length + libraryFindings.length ? 'fail' : 'pass' };
  }
  if (stem === 'speech_language_pathology_5331') {
    const responseFormFindings = sourceItems.map((item) => ({ id: item.id, issue: findResponseFormIssue(item) })).filter((entry) => entry.issue);
    responseFormFindings.forEach((finding) => addHard(stem, 'semantic-response-form', finding.issue, finding.id));
    semanticClosure[stem] = { targetFormsReviewed: 14, responseFormFindings: responseFormFindings.length, status: responseFormFindings.length ? 'fail' : 'pass' };
  }
  if (stem === 'teaching_reading_5205') {
    const roleFindings = [];
    const integrity = auditCredentialRoleIntegrity(pack, library, (check, message, id) => roleFindings.push({ check, message, id }));
    roleFindings.forEach((finding) => addHard(stem, finding.check, finding.message, finding.id));
    semanticClosure[stem] = { ...integrity, findings: roleFindings.length };
  }
  if (stem === 'special_education_learning_disabilities_5383' || stem === 'special_education_severe_profound_5547') {
    const mechanical = sourceItems.filter((item) => /^(?:For (?:a|an) [^,]{0,120},\s*(?:a|an) (?:student|learner)|During [^,]{0,140},\s*during\b)/i.test(raw(item.prompt)));
    if (mechanical.length) addHard(stem, 'credential-prose-integrity', `${mechanical.length} duplicated mechanical adapter lead-ins remain.`);
    semanticClosure[stem] = { ...spec.recast, duplicatedMechanicalLeadIns: mechanical.length, status: mechanical.length ? 'fail' : 'pass' };
  }

  sourceItemsReviewed += 200; activitiesReviewed += pack.items.length; guidedItemsReviewed += guidedItems.length;
  distinctKernels += kernels; newIndependentNeeded += 500 - kernels;
  chapters += summary.chapters; sections += summary.sections; checks += summary.knowledgeChecks; diagrams += summary.diagrams; flashcards += summary.flashcards; aids += summary.memoryAids; workshops += summary.constructedResponseWorkshops || 0; labs += summary.caseStudyDecisionLabs || 0;
  rows.push({ stem, packId: pack.id, learningActivities: pack.items.length, sourceItems: 200, distinctIndependentContentKernels: kernels, parallelSourceVariants: 200 - kernels, guidedReviewItems: guidedItems.length, newIndependentItemsNeededFor500Distinct: 500 - kernels, packSha256: sha256(read(path.join(sourceDir, stem + '_pack.json'))), artifactSha256: artifactHashes, manualPriorityItemIds: spec.manual, warningItemCount: packWarningItems, warningCounts: packWarnings });
}

for (const reference of allReferences) {
  const detail = catalog[reference];
  if (!detail || raw(detail.title).length < 8 || raw(detail.organization).length < 4 || raw(detail.summary).length < 40 || raw(detail.credibility).length < 40 || visibleEncoding.test(JSON.stringify(detail))) addHard('reference_catalog', 'source-catalog', `Incomplete learner-facing metadata: ${reference}`);
}
const sharedResponseKernels = [...responseIndex.values()].filter((occurrences) => new Set(occurrences.map((entry) => entry.stem)).size > 1);
const runtimeDependencies = Object.fromEntries(specs.map(({ stem }) => {
  const file = path.join(__dirname, stem, 'item_content.cjs');
  if (!fs.existsSync(file)) return [stem, []];
  const matches = [...read(file).toString('utf8').matchAll(/require\(['"]\.\.\/([^'"]+)\/item_content\.cjs['"]\)/g)].map((match) => match[1]);
  return [stem, [...new Set(matches)]];
}));

if (hard.length) {
  console.error(JSON.stringify({ status: 'hard-findings', count: hard.length, findings: hard.slice(0, 100) }, null, 2));
  process.exitCode = 1;
  return;
}

const manualCount = specs.reduce((sum, spec) => sum + spec.manual.length, 0);
const snapshot = sha256(Buffer.from(rows.map((row) => `${row.stem}:${row.packSha256}`).join('\n')));
const report = {
  schemaVersion: 1,
  reviewedAt,
  reviewer,
  title: 'EPPP-guided independent QA review: non-EPPP group C final corrected snapshot',
  verdict: `pass-with-major-editorial-priorities-and-declared-independent-content-gaps - the corrected current snapshot has zero open hard factual, answer-key, source, credential-scope, response-form, learning-link, blueprint, provenance, encoding, or source/deploy-parity defects. The ${newIndependentNeeded.toLocaleString('en-US')}-question distinct-content gap, mechanically adapted cross-pack source architecture, generic feedback, clue signals, repeated library prose, and zero diagrams remain material nonblocking development warnings.`,
  packs: rows,
  sourceItemsReviewed,
  independentItemsReviewed: sourceItemsReviewed,
  learningActivitiesStructurallyReviewed: activitiesReviewed,
  manuallyAdjudicatedItems: manualCount,
  artifactBindings: artifactBindings.sort((left, right) => left.stem.localeCompare(right.stem)),
  reviewStandard: {
    guideArtifacts: ['test_prep/eppp_native_qa.json', 'test_prep/eppp_distractor_quality_diagnostics.json', 'test_prep/eppp_option_feedback_diagnostics.json', 'test_prep/eppp_native_quality_audit_wave_01.json', 'test_prep/eppp_native_quality_audit_wave_02.json', 'test_prep/eppp_native_quality_audit_wave_03.json', 'test_prep/eppp_learning_library.json', 'test_prep/eppp_learning_library_qa.json'],
    method: `Automated hard-gate inspection covered all ${activitiesReviewed.toLocaleString('en-US')} activities, all ${sourceItemsReviewed.toLocaleString('en-US')} source items, every library structure and learner-visible source, exact-blueprint runtime-equivalent simulation selection, cryptographic QA binding, and ${specs.length * artifactSuffixes.length + 1} source/deploy pairs. Manual review adjudicated ${manualCount} risk-priority source items and the focused EC, SLP, and Teaching Reading semantic cases.`,
    releaseRule: 'A verdict may begin with pass only when no current factual, key, one-best-answer, source, scope, response-form, learning-link, blueprint, provenance, encoding, or source/deploy-parity defect remains. Generic feedback, clue heuristics, cross-pack source adaptation, zero diagrams, and honestly declared distinct-content gaps remain visible nonblocking warnings.',
  },
  automatedResults: {
    snapshot: { algorithm: 'sha256', sha256: snapshot, meaning: 'Hash of the eight final source-pack hashes in exact Group C stem order.' },
    hardGate: { status: 'pass', openHardFindings: 0, activitiesChecked: activitiesReviewed, sourceItemsChecked: sourceItemsReviewed, answerBalance: { everyPack: [125, 125, 125, 125], everyOneHundredItemBank: [25, 25, 25, 25] }, ...counters },
    semanticCorrectionClosure: { status: 'pass', perPack: semanticClosure },
    independentContentAccounting: { status: 'honestly-declared-target-gap', sourceItems: sourceItemsReviewed, distinctIndependentContentKernels: distinctKernels, guidedReviewActivities: guidedItemsReviewed, independentQuestionTarget: 4000, newIndependentItemsNeeded: newIndependentNeeded, perPackGap: Object.fromEntries(rows.map((row) => [row.stem, row.newIndependentItemsNeededFor500Distinct])) },
    warningDiagnostics: { status: 'open-major-editorial-priority', sourceItemsScreened: sourceItemsReviewed, itemsWithOneOrMoreWarnings: warningItems, counts: warningTotals, perPackWarningItems: Object.fromEntries(rows.map((row) => [row.stem, row.warningItemCount])) },
    optionFeedbackAudit: { status: 'open-major-editorial-priority', ...feedbackTotals, interpretation: 'All required feedback fields are present and manually reviewed keys remain defensible, but repeated generic wrappers and full-rationale copies fall below EPPP-style selected-distractor remediation.' },
    learningLibraryAudit: { status: 'pass-hard-structure-with-depth-warnings', totals: { chapters, sections, knowledgeChecks: checks, diagrams, flashcards, memoryAids: aids, constructedResponseWorkshops: workshops, caseStudyDecisionLabs: labs }, knowledgeChecksWithSevereAnswerLengthClue: severeLibraryKeys, longSentenceRepetitionByPack: repetition, epppComparator: { chapters: 49, sections: 278, knowledgeChecks: 109, diagrams: 25, diagramPlacements: 58, flashcards: 415, memoryAids: 255 } },
    referenceCatalogAudit: { status: 'pass', uniqueLearnerVisibleReferences: allReferences.size, catalogedWithTitleOrganizationSummaryAndCredibility: allReferences.size, referenceCatalogSha256: sha256(read(catalogPath)) },
    itemLevelEditorialEvidenceAudit: { status: 'open-eppp-parity-warning', sourceItemsReviewed, sourceDetailsPresent, editorialChecksPresent, interpretation: 'Pack-level source catalogs and QA are present, but the source items do not yet carry EPPP-like item-level source-detail and editorial-check evidence.' },
    officialBlueprintVerification: specs.map((spec) => ({ stem: spec.stem, officialSource: spec.officialSource, officialSelectedResponseCount: spec.selected, officialConstructedResponseCount: spec.constructed || 0, officialTotalTimeMinutes: spec.officialMinutes || spec.minutes, packSimulation: `${spec.selected} selected-response items / ${spec.minutes} minutes`, exactDomainCounts: spec.domains, alignment: spec.constructed ? 'pass - exact selected-response quotas and 120-minute practice pacing are assembled; the three constructed responses and full 150-minute official session are separately disclosed' : 'pass - runtime-equivalent selection assembles the exact official domain counts and pacing' })),
    provenanceAudit: { status: 'open-major-editorial-and-distinctness-warning', runtimeDependencies, crossPackSharedResponseKernels: sharedResponseKernels.length, examples: sharedResponseKernels.slice(0, 10), interpretation: 'Runtime dependencies are disclosed. Generic credential lead-ins and snapshotted source adapters are not counted as new independent kernels. EC5692 derives from the 5355 architecture, and Teaching Reading retains disclosed historical 5302 snapshot provenance even though its runtime dependency is now local.' },
    sourceDeployParity: { status: 'pass', packArtifactPairsCompared: specs.length * artifactSuffixes.length, referenceCatalogPairsCompared: 1, totalByteIdenticalPairs: specs.length * artifactSuffixes.length + 1, artifactSuffixes },
  },
  manualPriorityFindings: {
    independentItemsManuallyAdjudicated: manualCount,
    wrongKeysFound: 0,
    factualOrScopeDefectsFoundInFinalSnapshot: 0,
    defensibleKeys: manualCount,
    findings: [
      { id: 'G-C-CLOSED-001', severity: 'hard-blueprint', blocking: true, status: 'resolved', title: '5355 and 5331 simulation selection previously did not preserve official domain allocations', resolution: 'Every Group C pack now carries exact domain quotas and the runtime-equivalent selector assembles those quotas from independent items.' },
      { id: 'G-C-CLOSED-002', severity: 'hard-credential-scope', blocking: true, status: 'resolved', title: 'EBD5372 and ID5322 retained imported learning-disabilities credential kernels', resolution: 'The named foreign 5383 kernels were recast and final source scans contain zero foreign 5383 credential residues.' },
      { id: 'G-C-CLOSED-003', severity: 'hard-factual-scope-and-encoding', blocking: true, status: 'resolved', title: 'EC5692 mechanical substitutions conflated Part C and Part B and produced malformed prose', resolution: 'Targeted Part C/Part B, IFSP/IEP, Child Find, FAPE, transition, placement, task-analysis, grammar, pack, and learning-library gates all pass.' },
      { id: 'G-C-CLOSED-004', severity: 'hard-response-form', blocking: true, status: 'resolved', title: 'SLP5331 contained seven malformed or nonresponsive source kernels across two forms', resolution: 'All fourteen released target forms pass the response-form gate and source/deploy artifacts match.' },
      { id: 'G-C-CLOSED-005', severity: 'hard-credential-scope-and-encoding', blocking: true, status: 'resolved', title: 'Teaching Reading 5205 retained specialist/coach/adolescent scope and replacement punctuation', resolution: 'All 200 source items and the full library pass the elementary-classroom role, grade-band, malformed-response, and encoding gates; runtime content is local rather than requiring 5302.' },
      { id: 'G-C-CLOSED-006', severity: 'hard-prose-integrity', blocking: true, status: 'resolved', title: 'LD5383 and Severe/Profound5547 retained duplicated mechanical adapter lead-ins', resolution: 'The final source banks contain zero duplicated lead-ins under the release gate; cross-pack architectural provenance remains openly declared as a nonblocking distinctness warning.' },
      { id: 'G-C-OPEN-001', severity: 'major-editorial', blocking: false, status: 'open', title: 'Wrong-option feedback remains substantially generic', evidence: feedbackTotals, impact: 'Feedback is present and directionally accurate, but often does not diagnose the selected distractor as specifically as EPPP feedback.' },
      { id: 'G-C-OPEN-002', severity: 'major-editorial', blocking: false, status: 'open', title: 'Answer-length, lexical-overlap, and distractor-extremity signals remain', evidence: warningTotals, impact: 'Some items remain easier to solve by wording cues than by credential knowledge.' },
      { id: 'G-C-OPEN-003', severity: 'major-product-development', blocking: false, status: 'open-and-transparently-declared', title: 'Five 100-activity banks do not yet equal 500 distinct questions per pack', evidence: { distinctIndependentContentKernels: distinctKernels, independentQuestionTarget: 4000, newIndependentItemsNeeded: newIndependentNeeded }, impact: 'Guided transformations are useful practice but remain correctly excluded from the independent-question count.' },
      { id: 'G-C-OPEN-004', severity: 'major-provenance-and-editorial', blocking: false, status: 'open', title: 'Cross-pack source architecture remains mechanically adapted', evidence: { runtimeDependencies, crossPackSharedResponseKernels: sharedResponseKernels.length }, impact: 'Credential-specific lead-ins do not create an independent content kernel; EC5692-to-5355 and historical Reading5205-to-5302 adaptation remain major reauthoring priorities.' },
      { id: 'G-C-OPEN-005', severity: 'moderate-feature-depth', blocking: false, status: 'open', title: 'Libraries remain less visual and more repetitive than EPPP', evidence: { diagrams, repetition, knowledgeChecksWithSevereAnswerLengthClue: severeLibraryKeys }, impact: 'Hard structure passes, but remediation depth and test-likeness remain below the EPPP comparison model.' },
      { id: 'G-C-OPEN-006', severity: 'moderate-qa-depth', blocking: false, status: 'open', title: 'Item-level editorial evidence remains thinner than EPPP', evidence: { sourceItemsReviewed, sourceDetailsPresent, editorialChecksPresent }, impact: 'Pack-level source and QA coverage passes, but provenance and editorial adjudication are not exposed per source item with EPPP-like detail.' },
    ],
  },
  correctionsRecommended: [
    { priority: 'P1', releaseBlocking: false, productTargetBlocking: true, action: `Author ${newIndependentNeeded.toLocaleString('en-US')} genuinely new credential-specific kernels, preserve official blueprint balance, and never relabel guided transformations as independent questions.` },
    { priority: 'P1', releaseBlocking: false, action: 'Replace adapted cross-pack response kernels and historical snapshots with independently authored credential-specific cases, beginning with EC5692 and Teaching Reading 5205.' },
    { priority: 'P1', releaseBlocking: false, action: 'Rewrite generic wrong-option explanations as concise selected-distractor diagnoses and edit the highest clue-warning items for parallel length, grammar, specificity, and plausibility.' },
    { priority: 'P2', releaseBlocking: false, action: 'Deepen repeated learning sections and add selective accessible diagrams only where a visual materially teaches the credential content.' },
    { priority: 'P3', releaseBlocking: false, action: 'Obtain credential-specific subject-matter, accessibility, legal/ethical, field-test, and psychometric review before making validity, readiness, score, or pass claims.' },
  ],
  limitations: [
    `Automation inspected all ${activitiesReviewed.toLocaleString('en-US')} activities and library structures, but semantic key/factual adjudication was risk-based and manually covered ${manualCount} of ${sourceItemsReviewed.toLocaleString('en-US')} source items rather than every key.`,
    `The ${guidedItemsReviewed.toLocaleString('en-US')} guided activities were structurally checked for derivation, linkage, provenance, feedback, references, and boundaries; they were not treated as independent exam questions.`,
    'Clue diagnostics are screening heuristics and do not by themselves prove that a key is wrong.',
    'Official ETS Study Companions were used for counts, formats, and timing; specifications can change and this is not ETS approval.',
    'Reference-catalog checks establish learner-facing metadata coverage, not sentence-level validation of every external source.',
    'No psychometric calibration, field testing, differential-item-functioning analysis, credential-owner approval, or licensed-professional endorsement was performed.',
    'EPPP is a feature and review-process comparator, not an official validation standard; its learning-library QA itself remains review-in-progress.',
    'Artifact hashes and parity describe the freeze-time snapshot; any later generator or content change requires a fresh QA freeze.',
  ],
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(`Group C QA freeze: ${specs.length} packs; ${activitiesReviewed} activities; ${sourceItemsReviewed} source items; ${manualCount} manually adjudicated; 0 hard findings; report ${path.relative(root, outputPath)}.`);
