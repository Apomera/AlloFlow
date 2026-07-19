'use strict';

const SOURCE_ITEM_IDS = [1, 2].flatMap((batch) =>
  Array.from({ length: 13 }, (_, offset) =>
    `tr5205-b${batch}-${String(70 + offset).padStart(3, '0')}`));
const ADDITIONAL_CORRECTED_SOURCE_ITEM_IDS = [
  'tr5205-b2-016', 'tr5205-b2-020', 'tr5205-b2-021', 'tr5205-b2-055', 'tr5205-b2-061',
  'tr5205-b1-034', 'tr5205-b2-034',
];
const LIBRARY_CHECK_IDS = [9, 10].flatMap((chapter) =>
  Array.from({ length: 5 }, (_, offset) =>
    `tr5205-ch-${String(chapter).padStart(2, '0')}-check-${String(offset + 1).padStart(2, '0')}`));
const TARGET_FLASHCARD_CHAPTER_IDS = new Set(['tr5205-ch-09', 'tr5205-ch-10']);

const TARGET_ROLE_PATTERNS = [
  /\breading specialist\b/i, /\bliteracy specialist\b/i, /\bliteracy coach\b/i,
  /\bcoach(?:es|ed|ing)?\b/i, /\bmtss leadership\b/i, /\bprogram leadership\b/i,
  /\badult[- ]learning\b/i, /\bprofessional[- ]learning\b/i, /\bjob[- ]embedded\b/i,
  /\bleaders?\s+(?:select|choose|evaluate|want)\b/i,
];
const SUITE_SCOPE_PATTERNS = [
  /\breading specialist\b/i, /\bliteracy specialist\b/i, /\bliteracy coach\b/i,
  /\bcoach(?:es|ed|ing)?\b/i, /\badolescen\w*\b/i, /\bolder readers?\b/i,
  /\b5302\b/i, /\bsecondary\b/i, /\brecursive decoding\b/i,
  /\bgrades?\s*(?:7|8|9|10|11|12)\b/i,
];
const MALFORMED_RESPONSE_PATTERNS = [/\?use a strategy\?/i, /intelligence\?achievement/i];
const ENCODING_CORRUPTION_PATTERNS = [
  /\u00e2(?:\u0080|\u20ac)/i, /\u00c3[\u0080-\u00ff]/i, /\ufffd/,
  /phoneme\?grapheme/i, /\b(?:measure|student|task)\?s\b/i,
];
const CLASSROOM_RESPONSIBILITY_PATTERN = /\b(?:classroom teacher|teacher|student|instruction|lesson|learner)\b/i;

const itemText = (item) => [item?.prompt, ...(item?.choices || []), item?.rationale, ...(item?.choiceRationales || [])]
  .filter(Boolean).join('\n');
const activityText = (activity) => [activity?.prompt, activity?.front, activity?.back,
  ...(activity?.choices || []), activity?.rationale].filter(Boolean).join('\n');
const matched = (text, patterns) => patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);

function auditCredentialRoleIntegrity(pack, library, addFinding = () => {}) {
  const sourceItems = (pack.items || []).slice(0, 200);
  const sourceById = new Map(sourceItems.map((item) => [item.id, item]));
  const checks = (library.chapters || []).flatMap((chapter) => chapter.knowledgeChecks || []);
  const checksById = new Map(checks.map((check) => [check.id, check]));
  const flashcards = (library.flashcards || []).filter((card) => TARGET_FLASHCARD_CHAPTER_IDS.has(card.chapterId));
  let targetForeignRoleOccurrences = 0;
  let classroomResponsibilityMisses = 0;

  const reviewTarget = (scope, id, value) => {
    if (!value) {
      addFinding('credential-role-inventory', `${scope} is missing: ${id}`, id);
      return;
    }
    const text = scope === 'source item' ? itemText(value) : activityText(value);
    const matches = matched(text, TARGET_ROLE_PATTERNS);
    targetForeignRoleOccurrences += matches.length;
    if (matches.length) addFinding('credential-role-contamination', `${scope} retains a foreign/program-level role (${matches.join(', ')}).`, id);
    if (!CLASSROOM_RESPONSIBILITY_PATTERN.test(text)) {
      classroomResponsibilityMisses++;
      addFinding('credential-role-scope', `${scope} lacks a classroom teacher/student instructional responsibility.`, id);
    }
  };
  for (const id of SOURCE_ITEM_IDS) reviewTarget('source item', id, sourceById.get(id));
  const additionalCorrectedSourceItemsFound = ADDITIONAL_CORRECTED_SOURCE_ITEM_IDS
    .filter((id) => sourceById.has(id)).length;
  for (const id of ADDITIONAL_CORRECTED_SOURCE_ITEM_IDS) {
    if (!sourceById.has(id)) addFinding('credential-role-inventory', `Corrected source item is missing: ${id}`, id);
  }
  for (const id of LIBRARY_CHECK_IDS) reviewTarget('library check', id, checksById.get(id));
  for (const card of flashcards) reviewTarget('source-derived flashcard', card.id, card);
  if (flashcards.length !== 11) addFinding('credential-role-inventory', `Expected exactly 11 source-derived chapter 09/10 flashcards, found ${flashcards.length}.`);

  let suiteWideForeignScopeOccurrences = 0;
  let malformedResponseFormOccurrences = 0;
  let encodingCorruptionOccurrences = 0;
  for (const item of sourceItems) {
    const text = itemText(item);
    const scopeMatches = matched(text, SUITE_SCOPE_PATTERNS);
    const formMatches = matched(text, MALFORMED_RESPONSE_PATTERNS);
    const encodingMatches = matched(text, ENCODING_CORRUPTION_PATTERNS);
    suiteWideForeignScopeOccurrences += scopeMatches.length;
    malformedResponseFormOccurrences += formMatches.length;
    encodingCorruptionOccurrences += encodingMatches.length;
    if (encodingMatches.length) addFinding('encoding-integrity', 'Source item retains UTF-8 mojibake or replacement characters (' + encodingMatches.join(', ') + ').', item.id);
    if (scopeMatches.length) addFinding('credential-grade-band-leakage', `Source item retains foreign role/grade-band language (${scopeMatches.join(', ')}).`, item.id);
    if (formMatches.length) addFinding('response-form-text', `Source item retains malformed response-form punctuation (${formMatches.join(', ')}).`, item.id);
  }
  const libraryText = JSON.stringify(library);
  const libraryScopeMatches = matched(libraryText, SUITE_SCOPE_PATTERNS);
  const libraryFormMatches = matched(libraryText, MALFORMED_RESPONSE_PATTERNS);
  const libraryEncodingMatches = matched(libraryText, ENCODING_CORRUPTION_PATTERNS);
  suiteWideForeignScopeOccurrences += libraryScopeMatches.length;
  malformedResponseFormOccurrences += libraryFormMatches.length;
  encodingCorruptionOccurrences += libraryEncodingMatches.length;
  if (libraryEncodingMatches.length) addFinding('encoding-integrity', 'Learning library retains UTF-8 mojibake or replacement characters (' + libraryEncodingMatches.join(', ') + ').', library.libraryId);
  if (libraryScopeMatches.length) addFinding('credential-grade-band-leakage', `Learning library retains foreign role/grade-band language (${libraryScopeMatches.join(', ')}).`, library.libraryId);
  if (libraryFormMatches.length) addFinding('response-form-text', `Learning library retains malformed response-form punctuation (${libraryFormMatches.join(', ')}).`, library.libraryId);

  const failed = targetForeignRoleOccurrences || classroomResponsibilityMisses
    || suiteWideForeignScopeOccurrences || malformedResponseFormOccurrences || encodingCorruptionOccurrences
    || sourceItems.length !== 200 || flashcards.length !== 11
    || additionalCorrectedSourceItemsFound !== ADDITIONAL_CORRECTED_SOURCE_ITEM_IDS.length;
  return {
    expectedCredential: 'Praxis Teaching Reading: Elementary (5205)',
    expectedRole: 'K-6 classroom teacher responsible for literacy assessment and instruction within established school processes',
    allSourceItemsReviewed: sourceItems.length,
    fullLearningLibraryReviewed: true,
    targetSourceItemsReviewed: SOURCE_ITEM_IDS.length,
    additionalCorrectedSourceItemsReviewed: additionalCorrectedSourceItemsFound,
    libraryChecksReviewed: LIBRARY_CHECK_IDS.length,
    sourceDerivedFlashcardsReviewed: flashcards.length,
    targetForeignRoleOccurrences,
    classroomResponsibilityMisses,
    suiteWideForeignScopeOccurrences,
    malformedResponseFormOccurrences,
    encodingCorruptionOccurrences,
    negativeGates: failed ? 'fail' : 'pass',
  };
}

module.exports = {
  SOURCE_ITEM_IDS,
  ADDITIONAL_CORRECTED_SOURCE_ITEM_IDS,
  LIBRARY_CHECK_IDS,
  TARGET_FLASHCARD_CHAPTER_IDS,
  TARGET_ROLE_PATTERNS,
  SUITE_SCOPE_PATTERNS,
  MALFORMED_RESPONSE_PATTERNS,
  ENCODING_CORRUPTION_PATTERNS,
  auditCredentialRoleIntegrity,
};