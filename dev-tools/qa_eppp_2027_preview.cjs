#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePackPath = path.join(root, 'test_prep', 'eppp_2027_preview_pack.json');
const deployPackPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_2027_preview_pack.json');
const reportPaths = [
  path.join(root, 'test_prep', 'eppp_2027_preview_qa.json'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_2027_preview_qa.json'),
];
const markdownPaths = [
  path.join(root, 'test_prep', 'eppp_2027_preview_qa.md'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_2027_preview_qa.md'),
];

const blueprintUrl = 'https://asppb.net/future-eppp-content-areas-2027/';
const expectedPresentationMetadata = {
  title: 'Unofficial Integrated EPPP 2027 Blueprint Preview',
  shortTitle: '2027 Blueprint Preview (Unofficial)',
  description: 'An independently authored, unofficial 20-item scenario-based sampler proportionally aligned to ASPPB\'s published future six-domain blueprint; not an official or psychometrically calibrated EPPP form.',
  previewBadge: 'Unofficial',
};
const expectedBlueprintMetadata = {
  blueprintLabel: 'Integrated EPPP future six-domain blueprint (fall 2027)',
  blueprintEffective: 'Future integrated EPPP blueprint planned for fall 2027 and later administrations',
  officialBlueprintUrl: blueprintUrl,
  transitionNotice: 'This unofficial preview follows ASPPB\'s future integrated six-domain blueprint. Current EPPP Part 1-Knowledge and Part 2-Skills administrations in 2026 and 2027 continue to use their separately published blueprints.',
  transitionUrl: blueprintUrl,
};
const checks = [
  'future-blueprint-alignment',
  'unofficial-preview-labeling',
  'domain-allocation',
  'answer-position-balance',
  'one-best-answer',
  'scenario-and-competency-application',
  'parallel-plausible-options',
  'keyed-option-length',
  'categorical-cue-balance',
  'all-none-option-rejection',
  'option-specific-feedback',
  'authoritative-source-details',
  'originality-and-provenance',
  'deployment-parity',
];
const expectedDomains = {
  'scientific-orientation': { label: 'Scientific Orientation to Practice', weight: 0.15, itemCount: 3 },
  assessment: { label: 'Assessment', weight: 0.20, itemCount: 4 },
  intervention: { label: 'Intervention', weight: 0.20, itemCount: 4 },
  'consultation-supervision': { label: 'Consultation and Supervision', weight: 0.10, itemCount: 2 },
  'interpersonal-relationships': { label: 'Interpersonal Relationships', weight: 0.15, itemCount: 3 },
  'ethical-professional-practice': { label: 'Ethical and Professional Practice', weight: 0.20, itemCount: 4 },
};
const expectedTags = new Set([
  '1.C.1', '1.B.2', '1.D.2',
  '2.B.5', '2.C.2', '2.A.3', '2.C.3',
  '3.A.3', '3.C.2', '3.B.3', '3.D.2',
  '4.D.1', '4.C.1',
  '5.B.2', '5.B.4', '5.C.3',
  '6.C.2', '6.B.4', '6.B.3', '6.C.4',
]);
const allowedHosts = new Set([
  'asppb.net',
  'www.apa.org',
  'dictionary.apa.org',
  'www.nih.gov',
  'pubmed.ncbi.nlm.nih.gov',
  'www.nlm.nih.gov',
  'www.bmj.com',
  'www.testingstandards.net',
  'www.ada.gov',
  'www.fda.gov',
  'www.ftc.gov',
  'www.hhs.gov',
  'store.samhsa.gov',
  'www.cdc.gov',
  'www.pcori.org',
  'thinkculturalhealth.hhs.gov',
  'onlinelibrary.wiley.com',
  'www.ipecollaborative.org',
]);
const allNonePattern = /\b(?:all|none)\s+of\s+(?:the\s+)?(?:above|these|those|options)\b/i;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordCount = (value) => normalize(value).split(/\s+/).filter(Boolean).length;
const categoricalCuePattern = /\b(?:always|never|only|every|entirely|completely|automatically|guarantees?|proves?|eliminates?|invalidates?)\b/i;
const expectedQaExceptions = {
  'eppp-2027-preview-ethical-02': {
    categoricalDistractors: 'Two audit-prescribed distractors intentionally test categorical legal errors about record subsets and subpoena force; the keyed response preserves jurisdiction-sensitive conditional reasoning.',
  },
};

const sourceText = fs.readFileSync(sourcePackPath, 'utf8');
const deployText = fs.readFileSync(deployPackPath, 'utf8');
const pack = JSON.parse(sourceText);
const findings = [];
const itemFindings = new Map();
const add = (check, message, itemId = null) => {
  const finding = { check, message, ...(itemId ? { itemId } : {}) };
  findings.push(finding);
  if (itemId) {
    if (!itemFindings.has(itemId)) itemFindings.set(itemId, []);
    itemFindings.get(itemId).push(finding);
  }
};

if (pack.schemaVersion !== 1 || pack.id !== 'eppp-integrated-2027-preview' || pack.status !== 'preview') {
  add('future-blueprint-alignment', 'Pack identity, schema, or preview status is invalid.');
}
if (pack.blueprint?.url !== blueprintUrl || pack.blueprint?.operationalTiming !== 'Fall 2027 and forward' || !/Integrated competency assessment/i.test(pack.blueprint?.assessmentModel || '')) {
  add('future-blueprint-alignment', 'The official blueprint URL, operational timing, or integrated assessment model is missing.');
}
for (const [field, expected] of Object.entries(expectedBlueprintMetadata)) {
  if (pack[field] !== expected) {
    add('future-blueprint-alignment', `Top-level Hub metadata ${field} is missing or does not match the reviewed value.`);
  }
}
for (const [field, expected] of Object.entries(expectedPresentationMetadata)) {
  if (pack[field] !== expected) add('unofficial-preview-labeling', `Learner-facing ${field} must visibly and exactly identify this as an unofficial preview.`);
}
if (!/unofficial/i.test(pack.disclaimer || '') || !/not affiliated/i.test(pack.disclaimer || '') || !/future blueprint/i.test(pack.disclaimer || '') || !/psychometrically calibrated/i.test(pack.disclaimer || '')) {
  add('unofficial-preview-labeling', 'The disclaimer must state unofficial status, future-blueprint alignment, non-affiliation, and lack of psychometric calibration.');
}
if (!/current EPPP Part 1 and Part 2/i.test(pack.disclaimer || '') || !/2026 and 2027/.test(pack.disclaimer || '')) {
  add('unofficial-preview-labeling', 'The current-exam boundary for 2026 and 2027 is missing.');
}
if (!Array.isArray(pack.items) || pack.items.length !== 20) add('domain-allocation', 'The preview must contain exactly 20 items.');
if (!Array.isArray(pack.domains) || pack.domains.length !== 6) add('domain-allocation', 'Exactly six future-blueprint domains must be declared.');

const declaredDomains = new Map((pack.domains || []).map((domain) => [domain.id, domain]));
for (const [domainId, expected] of Object.entries(expectedDomains)) {
  const declared = declaredDomains.get(domainId);
  if (!declared || declared.label !== expected.label || Number(declared.weight) !== expected.weight || declared.itemCount !== expected.itemCount) {
    add('domain-allocation', `Invalid declaration for ${domainId}.`);
  }
  const actual = (pack.items || []).filter((item) => item.domainId === domainId).length;
  if (actual !== expected.itemCount) add('domain-allocation', `${domainId} must contain ${expected.itemCount} items; found ${actual}.`);
}

const answerPositions = [0, 1, 2, 3].map((answerIndex) => (pack.items || []).filter((item) => item.answerIndex === answerIndex).length);
if (answerPositions.some((count) => count !== 5)) add('answer-position-balance', `Answer positions must be 5/5/5/5; found ${answerPositions.join('/')}.`);

const ids = new Set();
const prompts = new Set();
for (const item of pack.items || []) {
  const choices = Array.isArray(item.choices) ? item.choices : [];
  const choiceRationales = Array.isArray(item.choiceRationales) ? item.choiceRationales : [];
  const normalizedPrompt = normalize(item.prompt);
  if (!/^eppp-2027-preview-(?:scientific|assessment|intervention|consultation|interpersonal|ethical)-\d{2}$/.test(item.id || '')) {
    add('originality-and-provenance', 'Item ID is outside the stable preview namespace.', item.id || 'missing-id');
  }
  if (ids.has(item.id)) add('originality-and-provenance', 'Duplicate item ID.', item.id);
  ids.add(item.id);
  if (prompts.has(normalizedPrompt)) add('originality-and-provenance', 'Duplicate normalized prompt.', item.id);
  prompts.add(normalizedPrompt);
  if (item.officialItem !== false || 'legacySourceId' in item || 'migrationStatus' in item) {
    add('originality-and-provenance', 'Preview items must be independently authored, explicitly unofficial, and free of migration provenance.', item.id);
  }
  if (item.type !== 'single-choice' || choices.length !== 4 || new Set(choices.map(normalize)).size !== 4 || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) {
    add('one-best-answer', 'Each item must have four distinct choices and exactly one valid answer index.', item.id);
  }
  if (!expectedDomains[item.domainId] || !expectedTags.has(item.competencyTag) || !item.competencyLabel || item.competencyLabel.length < 50) {
    add('future-blueprint-alignment', 'Domain, competency tag, or full competency description is invalid.', item.id);
  }
  if (!item.editorialChecks || item.editorialChecks.scenarioBased !== true || item.editorialChecks.singleBestAnswer !== true || item.editorialChecks.noKeywordGiveaway !== true) {
    add('scenario-and-competency-application', 'The explicit scenario, single-best-answer, and clue-resistance editorial declarations are incomplete.', item.id);
  }
  if (String(item.prompt || '').length < 150 || item.difficulty !== 'advanced') {
    add('scenario-and-competency-application', 'Prompt must be a substantive advanced application scenario.', item.id);
  }
  const optionWords = choices.map(wordCount);
  const shortest = Math.min(...optionWords);
  const longest = Math.max(...optionWords);
  const answerWords = optionWords[item.answerIndex];
  const distractorWords = optionWords.filter((_, index) => index !== item.answerIndex);
  const distractorAverage = distractorWords.reduce((sum, count) => sum + count, 0) / Math.max(1, distractorWords.length);
  const declaredExceptions = item.qaExceptions && typeof item.qaExceptions === 'object' && !Array.isArray(item.qaExceptions) ? item.qaExceptions : {};
  const expectedExceptions = expectedQaExceptions[item.id] || {};
  for (const exceptionKey of new Set([...Object.keys(declaredExceptions), ...Object.keys(expectedExceptions)])) {
    const check = exceptionKey === 'categoricalDistractors' ? 'categorical-cue-balance' : 'keyed-option-length';
    if (declaredExceptions[exceptionKey] !== expectedExceptions[exceptionKey]) {
      add(check, `QA exception ${exceptionKey} is missing, unexpected, or does not match its narrowly reviewed rationale.`, item.id);
    }
  }
  if (shortest < 7 || longest / Math.max(1, shortest) > 2.25 || item.editorialChecks?.parallelPlausibleOptions !== true) {
    add('parallel-plausible-options', `Options are not sufficiently parallel (${optionWords.join('/')}).`, item.id);
  }
  const keyedLengthGateTriggered = answerWords - distractorAverage > 3;
  if (keyedLengthGateTriggered && (!expectedExceptions.keyedOptionLength || declaredExceptions.keyedOptionLength !== expectedExceptions.keyedOptionLength)) {
    add('keyed-option-length', `The keyed option is ${(answerWords - distractorAverage).toFixed(2)} words longer than the distractor average; the hard maximum is 3.00 without a narrowly reviewed exception.`, item.id);
  }
  if (!keyedLengthGateTriggered && declaredExceptions.keyedOptionLength) {
    add('keyed-option-length', 'A keyed-option-length exception is declared even though the hard gate is not triggered.', item.id);
  }
  const keyedHasCategoricalCue = categoricalCuePattern.test(choices[item.answerIndex] || '');
  const categoricalDistractorCount = choices.reduce((count, choice, index) => (
    index !== item.answerIndex && categoricalCuePattern.test(choice) ? count + 1 : count
  ), 0);
  const categoricalGateTriggered = categoricalDistractorCount >= 2 && !keyedHasCategoricalCue;
  if (categoricalGateTriggered && (!expectedExceptions.categoricalDistractors || declaredExceptions.categoricalDistractors !== expectedExceptions.categoricalDistractors)) {
    add('categorical-cue-balance', `${categoricalDistractorCount} distractors contain categorical cues while the key contains none; the hard maximum is 1 without a narrowly reviewed exception.`, item.id);
  }
  if (!categoricalGateTriggered && declaredExceptions.categoricalDistractors) {
    add('categorical-cue-balance', 'A categorical-distractor exception is declared even though the hard gate is not triggered.', item.id);
  }
  if (choices.some((choice) => allNonePattern.test(choice)) || item.editorialChecks?.noAllOrNoneOption !== true) {
    add('all-none-option-rejection', 'All/none-of-the-above response formats are prohibited.', item.id);
  }
  if (String(item.rationale || '').length < 170 || choiceRationales.length !== 4 || choiceRationales.some((entry) => String(entry || '').trim().length < 70)) {
    add('option-specific-feedback', 'A full rationale and four substantive choice-specific explanations are required.', item.id);
  }
  const references = Array.isArray(item.references) ? item.references : [];
  const details = Array.isArray(item.sourceDetails) ? item.sourceDetails : [];
  if (!references.includes(blueprintUrl) || references.length < 2 || new Set(references).size !== references.length || details.length !== references.length) {
    add('authoritative-source-details', 'Every item must cite the official blueprint plus topic evidence with one detail record per URL.', item.id);
  }
  for (const reference of references) {
    let parsed;
    try { parsed = new URL(reference); } catch (_) { parsed = null; }
    if (!parsed || parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname.toLowerCase())) {
      add('authoritative-source-details', `Reference is not an allowlisted authoritative HTTPS source: ${reference}`, item.id);
    }
    const detail = details.find((candidate) => candidate.url === reference);
    if (!detail || String(detail.title || '').length < 20 || String(detail.organization || '').length < 8 || String(detail.credibility || '').length < 100) {
      add('authoritative-source-details', `Source details are incomplete for ${reference}.`, item.id);
    }
  }
}

if (sourceText !== deployText) add('deployment-parity', 'Source and deployment preview pack JSON are not byte-identical.');

const itemReports = (pack.items || []).map((item) => {
  const failures = itemFindings.get(item.id) || [];
  return {
    id: item.id,
    domainId: item.domainId,
    competencyTag: item.competencyTag,
    answerIndex: item.answerIndex,
    qaStatus: failures.length ? 'review-required' : 'pass',
    checks: checks.map((check) => ({
      name: check,
      status: failures.some((finding) => finding.check === check) ? 'review-required' : 'pass',
    })),
  };
});
const passedItems = itemReports.filter((item) => item.qaStatus === 'pass').length;
const status = findings.length === 0 ? 'pass' : 'review-required';
const report = {
  schemaVersion: 1,
  generatedAt: '2026-07-16T00:00:00.000Z',
  packId: pack.id,
  packVersion: pack.version,
  standard: {
    label: 'AlloFlow Integrated EPPP 2027 Preview source, blueprint, structure, feedback, clue-resistance, and parity QA v2',
    checks,
    meaning: 'A pass confirms exact proportional alignment to ASPPB\'s published fall-2027 domain weights, advanced scenario structure, four parallel plausible choices, hard keyed-option-length and categorical-cue checks with only narrowly documented exceptions, a single supported answer, complete option-specific feedback, full authoritative source details, clear unofficial labeling, and source/deployment parity.',
    limitation: 'This editorial and automated QA is not ASPPB approval, independent licensed-psychologist validation, field testing, psychometric calibration, item-response analysis, a scaled-score model, or evidence that these items will appear on an EPPP form.',
  },
  blueprint: {
    url: blueprintUrl,
    operationalTiming: 'Fall 2027 and forward',
    domainAllocation: Object.fromEntries(Object.entries(expectedDomains).map(([id, value]) => [id, value.itemCount])),
    weights: Object.fromEntries(Object.entries(expectedDomains).map(([id, value]) => [id, value.weight])),
  },
  summary: {
    totalItems: itemReports.length,
    passedItems,
    reviewRequiredItems: itemReports.length - passedItems,
    domainCounts: Object.fromEntries(Object.keys(expectedDomains).map((id) => [id, (pack.items || []).filter((item) => item.domainId === id).length])),
    answerPositions: { A: answerPositions[0], B: answerPositions[1], C: answerPositions[2], D: answerPositions[3] },
    findings: findings.length,
    status,
  },
  findings,
  items: itemReports,
};

const reportText = `${JSON.stringify(report, null, 2)}\n`;
for (const output of reportPaths) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, reportText, 'utf8');
}

const domainRows = Object.entries(expectedDomains).map(([id, value]) => {
  const actual = report.summary.domainCounts[id];
  return `| ${value.label} | ${Math.round(value.weight * 100)}% | ${value.itemCount} | ${actual} |`;
}).join('\n');
const markdown = `# Integrated EPPP 2027 Preview QA\n\n- Status: **${status}**\n- Items passing: **${passedItems}/${itemReports.length}**\n- Answer positions: **A ${answerPositions[0]} / B ${answerPositions[1]} / C ${answerPositions[2]} / D ${answerPositions[3]}**\n- Findings: **${findings.length}**\n- Blueprint: ${blueprintUrl}\n\n## Exact proportional alignment\n\n| Future domain | Official weight | Required sampler items | Actual |\n| --- | ---: | ---: | ---: |\n${domainRows}\n\n## QA boundary\n\n${report.standard.meaning}\n\n${report.standard.limitation}\n\nThe sampler is clearly labeled unofficial and future-blueprint aligned. The current EPPP Part 1 and Part 2 administered during 2026 and 2027 retain their separately published blueprints.\n`;
for (const output of markdownPaths) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, markdown, 'utf8');
}

if (status !== 'pass') {
  console.error(`Integrated EPPP 2027 Preview QA: ${passedItems}/${itemReports.length} items passed; ${findings.length} findings.`);
  for (const finding of findings) console.error(`- ${finding.check}${finding.itemId ? ` [${finding.itemId}]` : ''}: ${finding.message}`);
  process.exitCode = 1;
} else {
  console.log(`Integrated EPPP 2027 Preview QA: ${passedItems}/${itemReports.length} items passed; exact 3/4/4/2/3/4 allocation and 5/5/5/5 key balance.`);
}
