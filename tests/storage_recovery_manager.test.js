import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

function loadMailboxRetentionHelpers() {
  const liveStart = anti.indexOf('const ALLO_MB_LIVE_MAX_AGE_MS');
  const liveEnd = anti.indexOf('const ALLO_MB_POLL_MS', liveStart);
  const summaryStart = anti.indexOf('const shouldSaveRosterSessionSummary');
  const summaryEnd = anti.indexOf('const saveRosterSessionSummary', summaryStart);
  if (liveStart < 0 || liveEnd < 0 || summaryStart < 0 || summaryEnd < 0) {
    throw new Error('Session retention helper blocks not found');
  }
  return new Function(
    anti.slice(liveStart, liveEnd) +
    '\n' + anti.slice(summaryStart, summaryEnd) +
    '\nreturn { normalizeLive: _alloNormalizeMailboxLiveRecord, shouldSaveSummary: shouldSaveRosterSessionSummary, ttl: ALLO_MB_LIVE_MAX_AGE_MS };'
  )();
}

function loadInventoryHelpers() {
  const start = anti.indexOf('const ALLO_STORAGE_INVENTORY = (() => {');
  const end = anti.indexOf('\nconst _alloCreateDefaultStudentProjectSettings', start);
  if (start < 0 || end < 0) throw new Error('Storage inventory helper block not found');
  return new Function(anti.slice(start, end) + '\nreturn ALLO_STORAGE_INVENTORY;')();
}

const sessionRetention = loadMailboxRetentionHelpers();
const inventory = loadInventoryHelpers();

describe('resource-less live-session cleanup', () => {
  const now = Date.parse('2026-08-01T12:00:00.000Z');
  const record = {
    code: 'ABCDE',
    secret: 'secret',
    joinUrl: 'https://example.edu/join',
    savedAt: new Date(now - 60_000).toISOString()
  };

  it('keeps an active resource-less pointer within the mailbox TTL', () => {
    const normalized = sessionRetention.normalizeLive(record, now);
    expect(normalized).toMatchObject({ code: 'ABCDE', secret: 'secret' });
    expect(normalized).not.toHaveProperty('resources');
    expect(sessionRetention.ttl).toBe(6 * 60 * 60 * 1000);
  });

  it('drops expired, legacy-undated, and implausibly future pointers', () => {
    expect(sessionRetention.normalizeLive({
      ...record,
      savedAt: new Date(now - sessionRetention.ttl - 1).toISOString()
    }, now)).toBeNull();
    expect(sessionRetention.normalizeLive({ code: record.code, secret: record.secret, joinUrl: record.joinUrl }, now)).toBeNull();
    expect(sessionRetention.normalizeLive({
      ...record,
      savedAt: new Date(now + 10 * 60 * 1000).toISOString()
    }, now)).toBeNull();
  });

  it('does not archive an empty ended session but keeps meaningful evidence', () => {
    const empty = {
      resourceTitles: [],
      participants: {},
      unmatchedCodenames: [],
      classGoals: [],
      liveActivities: []
    };
    expect(sessionRetention.shouldSaveSummary(empty)).toBe(false);
    expect(sessionRetention.shouldSaveSummary(empty, '  ')).toBe(false);
    expect(sessionRetention.shouldSaveSummary({ ...empty, resourceTitles: ['Quiz'] })).toBe(true);
    expect(sessionRetention.shouldSaveSummary({ ...empty, participants: { BlueFox: {} } })).toBe(true);
    expect(sessionRetention.shouldSaveSummary({ ...empty, liveActivities: [{}] })).toBe(true);
    expect(sessionRetention.shouldSaveSummary(empty, 'Teacher follow-up note')).toBe(true);
  });

  it('timestamps both local mailbox writes and removes the pointer on end', () => {
    expect((anti.match(/ALLO_MB_LIVE_KEY, JSON\.stringify\(liveRecord\)/g) || [])).toHaveLength(2);
    expect((anti.match(/savedAt: new Date\(\)\.toISOString\(\)/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(anti).toContain('localStorage.removeItem(ALLO_MB_LIVE_KEY)');
  });
});

describe('privacy-safe managed-storage inventory', () => {
  it('returns category totals without exposing keys or values', () => {
    const rows = inventory.summarizeEntries([
      { key: 'allo_student_work', value: { response: 'private learner response' } },
      { key: 'pdf_theme_cache', value: 'cached bytes' },
      { key: 'alloflow_preferences', value: { apiKey: 'must-not-leak' } },
      { key: 'other_app_cache', value: 'unrelated origin data' },
    ]);
    expect(rows.map(row => row.id)).toEqual(['learning-progress', 'reclaimable', 'settings']);
    for (const row of rows) {
      expect(row).not.toHaveProperty('key');
      expect(row).not.toHaveProperty('value');
      expect(row.approximateBytes).toBeGreaterThan(0);
    }
    expect(JSON.stringify(rows)).not.toContain('private learner response');
    expect(JSON.stringify(rows)).not.toContain('must-not-leak');
    expect(JSON.stringify(rows)).not.toContain('unrelated origin data');
    expect(inventory.isManagedKey('other_app_cache')).toBe(false);
    expect(inventory.isManagedKey('allo_student_work')).toBe(true);
  });

  it('filters unrelated localStorage keys and bounds value reads', () => {
    const managedKeys = Array.from({ length: 300 }, (_, index) => 'allo_cache_' + index);
    const keys = ['other_app_cache', ...managedKeys];
    const requested = [];
    const rows = inventory.collectLocalStorage({
      length: keys.length,
      key: index => keys[index],
      getItem: key => { requested.push(key); return key === 'other_app_cache' ? 'private other-app data' : 'x'; }
    });
    expect(requested).toHaveLength(inventory.MAX_MANAGED_ENTRIES);
    expect(requested).not.toContain('other_app_cache');
    expect(rows.reduce((sum, row) => sum + row.count, 0)).toBe(inventory.MAX_MANAGED_ENTRIES);
    expect(JSON.stringify(rows)).not.toContain('private other-app data');
  });

  it('bounds IndexedDB reads and skips unrelated keys before loading values', async () => {
    const managedKeys = Array.from({ length: 300 }, (_, index) => 'allo_cache_' + index);
    const requested = [];
    const rows = await inventory.collectIdbKeyval({
      keys: async () => ['other_app_cache', ...managedKeys],
      get: async key => { requested.push(key); return 'x'; }
    });
    expect(requested).toHaveLength(inventory.MAX_MANAGED_ENTRIES);
    expect(requested).not.toContain('other_app_cache');
    expect(rows.reduce((sum, row) => sum + row.count, 0)).toBe(inventory.MAX_MANAGED_ENTRIES);
  });

  it('uses durable Canvas totals and re-evaluates Automatic at startup, refresh, and autosave', () => {
    expect(anti).toContain('const physicalFacts = isCanvas');
    expect(anti).toContain('? (deviceFacts || { persisted: null, usage: null, quota: null })');
    expect(anti).not.toContain('const physicalFacts = isCanvas && deviceFacts ? deviceFacts : origin');
    expect(anti).toContain('ALLO_WORKSPACE_RECOVERY.previewPolicyChange(');
    expect(anti).toContain('removedOfflineItems: Math.max(0, offlineCount - policy.maxOfflineItems)');
    expect(anti).toContain("currentRecoveryStore.retentionPolicy === ALLO_WORKSPACE_RECOVERY.POLICY_IDS.AUTOMATIC");
    expect(anti).toContain("currentPolicyStore.retentionPolicy === ALLO_WORKSPACE_RECOVERY.POLICY_IDS.AUTOMATIC");
    expect(anti).toContain("store.retentionPolicy === ALLO_WORKSPACE_RECOVERY.POLICY_IDS.AUTOMATIC");
    expect(anti).toContain("window.confirm('Switching to ' + policy.id");
    expect(anti).not.toContain("snapshot.assetPolicy === 'full' && (canvasRecoveryRemoveMediaId");
    expect(anti).toContain('{isCanvas && (');
  });
});
