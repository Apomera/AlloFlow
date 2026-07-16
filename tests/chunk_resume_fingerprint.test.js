// Chunk-resume content guard (audit #6, 2026-06-15). The IndexedDB chunk-progress resume reused
// saved fixed chunks 0..K-1 BY INDEX, guarded only by sessionId = hash(filename|size|chunkCount)
// + a 24h window. A changed document with the same name/size/chunk-count collides → stale fixed
// chunks splice in by index and silently corrupt the output. Fix: store a per-chunk SOURCE
// fingerprint on save and require every carried chunk to match the current bodyChunks[i] on resume.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Mirror of the shipped fingerprint + resume validity check.
const chunkDigest = (s) => 'sha256:' + createHash('sha256').update(String(s || '').replace(/\s+/g, ' ').trim()).digest('hex');
const resumeValid = (savedChunks, currentBody) => {
  for (let i = 0; i < savedChunks.length; i++) {
    if (!savedChunks[i] || savedChunks[i].srcDigest !== chunkDigest(currentBody[i])) return false;
  }
  return true;
};

describe('chunk-resume only carries chunks whose SOURCE still matches', () => {
  const body = ['Chapter one. The committee met to review the annual budget.', 'Chapter two. The findings were presented to the school board.'];
  const savedFor = (b) => b.map((c, i) => ({ index: i, html: '<p>fixed ' + i + '</p>', srcDigest: chunkDigest(c) }));

  it('accepts resume when every carried chunk fingerprint matches', () => {
    expect(resumeValid(savedFor(body).slice(0, 1), body)).toBe(true);
    expect(resumeValid(savedFor(body), body)).toBe(true);
  });
  it('REJECTS resume when a carried chunk source changed (the collision/corruption case)', () => {
    const changedBody = ['Chapter one. The committee met to review the QUARTERLY budget instead.', body[1]];
    expect(resumeValid(savedFor(body).slice(0, 1), changedBody)).toBe(false);
  });
  it('REJECTS a legacy save that has no exact source digest (cannot verify → fail-safe)', () => {
    const legacy = [{ index: 0, html: '<p>fixed</p>' }];
    expect(resumeValid(legacy, body)).toBe(false);
  });

  it('anti-drift: save stores full SHA-256 chunk/document identities and verifies both', () => {
    expect(src).toContain('srcDigest: _chunkSourceDigests[i]');
    expect(src).toContain('saved.chunkResults[_vi].srcDigest !== _chunkSourceDigests[_vi]');
    expect(src).toContain('saved.documentDigest === _currentDocKey');
    expect(src).toContain("return 'chunk_v2_' + digest.slice(7)");
    expect(src).toContain('await clearChunkProgress(_sessionId);');
  });
});
