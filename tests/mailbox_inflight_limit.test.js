// One device must not burst the teacher's Class Mailbox (2026-10-30).
//
// Apps Script allows 30 simultaneous runs per mailbox owner, and a run waiting
// on the script lock still counts. A single test device produced ~17 requests in
// two seconds (11:16 PM, Oct 29), each queuing on the lock for up to 5 s, and
// Google warned about simultaneous executions. _alloMailboxCall now lets at most
// ALLO_MB_MAX_IN_FLIGHT requests out at once and logs each call (action and
// timings only) for the Diagnostics report.
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const app = readFileSync(process.env.ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8');
const limiterSrc = sliceBetween(app, 'const ALLO_MB_MAX_IN_FLIGHT = ', 'async function _alloMailboxCallNow(', { file: 'AlloFlowANTI.txt' });
const reporter = readFileSync('error_reporter_module.js', 'utf8');
const linesSrc = sliceBetween(reporter, '  function mailboxCallLines(ring, flight, now) {', '\n  }\n', { file: 'error_reporter_module.js', includeEnd: true });

function load(network) {
  return new Function('_alloMailboxCallNow', limiterSrc + '\nreturn { call: _alloMailboxCall, max: ALLO_MB_MAX_IN_FLIGHT };')(network);
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('mailbox in-flight limit', () => {
  beforeEach(() => { delete window.__alloMailboxCallTrace; delete window.__alloMailboxFlight; delete window.__alloSessionSyncTrace; });

  it('lets at most the cap out at once, and every call still completes in order of arrival', async () => {
    let live = 0, peak = 0;
    const pending = [];
    const network = (url, payload) => new Promise((resolve) => {
      live += 1; peak = Math.max(peak, live);
      pending.push(() => { live -= 1; resolve({ ok: true, a: payload.a }); });
    });
    const m = load(network);
    expect(m.max).toBe(3);
    const results = Array.from({ length: 17 }, (_, i) => m.call('https://x', { a: 'dpatch', i }));
    await tick();
    expect(live).toBe(3);
    while (pending.length) { pending.shift()(); await tick(); }
    const done = await Promise.all(results);
    expect(done).toHaveLength(17);
    expect(peak, 'never more than the cap in flight').toBe(3);
    const flight = window.__alloMailboxFlight;
    expect(flight).toMatchObject({ inFlight: 0, queued: 0, peakInFlight: 3, max: 3 });
    expect(flight.peakQueued).toBe(14);
    expect(window.__alloSessionSyncTrace.filter((e) => e.event === 'mailbox:burst-held')).toHaveLength(1);
  });

  it('a failed call frees its slot and is logged with its error code', async () => {
    const m = load((url, payload) => payload.fail
      ? Promise.reject(Object.assign(new Error('Mailbox error: busy'), { code: 'allo/mailbox-busy' }))
      : Promise.resolve({ ok: true }));
    await expect(m.call('u', { a: 'send', fail: true })).rejects.toThrow('busy');
    await Promise.all([1, 2, 3, 4].map(() => m.call('u', { a: 'recv' })));
    const ring = window.__alloMailboxCallTrace;
    expect(ring[0]).toMatchObject({ a: 'send', outcome: 'busy' });
    expect(ring.slice(1).every((c) => c.a === 'recv' && c.outcome === 'ok')).toBe(true);
    expect(window.__alloMailboxFlight.inFlight).toBe(0);
  });

  it('the Diagnostics report summarizes calls by action without any message content', () => {
    const lines = new Function(linesSrc + '\nreturn mailboxCallLines;')();
    const now = Date.UTC(2026, 9, 30, 12, 0, 0);
    const ring = [
      { at: now - 700000, a: 'recv', waitMs: 0, ms: 300, outcome: 'ok' },
      { at: now - 2000, a: 'dpatch', waitMs: 900, ms: 1200, outcome: 'ok' },
      { at: now - 1000, a: 'dpatch', waitMs: 1200, ms: 2100, outcome: 'busy' },
      { at: now - 500, a: 'recv', waitMs: 0, ms: 400, outcome: 'ok' },
    ];
    const text = lines(ring, { inFlight: 1, queued: 0, peakInFlight: 3, peakQueued: 14, max: 3 }, now);
    expect(text).toContain('-- Mailbox calls (last 10 min: 3; dpatch 2, recv 1) --');
    expect(text).toContain('peak in flight 3, peak queued 14');
    expect(text).toContain('dpatch wait 1200ms run 2100ms busy');
    expect(lines([], null, now)).toBe('');
  });
});
