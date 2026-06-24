// Proactive heavy/scanned-doc PACING for the Gemini gate (2026-06-24, maintainer ask):
// "if you back off can you make the rest of the calls occur later so it just slows things down a bit and
//  staggers but doesn't sacrifice accuracy or thoroughness."
// So pacing must (a) lower the per-run concurrency CEILING and SPACE the call starts for heavy/scanned docs,
// but (b) DROP NO calls — the queue defers + drains every one. These tests pin both the behavior (via the
// extracted gate closure with shimmed timers) and the source wiring (anti-drift).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── extract the self-contained GeminiGate closure (vars + pump + gate + pacing) ──
const _gs = dp.indexOf('var _GEMINI_MAX_CONCURRENT = 3;');
const _ge = dp.indexOf('var _pulsePipelineWatchdog');
const gateBlock = dp.slice(_gs, _ge);

// A controllable fake timer queue so we can drive the stagger deterministically.
function makeGate() {
  const timers = [];
  let now = 1000;
  const fakeSetTimeout = (fn) => { const id = timers.length + 1; timers.push({ id, fn }); return id; };
  const fakeClearTimeout = (id) => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); };
  const fakeDate = { now: () => now };
  const factory = new Function(
    'warnLog', '_pipelineStats', '_pipeLog', 'setTimeout', 'clearTimeout', 'Date',
    gateBlock +
    '\nreturn {' +
    '  acquire: _acquireGeminiSlot, release: _releaseGeminiSlot, gate: _geminiGate,' +
    '  pump: _geminiPump, applyPacing: _applyGeminiPacing, reset: _resetGeminiBreaker,' +
    '  noteSuccess: _geminiNoteSuccess,' +
    '  state: function(){ return { cap: _geminiCap, inFlight: _geminiInFlight, waiters: _geminiWaiters.length, effMax: _geminiEffectiveMax, stagger: _geminiStaggerMs }; }' +
    '};'
  );
  const api = factory(() => {}, {}, () => {}, fakeSetTimeout, fakeClearTimeout, fakeDate);
  return {
    api,
    fireTimers: () => { const t = timers.splice(0, timers.length); t.forEach(x => x.fn()); },
    pendingTimers: () => timers.length,
    advance: (ms) => { now += ms; },
  };
}

describe('default (no pacing): a burst fills up to the full ceiling of 3 immediately', () => {
  it('5 simultaneous acquires → 3 in flight, 2 queued, no stagger timer', () => {
    const g = makeGate();
    for (let i = 0; i < 5; i++) g.api.acquire();
    const s = g.api.state();
    expect(s.cap).toBe(3);
    expect(s.effMax).toBe(3);
    expect(s.stagger).toBe(0);
    expect(s.inFlight).toBe(3);   // filled the whole ceiling at once
    expect(s.waiters).toBe(2);
    expect(g.pendingTimers()).toBe(0); // nothing deferred to a timer
  });
});

describe('heavy/scanned pacing: lower ceiling + stagger the starts, but DROP NOTHING', () => {
  it('applyPacing(true) lowers the effective ceiling to 2 and sets a stagger gap', () => {
    const g = makeGate();
    g.api.applyPacing(true);
    const s = g.api.state();
    expect(s.effMax).toBe(2);
    expect(s.cap).toBe(2);        // clamped down from 3
    expect(s.stagger).toBeGreaterThan(0);
  });

  it('a 5-call burst starts only ONE immediately, defers the rest until the stagger gap elapses (spread over time)', () => {
    const g = makeGate();
    g.api.applyPacing(true);
    for (let i = 0; i < 5; i++) g.api.acquire();   // all arrive at the same instant (clock not advanced)
    let s = g.api.state();
    expect(s.inFlight).toBe(1);          // only ONE fired immediately; the rest must wait their gap
    expect(s.waiters).toBe(4);           // the other four are QUEUED, not dropped
    expect(g.pendingTimers()).toBe(1);   // the next start is scheduled, not abandoned

    g.advance(800);                      // > staggerMs → the gap has elapsed
    g.fireTimers();                      // stagger timer fires → next start
    s = g.api.state();
    expect(s.inFlight).toBe(2);          // filled to the (lowered) ceiling of 2, one gap later
    expect(s.waiters).toBe(3);           // still 3 waiting — none lost
  });

  it('does NOT start a second call before the gap elapses (true spacing, not just lower concurrency)', () => {
    const g = makeGate();
    g.api.applyPacing(true);
    for (let i = 0; i < 5; i++) g.api.acquire();
    expect(g.api.state().inFlight).toBe(1);
    g.advance(100);                      // < staggerMs (700) — too soon
    g.fireTimers();
    expect(g.api.state().inFlight).toBe(1); // still just one; the gap hasn't passed
    expect(g.pendingTimers()).toBe(1);      // re-scheduled for the remaining gap
  });

  it('the queue fully drains as calls complete — every one of the 5 eventually runs (thoroughness preserved)', () => {
    const g = makeGate();
    g.api.applyPacing(true);
    let started = 0;
    // wrap acquire so we can count how many resolvers actually fire
    const ran = [];
    for (let i = 0; i < 5; i++) g.api.acquire().then(() => { started++; ran.push(i); });
    // drain: advance past the gap, fire any pending stagger timer, then release whatever is in flight, repeat
    for (let guard = 0; guard < 50 && (g.api.state().inFlight > 0 || g.api.state().waiters > 0); guard++) {
      g.advance(1000);                 // jump past the stagger gap so deferred starts fire
      if (g.pendingTimers()) g.fireTimers();
      const inFlight = g.api.state().inFlight;
      for (let k = 0; k < inFlight; k++) g.api.release();
    }
    return Promise.resolve().then(() => {
      expect(started).toBe(5); // ALL FIVE ran — pacing deferred, never dropped
      expect(g.api.state().waiters).toBe(0);
      expect(g.api.state().inFlight).toBe(0);
    });
  });

  it('recovery after a storm restores only to the LOWERED ceiling (2), never back to 3', () => {
    const g = makeGate();
    g.api.applyPacing(true);             // effMax = 2
    // simulate a storm having dropped the live cap to 1, then clean successes
    g.api.applyPacing(true);             // idempotent; cap stays 2
    // noteSuccess only raises when cap < effMax; force cap below by re-pacing tighter then recovering
    g.api.applyPacing(true, { maxConcurrent: 1, staggerMs: 500 });
    expect(g.api.state().cap).toBe(1);
    expect(g.api.state().effMax).toBe(1);
    // now widen the run ceiling back to 2 and let successes recover the live cap up to it
    g.api.applyPacing(true, { maxConcurrent: 2, staggerMs: 500 });
    // applyPacing doesn't RAISE the live cap (only lowers); successes do the raising
    for (let i = 0; i < 6; i++) g.api.noteSuccess();
    expect(g.api.state().cap).toBe(2);   // recovered to effMax...
    expect(g.api.state().cap).not.toBe(3); // ...not to the global max
  });

  it('reset clears pacing back to the full ceiling for the next document', () => {
    const g = makeGate();
    g.api.applyPacing(true);
    expect(g.api.state().effMax).toBe(2);
    g.api.reset();
    const s = g.api.state();
    expect(s.effMax).toBe(3);
    expect(s.stagger).toBe(0);
    expect(s.cap).toBe(3);
  });

  it('applyPacing(false) is a clean no-op restoration', () => {
    const g = makeGate();
    g.api.applyPacing(true);
    g.api.applyPacing(false);
    expect(g.api.state().effMax).toBe(3);
    expect(g.api.state().stagger).toBe(0);
  });
});

describe('anti-drift: the pacing wiring ships in the source', () => {
  it('declares the pacing vars (incl. the last-start clock for min-interval spacing)', () => {
    expect(dp).toMatch(/var _geminiEffectiveMax = _GEMINI_MAX_CONCURRENT;/);
    expect(dp).toMatch(/var _geminiStaggerMs = 0;/);
    expect(dp).toMatch(/var _geminiStaggerTimer = null;/);
    expect(dp).toMatch(/var _geminiLastStartAt = 0;/);
  });
  it('the pump recovers toward _geminiEffectiveMax (not the raw global max)', () => {
    expect(dp).toMatch(/if \(_geminiCap < _geminiEffectiveMax && _geminiCooldownUntil > 0\)/);
    expect(dp).toMatch(/_geminiCap = Math\.min\(_geminiEffectiveMax, _geminiCap \+ 1\);/);
  });
  it('the pump enforces a min gap between starts and records each start time', () => {
    expect(dp).toMatch(/if \(_geminiStaggerMs > 0 && _geminiLastStartAt > 0\)/);
    expect(dp).toMatch(/var _sinceLast = now - _geminiLastStartAt;/);
    expect(dp).toMatch(/if \(_sinceLast < _geminiStaggerMs\)/);
    expect(dp).toMatch(/_geminiLastStartAt = now;/);
  });
  it('noteSuccess restores to _geminiEffectiveMax', () => {
    expect(dp).toMatch(/_geminiCap = _geminiEffectiveMax; \/\/ restore to THIS run's ceiling/);
  });
  it('reset clears the pacing state', () => {
    expect(dp).toMatch(/_geminiEffectiveMax = _GEMINI_MAX_CONCURRENT;\s*\n\s*_geminiStaggerMs = 0;/);
  });
  it('_applyGeminiPacing exists and is invoked at run-start (heavy audit) and on scanned-detection', () => {
    expect(dp).toMatch(/var _applyGeminiPacing = function \(heavy, opts\)/);
    expect(dp).toMatch(/if \(_heavyScanned \|\| _heavyPages >= 8\) \{\s*\n\s*_applyGeminiPacing\(true,/);
    expect(dp).toMatch(/_applyGeminiPacing\(true, \(det\.pageCount >= 20\)/);
  });
});
