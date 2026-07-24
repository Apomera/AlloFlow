import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('misc_components_source.jsx', 'utf8');
const built = readFileSync('misc_components_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/misc_components_module.js', 'utf8');

describe('Word Sounds review regeneration errors', () => {
  it('shows a persistent indexed alert associated with the triggering button', () => {
    expect(source).toContain('const [reviewError, setReviewError] = React.useState(null);');
    expect(source).toContain('id="word-sounds-review-error" role="alert"');
    expect(source).toContain("aria-describedby={reviewError?.index === idx ? 'word-sounds-review-error' : undefined}");
    expect(source).toContain('setReviewError({ index: idx, message:');
  });

  it('clears stale errors before invoking a valid regeneration callback', () => {
    expect(source).toContain('setReviewError(null);');
    expect(source.indexOf('setReviewError(null);')).toBeLessThan(source.indexOf('onRegenerateWord(idx);'));
    expect(source).not.toContain('else alert("Error: Regenerate function missing or invalid")');
  });

  it('keeps generated and deployed shared-component bundles synchronized', () => {
    expect(built).toBe(deployed);
    expect(built).toContain('word-sounds-review-error');
    expect(built).not.toContain('else alert("Error: Regenerate function missing or invalid")');
  });
});
