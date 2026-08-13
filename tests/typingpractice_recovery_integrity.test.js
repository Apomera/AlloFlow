import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'stem_lab/stem_tool_typingpractice.js');
const mirrorPath = path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const mirror = fs.readFileSync(mirrorPath, 'utf8');

function extractFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Function not found: ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

function compileFunction(name, bindings = {}) {
  return Function(
    ...Object.keys(bindings),
    'return (' + extractFunction(name) + ')'
  )(...Object.values(bindings));
}

const cloneBackupValue = compileFunction('typingPracticeCloneBackupValue');
const mergeKnownBackupFields = compileFunction('typingPracticeMergeKnownBackupFields', {
  typingPracticeCloneBackupValue: cloneBackupValue
});

const fixtureDefaults = {
  view: 'menu',
  currentDrill: null,
  interruptedDrill: null,
  sessions: [],
  studentName: '',
  accommodations: { reducedMotion: false, showKeyboard: true, errorTolerant: false },
  passagePrefs: { gradeLevel: '2-3', topic: '', difficulty: 'on-level', language: 'en', length: 'medium' },
  lifetime: { totalSessions: 0, totalCharsTyped: 0, abandonments: 0 },
  aiHintDismissed: { story: false, prompt: false },
  battle: {
    view: 'menu',
    mode: 'solo',
    personalBest: { cleared: 0, longestStreak: 0, durationSec: 0 },
    personalBestVsBot: { wins: 0, losses: 0, ties: 0 }
  },
  personalBest: {},
  aggregateErrors: {},
  visualGallery: [],
  customDrillLibrary: [],
  customDrill: null
};

const normalizeBackupState = compileFunction('typingPracticeNormalizeBackupState', {
  DEFAULT_STATE: fixtureDefaults,
  typingPracticeValidateBackupState: () => ({ sessions: 0, passages: 0, customDrills: 0, visualImages: 0 }),
  typingPracticeCloneBackupValue: cloneBackupValue,
  typingPracticeMergeKnownBackupFields: mergeKnownBackupFields
});

const graphemes = value => Array.from(String(value || ''));
const usableDraft = compileFunction('typingPracticeUsableInterruptedDraft', {
  typingPracticeGraphemes: graphemes
});
const draftMatches = compileFunction('typingPracticeInterruptedDraftMatches', {
  typingPracticeUsableInterruptedDraft: usableDraft
});
const draftConflicts = compileFunction('typingPracticeInterruptedDraftConflicts', {
  typingPracticeUsableInterruptedDraft: usableDraft,
  typingPracticeInterruptedDraftMatches: draftMatches
});
const buildDraft = compileFunction('typingPracticeBuildInterruptedDraft', {
  typingPracticeCloneBackupValue: cloneBackupValue
});

describe('Typing Practice recovery integrity', () => {
  it('builds lifecycle checkpoints from the newest snapshot and clones mutable details', () => {
    const latestSnapshot = {
      view: 'drill',
      drillComplete: false,
      isWarmup: false,
      activeDrillId: 'home-row',
      drillRunId: 8,
      typed: 'asdf',
      typedLength: 4,
      target: 'asdf jkl;',
      targetLength: 9,
      errorCount: 3,
      errorChars: { j: 2, k: 1 },
      startTime: 1_000,
      pausedMs: 500,
      pauseStartedAt: 9_500,
      inputMethods: { keyboard: 4, ime: 1 }
    };

    const saved = buildDraft(latestSnapshot, 'pagehide', 10_000);
    expect(saved).toMatchObject({
      drillId: 'home-row',
      drillRunId: 8,
      typed: 'asdf',
      errorCount: 3,
      errorChars: { j: 2, k: 1 },
      inputMethods: { keyboard: 4, ime: 1 },
      pausedMs: 1_000,
      reason: 'pagehide',
      savedAt: '1970-01-01T00:00:10.000Z'
    });

    latestSnapshot.errorChars.j = 99;
    latestSnapshot.inputMethods.keyboard = 99;
    expect(saved.errorChars.j).toBe(2);
    expect(saved.inputMethods.keyboard).toBe(4);
    expect(buildDraft({ ...latestSnapshot, isWarmup: true }, 'pagehide', 10_000)).toBeNull();
    expect(buildDraft({ ...latestSnapshot, drillComplete: true }, 'pagehide', 10_000)).toBeNull();
  });

  it('normalizes a sparse legacy backup instead of retaining the current learner', () => {
    const legacyBackup = {
      studentName: 'Backup learner',
      sessions: [{ date: '2026-01-01T00:00:00.000Z', wpm: 17 }],
      accommodations: { reducedMotion: true },
      passagePrefs: { topic: 'volcanoes' },
      battle: { mode: 'vs-bot', personalBest: { cleared: 4 } },
      unknownFutureField: 'do not import'
    };

    const restored = normalizeBackupState(legacyBackup);
    expect(Object.keys(restored).sort()).toEqual(Object.keys(fixtureDefaults).sort());
    expect(restored.studentName).toBe('Backup learner');
    expect(restored.sessions).toEqual(legacyBackup.sessions);
    expect(restored.sessions).not.toBe(legacyBackup.sessions);
    expect(restored.interruptedDrill).toBeNull();
    expect(restored.visualGallery).toEqual([]);
    expect(restored.customDrillLibrary).toEqual([]);
    expect(restored.accommodations).toEqual({ reducedMotion: true, showKeyboard: true, errorTolerant: false });
    expect(restored.passagePrefs).toEqual({
      gradeLevel: '2-3', topic: 'volcanoes', difficulty: 'on-level', language: 'en', length: 'medium'
    });
    expect(restored.battle).toEqual({
      view: 'menu',
      mode: 'vs-bot',
      personalBest: { cleared: 4, longestStreak: 0, durationSec: 0 },
      personalBestVsBot: { wins: 0, losses: 0, ties: 0 }
    });
    expect(restored).not.toHaveProperty('unknownFutureField');
    expect(restored.view).toBe('menu');
    expect(restored.currentDrill).toBeNull();
  });

  it('distinguishes an exact resume from a conflicting partial draft', () => {
    const draft = {
      drillId: 'home-row',
      drillRunId: 4,
      typed: 'asd',
      target: 'asdf jkl;'
    };
    expect(usableDraft(draft)).toBe(true);
    expect(draftMatches(draft, 'home-row', 4)).toBe(true);
    expect(draftConflicts(draft, 'home-row', 4)).toBe(false);
    expect(draftConflicts(draft, 'top-row', 5)).toBe(true);
    expect(usableDraft({ ...draft, typed: draft.target })).toBe(false);
    expect(draftConflicts({ ...draft, typed: '' }, 'top-row', 5)).toBe(false);
  });

  it('uses the latest-value ref for input, autosave, and page lifecycle saves', () => {
    const inputStart = source.indexOf('var commitTypingText = useCallback');
    const inputEnd = source.indexOf('var removeLastTypedCharacter = useCallback', inputStart);
    const inputBlock = source.slice(inputStart, inputEnd);
    expect(inputBlock.indexOf('latestDrillSnapshotRef.current =')).toBeGreaterThan(-1);
    expect(inputBlock.indexOf('latestDrillSnapshotRef.current =')).toBeLessThan(inputBlock.indexOf('setTyped(result.typed)'));
    expect(source).toContain("snapshot = Object.assign({}, snapshot, {\n            inputMethods:");
    expect(source).toContain("saveInterruptedDrill('pagehide')");
    expect(source).toContain('typedLength, errorCount, paused, startTime, drillComplete');
  });

  it('requires an explicit, accessible replacement decision before fresh capture', () => {
    expect(source).toContain('var beginPreparedDrill = async function(requestedUpdates)');
    expect(source).toContain("title: 'Replace saved practice?'");
    expect(source).toContain("confirmText: 'Replace draft and start'");
    expect(source).toContain("cancelText: 'Keep saved draft'");
    expect(source).toContain('if (hasConflict && !isWarmup)');
    expect(source).toContain('updates.interruptedDrill = null');
    expect(source).toContain("beginPreparedDrill({ view: 'drill' });");
    expect(source).toContain("beginPreparedDrill({ view: 'drill', currentDrill: s.drillId });");

    const warmupBranch = source.indexOf('if (isWarmup) {', source.indexOf('// Handle drill completion'));
    const matchingCleanup = source.indexOf("upd('interruptedDrill', null);", warmupBranch);
    expect(warmupBranch).toBeGreaterThan(-1);
    expect(matchingCleanup).toBeGreaterThan(warmupBranch);
    expect(source.slice(matchingCleanup - 240, matchingCleanup)).toContain('interruptedDraftMatches');
  });

  it('atomically replaces records and invalidates prior learner async work', () => {
    expect(source).toContain('next.typingPractice = nextToolState');
    expect(source).toContain('replaceTypingPracticeState(restoredState)');
    expect(source).toContain('resetTypingPracticeLocalLearnerState(restoredState)');
    expect(source).not.toContain('if (parsed.state.hasOwnProperty(k)) updates[k] = parsed.state[k]');
    expect(source).toContain("Number(parsed._version) !== 1");
    expect(source).toContain('passageGenerationRef.current += 1');
    expect(source).toContain('imageGenerationRef.current += 1');
    expect(source).toContain('imageGenerationRef.current !== imageGenerationId');
    expect(source).toContain('json.length > MAX_BACKUP_FILE_CHARS');
  });

  it('keeps the deployed mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });
});
