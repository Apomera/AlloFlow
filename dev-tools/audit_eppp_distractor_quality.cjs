#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const outputRoots = [
  path.join(root, 'test_prep'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep'),
];
const reportBasename = 'eppp_distractor_quality_diagnostics';
const analysisVersion = 'eppp-distractor-diagnostics-v1';
const reviewedAt = '2026-07-16';
const expectedItemCount = 1500;

// These are warning-only editorial diagnostics. The existing hard QA rule that
// rejects all/none-of-the-above options is deliberately duplicated below.
const forbiddenAggregateChoicePattern = /\b(?:all|none) of the above\b/i;
const extremeWordPattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/gi;

const stopWords = new Set(`
  a an the and or but if then than as at by for from in into of on to with
  without about above below after before between during under over through
  is are was were be been being am do does did doing have has had having
  can could may might must shall should will would this that these those it
  its their them they we you your who whom whose which what when where why how
  all any each every both few more most other some such no nor not only own
  same so too very complete statement according best accurately accurate
  described describes describe primarily refers refer mean means indicate
  indicates question answer response psychologist psychologists client clients
  person people individual individuals one two three four
`.trim().split(/\s+/));

const ignoredAcronyms = new Set([
  'APA', 'DSM', 'CNS', 'PNS', 'IQ', 'US', 'USA', 'WITH', 'WITHOUT', 'EXCEPT',
]);

const editorialPriorityAnchors = [
  {
    id: 'eppp-b006-biological-2',
    note: 'The queried category word neuron occurs only in the keyed option, making the answer visible without distinguishing glial functions.',
  },
  {
    id: 'eppp-v3-assessment-051',
    note: 'The key repeats Luria, neuropsychological, and battery from the stem while the distractors are mechanically implausible.',
  },
  {
    id: 'eppp-v2-professional-040',
    note: 'Three distractors contain stacked extreme modifiers, and fee splitting is repeated elsewhere in the bank.',
  },
  {
    id: 'eppp-v2-assessment-005',
    note: 'An advanced item asks for direct definitional recall and uses visibly implausible distractors.',
  },
  {
    id: 'eppp-v3-intervention-018',
    note: 'The key is a normal Bowen definition while the distractors rely on absolute and extreme wording.',
  },
  {
    id: 'eppp-b016-social-1',
    note: 'A direct definition is paired with all, only, and every cues in the distractors.',
  },
  {
    id: 'eppp-b022-assessment-1',
    note: 'The test name in the stem maps directly to the only option repeating personality, adult, and inventory.',
  },
  {
    id: 'eppp-b023-intervention-3',
    note: 'The keyed population is telegraphed by uniquely relevant clinical language and duplicates another DBT-origin objective.',
  },
  {
    id: 'eppp-v3-professional-030',
    note: 'A direct test-security definition is contrasted with categorically inappropriate actions instead of adjacent ethical distinctions.',
  },
  {
    id: 'eppp-v2-professional-030',
    note: 'Extreme distractors make the key obvious, and the theoretical-orientation claim needs source-level adjudication.',
  },
];

function writeFileWithRetry(filePath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, contents);
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw lastError;
}

function canonicalToken(value) {
  let token = String(value || '').toLowerCase().replace(/[\u2019']/g, '');
  if (token.length > 5 && token.endsWith('ies')) token = token.slice(0, -3) + 'y';
  else if (token.length > 5 && token.endsWith('ing')) token = token.slice(0, -3);
  else if (token.length > 4 && token.endsWith('ed')) token = token.slice(0, -2);
  else if (token.length > 4 && token.endsWith('es')) token = token.slice(0, -2);
  else if (token.length > 4 && token.endsWith('s')) token = token.slice(0, -1);
  return token;
}

function meaningfulTokens(value) {
  const matches = String(value || '').match(/[A-Za-z][A-Za-z0-9\u2019'_-]*|\d+(?:\.\d+)?/g) || [];
  return [...new Set(matches
    .map(canonicalToken)
    .filter((token) => token.length >= 3 && !stopWords.has(token)))];
}

function intersection(left, right) {
  return left.filter((entry) => right.has(entry));
}

function extremeTerms(value) {
  const terms = String(value || '').match(extremeWordPattern) || [];
  return [...new Set(terms.map((term) => term.toLowerCase()))].sort();
}

function lexicalLeakageFinding(item, itemIndex) {
  const promptTokens = new Set(meaningfulTokens(item.prompt));
  const choiceTokens = item.choices.map((choice) => meaningfulTokens(choice));
  const answerTokens = choiceTokens[item.answerIndex] || [];
  const distractorTokens = new Set(choiceTokens.flatMap((tokens, index) => index === item.answerIndex ? [] : tokens));
  const uniqueKeyStemTerms = answerTokens
    .filter((token) => promptTokens.has(token) && !distractorTokens.has(token))
    .sort();
  const overlapCounts = choiceTokens.map((tokens) => tokens.filter((token) => promptTokens.has(token)).length);
  const answerOverlap = overlapCounts[item.answerIndex] || 0;
  const maxDistractorOverlap = Math.max(...overlapCounts.filter((_, index) => index !== item.answerIndex), 0);
  if (!uniqueKeyStemTerms.length) return null;
  return {
    id: item.id,
    domainId: item.domainId,
    difficulty: item.difficulty,
    practiceBank: Math.floor(itemIndex / 100) + 1,
    itemInBank: (itemIndex % 100) + 1,
    answerIndex: item.answerIndex,
    uniqueKeyStemTerms,
    answerOverlap,
    maxDistractorOverlap,
    overlapAdvantage: answerOverlap - maxDistractorOverlap,
    prompt: item.prompt,
    keyedChoice: item.choices[item.answerIndex],
  };
}

function extremeDistractorFinding(item, itemIndex) {
  const optionTerms = item.choices.map(extremeTerms);
  const extremeDistractorIndexes = optionTerms
    .map((terms, index) => ({ index, terms }))
    .filter((entry) => entry.index !== item.answerIndex && entry.terms.length);
  if (optionTerms[item.answerIndex].length || extremeDistractorIndexes.length < 2) return null;
  return {
    id: item.id,
    domainId: item.domainId,
    difficulty: item.difficulty,
    practiceBank: Math.floor(itemIndex / 100) + 1,
    itemInBank: (itemIndex % 100) + 1,
    answerIndex: item.answerIndex,
    extremeDistractorIndexes: extremeDistractorIndexes.map((entry) => entry.index),
    termsByDistractor: Object.fromEntries(extremeDistractorIndexes.map((entry) => [entry.index, entry.terms])),
    prompt: item.prompt,
    keyedChoice: item.choices[item.answerIndex],
  };
}

function directRecallReason(prompt) {
  const text = String(prompt || '').trim();
  if (/^complete the statement\b/i.test(text)) return 'complete-the-statement definition';
  if (/^what (?:is|does|are)\b/i.test(text)) return 'direct what-is/does recall';
  if (/^which (?:term|concept|theory|model|statement|description|instrument|test|procedure|approach|measure)\b/i.test(text)) return 'direct named-concept recall';
  if (/^the .{0,120}\b(?:is|refers to|means|indicates|measures|assesses|proposes)\b/i.test(text)) return 'direct definition/completion';
  if (/\b(?:is|are) best defined as\b/i.test(text)) return 'best-defined-as recall';
  return '';
}

function advancedRecallFinding(item, itemIndex) {
  if (String(item.difficulty || '').toLowerCase() !== 'advanced') return null;
  const reason = directRecallReason(item.prompt);
  if (!reason) return null;
  return {
    id: item.id,
    domainId: item.domainId,
    difficulty: item.difficulty,
    practiceBank: Math.floor(itemIndex / 100) + 1,
    itemInBank: (itemIndex % 100) + 1,
    reason,
    prompt: item.prompt,
  };
}

function conceptText(item) {
  return String(item.prompt || '') + ' ' + String(item.choices[item.answerIndex] || '');
}

function conceptSignatures(item) {
  const text = conceptText(item);
  const acronyms = new Set((text.match(/\b[A-Z][A-Z0-9-]{1,}\b/g) || [])
    .filter((entry) => !ignoredAcronyms.has(entry)));
  const standards = new Set((text.match(/\bStandard\s+\d+\.\d+\b/gi) || [])
    .map((entry) => entry.toLowerCase().replace(/\s+/g, ' ')));
  const hyphenated = new Set((text.toLowerCase().match(/\b[a-z]{3,}-[a-z]{3,}\b/g) || [])
    .map(canonicalToken));
  return { acronyms, standards, hyphenated };
}

function duplicateDiagnostics(items) {
  const tokenDocuments = items.map((item) => meaningfulTokens(conceptText(item)));
  const documentFrequency = new Map();
  for (const document of tokenDocuments) {
    for (const token of document) documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
  }
  const idf = (token) => Math.log((1 + items.length) / (1 + (documentFrequency.get(token) || 0))) + 1;
  const vectors = tokenDocuments.map((document) => {
    const values = new Map(document.map((token) => [token, idf(token)]));
    const norm = Math.sqrt([...values.values()].reduce((sum, value) => sum + value * value, 0));
    return { values, norm };
  });
  const signatures = items.map(conceptSignatures);
  const pairs = [];

  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      if (items[leftIndex].domainId !== items[rightIndex].domainId) continue;
      const left = vectors[leftIndex];
      const right = vectors[rightIndex];
      if (!left.norm || !right.norm) continue;
      let dotProduct = 0;
      const sharedTerms = [];
      for (const [token, value] of left.values) {
        if (!right.values.has(token)) continue;
        dotProduct += value * right.values.get(token);
        sharedTerms.push(token);
      }
      if (sharedTerms.length < 2) continue;
      const similarity = dotProduct / (left.norm * right.norm);
      const sharedAcronyms = intersection([...signatures[leftIndex].acronyms], signatures[rightIndex].acronyms).sort();
      const sharedStandards = intersection([...signatures[leftIndex].standards], signatures[rightIndex].standards).sort();
      const sharedHyphenated = intersection([...signatures[leftIndex].hyphenated], signatures[rightIndex].hyphenated)
        .filter((token) => (documentFrequency.get(token) || 0) <= 5)
        .sort();
      const matchBasis = [];
      if (similarity >= 0.72 && sharedTerms.length >= 3) matchBasis.push('high-tfidf-similarity');
      if (sharedAcronyms.length && similarity >= 0.28 && sharedTerms.length >= 3) matchBasis.push('shared-acronym');
      if (sharedStandards.length && similarity >= 0.18) matchBasis.push('shared-ethics-standard');
      if (sharedHyphenated.length && similarity >= 0.15) matchBasis.push('shared-rare-hyphenated-term');
      if (!matchBasis.length) continue;
      const strongestSharedTerms = sharedTerms
        .sort((leftToken, rightToken) => idf(rightToken) - idf(leftToken) || leftToken.localeCompare(rightToken))
        .slice(0, 12);
      pairs.push({
        leftId: items[leftIndex].id,
        rightId: items[rightIndex].id,
        domainId: items[leftIndex].domainId,
        similarity: Number(similarity.toFixed(4)),
        matchBasis,
        sharedIdentifiers: [...new Set([...sharedAcronyms, ...sharedStandards, ...sharedHyphenated])].sort(),
        sharedTerms: strongestSharedTerms,
      });
    }
  }

  pairs.sort((left, right) => right.similarity - left.similarity
    || left.leftId.localeCompare(right.leftId)
    || left.rightId.localeCompare(right.rightId));

  const parent = new Map(items.map((item) => [item.id, item.id]));
  const find = (id) => {
    let cursor = id;
    while (parent.get(cursor) !== cursor) cursor = parent.get(cursor);
    let child = id;
    while (parent.get(child) !== child) {
      const next = parent.get(child);
      parent.set(child, cursor);
      child = next;
    }
    return cursor;
  };
  const union = (leftId, rightId) => {
    const leftRoot = find(leftId);
    const rightRoot = find(rightId);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };
  for (const pair of pairs) union(pair.leftId, pair.rightId);

  const groups = new Map();
  for (const pair of pairs) {
    const rootId = find(pair.leftId);
    if (!groups.has(rootId)) groups.set(rootId, new Set());
    groups.get(rootId).add(pair.leftId);
    groups.get(rootId).add(pair.rightId);
  }
  const itemOrder = new Map(items.map((item, index) => [item.id, index]));
  const clusters = [...groups.values()].map((itemIds) => {
    const sortedIds = [...itemIds].sort((leftId, rightId) => itemOrder.get(leftId) - itemOrder.get(rightId));
    const clusterPairs = pairs.filter((pair) => itemIds.has(pair.leftId) && itemIds.has(pair.rightId));
    return {
      itemIds: sortedIds,
      domainId: items[itemOrder.get(sortedIds[0])].domainId,
      pairCount: clusterPairs.length,
      maxSimilarity: Math.max(...clusterPairs.map((pair) => pair.similarity)),
      sharedIdentifiers: [...new Set(clusterPairs.flatMap((pair) => pair.sharedIdentifiers))].sort(),
    };
  }).sort((left, right) => right.maxSimilarity - left.maxSimilarity
    || right.itemIds.length - left.itemIds.length
    || left.itemIds[0].localeCompare(right.itemIds[0]));
  clusters.forEach((cluster, index) => { cluster.clusterId = 'concept-candidate-' + String(index + 1).padStart(3, '0'); });
  return { pairs, clusters };
}

function escapeMarkdown(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

const sourceText = fs.readFileSync(sourcePath, 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(sourceText).digest('hex');
const items = JSON.parse(sourceText);
if (!Array.isArray(items) || items.length !== expectedItemCount) {
  throw new Error('Expected exactly ' + expectedItemCount + ' EPPP items, found ' + (Array.isArray(items) ? items.length : 'non-array') + '.');
}
const invalidStructures = items.filter((item) => !item.id || !Array.isArray(item.choices) || item.choices.length !== 4 || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3);
if (invalidStructures.length) throw new Error('Cannot diagnose structurally invalid items: ' + invalidStructures.map((item) => item.id || '(missing id)').join(', '));

const forbiddenAggregateChoices = items.filter((item) => item.choices.some((choice) => forbiddenAggregateChoicePattern.test(choice)));
if (forbiddenAggregateChoices.length) {
  throw new Error('Hard QA violation: all/none-of-the-above remains prohibited. Found: ' + forbiddenAggregateChoices.map((item) => item.id).join(', '));
}

const lexicalLeakage = items.map(lexicalLeakageFinding).filter(Boolean).sort((left, right) => left.id.localeCompare(right.id));
const asymmetricExtremeDistractors = items.map(extremeDistractorFinding).filter(Boolean).sort((left, right) => left.id.localeCompare(right.id));
const advancedDirectRecall = items.map(advancedRecallFinding).filter(Boolean).sort((left, right) => left.id.localeCompare(right.id));
const conceptDuplicates = duplicateDiagnostics(items);

const lexicalById = new Map(lexicalLeakage.map((finding) => [finding.id, finding]));
const extremeById = new Map(asymmetricExtremeDistractors.map((finding) => [finding.id, finding]));
const recallById = new Map(advancedDirectRecall.map((finding) => [finding.id, finding]));
const duplicatePairsById = new Map();
for (const pair of conceptDuplicates.pairs) {
  if (!duplicatePairsById.has(pair.leftId)) duplicatePairsById.set(pair.leftId, []);
  if (!duplicatePairsById.has(pair.rightId)) duplicatePairsById.set(pair.rightId, []);
  duplicatePairsById.get(pair.leftId).push(pair);
  duplicatePairsById.get(pair.rightId).push(pair);
}

const itemById = new Map(items.map((item, index) => [item.id, { item, index }]));
function diagnosticsForId(id) {
  const diagnostics = [];
  if (lexicalById.has(id)) diagnostics.push('unique-key/stem-lexical-leakage');
  if (extremeById.has(id)) diagnostics.push('asymmetric-extreme-distractors');
  if (recallById.has(id)) diagnostics.push('advanced-direct-recall');
  if (duplicatePairsById.has(id)) diagnostics.push('semantic-concept-duplicate-candidate');
  return diagnostics;
}

const editorialAnchorOutcomes = editorialPriorityAnchors.map((anchor, index) => {
  const record = itemById.get(anchor.id);
  if (!record) throw new Error('Priority anchor does not resolve: ' + anchor.id);
  const diagnostics = diagnosticsForId(anchor.id);
  return {
    auditRank: index + 1,
    id: anchor.id,
    domainId: record.item.domainId,
    difficulty: record.item.difficulty,
    practiceBank: Math.floor(record.index / 100) + 1,
    itemInBank: (record.index % 100) + 1,
    status: diagnostics.length ? 'active-warning' : 'no-current-warning',
    diagnostics,
    duplicateCandidateLinks: (duplicatePairsById.get(anchor.id) || []).length,
    prompt: record.item.prompt,
    keyedChoice: record.item.choices[record.item.answerIndex],
    editorialNote: anchor.note,
  };
});

const anchorById = new Map(editorialAnchorOutcomes.map((entry) => [entry.id, entry]));
const scoredCandidates = items.map((item, index) => {
  const diagnostics = diagnosticsForId(item.id);
  if (!diagnostics.length) return null;
  const lexical = lexicalById.get(item.id);
  const extreme = extremeById.get(item.id);
  const duplicatePairs = duplicatePairsById.get(item.id) || [];
  const anchor = anchorById.get(item.id);
  const score = (lexical ? 3 + lexical.uniqueKeyStemTerms.length + Math.max(0, lexical.overlapAdvantage) : 0)
    + (extreme ? 2 + extreme.extremeDistractorIndexes.length * 2 : 0)
    + (recallById.has(item.id) ? 5 : 0)
    + (duplicatePairs.length ? Math.min(5, duplicatePairs.length) + Math.max(...duplicatePairs.map((pair) => pair.similarity)) * 3 : 0)
    + (anchor ? 4 : 0);
  return {
    id: item.id,
    domainId: item.domainId,
    difficulty: item.difficulty,
    practiceBank: Math.floor(index / 100) + 1,
    itemInBank: (index % 100) + 1,
    score: Number(score.toFixed(2)),
    diagnostics,
    duplicateCandidateLinks: duplicatePairs.length,
    prompt: item.prompt,
    keyedChoice: item.choices[item.answerIndex],
    editorialNote: anchor ? anchor.editorialNote : 'Combined warning score places this item in the next bounded editorial-review docket.',
  };
}).filter(Boolean).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));

const activeAnchorIds = new Set(editorialAnchorOutcomes.filter((entry) => entry.status === 'active-warning').map((entry) => entry.id));
const priorityDocket = [
  ...editorialAnchorOutcomes.filter((entry) => entry.status === 'active-warning').map((entry) => scoredCandidates.find((candidate) => candidate.id === entry.id)),
  ...scoredCandidates.filter((candidate) => !activeAnchorIds.has(candidate.id)),
].slice(0, 20).map((entry, index) => ({ ...entry, rank: index + 1 }));

const report = {
  schemaVersion: 1,
  analysisVersion,
  reportType: 'warning-only-editorial-diagnostics',
  reviewedAt,
  sourceFile: 'test_prep/eppp_native_items.json',
  sourceSha256,
  policy: {
    warningMeaning: 'Diagnostics identify candidates for human editorial review; they do not assert that an item is inaccurate or cause the generator to fail.',
    hardGate: 'All-of-the-above and none-of-the-above answer choices remain prohibited and cause this generator to fail.',
    limitation: 'Lexical and TF-IDF heuristics are triage aids, not psychometric calibration, item-response analysis, or independent expert validation.',
  },
  criteria: {
    uniqueKeyStemLexicalLeakage: 'The key has at least one meaningful stem token absent from every distractor; overlap counts are retained to help editors distinguish direct category echoes from weaker lexical signals.',
    asymmetricExtremeDistractors: 'At least two distractors contain absolute or extreme cue words while the keyed option contains none.',
    advancedDirectRecall: 'An item labeled advanced uses a direct definition or complete-the-statement prompt pattern.',
    semanticConceptDuplicates: 'Same-domain pairs are queued by high TF-IDF similarity or by a sufficiently similar shared acronym, ethics-standard number, or rare hyphenated identifier.',
  },
  summary: {
    totalItems: items.length,
    warningOnly: true,
    forbiddenAggregateChoices: forbiddenAggregateChoices.length,
    uniqueKeyStemLexicalLeakageCandidates: lexicalLeakage.length,
    asymmetricExtremeDistractorCandidates: asymmetricExtremeDistractors.length,
    advancedDirectRecallCandidates: advancedDirectRecall.length,
    semanticConceptDuplicatePairs: conceptDuplicates.pairs.length,
    semanticConceptDuplicateClusters: conceptDuplicates.clusters.length,
    editorialAnchorsWithActiveWarnings: editorialAnchorOutcomes.filter((entry) => entry.status === 'active-warning').length,
    editorialAnchorsWithNoCurrentWarning: editorialAnchorOutcomes.filter((entry) => entry.status === 'no-current-warning').length,
    priorityDocketItems: priorityDocket.length,
  },
  editorialAnchorOutcomes,
  priorityDocket,
  uniqueKeyStemLexicalLeakage: lexicalLeakage,
  asymmetricExtremeDistractors,
  advancedDirectRecall,
  semanticConceptDuplicates: conceptDuplicates,
};

const summaryRows = [
  ['Items scanned', report.summary.totalItems],
  ['Forbidden all/none aggregate choices', report.summary.forbiddenAggregateChoices],
  ['Unique key/stem lexical-leakage candidates', report.summary.uniqueKeyStemLexicalLeakageCandidates],
  ['Asymmetric extreme-distractor candidates', report.summary.asymmetricExtremeDistractorCandidates],
  ['Advanced direct-recall candidates', report.summary.advancedDirectRecallCandidates],
  ['Semantic concept-duplicate pairs', report.summary.semanticConceptDuplicatePairs],
  ['Semantic concept-duplicate clusters', report.summary.semanticConceptDuplicateClusters],
  ['Audited anchors with active warnings', report.summary.editorialAnchorsWithActiveWarnings],
  ['Audited anchors with no current warning', report.summary.editorialAnchorsWithNoCurrentWarning],
  ['Priority docket', report.summary.priorityDocketItems],
];
const markdown = `# EPPP distractor-quality diagnostics

Reviewed: ${reviewedAt}  
Analysis: ${analysisVersion}  
Input SHA-256: \`${sourceSha256}\`

## Interpretation

${report.policy.warningMeaning}

> ${report.policy.limitation}

The all/none-of-the-above prohibition remains a hard gate. The four diagnostic categories below are warnings and do not fail the release.

## Summary

| Metric | Result |
| --- | ---: |
${summaryRows.map(([label, value]) => `| ${label} | ${value} |`).join('\n')}

## Priority docket

| Rank | Item | Location | Domain | Diagnostics | Editorial reason |
| ---: | --- | --- | --- | --- | --- |
${priorityDocket.map((entry) => `| ${entry.rank} | ${entry.id} | Bank ${entry.practiceBank}, item ${entry.itemInBank} | ${entry.domainId} | ${entry.diagnostics.join(', ')} | ${escapeMarkdown(entry.editorialNote)} |`).join('\n')}

## Audited-anchor outcomes

| Audit rank | Item | Status | Current diagnostics |
| ---: | --- | --- | --- |
${editorialAnchorOutcomes.map((entry) => `| ${entry.auditRank} | ${entry.id} | ${entry.status} | ${entry.diagnostics.join(', ') || '--'} |`).join('\n')}

## Highest-similarity concept candidates

| Pair | Domain | Similarity | Basis | Shared identifiers |
| --- | --- | ---: | --- | --- |
${conceptDuplicates.pairs.slice(0, 50).map((pair) => `| ${pair.leftId} / ${pair.rightId} | ${pair.domainId} | ${pair.similarity.toFixed(4)} | ${pair.matchBasis.join(', ')} | ${escapeMarkdown(pair.sharedIdentifiers.join(', ') || '—')} |`).join('\n')}

## Diagnostic criteria

- **Unique key/stem lexical leakage:** ${report.criteria.uniqueKeyStemLexicalLeakage}
- **Asymmetric extreme distractors:** ${report.criteria.asymmetricExtremeDistractors}
- **Advanced direct recall:** ${report.criteria.advancedDirectRecall}
- **Semantic concept duplicates:** ${report.criteria.semanticConceptDuplicates}
`;

const json = JSON.stringify(report, null, 2) + '\n';
for (const outputRoot of outputRoots) {
  writeFileWithRetry(path.join(outputRoot, reportBasename + '.json'), json);
  writeFileWithRetry(path.join(outputRoot, reportBasename + '.md'), markdown);
}

console.log(
  'EPPP distractor diagnostics: ' + items.length + ' scanned; '
  + lexicalLeakage.length + ' lexical; '
  + asymmetricExtremeDistractors.length + ' extreme-word; '
  + advancedDirectRecall.length + ' advanced recall; '
  + conceptDuplicates.pairs.length + ' duplicate pairs; warnings only.',
);
