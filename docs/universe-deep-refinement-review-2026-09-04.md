# Universe: deep refinement review

Reviewed 2026-09-04. Scope: current Universe source, existing visual previews, and isolated browser probes. This review changes no application code. The recommendations distinguish verified behavior from design opportunities.

## Highest-priority findings

### 1. Make progress accurately describe learning

Verified: in a fresh preview, clicking **Mark complete** immediately recorded the expansion mission as complete and the redshift evidence thread as mastered, with no learner explanation. The separate **Mark explained** button also has no response requirement. These are self-reports, but the state and reward system treats them as mastery.

Refinement: distinguish visited, attempted, self-assessed, and demonstrated. Give missions a short predict–observe–explain sequence. Accept a written explanation, supported selection, or teacher-confirmed oral response; a learner should not have to type to participate. Use a small transparent checklist: identifies the observation, connects it to a claim, and recognizes a limitation. Preserve the ability to explore without assessment gates.

Acceptance: opening a topic or copying an example never creates demonstrated mastery. Learners can identify why a mission is complete and which parts remain. Self-assessment stays explicitly labeled.

Source: stem_lab/stem_tool_universe.js:3457 and :3644.

### 2. Apply motion and lifecycle policies across every visualization

Verified: the black-hole panel continues changing with the operating-system reduced-motion preference enabled. After filtering that panel out of view, its drawBH callback ran 16 more times in a 250 ms observation window. The new still-scene control works for the main illustration; that successful check does not cover all secondary canvases.

Refinement: give each visualization a consistent pause/still policy, with system reduced motion as the default. Stop work for hidden, collapsed, detached, or backgrounded scenes, and redraw a still frame only when its data or dimensions change. Consolidate cleanup around the tool lifecycle instead of relying on individual navigation buttons. Review the per-render challenge timers too.

Acceptance: no visual changes in reduced-motion mode unless the learner intentionally requests animation; hidden panels perform no drawing; leaving the tool clears intervals, observers, and animation callbacks.

Source: stem_lab/stem_tool_universe.js:412, :2356, :4569.

### 3. Make scientific uncertainty consistent across prose, questions, and pictures

Verified: the quiz still treats a Milky Way–Andromeda merger in 4–5 billion years as the expected correct answer. Other panels attach approximately 50/50 odds to a similar timescale. NASA's 2025 account places the roughly 50% collision probability within the next **10 billion years**. The probability, time horizon, and certainty need to stay aligned.

The central-flash artwork also still makes an explosion from a point visually salient even though the newer text explains expanding space. This is a design risk, not evidence that learners have adopted that misconception.

Refinement: tag information as observation, inference, teaching model, or possible future. Keep ages, ranges, qualifiers, sources, and review dates in shared content records used by both lessons and quizzes. Show expanding separations across an entire field; let learners choose different observer locations. Represent the future as a separate scenario, not a numeric continuation disguised as a milestone. Review first-star timing and other approximate anchors for false precision.

Sources: stem_lab/stem_tool_universe.js:218, :621, :1218. NASA: https://science.nasa.gov/missions/hubble/apocalypse-when-hubble-casts-doubt-on-certainty-of-galactic-collision/ and https://science.nasa.gov/mission/webb/big-bang-q-and-a/.

Acceptance: no quiz forces a certain answer to an uncertain question. Labels and pictures communicate the same causal model. Every quantitative claim has a source and an explicit uncertainty treatment where needed.

### 4. Make the real-evidence path concrete

Verified: selecting a real-observation stop updates the local prompt, but **Launch WWT** always opens the general WorldWide Telescope web client. Students must search manually. The evidence SVGs are constructed teaching diagrams, not downloaded observations; their presentation should make that distinction explicit.

Refinement: start each evidence activity with one curated, attributed observation, an annotation, a scale or units where applicable, and one manageable question. Provide a target-specific external link when supported, otherwise an exact target name and search instructions. Label constructed graphics as schematic. Carry the selected mission and question through tool changes and provide a return point. For missions that continue within Universe, scroll and focus the actual destination panel.

Acceptance: every Continue action produces a visible next step with the correct context. A learner can trace a claim to a particular observation without navigating an unfamiliar external application first.

Source: stem_lab/stem_tool_universe.js:984, :3465, :3489.

### 5. Turn notes into an accessible learning record

Verified: a notebook containing ten entries displays only four. There is no view-all control in that panel. Epoch explanations are stored separately, so the notebook is currently a collection of examples rather than a comprehensive review of the learner's work.

Refinement: provide distinct My explanations and Worked examples views, a complete list, search, and clear counts. Add a comparison between an initial explanation and a revision, plus export/print suitable for discussion or assessment. Display the observation or question each explanation responds to. Verify reload and host-session persistence explicitly; the isolated preview demonstrates navigation persistence, not every host storage scenario.

Acceptance: every saved entry can be opened. Revising work does not obscure its source question. Exports distinguish learner-authored work from example text.

Source: stem_lab/stem_tool_universe.js:982, :1311, :3665, :3688.

## Design opportunities after those corrections

### 6. Bring essential controls closer to the scene

In the isolated 1280 × 900 preview, the timeline began at y=935 and the topic finder at y=1569. These are fixture measurements, not a measurement of every host configuration. Previous/next stepping is already visible above the canvas, which helps; Play and the range control remain farther away.

Refinement: keep a compact transport row with the scene, reduce repeated epoch/time labels, and make the introductory guidance collapsible after first use. Preserve the visible big idea. Avoid sticky regions that cover content on phones or at high zoom. Replace the topic finder's small nested scroll area with a clearer browse/open-topic pattern.

Acceptance: a new learner can identify the current state, operate the primary controls, and read the learning prompt without hunting. Check short laptop viewports, 200% zoom, keyboard order, and narrow phones.

### 7. Add comparison and causal investigation

Current epoch prompts ask useful questions, but the primary interaction is still movement through a sequence. A deeper activity would pin a before-state, move to an after-state, and ask the learner to identify what changed and what mechanism explains it.

Candidate comparisons: opaque plasma versus transparent gas; background light versus starlight; isolated stars versus galaxy structure; observations versus future predictions. Keep matched labels, a text alternative, and a single focused task. Let an observation be attached to the learner's explanation.

Acceptance: the comparison supports a specific reasoning task and does not merely duplicate two canvases.

### 8. Make assessment point back to learning

The quiz has stable shuffled choices and immediate explanations, but the completion screen gives a total score and generic praise. It does not summarize missed concepts or route the learner to relevant evidence.

Refinement: map questions to concepts and common misconceptions, record attempts, and offer a short targeted retry after reviewing a relevant scene. Use specific feedback such as “You distinguished background light from starlight” instead of identity praise such as “cosmic genius.” Add a small number of interpret-a-diagram or choose-the-evidence questions.

Acceptance: learners can identify a concrete next learning step from the results, and improvement is tracked by concept rather than only total score.

Source: stem_lab/stem_tool_universe.js:4359.

### 9. Extend UDL support and make progress independent of language

The recent orientation and reflection copy is largely hardcoded English. Epoch visits are keyed by translated display names, which creates a code-level risk of inconsistent progress when the display language changes. Most explanatory content is shared across reading levels; grade level is explicitly used in the tutor prompt.

Refinement: use stable IDs for progress, route interface text through the existing translation system, add contextual definitions, and provide concise/deeper explanations with equivalent learning goals. Offer supported selection, writing, or oral discussion as valid response routes. Validate language switching, long translations, and right-to-left layouts.

Acceptance: changing language does not change the number of visited epochs or detach learner work. Equivalent learning objectives remain accessible through multiple response forms.

Source: stem_lab/stem_tool_universe.js:449, :1300, :1311.

## Suggested sequence

1. Correct misleading completion, secondary motion behavior, inaccessible notebook entries, and science inconsistencies.
2. Build one complete evidence investigation with a real observation, learner explanation, meaningful feedback, and a reliable next/return action.
3. Apply that pattern to the remaining missions; add comparison, targeted quiz review, and language/reading supports.
4. Consolidate content, state transitions, and canvas lifecycle code while preserving the tested public/source mirror contract.

Validation should include one full lesson journey with a student and educator, keyboard and screen-reader use, and a no-network fallback. Existing passing tests establish the behaviors they cover; they are not evidence of learning gains or complete accessibility coverage.

Reproduction evidence: scratch/universe-opportunity-audit.json. Browser probe: scratch/universe-opportunity-audit.cjs.

## Implementation follow-through — 2026-09-04

Implemented in `stem_lab/stem_tool_universe.js` and its desktop public mirror:

- Added a shared scheduler for the main scene, scale zoom, black holes, lensing and redshift. It stops drawing hidden/offscreen/backgrounded scenes, honors system or explicit still mode, and disconnects observers and callbacks during cleanup. Replaced deferred initialization loops and per-render challenge timers with lifecycle-managed work.
- Replaced click-only completion with separate `selfReviewedEvidence` and `selfReviewedMissions` records. Four responses and an explicit review are required; editing a response reopens the review. Existing legacy mastery flags are retained as historical data and are not promoted into reviewed learning. Supported sentence choices, writing/dictation and discussion summaries provide alternative response routes. A self-review can explicitly record uncertainty or a need for help.
- Added an offline COBE/FIRAS spectrum investigation with ten attributed samples, units, converted published uncertainties, a table, a pattern check, and source links. The graph is explicitly a processed spectrum (2.725 K blackbody plus measured residuals), not raw telescope imagery or an anisotropy map. Supported CMB responses refer to this specific measurement. Other evidence graphics are explicitly labeled teaching diagrams.
- Unified the Andromeda forecast across the quiz and lesson content, qualified first-star timing and properties, and replaced the central flash/shockwave illustration with expanding separations across a field. Added contextual vocabulary and source links.
- Moved the timeline range/playback controls into the scene column above the canvas. Added an epoch comparison with a pinned before-state and a causal reasoning prompt. Removed the topic index's sticky behavior.
- Added stable epoch IDs for new visit counts and notes, with compatibility for the older index-keyed explanations and matching legacy visit names.
- Made every notebook entry accessible, with separate learner/example filters, search, revision comparison and text export. No longer silently truncates saved examples to the newest four displayed entries. Reset now names and clears all new learning records.
- Fixed local mission continuation so it opens and focuses the distance ladder even when the topic filter conflicts. WWT remains optional, with explicit search targets and a direct local CMB measurement route.
- Added per-question quiz results, related-topic/evidence review, targeted retries and attempt records. Removed identity-based score praise. New interface strings use the existing translation mechanism in selected areas; this is not a completed translation pass.

Validation records:

- `tests/universe_guided_navigation.test.js`: 16 behavioral cases, including legacy progress separation, self-review prerequisites, supported responses, complete notebook access, revisions, stable IDs, comparison, mission handoff and targeted retry.
- `scratch/universe-review/deep-validation.json`: real-browser checks of all four secondary scenes (still, resume, zero hidden drawing), response restoration after remount, text export, offline CMB interaction, 640/390/320px layouts, RTL overflow and centralized cleanup.
- `scratch/universe-review/`: updated desktop/mobile, measurement, response and notebook previews; `notebook-export.txt` is a synthetic test export.

Remaining boundaries: remounting with serialized state is verified; production host storage across application restarts still needs a host-level check. Complete translations, historical visit-name migration across every locale, educator/screen-reader user testing, and additional curated measured datasets for the other evidence threads remain follow-up work. The tool does not claim to establish learning gains or demonstrated mastery from these self-reviews. The CMB pattern check provides feedback about one interpretation task only.

Final verification: all 42 tests across the seven Universe suites passed. A concurrent validation run hit five execution timeouts; rerunning the unchanged suite alone passed in 12.7 seconds. The scoped axe WCAG A/AA check initially found three notebook text-contrast failures; after correcting the notebook foreground, it reports zero violations in the new measurement, response and notebook panels. Actual React unmount leaves detached scene pixels unchanged, releases the scene scheduler and clears playback. Source/mirror byte equality and JavaScript parsing were checked.

## Continued refinement — measurement inspection and learning continuity

- Added a responsive measurement workspace: the spectrum and sample inspector sit side by side on desktop and stack on phones. Selecting a sample highlights its position and presents its value, units and published uncertainty as readable text.
- Added an explicit action to append a selected FIRAS sample to the learner's observation. It preserves existing writing, avoids duplicate additions, and carries the observation source into notebook review and export.
- Evidence responses now identify their current thread and provide direct routes back to the evidence or learner notebook. Notebook review clears stale search/example filters and excludes empty response shells.
- Recording an evidence self-review preserves a version. Subsequent edits reopen review while keeping earlier versions, including self-reviewed work saved before version history was introduced. Changing the response route, inspecting samples or answering the separate pattern check does not invalidate an unchanged explanation.
- Navigation opens all enclosing disclosures before moving focus. Revisit-and-revise focuses the actual text field without removing it from normal keyboard order. Quiz evidence review carries the question and a return-to-results action to its destination; retries clear stale review context.
- Pinned/current epoch comparison labels no longer imply that the pinned state must be chronologically earlier.

Verification: 48 tests passed across seven Universe suites. `scratch/universe-review/continuity-validation.json` records successful browser checks of closed-panel navigation, quiz return, measurement attachment, source/version export, offline inspection, 640/390/320px layouts, RTL overflow and zero scoped axe WCAG A/AA violations. Desktop and phone screenshots were visually inspected. Source and desktop public mirror match byte-for-byte; syntax and `git diff --check` pass.

Preview: `scratch/universe-review/measurement-inspection-desktop.png`. The exported text and response data used in these checks are synthetic fixtures. Host persistence and full localization boundaries from the previous review still apply.

## Visual design pass — exploration screen and topic browser

- Refined the header with a compact Universe Explorer identity, a clear back arrow, consistent vector icons and fewer duplicate badges.
- Reworked Observe/Explain/Explore into matching navigation cards with icon, title, supporting text and a directional cue. Appearance/help actions sit beside the introduction on desktop and remain accessible below navigation on phones.
- Added a more legible timeline position track, tighter control spacing, a named epoch-card section and visible visit count. The current epoch guide has a matching accent edge and clearer expandable response surfaces.
- Replaced the topic browser's 124px inner scroll area with a responsive card grid. Every card shows its topic, category and open state; search and category filters remain available.
- Unified spacing, corner radii, borders and light/dark colors across the main exploration surfaces. Decorative icons are hidden from assistive technology; reduced-motion and forced-color styling remain available.

Visual QA: inspected desktop, dark-library and 320px phone screenshots. `scratch/universe-review/visual-validation.json` records zero browser errors, no scoped WCAG A/AA axe violations in either theme, no overflow at 1280/640/390/320px, and successful focus transfer after topic search. Source/mirror parity, JavaScript parsing and patch whitespace checks pass.

Previews: `scratch/universe-review/visual-light-desktop.png`, `visual-dark-desktop.png`, `visual-library-dark.png`, and `visual-light-320.png`.

Regression verification for this visual pass: 47 of 48 cases passed in the full run; the remaining playback case exceeded the 5-second execution limit. Its unchanged assertions passed on a focused rerun with a 20-second allowance (test execution 998ms). No application-code changes were needed for that rerun.

### Investigation workspace visual refinement

Refined the mission, observation, and evidence selectors with larger type, consistent spacing, stronger selected states, and explicit observation `aria-pressed` state. Mission checkpoints now lead into a compact action workspace. Replaced arbitrary mission percentages with separate statuses for starting, recording four responses, and recording a self-review. Status badges consistently say self-reviewed.

Moved the worked claim/evidence/reasoning example into a native keyboard-operable disclosure, keeping the core evidence guidance visible. Response prompts now have distinct writing cards, roomier inputs, and a clear review area. The CMB observation checklist points to the local measurement activity.

Chromium verification: no page errors; no scoped WCAG A/AA axe violations in the mission, observation, evidence, or response sections in light and dark themes. No horizontal overflow at 1280, 640, 390, or 320 pixels. Observation selection semantics and keyboard disclosure operation passed. Source syntax, desktop mirror equality, and whitespace checks passed. Desktop mission and 320px response previews were visually inspected.

Browser report: `scratch/universe-review/investigation-validation.json`. Preview: `scratch/universe-review/refined-missions-light.png`. A disk-space limit interrupted the initial screenshot run; compacting only the task-generated preview and retaining the Universe translation strings allowed verification to complete.

Regression validation: all 48 tests across the seven Universe suites passed with `--maxWorkers=1 --pool=threads --testTimeout=20000` (64.85 seconds). The initial fork-worker run was interrupted after severe delays and four failed cases; the unchanged complete suite passed on the thread-worker retry.

### Notebook clarity and investigation handoffs

Added a notebook overview distinguishing learner entries, self-reviewed evidence responses, and provided worked examples. Evidence entries now present prediction, observation, reasoning, and limitation as labeled reading cards, with explicit Draft/Self-reviewed status. Sources and earlier revisions remain available in disclosures; plain-text export retains all response content and revisions.

Empty views now distinguish a new notebook from entries hidden by filters, with working recovery/start actions. Saving an example clears the stale search and reveals worked examples. Saving a mission example no longer records a mission launch. Continuing a response opens its next unanswered field, including CMB drafts, while initial CMB investigation entry still opens the measurement activity. Both investigation timeline actions now focus the timeline they update.

Validation: 51 of 52 regression cases passed in the complete seven-suite run. The remaining existing test used the old Save mission label; after changing that locator to Save mission example, its unchanged evidence assertions passed on a focused rerun. Four added regression cases cover saved-example visibility and honest mission state, CMB draft resumption, filter recovery, and timeline handoffs preserving learner work. All 52 cases are verified. Syntax, desktop mirror parity, and scoped whitespace checks passed.

Chromium checks passed with zero page errors and zero scoped WCAG A/AA axe violations in light and dark themes. Notebook layouts fit 1280, 640, 390, and 320 pixel widths. Keyboard revision disclosure, filter recovery, save visibility, response continuation, and the empty-state start action passed. Report: `scratch/universe-review/notebook-validation.json`; previews: `notebook-refined-light.png`, `notebook-response-dark.png`, and `notebook-refined-light-320.png` in that folder.

### Developing and comparing explanations

Added a learner-directed revision comparison to the notebook. Learners can save the current epoch explanation or partial evidence response, select an earlier version, and read it beside their current words. New snapshots preserve the selected entry's identity and do not award or record self-review. Identical latest snapshots are disabled rather than duplicated.

Each revision comparison has two writing prompts: explain what changed or stayed the same and why, and identify a question or observation to investigate next. Notes are stored separately for each entry/revision, retain the earlier and current text present when written, and expose that context if the underlying response changes later. Reflections are searchable and included in plain-text exports with their comparison context. Progress reset clears both reflection notes and revision selections. The existing history remains browsable.

Validation: all 56 tests across seven Universe regression suites passed (77.47 seconds), including four new cases for snapshot identity, draft/self-review separation, revision-note isolation and context preservation, and explicit reset. Final Chromium verification passed in light and dark themes with zero page errors and zero scoped WCAG A/AA axe violations. Tested widths: 1280, 640, 390, and 320 pixels; no overflow, including RTL. Keyboard disclosure, default revision choice, separate notes, remount persistence, offline editing, export context, and reflection search passed. Visual inspection found excessive nested padding at 320px; the final phone layout flattens these layers and enlarges writing fields. The browser checks were rerun after this adjustment and passed.

Report: `scratch/universe-review/thinking-validation.json`. Previews: `thinking-comparison-light.png` and `thinking-reflection-light-320.png` in that folder. Source syntax, desktop mirror parity, and scoped whitespace checks passed.

### Clear next steps and saved investigation questions

Added a four-step explanation navigator with explicit Response recorded / Next to record / Not recorded yet labels. Each step focuses its existing written or supported-response control. A contextual guide points to the next unanswered prompt, the review checkbox, the recording action, or the notebook. Guidance never checks a review box or records a self-review on the learner's behalf. The response count is exposed as a status update.

Added a collapsible notebook index of saved investigation questions. Questions retain their source entry and revision number; selecting one clears conflicting notebook filters, selects the exact revision, opens its comparison, and focuses the original question field. Empty questions and notes without a corresponding saved revision do not appear. Existing content and answers remain intact.

Validation: all 60 regression tests across seven suites passed (144.12 seconds). Four added cases cover the complete guidance flow without automatic self-review, supported-response navigation preserving answers, exact question restoration through stale filters, and omission of empty/unlinked questions. Chromium checks passed with no page errors or scoped WCAG A/AA axe violations in light/dark themes. Desktop and phone widths 1280, 640, 390, and 320 pixels fit without overflow; RTL also passed. Desktop guide and phone question-card screenshots were visually inspected. Syntax, desktop mirror parity, and scoped whitespace checks passed.

Browser report: `scratch/universe-review/next-step-validation.json`. Previews: `next-step-guide-light.png` and `question-index-light-320.png` in that folder.

### Comparing measured spectrum samples

Extended the CMB activity with an optional two-sample comparison. Measurement A stays synchronized with the existing sample inspector; Measurement B has its own selector. Lettered graph markers identify the pair. Each card retains intensity units and published 1σ uncertainty, while a separate result shows B − A and explicitly distinguishes arithmetic comparison from a significance test. Selecting the same sample twice prevents capture.

Learners can append the comparison to their observation without replacing their own words or duplicating the same comparison. The source is retained once. Reading controls preserve self-review; adding a new comparison reopens review and preserves the earlier reviewed response as a revision. Comparison selections, open state, and reset behavior are supported. Published data and schematic teaching diagrams now have more prominent, distinct labels.

Verified the sample intensities and uncertainty column against the [NASA LAMBDA published FIRAS table](https://lambda.gsfc.nasa.gov/data/cobe/firas/monopole_spec/firas_monopole_spec_v1.txt). The table describes the processed monopole spectrum and gives uncertainty in kJy/sr; the interface converts that uncertainty to MJy/sr. The existing processed-spectrum caption remains visible.

Validation: 59 of 64 regression cases passed in the initial seven-suite run; five existing cases timed out during severe local delays. Four passed on an unchanged focused retry; the remaining timeline case passed alone in 4.52 seconds with a 60-second allowance. All 64 cases are verified. Four new cases cover signed subtraction and inspector synchronization, same-sample/duplicate guards, source-preserving capture with review history, and reset.

Final Chromium validation passed with zero page errors and zero scoped WCAG A/AA axe violations in both themes. Tested widths 1280, 640, 390, and 320 pixels plus RTL had no overflow. Verified keyboard opening/focus, reversed subtraction, synchronized selectors, duplicate prevention, retained learner writing, offline capture, complete exports, and remount persistence. Desktop graph markers and comparison cards, plus the 320px comparison, were visually inspected. Source syntax, desktop mirror equality, and scoped whitespace checks passed.

Report: `scratch/universe-review/firas-comparison-validation.json`. Previews: `firas-markers-light.png`, `firas-comparison-light.png`, and `firas-comparison-light-320.png` in the same folder.
