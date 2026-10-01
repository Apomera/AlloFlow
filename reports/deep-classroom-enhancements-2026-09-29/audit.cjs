const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '../..'), hash = text => crypto.createHash('sha256').update(text).digest('hex');
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'before.json'), 'utf8'));
const tests = ['tests/k5_deep_action_readiness.test.js', 'tests/dashboard_progress_workspace.test.js', 'tests/learner_progress_scope_browser.test.js'];
const inputs = [...Object.keys(before), ...tests];
const files = Object.fromEntries(inputs.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const identity = Object.fromEntries(inputs.map(file => [file, hash(files[file])]));
if (process.argv.includes('--snapshot')) {
  fs.writeFileSync(path.join(__dirname, 'validation-inputs-before.json'), JSON.stringify(identity, null, 2));
  console.log('Saved final validation input hashes.'); process.exit(0);
}
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const block = /<style data-docsuite-theme="v1">\{`[\s\S]*?`\}<\/style>/g;
const oldStyles = fs.readFileSync(path.join(__dirname, 'before/app_styles_source.jsx'), 'utf8');
const component = text => { const a = text.indexOf('const LearnerProgressView = React.memo(('), b = text.indexOf('// @section TEACHER_DASHBOARD', a); if (a < 0 || b < a) throw Error('Component boundary missing'); return text.slice(0, a) + '<progress>' + text.slice(b); };
const oldTeacher = fs.readFileSync(path.join(__dirname, 'before/teacher_source.jsx'), 'utf8');
const localized = JSON.parse(fs.readFileSync(path.join(__dirname, 'localized-keys.json'), 'utf8'));
const stringChecks = [];
for (const [language, values] of Object.entries(localized)) {
  const targets = language === 'en' ? ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'] : ['lang/' + language + '.js', 'desktop/web-app/public/lang/' + language + '.js'];
  for (const target of targets) {
    const bank = JSON.parse(files[target]);
    stringChecks.push({ target, keys: Object.keys(values).length, passed: Object.entries(values).every(([key, value]) => bank.learner[key] === value) });
  }
}
const gen = require(path.join(root, 'dev-tools/gen_docsuite_theme.cjs'));
const cssBlock = files['app_styles_source.jsx'].match(block) || [];
const css = cssBlock.length === 1 ? cssBlock[0].match(/\{`([\s\S]*?)`\}/)[1].trim() : '';
const checks = {
  hostsEqual: hosts.every(file => files[file] === files[hosts[0]]),
  teacherMirrorEqual: files['teacher_module.js'] === files['desktop/web-app/public/teacher_module.js'],
  stylesMirrorEqual: files['app_styles_module.js'] === files['desktop/web-app/public/app_styles_module.js'],
  headerMirrorEqual: files['view_header_module.js'] === files['desktop/web-app/public/view_header_module.js'],
  surroundingStylesPreserved: oldStyles.replace(block, '<generated>') === files['app_styles_source.jsx'].replace(block, '<generated>'),
  surroundingTeacherSourcePreserved: component(oldTeacher) === component(files['teacher_source.jsx']),
  themeCurrent: css === gen.generateCss(root).trim(), localized: stringChecks.every(item => item.passed)
};
for (const file of hosts) require(path.join(root, 'node_modules/esbuild')).transformSync(files[file], { loader: 'jsx', format: 'esm', logLevel: 'silent' });
const snapshot = fs.existsSync(path.join(__dirname, 'validation-inputs-before.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'validation-inputs-before.json'), 'utf8')) : null;
const changedDuringValidation = snapshot ? inputs.filter(file => identity[file] !== snapshot[file]) : null;
const diff = require(path.join(root, 'node_modules/diff'));
fs.writeFileSync(path.join(__dirname, 'own-changes.patch'), Object.keys(before).map(file => diff.createPatch(file, fs.readFileSync(path.join(__dirname, 'before', file.replaceAll('/', '__')), 'utf8'), files[file], 'saved working-tree input', 'enhanced working-tree result')).join('\n'));
const report = { at: new Date().toISOString(), checks, stringChecks, hostParse: 'all three parsed', changedDuringValidation, identity };
fs.writeFileSync(path.join(__dirname, 'final-audit.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ checks, changedDuringValidation }));
if (Object.values(checks).some(passed => !passed)) process.exitCode = 1;
