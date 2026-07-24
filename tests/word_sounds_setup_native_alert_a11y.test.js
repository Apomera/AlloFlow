import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const built = readFileSync('word_sounds_setup_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/word_sounds_setup_module.js', 'utf8');

describe('Word Sounds setup review regeneration errors', () => {
  it('renders an indexed persistent alert associated with the triggering button', () => {
    expect(source).toContain('const [reviewError, setReviewError] = React.useState(null);');
    expect(source).toContain('id="word-sounds-setup-review-error" role="alert"');
    expect(source).toContain("aria-describedby={reviewError?.index === idx ? 'word-sounds-setup-review-error' : undefined}");
    expect(source).toContain('setReviewError({ index: idx, message:');
  });

  it('clears stale errors and removes the native alert fallback', () => {
    expect(source).toContain('setReviewError(null);');
    expect(source).not.toContain('else alert("Error: Regenerate function missing or invalid")');
  });

  it('keeps generated and deployed setup modules synchronized', () => {
    expect(built).toBe(deployed);
    expect(built).toContain('word-sounds-setup-review-error');
    expect(built).not.toContain('else alert("Error: Regenerate function missing or invalid")');
  });
});
