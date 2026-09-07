# Survey and scheduling refinements — September 7, 2026

This pass follows the live activity review and addresses its remaining survey, availability, and sign-up surfaces. These are shared asynchronous assignments; their mailbox collection does not require the teacher to keep a live session open.

## Improvements

| Finding | Result |
| --- | --- |
| Saved survey answers, availability marks, names, and sign-up claims were not restored into the form. | Reopening now shows the respondent's saved data. Background refreshes update results without replacing edits in progress. |
| The three activity forms did not actually enter a busy state during writes or apply the returned saved summary. | Saves are serialized, controls are disabled while saving, confirmed results appear immediately, and failed requests retain the draft for retry. |
| Changing activities could retain scheduling names or selections; a delayed credential request could affect another mailbox. | Navigation clears form state and guards credentials, summaries, errors, and save completion against an obsolete activity instance. Concurrent joins within an instance share a request. |
| Availability and sign-up activities inherited word-cloud headings, anonymity claims, threshold panels, and moderation footers. | Each has its own title and badge. Identity and closing information describe the actual activity. Student and teacher instructions differ appropriately. |
| Sign-up selection was labeled as already owned before saving. Full-slot errors left capacity information stale. | Pending selections and confirmed reservations use distinct labels. Conflicts refresh capacity, preserve existing reservations, and explain whether no reservation was made. Respondents can deselect their own full slot and save a release. |
| Blank numeric survey bounds became zero, including when normalized server configuration was read again. | Authoring, the canonical survey schema, and mailbox normalization preserve unset limits. Explicit zero and fractional limits remain valid. |
| Survey validation relied on brief toasts, and default numeric input stepping could reject decimals. | Required and invalid answers produce persistent errors and focus the relevant control. Decimals are supported. Optional answers can be cleared. Choice labels expose scale descriptions, and choice buttons have larger touch targets. |
| Invalid authored choice questions were silently dropped from a survey. | Sharing stops with a question-specific message for insufficient choices or invalid/inverted numeric bounds. |

## Verification

- **154 checks passed across 10 focused suites**, covering mounted activity components, runtime extraction, mailbox surveys, schema conversions, source-bundle integrity, availability/sign-up contracts and adapters, and the previous live-activity regression suite. The final copy refinements passed an additional rerun of the 31 affected checks; those are included in the 154, not added to the total.
- Chromium exercised the actual Apps Script handlers with in-memory Google Cache, Properties, Drive, and Lock substitutes. Two student browser contexts and one teacher context verified survey restoration, decimal validation, failed-save retry, a competing slot claim, conflict recovery, reservation restoration/release, and availability restoration.
- Reopening did not add duplicate respondents. The final reservation total matched the successful claim and release operations. Browser page errors and horizontal document overflow were both absent.
- JavaScript syntax, host/app JSX parsing, scoped whitespace checks, and the runtime/backend public mirrors passed. Mailbox source bytes and SHA metadata match the updated script in the host sources and generated source bundles.

Reproduce the browser walkthrough with `node dev-tools/check_shared_activity_refinements.cjs`. Its Google-service substitutes are in `dev-tools/fixtures/shared_activity_mailbox.cjs`.

## Browser evidence

- [Mobile survey](shared-activity-refinements/mobile-survey.png)
- [Mobile slot conflict](shared-activity-refinements/mobile-slot-conflict.png)
- [Mobile availability](shared-activity-refinements/mobile-availability.png)
- [Teacher survey results](shared-activity-refinements/teacher-survey.png)
- [Machine-readable walkthrough results](shared-activity-refinements/browser-results.json)

## Release and scope

Changes are local. No site or backend was deployed. The numeric-bound correction requires redeploying the updated Class Mailbox script; its protocol version remains 20. The generated installer source and its validation metadata were synchronized.

Saved responses are restored from the mailbox. Unsubmitted edits survive refreshes and failed saves while the panel remains open; this pass does not add persistence for unsaved drafts after a full page reload. The browser test uses actual handlers but simulated Google services and locking, so it does not establish production network behavior or real concurrent Apps Script lock behavior. Physical-phone, screen-reader, shared-device respondent switching, and the full authoring-to-share-link flow remain useful follow-up checks.
