# Educator Evaluation: shared product and district-pilot deployment plan

Status: implementation plan, August 13, 2026

## Recommendation

Ship one evaluation product with one shared UI/domain engine and three entry points:

1. **AlloFlow Leadership Hub** — the integrated experience already uses the shared EducatorEvaluationPanel.
2. **AlloFlow desktop launcher** — a visible “Principal Evaluation” action opens the same product in focused mode.
3. **District-hosted web portal** — the proposed pilot home for principals and teachers, at a district-approved Apps Script URL.

The desktop package and standalone HTML are useful demonstrations and offline workflow previews. Real personnel records and two-way communication may use the domain-authenticated district portal only after LEA approval and successful tenant identity, authorization, retention, and recovery tests. All three entry points should load the same released evaluation module and repository contract so features do not drift.

## Why the portal, not a local-only desktop database

A principal and teacher need stable identity, simultaneous access, server timestamps, notifications, record locking, recovery, retention, and a tamper-evident audit trail. A browser-local or desktop-local database cannot provide those properties across two users. The desktop app should be a convenient launcher and optional cached shell, not the source of truth.

## Google Workspace for Education fit

AlloFlow currently has two different Google-backed pathways, and they must remain distinct:

- **Private Canvas/Firestore sync:** teacher history is stored under the authenticated user's own UID, and the current Firestore rule allows only that matching UID. This matches Google's private Canvas persistence model and can support one user's cross-device work.
- **Class Mailbox:** this is an Apps Script web app, not Gmail. It is intentionally deployed as “Execute as me / Access: Anyone,” uses capability tokens instead of Workspace identity, stores short-lived live data in Apps Script cache/properties, and writes hosted homework/submissions to the teacher's Drive.

Google's current Canvas guidance says that persistent data remains private when an app does not share data between users. It separately warns that a Canvas app that shares data between users makes that shared data available to anyone with the public app link. Therefore:

- private Canvas storage is appropriate for personal drafts and this single-user prototype;
- Canvas-generated multi-user persistence must not hold official principal/teacher evaluation records;
- a public or capability-only link is not sufficient identity for personnel records.

### Recommended Google-native pilot

Create a **separate district-owned Educator Evaluation Apps Script web app**. Reuse the Class Mailbox's source-distribution, version handshake, bounded validation, locking, and update UX, but do not reuse its deployment, admin token, participant tokens, storage namespace, or “Access: Anyone” posture.

The evaluation web app should:

- be deployed for the district Workspace domain only, never anonymous or “anyone with the link”;
- identify the active managed Google account on the server and fail closed if identity is unavailable;
- map that account to a server-owned membership and explicit evaluator/educator assignment;
- keep the central spreadsheet and Drive folder unshared from ordinary users, exposing only authorized record-shaped server methods;
- bundle the same reviewed evaluation UI rather than load mutable code or confidential data through a third-party CDN;
- use Gmail only for content-free notifications linking to the authenticated portal;
- keep messages, explicit opened/acknowledged receipts, server-generated workflow milestones, immutable revisions, and audit events in the portal;
- limit the current UI's formal-observation cohort calculation to the permission-filtered workspace returned for the evaluator and suppress results below ten distinct contributing peers;
- wire the existing server cohort endpoint before offering comparisons across a broader school or district population.

Apps Script, Gmail, Drive, Sheets, and Vault are currently listed as Google Workspace Core Services. This gives the district a simpler contractual and administrative starting point, but it does not automatically make custom code FERPA compliant. The LEA must approve the purpose and data practices, validate the deployment configuration, retain direct control, and address student PII and separate personnel-record obligations.

A district-owned Firebase/Google Cloud backend remains the scale-up option if Apps Script quotas, attachment handling, concurrency, or audit requirements outgrow a school-level pilot. Firebase/Firestore is governed by separate Firebase/Google Cloud terms and must be expressly approved; it is not made a Workspace Core Service merely by using Google sign-in.

Official references:

- Google Canvas safety and security: https://support.google.com/gemini/answer/16419134
- Google Workspace Core Services summary: https://workspace.google.com/terms/user_features/
- Google Workspace for Education privacy notice: https://workspace.google.com/terms/education_privacy/
- Apps Script web-app deployment and execution identity: https://developers.google.com/apps-script/guides/web
- Apps Script domain-only access configuration: https://developers.google.com/apps-script/manifest/web-app-api-executable
- Apps Script active-user identity limitations: https://developers.google.com/apps-script/reference/base/session
- Google Workspace app access control: https://support.google.com/a/answer/7281227
- Firebase privacy and data-processing information: https://firebase.google.com/support/privacy
- U.S. Department of Education third-party provider guidance: https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Vendor%20FAQ.pdf
## Proposed district-pilot architecture

### Client

The existing EducatorEvaluationPanel remains the shared React product. It receives a current user, organization, repository, capability map, and deployment mode. The local repository remains available only for sample/demo work. The proposed district-pilot repository is domain-authenticated and uses explicit saves plus manual Refresh; it is not a real-time synchronized client.

### Identity and authorization

Suggested roles:

- district administrator
- HR/records custodian
- chief school administrator
- assigned evaluator/principal
- co-evaluator
- evaluated educator
- read-only auditor

Access is both role-based and assignment-based. An evaluator can read only cycles assigned to them or their authorized building; an educator can read only their own released/shared records. Draft visibility is field/record-specific, not merely role-specific.

### Data service

For the school-level pilot, use a dedicated Apps Script project deployed by a district-controlled account and backed by a central spreadsheet/Shared Drive location that ordinary principals and teachers do not edit directly.

Suggested server-owned tables:

    Members
    Cycles
    Artifacts
    Threads
    Messages
    Revisions
    Audit
    CycleSnapshots

Expose narrow methods such as `bootstrap`, `listMyCycles`, `getCycle`, `submitRevision`, `postMessage`, `recordReceipt`, and `getAuthorizedTrends`; do not expose generic sheet reads or writes. Every method derives the actor from the active Workspace account and re-checks the actor's role and assignment.

Important separations:

- Private evaluator drafts and teacher-visible evidence are separate records.
- Teacher prework drafts and submitted immutable versions are separate records.
- Script locks plus expected-version checks prevent silent last-write-wins updates.
- While a save RPC is in flight, the portal pauses mutation controls until the canonical server response is applied; this prevents a later client snapshot from replaying provisional milestone timestamps.
- Audit rows are append-only, server-timestamped, and hash-linked; Drive version history and district retention provide an additional review trail.
- Released observation and summative snapshots are immutable; corrections create a new linked version.
- The first pilot remains text plus district-approved Drive references; file upload, re-sharing, and attachment scanning are not implemented.
- Approved Drive artifact references are allowlisted and shared only with the assigned parties; the first pilot can remain text/reference-only.
- Apps Script quotas and concurrency are monitored. A district-wide rollout moves the same repository contract to approved Firestore/Storage if needed.
### Two-way communication

Each observation, walkthrough, SPM, and cycle can have an append-only thread:

- principal and assigned teacher can post
- messages store author UID, role-at-write, server timestamp, record/version reference, and visibility
- edits are disabled; corrections are appended
- explicit opened and acknowledged receipts remain separate; approval, return, and signature are server-generated workflow milestones
- in-app notifications contain no sensitive evaluation content
- optional email notification says only that new activity is available and links back to the authenticated portal

This meets the communication need without sending the actual evaluation through ordinary email.

### Longitudinal and cohort analytics

Preserve observation-specific human ratings and evidence snapshots by date. Never overwrite the annual domain rating when another observation is signed.

Current pilot boundary: the UI can display immutable prior-cycle snapshots that were seeded or already recorded, but it has no controlled annual rollover operation to close one year, create the next cycle, carry forward the approved roster, and preserve assignments atomically. The district must not describe this pilot as operational multi-year cycle management until that administrator-controlled rollover is built and tested.

The principal view can provide:

- selected teacher trends by domain across finalized formal observations
- counts of published walkthroughs, formal observations, SPM milestones, acknowledgments, and comments by time window
- selected teacher annual/cycle summaries across school years
- de-identified building, assignment, or role cohort averages
- sample size and time-window disclosure for every comparison
- accessible tables corresponding to every chart; remote downloads remain disabled until the LEA configures an audited export policy and server workflow

Privacy and interpretation controls:

- teachers see their own history; cohort comparison is an LEA-configurable permission
- no named peer drill-down from a cohort chart
- suppress cohorts below a configurable minimum; the MVP defaults to ten distinct contributing peers, while the LEA may require a higher threshold
- apply complementary suppression/rounding where a second cell could reveal a small group
- do not rank teachers, predict effectiveness, infer ratings from notes, or trigger personnel actions
- compare like assignments and framework versions only
- label evidence volume as volume, not quality
- keep official ratings human-authored and separate from descriptive analytics

The U.S. Department of Education recommends disclosure-avoidance methods such as minimum cell sizes and suppression for aggregate reporting.

## FERPA and personnel-record readiness gate

Do not place real data into production until the district approves:

- data-processing/school-official terms and authorized purpose
- data ownership and prohibition on advertising, sale, secondary use, or model training
- district Google administrator and security owner
- least-privilege role/assignment matrix
- retention, deletion, legal hold, records request, and export process
- incident response and breach notification
- encryption in transit/at rest and managed secrets
- backup/restore and disaster recovery testing
- student-PII handling rules and, before any future attachment feature, attachment scanning and sharing controls
- rule tests proving cross-teacher, cross-school, and cross-district denial
- Data Access audit logging and audit-log retention
- accessibility testing
- confirmation of the LEA’s Act 13/PEERS process
- Danielson/PDE content licensing authorization for any rubric descriptors beyond permitted labels

“FERPA-ready” is a combined technical and governance outcome; no UI checkbox or Google login alone establishes compliance.

## Desktop experience

The easiest experience for a nontechnical principal is:

1. Open AlloFlow.
2. Choose **Principal Evaluation** from Settings or Leadership Hub.
3. If not signed in, use the district Google account.
4. The app opens a focused evaluation workspace with the same URL/module as the web portal.

The desktop shell must not silently fall back to local storage when a district-pilot user is offline. It should show read-only cached status or an explicit offline message, then synchronize through the authenticated repository when connectivity returns.

A dedicated “Principal Edition” installer can be added later, but it should be packaging only: it launches the focused evaluation mode and does not fork the product.

## Delivery phases

### Phase 0 — complete in this prototype

- shared embedded/standalone React surface
- current Pennsylvania weighting and framework labels
- walkthrough/formal/SPM workflows
- role-scoped prototype views
- local audit/export/import
- accessible completion and weighting donuts
- local-only warnings
- current-cycle and immutable-snapshot trend views with ten-peer cohort suppression
- direct teacher-mode Settings launcher and focused `?mode=teacher-evaluation` entry

### Phase 1 — district pilot

- Google Workspace sign-in
- organization membership and assigned-evaluator authorization
- domain-only Apps Script repository with server-side Workspace identity, assignment checks, protected Sheets/Drive storage, and authorization tests
- saved threads, receipts, content-free notifications, immutable versions, and manual Refresh
- no portal downloads, imports, or reset until an LEA-approved export policy and audited server export workflow are implemented
- text and district-approved Drive references only; secure attachment handling remains future work
- longitudinal teacher trend view and privacy-suppressed cohort aggregates within the evaluator's authorized workspace

- district-domain sandbox with synthetic data and a documented Firebase/Google Cloud scale-up decision
- administrator-controlled annual rollover before any operational multi-year claim

### Phase 2 — production authorization

- district privacy/security/legal review
- retention and records administration
- operational audit monitoring, backup/restore, and incident response
- accessibility and penetration testing
- PEERS/LEA workflow validation
- controlled migration from synthetic pilot to approved records

## District decisions needed before Phase 1 activation

- Google Workspace domain and administrator contact
- district owner/deployer account for the Apps Script project and protected Shared Drive storage
- principal/evaluator, co-evaluator, HR, CSA, and teacher permission matrix
- retention and deletion schedule
- minimum cohort size and allowed cohort dimensions
- whether teachers may see de-identified cohort comparisons
- whether a future attachment feature is needed and, if so, approved types, scanning, and storage controls
- official relationship to PEERS and local Act 13 forms
- Danielson/PDE licensing position
- pilot school and synthetic-data acceptance criteria