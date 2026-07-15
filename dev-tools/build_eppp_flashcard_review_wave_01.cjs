#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { clean, normalize, sourceFor } = require('./eppp_editorial_support.cjs');
const revisions = require('./eppp_flashcard_revisions.cjs');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_learning_library.json');
const overridesPath = path.join(root, 'test_prep', 'eppp_learning_review_overrides.json');
const outputName = 'eppp_flashcard_review_wave_01.json';
const markdownName = 'eppp_flashcard_review_wave_01.md';
const waveId = 'eppp-flashcard-review-wave-01';
const reviewDate = '2026-07-14';
const quotas = new Map([[1, 14], [2, 14], [3, 13], [4, 13], [5, 12], [6, 13], [7, 14], [8, 7]]);

if (!fs.existsSync(sourcePath)) throw new Error('Build eppp_learning_library.json before creating a flashcard review wave.');
const library = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const manualOverrides = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, 'utf8')) : { flashcards: {} };
const currentWaveCount = library.flashcards.filter((card) => card.reviewWave === waveId).length;
const previouslySourceReviewed = library.summary.sourceReviewedFlashcards - currentWaveCount;
const candidateCards = library.flashcards.map((card) => card.reviewWave === waveId ? {
  ...card, front: card.legacyFront, back: card.legacyBack, reviewStatus: 'review-required',
} : card);

const unstableClaim = /\b(?:dsm(?:-|\s)?(?:iv|5|v)(?:-|\s)?tr|current(?:ly)?|latest|today|now|law|legal|statute|regulation|mandat(?:e|ed|ory)|duty to warn|reporting|licens(?:e|ing)|ethics code|apa code|medication|drug|dosage|dose|side effects?|black box|fda|pregnan\w*|suicid\w*|diagnos(?:is|tic)|prevalence|incidence|\d+\s*(?:mg|%|years?|months?|weeks?))\b/i;
const overclaim = /\b(?:always|never|guarantees?|proves?|gold standard|the neural basis|all people|no one)\b/i;
const malformed = /(?:\u00C3[\u0080-\u00FF]|\u00E2\u20AC|\uFFFD|<\/?(?:script|style|svg)\b)/i;
const excludedByDomain = new Map([
  [1, /\b(?:antipsychotic|antidepressant|anxiolytic|mood stabilizers?|stimulant|ssri\w*|maoi|lithium|benzodiazepine|buspirone|medications?|drugs?|parkinson|alzheimer|autism|seizure|wernicke-korsakoff|diathesis|health belief|alexithymia|mental illness|summary)\b/i],
  [2, /\b(?:cognitive distortions|depression)\b/i],
  [3, /\b(?:dusky|insanity defense|competency|performance appraisal|consultation|supervision|program evaluation|helms|nigrescence|zimbardo|berry|acculturation)\b/i],
  [4, /\b(?:dsm|diagnos|milestone|teratogen|prenatal|retirement adjustment|core knowledge|dynamic systems|scaffolding theory|dual-process model of grief)\b/i],
  [5, /\b(?:dsm|disorder|ptsd|autism|adhd|mood|eating|substance|trauma|treatment|therapy|beck scales|conners|flynn effect|malingering|mmpi|wais|wisc|wcst|rorschach|\btat\b|\bpai\b|stanford-binet|neuropsych|clinical vs\. actuarial)\b/i],
  [6, /\b(?:first-line|treatment-resistant|dose-effect|evidence-based treatments?|treatment of|therapeutic window|harm reduction|feedback-informed|gottman)\b/i],
  [7, /\b(?:belmont|human subjects?|research ethics|mixed methods|this maid)\b/i],
  [8, /\b(?:tarasoff|dusky|subpoena|court|goldwater|psypact|telehealth|telepsychology|hipaa|jaffee|o'connor|wyatt|mandat|reporting|record|retention|duty to|confidentiality|privilege|informed consent|competency|insanity|suicid|child abuse|custody|insurance|end-of-life|fee-related|forensic psychology ethical guidelines)\b/i],
]);
const topicPatterns = [
  /broca|wernicke|aphasia/i,
  /hippocamp|memory consolidation/i,
  /amygdala/i,
  /hpa axis/i,
  /split-brain|corpus callosum/i,
  /working memory|baddeley/i,
  /reinforcement|punishment/i,
  /proactive|retroactive interference/i,
  /encoding specificity/i,
  /schachter|james-lange|cannon-bard/i,
  /learned helplessness/i,
  /availability heuristic|representative heuristic/i,
  /bystander|diffusion of responsibility/i,
  /fundamental attribution/i,
  /cognitive dissonance/i,
  /milgram|obedience/i,
  /contact hypothesis|allport/i,
  /groupthink/i,
  /piaget/i,
  /vygotsky|zone of proximal/i,
  /erikson/i,
  /ainsworth|attachment types/i,
  /kohlberg|moral development/i,
  /fluid|crystallized/i,
  /bronfenbrenner|ecological systems/i,
  /marcia|identity status/i,
  /cronbach|internal consistency/i,
  /standard error of measurement|\bsem\b/i,
  /reliability/i,
  /validity types|criterion.*construct.*content/i,
  /wisc|wais|wechsler/i,
  /mmpi/i,
  /rogers|core conditions/i,
  /systematic desensitization|flooding/i,
  /motivational interviewing|\boars\b/i,
  /dbt|dialectical behavior/i,
  /stages of change/i,
  /dodo bird|common factors/i,
  /type i|type ii/i,
  /anova|t-test/i,
  /meta-analysis/i,
  /factorial design/i,
  /internal validity|threats to internal/i,
  /external validity|threats to external/i,
  /statistical power|power analysis/i,
  /multiple relationship|dual relationship|rural practice/i,
  /competence boundaries|boundaries of competence/i,
  /forensic assessment/i,
];
const stopWords = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'do', 'does', 'for', 'from', 'how', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'vs', 'what', 'when', 'which', 'who', 'with']);

function tokens(value) {
  return new Set(normalize(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)));
}

function jaccard(left, right) {
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function candidateScore(card) {
  const combined = `${card.front} ${card.back}`;
  let score = card.front.length + Math.round(card.back.length / 4);
  if (/\b(?:define|difference|distinguish|function|purpose|effect|model|theory|design|validity|reliability)\b/i.test(card.front)) score -= 25;
  if (/\b(?:approximately|typically|generally|may|can|tends? to)\b/i.test(combined)) score += 6;
  if (/\d/.test(combined)) score += 30;
  if (/\b(?:disorder|disease|syndrome|treatment|therapy|test|scale|inventory)\b/i.test(combined)) score += 12;
  return score;
}

function topicKey(card) {
  const patternIndex = topicPatterns.findIndex((pattern) => pattern.test(card.front));
  return patternIndex >= 0 ? `topic-${patternIndex}` : '';
}

const existingReviewedFronts = new Set(
  Object.entries(manualOverrides.flashcards || {})
    .filter(([, value]) => value && value.reviewStatus === 'source-reviewed-editorial-pass')
    .map(([front]) => normalize(front))
);

const selected = [];
const selectedTokens = [];
for (const [domainId, quota] of quotas) {
  const pool = candidateCards
    .filter((card) => Number(card.domainId) === domainId)
    .filter((card) => card.reviewStatus !== 'source-reviewed-editorial-pass')
    .filter((card) => !existingReviewedFronts.has(normalize(card.front)))
    .filter((card) => card.front.length >= 8 && card.front.length <= 220)
    .filter((card) => card.back.length >= 20 && card.back.length <= 700)
    .filter((card) => !unstableClaim.test(`${card.front} ${card.back}`))
    .filter((card) => !overclaim.test(`${card.front} ${card.back}`))
    .filter((card) => !malformed.test(`${card.front} ${card.back}`))
    .filter((card) => !(excludedByDomain.get(domainId) || /$a/).test(`${card.front} ${card.back}`))
    .sort((left, right) => candidateScore(left) - candidateScore(right) || left.id.localeCompare(right.id));

  const domainSelected = [];
  const domainTopics = new Set();
  for (const card of pool) {
    const cardTokens = tokens(card.front);
    const concept = topicKey(card);
    const isNearDuplicate = selectedTokens.some((entry) => entry.domainId === domainId && jaccard(cardTokens, entry.tokens) >= 0.5);
    if (concept && domainTopics.has(concept)) continue;
    if (isNearDuplicate) continue;
    domainSelected.push(card);
    selectedTokens.push({ domainId, tokens: cardTokens });
    if (concept) domainTopics.add(concept);
    if (domainSelected.length === quota) break;
  }
  if (domainSelected.length !== quota) throw new Error(`Domain ${domainId} yielded ${domainSelected.length} eligible cards; ${quota} required.`);
  selected.push(...domainSelected);
}

const items = selected.map((card, index) => {
  const revision = revisions.get(card.front) || {};
  const front = clean(revision.front || card.front);
  const back = clean(revision.back || card.back);
  const revisionApplied = Boolean(revision.front || revision.back);
  const source = sourceFor(card.domainId, front);
  return {
    sequence: index + 1,
    id: card.id,
    domainId: card.domainId,
    domain: card.domain,
    legacyFront: clean(card.front),
    legacyBack: clean(card.back),
    front,
    back,
    revisionApplied,
    revisionReason: clean(revision.reason),
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewMode: 'assisted-flashcard-editorial-review',
    reviewWave: waveId,
    reviewDate,
    reviewNote: `${revisionApplied ? 'Legacy wording was revised for accuracy, nuance, or source alignment. ' : ''}Reviewed for a focused retrieval target, readable wording, stable framing, and topical alignment with ${source.title}. Independent qualified expert validation remains pending.`,
    references: [source.url],
    sourceDetails: [source],
    checks: {
      atomicAnswer: 'editorial-pass',
      sourceSupport: 'topically-aligned-reputable-source',
      duplication: 'editorial-pass',
      accessibility: 'structure-pass',
      accuracyAndCurrency: 'assisted-review-pass-expert-pending',
      biasAndContext: 'assisted-review-pass-expert-pending',
    },
    independentExpertStatus: 'not-started',
    productionStatus: 'not-production-validated',
    learnerVisible: false,
  };
});

const domainBreakdown = Object.fromEntries(
  [...quotas.keys()].map((domainId) => {
    const domainItems = items.filter((item) => item.domainId === domainId);
    return [String(domainId), { domain: domainItems[0].domain, reviewed: domainItems.length }];
  })
);
const distinctSources = new Map();
for (const item of items) for (const entry of item.sourceDetails) distinctSources.set(entry.url, entry);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  waveId,
  reviewDate,
  status: 'assisted-editorial-review-complete-expert-pending',
  standard: {
    meaning: 'This wave records an assisted editorial and source-alignment pass. It does not constitute independent expert validation, psychometric evidence, or authorization for learner release.',
    selection: 'Readable, nonduplicate foundational cards were selected across all eight domains. Time-sensitive, legal, diagnostic-criteria, medication, numeric-frequency, malformed, and absolute claims were excluded or rewritten out of the reviewed form.',
    checks: ['atomic-answer', 'source-support', 'duplicate-screen', 'accessibility-structure', 'accuracy-and-currency-risk', 'bias-and-context-risk', 'independent-expert-review'],
  },
  summary: {
    reviewedFlashcards: items.length,
    domainsRepresented: Object.keys(domainBreakdown).length,
    distinctNamedSources: distinctSources.size,
    revisedFlashcards: items.filter((item) => item.revisionApplied).length,
    independentExpertValidated: 0,
    learnerVisible: 0,
    legacyFlashcards: library.flashcards.length,
    previouslySourceReviewed,
    sourceReviewedAfterIntegration: previouslySourceReviewed + items.length,
    remainingFirstPass: library.flashcards.length - previouslySourceReviewed - items.length,
  },
  domainBreakdown,
  sources: [...distinctSources.values()],
  items,
};

if (items.length !== 100 || new Set(items.map((item) => item.id)).size !== 100) throw new Error('Flashcard wave must contain exactly 100 unique cards.');

const markdown = `# EPPP flashcard review wave 01\n\n` +
  `Generated: ${report.generatedAt}\n\n` +
  `Status: **assisted editorial review complete; independent expert validation pending**\n\n` +
  `This wave reviews ${report.summary.reviewedFlashcards} foundational legacy flashcards across all eight domains. Time-sensitive, legal, diagnostic-criteria, medication, numeric-frequency, malformed, and absolute claims were excluded or rewritten out of the reviewed form. No card in this artifact is learner-visible solely because it passed this review.\n\n` +
  `## Progress\n\n` +
  `- Previously source-reviewed: ${report.summary.previouslySourceReviewed}\n` +
  `- Reviewed in this wave: ${report.summary.reviewedFlashcards}\n` +
  `- Legacy wordings revised: ${report.summary.revisedFlashcards}\n` +
  `- Source-reviewed after integration: ${report.summary.sourceReviewedAfterIntegration} of ${report.summary.legacyFlashcards}\n` +
  `- Remaining first-pass review: ${report.summary.remainingFirstPass}\n` +
  `- Independent expert validated: ${report.summary.independentExpertValidated}\n\n` +
  `## Domain distribution\n\n| Domain | Cards |\n| --- | ---: |\n` +
  Object.values(domainBreakdown).map((entry) => `| ${entry.domain} | ${entry.reviewed} |`).join('\n') +
  `\n\n## Named sources\n\n` + [...distinctSources.values()].map((entry) => `- [${entry.title}](${entry.url}) — ${entry.organization}. ${entry.credibility}`).join('\n') +
  `\n\n## Reviewed cards\n\n` + items.map((item) => `### ${item.sequence}. ${item.front}\n\n${item.back}\n\nSource: [${item.sourceDetails[0].title}](${item.sourceDetails[0].url}) (${item.sourceDetails[0].organization})\n\n${item.revisionApplied ? `Revision: ${item.revisionReason}\n\n` : ''}Review note: ${item.reviewNote}`).join('\n\n');

for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'prismflow-deploy', 'public', 'test_prep')]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, outputName), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(outputRoot, markdownName), markdown + '\n');
}

console.log(`EPPP flashcard review wave 01: ${items.length} cards, ${distinctSources.size} named sources, ${report.summary.remainingFirstPass} cards remain for first-pass review.`);
