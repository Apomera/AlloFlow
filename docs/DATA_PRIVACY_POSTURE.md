# AlloFlow Live Sessions — Data Privacy Posture

**Audience:** district IT, privacy officers, and reviewers. Written 2026-07-01 from a verified
read of the code (every storage write site enumerated), not from marketing intent.
**Status of claims:** engineering statements are verified; legal conclusions are flagged as such —
this document is not legal advice, and the final FERPA determination always belongs to the
district and its counsel.

## 1. The core design claim (verified)

Student-generated **content** never reaches any server. Poll answers (including free text),
drawings, guesses, and voice travel **browser-to-browser over encrypted WebRTC data channels**
between student devices and the teacher's device, and exist only in device memory. A complete
compromise of the backend would yield none of it, because it was never there.

What the backend (Firestore) carries is **session coordination metadata**, enumerated
exhaustively below. Students cannot free-type into any stored field: student names are
**dropdown-curated codenames** (adjective + animal), and every student-writable stored field is
an enum, number, timestamp, or auto-generated ID — enforced by an in-app allowlist
(`SESSION_TIER1_LEAVES`) and, on the owned backend, by server-side Firestore rules
(`firestore.rules`).

## 2. Exactly what is stored, and for how long

| Stored item | Contents | Written by | Lifetime |
|---|---|---|---|
| Session doc: roster | codename, xp points, group id, enum help-signal, viewed-resource id | student (own entry only) | **Deleted when the teacher ends the session** (all end paths converge on deletion as of 2026-07-01) |
| Session doc: teacher fields | pacing mode, group definitions, resource ids, teacher-authored resources (media stripped/externalized) | teacher | Same — deleted at session end |
| Session doc: quiz responses | structured answers only (choice/rating; free-text answers are **excluded by code**) keyed by anonymous uid | student (own entries) | Same — deleted at session end |
| WebRTC signaling docs | connection handshake (SDP/ICE — includes transient network addresses), codename | each participant (own doc) | Deleted ~1 second after the connection opens; `expiresAt` field supports a TTL sweep for orphans |
| `conceptMastery/{uid}` | per-concept attempt counts + correct/incorrect status enums (no answer content), cross-session | student (own doc) | Persistent — **see §4, flagged for remediation** |
| Bridge class message | teacher-authored text broadcast to the class (documented exception; sender de-identified) | teacher only | 24h TTL, cleaned by the teacher's device; deleted at session end |

Never stored, by architecture: free-text responses, drawings/strokes, guesses, audio/voice
(explicitly stripped by sanitizers before any cloud write), real names, emails, or accounts —
students authenticate anonymously and create no account.

## 3. The two-backend reality

- **Gemini Canvas surface (demos/authoring):** Firebase project is injected and operated by
  Google's Canvas platform. AlloFlow cannot configure it. *Engineering judgment, verify with
  counsel:* a district's Google **Workspace for Education** DPA covers the enumerated Workspace
  services; the consumer Gemini/Canvas environment is generally **not** one of them — do not
  assume DPA coverage extends there.
- **Owned deployment (classroom phase):** project `prismflow-911fe` (or a pilot-dedicated
  successor) — district-inspectable on request, server-side rules deployed from the repo's
  `firestore.rules`, TTL policies available. **Recommendation: all student classroom traffic runs
  here**, where access, retention, and audit are controllable and a standard DPA (e.g. the
  SDPC/NDPA used widely in Maine) can be signed. Canvas remains a teacher-side authoring surface.

## 4. Honest exceptions and their remediation plan

An ironclad posture names its own soft spots. Both are tracked and closable:

1. **Live-quiz structured answers** are stored (session doc) so the teacher dashboard can
   aggregate them. They're choice/rating selections keyed to codename + anonymous uid, and they
   now die with the session — but a stored answer-by-codename during class time is the closest
   thing in the system to a performance record. **Remediation:** migrate quiz responses to the
   same WebRTC transport polls use (responses land only on the teacher device; aggregates
   computed there; nothing stored). Feasible with the existing transport; tracked as the top
   FERPA-hardening code item.
2. **`conceptMastery`** keeps cross-session correctness history per anonymous uid to power a
   retention dashboard. It contains status enums only, but it is longitudinal, persistent, and on
   the shared backend — the weakest fit with the "nothing that resembles a record is stored"
   claim. **Remediation:** relocate to device-local storage / the student's project file (the
   pattern AlloFlow already uses for all student work), sharing with the teacher only through the
   existing user-controlled file flow. Until then, this feature should be considered opt-in for
   classroom use.
3. **Teacher free-text class broadcast (Bridge)** relies on the teacher not typing student names
   into a class-wide message — a professional-judgment channel, same as writing on the board.
   Documented at the allowlist; long-term fix is the same WebRTC migration.

## 5. Regulatory map (engineering summary — counsel confirms)

- **FERPA:** turns on whether PII from education records is maintained/disclosed. The design goal
  is that nothing maintained server-side is linkable to a student "with reasonable certainty" —
  hence codenames-from-dropdowns, anonymous auth, no accounts, session-end deletion. §4's two
  items are where a reviewer could push back; closing them makes the argument clean.
- **State student-privacy law (Maine):** SOPIPA-style operator duties (Maine's student
  information privacy act) attach to *operators of services used for school purposes* regardless
  of how little is stored — no targeted advertising, no profiling, no sale, deletion on request.
  AlloFlow trivially complies in substance (no ads, no tracking, no sale, nothing to delete), but
  "compliance by architecture" should still be stated in a signed agreement.
- **COPPA:** middle school includes under-13 students. No accounts, no persistent identifiers used
  for tracking/ads, and anonymous auth keep the surface minimal; counsel should confirm the
  anonymous-uid + conceptMastery combination (another reason for §4.2).
- **Practical instrument:** districts don't reward "we don't need a DPA"; they reward easy
  vetting. The strong position is *both*: sign the standard DPA **and** be able to attach §2's
  table showing there's almost nothing behind it.

## 6. One-paragraph summary for a reviewer

AlloFlow's live classroom features are peer-to-peer by design: student work and responses move
directly between devices and are never written to any server. The backend stores only thin,
non-typed session coordination metadata under curated codenames and anonymous IDs, deleted when
the session ends. For classroom deployments this runs on a district-inspectable Firebase project
with server-side access rules (students can write only their own entries) shipped in this repo.
Two legacy storage paths (structured quiz answers during the session; a cross-session mastery
counter) are documented above with concrete remediation plans, and the vendor will sign the
standard SDPC/NDPA.
