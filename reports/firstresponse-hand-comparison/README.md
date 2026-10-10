# First Response hand comparisons

The model now has a hand-and-pose caption and four comparison controls directly below the stage. Learners can switch between the near hand and supporting hand, then compare completed before/after poses without scrolling back to the study.

Equivalent study and inspection buttons now agree on the selected hand and actual pose. Previously both hands' before buttons could appear selected at once. General cameras and reset clear selection; earlier poses retain a selected hand only while its target exists. Actual renderer readiness is required. Selection is transient and leaves saved observations and recovery progress intact.

## Verification

- 72 distinct unit checks passed in three fresh serial processes, including 22 new checks and all 46 existing hand-study checks.
- Two native Chromium workflows passed at 1280px/adult and 320px/infant, with one worker and zero retries. Eight independently selected reference cameras matched 16 comparison actions.
- Keyboard focus, phone reveal, 320↔760 resizing, forced colors, saved state, canvas aspect, renderer resources and disposal were checked.
- Three scoped axe scans found zero violations. All six native captures were reviewed.
- Canonical/public copies match SHA256 `476c1562ef879cb20ac65efdbf290edff9b98fafde9dbd7866f3e612c5750935` (777,292 bytes). Fourteen guarded edits reverse exactly to accepted SHA `cc354bd`. Geometry, materials, camera-fit code and persistence code are preserved. The composed test adapter retains the prior fixed source hashes.

## Evidence

- [Verification](verification.json)
- [Source preservation](source-preservation.json)
- [New controls](units/final-comparison/result.json), [saved study](units/final-study/result.json), [hook order](units/repeat-hooks/result.json)
- [Native results](recovered-browser/browser-run.json), [camera/state evidence](recovered-browser/hand-comparison-metrics.json)
- [Adult comparison](recovered-browser/adult-near-after-comparison.png), [phone comparison](recovered-browser/phone-infant-near-after-comparison.png), [forced colors](recovered-browser/phone-infant-forced-colors-comparison.png)

## Retained diagnostics and limits

The initial fixture had 20 checks: 19 passed and one incorrectly expected the supporting hand to clear at valid pose 3. Its runner expected 21 checks. The corrected fixture keeps that hand selected, adds renderer-loading and real-target rejected-focus checks, and passes all 22. Initial source/fixture/delta/log evidence remains here. The source readiness guard was also tightened to require the actual renderer status.

The first unchanged hook-order suite passed three checks but its full-view walk exceeded the explicit 20-second limit. The fresh-process repeat retained that limit and all four original assertions. Both runs remain under units.

A tool connection refresh interrupted the first browser controller during preparation, with no launch record or test log saved. Two scoped process lookup helpers stalled and were canceled. The fresh native run passed using the existing local browser cache; a timed-out approval review for a progress read was resolved through normal workspace permissions. Details: connection-interruption.json.

Native validation used installed Chromium with software ANGLE/SwiftShader. This pass makes no physical-device performance, full-app build, or complete-suite claim. The existing deferred-jsdom setup was reused unchanged; dependencies and root configuration were not edited.

Everything remains unstaged and uncommitted. No push or deployment.
