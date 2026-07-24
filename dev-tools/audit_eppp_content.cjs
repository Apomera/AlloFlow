#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const workspaceRoot = path.resolve(__dirname, '..');
const runtimeRoot = path.join(workspaceRoot, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(workspaceRoot, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const indexPath = path.join(runtimeRoot, 'index.html');

function canonicalText(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function stableId(question, choices, sourceFile, ordinal) {
  return 'legacy-' + crypto.createHash('sha256')
    .update(canonicalText(sourceFile) + '\n' + String(ordinal) + '\n' + canonicalText(question) + '\n' + choices.map(canonicalText).join('\n'))
    .digest('hex').slice(0, 16);
}

function loadLearnerBank() {
  if (!fs.existsSync(indexPath)) throw new Error('Missing imported EPPP runtime: ' + indexPath);
  const html = fs.readFileSync(indexPath, 'utf8');
  const scripts = Array.from(html.matchAll(/<script\s+src=["'](js\/[^"']+\.js)["']/gi), (match) => match[1])
    .filter((relative) => /\/(?:data|questions_bank|data_batch\d+|rationale_enhancements\d*|references_overlay\d+)\.js$/i.test(relative));
  if (!scripts.includes('js/data.js') || !scripts.includes('js/questions_bank.js')) {
    throw new Error('Could not identify the canonical EPPP data scripts.');
  }

  const context = vm.createContext({ console: { log() {}, warn() {}, error() {} } });
  for (const relative of scripts) {
    const filePath = path.join(runtimeRoot, relative);
    vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, { filename: relative, timeout: 10000 });
    const domains = vm.runInContext('EPPPData.domains', context);
    for (const domain of domains) {
      for (const question of Array.isArray(domain.questions) ? domain.questions : []) {
        if (!question.__auditSource) question.__auditSource = relative;
      }
    }
  }
  return { scripts, questions: vm.runInContext('EPPPData.getAllQuestions()', context) };
}

function extractReferences(question) {
  const candidates = [question.references, question.reference, question.sources, question.source, question.citations, question.citation];
  return candidates.flatMap((value) => Array.isArray(value) ? value : value ? [value] : [])
    .map((value) => typeof value === 'string' ? value.trim() : JSON.stringify(value))
    .filter(Boolean);
}

function auditQuestion(question, index) {
  const prompt = String(question.q || question.prompt || '').trim();
  const choices = (Array.isArray(question.options) ? question.options : Array.isArray(question.choices) ? question.choices : [])
    .map((choice) => String(choice || '').trim());
  const answerIndex = Number.isInteger(question.answer) ? question.answer : Number(question.correct);
  const rationale = String(question.rationale || question.explanation || '').trim();
  const references = extractReferences(question);
  const flags = [];
  const add = (code, severity, detail) => flags.push({ code, severity, detail });

  if (!prompt) add('missing_prompt', 'blocker', 'Question prompt is empty.');
  if (choices.length < 2) add('insufficient_choices', 'blocker', 'Fewer than two answer choices.');
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) {
    add('invalid_answer_key', 'blocker', 'Answer index is outside the available choices.');
  }
  if (!rationale) add('missing_rationale', 'high', 'No learner-facing rationale.');
  if (!references.length) add('missing_reference', 'medium', 'No citation or reference overlay is attached.');

  const combined = [prompt, ...choices, rationale].join(' ');
  if (/(?:Ã.|â[^\s]|ï¿½|�)/.test(combined)) {
    add('encoding_corruption', 'high', 'Text contains likely mojibake or replacement characters.');
  }
  if (/\b(?:DSM-(?:IV|5)|APA\s+(?:Ethics\s+Code|Standard)|HIPAA|Tarasoff|duty\s+to\s+warn|mandat(?:ed|ory)\s+report|licens(?:e|ing|ure)|passing\s+score|EPPP|FDA|legal(?:ly)?|statute|case\s+law)\b/i.test(combined)) {
    add('time_sensitive_claim', 'high', 'Legal, ethical, diagnostic, or credential guidance needs a current authoritative source review.');
  }

  if (Number.isInteger(answerIndex) && choices[answerIndex]) {
    const lengths = choices.map((choice) => canonicalText(choice).length);
    const answerLength = lengths[answerIndex];
    const distractorLengths = lengths.filter((_, choiceIndex) => choiceIndex !== answerIndex);
    const longestDistractor = Math.max(0, ...distractorLengths);
    if (answerLength >= 18 && answerLength >= longestDistractor + 12 && answerLength >= longestDistractor * 1.35) {
      add('correct_answer_length_clue', 'medium', 'The correct choice is substantially longer than every distractor.');
    }
  }

  return {
    id: stableId(prompt, choices, question.__auditSource, index + 1),
    ordinal: index + 1,
    sourceFile: String(question.__auditSource || 'unknown'),
    domainId: Number(question.domainId) || String(question.domainId || 'unknown'),
    domainName: String(question.domainName || ''),
    difficulty: String(question.difficulty || 'unrated'),
    prompt,
    choices,
    answerIndex,
    rationale,
    references,
    flags,
  };
}

function buildAudit() {
  const loaded = loadLearnerBank();
  const items = loaded.questions.map(auditQuestion);
  const duplicateMap = new Map();
  for (const item of items) {
    const key = canonicalText(item.prompt);
    if (!duplicateMap.has(key)) duplicateMap.set(key, []);
    duplicateMap.get(key).push(item);
  }
  const duplicateGroups = [];
  for (const [key, group] of duplicateMap) {
    if (!key || group.length < 2) continue;
    const groupId = 'duplicate-' + crypto.createHash('sha1').update(key).digest('hex').slice(0, 10);
    duplicateGroups.push({ id: groupId, count: group.length, prompt: group[0].prompt, itemIds: group.map((item) => item.id) });
    for (const item of group) item.flags.push({ code: 'duplicate_prompt', severity: 'high', detail: 'Prompt appears ' + group.length + ' times in the learner-visible bank (' + groupId + ').' });
  }

  const severityRank = { blocker: 4, high: 3, medium: 2, low: 1 };
  for (const item of items) {
    item.reviewPriority = item.flags.reduce((highest, flag) => severityRank[flag.severity] > severityRank[highest] ? flag.severity : highest, 'low');
    if (!item.flags.length) item.reviewPriority = 'routine';
  }

  const flagCounts = {};
  const severityCounts = { blocker: 0, high: 0, medium: 0, routine: 0 };
  const answerPositions = {};
  const byDomain = {};
  for (const item of items) {
    for (const flag of item.flags) flagCounts[flag.code] = (flagCounts[flag.code] || 0) + 1;
    severityCounts[item.reviewPriority] = (severityCounts[item.reviewPriority] || 0) + 1;
    if (Number.isInteger(item.answerIndex)) answerPositions[item.answerIndex] = (answerPositions[item.answerIndex] || 0) + 1;
    const key = String(item.domainId);
    if (!byDomain[key]) byDomain[key] = { domainId: item.domainId, domainName: item.domainName, total: 0, blocker: 0, high: 0, medium: 0, routine: 0 };
    byDomain[key].total += 1;
    byDomain[key][item.reviewPriority] = (byDomain[key][item.reviewPriority] || 0) + 1;
  }

  const referencedItems = items.filter((item) => item.references.length).length;
  const positionedAnswers = Object.entries(answerPositions).sort((a, b) => b[1] - a[1]);
  const dominantAnswerIndex = positionedAnswers.length ? Number(positionedAnswers[0][0]) : null;
  const dominantAnswerCount = positionedAnswers.length ? positionedAnswers[0][1] : 0;
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: 'Pass the EPPP learner-visible runtime after rationale and reference overlays',
    methodology: 'Automated triage only. Flags are review prompts, not findings of factual inaccuracy or expert validation.',
    scriptsAudited: loaded.scripts,
    summary: {
      totalItems: items.length,
      domains: Object.keys(byDomain).length,
      sourceFiles: new Set(items.map((item) => item.sourceFile)).size,
      referencedItems,
      referenceCoveragePercent: items.length ? Math.round(referencedItems / items.length * 1000) / 10 : 0,
      duplicateGroups: duplicateGroups.length,
      duplicateItems: items.filter((item) => item.flags.some((flag) => flag.code === 'duplicate_prompt')).length,
      dominantAnswerIndex,
      dominantAnswerCount,
      dominantAnswerPercent: items.length ? Math.round(dominantAnswerCount / items.length * 1000) / 10 : 0,
      ...severityCounts,
    },
    answerPositions,
    flagCounts,
    byDomain: Object.values(byDomain).sort((a, b) => Number(a.domainId) - Number(b.domainId)),
    duplicateGroups: duplicateGroups.sort((a, b) => b.count - a.count || a.prompt.localeCompare(b.prompt)),
    reviewQueue: items.slice().sort((a, b) => (severityRank[b.reviewPriority] || 0) - (severityRank[a.reviewPriority] || 0) || a.ordinal - b.ordinal),
  };
  return report;
}

function markdownReport(report) {
  const s = report.summary;
  const flagRows = Object.entries(report.flagCounts).sort((a, b) => b[1] - a[1]);
  return `# Pass the EPPP legacy content audit

Generated: ${report.generatedAt}

> ${report.methodology}

## Snapshot

| Metric | Count |
| --- | ---: |
| Learner-visible questions | ${s.totalItems} |
| Domains | ${s.domains} |
| Source files contributing questions | ${s.sourceFiles} |
| Items with attached references | ${s.referencedItems} (${s.referenceCoveragePercent}%) |
| Exact/normalized duplicate groups | ${s.duplicateGroups} |
| Items in duplicate groups | ${s.duplicateItems} |
| Dominant answer position | ${s.dominantAnswerIndex == null ? 'n/a' : String.fromCharCode(65 + s.dominantAnswerIndex)} (${s.dominantAnswerCount}; ${s.dominantAnswerPercent}%) |
| Blocker-priority items | ${s.blocker} |
| High-priority items | ${s.high} |
| Medium-priority items | ${s.medium} |
| Routine review items | ${s.routine} |

## Flag counts

| Automated flag | Items |
| --- | ---: |
${flagRows.map(([flag, count]) => `| ${flag} | ${count} |`).join('\n')}

## Domain queue

| Domain | Total | Blocker | High | Medium | Routine |
| --- | ---: | ---: | ---: | ---: | ---: |
${report.byDomain.map((domain) => `| ${domain.domainName || domain.domainId} | ${domain.total} | ${domain.blocker || 0} | ${domain.high || 0} | ${domain.medium || 0} | ${domain.routine || 0} |`).join('\n')}

## Interpretation

- A blocker indicates malformed structure such as an invalid answer key; it does not automatically mean the underlying concept is wrong.
- High-priority items include duplicates, missing rationales, encoding damage, or claims likely to change with law, ethics codes, diagnostic manuals, or credential policy.
- Medium-priority items commonly lack an attached reference or contain a possible answer-length clue.
- Human subject-matter and psychometric review remains required before any legacy item is promoted into a native AlloFlow pack.
`;
}

const report = buildAudit();
const json = JSON.stringify(report, null, 2) + '\n';
const markdown = markdownReport(report);
for (const outputRoot of [runtimeRoot, deployRoot]) {
  if (!fs.existsSync(outputRoot)) throw new Error('Missing EPPP output directory: ' + outputRoot);
  fs.writeFileSync(path.join(outputRoot, 'content_audit.json'), json, 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'content_audit.md'), markdown, 'utf8');
}

console.log('Audited ' + report.summary.totalItems + ' learner-visible EPPP questions.');
console.log('Reference coverage: ' + report.summary.referenceCoveragePercent + '%');
console.log('Duplicate groups: ' + report.summary.duplicateGroups);
console.log('Review priority — blocker: ' + report.summary.blocker + ', high: ' + report.summary.high + ', medium: ' + report.summary.medium + ', routine: ' + report.summary.routine);
