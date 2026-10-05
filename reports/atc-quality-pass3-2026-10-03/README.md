# ATC quality pass 3 — purposeful practice and reliable controls

Completed October 3, 2026. This pass extends the flight-model, sequencing, recovery, and accessibility work recorded in the first two ATC reports.

## What changed

Four exercises now start paused with fixed aircraft, ample fuel, and measurable objectives. They have no random arrivals or unrelated random math interruptions.

| Exercise | Learning task | Completion evidence |
| --- | --- | --- |
| Guide one arrival | Assign a runway, clear approach, observe capture and descent | TRAIN101 actually lands without a separation alert or lost aircraft |
| Compare distance and speed | Compare arrival estimates and sequence the faster, more distant aircraft first | FAST102 lands before NEAR101; both land without alerts, losses, or go-arounds |
| Protect converging traffic | Issue an altitude change before the tracks converge | At least 1,000 ft vertical separation after six shift seconds, with no alert or loss |
| Prioritize across crossing runways | Sequence medical priority through the shared runway area | MED101 lands before ROUT102; both land without alerts, losses, or go-arounds |

Objectives use actual aircraft outcomes rather than score or a stored completion claim. Reaching all objectives pauses the exercise and locks further flight instructions, while selection, help, review, and End shift remain available. Completed-state prompts explain how to review and save the debrief.

Landing and loss evidence survives aircraft removal from radar. Saved exercises validate their identity, airport, aircraft IDs, and canonical aircraft types; preserve valid learner instructions; restore paused in guided mode; and normalize unsupported completion claims. Debriefs retain every met and remaining criterion. Both debrief Retry and the failed-exercise “Record attempt and retry” path create fresh paused seeds and retain the previous attempt once.

Lesson practice links now open the matching exercise. Weather opens the Practice menu because wind is currently a briefing cue. Lesson entry focuses a named section, Back restores the corresponding lesson-card focus, and the AI tutor region has an accessible name.

Command transitions are more consistent:

- Repeating a runway assignment or approach clearance preserves current guidance and requested speed.
- Changing runways cancels the approach and requires another clearance.
- Holding or manually changing heading during approach cancels the old automatic descent target and holds present altitude.
- Going around restores the aircraft type’s teaching speed and commands a bounded climb; repeated go-around instructions retain the current targets and count once.
- Multiple-runway airports offer an explicit assigned-runway selector, including removal of an assignment.

Flight strips distinguish priority emergencies from other incidents, with critical fuel independently urgent. Coaching follows entry, final, hold, go-around, and completion states. ETA labels distinguish direct and approach estimates. Crossing-runway forecasts explicitly name shared-area use. Badge awarding uses measurable separation criteria. Saved math questions reject missing fields, invalid domains, inconsistent cached answers, and answers outside the supported range while retaining valid zero and tie answers.

The phone layout now places radar, controls, and review panels in the same visual and document order. Command forms return focus within their own ATC instance. Simultaneous announcements are combined instead of replacing one another.

## Verification

- **129 tests passed across 14 files**, including 41 new practice, command, priority, and saved-math regression cases.
- **28 baseline browser checks passed**, covering menu navigation, responsive layout, keyboard scope, pause, commands, math, idempotent debrief recording, and shared runway occupancy.
- **20 exercise browser checks passed** on the final source, covering real first touchdown, treated and untreated convergence, terminal completion, false completion-claim recovery, partial and failed debriefs, both retry paths, heading altitude hold, lesson routing/focus, and mobile order.
- Full axe checks, including color contrast, found no serious or critical violations in the Practice menu, exercise controls, or debrief at **320 px and 390 px**. The baseline suite also checked its standard play, math, and debrief flows.
- No uncaught browser errors or native dialogs were observed. Desktop and phone screenshots were inspected.
- JavaScript parses successfully. Canonical and desktop-public ATC sources match byte for byte. The root/public English namespaces and development English catalog agree on **344 keys**.
- Scoped `git diff --check` passed. Git reports existing CRLF-to-LF normalization notices for the two tool files.

The final exercise browser run used native actions and measured simulation outcomes. Early runs hit local browser/worker startup stalls; larger bounded waits were used without bypassing assertions. Subsequent complete runs passed.

Reproduce from the repository root:

```text
node reports/atc-quality-pass3-2026-10-03/sync.cjs
node reports/atc-deep-dive-2026-10-03/run-tests.cjs
node reports/atc-deep-dive-2026-10-03/browser-qa.cjs
node reports/atc-quality-pass3-2026-10-03/browser-qa.cjs
node reports/atc-quality-pass3-2026-10-03/verify.cjs
```

## Model boundaries

This remains an accelerated classroom simulation. Flight movement, descent, and fuel run at 120× time. Wind does not change flight motion. Arrival projections use current motion and commanded altitude, so turns, holds, and subsequent commands can change them. Wake spacing and protected runway areas are simplified; approach clearance also permits the automatic landing in this tool. Generated math remains a separate learning activity outside the fixed exercises. Existing earned badges are retained; the revised awarding rules apply to subsequent play.

## Artifacts

- [Final browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/atc-quality-pass3-2026-10-03/browser-qa-results.json)
- [Source/catalog verification](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/atc-quality-pass3-2026-10-03/verification.json)
- [Completed exercise on desktop](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/atc-quality-pass3-2026-10-03/exercise-complete-desktop.png)
- [Exercise controls at 390 px](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/atc-quality-pass3-2026-10-03/practice-playing-390.png)
- [Exercise debrief at 320 px](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/atc-quality-pass3-2026-10-03/practice-debrief-320.png)
- [Canonical implementation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_atctower.js)

Changes are local to the workspace; no deployment was performed.
