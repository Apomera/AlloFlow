# Educator evaluation: pathway walkthrough

Use fictional records for demonstrations. The standalone workspace, Leadership
Hub, and district portal share the evaluation interface. Their storage and
identity behavior differ; begin the demonstration by identifying which one is
open.

Local presentation: [open the evaluation demo](http://127.0.0.1:8768/).
Choose the guided fictional workspace on first launch. Start it again with
`npm run demo:educator-evaluation`. The server serves an allowlist of evaluation
assets on localhost; it does not connect to the district repository.

## Choose the entry point

| Path | What to demonstrate | Boundary to explain |
| --- | --- | --- |
| Standalone `educator-evaluation.html` | First launch, fictional guided rehearsal, real local workspace, manual | Saves stay in this browser profile. Other staff do not automatically receive them. |
| Leadership Hub / desktop launcher | Open the evaluation panel or configured district portal | A configured portal URL opens the shared repository; a local panel remains local. |
| District Apps Script portal | Administrator, assigned evaluator, educator, and unauthorized accounts | The server resolves district identity and assignments. Role labels or direct links do not grant access. |
| Educator packet | Export one educator's released material, open the HTML, return a response for review | A downloaded copy is separate from the authoritative workspace. Import is an explicit reviewed step. |
| Optional Drive packet helper | Verify setup, review exact recipient and expiry, share, inspect access, revoke | This helper is a separate deployment. Folder privacy and the entire file permission list must pass inspection. |

## Walk an administrator through the cycle

1. **Setup and staff.** Identify the academic year and approved framework. Show
   staff profiles, evaluator assignments, due dates, and required fields. In the
   portal, directory and configuration changes use administrator reviews. Show
   Setup health and the difference between a healthy repository and a recovery
   condition. Local profile and roster editing use their own explicit saves.
2. **Walkthrough.** Save factual evidence privately, return to the draft, then
   review and publish it. Show that the educator cannot see the private version.
   After publication, demonstrate comments and acknowledgment. Acknowledgment
   records receipt, not agreement. Published evidence cannot be rewritten.
3. **Formal observation.** Follow the separate milestones: assignment, educator
   prework, pre-conference, observation, reviewed evidence publication, educator
   reflection, post-conference, evaluator ratings and written rationales,
   educator acknowledgment, and evaluator finalization. Explain that private
   pre-conference notes stay private after finalization.
4. **SPM / SLO.** Let the educator create and submit the plan. Return it with a
   reason, revise and resubmit, then approve the reviewed version. Submit
   year-end results and reflection; the evaluator enters a rating and rationale
   and reviews the lock. The locked rating and annual LEA rating save together.
5. **Annual judgment.** Show the active framework and arithmetic, then enter
   human-selected domain judgments, rationales, and eligible evidence
   references. Show the educator's own statement. Review and finalize the
   annual record. A formal-observation score does not automatically replace the
   annual judgment. Finalization closes the current cycle.
6. **Educator copy and notices.** In the portal, review the exact recipient and
   disclosure before sharing the released summary. Explain that clicking its
   link records a link-open receipt, not proof of reading. Separately review
   content-free portal notices. Do not send real notices during a local demo.
7. **Trends and reports.** Inspect historical framework snapshots, evidence
   coverage, minimum cohort sizes, and exports. Explain which record supports a
   result and why a small cohort may be suppressed. Exported files need their
   own handling and retention procedure.
8. **Recovery and next year.** Rehearse a conflicting edit in two sessions, an
   interrupted save, and a refused save with draft recovery. Show reviewed
   repository repair, authorized exports, archive-first annual rollover, and
   restore rehearsal. A restore rehearsal is not an automatic live restore.

## Branches to exercise before a district pilot

| Branch | Expected behavior |
| --- | --- |
| Invalid roster entry, date, or required field | Clear correction guidance; no silent creation or shortening of rejected input |
| Unsaved text and tab navigation | Scoped recovery copy; refused saves retain work |
| Another person edits the same record | Revision conflict and review; no silent overwrite |
| Another educator or unassigned evaluator opens a record | Server denies access or omits the unauthorized record |
| A member or assignment is disabled while a request waits | Authorization is checked again after the lock is acquired |
| Private versus published evidence | Private material remains absent from educator projections and exported packets |
| Completed formal record followed by SPM work | Unchanged finalized records do not block subsequent authorized work |
| Finalized annual cycle | No new current-cycle records, comments, or edits; rollover opens the next cycle |
| Reviewed recipient, directory, or record changes | Obtain a new review before the operation can proceed |
| Unknown notification or artifact outcome | Inspect the recovery result; do not assume success or resend blindly |
| Shared or misplaced packet folder | Filing stops before evaluation content is written |
| Extra permissions appear on a packet | Sharing is not verified; access review flags the change |
| Failed permission cleanup | Explicit manual-recovery result with the affected file link |
| Small-screen and keyboard use | Primary controls remain reachable; content fits the viewport |

## Presentation and operating limits

Use the existing `educator-evaluation-manual.html` for illustrated instructions.
The separate-account browser regression in
`tests/educator_evaluation_live_bridge.test.js` runs the shipped portal and actual
Apps Script implementation against fictional service fixtures. It does not sign
in to district Google accounts, send real mail, or change real Drive permissions.

Before live use, verify district identities, actual Drive permissions, approved
framework configuration, account removal, concurrent saves, exports and recovery
with the intended deployment and devices. Local browser backups and the district
repository are separate; agree on the authoritative record location and backup
owner. Unsaved recovery text is not a durable backup.
