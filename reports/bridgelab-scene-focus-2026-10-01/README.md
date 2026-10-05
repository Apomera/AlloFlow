# Bridge Lab scene focus — October 1, 2026

Focus scene gives students more room to watch the bridge while keeping replay, measurements, and observations available in the immersive view. Touch buttons also let students move along the walkway in fullscreen.

## Use Focus scene

1. Open **On the bridge**, **From the riverbank**, or **3D structure**.
2. Choose **Focus** in the scene's right-hand controls. Its accessible label is **Focus scene**. The tools fold into a drawer above a compact replay bar.
3. Step backward or forward by 0.5 seconds, drag the time slider, or select a replay speed. Replay still requires an explicit start and is disabled under reduced motion.
4. Expand **Scene tools** to select a key moment, choose A or B, inspect motion and energy, or record an observation. Opening the drawer pauses replay at its current time.
5. Close the drawer to return to the scene. Escape from a drawer control closes it and returns keyboard focus to the summary. The summary stays visible while the drawer scrolls.
6. Toggle **Focus** again to return to the expanded measurement layout.

With both earthquake responses displayed, the folded drawer retains the exact inspection time, signed relative deck readings, and the solid/outline labels. There is one time slider and one key-moment selector in the active layout. Selecting a moment uses the same model samples and milestones as the existing scene controls.

## Walk in fullscreen

In the focused deck view, two 44px buttons move toward the entrance or far end, with the current span percentage between them. Each action moves five percentage points and clamps to the existing 3–97% walkway range. Movement preserves the look angles and pauses vehicle and earthquake playback at the current model time.

The walking buttons appear while the tools are folded. They also work when the earthquake experiment is disabled. On the riverbank, the camera retains its independent angles and the walkway controls are hidden. Keyboard navigation and dragging remain available.

## Layout and saved observations

The drawer and replay bar occupy separate areas. Drawer height follows the scene height, including short landscape fullscreen. The right-hand column reserves space for fullscreen, observer switching, and Focus. The drawer uses a sticky summary and internal scrolling so students can reach long energy panels and observation writing. Focused bottom offsets also account for the device's safe-area inset.

New scene observations store an optional focusMode boolean under the existing bridge-scene-display-v1 metadata. Revisiting restores the focus preference together with the bridge, comparison, viewpoint, and note. The drawer opens so the restored note is immediately available. Older display records remain valid and restore the standard layout; malformed flags cannot enable focus.

Graphics loss still exits fullscreen, pauses motion, and focuses the 2D elevation. The focus preference and note draft are retained for deliberate 3D recovery. Restoring graphics alone does not restart motion.

## Model and implementation

The earthquake solver is byte-for-byte unchanged from this pass's source backup. This work changes presentation and deliberate viewpoint controls. It reuses existing response samples, energy calculations, key moments, and scene geometry. Layout changes, replay inspection, and walking do not rebuild bridge geometry.

Source mirrors are updated together. Eleven English labels are added to both registries while retaining unrelated entries. Saved focus flags are validated separately from the earthquake evidence and other display preferences.

## Validation

**146 distinct unit checks passed** across immersive interaction, deformation geometry, earthquake physics, printable static analysis, and direct inertia teaching. Nine new checks cover focus toggling, native drawer opening, keyboard focus, manual replay bounds, walking bounds and observer poses, saved preference compatibility, graphics recovery, and exploration without an earthquake.

**37 distinct browser workflows passed** in their latest completed results, including six new desktop, phone, landscape, walking, keyboard, and graphics-recovery workflows. Together with the unit checks, **183 distinct checks passed**. Reruns are resolved by test identity rather than added to the count.

Desktop 1000×800, phone 320×568, and landscape 844×390 screenshots were visually inspected in their final layout, including the phone tools drawer and first-person walking view. The focused panels are capped at 320px, the phone controls have a clear gutter, and the drawer and replay bar remain separate.

JavaScript syntax, identical source mirrors, all **1,069 English fallback keys** matching both registries, and whitespace were verified. Resource checks preserve the bridge scene across focus toggles, stepping, and walking. They distinguish the first GPU upload of geometry becoming visible in a changed viewport from repeated inspection of those same frames.

The initial browser run passed 35 of 37 workflows. One new assertion compared resource counts before fullscreen and first-frame visibility, when a previously culled geometry had not yet uploaded. The test now checks stable counts across repeated steps after those first uploads. The phone layout check also found the Focus button adjacent to the readout; a six-pixel gutter was added. Screenshot review led to narrower focus panels for landscape. All six new focus workflows and three affected phone workflows passed in the nine-workflow follow-up. Original results are retained alongside the follow-up.

The initial full unit run passed 145 of 146 checks; a cold-start print test exceeded the default five-second timeout. The first targeted follow-up completed the nine focus checks but could not finish or save its report because disk writes returned ENOSPC. Disk space became available again and a write probe succeeded. The completed follow-up passed all ten targeted checks, including the print assertion with a 30-second test limit. Original results and the interrupted report are retained. Reruns are resolved by test identity.

## Artifacts

- unit-results.json and unit-followup-results.json
- browser-results.json and browser-followup-results.json
- source-verification.json and verify.cjs
- Desktop, phone, and landscape focus-scene and focus-tools screenshots
- bridge-320-focus-walkway.png

Source: stem_lab/stem_tool_bridgelab.js and its desktop public mirror, plus the two English registries. Existing uncommitted project changes are retained. This pass remains uncommitted.
