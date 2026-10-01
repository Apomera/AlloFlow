const fs = require('node:fs');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const folder = 'reports/dissection-overlay-layout-2026-09-29';
const files = ['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js'];
const canonical = fs.readFileSync(files[0]);
if (!canonical.equals(fs.readFileSync(files[1]))) throw new Error('Renderer copies differ.');
for (const file of files) {
  const result = cp.spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if (result.status !== 0) throw new Error(result.stderr);
}
const baseline = cp.spawnSync('git',['show','f871ef9cd:reports/dissection-contact-feedback-2026-09-29/phone-320.png'],{maxBuffer:2*1024*1024});
if (baseline.status !== 0) throw new Error(baseline.stderr.toString());
fs.writeFileSync(folder+'/before-phone-320.png',baseline.stdout);
const finalBrowser = fs.readFileSync(folder+'/overlay-final-tests.log','utf8');
const browserRecheck = fs.readFileSync(folder+'/ventral-recheck.log','utf8');
if (!/9 passed/.test(finalBrowser) || /\d+ failed/.test(finalBrowser)) throw new Error('The final affected browser cases have not all passed.');
if (!/1 passed/.test(browserRecheck) || /\d+ failed/.test(browserRecheck)) throw new Error('The context teardown recheck did not pass.');
const units = JSON.parse(fs.readFileSync(folder+'/unit-results.json','utf8'));
if (units.numPassedTests !== 109 || units.numFailedTests !== 0) throw new Error('The final 109 focused regression checks have not all passed.');
const whitespace = cp.spawnSync('git',['diff','--check','--',...files,'tests/dissection_workspace_bands.test.js'],{encoding:'utf8'});
if (whitespace.status !== 0) throw new Error(whitespace.stdout+whitespace.stderr);
const review = { browserScenarios:24, finalAffectedBrowserScenarios:9, focusedRegressionChecks:109, rendererCopiesMatch:true, javascriptSyntaxValid:true, scopedWhitespaceClean:true, rendererSha256:crypto.createHash('sha256').update(canonical).digest('hex') };
fs.writeFileSync(folder+'/verification.json',JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify(review,null,2));
