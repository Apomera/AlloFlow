const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const dir = __dirname;
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const full = read('all-geometry-tests.json'), targeted = read('final-targeted-tests.json');
assert.equal(targeted.success, true);
const suites = new Map();
for (const report of [full, targeted]) for (const suite of report.testResults) suites.set(path.basename(suite.name), suite);
const inventory = fs.readdirSync('tests').filter(name => name.includes('geometry_world') && name.endsWith('.test.js'));
assert.equal(suites.size, inventory.length);
for (const name of inventory) assert(suites.has(name), 'Missing current Geometry World suite: ' + name);
const assertions = [...suites.values()].flatMap(suite => { assert.equal(suite.status, 'passed', suite.name); return suite.assertionResults; });
assert(assertions.every(test => test.status === 'passed'));
const browser = {};
for (const name of ['guided-presets-browser.json', 'guided-presets-final.json', 'guide-browser.json', 'tracking-browser.json', 'tracking-touch-browser.json']) {
  const report = read(name);
  assert(report.checks.every(check => check.pass === true), name);
  assert.equal((report.errors || []).length, 0, name);
  assert.equal((report.consoleErrors || []).length, 0, name);
  browser[name] = report.checks.length;
}
assert.equal(read('tracking-touch-browser.json').pass, true);
const sources = {};
for (const name of ['stem_tool_geometryworld.js', 'stem_tool_geometryworld_builder.js']) {
  const data = fs.readFileSync('stem_lab/' + name);
  new Function(data.toString());
  assert(data.equals(fs.readFileSync('desktop/web-app/public/stem_lab/' + name)));
  sources[name] = crypto.createHash('sha256').update(data).digest('hex');
}
const summary = { testFiles: suites.size, passedTests: assertions.length, failedTests: 0, targetedTests: targeted.numTotalTests, completedBrowserChecks: Object.values(browser).reduce((a,b)=>a+b,0), browser, sources, desktopMirrorsMatch: true, initialRun: { passed: full.numPassedTests, failed: full.numFailedTests }, limitations: ['Initial combined tracking harness timed out starting a second touch page; isolated native-touch retry passed.', 'Guide screenshot harness timed out on its optional night-settings selector; night appearance remains visually unverified.'], deployment: 'Local changes; not committed or deployed.' };
fs.writeFileSync(path.join(dir, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
const reportFile = path.join(dir, 'GUIDANCE-REVIEW.md');
let report = fs.readFileSync(reportFile, 'utf8');
assert(report.includes('FINAL_VALIDATION_PENDING'));
report = report.replace('FINAL_VALIDATION_PENDING',
  `Final combined coverage: **${assertions.length} passing tests across all ${suites.size} current Geometry World test files**, with no remaining failed assertions. The initial full run found seven outdated test-fixture assertions. The final ${targeted.numTotalTests}-test rerun verifies their corrections, the actual reduced-motion helper scope, texture quality, compass orientation, and shape controls. Original and rerun results are retained separately; the final inventory is recorded in [verification-summary.json](verification-summary.json).\n\n` +
  `**${summary.completedBrowserChecks} completed browser assertions passed**, with no runtime or console errors: 43 lesson/entry checks, seven guide-graphics checks, 45 desktop/responsive tracking checks, and nine native-touch checks. A combined tracking run timed out starting its second page; the isolated touch retry passed. An optional night-settings screenshot step also hit a harness selector timeout, so night appearance remains visually unverified.\n\n` +
  `Canonical and desktop modules are byte-identical, both parse successfully, and the targeted Git diff check is clean. Guide screenshots were inspected at ordinary, close, question-bearing, and high-contrast views; lesson overviews and small-screen journal captures were also inspected.\n\nSee [tracking QA](tracking-qa-notes.md), [guide visual QA](GUIDE-VISUAL-REVIEW.md), and [lesson QA](GUIDED-PRESET-VALIDATION.md) for detailed evidence.`);
report = report.replace('- Updated shortcut assertions in `tests/geometry_world_wayfinding.test.js`', '- Updated shortcut assertions in `tests/geometry_world_wayfinding.test.js`\n- Updated production-helper fixtures in `tests/geometry_world_reduced_motion.test.js` and `tests/geometry_world_visual_pipeline.test.js`');
const fd = fs.openSync(reportFile, 'r+');
try { fs.writeSync(fd, report, 0, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(report)); }
finally { fs.closeSync(fd); }
console.log(JSON.stringify(summary, null, 2));
