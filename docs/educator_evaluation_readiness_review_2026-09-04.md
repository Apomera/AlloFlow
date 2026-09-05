# Educator evaluation readiness review

Reviewed September 4, 2026. Intended first use: both a local evaluator workspace and a shared district portal.

## Assessment

The implementation is a candidate for a structured pilot using fictional records. Readiness for routine use with real personnel records has not yet been demonstrated in the intended deployment. This is an engineering assessment of the repository and local tests, not a live deployment audit or district authorization.

A percentage would hide the biggest unknown: the application's actual operating environment. The next milestone is deployment acceptance, followed by a small supervised pilot and review of its findings.

| Use | Current assessment | Evidence still needed |
| --- | --- | --- |
| Local walkthroughs and training with fictional records | Suitable for a structured pilot | Evaluators complete representative tasks on their actual devices |
| Local work with real records | Conditional; not yet verified here | Approved device/storage practices, successful export and restore, and a named backup routine |
| Shared district portal with fictional records | Candidate for tenant acceptance testing | Deployed package, actual account identities, access checks, and concurrent editing |
| Shared portal as a routine record system | Not yet demonstrated | Completed acceptance scenarios, recovery evidence, operational ownership, and district approval of intended use |

## What the evidence establishes

The existing automated suites cover scoring, workflow milestones, finalized-record locks, access rules, concurrency, recovery, exports, and audit behavior. Browser tests render both the standalone app and the generated portal. The portal browser tests use a simulated Apps Script bridge; backend tests use a service harness. They do not prove behavior in a real district tenant.

Recent review passes corrected invalid calendar dates, roster column shifts, lost walkthrough drafts after refused saves, automatic reassignment of recovered walkthroughs, invalid visit durations, and saved-visit identity changes. This pass also scopes unfinished comments to their record and role, preserves refused comment submissions, and validates imported observation schedules before starting a visit.

Generated standalone and desktop bundles are rebuilt from the shared source; the Apps Script portal is generated separately and checked for freshness. The portal builder now stages generated output before replacement to address a reproduced OneDrive write failure.

## Current operating limits

- Local browser storage and the district repository are separate. Using both does not automatically synchronize local drafts into shared district records; agree on where the authoritative record is kept.
- The portal uses explicit saves and manual Refresh, rather than live collaborative editing.
- Artifact upload, attachment versioning, and attachment retention are not implemented. The workflow supports references to artifacts kept elsewhere under district control.

## Acceptance scenarios before real records

Use fictional names and evidence throughout these rehearsals. Record the package revision, devices, tester accounts, results, and recovery steps.

1. **Local complete cycle:** Enter an educator, save and publish a walkthrough, complete a formal observation and SPM/SLO, enter annual evidence and rationales, finalize, and inspect exports. Verify receipt versus agreement wording with the intended users.
2. **Local recovery:** Export a backup, restore it into a separate empty browser profile, and compare educators, records, comments, statements, and finalized history. Confirm what happens when storage is unavailable or full, and document who makes backups and where they are retained.
3. **Actual district identities:** Test an administrator, assigned evaluator, two educator accounts, an unassigned evaluator, and an unauthorized account. Check direct links as well as the normal interface. Verify private drafts, released records, and removal of access after an assignment or account is disabled.
4. **Two-person workflow:** Complete a cycle from separate educator and evaluator browsers. Exercise conflicting edits, refresh, an interrupted save, reconnect, and recovery. No actor should receive a false success indication or overwrite an unreviewed conflicting change.
5. **Real service operations:** In a test deployment, verify document permissions, reviewed notifications, recovery after interrupted operations, backups, annual rollover, and restore rehearsal. Sending test notices requires explicit authorization and exact test recipients.
6. **Representative devices and workload:** Rehearse on the browsers, phones, keyboards, and assistive technology people will actually use. Exercise a realistic roster and history size. Identify a support owner and a fallback procedure for outages or unresolved saves.

## Suggested release decision

Start a small synthetic pilot now. Move to a limited live pilot only when the relevant acceptance scenarios have passed and the district owner has approved the intended use and operating procedures. Expand after reviewing the pilot's findings. Until then, do not treat passing automated tests as proof that the shared deployment can serve as the sole official record store.

No live deployment, real account access test, notification, or personnel-record migration was performed during this review.

## Continued draft-recovery hardening

Unsent comments and unfinished educator statements now survive tab navigation within the open tool, remain scoped to their educator, record, role, and academic year, and are labeled as drafts. Statement refreshes preserve local edits and require an explicit choice when the saved version changes. Refused saves retain the draft; finalization preserves unfinished statement text for recovery without adding it to the finalized record.

Closing with unfinished text now offers a cancellable discard review containing the draft text. Browser unload warnings cover these drafts, and local workspace replacements and academic-year changes are blocked until drafts are saved or discarded. These drafts live in memory only: they are not automatically posted, backed up, or recoverable after a confirmed close or browser crash. Existing pending-save and save-failure close protections still apply.

Validation includes component recovery regressions and real React panel checks against both source and generated builds, including switching tabs, academic-year protection, cancelling close, and confirmed discard. Deployment acceptance with actual district identities remains outstanding.

## Continued save-result and SPM finalization hardening

Formal-observation and SPM creation now report a record ID only after an accepted change and reuse an existing open record on repeated attempts. Updates read the latest workspace, reject educator/record identity changes, and return an explicit result. Comments validate the referenced educator and record, require published walkthroughs, and reject empty or oversized text before committing.

SPM finalization now writes the locked result and its corresponding annual LEA rating in one workspace save. The repository accepts only that exact rating on the same educator, emits a canonical finalization audit entry, and rejects unrelated persisted edits or incorrect audit bindings atomically. Deploy the updated Apps Script server and portal UI together; this review did not deploy them to a live district tenant.

## Continued submission-readiness improvements

Formal prework, evidence publication, reflection, post-conference notes, evaluator assessment, SPM proposals, SPM results, and return reasons now use consistent required-text checks. Whitespace and the control characters removed by the repository do not count as content. Each relevant action describes its missing requirements, and required text fields expose their requirement to assistive technology. Formal domain ratings require whole numbers from 0 through 3; zero remains a valid selection.

Formal-observation and SPM text inputs now carry the repository’s corresponding character limits. Optional resources, assessment notes, and artifact references remain optional. Mutation-boundary checks also refuse incomplete milestones from stale controls or imported local records without changing the workspace or creating an audit event. Automated coverage exercises the field guidance, field limits, corrected input, zero ratings, and rejected mutations.

## Continued walkthrough review and stale-edit protection

Saved walkthrough edit forms now compare their opening snapshot with the latest workspace record. When a visit changes, the form retains the evaluator’s edits, displays the saved version for comparison, and requires an explicit choice before saving again. A record that becomes published, unavailable, or part of a finalized cycle cannot be overwritten; an already-open saved-visit form keeps its text available for copying. Refused saves now include an inline explanation.

Publication and discard confirmations are bound to the reviewed snapshot. A changed record requires a fresh review, and a rejected discard no longer dismisses the record detail. Repeated stale acknowledgment handlers do not create duplicate local receipts. These safeguards protect records within the open session; unsaved walkthrough edits are not a replacement for backups.

## Continued staff-entry and roster recovery

Unfinished add-educator entries and pasted rosters now survive Staff-tab navigation within the open tool and participate in the existing close/discard review. They remain in memory until saved or explicitly cancelled; opening an untouched entry form does not create an unsaved-work warning. Refused saves preserve the entry, and Cancel clears its recovery copy.

Staff-entry errors identify and focus the relevant field. Required names and staff codes, duplicate codes, field-length limits, and real calendar due dates are checked before creation. The creation handler repeats these checks and normalizes surrounding whitespace before storing the validated values, preventing silent shortening or loss of a valid due date. These checks do not change the separate district-managed roster workflow.


## Continued roster-import integrity

Roster previews now reject impossible or unrecognized dates, oversized fields, and extra columns instead of dropping dates, shortening values, or ignoring trailing fields. Only validated rows can be added. Skipped lines retain their original text after a successful import and remain available across tab navigation for correction or removal. Refused imports show an inline message and retain the pasted text.

The local bulk creation handler repeats validation against the current workspace and refuses the entire requested batch if a code was claimed since preview or any requested row is invalid. A successful batch creates one audit event linked to its first new educator. Surrounding whitespace is removed before storing validated values. The district portal continues to use its separate managed directory workflow.


## Continued confirmation integrity

Formal evidence publication, evaluator signing, observation finalization, SPM approval and locking, and final annual release now compare the current record with the content captured when review began. If it changed, the action is cancelled with a request to review the current content; no approval, lock, annual snapshot, or audit entry is created by that refused action. This prevents a confirmation from applying to a newer judgment or recording an old annual score against changed ratings. Repeated confirmations cannot create duplicate milestone entries. Object property order alone does not invalidate a review.

These are client-side confirmation checks in addition to the existing district revision checks. They do not replace district account, access, recovery, and real-device acceptance testing before personnel-record use.


## Continued staff-profile editing integrity

Staff profile edits now use an explicit Save profile action instead of updating the saved record on each keystroke. Drafts remain scoped to the educator, role, and academic year in the open tool, survive navigation, and participate in the close/discard review. Invalid names, duplicate staff codes, oversized fields, and impossible dates are rejected with a focused field error. Cancelled or refused saves retain the draft; Discard profile changes restores saved values.

The save handler validates against the current roster and compares the profile with the version used to start editing. A changed profile requires an explicit choice to use the saved version or continue editing the draft. If cycle work makes the profile read-only, unfinished details remain available in a copyable text field. Successful local saves apply the profile fields together and add one educator-linked audit event; district saves retain the existing serialized queue and clearly indicate that changes are queued. District evaluator assignment labels remain read-only.


## Continued walkthrough text integrity

Walkthrough subjects, factual evidence, and interpretation now show their supported character counts. Oversized typed, pasted, or recovered content stays intact in the form and recovery copy; saving focuses the field that needs shortening. The same limits are checked at creation, draft editing, and saved-draft publication, preventing newly saved notes from being silently shortened by later workspace normalization. Text exactly at each supported limit survives normalization unchanged.

Walkthrough creation also requires meaningful factual evidence and the privacy confirmation for immediate publication. New-record IDs, creation timestamps, observer attribution, versions, and receipt fields are assigned by the tool rather than copied from recovered draft metadata. Existing records and previously shortened text are not reconstructed by these changes.


## Continued recovery for edits to saved walkthroughs

Unfinished edits to a saved private walkthrough now remain in the open tool when its form closes or the user changes tabs. The Walkthroughs tab offers a resume list, with separate drafts for each visit and academic year. The original saved version is retained as the comparison baseline, so a newer saved record still triggers the existing review choice after resuming. Refused saves keep the edit, accepted saves clear it, and Discard unsaved edits restores saved content without deleting the visit.

Pending edits participate in the tool-close review and remain copyable when the original visit is deleted, published, or finalized. This recovery is in memory for the life of the open tool. A separate new-visit session draft remains independent. Evaluator edits are not displayed in educator view.

## Continued formal-observation and SPM save recovery

Formal-observation and SPM edits refused by the workspace now remain visible in an in-memory recovery copy, scoped to the record, role, and academic year. Multiple unfinished fields can be retried together after saving becomes available. Submission, approval, publication, signing, and locking wait until the edits are saved or discarded. Accepted optimistic saves still use the existing district save queue; acceptance is not a claim that the server has persisted the record.

Recovery survives tab navigation and appears as readable content in the panel-close review. If the saved record changes, retry is disabled and the recovery notice displays both versions for comparison and copying. Discard removes only the unfinished copy. Finalized cycles, locked records, and educator preview cannot use the retry action. This recovery lasts only while the tool panel remains open; it does not add browser persistence or replace district recovery testing.

## Continued recovery when workflow records change or disappear

Formal-observation and SPM screens now list unfinished edits for other records belonging to the selected educator, role, and academic year. Existing records can be reopened from the list. If a record is no longer available, the recovery copy remains readable in a keyboard-accessible text area and can be discarded independently; these controls cannot recreate or update the missing record. Unrelated recovery copies remain intact.

When a saved record changes, the workflow form displays its current saved contents and suspends editing until the recovery copy is reviewed and discarded. Unfinished text stays separately available for comparison and copying, so it cannot appear as the content of a newly locked or finalized record. Recovery remains in memory for the life of the open panel.
