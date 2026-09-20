# Homework conversion and selection follow-up

Completed locally on 2026-09-19. No deployment, installer build, external publication, or live model calls.

Changing a saved homework link to another format now retains its saved student-AI policy and selected resource order. It does not attach the teacher's currently configured shared activity. Ordinary new activity authoring still includes the requested activity.

Oversized self-contained links reuse the exact encoded packet when falling back to mailbox hosting, avoiding a second build from changed content/settings. A pending mailbox connection retains that packet and its conversion options; expired prepared packets are refused. Six before-change runtime cases reproduced the conversion bugs; all nine focused host tests now pass. Actual keyboard-driven view checks reproduced the missing options before the fix and verified both saved AI policies afterward.

Selection validation blocks partially missing, over-25 and unshareable explicit selections before publication, preserves requested order, and requires paired originals to survive privacy filtering. Cloud delivery checks its budget before asset uploads and reroutes oversized or compacted assignments through the full-packet path. Empty cloud assignments are refused; deliberately resource-free shared activities remain supported. Large inline images may take the complete-pack route sooner because preflight happens before uploads could shrink them.

Invalid AAC content now returns an explicit rejection. Manual and automatic reader opening preserve pending homework when a resource is rejected, while existing successful handlers remain compatible.

Validation:

- 125/125 targeted tests across 13 files pass using the latest result per suite: [validation-summary.json](validation-summary.json).
- 7 long/empty/legacy dialog browser scenarios pass, including 50 readings, keyboard access to the final item, and 320px layout. 2 final policy-conversion browser scenarios pass; no page errors or external requests. [Browser evidence](../novak-delivery-preview/BROWSER_QA.md).
- The existing classroom journey passed 10 checks again with merged source, no external requests and stable production hashes: [journey evidence](../novak-classroom-journey/README.md).
- Real serializer, Firestore preparation and student hydration preserve JSON-looking adapted text as text, exact original source/snapshot and a teacher-curated pinned explanation. The oversized-pair route is also checked. [Selection details](selection-integrity.md).
- Four changed canonical regions match both desktop source copies and parse with Babel. Three generated modules match their public copies and loader versions: [source-integrity.json](source-integrity.json). Scoped whitespace verification passed.

The initial metadata-preview expectation was updated to reject losing a selected reading's original while still verifying metadata after general privacy filtering. A source-inspection assertion was updated for the new optional host arguments; actual runtime conversion tests cover both ordinary authoring and conversion.

Limits: cloud/mailbox transports are stubbed in behavioral tests; browser checks use an isolated local integration host and explicitly mocked AI. No deployed service, real model quality, native screen reader, installer or classroom validation is claimed. Large packets still respect existing hosting limits and setup requirements.

Concurrent changes were preserved and this work remains uncommitted in the shared tree.
