# Coaster track previews for touch input

The illustrated piece palette now offers Preview before adding. Its default follows the primary coarse-pointer media query; a saved on/off choice overrides that default. Desktop users keep direct insertion unless they enable the option.

Selecting a piece in preview mode pins the existing cyan ghost geometry without changing the design. A panel in the normal page flow receives focus without covering the piece cards. The panel names the piece and target node, shows its node cost, and provides Add, Frame preview, and Cancel. Switching cards replaces the preview. Escape from the panel cancels and returns focus to the source card. Cards expose expanded state and the controlled preview region to assistive technology.

The ghost uses a bright cyan line and pale nodes to remain visible against the track and scenery. Frame preview uses the tested perspective-fitting helper to center the proposed piece. While a preview is pinned, instruments, section labels, and edit handles are hidden to leave room to inspect the geometry. Hidden edit handles cannot be picked. Closing the preview restores the surrounding interface.

A pinned preview records the selected node and a signature of the design points. Insertion rechecks the signature, selection, ride state, and node budget. Selection changes, track rebuilds, imports, starting a ride, or disabling preview mode clear a pending preview. Adding a piece uses the existing insertion and Undo workflow.

Validation: 282 focused unit tests passed across five files. The desktop palette and touch preview browser workflows passed; the touch workflow passed again after the final visual adjustments. Coverage includes insertion, Undo, stale preview invalidation, keyboard cancellation, focus, non-overlapping controls, framing without design changes, and saved preferences. The final phone screenshot was visually reviewed. Final touch artifacts are under scratch/coaster-touch-delivery; combined desktop/touch results are under scratch/coaster-touch-final.
