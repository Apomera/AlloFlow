const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '../..');
const checks = [];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
for (const name of ['doc_pipeline_module.js', 'view_pdf_audit_module.js', 'misc_handlers_module.js']) {
  const source = fs.readFileSync(path.join(root, name));
  const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public', name));
  if (!source.equals(mirror)) throw new Error('Bundle mirror differs: ' + name);
  new Function(source.toString('utf8'));
  checks.push({ file: name, mirrorMatches: true, syntax: 'passed', sha256: sha256(source) });
}
for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  esbuild.transformSync(source, { loader: 'jsx', format: 'esm', target: 'es2020', logLevel: 'silent' });
  if (!source.includes('candidateRejectionCount: Math.max(0, Number(cur.candidateRejectionCount) || 0)')) throw new Error('Missing host projection: ' + file);
  checks.push({ file, syntax: 'passed', rejectionProjection: true });
}
const output = { verifiedAt: new Date().toISOString(), checks };
fs.writeFileSync(path.join(__dirname, 'workspace-verification.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output));
