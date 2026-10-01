'use strict';
// Reads application/Git state; writes only this follow-up's evidence report.
const fs = require('node:fs'), crypto = require('node:crypto'), cp = require('node:child_process'), assert = require('node:assert/strict');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before = require('./validation-before.json');
const files = Object.fromEntries(Object.keys(before.files).map(file => [file, sha(file)]));
for (const file of ['tests/reader_place_retention.test.js', 'tests/reader_followup_locales.test.js', 'tests/reading_support_draft_transitions.test.js', 'dev-tools/reader-performance/run.cjs', '_build_view_simplified_module.js']) files[file] = sha(file);
const head = cp.execFileSync('git', ['--no-optional-locks', 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const inspectedHead = process.argv[2] === '--baseline-ready' ? process.argv[3] : before.head;
assert.equal(head, inspectedHead, 'HEAD moved: recheck baseline');
const integrated = require('../adapted-reader-integration-01-2026-09-26-1730/deltas/followup-04-partial-save/record.json');
for (const plan of integrated.plans) assert.equal(files[plan.target], plan.after, 'Integrated source changed: ' + plan.target);
assert.equal(files['reader_place_store.js'], before.files['reader_place_store.js']);
assert.equal(files['view_simplified_module.js'], require('./partial-save-pin-update.json').moduleHash);
const localeFiles = Object.keys(before.files).filter(f => /ui_strings|\/lang\/|^lang\/|reader-followup-locales|apply_reader_contract_locales/.test(f));
const localeDrift = localeFiles.filter(f => files[f] !== before.files[f]);
const pin = files['view_simplified_module.js'].slice(0, 8);
assert.equal(files['view_simplified_module.js'], files['desktop/web-app/public/view_simplified_module.js']);
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
assert.equal(new Set(hosts.map(f => files[f])).size, 1);
for (const file of hosts) assert.deepEqual(fs.readFileSync(file, 'utf8').match(/https:\/\/alloflow-cdn\.pages\.dev\/view_simplified_module\.js\?v=[a-f0-9]+/g), ['https://alloflow-cdn.pages.dev/view_simplified_module.js?v=' + pin]);
const locales = require('../../dev-tools/i18n/apply_reader_contract_locales.cjs').run(false, 'all');
const tests = {};
for (const name of ['locale-final-tests.json', 'generated-reader-final-tests.json', 'partial-save-final-tests.json']) {
  const report = JSON.parse(fs.readFileSync(__dirname + '/' + name, 'utf8'));
  assert.equal(report.numFailedTests, 0, name);
  assert.ok(report.testResults.every(s => s.status === 'passed'), name + ' suite failed');
  tests[name] = { passed: report.numPassedTests, failed: report.numFailedTests, files: report.testResults.length };
}
const performance = require('./memory-after.json');
assert.equal(performance.sourceHashes['reader_place_store.js'], files['reader_place_store.js']);
const recoveryBrowser = require('./browser-results.json'), draftBrowser = require('./partial-save-browser-results.json');
assert.ok(recoveryBrowser.tests.every(test => test.passed));
assert.equal(draftBrowser.pageErrors.length, 0);
const outsidePairs = ['own_sources_module.js', 'stem_lab/stem_tool_cephalopodlab.js', 'stem_lab/stem_tool_raptorhunt.js'].map(file => ({ file, root: sha(file), public: sha('desktop/web-app/public/' + file) }));
const mirrorText = fs.readFileSync(__dirname + '/mirror-final.txt', 'utf8');
const fullMirror = Object.fromEntries(['Files checked', 'Matched', 'Drifted', 'Excluded'].map(label => [label, Number(mirrorText.match(new RegExp(label + ':\\s+(\\d+)'))?.[1])]));
assert.equal(fullMirror.Drifted, 0); assert.equal(fullMirror.Matched, fullMirror['Files checked']);
const result = { at: new Date().toISOString(), head, initialHead: before.head, files, localeDrift, locales, readerPin: pin, tests,
  browser: { recovery: recoveryBrowser.tests.length, partialSave: draftBrowser.results.length, pageErrors: draftBrowser.pageErrors },
  performanceSource: performance.sourceHashes['view_simplified_source.jsx'],
  performanceNote: 'Measured before the separate partial-save patch. Retention helper bytes are unchanged; no timing claim for the new editor code.',
  outsidePairs, fullMirror, globalMirrorNote: 'The initial three concurrent owner mismatches resolved. The final full scan passed 8227 pairs with four documented exclusions; no deployment claim.' };
fs.writeFileSync(__dirname + '/completion.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ head, readerPin: pin, localeDrift, locales, tests, outsideDrift: outsidePairs.filter(p => p.root !== p.public).map(p => p.file) }, null, 2));
assert.equal(localeDrift.length, 0, 'Locale owner changed frozen inputs; reconcile evidence before release');
