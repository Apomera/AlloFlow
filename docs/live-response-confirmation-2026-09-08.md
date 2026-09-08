# Live session delivery and UI refinements

Reviewed September 7–8, 2026. Follow-up to [the live activity review](live-activity-review-2026-09-07.md).

## Changes implemented

| Area | Improved behavior |
| --- | --- |
| Teacher receipt confirmation | Updated live polls distinguish waiting for confirmation, unconfirmed delivery, and teacher receipt. Drafts clear only after the teacher accepts the response. |
| Safe retries | A retry reuses the original request ID. If the teacher accepted a response but its acknowledgement was lost, retry confirms that result without counting it twice, including after a pause. Invalid, closed, and paused submissions receive a rejection instead of a success message. |
| Reconnect recovery | Each reconnecting student receives only their own latest confirmed response, delivered feedback, and outstanding private check-in. Newer revision drafts, including intentionally empty drafts, remain editable. |
| Connection controls | Offline guidance explains automatic reconnection. Duplicate failure events no longer consume extra retry attempts, recovered connections cancel queued retries, and exhausted automatic retries expose a manual retry action. |
| Download fallback | Downloads retain the response and revision attempt. A button labelled as a download cannot silently send a live response. Downloading never claims teacher receipt. |
| Teacher feedback | Teachers can type and send private feedback as soon as a response arrives. Generating a draft is optional. A submitted revision clears earlier feedback while awaiting its own review. |
| Student UI | Retry is the main action for an unconfirmed response; download is secondary. Redundant submission controls disappear while confirmation is pending. Mobile recovery controls remain readable, and Escape minimizes an activity while retaining its draft. |

The receipt protocol is enabled by the live polling HostPanel and advertised in the poll packet. Other consumers of the shared polling transport retain their existing behavior unless they opt in. The runtime and its desktop public mirror match.

## Verification

**124 distinct checks passed across 11 suites.** The 21 new tests cover acknowledgement negotiation, accepted-response deduplication, rejection, private snapshots, draft and revision recovery, withdrawal confirmation, downloads, reconnect limits, disposed joins, and keyboard minimization. The final affected run passed all 38 delivery and existing activity-runtime checks. Feedback suites also passed after the manual-feedback change.

Some intermediate runs timed out while starting test workers before executing their suites. Those affected suites subsequently passed. One browser run timed out waiting for a background student tab's confirmation timer; the complete walkthrough passed with that tab foregrounded.

Two Chromium walkthroughs connected one teacher and three students through real local RTCDataChannels, with an in-memory signaling fixture:

- **Delivery and feedback:** intentionally dropped acknowledgement, same-request retry counted once, manually authored private feedback, student remount, restored feedback, offline revision draft, online reconnect, confirmed revision, private check-in acknowledgement, and end-poll cleanup.
- **Other poll types:** rating results, word-cloud pause/resume with retained drafts, multiple-choice selection, rejection of stale results from a prior poll, and seven received responses.

Both walkthroughs reported zero page errors and no horizontal document overflow. One student used a 390 × 844 viewport. Updated mobile screenshots were visually inspected. Runtime and browser-harness syntax checks, public-mirror equality, and scoped whitespace checks passed.

Reproduce from the repository root:

~~~powershell
node dev-tools/check_live_response_confirmation.cjs
node dev-tools/check_live_activity_review.cjs
node node_modules/vitest/vitest.mjs run tests/live_response_confirmation.test.js tests/live_activity_review_runtime.test.js tests/live_polling_feedback_response.test.js tests/live_polling_feedback_response_ui.test.js --pool=forks --maxWorkers=1 --hookTimeout=60000 --testTimeout=60000
~~~

The remaining regression suites were live_polling_reconnect, live_polling_wordcloud, live_polling_host_dialog_a11y, live_polling_universal_audience, live_polling_session_qa_lifecycle, live_polling_group_routing_ui, and live_polling_peer_showcase, all under tests/ with the .test.js suffix.

## Screenshots and evidence

- [Unconfirmed response and retry](live-response-confirmation/mobile-unconfirmed.png)
- [Offline revision draft](live-response-confirmation/mobile-offline-draft.png)
- [Confirmed revision](live-response-confirmation/mobile-confirmed.png)
- [Teacher feedback](live-response-confirmation/teacher-feedback.png)
- [Delivery browser results](live-response-confirmation/browser-results.json)
- [Other poll browser results](live-response-confirmation/polls/browser-results.json)
- [Verification record](live-response-confirmation/verification.json)

## Scope and limits

Receipt confirmation means acceptance into the current teacher browser's session state. Recovery caches are private, limited to the current poll, and cleared when it ends or the host stops; they are not durable server storage. Draft recovery uses the student's browser session storage. Existing clients that do not negotiate receipts retain their earlier send behavior.

The browser runs use real local WebRTC connections and a simulated signaling service. They do not establish behavior through deployed Firebase, Google Mailbox, a school network, or a teacher browser restart. No backend or deployment configuration changed. These changes are local and have not been deployed.
