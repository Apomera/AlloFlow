// Prepare an isolated candidate. The shared reader remains with integrator 01.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const babel = require('@babel/core'), parser = require('@babel/parser'), traverse = require('@babel/traverse').default;
const root = path.resolve(__dirname, '../..'), out = file => path.join(__dirname, file);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const inputs = ['reader_place_store.js', 'reader_support_drafts.js', 'view_simplified_source.jsx', 'ui_strings.js'];
for (const file of inputs) if (!fs.existsSync(path.join(root, file))) throw new Error('Missing integration input: ' + file);
const frozen = Object.fromEntries(inputs.map(file => [file, read(file)]));
const original = frozen['view_simplified_source.jsx'], addition = fs.readFileSync(out('lifecycle-ui.jsx'), 'utf8');
if (!original.includes('function reviewReadingConflict()') || original.includes('function renderReadingRecoveryActions(')) throw new Error('Rebase lifecycle delta on the integrated recovery reader.');
let candidate = original;
function replaceOnce(before, after) {
  if (candidate.split(before).length !== 2) throw new Error('Integration anchor changed: ' + before.slice(0, 80));
  candidate = candidate.replace(before, after);
}
const init = '  var readingPlaceStore = createReadingPlaceStore({ getStorage: () => window.localStorage, getLocks: () => window.navigator.locks });';
replaceOnce(init, init + '\n  if (window.__alloReadingPlaceGuardCleanup) window.__alloReadingPlaceGuardCleanup();\n  window.__alloReadingPlaceGuardCleanup = readingPlaceStore.watchPage(window);');
const preview = '    var placeStore = placePreview ? previewPlaceStoreRef.current : readingPlaceStore;';
replaceOnce(preview, preview + '\n    React.useEffect(function () { if (placePreview) return placeStore.watchPage(window); }, [placePreview, placeStore]);');
replaceOnce('    function readingRecoveryText(place) {', '    function readingRecoveryText(place, sourceText) {\n      var recoverySections = sourceText === undefined ? outlineSections : readingOutlineSections(sourceText);');
replaceOnce('var section = outlineSections.find(entry => String(entry.first) === first);', 'var section = recoverySections.find(entry => String(entry.first) === first);');
replaceOnce('    function renderPlacePersistence() {', addition + '\n    function renderPlacePersistence() {');
replaceOnce('        {placeReview && <section data-reading-conflict-panel', '        {renderReadingRecoveryActions(state, hasCopyableWork, button, textArea)}\n        {placeReview && <section data-reading-conflict-panel');
fs.writeFileSync(out('view_simplified_source.jsx'), candidate);
const compiled = babel.transformSync(frozen['reader_place_store.js'] + '\n' + frozen['reader_support_drafts.js'] + '\n' + candidate, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] }, generatorOpts: { jsescOption: { minimal: true } }
});
fs.writeFileSync(out('view_simplified_module.js'), `(function(){'use strict';var React=window.React;var Fragment=React.Fragment;\n${compiled.code}\nwindow.AlloModules=window.AlloModules||{};window.AlloModules.SimplifiedView=SimplifiedView;window.AlloModules.ViewSimplifiedModule=true;})();\n`);
const strings = JSON.parse(frozen['ui_strings.js']), added = {};
traverse(parser.parse('function component(){' + addition + '}', { sourceType: 'script', plugins: ['jsx'] }), {
  CallExpression(p) { const [key, fallback] = p.node.arguments; if (p.node.callee.name === 'viewText' && key?.type === 'StringLiteral' && fallback?.type === 'StringLiteral' && key.value.startsWith('simplified.')) added[key.value.slice(11)] = fallback.value; }
});
Object.assign(strings.simplified, added);
fs.writeFileSync(out('ui_strings.js'), JSON.stringify(strings, null, 2) + '\n');
fs.writeFileSync(out('strings.json'), JSON.stringify(added, null, 2) + '\n');
let patch = '';
for (const file of inputs) if (read(file) !== frozen[file]) throw new Error('Integration input changed while preparing: ' + file + '. Re-run preparation.');
for (const file of ['view_simplified_source.jsx', 'ui_strings.js']) {
  const target = path.relative(root, out(file)).replace(/\\/g, '/');
  const diff = spawnSync('git', ['--no-optional-locks', 'diff', '--no-index', '--', file, target], { cwd: root, encoding: 'utf8' });
  if (diff.status > 1 || diff.error) throw diff.error || new Error(diff.stderr);
  patch += diff.stdout.split(target).join(file);
}
fs.writeFileSync(out('shared-ui.patch'), patch);
for (const file of inputs) if (read(file) !== frozen[file]) throw new Error('Integration input changed while diffing: ' + file + '. Re-run preparation.');
fs.writeFileSync(out('candidate-inputs.json'), JSON.stringify(Object.fromEntries(inputs.map(file => [file, crypto.createHash('sha256').update(frozen[file]).digest('hex')])), null, 2) + '\n');
const testFixture = read('reports/reader-place-recovery-enhancement/conflict-ui.test.js')
  .replace("const candidate = process.env.ALLO_READING_RECOVERY_UI_ROOT ?? fixtures;", "const candidate = process.env.ALLO_READING_RECOVERY_UI_ROOT ?? 'reports/reader-place-lifecycle-enhancement/';")
  .replace("function reload() {", "function reload() { delete window.AlloModules.SimplifiedView;")
  .replace("afterEach(() => { unmount();", "afterEach(() => { unmount(); window.__alloReadingPlaceGuardCleanup?.();");
fs.writeFileSync(out('ui-regression.test.js'), testFixture + '\n' + fs.readFileSync(out('ui-cases.js'), 'utf8'));
console.log('Prepared lifecycle/recovery candidate and bounded patch. Shared UI files were not changed.');
