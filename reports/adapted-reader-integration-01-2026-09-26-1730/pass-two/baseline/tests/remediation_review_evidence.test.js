import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Review = require('../remediation_review_helpers.js');
const { CANDIDATE_REJECTION_SCHEMA } = require('../desktop/mcp/remediation_verification.cjs');

describe('preservation review metadata contract', () => {
  it('explains every canonical rejection reason and discards unrecognized payloads', () => {
    const codes = CANDIDATE_REJECTION_SCHEMA.candidateRejections.items.properties.reason.enum;
    expect(Object.keys(Review.reasons).sort()).toEqual([...codes].sort());
    const input = { candidateRejections: codes.map(reason => ({ reason, phase: 'chunk', chunkId: '1', pass: 1, sourceText: 'PRIVATE', candidateHtml: '<p>PRIVATE</p>' })) };
    input.candidateRejections.push({ reason: 'toString', phase: 'chunk', chunkId: '1' }, { reason: codes[0], phase: 'unknown', chunkId: 'PRIVATE' });
    const normalized = Review.evidence(input);
    expect(normalized.candidateRejections).toHaveLength(codes.length);
    expect(JSON.stringify(normalized)).not.toContain('PRIVATE');
    expect(Review.reviewItems(normalized, {}).every(item => item.description.length > 20)).toBe(true);
  });
  it('merges bounded deltas without mutating HTML, verification, or input evidence', () => {
    const record = { chunkId: 'all', phase: 'assembly', reason: 'content-not-preserved' };
    const previous = { accessibleHtml: '<p>Original</p>', verificationState: 'partial', candidateRejectionCount: 999999, candidateRejections: Array.from({ length: 99 }, () => ({ ...record })) };
    const snapshot = JSON.stringify(previous);
    const merged = Review.mergeEvidence(previous, { candidateRejectionCount: 12, candidateRejections: Array.from({ length: 12 }, () => ({ ...record })) });
    expect(merged.candidateRejectionCount).toBe(1000000);
    expect(merged.candidateRejections).toHaveLength(100);
    expect(Object.keys(merged).sort()).toEqual(['candidateRejectionCount', 'candidateRejections']);
    expect(JSON.stringify(previous)).toBe(snapshot);
  });
  it('keeps acknowledgments separate from manual verification attestations', () => {
    const value = { candidateRejections: [{ chunkId: '2.1', phase: 'half', reason: 'table-cell-transposition', pass: 2 }] };
    const item = Review.reviewItems(value, {})[0];
    const restored = Review.acknowledgments(JSON.parse(JSON.stringify({ [item.key]: 1788830000000, 'axe|manual|table': 1788830000000, 'preservation|invalid': 'true' })));
    expect(restored).toEqual({ [item.key]: 1788830000000 });
    expect(Review.reviewItems(value, restored)[0]).toMatchObject({ reviewed: true, referenceKind: 'table' });
    expect(Review.reviewItems(value, {})[0].reviewed).toBe(false);
  });
});

