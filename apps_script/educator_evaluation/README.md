# AlloFlow Educator Evaluation - district Apps Script repository

This folder is the proposed server and web-portal package for one district-owned
AlloFlow Educator Evaluation repository. The standalone portal, AlloFlow
Leadership Hub, Settings/Desktop launcher, and content-free email links must
all open this same deployment and therefore the same records.

It is intentionally separate from `apps_script/session_mailbox`. The Class
Mailbox's anonymous capability model is useful for classroom participation,
but it is not an authorization model for confidential personnel records.

**If you have set up the Class Mailbox before, note the two deliberate
differences:** the mailbox deploys as "Execute as me / Access: Anyone" and
hands out capability tokens; this portal must deploy as "Execute as me /
Access: users in your domain" and hands out nothing — the signed-in district
account *is* the credential, and the server fails closed without one.

## Quick start (the five steps, in order)

1. **Copy the package** — `Code.gs`, `Portal.html`, `Index.html`,
   `appsscript.json` — into a NEW Apps Script project owned by a district
   account (never personal).
2. **Run setup once** from the editor as that account:
   `setupEvaluationRepository({...})` with your domain, bootstrap admin,
   educators, members, and evaluator assignments (full example below).
3. **Deploy → New deployment → Web app** with **Execute as: Me** and
   **Who has access: users in your domain**. Copy the `/macros/s/…/exec` URL.
4. **Verify** — run `verifyDeploymentIdentity()`, then open the URL as an
   evaluator account and as a teacher account; each should see only their
   own records, and a personal Gmail account should see "Access unavailable."
5. **Hand out the URL** — staff paste it into AlloFlow's Project Settings
   (which then launches the portal instead of the demo) or bookmark it.

Every step is expanded with cautions in "Install and bootstrap" below.

## Released evaluation summaries (educator's copy)

When an educator's cycle is finalized, an evaluator or administrator first
clicks **"Review & share released summary"**. A server-generated review names
the exact educator member account, finalization time, intended access, and
whether the operation will create, verify, or replace a document. Nothing is
shared until the evaluator checks the disclosure confirmation. The short-lived
review token is actor-, record-, recipient-, and revision-bound. The server
then:

- generates a plain-language, strengths-first Google Doc summary (strengths
  and the evaluator's own evidence-linked rationale first, then the ratings
  with the weighting arithmetic explained in words, then growth areas framed
  with support rights, then a transparency section listing exactly what the
  summary was built from);
- files it in a `Released evaluations` subfolder of the repository. Before any
  document ACL changes, the server re-reads that folder and verifies the
  deployment owner, its one exact repository parent, non-trashed state,
  private sharing, disabled editor resharing, and no named viewers,
  commenters, or editors;
- reconciles that single file to an exact **private, view-only named-viewer** allowlist:
  the educator's one active district member account plus every active assigned
  evaluator whose member account is active. The deployment owner is implicit;
  unassigned administrators are not added as document viewers. Every named
  editor is removed or demoted, stale viewers are removed, broad/link/domain
  sharing is reset to private, and the file is re-read before success. Because
  Drive lists commenters with viewers, each intended account's permission is
  also checked directly and refreshed to `VIEW` when necessary. This
  action does not send the
  separate content-free portal notice; Google may still surface Drive access in
  its own activity or notification interfaces;
- stamps the educator record (`releasedDoc`) and the audit log
  (`RELEASED_DOC_SHARED`). The pointer is server-owned: client saves can
  never set or clear it. A server-owned `releaseRegistry` retains document IDs
  and managed ACL metadata across annual rollover and is omitted from teacher
  and evaluator workspace projections.

New annual finalizations also require a written rationale and at least one
eligible supporting-record reference for every rated domain. References are
canonical tokens resolved server-side against that educator's published
walkthroughs, published formal-observation evidence, or locked SPM/SLO records;
the finalized provenance is copied into the immutable cycle snapshot and the
released summary.

Unpublished walkthrough drafts can be corrected or discarded before release.
Discard is an explicit `DRAFT_DISCARDED` mutation: the server permits deletion
only for the named unpublished walkthrough, rejects published or commented
records, preserves every unrelated omission, and records the event in audit.

The document states explicitly that the portal remains the authoritative
record. A later **Review released-summary access** operation verifies or
restores permissions on the same immutable document instead of creating a
duplicate. A replacement is generated only after the recorded file is opened
successfully and positively verified as trashed. Before replacement, the old
file is verified private and owner-only, retained in Drive trash and superseded
history, and registered as `retired`; later recovery passes keep retired files
owner-only if someone restores them. An invalid pointer, denied lookup, or
ambiguous file state blocks replacement and requires district-IT review.

New document and managed-folder IDs are journaled immediately after creation.
If an operation fails before commit, the server removes named access, disables
editor resharing, makes the artifact private, trashes it, and re-reads that
terminal state. An unconfirmed cleanup or workspace commit sets
`EE_RELEASE_RECOVERY_REQUIRED`, appears in Setup health, and must be resolved
before another attempt. Membership and assignment changes write an ACL intent
before changing their directory row, then reconcile every registered current
and historical release in batches of at most 20. For each pass, an administrator
first calls `reviewPortalReleasedEvaluationAccessRecovery({teacherId?})`,
inspects the content-free scope, counts, and allowed effects, and then confirms
with `reconcilePortalReleasedEvaluationAccess({reviewToken,
acknowledgeAccessPolicy:true})`. The read-only review changes nothing. Its token
is actor-, scope-, and current-state-bound, single-use, and cached for up to ten
minutes. Apps Script may evict it earlier, in which case the administrator must
run a fresh review; confirmation revalidates it before any mutation. A teacher-scoped pass
cannot perform global released-folder recovery or change folder-wide state. The
global reviewed workflow can repair known permission drift. Released-folder
owner, location, or retention ambiguity and any uninspectable principal remain
manual-review-only. Large registries require a fresh review and confirmation
for each bounded pass until status is `completed`.
Unknown invalid pointers and a `queue_overflow` marker are deliberately not
auto-cleared: district IT must reconcile the Drive inventory and audit trail,
then repair the script property under the district's incident procedure.

This built-in reconciler intentionally supports only documents owned by the
deployment account in its dedicated `Released evaluations` My Drive folder.
It fails closed when owner, parent, or named-principal identity cannot be
verified. Google Drive permissions inherited from a shared drive or managed by
Workspace-wide/group policy cannot always be removed or proven absent through
Apps Script's built-in Drive service; such artifacts require district-admin
review rather than a successful automated result.

Related behaviors added alongside:

- **Educator's statement** — a teacher-owned "in your own words" field on
  their record (the ONLY teacher-writable field there), editable until
  finalization and then frozen. Evaluator saves can never modify it. When
  present it leads the released summary, marked "no one edited it."
- **Open receipt** — when the educator clicks the portal's summary link,
  `recordReleasedSummaryOpened` stamps `releasedDoc.openedAt` and an audit
  event. It is labeled a LINK click; Drive cannot report actual reading.
- **Setup health and reviewed ledger repair** — administrators get a read-only
  portal card running the bootstrap verifications (domain, deployment URL,
  folder access, workspace integrity, unresolved release/rollover recovery,
  deployment-owner continuity, member counts, and educators lacking accounts
  or assignments) without opening the script editor. Ledger parity is checked
  by content, not only by ID: all eight `Messages` cells, the canonical `Audit`
  payload columns 0–9, and all thirteen `Snapshots` cells are compared with the
  canonical workspace. Audit previous-hash/hash columns are verified separately
  by the chain check. Ledger-only Message and Audit rows are reported as
  legitimate retained conversation or operation history; they are not deleted.
  Duplicate IDs, a same-ID content mismatch, an unexpected Snapshot, ambiguous
  configuration state, or an outbox ID collision require district-IT review.
  A parity or typed-recovery inspection that is unavailable or requires manual
  review is reported as **Needs attention**, never as a healthy derived-ledger
  result.
  Health remains read-only and content-free: it reports counts plus recovery
  age/category, the revision and current audit-verification result, the last
  clean reconciliation time, and remaining send-mail quota only when that quota
  can be read safely. Repair requires a separate actor/revision/fingerprint-
  bound review token cached for up to ten minutes and an explicit
  acknowledgment. Apps Script may evict the token earlier and require a fresh
  review. There is no
  “clear anyway” path.
- **Reviewed, at-most-once notices** — the sender first reviews the exact
  server-resolved district recipient and confirms a generic, content-free
  message. Email contains only the validated portal `/exec` URL: no educator
  identifier or record route is placed in mail, and that exact validated URL
  is shown in the confirmation review. The review token is also the durable
  server-side operation identity, but the browser does not persist it. A lost
  response can be recovered after reload from the educator-and-target delivery
  scope across currently authorized actors without sending the notice again. If
  a teacher has multiple active assigned evaluators, the
  review returns their authorized managed accounts and requires the sender to
  choose one explicitly before a token is issued. Multiple active teacher
  accounts for one educator are never offered as choices; that directory
  conflict fails closed for district-IT repair.

## Important compliance boundary

As of the Google Workspace Services Summary last modified July 16, 2026,
Apps Script is listed as a Workspace Core Service. That fact, a Workspace for
Education license, Google sign-in, Gmail, Drive, or Gemini Canvas does **not**
automatically make this custom application or a particular evaluation process
FERPA-compliant.

Before real records are entered, the LEA must approve at least:

- this source code, deployment owner, OAuth scopes, domain access, and the
  school-official/legitimate-educational-interest basis for use;
- evaluator assignments and membership lifecycle, including prompt removal of
  transferred or separated staff;
- personnel-record and student-data minimization rules, retention/deletion,
  legal hold, backups, incident response, monitoring, and breach procedures;
- whether artifact links are permitted and how their independent Drive sharing
  is controlled; this service does not upload or re-share artifacts;
- the applicable Pennsylvania forms/process and permission for any licensed
  Danielson rubric content. This repository does not bundle proprietary rubric
  descriptors.

The Workspace administrator must enable Apps Script for the relevant
organizational unit and approve the application's scopes as district policy
requires. Do not move the deployment to a personal Google account to bypass an
administrative restriction.

## Security model

- The manifest declares `DOMAIN` access and `USER_DEPLOYING` execution. Deploy
  as the district service owner and choose **only users in the district
  domain**. Never deploy this service as "Anyone" or "Anyone, even anonymous."
- Every operation calls `Session.getActiveUser().getEmail()`, normalizes it,
  checks the configured domain, checks an active `Members` row, and fails
  closed if identity is blank. The client cannot submit an actor email or role.
- Roles are `admin`, `evaluator`, and `teacher`. Evaluator access additionally
  requires an active `(TeacherId, EvaluatorEmail)` row in `Assignments`.
- Links and query parameters such as `?view=walkthroughs&teacher=...&record=...`
  are navigation hints only. They never grant record access.
- The central workspace JSON lives in a private Drive folder owned by the
  deployment account. A private, protected Spreadsheet holds membership,
  assignments, version metadata, append-only message indexes, reserved receipt
  storage, audit rows, and finalized snapshots. There is no generic sheet/file API.
- Sensitive operational Drive assets are not trusted merely because they were
  private when created. Before reuse, the service removes non-owner viewers and
  editors and verifies private link sharing plus disabled editor resharing for
  the `Authorized exports`, `Annual archives`, and `Restore rehearsals` folders
  and their relevant files. It also verifies the deployment owner, exact managed
  parent, and non-trashed state; privacy without that custody match is not
  sufficient. A configured folder that is missing or cannot be verified fails
  closed; the service never silently creates a replacement and never creates
  the next artifact or advances the year after that failure.
- All mutating operations use a script lock. Whole-workspace portal saves also
  require an expected revision; a stale browser gets a `conflict` response
  instead of silently overwriting newer work. The portal then fetches the
  authoritative revision, compares base/attempted/current values, loads the
  district copy, and offers replay only for non-overlapping fields; overlapping
  fields always keep the district value. Setup, membership/assignment
  administration, and reviewed content-free notification dispatch are
  serialized but are not workspace-revision operations. After a request acquires the lock,
  the server resolves the active session identity and directory authorization
  again; authority held when a request entered the queue is never assumed to
  remain valid when it begins mutating.
- Canonical saves first stage a private `workspace.pending.json` commit journal.
  The service can finish an interrupted Drive JSON plus Spreadsheet revision/hash
  commit only through the reviewed recovery workflow when the pending envelope
  and active state prove that completion is safe. Messages, audit rows, and
  snapshot rows are idempotent indexes rebuilt from canonical actor-stamped
  workspace records. Parity compares every projected value: all 8 Message
  columns, Audit payload columns 0–9 (with the hash chain validated separately),
  and all 13 Snapshot columns. A save that commits canonical data but cannot
  refresh an index returns success with `reconciliationPending: true`; the typed
  recovery journal records the affected projection. A later successful save or
  the reviewed administrator reconciliation action retries repair and clears
  only work it verifies.
  Direct operations whose audit row fails retain the exact canonical audit
  entry in a bounded outbox, so replay uses the original event ID and does not
  duplicate an already-created export, rehearsal candidate, or directory
  change. A notification additionally reserves and verifies a sealed,
  capacity-bounded delivery intent before calling `MailApp`; pending workspace
  commits, exhausted mail quota, and unavailable intent or audit-outbox
  capacity fail before dispatch. The exact recipient, directory fingerprint,
  generic message/link fingerprint, initiating actor, educator, and target are
  bound to the reviewed operation. Its deterministic `NOTIFICATION_SENT` Audit
  receipt is replayed under the same ID when only the audit sink failed. Exact-
  token lookup is evaluated before mutable operation gates, so a completed or
  unresolved outcome remains replayable even if later repository recovery is
  required. Before a fresh dispatch, the send lock rechecks the educator-and-
  target delivery scope and the review's bound prior canonical Audit ID; any
  intervening completion makes the review stale. Competing pre-issued reviews,
  including reviews issued to different authorized actors, therefore cannot
  both dispatch. After a browser reload, tokenless lookup searches the delivery
  scope across currently authorized actors. If execution stopped after dispatch
  began but before delivery could be confirmed, the result is
  `delivery_unknown`; the service deliberately does not resend automatically,
  and district staff must resolve the sealed intent through the documented
  manual-recovery process.
  Ledger-only Message and Audit rows remain visible as
  legitimate retained/operation history. The service never deletes them during
  reconciliation. Duplicate IDs, same-ID payload differences, unexpected
  Snapshot rows, ambiguous configuration projections, and outbox ID collisions
  are nonrepairable automatically and route to district IT.
- A teacher receives a filtered copy. A subsequent save is merged only into
  that teacher's authorized part of the canonical workspace; omission can
  never delete another educator's records. Submitted content and append-only
  comments are protected by role-aware server checks. Once an educator cycle
  is finalized/released, the server closes the entire current cycle: educator
  fields, walkthroughs, formal observations, SPMs, and comments must remain
  byte-for-byte equivalent apart from ignored server touch timestamps. The
  archive-first annual rollover is the only path that opens a clean next-year
  cycle; an ordinary save cannot add a post-finalization record or comment.
- The client saves explicit changes and offers manual Refresh after a confirmed
  save. The current pilot is not real-time synchronized. While a save RPC is in
  flight, mutation controls pause until the canonical server response is
  applied, preventing provisional milestone timestamps from entering a later
  whole-workspace save.
- Authors, roles, transition timestamps, audit descriptions, and audit-chain
  hashes are server-generated. Client-provided audit rows are discarded.
- Email contains only a generic "portal activity" notice and the validated
  portal root URL. Evidence, ratings, comments, educator names, record
  identifiers, and deep-link routes are not sent through email. The exact
  server-resolved district recipient is shown before confirmation; a client
  cannot substitute an address.
- In a deployed portal, the UI requests formal-observation peer context through
  `getPortalCohortStats(...)`; it does not calculate the cohort from browser
  workspace data. The endpoint derives the actor on the server, requires access
  to the selected educator, and limits peers to active educators visible to
  that actor in the same building and employee type. Teachers receive only a
  suppressed `teacher_view` response.
- The server uses finalized formal observations in the requested date range,
  excludes the selected educator, lets each distinct eligible peer contribute
  one mean, and returns the median of those peer means. Fewer than 10 peers are
  suppressed without disclosing the small-group count. The UI receives only
  the role-filtered aggregate, never raw peer records or a broader cohort.

This is defense in depth, not a certification. Apps Script's active-user email
behavior must be validated in the district's actual tenant and deployment. If
`verifyDeploymentIdentity()` or the portal cannot return the signed-in managed
account, stop the pilot; do not add an email field or URL token as a fallback.

## Install and bootstrap

Use a district-controlled Workspace account intended to own this service.

1. Create a standalone Apps Script project. Add `Code.gs`, `Index.html`, and
   `Portal.html` from this folder and replace its manifest with
   `appsscript.json` (Project Settings -> show manifest file).
2. Review the source and scopes with district IT/security. Apps Script uses the
   full Drive scope because it owns a private repository file/folder; it never
   searches or exposes unrelated Drive files.
3. Temporarily add a setup function like the following, substitute district
   values, run it once from the editor, record the returned repository IDs,
   and then delete the temporary function:

```javascript
function runDistrictSetupOnce() {
  return setupEvaluationRepository({
    allowedDomain: 'example.k12.pa.us',
    bootstrapAdmin: 'principal@example.k12.pa.us',
    adminDisplayName: 'Principal',
    organization: 'Example School District',
    building: 'Example School',
    academicYear: '2026-27',
    teachers: [
      {
        id: 'teacher-001', code: 'T-001', name: 'Educator Name',
        building: 'Example School', assignment: 'Grade 6',
        employeeType: 'professional', buildingData: true,
        teacherSpecificData: true, evaluator: 'Evaluator'
      }
    ],
    members: [
      { email: 'principal@example.k12.pa.us', displayName: 'Principal', role: 'admin', active: true },
      { email: 'evaluator@example.k12.pa.us', displayName: 'Evaluator', role: 'evaluator', active: true },
      { email: 'teacher@example.k12.pa.us', displayName: 'Educator', role: 'teacher', teacherId: 'teacher-001', active: true }
    ],
    assignments: [
      { teacherId: 'teacher-001', evaluatorEmail: 'evaluator@example.k12.pa.us', active: true }
    ]
  });
}
```

The first `bootstrapAdmin` must be the account running setup. Each teacher
member and assignment must reference an ID declared in `teachers`; setup fails
closed on a missing reference. IDs are opaque application identifiers, not
emails or employee numbers.

To add staff later, an authorized administrator first creates the educator's
cycle/profile in the portal's **Staff** area. Then open **Setup -> District
operations center** to create or update the managed account and evaluator
assignment. Each change shows a server-generated review token cached for up to
ten minutes and requires an explicit legitimate-educational-interest
acknowledgment. Apps Script may evict the token earlier and require a fresh
review. District IT automation must use the same reviewed pair:
`reviewPortalDirectoryChange({kind, candidate})`, followed by
`performPortalDirectoryChange({reviewToken, acknowledgeImpact:true})`.
There is no public lower-level member or assignment mutator. Re-running
`setupEvaluationRepository` does not add `teachers` to an existing
workspace, and there is deliberately no arbitrary table-edit endpoint.

4. Deploy -> New deployment -> **Web app**. Confirm **Execute as: Me** (the
   district deployment owner) and **Who has access: users in your domain**.
   The manifest encodes the same intended boundary, but the deployment screen
   and Workspace admin policy are authoritative and must be checked.
5. Open the `/exec` URL in separate principal and teacher managed accounts.
   Verify the principal sees only assigned/all authorized staff, the teacher
   sees only their own published/assigned records, and an unlisted same-domain
   account receives "Access unavailable." Run `verifyDeploymentIdentity()`
   from each test context if diagnosing identity.
6. Re-run `setupEvaluationRepository` as the bootstrap administrator with the
   same values plus `webAppUrl: 'https://script.google.com/.../exec'`. This is
   the only URL placed in notification email.
7. Update AlloFlow's Leadership Hub, Settings/Desktop launcher, and any
   principal bookmark to that one reviewed `/exec` URL. Do not use LAN sharing
   or a public Canvas link as the official personnel-record transport.

For updates, Deploy -> Manage deployments -> edit -> **New version**. Test in a
non-production repository first and retain the previous Apps Script version as
the rollback point.

## Storage schema

The private index Spreadsheet contains:

| Sheet | Purpose |
| --- | --- |
| `Config` | non-secret tenant/service configuration |
| `Members` | managed email, display name, role, teacher ID, active flag |
| `Assignments` | explicit teacher-to-evaluator authorization |
| `Workspace` | revision, private Drive file ID, SHA-256, update actor/time |
| `Messages` | append-only record conversations; parity compares all 8 columns |
| `Receipts` | reserved for a future reviewed receipt workflow; the bundled portal records current lifecycle milestones through `saveWorkspace` |
| `Audit` | server events; payload columns 0–9 are compared with canonical events and previous-hash/hash columns are chain-verified separately |
| `Snapshots` | immutable finalized rating values; parity compares all 13 columns used for longitudinal/cohort statistics |

The private Drive folder also contains `workspace.json` and an internal
`workspace.pending.json` recovery journal. Do not share or edit either file.

### District operations center

The administrator-only operations center in **Setup** replaces the routine
"open Apps Script and run a helper" path for recurring work. Together with the
reviewed Workspace setup card, it provides five
review-before-confirm workflows:

1. **District workspace configuration.** Edit a browser draft, then call
   `reviewPortalWorkspaceConfiguration({config})` to receive a server-produced
   current-versus-proposed list and impact counts. Only
   `performPortalWorkspaceConfiguration({reviewToken,
   acknowledgeImpact:true})` can commit it. Generic workspace autosave rejects
   administrator configuration changes. The confirmed commit is audited, and
   existing frozen framework/weight snapshots are not recalculated.
2. **Accounts and evaluator assignments.** Load the current authorized
   directory, enter a managed-domain member or educator/evaluator assignment,
   review the exact normalized values, confirm legitimate educational
   interest, and apply. A stale or already-used review cannot be replayed.
   Bootstrap administrators cannot be deactivated or demoted, and at least one
   active administrator is always required.
3. **Annual cycle due-date schedule.** Choose a date, optional exact building
   filter, and either missing dates or all open cycles. Review the affected
   count and sample first. Inactive and finalized educators are always skipped;
   a workspace change invalidates the review.
4. **Audited private exports.** Choose roster/status CSV, one educator's full
   portal record, or a full repository backup; record a specific authorized
   purpose; review the scope; and acknowledge district destination, retention,
   legal-hold, and official-record procedures. The server creates a private
   file in `Authorized exports`, re-reads and hashes it, and records the action
   in the canonical audit. Creating the file neither shares it nor makes it the
   official record. The server journals the exact reviewed operation before
   creation. If the browser loses the response, keep the original review open
   and choose **Check exact export outcome**; the same token returns the one
   verified artifact and audit result instead of creating a duplicate. Never
   prepare a new export review while that outcome is pending. The bounded
   custody inventory reserves capacity before issuing a review: 249 existing
   exports may create file 250, while a folder already holding 250 refuses the
   review before any token, journal intent, ACL repair, or file is created.
5. **Archive inventory and restore rehearsal.** Re-verify annual archives,
   compare archived and current counts/revisions, and create a separate private
   restore candidate in `Restore rehearsals`. A rehearsal never writes to or
   replaces the live workspace. District IT must inspect and test the candidate
   under its approved recovery procedure before any real recovery decision. A
   lost response is recovered only through **Check exact candidate outcome** in
   the unchanged review; it verifies and returns the existing candidate. The
   destination inventory uses the same bounded admission rule as exports: 249
   existing candidates may create item 250, while 250 refuses a new review
   before generating or caching a token. Confirmation binds and rechecks the
   exact inventory under the repository lock; exact replay of an already
   journaled item 250 remains available.

All five workflows derive the acting identity on the server. Review tokens are
actor-bound, one-operation, state-bound, and cached for up to ten minutes;
Apps Script may evict them earlier and require a fresh review. Export and
restore-candidate tokens also act as idempotency keys: replay is accepted only
to verify and return the exact journaled operation. Setup health reports pending
or manual artifact recovery without exposing file IDs or content. The sealed,
integrity-checked artifact journal is the recovery authority: a missing advisory
marker cannot hide a pending entry, and a stale marker cannot keep an
all-completed journal blocked. Unrelated mutations fail closed while a pending
or ambiguous entry exists. The controls do not replace district approval,
records custody, incident response, or a tested backup/restore plan.

Workspace-ledger repair has its own guarded sequence: **Run setup health**,
choose **Review ledger repair**, inspect the server-produced counts and exact
allowed effects, check the repair acknowledgment, then choose **Confirm
reviewed repair**. The review changes nothing, and its token is cached for up
to ten minutes; earlier cache eviction requires a fresh review. If the review
names a duplicate, same-ID mismatch, unexpected Snapshot,
configuration ambiguity, outbox collision, or audit-chain problem, confirmation
is unavailable; preserve the report and route it to district IT. Never edit a
ledger row or clear a recovery marker merely to make health appear green.

### Annual rollover and continuity

The Setup tab now provides an administrator-only, archive-first annual rollover.
It is deliberately staged and recoverable rather than described as an atomic
transaction:

1. `reviewPortalAnnualRollover({nextAcademicYear})` validates an exactly
   one-year advance, reads the current revision, counts active/finalized/open
   cycles and current records, and returns an actor/revision/count-bound review
   token cached for up to ten minutes. Apps Script may evict it earlier and
   require a fresh review. It also performs a read-only bounded Annual archives
   inventory: 249 existing archives may create item 250, while 250 refuses the
   review before a token or recovery intent exists. No Drive or workspace data
   changes during review.
2. The administrator confirms district custody (backup/restore, retention,
   legal hold, official-record handoff, and owner responsibility) and separately
   acknowledges any open cycles. The server rejects missing acknowledgments.
3. `performPortalAnnualRollover(...)` first persists and reads back a sealed,
   deterministic archive intent. Only then may it create the private JSON file
   in the repository's `Annual archives` subfolder. It re-reads the file and
   verifies its exact identity, content hash, operation key, custody, and
   embedded workspace hash before any active-state write. If Drive created the
   file but its response was lost, the recovery recheck finds and reuses that
   one deterministic file instead of creating a duplicate.
4. The active workspace advances one year. Roster/profile identities,
   membership, evaluator assignments, immutable `cycleSnapshots`, and audit
   history are retained. Due dates, cycle status, current ratings/scores,
   released-document pointers, educator statements, walkthroughs, formal
   observations, SPMs, and comments are reset for clean new-year cycles.
5. Existing released Google Docs are **never deleted or unshared** by rollover.
   Their old pointers and complete current-year context remain in the verified
   archive; the documents remain subject to district retention/legal-hold rules.

If archive creation or its response is interrupted, or the active commit or
its derived Audit/Config projections are not confirmed,
`EE_ROLLOVER_RECOVERY_REQUIRED` blocks every new ordinary mutation and external
side effect, not only another rollover review. That includes saves, receipts,
notifications, releases, directory/configuration/schedule changes, exports,
restore-candidate creation, and released-summary access reconciliation. Read-
only inspection, Setup health, workspace-ledger repair, and the explicit annual
recovery recheck remain available. `reconcilePortalAnnualRollover()` runs under
the script lock, re-verifies or completes the exact journaled archive, and
clears the block only when it can prove either (a) the reviewed new-year commit,
its one canonical Audit row, and its one academic-year projection all exist,
or (b) the old revision/year is completely unchanged and the verified archive
is ready for an explicitly reviewed retry. Any mixed, duplicated, mismatched,
or unsealed state remains blocked for manual district-IT recovery. The server
also seals and read-back-verifies `EE_LAST_ROLLOVER` before clearing the
recovery marker. If only the final browser response is lost, a later recovery
recheck verifies that receipt against the active workspace, exact archive,
canonical Audit row, and Config projection and returns the same completed
outcome. The operation does not
transfer Apps Script or Drive ownership, choose a retention period, satisfy a
legal hold, or copy records into an official HR/records system; those remain
district-controlled procedures.

Sheet protection prevents ordinary edits through the Spreadsheet UI, and the
files are set private. The deployment owner and Workspace administrators still
have technical authority, so administrative access and audit procedures remain
part of the LEA control environment. Audit hash chaining detects ordinary row
alteration; it is not an external write-once log. A higher-assurance rollout
should export audit events to a district-controlled immutable logging system.

## Portal RPC contract

The HTML portal uses `google.script.run`:

- `getPortalBootstrap()` / `bootstrap()` -> `{ok, workspace, revision,
  version, currentUser, deployment}`. `deployment.portalUrl` carries the
  deployed `/exec` address so the portal's Share by QR card can encode the
  district's own entry point; it is the same URL the user already opened.
- `savePortalWorkspace({workspace, expectedVersion, mutation})` /
  `saveWorkspace(...)` -> `{ok, workspace, revision, version}` or a conflict
- `reviewPortalNotification({teacherId, target:'teacher'|'evaluator',
  recipient?})` -> either `{ok:true, status:'recipient_selection_required',
  recipients:[{email, displayName}]}` or `{ok:true, review:{token, expiresAt,
  teacherId, target, recipient, recipientDisplayName, contentFree:true,
  genericPortalLink:true, portalUrl}}`. Read-only. `portalUrl` is the exact
  validated Apps Script `/exec` root that will appear in the generic email.
  When several active assigned
  evaluators are authorized and `recipient` is omitted, it returns the bounded
  authorized choices without issuing a token. Resubmit the review with one
  listed email; the server verifies that choice instead of trusting an
  arbitrary client address. More than one active teacher account for the same
  educator is a `manual_recovery_required` directory conflict, not a selection
  list. A resolved review displays the exact recipient, generic content-free
  message, and validated portal root URL. It also preflights the pending-commit gate, remaining
  mail quota, and bounded notification-intent/audit-outbox capacity. The token
  is bound to the actor, educator, target, recipient, directory fingerprint,
  and message/link fingerprint and becomes the durable operation identity.
- `sendPortalNotification({teacherId, target, reviewToken, acknowledged:true})`
  -> `{ok, sent, target, status, recoveryPending, auditPending, preDispatch?,
  ...}` where `status` is `completed`, `recovery_pending`, or
  `delivery_unknown`. An exact known operation is replayed before mutable
  operation gates. For a fresh operation, the server reauthorizes and repeats
  every preflight under the script lock, rechecks the educator-and-target
  delivery scope and review freshness, then writes and verifies the sealed
  intent before dispatch. `recovery_pending` means delivery was confirmed but
  its deterministic Audit receipt is in `audit_pending` state; reconcile the
  exact queued entry and do not resend. `delivery_unknown` means dispatch began
  but the server cannot safely prove its outcome; automatic resend is prohibited
  and administrator review is required. `manual_recovery_required` is an error
  code, not a success status. A rejected response marked `preDispatch:true`
  proves only that this attempt did not begin mail dispatch. The portal still
  performs a tokenless delivery-scope lookup and unlocks only when that lookup
  returns `no_unresolved` or exact-token `not_started`. A recovered completed,
  pending, unknown, ambiguous, or failed scope lookup remains locked.
- `getPortalNotificationOutcome({teacherId, target, reviewToken?})` ->
  `{ok, sent, target, status, recoveryPending, auditPending, ...}`.
  It reauthorizes the caller and returns a durable outcome without dispatching
  mail. Supplying the token performs an exact operation lookup and may return
  `not_started`. Omitting it searches for one unique unresolved operation in
  the educator-and-target delivery scope across currently authorized actors;
  the initiating actor remains sealed for authorization and Audit attribution,
  but does not hide the same delivery from another authorized actor. An
  ambiguous unresolved scope fails closed. With no unresolved operation, the
  latest canonical notification Audit receipt returns `completed` with
  `priorCompletion:true`, `repeatEligible:true`, and `completedAt`; no canonical
  history returns `no_unresolved`. The portal displays a prior completion and
  requires the explicit **Prepare another reviewed notice** action before
  starting a new review. Repeated perform/outcome calls never create another
  delivery or Audit receipt.
- `getPortalCohortStats({teacherId, metric:'overall'|'d1'|'d2'|'d3'|'d4', from?, to?})`
  -> a permission-filtered finalized-formal-observation aggregate. Each eligible
  peer contributes one mean; fewer than ten peers are suppressed without
  disclosing the small-group count. Annual-cycle snapshots are not mixed in.
- `reviewPortalReleasedEvaluationShare({teacherId})` -> `{ok, review:{token,
  expiresAt, educatorName, recipient, finalizedAt, action, ...}}`. Read-only;
  evaluator or admin only. The token is cached for up to ten minutes and is
  bound to the authenticated actor and current repository revision; earlier
  cache eviction requires a fresh review.
- `sharePortalReleasedEvaluation({teacherId, reviewToken})` -> `{ok, status,
  doc:{id, url, sharedAt}, access, created, idempotent, recoveryPending,
  auditPending, separatePortalNoticeSent:false}`. Evaluator or admin only, and
  only after finalization plus a current disclosure review. It grants an exact
  private VIEWER set to the active educator and active assigned evaluators.
  Repeating the reviewed workflow verifies the existing file rather than making
  a duplicate. Only a positively verified-trashed recorded file can be replaced
  with superseded history; an inaccessible or ambiguous file blocks. New files
  and folders are journaled immediately and quarantined on pre-commit failure.
- `recordReleasedSummaryOpened({teacherId})` -> `{ok, status, openedAt,
  auditPending, recoveryPending}` or `{skipped:true}`. The educator's own open
  receipt; an evaluator calling it is skipped rather than recorded, and a
  second open does not overwrite the first. Its workspace event and Spreadsheet
  audit row share one canonical ID and are replayed idempotently after a pending
  commit or audit-sink failure.
- `getPortalSetupHealth()` -> `{ok, checkedAt, checks}`. Admin-only, read-only
  deployment self-check for the Setup tab: domain lock, repository spreadsheet
  and workspace files, ownership continuity, release/rollover recovery, typed
  secondary-ledger recovery, sealed private-artifact recovery, membership, and
  evaluator assignments. It never
  completes a pending commit or changes a ledger. It compares all 8 Message
  cells, Audit payload columns 0–9, and all 13 Snapshot cells; audit hash-chain
  verification remains a separate verdict. One captured Audit-sheet snapshot
  supplies parity, queued-operation matching, hash-chain verification, and the
  health fingerprint, so a single health review cannot mix results from
  different reads. It reports content-free counts for
  missing canonical rows, ledger-only retained Message/Audit history,
  duplicates, same-ID mismatches, unexpected Snapshots, configuration/outbox
  ambiguity, and recovery age/category. Operational observability includes the
  inspected workspace revision, the current audit-verification result, the last
  clean reconciliation time, and remaining email quota only when Apps Script
  permits that value to be read safely. No evaluation content, member email, or
  recipient identity is returned. An unavailable parity/typed-recovery
  inspection or a manual-review result is **Needs attention**, never OK.
- `reviewPortalWorkspaceIntegrity()` -> `{ok, review:{token, expiresAt,
  ...}}`. Admin-only and read-only. It freezes the current health/parity
  fingerprint, workspace revision, repairable counts, expected effects, and any
  nonrepairable reasons. Its token is cached for up to ten minutes and is bound
  to the authenticated administrator, revision, and fingerprint. Earlier cache
  eviction or an intervening change requires a new review.
- `reconcilePortalWorkspaceIntegrity({reviewToken,
  acknowledgeRepair:true})` -> `{ok, status, repaired, remaining,
  recoveryPending, manualReviewRequired}`. Admin only. Under one script lock it
  revalidates the reviewed fingerprint and may only append safely missing
  canonical rows, replay exact queued outbox entries, synchronize an unambiguous
  configuration projection, or complete a pending commit whose envelope/state
  proves completion is safe. It verifies each result before clearing its typed
  intent. It never edits or deletes an ambiguous or ledger-only row. Duplicate
  IDs, same-ID differences, unexpected Snapshots, configuration ambiguity,
  outbox collisions, or a broken audit chain remain blocked for district-IT
  review. There is no force, discard, or “clear anyway” parameter.
- `getPortalAdminOperations()` -> `{ok, directory:{revision, academicYear,
  educators, members, assignments}}`. Admin only. Supplies the current
  authorized directory for the operations center.
- `reviewPortalDirectoryChange({kind:'member'|'assignment', candidate})` ->
  `{ok, review:{token, expiresAt, kind, action, current, candidate}}`; then
  `performPortalDirectoryChange({reviewToken, acknowledgeImpact:true})` applies
  the exact reviewed, still-current change, reconciles affected released Docs,
  and adds canonical audit entries. A directory row may already be secured when
  a Drive verification failure raises `release_recovery_required`; reload and
  run recovery instead of assuming the operation completed.
- `reviewPortalReleasedEvaluationAccessRecovery({teacherId?})` -> a read-only,
  content-free review containing a token cached for up to ten minutes, scope,
  revision, repairable and manual-review verdicts, bounded batch counts, and
  allowed effects. Admin only. Apps Script may evict the token earlier and
  require a fresh review. The token is bound to the signed-in actor, selected scope, workspace and
  directory state, release registry, recovery queue, released-folder state, and
  exact next document batch; it is single-use. A teacher-scoped review cannot
  authorize global released-folder recovery or change folder-wide state. The
  global reviewed workflow can repair known permission drift and quarantine only
  the exact unregistered queue/file candidates frozen into that review. Its
  content-free counts distinguish queued items, reviewed quarantine candidates,
  and candidates requiring district-IT review. Released-folder owner, location,
  or retention ambiguity and uninspectable principals are manual-review-only.
- `reconcilePortalReleasedEvaluationAccess({reviewToken,
  acknowledgeAccessPolicy:true})` -> reconciliation counts, `status`,
  `recoveryPending`, `accessRecoveryPending`, and `auditPending`. Admin only.
  Under the script lock it revalidates the complete reviewed fingerprint before
  any mutation and refuses a missing, expired, reused, cross-actor, stale, or
  uninspectable review. Each confirmation processes at most 20 documents and
  never creates a replacement document; start a fresh review for each remaining
  batch. Invalid pointers and overflow markers remain blocked for explicit
  district-IT incident recovery.
- `reviewPortalCycleSchedule({dueDate, applyTo:'missing'|'all_open', building?})`
  -> `{ok, review:{token, affectedEducators, skippedFinalized, sample, ...}}`;
  then `performPortalCycleSchedule({reviewToken, acknowledgeImpact:true})`
  commits the reviewed schedule through the revisioned workspace path.
- `reviewPortalWorkspaceConfiguration({config})` -> `{ok, review:{token,
  changes, impacts, expiresAt}}`; then
  `performPortalWorkspaceConfiguration({reviewToken, acknowledgeImpact:true})`
  commits only the exact reviewed configuration, adds a canonical audit event,
  and returns the new revision. Admin only. Any intervening workspace change,
  expired or reused token, or ordinary autosave attempt is rejected.
- `reviewPortalDistrictExport({scope:'status_csv'|'educator_record'|
  'repository_backup', teacherId?, purpose})` -> a read-only scope/purpose
  review that also inspects the configured Authorized exports folder and every
  existing file without changing Drive. It returns only content-free drift and
  explicit-access counts and binds the complete ACL fingerprint to the review.
  `performPortalDistrictExport({reviewToken, acknowledgePolicy:true})`
  revalidates that fingerprint, removes non-owner access from the folder and all
  prior files, and re-verifies them before creating and verifying the new private
  export. An unavailable or unidentified ACL inspection, or an inventory of
  250 or more existing items, fails closed with no review token or new file and
  requires district-IT retention review. Confirmation rechecks the same bound
  under the repository lock before starting a journaled operation; an exact
  replay of an already-created file 250 remains available. If only the audit
  sink is unavailable, the verified
  artifact is returned with `status:'recovery_pending'` and `auditPending:true`;
  do not repeat the export merely to obtain its audit row.
- `getPortalArtifactOperationOutcome({kind:'district_export'|
  'restore_rehearsal', reviewToken})` -> a minimal admin-only outcome verdict
  for the exact reviewed artifact operation. It acquires the same script lock
  as creation, reauthorizes the administrator under that lock, and returns no
  token, actor, purpose, file ID, payload, or journal internals. The portal uses
  a conclusive `not_started` verdict only to release a stale unusable review;
  an ambiguous, pending, completed, or unavailable verdict retains same-token
  recovery.
- `getPortalAnnualArchives()` -> `{ok, archives:[...]}`. Admin only; lists up
  to 100 files in the repository's annual-archive folder with a fresh embedded
  workspace-hash verdict. Because inventory can remove stale Drive access, it
  acquires the repository lock and reauthorizes the same administrator after
  lock acquisition before touching ACLs. It remains available to inspect the
  exact archive during annual-rollover recovery, but unrelated pending
  workspace or private-artifact recovery blocks its ACL repair. The folder and
  every archive file are first repaired to owner-only private access and
  verified; any sticky access fails the whole operation rather than returning a
  deceptively safe inventory. Archive lookup and custody inspection are bounded
  at 250 folder items; an oversized folder fails closed for district-IT review
  instead of scanning indefinitely.
- `reviewPortalArchiveRestoreRehearsal({archiveId})` -> an archived-versus-live
  counts and revision review bound to the exact read-only destination inventory;
  a folder with 250 candidates refuses before issuing a token. Then
  `performPortalArchiveRestoreRehearsal({
  reviewToken, acknowledgeNoLiveRestore:true})` creates a verified private
  candidate without changing the live workspace. Confirmation rechecks bounded
  headroom under lock; a 249-item review may create item 250, and exact replay
  of that journaled item remains available. If only the audit sink is
  unavailable, the candidate is returned with `status:'recovery_pending'` and
  `auditPending:true`; repair the queued audit intent instead of creating a
  duplicate candidate.
- `reviewPortalAnnualRollover({nextAcademicYear})` -> `{ok, review:{token,
  expiresAt, currentAcademicYear, nextAcademicYear, counts, ...}}`. Admin only
  and read-only. The requested year must be the immediately following `YYYY-YY`
  year; the token is bound to actor, revision, year, and current counts.
- `performPortalAnnualRollover({reviewToken, acknowledgeArchive,
  acknowledgeOpenCycles})` -> `{ok, status, archive, fromAcademicYear,
  toAcademicYear, counts, recoveryPending}`. Admin only. It verifies a private
  archive before resetting active cycles and never deletes released documents.
  A sealed deterministic intent precedes file creation, so a created-file/lost-
  response interruption is recovered without a duplicate. Completion is not
  reported until the exact canonical Audit row and Config academic year are
  re-read and verified.
- `reconcilePortalAnnualRollover()` -> `{ok, status:'none'|'completed'|
  'archive_only'|'recovery_pending', ...}` when the server can prove a safe
  recovery state. Admin only. An ambiguous archive, audit row, configuration
  projection, or integrity marker remains blocked for manual recovery.

`recordType` is one of `walkthrough`, `formal_observation`, or `spm`.
Two-way comments and all current lifecycle milestones use the canonical,
locked, revisioned `saveWorkspace` mutation path; duplicate message/receipt
mutation RPCs are intentionally not public. Supported cohort metrics are
`finalScore`, `d1`, `d2`, `d3`, and `d4`.

Direct browser downloads, imports, and reset remain disabled for every portal
role. An administrator can instead use the reviewed server-side export workflow
in **Setup -> District operations center** after the LEA approves the purpose,
destination, retention, legal-hold, and official-record handoff. Evaluators and
educators cannot create district exports. Its read-only review inspects the
Authorized exports folder and existing files and reports content-free ACL drift
counts. Confirmation rejects a changed ACL fingerprint, repairs and re-verifies
all prior artifacts before creating the new private file, and fails closed if
inspection is unavailable or the inventory already contains 250 items. A
249-item review can create item 250; after that, district IT must apply the
approved retention procedure before another export review.

`doPost` is intentionally non-mutating and always returns
`method_not_allowed`; the portal uses same-deployment `google.script.run` RPCs.
`doGet?api=health` first requires an active, authorized district member and
then reveals only service/version and configured status; it does not reveal
identity, records, IDs, or tenant configuration.

## Operational controls

- Run `verifyAuditChain()` from the Apps Script editor after setup and on a
  schedule your district is comfortable with. Every audit row stores the
  previous row's hash plus a hash of its own fields, so the log is
  tamper-evident, but only a recomputation actually surfaces tampering. The
  function is administrator-only and read-only. It returns
  `{ok:true, rows, verified}` for a clean log, or
  `{ok:false, reason:'content'|'link', brokenAtRow, entryId}` where `content`
  means a row was edited in place and `link` means a row was deleted, inserted,
  or reordered. It reports positions and entry ids only, never the evaluation
  text of a row, so it is safe to paste into a ticket. A break is not
  self-healing: investigate the spreadsheet and restore from a reviewed backup.
  The same check also runs inside `getPortalSetupHealth()`, so the portal's Setup
  health panel shows an "Audit log integrity" row and an administrator never has
  to open the script editor for a routine check. Both entry points share one
  implementation, so their verdicts cannot diverge. The chain is recomputed on
  demand rather than on a schedule; on a very large audit sheet expect the health
  check to take proportionally longer.

- Use a dedicated district owner with MFA and recovery controls. Keep the
  repository folder and index private; do not manually share them to make a
  broken identity deployment work.
- Use least-privilege membership and evaluator assignments. Mark access
  inactive promptly and test removal before entering real pilot records.
- Establish retention/deletion and backup restoration tests before official
  use. Apps Script/Drive version history is not a complete legal-hold plan.
- Keep notifications content-free. Comments and acknowledgments belong inside
  the authenticated portal, not Gmail threads. After a lost response, use
  `getPortalNotificationOutcome` with the in-memory token when available; after
  reload, omit the token so the server can recover the educator-and-target
  delivery scope across currently authorized actors. Do not persist
  notification tokens in the browser or create a new review merely to retry.
  After `preDispatch:true`, still check that delivery scope and unlock only for
  `no_unresolved` or exact-token `not_started`; an ambiguous or failed lookup
  remains locked. A canonical prior completion is shown as such, and sending
  another notice requires **Prepare another reviewed notice** plus a fresh
  confirmation. For `recovery_pending`, run the reviewed workspace-ledger
  reconciliation to settle the exact Audit receipt. For `delivery_unknown` or a
  `manual_recovery_required` error, preserve the sealed intent and route it to
  district IT for inspection; there is no automatic resend or "clear anyway"
  path.
- Do not place student names or identifiers in observation evidence. The
  current pilot is text plus district-approved Drive artifact references whose
  own sharing is restricted. It does not upload, re-share, or scan attachments.
- Monitor Apps Script Executions, Drive sharing changes, send-mail quota, and
  conflict/error rates. Apps Script quotas can change and must be measured in
  the tenant during a limited pilot.

Pure validation helpers are exposed in the source as `_test` for a Node `vm`
regression harness. `_test` is not a network action and confers no data access.
