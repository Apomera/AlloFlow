// Reliability fixes from the 2-day review workflow (2026-06-21):
//  - acl-1 (HIGH): the dead-man watchdog fire() must set the auto-continue STOP ref (not just abort the
//    controller), and runAutoFixLoop must carry the run-generation guard fixAndVerifyPdf has — otherwise
//    a fired watchdog couldn't stop the loop and the Make-Accessible wrapper fired 3 fresh re-runs.
//  - CB-1: the Gemini circuit breaker (a session singleton) must be reset at the START of each run, so a
//    storm in document A doesn't start document B already throttled.
//  - CB-2: on recovery the breaker must clear _geminiCooldownUntil, so "restoring concurrency" isn't a
//    lie for up to ~90s while the stale cooldown blocks the queue.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('acl-1: the watchdog can actually stop the auto-continue loop', () => {
  it('fire() sets the stop ref BEFORE aborting the controller (mirrors the reset path)', () => {
    // The fire() body must contain the stop-ref set; the controller abort alone is insufficient.
    const fireStart = host.indexOf('const fire = () => {');
    expect(fireStart).toBeGreaterThan(0);
    const fireBody = host.slice(fireStart, fireStart + 1200);
    expect(fireBody).toMatch(/pdfAutoContinueAbortRef\.current = true;/);
    // ordering: the ref-set appears before the controller.abort() inside fire()
    expect(fireBody.indexOf('pdfAutoContinueAbortRef.current = true'))
      .toBeLessThan(fireBody.indexOf('pdfAutoContinueAbortCtrlRef.current.abort()'));
  });
  it('runAutoFixLoop captures the run-gen at entry and bails per-round when it goes stale', () => {
    expect(host).toMatch(/const _myRunGen = \(typeof window !== 'undefined'\) \? \(window\.__alloPdfRunGen \|\| 0\) : 0;/);
    expect(host).toMatch(/const _genStale = \(\) => \(typeof window !== 'undefined'\) && \(\(window\.__alloPdfRunGen \|\| 0\) !== _myRunGen\)/);
    expect(host).toMatch(/if \(pdfAutoContinueAbortRef\.current \|\| _genStale\(\)\) break;/);
    // The per-round write is guarded against both a stale run and an intervening
    // direct HTML edit; it reloads the authoritative ref before stopping.
    expect(host).toMatch(/if \(_genStale\(\) \|\| pdfHtmlRevisionRef\.current !== _roundHtmlRevision\) \{\s*\n\s*cur = pdfFixResultRef\.current;\s*\n\s*break;\s*\n\s*\}\s*\n\s*\/\/ Sweep 2026-06-11 \[3\]/);
    expect(host).toContain('setPdfFixResult(snapshot);');
  });
});

describe('CB-1: the Gemini breaker is reset at the start of each run', () => {
  it('defines _resetGeminiBreaker clearing cap/streaks/cooldown/announced', () => {
    const s = pipe.indexOf('var _resetGeminiBreaker = function() {');
    expect(s).toBeGreaterThan(0);
    const body = pipe.slice(s, s + 600);
    expect(body).toMatch(/_geminiCap = _GEMINI_MAX_CONCURRENT;/);
    expect(body).toMatch(/_geminiAuthStreak = 0;/);
    expect(body).toMatch(/_geminiTransientStreak = 0;/);
    expect(body).toMatch(/_geminiCooldownUntil = 0;/);
    expect(body).toMatch(/_geminiStormAnnounced = false;/);
  });
  it('fixAndVerifyPdf calls it in the per-run reset block (next to the telemetry reset)', () => {
    // M3 (2026-07-09): the reset is now gated on an IDLE gate — an overlapping run's live storm
    // state must not be zeroed under it — so the window widened past the old 400 chars.
    expect(pipe).toMatch(/_pipelineStats\.lastOpenStep = null;[\s\S]{0,1400}_resetGeminiBreaker\(\);/);
    expect(pipe).toContain('if (_geminiInFlight > 0 || _geminiWaiters.length > 0) {');
  });
});

describe('CB-2: recovery clears the stale cooldown', () => {
  it('_geminiNoteSuccess sets _geminiCooldownUntil = 0 before pumping on recovery', () => {
    const s = pipe.indexOf('var _geminiNoteSuccess = function() {');
    expect(s).toBeGreaterThan(0);
    const body = pipe.slice(s, s + 1000);
    expect(body).toMatch(/_geminiCooldownUntil = 0;/);
    expect(body.indexOf('_geminiCooldownUntil = 0')).toBeLessThan(body.indexOf('_geminiPump()'));
  });
});

// ── Behaviour mirror: a per-run reset must restore the cap a prior storm dropped ──
describe('breaker reset behaviour (mirror)', () => {
  const makeBreaker = () => {
    const st = { cap: 3, auth: 0, transient: 0, ok: 0, cooldownUntil: 0, announced: false };
    const MAX = 3, MIN = 1;
    return {
      st,
      storm() { st.cap = MIN; st.cooldownUntil = 90000; st.announced = true; st.auth = 2; },
      reset() { st.cap = MAX; st.auth = 0; st.transient = 0; st.ok = 0; st.cooldownUntil = 0; st.announced = false; },
    };
  };
  it('a run that ends mid-storm leaves the breaker tripped; the next run resets it', () => {
    const b = makeBreaker();
    b.storm();
    expect(b.st.cap).toBe(1);          // doc A stormed and ended here
    b.reset();                         // doc B starts → CB-1 reset
    expect(b.st.cap).toBe(3);          // doc B is NOT inheriting A's throttle
    expect(b.st.cooldownUntil).toBe(0);
    expect(b.st.announced).toBe(false);
  });
});
