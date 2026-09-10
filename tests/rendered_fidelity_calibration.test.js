import { afterEach, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const temporary = [];
const digest = value => createHash('sha256').update(value).digest('hex');
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rendered-calibration-'));
  temporary.push(root);
  const dev = path.join(root, 'dev-tools'), fixtures = path.join(root, 'tests/fixtures/rendered_fidelity');
  fs.mkdirSync(dev); fs.mkdirSync(fixtures, { recursive: true });
  fs.copyFileSync(path.resolve('dev-tools/calibrate_rendered_fidelity.cjs'), path.join(dev, 'calibrate_rendered_fidelity.cjs'));
  const cases = ['base', 'extended'].map(id => ({ id, category: 'test', sourceHtml: '<p>Source</p>', candidateHtml: '<p>Source</p>', expectedStatus: 'passed' }));
  for (const [i, name] of ['cases.cjs', 'extended_cases.cjs'].entries()) fs.writeFileSync(path.join(fixtures, name), 'module.exports=' + JSON.stringify([cases[i]]) + ';');
  // Isolate evidence bookkeeping from rendering, which has its own browser tests.
  fs.writeFileSync(path.join(dev, 'rendered_document_fidelity.cjs'), 'module.exports.compareFiles=async(browser)=>{browser.inspect?.();return {status:"passed",durationMs:1,source:{sha256:"source"},candidate:{sha256:"candidate"}}};');
  fs.writeFileSync(path.join(dev, 'rendered_fidelity_review.cjs'), 'module.exports.renderReview=()=>"<!doctype html><title>Test review</title>";');
  fs.writeFileSync(path.join(dev, 'document_html_dependencies.cjs'), 'module.exports.inspectDocumentDependencies=()=>({scripts:0,unresolved:0,animations:0});');
  const { runCalibration } = require(path.join(dev, 'calibrate_rendered_fidelity.cjs'));
  return { root, dev, fixtures, cases, runCalibration, output: path.join(root, 'output') };
}
afterEach(() => {
  for (const root of temporary.splice(0)) {
    const resolved = path.resolve(root);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('rendered-calibration-')) throw Error('Unexpected cleanup path');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
it('records hashes of loaded inputs and the exact case payload for a stable run', async () => {
  const fixture = setup();
  const report = await fixture.runCalibration(fixture.output, { browser: { version: () => 'test' } });
  expect(report.evidence).toEqual({ complete: true, changedInputs: [] });
  expect(report.corpusPayloadSha256).toBe(digest(JSON.stringify(fixture.cases)));
  expect(report.implementationSha256).toBe(digest(fs.readFileSync(path.join(fixture.dev, 'rendered_document_fidelity.cjs'))));
  expect(report.dependencyCollectorSha256).toBe(digest(fs.readFileSync(path.join(fixture.dev, 'document_html_dependencies.cjs'))));
  expect(report.total).toBe(2); expect(report.matched).toBe(2);
  expect(fs.existsSync(path.join(fixture.output, 'review.html'))).toBe(true);
});
for (const target of ['corpus', 'implementation', 'dependencies']) it('marks evidence incomplete if ' + target + ' changes during inspection', async () => {
  const fixture = setup();
  const file = target === 'corpus' ? path.join(fixture.fixtures, 'extended_cases.cjs') : path.join(fixture.dev, target === 'dependencies' ? 'document_html_dependencies.cjs' : 'rendered_document_fidelity.cjs');
  const originalHash = digest(fs.readFileSync(file));
  let inspected = false;
  const report = await fixture.runCalibration(fixture.output, { browser: { version: () => 'test', inspect: () => { if (!inspected) { inspected = true; fs.appendFileSync(file, '\n// Changed during run'); } } } });
  expect(report.evidence.complete).toBe(false);
  expect(report.evidence.changedInputs).toContain(path.relative(fixture.root, file).split(path.sep).join('/'));
  expect(target === 'corpus' ? report.corpusFiles[1].sha256 : target === 'dependencies' ? report.dependencyCollectorSha256 : report.implementationSha256).toBe(originalHash);
  expect(JSON.parse(fs.readFileSync(path.join(fixture.output, 'calibration-report.json'), 'utf8')).evidence.complete).toBe(false);
});
it('refuses cached calibration inputs changed before a run begins', async () => {
  const fixture = setup();
  fs.appendFileSync(path.join(fixture.fixtures, 'cases.cjs'), '\n// Changed before run');
  await expect(fixture.runCalibration(fixture.output, { browser: { version: () => 'test' } })).rejects.toThrow(/changed since loading/);
  expect(fs.existsSync(fixture.output)).toBe(false);
});

it('refuses cached dependency inspection changed before calibration starts', async () => {
  const fixture = setup();
  fs.appendFileSync(path.join(fixture.dev, 'document_html_dependencies.cjs'), '\n// Changed before run');
  await expect(fixture.runCalibration(fixture.output, { browser: { version: () => 'test' } })).rejects.toThrow(/changed since loading/);
  expect(fs.existsSync(fixture.output)).toBe(false);
});
