// Clinician free text leaving Dynamic Assessment for an AI provider.
//
// WHY: nearly everything DA sends is COMPUTED — scores, modifiability index,
// scaffold counts, construct tags — and carries no identifiers. The exception is
// clinician-authored prose. `session.sessionNote` reached five prompt builders
// (IEP goals, accommodations, family summary, teacher handoff, progress
// monitoring) verbatim, and also travelled into buildDaFactChunks, which hands
// evidence to Report Writer where it becomes a verified fact in ITS prompts.
// That is the back door: a note redacted in one tool but raw in the other.
//
// Redaction is shared with Report Writer via identifier_redaction_module.js so
// the two cannot drift. These tests pin BOTH directions: that identifiers are
// removed, and that the clinical substance a DA note exists to carry survives —
// over-scrubbing a note about scaffolding would destroy the thing being sent.

import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let DA;

beforeAll(() => {
  // Redaction must be registered before DA resolves it from window.AlloModules.
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('dynamic_assessment_module.js');
  // Pure fns are exposed on the existing _meta seam (see tests/dynamic_assessment.test.js).
  DA = window.AlloModules.DynamicAssessment._meta;
  if (!DA || typeof DA.promptSessionNote !== 'function') {
    throw new Error('DynamicAssessment redaction seam not exposed');
  }
});

const sessionWith = (note, nickname) => ({
  id: 'da-1',
  studentNickname: nickname === undefined ? 'Bluejay-7' : nickname,
  sessionNote: note,
  itemResults: [],
  sessionItemIds: []
});

describe('daPromptSessionNote — identifiers removed', () => {
  it('redacts a phone number', () => {
    const out = DA.promptSessionNote(sessionWith('Parent can be reached at 555-867-5309.'));
    expect(out).not.toContain('555-867-5309');
    expect(out).toContain('[PHONE]');
  });

  it('redacts an email address', () => {
    const out = DA.promptSessionNote(sessionWith('Follow up: parent@example.com'));
    expect(out).not.toContain('parent@example.com');
    expect(out).toContain('[EMAIL]');
  });

  it('redacts an SSN and a calendar date', () => {
    const out = DA.promptSessionNote(sessionWith('SSN 123-45-6789, meeting 3/14/2026.'));
    expect(out).toContain('[SSN]');
    expect(out).toContain('[DATE]');
  });

  it('redacts the student identifier when one is set', () => {
    const out = DA.promptSessionNote(sessionWith('Bluejay-7 tired near the end.', 'Bluejay-7'));
    expect(out).not.toContain('Bluejay-7');
    expect(out).toContain('[Student]');
  });

  it('returns empty string for an absent or blank note', () => {
    expect(DA.promptSessionNote(sessionWith(''))).toBe('');
    expect(DA.promptSessionNote(sessionWith('   '))).toBe('');
    expect(DA.promptSessionNote({})).toBe('');
  });

  it('bounds the note so one builder cannot ship more prose than another', () => {
    // 600 chars matches the evidence-chunk cap in buildDaFactChunks.
    const out = DA.promptSessionNote(sessionWith('x'.repeat(2000)));
    expect(out.length).toBeLessThanOrEqual(600);
  });
});

describe('daPromptSessionNote — PRESERVES clinical substance', () => {
  it('keeps scaffold levels, counts and durations intact', () => {
    const note = 'Needed L3 modeling on 4 of 6 items; sustained attention ~12 minutes.';
    expect(DA.promptSessionNote(sessionWith(note))).toBe(note);
  });

  it('keeps age and grade references', () => {
    const note = 'Reading at roughly a 2nd grade level; regression noted at 18 months.';
    expect(DA.promptSessionNote(sessionWith(note))).toBe(note);
  });

  it('keeps clinical prose untouched when it contains no identifiers', () => {
    const note = 'Responded well to visual organizers but not to verbal cues alone.';
    expect(DA.promptSessionNote(sessionWith(note))).toBe(note);
  });
});

describe('buildDaFactChunks — the Report Writer back door', () => {
  const noteWithPhone = 'Parent reached at 555-867-5309 about scheduling.';

  it('redacts the session note carried into cross-tool evidence', () => {
    const chunks = DA.buildDaFactChunks(sessionWith(noteWithPhone));
    const noteChunk = chunks.find(c => /clinician note/i.test(c.label || c.field || ''));
    expect(noteChunk).toBeTruthy();
    const value = JSON.stringify(noteChunk);
    expect(value).not.toContain('555-867-5309');
    expect(value).toContain('[PHONE]');
  });

  it('still emits the note chunk — redaction must not drop the evidence', () => {
    const chunks = DA.buildDaFactChunks(sessionWith('Needed L2 leading questions throughout.'));
    const noteChunk = chunks.find(c => /clinician note/i.test(c.label || c.field || ''));
    expect(noteChunk).toBeTruthy();
    expect(JSON.stringify(noteChunk)).toContain('L2 leading questions');
  });
});

describe('daScrubFreeText — fails safe without the shared module', () => {
  let saved;
  beforeAll(() => { saved = window.AlloModules.IdentifierRedaction; });

  it('still strips structured identifiers when redaction is unavailable', () => {
    window.AlloModules.IdentifierRedaction = undefined;
    try {
      const out = DA.scrubFreeText('Call 555-867-5309 or a@b.com on 3/14/2026.', { studentNickname: 'Bluejay-7' });
      expect(out).toContain('[PHONE]');
      expect(out).toContain('[EMAIL]');
      expect(out).toContain('[DATE]');
    } finally {
      window.AlloModules.IdentifierRedaction = saved;
    }
  });

  it('uses the shared module when it is present', () => {
    expect(window.AlloModules.IdentifierRedaction).toBeTruthy();
    expect(DA.scrubFreeText('Bluejay-7 was tired.', { studentNickname: 'Bluejay-7' })).toBe('[Student] was tired.');
  });
});
