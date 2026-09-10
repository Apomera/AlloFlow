'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../..');
const { runCalibration } = require(path.join(root, 'dev-tools/calibrate_rendered_fidelity.cjs'));
(async () => {
  const output = path.join(__dirname, 'calibration');
  const calibration = await runCalibration(output);
  assert.equal(calibration.total, 29); assert.equal(calibration.matched, 29); assert.equal(calibration.evidence.complete, true);
  console.log(JSON.stringify({ step: 'calibration', total: calibration.total, matched: calibration.matched, metrics: calibration.metrics, evidence: calibration.evidence }));
  const fixture = require(path.join(root, 'tests/fixtures/rendered_fidelity/extended_cases.cjs'))[0];
  const manifest = path.join(__dirname, 'review-manifest.json');
  fs.writeFileSync(manifest, JSON.stringify({ schemaVersion: 1, pairs: [{ id: fixture.id, sourcePath: 'calibration/' + fixture.id + '/source.html', candidatePath: 'calibration/' + fixture.id + '/candidate.html', profiles: fixture.profiles, checkpoints: fixture.checkpoints }] }, null, 2));
  const reviewOutput = path.join(__dirname, 'standalone-review');
  const cli = spawnSync(process.execPath, [path.join(root, 'dev-tools/rendered_document_fidelity.cjs'), manifest, reviewOutput], { encoding: 'utf8', timeout: 240000, windowsHide: true });
  assert.equal(cli.status, 1, cli.stderr);
  const report = JSON.parse(fs.readFileSync(path.join(reviewOutput, 'rendered-fidelity.json'), 'utf8'));
  assert.equal(report.reports[0].status, 'review-required');
  assert.deepEqual(report.reports[0].profiles.map(p => p.status), ['passed', 'review-required', 'passed']);
  const browser = await require('playwright').chromium.launch({ headless: true });
  const checks = [];
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(reviewOutput, 'review.html')).href);
    for (const [id, width] of [['desktop', 1100], ['mobile', 390]]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: path.join(__dirname, 'review-' + id + '.png') });
      const observation = await page.evaluate(() => ({ main: document.querySelectorAll('main').length, heading: document.querySelector('h1')?.textContent, viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, scripts: document.scripts.length, profiles: document.querySelectorAll('.profile').length }));
      assert.equal(observation.main, 1); assert.equal(observation.scripts, 0); assert.equal(observation.profiles, 3); assert.ok(observation.documentWidth <= width);
      checks.push({ id, ...observation });
    }
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.locator('.profile').nth(1).screenshot({ path: path.join(__dirname, 'review-mobile-profile.png') });
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(__dirname, 'review-smoke.json'), JSON.stringify({ cliExitCode: cli.status, status: report.reports[0].status, checks, humanValidation: 'not-run' }, null, 2));
  console.log(JSON.stringify({ step: 'review-smoke', cliExitCode: cli.status, checks }));
})().catch(error => { console.error(error); process.exitCode = 1; });
