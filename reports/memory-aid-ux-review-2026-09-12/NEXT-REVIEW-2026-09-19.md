# Memory Aid: next refinement priorities

Reviewed September 19, 2026. This is an analysis, not an application change. The previous implementation already includes automatic visual support, structured diagrams, separate study/personalization/recall activities, confidence reflection, private practice records, review dates, application questions, and four print presets.

## 1. Give recall without hints a neutral question

The current practice screen hides the answer-bearing target and cue, but replaces them with “Memory target” and “What do you remember about this target?” The corresponding worksheet identifies targets only by their original position. This makes a delayed or shuffled activity depend on remembering which target was in which position.

Add a separate, teacher-editable recall question that identifies the task without stating its answer. For the existing solids example: “What happens to a solid's shape and volume when you move it into a different container?” Use it in on-screen recall, read-aloud, and the worksheet without hints. Keep the answer-bearing title, mnemonic, image, mappings, and application guidance hidden. Review generated questions for answer leakage and provide an explicit older-resource fallback instead of substituting the full target title.

Evidence: `memory_aid_source.jsx`, `MemoryAidPracticePanel` and `renderMemoryAidPreset`; local browser reproduction recorded in `next-review-2026-09-19.json`.

## 2. Preserve unfinished private application work

Fact self-check completion saves the recall attempt. The optional application explanation, its self-check, and the chosen review date use a separate “Save private practice plan” action. Leaving the practice view clears that session; an application response not explicitly saved is absent after reload.

Save these fields as private drafts within the existing browser/profile boundary and display Saving / Saved / Could not save states. Restore the draft when returning. Do not represent an unfinished explanation as a completed check, include it in shared responses, or silently create a new recall attempt. Handle profile switches, resource changes, concurrent updates, and deleted attempts consistently with the existing private-store protections.

Evidence: `MemoryAidFollowUp`, `updatePracticeSession`, `closePractice`; browser reproduction of a typed application response followed by Return to card and reload.

## 3. Retain review continuity when a cue changes

The review overview considers only attempts whose full practice basis matches the current cue and facts. Editing a cue therefore makes the overview ignore the earlier attempt and its date. The history is retained; it is not deleted. Requiring a fresh check for a changed cue is appropriate, but presenting no prior practice or due date loses useful continuity.

Distinguish the facts being learned from the version of the memory cue. Show “Practiced with an earlier cue — try the revised cue,” retain a deliberate review date where the fact set is unchanged, and keep earlier results visibly associated with their old cue. Changed facts require a separate content review. Do not carry an old successful self-check forward as evidence that a new cue works.

Evidence: `memoryAidPracticeBasis`, `memoryAidReviewPlan`; the local helper reproduction returns a due date before the cue edit and `latest: null`, an empty date, and `due: false` afterward.

## 4. Make later review easy to start

Dates are already available, and the selected card displays a revisit message. The overview is collapsed below the card, while target navigation follows the original order. Add a compact entry point such as “2 targets ready to revisit” with a short review sequence, skip controls, and a clear end state. Let learners choose supported or unsupported recall. Keep dates adjustable and avoid equating a self-check with mastery.

This proposal follows the general rationale for retrieval practice and spaced review in the [IES practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/1). It does not establish an optimal schedule or measured learning gains for this application.

## 5. Keep cue-to-fact connections useful after personalization

Study mode deliberately hides the original structured connections when a learner changes the cue. Offer a lightweight learner-owned connection editor: “This part of my cue reminds me of this fact.” Identify facts the learner has not connected, without treating a filled row as proof of accuracy. Keep learner mappings separate from teacher mappings and retain the existing stale-image checks.

There is also a small export inconsistency: Study mode treats an unchanged copied cue as unmodified, but `renderMemoryAidPreset` omits mappings whenever `studentDraft` is nonempty. Copying a cue for editing without changing it can therefore remove its connections from the printed study card. Use the same effective-cue comparison on screen and in export, and add coverage for unchanged copies and genuinely changed cues.

Evidence: `MemoryAidStudyCard` computes `customized`; `renderMemoryAidPreset` uses `!card.studentDraft` for connection inclusion.

## Validation before further visual expansion

Automatic images are already implemented. The next evaluation should use actual generated pictures, checking whether each depicts its cue accurately and whether the description matches the pixels. The prepared [classroom pilot](CLASSROOM-PILOT.md) has not been conducted. It compares teacher effort, navigation, delayed recall, and application explanations separately. A decorative or appealing image should not be taken as evidence of better learning.

## Scope and evidence

- Read the current source, prior implementation report, existing tests, and classroom protocol.
- The Memory Aid builder reports root/public modules byte-for-byte fresh.
- Rebuilt the authored local preview from the current runtime and exercised recall without hints, application-work persistence, review dates, and cue-revision behavior at 390px width.
- Browser evidence: [review JSON](next-review-2026-09-19.json), [recall screenshot](next-review-recall-390.png), [due-review screenshot](next-review-due-390.png).
- The fixture contains authored sample content and mocked AI providers. No live image generation, classroom testing, or full hosted-app assessment was performed. The existing application regression suite was not rerun because application code was not changed.

Recommended implementation order: neutral recall questions and private draft preservation; revision-aware review continuity; due-review entry point; personalized connections and export consistency. The small export comparison fix can ship alongside the first group.
