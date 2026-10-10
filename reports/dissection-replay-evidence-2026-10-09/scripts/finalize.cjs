const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/dissection-replay-evidence-2026-10-09');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const verification = JSON.parse(fs.readFileSync(path.join(report, 'verification.json'), 'utf8'));
assert.equal(verification.runs['unit-10'].passed, 14);
assert.equal(verification.runs['browser-9'].expected, 4);
assert.equal(hash(fs.readFileSync(path.join(repo, 'stem_lab/stem_tool_dissection.js'))), verification.sourceSha256);
function luminance(hex) {
  const rgb = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
const source = fs.readFileSync(path.join(repo, 'stem_lab/stem_tool_dissection.js'), 'utf8');
for (const color of ['#f0fdfa', '#f8fbff', '#334155', '#244744']) assert(source.includes(color));
const contrastReview = {
  method: 'Supplemental source-color calculation; not a replacement axe result or computed-style browser measurement.',
  gradient: ['#f0fdfa', '#f8fbff'], conservativeChannelMinimum: '#f0fbfa',
  ratios: { replayHelp: contrast('334155', 'f0fbfa'), existingTechniqueNote: contrast('244744', 'f0fbfa'), highContrastReplayHelp: contrast('000000', 'f0fbfa') },
  scope: 'The two text nodes flagged by axe for an indeterminate gradient background. Raw incomplete results remain recorded.',
};
fs.writeFileSync(path.join(report, 'contrast-review.json'), JSON.stringify(contrastReview, null, 2) + '\n');
const readme = `# Dissection Lab: replay evidence and readable captions

Completed locally on October 9, 2026 (test receipts use October 10 UTC). Changes remain uncommitted.

## Improvements

- Replay distinguishes saved paths, supported paths, and illustrative teaching paths. Earlier repeated actions cannot borrow the latest saved stroke, and scissors never borrows an incision path.
- Missing or invalid saved pressure displays **PRESSURE NOT RECORDED**. Missing instrument calibration displays **SETTING NOT RECORDED**. Zero remains a valid recorded value. Replay does not substitute current settings or invented display readings.
- Supported actions and legacy paths with unknown input do not receive a direct-input alignment verdict.
- Captions use responsive text, wrapping, and the existing canvas panel placement logic. They are painted after anatomy effects and avoid anatomy labels and visible HUD panels in the checked layouts. Independent replay can use the corner where the hidden next-step card would otherwise reserve space.
- A readable explanation beside Replay attempt is also its accessible description. Native keyboard activation, saved work, and replay expiration are preserved.

## Final validation

| Check | Result | Receipt |
| --- | --- | --- |
| Focused unit cases | 14 passed, 0 failed | [unit-10](unit-10/run.json) |
| Native Chromium scenarios | 4 passed, 0 failed | [browser-9](browser-9/run.json) |
| Scoped axe scans | 0 violations in all four; 3 scans retain a contrast incomplete rule | [verification](verification.json) |
| Canonical/runtime bytes and syntax | Match; parse succeeds | [verification](verification.json) |
| Prior work preservation | 712 protected files unchanged; 35 source edits and the two existing unit wording changes reverse exactly to the baseline | [verification](verification.json) |

The browser cases cover a 320px legacy attempt, desktop saved path without pressure, 390px forced colors with saved 50% pressure, and a 320px embedded view using large text/high contrast with supported input. Checks exercise keyboard focus/activation, accessible description, 16/18px help, no control overflow, at least 12 CSS pixel replay text, caption bounds, zero overlap with every recorded anatomy guidance/HUD box, saved state preservation, and replay timer cleanup.

Final screenshots inspected: all four canvas captures plus desktop and embedded large-text controls in [browser-9/captures](browser-9/captures). Earlier captures document the refinement history.

The three axe incomplete rules concern text on a gradient background. Supplemental conservative source-color ratios are at least 9.80:1 for replay guidance, 9.65:1 for the existing technique note, and 19.88:1 for high-contrast guidance. See [contrast review](contrast-review.json); raw incompletes are retained.

## Run history and limits

- unit-1 (12 cases) and unit-5 (2 cases) passed the first implementation. unit-3 aborted with a V8 memory allocation failure and contributes no passing evidence. unit-6 passed before the final caption reservation correction.
- browser-2 failed because the fixture activated replay with its canvas off screen. The fixture now scrolls the canvas into view and waits for the native visibility observer before advancing its clock.
- browser-4 passed the initial assertions; visual review then identified an unreadable overlapping caption. browser-7 passed the initial geometry checks, but ordinary anatomy labels were not covered by those assertions. Both are superseded by stricter checks.
- browser-8 passed three scenarios and correctly detected the remaining large-text collision. browser-9 passes all four with that collision corrected. No product assertions were removed to obtain the pass.
- Two Windows file-open errors occurred during the final source write; an atomic save succeeded after validating the prior source hash. No unrelated files were removed.
- Pressure values represent saved simulation samples. Existing input normalization can supply simulated pressure; this pass does not establish hardware pressure fidelity.
- This is focused component/browser validation, not a full application build, screen-reader audit, or deployment check. Dense combinations beyond the tested layouts still rely on the existing best-fit placement algorithm.

## Reproducibility and ownership

Final source SHA256: \`${verification.sourceSha256}\`.
Input hashes, exact edit records, compressed final sources/tests, runner scripts, raw test logs, and captures are retained here. Git HEAD advanced concurrently from \`${verification.baselineHead}\` to \`${verification.finalHead}\`; the verifier found no commits affecting the owned source/test scope. The index remained empty. This task did not stage, commit, push, or deploy.
`;
fs.writeFileSync(path.join(report, 'README.md'), readme);
const handoffPath = path.join(repo, 'AGENT_HANDOFF.md');
const handoff = fs.readFileSync(handoffPath, 'utf8');
const prior = JSON.parse(fs.readFileSync(path.join(report, 'edits/handoff-start.json'), 'utf8')).row;
assert.equal(handoff.split(prior).length, 2, 'unique ownership row');
const row = '- 2026-10-09 | Codex Dissection replay evidence | COMPLETE LOCALLY; ownership RELEASED. Saved/supported/teaching paths are explicit; missing pressure and settings stay unrecorded. Responsive replay captions wrap and avoid anatomy/HUD text in four checked layouts. Native keyboard replay preserves work. 14 final unit cases and four Chromium scenarios pass; four scoped axe scans have zero violations, three gradient contrast incompletes retain supplemental source-color evidence. Source/runtime SHA256 ' + verification.sourceSha256 + '. 712 protected files and exact baseline reversals verified. Report reports/dissection-replay-evidence-2026-10-09/README.md records visual fixes and environment failures. No staging, commit, push or deployment.';
const after = handoff.replace(prior, row);
fs.writeFileSync(handoffPath, after);
assert.equal(after.replace(row, prior), handoff);
fs.writeFileSync(path.join(report, 'edits/handoff-finish.json'), JSON.stringify({ at: new Date().toISOString(), beforeHash: hash(handoff), afterHash: hash(after), beforeRow: prior, afterRow: row, unrelatedRowsPreserved: true }, null, 2) + '\n');
fs.mkdirSync(path.join(report, 'scripts'), { recursive: true });
for (const name of ['run.cjs', 'run-extra.cjs', 'run-final.cjs', 'caption.cjs', 'caption-wrap.cjs', 'caption-reserve.cjs', 'finalize.cjs']) fs.copyFileSync(path.join(__dirname, name), path.join(report, 'scripts', name));
const manifest = {};
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (file !== path.join(report, 'manifest.json')) manifest[path.relative(report, file).replaceAll('\\', '/')] = hash(fs.readFileSync(file)); } }
walk(report);
fs.writeFileSync(path.join(report, 'manifest.json'), JSON.stringify({ at: new Date().toISOString(), files: manifest }, null, 2) + '\n');
console.log(JSON.stringify({ report, manifestFiles: Object.keys(manifest).length, handoffUpdated: true, contrastReview }, null, 2));
