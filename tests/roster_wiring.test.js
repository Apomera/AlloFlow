import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const app = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const teacher = readFileSync(resolve(process.cwd(), 'teacher_source.jsx'), 'utf8');

const normalizeStart = app.indexOf('const normalizeRosterSessionCodename');
const normalizeEnd = app.indexOf('const LIVE_ROSTER_PRESENCE_CONNECTED_MS', normalizeStart);
const normalizeCodename = new Function(
  app.slice(normalizeStart, normalizeEnd) + '\nreturn normalizeRosterSessionCodename;'
)();

describe('class roster cross-feature wiring', () => {
  it('matches live-session codenames across case, punctuation, and writing systems', () => {
    const roster = { 'Brave Otter': 'blue' };
    const byCodename = Object.fromEntries(Object.entries(roster).map(([name, group]) => [normalizeCodename(name), group]));
    expect(byCodename[normalizeCodename(' brave-OTTER ')]).toBe('blue');
    expect(normalizeCodename(' A\u0301GIL-zorro ')).toBe(normalizeCodename('Ágil Zorro'));
    expect(normalizeCodename('勇敢 熊')).toBe('勇敢熊');
    expect(app).toContain('const normalized = normalizeRosterSessionCodename(name);');
    expect(app).toContain('const rosterByCodename = buildUniqueRosterSessionCodenameIndex(rosterKey.students);');
    expect(app).toContain('const matched = rosterByCodename[normalized]');
    expect(app).toContain('updates[`roster.${uid}.groupId`] = matched.groupId');
  });

  it('replaces live groups and realigns every uniquely matched assignment', () => {
    const syncStart = app.indexOf('const handleSyncRosterToSession');
    const syncEnd = app.indexOf('useEffect(() => {', syncStart);
    const syncSource = app.slice(syncStart, syncEnd);
    expect(syncSource).toMatch(/const updates = \{\s*groups,[\s\S]*?await updateDoc\(sessionRef, updates\)/);
    expect(syncSource).toContain('buildUniqueRosterSessionCodenameIndex(rosterKey.students)');
    expect(syncSource).toContain("const targetGroupId = matched.groupId && rosterKey.groups?.[matched.groupId] ? matched.groupId : null;");
    expect(syncSource).toContain('updates[`roster.${uid}.groupId`] = targetGroupId;');
    expect(app).toContain("activeSessionAppId || appId, 'public', 'data', 'sessions'");
  });

  it('round-trips codename-safe progress and public submission metadata', () => {
    expect(teacher).not.toContain('displayNames: asRecord(data.displayNames)');
    expect(teacher).not.toContain('Codename + Real Name');
    expect(teacher).toContain('progressHistory: asRecord(data.progressHistory)');
    expect(teacher).toContain('alloTeacherSanitizeSubmissionKey(data.submissionKey, normalizedRoster.classId)');
    expect(teacher).not.toContain('submissionKey: data.submissionKey');
    expect(teacher).toContain('const safeRoster = alloEnsureTeacherRosterIdentity');
    expect(teacher).toContain('exportVersion: 4');
  });

  it('removes persisted roster state when the roster is cleared', () => {
    expect(app).toContain(": safeRemoveItem('alloflow_roster_key')");
  });

  it('cleans teacher-only metadata when a student is removed', () => {
    expect(teacher).not.toContain('delete nd[name]');
    expect(teacher).toContain('delete np[name]');
    expect(teacher).toContain('delete participants[name]');
  });
});
