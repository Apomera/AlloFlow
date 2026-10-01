const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const before = require('./before.json');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
for (const file of ['doc_pipeline_module.js', 'desktop/web-app/public/doc_pipeline_module.js', 'app_styles_module.js', 'desktop/web-app/public/app_styles_module.js']) {
  if (sha(fs.readFileSync(path.join(root, file))) !== before.hashes[file]) throw new Error('Destination changed since inspection: ' + file);
}
for (const script of ['dev-tools/_apply_docsuite_theme.cjs', '_build_doc_pipeline_module.js', '_build_app_styles_module.js']) {
  const result = spawnSync(process.execPath, [script], { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 180000 });
  process.stdout.write(result.stdout || '');
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Build failed: ' + script);
}
const block = /<style data-docsuite-theme="v1">\{`[\s\S]*?`\}<\/style>/;
const original = fs.readFileSync(path.join(__dirname, 'before/app_styles_source.jsx'), 'utf8');
const current = fs.readFileSync(path.join(root, 'app_styles_source.jsx'), 'utf8');
if (original.replace(block, '') !== current.replace(block, '')) throw new Error('Changes outside generated style block need review.');
console.log('Only the generated theme block changed in AppStyles.');
