'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const repo = process.env.WC_REPO || 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const scratch = __dirname;
const reportRoot = path.join(repo, 'reports/watercycle-hydro-readability');
const qaLabel = process.argv[2] || 'qa-final';
const unitLabel = process.argv[3] || 'unit-node';
if (![qaLabel, unitLabel].every(value => /^[a-z0-9-]+$/.test(value))) throw Error('Safe QA and unit labels required');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(path.join(scratch, file), 'utf8'));

// A complete, source-bound pass is required before creating or changing the report.
execFileSync(process.execPath, [path.join(scratch, 'verify.cjs'), '--preflight', '--qa-label=' + qaLabel, '--unit-label=' + unitLabel], {
  stdio: 'inherit', env: { ...process.env, WC_REPO: repo }, windowsHide: true,
});
const manifest = read('presentation-changes.json');
const unit = read(unitLabel + '-receipt.json');
const browser = read(qaLabel + '/results.json');
if (fs.existsSync(reportRoot)) {
  if (!fs.existsSync(path.join(reportRoot, 'artifact-hashes.json'))) throw Error('Existing incomplete report requires review; preserving its files');
  const existing = JSON.parse(fs.readFileSync(path.join(reportRoot, 'artifact-hashes.json'), 'utf8'));
  if (existing.sourceSha256 !== manifest.sourceSha256) throw Error('Existing report belongs to another runtime; preserving it');
  execFileSync(process.execPath, [path.join(reportRoot, 'verify.cjs')], { stdio: 'inherit', env: { ...process.env, WC_REPO: repo }, windowsHide: true });
  console.log(JSON.stringify({ successful: true, alreadyPackaged: true, sourceSha256: manifest.sourceSha256 }));
  process.exit(0);
}

const browserFolder = manifest.sourceSha256.slice(0, 12) + '-final';
const inputs = [];
for (const [from, to] of [
  ['candidate-runtime.js', 'candidate-runtime.js'],
  ['hydro.css', 'hydro.css'],
  ['presentation-changes.json', 'presentation-changes.json'],
  ['verify.cjs', 'verify.cjs'],
  ['package-report.cjs', 'tested-package-script.cjs'],
  [unitLabel + '-receipt.json', 'unit-receipt.json'],
  [unitLabel + '-results.json', 'unit-results.json'],
  [unitLabel + '-run.log', 'unit-run.log'],
]) inputs.push({ to, bytes: fs.readFileSync(path.join(scratch, from)) });
const sourceVerifier = fs.readFileSync(path.join(scratch, 'verify-source.cjs'), 'utf8');
const originalRepo = "process.env.WC_REPO||'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated'";
if (sourceVerifier.indexOf(originalRepo) < 0 || sourceVerifier.indexOf(originalRepo) !== sourceVerifier.lastIndexOf(originalRepo)) throw Error('Portable source verifier anchor differs');
inputs.push({ to: 'verify-source.cjs', bytes: Buffer.from(sourceVerifier.replace(originalRepo, "process.env.WC_REPO||path.resolve(__dirname,'../..')")) });

const frozenInputs = new Map();
for (const stamp of [...unit.testsBefore, ...unit.supportBefore]) {
  const bytes = fs.readFileSync(path.join(repo, stamp.file));
  if (hash(bytes) !== stamp.sha256) throw Error('Native test/support changed before freeze: ' + stamp.file);
  const filename = path.basename(stamp.file);
  if (frozenInputs.has(filename) && hash(frozenInputs.get(filename)) !== stamp.sha256) throw Error('Conflicting native input basenames');
  frozenInputs.set(filename, bytes);
}
for (const kind of ['runner', 'config']) {
  const filename = unit[kind + 'File'], bytes = fs.readFileSync(path.join(scratch, filename));
  if (filename !== path.basename(filename) || hash(bytes) !== unit[kind + 'Sha256']) throw Error('Native ' + kind + ' changed before freeze');
  if (frozenInputs.has(filename)) throw Error('Conflicting runner/config basename');
  frozenInputs.set(filename, bytes);
}
for (const [filename, bytes] of frozenInputs) inputs.push({ to: 'unit-inputs/' + filename, bytes });

const browserFiles = ['results.json', 'tested-harness.cjs', ...browser.captures.map(capture => capture.file)];
if (fs.existsSync(path.join(scratch, qaLabel, 'progress.json'))) browserFiles.push('progress.json');
if (new Set(browserFiles).size !== browserFiles.length) throw Error('Duplicate browser artifacts');
for (const filename of browserFiles) {
  if (filename !== path.basename(filename)) throw Error('Unsafe browser artifact name');
  const absolute = path.join(scratch, qaLabel, filename);
  if (!fs.lstatSync(absolute).isFile() || fs.lstatSync(absolute).isSymbolicLink()) throw Error('Browser artifact must be a regular file');
  inputs.push({ to: browserFolder + '/' + filename, bytes: fs.readFileSync(absolute) });
}
const readme = `# Hydro Quest readability

The six mission cards now use larger labels, clear Open and Complete states, and a visible completion count beside the Hydro Points progress. The panel uses a stable paper surface matched to the actual renderer theme, including high contrast. Mission requirements, point values, ranks, learner records and reward behavior are preserved.

## Layout

The mission grid follows the panel's available width: one column below 560 CSS pixels, two from 560 pixels, and three from 900 pixels. The rank label and mission names use at least 15px text; supporting labels use at least 13px. The rank is a paragraph label within the existing named mission section. The progress track is at least 10px high. Whole words remain intact at narrow widths and 150% CSS zoom. Completed cards retain text and check marks, with a double border in forced colors.

All visible panel text clears 4.5:1 contrast in the reviewed matrix. The completion status remains visible and retains its polite live announcement and progressbar values.

## Scope and validation

Runtime SHA256: ${manifest.sourceSha256}

The three recorded source slices reverse exactly to the preceding ray-lab runtime ${manifest.baselineSha256}. They add one local theme attribute, make the rank a paragraph label with its existing text, and append scoped presentation styles. Both installed runtime copies match. The water model, mission evidence calculation, native view controls, reward callbacks and saved records remain unchanged by this enhancement.

- ${unit.passed} passing existing Hydro Quest source-contract regressions, with no failed or skipped tests. The unchanged test file, actual runner and minimal Node configuration are frozen in unit-inputs. The Node configuration avoids the general DOM setup for these filesystem checks.
- ${browser.passed} passing browser checks, 16 native keyboard view actions and eight scoped accessibility audits with zero violations.
- Eight final captures and two matched baseline captures cover desktop light and dark, 320px phones, a narrow desktop host, high contrast, forced colors and 150% CSS zoom.
- Frozen native evidence fixtures cover zero, three and six completed missions. Their mission names, requirements, ranks, points, accessible labels and spoken status match the preceding runtime exactly.
- Switching to System Map and back to Droplet Journey retains all other learner data, awards, the paused parcel and the underlying canvas. The parcel checks wait for numeric progress reported by the actual engine. Returning to 3D restores the exact prior snapshot and mission semantics.

The browser harness retains the actual THREE renderer and omits GPU drawing during panel checks. Model, input and frame loop remain active during native actions. After those actions, the exact rendered panel DOM and ancestor styles are copied and the engine is unmounted for capture. Screenshots contain the mission panel and exclude WebGL pixels. They use measured bounds, with a 2360px maximum panel height. Browser and local QA server cleanup both completed. Startup diagnostics remain in the task scratch folder and are excluded from passing counts.

## Verify

Run node reports/watercycle-hydro-readability/verify.cjs from the repository. Add --snapshot-only to validate archived evidence after later enhancements. The verifier checks the artifact inventory, exact source reversal, four native assertions, pinned native inputs, mission semantics, initialized native progress and state retention, text containment within each label and card, fonts and contrast, accessibility audits and all ten PNG receipts.

To repeat the browser matrix, run dev-tools/watercycle_hydro_readability_qa.cjs with --expected-sha=<current source hash> and a fresh --out=<folder>. WC_BROWSER_EXECUTABLE can select a compatible installed Chromium binary.

All changes remain uncommitted.
`;
inputs.push({ to: 'README.md', bytes: Buffer.from(readme) });
if (new Set(inputs.map(input => input.to)).size !== inputs.length) throw Error('Duplicate packaged artifact names');
for (const input of inputs) {
  const absolute = path.resolve(reportRoot, input.to);
  if (!absolute.startsWith(path.resolve(reportRoot) + path.sep)) throw Error('Packaged artifact escaped report root');
}

// Freeze only after all reads, receipt checks and path checks succeeded.
fs.mkdirSync(reportRoot, { recursive: false });
for (const input of inputs) {
  const absolute = path.join(reportRoot, input.to);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, input.bytes, { flag: 'wx' });
}
const artifacts = inputs.map(input => ({ file: input.to, bytes: input.bytes.length, sha256: hash(input.bytes) })).sort((a, b) => a.file.localeCompare(b.file));
const inventory = {
  sourceSha256: manifest.sourceSha256, baselineSha256: manifest.baselineSha256,
  browserResults: browserFolder + '/results.json', regressionTests: unit.passed, browserChecks: browser.passed,
  totalBytes: artifacts.reduce((n, artifact) => n + artifact.bytes, 0), artifacts,
};
fs.writeFileSync(path.join(reportRoot, 'artifact-hashes.json'), JSON.stringify(inventory, null, 2) + '\n', { flag: 'wx' });
execFileSync(process.execPath, [path.join(reportRoot, 'verify.cjs')], { stdio: 'inherit', env: { ...process.env, WC_REPO: repo }, windowsHide: true });
console.log(JSON.stringify({ successful: true, sourceSha256: manifest.sourceSha256, regressionTests: unit.passed, browserChecks: browser.passed, artifacts: artifacts.length, totalBytes: inventory.totalBytes }));
