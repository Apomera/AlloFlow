# Transient feedback on Print Lab return

Project capture now stores an empty `actionFeedback` value in its copied state. It leaves the live pre-handoff message untouched. Project restoration also explicitly clears `actionFeedback`, so older pending snapshots cannot replay a stale shape cue when returning from Print Lab.

The production change is limited to those two state fields in the canonical builder and desktop mirror. Both parse and match byte for byte. No geometry, selection, history, camera, scale or other saved-state behavior changed.

return-feedback-tests.json now records the complete workflow suite: 14 passed, none failed or skipped. Two new cases use actual THREE r128 geometry and the real Send/capture/restore functions, once with a current snapshot and once with a simulated older snapshot containing a cue. They verify empty feedback on return while whole-workspace and selected STL bytes, undo/redo records, selection, camera pose, flight mode, counters, print context, and unrelated settings are preserved.

The final browser roundtrip in return-results.json also passed on the same source. It confirms an active cue at actual Send dispatch, no stale cue after unmount or Revise, unchanged world/STL/history, and a retained 12.5 mm-per-block scale.
