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
