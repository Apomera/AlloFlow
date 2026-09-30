# Anatomy Pathways and Spotter improvements

This pass makes review easier to follow and brings the lesson closer to the top of the screen. Changes are present in the active anatomy source and its desktop mirror.

## Pathways

- Reviewing a concept preserves submitted answers and feedback. A visible return action names the exact question, and keyboard focus returns to its feedback.
- Each of the four routes retains its teaching step and check attempt when learners return to the route menu or switch routes. Saved progress also survives reloading the activity.
- “Restart checks” starts a new attempt while keeping the last completed score. Notes, confidence ratings, and retrieval evidence remain separate from the check attempt.
- Answer feedback explicitly labels “Your answer” and “Correct answer.” Older valid concept checks can resume; stale callbacks cannot overwrite a newer route or attempt.
- The compact toolbar selects a pathway directly. Additional exploration controls sit behind “More controls.” In the captured desktop samples, the lesson begins at **246 px**, compared with **565 px** before this pass.

## Spotter

Active Spotter rounds use the 2D atlas, where the crosshair is visible. The 3D switch explains why it is unavailable during the round. Ending practice restores the learner’s chosen 3D view and rendering style. Restored answered and unanswered rounds follow the same rule.

## Visuals and accessibility

Pathway headings, choices, feedback, and review actions have larger text and clear spacing. Controls retain visible focus and generous touch targets. The panel supports light, dark, high contrast, and larger text. New interface labels have French, Latin American Spanish, and Arabic translations in both distributions.

Browser verification covers route switching, review and return by keyboard, restarting, saved scores, active Spotter markers, and return to a live 3D Blueprint. Responsive checks include 320, 390, 768, and 1440 px, plus Arabic with larger text at 320 px. Automated accessibility scans cover the changed controls and panels; the checks are scoped to these flows.

## Verification

- **321/321 focused unit checks passed across eight files**, covering both anatomy distributions, including 42 Pathway continuity cases and 32 Spotter marker cases.
- **Three browser walkthroughs passed**, including a live rendered Blueprint before and after Spotter practice, plus restoration of answered and unanswered saved rounds.
- **21 scoped axe scans found zero violations** across Pathways and Spotter in light, dark, and high contrast themes.
- No horizontal page overflow was found at the checked widths, and no browser JavaScript errors were recorded.
- Syntax passed. The web and desktop sources match byte for byte. All 18 new labels match across the French, Spanish, and Arabic catalog pairs.

Final counts, layout measurements, and source hashes are recorded in [verification.json](verification.json). The baseline and final captures use the same final blood-route step and desktop viewport; the final sample also has saved study records and an explicit older-learner grade setting. The positions are visual samples rather than a performance benchmark.

## Visual evidence

- [Before: phone checks](before-check-phone.png)
- [After: desktop lesson](after-desktop.png)
- [After: phone lesson](after-phone.png)
- [Saved answers and return action](paused-return-phone.png)
- [Dark theme feedback](after-dark.png)
- [Arabic with larger text at 320 px](arabic-320.png)
- [Spotter crosshair during practice](spotter-marker-phone.png)

## Commit scope

The commit includes the two anatomy sources, focused tests, the six language catalogs with only the 18 new flow labels, this report, verification data, and the seven images above. Updated label and completion assertions are included through `ANATOMY_COMMIT_EXTRA_TESTS=tests/anatomy_lab_science.test.js,tests/anatomy_control_names.test.js` in the isolated commit helper.

Learning progress is stored locally in the activity.
