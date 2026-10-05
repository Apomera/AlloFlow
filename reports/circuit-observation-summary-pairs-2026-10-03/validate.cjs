const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js', mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const expectedSource = '37149d44a459fdf7d10b46770fa3a6e53c388f46cedd8c298eb79755f1371610';
const expectedRunner = '5ada2582752f21b147a544138e1f9cdb37a8e9e3e6c690da5a965dc4cb6da01a';
const expectedTest = 'fd6a00a93179967eae057f42135ad5640d9e62b6dafd95567063e5fc25fd4302';
const expectedBrowser = '0ad50b7b8618c245d779980cc58a251bfe1ec5bda768517810eb3e2f4d0c9901';
const counts = {'tests/circuit_observation_summary.test.js':10,'tests/circuit_active_notebook_continuity.test.js':16,'tests/circuit_investigation.test.js':25};
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = file => digest(fs.readFileSync(file));
const here = name => path.join(__dirname, name);
const read = name => JSON.parse(fs.readFileSync(here(name), 'utf8'));
const relative = file => path.relative(root, file).replace(/\\/g, '/');
const sourceText = fs.readFileSync(path.join(root,source),'utf8');
assert.equal(hash(path.join(root,source)),expectedSource); assert.equal(hash(path.join(root,mirror)),expectedSource); new vm.Script(sourceText);
const preservation = read('source-preservation.json');
assert.equal(preservation.passed,true); assert.equal(preservation.byteExactReversal,true); assert.equal(preservation.sourceSha256,expectedSource); assert.equal(preservation.mirrorSha256,expectedSource);
assert.equal(preservation.beforeSha256,'a40fe06d58ce22194cbf575f38f821bf0dbc72aff1555fd17970f51134a119c6'); assert.equal(preservation.changes.length,3);
let reversed = sourceText;
for (const change of preservation.changes.slice().reverse()) { assert.equal(reversed.split(change.after).length,2); reversed = reversed.replace(change.after,change.before); }
assert.equal(digest(reversed),preservation.beforeSha256);
const prior = here('../circuit-investigation-reading-wrap-2026-10-03/validation.json');
assert.equal(hash(prior),'8c1e899969fcc4bad36c00fc8314a27a559e05faf5c708f19f486f4cfe83c330');
const priorValidation = JSON.parse(fs.readFileSync(prior,'utf8')); assert.equal(priorValidation.passed,true); assert.equal(priorValidation.sourceSha256,preservation.beforeSha256);
const independent = read('independent-review.json'); assert.equal(independent.passed,true); assert.equal(independent.sourceSha256,expectedSource); assert.equal(independent.byteExactReversedSha256,preservation.beforeSha256); assert.ok(Object.values(independent.checks).every(Boolean));

const receipt = read('regression-receipt.json'), raw = read('regression-raw.json');
assert.equal(receipt.passed,true); assert.equal(receipt.exitCode,0); assert.equal(receipt.signal,null); assert.equal(receipt.processError,null); assert.equal(receipt.mode,'single-process-isolated-files');
assert.deepEqual(receipt.expectedCounts,counts); assert.deepEqual(receipt.selected.slice().sort(),Object.keys(counts).sort()); assert.deepEqual(receipt.changedDuringRun,[]); assert.deepEqual(receipt.filesAtEnd,receipt.files);
assert.equal(hash(here('run-regression.cjs')),expectedRunner); assert.equal(receipt.runnerSha256,expectedRunner); assert.equal(receipt.runnerSha256AtEnd,expectedRunner);
assert.equal(hash(path.join(root,'tests/circuit_observation_summary.test.js')),expectedTest);
for (const [file, expected] of Object.entries(receipt.files)) assert.equal(hash(path.join(root,file)),expected);
for (const key of ['rawReport','report','stdout','stderr','start']) { assert.equal(path.basename(receipt[key]),receipt[key]); assert.equal(hash(here(receipt[key])),receipt[key+'Sha256']); }
assert.equal(hash(here('regression.json')),hash(here('regression-raw.json')));
for (const flag of ['--pool=threads','--maxWorkers=1','--isolate','--testTimeout=30000','--hookTimeout=60000']) assert.ok(receipt.command.includes(flag));
assert.deepEqual(receipt.command.filter(value=>value.startsWith('tests/')).sort(),Object.keys(counts).sort());
assert.equal(raw.success,true); assert.equal(raw.numTotalTests,51); assert.equal(raw.numPassedTests,51); assert.equal(raw.testResults.length,3);
for (const key of ['numFailedTests','numPendingTests','numTodoTests']) assert.equal(raw[key]||0,0);
const coverage = raw.testResults.map(file=>{assert.equal(file.status,'passed'); assert.equal(file.assertionResults.length,counts[relative(file.name)]); assert.ok(file.assertionResults.every(test=>test.status==='passed')); const fullNames=file.assertionResults.map(test=>test.fullName); assert.equal(new Set(fullNames).size,fullNames.length); return {file:relative(file.name),status:file.status,count:fullNames.length,fullNames};});
assert.deepEqual(coverage.map(row=>row.file).sort(),Object.keys(counts).sort()); assert.deepEqual(receipt.assertionCoverage,coverage);

const previousDir = here('../circuit-observation-summary-2026-10-03');
const correction = JSON.parse(fs.readFileSync(path.join(previousDir,'fixture-correction.json'),'utf8'));
assert.equal(hash(path.join(previousDir,'fixture-correction.json')),'8a20a562683b0976f72eb38e3185685cae1b1c81ff3f03f2098ff83a317881f4');
assert.equal(correction.productChanged,false); assert.equal(correction.assertionTimeoutsChanged,false); assert.equal(correction.initialPassed,47); assert.equal(correction.initialFailed,4);
for (const file of correction.archive.files) assert.equal(hash(path.join(previousDir,file.path)),file.sha256);
let before = fs.readFileSync(path.join(previousDir,'initial-fixture-attempt/circuit_observation_summary.test.js'),'utf8');
assert.equal(digest(before),correction.testBeforeSha256);
for (const text of ['3.30','5.00','1.00','1.50']) before = before.replaceAll("'"+text+" V'","'"+text+"V'");
assert.equal(digest(before),correction.testAfterSha256); assert.equal(hash(here('observation-summary-test-before.js')),correction.testAfterSha256);
const heldFile = path.join(previousDir,'visual-review-before-rtl-fix.json');
assert.equal(hash(heldFile),preservation.supersededAttempt.visualReviewSha256);
const held = JSON.parse(fs.readFileSync(heldFile,'utf8')); assert.equal(held.approved,false);
for (const shot of held.screenshots) assert.equal(hash(path.join(previousDir,shot.file)),shot.sha256);

const browser = read('browser-results.json'); assert.equal(browser.passed,true); assert.deepEqual(browser.errors,[]); assert.deepEqual(browser.visualIssues,[]);
assert.equal(hash(here('browser-check.cjs')),expectedBrowser);
for (const key of ['sourceSha256','mirrorSha256','sourceSha256AtEnd','mirrorSha256AtEnd']) assert.equal(browser[key],expectedSource);
for (const key of ['scriptSha256','scriptSha256AtEnd']) assert.equal(browser[key],expectedBrowser);
assert.equal(browser.sourceChangedDuringRun,false); assert.equal(browser.scriptChangedDuringRun,false); assert.equal(browser.mirrorMatches,true);
for (const key of ['axe','layouts','contentBounds','actions','nodeIds','screenshots','summaryStates','probePairs','accessibleSummaries']) assert.equal(browser[key].length,8,key);
assert.equal(browser.focus.length,16); assert.equal(browser.disclosures.length,2); assert.equal(browser.bodyChecks.length,1); assert.equal(browser.transitions.length,1); assert.equal(browser.lifecycle.length,2);
for (const scan of browser.axe) { assert.deepEqual(scan.violations,[]); assert.deepEqual(scan.excludedRules,scan.forcedColors?['color-contrast']:[]); if(scan.forcedColors) assert.match(scan.exclusionReason,/axe 4\.12\.1/); }
for (const row of browser.layouts) assert.ok(row.scrollWidth<=row.width+1);
for (const row of browser.nodeIds) assert.deepEqual(row.duplicates,[]);
for (const row of browser.contentBounds) for (const card of row.cards) { assert.deepEqual(card.violations,[]); assert.ok(card.scrollWidth<=card.clientWidth+1); }
for (const row of browser.actions) for (const action of row.actions) { assert.equal(action.tag,'SUMMARY'); assert.ok(action.width>=43.9); assert.ok(action.height>=43.9); }
for (const row of browser.focus) assert.equal(row.visible,true);
for (const row of browser.summaryStates) {
  assert.equal(row.actualViewportWidth,row.width); assert.ok(row.points.length>=2); assert.equal(row.points[0].current.replace(/\s/g,''),'21.82mA'); assert.equal(row.points[1].current.replace(/\s/g,''),'21.82mA'); assert.notEqual(row.points[0].input,row.points[1].input);
  for (const point of row.points) { assert.equal(point.open,false); assert.equal(point.tag,'SUMMARY'); assert.equal(point.marker.hidden,'true'); assert.ok(point.label.endsWith('Lamp current')); assert.deepEqual(point.bodyLabels,['Base current · IB','Lamp current · IC','Transistor voltage · VCE','Probe voltage']); assert.deepEqual(point.bodyActions,['Revisit observation '+(point.index+1),'Use observation '+(point.index+1)+' as reference','Remove observation '+(point.index+1)]);
    for (const quantity of point.quantities) { assert.equal(quantity.dir,'ltr'); assert.equal(quantity.direction,'ltr'); assert.ok(quantity.bidi.includes('isolate')); for (const word of quantity.words) { assert.equal(word.lines,1); const rows=[]; for (const rectangle of word.rectangles) if (!rows.some(y=>Math.abs(y-rectangle.top)<1)) rows.push(rectangle.top); assert.equal(rows.length,1); } }
  }
}
for (const row of browser.disclosures) { assert.equal(row.wholeDataUnchanged,true); assert.equal(row.summaryFocused,true); }
assert.deepEqual(browser.disclosures.map(row=>[row.key,row.open]),[['Enter',true],['Space',false]]);
assert.equal(browser.transitions[0].existingSavedPointsPreserved,true); assert.equal(browser.transitions[0].newCardOpen,true); assert.equal(browser.transitions[0].noteFocused,true);
assert.equal(browser.lifecycle[0].savedObservationsUnchanged,true); assert.equal(browser.lifecycle[0].summariesUnchanged,true);
assert.equal(browser.lifecycle[1].action,'locale-and-display-changes'); assert.equal(browser.lifecycle[1].wholeDataUnchanged,true); assert.equal(browser.lifecycle[1].noAutomaticNavigation,true);
assert.equal(browser.textResize.length,1); for (const row of browser.textResize) { assert.equal(row.scale,2); assert.equal(row.baselineViewportWidth,320); assert.equal(row.elements,row.fonts.length); for (const font of row.fonts) { assert.equal(font.beforeFontSize,font.normalFontSize); assert.equal(font.afterFontSize,font.normalFontSize*2); assert.equal(font.ratio,2); } }
assert.equal(browser.forcedColors.length,1); for (const row of browser.forcedColors) { assert.equal(row.active,true); assert.deepEqual(row.violations,[]); assert.ok(row.colors.length>0); for (const color of row.colors) assert.ok(color.ratio>=color.required); }
assert.equal(browser.readingOrder.length,1); assert.equal(browser.readingOrder[0].actualViewportWidth,320); assert.equal(browser.readingOrder[0].direction,'rtl');
assert.equal(browser.motion.length,1); assert.equal(browser.motion[0].reduced,true); assert.equal(browser.motion[0].animations,0);

for (const row of browser.probePairs) {
  assert.ok(row.groups.length >= 2);
  for (const group of row.groups) {
    assert.equal(group.actualViewportWidth,row.width); assert.deepEqual(group.pairs.map(pair=>pair.lead),['red','black']);
    for (const pair of group.pairs) {
      assert.equal(pair.dir,'auto'); assert.equal(pair.nodeDir,'ltr'); assert.equal(pair.display,'inline-block'); assert.ok(pair.bidi.includes('isolate'));
      assert.equal(pair.text,pair.label+' '+pair.node);
      for (const rect of [pair.labelRect,pair.nodeRect]) { assert.ok(rect.left>=pair.pairRect.left-1); assert.ok(rect.right<=pair.pairRect.right+1); assert.ok(rect.top>=pair.pairRect.top-1); assert.ok(rect.bottom<=pair.pairRect.bottom+1); }
    }
    if (group.summaryDirection==='rtl' && Math.abs(group.pairs[0].pairRect.top-group.pairs[1].pairRect.top)<1) assert.ok(group.pairs[0].pairRect.left>=group.pairs[1].pairRect.right-1);
  }
}
for (const row of browser.accessibleSummaries) {
  const points=browser.summaryStates.find(state=>state.name===row.name&&state.width===row.width&&state.scale===row.scale).points;
  const groups=browser.probePairs.find(state=>state.name===row.name&&state.width===row.width&&state.scale===row.scale).groups;
  assert.equal(row.entries.length,points.length);
  for (const entry of row.entries) { const point=points[entry.index],group=groups[entry.index]; assert.equal(entry.ignored,false); assert.equal(entry.role,'DisclosureTriangle'); assert.ok(entry.snapshot); assert.ok(entry.nativeName.includes(String(entry.index+1).padStart(2,'0')+' '+point.project)); assert.ok(entry.nativeName.includes(point.label+' '+point.current)); for(const pair of group.pairs) assert.ok(entry.nativeName.includes(pair.label+' '+pair.node)); }
}
const browserCorrection=read('harness-correction.json');
assert.equal(hash(here('harness-correction.json')),'5749248f92d7585f23ded6149c974135b707b8c012115f8e82e57093c6ad0578');
assert.equal(browserCorrection.afterSha256,expectedBrowser); assert.equal(browserCorrection.sourceSha256,expectedSource); assert.equal(browserCorrection.occurrences,1); assert.equal(browserCorrection.unchangedExceptAccessibleNameMeasurement,true);
const archive=read('initial-accessible-name/archive-receipt.json'); assert.equal(archive.nativeExitCode,1); assert.equal(archive.browserClosedByFinally,true);
for(const file of archive.files) assert.equal(hash(here('initial-accessible-name/'+file.file)),file.sha256);
const oldScript=fs.readFileSync(here('initial-accessible-name/browser-check.cjs'),'utf8'),finalScript=fs.readFileSync(here('browser-check.cjs'),'utf8');
assert.equal(digest(oldScript),browserCorrection.beforeSha256); assert.equal(oldScript.split(browserCorrection.from).length,2); assert.equal(oldScript.replace(browserCorrection.from,browserCorrection.to),finalScript);
assert.equal(hash(here(browserCorrection.diagnosticFile)),browserCorrection.diagnosticSha256);
const diagnostic=read(browserCorrection.diagnosticFile); assert.equal(diagnostic.passed,true); assert.equal(diagnostic.sourceSha256,expectedSource); assert.equal(diagnostic.diagnostic.role,'DisclosureTriangle'); assert.ok(diagnostic.diagnostic.name.includes('Lamp current 21.82 mA'));
assert.equal(browserCorrection.diagnosticNativeExitCode,0); assert.equal(browserCorrection.diagnosticBrowserClosed,true);
const preflight=read('browser-preflight-failure.json'); assert.equal(preflight.nodeLaunched,false); assert.equal(preflight.chromiumLaunched,false); assert.equal(preflight.previousAuditEvidenceOverwritten,false);
const bounded=read('browser-bounded-preflight.json'); assert.equal(bounded.passed,true); assert.equal(bounded.sourceSha256,expectedSource); assert.equal(bounded.scriptSha256,expectedBrowser); assert.equal(bounded.cleanupPerformed,false); assert.ok(bounded.freeBytes>=bounded.minimumFreeBytes); assert.ok(bounded.minimumFreeBytes>bounded.expectedArtifactAndProfileBudgetBytes); assert.equal(bounded.priorFiles.reduce((sum,file)=>sum+file.bytes,0),bounded.priorArtifactsBytes);
const visual=read('visual-review.json'), rootReview=read('root-visual-review.json');
assert.equal(visual.approved,true); assert.equal(visual.nativeExitCode,0); assert.equal(visual.browserClosedByFinally,true); assert.deepEqual(visual.materialIssues,[]);
assert.equal(visual.sourceSha256,expectedSource); assert.equal(visual.scriptSha256,expectedBrowser); assert.equal(visual.browserResultsSha256,hash(here('browser-results.json')));
assert.equal(rootReview.passed,true); assert.equal(rootReview.sourceSha256,expectedSource); assert.equal(rootReview.scriptSha256,expectedBrowser);
assert.equal(rootReview.browserResultsSha256,hash(here('browser-results.json'))); assert.equal(visual.boundedPreflightSha256,hash(here('browser-bounded-preflight.json'))); assert.deepEqual(rootReview.materialIssues,[]);
const shots=['same-current-summaries-1280.png','same-current-summaries-390.png','same-current-summaries-320.png','sensor-probe-summaries-320.png','saved-summaries-200pct-text-320.png','forced-colors-saved-summaries-320.png','rtl-saved-summaries-320.png','localized-saved-summaries-320.png'];
assert.deepEqual(rootReview.reviewed.slice().sort(),shots.slice().sort()); assert.deepEqual(browser.screenshots.map(row=>row.file).sort(),shots.slice().sort());
for (const name of shots) { const bytes=fs.readFileSync(here(name)); assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a'); assert.equal(digest(bytes),rootReview.screenshotSha256[name]); const ui=visual.screenshots.find(row=>row.file===name); assert.ok(ui); assert.equal(ui.reviewed,true); assert.equal(ui.sha256,digest(bytes)); }
const paths=[source,mirror,...Object.keys(counts),'reports/circuit-observation-summary-2026-10-03','reports/circuit-observation-summary-pairs-2026-10-03'];
const git=args=>spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});
const diff=git(['diff','--check','--',...paths]); assert.equal(diff.status,0,diff.stdout+diff.stderr);
const staged=git(['diff','--cached','--name-only','--',...paths]); assert.equal(staged.status,0); assert.equal(staged.stdout.trim(),'');
const textFiles=fs.readdirSync(__dirname,{recursive:true}).filter(name=>/\.(?:json|md|cjs|js|log)$/.test(name));
for(const name of textFiles) { const text=new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync(here(name))); assert.ok(!text.includes('\uFFFD'),name+' contains replacement characters'); }
const result={passed:true,sourceSha256:expectedSource,mirrorSha256:expectedSource,byteExactPriorSourcePreserved:true,independentSourceReview:true,regression:{tests:51,files:3,newCases:10},browser:{views:8,focus:16,nativeDisclosures:2,recordToNote:1,rtlWidth:320},screenshotsReviewedByRoot:8,gitDiffCheck:true,scopedChangesUnstaged:true,artifacts:Object.fromEntries(['source-preservation.json','independent-review.json','regression-raw.json','regression-receipt.json','browser-results.json','visual-review.json','root-visual-review.json','validate.cjs'].map(name=>[name,hash(here(name))]))};
fs.writeFileSync(here('validation.json'),JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result,null,2));
