// Word Sounds setup (2026-11-08): when Start is unavailable the reason sits under it, the button is described by
// it, and the reason opens the part of setup that needs attention. On narrow screens a bar pinned to the bottom of
// the dialog holds Start and the reason, and the in-pane Start shows only on wide screens.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const STRINGS = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds;
const DATA = readFileSync('allo_data_source.jsx', 'utf8');

describe('why Start is unavailable', () => {
  // 2026-11-10: syllable words are no longer a reason. Start waits only for a word, for a lesson activity that
  // can run, or (assessment) for a syllable skill that has a word to ask. The count review and the recording
  // editor open from each syllable activity's own line (tests/word_sounds_syllable_topup.test.js).
  it('syllable counts and recordings are not reasons; their editors open from the plan line', () => {
    expect(SRC).toContain('const startBlocked = !isProcessing && (selectedIndices.size === 0 || lessonPlanEmpty || assessmentSkipped);');
    const reason = SRC.slice(SRC.indexOf('const startBlockedReason = (className) =>'), SRC.indexOf('const previewPreparedActivities'));
    expect(reason).toContain("tf('word_sounds.start_blocked_words', 'Select at least one word.')");
    expect(reason).toContain('onClick={jumpToLessonActivities}');
    expect(reason).not.toMatch(/unreviewedSyllableCountWords|unsupportedSyllableWords|start_blocked_counts|start_blocked_recordings/);
    expect(SRC).not.toMatch(/jumpToCountReview|jumpToRecordings/);
    expect(SRC).toMatch(/if \(opening && activity === 'syllable_counting'\) setCountReviewOpen\(true\);/);
    expect(SRC).toMatch(/if \(opening && activity === 'syllable_blending'\) setRecordingReviewOpen\(true\);/);
    expect(SRC).toContain('{syllableCountingSelected && syllablePlanOpen.syllable_counting && <details ref={countReviewRegion}');
    expect(SRC).toContain('{syllableBlendingSelected && syllablePlanOpen.syllable_blending && <details ref={recordingReviewRegion}');
  });
  it('wide screens: the reason sits under the in-pane Start, which it describes', () => {
    expect(SRC).toContain('<div className="hidden lg:flex flex-col items-end gap-1">');
    expect(SRC).toContain("aria-describedby={startBlocked ? 'ws-start-blocked' : undefined}");
    expect(SRC).toMatch(/\{startBlocked && <p id="ws-start-blocked"[^\n]*data-ws-start-blocked="true">\n\s*\{startBlockedReason\(/);
  });
  it('narrow screens: one pinned bar with Start and the reason', () => {
    const at = SRC.indexOf('data-ws-start-bar="true"');
    expect(at).toBeGreaterThan(0);
    const bar = SRC.slice(at - 200, at + 1800);
    expect(bar).toContain('lg:hidden');
    expect(bar).toContain("aria-describedby={startBlocked ? 'ws-start-blocked-bar' : undefined}");
    expect(bar).toContain('onClick={handleStart}');
    expect(bar).toContain('startBlockedReason(');
  });
  it('word cards mention syllable counts only when a syllable activity can run', () => {
    // 2026-11-10 (plan first): only a saved lesson without a plan (all activities) still shows them unasked.
    expect(SRC).toContain('const showCount = (!isAssessmentSetup && !includeLessonPlan) || syllableCountingSelected || syllableBlendingSelected;');
    expect(SRC).toContain('{showCount && <span className="block text-xs text-slate-600" data-ws-chip-syllables={countInfo.supported ? countInfo.count : \'review\'}>{countInfo.supported');
  });
  it('has its strings in both string files', () => {
    // The three syllable reasons (start_blocked_counts_one, start_blocked_counts, start_blocked_recordings) are no longer used.
    for (const key of ['start_blocked_words', 'words_selected_count']) {
      expect(typeof STRINGS[key], key).toBe('string');
      expect(DATA, key).toContain("'word_sounds." + key + "'");
    }
  });
});
