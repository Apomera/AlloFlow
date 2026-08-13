#!/usr/bin/env node
'use strict';

// Default-deny key discovery before the driver can ever be loaded. Study runs consume only an
// explicit GEMINI_API_KEY in this process; the maintainer convenience file is never consulted.
process.env.ALLOFLOW_MCP_NO_KEY_FILES = '1';

const fs = require('fs');
const path = require('path');
const {
  buildStudyPlan,
  executeStudyPlan,
  providerCapabilityPreflight,
  sanitizeForRecord,
} = require('./study_runner.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function normalizeInputConfig(input, configPath) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Study config must be a JSON object');
  }
  const configDir = path.dirname(configPath);
  if (input.kind === 'alloflow-refinement-development-pilot-manifest') {
    if (!Array.isArray(input.documents) || input.documents.length === 0) {
      throw new Error('Development pilot manifest must contain documents[]');
    }
    return {
      studyId: input.studyId,
      baseDir: REPO_ROOT,
      outputRoot: input.outputRoot,
      protocolPath: 'mcp-testing/refinement-study/protocol-v1.json',
      conditions: input.conditions,
      repetitions: input.repetitions,
      randomizationSeed: input.randomizationSeed || process.env.ALLOFLOW_STUDY_ALLOCATION_SEED,
      options: input.sharedOptions,
      sources: input.documents.map((document) => ({
        id: document.documentId,
        corpusId: document.corpusId,
        path: document.path,
        bytes: document.bytes,
        sha256: document.sha256,
        partition: input.partition,
      })),
    };
  }
  return {
    ...input,
    randomizationSeed: input.randomizationSeed || process.env.ALLOFLOW_STUDY_ALLOCATION_SEED,
    baseDir: input.baseDir ? path.resolve(configDir, input.baseDir) : configDir,
  };
}

function usage() {
  return [
    'AlloFlow refinement study runner',
    '',
    'Plan only (default; zero provider calls):',
    '  node mcp-testing/refinement-study/run.cjs <study.json>',
    '  node mcp-testing/refinement-study/run.cjs <study.json> --plan-out <plan.json>',
    '',
    'Execute a bounded selection:',
    '  node mcp-testing/refinement-study/run.cjs <study.json> --execute',
    '    --confirm <exact-study-id> --max-runs <N> [--only-run <run-id>] [--resume]',
    '',
    'First run the plan command and copy its studyId exactly. --execute alone is refused.',
  ].join('\n');
}

function parseArgs(argv) {
  const out = { execute: false, resume: false, onlyRun: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--execute') out.execute = true;
    else if (arg === '--resume') out.resume = true;
    else if (arg === '--confirm') out.confirm = argv[++i];
    else if (arg === '--max-runs') out.maxRuns = argv[++i];
    else if (arg === '--only-run') out.onlyRun.push(argv[++i]);
    else if (arg === '--plan-out') out.planOut = argv[++i];
    else if (arg.startsWith('-')) throw new Error('Unknown option: ' + arg);
    else if (!out.configPath) out.configPath = arg;
    else throw new Error('Unexpected argument: ' + arg);
  }
  if (out.onlyRun.some((value) => !value)) throw new Error('--only-run requires a run id');
  return out;
}

function printablePlan(plan) {
  return sanitizeForRecord({
    schema: plan.schema,
    kind: plan.kind,
    studyId: plan.studyId,
    planHash: plan.planHash,
    protocol: plan.protocol,
    protocolSha256: plan.protocolSha256,
    generatedAt: plan.generatedAt,
    outputRoot: plan.outputRoot,
    repetitions: plan.repetitions,
    randomizationSeedCommitment: plan.randomizationSeedCommitment,
    blinding: plan.blinding,
    safety: plan.safety,
    sources: plan.sources.map(({ path: _path, ...source }) => source),
    conditions: plan.conditions.map(({ adapter, ...condition }) => ({
      ...condition,
      adapter: adapter && { path: adapter.displayPath, sha256: adapter.sha256 },
    })),
    runs: plan.runs.map((run) => ({
      runId: run.runId,
      blindId: run.blindId,
      sourceId: run.source.id,
      sourceSha256: run.source.sha256,
      condition: run.condition.id,
      repetition: run.repetition,
      status: run.status,
      blockedReason: run.blockedReason,
    })),
    summary: {
      total: plan.runs.length,
      ready: plan.runs.filter((run) => run.status === 'ready').length,
      blocked: plan.runs.filter((run) => run.status === 'blocked').length,
    },
  });
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help || !args.configPath) {
    process.stdout.write(usage() + '\n');
    return args.help ? 0 : 2;
  }
  const configPath = path.resolve(args.configPath);
  const config = normalizeInputConfig(JSON.parse(fs.readFileSync(configPath, 'utf8')), configPath);
  const plan = buildStudyPlan(config);
  const printable = printablePlan(plan);
  if (args.planOut) fs.writeFileSync(path.resolve(args.planOut), JSON.stringify(printable, null, 2) + '\n', 'utf8');
  if (!args.execute) {
    process.stdout.write(JSON.stringify(printable, null, 2) + '\n');
    return 0;
  }
  const preflight = providerCapabilityPreflight();
  if (!preflight.canExecute) throw new Error(
    'No explicit GEMINI_API_KEY is present. This is plan-only; implicit key files are disabled.',
  );
  if (!args.confirm) throw new Error('--execute requires --confirm ' + plan.studyId);
  if (!args.maxRuns) throw new Error('--execute requires an explicit --max-runs N bound');
  const report = await executeStudyPlan(plan, {
    execute: true,
    confirm: args.confirm,
    maxRuns: args.maxRuns,
    onlyRun: args.onlyRun.length ? args.onlyRun : null,
    resume: args.resume,
  });
  process.stdout.write(JSON.stringify(sanitizeForRecord(report), null, 2) + '\n');
  return report.summary.failed ? 1 : 0;
}

if (require.main === module) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stderr.write('refinement study: ' + String(error && error.message || error) + '\n');
    process.exitCode = 1;
  });
}

module.exports = { main, normalizeInputConfig, parseArgs, printablePlan, usage };
