# Teacher guide coverage checklist

**Maintained by:** Lane 11 (teacher manual)
**Last audited:** 2026-08-16, against `FEATURE_INVENTORY.md`, `tool-catalog-data.js`, and `ui_strings.js`.

This table maps major user-facing surfaces to the chapter that covers them. It is a planning
tool, not a build input; nothing reads it. Update it when you add a chapter or when the app
grows a surface a teacher will meet.

Two conventions worth knowing:

- **Chapter order comes from `guide.json`, not from the filename prefix.** The prefix is
  creation order. `11-universal-settings.md` is chapter 3 because that is where it sits in the
  manifest array. Chapters cross-link by filename, so renaming files breaks links and the
  builder will fail the build. Reorder in the manifest instead.
- Coverage is judged from the **teacher's** point of view. A surface counts as covered when a
  teacher could act on it, not merely when the guide mentions the word.

Legend: **Full** covered as a task a teacher can follow · **Partial** named, with less
detail than a first-time user needs · **Gap** not covered.

---

## Design note: what this guide deliberately is

The guide is organized around teaching decisions, not around the tool catalog. That is the
right design and this audit did not change it. AlloFlow has roughly 250 catalog entries plus
about 95 STEAM Lab tools and 32 SEL Hub tools; a chapter per tool would be a catalog nobody
reads, and it would be stale within a month.

The generated `guide/tool-reference.html` page already covers the catalog exhaustively and
regenerates itself from `tool-catalog-data.js`, so per-tool detail is handled and stays
current for free. What the prose chapters owe a teacher is the surfaces they cannot avoid:
the settings that affect everything, the delivery routes, and the review gates.

That is the standard the gaps below are judged against.

---

## Core teaching workflow

| Surface | Chapter | Status |
| --- | --- | --- |
| Launch Pad routes (Guided Mode, Full AlloFlow, Learning Tools, Educator Tools) | 1 Start here, 10 Specialist reference | Full |
| Guided Mode step sequence | 1 Start here | Full |
| Source Material intake (paste, file, catalog, web, topic) | 1, 2 Prepare a lesson | Full |
| Analyze Source Material | 2 Prepare a lesson | Partial |
| Assignment Directions and Goals | 1, 2 | Full |
| **Universal Settings (grade, language, standards, interests, DoK, emoji)** | **3 Universal Settings** | **Full (added 2026-08-16)** |
| **Translations control** | **3 Universal Settings** | **Full (added 2026-08-16)** |
| Text Adaptation / Adapted Text | 2, 3, 10 | Partial |
| Glossary | 2, 7 Classroom workflows | Partial |
| Lesson Images | 10 Specialist reference | Partial |
| Visual Organizer | 2, 10 | Partial |
| Quiz and Assess | 2, 6 Review and next steps | Partial |
| Full Resource Pack | none | Gap |
| Lesson Plan generator | none | Gap |
| Teacher review gate | 1 Start here | Full |

## Delivery and student experience

| Surface | Chapter | Status |
| --- | --- | --- |
| Live Session, pacing, routing, Teacher Signal | 4 Live sessions | Full |
| Homework QR and student links | 1, 2 | Full |
| Test latest student link | 1, 2 | Full |
| Student view mode | 4, 6 | Partial |
| Adventure Mode, including the teacher on/off switch | none | Gap (feature stable; switch landed in this fleet) |
| Save Project and Load Project | 1, 2, 10 | Full |
| Exports (PDF, Worksheet, HTML, Slides) | 2, 9 Troubleshooting | Partial |
| Document Builder and Page Designer | none | Gap |
| Annotation tools | 10 | Partial |

## Access, review, and safety

| Surface | Chapter | Status |
| --- | --- | --- |
| Accessibility review of a resource | 5 Accessibility and UDL | Full |
| Accessibility Lab | 5, 10 | Partial |
| PDF Accessibility and remediation | 10 | Partial |
| Immersive Reader and reading supports | 5, 10 | Partial |
| Read-aloud and TTS, voice choice | 5, 9 | Partial |
| Privacy, de-identification, responsible AI | 8 Privacy and responsible AI | Full |
| Evidence, dashboards, session summaries | 6 Review and next steps | Full |
| Troubleshooting and recovery | 9 Troubleshooting | Full |
| Help Mode, Find a Tool, keyboard reference | 10 Specialist reference | Full |

## Specialist and hub surfaces

| Surface | Chapter | Status |
| --- | --- | --- |
| STEAM Lab | 7, 10 | Partial |
| SEL Hub | 7, 10 | Partial |
| Word Sounds Studio | 10 | Partial |
| Symbol Studio and AAC | 10 | Full for boundaries |
| BehaviorLens, Dynamic Assessment, Report Writer | 10 | Full for boundaries |
| Research Hub, Learning Commons, Test Prep | 10 | Partial |
| Creative studios (AlloStudio, Video, StoryForge, LitLab, PoetTree, Open Groove) | 10 | Full for boundaries |
| Math Fluency | none | Gap |
| AlloBot and hands-free voice | 10 glossary only | Gap |
| Family mode | none | Gap |
| Educator evaluation mode | none | Gap |
| Per-tool catalog detail (~250 entries) | generated `tool-reference.html` | Full, generated |

## School and rollout

| Surface | Chapter | Status |
| --- | --- | --- |
| 30-day rollout and coaching | 11 School rollout | Full |
| Shared guardrails and policy | 8, 11 | Full |
| Deployment differences (hosted, desktop, Canvas, BYOK) | noted throughout | Partial |
| Admin and IT configuration | 10 pointer only | Gap, deliberate |

---

## Gaps closed in this pass

1. **Universal Settings** had zero coverage and is the single surface every teacher touches
   before generating anything. It is now chapter 3, including the "applies to new work only"
   rule that explains most mismatched-pack reports.
2. **Translations** is new in the app as of this fleet and is documented with it, including
   the automatic default and why the control hides itself.
3. **Product glossary** gained Adapted Text, AlloBot, Lesson Images, and Universal Settings.
4. **Stale product names** corrected: STEM Lab to STEAM Lab, Leveled Text to Text Adaptation
   and Adapted Text.

## Gaps deliberately left, and why

- **Adventure Mode** and **Math Fluency** are the top of the next backlog, and my original
  reason for deferring them was wrong. I assumed both were mid-move. Re-checked against Lane
  10's completed report: Adventure's teacher switch (**Include Adventure in this assignment**)
  has **landed**, and Lane 10 explicitly decided **not** to relocate Math Fluency, recommending
  navigation rather than a move. Both are stable enough to document now. They are deferred
  only for time, not for churn risk.
- **Document Builder and Page Designer** are power-user surfaces. A teacher can deliver a
  full lesson without them, so they rank below the first-week items.
- **AlloBot** is glossary-only rather than a chapter. Lane 7 is changing its intake model
  this week; a task-level chapter should wait until that lands.
- **Family mode** and **educator evaluation mode** are both under review in Lane 10 and are
  not yet stable enough to instruct on.
- **Admin and IT configuration** stays a pointer. It is a different audience and a different
  document, and the guide says so.
- **Per-tool detail** is intentionally not in prose. See the design note above.

## Gaps closed 2026-08-16 (second pass, post-fleet)

- **AlloBot and hands-free voice** — chapter 14, written after the conversation-first intake
  landed and stabilized (offers before screen-changing actions, the "command" accelerator,
  microphone state text, hide-means-tips-only). Deferring it until the surface settled was
  the right call; documenting the old behavior would have been wrong twice.
- **Document Builder and exports** — chapter 15: the four formats, the fill-in-the-blank
  worksheet, the handout reading tools (incl. the offline/web font split), anchored
  annotations, always-light printing, Expert Workbench.
- **Pilot playbook** — a "Run a small pilot before the rollout" section in chapter 10,
  written for a principal starting with 3-5 volunteers and single-tool deep links.
- **lastVerified bumped to 2026-08-16**: W2's browser verification plus Aaron's own recorded
  walkthrough sessions on the live deploy meet the stamp's bar.

Remaining known gaps, still deliberate: Family mode (role scoping settled this fleet but the
parent-facing surface review is fresh; document next pass), Educator evaluation (the demo vs
connected split is now honest in-app; a chapter should follow real district setup experience),
Page Designer (power-user surface), Admin/IT (different audience, different document).
