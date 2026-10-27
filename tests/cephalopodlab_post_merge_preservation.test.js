import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const { restorePostMergeVisualSource } = createRequire(import.meta.url)('./helpers/cephalopod_post_merge_reference.cjs');
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
const digest = text => createHash('sha256').update(text).digest('hex');
// Immutable checkpoint: PR #21, commit 1b2d7b0cfb32b2c795969ecb8c82be2340929e56.
const checkpoint = 'dbd93aaf44022665f09f18204556155f18defd9a3715d20d0d61d976c144a8cf';
describe('Reviewed Cephalopod visual additions and historical preservation', () => {
  it('recovers the exact earlier source without modifying the live tool', () => {
    const restored = restorePostMergeVisualSource(source);
    expect(digest(restored)).toBe(checkpoint);
    expect(restorePostMergeVisualSource(restored)).toBe(restored);
    expect(source).toContain('function sunlightFractionAt(realM)');
    expect(source).toContain('syncPhotophoreHalos(0.7 * photophoreDark)');
  });
  it('rejects an unreviewed change inside an approved lighting span', () => {
    expect(source).toContain('falloffM = 110');
    expect(() => restorePostMergeVisualSource(source.replace('falloffM = 110', 'falloffM = 100'))).toThrow('inverse guard');
  });
  it('leaves unrelated changes visible to the immutable digest', () => {
    const mutation = '\nfunction unexpectedGameplayMutation() { return 1; }\n';
    const restored = restorePostMergeVisualSource(source + mutation);
    expect(restored.endsWith(mutation)).toBe(true);
    expect(digest(restored)).not.toBe(checkpoint);
  });
});
