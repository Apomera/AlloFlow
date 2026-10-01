import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const teacher = readFileSync('teacher_source.jsx', 'utf8');
const app = readFileSync('AlloFlowANTI.txt', 'utf8');
const historyTab = readFileSync('view_teacher_history_tab_source.jsx', 'utf8');
const require = createRequire(import.meta.url);
let rosterIdentity;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('teacher_module.js');
  rosterIdentity = window.AlloModules.RosterIdentityInternals;
});

describe('codename-only roster and printable worksheet', () => {
  it('migrates legacy identity maps out of persisted roster data', () => {
    expect(teacher).toContain('delete safeValue.displayNames');
    expect(teacher).toContain('delete safeValue.importAliases');
    expect(app).toContain('delete safeValue.displayNames');
    expect(app).toContain('delete safeValue.importAliases');
    expect(teacher).not.toContain('Student real name');
    const migrated = rosterIdentity.ensureRosterIdentity({
      groups: {}, students: { 'Calm Otter': '' },
      displayNames: { 'Calm Otter': 'Jane Student' },
      importAliases: { 'Jane Student': 'Calm Otter' },
    });
    expect(migrated).not.toHaveProperty('displayNames');
    expect(migrated).not.toHaveProperty('importAliases');
    expect(JSON.stringify(migrated)).not.toContain('Jane Student');
  });

  it('prints only codenames with blank handwritten name and location columns', () => {
    const start = teacher.indexOf('const buildRosterCodenameWorksheetHtml');
    const end = teacher.indexOf('const rosterSessionCsvCell', start);
    const builder = teacher.slice(start, end);
    expect(builder).toContain('Object.entries(students)');
    expect(builder).not.toContain('displayNames');
    expect(builder).not.toContain('className');
    expect(builder).toContain('Student name (write in)');
    expect(builder).toContain('Location / seat (write in)');
    expect(builder).toContain('AlloFlow Codename Roster Worksheet');
    const html = rosterIdentity.buildCodenameWorksheetHtml({
      className: 'Ms. Smith Period 3',
      students: { 'Zany Zebra': '', 'Calm <Otter>': '' },
      displayNames: { 'Calm <Otter>': 'Jane Student' },
    });
    expect(html).toContain('Calm &lt;Otter&gt;');
    expect(html.indexOf('Calm &lt;Otter&gt;')).toBeLessThan(html.indexOf('Zany Zebra'));
    expect(html).not.toContain('Jane Student');
    expect(html).not.toContain('Ms. Smith');
    expect(html).toContain('AlloFlow printed codenames only.');
    const printHandler = teacher.slice(
      teacher.indexOf('const handlePrintRosterWorksheet'),
      teacher.indexOf('const handleSetupOfflineSubmissions'),
    );
    expect(printHandler.indexOf('iframe.srcdoc = buildRosterCodenameWorksheetHtml(rosterKey, {'))
      .toBeLessThan(printHandler.indexOf('document.body.appendChild(iframe)'));

  });

  it('supports temporary print layout choices without storing names or locations', () => {
    const roster = {
      groups: {
        blue: { name: 'Blue Group' },
        amber: { name: 'Amber Group' },
      },
      students: {
        'Zany Zebra': 'blue',
        'Quiet Owl': '',
        'Calm Otter': 'amber',
      },
    };
    const grouped = rosterIdentity.buildCodenameWorksheetHtml(roster, {
      locationPosition: 'before-name',
      rowSize: 'large',
      sortBy: 'group',
    });
    expect(grouped.indexOf('Location / seat (write in)')).toBeLessThan(grouped.indexOf('Student name (write in)'));
    expect(grouped).toContain('<th scope="col">Group</th>');
    expect(grouped).toContain('height:16mm');
    expect(grouped).toContain('@page{size:landscape');
    expect(grouped).toContain('AlloFlow printed codenames and roster group labels only.');
    expect(grouped.indexOf('Calm Otter')).toBeLessThan(grouped.indexOf('Zany Zebra'));
    expect(grouped.indexOf('Zany Zebra')).toBeLessThan(grouped.indexOf('Quiet Owl'));
    const hidden = rosterIdentity.buildCodenameWorksheetHtml(roster, { locationPosition: 'hidden' });
    expect(hidden).not.toContain('Location / seat (write in)');
  });
  it('normalizes translated codename dictionaries and Unicode matching safely', () => {
    const helperStart = teacher.indexOf('const ALLO_ROSTER_FALLBACK_ADJECTIVES');
    const helperEnd = teacher.indexOf('const alloNormalizeTeacherRosterImport', helperStart);
    const helpers = new Function(
      teacher.slice(helperStart, helperEnd)
      + '\nreturn { normalizeKey: alloNormalizeRosterCodenameKey, wordOptions: alloRosterCodenameWordOptions, fallbackAdjectives: ALLO_ROSTER_FALLBACK_ADJECTIVES };'
    )();

    expect(helperStart).toBeGreaterThan(-1);
    expect(helperEnd).toBeGreaterThan(helperStart);
    expect(helpers.wordOptions('codenames.adjectives', helpers.fallbackAdjectives)).toEqual(helpers.fallbackAdjectives);
    expect(helpers.wordOptions([' Ágil ', 'A\u0301gil', null, '勇敢', '\u0000'], helpers.fallbackAdjectives)).toEqual(['Ágil', '勇敢']);
    expect(helpers.normalizeKey(' ÁGIL-zorro ')).toBe(helpers.normalizeKey('A\u0301gil Zorro'));
    expect(helpers.normalizeKey('勇敢 熊')).toBe('勇敢熊');
    expect(helpers.normalizeKey('🐼')).toBe('');

    const imported = rosterIdentity.normalizeRosterImport({
      groups: {},
      students: { 'Ágil Zorro': '', '勇敢 熊': '' },
    });
    expect(Object.keys(imported.students)).toEqual(['Ágil Zorro', '勇敢 熊']);
    expect(() => rosterIdentity.normalizeRosterImport({
      groups: {},
      students: { 'Ágil Zorro': '', 'A\u0301gil-Zorro': '' },
    })).toThrow(/unique/);
    expect(() => rosterIdentity.normalizeRosterImport({
      groups: { blue: { name: 'Blue' }, ' blue ': { name: 'Green' } },
      students: {},
    })).toThrow(/unique/);
  });

  it('validates imports and separates moving from deleting', () => {
    expect(teacher).toContain("new Set(['__proto__', 'prototype', 'constructor'])");
    expect(teacher).toContain('2 * 1024 * 1024');
    expect(teacher).toContain("aria-label={'Move ' + name + ' to group'}");
    expect(teacher).toContain("aria-label={'Delete ' + name + ' from roster'}");
    expect(teacher).toContain('maxLength={120} onChange={e => setRosterKey');
    expect(teacher).toContain('value={group.name} maxLength={80}');
    expect(teacher).toContain("field === 'leveledTextCustomInstructions' ? 500 : 120");
    expect(teacher).toContain("String(value || '').slice(0, 80)");
    expect(teacher).toContain('Codename-only private note');
    expect(teacher).toContain('Use codenames only. This note is stored on this device and included in roster backups.');
    expect(teacher).toContain("alloTeacherSanitizePortableSeating(value.seating, students)");
    expect(teacher).toContain('De-identified class activity totals and teacher notes remain.');
    expect(teacher).toContain('alloEnsureTeacherRosterIdentity(alloRemoveTeacherGroupReferences(prev, gId))');
    expect(teacher).toContain('const ALLO_ROSTER_MAX_GROUPS = 100');
    expect(teacher).toContain('const ALLO_ROSTER_MAX_STUDENTS = 500');
    expect(teacher).toContain('Object.keys(groups).length >= ALLO_ROSTER_MAX_GROUPS');
    expect(teacher).toContain('Object.keys(students).length >= ALLO_ROSTER_MAX_STUDENTS');
    expect(teacher).toContain('groupIds.length >= ALLO_ROSTER_MAX_GROUPS');
    expect(teacher).toContain('studentCodenames.length >= ALLO_ROSTER_MAX_STUDENTS');
    expect(teacher).toContain('(studentCodenames.length > 10 || normalizedStudentQuery)');
    expect(teacher).toContain('visibleUnassigned.map(name =>');
    expect(teacher).toContain('These options are temporary. Names and locations remain handwritten and are never stored in AlloFlow.');
    expect(teacher).toContain('anchor.remove();');
    expect(teacher).toContain('a.remove();');
    expect(teacher).toContain('}, 1000);');
    expect(teacher).toContain("alloRosterCodenameWordOptions(t('codenames.adjectives'");
    expect(teacher).not.toContain("t('codenames.adjectives', { returnObjects: true }) || []");
    expect(teacher).toContain("role={rosterNoticeTone === 'error' ? 'alert' : 'status'}");
    expect(teacher).toContain('aria-describedby="roster-student-search-status"');
    expect(teacher).toContain('id="roster-student-search-status"');
    expect(teacher).toContain('Restore previous roster');
    expect(teacher).toContain('It is kept in memory only.');
  });

  it('keeps the roster responsive and exposes persistence failure', () => {
    expect(teacher).toContain('h-[100dvh] sm:h-auto');
    expect(teacher).toContain('overflow-x-hidden');
    expect(teacher).toContain('flex flex-col sm:flex-row gap-2');
    expect(app).toContain("setRosterStorageError('Roster changes are not saved on this device.')");
    expect(app).toContain('try { localStorage.setItem(key, value); return true; } catch(e) { return false; }');
  });

  it('opens the real batch configuration without a timeout or noop', () => {
    expect(historyTab).toContain('onDifferentiateByGroup');
    expect(historyTab).not.toContain('safeBatchConfig');
    expect(historyTab).not.toContain('setTimeout');
    expect(app).toContain('setRosterBatchOpenRequest(request => request + 1)');
    expect(teacher).toContain('if (isOpen && batchOpenRequest) setShowBatchConfig(true)');
    expect(teacher).toContain('await onBatchGenerate?.(selected)');
  });


  it('removes a deleted codename from every seating layout and constraint', () => {
    const start = teacher.indexOf('function alloRemoveTeacherStudentReferences');
    const end = teacher.indexOf('\n}\nfunction alloRemoveTeacherGroupReferences', start) + 2;
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const source = teacher.slice(start, end);
    const removeReferences = new Function(source + '; return alloRemoveTeacherStudentReferences;')();
    const seating = {
      activeLayoutId: 'one',
      layouts: {
        one: { id: 'one', assignments: { seat1: 'Calm Otter', seat2: 'Swift Falcon' } },
        two: { id: 'two', assignments: { seat1: 'Calm Otter' } },
      },
      constraints: [
        { id: 'c1', students: ['Calm Otter', 'Swift Falcon'] },
        { id: 'c2', students: ['Swift Falcon'] },
      ],
    };
    const cleaned = removeReferences(seating, 'Calm Otter');
    expect(cleaned.layouts.one.assignments).toEqual({ seat2: 'Swift Falcon' });
    expect(cleaned.layouts.two.assignments).toEqual({});
    expect(cleaned.constraints).toEqual([{ id: 'c2', students: ['Swift Falcon'] }]);
    expect(seating.layouts.one.assignments).toHaveProperty('seat1', 'Calm Otter');
    expect(teacher).toContain('Assessment Center records are kept');
  });

  it('repairs duplicate or unsafe learner IDs without sharing preferences', () => {
    const repaired = rosterIdentity.ensureRosterIdentity({
      classId: 'CLS-safe',
      groups: {},
      students: { 'Calm Otter': '', 'Bright Fox': '', 'Quiet Owl': '' },
      learnerIds: {
        'Calm Otter': 'LRN-shared',
        'Bright Fox': 'LRN-shared',
        'Quiet Owl': '__proto__',
      },
      learnerPreferences: {
        'LRN-shared': { readingTheme: 'warm' },
        'Bright Fox': { readingTheme: 'blue' },
        'Quiet Owl': { readingTheme: 'green' },
      },
    });
    const ids = Object.values(repaired.learnerIds);
    expect(new Set(ids).size).toBe(3);
    expect(ids.every(id => /^LRN-/.test(id))).toBe(true);
    expect(repaired.learnerPreferences[repaired.learnerIds['Calm Otter']].readingTheme).toBe('warm');
    expect(repaired.learnerPreferences[repaired.learnerIds['Bright Fox']].readingTheme).toBe('blue');
    expect(repaired.learnerPreferences[repaired.learnerIds['Quiet Owl']].readingTheme).toBe('green');
  });

  it('migrates legacy history back to current codenames and count-only unmatched evidence', () => {
    const migrated = rosterIdentity.ensureRosterIdentity({
      classId: 'CLS-history',
      groups: { blue: { name: 'Blue', color: '#4F46E5', profile: {} } },
      students: { 'Calm Otter': 'blue' },
      learnerIds: { 'Calm Otter': 'LRN-calm' },
      learnerPreferences: {},
      progressHistory: {
        'Calm Otter': [{ sessionId: 's1', timestamp: '2026-08-01', groupId: 'blue', responseCount: 1, privateName: 'Jane Student' }],
        'Jane Student': [{ sessionId: 's1', responseCount: 9 }],
      },
      sessionHistory: [{
        id: 's1',
        endedAt: '2026-08-01T10:00:00.000Z',
        participants: { 'Calm Otter': { groupId: 'blue', responseCount: 1 }, 'Jane Student': { responseCount: 9 } },
        absentCodenames: ['Calm Otter', 'Jane Student'],
        unmatchedCodenames: ['Jane Student'],
        insightBrief: {
          followUpCodenames: ['Calm Otter', 'Jane Student'],
          evidenceCohorts: [{ code: 'support', codenames: ['Calm Otter', 'Jane Student'], label: 'Support' }],
        },
      }],
    });
    expect(Object.keys(migrated.progressHistory)).toEqual(['Calm Otter']);
    expect(migrated.progressHistory['Calm Otter'][0]).not.toHaveProperty('privateName');
    expect(Object.keys(migrated.sessionHistory[0].participants)).toEqual(['Calm Otter']);
    expect(migrated.sessionHistory[0].absentCodenames).toEqual(['Calm Otter']);
    expect(migrated.sessionHistory[0]).not.toHaveProperty('unmatchedCodenames');
    expect(migrated.sessionHistory[0].unmatchedCount).toBe(1);
    expect(JSON.stringify(migrated)).not.toContain('Jane Student');
  });

  it('whitelists imported public keys and codename-safe portable history', () => {
    const imported = rosterIdentity.normalizeRosterImport({
      className: 'Period 3',
      classId: 'CLS-import',
      groups: { blue: { name: 'Blue', color: '#4F46E5', profile: {} } },
      students: { 'Calm Otter': 'blue' },
      learnerIds: { 'Calm Otter': 'LRN-calm' },
      progressHistory: {
        'Calm Otter': [{ sessionId: 's1', groupId: 'blue', responseCount: 2, rawAnswer: 'private work' }],
        'Jane Student': [{ sessionId: 's1' }],
      },
      sessionHistory: [{ id: 's1', unmatchedCodenames: ['Jane Student'], participants: { 'Calm Otter': { responseCount: 2 } }, rawAnswers: ['private work'] }],
      seating: {
        activeLayoutId: 'layout1',
        layouts: {
          layout1: {
            id: 'layout1',
            name: 'Main room',
            rawNotes: 'private seating detail',
            seats: [{ id: 'seat1', x: 5, y: 6, w: 10, h: 7, privateName: 'Jane Student' }],
            furniture: [],
            assignments: { seat1: 'Calm Otter', missingSeat: 'Jane Student' },
          },
        },
        constraints: [
          { id: 'c1', type: 'front_row', students: ['Calm Otter'], diagnosis: 'private seating detail' },
          { id: 'c2', type: 'front_row', students: ['Jane Student'] },
        ],
        history: [{ at: '2026-08-01T10:00:00.000Z', layoutId: 'layout1', layoutName: 'Main room', privateName: 'Jane Student' }],
        solveSeed: 2,
        privateRosterMap: { 'Jane Student': 'front' },
      },
      submissionKey: {
        classId: 'CLS-import',
        publicJwk: { kty: 'RSA', n: 'abcdefghijklmnop', e: 'AQAB', alg: 'RSA-OAEP-256', key_ops: ['encrypt', 'decrypt'], d: 'private-part' },
        privateJwk: { d: 'private-part' },
      },
      classGoals: [{ id: 'goal-1', label: 'Ready', team: 'group:missing' }],
    });
    expect(imported.progressHistory).not.toHaveProperty('Jane Student');
    expect(imported.progressHistory['Calm Otter'][0]).not.toHaveProperty('rawAnswer');
    expect(imported.sessionHistory[0]).not.toHaveProperty('rawAnswers');
    expect(imported.sessionHistory[0]).not.toHaveProperty('unmatchedCodenames');
    expect(imported.sessionHistory[0].unmatchedCount).toBe(1);
    expect(imported.submissionKey.publicJwk).toEqual({
      kty: 'RSA', n: 'abcdefghijklmnop', e: 'AQAB', alg: 'RSA-OAEP-256', key_ops: ['encrypt'],
    });
    expect(imported.submissionKey).not.toHaveProperty('privateJwk');
    expect(imported.submissionKey.publicJwk).not.toHaveProperty('d');
    expect(imported.classGoals[0].team).toBe('class');
    expect(imported.seating.layouts.layout1.assignments).toEqual({ seat1: 'Calm Otter' });
    expect(imported.seating.layouts.layout1).not.toHaveProperty('rawNotes');
    expect(imported.seating.layouts.layout1.seats[0]).not.toHaveProperty('privateName');
    expect(imported.seating.constraints).toEqual([{ id: 'c1', type: 'front_row', students: ['Calm Otter'] }]);
    expect(imported.seating).not.toHaveProperty('privateRosterMap');
    expect(JSON.stringify(imported)).not.toContain('private-part');
    expect(JSON.stringify(imported)).not.toContain('private work');
    expect(JSON.stringify(imported)).not.toContain('Jane Student');
    expect(rosterIdentity.ensureRosterIdentity(imported)).toBe(imported);
  });
  it('replaces unsafe imported class identifiers with an opaque class ID', () => {
    const imported = rosterIdentity.normalizeRosterImport({
      classId: '__proto__',
      groups: {},
      students: {},
    });
    expect(imported.classId).toMatch(/^CLS-[A-Za-z0-9_-]+$/);
  });
  it('keeps valid seating records that follow filtered junk entries', () => {
    const layouts = Object.fromEntries(Array.from({ length: 35 }, (_, index) => ['junk' + index, null]));
    const assignments = Object.fromEntries(Array.from({ length: 65 }, (_, index) => ['missing' + index, 'Calm Otter']));
    assignments.seat1 = 'Calm Otter';
    layouts.layout1 = {
      id: 'layout1',
      name: 'Main room',
      seats: [...Array(65).fill(null), { id: 'seat1', x: 5, y: 6, w: 10, h: 7 }],
      furniture: [...Array(35).fill(null), { id: 'door1', kind: 'door', x: 2, y: 1, w: 8, h: 3 }],
      assignments,
    };
    const normalized = rosterIdentity.ensureRosterIdentity({
      classId: 'CLS-junk-prefix',
      groups: {},
      students: { 'Calm Otter': '' },
      seating: {
        activeLayoutId: 'layout1',
        layouts,
        constraints: [
          ...Array.from({ length: 85 }, (_, index) => ({ id: 'junk' + index, type: 'unknown', students: ['Calm Otter'] })),
          { id: 'valid-front', type: 'front_row', students: ['Calm Otter'] },
        ],
        history: [],
      },
    });
    expect(Object.keys(normalized.seating.layouts)).toEqual(['layout1']);
    expect(normalized.seating.layouts.layout1.seats.map(seat => seat.id)).toEqual(['seat1']);
    expect(normalized.seating.layouts.layout1.furniture.map(item => item.id)).toEqual(['door1']);
    expect(normalized.seating.layouts.layout1.assignments).toEqual({ seat1: 'Calm Otter' });
    expect(normalized.seating.constraints).toEqual([{ id: 'valid-front', type: 'front_row', students: ['Calm Otter'] }]);
  });



  it('keeps valid history and goals that are surrounded by malformed padding', () => {
    const validSession = {
      id: 's-valid',
      participants: { 'Calm Otter': { groupId: 'blue', responseCount: 1 } },
      classGoals: [...Array(45).fill(null), { label: 'Ready', delivered: 1 }],
      liveActivities: [...Array(65).fill(null), { kind: 'quiz', submitted: 1 }],
      insightBrief: {
        evidenceCohorts: [
          ...Array(10).fill(null),
          { code: 'support', label: 'Support', codenames: ['Calm Otter'] },
        ],
        byKind: [...Array(65).fill(null), { kind: 'quiz', activityCount: 1 }],
        groups: [
          ...Array(105).fill(null),
          { groupId: 'blue', participantCount: 1 },
        ],
        nextMoves: [
          ...Array(5).fill(null),
          { code: 'review', count: 1, label: 'Review the evidence' },
        ],
      },
    };
    const normalized = rosterIdentity.ensureRosterIdentity({
      classId: 'CLS-history-padding',
      groups: { blue: { name: 'Blue' } },
      students: { 'Calm Otter': 'blue' },
      progressHistory: {
        'Calm Otter': [
          { sessionId: 's-valid', groupId: 'blue', responseCount: 1 },
          ...Array(35).fill(null),
        ],
      },
      sessionHistory: [validSession, ...Array(35).fill(null)],
    });
    expect(normalized.progressHistory['Calm Otter'].map(entry => entry.sessionId)).toEqual(['s-valid']);
    expect(normalized.sessionHistory.map(session => session.id)).toEqual(['s-valid']);
    expect(normalized.sessionHistory[0].classGoals).toHaveLength(1);
    expect(normalized.sessionHistory[0].liveActivities).toHaveLength(1);
    expect(normalized.sessionHistory[0].insightBrief.evidenceCohorts).toHaveLength(1);
    expect(normalized.sessionHistory[0].insightBrief.byKind).toHaveLength(1);
    expect(normalized.sessionHistory[0].insightBrief.groups).toHaveLength(1);
    expect(normalized.sessionHistory[0].insightBrief.nextMoves).toHaveLength(1);

    const imported = rosterIdentity.normalizeRosterImport({
      classId: 'CLS-goal-padding',
      groups: { blue: { name: 'Blue' } },
      students: { 'Calm Otter': 'blue' },
      classGoals: [
        ...Array(25).fill(null),
        { id: 'goal-valid', label: 'Ready', team: 'group:blue' },
      ],
      classGoalLog: [
        { goalId: 'goal-valid', label: 'Ready', delivered: 1, at: 1 },
        ...Array(65).fill(null),
      ],
    });
    expect(imported.classGoals.map(goal => goal.id)).toEqual(['goal-valid']);
    expect(imported.classGoalLog.map(entry => entry.goalId)).toEqual(['goal-valid']);
  });

  it('whitelists legacy history and public keys during host startup normalization', () => {
    const historyStart = app.indexOf('const alloSanitizeRosterIdentityHistory');
    const historyEnd = app.indexOf('const alloNormalizeRosterIdentity', historyStart);
    expect(historyStart).toBeGreaterThan(-1);
    expect(historyEnd).toBeGreaterThan(historyStart);
    const sanitizeHistory = new Function(
      app.slice(historyStart, historyEnd) + '; return alloSanitizeRosterIdentityHistory;',
    )();
    const cleaned = sanitizeHistory({
      progressHistory: {
        'Calm Otter': [{
          sessionId: 's1',
          timestamp: '2026-08-01T10:00:00.000Z',
          groupId: 'blue',
          responseCount: 2,
          rawAnswer: 'private work',
          privateName: 'Jane Student',
        }],
        'Jane Student': [{ sessionId: 's1', rawAnswer: 'private work' }],
      },
      sessionHistory: [{
        id: 's1',
        mode: 'firebase',
        participants: {
          'Calm Otter': { groupId: 'blue', responseCount: 2, rawAnswer: 'private work' },
          'Jane Student': { responseCount: 9 },
        },
        absentCodenames: ['Calm Otter', 'Jane Student'],
        unmatchedCodenames: ['Jane Student'],
        rawAnswers: ['private work'],
        insightBrief: {
          activityCount: 1,
          followUpCodenames: ['Calm Otter', 'Jane Student'],
          rawPrompt: 'private work',
        },
      }],
    }, { 'Calm Otter': 'blue' }, { blue: { name: 'Blue' } });
    expect(cleaned.progressHistory['Calm Otter'][0]).not.toHaveProperty('rawAnswer');
    expect(cleaned.progressHistory['Calm Otter'][0]).not.toHaveProperty('privateName');
    expect(cleaned.progressHistory).not.toHaveProperty('Jane Student');
    expect(cleaned.sessionHistory[0]).not.toHaveProperty('rawAnswers');
    expect(cleaned.sessionHistory[0].participants['Calm Otter']).not.toHaveProperty('rawAnswer');
    expect(cleaned.sessionHistory[0].participants).not.toHaveProperty('Jane Student');
    expect(cleaned.sessionHistory[0]).not.toHaveProperty('unmatchedCodenames');
    expect(cleaned.sessionHistory[0].unmatchedCount).toBe(1);
    expect(cleaned.sessionHistory[0].insightBrief).not.toHaveProperty('rawPrompt');
    expect(JSON.stringify(cleaned)).not.toContain('Jane Student');
    expect(JSON.stringify(cleaned)).not.toContain('private work');

    const keyStart = app.indexOf('const alloSafeRosterLearnerId');
    const keyEnd = historyStart;
    const keyApi = new Function(
      app.slice(keyStart, keyEnd) + '; return { sanitize: alloSanitizeRosterSubmissionKey };',
    )();
    const key = keyApi.sanitize({
      classId: 'CLS-host',
      keyId: 'KEY-host',
      publicJwk: {
        kty: 'RSA',
        n: 'abcdefghijklmnop',
        e: 'AQAB',
        alg: 'RSA-OAEP-256',
        key_ops: ['encrypt', 'decrypt'],
        d: 'private-part',
      },
      privateJwk: { d: 'private-part' },
    }, 'CLS-host');
    expect(key.publicJwk).toEqual({
      kty: 'RSA',
      n: 'abcdefghijklmnop',
      e: 'AQAB',
      alg: 'RSA-OAEP-256',
      key_ops: ['encrypt'],
    });
    expect(key).not.toHaveProperty('privateJwk');
    expect(key.publicJwk).not.toHaveProperty('d');
    expect(JSON.stringify(key)).not.toContain('private-part');
  });

  it('unassigns learners and removes goals that target a deleted group', () => {
    const roster = {
      groups: { blue: { name: 'Blue' }, green: { name: 'Green' } },
      students: { 'Calm Otter': 'blue', 'Bright Fox': 'green' },
      classGoals: [
        { id: 'blue-goal', team: 'group:blue' },
        { id: 'green-goal', team: 'group:green' },
        { id: 'class-goal', team: 'class' },
      ],
    };
    const cleaned = rosterIdentity.removeGroupReferences(roster, 'blue');
    expect(cleaned.groups).not.toHaveProperty('blue');
    expect(cleaned.students).toEqual({ 'Calm Otter': '', 'Bright Fox': 'green' });
    expect(cleaned.classGoals.map(goal => goal.id)).toEqual(['green-goal', 'class-goal']);
    expect(roster.groups).toHaveProperty('blue');
    expect(roster.students['Calm Otter']).toBe('blue');
  });

});
