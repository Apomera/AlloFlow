// Probe-store plumbing pins (2026-08-23): the fixes around WHERE assessment
// records live and how they move between the host, the Assessment Center
// module, the study bundle and the project file.
//
//  1. saveProbeResult / saveInterventionLog use functional updates — several
//     results landing in the same tick must all survive (the old closure form
//     dropped all but the last write; the roster banking effect documents why).
//  2. STUDY_BUNDLE_KEYS carries alloflow_probe_history and
//     alloflow_intervention_logs (schemaVersion 2) — the bundle used to leave
//     the actual student records behind.
//  3. The external CBM key is ONE key: alloflow_external_cbm. The host used to
//     read/write alloflow_external_cbm_scores, so restores populated a key the
//     Center never read and project saves carried an empty store.
//  4. Both sides listen for 'alloflow:study-bundle-imported' — the module used
//     to dispatch it into the void.
//  5. The host's handleLaunchORF normalizes the JSON passage shape (array of
//     one object) instead of assigning "[object Object]" into the reader.
//
// Functions are EXECUTED out of the live sources, never hand-copied.

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

// Extract `const NAME = (...) => { ... };` as executable source.
function extractConstFn(src, name) {
  const decl = `const ${name} = `;
  const at = src.indexOf(decl);
  expect(at, `${name} not found`).toBeGreaterThan(-1);
  const body = braceBalanced(src, src.indexOf('{', at));
  return src.slice(at, src.indexOf('{', at)) + body + ';';
}

describe('same-tick writes all survive (functional updates)', () => {
  it('saveProbeResult: two students and two entries for one student, one tick', () => {
    const fnSrc = extractConstFn(anti, 'saveProbeResult');
    let state = {};
    const setProbeHistory = (u) => { state = typeof u === 'function' ? u(state) : u; };
    const writes = [];
    const fakeLS = { setItem: (k, v) => writes.push([k, v]) };
    // eslint-disable-next-line no-new-func
    const save = new Function('setProbeHistory', 'localStorage', fnSrc + ' return saveProbeResult;')(setProbeHistory, fakeLS);
    save('Falcon', { activity: 'orf', wcpm: 42 });
    save('Heron', { activity: 'orf', wcpm: 31 });
    save('Falcon', { activity: 'math_dcpm', dcpm: 12 });
    expect(state.Falcon).toHaveLength(2);
    expect(state.Heron).toHaveLength(1);
    // localStorage mirrors the MERGED value, not a per-call snapshot of stale state.
    const last = JSON.parse(writes[writes.length - 1][1]);
    expect(last.Falcon).toHaveLength(2);
    expect(last.Heron).toHaveLength(1);
    expect(writes.every(([k]) => k === 'alloflow_probe_history')).toBe(true);
  });

  it('saveInterventionLog: two logs in one tick both land; delete removes by id', () => {
    const src2 = extractConstFn(anti, 'saveInterventionLog') + extractConstFn(anti, 'deleteInterventionLog');
    let state = {};
    const setInterventionLogs = (u) => { state = typeof u === 'function' ? u(state) : u; };
    const fakeLS = { setItem: () => {} };
    // eslint-disable-next-line no-new-func
    const fns = new Function('setInterventionLogs', 'localStorage', src2 + ' return { saveInterventionLog, deleteInterventionLog };')(setInterventionLogs, fakeLS);
    fns.saveInterventionLog('Falcon', { intervention: 'Wilson Reading' });
    fns.saveInterventionLog('Falcon', { intervention: 'Repeated reading' });
    expect(state.Falcon).toHaveLength(2);
    const ids = state.Falcon.map(l => l.id);
    expect(new Set(ids).size).toBe(2);
    fns.deleteInterventionLog('Falcon', ids[0]);
    expect(state.Falcon).toHaveLength(1);
    expect(state.Falcon[0].intervention).toBe('Repeated reading');
  });
});

describe('the study bundle carries the student records', () => {
  it('STUDY_BUNDLE_KEYS includes probe history and intervention logs, schemaVersion 2', () => {
    const at = ac.indexOf('const STUDY_BUNDLE_KEYS = [');
    expect(at).toBeGreaterThan(-1);
    const arrSrc = ac.slice(at + 'const STUDY_BUNDLE_KEYS = '.length, ac.indexOf('];', at) + 1);
    // eslint-disable-next-line no-new-func
    const keys = new Function('return ' + arrSrc)();
    expect(keys).toContain('alloflow_probe_history');
    expect(keys).toContain('alloflow_intervention_logs');
    expect(keys).toHaveLength(8);
    expect(ac).toContain('const bundle = { schemaVersion: 2, exportedAt:');
  });

  it('the import path writes every bundled key generically, so the new keys ride the same rail', () => {
    // hasOwnProperty-guarded forEach over STUDY_BUNDLE_KEYS — no per-key allowlist to forget.
    expect(ac).toContain('STUDY_BUNDLE_KEYS.forEach(function (k) {');
    expect(ac).toContain('Object.prototype.hasOwnProperty.call(bundle, k)');
  });
});

describe('one external CBM key, and both sides listen', () => {
  it('the split key is gone: nothing reads or writes alloflow_external_cbm_scores', () => {
    expect(anti).not.toContain('alloflow_external_cbm_scores');
    expect(ac).not.toContain('alloflow_external_cbm_scores');
  });

  it('the host listens for study-bundle-imported and external-cbm-updated', () => {
    expect(anti).toContain("window.addEventListener('alloflow:study-bundle-imported'");
    expect(anti).toContain("window.addEventListener('alloflow:external-cbm-updated'");
    // …and re-reads the four host-owned stores.
    for (const key of ['alloflow_rti_goals', 'alloflow_probe_history', 'alloflow_intervention_logs', 'alloflow_external_cbm']) {
      expect(anti.includes(`setRtiGoals(JSON.parse(localStorage.getItem('alloflow_rti_goals'`) || key !== 'alloflow_rti_goals').toBe(true);
    }
  });

  it('the module listens too, and announces its own CBM writes to the host', () => {
    expect(ac).toContain("window.addEventListener('alloflow:study-bundle-imported'");
    expect(ac).toContain("window.dispatchEvent(new CustomEvent('alloflow:external-cbm-updated'))");
  });

  it("the host's research-JSON import dispatches the re-read event it now has a listener for", () => {
    expect(anti).toContain("detail: { source: 'research-json-import' }");
  });
});

describe('host handleLaunchORF renders the passage, not [object Object]', () => {
  const PARAMS = ['ORF_SCREENING_PASSAGES', 'addToast', 't', 'setProbeGradeLevel',
    'setProbeActivity', 'setMathProbeForm', 'setGeneratedContent', 'setIsFluencyMode',
    'setFluencyStatus', 'setFluencyResult', 'setActiveView'];

  function runLaunch(bank, grade, form) {
    const fnSrc = extractConstFn(anti, 'handleLaunchORF');
    let content = null;
    const toasts = [];
    // eslint-disable-next-line no-new-func
    const launch = new Function(...PARAMS, fnSrc + ' return handleLaunchORF;')(
      bank,
      (msg, level) => toasts.push({ msg, level }),
      () => '',
      () => {}, () => {}, () => {},
      (updater) => { content = typeof updater === 'function' ? updater(null) : updater; },
      () => {}, () => {}, () => {}, () => {},
    );
    launch(grade, form);
    return { content, toasts };
  }

  it('the shipped JSON shape (array holding one passage object) becomes plain text', () => {
    const bank = { '2': { A: [{ grade: '2', title: 'The Garden', wordCount: 5, text: 'a b c d e' }] } };
    const { content } = runLaunch(bank, '2', 'A');
    expect(content).not.toBeNull();
    expect(content.text).toBe('a b c d e');
    expect(content.sourceText).toBe('a b c d e');
    expect(content.isScreeningORF).toBe(true);
  });

  it('the legacy bare-string shape still works', () => {
    const bank = { '2': { A: 'plain legacy passage' } };
    const { content } = runLaunch(bank, '2', 'A');
    expect(content.text).toBe('plain legacy passage');
  });

  it('a malformed entry refuses with a toast instead of loading garbage', () => {
    const bank = { '2': { A: [{ title: 'No text here' }] } };
    const { content, toasts } = runLaunch(bank, '2', 'A');
    expect(content).toBeNull();
    expect(toasts.some(x => x.level === 'warning')).toBe(true);
  });
});

describe('Screening Queue counts Roster Key students', () => {
  it('the gate and the queue builder both union the roster in', () => {
    expect(ac).toContain('Object.keys(rosterKey.students).filter(function(n) { return !importedStudents.some(function(s) { return (s.nickname || s.name) === n; }); }).length');
    expect(ac).toContain('Object.keys(rosterKey.students).forEach(function(n) { if (names.indexOf(n) === -1) names.push(n); });');
  });
});
