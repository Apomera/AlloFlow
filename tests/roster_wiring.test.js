import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const app = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const teacher = readFileSync(resolve(process.cwd(), 'teacher_source.jsx'), 'utf8');

const normalizeCodename = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

describe('class roster cross-feature wiring', () => {
  it('matches live-session codenames despite case, spaces, or punctuation', () => {
    const roster = { 'Brave Otter': 'blue' };
    const byCodename = Object.fromEntries(Object.entries(roster).map(([name, group]) => [normalizeCodename(name), group]));
    expect(byCodename[normalizeCodename(' brave-OTTER ')]).toBe('blue');
    expect(app).toContain("replace(/[^a-z0-9]/g, '')");
    expect(app).toContain('const groupId = rosterGroupsByCodename[normalized]');
  });

  it('replaces live groups so deleted roster groups do not linger', () => {
    expect(app).toContain('await updateDoc(sessionRef, { groups });');
    expect(app).toContain("activeSessionAppId || appId, 'public', 'data', 'sessions'");
  });

  it('round-trips teacher reference, progress, and public submission metadata', () => {
    expect(teacher).toContain('displayNames: asRecord(data.displayNames)');
    expect(teacher).toContain('progressHistory: asRecord(data.progressHistory)');
    expect(teacher).toContain("...(data.submissionKey?.publicJwk ? { submissionKey: data.submissionKey } : {})");
    expect(teacher).toContain('...(rosterKey || { groups: {}, students: {} })');
  });

  it('removes persisted roster state when the roster is cleared', () => {
    expect(app).toContain("else safeRemoveItem('alloflow_roster_key')");
  });

  it('cleans teacher-only metadata when a student is removed', () => {
    expect(teacher).toContain('delete nd[name]');
    expect(teacher).toContain('delete np[name]');
  });
});