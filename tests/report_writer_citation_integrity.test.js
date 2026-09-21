// Citation-trail integrity for report_writer's USED_CHUNKS parser.
//
// WHY (assessment-integrity): the report's citation trail is what lets a
// clinician ask "where did this sentence come from?". Those ids are supplied by
// the MODEL, so they are a CLAIM about provenance, not proof of one. Before this
// pass, parseEvidenceResponse stored whatever ids came back without checking
// them against the chunks actually put in the prompt — so a fabricated id landed
// in evidenceMap and the audit trail looked intact while pointing at nothing.
// It also silently inflated the triangulated best-of-N quality score, which
// rewards passes for citing more chunks.
//
// These tests pin the contract: unknown ids are DROPPED from usedChunks and
// reported separately in unknownChunks, and the no-known-ids call path is
// unchanged so existing callers cannot regress.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

let parseEvidenceResponse;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('report_writer_module.js');
  const seam = window.AlloReportWriterTesting;
  if (!seam || typeof seam.parseEvidenceResponse !== 'function') {
    throw new Error('parseEvidenceResponse seam not exposed');
  }
  parseEvidenceResponse = seam.parseEvidenceResponse;
});

const CHUNKS = [
  { id: 'c-001', type: 'score', value: 'VCI: 112' },
  { id: 'c-002', type: 'score', value: 'WMI: 85' },
  { id: 'c-003', type: 'background', value: 'retained in grade 1' },
];

const draft = (body, ids) => `${body}\nUSED_CHUNKS: ${ids.join(', ')}`;

describe('parseEvidenceResponse — text/citation split', () => {
  it('separates the narrative from the USED_CHUNKS trailer', () => {
    const r = parseEvidenceResponse(draft('[Student] demonstrates strength.', ['c-001']), CHUNKS);
    expect(r.text).toBe('[Student] demonstrates strength.');
    expect(r.usedChunks).toEqual(['c-001']);
  });

  it('returns the whole body as text when no USED_CHUNKS line is present', () => {
    const r = parseEvidenceResponse('No trailer here.', CHUNKS);
    expect(r.text).toBe('No trailer here.');
    expect(r.usedChunks).toEqual([]);
  });

  it('does not throw on null/undefined model output', () => {
    expect(() => parseEvidenceResponse(null, CHUNKS)).not.toThrow();
    expect(parseEvidenceResponse(null, CHUNKS).text).toBe('');
  });
});

describe('parseEvidenceResponse — fabricated id rejection', () => {
  it('DROPS an id that matches no verified chunk', () => {
    // The defect: 'c-999' was invented by the model. It must not survive into
    // the citation trail, because a clinician following it finds nothing.
    const r = parseEvidenceResponse(draft('Claim text.', ['c-001', 'c-999']), CHUNKS);
    expect(r.usedChunks).toEqual(['c-001']);
    expect(r.unknownChunks).toEqual(['c-999']);
  });

  it('drops every id when the model fabricates all of them', () => {
    const r = parseEvidenceResponse(draft('Unsourced claim.', ['x-1', 'x-2']), CHUNKS);
    expect(r.usedChunks).toEqual([]);
    expect(r.unknownChunks).toEqual(['x-1', 'x-2']);
    // The narrative is still returned — the caller decides what to do with an
    // uncited section; this helper does not silently delete clinical text.
    expect(r.text).toBe('Unsourced claim.');
  });

  it('reports no unknowns when every cited id is real', () => {
    const r = parseEvidenceResponse(draft('Good.', ['c-001', 'c-003']), CHUNKS);
    expect(r.usedChunks).toEqual(['c-001', 'c-003']);
    expect(r.unknownChunks).toEqual([]);
  });

  it('accepts a Set or a plain id array as the known-id source', () => {
    const asSet = parseEvidenceResponse(draft('T.', ['c-002', 'nope']), new Set(['c-002']));
    expect(asSet.usedChunks).toEqual(['c-002']);
    expect(asSet.unknownChunks).toEqual(['nope']);

    const asIds = parseEvidenceResponse(draft('T.', ['c-002', 'nope']), ['c-002']);
    expect(asIds.usedChunks).toEqual(['c-002']);
    expect(asIds.unknownChunks).toEqual(['nope']);
  });
});

describe('parseEvidenceResponse — backward compatibility', () => {
  it('drops nothing when no known-id list is supplied', () => {
    // Callers without chunk list in scope must behave exactly as before this
    // change, or an unrelated call site starts silently losing citations.
    const r = parseEvidenceResponse(draft('Claim.', ['c-001', 'c-999']));
    expect(r.usedChunks).toEqual(['c-001', 'c-999']);
    expect(r.unknownChunks).toEqual([]);
  });

  it('drops nothing when the known-id list is empty', () => {
    // An empty list means "we could not determine what was known", which must
    // not be read as "nothing is known" — that would erase every citation.
    const r = parseEvidenceResponse(draft('Claim.', ['c-001']), []);
    expect(r.usedChunks).toEqual(['c-001']);
    expect(r.unknownChunks).toEqual([]);
  });
});

// ── Background-extraction windowing ────────────────────────────────────────
//
// WHY: fact extraction used `scrubbed.substring(0, 4000)`. A clinician pasting a
// full developmental history got facts from its opening only — under a green
// "Extracted N fact chunks" toast, with nothing indicating the rest was never
// read. On a psychoeducational report that is silent omission of clinical data.
// Windows now cover the whole text, overlap so a fact straddling a boundary
// survives, and report when a hard ceiling was hit so the caller can disclose it.

describe('buildExtractionWindows — full coverage, disclosed limits', () => {
  let buildExtractionWindows;
  beforeAll(() => {
    buildExtractionWindows = window.AlloReportWriterTesting.buildExtractionWindows;
    if (typeof buildExtractionWindows !== 'function') throw new Error('seam missing');
  });

  it('returns a single window for text that fits', () => {
    const r = buildExtractionWindows('short history', { size: 4000, overlap: 400 });
    expect(r.windows).toHaveLength(1);
    expect(r.windows[0]).toBe('short history');
    expect(r.capped).toBe(false);
  });

  it('COVERS text past the old 4000-char cutoff', () => {
    // The regression guard: 'TAIL' sits past 4000 chars and was silently dropped.
    const text = 'A'.repeat(4200) + 'TAIL';
    const r = buildExtractionWindows(text, { size: 4000, overlap: 400 });
    expect(r.windows.length).toBeGreaterThan(1);
    expect(r.windows.join('')).toContain('TAIL');
  });

  it('overlaps windows so a fact spanning a boundary is not split away', () => {
    const text = 'X'.repeat(3990) + 'BOUNDARYFACT' + 'Y'.repeat(2000);
    const r = buildExtractionWindows(text, { size: 4000, overlap: 400 });
    // At least one window must contain the phrase intact.
    expect(r.windows.some(w => w.includes('BOUNDARYFACT'))).toBe(true);
  });

  it('reports capped:true when the text exceeds the window ceiling', () => {
    const r = buildExtractionWindows('Z'.repeat(100000), { size: 4000, overlap: 400, maxWindows: 3 });
    expect(r.windows).toHaveLength(3);
    expect(r.capped).toBe(true);
    expect(r.totalWindows).toBeGreaterThan(3);
  });

  it('reports capped:false when everything fits under the ceiling', () => {
    const r = buildExtractionWindows('Z'.repeat(9000), { size: 4000, overlap: 400, maxWindows: 8 });
    expect(r.capped).toBe(false);
    expect(r.totalWindows).toBe(r.windows.length);
  });

  it('handles empty and nullish input without throwing', () => {
    expect(buildExtractionWindows('').windows).toEqual([]);
    expect(buildExtractionWindows(null).windows).toEqual([]);
    expect(buildExtractionWindows(undefined).capped).toBe(false);
  });

  it('terminates on pathological overlap settings', () => {
    // overlap >= size would make step 0 and loop forever without the clamp.
    const r = buildExtractionWindows('Q'.repeat(5000), { size: 100, overlap: 100, maxWindows: 5 });
    expect(r.windows.length).toBeLessThanOrEqual(5);
  });
});

// ── Formal-export gate ─────────────────────────────────────────────────────
//
// WHY: this predicate decides whether a psychoeducational report can leave the
// tool as a formal, signed document. An `unsourced` finding — a claim the
// accuracy audit could NOT tie to any verified fact — was counted and displayed
// but never gated: a clinician could attest and export with untraceable
// assertions in the narrative, with the count sitting in a panel they may never
// have opened. Unsourced claims still do not hard-block (some connective prose
// is legitimately unsourced) but now require an explicit acknowledgement.

describe('evaluateExportGate — formal export preconditions', () => {
  let evaluateExportGate;
  beforeAll(() => {
    evaluateExportGate = window.AlloReportWriterTesting.evaluateExportGate;
    if (typeof evaluateExportGate !== 'function') throw new Error('seam missing');
  });

  const clean = {
    hasSections: true, auditStatus: 'passed', auditIsCurrent: true,
    blockingCount: 0, psycheckIsCurrent: true, psycheckBlockingCount: 0,
    unsourcedCount: 0, unsourcedAcknowledged: false, clinicianAttested: true,
  };

  it('is ready when every precondition is met', () => {
    const r = evaluateExportGate(clean);
    expect(r.ready).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it('BLOCKS attestation while unsourced claims are unacknowledged', () => {
    // The defect this pass fixes: unsourcedCount > 0 used to be invisible here.
    const r = evaluateExportGate({ ...clean, unsourcedCount: 3, unsourcedAcknowledged: false });
    expect(r.canAttest).toBe(false);
    expect(r.ready).toBe(false);
    expect(r.reasons).toContain('unsourced-unacknowledged');
  });

  it('allows attestation once unsourced claims are acknowledged', () => {
    const r = evaluateExportGate({ ...clean, unsourcedCount: 3, unsourcedAcknowledged: true });
    expect(r.canAttest).toBe(true);
    expect(r.ready).toBe(true);
  });

  it('does not require acknowledgement when there are no unsourced claims', () => {
    const r = evaluateExportGate({ ...clean, unsourcedCount: 0, unsourcedAcknowledged: false });
    expect(r.ready).toBe(true);
  });

  it('keeps every pre-existing block intact', () => {
    expect(evaluateExportGate({ ...clean, hasSections: false }).reasons).toContain('no-content');
    expect(evaluateExportGate({ ...clean, auditStatus: 'blocked' }).reasons).toContain('audit-not-passed');
    expect(evaluateExportGate({ ...clean, auditIsCurrent: false }).reasons).toContain('audit-stale');
    expect(evaluateExportGate({ ...clean, blockingCount: 1 }).reasons).toContain('blocking-findings');
    expect(evaluateExportGate({ ...clean, psycheckIsCurrent: false }).reasons).toContain('psycheck-stale');
    expect(evaluateExportGate({ ...clean, psycheckBlockingCount: 2 }).reasons).toContain('psycheck-findings');
    expect(evaluateExportGate({ ...clean, clinicianAttested: false }).reasons).toContain('not-attested');
  });

  it('separates canAttest from ready — attestation is the LAST step', () => {
    // A clinician must be able to attest once the checks pass; the attestation
    // itself is what flips ready. Conflating the two would make the checkbox
    // permanently disabled.
    const r = evaluateExportGate({ ...clean, clinicianAttested: false });
    expect(r.canAttest).toBe(true);
    expect(r.ready).toBe(false);
  });

  it('does not throw on missing/partial state', () => {
    expect(() => evaluateExportGate()).not.toThrow();
    expect(evaluateExportGate().ready).toBe(false);
  });
});

// ── PII redaction ──────────────────────────────────────────────────────────
//
// WHY: scrubPII is the FERPA boundary — 18 call sites route prompt text through
// it before anything reaches an AI provider. It previously matched only the
// exact full-name string, so the most common form in clinical narrative walked
// straight through: "Sam struggled with the task." was sent unredacted.
//
// The counter-constraint is equally load-bearing: this must never damage
// clinical meaning. It is one safeguard among several, so a miss is recoverable
// while a silent corruption is not — the scrub runs on the way OUT, and the
// clinician never sees the text the model actually reasoned over. The
// "preserves clinical content" block below is not a nicety; it is the reason
// common-word names are deliberately left alone.

describe('scrubIdentifiers — catches the forms the old scrubber missed', () => {
  let scrubIdentifiers;
  beforeAll(() => {
    scrubIdentifiers = window.AlloReportWriterTesting.scrubIdentifiers;
    if (typeof scrubIdentifiers !== 'function') throw new Error('seam missing');
  });
  const S = { studentName: 'Sam Rivera' };

  it('redacts the full name', () => {
    expect(scrubIdentifiers('Sam Rivera was evaluated.', S)).toBe('[Student] was evaluated.');
  });

  it('redacts the FIRST name alone — the common clinical form', () => {
    expect(scrubIdentifiers('Sam struggled with the task.', S)).toBe('[Student] struggled with the task.');
  });

  it('redacts the SURNAME alone', () => {
    expect(scrubIdentifiers('Rivera was observed at recess.', S)).toBe('[Student] was observed at recess.');
  });

  it('survives whitespace variation and line wraps', () => {
    expect(scrubIdentifiers('Sam  Rivera arrived.', S)).toBe('[Student] arrived.');
    expect(scrubIdentifiers('Sam\nRivera was late.', S)).toBe('[Student] was late.');
  });

  it('handles "Surname, First" as rosters print it', () => {
    expect(scrubIdentifiers('Rivera, Sam was evaluated.', S)).toBe('[Student] was evaluated.');
  });

  it('does not match inside longer words', () => {
    // 'Sam' must not hit 'Samples'.
    expect(scrubIdentifiers('Samples were collected.', S)).toBe('Samples were collected.');
  });

  it('redacts structured identifiers', () => {
    expect(scrubIdentifiers('Email a@b.com, call 555-867-5309, SSN 123-45-6789.', S))
      .toBe('Email [EMAIL], call [PHONE], SSN [SSN].');
  });
});

describe('scrubIdentifiers — PRESERVES clinical content', () => {
  let scrubIdentifiers;
  beforeAll(() => { scrubIdentifiers = window.AlloReportWriterTesting.scrubIdentifiers; });
  const S = { studentName: 'Sam Rivera' };

  it('keeps ages, durations and grade levels', () => {
    const t = 'Regression at 18 months; reading at a 2nd grade level; attends 15 minutes.';
    expect(scrubIdentifiers(t, S)).toBe(t);
  });

  it('keeps scores and percentiles untouched', () => {
    const t = 'VCI 112, WMI 85, 79th percentile.';
    expect(scrubIdentifiers(t, S)).toBe(t);
  });

  it('does NOT redact a name part that is an ordinary English word', () => {
    // A student named Mark Hall must not turn "will mark the answer in the
    // hall" into "[Student] [Student] the answer in the [Student]".
    const t = 'Mark will mark the answer in the hall.';
    expect(scrubIdentifiers(t, { studentName: 'Mark Hall' })).toBe(t);
  });

  it('redacts calendar dates but not age-relative timing', () => {
    expect(scrubIdentifiers('Assessed 3/14/2024, regression at 18 months.', S))
      .toBe('Assessed [DATE], regression at 18 months.');
  });

  it('preserves the informant distinction via role tokens', () => {
    const opts = { studentName: 'Sam Rivera', people: [
      { name: 'Maria Rivera', role: 'Mother' }, { name: 'Ellen Thompson', role: 'Teacher' }] };
    expect(scrubIdentifiers('Ellen Thompson reports inattention.', opts))
      .toBe('[Teacher] reports inattention.');
  });

  it('keeps a shared family surname attributed correctly', () => {
    // Doing the student first would leave "Maria [Student]" — the mother
    // reading as the child.
    const opts = { studentName: 'Sam Rivera', people: [{ name: 'Maria Rivera', role: 'Mother' }] };
    expect(scrubIdentifiers('Maria Rivera reports X; Sam Rivera was late.', opts))
      .toBe('[Mother] reports X; [Student] was late.');
  });

  it('uses a neutral token when a name part is ambiguous between people', () => {
    const opts = { studentName: 'Sam Rivera', people: [{ name: 'Maria Rivera', role: 'Mother' }] };
    expect(scrubIdentifiers('Rivera attended the meeting.', opts))
      .toBe('[NAME] attended the meeting.');
  });
});

describe('analyzeRedaction — discloses what redaction will NOT cover', () => {
  let analyzeRedaction;
  beforeAll(() => { analyzeRedaction = window.AlloReportWriterTesting.analyzeRedaction; });

  it('flags a missing student name — nothing is redacted by name', () => {
    const r = analyzeRedaction('Sam Rivera was evaluated.', {});
    expect(r.hasStudentName).toBe(false);
    expect(r.needsAttention).toBe(true);
  });

  it('reports common-word name parts left in the text', () => {
    const r = analyzeRedaction('Mark will mark it.', { studentName: 'Mark Hall' });
    expect(r.riskyNameParts).toContain('Mark');
    expect(r.needsAttention).toBe(true);
  });

  it('only reports risky parts that actually appear in the text', () => {
    const r = analyzeRedaction('The student was evaluated.', { studentName: 'Mark Hall' });
    expect(r.riskyNameParts).toEqual([]);
  });

  it('flags titled people the clinician never listed', () => {
    const r = analyzeRedaction('Dr. Patel and Ms. Alvarez attended.', { studentName: 'Sam Rivera' });
    expect(r.unlistedTitledNames).toEqual(expect.arrayContaining(['Patel', 'Alvarez']));
  });

  it('reports clean when a name is set and nothing risky is present', () => {
    const r = analyzeRedaction('The student was evaluated.', { studentName: 'Sam Rivera' });
    expect(r.needsAttention).toBe(false);
  });
});
