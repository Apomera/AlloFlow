# Flyby exploration detours — Enhancement 60

Pause an active scenic flyby and choose **Explore this stop**. Use the landmark inspector, camera steps, glides, scenic viewpoints, or orbit controls. **Return to flyby** restores the original paused route moment, including free-look direction, lens, display settings, target, distance counters, trail, pace, and highlight-pause preference. **Keep exploring** releases that return point while retaining the current view and movement.

The return card is available below the scene and in full-screen Explore controls. The landmark inspector also offers a compact return button. The ordinary Back button continues to work within the detour.

Return points last for the current scene session. Starting another flyby, switching mode or scene, resetting, or restoring an ordinary saved view clears the return point. Saved-view version 1 remains unchanged. Returning always pauses before the route continues.

## Model

These are exploration-camera movements through generated teaching scenes. This change leaves route geometry, scenery, shaders, and relativity math unchanged. Detour movement is discarded from the route counters when returning. It does not model a physical spacecraft maneuver.

## Verification

- 35 focused tests passed: 13 detour lifecycle groups plus 22 physics checks, using a Node canvas/event shim.
- Browser workflows check lens and viewpoint changes, inspection Back, orbit, exact return, continued playback, and return-point invalidation. Phone and full-screen controls are checked for reachability and scoped accessibility.
- Both source files match their desktop mirrors. Syntax, exact patch reversal to enhancement 59, and whitespace checks pass.
- The full DOM unit suite was not run. Browser evidence and the exact executed checks are in [verification.json](verification.json) and [browser/check.json](browser/check.json).

No files were staged or committed.
