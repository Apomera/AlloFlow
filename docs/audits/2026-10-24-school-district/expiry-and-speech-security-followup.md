# Assignment expiry and managed speech requests

October 24, 2026. Additional local improvements after the protected clinical workspace work. Scope was checked against the other security chats: dependency/CI/application release validation and MCP/delivery hardening remain with those workstreams. No services were deployed, no records were deleted, and no real student data was accessed.

## Assignment access after expiry

The previous rules denied reading an expired assignment's session document but did not consistently apply that decision to participant updates or dependent documents. A learner could still reach their own Lesson Board answer, their own signaling document, or a shared asset whose own expiry was later than its assignment. Some child paths also remained accessible after their parent was deleted.

The rules now apply the parent assignment's timestamp expiry to these non-host paths:

| Path | New access condition |
| --- | --- |
| Session participant update | The assignment must remain unexpired before existing participant-field validation runs. |
| Lesson Board private answer | A learner's own read/create/update requires an existing, unexpired assignment parent. |
| Poll, Pictionary, and quiz signaling | A guest's own read/create/update requires an existing, unexpired assignment parent. |
| Shared session asset | A non-owner read requires a valid parent as well as the asset's existing owner/expiry conditions. |

Missing or malformed assignment expiry fails closed. Existing live sessions retain their previous lifetime behavior; this change does not invent an expiry for sessions that never had one. Existing host maintenance and owner/guest cleanup permissions remain available under their ownership checks. The creating Firebase UID still identifies a browser, not verified PPS staff.

The latent native-Firebase Driving Questions item reader now requires authentication before its existing host/own/approved-item visibility checks. An unauthenticated caller can no longer read or query approved items. Firebase anonymous authentication still counts as authentication, so this does not establish staff identity or board membership. The current production question-board transport remains the separately reviewed Apps Script mailbox.

Access denial and physical deletion are separate. Previously downloaded or cached copies are not revoked by server expiry. Firebase documents that TTL deletion is asynchronous and does not remove subcollections. This pass does not activate TTL, recursively erase records, or establish a complete district retention schedule. Host cleanup that relies on a parent cannot establish ownership after that parent is deleted; an authorized server/admin procedure must remove remaining child records. A guest can still delete their own signaling document, while private-board answer deletion retains its existing host-only rule. An approved deployment still needs deletion procedures and verification for parent records, child collections, assets, browser copies, exports, and provider copies. [Firebase TTL behavior](https://firebase.google.com/docs/firestore/ttl), [Firebase document and subcollection deletion](https://firebase.google.com/docs/firestore/manage-data/delete-data)

## Managed AI policy and text-to-speech

The managed AI backend deliberately blocks media operations in policy version 1. Reader and persona speech code had independent legacy/direct Gemini paths that did not apply that guard. Synthetic negative controls demonstrated that those paths could transmit text with a managed policy configured. This does not mean every provider failure or disabled-provider setting reached a cloud fallback.

The speech module now checks the managed-policy restriction at its cloud entry points and immediately before queued or direct dispatch. A `managed-ai-blocked` provider error cannot downgrade into a direct cloud request. A policy installed while a queued task waits also blocks its eventual cloud dispatch. Existing local engine and browser speech alternatives remain available; an unmanaged deployment retains its existing cloud behavior. Speech diagnostics use character counts instead of spoken-text snippets and omit raw HTTP/provider error bodies.

This follows the existing managed-policy semantics: a configured non-null policy blocks unsupported cloud speech, including malformed policy objects; absent or null managed policy retains the legacy unmanaged behavior. A district must install and verify an explicit valid policy. The separate clinical workspace and support policies continue to govern their own routes.

Browser speech synthesis can use operating-system or browser services, including network-backed voices. Keeping that fallback does not guarantee offline processing. District device/voice policy must cover the voices actually available to students. This fix controls the speech module's own cloud inference requests; it does not approve every AI feature, provider, media type, or external connection.

## Current privacy inventory

The [current privacy posture](../../DATA_PRIVACY_POSTURE.md) and [source-backed flow inventory](data-flow-inventory.md) replace universal no-server-storage, automatic Workspace-coverage, and automatic compliance claims. They distinguish local/bridge storage, live and assignment backends, optional history sync, clinical encryption, support retention, media providers, and manual deletion responsibilities.

## Validation and release

Exact source hashes, negative controls, emulator results, speech regressions, and delivery records are recorded in [expiry-and-speech-security-validation.json](expiry-and-speech-security-validation.json).

Validation passed: 190 new candidate permission checks, 242 existing session-metadata checks, the broader Firestore security regressions, 123 speech tests across eight files, 21 host-integration checks, and 50 static Firebase invariants. The captured prior rules reproduce 70 formerly allowed access paths that the candidate now denies. Candidate logs contain no rule evaluation-limit messages. A fresh 23-case managed-speech run verifies the final diagnostic changes; those cases are already included in the 123-test speech total.

The Firestore tests run against a local emulator with synthetic identities and records. Negative controls use the exact preceding rules snapshot, and candidate checks include existing security regressions. This establishes the reviewed source behavior, not the rules active in Google's provisioned Canvas project or an owned production Firebase project.

The speech tests use the real generated module with synthetic text and intercepted fetches. They verify blocked fallbacks, queued policy changes, and supported unmanaged/local routes. The source, generated module, public mirror, and content-integrity pin must be shipped together. The other release workstream remains responsible for the coordinated full build and release validation.

PPS still needs to approve the actual accounts, hosting, services, data categories, retention/deletion, recovery arrangements, managed-device controls, and operational owners. These changes do not establish district approval or a compliance certification.
