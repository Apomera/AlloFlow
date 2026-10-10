const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-replay-contact-2026-10-10'),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const verification=JSON.parse(fs.readFileSync(path.join(report,'verification.json'),'utf8')),labels=Object.keys(verification.runs),unit=labels.find(label=>label.startsWith('unit-')),browser=labels.find(label=>label.startsWith('browser-')),regression=labels.find(label=>label.startsWith('regression-'));
assert.equal(verification.runs[unit].passed,44);assert.equal(verification.runs[browser].expected,4);assert.equal(verification.runs[regression].expected,4);
assert.equal(hash(fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js'))),verification.sourceSha256);
const review=JSON.parse(fs.readFileSync(path.join(report,'visual-review.json'),'utf8'));assert.equal(review.browserRun,browser);assert.equal(review.inspected.length,8);
const incomplete=Object.values(verification.audits).map(audit=>audit.incomplete.length);
const readme=`# Dissection Lab: clearer replay contacts

Completed locally October 10, 2026. Receipts use UTC. Changes remain uncommitted.

## Improvements

- Replay now places inspection, forceps, pin, probe, dropper, and wick actions at each action's own recorded contact. It no longer substitutes the final procedure's contact for an earlier action. Recorded cutting paths retain their existing behavior.
- Saved and supported contacts are labeled **SAVED POSITION** and **SUPPORTED POSITION**. Legacy or invalid contacts use the teaching guide and display **TEACHING POSITION**. Paused review adds a readable explanation beside its controls, including “Illustrative position; contact not recorded.”
- Pending forceps and pin targets are hidden during a matching active replay, so they do not compete with the action being reviewed. Normal tool guidance returns after Stop or expiry. Mismatched, expired, and quiz replays do not suppress guidance.
- New inspection clicks retain their actual contact. Direct probe drags retain their endpoint, and supported probe buttons record the selected organ position with supported provenance. Missing direct contacts remain illustrative.
- Position captions can wrap over three rows. Existing 16px/18px review typography, responsive controls, high contrast, and forced-color focus remain available.

## Final validation

| Check | Result | Receipt |
| --- | --- | --- |
| Focused unit checks | ${verification.runs[unit].passed} passed: 26 contact/record-writer cases, 15 prior review cases and 3 existing instrument/UI checks; ${verification.runs[unit].excluded} other cases excluded by filter | [${unit}](${unit}/run.json) |
| New native contact scenarios | Four Chromium layouts passed, zero retries | [${browser}](${browser}/run.json) |
| Existing native review regressions | Four passed, zero retries | [${regression}](${regression}/run.json) |
| Scoped axe scans | Zero violations in four layouts; ${incomplete.every(count=>count===0)?'no incomplete rules':'incomplete counts: '+incomplete.join(', ')} | [verification](verification.json) |
| Source parity and syntax | Canonical/runtime bytes match; source parses | [verification](verification.json) |
| Prior work | ${verification.protectedFilesUnchanged} protected files unchanged; all ${verification.sourceReversalEdits} edits reverse exactly to baseline | [verification](verification.json) |

The new browser checks use desktop motion, a 320px reduced-motion phone, a 390px forced-color phone, and a 320px embedded view with Large text and High contrast. They inspect actual native canvas drawing positions, per-action labels, paused controls, saved state, and pending forceps/pin hints before, during, and after replay. All eight final panel/canvas captures were inspected. See [visual review](visual-review.json) and [captures](${browser}/captures).

## Run history and limits

- The first guarded source save encountered a full C: drive. Atomic replacement left both production copies at baseline. Cleanup removed 1.852MiB from this chat's inactive prior replay-review test temporary directory; report artifacts and shared files were preserved. External free capacity later recovered, allowing the pass to finish.
- unit-2 caught an existing exact-prefix source contract after adding a probe contact. Reordering the payload fields restored that contract without changing behavior or the protected test.
- regression-1 lost its terminal session after two logged passes. It has no final exit/result receipt and is excluded from completion evidence. [Interruption receipt](regression-1/interruption.json). The accepted regression run repeats all four scenarios.
- browser-1 passed desktop and caught a fixture collection issue after axe on the reduced-motion phone: clearing captured drawing records discarded the correctly held static frame. The fixture retains the current native frame and clears records before state-changing actions, keeping geometry and label assertions strict.
- Every accepted receipt pins its source and test inputs before and after the run. Retained failed/interrupted attempts are not completion evidence.
- Writer unit cases execute extracted production action, calibration, record-writing and drag-finalization functions with unrelated presentation, scenario and tissue effects isolated. They do not claim a full plugin interaction. This is focused component/browser verification, not a full application build or a screen-reader audit. Contact labels describe the available recorded evidence; saved pressure remains simulation evidence.

## Reproducibility and ownership

Source SHA256: \`${verification.sourceSha256}\`.

Exact edits, compressed baseline/final sources and tests, raw test logs, captures, and runner scripts are retained. Baseline HEAD: \`${verification.baselineHead}\`; final HEAD: \`${verification.finalHead}\`. No commits affecting this pass's owned source/test scope were detected. Index names match baseline. No staging, commit, push, or deployment was performed.
`;
fs.writeFileSync(path.join(report,'README.md'),readme);
const handoffPath=path.join(repo,'AGENT_HANDOFF.md'),handoff=fs.readFileSync(handoffPath,'utf8'),prior=JSON.parse(fs.readFileSync(path.join(report,'edits/handoff-start.json'),'utf8')).row;
assert.equal(handoff.split(prior).length,2,'unique ownership row');
const row='- 2026-10-10 | Codex Dissection replay contact | COMPLETE LOCALLY; ownership RELEASED. Each action uses its recorded contact, readable saved/supported/illustrative provenance, forceps/pin hint suppression during replay, and new inspect/probe contact preservation. '+verification.runs[unit].passed+' focused unit checks and eight Chromium scenarios pass; four scoped axe scans have zero violations. Source/runtime SHA256 '+verification.sourceSha256+'. '+verification.protectedFilesUnchanged+' protected files unchanged; '+verification.sourceReversalEdits+' edits reverse to baseline. Report reports/dissection-replay-contact-2026-10-10/README.md. No staging, commit, push or deployment.';
const after=handoff.replace(prior,row);assert.equal(after.replace(row,prior),handoff);assert.equal(fs.readFileSync(handoffPath,'utf8'),handoff,'handoff unchanged before save');
const temp=handoffPath+'.replay-contact.tmp';fs.writeFileSync(temp,after,{flag:'wx'});fs.renameSync(temp,handoffPath);
fs.writeFileSync(path.join(report,'edits/handoff-finish.json'),JSON.stringify({at:new Date().toISOString(),beforeHash:hash(handoff),afterHash:hash(after),beforeRow:prior,afterRow:row,unrelatedRowsPreserved:true},null,2)+'\n');
fs.mkdirSync(path.join(report,'scripts'),{recursive:true});for(const name of fs.readdirSync(__dirname).filter(name=>name.endsWith('.cjs')))fs.copyFileSync(path.join(__dirname,name),path.join(report,'scripts',name));
const manifest={};function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(file!==path.join(report,'manifest.json'))manifest[path.relative(report,file).replaceAll('\\','/')]=hash(fs.readFileSync(file));}}
walk(report);fs.writeFileSync(path.join(report,'manifest.json'),JSON.stringify({at:new Date().toISOString(),files:manifest},null,2)+'\n');
console.log(JSON.stringify({report,manifestFiles:Object.keys(manifest).length,handoffUpdated:true}));
