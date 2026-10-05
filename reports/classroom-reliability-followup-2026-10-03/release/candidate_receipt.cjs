#!/usr/bin/env node
'use strict';

// Report-local evidence helper. Reads selected inputs and Git HEAD only.
// It never invokes a test, build, application, network request or Git mutation.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const LIMITS = Object.freeze([
  'Selected hashes identify working bytes; HEAD alone does not identify this dirty candidate.',
  'Capture/compare does not run tests or establish current CI, deployment, device storage, student delivery or accessibility acceptance.',
  'Byte parity is limited to the explicitly declared pairs; loader-pin and generated-source correctness require their existing verifiers.',
  'A later input change invalidates earlier selected-candidate results and requires another capture and validation.'
]);

function relativeInput(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || path.isAbsolute(value)
      || value.split('/').some(part => !part || part === '.' || part === '..')
      || /[:\0\r\n]/.test(value)) throw Error('Expected a workspace-relative path using forward slashes: ' + value);
  return value;
}

function normalizeSpec(spec) {
  if (!spec || spec.schemaVersion !== 1 || !Array.isArray(spec.inputs) || !spec.inputs.length)
    throw Error('Expected schemaVersion 1 and a nonempty explicit inputs list.');
  const inputs = [...new Set(spec.inputs.map(relativeInput))].sort();
  const pairs = (spec.parityPairs || []).map(pair => {
    if (!Array.isArray(pair) || pair.length !== 2) throw Error('Each parity pair must name two selected inputs.');
    const normalized = pair.map(relativeInput);
    if (normalized.some(file => !inputs.includes(file))) throw Error('Every parity input must also appear in inputs.');
    return normalized;
  });
  return { schemaVersion: 1, scope: String(spec.scope || 'selected-classroom-candidate'), inputs, parityPairs: pairs };
}

function gitHead(root) {
  return execFileSync('git', ['--no-optional-locks', 'rev-parse', 'HEAD'], {
    cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function capture(spec, options = {}) {
  const normalized = normalizeSpec(spec), root = path.resolve(options.root || ROOT);
  const read = options.read || (file => fs.readFileSync(path.join(root, file)));
  const head = options.readHead || (() => gitHead(root));
  const files = {}, errors = [], changedDuringCapture = [];
  let startHead = null, endHead = null;
  try { startHead = head(); } catch (_) { errors.push({ code: 'head-unavailable' }); }
  for (const file of normalized.inputs) {
    try {
      const bytes = Buffer.from(read(file));
      files[file] = { bytes: bytes.length, sha256: hash(bytes) };
    } catch (cause) {
      files[file] = { missing: true, code: cause.code || 'unreadable' };
      errors.push({ code: 'input-unavailable', file });
    }
  }
  const parity = normalized.parityPairs.map(([canonical, mirror]) => {
    const a = files[canonical], b = files[mirror];
    return { canonical, mirror, match: !!(a.sha256 && a.sha256 === b.sha256 && a.bytes === b.bytes) };
  });
  for (const file of normalized.inputs) {
    let current;
    try { const bytes = Buffer.from(read(file)); current = { bytes: bytes.length, sha256: hash(bytes) }; }
    catch (cause) { current = { missing: true, code: cause.code || 'unreadable' }; }
    if (JSON.stringify(current) !== JSON.stringify(files[file])) changedDuringCapture.push(file);
  }
  if (changedDuringCapture.length) errors.push({ code: 'inputs-changed-during-capture', files: changedDuringCapture });
  try { endHead = head(); } catch (_) { errors.push({ code: 'head-unavailable' }); }
  if (startHead !== endHead) errors.push({ code: 'head-changed-during-capture' });
  const specSha256 = hash(JSON.stringify(normalized));
  const candidateSha256 = hash(JSON.stringify({ specSha256, head: startHead, files }));
  return {
    schemaVersion: 1, kind: 'selected-candidate-capture', at: new Date().toISOString(), root,
    spec: normalized, specSha256, candidateSha256, startHead, endHead, files, parity,
    stableCapture: errors.length === 0, declaredParityMatches: parity.every(pair => pair.match),
    changedDuringCapture, errors, currentCI: { status: 'unverified', reason: 'This helper does not obtain or run CI.' },
    limits: LIMITS
  };
}

function compare(baseline, options = {}) {
  if (!baseline || baseline.schemaVersion !== 1 || baseline.kind !== 'selected-candidate-capture'
      || baseline.stableCapture !== true || baseline.errors?.length
      || baseline.startHead !== baseline.endHead || !/^[a-f0-9]{40}$/.test(baseline.startHead || ''))
    throw Error('Expected an unchanged successful capture baseline.');
  const spec = normalizeSpec(baseline.spec);
  if (baseline.specSha256 !== hash(JSON.stringify(spec))) throw Error('Baseline scope fingerprint is invalid.');
  const root = path.resolve(options.root || ROOT);
  if (baseline.root !== root) throw Error('Baseline belongs to a different workspace.');
  for (const file of spec.inputs) {
    const item = baseline.files?.[file];
    if (!item || !/^[a-f0-9]{64}$/.test(item.sha256 || '') || !Number.isSafeInteger(item.bytes) || item.bytes < 0)
      throw Error('Baseline has an invalid file fingerprint: ' + file);
  }
  if (baseline.candidateSha256 !== hash(JSON.stringify({ specSha256: baseline.specSha256, head: baseline.startHead, files: baseline.files })))
    throw Error('Baseline candidate fingerprint is invalid.');
  const current = capture(spec, { ...options, root });
  const changedInputs = spec.inputs.filter(file => {
    const a = baseline.files[file], b = current.files[file];
    return a.sha256 !== b.sha256 || a.bytes !== b.bytes;
  });
  const headUnchanged = baseline.startHead === current.startHead && baseline.endHead === current.endHead;
  return {
    schemaVersion: 1, kind: 'selected-candidate-comparison', at: current.at, root,
    baselineAt: baseline.at, baselineHead: baseline.startHead, currentHead: current.endHead,
    baselineSha256: hash(JSON.stringify(baseline)), specSha256: baseline.specSha256,
    baselineCandidateSha256: baseline.candidateSha256, currentCandidateSha256: current.candidateSha256,
    inputCount: spec.inputs.length, headUnchanged, changedInputs, current,
    unchanged: headUnchanged && changedInputs.length === 0 && current.stableCapture,
    currentCI: current.currentCI, limits: LIMITS
  };
}

function parseArgs(args) {
  const mode = args.shift(), parsed = { mode };
  if (!['capture', 'compare'].includes(mode)) throw Error('Expected capture or compare.');
  while (args.length) {
    const key = args.shift();
    if (!['--spec', '--baseline', '--output'].includes(key) || !args.length || parsed[key.slice(2)])
      throw Error('Usage: capture --spec JSON --output JSON; compare --baseline JSON --output JSON');
    parsed[key.slice(2)] = args.shift();
  }
  if (!parsed.output || (mode === 'capture' ? !parsed.spec || parsed.baseline : !parsed.baseline || parsed.spec))
    throw Error('Usage: capture --spec JSON --output JSON; compare --baseline JSON --output JSON');
  return parsed;
}

function writeReport(target, report, protectedInputs) {
  const output = path.resolve(target), relative = path.relative(__dirname, output);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || path.extname(output) !== '.json')
    throw Error('Output must be a JSON file inside this release report directory.');
  if (protectedInputs.some(file => path.resolve(ROOT, file) === output)) throw Error('Refusing to overwrite a selected input.');
  const directory = fs.realpathSync(path.dirname(output)), reportRoot = fs.realpathSync(__dirname);
  const actualRelative = path.relative(reportRoot, directory);
  if (actualRelative.startsWith('..') || path.isAbsolute(actualRelative)) throw Error('Output directory resolves outside the release report directory.');
  if (fs.existsSync(output)) throw Error('Output already exists; use a fresh report filename.');
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const input = path.resolve(options.spec || options.baseline);
    const source = fs.readFileSync(input), parsed = JSON.parse(source.toString('utf8').replace(/^\uFEFF/, ''));
    const report = options.mode === 'capture' ? capture(parsed) : compare(parsed);
    if (!fs.readFileSync(input).equals(source)) throw Error('Scope/baseline file changed during capture.');
    const selected = (report.spec || report.current.spec).inputs;
    if (selected.some(file => path.resolve(ROOT, file) === path.resolve(options.output)) || input === path.resolve(options.output))
      throw Error('Refusing to overwrite a scope/baseline/input file.');
    writeReport(options.output, report, selected);
    console.log(JSON.stringify({ output: path.resolve(options.output), stable: report.stableCapture ?? report.unchanged,
      candidateSha256: report.candidateSha256 ?? report.currentCandidateSha256,
      declaredParityMatches: report.declaredParityMatches ?? report.current.declaredParityMatches,
      currentCI: 'unverified', changedInputs: report.changedInputs || report.changedDuringCapture }));
    if (!(report.stableCapture ?? report.unchanged) || !(report.declaredParityMatches ?? report.current.declaredParityMatches)) process.exitCode = 1;
  } catch (cause) { console.error(cause.message); process.exitCode = 2; }
}

module.exports = { ROOT, relativeInput, normalizeSpec, capture, compare, parseArgs };
