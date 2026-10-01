const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const out = __dirname;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const unit = read(path.join(out, 'unit-results.json'));
const targeted = read(path.join(out, 'final-targeted-results.json'));
const browser = read(path.join(out, 'browser-results.json'));
const quiz = read(path.join(out, 'browser-validation.json'));
const application = read(path.join(out, 'application-validation.json'));
const cards = read('reports/anatomy-study-flow-2026-09-28/browser-validation.json');
const assertions = report => report.testResults.flatMap(file => file.assertionResults);
for (const [name, report] of [['broad', unit], ['final targeted', targeted]]) {
  if (report.numFailedTests || assertions(report).some(test => test.status !== 'passed')) throw new Error('Unit checks did not all pass: ' + name);
}
if (browser.stats.unexpected || browser.stats.flaky || browser.stats.skipped) throw new Error('Browser checks did not all pass');
const scans = [...quiz.scans, ...application.scans, ...cards.scans];
if (scans.some(scan => scan.violations.length)) throw new Error('Accessibility violations');
if ([...quiz.sizes, ...cards.sizes].some(size => size.scroll > size.width + 2)) throw new Error('Horizontal overflow');
if (quiz.errors.length || cards.errors.length) throw new Error('Browser errors');
const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js');
if (!source.equals(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js'))) throw new Error('Anatomy source mirrors differ');
const locales = read(path.join(out, 'locale-commit-scope.json'));
for (let index = 0; index < locales.length; index += 2) if (locales[index].hash !== locales[index + 1].hash) throw new Error('Locale candidate mirrors differ');
const verification = {
  broadUnitChecks: unit.numPassedTests,
  finalTargetedChecks: targeted.numPassedTests,
  finalChange: 'Normalize corrupted quiz indices consistently for rendering, answers, and Next.',
  browserScenarios: browser.stats.expected,
  accessibilityScans: scans.length,
  accessibilityViolations: 0,
  quizPanelTop: quiz.top,
  cardsPanelTop: cards.compactTop,
  quizSizes: quiz.sizes,
  cardsSizes: cards.sizes,
  browserErrors: [],
  sourceSha256: crypto.createHash('sha256').update(source.toString('utf8').replace(/\r\n/g, '\n')).digest('hex'),
  sourceHashLineEndings: 'LF',
  sourceMirrorsMatch: true,
  localeCandidateMirrorsMatch: true,
  anatomyLabelsPerLocale: locales[0].keys.length,
  localeScope: 'Only card_flow_*, quiz_flow_*, and the five Quiz session-control labels.',
  verificationDate: new Date().toISOString()
};
fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(verification, null, 2) + '\n');
fs.copyFileSync('reports/anatomy-study-flow-2026-09-28/after-desktop.png', path.join(out, 'cards-desktop.png'));
fs.copyFileSync('reports/anatomy-study-flow-2026-09-28/round-complete-phone.png', path.join(out, 'card-completion-phone.png'));
cp.execFileSync(process.execPath, ['--check', 'stem_lab/stem_tool_anatomy.js']);
console.log(JSON.stringify(verification, null, 2));
