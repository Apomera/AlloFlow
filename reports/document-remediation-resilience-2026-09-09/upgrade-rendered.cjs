'use strict';
const fs = require('node:fs');
const file = 'dev-tools/rendered_document_fidelity.cjs';
let s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function replace(before, after) { if (!s.includes(before)) throw Error('Missing anchor: ' + before); s = s.replace(before, after); }
replace("  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block', viewport });\n  const entry", "  let context, page, phase = 'context', scripts = null, resourceReferences = null, activeAnimations = null;\n  const observations = [], failures = [];\n  let blockedRequests = 0;\n  try {\n  context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block', viewport });\n  phase = 'setup';\n  const entry");
replace("  let blockedRequests = 0;\n  await context.route", "  await context.route");
replace("  const page = await context.newPage(); page.setDefaultTimeout(5000);\n  const observations = [];\n  try {", "  page = await context.newPage(); page.setDefaultTimeout(5000);\n    phase = 'navigation';");
replace("    const session = await context.newCDPSession(page);", "    phase = 'accessibility';\n    const session = await context.newCDPSession(page);");
replace("    for (const checkpoint of checkpoints) {", "    phase = 'observations';\n    for (const checkpoint of checkpoints) {");
replace("    const scripts = await page.evaluate", "    phase = 'dependencies';\n    scripts = await page.evaluate");
replace("    const resourceReferences = await page.evaluate", "    resourceReferences = await page.evaluate");
replace("    const activeAnimations = await page.evaluate", "    activeAnimations = await page.evaluate");
replace("    return { observations, blockedRequests, scriptsDisabled: scripts, unresolvedResourceReferences: resourceReferences, activeAnimations };\n  } finally { await context.close(); }", `  } catch (error) {
    failures.push({ reason: 'browser-inspection-failed', phase, message: String(error.message).slice(0, 300) });
  } finally {
    if (context) try { await context.close(); } catch (error) {
      failures.push({ reason: 'browser-cleanup-failed', phase: 'cleanup', message: String(error.message).slice(0, 300) });
    }
  }
  return { observations: checkpoints.map((checkpoint, index) => observations[index] || { id: checkpoint.id, status: 'unavailable', reason: 'browser-inspection-failed', phase }),
    blockedRequests, scriptsDisabled: scripts, unresolvedResourceReferences: resourceReferences, activeAnimations, failures };`);
replace("  const incomplete = reasons.length > 0;", "  for (const [side, snapshot] of [['source', source], ['candidate', candidate]]) {\n    for (const failure of snapshot.failures) reasons.push(side + '-' + failure.reason);\n  }\n  const incomplete = reasons.length > 0;");
replace("    browserVersion: browser.version(), viewport, media, profileId:", "    execution: { complete: !source.failures.length && !candidate.failures.length },\n    browserVersion: browser.version(), viewport, media, profileId:");
replace('animations: source.activeAnimations }', 'animations: source.activeAnimations, failures: source.failures }');
replace('animations: candidate.activeAnimations }', 'animations: candidate.activeAnimations, failures: candidate.failures }');
replace('profilesCompleted: reports.length, reasons:', 'profilesAttempted: reports.length, profilesCompleted: reports.filter(report => report.execution.complete).length, reasons:');
const tail = s.indexOf('if (require.main === module) (async () => {');
if (tail < 0) throw Error('CLI anchor missing');
s = s.slice(0, tail) + `function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.pairs) || !manifest.pairs.length || manifest.pairs.length > 50) throw Error('Expected 1–50 source/candidate pairs.');
  const ids = new Set();
  for (const pair of manifest.pairs) {
    if (!pair || !/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(pair.id || '') || ids.has(pair.id)) throw Error('Pair IDs must be unique bounded identifiers.');
    ids.add(pair.id);
    for (const field of ['sourcePath', 'candidatePath']) if (typeof pair[field] !== 'string' || !pair[field].trim()) throw Error('Each pair requires source and candidate paths.');
    validateCheckpoints(pair.checkpoints); validateProfiles(pair);
  }
  return manifest;
}
function invalidateReport(report, reason) {
  for (const item of [report, ...(report.profiles || [])]) {
    item.status = 'unavailable'; item.artifactChanged = true;
    item.coverage.complete = false;
    item.coverage.reasons = [...new Set([...(item.coverage.reasons || []), reason])];
  }
}
async function runRenderedManifest(manifestPath, options = {}) {
  const bytes = fs.readFileSync(manifestPath), manifest = validateManifest(JSON.parse(bytes.toString('utf8')));
  const ownBrowser = !options.browser, browser = options.browser || await require('playwright').chromium.launch({ headless: true });
  const reports = [], executionFailures = [];
  try {
    for (const pair of manifest.pairs) {
      const sourcePath = path.resolve(path.dirname(manifestPath), pair.sourcePath), candidatePath = path.resolve(path.dirname(manifestPath), pair.candidatePath);
      try { reports.push({ id: pair.id, ...await compareFiles(browser, sourcePath, candidatePath, pair) }); }
      catch (error) {
        const profiles = validateProfiles(pair);
        reports.push({ schemaVersion: 1, kind: 'rendered-html-fidelity', id: pair.id, status: 'unavailable',
          source: { path: sourcePath }, candidate: { path: candidatePath }, humanValidation: 'not-run',
          reason: 'file-comparison-failed', message: String(error.message).slice(0, 500),
          coverage: { complete: false, wholeDocument: false, requested: pair.checkpoints.length * profiles.length, inspected: 0, profilesRequested: profiles.length, profilesAttempted: 0, profilesCompleted: 0, reasons: ['file-comparison-failed'] }, checks: [] });
      }
    }
  } finally {
    if (ownBrowser) try { await browser.close(); } catch (error) {
      executionFailures.push({ reason: 'browser-cleanup-failed', message: String(error.message).slice(0, 300) });
      for (const report of reports) invalidateReport(report, 'browser-cleanup-failed');
    }
  }
  // Later pairs must not leave earlier evidence pointing at changed files.
  for (const report of reports) {
    for (const side of ['source', 'candidate']) {
      const artifact = report[side];
      if (!artifact?.sha256) continue;
      let stable = false;
      try { stable = hash(fs.readFileSync(artifact.path)) === artifact.sha256; } catch {}
      if (!stable) invalidateReport(report, side + '-changed-or-missing');
    }
  }
  let manifestStable = false;
  try { manifestStable = hash(fs.readFileSync(manifestPath)) === hash(bytes); } catch {}
  if (!manifestStable) for (const report of reports) invalidateReport(report, 'manifest-changed-or-missing');
  return { schemaVersion: 1, manifest: { path: path.resolve(manifestPath), sha256: hash(bytes), stable: manifestStable }, reports, executionFailures, humanValidation: 'not-run' };
}
if (require.main === module) (async () => {
  const [manifestPath, output] = process.argv.slice(2);
  if (!manifestPath || !output) throw Error('Usage: rendered_document_fidelity.cjs MANIFEST.json NEW_OUTPUT_DIR');
  if (fs.existsSync(output)) throw Error('Output directory exists; preserve previous evidence.');
  const result = await runRenderedManifest(path.resolve(manifestPath));
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'rendered-fidelity.json'), JSON.stringify(result, null, 2) + '\\n');
  fs.writeFileSync(path.join(output, 'review.html'), require('./rendered_fidelity_review.cjs').renderReview(result));
  console.log(JSON.stringify({ pairs: result.reports.length, passed: result.reports.filter(r => r.status === 'passed').length, output: path.resolve(output) }));
  if (result.reports.some(r => r.status !== 'passed')) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 2; });
module.exports = { compareRenderedHtml, compareFiles, runRenderedManifest, validateManifest, validateCheckpoints, validateProfiles, PROPERTIES };
`;
fs.writeFileSync(file, s.replace(/\n/g, '\r\n'));
