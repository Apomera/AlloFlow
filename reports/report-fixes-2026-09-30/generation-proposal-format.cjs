const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const diff = require('diff');
const babel = require('@babel/parser');

const reportDir = path.join('reports', 'report-fixes-2026-09-30');
const patchFile = path.join(reportDir, 'generation-host-proposal.patch');
const notesFile = path.join(reportDir, 'generation-host-proposal-notes.md');
const proposal = fs.readFileSync(patchFile, 'utf8');
const hostFile = 'AlloFlowANTI.txt';
const host = fs.readFileSync(hostFile, 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const newline = host.includes('\r\n') ? '\r\n' : '\n';
let candidate = host;
let notes = '';

if (proposal.startsWith('*** Begin Patch')) {
  const normalized = proposal.replace(/\r\n/g, '\n');
  const end = normalized.indexOf('*** End Patch');
  if (end < 0) throw new Error('Custom proposal end marker missing');
  notes = normalized.slice(end + '*** End Patch'.length).trim();
  const lines = normalized.slice(0, end).split('\n');
  const hunks = [];
  let hunk = null;
  for (const line of lines) {
    if (line === '@@') { hunk = []; hunks.push(hunk); continue; }
    if (line.startsWith('***')) continue;
    if (hunk && line) hunk.push(line);
  }
  if (hunks.length !== 4) throw new Error('Expected exactly four reviewed proposal hunks');
  for (const hunkLines of hunks) {
    const oldText = hunkLines.filter(line => !line.startsWith('+')).map(line => line.slice(1)).join(newline);
    const newText = hunkLines.filter(line => !line.startsWith('-')).map(line => line.slice(1)).join(newline);
    let start = 0, end = candidate.length;
    if (oldText.includes('viewOwner') || oldText.includes('generationDepsOverride')) {
      start = candidate.indexOf('  const _alloRunGenerate = async');
      end = candidate.indexOf('  // Generation reaches these helpers synchronously;', start);
      if (start < 0 || end < start) throw new Error('Unique generation shim boundaries missing');
    }
    const scope = candidate.slice(start, end);
    if (scope.split(oldText).length !== 2) throw new Error('Proposal anchor is not unique in its assigned scope: ' + oldText.slice(0, 100));
    candidate = candidate.slice(0, start) + scope.replace(oldText, newText) + candidate.slice(end);
  }
} else {
  candidate = diff.applyPatch(host, proposal);
  if (candidate === false) throw new Error('Existing unified proposal does not apply to current held host');
  notes = fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8') : '';
}

babel.parse(candidate, { sourceType: 'module', plugins: ['jsx'] });
const unified = diff.createTwoFilesPatch('a/AlloFlowANTI.txt', 'b/AlloFlowANTI.txt', host, candidate, '', '', { context: 5 });
const parsed = diff.parsePatch(unified, { strict: true });
if (parsed.length !== 1 || parsed[0].oldFileName !== 'a/AlloFlowANTI.txt') throw new Error('Unified proposal headers are invalid');
if (diff.applyPatch(host, unified) !== candidate) throw new Error('Unified proposal round-trip failed');
if (hash(fs.readFileSync(hostFile, 'utf8')) !== hash(host)) throw new Error('Shared host changed during proposal validation');
fs.writeFileSync(patchFile, unified);
fs.writeFileSync(notesFile, '# Proposed generation host integration\n\n' + notes + '\n');
const evidence = { verifiedAt: new Date().toISOString(), format: 'unified-diff', hostFile,
  oldFileName: parsed[0].oldFileName, newFileName: parsed[0].newFileName,
  hunks: parsed[0].hunks.length, uniquelyScopedAnchors: true,
  candidateBabelSyntax: 'passed', inMemoryApplicability: 'passed',
  hostHashBefore: hash(host), hostHashAfter: hash(fs.readFileSync(hostFile, 'utf8')),
  candidateHash: hash(candidate), hostUnchanged: true, appliedToWorkingHost: false,
  pending: ['Shared host ownership clarification', 'Host lifecycle and keyboard/reflow/focus tests', 'Ordinary Cancel UI integration'] };
fs.writeFileSync(path.join(reportDir, 'generation-host-proposal-validation.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence));
