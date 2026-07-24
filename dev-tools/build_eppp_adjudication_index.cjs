#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const batchNumbers = fs.readdirSync(sourceRoot)
  .map((file) => file.match(/^adjudication_batch_(\d{2})\.json$/)?.[1])
  .filter(Boolean)
  .sort();
if (!batchNumbers.length) throw new Error('No adjudication batch reports were found.');
const reports = batchNumbers.map((number) => readJson(path.join(sourceRoot, `adjudication_batch_${number}.json`)));
const allItems = reports.flatMap((report, reportIndex) => report.items.map((item) => ({ ...item, batchId: `batch-${batchNumbers[reportIndex]}` })));
const ids = allItems.map((item) => item.legacyId);

if (reports.some((report) => report.status !== 'editorial-adjudication-complete-still-quarantined')) throw new Error('Every included batch must remain quarantined.');
if (reports.some((report) => report.items.length !== 10 || report.summary.adjudicatedCandidates !== report.items.length)) throw new Error('Every batch must contain and summarize exactly ten candidates.');
if (new Set(ids).size !== ids.length) throw new Error(`Expected unique adjudicated candidates; received ${ids.length} items and ${new Set(ids).size} unique IDs.`);
if (allItems.some((item) => item.workflowStage !== 'editorial-adjudicated-quarantine' || item.learnerVisibleInNativeBank !== false || item.independentExpertStatus !== 'not-started' || item.productionStatus !== 'not-production-validated')) throw new Error('An indexed candidate does not satisfy the quarantine gates.');
const sourceReviewDates = reports.map((report) => report.currentSourceReviewDate).filter(Boolean).sort();
if (!sourceReviewDates.length) throw new Error('No batch provides a current source-review date.');

const domains = [...new Set(allItems.map((item) => item.domainId))];
const domainDistribution = Object.fromEntries(domains.map((domain) => [domain, allItems.filter((item) => item.domainId === domain).length]));
const summary = {
  batchCount: reports.length,
  adjudicatedCandidates: allItems.length,
  minorRevision: allItems.filter((item) => item.decision === 'minor-revision').length,
  majorRewrite: allItems.filter((item) => item.decision === 'major-rewrite').length,
  promotedToNativeBank: 0,
  independentExpertValidated: 0,
  learnerVisibleCandidates: 0,
  domainDistribution,
};
const batches = reports.map((report, index) => ({
  batchId: `batch-${batchNumbers[index]}`,
  file: `adjudication_batch_${batchNumbers[index]}.json`,
  status: report.status,
  currentSourceReviewDate: report.currentSourceReviewDate,
  adjudicatedCandidates: report.summary.adjudicatedCandidates,
  minorRevision: report.summary.minorRevision,
  majorRewrite: report.summary.majorRewrite,
  legacyIds: report.items.map((item) => item.legacyId),
}));
const items = allItems.map((item) => ({
  batchId: item.batchId,
  legacyId: item.legacyId,
  domainId: item.domainId,
  decision: item.decision,
  sourceVerification: item.sourceVerification,
  workflowStage: item.workflowStage,
  learnerVisibleInNativeBank: item.learnerVisibleInNativeBank,
  independentExpertStatus: item.independentExpertStatus,
  productionStatus: item.productionStatus,
  sourceCount: item.revisedItem.sourceDetails.length,
}));
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  currentSourceReviewDate: sourceReviewDates.at(-1),
  status: 'editorial-adjudication-index-all-candidates-quarantined',
  purpose: 'Provide a single machine-readable inventory of all claim-level EPPP legacy adjudications while preserving the release, expert-review, and production-validation gates.',
  summary,
  batches,
  items,
};

const batchRows = batches.map((batch) => `| ${batch.batchId} | ${batch.adjudicatedCandidates} | ${batch.minorRevision} | ${batch.majorRewrite} | ${batch.currentSourceReviewDate} |`).join('\n');
const itemRows = items.map((item) => `| ${item.batchId} | ${item.legacyId} | ${item.domainId} | ${item.decision} | ${item.sourceCount} |`).join('\n');
const markdown = `# EPPP legacy adjudication index\n\nGenerated: ${report.generatedAt}\n\n**Status: all ${summary.adjudicatedCandidates} indexed candidates remain quarantined and learner-invisible.**\n\nThis is an inventory, not a release manifest. Independent qualified review and production validation remain pending for every candidate.\n\n## Cumulative outcome\n\n- ${summary.batchCount} adjudication batches.\n- ${summary.adjudicatedCandidates} unique legacy candidates reviewed.\n- ${summary.minorRevision} minor revisions and ${summary.majorRewrite} major rewrites.\n- ${summary.promotedToNativeBank} promoted to the learner-facing bank.\n- ${summary.independentExpertValidated} independently expert validated.\n\n| Batch | Candidates | Minor | Major | Source review date |\n| --- | ---: | ---: | ---: | --- |\n${batchRows}\n\n## Candidate inventory\n\n| Batch | Legacy ID | Domain | Decision | Sources |\n| --- | --- | --- | --- | ---: |\n${itemRows}\n\nThe individual batch JSON files retain each original item, detailed findings, proposed revision, option-by-option feedback, and full provenance.\n`;

for (const outputRoot of [sourceRoot, deployRoot]) {
  fs.writeFileSync(path.join(outputRoot, 'adjudication_index.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'adjudication_index.md'), markdown, 'utf8');
}

console.log(`EPPP adjudication index: ${summary.adjudicatedCandidates} unique candidates across ${summary.batchCount} quarantined batches.`);
