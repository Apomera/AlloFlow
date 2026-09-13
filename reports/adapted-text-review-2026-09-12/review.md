# Adapted text review and improvements

The reader now prioritizes the student's passage and learning supports. Teacher decisions, review reports, and text replacement controls stay in teacher view, including when switching roles with those tools already open.

## Review findings and implementation

| Finding | Change |
| --- | --- |
| Instructional-use labels, reading-level reports, and rigor reports could appear in student view. | Teacher-only rendering now covers these surfaces, standards and interest badges, and the UDL explanation. Students see the saved reading title and passage. |
| Comparison, editing, glossary-authoring, and revision state survived teacher-to-student transitions. | Immediate rendering guards prevent those surfaces from appearing, and an effect resets the host's stale authoring state. Student explanations remain available. |
| A dense row placed reading, word help, practice, editing, and comparison at the same level. | The primary student choices are Read, Word meaning, Word sounds, and Explain. Read along, Fill in the blanks, and Sentence scramble live under an optional Practice disclosure. Active modes expose their pressed state. |
| Switching modes inconsistently left old popups, selected text, or editing active. | A shared mode-change handler clears old help and selection, stops playback, and returns from editing/comparison to the chosen reading tool. |
| Teacher reports and adjustment controls pushed the passage down the page. | Instructional-use settings, text-complexity adjustment, and review reports are grouped in a collapsed Review & adjust text section. Teacher tools retain their separate disclosure and visible phone label. |
| Skip reading controls jumped to the end of the passage. | It now focuses a named reading region at the beginning of the passage. The obsolete end marker was removed. |
| Listening from the beginning was not explicit in the passage controls. | Added a Listen from the beginning / Stop reading aloud button using the existing shared playback handler. Sentence-level listening remains available. |
| Explain required pointer text selection. | A sentence can now be selected with touch, click, Enter, or Space. The action dialog receives focus, contains Tab navigation, supports Escape, and restores focus to the sentence. Longer drag-selected passages still work. |
| Selection and revision popups could extend beyond phone edges. | Both use the existing viewport-constrained popup positioning helper. |
| Older explanation responses could replace a newer result or return after dismissal. | Request identity and resource identity/text checks discard obsolete success and failure responses. Closing the popup invalidates pending work. Bilingual revision responses use the same guard. |
| Explanations could use ambient settings instead of the current passage context. | They now use the saved resource grade and the selected bilingual segment's language. |
| Another audio source could highlight a passage sentence. | Passage highlighting and playback-driven paragraph focus now check the passage audio identity. A new resource clears help and stops old passage audio. Paragraph focus initially reveals the first paragraph. |
| The complexity slider only applied changes on mouse/touch release, and its keep-original checkbox was hidden from keyboard users. | Choose a setting, then use Apply text change. Neutral/busy states disable the action. The keep-original checkbox is visible and keyboard accessible. |
| Mobile padding and technical labels reduced clarity. | Responsive padding preserves passage width; new English labels explain Word meaning, Word sounds, practice, and explicit adjustment. Translation keys and English fallbacks are registered. |

## Verification

- All **135 tests passed across 12 suites**. Runtime tests cover rendering, role transitions, read-aloud integration, keyboard actions, source changes, stale requests, bilingual language selection, citation preservation, teacher controls, and complexity freshness. See `test-results.json` for the final counts.
- Isolated Chromium checks use the real reader module, React, the app's Tailwind configuration, and its English string catalog at 320, 390, and 1280 pixels.
- Browser checks cover 44px primary controls, collapsed practice and teacher review, start/stop listening, keyboard explanation, Escape/focus restoration, popup bounds, explicit keyboard adjustment, Arabic–English layout, and enlarged-text reflow at a 24px root font size.
- The student reader has no serious or critical axe findings in the tested default layouts. No browser runtime errors were recorded. See `browser-results.json`.
- Root/public module mirrors match; the canonical host uses current content-hash pins and both desktop hosts resolve the matching local module assets. Reader labels agree in the root/public English catalogs. See `build-verification.json`.
- Screenshots include student, enlarged-text, teacher collapsed/expanded, and bilingual layouts. `browser-check.cjs` reproduces them.

## Scope and limits

This was a local source, behavior, and rendered-UI review. Browser fixtures stub AI, audio playback, and host callbacks; they verify reader interactions without sending content to a provider or recording a microphone. Existing citation and context tests protect those integration contracts. This is not a classroom usability study or a full production end-to-end audit. New copy is registered in English; other language packs retain their existing translations and use English fallbacks for new keys. No deployment was performed.

The work reuses the existing reader, vocabulary, fluency, reflection, and playback capabilities. It does not add learner accounts, save new student data, or change the instructional authorization rules. Unrelated pre-existing workspace edits remain in place.
