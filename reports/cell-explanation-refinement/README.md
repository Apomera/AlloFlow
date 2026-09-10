# Cell simulator anatomy explanations

Anatomy explanations now use 12px body text, more line spacing, a separate title area, and rounded corners. The reading surface expands up to 340px and fits narrow phones. Long names wrap while preserving a 44px close target.

Observation explanations stay open until dismissed, so learners can read at their own pace. The close control and Escape dismiss the explanation; clicking the explanation body does not activate anatomy behind it. Play-mode explanations retain their five-second timeout.

Placement respects the actual header and microscope controls. During the explanation fade-in, the layout refreshes its overlay measurements to account for selection changes. Paused observation explanations stop requesting animation frames after the fade and anatomy highlight finish.

## Validation

- Desktop (1200px) and phone (320px) explanation workflows passed.
- The new browser checks cover header/footer clearance, viewport fit, reading beyond five seconds, body clicks, Escape dismissal, retained canvas focus, and the 44px close target.
- Browser geometry is sampled together to avoid mixing positions from different smooth-scroll frames. These focused checks use reduced motion.
- Desktop and phone screenshots were visually inspected.
- JavaScript syntax and whitespace checks passed; source and desktop mirror match byte for byte.
- 15 unit tests passed across canvas lifecycle, play tutorial contracts, and render warnings.
- Four browser checks passed: two observation explanation workflows, a focused mobile play popup placement/automatic-dismissal check, and the existing live movement feedback check.
- The longer existing mobile mission regression did not pass: its first run observed the three-second evidence cue after expiry; an isolated retry timed out waiting for a temporary anatomy popup. The runner was unusually slow. These failures remain a validation limitation; the mission regression was not changed or marked passing.

## Previews

- [Desktop explanation](explanation-1200.png)
- [Phone explanation](explanation-320.png)

Captures use the paused randomized teaching model. Validation logs: browser-final.log, play-tooltip.log, regression.log, mobile-regression-final.log, and unit-final.log.
