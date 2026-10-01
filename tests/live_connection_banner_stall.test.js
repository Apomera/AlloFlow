// Live-session connection banners reach the student (2026-09-23).
//
// Two ways a student in a live activity could lose the class without being
// told:
//
// 1. The connection banners ("Class updates paused. Reconnecting…", with a
//    Reconnect button, and the teacher-connection warning) were fixed at
//    z-[146]. The student quiz overlay is z-[1000] and the escape room z-[9999],
//    both full-screen siblings under the same root, so the banner was painted
//    underneath exactly when it mattered. (Checked in Chromium with the
//    compiled CSS.)
// 2. Class Mailbox students never saw a connection banner at all: the mailbox
//    bridge's onSnapshot only reports an error when the bridge is missing, and
//    the student poll loop's catch only backed off. A stalled mailbox looked
//    like a teacher who had not shared anything yet.
//
// _alloMbStallTracker decides when a mailbox student is stalled: at least two
// consecutive failed polls AND 20 s since the last good one, and never while the
// WebRTC data channel is open (it carries the pushes then). It reports a
// change only, so the ~2.5 s poll never re-renders the host on its own.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const anti = readFileSync(process.env.ANTI_SOURCE || resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const appJsx = readFileSync(resolve(ROOT, 'desktop/web-app/src/App.jsx'), 'utf8');
const srcMirror = readFileSync(resolve(ROOT, 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8');

function slice(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start);
  if (start < 0 || end <= start) throw new Error('anchors missed: ' + startMarker);
  return text.slice(start, end);
}
const trackerSource = slice(anti, 'function _alloMbStallTracker(', 'function _alloCollectResChunk(');
const makeTracker = new Function(trackerSource + '\nreturn _alloMbStallTracker;')();

function clockAt(t0 = 1000000) {
  const clock = { t: t0, now: () => clock.t };
  return clock;
}

describe('_alloMbStallTracker', () => {
  it('ignores a single failure, however late', () => {
    const c = clockAt(); const s = makeTracker(c.now);
    c.t += 60000;
    expect(s.fail(false)).toBe(null);
  });

  it('ignores repeated failures inside 20 s of the last good poll', () => {
    const c = clockAt(); const s = makeTracker(c.now);
    c.t += 5000; expect(s.fail(false)).toBe(null);
    c.t += 5000; expect(s.fail(false)).toBe(null);
    c.t += 9000; expect(s.fail(false)).toBe(null);
  });

  it('reports a stall once after 2+ failures and 20 s, then stays quiet', () => {
    const c = clockAt(); const s = makeTracker(c.now);
    c.t += 5000; s.fail(false);
    c.t += 16000; expect(s.fail(false)).toBe(true);
    c.t += 15000; expect(s.fail(false)).toBe(null);
  });

  it('reports recovery once, and a healthy poll loop reports nothing', () => {
    const c = clockAt(); const s = makeTracker(c.now);
    expect(s.ok()).toBe(null);
    c.t += 5000; s.fail(false);
    c.t += 16000; s.fail(false);
    expect(s.ok()).toBe(false);
    for (let i = 0; i < 5; i++) { c.t += 2500; expect(s.ok()).toBe(null); }
  });

  it('measures the 20 s from the last GOOD poll, not the first failure', () => {
    const c = clockAt(); const s = makeTracker(c.now);
    c.t += 30000; s.ok();
    c.t += 1000; s.fail(false);
    c.t += 1000; expect(s.fail(false)).toBe(null);
  });

  it('never flags a stall while the data channel is open, and clears one when it opens', () => {
    const c = clockAt(); const s = makeTracker(c.now);
    c.t += 25000; s.fail(true);
    c.t += 5000; expect(s.fail(true)).toBe(null);
    const c2 = clockAt(); const s2 = makeTracker(c2.now);
    c2.t += 5000; s2.fail(false);
    c2.t += 16000; expect(s2.fail(false)).toBe(true);
    c2.t += 5000; expect(s2.fail(true)).toBe(false);
  });
});

describe('the student poll loop reports into it', () => {
  const loop = slice(anti, "const presence = { kind: 'student'", "// Real-time upgrade: the student offers");
  it('creates one tracker per loop and resets it on success', () => {
    expect(anti).toMatch(/const stall = _alloMbStallTracker\(\);\s*const noteStall = \(next\) => \{ if \(next !== null\) setMbStudentStalled\(next\); \};\s*const announce = async \(\) => \{\s*lastAnnounce = Date\.now\(\);\s*const presence = \{ kind: 'student'/);
    expect(loop).toMatch(/errorCount = 0;\s*noteStall\(stall\.ok\(\)\);/);
  });
  it('counts failures with the data-channel state', () => {
    expect(loop).toMatch(/errorCount = Math\.min\(errorCount \+ 1, 3\);\s*noteStall\(stall\.fail\(mbRtcRef\.current\?\.dc\?\.readyState === 'open'\)\);/);
  });
  it('clears the banner when the loop is torn down', () => {
    expect(loop).toMatch(/cancelled = true;\s*if \(timer\) clearTimeout\(timer\);\s*setMbStudentStalled\(false\);/);
  });
});

describe('banners are painted above the full-screen student activities', () => {
  const zOf = (cls) => Number(/z-\[(\d+)\]/.exec(cls)[1]);
  // Each global banner steps aside (!studentQuizCovering) while the quiz shows
  // the same notice inside its focus trap; see the next describe.
  const firebaseBanner = /\{!isTeacherMode && activeSessionCode && !studentQuizCovering && \['connecting', 'retrying', 'failed', 'access-required'\]\.includes\(liveSessionConnectionState\.status\) && \(\s*<div role="status" aria-live="polite" className="([^"]+)"/.exec(anti);
  const hostWarning = /\{showLiveHostWarning && !mbStudentStalled && !studentQuizCovering && liveSessionConnectionState\.status === 'connected' && \(\s*<div[^>]*?className=\{\s*'([^']+)'/.exec(anti);
  const mailboxBanner = /\{!isTeacherMode && activeSessionCode && mbStudentStalled && !studentQuizCovering && [^\n]*\n\s*<div role="status" aria-live="polite" data-live-mailbox-stalled="true" className="([^"]+)">\s*<span>\{t\('live_connection\.retrying'\)\}<\/span>\s*<button type="button" onClick=\{\(\) => mbPollNowRef\.current\?\.\(\)\}[^>]*>\{t\('live_connection\.reconnect'\)\}<\/button>/.exec(anti);
  const quizOverlay = /const StudentQuizOverlay[\s\S]*?className=\{`fixed inset-0 z-\[(\d+)\]/.exec(readFileSync(resolve(ROOT, 'ui_modals_source.jsx'), 'utf8'));
  const escapeSrc = readFileSync(resolve(ROOT, 'teacher_source.jsx'), 'utf8');
  const escapeZ = Math.max(...[...slice(escapeSrc, 'const ClassicStudentEscapeRoomOverlay', 'const StudentEscapeRoomOverlay').matchAll(/z-\[(\d+)\]/g)].map(m => Number(m[1])));

  it('finds every banner and overlay it compares', () => {
    expect(firebaseBanner).toBeTruthy();
    expect(hostWarning).toBeTruthy();
    expect(mailboxBanner).toBeTruthy();
    expect(quizOverlay).toBeTruthy();
    expect(escapeZ).toBeGreaterThan(1000);
  });

  it('each banner outranks the quiz overlay and every escape-room layer', () => {
    const floor = Math.max(Number(quizOverlay[1]), escapeZ);
    for (const m of [firebaseBanner, hostWarning, mailboxBanner]) expect(zOf(m[1])).toBeGreaterThan(floor);
  });

  it('the teacher warning yields to the mailbox banner (same spot, and the stall is the real cause)', () => {
    expect(hostWarning).toBeTruthy();
  });

  it('reuses translated strings that exist', () => {
    const strings = readFileSync(resolve(ROOT, 'ui_strings.js'), 'utf8');
    const block = slice(strings, '"live_connection": {', '}');
    expect(block).toMatch(/"retrying": "/);
    expect(block).toMatch(/"reconnect": "/);
  });
});

// 2026-09-27: the quiz traps focus, so a banner outside it was unreachable by
// keyboard. The host passes the status in; the quiz shows it inside the trap
// and reports when it covers the screen, and the global banners step aside.
describe('the quiz shows the connection notice inside its focus trap', () => {
  const mount = slice(anti, '            <StudentQuizOverlay\n', '            />');
  it('passes every connection state into the quiz', () => {
    expect(mount).toMatch(/connectionStatus=\{\['connecting', 'retrying', 'failed'\]\.includes\(liveSessionConnectionState\.status\) \? liveSessionConnectionState\.status/);
    expect(mount).toContain("liveSessionConnectionState.code === 'unauthenticated' ? 'sign_in' : 'access'");
    expect(mount).toContain(": mbStudentStalled ? 'mailbox-stalled'");
    expect(mount).toContain("(liveHostConnectionState === 'stale' ? 'host-stale' : 'host-paused')");
    expect(mount).toContain('onConnectionAction={studentConnectionAction}');
    expect(mount).toContain('onCoverChange={setStudentQuizCovering}');
  });
  it('routes the quiz buttons to the same actions as the global banners', () => {
    expect(anti).toMatch(/studentConnectionActionRef\.current = \(action\) => \{\s*if \(action === 'dismiss'\) \{ setDismissedLiveHostWarningKey\(liveHostWarningKey\); return; \}\s*if \(\['retrying', 'failed', 'access-required'\]\.includes\(liveSessionConnectionState\.status\)\) retryLiveSessionConnection\(\);\s*else if \(mbStudentStalled\) mbPollNowRef\.current\?\.\(\);/);
    // A stable function, so the memoised quiz is not re-rendered by every host render.
    expect(anti).toMatch(/const studentConnectionAction = useRef\(\(action\) => \{[^\n]*\}\)\.current;/);
  });
});

// A 30 s module watchdog that fires LATE means the device slept or the tab was
// throttled (13 modules "timed out" at once in a field report). Wait one more
// round before declaring failure; lateness is measured from when each timer was
// armed, because the fallback path re-arms without resetting startedAt.
describe('module watchdog tolerates sleep and background tabs', () => {
  const shouldWait = new Function(slice(anti, 'function _alloModuleWatchdogShouldWait(', 'function _alloMbStallTracker(') + '\nreturn _alloModuleWatchdogShouldWait;')();
  const T = 1_000_000;
  it('fails an on-time timer in a visible tab', () => {
    expect(shouldWait(T - 30000, T, false, false)).toBe(false);
    expect(shouldWait(T - 34000, T, false, false)).toBe(false);
  });
  it('waits once for a late timer or a hidden tab', () => {
    expect(shouldWait(T - 40000, T, false, false)).toBe(true);
    expect(shouldWait(T - 30000, T, true, false)).toBe(true);
  });
  it('waits only once', () => {
    expect(shouldWait(T - 90000, T, true, true)).toBe(false);
  });
  it('treats a timer with no arm time as on time', () => {
    expect(shouldWait(undefined, T, false, false)).toBe(false);
  });
  it('arms every watchdog with its own start time and re-arms once', () => {
    const loader = slice(anti, '      var watchdogRearmed = false;', '      var clearModuleLoadWatchdog = function() {');
    expect(loader).toMatch(/var expireModuleLoad = function\(armedAt\) \{/);
    expect(loader).toMatch(/if \(_alloModuleWatchdogShouldWait\(armedAt, Date\.now\(\), typeof document !== 'undefined' && document\.hidden, watchdogRearmed\)\) \{\s*watchdogRearmed = true;\s*moduleLoadWatchdog = setTimeout\(expireModuleLoad, 30000, Date\.now\(\)\);\s*return;\s*\}\s*console\.error\('\[CDN-TIMEOUT\]/);
    expect(loader).toContain('var moduleLoadWatchdog = setTimeout(expireModuleLoad, 30000, Date.now());');
    expect(anti).not.toContain('setTimeout(expireModuleLoad, 30000);');
  });
});

describe('generated copies carry the same change', () => {
  it('App.jsx and src/AlloFlowANTI.txt match the host for the tracker and the banner', () => {
    const banner = slice(anti, '{!isTeacherMode && activeSessionCode && mbStudentStalled', '{!isTeacherMode && activeSessionCode && liveSessionConnectionState.status === \'connected\'');
    const watchdogHelper = slice(anti, 'function _alloModuleWatchdogShouldWait(', 'function _alloMbStallTracker(');
    const loader = slice(anti, '      var watchdogRearmed = false;', '      var clearModuleLoadWatchdog = function() {');
    const quizMount = slice(anti, '            <StudentQuizOverlay\n', '            />');
    for (const copy of [appJsx, srcMirror]) {
      expect(copy).toContain(trackerSource);
      expect(copy).toContain(banner);
      expect(copy).toContain(watchdogHelper);
      expect(copy).toContain(loader);
      expect(copy).toContain(quizMount);
    }
  });
});
