const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-replay-review-2026-10-09');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const verification = JSON.parse(fs.readFileSync(path.join(report, 'verification.json'), 'utf8'));
const unit = Object.keys(verification.runs).find(label => label.startsWith('unit-'));
const browser = Object.keys(verification.runs).find(label => label.startsWith('browser-'));
assert.equal(verification.runs[unit].passed, 18); assert.equal(verification.runs[browser].expected, 4);
assert.equal(hash(fs.readFileSync(path.join(repo, 'stem_lab/stem_tool_dissection.js'))), verification.sourceSha256);
const visualReview = JSON.parse(fs.readFileSync(path.join(report, 'visual-review.json'), 'utf8'));
assert.equal(visualReview.browserRun, browser); assert.equal(visualReview.inspected.length, 8);
const incomplete = Object.values(verification.audits).map(audit => audit.incomplete.length);
const readme = `# Dissection Lab: learner-controlled action review

Work began October 9 and completed locally October 10, 2026. Receipts use UTC. Changes remain uncommitted.

## Improvements

- **Review actions** opens the first recorded action paused, showing its full stroke. Previous and Next hold each action for inspection; Resume continues from the selected action. Automatic Replay attempt also supports pause and navigation.
- A panel directly below the specimen shows the action number, name, and playback state. Its 16px text becomes 18px with Large text. Controls wrap in narrow views and have at least 44px height. High contrast and forced colors retain readable borders and focus.
- Launch brings the specimen into view and focuses the replay toggle. Boundary navigation retains a usable focus target. Stop and Escape return to the launch control, or to the visible Technique practice summary when its panel is closed. Native timer completion retains focus through intervening presentation renders.
- Review cancels an active teaching demonstration. New actions, view/layer changes, and fullscreen entry end review so its overlay cannot conflict with the new interaction. Existing recorded evidence, notes, and progress are preserved.
- Held actions retain the existing saved/supported/teaching path labels and honest missing-pressure wording.

## Final validation

| Check | Result | Receipt |
| --- | --- | --- |
| Focused unit checks | 18 passed: 15 new timing/navigation cases and 3 existing instrument/UI regressions; 239 other cases excluded by filter | [${unit}](${unit}/run.json) |
| Native Chromium scenarios | 4 passed, 0 failed, 0 retries | [${browser}](${browser}/run.json) |
| Scoped axe scans of review controls | Zero violations in all four; ${incomplete.every(count => count === 0) ? 'no incomplete rules' : 'incomplete rule counts: ' + incomplete.join(', ')} | [verification](verification.json) |
| Canonical/runtime parity and syntax | Bytes match; source parses | [verification](verification.json) |
| Prior work | ${verification.protectedFilesUnchanged} protected files unchanged; ${verification.sourceReversalEdits} source edits reverse exactly to baseline | [verification](verification.json) |

The browser cases use desktop motion, a 320px reduced-motion phone, a 390px forced-color phone, and a 320px embedded view with Large text and High contrast. They check native keyboard launch, pause/hold/navigation/resume, caption evidence and bounds, focus at boundaries and completion, Stop/Escape, collapsed-panel fallback, demonstration cancellation, fullscreen entry/exit, view/layer cancellation, and complete saved-state equality excluding elapsed time and transient replay/feedback.

All eight final panel and canvas captures were inspected. See [visual review](visual-review.json) and [captures](${browser}/captures). Raw axe results remain available; focused scans do not establish whole-app accessibility.

## Retained run history and limits

- unit-1 passed 17 checks and caught a changed replay entry signature. The original entry function is retained as a wrapper. unit-2 through unit-5 pass all 18 checks on their respective pinned inputs; only the final pinned run is completion evidence.
- browser-2 caught specimen launch remaining off screen. The focus callback now queries the live canvas after render.
- browser-3 timed out because axe was run while the fixture clock was paused. Axe now runs with the clock advancing while the review itself stays paused.
- browser-4 passed desktop and caught a fixture caption capture issue in reduced motion. The fixture now reads the latest actual static canvas draw, retaining wrapped rows and asserting the current step; it does not call internal redraw helpers.
- browser-5 was interrupted by a desktop session refresh after three logged cases. It has no final result or exit receipt and contributes no completion evidence; [interruption receipt](browser-5/interruption.json) retains recovery hashes. The final run repeats all four cases.
- browser-6 caught a fixture clock race: its post-axe pause target was only 100ms ahead and had passed before the browser received the request. The fixture uses a 60-second virtual-clock lead; pauseAt fast-forwards rather than waiting, and all replay/state assertions remain intact.
- Audit identified simultaneous teaching overlays, hidden return-focus targets, and fullscreen hiding the review controls. Final native checks cover their fixes.
- This is focused component/browser verification, not a full application build or a screen-reader audit. Saved pressure remains simulation evidence, as documented by the preceding replay-evidence pass.

## Reproducibility and ownership

Source SHA256: \`${verification.sourceSha256}\`.
Exact edit records, baseline/final compressed sources and tests, input hashes, raw logs, captures, and runner scripts are retained. Baseline HEAD: \`${verification.baselineHead}\`; final HEAD: \`${verification.finalHead}\`. No commits affecting this pass's owned source/test scope were detected. Index names are unchanged from baseline. No staging, commit, push, or deployment was performed.
`;
fs.writeFileSync(path.join(report, 'README.md'), readme);
const handoffPath = path.join(repo, 'AGENT_HANDOFF.md'), handoff = fs.readFileSync(handoffPath, 'utf8');
const prior = JSON.parse(fs.readFileSync(path.join(report, 'edits/handoff-start.json'), 'utf8')).row;
assert.equal(handoff.split(prior).length, 2, 'unique ownership row');
const row = '- 2026-10-09 | Codex Dissection replay review | COMPLETE LOCALLY; ownership RELEASED. Learner-controlled paused action review, readable responsive controls, native focus/return focus, demo cancellation and fullscreen cancellation. 18 final unit checks and four Chromium scenarios pass; four scoped axe scans have zero violations. Source/runtime SHA256 ' + verification.sourceSha256 + '. ' + verification.protectedFilesUnchanged + ' protected files unchanged; ' + verification.sourceReversalEdits + ' source edits reverse to baseline. Report reports/dissection-replay-review-2026-10-09/README.md. No staging, commit, push or deployment.';
const after = handoff.replace(prior, row); assert.equal(after.replace(row, prior), handoff);
assert.equal(fs.readFileSync(handoffPath, 'utf8'), handoff, 'handoff unchanged before atomic save');
const temp = handoffPath + '.replay-review.tmp'; fs.writeFileSync(temp, after); fs.renameSync(temp, handoffPath);
fs.writeFileSync(path.join(report, 'edits/handoff-finish.json'), JSON.stringify({ at: new Date().toISOString(), beforeHash: hash(handoff), afterHash: hash(after), beforeRow: prior, afterRow: row, unrelatedRowsPreserved: true }, null, 2) + '\n');
fs.mkdirSync(path.join(report, 'scripts'), { recursive: true });
for (const name of ['prepare.cjs', 'run.cjs', 'source.cjs', 'refine.cjs', 'focus.cjs', 'entry.cjs', 'focus-fix.cjs', 'completion-focus.cjs', 'demo-cancel.cjs', 'return-focus.cjs', 'fullscreen-cancel.cjs', 'clock-pause.cjs', 'record-interruption.cjs', 'visual-review.cjs', 'status.cjs', 'finalize.cjs']) {
  if (fs.existsSync(path.join(__dirname, name))) fs.copyFileSync(path.join(__dirname, name), path.join(report, 'scripts', name));
}
const manifest = {};
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (file !== path.join(report, 'manifest.json')) manifest[path.relative(report, file).replaceAll('\\', '/')] = hash(fs.readFileSync(file)); } }
walk(report); fs.writeFileSync(path.join(report, 'manifest.json'), JSON.stringify({ at: new Date().toISOString(), files: manifest }, null, 2) + '\n');
console.log(JSON.stringify({ report, manifestFiles: Object.keys(manifest).length, handoffUpdated: true }));
