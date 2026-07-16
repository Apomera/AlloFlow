// Presence heartbeat (2026-07-16) — closes the LIVE_SESSION_PROTOCOL spec §8
// top-risk "no presence heartbeat": the teacher's roster showed who JOINED, not
// who is still connected (a dead Chromebook looked identical to a patient kid).
//
// Design (mirrors the help-signal feature exactly):
//  - students stamp roster.{uid}.lastSeen (ms) ~every 60s (jittered) + on tab return
//  - numbers-only Tier-1 leaf, written through the gated writeToSession path
//  - the Live Session Center shows a presence dot per student:
//    green <95s · amber <200s ("quiet") · red beyond ("disconnected?") ·
//    gray when absent (older app version)
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (f) => fs.readFileSync(path.join(process.cwd(), f), 'utf8');
const ANTI = read('AlloFlowANTI.txt');
const RULES = read('firestore.rules');

describe('presence heartbeat — write path is gated and validated', () => {
  it('lastSeen is an allowed Tier-1 leaf with a justification comment', () => {
    expect(ANTI).toMatch(/'lastSeen',/);
    expect(ANTI).toMatch(/Presence heartbeat \(2026-07-16/);
  });
  it('the participant validator accepts only null or a finite non-negative number', () => {
    expect(ANTI).toMatch(/field === 'signalAt' \|\| field === 'viewingAt' \|\| field === 'lastSeen'/);
  });
  it('participantCanPatchSession allows the field on the per-uid roster root', () => {
    expect(ANTI).toMatch(/wsProgress: 1, wsProbeResult: 1, lastSeen: 1/);
  });
});

describe('presence heartbeat — student sender', () => {
  it('beats on an interval with jitter, immediately on mount, and on tab return; teacher never beats', () => {
    expect(ANTI).toMatch(/if \(isTeacherMode \|\| !activeSessionCode \|\| !user \|\| !user\.uid\) return;[\s\S]{0,900}setInterval\(beat, 60000 \+ Math\.floor\(Math\.random\(\) \* 7000\)\)/);
    expect(ANTI).toMatch(/roster\.\$\{user\.uid\}\.lastSeen`\]: Date\.now\(\)/);
    expect(ANTI).toMatch(/document\.addEventListener\('visibilitychange', onVisible\)/);
    // cleanup tears everything down
    expect(ANTI).toMatch(/clearInterval\(heartbeatId\); document\.removeEventListener\('visibilitychange', onVisible\)/);
  });
});

describe('presence heartbeat — teacher dock display', () => {
  it('renders a per-student presence dot with the three freshness bands + unknown', () => {
    expect(ANTI).toMatch(/seenAge = entry\.lastSeen \? \(dockNow - entry\.lastSeen\) : null/);
    expect(ANTI).toMatch(/seenAge < 95000/);
    expect(ANTI).toMatch(/seenAge < 200000/);
    expect(ANTI).toMatch(/presence_gone.*disconnected\?/);
    // accessible: the dot carries the label, not color alone
    expect(ANTI).toMatch(/aria-label=\{presence\.label\} title=\{presence\.label\}/);
  });
});

describe('presence heartbeat — rules documentation stays in sync', () => {
  it('firestore.rules documents the new student-written field', () => {
    expect(RULES).toMatch(/lastSeen \(2026-07-16: ms-timestamp presence heartbeat/);
  });
});
