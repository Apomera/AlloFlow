# More introductory experiments — 2026-09-29

The studio now follows a four-activity path: half-life, distance, shielding, and chain reactions. Each activity uses the same predict → experiment → explain pattern. A recorded discovery offers a button to continue to the next activity.

The experiment chooser starts collapsed. Students can open it to jump to any activity. Selecting an activity closes the chooser and focuses its question. Existing progress and observations are preserved.

## New experiences

**Give it some space:** move a detector between 1, 2, and 4 metres while keeping the source fixed. Expected readings are 100%, 25%, and 6.25% of the 1 m reading. Students must compare 1 m and 2 m before explaining the result. Draft settings remain distinct from the last measurement.

**Keep the chain going:** start with 20 expected reactions and advance four generations. Compare factors 0.8, 1, and 1.2. A steady run and one contrasting completed run unlock the explanation. The final step links to the existing reactor control room.

Both models include short disclosures of their assumptions. Distance uses the ideal point-source inverse-square relationship described in the [NRC radiation protection guide](https://www.nrc.gov/sites/default/files/doc_library/cdn/legacy/reading-rm/basic-ref/students/for-educators/08.pdf). The chain activity introduces the self-sustaining state described in the [NRC criticality definition](https://www.nrc.gov/education-regulatory-research/glossary/criticality). Fractional reaction counts are identified as expected averages.

## Verification

- 23 studio unit tests passed, including calculation checks, incomplete/repeated comparison cases, incorrect explanations, saved state, malformed state, and progression.
- Six Chromium tests passed. They cover all four activities, keyboard focus, light and dark themes, forced colors, reduced motion, 320px/390px layouts with larger text, and axe scans with the real app stylesheet.
- Four source copies and all 150 studio string keys match. The integration verifier's deliberate drift cases passed.
- Isolated mutations confirmed that the browser tests reject an incorrect distance result (50% instead of 25%) and an extra chain generation (6.6 instead of 8.2). The production files were unchanged by these checks.
- The pre-existing lesson implementation still matches the saved baseline after reversing the documented view-wrapper changes in memory.

The broad legacy audit limitation from the earlier pass remains documented in README.md. This pass verifies the changed studio and its transitions to the existing views.

Changes remain local and uncommitted.
