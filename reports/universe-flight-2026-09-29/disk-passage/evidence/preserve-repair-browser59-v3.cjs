'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const stage=path.resolve(__dirname),report=path.join(stage,'browser-report'),attempt=path.join(stage,'attempts','browser-02-resume-window'),driver=path.join(stage,'browser-check.cjs');
for(const p of [report,attempt,driver])assert.ok(p.startsWith(stage+path.sep),'Preservation paths remain inside the stage');
assert.ok(!fs.existsSync(attempt),'Never overwrite preserved attempt');
const prior=JSON.parse(fs.readFileSync(path.join(report,'check.json'),'utf8'));
assert.match(prior.failure||'',/locator\.click/);
const before=fs.readFileSync(driver,'utf8'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
assert.equal(sha(before),prior.harnessSha256);
fs.renameSync(report,attempt);
fs.copyFileSync(driver,path.join(attempt,'browser-check-executed.cjs'));
fs.copyFileSync(path.join(stage,'browser-driver-provenance-v2.json'),path.join(attempt,'browser-driver-provenance-v2.json'));
const edits=[
 {before:"const play=page.locator('#'+prefix+'-flyby-status .uf-flyby-play');await play.click();",after:"const resumeControl=page.locator('#'+prefix+'-flyby-status').locator('[data-flyby-highlight=\"arms\"]');await reachable(resumeControl);await resumeControl.click();await paused(name+'-resume-origin',10);if(fullscreen)await openControls();const resumeElapsed=await page.evaluate(()=>__routeInfo.flyby.elapsedSeconds);const play=page.locator('#'+prefix+'-flyby-status .uf-flyby-play');await play.click();",reason:'Resume and pause from arms10s rather than panorama40s, leaving 34 authored seconds for browser actions. Completion removes the Pause control (UI317).'},
 {before:"__routeInfo.flyby.elapsedSeconds>elapsed,elapsed),'Resume advances authored route'",after:"__routeInfo.flyby.elapsedSeconds>elapsed,resumeElapsed),'Resume advances authored route'",reason:'Compare resume advancement with the explicitly chosen earlier route moment.'}
];
let after=before;
for(const edit of edits){assert.equal(after.split(edit.before).length,2,'Each scoped harness edit occurs once');after=after.replace(edit.before,edit.after);}
fs.writeFileSync(driver,after);
const provenance={driverSha256:sha(after),previousDriverSha256:sha(before),preservedAttempt:path.relative(stage,attempt).replaceAll('\\','/'),classification:'Pause button detached during resumed fullscreen click; authored completion with four seconds left is the inferred cause. Harness resumes from an explicit earlier highlight.',sourcePins:prior.pins,edits};
fs.writeFileSync(path.join(stage,'browser-driver-provenance-v3.json'),JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify(provenance));
