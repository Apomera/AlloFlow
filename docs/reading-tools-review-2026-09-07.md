# Reading tools: additions and refinements

Date: September 7, 2026. This review builds on the main-24 resource and header-settings passes. It combines inspection of the current local readers with primary instructional and accessibility guidance. It evaluates all three needs: comprehension, reading comfort/accessibility, and decoding/fluency.

## Recommendation

Prioritize an optional **Read & reflect** workflow inside the existing **Lumen Study**, then connect its notes with reader bookmarks and vocabulary. Lumen already supplies the notebook foundation; a separate notebook would duplicate it. Improve guided practice and the controls already present before adding another presentation mode.

The IES guide for grades 4–9 recommends explicit decoding instruction, purposeful fluency practice, questions, section gist and comprehension monitoring. That supports the instructional direction; it is not evidence that a particular AlloFlow feature improves achievement. [IES reading-intervention guide](https://ies.ed.gov/ncee/WWC/PracticeGuide/29/Published).

## Already available

| Need | Existing tools and coverage |
| --- | --- |
| Comfortable display | Header font, size, line/letter spacing, app/reading themes, Bionic styling and viewport overlay. Immersive Reader and Reading Library also have their own presentation controls. |
| Keeping your place | Main reading ruler; adapted-reading paragraph focus; immersive line mask; sentence spotlight; Focus Reader with word/chunk pacing; library ruler, chapter navigation, bookmarks and resume position. |
| Listening and following | Sentence read-aloud, shared speech player, karaoke highlighting, sentence read-along, continuous library narration and teacher audio where provided. |
| Words and language | Define/Explain interaction modes, library My words, vocabulary-handout export, glossary tools, syllables and parts-of-speech highlighting, translations, and the separate Word Sounds resource. |
| Practice and reflection | Oral reading/fluency features, library Practice reading, cloze activities, annotations/comparison, generated assessments, Lumen Study source questions/evidence notes, and the permitted Socratic tutor. These are spread across different surfaces. |

Source anchors: `view_fab_stack_source.jsx`, `view_simplified_source.jsx`, `immersive_reader_source.jsx`, `reading_library_module.js`, `fluency_module.js`, `stem_lab/stem_lumen_study.js`, and the main host. Existing capabilities should be reused, not counted as newly proposed tools.

## Ranked additions

| Priority | Proposed addition | Why it adds something useful | Smallest useful version |
| --- | --- | --- | --- |
| 1 | **Read & reflect in Lumen Study** | Provides a short independent routine tied to a passage section. It is more structured than opening a general tutor or an end-of-reading quiz. | Keep the section visible; let the learner write its main idea, choose or copy supporting evidence, and mark “I understand / I need to reread / I have a question.” A revisit list returns to marked sections. |
| 2 | **Connect reading notes, bookmarks and My words** | Lumen already stores source-grounded notes, and the library saves bookmarks and vocabulary. Those supports are not a continuous adapted-reading workspace. | First make saved Lumen notes reopen with their citations; then connect reader positions, collected words and notes to the exact passage and language. |
| 3 | **Listen, try, reread** | Existing audio and fluency components can support a clearer practice sequence instead of making learners assemble the steps themselves. | Model a short passage, pause for independent or partner reading, allow replay/rereading, then invite a brief reflection. Recording is optional; keep existing assessment controls separate. |

Lumen already imports current AlloFlow text, keeps multiple source snapshots, retrieves local passages without AI, and can save grounded AI answers. Its current saved-note list shows titles and stale-source indicators but has no reopen/read/edit action. It does not yet offer learner-authored section gist, evidence, confusion and revisit fields. Reopening saved notes is a concrete first refinement before adding the reflection workflow.

For Read & reflect, reuse Lumen’s source/evidence model and start with manually selected sections and simple prompts. It should work without live AI or automatic scoring. Preserve original wording, let learners skip a checkpoint, allow typed or existing dictation input, and retain their responses when they switch reading modes. The existing host feature called “comprehension checkpoints” concerns the learner's own writing/Work Story; it should not be conflated with this reading routine.

For the cross-resource connections, define ownership before implementation: library preferences, positions, bookmarks and words currently use device-level storage, while Lumen scopes projects by role/nickname. Shared-classroom integration needs one explicit learner/profile boundary. Reference each resource's identity, version and language so a revised or translated passage does not silently reuse an obsolete location. Preserve existing library saves during any migration.

For repeated reading, build on the existing Practice reading/fluency and audio paths. Emphasize accuracy, expression and understanding, and let the learner choose a comfortable pace. Do not turn a presentation-speed setting or one speech-recognition result into a reading-level diagnosis.

## Refinements implemented in this pass

Completed locally and verified:

- **Main reading ruler:** starts centered, supports keyboard focus and passive touch, fits tiny viewports, pauses over controls/dialogs, and resumes when a panel closes. Movement and observers are cleaned up on disable/unmount. Long-page body geometry no longer moves the ruler to the wrong place. [Details](main-reading-ruler-refinement-2026-09-07.md).
- **Focus Reader:** visible Previous/Next controls and working Left/Right navigation on the focused reading surface. Manual movement pauses pacing and cancels pending countdowns/timers; native controls keep their own keyboard behavior. [Details](focus-reader-navigation-refinement-2026-09-07.md).
- **Library reading supports:** the saved-on ruler is visible without a mouse and supports line-step keyboard navigation and touch. Escape closes the innermost support panel, lookup, My words or immersive overlay and restores its opener before exiting the book. [Details](reading-library-refinements-2026-09-07.md).
- **Library typography:** Default now inherits every valid app-catalog font; explicit local reader choices still take precedence. Invalid saved font IDs are ignored safely.
- **Clearer names and discovery:** Student tools identifies Bionic Reading Style and Paragraph focus separately, with descriptions. The Learning Hub and command hint describe the existing picture books, longer reads, textbooks and primary sources. Help describes optional presentation behavior without promising greater reading speed or clinical benefits. English copy was updated; other language packs were not regenerated.

## Further refinements worth planning

1. **Make preference scope visible.** Offer an explicit use-app-settings baseline in each reader and indicate local overrides. Consolidate font/theme options where practical; preserve intentional per-reader choices.
2. **Use language-aware word segmentation in paced reading.** Focus Reader currently splits on whitespace. Passages in scripts such as Chinese or Thai can become a single large chunk. Add locale-aware segmentation with cursor/remapping and punctuation tests before changing pacing behavior.
3. **Adjust reading width and ruler band height.** Let readers choose a comfortable column and a one/few-line or paragraph-sized window. Avoid fixed-height containers that clip enlarged text. Existing library word spacing and immersive wide-text controls should inform the shared design.
4. **Connect discovery to the learner's goal.** The current Student tools panel already groups Read, Focus and Input/practice. Add short purpose descriptions and contextual links to relevant existing tools; use a consistent vocabulary across the library, adapted reading and immersive toolbar.
5. **Keep a clear source anchor during mode switches.** Returning from paced/karaoke modes should reliably take the learner to their passage location, not just reset to the beginning. Test multilingual and revised content before broad persistence changes.
6. **Review linguistic supports in context.** Reuse glossary/Word Sounds capabilities for pronunciation and word parts. Generated syllables or grammar labels need teacher-review paths and language-specific validation; word highlighting alone is not explicit decoding instruction.
7. **Make word help dependable without live AI.** Reuse available teacher-reviewed or prepared glossary entries before asking a provider. The library’s Define flow and resource dictionary have different fallback coverage; make that distinction visible and preserve the learner’s selected word if lookup is unavailable.

W3C's cognitive-accessibility guidance supports clear control purposes, manageable content and familiar personal settings. These proposals apply that guidance to the app's existing readers. [W3C Content Usable](https://www.w3.org/TR/coga-usable/). Text-spacing conformance concerns preserving content and controls when users override spacing; it does not require one universal preset or a particular in-app slider. [W3C text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).

## How to treat optional visual modes

Keep Bionic, color tints and paced modes available as user preferences, with easy reversal and ordinary reading available. A 2025 eye-tracking study with fluent adult English readers found no significant short-term reading-speed or fixation advantage from Bionic formatting. That narrow result does not establish effects for every learner or long-term use. [Beelders, 2025](https://www.mdpi.com/1995-8692/18/5/49).

Research on speed reading describes a trade-off between speed and understanding. Accordingly, allow pauses and rereading, and judge practice with comprehension as well as pace. [Rayner and colleagues, 2016](https://pubmed.ncbi.nlm.nih.gov/26769745/). This is a reason to prioritize learner control and the proposed comprehension routine, not a claim that the app's paced readers have been evaluated as interventions.

## Verification and scope

- Main ruler and adapted-reading focus: **20 passing checks** across two suites.
- Focus Reader and immersive regression coverage: **37 passing checks** across five suites, plus mobile/desktop Chromium navigation checks with 44px button heights and no horizontal overflow.
- Reading Library: **138 distinct passing checks** across three suites. The final 16 support checks passed in a focused rerun after a timeout under concurrent build load; helper and render suites passed 67 and 55 respectively.
- Student tools: **13 passing checks** across three suites. Four additional browser combinations at 390/1280px width and 16/24px text size confirmed that the clarified controls and descriptions remain visible without horizontal overflow.
- Learning Hub: **one passing runtime accessibility check**, including axe, keyboard containment and focus restoration.
- Local development build completed. Four changed runtime modules and the string catalog exactly match their public mirrors. Generated App.jsx parses; both generated host copies agree, and the ruler's initialization, lifecycle and render blocks match the canonical source. Scoped whitespace checks passed.

These are **209 distinct checks across 14 suites**, plus the browser checks above. Results are recorded in the linked implementation reports and `scratch/reading-review-build-verification-2026-09-07.json`, `scratch/reading-review-student-tools-2026-09-07.json`, `scratch/reading-review-student-tools-browser-2026-09-07.json`, and `scratch/reading-review-learning-hub-2026-09-07.json`.

 This is a source/component/browser review, not a classroom efficacy study. No deployment, commit, new learner-data service, live microphone session or AI assessment was performed. The three ranked additions are design recommendations; the bounded usability refinements above are the implementation work in this pass.
