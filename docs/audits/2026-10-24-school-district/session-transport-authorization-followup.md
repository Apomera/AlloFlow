# LAN and mailbox participant authorization

October 24, 2026. Local implementation and focused validation are complete. No production service, Google Apps Script deployment, Firebase rule, account permission or cloud configuration was changed. The independent backup-site project remains deferred.

## Problem and resulting behavior

Desktop LAN and the Apps Script mailbox restricted participants to their own roster key, but authorized whole-entry replacements by inspecting only submitted fields. A smaller replacement could erase teacher assignments and unknown legacy metadata. A replacement that included those protected fields was rejected even when it preserved them correctly.

Both backends now compare the proposed entry with current stored data. Protected fields must remain present and structurally equal, including null-valued fields and future metadata. Changes to student-owned fields require the bounded field validator. Unchanged legacy values may survive; a new or changed UID must match the authenticated participant, and an existing UID cannot be removed. First joins and compatible legacy whole-entry updates remain supported.

Dotted writes continue to preserve assignments without replaying a stale snapshot. Whole-entry writes that omit or replay stale teacher fields are rejected rather than silently merged. Optional student-field deletion accepts only the exact delete marker; whole-entry deletion, UID deletion, nested literal delete markers in changed replacement fields, and ambiguous roster parent/child writes are denied. Malformed stored roster containers require teacher repair, rather than being coerced into empty maps by participant writes.

LAN authorization and application occur synchronously inside the store update after the request body is read. Mailbox authorization remains inside the existing ScriptLock, after reading the latest envelope and before persistence. Tests cover a teacher update while a LAN request body is pending and an update before the mailbox obtains its lock. Rejected batches do not partially apply document changes.

## Fixed schemas and legitimate classroom activity

The mailbox's roster allowlist now checks own properties. An inherited JavaScript name such as `toString` cannot authorize deletion of a protected field. Independent review found the same pattern in nested schemas; all eight approved fixed-schema lookups now require own membership. Tests reproduce and reject inherited-name payloads in progress, receipts, quest actions and signaling. Dynamic resource-ID maps were outside this change.

The actual client reading-preference payload is supported on both transports: a fixed theme choice, at most ten unique valid favorite themes, and a bounded timestamp. The teacher's reading default remains protected. LAN additionally accepts the existing bounded image-delivery receipt and Word Sounds audio-status/count/timestamp fields. Unknown controls and malformed values remain denied. Existing quiz, reaction, voting, organizer, lesson-board and connected-escape behavior passed focused compatibility tests.

## Distribution

The mailbox source is revision **25**, SHA-256 `606c72aa6876cfe1ae92abc5c2acf2686e80840f7bb0115c198b3f152bbba043`, 151,466 bytes. Its public source copy and both generated installer-module copies match the canonical source. All three maintained host copies carry the updated revision/hash/byte metadata. The canonical host's installer and setup-view module URLs have refreshed content fingerprints.

The setup view now prompts teachers running older revisions to update to revision 25. Its root/public generated module pair is synchronized. Only the relevant generators and metadata references were refreshed; the broad application build was not run against the shared dirty checkout.

## Validation

| Check | Result |
| --- | --- |
| New LAN tests against the real HTTP servers | 14 passed, zero skips |
| Same LAN suite with installed third-party packages treated as absent | 14 passed, zero skips; compatible with Node-only native CI |
| Existing LAN compatibility suites | 57 passed across four suites |
| New mailbox roster and fixed-schema suite | 57 passed against the actual server code with synthetic Google-service implementations |
| Final combined classroom, setup-source, reconnect, preference, audio and game regressions | 268 passed across 14 files |
| Maintained native runner, including the newly registered LAN suite | 14 suites passed |
| Desktop runtime contract and source syntax | Passed |
| Independent review | No confirmed regression or remaining bypass in the reviewed guards |

Before the first fix, the LAN suite failed ten of fourteen cases. The initial mailbox suite failed nine of twenty-five cases. The additional nested-schema regression run failed eighteen of fifty-seven cases before its own-membership corrections. These include both security failures and legitimate payloads that had been rejected; the counts are not severity ratings or evidence of live exploitation.

Baseline sources, failure logs, passing logs and [the final verification receipt](../../../tmp/session-transport-security-20261024/verification-receipt.json) are retained under `tmp/session-transport-security-20261024/`. The [LAN receipt](../../../tmp/session-transport-security-20261024/lan-verification-receipt.json) also records the before/after hashes and existing-suite results.

## Release boundaries

These are source changes, not deployed protections. Release the reviewed Desktop runtime/client together, and update an owned mailbox deployment to the reviewed revision-25 script using the normal controlled process. Verify the served script and client references on staging, including teacher assignment followed by student reconnect. Legacy clients that replace an entry without preserving its teacher fields will receive a denial and need the updated client.

Compiled GUI/installer smoke testing was unavailable because the existing `desktop/app-build` directory is absent. No placeholder was used to claim a pass. The actual HTTP transport tests and generated setup-source checks passed; a clean application/package build, installer checks and real deployed Google-service verification remain release steps.

This work does not establish verified district staff identity, tenant membership, retention/deletion controls, Canvas backend assurances, or district approval. The broader [district readiness assessment](report.md) and [Firestore follow-up](session-metadata-security-followup.md) retain those separate requirements.
