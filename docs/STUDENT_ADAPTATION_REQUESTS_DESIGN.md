# Student-Requested Adaptations — Design

**Date:** 2026-08-05 · **Status:** DESIGN — nothing built · **Owner:** Aaron Pomeranz
**Companion reading:** the `signal` enum in the participant write allowlist; Gemini Bridge's
per-device local generation; `resolveLiveStudentResourceTarget`'s individual > group > class
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

**Yes, with one condition and three named failure modes.**

It fits the existing architecture unusually well — see §3 — and it addresses a real gap rather
than an imagined one. The condition is that it must degrade gracefully when the student has no
AI, because a feature that only works for students on the paid path is a feature that widens
the gap it claims to close.

The three ways it fails:

1. **Regeneration quality.** A simplification that loses the learning objective, or a
   mistranslation of the one term the lesson turns on. The student who needed the adaptation
   is the least able to detect that it is wrong. This is the strongest argument for teacher
   oversight and it drives §5.
2. **Sync-mode divergence.** The teacher says "look at the second paragraph" while a student
   is on a rewritten version whose paragraphs do not correspond. Adapted content must preserve
   structure, not just meaning.
3. **Pack bloat.** Per-student variants written back to the session multiply payload against
   the 85KB ceiling and the chunked pack channel. §6 keeps artifacts local for this reason.

## 3. Why it fits what already exists

Four pieces are already in place, which is most of why this is worth doing.

**Delivery is solved.** `resolveLiveStudentResourceTarget` already resolves
`individual > group > class`, and the individual override works *inside* sync mode with
locked-follow semantics. A student's adapted variant is just `roster[uid].resourceId`.

**The request shape is already the house style.** Every student write is validated against an
allowlist, and `signal` is an enum (`stuck | slow | repeat | ready`) precisely so students
never write free text into shared storage. An adaptation request is enum-shaped too: a
bounded set of adjustment types, not prose. It needs no privacy exception.

**Per-device generation has precedent.** Gemini Bridge already regenerates teacher messages
on the *student's* device using their group profile, for exactly the reason that applies here:
the adaptation belongs to the reader.

**Standing preferences already have a home.** A per-student adaptation profile is what a group
profile already is (`language`, `readingLevel`, `simplifyLevel`, `visualDensity`,
`communicationMode`, `dokLevel`). A standing student preference is a group of one, not a new
concept.

## 4. Two kinds of adjustment, and why the distinction carries the design

This is the load-bearing decision.

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

**Not for everything, and preview is the wrong frame for half of it.**

Aaron's instinct is right that the teacher must not be bypassed. But requiring approval before
a Spanish-speaking student may *read the page* recreates the bottleneck the feature exists to
remove, and does it to the student with the least slack. A teacher mid-lesson is the busiest
person in the room.

The useful split is not preview-vs-no-preview, it is **approval before delivery** versus
**visibility after delivery**:

- **Access adjustments: immediate, always visible.** No gate. The teacher sees that it
  happened and can revert or intervene. Withholding a translation pending approval is not
  caution, it is a barrier with a permission slip attached.
- **Content adjustments: teacher approval by default.** The request reaches the teacher as a
  card ("Falcon 7 asked for a simpler version of Resource 3"), the teacher previews the
  generated variant, and approves, edits, or declines. The student sees "asked — waiting" and
  keeps the original meanwhile, never a blank screen.
- **Per-assignment override.** A teacher who wants content adjustments to flow freely can turn
  approval off; a teacher who wants to approve even translations can turn it on. Default as
  above.

**Why approval defaults ON for content:** failure mode 1. The student who needs a simplified
text cannot audit whether the simplification kept the point. Somebody must, and it is the
person accountable for the instruction.

**Why approval defaults OFF for access:** a student is entitled to their accommodations
without asking permission each time, and the app's own design already says so — checkpoints
never suppress access supports, and `CHECKPOINT_ALWAYS_ALLOWED` exists for exactly this
reason. Gating translation would contradict a rule the codebase already enforces elsewhere.

## 6. What gets stored, and where

**The request goes to the session. The artifact stays on the device.**

- The **request** (uid, resourceId, adjustment type, settings, timestamp) is small, enum-shaped
  and Tier-1 safe. It rides the participant write allowlist as a new validated field.
- The **generated variant** stays local to the requesting device, exactly as Gemini Bridge's
  regenerated messages do. It is never written back to the session doc.
- The **teacher's history** records the request and its settings, not the artifact. That is
  what gives the teacher the durable value ("three students needed Spanish; two needed a
  simpler version of the same page") without multiplying pack size.
- **Promotion is a teacher act.** If a variant is good and worth reusing, the teacher can add
  it to the pack deliberately. Automatic promotion is how the 85KB ceiling gets hit.

## 7. Who generates it

Ordered by preference, degrading rather than failing:

1. **Student device**, when student AI is available. Matches the bridge precedent and costs
   the teacher nothing.
2. **Teacher device**, when the student has none and the teacher is present. Bounded by the
   approval queue, which conveniently rate-limits it.
3. **Neither** — the request still reaches the teacher as a signal ("2 students requested
   Spanish"). No AI required, and this is the path that works on the no-AI Cloudflare shell.
   The teacher can act on it however they like, including outside the app.

Path 3 is the important one. It means the feature has value even where the AI does not exist,
which is what keeps it from being a feature for well-resourced classrooms only.

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

## 11. Rough sequencing

| Phase | Scope |
|---|---|
| A | Request channel: allowlisted enum field, teacher-visible queue, no generation. Delivers value on its own (path 3 of §7). |
| B | Access adjustments, immediate, generated on the student device. |
| C | Standing preference as a group of one, layered over group profile. |
| D | Content adjustments with teacher approval + preview. |
| E | Promotion of a variant into the pack, as a teacher act. |

A is small and independently useful. D is where the preview UI lands and should not be first.
