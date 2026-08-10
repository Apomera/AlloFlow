# Student-Requested Adaptations — Design

**Date:** 2026-08-05 · **Status:** DESIGN — nothing built · **Owner:** Aaron Pomeranz
**Companion reading:** the `signal` enum in the participant write allowlist;
`handleBatchGenerateForRoster`; `resolveLiveStudentResourceTarget`'s individual > group > class
precedence.

---

## 1. The gap

A teacher pushing resources in a live session has to know each participant's language and
preferences **in advance**. That is the opposite of the flexibility the platform is for, and
it fails exactly the students it should serve best: the newcomer nobody knew was joining, the
student whose reading level does not match the group they were placed in, the child who needs
a visual today and did not yesterday.

Today the only fix is the teacher noticing and acting. This design lets the student ask.

## 2. Is this a good idea?

**Yes. It is also smaller than it first appears.** — *CORRECTED 2026-08-05, see §7.*

The first draft of this doc treated adaptation as a generation problem to be solved on the
student device. That was wrong, and it invented complexity that does not exist. **The teacher
generates the variant, using tooling that already ships**, and sends it with per-student
targeting that already ships. The student device needs no AI at all.

What is actually missing is narrow: a student cannot **ask**, and a teacher has no **queue**
of asks. Everything downstream of the ask already works.

The failure modes that remain:

1. **Regeneration quality.** A simplification that loses the learning objective, or a
   mistranslation of the one term the lesson turns on. Mitigated structurally now — the
   teacher generates it, so the teacher has seen it before it is sent.
2. **Sync-mode divergence.** The teacher says "look at the second paragraph" while a student
   is on a rewritten version whose paragraphs do not correspond. Adapted content must
   preserve structure, not just meaning (§9).
3. **Teacher load.** The real cost moved here. Thirty students who can all ask is thirty
   requests during a lesson. §5 and §11 exist to keep that manageable.

## 3. Why it fits what already exists

Four pieces are already in place, which is most of why this is worth doing.

**Delivery is solved.** `resolveLiveStudentResourceTarget` already resolves
`individual > group > class`, and the individual override works *inside* sync mode with
locked-follow semantics. A student's adapted variant is just `roster[uid].resourceId`.

**The request shape is already the house style.** Every student write is validated against an
allowlist, and `signal` is an enum (`stuck | slow | repeat | ready`) precisely so students
never write free text into shared storage. An adaptation request is enum-shaped too: a
bounded set of adjustment types, not prose. It needs no privacy exception.

**Teacher-side generation already ships.** The teacher can batch-generate differentiated
variants today and push them per student. This is the piece the first draft missed, and it is
why the design is a workflow on top of existing capability rather than new machinery. (Gemini
Bridge does per-DEVICE generation, but for a fan-out reason that does not apply here — §7.)

**Standing preferences already have a home.** A per-student adaptation profile is what a group
profile already is (`language`, `readingLevel`, `simplifyLevel`, `visualDensity`,
`communicationMode`, `dokLevel`). A standing student preference is a group of one, not a new
concept.

## 4. Two kinds of adjustment, and why the distinction carries the design

> **Partly superseded by §5.** The access-versus-content distinction below is still the right
> way to think about *authority* — who gets to decide. But the split that drives the BUILD is
> presentation-versus-generation (§5), because that is what determines whether a student can
> be served without waiting for anyone.

This remains the load-bearing decision about authority.

| | **Access adjustments** | **Content adjustments** |
|---|---|---|
| Examples | translate, read-aloud, glossary, larger text, visual density | simplify, change reading level, change DOK, regenerate as a visual |
| What changes | how the same content is *presented* | what is actually *taught* |
| If it is wrong | the student notices (it is unreadable) | the student cannot notice (it reads fine, it just lost the point) |
| Analogy | providing the accommodation on the plan | modifying the curriculum |

An access adjustment is the student exercising a support they are entitled to. A content
adjustment changes the instructional target, which is the teacher's professional judgment.

Treating those the same is the mistake this design exists to avoid.

## 5. Teacher preview — recommended answer

*Rewritten 2026-08-05. The original answer argued against gating translations behind teacher
approval. That argument survives, but the framing changed: since the teacher generates, the
question is no longer "should the teacher preview?" (they always will) but **"which
adjustments should not need the teacher at all?"***

**Preview is now inherent for anything generated.** The teacher makes it, so they have seen
it. There is nothing to design.

The remaining question is which adjustments a student can get **immediately**, and the honest
split is not access-versus-content but **presentation versus generation**:

| | **Presentation adjustments** | **Generative adjustments** |
|---|---|---|
| Examples | read-aloud, text size, visual density, karaoke, contrast, existing glossary | translate, simplify, change reading level, regenerate as a visual |
| Needs AI? | **No** | Yes |
| Needs the teacher? | **No** | Yes |
| Latency | instant | as fast as the teacher gets to it |

**Presentation adjustments should be immediate and local.** They need no AI, no teacher and
no request at all — they are settings the student device applies to content it already has.
Routing read-aloud through an approval queue would be absurd, and would contradict a rule the
codebase already enforces: checkpoints never suppress access supports, which is what
`CHECKPOINT_ALWAYS_ALLOWED` exists for.

**Generative adjustments go to the teacher**, who generates, reviews and sends. Translation
lands here, which is the one uncomfortable case: a student who cannot read the page waits for
a human. Mitigations, in order of preference:

- The teacher pre-generates for languages the roster shows (they can already batch-generate).
- The request is visible immediately and prominently, not buried in a panel.
- **Optionally**, if student AI happens to be enabled, translation may resolve on-device
   without waiting. This is an accelerant for a configuration most classrooms will not have,
   and explicitly NOT the design centre. The first draft had this backwards.

## 6. What gets stored, and where

*Simplified 2026-08-05.* With the teacher generating, a variant is an ordinary resource made
the ordinary way. It enters the pack exactly as any teacher-made differentiated resource does
today, and is delivered by `roster[uid].resourceId`. There is no new storage path, no
device-local artifact, and no promotion step — the earlier draft invented all three.

What is new is small:

- The **request** (uid, resourceId, adjustment type, settings, timestamp): enum-shaped,
  Tier-1 safe, rides the participant write allowlist as a new validated field.
- The **queue state** (open / generating / sent / declined) so a request cannot be silently
  lost, and so a student is never left staring at "asked" forever.

Pack growth is whatever it already is when a teacher differentiates by hand. The 85KB ceiling
concern in the first draft came from per-student local variants, which this design no longer
has.

## 7. Who generates it — CORRECTED

**The teacher. Using `handleBatchGenerateForRoster` and the existing per-student push.**

The first draft ranked student-device generation first, on the strength of the Gemini Bridge
precedent. That was a mis-transfer. The bridge generates per-device because it fans **one**
message out to **N** languages simultaneously; doing that centrally would mean N calls and N
variants in a size-limited document. That is a fan-out problem.

An adaptation request is not fan-out. It is **one student, one resource, one variant, with the
teacher already in the loop**. The teacher has the AI, has the authority, and has to see the
result anyway. Generating anywhere else adds cost and risk for nothing.

Consequences of getting this right, all of them simplifications:

- **No student AI required.** The "condition" §2 originally attached to this design
  disappears; it works on the no-AI Cloudflare shell by default rather than by fallback.
- **Preview is free.** The teacher generated it.
- **Quality control is inherent** rather than bolted on.
- **No new generation code.** The teacher already has the buttons.

The async case (homework, no teacher present) is not an exception: the request simply queues
until the teacher opens the session. A student waiting for a human is the honest behaviour,
and it is better than a silently wrong machine translation nobody checked.

## 8. One-off or standing?

**Standing, implemented as a group of one.** Recommended.

A one-off adaptation dies the moment the teacher advances the resource, which means a student
who needs Spanish must re-ask on every page. That is worse than not having the feature.

A standing preference maps onto the existing group-profile mechanism, survives resource
changes, and gives the teacher one thing to review rather than twenty. The student keeps a
visible, revocable "how I'm getting this" setting.

Implementation note: this needs care where a student is *already* in a group. A per-student
profile should **layer over** the group profile, not replace it — otherwise requesting a
translation silently discards the reading level the teacher set.

## 9. Sync-mode behaviour

The precedence chain already permits the divergence, so the work is in making it legible
rather than in permitting it:

- The student sees which version they are on, and can return to the class version in one tap.
- **Structure is preserved.** The adaptation prompt must hold section and paragraph
  correspondence, so "look at the second paragraph" still works. This is a prompt constraint
  and a test, not a hope.
- The teacher roster shows who is on an adapted version, alongside the existing
  `viewingResourceId` presence data.

## 10. Open questions

1. **Is a student's adaptation request recorded as a support event** in the provenance ledger?
   It is genuinely a support, and the fade lane would show it. But logging every request could
   create quiet pressure not to ask. School-psych judgment, not engineering. (§15.2 of the
   provenance design defines the event; nothing forces us to emit it here.)
2. **Which adjustment types ship first?** Recommend translate and read-aloud (access, highest
   value, lowest risk) before any content adjustment.
3. **Can a student see that others requested the same thing?** Recommend no. It is a
   disclosure of another student's needs.
4. **Does the request survive the session** into the student's saved project, so tomorrow's
   session starts adapted? Convenient, but it makes a transient preference durable and
   therefore a record.

## 11. Rough sequencing — CORRECTED

| Phase | Scope |
|---|---|
| A | **Presentation adjustments, local and instant.** No request, no teacher, no AI. Read-aloud, text size, density, contrast. Pure win, no protocol. |
| B | **Request channel**: allowlisted enum field + teacher queue. No generation — the teacher fulfils by hand with existing tools. Useful immediately. |
| C | **One-tap fulfilment**: the queue card wires the existing generate-and-push actions together so a request is two taps rather than six. |
| D | **Standing preference** as a group of one, layered over the group profile (§8). |
| E | Optional: on-device resolution for translation where student AI exists. Accelerant only. |

A is genuinely free and should probably ship regardless of the rest. B is where the idea
actually lives, and it needs no AI anywhere.

