'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=process.cwd(),folder=path.join(root,'reports/watercycle-pilot-desktop-accessibility'),report=process.argv.find(x=>x.startsWith('--report='))?.slice(9)||'final-v3';
assert(/^[a-z0-9-]+$/.test(report));
const read=p=>JSON.parse(fs.readFileSync(path.join(folder,p),'utf8')),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),baseline=read('baseline/results.json'),final=read(report+'/results.json'),r=final.desktopPanels;
assert(final.success&&r&&r.checks.every(x=>x.ok),'Final native checks must pass before a success summary is written');
assert(final.errors.length===0,'No final page exceptions');assert(final.browsersClosed&&final.browserTempCleaned,'Owned browser and profile cleaned');
const summary={
 success:true,sourceSha256:final.sourceSha256,
 scope:r.scope,
 baseline:{sourceSha256:baseline.sourceSha256,report:'baseline/results.json',layouts:baseline.desktopPanels.layouts.length,checks:baseline.desktopPanels.checks.length,failedChecks:baseline.desktopPanels.checks.filter(x=>!x.ok).length,focusSamples:baseline.desktopPanels.focus.length,actuallyOccludedFocusSamples:baseline.desktopPanels.focus.filter(x=>!x.hit).length,captures:baseline.captures.length,errors:baseline.errors,browsersClosed:baseline.browsersClosed,browserTempCleaned:baseline.browserTempCleaned,findings:baseline.desktopPanels.focus.filter(x=>!x.hit).map(x=>({label:x.label,name:x.name,occluder:x.occluder,rect:x.rect})),note:'The 31 baseline failing checks comprise13 actual focus occlusions and18 desired panel-hiding assertions. Baseline success only means the observational harness completed.'},
 final:{report:report+'/results.json',checks:r.checks.length,passed:r.checks.filter(x=>x.ok).length,failed:r.checks.filter(x=>!x.ok).length,layouts:r.layouts.length,focusSamples:r.focus.length,automaticFocus:r.automaticFocus,captures:final.captures.length,errors:final.errors,networkFailures:final.networkFailures||[],browsersClosed:final.browsersClosed,browserTempCleaned:final.browserTempCleaned},
 retainedObservations:r.layouts.filter(x=>x.overlaps.length).map(x=>({label:x.label,overlaps:x.overlaps})),
 captures:final.captures.map(x=>({...x,sha256:hash(path.join(root,x.path))})),
 tools:['dev-tools/watercycle_pilot_desktop_accessibility_qa.cjs','dev-tools/watercycle_pilot_desktop_accessibility_checks.cjs','dev-tools/watercycle_pilot_desktop_accessibility_analyze.cjs'].map(p=>({path:p,sha256:hash(path.join(root,p))})),
 preservedAttempts:[
  {report:'candidate-map-cycle/results.json',source:'43d33eabeb2792d083b01a90b9668e5cfb4b586acd1a562949e6693227ec8454',outcome:'MapClose remained occluded by the cycle summary at768px200% text;9of10 checks passed. This candidate was superseded.'},
  {report:'final/results.json',source:'82112582775a6e078cde7d090d3b8c994f4ef6efba5330fd450c599399b2d9be',outcome:'Host startup failed with ReactDOM not defined before any app checks; browser/profile cleaned. Final successful attempt records network failures separately.'},
  {report:'final-v2/results.json',source:'072436d531f7a7fd19bf7e1479f2156a361ee47f8510fb162ca2731160a474f0',outcome:'QA assumed an incorrect native DOM tab order from flight deck to cycle card. Corrected to record Shift+Tab predecessor and Tab return around Keepflying. Three automatic focus cases and first layout checks passed; browser/profile cleaned.'}
 ],
 limits:['200% text resizing is a computed-font-size simulation, not actual browser zoom.','This pass uses targeted native DOM/keyboard checks, not a new axe scan or complete WCAG-conformance certification.','Screenshots require separate human/agent visual review; hashes bind the saved captures to this run.','The passive ladder remains behind an open map; actual controls, HUDs, and reading regions are checked for usability.','No production edits, commits, preview-server termination, or unrelated browser closure performed by this QA agent.']
};
fs.writeFileSync(path.join(folder,'qa-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({success:summary.success,sourceSha256:summary.sourceSha256,baseline:summary.baseline.actuallyOccludedFocusSamples,final:summary.final},null,2));
