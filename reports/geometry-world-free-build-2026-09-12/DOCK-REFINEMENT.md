# Free Build dock refinement

The blank sandbox previously led with Select and a prominent Send to Print Lab action before the learner had placed a block. On smaller screens, opening the dock hid the native building controls, while the only way back was a minus icon.

The dock now follows Build → Select → Print Lab. An actually empty world presents Start building and disables Print Lab with related placement guidance. The existing live student-block poll determines this state, so Undo, Break and Clear restore the initial stage even if the lifetime placement count remains high. Once blocks exist, the existing selection and Print Lab pathways remain available; a retained creation continues to lead with its measurements and print envelope.

Material and Shape cards now reveal and focus the currently selected native control. Their Change affordance makes the action visible. Shape's accessible label includes rotation. The persistent Back to building button and header collapse action return keyboard focus to the world; the collapsed entry reads Build tools. All new controls meet the 44px touch target. The expanded mobile sheet uses up to 62% of the available height so the footer stays visible while the body scrolls.

The deferred focus handoff owns a cleanup timer and stops if the world, engine, Home, Showcase, dock state, or an intervening modal has changed. The actions preserve the recipe, retained selection, history, camera, print scale, and geometry.

## Verification

- 23 tests passed across the new builder-navigation suite and the existing selected-inspector suite (`dock-tests.json`). Tests load canonical production code.
- Coverage includes actual empty-world detection, first-block and removal transitions, world/native-control focus, stale callback guards, unmount cleanup, retained selection, scale-draft stability and exact selected STL handoff.
- The browser audit independently checked narrow and touch layouts. At 320px, the persistent footer measured 278 × 44px and remained pointer reachable before and after body scrolling.
- Visually inspected `final-09-small-selected.png`: the selected summary, stage indicator, primary action and fixed return button are legible without horizontal overflow, with the world visible above the sheet.

The parent agent owns the combined full-suite verification, mirror synchronization and final implementation report. Changes remain local; no commit or deployment was performed by this subtask.
