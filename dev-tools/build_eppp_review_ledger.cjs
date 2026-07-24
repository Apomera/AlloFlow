#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtimeRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const audit = JSON.parse(fs.readFileSync(path.join(runtimeRoot, 'content_audit.json'), 'utf8'));
const nativeQa = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'eppp_native_qa.json'), 'utf8'));

const migratedByLegacyId = new Map(
  nativeQa.items.filter((item) => item.legacySourceId).map((item) => [item.legacySourceId, item]),
);

const items = audit.reviewQueue.map((item) => {
  const migrated = migratedByLegacyId.get(item.id);
  return {
    legacyId: item.id,
    sourceFile: item.sourceFile,
    domainId: item.domainId,
    domainName: item.domainName,
    prompt: item.prompt,
    automatedPriority: item.reviewPriority,
    automatedFlags: item.flags.map((flag) => flag.code),
    referenceCount: item.references.length,
    workflowStage: migrated ? 'native-content-qa-passed' : 'legacy-quarantine',
    nativeItemId: migrated ? migrated.id : null,
    contentQaStatus: migrated ? 'pass' : 'not-started',
    independentExpertStatus: 'not-started',
    productionStatus: 'not-production-validated',
  };
});

const migratedCount = items.filter((item) => item.workflowStage === 'native-content-qa-passed').length;
const nativeOriginalCount = nativeQa.items.filter((item) => !item.legacySourceId && !item.authoredSourceId).length;
const sourceAuthoredCount = nativeQa.items.filter((item) => item.authoredSourceId).length;
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  goal: 'Deeply review the complete 2,933-question legacy universe; correct, diversify, or retire failures; and publish only items that pass the required gates.',
  requiredGates: [
    'stable provenance and domain tagging',
    'current authoritative answer support',
    'one clearly best answer and ambiguity review',
    'plausible distinct distractors',
    'answer-position, wording-clue, and duplicate controls',
    'cultural, accessibility, and plain-language review',
    'explanatory rationale with source traceability',
    'independent qualified psychology/assessment review before production validation',
  ],
  statusDefinitions: {
    'legacy-quarantine': 'Preserved and accessible in the clearly labeled legacy workspace, but not part of the native QA-passed bank.',
    'native-content-qa-passed': 'Re-authored and passed AlloFlow content QA; independent expert validation remains separate.',
    'production-expert-validated': 'Passed content QA and an independent qualified psychology/assessment review.',
  },
  summary: {
    legacyReviewUniverse: items.length,
    legacyItemsMigratedToNativeQa: migratedCount,
    legacyItemsStillQuarantined: items.length - migratedCount,
    nativeOriginalQaItems: nativeOriginalCount,
    sourceAuthoredQaItems: sourceAuthoredCount,
    totalNativeQaItems: nativeQa.summary.passedItems,
    independentExpertValidatedItems: 0,
    productionValidatedItems: 0,
  },
  items,
};

const s = report.summary;
const markdown = `# EPPP full-bank review ledger

Generated: ${report.generatedAt}

## Goal

${report.goal}

## Current status

| Status | Count |
| --- | ---: |
| Legacy questions in review universe | ${s.legacyReviewUniverse} |
| Legacy items migrated and native-QA passed | ${s.legacyItemsMigratedToNativeQa} |
| Legacy items still quarantined | ${s.legacyItemsStillQuarantined} |
| Native-original QA-passed items | ${s.nativeOriginalQaItems} |
| Source-authored QA-passed replacements | ${s.sourceAuthoredQaItems} |
| Total native QA-passed items | ${s.totalNativeQaItems} |
| Independently expert-validated items | ${s.independentExpertValidatedItems} |
| Production-validated items | ${s.productionValidatedItems} |

## Required gates

${report.requiredGates.map((gate, index) => `${index + 1}. ${gate}`).join('\n')}

## Important distinction

- **Legacy quarantine** preserves access but does not claim native quality approval.
- **Native content QA passed** confirms the AlloFlow content checks and cited answer support.
- **Production expert validated** remains a higher bar requiring an independent qualified psychology/assessment reviewer.
`;

for (const outputRoot of [runtimeRoot, deployRoot]) {
  fs.writeFileSync(path.join(outputRoot, 'review_ledger.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'review_ledger.md'), markdown, 'utf8');
}

console.log('EPPP review ledger: ' + migratedCount + '/' + items.length + ' legacy items migrated to native QA; ' + (items.length - migratedCount) + ' remain quarantined.');
