// Live Remediation Review decoupling fix (2026-06-21): the review panel is driven entirely by window
// CustomEvents — alloflow:chunk-start adds a card on status 'working' ("Fixing…"), alloflow:chunk-fixed
// flips it to 'complete', alloflow:chunk-session-complete ends the session. A chunk that was throttle-
// deferred / failed never emits chunk-fixed, so its card dangled on "Fixing…" AFTER the run finished —
// the "Review complete" + "Fixing…" contradiction the user saw. onSessionComplete now resolves any
// still-'working' card to a terminal, honestly AI-skipped state. This pins the resolution + the wiring.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

// mirror of the onSessionComplete stream resolution
const resolveOnComplete = (stream) => stream.map((c) => c.status === 'working'
  ? { ...c, status: 'complete', usedOriginal: true, aiVerified: false, integrityPassed: false, incomplete: true, score: (typeof c.score === 'number' ? c.score : 0) }
  : c);

describe('Live Remediation Review — no card dangles on "Fixing…" after the session completes', () => {
  it('a chunk left on "working" (throttle-deferred, never got chunk-fixed) is resolved to terminal + AI-skipped', () => {
    const stream = [
      { index: 0, status: 'complete', usedOriginal: false, aiVerified: true, score: 88 }, // a real fix
      { index: 1, status: 'working', sizeKB: 36 },                                        // throttle-deferred, dangling
      { index: 2, status: 'working', sizeKB: 36 },                                        // throttle-deferred, dangling
    ];
    const out = resolveOnComplete(stream);
    // NO card is left working
    expect(out.some((c) => c.status === 'working')).toBe(false);
    // the real fix is untouched
    expect(out[0]).toEqual(stream[0]);
    // the dangling ones become honestly AI-skipped (shipped as original), not falsely verified
    expect(out[1].status).toBe('complete');
    expect(out[1].usedOriginal).toBe(true);
    expect(out[1].aiVerified).toBe(false);
    expect(out[1].integrityPassed).toBe(false);
    expect(out[1].incomplete).toBe(true);
    expect(out[1].score).toBe(0); // no real score → 0, not undefined (card renders /100 cleanly)
  });

  it('an already-complete stream is unchanged (idempotent)', () => {
    const stream = [{ index: 0, status: 'complete', score: 90, usedOriginal: false }];
    expect(resolveOnComplete(stream)).toEqual(stream);
  });

  it('the "complete" count now reaches total, so the panel reads N/N (not stuck at <N)', () => {
    const stream = [{ index: 0, status: 'complete', score: 80 }, { index: 1, status: 'working' }];
    const out = resolveOnComplete(stream);
    const complete = out.filter((c) => c.status === 'complete').length;
    expect(complete).toBe(out.length); // 2/2, not 1/2
  });
});

describe('anti-drift: onSessionComplete resolves dangling working cards (not just sets active=false)', () => {
  it('the host onSessionComplete maps remaining working cards to a terminal AI-skipped state', () => {
    expect(host).toMatch(/const onSessionComplete = \(\) => \{[\s\S]*?setLiveChunkSessionActive\(false\);/);
    expect(host).toMatch(/setLiveChunkStream\(prev => prev\.map\(c => c\.status === 'working'/);
    expect(host).toMatch(/status: 'complete', usedOriginal: true, aiVerified: false, integrityPassed: false, incomplete: true/);
  });
  it('the OLD one-liner (only active=false) is gone', () => {
    expect(host).not.toMatch(/const onSessionComplete = \(\) => \{ setLiveChunkSessionActive\(false\); \};/);
  });
});
