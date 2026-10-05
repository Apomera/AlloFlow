# ATC Tower quality enhancement — October 3, 2026

This second pass extends the [initial deep dive](../atc-deep-dive-2026-10-03/README.md) with planning, learner-controlled pacing, recovery, and evidence-based debriefs. The canonical tool and desktop public mirror are synchronized.

## Changes and their purpose

| Gap | Implemented behavior |
| --- | --- |
| Traffic order followed creation order. | Flight strips prioritize emergencies and critical/low fuel, then remaining-route ETA at current speed. Ties are stable. Aircraft cycling follows the same order; a focused strip keeps its tab order until focus leaves the list. |
| Alerts appeared only after separation was lost. | Separation watch checks the next two flight minutes at current heading/speed, with altitude moving toward its target. It distinguishes current conflicts, projected breaches, and cautions. It evaluates simultaneous horizontal/vertical intervals, including temporary altitude breaches before a target is reached. Holds and turns carry an explicit uncertainty qualifier. |
| Runway availability did not explain the next sequencing decision. | The runway plan shows the next assigned arrival, occupancy risk, and the tightest ETA gap relative to a teaching spacing target. Crossing runways share a queue; parallel runways retain independent queues. Approach clearance remains explicit. |
| A beginner could receive new traffic while still learning the commands. | Guided practice starts paused, lets the learner add aircraft, retains safety alerts, and stays open during conflicts. Standard shifts preserve automatic traffic and the sustained-conflict limit. |
| Reopening the tool lost the active shift. | A versioned draft saves every five seconds, on hide, and during cleanup. Recovery reconstructs canonical aircraft/runway references and restores paused without offline catch-up. Saved shifts can be resumed or discarded explicitly; Start cannot silently overwrite them. Invalid drafts return to a discardable menu. |
| Repeated End or recovery could duplicate totals. | A shift ID, in-memory commit guard, and recent committed IDs protect normal repeated-End/remount flows. Completed shifts retain the eight most recent debriefs. Checkpoint cleanup does not recreate an ended draft. |
| Reopening after a solved math question allowed the same reward again. | Answered, correct, and skipped flags survive serialization with strict boolean invariants. Completed challenges reopen as feedback with Continue traffic. A mounted regression checks that score/math totals do not increase again. |
| A climb command during approach could produce a descent. | Leaving automatic approach uses current altitude for the first manual climb/descent step; subsequent manual instructions stack from the manual target. |
| Manual go-arounds were absent from the debrief and could retain touchdown flags. | Manual go-arounds are counted once per transition and clear stale landing state. Approach reclear and heading/altitude overrides also clear stale touchdown state. |
| The debrief offered scores without evidence. | The last 40 commands and outcomes are recorded with shift-clock times, including landings, conflicts, fuel events, go-arounds, and math work. Debriefs expose go-around/conflict-time totals and save a bounded reflection note for each recent shift. |
| Math input/feedback changes stranded keyboard focus. | New questions focus their answer control and are announced; feedback focuses Continue traffic; continuing returns focus to the radar. |
| Forecast panels buried the command workflow. | Flight strips and commands precede forecast panels in DOM and visual order. The menu and shift still fit 390px and 320px screens. |
| A missing canvas context halted the simulation. | Radar drawing can fail while the HTML strips, warnings, controls, physics, and results remain usable. |

## Verification

- Targeted Vitest: **10 files, 88 tests passed**.
- Baseline browser and accessibility suite: **28 checks passed** in installed Chrome.
- Extended learning/runtime browser suite: **15 checks passed**; no uncaught browser errors or native prompt dialogs.
- Forecast browser suite: **8 checks passed**, including numerical crossing/altitude forecasts, tight runway spacing, occupancy clock conversion, priority/ETA order, and narrow layouts.
- Recovery/history browser suite: **12 checks passed** with zero uncaught errors, including invalid drafts, paused remount/Resume, discard, repeated End, history/reflections, active-draft protection, completed/skipped math recovery, focused strip ordering, initial Left selection, and DOM/visual control order at 1440px and 320px.
- All four browser suites total **63 passing checks**, with zero failures and zero uncaught browser errors.
- Syntax checks, source/mirror equality, and scoped `git diff --check` pass.

The new pure tests cover ETA order, stable ties, priority/fuel sorting, projected geometry, exact tangency, altitude target capture, transient vertical loss, field/horizon bounds, shared crossing schedules, JSON-safe recovery, malformed drafts, completed-math flags, cleanup checkpoints, and idempotent shift completion. Runtime command tests cover speed validation, heading normalization/hold release, climb direction, and go-around state.

These fixtures load the production tool with local React and the actual host update method signatures. Their test-only reference exposure is injected in memory. They validate local behavior and accessibility, not a deployed full AlloFlow application. No deployment was performed.

## Reproduce

Run from the repository root:

```text
node reports/atc-deep-dive-2026-10-03/run-tests.cjs
node reports/atc-deep-dive-2026-10-03/browser-qa.cjs
node reports/atc-quality-pass2-2026-10-03/browser-qa-extended.cjs
node reports/atc-quality-pass2-2026-10-03/browser-qa-forecast.cjs
node reports/atc-quality-pass2-2026-10-03/browser-qa-recovery.cjs
```

## Limits of the teaching model

Motion, descent, and fuel use 120× flight time; arrivals and displayed event times use the real shift clock. The two-flight-minute projection is a current-course teaching estimate, not a guarantee through future turns, holds, or subsequent approach guidance. Runway targets combine simplified occupancy and wake spacing and do not represent a complete operational ATC rule set. Wind remains a briefing cue. The separate Ops Lab does not configure the live flight model.

Drafts, history, and notes use the host's existing tool-data persistence. Recovery intentionally pauses and does not advance traffic while the tool is closed. Commit deduplication covers ordinary lifecycle behavior and the retained recent history; it does not claim protection against arbitrarily old externally restored snapshots.

## Visual checks

Forecast scenarios and narrow layouts are saved alongside this report. The current control layout is included in the recovery suite screenshots. The initial report contains the desktop, math, high-contrast, forced-color, and protected-runway screenshots.
