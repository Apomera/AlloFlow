# Educator Evaluation — principal-scale packet round trip (scope)

**Goal:** let a principal send one educator their own evaluation and get a structured
response back, by email, with no Apps Script portal deployment. This is the path that
replaces Google Forms.

**Status:** scoped, not built. 2026-08-18.

## Why this is viable without the portal

Three of the four pieces already exist in `educator_evaluation_source.jsx`:

- A complete **teacher-role UI that runs locally**. `role === 'teacher'` swaps the tab set
  to `My evaluation / My trends / My evidence / Formal observation / SPM / SLO / Timeline`,
  and exposes the educator-owned controls: `educatorStatement`, `reflection` +
  `reflectionSubmittedAt`, `teacherAcknowledgedAt`, and a role-aware comment box
  ("Add context or ask a question…").
- A **per-educator summary export**, scoped to `selectedTeacher` and audit-logged as
  `EXPORTED` with a `teacherId`. It emits `.html`, so it is a read-only artifact.
- A **JSON import** that validates `kind === 'alloflow-educator-evaluation-workspace'`,
  `version === 1`.

The QR needs no change. Getting the educator into the tool is exactly what it already does.

## The two gaps

1. **The JSON export is whole-workspace.** It serialises every teacher, so mailing it to one
   educator would disclose the others. There is no single-educator packet.
2. **Import replaces, it does not merge.** It performs `workspaceRef.current = normalized`
   and resets the selection, so a returned file would overwrite the principal's workspace.

## Work item 1 — educator packet (export, evaluator role)

New export beside the existing summary export, scoped to the selected educator.

- Envelope: `kind: 'alloflow-educator-evaluation-packet'`, `version: 1`,
  `packetType: 'educator'`, plus `packetId`, `teacherId`, `issuedAt`, `issuedBy`.
- Contents: that educator's `teachers[]` entry, and their `walkthroughs`, `observations`,
  `spms` filtered by `teacherId` (the client already filters this way:
  `filter((item) => item.teacherId === teacherId)`), plus the config needed to render
  (framework/rubric, district and year labels).
- Excluded: every other educator's records, and any roster listing that would reveal who
  else exists. Assert on this in tests — it is the whole point of the packet.
- Audit: `EXPORTED` event carrying `teacherId`, matching the summary-export pattern.

## Work item 2 — response packet (export, teacher role)

Small file the educator sends back.

- Envelope: same kind/version, `packetType: 'response'`, carrying `packetId` of the source
  packet and `teacherId`.
- Contents: **educator-owned fields only** — `educatorStatement`, `reflection` +
  `reflectionSubmittedAt`, `teacherAcknowledgedAt`, and their comment entries, each tagged
  with the `recordType` and `recordId` it attaches to.
- Deliberately excluded: ratings, evidence, evaluator comments, audit entries.

## Work item 3 — merge on import (evaluator role)

Branch `handleImport` on `packetType` instead of always replacing.

- `packetType: 'educator'` opened by an educator: replace their local workspace. Safe,
  because it is their own copy and contains only their record.
- `packetType: 'response'` opened by the evaluator: **merge**, never replace.
- **Allow-list the merge.** Accept only the educator-owned fields above, matched by
  `teacherId` + `recordId`; drop everything else silently but report the count. The packet
  is hand-editable JSON, so an allow-list is the only thing preventing a returned file from
  rewriting ratings. This is the difference between "educator input" and "educator can
  rewrite their evaluation".
- Reject if `teacherId` matches no local educator, or if the packet was issued from a
  different workspace.
- Audit: append an event attributed to the educator with provenance
  (`imported from response packet <packetId>, issued <date>`), never a silent merge.

## Work item 4 — optional attachment encryption

Worth doing, and the threat model is a good fit: once a file leaves by email there is no
server to revoke it, so encryption is the only remaining control.

- `crypto.subtle`, AES-GCM 256, key from PBKDF2-SHA256 with a random salt and a high
  iteration count. No dependencies, works in Canvas and desktop.
- Envelope stays readable (`kind`, `version`, `packetType: 'encrypted'`) so import can
  recognise it and prompt for the password instead of failing with "Not an AlloFlow export".
- Optional, off by default, with the password generated for the principal and shown once.
- **The UI must say the password has to travel a different channel** (spoken, phone, SMS).
  In the same email it is the key taped to the door.
- No recovery: a lost password means re-export. Acceptable, and worth stating plainly.

## Open decisions (need Aaron)

1. **Does a packet acknowledgement count as a formal acknowledgement?** In many districts
   that has contractual meaning. If it does, the audit entry needs to record that it arrived
   by packet rather than in person.
2. **Stale packets.** If the principal edits the record after issuing the packet, does a
   returned response merge anyway with a warning, or get refused?
3. Should the packet carry evaluator names, or only the evaluation content?

## Risks to test

- **Mail filters.** Some districts strip or quarantine `.json` attachments, and encrypted
  blobs can trip DLP. Test with a real district mailbox before promising the workflow;
  consider a friendlier extension if it is a problem.
- Packet size for an educator with many walkthroughs.
- Round trip across versions: a packet issued by one release imported by another.

## Privacy position

This is an **attachment**, not a hosted link: nothing is served, there is no bearer URL, and
no standing access. The trust model equals emailing a PDF, which is current practice, and it
is strictly better than the whole-workspace export it replaces. What you accept: no
revocation once sent, and no record of who opened it. Encryption (item 4) is the mitigation
for a misdirected or forwarded message.

---

# Addendum, 2026-08-18: PPS policy findings, path three, and custom rubrics

## What the district guidebook actually says

From the Portland Educator Evaluation Guidebook (NCTQ copy of V6), two provisions govern
this work:

- The conference forms carry an explicit **"Educator's Comments/Input"** column beside
  "Evaluator's Rationale/Comments". The educator's written input is a designed field on the
  district's own instrument, and `educatorStatement` maps onto it directly.
- Those same forms end with **"Educator's Signature: ___ Evaluator's Signature: ___ Date
  reviewed: ___"**, inside a conference-based process (Mid-Year Conference, End of Year
  Summative Conference).

**Consequence:** the packet's acknowledgement checkbox is NOT the district's acknowledgement
mechanism. The guidebook expects a signature at a meeting. Relabel the checkbox so it does not
imply otherwise ("I have read this evaluation"), and frame all three paths as ways to collect
Educator's Comments/Input around the conference rather than to replace the signature.

The same block appears on the Progress on Professional Growth Plan form, so the packet is
arguably more useful mid-year than at the summative.

Still unverified, and worth checking before building path three: whether the PPS Workspace
edition supports expiring share permissions, whether principals may deploy Apps Script, and
whether the Portland Association of Teachers contract adds response or rebuttal language
beyond the guidebook. The contract is the most likely source of a binding requirement.

## Path three: the share helper (Aaron's design, and the custody objection withdrawn)

An Apps Script the **principal** deploys in their own district account. Not the district
portal: no roster, no assignments, no roles, no repository. It does three things -- put this
educator's document in my Drive, share it to that educator, optionally set an expiry.

An earlier objection here was that a principal's Drive is a weak custodian because the account
is suspended when they leave. That objection is withdrawn. The point of the path is
**automated aggregation and consistent labelling into one location**: the script files every
evaluation into a predictable folder structure, and at the end of a cycle the principal copies
or transfers that folder wherever the district wants it. Drive supports both folder transfer
and admin-side transfer of a departing user's contents. Treat the folder as the working store
with a defined handoff step, not as the system of record, and the design is simple and strong.

This is the only path that gets **revocation**, via expiring share permissions, and the only
one where the artifact sits inside district-controlled Workspace from the start.

## Custom rubrics (the adoption blocker for non-PPS districts)

Current state, verified in `educator_evaluation_source.jsx`:

- `AE_FRAMEWORKS` (~line 240) already holds **two** frameworks, `pa_act13` and `portland_me`,
  each with `name`, `versionTag`, `practiceLabel`, `bands[]` (rating scale) and
  `domainWeighted`. So the tool is not PPS-only today.
- But `AE_DOMAINS` (~line 334) is a **single module-level constant**, not framework-scoped:
  four Danielson domains with `id`, `code`, `label`, `weight`, `color` and a `components` list.
  Both frameworks share it. A district on a non-Danielson rubric cannot be represented at all.

So the framework layer is pluggable and the rubric layer is hardcoded. That is exactly the gap.

**Shape of the work:** move `AE_DOMAINS` from a constant into workspace config, add an editor
for domains, components, weights and band labels, and update the ~20 read sites plus the
export and summary builders to read the workspace copy.

**The hazard to design around:** ratings are keyed by domain id (`ratings.domains[domain.id]`).
Editing or removing a domain after ratings exist orphans that data silently. Rules needed:
free editing before any rating exists, and after that either block destructive edits or
migrate explicitly with a visible record of what changed.

**Do not skip `versionTag`.** Every framework carries one, and records should say which rubric
version produced them. A custom rubric needs a generated tag for the same reason: a rating is
only interpretable against the rubric that produced it, which matters more, not less, once
districts can edit the rubric themselves.
