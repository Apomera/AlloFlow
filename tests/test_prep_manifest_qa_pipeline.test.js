import crypto from 'node:crypto';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const builderPath = resolve(root, 'dev-tools/build_test_prep_pack_manifest.cjs');
const manifestPath = resolve(root, 'test_prep/pack_manifest.json');
const deployManifestPath = resolve(root, 'desktop/web-app/public/test_prep/pack_manifest.json');
const qaPath = resolve(root, 'test_prep/ap_psychology_pilot_qa.json');
const deployQaPath = resolve(root, 'desktop/web-app/public/test_prep/ap_psychology_pilot_qa.json');
const epppLibraryDeployPath = resolve(root, 'desktop/web-app/public/test_prep/eppp_learning_library.json');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

describe('Test Prep manifest-bound AP QA pipeline', () => {
  it('regenerates byte-stable QA before binding its final deploy digest', () => {
    const beforeManifest = fs.readFileSync(manifestPath);
    const beforeQa = fs.readFileSync(qaPath);
    const beforeMtimes = new Map(
      [manifestPath, deployManifestPath, epppLibraryDeployPath]
        .map((filePath) => [filePath, fs.statSync(filePath).mtimeMs]),
    );
    const result = spawnSync(process.execPath, [builderPath], {
      cwd: root,
      encoding: 'utf8',
    });

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('release remains blocked by 8 independent/human gates');
    expect(fs.readFileSync(manifestPath).equals(beforeManifest)).toBe(true);
    expect(fs.readFileSync(qaPath).equals(beforeQa)).toBe(true);
    expect(fs.readFileSync(deployManifestPath).equals(beforeManifest)).toBe(true);
    expect(fs.readFileSync(deployQaPath).equals(beforeQa)).toBe(true);
    for (const [filePath, mtimeMs] of beforeMtimes) {
      expect(fs.statSync(filePath).mtimeMs, filePath).toBe(mtimeMs);
    }

    const manifest = JSON.parse(beforeManifest.toString('utf8'));
    const apEntry = manifest.entries.find((entry) => entry.id === 'ap-psychology-pilot');
    expect(apEntry.nativeQaUrl).toBe('./test_prep/ap_psychology_pilot_qa.json');
    expect(apEntry.nativeQaSha256).toBe(sha256(qaPath));
  }, 30_000);
});
