// Narrow Evolution integration. prepare writes only this report directory.
// apply accepts one prepared manifest and refuses any newer source or mirror bytes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const reportRoot = __dirname;
const repositoryRoot = path.resolve(reportRoot, '../../..');
const ownedPaths = ['stem_lab/stem_tool_evolab.js', 'desktop/web-app/public/stem_lab/stem_tool_evolab.js'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const count = (text, needle) => text.split(needle).length - 1;
const changes = [
  {
    purpose: 'Withhold the full outcome report during the parents/survivors stages of a new walkthrough; retain ordinary historical playback.',
    before: '})), briefing ? h(IslandFieldReport,',
    after: "})), (!watching || phase === 'offspring') && (briefing ? h(IslandFieldReport,"
  },
  {
    purpose: 'Keep the fallback summary inside that same disclosure boundary.',
    before: "h('small', null, s[1])); }))),",
    after: "h('small', null, s[1])); })))),"
  },
  {
    purpose: 'Use existing registered extinction/generation-limit review guidance beside disabled habitat controls.',
    before: "h('p', { className: 'ei-small' }, tx('hint_' + shownHabitat, env.hint)),",
    after: "h('p', { className: 'ei-small' }, ended ? (extinct ? tx('extinction', 'Your population went extinct. This is evidence to investigate, not a failed score. Rewind the timeline and inspect the last breeding generation.') : tx('finished', '60 generations recorded. Your expedition is complete: explore the timeline, export your data, and explain what changed.')) : tx('hint_' + shownHabitat, env.hint)),"
  }
];

function eol(bytes) {
  const text = bytes.toString('utf8');
  const crlf = (text.match(/\r\n/g) || []).length;
  return {
    crlf, loneLf: (text.match(/\n/g) || []).length - crlf,
    loneCr: (text.match(/\r/g) || []).length - crlf,
    utf8Bom: bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
    finalNewline: /[\r\n]$/.test(text)
  };
}
function validateSyntax(bytes, filename) {
  new vm.Script(bytes.toString('utf8'), { filename });
  return { parser: 'node:vm.Script', executed: false, passed: true };
}
function transform(bytes) {
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) throw new Error('Source is not lossless UTF-8');
  const anchorChecks = changes.map(change => ({ purpose: change.purpose, beforeCount: count(text, change.before), afterCount: count(text, change.after) }));
  if (anchorChecks.some(check => check.beforeCount !== 1 || check.afterCount !== 0)) throw new Error('Three original anchors must occur once each; replacements must be absent: ' + JSON.stringify(anchorChecks));
  let next = text;
  for (const change of changes) next = next.replace(change.before, change.after);
  let reversed = next;
  for (const change of changes.slice().reverse()) {
    if (count(reversed, change.after) !== 1) throw new Error('Replacement reverse anchor is not unique');
    reversed = reversed.replace(change.after, change.before);
  }
  if (reversed !== text || !Buffer.from(reversed).equals(bytes)) throw new Error('Reverse-byte guard failed');
  const candidate = Buffer.from(next, 'utf8');
  if (JSON.stringify(eol(candidate)) !== JSON.stringify(eol(bytes))) throw new Error('EOL/BOM/final-newline guard failed');
  return { candidate, anchorChecks, reverseExact: true, eol: eol(bytes) };
}
function sourcePatch(before, after, relativePath) {
  const original = before.toString('utf8').split(/\r\n|\n|\r/);
  const result = after.toString('utf8').split(/\r\n|\n|\r/);
  if (original.length !== result.length) throw new Error('Surgical patch must retain line count');
  const indices = original.flatMap((line, i) => line === result[i] ? [] : [i]);
  if (indices.length !== 3) throw new Error('Expected exactly three changed lines');
  const regions = [];
  for (const index of indices) {
    const start = Math.max(0, index - 3), end = Math.min(original.length, index + 4);
    const previous = regions[regions.length - 1];
    if (previous && start <= previous.end) previous.end = Math.max(previous.end, end);
    else regions.push({ start, end });
  }
  let patch = '--- a/' + relativePath + '\n+++ b/' + relativePath + '\n';
  for (const region of regions) {
    const length = region.end - region.start;
    patch += '@@ -' + (region.start + 1) + ',' + length + ' +' + (region.start + 1) + ',' + length + ' @@\n';
    for (let i = region.start; i < region.end; i++) patch += original[i] === result[i] ? ' ' + original[i] + '\n' : '-' + original[i] + '\n+' + result[i] + '\n';
  }
  return patch;
}
function writeJson(filename, value) { fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n'); }
function insideReport(filename) {
  const relative = path.relative(reportRoot, filename);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Manifest/candidate must stay inside the owned report directory');
}
function prepare() {
  const before = ownedPaths.map(relative => fs.readFileSync(path.join(repositoryRoot, relative)));
  if (!before[0].equals(before[1])) throw new Error('Fresh canonical/public bytes do not match; preserve both and reconcile ownership first');
  const result = transform(before[0]);
  const syntax = validateSyntax(result.candidate, 'prepared-current-evolution.candidate.js');
  const stamp = new Date().toISOString().replace(/[-:.]/g, '');
  const directory = path.join(reportRoot, 'integration-prepared', stamp);
  fs.mkdirSync(directory, { recursive: true });
  const candidatePath = path.join(directory, 'stem_tool_evolab.current.candidate.js');
  fs.writeFileSync(candidatePath, result.candidate);
  const sources = ownedPaths.map((relative, i) => {
    const snapshotPath = path.join(directory, i === 0 ? 'canonical.before.js' : 'public.before.js');
    fs.writeFileSync(snapshotPath, before[i]);
    return { path: relative, snapshotPath, beforeSha256: hash(before[i]), candidateSha256: hash(result.candidate), bytesBefore: before[i].length, bytesAfter: result.candidate.length, eol: eol(before[i]) };
  });
  const patchPath = path.join(directory, 'evolution-reveal.patch');
  fs.writeFileSync(patchPath, ownedPaths.map(relative => sourcePatch(before[0], result.candidate, relative)).join('\n'));
  const manifestPath = path.join(directory, 'manifest.json');
  const manifest = {
    kind: 'evolution-reveal-integration', preparedUtc: new Date().toISOString(), repositoryRoot,
    sources, candidatePath, patchPath, changes, anchorChecks: result.anchorChecks,
    reverseExact: result.reverseExact, syntax,
    preservedScope: 'Exactly three substitutions on the fresh canonical/public pair; no ignored build copies, hosts, pins, shared registries, tests, commits or deployments.',
    productionApplied: false, candidateTested: false
  };
  writeJson(manifestPath, manifest);
  process.stdout.write(JSON.stringify({ mode: 'prepare', manifestPath, candidatePath, patchPath, sourceSha256: hash(before[0]), candidateSha256: hash(result.candidate), eol: result.eol, anchors: result.anchorChecks, reverseExact: true, syntax, productionApplied: false }, null, 2) + '\n');
}
function apply(manifestArgument) {
  if (!manifestArgument) throw new Error('apply requires the exact prepared manifest path');
  const manifestPath = path.resolve(manifestArgument); insideReport(manifestPath);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.kind !== 'evolution-reveal-integration' || manifest.repositoryRoot !== repositoryRoot || JSON.stringify(manifest.sources.map(source => source.path)) !== JSON.stringify(ownedPaths) || JSON.stringify(manifest.changes) !== JSON.stringify(changes)) throw new Error('Manifest identity/scope guard failed');
  insideReport(manifest.candidatePath);
  const candidate = fs.readFileSync(manifest.candidatePath);
  if (manifest.sources.some(source => source.candidateSha256 !== hash(candidate))) throw new Error('Candidate hash does not match prepared evidence');
  const syntax = validateSyntax(candidate, manifest.candidatePath);
  const current = ownedPaths.map(relative => fs.readFileSync(path.join(repositoryRoot, relative)));
  if (current.every(bytes => bytes.equals(candidate))) {
    process.stdout.write(JSON.stringify({ mode: 'apply', alreadyApplied: true, finalSha256: hash(candidate), manifestPath }) + '\n');
    return;
  }
  for (let i = 0; i < current.length; i++) {
    const source = manifest.sources[i]; insideReport(source.snapshotPath);
    const snapshot = fs.readFileSync(source.snapshotPath);
    if (hash(snapshot) !== source.beforeSha256 || !current[i].equals(snapshot)) throw new Error('Fresh byte guard failed for ' + source.path + '; rerun prepare after coordinating newer work');
    const computed = transform(current[i]);
    if (!computed.candidate.equals(candidate)) throw new Error('Prepared candidate is not exactly the three transformations');
  }
  // Recheck the complete pair immediately before the first mutation.
  for (let i = 0; i < current.length; i++) if (!fs.readFileSync(path.join(repositoryRoot, ownedPaths[i])).equals(current[i])) throw new Error('Source changed during preflight');
  const changed = [];
  for (let i = 0; i < ownedPaths.length; i++) {
    const target = path.join(repositoryRoot, ownedPaths[i]);
    if (!fs.readFileSync(target).equals(current[i])) throw new Error('Source changed immediately before write: ' + ownedPaths[i]);
    fs.writeFileSync(target, candidate);
    changed.push(ownedPaths[i]);
    if (!fs.readFileSync(target).equals(candidate)) throw new Error('Post-write byte verification failed: ' + ownedPaths[i]);
  }
  const final = ownedPaths.map(relative => fs.readFileSync(path.join(repositoryRoot, relative)));
  if (final.some(bytes => !bytes.equals(candidate))) throw new Error('Final canonical/public parity failed');
  const receipt = { appliedUtc: new Date().toISOString(), manifestPath, changed, finalSha256: hash(candidate), reverseExact: true, syntax, eol: eol(candidate), testsRun: false, ignoredBuildsEdited: false, hostsPinsOrRegistriesEdited: false };
  const receiptPath = path.join(path.dirname(manifestPath), 'apply-receipt.json');
  writeJson(receiptPath, receipt);
  process.stdout.write(JSON.stringify({ mode: 'apply', receiptPath, ...receipt }, null, 2) + '\n');
}

const mode = process.argv[2];
if (mode === 'prepare') prepare();
else if (mode === 'apply') apply(process.argv[3]);
else throw new Error('Usage: node integrate-evolution-reveal-2026-10-03.cjs prepare | apply <prepared-manifest.json>');
