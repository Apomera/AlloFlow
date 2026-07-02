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
| Session doc: quiz responses | **fallback path only (as of 2026-07-01):** answers travel peer-to-peer to the teacher's device; this stored path fires only when a student's WebRTC connection is down. Structured answers only (free text excluded by code), anonymous uid | student (own entries) | Same — deleted at session end |
| WebRTC signaling docs | connection handshake (SDP/ICE — includes transient network addresses), codename | each participant (own doc) | Deleted ~1 second after the connection opens; `expiresAt` field supports a TTL sweep for orphans |
| `conceptMastery/{uid}` | **RETIRED 2026-07-01** — mastery is now device-local (student's browser + their project file); the cloud write was removed. Legacy docs may exist from before the change and can be bulk-deleted | — (no new writes) | n/a |
| Bridge class message | teacher-authored text broadcast to the class (documented exception; sender de-identified) | teacher only | 24h TTL, cleaned by the teacher's device; deleted at session end |

Never stored, by architecture: free-text responses, drawings/strokes, guesses, audio/voice
(explicitly stripped by sanitizers before any cloud write), real names, emails, or accounts —
students authenticate anonymously and create no account.

## 3. The two-backend reality

- **Gemini Canvas surface (demos/authoring):** Firebase project is injected and operated by
  Google's Canvas platform; AlloFlow cannot configure it. **Correction 2026-07-01 (verified):**
  the Gemini app — Canvas included — became a **Core Service for Google Workspace for Education
  in April 2025**, with enterprise-grade data protection and stated FERPA/COPPA compliance
  support, so district Workspace agreements generally DO cover it for school-account users
  (sources: Google Workspace Updates 2025-04; Google for Education privacy FAQ). Residual items
  for counsel: coverage attaches to *school-account* usage (a public Canvas share opened without
  school sign-in is murkier), and the injected backend remains district-inaccessible (no export,
  retention, or audit controls) — which is why the architecture keeps anything record-like off
  it entirely (§4).
**Platform compliance is not application compliance.** Google's Core-Service FERPA posture
covers the *platform substrate* — how Google processes, protects, and refrains from training on
data that flows through the Gemini app. It does **not** bless the data flows any particular app
built inside Canvas creates. AlloFlow uses Canvas in ways its compliance statement was not
written around: the injected Firebase runtime as a multi-user classroom backend, WebRTC
signaling between student devices, a teacher-shared app joined by a whole class. A badly designed
app could absolutely create FERPA problems *inside* a compliant platform (e.g., storing student
work keyed by real names), and responsibility for that would sit with the school/operator, not
Google. AlloFlow's answer is to make the application layer defensible **without leaning on the
platform statement at all**: student content never enters the shared backend (peer-to-peer), what
does enter is enum/ID-only under curated codenames and is deleted at session end, and the whole
flow is documented in this file. Treat Google's statement as covering the substrate; treat this
document as covering the app. (Also note: the injected Canvas Firebase is a runtime affordance,
not a contracted service — Google can change it without notice, which is an availability
argument, alongside the privacy one, for the owned deployment below. And WebRTC's normal ICE
exchange briefly reveals device network addresses between class peers — routine for
peer-to-peer, low-risk on a school LAN, disclosed here for completeness.)

- **Owned deployment (classroom phase):** project `prismflow-911fe` (or a pilot-dedicated
  successor) — district-inspectable on request, server-side rules deployed from the repo's
  `firestore.rules`, TTL policies available. **Recommendation: all student classroom traffic runs
  here**, where access, retention, and audit are controllable and a standard DPA (e.g. the
  SDPC/NDPA used widely in Maine) can be signed. Canvas remains a teacher-side authoring surface.

## 4. Former exceptions — both RESOLVED 2026-07-01

An ironclad posture names its own soft spots. The two this document originally flagged have been
closed in code:

1. **Live-quiz structured answers — RESOLVED.** Quiz answers now travel over the same
   peer-to-peer WebRTC transport as polls (a dedicated star per session): they land only on the
   teacher's device, aggregates are computed there, and nothing is stored. The old session-doc
   path survives strictly as a fallback for students whose peer connection is down (blocked UDP);
   fallback answers remain structured-only, codename-keyed, and are deleted at session end.
2. **`conceptMastery` — RESOLVED.** Cross-session mastery is now **device-local** (student's
   browser). It reaches the teacher only through user-controlled channels: a live peer-to-peer
   snapshot during a session, and the student's saved **project file** — when a student submits
   their file and the teacher opens it, the mastery block is banked locally on the teacher's
   device for the retention dashboard. The cloud write was removed; legacy cloud docs can be
   bulk-deleted.
3. **Teacher free-text class broadcast (Bridge)** — the remaining documented exception: relies on
   the teacher not typing student names into a class-wide message, a professional-judgment
   channel like writing on the board. Documented at the allowlist; 24h TTL + session-end
   deletion; long-term fix is the same WebRTC migration.

With 1–2 closed, the headline claim is now simply true: **no student-generated data of any kind
is stored on any server in normal operation; session coordination metadata is deleted when class
ends.** (The quiz fallback path is the one narrow, disclosed, self-deleting exception, used only
when a student's device cannot form a peer connection.)

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

AlloFlow's live classroom features are peer-to-peer by design: student work and responses —
including live quiz answers — move directly between devices and are never written to any server
in normal operation. Cross-session mastery data lives on the student's own device and travels
only in their saved project file. The backend stores only thin, non-typed session coordination
metadata under curated codenames and anonymous IDs, deleted when the session ends (one disclosed,
self-deleting fallback exists for quiz answers when a device cannot form a peer connection). For
classroom deployments this runs on a district-inspectable Firebase project with server-side
access rules (students can write only their own entries) shipped in this repo, and the vendor
will sign the standard SDPC/NDPA.
