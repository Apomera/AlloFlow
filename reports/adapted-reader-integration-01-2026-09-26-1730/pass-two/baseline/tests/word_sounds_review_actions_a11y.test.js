// Row-action accessibility in the LIVE review panel (misc_components). The
// old version of this suite asserted word-specific labels and busy states on
// the setup FOSSIL deleted 2026-08-11 — meaning those guarantees held for UI
// nobody could reach, while the panel teachers actually used had a wall of
// identical "Play" buttons. The distractor labels are now item-specific in
// the live panel; the rest was already there and is pinned here.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('misc_components_source.jsx', 'utf8');

describe('Word Sounds review-row actions (live panel)', () => {
  it('names every distractor play button by its word, not a bare "Play"', () => {
    // Two sites (rhyme + blend rows); a screen-reader user hears which word
    // each of the forty buttons will speak.
    const named = source.match(/aria-label=\{\(t\('common\.play_tts'\) \|\| 'Play'\) \+ ': ' \+ d\}/g) || [];
    expect(named.length).toBe(2);
    // And no play button anywhere in the panel keeps the bare generic label
    // (CRLF-safe: exact-string match, not a line-anchored one).
    expect(source.match(/aria-label=\{t\('common\.play_tts'\)\}/g)).toBeNull();
  });

  it('exposes busy state on the word-level audio and image actions', () => {
    expect(source).toContain('aria-busy={playingWordIndex === idx');
    expect(source.match(/aria-busy=\{generatingImageIndex === idx\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('aria-busy={regeneratingIndex === idx}');
  });

  it('ties a failed regeneration to its row via aria-describedby', () => {
    expect(source).toContain("aria-describedby={reviewError?.index === idx ? 'word-sounds-review-error' : undefined}");
  });

  it('names the connected-text play buttons by what they play', () => {
    expect(source).toContain("aria-label={(t('common.play_tts') || 'Play') + ' — ' + line.label}");
  });
});
