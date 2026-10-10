'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const stage=path.resolve(__dirname),report=path.join(stage,'browser-report'),attempt=path.join(stage,'attempts','browser-01-selector'),driver=path.join(stage,'browser-check.cjs');
for(const p of [report,attempt,driver])assert.ok(p.startsWith(stage+path.sep),'Preservation paths remain inside the stage');
assert.ok(!fs.existsSync(attempt),'Never overwrite preserved attempt');
const prior=JSON.parse(fs.readFileSync(path.join(report,'check.json'),'utf8'));
assert.match(prior.failure||'',/locator\.selectOption/);
const before=fs.readFileSync(driver,'utf8'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
assert.equal(sha(before),prior.harnessSha256);
fs.renameSync(report,attempt);
fs.copyFileSync(driver,path.join(attempt,'browser-check-executed.cjs'));
fs.copyFileSync(path.join(stage,'browser-driver-provenance.json'),path.join(attempt,'browser-driver-provenance.json'));
const edits=[
  {before:"await page.locator('#uf-mode').selectOption('explore');",after:"await page.locator('.uf-modes').getByRole('button',{name:'Free exploration',exact:true}).click();",reason:'Installed UI exposes flight mode as buttons (UI lines 1333-1335).'},
  {before:'assert.equal(pose.settings.beta,0);',after:'assert.equal(pose.settings.beta,0.9);',reason:'Launcher preserves the remembered relativity beta (UI lines 911-915), default .9 (UI line 705). Renderer displayBeta() returns zero in explore mode (renderer line 1891).'}
];
let after=before;
for(const edit of edits){assert.equal(after.split(edit.before).length,2,'Each scoped harness edit occurs once');after=after.replace(edit.before,edit.after);}
fs.writeFileSync(driver,after);
const provenance={driverSha256:sha(after),previousDriverSha256:sha(before),preservedAttempt:path.relative(stage,attempt).replaceAll('\\','/'),classification:'Harness selector mismatch; beta expectation corrected from static source before exercising it.',sourcePins:prior.pins,edits};
fs.writeFileSync(path.join(stage,'browser-driver-provenance-v2.json'),JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify(provenance));
