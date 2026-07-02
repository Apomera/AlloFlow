// Session soft-end terminal handling (2026-07-01) — source pins on
// AlloFlowANTI.txt, in the style of canvas_shell_live_controls.test.js.
//
// Why: there are TWO end-session paths. The session modal hard-deletes the
// session doc (students detect doc-not-found and unmount all session UI),
// but handleEndLiveSession — wired into the quiz teacher controls — only
// soft-ends it (isActive:false / status:'ended') and leaves the doc in
// place. Before the fix, the student onSnapshot callback only checked
// existence, so soft-ended students stayed in a zombie session with live
// overlays still armed. These pins keep both the terminal check and the
// livePolling presence-gating wiring from regressing.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

describe('student-side terminal handling of a soft-ended session', () => {
  it('treats isActive:false / status:"ended" like a deleted session doc', () => {
    expect(src).toContain("if (data && (data.isActive === false || data.status === 'ended'))");
  });

  it('exits the session on soft-end (clears code + data, toasts once)', () => {
    const idx = src.indexOf("if (data && (data.isActive === false || data.status === 'ended'))");
    expect(idx).toBeGreaterThan(-1);
    const block = src.slice(idx, idx + 700);
    expect(block).toContain('setActiveSessionCode(null)');
    expect(block).toContain('setSessionData(null)');
    expect(block).toContain("addToast(t('session.toast_ended')");
    expect(block).toContain('hasConnectedRef.current = false');
  });

  it('handleEndLiveSession still soft-ends with the fields the terminal check reads', () => {
    expect(src).toContain("isActive: false,");
    expect(src).toContain("status: 'ended',");
  });

  it('soft-end is followed by a delayed delete (session metadata must not outlive the class)', () => {
    // Data-hygiene invariant: ALL end paths converge on deletion. The session
    // modal and the teacher-unload handler hard-delete; the quiz-dashboard
    // soft-end now schedules a delete after the terminal marker lands.
    const idx = src.indexOf('const handleEndLiveSession');
    expect(idx).toBeGreaterThan(-1);
    const block = src.slice(idx, idx + 1600);
    expect(block).toContain("status: 'ended',");
    expect(block).toContain('setTimeout(() => { deleteDoc(sessionRef).catch(() => {}); }');
  });
});

describe('session code entropy + rules-compatible TTL cleanup', () => {
  it('session codes are 5 characters over the confusable-stripped alphabet', () => {
    const idx = src.indexOf('const generateSessionCode');
    expect(idx).toBeGreaterThan(-1);
    const fn = src.slice(idx, idx + 600);
    expect(fn).toContain("'ABCDEFGHJKMNPQRSTUVWXYZ23456789'");
    expect(fn).toContain('for (let i = 0; i < 5; i++)');
  });

  it('stale bridge-payload TTL cleanup runs for BOTH roles (host succeeds under rules)', () => {
    // Under firestore.rules only the session host may delete bridgePayload /
    // bridgeChat; if this cleanup lived in the student-only branch the 24h
    // TTL would never fire post-rules. Pin: cleanup sits BEFORE the
    // !isTeacherMode gate in the session onSnapshot handler.
    const cleanupIdx = src.indexOf('bridgePayload: deleteField(), bridgeChat: deleteField()');
    expect(cleanupIdx).toBeGreaterThan(-1);
    const snapshotIdx = src.indexOf('setSessionData(data);');
    const studentGateIdx = src.indexOf('if (!isTeacherMode) {', snapshotIdx);
    expect(cleanupIdx).toBeGreaterThan(snapshotIdx);
    expect(cleanupIdx).toBeLessThan(studentGateIdx);
  });
});

describe('live polling presence gating (Tier-1 livePolling leaf)', () => {
  it('allowlists the livePolling leaf for writeToSession', () => {
    expect(src).toContain("'livePolling',");
  });

  it('passes hostActive + hostNonce from the session doc into GuestOverlay', () => {
    expect(src).toContain('hostActive: !!(sessionData && sessionData.livePolling && sessionData.livePolling.hostActive)');
    expect(src).toContain('hostNonce: (sessionData && sessionData.livePolling && sessionData.livePolling.hostOpenedAt) || 0');
  });
});
