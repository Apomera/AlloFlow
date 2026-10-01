const fs = require('fs');
const crypto = require('crypto');
const diff = require('diff');
const parser = require('@babel/parser');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const source = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const from = source.indexOf('  const buildCanvasWorkspaceSnapshot = async ');
const anchor = source.indexOf('      if (existing?.assetPolicy ===', from);
const end = source.indexOf('      return sessionSafeSnapshot;', anchor);
if (from < 0 || anchor <= from || end <= anchor) throw Error('Missing media snapshot boundary');
const old = source.slice(anchor, end);
if (!old.includes('explicitRemoval') || !old.includes('device-quota')) throw Error('Unexpected current media policy');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
const replacement = [
  "      if (existing?.assetPolicy === 'text-only'",
  "          && existing.omittedAssetManifest?.some(item => item?.reason === 'user-remove-media')) {",
  "          return ALLO_WORKSPACE_RECOVERY.stripLargeAssets(sessionSafeSnapshot, 'user-remove-media');",
  '      }',
  '',
].join(newline);
const candidate = source.slice(0, anchor) + replacement + source.slice(end);
const patch = diff.createPatch('AlloFlowANTI.txt', source, candidate, 'current held host', 'review-only media preservation');
if (diff.applyPatch(source, patch) !== candidate) throw Error('Proposal apply mismatch');
parser.parse(candidate, { sourceType: 'module', plugins: ['jsx'] });
if (fs.readFileSync('AlloFlowANTI.txt', 'utf8') !== source) throw Error('Host changed during proposal generation');
fs.writeFileSync('reports/report-fixes-2026-09-30/storage-media-host-proposal.patch', patch);
const proof = {
  status: 'Review-only proposal; actual host untouched',
  hostBeforeSha256: hash(source), proposalSha256: hash(patch),
  candidateSha256: hash(candidate), inMemoryApplyPassed: true, jsxSyntaxPassed: true, hostUnchanged: true,
  problem: 'A session-only blob omission marks the prior snapshot text-only; later host save strips valid data-URI supports and records device-quota despite no quota failure.',
  behavior: 'Only explicit user media removal persists as a host stripping policy. Subsequent saves attempt valid media; real quota failures still use the existing saveWithQuotaFallback ladder.',
};
fs.writeFileSync('reports/report-fixes-2026-09-30/recovery-followup.media-validation.json', JSON.stringify(proof, null, 2) + '\n');
process.stdout.write(JSON.stringify(proof) + '\n');
