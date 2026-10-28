# AlloFlow review backlog — 2026-10-27

Portable handoff for Claude Code, Codex, and human reviewers. Prepared at Aaron's request from the October 27 product review.

## Status and use

This is a backlog, not an implementation report. No product code was changed, no tests were executed for these findings, and no complete student journey was verified live. Source mechanics below were reported from the review; exact reviewed commits were not pinned. Reinspect the current checkout, record its SHA, and check existing implementations before editing. Do not treat a proposed enhancement as an established missing feature. No full WCAG conformance or comparative superiority claim is made.

Documentation placement is pending: this file was prepared outside the repository because no accessible checkout or connected coding environment was available. Neither CLAUDE.md nor AGENTS.md has been edited. Proposed placement: docs/review-backlog-2026-10-27.md, subject to repository conventions.

After inspecting existing repository instructions, add a short link in the appropriate existing documentation/reference section of CLAUDE.md and AGENTS.md without replacing other instructions:
“Product review backlog: see docs/review-backlog-2026-10-27.md. Items distinguish source observations, unverified runtime risks and design proposals; revalidate before implementation.”

These notes do not authorize coding, commits, pushes, deployment, or automatic execution. Priorities below are suggested review order, not user-approved severity ratings.

## Priority overview

1. Trust in feedback: Timeline verdict validation, Note-Taking source coverage, DBQ feedback grounding, glossary contextual sense.
2. Accessible manual authoring: tables/charts across Adapted Text and Analyze Source.
3. Learning-feedback precision: Writing Supports, Concept Sort explanations, FAQ evidence links.
4. Future design: branching sequences and consistent cross-resource behavior.

## 1. Glossary: dictionary provenance versus contextual sense

Source: view_glossary_source.jsx, renderFlashcardDictBack; dictionary_loader.js, pickSense.

Observed: flashcard dictionary back calls AlloDictionary.pickSense(entry, item.def || ''). If a matching definition is not found, it can fall back to the first meanings[].definitions[0].definition. Sense selection uses token overlap. The heading “Verified dictionary” identifies a dictionary source, while a qualification says matching occurs “when possible.”

Risk to investigate: a dictionary-sourced definition is not necessarily the meaning used in this lesson or sentence. No misleading flashcard was reproduced live.

Proposal: distinguish “dictionary-sourced” from “lesson-sense-matched”; make unmatched/fallback senses reviewable. Test a word with multiple meanings and a lesson definition unlike the first dictionary sense. Retain teacher editing and contextual images rather than replacing them indiscriminately.

Preserve the connected workflow: illustrated definitions and style choices, in-reading word help, matching/flashcards/crosswords/scrambles/word search/bingo. Activity-purpose cues could clarify meaning practice versus spelling recognition. These strengths do not prove accessibility or classroom efficacy.

## 2. FAQ: supporting-passage traceability

Observed: inspected generation instructions request answers grounded in selected text. Answer-by-answer links to supporting passages were not established.

Proposal: investigate existing support first, then consider “Show supporting text” for teacher verification and student evidence use. Optional think-before-reveal is secondary.

Status: future exploration, not confirmed absence or a defect. Aaron described FAQ as the least-deep resource; a focused reading-support tool does not need organizer-sized feature breadth.

## 3. DBQ: ground feedback in the actual evidence and rubric

Sources: view_dbq_source.jsx; generate_dispatcher_source.jsx.

Observed:
- Essay feedback includes the essay, synthesisPrompt, and document IDs/titles, but not document excerpts. It uses a hardcoded grade-band guide rather than the displayed dbqData.rubric.
- Evidence Tracker detects mentions such as “document X” / “doc X”; this does not establish correct evidence use.
- Reliability assistance receives the first 600 excerpt characters; Vocab Help receives the first 800 and generates its own 4–6 entries.

Future work:
- Investigate including excerpts and the displayed rubric. Distinguish writing coaching from source-verified evidence assessment.
- Label mention tracking accurately; consider traceable evidence links.
- Ask “reliable for which question or claim?” A biased source can still document a perspective.
- Investigate reuse of reviewed lesson glossary definitions and images while preserving contextual sense. Existing cross-resource reuse was not established.
- Evaluate truncated review scope and appropriate expansion/disclosure.

Preserve: quoted/adapted/reconstructed labels, teacher custom excerpts, same-source excerpt disclosure, revision-bound feedback, and analysis → corroboration → essay → self-assessment progression.

Verification: source limitations only; no erroneous runtime assessment reproduced.

## 4. Timeline: verdict completeness before reassuring success

Source: timeline_revision_source.jsx, handleVerifyTimelineAccuracy.

Observed: accepts a parsed array and maps numeric indices using isFactuallyAccurate !== false and isPositionCorrect !== false. The success condition finds no explicitly false verdicts. Empty/incomplete arrays or missing/wrongly typed booleans can therefore produce “Verified: all items look accurate” without complete verdict coverage.

Proposed validation:
- Exactly one schema-valid verdict per expected item, explicit boolean fields.
- Reject duplicates, out-of-range indices and missing items.
- Mark uncovered items unchecked rather than accurate.
- Distinguish AI review from evidence-backed verification; no independent retrieval was observed in this call.

Suggested regression inputs: empty array, missing item, duplicate index, invalid index, omitted boolean, string boolean, complete valid success, complete valid concern. This source-derived weakness is not live reproduced.

Design review: hints deduct 15 points; consider optional unpenalized practice. Exact-order grading fits unambiguous sequences, but not every causal/cyclical/branching topic has one valid list. Feedback should not rationalize an answer key as unquestionable.

Preserve: multiple order modes, teacher edits feeding the game, keyboard/touch/move controls, image sizing, tracked reveal, stale verdict invalidation after manual editing, stale image-alt hashing.

## 5. Sequence Builder: future branching extension

Separate enhancement from the Timeline validation issue.

Keep linear sequencing as default. Explore:
- Decision forks: one conditional route.
- Parallel branches: independent prerequisites can occur in either order and rejoin when required steps finish.
- Grade valid progression/dependencies rather than one fixed positional list.

Boundary: Sequence Builder addresses what happens next, when, and under which conditions. Visual organizers address broader conceptual relationships. Share components and data contracts instead of maintaining incompatible duplicate editors.

Generation, teacher authoring, learner feedback/scoring, saving/export, student delivery and keyboard/touch interaction must agree on branch semantics. Defer arbitrary graphs and loops initially. No organizer handoff was verified; Aaron believes none currently exists. Not existing functionality or implementation authorization.

## 6. Concept Sort: optional explanation of placement

Exploratory teacher toggle: ask for reasoning on selected/ambiguous cards or all cards. Separate collecting explanations from enabling AI coaching.

Proposed criteria:
- Understanding of the category rule.
- Relevant evidence from the item.
- A coherent connection between the two.

Ground optional feedback in teacher-approved category criteria and examples. Recognize defensible alternate placements rather than automatically defending the key. Keep placement score separate from provisional reasoning feedback; allow teacher override. Do not reward length or language fluency instead of conceptual reasoning. Offer accessible response modes.

Start with text explanations and teacher review, then compare a pilot rubric with educator judgments before automated scoring. No implemented feature or validated metric is claimed.

## 7. Sentence Frames → Writing Supports

Agreed future naming direction: Aaron prefers “Writing Supports” as the user-facing resource name. Nothing has been renamed.

Suggested description, not separately approved wording: “Sentence starters, paragraph frames, discussion prompts, and guided revision.” Keep specific technique names inside the resource.

Assessment review:
- Distinguish scaffold-supplied language from student contributions.
- Supported draft quality alone does not establish independent mastery.
- The inspected flow treats an AI score above 85 as mastery; consider a precise draft-criteria label instead.
- A subsequent grading request lacks the previous draft; investigate including both drafts for claims about improvement.
- Validate returned score and response structure before awarding a result.
- Any optional reduced-support transfer task should preserve necessary accommodations.

These are source-review observations/proposals, not reproduced runtime assessment failures. Preserve rubric use where available, draft retention on grading failure and resource-bound feedback sessions.

## 8. Note-Taking: source context coverage

Source: note_taking_templates_source.jsx, _buildNotesFeedbackPrompt includes sourceText.slice(0,3000).

Risk: a valid quotation later in the source could appear unsupported simply because the feedback model did not receive it. Cap intent is unknown; no runtime example was reproduced.

Aaron's preference: substantially more/full source text, questioning the arbitrary 3,000-character limit. Evaluate actual provider/context budgets rather than assuming this cap is necessary. Default to full source when it fits; use appropriate long-source handling otherwise. Relevant passage retrieval/chunking may help, but partial evidence must not masquerade as complete-source verification.

Regression: valid quote beyond character 3000 versus a genuinely absent quote. Distinguish “not in supplied context” from “not in the source.” Disclose material limits.

Also review the relationship between coaching and XP. Preserve differentiated note formats, Q&A retrieval mode, cross-session notebook and focused strength/next-step coaching. Saving/reopening and the full journey remain untested.

## 9. Tables/charts: manual authoring and accessibility

Design principle from Aaron: users should be able to manually create/edit what AI can create. Direct embedded-image insertion is not essential now because other image import routes exist.

Sources and observed mechanics:
- view_renderers_source.jsx, renderFormattedText/flushTable: first row becomes th; remaining cells td. No caption, scope, or row-header handling was observed in this renderer.
- CHART supports an optional visible title and delegates to SimpleBarChart/SimpleDonutChart. Their accessible names, equivalent data and descriptions have not been traced.
- view_simplified_source.jsx narration excludes table/chart blocks, while tables render as HTML. App narration omission is distinct from screen-reader access.
- Adapted Text's isEditingLeveledText branch has bold/italic/highlight/headings/list controls plus a textarea bound to generatedContent.data through handleSimplifiedTextChange. No structured table or chart authoring controls were found in that branch.
- Users can edit raw Markdown tables / [[CHART: JSON]] in text. This is not equivalent to usable structured authoring; roundtrip behavior was not tested.
- view_sidebar_panels_source.jsx source entry stores inputText as a string. Image clipboard OCR requests text preserving headings, paragraphs and Markdown tables, not embedded-image retention. Ordinary rich/plain paste fidelity is untested.
- view_analysis_source.jsx originalText display also uses renderFormattedText. Shared renderer reuse is established specifically for Analyze Source as well as Adapted Text, not every resource. Its edit toolbar likewise exposes text formatting and a textarea, not structured table/chart controls.
- host_handlers_source.jsx handleAnalysisTextChange records undo, computes fresh complexity evidence, calls _analysisDataForSourceEdit, updates history and removes levelCheck/alignmentCheck. Complete downstream invalidation was not examined.

Bounded proposal:
- Structured table helper at source entry, Analyze Source and Adapted Text: caption, row/column headers, row/column insertion/removal, accessible editing.
- Chart editor for currently supported bar/donut types: data, labels, title, reviewed description and accessible equivalent.
- Extend the underlying format and renderer as needed; editor controls alone cannot preserve semantics the format does not express.
- Keep manual and AI-created content on the same contracts.
- Verify parsing, generation consumers, editing, saving/reopening, export, screen-reader relationships and optional read-aloud alternatives.
- Spoken equivalents should convey necessary data without automatically giving away an inference task's answer.

No live paste/save/export/accessibility tests were completed. Missing captions/header associations are source observations; chart internals remain an open investigation. Do not claim universal WCAG failure or compliance.

## Follow-through checklist

- [x] Place this backlog in the actual checkout after inspecting its documentation conventions. (2026-10-27, docs/review-backlog-2026-10-27.md)
- [x] Add discoverability links to existing CLAUDE.md and AGENTS.md without replacing instructions. (CLAUDE.md only: the repository has no AGENTS.md.)
- [x] Record current SHA and revalidate each source observation. (See the appendix.)
- [ ] Separate bug fixes from optional enhancements; agree implementation scope. (Four trust fixes approved and implemented; see below.)
- [ ] Use synthetic/public-domain fixtures and record reproducible steps, actual results and limits.
- [ ] Test representative end-to-end educator/student flows before declaring fixes verified.
- [ ] Do not commit, push or deploy without separate authorization.

## Implemented 2026-10-27 (uncommitted at time of writing)

Aaron approved four small trust fixes. Regression tests: tests/review_backlog_trust_fixes.test.js (Timeline, Note-Taking, Writing Supports), plus a "dictionary sense provenance" block in tests/reading_settings_glossary_games.test.js and updated host assertions in tests/fix0927_scaffolds.test.js. Each new test was mutation-checked: it fails against the pre-fix module.

- **4. Timeline.** handleVerifyTimelineAccuracy keeps a verdict only for an in-range integer index seen once with real booleans. Duplicated indices are discarded. Items without a valid verdict lose any earlier badge and show as not yet checked. A response covering no items is a failed check. "All items look accurate" appears only when every item has a verdict; otherwise a new toast (timeline.validation.verified_incomplete) reports "Checked N of M".
- **8. Note-Taking.** The feedback prompt sends the whole source up to 50,000 characters, labelled as complete. A longer source is cut there, the prompt states how much was left out, and the model is told to return found: null ("could not check") rather than claim a quote is missing.
- **7. Writing Supports.** handleMasteryGrading rejects a missing, non-numeric or out-of-range (not 0–100) rawScore as a grading error; the host already keeps the draft on error. A revision is graded beside the previous draft, and the prompt forbids claiming an improvement that is not visible between the two drafts. The host passes { draftCount, previousDraft } in the existing argument slot, and the module still accepts a bare attempt number from an older host.
- **1. Glossary.** The flashcard dictionary back uses AlloDictionary.matchPassageSense (which ignores the word itself and declines ties). Only a positive match keeps "Verified dictionary". Otherwise the first sense is shown under "Dictionary meaning (not matched to this lesson)" with a note that it may be a different sense (glossary.dictionary_unmatched, glossary.dictionary_unmatched_note).

- **Found during the fixes: Standards Alignment and Check Level (Adapted Text).** Both judged only the first 3,000 characters. The alignment check could report a standard as missing when the second half of the text covered it. Both now send the whole text up to 50,000 characters. A longer text is cut, the prompt says so, and the alignment prompt forbids calling a requirement missing when it could be in the omitted part. Each result stores checkedChars and totalChars, and the Rigor Report and level report show "Checked the first N of M characters" only when the text was cut (simplified.check_partial_note). The view_simplified and host_handlers content-hash pins in AlloFlowANTI.txt, its mirror and App.jsx were updated to match the rebuilt modules.

- **9 (part). Table semantics in the shared renderer.** view_renderers_source.jsx flushTable now gives column headers scope="col". When the top-left header cell is empty, the first column is rendered as row headers (th scope="row"). A "Table: …" line directly above or below a table becomes its caption (the Pandoc Markdown convention), so a teacher can caption a table by typing one line. Every resource that uses renderFormattedText gets this, including Adapted Text and Analyze Source. Completed 2026-10-28 (below).

- **9 (rest). Table and chart authoring, chart descriptions, generated captions (2026-10-28).** The Adapted Text and Analyze Source editor toolbars gain Table and Chart buttons (TableChartTools in view_renderers_source.jsx, shared by both). Table opens a panel to insert a table at the cursor with a required caption, a column and row count, and an option for row labels. With the cursor inside an existing table, it instead offers Add a row, Add a column and Save caption. Chart inserts or edits a bar chart ("Label: value" lines) or a percentage chart and requires a written description. The tools write the same markdown the renderer reads ("Table: …" plus a pipe table, or one [[CHART: …]] line), so the editors keep working as plain text. Rendered charts are now figures: the description is the figcaption, and bar charts add a "Show the data as a table" disclosure listing every value. The Adapted Text generator asks for a "Table: …" caption above each table (prefix kept in English for the renderer) and a description for every chart. Rubric tables and OCR output are deliberately unchanged, because other code parses rubric tables and OCR should reproduce the document.

- **3 (part). DBQ essay feedback grounding (2026-10-28).** The essay-feedback prompt now sends every document's excerpt (up to 6,000 characters each and 40,000 in total; a cut excerpt ends with [...] and the prompt says so), its kind (quoted, adapted or reconstructed) and its source line, instead of only IDs and titles. When the resource has a rubric, the displayed dbqData.rubric is sent and used for scoring, with the grade-band guide setting expectations only; the model returns a level per criterion (rubricScores), shown as "Rubric levels (AI estimate)". The model also returns evidenceChecks: for each document the essay uses, whether it matches the excerpt, misreads it, or credits it with something the excerpt does not contain. These appear under "Your evidence, checked against the document excerpts (AI)". missingDocs, evidenceChecks and rubricScores keep only real document IDs and rubric criteria. The Evidence Tracker hint now says it only detects mentions by name. Not done: reliability "for which question?", vocabulary reuse, and the 500/600/800-character excerpt limits in the per-document helpers.

The new strings are registered in ui_strings.js only. The language packs fall back to English until translated, the same as timeline.validation.some_not_checked.

Not changed: the "Verified" wording for AI review (item 4's evidence-backed versus AI-review distinction), Writing Supports' "mastery" label, and all items under 2, 5 and 6, plus the rest of 3.

## Appendix: source revalidation at 6db669443a (2026-10-27, Claude Code)

Each observation was rechecked in the committed source; none of these files had uncommitted edits at the time.

- **1. Glossary — confirmed.** view_glossary_source.jsx (renderFlashcardDictBack): when pickSense returns null the card falls back to the first dictionary definition under “Verified dictionary”. dictionary_loader.js already has a stricter matcher, matchPassageSense, that declines ties; the flashcards do not use it.
- **2. FAQ — confirmed absent.** view_faq_source.jsx has no supporting-passage or evidence links.
- **3. DBQ — confirmed.** The essay-feedback prompt interpolates the essay, synthesis prompt, document IDs/titles and a hardcoded essayGradeGuide; no excerpts and not dbqData.rubric. “Cited” is an ID mention check. Excerpt limits: reliability 600, vocabulary 800, and corroboration feedback 500 (not in the original list).
- **4. Timeline — confirmed as described.** An empty or partial response, a string "false", duplicate or out-of-range indices all still reach “Verified: all items look accurate”.
- **5. Branching sequences — confirmed absent.**
- **6. Concept Sort reasoning — confirmed absent.**
- **7. Writing Supports — confirmed.** phase_n_misc_helpers_source.jsx handleMasteryGrading: `aiScore = rawScore || 0` with no type or range check; `aiScore > 85` sets status 'mastery'; the prompt names the attempt number but not the previous draft.
- **8. Note-Taking — confirmed, and the prompt makes it sharper.** sourceText.slice(0, 3000) is sent while the response schema asks “If they quoted, was the quote actually present?”, with no disclosure that the text was cut.
- **9. Tables/charts — tables confirmed; charts resolved.** flushTable renders th/td with no scope, caption or row headers. SimpleBarChart's SVG has role="img" and an aria-label listing every label: value; SimpleDonutChart is role="progressbar" with aria-label and aria-valuenow. The visible chart title is not part of the bar chart's label and there is no longer description. Neither editor (Adapted Text, Analyze Source) has table/chart controls; read-aloud skips table paragraphs by design.
