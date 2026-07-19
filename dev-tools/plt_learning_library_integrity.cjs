#!/usr/bin/env node
'use strict';

function collectReferenceSets(value, sets = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectReferenceSets(item, sets);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'references' && Array.isArray(item)) sets.push(item);
      else collectReferenceSets(item, sets);
    }
  }
  return sets;
}

function matches(text, pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return text.match(new RegExp(pattern.source, flags)) || [];
}

function auditLibraryIntegrity(library, spec, addFinding) {
  const text = JSON.stringify(library);
  const referenceSets = collectReferenceSets(library);
  const officialSourceReferenceSets = referenceSets.filter(references => references.includes(spec.officialSource)).length;
  const foreignCodes = (text.match(/\b562[1-5]\b/g) || []).filter(code => code !== spec.code);
  const k6Matches = matches(text, /praxis-plt-k6|plt[_-]?k6|K\s*[-\u2010-\u2015]\s*6/i);
  const foreignBandMatches = spec.foreignBandPatterns.flatMap(pattern => matches(text, pattern));
  const outOfBandMatches = spec.outOfBandPatterns.flatMap(pattern => matches(text, pattern));

  if (library.libraryId !== spec.libraryId || library.packId !== spec.packId || library.title !== spec.title) {
    addFinding('library-identity', `Expected ${spec.code} libraryId, packId, and title metadata`);
  }
  if (foreignCodes.length) addFinding('library-foreign-code', `Foreign PLT code occurrences: ${[...new Set(foreignCodes)].join(', ')}`);
  if (k6Matches.length) addFinding('library-foreign-band', `K-6/K\u20136 contamination occurrences: ${k6Matches.length}`);
  if (foreignBandMatches.length) addFinding('library-foreign-band', `Foreign PLT grade-band wording occurrences: ${foreignBandMatches.length}`);
  if (outOfBandMatches.length) addFinding('library-grade-band', `Out-of-band grade or learner wording occurrences: ${outOfBandMatches.length}`);
  if (referenceSets.length !== 223 || officialSourceReferenceSets !== referenceSets.length) {
    addFinding('library-source', `Official ${spec.code} Study Companion must appear in every reference set; found ${officialSourceReferenceSets}/${referenceSets.length}`);
  }

  return {
    expectedCode: spec.code,
    officialSource: spec.officialSource,
    referenceSets: referenceSets.length,
    officialSourceReferenceSets,
    foreignCodeOccurrences: foreignCodes.length,
    k6ContaminationOccurrences: k6Matches.length,
    foreignBandOccurrences: foreignBandMatches.length,
    outOfBandOccurrences: outOfBandMatches.length,
    negativeGates: 'pass',
  };
}

module.exports = { auditLibraryIntegrity };
