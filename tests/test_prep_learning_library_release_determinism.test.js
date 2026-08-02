import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(root, 'test_prep', 'pack_manifest.json');
const stamperPath = path.join(root, 'dev-tools', 'stamp_learning_library_identity.cjs');

function localAssetPath(url) {
  const name = String(url || '').split('/test_prep/').pop();
  return name ? path.join(root, 'test_prep', name) : null;
}

describe('Test Prep learning-library release determinism', () => {
  it('omits volatile generation clocks from every manifest-linked library artifact', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const paths = [...new Set((manifest.entries || []).flatMap((entry) => [
      localAssetPath(entry.learningLibraryUrl),
      localAssetPath(entry.learningLibraryQaUrl),
    ]).filter((file) => file && fs.existsSync(file)))];
    expect(paths.length).toBeGreaterThanOrEqual(40);
    for (const file of paths) {
      const artifact = JSON.parse(fs.readFileSync(file, 'utf8'));
      expect(Object.prototype.hasOwnProperty.call(artifact, 'generatedAt'), path.basename(file)).toBe(false);
    }
  });

  it('is byte- and mtime-stable when the identity finalizer is repeated', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const paths = [...new Set((manifest.entries || []).flatMap((entry) => [
      localAssetPath(entry.learningLibraryUrl),
      localAssetPath(entry.learningLibraryQaUrl),
    ]).filter((file) => file && fs.existsSync(file)))];
    const before = paths.map((file) => ({ file, bytes: fs.readFileSync(file), mtimeMs: fs.statSync(file).mtimeMs }));
    const result = spawnSync(process.execPath, [stamperPath], { cwd: root, encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toMatch(/0 stamped, \d+ already bound, 0 missing/);
    for (const item of before) {
      expect(fs.readFileSync(item.file).equals(item.bytes), item.file).toBe(true);
      expect(fs.statSync(item.file).mtimeMs, item.file).toBe(item.mtimeMs);
    }
  });

  it('finalizes library bytes before the final non-EPPP QA binding', () => {
    const builder = fs.readFileSync(path.join(root, 'dev-tools', 'build_test_prep_hub_release.cjs'), 'utf8');
    const stamp = builder.indexOf('execFileSync(process.execPath,[stampLearningLibraryIdentityPath]');
    const binding = builder.lastIndexOf('execFileSync(process.execPath,[bindNonEpppNativeQaPath]');
    const review = builder.indexOf('execFileSync(process.execPath,[reviewNonEpppAgainstEpppPath]');
    expect(stamp).toBeGreaterThanOrEqual(0);
    expect(stamp).toBeLessThan(binding);
    expect(binding).toBeLessThan(review);
  });
});
