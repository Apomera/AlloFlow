import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Lingua;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [value, () => {}],
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('lingua_practice_module.js');
  Lingua = window.AlloModules.LinguaPractice;
  if (!Lingua) throw new Error('LinguaPractice did not register');
});

function helper(name) {
  const value = Lingua && Lingua[name];
  expect(typeof value, `${name} must be exported for the pronunciation confirmation contract`).toBe('function');
  return value;
}

function sourceInput(overrides = {}) {
  return {
    language: 'French',
    practiceSetId: 'set-cafe',
    assignmentId: 'assignment-cafe',
    assignmentRevision: 3,
    target: 'Je voudrais un caf\u00e9, s\u2019il vous pla\u00eet.',
    ...overrides,
  };
}

function stagedAttempt(sourceId) {
  const privateTranscript = 'PRIVATE RAW RECOGNIZER TRANSCRIPT';
  return {
    attemptId: 'capture-17',
    transcript: privateTranscript,
    recognizer: { engine: 'web-speech', confidence: 0.37, privateAudioHandle: 'PRIVATE AUDIO HANDLE' },
    evidence: {
      id: 'pronunciation-1700000000000-capture-17',
      kind: 'transcript-evidence-v1',
      language: 'French',
      practiceSetId: 'set-cafe',
      assignmentId: 'assignment-cafe',
      assignmentRevision: 3,
      sourceId,
      coverage: 75,
      precision: 60,
      transcriptMatch: 71,
      matchedUnits: 3,
      totalUnits: 4,
      unit: 'word',
      focusUnits: ['caf\u00e9'],
      evidenceLevel: 'transcript-only',
      at: 1700000000000,
      transcript: privateTranscript,
      rawTranscript: privateTranscript,
      recognizer: { engine: 'web-speech', confidence: 0.37, privateAudioHandle: 'PRIVATE AUDIO HANDLE' },
      expectedUnits: [{ text: privateTranscript, status: 'not-heard' }],
      heardExtras: [privateTranscript],
    },
  };
}

function baselineProgress() {
  return Lingua._normalizeProgress({
    saved: [],
    spokenAttempts: 4,
    languageStats: {
      French: {
        practiceSets: 0,
        formAttempts: 0,
        spokenAttempts: 4,
        listeningAttempts: 0,
        reviews: 0,
        chatTurns: 0,
        lastPracticedAt: 1600000000000,
      },
    },
    activityLog: [],
    pronunciationEvidence: [],
  });
}

describe('Lingua verified transcript-attempt contract', () => {
  it('uses a stable source identity that survives phrase reordering and isolates assignment scope', () => {
    const pronunciationSourceId = helper('_pronunciationSourceId');
    const phrases = [
      { target: 'Bonjour, comment allez-vous ?' },
      { target: sourceInput().target },
      { target: 'Merci et bonne journ\u00e9e.' },
    ];
    const before = pronunciationSourceId(sourceInput({ target: phrases[1].target }));
    const reordered = [phrases[2], phrases[0], phrases[1]];
    const after = pronunciationSourceId(sourceInput({
      target: reordered.find((phrase) => phrase.target.includes('caf\u00e9')).target,
    }));

    expect(after).toBe(before);
    expect(pronunciationSourceId(sourceInput({ practiceSetId: 'set-bakery' }))).not.toBe(before);
    expect(pronunciationSourceId(sourceInput({ assignmentId: 'assignment-bakery' }))).not.toBe(before);
    expect(pronunciationSourceId(sourceInput({ assignmentRevision: 4 }))).not.toBe(before);
    expect(pronunciationSourceId(sourceInput({ language: 'Canadian French' }))).not.toBe(before);
    expect(before).toMatch(/^[a-zA-Z0-9._:-]+$/);
    expect(before.length).toBeGreaterThan(0);
    expect(before.length).toBeLessThanOrEqual(120);
  });

  it('commits one staged derived-evidence attempt exactly once', () => {
    const pronunciationSourceId = helper('_pronunciationSourceId');
    const commitPronunciationAttempt = helper('_commitPronunciationAttempt');
    const base = baselineProgress();
    const baseSnapshot = JSON.stringify(base);
    const staged = stagedAttempt(pronunciationSourceId(sourceInput()));

    const first = commitPronunciationAttempt(base, staged, 'keep');
    expect(first).toMatchObject({ committed: true });
    expect(first.progress).not.toBe(base);
    expect(JSON.stringify(base)).toBe(baseSnapshot);
    expect(first.progress.spokenAttempts).toBe(5);
    expect(first.progress.languageStats.French.spokenAttempts).toBe(5);
    expect(first.progress.languageStats.French.lastPracticedAt).toBe(1700000000000);
    expect(first.progress.pronunciationEvidence).toHaveLength(1);
    expect(first.progress.pronunciationEvidence[0]).toMatchObject({
      id: staged.evidence.id,
      sourceId: staged.evidence.sourceId,
      evidenceLevel: 'transcript-only',
      practiceSetId: 'set-cafe',
      assignmentId: 'assignment-cafe',
      assignmentRevision: 3,
    });
    const speechEvents = first.progress.activityLog.filter((item) => item.kind === 'spokenAttempts');
    expect(speechEvents).toEqual([
      expect.objectContaining({
        language: 'French',
        count: 1,
        at: 1700000000000,
        practiceSetId: 'set-cafe',
        assignmentId: 'assignment-cafe',
        assignmentRevision: 3,
      }),
    ]);

    const duplicate = commitPronunciationAttempt(first.progress, staged, 'keep');
    expect(duplicate).toMatchObject({ committed: false });
    expect(duplicate.progress).toBe(first.progress);
    expect(duplicate.progress.spokenAttempts).toBe(5);
    expect(duplicate.progress.languageStats.French.spokenAttempts).toBe(5);
    expect(duplicate.progress.activityLog.filter((item) => item.kind === 'spokenAttempts')).toHaveLength(1);
    expect(duplicate.progress.pronunciationEvidence).toHaveLength(1);
  });

  it('treats discard, absent staging, and unknown decisions as strict no-ops', () => {
    const pronunciationSourceId = helper('_pronunciationSourceId');
    const commitPronunciationAttempt = helper('_commitPronunciationAttempt');
    const base = baselineProgress();
    const staged = stagedAttempt(pronunciationSourceId(sourceInput()));

    [
      commitPronunciationAttempt(base, staged, 'discard'),
      commitPronunciationAttempt(base, null, 'keep'),
      commitPronunciationAttempt(base, staged, 'unexpected-decision'),
    ].forEach((result) => {
      expect(result).toEqual({ progress: base, committed: false });
      expect(result.progress).toBe(base);
    });
  });

  it('never serializes a raw transcript, recognition object, or private audio metadata', () => {
    const pronunciationSourceId = helper('_pronunciationSourceId');
    const commitPronunciationAttempt = helper('_commitPronunciationAttempt');
    const staged = stagedAttempt(pronunciationSourceId(sourceInput()));
    const result = commitPronunciationAttempt(baselineProgress(), staged, 'keep');
    const serialized = JSON.stringify(result.progress);

    expect(result.committed).toBe(true);
    expect(serialized).not.toContain('PRIVATE RAW RECOGNIZER TRANSCRIPT');
    expect(serialized).not.toContain('PRIVATE AUDIO HANDLE');
    expect(serialized).not.toContain('rawTranscript');
    expect(serialized).not.toContain('recognizer');
    expect(serialized).not.toContain('expectedUnits');
    expect(serialized).not.toContain('heardExtras');
  });
});
