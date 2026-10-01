const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const files = [
  'dev-tools/build_document_at_fixture_suite.cjs',
  'doc_pipeline_source.jsx', 'doc_pipeline_module.js', 'desktop/web-app/public/doc_pipeline_module.js',
  'app_styles_source.jsx', 'app_styles_module.js', 'desktop/web-app/public/app_styles_module.js',
  'tests/export_quiz_html_worksheet_parity.test.js', 'tests/e2e/document_export_at_acceptance.spec.ts',
  'dev-tools/remediation_validation.json',
];
const before = path.join(__dirname, 'before');
if (fs.existsSync(before)) throw new Error('Before-images already exist.');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const hashes = {};
for (const file of files) {
  const bytes = fs.readFileSync(path.join(root, file));
  const dest = path.join(before, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
  hashes[file] = sha(bytes);
}
const { wrapSimpleIife } = require(path.join(root, '_build_simple_iife_module.js'));
const pipelineExpected = wrapSimpleIife({ source: fs.readFileSync(path.join(root, 'doc_pipeline_source.jsx'), 'utf8'), guardKey: 'DocPipelineModule', footer: fs.readFileSync(path.join(root, 'remediation_review_helpers.js'), 'utf8') });
const { buildAppStylesModule } = require(path.join(root, '_build_app_styles_module.js'));
const stylesExpected = buildAppStylesModule(fs.readFileSync(path.join(root, 'app_styles_source.jsx'), 'utf8'));
const result = { at: new Date().toISOString(), hashes, parity: {
  pipelineBuiltFromSource: sha(pipelineExpected) === hashes['doc_pipeline_module.js'],
  pipelinePublicMatches: hashes['doc_pipeline_module.js'] === hashes['desktop/web-app/public/doc_pipeline_module.js'],
  stylesBuiltFromSource: sha(stylesExpected) === hashes['app_styles_module.js'],
  stylesPublicMatches: hashes['app_styles_module.js'] === hashes['desktop/web-app/public/app_styles_module.js'],
} };
fs.writeFileSync(path.join(__dirname, 'before.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.parity));
if (Object.values(result.parity).some(value => !value)) process.exitCode = 1;
