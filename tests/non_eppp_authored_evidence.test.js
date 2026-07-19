import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import evidenceChecks from '../dev-tools/non_eppp_authored_evidence.cjs';
import ecPack from '../test_prep/early_childhood_5025_pack.json';

const { validateAuthoredEvidence } = evidenceChecks;
const root = path.resolve(import.meta.dirname, '..');

describe('hash-bound non-EPPP authored-bank evidence', () => {
  it('binds every released authored tier to its exact source and review artifacts', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dev-tools', 'authored', 'test_prep_independent_additions_manifest.json'), 'utf8'));
    for (const stem of Object.keys(manifest.packs)) {
      const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', `${stem}_pack.json`), 'utf8'));
      const result = validateAuthoredEvidence({ pack, stem, root });
      expect(result.findings, stem).toEqual([]);
      expect(result.snapshotPaths.length, stem).toBeGreaterThan(1);
    }
  });

  it('rejects stale hashes and released content that differs from the authored artifact', () => {
    const stale = structuredClone(ecPack);
    stale.assistantReview.independentBatchEvidence[0].artifactBindings[0].sha256 = '0'.repeat(64);
    expect(validateAuthoredEvidence({ pack: stale, stem: 'early_childhood_5025', root }).findings)
      .toEqual(expect.arrayContaining([expect.stringMatching(/stale or invalid artifact binding/)]));

    const changed = structuredClone(ecPack);
    changed.items[200].prompt += ' Changed after review.';
    expect(validateAuthoredEvidence({ pack: changed, stem: 'early_childhood_5025', root }).findings)
      .toEqual(expect.arrayContaining([expect.stringMatching(/released authored tier does not match/)]));
  });
});
