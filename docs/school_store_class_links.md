# Reviewed AlloFlow class links in School Store

Later September 9 follow-up: [dedicated Store dictation](school_store_voice_awards.md) can fill a typed recognition draft when on-device speech is available. Reviewed links and the existing final award confirmation still control identity and points. This does not add voice awards to the ordinary Allobot microphone.

This feature connects existing lesson identities to existing Store students. It does not authenticate students, create Google accounts, import Classroom names into the Store, or turn lesson XP into spendable points.

## Intended staff workflow

1. In the Teacher Portal, select **Store review file**. Review the warning and download the small manifest. It includes only the existing class ID, learner IDs and codenames. It excludes class labels, groups, support settings, learning histories and submission keys. Invalid or missing identities block export; export does not regenerate them.
2. After district review, an authorized Store administrator opens the class-link section. Enablement requires acknowledging both identity-handling and historical-record retention. This is an operator declaration, not proof that district approval has occurred.
3. Choose the manifest and manually select the corresponding existing Store student for each learner being linked. Choose the staff who may use this class lookup. Names and emails are never used for automatic matching.
4. Preview the concrete matches, omitted/disabled entries, staff access and conflicts. Review and confirm before saving. If the Store roster, class links, year or repository changed, get a fresh preview.
5. Authorized staff load their linked classes in the Store, choose a codename and resolve the current recipient. Review the real Store recipient before using it in the award form. Lookup and form filling do not award points; the existing award confirmation and ledger rules still apply.

## Privacy and authority boundaries

- Codenames and opaque IDs are pseudonymous, not anonymous. Teachers must check that codenames do not contain real names. The review file belongs only in the approved staff workflow.
- The mapping remains inside the district-owned Store repository. It is not returned to the lesson roster, Classroom helper or an AI prompt.
- Store administrators manage links and staff grants. Administrators or currently authorized staff granted that class can resolve it. A class grant never grants Store staff/admin privileges, and it does not narrow existing school-wide Store permissions elsewhere.
- Student inactivity/redaction and academic-year changes stop current lookup. Historical, signed link versions retain learner IDs, codenames, canonical Store IDs, reviewed staff grants and administrative provenance. They are not automatically purged or rewritten. The district must review retention and records-export handling before enabling the feature.
- A newly generated Classroom roster is a new identity set, not repeat synchronization. Reuse the established AlloFlow class/learner IDs for updates. Do not solve identity conflicts by regenerating IDs.

## Recovery and limits

Changes are previewed and checked again on the server. A saved link cannot be reassigned to a different student in this increment. Use explicit suspension to stop an individual lookup while keeping its historical association; reactivation requires a new review of the same student association. Correcting a mistaken association to a different student needs a separate reviewed correction procedure, not regenerated lesson IDs. Omitted existing entries are retained disabled rather than deleted. Saving a reviewed class includes an explicit replacement staff-grant list; carefully review removals as well as additions.

For an uncertain link/grant apply, keep the exact request and retry key. Do not change matches or create a new request just because a response was lost. The receipt must match the original request key and administrator identity. Private review drafts are transient; a reload can require administrator reconciliation. No real-name mapping is saved in browser storage.

Enable/disable settings have a different recovery path: **Check current class link settings** reads the current server state without resending the change. A subsequent change requires fresh review; observing current settings does not prove which earlier request saved them.

The manifest allows up to 500 learners with bounded, unique IDs and codenames. The backend also bounds staff grants and snapshot size. Large or malformed inputs fail rather than being truncated.

## Follow-up and remaining limits

The September 9 follow-up implements [typed recognition](school_store_typed_recognition.md): Allobot locally intercepts award-oriented input and offers an explicit clean Store launch; the teacher re-enters the request inside the signed-in Store, reviews the linked recipient and fills the existing award form before final confirmation. No draft is transferred between pages. This does not implement live deployment, a real-student pilot, automatic Classroom sync, student Google sign-in, a cross-origin award endpoint or voice awards. Push-to-talk availability and audio processing require their own review; always-on listening is not planned.

See also [Google authorization boundaries](google_workspace_connections.md) and [Classroom importer](google_classroom_import.md).

## Original class-link verification - September 9, 2026

- The full scoped regression run passed 668 tests in 21 files: 529 in the broad run and 139 in the separate large Portal run. After the final CSS-only phone-table correction, 72 focused tests passed, including the unchanged strict escaping guard and the added column-width regression.
- Ten browser surfaces passed with fictional data and simulated services: administrator link review and staff linked-recipient awards, plus the Classroom helper, existing Store recognition and shipped practice page, each at 1280px and 390px. The new flow verifies cancelled saves/awards make no mutation call, lookup/prefill never awards, and the final confirmation creates exactly one award.
- Desktop and phone screenshots were inspected. Spanish coverage is 1066/1066 catalogue entries. Thirteen relevant source/public asset pairs were checked byte-for-byte. These checks do not prove live Google Workspace authorization, district approval, real school throughput or operational readiness.

Evidence: reports/school-store-class-links-2026-09-09/regression-tests.json, portal-regression-tests.json, layout-regression-tests.json and browser-checks.json. The six existing-surface checks are recorded in reports/classroom-store-product-2026-09-08/browser-checks.json, rerun for this increment.

Browser reproduction: node dev-tools/check_school_store_class_links.mjs and node dev-tools/check_classroom_store_integration.mjs. Regression reproduction: run the tests/school_rewards and tests/classroom_import filters plus tests/roster_safe_updates.test.js, tests/school_store_design_refinements.test.js and tests/teacher_store_roster_export.test.js using Vitest with --maxWorkers=1 --testTimeout=60000. The large tests/school_rewards_print_portal.test.js may be run separately if Windows cannot start its worker in the combined run.

The original verification counts above describe the class-link pass. Follow-up implementation details, expanded regression results and remaining limitations are recorded in the [typed-recognition guide](school_store_typed_recognition.md). Voice input remains separate from that typed-command boundary.
