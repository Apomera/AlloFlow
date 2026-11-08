// Word Sounds setup (2026-11-08): when Start is unavailable the reason sits under it, the button is described by
// it, and the reason opens the part of setup that needs attention. On narrow screens a bar pinned to the bottom of
// the dialog holds Start and the reason, and the in-pane Start shows only on wide screens.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const STRINGS = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds;
const DATA = readFileSync('allo_data_source.jsx', 'utf8');

describe('why Start is unavailable', () => {
  it('shared helpers jump to the count review or the recordings', () => {
    expect(SRC).toMatch(/const jumpToCountReview = \(\) => \{ setCountReviewOpen\(true\);[^\n]*countReviewRegion\.current/);
    expect(SRC).toMatch(/const jumpToRecordings = \(\) => \{ setRecordingReviewOpen\(true\);[^\n]*recordingReviewRegion\.current/);
    expect(SRC).toContain('onClick={jumpToCountReview}');
    expect(SRC).toContain('onClick={jumpToRecordings}');
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
    expect(SRC).toContain('{(!includeLessonPlan || syllableCountingSelected || syllableBlendingSelected) && <span className="block text-xs text-slate-600">{countInfo.supported');
  });
  it('has its strings in both string files', () => {
    for (const key of ['start_blocked_words', 'start_blocked_counts_one', 'start_blocked_counts', 'start_blocked_recordings', 'words_selected_count']) {
      expect(typeof STRINGS[key], key).toBe('string');
      expect(DATA, key).toContain("'word_sounds." + key + "'");
    }
  });
});
