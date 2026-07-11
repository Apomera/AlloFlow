#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'test_prep_hub_module.js');
const legacyAuditPath = path.join(root, 'test_prep', 'eppp_legacy', 'content_audit.json');
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'prismflow-deploy', 'public', 'test_prep')];
const expectedChecks = ['authoritative-source', 'one-best-answer', 'distractor-quality', 'clue-resistance', 'rationale-quality', 'provenance'];
const authoritativeHosts = [
  'aasm.org', 'www.aasm.org', 'apa.org', 'www.apa.org', 'cdc.gov', 'www.cdc.gov', 'collegeboard.org', 'clep.collegeboard.org',
  'doi.org', 'europepmc.org', 'journals.sagepub.com', 'ncbi.nlm.nih.gov', 'nimh.nih.gov',
  'www.nimh.nih.gov', 'nist.gov', 'www.nist.gov', 'ods.od.nih.gov', 'pmc.ncbi.nlm.nih.gov',
  'pubmed.ncbi.nlm.nih.gov', 'www.ncbi.nlm.nih.gov', 'routledge.com', 'www.routledge.com', 'who.int', 'www.who.int',
];

function loadHub() {
  if (!fs.existsSync(modulePath)) throw new Error('Build the Test Prep Hub module before running native QA.');
  const react = {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  const context = vm.createContext({ console: { log() {}, warn() {}, error() {} }, window: { React: react } });
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context, { filename: 'test_prep_hub_module.js', timeout: 10000 });
  const hub = context.window.AlloModules && context.window.AlloModules.TestPrepHub;
  if (!hub) throw new Error('Test Prep Hub did not register during native QA.');
  return hub;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function sourceIsAuthoritative(reference) {
  try {
    const url = new URL(reference);
    return url.protocol === 'https:' && authoritativeHosts.includes(url.hostname.toLowerCase());
  } catch (_) {
    return false;
  }
}

function itemFindings(item, legacyById) {
  const findings = [];
  const add = (check, message) => findings.push({ check, message });
  const choices = Array.isArray(item.choices) ? item.choices : [];

  if (!item.prompt || choices.length !== 4 || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex >= choices.length) {
    add('one-best-answer', 'Item must have one prompt, four choices, and one valid answer key.');
  }
  if (new Set(choices.map(normalizeText)).size !== choices.length || choices.some((choice) => normalizeText(choice).length < 3)) {
    add('distractor-quality', 'Choices must be distinct and substantive.');
  }
  if (choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))) {
    add('distractor-quality', 'All/none-of-the-above choices are not permitted in the native pack.');
  }
  if (!Array.isArray(item.references) || !item.references.length || item.references.some((reference) => !sourceIsAuthoritative(reference))) {
    add('authoritative-source', 'Every item needs at least one HTTPS source from the approved primary, government, or professional-body set.');
  }
  if (item.reviewStatus !== 'source-reviewed') add('authoritative-source', 'Item is not marked source-reviewed.');
  if (!item.rationale || item.rationale.length < 100) add('rationale-quality', 'Rationale must explain the answer in at least 100 characters.');

  if (Number.isInteger(item.answerIndex) && choices[item.answerIndex]) {
    const lengths = choices.map((choice) => normalizeText(choice).length);
    const answerLength = lengths[item.answerIndex];
    const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
    if (answerLength >= 18 && answerLength >= longestDistractor + 12 && answerLength >= longestDistractor * 1.35) {
      add('clue-resistance', 'Correct choice is conspicuously longer than every distractor.');
    }
  }

  if (item.legacySourceId) {
    const source = legacyById.get(item.legacySourceId);
    if (!source || source.sourceFile !== item.legacySourceFile) add('provenance', 'Legacy source ID/file does not resolve in the audit.');
    else {
      const sourceBlockingFlags = new Set(['missing_prompt', 'insufficient_choices', 'invalid_answer_key', 'missing_rationale', 'encoding_corruption']);
      if (source.flags.some((flag) => sourceBlockingFlags.has(flag.code))) add('provenance', 'Legacy source has a structural or text-integrity defect that must be resolved before use.');
      if (normalizeText(source.prompt) === normalizeText(item.prompt)) add('provenance', 'Legacy wording was copied rather than re-authored.');
    }
    if (item.migrationStatus !== 're-authored-source-reviewed') add('provenance', 'Migrated item lacks the re-authored source-review status.');
  }
  if (item.qaStatus !== 'qa-passed' || !/^\d{4}-\d{2}-\d{2}$/.test(item.qaReviewedAt || '')) {
    add('qa-declaration', 'Item has not been explicitly marked as completing native QA.');
  }
  return findings;
}

const hub = loadHub();
const pack = hub.listPacks().find((candidate) => candidate.id === 'eppp-part-one');
if (!pack) throw new Error('Native EPPP pack not found.');
const legacyAudit = JSON.parse(fs.readFileSync(legacyAuditPath, 'utf8'));
const legacyById = new Map(legacyAudit.reviewQueue.map((item) => [item.id, item]));
const itemReports = pack.items.map((item) => {
  const findings = itemFindings(item, legacyById);
  return {
    id: item.id,
    domainId: item.domainId,
    provenance: item.legacySourceId ? 'legacy-seeded-re-authored' : 'native-original',
    legacySourceId: item.legacySourceId || null,
    qaStatus: findings.length ? 'review-required' : 'pass',
    checks: expectedChecks.map((check) => ({ check, status: findings.some((finding) => finding.check === check) ? 'review-required' : 'pass' })),
    findings,
    references: item.references,
  };
});

const packFindings = [];
const answerPositions = pack.items.reduce((counts, item) => {
  counts[item.answerIndex] = (counts[item.answerIndex] || 0) + 1;
  return counts;
}, {});
const answerCounts = [0, 1, 2, 3].map((index) => answerPositions[index] || 0);
if (Math.max(...answerCounts) - Math.min(...answerCounts) > 1) packFindings.push('Answer positions are not balanced across A–D.');
const promptCount = new Set(pack.items.map((item) => normalizeText(item.prompt))).size;
if (promptCount !== pack.items.length) packFindings.push('Native pack contains duplicate normalized prompts.');
for (const domain of pack.domains) {
  if (!pack.items.some((item) => item.domainId === domain.id)) packFindings.push('Domain ' + domain.id + ' has no native items.');
}

const passedItems = itemReports.filter((item) => item.qaStatus === 'pass').length;
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  packId: pack.id,
  packVersion: pack.version,
  standard: {
    label: 'AlloFlow native test-prep content QA v1',
    checks: expectedChecks,
    meaning: 'QA pass confirms cited answer support, one-best-answer structure, plausible distinct distractors, clue checks, explanatory rationale, and migration provenance.',
    limitation: 'QA pass is not psychometric calibration, official exam approval, or independent licensed-psychologist validation.',
  },
  summary: {
    totalItems: pack.items.length,
    passedItems,
    reviewRequiredItems: pack.items.length - passedItems,
    domains: pack.domains.length,
    answerPositions,
    packFindings,
    status: passedItems === pack.items.length && !packFindings.length ? 'pass' : 'review-required',
  },
  items: itemReports,
};

const markdown = `# EPPP native pack QA report

Generated: ${report.generatedAt}

Pack: ${pack.title} v${pack.version}

## What “QA passed” means

${report.standard.meaning}

> ${report.standard.limitation}

## Result

| Metric | Result |
| --- | ---: |
| Native questions | ${report.summary.totalItems} |
| QA-passed questions | ${report.summary.passedItems} |
| Questions requiring review | ${report.summary.reviewRequiredItems} |
| Domains | ${report.summary.domains} |
| Answer keys | A ${answerPositions[0] || 0} · B ${answerPositions[1] || 0} · C ${answerPositions[2] || 0} · D ${answerPositions[3] || 0} |
| Overall status | ${report.summary.status.toUpperCase()} |

## Item matrix

| Item | Domain | Origin | Status | Sources |
| --- | --- | --- | --- | ---: |
${itemReports.map((item) => `| ${item.id} | ${item.domainId} | ${item.provenance} | ${item.qaStatus} | ${item.references.length} |`).join('\n')}
`;

for (const outputRoot of outputRoots) {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, 'eppp_native_qa.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'eppp_native_qa.md'), markdown, 'utf8');
}

console.log('Native EPPP QA: ' + passedItems + '/' + pack.items.length + ' items passed; pack status ' + report.summary.status + '.');
if (report.summary.status !== 'pass') {
  for (const item of itemReports.filter((candidate) => candidate.qaStatus !== 'pass')) {
    console.error(item.id + ': ' + item.findings.map((finding) => finding.check + ' — ' + finding.message).join('; '));
  }
  for (const finding of packFindings) console.error('pack: ' + finding);
  process.exit(1);
}
