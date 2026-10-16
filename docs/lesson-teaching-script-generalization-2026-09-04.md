# Lesson-aware teaching scripts (generalization of the pilot)

Implemented locally on September 4, 2026. This supersedes the fractions/grades 3–6 restriction described in `lesson-teaching-script-pilot-2026-09-04.md`. That restriction was an implementation choice by the earlier assistant, not the intended product scope. The feature now follows the content of the saved lesson: its subject, topic, objectives, recorded grade or age group, language, standard, phases and selected materials.

## What the teacher sees

In a saved teacher lesson plan, **Teaching script** first shows the detected lesson context (subject, grade source, plan phases). The form lets the teacher confirm or correct:

- **Subject area** (mathematics, reading and literacy, writing, science, social studies and history, world languages, arts and music, health and physical education, technology and computer science, other) and a free-text **lesson topic**. Initial suggestions use the saved lesson and materials. AI determines these two fields when generating unless the teacher has edited them; each field keeps its own override. **Use AI for subject and topic** restores automatic selection. Grade and standard still follow the saved plan and explicit teacher choices.
- **Grade or age group**, using the app's own vocabulary (Pre-K through 12th Grade, College, Graduate Level). A saved custom label such as "Adult learners" is kept verbatim and offered as an option. The grade comes from the saved plan's recorded grade; if the plan has none, the field is empty and must be chosen. Current workspace settings are not borrowed for grade or standard.
- **What to script**: a *direct-instruction segment* (5–60 minutes, 3–8 steps) or the *whole lesson* (15–240 minutes, 4–24 steps, each step tagged with the plan phase it belongs to). The scope is stored on the version, shown in the header and export, and the saved warnings state explicitly whether the script covers one segment or the whole lesson.
- Learning goal, teaching time in whole minutes, prior learning, optional standard, script language (from the saved plan), lesson resources, and the research toggle.

Generated steps keep the pilot's fields (teacher wording, learner actions, check question, possible response, if-struggling, if-ready). The prompt now asks for a likely misconception inside the if-struggling branch, wait time and participation, and subject- and age-appropriate examples, vocabulary and pacing.

## Recovery and editing (October 13, 2026)

- Invalid generated JSON receives local format recovery and a bounded repair request. If a complete script still cannot be validated, generation falls back to smaller sections. Only a complete, validated version is added to the lesson.
- **Resume script** reuses completed sections, resolved context and research when the teacher, saved lesson, resources and settings still match. A run with verified research can resume writing even if live research is temporarily unavailable, including when its first section has not finished. Unfinished writing still requires the text provider; a new researched script still requires research access. Trying a different form setting hides incompatible recovery; restoring the original setting makes the saved progress available again. Starting a new generation replaces that plan's previous pending run.
- A complete script that could not be saved stays recoverable. **Finish saving** retries saving that exact version without another AI request. Generation recovery uses this tab's session storage, with up to five entries, a 24-hour expiry and a 300 KB limit per stored entry. Larger entries or storage failures retain progress in memory while the controller remains available. The app distinguishes confirmed stored progress from work kept only in memory; the latter shows a recovery warning and requests a browser warning before reload or close, including while different form settings temporarily hide Resume.
- **Start over** confirms that the pending script was removed from browser storage before starting a new run. If clearing cannot be confirmed, the existing progress remains available for Resume or another attempt to start over. Clearing one pending script preserves stored progress belonging to other lessons and teachers.
- **Regenerate step** accepts an optional adjustment and returns one replacement in an unsaved draft. It can repair incomplete wording in the selected step while preserving the step's timing and surrounding edits. Other unfinished steps and invalid timing must be corrected first. **Undo step replacement** restores that step's wording from immediately before its latest regeneration while keeping other draft edits. Editing the replaced step manually clears its undo control. Draft recovery also retains undo information when it fits within the existing recovery limit.
- Draft timing feedback shows how many minutes to add or remove to match the saved version's teaching time. Teachers choose how to redistribute those minutes; generation does not silently change them.
- **Restore saved step** restores one edited step's saved wording and minutes without changing other draft steps or calling AI. **Undo step restore** brings back that step's previous edits, including unfinished wording or timing. Both actions stay in the draft until **Save edits**. Restoring a saved duration can change the draft total, which remains visible for review.
- **Save edits** applies the draft; **Discard edits** leaves the saved version untouched. Saving edits and deleting a version require an explicit success response before the editor or deletion confirmation closes. An empty or incomplete response retains the draft or confirmation for retry, including draft recovery after navigation. Changed source content or a changed saved version blocks stale replacements. Older scripts without recorded original inputs remain readable and editable, but need a new generated version before individual-step regeneration.

Regression coverage lives in `lesson_teaching_script_resume`, `lesson_teaching_step_host`, `lesson_teaching_step_regeneration`, `lesson_teaching_step_ui`, `lesson_teaching_step_undo`, `lesson_teaching_step_restore`, `lesson_teaching_generation_storage_ui` and `lesson_teaching_script_integration` under `tests/`.

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

## Initial validation (September 4, 2026)

Focused suites: core 29, research 55, host boundaries 19, UI 22, app integration 4, existing resource mutations 36. New coverage includes early reading, middle-school science, secondary history, a Spanish-language lesson, custom and postsecondary age labels, catalog and page-stated grade mismatches, rejection of the fractions guide for non-fraction lessons, general-practice-only evidence, whole-lesson scope rules, legacy version compatibility, and defaults that ignore ambient grade/standard. One combined run reproduced the known vitest worker stall on this OneDrive workspace; the affected file passed when rerun on its own.

Live retrieval: the generic parser was run against all 20 real guide pages (79 recommendations, all with a captured WWC rating), and the research adapter was run end to end over the network for six lesson contexts (see `scratch/lesson-teaching-live-retrieval.log`).

Not verified: live model output. No AI provider key is available in this environment, so generated script prose for the new subjects has not been reviewed by educators. Existing passing tests establish software behavior, not classroom effectiveness.

## Remaining limits

- The evidence catalog is WWC-only. Science, social studies, arts, world languages, health and technology lessons therefore receive general-practice guidance (or literacy guidance when the lesson names reading or writing practices) rather than content-specific research. Adding other reputable publishers requires a page parser for each and an allowlist entry; the catalog structure supports that.
- Initial context suggestions are best-effort. AI-selected subject and topic can be reviewed and overridden by the teacher.
- No production deployment was performed.
