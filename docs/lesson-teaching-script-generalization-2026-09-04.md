# Lesson-aware teaching scripts (generalization of the pilot)

Implemented locally on September 4, 2026. This supersedes the fractions/grades 3–6 restriction described in `lesson-teaching-script-pilot-2026-09-04.md`. That restriction was an implementation choice by the earlier assistant, not the intended product scope. The feature now follows the content of the saved lesson: its subject, topic, objectives, recorded grade or age group, language, standard, phases and selected materials.

## What the teacher sees

In a saved teacher lesson plan, **Teaching script** first shows the detected lesson context (subject, grade source, plan phases). The form lets the teacher confirm or correct:

- **Subject area** (mathematics, reading and literacy, writing, science, social studies and history, world languages, arts and music, health and physical education, technology and computer science, other) and a free-text **lesson topic**. Detection is keyword-based across the plan title, objectives, essential question, phase text and selected materials, with keyword families in English plus Spanish, French, German and a few other scripts. Detection never blocks generation; the teacher's choice does.
- **Grade or age group**, using the app's own vocabulary (Pre-K through 12th Grade, College, Graduate Level). A saved custom label such as "Adult learners" is kept verbatim and offered as an option. The grade comes from the saved plan's recorded grade; if the plan has none, the field is empty and must be chosen. Current workspace settings are not borrowed for grade or standard.
- **What to script**: a *direct-instruction segment* (5–60 minutes, 3–8 steps) or the *whole lesson* (15–240 minutes, 4–24 steps, each step tagged with the plan phase it belongs to). The scope is stored on the version, shown in the header and export, and the saved warnings state explicitly whether the script covers one segment or the whole lesson.
- Learning goal, teaching time in whole minutes, prior learning, optional standard, script language (from the saved plan), lesson resources, and the research toggle.

Generated steps keep the pilot's fields (teacher wording, learner actions, check question, possible response, if-struggling, if-ready). The prompt now asks for a likely misconception inside the if-struggling branch, wait time and participation, and subject- and age-appropriate examples, vocabulary and pacing.

## Research selection

`lesson_teaching_research_module.js` replaced the single hardcoded fractions guide with a reviewable catalog of 20 public What Works Clearinghouse practice guides (guide IDs 1–6, 8, 14–22, 26, 29–31), each with its real URL, publication date, stated grade range, subject tags, topic keywords and an evidence kind: *content-specific* or *general-practice*. Titles and URLs were verified against the live WWC index and each guide page on September 4, 2026.

Selection is local: catalog entries are filtered by the lesson grade (when the label is numeric), scored by subject match, topic/goal/standard keyword hits, and boosted when the app's search provider returns that guide's URL. Guides that address a different primary subject (for example adolescent literacy for a history lesson) count only when the lesson names one of their practices. The fractions guide requires a fraction, ratio or proportion keyword, so it is no longer a universal fallback. A general-practice guide can be included as a second source, and a script backed only by general guidance carries a warning saying so.

Only fixed catalog vocabulary leaves the device in the search query (subject phrase, grade band, and topic words that also appear in the catalog). Goal, standard, prior learning and materials never do. Search snippets still never count as evidence; up to two guide pages are read in full through the same allowlisted Jina reader, which now accepts any catalogued guide URL and nothing else. The parser recognizes the live page layout (bare recommendation number, evidence-rating image link, recommendation sentence) and keeps each recommendation's text verbatim with its WWC rating (Strong, Moderate, Minimal) when present. Guide pages that list their grades are checked against the lesson grade; a mismatch rejects the source with a visible reason. When nothing can be verified the teacher gets an explanation and can turn research off explicitly.

## Data and compatibility

- Version schema is now 2 with `scope`, per-step `phase`, subject/topic in the input snapshot, and `evidenceKind` on sources. Schema 1 pilot versions remain readable, editable (under their original 10/15/20-minute, 3–6-step, 20-minute-per-step rules) and exportable.
- `LessonTeachingScript` gained `normalizeGrade`, `gradeBand`, `detectContext`, `GRADES`, `SUBJECTS`, `SUBJECT_LABELS`, `SCOPES`, `PHASES` and `scopeLabel`.
- `LessonTeachingScriptHost.defaultSettings(plan, ambient, materials)` returns the detected context plus grade, subject and scope options; the ambient workspace only supplies a language fallback.
- `LessonTeachingResearch` gained `catalog()`, `buildSearchQuery()`, `selectCandidates()` and `extractSource()`; `collect()` takes `{ grade, subject, topic, goal, standard, signal }`.
- The host shell passes the literal query to `WebSearchProvider.search` as the override so the provider does not rewrite it.

## Validation

Focused suites: core 29, research 55, host boundaries 19, UI 22, app integration 4, existing resource mutations 36. New coverage includes early reading, middle-school science, secondary history, a Spanish-language lesson, custom and postsecondary age labels, catalog and page-stated grade mismatches, rejection of the fractions guide for non-fraction lessons, general-practice-only evidence, whole-lesson scope rules, legacy version compatibility, and defaults that ignore ambient grade/standard. One combined run reproduced the known vitest worker stall on this OneDrive workspace; the affected file passed when rerun on its own.

Live retrieval: the generic parser was run against all 20 real guide pages (79 recommendations, all with a captured WWC rating), and the research adapter was run end to end over the network for six lesson contexts (see `scratch/lesson-teaching-live-retrieval.log`).

Not verified: live model output. No AI provider key is available in this environment, so generated script prose for the new subjects has not been reviewed by educators. Existing passing tests establish software behavior, not classroom effectiveness.

## Remaining limits

- The evidence catalog is WWC-only. Science, social studies, arts, world languages, health and technology lessons therefore receive general-practice guidance (or literacy guidance when the lesson names reading or writing practices) rather than content-specific research. Adding other reputable publishers requires a page parser for each and an allowlist entry; the catalog structure supports that.
- Subject detection is keyword-based and best-effort; the form is the source of truth.
- No production deployment was performed.
