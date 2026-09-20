# Homework selection integrity follow-up

Implemented in the canonical resolver and cloud homework creator, plus the SharedActivity packet builder. No external publication, commit, or deployment.

- Explicit selections keep their requested order and student opening resource, independent of History ordering. Duplicate IDs are deduplicated without counting twice.
- More than 25 distinct selections, missing requested members, and requested resources excluded by the student serializer stop before publication with actionable guidance. Automatically paired originals count as required content of a selected reading.
- Explicit empty selections can reach hosted activity-only authoring. Empty or privacy-rejected cloud packets are blocked.
- Cloud preparation runs before asset uploads. Any budget-driven drop or compacted placeholder reroutes through the existing complete-pack link path. The final preparation is checked again before the session document is written.
- Cloud resources now cross the same student-pack privacy serialization boundary before cloud sanitation/upload.

## Verification

The new tests/homework_selection_integrity.test.js executes the real canonical callbacks, InstructionalContext pairing, student serializer, Firestore preparation/hydration, and SharedActivity builder with in-memory cloud/mailbox transport boundaries. All 13 cases pass, including exact original text/snapshot and curated annotation survival both through the cloud path and through the oversized pair fallback. JSON-looking adaptation text remains text through both serialization boundaries.

Combined five-suite run: 57/58 passing. The sole failure was the existing QR-shell static assertion at tests/qr_student_shell.test.js:505 for the old adjacent host callback syntax, owned by the coordinator's conversion update; reported for update. The assignment integrity, selected reading, SharedActivity extraction and delivery-preview suites passed. Canonical Babel parse, root/public SharedActivity byte parity and scoped whitespace checks passed.

## Boundaries

Preflighting inline media before uploads is conservative: a large image that an upload might shrink can choose the complete-pack route earlier. This avoids side effects from a cloud attempt that would omit requested material. Existing complete-pack/hosted limits and connection guidance still apply. These are local transport-stubbed checks; no school service credentials, live AI, or external student link was used.

Before-region snapshots for coordinator mirror sync: resolver-before.txt and homework-creator-before.txt in this directory. No new SharedActivity exports were added; the coordinator's explicit AI-policy override remains intact.

Coordinator integration: the adjacent QR static assertion was updated for explicit hosting options and passed its final 20-test rerun. All 125 distinct focused tests now pass; all four canonical regions and module versions are synchronized. See README.md and validation-summary.json.
