// Regeneration errors in the LIVE review panel (misc_components — the setup
// fossil this suite used to scan was deleted 2026-08-11). The invariant is
// unchanged: a failed regeneration surfaces as a persistent indexed alert
// tied to the button that triggered it, never a native alert().
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('misc_components_source.jsx', 'utf8');
const built = readFileSync('misc_components_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/misc_components_module.js', 'utf8');

describe('Word Sounds review regeneration errors', () => {
  it('renders an indexed persistent alert associated with the triggering button', () => {
    expect(source).toContain('const [reviewError, setReviewError] = React.useState(null);');
    expect(source).toContain('id="word-sounds-review-error" role="alert"');
    expect(source).toContain("aria-describedby={reviewError?.index === idx ? 'word-sounds-review-error' : undefined}");
    expect(source).toContain('setReviewError({ index: idx, message:');
  });

  it('clears stale errors and never falls back to a native alert', () => {
    expect(source).toContain('setReviewError(null);');
    expect(source).not.toContain('alert("Error: Regenerate function missing or invalid")');
  });

  it('keeps generated and deployed modules synchronized', () => {
    expect(built).toBe(deployed);
    expect(built).toContain('word-sounds-review-error');
  });
});
