'use strict';

const SOURCE_ITEM_COUNT = 200;
const K6_PATTERN = /praxis-plt-k6|plt[_-]?k6|\bK\s*[-\u2010-\u2015]\s*6\b/i;
const MALFORMED_BAND_PATTERNS = [
  /\bgrades?\s+grades?\b/i,
  /\bgrades?\s+(?:birth|preschool)\b/i,
  /\bbirth\s*[-\u2010-\u2015]\s*grade\s*3\b/i,
];
const ENCODING_CORRUPTION_PATTERNS = [
  /\u00e2(?:\u0080|\u20ac)/i,
  /\u00c3[\u0080-\u00ff]/i,
  /\ufffd/,
];

const itemText = (item) => [
  item?.prompt,
  ...(item?.choices || []),
  item?.rationale,
  ...(item?.choiceRationales || []),
].filter(Boolean).join('\n');

function occurrences(text, pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return text.match(new RegExp(pattern.source, flags)) || [];
}

function patternOccurrences(text, patterns) {
  return patterns.flatMap((pattern) => occurrences(text, pattern));
}

function auditPackIntegrity(pack, spec, addFinding = () => {}) {
  const allItems = Array.isArray(pack?.items) ? pack.items : [];
  const sourceItems = allItems.slice(0, SOURCE_ITEM_COUNT);
  const foreignBandPatterns = [
    ...(spec.foreignBandPatterns || []),
    ...(spec.packForeignBandPatterns || []),
  ];
  let foreignCodeOccurrences = 0;
  let k6ContaminationOccurrences = 0;
  let foreignBandOccurrences = 0;
  let outOfBandOccurrences = 0;
  let malformedBandOccurrences = 0;
  let encodingCorruptionOccurrences = 0;
  let packIdentityMisses = 0;
  let sourceItemIdentityMisses = 0;

  if (pack?.id !== spec.packId) {
    packIdentityMisses++;
    addFinding('pack-identity', `Expected ${spec.code} packId ${spec.packId}`);
  }
  if (sourceItems.length !== SOURCE_ITEM_COUNT) {
    addFinding('pack-source-inventory', `Expected ${SOURCE_ITEM_COUNT} source items, found ${sourceItems.length}`);
  }
  for (const item of sourceItems) {
    if (!new RegExp(`^plt${spec.code}-b[12]-\\d{3}$`).test(item.id || '')) {
      sourceItemIdentityMisses++;
      addFinding('pack-source-identity', `Source item ID does not match PLT ${spec.code}`, item.id);
    }
  }

  for (const item of allItems) {
    const text = itemText(item);
    const foreignCodes = (text.match(/\b562[1-5]\b/g) || []).filter((code) => code !== spec.code);
    const k6Matches = occurrences(text, K6_PATTERN);
    const foreignBandMatches = patternOccurrences(text, foreignBandPatterns);
    const outOfBandMatches = patternOccurrences(text, spec.outOfBandPatterns || []);
    const malformedBandMatches = patternOccurrences(text, MALFORMED_BAND_PATTERNS);
    const encodingMatches = patternOccurrences(text, ENCODING_CORRUPTION_PATTERNS);
    foreignCodeOccurrences += foreignCodes.length;
    k6ContaminationOccurrences += k6Matches.length;
    foreignBandOccurrences += foreignBandMatches.length;
    outOfBandOccurrences += outOfBandMatches.length;
    malformedBandOccurrences += malformedBandMatches.length;
    encodingCorruptionOccurrences += encodingMatches.length;
    if (foreignCodes.length) addFinding('pack-foreign-code', `Foreign PLT code occurrences: ${[...new Set(foreignCodes)].join(', ')}`, item.id);
    if (k6Matches.length) addFinding('pack-foreign-band', `K-6/K\u20136 credential wording occurs ${k6Matches.length} time(s)`, item.id);
    if (foreignBandMatches.length) addFinding('pack-foreign-band', `Foreign PLT grade-band wording occurs ${foreignBandMatches.length} time(s)`, item.id);
    if (outOfBandMatches.length) addFinding('pack-grade-band', `Out-of-band grade or learner wording occurs ${outOfBandMatches.length} time(s)`, item.id);
    if (malformedBandMatches.length) addFinding('pack-grade-band', `Malformed or doubled grade-band wording occurs ${malformedBandMatches.length} time(s)`, item.id);
    if (encodingMatches.length) addFinding('pack-encoding', `UTF-8 mojibake or replacement characters occur ${encodingMatches.length} time(s)`, item.id);
  }

  const failed = sourceItems.length !== SOURCE_ITEM_COUNT || packIdentityMisses || sourceItemIdentityMisses
    || foreignCodeOccurrences || k6ContaminationOccurrences || foreignBandOccurrences
    || outOfBandOccurrences || malformedBandOccurrences || encodingCorruptionOccurrences;
  return {
    expectedCode: spec.code,
    expectedPackId: spec.packId,
    sourceItemsReviewed: sourceItems.length,
    allItemsReviewed: allItems.length,
    packIdentityMisses,
    sourceItemIdentityMisses,
    foreignCodeOccurrences,
    k6ContaminationOccurrences,
    foreignBandOccurrences,
    outOfBandOccurrences,
    malformedBandOccurrences,
    encodingCorruptionOccurrences,
    negativeGates: failed ? 'fail' : 'pass',
  };
}

module.exports = {
  SOURCE_ITEM_COUNT,
  K6_PATTERN,
  MALFORMED_BAND_PATTERNS,
  ENCODING_CORRUPTION_PATTERNS,
  auditPackIntegrity,
};
