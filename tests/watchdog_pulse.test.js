// Fix A (2026-06-21): the dead-man watchdog resets only on 'alloflow:pipeline-warn', which _pipeLog
// fires on call start/done/step events. The [Retry]/[GeminiGate] throttle events are plain warnLog and
// never pulsed it — so under a sustained Canvas 401 throttle, every call stuck retrying for >8 min with
// no _pipeLog event read as "silence" and the watchdog cleared a slow-but-progressing run (the false
// "premature bail"). A retry is activity → it must pulse the watchdog.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const misc = readFileSync(resolve(process.cwd(), 'misc_handlers_source.jsx'), 'utf8');

const gateStart = pipe.indexOf('var _GEMINI_MAX_CONCURRENT = 3;');
const gateEnd = pipe.indexOf('var _pulsePipelineWatchdog');
const gateBlock = pipe.slice(gateStart, gateEnd);

function makeQueuedHeartbeatGate() {
  let now = 1000;
  let nextTimerId = 1;
  const timers = new Map();
  const pulses = [];
  const fakeSetTimeout = (fn, delay) => {
    const id = nextTimerId++;
    timers.set(id, { fn, dueAt: now + Math.max(0, Number(delay) || 0) });
    return id;
  };
  const fakeClearTimeout = (id) => { timers.delete(id); };
  const advance = (ms) => {
    const target = now + ms;
    while (true) {
      let selectedId = null;
      let selected = null;
      for (const [id, timer] of timers) {
        if (timer.dueAt <= target && (!selected || timer.dueAt < selected.dueAt)) {
          selectedId = id;
          selected = timer;
        }
      }
      if (!selected) break;
      now = selected.dueAt;
      timers.delete(selectedId);
      selected.fn();
    }
    now = target;
  };
  const factory = new Function(
    'warnLog', '_pipelineStats', '_pipeLog', 'setTimeout', 'clearTimeout', 'Date',
    '_usesLocalTextBackend', '_pulsePipelineWatchdog',
    gateBlock +
      '\nreturn {' +
      ' acquire: _acquireGeminiSlot, release: _releaseGeminiSlot,' +
      ' state: function () { return { inFlight: _geminiInFlight, waiters: _geminiWaiters.length }; }' +
      ' };'
  );
  const api = factory(
    () => {}, {}, () => {}, fakeSetTimeout, fakeClearTimeout, { now: () => now }, () => false,
    (owner) => pulses.push({ owner, at: now }),
  );
  return { api, pulses, advance, pendingTimers: () => timers.size };
}

const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

describe('the retry path pulses the dead-man watchdog (fix A)', () => {
  it('defines _pulsePipelineWatchdog that dispatches alloflow:pipeline-warn', () => {
    expect(pipe).toMatch(/var _pulsePipelineWatchdog = function \(owner\) \{/);
    expect(pipe).toMatch(/_pulsePipelineWatchdog[\s\S]{0,900}new CustomEvent\('alloflow:pipeline-warn'/);
  });
  it('is called on BOTH the canvas-auth retry and the generic transient retry', () => {
    // canvas-auth retry branch (before the backoff sleep)
    expect(pipe).toMatch(/_pulsePipelineWatchdog\(owner\);[\s\S]{0,300}setTimeout\(r, _backoff\)/);
    // generic transient retry branch
    expect(pipe).toMatch(/_pulsePipelineWatchdog\(owner\); \/\/ a retry is activity \(fix A\)/);
  });
  it('the watchdog still re-arms on alloflow:pipeline-warn (the heartbeat it listens to)', () => {
    expect(host).toMatch(/addEventListener\('alloflow:pipeline-warn', onActivity\)/);
    expect(host).toContain('const dueAt = Math.max(lastAcceptedActivityAt + IDLE_LIMIT, wakeGraceUntil);');
  });
});

describe('queued Gemini calls keep their owning remediation lease alive', () => {
  it('BEHAVIORAL: a call queued behind foreign owners for more than eight minutes emits only owner-matching pulses', async () => {
    const g = makeQueuedHeartbeatGate();
    const foreignOwners = [1, 2, 3].map((n) => ({ runId: 'foreign-' + n, documentEpoch: 7 }));
    const owner = { runId: 'target-run', documentEpoch: 7 };
    for (const foreignOwner of foreignOwners) g.api.acquire(null, 'foreign call', foreignOwner);
    const queued = g.api.acquire(null, 'target call', owner);
    expect(g.api.state()).toEqual({ inFlight: 3, waiters: 1 });

    g.advance(9 * 60 * 1000);
    const accepted = g.pulses.filter((pulse) =>
      pulse.owner && pulse.owner.runId === owner.runId && pulse.owner.documentEpoch === owner.documentEpoch
    );
    expect(accepted.length).toBeGreaterThan(8);
    expect(accepted.every((pulse) => pulse.owner === owner)).toBe(true);
    for (let i = 1; i < accepted.length; i++) {
      expect(accepted[i].at - accepted[i - 1].at).toBeLessThanOrEqual(30000);
    }

    g.api.release();
    await queued;
    await flush();
    const countAfterStart = g.pulses.filter((pulse) => pulse.owner === owner).length;
    g.advance(2 * 60 * 1000);
    expect(g.pulses.filter((pulse) => pulse.owner === owner)).toHaveLength(countAfterStart);
    expect(g.pendingTimers()).toBe(0);
  });

  it('BEHAVIORAL: aborting a queued owner rejects immediately and clears its heartbeat timer', async () => {
    const g = makeQueuedHeartbeatGate();
    for (let i = 0; i < 3; i++) g.api.acquire(null, 'foreign-' + i, { runId: 'foreign-' + i, documentEpoch: 4 });
    const owner = { runId: 'cancelled-run', documentEpoch: 4 };
    const controller = new AbortController();
    let error = null;
    const queued = g.api.acquire(controller.signal, 'cancel me', owner).catch((err) => { error = err; });
    expect(g.api.state().waiters).toBe(1);
    expect(g.pendingTimers()).toBe(1);
    controller.abort();
    await queued;
    await flush();
    expect(error && error.name).toBe('AbortError');
    expect(g.api.state().waiters).toBe(0);
    expect(g.pendingTimers()).toBe(0);
    const pulseCount = g.pulses.filter((pulse) => pulse.owner === owner).length;
    g.advance(2 * 60 * 1000);
    expect(g.pulses.filter((pulse) => pulse.owner === owner)).toHaveLength(pulseCount);
  });

  it('threads ownership through real calls, probes, and the auto-continue calm wait', () => {
    expect(pipe).toMatch(/_sig, 'gemini-probe', o\.owner \|\| null/);
    expect(pipe).toMatch(/_gateSignal, label, owner \|\| null/);
    expect(misc).toContain('signal: _abortCtrl.signal, owner: _loopOwner, onTick: (w) => {');
  });
});

describe('watchdogs tolerate browser suspension before destructive reset', () => {
  it('pauses while hidden and grants a pageshow/visibility wake grace in both watchdogs', () => {
    expect((host.match(/addEventListener\('visibilitychange', onVisibilityOrPageShow\)/g) || [])).toHaveLength(2);
    expect((host.match(/addEventListener\('pageshow', onVisibilityOrPageShow\)/g) || [])).toHaveLength(2);
    expect(host).toContain('firedAt - timerDueAt > LATE_TIMER_GRACE_THRESHOLD_MS');
    expect(host).toContain('firedAt - timerDueAt > AUTO_LATE_TIMER_GRACE_THRESHOLD_MS');
    expect(host).toContain('firedAt + WAKE_GRACE_MS');
    expect(host).toContain('firedAt + AUTO_WAKE_GRACE_MS');
  });
});
