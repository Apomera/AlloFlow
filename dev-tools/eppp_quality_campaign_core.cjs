'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CAMPAIGN_MODES = Object.freeze({
  FEEDBACK_ONLY: 'feedback-only',
  DEEP_REWRITE: 'deep-rewrite',
});

const FEEDBACK_ONLY_ALLOWED_FIELDS = Object.freeze([
  'choiceRationales',
  'optionFeedbackRefinementWave',
  'optionFeedbackRefinedAt',
  'optionFeedbackReviewWave',
  'optionFeedbackReviewedAt',
  'qaReviewedAt',
  'qualityCampaignReview',
  'qualityReviewHistory',
]);

const DEEP_REWRITE_ALLOWED_FIELDS = Object.freeze([
  ...FEEDBACK_ONLY_ALLOWED_FIELDS,
  'prompt',
  'choices',
  'rationale',
  'references',
  'sourceDetails',
  'learningObjectiveId',
  'cognitiveProcess',
  'distractorDesign',
  'wordingReviewStatus',
  'wordingReviewWave',
  'sourceReviewBasis',
  'sourceAnchorItemId',
  'sourceMatchScore',
  'clueReviewStatus',
  'biasAccessibilityStatus',
  'domainAlignmentStatus',
]);

const ALLOWED_FIELDS_BY_MODE = Object.freeze({
  [CAMPAIGN_MODES.FEEDBACK_ONLY]: new Set(FEEDBACK_ONLY_ALLOWED_FIELDS),
  [CAMPAIGN_MODES.DEEP_REWRITE]: new Set(DEEP_REWRITE_ALLOWED_FIELDS),
});

const forbiddenAggregateChoicePattern = /\b(?:all|none) of the above\b/i;

class CampaignValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'CampaignValidationError';
    this.details = details;
  }
}

function fail(message, details) {
  throw new CampaignValidationError(message, details);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalize(value, location = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(`Cannot hash a non-finite number at ${location}.`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => canonicalize(entry, `${location}[${index}]`));
  }
  if (typeof value === 'object') {
    const output = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) fail(`Cannot hash undefined at ${location}.${key}.`);
      output[key] = canonicalize(value[key], `${location}.${key}`);
    }
    return output;
  }
  fail(`Cannot hash ${typeof value} at ${location}.`);
}

function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function hashValue(value) {
  return sha256Text(stableStringify(value));
}

function hashItem(item) {
  return hashValue(item);
}

function normalizedText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function changedTopLevelFields(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return [...keys]
    .filter((key) => {
      const beforeHas = Object.prototype.hasOwnProperty.call(before || {}, key);
      const afterHas = Object.prototype.hasOwnProperty.call(after || {}, key);
      if (beforeHas !== afterHas) return true;
      return stableStringify(before[key]) !== stableStringify(after[key]);
    })
    .sort();
}

function allowedFieldsForMode(mode) {
  const fields = ALLOWED_FIELDS_BY_MODE[mode];
  if (!fields) fail(`Unsupported campaign mode: ${mode}.`, { mode });
  return fields;
}

function patchFieldNames(revision) {
  const setFields = Object.keys(revision.set || {});
  const unsetFields = Array.isArray(revision.unset) ? revision.unset : [];
  return [...new Set([...setFields, ...unsetFields])].sort();
}

function assertPatchFieldsAllowed(revision) {
  if (!revision || typeof revision !== 'object') fail('Campaign revision must be an object.');
  if (!revision.id || typeof revision.id !== 'string') fail('Campaign revision needs a non-empty item id.');
  const allowed = allowedFieldsForMode(revision.mode);
  if (revision.set != null && (
    typeof revision.set !== 'object'
    || Array.isArray(revision.set)
    || Object.values(revision.set).some((value) => value === undefined)
  )) {
    fail(`${revision.id} set must be an object containing JSON values.`);
  }
  if (revision.unset != null && (
    !Array.isArray(revision.unset)
    || revision.unset.some((field) => typeof field !== 'string' || !field)
    || new Set(revision.unset).size !== revision.unset.length
  )) {
    fail(`${revision.id} unset must be an array of distinct field names.`);
  }
  const setFields = new Set(Object.keys(revision.set || {}));
  const conflicting = (revision.unset || []).filter((field) => setFields.has(field));
  if (conflicting.length) {
    fail(`${revision.id} cannot both set and unset: ${conflicting.join(', ')}.`, { id: revision.id, conflicting });
  }
  const forbidden = patchFieldNames(revision).filter((field) => !allowed.has(field));
  if (forbidden.length) {
    fail(`${revision.id} ${revision.mode} revision changes forbidden field(s): ${forbidden.join(', ')}.`, {
      id: revision.id,
      mode: revision.mode,
      forbidden,
    });
  }
  if (!patchFieldNames(revision).length) fail(`${revision.id} revision contains no changes.`);
  return patchFieldNames(revision);
}

function applyTopLevelPatch(item, revision) {
  assertPatchFieldsAllowed(revision);
  const updated = cloneJson(item);
  for (const [field, value] of Object.entries(revision.set || {})) updated[field] = cloneJson(value);
  for (const field of revision.unset || []) delete updated[field];
  return updated;
}

function assertAllowedFieldDiff(before, after, mode) {
  const allowed = allowedFieldsForMode(mode);
  const changedFields = changedTopLevelFields(before, after);
  const forbidden = changedFields.filter((field) => !allowed.has(field));
  if (forbidden.length) {
    fail(`${before?.id || after?.id || '(unknown item)'} ${mode} result changes forbidden field(s): ${forbidden.join(', ')}.`, {
      id: before?.id || after?.id,
      mode,
      changedFields,
      forbidden,
    });
  }
  if (!changedFields.length) fail(`${before?.id || after?.id || '(unknown item)'} revision produces no state change.`);
  return changedFields;
}

function parseHttpsUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${label} must be a valid HTTPS URL.`, { value });
  }
  if (parsed.protocol !== 'https:') fail(`${label} must use HTTPS.`, { value });
  return parsed;
}

function validateItem(item, options = {}) {
  const {
    minRationaleLength = 100,
    minFeedbackLength = 20,
    requireCorrectFeedbackMatch = false,
    requireCompleteSourceDetails = false,
    sourceDetailMinimums = {},
    authoritativeHosts = null,
  } = options;
  const detailMinimums = {
    title: 12,
    organization: 4,
    summary: 40,
    credibility: 40,
    ...sourceDetailMinimums,
  };

  if (!item || typeof item !== 'object' || Array.isArray(item)) fail('Bank item must be an object.');
  if (!item.id || typeof item.id !== 'string') fail('Bank item needs a non-empty string id.');
  if (!item.prompt || typeof item.prompt !== 'string') fail(`${item.id} needs a non-empty prompt.`);
  if (!Array.isArray(item.choices) || item.choices.length !== 4) fail(`${item.id} must have exactly four choices.`);
  if (item.choices.some((choice) => typeof choice !== 'string' || !normalizedText(choice))) {
    fail(`${item.id} contains an empty or invalid choice.`);
  }
  if (new Set(item.choices.map(normalizedText)).size !== 4) fail(`${item.id} choices must be distinct.`);
  if (item.choices.some((choice) => forbiddenAggregateChoicePattern.test(choice))) {
    fail(`${item.id} contains a prohibited all/none-of-the-above choice.`);
  }
  if (!Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) {
    fail(`${item.id} needs an answer index from 0 through 3.`);
  }
  if (typeof item.rationale !== 'string' || item.rationale.trim().length < minRationaleLength) {
    fail(`${item.id} rationale must contain at least ${minRationaleLength} characters.`);
  }
  if (!Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4) {
    fail(`${item.id} must have exactly four choice rationales.`);
  }
  if (item.choiceRationales.some((feedback) => typeof feedback !== 'string' || feedback.trim().length < minFeedbackLength)) {
    fail(`${item.id} choice rationales must contain at least ${minFeedbackLength} characters each.`);
  }
  if (requireCorrectFeedbackMatch && item.choiceRationales[item.answerIndex] !== item.rationale) {
    fail(`${item.id} correct-option feedback must equal its rationale.`);
  }

  if (!Array.isArray(item.references) || !item.references.length) fail(`${item.id} needs at least one source reference.`);
  if (new Set(item.references).size !== item.references.length) fail(`${item.id} contains duplicate source references.`);
  const referenceSet = new Set();
  for (const reference of item.references) {
    const parsed = parseHttpsUrl(reference, `${item.id} reference`);
    if (authoritativeHosts && !authoritativeHosts.has(parsed.hostname.toLowerCase())) {
      fail(`${item.id} references an unapproved source host: ${parsed.hostname}.`);
    }
    referenceSet.add(reference);
  }

  if (item.sourceDetails != null && !Array.isArray(item.sourceDetails)) {
    fail(`${item.id} sourceDetails must be an array when present.`);
  }
  const sourceDetails = item.sourceDetails || [];
  for (const [index, source] of sourceDetails.entries()) {
    if (!source || typeof source !== 'object' || !source.url) fail(`${item.id} source detail ${index} needs a URL.`);
    parseHttpsUrl(source.url, `${item.id} source detail ${index}`);
    if (!referenceSet.has(source.url)) fail(`${item.id} source detail ${index} is not represented in references.`);
    if (!String(source.title || '').trim()) fail(`${item.id} source detail ${index} needs a title.`);
    if (!String(source.credibility || '').trim()) fail(`${item.id} source detail ${index} needs a credibility note.`);
  }
  if (requireCompleteSourceDetails) {
    if (sourceDetails.length !== item.references.length) {
      fail(`${item.id} needs one complete source detail for every reference.`);
    }
    for (const [index, source] of sourceDetails.entries()) {
      for (const [field, minimum] of Object.entries(detailMinimums)) {
        if (String(source[field] || '').trim().length < minimum) {
          fail(`${item.id} source detail ${index} ${field} must contain at least ${minimum} characters.`);
        }
      }
    }
  }
  return item;
}

function answerPositionCounts(bank) {
  const counts = [0, 0, 0, 0];
  for (const item of bank) {
    if (Number.isInteger(item.answerIndex) && item.answerIndex >= 0 && item.answerIndex <= 3) {
      counts[item.answerIndex] += 1;
    }
  }
  return counts;
}

function validateBank(bank, options = {}) {
  if (!Array.isArray(bank)) fail('EPPP bank must be an array.');
  if (options.expectedItemCount != null && bank.length !== options.expectedItemCount) {
    fail(`Expected ${options.expectedItemCount} bank items; found ${bank.length}.`);
  }
  const ids = bank.map((item) => item?.id);
  const duplicateIds = [...new Set(ids.filter((id, index) => id && ids.indexOf(id) !== index))].sort();
  if (duplicateIds.length) fail(`Bank contains duplicate item id(s): ${duplicateIds.join(', ')}.`, { duplicateIds });

  const prompts = new Map();
  for (const item of bank) {
    validateItem(item, options);
    const normalizedPrompt = normalizedText(item.prompt);
    if (prompts.has(normalizedPrompt)) {
      fail(`Bank contains duplicate normalized prompts: ${prompts.get(normalizedPrompt)} and ${item.id}.`);
    }
    prompts.set(normalizedPrompt, item.id);
  }

  const counts = answerPositionCounts(bank);
  if (options.expectedAnswerPositions) {
    const expected = Array.isArray(options.expectedAnswerPositions)
      ? options.expectedAnswerPositions
      : [0, 1, 2, 3].map((index) => (
        options.expectedAnswerPositions[index]
        ?? options.expectedAnswerPositions[['A', 'B', 'C', 'D'][index]]
        ?? 0
      ));
    if (stableStringify(counts) !== stableStringify(expected)) {
      fail(`Answer-position counts drifted: expected ${expected.join('/')}; found ${counts.join('/')}.`, {
        expected,
        actual: counts,
      });
    }
  }
  return { totalItems: bank.length, answerPositions: counts };
}

function assertBankIdentityAndKeysPreserved(beforeBank, afterBank) {
  if (!Array.isArray(beforeBank) || !Array.isArray(afterBank) || beforeBank.length !== afterBank.length) {
    fail('Campaign must preserve the bank item count.');
  }
  for (let index = 0; index < beforeBank.length; index += 1) {
    const before = beforeBank[index];
    const after = afterBank[index];
    if (before.id !== after.id) fail(`Campaign changed bank order or identity at position ${index}.`);
    if (before.answerIndex !== after.answerIndex) {
      fail(`${before.id} answer position changed from ${before.answerIndex} to ${after.answerIndex}.`);
    }
  }
  return true;
}

function assertUniqueRevisionIds(revisions) {
  if (!Array.isArray(revisions)) fail('Campaign revisions must be an array.');
  const ids = revisions.map((revision) => revision?.id);
  const duplicates = [...new Set(ids.filter((id, index) => id && ids.indexOf(id) !== index))].sort();
  if (duplicates.length) fail(`Campaign contains duplicate revision id(s): ${duplicates.join(', ')}.`, { duplicates });
  return true;
}

function buildRevision(beforeItem, specification) {
  const revision = {
    id: specification?.id || beforeItem?.id,
    mode: specification?.mode,
    expectedAnswerIndex: specification?.expectedAnswerIndex ?? beforeItem?.answerIndex,
    set: cloneJson(specification?.set || {}),
    unset: [...(specification?.unset || [])],
  };
  assertPatchFieldsAllowed(revision);
  if (revision.id !== beforeItem?.id) fail(`Revision id ${revision.id} does not match before item ${beforeItem?.id}.`);
  if (beforeItem.answerIndex !== revision.expectedAnswerIndex) {
    fail(`${revision.id} expected answer index does not match the before item.`);
  }
  const afterItem = applyTopLevelPatch(beforeItem, revision);
  const changedFields = assertAllowedFieldDiff(beforeItem, afterItem, revision.mode);
  if (afterItem.answerIndex !== revision.expectedAnswerIndex) fail(`${revision.id} patch changed its answer position.`);
  validateItem(afterItem, {
    requireCorrectFeedbackMatch: true,
    requireCompleteSourceDetails: revision.mode === CAMPAIGN_MODES.DEEP_REWRITE,
  });
  return {
    ...revision,
    beforeHash: hashItem(beforeItem),
    afterHash: hashItem(afterItem),
    changedFields,
  };
}

function classifyRevisionState(item, revision) {
  assertPatchFieldsAllowed(revision);
  if (!/^[a-f0-9]{64}$/i.test(String(revision.beforeHash || ''))) {
    fail(`${revision.id} needs a valid beforeHash.`);
  }
  if (!/^[a-f0-9]{64}$/i.test(String(revision.afterHash || ''))) {
    fail(`${revision.id} needs a valid afterHash.`);
  }
  if (revision.beforeHash === revision.afterHash) fail(`${revision.id} beforeHash and afterHash must differ.`);
  const currentHash = hashItem(item);
  if (currentHash === revision.afterHash) return { state: 'after', currentHash };
  if (currentHash === revision.beforeHash) return { state: 'before', currentHash };
  fail(`${revision.id} preimage drifted; current state matches neither the reviewed before nor after state.`, {
    id: revision.id,
    currentHash,
    beforeHash: revision.beforeHash,
    afterHash: revision.afterHash,
  });
}

function prepareCampaign({ bank, revisions, validateOptions = {} }) {
  validateBank(bank, validateOptions);
  assertUniqueRevisionIds(revisions);
  const originalBank = cloneJson(bank);
  const updatedBank = cloneJson(bank);
  const indexById = new Map(updatedBank.map((item, index) => [item.id, index]));
  const changes = [];

  for (const revision of revisions) {
    assertPatchFieldsAllowed(revision);
    const index = indexById.get(revision.id);
    if (index == null) fail(`Campaign item does not exist in the bank: ${revision.id}.`);
    const current = updatedBank[index];
    if (!Number.isInteger(revision.expectedAnswerIndex) || current.answerIndex !== revision.expectedAnswerIndex) {
      fail(`${revision.id} answer position drifted from the reviewed index ${revision.expectedAnswerIndex}.`);
    }
    const classification = classifyRevisionState(current, revision);
    if (classification.state === 'after') {
      validateItem(current, {
        requireCorrectFeedbackMatch: true,
        requireCompleteSourceDetails: revision.mode === CAMPAIGN_MODES.DEEP_REWRITE,
      });
      changes.push({ id: revision.id, mode: revision.mode, state: 'already-applied', changedFields: [...(revision.changedFields || patchFieldNames(revision))] });
      continue;
    }

    const after = applyTopLevelPatch(current, revision);
    const changedFields = assertAllowedFieldDiff(current, after, revision.mode);
    if (after.answerIndex !== revision.expectedAnswerIndex) fail(`${revision.id} patch changed its answer position.`);
    const actualAfterHash = hashItem(after);
    if (actualAfterHash !== revision.afterHash) {
      fail(`${revision.id} reviewed after-state hash does not match the applied patch.`, {
        id: revision.id,
        expectedAfterHash: revision.afterHash,
        actualAfterHash,
      });
    }
    validateItem(after, {
      requireCorrectFeedbackMatch: true,
      requireCompleteSourceDetails: revision.mode === CAMPAIGN_MODES.DEEP_REWRITE,
    });
    updatedBank[index] = after;
    changes.push({ id: revision.id, mode: revision.mode, state: 'applied', changedFields });
  }

  assertBankIdentityAndKeysPreserved(originalBank, updatedBank);
  validateBank(updatedBank, validateOptions);
  return {
    bank: updatedBank,
    changes,
    appliedIds: changes.filter((entry) => entry.state === 'applied').map((entry) => entry.id),
    alreadyAppliedIds: changes.filter((entry) => entry.state === 'already-applied').map((entry) => entry.id),
  };
}

function assertMetricValue(metrics, metric) {
  const value = metrics?.[metric];
  if (!Number.isInteger(value) || value < 0) fail(`Metric ${metric} must be a non-negative integer.`, { metric, value });
  return value;
}

function assertMetricMonotonicity(before, after, metricNames = Object.keys(before || {})) {
  const result = {};
  for (const metric of metricNames) {
    const beforeValue = assertMetricValue(before, metric);
    const afterValue = assertMetricValue(after, metric);
    if (afterValue > beforeValue) {
      fail(`Metric regression: ${metric} increased from ${beforeValue} to ${afterValue}.`, {
        metric,
        before: beforeValue,
        after: afterValue,
      });
    }
    result[metric] = { before: beforeValue, after: afterValue, reduction: beforeValue - afterValue };
  }
  return result;
}

function assertMetricCeilings(current, ceilings) {
  const result = {};
  for (const metric of Object.keys(ceilings || {})) {
    const value = assertMetricValue(current, metric);
    const ceiling = assertMetricValue(ceilings, metric);
    if (value > ceiling) {
      fail(`Metric ceiling missed: ${metric} is ${value}; required at most ${ceiling}.`, {
        metric,
        value,
        ceiling,
      });
    }
    result[metric] = { value, ceiling, margin: ceiling - value };
  }
  return result;
}

function halvedMetricCeilings(baseline) {
  return Object.fromEntries(Object.keys(baseline || {}).map((metric) => [
    metric,
    Math.floor(assertMetricValue(baseline, metric) / 2),
  ]));
}

function readTextIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function hashFileIfExists(filePath) {
  const text = readTextIfExists(filePath);
  return text == null ? null : sha256Text(text);
}

function writeFileWithRetry(filePath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, contents, 'utf8');
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  throw lastError;
}

function removeFileWithRetry(filePath) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      fs.unlinkSync(filePath);
      return;
    } catch (error) {
      if (error.code === 'ENOENT') return;
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  throw lastError;
}

function readJournal(journalPath) {
  const text = readTextIfExists(journalPath);
  if (text == null) return null;
  let journal;
  try {
    journal = JSON.parse(text);
  } catch {
    fail(`Campaign recovery journal is not valid JSON: ${journalPath}.`);
  }
  if (journal.schemaVersion !== 1 || journal.operation !== 'paired-write') {
    fail(`Campaign recovery journal has an unsupported schema: ${journalPath}.`);
  }
  return journal;
}

function writePairedFiles({
  sourcePath,
  deployPath,
  contents,
  journalPath = sourcePath + '.campaign-transaction.json',
  hooks = {},
}) {
  const resolvedSource = path.resolve(sourcePath);
  const resolvedDeploy = path.resolve(deployPath);
  const resolvedJournal = path.resolve(journalPath);
  if (new Set([resolvedSource, resolvedDeploy, resolvedJournal]).size !== 3) {
    fail('Source, deploy, and recovery-journal paths must be distinct.');
  }
  if (typeof contents !== 'string') fail('Paired-write contents must be a string.');
  const targetHash = sha256Text(contents);
  let journal = readJournal(resolvedJournal);
  let recovering = Boolean(journal);

  if (journal) {
    if (
      journal.sourcePath !== resolvedSource
      || journal.deployPath !== resolvedDeploy
      || journal.targetHash !== targetHash
    ) {
      fail('Existing recovery journal belongs to a different paired write.', {
        journalPath: resolvedJournal,
        journal,
        requested: { sourcePath: resolvedSource, deployPath: resolvedDeploy, targetHash },
      });
    }
  } else {
    const sourceText = readTextIfExists(resolvedSource);
    const deployText = readTextIfExists(resolvedDeploy);
    if (sourceText === contents && deployText === contents) {
      return { status: 'already-current', targetHash, recovered: false };
    }
    if ((sourceText == null) !== (deployText == null) || sourceText !== deployText) {
      fail('Source and deploy files drifted without a matching recovery journal.', {
        sourcePath: resolvedSource,
        deployPath: resolvedDeploy,
      });
    }
    const beforeHash = sourceText == null ? null : sha256Text(sourceText);
    journal = {
      schemaVersion: 1,
      operation: 'paired-write',
      sourcePath: resolvedSource,
      deployPath: resolvedDeploy,
      targetHash,
      sourceBeforeHash: beforeHash,
      deployBeforeHash: beforeHash,
    };
    writeFileWithRetry(resolvedJournal, JSON.stringify(journal, null, 2) + '\n');
  }

  const sourceHash = hashFileIfExists(resolvedSource);
  const deployHash = hashFileIfExists(resolvedDeploy);
  const permittedSourceHashes = new Set([journal.sourceBeforeHash, targetHash]);
  const permittedDeployHashes = new Set([journal.deployBeforeHash, targetHash]);
  if (!permittedSourceHashes.has(sourceHash) || !permittedDeployHashes.has(deployHash)) {
    fail('Paired-write recovery found an ambiguous file state; refusing to overwrite it.', {
      sourceHash,
      deployHash,
      journal,
    });
  }
  if (sourceHash === targetHash && deployHash === targetHash) {
    removeFileWithRetry(resolvedJournal);
    return { status: 'recovered', targetHash, recovered: true };
  }

  if (sourceHash !== targetHash) writeFileWithRetry(resolvedSource, contents);
  if (typeof hooks.afterSourceWrite === 'function') hooks.afterSourceWrite({ journal: cloneJson(journal) });
  if (deployHash !== targetHash) writeFileWithRetry(resolvedDeploy, contents);

  const finalSourceHash = hashFileIfExists(resolvedSource);
  const finalDeployHash = hashFileIfExists(resolvedDeploy);
  if (finalSourceHash !== targetHash || finalDeployHash !== targetHash) {
    fail('Paired write did not reach the reviewed target hash.', {
      targetHash,
      finalSourceHash,
      finalDeployHash,
    });
  }
  removeFileWithRetry(resolvedJournal);
  return {
    status: recovering ? 'recovered' : 'written',
    targetHash,
    recovered: recovering,
  };
}

module.exports = {
  ALLOWED_FIELDS_BY_MODE,
  CAMPAIGN_MODES,
  CampaignValidationError,
  DEEP_REWRITE_ALLOWED_FIELDS,
  FEEDBACK_ONLY_ALLOWED_FIELDS,
  answerPositionCounts,
  applyTopLevelPatch,
  assertAllowedFieldDiff,
  assertBankIdentityAndKeysPreserved,
  assertMetricCeilings,
  assertMetricMonotonicity,
  assertPatchFieldsAllowed,
  assertUniqueRevisionIds,
  buildRevision,
  changedTopLevelFields,
  classifyRevisionState,
  cloneJson,
  halvedMetricCeilings,
  hashItem,
  hashValue,
  prepareCampaign,
  sha256Text,
  stableStringify,
  validateBank,
  validateItem,
  writePairedFiles,
};
