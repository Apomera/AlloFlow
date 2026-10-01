# Nuclear Lab: guided prediction review

Verified October 1, 2026.

## Experience

The guided first discovery now offers two views after the learner records both distance readings: **Saved readings** and **My prediction**. The second view puts the original prediction and the saved 2 m observation on the same 0–100% scale. A half-intensity guess appears as 50%, a quarter-intensity guess as 25%, and an unchanged guess as 100%. The measured 2 m result remains 25%.

A brief message identifies a matching prediction or states the two different values. Learners can switch back to the 1 m / 2 m evidence before choosing an explanation. The optional view changes display state only. It preserves observations, draft detector position, notes, other experiments, and earned discoveries, and it cannot award completion.

The guide defaults to the saved readings when revisited. Restart clears the display choice along with the active comparison while keeping an earned discovery and takeaway. The prediction view is unavailable until a valid prediction and both real readings exist.

This commit also includes the guided first-discovery and detector-movement refinements developed earlier: four visible steps, an explicit move before the second measurement, a diagram distinguishing the current detector position from the saved observation, shared evidence with free distance exploration, and preservation of existing learner routes.

## Verification

- **157 state tests passed**, including ten new prediction-view cases covering all three guesses, incomplete or malformed evidence, restart, revisit, completion, translation, and preservation of saved work.
- **Eight Chromium guide checks passed against the exact source prepared for this commit.** These include keyboard focus, 320 px larger text, reduced motion, light and high contrast palettes, saved progress, and automated WCAG A/AA audits.
- **Three isolated negative checks passed.** The browser test rejected a half-intensity prediction displayed as 100%, a saved 2 m measurement displayed as 100%, and a view toggle that changed the draft position from 2 m to 4 m. Each check confirmed production source remained unchanged.
- All four source copies parse and match. All four English registries match **501 active studio keys**. Production loader wiring, static failure self-tests, and preservation of existing lesson code passed.
- Source outside the studio fragment matches the snapshot taken before this pass. Eight existing helpers/components, including the other experiments, remain unchanged.
- Desktop, 320 px light, and 320 px high contrast screenshots were inspected. Both comparison controls meet the 44 px minimum height; the chart stays in view and the page has no horizontal overflow.

The commit uses an isolated candidate and explicit paths. It adds only Nuclear Lab studio keys to the shared translation files, preserving their unrelated entries as they appear in HEAD. The original repository hooks run against the shared workspace and candidate index. Other staged entries are preserved when the shared index is reconciled after a successful commit.

## Evidence

[Unit results](first-prediction-unit.json), [browser results](first-prediction-browser.json), [desktop comparison](first-prediction-desktop.png), [320 px comparison](first-prediction-mobile-light.png), [high contrast comparison](first-prediction-mobile-forced.png).

The pre-edit snapshot is [first-prediction-before.js](first-prediction-before.js). Negative-check logs are named mutation-first-prediction-model.txt, mutation-first-prediction-measured.txt, and mutation-first-prediction-setting.txt.
