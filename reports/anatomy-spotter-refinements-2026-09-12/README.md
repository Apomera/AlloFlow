# Anatomy: Spotter practice refinements

Spotter now starts with untimed practice and makes response timing an explicit choice. This pass also improves answer integrity, question selection, positional guidance, speech, and keyboard flow.

## Learning experience

- **Untimed by default.** Instructions invite learners to compare choices and review functions. The optional timing checkbox explains that timing is a personal challenge, has no deadline, and does not change answer credit or measure mastery.
- **Separate timing records.** Only questions started with timing enabled can establish a new best response time. Existing legacy times remain in saved data but are not silently treated as an opted-in challenge. Incorrect answers, zero durations, and future start timestamps cannot create a best-time record.
- **Clearer position cues.** The cue uses the viewer's left and right and locates the marker, rather than claiming to describe the whole structure. The lower-body wording now includes the upper thighs. These coarse cues support access; they are not equivalent to a complete spatial identification assessment.
- **More useful question selection.** New rounds use four distinct anatomical concepts from the visible set, avoid the immediately preceding target, and shuffle choices without a random sorting comparator. Stored choices contain IDs; labels and functions resolve from the current content and language.
- **Review after a response.** Feedback explains the marked structure's function and compares it with the selected structure after a miss. Read-aloud controls cover the unnamed prompt before answering and the explanation afterward. The existing Study on the diagram action remains available after a miss.

## Reliability and access

Answer updates validate the current question identity and read the latest saved state. Duplicate submissions, callbacks from an older question, and answers after leaving the activity cannot overwrite feedback or earn additional credit. Updates preserve newer confidence ratings, retrieval records, notes, and counters.

End Test is available during unanswered and incomplete rounds. Starting or advancing a question moves keyboard focus into the question panel; ending returns focus to Start. Number shortcuts ignore modifier combinations, held-key repeats, and editable controls. Primary buttons have 44-pixel targets, and text and layout were checked on phones and in Arabic dark theme.

Added 34 strings in French, Latin American Spanish, and Arabic, with identical values in each language's desktop pack. The translations cover new instructions, timing choices, position cues, comparison feedback, and recovery messages. This is not a complete translation of every structure's underlying anatomy description.

## Design basis and scope

The choice of untimed practice with optional challenge follows the emphasis on learner choice, appropriate challenge, and useful feedback in [CAST's engagement guidelines](https://udlguidelines.cast.org/engagement/). This is a design rationale, not evidence that this product has demonstrated improved learning outcomes.

The larger primary targets support touch use. [W3C's target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) distinguishes the 24-pixel minimum criterion, its exceptions, and the value of larger targets. This pass uses 44 pixels as a usability target and does not claim whole-application WCAG conformance.

Sources checked September 12, 2026. Browser checks use the existing local Chromium harness and focus on the Spotter panel. Native assistive-technology listening and 3D model geometry were not evaluated in this pass. Optional response times are elapsed wall-clock time from the question's start; they can include interruptions.

## Verification artifacts

- `test-results.json`: complete anatomy regression results.
- `browser-results.json`: keyboard, speech, timing, restoration, layout, and accessibility results.
- `verification.json`: final source hash, synchronized copies, translation coverage, and test totals.
- `phone-320-review.png`: feedback at the smallest tested width.
- `phone-arabic-dark-review.png`: translated controls and feedback in dark theme.

Visual review caught a comparison-formatting defect that the initial browser checks missed: two camel-case placeholders were unsupported by the existing formatter. The placeholders were changed to supported lowercase names, and the unit and browser checks now reject unresolved placeholders and verify the displayed function explanation.

## Final verification

- 846 tests passed across 45 anatomy test files.
- 20 scoped axe scans: zero violations and zero incomplete checks.
- 16 screenshots with no horizontal page overflow at the tested phone widths.
- No browser errors; keyboard focus, hidden-answer speech, timing choice, recovery, and saved-round restoration passed.
- Both active source copies match; syntax, all 34 translation keys, six packs, and placeholder compatibility passed.
- Active source SHA-256: `1e6e7959dc78f014589afed116727368ed41a7afbfd816e3c8ee43260c72b125`.
