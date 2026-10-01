// Mailbox poll cadence (2026-07-28).
//
// `_alloNextPollDelay` has two relaxations — a park while the tab is hidden and
// a stretch once the session has been idle for two minutes. Both were written
// against the 2.5s mailbox-only base, where `5000` and `Math.min(base*1.6, 4000)`
// were increases. When the WebRTC fast path started passing `baseMs: 8000`, the
// same two expressions became DECREASES (Math.min(12800, 4000) === 4000), so a
// hidden or idle student on the fast path polled the teacher's Apps Script
// mailbox more often than an active one — burning the teacher's quota exactly
// when nothing was happening.
//
// The pin is the invariant, not the constants: a relaxation may never return a
// shorter interval than its own base, at any base. Numbers get retuned; this
// property must survive the retune.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const srcMirror = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8');
const appJsx = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/App.jsx'), 'utf8');

// ── eval-slice the REAL helper ──────────────────────────────────────────────
const start = anti.indexOf('function _alloNextPollDelay(');
const end = anti.indexOf('function _alloCollectResChunk(');
if (start < 0 || end < 0 || end <= start) throw new Error('poll-delay slice anchors missed');
const nextPollDelay = new Function(
  'const ALLO_MB_POLL_MS = 2500;\n' + anti.slice(start, end) + '\nreturn _alloNextPollDelay;'
)();

// Jitter is ±10% (0.9 + random*0.2); 0.5 lands exactly on the un-jittered value.
const noJitter = () => vi.spyOn(Math, 'random').mockReturnValue(0.5);
const IDLE = 120001;
// 2500 = mailbox-only polling. 8000 = the WebRTC fast-path base passed by the
// student recv loop once its data channel is open.
const BASES = [2500, 8000];

afterEach(() => { vi.restoreAllMocks(); });

describe('_alloNextPollDelay: relaxations only ever slow the loop down', () => {
  it('never returns less than its own base when parked or idle, at any base', () => {
    noJitter();
    for (const baseMs of [1000, 2500, 4000, 8000, 12000]) {
      expect(nextPollDelay({ baseMs, hidden: true })).toBeGreaterThanOrEqual(baseMs);
      expect(nextPollDelay({ baseMs, idleMs: IDLE })).toBeGreaterThanOrEqual(baseMs);
    }
  });

  it('an idle student never polls more often than an active one', () => {
    noJitter();
    for (const baseMs of BASES) {
      const active = nextPollDelay({ baseMs, idleMs: 0 });
      const idle = nextPollDelay({ baseMs, idleMs: IDLE });
      const hidden = nextPollDelay({ baseMs, hidden: true });
      expect(idle).toBeGreaterThanOrEqual(active);
      expect(hidden).toBeGreaterThanOrEqual(active);
    }
  });

  it('leaves the 2.5s mailbox-only cadence exactly as it was', () => {
    noJitter();
    // These three were correct before the clamp and must not move: the clamp is
    // a fix for the 8000 base, not a retune of the mailbox-only path.
    expect(nextPollDelay({ baseMs: 2500, idleMs: 0 })).toBe(2500);
    expect(nextPollDelay({ baseMs: 2500, idleMs: IDLE })).toBe(4000);
    expect(nextPollDelay({ baseMs: 2500, hidden: true })).toBe(5000);
  });

  it('holds the WebRTC fast-path base instead of halving it', () => {
    noJitter();
    // Before the fix these both returned 4000 and 5000 — faster than the 8000
    // the caller asked for, which is the whole defect.
    expect(nextPollDelay({ baseMs: 8000, idleMs: IDLE })).toBe(8000);
    expect(nextPollDelay({ baseMs: 8000, hidden: true })).toBe(8000);
  });

  it('still backs off on errors and still applies jitter', () => {
    noJitter();
    expect(nextPollDelay({ baseMs: 2500, errorCount: 1 })).toBe(5000);
    expect(nextPollDelay({ baseMs: 2500, errorCount: 9 })).toBe(15000); // capped
    vi.restoreAllMocks();
    // Jitter keeps a class from stampeding the mailbox in lockstep.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const low = nextPollDelay({ baseMs: 2500 });
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const high = nextPollDelay({ baseMs: 2500 });
    expect(low).toBeLessThan(high);
    expect(low).toBeGreaterThanOrEqual(2250);
    expect(high).toBeLessThanOrEqual(2750);
  });
});

describe('three-copy sync', () => {
  it('ships the clamp in every copy of the shell', () => {
    const clamped = 'Math.max(baseMs, Math.min(baseMs * 1.6, 4000))';
    const inverted = 'idleMs > 120000 ? Math.min(baseMs * 1.6, 4000)';
    for (const [name, copy] of [['root ANTI', anti], ['src ANTI', srcMirror], ['App.jsx', appJsx]]) {
      expect(copy, name).toContain(clamped);
      expect(copy, name).toContain('if (hidden) return Math.max(baseMs, 5000);');
      expect(copy, name).not.toContain(inverted);
    }
  });

  it('still has exactly the two callers this reasoning covers', () => {
    // If a third caller appears with a different base, the invariant tests above
    // are the thing to extend — not the constants.
    const callers = anti.split('_alloNextPollDelay(').length - 1;
    expect(callers).toBe(3); // 1 definition + 2 call sites
    expect(anti).toContain('baseMs: rtcOpen ? 8000 : ALLO_MB_POLL_MS');
  });
});
