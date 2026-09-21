import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A checkpoint's document binding compared two hashes of the SAME file that are
 * computed differently and can never be equal:
 *
 *   inputSha256    — sha256 of the RAW file bytes           (the MCP server)
 *   documentDigest — sha256 of the normalised BASE64 text   (doc_pipeline)
 *
 * So `documentDigest !== 'sha256:' + inputSha256` held on every save, every
 * checkpoint threw `checkpoint_snapshot_invalid`, and in the batch path every
 * file failed remediation — the scoreboard e2e reported 0 of 2 succeeded while
 * selection itself was working fine.
 *
 * These pin the arithmetic rather than the plumbing, so they stay meaningful
 * without spawning the MCP server or a browser.
 */
const FIXTURE = resolve(process.cwd(), 'tests/e2e/artifacts/remediation-e2e.source.pdf');

// The pipeline's identity: doc_pipeline `_documentDigest` strips any data: URL
// prefix and all whitespace, then hashes what is left.
function pipelineDocumentDigest(bytes) {
  const normalized = bytes.toString('base64').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  return 'sha256:' + createHash('sha256').update(normalized).digest('hex');
}

// The server's streaming helper must agree with that one-shot form exactly.
function streamingDocumentDigest(bytes) {
  const hash = createHash('sha256');
  let carry = Buffer.alloc(0);
  for (let i = 0; i < bytes.length; i += 3 * 1024 * 1024) {
    const chunk = bytes.subarray(i, i + 3 * 1024 * 1024);
    const buf = carry.length ? Buffer.concat([carry, chunk]) : chunk;
    const whole = buf.length - (buf.length % 3);
    if (whole > 0) hash.update(buf.subarray(0, whole).toString('base64'));
    carry = buf.subarray(whole);
  }
  if (carry.length) hash.update(carry.toString('base64'));
  return 'sha256:' + hash.digest('hex');
}

describe('MCP checkpoint document binding', () => {
  it('the raw-bytes digest and the pipeline digest are NOT interchangeable', () => {
    const bytes = readFileSync(FIXTURE);
    const inputSha256 = createHash('sha256').update(bytes).digest('hex');
    const documentDigest = pipelineDocumentDigest(bytes);
    // The exact confusion the old check made. If this ever passes, the two
    // identities have converged and the binding can be simplified.
    expect(documentDigest).not.toBe('sha256:' + inputSha256);
  });

  it('the streaming digest matches the pipeline digest byte for byte', () => {
    const bytes = readFileSync(FIXTURE);
    expect(streamingDocumentDigest(bytes)).toBe(pipelineDocumentDigest(bytes));
  });

  it('chunk boundaries that split a base64 triple do not change the digest', () => {
    // 3 bytes -> 4 base64 chars, so a chunk size that is not a multiple of 3 is
    // exactly where a naive streaming encoder would pad mid-stream and diverge.
    const bytes = readFileSync(FIXTURE).subarray(0, 4096);
    const expected = pipelineDocumentDigest(bytes);
    for (const size of [1, 2, 3, 4, 5, 7, 1024, 4095]) {
      const hash = createHash('sha256');
      let carry = Buffer.alloc(0);
      for (let i = 0; i < bytes.length; i += size) {
        const buf = carry.length ? Buffer.concat([carry, bytes.subarray(i, i + size)]) : bytes.subarray(i, i + size);
        const whole = buf.length - (buf.length % 3);
        if (whole > 0) hash.update(buf.subarray(0, whole).toString('base64'));
        carry = buf.subarray(whole);
      }
      if (carry.length) hash.update(carry.toString('base64'));
      expect('sha256:' + hash.digest('hex'), 'chunk size ' + size).toBe(expected);
    }
  });

  it('the server no longer equates the two digests', () => {
    const src = readFileSync(resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs'), 'utf8');
    expect(src, 'the raw-bytes equality check is what broke every checkpoint')
      .not.toContain("value.documentDigest !== 'sha256:' + inputSha256");
    expect(src).toContain('function documentDigestForFile');
  });
});
