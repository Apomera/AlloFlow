// Word Sounds live-session progress + probe-result return path (2026-07-12).
//
// Students in a live session now report:
//   roster.{uid}.wsProgress     — practice counts + activity id (debounced)
//   roster.{uid}.wsProbeResult  — one structured summary on probe completion
// The teacher device banks wsProbeResult into local probeHistory on arrival
// (the roster leaf is TRANSPORT — the session doc is deleted at session end),
// and the Live Session Center dock renders per-student progress chips.
//
// These are source pins (same style as session_soft_end_terminal.test.js)
// plus a FUNCTIONAL check of the shape validators, extracted verbatim from
// the shell source so the mailbox server mirror can't drift silently.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let anti, codegs;
beforeAll(() => {
  anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  codegs = readFileSync(resolve(process.cwd(), 'apps_script/session_mailbox/Code.gs'), 'utf8');
});

// Extract the validator trio verbatim from a source blob and materialize it.
function buildValidators(src, label) {
  const start = src.indexOf('function validWsMetricNumber');
  const end = src.indexOf('function validParticipantRosterField', start);
  if (start === -1 || end === -1) throw new Error(`validator block not found in ${label}`);
  const block = src.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(`${block}; return { validWsProgressValue, validWsProbeResultValue };`)();
}

describe('Tier-1 allowlist + write-path source pins (AlloFlowANTI.txt)', () => {
  it('SESSION_TIER1_LEAVES allows wsProgress and wsProbeResult with justification comments', () => {
    const leavesBlock = anti.slice(anti.indexOf('const SESSION_TIER1_LEAVES'), anti.indexOf(']);', anti.indexOf('const SESSION_TIER1_LEAVES')));
    expect(leavesBlock).toContain("'wsProgress'");
    expect(leavesBlock).toContain("'wsProbeResult'");
    // Justifications must survive: transport-not-storage is the FERPA posture.
    expect(leavesBlock).toMatch(/wsProbeResult[\s\S]*?TRANSPORT, not storage/);
  });

  it('SESSION_TIER1_LEAVES allows aiPolicy with justification, and writeToSession shape-enforces it', () => {
    const leavesBlock = anti.slice(anti.indexOf('const SESSION_TIER1_LEAVES'), anti.indexOf(']);', anti.indexOf('const SESSION_TIER1_LEAVES')));
    expect(leavesBlock).toContain("'aiPolicy'");
    // Justification: teacher-set enum only, no student-typed content.
    expect(leavesBlock).toMatch(/aiPolicy[\s\S]*?Enum-only, teacher-set/);
    // The write path must coerce to the strict enum shape (fail-closed to 'off'):
    // without this, the allowlisted leaf could carry arbitrary objects.
    const writeBlock = anti.slice(anti.indexOf('const writeToSession'), anti.indexOf('return updateDoc(sessionRef, safePayload);'));
    expect(writeBlock).toMatch(/hasOwnProperty\.call\(safePayload, 'aiPolicy'\)/);
    expect(writeBlock).toMatch(/studentAi === 'student-byok' \? 'student-byok' : 'off'/);
  });

  it('student practice-progress effect writes roster.{uid}.wsProgress (debounced, probe-excluded)', () => {
    expect(anti).toMatch(/roster\.\$\{user\.uid\}\.wsProgress/);
    const effect = anti.slice(anti.indexOf('const wsProgressSigRef'), anti.indexOf('const wsProbeBankedRef'));
    expect(effect).toMatch(/if \(!isWordSoundsMode \|\| isProbeMode\) return;/);
    expect(effect).toMatch(/setTimeout/);
  });

  it('onProbeComplete writes roster.{uid}.wsProbeResult and banks locally under the student nickname', () => {
    expect(anti).toMatch(/roster\.\$\{user\.uid\}\.wsProbeResult/);
    expect(anti).toMatch(/else if \(!isTeacherMode && studentNickname\) saveProbeResult\(studentNickname, fullResult\);/);
  });

  it('teacher banking effect uses ONE functional setProbeHistory per snapshot batch', () => {
    const bank = anti.slice(anti.indexOf('const wsProbeBankedRef'), anti.indexOf('// Live-session pushes previously set only generatedContent'));
    expect(bank).toMatch(/setProbeHistory\(prev =>/);
    expect(bank).toMatch(/wsProbeBankedRef\.current\[seenKey\]/);
    expect(bank).toMatch(/alloflow_probe_history/);
  });

  it('Live Session Center dock renders wsProgress and wsProbeResult chips', () => {
    expect(anti).toMatch(/entry\.wsProgress && entry\.wsProgress\.total/);
    expect(anti).toMatch(/entry\.wsProbeResult && entry\.wsProbeResult\.total/);
  });

  it('student self-open honors the saved lesson-plan sequence', () => {
    expect(anti).toMatch(/_selfOpenSeq/);
    expect(anti).toMatch(/setWordSoundsActivity\(_selfOpenSeq\.length > 0 \? _selfOpenSeq\[0\] : 'counting'\)/);
  });
});

describe('shape validators (functional, shell + mailbox server mirror)', () => {
  const cases = (v) => {
    // wsProgress: valid shapes
    expect(v.validWsProgressValue(null)).toBe(true);
    expect(v.validWsProgressValue({ kind: 'practice', activity: 'sound_sort', correct: 3, total: 5, goal: 10, done: false, at: 1752000000000 })).toBe(true);
    // rejects: free text activity, unknown keys, string counts, arrays
    expect(v.validWsProgressValue({ activity: 'DROP TABLE users' })).toBe(false);
    expect(v.validWsProgressValue({ note: 'hi teacher' })).toBe(false);
    expect(v.validWsProgressValue({ correct: '3' })).toBe(false);
    expect(v.validWsProgressValue([1, 2])).toBe(false);
    expect(v.validWsProgressValue({ kind: 'quiz' })).toBe(false);
    // wsProbeResult: valid shape
    expect(v.validWsProbeResultValue({ activity: 'segmentation', correct: 8, total: 10, accuracy: 80, itemsPerMin: 12.5, elapsed: 48, grade: '2nd Grade', form: 'A', at: 1752000000000 })).toBe(true);
    // rejects: free-text grade, unknown keys, non-numeric metrics
    expect(v.validWsProbeResultValue({ grade: 'ok; drop everything now please!!' })).toBe(false);
    expect(v.validWsProbeResultValue({ studentNotes: 'struggled' })).toBe(false);
    expect(v.validWsProbeResultValue({ itemsPerMin: 'fast' })).toBe(false);
  };

  it('shell (AlloFlowANTI.txt) validators accept valid shapes and refuse free text', () => {
    cases(buildValidators(anti, 'AlloFlowANTI.txt'));
  });

  it('mailbox server (Code.gs) mirror behaves identically', () => {
    cases(buildValidators(codegs, 'Code.gs'));
  });

  it('both validators gate the roster patch surface (rosterFields includes the new leaves)', () => {
    for (const src of [anti, codegs]) {
      const map = src.slice(src.indexOf('var rosterFields = {'), src.indexOf('};', src.indexOf('var rosterFields = {')));
      expect(map).toContain('wsProgress: 1');
      expect(map).toContain('wsProbeResult: 1');
      expect(src).toMatch(/if \(field === 'wsProgress'\) return validWsProgressValue\(value\);/);
      expect(src).toMatch(/if \(field === 'wsProbeResult'\) return validWsProbeResultValue\(value\);/);
    }
  });
});

describe('TTL deploy config', () => {
  it('firebase.live-sessions.json exists and points at rules + TTL indexes', () => {
    const cfg = JSON.parse(readFileSync(resolve(process.cwd(), 'firebase.live-sessions.json'), 'utf8'));
    expect(cfg.firestore.rules).toBe('firestore.rules');
    expect(cfg.firestore.indexes).toBe('firestore.indexes.json');
    const idx = JSON.parse(readFileSync(resolve(process.cwd(), 'firestore.indexes.json'), 'utf8'));
    const ttlGroups = idx.fieldOverrides.filter((f) => f.ttl && f.fieldPath === 'expiresAt').map((f) => f.collectionGroup);
    expect(ttlGroups).toContain('session_assets');
  });
});
