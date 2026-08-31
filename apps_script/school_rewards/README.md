# AlloFlow School Rewards - Google Education pilot (schema v4)

This package is the school-owned deployment path for the AlloFlow token economy. Official rewards live in a protected Google Sheet ledger owned by a managed school account. AlloFlow stores only the reviewed Apps Script launcher URL; it does not hold or mutate the official point balance.

Schema v4 extends the private 3D Print Lab workflow with hash-verified GLB/STL intake, immutable revision chains, an opt-in moderated school catalog, guardian digests, privacy-minimized district reporting, and a provider-neutral SIS roster boundary. It remains a reviewed fulfillment system, not an anonymous upload endpoint or an unattended printer controller.

## What the pilot includes

- managed Google Workspace identity; no student code names, shared PINs, or bearer links
- server-enforced `admin`, `staff`, `cashier`, and roster-derived student access
- editable HOWL or school-defined recognition categories and a required student-facing explanation; inactive categories cannot receive new awards
- private category growth levels based on lifetime net awards; purchases do not reduce demonstrated growth, and deactivated categories remain visible in history
- staff point awards with payload-bound duplicate-request protection
- an append-only ledger, cached balances, reversal entries, a script lock, and a tamper-evident audit chain
- an editable prize catalog with point cost, image, active state, and explicit finite-stock preservation/restocking; student cards show affordability and load images lazily with no referrer
- same-record trimester windows with `DRAFT`, `PREVIEW`, `OPEN`, `CLOSED`, and `ARCHIVED` states; configured start/end times gate spending
- cashier checkout that atomically rechecks the open window, current spendable balance, and inventory
- itemized purchase and refund receipts shown in the portal, with each delivery attempt recorded before sending to reduce duplicate-email risk
- administrator-only full-order refunds that restore points and finite inventory
- administrator editing, deactivation, and reactivation of students and staff, with the last active administrator protected
- fully validated CSV roster reimports that update existing students by normalized managed email, plus aggregate reconciliation and optional private balance emails that distinguish ledger, reserved, and available points
- a Print Lab model registry, private asset quarantine/review, linked revisions, point quotes, reservations, status tracking, fulfillment receipts, and print-specific refunds
- an opt-in, staff-moderated school model catalog with consent, reuse terms, reporting, unpublishing, and recipe remix lineage
- administrator-reviewed guardian mappings and bounded positive-progress digests that omit staff notes and transaction-level reasons
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

## Roles and permissions

| Role | Rewards | Print Lab |
| --- | --- | --- |
| Student (roster-derived) | Own balance, progress, explanations, catalog, and orders | Import a package, register/submit an own private model, attach a matching GLB/STL, resubmit a requested revision, see own requests and holds, confirm an own quote, and opt in to school-catalog publication/remixing |
| `staff` | Award points and view the staff reward surface | Verify/reject private assets, review/quote requests, moderate/report/unpublish catalog entries, cancel, queue, start, return to queue with a reason, mark ready, and fulfill |
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

All mutation calls require an idempotency key and run under the repository lock. Core award, correction, checkout, and refund keys are bound to the authenticated actor and normalized request payload, so a key cannot silently be reused for a different amount, student, reason, or cart. The content hash stored on a print request pins review and fulfillment to the registered model version.

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
7. In AlloFlow, open **Project Settings -> School Rewards & Store**, paste the URL, and connect. The same launcher is available from **Leadership Hub**.
8. Open the portal once as each intended role and verify that students, staff, cashiers, and administrators see only their assigned surfaces.

The first setup may ask the owner to authorize Sheets, Drive, mail sending, and trigger management. Private Print Lab folders are created lazily. Uploaded binaries remain private and quarantined from quotation until an authorized staff member records the separate verification decision.

## Upgrading an existing schema v2 or v3 pilot

1. Export or copy the current protected Sheet and Apps Script project according to district backup policy.
2. Replace all four Apps Script files with the v4 versions. Do not mix an older `Portal.html` with a new `Code.gs`.
3. As an existing active administrator, run `migrateSchoolRewardsRepositoryV4()` once from the Apps Script editor. This is the safest no-config-change path: it creates missing protected sheets, appends only `PreviousRequestId` when the existing v3 `PrintRequests` header matches exactly, validates every resulting header, and updates `schemaVersion` to `4`. A mismatched or hand-edited schema fails closed.
4. If the reviewed repository configuration or membership must also change, rerun `setupSchoolRewardsRepository` with the same allowed domain and the complete configuration to preserve; setup invokes the same migration-aware initialization before applying those explicit configuration changes.
5. Confirm `PrintModels`, `PrintRequests`, `PointHolds`, `PrintAssets`, `PrintPublications`, `Guardians`, `GuardianDigests`, and `SisImports` exist with exactly the generated headers.
6. Create a new Apps Script deployment version (or update the managed deployment), then verify the `/exec?api=health` response reports version `4`.

Rerunning setup does not copy or replace the existing ledger, balances, orders, receipts, or roster. It will reject a partially edited or mismatched schema. Supply the existing `schoolName`, `academicYear`, level thresholds, and reviewed members/students because omitted configuration values may be replaced by setup defaults. Never repair the protected transactional sheets by hand.

## Recommended trimester operation

1. Create one trimester window record and keep it `DRAFT` while prizes and print policy are being prepared. Edit that same record for later state transitions.
2. Use `PREVIEW` to show prize information and accept private print submissions without allowing quote confirmation. Making a window `PREVIEW` or `OPEN` closes any older visible window.
3. Award points throughout the trimester with a brief, neutral explanation.
4. Staff first resolve pending GLB/STL assets, then review printable requests and record the approved material, printer profile, slicer/preflight summary, estimates, expiration, and quote. If staff records an `OVERRIDE` decision, a reason is required; client approval never replaces staff review.
5. Set the same window to `OPEN` for shopping and student quote confirmation. If start/end times are configured, checkout and quote confirmation fail closed outside them.
6. Cashiers review the student, itemized cart, points before/after, and final confirmation before completing a purchase. A failed email does not reverse checkout; give the student the on-screen receipt. Never automatically resend a `PENDING` or `UNKNOWN` attempt. An administrator must check the managed mailbox and use the audited delivery-resolution action to mark it `SENT` or `FAILED`; only confirmed failures can be retried, and successful receipts are not duplicated. After a refund, the purchase receipt cannot be resent; recovery applies to the refund receipt. Trained Print Lab staff manage the separate print queue and mark a job fulfilled only after the exact approved model version has been delivered.
7. Send guardian digests only from reviewed active mappings and within the school's communication policy; digest content is deliberately less detailed than the authenticated student view.
8. Close and reconcile the window, verify the audit chain, inspect the privacy-minimized district summary, then archive after review.

Do not edit `Ledger`, `Balances`, `Orders`, `OrderLines`, `Receipts`, `PrintModels`, `PrintRequests`, `PrintAssets`, `PrintPublications`, `Guardians`, `GuardianDigests`, `SisImports`, `PointHolds`, `Audit`, or `Idempotency` by hand.

## Public Apps Script contract

The v4 Print Lab portal retains the v3 RPCs and adds these authenticated capability groups:

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

The existing rewards bootstrap, award, reversal, checkout, catalog/window administration, balance statements, receipts, reconciliation, and audit verification remain available. The provider-neutral SIS snapshot RPCs reuse the same roster validation and idempotency boundaries. A district service can consume the privacy-minimized summary contract with tenant/school scoping without receiving student narratives.

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
- Apps Script mail/runtime quotas vary. Use bounded email batches and inspect recorded failures.
- The audit hash chain is tamper-evident, not tamper-proof. Run `verifySchoolRewardsAuditChain()` and investigate breaks with Workspace audit logs.
- Do not put disability, discipline, behavior narratives, protected-category labels, or sensitive student data in reward reasons or model metadata.
- A browser preflight is not a safety approval. Require a trained operator, school-approved printer/material profiles, slicer review, ventilation/enclosure controls, and the school's facilities/EHS process.
- Treat PHA as a material to evaluate, not as a universal environmental claim. Product composition, additives, performance, emissions, disposal conditions, and local end-of-life access all matter.
- Export and retain records under the district's approved student-record schedule. This package is technical infrastructure, not a FERPA or local-policy determination.

## Intentional v4 execution boundaries

- The school catalog is authenticated, school-scoped, consent-based, and moderated. It is not a public social network, and private print eligibility never depends on publication.
- The local tool can analyze topology, perform explicitly conservative STL cleanup, import comment-only slicer metadata, calculate a configurable advisory quote, create a privacy-minimized `alloflow-print-job/1` ticket, plan simulated capacity, and exercise a simulator adapter. The ticket includes a deterministic SHA-256 self-consistency digest over its normalized payload excluding `integrity`; that digest is not a signature, origin/authenticity proof, staff authorization, or server approval. The tool does not bundle a slicer or send live printer commands.
- Real slicer, geometry-engine, telemetry, and printer adapters are capability interfaces that remain disabled until a district supplies a reviewed engine/device configuration, operator workflow, network controls, and physical safety acceptance. The default adapter cannot contact a network or start hardware.
- Conservative cleanup can remove degenerate triangles and weld near-identical vertices; it cannot guarantee manifoldness, minimum wall thickness, boolean correctness, watertightness, supports, or successful printing. Boolean/remesh/text-to-mesh providers must preserve the same review and hash boundaries.
- The provider-neutral SIS path supports bounded preview and idempotent roster application without embedding vendor credentials. Live vendor APIs, automatic deactivation, cross-school identity matching, and a central multi-tenant district service require district-specific mappings and authorization.
- The guardian digest and repository-level district aggregate are implemented. They do not replace consent/records policy, a district data warehouse, or disclosure review for small groups.

The architectural rationale and roadmap are in [School Rewards + Print Lab design](../../docs/school_rewards_print_lab_design.md).
