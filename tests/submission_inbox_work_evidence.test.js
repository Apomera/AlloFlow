// Submission Inbox — work evidence (2026-07-27).
//
// A student submission has always carried `content` (the resources the student
// engaged with), `gameCompletions` and `stats` alongside the free-text
// `responses`. The inbox read only responses/timestamp/docTitle/nickname, so
// every mailbox homework review showed a fraction of the file that had already
// travelled all the way into the teacher's Drive. The derivation helper is
// exercised FOR REAL via eval-slice; the wiring and the import gate are pinned.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'view_submission_inbox_source.jsx'), 'utf8');
const built = readFileSync(resolve(process.cwd(), 'view_submission_inbox_module.js'), 'utf8');
const mirror = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/view_submission_inbox_module.js'), 'utf8');

// ── eval-slice the REAL helper ──────────────────────────────────────────────
const start = source.indexOf('function siWorkEvidence(');
const end = source.indexOf('function SubmissionInbox(');
if (start < 0 || end < 0 || end <= start) throw new Error('siWorkEvidence slice anchors missed');
const siWorkEvidence = new Function(
  source.slice(start, end) + '\nreturn siWorkEvidence;'
)();

// The shape the student device actually writes (AlloFlowANTI handleSubmitAssignment).
const realSubmission = {
  kind: 'alloflow-student-submission',
  schemaVersion: 2,
  studentName: 'Otter42',
  nickname: 'Otter42',
  docTitle: 'Water cycle',
  content: [
    { id: 'r1', type: 'concept-sort', title: 'Sort the stages' },
    { id: 'r2', type: 'quiz', title: 'Water cycle check' },
    { id: 'r3', type: 'simplified', title: 'Evaporation, simplified' },
  ],
  answers: { q1: 'it turns to vapour' },
  responses: { q1: 'it turns to vapour' },
  gameCompletions: {
    crossword: [{ completedAt: 'x' }, { completedAt: 'y' }],
    memory: [{ completedAt: 'z' }],
    bingo: [],
  },
  stats: {
    totalXP: 320,
    quizzesTaken: 2,
    notebook: { total: 4, cornell: 1 },
    pasteEventResponseCount: 0,
    summary: { quizzes: 2, adventures: 0, readings: 1, scaffolds: 0 },
  },
};

describe('siWorkEvidence: derives what the student actually did', () => {
  it('reads activities, games and stats out of a real submission', () => {
    const ev = siWorkEvidence(realSubmission);
    expect(ev.isEmpty).toBe(false);
    expect(ev.activities).toEqual([
      { type: 'concept-sort', title: 'Sort the stages' },
      { type: 'quiz', title: 'Water cycle check' },
      { type: 'simplified', title: 'Evaporation, simplified' },
    ]);
    // Games with zero plays are not evidence of anything and are dropped.
    expect(ev.games).toEqual([
      { gameType: 'crossword', plays: 2 },
      { gameType: 'memory', plays: 1 },
    ]);
    expect(ev.totalXP).toBe(320);
    expect(ev.quizzesTaken).toBe(2);
    expect(ev.notebookEntries).toBe(4);
  });

  it('never surfaces stats.summary — it is an OBJECT of counts, not a display string', () => {
    const ev = siWorkEvidence(realSubmission);
    // The [object Object] class of bug: the student Submit modal builds summary
    // as {quizzes, adventures, readings, scaffolds}. `content` supersedes it.
    expect(Object.values(ev).some(v => typeof v === 'string' && v.includes('[object'))).toBe(false);
    expect(ev.summary).toBeUndefined();
  });

  it('is empty only when the submission really carries no evidence', () => {
    expect(siWorkEvidence({ responses: { q1: 'typed only' } }).isEmpty).toBe(true);
    expect(siWorkEvidence({ content: [{ type: 'quiz', title: 'x' }] }).isEmpty).toBe(false);
    expect(siWorkEvidence({ gameCompletions: { bingo: [{}] } }).isEmpty).toBe(false);
    expect(siWorkEvidence({ stats: { totalXP: 0 } }).isEmpty).toBe(false); // zero XP is a reading, not an absence
  });

  it('survives any shape — the payload is a file from a student device', () => {
    const junk = [null, undefined, 42, 'string', [], { content: 'not-an-array' }, { gameCompletions: [] }, { stats: [] }];
    for (const input of junk) {
      const ev = siWorkEvidence(input);
      expect(ev.activities).toEqual([]);
      expect(ev.games).toEqual([]);
      expect(ev.isEmpty).toBe(true);
    }
    // Malformed members are dropped, not rendered.
    expect(siWorkEvidence({ content: [null, 'junk', { title: 'no type' }, { type: 'quiz' }] }).activities)
      .toEqual([{ type: 'quiz', title: 'quiz' }]);
    // Nonsense numbers never reach the UI.
    const bad = siWorkEvidence({ stats: { totalXP: -5, quizzesTaken: NaN, pasteEventResponseCount: Infinity } });
    expect(bad.totalXP).toBeNull();
    expect(bad.quizzesTaken).toBeNull();
    expect(bad.pastesIntoAnswers).toBeNull();
  });

  it('bounds every string it hands to the renderer', () => {
    const ev = siWorkEvidence({
      content: [{ type: 'q'.repeat(200), title: 't'.repeat(500) }],
      gameCompletions: { ['g'.repeat(200)]: [{}] },
    });
    expect(ev.activities[0].title).toHaveLength(80);
    expect(ev.activities[0].type).toHaveLength(40);
    expect(ev.games[0].gameType).toHaveLength(40);
  });
});

describe('inbox wiring', () => {
  it('accepts a submission that declares its kind, even with no responses key', () => {
    // A student who worked entirely in activities and games and typed nothing
    // used to be rejected as "not a submission" by the response-shaped heuristic.
    expect(source).toContain("p.kind === 'alloflow-student-submission'");
    expect(source).toContain('declaresSubmission || looksResponseShaped');
  });

  it('renders the evidence inside the expanded row, above the AI rubric section', () => {
    const evidenceAt = source.indexOf('siWorkEvidence(row.payload)');
    const rubricAt = source.indexOf('// Rubric / Grade-with-AI section');
    expect(evidenceAt).toBeGreaterThan(-1);
    expect(rubricAt).toBeGreaterThan(evidenceAt);
    // The paste count is a conversation prompt, never a verdict.
    expect(source).toContain('Worth asking about, not a conclusion.');
  });

  it('ships in the built module and its mirror, byte-identical', () => {
    expect(built).toContain('siWorkEvidence');
    expect(built).toContain('Work in this submission');
    expect(mirror).toBe(built);
  });
});
