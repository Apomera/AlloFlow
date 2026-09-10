# Rendered comparison bug fixes

Fixed review findings 6, 7, 8, 9, and 12. Text checkpoints paired with visibility or exposure now retain descendant word evidence, display:contents text respects ancestor opacity, selected options retain index/value/label identity, relative links preserve their literal reference, and only requested observations are bounded.

Positive controls cover safe rewrapping, restoring whole and partial hidden content, duplicate-valued selections without a choice change, unchanged relative links, native absolute URL normalization, and large unrequested text/name fields. Existing DOM text preservation remains exact; additions of previously hidden words are allowed only when existing words remain in order.

Validation: **67 Chromium tests and 30 unit tests passed**. The browser suite includes 22 new regressions/controls and the existing corpus, rendering profiles, evidence, and recovery checks. Final implementation SHA-256: `c8310dbf87f169b8c84534ebd86ee887685bf6b2e8b37b78c0483331938818cb`.

- [Browser results](final-browser.json)
- [Unit results](final-unit.json)
- [Machine-readable summary](summary.json)

These are local synthetic checks, not human screen-reader acceptance. Original review evidence was preserved.
