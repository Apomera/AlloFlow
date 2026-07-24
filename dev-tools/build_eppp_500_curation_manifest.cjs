#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtimeRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const audit = JSON.parse(fs.readFileSync(path.join(runtimeRoot, 'content_audit.json'), 'utf8'));
const nativeQa = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'eppp_native_qa.json'), 'utf8'));

const domainPlan = [
  { legacyDomainId: 1, nativeDomainId: 'biological', label: 'Biological bases of behavior', weight: 0.10, target: 50 },
  { legacyDomainId: 2, nativeDomainId: 'cognitive-affective', label: 'Cognitive-affective bases of behavior', weight: 0.13, target: 65 },
  { legacyDomainId: 3, nativeDomainId: 'social-cultural', label: 'Social and cultural bases of behavior', weight: 0.11, target: 55 },
  { legacyDomainId: 4, nativeDomainId: 'lifespan', label: 'Growth and lifespan development', weight: 0.12, target: 60 },
  { legacyDomainId: 5, nativeDomainId: 'assessment', label: 'Assessment and diagnosis', weight: 0.16, target: 80 },
  { legacyDomainId: 6, nativeDomainId: 'intervention', label: 'Treatment, intervention, prevention and supervision', weight: 0.15, target: 75 },
  { legacyDomainId: 7, nativeDomainId: 'research', label: 'Research methods and statistics', weight: 0.07, target: 35 },
  { legacyDomainId: 8, nativeDomainId: 'professional', label: 'Ethical, legal, and professional issues', weight: 0.16, target: 80 },
];

function canonical(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function extractUrls(references) {
  const urls = [];
  for (const reference of references || []) {
    const matches = String(reference).match(/https:\/\/[^\s<>]+/g) || [];
    for (let url of matches) {
      url = url.replace(/[),.;]+$/, '');
      try { new URL(url); urls.push(url); } catch (_) {}
    }
  }
  return [...new Set(urls)];
}

function candidateScore(item, migratedIds) {
  const flags = new Set(item.flags.map((flag) => flag.code));
  const urls = extractUrls(item.references);
  let score = 0;
  if (migratedIds.has(item.id)) score -= 1000;
  if (!item.references.length) score += 100;
  if (!urls.length) score += 20;
  if (flags.has('time_sensitive_claim')) score += 40;
  if (flags.has('duplicate_prompt')) score += 12;
  if (flags.has('correct_answer_length_clue')) score += 8;
  if (flags.has('missing_rationale')) score += 80;
  if (flags.has('encoding_corruption')) score += 80;
  if (flags.has('invalid_answer_key') || flags.has('missing_prompt') || flags.has('insufficient_choices')) score += 500;
  return score;
}

const migratedNativeItems = nativeQa.items.filter((item) => item.legacySourceId);
const migratedByLegacyId = new Map(migratedNativeItems.map((item) => [item.legacySourceId, item]));
const migratedIds = new Set(migratedByLegacyId.keys());
const nativeOriginalItems = nativeQa.items.filter((item) => !item.legacySourceId);
const slots = [];

for (const domain of domainPlan) {
  const original = nativeOriginalItems.filter((item) => item.domainId === domain.nativeDomainId);
  if (original.length !== 1) throw new Error('Expected exactly one native-original item for ' + domain.nativeDomainId + '.');
  slots.push({
    slotType: 'native-original',
    nativeItemId: original[0].id,
    legacyId: null,
    domainId: domain.nativeDomainId,
    status: 'qa-passed',
    sourceReadiness: 'qa-passed',
    requiredWork: [],
  });

  const neededLegacy = domain.target - original.length;
  const candidates = audit.reviewQueue
    .filter((item) => Number(item.domainId) === domain.legacyDomainId)
    .sort((a, b) => candidateScore(a, migratedIds) - candidateScore(b, migratedIds) || a.ordinal - b.ordinal);
  const selected = [];
  const seenPrompts = new Set();
  for (const item of candidates) {
    const promptKey = canonical(item.prompt);
    if (seenPrompts.has(promptKey)) continue;
    selected.push(item);
    seenPrompts.add(promptKey);
    if (selected.length === neededLegacy) break;
  }
  if (selected.length !== neededLegacy) throw new Error('Insufficient unique candidates for domain ' + domain.nativeDomainId + '.');

  for (const item of selected) {
    const migrated = migratedByLegacyId.get(item.id);
    const urls = extractUrls(item.references);
    const flagCodes = item.flags.map((flag) => flag.code);
    const requiredWork = [];
    if (!migrated) requiredWork.push('re-author-and-one-best-answer-review');
    if (!urls.length) requiredWork.push('resolve-authoritative-web-source');
    if (flagCodes.includes('correct_answer_length_clue')) requiredWork.push('repair-answer-length-clue');
    if (flagCodes.includes('duplicate_prompt')) requiredWork.push('diversify-duplicate-concept');
    if (flagCodes.includes('time_sensitive_claim')) requiredWork.push('current-policy-or-guidance-review');
    requiredWork.push('accessibility-and-bias-review');
    slots.push({
      slotType: 'legacy-source',
      nativeItemId: migrated ? migrated.id : null,
      legacyId: item.id,
      sourceFile: item.sourceFile,
      domainId: domain.nativeDomainId,
      prompt: item.prompt,
      answerIndex: item.answerIndex,
      automatedPriority: item.reviewPriority,
      automatedFlags: flagCodes,
      extractedSourceUrls: urls,
      status: migrated ? 'qa-passed' : 'curation-selected',
      sourceReadiness: migrated ? 'qa-passed' : urls.length ? 'web-source-present-needs-verification' : item.references.length ? 'bibliographic-source-needs-resolution' : 'source-missing',
      requiredWork: migrated ? [] : requiredWork,
    });
  }
}

if (slots.length !== 500) throw new Error('Curation manifest must contain exactly 500 slots; found ' + slots.length + '.');
const domainSummary = domainPlan.map((domain) => {
  const selected = slots.filter((slot) => slot.domainId === domain.nativeDomainId);
  return {
    domainId: domain.nativeDomainId,
    label: domain.label,
    blueprintWeight: domain.weight,
    target: domain.target,
    qaPassed: selected.filter((slot) => slot.status === 'qa-passed').length,
    selectedPending: selected.filter((slot) => slot.status !== 'qa-passed').length,
    sourceReadyPending: selected.filter((slot) => slot.status !== 'qa-passed' && slot.extractedSourceUrls && slot.extractedSourceUrls.length).length,
    sourceResolutionPending: selected.filter((slot) => slot.status !== 'qa-passed' && (!slot.extractedSourceUrls || !slot.extractedSourceUrls.length)).length,
  };
});
const summary = {
  targetSlots: slots.length,
  qaPassed: slots.filter((slot) => slot.status === 'qa-passed').length,
  selectedPendingQa: slots.filter((slot) => slot.status !== 'qa-passed').length,
  legacySourceSlots: slots.filter((slot) => slot.slotType === 'legacy-source').length,
  nativeOriginalSlots: slots.filter((slot) => slot.slotType === 'native-original').length,
  webSourcePresentPendingVerification: slots.filter((slot) => slot.status !== 'qa-passed' && slot.extractedSourceUrls && slot.extractedSourceUrls.length).length,
  bibliographicSourceNeedsResolution: slots.filter((slot) => slot.sourceReadiness === 'bibliographic-source-needs-resolution').length,
  sourceMissing: slots.filter((slot) => slot.sourceReadiness === 'source-missing').length,
};
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  target: 'Exactly 500 blueprint-weighted native EPPP questions; every slot must pass the existing native QA gate before completion.',
  summary,
  domainSummary,
  slots,
};

const markdown = `# EPPP 500-question curation manifest

Generated: ${report.generatedAt}

## Target

${report.target}

| Metric | Count |
| --- | ---: |
| Total target slots | ${summary.targetSlots} |
| QA passed | ${summary.qaPassed} |
| Selected and pending QA | ${summary.selectedPendingQa} |
| Legacy-source slots | ${summary.legacySourceSlots} |
| Native-original slots | ${summary.nativeOriginalSlots} |
| Pending with a web source to verify | ${summary.webSourcePresentPendingVerification} |
| Bibliographic source needing web resolution | ${summary.bibliographicSourceNeedsResolution} |
| Source missing | ${summary.sourceMissing} |

## Blueprint allocation

| Domain | Weight | Target | QA passed | Pending | Web-source pending | Source-resolution pending |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${domainSummary.map((domain) => `| ${domain.label} | ${Math.round(domain.blueprintWeight * 100)}% | ${domain.target} | ${domain.qaPassed} | ${domain.selectedPending} | ${domain.sourceReadyPending} | ${domain.sourceResolutionPending} |`).join('\n')}

> Selection is not approval. Every pending slot remains outside the native question bank until re-authored, source-verified, clue-checked, accessibility/bias reviewed, and passed by the build-blocking native QA gate.
`;

for (const outputRoot of [runtimeRoot, deployRoot]) {
  fs.writeFileSync(path.join(outputRoot, 'curation_500.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'curation_500.md'), markdown, 'utf8');
}

console.log('EPPP 500 curation manifest: ' + summary.qaPassed + '/500 QA passed; ' + summary.selectedPendingQa + ' selected and pending.');
console.log('Pending source readiness — web URL: ' + summary.webSourcePresentPendingVerification + ', bibliographic resolution: ' + summary.bibliographicSourceNeedsResolution + ', missing: ' + summary.sourceMissing + '.');
