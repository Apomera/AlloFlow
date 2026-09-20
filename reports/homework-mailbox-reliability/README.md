# Homework mailbox reliability follow-up

This pass fixes saved-assignment actions that targeted the currently connected mailbox instead of the mailbox encoded in the saved student link, and makes valid hosted activity-only assignments usable by students.

## Saved links stay bound to their mailbox

The reproduced revocation failure used actual generated HostHandlers against two local server sandboxes executing Code.gs: with a pack saved in mailbox A and mailbox B connected, deletion went to B, the UI reported success, and A still served the original assignment.

A shared helper now validates the saved link, its exact Apps Script deployment URL, pack id and optional stored secret. Extend, duplicate and revoke require matching teacher credentials; they capture the connection before confirmation/network waits. Switching mailboxes while an operation waits cannot redirect it. Mismatches show reconnect guidance without a write or a false revoked record. Existing cloud revocation is retained.

The same target validation covers Assignment Control Center status reads, Research Suite imports, and teacher activity management. The QR panel displays reconnect guidance instead of mounting teacher controls with unrelated credentials. Portable encrypted exports take their student submission capability from the saved link, independently of the currently selected mailbox, and include no teacher admin token.

## Standalone activities and loading

All five supported standalone hosted formats—Word Cloud, rating, availability, signup and survey—previously passed authoring but failed student intake because they had no reading resources. Intake now accepts a validated shared activity or safe reading resources; it opens the existing activity dialog when there is no reading. Empty, invalid and expired packets remain rejected. The initial student codename prompt still completes normally before revealing the activity.

Cancellation after decompression no longer applies stale state. Authoritative AI policy is applied only after the hosted packet passes expiry/content checks.

The shared activity wrapper now uses the existing reactive CDNModuleGate, with a named loader that preserves background loading and supports demand loading and retry. The old memoized wrapper depended on unrelated parent rerenders for readiness; the new gate responds directly to registration, detects late loaders, and cleans up its listeners/timers. This is readiness hardening, not a claim that every prior full-app load was stuck.

## Evidence and limits

**200/200 focused tests passed across 16 files.** Suite counts are recorded in validation-summary.json (final-core-results.json and final-compat-results.json). Initial integration failures remain recorded in regression-results.json; final targeted results supersede repaired assertions and timing-related failures. TARGET-QA.md documents two passing 320px browser scenarios using the actual helper/memo and generated QR view. Root visually inspected different-mailbox-320.png; reconnect copy is readable and contained.

Six changed canonical regions, the new target memo/dependency getters, and the named loader are synchronized across both desktop source shells. Generated HostHandlers and ShareSessionSurfaces match their public mirrors; content-hash pins are current. All three JSX shells parse. source-integrity.json records this evidence. Unrelated edits and desktop local module URLs were preserved.

The broader HostHandlers extraction audit has pre-existing optional-wrapper and unused-getter/manifest drift; see extraction-baseline.json. Required dependencies introduced in this pass are explicitly checked, including setMbUrlInput.

These checks execute production code with controlled local collaborators. Mailbox servers use mocked Google services; the browser teacher-activity panel uses a recording adapter. No complete app mount, live Google mailbox, real student responses, native screen reader, installed desktop package, or live AI evaluation was performed. The user subsequently authorized committing everyone's workspace changes and running deploy.sh. Enhancement validation above precedes that release; release outcome is tracked separately in AGENT_HANDOFF.md.
