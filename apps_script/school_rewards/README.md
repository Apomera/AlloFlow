# AlloFlow School Rewards - Google Education pilot (schema v6)

This package is the school-owned deployment path for the AlloFlow token economy. Official rewards live in a protected Google Sheet ledger owned by a managed school account. AlloFlow stores only the reviewed Apps Script launcher URL; it does not hold or mutate the official point balance.

Schema v6 retains the schema-v5 append-only, versioned inventory ledger and adds resilient, bounded bulk-mail runs with a signed delivery outbox. Student statements and guardian digests can continue across short Apps Script executions without treating an uncertain send as safe to repeat. The package retains the v4 private 3D Print Lab, guardian, district-reporting, and provider-neutral SIS boundaries. It remains a reviewed fulfillment system, not an anonymous upload endpoint, unattended mailer, or unattended printer controller.

## What the pilot includes

- managed Google Workspace identity; no student code names, shared PINs, or bearer links
- server-enforced `admin`, `staff`, `cashier`, and roster-derived student access
- editable HOWL or school-defined recognition categories and a required student-facing explanation; inactive categories cannot receive new awards
- private category growth levels based on lifetime net awards; purchases do not reduce demonstrated growth, and deactivated categories remain visible in history
- staff point awards with payload-bound duplicate-request protection
- an append-only ledger, cached balances, reversal entries, a script lock, and a tamper-evident audit chain
- `Idempotency`-sheet recovery journals for core awards, award corrections, catalog operations, store checkout, and store refunds: intent is saved before related rows are written, entity IDs are deterministic, and a same-key replay either completes the recorded intent or fails closed on conflicting state
- an editable prize catalog whose inventory is a materialized snapshot of per-item append-only movements; metadata edits never alter stock, while separate reviewed adjustments require a reason and confirmation
- same-record trimester windows with `DRAFT`, `PREVIEW`, `OPEN`, `CLOSED`, and `ARCHIVED` states; configured start/end times gate spending
- searchable student selection with grade/homeroom filters and a prominent identity confirmation for awards and checkout
- cashier checkout that refreshes the open window, current spendable balance, and inventory before a fresh confirmation, while retaining only a stable retry key and hashed intent fingerprint in `sessionStorage` after submission
- itemized purchase and refund receipts shown in the portal and sent to the managed student address; recent activity can reopen or print a receipt
- administrator-only full-order refunds that restore points and finite inventory
- administrator editing, deactivation, and reactivation of students and staff, with the last active administrator protected
- fully validated CSV roster reimports that update existing students by normalized managed email, plus aggregate reconciliation, an administrator-only read-only integrity report, and optional private balance emails that distinguish ledger, reserved, and available points
- a Print Lab model registry, private asset quarantine/review, linked revisions, point quotes, reservations, status tracking, fulfillment receipts, and print-specific refunds
- an opt-in, staff-moderated school model catalog with consent, reuse terms, reporting, unpublishing, and recipe remix lineage
- administrator-reviewed guardian mappings and bounded positive-progress digests that omit staff notes and transaction-level reasons; schema-v6 `MailRuns` and `MailOutbox` records preserve resumable progress and uncertain outcomes, while manual controls require operator confirmation and suppress duplicate starts
- provider-neutral SIS roster preview/apply and district aggregate outputs that do not expose student identities or narrative reasons

Students can use the system without opening the portal because scheduled balance emails remain available. A rostered student who opens the portal sees only their own balance, reserved points, spendable balance, growth, explanations, orders, private print models, and print requests. The repository uses an opaque student UUID internally; managed email is used to resolve that UUID at sign-in. The live ledger and active holds, not an older email or local AlloFlow state, are authoritative.

## Print Lab v4 workflow

The Print Lab deliberately crosses a trust boundary through a small file handoff:

1. In AlloFlow's **STEM Lab -> 3D Print Lab**, the student builds a constrained primitive recipe or locally opens an allowlisted GLB/STL.
2. AlloFlow previews the model, runs advisory browser-side checks, and exports a versioned `.alloflow-print.json` review package. This action does not contact Google, reserve points, or start a purchase.
3. The student opens the domain-restricted School Rewards portal with their managed Google account and imports that package. The server assigns the roster identity from `Session.getActiveUser()`; it never trusts a student ID from the package.
4. For GLB/STL, the portal hashes the selected file locally and sends a bounded upload only after it matches the registered package hash. The server independently checks size, extension, MIME, file signature, and SHA-256 before placing it in private school-owned storage with `PENDING` status.
5. A trained staff member verifies or rejects that private asset. A GLB/STL model cannot be quoted until the reviewed asset is `VERIFIED`; no Drive link or file bytes are returned to the student.
6. The student submits the private model against a `PREVIEW` or `OPEN` trimester window. If staff requests a revision, the student creates a new immutable model version and resubmits through the linked revision action; the old request becomes `SUPERSEDED` rather than being edited in place.
7. Staff reject the request or approve it with a material/printer profile, advisory estimate, expiration, and point quote.
8. The student may confirm an unexpired quote only while the window is `OPEN`. Confirmation creates an active point hold.
9. Staff move a reserved request through `QUEUED -> PRINTING -> READY`. Fulfillment captures the hold as one ledger spend, creates an itemized order, and sends a receipt. Cancellation releases a hold without spending, and the print-specific refund restores points and sends a refund receipt.
10. Independently of purchasing, a student may explicitly submit an eligible model to the school catalog under stated reuse terms. Staff moderation is required before publication; reporting and unpublishing do not alter the private print request or its ledger records.

The portal never accepts an unauthenticated HTTP mutation: `doPost()` rejects writes. Mutations occur through `google.script.run` inside the signed-in Apps Script portal.

### Supported handoff formats

| Format | AlloFlow behavior | Google repository behavior | v4 result |
| --- | --- | --- | --- |
| `RECIPE` | Manual or AI-assisted Prim3D recipe is previewed, checked, and embedded in the review package. | The server revalidates the allowlisted primitive recipe and stores normalized JSON in the repository owner's private Drive folder. | Supported through the rewards quote/hold/queue/receipt workflow. Staff and the school slicer still decide whether and how to print it. |
| `GLB` | A single-file GLB is parsed locally; external resources and unsupported decoder requirements are blocked. The review package contains metadata, scale, advisory results, and a SHA-256 hash, not model bytes. | The signed-in student attaches the matching GLB through the portal. The server verifies the GLB signature/version/length and hash, stores it privately, and waits for staff verification. | Quotable only after the exact asset is `VERIFIED`; actual slicing remains a trained-operator step. |
| `STL` | Binary/ASCII STL is parsed locally and requires an explicit unit declaration. The review package contains metadata and a SHA-256 hash, not model bytes. | The signed-in student attaches the matching STL through the portal. The server checks the bounded payload, STL signature/shape, and hash, stores it privately, and waits for staff verification. | Quotable only after the exact asset is `VERIFIED`; server checks do not certify geometry or print safety. |

The browser tool caps local model inspection at 5 MiB; the Google pilot deliberately uses the narrower 4 MiB decoded upload cap. Both surfaces apply complexity and physical-size limits. Their results are advisory. Passing preflight does not establish minimum wall thickness, material safety, printer safety, successful slicing, or freedom from malicious content.

The review package contains no Google account identifier and uses a generic source filename for GLB/STL. It can still contain the title, description, student note, recipe, and AI disclosure entered by the student, so schools should teach students not to enter names, email addresses, IDs, diagnoses, discipline narratives, or other sensitive information.

The illustrated user manual is at `school-rewards-manual.html` (published at https://alloflow-cdn.pages.dev/school-rewards-manual and linked from the Manuals & Guides hub).

## 2026-09 additions

- **Spanish for students and families (draft pack).** A language menu in the portal header switches the student-facing surfaces (overview, prizes, growth, recognition, activity, tabs, footer) between English and Spanish; the choice is remembered per browser and defaults to the device language. Translation is a dictionary keyed by the English text applied to rendered text and to placeholder/label attributes, so untranslated strings simply stay English. Staff and administrator surfaces, balance emails, and guardian digests remain English. The Spanish pack was drafted for review by a bilingual staff member before a family-facing pilot.
- **Statement language.** A student's language choice in the portal menu is saved to a small on-demand `Preferences` sheet (created on first use, no migration), and balance statements go out in that language; `setSchoolRewardsLanguage` lets a student set their own or an administrator set a student's. Spanish is available; guardian digests stay English.
- **Latest recognition for students.** The student overview shows the five most recent recognitions with the category and what staff wrote; the full history stays under Progress & activity.
- **Phone navigation and admin sections.** Below 760px the tab strip becomes a fixed bottom bar. The Admin tab gains a section index and Collapse/Expand toggles on every card.
- **Print Lab visibility.** Administrators can hide the 3D Print Lab tab under **School settings** (`adminUpdateRewardsSettings`) until the school has a reviewed printer workflow. Default on; a display setting, not an access control.
- **Roster tiles and undo.** The Award tab shows students as tappable tiles (name, grade and homeroom, ref, available points) that work for single and group awards alike. After a single award the notice offers **Undo**; the awarding staff member may reverse their own award for 15 minutes, recorded as an ordinary audited reversal. Administrators can still correct any award.
- **Group award.** Staff can tick "Award the same recognition to several students" on the Award tab, select up to 60 students from the filtered list, and record one reviewed explanation for all of them. `awardSchoolRewardsPointsBatch` records each student as an ordinary journaled award under a key derived from the group key, so an exact retry after a lost response never double-awards; the response lists any student that could not be recorded.
- **Deployment check page.** `<exec>?api=status` renders a plain-language check (service, script version, repository schema, school, domain, your role, setup state) for the AlloFlow setup checklist. `?api=health` still returns JSON.
- **Prize goal.** A student can mark one prize as "Saving for this"; the dashboard shows the points still needed. The choice stays in that browser only and is never sent to the ledger.
- **Dark theme and reduced motion.** The portal follows the device colour scheme and motion preference.
- **Faster loads.** Every bootstrap, statement run, and district summary now reads the PointHolds sheet once per request instead of once per student.

## Pathway verification

Run `npm run verify:school-rewards` before distributing the package. It covers the rewards portal, repository, role workflows, setup, language packs, classroom reward boundary, Print Lab, and Geometry World handoff. See `docs/school_rewards_readiness.md` in the repository for the verification matrix and school-owned live checks.

Print Lab loading failures now leave other rewards tools available and provide a retry control. Print model submission locks the selected handoff, asset, material, note, and request keys until the operation settles.

## Store reliability fixes (September 2026)

- Completed checkout receipts appear immediately, before refreshing the portal. A failed refresh keeps the receipt visible and clearly reports the completed purchase.
- Cart quantities, student selection, and shopping-window controls stay locked during live verification and checkout, then unlock after completion or cancellation.
- If live verification finds a different student or shopping window, checkout stops so the cashier can review the selection again.

- Partially completed group awards retain their original retry key and selection. Retry the same group unchanged to recover saved awards without awarding them again.
- Long group request keys use a bounded hash per student. Existing truncated journals remain recoverable and conflicting legacy requests fail closed.
- Saved group awards remain recoverable after a category is deactivated; new awards still require an active category.
- Cashier carts allow at most 50 different prizes and 100 of each prize. The server also checks the combined quantity when a new checkout contains duplicate lines.

Update both `Code.gs` and `Portal.html` in the school-owned Apps Script project and publish a new version of its existing deployment to apply these fixes. No schema migration is required.

## Roles and permissions

| Role | Rewards | Print Lab |
| --- | --- | --- |
| Student (roster-derived) | Own balance, progress, explanations, catalog, and orders | Import a package, register/submit an own private model, attach a matching GLB/STL, resubmit a requested revision, see own requests and holds, confirm an own quote, and opt in to school-catalog publication/remixing |
| `staff` | Award points to one student or a reviewed group of up to 60, and view the staff reward surface | Verify/reject private assets, review/quote requests, moderate/report/unpublish catalog entries, cancel, queue, start, return to queue with a reason, mark ready, and fulfill |
| `cashier` | Complete physical store checkout | No Print Lab access |
| `admin` | Configuration, corrections, catalog/windows, roster/SIS review, guardian mappings/digests, district aggregates, reconciliation, and refunds | All staff actions, hold visibility, cancellation at any pre-fulfillment queue state, and print-specific refunds |

New models remain `PRIVATE`. Publication is a separate opt-in state machine and is never required to request a private print. The catalog uses a generic creator label and never publishes a student email, Google Drive link, balance, staff note, or request history.

## Point accounting

The ledger balance and the spendable balance are now distinct:

```text
availableBalance = ledger balance - sum(ACTIVE point holds)
```

- Submission and staff quotation do not move points.
- Student confirmation creates one `ACTIVE` hold for the quoted amount.
- Normal store checkout and administrative award reversal both check `availableBalance`, so they cannot consume reserved print points.
- Cancellation changes the hold to `RELEASED` without a ledger entry.
- Fulfillment writes one `SPEND`, changes the hold to `CAPTURED`, creates a print order whose ID matches the print request, and records/sends the purchase receipt.
- A print refund writes one reversing `REFUND`, updates the linked order and request, and records/sends the refund receipt.
- The ordinary order-refund endpoint rejects print-linked orders so the request, hold, order, and ledger cannot drift apart.

### Inventory accounting

`InventoryMovements` is the append-only inventory history. New prizes begin with `INITIALIZE`; administrator stock changes use `ADMIN_ADJUST`; ordinary store checkout and refund append `SALE` and `REFUND`. Each item has a consecutive `InventoryVersion`, and every movement carries the prior movement hash so gaps, reordered rows, arithmetic drift, and broken before/after continuity are detectable. The `Catalog` inventory columns are the current materialized snapshot and must match the final movement in that item's chain.

The schema-v5 migration creates one deterministic `MIGRATION_BASELINE` for each existing catalog item. That per-item baseline is the grandfather cutoff: integrity checks reconcile the baseline snapshot and every later movement to its signed catalog, checkout, or refund journal, but deliberately do not invent movements for sales that occurred before migration. Legacy order and ledger reconciliation still applies to that earlier history.

Catalog creation, metadata updates, and inventory adjustments use the signed recoverable `catalog` operation. Only creation and inventory adjustment append movements; a metadata-only save must preserve inventory limit, remaining quantity, and version exactly.

All mutation calls require an idempotency key and run under the repository lock. Core award, correction, catalog, checkout, and refund keys are bound to the authenticated actor and normalized request payload, so a key cannot silently be reused for a different amount, student, reason, cart, item, or inventory transition. The content hash stored on a print request pins review and fulfillment to the registered model version.

### Core transaction recovery boundary

Awards, award corrections, catalog operations, physical-store checkouts, and physical-store refunds use a versioned journal envelope in the protected `Idempotency` sheet. A new request first records its complete normalized intent with state `INTENT`, HMAC-signed with `SR_CORE_JOURNAL_SECRET` held only in Script Properties. Only then does it write the related ledger, order, order-line, catalog, inventory-movement, balance, and audit state. Operations move through `MUTATIONS_APPLIED` and finally save the successful result as `COMPLETED`. Legacy unsigned completed journals remain readable.

Ledger and order IDs derived from the stable request key let recovery resume the exact persisted intent after an Apps Script interruption. Before recovery writes anything, it revalidates the HMAC signature and canonical operation, IDs, roles, references, arithmetic, and inventory transitions. It then checks every already-written row against that intent, fills deterministic missing rows, re-materializes the cached balance from the ledger, and applies only the recorded before-to-after inventory transition. Completed-journal checks also compare the stored intent deeply rather than trusting only the key or saved result. A different payload, unexpected duplicate, invalid pending intent, missing or invalid signature, or inconsistent inventory fails closed instead of guessing.

Any pending core journal immediately makes integrity readiness false. Until it is resolved, the service blocks other core point/store mutations, catalog changes, and Print Lab actions that change balances or point holds. An active administrator may call `recoverSchoolRewardsOperation({ idempotencyKey })`; it resumes only a valid signed pending intent under the original business actor and writes a separate administrator recovery audit event. There is no destructive abort or rollback action.

This is application-level recovery for multi-row Google Sheets operations; Google Sheets is not a transactional database, and the recovery path does not repair unrelated inconsistent records automatically. Never change the journal, ledger, order, balance, hold, catalog, or inventory-movement rows by hand. If recovery fails closed, review the integrity evidence and district-approved backup/restore path before allowing further transactions. Email delivery occurs after point and inventory mutations, so a mail failure does not undo a purchase.

### Checkout and receipt recovery surface

Preserve `SR_CORE_JOURNAL_SECRET` in Script Properties for the lifetime of the repository because integrity checks also verify completed signed journals. Do not delete or rotate it, or replace Script Properties, without a reviewed migration that preserves historical verification. If the secret is unavailable, stop transactions and use the reviewed backup/restore path. Never copy a raw journal secret into Sheets, documentation, tickets, or operating logs.

Award and checkout student selectors support text search plus grade and homeroom filters. The selected student's name and roster details are repeated in a confirmation panel; staff must still use the school's privacy-respecting identity check before submitting. The visible student `Ref` is a non-secret disambiguator only, never a login credential or PIN.

For a fresh checkout, the portal reloads authoritative balances, the active window, and inventory before showing confirmation. After submission, `sessionStorage` retains only the stable retry key and a hashed normalized fingerprint—never names, emails, reasons, or raw student, window, or item IDs. If the same checkout fingerprint returns after a reload, the portal first requests exact stored-intent replay instead of running a new live preflight; changed intent receives a new key and follows the fresh checkout flow.

The administrator operations panel exposes bounded, read-only integrity issues and offers recovery only for a valid signed pending journal after explicit confirmation. Missing or invalid signatures and invalid pending intent fail closed without a recovery action. Recovery uses the server-stored intent; the panel does not expose a destructive abort, rollback, or arbitrary replacement-payload action.

The Activity tab can reconstruct **View receipt** and **Print** surfaces from each order in the recent bootstrap history, even after the immediate checkout receipt is dismissed. This is a recent-activity surface, not an unlimited archive search.

Creating a prize requires a starting inventory type and records `INITIALIZE`: choose unlimited, or choose finite with a limit and an optional starting remaining count (blank means the full limit). Later stock changes use the separate **Inventory adjustment** form: choose an action, enter a specific reason, review the before/after versioned change, then confirm. If checkout, refund, or another administrator advances the item version first, confirmation fails with a version conflict; refresh, recount if needed, and review a new adjustment. Metadata edits never alter stock, and finite-to-unlimited or unlimited-to-finite changes require explicit transition actions.

The two manual bulk-mail actions—student balance statements and guardian digests—show a recipient-scope confirmation and disable repeat submission while that browser request is pending. Scheduled balance statements run according to the saved trigger configuration and do not display an interactive confirmation.

### Resilient bulk-mail outbox

Schema v6 routes student statements and guardian digests through protected `MailRuns` and `MailOutbox` sheets. `MailRuns` stores one aggregate lifecycle record plus a compact, signed manifest in `CursorKey` that freezes the eligible candidate set when the run is created. The cursor advances only through that frozen set; later roster or guardian additions require a later run, while every candidate is still revalidated against live recipient, activity, and consent data before sending. Run states are `QUEUED`, `RUNNING`, `PAUSED_QUOTA`, `NEEDS_REVIEW`, `COMPLETED`, and `FAILED`. Each linked delivery attempt is `PENDING`, `SENT`, `FAILED`, or `UNKNOWN`. Purchase and refund receipts retain their separate transaction-linked delivery path; the bulk worker reserves mail quota for those receipts.

For each delivery, the worker acquires its signed, expiring single-worker lease, rechecks the live student and, when applicable, the exact active guardian mapping, address hash, consent timestamp, and student activity, then writes and flushes a signed `PENDING` outbox row before releasing the repository lock and calling `MailApp.sendEmail`. A fresh `PENDING` row is an in-flight, read-only attempt: administrators cannot resolve or retry it, and recipient or consent fields used by that attempt cannot change. If an interrupted attempt remains `PENDING` past the configured stale boundary, the continuation/watchdog path converts it to `UNKNOWN`; it never assumes that the message failed.

`UNKNOWN` is deliberately never retried automatically. An administrator must investigate outside the portal and record a PII-free resolution note - no student, guardian, or mailbox identifier - marking the attempt `SENT` or confirmed `FAILED`. Resolution does not send mail. Only a cryptographically authenticated, explicitly resolved `FAILED` source may create one deterministic linked retry, and that retry is itself persisted as `PENDING` before sending. A pending, unknown, unconfirmed failed, already-retried, mismatched, or tampered source cannot be resent.

If a new retry cannot acquire the single-worker lease or would consume the protected receipt reserve, the RPC throws the definite `mail_worker_busy` or `mail_quota_reserved` error before creating a linked outbox attempt or saving a retry result. Retry the exact request later with the same stable idempotency key; these errors are not a queued or successful send.

Runs process the frozen manifest in bounded chunks: the default chunk is 25 candidates, the maximum chunk is 50, and a request is bounded by the repository batch limit. The worker stops before consuming the configured receipt quota reserve and uses deduplicated one-shot continuations when more safe work remains. An expiring signed lease permits only one active bulk-mail worker at a time, and each scheduled handler is authenticated against its signed stored trigger UID.

Fresh setup, schema-v6 migration, and later schema-v6 reconfiguration install or repair one authenticated recurring hourly safety sweep owned by the durable repository account. New run starts, continuation processing, and linked retry creation fail closed with `mail_safety_unavailable` unless that exact registered sweep is healthy. The one-shot continuation remains the fast path; if its trigger cannot be created even after retry, the already flushed durable run remains queued and the hourly sweep selects it for safe continuation. The sweep follows the same lease, quota reserve, live-recipient checks, and ambiguity rules, and never auto-retries `UNKNOWN`. A missing, duplicate, replaced, unsigned, or foreign-owned sweep/continuation trigger is an operational fault to review, not additional capacity.

Administrator bootstrap and run-status RPCs return privacy-safe projections only. Run DTOs contain aggregate counters and opaque references, while actionable delivery DTOs omit student IDs, guardian IDs, addresses, recipient hashes, message payloads, consent timestamps, actor hashes, signatures, and resolution notes. The older `Statements` and `GuardianDigests` sheets remain bounded compatibility projections of settled outbox attempts; they are not the send authority and must not be used to bypass an unresolved outbox record.

In this system, `SENT` means `MailApp` accepted the send request without throwing and the result was durably settled. It does **not** prove inbox delivery, placement, reading, or guardian identity. Preserve `SR_MAIL_DELIVERY_SECRET` and the core journal secret in Script Properties for the lifetime of the repository. Never copy either secret into Sheets or logs, rotate it without a reviewed migration, or hand-edit `MailRuns`, `MailOutbox`, their compatibility projections, triggers, leases, or idempotency records.

## Fresh deployment

1. Have the school or district review `Code.gs`, `Portal.html`, `Index.html`, and `appsscript.json`.
2. Sign into the managed Google Education account that will own the repository, mail trigger, and private print-model folder. Prefer a durable role account.
3. Create an Apps Script project and add the four files. Enable the explicit manifest in **Project Settings** if needed.
4. From the editor, run `setupSchoolRewardsRepository` once. Example:

   ```javascript
   setupSchoolRewardsRepository({
     allowedDomain: 'school.example',
     schoolName: 'Example School',
     academicYear: '2026-27',
     seedHowls: true,
     levelThresholds: [0, 25, 75, 150, 300],
     members: [
       { email: 'teacher@school.example', displayName: 'Teacher', role: 'staff' },
       { email: 'store@school.example', displayName: 'Store Team', role: 'cashier' }
     ],
     students: [
       { firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', email: 'avery@school.example' }
     ]
   });
   ```

5. Deploy as a **Web app** with:

   - **Execute as:** the deploying repository owner
   - **Who has access:** users in the Google Workspace domain
   - never `Anyone` or `Anyone anonymous`

6. Copy the deployment URL ending in `/exec`.
7. In AlloFlow, open **Leadership Hub -> School Rewards & Store**. Its setup checklist walks through steps 1 to 8, copies the four files, generates the one-time setup call, and saves the URL on the device; **Project Settings -> School Rewards & Store** also accepts the URL.
8. Open the portal once as each intended role and verify that students, staff, cashiers, and administrators see only their assigned surfaces.

Fresh setup creates schema v6 in one reviewed operation: schema-v5 `Catalog.InventoryVersion` and `InventoryMovements`, plus `MailRuns`, `MailOutbox`, the private mail-delivery signing material in Script Properties, and the signed recurring hourly mail-safety sweep. The first setup may ask the owner to authorize Sheets, Drive, mail sending, and trigger management. Private Print Lab folders are created lazily. Uploaded binaries remain private and quarantined from quotation until an authorized staff member records the separate verification decision.

## Upgrading an existing schema v4 or v5 pilot to v6

Use the ordered `v4 -> v5 -> v6` path. Setup creates a new v6 repository, but rerunning setup against an existing repository deliberately preserves its recorded schema version; it is not a migration shortcut.

1. **Back up before changing code or data.** Export or copy the complete protected repository Sheet and Apps Script project under district policy, record the cutoff and expected catalog quantities, and securely preserve the existing Script Properties and trigger-owner record. Rehearse restoration in a separate non-production copy. The recovery set must keep the repository, code, core-journal secret, mail-delivery secret, and trigger ownership together.
2. Close shopping, pause scheduled bulk mail, and confirm the integrity report shows no pending core journal, in-flight delivery, unknown delivery, or runnable mail continuation. Do not migrate while an award, correction, catalog, checkout, refund, or mail attempt is unresolved.
3. Replace all four Apps Script files with the v6 versions in the editor, but do not publish the new web-app version yet. Never mix an older `Portal.html` with a newer `Code.gs`.
4. If the repository is schema v4, run the idempotent `migrateSchoolRewardsRepositoryV5()` first. It adds `Catalog.InventoryVersion` and `InventoryMovements`, writes one deterministic `MIGRATION_BASELINE` per existing item, materializes version 1, and writes `schemaVersion: 5` last. It deliberately does not reconstruct old sales. Run inventory integrity and confirm every catalog snapshot matches exactly one valid chain tail before continuing.
5. From a verified schema-v5 repository, run the idempotent `migrateSchoolRewardsRepositoryV6()` as an active administrator. It creates the protected mail-run/outbox structures and signing material, installs or repairs the authenticated hourly safety sweep, records the migration audit event, and writes `schemaVersion: 6` only after those prerequisites succeed. Never add the sheets, version value, signing property, lease, or triggers by hand.
6. Run the read-only integrity report, aggregate reconciliation, and audit-chain verification. Confirm inventory chains remain valid, mail-run/outbox checks are clean, no unresolved delivery exists, and `/exec?api=health` reports version `6`.
7. Only after those checks pass, create or update the managed web-app deployment. Smoke-test administrator catalog/inventory, cashier checkout/refund, a bounded student-statement run, a consented guardian-digest run, privacy-safe mail status, quota-reserve behavior, and continuation ownership using designated test records.

Each migration is additive and safe to rerun after an interruption only while the repository remains at that migration step: finish or recheck v5 before starting v6, and never rerun the v5 migration after v6 has been reached. Rollback is a repository boundary, not a code-only downgrade. Once schema-v5 inventory movements or schema-v6 mail runs exist, do not redeploy older code or remove new columns, sheets, properties, leases, or triggers. Prefer a reviewed forward fix. If restoration is required, stop shopping and mail, then restore the code, complete repository, required Script Properties, and owned triggers together from the rehearsed pre-migration recovery set. Later transactions and accepted mail requests must be reconciled under district policy.

Rerunning setup does not copy or replace the existing ledger, balances, orders, receipts, roster, catalog, inventory movements, mail runs, or outbox. It rejects a partially edited or mismatched schema and does not promote v4/v5 data to v6. Supply the existing `schoolName`, `academicYear`, level thresholds, and reviewed members/students because omitted configuration values may be replaced by setup defaults. Never repair protected transactional sheets by hand.

## Recommended trimester operation

1. Create one trimester window record and keep it `DRAFT` while prizes and print policy are being prepared. Edit that same record for later state transitions.
2. Use `PREVIEW` to show prize information and accept private print submissions without allowing quote confirmation. Making a window `PREVIEW` or `OPEN` closes any older visible window.
3. Award points throughout the trimester with a brief, neutral explanation.
4. Staff first resolve pending GLB/STL assets, then review printable requests and record the approved material, printer profile, slicer/preflight summary, estimates, expiration, and quote. If staff records an `OVERRIDE` decision, a reason is required; client approval never replaces staff review.
5. Set the same window to `OPEN` for shopping and student quote confirmation. If start/end times are configured, checkout and quote confirmation fail closed outside them.
6. Cashiers review the student, itemized cart, points before/after, and final confirmation before completing a purchase. If email delivery reports a failure, give the student the on-screen receipt and follow district mail-investigation procedures; do not assume that retrying an ambiguous send is safe. Trained Print Lab staff manage the separate print queue and mark a job fulfilled only after the exact approved model version has been delivered.
7. Send guardian digests only from reviewed active mappings and within the school's communication policy; digest content is deliberately less detailed than the authenticated student view.
8. Close and reconcile the window, verify the audit chain, inspect the privacy-minimized district summary, then archive after review.

Do not edit `Ledger`, `Balances`, `Catalog`, `InventoryMovements`, `Orders`, `OrderLines`, `Receipts`, `Statements`, `MailRuns`, `MailOutbox`, `PrintModels`, `PrintRequests`, `PrintAssets`, `PrintPublications`, `Guardians`, `GuardianDigests`, `SisImports`, `PointHolds`, `Audit`, or `Idempotency` by hand.

## Pilot shopping-day runbook

Use this checklist for each pilot window. Record the reviewer, result, and any exception in the school's approved operating log. A failed required check is a **no-go** until an administrator resolves it; do not repair protected transactional sheets by hand.

### Day before: go/no-go review

- **Backup and recovery:** Export or copy the repository Sheet and Apps Script project under district policy. Confirm an authorized administrator can locate the backup and explain the reviewed restore procedure; perform the district-approved restore test in a separate non-production copy.
- **Ownership and roles:** Confirm the repository, deployment, mail trigger, and private Drive folder are owned by the intended durable role account. Verify at least two reviewed active administrators where policy permits, the required active cashiers, and current staff assignments. Remove or deactivate stale access.
- **Separation of duties:** Assign who opens/closes the window, who operates checkout, who reviews inventory adjustments and refunds, and who reviews reconciliation. When staffing permits, the cashier should not approve their own ambiguous transaction or stock correction.
- **Roster and catalog:** Review active students, managed emails, grade/homeroom data, HOWL/custom categories, prize costs, active flags, and images. Confirm schema-v6 repository readiness and that every schema-v5 catalog snapshot matches its final inventory movement. Make stock changes only through the separate Review → Confirm adjustment flow with a specific reason.
- **End-to-end test:** With designated test records, create or adjust a prize, then complete one award, checkout, and full refund. Verify the ledger/balance, `INITIALIZE` or `ADMIN_ADJUST`, `SALE`, and `REFUND` movement versions/hashes, catalog snapshot, order/refund states, on-screen receipt, and audit entries agree. Keep test activity identifiable and retain it according to policy.
- **Window and clock:** Confirm the intended trimester window record, `PREVIEW`/`OPEN` transition plan, configured start/end times, and Apps Script/project timezone. Confirm administrators know how to close that same window manually and who has authority to perform an emergency close.
- **Mail readiness:** Confirm schema-v6 mail integrity, the durable trigger owner, a single valid continuation/watchdog set, no active lease left by another worker, no fresh `PENDING` attempt, and no unresolved `UNKNOWN` attempt. Check the owner account's Apps Script mail quota and protected receipt reserve, perform an approved bounded test delivery, and prepare a printer or approved local-print path for the on-screen receipt. `SENT` means MailApp accepted the request, not that an inbox received or displayed it.
- **Integrity review:** In the administrator operations panel, review the bounded read-only issues, then run the aggregate reconciliation and `verifySchoolRewardsAuditChain()`. Confirm there are no errors or pending journals; a pending journal immediately makes readiness false regardless of age. Verify each post-baseline movement has consecutive version/hash continuity and its exact signed catalog/order link; pre-baseline sales remain grandfathered and are not reconstructed. A mismatch, broken chain, or unexplained hold is a no-go until reviewed.
- **Print holds:** Review all active Print Lab point holds, quote expirations, and request states so the displayed available balances are expected. Resolve stale work through the supported cancel/fulfill/refund actions; never alter hold or ledger rows directly.
- **Device smoke test:** On the actual cashier and administrator devices, sign in with the intended accounts and test role visibility, student search, grade/homeroom filters, the selected-student confirmation, cart controls, live refresh, confirmation, new-prize inventory setup, adjustment Review → Confirm, version-conflict handling, recent receipt View/Print actions, keyboard-only navigation, visible focus, zoom, and the screen reader path used by the school.

### Day of: open and operate

- Recheck active cashier/admin access, mail quota, device/printer readiness, current catalog stock, active holds, audit verification, and reconciliation before opening.
- Have the authorized administrator move the reviewed window to `OPEN`. Confirm the portal reports the expected window and time boundary before the first checkout.
- At checkout, verify the student and itemized cart aloud or through the school's privacy-respecting confirmation routine, then review points before/after before submitting once.
- For stock changes, use the dedicated adjustment action and reason. If confirmation reports an inventory-version conflict, do not override it: refresh, verify the new live quantity/version, and create a new reviewed adjustment. Metadata edits never change inventory.
- If a request times out, the browser disconnects, or the result is ambiguous, **do not submit it again with a new request key and do not guess whether it failed**. Preserve the screen, time, operator, student, and cart details. The unchanged submitted checkout can recover its stable key and hashed fingerprint from `sessionStorage`; otherwise an administrator may confirm recovery of the pending journal by key in the operations panel. The server resumes only its stored intent under the original business actor. If recovery reports a conflict or ambiguity, stop and inspect the integrity report, order, ledger, inventory, idempotency, receipt, and audit state rather than constructing a substitute request.
- If receipt email reports a failure or its outcome is ambiguous, give the student the printable on-screen receipt and follow the district's approved mail-investigation process; do not infer delivery from the browser alone.
- For bulk mail, treat a fresh `PENDING` attempt as in flight and read-only. If it becomes `UNKNOWN`, do not restart the run or retry the delivery. Investigate outside the portal, then record only PII-free evidence. A single linked retry is available only after the signed source is explicitly confirmed `FAILED`; resolving as `SENT` never sends another message.
- Stop checkout and perform an emergency close if balances, catalog snapshots, or inventory chains disagree; transactions appear duplicated or partial; the audit chain fails; the wrong roles have access; or operators cannot determine an ambiguous outcome. Preserve evidence and use only supported catalog adjustment, correction, refund, recovery, and window actions.

### After closing the window

- Move the same window to `CLOSED`, verify checkout is rejected, and record who closed it and when.
- Run the administrator-only read-only integrity report, then reconcile ledger totals, cached balances, orders/order lines, refunds, catalog snapshots, inventory movement chains, active holds, receipts, idempotency records, and the audit chain. Investigate every mismatch and unfinished journal before archival or the next opening; the report identifies issues but never applies repairs.
- Review mail runs, stale-pending conversions, every `UNKNOWN` resolution, linked retry, refund exception, inventory adjustment, and active Print Lab hold through the supported workflows with required notes and approvals. Confirm compatibility projections agree with settled outbox attempts, but use `MailOutbox` as the delivery authority.
- Export the records and operating log required by district policy, store them in the approved restricted location, and apply the approved retention/deletion schedule. Do not retain ad hoc local downloads, printed receipts, or student identifiers longer than authorized.
- Conduct a short operator review covering accessibility problems, wrong-student near misses, stock demand, ambiguous timeouts, and workflow changes to make before the next window.

## Public Apps Script contract

The schema-v6 portal retains the v4 Print Lab and schema-v5 inventory RPCs and adds these authenticated capability groups:

- `getSchoolRewardsPrintBootstrap`
- `createSchoolRewardsPrintModel`
- `submitSchoolRewardsPrintRequest`
- `reviewSchoolRewardsPrintRequest`
- `confirmSchoolRewardsPrintQuote`
- `advanceSchoolRewardsPrintRequest`
- `cancelSchoolRewardsPrintRequest`
- `fulfillSchoolRewardsPrintRequest`
- `refundSchoolRewardsPrintRequest`
- asset intake: `uploadSchoolRewardsPrintAsset`, `reviewSchoolRewardsPrintAsset`
- immutable revisions: `resubmitSchoolRewardsPrintRequest`
- moderated catalog: `submitSchoolRewardsPrintPublication`, `reviewSchoolRewardsPrintPublication`, `remixSchoolRewardsPrintModel`
- family communication: `adminUpsertSchoolRewardsGuardian`, `sendSchoolRewardsGuardianDigests`
- district reporting: `getSchoolRewardsDistrictSummary`
- provider-neutral SIS: `previewSchoolRewardsSisSnapshot`, `applySchoolRewardsSisSnapshot`
- catalog metadata and reviewed inventory changes: `adminUpsertRewardsCatalogItem`
- integrity diagnostics: `getSchoolRewardsIntegrityReport`
- pending operation recovery: `recoverSchoolRewardsOperation({ idempotencyKey })`
- resilient bulk mail: `sendSchoolRewardsBalanceStatements`, `sendSchoolRewardsGuardianDigests`, `getSchoolRewardsMailRun`
- mail outcome review: `resolveSchoolRewardsMailDelivery`, `retrySchoolRewardsMailDelivery`
- owned mail workers: `continueSchoolRewardsMailRuns` (one-shot fast path) and `sweepSchoolRewardsMailRuns` (recurring hourly safety path); both are authenticated installable-trigger entry points, not anonymous HTTP endpoints

The existing rewards bootstrap, award, reversal, checkout, catalog/window administration, balance statements, receipts, reconciliation, and audit verification remain available. The provider-neutral SIS snapshot RPCs reuse the same roster validation and idempotency boundaries. A district service can consume the privacy-minimized summary contract with tenant/school scoping without receiving student narratives.

`getSchoolRewardsIntegrityReport` requires an active administrator and accepts optional `holdAgeDays` and `pendingAgeMinutes` review thresholds. It returns `readOnly: true`, counts, named checks, and bounded issue records for ledger/balance drift, order-line/spend/refund linkage, per-item inventory versions/hash continuity, catalog snapshot drift, post-baseline movement links, Print Lab holds, mail run/outbox signatures and state, counters, retry lineage, stale attempts, identifiers/references, and operation journals. The portal's administrator operations panel displays those issues and, only for a pending journal, can confirm `recoverSchoolRewardsOperation({ idempotencyKey })`. Recovery resumes the persisted intent under the original business actor and records the administrator's separate recovery audit event; it does not accept replacement intent or provide abort/rollback.

## Verification and deployment checks

From the AlloFlow workspace:

```powershell
node node_modules\vitest\vitest.mjs run tests\printable_model_module.test.js tests\print_lab_tool.test.js tests\school_rewards_repository.test.js tests\school_rewards_print_portal.test.js tests\school_rewards_integration_contract.test.js
npm run verify:tools
npm run verify:tile-catalog
npm run verify:stem-reachability
npm run verify:stem-render
```

When canonical browser modules change, regenerate checked-in build mirrors with:

```powershell
node build.js --mode=dev
node dev-tools\build_tool_index.cjs
```

Apps Script tests in this repository use a local service mock. They do not replace a domain deployment smoke test, a mail-quota check, a real Drive permission review, or a printer/slicer acceptance test.

## Operational safeguards

- Protect the Apps Script project, repository Sheet, and Drive folder with district least-privilege access. The script attempts to keep created files private; Workspace administrators still control retention and organizational access.
- File signature, length, MIME, extension, and SHA-256 checks reduce confusion and substitution risk but are not antivirus or content-disarm-and-reconstruction. Keep assets private and pending until staff review, and add the district's approved scanning pipeline if policy requires one.
- Treat guardian mappings as education records: verify the address and consent outside the student UI, deactivate stale mappings promptly, and do not infer guardians from a shared surname or household.
- District summaries intentionally omit identities and narrative reasons. Apply small-cell suppression and the district's disclosure review before combining or publishing results from small schools or groups.
- The trigger executes as its creator. If that account changes, disable the schedule, transfer ownership through the approved process, and recreate the trigger.
- Apps Script mail/runtime quotas vary. Use bounded cursor chunks, preserve the receipt quota reserve, and inspect run/outbox status. Never increase throughput by creating duplicate continuation/watchdog triggers or concurrent workers.
- The audit hash chain is tamper-evident, not tamper-proof. Run `verifySchoolRewardsAuditChain()` and investigate breaks with Workspace audit logs.
- Do not put disability, discipline, behavior narratives, protected-category labels, or sensitive student data in reward reasons or model metadata.
- A browser preflight is not a safety approval. Require a trained operator, school-approved printer/material profiles, slicer review, ventilation/enclosure controls, and the school's facilities/EHS process.
- Treat PHA as a material to evaluate, not as a universal environmental claim. Product composition, additives, performance, emissions, disposal conditions, and local end-of-life access all matter.
- Export and retain records under the district's approved student-record schedule. This package is technical infrastructure, not a FERPA or local-policy determination.

## Remix recovery and repeated actions

Private recipe remixes now write a signed intent to the existing Idempotency sheet before creating a model file. The model ID and file name are derived from the original request key. Retries verify and reuse that file, retain one model row, and append the audit event once. Pending remix records are excluded from request-record trimming and appear in the integrity report. No schema migration is required.

If an interrupted file-creation attempt has no visible result, the retry stops instead of creating another file. An administrator must inspect the school-owned Print Models folder and the pending request. Retry the original request when its matching file becomes available; do not delete the request record, substitute another file, or issue a fresh key to bypass the review. Conflicting contents or multiple matching files also stop recovery. This uses Google’s documented [folder-scoped file lookup](https://developers.google.com/apps-script/reference/drive/folder#getFilesByName(String)); live Drive availability still needs a school deployment test.

Administrators can use **Resume private remix** on a valid pending integrity-report row. Recovery validates the original signature and student ownership, reuses verified file/model records, and keeps the result private. The audit preserves the student's creation event and records the administrator's recovery separately. Missing files after an attempted create, duplicate records/files, or altered signatures/content remain blocked for school review. Pending remixes are included in the pending-operation count.

After administrator recovery, the student's next refresh checks the saved request status without replaying it. The old retry key is cleared only when the server confirms completion and the recovered model appears in that student's account. This status endpoint is restricted to the original student.

The remaining Print Lab and guardian controls now serialize submissions and retain an exact hashed request identity after an uncertain response. A later rejection cannot erase an earlier uncertain request. Known first-attempt validation rejections release the draft for correction; unclassified transport errors remain uncertain. Staff quotes reject past expiration dates and point amounts outside the whole-number range 1–100,000 before creating a retry key. Refreshes publish only the newest response, and checkout stops when its availability check is superseded.

## Shopping schedules and quote edits

Shopping-window and quote editors display times in the operator’s local timezone, as labeled beside the inputs. Saves send explicit UTC instants so the Apps Script project’s timezone cannot reinterpret the entered time. An unchanged displayed time preserves the exact stored timestamp, including seconds and a repeated clock hour. Invalid calendar times and times shifted by the browser across a clock-change gap are rejected before saving.

A new quote defaults to seven days from now in local time. Reopening a saved quote retains its deadline, override decision, explanation, material code and preflight summary; changing the price does not silently renew the deadline or remove the review decision. Grams and minutes must be whole numbers from 0 to 100,000; invalid values are rejected instead of rounded or replaced with zero. Blank optional estimates remain zero.

## Intentional v6 execution boundaries

- Bulk student and guardian mail is resumable, bounded, and fail-closed around uncertain outcomes, but it still uses Apps Script `MailApp`, quotas, and owner-created triggers. It is not a delivery receipt service, inbox monitor, marketing platform, or district-wide queue. The signed outbox records application intent and settlement evidence; administrators must investigate `UNKNOWN` outside the portal.
- The school catalog is authenticated, school-scoped, consent-based, and moderated. It is not a public social network, and private print eligibility never depends on publication.
- The local tool can analyze topology, perform explicitly conservative STL cleanup, import comment-only slicer metadata, calculate a configurable advisory quote, create a privacy-minimized `alloflow-print-job/1` ticket, plan simulated capacity, and exercise a simulator adapter. The ticket includes a deterministic SHA-256 self-consistency digest over its normalized payload excluding `integrity`; that digest is not a signature, origin/authenticity proof, staff authorization, or server approval. The tool does not bundle a slicer or send live printer commands.
- Real slicer, geometry-engine, telemetry, and printer adapters are capability interfaces that remain disabled until a district supplies a reviewed engine/device configuration, operator workflow, network controls, and physical safety acceptance. The default adapter cannot contact a network or start hardware.
- Conservative cleanup can remove degenerate triangles and weld near-identical vertices; it cannot guarantee manifoldness, minimum wall thickness, boolean correctness, watertightness, supports, or successful printing. Boolean/remesh/text-to-mesh providers must preserve the same review and hash boundaries.
- The provider-neutral SIS path supports bounded preview and idempotent roster application without embedding vendor credentials. Live vendor APIs, automatic deactivation, cross-school identity matching, and a central multi-tenant district service require district-specific mappings and authorization.
- The guardian digest and repository-level district aggregate are implemented. They do not replace consent/records policy, a district data warehouse, or disclosure review for small groups.

The architectural rationale and roadmap are in [School Rewards + Print Lab design](../../docs/school_rewards_print_lab_design.md).
