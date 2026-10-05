const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const assert=require('assert/strict');
const repo=path.resolve(__dirname,'../..');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const resultPath=path.join(__dirname,'browser-results.json');
const result=JSON.parse(fs.readFileSync(resultPath,'utf8'));
const source='3424b78369802606dd709faf9c308c1d444b0d18633c69062a7e7486e5614453';
const script='3256297e1a9b898e210facc11ec4db2e071513bfa4b95a165660155785d5d56f';
assert.equal(result.passed,true);
assert.equal(result.screenshots.length,12);
assert.equal(result.sourceSha256,source);
assert.equal(result.sourceSha256AtEnd,source);
assert.equal(result.mirrorSha256AtEnd,source);
assert.equal(result.scriptSha256,script);
assert.equal(result.scriptSha256AtEnd,script);
assert.equal(sha(path.join(repo,'stem_lab/stem_tool_circuit.js')),source);
assert.equal(sha(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_circuit.js')),source);
assert.equal(sha(path.join(__dirname,'browser-check.cjs')),script);
const review={
  approved:true,
  sourceSha256:source,
  mirrorSha256:source,
  scriptSha256:script,
  browserResultsSha256:sha(resultPath),
  nativeSession:86617,
  nativeExitCode:0,
  browserClosedByFinally:true,
  method:'All 12 final PNGs inspected at original resolution with view_image. No browser rerun was performed for this review.',
  screenshots:result.screenshots.map(item=>({file:item.file,sha256:sha(path.join(__dirname,item.file)),reviewed:true,crop:item.crop})),
  materialIssues:[],
  observations:[
    'Desktop cards have clear step headings, balanced spacing and distinct notebook/map actions.',
    'All three selected lessons retain the same complete handoff at 320px; the 390px view and both notebook previews remain readable without clipped text or controls.',
    'At actual 200% text and 320px, all content and actions remain available. The word component wraps within the word in the narrow numbered text column; this is a minor visual limitation, not lost content.',
    'Forced-color borders, numbered steps and both actions remain visible. The RTL view retains the intended choose-then-compare order and mirrors the numbered layout.',
    'The notebook images show the header, planning fields and record controls. They do not claim visual review of the full observation list.'
  ],
  verificationSummary:{
    screenshots:12,
    axeScans:12,
    focusChecks:22,
    nativeNotebookOpenActions:6,
    lastTestTransition:1,
    lifecycleCases:2,
    localTwoInstanceCases:1,
    doubledFontMeasurements:21,
    forcedColorTextNodes:9,
    forcedColorMinimumRatio:21,
    rtlActualViewportWidth:320,
    errors:0,
    visualIssues:0
  },
  scopeNote:'The legacy fixed notebook ID is preserved. The two-instance check verifies local focus ownership only, not global ID uniqueness.'
};
const target=path.join(__dirname,'visual-review.json');
fs.writeFileSync(target,JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({file:path.relative(repo,target),sha256:sha(target),reviewed:review.screenshots.length,approved:review.approved}));

