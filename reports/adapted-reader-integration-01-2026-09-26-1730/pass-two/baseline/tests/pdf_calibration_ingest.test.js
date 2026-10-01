import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { main } = require('../dev-tools/pdf_calibration_ingest.cjs');
const { hash } = require('../dev-tools/lib/pdf_calibration.cjs');
const synthetic = JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/pdf_calibration/synthetic_cases.json'), 'utf8'));
const folders = [];
afterEach(() => { vi.restoreAllMocks(); for (const folder of folders.splice(0)) { if (!folder.startsWith(path.join(os.tmpdir(), 'pdf-calibration-'))) throw new Error('Unexpected cleanup path'); fs.rmSync(folder, { recursive: true, force: true }); } });
function files() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-calibration-')); folders.push(dir);
  const artifact = Buffer.from('<html lang="en"><body>Unit test artifact</body></html>');
  const observation = structuredClone(synthetic.entries[0]);
  observation.evidenceKind = 'unreviewed'; delete observation.expected;
  observation.artifact = { sha256: hash(artifact), size: artifact.length };
  const review = { status: 'completed', method: 'human', independent: true,
    reviewer: 'UNIT TEST ONLY', reviewedAt: '2026-09-07T12:00:00.000Z', evidenceRef: 'unit-test:notes',
    artifactSha256: observation.artifact.sha256, readiness: 'ready', layers: { ai: 'passed', fidelity: 'passed' }, findings: [] };
  const p = name => path.join(dir, name);
  fs.writeFileSync(p('artifact.html'), artifact);
  fs.writeFileSync(p('observation.json'), JSON.stringify(observation));
  fs.writeFileSync(p('review.json'), JSON.stringify(review));
  fs.writeFileSync(p('manifest.json'), JSON.stringify({ schemaVersion: 2, entries: [] }));
  const args = ['--id', 'unit-observation', '--observation', p('observation.json'), '--artifact', p('artifact.html'), '--manifest', p('manifest.json')];
  return { p, args, observation, review, read: () => JSON.parse(fs.readFileSync(p('manifest.json'), 'utf8')), write: (name, value) => fs.writeFileSync(p(name), JSON.stringify(value)) };
}
const quiet = { log() {} };
describe('calibration observation and human findings importer', () => {
  it('imports an actual artifact observation as unreviewed without inventing expert scores', () => {
    const f = files(); main(f.args, quiet);
    const entry = f.read().entries[0];
    expect(entry.evidenceKind).toBe('unreviewed'); expect(entry.artifact.sha256).toBe(f.observation.artifact.sha256);
    expect(entry.review).toBeUndefined(); expect(entry.expertScore).toBeUndefined(); expect(entry.alloflowBlendedScore).toBeUndefined();
  });
  it('imports declared completed human findings for the same artifact', () => {
    const f = files(); main([...f.args, '--review', f.p('review.json')], quiet);
    const entry = f.read().entries[0]; expect(entry.evidenceKind).toBe('independent-human-review'); expect(entry.review).toEqual(f.review);
  });
  it('dry-run validates the review without altering the manifest', () => {
    const f = files(); const before = fs.readFileSync(f.p('manifest.json'), 'utf8');
    main([...f.args, '--review', f.p('review.json'), '--dry-run'], quiet);
    expect(fs.readFileSync(f.p('manifest.json'), 'utf8')).toBe(before);
  });
  it.each(['observation-hash', 'review-hash', 'pending-review', 'validator-review', 'synthetic-observation'])('refuses %s without writing the manifest', condition => {
    const f = files();
    if (condition === 'observation-hash') f.observation.artifact.sha256 = 'f'.repeat(64);
    if (condition === 'review-hash') f.review.artifactSha256 = 'f'.repeat(64);
    if (condition === 'pending-review') f.review.status = 'pending';
    if (condition === 'validator-review') f.review.method = 'veraPDF';
    if (condition === 'synthetic-observation') f.observation.evidenceKind = 'synthetic';
    f.write('observation.json', f.observation); f.write('review.json', f.review);
    expect(() => main([...f.args, '--review', f.p('review.json')], quiet)).toThrow();
    expect(f.read().entries).toEqual([]);
  });
  it('preserves earlier reviews by rejecting duplicate observation IDs', () => {
    const f = files(); main(f.args, quiet); const first = f.read();
    expect(() => main(f.args, quiet)).toThrow(/Duplicate id/); expect(f.read()).toEqual(first);
  });
  it.each(['write', 'rename'])('preserves complete review history after a failed %s', stage => {
    const f = files(); main(f.args, quiet);
    const before = fs.readFileSync(f.p('manifest.json'), 'utf8');
    const originalWrite = fs.writeFileSync;
    if (stage === 'write') vi.spyOn(fs, 'writeFileSync').mockImplementation((filename, data, options) => {
      if (String(filename).startsWith(f.p('manifest.json.tmp-'))) {
        originalWrite(filename, '{"schemaVersion":2,', options);
        throw Object.assign(new Error('Injected disk full'), { code: 'ENOSPC' });
      }
      return originalWrite(filename, data, options);
    });
    else vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw Object.assign(new Error('Injected rename failure'), { code: 'EACCES' }); });
    expect(() => main(f.args.map(value => value === 'unit-observation' ? 'second-observation' : value), quiet)).toThrow(/Injected/);
    expect(fs.readFileSync(f.p('manifest.json'), 'utf8')).toBe(before);
    expect(f.read().entries).toHaveLength(1);
    expect(fs.readdirSync(f.p('.')).filter(name => name.includes('.tmp-') || name.endsWith('.lock'))).toEqual([]);
  });
  it('refuses another importer lock without deleting it or altering history', () => {
    const f = files(); const before = fs.readFileSync(f.p('manifest.json'), 'utf8');
    fs.writeFileSync(f.p('manifest.json.lock'), 'another importer');
    expect(() => main(f.args, quiet)).toThrow(/locked/);
    expect(fs.readFileSync(f.p('manifest.json'), 'utf8')).toBe(before);
    expect(fs.readFileSync(f.p('manifest.json.lock'), 'utf8')).toBe('another importer');
  });
  it('rechecks history after writing the temporary file and preserves competing updates', () => {
    const f = files(); const originalWrite = fs.writeFileSync;
    const changed = JSON.stringify({ schemaVersion: 2, entries: [], revision: 'concurrent-update' });
    vi.spyOn(fs, 'writeFileSync').mockImplementation((filename, data, options) => {
      const result = originalWrite(filename, data, options);
      if (String(filename).startsWith(f.p('manifest.json.tmp-'))) originalWrite(f.p('manifest.json'), changed);
      return result;
    });
    expect(() => main(f.args, quiet)).toThrow(/changed during import/);
    expect(fs.readFileSync(f.p('manifest.json'), 'utf8')).toBe(changed);
    expect(fs.readdirSync(f.p('.')).filter(name => name.includes('.tmp-') || name.endsWith('.lock'))).toEqual([]);
  });
  it('retires the validator-to-expert-score shortcut', () => {
    expect(() => main(['--verapdf', 'report.json', '--expert', '100'], quiet)).toThrow(/retired/);
  });
  it('prints a pending review template that cannot count as completed human evidence', () => {
    const template = main(['--template'], quiet);
    expect(template).toMatchObject({ status: 'pending', independent: false, readiness: null, reviewer: '' });
  });
});
