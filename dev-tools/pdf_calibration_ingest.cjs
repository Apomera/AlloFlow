#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createEntry, summarizeCorpus } = require('./lib/pdf_calibration.cjs');
const DEFAULT_MANIFEST = path.resolve(__dirname, '../tests/fixtures/pdf_calibration/manifest.json');
const HELP = `Import an observation and optional completed human findings for the same artifact.
  node dev-tools/pdf_calibration_ingest.cjs --observation observation.json --artifact output.pdf [--review findings.json] [--id slug] [--manifest path] [--dry-run]
  node dev-tools/pdf_calibration_ingest.cjs --template
Without --review, the entry remains unreviewed. No expert scores are inferred from validator results.
--template prints a pending review record; complete it only after an actual human review.
`;
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (['--help', '-h', '--dry-run', '--template'].includes(arg)) { out[arg.replace(/^--?/, '')] = true; continue; }
    if (!['--observation', '--artifact', '--review', '--id', '--manifest'].includes(arg)) throw new Error('Unknown option ' + arg + '. Old --expert/--verapdf/--blended score imports are retired; use an observation and explicit human findings.');
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(arg + ' requires a value.');
    out[arg.slice(2)] = argv[++i];
  }
  return out;
}
// Publish only complete JSON. The cooperative lock also fences concurrent imports
// between the final history check and rename; an existing lock is never removed.
function publishManifest(manifestPath, before, next) {
  const lockPath = manifestPath + '.lock';
  const temporary = manifestPath + '.tmp-' + randomUUID();
  let lock;
  try { lock = fs.openSync(lockPath, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('Manifest import is locked: ' + lockPath + '. Retry after the other import finishes; remove a stale lock only after confirming no importer is running.');
    throw error;
  }
  try {
    fs.writeFileSync(temporary, JSON.stringify(next, null, 2) + '\n', { flag: 'wx', mode: 0o600, flush: true });
    if (fs.readFileSync(manifestPath, 'utf8') !== before) throw new Error('Manifest changed during import; retry with the latest version.');
    fs.renameSync(temporary, manifestPath);
  } finally {
    try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    finally { try { fs.closeSync(lock); } finally { fs.unlinkSync(lockPath); } }
  }
}
function main(argv, io = console) {
  const args = parseArgs(argv);
  if (args.help || args.h) { io.log(HELP); return null; }
  if (args.template) { const template = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../tests/fixtures/pdf_calibration/review_template.json'), 'utf8')); io.log(JSON.stringify(template, null, 2)); return template; }
  if (!args.observation || !args.artifact) throw new Error('--observation and --artifact are required.');
  const readJson = filename => JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8').replace(/^\uFEFF/, ''));
  const entry = createEntry(readJson(args.observation), args.review ? readJson(args.review) : null,
    fs.readFileSync(path.resolve(args.artifact)), { id: args.id, sourcePath: path.resolve(args.artifact) });
  const manifestPath = path.resolve(args.manifest || DEFAULT_MANIFEST);
  const before = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(before.replace(/^\uFEFF/, ''));
  if (!Array.isArray(manifest.entries)) throw new Error('Manifest requires an entries array.');
  if (manifest.entries.some(item => item.id === entry.id)) throw new Error('Duplicate id: ' + entry.id + '. Preserve review history by choosing a new artifact/run id.');
  const next = { ...manifest, schemaVersion: 2, entries: [...manifest.entries, entry] };
  const summary = summarizeCorpus(next);
  if (args['dry-run']) { io.log(JSON.stringify({ dryRun: true, entry, coverage: summary.coverage }, null, 2)); return entry; }
  publishManifest(manifestPath, before, next);
  io.log(JSON.stringify({ added: entry.id, evidenceKind: entry.evidenceKind, coverage: summary.coverage }, null, 2));
  return entry;
}
if (require.main === module) { try { main(process.argv.slice(2)); } catch (error) { console.error('ERROR: ' + error.message); process.exitCode = 1; } }
module.exports = { parseArgs, main };
