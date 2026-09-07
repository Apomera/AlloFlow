# Alloflow export and Document Builder review

Reviewed and refined locally on September 6, 2026. Runtime copies are synchronized; no deployment was performed.

## Findings fixed

| Area | Finding | Result |
| --- | --- | --- |
| Export content fidelity | The shared preview exporter required more than 200 characters or a specific container. A short paragraph, standalone image, or small table could be replaced with older lesson history. | Export the current preview regardless of length, including visual content. Empty and failed previews stop with an actionable message instead of reviving history. History fallback remains available when no preview exists. |
| Editing continuity | Export changed the live document's design mode even though serialization uses a clone. | Export leaves the editor's mode unchanged, including failure paths. |
| Draft recovery | The recovery banner's Dismiss action removed the stored draft and its version history. | Dismiss hides the reminder and preserves recovery data. |
| Export coordination | Primary exports and alternative formats used separate busy checks, allowing overlapping jobs. | Office, package, NotebookLM, ePub, Braille, and the primary export share a synchronous lock. Additional format controls are disabled while an export runs. |
| Package completion | The IMS path ignored a handler's false result and could call the success callback anyway. | Failed IMS exports do not report success; the lock is released on both failure and completion. |
| Progress and discovery | The primary button retained its ordinary label while preparing an export. Alternative formats were labeled only Alt Formats. | A visible Preparing export label and live status explain the work in progress. More export formats provides clearer discovery. |
| Keyboard and mobile UI | The alternative-format list could extend off a narrow screen. Escape could reach the parent builder's close handler. | The menu becomes a scrollable panel within the mobile viewport. Escape closes it and restores focus to its summary. The builder focus loop includes summaries and excludes controls disabled through a fieldset. |
| Preview initialization | The standalone preview writer called editorPageCss, which existed only inside the React component. The resulting exception interrupted editor setup. | Page styling uses a shared helper, including the iframe's saved page size and orientation. |

## Validation

- Focused suite: 273 tests exercised across 26 files. The initial final run passed 272 and exposed one stale host-function signature locator. Updating that locator and rerunning its complete five-test suite passed. Its original behavior assertions remain intact.
- Thirteen new behavioral regressions cover short/visual exports, blank/error handling, edit-mode preservation, draft retention, export locking, IMS failure, and regenerated landscape page styling.
- Isolated Chromium rendering of the actual compiled builder component at 1280 x 900 and 390 x 844 produced no page errors. Verified Escape/focus restoration, disabled competing exports, progress UI, and initialized editor page styling.
- Mobile menu bounds after correction: x=16 to x=374 in a 390-pixel viewport. Desktop and mobile screenshots were visually inspected.
- Root and desktop/public runtime files are byte-identical. Diff whitespace checks passed.
- The compiled scope scan reports only NodeFilter, a browser-provided global. Source-only scans additionally see the wrapper-injected icons; the actual out-of-scope page-style reference was repaired.

The browser fixture supplies sample content and a controlled pending export callback. It validates builder interaction and rendering; it does not validate opening downloaded Office, ePub, or Braille artifacts in their destination applications.

## Remaining opportunities

1. **Consolidate export snapshots and checks.** Primary, Office, Markdown, ePub, Braille, and package paths still prepare content separately. A common immutable document snapshot and format capability model would reduce drift in edit preservation, review markup stripping, preflight, and progress handling. Keep structured assessment exports explicitly distinguished from live-document exports.
2. **Unify international filenames.** The builder's generic blob downloader still reduces titles to ASCII letters and digits, while the shared HTML filename helper preserves Unicode and handles reserved names. Reusing one filename policy would produce more useful downloads for multilingual documents.
3. **Distinguish browser handoff from completion.** Download clicks and the print dialog confirm handoff, not that a file reached disk or printing succeeded. Consistent completion language and a retry action would make this clearer across formats.
4. **Expand destination-application checks.** Preserve the existing golden export tests and add representative reader/editor round trips for long tables, multilingual and right-to-left content, images, tracked changes, and unsupported interactions. Braille and assistive-technology quality need direct reader/device validation.
5. **Reduce mobile setup scrolling.** Settings currently stack above the preview. A collapsible settings section or explicit Edit / Layout / Export navigation would bring the document into view sooner on phones. This should be evaluated with real teacher tasks before a broader layout change.

## Evidence

- `reports/builder-export-review-2026-09-06/browser-results.json`
- `reports/builder-export-review-2026-09-06/builder-export-desktop.png`
- `reports/builder-export-review-2026-09-06/builder-export-mobile.png`
- `reports/builder-export-review-2026-09-06/test-results.json` (initial 272/273 result)
- `reports/builder-export-review-2026-09-06/advanced-review-test-results.json` (corrected locator, 5/5)
- `reports/builder-export-review-2026-09-06/browser-smoke.cjs` (reproducible isolated component check)
