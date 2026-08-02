import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const copies = [
  anti,
  fs.readFileSync(path.join(ROOT, 'desktop/web-app/src/App.jsx'), 'utf8'),
  fs.readFileSync(path.join(ROOT, 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8'),
];

function loadHelpers(source) {
  const start = source.indexOf('function _alloAssignmentCenterActivityStatus');
  const end = source.indexOf('function _alloNextSharedActivitySummaryOrder', start);
  if (start < 0 || end < 0) throw new Error('Assignment Center helpers missing');
  return new Function(source.slice(start, end) + '\nreturn { status: _alloAssignmentCenterActivityStatus, rows: _alloBuildAssignmentCenterRows, filter: _alloFilterAssignmentCenterRows, csv: _alloBuildAssignmentCenterCsv };')();
}

describe('Assignment Control Center', () => {
  it('derives active, expired, and revoked lifecycle rows without dropping closed history', () => {
    const api = loadHelpers(anti);
    const rows = api.rows([
      { url: 'expired', expiresAt: '2026-01-01T00:00:00.000Z' },
      { url: 'active', expiresAt: '2027-01-01T00:00:00.000Z' },
      { url: 'revoked', expiresAt: '2027-01-01T00:00:00.000Z', revokedAt: '2026-07-01T00:00:00.000Z' },
    ], {}, Date.parse('2026-08-01T00:00:00.000Z'));
    expect(rows.map(row => [row.key, row.lifecycle])).toEqual([
      ['active', 'active'], ['expired', 'expired'], ['revoked', 'revoked'],
    ]);
  });

  it('reduces teacher summaries to aggregate counts and strips response content and actor ids', () => {
    const api = loadHelpers(anti);
    const summary = api.status({
      participantCount: 4,
      revealed: true,
      updatedAt: 123,
      prompt: 'private prompt',
      responses: [
        { uid: 'secret-a', text: 'private answer', status: 'pending' },
        { uid: 'secret-b', text: 'another answer', status: 'approved' },
        { uid: 'secret-c', text: 'hidden answer', status: 'hidden' },
      ],
    });
    expect(summary).toEqual({ participantCount: 4, pending: 1, approved: 1, hidden: 1, revealed: true, updatedAt: 123 });
    expect(JSON.stringify(summary)).not.toMatch(/secret|private|prompt|text|uid/);
    expect(api.status(summary)).toEqual(summary);
  });

  it('filters one derived row model without creating another assignment store', () => {
    const api = loadHelpers(anti);
    const rows = [
      { lifecycle: 'active', activityState: 'ready', activity: { pending: 2 } },
      { lifecycle: 'active', activityState: 'error', activity: null },
      { lifecycle: 'expired', activityState: 'idle', activity: null },
      { lifecycle: 'revoked', activityState: 'idle', activity: null },
    ];
    expect(api.filter(rows, 'needs_review')).toEqual([rows[0]]);
    expect(api.filter(rows, 'active')).toEqual([rows[0], rows[1]]);
    expect(api.filter(rows, 'closed')).toEqual([rows[2], rows[3]]);
    expect(api.filter(rows, 'errors')).toEqual([rows[1]]);
    expect(api.filter(rows, 'unknown')).toEqual(rows);
  });

  it('exports aggregate assignment status without links, capabilities, prompts, actors, or response text', () => {
    const api = loadHelpers(anti);
    const csv = api.csv([{
      lifecycle: 'active', activityState: 'ready',
      share: {
        title: 'Biology, week 2', type: 'assignment-pack-hosted', resourceCount: 3,
        createdAt: '2026-08-01T00:00:00.000Z', expiresAt: '2026-08-15T00:00:00.000Z',
        url: 'https://student.example/?cap=DO_NOT_EXPORT_URL', packId: 'DO_NOT_EXPORT_ID', packSecret: 'DO_NOT_EXPORT_SECRET',
        sharedActivity: { type: 'word_cloud', prompt: 'DO_NOT_EXPORT_PROMPT' },
      },
      activity: { participantCount: 4, pending: 2, approved: 1, hidden: 1, revealed: false, updatedAt: 1785542400000,
        responses: [{ uid: 'DO_NOT_EXPORT_ACTOR', text: 'DO_NOT_EXPORT_RESPONSE' }] },
    }]);
    expect(csv).toContain('"Biology, week 2"');
    expect(csv).toContain('Class Mailbox,3,Word Cloud,4,2,1,1,No');
    expect(csv).not.toMatch(/DO_NOT_EXPORT|student.example|packSecret|responses|prompt|uid/);
    const hardened = api.csv([{ lifecycle: 'active', share: { title: '=SUM(1,2)' }, activity: { updatedAt: Number.MAX_SAFE_INTEGER } }]);
    expect(hardened).toContain("\"'=SUM(1,2)\"");
    expect(hardened).not.toContain('Invalid');
  });

  it('ships one derived control-center UI in every maintained shell', () => {
    copies.forEach(source => {
      expect(source).toContain('Assignment Control Center');
      expect(source).toContain("a: 'getactivityadmin'");
      expect(source).toContain('data-assignment-lifecycle={row.lifecycle}');
      expect(source).toContain('Resource-only privacy mode: this link does not collect student progress or responses.');
      expect(source).toContain("? { ...item, revokedAt: new Date().toISOString() }");
      expect(source).toContain("parsed.filter(item => item?.url).slice(0, 12)");
      expect(source).toContain("a: 'extendpack'");
      expect(source).toContain("a: 'clonepack'");
      expect(source).toContain('Export aggregate CSV');
      expect(source).toContain('revokeHomeworkAssignment(share)');
      expect(source).toContain("row.lifecycle === 'expired'");
      expect(source).toContain('Revoked assignments cannot be copied because their hosted data is deleted.');
    });
  });
});
