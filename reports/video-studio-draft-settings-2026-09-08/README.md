# Video Studio: per-take export settings

Completed September 8, 2026. Changes are local; nothing was deployed.

Each take now retains its title, export preset, format, framing, container, title and closing cards, demo transition, and caption appearance in its local draft. Switching takes and recovering drafts restores those choices. New takes start without the previous video's title or closing message. Templates also save their programmatic changes. Empty titles remain empty; export filenames fall back to the take name.

Generated demo defaults initialize once. Revisiting a demo no longer overwrites manual title/card changes. Stored settings are explicitly allowlisted, checked against current select options, and text lengths are bounded. Review acknowledgements and transient template selections are excluded. The new persistence is for local drafts; this pass does not add export settings to portable .allopack bundles.

Validation:

- 223 existing Vitest checks passed (vitest.log).
- Browser regression covers two independent drafts, all stored output choices, reload/recovery, templates, older demo drafts, invalid stored values, cleared titles, and an actual downloaded WebM named from the recovered title (verify-browser.cjs, results.json).
- Automated tutorial recording, quality checks, and narration recovery passed: 1 Playwright test (autopilot.log).
- Desktop and 390px mobile screenshots captured; mobile screenshot visually inspected, with no horizontal overflow.
- Standalone and desktop HTML copies match exactly.
- Scoped git diff whitespace check passed. An unrelated pre-existing trailing blank line was reported by the whole-workspace check and left untouched.

Source SHA-256: 0eaa228f83afb857fde854bf92d502fd383e21fbae9cfd166b31eb91cc7ada6a
