#!/usr/bin/env node
'use strict';
// Evaluates the production annotation generator against public-domain text.
// No credentials or learner data are read from application storage.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const fixture = require('./macbeth-act1-scene1.fixture.json');
const contract = require(path.join(ROOT, 'instructional_context_module.js'));
const pilot = require(path.join(ROOT, 'dev-tools/run_text_complexity_live_pilot.cjs'));
const sha256 = text => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

function loadProductionGenerator() {
  const source = fs.readFileSync(path.join(ROOT, 'generate_dispatcher_source.jsx'), 'utf8');
  const end = source.indexOf('const handleGenerate =');
  if (end < 0) throw new Error('production-generator-unavailable');
  const sandbox = { window: { AlloModules: { InstructionalContext: contract } }, Intl, console, Date, setTimeout, clearTimeout };
  vm.runInNewContext(source.slice(0, end) + '\nglobalThis.generate = generateReadingSupports;', sandbox);
  return sandbox.generate;
}
function buildCases() {
  const variant = fixture.variants[0];
  return [
    { id: 'canonical-grade-5', text: fixture.text, sha256: fixture.sha256, grade: '5th Grade', spelling: 'Graymalkin' },
    { id: 'canonical-grade-8', text: fixture.text, sha256: fixture.sha256, grade: '8th Grade', spelling: 'Graymalkin' },
    { id: 'grimalkin-variant-grade-8', text: variant.text, sha256: variant.sha256, grade: '8th Grade', spelling: 'Grimalkin', derivedVariant: true }
  ];
}
function evaluateResult(testCase, snapshot, before, result) {
  const validated = contract.validateReadingSupports(snapshot, result);
  const annotations = validated.annotations || [];
  const checks = {
    sourceSnapshotUnchanged: JSON.stringify(snapshot) === before,
    sourceBytesMatchFixture: sha256(snapshot.text) === testCase.sha256,
    exactAnchors: annotations.length === (result.annotations || []).length &&
      annotations.every(a => snapshot.text.slice(a.start, a.end) === a.quote),
    generatedMetadata: annotations.every(a => a.origin === 'generated' && a.pinned === false &&
      ['essential', 'helpful'].includes(a.priority)),
    completeCoverage: result.status === 'complete' && (result.skippedRanges || []).length === 0,
    verseAndSpeakersIntact: snapshot.text.split('\n').every((line, index) => line === testCase.text.split('\n')[index]) &&
      snapshot.text.split('\n').length === testCase.text.split('\n').length
  };
  const targetChecks = fixture.terms.map(term => {
    const quote = term.id === 'grimalkin' ? testCase.spelling : term.quote;
    const start = testCase.text.indexOf(quote), end = start + quote.length;
    const found = annotations.find(a => a.start <= start && a.end >= end);
    const text = found ? found.text : '';
    const meaningSignals = term.meaningAllOf.every(pattern => new RegExp(pattern, 'i').test(text));
    const misleadingSense = term.rejectAny.some(pattern => new RegExp(pattern, 'i').test(text));
    return { id: term.id, quote, covered: !!found, gloss: text || null, priority: found?.priority || null,
      heuristicMeaningSignals: meaningSignals, misleadingSenseFlag: misleadingSense,
      heuristicPass: !!found && meaningSignals && !misleadingSense };
  });
  return { structuralChecks: checks, structuralPass: Object.values(checks).every(Boolean), targetChecks,
    heuristicRequirementsMet: targetChecks.every(term => term.heuristicPass),
    humanReview: 'pending', reviewCriteria: fixture.reviewCriteria };
}
async function prepareCases(generate = loadProductionGenerator()) {
  const cases = [];
  for (const testCase of buildCases()) {
    const snapshot = contract.createSourceSnapshot(testCase.text, { language: 'English', sourceArtifactId: testCase.id });
    const prompts = [];
    // This stub records production prompts only. It is not a model-quality result.
    await generate(snapshot, { contextModule: contract, gradeLevel: testCase.grade, language: 'English',
      callGemini: async prompt => { prompts.push(prompt); return JSON.stringify({ sourceFingerprint: snapshot.fingerprint, annotations: [] }); } });
    cases.push({ ...testCase, sourceFingerprint: snapshot.fingerprint, prompts, status: 'not-run', humanReview: 'pending' });
  }
  return cases;
}
async function run(args = process.argv.slice(2), env = process.env) {
  const defaults = ['--grades', '5th Grade,8th Grade,8th Grade', '--max-calls', '3',
    '--max-http-attempts', '3', '--max-retries', '1', '--max-tokens', '1200', '--timeout-ms', '60000'];
  let config = pilot.parseArgs(args.concat(defaults));
  config.maxCalls = Math.min(3, config.maxCalls);
  config.maxRetries = 1;
  config.maxHttpAttempts = 3;
  const options = [config];
  // Only the adapter's documented environment configuration is checked.
  // No browser storage, configuration files, keychains, or endpoints are searched.
  if (!args.some(arg => arg === '--backend' || arg.startsWith('--backend=')) && !env.ALLOFLOW_PILOT_BACKEND && !env.ALLOFLOW_PILOT_MODEL && !args.some(arg => arg === '--model' || arg.startsWith('--model='))) {
    for (const backend of ['gemini', 'openai', 'claude']) {
      if (backend !== config.backend) options.push(pilot.parseArgs(['--backend', backend].concat(defaults)));
    }
  }
  const readinessChecks = options.map(option => ({ backend: option.backend, ...pilot.providerReadiness(option, env) }));
  const readyIndex = readinessChecks.findIndex(check => check.ready);
  if (readyIndex >= 0 && !pilot.providerReadiness(config, env).ready) {
    const { execute, output, maxCalls } = config;
    config = { ...options[readyIndex], execute, output, maxCalls, maxRetries: 1, maxHttpAttempts: Math.min(3, maxCalls) };
  }
  const readiness = pilot.providerReadiness(config, env);
  const generate = loadProductionGenerator();
  const report = {
    schemaVersion: 1, createdAt: new Date().toISOString(), fixtureId: fixture.id,
    mode: config.execute ? 'live-requested' : 'dry-run', status: config.execute && !readiness.ready ? 'blocked' : 'prepared',
    provider: { backend: config.backend, requestedModel: config.model }, readiness, readinessChecks,
    publicDomainOnly: true, budget: { maximumLogicalCalls: config.maxCalls, maximumHttpAttempts: config.maxCalls, usedLogicalCalls: 0, usedHttpAttempts: 0 },
    productionSourceSha256: sha256(fs.readFileSync(path.join(ROOT, 'generate_dispatcher_source.jsx'), 'utf8')),
    cases: await prepareCases(generate),
    limitations: [
      'Dry-run prompt capture and automated test doubles do not assess live model quality.',
      'Meaning-pattern checks are warning signals, not a semantic correctness judge; a human must review all generated glosses.',
      'This small literary sample does not establish classroom effectiveness or performance on other texts or languages.',
      'CLI transport reuses the existing provider adapter in text mode with the production JSON instructions; app JSON-mode transport can differ.'
    ]
  };
  if (config.execute && readiness.ready) {
    const telemetry = [], httpBudget = { used: 0, maximum: config.maxCalls };
    const provider = pilot.createProviderGenerator(config, telemetry, env, httpBudget);
    for (const item of report.cases.slice(0, config.maxCalls)) {
      const snapshot = contract.createSourceSnapshot(item.text, { language: 'English', sourceArtifactId: item.id });
      const before = JSON.stringify(snapshot);
      item.responses = [];
      try {
        const result = await generate(snapshot, {
          contextModule: contract, gradeLevel: item.grade, language: 'English',
          callGemini: async prompt => {
            if (report.budget.usedLogicalCalls >= config.maxCalls) throw new Error('call-budget-exhausted');
            report.budget.usedLogicalCalls++;
            try {
              const response = await provider({ prompt });
              item.responses.push({ text: response.text, requestedModel: response.requestedModel || config.model, servedModel: response.servedModel || null });
              return response.text;
            } catch (error) {
              item.failure = /^[a-z-]{1,80}$/.test(error?.code || '') ? error.code : 'provider-transport-failure';
              throw error;
            }
          }
        });
        item.annotations = result.annotations;
        item.coverage = { status: result.status, coveredRanges: result.coveredRanges, skippedRanges: result.skippedRanges, rejectedCount: result.rejectedCount };
        item.evaluation = evaluateResult(item, snapshot, before, result);
        item.status = item.responses.length ? 'received-awaiting-human-review' : 'provider-failed';
      } catch (_) { item.status = 'failed'; item.failure = item.failure || 'evaluation-failure'; }
    }
    report.budget.usedHttpAttempts = httpBudget.used;
    report.status = report.cases.every(item => item.status === 'received-awaiting-human-review') ? 'awaiting-human-review' : 'partial';
  }
  const output = path.resolve(config.output || path.join(__dirname, config.execute ? 'live-evaluation.json' : 'prepared-evaluation.json'));
  const relative = path.relative(__dirname, output);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('output-outside-evaluation-directory');
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  return report;
}
module.exports = { loadProductionGenerator, buildCases, evaluateResult, prepareCases, run, fixture };
if (require.main === module) run().then(report => {
  console.log(JSON.stringify({ status: report.status, mode: report.mode, cases: report.cases.length, readiness: report.readiness, budget: report.budget }));
  if (report.status === 'blocked') process.exitCode = 2;
}).catch(() => { console.error('Gloss evaluation failed. No credentials are logged.'); process.exitCode = 1; });
