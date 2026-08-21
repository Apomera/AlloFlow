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
- files it in a `Released evaluations` subfolder of the repository (the
  central folder itself stays unshared);
- shares that single file **view-only** with the educator's active district
  member account and, when needed, the initiating evaluator so the portal's
  open-document action matches its access claim. This action does not send the
  separate content-free portal notice; Google may still surface Drive access in
  its own activity or notification interfaces;
- stamps the educator record (`releasedDoc`) and the audit log
  (`RELEASED_DOC_SHARED`). The pointer is server-owned: client saves can
  never set or clear it.

The document states explicitly that the portal remains the authoritative
record. A later **Review released-summary access** operation verifies or
restores permissions on the same immutable document instead of creating a
duplicate. A replacement is generated only when the recorded file is
unavailable; the old pointer is retained in superseded history. If a new-file
operation fails before commit, the server removes the new viewers and trashes
the uncommitted file. An unconfirmed cleanup or workspace commit sets
`EE_RELEASE_RECOVERY_REQUIRED`, appears in Setup health, and must be resolved
before another attempt.

Related behaviors added alongside:

- **Educator's statement** — a teacher-owned "in your own words" field on
  their record (the ONLY teacher-writable field there), editable until
  finalization and then frozen. Evaluator saves can never modify it. When
  present it leads the released summary, marked "no one edited it."
- **Open receipt** — when the educator clicks the portal's summary link,
  `recordReleasedSummaryOpened` stamps `releasedDoc.openedAt` and an audit
  event. It is labeled a LINK click; Drive cannot report actual reading.
- **Setup health** — administrators get a read-only portal card running the
  bootstrap verifications (domain, deployment URL, folder access, workspace
  integrity, unresolved release/rollover recovery, deployment-owner continuity,
  member counts, educators lacking accounts or assignments)
  without opening the script editor. Counts only; never member emails.
- **Deep-linked notices** — content-free notification emails now link to
  `?view=overview&teacher=<id>`: opaque identifiers only, useless without an
  authorized signed-in district account.

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
- All mutating operations use a script lock. Whole-workspace portal saves also
  require an expected revision; a stale browser gets a `conflict` response
  instead of silently overwriting newer work. The portal then fetches the
  authoritative revision, compares base/attempted/current values, loads the
  district copy, and offers replay only for non-overlapping fields; overlapping
  fields always keep the district value. Setup, membership/assignment
  administration, and content-free notification audit writes are serialized
  but are not workspace-revision operations.
- Canonical saves first stage a private `workspace.pending.json` commit journal.
  The service can finish an interrupted Drive JSON plus Spreadsheet revision/hash
  commit on the next locked read. Messages, audit rows, and snapshot rows are
  idempotent indexes rebuilt from canonical actor-stamped workspace records. A
  save that commits canonical data but cannot refresh an index returns success
  with `reconciliationPending: true`; a later locked save retries repair.
- A teacher receives a filtered copy. A subsequent save is merged only into
  that teacher's authorized part of the canonical workspace; omission can
  never delete another educator's records. Submitted/finalized content and
  append-only comments are protected by role-aware server checks.
- The client saves explicit changes and offers manual Refresh after a confirmed
  save. The current pilot is not real-time synchronized. While a save RPC is in
  flight, mutation controls pause until the canonical server response is
  applied, preventing provisional milestone timestamps from entering a later
  whole-workspace save.
- Authors, roles, transition timestamps, audit descriptions, and audit-chain
  hashes are server-generated. Client-provided audit rows are discarded.
- Email contains only a generic "portal activity" notice and the portal URL.
  Evidence, ratings, comments, educator names, and record identifiers are not
  sent through email.
- The current portal UI calculates formal-observation cohort suppression and
  the median in the browser from the permission-filtered workspace already returned to the
  authorized evaluator. It excludes the selected educator, limits comparison
  to the same building and employee type, and suppresses fewer than 10 distinct
  peers. It cannot compare people omitted from that authorized workspace.
- `getPortalCohortStats(...)` performs the equivalent aggregate on the server,
  but the current UI does not call it. Wire that endpoint before offering a
  broader school- or district-level cohort comparison. Teachers do not receive
  cohort output.

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
assignment. Each change shows a server-generated review, expires after ten
minutes, and requires an explicit legitimate-educational-interest
acknowledgment. The lower-level `adminUpsertMember({...})` and
`adminUpsertAssignment({...})` functions remain available to district IT for
reviewed automation, but routine administration no longer requires editing a
temporary Apps Script function. Re-running `setupEvaluationRepository` does
not add `teachers` to an existing workspace, and there is deliberately no
arbitrary table-edit endpoint.

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

The private Drive folder also contains `workspace.json` and an internal
`workspace.pending.json` recovery journal. Do not share or edit either file.
| `Messages` | append-only record conversations with server actor/time |
| `Receipts` | reserved for a future reviewed receipt workflow; the bundled portal records current lifecycle milestones through `saveWorkspace` |
| `Audit` | server events chained by previous-row hash |
| `Snapshots` | immutable finalized rating values used for longitudinal/cohort statistics |

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
   official record.
5. **Archive inventory and restore rehearsal.** Re-verify annual archives,
   compare archived and current counts/revisions, and create a separate private
   restore candidate in `Restore rehearsals`. A rehearsal never writes to or
   replaces the live workspace. District IT must inspect and test the candidate
   under its approved recovery procedure before any real recovery decision.

All five workflows derive the acting identity on the server. Review tokens are
actor-bound, single-use, state-bound, and valid for ten minutes. The controls
do not replace district approval, records custody, incident response, or a
tested backup/restore plan.

### Annual rollover and continuity

The Setup tab now provides an administrator-only, archive-first annual rollover.
It is deliberately staged and recoverable rather than described as an atomic
transaction:

1. `reviewPortalAnnualRollover({nextAcademicYear})` validates an exactly
   one-year advance, reads the current revision, counts active/finalized/open
   cycles and current records, and returns a ten-minute actor/revision/count-bound
   review token. No Drive or workspace data changes during review.
2. The administrator confirms district custody (backup/restore, retention,
   legal hold, official-record handoff, and owner responsibility) and separately
   acknowledges any open cycles. The server rejects missing acknowledgments.
3. `performPortalAnnualRollover(...)` creates a private JSON file in the
   repository's `Annual archives` subfolder, re-reads it, and verifies both the
   archive content and embedded workspace hash before any active-state write.
4. The active workspace advances one year. Roster/profile identities,
   membership, evaluator assignments, immutable `cycleSnapshots`, and audit
   history are retained. Due dates, cycle status, current ratings/scores,
   released-document pointers, educator statements, walkthroughs, formal
   observations, SPMs, and comments are reset for clean new-year cycles.
5. Existing released Google Docs are **never deleted or unshared** by rollover.
   Their old pointers and complete current-year context remain in the verified
   archive; the documents remain subject to district retention/legal-hold rules.

If archive creation succeeds but the active commit is not confirmed,
`EE_ROLLOVER_RECOVERY_REQUIRED` blocks another review. Setup health names the
condition. `reconcilePortalAnnualRollover()` re-verifies the exact archive and
then clears the block only when it can prove either (a) the reviewed new-year
commit exists, or (b) the old revision/year is completely unchanged. Any mixed
state remains blocked for manual district-IT recovery. The operation does not
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
- `sendPortalNotification({teacherId, target:'teacher'|'evaluator'})`
- `getPortalCohortStats({teacherId, metric:'overall'|'d1'|'d2'|'d3'|'d4', from?, to?})`
  -> a permission-filtered finalized-formal-observation aggregate. Each eligible
  peer contributes one mean; fewer than ten peers are suppressed without
  disclosing the small-group count. Annual-cycle snapshots are not mixed in.
- `reviewPortalReleasedEvaluationShare({teacherId})` -> `{ok, review:{token,
  expiresAt, educatorName, recipient, finalizedAt, action, ...}}`. Read-only;
  evaluator or admin only. The token expires after ten minutes and is bound to
  the authenticated actor and current repository revision.
- `sharePortalReleasedEvaluation({teacherId, reviewToken})` -> `{ok, status,
  doc:{id, url, sharedAt}, access, created, idempotent, recoveryPending,
  auditPending, separatePortalNoticeSent:false}`. Evaluator or admin only, and
  only after finalization plus a current disclosure review. It grants verified
  VIEWER access to the educator (and the initiating evaluator when needed).
  Repeating the reviewed workflow verifies the existing file rather than making
  a duplicate. A missing recorded file is replaced with superseded history;
  uncommitted new files are quarantined on failure.
- `recordReleasedSummaryOpened({teacherId})` -> `{ok, openedAt}` or
  `{skipped:true}`. The educator's own open receipt; an evaluator calling it is
  skipped rather than recorded, and a second open does not overwrite the first.
- `getPortalSetupHealth()` -> `{ok, checks:[...]}`. Read-only deployment
  self-check for the Setup tab: domain lock, repository spreadsheet and
  workspace files, ownership continuity, release/rollover recovery, membership,
  and evaluator assignments. It reports counts and configured/not-configured
  status only; it returns no records and no identities beyond the caller's own.
- `getPortalAdminOperations()` -> `{ok, directory:{revision, academicYear,
  educators, members, assignments}}`. Admin only. Supplies the current
  authorized directory for the operations center.
- `reviewPortalDirectoryChange({kind:'member'|'assignment', candidate})` ->
  `{ok, review:{token, expiresAt, kind, action, current, candidate}}`; then
  `performPortalDirectoryChange({reviewToken, acknowledgeImpact:true})` applies
  the exact reviewed, still-current change and adds a canonical audit entry.
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
  review; then `performPortalDistrictExport({reviewToken,
  acknowledgePolicy:true})` creates and verifies a private Drive export and
  audits its creation.
- `getPortalAnnualArchives()` -> `{ok, archives:[...]}`. Admin only; lists up
  to 100 files in the repository's annual-archive folder with a fresh embedded
  workspace-hash verdict.
- `reviewPortalArchiveRestoreRehearsal({archiveId})` -> an archived-versus-live
  counts and revision review; then `performPortalArchiveRestoreRehearsal({
  reviewToken, acknowledgeNoLiveRestore:true})` creates a verified private
  candidate without changing the live workspace.
- `reviewPortalAnnualRollover({nextAcademicYear})` -> `{ok, review:{token,
  expiresAt, currentAcademicYear, nextAcademicYear, counts, ...}}`. Admin only
  and read-only. The requested year must be the immediately following `YYYY-YY`
  year; the token is bound to actor, revision, year, and current counts.
- `performPortalAnnualRollover({reviewToken, acknowledgeArchive,
  acknowledgeOpenCycles})` -> `{ok, status, archive, fromAcademicYear,
  toAcademicYear, counts, recoveryPending}`. Admin only. It verifies a private
  archive before resetting active cycles and never deletes released documents.
- `reconcilePortalAnnualRollover()` -> `{ok, status:'none'|'completed'|
  'archive_only', ...}` when the server can prove a safe recovery state. Admin
  only. An ambiguous or invalid archive remains blocked for manual recovery.

`recordType` is one of `walkthrough`, `formal_observation`, or `spm`.
Two-way comments and all current lifecycle milestones use the canonical,
locked, revisioned `saveWorkspace` mutation path; duplicate message/receipt
mutation RPCs are intentionally not public. Supported cohort metrics are
`finalScore`, `d1`, `d2`, `d3`, and `d4`.

Direct browser downloads, imports, and reset remain disabled for every portal
role. An administrator can instead use the reviewed server-side export workflow
in **Setup -> District operations center** after the LEA approves the purpose,
destination, retention, legal-hold, and official-record handoff. Evaluators and
educators cannot create district exports.

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
  the authenticated portal, not Gmail threads.
- Do not place student names or identifiers in observation evidence. The
  current pilot is text plus district-approved Drive artifact references whose
  own sharing is restricted. It does not upload, re-share, or scan attachments.
- Monitor Apps Script Executions, Drive sharing changes, send-mail quota, and
  conflict/error rates. Apps Script quotas can change and must be measured in
  the tenant during a limited pilot.

Pure validation helpers are exposed in the source as `_test` for a Node `vm`
regression harness. `_test` is not a network action and confers no data access.
