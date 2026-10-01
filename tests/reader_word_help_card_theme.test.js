import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The word-help card that opens from the passage is a non-modal dialog with
// bg-white. A global rule forces [role="dialog"].bg-white to #fff inside reading
// themes, and the reader's own surface rule matched only aria-modal dialogs, so
// in the dark theme the card was near-white text on white (explanation 1.05:1,
// measured in a real browser, 2026-09-27). The reader rules now name the card.
const RULE = '.allo-docsuite [data-reading-theme] [data-adapted-reader] :is([role="dialog"][aria-modal="true"], [data-word-help-card])';

describe('word-help card theme', () => {
  it.each(['app_styles_source.jsx', 'app_styles_module.js', 'desktop/web-app/public/app_styles_module.js'])('%s gives the card the reader surface and ink', file => {
    const css = readFileSync(file, 'utf8');
    const surface = css.indexOf(RULE + ' {');
    expect(surface).toBeGreaterThan(-1);
    expect(css.slice(surface, surface + 300)).toMatch(/background-color: var\(--adapted-surface\) !important;\s*color: var\(--adapted-ink\) !important;/);
    expect(css).toContain(RULE + ' :where(div, span, p, section)[class*="bg-"]');
    // The global white-dialog rule is less specific (0,3,0 vs 0,5,0), so the reader rule wins.
    expect(css).toContain('[data-reading-theme] [role="dialog"].bg-white,');
  });

  it('the card carries the attribute those rules select, inside the reader', () => {
    const view = readFileSync('view_simplified_source.jsx', 'utf8');
    // The card's opening tag runs from its key to its first child (the picture).
    const start = view.indexOf('<div key={wordHelpCard.audioIds.word} ref={wordHelpCardRef}');
    expect(start).toBeGreaterThan(-1);
    const card = view.slice(start, view.indexOf('data-word-help-card-picture', start));
    expect(card).toContain('role="dialog"');
    expect(card).toContain('data-word-help-card');
    expect(card).toContain('bg-white');
  });
});
