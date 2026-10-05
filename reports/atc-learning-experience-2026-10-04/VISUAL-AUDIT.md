# ATC learning experience visual audit

Baseline inspected in installed Chrome with the canonical ATC source, actual React host, deterministic seeded traffic, and reduced motion. Device widths: 1440, 390, and 320 CSS pixels, each at a 1000-pixel viewport height.

## Baseline findings

- The practice pathway already communicates four distinct skills, preserves learner choice, and begins exercises paused. The numbered cards, progress count, and recommendation are legible on desktop and both phone widths.
- The debrief's five continuation/navigation actions come before decision evidence and reflection. Even an attempt with only two instructions places the reflection textarea at document y=1089 on the 390-pixel phone and y=1295 on the 320-pixel phone. The generic empty textarea asks the learner to compose an evidence-linked explanation without a starting cue.
- Recent exercise debriefs identify only the airport and guided mode, followed by score and conflict counts. Different exercises at the same airport are hard to distinguish until opened.
- A practiced pathway card reports its attempt count but does not help the learner reopen the attempt, recover its saved plan, or tell its result apart from another incomplete attempt.
- No runtime errors or horizontal document overflow were observed in the menu, initial pathway, early-ended debrief, or return pathway at any measured width.

Baseline captures and measurements are in `before-*.png` and `baseline-metrics.json`. The baseline script is `baseline-explore.cjs`.

## Final review

The clean final Chrome run passed all **19 focused browser checks**, with zero runtime errors or unexpected native dialogs. The canonical source remained unchanged throughout that run: `7493c1c287497cc775c21f79e02a955674ab74e92c310110560316bcf54184a9`. Results are saved in `browser-qa-results.json`.

The review card now appears before detailed shift numbers and decision evidence. The optional native event selector preserves full chronology, and its selected context shows the complete event even when the phone select displays a shortened label. Selecting or clearing a moment never changes the learner's saved text. The small intention/effect/next-change prompts are distinct from the saved note.

| Width | Baseline reflection top | Final reflection top |
| --- | --- | --- |
| 1440 px | 833 px | 775 px |
| 390 px | 1089 px | 903 px |
| 320 px | 1295 px | 1051 px |

These are document coordinates. The final captures additionally display a selected full event and a saved note; the baseline had no selected context. The final document is longer because it contains the new review scaffold, while the review field is encountered earlier.

The matching retry's saved reflection is a closed native disclosure. Opening it reveals a clearly separated readable quotation and one dismissal action. The note remains rendered across more than two live refreshes; dismissing it stays effective after further refreshes and checkpoint restoration, while the original saved reflection remains intact. A latest matching attempt without a note and an unrelated exercise never borrow an older or different exercise's note.

Recent debrief history now names the exercise, its result, and the presence of a reflection note. The pathway exposes the latest attempt and an actual review destination. An unfinished retry retains earlier verified completion while displaying **Last attempt: Unfinished**, and the review link opens that exact saved attempt. A completion kept beyond the eight retained full debriefs does not invent a review link. Editing one of eight saved notes preserves all eight; saving a ninth shift's note caps storage at eight.

No horizontal document overflow or serious/critical axe findings were detected in the inspected debrief and retry states at 1440, 390, or 320 CSS pixels. Forced colors at 200% zoom preserved the event selector, context, saved note, disclosure, and dismissal controls. Reduced motion remained active throughout the run. Desktop and phone captures were visually inspected, including the final pathway and recent history; no remaining layout or legibility defect was found in this scope.

Representative captures:

- `after-debrief-1440.png`, `after-debrief-390.png`, and `after-debrief-320.png`
- `after-carried-plan-390.png` and `after-carried-plan-forced-colors-200percent.png`
- `after-pathway-390.png` and `after-history-390.png`
- `after-practice-with-new-attempt-320.png`

Reproduce the focused suite with `node reports/atc-learning-experience-2026-10-04/browser-qa.cjs`. The suite derives its new reflection/history assertions from an actual recorded exercise attempt and uses the prior measured-completion fixture only to begin the real unfinished-retry persistence check. The first browser review identified a live-snapshot omission that hid carried notes; the final run explicitly covers retention across refreshes and recovery after that correction.
