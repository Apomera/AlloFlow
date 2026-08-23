// Roster linkage + year boundary (2026-08-23): one child, one identity.
//
//  - Finding 5: the same child could be keyed under a roster codename on one
//    path and a file-derived real name on another. Codenames are TWO fields —
//    "<Adjective> <Animal>" from StudentEntryModal's two dropdowns — so
//    matching tolerates case/spacing/punctuation via the host's
//    normalizeRosterSessionCodename convention, but ONLY on a unique hit.
//    Linking rewrites the row's name to the codename (every record lookup
//    keys off name, so no read path changed), records the alias so
//    re-imports auto-resolve, and merges the split records.
//  - Year boundary: download-everything archive, then an explicit clear-all
//    that keeps roster membership.
//
// All functions are EXECUTED out of the live sources, never hand-copied.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let anti;
let ac;

beforeAll(() => {
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  ac = readFileSync('student_analytics_module.js', 'utf8');
});

function braceBalanced(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  throw new Error('unbalanced region');
}

function extractDecl(src, marker) {
  const at = src.indexOf(marker);
  expect(at, `${marker} not found`).toBeGreaterThan(-1);
  return src.slice(at, src.indexOf('{', at)) + braceBalanced(src, src.indexOf('{', at)) + ';';
}

describe('two-field codename resolution', () => {
  function loadResolver() {
    const fnSrc = extractDecl(ac, 'function _acCanonicalStudentName(rawName, rosterKeyValue)');
    // eslint-disable-next-line no-new-func
    return new Function(fnSrc + ' return _acCanonicalStudentName;')();
  }
  const roster = {
    students: { 'Swift Falcon': {}, 'Quiet Heron': {}, 'Bright Owl': {} },
    importAliases: { 'Marcus Reyes': 'Swift Falcon' },
  };

  it('an exact codename passes through', () => {
    expect(loadResolver()('Swift Falcon', roster)).toBe('Swift Falcon');
  });

  it('a recorded alias resolves — re-imports auto-link', () => {
    expect(loadResolver()('Marcus Reyes', roster)).toBe('Swift Falcon');
  });

  it('two-field variance (case, spacing, punctuation) resolves on a UNIQUE normalized match', () => {
    const resolve = loadResolver();
    expect(resolve('swift falcon', roster)).toBe('Swift Falcon');
    expect(resolve('SwiftFalcon', roster)).toBe('Swift Falcon');
    expect(resolve('swift_falcon', roster)).toBe('Swift Falcon');
    expect(resolve('  Swift  Falcon ', roster)).toBe('Swift Falcon');
  });

  it('ambiguity refuses to guess', () => {
    const ambiguous = { students: { 'Swift Falcon': {}, 'SWIFT falcon': {} } };
    expect(loadResolver()('swiftfalcon', ambiguous)).toBe('swiftfalcon');
  });

  it('an unknown real name passes through unchanged', () => {
    expect(loadResolver()('Jamie Alvarez', roster)).toBe('Jamie Alvarez');
    expect(loadResolver()('', roster)).toBe('');
    expect(loadResolver()('Anyone', null)).toBe('Anyone');
  });

  it('a stale alias pointing at a removed roster student is ignored', () => {
    const stale = { students: { 'Quiet Heron': {} }, importAliases: { 'Marcus Reyes': 'Swift Falcon' } };
    expect(loadResolver()('Marcus Reyes', stale)).toBe('Marcus Reyes');
  });

  it('the import path canonicalizes and keeps the original as importedName', () => {
    expect(ac).toContain('const canonicalName = _acCanonicalStudentName(studentName, rosterKey);');
    expect(ac).toContain('name: canonicalName,');
    expect(ac).toContain('importedName: studentName,');
  });
});

describe('host mergeStudentRecords', () => {
  function loadMerge() {
    const fnSrc = extractDecl(anti, 'const mergeStudentRecords = (fromName, toName) => {');
    const state = {
      probe: {
        'Marcus Reyes': [{ wcpm: 42, timestamp: 2000 }, { wcpm: 50, timestamp: '2026-08-20T00:00:00Z' }],
        'Swift Falcon': [{ wcpm: 38, timestamp: 1000 }],
      },
      logs: { 'Marcus Reyes': [{ id: 'a' }] },
      goals: { 'Marcus Reyes': { fluencyGoal: 80 }, 'Swift Falcon': { fluencyGoal: 90 } },
    };
    const writes = [];
    const wrap = (key) => (u) => { state[key] = typeof u === 'function' ? u(state[key]) : u; };
    // eslint-disable-next-line no-new-func
    const merge = new Function('setProbeHistory', 'setInterventionLogs', 'setRtiGoals', 'localStorage',
      fnSrc + ' return mergeStudentRecords;')(wrap('probe'), wrap('logs'), wrap('goals'), { setItem: (k, v) => writes.push([k, v]) });
    return { merge, state, writes };
  }

  it('folds the split identity into the codename, interleaved by time (numeric and ISO both)', () => {
    const { merge, state } = loadMerge();
    merge('Marcus Reyes', 'Swift Falcon');
    expect(state.probe['Marcus Reyes']).toBeUndefined();
    expect(state.probe['Swift Falcon'].map(p => p.wcpm)).toEqual([38, 42, 50]);
    expect(state.logs['Swift Falcon']).toHaveLength(1);
    // The codename's deliberately-set goal wins over the import's.
    expect(state.goals['Swift Falcon'].fluencyGoal).toBe(90);
    expect(state.goals['Marcus Reyes']).toBeUndefined();
  });

  it('no records under the from-name means no writes at all', () => {
    const { merge, writes } = loadMerge();
    merge('Nobody', 'Swift Falcon');
    expect(writes).toHaveLength(0);
  });

  it('self-merge and empty names are no-ops', () => {
    const { merge, writes, state } = loadMerge();
    merge('Swift Falcon', 'Swift Falcon');
    merge('', 'Swift Falcon');
    merge('Swift Falcon', '');
    expect(writes).toHaveLength(0);
    expect(state.probe['Swift Falcon']).toHaveLength(1);
  });
});

describe('module handleLinkImportedStudent', () => {
  const PARAMS = ['askStudentAnalyticsConfirmation', 'mergeStudentRecords', 'setExternalCBMScores',
    'setRosterKey', 'setImportedStudents', 'selectedStudent', 'setSelectedStudent', 'researchStudent',
    'setResearchStudent', 'activeStudent', 'setActiveStudent', 'setProbeTargetStudent', 'addToast', 't',
    'localStorage', 'window'];

  async function runLink(student, codename, confirmAnswer, world = {}) {
    const fnSrc = extractDecl(ac, 'const handleLinkImportedStudent = async (student, codename) => {');
    const calls = { merges: [], toasts: [], repointed: [] };
    let cbm = world.cbm || { 'Marcus Reyes': [{ score: 88 }], 'Swift Falcon': [{ score: 91 }] };
    let roster = world.roster || { students: { 'Swift Falcon': {} }, progressHistory: { 'Marcus Reyes': [{ date: '2026-05-01' }], 'Swift Falcon': [{ date: '2026-04-01' }] } };
    let imported = world.imported || [{ name: 'Marcus Reyes', stats: {} }, { name: 'Quiet Heron', stats: {} }];
    let selected = world.selectedStudent !== undefined ? world.selectedStudent : { name: 'Marcus Reyes' };
    // eslint-disable-next-line no-new-func
    const link = new Function('student', 'codename', ...PARAMS,
      fnSrc + ' return handleLinkImportedStudent(student, codename);');
    await link(student, codename,
      async () => confirmAnswer,
      (from, to) => calls.merges.push([from, to]),
      (u) => { cbm = typeof u === 'function' ? u(cbm) : u; },
      (u) => { roster = typeof u === 'function' ? u(roster) : u; },
      (u) => { imported = typeof u === 'function' ? u(imported) : u; },
      selected,
      (u) => { selected = typeof u === 'function' ? u(selected) : u; },
      world.researchStudent !== undefined ? world.researchStudent : 'Marcus Reyes',
      (v) => calls.repointed.push(['research', v]),
      world.activeStudent !== undefined ? world.activeStudent : 'Marcus Reyes',
      (v) => calls.repointed.push(['active', v]),
      (v) => calls.repointed.push(['probeTarget', v]),
      (msg, level) => calls.toasts.push({ msg, level }),
      () => undefined,
      { setItem: () => {} },
      { dispatchEvent: () => {} },
    );
    return { calls, cbm, roster, imported, selected };
  }

  it('a confirmed link merges, aliases, rekeys the row, and repoints every selection', async () => {
    const { calls, cbm, roster, imported, selected } = await runLink({ name: 'Marcus Reyes' }, 'Swift Falcon', true);
    expect(calls.merges).toEqual([['Marcus Reyes', 'Swift Falcon']]);
    expect(cbm['Marcus Reyes']).toBeUndefined();
    expect(cbm['Swift Falcon'].map(e => e.score).sort()).toEqual([88, 91]);
    expect(roster.importAliases).toEqual({ 'Marcus Reyes': 'Swift Falcon' });
    expect(roster.progressHistory['Marcus Reyes']).toBeUndefined();
    expect(roster.progressHistory['Swift Falcon'].map(s => s.date)).toEqual(['2026-04-01', '2026-05-01']);
    const row = imported.find(s => s.name === 'Swift Falcon');
    expect(row).toBeDefined();
    expect(row.importedName).toBe('Marcus Reyes');
    expect(imported.find(s => s.name === 'Marcus Reyes')).toBeUndefined();
    expect(imported.find(s => s.name === 'Quiet Heron')).toBeDefined();
    expect(selected.name).toBe('Swift Falcon');
    expect(calls.repointed).toEqual(expect.arrayContaining([['research', 'Swift Falcon'], ['active', 'Swift Falcon'], ['probeTarget', 'Swift Falcon']]));
    expect(calls.toasts.some(x => x.level === 'success')).toBe(true);
  });

  it('cancel changes nothing', async () => {
    const { calls, cbm, imported } = await runLink({ name: 'Marcus Reyes' }, 'Swift Falcon', false);
    expect(calls.merges).toHaveLength(0);
    expect(cbm['Marcus Reyes']).toBeDefined();
    expect(imported.find(s => s.name === 'Marcus Reyes')).toBeDefined();
  });

  it('empty codename and already-linked are early no-ops (no confirmation shown)', async () => {
    const a = await runLink({ name: 'Marcus Reyes' }, '', true);
    expect(a.calls.merges).toHaveLength(0);
    const b = await runLink({ name: 'Swift Falcon' }, 'Swift Falcon', true);
    expect(b.calls.merges).toHaveLength(0);
    expect(b.calls.toasts).toHaveLength(0);
  });
});

describe('year boundary', () => {
  it('the archive carries every store plus the durable roster projection', () => {
    const helpers = extractDecl(ac, 'function _acTrimStudentData(data)') + extractDecl(ac, 'function _acPersistableStudent(s)');
    // `() => ({...})` — the brace-balanced slice ends at the object's close,
    // so restore the arrow's wrapping paren before the terminator.
    const at = ac.indexOf('const buildYearArchive = () => (');
    expect(at).toBeGreaterThan(-1);
    const fnSrc = ac.slice(at, ac.indexOf('{', at)) + braceBalanced(ac, ac.indexOf('{', at)) + ');';
    // eslint-disable-next-line no-new-func
    const build = new Function('probeHistory', 'interventionLogs', 'rtiGoals', 'externalCBMScores', 'rosterKey', 'importedStudents',
      helpers + fnSrc + ' return buildYearArchive;')(
      { Falcon: [{ wcpm: 42 }] }, { Falcon: [] }, {}, { Falcon: [] },
      { progressHistory: { Falcon: [{ date: '2026-05-01' }] } },
      [{ name: 'Falcon', stats: {} }, { name: 'Ghost', isLive: true, stats: {} }],
    );
    const archive = build();
    expect(archive.schemaVersion).toBe(1);
    expect(archive.probeHistory.Falcon).toHaveLength(1);
    expect(archive.progressHistory.Falcon).toHaveLength(1);
    expect(archive.importedStudents.map(s => s.name)).toEqual(['Falcon']); // live rows excluded
    expect(archive.importedStudents[0].restored).toBe(true);
  });

  it('host clearAllStudentRecords empties and flushes all three stores', () => {
    const fnSrc = extractDecl(anti, 'const clearAllStudentRecords = () => {');
    const state = { probe: { A: [] }, logs: { A: [] }, goals: { A: {} } };
    const writes = [];
    const wrap = (key) => (u) => { state[key] = typeof u === 'function' ? u(state[key]) : u; };
    // eslint-disable-next-line no-new-func
    new Function('setProbeHistory', 'setInterventionLogs', 'setRtiGoals', 'localStorage',
      fnSrc + ' return clearAllStudentRecords;')(wrap('probe'), wrap('logs'), wrap('goals'), { setItem: (k, v) => writes.push([k, v]) })();
    expect(state).toEqual({ probe: {}, logs: {}, goals: {} });
    expect(writes.map(([k]) => k).sort()).toEqual(['alloflow_intervention_logs', 'alloflow_probe_history', 'alloflow_rti_goals']);
    expect(writes.every(([, v]) => v === '{}')).toBe(true);
  });

  it('the module clear keeps roster MEMBERSHIP while clearing snapshots and aliases', async () => {
    const fnSrc = extractDecl(ac, 'const handleClearAllStudentRecords = async () => {');
    let roster = { students: { 'Swift Falcon': {} }, learnerIds: { 'Swift Falcon': 'LRN-1' }, progressHistory: { 'Swift Falcon': [{}] }, importAliases: { 'Marcus Reyes': 'Swift Falcon' } };
    let cbm = { 'Swift Falcon': [{}] };
    let imported = [{ name: 'Swift Falcon', stats: {} }];
    const cleared = [];
    // eslint-disable-next-line no-new-func
    const run = new Function('listRecordIdentities', 'askStudentAnalyticsConfirmation', 'clearAllStudentRecords',
      'setExternalCBMScores', 'setRosterKey', 'setImportedStudents', 'setSelectedStudent', 'setResearchStudent',
      'setActiveStudent', 'setProbeTargetStudent', 'setRecordsRemovalTarget', 'addToast', 't', 'localStorage', 'window',
      fnSrc + ' return handleClearAllStudentRecords();');
    await run(
      () => ['Swift Falcon'],
      async () => true,
      () => cleared.push('host'),
      (u) => { cbm = typeof u === 'function' ? u(cbm) : u; },
      (u) => { roster = typeof u === 'function' ? u(roster) : u; },
      (u) => { imported = typeof u === 'function' ? u(imported) : u; },
      () => cleared.push('selected'), () => cleared.push('research'),
      () => cleared.push('active'), () => cleared.push('probeTarget'), () => cleared.push('target'),
      () => {}, () => undefined, { setItem: () => {} }, { dispatchEvent: () => {} },
    );
    expect(cleared).toContain('host');
    expect(cbm).toEqual({});
    expect(imported).toEqual([]);
    expect(roster.students).toEqual({ 'Swift Falcon': {} });   // membership kept
    expect(roster.learnerIds).toEqual({ 'Swift Falcon': 'LRN-1' });
    expect(roster.progressHistory).toEqual({});
    expect(roster.importAliases).toEqual({});
  });

  it('the wiring: props reach the module, and the table has the link column', () => {
    expect(anti).toContain('mergeStudentRecords={mergeStudentRecords}');
    expect(anti).toContain('clearAllStudentRecords={clearAllStudentRecords}');
    expect(ac).toContain("t('class_analytics.roster_link') || 'Roster link'");
    expect(ac).toContain("'Roster link for ' + student.name");
    expect(ac).toContain('AlloFlow_Student_Records_Archive_CONFIDENTIAL_');
  });
});
