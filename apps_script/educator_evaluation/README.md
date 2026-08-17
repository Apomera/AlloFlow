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

When an educator's cycle is finalized, an evaluator or administrator can click
**"Share released summary to educator's Drive"** in the portal. The server
then:

- generates a plain-language, strengths-first Google Doc summary (strengths
  and the evaluator's own evidence-linked rationale first, then the ratings
  with the weighting arithmetic explained in words, then growth areas framed
  with support rights, then a transparency section listing exactly what the
  summary was built from);
- files it in a `Released evaluations` subfolder of the repository (the
  central folder itself stays unshared);
- shares that single file **view-only** with the educator's active district
  member account — Drive sharing sends no email, so the content-free portal
  notification remains the only email pathway;
- stamps the educator record (`releasedDoc`) and the audit log
  (`RELEASED_DOC_SHARED`). The pointer is server-owned: client saves can
  never set or clear it.

The document states explicitly that the portal remains the authoritative
record. Re-sharing after corrections creates a new document and a new audit
event; nothing is edited in place.

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
  integrity, member counts, educators lacking accounts or assignments)
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
  instead of silently overwriting newer work. Setup, membership/assignment
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

To add staff later, an authorized administrator must first create the
educator's cycle/profile in the portal's **Staff** area and record its opaque
educator ID. District IT can then call `adminUpsertMember({...})` and
`adminUpsertAssignment({...})` from a reviewed admin setup function using that
ID. Those helpers fail closed when the educator record does not already exist.
Re-running `setupEvaluationRepository` does not add `teachers` to an existing
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

The private Drive folder also contains `workspace.json` and an internal
`workspace.pending.json` recovery journal. Do not share or edit either file.
| `Messages` | append-only record conversations with server actor/time |
| `Receipts` | reserved for a future reviewed receipt workflow; the bundled portal records current lifecycle milestones through `saveWorkspace` |
| `Audit` | server events chained by previous-row hash |
| `Snapshots` | immutable finalized rating values used for longitudinal/cohort statistics |

### Annual-cycle limitation

The current pilot can display immutable prior-cycle snapshots that were seeded
or already recorded, but it has no controlled annual rollover operation. It
does not yet close one academic year, create the next cycle, carry forward the
approved roster, and preserve assignments as one administrator-controlled
transaction. Do not represent this pilot as operational multi-year cycle
management until that rollover workflow is built and tested.

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
- `getPortalCohortStats({teacherId, metric, from?, to?})`
- `sharePortalReleasedEvaluation({teacherId})` -> `{ok, doc:{id, url,
  sharedAt}}`. Evaluator or admin only, and only after the educator's cycle is
  finalized. Builds the strengths-first summary Doc in the private "Released
  evaluations" folder and adds the educator as a VIEWER of that one file. It is
  idempotent: a second call returns the existing document rather than making a
  duplicate. Drive sharing sends no email of its own, so the notification stays
  content-free.
- `recordReleasedSummaryOpened({teacherId})` -> `{ok, openedAt}` or
  `{skipped:true}`. The educator's own open receipt; an evaluator calling it is
  skipped rather than recorded, and a second open does not overwrite the first.
- `getPortalSetupHealth()` -> `{ok, checks:[...]}`. Read-only deployment
  self-check for the Setup tab: domain lock, repository spreadsheet and
  workspace files, membership, and evaluator assignments. It reports counts and
  configured/not-configured status only; it returns no records and no
  identities beyond the caller's own.

`recordType` is one of `walkthrough`, `formal_observation`, or `spm`.
Two-way comments and all current lifecycle milestones use the canonical,
locked, revisioned `saveWorkspace` mutation path; duplicate message/receipt
mutation RPCs are intentionally not public. Supported cohort metrics are
`finalScore`, `d1`, `d2`, `d3`, and `d4`.

Browser downloads, imports, and reset are disabled for every portal role in
this pilot. Enable remote export only after the LEA approves an export policy
and an audited server export method records the actor, scope, purpose, and time.

`doPost` is intentionally non-mutating and always returns
`method_not_allowed`; the portal uses same-deployment `google.script.run` RPCs.
`doGet?api=health` first requires an active, authorized district member and
then reveals only service/version and configured status; it does not reveal
identity, records, IDs, or tenant configuration.

## Operational controls

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
