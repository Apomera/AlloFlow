# Reading review and recovery refinement - 2026-09-04

This follows the shorter reading-path change. It is implemented locally, with no deployment.

## Behavior

- Guided result previews now read adapted text stored as a string in data, or in data.simplifiedText, data.text, and the existing content fields. They render as escaped text.
- Preview selection requires a Guided-created resource ID or a matching result newly received on the active step. Missing tracking IDs no longer cause the banner to show an unrelated older lesson.
- A newly generated result can appear immediately while the host registers its Guided ID on a subsequent render.
- Reading results include a reminder to compare facts, vocabulary, and the learning goal with the original. Open result uses the existing review/edit view and is disabled while generation is busy.
- Recovery guidance distinguishes access/key problems, quota exhaustion, temporary rate limits, and connectivity/timeouts. A generic message containing "generate" no longer gets misclassified as a rate limit.
- Review settings opens the existing settings panel. Retry is shown only if the host supplies a retry action. No automatic retries or provider changes were added.
- If a retry fails while an earlier result remains, the labels distinguish "Saved result available" from "This attempt did not finish."

## Validation and scope

- 127 tests across six Guided Mode files, including 16 additional regression cases for this refinement. Results: reports/classroom-review-2026-09-04/reading-review-regression.json.
- An isolated browser host mounts the real built GuidedModeBanner and GuidedModeConfig. It checks the first-use flow, reading previews, opening the correct resource, settings by keyboard, explicit retry, exclusion of old lesson results, generic error guidance, and 390px mobile width.
- A focused axe scan covers the result preview and error controls. Results: reading-review-axe.json; browser results: reading-review-browser.json; visual evidence: reading-review-mobile.png in the same report directory.
- Generated source/public mirrors are synchronized. Existing unrelated edits were retained.

This does not validate the full application's live AI calls, project persistence, exported artifacts, or classroom usability. English copy and localization fallbacks are updated; new translations are not included. Existing completion and saved-progress formats are unchanged.
