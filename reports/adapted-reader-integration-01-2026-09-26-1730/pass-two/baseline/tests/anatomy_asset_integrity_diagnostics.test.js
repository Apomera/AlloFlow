import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import assetChecker from '../dev-tools/check_anatomy_clinical_assets.cjs';

const { assertAssetHash } = assetChecker;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

describe('Clinical Atlas byte integrity diagnostics', () => {
  it('accepts the exact pinned bytes, including intentional source CRLF', () => {
    const bytes = Buffer.from('node_name,OntologyID\r\nkidney,UBERON:0002113\r\n');
    expect(() => assertAssetHash(bytes, digest(bytes), 'release.csv', true)).not.toThrow();
  });

  it('rejects checkout line-ending conversion and identifies the affected file', () => {
    const original = Buffer.from('node_name,OntologyID\nkidney,UBERON:0002113\n');
    const checkout = Buffer.from(original.toString().replace(/\n/g, '\r\n'));
    expect(() => assertAssetHash(checkout, digest(original), 'kidney-crosswalk.csv', true))
      .toThrow(/kidney-crosswalk.csv: integrity hash mismatch.*CRLF line-ending conversion/);
  });

  it('rejects changed content without misdiagnosing it as line-ending conversion', () => {
    const original = Buffer.from('kidney,UBERON:0002113\n');
    const changed = Buffer.from('kidney,UBERON:9999999\r\n');
    expect(() => assertAssetHash(changed, digest(original), 'crosswalk.csv', true))
      .toThrow(/Restore the asset from the pinned release/);
    expect(() => assertAssetHash(changed, digest(original), 'model.glb'))
      .toThrow(/do not replace the expected hash/);
  });

  it('preserves release bytes in canonical and deployed Git checkouts', () => {
    const dirs = ['stem_lab/assets/anatomy/clinical-atlas', 'desktop/web-app/public/stem_lab/assets/anatomy/clinical-atlas'];
    const paths = dirs.flatMap((dir) => ['hra-kidney-female-left-v1.3-crosswalk.csv', 'hra-heart-female-v1.3-metadata.yaml', 'hra-heart-female-v1.3.glb'].map((name) => `${dir}/${name}`));
    const attributes = execFileSync('git', ['check-attr', 'text', '--', ...paths], { encoding: 'utf8' }).trim().split(/\r?\n/);
    expect(attributes).toHaveLength(paths.length);
    expect(attributes.every((line) => line.endsWith(': text: unset'))).toBe(true);
  });
});
