import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const anti = read('AlloFlowANTI.txt');
const phase = read('phase_o_misc_handlers_source.jsx');
const rules = read('firestore.rules');
const moduleSource = read('phase_o_misc_handlers_module.js');
const publicModule = read('desktop/web-app/public/phase_o_misc_handlers_module.js');
const helperStart = anti.indexOf('const LIVE_HOST_HEARTBEAT_INTERVAL_MS');
const helperEnd = anti.indexOf("const ALLOHAVEN_CLASSROOM_REWARD_INBOX_KEY", helperStart);
const helpers = new Function(anti.slice(helperStart, helperEnd) + '\nreturn { LIVE_HOST_HEARTBEAT_INTERVAL_MS, LIVE_HOST_LEASE_TTL_MS, LIVE_HOST_RECONNECT_GRACE_MS, normalizeLiveHostPresence, getLiveHostConnectionState, buildLiveHostPresence };')();

describe('teacher host liveness lease', () => {
  it('defines a bounded Tier-1 lease envelope and keeps the module mirror synchronized', () => {
    expect(helpers.LIVE_HOST_HEARTBEAT_INTERVAL_MS).toBe(20000);
    expect(helpers.LIVE_HOST_LEASE_TTL_MS).toBe(90000);
    expect(helpers.LIVE_HOST_RECONNECT_GRACE_MS).toBe(45000);
    expect(anti).toContain("'hostPresence',");
    expect(anti).toContain('validLiveHostPresenceValue(safePayload.hostPresence)');
    expect(rules).toContain('hostPresence is host-owned lease metadata');
    expect(publicModule).toBe(moduleSource);
  });

  it('derives online, reconnecting, stale, and unknown states from timestamps', () => {
    const presence = helpers.buildLiveHostPresence('lease-test-1234', 100000);
    expect(helpers.normalizeLiveHostPresence(presence)).toMatchObject({ state: 'online', heartbeatAt: 100000, expiresAt: 190000 });
    expect(helpers.getLiveHostConnectionState(presence, 150000)).toBe('online');
    expect(helpers.getLiveHostConnectionState(presence, 200000)).toBe('reconnecting');
    expect(helpers.getLiveHostConnectionState(presence, 245001)).toBe('stale');
    expect(helpers.getLiveHostConnectionState(null, 245001)).toBe('unknown');
  });

  it('starts the lease from existing session creation and refreshes it through the existing write gate', () => {
    expect(phase).toContain('const hostPresence = {');
    expect(phase).toContain('hostPresence,');
    expect(anti).toContain('const _mbEmptySessionShape = () => {');
    expect(anti).toContain("writeToSession(sessionRef, { hostPresence: buildLiveHostPresence(leaseId, now) })");
    expect(anti).toContain('setInterval(beat, LIVE_HOST_HEARTBEAT_INTERVAL_MS + Math.floor(Math.random() * 5000))');
    expect(anti).toContain("document.addEventListener('visibilitychange', onVisible)");
  });

  it('surfaces a recoverable student state without changing resource-targeting precedence', () => {
    expect(anti).toContain('Teacher connection paused — keeping your place while AlloFlow reconnects.');
    expect(anti).toContain('Teacher connection is unavailable. Your work stays on this device');
    expect(anti).toContain('const leaveLiveSession = React.useCallback');
    expect(anti).toContain("hostActive: !!(sessionData && sessionData.livePolling && sessionData.livePolling.hostActive) && liveHostConnectionState !== 'stale'");
    expect(anti).toContain('individual > group > class');
  });

  it('does not turn a lease timeout into an implicit Firestore session end', () => {
    const staleIdx = anti.indexOf("liveHostConnectionState === 'stale'");
    const terminalIdx = anti.indexOf("if (data && (data.isActive === false || data.status === 'ended'))");
    expect(staleIdx).toBeGreaterThan(-1);
    expect(terminalIdx).toBeGreaterThan(-1);
    expect(anti.slice(staleIdx, staleIdx + 1800)).not.toContain('updateDoc(sessionRef, { isActive: false');
  });
});
