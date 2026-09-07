# Educator evaluation engineering review

Reviewed September 7, 2026. Scope: the shared evaluation interface, standalone and
desktop entry points, district Apps Script repository, optional Drive packet
helper, generated packages, and the workflow and security regression suites.

## Findings corrected

### Published walkthroughs could block unrelated educator saves

The browser normalizer omitted `createdByEmail` from walkthrough records. A
subsequent whole-workspace save submitted the unchanged published record without
its server attribution. The repository rejected it as an attempt to edit the
published record, including when the educator was only saving formal-observation
prework. The normalizer now preserves the attribution. Server controls still
reject attempts to change it or published evidence.

### Private notes could block work after formal finalization

The repository always hides pre-conference notes from educators. Its finalized
formal-record comparison nevertheless compared the educator's redacted field
against the private canonical text. Even an unchanged record could therefore
block another authorized save. The repository now restores the canonical private
field before the immutable comparison. It continues to hide that field from the
educator and rejects changes to finalized evidence.

### An SPM could not be returned using the browser action

The browser moved the evaluator's return reason from its draft field into the
submitted decision and cleared the draft. The server looked only at the cleared
draft and rejected the return. The server now accepts the submitted decision
field as well as the existing draft representation, preserves the reason, and
still rejects a return without meaningful text.

### Locked SPMs blocked later evaluator work

A locked SPM passed the immutable-content comparison, then reached a transition
handler with no `locked > locked` case. An evaluator could therefore finish the
SPM but could not subsequently enter annual ratings. Unchanged locked records
now return their canonical copy immediately; changed locked records still fail.

### Refresh interrupted the two-person workflow

Refresh reapplied the initial route and default educator, moving users away from
their current task. Refresh now retains the selected educator and workflow tab
for the same verified actor when that educator remains in the authorized
projection. An identity, role, or educator-account binding change clears draft
context and uses the newly authorized route instead.

### The independent Drive packet helper did not verify the full access boundary

The helper previously reused folders by name and checked the intended recipient
without proving that additional people could not access the folder or file.
Drive folder access can propagate to its children, so an exact recipient check
alone is insufficient. [Google Drive sharing documentation](https://developers.google.com/workspace/drive/api/guides/manage-sharing).

The helper now:

- verifies the owner, exact parent, non-trashed state, private access, complete
  owner-only permission list, and disabled editor resharing on each managed
  folder; ambiguous same-name folders block filing;
- creates an empty file, verifies its private owner-only state, and only then
  writes evaluation content;
- verifies the entire file permission list after granting the reviewed
  recipient, including exact role and expiry, and rechecks its folder path;
- removes non-owner grants from a failed attempt's newly created file, trashes
  it, and verifies cleanup; unconfirmed cleanup requires manual recovery;
- flags additional permissions in access reviews and refuses to report verified
  revocation while other non-owner grants remain;
- reports unsafe storage during setup and fails closed on incomplete or
  repeated permission pages.

The relevant custody and sharing methods are documented in Google's
[Folder API](https://developers.google.com/apps-script/reference/drive/folder)
and [permission resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions).

## Shared desktop dependency checks

Compatible dependency updates reduced the desktop production dependency-tree
audit from 68 advisories (3 critical, 30 high, 24 moderate, 11 low) to 32
(0 critical, 14 high, 9 moderate, 9 low). Firebase's pinned Undici dependency is
overridden within its existing major version to `^6.28.0`; Firebase app, auth,
and Firestore initialization passed a local smoke check. React and ReactDOM,
which are embedded in the evaluation bundles, remain at 18.3.1.

The remaining reported direct dependency is `react-scripts`, the broader
desktop web application's older build toolchain. npm proposes an incompatible
replacement for that dependency. A build-tool migration and verification of its
transitive packages remain open; this review does not label the larger desktop
application vulnerability-free. The audit reports enumerate the outstanding
packages. These counts describe dependency advisories, not confirmed exploit
paths in the evaluation portal.

The desktop runtime's integrity check also expected five built-in download pins
although its manifest already contains seven. Its expected count now matches the
four platform/architecture archives plus three model/voice downloads. The actual
pinned URLs and SHA-256 hashes are unchanged, and the runtime integrity check
passes.

## Pathways reviewed

| Pathway | Verification surface |
| --- | --- |
| First launch, standalone, Leadership Hub, desktop and portal launch | First-run, mount, launcher, portal-entry, setup, and manual suites |
| Fictional practice, guided rehearsal, simulation and framework switching | Browser end-to-end, simulation, practice-menu, tour, and framework suites |
| Staff, profiles, pasted roster, due dates | Staff/profile/input recovery and mutation-result suites |
| Walkthrough creation, editing, publication, acknowledgment, draft recovery | Saved-edit, submission-readiness, workflow-recovery, mutation-result, and real-repository bridge checks |
| Formal observation, educator prework, conferences, publication, reflection, rating, receipt and finalization | Actual portal-to-repository browser handoff, backend, provenance, closure, and recovery suites |
| SPM proposal, return, revision, approval, results, rating and lock | Actual portal-to-repository browser handoff, mutation-result, submission and backend suites |
| Annual ratings, evidence references, statement and finalization | Annual provenance, confirmation, scoring, finalized-cycle and browser suites |
| Teacher/evaluator/admin identity, assignments, access removal and queued actions | Actor reauthorization, administrative scope, ACL, released-access and backend suites |
| Released Google Doc, receipt and access recovery | Released-document, orphan-scope, sensitive-Drive and ACL suites |
| HTML educator packet, response import and optional Drive helper | Packet, packet round-trip, share-helper and setup parity suites |
| Reviewed notices and uncertain delivery outcomes | Notification idempotency and operations suites |
| Concurrent edits, refused saves, pending commits and reconciliation | Conflict, remote reconciliation, pending-commit, ledger parity and recovery suites |
| Authorized exports, annual archive, rollover and restore rehearsal | Lifecycle, artifact idempotency, operations and sensitive-storage suites |
| Audit integrity, retained history, cohort suppression and trends | Audit chain, material audit, ledger parity, trends and framework-era suites |
| Phone layout, keyboard navigation, themes and help | Phone, keyboard, theme, manual and real-browser suites |

Two older regression fixtures were also brought into line with existing
behavior: a fake accepted save now returns the required explicit success result,
and finalized-control assertions include the additional stale-recovery lock.
These changes do not weaken the production controls.

## Reproduce the checks

Run `npm run verify:educator-evaluation`. The command checks that the generated
district portal matches its source and runs all educator evaluation suites.
The live bridge suite loads the actual generated portal and calls production
`Code.gs` from separate fictional account sessions. Google services are simulated;
the test does not send email or change real Drive access.

Evidence and screenshots are saved under
`reports/educator-evaluation-review-2026-09-07/`. The initial privacy reproduction
in `privacy-before.json` records eight failures before the fix. Final validation
results are recorded separately after generated packages are synchronized.

## Final validation result

Latest results cover **957 passing checks across all 64 evaluation test files**.
The complete run encountered a worker-start timeout for the packet suite and a
failure in the new browser test during development. A final targeted run passed
all **126 checks across seven suites**, including the packet tests, full
separate-account annual-release workflow, round-trip protections, privacy
helper, core normalizer, copy integrity, and deployable helper parity. The
consolidated `validation-summary.json` retains the original reports and accounts
for every test file; no missing suite is counted as passed.

The browser run made 75 authorized repository calls across separate fictional
accounts and verified private-draft exclusion, formal finalization, SPM return
and resubmission, SPM locking, educator statement, annual finalization, and the
frozen statement. Mobile layout and page errors were also checked. The local demo
passed its browser smoke test and returned 404 for a private repository path and
405 for attempted writes. Portal freshness, scoped diff checks, desktop runtime
integrity, and Firebase initialization checks passed. The root dependency audit
reported zero advisories; the desktop dependency findings above remain open.

## Deployment boundary

This review does not certify that no bugs or security issues remain. It establishes
specific local behavior and regression coverage. No district deployment, live
account test, real email dispatch, or personnel-record migration was performed.

Update the district portal's server and generated UI together. Update the optional
packet helper separately if it is used. Before handling live records, complete
tenant identity, actual Drive permission, account-removal, concurrent-edit,
export/restore, and intended-device acceptance checks. Confirm the approved
evaluation framework and operating procedures with the district owner.

For an administrator-facing demonstration, follow
[the pathway walkthrough](educator_evaluation_pathway_walkthrough.md) and the
existing illustrated `educator-evaluation-manual.html`.
