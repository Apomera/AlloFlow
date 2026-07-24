#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const authoredDir = path.join(__dirname, 'authored');
const manifestPath = path.join(authoredDir, 'test_prep_independent_additions_manifest.json');
const waitBuffer = new Int32Array(new SharedArrayBuffer(4));
const HASH_BOUND_REVIEW_PROFILE = 'hash-bound-independent-cross-review-v1';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeAuthoredFile(name, label) {
  if (typeof name !== 'string' || path.basename(name) !== name || !/^[a-z0-9_.-]+$/i.test(name)) {
    throw new Error(label + ': authored manifest paths must be simple file names');
  }
  return path.join(authoredDir, name);
}

function isPassingReviewStatus(value) {
  return /^pass(?:$|[\s:\u2013\u2014-])/i.test(String(value || '').trim());
}

function nestedReviewBlockers(value, currentPath = 'review', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => nestedReviewBlockers(entry, currentPath + '[' + index + ']', findings));
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      const entryPath = currentPath + '.' + key;
      if (/^(?:blockers?|hardFindings?|openFindings?|unresolved\w*|failures?|errors?)$/i.test(key)) {
        const blocked = Array.isArray(entry)
          ? entry.length > 0
          : typeof entry === 'number'
            ? entry > 0
            : typeof entry === 'boolean'
              ? entry
              : Boolean(String(entry || '').trim()) && !/^(?:0|none|no|pass|resolved)$/i.test(String(entry).trim());
        if (blocked) findings.push(entryPath);
      }
      if (/status|verdict/i.test(key) && /fail|block|reject|pending|review.required/i.test(String(entry || ''))) {
        findings.push(entryPath);
      }
      nestedReviewBlockers(entry, entryPath, findings);
    }
  }
  return findings;
}

function writeGeneratedFile(file, data) {
  let error;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      fs.writeFileSync(file, data);
      return;
    } catch (caught) {
      error = caught;
      if (attempt < 8) Atomics.wait(waitBuffer, 0, 0, 150 * attempt);
    }
  }
  throw error;
}

function replaceBinaryMathOperator(value, escapedOperator, token) {
  const leftOperand = '(?:\\d+(?:\\.\\d+)?|[A-Za-z]|\\))';
  const rightOperand = '(?:\\d+(?:\\.\\d+)?|[A-Za-z]|\\()';
  const pattern = new RegExp(
    '(^|[^A-Za-z0-9_])(' + leftOperand + ')\\s*' + escapedOperator +
      '\\s*(' + rightOperand + ')(?=$|[^A-Za-z0-9_])',
    'g'
  );
  let normalized = value;
  while (true) {
    const next = normalized.replace(pattern, (_, prefix, left, right) =>
      prefix + left + ' ' + token + ' ' + right
    );
    if (next === normalized) return normalized;
    normalized = next;
  }
}

function normalizeMathOperators(value) {
  let normalized = value
    .replace(/\u2264/g, ' mathoplte ')
    .replace(/\u2265/g, ' mathopgte ')
    .replace(/\u2260/g, ' mathopneq ')
    .replace(/\u00d7/g, ' mathopmul ')
    .replace(/\u00f7/g, ' mathopdiv ')
    .replace(/\u2212/g, ' mathopminus ')
    .replace(/<=|≤/g, ' mathoplte ')
    .replace(/>=|≥/g, ' mathopgte ')
    .replace(/!=|≠/g, ' mathopneq ')
    .replace(/=/g, ' mathopeq ')
    .replace(/</g, ' mathoplt ')
    .replace(/>/g, ' mathopgt ')
    .replace(/×/g, ' mathopmul ')
    .replace(/÷/g, ' mathopdiv ')
    .replace(/−/g, ' mathopminus ')
    .replace(/\+/g, ' mathopplus ')
    .replace(/\^/g, ' mathoppow ');
  normalized = normalized.replace(
    /(^|[\s(\[{,:=<>+*/^])-(?=\s*(?:\d|[A-Za-z]\b))/g,
    (_, prefix) => prefix + ' mathopminus '
  );
  normalized = replaceBinaryMathOperator(normalized, '\\*', 'mathopmul');
  normalized = replaceBinaryMathOperator(normalized, '\\/', 'mathopdiv');
  return replaceBinaryMathOperator(normalized, '-', 'mathopminus');
}

function canonical(value, options = {}) {
  const raw = String(value ?? '').normalize('NFKC');
  const isStandaloneUrl = /^https?:\/\/\S+$/i.test(raw.trim());
  const operatorAware = options.mathOperators !== false && !isStandaloneUrl
    ? normalizeMathOperators(raw)
    : raw;
  return operatorAware
    .toLowerCase()
    .replace(/[“”"'’\u0060]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizedRawText(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function normalizedRawChoice(value) {
  return normalizedRawText(value).toLowerCase();
}

function contentKernel(item) {
  return JSON.stringify({
    answer: canonical(item.choices?.[item.answerIndex]),
    distractors: (item.choices || [])
      .filter((_, index) => index !== item.answerIndex)
      .map(value => canonical(value))
      .sort(),
    rationale: canonical(item.rationale),
    references: (item.references || [])
      .map(value => canonical(value, { mathOperators: false }))
      .sort(),
  });
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key];
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function sameCounts(actual, expected) {
  const normalize = value => Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
  return JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected));
}

function expectedDomainCounts(pack, size) {
  const domains = pack.domains.map((domain, index) => ({
    id: domain.id,
    index,
    raw: Math.max(0, Number(domain.weight) || 0) * size,
  }));
  const totalWeight = domains.reduce((sum, domain) => sum + domain.raw, 0);
  const weighted = totalWeight > 0
    ? domains
    : domains.map(domain => ({ ...domain, raw: size / Math.max(1, domains.length) }));
  const counts = Object.fromEntries(weighted.map(domain => [domain.id, Math.floor(domain.raw)]));
  let remaining = size - Object.values(counts).reduce((sum, count) => sum + count, 0);
  const order = [...weighted].sort((left, right) => (right.raw - Math.floor(right.raw)) - (left.raw - Math.floor(left.raw)) || left.index - right.index);
  for (let index = 0; remaining > 0; index++, remaining--) counts[order[index % order.length].id]++;
  return counts;
}

function tokenSet(value) {
  return new Set(canonical(value).split(' ').filter(token => token.length > 2));
}

function jaccard(left, right) {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap++;
  return overlap / (a.size + b.size - overlap);
}

function loadLearningLinks(stem, pack) {
  const libraryPath = path.join(sourceDir, stem + '_learning_library.json');
  if (!fs.existsSync(libraryPath)) throw new Error(stem + ': learning library not found');
  const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
  if (library.packId !== pack.id) throw new Error(stem + ': learning library packId mismatch');
  const domains = new Set((pack.domains || []).map(domain => domain.id));
  const skillRows = library.skills || [];
  const chapterRows = library.chapters || [];
  const skills = new Map(skillRows.map(skill => [skill.id, skill]));
  const chapters = new Map(chapterRows.map(chapter => [chapter.id, chapter]));
  if (!domains.size || !skills.size || !chapters.size) {
    throw new Error(stem + ': released domain, skill, and chapter inventories are required');
  }
  if (skills.size !== skillRows.length || chapters.size !== chapterRows.length) {
    throw new Error(stem + ': duplicate released skill or chapter IDs');
  }
  const references = new Set();
  const collectReferences = value => {
    if (Array.isArray(value)) value.forEach(collectReferences);
    else if (value && typeof value === 'object') Object.values(value).forEach(collectReferences);
    else if (typeof value === 'string' && validHttpsReference(value)) references.add(value);
  };
  collectReferences(pack);
  collectReferences(library);
  if (!references.size) throw new Error(stem + ': released reference inventory is empty');
  return { domains, skills, chapters, references };
}

function validHttpsReference(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function validateAuthoredBatch(stem, pack, batch, items, priorItems, strictMetadata) {
  const findings = [];
  const links = loadLearningLinks(stem, pack);
  if (items.length !== 100) findings.push('expected 100 items, found ' + items.length);
  const expectedDomains = expectedDomainCounts(pack, 100);
  const actualDomains = countBy(items, 'domainId');
  if (!sameCounts(actualDomains, expectedDomains)) {
    findings.push('domain counts ' + JSON.stringify(actualDomains) + ' do not match ' + JSON.stringify(expectedDomains));
  }
  const positions = [0, 1, 2, 3].map(answerIndex => items.filter(item => item.answerIndex === answerIndex).length);
  if (positions.some(count => count !== 25)) {
    findings.push('answer positions must be 25/25/25/25, found ' + positions.join('/'));
  }
  if (pack.id === 'parapro-1755-practice-1') {
    const focus = countBy(items, 'contentFocus');
    if (!sameCounts(focus, { 'basic-skills-knowledge': 67, 'application-classroom': 33 })) {
      findings.push('ParaPro content focus must be 67/33, found ' + JSON.stringify(focus));
    }
  }
  const ids = new Set(priorItems.map(item => item.id));
  const promptKeys = new Set(priorItems.map(item => canonical(item.prompt)));
  const prompts = [...priorItems];
  const kernels = new Set(priorItems.map(contentKernel));
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      findings.push('non-object item');
      continue;
    }
    const itemId = item.id || '(missing id)';
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(String(item.id || '')) || ids.has(item.id)) {
      findings.push(itemId + ': duplicate, missing, or invalid id');
    }
    ids.add(item.id);
    const promptKey = canonical(item.prompt);
    if (!item.prompt || normalizedRawText(item.prompt).length < 35) {
      findings.push(itemId + ': prompt is missing or too short');
    } else if (promptKeys.has(promptKey)) {
      findings.push(itemId + ': duplicates an existing normalized prompt');
    }
    promptKeys.add(promptKey);
    if (item.type !== 'single-choice') findings.push(itemId + ': type must be single-choice');
    if (!Array.isArray(item.choices) || item.choices.length !== 4
        || item.choices.some(choice => !normalizedRawText(choice))
        || new Set(item.choices.map(normalizedRawChoice)).size !== 4) {
      findings.push(itemId + ': requires four unique nonempty choices');
    }
    if (!Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) {
      findings.push(itemId + ': invalid answer index');
    }
    if (!item.rationale || String(item.rationale).trim().length < 80) {
      findings.push(itemId + ': rationale must be at least 80 characters');
    }
    if (!Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4
        || item.choiceRationales.some(value => String(value || '').trim().length < 20)) {
      findings.push(itemId + ': four substantive choice rationales required');
    }
    if (!Array.isArray(item.references) || !item.references.length
        || new Set(item.references).size !== item.references.length
        || item.references.some(reference => !validHttpsReference(reference))) {
      findings.push(itemId + ': unique well-formed HTTPS references are required');
    } else if (item.references.some(reference => !links.references.has(reference))) {
      findings.push(itemId + ': reference does not resolve in the released pack/library source inventory');
    }
    if (!links.domains.has(item.domainId)) findings.push(itemId + ': unknown domainId ' + item.domainId);
    if (!Array.isArray(item.skillIds) || item.skillIds.length !== 1
        || !Array.isArray(item.chapterIds) || item.chapterIds.length !== 1) {
      findings.push(itemId + ': exactly one skill and chapter link required');
    } else {
      const skill = links.skills.get(item.skillIds[0]);
      const chapter = links.chapters.get(item.chapterIds[0]);
      if (!skill || !chapter || skill.domainId !== item.domainId || chapter.domainId !== item.domainId
          || skill.chapterId !== chapter.id || chapter.skillId !== skill.id) {
        findings.push(itemId + ': skill/chapter link does not resolve within the item domain');
      }
    }
    if (!normalizedRawText(item.difficulty) || (strictMetadata && !normalizedRawText(item.cognitiveLevel))) {
      findings.push(itemId + ': required difficulty or cognitive level is missing');
    }
    if (item.authorship !== 'assistant-authored-independent'
        || item.editorialReviewer !== 'OpenAI Codex'
        || item.assistantReviewStatus !== 'reviewed-independent-draft'
        || item.examItemStatus !== 'assistant-reviewed-independent-draft'
        || item.reviewStatus !== 'assistant-reviewed-independent-draft'
        || item.qaStatus !== 'pending-integrated-qa'
        || item.sourceItemId != null) {
      findings.push(itemId + ': independent-draft provenance missing or source-derived provenance present');
    }
    const kernel = contentKernel(item);
    if (kernels.has(kernel)) findings.push(itemId + ': duplicates an existing normalized content kernel');
    kernels.add(kernel);
    for (const prior of prompts) {
      if (jaccard(item.prompt, prior.prompt) > 0.82) {
        findings.push(itemId + ': prompt is too similar to ' + prior.id);
        break;
      }
    }
    prompts.push(item);
  }
  if (findings.length) {
    throw new Error(pack.id + '/' + batch.id + ': authored-batch QA failed: ' + findings.slice(0, 16).join('; '));
  }
}

function validateReviewEvidence(stem, pack, batch, batchNumber, fileName, reportFileName, fileBytes, items, strict) {
  const label = stem + '/' + batch.id;
  const reportPath = safeAuthoredFile(reportFileName, label);
  if (!fs.existsSync(reportPath)) throw new Error(label + ': missing cross-review report ' + reportFileName);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (!report || !Number.isInteger(report.itemCount) || report.itemCount !== items.length
      || !isPassingReviewStatus(report.verdict)
      || !/OpenAI Codex independent cross-review/i.test(String(report.reviewer || ''))) {
    throw new Error(label + ': invalid or non-passing cross-review report ' + reportFileName);
  }
  if (strict) {
    const expectedReviewedFile = 'dev-tools/authored/' + fileName;
    const blockerPaths = nestedReviewBlockers(report);
    const binding = report.artifactBinding;
    const checkStatuses = [];
    const collectStatuses = value => {
      if (Array.isArray(value)) value.forEach(collectStatuses);
      else if (value && typeof value === 'object') {
        for (const [key, entry] of Object.entries(value)) {
          if (/status/i.test(key)) checkStatuses.push(String(entry || ''));
          collectStatuses(entry);
        }
      }
    };
    collectStatuses(report.checks);
    const lineByLineReview = Object.values(report.checks || {}).find(check =>
      check && typeof check === 'object' && Array.isArray(check.reviewedItemIds)
    );
    const reviewedItemIds = lineByLineReview?.reviewedItemIds;
    const expectedItemIds = items.map(item => item.id);
    const integration = report.integration;
    if (report.reviewedFile !== expectedReviewedFile
        || report.reviewedAt !== batch.reviewedAt
        || !Array.isArray(report.blockers) || report.blockers.length
        || !Array.isArray(report.correctionsMade)
        || !report.checks || typeof report.checks !== 'object'
        || !checkStatuses.length || checkStatuses.some(status => !isPassingReviewStatus(status))
        || blockerPaths.length
        || !Array.isArray(reviewedItemIds)
        || JSON.stringify(reviewedItemIds) !== JSON.stringify(expectedItemIds)
        || lineByLineReview.reviewedItems !== items.length
        || !binding || binding.algorithm !== 'sha256'
        || !/^[a-f0-9]{64}$/i.test(String(binding.sha256 || ''))
        || binding.sha256.toLowerCase() !== sha256(fileBytes)
        || !integration || integration.packId !== pack.id
        || integration.batchNumber !== batchNumber
        || integration.expectedInsertionTier !== 'assistant-authored-independent'
        || integration.expectedDiagnosticBankSize !== 100) {
      throw new Error(label + ': hash-bound review evidence failed for ' + reportFileName);
    }
  }
  return report;
}
function reviewItem(item, batch, batchNumber) {
  return {
    ...item,
    assistantReviewStatus: 'reviewed-independent-practice-item',
    examItemStatus: 'assistant-approved-as-independent-practice-item',
    reviewStatus: 'assistant-reviewed-independent-practice-item',
    qaStatus: 'qa-passed-independent-practice-item',
    assistantReviewedAt: batch.reviewedAt,
    independentBatchId: batch.id,
    independentBatchNumber: batchNumber,
    reviewMethod: 'independent-item-key-distractor-feedback-originality-blueprint-and-structural-review-v1',
  };
}

function updateQa(stem, pack) {
  const qaName = `${stem}_native_qa.json`;
  const qaPath = path.join(sourceDir, qaName);
  if (!fs.existsSync(qaPath)) return;
  const report = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
  const summary = report.summary || (report.summary = {});
  Object.assign(summary, {
    totalItems: 500,
    passedItems: 500,
    sourceItems: pack.sourceQuestionItems,
    assistantAuthoredIndependentItems: pack.assistantAuthoredIndependentItems,
    independentPracticeItems: pack.independentPracticeItems,
    distinctSourceContentKernels: pack.distinctSourceContentKernels,
    parallelSourceVariants: pack.parallelSourceVariants,
    distinctIndependentContentKernels: pack.distinctIndependentContentKernels,
    parallelIndependentVariants: pack.parallelIndependentVariants,
    guidedReasoningItems: pack.guidedReviewItems,
    independentQuestionTarget: 500,
    newIndependentItemsNeeded: pack.newIndependentItemsNeeded,
    structuralStatus: 'pass',
    contentDistinctnessStatus: pack.newIndependentItemsNeeded ? 'target-not-met' : 'target-met',
    assistantReviewVerdict: pack.assistantReview.verdict,
    sourceDiagnosticBanks: pack.sourceDiagnosticBatchCount,
    assistantAuthoredIndependentBanks: pack.assistantAuthoredIndependentBatchCount,
    independentDiagnosticBanks: pack.independentDiagnosticBatchCount,
    guidedReviewBanks: pack.guidedReviewBatchCount,
    learningActivityBanks: 5,
    status: 'pass',
  });
  if (report.diagnosticBatch) Object.assign(report.diagnosticBatch, {
    batchCount: 5,
    batchCountSemantics: 'legacy-total-learning-activity-bank-alias',
    sourceBatchCount: pack.sourceDiagnosticBatchCount,
    assistantAuthoredIndependentBatchCount: pack.assistantAuthoredIndependentBatchCount,
    independentDiagnosticBatchCount: pack.independentDiagnosticBatchCount,
    guidedReviewBatchCount: pack.guidedReviewBatchCount,
    learningActivityBankCount: 5,
  });
  report.generatedAt = new Date().toISOString();
  report.expansion = {
    independentQuestionTarget: 500,
    totalLearningActivities: 500,
    batchSize: 100,
    learningActivityBanks: 5,
    sourceItems: pack.sourceQuestionItems,
    assistantAuthoredIndependentItems: pack.assistantAuthoredIndependentItems,
    independentPracticeItems: pack.independentPracticeItems,
    distinctSourceContentKernels: pack.distinctSourceContentKernels,
    parallelSourceVariants: pack.parallelSourceVariants,
    distinctIndependentContentKernels: pack.distinctIndependentContentKernels,
    parallelIndependentVariants: pack.parallelIndependentVariants,
    guidedReasoningItems: pack.guidedReviewItems,
    newIndependentItemsNeeded: pack.newIndependentItemsNeeded,
    structurallyReviewedItems: 500,
    reviewer: 'OpenAI Codex',
    examItemReview: pack.assistantReview.verdict,
    method: 'Assistant-authored independent additions were reviewed for blueprint alignment, distinct stimuli, keyed-answer defensibility, distractor plausibility, feedback, citations, answer balance, and structure. Guided transformations remain approved only for guided practice.',
    findings: [],
  };
  const qaJson = JSON.stringify(report, null, 2) + '\n';
  writeGeneratedFile(qaPath, qaJson);
  writeGeneratedFile(path.join(deployDir, qaName), qaJson);

  const mdName = `${stem}_native_qa.md`;
  const mdPath = path.join(sourceDir, mdName);
  if (fs.existsSync(mdPath)) {
    let md = fs.readFileSync(mdPath, 'utf8').replace(/\n- Independent-batch audit:.*?(?=\n- |\n?$)/gs, '');
    md += `\n- Independent-batch audit: ${pack.sourceQuestionItems} original source questions plus ${pack.assistantAuthoredIndependentItems} assistant-authored independent practice questions produce ${pack.distinctIndependentContentKernels} distinct independent content kernels. ${pack.guidedReviewItems} additional activities remain guided review only. ${pack.newIndependentItemsNeeded} new independent questions remain to reach 500.\n`;
    writeGeneratedFile(mdPath, md);
    writeGeneratedFile(path.join(deployDir, mdName), md);
  }
}

function validReviewedDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validPackVersion(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(String(value || ''));
}

function stagePack(stem, pack, batches, authored, batchEvidence) {
  const base = pack.items.slice(0, 200);
  const independentItems = [...base, ...authored];
  const sourceKernelCount = new Set(base.map(contentKernel)).size;
  const independentKernelCount = new Set(independentItems.map(contentKernel)).size;
  const stagedBankCount = independentItems.length / 100;
  const reviewedAt = batches[batches.length - 1].reviewedAt;
  const staged = {
    ...pack,
    items: independentItems,
    sections: [
      ...Array.from({ length: 2 }, (_, index) => ({
        id: `diagnostic-batch-${index + 1}`,
        label: `100-item source diagnostic bank ${index + 1}`,
        kind: 'source-diagnostic',
        timeMinutes: null,
      })),
      ...batches.map((batch, index) => ({
        id: batch.id,
        label: batch.label || `Assistant-reviewed independent diagnostic bank ${index + 3}`,
        kind: 'independent-diagnostic',
        timeMinutes: null,
      })),
    ],
    sourceQuestionItems: 200,
    assistantAuthoredIndependentItems: authored.length,
    independentPracticeItems: independentItems.length,
    guidedReviewItems: 0,
    sourceDiagnosticBatchCount: 2,
    assistantAuthoredIndependentBatchCount: authored.length / 100,
    independentDiagnosticBatchCount: stagedBankCount,
    guidedReviewBatchCount: 0,
    learningActivityBankCount: stagedBankCount,
    diagnosticBatchCount: stagedBankCount,
    diagnosticBatchCountSemantics: 'validated-pre-expansion-independent-bank-count',
    distinctSourceContentKernels: sourceKernelCount,
    parallelSourceVariants: 200 - sourceKernelCount,
    distinctIndependentContentKernels: independentKernelCount,
    parallelIndependentVariants: independentItems.length - independentKernelCount,
    newIndependentItemsNeeded: 500 - independentKernelCount,
    expansionVersion: 'independent-additions-staged-v1',
    independentAdditionStaging: {
      schemaVersion: 1,
      status: 'validated-awaiting-final-expansion',
      manifestSchemaVersion: 2,
      packId: pack.id,
      packVersion: pack.version,
      sourceItems: 200,
      assistantAuthoredIndependentItems: authored.length,
      independentPracticeItems: independentItems.length,
      reviewedAt,
      reviewEvidenceProfile: batches.every(batch => batch.reviewEvidenceProfile === HASH_BOUND_REVIEW_PROFILE)
        ? HASH_BOUND_REVIEW_PROFILE
        : 'legacy-parapro-plus-hash-bound-independent-cross-review-v1',
      batches: batchEvidence,
    },
  };
  delete staged.assistantReview;
  delete staged.bankDisclosure;
  return staged;
}

function main() {
  if (!fs.existsSync(manifestPath)) {
    console.log('No independent-additions manifest found; no changes applied.');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 2 || !manifest.packs || typeof manifest.packs !== 'object'
      || Array.isArray(manifest.packs)
      || !Array.isArray(manifest.legacyReviewEvidencePacks)
      || JSON.stringify(manifest.legacyReviewEvidencePacks) !== JSON.stringify([])) {
    throw new Error('Independent-additions manifest is invalid or permits a legacy review profile');
  }

  const plans = [];
  const claimedAuthoredFiles = new Set();
  for (const [stem, batches] of Object.entries(manifest.packs)) {
    if (/^eppp/i.test(stem)) throw new Error(stem + ': EPPP additions are outside this pipeline');
    if (!Array.isArray(batches) || !batches.length || batches.length > 3) {
      throw new Error(stem + ': one to three complete authored batches are required');
    }
    const packPath = path.join(sourceDir, stem + '_pack.json');
    if (!fs.existsSync(packPath)) throw new Error(stem + ': pack file not found');
    const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    if (!Array.isArray(pack.items) || pack.items.length < 200) {
      throw new Error(stem + ': expected at least 200 released source items before independent additions');
    }
    if (!normalizedRawText(pack.title) || !validPackVersion(pack.version)) {
      throw new Error(stem + ': a nonempty title and semantic release version are required');
    }
    const base = pack.items.slice(0, 200);
    const authored = [];
    const batchEvidence = [];
    const legacyReviewEvidence = manifest.legacyReviewEvidencePacks.includes(stem);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const expectedBatchNumber = 3 + batchIndex;
      const label = stem + '/' + String(batch && batch.id);
      if (!batch || batch.id !== 'independent-diagnostic-batch-' + expectedBatchNumber
          || !validReviewedDate(batch.reviewedAt)
          || batch.expectedPackId !== pack.id
          || !Array.isArray(batch.files) || !batch.files.length
          || !Array.isArray(batch.reviewReports) || batch.reviewReports.length !== batch.files.length
          || (!legacyReviewEvidence && batch.reviewEvidenceProfile !== HASH_BOUND_REVIEW_PROFILE)) {
        throw new Error(stem + ': invalid authored-batch manifest entry');
      }

      const batchItems = [];
      const evidenceFiles = [];
      let reviewedItemCount = 0;
      for (let fileIndex = 0; fileIndex < batch.files.length; fileIndex++) {
        const fileName = batch.files[fileIndex];
        const reportFileName = batch.reviewReports[fileIndex];
        const filePath = safeAuthoredFile(fileName, label);
        safeAuthoredFile(reportFileName, label);
        const claims = [fileName, reportFileName].map(value => String(value).toLowerCase());
        if (!fileName.endsWith('.json') || !reportFileName.endsWith('.review.json')
            || claims[0] === claims[1] || claims.some(value => claimedAuthoredFiles.has(value))) {
          throw new Error(label + ': authored and review files must be unique JSON artifacts');
        }
        claims.forEach(value => claimedAuthoredFiles.add(value));
        if (!fs.existsSync(filePath)) throw new Error(label + ': missing ' + fileName);
        const fileBytes = fs.readFileSync(filePath);
        const parsed = JSON.parse(fileBytes);
        if (!Array.isArray(parsed) || !parsed.length) {
          throw new Error(fileName + ': expected a nonempty JSON array');
        }
        const report = validateReviewEvidence(
          stem,
          pack,
          batch,
          expectedBatchNumber,
          fileName,
          reportFileName,
          fileBytes,
          parsed,
          !legacyReviewEvidence,
        );
        reviewedItemCount += report.itemCount;
        batchItems.push(...parsed);
        evidenceFiles.push({
          file: fileName,
          reviewReport: reportFileName,
          itemCount: parsed.length,
          sha256: sha256(fileBytes),
        });
      }
      if (batchItems.length !== 100 || reviewedItemCount !== 100) {
        throw new Error(label + ': authored files and cross-review reports must each cover exactly 100 items');
      }
      validateAuthoredBatch(stem, pack, batch, batchItems, [...base, ...authored], !legacyReviewEvidence);
      authored.push(...batchItems.map(item => reviewItem(item, batch, expectedBatchNumber)));
      batchEvidence.push({
        id: batch.id,
        reviewedAt: batch.reviewedAt,
        reviewEvidenceProfile: batch.reviewEvidenceProfile || 'legacy-parapro-cross-review-v1',
        files: evidenceFiles,
      });
    }

    if (authored.length % 100 !== 0 || authored.length > 300) {
      throw new Error(stem + ': independent additions must be complete 100-item batches up to 300 items');
    }
    const staged = stagePack(stem, pack, batches, authored, batchEvidence);
    const expectedLength = 200 + authored.length;
    if (staged.items.length !== expectedLength
        || staged.sections.length !== expectedLength / 100
        || new Set(staged.items.map(item => item.id)).size !== expectedLength
        || new Set(staged.items.map(item => canonical(item.prompt))).size !== expectedLength
        || Array.from({ length: expectedLength / 100 }, (_, bankIndex) =>
          [0, 1, 2, 3].every(answerIndex =>
            staged.items.slice(bankIndex * 100, bankIndex * 100 + 100)
              .filter(item => item.answerIndex === answerIndex).length === 25
          )
        ).some(valid => !valid)) {
      throw new Error(stem + ': staged independent-additions inventory is invalid');
    }
    plans.push({ stem, pack: staged });
  }

  if (process.argv.includes('--check')) {
    console.log(`Validated independent additions for ${plans.length} pack${plans.length === 1 ? '' : 's'} without writing release files.`);
    return;
  }

  // Write only after every manifest entry, artifact, and cross-review has passed.
  for (const plan of plans) {
    const packJson = JSON.stringify(plan.pack, null, 2) + '\n';
    const itemsJson = JSON.stringify(plan.pack.items, null, 2) + '\n';
    for (const dir of [sourceDir, deployDir]) {
      writeGeneratedFile(path.join(dir, plan.stem + '_pack.json'), packJson);
      writeGeneratedFile(path.join(dir, plan.stem + '_items.json'), itemsJson);
    }
  }
  for (const plan of plans) {
    for (const name of [plan.stem + '_pack.json', plan.stem + '_items.json']) {
      const sourceFile = path.join(sourceDir, name);
      const deployFile = path.join(deployDir, name);
      if (!fs.readFileSync(sourceFile).equals(fs.readFileSync(deployFile))) {
        throw new Error(plan.stem + ': source/deploy parity failed for ' + name);
      }
    }
  }
  console.log(`Validated and staged independent additions for ${plans.length} pack${plans.length === 1 ? '' : 's'} before final 500-activity expansion.`);
}

if (require.main === module) main();
module.exports = { canonical, contentKernel, normalizeMathOperators, validPackVersion };