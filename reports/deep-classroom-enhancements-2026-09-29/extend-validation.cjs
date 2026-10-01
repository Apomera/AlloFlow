const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '../..'), hash = b => crypto.createHash('sha256').update(b).digest('hex');
const additional = ['dev-tools/gen_docsuite_theme.cjs', 'dev-tools/remediation_validation.json', 'app_styles_source.jsx', 'app_styles_module.js', 'desktop/web-app/public/app_styles_module.js'];
const snapshot = Object.fromEntries(additional.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
if (snapshot['app_styles_module.js'] !== snapshot['desktop/web-app/public/app_styles_module.js']) throw Error('Inspect AppStyles destination differences');
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'before.json'), 'utf8'));
for (const [file, text] of Object.entries(snapshot)) {
  if (before[file]) throw Error('Additional preimage exists: ' + file);
  fs.writeFileSync(path.join(__dirname, 'before', file.replaceAll('/', '__')), text); before[file] = hash(text);
}
fs.writeFileSync(path.join(__dirname, 'before.json'), JSON.stringify(before, null, 2));
const generator = snapshot['dev-tools/gen_docsuite_theme.cjs'];
const anchor = "const APPSUITE_EXTRA = ['misc_components_source.jsx', 'games_source.jsx',";
if (generator.split(anchor).length !== 2) throw Error('Generator boundary ambiguous');
fs.writeFileSync(path.join(root, 'dev-tools/gen_docsuite_theme.cjs'), generator.replace(anchor, "const APPSUITE_EXTRA = ['teacher_source.jsx', 'misc_components_source.jsx', 'games_source.jsx',"));
const manifest = JSON.parse(snapshot['dev-tools/remediation_validation.json']);
for (const file of ['tests/k5_deep_action_readiness.test.js', 'tests/dashboard_progress_workspace.test.js', 'tests/dashboard_close_routing.test.js', 'tests/learner_progress_scope_browser.test.js']) if (!manifest.unit.includes(file)) manifest.unit.push(file);
const inputs = ['teacher_source.jsx', 'teacher_module.js', 'desktop/web-app/public/teacher_module.js', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'dev-tools/gen_docsuite_theme.cjs', ...['french', 'spanish_latin_america', 'arabic'].flatMap(language => ['lang/' + language + '.js', 'desktop/web-app/public/lang/' + language + '.js'])];
for (const file of inputs) if (!manifest.identityInputs.includes(file)) manifest.identityInputs.push(file);
if (fs.readFileSync(path.join(root, 'dev-tools/remediation_validation.json'), 'utf8') !== snapshot['dev-tools/remediation_validation.json']) throw Error('Concurrent validator manifest edit');
fs.writeFileSync(path.join(root, 'dev-tools/remediation_validation.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Added learner-progress theme coverage and additive maintained validation inputs.');
