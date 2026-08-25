# School Rewards + Print Lab: v4 pilot architecture and safety boundary

## Status and decision

Schema v4 implements the district-pilot slice: students design and preflight locally in AlloFlow, carry a privacy-minimized package into the domain-restricted Google portal, attach a hash-matched private asset when needed, and use a reviewed point-quote/hold/queue/receipt workflow. It also adds immutable revisions, an opt-in moderated school catalog, guardian digests, provider-neutral roster synchronization, and privacy-minimized district summaries. The point ledger remains the system of record. AlloFlow is a design client and does not receive permission to write official balances.

This is one connected experience with two trust domains:

```text
AlloFlow browser Print Lab
  -> local design / import / advisory preflight
  -> conservative repair / advisory pricing / job-ticket simulator
  -> .alloflow-print.json (no automatic network submission)
  -> managed Google sign-in
School Rewards Apps Script portal
  -> server-derived roster identity and role
  -> private model registration and hash-matched asset quarantine
  -> staff asset/request/publication review
  -> point hold / queue / fulfillment / receipt
  -> guardian digest / privacy-minimized district aggregate
Protected Sheet + private Drive + managed Google email
```

The separation prevents an uploaded model or an AlloFlow browser state from bypassing school review, spending points, or controlling a printer.

## Implemented AlloFlow surface

The **3D Print Lab** is registered in STEM Lab and retains four keyboard-operable primary stages:

1. **Design** - manually edit constrained Prim3D primitives, use AI assistance within the same structured recipe model, or locally open GLB/STL.
2. **Preflight** - inspect physical scale, bed fit, triangle/mesh limits, and format-specific warnings.
3. **Materials** - compare qualified material tradeoffs and an educational recipe-volume estimate.
4. **Submit** - record title, purpose, reviewer note, AI participation/disclosure, and download a review package or optional STL.

The same surface now includes explicit Analyze, Conservative Repair, Job Ticket, Capacity Planner, and Simulator panels. They create inspectable evidence for a trained operator; they do not silently transform a model, invoke a network service, or start a printer.

`printable_model_module.js` supplies the shared `printable/1` contract:

- allowlisted `RECIPE`, `GLB`, and `STL` inputs
- a 5 MiB browser file cap, 250,000-triangle cap, 128-mesh cap, physical-size guardrails, and a configurable printer bed profile
- constrained recipe inspection and conservative upper-bound material estimation
- binary/ASCII STL inspection, including degenerate triangles, connected components, signed-volume/winding advisories, and open/non-manifold edges
- opt-in conservative STL cleanup that removes degenerate triangles and welds near-identical vertices while reporting exactly what changed
- GLB v2 metadata inspection, embedded-resource enforcement, and rejection of decoder-dependent content the pilot cannot safely decode
- local-first Three.js r128 GLB parsing without a remote model URL
- SHA-256 calculation for imported bytes
- privacy-minimized, versioned package validation/serialization
- binary STL export after scene transforms, with AlloFlow's Y-up coordinates converted to slicer-oriented Z-up coordinates
- comment-only G-code metadata parsing that never evaluates or transmits machine commands
- configurable advisory point pricing for setup, material, machine time, complexity, quantity, and rounding
- a versioned `alloflow-print-job/1` ticket containing the model hash, reviewed material/profile choices, estimates, and G-code metadata hash, plus a deterministic SHA-256 self-consistency payload digest over every normalized ticket field except `integrity`; it includes no G-code, credentials, account IDs, or student IDs
- a simulator-only printer adapter and deterministic capacity planning; unsupported real adapters fail closed

The job-ticket payload digest detects a mismatch between the normalized fields and the digest stored in that ticket. It is not a digital signature, proof of authenticity or origin, staff authorization, or server approval, and it does not replace independently hashing the model and metadata being reviewed.

The tool never reports that a model is safe to print. It distinguishes blocking client errors from advisory warnings, and its UI says that the school slicer and trained staff remain authoritative.

### Preflight limits

The pilot can detect obvious size, complexity, unsupported-resource, degenerate-triangle, connected-component, and edge/topology problems. Conservative STL cleanup is intentionally narrow and never claims that its output is watertight or safe. The built-in runtime does not perform robust boolean union, voxel remeshing, self-intersection repair, guaranteed wall/detail measurement, support generation, final orientation, or machine-specific slicing. Those operations are represented by disabled capability interfaces so a future reviewed engine cannot bypass hashing and staff approval. Primitive assemblies may contain overlaps and internal faces; their volume is an upper bound rather than a manufacturing quote. GLB bounds based on accessors can miss node-transform details and must be confirmed in the slicer.

## Private handoff contract

The downloaded `.alloflow-print.json` contains:

- contract version, model title/description, and student reviewer note
- source format and a generic source filename for imported files
- scale/unit declaration, SHA-256 content hash when applicable, and advisory preflight summary
- `NONE`, `ASSISTED`, or `MOSTLY_AI` plus a required client-side disclosure when AI was used
- the normalized primitive recipe only for `RECIPE`

It contains no Google account identifier and performs no network call. The portal assigns ownership from the active managed Google session. The package is privacy-minimized, not automatically de-identified: free-text fields can still contain personal data, so the UI warns students to describe the object rather than themselves.

Direct cross-origin mutation is intentionally absent. Apps Script `doPost()` rejects HTTP writes; the signed-in portal invokes server functions with `google.script.run`.

## Format support boundary

| Capability | RECIPE | GLB | STL |
| --- | --- | --- | --- |
| Local AlloFlow creation/import and preview | Yes | Yes, single embedded GLB | Yes, binary or ASCII |
| Browser advisory preflight | Yes | Yes | Yes |
| Model bytes embedded in handoff | Structured recipe only | No | No |
| Server registration | Validated recipe + metadata | Metadata/hash first | Metadata/hash + unit declaration first |
| Authenticated private asset | Structured recipe JSON | Bounded GLB upload with signature/version/length/hash checks | Bounded STL upload with signature/shape/hash checks |
| Repository asset state | `READY` | `PENDING` until staff `VERIFIED` | `PENDING` until staff `VERIFIED` |
| Staff quote in v4 | Allowed after independent staff/slicer review | Allowed only after exact asset verification and operator review | Allowed only after exact asset verification and operator review |

For GLB/STL, model bytes are never embedded in the review package. The signed-in student selects the original file separately; the browser first checks its SHA-256 against the registered package, and the server independently validates the bounded bytes before private storage. The stored asset begins in quarantine-like `PENDING` status. Only an authorized staff decision can mark the exact asset `VERIFIED` and attach it to the model for quotation. Neither students nor the community catalog receive a Drive ID, link, or model bytes.

These checks prevent common file confusion and hash substitution; they are not antivirus, content-disarm-and-reconstruction, or a geometry safety certificate. Districts that require malware scanning must connect an approved scanning service before staff verification. Even for `RECIPE`, the repository stores structured JSON, not a sliced printer job. Optional STL export and every actual print still require a reviewed school file-transfer process and slicer confirmation.

## Google repository data model

Schema v4 retains the three v3 print sheets and adds five protected capability sheets:

- `PrintModels` - immutable-style model versions, ownership, lineage placeholders, source metadata, exact content hash, dimensions, preflight summary, AI disclosure, and private/publication placeholders
- `PrintRequests` - the model hash/window binding, quote, review decision, material/printer IDs, estimates, hold/order links, reasons, and lifecycle timestamps
- `PointHolds` - an amount reserved for one purpose with `ACTIVE`, `CAPTURED`, or `RELEASED` status
- `PrintAssets` - private file metadata, exact hash/size/type, opaque Drive attachment, and staff verification decision
- `PrintPublications` - explicit consent version, reuse terms, moderation state/reason, report count, and timestamps independent from purchase eligibility
- `Guardians` - administrator-reviewed student/guardian mapping, active state, relationship label, and consent timestamp
- `GuardianDigests` - privacy-minimized delivery status keyed by guardian hash and period rather than a copied narrative
- `SisImports` - versioned, idempotent administrator import evidence and bounded create/update/unchanged counts without vendor credentials

Recipe JSON and verified binary assets are stored in private subfolders under the repository folder. New registrations are always `PRIVATE`; publication requires a separate student consent action and staff moderation. Model versions keep `familyId`, `previousVersionId`, and `remixOfModelId`; request revisions add `previousRequestId` and increment `revisionNumber` without overwriting the old record.

The authenticated RPC surface is:

- `getSchoolRewardsPrintBootstrap`
- `createSchoolRewardsPrintModel`
- `submitSchoolRewardsPrintRequest`
- `reviewSchoolRewardsPrintRequest`
- `confirmSchoolRewardsPrintQuote`
- `advanceSchoolRewardsPrintRequest`
- `cancelSchoolRewardsPrintRequest`
- `fulfillSchoolRewardsPrintRequest`
- `refundSchoolRewardsPrintRequest`
- `uploadSchoolRewardsPrintAsset`
- `reviewSchoolRewardsPrintAsset`
- `resubmitSchoolRewardsPrintRequest`
- `submitSchoolRewardsPrintPublication`
- `reviewSchoolRewardsPrintPublication`
- `remixSchoolRewardsPrintModel`
- `adminUpsertSchoolRewardsGuardian`
- `sendSchoolRewardsGuardianDigests`
- `getSchoolRewardsDistrictSummary`
- `previewSchoolRewardsSisSnapshot`
- `applySchoolRewardsSisSnapshot`

Every mutation is idempotent and runs under the same script lock as the ledger and store.

## Roles and views

- **Student:** sees only their own private models, requests, active holds, and `balance/reservedPoints/availableBalance`, plus moderated school-catalog entries; imports a package, attaches an exact own GLB/STL, submits or resubmits in `PREVIEW`/`OPEN`, confirms an own quote only in `OPEN`, and separately chooses whether to publish/remix.
- **Staff:** sees the review/production queue; may verify/reject assets, request revision, reject, quote, moderate catalog submissions, cancel, queue, record an operator start, return a failed/retry job to the queue with a reason, mark ready, and fulfill. Recording `PRINTING` is workflow state, not a hardware command.
- **Administrator:** has staff capabilities, can inspect holds, performs print-specific refunds, manages guardian mappings/digests, reviews provider-neutral roster synchronization, and reads privacy-minimized district aggregates.
- **Cashier:** has no Print Lab access. Physical-store checkout remains separate.

Staff/admin APIs can register or submit on behalf of a student, but the current portal keeps package import on the student surface. That narrower UI is deliberate for the pilot.

## Request state machine

```text
SUBMITTED
  -> REVISION_REQUESTED
  -> REJECTED
  -> QUOTED

REVISION_REQUESTED
  -> SUPERSEDED + linked replacement SUBMITTED

QUOTED
  -> QUOTED (staff may replace an unconfirmed quote)
  -> REVISION_REQUESTED
  -> REJECTED
  -> RESERVED (student confirmation during OPEN; ACTIVE hold created)

RESERVED -> QUEUED -> PRINTING -> READY -> FULFILLED
                         ^          |
                         +----------+  RETURN_TO_QUEUE with staff reason

Cancellation before fulfillment -> CANCELLING -> CANCELLED
Fulfillment recovery             -> FULFILLING -> FULFILLED
Admin refund                     -> REFUNDING -> REFUNDED
```

`CANCELLING`, `FULFILLING`, and `REFUNDING` are persisted recovery states that make retries reconcilable. A requested revision does not edit the old model or request in place: the student registers a new model version linked through `previousVersionId`, then resubmits. The old request becomes `SUPERSEDED`; the new request starts at `SUBMITTED`, links `previousRequestId`, and increments `revisionNumber`.

Print requests may be submitted during `PREVIEW` or `OPEN`, but quote confirmation is allowed only during `OPEN` and before the quote expiration. One active request per student/model/window is enforced, except after `SUPERSEDED`, `REJECTED`, `CANCELLED`, or `REFUNDED`.

## Point and receipt invariants

```text
availableBalance = ledger balance - ACTIVE print holds
```

- No points move at model registration, request submission, review, or quotation.
- Confirmation validates the unexpired quote, open window, unchanged model hash, and current available balance before creating one active hold.
- Normal school-store checkout uses available balance, so reserved points cannot be double-spent.
- An administrative award reversal is blocked if it would consume reserved points.
- Queue transitions require a matching active hold.
- Cancellation releases the hold without writing a spend.
- Fulfillment checks the approved content hash, writes exactly one `SPEND`, rebuilds the balance, captures the hold, creates a linked order/line for the exact model version, and records/sends a purchase receipt.
- Only the print-specific refund can reverse that order. It writes one linked `REFUND`, marks the request/order refunded, and records/sends a refund receipt.

The idempotency repository repairs safe retry boundaries and rejects mismatched operations. The hold, request, order, and ledger are therefore reconciled as one domain workflow rather than four independent UI actions.

## Staff review and school safety gate

A quote records the approved material ID, printer profile ID, estimated grams/minutes, point amount, expiration, and `APPROVED` or reasoned `OVERRIDE` preflight decision. The local pricing policy can suggest a transparent setup/material/time/complexity calculation, but the repository stores the staff-approved quote. These are staff assertions; they are not generated safety certifications.

Before the first student job, the school should document:

- trained printer operators and who can clear faults or remove parts
- approved printer/nozzle/material profiles and slicer presets
- ventilation, enclosure/filtration, electrical, hot-surface, moving-part, fire, and post-processing controls
- a secure method to transfer the reviewed printable file to the operator
- how failed prints, retries, cancellations, delivery, and refunds are recorded

Students submit requests. The default adapter is a local simulator; software does not start or monitor a physical printer. A versioned job ticket can carry normalized manufacturing-review fields, content-hash references, and their self-consistency payload digest to an operator without containing G-code or credentials. The ticket and its digest do not prove who reviewed or approved those fields.

## Materials and PHA position

Print Lab treats materials as a science and lifecycle decision, not a marketing label. The educational order is:

1. Avoid an unnecessary print.
2. Reduce size/material while preserving function.
3. Reprint only a failed component where possible.
4. Match strength, toughness, temperature, emissions, printer compatibility, and verified end-of-life route to the use.
5. Record outcomes rather than assuming a claim is true.

PHA can be an evaluated pilot material for appropriate low-load prototypes, but the product must not call every PHA-labelled filament universally greener, biodegradable in ordinary disposal, or automatically safe. Composition, polymer blends, pigments/additives, crystallinity, processing, part thickness, temperature, microbes, moisture, and actual local disposal infrastructure change the result. `Bio-based`, `biodegradable`, and `compostable` are different claims.

Procurement should review the exact product composition, safety data sheet, printer settings, emissions information, independent/certification evidence for the claimed disposal conditions, and whether the school community actually has that disposal route.

## Privacy and security properties

- Domain-only Google deployment and managed roster identity; no code-name authentication
- Server-derived actor and role on every public call
- No anonymous HTTP mutation endpoint
- Students see only their own private records; cashiers cannot access Print Lab
- No model bytes embedded in a GLB/STL handoff and no remote model URLs
- Authenticated binary upload is bounded, independently hash-verified, private, and pending until staff review; no Drive URL is exposed in a student/community DTO
- Recipe files, uploaded assets, guardian mappings, and the repository remain private by default
- Content hashes bind requests and fulfillment to a model version
- Publication is explicit, school-scoped, moderated, pseudonymous, reportable, and reversible; it is independent from private print eligibility
- Guardian digests omit staff notes and transaction-level narratives; delivery records use a guardian-address hash
- District summaries omit student identities and narrative reasons and are designed for small-cell suppression before broader disclosure
- Free-text length limits, server-side format normalization, idempotency, lock, and audit events
- No public leaderboard, peer balance, student email, or real-name publication surface

These controls support a district review but do not themselves decide FERPA, records retention, accessibility, guardian communication, or printer/EHS compliance.

## Setup, migration, and verification

Fresh setup and schema v2/v3 migration are documented in [the School Rewards README](../apps_script/school_rewards/README.md). For an unchanged configuration, the recommended path is the explicit `migrateSchoolRewardsRepositoryV4()` administrator action: it creates missing v4 sheets, performs only the exact v3 lineage-column migration, and validates headers. Setup uses the same migration-aware initialization when reviewed configuration changes are also required. Neither path replaces existing transactions.

Focused checks:

```powershell
node node_modules\vitest\vitest.mjs run tests\printable_model_module.test.js tests\print_lab_tool.test.js tests\school_rewards_repository.test.js tests\school_rewards_print_portal.test.js tests\school_rewards_integration_contract.test.js
npm run verify:tools
npm run verify:tile-catalog
npm run verify:stem-reachability
npm run verify:stem-render
```

A real pilot also needs a domain sign-in matrix, Drive permission review, mail/receipt smoke test, slicer comparison against known calibration models, printer profile validation, cancellation/refund drill, and audit/reconciliation review.

## Implemented acceptance boundary

| Outcome | v4 status |
| --- | --- |
| Constrained manual/AI recipe design and advisory preflight | Implemented |
| Local GLB/STL preview, limits, hash, unit declaration, and handoff metadata | Implemented |
| Private Google registration and request review | Implemented |
| Staff quote and student point hold | Implemented for `RECIPE`; GLB/STL require a matching staff-verified private asset |
| Queue, fulfillment spend, itemized receipt, cancellation, and admin refund | Implemented |
| Direct AlloFlow ledger write or printer start | Intentionally prohibited |
| Authenticated GLB/STL binary ingestion and hash-verified printable asset | Implemented with a 4 MiB cap, private pending state, and separate staff verification; external malware scanning remains district policy infrastructure |
| Linked revision resubmission and model-version-history portal UI | Implemented with immutable model/request lineage and `SUPERSEDED` history |
| Reviewed school catalog and recipe remix/publishing controls | Implemented with explicit consent, reuse terms, moderation, reporting, and unpublishing |
| Guardian digest and consent mapping | Implemented as an administrator-reviewed, privacy-minimized positive digest |
| SIS and district interoperability | Implemented as bounded provider-neutral roster preview/apply plus a no-PII repository summary; live vendor/central-tenant connectors require district configuration |
| Pricing, geometry repair, manufacturing evidence, and multi-printer planning | Implemented as transparent advisory pricing, conservative STL repair, metadata/job-ticket contracts, deterministic planning, and simulation; external engines and live hardware remain disabled |

## District enablement phases

1. **Security operations:** connect the district-approved malware/content scanning and retention pipeline, document who may move an asset from pending to verified, and test access removal and incident response.
2. **Manufacturing engine:** select and sandbox an open-source slicer/geometry service, pin profile and engine versions, compare known calibration models, and attach only privacy-minimized results through the disabled-by-default capability contract.
3. **Hardware acceptance:** map specific printers into the adapter interface only after network segmentation, operator permissions, emergency/fault procedures, ventilation/EHS review, and a no-student-credential threat model are approved.
4. **District services:** map the provider-neutral SIS and aggregate contracts to the district's vendor, tenant model, consent/records rules, small-cell threshold, and observability process.

Public catalog work must remain independent from a student's right to request a private print. Printer integration must remain independent from earning or spending points.
