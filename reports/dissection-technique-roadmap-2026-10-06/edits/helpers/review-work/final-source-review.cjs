const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const vm = require('vm');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-technique-roadmap-2026-10-06');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const bytes = fs.readFileSync(path.join(repo, 'stem_lab/stem_tool_dissection.js'));
const source = bytes.toString();
const manifest = JSON.parse(fs.readFileSync(path.join(report, 'edits/renderer-edits.json')));
if (process.argv[2] === 'inspect') {
  const lines = source.split('\n');
  for (const [start,end] of [[18250,18270],[5849,5886],[18656,18694]]) {
    console.log(lines.slice(start-1,end).map((line,i) => `${start+i}: ${line}`).join('\n'));
  }
} else {
  let reversed = source;
  const edits = [...manifest.edits].reverse().map(edit => {
    if (reversed.split(edit.after).length !== 2) throw Error('Ambiguous inverse: ' + edit.name);
    reversed = reversed.replace(edit.after, () => edit.before);
    return edit.name;
  });
  const baselineHash = hash(Buffer.from(reversed));
  if (baselineHash !== manifest.beforeSha256) throw Error('Inverse baseline mismatch');
  if (reversed !== zlib.gunzipSync(fs.readFileSync(path.join(report, 'edits/renderer-baseline.js.gz'))).toString()) throw Error('Baseline archive differs');
  const expected = '9b77f87c70bd2789cdd450bff5d371bfd81d2973abf12c491706da7fbbf78a3a';
  if (hash(bytes) !== expected || manifest.afterSha256 !== expected) throw Error('Source pin mismatch');
  const mirror = fs.readFileSync(path.join(repo, 'desktop/web-app/public/stem_lab/stem_tool_dissection.js'));
  if (!bytes.equals(mirror)) throw Error('Source/public mismatch');
  const beforeContrast = zlib.gunzipSync(fs.readFileSync(path.join(report, 'edits/renderer-before-contrast-fix.js.gz')));
  const contrastEdit = manifest.edits.at(-1);
  if (source.replace(contrastEdit.after, () => contrastEdit.before) !== beforeContrast.toString()) throw Error('Contrast-only inverse mismatch');
  if (hash(beforeContrast) !== '1d10e56b0d969ccbda290bfbdb884a9c22d8586fe92f51e2c6ea4d2290c28a9b') throw Error('Prior source mismatch');
  const beforeFont = zlib.gunzipSync(fs.readFileSync(path.join(report, 'edits/renderer-before-font-fix.js.gz')));
  const fontEdit = manifest.edits.at(-2);
  if (beforeContrast.toString().replace(fontEdit.after, () => fontEdit.before) !== beforeFont.toString()) throw Error('Font-only inverse mismatch');
  new vm.Script(source);
  const receipt = {reviewType:'Independent final static preservation review',reviewedAtUtc:new Date().toISOString(),verdict:'pass',openFindings:[],sourceSha256:expected,publicSha256:hash(mirror),baselineSha256:baselineHash,editCount:edits.length,exactInverse:true,exactBaselineArchiveMatch:true,sourcePublicParity:true,fontDelta:{beforeSha256:hash(beforeFont),afterSha256:hash(beforeContrast),exactInverse:true,cssOnly:true,before:fontEdit.before,after:fontEdit.after},contrastDelta:{beforeSha256:hash(beforeContrast),afterSha256:expected,exactInverse:true,cssOnly:true,before:contrastEdit.before,after:contrastEdit.after},syntax:true,checks:[
    {name:'Learning and scoring preservation',status:'pass',evidence:'All bytes outside the 9 declared edits match the baseline archive. Native gate, action completion, scoring, saved fields, handlers, and protocol definitions are unchanged.'},
    {name:'Roadmap count and status',status:'pass',evidence:'Count uses procedureLearningSummary. Rows use its same physical-action plus predictionCorrect plus reflectionCorrect predicate. Current action uses the required native gate before the next physical action. Required reflect takes precedence over missing plan flags, matching the native gate.'},
    {name:'Legacy and incomplete records',status:'pass',evidence:'The unchanged procedureLearningEntry treats completed actions with no learningChecks record as legacy verified. Records with a checks object retain their actual evidence. Physically complete noncurrent actions with incomplete evidence read Recorded action; evidence incomplete. Cached correct flags without completed action cannot verify a row.'},
    {name:'Information-only disclosure',status:'pass',evidence:'The new renderer reads derived values and emits native details/summary/list/progress markup. It has no event handlers, state updates, timers, action calls, scoring calls or new saved fields.'},
    {name:'Visibility and native actions',status:'pass',evidence:'The new call is inside the existing procedureLearningCheckpointVisible guard. Guided, Study, quiz/practical, revealed-layer visibility logic and all action/Undo handlers remain byte-identical.'},
    {name:'Presentation changes',status:'pass',evidence:'Review heading avoids claiming completion. Two existing labelled phase containers gain group semantics. Progress CSS and inherited font sizing are scoped to the roadmap. The ninth edit changes only high-contrast progress CSS to black fill, white track and a 1px black outline. This gives both completed progress and the empty track a visible boundary on the white card without changing progress values or semantics.'}
  ],reviewerActions:{applicationWrites:false,testWrites:false,packageWrites:false,suitesRun:false,commits:false},limits:'Static source review only; this receipt does not claim browser, screen-reader or test-suite results.'};
  if (process.argv[2] === 'save') {
    const output=path.join(__dirname,'roadmap-final-preservation-review.json');
    if(fs.existsSync(output)) { const previous=fs.readFileSync(output);const previousReview=JSON.parse(previous);if(previousReview.sourceSha256!==expected)fs.writeFileSync(path.join(__dirname,'roadmap-final-preservation-review-'+previousReview.sourceSha256.slice(0,12)+'.json'),previous); }
    fs.writeFileSync(output, JSON.stringify(receipt,null,2)+'\n');
  }
  console.log(JSON.stringify(receipt, null, 2));
}
