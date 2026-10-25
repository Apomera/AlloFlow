# Live-session metadata security improvements

October 24, 2026. This pass adds student-field validation to the versioned Firestore rules and fixes reconnect writes in the three application source copies. Changes are local and require a coordinated release. No rules were deployed, production records accessed or deleted, packages installed, or cloud configuration changed.

## Problem and changes

The previous roster rule restricted a participant to their own roster key, but most fields inside that entry were not validated. A participant could add arbitrary text or nested records, forge the entry's UID, or change teacher-assigned fields. Reactions likewise lacked a fixed value schema. An isolated emulator reproduced twelve such writes against the captured original rules; this establishes the missing checks, not that anyone used them in a live classroom.

The updated rules allow non-host changes to twenty known student fields: join identity, XP, presence and viewing acknowledgments, Word Sounds practice/probe summaries, organizer/activity progress, image-delivery receipts, and reading preferences. Values have bounded types, sizes, ranges, machine-name patterns, or fixed choices. Word Sounds preserves the actual partial/null summaries, fractional probe metrics, and audio states emitted by the application.

Each roster update may change at most five leaves and one specialized progress family (`wsProgress`, `wsProbeResult`, `organizerProgress`, or `imageDelivery`). Universal `activityProgress` may accompany that family. This is an explicit request-complexity limit: the largest inventoried client write is the five-field viewing acknowledgment, and Word Sounds and organizer writers pair their specialized summary with universal progress. The Firebase path does not coalesce these writes. A direct bulk write changing all twenty fields is intentionally rejected before detailed validation; each supported field remains available through bounded updates.

Validation applies to changed fields. Teacher-owned fields such as groups, assigned resources, hidden resources, Pictionary roles, and rewards must remain unchanged. Unknown legacy fields may survive unchanged, but students cannot create, modify, or remove them. Students cannot delete their whole roster entry or change another participant's entry. Existing malformed progress can be replaced with a valid summary without making unrelated heartbeats fail.

Bridge reactions use the three supported choices, `👍`, `🤔`, and `❓`, with a positive bounded integer timestamp. New arbitrary fields and deletion of host-added metadata are denied. Host maintenance and reset operations retain their existing authority.

Rejoining previously replaced the participant's entire roster map with four join fields, erasing teacher assignments. Join and mailbox self-heal now write only the four individual leaves. These atomic updates also preserve assignments changed by the teacher after the client reads the session; copying a stale roster snapshot would not provide that protection.

The field-change approach follows Firebase's documented `diff().affectedKeys()` allowlist pattern. It is a browser/mobile client rule boundary; privileged server SDKs require separate IAM controls. [Firebase field access guidance](https://firebase.google.com/docs/firestore/security/rules-fields)

## Verification

The client regression test executes the actual extracted join and self-heal functions from all three source copies. Before the fix, nine checks failed and three passed, reproducing lost assignments and concurrent-write loss. After the fix, all twelve pass. The combined focused client run passed 77 tests across six files, including mailbox behavior, niche live-session writes, reading preferences, and Word Sounds progress/audio.

The separate rules suite exercises the actual local Firestore emulator with synthetic data and authenticated/unauthenticated test contexts. It includes the twelve original attack writes as a negative control, legitimate first join and rejoin, all twenty fields across supported atomic groups, maximum five-field client writes, early denial of oversized/mixed-family batches, teacher-field integrity, legacy metadata, malformed shapes, bounds, nullable resets, optional leaf removal, and host maintenance. Rules tests use permission assertions rather than matching source text. The existing broader rules regression also checks quiz/team, Concept Quest, signaling, asset ownership, listing, and mastery boundaries on the same local engine. [Firebase rules testing guidance](https://firebase.google.com/docs/rules/unit-tests)

An initial stress test combining all twenty fields exceeded Firestore's 1,000-expression evaluation limit. Profiling also exposed excessive work during preliminary authorization. Conditional dispatch reduces preliminary evaluation, and the new bounded-write contract rejects complex bulk batches explicitly while preserving actual client operations. The runner rejects candidate results containing evaluation-limit errors, including errors hidden by a passing denied-write assertion. Final results and exact tested file hashes belong in [session-metadata-security-validation.json](session-metadata-security-validation.json), alongside the captured baseline and final emulator receipts. [Firestore security-rule limits](https://firebase.google.com/docs/firestore/quotas#security_rules)

The final candidate passed **242 metadata permission checks** and the existing broader Firestore regression on the same local engine. Metadata, regression, and emulator logs each contained **zero evaluation-limit messages**. The two rules copies matched byte for byte, and all emulator listeners were closed afterward. These are focused synthetic checks, not approval of the whole application or its deployed configuration.

Reproduce the client checks from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run tests/session_roster_rejoin_security.test.js tests/mailbox_session_bridge.test.js tests/niche_live_session_writes.test.js tests/roster_reading_preferences.test.js tests/word_sounds_live_progress.test.js tests/word_sounds_audio_delivery_hardening.test.js --maxWorkers=1 --testTimeout=30000
```

Run the emulator checks separately:

```powershell
node dev-tools/security/run_session_metadata_rules.cjs
```

The runner requires installed test dependencies, Java, and an existing cached emulator matching the installed Firebase CLI manifest's SHA-256. It does not install tools or download a binary. It uses the fixed `demo-alloflow-session-metadata` project, temporary loopback ports, a stripped subprocess environment, isolated rule snapshots and logs, and shuts down its emulator. An optional `--baseline path/to/original.rules` runs the twelve-write negative control before the candidate.

## Deployment boundaries and remaining work

| Backend | Effect of this change |
| --- | --- |
| School-owned Firebase | Updated client preserves assignments; new server checks take effect only after tested rules are deployed to that project. |
| Gemini Canvas provisioned backend | Repository rules do not configure Google's provisioned service. Actual sharing, rule enforcement, identity, retention, and service terms still require verification. |
| Desktop LAN sessions | Updated client preserves assignments. The local server authorization follow-up now rejects replacements that change or omit protected fields; it requires a reviewed Desktop release. See the [LAN/mailbox follow-up](session-transport-authorization-followup.md). |
| Apps Script mailbox | Updated client preserves assignments. The local revision-25 server now protects retained teacher fields and fixed schemas; it requires updating the owned Apps Script deployment. See the [LAN/mailbox follow-up](session-transport-authorization-followup.md). |

The remaining LAN and mailbox boundary is concrete: the server validates the submitted own-entry fields, then assigns the whole map without comparing existing teacher fields. See [LAN validation](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/desktop/runtime/alloflow-desktop-runtime.cjs:2170) and [mailbox validation](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/apps_script/session_mailbox/Code.gs:981). Those implementations were reviewed but not changed in this pass, keeping this work separate from the other agents' local-service and packaged-runtime changes.

The session creator's Firebase UID still grants host ownership; anonymous authentication does not verify district staff or tenant membership. Hosts retain broad write authority. Short allowed strings, including display names, can contain identifying information. These controls do not prove de-identification, establish a district agreement, or provide a compliance certification. Existing metadata is neither migrated nor deleted.

A separate, pre-existing receipt compatibility issue was found during writer review: the assessment fallback emits an optional `questionIndexes` array, while the current Firestore quiz-receipt validator accepts exactly four keys and excludes that array. Presentation receipts still use the four-key shape covered by the broader emulator fixture. Both sides of this mismatch already exist in the repository's baseline commit; this pass did not change that receipt schema. Resolve and test the actual assessment fallback before classroom release. Evidence: [assessment emitter](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/host_handlers_source.jsx:2924), [receipt validator](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/firestore.rules:196), [normalizer test](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/session_evidence_report.test.js:662). Broader regression success does not cover this five-key case.

Release the corrected client and matching rules together, test teacher assignment followed by student reconnect on an owned staging project, and verify the deployed rule revision. Older clients that replace the whole entry can be rejected when assignments or accumulated progress exist; they need the updated client. Future client writers must respect the five-field/family contract or deliberately revise and retest it. Keep a previously verified client/rules pair for coordinated recovery. Do not deploy through the historical console-paste instructions in the superseded checklist.

PPS approval, Canvas service/storage verification, verified staff authorization, retention/deletion testing, and the other original audit requirements remain open. The [original audit](report.md) records the broader district readiness assessment.
